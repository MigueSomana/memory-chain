import React, { useMemo, useState, useEffect } from "react";
import ModalCertificate from "../../components/modal/ModalCertificate";
import axios from "axios";
import { getAuthToken, getAuthUser } from "../../utils/authSession";
import {
  EyeFillIcon,
  HeartFill,
  HeartOutline,
  EditIcon,
  CheckCircle,
  CrossCircle,
  TimeCircle,
  InboxMin,
  KeyPermission,
} from "../../utils/icons";

// CONFIG GLOBAL (API + IPFS gateway)
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";
const gateway = import.meta.env.VITE_PINATA_GATEWAY_DOMAIN;

// UI OPTIONS (Ordenamiento)
const SORT_OPTIONS = [
  { key: "recent", label: "Most recent" },
  { key: "oldest", label: "Oldest" },
  { key: "title_az", label: "Title A–Z" },
  { key: "title_za", label: "Title Z–A" },
  { key: "likes_most", label: "Most likes" },
  { key: "likes_least", label: "Least likes" },
];

// HELPERS (normalización de strings y campos display)
const norm = (v) =>
  // Normaliza para comparaciones “case-insensitive” y robustas
  String(v ?? "")
    .trim()
    .toLowerCase();

const getInstitutionName = (thesis) => {
  // institution puede venir como string (id) o populate (objeto)
  const inst = thesis?.institution;
  if (!inst) return "";
  if (typeof inst === "string") return inst;
  return inst?.name || "";
};

const buildAuthorsSearchString = (authors) => {
  // Convierte authors a un string indexable para el search (soporta string u objeto)
  if (!Array.isArray(authors)) return "";
  return authors
    .map((a) => {
      if (typeof a === "string") return a;

      if (a && typeof a === "object") {
        const parts = [];
        if (a.name) parts.push(a.name);
        if (a.lastname) parts.push(a.lastname);
        if (a.email) parts.push(a.email);
        return parts.join(" ");
      }

      return "";
    })
    .join(" ")
    .toLowerCase();
};

// Determina si una thesis “pertenece” al usuario comparando con authors
function thesisBelongsToUserByAuthor(thesis, user) {
  const uName = norm(user?.name);
  const uLast = norm(user?.lastname);
  const uEmail = norm(user?.email);

  const authors = Array.isArray(thesis?.authors) ? thesis.authors : [];

  return authors.some((a) => {
    // Caso 1: author viene como string (ej: "John Doe - mail@x.com")
    if (typeof a === "string") {
      const s = norm(a);

      const byNameLast =
        (uName && uLast && s.includes(uName) && s.includes(uLast)) ||
        (uName && s.includes(uName)) ||
        (uLast && s.includes(uLast));

      const byEmail = uEmail && s.includes(uEmail);

      // Si el usuario tiene email, lo priorizamos como match más confiable
      return uEmail ? byEmail || byNameLast : byNameLast;
    }

    // Caso 2: author viene como objeto {name, lastname, email}
    const aName = norm(a?.name);
    const aLast = norm(a?.lastname);
    const aEmail = norm(a?.email);

    const nameLastMatch =
      uName && uLast ? aName === uName && aLast === uLast : false;

    // Si ambos tienen email, match exacto por email
    if (uEmail && aEmail) return aEmail === uEmail;

    // Fallback: match exacto por name+lastname
    return nameLastMatch;
  });
}

// COMPONENT: LibraryPSearch
const LibraryPSearch = () => {
  // Token y usuario autenticado (memo para no recalcular en cada render)
  const token = useMemo(() => getAuthToken(), []);
  const authUser = useMemo(() => getAuthUser(), []);

  // ---------- Data ----------
  const [theses, setTheses] = useState([]);
  const [liked, setLiked] = useState({}); // mapa: thesisId -> boolean

  // ---------- UI ----------
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // ---------- Search & sort ----------
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("recent");

  // ---------- Pagination ----------
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // ---------- Certificate modal ----------
  const [certificateData, setCertificateData] = useState(null);
  const [selectedThesis, setSelectedThesis] = useState(null);

  // Load: trae TODAS las theses y filtra las que “pertenecen” al usuario
  useEffect(() => {
    const fetchMyTheses = async () => {
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

        // Filtra solo las tesis donde el usuario aparece como author
        const onlyMine = data.filter((t) =>
          thesisBelongsToUserByAuthor(t, authUser)
        );

        // Normaliza likes + detecta si el usuario ya dio like
        const currentUserId = authUser?._id || authUser?.id || null;

        const mapped = onlyMine.map((t) => {
          const likesCount = Number(t.likes ?? 0);

          const userLiked =
            Array.isArray(t.likedBy) && currentUserId
              ? t.likedBy.some(
                  (u) => String(u?._id ?? u) === String(currentUserId)
                )
              : false;

          return { ...t, likes: likesCount, userLiked };
        });

        setTheses(mapped);

        // Construye el mapa liked inicial para la UI
        const likedMap = {};
        mapped.forEach((t) => (likedMap[t._id] = !!t.userLiked));
        setLiked(likedMap);
      } catch (err) {
        console.error("Error loading user theses:", err);
        setLoadError("Error loading theses. Please try again later.");
        setTheses([]);
        setLiked({});
      } finally {
        setLoading(false);
      }
    };

    fetchMyTheses();
  }, [token, authUser]);

  // Filter: search (title/authors/keywords/institution)
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return theses.filter((t) => {
      const instName = getInstitutionName(t);
      const authorsSearch = buildAuthorsSearchString(t.authors);
      const keywordsSearch = Array.isArray(t.keywords)
        ? t.keywords.map((k) => String(k).toLowerCase())
        : [];

      return (
        !q ||
        (t.title || "").toLowerCase().includes(q) ||
        authorsSearch.includes(q) ||
        keywordsSearch.some((k) => k.includes(q)) ||
        instName.toLowerCase().includes(q)
      );
    });
  }, [query, theses]);

  // Sort: year/title/likes
  const filteredOrdered = useMemo(() => {
    const arr = [...filtered];

    arr.sort((a, b) => {
      const byTitle = (a.title || "").localeCompare(b.title || "");
      const byId = String(a._id ?? "").localeCompare(String(b._id ?? ""));
      const ya = Number(a.year ?? 0);
      const yb = Number(b.year ?? 0);
      const la = Number(a.likes ?? 0);
      const lb = Number(b.likes ?? 0);

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

        case "likes_most":
          if (lb !== la) return lb - la;
          if (byTitle !== 0) return byTitle;
          return byId;

        case "likes_least":
          if (la !== lb) return la - lb;
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

  const pageItems = useMemo(
    () => filteredOrdered.slice(start, end),
    [filteredOrdered, start, end]
  );

  const pagesArray = useMemo(
    () => Array.from({ length: totalPages }, (_, i) => i + 1),
    [totalPages]
  );

  const go = (p) => setPage(p);

  // Actions: abrir PDF en gateway
  const handleView = (thesis) => {
    const cid = thesis.ipfsCid;

    if (!cid) {
      alert("This thesis does not have a downloadable file.");
      return;
    }

    const url = `https://${gateway}/ipfs/${cid}#toolbar=0&navpanes=0&scrollbar=0`;
    window.open(url, "_blank");
  };

  // Placeholder: permiso / edición (por ahora logs)
  const handlePermission = async (thesis) => {
    console.log("Permission thesis:", thesis);
  };

  const handleEdit = async (thesis) => {
    console.log("Edit thesis:", thesis);
  };

  // Certificate: consulta al backend y abre modal
  const handleCertificate = async (thesis) => {
    try {
      // Guarda la tesis seleccionada para mostrar contexto en el modal
      setSelectedThesis(thesis);

      const res = await axios.get(
        `${API_BASE_URL}/api/theses/${thesis._id}/certificate`,
        token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
      );

      // Guarda data del certificado (lo usa ModalCertificate)
      setCertificateData(res.data);

      // Abre modal (Bootstrap 5)
      openCertificateModal();
    } catch (e) {
      console.error(e);
      setCertificateData(null);
      setSelectedThesis(null);
      alert("No se pudo obtener el certificado.");
    }
  };

  // Like: sincroniza con backend y actualiza lista + mapa liked
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

      // Actualiza likes y estado en la lista principal
      if (thesis && thesis._id) {
        setTheses((prev) =>
          prev.map((t) =>
            t._id === thesis._id
              ? { ...t, likes: Number(thesis.likes ?? 0), userLiked: !!isLiked }
              : t
          )
        );
      }

      // Actualiza mapa liked para UI instantánea
      setLiked((prev) => ({ ...prev, [id]: !!isLiked }));
    } catch (err) {
      console.error("Error toggling like:", err);
    }
  };

  // Bootstrap Modal helper
  const openCertificateModal = () => {
    const el = document.getElementById("modalCertificate");
    if (!el) return;

    const modal = window.bootstrap?.Modal.getOrCreateInstance(el);
    modal?.show();
  };

  // Render: loading / error / empty state
  if (loading) {
    return (
      <div className="container py-2">
        <div className="text-muted">Loading theses…</div>
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

  // Empty state: el usuario no tiene tesis (antes de filtrar por query)
  if (theses.length === 0) {
    return (
      <div className="container py-2">
        <div
          className="d-flex justify-content-center align-items-center"
          style={{ minHeight: "55vh" }}
        >
          <div className="text-center">
            {InboxMin}
            <h3 className="m-0" style={{ color: "#b6b7ba" }}>
              <i>The user currently has no theses added.</i>
            </h3>
          </div>
        </div>
      </div>
    );
  }

  // Render: UI principal
  return (
    <div className="container py-2">
      {/* Search + Sort */}
      <div className="row g-3 align-items-center mb-3">
        <div className="col-lg-8">
          <div className="d-flex gap-2">
            <input
              className="form-control"
              placeholder="Search your theses by title, author, keyword or institution…"
              value={query}
              onChange={(e) => {
                setPage(1);
                setQuery(e.target.value);
              }}
            />

            {/* Sort dropdown (Bootstrap) */}
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

        {/* Counter */}
        <div className="col-lg-4 text-lg-end">
          <span className="text-muted">
            {filteredOrdered.length} result
            {filteredOrdered.length !== 1 ? "s" : ""} · Page {currentPage} of{" "}
            {totalPages}
          </span>
        </div>
      </div>

      {/* LIST */}
      <div className="row">
        <div className="col-12 d-flex flex-column gap-3">
          {pageItems.map((t, idx) => {
            const rowKey = `${t._id}-${start + idx}`;
            const isLiked = liked[t._id] ?? t.userLiked ?? false;
            const instName = getInstitutionName(t);

            return (
              <div key={rowKey} className="card shadow-sm">
                <div className="card-body d-flex align-items-center gap-3">
                  {/* Thumbnail (placeholder) */}
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
                      Institution:&nbsp;{instName}
                      {t.department ? ` · ${t.department}` : " "}
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

                  {/* Actions: 2 filas (acciones + status/certificado) */}
                  <div className="d-flex flex-column gap-2">
                    {/* Row 1: view / edit-permission / like */}
                    <div className="d-flex align-items-center gap-2">
                      <button
                        type="button"
                        className="btn btn-memory"
                        title="View"
                        onClick={() => handleView(t)}
                      >
                        {EyeFillIcon}
                      </button>

                      {/* Si está APPROVED: muestra permission. Si no: muestra edit */}
                      {(() => {
                        const status = String(t.status || "").toUpperCase();
                        const isApproved = status === "APPROVED";

                        if (isApproved) {
                          return (
                            <a
                              href={`http://localhost:3000/update/${t._id}`}
                              className="btn btn-warning"
                              title="Permission"
                              onClick={() => handlePermission(t)}
                            >
                              {KeyPermission}
                            </a>
                          );
                        }

                        return (
                          <a
                            href={`http://localhost:3000/update/${t._id}`}
                            className="btn btn-warning"
                            title="Edit"
                            onClick={() => handleEdit(t)}
                          >
                            {EditIcon}
                          </a>
                        );
                      })()}

                      {/* Like toggle */}
                      <button
                        type="button"
                        className="btn btn-danger btn-fix-like d-flex align-items-center gap-1"
                        title={isLiked ? "Unlike" : "Like"}
                        onClick={() => handleToggleLike(t._id)}
                      >
                        {isLiked ? HeartFill : HeartOutline}
                        <span className="fw-semibold">{t.likes ?? 0}</span>
                      </button>
                    </div>

                    {/* Row 2: certificado (depende del status) */}
                    {(() => {
                      const status = String(t.status || "").toUpperCase();
                      const isApproved = status === "APPROVED";
                      const isRejected = status === "REJECTED";

                      if (isApproved) {
                        return (
                          <button
                            type="button"
                            className="btn btn-memory w-100 d-flex align-items-center justify-content-center gap-2"
                            onClick={() => handleCertificate(t)}
                          >
                            {CheckCircle}
                            <span className="fw-semibold t-white">
                              See Certification
                            </span>
                          </button>
                        );
                      }

                      if (isRejected) {
                        return (
                          <button
                            type="button"
                            className="btn btn-danger w-100 d-flex align-items-center justify-content-center gap-2"
                          >
                            {CrossCircle}
                            <span className="fw-semibold t-white">
                              Not available
                            </span>
                          </button>
                        );
                      }

                      // Pending (default)
                      return (
                        <button
                          type="button"
                          className="btn btn-warning w-100 d-flex align-items-center justify-content-center gap-2"
                        >
                          {TimeCircle}
                          <span className="fw-semibold t-white">
                            Under Review
                          </span>
                        </button>
                      );
                    })()}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Empty state por filtros/search */}
          {pageItems.length === 0 && (
            <div className="text-muted text-center py-4">No theses found.</div>
          )}

          {/* Pagination */}
          {filteredOrdered.length > 0 && (
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
          )}
        </div>
      </div>

      {/* Modal: se mantiene montado, se alimenta con thesis + certificate */}
      <ModalCertificate
        thesis={selectedThesis}
        certificate={certificateData}
        onClose={() => {
          setCertificateData(null);
          setSelectedThesis(null);
        }}
      />
    </div>
  );
};

export default LibraryPSearch;
