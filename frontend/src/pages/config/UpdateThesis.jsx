import React, { useEffect, useState } from "react";
import axios from "axios";
import NavbarReal from "../../components/navbar/NavbarReal";
import Layout from "../../components/layout/LayoutPrivado";
import FormThesis from "../../components/form/FormThesis";
import {
  getIdUser,
  getIdInstitution,
  getAuthToken,
} from "../../utils/authSession";
import { useParams } from "react-router-dom";

// Componente: Página de Actualización de Tesis
const UploadThesis = () => {
  const IDT = useParams();
  var idUser = getIdUser();
  var idInstitution = getIdInstitution();
  if (getIdUser() !== null) {
    idUser = "me";
  }
  const [institutionOptions, setInstitutionOptions] = useState([]);
  const [setLoadingInst] = useState(true);
  const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

  useEffect(() => {
    const fetchInstitutions = async () => {
      try {
        const token =
          getAuthToken?.() || localStorage.getItem("memorychain_token");
        const headers = token
          ? { Authorization: `Bearer ${token}` }
          : undefined;

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
          title="Update Thesis"
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="currentColor"
              class="bi bi-file-earmark-arrow-up-fill nav-icon"
              viewBox="0 0 16 16"
            >
              <path d="M9.293 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4.707A1 1 0 0 0 13.707 4L10 .293A1 1 0 0 0 9.293 0M9.5 3.5v-2l3 3h-2a1 1 0 0 1-1-1M6.354 9.854a.5.5 0 0 1-.708-.708l2-2a.5.5 0 0 1 .708 0l2 2a.5.5 0 0 1-.708.708L8.5 8.707V12.5a.5.5 0 0 1-1 0V8.707z" />
            </svg>
          }
        >
          <FormThesis
            institutionOptions={institutionOptions}
            idUser={idUser}
            idInstitution={idInstitution}
            idThesis={IDT.id}
          />
        </Layout>
      </div>
    </div>
  );
};

export default UploadThesis;
