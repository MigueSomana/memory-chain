import React, { useState } from "react";
import { BackIcon, PlusIcon } from "../../utils/icons";
import { getAuthActor } from "../../utils/authSession";

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

  return (
    <>
      <div
        className="min-vh-100 d-flex flex-column"
        style={{ backgroundColor: "#fff" }}
      >
        <header className="py-4 px-4 border-bottom d-flex">
          <div className="container d-flex flex-row d-grid column-gap-2">
            <span className="d-block mb-1">{icon}</span>
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
