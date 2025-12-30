import React from "react";
import NavbarReal from "../../components/navbar/NavbarReal";
import Layout from "../../components/layout/LayoutPrivado";
import PanelUniversity from "../../pages/dashboard/PanelUniversity";

// Componente: Dashboard Unversitario
const DashboardUniversity = () => {
  return (
    <div
      className="d-flex"
      style={{ minHeight: "100vh", background: "#f6f7f9" }}
    >
      <NavbarReal />
      <div className="flex-grow-1">
        <Layout
          title="Dashboard University"
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="currentColor"
              className="nav-icon"
              viewBox="0 0 16 16"
            >
              <path d="M15.985 8.5H8.207l-5.5 5.5a8 8 0 0 0 13.277-5.5zM2 13.292A8 8 0 0 1 7.5.015v7.778zM8.5.015V7.5h7.485A8 8 0 0 0 8.5.015" />
            </svg>
          }
        >
          <PanelUniversity />
        </Layout>
      </div>
    </div>
  );
};

export default DashboardUniversity;