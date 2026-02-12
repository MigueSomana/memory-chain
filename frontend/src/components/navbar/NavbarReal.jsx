import React, { useMemo, useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Search,
  Library,
  ShieldCheck,
  User,
  LogOut,
  University,
  Users,
  Heart,
} from "lucide-react";

import isologo from "../../assets/isologo.png";
import { getAuthActor } from "../../utils/authSession";

const NavbarReal = () => {
  const actor = getAuthActor();
  const isInstitution = actor === "institution";

  const [hashActiveKey, setHashActiveKey] = useState(null);

  const [collapsed, setCollapsed] = useState(() => {
    const saved = localStorage.getItem("mc_nav_collapsed");
    return saved ? saved === "1" : false;
  });

  useEffect(() => {
    localStorage.setItem("mc_nav_collapsed", collapsed ? "1" : "0");
  }, [collapsed]);

  const location = useLocation();
  useEffect(() => {
    setHashActiveKey(null);
  }, [location.pathname]);

  const items = useMemo(
    () => [
      {
        key: "dashboard",
        label: "Dashboard",
        icon: <LayoutDashboard />,
        href: isInstitution ? "/dashboard-institution" : "/dashboard-personal",
      },
      { key: "explore", label: "Explore", icon: <Search />, href: "/explore" },
      {
        key: "verify",
        label: "Verify",
        icon: <ShieldCheck />,
        href: "/verify",
      },
      {
        key: "library",
        label: "Library",
        icon: <Library />,
        href: isInstitution ? "/library-institution" : "/library-personal",
      },
      {
        key: isInstitution ? "members" : "likes",
        label: isInstitution ? "Members" : "Likes",
        icon: isInstitution ? <Users /> : <Heart />,
        href: isInstitution ? "/members-institution" : "/my-list-like",
      },
      {
        key: "profile",
        label: "Profile",
        icon: isInstitution ? <University /> : <User />,
        href: isInstitution ? "/profile-institution" : "/profile-personal",
      },
    ],
    [isInstitution],
  );

  const DesktopNavItem = ({ it }) => (
    <li className="mcNavItem" key={it.key}>
      <NavLink
        to={it.href}
        className={({ isActive }) =>
          `mcNavLink ${isActive ? "is-active" : ""} ${
            collapsed ? "is-collapsed" : ""
          }`
        }
      >
        <span className="mcNavIcon">{it.icon}</span>
        <span className="mcNavLabel">{it.label}</span>
        <span className="mcNavDot" />
      </NavLink>
    </li>
  );

  const signOutItem = {
    key: "signout",
    label: "Sign Out",
    icon: <LogOut />,
    href: "#modalExit",
    dbt1: "modal",
    dbt2: "#modalExit",
  };

  return (
    <>
      <aside className={`mcAside ${collapsed ? "is-collapsed" : ""}`}>
        <div className="mcHeader">
          <div className="mcBrand">
            <div className="mcBrandLogoWrap">
              <img className="mcBrandLogo" src={isologo} alt="logo" />
            </div>

            <div className="mcBrandText">
              <div className="mcBrandTitle">Memory-Chain</div>
              <div className="mcBrandSub">Academic Verification</div>
            </div>
          </div>

          {/* Desktop only (CSS lo oculta en mobile) */}
          <button
            type="button"
            className="mcCollapseBtn"
            onClick={() => setCollapsed((v) => !v)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand" : "Collapse"}
          >
            {collapsed ? "›" : "‹"}
          </button>
        </div>

        <div className="mcNavWrap">
          <ul className="mcNavList">
            {items.map((it) => (
              <DesktopNavItem key={it.key} it={it} />
            ))}
          </ul>
        </div>

        <div className="mcBottom">
          <div className="mcDivider" />
          <div className="mcDividerFix">
            <ul className="mcNavList mcNavListBottom">
              <li className="mcNavItem">
                <a
                  href={signOutItem.href}
                  onClick={() => setHashActiveKey(signOutItem.key)}
                  className={`mcNavLink mcNavLinkLogout ${
                    hashActiveKey === signOutItem.key ? "is-active" : ""
                  } ${collapsed ? "is-collapsed" : ""}`}
                  data-bs-toggle={signOutItem.dbt1}
                  data-bs-target={signOutItem.dbt2}
                >
                  <span className="mcNavIcon">{signOutItem.icon}</span>
                  <span className="mcNavLabel">{signOutItem.label}</span>
                  <span className="mcNavDot" />
                </a>
              </li>
            </ul>
          </div>
        </div>
      </aside>

      {/* Si tu layout ya maneja el espacio, puedes quitarlo */}
      <div className="mcSidebarSpacer" />
    </>
  );
};

export default NavbarReal;
