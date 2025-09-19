import React from "react";
import NavbarReal from "../../components/navbar/NavbarReal";
import Layout from "../../components/layout/LayoutPrivado";
import FormProfileU from "../../components/form/FormProfileU";

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
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="bi bi-bank2 nav-icon"
              viewBox="0 0 16 16"
              fill="currentColor" 
            >
              <path d="M8.277.084a.5.5 0 0 0-.554 0l-7.5 5A.5.5 0 0 0 .5 6h1.875v7H1.5a.5.5 0 0 0 0 1h13a.5.5 0 1 0 0-1h-.875V6H15.5a.5.5 0 0 0 .277-.916zM12.375 6v7h-1.25V6zm-2.5 0v7h-1.25V6zm-2.5 0v7h-1.25V6zm-2.5 0v7h-1.25V6zM8 4a1 1 0 1 1 0-2 1 1 0 0 1 0 2M.5 15a.5.5 0 0 0 0 1h15a.5.5 0 1 0 0-1z" />
            </svg>
          }
        >
          <FormProfileU />
        </Layout>
      </div>
    </div>
  );
};

export default ProfilePersonal;
