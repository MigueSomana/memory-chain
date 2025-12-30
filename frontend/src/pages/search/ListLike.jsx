import React, { useMemo, useState, useEffect } from "react";
import NavbarReal from "../../components/navbar/NavbarReal";
import Layout from "../../components/layout/LayoutPrivado";
import { getAuthRole, getAuthToken } from "../../utils/authSession";
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

// Obtiene el nombre de la institución aunque venga como string u objeto populate
const getInstitutionName = (thesis) => {
  const inst = thesis?.institution;
  if (!inst) return "";
  if (typeof inst === "string") return inst;
  return inst?.name || "";
};

// Convierte authors (strings u objetos) en un string "buscable"
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

// Normaliza status a MAYÚSCULAS
const normalizeStatus = (s) => String(s || "").toUpperCase();

// Clipboard
async function copyToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return true;
  }
  return false;
}

// ===================== APA helpers (igual que tu lógica) =====================
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
  const url =
    cid && gatewayDomain ? `https://${gatewayDomain}/ipfs/${cid}` : "";

  const bracket = instName ? `[${thesisType}, ${instName}]` : `[${thesisType}]`;

  const base = `${authors} (${year}). ${title} ${bracket}`;
  return url ? `${base}. ${url}` : `${base}.`;
}

// ===================== Componente: lista de tesis likeadas =====================
const LikedThesesList = () => {
  // Data principal
  const [theses, setTheses] = useState([]);
  const [liked, setLiked] = useState({});

  // loading/error
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // filtros
  const [query, setQuery] = useState("");
  const [language, setLanguage] = useState("all");
  const [degree, setDegree] = useState("all");

  const now = new Date().getFullYear();
  const [minYear, setMinYear] = useState(1980);
  const [maxYear, setMaxYear] = useState(now);

  const [institutionFilter, setInstitutionFilter] = useState("all");

  // status: All = Approved+Pending (Rejected siempre oculto)
  const [statusFilter, setStatusFilter] = useState("all"); // "all" | "APPROVED" | "PENDING"

  // orden/paginación
  const [sortBy, setSortBy] = useState("recent");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // ===================== Load: mis likes =====================
  useEffect(() => {
    const fetchMyLikes = async () => {
      try {
        setLoading(true);
        setLoadError("");

        if (!token) {
          setTheses([]);
          setLoadError("You must be logged in to view your liked theses.");
          return;
        }

        const headers = { Authorization: `Bearer ${token}` };

        // ✅ este endpoint ya lo tienes: /api/users/me/likes
        const res = await axios.get(`${API_BASE_URL}/api/users/me/likes`, {
          headers,
        });

        const data = Array.isArray(res.data) ? res.data : [];

        // user actual para mapear "liked"
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
          const likesCount = t.likes ?? 0;

          const userLiked =
            Array.isArray(t.likedBy) && currentUserId
              ? t.likedBy.some(
                  (u) => String(u?._id ?? u) === String(currentUserId)
                )
              : true; // si viene de /me/likes, normalmente es true

          return { ...t, likes: likesCount, userLiked };
        });

        setTheses(mapped);

        const likedMap = {};
        mapped.forEach((t) => {
          likedMap[t._id] = true; // están en favoritos
        });
        setLiked(likedMap);
      } catch (err) {
        console.error("Error loading liked theses:", err);
        setLoadError("Error loading liked theses. Please try again later.");
        setTheses([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMyLikes();
  }, []);

  // ===================== institution options (desde las tesis likeadas) =====================
  const institutionOptions = useMemo(() => {
    const names = theses.map(getInstitutionName).filter(Boolean);
    const unique = Array.from(new Set(names)).sort((a, b) =>
      a.localeCompare(b)
    );
    return ["all", ...unique];
  }, [theses]);

  // ===================== Filter principal =====================
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const selectedInst = String(institutionFilter || "all").toLowerCase();
    const selectedStatus = normalizeStatus(statusFilter); // ALL / APPROVED / PENDING

    return theses.filter((t) => {
      const status = normalizeStatus(t.status);

      // ✅ ocultar REJECTED siempre
      if (status === "REJECTED") return false;

      // status filter
      const matchesStatus =
        selectedStatus === "ALL"
          ? status === "APPROVED" || status === "PENDING"
          : status === selectedStatus;

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

  // ===================== Sort =====================
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

  // ===================== Pagination =====================
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

  // ===================== Actions =====================
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
      console.error(e);
      alert("Failed Copied ❌");
    }
  };

  // Like/unlike -> si se deslikea, se remueve del listado
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
        {
          headers,
        }
      );

      const { thesis, liked: isLiked } = res.data || {};

      // si ya no está likeada -> quitarla del listado (porque es la pestaña de likes)
      if (!isLiked) {
        setTheses((prev) => prev.filter((t) => String(t._id) !== String(id)));
        setLiked((prev) => ({ ...prev, [id]: false }));
        return;
      }

      // si sigue likeada -> actualizar likes count
      if (thesis && thesis._id) {
        setTheses((prev) =>
          prev.map((t) =>
            String(t._id) === String(thesis._id)
              ? { ...t, likes: thesis.likes ?? 0, userLiked: true }
              : t
          )
        );
      }

      setLiked((prev) => ({ ...prev, [id]: true }));
    } catch (err) {
      console.error("Error toggling like:", err);
    }
  };

  // ===================== Render load/error =====================
  if (loading) {
    return (
      <div className="container py-2">
        <div className="text-muted">Loading liked theses…</div>
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

  // ===================== Render principal =====================
  return (
    <div className="container py-2">
      {/* Top bar: Search + Sort */}
      <div className="row g-3 align-items-center mb-3">
        <div className="col-lg-8">
          <div className="d-flex gap-2">
            <input
              className="form-control"
              placeholder="Search liked theses by title, author, keyword or institution…"
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
            const isLiked = liked[t._id] ?? true;
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
                      Institution:&nbsp;{instName}
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

                    <div className="text-muted small">
                      CID: {t.ipfsCid ?? "—"}
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

                  {/* Actions */}
                  <div className="d-flex align-items-center gap-2">
                    <button
                      type="button"
                      className="btn btn-memory"
                      title="Download"
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

                    {/* en Likes siempre debería ser user (no institution), pero lo dejamos igual */}
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
            <div className="text-muted">No liked theses found.</div>
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
          <div className="card mc-filters sticky-top" style={{ top: "1rem" }}>
            <div className="card-header">Filters</div>

            <div className="card-body">
              {/* Status */}
              <div className="mb-3">
                <label className="form-label">Status</label>
                <div className="row">
                  {[
                    { key: "all", label: "All" },
                    { key: "APPROVED", label: "Approved" },
                    { key: "PENDING", label: "Pending" },
                  ].map((s) => (
                    <div key={s.key} className="col-6 col-md-4">
                      <label className="form-check">
                        <input
                          className="form-check-input"
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
                <div className="row">
                  {["all", "en", "es", "fr", "pt", "ch", "ko", "ru"].map(
                    (l) => (
                      <div key={l} className="col-6 col-md-3">
                        <label className="form-check">
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
                      </div>
                    )
                  )}
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
    </div>
  );
};

// ===================== Página: ListLike =====================
const ListLike = () => {
  return (
    <div
      className="d-flex"
      style={{ minHeight: "100vh", background: "#f6f7f9" }}
    >
      <NavbarReal />

      <div className="flex-grow-1">
        <Layout
          showBackDashboard
          title=" My Like List"
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="currentColor"
              class="nav-icon"
              viewBox="0 0 16 16"
            >
              <path
                fill-rule="evenodd"
                d="M8 1.314C12.438-3.248 23.534 4.735 8 15-7.534 4.736 3.562-3.248 8 1.314"
              />
            </svg>
          }
        >
          <LikedThesesList />
        </Layout>
      </div>
    </div>
  );
};

export default ListLike;
