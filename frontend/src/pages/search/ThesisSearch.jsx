import React, { useMemo, useState, useEffect } from "react";
import { getAuthRole, getAuthToken } from "../../utils/authSession";
import ModalView from "../../components/modal/ModalView";
import axios from "axios";
import {
  EyeFillIcon,
  HeartFill,
  HeartOutline,
  QuoteFill,
} from "../../utils/icons";

// ===================== Configuración base (API + Auth + Gateway) =====================
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";
const gateway = import.meta.env.VITE_PINATA_GATEWAY_DOMAIN;

const role = getAuthRole();
const token = getAuthToken();

// ===================== Opciones de ordenamiento =====================
const SORT_OPTIONS = [
  { key: "recent", label: "Most recent" },
  { key: "oldest", label: "Oldest" },
  { key: "title_az", label: "Title A–Z" },
  { key: "title_za", label: "Title Z–A" },
  { key: "ratings_most", label: "Most ratings" },
  { key: "ratings_least", label: "Least ratings" },
];

// ===================== Helpers =====================
const getInstitutionName = (thesis) => {
  const inst = thesis?.institution;
  if (!inst) return "";
  if (typeof inst === "string") return inst; 
  return inst?.name || "";
};

const buildAuthorsSearchString = (authors) => {
  if (!Array.isArray(authors)) return "";
  return authors
    .map((a) => {
      if (typeof a === "string") return a;
      if (a && typeof a === "object") {
        const parts = [];
        if (a.name) parts.push(a.name);
        if (a.lastname) parts.push(a.lastname);
        return parts.join(" ");
      }
      return "";
    })
    .join(" ")
    .toLowerCase();
};

const normalizeStatus = (s) => String(s || "").toUpperCase();

const getYearFromThesis = (t) => {
  if (t?.date) {
    const dt = new Date(t.date);
    const y = dt.getFullYear();
    if (!Number.isNaN(y) && y > 0) return y;
  }

  const yLegacy = Number(t?.year);
  if (Number.isFinite(yLegacy) && yLegacy > 0) return yLegacy;

  if (t?.createdAt) {
    const dt = new Date(t.createdAt);
    const y = dt.getFullYear();
    if (!Number.isNaN(y) && y > 0) return y;
  }

  return NaN;
};

const getTimeForSort = (t) => {
  if (t?.date) {
    const ms = new Date(t.date).getTime();
    if (!Number.isNaN(ms)) return ms;
  }
  if (t?.createdAt) {
    const ms = new Date(t.createdAt).getTime();
    if (!Number.isNaN(ms)) return ms;
  }
  const y = Number(t?.year);
  if (Number.isFinite(y) && y > 0) {
    const ms = new Date(`${y}-01-01T00:00:00.000Z`).getTime();
    if (!Number.isNaN(ms)) return ms;
  }
  return 0;
};

// ===================== Componente principal =====================
const ThesisSearch = () => {
  // ---------- Estado principal ----------
  const [theses, setTheses] = useState([]);
  const [liked, setLiked] = useState({});
  const [institutions, setInstitutions] = useState([]);
  const [selectedForView, setSelectedForView] = useState(null);

  // ---------- Estados de carga/errores ----------
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // ---------- Búsqueda + Filtros ----------
  const [query, setQuery] = useState("");
  const [language, setLanguage] = useState("all");
  const [degree, setDegree] = useState("all");

  const now = new Date().getFullYear();
  const [minYear, setMinYear] = useState(1980);
  const [maxYear, setMaxYear] = useState(now);

  const [institutionFilter, setInstitutionFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all"); // "all" | "APPROVED" | "PENDING"

  // ---------- Orden + Paginación ----------
  const [sortBy, setSortBy] = useState("recent");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // ===================== Carga inicial: Theses =====================
  useEffect(() => {
    const fetchTheses = async () => {
      try {
        setLoading(true);
        setLoadError("");

        const headers = token
          ? { Authorization: `Bearer ${token}` }
          : undefined;

        const res = await axios.get(
          `${API_BASE_URL}/api/theses`,
          headers ? { headers } : undefined,
        );

        const data = Array.isArray(res.data) ? res.data : [];

        // user actual (para likes)
        let currentUserId = null;
        try {
          const rawUser = localStorage.getItem("memorychain_user");
          if (rawUser) {
            const parsed = JSON.parse(rawUser);
            currentUserId = parsed?._id || parsed?.id || null;
          }
        } catch (e) {
          console.warn("No se pudo parsear memorychain_user", e);
        }

        const mapped = data.map((t) => {
          const likes = t.likes ?? 0;

          const userLiked =
            Array.isArray(t.likedBy) && currentUserId
              ? t.likedBy.some(
                  (u) => String(u?._id ?? u) === String(currentUserId),
                )
              : false;

          const derivedYear = getYearFromThesis(t);

          return { ...t, likes, userLiked, derivedYear };
        });

        setTheses(mapped);

        const likedMap = {};
        mapped.forEach((t) => {
          likedMap[t._id] = !!t.userLiked;
        });
        setLiked(likedMap);
      } catch (err) {
        console.error("Error loading theses:", err);
        setLoadError("Error loading theses. Please try again later.");
        setTheses([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTheses();
  }, []);

  // ===================== Carga: instituciones (para filtro) =====================
  useEffect(() => {
    const fetchInstitutions = async () => {
      try {
        const tokenLocal = localStorage.getItem("memorychain_token");
        const headers = tokenLocal
          ? { Authorization: `Bearer ${tokenLocal}` }
          : undefined;

        const res = await axios.get(
          `${API_BASE_URL}/api/institutions`,
          headers ? { headers } : undefined,
        );

        const data = Array.isArray(res.data) ? res.data : [];
        setInstitutions(data);
      } catch (err) {
        console.error("Error loading institutions for thesis filter:", err);
        setInstitutions([]);
      }
    };

    fetchInstitutions();
  }, []);

  // ===================== Opciones del filtro institución =====================
  const institutionOptions = useMemo(() => {
    const names = institutions.map((i) => i.name).filter(Boolean);
    const unique = Array.from(new Set(names)).sort((a, b) =>
      a.localeCompare(b),
    );
    return ["all", ...unique];
  }, [institutions]);

  // ===================== Filtrado principal =====================
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const selectedInst = institutionFilter.toLowerCase();
    const selectedStatus = normalizeStatus(statusFilter);

    return theses.filter((t) => {
      const status = normalizeStatus(t.status);

      // REGLA BASE: ocultar REJECTED SIEMPRE
      if (status === "REJECTED") return false;

      const instName = getInstitutionName(t);
      const authorsSearch = buildAuthorsSearchString(t.authors);

      const keywordsSearch = Array.isArray(t.keywords)
        ? t.keywords.map((k) => String(k).toLowerCase())
        : [];

      const matchesQ =
        !q ||
        (t.title || "").toLowerCase().includes(q) ||
        authorsSearch.includes(q) ||
        keywordsSearch.some((k) => k.includes(q)) ||
        instName.toLowerCase().includes(q);

      const matchesLang =
        language === "all" || (t.language || "").toLowerCase() === language;

      const matchesDegree =
        degree === "all" || String(t.degree || "") === degree;

      const yearNum = Number.isFinite(Number(t.derivedYear))
        ? Number(t.derivedYear)
        : getYearFromThesis(t);

      const inYearRange =
        !Number.isNaN(yearNum) &&
        yearNum >= Number(minYear) &&
        yearNum <= Number(maxYear);

      const matchesInst =
        selectedInst === "all" || instName.toLowerCase() === selectedInst;

      const matchesStatus =
        selectedStatus === "ALL"
          ? status === "APPROVED" || status === "PENDING"
          : status === selectedStatus;

      return (
        matchesQ &&
        matchesLang &&
        matchesDegree &&
        inYearRange &&
        matchesInst &&
        matchesStatus
      );
    });
  }, [
    theses,
    query,
    language,
    degree,
    minYear,
    maxYear,
    institutionFilter,
    statusFilter,
  ]);

  // ===================== Ordenamiento =====================
  const filteredOrdered = useMemo(() => {
    const arr = [...filtered];

    arr.sort((a, b) => {
      const byTitle = (a.title || "").localeCompare(b.title || "");
      const byId = String(a._id ?? "").localeCompare(String(b._id ?? ""));
      const ra = Number(a.likes ?? 0);
      const rb = Number(b.likes ?? 0);

      const ta = getTimeForSort(a);
      const tb = getTimeForSort(b);

      switch (sortBy) {
        case "recent":
          if (tb !== ta) return tb - ta;
          if (byTitle !== 0) return byTitle;
          return byId;
        case "oldest":
          if (ta !== tb) return ta - tb;
          if (byTitle !== 0) return byTitle;
          return byId;
        case "title_az":
          if (byTitle !== 0) return byTitle;
          return byId;
        case "title_za":
          if (byTitle !== 0) return -byTitle;
          return byId;
        case "ratings_most":
          if (rb !== ra) return rb - ra;
          if (byTitle !== 0) return byTitle;
          return byId;
        case "ratings_least":
          if (ra !== rb) return ra - rb;
          if (byTitle !== 0) return byTitle;
          return byId;
        default:
          return 0;
      }
    });

    return arr;
  }, [filtered, sortBy]);

  // ===================== Paginación =====================
  const totalPages = Math.max(1, Math.ceil(filteredOrdered.length / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const start = (currentPage - 1) * pageSize;
  const end = start + pageSize;

  const pageItems = useMemo(
    () => filteredOrdered.slice(start, end),
    [filteredOrdered, start, end],
  );

  const pagesArray = useMemo(
    () => Array.from({ length: totalPages }, (_, i) => i + 1),
    [totalPages],
  );

  const go = (p) => setPage(p);

  // ===================== Acción: ver modal =====================
  const handleView = (thesis) => {
    setSelectedForView(thesis);

    const el = document.getElementById("modalView");
    if (!el) return;

    const modal = window.bootstrap?.Modal?.getOrCreateInstance(el, {
      backdrop: "static",
      keyboard: false,
    });
    modal?.show();
  };

  // ===================== Cita APA + Clipboard =====================
  async function copyToClipboard(text) {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    return false;
  }

  function toTitleCaseSentenceCase(title = "") {
    const t = String(title).trim();
    if (!t) return "";
    return t.charAt(0).toUpperCase() + t.slice(1);
  }

  function initialFromWord(word) {
    const w = String(word || "").trim();
    if (!w) return "";
    return w[0].toUpperCase() + ".";
  }

  function formatPersonAPA(person) {
    if (!person) return "";
    if (typeof person === "string") return person.trim();

    const lastname = String(person.lastname || "").trim();
    const name = String(person.name || person.firstName || "").trim();

    const initials = name
      .split(/\s+/)
      .filter(Boolean)
      .map(initialFromWord)
      .join(" ");

    if (!lastname && !initials) return "";
    if (!lastname) return initials;
    if (!initials) return lastname;

    return `${lastname}, ${initials}`;
  }

  function formatAuthorsAPA(authors = []) {
    const list = Array.isArray(authors) ? authors : [];
    const formatted = list.map(formatPersonAPA).filter(Boolean);

    if (formatted.length === 0) return "Author, A. A.";
    if (formatted.length === 1) return formatted[0];

    if (formatted.length <= 20) {
      const last = formatted[formatted.length - 1];
      const firsts = formatted.slice(0, -1);
      return `${firsts.join(", ")}, & ${last}`;
    }

    const first19 = formatted.slice(0, 19).join(", ");
    const last = formatted[formatted.length - 1];
    return `${first19}, … ${last}`;
  }

  function buildThesisApa7Citation(thesis) {
    const authors = formatAuthorsAPA(thesis?.authors);
    const y = getYearFromThesis(thesis);
    const year = Number.isNaN(y) ? "n.d." : String(y);

    const title = toTitleCaseSentenceCase(thesis?.title || "Untitled thesis");

    const degreeRaw = String(thesis?.degree || "").toLowerCase();
    const thesisType =
      degreeRaw.includes("phd") || degreeRaw.includes("doctor")
        ? "Doctoral dissertation"
        : degreeRaw.includes("master")
          ? "Master’s thesis"
          : "Bachelor’s thesis";

    const instName =
      typeof thesis?.institution === "object" && thesis?.institution
        ? thesis.institution.name || ""
        : "";

    const url = `http://localhost:3000/view/${thesis._id}`;
    const bracket = instName
      ? `[${thesisType}, ${instName}]`
      : `[${thesisType}]`;
    const base = `${authors} (${year}). ${title} ${bracket}`;
    return url ? `${base}. ${url}` : `${base}.`;
  }

  const handleQuote = async (thesis) => {
    try {
      const citation = buildThesisApa7Citation(thesis, gateway);
      const ok = await copyToClipboard(citation);
      if (ok) alert("Bibliographic Citation Copied ✅");
      else alert("Failed Copied ❌");
    } catch (e) {
      console.error(e);
      alert("Failed Copied ❌");
    }
  };

  // ===================== Acción: Like =====================
  const handleToggleLike = async (id) => {
    if (!token) return;

    try {
      const headers = { Authorization: `Bearer ${token}` };

      const res = await axios.post(
        `${API_BASE_URL}/api/theses/${id}/like`,
        null,
        { headers },
      );

      const { thesis, liked: isLiked } = res.data || {};
      if (!thesis || !thesis._id) return;

      setTheses((prev) =>
        prev.map((t) => {
          if (String(t._id) !== String(thesis._id)) return t;

          // 🔒 Preserva datos poblados del estado actual
          const preservedInstitution = t.institution;
          const preservedDepartment = t.department;

          return {
            ...t,
            likes: thesis.likes ?? t.likes ?? 0,
            likedBy: thesis.likedBy ?? t.likedBy,
            userLiked: !!isLiked,
            derivedYear: getYearFromThesis({ ...t, ...thesis }),

            // 🔒 NO dejes que institution se convierta en string id
            institution:
              typeof thesis.institution === "object" && thesis.institution
                ? thesis.institution
                : preservedInstitution,

            // opcional: si tu backend a veces manda department vacío
            department: thesis.department ?? preservedDepartment,
          };
        }),
      );

      setLiked((prev) => ({ ...prev, [id]: !!isLiked }));
    } catch (err) {
      console.error("Error toggling like:", err);
    }
  };

  // ===================== Render: estados de carga/errores =====================
  if (loading) {
    return (
      <div className="container py-3">
        <div className="text-muted">Loading theses…</div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="container py-3">
        <div className="alert alert-danger" role="alert">
          {loadError}
        </div>
      </div>
    );
  }

  // ===================== Render principal =====================
  return (
    <div className="container py-3 mc-thesis-page">
      <ModalView thesis={selectedForView} />

      {/* Top bar */}
      <div className="row g-3 align-items-center mb-3">
        <div className="col-lg-8">
          <div className="d-flex gap-2">
            <input
              className="form-control"
              placeholder="Search theses by title, author, keyword or institution…"
              value={query}
              onChange={(e) => {
                setPage(1);
                setQuery(e.target.value);
              }}
            />

            {/* Sort mantiene tu theming (mc-sort / mc-select) */}
            <div className="dropdown mc-sort mc-select">
              <button
                className="btn btn-outline-secondary dropdown-toggle droptoogle-fixv"
                type="button"
                data-bs-toggle="dropdown"
                aria-expanded="false"
              >
                Sort by:{" "}
                {SORT_OPTIONS.find((o) => o.key === sortBy)?.label ?? "—"}
              </button>

              <ul className="dropdown-menu dropdown-menu-end mc-select">
                {SORT_OPTIONS.map((opt) => (
                  <li key={opt.key}>
                    <button
                      className={`dropdown-item ${
                        sortBy === opt.key ? "active" : ""
                      }`}
                      onClick={() => {
                        setSortBy(opt.key);
                        setPage(1);
                      }}
                      type="button"
                    >
                      {opt.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="col-lg-4 text-lg-end">
          <span className="text-muted">
            {filteredOrdered.length} result
            {filteredOrdered.length !== 1 ? "s" : ""} · Page {currentPage} of{" "}
            {totalPages}
          </span>
        </div>
      </div>

      <div className="row">
        {/* LEFT */}
        <div className="col-lg-8 d-flex flex-column gap-3">
          {pageItems.map((t, idx) => {
            const rowKey = `${t._id}-${start + idx}`;
            const isLiked = liked[t._id] ?? t.userLiked ?? false;

            // UI validation: si no hay instName, mostramos "Investigación Independiente"
            const instNameRaw = getInstitutionName(t);
            const hasInstitution = Boolean(String(instNameRaw || "").trim());
            const institutionLabel = hasInstitution
              ? "Institution:"
              : "Independent Research";
            const institutionValue = hasInstitution ? instNameRaw : "";

            return (
              <div key={rowKey} className="card mc-thesis-card shadow-sm">
                <div className="card-body d-flex align-items-start gap-3 mc-thesis-card-body">
                  {/* Main info */}
                  <div className="flex-grow-1" style={{ minWidth: 0 }}>
                    <h5 className="m-0 mc-thesis-title">{t.title}</h5>

                    <div className="text-muted small mt-1">
                      <span>Authors:</span>{" "}
                      {Array.isArray(t.authors)
                        ? t.authors
                            .map((a) =>
                              typeof a === "string"
                                ? a
                                : `${a.lastname ?? ""} ${a.name ?? ""}`.trim(),
                            )
                            .join(", ")
                        : ""}
                    </div>
                    <div className="text-muted small">
                      <span>{institutionLabel}</span> {institutionValue}
                      {hasInstitution && t.department
                        ? ` · ${t.department}`
                        : ""}
                    </div>

                    {t.keywords?.length ? (
                      <div className="mt-2 d-flex flex-wrap gap-2">
                        {t.keywords.map((k, kidx) => (
                          <span
                            key={`${rowKey}-kw-${kidx}`}
                            className="mc-kw-pill"
                          >
                            {k}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div className="d-flex align-items-center gap-2">
                    <button
                      type="button"
                      className="btn btn-memory"
                      title="View"
                      onClick={() => handleView(t)}
                    >
                      {EyeFillIcon}
                    </button>

                    <button
                      type="button"
                      className="btn btn-warning"
                      title="Cite"
                      onClick={() => handleQuote(t)}
                    >
                      {QuoteFill}
                    </button>

                    {role !== "INSTITUTION" && (
                      <button
                        type="button"
                        className="btn btn-danger btn-fix-like d-flex align-items-center gap-1"
                        title={isLiked ? "Unlike" : "Like"}
                        onClick={() => handleToggleLike(t._id)}
                      >
                        {isLiked ? HeartFill : HeartOutline}
                        <span className="mc-like-count">{t.likes ?? 0}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {pageItems.length === 0 && (
            <div className="text-muted">No theses found.</div>
          )}

          {/* Pagination */}
          <nav
            aria-label="Theses pagination"
            className="mt-3 d-flex justify-content-center"
          >
            <ul className="pagination mc-pagination">
              <li
                className={`page-item ${currentPage === 1 ? "disabled" : ""}`}
              >
                <button
                  className="page-link"
                  onClick={() => go(1)}
                  type="button"
                >
                  First
                </button>
              </li>

              {pagesArray.map((p) => (
                <li
                  key={`p-${p}`}
                  className={`page-item ${p === currentPage ? "active" : ""}`}
                >
                  <button
                    className="page-link"
                    onClick={() => go(p)}
                    type="button"
                  >
                    {p}
                  </button>
                </li>
              ))}

              <li
                className={`page-item ${
                  currentPage === totalPages ? "disabled" : ""
                }`}
              >
                <button
                  className="page-link"
                  onClick={() => go(totalPages)}
                  type="button"
                >
                  Last
                </button>
              </li>
            </ul>
          </nav>
        </div>

        {/* RIGHT: filters */}
        <div className="col-lg-4 d-none d-lg-block">
          <div
            className="card mc-filters mc-filters-card sticky-top"
            style={{ top: "1rem" }}
          >
            <div className="mc-filters-header-dark">
              <span className="mc-filters-title">Filters</span>
            </div>

            <div className="card-body mc-filters-body">
              {/* Status */}
              <div className="mb-3">
                <label className="form-label mc-filter-label">Status</label>

                <div className="row">
                  {[
                    { key: "all", label: "All Status" },
                    { key: "APPROVED", label: "Approved" },
                    { key: "PENDING", label: "Pending" },
                  ].map((s) => (
                    <div key={s.key} className="col-6 col-md-4">
                      <label className="form-check mc-filter-check">
                        <input
                          className="form-check-input mc-check"
                          type="radio"
                          name="status"
                          value={s.key}
                          checked={statusFilter === s.key}
                          onChange={(e) => {
                            setPage(1);
                            setStatusFilter(e.target.value);
                          }}
                        />
                        <span className="form-check-label ms-1">{s.label}</span>
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Year range */}
              <div className="mb-3">
                <div className="d-flex justify-content-between align-items-center">
                  <label className="form-label m-0 mc-filter-label">
                    From year:{" "}
                    <strong className="mc-filter-strong">{minYear}</strong>
                  </label>
                  <span className="small text-muted">
                    To: <strong className="mc-filter-strong">{maxYear}</strong>
                  </span>
                </div>

                <div
                  className="mc-dualrange position-relative"
                  style={{ height: 36 }}
                >
                  <input
                    type="range"
                    className="form-range position-absolute top-50 start-0 translate-middle-y w-100 mc-dualrange-input mc-dualrange-min"
                    min={1980}
                    max={now}
                    step={1}
                    value={minYear}
                    onChange={(e) => {
                      setPage(1);
                      setMinYear(Math.min(Number(e.target.value), maxYear));
                    }}
                    style={{
                      background: "transparent",
                      pointerEvents: "none",
                      zIndex: 2,
                    }}
                  />

                  <input
                    type="range"
                    className="form-range position-absolute top-50 start-0 translate-middle-y w-100 mc-dualrange-input mc-dualrange-max"
                    min={1980}
                    max={now}
                    step={1}
                    value={maxYear}
                    onChange={(e) => {
                      setPage(1);
                      setMaxYear(Math.max(Number(e.target.value), minYear));
                    }}
                    style={{
                      background: "transparent",
                      pointerEvents: "none",
                      zIndex: 3,
                    }}
                  />
                </div>
              </div>

              {/* Language */}
              <div className="mb-3">
                <label className="form-label mc-filter-label">Language</label>
                <div className="row">
                  {["all", "en", "es", "fr", "pt", "ch", "ko", "ru"].map(
                    (l) => (
                      <div key={l} className="col-6 col-md-3">
                        <label className="form-check mc-filter-check">
                          <input
                            className="form-check-input mc-check"
                            type="radio"
                            name="lang"
                            value={l}
                            checked={language === l}
                            onChange={(e) => {
                              setPage(1);
                              setLanguage(e.target.value);
                            }}
                          />
                          <span className="form-check-label text-uppercase ms-1">
                            {l === "all" ? "All" : l}
                          </span>
                        </label>
                      </div>
                    ),
                  )}
                </div>
              </div>

              {/* Degree (dropdown estilo mc-select) */}
              <div className="mb-3">
                <label className="form-label mc-filter-label">Degree</label>

                <div className="dropdown mc-filter-select mc-select">
                  <button
                    className="btn btn-outline-secondary dropdown-toggle droptoogle-fix"
                    type="button"
                    data-bs-toggle="dropdown"
                    aria-expanded="false"
                  >
                    <span className="mc-filter-select-text">
                      {degree === "all" ? "All" : degree || "All"}
                    </span>
                  </button>

                  <ul className="dropdown-menu mc-select">
                    {["all", "Bachelor", "Master", "PhD"].map((d) => (
                      <li key={d}>
                        <button
                          type="button"
                          className={`dropdown-item ${
                            degree === d ? "active" : ""
                          }`}
                          onClick={() => {
                            setPage(1);
                            setDegree(d);
                          }}
                        >
                          {d === "all" ? "All" : d}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Institution (dropdown estilo mc-select) */}
              <div className="mb-3">
                <label className="form-label mc-filter-label">
                  Institution
                </label>

                <div className="dropdown mc-filter-select mc-select">
                  <button
                    className="btn btn-outline-secondary dropdown-toggle droptoogle-fix"
                    type="button"
                    data-bs-toggle="dropdown"
                    aria-expanded="false"
                  >
                    <span className="mc-filter-select-text">
                      {institutionFilter === "all"
                        ? "All"
                        : institutionFilter || "All"}
                    </span>
                  </button>

                  <ul className="dropdown-menu mc-select">
                    {institutionOptions.map((name) => (
                      <li key={name}>
                        <button
                          type="button"
                          className={`dropdown-item ${
                            institutionFilter === name ? "active" : ""
                          }`}
                          onClick={() => {
                            setPage(1);
                            setInstitutionFilter(name);
                          }}
                        >
                          {name === "all" ? "All" : name}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Reset */}
              <div className="text-end d-flex justify-content-center align-items-center">
                <button
                  className="btn btn-outline-secondary btn-sm"
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setLanguage("all");
                    setDegree("all");
                    setMinYear(1980);
                    setMaxYear(now);
                    setInstitutionFilter("all");
                    setStatusFilter("all");
                    setSortBy("recent");
                    setPage(1);
                  }}
                >
                  Clear filters
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ height: 10 }} />
    </div>
  );
};

export default ThesisSearch;
