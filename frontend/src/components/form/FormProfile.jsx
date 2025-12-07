import React, {
  useMemo,
  useRef,
  useState,
  useEffect,
} from "react";
import { getAuthToken } from "../../utils/authSession";
import axios from "axios";
import { EyeIcon, EyeSlashIcon, EditIcon, DiscardIcon, CloseIcon } from "../../utils/icons";

// Cambia esto si tu backend corre en otro puerto o ruta
const API_BASE_URL = "http://localhost:4000/api";
const token = getAuthToken();

const FormProfile = () => {
  // ------------------ ESTADO BÁSICO ------------------
  const [initialData, setInitialData] = useState(null);
  const [institutionOptions, setInstitutionOptions] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // Imagen
  const [imgPreview, setImgPreview] = useState("");
  const [imgFile, setImgFile] = useState(null);
  const fileInputRef = useRef(null);

  const pickImage = () => fileInputRef.current?.click();
  const removeImage = () => {
    setImgPreview("");
    setImgFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };
  const onImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/image\/(png|jpe?g|webp)/.test(file.type)) {
      alert("Unsupported image format. Use PNG/JPG/WebP.");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      alert("Image must be less than 3MB.");
      return;
    }
    setImgFile(file);
    const reader = new FileReader();
    reader.onload = () => setImgPreview(String(reader.result));
    reader.readAsDataURL(file);
  };

  // Datos básicos
  const [name, setName] = useState("");
  const [lastname, setLastname] = useState("");
  const [email, setEmail] = useState("");

  // Seguridad
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Instituciones seleccionadas por el usuario
  const [institutions, setInstitutions] = useState([]);
  // Correo institucional por institución: { [instId]: email }
  const [institutionEmails, setInstitutionEmails] = useState({});

  // Para el select de instituciones
  const [selectedInstitutionId, setSelectedInstitutionId] = useState("");
  // Id de la institución que se está editando (para mostrar/ocultar inputs)
  const [editingInstitutionId, setEditingInstitutionId] = useState("");

  const [errors, setErrors] = useState({});
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // IDs de instituciones que ya existían en el perfil al cargar (no se pueden borrar)
  const initialInstitutionIdSet = useMemo(() => {
    const ids = new Set();
    if (!initialData) return ids;

    const eduEmails = initialData.educationalEmails || [];
    eduEmails.forEach((entry) => {
      if (!entry) return;
      const inst = entry.institution;
      if (typeof inst === "string") {
        ids.add(inst);
      } else if (inst && inst._id) {
        ids.add(inst._id);
      }
    });

    const insts = initialData.institutions || [];
    insts.forEach((inst) => {
      if (typeof inst === "string") {
        ids.add(inst);
      } else if (inst && inst._id) {
        ids.add(inst._id);
      }
    });

    return ids;
  }, [initialData]);

  // ------------------ CARGA INICIAL (GET /me + GET /institutions) ------------------
  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!token) {
          setLoadError("No auth token found. Please log in again.");
          setLoading(false);
          return;
        }

        const [userRes, instRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/users/me`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${API_BASE_URL}/institutions`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        const user = userRes.data;
        const allInstitutions = instRes.data;

        setInitialData(user);
        setInstitutionOptions(allInstitutions);

        // Imagen inicial (si tu modelo tiene imgUrl)
        const imgUrl = user.imgUrl || "";
        setImgPreview(imgUrl);

        // Datos básicos
        setName(user.name || "");
        setLastname(user.lastname || "");
        setEmail(user.email || "");

        // educationalEmails
        const eduEmails = user.educationalEmails || [];

        // 1) Mapeamos institutionId -> email
        const emailMap = {};
        eduEmails.forEach((entry) => {
          if (entry.institution && entry.email) {
            emailMap[entry.institution] = entry.email;
          }
        });
        setInstitutionEmails(emailMap);

        // 2) A partir de esos IDs construimos el arreglo de instituciones
        const instIdsFromEdu = eduEmails.map((e) => e.institution);
        const userInsts = allInstitutions.filter((inst) =>
          instIdsFromEdu.includes(inst._id)
        );
        setInstitutions(userInsts);

        setLoading(false);
      } catch (err) {
        console.error(err);
        setLoadError("Error loading profile data.");
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // ------------------ OPCIONES DE INSTITUCIONES RESTANTES ------------------
  const remainingOptions = useMemo(() => {
    const selectedIds = new Set(institutions.map((i) => i._id));
    return institutionOptions.filter((opt) => !selectedIds.has(opt._id));
  }, [institutionOptions, institutions]);

  const addInstitution = () => {
    if (!selectedInstitutionId) return;
    const opt = institutionOptions.find((o) => o._id === selectedInstitutionId);
    if (!opt) return;

    setInstitutions((prev) => {
      if (prev.some((i) => i._id === opt._id)) return prev;
      return [...prev, opt];
    });

    // Al añadir una institución nueva, abrimos inmediatamente sus inputs de edición
    setEditingInstitutionId(opt._id);
    setSelectedInstitutionId("");
  };

  const removeInstitution = (id) => {
    setInstitutions((prev) => prev.filter((i) => i._id !== id));
    setInstitutionEmails((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
    setEditingInstitutionId((prev) => (prev === id ? "" : prev));
  };

  const handleInstitutionEmailChange = (instId, value) => {
    setInstitutionEmails((prev) => ({
      ...prev,
      [instId]: value,
    }));
  };

  // ------------------ VALIDACIONES ------------------
  const validateBasic = () => {
    const e = {};

    // Campos básicos: no vacíos
    if (!name.trim()) e.name = "First name is required.";
    if (!lastname.trim()) e.lastname = "Last name is required.";
    if (!email.trim()) {
      e.email = "Email is required.";
    } else if (!EMAIL_RE.test(email)) {
      e.email = "Invalid email format.";
    }

    // Password: solo validamos si el usuario intenta cambiarla
    if (password || confirm) {
      const pwd = password || "";
      const conf = confirm || "";

      if (!pwd.trim()) {
        e.password = "Password is required.";
      }

      if (!conf.trim()) {
        e.confirm = "Please confirm your password.";
      }

      if (pwd.trim()) {
        // Longitud mínima
        if (pwd.length < 8) {
          e.password = "Password must be at least 8 characters long.";
        }

        // Reglas de complejidad
        const hasUpper = /[A-Z]/.test(pwd);
        const hasLower = /[a-z]/.test(pwd);
        const hasDigit = /\d/.test(pwd);
        const hasSymbol = /[^A-Za-z0-9]/.test(pwd);

        if (!hasUpper || !hasLower || !hasDigit || !hasSymbol) {
          e.password =
            "Password must have uppercase, lowercase, a number and a symbol.";
        }
      }

      // Coincidencia
      if (pwd && conf && pwd !== conf) {
        e.confirm = "Passwords do not match.";
      }
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateInstitutionEmails = () => {
    // Recorremos cada email institucional y validamos dominio
    for (const [instId, eduEmailRaw] of Object.entries(institutionEmails)) {
      const eduEmail = eduEmailRaw.trim();
      if (!eduEmail) continue; // si está vacío, lo ignoramos

      const institution = institutionOptions.find((i) => i._id === instId);
      if (!institution) continue;

      const atIndex = eduEmail.indexOf("@");
      if (atIndex === -1) {
        alert(
          `The institutional email "${eduEmail}" for "${institution.name}" is invalid.`
        );
        return false;
      }

      const domain = eduEmail.slice(atIndex + 1).toLowerCase();
      const allowedDomains = (institution.emailDomains || []).map((d) =>
        d.toLowerCase()
      );

      if (!allowedDomains.length) {
        alert(
          `Institution "${institution.name}" has no configured email domains, cannot validate "${eduEmail}".`
        );
        return false;
      }

      if (!allowedDomains.includes(domain)) {
        alert(
          `The email "${eduEmail}" does not match any allowed domain for "${institution.name}" (${allowedDomains.join(
            ", "
          )}).`
        );
        return false;
      }
    }
    return true;
  };

  // ------------------ SUBMIT (PUT /users/me) ------------------
  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!validateBasic()) return;
    if (!validateInstitutionEmails()) return;

    if (!initialData) {
      alert("Profile not loaded yet.");
      return;
    }

    const payload = {};

    // imgUrl: solo si cambió
    const initialImgUrl = initialData.imgUrl || "";
    if (imgPreview !== initialImgUrl) {
      payload.imgUrl = imgPreview || "";
    }

    // Name
    const initialName = initialData.name || "";
    if (name.trim() !== initialName) {
      payload.name = name.trim();
    }

    // Lastname
    const initialLastname = initialData.lastname || "";
    if (lastname.trim() !== initialLastname) {
      payload.lastname = lastname.trim();
    }

    // Email
    const initialEmail = (initialData.email || "").toLowerCase();
    const currentEmail = email.trim().toLowerCase();
    if (currentEmail !== initialEmail) {
      payload.email = currentEmail;
    }

    // Password: solo si se escribió algo (y ya pasó validación)
    if (password) {
      payload.password = password;
    }

    // Instituciones: siempre enviamos el arreglo de IDs
    const currentInstIds = institutions.map((i) => i._id);
    payload.institutions = currentInstIds;

    // educationalEmails: { institution, email }
    const educationalEmailsPayload = Object.entries(institutionEmails)
      .map(([instId, eduEmailRaw]) => ({
        institution: instId,
        email: eduEmailRaw.trim(),
      }))
      .filter((entry) => entry.email.length > 0);
    payload.educationalEmails = educationalEmailsPayload;

    console.log(payload);

    try {
      if (!token) {
        alert("No auth token found. Please log in again.");
        return;
      }

      await axios.put(`${API_BASE_URL}/users/me`, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      alert("Profile updated successfully.");

      // Actualizamos initialData en memoria
      setInitialData((prev) => ({
        ...(prev || {}),
        ...payload,
      }));

      // Al guardar, ocultamos cualquier panel de edición
      setEditingInstitutionId("");
    } catch (err) {
      console.error(err);
      alert("Error updating profile.");
    }
  };

  // ------------------ RENDER ------------------
  if (loading) {
    return <div className="container mt-4">Loading profile...</div>;
  }

  if (loadError) {
    return <div className="container mt-4 text-danger">{loadError}</div>;
  }

  return (
    <form className="container" onSubmit={handleSubmit}>
      {/* BASIC INFORMATION */}
      <section className="mb-4">
        <h5 className="mb-3 mt-0">Basic information</h5>

        <div className="row g-4">
          <div className="col-md-4 basic-info-left">
            <div className="basic-info-avatar">
              {imgPreview ? (
                <img
                  src={imgPreview}
                  alt="profile preview"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <span className="text-muted" style={{ fontSize: 12 }}>
                  No image
                </span>
              )}
            </div>
            <div className="d-flex flex-column gap-2">
              <button
                type="button"
                className="btn btn-sm btn-outline-memory"
                onClick={pickImage}
              >
                Upload image
              </button>
              {imgPreview && (
                <button
                  type="button"
                  className="btn btn-sm btn-outline-danger"
                  onClick={removeImage}
                >
                  Remove
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={onImageChange}
                hidden
              />
            </div>
          </div>

          <div className="col-md-8">
            {/* First + Last name en la misma fila */}
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">First name </label>
                <input
                  className={`form-control ${errors.name ? "is-invalid" : ""}`}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your first name"
                  required
                />
                {errors.name && (
                  <div className="invalid-feedback">{errors.name}</div>
                )}
              </div>
              <div className="col-md-6">
                <label className="form-label">Last name </label>
                <input
                  className={`form-control ${
                    errors.lastname ? "is-invalid" : ""
                  }`}
                  value={lastname}
                  onChange={(e) => setLastname(e.target.value)}
                  placeholder="Your last name"
                  required
                />
                {errors.lastname && (
                  <div className="invalid-feedback">{errors.lastname}</div>
                )}
              </div>
            </div>

            {/* Email debajo */}
            <div className="mt-3">
              <label className="form-label">Email </label>
              <input
                className={`form-control ${errors.email ? "is-invalid" : ""}`}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@domain.com"
                required
              />
              {errors.email && (
                <div className="invalid-feedback">{errors.email}</div>
              )}
            </div>
          </div>
        </div>
      </section>

      <hr />

      {/* SECURITY */}
      <section className="mb-4">
        <h5 className="mb-3">Security</h5>
        <div className="row g-3">
          <div className="col-md-6">
            <label className="form-label">New password</label>
            <div className="input-group">
              <input
                className={`form-control ${
                  errors.password ? "is-invalid" : ""
                }`}
                type={showPass ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                autoComplete="new-password"
              />
              <button
                type="button"
                className="btn password-toggle-btn d-flex align-items-center"
                onClick={() => setShowPass((v) => !v)}
                tabIndex={-1}
                aria-label={showPass ? "Hide password" : "Show password"}
                title={showPass ? "Hide password" : "Show password"}
              >
                {showPass ? EyeSlashIcon : EyeIcon}
              </button>
            </div>
            {errors.password && (
              <div className="invalid-feedback d-block">
                {errors.password}
              </div>
            )}
          </div>

          <div className="col-md-6">
            <label className="form-label">Confirm password</label>
            <div className="input-group">
              <input
                className={`form-control ${
                  errors.confirm ? "is-invalid" : ""
                }`}
                type={showConfirm ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repeat the password"
                autoComplete="new-password"
              />
              <button
                type="button"
                className="btn password-toggle-btn d-flex align-items-center"
                onClick={() => setShowConfirm((v) => !v)}
                tabIndex={-1}
                aria-label={showConfirm ? "Hide password" : "Show password"}
                title={showConfirm ? "Hide password" : "Show password"}
              >
                {showConfirm ? EyeSlashIcon : EyeIcon}
              </button>
            </div>
            {errors.confirm && (
              <div className="invalid-feedback d-block">
                {errors.confirm}
              </div>
            )}
          </div>
        </div>
      </section>

      <hr />

      {/* INSTITUTIONS */}
      <section className="mb-4">
        <h5 className="mb-3">Institutions</h5>

        {/* Cards siempre visibles */}
        <div className="mb-3 d-flex flex-column gap-3">
          {institutions.length === 0 ? (
            <span className="text-muted">No institutions added.</span>
          ) : (
            institutions.map((inst) => {
              const instId = inst._id;
              const eduEmail = institutionEmails[instId] || "";
              const allowedDomains = inst.emailDomains || [];
              const isEditing = editingInstitutionId === instId;
              const isNew = !initialInstitutionIdSet.has(instId);

              return (
                <React.Fragment key={instId}>
                  <div className="card shadow-sm">
                    <div className="card-body d-flex align-items-center gap-3">
                      {/* Logo */}
                      <div
                        style={{
                          width: 72,
                          height: 72,
                          borderRadius: 12,
                          overflow: "hidden",
                          background: "#f8f9fa",
                          border: "1px solid #eee",
                          flex: "0 0 auto",
                        }}
                        className="d-flex align-items-center justify-content-center text-muted"
                      >
                        {inst.logo ? (
                          <img
                            src={inst.logo}
                            alt={inst.name}
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                            }}
                          />
                        ) : (
                          "LOGO"
                        )}
                      </div>

                      {/* Info principal */}
                      <div className="flex-grow-1">
                        <h5 className="m-0 fw-semibold">{inst.name}</h5>
                        <div className="text-muted small">
                          {eduEmail || "No institutional email"}
                        </div>
                      </div>

                      {/* Botón editar */}
                      <div className="d-flex align-items-center gap-2">
                        <button
                          type="button"
                          className="btn btn-warning btn-sm d-flex align-items-center justify-content-center text-white"
                          onClick={() =>
                            setEditingInstitutionId((prev) =>
                              prev === instId ? "" : instId
                            )
                          }
                          title={isEditing ? "Close" : "Edit"}
                        >
                          {isEditing ? CloseIcon : EditIcon}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Panel de edición SOLO cuando se está editando esta institución */}
                  {isEditing && (
                    <div className="mt-2 border rounded p-2">
                      <label
                        className="form-label mb-1"
                        style={{ fontSize: 12 }}
                      >
                        Institutional email
                        {allowedDomains && allowedDomains.length > 0 && (
                          <span className="text-muted ms-1">
                            (allowed: {allowedDomains.join(", ")})
                          </span>
                        )}
                      </label>
                      <div className="d-flex gap-2">
                        <input
                          type="email"
                          className="form-control form-control-sm"
                          value={institutionEmails[instId] || ""}
                          onChange={(e) =>
                            handleInstitutionEmailChange(
                              instId,
                              e.target.value
                            )
                          }
                          placeholder="john@youruniversity.edu"
                        />
                        {/* Solo se puede descartar si es una institución nueva */}
                        {isNew && (
                          <button
                            type="button"
                            className="btn btn-danger btn-sm d-flex align-items-center justify-content-center text-white"
                            onClick={() => removeInstitution(instId)}
                            title="Discard"
                          >
                            {DiscardIcon}
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </React.Fragment>
              );
            })
          )}
        </div>

        {/* Selector para añadir nuevas instituciones */}
        <div className="row g-3 align-items-end">
          <div className="col-md-8">
            <label className="form-label">Select an institution</label>
            <select
              className="form-select"
              value={selectedInstitutionId}
              onChange={(e) => setSelectedInstitutionId(e.target.value)}
            >
              <option value="">— Select Institution —</option>
              {remainingOptions.map((opt) => (
                <option key={opt._id} value={opt._id}>
                  {opt.name}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-4 d-grid">
            <button
              type="button"
              className="btn btn-outline-memory"
              onClick={addInstitution}
              disabled={!selectedInstitutionId}
            >
              Add Institution
            </button>
          </div>
        </div>
      </section>

      <div className="mt-4 d-flex justify-content-end gap-2">
        <button
          type="button"
          className="btn btn-outline-memory"
          onClick={() => window.history.back()}
        >
          Cancel
        </button>
        <button type="submit" className="btn btn-memory">
          Save changes
        </button>
      </div>
    </form>
  );
};

export default FormProfile;
