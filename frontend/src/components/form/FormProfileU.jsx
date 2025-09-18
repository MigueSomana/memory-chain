import React, { useRef, useState } from "react";

const FormProfileU = ({ initialData, onSubmit }) => {
  const isMember = Boolean(initialData?.isMember);

  const [logoPreview, setLogoPreview] = useState(initialData?.logo || "");
  const [logoFile, setLogoFile] = useState(null);
  const fileInputRef = useRef(null);

  const pickLogo = () => fileInputRef.current?.click();
  const removeLogo = () => {
    setLogoPreview("");
    setLogoFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };
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

  const [name, setName] = useState(initialData?.name || "");
  const [description, setDescription] = useState(
    initialData?.description || ""
  );
  const [country, setCountry] = useState(initialData?.country || "");
  const [website, setWebsite] = useState(initialData?.website || "");
  const [type, setType] = useState(initialData?.type || "");

  const [departments, setDepartments] = useState(
    (initialData?.departments || []).map((d) =>
      typeof d === "string" ? { name: d } : d
    )
  );
  const [deptInput, setDeptInput] = useState("");

  const addDepartment = () => {
    const val = deptInput.trim();
    if (!val) return;
    const exists = departments.some(
      (d) => d.name.toLowerCase() === val.toLowerCase()
    );
    if (exists) return;
    setDepartments((prev) => [...prev, { name: val }]);
    setDeptInput("");
  };
  const removeDepartment = (name) => {
    setDepartments((prev) => prev.filter((d) => d.name !== name));
  };

  const [email, setEmail] = useState(initialData?.email || "");
  const [secondaryEmail, setSecondaryEmail] = useState(
    initialData?.secondaryEmail || ""
  );
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!name.trim()) e.name = "Name is required.";
    if (!country.trim()) e.country = "Country is required.";
    if (!type) e.type = "Institution type is required.";
    if (email && !EMAIL_RE.test(email)) e.email = "Invalid email.";
    if (secondaryEmail && !EMAIL_RE.test(secondaryEmail))
      e.secondaryEmail = "Invalid secondary email.";
    if (website) {
      try {
        new URL(website.startsWith("http") ? website : `https://${website}`);
      } catch {
        e.website = "Invalid URL.";
      }
    }
    if (password || confirm) {
      if (password.length < 8) e.password = "At least 8 characters.";
      if (password !== confirm) e.confirm = "Passwords do not match.";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const EyeIcon = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 640 640"
      width="18"
      height="18"
    >
      <path
        d="M320 96C239.2 96 174.5 132.8 127.4 176.6C80.6 220.1 49.3 272 34.4 307.7C31.1 315.6 31.1 324.4 34.4 332.3C49.3 368 80.6 420 127.4 463.4C174.5 507.1 239.2 544 320 544C400.8 544 465.5 507.2 512.6 463.4C559.4 419.9 590.7 368 605.6 332.3C608.9 324.4 608.9 315.6 605.6 307.7C590.7 272 559.4 220 512.6 176.6C465.5 132.9 400.8 96 320 96zM176 320C176 240.5 240.5 176 320 176C399.5 176 464 240.5 464 320C464 399.5 399.5 464 320 464C240.5 464 176 399.5 176 320zM320 256C320 291.3 291.3 320 256 320C244.5 320 233.7 317 224.3 311.6C223.3 322.5 224.2 333.7 227.2 344.8C240.9 396 293.6 426.4 344.8 412.7C396 399 426.4 346.3 412.7 295.1C400.5 249.4 357.2 220.3 311.6 224.3C316.9 233.6 320 244.4 320 256z"
        fill="currentColor"
      />
    </svg>
  );

  const EyeSlashIcon = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 640 640"
      width="18"
      height="18"
    >
      <path
        d="M73 39.1C63.6 29.7 48.4 29.7 39.1 39.1C29.8 48.5 29.7 63.7 39 73.1L567 601.1C576.4 610.5 591.6 610.5 600.9 601.1C610.2 591.7 610.3 576.5 600.9 567.2L504.5 470.8C507.2 468.4 509.9 466 512.5 463.6C559.3 420.1 590.6 368.2 605.5 332.5C608.8 324.6 608.8 315.8 605.5 307.9C590.6 272.2 559.3 220.2 512.5 176.8C465.4 133.1 400.7 96.2 319.9 96.2C263.1 96.2 214.3 114.4 173.9 140.4L73 39.1zM236.5 202.7C260 185.9 288.9 176 320 176C399.5 176 464 240.5 464 320C464 351.1 454.1 379.9 437.3 403.5L402.6 368.8C415.3 347.4 419.6 321.1 412.7 295.1C399 243.9 346.3 213.5 295.1 227.2C286.5 229.5 278.4 232.9 271.1 237.2L236.4 202.5zM357.3 459.1C345.4 462.3 332.9 464 320 464C240.5 464 176 399.5 176 320C176 307.1 177.7 294.6 180.9 282.7L101.4 203.2C68.8 240 46.4 279 34.5 307.7C31.2 315.6 31.2 324.4 34.5 332.3C49.4 368 80.7 420 127.5 463.4C174.6 507.1 239.3 544 320.1 544C357.4 544 391.3 536.1 421.6 523.4L357.4 459.2z"
        fill="currentColor"
      />
    </svg>
  );
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      logo: logoPreview || initialData?.logo || "",
      name: name.trim(),
      description: description.trim() || undefined,
      country: country.trim(),
      website: website.trim() || undefined,
      type: type || undefined,
      departments: departments.map((d) => d.name),
      isMember, 
      email: email.trim().toLowerCase() || undefined,
      secondaryEmail: secondaryEmail.trim().toLowerCase() || undefined,
      password: password || undefined,
    };

    if (typeof onSubmit === "function") {
      await onSubmit({ payload, logoFile });
    } else {
      console.log("SUBMIT University payload ->", payload, logoFile);
      alert(
        "Form OK (see console). Wire up onSubmit to send it to the backend."
      );
    }
  };

  return (
    <form className="container" onSubmit={handleSubmit}>
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
          Your membership plan is <strong>active</strong>.
        </div>
      ) : (
        <div className="alert alert-danger" role="alert">
          Your membership plan is <strong>inactive</strong>.
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
              <div className="col-md-6">
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
              <div className="col-md-6">
                <label className="form-label">Website</label>
                <input
                  className={`form-control ${
                    errors.website ? "is-invalid" : ""
                  }`}
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="example.edu"
                />
                {errors.website && (
                  <div className="invalid-feedback">{errors.website}</div>
                )}
              </div>
            </div>

            <div className="mt-3">
              <label className="form-label">Institution type</label>
              <select
                className={`form-select ${errors.type ? "is-invalid" : ""}`}
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                <option value="">— Select Type —</option>
                <option value="public">Public</option>
                <option value="private">Private</option>
                <option value="hybrid">Hybrid</option>
              </select>
              {errors.type && (
                <div className="invalid-feedback">{errors.type}</div>
              )}
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
        <h5 className="mb-3">Departments</h5>
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

      <hr />

      <section className="mb-4">
        <h5 className="mb-3">Emails</h5>
        <div className="row g-3">
          <div className="col-md-6">
            <label className="form-label">Primary email</label>
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
            <label className="form-label">Secondary email</label>
            <input
              className={`form-control ${
                errors.secondaryEmail ? "is-invalid" : ""
              }`}
              type="email"
              value={secondaryEmail}
              onChange={(e) => setSecondaryEmail(e.target.value)}
              placeholder="contact@institution.edu"
            />
            {errors.secondaryEmail && (
              <div className="invalid-feedback">{errors.secondaryEmail}</div>
            )}
          </div>
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
