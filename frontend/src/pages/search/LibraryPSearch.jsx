import React, { useMemo, useState } from "react";

/** --------- MOCK DATA (puedes ajustar status/likes) --------- */
const MOCK_THESES = [
  { _id: "t101", title: "1 Deep Learning for Medical Imaging", authors: ["Alice Brown", "John Doe"], year: 2021, language: "en", degree: "PhD", institution: "Harvard University", department: "Computer Science", keywords: ["deep learning", "medical", "imaging"], status: "verified", likes: 32 },
  { _id: "t102", title: "2 Optimización de Sistemas de Energía Renovable", authors: ["María Pérez"], year: 2019, language: "es", degree: "Master", institution: "Universidad de Buenos Aires", department: "Ingeniería", keywords: ["energía", "optimización", "renovable"], status: "pending", likes: 8 },
  { _id: "t103", title: "3 Quantum Algorithms for Graph Problems", authors: ["Wei Zhang", "Emily Clark"], year: 2024, language: "en", degree: "Bachelor", institution: "MIT", department: "Mathematics", keywords: ["quantum", "algorithms", "graphs"], status: "verified", likes: 51 },
  { _id: "t111", title: "4 Deep Learning for Medical Imaging", authors: ["Alice Brown", "John Doe"], year: 2021, language: "en", degree: "PhD", institution: "Harvard University", department: "Computer Science", keywords: ["deep learning", "medical", "imaging"], status: "pending", likes: 12 },
  { _id: "t112", title: "5 Optimización de Sistemas de Energía Renovable", authors: ["María Pérez"], year: 2019, language: "es", degree: "Master", institution: "Universidad de Buenos Aires", department: "Ingeniería", keywords: ["energía", "optimización", "renovable"], status: "verified", likes: 22 },
  { _id: "t113", title: "6 Quantum Algorithms for Graph Problems", authors: ["Wei Zhang", "Emily Clark"], year: 2024, language: "en", degree: "Bachelor", institution: "MIT", department: "Mathematics", keywords: ["quantum", "algorithms", "graphs"], status: "pending", likes: 5 },
  { _id: "t121", title: "7 Deep Learning for Medical Imaging", authors: ["Alice Brown", "John Doe"], year: 2021, language: "en", degree: "PhD", institution: "Harvard University", department: "Computer Science", keywords: ["deep learning", "medical", "imaging"], status: "verified", likes: 29 },
  { _id: "t122", title: "8 Optimización de Sistemas de Energía Renovable", authors: ["María Pérez"], year: 2019, language: "es", degree: "Master", institution: "Universidad de Buenos Aires", department: "Ingeniería", keywords: ["energía", "optimización", "renovable"], status: "pending", likes: 3 },
  { _id: "t123", title: "9 Quantum Algorithms for Graph Problems", authors: ["Wei Zhang", "Emily Clark"], year: 2024, language: "en", degree: "Bachelor", institution: "MIT", department: "Mathematics", keywords: ["quantum", "algorithms", "graphs"], status: "verified", likes: 40 },
  { _id: "t141", title: "10 Deep Learning for Medical Imaging", authors: ["Alice Brown", "John Doe"], year: 2021, language: "en", degree: "PhD", institution: "Harvard University", department: "Computer Science", keywords: ["deep learning", "medical", "imaging"], status: "pending", likes: 1 },
  { _id: "t142", title: "11 Optimización de Sistemas de Energía Renovable", authors: ["María Pérez"], year: 2019, language: "es", degree: "Master", institution: "Universidad de Buenos Aires", department: "Ingeniería", keywords: ["energía", "optimización", "renovable"], status: "verified", likes: 9 },
  { _id: "t143", title: "12 Quantum Algorithms for Graph Problems", authors: ["Wei Zhang", "Emily Clark"], year: 2024, language: "en", degree: "Bachelor", institution: "MIT", department: "Mathematics", keywords: ["quantum", "algorithms", "graphs"], status: "pending", likes: 0 },
  { _id: "t151", title: "13 Deep Learning for Medical Imaging", authors: ["Alice Brown", "John Doe"], year: 2021, language: "en", degree: "PhD", institution: "Harvard University", department: "Computer Science", keywords: ["deep learning", "medical", "imaging"], status: "verified", likes: 14 },
  { _id: "t152", title: "14 Optimización de Sistemas de Energía Renovable", authors: ["María Pérez"], year: 2019, language: "es", degree: "Master", institution: "Universidad de Buenos Aires", department: "Ingeniería", keywords: ["energía", "optimización", "renovable"], status: "pending", likes: 2 },
  { _id: "t153", title: "15 Quantum Algorithms for Graph Problems", authors: ["Wei Zhang", "Emily Clark"], year: 2024, language: "en", degree: "Bachelor", institution: "MIT", department: "Mathematics", keywords: ["quantum", "algorithms", "graphs"], status: "verified", likes: 61 },
];

/** --------- ICONS (inline SVG) --------- */
const PatchCheckFill = (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"
    fill="#fff" className="bi bi-patch-check-fill" viewBox="0 0 16 16">
    <path d="M10.067.87a2.89 2.89 0 0 0-4.134 0l-.622.638-.89-.011a2.89 2.89 0 0 0-2.924 2.924l.01.89-.636.622a2.89 2.89 0 0 0 0 4.134l.637.622-.011.89a2.89 2.89 0 0 0 2.924 2.924l.89-.01.622.636a2.89 2.89 0 0 0 4.134 0l.622-.637.89.011a2.89 2.89 0 0 0 2.924-2.924l-.01-.89.636-.622a2.89 2.89 0 0 0 0-4.134l-.637-.622.011-.89a2.89 2.89 0 0 0-2.924-2.924l-.89.01zm.287 5.984-3 3a.5.5 0 0 1-.708 0l-1.5-1.5a.5.5 0 1 1 .708-.708L7 8.793l2.646-2.647a.5.5 0 0 1 .708.708"/>
  </svg>
);
const PencilFill = (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"
    fill="#fff" className="bi bi-pencil-fill" viewBox="0 0 16 16">
    <path d="M12.854.146a.5.5 0 0 0-.707 0L10.5 1.793 14.207 5.5l1.647-1.646a.5.5 0 0 0 0-.708zm.646 6.061L9.793 2.5 3.293 9H3.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0  0 1 .5.5v.5h.5a.5.5 0  0 1 .5.5v.5h.5a.5.5 0  0 1 .5.5v.207zm-7.468 7.468A.5.5 0  0 1 6 13.5V13h-.5a.5.5 0  0 1-.5-.5V12h-.5a.5.5 0  0 1-.5-.5V11h-.5a.5.5 0  0 1-.5-.5V10h-.5a.5.5 0  0 1-.175-.032l-.179.178a.5.5 0  0 0-.11.168l-2 5a.5.5 0  0 0 .65.65l5-2a.5.5 0  0 0 .168-.11z"/>
  </svg>
);
// Heart filled
const HeartFill = (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"
    fill="#fff" className="bi bi-heart-fill" viewBox="0 0 16 16">
    <path fillRule="evenodd" d="M8 1.314C12.438-3.248 23.534 4.735 8 15-7.534 4.736 3.562-3.248 8 1.314"/>
  </svg>
);
// Heart outline (default)
const HeartOutline = (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"
    fill="#fff" className="bi bi-heart" viewBox="0 0 16 16">
    <path d="m8 2.748-.717-.737C5.6.281 2.514.878 1.4 3.053c-.523 1.023-.641 2.5.314 4.385.92 1.815 2.834 3.989 6.286 6.357 3.452-2.368 5.365-4.542 6.286-6.357.955-1.886.838-3.362.314-4.385C13.486.878 10.4.28 8.717 2.01zM8 15C-7.333 4.868 3.279-3.04 7.824 1.143q.09.083.176.171a3 3 0 0 1 .176-.17C12.72-3.042 23.333 4.867 8 15"/>
  </svg>
);

/** --------- ORDEN --------- */
const SORT_OPTIONS = [
  { key: "recent", label: "Most recent" },          // year desc
  { key: "oldest", label: "Oldest" },               // year asc
  { key: "title_az", label: "Title A–Z" },          // title asc
  { key: "title_za", label: "Title Z–A" },          // title desc
  { key: "likes_most", label: "Most likes" },       // likes desc
  { key: "likes_least", label: "Least likes" },     // likes asc
];

const LibraryPSearch = () => {
  // ---------- datos en estado para poder mutar likes ----------
  const [theses, setTheses] = useState(MOCK_THESES);
  // quién tiene like del usuario (icono): { [id]: boolean }
  const [liked, setLiked] = useState(
    Object.fromEntries(MOCK_THESES.map((t) => [t._id, false]))
  );

  // ---------- Search & orden ----------
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("recent");

  // Paginación
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Filtrado (solo por texto)
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return theses.filter((t) => {
      const matchesQ =
        !q ||
        t.title.toLowerCase().includes(q) ||
        t.authors.some((a) => a.toLowerCase().includes(q)) ||
        t.keywords?.some((k) => k.toLowerCase().includes(q)) ||
        t.institution.toLowerCase().includes(q);
      return matchesQ;
    });
  }, [query, theses]);

  // Orden (estable)
  const filteredOrdered = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      const byTitle = a.title.localeCompare(b.title);
      const byId = String(a._id ?? "").localeCompare(String(b._id ?? ""));
      switch (sortBy) {
        case "recent":
          if (b.year !== a.year) return b.year - a.year;
          if (byTitle !== 0) return byTitle;
          return byId;
        case "oldest":
          if (a.year !== b.year) return a.year - b.year;
          if (byTitle !== 0) return byTitle;
          return byId;
        case "title_az":
          if (byTitle !== 0) return byTitle;
          return byId;
        case "title_za":
          if (byTitle !== 0) return -byTitle;
          return byId;
        case "likes_most": {
          const la = a.likes ?? 0;
          const lb = b.likes ?? 0;
          if (lb !== la) return lb - la;
          if (byTitle !== 0) return byTitle;
          return byId;
        }
        case "likes_least": {
          const la = a.likes ?? 0;
          const lb = b.likes ?? 0;
          if (la !== lb) return la - lb;
          if (byTitle !== 0) return byTitle;
          return byId;
        }
        default:
          return 0;
      }
    });
    return arr;
  }, [filtered, sortBy]);

  // Paginación determinista
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

  // Toggle like (una sola fuente de verdad: likes dentro de theses)
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
                Sort by: {SORT_OPTIONS.find((o) => o.key === sortBy)?.label ?? "—"}
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
        {/* LIST */}
        <div className="col-lg-12 d-flex flex-column gap-3">
          {pageItems.map((t, idx) => {
            const rowKey = `${t._id}-${start + idx}`;
            const isVerified = t.status === "verified";
            const isLiked = liked[t._id] === true;

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
                    <div className="d-flex align-items-center gap-2">
                      <h5 className="m-0">{t.title}</h5>
                    </div>
                    <div className="text-muted small">
                      {t.year} · {t.language.toUpperCase()} · {t.degree}
                    </div>
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

                  {/* ACTIONS */}
                  <div className="d-flex align-items-center gap-2">
                    {/* Verified badge (solo si está verificada) */}
                    {isVerified && (
                      <button type="button" className="btn btn-memory btn-sm" title="Certified">
                        {PatchCheckFill}
                      </button>
                    )}

                    {/* Edit */}
                    <button type="button" className="btn btn-warning btn-sm" title="Edit">
                      {PencilFill}
                    </button>

                    {/* Likes (toggle + contador) */}
                    <button
                      type="button"
                      className="btn btn-danger btn-sm d-flex align-items-center gap-1"
                      title={isLiked ? "Unlike" : "Like"}
                      onClick={() => toggleLike(t._id)}
                    >
                      {isLiked ? HeartFill : HeartOutline}
                      <span className="fw-semibold">{t.likes ?? 0}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {pageItems.length === 0 && <div className="text-muted">No theses found.</div>}

          {/* Pagination — centered, First | 1..N | Last */}
          <nav aria-label="Theses pagination" className="mt-3 d-flex justify-content-center">
            <ul className="pagination mc-pagination">
              <li className={`page-item ${currentPage === 1 ? "disabled" : ""}`}>
                <button className="page-link" onClick={() => go(1)}>
                  First
                </button>
              </li>

              {pagesArray.map((p) => (
                <li key={`p-${p}`} className={`page-item ${p === currentPage ? "active" : ""}`}>
                  <button className="page-link" onClick={() => go(p)}>
                    {p}
                  </button>
                </li>
              ))}

              <li className={`page-item ${currentPage === totalPages ? "disabled" : ""}`}>
                <button className="page-link" onClick={() => go(totalPages)}>
                  Last
                </button>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </div>
  );
};

export default LibraryPSearch;