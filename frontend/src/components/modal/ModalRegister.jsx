import React, { useMemo, useState, useEffect, useRef } from "react";
import axios from "axios";
import ModalRegisterInstitution from "./ModalRegisterInstitution";
import { useToast } from "../../utils/toast";
import {
  CircleX,
  UserPlus,
  Eye,
  EyeOff,
  Loader,
  OctagonAlert,
  Check,
  Mail,
  Lock,
  ArrowLeft,
  Building2,
  User,
} from "lucide-react";
import Logo from "../../assets/logo.png";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function showModal(id) {
  const el = document.getElementById(id);
  if (!el) return false;

  const anyOpen = document.querySelector(".modal.show");
  if (anyOpen && anyOpen.id !== id) {
    const openInst = window.bootstrap?.Modal?.getInstance(anyOpen);
    openInst?.hide();
  }

  const inst = window.bootstrap?.Modal?.getOrCreateInstance(el, {
    backdrop: "static",
    keyboard: false,
  });
  inst?.show();
  return true;
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
  institutionRegisterModalId = "registerInstitutionModal",
  onRegistered,
}) => {
  const { showToast } = useToast();

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
  const [loading, setLoading] = useState(false);

  const canSubmit = useMemo(() => !loading, [loading]);
  const pendingOpenRef = useRef(false);

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
    setLoading(false);
    pendingOpenRef.current = false;
  };

  useEffect(() => {
    const el = document.getElementById(modalId);
    if (!el) return;

    const onHidden = () => resetAll();
    el.addEventListener("hidden.bs.modal", onHidden);
    return () => el.removeEventListener("hidden.bs.modal", onHidden);
  }, [modalId]);

  const touch = (k) => setTouched((p) => ({ ...p, [k]: true }));
  const hasErr = (k) => !!errors[k];

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
    else if (em && !EMAIL_RE.test(em) && shouldShow("email"))
      e.email = "Invalid email format.";

    if (!pwd.trim() && shouldShow("password"))
      e.password = "Password is required.";
    else if (pwd.trim() && shouldShow("password")) {
      if (pwd.length < 8)
        e.password = "Password must be at least 8 characters long.";
      const hasUpper = /[A-Z]/.test(pwd);
      const hasLower = /[a-z]/.test(pwd);
      const hasDigit = /\d/.test(pwd);
      const hasSymbol = /[^A-Za-z0-9]/.test(pwd);
      if (!hasUpper || !hasLower || !hasDigit || !hasSymbol) {
        e.password =
          "Password must have uppercase, lowercase, a number and a symbol.";
      }
    }

    if (!conf.trim() && shouldShow("confirm"))
      e.confirm = "Please confirm your password.";
    if (pwd && conf && pwd !== conf && shouldShow("confirm"))
      e.confirm = "Passwords do not match.";

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  useEffect(() => {
    validate({ showAll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, lastname, email, password, confirm, touched]);

  const backToLogin = () => {
    if (loading) return;

    const regEl = document.getElementById(modalId);
    if (!regEl) return;

    const loginEl = document.getElementById(loginModalId);
    if (!loginEl) {
      showToast({
        message: `No encuentro el modal "${loginModalId}" en el DOM. Asegúrate de renderizar <ModalLogin />.`,
        type: "error",
        icon: OctagonAlert,
        duration: 3000,
      });
      return;
    }

    if (pendingOpenRef.current) return;
    pendingOpenRef.current = true;

    const onHiddenOpenLogin = () => {
      regEl.removeEventListener("hidden.bs.modal", onHiddenOpenLogin);
      pendingOpenRef.current = false;
      showModal(loginModalId);
    };

    regEl.addEventListener("hidden.bs.modal", onHiddenOpenLogin);

    const inst = window.bootstrap?.Modal?.getInstance(regEl);
    if (inst) inst.hide();
    else hideModal(modalId);
  };

  const openInstitutionRegister = () => {
    if (loading) return;

    const regEl = document.getElementById(modalId);
    if (!regEl) return;

    const instEl = document.getElementById(institutionRegisterModalId);
    if (!instEl) {
      showToast({
        message: `No encuentro el modal "${institutionRegisterModalId}" en el DOM. Asegúrate de renderizar <ModalRegisterInstitution />.`,
        type: "error",
        icon: OctagonAlert,
        duration: 3000,
      });
      return;
    }

    if (pendingOpenRef.current) return;
    pendingOpenRef.current = true;

    const onHiddenOpenInst = () => {
      regEl.removeEventListener("hidden.bs.modal", onHiddenOpenInst);
      pendingOpenRef.current = false;
      showModal(institutionRegisterModalId);
    };

    regEl.addEventListener("hidden.bs.modal", onHiddenOpenInst);

    const inst = window.bootstrap?.Modal?.getInstance(regEl);
    if (inst) inst.hide();
    else hideModal(modalId);
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (loading) return;

    setTouched({
      name: true,
      lastname: true,
      email: true,
      password: true,
      confirm: true,
    });

    const ok = validate({ showAll: true });
    if (!ok) {
      showToast({
        message: "Please fix the highlighted fields.",
        type: "error",
        icon: OctagonAlert,
        duration: 2200,
      });
      return;
    }

    try {
      setLoading(true);

      const payload = {
        name: name.trim(),
        lastname: lastname.trim(),
        email: email.trim().toLowerCase(),
        password,
      };

      await axios.post(`${API_BASE_URL}/api/auth/register`, payload);

      showToast({
        message: "Account created ✅",
        type: "success",
        icon: Check,
        duration: 1800,
      });

      onRegistered?.({ email: payload.email });

      const regEl = document.getElementById(modalId);
      if (regEl) {
        const onHiddenOpenLogin = () => {
          regEl.removeEventListener("hidden.bs.modal", onHiddenOpenLogin);
          showModal(loginModalId);
        };
        regEl.addEventListener("hidden.bs.modal", onHiddenOpenLogin);

        const inst = window.bootstrap?.Modal?.getInstance(regEl);
        if (inst) inst.hide();
        else hideModal(modalId);
      } else {
        setTimeout(() => showModal(loginModalId), 150);
      }
    } catch (err) {
      console.error(err);
      showToast({
        message:
          err?.response?.data?.message ||
          "Registration failed. Please try again.",
        type: "error",
        icon: OctagonAlert,
        duration: 2600,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
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
          <div className="modal-content mcSheetModal">
            <div className="mcPanelCard mcSheetPanel">
              {/* X arriba derecha */}
              <button
                type="button"
                className="mcLoginCloseBtn"
                onClick={() => hideModal(modalId)}
                disabled={loading}
                aria-label="Close"
                title="Close"
              >
                <CircleX size={22} />
              </button>

              <form onSubmit={handleSubmit} noValidate>
                <div className="mcPanelBody mcSheetBody">
                  {/* Hero */}
                  <div className="mcLoginHero">
                  <img src={Logo} alt="" width={300} />
                </div>

                  {/* ✅ Name + Lastname (con mx-4 igual que login) */}
                  <div className="mcWizardGrid2 mx-4">
                    <div className="mcWizardField">
                      <label className="mcWizardLabel">First name</label>

                      <div
                        className={`mcLoginInputRow ${
                          hasErr("name") ? "is-invalid" : ""
                        }`}
                      >
                        <span className="mcLoginInputIcon" aria-hidden="true">
                          <User size={18} />
                        </span>

                        <input
                          className="mcWizardInput mcLoginInput"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          onBlur={() => touch("name")}
                          disabled={loading}
                          placeholder="Your first name"
                          autoComplete="given-name"
                          required
                        />
                      </div>

                      {hasErr("name") ? (
                        <div className="invalid-feedback d-block">
                          {errors.name}
                        </div>
                      ) : null}
                    </div>

                    <div className="mcWizardField">
                      <label className="mcWizardLabel">Last name</label>

                      <div
                        className={`mcLoginInputRow ${
                          hasErr("lastname") ? "is-invalid" : ""
                        }`}
                      >
                        <span className="mcLoginInputIcon" aria-hidden="true">
                          <User size={18} />
                        </span>

                        <input
                          className="mcWizardInput mcLoginInput"
                          value={lastname}
                          onChange={(e) => setLastname(e.target.value)}
                          onBlur={() => touch("lastname")}
                          disabled={loading}
                          placeholder="Your last name"
                          autoComplete="family-name"
                          required
                        />
                      </div>

                      {hasErr("lastname") ? (
                        <div className="invalid-feedback d-block">
                          {errors.lastname}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {/* ✅ Email (con mx-4 igual que login) */}
                  <div className="mcWizardField mt-3 mx-4">
                    <label className="mcWizardLabel">Email Address</label>
                    <div
                      className={`mcLoginInputRow ${
                        hasErr("email") ? "is-invalid" : ""
                      }`}
                    >
                      <span className="mcLoginInputIcon" aria-hidden="true">
                        <Mail size={18} />
                      </span>

                      <input
                        type="email"
                        className="mcWizardInput mcLoginInput"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onBlur={() => touch("email")}
                        disabled={loading}
                        placeholder="you@institution.edu"
                        autoComplete="email"
                        required
                      />
                    </div>

                    {hasErr("email") ? (
                      <div className="invalid-feedback d-block">
                        {errors.email}
                      </div>
                    ) : null}
                  </div>

                  {/* ✅ Passwords (con mx-4 igual que login) */}
                  <div className="mcWizardGrid2 mt-3 mx-4">
                    <div className="mcWizardField">
                      <label className="mcWizardLabel">Password</label>

                      <div
                        className={`mcLoginInputRow ${
                          hasErr("password") ? "is-invalid" : ""
                        }`}
                      >
                        <span className="mcLoginInputIcon" aria-hidden="true">
                          <Lock size={18} />
                        </span>

                        <input
                          className="mcWizardInput mcLoginInput"
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
                          className="mcLoginEyeBtn"
                          onClick={() => setShowPass((v) => !v)}
                          disabled={loading}
                          aria-label={
                            showPass ? "Hide password" : "Show password"
                          }
                          title={showPass ? "Hide password" : "Show password"}
                        >
                          {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>

                      {hasErr("password") ? (
                        <div className="invalid-feedback d-block">
                          {errors.password}
                        </div>
                      ) : null}
                    </div>

                    <div className="mcWizardField">
                      <label className="mcWizardLabel">Confirm password</label>

                      <div
                        className={`mcLoginInputRow ${
                          hasErr("confirm") ? "is-invalid" : ""
                        }`}
                      >
                        <span className="mcLoginInputIcon" aria-hidden="true">
                          <Lock size={18} />
                        </span>

                        <input
                          className="mcWizardInput mcLoginInput"
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
                          className="mcLoginEyeBtn"
                          onClick={() => setShowConfirm((v) => !v)}
                          disabled={loading}
                          aria-label={
                            showConfirm ? "Hide password" : "Show password"
                          }
                          title={showConfirm ? "Hide password" : "Show password"}
                        >
                          {showConfirm ? (
                            <EyeOff size={18} />
                          ) : (
                            <Eye size={18} />
                          )}
                        </button>
                      </div>

                      {hasErr("confirm") ? (
                        <div className="invalid-feedback d-block">
                          {errors.confirm}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {/* ✅ Buttons: Back a la izquierda, los otros dos a la derecha */}
                  <div className="mx-4 mt-4 mb-3 d-flex flex-wrap align-items-center justify-content-between">
                    <button
                      type="button"
                      className="btn btn-outline-memory d-flex align-items-center gap-2"
                      onClick={backToLogin}
                      disabled={loading}
                      title="Back to login"
                    >
                      <ArrowLeft size={18} />
                      Back to login
                    </button>

                    <div className="d-flex flex-wrap gap-2 ms-auto ">
                      <button
                        type="button"
                        className="btn btn-outline-secondary pbtn-fix d-flex align-items-center gap-2"
                        onClick={openInstitutionRegister}
                        disabled={loading}
                        title="Register Institution"
                      >
                        <Building2 size={18} />
                        Register Institution
                      </button>

                      <button
                        type="submit"
                        className="btn btn-memory d-flex align-items-center gap-2"
                        disabled={!canSubmit}
                        aria-busy={loading ? "true" : "false"}
                        title={loading ? "Creating..." : "Create account"}
                      >
                        <span className="mcBtnText">
                          {loading ? "Creating..." : "Create account"}
                        </span>
                        <span className="mcBtnIcon" aria-hidden="true">
                          {loading ? (
                            <Loader size={18} className="mcSpin" />
                          ) : (
                            <UserPlus size={18} />
                          )}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      <ModalRegisterInstitution
        modalId={institutionRegisterModalId}
        userRegisterModalId={modalId}
      />
    </>
  );
};

export default ModalRegister;