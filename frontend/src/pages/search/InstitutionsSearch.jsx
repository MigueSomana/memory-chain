import React, { useMemo, useState } from "react";

const MOCK_INSTITUTIONS = [
  { _id: "i1",  name: "Massachusetts Institute of Technology", country: "USA",         city: "Cambridge, MA",      website: "https://mit.edu",                 type: "public",  isMember: true,  logo: "https://upload.wikimedia.org/wikipedia/commons/0/0c/MIT_logo.svg" },
  { _id: "i2",  name: "Universidad de Buenos Aires",           country: "Argentina",   city: "Buenos Aires",       website: "https://uba.ar",                  type: "public",  isMember: false, logo: "https://upload.wikimedia.org/wikipedia/commons/5/5a/Escudo_UBA.svg" },
  { _id: "i3",  name: "Harvard University",                     country: "USA",         city: "Cambridge, MA",      website: "https://harvard.edu",             type: "private", isMember: true,  logo: "https://upload.wikimedia.org/wikipedia/en/2/29/Harvard_shield_wreath.svg" },
  { _id: "i4",  name: "University of Oxford",                   country: "UK",          city: "Oxford",             website: "https://ox.ac.uk",                type: "public",  isMember: true,  logo: "https://upload.wikimedia.org/wikipedia/en/d/d6/Oxford_University_Coat_Of_Arms.svg" },
  { _id: "i5",  name: "Stanford University",                    country: "USA",         city: "Stanford, CA",       website: "https://stanford.edu",            type: "private", isMember: true,  logo: "https://upload.wikimedia.org/wikipedia/en/b/b7/Stanford_University_seal_2003.svg" },
  { _id: "i6",  name: "Universidad Nacional Autónoma de México",country: "Mexico",      city: "Ciudad de México",   website: "https://unam.mx",                 type: "public",  isMember: false, logo: "https://upload.wikimedia.org/wikipedia/commons/4/4d/UNAM_Escudo.svg" },
  { _id: "i7",  name: "University of Cambridge",                country: "UK",          city: "Cambridge",          website: "https://cam.ac.uk",               type: "public",  isMember: true,  logo: "https://upload.wikimedia.org/wikipedia/en/2/2f/University_of_Cambridge_coat_of_arms.svg" },
  { _id: "i8",  name: "California Institute of Technology",     country: "USA",         city: "Pasadena, CA",       website: "https://caltech.edu",             type: "private", isMember: true,  logo: "https://upload.wikimedia.org/wikipedia/en/e/e8/Seal_of_the_California_Institute_of_Technology.svg" },
  { _id: "i9",  name: "Universidade de São Paulo",              country: "Brazil",      city: "São Paulo",          website: "https://usp.br",                  type: "public",  isMember: false, logo: "https://upload.wikimedia.org/wikipedia/commons/7/73/USP_logo.svg" },
  { _id: "i10", name: "ETH Zurich",                             country: "Switzerland", city: "Zurich",             website: "https://ethz.ch",                 type: "public",  isMember: true,  logo: "https://upload.wikimedia.org/wikipedia/commons/c/c7/ETH_Z%C3%BCrich_Logo.svg" },
  { _id: "i11", name: "Peking University",                      country: "China",       city: "Beijing",            website: "https://pku.edu.cn",              type: "public",  isMember: false, logo: "https://upload.wikimedia.org/wikipedia/en/7/7a/Peking_University_logo.svg" },
  { _id: "i12", name: "University of Tokyo",                    country: "Japan",       city: "Tokyo",              website: "https://u-tokyo.ac.jp",           type: "public",  isMember: true,  logo: "https://upload.wikimedia.org/wikipedia/en/3/3f/University_of_Tokyo_logo.svg" },
  { _id: "i13", name: "University of Toronto",                  country: "Canada",      city: "Toronto",            website: "https://utoronto.ca",             type: "public",  isMember: false, logo: "https://upload.wikimedia.org/wikipedia/en/b/bf/University_of_Toronto_coat_of_arms.svg" },
  { _id: "i14", name: "Sorbonne University",                    country: "France",      city: "Paris",              website: "https://sorbonne-universite.fr",  type: "public",  isMember: true,  logo: "https://upload.wikimedia.org/wikipedia/commons/1/1d/Logo_Sorbonne_Universit%C3%A9.svg" },
  { _id: "i15", name: "Seoul National University",              country: "South Korea", city: "Seoul",              website: "https://snu.ac.kr",               type: "public",  isMember: false, logo: "https://upload.wikimedia.org/wikipedia/commons/2/24/SNU_emblem.svg" },
];

/** --------- ICONOS --------- */
const EyeFill = (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"
    fill="#fff" viewBox="0 0 16 16" className="bi bi-eye-fill">
    <path d="M10.5 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0" />
    <path d="M0 8s3-5.5 8-5.5S16 8 16 8s-3 5.5-8 5.5S0 8 0 8m8 3.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7" />
  </svg>
);
// corazón lleno (likeado)
const HeartFill = (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"
    fill="#fff" viewBox="0 0 16 16" className="bi bi-heart-fill">
    <path fillRule="evenodd" d="M8 1.314C12.438-3.248 23.534 4.735 8 15-7.534 4.736 3.562-3.248 8 1.314" />
  </svg>
);
// corazón contorno (por defecto)
const HeartOutline = (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"
    fill="#fff" viewBox="0 0 16 16" className="bi bi-heart">
    <path d="m8 2.748-.717-.737C5.6.281 2.514.878 1.4 3.053c-.523 1.023-.641 2.5.314 4.385.92 1.815 2.834 3.989 6.286 6.357 3.452-2.368 5.365-4.542 6.286-6.357.955-1.886.838-3.362.314-4.385C13.486.878 10.4.28 8.717 2.01zM8 15C-7.333 4.868 3.279-3.04 7.824 1.143q.09.083.176.171a3 3 0 0 1 .176-.17C12.72-3.042 23.333 4.867 8 15"/>
  </svg>
);

const SORT_OPTIONS = [
  { key: "name_az", label: "Name A–Z" },
  { key: "name_za", label: "Name Z–A" },
  { key: "ratings_most", label: "Most ratings" },
  { key: "ratings_least", label: "Least ratings" }
];

const InstitutionsSearch = () => {
  // pasamos instituciones a estado y añadimos likes por defecto = 0
  const [institutions, setInstitutions] = useState(
    MOCK_INSTITUTIONS.map((i) => ({ likes: 0, ...i }))
  );
  // mapa de “me gusta” del usuario por _id
  const [liked, setLiked] = useState(
    Object.fromEntries(MOCK_INSTITUTIONS.map((i) => [i._id, false]))
  );

  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");
  const [country, setCountry] = useState("all");
  const [onlyMembers, setOnlyMembers] = useState(false);
  const [sortBy, setSortBy] = useState("name_az");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const countryOptions = useMemo(() => {
    const set = new Set(institutions.map((i) => i.country));
    return ["all", ...Array.from(set)];
  }, [institutions]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return institutions.filter((i) => {
      const matchesQ =
        !q ||
        i.name.toLowerCase().includes(q) ||
        i.city?.toLowerCase().includes(q) ||
        i.country?.toLowerCase().includes(q);
      const matchesType = type === "all" || i.type === type;
      const matchesCountry = country === "all" || i.country === country;
      const matchesMember = !onlyMembers || i.isMember;
      return matchesQ && matchesType && matchesCountry && matchesMember;
    });
  }, [institutions, query, type, country, onlyMembers]);

  const filteredOrdered = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      const nameCmp = a.name.localeCompare(b.name);
      const idCmp = String(a._id ?? "").localeCompare(String(b._id ?? ""));
      switch (sortBy) {
        case "name_az":
          if (nameCmp !== 0) return nameCmp;
          return idCmp;
        case "name_za":
          if (nameCmp !== 0) return -nameCmp;
          return idCmp;
        case "ratings_most": {
          const ra = a.ratingCount ?? 0;
          const rb = b.ratingCount ?? 0;
          if (rb !== ra) return rb - ra;
          if (nameCmp !== 0) return nameCmp;
          return idCmp;
        }
        case "ratings_least": {
          const ra = a.ratingCount ?? 0;
          const rb = b.ratingCount ?? 0;
          if (ra !== rb) return ra - rb;
          if (nameCmp !== 0) return nameCmp;
          return idCmp;
        }
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

  // toggle like (icono + contador)
  const toggleLike = (id) => {
    setLiked((prev) => ({ ...prev, [id]: !prev[id] }));
    setInstitutions((prev) =>
      prev.map((ins) =>
        ins._id === id
          ? { ...ins, likes: Math.max(0, ins.likes + (liked[id] ? -1 : 1)) }
          : ins
      )
    );
  };

  return (
    <div className="container py-4">
      {/* Search + sort */}
      <div className="row g-3 align-items-center mb-3">
        <div className="col-lg-8">
          <div className="d-flex gap-2">
            <input
              className="form-control"
              placeholder="Search institutions by name, city or country…"
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
          {pageItems.map((i, idx) => {
            const rowKey = `${i._id}-${start + idx}`;
            const isLiked = liked[i._id] === true;
            return (
              <div key={rowKey} className="card shadow-sm">
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
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
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
                        <span className="badge text-bg-danger">Deactive</span>
                      )}
                    </div>
                    <div className="text-muted small">
                      {i.city ? `${i.city}, ` : ""}
                      {i.country} · {i.type}
                      {typeof i.ratingCount === "number" ? ` · ${i.ratingCount} ratings` : ""}
                      {` · ${i.likes ?? 0} likes`}
                      {i.website && (
                        <>
                          {" · "}
                          <a href={i.website} target="_blank" rel="noreferrer">
                            Website
                          </a>
                        </>
                      )}
                    </div>
                  </div>

                  {/* ACTIONS */}
                  <div className="d-flex align-items-center gap-2">
                    <button type="button" className="btn btn-warning btn-sm" title="View">
                      {EyeFill}
                    </button>

                    {/* Like con toggle e indicador numérico */}
                    <button
                      type="button"
                      className="btn btn-danger btn-sm d-flex align-items-center gap-1"
                      title={isLiked ? "Unlike" : "Like"}
                      onClick={() => toggleLike(i._id)}
                    >
                      {isLiked ? HeartFill : HeartOutline}
                      <span className="fw-semibold">{i.likes ?? 0}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {pageItems.length === 0 && <div className="text-muted">No institutions found.</div>}

          {/* Pagination */}
          <nav aria-label="Institutions pagination" className="mt-3 d-flex justify-content-center">
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

        {/* RIGHT: filters (sticky & hidden on mobile) */}
        <div className="col-lg-4 d-none d-lg-block">
          <div className="card mc-filters sticky-top" style={{ top: "1rem" }}>
            <div className="card-header">Filters</div>
            <div className="card-body">
              <div className="mb-3">
                <label className="form-label">Type</label>
                <div className="d-flex flex-column gap-1">
                  {["all", "public", "private", "hybrid"].map((t) => (
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
                      <span className="form-check-label text-capitalize ms-1">{t}</span>
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
                    <option key={c} value={c}>{c === "all" ? "All" : c}</option>
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
      </div>      
    </div>
  );
};

export default InstitutionsSearch;