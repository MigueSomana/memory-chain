import React, { Suspense, lazy } from "react";
import NavbarReal from "../../components/navbar/NavbarReal";
import Layout from "../../components/layout/LayoutPrivado";

// Carga diferida (Lazy Loading)
const ThesisSearch = lazy(() => import("../search/ThesisSearch"));

// Búsqueda de instituciones (maneja distintos exports posibles)
const InstitutionSearch = lazy(() =>
  import("../search/InstitutionsSearch").then((m) => ({
    default: m.default || m.InstitutionsSearch || m.InstitutionSearch,
  }))
);

// Página principal de búsqueda
const PrincipalSearch = () => {
  return (
    <div
      className="d-flex justify-content-between"
      style={{ minHeight: "100vh", background: "#f6f7f9" }}
    >
      <NavbarReal />

      <div className="flex-grow-1">
        <Layout
          showSwitch
          title="Explore"
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="bi bi-binoculars-fill nav-icon"
              viewBox="0 0 16 16"
              fill="currentColor"
            >
              <path d="M4.5 1A1.5 1.5 0 0 0 3 2.5V3h4v-.5A1.5 1.5 0 0 0 5.5 1zM7 4v1h2V4h4v.882a.5.5 0 0 0 .276.447l.895.447A1.5 1.5 0 0 1 15 7.118V13H9v-1.5a.5.5 0 0 1 .146-.354l.854-.853V9.5a.5.5 0 0 0-.5-.5h-3a.5.5 0 0 0-.5.5v.793l.854.853A.5.5 0 0 1 7 11.5V13H1V7.118a1.5 1.5 0 0 1 .83-1.342l.894-.447A.5.5 0 0 0 3 4.882V4zM1 14v.5A1.5 1.5 0 0 0 2.5 16h3A1.5 1.5 0 0 0 7 14.5V14zm8 0v.5a1.5 1.5 0 0 0 1.5 1.5h3a1.5 1.5 0 0 0 1.5-1.5V14zm4-11H9v-.5A1.5 1.5 0 0 1 10.5 1h1A1.5 1.5 0 0 1 13 2.5z" />
            </svg>
          }
        >
          {/* Render dinámico según la opción activa del switch */}
          {(activeKey) => (
            <Suspense fallback={<div>Loading…</div>}>
              {activeKey === "institution" ? (
                // Vista de búsqueda de instituciones
                <InstitutionSearch />
              ) : (
                // Vista de búsqueda de tesis (por defecto)
                <ThesisSearch />
              )}
            </Suspense>
          )}
        </Layout>
      </div>
    </div>
  );
};

export default PrincipalSearch;

