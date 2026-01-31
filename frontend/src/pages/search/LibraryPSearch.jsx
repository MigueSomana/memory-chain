import React, { useMemo, useState, useEffect } from "react";
import ModalCertificate from "../../components/modal/ModalCertificate";
import ModalView from "../../components/modal/ModalView";
import axios from "axios";
import { getAuthToken, getIdUser } from "../../utils/authSession";
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

// ===================== CONFIG GLOBAL (API) =====================
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

// ===================== UI OPTIONS (Ordenamiento) =====================
const SORT_OPTIONS = [
  { key: "recent", label: "Most recent" },
  { key: "oldest", label: "Oldest" },
  { key: "title_az", label: "Title A–Z" },
  { key: "title_za", label: "Title Z–A" },
  { key: "likes_most", label: "Most likes" },
  { key: "likes_least", label: "Least likes" },
];

// institution display (si viene string no lo tocamos)
const getInstitutionName = (thesis) => {
  const inst = thesis?.institution;
  if (!inst) return "";
  if (typeof inst === "string") return inst;
  return inst?.name || "";
};

//  UI validation: si no hay institución => "Investigación Independiente"
function getInstitutionUI(thesis) {
  const instName = String(getInstitutionName(thesis) || "").trim();
  const hasInstitution = Boolean(instName);

  return {
    hasInstitution,
    label: hasInstitution ? "Institution:" : "Independent Research",
    value: hasInstitution ? instName : "",
  };
}

const buildAuthorsSearchString = (authors) => {
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

// Timestamp para ordenar por recent/oldest (date/createdAt/year)
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

function getAnyId(v) {
  if (!v) return null;

  // si viene tipo { $oid: "..." }
  if (typeof v === "object" && v.$oid) return String(v.$oid);

  // si viene populated { _id: "..."} o {_id: {$oid:"..."}}
  if (typeof v === "object" && v._id) return getAnyId(v._id);

  // si viene { id: "..." }
  if (typeof v === "object" && v.id) return String(v.id);

  // si viene string
  if (typeof v === "string") return v;

  return null;
}

// Pertenece al usuario por ID (principal: uploadedBy; fallback: authors._id)
function thesisBelongsToUser(thesis, userId) {
  if (!userId) return false;

  // 1) dueño real (quien subió)
  const uploadedById = getAnyId(thesis?.uploadedBy);
  if (uploadedById && String(uploadedById) === String(userId)) return true;

  // 2) fallback: authors incluye el userId
  const authors = Array.isArray(thesis?.authors) ? thesis.authors : [];
  return authors.some((a) => {
    const aid = getAnyId(a);
    return aid && String(aid) === String(userId);
  });
}

// ===================== COMPONENT: LibraryPSearch =====================
const LibraryPSearch = () => {
  const token = useMemo(() => getAuthToken(), []);
  const userId = useMemo(() => getIdUser(), []);

  const [theses, setTheses] = useState([]);
  const [liked, setLiked] = useState({});

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("recent");

  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [certificateData, setCertificateData] = useState(null);
  const [selectedThesis, setSelectedThesis] = useState(null);
  const [selectedThesisView, setSelectedThesisView] = useState(null);

  useEffect(() => {
    const fetchMyTheses = async () => {
      try {
        setLoading(true);
        setLoadError("");

        if (!userId) {
          // actor != user o sesión corrupta
          setTheses([]);
          setLiked({});
          return;
        }

        const headers = token
          ? { Authorization: `Bearer ${token}` }
          : undefined;

        const res = await axios.get(
          `${API_BASE_URL}/api/theses`,
          headers ? { headers } : undefined,
        );

        const data = Array.isArray(res.data) ? res.data : [];

        const onlyMine = data.filter((t) => thesisBelongsToUser(t, userId));

        const mapped = onlyMine.map((t) => {
          const likesCount = Number(t.likes ?? 0);

          const userLiked =
            Array.isArray(t.likedBy) && userId
              ? t.likedBy.some((u) => String(getAnyId(u)) === String(userId))
              : false;

          return { ...t, likes: likesCount, userLiked };
        });

        setTheses(mapped);

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
  }, [token, userId]);

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

  const filteredOrdered = useMemo(() => {
    const arr = [...filtered];

    arr.sort((a, b) => {
      const byTitle = (a.title || "").localeCompare(b.title || "");
      const byId = String(a._id ?? "").localeCompare(String(b._id ?? ""));
      const la = Number(a.likes ?? 0);
      const lb = Number(b.likes ?? 0);

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

  const handleView = (thesis) => {
    setSelectedThesisView(thesis);

    const el = document.getElementById("modalView");
    if (!el) return;

    const modal = window.bootstrap?.Modal?.getOrCreateInstance(el, {
      backdrop: "static",
      keyboard: false,
    });
    modal?.show();
  };

  const handlePermission = async (thesis) => {
    console.log("Permission thesis:", thesis);
  };

  const handleEdit = async (thesis) => {
    console.log("Edit thesis:", thesis);
  };

  const handleCertificate = async (thesis) => {
    try {
      setSelectedThesis(thesis);

      const res = await axios.get(
        `${API_BASE_URL}/api/theses/${thesis._id}/certificate`,
        token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
      );

      setCertificateData(res.data);
      openCertificateModal();
    } catch (e) {
      console.error(e);
      setCertificateData(null);
      setSelectedThesis(null);
      alert("No se pudo obtener el certificado.");
    }
  };

  const handleToggleLike = async (id) => {
    if (!token) return;

    try {
      const headers = { Authorization: `Bearer ${token}` };

      const res = await axios.post(
        `${API_BASE_URL}/api/theses/${id}/like`,
        null,
        {
          headers,
        },
      );

      const { thesis, liked: isLiked } = res.data || {};

      if (thesis && thesis._id) {
        setTheses((prev) =>
          prev.map((t) =>
            String(t._id) === String(thesis._id)
              ? { ...t, likes: Number(thesis.likes ?? 0), userLiked: !!isLiked }
              : t,
          ),
        );
      }

      setLiked((prev) => ({ ...prev, [id]: !!isLiked }));
    } catch (err) {
      console.error("Error toggling like:", err);
    }
  };

  const openCertificateModal = () => {
    const el = document.getElementById("modalCertificate");
    if (!el) return;

    const modal = window.bootstrap?.Modal.getOrCreateInstance(el);
    modal?.show();
  };

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

  return (
    <div className="container py-2 mc-thesis-page">
      <ModalView thesis={selectedThesisView} />

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
                      type="button"
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

      {/* LIST */}
      <div className="row">
        <div className="col-12 d-flex flex-column gap-3">
          {pageItems.map((t, idx) => {
            const rowKey = `${t._id}-${start + idx}`;
            const isLiked = liked[t._id] ?? t.userLiked ?? false;

            const instUI = getInstitutionUI(t);
            const status = String(t.status || "").toUpperCase();
            const isApproved = status === "APPROVED";
            const isRejected = status === "REJECTED";

            return (
              <div key={rowKey} className="card mc-thesis-card shadow-sm">
                <div className="card-body d-flex align-items-start gap-3 mc-thesis-card-body">
                  {/* Info */}
                  <div className="flex-grow-1" style={{ minWidth: 0 }}>
                    <h5 className="m-0 mc-thesis-title">{t.title}</h5>

                    <div className="text-muted small mt-1">
                      <span className="mc-label-muted">Authors:</span>{" "}
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
                      <span>{instUI.label}</span> {instUI.value}
                      {instUI.hasInstitution && t.department
                        ? ` · ${t.department}`
                        : ""}
                    </div>

                    <div className="text-muted small">
                      <span className="mc-label-muted">File Hash:</span>{" "}
                      {t.fileHash ?? "—"}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="d-flex flex-column gap-2">
                    {/* Row 1 */}
                    <div className="d-flex align-items-center gap-2 justify-content-end">
                      <button
                        type="button"
                        className="btn btn-memory"
                        title="View"
                        onClick={() => handleView(t)}
                      >
                        {EyeFillIcon}
                      </button>
                      {isApproved ? (
                        <a
                          className="btn btn-warning"
                          title="Permission"
                          onClick={() => handlePermission(t)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {KeyPermission}
                        </a>
                      ) : (
                        <a
                          href={`http://localhost:3000/update/${t._id}`}
                          className="btn btn-warning"
                          title="Edit"
                          onClick={() => handleEdit(t)}
                        >
                          {EditIcon}
                        </a>
                      )}

                      <button
                        type="button"
                        className="btn btn-danger btn-fix-like d-flex align-items-center gap-1"
                        title={isLiked ? "Unlike" : "Like"}
                        onClick={() => handleToggleLike(t._id)}
                      >
                        {isLiked ? HeartFill : HeartOutline}
                        <span className="mc-like-count">{t.likes ?? 0}</span>
                      </button>
                    </div>
                    {!instUI.hasInstitution ? (
                      <button
                        type="button"
                        className="btn btn-secondary w-100 d-flex align-items-center justify-content-center gap-2"
                        onClick={() => {
                          // aquí puedes abrir modal / navegar / llamar endpoint
                          alert("Solicitud de registro enviada (demo).");
                        }}
                      >
                        {CrossCircle}
                        <span className="fw-semibold t-white">Request Log</span>
                      </button>
                    ) : isApproved ? (
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
                    ) : isRejected ? (
                      <button
                        type="button"
                        className="btn btn-danger w-100 d-flex align-items-center justify-content-center gap-2"
                      >
                        {CrossCircle}
                        <span className="fw-semibold t-white">
                          Not available
                        </span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-warning w-100 d-flex align-items-center justify-content-center gap-2"
                      >
                        {TimeCircle}
                        <span className="fw-semibold t-white">
                          Under Review
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {pageItems.length === 0 && (
            <div className="text-muted text-center py-4">No theses found.</div>
          )}

          {filteredOrdered.length > 0 && (
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
                  className={`page-item ${currentPage === totalPages ? "disabled" : ""}`}
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
      </div>

      {/* ModalCertificate */}
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
