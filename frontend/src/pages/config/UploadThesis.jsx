import React from "react";
import NavbarReal from "../../components/navbar/NavbarReal";
import Layout from "../../components/layout/Layout";
import FormThesis from "../../components/form/FormThesis";

const UploadThesis = () => {
  return (
    <div
      className="d-flex"
      style={{ minHeight: "100vh", background: "#f6f7f9" }}
    >
      <NavbarReal />
      <div className="flex-grow-1">
        <Layout
          title="Upload Thesis"
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="bi bi-file-earmark-plus-fill nav-icon"
              viewBox="0 0 16 16"
              fill="currentColor"
            >
              <path d="M9.293 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4.707A1 1 0 0 0 13.707 4L10 .293A1 1 0 0 0 9.293 0M9.5 3.5v-2l3 3h-2a1 1 0 0 1-1-1M8.5 7v1.5H10a.5.5 0 0 1 0 1H8.5V11a.5.5 0 0 1-1 0V9.5H6a.5.5 0 0 1 0-1h1.5V7a.5.5 0 0 1 1 0" />{" "}
            </svg>
          }
          
        >
          <FormThesis />
        </Layout>
      </div>
    </div>
  );
};

export default UploadThesis;
