import React, { useMemo, useState, useEffect } from "react";
import axios from "axios";
import { getAuthRole, getAuthToken } from "../../utils/authSession";
import { OpenBook, WebPage, EyeFillIcon, CloseIcon, CloudArrowDownFill, HeartFill, HeartOutline } from "../../utils/icons";
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";
const role = getAuthRole();
const token = getAuthToken();
var encabezadoshow = true;

// Opciones de ordenamiento (ya sin ratings ni likes)
const SORT_OPTIONS = [
  { key: "name_az", label: "Name A–Z" },
  { key: "name_za", label: "Name Z–A" },
  { key: "theses_most", label: "Most theses" },
  { key: "theses_least", label: "Fewest theses" },
];

// helper para mostrar el type capitalizado
const formatType = (t) =>
  t ? t.charAt(0).toUpperCase() + t.slice(1).toLowerCase() : "";

/** ========== SUBCOMPONENTE: BUSCADOR DE TESIS POR INSTITUCIÓN ========== */

const THESIS_SORT_OPTIONS = [
  { key: "recent", label: "Most recent" },
  { key: "oldest", label: "Oldest" },
  { key: "title_az", label: "Title A–Z" },
  { key: "title_za", label: "Title Z–A" },
  { key: "ratings_most", label: "Most ratings" },
  { key: "ratings_least", label: "Least ratings" },
];

// helper para autores (igual que en ThesisSearch)
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

// Subvista de tesis limitada a una institución
const InstitutionThesisSubsearch = ({ institutionId, institutionName }) => {
  const [theses, setTheses] = useState([]);
  const [liked, setLiked] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [query, setQuery] = useState("");
  const [language, setLanguage] = useState("all");
  const [degree, setDegree] = useState("all");
  const now = new Date().getFullYear();
  const [minYear, setMinYear] = useState(1980);
  const [maxYear, setMaxYear] = useState(now);
  const [sortBy, setSortBy] = useState("recent");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // cargar tesis de esa institución
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

        // sacar id del usuario actual desde localStorage
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

        // normalizar y marcar si el usuario ya dio like
        const mapped = data.map((t) => {
          const likes = t.likes ?? 0;
          const ratingCount = t.ratingCount ?? 0;

          const userLiked =
            Array.isArray(t.likedBy) && currentUserId
              ? t.likedBy.some(
                  (u) => String(u._id ?? u) === String(currentUserId)
                )
              : false;

          return {
            ...t,
            likes,
            ratingCount,
            userLiked,
          };
        });

        setTheses(mapped);

        // mapa inicial de liked basado en userLiked
        const likedMap = {};
        mapped.forEach((t) => {
          likedMap[t._id] = !!t.userLiked;
        });
        setLiked(likedMap);
      } catch (err) {
        console.error("Error loading theses for institution:", err);
        setLoadError("Error loading theses. Please try again later.");
        setTheses([]);
      } finally {
        setLoading(false);
      }
    };

    if (institutionId) {
      fetchTheses();
    }
  }, [institutionId]);

  const institutionLabel = institutionName || "Institution";

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return theses.filter((t) => {
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

      const yearNum = Number(t.year);
      const inYearRange =
        !Number.isNaN(yearNum) &&
        yearNum >= Number(minYear) &&
        yearNum <= Number(maxYear);

      return matchesQ && matchesLang && matchesDegree && inYearRange;
    });
  }, [theses, query, language, degree, minYear, maxYear]);

  const filteredOrdered = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      const byTitle = (a.title || "").localeCompare(b.title || "");
      const byId = String(a._id ?? "").localeCompare(String(b._id ?? ""));
      const ya = Number(a.year);
      const yb = Number(b.year);
      const ra = a.ratingCount ?? 0;
      const rb = b.ratingCount ?? 0;

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

  // VIEW / DOWNLOAD Handlers (por ahora sólo log)
  const handleView = (thesis) => {
    console.log("hola soy view (subventana)", thesis._id, thesis.title);
    // aquí luego puedes abrir modal, navegar a detalle, etc.
  };

  const handleDownload = (thesis) => {
    console.log("hola soy download (subventana)", thesis._id, thesis.title);
    // aquí luego puedes hacer window.open a la URL IPFS, etc.
  };

  // LIKE sincronizado con backend (igual que ThesisSearch)
  const handleToggleLike = async (id) => {
    if (!token) {
      console.warn("No auth token, no se puede hacer like");
      return;
    }

    try {
      const headers = { Authorization: `Bearer ${token}` };

      const res = await axios.post(
        `${API_BASE_URL}/api/theses/${id}/like`,
        null,
        { headers }
      );

      const { thesis, liked: isLiked } = res.data || {};

      // actualizar likes y userLiked en la lista local
      if (thesis && thesis._id) {
        setTheses((prev) =>
          prev.map((t) =>
            t._id === thesis._id
              ? {
                  ...t,
                  likes: thesis.likes ?? 0,
                  userLiked: !!isLiked,
                }
              : t
          )
        );
      }

      setLiked((prev) => ({ ...prev, [id]: !!isLiked }));
    } catch (err) {
      console.error("Error toggling like (subventana):", err);
    }
  };

  if (loading) {
    return (
      <div className="mt-3 text-muted">Loading theses for this institution…</div>
    );
  }

  if (loadError) {
    return (
      <div className="mt-3 alert alert-danger" role="alert">
        {loadError}
      </div>
    );
  }

  return (
    <div className="mt-4">
      <h5 className="mb-3">Theses from {institutionLabel}</h5>

      {/* Search + Sort */}
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
                Sort by:{" "}
                {THESIS_SORT_OPTIONS.find((o) => o.key === sortBy)?.label ?? "—"}
              </button>
              <ul className="dropdown-menu dropdown-menu-end">
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

                  {/* Main info */}
                  <div className="flex-grow-1">
                    <h5 className="m-0">{t.title}</h5>
                    <div className="text-muted small">
                      {institutionLabel}
                      {t.department ? ` · ${t.department}` : ""}
                    </div>
                    <div className="text-muted small">
                      {Array.isArray(t.authors)
                        ? t.authors
                            .map((a) =>
                              typeof a === "string"
                                ? a
                                : `${a.lastname ?? ""} ${a.name ?? ""}`.trim()
                            )
                            .join(", ")
                        : typeof t.authors === "object" && t.authors !== null
                        ? `${t.authors.lastname ?? ""} ${
                            t.authors.name ?? ""
                          }`.trim()
                        : ""}
                    </div>
                    <div className="text-muted small">
                      {t.year ? `${t.year} · ` : ""}
                      {(t.language || "").toUpperCase()} · {t.degree} ·{" "}
                      {t.ratingCount ?? 0} ratings
                    </div>
                    {t.keywords?.length ? (
                      <div className="mt-1 d-flex flex-wrap gap-2">
                        {t.keywords.map((k, kidx) => (
                          <span
                            key={`${rowKey}-kw-${kidx}`}
                            className="badge text-bg-light"
                          >
                            {k}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  {/* ACTIONS */}
                  <div className="d-flex align-items-center gap-2">
                    {/* View */}
                    <button
                      type="button"
                      className="btn btn-warning btn-sm"
                      title="View"
                      onClick={() => handleView(t)}
                    >
                      {EyeFillIcon}
                    </button>

                    {/* Download */}
                    <button
                      type="button"
                      className="btn btn-memory btn-sm"
                      title="Download"
                      onClick={() => handleDownload(t)}
                    >
                      {CloudArrowDownFill}
                    </button>

                    {/* Like (oculto para institutions) */}
                    {role !== "INSTITUTION" && (
                      <button
                        type="button"
                        className="btn btn-danger btn-sm d-flex align-items-center gap-1"
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
                <button className="page-link" onClick={() => go(1)}>
                  First
                </button>
              </li>
              {pagesArray.map((p) => (
                <li
                  key={`p-${p}`}
                  className={`page-item ${p === currentPage ? "active" : ""}`}
                >
                  <button className="page-link" onClick={() => go(p)}>
                    {p}
                  </button>
                </li>
              ))}
              <li
                className={`page-item ${
                  currentPage === totalPages ? "disabled" : ""
                }`}
              >
                <button className="page-link" onClick={() => go(totalPages)}>
                  Last
                </button>
              </li>
            </ul>
          </nav>
        </div>

        {/* RIGHT: filtros de tesis */}
        <div className="col-lg-4 d-none d-lg-block">
          <div className="card mc-filters sticky-top" style={{ top: "1rem" }}>
            <div className="card-header">Filters</div>
            <div className="card-body">
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
                <label className="form-label">Language</label>
                <div className="d-flex flex-column gap-1">
                  {["all", "en", "es"].map((l) => (
                    <label key={l} className="form-check">
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

              {/* Institution: fijo, solo informativo */}
              <div className="mb-3">
                <label className="form-label">Institution</label>
                <select className="form-select" value={institutionLabel} disabled>
                  <option>{institutionLabel}</option>
                </select>
              </div>

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

/** ========== COMPONENTE PRINCIPAL: INSTITUTIONS SEARCH ========== */

const InstitutionsSearch = () => {
  const [institutions, setInstitutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [thesisCounts, setThesisCounts] = useState({});

  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");
  const [country, setCountry] = useState("all");
  const [onlyMembers, setOnlyMembers] = useState(false);
  const [sortBy, setSortBy] = useState("name_az");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [focusedInstitutionId, setFocusedInstitutionId] = useState(null);

  // ---------- CARGA INICIAL DESDE API (INSTITUTIONS) ----------
  useEffect(() => {
    encabezadoshow = true;
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

  // ---------- CARGA DE THESIS Y CÁLCULO DE COUNTS ----------
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

  // ---------- OPCIONES DE PAÍSES ----------
  const countryOptions = useMemo(() => {
    const set = new Set(institutions.map((i) => i.country).filter(Boolean));
    return ["all", ...Array.from(set)];
  }, [institutions]);

  // ---------- FILTRO ----------
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

  // ---------- ORDENAMIENTO ----------
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

  // ---------- PAGINACIÓN ----------
  const totalPages = Math.max(1, Math.ceil(filteredOrdered.length / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const start = (currentPage - 1) * pageSize;
  const end = start + pageSize;

  // Si hay institución en foco, ignoramos paginación y mostramos solo esa
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
    encabezadoshow = !encabezadoshow;
    setFocusedInstitutionId((current) =>
      current && String(current) === String(id) ? null : id
    );
  };

  // ---------- RENDER ----------
  if (loading) {
    return (
      <div className="container py-4">
        <div className="text-muted">Loading institutions…</div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="container py-4">
        <div className="alert alert-danger" role="alert">
          {loadError}
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4">
      {/* Search + sort */}
      {encabezadoshow && (
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
                  Sort By:{" "}
                  {SORT_OPTIONS.find((o) => o.key === sortBy)?.label ?? "—"}
                </button>
                <ul className="dropdown-menu dropdown-menu-end">
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
        {/* LEFT: list */}
        <div
          className={
            focusedInstitutionId
              ? "col-12 d-flex flex-column gap-3"
              : "col-lg-8 d-flex flex-column gap-3"
          }
        >
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
                      {i.logo ? (
                        <img
                          src={i.logo}
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

                    {/* Main info */}
                    <div className="flex-grow-1">
                      <div className="d-flex align-items-center gap-2">
                        <h5 className="m-0">{i.name}</h5>
                        {i.isMember ? (
                          <span className="badge text-bg-success">Active</span>
                        ) : (
                          <span className="badge text-bg-danger">
                            Deactive
                          </span>
                        )}
                      </div>
                      <div className="text-muted small">
                        {i.country} · {formatType(i.type)}
                        {` · ${thesisCount} thesis${
                          thesisCount === 1 ? "" : ""
                        }`}
                      </div>
                    </div>

                    {/* ACTIONS */}
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

                {/* Subvista de tesis debajo de la card cuando está en foco */}
                {isFocused && (
                  <InstitutionThesisSubsearch
                    institutionId={i._id}
                    institutionName={i.name}
                  />
                )}
              </React.Fragment>
            );
          })}

          {institutionsToRender.length === 0 && (
            <div className="text-muted">No institutions found.</div>
          )}

          {/* Pagination (solo cuando NO estamos en modo foco) */}
          {!focusedInstitutionId && (
            <nav
              aria-label="Institutions pagination"
              className="mt-3 d-flex justify-content-center"
            >
              <ul className="pagination mc-pagination">
                <li
                  className={`page-item ${
                    currentPage === 1 ? "disabled" : ""
                  }`}
                >
                  <button className="page-link" onClick={() => go(1)}>
                    First
                  </button>
                </li>
                {pagesArray.map((p) => (
                  <li
                    key={`p-${p}`}
                    className={`page-item ${
                      p === currentPage ? "active" : ""
                    }`}
                  >
                    <button className="page-link" onClick={() => go(p)}>
                      {p}
                    </button>
                  </li>
                ))}
                <li
                  className={`page-item ${
                    currentPage === totalPages ? "disabled" : ""
                  }`}
                >
                  <button className="page-link" onClick={() => go(totalPages)}>
                    Last
                  </button>
                </li>
              </ul>
            </nav>
          )}
        </div>

        {/* RIGHT: filters de instituciones (OCULTOS en modo foco) */}
        {!focusedInstitutionId && (
          <div className="col-lg-4 d-none d-lg-block">
            <div className="card mc-filters sticky-top" style={{ top: "1rem" }}>
              <div className="card-header">Filters</div>
              <div className="card-body">
                <div className="mb-3">
                  <label className="form-label">Type</label>
                  <div className="d-flex flex-column gap-1">
                    {["all", "university", "institute", "other"].map((t) => (
                      <label key={t} className="form-check">
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
                        <span className="form-check-label text-capitalize ms-1">
                          {t}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

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

                <div className="mb-2 form-check">
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
                    Only active memberships
                  </label>
                </div>

                <div className="text-end">
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
