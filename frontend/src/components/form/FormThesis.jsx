import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { getIdUser } from "../../utils/authSession";
import { useNavigate } from "react-router-dom";
import {
  FileUp,
  KeyRound,
  University,
  UserPen,
  Info,
  UserRoundPlus,
  X,
  CopyPlus,
  Check,
  Binoculars,
  BookUp,
  Clock3,
  ArrowBigRightDash,
  ArrowBigLeftDash,
  CircleX,
  OctagonAlert,
} from "lucide-react";

// ===================== CONFIG GLOBAL (API + LIMITS) =====================
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";
const MAX_PDF_MB = 50;
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

// Valida ObjectId Mongo
const isObjectId = (v) => typeof v === "string" && /^[0-9a-fA-F]{24}$/.test(v);

// Wizard steps
const STEP_KEYS = ["basic", "authors", "affiliation", "summary", "submit"];
const STEP_INDEX = STEP_KEYS.reduce((acc, k, i) => ((acc[k] = i), acc), {});

// ===================== MEMBERSHIP HELPERS =====================
const normalizeStatus = (s) => String(s || "").toUpperCase();

const getApprovedInstitutionIdsFromUser = (u) => {
  const edu = Array.isArray(u?.educationalEmails) ? u.educationalEmails : [];
  const approved = new Set();

  for (const entry of edu) {
    const st = normalizeStatus(entry?.status);
    if (st !== "APPROVED") continue;

    const inst = entry?.institution;
    const instId =
      typeof inst === "string"
        ? inst
        : inst && typeof inst === "object" && inst._id
        ? String(inst._id)
        : null;

    if (instId) approved.add(String(instId));
  }

  return approved;
};

const FormThesis = ({
  institutionOptions = [],
  onSubmit,
  idUser,
  idThesis,
  idInstitution,
  showToast, // ✅ inyectado desde tu Toast provider
}) => {
  const navigate = useNavigate();

  // ===================== TOAST HELPERS =====================
  const fireToast = (cfg) => {
    if (typeof showToast === "function") return showToast(cfg);
    if (typeof window !== "undefined" && typeof window.showToast === "function")
      return window.showToast(cfg);
  };

  // ✅ NUEVO: toasts con micro-delay + duración ~2000ms
  const fireToasts = (
    type,
    messages,
    icon = OctagonAlert,
    duration = 2000,
    stepDelayMs = 140
  ) => {
    const arr = Array.isArray(messages) ? messages : [String(messages)];
    const clean = arr.map((x) => String(x || "").trim()).filter(Boolean);

    clean.forEach((m, idx) => {
      window.setTimeout(() => {
        fireToast?.({ message: m, type, icon, duration });
      }, idx * stepDelayMs);
    });
  };

  // ===================== GENERAL STATE =====================
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const hasInitializedRef = useRef(false);

  const disabledGlobal = isSubmitting || isInitializing;

  // Wizard state
  const [stepKey, setStepKey] = useState("basic");
  const step = STEP_INDEX[stepKey] ?? 0;

  // ===================== INSTITUTIONS / CONTEXT =====================
  const [availableInstitutions, setAvailableInstitutions] =
    useState(institutionOptions);

  const [disableAuthor1, setDisableAuthor1] = useState(false);
  const [disableInstitutionSelect, setDisableInstitutionSelect] =
    useState(false);

  const [isPersonalResearch, setIsPersonalResearch] = useState(false);

  // ✅ NUEVO: banner full-width para afiliación (sin Bootstrap alert)
  const [affiliationInfoMsg, setAffiliationInfoMsg] = useState("");

  // ===================== PDF (DROPZONE) =====================
  const [pdfFile, setPdfFile] = useState(/** @type {File|null} */ (null));
  const [pdfName, setPdfName] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const pdfInputRef = useRef(/** @type {HTMLInputElement|null} */ (null));

  const acceptPdf = (f) => {
    if (!f) return false;

    if (f.type !== "application/pdf") {
      const msg = "Only PDF files are allowed.";
      fireToasts("error", msg, OctagonAlert, 2000);
      return false;
    }
    if (f.size > MAX_PDF_BYTES) {
      const msg = `PDF must be less than ${MAX_PDF_MB}MB.`;
      fireToasts("error", msg, OctagonAlert, 2000);
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

    if (disabledGlobal) return;

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
    if (!disabledGlobal) setIsDragging(true);
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

  // ===================== FIELDS =====================
  const [title, setTitle] = useState("");

  const [authors, setAuthors] = useState([
    { firstName: "", lastName: "", userId: "", linkedUserId: "" },
  ]);

  // Tutors opcionales
  const [tutors, setTutors] = useState([{ firstName: "", lastName: "" }]);

  const [summary, setSummary] = useState("");
  const [keywords, setKeywords] = useState(/** @type {string[]} */ ([]));
  const [keywordInput, setKeywordInput] = useState("");

  const [language, setLanguage] = useState("");
  const [degree, setDegree] = useState("");
  const [field, setField] = useState("");

  // year -> date
  const [date, setDate] = useState("");

  const [institutionId, setInstitutionId] = useState("");
  const [department, setDepartment] = useState("");

  // info
  const [status, setStatus] = useState("PENDING");
  const [likesCount, setLikesCount] = useState(0);

  // ===================== HELPERS =====================
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

  const departmentOptions = useMemo(() => {
    const inst = availableInstitutions.find(
      (i) => String(i._id) === String(institutionId)
    );
    const deps = inst?.departments || [];
    return deps.map((d) => (typeof d === "string" ? { name: d } : d));
  }, [institutionId, availableInstitutions]);

  // Authors
  const addAuthor = () =>
    setAuthors((prev) => [
      ...prev,
      { firstName: "", lastName: "", userId: "", linkedUserId: "" },
    ]);

  const removeAuthor = (index) =>
    setAuthors((prev) => prev.filter((_, i) => i !== index));

  const updateAuthor = (index, key, value) => {
    setAuthors((prev) =>
      prev.map((a, i) =>
        i === index
          ? {
              ...a,
              [key]: value,
              ...(key === "userId" ? { linkedUserId: "" } : null),
            }
          : a
      )
    );
  };

  // Fetch SOLO para autores adicionales (idx > 0)
  const [authorFetchLoading, setAuthorFetchLoading] = useState({});
  const fetchAuthorById = async (index) => {
    const a = authors[index];
    const rawId = String(a?.userId || "").trim();

    if (!rawId) {
      fireToasts("error", "Enter a user ID first.", OctagonAlert, 2000);
      return;
    }
    if (!isObjectId(rawId)) {
      fireToasts("error", "Invalid user ID format.", OctagonAlert, 2000);
      return;
    }

    try {
      setAuthorFetchLoading((p) => ({ ...p, [index]: true }));

      const token = localStorage.getItem("memorychain_token");
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

      const res = await axios.get(
        `${API_BASE_URL}/api/users/${rawId}/basic`,
        headers ? { headers } : undefined
      );

      const u = res.data;
      if (!u?.name || !u?.lastname) {
        fireToasts(
          "error",
          "User found but missing name/lastname.",
          OctagonAlert,
          2000
        );
        return;
      }

      setAuthors((prev) =>
        prev.map((x, i) =>
          i === index
            ? {
                ...x,
                firstName: String(u.name || "").trim(),
                lastName: String(u.lastname || "").trim(),
                linkedUserId: String(u._id || rawId),
              }
            : x
        )
      );

      fireToasts("success", `Author #${index + 1} filled from user ID.`, Check, 2000);
    } catch (err) {
      console.error("Error fetching author by id:", err);
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Failed to fetch user by id.";
      fireToasts("error", msg, OctagonAlert, 2000);
    } finally {
      setAuthorFetchLoading((p) => ({ ...p, [index]: false }));
    }
  };

  // Tutors
  const addTutor = () =>
    setTutors((prev) => [...prev, { firstName: "", lastName: "" }]);

  const removeTutor = (index) =>
    setTutors((prev) => prev.filter((_, i) => i !== index));

  const updateTutor = (index, key, value) => {
    setTutors((prev) =>
      prev.map((t, i) => (i === index ? { ...t, [key]: value } : t))
    );
  };

  const hasAnyValidTutor = useMemo(() => {
    return tutors.some((t) => t.firstName.trim() && t.lastName.trim());
  }, [tutors]);

  // Keywords
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

  const onKeywordKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addKeyword();
    }
  };

  // ===================== VALIDATION =====================
  const [errors, setErrors] = useState(/** @type {Record<string, string>} */ ({}));

  const toastValidationErrors = (msgs) => {
    // ✅ ahora: 2s + microdelay
    fireToasts("error", msgs, OctagonAlert, 2000, 140);
  };

  const validateAll = () => {
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

    const institutionForcedByContext = Boolean(idInstitution);
    if (!isPersonalResearch && !institutionForcedByContext) {
      if (!institutionId) {
        e.institutionId =
          "Institution is required (or choose Personal research).";
      } else {
        const exists = availableInstitutions.some(
          (i) => String(i._id) === String(institutionId)
        );
        if (!exists && availableInstitutions.length > 0) {
          e.institutionId =
            "Selected institution is not available for this user/context.";
        }
      }
    }

    if (!summary.trim()) e.summary = "Summary is required.";
    if (keywords.length < 3)
      e.keywords = "At least three keywords are required.";

    tutors.forEach((t, idx) => {
      const fn = t.firstName.trim();
      const ln = t.lastName.trim();
      if ((fn && !ln) || (!fn && ln)) {
        e[`tutor_${idx}`] = "Tutor must have both first and last name.";
      }
    });

    if (!idThesis && !pdfFile) e.pdf = "PDF file is required.";

    setErrors(e);

    const merged = [...alertMsgs, ...Object.values(e)];
    if (merged.length > 0) {
      // ✅ QUITADO: alert bootstrap global; solo toasts
      toastValidationErrors(merged);
      return false;
    }

    return true;
  };

  // Validación por paso (para Next)
  const validateStep = (k) => {
    const e = {};

    if (k === "basic") {
      if (!title.trim()) e.title = "Title is required.";
      if (!language) e.language = "Language is required.";
      if (!degree) e.degree = "Degree is required.";
      if (!field.trim()) e.field = "Field/Area is required.";

      if (!date) {
        e.date = "Date is required.";
      } else {
        const iso = ymdToIsoUtc(date);
        if (!iso) e.date = "Enter a valid date.";
      }
    }

    if (k === "authors") {
      const validAuthors = authors.filter(
        (a) => a.firstName.trim() && a.lastName.trim()
      );
      if (validAuthors.length === 0)
        e.authors = "At least one author (first and last name) is required.";

      tutors.forEach((t, idx) => {
        const fn = t.firstName.trim();
        const ln = t.lastName.trim();
        if ((fn && !ln) || (!fn && ln)) {
          e[`tutor_${idx}`] = "Tutor must have both first and last name.";
        }
      });
    }

    if (k === "affiliation") {
      const institutionForcedByContext = Boolean(idInstitution);
      if (!isPersonalResearch && !institutionForcedByContext) {
        if (!institutionId) {
          e.institutionId =
            "Institution is required (or choose Personal research).";
        }
      }
    }

    if (k === "summary") {
      if (!summary.trim()) e.summary = "Summary is required.";
      if (keywords.length < 3)
        e.keywords = "At least three keywords are required.";
    }

    if (k === "submit") {
      if (!idThesis && !pdfFile) e.pdf = "PDF file is required.";
    }

    setErrors((prev) => ({ ...prev, ...e }));

    const msgs = Object.values(e);
    if (msgs.length > 0) {
      toastValidationErrors(msgs);
      return false;
    }
    return true;
  };

  // ===================== INIT (CREATE/EDIT) =====================
  const fetchUserForContext = async (headers, wantedId) => {
    // ✅ soporta idUser="me"
    const asStr = String(wantedId || "").trim();
    if (!asStr || asStr === "me") {
      const r = await axios.get(`${API_BASE_URL}/api/users/me`, {
        headers,
      });
      return r.data;
    }

    // Si viene ObjectId real, intentamos obtener perfil completo.
    // ⚠️ En tu router NO existe GET /api/users/:id (solo /:id/basic).
    // Para este form necesitamos educationalEmails => intentamos /me si coincide; si no, fallback a /basic.
    // (En la práctica, en tu flujo actual usas "me", así que vas perfecto).
    if (isObjectId(asStr)) {
      try {
        // Si tú luego agregas GET /api/users/:id (auth), esto quedará listo:
        const r = await axios.get(`${API_BASE_URL}/api/users/${asStr}`, {
          headers,
        });
        return r.data;
      } catch {
        const rb = await axios.get(`${API_BASE_URL}/api/users/${asStr}/basic`);
        return rb.data;
      }
    }

    // fallback
    const r2 = await axios.get(`${API_BASE_URL}/api/users/me`, { headers });
    return r2.data;
  };

  useEffect(() => {
    if (hasInitializedRef.current) return;

    if (!idUser && !idThesis && !idInstitution) {
      const msg =
        "Missing context: provide idUser or idInstitution to create a thesis, or idThesis to edit one.";
      fireToasts("error", msg, OctagonAlert, 2000);
      return;
    }

    if (!institutionOptions || institutionOptions.length === 0) return;

    const init = async () => {
      setIsInitializing(true);
      setAffiliationInfoMsg("");

      try {
        const token = localStorage.getItem("memorychain_token");
        const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

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
          const hasInstitution = Boolean(instIdVal);
          setIsPersonalResearch(!hasInstitution);
          setInstitutionId(hasInstitution ? instIdVal : "");
          setDepartment(hasInstitution ? t.department || "" : "");

          // Autores
          let mappedAuthors = [
            { firstName: "", lastName: "", userId: "", linkedUserId: "" },
          ];
          if (Array.isArray(t.authors) && t.authors.length > 0) {
            mappedAuthors = t.authors.map((a) => {
              if (typeof a === "string") {
                const sp = splitFullName(a);
                return {
                  firstName: sp.firstName,
                  lastName: sp.lastName,
                  userId: "",
                  linkedUserId: "",
                };
              }
              const firstName = a.name || a.firstName || a.firstname || "";
              const lastName = a.lastname || a.lastName || "";
              const linked = a._id ? String(a._id) : "";
              return {
                firstName,
                lastName,
                userId: linked,
                linkedUserId: linked,
              };
            });
          }
          setAuthors(mappedAuthors);

          // Tutores (opcionales)
          let mappedTutors = [{ firstName: "", lastName: "" }];
          if (Array.isArray(t.tutors) && t.tutors.length > 0) {
            mappedTutors = t.tutors.map((tu) => {
              if (typeof tu === "string") {
                const sp = splitFullName(tu);
                return { firstName: sp.firstName, lastName: sp.lastName };
              }
              const firstName = tu.name || tu.firstName || tu.firstname || "";
              const lastName = tu.lastname || tu.lastName || "";
              return { firstName, lastName };
            });
          }
          setTutors(mappedTutors);

          removePdf();
          setDisableAuthor1(true);

          // Contexto institución fija
          if (idInstitution) {
            const only = institutionOptions.filter(
              (i) => String(i._id) === String(idInstitution)
            );
            setAvailableInstitutions(only);
            setInstitutionId(String(idInstitution));
            setDisableInstitutionSelect(true);
            setIsPersonalResearch(false);
            hasInitializedRef.current = true;
            return;
          }

          // Si viene idUser => filtrar instituciones por APPROVED (educationalEmails)
          if (idUser) {
            const u = await fetchUserForContext(
              headers ? headers : undefined,
              String(idUser)
            );

            const approvedSet = getApprovedInstitutionIdsFromUser(u);
            const approvedInstitutions = institutionOptions.filter((i) =>
              approvedSet.has(String(i._id))
            );

            // si el thesis tiene institución seleccionada, la mantenemos visible aunque no esté approved (para no romper edición)
            const keepSelected =
              instIdVal &&
              institutionOptions.find((i) => String(i._id) === String(instIdVal));
            const finalList = keepSelected
              ? [
                  ...approvedInstitutions,
                  ...approvedInstitutions.some((x) => String(x._id) === String(instIdVal))
                    ? []
                    : [keepSelected],
                ]
              : approvedInstitutions;

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
          setIsPersonalResearch(false);
          hasInitializedRef.current = true;
          return;
        }

        // CREATE by user
        if (idUser && !idInstitution) {
          const u = await fetchUserForContext(
            headers ? headers : undefined,
            String(idUser)
          );

          // ✅ precarga autor #1
          setAuthors([
            {
              firstName: u?.name || "",
              lastName: u?.lastname || "",
              userId: "",
              linkedUserId: isObjectId(String(u?._id || idUser)) ? String(u?._id || idUser) : "",
            },
          ]);
          setDisableAuthor1(true);

          // ✅ SOLO instituciones con educationalEmails APPROVED
          const approvedSet = getApprovedInstitutionIdsFromUser(u);
          const approvedInstitutions = institutionOptions.filter((i) =>
            approvedSet.has(String(i._id))
          );
          setAvailableInstitutions(approvedInstitutions);

          if (approvedInstitutions.length === 1)
            setInstitutionId(String(approvedInstitutions[0]._id));
          else setInstitutionId("");

          setStatus("PENDING");
          setLikesCount(0);

          setIsPersonalResearch(approvedInstitutions.length === 0);

          if (approvedInstitutions.length === 0) {
            setAffiliationInfoMsg(
              "You don't have any approved educational institution yet. Ask your institution to approve your educational email, or mark this thesis as Personal research."
            );
          } else {
            setAffiliationInfoMsg("");
          }

          hasInitializedRef.current = true;
          return;
        }

        const msg =
          "Invalid context: provide idThesis, or (idUser XOR idInstitution).";
        fireToasts("error", msg, OctagonAlert, 2000);
      } catch (err) {
        console.error("Error initializing FormThesis:", err);
        const msg = "Error initializing the thesis form. Check console.";
        fireToasts("error", msg, OctagonAlert, 2000);
      } finally {
        setIsInitializing(false);
      }
    };

    init();
  }, [idUser, idThesis, idInstitution, institutionOptions]);

  // Toggle investigación personal
  const togglePersonalResearch = () => {
    if (idInstitution) return;

    setIsPersonalResearch((prev) => {
      const next = !prev;
      if (next) {
        setInstitutionId("");
        setDepartment("");
      }
      return next;
    });
  };

  // ===================== SUBMIT =====================
  const handleSubmit = async (e) => {
    e.preventDefault();

    // ✅ FIX: evitar submits “fantasma” al llegar al último step
    if (stepKey !== "submit") return;

    if (!validateAll()) return;

    const dateIso = ymdToIsoUtc(date);

    const tutorPayload = hasAnyValidTutor
      ? tutors
          .filter((t) => t.firstName.trim() && t.lastName.trim())
          .map((t) => ({
            name: t.firstName.trim(),
            lastname: t.lastName.trim(),
          }))
      : [];

    const creatorUserIdRaw =
      (idUser ? String(idUser) : "") ||
      (getIdUser() ? String(getIdUser()) : "");
    const creatorUserId = isObjectId(creatorUserIdRaw) ? creatorUserIdRaw : "";

    const payload = {
      title: title.trim(),
      authors: authors
        .filter((a) => a.firstName.trim() && a.lastName.trim())
        .map((a, idx) => {
          const forcedPrimaryId = idx === 0 && creatorUserId ? creatorUserId : "";

          const idToSend =
            forcedPrimaryId ||
            (idx === 0
              ? a.linkedUserId && isObjectId(a.linkedUserId)
                ? a.linkedUserId
                : undefined
              : a.linkedUserId && isObjectId(a.linkedUserId)
              ? a.linkedUserId
              : isObjectId(a.userId)
              ? a.userId
              : undefined);

          return {
            ...(idToSend ? { _id: idToSend } : {}),
            name: a.firstName.trim(),
            lastname: a.lastName.trim(),
          };
        }),
      tutors: tutorPayload,
      summary: summary.trim(),
      keywords,
      language,
      degree,
      field: field.trim(),
      date: dateIso,
      institution: isPersonalResearch ? undefined : institutionId,
      department: isPersonalResearch ? undefined : department || undefined,
      status: "PENDING",
    };

    const redirectAfterMs = 2000;

    try {
      setIsSubmitting(true);

      if (typeof onSubmit === "function") {
        await onSubmit({
          payload,
          pdfFile,
          idThesis,
          mode: idThesis ? "update" : "create",
        });

        fireToasts(
          "success",
          idThesis ? "Thesis updated successfully." : "Thesis created successfully.",
          Check,
          2000
        );

        setTimeout(() => {
          navigate("/library-personal");
        }, redirectAfterMs);

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

          fireToasts("success", "Thesis updated successfully (PDF updated).", Check, 2000);
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

          fireToasts("success", "Thesis updated successfully.", Check, 2000);
        }

        setTimeout(() => {
          navigate("/library-personal");
        }, redirectAfterMs);
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

        const msgs =
          gw || ipfsUrl
            ? [
                "Thesis created successfully.",
                gw ? `Gateway: ${gw}` : "",
                ipfsUrl ? `IPFS: ${ipfsUrl}` : "",
              ].filter(Boolean)
            : ["Thesis created successfully."];

        fireToasts("success", msgs, Check, 2000);

        removePdf();

        setTimeout(() => {
          navigate("/library-personal");
        }, redirectAfterMs);
      }
    } catch (err) {
      console.error("Error submitting thesis:", err);

      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "There was an error submitting the thesis.";

      fireToasts("error", msg, OctagonAlert, 2000);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ===================== STEPPER META =====================
  const steps = useMemo(() => {
    return [
      { key: "basic", title: "Basic Info", icon: Info },
      { key: "authors", title: "Authors & Tutors", icon: UserPen },
      { key: "affiliation", title: "Affiliation", icon: University },
      { key: "summary", title: "Summary & Keywords", icon: KeyRound },
      { key: "submit", title: "Submit File", icon: FileUp },
    ];
  }, []);

  const goPrev = () => {
    if (disabledGlobal) return;
    const prev = Math.max(0, step - 1);
    setStepKey(STEP_KEYS[prev]);
  };

  const goNext = () => {
    if (disabledGlobal) return;
    const ok = validateStep(stepKey);
    if (!ok) return;

    const next = Math.min(STEP_KEYS.length - 1, step + 1);
    setStepKey(STEP_KEYS[next]);
  };

  const jumpTo = (targetKey) => {
    if (disabledGlobal) return;

    const targetIdx = STEP_INDEX[targetKey] ?? 0;
    if (targetIdx <= step) {
      setStepKey(targetKey);
      return;
    }

    let curKey = stepKey;
    for (let i = STEP_INDEX[curKey]; i < targetIdx; i++) {
      const k = STEP_KEYS[i];
      if (!validateStep(k)) return;
    }
    setStepKey(targetKey);
  };

  const stepState = (idx) => {
    if (idx < step) return "done";
    if (idx === step) return "active";
    return "upcoming";
  };

  const currentStepMeta = steps.find((s) => s.key === stepKey);

  return (
    <form
      className="mcWizardWrap"
      onSubmit={handleSubmit}
      onKeyDown={(ev) => {
        if (ev.key === "Enter") {
          const tag = String(ev.target?.tagName || "").toLowerCase();
          const isTextarea = tag === "textarea";
          if (!isTextarea) ev.preventDefault();
        }
      }}
    >
      {/* ===================== STEPPER ===================== */}
      <div className="mcWizardStepper">
        <div className="mcWizardStepperRail" aria-hidden="true" />

        {steps.map((s, idx) => {
          const st = stepState(idx);
          const active = st === "active";
          const done = st === "done";

          return (
            <button
              key={s.key}
              type="button"
              className={`mcStepItem ${active ? "is-active" : ""} ${
                done ? "is-done" : ""
              }`}
              onClick={() => jumpTo(s.key)}
              disabled={disabledGlobal}
            >
              <span
                className={`mcStepDot ${active ? "is-active" : ""} ${
                  done ? "is-done" : ""
                }`}
              >
                {done ? (
                  <span className="mcStepCheck" aria-hidden="true">
                    ✓
                  </span>
                ) : (
                  <span className="mcStepIcon" aria-hidden="true">
                    <s.icon />
                  </span>
                )}
              </span>

              <span className="mcStepText">
                <span className={`mcStepTitle ${active ? "is-active" : ""}`}>
                  {s.title}
                </span>
                <span className="mcStepSub">{s.sub}</span>
              </span>
            </button>
          );
        })}
      </div>

      {/* ✅ QUITADO: Bootstrap alert global (la roja grande) */}

      {/* ===================== MAIN CARD ===================== */}
      <section className="mcWizardCard">
        <header className="mcWizardCardHead">
          <div className="mcWizardCardHeadLeft">
            <span className="mcWizardCardHeadTitle">
              <span className="mcWizardCardHeadIcon">
                <currentStepMeta.icon />
              </span>
              <h2 className="mcWizardH2">{currentStepMeta?.title || "Form"}</h2>
            </span>
          </div>
        </header>

        <div className="mcWizardCardBody">
          {/* ===================== STEP: BASIC ===================== */}
          {stepKey === "basic" && (
            <div className="mcWizardPane">
              <div className="mcWizardField">
                <label className="mcWizardLabel">Title</label>
                <input
                  className={`mcWizardInput ${errors.title ? "is-invalid" : ""}`}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter the full title of your thesis"
                  disabled={disabledGlobal}
                />
                {errors.title && (
                  <div className="invalid-feedback d-block">{errors.title}</div>
                )}
              </div>

              <div className="mcWizardGrid3">
                <div className="mcWizardField">
                  <label className="mcWizardLabel">Degree</label>

                  <div className="dropdown mc-filter-select mc-select">
                    <button
                      className={`btn btn-outline-secondary dropdown-toggle droptoogle-fix mc-dd-toggle mcWizardSelectBtn
                        ${errors.degree ? "is-invalid" : ""}`}
                      type="button"
                      data-bs-toggle="dropdown"
                      aria-expanded="false"
                      disabled={disabledGlobal}
                    >
                      <span className="mc-filter-select-text">
                        {degree || "Select degree"}
                      </span>
                    </button>

                    <ul className="dropdown-menu mcDropdownMenu">
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
                    <div className="invalid-feedback d-block">
                      {errors.degree}
                    </div>
                  )}
                </div>

                <div className="mcWizardField">
                  <label className="mcWizardLabel">Language</label>

                  <div className="dropdown mc-filter-select mc-select">
                    <button
                      className={`btn btn-outline-secondary dropdown-toggle droptoogle-fix mc-dd-toggle mcWizardSelectBtn
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
                          : "Select language"}
                      </span>
                    </button>

                    <ul className="dropdown-menu mcDropdownMenu">
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

                <div className="mcWizardField">
                  <label className="mcWizardLabel">Date</label>

                  <DatePicker
                    selected={date ? new Date(`${date}T00:00:00`) : null}
                    onChange={(d) => {
                      if (!d) return setDate("");
                      const yyyy = d.getFullYear();
                      const mm = String(d.getMonth() + 1).padStart(2, "0");
                      const dd = String(d.getDate()).padStart(2, "0");
                      setDate(`${yyyy}-${mm}-${dd}`);
                    }}
                    dateFormat="dd/MM/yyyy"
                    placeholderText="dd/mm/yyyy"
                    disabled={disabledGlobal}
                    popperPlacement="bottom-start"
                    wrapperClassName="w-100"
                    calendarClassName="mcDatepicker"
                    popperClassName="mcDatepickerPopper"
                    dayClassName={() => "mcDateDay"}
                    customInput={
                      <input
                        type="text"
                        readOnly
                        className={`mcWizardInput w-100 ${
                          errors.date ? "is-invalid" : ""
                        }`}
                      />
                    }
                  />
                  {errors.date && (
                    <div className="invalid-feedback d-block">{errors.date}</div>
                  )}
                </div>
              </div>

              <div className="mcWizardField">
                <label className="mcWizardLabel">Field / Area</label>
                <input
                  className={`mcWizardInput ${errors.field ? "is-invalid" : ""}`}
                  value={field}
                  onChange={(e) => setField(e.target.value)}
                  placeholder="e.g., Computer Science Department"
                  disabled={disabledGlobal}
                />
                {errors.field && (
                  <div className="invalid-feedback d-block">{errors.field}</div>
                )}
              </div>
            </div>
          )}

          {/* ===================== STEP: AUTHORS ===================== */}
          {stepKey === "authors" && (
            <div className="mcWizardPane">
              <div className="mcWizardRowBetween">
                <div>
                  <div className="mcWizardSectionTitle">Authors</div>
                  {errors.authors && (
                    <div className="text-danger small mt-1">{errors.authors}</div>
                  )}
                </div>

                <button
                  type="button"
                  className="btn btn-sm btn-outline-memory d-flex align-items-center gap-1"
                  onClick={addAuthor}
                  disabled={disabledGlobal}
                >
                  <UserRoundPlus size={18} /> Add Author
                </button>
              </div>

              <div className="mcWizardStack">
                {authors.map((a, idx) => {
                  const lockThisAuthor = disableAuthor1 && idx === 0;
                  const disabledAuthor = disabledGlobal || lockThisAuthor;

                  return (
                    <div className="mcWizardGroup" key={`author-${idx}`}>
                      <div className="mcWizardGrid4">
                        <input
                          className="mcWizardInput"
                          value={a.firstName}
                          onChange={(e) =>
                            updateAuthor(idx, "firstName", e.target.value)
                          }
                          placeholder={`Author ${idx + 1} - First name`}
                          disabled={disabledAuthor}
                        />
                        <input
                          className="mcWizardInput"
                          value={a.lastName}
                          onChange={(e) =>
                            updateAuthor(idx, "lastName", e.target.value)
                          }
                          placeholder={`Author ${idx + 1} - Last name`}
                          disabled={disabledAuthor}
                        />

                        {idx === 0 ? (
                          <div className="mcWizardHint">
                            {lockThisAuthor ? "Primary author (locked)" : ""}
                          </div>
                        ) : (
                          <div className="input-group mcWizardInputGroup">
                            <input
                              className={`form-control mcWizardInput mcWizardInputGroupInput`}
                              value={a.userId || ""}
                              onChange={(e) =>
                                updateAuthor(idx, "userId", e.target.value)
                              }
                              placeholder="Optional: User ID to autofill"
                              disabled={disabledGlobal}
                            />
                            <button
                              type="button"
                              className="btn btn-outline-memory mcWizardInputGroupBtn"
                              onClick={() => fetchAuthorById(idx)}
                              disabled={
                                disabledGlobal || !String(a.userId || "").trim()
                              }
                            >
                              {authorFetchLoading[idx] ? "..." : "Fetch"}
                            </button>
                          </div>
                        )}

                        <button
                          type="button"
                          className="btn btn-outline-danger"
                          onClick={() => removeAuthor(idx)}
                          disabled={
                            authors.length === 1 ||
                            disabledGlobal ||
                            lockThisAuthor
                          }
                          title="Remove author"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mcWizardDivider" />

              <div className="mcWizardRowBetween">
                <div>
                  <div className="mcWizardSectionTitle">
                    Tutors <span className="mcWizardMuted">(optional)</span>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn btn-sm btn-outline-memory d-flex align-items-center gap-1"
                  onClick={addTutor}
                  disabled={disabledGlobal}
                >
                  <UserRoundPlus size={18} /> Add Tutor
                </button>
              </div>

              <div className="mcWizardStack">
                {tutors.map((t, idx) => (
                  <div className="mcWizardGroup" key={`tutor-${idx}`}>
                    <div className="mcWizardGrid3T">
                      <div>
                        <input
                          className="mcWizardInput"
                          value={t.firstName}
                          onChange={(e) =>
                            updateTutor(idx, "firstName", e.target.value)
                          }
                          placeholder={`Tutor ${idx + 1} - First name`}
                          disabled={disabledGlobal}
                        />
                        {errors[`tutor_${idx}`] && (
                          <div className="text-danger small mt-1">
                            {errors[`tutor_${idx}`]}
                          </div>
                        )}
                      </div>

                      <input
                        className="mcWizardInput"
                        value={t.lastName}
                        onChange={(e) =>
                          updateTutor(idx, "lastName", e.target.value)
                        }
                        placeholder={`Tutor ${idx + 1} - Last name`}
                        disabled={disabledGlobal}
                      />

                      <button
                        type="button"
                        className="btn btn-outline-danger"
                        onClick={() => removeTutor(idx)}
                        disabled={disabledGlobal || tutors.length === 1}
                        title="Remove tutor"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ===================== STEP: AFFILIATION ===================== */}
          {stepKey === "affiliation" && (
            <div className="mcWizardPane">
              <div className="mcWizardRowBetween">
                <div>
                  <div className="mcWizardSectionTitle">Affiliation</div>
                  <div className="mcWizardMuted">
                    Specify the institution and department
                  </div>
                </div>

                <button
                  type="button"
                  className={`btn btn-sm ${
                    isPersonalResearch ? "btn-memory" : "btn-outline-memory"
                  }`}
                  onClick={togglePersonalResearch}
                  disabled={disabledGlobal || Boolean(idInstitution)}
                  title={
                    idInstitution
                      ? "Personal research is disabled in institution context."
                      : "Toggle personal research (no institution/department)."
                  }
                >
                  {isPersonalResearch ? (
                    <span className="d-flex align-items-center gap-2">
                      Personal research <Check size={18} />
                    </span>
                  ) : (
                    <span className="d-flex align-items-center gap-2">
                      Mark as personal research <Binoculars size={18} />
                    </span>
                  )}
                </button>
              </div>

              {isPersonalResearch && (
                <div className="mcWizardCallout">
                  This thesis will be saved as a{" "}
                  <strong>personal research</strong>. Institution and department
                  will not be associated.
                </div>
              )}

              {!isPersonalResearch && (
                <>
                  <div className="mcWizardGrid2">
                    <div className="mcWizardField">
                      <label className="mcWizardLabel">Institution</label>

                      <div className="dropdown mc-filter-select mc-select">
                        <button
                          className={`btn btn-outline-secondary dropdown-toggle droptoogle-fix mc-dd-toggle mcWizardSelectBtn
                          ${errors.institutionId ? "is-invalid" : ""}`}
                          type="button"
                          data-bs-toggle="dropdown"
                          aria-expanded="false"
                          disabled={disabledGlobal || disableInstitutionSelect}
                        >
                          <span className="mc-filter-select-text">
                            {institutionId
                              ? (availableInstitutions.find(
                                  (i) =>
                                    String(i._id) === String(institutionId)
                                )?.name ?? "Select")
                              : "Select institution"}
                          </span>
                        </button>

                        <ul className="dropdown-menu mcDropdownMenu">
                          {availableInstitutions.map((i) => (
                            <li key={i._id}>
                              <button
                                type="button"
                                className={`dropdown-item ${
                                  String(institutionId) === String(i._id)
                                    ? "active"
                                    : ""
                                }`}
                                onClick={() => {
                                  setInstitutionId(i._id);
                                  setDepartment("");
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
                    </div>

                    <div className="mcWizardField">
                      <label className="mcWizardLabel">Department</label>

                      <div className="dropdown mc-filter-select mc-select">
                        <button
                          className="btn btn-outline-secondary dropdown-toggle droptoogle-fix mc-dd-toggle mcWizardSelectBtn"
                          type="button"
                          data-bs-toggle="dropdown"
                          aria-expanded="false"
                          disabled={departmentOptions.length === 0 || disabledGlobal}
                        >
                          <span className="mc-filter-select-text">
                            {department
                              ? department
                              : departmentOptions.length
                              ? "Select department"
                              : "No departments available"}
                          </span>
                        </button>

                        <ul className="dropdown-menu mcDropdownMenu">
                          {departmentOptions.map((d, idx) => (
                            <li key={`${d.name}-${idx}`}>
                              <button
                                type="button"
                                className={`dropdown-item ${
                                  department === d.name ? "active" : ""
                                }`}
                                onClick={() => setDepartment(d.name)}
                                disabled={disabledGlobal}
                              >
                                {d.name}
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* ✅ NUEVO: banner full width (ocupa TODO el espacio debajo) */}
                  {!disabledGlobal && availableInstitutions.length === 0 && (
                    <div className="mcWizardCalloutWarn mt-3">
                      {affiliationInfoMsg ||
                        "You don't have any approved educational institution yet. Ask your institution to approve your educational email, or mark this thesis as Personal research."}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ===================== STEP: SUMMARY ===================== */}
          {stepKey === "summary" && (
            <div className="mcWizardPane">
              <div className="mcWizardField">
                <label className="mcWizardLabel">Abstract / Summary</label>
                <textarea
                  className={`mcWizardTextarea ${errors.summary ? "is-invalid" : ""}`}
                  rows={7}
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="Write a brief summary of your thesis (250-500 words recommended)"
                  disabled={disabledGlobal}
                />
                {errors.summary && (
                  <div className="invalid-feedback d-block">{errors.summary}</div>
                )}
              </div>

              <div className="mcWizardGrid2 mcKwGrid">
                <div className="mcWizardField">
                  <label className="mcWizardLabel">Keyword</label>

                  <div className="input-group mcWizardInputGroup">
                    <input
                      className={`form-control mcWizardInputGroupInput ${
                        errors.keywords ? "is-invalid" : ""
                      }`}
                      value={keywordInput}
                      onChange={(e) => setKeywordInput(e.target.value)}
                      onKeyDown={onKeywordKeyDown}
                      placeholder="Press Enter to add"
                      disabled={disabledGlobal}
                    />

                    <button
                      type="button"
                      className="btn btn-outline-memory mcWizardInputGroupBtn d-flex align-items-center gap-2"
                      onClick={addKeyword}
                      disabled={!keywordInput.trim() || disabledGlobal}
                    >
                      <CopyPlus size={18} /> Add
                    </button>
                  </div>

                  {errors.keywords && (
                    <div className="invalid-feedback d-block">
                      {errors.keywords}
                    </div>
                  )}
                </div>

                <div className="mcWizardField">
                  <label className="mcWizardLabel"> Preview Keywords</label>

                  {keywords.length === 0 ? (
                    <span className="mcWizardMuted">No keywords added.</span>
                  ) : (
                    <div className="mcKwChips">
                      {keywords.map((k) => (
                        <span key={k} className="mcWizardChip mcKwChip">
                          {k}
                          <button
                            type="button"
                            className="mcWizardChipX"
                            onClick={() => removeKeyword(k)}
                            disabled={disabledGlobal}
                            aria-label={`Remove keyword ${k}`}
                          >
                            <X size={18} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ===================== STEP: SUBMIT ===================== */}
          {stepKey === "submit" && (
            <div className="mcWizardPane">
              <div className="mcWizardField">
                <label className="mcWizardLabel">
                  Upload PDF {!idThesis && <span className="text-danger">*</span>}
                  {idThesis && <span className="mcWizardMuted"> (optional)</span>}
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
                  className={`mcWizardDropzone ${isDragging ? "is-dragging" : ""} ${
                    disabledGlobal ? "is-disabled" : ""
                  }`}
                >
                  <div className="mcWizardDropInner">
                    <div className="mcWizardDropIcon" aria-hidden="true">
                      <BookUp size={24} />
                    </div>

                    <div className="mcWizardDropText">
                      <div className="mcWizardDropTitle">
                        {pdfName ? "PDF selected" : "Drop your PDF here or click to browse"}
                      </div>
                      <div className="mcWizardDropSub">
                        {pdfName ? pdfName : `Maximum file size: ${MAX_PDF_MB}MB`}
                      </div>
                    </div>

                    <div className="mcWizardDropActions">
                      <button
                        type="button"
                        className="btn btn-outline-memory"
                        onClick={(ev) => {
                          ev.stopPropagation();
                          onPickPdf();
                        }}
                        disabled={disabledGlobal}
                      >
                        Select PDF
                      </button>

                      {pdfName && (
                        <button
                          type="button"
                          className="btn btn-outline-danger"
                          onClick={(ev) => {
                            ev.stopPropagation();
                            removePdf();
                          }}
                          disabled={disabledGlobal}
                        >
                          <X size={18} />
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

                <div className="mcWizardInfoBanner">
                  <div className="mcWizardInfoIcon fill-y" aria-hidden="true">
                    <Clock3 size={24} />
                  </div>
                  <div>
                    <div className="mcWizardInfoTitle">Certification Status</div>
                    <div className="mcWizardInfoText">
                      After submission, your thesis will be reviewed. Once approved,
                      it will be certified on the blockchain.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ===================== FOOTER ACTIONS ===================== */}
        <footer className="mcWizardFooter">
          <button
            type="button"
            className="btn btn-outline-memory mcWizardNavBtn"
            onClick={step === 0 ? () => window.history.back() : goPrev}
            disabled={disabledGlobal}
          >
            {step === 0 ? (
              <span className="d-flex align-items-center">
                <CircleX className="mx-2" />
                Cancel
              </span>
            ) : (
              <span className="d-flex align-items-center">
                <ArrowBigLeftDash className="mx-2" />
                Previous
              </span>
            )}
          </button>

          {step < STEP_KEYS.length - 1 ? (
            <button
              type="button"
              className="btn btn-memory mcWizardNavBtn"
              onClick={goNext}
              disabled={disabledGlobal}
            >
              <span
                className="d-flex align-items-center justify-content-center"
                aria-hidden="true"
              >
                Next
                <ArrowBigRightDash className="mx-2" />
              </span>
            </button>
          ) : (
            <button
              type="submit"
              className="btn btn-memory mcWizardNavBtn"
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
          )}
        </footer>
      </section>
    </form>
  );
};

export default FormThesis;