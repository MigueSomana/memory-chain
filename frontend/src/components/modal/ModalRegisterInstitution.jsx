import React, { useMemo, useState, useEffect } from "react";
import axios from "axios";
import { EyeIcon, EyeSlashIcon } from "../../utils/icons";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function showModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const inst = window.bootstrap?.Modal?.getOrCreateInstance(el, {
    backdrop: "static",
    keyboard: false,
  });
  inst?.show();
}

function hideModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const inst = window.bootstrap?.Modal?.getInstance(el);
  inst?.hide();
}

const ModalRegisterInstitution = ({
  modalId = "registerInstitutionModal",
  loginModalId = "modalLogin",
  userRegisterModalId = "registerModal",
  onRegistered,
}) => {
  // Fields institution
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [country, setCountry] = useState("");
  const [website, setWebsite] = useState("");
  const [email, setEmail] = useState("");

  const [type, setType] = useState("UNIVERSITY");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  // Optional: domains (comma separated)
  const [emailDomains, setEmailDomains] = useState("");

  // UI
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [touched, setTouched] = useState({});
  const [errors, setErrors] = useState({});
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const canSubmit = useMemo(() => !loading, [loading]);

  const resetAll = () => {
    setName("");
    setDescription("");
    setCountry("");
    setWebsite("");
    setEmail("");
    setType("UNIVERSITY");
    setPassword("");
    setConfirm("");
    setEmailDomains("");
    setShowPass(false);
    setShowConfirm(false);
    setTouched({});
    setErrors({});
    setErrorMsg("");
    setLoading(false);
  };

  useEffect(() => {
    const el = document.getElementById(modalId);
    if (!el) return;

    const onHidden = () => resetAll();
    el.addEventListener("hidden.bs.modal", onHidden);
    return () => el.removeEventListener("hidden.bs.modal", onHidden);
  }, [modalId]);

  const touch = (k) => setTouched((p) => ({ ...p, [k]: true }));

  const validate = (opts = { showAll: false }) => {
    const showAll = !!opts.showAll;
    const shouldShow = (k) => showAll || touched[k];

    const e = {};

    const nm = name.trim();
    const desc = description.trim();
    const ctry = country.trim();
    const em = email.trim().toLowerCase();
    const pwd = password || "";
    const conf = confirm || "";

    if (!nm && shouldShow("name")) e.name = "Institution name is required.";
    if (!desc && shouldShow("description")) e.description = "Description is required.";
    if (!ctry && shouldShow("country")) e.country = "Country is required.";

    if (!em && shouldShow("email")) e.email = "Email is required.";
    else if (em && !EMAIL_RE.test(em) && shouldShow("email"))
      e.email = "Invalid email format.";

    if (!pwd.trim() && shouldShow("password")) e.password = "Password is required.";
    else if (pwd.trim() && shouldShow("password")) {
      if (pwd.length < 8) e.password = "Password must be at least 8 characters long.";
      const hasUpper = /[A-Z]/.test(pwd);
      const hasLower = /[a-z]/.test(pwd);
      const hasDigit = /\d/.test(pwd);
      const hasSymbol = /[^A-Za-z0-9]/.test(pwd);
      if (!hasUpper || !hasLower || !hasDigit || !hasSymbol) {
        e.password = "Password must have uppercase, lowercase, a number and a symbol.";
      }
    }

    if (!conf.trim() && shouldShow("confirm")) e.confirm = "Please confirm your password.";
    if (pwd && conf && pwd !== conf && shouldShow("confirm"))
      e.confirm = "Passwords do not match.";

    // website optional, pero si lo llenan valida mínimo
    const w = website.trim();
    if (w && shouldShow("website")) {
      const okUrl = /^https?:\/\/.+/i.test(w) || /^[\w.-]+\.[a-z]{2,}/i.test(w);
      if (!okUrl) e.website = "Website looks invalid (try https://example.com).";
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  useEffect(() => {
    validate({ showAll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    name,
    description,
    country,
    website,
    email,
    type,
    emailDomains,
    password,
    confirm,
    touched,
  ]);

  const backToLogin = () => {
    hideModal(modalId);
    setTimeout(() => showModal(loginModalId), 150);
  };

  const backToUserRegister = () => {
    hideModal(modalId);
    setTimeout(() => showModal(userRegisterModalId), 150);
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    setErrorMsg("");

    setTouched({
      name: true,
      description: true,
      country: true,
      website: true,
      email: true,
      password: true,
      confirm: true,
      emailDomains: true,
    });

    const ok = validate({ showAll: true });
    if (!ok) return;

    try {
      setLoading(true);

      const domainsArr = emailDomains
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const payload = {
        name: name.trim(),
        description: description.trim(),
        country: country.trim(),
        website: website.trim() || undefined,
        email: email.trim().toLowerCase(),
        password,
        type, // "UNIVERSITY" etc
        emailDomains: domainsArr.length ? domainsArr : undefined,
        // logo, isMember, canVerify NO se envían -> controller usa defaults
      };

      await axios.post(`${API_BASE_URL}/api/auth/registerinst`, payload);

      onRegistered?.({ email: payload.email });

      hideModal(modalId);
      setTimeout(() => showModal(loginModalId), 150);
    } catch (err) {
      console.error(err);
      setErrorMsg(
        err?.response?.data?.message || "Institution registration failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const hasErr = (k) => !!errors[k];

  return (
    <div
      className="modal fade"
      id={modalId}
      tabIndex={-1}
      aria-hidden="true"
      data-bs-backdrop="static"
      data-bs-keyboard="false"
      style={{ zIndex: 1100 }}
    >
      <div className="modal-dialog modal-lg modal-dialog-centered">
        <div className="modal-content bg-mc-dark text-white">
          <div className="modal-body container">
            <div className="row">
              <div className="button-close-modal-fix">
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  data-bs-dismiss="modal"
                  aria-label="Close"
                  disabled={loading}
                />
              </div>

              <div className="col-12 px-5">
                <div className="text-center spaced-fix">
                  <h1 className="h3 mb-2 font-weight-normal mt-2">
                    Register institution
                  </h1>
                  <p className="text-white-50 mb-0">
                    Create your institution account to publish and verify theses
                  </p>
                </div>

                {errorMsg ? (
                  <div className="alert alert-danger mt-3" role="alert">
                    {errorMsg}
                  </div>
                ) : null}

                <form className="mt-4" onSubmit={handleSubmit} noValidate>
                  <div className="row g-3">
                    <div className="col-12">
                      <label className="form-label">Institution name</label>
                      <input
                        className={`form-control ${hasErr("name") ? "is-invalid" : ""}`}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onBlur={() => touch("name")}
                        disabled={loading}
                        placeholder="e.g., University of ..."
                        required
                      />
                      {hasErr("name") ? (
                        <div className="invalid-feedback">{errors.name}</div>
                      ) : null}
                    </div>

                    <div className="col-12">
                      <label className="form-label">Description</label>
                      <textarea
                        className={`form-control ${hasErr("description") ? "is-invalid" : ""}`}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        onBlur={() => touch("description")}
                        disabled={loading}
                        rows={3}
                        placeholder="Short description of the institution"
                        required
                      />
                      {hasErr("description") ? (
                        <div className="invalid-feedback">{errors.description}</div>
                      ) : null}
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">Adress</label>
                      <input
                        className={`form-control ${hasErr("country") ? "is-invalid" : ""}`}
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        onBlur={() => touch("country")}
                        disabled={loading}
                        placeholder="e.g., United States"
                        required
                      />
                      {hasErr("country") ? (
                        <div className="invalid-feedback">{errors.country}</div>
                      ) : null}
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">Institution email</label>
                      <input
                        type="email"
                        className={`form-control ${hasErr("email") ? "is-invalid" : ""}`}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onBlur={() => touch("email")}
                        disabled={loading}
                        placeholder="admin@institution.edu"
                        required
                      />
                      {hasErr("email") ? (
                        <div className="invalid-feedback">{errors.email}</div>
                      ) : null}
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">Password</label>
                      <div className="input-group">
                        <input
                          className={`form-control ${hasErr("password") ? "is-invalid" : ""}`}
                          type={showPass ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          onBlur={() => touch("password")}
                          disabled={loading}
                          placeholder="At least 8 characters"
                          autoComplete="new-password"
                          required
                        />
                        <button
                          type="button"
                          className="btn password-toggle-btn-login d-flex align-items-center"
                          onClick={() => setShowPass((v) => !v)}
                          tabIndex={-1}
                          disabled={loading}
                          aria-label={showPass ? "Hide password" : "Show password"}
                          title={showPass ? "Hide password" : "Show password"}
                        >
                          {showPass ? EyeSlashIcon : EyeIcon}
                        </button>
                      </div>
                      {hasErr("password") ? (
                        <div className="invalid-feedback d-block">{errors.password}</div>
                      ) : null}
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">Confirm password</label>
                      <div className="input-group">
                        <input
                          className={`form-control ${hasErr("confirm") ? "is-invalid" : ""}`}
                          type={showConfirm ? "text" : "password"}
                          value={confirm}
                          onChange={(e) => setConfirm(e.target.value)}
                          onBlur={() => touch("confirm")}
                          disabled={loading}
                          placeholder="Repeat the password"
                          autoComplete="new-password"
                          required
                        />
                        <button
                          type="button"
                          className="btn password-toggle-btn-login d-flex align-items-center"
                          onClick={() => setShowConfirm((v) => !v)}
                          tabIndex={-1}
                          disabled={loading}
                          aria-label={showConfirm ? "Hide password" : "Show password"}
                          title={showConfirm ? "Hide password" : "Show password"}
                        >
                          {showConfirm ? EyeSlashIcon : EyeIcon}
                        </button>
                      </div>
                      {hasErr("confirm") ? (
                        <div className="invalid-feedback d-block">{errors.confirm}</div>
                      ) : null}
                    </div>
                  </div>

                  <div className="my-4 d-flex justify-content-center gap-3 flex-wrap">
                    <button
                      type="submit"
                      className="btn btn-memory"
                      disabled={!canSubmit}
                      style={{ minWidth: 220 }}
                    >
                      {loading ? "Creating..." : "Create institution account"}
                    </button>

                    <button
                      type="button"
                      className="btn btn-outline-memory"
                      onClick={backToLogin}
                      disabled={loading}
                      style={{ minWidth: 180 }}
                    >
                      Back to login
                    </button>

                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={backToUserRegister}
                      disabled={loading}
                      style={{ minWidth: 220 }}
                    >
                      Register as user
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModalRegisterInstitution;
