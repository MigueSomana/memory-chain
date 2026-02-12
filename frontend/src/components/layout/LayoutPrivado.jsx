import React, { useState } from "react";
import { BackIcon, SupportIcon } from "../../utils/icons";
import { getAuthActor } from "../../utils/authSession";
import { BookMarked, University,Upload } from "lucide-react";
import { NavLink } from "react-router-dom";

const Segmented = ({ options, value, onChange }) => (
  <div className="mcSegment" role="tablist" aria-label="Segmented switch">
    {options.map((opt) => {
      const active = value === opt.key;

      return (
        <button
          key={opt.key}
          type="button"
          className={`mcSegmentBtn ${active ? "is-active" : ""}`}
          data-active={active ? "true" : "false"}
          onClick={() => onChange(opt.key)}
          role="tab"
          aria-selected={active}
        >
          {opt.icon && (
            <span className="mcSegmentOptIcon px-1" aria-hidden="true">
              {opt.icon}
            </span>
          )}
          <span className="mcSegmentLabel">{opt.label}</span>
        </button>
      );
    })}
  </div>
);

const LayoutPrivado = ({
  icon,
  title,
  children,

  showSwitch = false,
  showBack = false,
  showUp = false,

  activeKey: controlledKey,
  onChange,

  // ✅ ahora soporta iconos por opción (para verse EXACTO al screenshot)
  options = [
    { key: "thesis", label: "Theses", icon: <BookMarked size={18} /> },
    {
      key: "institution",
      label: "Institutions",
      icon: <University size={18} />,
    },
  ],
  defaultKey = "thesis",
}) => {
  const [uncontrolledKey, setUncontrolledKey] = useState(defaultKey);
  const activeKey = controlledKey ?? uncontrolledKey;

  const handleChange = (key) => {
    if (onChange) onChange(key);
    else setUncontrolledKey(key);
  };

  const backHref =
    getAuthActor() === "institution"
      ? "/library-institution"
      : "/library-personal";

  return (
    <div className="mcLayout">
      <header className="mcTopbar">
        <div className="mcTopbarInner">
          <div className="mcTitleRow">
            <div className="mcTitleIcon" aria-hidden="true">
              {icon}
            </div>
            <h1 className="mcTitle">{title}</h1>
          </div>

          <div className="mcTopbarActions">
            {showSwitch && (
              <Segmented
                options={options}
                value={activeKey}
                onChange={handleChange}
              />
            )}

            {showBack && (
              <a href={backHref} className="mcBtn mcBtnGhost">
                <span className="mcBtnIcon" aria-hidden="true">
                  {BackIcon}
                </span>
                <span>Back</span>
              </a>
            )}
            {showUp && (
              <NavLink
                to={"/new-upload"}
                type="button"
                className="btn btn-memory mcSortBtn"
              >
                <span
                  className="d-flex align-items-center justify-content-center"
                  aria-hidden="true"
                >
                  <Upload size={18} className="mx-2 py-0" />
                  New Upload
                </span>
              </NavLink>
            )}
          </div>
        </div>

        {/* ✅ like screenshot: subtle green glow band + thin line */}
        <div className="mcTopbarGlow" />
        <div className="mcTopbarDivider" />
      </header>

      <main className="mcMain">
        <div className="mcContainer">
          {typeof children === "function" ? children(activeKey) : children}
        </div>
      </main>

      <button
        type="button"
        className="mcSupportBtn"
        title="Contact support"
        onClick={() => alert("Demo: Contact support")}
      >
        {SupportIcon}
      </button>
    </div>
  );
};

export default LayoutPrivado;
