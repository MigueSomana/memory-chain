import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import {
  HeartFill,
  CheckCircle,
  TimeCircle,
  CrossCircle,
  BioTIcon,
  UplTIcon,
  InfoTIcon,
  BasicPIcon,
  InstPIcon,
} from "../../utils/icons";

// Configuración base (API + límites)
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";
const MAX_PDF_MB = 25;
const MAX_PDF_BYTES = MAX_PDF_MB * 1024 * 1024;

// Helper: convierte "YYYY-MM-DD" (input date) a ISO seguro (UTC)
const ymdToIsoUtc = (ymd) => {
  if (!ymd) return "";
  const s = String(ymd).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return "";
  const [y, m, d] = s.split("-").map((x) => Number(x));
  if (!y || !m || !d) return "";
  const dt = new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
  if (Number.isNaN(dt.getTime())) return "";
  return dt.toISOString();
};

// Helper: normaliza cualquier fecha (Date / string ISO) a "YYYY-MM-DD" para input type="date"
const toYmd = (value) => {
  if (!value) return "";
  try {
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  } catch {
    return "";
  }
};

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
  const [availableInstitutions, setAvailableInstitutions] =
    useState(institutionOptions);

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

  // ✅ CAMBIO: year -> date
  const [date, setDate] = useState("");

  const [institutionId, setInstitutionId] = useState("");
  const [department, setDepartment] = useState("");

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
  const removeAuthor = (index) =>
    setAuthors((prev) => prev.filter((_, i) => i !== index));
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
  const updateTutor = (index, key, value) => {
    setTutors((prev) =>
      prev.map((t, i) => (i === index ? { ...t, [key]: value } : t))
    );
  };

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

  const removeKeyword = (k) =>
    setKeywords((prev) => prev.filter((x) => x !== k));

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

  const validate = () => {
    const e = {};
    const alertMsgs = [];

    if (!idThesis && !idUser && !idInstitution) {
      alertMsgs.push(
        "Missing context: provide idUser or idInstitution to create a thesis."
      );
    }

    if (!title.trim()) e.title = "Title is required.";
    if (!language) e.language = "Language is required.";
    if (!degree) e.degree = "Degree is required.";
    if (!field.trim()) e.field = "Field/Area is required.";

    if (!date) {
      e.date = "Date is required.";
    } else {
      const iso = ymdToIsoUtc(date);
      if (!iso) {
        e.date = "Enter a valid date.";
      } else {
        const d = new Date(iso);
        const min = new Date(Date.UTC(1900, 0, 1));
        const max = new Date(Date.UTC(new Date().getFullYear() + 2, 11, 31));
        if (d < min || d > max) e.date = "Enter a valid date range.";
      }
    }

    const validAuthors = authors.filter(
      (a) => a.firstName.trim() && a.lastName.trim()
    );
    if (validAuthors.length === 0)
      e.authors = "At least one author (first and last name) is required.";

    authors.forEach((a, idx) => {
      if (a.email && !EMAIL_RE.test(a.email))
        e[`author_email_${idx}`] = "Invalid author email.";
    });

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

    if (!summary.trim()) e.summary = "Summary is required.";
    if (keywords.length < 3)
      e.keywords = "At least three keywords are required.";

    const validTutors = tutors.filter(
      (t) => t.firstName.trim() && t.lastName.trim()
    );
    if (validTutors.length === 0)
      e.tutors = "At least one tutor (first and last name) is required.";

    if (!idThesis && !pdfFile) e.pdf = "PDF file is required.";

    setErrors(e);

    const merged = [...alertMsgs, ...Object.values(e)];
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

    if (s === "APPROVED")
      return {
        label: "Approved",
        className: "btn btn-memory",
        icon: CheckCircle,
      };
    if (s === "REJECTED")
      return {
        label: "Rejected",
        className: "btn btn-danger",
        icon: CrossCircle,
      };
    return { label: "Pending", className: "btn btn-warning", icon: TimeCircle };
  }, [status]);

  // Inicialización (create/update según contexto)
  useEffect(() => {
    if (hasInitializedRef.current) return;

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
        const headers = token
          ? { Authorization: `Bearer ${token}` }
          : undefined;

        setAvailableInstitutions(institutionOptions);

        // EDIT MODE
        if (idThesis) {
          const thesisRes = await axios.get(
            `${API_BASE_URL}/api/theses/${idThesis}`,
            headers ? { headers } : undefined
          );
          const t = thesisRes.data;

          setTitle(t.title || "");
          setLanguage(t.language || "");
          setDegree(t.degree || "");
          setField(t.field || "");
          setDate(toYmd(t.date));

          setSummary(t.summary || "");
          setKeywords(Array.isArray(t.keywords) ? t.keywords : []);

          setStatus(String(t.status || "PENDING").toUpperCase());
          setLikesCount(Number(t.likes ?? 0));

          const instIdVal = normalizeInstId(t.institution);
          setInstitutionId(instIdVal);
          setDepartment(t.department || "");

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

          removePdf();
          setDisableAuthor1(true);

          if (idInstitution) {
            const only = institutionOptions.filter(
              (i) => String(i._id) === String(idInstitution)
            );
            setAvailableInstitutions(only);
            setInstitutionId(String(idInstitution));
            setDisableInstitutionSelect(true);
          } else if (idUser) {
            const uRes = await axios.get(
              `${API_BASE_URL}/api/users/${idUser}`,
              headers ? { headers } : undefined
            );
            const u = uRes.data;

            const ids = extractUserInstitutionIds(u);
            const userInstitutions = institutionOptions.filter((i) =>
              ids.includes(String(i._id))
            );

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

        // CREATE by institution
        if (idInstitution && !idUser) {
          const only = institutionOptions.filter(
            (i) => String(i._id) === String(idInstitution)
          );
          setAvailableInstitutions(only);
          setInstitutionId(String(idInstitution));
          setDisableInstitutionSelect(true);
          setDisableAuthor1(false);
          hasInitializedRef.current = true;
          return;
        }

        // CREATE by user
        if (idUser && !idInstitution) {
          const uRes = await axios.get(
            `${API_BASE_URL}/api/users/${idUser}`,
            headers ? { headers } : undefined
          );
          const u = uRes.data;

          setAuthors([
            {
              firstName: u.name || "",
              lastName: u.lastname || "",
              email: u.email || "",
            },
          ]);
          setDisableAuthor1(true);

          const ids = extractUserInstitutionIds(u);
          const userInstitutions = institutionOptions.filter((i) =>
            ids.includes(String(i._id))
          );
          setAvailableInstitutions(userInstitutions);

          if (userInstitutions.length === 1)
            setInstitutionId(String(userInstitutions[0]._id));
          else setInstitutionId("");

          setStatus("PENDING");
          setLikesCount(0);

          hasInitializedRef.current = true;
          return;
        }

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

    const dateIso = ymdToIsoUtc(date);

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
      date: dateIso,
      institution: institutionId,
      department: department || undefined,
      status: "PENDING",
    };

    try {
      setIsSubmitting(true);
      clearAlert();

      if (typeof onSubmit === "function") {
        await onSubmit({
          payload,
          pdfFile,
          idThesis,
          mode: idThesis ? "update" : "create",
        });
        return;
      }

      const token = localStorage.getItem("memorychain_token");
      const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

      if (idThesis) {
        if (pdfFile) {
          const formData = new FormData();
          formData.append("pdf", pdfFile);
          formData.append("data", JSON.stringify(payload));

          const res = await axios.patch(
            `${API_BASE_URL}/api/theses/${idThesis}`,
            formData,
            {
              headers: { ...authHeaders },
            }
          );

          const updated = res?.data;
          if (updated) {
            setStatus(String(updated.status || "PENDING").toUpperCase());
            setLikesCount(Number(updated.likes ?? likesCount));
          }

          showAlert("success", "Thesis updated successfully (PDF updated).");
          removePdf();
        } else {
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
      } else {
        const formData = new FormData();
        formData.append("pdf", pdfFile);
        formData.append("data", JSON.stringify(payload));

        const res = await axios.post(`${API_BASE_URL}/api/theses`, formData, {
          headers: { ...authHeaders },
        });

        setStatus("PENDING");
        setLikesCount(0);

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

  const disabledGlobal = isSubmitting || isInitializing;

  return (
    <form className="container mb-3" onSubmit={handleSubmit}>
      {/* ✅ CARD: Basic information */}
      <section className="card mc-card-shadow mb-4">
        <div className="card-body">
          <div className="mc-card-header mb-3">
            <h5 className="m-0">Basic information</h5>
            <span>{BioTIcon}</span>
          </div>

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
              <label className="form-label">Language</label>

              <div className="dropdown mc-filter-select mc-select">
                <button
                  className={`btn btn-outline-secondary dropdown-toggle droptoogle-fix mc-dd-toggle
        ${errors.language ? "is-invalid" : ""}`}
                  type="button"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                  disabled={disabledGlobal}
                >
                  <span className="mc-filter-select-text">
                    {language
                      ? {
                          en: "English",
                          es: "Spanish",
                          fr: "French",
                          pt: "Portuguese",
                          ch: "Chinese",
                          ko: "Korean",
                          ru: "Russian",
                        }[language]
                      : "Select"}
                  </span>
                </button>

                <ul className="dropdown-menu mc-select">
                  {[
                    ["en", "English"],
                    ["es", "Spanish"],
                    ["fr", "French"],
                    ["pt", "Portuguese"],
                    ["ch", "Chinese"],
                    ["ko", "Korean"],
                    ["ru", "Russian"],
                  ].map(([value, label]) => (
                    <li key={value}>
                      <button
                        type="button"
                        className={`dropdown-item ${
                          language === value ? "active" : ""
                        }`}
                        onClick={() => setLanguage(value)}
                        disabled={disabledGlobal}
                      >
                        {label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              {errors.language && (
                <div className="invalid-feedback d-block">
                  {errors.language}
                </div>
              )}
            </div>

            <div className="col-md-6">
              <label className="form-label">Degree</label>

              <div className="dropdown mc-filter-select mc-select">
                <button
                  className={`btn btn-outline-secondary dropdown-toggle droptoogle-fix mc-dd-toggle
        ${errors.degree ? "is-invalid" : ""}`}
                  type="button"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                  disabled={disabledGlobal}
                >
                  <span className="mc-filter-select-text">
                    {degree || "Select"}
                  </span>
                </button>

                <ul className="dropdown-menu mc-select">
                  {["Bachelor", "Master", "PhD / Doctorate"].map((opt) => (
                    <li key={opt}>
                      <button
                        type="button"
                        className={`dropdown-item ${
                          degree === opt ? "active" : ""
                        }`}
                        onClick={() => setDegree(opt)}
                        disabled={disabledGlobal}
                      >
                        {opt}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              {errors.degree && (
                <div className="invalid-feedback d-block">{errors.degree}</div>
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

            <div className="col-md-6">
              <label className="form-label">Date</label>

              <DatePicker
                selected={date ? new Date(`${date}T00:00:00`) : null}
                onChange={(d) => {
                  if (!d) return setDate("");
                  const yyyy = d.getFullYear();
                  const mm = String(d.getMonth() + 1).padStart(2, "0");
                  const dd = String(d.getDate()).padStart(2, "0");
                  setDate(`${yyyy}-${mm}-${dd}`);
                }}
                dateFormat="yyyy-MM-dd"
                placeholderText="Select"
                disabled={disabledGlobal}
                popperPlacement="bottom-start"
                wrapperClassName="w-100" // ✅ CLAVE: ocupa el ancho del col
                customInput={
                  <input
                    type="text"
                    readOnly
                    className={`form-control w-100 ${
                      errors.date ? "is-invalid" : ""
                    }`} // ✅ w-100
                  />
                }
              />
              {errors.date && (
                <div className="invalid-feedback d-block">{errors.date}</div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ✅ CARD: Authors & Tutors */}
      <section className="card mc-card-shadow mb-4">
        <div className="card-body">
          <div className="mc-card-header mb-3">
            <h5 className="m-0">Authors & Tutors</h5>
            <span>{BasicPIcon}</span>
          </div>

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
                      onChange={(e) =>
                        updateAuthor(idx, "email", e.target.value)
                      }
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
                      onChange={(e) =>
                        updateTutor(idx, "email", e.target.value)
                      }
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
        </div>
      </section>

      {/* ✅ CARD: Affiliation */}
      <section className="card mc-card-shadow mb-4">
        <div className="card-body">
          <div className="mc-card-header mb-3">
            <h5 className="m-0">Affiliation</h5>
            <span>{InstPIcon}</span>
          </div>

          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label">Institution</label>

              <div className="dropdown mc-filter-select mc-select">
                <button
                  className={`btn btn-outline-secondary dropdown-toggle droptoogle-fix mc-dd-toggle
        ${errors.institutionId ? "is-invalid" : ""}`}
                  type="button"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                  disabled={disabledGlobal || disableInstitutionSelect}
                >
                  <span className="mc-filter-select-text">
                    {institutionId
                      ? availableInstitutions.find(
                          (i) => i._id === institutionId
                        )?.name ?? "Select"
                      : "Select"}
                  </span>
                </button>

                <ul className="dropdown-menu mc-select">
                  {availableInstitutions.map((i) => (
                    <li key={i._id}>
                      <button
                        type="button"
                        className={`dropdown-item ${
                          institutionId === i._id ? "active" : ""
                        }`}
                        onClick={() => {
                          setInstitutionId(i._id);
                          setDepartment(""); // ✅ mantiene tu lógica
                        }}
                        disabled={disabledGlobal || disableInstitutionSelect}
                      >
                        {i.name}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              {errors.institutionId && (
                <div className="invalid-feedback d-block">
                  {errors.institutionId}
                </div>
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

              <div className="dropdown mc-filter-select mc-select">
                <button
                  className="btn btn-outline-secondary dropdown-toggle droptoogle-fix mc-dd-toggle"
                  type="button"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                  disabled={departmentOptions.length === 0 || disabledGlobal}
                >
                  <span className="mc-filter-select-text">
                    {department
                      ? department
                      : departmentOptions.length
                      ? "Select"
                      : "No departments available"}
                  </span>
                </button>

                <ul className="dropdown-menu mc-select">
                  {departmentOptions.map((d, idx) => (
                    <li key={`${d.name}-${idx}`}>
                      <button
                        type="button"
                        className={`dropdown-item ${
                          department === d.name ? "active" : ""
                        }`}
                        onClick={() => setDepartment(d.name)}
                        disabled={
                          disabledGlobal || departmentOptions.length === 0
                        }
                      >
                        {d.name}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ✅ CARD: Summary & Keywords */}
      <section className="card mc-card-shadow mb-4">
        <div className="card-body">
          <div className="mc-card-header mb-3">
            <h5 className="m-0">Summary and Keywords</h5>
            <span>{InfoTIcon}</span>
          </div>

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
                className={`form-control ${
                  errors.keywords ? "is-invalid" : ""
                }`}
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyDown={onKeywordKeyDown}
                placeholder="Press Enter to add"
                disabled={disabledGlobal}
              />
              {errors.keywords && (
                <div className="invalid-feedback d-block">
                  {errors.keywords}
                </div>
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
                  style={{ border: "1px solid rgba(0,0,0,.08)" }}
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
        </div>
      </section>

      {/* ✅ CARD: Submission */}
      <section className="card mc-card-shadow mb-4">
        <div className="card-body">
          <div className="mc-card-header mb-3">
            <h5 className="m-0">Submission</h5>
            <span>{UplTIcon}</span>
          </div>

          <div className="row g-3 align-items-center">
            <div className="col-8">
              <label className="form-label d-block">
                PDF File {!idThesis && <span className="text-danger">*</span>}
                {idThesis && <span className="text-muted"> (optional)</span>}
              </label>

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
                className={`mc-dropzone ${isDragging ? "is-dragging" : ""} ${
                  disabledGlobal ? "is-disabled" : ""
                }`}
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

                    {idThesis && !pdfName && (
                      <div className="small mt-2">
                        <span className="text-muted">
                          Do not upload any files if you do not want to modify
                          the PDF.
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

              {/* ✅ PEDIDO: Pinata alert SOLO en EDIT MODE */}
              {idThesis && (
                <div className="alert alert-info mt-2 py-2" role="alert">
                  PDF will be uploaded to Pinata/IPFS when you submit.
                </div>
              )}
            </div>

            {/* Lateral: cards */}
            <div className="col-2">
              <label className="form-label d-block d-flex justify-content-center">
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

            <div className="col-2 align-item-center">
              <label className="form-label d-block d-flex justify-content-center">
                Number of Like
              </label>
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
      </section>

      {/* Acciones finales */}
      <div className="mt-4 d-flex justify-content-center gap-2">
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
