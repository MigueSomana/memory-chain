import React, { useMemo, useRef, useState } from "react";

const MAX_PDF_MB = 25;
const MAX_PDF_BYTES = MAX_PDF_MB * 1024 * 1024;

const ThesisUpload = ({ institutionOptions = [], onSubmit }) => {
  // ---------- SUBMIT STATE ----------
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    if (isSubmitting) return;
    const f = e.dataTransfer.files?.[0];
    if (!f) return;
    loadPdf(f);
  };
  const onDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isSubmitting) setIsDragging(true);
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
    const inst = institutionOptions.find((i) => i._id === institutionId);
    const deps = inst?.departments || [];
    return deps.map((d) => (typeof d === "string" ? { name: d } : d));
  }, [institutionId, institutionOptions]);

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
    setTutors((prev) => prev.map((t, i) => (i === index ? { name: value } : t)));

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

    // KEYWORDS obligatorias (≥1)
    if (keywords.length === 0) e.keywords = "At least one keyword is required.";

    // PDF
    if (!pdfFile) e.pdf = "PDF file is required.";

    setErrors(e);
    return Object.keys(e).length === 0;
  };

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

    try {
      setIsSubmitting(true);
      if (typeof onSubmit === "function") {
        await onSubmit({ payload, pdfFile });
      } else {
        console.log("SUBMIT Thesis payload ->", payload, pdfFile);
        alert("Form OK (see console). Wire up onSubmit to send it to the backend.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

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
            disabled={isSubmitting}
          />
          {errors.title && <div className="invalid-feedback">{errors.title}</div>}
        </div>

        <div className="row g-3">
          <div className="col-md-6">
            <label className="form-label">Language </label>
            <select
              className={`form-select ${errors.language ? "is-invalid" : ""}`}
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              disabled={isSubmitting}
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
              disabled={isSubmitting}
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
              disabled={isSubmitting}
            />
            {errors.field && <div className="invalid-feedback">{errors.field}</div>}
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
              disabled={isSubmitting}
            />
            {errors.year && <div className="invalid-feedback">{errors.year}</div>}
          </div>
          <div className="col-md-3">
            <label className="form-label">DOI (optional)</label>
            <input
              className={`form-control ${errors.doi ? "is-invalid" : ""}`}
              value={doi}
              onChange={(e) => setDoi(e.target.value)}
              placeholder="10.xxxx/xxxxx"
              disabled={isSubmitting}
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
            disabled={isSubmitting}
          >
            Add author
          </button>
        </div>

        {errors.authors && (
          <div className="text-danger small mb-2">{errors.authors}</div>
        )}

        <div className="d-flex flex-column gap-3">
          {authors.map((a, idx) => (
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
                  disabled={isSubmitting}
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
                  onChange={(e) => updateAuthor(idx, "lastName", e.target.value)}
                  placeholder={`Author ${idx + 1} - Last name `}
                  disabled={isSubmitting}
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
                  disabled={isSubmitting}
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
                  disabled={authors.length === 1 || isSubmitting}
                  title="Remove author"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4">
          <div className="mb-2 d-flex align-items-center justify-content-between">
            <span className="form-label m-0">Tutors </span>
            <button
              type="button"
              className="btn btn-sm btn-outline-memory"
              onClick={addTutor}
              disabled={isSubmitting}
            >
              Add tutor
            </button>
          </div>

          <div className="d-flex flex-column gap-3">
            {tutors.map((t, idx) => (
              <div className="row g-2" key={`tutor-${idx}`}>
                <div className="col-md-10">
                  <input
                    className="form-control"
                    value={t.name}
                    onChange={(e) => updateTutor(idx, e.target.value)}
                    placeholder={`Tutor ${idx + 1} Full name`}
                    disabled={isSubmitting}
                  />
                </div>
                <div className="col-md-2 d-grid">
                  <button
                    type="button"
                    className="btn btn-outline-danger"
                    onClick={() => removeTutor(idx)}
                    disabled={(tutors.length === 1 && !tutors[0].name.trim()) || isSubmitting}
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
              className={`form-select ${errors.institutionId ? "is-invalid" : ""}`}
              value={institutionId}
              onChange={(e) => {
                setInstitutionId(e.target.value);
                setDepartment("");
              }}
              disabled={isSubmitting}
            >
              <option value="">— Select Institution —</option>
              {institutionOptions.map((i) => (
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
              disabled={departmentOptions.length === 0 || isSubmitting}
            >
              <option value="">
                {departmentOptions.length ? "— Select —" : "No departments available"}
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
        <h5 className="mb-3">Summary</h5>
        <textarea
          className={`form-control ${errors.summary ? "is-invalid" : ""}`}
          rows={4}
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="Abstract / Summary of the thesis"
          disabled={isSubmitting}
        />
        {errors.summary && (
          <div className="invalid-feedback d-block">{errors.summary}</div>
        )}
      </section>

      <hr className="my-4" />

      <section className="mb-4">
        <h5 className="mb-3">Keywords</h5>
        <div className="row g-2 align-items-end">
          <div className="col-md-8">
            <label className="form-label">Add keyword</label>
            <input
              className={`form-control ${errors.keywords ? "is-invalid" : ""}`}
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              onKeyDown={onKeywordKeyDown}
              placeholder="Press Enter to add"
              disabled={isSubmitting}
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
              disabled={!keywordInput.trim() || isSubmitting}
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
                  disabled={isSubmitting}
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
                background: isDragging ? "rgba(32, 201, 151, 0.06)" : "transparent",
                borderRadius: 12,
                padding: "18px",
                cursor: isSubmitting ? "not-allowed" : "pointer",
                transition: "all .15s ease-in-out",
                opacity: isSubmitting ? 0.7 : 1,
              }}
            >
              <div className="d-flex flex-column flex-md-row align-items-center justify-content-between gap-2">
                <div className="text-muted">
                  {pdfName ? (
                    <span><strong>Selected:</strong> {pdfName}</span>
                  ) : (
                    <span>Drag & drop your PDF here, or click to browse</span>
                  )}
                </div>
                <div className="d-flex align-items-center gap-2">
                  <button
                    type="button"
                    className="btn btn-outline-memory"
                    onClick={onPickPdf}
                    disabled={isSubmitting}
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
                      disabled={isSubmitting}
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
              disabled={isSubmitting}
            />

            {errors.pdf && (
              <div className="text-danger small mt-2">{errors.pdf}</div>
            )}
          </div>

          <div className="col-lg-4">
            <label className="form-label d-block">Certification status</label>
            <div className="alert alert-warning py-2 px-3 m-0" role="alert">
              <strong>pending</strong>
            </div>
          </div>
        </div>
      </section>

      <div className="mt-4 d-flex justify-content-end gap-2">
        <button
          type="button"
          className="btn btn-outline-memory"
          onClick={() => window.history.back()}
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button type="submit" className="btn btn-memory" disabled={isSubmitting}>
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

export default ThesisUpload;

