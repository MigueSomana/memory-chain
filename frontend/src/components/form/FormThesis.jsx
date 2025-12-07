import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { HeartFill } from "../../utils/icons";

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
  // ---------- SUBMIT / INIT STATE ----------
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const hasInitializedRef = useRef(false);

  // instituciones disponibles (pueden filtrarse en base al user / institution)
  const [availableInstitutions, setAvailableInstitutions] =
    useState(institutionOptions);

  // control de bloqueo
  const [disableAuthor1, setDisableAuthor1] = useState(false);
  const [disableInstitutionSelect, setDisableInstitutionSelect] =
    useState(false);

  // ---------- FILE (PDF) ----------
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfName, setPdfName] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const pdfInputRef = useRef(null);

  const acceptPdf = (f) => {
    if (!f) return false;
    if (f.type !== "application/pdf") {
      alert("Only PDF files are allowed.");
      return false;
    }
    if (f.size > MAX_PDF_BYTES) {
      alert(`PDF must be less than ${MAX_PDF_MB}MB.`);
      return false;
    }
    return true;
  };
  const loadPdf = (f) => {
    if (!acceptPdf(f)) return;
    setPdfFile(f);
    setPdfName(f.name);
  };
  const onPickPdf = () => pdfInputRef.current?.click();
  const onPdfChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    loadPdf(f);
  };
  const onDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (isSubmitting || isInitializing) return;
    const f = e.dataTransfer.files?.[0];
    if (!f) return;
    loadPdf(f);
  };
  const onDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isSubmitting && !isInitializing) setIsDragging(true);
  };
  const onDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  const removePdf = () => {
    setPdfFile(null);
    setPdfName("");
    if (pdfInputRef.current) pdfInputRef.current.value = "";
  };

  // ---------- FIELDS ----------
  const [title, setTitle] = useState("");
  const [authors, setAuthors] = useState([
    { firstName: "", lastName: "", email: "" },
  ]);
  const [tutors, setTutors] = useState([{ name: "" }]);

  const [summary, setSummary] = useState("");
  const [keywords, setKeywords] = useState([]);
  const [keywordInput, setKeywordInput] = useState("");

  const [language, setLanguage] = useState("");
  const [degree, setDegree] = useState("");
  const [field, setField] = useState("");
  const [year, setYear] = useState("");
  const [institutionId, setInstitutionId] = useState("");
  const [department, setDepartment] = useState("");
  const [doi, setDoi] = useState(""); // ← opcional

  const status = "pending";

  // ---------- DEPARTMENT OPTIONS ----------
  const departmentOptions = useMemo(() => {
    const inst = availableInstitutions.find((i) => i._id === institutionId);
    const deps = inst?.departments || [];
    return deps.map((d) => (typeof d === "string" ? { name: d } : d));
  }, [institutionId, availableInstitutions]);

  // ---------- AUTHORS ----------
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

  // ---------- TUTORS ----------
  const addTutor = () => setTutors((prev) => [...prev, { name: "" }]);
  const removeTutor = (index) =>
    setTutors((prev) => prev.filter((_, i) => i !== index));
  const updateTutor = (index, value) =>
    setTutors((prev) =>
      prev.map((t, i) => (i === index ? { name: value } : t))
    );

  // ---------- KEYWORDS ----------
  const addKeyword = () => {
    const v = keywordInput.trim();
    if (!v) return;
    const exists = keywords.some((k) => k.toLowerCase() === v.toLowerCase());
    if (!exists) setKeywords((prev) => [...prev, v]);
    setKeywordInput("");
  };
  const removeKeyword = (k) => {
    setKeywords((prev) => prev.filter((x) => x !== k));
  };
  const onKeywordKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addKeyword();
    }
  };

  // ---------- VALIDATION ----------
  const [errors, setErrors] = useState({});
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const DOI_RE = /^10\.\S+$/; // chequeo mínimo si el usuario rellena DOI

  const validate = () => {
    const e = {};

    // BASIC INFO (obligatorios excepto DOI)
    if (!title.trim()) e.title = "Title is required.";
    if (!language) e.language = "Language is required.";
    if (!degree) e.degree = "Degree is required.";
    if (!field.trim()) e.field = "Field/Area is required.";
    if (!year) {
      e.year = "Year is required.";
    } else {
      const n = Number(year);
      const current = new Date().getFullYear() + 2;
      if (Number.isNaN(n) || n < 1900 || n > current) {
        e.year = "Enter a valid year.";
      }
    }
    // DOI opcional → validar sólo si se completa
    if (doi.trim() && !DOI_RE.test(doi.trim())) {
      e.doi = "Enter a valid DOI (e.g., 10.xxxx/xxxxx).";
    }

    // AUTHORS (≥1 con first+last)
    const validAuthors = authors.filter(
      (a) => a.firstName.trim() && a.lastName.trim()
    );
    if (validAuthors.length === 0)
      e.authors = "At least one author (first and last name) is required.";
    authors.forEach((a, idx) => {
      if (a.email && !EMAIL_RE.test(a.email))
        e[`author_email_${idx}`] = "Invalid author email.";
    });

    // AFFILIATION
    if (!institutionId) e.institutionId = "Institution is required.";

    // SUMMARY obligatorio
    if (!summary.trim()) e.summary = "Summary is required.";

    // KEYWORDS obligatorias (≥3)
    if (keywords.length < 3)
      e.keywords = "At least three keywords are required.";

    // TUTORS (≥1 con nombre)
    const validTutors = tutors.filter((t) => t.name.trim());
    if (validTutors.length === 0) e.tutors = "At least one tutor is required.";

    // PDF: requerido solo al crear (no al editar)
    if (!idThesis && !pdfFile) e.pdf = "PDF file is required.";

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ---------- HELPERS PARA MAPEAR MODELS ----------
  const splitFullName = (fullName = "") => {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 0) return { firstName: "", lastName: "" };
    if (parts.length === 1) return { firstName: parts[0], lastName: "" };
    return {
      firstName: parts[0],
      lastName: parts.slice(1).join(" "),
    };
  };

  // ---------- INIT: precarga según idUser / idThesis / idInstitution ----------
  useEffect(() => {
    // si ya inicializamos, no volvemos a hacerlo
    if (hasInitializedRef.current) return;

    // si no hay contexto, no hacemos nada
    if (!idUser && !idThesis && !idInstitution) return;

    // si aún no tenemos institutions del padre, esperamos
    if (!institutionOptions || institutionOptions.length === 0) return;

    const init = async () => {
      setIsInitializing(true);

      try {
        const token = localStorage.getItem("memorychain_token");
        const headers = token
          ? { Authorization: `Bearer ${token}` }
          : undefined;

        // Partimos de las institutions que llegan del padre la primera vez
        setAvailableInstitutions(institutionOptions);

        // ---------- MODO EDICIÓN (idThesis) ----------
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
          setYear(t.year ? String(t.year) : "");
          setSummary(t.summary || "");
          setDoi(t.doi || "");
          setKeywords(Array.isArray(t.keywords) ? t.keywords : []);

          let instIdVal = "";
          if (typeof t.institution === "string") {
            instIdVal = t.institution;
          } else if (t.institution && t.institution._id) {
            instIdVal = String(t.institution._id);
          }
          setInstitutionId(instIdVal);
          setDepartment(t.department || "");

          let mappedAuthors = [{ firstName: "", lastName: "", email: "" }];
          if (Array.isArray(t.authors) && t.authors.length > 0) {
            mappedAuthors = t.authors.map((a) => {
              if (typeof a === "string") {
                const { firstName, lastName } = splitFullName(a);
                return { firstName, lastName, email: "" };
              }
              const fullFromName = a.name || a.fullName || "";
              let firstName = a.firstName || a.firstname || "";
              let lastName = a.lastName || a.lastname || "";

              if (!firstName && !lastName && fullFromName) {
                const split = splitFullName(fullFromName);
                firstName = split.firstName;
                lastName = split.lastName;
              }

              return {
                firstName,
                lastName,
                email: a.email || "",
              };
            });
          }
          setAuthors(mappedAuthors);

          let mappedTutors = [{ name: "" }];
          if (Array.isArray(t.tutors) && t.tutors.length > 0) {
            mappedTutors = t.tutors.map((tu) =>
              typeof tu === "string" ? { name: tu } : { name: tu.name || "" }
            );
          }
          setTutors(mappedTutors);

          if (idUser) setDisableAuthor1(true);
          if (idInstitution) setDisableInstitutionSelect(true);
        } else {
          // ---------- MODO CREACIÓN (sin idThesis) ----------

          // creación por usuario
          if (idUser && !idInstitution) {
            const userRes = await axios.get(
              `${API_BASE_URL}/api/users/${idUser}`,
              headers ? { headers } : undefined
            );
            const u = userRes.data;

            const firstName = u.name || "";
            const lastName = u.lastname || "";
            const email = u.email || "";

            setAuthors([{ firstName, lastName, email }]);
            setDisableAuthor1(true);

            if (Array.isArray(u.institutions) && u.institutions.length > 0) {
              const instIds = u.institutions.map((ii) => String(ii._id ?? ii));

              const userInstitutions = institutionOptions.filter((i) =>
                instIds.includes(String(i._id))
              );

              setAvailableInstitutions(userInstitutions);

              if (userInstitutions.length === 1) {
                setInstitutionId(userInstitutions[0]._id);
              }
             else {
              setAvailableInstitutions([]); // 🔒 si no pertenece a ninguna
            }
          }}

          // creación por institución
          if (idInstitution && !idUser) {
            const newInstOptions = institutionOptions.filter(
              (i) => String(i._id) === String(idInstitution)
            );
            setAvailableInstitutions(newInstOptions);
            setInstitutionId(idInstitution);
            setDisableInstitutionSelect(true);
          }
        }

        // solo marcamos como inicializado si todo el init se ejecutó con institutions
        hasInitializedRef.current = true;
      } catch (err) {
        console.error("Error initializing FormThesis:", err);
      } finally {
        setIsInitializing(false);
      }
    };

    init();
  }, [idUser, idThesis, idInstitution, institutionOptions]);

  // ---------- SUBMIT ----------
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      title: title.trim(),
      authors: authors
        .filter((a) => a.firstName.trim() && a.lastName.trim())
        .map((a) => ({
          name: `${a.firstName.trim()} ${a.lastName.trim()}`.trim(),
          email: a.email?.trim() || undefined,
        })),
      tutors: tutors.map((t) => t.name.trim()).filter(Boolean),
      summary: summary.trim(),
      keywords,
      language,
      degree,
      field: field.trim(),
      year: Number(year),
      institution: institutionId,
      department: department || undefined,
      doi: doi.trim() || undefined, // opcional si viene vacío
      status, // 'pending'
    };

    const mode = idThesis ? "update" : "create";

    try {
      setIsSubmitting(true);
      // si el padre nos pasa onSubmit, delegamos allí la lógica POST/PUT
      if (typeof onSubmit === "function") {
        await onSubmit({ payload, pdfFile, idThesis, mode });
        return;
      }
      // fallback: POST/PUT básico desde el componente
      const token = localStorage.getItem("memorychain_token");
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

      const formData = new FormData();
      if (pdfFile) {
        formData.append("pdf", pdfFile);
      }
      formData.append("data", JSON.stringify(payload));

      if (idThesis) {
        await axios.put(
          `${API_BASE_URL}/api/theses/${idThesis}`,
          formData,
          headers ? { headers } : undefined
        );
        alert("Thesis updated successfully.");
      } else {
        await axios.post(
          `${API_BASE_URL}/api/theses`,
          formData,
          headers ? { headers } : undefined
        );
        alert("Thesis created successfully.");
      }
    } catch (err) {
      console.error("Error submitting thesis:", err);
      alert("There was an error submitting the thesis.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const disabledGlobal = isSubmitting || isInitializing;

  return (
    <form className="container" onSubmit={handleSubmit}>
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
                    className={`form-control ${
                      a.firstName.trim() === "" && idx === 0 && errors.authors
                        ? "is-invalid"
                        : ""
                    }`}
                    value={a.firstName}
                    onChange={(e) =>
                      updateAuthor(idx, "firstName", e.target.value)
                    }
                    placeholder={`Author ${idx + 1} - First name `}
                    disabled={disabledAuthor}
                  />
                </div>
                <div className="col-md-3">
                  <input
                    className={`form-control ${
                      a.lastName.trim() === "" && idx === 0 && errors.authors
                        ? "is-invalid"
                        : ""
                    }`}
                    value={a.lastName}
                    onChange={(e) =>
                      updateAuthor(idx, "lastName", e.target.value)
                    }
                    placeholder={`Author ${idx + 1} - Last name `}
                    disabled={disabledAuthor}
                  />
                </div>
                <div className="col-md-4">
                  <input
                    className={`form-control ${
                      errors[`author_email_${idx}`] ? "is-invalid" : ""
                    }`}
                    type="email"
                    value={a.email}
                    onChange={(e) => updateAuthor(idx, "email", e.target.value)}
                    placeholder={`Author ${idx + 1} - Email `}
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
                <div className="col-md-10">
                  <input
                    className="form-control"
                    value={t.name}
                    onChange={(e) => updateTutor(idx, e.target.value)}
                    placeholder={`Tutor ${idx + 1} Full name`}
                    disabled={disabledGlobal}
                  />
                </div>
                <div className="col-md-2 d-grid">
                  <button
                    type="button"
                    className="btn btn-outline-danger"
                    onClick={() => removeTutor(idx)}
                    disabled={
                      disabledGlobal ||
                      (tutors.length === 1 && !tutors[0].name.trim())
                    }
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

      <section className="mb-4">
        <h5 className="mb-3">Submission</h5>
        <div className="row g-3 align-items-start">
          <div className="col-lg-8">
            <label className="form-label d-block">PDF File </label>
            <div
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") onPickPdf();
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
                      onClick={(e) => {
                        e.stopPropagation();
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
          </div>

          <div className="col-lg-4">
            <div className="row">
              <div className="col-sm-6">
                <label className="form-label d-block">
                  Certification status
                </label>
                <div className="alert alert-warning py-2 px-3 m-0" role="alert">
                  <strong>Pending</strong>
                </div>
              </div>
              <div className="col-sm-6">
                <label className="form-label d-block">Number of Like</label>
                <button
                  type="button"
                  className="btn btn-danger btn-extend d-flex align-items-center justify-content-center"
                  disabled
                >
                  {HeartFill}
                  &nbsp; &nbsp;
                  <span className="fw-semibold"> 0</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

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
          disabled={disabledGlobal}
        >
          {isSubmitting && (
            <span
              className="spinner-border spinner-border-sm me-2"
              role="status"
              aria-hidden="true"
            ></span>
          )}
          Save thesis
        </button>
      </div>
    </form>
  );
};

export default FormThesis;
