import React, { useMemo, useState } from "react";

/** --------- MOCK DATA (status + likes) --------- */
const MOCK_THESES = [
  { _id: "t101", title: "1 Deep Learning for Medical Imaging", authors: ["Alice Brown", "John Doe"], year: 2021, language: "en", degree: "PhD", institution: "Harvard University", department: "Computer Science", keywords: ["deep learning", "medical", "imaging"], status: "verified", likes: 12 },
  { _id: "t102", title: "2 Optimización de Sistemas de Energía Renovable", authors: ["María Pérez"], year: 2019, language: "es", degree: "Master", institution: "Universidad de Buenos Aires", department: "Ingeniería", keywords: ["energía", "optimización", "renovable"], status: "pending", likes: 4 },
  { _id: "t103", title: "3 Quantum Algorithms for Graph Problems", authors: ["Wei Zhang", "Emily Clark"], year: 2024, language: "en", degree: "Bachelor", institution: "MIT", department: "Mathematics", keywords: ["quantum", "algorithms", "graphs"], status: "verified", likes: 25 },
  { _id: "t111", title: "4 Deep Learning for Medical Imaging", authors: ["Alice Brown", "John Doe"], year: 2021, language: "en", degree: "PhD", institution: "Harvard University", department: "Computer Science", keywords: ["deep learning", "medical", "imaging"], status: "pending", likes: 3 },
  { _id: "t112", title: "5 Optimización de Sistemas de Energía Renovable", authors: ["María Pérez"], year: 2019, language: "es", degree: "Master", institution: "Universidad de Buenos Aires", department: "Ingeniería", keywords: ["energía", "optimización", "renovable"], status: "verified", likes: 18 },
  { _id: "t113", title: "6 Quantum Algorithms for Graph Problems", authors: ["Wei Zhang", "Emily Clark"], year: 2024, language: "en", degree: "Bachelor", institution: "MIT", department: "Mathematics", keywords: ["quantum", "algorithms", "graphs"], status: "pending", likes: 0 },
  { _id: "t121", title: "7 Deep Learning for Medical Imaging", authors: ["Alice Brown", "John Doe"], year: 2021, language: "en", degree: "PhD", institution: "Harvard University", department: "Computer Science", keywords: ["deep learning", "medical", "imaging"], status: "verified", likes: 9 },
  { _id: "t122", title: "8 Optimización de Sistemas de Energía Renovable", authors: ["María Pérez"], year: 2019, language: "es", degree: "Master", institution: "Universidad de Buenos Aires", department: "Ingeniería", keywords: ["energía", "optimización", "renovable"], status: "pending", likes: 1 },
  { _id: "t123", title: "9 Quantum Algorithms for Graph Problems", authors: ["Wei Zhang", "Emily Clark"], year: 2024, language: "en", degree: "Bachelor", institution: "MIT", department: "Mathematics", keywords: ["quantum", "algorithms", "graphs"], status: "verified", likes: 33 },
  { _id: "t141", title: "10 Deep Learning for Medical Imaging", authors: ["Alice Brown", "John Doe"], year: 2021, language: "en", degree: "PhD", institution: "Harvard University", department: "Computer Science", keywords: ["deep learning", "medical", "imaging"], status: "pending", likes: 2 },
  { _id: "t142", title: "11 Optimización de Sistemas de Energía Renovable", authors: ["María Pérez"], year: 2019, language: "es", degree: "Master", institution: "Universidad de Buenos Aires", department: "Ingeniería", keywords: ["energía", "optimización", "renovable"], status: "verified", likes: 7 },
  { _id: "t143", title: "12 Quantum Algorithms for Graph Problems", authors: ["Wei Zhang", "Emily Clark"], year: 2024, language: "en", degree: "Bachelor", institution: "MIT", department: "Mathematics", keywords: ["quantum", "algorithms", "graphs"], status: "pending", likes: 0 },
  { _id: "t151", title: "13 Deep Learning for Medical Imaging", authors: ["Alice Brown", "John Doe"], year: 2021, language: "en", degree: "PhD", institution: "Harvard University", department: "Computer Science", keywords: ["deep learning", "medical", "imaging"], status: "verified", likes: 5 },
  { _id: "t152", title: "14 Optimización de Sistemas de Energía Renovable", authors: ["María Pérez"], year: 2019, language: "es", degree: "Master", institution: "Universidad de Buenos Aires", department: "Ingeniería", keywords: ["energía", "optimización", "renovable"], status: "pending", likes: 1 },
  { _id: "t153", title: "15 Quantum Algorithms for Graph Problems", authors: ["Wei Zhang", "Emily Clark"], year: 2024, language: "en", degree: "Bachelor", institution: "MIT", department: "Mathematics", keywords: ["quantum", "algorithms", "graphs"], status: "verified", likes: 41 },
];

/** --------- ICONOS --------- */
const EyeFill = (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#fff" viewBox="0 0 16 16" className="bi bi-eye-fill">
    <path d="M10.5 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0"/>
    <path d="M0 8s3-5.5 8-5.5S16 8 16 8s-3 5.5-8 5.5S0 8 0 8m8 3.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7"/>
  </svg>
);
const CloudArrowDownFill = (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#fff" viewBox="0 0 16 16" className="bi bi-cloud-arrow-down-fill">
    <path d="M8 2a5.53 5.53 0 0 0-3.594 1.342c-.766.66-1.321 1.52-1.464 2.383C1.266 6.095 0 7.555 0 9.318 0 11.366 1.708 13 3.781 13h8.906C14.502 13 16 11.57 16 9.773c0-1.636-1.242-2.969-2.834-3.194C12.923 3.999 10.69 2 8 2m2.354 6.854-2 2a.5.5 0 0 1-.708 0l-2-2a.5.5 0 1 1 .708-.708L7.5 9.293V5.5a.5.5 0 0 1 1 0v3.793l1.146-1.147a.5.5 0 0 1 .708.708"/>
  </svg>
);
// Corazón relleno (like ON)
const HeartFill = (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#fff" viewBox="0 0 16 16" className="bi bi-heart-fill">
    <path fillRule="evenodd" d="M8 1.314C12.438-3.248 23.534 4.735 8 15-7.534 4.736 3.562-3.248 8 1.314"/>
  </svg>
);
// Corazón contorneado (like OFF)
const HeartOutline = (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#fff" viewBox="0 0 16 16" className="bi bi-heart">
    <path d="m8 2.748-.717-.737C5.6.281 2.514.878 1.4 3.053c-.523 1.023-.641 2.5.314 4.385.92 1.815 2.834 3.989 6.286 6.357 3.452-2.368 5.365-4.542 6.286-6.357.955-1.886.838-3.362.314-4.385C13.486.878 10.4.28 8.717 2.01zM8 15C-7.333 4.868 3.279-3.04 7.824 1.143q.09.083.176.171a3 3 0 0 1 .176-.17C12.72-3.042 23.333 4.867 8 15"/>
  </svg>
);
const CheckCircleFill = (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#fff" className="bi bi-check-circle-fill" viewBox="0 0 16 16">
    <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0m-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/>
  </svg>
);
const XCircleFill = (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#fff" className="bi bi-x-circle-fill" viewBox="0 0 16 16">
    <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0M5.354 4.646a.5.5 0 1 0-.708.708L7.293 8l-2.647 2.646a.5.5 0 0 0 .708.708L8 8.707l2.646 2.647a.5.5 0 0 0 .708-.708L8.707 8l2.647-2.646a.5.5 0 0 0-.708-.708L8 7.293z"/>
  </svg>
);

/** --------- ORDEN --------- */
const SORT_OPTIONS = [
  { key: "recent", label: "Most recent" },
  { key: "oldest", label: "Oldest" },
  { key: "title_az", label: "Title A–Z" },
  { key: "title_za", label: "Title Z–A" },
  { key: "ratings_most", label: "Most ratings" },
  { key: "ratings_least", label: "Least ratings" },
];

const LibraryUSearch = () => {
  // Tesis (incluye likes dentro)
  const [theses, setTheses] = useState(MOCK_THESES);
  // Estado de si el usuario “likeó” cada tesis (solo para el icono)
  const [liked, setLiked] = useState(() =>
    Object.fromEntries(MOCK_THESES.map((t) => [t._id, false]))
  );

  // Search & filtros
  const [query, setQuery] = useState("");
  const [language, setLanguage] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const now = new Date().getFullYear();
  const [minYear, setMinYear] = useState(1980);
  const [maxYear, setMaxYear] = useState(now);

  // Orden / Paginación
  const [sortBy, setSortBy] = useState("recent");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Filtrado
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return theses.filter((t) => {
      const matchesQ =
        !q ||
        t.title.toLowerCase().includes(q) ||
        t.authors.some((a) => a.toLowerCase().includes(q)) ||
        t.keywords?.some((k) => k.toLowerCase().includes(q)) ||
        t.institution.toLowerCase().includes(q);

      const matchesLang = language === "all" || t.language === language;
      const inYearRange = t.year >= minYear && t.year <= maxYear;
      const matchesStatus = statusFilter === "all" || t.status === statusFilter;

      return matchesQ && matchesLang && inYearRange && matchesStatus;
    });
  }, [theses, query, language, minYear, maxYear, statusFilter]);

  // Orden estable
  const filteredOrdered = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      const byTitle = a.title.localeCompare(b.title);
      const byId = String(a._id ?? "").localeCompare(String(b._id ?? ""));
      switch (sortBy) {
        case "recent": if (b.year !== a.year) return b.year - a.year; if (byTitle !== 0) return byTitle; return byId;
        case "oldest": if (a.year !== b.year) return a.year - b.year; if (byTitle !== 0) return byTitle; return byId;
        case "title_az": if (byTitle !== 0) return byTitle; return byId;
        case "title_za": if (byTitle !== 0) return -byTitle; return byId;
        case "ratings_most": {
          const ra = a.ratingCount ?? 0, rb = b.ratingCount ?? 0;
          if (rb !== ra) return rb - ra; if (byTitle !== 0) return byTitle; return byId;
        }
        case "ratings_least": {
          const ra = a.ratingCount ?? 0, rb = b.ratingCount ?? 0;
          if (ra !== rb) return ra - rb; if (byTitle !== 0) return byTitle; return byId;
        }
        default: return 0;
      }
    });
    return arr;
  }, [filtered, sortBy]);

  // Paginación
  const totalPages = Math.max(1, Math.ceil(filteredOrdered.length / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const start = (currentPage - 1) * pageSize;
  const end = start + pageSize;
  const pageItems = useMemo(() => filteredOrdered.slice(start, end), [filteredOrdered, start, end]);
  const pagesArray = useMemo(() => Array.from({ length: totalPages }, (_, i) => i + 1), [totalPages]);
  const go = (p) => setPage(p);

  // Alternar verificación (demo)
  const toggleVerify = (id) => {
    setTheses((prev) =>
      prev.map((t) =>
        t._id === id ? { ...t, status: t.status === "verified" ? "pending" : "verified" } : t
      )
    );
  };

  // *** FIX: Alternar like con UNA fuente de verdad (likes dentro de theses) ***
  const toggleLike = (id) => {
    setLiked((prev) => ({ ...prev, [id]: !prev[id] }));
    setTheses((prev) =>
      prev.map((t) =>
        t._id === id
          ? { ...t, likes: Math.max(0, t.likes + (liked[id] ? -1 : 1)) }
          : t
      )
    );
  };

  return (
    <div className="container py-4">
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
                Sort by: {SORT_OPTIONS.find(o => o.key === sortBy)?.label ?? "—"}
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
            {filteredOrdered.length} result{filteredOrdered.length !== 1 ? "s" : ""} · Page {currentPage} of {totalPages}
          </span>
        </div>
      </div>

      <div className="row">
        {/* LEFT: list */}
        <div className="col-lg-8 d-flex flex-column gap-3">
          {pageItems.map((t, idx) => {
            const rowKey = `${t._id}-${start + idx}`;
            const isVerified = t.status === "verified";
            return (
              <div key={rowKey} className="card shadow-sm">
                <div className="card-body d-flex align-items-center gap-3">
                  <div
                    style={{ width: 72, height: 72, borderRadius: 12, overflow: "hidden", background: "#f8f9fa", border: "1px solid #eee", flex: "0 0 auto" }}
                    className="d-flex align-items-center justify-content-center text-muted"
                  >
                    PDF
                  </div>

                  <div className="flex-grow-1">
                    <h5 className="m-0">{t.title}</h5>
                    <div className="text-muted small">
                      {t.authors.join(", ")} · {t.institution} · {t.department}
                    </div>
                    <div className="text-muted small">
                      {t.year} · {t.language.toUpperCase()} · {t.degree}
                    </div>
                    {t.keywords?.length ? (
                      <div className="mt-1 d-flex flex-wrap gap-2">
                        {t.keywords.map((k, kidx) => (
                          <span key={`${rowKey}-kw-${kidx}`} className="badge text-bg-light">{k}</span>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  {/* ACTIONS */}
                  <div style={{ minWidth: 200 }} className="d-flex flex-column align-items-stretch">
                    <div className="d-flex align-items-center justify-content-end gap-2 mb-2">
                      <button type="button" className="btn btn-warning btn-sm" title="View">
                        {EyeFill}
                      </button>
                      <button type="button" className="btn btn-memory btn-sm" title="Download">
                        {CloudArrowDownFill}
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger btn-sm d-flex align-items-center gap-1"
                        title="Like"
                        onClick={() => toggleLike(t._id)}
                      >
                        {liked[t._id] ? HeartFill : HeartOutline}
                        <span className="fw-semibold">{t.likes}</span>
                      </button>
                    </div>

                    <div className="d-flex justify-content-end">
                      {isVerified ? (
                        <button
                          type="button"
                          className="btn btn-success btn-sm d-flex align-items-center w-66 justify-content-center gap-2"
                          onClick={() => toggleVerify(t._id)}
                          title="Verified"
                        >
                          {CheckCircleFill}
                          <span>Verified</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-danger btn-sm d-flex align-items-center w-66 justify-content-center gap-2"
                          onClick={() => toggleVerify(t._id)}
                          title="Pending"
                        >
                          {XCircleFill}
                          <span>Pending</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {pageItems.length === 0 && <div className="text-muted">No theses found.</div>}

          {/* Pagination */}
          <nav aria-label="Theses pagination" className="mt-3 d-flex justify-content-center">
            <ul className="pagination mc-pagination">
              <li className={`page-item ${currentPage === 1 ? "disabled" : ""}`}>
                <button className="page-link" onClick={() => go(1)}>First</button>
              </li>
              {pagesArray.map((p) => (
                <li key={`p-${p}`} className={`page-item ${p === currentPage ? "active" : ""}`}>
                  <button className="page-link" onClick={() => go(p)}>{p}</button>
                </li>
              ))}
              <li className={`page-item ${currentPage === totalPages ? "disabled" : ""}`}>
                <button className="page-link" onClick={() => go(totalPages)}>Last</button>
              </li>
            </ul>
          </nav>
        </div>

        {/* RIGHT: filtros (Status + Year + Language) */}
        <div className="col-lg-4 d-none d-lg-block">
          <div className="card mc-filters sticky-top" style={{ top: "1rem" }}>
            <div className="card-header">Filters</div>
            <div className="card-body">
              <div className="mb-3">
                <label className="form-label">Status</label>
                <div className="d-flex flex-column gap-1">
                  {["all", "verified", "pending"].map((s) => (
                    <label key={s} className="form-check">
                      <input
                        className="form-check-input"
                        type="radio"
                        name="status"
                        value={s}
                        checked={statusFilter === s}
                        onChange={(e) => { setPage(1); setStatusFilter(e.target.value); }}
                      />
                      <span className="form-check-label text-capitalize ms-1">{s}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="mb-3">
                <div className="d-flex justify-content-between align-items-center">
                  <label className="form-label m-0">From year: <strong>{minYear}</strong></label>
                  <span className="small text-muted">To: <strong>{maxYear}</strong></span>
                </div>
                <div className="mc-dualrange position-relative" style={{ height: 36 }}>
                  <input
                    type="range"
                    className="form-range position-absolute top-50 start-0 translate-middle-y w-100 mc-dualrange-input mc-dualrange-min"
                    min={1980}
                    max={now}
                    step={1}
                    value={minYear}
                    onChange={(e) => { setPage(1); setMinYear(Math.min(Number(e.target.value), maxYear)); }}
                    style={{ background: "transparent", pointerEvents: "none", zIndex: 2 }}
                  />
                  <input
                    type="range"
                    className="form-range position-absolute top-50 start-0 translate-middle-y w-100 mc-dualrange-input mc-dualrange-max"
                    min={1980}
                    max={now}
                    step={1}
                    value={maxYear}
                    onChange={(e) => { setPage(1); setMaxYear(Math.max(Number(e.target.value), minYear)); }}
                    style={{ background: "transparent", pointerEvents: "none", zIndex: 3 }}
                  />
                </div>
              </div>

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
                        onChange={(e) => { setPage(1); setLanguage(e.target.value); }}
                      />
                      <span className="form-check-label text-uppercase ms-1">{l === "all" ? "All" : l}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="text-end">
                <button
                  className="btn btn-outline-secondary btn-sm"
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setLanguage("all");
                    const nowYear = new Date().getFullYear();
                    setMinYear(1980);
                    setMaxYear(nowYear);
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

export default LibraryUSearch;