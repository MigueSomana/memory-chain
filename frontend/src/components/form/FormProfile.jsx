import React, { useMemo, useRef, useState, useEffect } from "react";
import { getAuthToken } from "../../utils/authSession";
import axios from "axios";
import {
  EyeIcon,
  EyeSlashIcon,
  EditIcon,
  DiscardIcon,
  CloseIcon,
  BasicPIcon,
  SecurePIcon,
  InstPIcon,
} from "../../utils/icons";

// Configuración base (API + sesión)
const API_BASE_URL = "http://localhost:4000/api";
const token = getAuthToken();

// Componente: Perfil de Usuario
const FormProfile = () => {
  // Estado inicial (datos cargados del backend)
  const [initialData, setInitialData] = useState(null);
  const [institutionOptions, setInstitutionOptions] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // Imagen de perfil (preview + archivo)
  const [imgPreview, setImgPreview] = useState("");
  const [imgFile, setImgFile] = useState(null);
  const fileInputRef = useRef(null);

  // Abre el selector de archivos
  const pickImage = () => fileInputRef.current?.click();

  // Bandera para indicar que se desea eliminar la imagen
  const [removeImgFlag, setRemoveImgFlag] = useState(false);

  // Elimina imagen localmente y marca para remover en backend
  const removeImage = () => {
    setImgPreview("");
    setImgFile(null);
    setRemoveImgFlag(true);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Maneja el cambio de imagen (validación + preview)
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

  // Datos básicos del usuario
  const [name, setName] = useState("");
  const [lastname, setLastname] = useState("");
  const [email, setEmail] = useState("");

  // Seguridad (cambio de contraseña)
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Instituciones vinculadas + emails institucionales
  const [institutions, setInstitutions] = useState([]);
  const [institutionEmails, setInstitutionEmails] = useState({});

  // Control de selección / edición
  const [selectedInstitutionId, setSelectedInstitutionId] = useState("");
  const [editingInstitutionId, setEditingInstitutionId] = useState("");

  // Validaciones generales
  const [errors, setErrors] = useState({});
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // IDs de instituciones que ya venían en el perfil (para diferenciar "nuevas")
  const initialInstitutionIdSet = useMemo(() => {
    const ids = new Set();
    if (!initialData) return ids;

    // IDs desde educationalEmails
    const eduEmails = initialData.educationalEmails || [];
    eduEmails.forEach((entry) => {
      if (!entry) return;
      const inst = entry.institution;
      if (typeof inst === "string") ids.add(inst);
      else if (inst && inst._id) ids.add(inst._id);
    });

    // IDs desde institutions
    const insts = initialData.institutions || [];
    insts.forEach((inst) => {
      if (typeof inst === "string") ids.add(inst);
      else if (inst && inst._id) ids.add(inst._id);
    });

    return ids;
  }, [initialData]);

  // Carga inicial (perfil + lista de instituciones)
  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!token) {
          setLoadError("No auth token found. Please log in again.");
          setLoading(false);
          return;
        }

        // Trae usuario actual + instituciones disponibles
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

        // Inicializa preview + campos básicos
        const imgUrl = user.imgUrl || "";
        setImgPreview(imgUrl);

        setName(user.name || "");
        setLastname(user.lastname || "");
        setEmail(user.email || "");

        // Construye mapa institutionId -> email institucional
        const eduEmails = user.educationalEmails || [];
        const emailMap = {};
        eduEmails.forEach((entry) => {
          if (entry.institution && entry.email) {
            emailMap[entry.institution] = entry.email;
          }
        });
        setInstitutionEmails(emailMap);

        // Crea el arreglo institutions con objetos completos
        const instIdsFromEdu = eduEmails.map((e) => e.institution);
        const userInsts = allInstitutions.filter((inst) =>
          instIdsFromEdu.includes(inst._id),
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

  // Opciones restantes (instituciones aún no agregadas)
  const remainingOptions = useMemo(() => {
    const selectedIds = new Set(institutions.map((i) => i._id));
    return institutionOptions.filter((opt) => !selectedIds.has(opt._id));
  }, [institutionOptions, institutions]);

  // Gestión de instituciones (agregar / quitar / editar email)
  const addInstitution = () => {
    if (!selectedInstitutionId) return;
    const opt = institutionOptions.find((o) => o._id === selectedInstitutionId);
    if (!opt) return;

    setInstitutions((prev) => {
      if (prev.some((i) => i._id === opt._id)) return prev;
      return [...prev, opt];
    });

    // Al agregar una institución, abrimos edición del email
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

  // Validación básica (campos + contraseña)
  const validateBasic = () => {
    const e = {};

    if (!name.trim()) e.name = "First name is required.";
    if (!lastname.trim()) e.lastname = "Last name is required.";

    if (!email.trim()) {
      e.email = "Email is required.";
    } else if (!EMAIL_RE.test(email)) {
      e.email = "Invalid email format.";
    }

    // Si se intenta cambiar password, validamos condiciones
    if (password || confirm) {
      const pwd = password || "";
      const conf = confirm || "";

      if (!pwd.trim()) e.password = "Password is required.";
      if (!conf.trim()) e.confirm = "Please confirm your password.";

      if (pwd.trim()) {
        if (pwd.length < 8) {
          e.password = "Password must be at least 8 characters long.";
        }

        const hasUpper = /[A-Z]/.test(pwd);
        const hasLower = /[a-z]/.test(pwd);
        const hasDigit = /\d/.test(pwd);
        const hasSymbol = /[^A-Za-z0-9]/.test(pwd);

        if (!hasUpper || !hasLower || !hasDigit || !hasSymbol) {
          e.password =
            "Password must have uppercase, lowercase, a number and a symbol.";
        }
      }

      if (pwd && conf && pwd !== conf) {
        e.confirm = "Passwords do not match.";
      }
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // Validación de emails institucionales por dominio permitido
  const validateInstitutionEmails = () => {
    for (const [instId, eduEmailRaw] of Object.entries(institutionEmails)) {
      const eduEmail = eduEmailRaw.trim();
      if (!eduEmail) continue;

      const institution = institutionOptions.find((i) => i._id === instId);
      if (!institution) continue;

      const atIndex = eduEmail.indexOf("@");
      if (atIndex === -1) {
        alert(
          `The institutional email "${eduEmail}" for "${institution.name}" is invalid.`,
        );
        return false;
      }

      const domain = eduEmail.slice(atIndex + 1).toLowerCase();
      const allowedDomains = (institution.emailDomains || []).map((d) =>
        d.toLowerCase(),
      );

      if (!allowedDomains.length) {
        alert(
          `Institution "${institution.name}" has no configured email domains, cannot validate "${eduEmail}".`,
        );
        return false;
      }

      if (!allowedDomains.includes(domain)) {
        alert(
          `The email "${eduEmail}" does not match any allowed domain for "${
            institution.name
          }" (${allowedDomains.join(", ")}).`,
        );
        return false;
      }
    }
    return true;
  };

  // Guardar cambios del perfil (PUT con FormData)
  const handleSubmit = async (ev) => {
    ev.preventDefault();

    if (!validateBasic()) return;
    if (!validateInstitutionEmails()) return;

    if (!initialData) {
      alert("Profile not loaded yet.");
      return;
    }

    try {
      if (!token) {
        alert("No auth token found. Please log in again.");
        return;
      }

      // Payload tipo multipart para soportar imagen
      const form = new FormData();

      // Imagen: subir nueva o marcar eliminación
      if (imgFile) {
        form.append("img", imgFile);
        form.append("removeImg", "0");
      } else {
        if (removeImgFlag) form.append("removeImg", "1");
      }

      // Campos básicos
      form.append("name", name.trim());
      form.append("lastname", lastname.trim());
      form.append("email", email.trim().toLowerCase());

      // Password opcional
      if (password) form.append("password", password);

      // Instituciones vinculadas
      const currentInstIds = institutions.map((i) => i._id);
      form.append("institutions", JSON.stringify(currentInstIds));

      // Emails institucionales (solo los no vacíos)
      const educationalEmailsPayload = Object.entries(institutionEmails)
        .map(([instId, eduEmailRaw]) => ({
          institution: instId,
          email: eduEmailRaw.trim(),
        }))
        .filter((entry) => entry.email.length > 0);

      form.append(
        "educationalEmails",
        JSON.stringify(educationalEmailsPayload),
      );

      // Enviar actualización
      const res = await axios.put(`${API_BASE_URL}/users/me`, form, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      alert("Profile updated successfully.");

      // Refresca estado local con la respuesta
      const updatedUser = res.data;
      setInitialData(updatedUser);

      if (updatedUser.imgUrl) {
        setImgPreview(updatedUser.imgUrl);
        setImgFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }

      setEditingInstitutionId("");
    } catch (err) {
      console.error(err);
      alert("Error updating profile.");
    }
  };

  // Estados de carga / error
  if (loading) {
    return <div className="container py-2">Loading profile...</div>;
  }

  if (loadError) {
    return <div className="container py-2 text-danger">{loadError}</div>;
  }

  return (
    <form className="container mb-3" onSubmit={handleSubmit}>
      {/* ✅ SECTION 1: BASIC INFO (CARD) */}
      <section className="card mc-card-shadow mb-4">
        <div className="card-body">
          <div className="mc-card-header mb-3">
            <h5 className="m-0">Basic information</h5>
            <span>{BasicPIcon}</span>
          </div>

          <div className="row g-4">
            <div className="col-md-4 basic-info-left px-5">
              <div className="basic-info-avatar">
                {imgPreview ? (
                  <img
                    src={imgPreview}
                    alt="profile preview"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
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
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label">First name</label>
                  <input
                    className={`form-control ${
                      errors.name ? "is-invalid" : ""
                    }`}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your first name"
                    disabled
                  />
                  {errors.name && (
                    <div className="invalid-feedback">{errors.name}</div>
                  )}
                </div>

                <div className="col-md-6">
                  <label className="form-label">Last name</label>
                  <input
                    className={`form-control ${
                      errors.lastname ? "is-invalid" : ""
                    }`}
                    value={lastname}
                    onChange={(e) => setLastname(e.target.value)}
                    placeholder="Your last name"
                    disabled
                  />
                  {errors.lastname && (
                    <div className="invalid-feedback">{errors.lastname}</div>
                  )}
                </div>
              </div>

              <div className="mt-3">
                <label className="form-label">Email</label>
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
        </div>
      </section>

      {/* ✅ SECTION 2: SECURITY (CARD) */}
      <section className="card mc-card-shadow mb-4">
        <div className="card-body">
          <div className="mc-card-header mb-3">
            <h5 className="m-0">Security</h5>
            <span>{SecurePIcon}</span>
          </div>

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
                <div className="invalid-feedback d-block">{errors.confirm}</div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ✅ SECTION 3: INSTITUTIONS (CARD) */}
      <section className="card mc-card-shadow">
        <div className="card-body">
          <div className="mc-card-header mb-3">
            <h5 className="m-0">Institutions</h5>
            <span>{InstPIcon}</span>
          </div>

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
                    <div className="card mc-card-shadow">
                      <div className="card-body d-flex align-items-center gap-3">
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
                          {inst.logoUrl ? (
                            <img
                              src={inst.logoUrl}
                              alt={`${inst.name} logo`}
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

                        <div className="flex-grow-1">
                          <h5 className="m-0 fw-semibold">{inst.name}</h5>
                          <div className="text-muted small">
                            {eduEmail || "No institutional email"}
                          </div>
                        </div>

                        <div className="d-flex align-items-center gap-2">
                          <button
                            type="button"
                            className="btn btn-warning d-flex align-items-center justify-content-center text-white"
                            onClick={() =>
                              setEditingInstitutionId((prev) =>
                                prev === instId ? "" : instId,
                              )
                            }
                            title={isEditing ? "Close" : "Edit"}
                          >
                            {isEditing ? CloseIcon : EditIcon}
                          </button>
                        </div>
                      </div>
                    </div>

                    {isEditing && (
                      <div className="mc-soft-callout mt-2">
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
                                e.target.value,
                              )
                            }
                            placeholder="john@youruniversity.edu"
                          />

                          {isNew && (
                            <button
                              type="button"
                              className="btn btn-danger d-flex align-items-center justify-content-center text-white"
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

          <div className="row g-3 align-items-end">
            <div className="col-md-8">
              <label className="form-label">Select an institution</label>

              <div className="dropdown mc-filter-select mc-select">
                <button
                  className="btn btn-outline-secondary dropdown-toggle droptoogle-fix mc-dd-toggle"
                  type="button"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                >
                  <span className="mc-filter-select-text">
                    {selectedInstitutionId
                      ? remainingOptions.find(
                          (o) => o._id === selectedInstitutionId,
                        )?.name
                      : "— Select Institution —"}
                  </span>
                </button>

                <ul className="dropdown-menu mc-select">
                  {remainingOptions.map((opt) => (
                    <li key={opt._id}>
                      <button
                        type="button"
                        className={`dropdown-item ${
                          selectedInstitutionId === opt._id ? "active" : ""
                        }`}
                        onClick={() => setSelectedInstitutionId(opt._id)}
                      >
                        {opt.name}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
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
        </div>
      </section>
      {/* Acciones finales */}
      <div className="mt-4 d-flex justify-content-center gap-2">
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
