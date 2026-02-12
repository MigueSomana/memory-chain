import React from "react";
import NavbarReal from "../../components/navbar/NavbarReal";
import Layout from "../../components/layout/LayoutPrivado";
import FormProfileU from "../../components/form/FormProfileU";
import { University } from "lucide-react";

// Componente: Página de Perfil Universitario
const ProfilePersonal = () => {
  return (
    <div
      className="d-flex"
      style={{ minHeight: "100vh", background: "#f6f7f9" }}
    >
      <NavbarReal />
      <div className="flex-grow-1">
        <Layout
          title="Profile"
          showID
          icon={<University />
          }
        >
          <FormProfileU />
        </Layout>
      </div>
    </div>
  );
};

export default ProfilePersonal;
