import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { getAuthToken, getIdUser } from "../../utils/authSession";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import {
  BookCheck,
  Heart,
  ChartPie,
  Binoculars,
  BookMarked,
  BookHeart,
  Building2,
} from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

const safeNum = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const normalizeStatus = (s) => String(s || "").toUpperCase();

const prettyStatus = (key) => {
  if (key === "APPROVED") return "Approved";
  if (key === "REJECTED") return "Rejected";
  return "Pending";
};

// ===================== Helpers de IDs (robusto) =====================
function getAnyId(v) {
  if (!v) return null;
  if (typeof v === "object" && v.$oid) return String(v.$oid);
  if (typeof v === "object" && v._id) return getAnyId(v._id);
  if (typeof v === "object" && v.id) return String(v.id);
  if (typeof v === "string") return v;
  return null;
}

// ✅ institution display seguro (string / object / null)
const getInstitutionName = (thesis) => {
  const inst = thesis?.institution;
  if (!inst) return "";
  if (typeof inst === "string") return inst; // a veces podría venir solo el id
  return inst?.name || "";
};

function getInstitutionUI(thesis) {
  const instName = String(getInstitutionName(thesis) || "").trim();
  const hasInstitution = Boolean(instName);

  return {
    hasInstitution,
    line: hasInstitution
      ? `${instName}${thesis?.department ? ` • ${thesis.department}` : ""}`
      : "Independent Research",
  };
}

// ✅ pertenece al usuario por ID (uploadedBy o authors incluye id)
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

// ✅ helper: recorta títulos largos
const trimLabel = (text, max = 22) => {
  const s = String(text || "").trim();
  if (!s) return "—";
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + "…";
};

const pct = (num, den) => {
  const n = safeNum(num);
  const d = safeNum(den);
  if (d <= 0) return 0;
  return Math.round((n / d) * 100);
};

// ✅ Dropdown minimal + compatible con mcDropdownMenu
const DashDropdown = ({ value, options, onChange, width = 190 }) => {
  const current = options.find((o) => o.value === value) || options[0];
  return (
    <div className="dropdown mcDashDd" style={{ width }}>
      <button
        type="button"
        className="btn btn-outline-memory mcDashDdBtn dropdown-toggle pd-fix"
        data-bs-toggle="dropdown"
        aria-expanded="false"
        title={current?.label || ""}
      >
        <span className="mcDashDdText">{current?.label || "Select"}</span>
      </button>

      <ul className="dropdown-menu mcDropdownMenu">
        {options.map((o) => (
          <li key={o.value}>
            <button
              type="button"
              className={`dropdown-item ${value === o.value ? "active" : ""}`}
              onClick={() => onChange(o.value)}
            >
              {o.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

const PanelPersonal = () => {
  const token = useMemo(() => getAuthToken(), []);
  const userId = useMemo(() => getIdUser(), []);

  const [theses, setTheses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // ✅ Tabla Status: filtro + paginación micro
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [statusPage, setStatusPage] = useState(1);
  const statusPageSize = 5;

  // ✅ Tabla Likes: orden + paginación micro
  const [likesOrder, setLikesOrder] = useState("DESC");
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

        const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

        const res = await axios.get(
          `${API_BASE_URL}/api/theses`,
          headers ? { headers } : undefined
        );

        const data = Array.isArray(res.data) ? res.data : [];
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

  // =========================
  // ✅ TOP METRICS
  // =========================
  const totalTheses = theses.length;

  const approvedTheses = useMemo(
    () => theses.filter((t) => normalizeStatus(t.status) === "APPROVED").length,
    [theses]
  );

  const totalLikes = useMemo(
    () => theses.reduce((acc, t) => acc + safeNum(t.likes), 0),
    [theses]
  );

  const independentCount = useMemo(
    () => theses.filter((t) => !String(getInstitutionName(t) || "").trim()).length,
    [theses]
  );

  // =========================
  // ✅ DONUT 1: STATUS
  // =========================
  const statusCounts = useMemo(() => {
    let approved = 0, pending = 0, rejected = 0;

    theses.forEach((t) => {
      const st = normalizeStatus(t.status);
      if (st === "APPROVED") approved += 1;
      else if (st === "REJECTED") rejected += 1;
      else pending += 1;
    });

    return { approved, pending, rejected };
  }, [theses]);

  const statusDonutData = useMemo(
    () => [
      { name: "Approved", value: statusCounts.approved, key: "APPROVED" },
      { name: "Pending", value: statusCounts.pending, key: "PENDING" },
      { name: "Rejected", value: statusCounts.rejected, key: "REJECTED" },
    ],
    [statusCounts]
  );

  const statusDonutTotal = useMemo(
    () => statusDonutData.reduce((acc, d) => acc + safeNum(d.value), 0),
    [statusDonutData]
  );

  const statusTableFiltered = useMemo(() => {
    const f = String(statusFilter || "ALL").toUpperCase();
    if (f === "ALL") return theses;
    return theses.filter((t) => normalizeStatus(t.status) === f);
  }, [theses, statusFilter]);

  const statusTableSorted = useMemo(() => {
    return [...statusTableFiltered].sort((a, b) => {
      const da = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const db = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return db - da;
    });
  }, [statusTableFiltered]);

  const statusTotalPages = useMemo(
    () => Math.max(1, Math.ceil(statusTableSorted.length / statusPageSize)),
    [statusTableSorted.length]
  );

  const statusCurrentPage = Math.min(Math.max(1, statusPage), statusTotalPages);

  useEffect(() => setStatusPage(1), [statusFilter]);
  useEffect(() => {
    if (statusPage > statusTotalPages) setStatusPage(statusTotalPages);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusTotalPages]);

  const statusPageItems = useMemo(() => {
    const start = (statusCurrentPage - 1) * statusPageSize;
    return statusTableSorted.slice(start, start + statusPageSize);
  }, [statusTableSorted, statusCurrentPage]);

  const statusCanPrev = statusCurrentPage > 1;
  const statusCanNext = statusCurrentPage < statusTotalPages;

  // =========================
  // ✅ DONUT 2: LIKES (Top3 + Others)
  // =========================
  const thesesSortedByLikesDesc = useMemo(
    () => [...theses].sort((a, b) => safeNum(b.likes) - safeNum(a.likes)),
    [theses]
  );

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
    if (othersSum > 0) final.push({ key: "OTHERS", name: "Others", value: othersSum });
    return final;
  }, [thesesSortedByLikesDesc]);

  const likesDonutTotal = useMemo(
    () => likesTop3DonutData.reduce((acc, d) => acc + safeNum(d.value), 0),
    [likesTop3DonutData]
  );

  const likesTableSorted = useMemo(() => {
    const dir = String(likesOrder || "DESC").toUpperCase();
    const sorted = [...theses].sort((a, b) => safeNum(a.likes) - safeNum(b.likes));
    return dir === "ASC" ? sorted : sorted.reverse();
  }, [theses, likesOrder]);

  const likesTotalPages = useMemo(
    () => Math.max(1, Math.ceil(likesTableSorted.length / likesPageSize)),
    [likesTableSorted.length]
  );

  const likesCurrentPage = Math.min(Math.max(1, likesPage), likesTotalPages);

  useEffect(() => setLikesPage(1), [likesOrder]);
  useEffect(() => {
    if (likesPage > likesTotalPages) setLikesPage(likesTotalPages);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [likesTotalPages]);

  const likesPageItems = useMemo(() => {
    const start = (likesCurrentPage - 1) * likesPageSize;
    return likesTableSorted.slice(start, start + likesPageSize);
  }, [likesTableSorted, likesCurrentPage]);

  const likesCanPrev = likesCurrentPage > 1;
  const likesCanNext = likesCurrentPage < likesTotalPages;

  // =========================
  // ✅ NUEVO: Theses by Institution (Top4 + Independent)
  // =========================
  const instAgg = useMemo(() => {
    const map = new Map(); // name -> count
    let independent = 0;

    theses.forEach((t) => {
      const name = String(getInstitutionName(t) || "").trim();
      if (!name) {
        independent += 1;
        return;
      }
      map.set(name, (map.get(name) || 0) + 1);
    });

    const list = Array.from(map.entries())
      .map(([name, count]) => ({ name, value: safeNum(count) }))
      .sort((a, b) => safeNum(b.value) - safeNum(a.value));

    return { list, independent };
  }, [theses]);

  const instTableTop4 = useMemo(() => instAgg.list.slice(0, 4), [instAgg.list]);

  const instDonutData = useMemo(() => {
    // Gráfico: Top4 + Others + Independent (si existe)
    const top = instAgg.list.slice(0, 4);
    const othersSum = instAgg.list
      .slice(4)
      .reduce((acc, x) => acc + safeNum(x.value), 0);

    const data = top.map((x) => ({
      key: `INST_${x.name}`,
      name: trimLabel(x.name, 24),
      value: safeNum(x.value),
    }));

    if (othersSum > 0) data.push({ key: "INST_OTHERS", name: "Others", value: othersSum });
    if (instAgg.independent > 0)
      data.push({
        key: "INST_INDEPENDENT",
        name: "Independent Research",
        value: safeNum(instAgg.independent),
      });

    return data;
  }, [instAgg]);

  const instDonutTotal = useMemo(
    () => instDonutData.reduce((acc, d) => acc + safeNum(d.value), 0),
    [instDonutData]
  );

  // =========================
  // ✅ palettes
  // =========================
  const STATUS_COLORS = {
    APPROVED: "#20C997",
    PENDING: "#F5C542",
    REJECTED: "#FF4D4D",
  };

  const statusLegendColors = [
    STATUS_COLORS.APPROVED,
    STATUS_COLORS.PENDING,
    STATUS_COLORS.REJECTED,
  ];

  const LIKES_COLORS = ["#20C997", "#0d6efd", "#6f42c1", "#adb5bd"];

  // ✅ NUEVO: palette para instituciones (Top + Others + Independent)
  const INST_COLORS = ["#20C997", "#0d6efd", "#6f42c1", "#F5C542", "#adb5bd", "#495057"];

  // =========================
  // Render: loading/error base
  // =========================
  if (loading) return <div className="container py-3 text-muted">Loading dashboard…</div>;

  if (loadError) {
    return (
      <div className="container py-3">
        <div className="alert alert-danger">{loadError}</div>
      </div>
    );
  }

  // =========================
  // ✅ UI components
  // =========================
  const MetricCard = ({ title, icon: Icon, value }) => (
    <div className="mcTile">
      <div className="mcTileTop">
        <div className="mcTileTitle">{title}</div>
        <div className="mcTileIcon">{Icon ? <Icon size={18} /> : null}</div>
      </div>
      <div className="mcTileValue">{value}</div>
    </div>
  );

  const Pager = ({ onPrev, onNext, canPrev, canNext }) => (
    <div className="mcPagerMini" role="group" aria-label="Pagination">
      <button
        type="button"
        className="mcPagerMiniBtn"
        onClick={onPrev}
        disabled={!canPrev}
        title="Previous"
        aria-label="Previous"
      >
        ‹
      </button>
      <button
        type="button"
        className="mcPagerMiniBtn"
        onClick={onNext}
        disabled={!canNext}
        title="Next"
        aria-label="Next"
      >
        ›
      </button>
    </div>
  );

  const DashCard = ({ title, icon: Icon, right, children, className = "" }) => (
    <div className={`mcDashCard ${className}`}>
      <div className="mcDashHead">
        <div className="mcDashHeadLeft md-fix">
          <div className="mcDashHeadTitle">
            <span className="mcDashHeadIcon">{Icon ? <Icon size={18} /> : null}</span>
            <span className="mcDashHeadText">{title}</span>
          </div>
        </div>
        {right ? <div className="mcDashHeadRight">{right}</div> : null}
      </div>
      <div className="mcDashBody">{children}</div>
    </div>
  );

  const DonutWithLegend = ({ data, total, colors, centerLabel }) => {
    const safeTotal = safeNum(total);
    return (
      <div className="mcDonutStack">
        <div className="mcDonutChartSolo">
          {safeTotal === 0 ? (
            <div className="mcEmpty">No data to display.</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="62%"
                  outerRadius="86%"
                  paddingAngle={2}
                  stroke="transparent"
                >
                  {data.map((entry, idx) => (
                    <Cell
                      key={entry.key || entry.name || idx}
                      fill={colors[idx] || "#adb5bd"}
                    />
                  ))}
                </Pie>

                <Tooltip formatter={(value, name) => [`${value}`, `${name}`]} />

                <text
                  x="50%"
                  y="50%"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  style={{
                    fontSize: 22,
                    fontWeight: 900,
                    fill: "rgba(255,255,255,.92)",
                  }}
                >
                  {safeTotal}
                </text>
                <text
                  x="50%"
                  y="58%"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    fill: "rgba(255,255,255,.55)",
                    letterSpacing: ".08em",
                  }}
                >
                  {String(centerLabel || "TOTAL").toUpperCase()}
                </text>
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="mcLegendBox">
          <div className="mcLegendList">
            {(data || []).map((d, idx) => (
              <div className="mcLegendRow2" key={d.key || `${d.name}-${idx}`}>
                <div className="mcLegendLeft2" title={d.name}>
                  <span
                    className="mcDot"
                    style={{ background: colors[idx] || "#adb5bd" }}
                  />
                  <span className="mcLegendName">{trimLabel(d.name, 26)}</span>
                </div>

                <div className="mcLegendRight2">
                  {safeNum(d.value)}{" "}
                  <span className="mcLegendPct">({pct(d.value, safeTotal)}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // ✅ Dropdown options
  const STATUS_FILTER_OPTIONS = [
    { value: "ALL", label: "All statuses" },
    { value: "APPROVED", label: "Approved" },
    { value: "PENDING", label: "Pending" },
    { value: "REJECTED", label: "Rejected" },
  ];

  const LIKES_ORDER_OPTIONS = [
    { value: "DESC", label: "Likes: High → Low" },
    { value: "ASC", label: "Likes: Low → High" },
  ];

  return (
    <div className="mcDashWrap">
      {/* ======= METRICS GRID ======= */}
      <div className="mcTilesGrid">
        <MetricCard title="Research independent" icon={Binoculars} value={independentCount} />
        <MetricCard title="Total Thesis" icon={BookMarked} value={totalTheses} />
        <MetricCard title="Verified Thesis" icon={BookCheck} value={approvedTheses} />
        <MetricCard title="Total Likes" icon={BookHeart} value={totalLikes} />
      </div>

      {/* ======= STATUS (Donut + Table) ======= */}
      <div className="mcDashGrid2">
        <DashCard title="Thesis Status" icon={ChartPie}>
          <DonutWithLegend
            data={statusDonutData}
            total={statusDonutTotal}
            colors={statusLegendColors}
            centerLabel="Total"
          />
        </DashCard>

        <DashCard
          title="Thesis Status"
          icon={ChartPie}
          className="mcDashCard--table"
          right={
            <>
              <DashDropdown
                value={statusFilter}
                options={STATUS_FILTER_OPTIONS}
                onChange={setStatusFilter}
                width={200}
              />
              <Pager
                onPrev={() => setStatusPage((p) => Math.max(1, p - 1))}
                onNext={() => setStatusPage((p) => Math.min(statusTotalPages, p + 1))}
                canPrev={statusCanPrev}
                canNext={statusCanNext}
              />
            </>
          }
        >
          <div className="mcTableFrame">
            <table className="table table-sm align-middle mb-0 mcDashTable">
              <thead>
                <tr>
                  <th style={{ width: "75%" }}>Title</th>
                  <th className="text-end">Status</th>
                </tr>
              </thead>
              <tbody>
                {statusTableSorted.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="mcMuted">
                      No theses found.
                    </td>
                  </tr>
                ) : (
                  statusPageItems.map((t) => {
                    const st = normalizeStatus(t.status);
                    const pillClass =
                      st === "APPROVED"
                        ? "mcPill mcPill--green"
                        : st === "REJECTED"
                        ? "mcPill mcPill--red"
                        : "mcPill mcPill--yellow";

                    const instLine = getInstitutionUI(t).line;

                    return (
                      <tr key={t._id}>
                        <td title={t.title || ""}>
                          <div className="mcTitleCell">{t.title || "—"}</div>
                          <div className="mcSubCell">{instLine}</div>
                        </td>
                        <td className="text-end">
                          <span className={pillClass}>{prettyStatus(st)}</span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="mcFoot mcFoot--split">
            <span>
              Showing{" "}
              {statusTableSorted.length === 0
                ? 0
                : (statusCurrentPage - 1) * statusPageSize + 1}{" "}
              – {Math.min(statusCurrentPage * statusPageSize, statusTableSorted.length)} of{" "}
              {statusTableSorted.length}
            </span>
          </div>
        </DashCard>
      </div>

      {/* ======= LIKES (Donut + Table) ======= */}
      <div className="mcDashGrid2">
        <DashCard title="Likes Distribution" icon={Heart}>
          <DonutWithLegend
            data={likesTop3DonutData}
            total={likesDonutTotal}
            colors={LIKES_COLORS}
            centerLabel="Total Likes"
          />
        </DashCard>

        <DashCard
          title="Thesis Likes"
          icon={Heart}
          className="mcDashCard--table"
          right={
            <>
              <DashDropdown
                value={likesOrder}
                options={LIKES_ORDER_OPTIONS}
                onChange={setLikesOrder}
                width={210}
              />
              <Pager
                onPrev={() => setLikesPage((p) => Math.max(1, p - 1))}
                onNext={() => setLikesPage((p) => Math.min(likesTotalPages, p + 1))}
                canPrev={likesCanPrev}
                canNext={likesCanNext}
              />
            </>
          }
        >
          <div className="mcTableFrame">
            <table className="table table-sm align-middle mb-0 mcDashTable">
              <thead>
                <tr>
                  <th style={{ width: "78%" }}>Title</th>
                  <th className="text-end">Likes</th>
                </tr>
              </thead>
              <tbody>
                {likesTableSorted.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="mcMuted">
                      No theses found.
                    </td>
                  </tr>
                ) : (
                  likesPageItems.map((t) => {
                    const instLine = getInstitutionUI(t).line;

                    return (
                      <tr key={t._id}>
                        <td title={t.title || ""}>
                          <div className="mcTitleCell">{t.title || "—"}</div>
                          <div className="mcSubCell">{instLine}</div>
                        </td>
                        <td className="text-end mcNumCell">{safeNum(t.likes)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="mcFoot mcFoot--split">
            <span>
              Showing{" "}
              {likesTableSorted.length === 0
                ? 0
                : (likesCurrentPage - 1) * likesPageSize + 1}{" "}
              – {Math.min(likesCurrentPage * likesPageSize, likesTableSorted.length)} of{" "}
              {likesTableSorted.length}
            </span>
          </div>
        </DashCard>
      </div>

      {/* ======= NUEVO: INSTITUTIONS (Donut + Top4 Table) ======= */}
      <div className="mcDashGrid2">
        <DashCard title="Theses by Institution" icon={Building2}>
          <DonutWithLegend
            data={instDonutData}
            total={instDonutTotal}
            colors={INST_COLORS}
            centerLabel="Theses"
          />
        </DashCard>

        <DashCard
          title="Institution Ranking"
          icon={Building2}
          className="mcDashCard--table"
          right={
            <div className="mcDashMiniTag" title="Top 4 institutions + independent">
              Showing top 4
            </div>
          }
        >
          <div className="mcTableFrame">
            <table className="table table-sm align-middle mb-0 mcDashTable">
              <thead>
                <tr>
                  <th style={{ width: "78%" }}>Institution</th>
                  <th className="text-end">Theses</th>
                </tr>
              </thead>
              <tbody>
                {instTableTop4.length === 0 && instAgg.independent === 0 ? (
                  <tr>
                    <td colSpan={2} className="mcMuted">
                      No theses found.
                    </td>
                  </tr>
                ) : (
                  <>
                    {instTableTop4.map((row) => (
                      <tr key={row.name}>
                        <td title={row.name}>
                          <div className="mcTitleCell">{row.name}</div>
                          <div className="mcSubCell">Academic institution</div>
                        </td>
                        <td className="text-end mcNumCell">{safeNum(row.value)}</td>
                      </tr>
                    ))}

                    {/* Independent siempre separado */}
                    <tr>
                      <td title="Independent Research">
                        <div className="mcTitleCell">Independent</div>
                        <div className="mcSubCell">No institution</div>
                      </td>
                      <td className="text-end mcNumCell">{safeNum(instAgg.independent)}</td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>

          <div className="mcFoot mcFoot--split">
            <span>
              Showing{" "}
              {statusTableSorted.length === 0
                ? 0
                : (statusCurrentPage - 1) * statusPageSize + 1}{" "}
              – {Math.min(statusCurrentPage * statusPageSize, statusTableSorted.length)} of{" "}
              {statusTableSorted.length}
            </span>
          </div>
        </DashCard>
      </div>
    </div>
  );
};

export default PanelPersonal;