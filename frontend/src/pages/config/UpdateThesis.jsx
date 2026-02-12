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
import { Upload } from "lucide-react";
import { useToast } from "../../utils/toast"; 

// Componente: Página de Actualización de Tesis
const UpdateThesis = () => {
  const IDT = useParams();

  let idUser = getIdUser();
  const idInstitution = getIdInstitution();

  // tu lógica actual (la mantengo tal cual)
  if (getIdUser() !== null) {
    idUser = "me";
  }

  const [institutionOptions, setInstitutionOptions] = useState([]);
  const [, setLoadingInst] = useState(true);

  const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

  // ✅ Toast real por context
  const { showToast } = useToast();

  useEffect(() => {
    const fetchInstitutions = async () => {
      try {
        const token =
          getAuthToken?.() || localStorage.getItem("memorychain_token");
        const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

        const res = await axios.get(
          `${API_BASE_URL}/api/institutions`,
          headers ? { headers } : undefined
        );

        setInstitutionOptions(res.data || []);
      } catch (err) {
        console.error("Error loading institutions:", err);
        showToast?.({
          message: "Error loading institutions.",
          type: "danger",
          duration: 2600,
        });
      } finally {
        setLoadingInst(false);
      }
    };

    fetchInstitutions();
  }, [API_BASE_URL, showToast]);

  return (
    <div className="d-flex" style={{ minHeight: "100vh" }}>
      <NavbarReal />
      <div className="flex-grow-1">
        <Layout showBack title="Update Thesis" icon={<Upload />}>
          <FormThesis
            institutionOptions={institutionOptions}
            idUser={idUser}
            idInstitution={idInstitution}
            idThesis={IDT.id}
            showToast={showToast} // ✅ CLAVE
          />
        </Layout>
      </div>
    </div>
  );
};

export default UpdateThesis;