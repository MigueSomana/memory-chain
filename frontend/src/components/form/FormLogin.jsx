import React, { useEffect, useState } from "react";
import axios from "axios";
import logo from "../../assets/logo.png";
import { EyeIcon, EyeSlashIcon } from "../../utils/icons";
import { saveAuthSession } from "../../utils/authSession";

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

  // cuando te registras, prefillEmail cambia
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
    // cierra login, abre register
    hideModal(loginModalId);
    setTimeout(() => showModal(registerModalId), 150);
  };

  return (
    <div className="container fix-form-modal">
      <form className="form-signin" onSubmit={handleSubmit}>
        <div className="text-center spaced-fix">
          <img src={logo} alt="Logo" height="70px" />
          <p className="my-4">
            Protect your research with the world's most secure decentralized
            library
          </p>
        </div>

        {errorMsg && (
          <div className="alert alert-danger mt-2" role="alert">
            {errorMsg}
          </div>
        )}

        <div className="form-label-group">
          <label htmlFor="inputEmail">Email address</label>
          <input
            type="email"
            id="inputEmail"
            className="form-control"
            placeholder="Email address"
            required
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />
        </div>

        <div className="form-label-group mt-3">
          <label htmlFor="inputPassword">Password</label>
          <div className="input-group">
            <input
              type={showPass ? "text" : "password"}
              id="inputPassword"
              className="form-control"
              placeholder="Password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
            <button
              type="button"
              className="btn password-toggle-btn-login d-flex align-items-center"
              onClick={() => setShowPass((v) => !v)}
              tabIndex={-1}
              disabled={loading}
            >
              {showPass ? EyeSlashIcon : EyeIcon}
            </button>
          </div>
        </div>

        <div className="mb-3 mt-3 form-check">
          <input
            id="rememberMe"
            className="form-check-input mc-check"
            type="checkbox"
            disabled={loading}
          />
          <label htmlFor="rememberMe" className="form-check-label">
            Remember me
          </label>
        </div>

        <div className="row">
          <button
            type="submit"
            className="btn btn-memory px-4 gap-3 my-1"
            disabled={loading}
          >
            {loading ? "Logging in..." : "Log in"}
          </button>

          <button
            type="button"
            className="btn btn-outline-memory px-4 my-2"
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
