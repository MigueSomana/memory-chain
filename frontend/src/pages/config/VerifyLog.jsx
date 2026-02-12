import React from "react";
import NavbarReal from "../../components/navbar/NavbarReal";
import Layout from "../../components/layout/LayoutPrivado";
import Verify from "../simple/Verify";
import { ShieldCheck } from "lucide-react";

// Componente: Página de Perfil Personal
const VerifyLog = () => {
  return (
    <div
      className="d-flex"
      style={{ minHeight: "100vh"}}
    >
      <NavbarReal />
      <div className="flex-grow-1">
        <Layout
          title="Verify Certificate"
          showID
          icon={<ShieldCheck />
          }
        >
          <Verify />
        </Layout>
      </div>
    </div>
  );
};

export default VerifyLog;
