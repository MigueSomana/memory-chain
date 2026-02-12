import React, { useEffect, useState } from "react";
import axios from "axios";
import { EyeIcon, EyeSlashIcon } from "../../utils/icons";
import { saveAuthSession } from "../../utils/authSession";
import { Blocks, Mail, Lock, Github } from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

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

const FormLogin = ({ loginModalId, registerModalId, prefillEmail }) => {
  const [email, setEmail] = useState(prefillEmail || "");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (prefillEmail) setEmail(prefillEmail);
  }, [prefillEmail]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);

    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/login`, {
        email,
        password,
      });

      const { token, user, institution } = response.data;

      if (user) {
        saveAuthSession({
          token,
          role: user.role,
          actor: "user",
          user,
        });
        window.location.href = "/dashboard-personal";
        return;
      }

      if (institution) {
        saveAuthSession({
          token,
          role: institution.role || "INSTITUTION",
          actor: "institution",
          institution,
        });
        window.location.href = "/dashboard-institution";
        return;
      }

      setErrorMsg("Respuesta de login inválida.");
    } catch (error) {
      console.error(error);
      setErrorMsg(
        error.response?.data?.message ||
          "Login no exitoso. Verifica tus credenciales."
      );
    } finally {
      setLoading(false);
    }
  };

  const openRegister = () => {
    hideModal(loginModalId);
    setTimeout(() => showModal(registerModalId), 150);
  };

  const oauthDemo = (provider) => {
    alert(`${provider} login (demo)`);
  };

  return (
    <div className="mcLoginWrap">
      {/* ICON + TITLES */}
      <div className="mcLoginBrand">
        <div className="mcLoginBrandIcon" aria-hidden="true">
          <Blocks size={22} />
        </div>

        <div className="mcLoginBrandTitle">Memory-Chain</div>
        <div className="mcLoginBrandSub">
          Welcome back to academic verification
        </div>
      </div>

      {/* OAUTH BUTTONS */}
      <div className="mcLoginProviders">
        <button
          type="button"
          className="mcProviderBtn"
          onClick={() => oauthDemo("Google")}
          disabled={loading}
        >
          <span className="mcProviderMark" aria-hidden="true">
            G
          </span>
          <span className="mcProviderText">Google</span>
        </button>

        <button
          type="button"
          className="mcProviderBtn"
          onClick={() => oauthDemo("GitHub")}
          disabled={loading}
        >
          <span className="mcProviderIcon" aria-hidden="true">
            <Github size={18} />
          </span>
          <span className="mcProviderText">GitHub</span>
        </button>
      </div>

      {/* DIVIDER */}
      <div className="mcLoginDivider">
        <span className="mcLoginDividerLine" />
        <span className="mcLoginDividerText">OR CONTINUE WITH EMAIL</span>
        <span className="mcLoginDividerLine" />
      </div>

      {errorMsg && (
        <div className="mcLoginAlert" role="alert">
          {errorMsg}
        </div>
      )}

      {/* FORM */}
      <form onSubmit={handleSubmit} className="mcLoginForm" autoComplete="on">
        {/* Email */}
        <label className="mcLoginLabel" htmlFor="inputEmail">
          Email Address
        </label>
        <div className="mcLoginField">
          <span className="mcLoginFieldIcon" aria-hidden="true">
            <Mail size={18} />
          </span>
          <input
            id="inputEmail"
            type="email"
            className="mcLoginInput"
            placeholder="you@institution.edu"
            required
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />
        </div>

        {/* Password header row */}
        <div className="mcLoginRowBetween">
          <label className="mcLoginLabel" htmlFor="inputPassword">
            Password
          </label>

          <button
            type="button"
            className="mcLoginLink"
            onClick={() => alert("Forgot password (demo)")}
            disabled={loading}
          >
            Forgot password?
          </button>
        </div>

        {/* Password */}
        <div className="mcLoginField">
          <span className="mcLoginFieldIcon" aria-hidden="true">
            <Lock size={18} />
          </span>

          <input
            id="inputPassword"
            type={showPass ? "text" : "password"}
            className="mcLoginInput"
            placeholder="••••••••"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
          />

          <button
            type="button"
            className="mcLoginEyeBtn"
            onClick={() => setShowPass((v) => !v)}
            tabIndex={-1}
            disabled={loading}
            aria-label={showPass ? "Hide password" : "Show password"}
            title={showPass ? "Hide password" : "Show password"}
          >
            {showPass ? EyeSlashIcon : EyeIcon}
          </button>
        </div>

        {/* Primary button */}
        <button
          type="submit"
          className="mcLoginSubmit"
          disabled={loading}
        >
          <span className="mcLoginSubmitText">
            {loading ? "Signing In..." : "Sign In"}
          </span>
          <span className="mcLoginSubmitArrow" aria-hidden="true">
            →
          </span>
        </button>

        {/* footer */}
        <div className="mcLoginFooter">
          <span className="mcLoginFooterMuted">Don't have an account?</span>{" "}
          <button
            type="button"
            className="mcLoginFooterLink"
            onClick={openRegister}
            disabled={loading}
          >
            Sign up
          </button>
        </div>
      </form>
    </div>
  );
};

export default FormLogin;