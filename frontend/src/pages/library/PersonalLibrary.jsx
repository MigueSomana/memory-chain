import React from "react";
import NavbarReal from "../../components/navbar/NavbarReal";
import Layout from "../../components/layout/LayoutPrivado";
import LibraryPSearch from "../search/LibraryPSearch";

const PersonalLibrary = () => {
  return (
    <div
      className="d-flex"
      style={{ minHeight: "100vh", background: "#f6f7f9" }}
    >
      <NavbarReal />
      <div className="flex-grow-1">
        <Layout
          showButton
          title="My Library"
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="bi bi-binoculars-fill nav-icon"
              viewBox="0 0 16 16"
              fill="currentColor"
            >
              <path d="M7.765 1.559a.5.5 0 0 1 .47 0l7.5 4a.5.5 0 0 1 0 .882l-7.5 4a.5.5 0 0 1-.47 0l-7.5-4a.5.5 0 0 1 0-.882z"/>
          <path d="m2.125 8.567-1.86.992a.5.5 0 0 0 0 .882l7.5 4a.5.5 0 0 0 .47 0l7.5-4a.5.5 0 0 0 0-.882l-1.86-.992-5.17 2.756a1.5 1.5 0 0 1-1.41 0z"/>
          </svg>
          }
        >
          <LibraryPSearch />
        </Layout>
      </div>
    </div>
  );
};

export default PersonalLibrary;
