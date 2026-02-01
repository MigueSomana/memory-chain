import React from "react";
import NavbarReal from "../../components/navbar/NavbarReal";
import Layout from "../../components/layout/LayoutPrivado";
import LibraryUSearch from "../search/LibraryUSearch";
import { Library } from "lucide-react";
// Componente: Libreria de Institution
const UniversityLibrary = () => {
  return (
    <div
      className="d-flex"
      style={{ minHeight: "100vh", background: "#f6f7f9" }}
    >
      <NavbarReal />
      <div className="flex-grow-1">
        <Layout title="Our Library" icon={<Library />}>
          <LibraryUSearch />
        </Layout>
      </div>
    </div>
  );
};

export default UniversityLibrary;
