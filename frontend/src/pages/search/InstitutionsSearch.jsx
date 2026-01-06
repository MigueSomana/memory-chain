import React, { useMemo, useState, useEffect, useRef } from "react";
import ModalView from "../../components/modal/ModalView";
import axios from "axios";
import { getAuthRole, getAuthToken } from "../../utils/authSession";
import {
  OpenBook,
  WebPage,
  EyeFillIcon,
  CloseIcon,
  HeartFill,
  HeartOutline,
  QuoteFill,
} from "../../utils/icons";

// ===================== CONFIG GLOBAL (API + IPFS gateway + sesión) =====================
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";
const gateway = import.meta.env.VITE_PINATA_GATEWAY_DOMAIN;

const role = getAuthRole();
const token = getAuthToken();

// ===================== SORT OPTIONS (Institutions) =====================
const SORT_OPTIONS = [
  { key: "name_az", label: "Name A–Z" },
  { key: "name_za", label: "Name Z–A" },
  { key: "theses_most", label: "Most theses" },
  { key: "theses_least", label: "Fewest theses" },
];

// ===================== HELPERS (UI formatting) =====================
const formatType = (t) =>
  t ? t.charAt(0).toUpperCase() + t.slice(1).toLowerCase() : "";

// ===================== SORT OPTIONS (Theses) =====================
const THESIS_SORT_OPTIONS = [
  { key: "recent", label: "Most recent" },
  { key: "oldest", label: "Oldest" },
  { key: "title_az", label: "Title A–Z" },
  { key: "title_za", label: "Title Z–A" },
  { key: "ratings_most", label: "Most ratings" },
  { key: "ratings_least", label: "Least ratings" },
];

// ===================== Helper: authors buscable (para search) =====================
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

// ===================== Helper: normalizar status =====================
const normalizeStatus = (s) => String(s || "").toUpperCase();

// ✅ año desde date (fallback year/createdAt)
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

// ✅ timestamp para ordenar por recent/oldest (date/createdAt/year)
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

// ===================== HELPERS APA + Clipboard =====================
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

function buildThesisApa7Citation(thesis, gatewayDomain) {
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

  const url =
    thesis._id && gatewayDomain
      ? `http://localhost:3000/view/${thesis._id}`
      : "";

  const bracket = instName ? `[${thesisType}, ${instName}]` : `[${thesisType}]`;

  const base = `${authors} (${year}). ${title} ${bracket}`;
  if (url) return `${base}. ${url}`;
  return `${base}.`;
}

// ===================== SUBCOMPONENT: InstitutionThesisSubsearch =====================
const InstitutionThesisSubsearch = ({ institutionId, institutionName }) => {
  const [theses, setTheses] = useState([]);
  const [liked, setLiked] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [selectedForView, setSelectedForView] = useState(null);

  const [query, setQuery] = useState("");
  const [language, setLanguage] = useState("all");
  const [degree, setDegree] = useState("all");

  const now = new Date().getFullYear();
  const [minYear, setMinYear] = useState(1980);
  const [maxYear, setMaxYear] = useState(now);

  const [sortBy, setSortBy] = useState("recent");
  const [statusFilter, setStatusFilter] = useState("all"); // all | APPROVED | PENDING

  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    const fetchTheses = async () => {
      try {
        setLoading(true);
        setLoadError("");

        const headers = token
          ? { Authorization: `Bearer ${token}` }
          : undefined;

        const res = await axios.get(
          `${API_BASE_URL}/api/theses/sub/${institutionId}`,
          headers ? { headers } : undefined
        );

        const data = Array.isArray(res.data) ? res.data : [];

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
                  (u) => String(u._id ?? u) === String(currentUserId)
                )
              : false;

          const derivedYear = getYearFromThesis(t);
          return { ...t, likes, userLiked, derivedYear };
        });

        setTheses(mapped);

        const likedMap = {};
        mapped.forEach((t) => (likedMap[t._id] = !!t.userLiked));
        setLiked(likedMap);
      } catch (err) {
        console.error("Error loading theses for institution:", err);
        setLoadError("Error loading theses. Please try again later.");
        setTheses([]);
      } finally {
        setLoading(false);
      }
    };

    if (institutionId) fetchTheses();
  }, [institutionId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const selectedStatus = normalizeStatus(statusFilter); // ALL / APPROVED / PENDING

    return theses.filter((t) => {
      const status = normalizeStatus(t.status);
      if (status === "REJECTED") return false;

      const matchesStatus =
        selectedStatus === "ALL"
          ? status === "APPROVED" || status === "PENDING"
          : status === selectedStatus;

      const authorsSearch = buildAuthorsSearchString(t.authors);
      const keywordsSearch = Array.isArray(t.keywords)
        ? t.keywords.map((k) => String(k).toLowerCase())
        : [];

      const matchesQ =
        !q ||
        (t.title || "").toLowerCase().includes(q) ||
        authorsSearch.includes(q) ||
        keywordsSearch.some((k) => k.includes(q));

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

      return (
        matchesStatus && matchesQ && matchesLang && matchesDegree && inYearRange
      );
    });
  }, [theses, query, language, degree, minYear, maxYear, statusFilter]);

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

  const totalPages = Math.max(1, Math.ceil(filteredOrdered.length / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const start = (currentPage - 1) * pageSize;
  const end = start + pageSize;

  const pageItems = useMemo(
    () => filteredOrdered.slice(start, end),
    [filteredOrdered, start, end]
  );

  const pagesArray = useMemo(
    () => Array.from({ length: totalPages }, (_, i) => i + 1),
    [totalPages]
  );

  const go = (p) => setPage(p);

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

  const handleQuote = async (thesis) => {
    try {
      const citation = buildThesisApa7Citation(thesis, gateway);
      const ok = await copyToClipboard(citation);
      if (ok) alert("Bibliographic Citation Copied ✅");
      else alert("Failed Copied ❌");
    } catch (e) {
      alert("Failed Copied ❌");
      console.error(e);
    }
  };

  const handleToggleLike = async (id) => {
    if (!token) return;

    try {
      const headers = { Authorization: `Bearer ${token}` };

      const res = await axios.post(
        `${API_BASE_URL}/api/theses/${id}/like`,
        null,
        { headers }
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
            // ✅ SOLO lo necesario
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
        })
      );

      setLiked((prev) => ({ ...prev, [id]: !!isLiked }));
    } catch (err) {
      console.error("Error toggling like:", err);
    }
  };

  if (loading) return <div className="mt-3 text-muted">Loading theses…</div>;

  if (loadError) {
    return (
      <div className="mt-3 alert alert-danger" role="alert">
        {loadError}
      </div>
    );
  }

  return (
    <div className="mt-3 mc-thesis-page">
      <ModalView thesis={selectedForView} />

      <div className="mc-focus-header">
        <h5 className="m-0 mc-thesis-title">
          Theses from {institutionName || "Institution"}
        </h5>
      </div>

      {/* Topbar (igual estilo) */}
      <div className="row g-3 align-items-center mb-3">
        <div className="col-lg-8">
          <div className="d-flex gap-2">
            <input
              className="form-control"
              placeholder="Search theses by title, author or keyword…"
              value={query}
              onChange={(e) => {
                setPage(1);
                setQuery(e.target.value);
              }}
            />

            <div className="dropdown mc-sort mc-select">
              <button
                className="btn btn-outline-secondary dropdown-toggle droptoogle-fixv"
                type="button"
                data-bs-toggle="dropdown"
                aria-expanded="false"
              >
                Sort by:{" "}
                {THESIS_SORT_OPTIONS.find((o) => o.key === sortBy)?.label ??
                  "—"}
              </button>
              <ul className="dropdown-menu dropdown-menu-end mc-select">
                {THESIS_SORT_OPTIONS.map((opt) => (
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
        {/* LEFT: list */}
        <div className="col-lg-8 d-flex flex-column gap-3">
          {pageItems.map((t, idx) => {
            const rowKey = `${t._id}-${start + idx}`;
            const isLiked = liked[t._id] ?? t.userLiked ?? false;

            return (
              <div key={rowKey} className="card mc-thesis-card shadow-sm">
                <div className="card-body mc-thesis-card-body d-flex align-items-start gap-3 mc-card-stack">
                  {/* Info */}
                  <div className="flex-grow-1" style={{ minWidth: 0 }}>
                    <h5 className="m-0 mc-thesis-title">{t.title}</h5>

                    <div className="text-muted small mt-1">
                      <span className="mc-label-muted">Institution:</span>{" "}
                      {institutionName || "Institution"}
                      {t.department ? ` · ${t.department}` : ""}
                    </div>

                    <div className="text-muted small">
                      <span className="mc-label-muted">Authors:</span>{" "}
                      {Array.isArray(t.authors)
                        ? t.authors
                            .map((a) =>
                              typeof a === "string"
                                ? a
                                : `${a.lastname ?? ""} ${a.name ?? ""}`.trim()
                            )
                            .join(", ")
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

                  {/* Actions */}
                  <div className="d-flex align-items-center gap-2 mc-actions-wrap">
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
                      title="Copy citation"
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
            <div className="text-muted">
              No theses found for this institution.
            </div>
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

        {/* RIGHT: filters (desktop) */}
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
                          name={`status-inst-${institutionId}`}
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

              {/* Year */}
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
                            name={`lang-inst-${institutionId}`}
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
                    )
                  )}
                </div>
              </div>

              {/* Degree (dropdown tipo mc-select, igual a Country / Sort) */}
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
                            setDegree(d);
                            setPage(1);
                          }}
                        >
                          {d === "all" ? "All" : d}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Institution (dropdown visual bloqueado, mismo look que selects) */}
              <div className="mb-3">
                <label className="form-label mc-filter-label">
                  Institution
                </label>

                <div className="dropdown mc-filter-select mc-select">
                  <button
                    className="btn btn-outline-secondary dropdown-toggle droptoogle-fix"
                    type="button"
                    disabled
                  >
                    <span className="mc-filter-select-text">
                      {institutionName}
                    </span>
                  </button>
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
    </div>
  );
};

// ===================== InstitutionsSearch =====================
const InstitutionsSearch = () => {
  const [institutions, setInstitutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // Conteos SOLO de APPROVED + PENDING (rechazadas NO cuentan)
  const [thesisCounts, setThesisCounts] = useState({});

  // Filters
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");
  const [country, setCountry] = useState("all");
  const [onlyMembers, setOnlyMembers] = useState(false);

  // Sort + pagination
  const [sortBy, setSortBy] = useState("name_az");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Focus mode
  const [focusedInstitutionId, setFocusedInstitutionId] = useState(null);

  const headerRef = useRef(true);

  useEffect(() => {
    headerRef.current = true;

    const fetchInstitutions = async () => {
      try {
        setLoading(true);
        setLoadError("");

        const tokenLocal = localStorage.getItem("memorychain_token");
        const headers = tokenLocal
          ? { Authorization: `Bearer ${tokenLocal}` }
          : undefined;

        const res = await axios.get(
          `${API_BASE_URL}/api/institutions`,
          headers ? { headers } : undefined
        );

        const data = Array.isArray(res.data) ? res.data : [];
        setInstitutions(data);
      } catch (err) {
        console.error("Error loading institutions:", err);
        setLoadError("Error loading institutions. Please try again later.");
        setInstitutions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchInstitutions();
  }, []);

  useEffect(() => {
    const fetchThesesAndBuildCounts = async () => {
      try {
        const tokenLocal = localStorage.getItem("memorychain_token");
        const headers = tokenLocal
          ? { Authorization: `Bearer ${tokenLocal}` }
          : undefined;

        const res = await axios.get(
          `${API_BASE_URL}/api/theses`,
          headers ? { headers } : undefined
        );

        const theses = Array.isArray(res.data) ? res.data : [];
        const counts = {};

        for (const thesis of theses) {
          const status = normalizeStatus(thesis?.status);
          if (status === "REJECTED") continue;
          if (status !== "APPROVED" && status !== "PENDING") continue;

          const instField = thesis.institution;
          const instId =
            typeof instField === "string"
              ? instField
              : instField?._id
              ? String(instField._id)
              : null;

          if (!instId) continue;
          counts[instId] = (counts[instId] || 0) + 1;
        }

        setThesisCounts(counts);
      } catch (err) {
        console.error("Error loading theses for counts:", err);
        setThesisCounts({});
      }
    };

    fetchThesesAndBuildCounts();
  }, []);

  const countryOptions = useMemo(() => {
    const set = new Set(institutions.map((i) => i.country).filter(Boolean));
    return ["all", ...Array.from(set)];
  }, [institutions]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const selectedType = type.toLowerCase();
    const selectedCountry = country.toLowerCase();

    return institutions.filter((i) => {
      const name = i.name || "";
      const countryVal = i.country || "";
      const typeVal = i.type || "";
      const isMemberVal = !!i.isMember;

      const matchesQ =
        !q ||
        name.toLowerCase().includes(q) ||
        countryVal.toLowerCase().includes(q);

      const matchesType =
        selectedType === "all" || typeVal.toLowerCase() === selectedType;

      const matchesCountry =
        selectedCountry === "all" ||
        countryVal.toLowerCase() === selectedCountry;

      const matchesMember = !onlyMembers || isMemberVal;

      return matchesQ && matchesType && matchesCountry && matchesMember;
    });
  }, [institutions, query, type, country, onlyMembers]);

  const filteredOrdered = useMemo(() => {
    const arr = [...filtered];

    arr.sort((a, b) => {
      const nameCmp = (a.name || "").localeCompare(b.name || "");
      const idCmp = String(a._id ?? "").localeCompare(String(b._id ?? ""));

      const ta = thesisCounts[a._id] ?? 0;
      const tb = thesisCounts[b._id] ?? 0;

      switch (sortBy) {
        case "name_az":
          if (nameCmp !== 0) return nameCmp;
          return idCmp;
        case "name_za":
          if (nameCmp !== 0) return -nameCmp;
          return idCmp;
        case "theses_most":
          if (tb !== ta) return tb - ta;
          if (nameCmp !== 0) return nameCmp;
          return idCmp;
        case "theses_least":
          if (ta !== tb) return ta - tb;
          if (nameCmp !== 0) return nameCmp;
          return idCmp;
        default:
          return 0;
      }
    });

    return arr;
  }, [filtered, sortBy, thesisCounts]);

  const totalPages = Math.max(1, Math.ceil(filteredOrdered.length / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const start = (currentPage - 1) * pageSize;
  const end = start + pageSize;

  const institutionsToRender = useMemo(() => {
    if (focusedInstitutionId) {
      return filteredOrdered.filter(
        (i) => String(i._id) === String(focusedInstitutionId)
      );
    }
    return filteredOrdered.slice(start, end);
  }, [filteredOrdered, focusedInstitutionId, start, end]);

  const pagesArray = useMemo(
    () => Array.from({ length: totalPages }, (_, i) => i + 1),
    [totalPages]
  );

  const go = (p) => setPage(p);

  const handleToggleFocus = (id) => {
    setFocusedInstitutionId((current) =>
      current && String(current) === String(id) ? null : String(id)
    );
  };

  if (loading) {
    return (
      <div className="container py-3 mc-thesis-page">
        <div className="text-muted">Loading institutions…</div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="container py-3 mc-thesis-page">
        <div className="alert alert-danger" role="alert">
          {loadError}
        </div>
      </div>
    );
  }

  const showHeader = !focusedInstitutionId;

  return (
    <div className="container py-3 mc-thesis-page">
      {/* Header search + sort (solo si NO hay foco) */}
      {showHeader && (
        <div className="row g-3 align-items-center mb-3">
          <div className="col-lg-8">
            <div className="d-flex gap-2">
              <input
                className="form-control"
                placeholder="Search institutions by name or country…"
                value={query}
                onChange={(e) => {
                  setPage(1);
                  setQuery(e.target.value);
                }}
              />

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
      )}

      <div className="row">
        {/* LEFT: listado de instituciones */}
        <div
          className={
            focusedInstitutionId
              ? "col-12 d-flex flex-column gap-3"
              : "col-lg-8 d-flex flex-column gap-3"
          }
        >
          {institutionsToRender.map((i, idx) => {
            const rowKey = `${i._id}-${
              focusedInstitutionId ? idx : start + idx
            }`;
            const thesisCount = thesisCounts[i._id] ?? 0;
            const isFocused = focusedInstitutionId === String(i._id);

            return (
              <React.Fragment key={rowKey}>
                {/* Institution card (misma estética) */}
                <div className="card mc-thesis-card shadow-sm">
                  <div className="card-body mc-thesis-card-body d-flex align-items-start gap-3 mc-card-stack">
                    {/* Logo */}
                    <div className="mc-inst-logo">
                      {i.logoUrl ? (
                        <img
                          src={i.logoUrl}
                          alt={i.name}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                      ) : (
                        <div className="w-100 h-100 d-flex align-items-center justify-content-center text-muted small">
                          No logo
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-grow-1" style={{ minWidth: 0 }}>
                      <div className="d-flex align-items-center gap-2 flex-wrap">
                        <h5 className="m-0 mc-thesis-title">{i.name}</h5>

                        {i.isMember ? (
                          <span className="badge text-bg-success">Active</span>
                        ) : (
                          <span className="badge text-bg-danger">Inactive</span>
                        )}
                      </div>

                      <div className="text-muted small mt-1">{i.country}</div>
                      <div className="text-muted small">
                        {formatType(i.type)} - {thesisCount} thes
                        {thesisCount !== 1 ? "es" : "is"}
                      </div>
                    </div>

                    {/* Actions (mismo responsive/espaciado) */}
                    <div className="d-flex align-items-center gap-2 mc-actions-wrap">
                      <button
                        type="button"
                        className="btn btn-warning"
                        title={isFocused ? "Close view" : "View theses"}
                        onClick={() => handleToggleFocus(i._id)}
                      >
                        {isFocused ? CloseIcon : OpenBook}
                      </button>

                      {i.website && (
                        <a
                          href={i.website}
                          className="btn btn-memory"
                          target="_blank"
                          rel="noreferrer"
                          title="Open website"
                        >
                          {WebPage}
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Focus: tesis */}
                {isFocused && (
                  <InstitutionThesisSubsearch
                    institutionId={String(i._id)}
                    institutionName={i.name}
                  />
                )}
              </React.Fragment>
            );
          })}

          {institutionsToRender.length === 0 && (
            <div className="text-muted">No institutions found.</div>
          )}

          {/* Pagination (solo si NO hay foco) */}
          {!focusedInstitutionId && (
            <nav
              aria-label="Institutions pagination"
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
          )}
        </div>

        {/* RIGHT: filtros instituciones (solo desktop y solo si NO hay foco) */}
        {!focusedInstitutionId && (
          <div className="col-lg-4 d-none d-lg-block">
            <div
              className="card mc-filters mc-filters-card sticky-top"
              style={{ top: "1rem" }}
            >
              <div className="mc-filters-header-dark">
                <span className="mc-filters-title">Filters</span>
              </div>

              <div className="card-body mc-filters-body">
                {/* Type */}
                <div className="mb-3">
                  <label className="form-label mc-filter-label">
                    Institution type
                  </label>

                  <div className="row">
                    {[
                      "all",
                      "university",
                      "institute",
                      "college",
                      "academic",
                      "other",
                    ].map((t) => (
                      <div key={t} className="col-6 col-md-4">
                        <label className="form-check mc-filter-check">
                          <input
                            className="form-check-input mc-check"
                            type="radio"
                            name="type"
                            value={t}
                            checked={type === t}
                            onChange={(e) => {
                              setType(e.target.value);
                              setPage(1);
                            }}
                          />
                          <span className="form-check-label text-capitalize ms-1">
                            {t}
                          </span>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Country (✅ como ThesisSearch: mc-select en el SELECT) */}
                <div className="mb-3">
                  <label className="form-label mc-filter-label">Country</label>

                  <div className="dropdown mc-filter-select mc-select">
                    <button
                      className="btn btn-outline-secondary dropdown-toggle droptoogle-fix"
                      type="button"
                      data-bs-toggle="dropdown"
                      aria-expanded="false"
                    >
                      <span className="mc-filter-select-text">
                        {country === "all" ? "All" : country || "All"}
                      </span>
                    </button>

                    <ul className="dropdown-menu mc-select">
                      {countryOptions.map((c) => (
                        <li key={c}>
                          <button
                            type="button"
                            className={`dropdown-item ${
                              country === c ? "active" : ""
                            }`}
                            onClick={() => {
                              setCountry(c);
                              setPage(1);
                            }}
                          >
                            {c === "all" ? "All" : c}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Only active memberships */}
                <div className="mb-2 form-check text-end d-flex justify-content-center align-items-center">
                  <input
                    id="onlyMembers"
                    className="form-check-input mc-check"
                    type="checkbox"
                    checked={onlyMembers}
                    onChange={(e) => {
                      setOnlyMembers(e.target.checked);
                      setPage(1);
                    }}
                  />
                  <label
                    htmlFor="onlyMembers"
                    className="form-check-label ms-2"
                  >
                    Only active memberships
                  </label>
                </div>

                {/* Reset */}
                <div className="text-end d-flex justify-content-center align-items-center">
                  <button
                    className="btn btn-outline-secondary btn-sm"
                    onClick={() => {
                      setQuery("");
                      setType("all");
                      setCountry("all");
                      setOnlyMembers(false);
                      setSortBy("name_az");
                      setPage(1);
                    }}
                    type="button"
                  >
                    Clear filters
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InstitutionsSearch;
