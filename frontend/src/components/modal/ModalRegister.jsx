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

const ModalRegister = ({
  modalId = "registerModal",
  loginModalId = "modalLogin",
  onRegistered,
}) => {
  // form fields
  const [name, setName] = useState("");
  const [lastname, setLastname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  // ui
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [touched, setTouched] = useState({});
  const [errors, setErrors] = useState({});
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const canSubmit = useMemo(() => !loading, [loading]);

  const resetAll = () => {
    setName("");
    setLastname("");
    setEmail("");
    setPassword("");
    setConfirm("");
    setShowPass(false);
    setShowConfirm(false);
    setTouched({});
    setErrors({});
    setErrorMsg("");
    setLoading(false);
  };

  // reset form when modal closes
  useEffect(() => {
    const el = document.getElementById(modalId);
    if (!el) return;

    const onHidden = () => resetAll();
    el.addEventListener("hidden.bs.modal", onHidden);
    return () => el.removeEventListener("hidden.bs.modal", onHidden);
  }, [modalId]);

  // live validation (like your profile form)
  const validate = (opts = { showAll: false }) => {
    const showAll = !!opts.showAll;
    const shouldShow = (k) => showAll || touched[k];

    const e = {};

    const n = name.trim();
    const ln = lastname.trim();
    const em = email.trim().toLowerCase();
    const pwd = password || "";
    const conf = confirm || "";

    if (!n && shouldShow("name")) e.name = "First name is required.";
    if (!ln && shouldShow("lastname")) e.lastname = "Last name is required.";

    if (!em && shouldShow("email")) e.email = "Email is required.";
    else if (em && !EMAIL_RE.test(em) && shouldShow("email")) e.email = "Invalid email format.";

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
    if (pwd && conf && pwd !== conf && shouldShow("confirm")) e.confirm = "Passwords do not match.";

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // revalidate while typing after touch
  useEffect(() => {
    validate({ showAll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, lastname, email, password, confirm, touched]);

  const touch = (k) => setTouched((p) => ({ ...p, [k]: true }));

  const backToLogin = () => {
    hideModal(modalId);
    setTimeout(() => showModal(loginModalId), 150);
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    setErrorMsg("");

    // show all errors on submit
    setTouched({
      name: true,
      lastname: true,
      email: true,
      password: true,
      confirm: true,
    });

    const ok = validate({ showAll: true });
    if (!ok) return;

    try {
      setLoading(true);

      const payload = {
        name: name.trim(),
        lastname: lastname.trim(),
        email: email.trim().toLowerCase(),
        password,
      };

      await axios.post(`${API_BASE_URL}/api/auth/register`, payload);

      onRegistered?.({ email: payload.email });

      hideModal(modalId);
      setTimeout(() => showModal(loginModalId), 150);
    } catch (err) {
      console.error(err);
      setErrorMsg(err?.response?.data?.message || "Registration failed. Please try again.");
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
      style={{ zIndex: 1099 }}
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
                  <h1 className="h3 mb-2 font-weight-normal mt-2">Create account</h1>
                  <p className="text-white-50 mb-0">Join MemoryChain and protect your research</p>
                </div>

                {errorMsg ? (
                  <div className="alert alert-danger mt-3" role="alert">
                    {errorMsg}
                  </div>
                ) : null}

                <form className="mt-4" onSubmit={handleSubmit} noValidate>
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label">First name</label>
                      <input
                        className={`form-control ${hasErr("name") ? "is-invalid" : ""}`}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onBlur={() => touch("name")}
                        disabled={loading}
                        placeholder="Your first name"
                        autoComplete="given-name"
                        required
                      />
                      {hasErr("name") ? <div className="invalid-feedback">{errors.name}</div> : null}
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">Last name</label>
                      <input
                        className={`form-control ${hasErr("lastname") ? "is-invalid" : ""}`}
                        value={lastname}
                        onChange={(e) => setLastname(e.target.value)}
                        onBlur={() => touch("lastname")}
                        disabled={loading}
                        placeholder="Your last name"
                        autoComplete="family-name"
                        required
                      />
                      {hasErr("lastname") ? (
                        <div className="invalid-feedback">{errors.lastname}</div>
                      ) : null}
                    </div>

                    <div className="col-12">
                      <label className="form-label">Email</label>
                      <input
                        type="email"
                        className={`form-control ${hasErr("email") ? "is-invalid" : ""}`}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onBlur={() => touch("email")}
                        disabled={loading}
                        placeholder="name@domain.com"
                        autoComplete="email"
                        required
                      />
                      {hasErr("email") ? <div className="invalid-feedback">{errors.email}</div> : null}
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="row g-3">
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
                  </div>

                  <div className="my-4 d-flex justify-content-center gap-3">
                    <button
                      type="submit"
                      className="btn btn-memory"
                      disabled={!canSubmit}
                      style={{ minWidth: 180 }}
                    >
                      {loading ? "Creating..." : "Create account"}
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

export default ModalRegister;
