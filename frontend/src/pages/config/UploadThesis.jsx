import React, { useEffect, useState } from "react";
import axios from "axios";
import NavbarReal from "../../components/navbar/NavbarReal";
import Layout from "../../components/layout/LayoutPrivado";
import FormThesis from "../../components/form/FormThesis";
import { getIdUser, getIdInstitution, getAuthToken } from "../../utils/authSession";

// Componente: Página de Subida de Tesis
const UploadThesis = () => {
  var idUser = getIdUser();
  var idInstitution = getIdInstitution();
  if (getIdUser() !== null) {
    idUser = "me";
  }
const [institutionOptions, setInstitutionOptions] = useState([]);
const [ setLoadingInst] = useState(true);
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

useEffect(() => {
    const fetchInstitutions = async () => {
      try {
        const token = getAuthToken?.() || localStorage.getItem("memorychain_token");
        const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
        const res = await axios.get(
          `${API_BASE_URL}/api/institutions`,
          headers ? { headers } : undefined
        );
        setInstitutionOptions(res.data || []);
      } catch (err) {
        console.error("Error loading institutions:", err);
      } finally {
        setLoadingInst(false);
      }
    };

    fetchInstitutions();
  }, []);

  return (
    <div
      className="d-flex"
      style={{ minHeight: "100vh", background: "#f6f7f9" }}
    >
      <NavbarReal />
      <div className="flex-grow-1">
        <Layout
        showBack
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
          <FormThesis
          institutionOptions={institutionOptions}
            idUser={idUser}
            idInstitution={idInstitution}
            idThesis={null}
          />
        </Layout>
      </div>
    </div>
  );
};

export default UploadThesis;
