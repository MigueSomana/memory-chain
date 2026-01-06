import React, { useMemo, useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  DashboardIcon,
  ExploreIcon,
  LibraryIcon,
  ProfilePIcon,
  ProfileUIcon,
  LogoutIcon,
} from "../../utils/icons";
import isologo from "../../assets/isologo.png";
import logo from "../../assets/logo.png";
import { getAuthActor } from "../../utils/authSession";

// Navbar para vistas privadas (logueado)
const NavbarReal = () => {
  const actor = getAuthActor();
  const isInstitution = actor === "institution";

  // ✅ Solo para links tipo "#modalExit" (no son ruta)
  const [hashActiveKey, setHashActiveKey] = useState(null);

  // ✅ Cuando cambia la ruta, quitamos el active del hash
  const location = useLocation();
  useEffect(() => {
    setHashActiveKey(null);
  }, [location.pathname]);

  const items = useMemo(
    () => [
      {
        key: "dashboard",
        label: "Dashboard",
        icon: DashboardIcon,
        href: isInstitution ? "/dashboard-institution" : "/dashboard-personal",
      },
      {
        key: "explore",
        label: "Explore",
        icon: ExploreIcon,
        href: "/explore",
      },
      {
        key: "library",
        label: "Library",
        icon: LibraryIcon,
        href: isInstitution ? "/library-institution" : "/library-personal",
      },
      {
        key: "profile",
        label: "Profile",
        icon: isInstitution ? ProfileUIcon : ProfilePIcon,
        href: isInstitution ? "/profile-institution" : "/profile-personal",
      },
      {
        key: "signout",
        label: "Sign Out",
        icon: LogoutIcon,
        href: "#modalExit",
        dbt1: "modal",
        dbt2: "#modalExit",
      },
    ],
    [isInstitution]
  );

  // ====== THEME ======
  const accent = "#20C997";
  const bg = "#121212";

  const asideStyle = {
    background: bg,
    color: "#fff",
    height: "100vh",
    position: "sticky",
    top: 0,
    width: "9vw",
    maxWidth: "320px",
    minWidth: "200px",
    borderRight: "1px solid rgba(255,255,255,0.08)",
  };

  const navWrapStyle = {
    padding: "18px 12px",
    gap: 10,
  };

  const mobileRailStyle = {
    width: 56,
    background: bg,
    borderRight: "1px solid rgba(255,255,255,0.08)",
    zIndex: 1040,
  };

  const offcanvasStyle = {
    background: bg,
    width: "88vw",
    maxWidth: 520,
    marginLeft: 56,
    borderRight: "1px solid rgba(255,255,255,0.08)",
  };

  // ✅ Cierra offcanvas manualmente (evita que data-bs-dismiss “rompa” navegación en móvil)
  const closeOffcanvas = () => {
    const el = document.getElementById("mcOffcanvas");
    if (!el) return;
    const inst = window.bootstrap?.Offcanvas?.getInstance(el);
    inst?.hide();
  };

  // ====== UI helpers ======
  const baseDesktopLinkClass =
    "nav-link text-white text-center d-flex flex-column align-items-center justify-content-center w-100 h-100";

  const baseMobileLinkClass = "nav-link d-flex align-items-center rounded";

  const itemBoxBaseStyle = {
    borderRadius: 16,
    padding: "12px 10px",
    transition: "all .18s ease",
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.04)",
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
  };

  const itemBoxActiveStyle = {
    border: `1px solid rgba(32,201,151,0.38)`,
    background:
      "linear-gradient(180deg, rgba(32,201,151,0.16), rgba(255,255,255,0.04))",
    boxShadow: "0 10px 24px rgba(0,0,0,0.35)",
    transform: "translateY(-1px)",
  };

  const iconWrapBaseStyle = {
    width: 42,
    height: 42,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all .18s ease",
  };

  const labelStyle = {
    fontWeight: 800,
    fontSize: 12,
    letterSpacing: 0.2,
    marginTop: 8,
    opacity: 0.95,
  };

  const DesktopItemContent = (it, active) => (
    <div
      style={{
        ...itemBoxBaseStyle,
        ...(active ? itemBoxActiveStyle : null),
        width: "100%",
        height: "100%",
      }}
    >
      <div
        style={{
          ...iconWrapBaseStyle,
          marginInline: "auto",
        }}
      >
        <span
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: active ? accent : "rgba(255,255,255,0.86)",
          }}
        >
          {it.icon}
        </span>
      </div>

      <div style={{ ...labelStyle, color: active ? "#fff" : "#e9ecef" }}>
        {it.label}
      </div>

      <div
        style={{
          height: 3,
          borderRadius: 999,
          marginTop: 10,
          background: active ? accent : "rgba(255,255,255,0.10)",
          opacity: active ? 1 : 0.6,
        }}
      />
    </div>
  );

  const renderItemDesktop = (it) => {
    const isHash = it.href && it.href.startsWith("#");

    if (isHash) {
      const active = hashActiveKey === it.key;
      return (
        <li
          className="nav-item d-flex"
          key={it.key}
          style={{ marginBottom: 10 }}
        >
          <a
            href={it.href}
            onClick={() => setHashActiveKey(it.key)}
            className={baseDesktopLinkClass}
            data-bs-toggle={it.dbt1}
            data-bs-target={it.dbt2}
            style={{ padding: 0, textDecoration: "none" }}
          >
            {DesktopItemContent(it, active)}
          </a>
        </li>
      );
    }

    return (
      <li className="nav-item d-flex" key={it.key} style={{ marginBottom: 10 }}>
        <NavLink
          to={it.href}
          className={baseDesktopLinkClass}
          style={{ padding: 0, textDecoration: "none" }}
        >
          {({ isActive }) => DesktopItemContent(it, isActive)}
        </NavLink>
      </li>
    );
  };

  const renderItemMobile = (it) => {
    const isHash = it.href && it.href.startsWith("#");

    const mobileRowStyle = (isActive) => ({
      borderRadius: 14,
      border: "1px solid rgba(255,255,255,0.10)",
      background: isActive ? "rgba(32,201,151,0.12)" : "rgba(255,255,255,0.04)",
      color: isActive ? "#fff" : "rgba(255,255,255,0.78)",
      transition: "all .18s ease",
    });

    const mobileIconStyle = (isActive) => ({
      width: 38,
      height: 38,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: isActive ? accent : "rgba(255,255,255,0.85)",
      flex: "0 0 auto",
    });

    const MobileRowInner = (active) => (
      <div
        style={{
          ...mobileRowStyle(active),
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "8px 10px",
        }}
      >
        <span style={mobileIconStyle(active)}>{it.icon}</span>
        <span style={{ fontWeight: 800 }}>{it.label}</span>
      </div>
    );

    // ✅ HASH (Sign out) — cierra offcanvas manual, luego abre modal
    if (isHash) {
      const active = hashActiveKey === it.key;

      return (
        <li className="nav-item" key={it.key}>
          <a
            href={it.href}
            onClick={() => {
              closeOffcanvas();
              setHashActiveKey(it.key);
            }}
            className={baseMobileLinkClass}
            data-bs-toggle={it.dbt1}
            data-bs-target={it.dbt2}
            style={{ padding: 0, textDecoration: "none" }}
          >
            {MobileRowInner(active)}
          </a>
        </li>
      );
    }

    // ✅ RUTAS — aquí NO usamos data-bs-dismiss, cerramos manual
    return (
      <li className="nav-item" key={it.key}>
        <NavLink
          to={it.href}
          className={baseMobileLinkClass}
          style={{ padding: 0, textDecoration: "none" }}
          onClick={() => closeOffcanvas()}
        >
          {({ isActive }) => MobileRowInner(isActive)}
        </NavLink>
      </li>
    );
  };

  return (
    <>
      {/* MOBILE */}
      <div className="d-md-none">
        <div
          className="position-fixed top-0 start-0 h-100 d-flex align-items-center justify-content-center"
          style={mobileRailStyle}
        >
          <button
            className="btn p-2 text-white"
            type="button"
            data-bs-toggle="offcanvas"
            data-bs-target="#mcOffcanvas"
            aria-controls="mcOffcanvas"
            aria-label="Open menu"
            style={{
              width: 40,
              height: 40,
              borderRadius: 14,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.10)",
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 640 640"
              width="22"
              height="22"
              fill="currentColor"
            >
              <path d="M320 208C289.1 208 264 182.9 264 152C264 121.1 289.1 96 320 96C350.9 96 376 121.1 376 152C376 182.9 350.9 208 320 208zM320 432C350.9 432 376 457.1 376 488C376 518.9 350.9 544 320 544C289.1 544 264 518.9 264 488C264 457.1 289.1 432 320 432zM376 320C376 350.9 350.9 376 320 376C289.1 376 264 350.9 264 320C264 289.1 289.1 264 320 264C350.9 264 376 289.1 376 320z" />
            </svg>
          </button>
        </div>

        <div
          className="offcanvas offcanvas-start text-white"
          tabIndex={-1}
          id="mcOffcanvas"
          aria-labelledby="mcOffcanvasLabel"
          style={offcanvasStyle}
        >
          <div
            className="offcanvas-header"
            style={{
              borderBottom: "1px solid rgba(255,255,255,0.08)",
              paddingBottom: 12,
            }}
          >
            <img src={logo} alt="" height={55} />
            <button
              type="button"
              className="btn-close btn-close-white"
              data-bs-dismiss="offcanvas"
              aria-label="Close"
            />
          </div>

          <div className="offcanvas-body d-flex flex-column">
            <ul className="nav flex-column gap-2">
              {items.map(renderItemMobile)}
            </ul>
          </div>
        </div>

        <div style={{ paddingLeft: 56 }} />
      </div>

      {/* DESKTOP */}
      <aside className="d-none d-md-flex flex-column " style={asideStyle}>
        <div
          className="py-3 px-3 row flex-grow-1"
          style={{
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            paddingBottom: 10, // Reemplaza el marginBottom del div para mantener el espacio
          }}
        >
          <div className="col-3 px-2">
            <img src={isologo} alt="logo" width={44} height={44} />
          </div>
          <div className="col-9 align-content-center">
            <div style={{ fontWeight: 900, letterSpacing: 0.3, fontSize: 12 }}>
              MEMORYCHAIN
            </div>
            <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 12 }}>
              {isInstitution ? "Institution" : "Personal"}
            </div>
          </div>
        </div>
        <ul
          className="nav d-flex flex-column h-100 w-100 justify-content-center"
          style={navWrapStyle}
        >
          {items.map(renderItemDesktop)}
        </ul>
        <div style={{ marginTop: "0", padding: "10px 6px" }}>
          <div
            style={{
              height: 1,
              background: "rgba(255,255,255,0.08)",
              marginBottom: 10,
            }}
          />
          <div
            style={{
              height: 4,
              borderRadius: 999,
              background: `linear-gradient(90deg, rgba(32,201,151,0.0), ${accent}, rgba(32,201,151,0.0))`,
              opacity: 0.9,
            }}
          />
        </div>
      </aside>
    </>
  );
};

export default NavbarReal;
