import React, { useEffect, useMemo, useState } from "react";
import NavbarReal from "../../components/navbar/NavbarReal";
import Layout from "../../components/layout/LayoutPrivado";
import axios from "axios";
import { getAuthToken } from "../../utils/authSession";
import { CheckCircle, TimeCircle, CrossCircle } from "../../utils/icons";

// ===================== Configuración base =====================
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

// ===================== SORT OPTIONS =====================
const SORT_OPTIONS = [
  { key: "name_az", label: "Name A–Z" },
  { key: "name_za", label: "Name Z–A" },
  { key: "approved_most", label: "Most approved" },
  { key: "pending_most", label: "Most pending" },
  { key: "rejected_most", label: "Most rejected" },
];

// ===================== Helpers =====================
const safeStr = (v) => String(v ?? "").trim();
const normalizeStatus = (s) => String(s || "").toUpperCase(); // APPROVED / PENDING / REJECTED

function formatJoined(dateIso) {
  if (!dateIso) return "—";
  try {
    const d = new Date(dateIso);
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "2-digit",
    });
  } catch {
    return String(dateIso);
  }
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

function getUserDisplayName(u) {
  const name = safeStr(u?.name);
  const lastname = safeStr(u?.lastname);
  return safeStr(`${name} ${lastname}`).trim() || "User";
}
function getUserId(u) {
  return u?._id || u?.id || null;
}

// ===================== Componente principal: MembersSearch =====================
const MembersSearch = () => {
  const token = getAuthToken();

  const [users, setUsers] = useState([]);
  const [statusCountsByUser, setStatusCountsByUser] = useState({});
  // shape: { [userId]: { APPROVED: n, PENDING: n, REJECTED: n } }

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("name_az");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const institutionId = useMemo(() => getCurrentInstitutionId(), []);

  useEffect(() => {
    const fetchUsersAndCounts = async () => {
      try {
        setLoading(true);
        setLoadError("");

        if (!token) {
          setUsers([]);
          setLoadError("You must be logged in to view members.");
          return;
        }

        if (!institutionId) {
          setUsers([]);
          setLoadError("No institution selected (missing institutionId).");
          return;
        }

        const headers = { Authorization: `Bearer ${token}` };

        // 1) Usuarios
        const usersRes = await axios.get(`${API_BASE_URL}/api/users`, {
          headers,
        });
        const usersData = Array.isArray(usersRes.data) ? usersRes.data : [];
        setUsers(usersData);

        // 2) Tesis (conteo por uploadedBy dentro de esta institución)
        const thesesRes = await axios.get(`${API_BASE_URL}/api/theses`, {
          headers,
        });
        const theses = Array.isArray(thesesRes.data) ? thesesRes.data : [];

        const counts = {};

        for (const t of theses) {
          const instField = t?.institution;
          const instId =
            typeof instField === "string"
              ? instField
              : instField?._id
              ? String(instField._id)
              : null;

          if (!instId || String(instId) !== String(institutionId)) continue;

          const uploadedBy = t?.uploadedBy;
          const userId =
            typeof uploadedBy === "string"
              ? uploadedBy
              : uploadedBy?._id
              ? String(uploadedBy._id)
              : null;

          if (!userId) continue;

          const status = normalizeStatus(t?.status);
          if (!counts[userId]) counts[userId] = { APPROVED: 0, PENDING: 0, REJECTED: 0 };

          if (status === "APPROVED") counts[userId].APPROVED += 1;
          else if (status === "PENDING") counts[userId].PENDING += 1;
          else if (status === "REJECTED") counts[userId].REJECTED += 1;
        }

        setStatusCountsByUser(counts);
      } catch (err) {
        console.error("Error loading members:", err);
        setLoadError("Error loading members. Please try again later.");
        setUsers([]);
        setStatusCountsByUser({});
      } finally {
        setLoading(false);
      }
    };

    fetchUsersAndCounts();
  }, [token, institutionId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return users.filter((u) => {
      const name = getUserDisplayName(u).toLowerCase();
      const email = safeStr(u?.email).toLowerCase();
      return !q || name.includes(q) || email.includes(q);
    });
  }, [users, query]);

  const getCounts = (userId) => {
    const c = statusCountsByUser[userId];
    return {
      approved: c?.APPROVED ?? 0,
      pending: c?.PENDING ?? 0,
      rejected: c?.REJECTED ?? 0,
    };
  };

  const filteredOrdered = useMemo(() => {
    const arr = [...filtered];

    arr.sort((a, b) => {
      const nameA = getUserDisplayName(a).toLowerCase();
      const nameB = getUserDisplayName(b).toLowerCase();
      const nameCmp = nameA.localeCompare(nameB);

      const idA = String(getUserId(a) ?? "");
      const idB = String(getUserId(b) ?? "");
      const idCmp = idA.localeCompare(idB);

      const ca = getCounts(idA);
      const cb = getCounts(idB);

      switch (sortBy) {
        case "name_az":
          if (nameCmp !== 0) return nameCmp;
          return idCmp;
        case "name_za":
          if (nameCmp !== 0) return -nameCmp;
          return idCmp;
        case "approved_most":
          if (cb.approved !== ca.approved) return cb.approved - ca.approved;
          if (nameCmp !== 0) return nameCmp;
          return idCmp;
        case "pending_most":
          if (cb.pending !== ca.pending) return cb.pending - ca.pending;
          if (nameCmp !== 0) return nameCmp;
          return idCmp;
        case "rejected_most":
          if (cb.rejected !== ca.rejected) return cb.rejected - ca.rejected;
          if (nameCmp !== 0) return nameCmp;
          return idCmp;
        default:
          return 0;
      }
    });

    return arr;
  }, [filtered, sortBy, statusCountsByUser]);

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

  if (loading) {
    return (
      <div className="container py-2">
        <div className="text-muted">Loading members…</div>
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

  return (
    <div className="container py-2 mc-members-page">
      {/* Top bar: Search + Sort */}
      <div className="row g-3 align-items-center mb-3">
        <div className="col-lg-8">
          <div className="d-flex gap-2">
            <input
              className="form-control"
              placeholder="Search members by name or email…"
              value={query}
              onChange={(e) => {
                setPage(1);
                setQuery(e.target.value);
              }}
            />

            <div className="dropdown mc-sort mc-select">
              <button
                className="btn btn-outline-secondary dropdown-toggle"
                type="button"
                data-bs-toggle="dropdown"
                aria-expanded="false"
              >
                Sort by: {SORT_OPTIONS.find((o) => o.key === sortBy)?.label ?? "—"}
              </button>

              <ul className="dropdown-menu dropdown-menu-end mc-select">
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
        </div>

        <div className="col-lg-4 text-lg-end">
          <span className="text-muted">
            {filteredOrdered.length} result{filteredOrdered.length !== 1 ? "s" : ""} · Page {currentPage} of{" "}
            {totalPages}
          </span>
        </div>
      </div>

      {/* List */}
      <div className="d-flex flex-column gap-3">
        {pageItems.map((u, idx) => {
          const userId = String(getUserId(u) ?? "");
          const name = getUserDisplayName(u);
          const email = safeStr(u?.email) || "—";
          const joined = formatJoined(u?.createdAt);

          const imgSrc = u?.imgUrl || null;
          const c = getCounts(userId);

          return (
            <div
              key={`${userId}-${start + idx}`}
              className="card mc-thesis-card mc-member-card shadow-sm"
            >
              <div className="card-body d-flex align-items-start gap-3 mc-thesis-card-body">
                {/* Avatar (mismo estilo thumbnail) */}
                <div className="mc-thumb d-flex align-items-center justify-content-center">
                  {imgSrc ? (
                    <img
                      src={imgSrc}
                      alt={name}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    <div className="small text-muted">No photo</div>
                  )}
                </div>

                {/* Main info */}
                <div className="flex-grow-1" style={{ minWidth: 0 }}>
                  <h5 className="m-0 mc-thesis-title">{name}</h5>

                  <div className="text-muted small mt-1">
                    <span className="mc-label-muted">Email:</span>{" "}
                    <span className="fw-semibold">{email}</span>
                  </div>

                  <div className="text-muted small">
                    <span className="mc-label-muted">Joined:</span>{" "}
                    <span className="fw-semibold">{joined}</span>
                  </div>
                </div>

                {/* Stats / Actions (igual a las acciones de tesis, a la derecha) */}
                <div className="d-flex align-items-center gap-2 ms-auto">
                  <button
                    type="button"
                    className="btn btn-memory d-flex align-items-center gap-1"
                    title="Approved"
                  >
                    {CheckCircle}
                    <span className="fw-semibold">{c.approved}</span>
                  </button>

                  <button
                    type="button"
                    className="btn btn-warning d-flex align-items-center gap-1"
                    title="Pending"
                  >
                    {TimeCircle}
                    <span className="fw-semibold t-white">{c.pending}</span>
                  </button>

                  <button
                    type="button"
                    className="btn btn-danger d-flex align-items-center gap-1"
                    title="Rejected"
                  >
                    {CrossCircle}
                    <span className="fw-semibold">{c.rejected}</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {pageItems.length === 0 && <div className="text-muted">No members found.</div>}

        {/* Pagination */}
        <nav aria-label="Members pagination" className="mt-3 d-flex justify-content-center">
          <ul className="pagination mc-pagination">
            <li className={`page-item ${currentPage === 1 ? "disabled" : ""}`}>
              <button className="page-link" onClick={() => go(1)} type="button">
                First
              </button>
            </li>

            {pagesArray.map((p) => (
              <li key={`p-${p}`} className={`page-item ${p === currentPage ? "active" : ""}`}>
                <button className="page-link" onClick={() => go(p)} type="button">
                  {p}
                </button>
              </li>
            ))}

            <li className={`page-item ${currentPage === totalPages ? "disabled" : ""}`}>
              <button className="page-link" onClick={() => go(totalPages)} type="button">
                Last
              </button>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  );
};

// ===================== Página: ListMember =====================
const ListMember = () => {
  return (
    <div className="d-flex" style={{ minHeight: "100vh", background: "#f6f7f9" }}>
      <NavbarReal />

      <div className="flex-grow-1">
        <Layout
          showBackDashboard
          title="Members List"
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="currentColor"
              className="nav-icon"
              viewBox="0 0 16 16"
            >
              <path d="M7 14s-1 0-1-1 1-4 5-4 5 3 5 4-1 1-1 1zm4-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6m-5.784 6A2.24 2.24 0 0 1 5 13c0-1.355.68-2.75 1.936-3.72A6.3 6.3 0 0 0 5 9c-4 0-5 3-5 4s1 1 1 1zM4.5 8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5" />
            </svg>
          }
        >
          <MembersSearch />
        </Layout>
      </div>
    </div>
  );
};

export default ListMember;
