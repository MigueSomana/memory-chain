import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { saveAuthSession, touchAuthSession } from "../../utils/authSession";
import { useToast } from "../../utils/toast";
import {
  Mail,
  Lock,
  CircleX,
  LogIn,
  Loader,
  Eye,
  EyeOff,
  OctagonAlert,
  CheckCircle2,
} from "lucide-react";
import Logo from "../../assets/logo.png";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

function showModal(id) {
  const el = document.getElementById(id);
  if (!el) return false;
  const inst = window.bootstrap?.Modal?.getOrCreateInstance(el, {
    backdrop: "static",
    keyboard: false,
  });
  inst?.show();
  return true;
}

function hideModal(id) {
  const el = document.getElementById(id);
  if (!el) return false;
  const inst = window.bootstrap?.Modal?.getInstance(el);
  if (inst) {
    inst.hide();
    return true;
  }
  return false;
}

const ModalLogin = ({
  modalId = "modalLogin",
  registerModalId = "registerModal",
  prefillEmail,
}) => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [email, setEmail] = useState(prefillEmail || "");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const canSubmit = useMemo(() => !loading, [loading]);

  // 🔒 evita múltiples listeners si el user hace spam click
  const pendingOpenRef = useRef(false);
  const pendingNavRef = useRef(false);

  useEffect(() => {
    if (prefillEmail) setEmail(prefillEmail);
  }, [prefillEmail]);

  // reset al cerrar
  useEffect(() => {
    const el = document.getElementById(modalId);
    if (!el) return;

    const onHidden = () => {
      // ojo: no resetees loading si ya estamos navegando
      if (!pendingNavRef.current) {
        setEmail(prefillEmail || "");
        setPassword("");
        setShowPass(false);
        setLoading(false);
      }
    };

    el.addEventListener("hidden.bs.modal", onHidden);
    return () => el.removeEventListener("hidden.bs.modal", onHidden);
  }, [modalId, prefillEmail]);

  // ✅ FIX: cerrar login -> cuando hidden.bs.modal ocurra -> abrir register
  const openRegister = () => {
    if (loading) return;

    const loginEl = document.getElementById(modalId);
    if (!loginEl) return;

    const regEl = document.getElementById(registerModalId);
    if (!regEl) {
      showToast({
        message: `No encuentro el modal "${registerModalId}" en el DOM. Asegúrate de renderizar <ModalRegister /> en esta vista.`,
        type: "error",
        icon: OctagonAlert,
        duration: 3000,
      });
      return;
    }

    if (pendingOpenRef.current) return;
    pendingOpenRef.current = true;

    const onHiddenOpenRegister = () => {
      loginEl.removeEventListener("hidden.bs.modal", onHiddenOpenRegister);
      pendingOpenRef.current = false;

      const ok = showModal(registerModalId);
      if (!ok) {
        showToast({
          message: "No pude abrir Register. Revisa el id del modal.",
          type: "error",
          icon: OctagonAlert,
          duration: 2400,
        });
      }
    };

    loginEl.addEventListener("hidden.bs.modal", onHiddenOpenRegister);

    const inst = window.bootstrap?.Modal?.getInstance(loginEl);
    if (inst) inst.hide();
    else hideModal(modalId);
  };

  // ✅ Navegación fluida: cierra modal -> al cerrar navega (sin refresh)
  const closeThenNavigate = (to) => {
    const loginEl = document.getElementById(modalId);

    // si no está el modal por alguna razón, navega directo
    if (!loginEl) {
      navigate(to, { replace: true });
      return;
    }

    if (pendingNavRef.current) return;
    pendingNavRef.current = true;

    const onHiddenNav = () => {
      loginEl.removeEventListener("hidden.bs.modal", onHiddenNav);
      pendingNavRef.current = false;
      navigate(to, { replace: true });
    };

    loginEl.addEventListener("hidden.bs.modal", onHiddenNav);

    const inst = window.bootstrap?.Modal?.getInstance(loginEl);
    if (inst) inst.hide();
    else hideModal(modalId);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);

    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/login`, {
        email,
        password,
      });

      const { token, user, institution } = response.data || {};

      if (user && token) {
        saveAuthSession({ token, role: user.role, actor: "user", user });
        touchAuthSession(); // ✅ extra safety: arranca contador ya mismo

        showToast({
          message: `Welcome back, ${user?.name || "User"} ✅`,
          type: "success",
          icon: CheckCircle2,
          duration: 1400,
        });

        closeThenNavigate("/dashboard-personal");
        return;
      }

      if (institution && token) {
        saveAuthSession({
          token,
          role: institution.role || "INSTITUTION",
          actor: "institution",
          institution,
        });
        touchAuthSession(); // ✅ extra safety

        showToast({
          message: `Welcome back, ${institution?.name || "Institution"} ✅`,
          type: "success",
          icon: CheckCircle2,
          duration: 1400,
        });

        closeThenNavigate("/dashboard-institution");
        return;
      }

      showToast({
        message: "Respuesta de login inválida.",
        type: "error",
        icon: OctagonAlert,
        duration: 2200,
      });
      setLoading(false);
    } catch (error) {
      console.error(error);
      showToast({
        message:
          error.response?.data?.message ||
          "Login no exitoso. Verifica tus credenciales.",
        type: "error",
        icon: OctagonAlert,
        duration: 2400,
      });
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
      style={{ zIndex: 1098 }}
    >
      <div className="modal-dialog modal-xs modal-dialog-centered">
        <div className="modal-content mcSheetModal">
          <div className="mcPanelCard mcSheetPanel">
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
                <div className="mcLoginHero">
                  <img src={Logo} alt="" width={300} />
                </div>

                <div className="mcWizardField mx-4">
                  <label className="mcWizardLabel">Email Address</label>
                  <div className="mcLoginInputRow">
                    <span className="mcLoginInputIcon" aria-hidden="true">
                      <Mail size={18} />
                    </span>
                    <input
                      type="email"
                      className="mcWizardInput mcLoginInput"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={loading}
                      placeholder="you@institution.edu"
                      autoComplete="email"
                      required
                    />
                  </div>
                </div>

                <div className="mcWizardField mt-3 mx-4">
                  <label className="mcWizardLabel">Password</label>
                  <div className="mcLoginInputRow">
                    <span className="mcLoginInputIcon" aria-hidden="true">
                      <Lock size={18} />
                    </span>

                    <input
                      className="mcWizardInput mcLoginInput"
                      type={showPass ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loading}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      required
                    />

                    <button
                      type="button"
                      className="mcLoginEyeBtn"
                      onClick={() => setShowPass((v) => !v)}
                      disabled={loading}
                      aria-label={showPass ? "Hide password" : "Show password"}
                      title={showPass ? "Hide password" : "Show password"}
                    >
                      {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="mx-4 mt-3 d-flex justify-content-center">
                  <button
                    type="submit"
                    className="btn btn-memory mcLoginPrimaryBtn"
                    disabled={!canSubmit}
                    aria-busy={loading ? "true" : "false"}
                  >
                    <span className="mcBtnText mx-2">
                      {loading ? "Signing In..." : "Sign In"}
                    </span>
                    <span className="mcBtnIcon" aria-hidden="true">
                      {loading ? (
                        <Loader size={18} className="mcSpin" />
                      ) : (
                        <LogIn size={18} />
                      )}
                    </span>
                  </button>
                </div>

                <div className="mcLoginBottomLine">
                  <span className="mcLoginBottomMuted">
                    Don't have an account?
                  </span>
                  <button
                    type="button"
                    className="mcLoginBottomLink"
                    onClick={openRegister}
                    disabled={loading}
                  >
                    Sign up
                  </button>
                </div>
              </div>
            </form>
            {/* /form */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModalLogin;