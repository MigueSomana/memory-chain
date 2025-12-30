import React, { useMemo, useState, useEffect, useRef } from "react";
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
  const year = thesis?.year ? String(thesis.year) : "n.d.";
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

  const cid = thesis?.ipfsCid;
  const url = cid && gatewayDomain ? `https://${gatewayDomain}/ipfs/${cid}` : "";

  const bracket = instName ? `[${thesisType}, ${instName}]` : `[${thesisType}]`;

  const base = `${authors} (${year}). ${title} ${bracket}`;
  if (url) return `${base}. ${url}`;
  return `${base}.`;
}

// ===================== SUBCOMPONENT: InstitutionThesisSubsearch =====================
const InstitutionThesisSubsearch = ({ institutionId, institutionName }) => {
  // ---------- Estado data + UI ----------
  const [theses, setTheses] = useState([]);
  const [liked, setLiked] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // ---------- Estado filtros tesis ----------
  const [query, setQuery] = useState("");
  const [language, setLanguage] = useState("all");
  const [degree, setDegree] = useState("all");

  const now = new Date().getFullYear();
  const [minYear, setMinYear] = useState(1980);
  const [maxYear, setMaxYear] = useState(now);

  const [sortBy, setSortBy] = useState("recent");

  // Filtro por status en modo focus
  const [statusFilter, setStatusFilter] = useState("all"); // "all" | "APPROVED" | "PENDING"

  // ---------- Estado paginación ----------
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Load: tesis SOLO de la institución
  useEffect(() => {
    const fetchTheses = async () => {
      try {
        setLoading(true);
        setLoadError("");

        const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

        const res = await axios.get(
          `${API_BASE_URL}/api/theses/sub/${institutionId}`,
          headers ? { headers } : undefined
        );

        const data = Array.isArray(res.data) ? res.data : [];

        // Identificar usuario actual (para marcar likes)
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

        // Normaliza likes + userLiked
        const mapped = data.map((t) => {
          const likes = t.likes ?? 0;
          const userLiked =
            Array.isArray(t.likedBy) && currentUserId
              ? t.likedBy.some((u) => String(u._id ?? u) === String(currentUserId))
              : false;

          return { ...t, likes, userLiked };
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

  // Filtrado: query + idioma + grado + rango de año + status (oculta REJECTED siempre)
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const selectedStatus = normalizeStatus(statusFilter); // ALL / APPROVED / PENDING

    return theses.filter((t) => {
      const status = normalizeStatus(t.status);

      // REGLA BASE: NO mostrar rechazadas
      if (status === "REJECTED") return false;

      // Filtro por status
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

      const matchesDegree = degree === "all" || String(t.degree || "") === degree;

      const yearNum = Number(t.year);
      const inYearRange =
        !Number.isNaN(yearNum) && yearNum >= Number(minYear) && yearNum <= Number(maxYear);

      return matchesStatus && matchesQ && matchesLang && matchesDegree && inYearRange;
    });
  }, [theses, query, language, degree, minYear, maxYear, statusFilter]);

  // Sort
  const filteredOrdered = useMemo(() => {
    const arr = [...filtered];

    arr.sort((a, b) => {
      const byTitle = (a.title || "").localeCompare(b.title || "");
      const byId = String(a._id ?? "").localeCompare(String(b._id ?? ""));
      const ya = Number(a.year);
      const yb = Number(b.year);
      const ra = Number(a.likes ?? 0);
      const rb = Number(b.likes ?? 0);

      switch (sortBy) {
        case "recent":
          if (yb !== ya) return yb - ya;
          if (byTitle !== 0) return byTitle;
          return byId;
        case "oldest":
          if (ya !== yb) return ya - yb;
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

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredOrdered.length / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const start = (currentPage - 1) * pageSize;
  const end = start + pageSize;

  const pageItems = useMemo(() => filteredOrdered.slice(start, end), [filteredOrdered, start, end]);

  const pagesArray = useMemo(
    () => Array.from({ length: totalPages }, (_, i) => i + 1),
    [totalPages]
  );

  const go = (p) => setPage(p);

  // Actions
  const handleView = (thesis) => {
    const cid = thesis.ipfsCid;
    if (!cid) {
      alert("This thesis does not have a downloadable file.");
      return;
    }
    const url = `https://${gateway}/ipfs/${cid}#toolbar=0&navpanes=0&scrollbar=0`;
    window.open(url, "_blank");
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
    if (!token) {
      console.warn("No auth token, no se puede hacer like");
      return;
    }

    try {
      const headers = { Authorization: `Bearer ${token}` };

      const res = await axios.post(`${API_BASE_URL}/api/theses/${id}/like`, null, { headers });

      const { thesis, liked: isLiked } = res.data || {};

      if (thesis && thesis._id) {
        setTheses((prev) =>
          prev.map((t) =>
            t._id === thesis._id
              ? { ...t, likes: thesis.likes ?? 0, userLiked: !!isLiked }
              : t
          )
        );
      }

      setLiked((prev) => ({ ...prev, [id]: !!isLiked }));
    } catch (err) {
      console.error("Error toggling like (subventana):", err);
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
    <div className="mt-4">
      <h5 className="mb-3">Theses from {institutionName || "Institution"}</h5>

      {/* Barra: search + sort */}
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

            <div className="dropdown mc-sort">
              <button
                className="btn btn-outline-secondary dropdown-toggle"
                type="button"
                data-bs-toggle="dropdown"
                aria-expanded="false"
              >
                Sort by: {THESIS_SORT_OPTIONS.find((o) => o.key === sortBy)?.label ?? "—"}
              </button>

              <ul className="dropdown-menu dropdown-menu-end">
                {THESIS_SORT_OPTIONS.map((opt) => (
                  <li key={opt.key}>
                    <button
                      className={`dropdown-item ${sortBy === opt.key ? "active" : ""}`}
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
            {filteredOrdered.length} result{filteredOrdered.length !== 1 ? "s" : ""} · Page{" "}
            {currentPage} of {totalPages}
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
              <div key={rowKey} className="card shadow-sm">
                <div className="card-body d-flex align-items-center gap-3">
                  {/* Thumbnail */}
                  <div
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: 12,
                      overflow: "hidden",
                      background: "#f8f9fa",
                      border: "1px solid #eee",
                      flex: "0 0 auto",
                    }}
                    className="d-flex align-items-center justify-content-center text-muted"
                  >
                    PDF
                  </div>

                  {/* Info */}
                  <div className="flex-grow-1">
                    <h5 className="m-0">{t.title}</h5>

                    <div className="text-muted small">
                      Institution:&nbsp;{institutionName || "Institution"}
                      {t.department ? ` · ${t.department}` : ""}{" "}
                    </div>

                    <div className="text-muted small">
                      Autors:&nbsp;
                      {Array.isArray(t.authors)
                        ? t.authors
                            .map((a) =>
                              typeof a === "string"
                                ? a
                                : `${a.lastname ?? ""} ${a.name ?? ""}`.trim()
                            )
                            .join(", ")
                        : ""}
                      {" · "}
                    </div>

                    <div className="text-muted small">CID: {t.ipfsCid ?? ""}</div>

                    {t.keywords?.length ? (
                      <div className="mt-1 d-flex flex-wrap gap-2">
                        {t.keywords.map((k, kidx) => (
                          <span key={`${rowKey}-kw-${kidx}`} className="badge text-bg-light">
                            {k}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  {/* Actions */}
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
                        <span className="fw-semibold">{t.likes ?? 0}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {pageItems.length === 0 && (
            <div className="text-muted">No theses found for this institution.</div>
          )}

          {/* Pagination */}
          <nav aria-label="Theses pagination" className="mt-3 d-flex justify-content-center">
            <ul className="pagination mc-pagination">
              <li className={`page-item ${currentPage === 1 ? "disabled" : ""}`}>
                <button className="page-link" onClick={() => go(1)} type="button">
                  First
                </button>
              </li>

              {pagesArray.map((p) => (
                <li key={`p-${p}`} className={`page-item ${p === currentPage ? "active" : ""}`}>
                  <button className="page-link" onClick={() => go(p)} type="button">
                    {p}
                  </button>
                </li>
              ))}

              <li className={`page-item ${currentPage === totalPages ? "disabled" : ""}`}>
                <button className="page-link" onClick={() => go(totalPages)} type="button">
                  Last
                </button>
              </li>
            </ul>
          </nav>
        </div>

        {/* RIGHT: filtros (desktop) */}
        <div className="col-lg-4 d-none d-lg-block">
          <div className="card mc-filters sticky-top" style={{ top: "1rem" }}>
            <div className="card-header">Filters</div>

            <div className="card-body">
              {/* Status filter */}
              <div className="mb-3">
                <label className="form-label">Status</label>

                <div className="row">
                  {[
                    { key: "all", label: "All Status" }, 
                    { key: "APPROVED", label: "Approved" },
                    { key: "PENDING", label: "Pending" },
                  ].map((s) => (
                    <div key={s.key} className="col-6 col-md-4">
                      <label className="form-check">
                        <input
                          className="form-check-input"
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

              {/* Year range */}
              <div className="mb-3">
                <div className="d-flex justify-content-between align-items-center">
                  <label className="form-label m-0">
                    From year: <strong>{minYear}</strong>
                  </label>
                  <span className="small text-muted">
                    To: <strong>{maxYear}</strong>
                  </span>
                </div>

                <div className="mc-dualrange position-relative" style={{ height: 36 }}>
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
                    style={{ background: "transparent", pointerEvents: "none", zIndex: 2 }}
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
                    style={{ background: "transparent", pointerEvents: "none", zIndex: 3 }}
                  />
                </div>
              </div>

              {/* Language */}
              <div className="mb-3">
                <label className="form-label">Language</label>
                <div className="row">
                  {["all", "en", "es", "fr", "pt", "ch", "ko", "ru"].map((l) => (
                    <div key={l} className="col-6 col-md-3">
                      <label className="form-check">
                        <input
                          className="form-check-input"
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
                  ))}
                </div>
              </div>

              {/* Degree */}
              <div className="mb-3">
                <label className="form-label">Degree</label>
                <select
                  className="form-select"
                  value={degree}
                  onChange={(e) => {
                    setPage(1);
                    setDegree(e.target.value);
                  }}
                >
                  {["all", "Bachelor", "Master", "PhD"].map((d) => (
                    <option key={d} value={d}>
                      {d === "all" ? "All" : d}
                    </option>
                  ))}
                </select>
              </div>

              {/* Institution fijo */}
              <div className="mb-3">
                <label className="form-label">Institution</label>
                <select className="form-select" value={institutionName} disabled>
                  <option>{institutionName}</option>
                </select>
              </div>

              {/* Reset */}
              <div className="text-end">
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

  // Load: institutions
  useEffect(() => {
    headerRef.current = true;

    const fetchInstitutions = async () => {
      try {
        setLoading(true);
        setLoadError("");

        const tokenLocal = localStorage.getItem("memorychain_token");
        const headers = tokenLocal ? { Authorization: `Bearer ${tokenLocal}` } : undefined;

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

  // Load: theses -> counts por institución SOLO (APPROVED + PENDING)
  useEffect(() => {
    const fetchThesesAndBuildCounts = async () => {
      try {
        const tokenLocal = localStorage.getItem("memorychain_token");
        const headers = tokenLocal ? { Authorization: `Bearer ${tokenLocal}` } : undefined;

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

  // Country options
  const countryOptions = useMemo(() => {
    const set = new Set(institutions.map((i) => i.country).filter(Boolean));
    return ["all", ...Array.from(set)];
  }, [institutions]);

  // Filter institutions
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
        !q || name.toLowerCase().includes(q) || countryVal.toLowerCase().includes(q);

      const matchesType = selectedType === "all" || typeVal.toLowerCase() === selectedType;

      const matchesCountry =
        selectedCountry === "all" || countryVal.toLowerCase() === selectedCountry;

      const matchesMember = !onlyMembers || isMemberVal;

      return matchesQ && matchesType && matchesCountry && matchesMember;
    });
  }, [institutions, query, type, country, onlyMembers]);

  // Sort institutions (por nombre o por conteo)
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

  // Pagination only when not focused
  const totalPages = Math.max(1, Math.ceil(filteredOrdered.length / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const start = (currentPage - 1) * pageSize;
  const end = start + pageSize;

  const institutionsToRender = useMemo(() => {
    if (focusedInstitutionId) {
      return filteredOrdered.filter((i) => String(i._id) === String(focusedInstitutionId));
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
      <div className="container py-2">
        <div className="text-muted">Loading institutions…</div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="container py-2">
        <div className="alert alert-danger" role="alert">
          {loadError}
        </div>
      </div>
    );
  }

  const showHeader = !focusedInstitutionId;

  return (
    <div className="container py-2">
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

              <div className="dropdown mc-sort">
                <button
                  className="btn btn-outline-secondary dropdown-toggle"
                  type="button"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                >
                  Sort By: {SORT_OPTIONS.find((o) => o.key === sortBy)?.label ?? "—"}
                </button>

                <ul className="dropdown-menu dropdown-menu-end">
                  {SORT_OPTIONS.map((opt) => (
                    <li key={opt.key}>
                      <button
                        className={`dropdown-item ${sortBy === opt.key ? "active" : ""}`}
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
              {filteredOrdered.length} result{filteredOrdered.length !== 1 ? "s" : ""} · Page{" "}
              {currentPage} of {totalPages}
            </span>
          </div>
        </div>
      )}

      <div className="row">
        {/* LEFT: listado de instituciones */}
        <div className={focusedInstitutionId ? "col-12 d-flex flex-column gap-3" : "col-lg-8 d-flex flex-column gap-3"}>
          {institutionsToRender.map((i, idx) => {
            const rowKey = `${i._id}-${focusedInstitutionId ? idx : start + idx}`;
            const thesisCount = thesisCounts[i._id] ?? 0; 
            const isFocused = focusedInstitutionId === String(i._id);

            return (
              <React.Fragment key={rowKey}>
                <div className="card shadow-sm">
                  <div className="card-body d-flex align-items-center gap-3">
                    {/* Logo */}
                    <div
                      style={{
                        width: 72,
                        height: 72,
                        borderRadius: 12,
                        overflow: "hidden",
                        background: "#f8f9fa",
                        border: "1px solid #eee",
                        flex: "0 0 auto",
                      }}
                    >
                      {i.logoUrl ? (
                        <img
                          src={i.logoUrl}
                          alt={i.name}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      ) : (
                        <div className="w-100 h-100 d-flex align-items-center justify-content-center text-muted small">
                          No logo
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-grow-1">
                      <div className="d-flex align-items-center gap-2">
                        <h5 className="m-0">{i.name}</h5>
                        {i.isMember ? (
                          <span className="badge text-bg-success">Active</span>
                        ) : (
                          <span className="badge text-bg-danger">Deactive</span>
                        )}
                      </div>

                      <div className="text-muted small">
                        {i.country} · {formatType(i.type)} · {thesisCount} thesis
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="d-flex align-items-center gap-2">
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

          {institutionsToRender.length === 0 && <div className="text-muted">No institutions found.</div>}

          {/* Pagination (solo si NO hay foco) */}
          {!focusedInstitutionId && (
            <nav aria-label="Institutions pagination" className="mt-3 d-flex justify-content-center">
              <ul className="pagination mc-pagination">
                <li className={`page-item ${currentPage === 1 ? "disabled" : ""}`}>
                  <button className="page-link" onClick={() => go(1)} type="button">
                    First
                  </button>
                </li>

                {pagesArray.map((p) => (
                  <li key={`p-${p}`} className={`page-item ${p === currentPage ? "active" : ""}`}>
                    <button className="page-link" onClick={() => go(p)} type="button">
                      {p}
                    </button>
                  </li>
                ))}

                <li className={`page-item ${currentPage === totalPages ? "disabled" : ""}`}>
                  <button className="page-link" onClick={() => go(totalPages)} type="button">
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
            <div className="card mc-filters sticky-top" style={{ top: "1rem" }}>
              <div className="card-header">Filters</div>

              <div className="card-body">
                {/* Type */}
                <div className="mb-3">
                  <label className="form-label">Institution type</label>

                  <div className="row">
                    {["all", "university", "institute", "college", "academic", "other"].map((t) => (
                      <div key={t} className="col-6 col-md-4">
                        <label className="form-check">
                          <input
                            className="form-check-input"
                            type="radio"
                            name="type"
                            value={t}
                            checked={type === t}
                            onChange={(e) => {
                              setType(e.target.value);
                              setPage(1);
                            }}
                          />
                          <span className="form-check-label text-capitalize ms-1">{t}</span>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Country */}
                <div className="mb-3">
                  <label className="form-label">Country</label>
                  <select
                    className="form-select"
                    value={country}
                    onChange={(e) => {
                      setCountry(e.target.value);
                      setPage(1);
                    }}
                  >
                    {countryOptions.map((c) => (
                      <option key={c} value={c}>
                        {c === "all" ? "All" : c}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Only active memberships */}
                <div className="mb-2 form-check text-end d-flex justify-content-center align-items-center">
                  <input
                    id="onlyMembers"
                    className="form-check-input"
                    type="checkbox"
                    checked={onlyMembers}
                    onChange={(e) => {
                      setOnlyMembers(e.target.checked);
                      setPage(1);
                    }}
                  />
                  <label htmlFor="onlyMembers" className="form-check-label">
                    &nbsp; Only active memberships
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
