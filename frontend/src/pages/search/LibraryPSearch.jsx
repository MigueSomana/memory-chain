import React, { useMemo, useState, useEffect } from "react";
import ModalCertificate from "../../components/modal/ModalCertificate";
import ModalViewThesis from "../../components/modal/ModalViewThesis";
import axios from "axios";
import { NavLink } from "react-router-dom";
import { getAuthToken, getIdUser } from "../../utils/authSession";

import {
  Eye,
  Copy,
  Check,
  BadgeCheck,
  SquarePen,
  ChevronDown,
  ArrowDown01,
  ArrowUp10,
  ArrowDownAZ,
  ArrowUpZA,
  TextQuote,
  Heart,
  FingerprintPattern,
  University,
  GraduationCap,
  Binoculars,
  UserPen,
} from "lucide-react";

// ===================== CONFIG GLOBAL (API) =====================
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

// ===================== SORT OPTIONS =====================
const SORT_OPTIONS = [
  { key: "recent", label: "Most recent", icon: <ArrowDown01 size={18} /> },
  { key: "oldest", label: "Oldest", icon: <ArrowUp10 size={18} /> },
  { key: "title_az", label: "Title A–Z", icon: <ArrowDownAZ size={18} /> },
  { key: "title_za", label: "Title Z–A", icon: <ArrowUpZA size={18} /> },
  { key: "likes_most", label: "Most likes", icon: <Heart size={18} /> },
  { key: "likes_least", label: "Least likes", icon: <Heart size={18} /> },
];

// institution display (si viene string no lo tocamos)
const getInstitutionName = (thesis) => {
  const inst = thesis?.institution;
  if (!inst) return "";
  if (typeof inst === "string") return inst;
  return inst?.name || "";
};

// UI validation: si no hay institución => "Investigación Independiente"
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
  if (typeof v === "object" && v.$oid) return String(v.$oid);
  if (typeof v === "object" && v._id) return getAnyId(v._id);
  if (typeof v === "object" && v.id) return String(v.id);
  if (typeof v === "string") return v;
  return null;
}

// Pertenece al usuario por ID (principal: uploadedBy; fallback: authors._id)
function thesisBelongsToUser(thesis, userId) {
  if (!userId) return false;

  const uploadedById = getAnyId(thesis?.uploadedBy);
  if (uploadedById && String(uploadedById) === String(userId)) return true;

  const authors = Array.isArray(thesis?.authors) ? thesis.authors : [];
  return authors.some((a) => {
    const aid = getAnyId(a);
    return aid && String(aid) === String(userId);
  });
}

// helpers status
const normalizeStatus = (s) => String(s || "").toUpperCase();

// ✅ tone como LibraryUSearch + caso especial "Not certified"
const getCardTone = (thesis) => {
  const status = normalizeStatus(thesis?.status);
  const instUI = getInstitutionUI(thesis);

  // independiente + NO aprobado => gris (notcertified)
  if (!instUI.hasInstitution && status !== "APPROVED") return "notcertified";

  if (status === "APPROVED") return "certified";
  if (status === "REJECTED") return "rejected";
  return "pending";
};

// ✅ label superior
const getStatusLabel = (thesis) => {
  const status = normalizeStatus(thesis?.status);
  const instUI = getInstitutionUI(thesis);

  if (!instUI.hasInstitution && status !== "APPROVED") return "Not certified";
  if (status === "APPROVED") return "Verified";
  if (status === "REJECTED") return "Rejected";
  return "Pending";
};

// clipboard (igual que LibraryUSearch)
async function copyToClipboard(text) {
  try {
    if (!text) return false;
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

// ===================== COMPONENT: LibraryPSearch =====================
const LibraryPSearch = () => {
  const token = useMemo(() => getAuthToken(), []);
  const userId = useMemo(() => getIdUser(), []);

  const [theses, setTheses] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // top row controls
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("recent");

  // pagination
  const [page, setPage] = useState(1);
  const pageSize = 12;

  // modal
  const [certificateData, setCertificateData] = useState(null);
  const [selectedThesis, setSelectedThesis] = useState(null);
  const [selectedThesisView, setSelectedThesisView] = useState(null);

  // copy toast (hash)
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    const fetchMyTheses = async () => {
      try {
        setLoading(true);
        setLoadError("");

        if (!userId) {
          setTheses([]);
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

          return {
            ...t,
            likes: likesCount,
            userLiked,
            // ✅ nuevo backend: quotes
            quotes: Number(t.quotes ?? 0),
          };
        });

        setTheses(mapped);
      } catch (err) {
        console.error("Error loading user theses:", err);
        setLoadError("Error loading theses. Please try again later.");
        setTheses([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMyTheses();
  }, [token, userId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return theses.filter((t) => {
      const instName = (getInstitutionName(t) || "").toLowerCase();
      const authorsSearch = buildAuthorsSearchString(t.authors);
      const keywordsSearch = Array.isArray(t.keywords)
        ? t.keywords.map((k) => String(k).toLowerCase())
        : [];

      return (
        !q ||
        (t.title || "").toLowerCase().includes(q) ||
        authorsSearch.includes(q) ||
        keywordsSearch.some((k) => k.includes(q)) ||
        instName.includes(q)
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

  // ===================== ACTIONS =====================
  const handleView = (thesis) => {
    setSelectedThesisView(thesis);

    const el = document.getElementById("modalViewThesis");
    if (!el) return;

    const modal = window.bootstrap?.Modal?.getOrCreateInstance(el, {
      backdrop: "static",
      keyboard: false,
    });
    modal?.show();
  };

  const handleEdit = async (thesis) => {
    console.log("Edit thesis:", thesis);
  };

  const handleRequest = async (thesis) => {
    alert("Request Log sent (demo).");
    console.log("Request Log thesis:", thesis);
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

  const openCertificateModal = () => {
    const el = document.getElementById("modalCertificate");
    if (!el) return;

    const modal = window.bootstrap?.Modal.getOrCreateInstance(el);
    modal?.show();
  };

  // ✅ NUEVO: incrementar quotes
  const handleAddQuote = async (thesisId) => {
    // si quieres permitir público, quita este guard y no mandes headers
    if (!token) return;

    try {
      const headers = { Authorization: `Bearer ${token}` };

      const res = await axios.post(
        `${API_BASE_URL}/api/theses/${thesisId}/quote`,
        null,
        { headers },
      );

      const updated = res?.data?.thesis || res?.data || null;
      const newQuotes = Number(updated?.quotes ?? NaN);

      setTheses((prev) =>
        prev.map((t) => {
          if (String(t._id) !== String(thesisId)) return t;
          return {
            ...t,
            quotes: Number.isFinite(newQuotes)
              ? newQuotes
              : Number(t.quotes ?? 0) + 1,
          };
        }),
      );
    } catch (err) {
      console.error("Error incrementing quotes:", err);
      alert("Failed to add quote ❌");
    }
  };

  // ===================== UI STATES =====================
  if (loading) {
    return (
      <div className="mcExploreWrap">
        <div className="mcExploreContainer">
          <div className="mcMuted">Loading theses…</div>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mcExploreWrap">
        <div className="mcExploreContainer">
          <div className="mcAlert">{loadError}</div>
        </div>
      </div>
    );
  }

  if (theses.length === 0) {
    return (
      <div className="mcExploreWrap">
        <div className="mcExploreContainer">
          <div className="mcMuted">The user currently has no theses added.</div>
        </div>
      </div>
    );
  }

  const activeSortOption =
    SORT_OPTIONS.find((o) => o.key === sortBy) || SORT_OPTIONS[0];

  return (
    <div className="mcExploreWrap">
      <ModalViewThesis thesis={selectedThesisView} />

      <div className="mcExploreContainer">
        {/* ===================== TOP ROW ===================== */}
        <div className="mcTopRow mcLibTopRow">
          <div className="mcSearch mcSearchSm">
            <span className="mcSearchIcon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
                <path
                  d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <path
                  d="M16.4 16.4 21 21"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </span>

            <input
              className="mcSearchInput"
              placeholder="Search your theses by title, author, keyword or institution…"
              value={query}
              onChange={(e) => {
                setPage(1);
                setQuery(e.target.value);
              }}
            />
          </div>

          <div className="mcTopMeta mcTopMetaInline">
            <span className="mcCountStrong">{filteredOrdered.length}</span>
            <span className="mcCountText">
              thes{filteredOrdered.length !== 1 ? "es found" : "is found"}
            </span>
          </div>

          <div className="mcSortWrap dropdown">
            <button
              className="mcSortBtn"
              type="button"
              data-bs-toggle="dropdown"
              aria-expanded="false"
              title="Sort"
            >
              <span className="mcSortIcon" aria-hidden="true">
                {activeSortOption.icon}
              </span>
              <span className="mcSortLabelDesktop">
                {activeSortOption.label}
              </span>
            </button>

            <ul className="dropdown-menu dropdown-menu-end mcDropdownMenu">
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

        {/* ===================== GRID (3 columns) ===================== */}
        <section className="mcResults">
          <div className="mcCardsGrid mcCardsGrid3">
            {pageItems.map((t, idx) => {
              const rowKey = `${t._id}-${start + idx}`;
              const instUI = getInstitutionUI(t);
              const status = normalizeStatus(t.status);
              const isApproved = status === "APPROVED";
              const isPendingOrRejected =
                status === "PENDING" || status === "REJECTED";

              const tone = getCardTone(t);
              const statusLabel = getStatusLabel(t);

              const authorsText = Array.isArray(t.authors)
                ? t.authors
                    .map((a) =>
                      typeof a === "string"
                        ? a
                        : `${a.lastname ?? ""} ${a.name ?? ""}`.trim(),
                    )
                    .filter(Boolean)
                    .join(", ")
                : "";

              const fileHash = String(t.fileHash || "").trim();
              const quotesCount = Number(t.quotes ?? 0);
              const likesCount = Number(t.likes ?? 0);
              const instNameRaw = getInstitutionName(t);

              return (
                <article key={rowKey} className={`mcCard ${tone} mcLibCard`}>
                  <div className={`mcCardBar mcCardBar--${tone}`} />

                  <div className="mcCardTop">
                    <div className="mcStatus">
                      <span className={`mcStatusDot ${tone}`} />
                      <span className="mcStatusLabel">{statusLabel}</span>
                    </div>
                  </div>

                  <div className="mcCardBody">
                    <h3 className="mcCardTitle" title={t.title}>
                      {t.title}
                    </h3>

                    <div
                      className="mcCardAuthors mcMetaRow"
                      title={authorsText}
                    >
                      <span className="mcMetaIcon" aria-hidden="true">
                        <UserPen size={18} />
                      </span>
                      <span className="mcMetaText">{authorsText || "—"}</span>
                    </div>

                    <div className="mcCardMeta">
                      <div className="mcMetaRow" title={instNameRaw}>
                        <span className="mcMetaIcon" aria-hidden="true">
                          {instNameRaw ? (
                            <University size={18} />
                          ) : (
                            <Binoculars size={18} />
                          )}
                        </span>
                        <span className="mcMetaText">
                          {instNameRaw || "Independent Research"}
                        </span>
                      </div>

                      <div className="mcMetaRow">
                        <span className="mcMetaIcon" aria-hidden="true">
                          <GraduationCap size={18} />
                        </span>
                        <span className="mcMetaText">{t.degree || "—"}</span>
                      </div>
                    </div>

                    <div
                      className="mcHashCopyWrap mt-3 mb-3"
                      title={fileHash || ""}
                    >
                      <span className="mcHashPrefix">
                        <FingerprintPattern size={18} />
                      </span>

                      <span
                        className="mcHashValue"
                        onClick={(e) => {
                          const sel = window.getSelection();
                          const range = document.createRange();
                          range.selectNodeContents(e.currentTarget);
                          sel.removeAllRanges();
                          sel.addRange(range);
                        }}
                      >
                        {fileHash || "—"}
                      </span>

                      <button
                        className={`mcHashCopyBtn ${
                          copiedId === String(t._id) ? "is-copied" : ""
                        }`}
                        type="button"
                        title="Copy file hash"
                        onClick={async () => {
                          const ok = await copyToClipboard(fileHash);
                          if (ok) {
                            setCopiedId(String(t._id));
                            setTimeout(() => setCopiedId(null), 1400);
                          }
                        }}
                        disabled={!fileHash}
                      >
                        {copiedId === String(t._id) ? (
                          <Check size={16} />
                        ) : (
                          <Copy size={16} />
                        )}
                      </button>
                    </div>

                    <div className="mcCardDivider" />

                    <div className="mcCardFooter">
                      <div className="mcMetrics">
                        {/* ✅ Quotes: clickeable */}
                        <button
                          type="button"
                          className="mcMetric mcMetricBtn"
                          title="Add quote"
                          onClick={() => handleAddQuote(t._id)}
                        >
                          <span
                            className="mcMetricIcon fix1"
                            aria-hidden="true"
                          >
                            <TextQuote size={18} />
                          </span>
                          <span className="mcMetricVal">{quotesCount}</span>
                          <span className="mcMetricLbl">cited</span>
                        </button>

                        <span className="mcMetric">
                          <span
                            className="mcMetricIcon fix1"
                            aria-hidden="true"
                          >
                            <Heart size={18} />
                          </span>
                          <span className="mcMetricVal">{likesCount}</span>
                          <span className="mcMetricLbl">likes</span>
                        </span>
                      </div>

                      <div className="mcActions">
                        <button
                          type="button"
                          className="mcIconBtn"
                          title="View"
                          onClick={() => handleView(t)}
                        >
                          <Eye size={18} />
                        </button>

                        {isApproved ? (
                          <button
                            type="button"
                            className="mcStatusChip mcStatusChip--approved is-locked"
                            title="Verified"
                            onClick={() => handleCertificate(t)}
                          >
                            <BadgeCheck size={18} />
                          </button>
                        ) : instUI.hasInstitution && isPendingOrRejected ? (
                          <NavLink
                            to={"/update/" + t._id}
                            type="button"
                            className="mcIconBtn"
                            onClick={() => handleEdit(t)}
                            title="Edit thesis"
                          >
                            <SquarePen size={18} />
                          </NavLink>
                        ) : !instUI.hasInstitution && isPendingOrRejected ? (
                          <div className="dropdown">
                            <button
                              type="button"
                              className="mcIconBtn"
                              data-bs-toggle="dropdown"
                              aria-expanded="false"
                              title="Actions"
                            >
                              <ChevronDown size={18} />
                            </button>

                            <ul className="dropdown-menu dropdown-menu-end mcDropdownMenu">
                              <li>
                                <NavLink
                                  to={"/update/" + t._id}
                                  type="button"
                                  className="dropdown-item"
                                  onClick={() => handleEdit(t)}
                                >
                                  Edit Thesis
                                </NavLink>
                              </li>

                              <li>
                                <button
                                  type="button"
                                  className="dropdown-item"
                                  onClick={() => handleRequest(t)}
                                >
                                  Request Log
                                </button>
                              </li>
                            </ul>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}

            {pageItems.length === 0 && (
              <div className="mcMuted">No theses found.</div>
            )}
          </div>

          {filteredOrdered.length > 0 && (
            <div className="mcPager">
              <button
                className="mcPagerBtn"
                type="button"
                onClick={() => go(1)}
                disabled={currentPage === 1}
              >
                First
              </button>

              <div className="mcPagerNums">
                {pagesArray.map((p) => (
                  <button
                    key={`p-${p}`}
                    className={`mcPagerNum ${p === currentPage ? "is-active" : ""}`}
                    type="button"
                    onClick={() => go(p)}
                  >
                    {p}
                  </button>
                ))}
              </div>

              <button
                className="mcPagerBtn"
                type="button"
                onClick={() => go(totalPages)}
                disabled={currentPage === totalPages}
              >
                Last
              </button>
            </div>
          )}
        </section>
      </div>

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
