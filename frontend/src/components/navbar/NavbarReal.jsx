import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  DashboardIcon,
  ExploreIcon,
  LibraryIcon,
  ProfilePIcon,
  ProfileUIcon,
  LogoutIcon,
} from "../../utils/icons";
import { getAuthActor } from "../../utils/authSession";

const NavbarReal = () => {
  const [activeKey, setActiveKey] = useState("dashboard");

  const actor = getAuthActor();
  const isInstitution = actor === "institution"; // si no, asumimos user/estudiante

  const items = [
    {
      key: "dashboard",
      label: "Dashboard",
      icon: DashboardIcon,
      href: isInstitution ? "/dashboardU" : "/dashboardP",
    },
    {
      key: "explore",
      label: "Explore",
      icon: ExploreIcon,
      href: "/search",
    },
    {
      key: "library",
      label: "Library",
      icon: LibraryIcon,
      href: isInstitution ? "/libraryU" : "/libraryP",
    },
    {
      key: "profile",
      label: "Profile",
      icon: isInstitution ? ProfileUIcon : ProfilePIcon,
      href: isInstitution ? "/profileU" : "/profileP",
    },
    {
      key: "signout",
      label: "Sign Out",
      icon: LogoutIcon,
      href: "#modalExit",
      dbt1: "modal",
      dbt2: "#modalExit",
    },
  ];

  const renderItemDesktop = (it) => {
    const isHash = it.href && it.href.startsWith("#");
    if (isHash) {
      return (
        <li className="nav-item flex-grow-1 d-flex" key={it.key}>
          <a
            href={it.href}
            onClick={() => setActiveKey(it.key)}
            className={`nav-link text-white text-center d-flex flex-column align-items-center justify-content-center w-100 h-100 rounded ${
              activeKey === it.key ? "active" : "opacity-75"
            }`}
            data-bs-toggle={it.dbt1}
            data-bs-target={it.dbt2}
          >
            <span className="d-block mb-1">{it.icon}</span>
            <span className="fw-semibold">{it.label}</span>
          </a>
        </li>
      );
    }

    return (
      <li className="nav-item flex-grow-1 d-flex" key={it.key}>
        <NavLink
          to={it.href}
          onClick={() => setActiveKey(it.key)}
          className={({ isActive }) =>
            `nav-link text-white text-center d-flex flex-column align-items-center justify-content-center w-100 h-100 rounded ${
              isActive || activeKey === it.key ? "active" : "opacity-75"
            }`
          }
        >
          <span className="d-block mb-1">{it.icon}</span>
          <span className="fw-semibold">{it.label}</span>
        </NavLink>
      </li>
    );
  };

  const renderItemMobile = (it) => {
    const isHash = it.href && it.href.startsWith("#");
    if (isHash) {
      return (
        <li className="nav-item" key={it.key}>
          <a
            href={it.href}
            data-bs-dismiss="offcanvas"
            onClick={() => setActiveKey(it.key)}
            className={`nav-link d-flex align-items-center gap-2 px-3 py-2 rounded ${
              activeKey === it.key ? "active" : "text-white-50"
            }`}
          >
            {it.icon}
            <span className="fw-semibold">{it.label}</span>
          </a>
        </li>
      );
    }

    return (
      <li className="nav-item" key={it.key}>
        <NavLink
          to={it.href}
          data-bs-dismiss="offcanvas"
          onClick={() => setActiveKey(it.key)}
          className={({ isActive }) =>
            `nav-link d-flex align-items-center gap-2 px-3 py-2 rounded ${
              isActive || activeKey === it.key ? "active" : "text-white-50"
            }`
          }
        >
          {it.icon}
          <span className="fw-semibold">{it.label}</span>
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
          style={{
            width: 56,
            background: "#121212",
            borderRight: "1px solid rgba(255,255,255,0.08)",
            zIndex: 1040,
          }}
        >
          <button
            className="btn p-2 text-white"
            type="button"
            data-bs-toggle="offcanvas"
            data-bs-target="#mcOffcanvas"
            aria-controls="mcOffcanvas"
            aria-label="Open menu"
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
          tabIndex="-1"
          id="mcOffcanvas"
          aria-labelledby="mcOffcanvasLabel"
          style={{
            background: "#121212",
            width: "88vw",
            maxWidth: 520,
            marginLeft: 56,
          }}
        >
          <div className="offcanvas-header">
            <h5 className="offcanvas-title" id="mcOffcanvasLabel">
              Menu
            </h5>
            <button
              type="button"
              className="btn-close btn-close-white"
              data-bs-dismiss="offcanvas"
              aria-label="Close"
            ></button>
          </div>
          <div className="offcanvas-body d-flex flex-column ">
            <ul className="nav flex-column gap-2 ">
              {items.map(renderItemMobile)}
            </ul>
          </div>
        </div>

        <div style={{ paddingLeft: 56 }} />
      </div>

      {/* DESKTOP */}
      <aside
        className="d-none d-md-flex flex-column flex-wrap "
        style={{
          background: "#121212",
          color: "#fff",
          height: "100vh",
          position: "sticky",
          top: 0,
          width: "9vw",
          maxWidth: "320px",
          minWidth: "200px",
        }}
      >
        <ul className="nav d-flex flex-column h-100 w-100 py-4 px-2">
          {items.map(renderItemDesktop)}
        </ul>
      </aside>
    </>
  );
};

export default NavbarReal;
