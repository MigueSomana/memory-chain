import React, { useMemo, useState, useEffect } from "react";
import axios from "axios";
import { getAuthToken, getAuthInstitution } from "../../utils/authSession";
import ModalView from "../../components/modal/ModalView";

import {
  Eye,
  ChevronDown,
  Copy,
  ArrowDown01,
  ArrowUp10,
  ArrowDownAZ,
  ArrowUpZA,
  TextQuote,
  Heart,
  School,
  Check,
  BadgeCheck,
  OctagonMinus,
  Clock3,
  GraduationCap,
  FingerprintPattern,
  Funnel,
  UserPen,
} from "lucide-react";

// ===================== CONFIG GLOBAL =====================
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

// ===================== SORT OPTIONS =====================
const SORT_OPTIONS = [
  { key: "recent", label: "Most recent", icon: <ArrowDown01 size={18} /> },
  { key: "oldest", label: "Oldest", icon: <ArrowUp10 size={18} /> },
  { key: "title_az", label: "Title A–Z", icon: <ArrowDownAZ size={18} /> },
  { key: "title_za", label: "Title Z–A", icon: <ArrowUpZA size={18} /> },
];

// ===================== STATUS FILTER =====================
const STATUS_FILTER_OPTIONS = [
  { key: "all", label: "All" },
  { key: "APPROVED", label: "Approved" },
  { key: "PENDING", label: "Pending" },
  { key: "REJECTED", label: "Rejected" },
];

// Dropdown para cambiar status (se mantiene bloqueo en APPROVED)
const STATUS_CHANGE_OPTIONS = [
  { key: "PENDING", label: "Pending" },
  { key: "REJECTED", label: "Rejected" },
  { key: "APPROVED", label: "Verified" },
];

// ===================== HELPERS =====================
const normalizeStatus = (s) => String(s || "").toUpperCase();

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

const getYearFromThesis = (t) => {
  if (t?.date) {
    const ms = new Date(t.date).getTime();
    if (!Number.isNaN(ms)) return new Date(ms).getFullYear();
  }
  if (t?.createdAt) {
    const ms = new Date(t.createdAt).getTime();
    if (!Number.isNaN(ms)) return new Date(ms).getFullYear();
  }
  const y = Number(t?.year);
  if (Number.isFinite(y) && y > 0) return y;
  return NaN;
};

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

// status meta + lock
const getStatusTone = (raw) => {
  const s = normalizeStatus(raw);
  if (s === "APPROVED") return "certified";
  if (s === "REJECTED") return "rejected";
  return "pending";
};

const getStatusChip = (rawStatus) => {
  const s = normalizeStatus(rawStatus);

  if (s === "APPROVED") {
    return {
      Icon: BadgeCheck,
      toneClass: "mcStatusChip--approved",
    };
  }

  if (s === "REJECTED") {
    return {
      Icon: OctagonMinus,
      toneClass: "mcStatusChip--rejected",
    };
  }

  return {
    Icon: Clock3,
    toneClass: "mcStatusChip--pending",
  };
};

const isStatusLocked = (raw) => normalizeStatus(raw) === "APPROVED";

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

// ===================== COMPONENT =====================
const LibraryUSearch = () => {
  const token = useMemo(() => getAuthToken(), []);
  const authInst = useMemo(() => getAuthInstitution(), []);

  const [theses, setTheses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // top row controls
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("recent");
  const [statusFilter, setStatusFilter] = useState("all");

  // pagination
  const [page, setPage] = useState(1);
  const pageSize = 12; // ✅ 3 columnas: 12 encaja mejor (3x4)

  // modal
  const [selectedThesisView, setSelectedThesisView] = useState(null);

  // copy toast
  const [copiedId, setCopiedId] = useState(null);

  // ===================== LOAD =====================
  useEffect(() => {
    const fetchMyTheses = async () => {
      try {
        setLoading(true);
        setLoadError("");

        if (!authInst?._id) {
          setTheses([]);
          return;
        }

        const headers = token
          ? { Authorization: `Bearer ${token}` }
          : undefined;

        const res = await axios.get(
          `${API_BASE_URL}/api/theses/sub/${authInst._id}`,
          headers ? { headers } : undefined,
        );

        const data = Array.isArray(res.data) ? res.data : [];

        // preserva likes/cited si vienen en backend; si no, default 0
        setTheses(
          data.map((t) => ({
            ...t,
            likes: Number(t.likes ?? 0),
            citedCount: Number(t.citedCount ?? t.cited ?? 0),
          })),
        );
      } catch (err) {
        console.error("Error loading institution theses:", err);
        setLoadError("Error loading theses. Please try again later.");
        setTheses([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMyTheses();
  }, [token, authInst]);

  // ===================== FILTERED =====================
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const selectedStatus = normalizeStatus(statusFilter);

    return theses.filter((t) => {
      const status = normalizeStatus(t.status);
      const authorsSearch = buildAuthorsSearchString(t.authors);

      const dept = String(t.department || "").toLowerCase();
      const degree = String(t.degree || "").toLowerCase();
      const fileHash = String(t.fileHash || "").toLowerCase();

      const matchesQ =
        !q ||
        (t.title || "").toLowerCase().includes(q) ||
        authorsSearch.includes(q) ||
        dept.includes(q) ||
        degree.includes(q) ||
        fileHash.includes(q);

      const matchesStatus =
        selectedStatus === "ALL" || status === selectedStatus;

      return matchesQ && matchesStatus;
    });
  }, [theses, query, statusFilter]);

  // ===================== ORDERED =====================
  const filteredOrdered = useMemo(() => {
    const arr = [...filtered];

    arr.sort((a, b) => {
      const byTitle = (a.title || "").localeCompare(b.title || "");
      const byId = String(a._id ?? "").localeCompare(String(b._id ?? ""));

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
        default:
          return 0;
      }
    });

    return arr;
  }, [filtered, sortBy]);

  // ===================== PAGINATION =====================
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

    const el = document.getElementById("modalView");
    if (!el) return;

    const modal = window.bootstrap?.Modal?.getOrCreateInstance(el, {
      backdrop: "static",
      keyboard: false,
    });
    modal?.show();
  };

  const handleChangeStatus = async (thesisId, newStatus) => {
    if (!token) return;

    try {
      const headers = { Authorization: `Bearer ${token}` };

      const res = await axios.patch(
        `${API_BASE_URL}/api/theses/${thesisId}/status`,
        { status: newStatus },
        { headers },
      );

      const updated = res?.data?.thesis || res?.data || null;

      setTheses((prev) =>
        prev.map((t) =>
          String(t._id) === String(thesisId)
            ? { ...t, status: updated?.status ?? newStatus }
            : t,
        ),
      );
    } catch (err) {
      console.error("Error updating thesis status:", err);
      alert("Failed to update status ❌");
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

  const canVerify = !!authInst?.canVerify;

  const statusFilterLabel =
    STATUS_FILTER_OPTIONS.find((o) => o.key === statusFilter)?.label ?? "—";

  const activeSortOption =
    SORT_OPTIONS.find((o) => o.key === sortBy) || SORT_OPTIONS[0];

  return (
    <div className="mcExploreWrap">
      <ModalView thesis={selectedThesisView} />

      <div className="mcExploreContainer">
        {/* Membership warning */}
        {!canVerify && (
          <div className="mcAlert mcAlertDanger">
            <span className="mcAlertIcon" aria-hidden="true">
              !
            </span>
            <div>
              Please activate your membership in order to certify those of your
              institution.
            </div>
          </div>
        )}

        {/* ===================== TOP ROW (one line) ===================== */}
        <div className="mcTopRow mcLibTopRow">
          {/* Search smaller */}
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
              placeholder="Search by title, author, or keywords..."
              value={query}
              onChange={(e) => {
                setPage(1);
                setQuery(e.target.value);
              }}
            />
          </div>
          {/* Count */}
          <div className="mcTopMeta mcTopMetaInline">
            <span className="mcCountStrong">{filteredOrdered.length}</span>
            <span className="mcCountText">
              thes{filteredOrdered.length !== 1 ? "es found" : "is found"}
            </span>
          </div>

          {/* Sort */}
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

          {/* Filter by status */}
          <div className="mcSortWrap dropdown">
            <button
              className="mcSortBtn"
              type="button"
              data-bs-toggle="dropdown"
              aria-expanded="false"
              title="Filter"
            >
              <span className="mcSortIcon" aria-hidden="true">
                <Funnel size={18} />
              </span>
              <span className="mcSortLabelDesktop">
                Filter: {statusFilterLabel}
              </span>
            </button>

            <ul className="dropdown-menu dropdown-menu-end mcDropdownMenu">
              {STATUS_FILTER_OPTIONS.map((opt) => (
                <li key={opt.key}>
                  <button
                    className={`dropdown-item ${
                      statusFilter === opt.key ? "active" : ""
                    }`}
                    type="button"
                    onClick={() => {
                      setStatusFilter(opt.key);
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
        {/* ===================== GRID (3 columns) ===================== */}
        <section className="mcResults">
          <div className="mcCardsGrid mcCardsGrid3">
            {pageItems.map((t, idx) => {
              const rowKey = `${t._id}-${start + idx}`;

              const tone = getStatusTone(t.status); // certified | pending | rejected
              const locked = isStatusLocked(t.status);

              const year = getYearFromThesis(t);
              const dept = String(t.department || "").trim();
              const degree = String(t.degree || "").trim();

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
              const citedCount = Number(t.citedCount ?? 0);
              const likesCount = Number(t.likes ?? 0);

              return (
                <article key={rowKey} className={`mcCard ${tone} mcLibCard`}>
                  {/* ✅ barrita arriba con color por status */}
                  <div className={`mcCardBar mcCardBar--${tone}`} />

                  <div className="mcCardTop">
                    <div className="mcStatus">
                      <span className={`mcStatusDot ${tone}`} />
                      <span className="mcStatusLabel">
                        {tone === "certified"
                          ? "Verified"
                          : tone === "rejected"
                            ? "Rejected"
                            : "Pending"}
                      </span>
                    </div>

                    <div className="mcYear">
                      {Number.isNaN(year) ? "—" : year}
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

                    {/* ✅ Department + Degree en la misma línea como pediste */}
                    <div className="mcCardMeta">
                      <div className="mcMetaRow">
                        <span className="mcMetaIcon" aria-hidden="true">
                          <School size={18} />
                        </span>
                        <span className="mcMetaText">{dept}</span>
                      </div>

                      <div className="mcMetaRow">
                        <span className="mcMetaIcon" aria-hidden="true">
                          <GraduationCap size={18} />
                        </span>
                        <span className="mcMetaText">{degree}</span>
                      </div>
                    </div>

                    {/* ✅ Hash input copiables */}
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
                        className={`mcHashCopyBtn ${copiedId === String(t._id) ? "is-copied" : ""}`}
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

                    {/* ✅ vuelve cited + likes */}
                    <div className="mcCardFooter">
                      <div className="mcMetrics">
                        <span className="mcMetric">
                          <span
                            className="mcMetricIcon fix1"
                            aria-hidden="true"
                          >
                            <TextQuote size={18} />
                          </span>
                          <span className="mcMetricVal">{citedCount}</span>
                          <span className="mcMetricLbl">cited</span>
                        </span>

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

                        {/* ✅ Change status dropdown (locked on APPROVED) */}
                        {canVerify && (
                          <div className="dropdown">
                            {(() => {
                              const chip = getStatusChip(t.status);
                              const StatusIcon = chip.Icon;

                              return (
                                <>
                                  <button
                                    type="button"
                                    className={`mcStatusChip ${chip.toneClass} ${
                                      locked ? "is-locked" : ""
                                    }`}
                                    data-bs-toggle="dropdown"
                                    aria-expanded="false"
                                    disabled={locked}
                                    title={
                                      locked
                                        ? "Status locked (Verified)"
                                        : "Change status"
                                    }
                                  >
                                    <StatusIcon size={18} />
                                  </button>

                                  {!locked && (
                                    <ul className="dropdown-menu dropdown-menu-end mcDropdownMenu">
                                      {STATUS_CHANGE_OPTIONS.map((opt) => {
                                        const isCurrent =
                                          normalizeStatus(opt.key) ===
                                          normalizeStatus(t.status);

                                        return (
                                          <li key={opt.key}>
                                            <button
                                              type="button"
                                              className={`dropdown-item ${isCurrent ? "active" : ""}`}
                                              onClick={() =>
                                                handleChangeStatus(
                                                  t._id,
                                                  opt.key,
                                                )
                                              }
                                              disabled={isCurrent}
                                            >
                                              {opt.label}
                                            </button>
                                          </li>
                                        );
                                      })}
                                    </ul>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        )}
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

          {/* Pagination */}
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
        </section>
      </div>
    </div>
  );
};

export default LibraryUSearch;
