import React from "react";
import NavbarReal from "../../components/navbar/NavbarReal";
import Layout from "../../components/layout/LayoutPrivado";
import PanelUniversity from "../../pages/dashboard/PanelUniversity";
import { LayoutDashboard } from "lucide-react";
// Componente: Dashboard Unversitario
const DashboardUniversity = () => {
  return (
    <div
      className="d-flex"
      style={{ minHeight: "100vh", background: "#f6f7f9" }}
    >
      <NavbarReal />
      <div className="flex-grow-1">
        <Layout title="Dashboard Institutional" icon={<LayoutDashboard />}>
          <PanelUniversity />
        </Layout>
      </div>
    </div>
  );
};

export default DashboardUniversity;
