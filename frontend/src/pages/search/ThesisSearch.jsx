import React, { useMemo, useState, useEffect } from "react";
import { getAuthRole, getAuthToken } from "../../utils/authSession";
import axios from "axios";
import { EyeFillIcon, HeartFill, HeartOutline, CloudArrowDownFill } from "../../utils/icons";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";
const role = getAuthRole();
const token = getAuthToken();

/** --------- ORDEN --------- */
const SORT_OPTIONS = [
  { key: "recent", label: "Most recent" },
  { key: "oldest", label: "Oldest" },
  { key: "title_az", label: "Title A–Z" },
  { key: "title_za", label: "Title Z–A" },
  { key: "ratings_most", label: "Most ratings" },
  { key: "ratings_least", label: "Least ratings" },
];

// helper para obtener el nombre de institución de forma robusta
const getInstitutionName = (thesis) => {
  const inst = thesis.institution;
  if (!inst) return "";
  if (typeof inst === "string") return inst;
  return inst.name || "";
};

// helper para convertir authors (strings u objetos) a un string buscable
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

const ThesisSearch = () => {
  // tesis reales desde backend
  const [theses, setTheses] = useState([]);
  const [liked, setLiked] = useState({});
  const [institutions, setInstitutions] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // ---------- Search & filters ----------
  const [query, setQuery] = useState("");
  const [language, setLanguage] = useState("all");
  const [degree, setDegree] = useState("all");
  const now = new Date().getFullYear();
  const [minYear, setMinYear] = useState(1980);
  const [maxYear, setMaxYear] = useState(now);
  const [institutionFilter, setInstitutionFilter] = useState("all");

  const [sortBy, setSortBy] = useState("recent");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // ---------- CARGA DE THESES ----------
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
            ? t.likedBy.some((u) => String(u._id ?? u) === String(currentUserId))
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
      console.error("Error loading theses:", err);
      setLoadError("Error loading theses. Please try again later.");
      setTheses([]);
    } finally {
      setLoading(false);
      }
    };

    fetchTheses();
  }, []);

  // ---------- CARGA DE INSTITUCIONES PARA FILTRO ----------
  useEffect(() => {
    const fetchInstitutions = async () => {
      try {
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
        console.error("Error loading institutions for thesis filter:", err);
        setInstitutions([]);
      }
    };

    fetchInstitutions();
  }, []);

  // instituciones para filtro (desde BD)
  const institutionOptions = useMemo(() => {
    const names = institutions.map((i) => i.name).filter(Boolean);
    const unique = Array.from(new Set(names)).sort((a, b) =>
      a.localeCompare(b)
    );
    return ["all", ...unique];
  }, [institutions]);

  // ---------- FILTRADO ----------
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const selectedInst = institutionFilter.toLowerCase();

    return theses.filter((t) => {
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

      const yearNum = Number(t.year);
      const inYearRange =
        !Number.isNaN(yearNum) &&
        yearNum >= Number(minYear) &&
        yearNum <= Number(maxYear);

      const matchesInst =
        selectedInst === "all" || instName.toLowerCase() === selectedInst;

      return (
        matchesQ && matchesLang && matchesDegree && inYearRange && matchesInst
      );
    });
  }, [theses, query, language, degree, minYear, maxYear, institutionFilter]);

  // ---------- ORDEN ----------
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

  // ---------- PAGINACIÓN ----------
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

  // ---------- HANDLERS VIEW / DOWNLOAD ----------
  const handleView = (thesis) => {
    console.log("hola soy view", thesis._id, thesis.title);
    // aquí luego puedes abrir modal, navegar a detalle, etc.
  };

  const handleDownload = (thesis) => {
    console.log("hola soy download", thesis._id, thesis.title);
    // aquí luego puedes hacer window.open a la URL IPFS, etc.
  };

  // ---------- LIKE: sincronizado con backend ----------
  const handleToggleLike = async (id) => {
    if (!token) {
      console.warn("No auth token, no se puede hacer like");
      return;
    }

    try {
      const headers = { Authorization: `Bearer ${token}` };

      // AJUSTA ESTA URL/MÉTODO SI TU ROUTE ES DISTINTO:
      // e.g. PATCH /api/theses/:id/like o /toggle-like
      const res = await axios.post(
        `${API_BASE_URL}/api/theses/${id}/like`,
        null,
        { headers }
      );

      const { thesis, liked: isLiked } = res.data || {};

      // actualizar likes en la lista
      if (thesis && thesis._id) {
        setTheses((prev) =>
          prev.map((t) =>
            t._id === thesis._id ? { ...t, likes: thesis.likes ?? 0 } : t
          )
        );
      }

      // actualizar estado liked local
      setLiked((prev) => ({ ...prev, [id]: !!isLiked }));
    } catch (err) {
      console.error("Error toggling like:", err);
    }
  };

  // ---------- RENDER ----------
  if (loading) {
    return (
      <div className="container py-4">
        <div className="text-muted">Loading theses…</div>
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
      {/* Search + Sort */}
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
            <div className="dropdown mc-sort">
              <button
                className="btn btn-outline-secondary dropdown-toggle"
                type="button"
                data-bs-toggle="dropdown"
                aria-expanded="false"
              >
                Sort by:{" "}
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

      <div className="row">
        {/* LEFT: list */}
        <div className="col-lg-8 d-flex flex-column gap-3">
          {pageItems.map((t, idx) => {
            const rowKey = `${t._id}-${start + idx}`;
            const isLiked = liked[t._id] ?? t.userLiked ?? false;
            const instName = getInstitutionName(t);

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
                      {instName}
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

                      {" · "}
                    </div>
                    <div className="text-muted small">
                      {t.department ? ` ${t.department}` : ""} ·{" "}
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
                      className="btn btn-warning"
                      title="View"
                      onClick={() => handleView(t)}
                    >
                      {EyeFillIcon}
                    </button>

                    {/* Download */}
                    <button
                      type="button"
                      className="btn btn-memory"
                      title="Download"
                      onClick={() => handleDownload(t)}
                    >
                      {CloudArrowDownFill}
                    </button>

                    {/* Like */}
                    {role !== "INSTITUTION" && (
        <button
          type="button"
          className="btn btn-danger d-flex align-items-center gap-1"
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

        {/* RIGHT: filters */}
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

              {/* Institution */}
              <div className="mb-3">
                <label className="form-label">Institution</label>
                <select
                  className="form-select"
                  value={institutionFilter}
                  onChange={(e) => {
                    setPage(1);
                    setInstitutionFilter(e.target.value);
                  }}
                >
                  {institutionOptions.map((name) => (
                    <option key={name} value={name}>
                      {name === "all" ? "All" : name}
                    </option>
                  ))}
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
                    setInstitutionFilter("all");
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

export default ThesisSearch;
