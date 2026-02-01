import React, { Suspense, lazy } from "react";
import NavbarReal from "../../components/navbar/NavbarReal";
import Layout from "../../components/layout/LayoutPrivado";
import { Search } from "lucide-react";

// Carga diferida (Lazy Loading)
const ThesisSearch = lazy(() => import("../search/ThesisSearch"));

// Búsqueda de instituciones (maneja distintos exports posibles)
const InstitutionSearch = lazy(() =>
  import("../search/InstitutionsSearch").then((m) => ({
    default: m.default || m.InstitutionsSearch || m.InstitutionSearch,
  })),
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
        <Layout showSwitch title="Explorer" icon={<Search />}>
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
