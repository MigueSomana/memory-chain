import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { getAuthToken, getIdUser } from "../../utils/authSession";
import {
  MetricTableIcon,
  LikeTableIcon,
  AproveTableIcon,
  HeartFill,
  StatusIcon,
  HeartIcon,
} from "../../utils/icons";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

const safeNum = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const normalizeStatus = (s) => String(s || "").toUpperCase();

const renderIcon = (icon, size = 40) => {
  if (React.isValidElement(icon)) {
    return React.cloneElement(icon, {
      style: { width: size, height: size, ...icon.props?.style },
    });
  }
  return icon;
};

const prettyStatus = (key) => {
  if (key === "APPROVED") return "Approved";
  if (key === "REJECTED") return "Rejected";
  return "Pending";
};

// ===================== Helpers de IDs (robusto) =====================
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

// ✅ institution display seguro (string / object / null)
const getInstitutionName = (thesis) => {
  const inst = thesis?.institution;
  if (!inst) return "";
  if (typeof inst === "string") return inst;
  return inst?.name || "";
};

function getInstitutionUI(thesis) {
  const instName = String(getInstitutionName(thesis) || "").trim();
  const hasInstitution = Boolean(instName);

  return {
    hasInstitution,
    line: hasInstitution
      ? `${instName}${thesis?.department ? ` - ${thesis.department}` : ""}`
      : "Investigación Independiente",
  };
}

// ✅ NUEVO: pertenece al usuario por ID (uploadedBy o authors incluye id)
function thesisBelongsToUser(thesis, userId) {
  if (!userId) return false;

  // 1) dueño real
  const uploadedById = getAnyId(thesis?.uploadedBy);
  if (uploadedById && String(uploadedById) === String(userId)) return true;

  // 2) fallback: authors contiene userId
  const authors = Array.isArray(thesis?.authors) ? thesis.authors : [];
  return authors.some((a) => {
    const aid = getAnyId(a);
    return aid && String(aid) === String(userId);
  });
}

// ✅ helper: recorta títulos largos
const trimLabel = (text, max = 22) => {
  const s = String(text || "").trim();
  if (!s) return "—";
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + "…";
};

const PanelPersonal = () => {
  const token = useMemo(() => getAuthToken(), []);
  const userId = useMemo(() => getIdUser(), []); // ✅ actor=user

  const [theses, setTheses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // ✅ Tabla Status: filtro + paginación micro
  const [statusFilter, setStatusFilter] = useState("ALL"); // ALL | APPROVED | PENDING | REJECTED
  const [tablePage, setTablePage] = useState(1);
  const tablePageSize = 5;

  // ✅ Tabla Likes: orden + paginación micro
  const [likesOrder, setLikesOrder] = useState("DESC"); // ASC | DESC
  const [likesPage, setLikesPage] = useState(1);
  const likesPageSize = 5;

  useEffect(() => {
    const fetchMyTheses = async () => {
      try {
        setLoading(true);
        setLoadError("");

        if (!userId) {
          setTheses([]);
          return;
        }

        // ✅ aquí sí conviene usar token si existe
        const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

        const res = await axios.get(
          `${API_BASE_URL}/api/theses`,
          headers ? { headers } : undefined
        );

        const data = Array.isArray(res.data) ? res.data : [];

        // ✅ NUEVO FILTRO (igual que Library)
        const onlyMine = data.filter((t) => thesisBelongsToUser(t, userId));

        setTheses(onlyMine);
      } catch (err) {
        console.error(err);
        setLoadError("Error loading dashboard data.");
        setTheses([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMyTheses();
  }, [token, userId]);

  // ✅ métricas
  const totalTheses = theses.length;

  const approvedTheses = useMemo(
    () => theses.filter((t) => normalizeStatus(t.status) === "APPROVED").length,
    [theses]
  );

  const totalLikes = useMemo(
    () => theses.reduce((acc, t) => acc + safeNum(t.likes), 0),
    [theses]
  );

  // ✅ conteo por status (donut 1)
  const statusCounts = useMemo(() => {
    let approved = 0;
    let pending = 0;
    let rejected = 0;

    theses.forEach((t) => {
      const st = normalizeStatus(t.status);
      if (st === "APPROVED") approved += 1;
      else if (st === "REJECTED") rejected += 1;
      else pending += 1;
    });

    return { approved, pending, rejected };
  }, [theses]);

  const donutData = useMemo(
    () => [
      { name: "Approved", value: statusCounts.approved, key: "APPROVED" },
      { name: "Pending", value: statusCounts.pending, key: "PENDING" },
      { name: "Rejected", value: statusCounts.rejected, key: "REJECTED" },
    ],
    [statusCounts]
  );

  const donutTotal = useMemo(
    () => donutData.reduce((acc, d) => acc + safeNum(d.value), 0),
    [donutData]
  );

  // ✅ TABLA Status: filtrar por status
  const tableFilteredTheses = useMemo(() => {
    const f = String(statusFilter || "ALL").toUpperCase();
    if (f === "ALL") return theses;
    return theses.filter((t) => normalizeStatus(t.status) === f);
  }, [theses, statusFilter]);

  // ✅ TABLA Status: orden (más reciente primero)
  const tableSortedTheses = useMemo(() => {
    return [...tableFilteredTheses].sort((a, b) => {
      const da = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const db = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return db - da;
    });
  }, [tableFilteredTheses]);

  // ✅ TABLA Status: paginación micro (5)
  const tableTotalPages = useMemo(() => {
    return Math.max(1, Math.ceil(tableSortedTheses.length / tablePageSize));
  }, [tableSortedTheses.length]);

  const tableCurrentPage = Math.min(Math.max(1, tablePage), tableTotalPages);

  useEffect(() => {
    setTablePage(1);
  }, [statusFilter]);

  useEffect(() => {
    if (tablePage > tableTotalPages) setTablePage(tableTotalPages);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableTotalPages]);

  const tablePageItems = useMemo(() => {
    const start = (tableCurrentPage - 1) * tablePageSize;
    const end = start + tablePageSize;
    return tableSortedTheses.slice(start, end);
  }, [tableSortedTheses, tableCurrentPage]);

  const canPrev = tableCurrentPage > 1;
  const canNext = tableCurrentPage < tableTotalPages;

  // ✅ DONUT Likes: Top 3 + Others
  const thesesSortedByLikesDesc = useMemo(() => {
    return [...theses].sort((a, b) => safeNum(b.likes) - safeNum(a.likes));
  }, [theses]);

  const likesTop3DonutData = useMemo(() => {
    if (!thesesSortedByLikesDesc.length) return [];

    const top3 = thesesSortedByLikesDesc.slice(0, 3).map((t, idx) => ({
      key: String(t._id || `TOP_${idx}`),
      name: trimLabel(t.title, 22),
      value: safeNum(t.likes),
    }));

    const othersSum = thesesSortedByLikesDesc
      .slice(3)
      .reduce((acc, t) => acc + safeNum(t.likes), 0);

    const final = [...top3];
    if (othersSum > 0) {
      final.push({
        key: "OTHERS",
        name: "Others",
        value: othersSum,
      });
    }

    return final;
  }, [thesesSortedByLikesDesc]);

  const likesDonutTotal = useMemo(() => {
    return likesTop3DonutData.reduce((acc, d) => acc + safeNum(d.value), 0);
  }, [likesTop3DonutData]);

  // ✅ Tabla Likes: ordenar ASC/DESC por likes
  const likesTableSorted = useMemo(() => {
    const dir = String(likesOrder || "DESC").toUpperCase();
    const sorted = [...theses].sort(
      (a, b) => safeNum(a.likes) - safeNum(b.likes)
    );
    return dir === "ASC" ? sorted : sorted.reverse();
  }, [theses, likesOrder]);

  const likesTotalPages = useMemo(() => {
    return Math.max(1, Math.ceil(likesTableSorted.length / likesPageSize));
  }, [likesTableSorted.length]);

  const likesCurrentPage = Math.min(Math.max(1, likesPage), likesTotalPages);

  useEffect(() => {
    setLikesPage(1);
  }, [likesOrder]);

  useEffect(() => {
    if (likesPage > likesTotalPages) setLikesPage(likesTotalPages);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [likesTotalPages]);

  const likesPageItems = useMemo(() => {
    const start = (likesCurrentPage - 1) * likesPageSize;
    const end = start + likesPageSize;
    return likesTableSorted.slice(start, end);
  }, [likesTableSorted, likesCurrentPage]);

  const likesCanPrev = likesCurrentPage > 1;
  const likesCanNext = likesCurrentPage < likesTotalPages;

  if (loading)
    return <div className="container py-3 text-muted">Loading dashboard…</div>;

  if (loadError) {
    return (
      <div className="container py-3">
        <div className="alert alert-danger">{loadError}</div>
      </div>
    );
  }

  // estilos suaves (NO tocamos, solo sombra en className)
  const cardStyle = { borderRadius: 16, minHeight: 140 };
  const titleStyle = { fontWeight: 700, fontSize: 18, color: "#495057" };
  const iconRow = {
    marginTop: 12,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
  };
  const bigNumber = {
    fontSize: 40,
    fontWeight: 700,
    color: "#212529",
    lineHeight: 1,
  };

  const DONUT_COLORS = {
    APPROVED: "#198754",
    PENDING: "#ffc107",
    REJECTED: "#dc3545",
  };

  // Likes donut palette (4 slices max: 3 + others)
  const LIKES_COLORS = ["#0d6efd", "#20c997", "#6f42c1", "#adb5bd"];

  return (
    <div className="container py-3">
      {/* TOP CARDS */}
      <div className="row g-3">
        <div className="col-12 col-md-6 col-xl-3">
          <a
            href="/my-list-like"
            className="btn btn-danger w-100 mc-card-shadow"
            style={{ ...cardStyle, padding: 16 }}
          >
            <div className="t-white" style={{ fontWeight: 700, fontSize: 18 }}>
              List of Like
            </div>
            <div style={iconRow}>{renderIcon(HeartFill, 45)}</div>
          </a>
        </div>

        <div className="col-12 col-md-6 col-xl-3">
          <div className="card mc-card-shadow" style={cardStyle}>
            <div className="card-body text-center">
              <div style={titleStyle}>Total Thesis</div>
              <div style={iconRow}>
                {renderIcon(MetricTableIcon, 40)}
                <div style={bigNumber}>{totalTheses}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-md-6 col-xl-3">
          <div className="card mc-card-shadow" style={cardStyle}>
            <div className="card-body text-center">
              <div style={titleStyle}>Verified Thesis</div>
              <div style={iconRow}>
                {renderIcon(AproveTableIcon, 40)}
                <div style={bigNumber}>{approvedTheses}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-md-6 col-xl-3">
          <div className="card mc-card-shadow" style={cardStyle}>
            <div className="card-body text-center">
              <div style={titleStyle}>Total Likes</div>
              <div style={iconRow}>
                {renderIcon(LikeTableIcon, 40)}
                <div style={bigNumber}>{totalLikes}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ======== 1) STATUS SECTION ======== */}
      <div className="row g-3 mt-1">
        {/* LEFT: Donut Status */}
        <div className="col-12 col-lg-6">
          <div className="card mc-card-shadow" style={{ borderRadius: 16 }}>
            <div className="card-body">
              <div
                className="text-center"
                style={{ fontWeight: 700, fontSize: 18, color: "#495057" }}
              >
                Thesis Status Distribution
              </div>

              <div style={{ height: 295 }}>
                {donutTotal === 0 ? (
                  <div className="text-muted d-flex align-items-center justify-content-center h-100">
                    <i>No data to display.</i>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={donutData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius="60%"
                        outerRadius="85%"
                        paddingAngle={2}
                        stroke="transparent"
                      >
                        {donutData.map((entry) => (
                          <Cell
                            key={entry.key}
                            fill={DONUT_COLORS[entry.key] || "#6c757d"}
                          />
                        ))}
                      </Pie>

                      <Tooltip
                        formatter={(value, name) => [`${value}`, `${name}`]}
                      />

                      <text
                        x="50%"
                        y="50%"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        style={{
                          fontSize: 20,
                          fontWeight: 800,
                          fill: "#212529",
                        }}
                      >
                        {donutTotal}
                      </text>
                      <text
                        x="50%"
                        y="58%"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        style={{ fontSize: 12, fill: "#6c757d" }}
                      >
                        Total
                      </text>
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="d-flex flex-wrap gap-2 mt-2 justify-content-center align-items-center">
                {["APPROVED", "PENDING", "REJECTED"].map((k) => (
                  <span
                    key={k}
                    className="badge text-bg-light"
                    style={{ border: "1px solid rgba(0,0,0,.08)" }}
                  >
                    <span
                      style={{
                        display: "inline-block",
                        width: 10,
                        height: 10,
                        borderRadius: 999,
                        background: DONUT_COLORS[k],
                        verticalAlign: "middle",
                      }}
                    />
                    &nbsp;&nbsp;
                    {prettyStatus(k)}:{" "}
                    <strong>
                      {k === "APPROVED"
                        ? statusCounts.approved
                        : k === "REJECTED"
                        ? statusCounts.rejected
                        : statusCounts.pending}
                    </strong>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Table Status */}
        <div className="col-12 col-lg-6">
          <div className="card mc-card-shadow" style={{ borderRadius: 16 }}>
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between gap-2 flex-wrap">
                <div
                  style={{ fontWeight: 700, fontSize: 18, color: "#495057" }}
                >
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      lineHeight: 1,
                    }}
                  >
                    <span
                      style={{ display: "inline-flex", alignItems: "center" }}
                    >
                      {StatusIcon}
                    </span>
                    Thesis Status
                  </span>
                </div>

                <div className="d-flex align-items-center gap-2">
                  <select
                    className="form-select form-select-sm"
                    style={{ width: 180 }}
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="ALL">All</option>
                    <option value="APPROVED">Approved</option>
                    <option value="PENDING">Pending</option>
                    <option value="REJECTED">Rejected</option>
                  </select>

                  <div className="btn-group" role="group" aria-label="Table pagination">
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm"
                      onClick={() => setTablePage((p) => Math.max(1, p - 1))}
                      disabled={!canPrev}
                      title="Previous"
                    >
                      ‹
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm"
                      onClick={() => setTablePage((p) => Math.min(tableTotalPages, p + 1))}
                      disabled={!canNext}
                      title="Next"
                    >
                      ›
                    </button>
                  </div>
                </div>
              </div>

              <div className="table-responsive mt-2" style={{ maxHeight: 320 }}>
                <table className="table table-sm align-middle mb-0">
                  <thead>
                    <tr>
                      <th style={{ width: "70%" }}>Title</th>
                      <th className="text-end">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableSortedTheses.length === 0 ? (
                      <tr>
                        <td colSpan={2} className="text-muted">
                          No theses found.
                        </td>
                      </tr>
                    ) : (
                      tablePageItems.map((t) => {
                        const st = normalizeStatus(t.status);

                        const badgeClass =
                          st === "APPROVED"
                            ? "text-bg-success"
                            : st === "REJECTED"
                            ? "text-bg-danger"
                            : "text-bg-warning";

                        const instLine = getInstitutionUI(t).line;

                        return (
                          <tr key={t._id}>
                            <td title={t.title || ""}>
                              <div
                                style={{
                                  maxWidth: 480,
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  fontWeight: 600,
                                  color: "#212529",
                                }}
                              >
                                {t.title || "—"}
                              </div>

                              <div className="text-muted" style={{ fontSize: 12 }}>
                                {instLine}
                              </div>
                            </td>

                            <td className="text-end t-white">
                              <span className={`t-white badge ${badgeClass}`}>
                                {prettyStatus(st)}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className="text-muted mt-2" style={{ fontSize: 12 }}>
                Showing{" "}
                {tableSortedTheses.length === 0
                  ? 0
                  : (tableCurrentPage - 1) * tablePageSize + 1}
                {"–"}
                {Math.min(tableCurrentPage * tablePageSize, tableSortedTheses.length)} of{" "}
                {tableSortedTheses.length}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ======== 2) LIKES SECTION ======== */}
      <div className="row g-3 mt-1">
        {/* LEFT: Donut Likes */}
        <div className="col-12 col-lg-6">
          <div className="card mc-card-shadow" style={{ borderRadius: 16 }}>
            <div className="card-body">
              <div
                className="text-center"
                style={{ fontWeight: 700, fontSize: 18, color: "#495057" }}
              >
                Likes Distribution
              </div>

              <div style={{ height: 295 }}>
                {likesDonutTotal === 0 ? (
                  <div className="text-muted d-flex align-items-center justify-content-center h-100 wrap">
                    <i>No likes to display.</i>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={likesTop3DonutData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius="60%"
                        outerRadius="85%"
                        paddingAngle={2}
                        stroke="transparent"
                      >
                        {likesTop3DonutData.map((entry, idx) => (
                          <Cell
                            key={entry.key}
                            fill={LIKES_COLORS[idx] || "#adb5bd"}
                          />
                        ))}
                      </Pie>

                      <Tooltip
                        formatter={(value, name) => [`${value}`, `${name}`]}
                      />

                      <text
                        x="50%"
                        y="50%"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        style={{
                          fontSize: 20,
                          fontWeight: 800,
                          fill: "#212529",
                        }}
                      >
                        {likesDonutTotal}
                      </text>
                      <text
                        x="50%"
                        y="58%"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        style={{ fontSize: 12, fill: "#6c757d" }}
                      >
                        Total Likes
                      </text>
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="d-flex flex-wrap gap-2 mt-2 justify-content-center align-items-center">
                {likesTop3DonutData.map((d, idx) => (
                  <span
                    key={d.key}
                    className="badge text-bg-light"
                    style={{ border: "1px solid rgba(0,0,0,.08)" }}
                    title={d.name}
                  >
                    <span
                      style={{
                        display: "inline-block",
                        width: 10,
                        height: 10,
                        borderRadius: 999,
                        background: LIKES_COLORS[idx] || "#adb5bd",
                        verticalAlign: "middle",
                      }}
                    />
                    &nbsp;&nbsp;
                    {trimLabel(d.name, 18)}: <strong>{safeNum(d.value)}</strong>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Table Likes */}
        <div className="col-12 col-lg-6">
          <div className="card mc-card-shadow" style={{ borderRadius: 16 }}>
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between gap-2 flex-wrap">
                <div
                  style={{ fontWeight: 700, fontSize: 18, color: "#495057" }}
                >
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      lineHeight: 1,
                    }}
                  >
                    <span
                      style={{ display: "inline-flex", alignItems: "center" }}
                    >
                      {HeartIcon}
                    </span>
                    Thesis Likes
                  </span>
                </div>

                <div className="d-flex align-items-center gap-2">
                  <select
                    className="form-select form-select-sm"
                    style={{ width: 180 }}
                    value={likesOrder}
                    onChange={(e) => setLikesOrder(e.target.value)}
                  >
                    <option value="DESC">Likes: High → Low</option>
                    <option value="ASC">Likes: Low → High</option>
                  </select>

                  <div className="btn-group" role="group" aria-label="Likes pagination">
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm"
                      onClick={() => setLikesPage((p) => Math.max(1, p - 1))}
                      disabled={!likesCanPrev}
                      title="Previous"
                    >
                      ‹
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm"
                      onClick={() => setLikesPage((p) => Math.min(likesTotalPages, p + 1))}
                      disabled={!likesCanNext}
                      title="Next"
                    >
                      ›
                    </button>
                  </div>
                </div>
              </div>

              <div className="table-responsive mt-2" style={{ maxHeight: 320 }}>
                <table className="table table-sm align-middle mb-0">
                  <thead>
                    <tr>
                      <th style={{ width: "80%" }}>Title</th>
                      <th className="text-end">Likes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {likesTableSorted.length === 0 ? (
                      <tr>
                        <td colSpan={2} className="text-muted">
                          No theses found.
                        </td>
                      </tr>
                    ) : (
                      likesPageItems.map((t) => {
                        const instLine = getInstitutionUI(t).line;

                        return (
                          <tr key={t._id}>
                            <td title={t.title || ""}>
                              <div
                                style={{
                                  maxWidth: 480,
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  fontWeight: 600,
                                  color: "#212529",
                                }}
                              >
                                {t.title || "—"}
                              </div>
                              <div className="text-muted" style={{ fontSize: 12 }}>
                                {instLine}
                              </div>
                            </td>
                            <td className="text-end" style={{ fontWeight: 800 }}>
                              {safeNum(t.likes)}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className="text-muted mt-2" style={{ fontSize: 12 }}>
                Showing{" "}
                {likesTableSorted.length === 0
                  ? 0
                  : (likesCurrentPage - 1) * likesPageSize + 1}
                {"–"}
                {Math.min(likesCurrentPage * likesPageSize, likesTableSorted.length)} of{" "}
                {likesTableSorted.length}
              </div>
            </div>
          </div>
        </div>

        <div className=" d-flex justify-content-center align-items-center mt-6">
          <button
            type="button"
            className="btn btn-memory w-66 mx-6"
            style={{
              height: 46,
              borderRadius: 14,
              fontWeight: 700,
            }}
            onClick={() => {
              window.scrollTo({
                top: 0,
                behavior: "smooth",
              });
            }}
          >
            Scroll Top
          </button>
        </div>
      </div>
    </div>
  );
};

export default PanelPersonal;
