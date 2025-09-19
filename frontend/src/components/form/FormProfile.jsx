import React, { useMemo, useRef, useState } from "react";

const FormProfile = ({
  initialData,
  institutionOptions = [],
  onSubmit,
}) => {
  const [imgPreview, setImgPreview] = useState(initialData?.imgUrl || "");
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

  const [name, setName] = useState(initialData?.name || "");
  const [lastname, setLastname] = useState(initialData?.lastname || "");
  const [email, setEmail] = useState(initialData?.email || "");
  const [secondaryEmail, setSecondaryEmail] = useState(
    initialData?.secondaryEmail || ""
  );

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [selectedInstitutionId, setSelectedInstitutionId] = useState("");
  const [institutions, setInstitutions] = useState(
    initialData?.institutions || []
  );

  const remainingOptions = useMemo(() => {
    const selectedIds = new Set(institutions.map((i) => i._id));
    return institutionOptions.filter((opt) => !selectedIds.has(opt._id));
  }, [institutionOptions, institutions]);

  const addInstitution = () => {
    if (!selectedInstitutionId) return;
    const opt = institutionOptions.find((o) => o._id === selectedInstitutionId);
    if (!opt) return;
    setInstitutions((prev) =>
      prev.some((i) => i._id === opt._id) ? prev : [...prev, opt]
    );
    setSelectedInstitutionId("");
  };

  const removeInstitution = (id) => {
    setInstitutions((prev) => prev.filter((i) => i._id !== id));
  };

  const [errors, setErrors] = useState({});
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const validate = () => {
    const e = {};
    if (!name.trim()) e.name = "First name is required.";
    if (!lastname.trim()) e.lastname = "Last name is required.";
    if (!email.trim() || !EMAIL_RE.test(email)) {
      e.email = "Invalid primary email.";
    }
    if (secondaryEmail && !EMAIL_RE.test(secondaryEmail)) {
      e.secondaryEmail = "Invalid secondary email.";
    }
    if (password || confirm) {
      if (password.length < 8) e.password = "At least 8 characters.";
      if (password !== confirm) e.confirm = "Passwords do not match.";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;

    const payload = {
      imgUrl: imgPreview || initialData?.imgUrl || "",
      name: name.trim(),
      lastname: lastname.trim(),
      email: email.trim().toLowerCase(),
      secondaryEmail: secondaryEmail.trim().toLowerCase() || undefined,
      password: password || undefined,
      institutions: institutions.map((i) => i._id),
    };

    if (typeof onSubmit === "function") {
      await onSubmit({ payload, imgFile });
    } else {
      console.log("SUBMIT payload ->", payload);
      alert(
        "Form OK (see console). Wire up onSubmit to send it to the backend."
      );
    }
  };

  const EyeIcon = (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" width="18" height="18">
      <path d="M320 96C239.2 96 174.5 132.8 127.4 176.6C80.6 220.1 49.3 272 34.4 307.7C31.1 315.6 31.1 324.4 34.4 332.3C49.3 368 80.6 420 127.4 463.4C174.5 507.1 239.2 544 320 544C400.8 544 465.5 507.2 512.6 463.4C559.4 419.9 590.7 368 605.6 332.3C608.9 324.4 608.9 315.6 605.6 307.7C590.6 272 559.3 220 512.6 176.6C465.5 132.9 400.8 96 320 96zM176 320C176 240.5 240.5 176 320 176C399.5 176 464 240.5 464 320C464 399.5 399.5 464 320 464C240.5 464 176 399.5 176 320zM320 256C320 291.3 291.3 320 256 320C244.5 320 233.7 317 224.3 311.6C223.3 322.5 224.2 333.7 227.2 344.8C240.9 396 293.6 426.4 344.8 412.7C396 399 426.4 346.3 412.7 295.1C400.5 249.4 357.2 220.3 311.6 224.3C316.9 233.6 320 244.4 320 256z" />
    </svg>
  );

  const EyeSlashIcon = (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" width="18" height="18">
      <path d="M73 39.1C63.6 29.7 48.4 29.7 39.1 39.1C29.8 48.5 29.7 63.7 39 73.1L567 601.1C576.4 610.5 591.6 610.5 600.9 601.1C610.2 591.7 610.3 576.5 600.9 567.2L504.5 470.8C507.2 468.4 509.9 466 512.5 463.6C559.3 420.1 590.6 368.2 605.5 332.5C608.8 324.6 608.8 315.8 605.5 307.9C590.6 272.2 559.3 220.2 512.5 176.8C465.4 133.1 400.7 96.2 319.9 96.2C263.1 96.2 214.3 114.4 173.9 140.4L73 39.1zM236.5 202.7C260 185.9 288.9 176 320 176C399.5 176 464 240.5 464 320C464 351.1 454.1 379.9 437.3 403.5L402.6 368.8C415.3 347.4 419.6 321.1 412.7 295.1C399 243.9 346.3 213.5 295.1 227.2C286.5 229.5 278.4 232.9 271.1 237.2L236.4 202.5zM357.3 459.1C345.4 462.3 332.9 464 320 464C240.5 464 176 399.5 176 320C176 307.1 177.7 294.6 180.9 282.7L101.4 203.2C68.8 240 46.4 279 34.5 307.7C31.2 315.6 31.2 324.4 34.5 332.3C49.4 368 80.7 420 127.5 463.4C174.6 507.1 239.3 544 320.1 544C357.4 544 391.3 536.1 421.6 523.4L357.4 459.2z" />
    </svg>
  );

  return (
    <form className="container" onSubmit={handleSubmit}>
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
            <div className="mb-3">
              <label className="form-label">First name </label>
              <input
                className={`form-control ${errors.name ? "is-invalid" : ""}`}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your first name"
              />
              {errors.name && (
                <div className="invalid-feedback">{errors.name}</div>
              )}
            </div>
            <div>
              <label className="form-label">Last name </label>
              <input
                className={`form-control ${errors.lastname ? "is-invalid" : ""}`}
                value={lastname}
                onChange={(e) => setLastname(e.target.value)}
                placeholder="Your last name"
              />
              {errors.lastname && (
                <div className="invalid-feedback">{errors.lastname}</div>
              )}
            </div>
          </div>
        </div>
      </section>

      <hr />

      <section className="mb-4">
        <h5 className="mb-3">Emails</h5>
        <div className="row g-3">
          <div className="col-md-6">
            <label className="form-label">Primary email </label>
            <input
              className={`form-control ${errors.email ? "is-invalid" : ""}`}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@domain.com"
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
              placeholder="academic@university.edu"
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
                className={`form-control ${errors.password ? "is-invalid" : ""}`}
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
        <h5 className="mb-3">Institutions</h5>

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
        <div className="mt-3 d-flex flex-wrap gap-2">
          {institutions.length === 0 ? (
            <span className="text-muted">No institutions added.</span>
          ) : (
            institutions.map((inst) => (
              <span
                key={inst._id}
                className="badge text-bg-light d-flex align-items-center gap-2"
              >
                {inst.name}
                <button
                  type="button"
                  className="btn btn-sm btn-link text-danger p-0"
                  onClick={() => removeInstitution(inst._id)}
                  title="Remove"
                >
                  ×
                </button>
              </span>
            ))
          )}
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
