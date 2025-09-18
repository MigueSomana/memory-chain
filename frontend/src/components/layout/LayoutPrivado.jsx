import React, { useState } from "react";

const Segmented = ({ options, value, onChange }) => (
  <div className="btn-group" role="group" aria-label="Segmented switch">
    {options.map((opt) => (
      <button
        key={opt.key}
        type="button"
        className={`btn ${value === opt.key ? "btn-memory" : "btn-outline-memory"}`}
        onClick={() => onChange(opt.key)}
      >
        {opt.label}
      </button>
    ))}
  </div>
);

const LayoutPrivado = ({
  icon,
  title,
  children,

  // ✅ Opcional: mostrar u ocultar el switch
  showSwitch = false,
  showButton = false,

  // ✅ Opcional: controlar el switch desde fuera (o dejarlo no-controlado)
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
              <Segmented options={options} value={activeKey} onChange={handleChange} />
            </div>
          )}
          {showButton && (
            <div style={{ marginLeft: "auto" }}>
              <button
              type="button"
              className="btn btn-memory"
            >
              + Add Thesis
            </button>
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
  );
};

export default LayoutPrivado;

