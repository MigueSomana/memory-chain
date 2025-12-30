import React, { useRef, useState, useEffect } from "react";
import axios from "axios";
import { getAuthToken } from "../../utils/authSession";
import {
  EyeIcon,
  EyeSlashIcon,
  CheckCircle,
  CrossCircle,
} from "../../utils/icons";

// Configuración base (API + sesión)
const API_BASE_URL = "http://localhost:4000/api";
const token = getAuthToken();

// Componente: Perfil de Institución
const FormProfileU = ({ initialData: initialDataProp }) => {
  // Estado base (datos iniciales / carga / errores)
  const [initialData, setInitialData] = useState(initialDataProp || null);
  const [loading, setLoading] = useState(!initialDataProp);
  const [loadError, setLoadError] = useState("");
  const [deptAlert, setDeptAlert] = useState("");

  // Estado de membresía (para mostrar banner activo/inactivo)
  const isMember = Boolean(initialData?.isMember);

  // Logo institucional (preview + archivo)
  const [logoPreview, setLogoPreview] = useState("");
  const [logoFile, setLogoFile] = useState(null);
  const fileInputRef = useRef(null);

  // Abre el selector de archivos
  const pickLogo = () => fileInputRef.current?.click();

  // Bandera para indicar que se desea eliminar el logo en backend
  const [removeImgFlag, setRemoveImgFlag] = useState(false);

  // Elimina logo localmente y marca para remover
  const removeLogo = () => {
    setLogoPreview("");
    setLogoFile(null);
    setRemoveImgFlag(true);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Maneja el cambio de logo (validación + preview)
  const onLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!/image\/(png|jpe?g|webp|svg\+xml)/.test(file.type)) {
      alert("Unsupported logo format. Use PNG/JPG/WebP/SVG.");
      return;
    }

    if (file.size > 4 * 1024 * 1024) {
      alert("Logo must be less than 4MB.");
      return;
    }

    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = () => setLogoPreview(String(reader.result));
    reader.readAsDataURL(file);
  };

  // Campos básicos de institución
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [country, setCountry] = useState("");
  const [website, setWebsite] = useState("");
  const [type, setType] = useState("");

  // Departamentos (lista + input + alertas)
  const [departments, setDepartments] = useState([]);
  const [deptInput, setDeptInput] = useState("");

  const addDepartment = () => {
    const val = deptInput.trim();
    if (!val) return;

    const exists = departments.some(
      (d) => d.name.toLowerCase() === val.toLowerCase()
    );

    if (exists) {
      setDeptAlert(`The department "${val}" is already in the list.`);
      return;
    }

    setDepartments((prev) => [...prev, { name: val }]);
    setDeptInput("");
    setDeptAlert("");
  };

  const removeDepartment = (name) => {
    setDepartments((prev) => prev.filter((d) => d.name !== name));
  };

  // Email principal + dominios permitidos
  const [email, setEmail] = useState("");
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const [emailDomains, setEmailDomains] = useState([]);
  const [domainInput, setDomainInput] = useState("");

  const addDomain = () => {
    const val = domainInput.trim();
    if (!val) return;

    const exists = emailDomains.some(
      (d) => d.value.toLowerCase() === val.toLowerCase()
    );
    if (exists) return;

    setEmailDomains((prev) => [...prev, { value: val }]);
    setDomainInput("");
  };

  const removeDomain = (value) => {
    setEmailDomains((prev) => prev.filter((d) => d.value !== value));
  };

  // Seguridad (cambio de contraseña)
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Errores de validación
  const [errors, setErrors] = useState({});

  // Carga inicial de institución (si no llega por props)
  useEffect(() => {
    // Si ya nos pasan los datos, no hacemos fetch
    if (initialDataProp) {
      setInitialData(initialDataProp);
      setLoading(false);
      return;
    }

    const fetchInstitution = async () => {
      try {
        if (!token) {
          setLoadError("No auth token found. Please log in again.");
          setLoading(false);
          return;
        }

        // Extrae institutionId del JWT (payload)
        let institutionId = null;
        try {
          const [, payloadB64] = token.split(".");
          const payloadJson = JSON.parse(atob(payloadB64));
          institutionId =
            payloadJson.institutionId ||
            payloadJson.institutionID ||
            payloadJson.institution_id ||
            null;
        } catch (err) {
          console.error("Error decoding token", err);
        }

        if (!institutionId) {
          setLoadError("No institution id found in token.");
          setLoading(false);
          return;
        }

        // Trae los datos de la institución
        const res = await axios.get(
          `${API_BASE_URL}/institutions/${institutionId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        setInitialData(res.data);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setLoadError("Error loading institution profile.");
        setLoading(false);
      }
    };

    fetchInstitution();
  }, [initialDataProp]);

  // Sincroniza estados del formulario cuando initialData cambia
  useEffect(() => {
    if (!initialData) return;

    setLogoPreview(initialData.logoUrl || "");
    setName(initialData.name || "");
    setDescription(initialData.description || "");
    setCountry(initialData.country || "");
    setWebsite(initialData.website || "");
    setType(initialData.type || "");
    setEmail(initialData.email || "");

    // Normaliza departamentos a objetos { name }
    const instDepts = (initialData.departments || []).map((d) =>
      typeof d === "string" ? { name: d } : d
    );
    setDepartments(instDepts);

    // Normaliza dominios a objetos { value }
    const instDomains = (initialData.emailDomains || []).map((d) =>
      typeof d === "string" ? { value: d } : d
    );
    setEmailDomains(instDomains);
  }, [initialData]);

  // Validación del formulario (requeridos + formato)
  const validate = () => {
    const e = {};

    if (!name.trim()) e.name = "Name is required.";
    if (!country.trim()) e.country = "Country is required.";
    if (!type) e.type = "Institution type is required.";
    if (!email.trim()) e.email = "Primary email is required.";
    if (!website.trim()) e.website = "Website is required.";

    if (email && !EMAIL_RE.test(email)) {
      e.email = "Invalid email.";
    }

    // Valida URL (acepta "example.edu" agregando https://)
    if (website) {
      try {
        new URL(website.startsWith("http") ? website : `https://${website}`);
      } catch {
        e.website = "Invalid URL.";
      }
    }

    // Si se cambia password, valida reglas básicas
    if (password || confirm) {
      if (password.length < 8) e.password = "At least 8 characters.";
      if (password !== confirm) e.confirm = "Passwords do not match.";
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // Guardar cambios (PUT con FormData)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    if (!initialData?._id) {
      alert("Institution data not loaded yet.");
      return;
    }

    try {
      if (!token) {
        alert("No auth token found. Please log in again.");
        return;
      }

      // Payload tipo multipart para soportar logo (archivo)
      const form = new FormData();

      // Logo: subir nuevo o marcar eliminación
      if (logoFile) {
        form.append("logo", logoFile);
        form.append("removeImg", "0");
      } else {
        if (removeImgFlag) form.append("removeImg", "1");
      }

      // Campos básicos
      form.append("name", name.trim());
      form.append("description", description.trim());
      form.append("country", country.trim());
      form.append("website", website.trim());
      form.append("type", type);
      form.append("email", email.trim().toLowerCase());

      // Listas (departamentos + dominios)
      form.append(
        "departments",
        JSON.stringify(departments.map((d) => d.name))
      );
      form.append(
        "emailDomains",
        JSON.stringify(emailDomains.map((d) => d.value))
      );

      // Flags de estado (solo lectura desde UI, se manda tal cual)
      form.append("isMember", String(Boolean(initialData.isMember)));
      form.append("canVerify", String(Boolean(initialData.canVerify)));

      // Password opcional
      if (password) form.append("password", password);

      // Enviar actualización
      const res = await axios.put(
        `${API_BASE_URL}/institutions/${initialData._id}`,
        form,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      alert("Institution profile updated successfully.");

      // Refresca estado local
      const updated = res.data;
      setInitialData(updated);

      // Resetea logo local si el backend devolvió logoUrl
      if (updated.logoUrl) {
        setLogoPreview(updated.logoUrl);
        setLogoFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }

      // Limpia campos de password
      setPassword("");
      setConfirm("");
    } catch (err) {
      console.error("Update institution error:", err?.response?.data || err);
      alert(
        err?.response?.data?.message || "Error updating institution profile."
      );
    }
  };

  // Estados de carga / error
  if (loading) {
    return <div className="container mt-4">Loading institution profile...</div>;
  }

  if (loadError) {
    return <div className="container mt-4 text-danger">{loadError}</div>;
  }

  // Render del formulario
  return (
    <form className="container" onSubmit={handleSubmit}>
      {/* Banner de membresía */}
      {isMember ? (
        <div
          className="alert border-0"
          role="alert"
          style={{
            backgroundColor: "#20c997",
            color: "#fff",
            fontWeight: 600,
          }}
        >
          <span className="mx-2">{CheckCircle}</span> Your membership plan is{" "}
          <strong>active</strong>.
        </div>
      ) : (
        <div
          className="alert border-0"
          role="alert"
          style={{
            backgroundColor: "#dc3545",
            color: "#fff",
            fontWeight: 600,
          }}
        >
          <span className="mx-2">{CrossCircle}</span> Your membership plan is{" "}
          <strong>inactive</strong>.
        </div>
      )}

      <section className="mb-4">
        <h5 className="mb-3">Basic information</h5>

        <div className="row g-4">
          <div className="col-md-4 d-flex align-items-center gap-3">
            <div
              className="overflow-hidden border"
              style={{
                width: 112,
                height: 112,
                background: "#f2f2f2",
                borderRadius: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {logoPreview ? (
                <img
                  src={logoPreview}
                  alt="logo preview"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <span className="text-muted" style={{ fontSize: 12 }}>
                  No logo
                </span>
              )}
            </div>

            <div className="d-flex flex-column gap-2">
              <button
                type="button"
                className="btn btn-sm btn-outline-memory"
                onClick={pickLogo}
              >
                Upload logo
              </button>

              {logoPreview && (
                <button
                  type="button"
                  className="btn btn-sm btn-outline-danger"
                  onClick={removeLogo}
                >
                  Remove
                </button>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={onLogoChange}
                hidden
              />
            </div>
          </div>

          <div className="col-md-8">
            <div className="mb-3">
              <label className="form-label">Name</label>
              <input
                className={`form-control ${errors.name ? "is-invalid" : ""}`}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Institution name"
              />
              {errors.name && (
                <div className="invalid-feedback">{errors.name}</div>
              )}
            </div>

            <div className="row g-3">
              <div className="col-12">
                <label className="form-label">Country</label>
                <input
                  className={`form-control ${
                    errors.country ? "is-invalid" : ""
                  }`}
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="Country"
                />
                {errors.country && (
                  <div className="invalid-feedback">{errors.country}</div>
                )}
              </div>
            </div>
          </div>

          <div className="col-12 mt-3">
            <label className="form-label">Description</label>
            <textarea
              className="form-control"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short description"
              rows={3}
            />
          </div>
        </div>
      </section>

      <hr />

      <section className="mb-4">
        <h5 className="mb-3">Email</h5>

        <div className="row g-3">
          <div className="col-md-6">
            <label className="form-label">Email Institutional</label>
            <input
              className={`form-control ${errors.email ? "is-invalid" : ""}`}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="info@institution.edu"
            />
            {errors.email && (
              <div className="invalid-feedback">{errors.email}</div>
            )}
          </div>

          <div className="col-md-6">
            <label className="form-label">Website</label>
            <input
              className={`form-control ${errors.website ? "is-invalid" : ""}`}
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="example.edu"
            />
            {errors.website && (
              <div className="invalid-feedback">{errors.website}</div>
            )}
          </div>
        </div>

        {/* Gestión de dominios permitidos */}
        <div className="row g-3 align-items-end mt-3">
          <div className="col-md-8">
            <label className="form-label">Add email domain</label>
            <input
              className="form-control"
              value={domainInput}
              onChange={(e) => setDomainInput(e.target.value)}
              placeholder="e.g., university.edu"
            />
          </div>
          <div className="col-md-4 d-grid">
            <button
              type="button"
              className="btn btn-outline-memory"
              onClick={addDomain}
              disabled={!domainInput.trim()}
            >
              Add domain
            </button>
          </div>
        </div>

        <div className="mt-3 d-flex flex-wrap gap-2">
          {emailDomains.length === 0 ? (
            <span className="text-muted">No email domains added.</span>
          ) : (
            emailDomains.map((d, idx) => (
              <span
                key={`${d.value}-${idx}`}
                className="badge text-bg-light d-flex align-items-center gap-2"
              >
                {d.value}
                <button
                  type="button"
                  className="btn btn-sm btn-link text-danger p-0"
                  onClick={() => removeDomain(d.value)}
                >
                  ×
                </button>
              </span>
            ))
          )}
        </div>
      </section>

      <hr />

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
              <div className="invalid-feedback d-block">{errors.password}</div>
            )}
          </div>

          <div className="col-md-6">
            <label className="form-label">Confirm password</label>
            <div className="input-group">
              <input
                className={`form-control ${errors.confirm ? "is-invalid" : ""}`}
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
      </section>

      <hr />

      <section className="mb-4">
        <h5 className="mb-3">Departments</h5>

        {/* Gestión de departamentos */}
        <div className="row g-3 align-items-end">
          <div className="col-md-8">
            <label className="form-label">Add a department</label>
            <input
              className="form-control"
              value={deptInput}
              onChange={(e) => setDeptInput(e.target.value)}
              placeholder="e.g., Computer Science"
            />
          </div>
          <div className="col-md-4 d-grid">
            <button
              type="button"
              className="btn btn-outline-memory"
              onClick={addDepartment}
              disabled={!deptInput.trim()}
            >
              Add Deparment
            </button>
          </div>
        </div>

        {deptAlert && (
          <div className="mt-3 alert alert-warning py-2">{deptAlert}</div>
        )}

        <div className="mt-3 d-flex flex-wrap gap-2">
          {departments.length === 0 ? (
            <span className="text-muted">No departments added.</span>
          ) : (
            departments.map((d, idx) => (
              <span
                key={`${d.name}-${idx}`}
                className="badge text-bg-light d-flex align-items-center gap-2"
              >
                {d.name}
                <button
                  type="button"
                  className="btn btn-sm btn-link text-danger p-0"
                  onClick={() => removeDepartment(d.name)}
                >
                  ×
                </button>
              </span>
            ))
          )}
        </div>
      </section>

      {/* Acciones finales */}
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

export default FormProfileU;
