import React from "react";
import NavbarReal from "../../components/navbar/NavbarReal";
import Layout from "../../components/layout/LayoutPrivado";
import LibraryPSearch from "../search/LibraryPSearch";
import { Library } from "lucide-react";

// Componente: Libreria de Personal
const PersonalLibrary = () => {
  return (
    <div
      className="d-flex"
      style={{ minHeight: "100vh" }}
    >
      <NavbarReal />
      <div className="flex-grow-1">
        <Layout showUp title="My Library" icon={<Library />}>
          <LibraryPSearch />
        </Layout>
      </div>
    </div>
  );
};

export default PersonalLibrary;
