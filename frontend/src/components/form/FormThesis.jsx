import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import {
  HeartFill,
  CheckCircle,
  TimeCircle,
  CrossCircle,
} from "../../utils/icons";

// Configuración base (API + límites)
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";
const MAX_PDF_MB = 25;
const MAX_PDF_BYTES = MAX_PDF_MB * 1024 * 1024;

const FormThesis = ({
  institutionOptions = [],
  onSubmit,
  idUser,
  idThesis,
  idInstitution,
}) => {
  // Estado general (submit + init)
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const hasInitializedRef = useRef(false);

  // Instituciones disponibles (se filtran según el modo y contexto)
  const [availableInstitutions, setAvailableInstitutions] = useState(
    institutionOptions
  );

  // Control de bloqueo de inputs (según contexto)
  const [disableAuthor1, setDisableAuthor1] = useState(false);
  const [disableInstitutionSelect, setDisableInstitutionSelect] =
    useState(false);

  // Alertas del formulario (Bootstrap)
  const [formAlert, setFormAlert] = useState({
    type: /** @type {"danger"|"warning"|"info"|"success"|""} */ (""),
    messages: /** @type {string[]} */ ([]),
  });

  const showAlert = (type, messages) => {
    setFormAlert({
      type,
      messages: Array.isArray(messages) ? messages : [String(messages)],
    });
  };

  const clearAlert = () => setFormAlert({ type: "", messages: [] });

  // Archivo PDF (drag & drop + input)
  const [pdfFile, setPdfFile] = useState(/** @type {File|null} */ (null));
  const [pdfName, setPdfName] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const pdfInputRef = useRef(/** @type {HTMLInputElement|null} */ (null));

  // Valida el PDF antes de aceptarlo
  const acceptPdf = (f) => {
    if (!f) return false;

    if (f.type !== "application/pdf") {
      showAlert("warning", "Only PDF files are allowed.");
      return false;
    }

    if (f.size > MAX_PDF_BYTES) {
      showAlert("warning", `PDF must be less than ${MAX_PDF_MB}MB.`);
      return false;
    }

    return true;
  };

  // Guarda el PDF seleccionado en el estado
  const loadPdf = (f) => {
    if (!acceptPdf(f)) return;
    setPdfFile(f);
    setPdfName(f.name);
  };

  // Abre el selector de archivos
  const onPickPdf = () => pdfInputRef.current?.click();

  // Input de archivo (selección normal)
  const onPdfChange = (e) => {
    const f = e.target.files && e.target.files[0] ? e.target.files[0] : null;
    if (!f) return;
    loadPdf(f);
  };

  // Drag & drop (soltar archivo)
  const onDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (isSubmitting || isInitializing) return;

    const f =
      e.dataTransfer.files && e.dataTransfer.files[0]
        ? e.dataTransfer.files[0]
        : null;

    if (!f) return;
    loadPdf(f);
  };

  // Drag & drop (evento mientras arrastra)
  const onDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isSubmitting && !isInitializing) setIsDragging(true);
  };

  // Drag & drop (sale del área)
  const onDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  // Limpia el PDF seleccionado
  const removePdf = () => {
    setPdfFile(null);
    setPdfName("");
    if (pdfInputRef.current) pdfInputRef.current.value = "";
  };

  // Campos principales del formulario
  const [title, setTitle] = useState("");

  /** @type {[Person[], Function]} */
  const [authors, setAuthors] = useState([
    { firstName: "", lastName: "", email: "" },
  ]);

  /** @type {[Person[], Function]} */
  const [tutors, setTutors] = useState([
    { firstName: "", lastName: "", email: "" },
  ]);

  const [summary, setSummary] = useState("");
  const [keywords, setKeywords] = useState(/** @type {string[]} */ ([]));
  const [keywordInput, setKeywordInput] = useState("");

  const [language, setLanguage] = useState("");
  const [degree, setDegree] = useState("");
  const [field, setField] = useState("");
  const [year, setYear] = useState("");
  const [institutionId, setInstitutionId] = useState("");
  const [department, setDepartment] = useState("");
  const [doi, setDoi] = useState("");

  // Estado de certificación + likes (informativo)
  const [status, setStatus] = useState("PENDING");
  const [likesCount, setLikesCount] = useState(0);

  // Helpers (normalización y mapeos)
  const splitFullName = (fullName = "") => {
    const parts = String(fullName).trim().split(/\s+/);
    if (parts.length === 0) return { firstName: "", lastName: "" };
    if (parts.length === 1) return { firstName: parts[0], lastName: "" };
    return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
  };

  const normalizeInstId = (val) => {
    if (!val) return "";
    if (typeof val === "string") return val;
    if (typeof val === "object" && val._id) return String(val._id);
    return "";
  };

  // Obtiene IDs de instituciones relacionadas a un usuario (institutions + educationalEmails)
  const extractUserInstitutionIds = (u) => {
    /** @type {Set<string>} */
    const ids = new Set();

    const instArr = Array.isArray(u?.institutions) ? u.institutions : [];
    instArr.forEach((ii) => {
      if (typeof ii === "string") ids.add(ii);
      else if (ii && typeof ii === "object" && ii._id) ids.add(String(ii._id));
    });

    const edu = Array.isArray(u?.educationalEmails) ? u.educationalEmails : [];
    edu.forEach((entry) => {
      const inst = entry?.institution;
      if (!inst) return;
      if (typeof inst === "string") ids.add(inst);
      else if (inst && typeof inst === "object" && inst._id)
        ids.add(String(inst._id));
    });

    return Array.from(ids);
  };

  // Opciones de departamentos (según institución seleccionada)
  const departmentOptions = useMemo(() => {
    const inst = availableInstitutions.find(
      (i) => String(i._id) === String(institutionId)
    );
    const deps = inst?.departments || [];
    return deps.map((d) => (typeof d === "string" ? { name: d } : d));
  }, [institutionId, availableInstitutions]);

  // Authors (agregar / quitar / editar)
  const addAuthor = () =>
    setAuthors((prev) => [...prev, { firstName: "", lastName: "", email: "" }]);

  const removeAuthor = (index) => {
    setAuthors((prev) => prev.filter((_, i) => i !== index));
  };

  const updateAuthor = (index, key, value) => {
    setAuthors((prev) =>
      prev.map((a, i) => (i === index ? { ...a, [key]: value } : a))
    );
  };

  // Tutors (agregar / quitar / editar)
  const addTutor = () =>
    setTutors((prev) => [...prev, { firstName: "", lastName: "", email: "" }]);

  const removeTutor = (index) =>
    setTutors((prev) => prev.filter((_, i) => i !== index));

  const updateTutor = (index, key, value) =>
    setTutors((prev) =>
      prev.map((t, i) => (i === index ? { ...t, [key]: value } : t))
    );

  // Keywords (agregar / quitar)
  const addKeyword = () => {
    const v = keywordInput.trim();
    if (!v) return;

    const exists = keywords.some(
      (k) => String(k).toLowerCase() === v.toLowerCase()
    );

    if (!exists) setKeywords((prev) => [...prev, v]);
    setKeywordInput("");
  };

  const removeKeyword = (k) => {
    setKeywords((prev) => prev.filter((x) => x !== k));
  };

  // Permite agregar keyword con Enter
  const onKeywordKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addKeyword();
    }
  };

  // Validación del formulario
  const [errors, setErrors] = useState(
    /** @type {Record<string, string>} */ ({})
  );

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const DOI_RE = /^10\.\S+$/;

  const validate = () => {
    /** @type {Record<string, string>} */
    const e = {};
    /** @type {string[]} */
    const alertMsgs = [];

    // Contexto mínimo requerido
    if (!idThesis && !idUser && !idInstitution) {
      alertMsgs.push(
        "Missing context: provide idUser or idInstitution to create a thesis."
      );
    }

    // Campos requeridos
    if (!title.trim()) e.title = "Title is required.";
    if (!language) e.language = "Language is required.";
    if (!degree) e.degree = "Degree is required.";
    if (!field.trim()) e.field = "Field/Area is required.";

    // Año válido
    if (!year) {
      e.year = "Year is required.";
    } else {
      const n = Number(year);
      const current = new Date().getFullYear() + 2;
      if (Number.isNaN(n) || n < 1900 || n > current) {
        e.year = "Enter a valid year.";
      }
    }

    // DOI opcional pero validado
    if (doi.trim() && !DOI_RE.test(doi.trim()))
      e.doi = "Enter a valid DOI (e.g., 10.xxxx/xxxxx).";

    // Autores: al menos uno válido
    const validAuthors = authors.filter(
      (a) => a.firstName.trim() && a.lastName.trim()
    );
    if (validAuthors.length === 0) {
      e.authors = "At least one author (first and last name) is required.";
    }

    // Emails de autores (si se llenan)
    authors.forEach((a, idx) => {
      if (a.email && !EMAIL_RE.test(a.email))
        e[`author_email_${idx}`] = "Invalid author email.";
    });

    // Institución válida dentro de las disponibles
    if (!institutionId) {
      e.institutionId = "Institution is required.";
    } else {
      const exists = availableInstitutions.some(
        (i) => String(i._id) === String(institutionId)
      );
      if (!exists && availableInstitutions.length > 0) {
        e.institutionId =
          "Selected institution is not available for this user/context.";
      }
    }

    // Resumen + keywords mínimas
    if (!summary.trim()) e.summary = "Summary is required.";
    if (keywords.length < 3)
      e.keywords = "At least three keywords are required.";

    // Tutors: al menos uno válido
    const validTutors = tutors.filter(
      (t) => t.firstName.trim() && t.lastName.trim()
    );
    if (validTutors.length === 0)
      e.tutors = "At least one tutor (first and last name) is required.";

    // En creación, PDF es obligatorio
    if (!idThesis && !pdfFile) {
      e.pdf = "PDF file is required.";
    }

    setErrors(e);

    // Une mensajes para mostrarlos en el alert general
    const fieldMsgs = Object.values(e);
    const merged = [...alertMsgs, ...fieldMsgs];
    if (merged.length > 0) {
      showAlert("danger", merged);
      return false;
    }

    clearAlert();
    return true;
  };

  // Helpers UI: estado de certificación (badge/botón)
  const statusUi = useMemo(() => {
    const s = String(status || "PENDING").toUpperCase();

    if (s === "APPROVED") {
      return {
        label: "Approved",
        className: "btn btn-memory",
        icon: CheckCircle,
      };
    }

    if (s === "REJECTED") {
      return {
        label: "Rejected",
        className: "btn btn-danger",
        icon: CrossCircle,
      };
    }

    return {
      label: "Pending",
      className: "btn btn-warning",
      icon: TimeCircle,
    };
  }, [status]);

  // Inicialización (create/update según contexto)
  useEffect(() => {
    if (hasInitializedRef.current) return;

    // Contexto faltante
    if (!idUser && !idThesis && !idInstitution) {
      showAlert("warning", [
        "Missing context: provide idUser or idInstitution to create a thesis, or idThesis to edit one.",
      ]);
      return;
    }

    if (!institutionOptions || institutionOptions.length === 0) return;

    const init = async () => {
      setIsInitializing(true);
      clearAlert();

      try {
        const token = localStorage.getItem("memorychain_token");
        const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

        // Por defecto usamos todas las instituciones recibidas
        setAvailableInstitutions(institutionOptions);

        // MODO EDICIÓN (idThesis)
        if (idThesis) {
          const thesisRes = await axios.get(
            `${API_BASE_URL}/api/theses/${idThesis}`,
            headers ? { headers } : undefined
          );
          const t = thesisRes.data;

          // Carga campos de la tesis
          setTitle(t.title || "");
          setLanguage(t.language || "");
          setDegree(t.degree || "");
          setField(t.field || "");
          setYear(t.year ? String(t.year) : "");
          setSummary(t.summary || "");
          setDoi(t.doi || "");
          setKeywords(Array.isArray(t.keywords) ? t.keywords : []);

          // Estado + likes (solo informativo)
          setStatus(String(t.status || "PENDING").toUpperCase());
          setLikesCount(Number(t.likes ?? 0));

          // Institución + departamento
          const instIdVal = normalizeInstId(t.institution);
          setInstitutionId(instIdVal);
          setDepartment(t.department || "");

          // Autores (soporta strings u objetos)
          let mappedAuthors = [{ firstName: "", lastName: "", email: "" }];
          if (Array.isArray(t.authors) && t.authors.length > 0) {
            mappedAuthors = t.authors.map((a) => {
              if (typeof a === "string") {
                const sp = splitFullName(a);
                return {
                  firstName: sp.firstName,
                  lastName: sp.lastName,
                  email: "",
                };
              }
              const firstName = a.name || a.firstName || a.firstname || "";
              const lastName = a.lastname || a.lastName || "";
              return { firstName, lastName, email: a.email || "" };
            });
          }
          setAuthors(mappedAuthors);

          // Tutors (soporta strings u objetos)
          let mappedTutors = [{ firstName: "", lastName: "", email: "" }];
          if (Array.isArray(t.tutors) && t.tutors.length > 0) {
            mappedTutors = t.tutors.map((tu) => {
              if (typeof tu === "string") {
                const sp = splitFullName(tu);
                return {
                  firstName: sp.firstName,
                  lastName: sp.lastName,
                  email: "",
                };
              }
              const firstName = tu.name || tu.firstName || tu.firstname || "";
              const lastName = tu.lastname || tu.lastName || "";
              return { firstName, lastName, email: tu.email || "" };
            });
          }
          setTutors(mappedTutors);

          // Update: no precargar PDF (si sube uno, se reemplaza)
          removePdf();

          // Bloquea el autor 1 también en update (tu cambio)
          setDisableAuthor1(true);

          // Si viene una institución fija, restringimos el select
          if (idInstitution) {
            const only = institutionOptions.filter(
              (i) => String(i._id) === String(idInstitution)
            );
            setAvailableInstitutions(only);
            setInstitutionId(String(idInstitution));
            setDisableInstitutionSelect(true);
          } else if (idUser) {
            // Si viene un usuario, filtramos instituciones a las que pertenece
            const uRes = await axios.get(
              `${API_BASE_URL}/api/users/${idUser}`,
              headers ? { headers } : undefined
            );
            const u = uRes.data;

            const ids = extractUserInstitutionIds(u);
            const userInstitutions = institutionOptions.filter((i) =>
              ids.includes(String(i._id))
            );

            // Asegura que la institución de la tesis exista en el listado final
            const thesisInstExists = userInstitutions.some(
              (i) => String(i._id) === String(instIdVal)
            );
            const finalList = thesisInstExists
              ? userInstitutions
              : [
                  ...userInstitutions,
                  ...institutionOptions.filter(
                    (i) => String(i._id) === String(instIdVal)
                  ),
                ];

            setAvailableInstitutions(finalList);
          }

          hasInitializedRef.current = true;
          return;
        }

        // MODO CREACIÓN (idInstitution)
        if (idInstitution && !idUser) {
          const only = institutionOptions.filter(
            (i) => String(i._id) === String(idInstitution)
          );
          setAvailableInstitutions(only);
          setInstitutionId(String(idInstitution));
          setDisableInstitutionSelect(true);

          // En creación por institución, autor 1 no se bloquea
          setDisableAuthor1(false);

          hasInitializedRef.current = true;
          return;
        }

        // MODO CREACIÓN (idUser)
        if (idUser && !idInstitution) {
          const uRes = await axios.get(
            `${API_BASE_URL}/api/users/${idUser}`,
            headers ? { headers } : undefined
          );
          const u = uRes.data;

          // Autocompleta autor 1 con el usuario
          setAuthors([
            {
              firstName: u.name || "",
              lastName: u.lastname || "",
              email: u.email || "",
            },
          ]);
          setDisableAuthor1(true);

          // Filtra instituciones del usuario
          const ids = extractUserInstitutionIds(u);
          const userInstitutions = institutionOptions.filter((i) =>
            ids.includes(String(i._id))
          );

          setAvailableInstitutions(userInstitutions);

          // Si solo hay una, la selecciona automáticamente
          if (userInstitutions.length === 1) {
            setInstitutionId(String(userInstitutions[0]._id));
          } else {
            setInstitutionId("");
          }

          setStatus("PENDING");
          setLikesCount(0);

          hasInitializedRef.current = true;
          return;
        }

        // Contexto no válido
        showAlert("warning", [
          "Invalid context: provide idThesis, or (idUser XOR idInstitution).",
        ]);
      } catch (err) {
        console.error("Error initializing FormThesis:", err);
        showAlert(
          "danger",
          "Error initializing the thesis form. Check console."
        );
      } finally {
        setIsInitializing(false);
      }
    };

    init();
  }, [idUser, idThesis, idInstitution, institutionOptions]);

  // Envío del formulario (create/update)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    // Payload normalizado para backend
    const payload = {
      title: title.trim(),
      authors: authors
        .filter((a) => a.firstName.trim() && a.lastName.trim())
        .map((a) => ({
          name: a.firstName.trim(),
          lastname: a.lastName.trim(),
          email: a.email?.trim() || undefined,
        })),
      tutors: tutors
        .filter((t) => t.firstName.trim() && t.lastName.trim())
        .map((t) => ({
          name: t.firstName.trim(),
          lastname: t.lastName.trim(),
          email: t.email?.trim() || undefined,
        })),
      summary: summary.trim(),
      keywords,
      language,
      degree,
      field: field.trim(),
      year: Number(year),
      institution: institutionId,
      department: department || undefined,
      doi: doi.trim() || undefined,
      status: "PENDING",
    };

    try {
      setIsSubmitting(true);
      clearAlert();

      // Si el padre pasa una función onSubmit, delegamos el envío
      if (typeof onSubmit === "function") {
        await onSubmit({
          payload,
          pdfFile,
          idThesis,
          mode: idThesis ? "update" : "create",
        });
        return;
      }

      // Headers de auth desde localStorage
      const token = localStorage.getItem("memorychain_token");
      const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

      // UPDATE (PATCH)
      if (idThesis) {
        // Si se adjunta PDF, se manda multipart
        if (pdfFile) {
          const formData = new FormData();
          formData.append("pdf", pdfFile);
          formData.append("data", JSON.stringify(payload));

          const res = await axios.patch(
            `${API_BASE_URL}/api/theses/${idThesis}`,
            formData,
            { headers: { ...authHeaders } }
          );

          // Actualiza status/likes si backend responde
          const updated = res?.data;
          if (updated) {
            setStatus(String(updated.status || "PENDING").toUpperCase());
            setLikesCount(Number(updated.likes ?? likesCount));
          }

          showAlert("success", "Thesis updated successfully (PDF updated).");
          removePdf();
        } else {
          // Si NO hay PDF, se manda JSON normal
          const res = await axios.patch(
            `${API_BASE_URL}/api/theses/${idThesis}`,
            payload,
            {
              headers: { ...authHeaders, "Content-Type": "application/json" },
            }
          );

          const updated = res?.data;
          if (updated) {
            setStatus(String(updated.status || "PENDING").toUpperCase());
            setLikesCount(Number(updated.likes ?? likesCount));
          }

          showAlert("success", "Thesis updated successfully.");
        }
      }

      // CREATE (POST)
      else {
        const formData = new FormData();
        formData.append("pdf", pdfFile);
        formData.append("data", JSON.stringify(payload));

        const res = await axios.post(`${API_BASE_URL}/api/theses`, formData, {
          headers: { ...authHeaders },
        });

        setStatus("PENDING");
        setLikesCount(0);

        // Muestra enlaces si el backend los devuelve
        const gw = res?.data?.gatewayUrl;
        const ipfsUrl = res?.data?.ipfsUrl;

        if (gw || ipfsUrl) {
          showAlert(
            "success",
            [
              "Thesis created successfully.",
              gw ? `Gateway: ${gw}` : "",
              ipfsUrl ? `IPFS: ${ipfsUrl}` : "",
            ].filter(Boolean)
          );
        } else {
          showAlert("success", "Thesis created successfully.");
        }

        removePdf();
      }
    } catch (err) {
      console.error("Error submitting thesis:", err);

      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "There was an error submitting the thesis.";

      showAlert("danger", msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Bloqueo global para inputs/botones
  const disabledGlobal = isSubmitting || isInitializing;

  // Render del formulario
  return (
    <form className="container" onSubmit={handleSubmit}>
      {/* Alert global (lista de errores o mensajes) */}
      {formAlert.type && formAlert.messages.length > 0 && (
        <div className={`alert alert-${formAlert.type} mt-3`} role="alert">
          <div className="fw-semibold mb-1">
            {formAlert.type === "danger"
              ? "Please fix the following:"
              : formAlert.type === "success"
              ? "Done"
              : "Notice"}
          </div>
          <ul className="m-0 ps-3">
            {formAlert.messages.map((m, idx) => (
              <li key={`alert-${idx}`}>{m}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Sección: Datos básicos */}
      <section className="mb-4">
        <h5 className="mb-3">Basic information</h5>

        <div className="mb-3">
          <label className="form-label">Title </label>
          <input
            className={`form-control ${errors.title ? "is-invalid" : ""}`}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Thesis title"
            disabled={disabledGlobal}
          />
          {errors.title && (
            <div className="invalid-feedback">{errors.title}</div>
          )}
        </div>

        <div className="row g-3">
          <div className="col-md-6">
            <label className="form-label">Language </label>
            <select
              className={`form-select ${errors.language ? "is-invalid" : ""}`}
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              disabled={disabledGlobal}
            >
              <option value="">— Select —</option>
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="pt">Portuguese</option>
              <option value="ch">Chinese</option>
              <option value="ko">Korean</option>
              <option value="ru">Russian</option>
            </select>
            {errors.language && (
              <div className="invalid-feedback">{errors.language}</div>
            )}
          </div>

          <div className="col-md-6">
            <label className="form-label">Degree </label>
            <select
              className={`form-select ${errors.degree ? "is-invalid" : ""}`}
              value={degree}
              onChange={(e) => setDegree(e.target.value)}
              disabled={disabledGlobal}
            >
              <option value="">— Select —</option>
              <option value="Bachelor">Bachelor</option>
              <option value="Master">Master</option>
              <option value="PhD">PhD / Doctorate</option>
            </select>
            {errors.degree && (
              <div className="invalid-feedback">{errors.degree}</div>
            )}
          </div>
        </div>

        <div className="row g-3 mt-1">
          <div className="col-md-6">
            <label className="form-label">Field / Area </label>
            <input
              className={`form-control ${errors.field ? "is-invalid" : ""}`}
              value={field}
              onChange={(e) => setField(e.target.value)}
              placeholder="e.g., Computer Science"
              disabled={disabledGlobal}
            />
            {errors.field && (
              <div className="invalid-feedback">{errors.field}</div>
            )}
          </div>

          <div className="col-md-3">
            <label className="form-label">Year </label>
            <input
              className={`form-control ${errors.year ? "is-invalid" : ""}`}
              type="number"
              min="1900"
              max={new Date().getFullYear() + 2}
              value={year}
              onChange={(e) => setYear(e.target.value)}
              placeholder="YYYY"
              disabled={disabledGlobal}
            />
            {errors.year && (
              <div className="invalid-feedback">{errors.year}</div>
            )}
          </div>

          <div className="col-md-3">
            <label className="form-label">DOI (optional)</label>
            <input
              className={`form-control ${errors.doi ? "is-invalid" : ""}`}
              value={doi}
              onChange={(e) => setDoi(e.target.value)}
              placeholder="10.xxxx/xxxxx"
              disabled={disabledGlobal}
            />
            {errors.doi && <div className="invalid-feedback">{errors.doi}</div>}
          </div>
        </div>
      </section>

      <hr className="my-4" />

      {/* Sección: Autores y tutores */}
      <section className="mb-4">
        <h5 className="mb-3">Authors & Tutors</h5>

        <div className="mb-2 d-flex align-items-center justify-content-between">
          <span className="form-label m-0">Authors </span>
          <button
            type="button"
            className="btn btn-sm btn-outline-memory"
            onClick={addAuthor}
            disabled={disabledGlobal}
          >
            Add author
          </button>
        </div>

        {errors.authors && (
          <div className="text-danger small mb-2">{errors.authors}</div>
        )}

        <div className="d-flex flex-column gap-3">
          {authors.map((a, idx) => {
            const lockThisAuthor = disableAuthor1 && idx === 0;
            const disabledAuthor = disabledGlobal || lockThisAuthor;

            return (
              <div className="row g-2" key={`author-${idx}`}>
                <div className="col-md-3">
                  <input
                    className="form-control"
                    value={a.firstName}
                    onChange={(e) =>
                      updateAuthor(idx, "firstName", e.target.value)
                    }
                    placeholder={`Author ${idx + 1} - First name`}
                    disabled={disabledAuthor}
                  />
                </div>

                <div className="col-md-3">
                  <input
                    className="form-control"
                    value={a.lastName}
                    onChange={(e) =>
                      updateAuthor(idx, "lastName", e.target.value)
                    }
                    placeholder={`Author ${idx + 1} - Last name`}
                    disabled={disabledAuthor}
                  />
                </div>

                <div className="col-md-4">
                  <input
                    className={`form-control ${
                      errors[`author_email_${idx}`] ? "is-invalid" : ""
                    }`}
                    type="email"
                    value={a.email || ""}
                    onChange={(e) => updateAuthor(idx, "email", e.target.value)}
                    placeholder={`Author ${idx + 1} - Email`}
                    disabled={disabledAuthor}
                  />
                  {errors[`author_email_${idx}`] && (
                    <div className="invalid-feedback">
                      {errors[`author_email_${idx}`]}
                    </div>
                  )}
                </div>

                <div className="col-md-2 d-grid">
                  <button
                    type="button"
                    className="btn btn-outline-danger"
                    onClick={() => removeAuthor(idx)}
                    disabled={
                      authors.length === 1 || disabledGlobal || lockThisAuthor
                    }
                    title="Remove author"
                  >
                    ×
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4">
          <div className="mb-2 d-flex align-items-center justify-content-between">
            <span className="form-label m-0">Tutors </span>
            <button
              type="button"
              className="btn btn-sm btn-outline-memory"
              onClick={addTutor}
              disabled={disabledGlobal}
            >
              Add tutor
            </button>
          </div>

          {errors.tutors && (
            <div className="text-danger small mb-2">{errors.tutors}</div>
          )}

          <div className="d-flex flex-column gap-3">
            {tutors.map((t, idx) => (
              <div className="row g-2" key={`tutor-${idx}`}>
                <div className="col-md-4">
                  <input
                    className="form-control"
                    value={t.firstName}
                    onChange={(e) =>
                      updateTutor(idx, "firstName", e.target.value)
                    }
                    placeholder={`Tutor ${idx + 1} - First name`}
                    disabled={disabledGlobal}
                  />
                </div>

                <div className="col-md-4">
                  <input
                    className="form-control"
                    value={t.lastName}
                    onChange={(e) =>
                      updateTutor(idx, "lastName", e.target.value)
                    }
                    placeholder={`Tutor ${idx + 1} - Last name`}
                    disabled={disabledGlobal}
                  />
                </div>

                <div className="col-md-2">
                  <input
                    className="form-control"
                    type="email"
                    value={t.email || ""}
                    onChange={(e) => updateTutor(idx, "email", e.target.value)}
                    placeholder="Email (optional)"
                    disabled={disabledGlobal}
                  />
                </div>

                <div className="col-md-2 d-grid">
                  <button
                    type="button"
                    className="btn btn-outline-danger"
                    onClick={() => removeTutor(idx)}
                    disabled={disabledGlobal || tutors.length === 1}
                    title="Remove tutor"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <hr className="my-4" />

      {/* Sección: Afiliación (institución / depto) */}
      <section className="mb-4">
        <h5 className="mb-3">Affiliation</h5>

        <div className="row g-3">
          <div className="col-md-6">
            <label className="form-label">Institution </label>
            <select
              className={`form-select ${
                errors.institutionId ? "is-invalid" : ""
              }`}
              value={institutionId}
              onChange={(e) => {
                setInstitutionId(e.target.value);
                setDepartment("");
              }}
              disabled={disabledGlobal || disableInstitutionSelect}
            >
              <option value="">— Select Institution —</option>
              {availableInstitutions.map((i) => (
                <option key={i._id} value={i._id}>
                  {i.name}
                </option>
              ))}
            </select>

            {errors.institutionId && (
              <div className="invalid-feedback">{errors.institutionId}</div>
            )}

            {!disabledGlobal && availableInstitutions.length === 0 && (
              <div className="alert alert-warning mt-2 py-2" role="alert">
                You don&apos;t belong to any institution yet. Add one in your
                profile first.
              </div>
            )}
          </div>

          <div className="col-md-6">
            <label className="form-label">Department</label>
            <select
              className="form-select"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              disabled={departmentOptions.length === 0 || disabledGlobal}
            >
              <option value="">
                {departmentOptions.length
                  ? "— Select —"
                  : "No departments available"}
              </option>
              {departmentOptions.map((d, idx) => (
                <option key={`${d.name}-${idx}`} value={d.name}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <hr className="my-4" />

      {/* Sección: Resumen y palabras clave */}
      <section className="mb-4">
        <h5 className="mb-3">Summary and Keywords</h5>

        <textarea
          className={`form-control ${errors.summary ? "is-invalid" : ""}`}
          rows={4}
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="Summary of the thesis"
          disabled={disabledGlobal}
        />
        {errors.summary && (
          <div className="invalid-feedback d-block">{errors.summary}</div>
        )}

        <div className="row g-2 align-items-end mt-2">
          <div className="col-md-8">
            <label className="form-label">Add keyword</label>
            <input
              className={`form-control ${errors.keywords ? "is-invalid" : ""}`}
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              onKeyDown={onKeywordKeyDown}
              placeholder="Press Enter to add"
              disabled={disabledGlobal}
            />
            {errors.keywords && (
              <div className="invalid-feedback d-block">{errors.keywords}</div>
            )}
          </div>

          <div className="col-md-4 d-grid">
            <button
              type="button"
              className="btn btn-outline-memory"
              onClick={addKeyword}
              disabled={!keywordInput.trim() || disabledGlobal}
            >
              Add
            </button>
          </div>
        </div>

        <div className="mt-3 d-flex flex-wrap gap-2">
          {keywords.length === 0 ? (
            <span className="text-muted">No keywords added.</span>
          ) : (
            keywords.map((k) => (
              <span
                key={k}
                className="badge text-bg-light d-flex align-items-center gap-2"
              >
                {k}
                <button
                  type="button"
                  className="btn btn-sm btn-link text-danger p-0"
                  onClick={() => removeKeyword(k)}
                  disabled={disabledGlobal}
                >
                  ×
                </button>
              </span>
            ))
          )}
        </div>
      </section>

      <hr className="my-4" />

      {/* Sección: Envío (PDF + estado) */}
      <section className="mb-4">
        <h5 className="mb-3">Submission</h5>

        <div className="row g-3 align-items-start">
          <div className="col-lg-8">
            <label className="form-label d-block">
              PDF File {!idThesis && <span className="text-danger">*</span>}
              {idThesis && <span className="text-muted"> (optional)</span>}
            </label>

            {/* Zona drag & drop */}
            <div
              role="button"
              tabIndex={0}
              onKeyDown={(ev) => {
                if (ev.key === "Enter" || ev.key === " ") onPickPdf();
              }}
              onDrop={onDrop}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDragEnd={onDragLeave}
              onClick={onPickPdf}
              style={{
                border: `2px dashed ${isDragging ? "#20c997" : "#ced4da"}`,
                background: isDragging
                  ? "rgba(32, 201, 151, 0.06)"
                  : "transparent",
                borderRadius: 12,
                padding: "18px",
                cursor: disabledGlobal ? "not-allowed" : "pointer",
                transition: "all .15s ease-in-out",
                opacity: disabledGlobal ? 0.7 : 1,
              }}
            >
              <div className="d-flex flex-column flex-md-row align-items-center justify-content-between gap-2">
                <div className="text-muted">
                  {pdfName ? (
                    <span>
                      <strong>Selected:</strong> {pdfName}
                    </span>
                  ) : (
                    <span>Drag & drop your PDF here, or click to browse</span>
                  )}

                  {/* Mensaje extra en update (si no quieres cambiar PDF, no subas nada) */}
                  {idThesis && !pdfName && (
                    <div className="small mt-2">
                      <span className="text-muted">
                        Do not upload any files if you do not want to modify the
                        PDF.
                      </span>
                    </div>
                  )}
                </div>

                <div className="d-flex align-items-center gap-2">
                  <button
                    type="button"
                    className="btn btn-outline-memory"
                    onClick={onPickPdf}
                    disabled={disabledGlobal}
                  >
                    Select PDF
                  </button>

                  {pdfName && (
                    <button
                      type="button"
                      className="btn btn-outline-danger btn-sm"
                      onClick={(ev) => {
                        ev.stopPropagation();
                        removePdf();
                      }}
                      disabled={disabledGlobal}
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Input real (oculto) */}
            <input
              ref={pdfInputRef}
              type="file"
              accept="application/pdf"
              onChange={onPdfChange}
              hidden
              disabled={disabledGlobal}
            />

            {errors.pdf && (
              <div className="text-danger small mt-2">{errors.pdf}</div>
            )}

            {!idThesis && (
              <div className="alert alert-info mt-2 py-2" role="alert">
                PDF will be uploaded to Pinata/IPFS when you submit.
              </div>
            )}
          </div>

          {/* Panel lateral (status + likes) */}
          <div className="col-lg-4">
            <div className="row g-3">
              <div className="col-sm-6">
                <label className="form-label d-block">
                  Certification status
                </label>
                <button
                  type="button"
                  className={`${statusUi.className} d-flex align-items-center justify-content-center gap-2 w-100`}
                >
                  {statusUi.icon}
                  <span className="fw-semibold t-white">{statusUi.label}</span>
                </button>
              </div>

              <div className="col-sm-6">
                <label className="form-label d-block">Number of Like</label>
                <button
                  type="button"
                  className="btn btn-danger btn-extend d-flex align-items-center justify-content-center gap-2 w-100"
                >
                  {HeartFill}
                  <span className="fw-semibold">{likesCount}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Acciones finales */}
      <div className="mt-4 d-flex justify-content-end gap-2">
        <button
          type="button"
          className="btn btn-outline-memory"
          onClick={() => window.history.back()}
          disabled={disabledGlobal}
        >
          Cancel
        </button>

        <button
          type="submit"
          className="btn btn-memory"
          disabled={disabledGlobal || (!idThesis && !idUser && !idInstitution)}
        >
          {isSubmitting && (
            <span
              className="spinner-border spinner-border-sm me-2"
              role="status"
              aria-hidden="true"
            />
          )}
          {idThesis ? "Update thesis" : "Save thesis"}
        </button>
      </div>
    </form>
  );
};

export default FormThesis;
