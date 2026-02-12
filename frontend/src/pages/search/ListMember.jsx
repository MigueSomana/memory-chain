import React, { useEffect, useMemo, useRef, useState } from "react";
import NavbarReal from "../../components/navbar/NavbarReal";
import Layout from "../../components/layout/LayoutPrivado";
import axios from "axios";
import { getAuthToken } from "../../utils/authSession";
import ModalViewUser from "../../components/modal/ModalViewUser"; // ✅ ajusta el path real

import {
  Eye,
  Funnel,
  ArrowDownAZ,
  ArrowUpZA,
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  BadgeCheck,
  Clock3,
  OctagonMinus,
  ChevronDown,
  BookMarked,
  Mail,
  IdCard,
  Users,
} from "lucide-react";

// ===================== CONFIG GLOBAL =====================
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

// ===================== SORT OPTIONS =====================
const SORT_OPTIONS = [
  { key: "name_az", label: "Name A–Z", icon: <ArrowDownAZ size={18} /> },
  { key: "name_za", label: "Name Z–A", icon: <ArrowUpZA size={18} /> },
  {
    key: "theses_most",
    label: "Most theses",
    icon: <ArrowDownWideNarrow size={18} />,
  },
  {
    key: "theses_least",
    label: "Fewest theses",
    icon: <ArrowUpNarrowWide size={18} />,
  },
];

// ===================== STATUS FILTER =====================
const STATUS_FILTER_OPTIONS = [
  { key: "all", label: "All" },
  { key: "APPROVED", label: "Approved" },
  { key: "PENDING", label: "Pending" },
  { key: "REJECTED", label: "Rejected" },
];

const STATUS_CHANGE_OPTIONS = [
  { key: "PENDING", label: "Pending" },
  { key: "REJECTED", label: "Rejected" },
  { key: "APPROVED", label: "Approved" },
];

// ===================== HELPERS =====================
const safeStr = (v) => String(v ?? "").trim();
const normalizeStatus = (s) => String(s || "").toUpperCase();

function getCurrentInstitutionId() {
  try {
    const raw = localStorage.getItem("memorychain_institution");
    if (raw) {
      const inst = JSON.parse(raw);
      return inst?._id || inst?.id || null;
    }
  } catch (e) {
    console.warn("Error parsing memorychain_institution", e);
  }
  return localStorage.getItem("memorychain_institutionId") || null;
}

function getUserDisplayName(u) {
  const name = safeStr(u?.name);
  const lastname = safeStr(u?.lastname);
  return safeStr(`${name} ${lastname}`).trim() || "User";
}
function getUserId(u) {
  return u?._id || u?.id || null;
}

// ✅ backend nuevo: educationalEmails[{institution,email?,status}]
function getMemberStatusFromUser(u, institutionId) {
  const edu = Array.isArray(u?.educationalEmails) ? u.educationalEmails : [];
  for (const entry of edu) {
    const inst = entry?.institution;
    const instId =
      typeof inst === "string"
        ? inst
        : inst && typeof inst === "object" && inst._id
          ? String(inst._id)
          : "";
    if (String(instId) === String(institutionId)) {
      return normalizeStatus(entry?.status || "PENDING");
    }
  }
  return "";
}

// ✅ NUEVO: tone para mcCardBar--pending/approved/rejected (igual que LibraryUSearch)
const getTone = (raw) => {
  const s = normalizeStatus(raw);
  if (s === "APPROVED") return "approved";
  if (s === "REJECTED") return "rejected";
  return "pending";
};

const getStatusLabel = (raw) => {
  const s = normalizeStatus(raw);
  if (s === "APPROVED") return "Approved";
  if (s === "REJECTED") return "Rejected";
  return "Pending";
};

const getStatusChip = (rawStatus) => {
  const s = normalizeStatus(rawStatus);
  if (s === "APPROVED")
    return { Icon: BadgeCheck, toneClass: "mcStatusChip--approved" };
  if (s === "REJECTED")
    return { Icon: OctagonMinus, toneClass: "mcStatusChip--rejected" };
  return { Icon: Clock3, toneClass: "mcStatusChip--pending" };
};

// Cuenta tesis donde user aparece como author OR uploadedBy
function countUserTheses(theses, userId) {
  const uid = String(userId || "");
  if (!uid) return 0;

  let c = 0;
  for (const t of theses) {
    const up = t?.uploadedBy;
    const upId =
      typeof up === "string"
        ? up
        : up && typeof up === "object" && up._id
          ? String(up._id)
          : "";
    const matchUploadedBy = upId && String(upId) === uid;

    const authors = Array.isArray(t?.authors) ? t.authors : [];
    let matchAuthor = false;
    for (const a of authors) {
      if (typeof a === "string") continue;
      const aid =
        typeof a?._id === "string"
          ? a._id
          : a?._id
            ? String(a._id)
            : a?.id
              ? String(a.id)
              : "";
      if (aid && String(aid) === uid) {
        matchAuthor = true;
        break;
      }
    }

    if (matchUploadedBy || matchAuthor) c += 1;
  }
  return c;
}

// ✅ helper para abrir modal Bootstrap sin data-bs-target
function openBootstrapModalById(id) {
  try {
    const el = document.getElementById(id);
    if (!el) return false;

    // Bootstrap 5 expone window.bootstrap.Modal
    const ModalCtor = window?.bootstrap?.Modal;
    if (ModalCtor) {
      const instance = ModalCtor.getOrCreateInstance(el);
      instance.show();
      return true;
    }

    // fallback: dispara el evento nativo (si estás usando auto-init por data api)
    el.classList.add("show");
    el.style.display = "block";
    el.removeAttribute("aria-hidden");
    return true;
  } catch (e) {
    console.warn("Could not open modal:", e);
    return false;
  }
}

// ===================== COMPONENT: MembersSearch =====================
const MembersSearch = () => {
  const token = getAuthToken();

  const [members, setMembers] = useState([]);
  const [theses, setTheses] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("name_az");
  const [statusFilter, setStatusFilter] = useState("all");

  const [page, setPage] = useState(1);
  const pageSize = 12;

  const institutionId = useMemo(() => getCurrentInstitutionId(), []);

  // ✅ para el modal
  const [selectedUser, setSelectedUser] = useState(null);

  // ===================== LOAD =====================
  useEffect(() => {
    const fetchMembersAndTheses = async () => {
      try {
        setLoading(true);
        setLoadError("");

        if (!token) {
          setMembers([]);
          setTheses([]);
          setLoadError("You must be logged in to view members.");
          return;
        }
        if (!institutionId) {
          setMembers([]);
          setTheses([]);
          setLoadError("No institution selected (missing institutionId).");
          return;
        }

        const headers = { Authorization: `Bearer ${token}` };

        const usersRes = await axios.get(`${API_BASE_URL}/api/users`, {
          headers,
        });
        const usersData = Array.isArray(usersRes.data) ? usersRes.data : [];

        const thesesRes = await axios.get(`${API_BASE_URL}/api/theses`, {
          headers,
        });
        const thesesData = Array.isArray(thesesRes.data) ? thesesRes.data : [];
        setTheses(thesesData);

        const filteredMembers = usersData
          .map((u) => {
            const st = getMemberStatusFromUser(u, institutionId);
            return st ? { ...u, __memberStatus: st } : null;
          })
          .filter(Boolean);

        setMembers(filteredMembers);
      } catch (err) {
        console.error("Error loading members:", err);
        setLoadError("Error loading members. Please try again later.");
        setMembers([]);
        setTheses([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMembersAndTheses();
  }, [token, institutionId]);

  // ===================== FILTERED =====================
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const selected = normalizeStatus(statusFilter);

    return members.filter((u) => {
      const name = getUserDisplayName(u).toLowerCase();
      const email = safeStr(u?.email).toLowerCase();

      const st = normalizeStatus(u?.__memberStatus || "PENDING");
      const matchesStatus = selected === "ALL" || st === selected;

      const matchesQ = !q || name.includes(q) || email.includes(q);
      return matchesQ && matchesStatus;
    });
  }, [members, query, statusFilter]);

  // ===================== ORDERED =====================
  const filteredOrdered = useMemo(() => {
    const arr = [...filtered];

    arr.sort((a, b) => {
      const nameA = getUserDisplayName(a).toLowerCase();
      const nameB = getUserDisplayName(b).toLowerCase();
      const nameCmp = nameA.localeCompare(nameB);

      const idA = String(getUserId(a) ?? "");
      const idB = String(getUserId(b) ?? "");
      const idCmp = idA.localeCompare(idB);

      const ca = countUserTheses(theses, idA);
      const cb = countUserTheses(theses, idB);

      switch (sortBy) {
        case "name_az":
          if (nameCmp !== 0) return nameCmp;
          return idCmp;
        case "name_za":
          if (nameCmp !== 0) return -nameCmp;
          return idCmp;
        case "theses_most":
          if (cb !== ca) return cb - ca;
          if (nameCmp !== 0) return nameCmp;
          return idCmp;
        case "theses_least":
          if (ca !== cb) return ca - cb;
          if (nameCmp !== 0) return nameCmp;
          return idCmp;
        default:
          return 0;
      }
    });

    return arr;
  }, [filtered, sortBy, theses]);

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
  const handleView = (member) => {
    // ✅ setea usuario y abre el modal
    setSelectedUser(member);
    openBootstrapModalById("modalViewUser");
  };

  // PATCH /api/users/:userId/educational-status  body: { institutionId, status }
  const handleChangeMemberStatus = async (userId, newStatus) => {
    if (!token || !institutionId) return;

    try {
      const headers = { Authorization: `Bearer ${token}` };

      const res = await axios.patch(
        `${API_BASE_URL}/api/users/${userId}/educational-status`,
        { institutionId, status: newStatus },
        { headers },
      );

      const updatedStatus =
        res?.data?.updated?.status || normalizeStatus(newStatus);

      setMembers((prev) =>
        prev.map((u) =>
          String(getUserId(u)) === String(userId)
            ? { ...u, __memberStatus: updatedStatus }
            : u,
        ),
      );

      // si el que estás viendo en el modal cambia, refresca selectedUser para que el pill se actualice
      setSelectedUser((prev) => {
        if (!prev) return prev;
        if (String(getUserId(prev)) !== String(userId)) return prev;
        return { ...prev, __memberStatus: updatedStatus };
      });
    } catch (err) {
      console.error("Error updating member status:", err);
      alert("Failed to update member status ❌");
    }
  };

  // ===================== UI STATES =====================
  if (loading) {
    return (
      <div className="mcExploreWrap">
        <div className="mcExploreContainer">
          <div className="mcMuted">Loading members…</div>
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

  const statusFilterLabel =
    STATUS_FILTER_OPTIONS.find((o) => o.key === statusFilter)?.label ?? "—";

  const activeSortOption =
    SORT_OPTIONS.find((o) => o.key === sortBy) || SORT_OPTIONS[0];

  return (
    <div className="mcExploreWrap">
      <div className="mcExploreContainer">
        {/* ✅ Modal montado UNA vez */}
        <ModalViewUser user={selectedUser} institutionId={institutionId} />

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
              placeholder="Search members by name or email..."
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
              member{filteredOrdered.length !== 1 ? "s found" : " is found"}
            </span>
          </div>

          {/* Sort */}
          <div className="mcSortWrap dropdown">
            <button
              className="mcSortBtn"
              type="button"
              data-bs-toggle="dropdown"
              data-bs-display="static"
              aria-expanded="false"
              title="Sort"
            >
              <span className="mcSortIcon" aria-hidden="true">
                {activeSortOption.icon}
              </span>
              <span className="mcSortLabelDesktop">{activeSortOption.label}</span>
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

          {/* Filter status */}
          <div className="mcSortWrap dropdown">
            <button
              className="mcSortBtn"
              type="button"
              data-bs-toggle="dropdown"
              data-bs-display="static"
              aria-expanded="false"
              title="Filter"
            >
              <span className="mcSortIcon" aria-hidden="true">
                <Funnel size={18} />
              </span>
              <span className="mcSortLabelDesktop">Filter: {statusFilterLabel}</span>
            </button>

            <ul className="dropdown-menu dropdown-menu-end mcDropdownMenu">
              {STATUS_FILTER_OPTIONS.map((opt) => (
                <li key={opt.key}>
                  <button
                    className={`dropdown-item ${statusFilter === opt.key ? "active" : ""}`}
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

        {/* ===================== GRID ===================== */}
        <section className="mcResults">
          <div className="mcCardsGrid mcCardsGrid3 mcMembersGrid">
            {pageItems.map((u, idx) => {
              const uid = String(getUserId(u) ?? "");
              const name = getUserDisplayName(u);
              const email = safeStr(u?.email) || "—";
              const imgSrc = u?.imgUrl || null;

              const thesisCount = countUserTheses(theses, uid);

              const rawStatus = normalizeStatus(u?.__memberStatus || "PENDING");
              const tone = getTone(rawStatus);
              const statusLabel = getStatusLabel(rawStatus);

              const chip = getStatusChip(rawStatus);
              const StatusIcon = chip.Icon;

              const rowKey = `${uid}-${start + idx}`;

              return (
                <article key={rowKey} className={`mcCard mcMemberCard ${tone}`}>
                  <div className="mcCardHeadClip">
                    <div className={`mcCardBar mcCardBar--${tone}`} />
                    <div className="mcCardTop">
                      <div className="mcStatus">
                        <span className={`mcStatusDot ${tone}`} />
                        <span className="mcStatusLabel">{statusLabel}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mcCardBody mcCardBodyMember">
                    <div className="mcInstTitleRow d-flex align-items-center">
                      <span className="mcInstTitleIcon" aria-hidden="true">
                        {imgSrc ? (
                          <img
                            src={imgSrc}
                            alt="Member avatar"
                            width="80"
                            height="80"
                            style={{
                              width: 80,
                              height: 80,
                              objectFit: "cover",
                              borderRadius: 14,
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: 80,
                              height: 80,
                              borderRadius: 14,
                              background: "#1b1b1b",
                              display: "grid",
                              placeItems: "center",
                              color: "#9aa0a6",
                              fontSize: 12,
                            }}
                          >
                            Photo
                          </div>
                        )}
                      </span>

                      <div className="mcCardBody mcCardBodyMember">
                        <h3 className="mcCardTitle" title={name}>
                          {name}
                        </h3>

                        <div className="mcMemberEmailInline">
                          <div className="mcCardAuthors mcMetaRow" title={uid}>
                            <span className="mcMetaIcon" aria-hidden="true">
                              <IdCard size={18} />
                            </span>
                            <span className="mcMetaText">{uid || "—"}</span>
                          </div>

                          <div className="mcCardAuthors mcMetaRow" title={email}>
                            <span className="mcMetaIcon" aria-hidden="true">
                              <Mail size={18} />
                            </span>
                            <span className="mcMetaText">{email || "—"}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mcCardDivider" />

                    <div className="mcCardFooter">
                      <div className="mcMetrics">
                        <span className="mcMetric">
                          <span className="mcMetricIcon" aria-hidden="true">
                            <BookMarked size={18} />
                          </span>
                          <span className="mcMetricVal">{thesisCount}</span>
                          <span className="mcMetricLbl">theses</span>
                        </span>
                      </div>

                      <div className="mcActions">
                        {/* ✅ AQUÍ ahora abre el modal */}
                        <button
                          type="button"
                          className="mcIconBtn"
                          title="View"
                          onClick={() => handleView(u)}
                        >
                          <Eye size={18} />
                        </button>

                        {/* Dropdown status */}
                        <div className="dropdown">
                          <button
                            type="button"
                            className={`mcStatusChip ${chip.toneClass}`}
                            data-bs-toggle="dropdown"
                            data-bs-display="static"
                            aria-expanded="false"
                            title="Change status"
                          >
                            <StatusIcon size={18} />
                            <span className="mcStatusChipCaret" aria-hidden="true">
                              <ChevronDown size={16} />
                            </span>
                          </button>

                          <ul className="dropdown-menu dropdown-menu-end mcDropdownMenu">
                            {STATUS_CHANGE_OPTIONS.map((opt) => {
                              const isCurrent =
                                normalizeStatus(opt.key) === normalizeStatus(rawStatus);

                              return (
                                <li key={opt.key}>
                                  <button
                                    type="button"
                                    className={`dropdown-item ${isCurrent ? "active" : ""}`}
                                    onClick={() => handleChangeMemberStatus(uid, opt.key)}
                                    disabled={isCurrent}
                                  >
                                    {opt.label}
                                  </button>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}

            {pageItems.length === 0 && <div className="mcMuted">No members found.</div>}
          </div>

          {/* ===================== PAGER ===================== */}
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

// ===================== Page: ListMember =====================
const ListMember = () => {
  return (
    <div className="d-flex" style={{ minHeight: "100vh" }}>
      <NavbarReal />

      <div className="flex-grow-1">
        <Layout showBackDashboard title="Members List" icon={<Users />}>
          <MembersSearch />
        </Layout>
      </div>
    </div>
  );
};

export default ListMember;