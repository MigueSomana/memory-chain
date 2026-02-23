// ListMember.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import NavbarReal from "../../components/navbar/NavbarReal";
import Layout from "../../components/layout/LayoutPrivado";
import axios from "axios";
import { getAuthToken, getAuthInstitution } from "../../utils/authSession";
import ModalViewUser from "../../components/modal/ModalViewUser";
import { useToast } from "../../utils/toast";

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
  OctagonAlert,
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
const normalizeStatus = (s) => String(s || "").trim().toUpperCase();
const words = (s) =>
  String(s || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

const compactWithInitials = (raw) => {
  const parts = words(raw);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0];

  const first = parts[0];
  const rest = parts
    .slice(1)
    .map((w) => (w ? `${w[0].toUpperCase()}.` : ""))
    .filter(Boolean)
    .join(" ");

  return `${first} ${rest}`.trim();
};

// ✅ Nombre primero, Apellido después
function getUserDisplayName(u) {
  const name = compactWithInitials(u?.name);
  const lastname = compactWithInitials(u?.lastname);
  return `${name} ${lastname}`.trim() || "User";
}

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

// robust id
function getAnyId(v) {
  if (!v) return null;
  if (typeof v === "string") return v;
  if (typeof v === "object" && v.$oid) return String(v.$oid);
  if (typeof v === "object" && v._id) return getAnyId(v._id);
  if (typeof v === "object" && v.id) return String(v.id);
  return null;
}

function getUserId(u) {
  return getAnyId(u?._id) || getAnyId(u?.id) || null;
}

// educationalEmails[{institution,email?,status}]
function getMemberStatusFromUser(u, institutionId) {
  const edu = Array.isArray(u?.educationalEmails) ? u.educationalEmails : [];
  for (const entry of edu) {
    const instId = getAnyId(entry?.institution);
    if (instId && String(instId) === String(institutionId)) {
      return normalizeStatus(entry?.status || "PENDING");
    }
  }
  return "";
}

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

const statusLabelForToast = (s) => {
  const up = normalizeStatus(s);
  if (up === "APPROVED" || up === "VERIFIED") return "Approved";
  if (up === "REJECTED") return "Rejected";
  if (up === "PENDING") return "Pending";
  return up || "—";
};

// ✅ actualiza educationalEmails en memoria para que el modal refresque
function patchEducationalEmails(userObj, institutionId, nextStatus) {
  const u = userObj || {};
  const edu = Array.isArray(u.educationalEmails) ? [...u.educationalEmails] : [];

  const idx = edu.findIndex((e) => {
    const instId = getAnyId(e?.institution);
    return instId && String(instId) === String(institutionId);
  });

  if (idx >= 0) {
    edu[idx] = { ...edu[idx], status: normalizeStatus(nextStatus) };
  } else {
    edu.push({ institution: institutionId, status: normalizeStatus(nextStatus) });
  }

  return { ...u, educationalEmails: edu };
}

// ✅ CERRAR DROPDOWN DE BOOTSTRAP MANUALMENTE
function closeBootstrapDropdownFromEvent(e) {
  try {
    const root =
      e?.currentTarget?.closest?.(".dropdown") ||
      e?.target?.closest?.(".dropdown");
    if (!root) return;

    const toggle =
      root.querySelector('[data-bs-toggle="dropdown"]') ||
      root.querySelector(".dropdown-toggle");

    const DropCtor = window?.bootstrap?.Dropdown;
    if (!toggle || !DropCtor) return;

    const instance = DropCtor.getOrCreateInstance(toggle);
    instance?.hide?.();
  } catch (err) {
    console.warn("Could not close dropdown", err);
  }
}

// Count theses where user appears as author OR uploadedBy
function countUserTheses(theses, userId) {
  const uid = String(userId || "");
  if (!uid) return 0;

  let c = 0;
  for (const t of theses) {
    const upId = getAnyId(t?.uploadedBy) || getAnyId(t?.uploadBy);
    const matchUploadedBy = upId && String(upId) === uid;

    const authors = Array.isArray(t?.authors) ? t.authors : [];
    let matchAuthor = false;
    for (const a of authors) {
      if (typeof a === "string") continue;
      const aid = getAnyId(a?._id) || getAnyId(a?.id);
      if (aid && String(aid) === uid) {
        matchAuthor = true;
        break;
      }
    }

    if (matchUploadedBy || matchAuthor) c += 1;
  }
  return c;
}

// Open bootstrap modal by id
function openBootstrapModalById(id) {
  try {
    const el = document.getElementById(id);
    if (!el) return false;
    const ModalCtor = window?.bootstrap?.Modal;
    if (ModalCtor) {
      const instance = ModalCtor.getOrCreateInstance(el, {
        backdrop: "static",
        keyboard: false,
      });
      instance.show();
      return true;
    }
    return false;
  } catch (e) {
    console.warn("Could not open modal:", e);
    return false;
  }
}

// ===================== COMPONENT: MembersSearch =====================
const MembersSearch = () => {
  const token = useMemo(() => getAuthToken(), []);
  const sessionInst = useMemo(() => getAuthInstitution(), []);
  const institutionId = useMemo(() => getCurrentInstitutionId(), []);

  const { showToast } = useToast();

  const [members, setMembers] = useState([]);
  const [theses, setTheses] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("name_az");
  const [statusFilter, setStatusFilter] = useState("all");

  const [page, setPage] = useState(1);
  const pageSize = 12;

  // Modal
  const [selectedUser, setSelectedUser] = useState(null);

  // ✅ canVerify gating
  const [canVerify, setCanVerify] = useState(false);
  const [verifyChecked, setVerifyChecked] = useState(false);

  // ======= fetch helper (para refetch post-update) =======
  const refetchMembersOnly = useCallback(async () => {
    if (!token || !institutionId) return;
    const headers = { Authorization: `Bearer ${token}` };

    const usersRes = await axios.get(`${API_BASE_URL}/api/users`, { headers });
    const usersData = Array.isArray(usersRes.data) ? usersRes.data : [];

    const filteredMembers = usersData
      .map((u) => {
        const st = getMemberStatusFromUser(u, institutionId);
        return st ? { ...u, __memberStatus: st } : null;
      })
      .filter(Boolean);

    setMembers(filteredMembers);

    // ✅ si el modal está abierto, refrescamos el user del modal con el nuevo objeto
    setSelectedUser((prev) => {
      if (!prev) return prev;
      const pid = String(getUserId(prev) ?? "");
      if (!pid) return prev;
      const fresh = filteredMembers.find((m) => String(getUserId(m) ?? "") === pid);
      return fresh || prev;
    });
  }, [token, institutionId]);

  // ===================== 1) CHECK canVerify =====================
  useEffect(() => {
    const check = async () => {
      try {
        setVerifyChecked(false);

        const localCan =
          !!sessionInst?.canVerify ||
          !!sessionInst?.can_verify ||
          !!sessionInst?.canVerifyMembership;

        if (localCan) {
          setCanVerify(true);
          return;
        }

        if (institutionId) {
          try {
            const res = await axios.get(
              `${API_BASE_URL}/api/institutions/${institutionId}`,
            );
            const inst = res.data || null;

            const ok =
              !!inst?.canVerify ||
              !!inst?.can_verify ||
              !!inst?.canVerifyMembership;

            setCanVerify(!!ok);
          } catch (e) {
            console.error("Error fetching institution for canVerify:", e);
            setCanVerify(false);
          }
        } else {
          setCanVerify(false);
        }
      } finally {
        setVerifyChecked(true);
      }
    };

    check();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [institutionId]);

  // ===================== LOAD MEMBERS + THESES =====================
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

        const usersRes = await axios.get(`${API_BASE_URL}/api/users`, { headers });
        const usersData = Array.isArray(usersRes.data) ? usersRes.data : [];

        const thesesRes = await axios.get(`${API_BASE_URL}/api/theses`, { headers });
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

  const pageItems = useMemo(
    () => filteredOrdered.slice(start, start + pageSize),
    [filteredOrdered, start],
  );

  const pagesArray = useMemo(
    () => Array.from({ length: totalPages }, (_, i) => i + 1),
    [totalPages],
  );

  const go = (p) => setPage(p);

  // ===================== ACTIONS =====================
  const handleView = (member) => {
    setSelectedUser(member);
    openBootstrapModalById("modalViewUser");
  };

  // PATCH /api/users/:userId/educational-status  body: { institutionId, status }
  const handleChangeMemberStatus = useCallback(
    async (e, userId, newStatus) => {
      // ✅ cerrar dropdown de una vez (antes del async)
      closeBootstrapDropdownFromEvent(e);

      if (!token || !institutionId) return;
      if (!canVerify) return;

      const uid = String(userId || "");
      const prevMember = members.find((m) => String(getUserId(m) || "") === uid);
      const prevStatus = prevMember?.__memberStatus || "PENDING";

      // ✅ Optimistic update
      setMembers((prev) =>
        prev.map((u) => {
          const id = String(getUserId(u) || "");
          if (id !== uid) return u;
          const patched = patchEducationalEmails(u, institutionId, newStatus);
          return { ...patched, __memberStatus: normalizeStatus(newStatus) };
        }),
      );

      setSelectedUser((prev) => {
        if (!prev) return prev;
        const pid = String(getUserId(prev) || "");
        if (pid !== uid) return prev;
        const patched = patchEducationalEmails(prev, institutionId, newStatus);
        return { ...patched, __memberStatus: normalizeStatus(newStatus) };
      });

      try {
        const headers = { Authorization: `Bearer ${token}` };

        const res = await axios.patch(
          `${API_BASE_URL}/api/users/${uid}/educational-status`,
          { institutionId, status: newStatus },
          { headers },
        );

        const updatedStatus = normalizeStatus(
          res?.data?.updated?.status || res?.data?.status || newStatus,
        );

        setMembers((prev) =>
          prev.map((u) => {
            const id = String(getUserId(u) || "");
            if (id !== uid) return u;
            const patched = patchEducationalEmails(u, institutionId, updatedStatus);
            return { ...patched, __memberStatus: updatedStatus };
          }),
        );

        setSelectedUser((prev) => {
          if (!prev) return prev;
          const pid = String(getUserId(prev) || "");
          if (pid !== uid) return prev;
          const patched = patchEducationalEmails(prev, institutionId, updatedStatus);
          return { ...patched, __memberStatus: updatedStatus };
        });

        showToast({
          message: `Member status: ${statusLabelForToast(prevStatus)} → ${statusLabelForToast(
            updatedStatus,
          )}`,
          type: "success",
          icon: BadgeCheck,
          duration: 2200,
        });

        await refetchMembersOnly();
      } catch (err) {
        console.error("Error updating member status:", err);

        try {
          await refetchMembersOnly();
        } catch {}

        const msg =
          err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          "Failed to update member status";

        showToast({
          message: msg,
          type: "error",
          icon: OctagonAlert,
          duration: 2400,
        });
      }
    },
    [token, institutionId, canVerify, members, showToast, refetchMembersOnly],
  );

  // ===================== UI STATES =====================
  if (!verifyChecked) {
    return (
      <div className="mcExploreWrap">
        <div className="mcExploreContainer">
          <div className="mcMuted">Checking verification…</div>
        </div>
      </div>
    );
  }

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
        <ModalViewUser user={selectedUser} institutionId={institutionId} />

        <div className="mb-3">
          {canVerify ? (
            <div className="alert border-0 mcDashBanner mcDashBanner--ok" role="alert">
              <span className="mx-2">
                <BadgeCheck />
              </span>
              Your institution is <strong>verified</strong>. You can manage member roles.
            </div>
          ) : (
            <div className="alert border-0 mcDashBanner mcDashBanner--bad" role="alert">
              <span className="mx-2">
                <OctagonAlert />
              </span>
              Your institution is <strong>not verified</strong>. You can’t modify member roles.
            </div>
          )}
        </div>

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
                        <button
                          type="button"
                          className="mcIconBtn"
                          title="View"
                          onClick={() => handleView(u)}
                        >
                          <Eye size={18} />
                        </button>

                        {canVerify ? (
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
                                      onClick={(e) =>
                                        handleChangeMemberStatus(e, uid, opt.key)
                                      }
                                      disabled={isCurrent}
                                    >
                                      {opt.label}
                                    </button>
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}

            {pageItems.length === 0 && <div className="mcMuted">No members found.</div>}
          </div>

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