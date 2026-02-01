import React from "react";
import NavbarReal from "../../components/navbar/NavbarReal";
import Layout from "../../components/layout/LayoutPrivado";
import PanelPersonal from "../../pages/dashboard/PanelPersonal";
import { LayoutDashboard } from "lucide-react";

const DashboardPersonal = () => {
  return (
    <div
      className="d-flex"
      style={{ minHeight: "100vh", background: "#f6f7f9" }}
    >
      <NavbarReal />
      <div className="flex-grow-1">
        <Layout title=" My Dashboard" icon={<LayoutDashboard />}>
          <PanelPersonal />
        </Layout>
      </div>
    </div>
  );
};

export default DashboardPersonal;
