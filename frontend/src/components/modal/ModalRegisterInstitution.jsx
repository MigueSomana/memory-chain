import React, { useMemo, useState, useEffect, useRef } from "react";
import axios from "axios";
import { useToast } from "../../utils/toast";
import {
  CircleX,
  Eye,
  EyeOff,
  Loader,
  OctagonAlert,
  Check,
  Building2,
  MapPin,
  Mail,
  Lock,
  Wallet,
  ArrowLeft,
  UserRound,
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

const ModalRegisterInstitution = ({
  modalId = "registerInstitutionModal",
  loginModalId = "modalLogin",
  userRegisterModalId = "registerModal",
  onRegistered,
}) => {
  const { showToast } = useToast();

  // ✅ SOLO campos permitidos
  const [name, setName] = useState("");
  const [country, setCountry] = useState(""); // Address
  const [email, setEmail] = useState("");

  const [wallet, setWallet] = useState("");
  const [showWallet, setShowWallet] = useState(false);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [touched, setTouched] = useState({});
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const canSubmit = useMemo(() => !loading, [loading]);
  const pendingOpenRef = useRef(false);

  const resetAll = () => {
    setName("");
    setCountry("");
    setEmail("");
    setWallet("");
    setShowWallet(false);
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

    const nm = name.trim();
    const addr = country.trim();
    const em = email.trim().toLowerCase();
    const wlt = wallet.trim();
    const pwd = password || "";
    const conf = confirm || "";

    if (!nm && shouldShow("name")) e.name = "Institution name is required.";
    if (!addr && shouldShow("country")) e.country = "Country is required.";

    if (!em && shouldShow("email")) e.email = "Email is required.";
    else if (em && !EMAIL_RE.test(em) && shouldShow("email"))
      e.email = "Invalid email format.";

    if (!wlt && shouldShow("wallet"))
      e.wallet = "Wallet (private key) is required for institutions.";

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
  }, [name, country, email, wallet, password, confirm, touched]);

  const backToLogin = () => {
    if (loading) return;

    const instEl = document.getElementById(modalId);
    if (!instEl) return;

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

    const onHiddenOpen = () => {
      instEl.removeEventListener("hidden.bs.modal", onHiddenOpen);
      pendingOpenRef.current = false;
      showModal(loginModalId);
    };

    instEl.addEventListener("hidden.bs.modal", onHiddenOpen);

    const inst = window.bootstrap?.Modal?.getInstance(instEl);
    if (inst) inst.hide();
    else hideModal(modalId);
  };

  const backToUserRegister = () => {
    if (loading) return;

    const instEl = document.getElementById(modalId);
    if (!instEl) return;

    const userRegEl = document.getElementById(userRegisterModalId);
    if (!userRegEl) {
      showToast({
        message: `No encuentro el modal "${userRegisterModalId}" en el DOM. Asegúrate de renderizar <ModalRegister />.`,
        type: "error",
        icon: OctagonAlert,
        duration: 3000,
      });
      return;
    }

    if (pendingOpenRef.current) return;
    pendingOpenRef.current = true;

    const onHiddenOpen = () => {
      instEl.removeEventListener("hidden.bs.modal", onHiddenOpen);
      pendingOpenRef.current = false;
      showModal(userRegisterModalId);
    };

    instEl.addEventListener("hidden.bs.modal", onHiddenOpen);

    const inst = window.bootstrap?.Modal?.getInstance(instEl);
    if (inst) inst.hide();
    else hideModal(modalId);
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (loading) return;

    setTouched({
      name: true,
      country: true,
      email: true,
      wallet: true,
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
        description: "No description has been added yet.", // ✅ default, sin campo
        country: country.trim(),
        email: email.trim().toLowerCase(),
        password,
        wallet: wallet.trim(),
      };

      await axios.post(
        `${API_BASE_URL}/api/auth/register-institution`,
        payload,
      );

      showToast({
        message: "Institution created ✅",
        type: "success",
        icon: Check,
        duration: 1900,
      });

      onRegistered?.({ email: payload.email });

      // cerrar y abrir login
      const instEl = document.getElementById(modalId);
      if (instEl) {
        const onHiddenOpenLogin = () => {
          instEl.removeEventListener("hidden.bs.modal", onHiddenOpenLogin);
          showModal(loginModalId);
        };
        instEl.addEventListener("hidden.bs.modal", onHiddenOpenLogin);

        const inst = window.bootstrap?.Modal?.getInstance(instEl);
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
          "Institution registration failed. Please try again.",
        type: "error",
        icon: OctagonAlert,
        duration: 2600,
      });
    } finally {
      setLoading(false);
    }
  };

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
                {/* Hero centrado */}
                <div className="mcLoginHero">
                  <img src={Logo} alt="" width={300} />
                </div>

                {/* Institution name */}
                <div className="mcWizardField mx-4">
                  <label className="mcWizardLabel">Institution name</label>

                  <div
                    className={`mcLoginInputRow ${
                      hasErr("name") ? "is-invalid" : ""
                    }`}
                  >
                    <span className="mcLoginInputIcon" aria-hidden="true">
                      <Building2 size={18} />
                    </span>

                    <input
                      className="mcWizardInput mcLoginInput"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      onBlur={() => touch("name")}
                      disabled={loading}
                      placeholder="e.g., University of ..."
                      required
                    />
                  </div>

                  {hasErr("name") ? (
                    <div className="invalid-feedback d-block">
                      {errors.name}
                    </div>
                  ) : null}
                </div>

                {/* Address + Email (mitad y mitad) */}
                <div className="mcWizardGrid2 mt-3 mx-4">
                  {/* Address */}
                  <div className="mcWizardField">
                    <label className="mcWizardLabel">Country</label>

                    <div
                      className={`mcLoginInputRow ${
                        hasErr("country") ? "is-invalid" : ""
                      }`}
                    >
                      <span className="mcLoginInputIcon" aria-hidden="true">
                        <MapPin size={18} />
                      </span>

                      <input
                        className="mcWizardInput mcLoginInput"
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        onBlur={() => touch("country")}
                        disabled={loading}
                        placeholder="e.g., Caracas, Venezuela"
                        required
                      />
                    </div>

                    {hasErr("country") ? (
                      <div className="invalid-feedback d-block">
                        {errors.country}
                      </div>
                    ) : null}
                  </div>

                  {/* Email */}
                  <div className="mcWizardField">
                    <label className="mcWizardLabel">Institution email</label>

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
                        placeholder="admin@institution.edu"
                        required
                      />
                    </div>

                    {hasErr("email") ? (
                      <div className="invalid-feedback d-block">
                        {errors.email}
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Wallet */}
                <div className="mcWizardField mt-3 mx-4">
                  <label className="mcWizardLabel">Wallet (private key)</label>

                  <div
                    className={`mcLoginInputRow ${
                      hasErr("wallet") ? "is-invalid" : ""
                    }`}
                  >
                    <span className="mcLoginInputIcon" aria-hidden="true">
                      <Wallet size={18} />
                    </span>

                    <input
                      className="mcWizardInput mcLoginInput"
                      type={showWallet ? "text" : "password"}
                      value={wallet}
                      onChange={(e) => setWallet(e.target.value)}
                      onBlur={() => touch("wallet")}
                      disabled={loading}
                      placeholder="Paste the institution private key"
                      autoComplete="off"
                      spellCheck={false}
                      required
                    />

                    <button
                      type="button"
                      className="mcLoginEyeBtn"
                      onClick={() => setShowWallet((v) => !v)}
                      disabled={loading}
                      aria-label={showWallet ? "Hide wallet" : "Show wallet"}
                      title={showWallet ? "Hide wallet" : "Show wallet"}
                    >
                      {showWallet ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>

                  {hasErr("wallet") ? (
                    <div className="invalid-feedback d-block">
                      {errors.wallet}
                    </div>
                  ) : (
                    <div className="mcWizardMuted mt-2 d-flex align-items-center gap-2">
                      <Wallet size={14} />
                      Required to certify theses on-chain (do not share
                      publicly).
                    </div>
                  )}
                </div>

                {/* Password + Confirm (mitad y mitad, estilo login) */}
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
                        {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>

                    {hasErr("confirm") ? (
                      <div className="invalid-feedback d-block">
                        {errors.confirm}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="mx-4 mt-4 mb-3 d-flex flex-wrap align-items-center justify-content-between">
                  {/* IZQUIERDA */}
                  <button
                    type="button"
                    className="btn btn-outline-memory d-flex align-items-center gap-2"
                    onClick={backToLogin}
                    disabled={loading}
                  >
                    <ArrowLeft size={18} />
                    Back to login
                  </button>

                  {/* DERECHA */}
                  <div className="d-flex flex-wrap gap-2 ms-auto">
                    <button
                      type="button"
                      className="btn btn-outline-secondary d-flex align-items-center gap-2 pbtn-fix"
                      onClick={backToUserRegister}
                      disabled={loading}
                    >
                      <UserRound size={18} />
                      Register as user
                    </button>

                    <button
                      type="submit"
                      className="btn btn-memory d-flex align-items-center gap-2"
                      disabled={!canSubmit}
                      aria-busy={loading ? "true" : "false"}
                    >
                      <span className="mcBtnText">
                        {loading ? "Creating..." : "Create institution account"}
                      </span>
                      <span className="mcBtnIcon" aria-hidden="true">
                        {loading ? (
                          <Loader size={18} className="mcSpin" />
                        ) : (
                          <Building2 size={18} />
                        )}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </form>
            {/* sin footer */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModalRegisterInstitution;
