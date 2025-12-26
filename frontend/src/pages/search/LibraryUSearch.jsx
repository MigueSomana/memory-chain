import React, { useMemo, useState, useEffect } from "react";
import axios from "axios";
import { getAuthToken, getAuthInstitution } from "../../utils/authSession";
import {
  EyeFillIcon,
  HeartFill,
  KeyPermission,
  CheckCircle,
  CrossCircle,
  TimeCircle,
  InboxMin,
  AlertDanger,
} from "../../utils/icons";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";
const gateway = import.meta.env.VITE_PINATA_GATEWAY_DOMAIN;

const SORT_OPTIONS = [
  { key: "recent", label: "Most recent" },
  { key: "oldest", label: "Oldest" },
  { key: "title_az", label: "Title A–Z" },
  { key: "title_za", label: "Title Z–A" },
];

const STATUS_FILTER_OPTIONS = [
  { key: "all", label: "All" },
  { key: "APPROVED", label: "Approved" },
  { key: "PENDING", label: "Pending" },
  { key: "REJECTED", label: "Rejected" },
];

const STATUS_CHANGE_OPTIONS = [
  { key: "PENDING", label: "Pending" },
  { key: "REJECTED", label: "Rejected" },
  { key: "APPROVED", label: "Verified" },
];

const getInstitutionName = (thesis) => {
  const inst = thesis?.institution;
  if (!inst) return "";
  if (typeof inst === "string") return inst;
  return inst?.name || "";
};

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

function getStatusUI(statusRaw) {
  const status = String(statusRaw || "").toUpperCase();

  if (status === "APPROVED") {
    return {
      btnClass: "btn btn-memory",
      icon: CheckCircle,
      label: "Verified",
      value: "APPROVED",
      disabled: true, // no cambiar si está aprobado (como pediste)
    };
  }

  if (status === "REJECTED") {
    return {
      btnClass: "btn btn-danger",
      icon: CrossCircle,
      label: "Rejected",
      value: "REJECTED",
      disabled: false,
    };
  }

  return {
    btnClass: "btn btn-warning",
    icon: TimeCircle,
    label: "Pending",
    value: "PENDING",
    disabled: false,
  };
}

const LibraryUSearch = () => {
  const token = useMemo(() => getAuthToken(), []);
  const authInst = useMemo(() => getAuthInstitution(), []);

  const [theses, setTheses] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // Search + filtros
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("recent");
  const [statusFilter, setStatusFilter] = useState("all");

  // Paginación
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // --- CARGA: theses de la institución logueada ---
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
          headers ? { headers } : undefined
        );

        const data = Array.isArray(res.data) ? res.data : [];
        const mapped = data.map((t) => ({
          ...t,
          likes: Number(t.likes ?? 0),
        }));
        setTheses(mapped);
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

  // ---------- FILTRADO (Search + Status FILTER) ----------
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const selectedStatus = String(statusFilter || "all").toUpperCase();

    return theses.filter((t) => {
      const instName = getInstitutionName(t);
      const authorsSearch = buildAuthorsSearchString(t.authors);
      const keywordsSearch = Array.isArray(t.keywords)
        ? t.keywords.map((k) => String(k).toLowerCase())
        : [];

      const matchesQ =
        !q ||
        (t.title || "").toLowerCase().includes(q) ||
        authorsSearch.includes(q) ||
        keywordsSearch.some((k) => k.includes(q)) ||
        instName.toLowerCase().includes(q);

      const status = String(t.status || "").toUpperCase();
      const matchesStatus =
        selectedStatus === "ALL" || status === selectedStatus;

      return matchesQ && matchesStatus;
    });
  }, [theses, query, statusFilter]);

  // ---------- ORDEN ----------
  const filteredOrdered = useMemo(() => {
    const arr = [...filtered];

    arr.sort((a, b) => {
      const byTitle = (a.title || "").localeCompare(b.title || "");
      const byId = String(a._id ?? "").localeCompare(String(b._id ?? ""));
      const ya = Number(a.year ?? 0);
      const yb = Number(b.year ?? 0);

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

        default:
          return 0;
      }
    });

    return arr;
  }, [filtered, sortBy]);

  // ---------- PAGINACIÓN ----------
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

  // ---------- HANDLERS ----------
  const handleView = (thesis) => {
    const cid = thesis.ipfsCid;
    if (!cid) {
      alert("This thesis does not have a downloadable file.");
      return;
    }
    const url = `https://${gateway}/ipfs/${cid}#toolbar=0&navpanes=0&scrollbar=0`;
    window.open(url, "_blank");
  };

  const handlePermission = async (thesis) => {
    console.log(thesis);
  };

  // PATCH /api/theses/:id/status
  const handleChangeStatus = async (thesisId, newStatus) => {
    if (!token) return;

    try {
      const headers = { Authorization: `Bearer ${token}` };

      const res = await axios.patch(
        `${API_BASE_URL}/api/theses/${thesisId}/status`,
        { status: newStatus },
        { headers }
      );

      const updated = res?.data?.thesis || res?.data || null;

      setTheses((prev) =>
        prev.map((t) =>
          t._id === thesisId
            ? { ...t, status: updated?.status ?? newStatus }
            : t
        )
      );
    } catch (err) {
      console.error("Error updating thesis status:", err);
      alert("Failed to update status ❌");
    }
  };

  // ---------- RENDER ----------
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
              <i>The institution currently has no theses added.</i>
            </h3>
          </div>
        </div>
      </div>
    );
  }
  const canVerify = !!authInst?.canVerify; // true/false seguro
  const statusFilterLabel =
    STATUS_FILTER_OPTIONS.find((o) => o.key === statusFilter)?.label ?? "—";

  return (
    <div className="container py-2">
      {/* Search + Status + Sort (MISMA LINEA, DROPDOWNS) */}
      {!canVerify && (
        <div className="row">
          <div className="col-12">
            <div
              className="alert alert-danger d-flex align-items-center gap-2"
              role="alert"
            >
              {AlertDanger}
              <div>
                {" "}
                Please activate your membership in order to certify those of
                your institution.
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="row g-3 align-items-center mb-3">
        <div className="col-12">
          <div
            className="d-flex gap-2 align-items-center flex-wrap"
            style={{ overflow: "visible" }}
          >
            {/* Search */}
            <input
              className="form-control"
              placeholder="Search theses by title, author, keyword or institution…"
              value={query}
              onChange={(e) => {
                setPage(1);
                setQuery(e.target.value);
              }}
              style={{ minWidth: 260, flex: "1 1 260px" }}
            />

            {/* Status FILTER dropdown (mismo estilo bootstrap, con mc-sort) */}
            <div className="dropdown mc-sort" style={{ position: "relative" }}>
              <button
                className="btn btn-outline-secondary dropdown-toggle"
                type="button"
                data-bs-toggle="dropdown"
                aria-expanded="false"
              >
                Status: {statusFilterLabel}
              </button>

              <ul className="dropdown-menu dropdown-menu-end">
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

            {/* Sort dropdown (EXACTAMENTE como tu ejemplo, con mc-sort) */}
            <div className="dropdown mc-sort" style={{ position: "relative" }}>
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
                      type="button"
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

            {/* Counter */}
            <div className="ms-auto text-nowrap">
              <span className="text-muted">
                {filteredOrdered.length} result
                {filteredOrdered.length !== 1 ? "s" : ""} · Page {currentPage}{" "}
                of {totalPages}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* LIST */}
      <div className="row">
        <div className="col-12 d-flex flex-column gap-3">
          {pageItems.map((t, idx) => {
            const rowKey = `${t._id}-${start + idx}`;
            const instName = getInstitutionName(t);

            const statusUI = getStatusUI(t.status);

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

                  {/* ACTIONS */}
                  <div className="d-flex flex-column gap-2">
                    {/* FILA 1 */}
                    <div className="d-flex align-items-center gap-2">
                      <button
                        type="button"
                        className="btn btn-memory"
                        title="View"
                        onClick={() => handleView(t)}
                      >
                        {EyeFillIcon}
                      </button>

                      <a
                        href={`http://localhost:3000/update/${t._id}`}
                        type="button"
                        className="btn btn-warning"
                        title="Permission"
                        onClick={() => handlePermission(t)}
                      >
                        {KeyPermission}
                      </a>

                      {/* Likes visibles, NO clickeables, HeartFill SIEMPRE */}
                      <button
                        type="button"
                        className="btn btn-danger btn-fix-like d-flex align-items-center gap-1"
                        title="Likes"
                        disabled
                        style={{ opacity: 1, cursor: "default" }}
                      >
                        {HeartFill}
                        <span className="fw-semibold">{t.likes ?? 0}</span>
                      </button>
                    </div>

                    {/* FILA 2: SOLO si la institución puede verificar */}
                    {canVerify && (
                      <div className="dropdown">
                        <button
                          type="button"
                          className={`${statusUI.btnClass} w-100 d-flex align-items-center justify-content-center gap-2 dropdown-toggle droptoogle-fix`}
                          data-bs-toggle="dropdown"
                          aria-expanded="false"
                          disabled={statusUI.disabled}
                          title={
                            statusUI.disabled
                              ? "Status locked (Verified)"
                              : "Change status"
                          }
                        >
                          {statusUI.icon}
                          <span className="fw-semibold t-white">
                            {statusUI.label}
                          </span>
                        </button>

                        {!statusUI.disabled && (
                          <ul className="dropdown-menu w-100">
                            {STATUS_CHANGE_OPTIONS.map((opt) => {
                              const isCurrent = opt.key === statusUI.value;
                              return (
                                <li key={opt.key}>
                                  <button
                                    type="button"
                                    className={`dropdown-item ${
                                      isCurrent ? "active" : ""
                                    }`}
                                    onClick={() =>
                                      handleChangeStatus(t._id, opt.key)
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
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

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
    </div>
  );
};

export default LibraryUSearch;
