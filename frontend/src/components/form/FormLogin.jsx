import React, { useState } from "react";
import axios from "axios";
import isologo from "../../assets/isologo.png";
import { EyeIcon, EyeSlashIcon } from "../../utils/icons";
import { saveAuthSession } from "../../utils/authSession"; // ⬅️ importa el helper TS compilado

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

const FormLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);

    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/login`, {
        email,
        password,
      });

      // Ajusta según tu backend
      const { token, user, institution } = response.data;

      // Determinar quién se logueó y cuál es su rol
      if (user) {
        const role = user.role; // aquí entra el role del nuevo modelo
        // Guarda token + rol + user en localStorage
        saveAuthSession({
          token,
          role,
          actor: "user",
          user,
        });

        // Redirección según rol de persona
        if (role === "REGULAR" || role === "STUDENT") {
          window.location.href = "/dashboardP";
        } else {
          // si tienes otros roles (ADMIN, etc.), puedes tratarlos aquí
          window.location.href = "/dashboardP";
        }

        console.log("Login user exitoso ✅", token, role);
      } else if (institution) {
        // Para instituciones: rol puede venir del backend o lo fijamos
        const role = institution.role || "INSTITUTION";

        saveAuthSession({
          token,
          role,
          actor: "institution",
          institution,
        });

        // Mantengo tu lógica de tipo de institución para el dashboard
        if (
          institution.type === "INSTITUTE" ||
          institution.type === "UNIVERSITY" ||
          institution.type === "OTHER"
        ) {
          window.location.href = "/dashboardU";
        } else {
          window.location.href = "/dashboardU";
        }

        console.log("Login institution exitoso ✅", token, role);
      } else {
        // Caso raro: ni user ni institution
        setErrorMsg("Respuesta de login inválida.");
      }
    } catch (error) {
      console.error(error);

      if (
        error.response &&
        error.response.data &&
        error.response.data.message
      ) {
        setErrorMsg(error.response.data.message);
      } else {
        setErrorMsg("Login no exitoso. Verifica tus credenciales.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="container fix-form-modal">
        <form className="form-signin" onSubmit={handleSubmit}>
          <div className="text-center spaced-fix" bis_skin_checked="1">
            <img src={isologo} alt="" width="auto" height="70px" />
            <h1 className="h3 mb-3 font-weight-normal mt-3">Log In</h1>
            <p>
              Protect your research with the world's most secure decentralized
              library
            </p>
          </div>

          {/* ALERTA DE ERROR */}
          {errorMsg && (
            <div className="alert alert-danger mt-2" role="alert">
              {errorMsg}
            </div>
          )}

          <div className="form-label-group" bis_skin_checked="1">
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
            />
          </div>

          {/* PASSWORD CON TOGGLE */}
          <div className="form-label-group mt-3" bis_skin_checked="1">
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
          </div>

          <div className="checkbox mb-3 mt-3" bis_skin_checked="1">
            <label>
              <input type="checkbox" value="remember-me" /> Remember me
            </label>
          </div>

          <div className="row">
            <button
              type="submit"
              className="btn btn-memory btn-lg px-4 gap-3 my-1"
              disabled={loading}
            >
              {loading ? "Logging in..." : "Log in"}
            </button>

            <button
              type="button"
              className="btn btn-outline-memory btn-lg px-4 my-3"
              onClick={() => {
                console.log("Sign in / Register clicked");
              }}
            >
              Sign in
            </button>
          </div>
        </form>
      </div>
    </>
  );
};

export default FormLogin;
