import React, { useState } from "react";
import { BackIcon, PlusIcon, CopyIcon } from "../../utils/icons";
import {
  getAuthActor,
  getIdUser,
  getIdInstitution,
} from "../../utils/authSession";

const Segmented = ({ options, value, onChange }) => (
  <div className="btn-group" role="group" aria-label="Segmented switch">
    {options.map((opt) => (
      <button
        key={opt.key}
        type="button"
        className={`btn ${
          value === opt.key ? "btn-memory" : "btn-outline-memory"
        }`}
        onClick={() => onChange(opt.key)}
      >
        {opt.label}
      </button>
    ))}
  </div>
);

// Layout para las vistas para usuario o institution logueado
const LayoutPrivado = ({
  icon,
  title,
  children,

  showSwitch = false, // Switch de institution-thesis en explore
  showButton = false, // Botón de "Add Thesis"
  showBack = false, // Botón de "Back"
  showBackDashboard = false, // Botón de "Back" a Dashboard
  showID = false, // Banda de ID (badge copiable)

  activeKey: controlledKey,
  onChange,
  options = [
    { key: "institution", label: "Institution" },
    { key: "thesis", label: "Thesis" },
  ],
  defaultKey = "thesis",
}) => {
  const [uncontrolledKey, setUncontrolledKey] = useState(defaultKey);
  const activeKey = controlledKey ?? uncontrolledKey;

  const handleChange = (key) => {
    if (onChange) onChange(key);
    else setUncontrolledKey(key);
  };

  // ✅ ID del actor logueado (user o institution)
  const actor = getAuthActor();
  const actorId =
    actor === "institution" ? getIdInstitution() : actor === "user" ? getIdUser() : null;

  // ✅ Copiar al portapapeles
  const copyToClipboard = async (text) => {
    if (!text) return;
    try {
      // Preferido (moderno)
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return;
      }
      // Fallback antiguo
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      ta.style.top = "-9999px";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    } catch {
      // si falla, no hacemos nada (evita alerts raros)
    }
  };

  // UI del badge (turquesa + texto blanco)
  const idBadgeStyle = {
    background: "#20C997",
    color: "#fff",
    fontSize: 12,
    padding: "10px 12px",
    borderRadius: 12,
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
  };

  return (
    <>
      <div
        className="min-vh-100 d-flex flex-column"
        style={{ backgroundColor: "#fff" }}
      >
        <header className="py-3 px-4 border-bottom d-flex">
          <div className="container d-flex flex-row d-grid column-gap-2 align-items-center">
            <span className="d-block">{icon}</span>
            <h1 className="h2 m-0 font-weight-bold">{title}</h1>

            {showSwitch && (
              <div style={{ marginLeft: "auto" }}>
                <Segmented
                  options={options}
                  value={activeKey}
                  onChange={handleChange}
                />
              </div>
            )}

            {showButton && (
              <div className="d-flex" style={{ marginLeft: "auto" }}>
                <a
                  href={"/new-upload"}
                  type="button"
                  className="btn btn-memory d-flex align-items-center justify-content-center gap-2"
                >
                  {PlusIcon}
                  <span className="t-white"> Add Thesis</span>
                </a>
              </div>
            )}

            {showBack && (
              <div className="d-flex" style={{ marginLeft: "auto" }}>
                <a
                  href={
                    getAuthActor() === "institution"
                      ? "/library-institution"
                      : "/library-personal"
                  }
                  type="button"
                  className="btn btn-secondary d-flex align-items-center justify-content-center gap-2"
                >
                  {BackIcon}
                  <span className="t-white"> Back</span>
                </a>
              </div>
            )}

            {showBackDashboard && (
              <div className="d-flex" style={{ marginLeft: "auto" }}>
                <a
                  href={
                    getAuthActor() === "institution"
                      ? "/dashboard-institution"
                      : "/dashboard-personal"
                  }
                  type="button"
                  className="btn btn-secondary d-flex align-items-center justify-content-center gap-2"
                >
                  {BackIcon}
                  <span className="t-white"> Back</span>
                </a>
              </div>
            )}

            {/* ✅ SHOW ID: Badge copiable */}
            {showID && (
              <div className="d-flex" style={{ marginLeft: "auto" }}>
                <div
                  role="button"
                  tabIndex={0}
                  title={actorId ? "Click to copy ID" : "No ID available"}
                  style={idBadgeStyle}
                  onClick={() => copyToClipboard(actorId)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") copyToClipboard(actorId);
                  }}

                >
                  <span>
                    <strong>ID:</strong>
                  </span>
                  <span>{actorId}</span>
                  <span>{CopyIcon}</span>
                </div>
              </div>
            )}
          </div>
        </header>

        <main className="flex-grow-1 px-3">
          <div className="container py-4">
            {/* Si children es función y hay switch, le pasamos activeKey. Si no, render normal */}
            {typeof children === "function" ? children(activeKey) : children}
          </div>
        </main>
      </div>
    </>
  );
};

export default LayoutPrivado;

