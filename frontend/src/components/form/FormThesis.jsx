import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { HeartFill, CheckCircle, TimeCircle, CrossCircle } from "../../utils/icons";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";
const MAX_PDF_MB = 25;
const MAX_PDF_BYTES = MAX_PDF_MB * 1024 * 1024;

/**
 * @typedef {{ _id: string, name: string, emailDomains?: string[], departments?: Array<string | {name: string}>, logo?: string }} Institution
 * @typedef {{ firstName: string, lastName: string, email?: string }} Person
 * @typedef {{
 *  institutionOptions?: Institution[],
 *  onSubmit?: (args: { payload: Record<string, unknown>, pdfFile: File|null, idThesis?: string, mode: "create"|"update" }) => Promise<void>,
 *  idUser?: string,
 *  idThesis?: string,
 *  idInstitution?: string
 * }} Props
 */

/** @param {Props} props */
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

  // instituciones disponibles (filtradas según modo)
  const [availableInstitutions, setAvailableInstitutions] = useState(
    institutionOptions
  );

  // control de bloqueo
  const [disableAuthor1, setDisableAuthor1] = useState(false);
  const [disableInstitutionSelect, setDisableInstitutionSelect] =
    useState(false);

  // alert bootstrap
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

  // ---------- FILE (PDF) ----------
  const [pdfFile, setPdfFile] = useState(/** @type {File|null} */ (null));
  const [pdfName, setPdfName] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const pdfInputRef = useRef(/** @type {HTMLInputElement|null} */ (null));

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

  const loadPdf = (f) => {
    if (!acceptPdf(f)) return;
    setPdfFile(f);
    setPdfName(f.name);
  };

  const onPickPdf = () => pdfInputRef.current?.click();

  const onPdfChange = (e) => {
    const f = e.target.files && e.target.files[0] ? e.target.files[0] : null;
    if (!f) return;
    loadPdf(f);
  };

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

  // status + likes
  const [status, setStatus] = useState("PENDING");
  const [likesCount, setLikesCount] = useState(0);

  // ---------- HELPERS ----------
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
      else if (inst && typeof inst === "object" && inst._id) ids.add(String(inst._id));
    });

    return Array.from(ids);
  };

  // ---------- DEPARTMENT OPTIONS ----------
  const departmentOptions = useMemo(() => {
    const inst = availableInstitutions.find(
      (i) => String(i._id) === String(institutionId)
    );
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
  const addTutor = () =>
    setTutors((prev) => [...prev, { firstName: "", lastName: "", email: "" }]);

  const removeTutor = (index) =>
    setTutors((prev) => prev.filter((_, i) => i !== index));

  const updateTutor = (index, key, value) =>
    setTutors((prev) =>
      prev.map((t, i) => (i === index ? { ...t, [key]: value } : t))
    );

  // ---------- KEYWORDS ----------
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

  const onKeywordKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addKeyword();
    }
  };

  // ---------- VALIDATION ----------
  const [errors, setErrors] = useState(/** @type {Record<string, string>} */ ({}));
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const DOI_RE = /^10\.\S+$/;

  const validate = () => {
    /** @type {Record<string, string>} */
    const e = {};
    /** @type {string[]} */
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

    if (!year) {
      e.year = "Year is required.";
    } else {
      const n = Number(year);
      const current = new Date().getFullYear() + 2;
      if (Number.isNaN(n) || n < 1900 || n > current)
        e.year = "Enter a valid year.";
    }

    if (doi.trim() && !DOI_RE.test(doi.trim()))
      e.doi = "Enter a valid DOI (e.g., 10.xxxx/xxxxx).";

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

    // create requiere pdf
    if (!idThesis && !pdfFile) {
      e.pdf = "PDF file is required.";
    }

    setErrors(e);

    const fieldMsgs = Object.values(e);
    const merged = [...alertMsgs, ...fieldMsgs];
    if (merged.length > 0) {
      showAlert("danger", merged);
      return false;
    }

    clearAlert();
    return true;
  };

  // ---------- STATUS UI HELPERS ----------
  const statusUi = useMemo(() => {
    const s = String(status || "PENDING").toUpperCase();
    if (s === "APPROVED") {
      return { label: "Approved", className: "btn btn-memory", icon: CheckCircle };
    }
    if (s === "REJECTED") {
      return { label: "Rejected", className: "btn btn-danger", icon: CrossCircle };
    }
    return { label: "Pending", className: "btn btn-warning", icon: TimeCircle };
  }, [status]);

  // ---------- INIT ----------
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
        const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

        setAvailableInstitutions(institutionOptions);

        // ---------- EDICIÓN ----------
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
                return { firstName: sp.firstName, lastName: sp.lastName, email: "" };
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
                return { firstName: sp.firstName, lastName: sp.lastName, email: "" };
              }
              const firstName = tu.name || tu.firstName || tu.firstname || "";
              const lastName = tu.lastname || tu.lastName || "";
              return { firstName, lastName, email: tu.email || "" };
            });
          }
          setTutors(mappedTutors);

          // ✅ update: NO precargamos PDF
          removePdf();

          // ✅ TU CAMBIO: en UPDATE también bloqueamos author 1
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

        // ---------- CREACIÓN ----------
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

        if (idUser && !idInstitution) {
          const uRes = await axios.get(
            `${API_BASE_URL}/api/users/${idUser}`,
            headers ? { headers } : undefined
          );
          const u = uRes.data;

          setAuthors([
            { firstName: u.name || "", lastName: u.lastname || "", email: u.email || "" },
          ]);
          setDisableAuthor1(true);

          const ids = extractUserInstitutionIds(u);
          const userInstitutions = institutionOptions.filter((i) =>
            ids.includes(String(i._id))
          );

          setAvailableInstitutions(userInstitutions);

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

        showAlert("warning", [
          "Invalid context: provide idThesis, or (idUser XOR idInstitution).",
        ]);
      } catch (err) {
        console.error("Error initializing FormThesis:", err);
        showAlert("danger", "Error initializing the thesis form. Check console.");
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

      if (typeof onSubmit === "function") {
        await onSubmit({ payload, pdfFile, idThesis, mode: idThesis ? "update" : "create" });
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
            { headers: { ...authHeaders } }
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
            { headers: { ...authHeaders, "Content-Type": "application/json" } }
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
          showAlert("success", [
            "Thesis created successfully.",
            gw ? `Gateway: ${gw}` : "",
            ipfsUrl ? `IPFS: ${ipfsUrl}` : "",
          ].filter(Boolean));
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
    <form className="container" onSubmit={handleSubmit}>
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
          {errors.title && <div className="invalid-feedback">{errors.title}</div>}
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
            {errors.language && <div className="invalid-feedback">{errors.language}</div>}
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
            {errors.degree && <div className="invalid-feedback">{errors.degree}</div>}
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
              disabled={disabledGlobal}
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

        {errors.authors && <div className="text-danger small mb-2">{errors.authors}</div>}

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
                    onChange={(e) => updateAuthor(idx, "firstName", e.target.value)}
                    placeholder={`Author ${idx + 1} - First name`}
                    disabled={disabledAuthor}
                  />
                </div>
                <div className="col-md-3">
                  <input
                    className="form-control"
                    value={a.lastName}
                    onChange={(e) => updateAuthor(idx, "lastName", e.target.value)}
                    placeholder={`Author ${idx + 1} - Last name`}
                    disabled={disabledAuthor}
                  />
                </div>
                <div className="col-md-4">
                  <input
                    className={`form-control ${errors[`author_email_${idx}`] ? "is-invalid" : ""}`}
                    type="email"
                    value={a.email || ""}
                    onChange={(e) => updateAuthor(idx, "email", e.target.value)}
                    placeholder={`Author ${idx + 1} - Email`}
                    disabled={disabledAuthor}
                  />
                  {errors[`author_email_${idx}`] && (
                    <div className="invalid-feedback">{errors[`author_email_${idx}`]}</div>
                  )}
                </div>
                <div className="col-md-2 d-grid">
                  <button
                    type="button"
                    className="btn btn-outline-danger"
                    onClick={() => removeAuthor(idx)}
                    disabled={authors.length === 1 || disabledGlobal || lockThisAuthor}
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

          {errors.tutors && <div className="text-danger small mb-2">{errors.tutors}</div>}

          <div className="d-flex flex-column gap-3">
            {tutors.map((t, idx) => (
              <div className="row g-2" key={`tutor-${idx}`}>
                <div className="col-md-4">
                  <input
                    className="form-control"
                    value={t.firstName}
                    onChange={(e) => updateTutor(idx, "firstName", e.target.value)}
                    placeholder={`Tutor ${idx + 1} - First name`}
                    disabled={disabledGlobal}
                  />
                </div>
                <div className="col-md-4">
                  <input
                    className="form-control"
                    value={t.lastName}
                    onChange={(e) => updateTutor(idx, "lastName", e.target.value)}
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
                You don&apos;t belong to any institution yet. Add one in your profile first.
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
        <h5 className="mb-3">Summary and Keywords</h5>

        <textarea
          className={`form-control ${errors.summary ? "is-invalid" : ""}`}
          rows={4}
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="Summary of the thesis"
          disabled={disabledGlobal}
        />
        {errors.summary && <div className="invalid-feedback d-block">{errors.summary}</div>}

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
            {errors.keywords && <div className="invalid-feedback d-block">{errors.keywords}</div>}
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
              <span key={k} className="badge text-bg-light d-flex align-items-center gap-2">
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
              style={{
                border: `2px dashed ${isDragging ? "#20c997" : "#ced4da"}`,
                background: isDragging ? "rgba(32, 201, 151, 0.06)" : "transparent",
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

                  {/* ✅ TU CAMBIO: el mensaje va aquí (dentro del drag&drop) */}
                  {idThesis && !pdfName && (
                    <div className="small mt-2">
                      <span className="text-muted">
                        Do not upload any files if you do not want to modify the PDF.
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

            {errors.pdf && <div className="text-danger small mt-2">{errors.pdf}</div>}

            {!idThesis && (
              <div className="alert alert-info mt-2 py-2" role="alert">
                PDF will be uploaded to Pinata/IPFS when you submit.
              </div>
            )}
          </div>

          <div className="col-lg-4">
            <div className="row g-3">
              <div className="col-sm-6">
                <label className="form-label d-block">Certification status</label>
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
          {/* ✅ TU CAMBIO: texto del botón */}
          {idThesis ? "Update thesis" : "Save thesis"}
        </button>
      </div>
    </form>
  );
};

export default FormThesis;
