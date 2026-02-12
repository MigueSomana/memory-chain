import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import {
  getAuthInstitution,
  getIdInstitution,
  getAuthToken,
} from "../../utils/authSession";
import {
  BookCheck,
  Heart,
  ChartPie,
  BookMarked,
  BookHeart,
  Users,
  User,
  Layers,
  BadgeCheck,
  Clock3,
  OctagonAlert,
} from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

const safeNum = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const normalizeStatus = (s) => String(s || "").toUpperCase();

const prettyStatus = (key) => {
  if (key === "APPROVED") return "Approved";
  if (key === "REJECTED") return "Rejected";
  return "Pending";
};

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

const diffDays = (a, b) => {
  const da = new Date(a || 0).getTime();
  const db = new Date(b || 0).getTime();
  if (!da || !db) return 0;
  const ms = db - da;
  if (ms <= 0) return 0;
  return ms / (1000 * 60 * 60 * 24);
};

const inc = (obj, key, by = 1) => {
  const k = String(key || "").trim();
  if (!k) return;
  obj[k] = safeNum(obj[k]) + safeNum(by);
};

// ===================== HELPERS ROBUSTOS =====================
function getAnyId(v) {
  if (!v) return null;
  if (typeof v === "string") return v;
  if (typeof v === "object" && v.$oid) return String(v.$oid);
  if (typeof v === "object" && v._id) return getAnyId(v._id);
  if (typeof v === "object" && v.id) return String(v.id);
  return null;
}

function getInstNameSafe(thesis) {
  const inst = thesis?.institution;
  if (!inst) return "";
  if (typeof inst === "string") return ""; // si es id no tenemos name; no inventamos
  return String(inst?.name || "").trim();
}

function getInstLineSafe(thesis) {
  const name = getInstNameSafe(thesis);
  const dept = String(thesis?.department || "").trim();
  if (!name) return dept ? dept : "";
  return dept ? `${name} • ${dept}` : name;
}

// ===================== Dropdown =====================
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

const PanelUniversity = () => {
  const token = useMemo(() => getAuthToken(), []);
  const sessionInstitution = useMemo(() => getAuthInstitution(), []);
  const institutionId = useMemo(() => getIdInstitution(), []);

  const [institution, setInstitution] = useState(sessionInstitution || null);
  const [theses, setTheses] = useState([]);
  const [students, setStudents] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [isMember, setIsMember] = useState(false);
  const [memberChecked, setMemberChecked] = useState(false);

  const [statusFilter, setStatusFilter] = useState("ALL");
  const [statusPage, setStatusPage] = useState(1);
  const statusPageSize = 5;

  const [likesOrder, setLikesOrder] = useState("DESC");
  const [likesPage, setLikesPage] = useState(1);
  const likesPageSize = 5;

  const [studentOrder, setStudentOrder] = useState("DESC");
  const [studentPage, setStudentPage] = useState(1);
  const studentPageSize = 5;

  const [deptOrder, setDeptOrder] = useState("DESC");
  const [deptPage, setDeptPage] = useState(1);
  const deptPageSize = 5;

  // =========================
  // ✅ 1) MEMBERSHIP CHECK
  // =========================
  useEffect(() => {
    const checkMembership = async () => {
      try {
        setMemberChecked(false);

        const local = sessionInstitution;
        const active =
          !!local?.isMember ||
          !!local?.membershipActive ||
          !!local?.isMembershipActive ||
          !!local?.membership?.isActive ||
          !!local?.membership?.active ||
          !!local?.planActive ||
          !!local?.isActiveMembership;

        if (!active && institutionId) {
          try {
            const res = await axios.get(
              `${API_BASE_URL}/api/institutions/${institutionId}`
            );
            const inst = res.data || null;
            setInstitution(inst);

            const active2 =
              !!inst?.isMember ||
              !!inst?.membershipActive ||
              !!inst?.isMembershipActive ||
              !!inst?.membership?.isActive ||
              !!inst?.membership?.active ||
              !!inst?.planActive ||
              !!inst?.isActiveMembership;

            setIsMember(!!active2);
          } catch (e) {
            console.error("Error fetching institution for membership:", e);
            setIsMember(!!active);
          }
        } else {
          setIsMember(!!active);
        }
      } finally {
        setMemberChecked(true);
      }
    };

    checkMembership();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [institutionId]);

  useEffect(() => {
    const fetchInstitutionIfNeeded = async () => {
      if (institution?.email || !institutionId) return;
      try {
        const res = await axios.get(
          `${API_BASE_URL}/api/institutions/${institutionId}`
        );
        setInstitution(res.data || null);
      } catch (e) {
        console.error("Error fetching institution:", e);
      }
    };
    fetchInstitutionIfNeeded();
  }, [institution, institutionId]);

  // =========================
  // ✅ 2) DATA FETCH (solo si isMember)
  // =========================
  useEffect(() => {
    const fetchInstitutionTheses = async () => {
      if (!institutionId) {
        setLoadError("No institution session found.");
        setLoading(false);
        return;
      }
      if (!memberChecked) return;

      if (!isMember) {
        setTheses([]);
        setLoading(false);
        setLoadError("");
        return;
      }

      try {
        setLoading(true);
        setLoadError("");

        const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

        const res = await axios.get(
          `${API_BASE_URL}/api/theses/institution/${institutionId}`,
          headers ? { headers } : undefined
        );

        const data = Array.isArray(res.data) ? res.data : [];
        setTheses(data);
      } catch (err) {
        console.error(
          "Dashboard fetch error:",
          err?.response?.status,
          err?.response?.data || err?.message
        );

        const msg =
          err?.response?.data?.message ||
          err?.response?.data?.error ||
          (err?.response?.status
            ? `Request failed (${err.response.status})`
            : "Network error");

        setLoadError(msg);
        setTheses([]);
      } finally {
        setLoading(false);
      }
    };

    fetchInstitutionTheses();
  }, [institutionId, isMember, memberChecked, token]);

  useEffect(() => {
    const fetchInstitutionStudents = async () => {
      if (!institutionId) return;
      if (!token) return;
      if (!memberChecked) return;

      if (!isMember) {
        setStudents([]);
        return;
      }

      try {
        const res = await axios.get(
          `${API_BASE_URL}/api/institutions/${institutionId}/students`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = Array.isArray(res.data) ? res.data : [];
        setStudents(data);
      } catch (e) {
        console.error("Error fetching institution students:", e);
        setStudents([]);
      }
    };
    fetchInstitutionStudents();
  }, [institutionId, token, isMember, memberChecked]);

  // =========================
  // ✅ BASE: thesesAP (Approved + Pending) para TODO excepto Status
  // =========================
  const thesesAP = useMemo(() => {
    return (theses || []).filter((t) => {
      const st = normalizeStatus(t.status);
      return st === "APPROVED" || st === "PENDING";
    });
  }, [theses]);

  // =========================
  // ✅ TOP METRICS
  // =========================
  const totalTheses = theses.length; // total real (incluye rejected)

  const approvedTheses = useMemo(
    () => thesesAP.filter((t) => normalizeStatus(t.status) === "APPROVED").length,
    [thesesAP]
  );

  const rejectedTheses = useMemo(
    () => theses.filter((t) => normalizeStatus(t.status) === "REJECTED").length,
    [theses]
  );

  const pendingTheses = useMemo(
    () => thesesAP.filter((t) => normalizeStatus(t.status) === "PENDING").length,
    [thesesAP]
  );

  const totalLikes = useMemo(
    () => thesesAP.reduce((acc, t) => acc + safeNum(t.likes), 0),
    [thesesAP]
  );

  const verificationRate = useMemo(
    () => pct(approvedTheses, thesesAP.length),
    [approvedTheses, thesesAP.length]
  );

  const rejectedRate = useMemo(
    () => pct(rejectedTheses, totalTheses),
    [rejectedTheses, totalTheses]
  );

  const avgVerificationDays = useMemo(() => {
    const decided = theses.filter((t) => normalizeStatus(t.status) === "APPROVED");
    if (!decided.length) return 0;

    const sum = decided.reduce((acc, t) => {
      const days = diffDays(t.createdAt, t.updatedAt);
      return acc + (Number.isFinite(days) ? days : 0);
    }, 0);

    const avg = sum / decided.length;
    return Math.round(avg * 10) / 10;
  }, [theses]);

  const totalMembers = useMemo(() => students.length, [students]);

  // =========================
  // ✅ DONUT 1: STATUS (ÚNICO lugar donde se incluye REJECTED)
  // =========================
  const statusCounts = useMemo(() => {
    let approved = 0,
      pending = 0,
      rejected = 0;

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
      { name: "Certified", value: statusCounts.approved, key: "APPROVED" },
      { name: "Pending", value: statusCounts.pending, key: "PENDING" },
      { name: "Rejected", value: statusCounts.rejected, key: "REJECTED" },
    ],
    [statusCounts]
  );

  const statusDonutTotal = useMemo(
    () => statusDonutData.reduce((acc, d) => acc + safeNum(d.value), 0),
    [statusDonutData]
  );

  // ✅ Status table (única tabla donde puede salir REJECTED)
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
  // ✅ TABLA 2: LIKES (SOLO Approved+Pending)
  // =========================
  const likesTableSorted = useMemo(() => {
    const dir = String(likesOrder || "DESC").toUpperCase();
    const sorted = [...thesesAP].sort((a, b) => safeNum(a.likes) - safeNum(b.likes));
    return dir === "ASC" ? sorted : sorted.reverse();
  }, [thesesAP, likesOrder]);

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
  // ✅ DONUT 2: LIKES (MISMA DATA QUE TABLA 2)
  //   - Usa EXACTAMENTE likesTableSorted (thesesAP sin rejected)
  //   - Representa CONTEO de tesis: Top3 + Others
  //   - Total = cantidad de tesis (igual que la tabla)
  // =========================
  const likesSortedForDonut = useMemo(() => {
    // Donut siempre por "más likes" (independiente de ASC/DESC del dropdown)
    return [...thesesAP].sort((a, b) => safeNum(b.likes) - safeNum(a.likes));
  }, [thesesAP]);

  const likesThesisDonutData = useMemo(() => {
    const arr = likesSortedForDonut;
    const n = arr.length;
    if (!n) return [];

    const top3 = arr.slice(0, 3).map((t, idx) => ({
      key: String(t._id || `TOP_${idx}`),
      name: trimLabel(t.title, 22),
      value: 1, // ✅ conteo de tesis (no likes)
    }));

    const othersCount = Math.max(0, n - 3);

    const final = [...top3];
    if (othersCount > 0) final.push({ key: "OTHERS", name: "Others", value: othersCount });
    return final;
  }, [likesSortedForDonut]);

  const likesThesisDonutTotal = useMemo(
    () => likesTableSorted.length, // ✅ MISMO total que la tabla
    [likesTableSorted.length]
  );

  // =========================
  // ✅ STUDENTS: #THESES (SOLO Approved+Pending)
  // =========================
  const studentLabelById = useMemo(() => {
    const map = {};
    students.forEach((s) => {
      const id = getAnyId(s?._id) || getAnyId(s?.id);
      if (!id) return;
      const name = [s?.name, s?.lastname].filter(Boolean).join(" ").trim();
      const label = name || s?.email || String(id);
      map[String(id)] = label;
    });
    return map;
  }, [students]);

  const studentThesisCountsObj = useMemo(() => {
    const counts = {};
    thesesAP.forEach((t) => {
      const uploaderId = getAnyId(t?.uploadedBy);
      if (uploaderId) {
        inc(counts, String(uploaderId), 1);
        return;
      }

      // fallback: primer autor (si viene sin ids)
      const a0 = Array.isArray(t?.authors) ? t.authors[0] : null;
      if (!a0) return;

      const a0Id = getAnyId(a0);
      if (a0Id) {
        inc(counts, String(a0Id), 1);
        return;
      }

      if (typeof a0 === "string") {
        inc(counts, a0, 1);
      } else {
        const key =
          a0?.email || [a0?.name, a0?.lastname].filter(Boolean).join(" ").trim();
        if (key) inc(counts, key, 1);
      }
    });
    return counts;
  }, [thesesAP]);

  const studentThesisRows = useMemo(() => {
    return Object.entries(studentThesisCountsObj)
      .map(([key, value]) => ({
        key,
        name: studentLabelById[key] || key,
        value: safeNum(value),
      }))
      .filter((x) => x.value > 0);
  }, [studentThesisCountsObj, studentLabelById]);

  const studentSortedDesc = useMemo(() => {
    return [...studentThesisRows].sort((a, b) => safeNum(b.value) - safeNum(a.value));
  }, [studentThesisRows]);

  const studentDonutData = useMemo(() => {
    if (!studentSortedDesc.length) return [];
    const top3 = studentSortedDesc.slice(0, 3).map((x, i) => ({
      key: `STU_${x.key}_${i}`,
      name: trimLabel(x.name, 22),
      value: safeNum(x.value),
    }));
    const othersSum = studentSortedDesc
      .slice(3)
      .reduce((acc, x) => acc + safeNum(x.value), 0);
    const final = [...top3];
    if (othersSum > 0) final.push({ key: "STU_OTHERS", name: "Others", value: othersSum });
    return final;
  }, [studentSortedDesc]);

  const studentDonutTotal = useMemo(
    () => studentDonutData.reduce((acc, d) => acc + safeNum(d.value), 0),
    [studentDonutData]
  );

  const studentTableSorted = useMemo(() => {
    const dir = String(studentOrder || "DESC").toUpperCase();
    const sorted = [...studentThesisRows].sort((a, b) => safeNum(a.value) - safeNum(b.value));
    return dir === "ASC" ? sorted : sorted.reverse();
  }, [studentThesisRows, studentOrder]);

  const studentTotalPages = useMemo(
    () => Math.max(1, Math.ceil(studentTableSorted.length / studentPageSize)),
    [studentTableSorted.length]
  );

  const studentCurrentPage = Math.min(Math.max(1, studentPage), studentTotalPages);

  useEffect(() => setStudentPage(1), [studentOrder]);
  useEffect(() => {
    if (studentPage > studentTotalPages) setStudentPage(studentTotalPages);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentTotalPages]);

  const studentPageItems = useMemo(() => {
    const start = (studentCurrentPage - 1) * studentPageSize;
    return studentTableSorted.slice(start, start + studentPageSize);
  }, [studentTableSorted, studentCurrentPage]);

  const studentCanPrev = studentCurrentPage > 1;
  const studentCanNext = studentCurrentPage < studentTotalPages;

  // =========================
  // ✅ DEPARTMENTS (SOLO Approved+Pending)
  // =========================
  const deptCountsObj = useMemo(() => {
    const counts = {};
    thesesAP.forEach((t) => {
      const deptRaw = String(t?.department || "").trim();
      const dept = deptRaw || "Unknown";
      inc(counts, dept, 1);
    });
    return counts;
  }, [thesesAP]);

  const deptRows = useMemo(() => {
    return Object.entries(deptCountsObj)
      .map(([key, value]) => ({ key, name: key, value: safeNum(value) }))
      .filter((x) => x.value > 0);
  }, [deptCountsObj]);

  const deptSortedDesc = useMemo(() => {
    return [...deptRows].sort((a, b) => safeNum(b.value) - safeNum(a.value));
  }, [deptRows]);

  const deptDonutData = useMemo(() => {
    if (!deptSortedDesc.length) return [];
    const top3 = deptSortedDesc.slice(0, 3).map((x, i) => ({
      key: `DEPT_${x.key}_${i}`,
      name: trimLabel(x.name, 22),
      value: safeNum(x.value),
    }));
    const othersSum = deptSortedDesc
      .slice(3)
      .reduce((acc, x) => acc + safeNum(x.value), 0);
    const final = [...top3];
    if (othersSum > 0) final.push({ key: "DEPT_OTHERS", name: "Others", value: othersSum });
    return final;
  }, [deptSortedDesc]);

  const deptDonutTotal = useMemo(
    () => deptDonutData.reduce((acc, d) => acc + safeNum(d.value), 0),
    [deptDonutData]
  );

  const deptTableSorted = useMemo(() => {
    const dir = String(deptOrder || "DESC").toUpperCase();
    const sorted = [...deptRows].sort((a, b) => safeNum(a.value) - safeNum(b.value));
    return dir === "ASC" ? sorted : sorted.reverse();
  }, [deptRows, deptOrder]);

  const deptTotalPages = useMemo(
    () => Math.max(1, Math.ceil(deptTableSorted.length / deptPageSize)),
    [deptTableSorted.length]
  );

  const deptCurrentPage = Math.min(Math.max(1, deptPage), deptTotalPages);

  useEffect(() => setDeptPage(1), [deptOrder]);
  useEffect(() => {
    if (deptPage > deptTotalPages) setDeptPage(deptTotalPages);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deptTotalPages]);

  const deptPageItems = useMemo(() => {
    const start = (deptCurrentPage - 1) * deptPageSize;
    return deptTableSorted.slice(start, start + deptPageSize);
  }, [deptTableSorted, deptCurrentPage]);

  const deptCanPrev = deptCurrentPage > 1;
  const deptCanNext = deptCurrentPage < deptTotalPages;

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

  // Likes/Student/Dept palettes no cambian
  const LIKES_COLORS = ["#20C997", "#0d6efd", "#6f42c1", "#adb5bd"];
  const STUDENT_COLORS = ["#0dcaf0", "#20C997", "#6f42c1", "#adb5bd"];
  const DEPT_COLORS = ["#fd7e14", "#0d6efd", "#20C997", "#adb5bd"];

  // =========================
  // Render: loading/error base
  // =========================
  if (!memberChecked) {
    return <div className="container py-3 text-muted">Checking membership…</div>;
  }

  const MembershipBanner = () => (
    <div className="mb-3">
      {isMember ? (
        <div className="alert border-0 mcDashBanner mcDashBanner--ok" role="alert">
          <span className="mx-2">
            <BadgeCheck />
          </span>
          Your membership plan is <strong>active</strong>.
        </div>
      ) : (
        <div className="alert border-0 mcDashBanner mcDashBanner--bad" role="alert">
          <span className="mx-2">
            <OctagonAlert />
          </span>
          Your membership plan is <strong>inactive</strong>.
        </div>
      )}
    </div>
  );

  if (!isMember) {
    return (
      <div className="container py-3">
        <MembershipBanner />
      </div>
    );
  }

  if (loading) {
    return <div className="container py-3 text-muted">Loading dashboard…</div>;
  }

  if (loadError) {
    return (
      <div className="container py-3">
        <MembershipBanner />
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
                    <Cell key={entry.key || entry.name || idx} fill={colors[idx] || "#adb5bd"} />
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
                  <span className="mcDot" style={{ background: colors[idx] || "#adb5bd" }} />
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

  const STUDENT_ORDER_OPTIONS = [
    { value: "DESC", label: "Theses: High → Low" },
    { value: "ASC", label: "Theses: Low → High" },
  ];

  const DEPT_ORDER_OPTIONS = [
    { value: "DESC", label: "Theses: High → Low" },
    { value: "ASC", label: "Theses: Low → High" },
  ];

  return (
    <div className="mcDashWrap">
      <MembershipBanner />

      {/* ======= METRICS GRID ======= */}
      <div className="mcTilesGrid">
        <MetricCard title="Total Theses" icon={BookMarked} value={totalTheses} />
        <MetricCard title="Verified Theses" icon={BookCheck} value={approvedTheses} />
        <MetricCard title="Total Likes" icon={BookHeart} value={totalLikes} />
        <MetricCard title="Members" icon={Users} value={totalMembers} />
      </div>

      <div className="mcTilesGrid mcTilesGrid--second">
        <MetricCard title="Verification Rate" icon={BadgeCheck} value={`${verificationRate}%`} />
        <MetricCard title="Rejected Rate" icon={OctagonAlert} value={`${rejectedRate}%`} />
        <MetricCard title="AVG Verification Days" icon={Clock3} value={avgVerificationDays} />
        <MetricCard title="Pending Theses" icon={Clock3} value={pendingTheses} />
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

                    return (
                      <tr key={t._id}>
                        <td title={t.title || ""}>
                          <div className="mcTitleCell">{t.title || "—"}</div>
                          <div className="mcSubCell">{getInstLineSafe(t)}</div>
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
              {statusTableSorted.length === 0 ? 0 : (statusCurrentPage - 1) * statusPageSize + 1} –{" "}
              {Math.min(statusCurrentPage * statusPageSize, statusTableSorted.length)} of{" "}
              {statusTableSorted.length}
            </span>
          </div>
        </DashCard>
      </div>

      {/* ======= LIKES (Donut + Table) ======= */}
      {/* ✅ Donut 2 ahora usa el MISMO universo que la tabla: thesesAP sin rejected */}
      <div className="mcDashGrid2">
        <DashCard title="Likes Distribution" icon={Heart}>
          <DonutWithLegend
            data={likesThesisDonutData}
            total={likesThesisDonutTotal}
            colors={LIKES_COLORS}
            centerLabel="Total Theses"
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
                  likesPageItems.map((t) => (
                    <tr key={t._id}>
                      <td title={t.title || ""}>
                        <div className="mcTitleCell">{t.title || "—"}</div>
                        <div className="mcSubCell">{getInstLineSafe(t)}</div>
                      </td>
                      <td className="text-end mcNumCell">{safeNum(t.likes)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="mcFoot mcFoot--split">
            <span>
              Showing{" "}
              {likesTableSorted.length === 0 ? 0 : (likesCurrentPage - 1) * likesPageSize + 1} –{" "}
              {Math.min(likesCurrentPage * likesPageSize, likesTableSorted.length)} of{" "}
              {likesTableSorted.length}
            </span>
          </div>
        </DashCard>
      </div>

      {/* ======= STUDENTS (Donut + Table) ======= */}
      <div className="mcDashGrid2">
        <DashCard title="Students Distribution" icon={User}>
          <DonutWithLegend
            data={studentDonutData}
            total={studentDonutTotal}
            colors={STUDENT_COLORS}
            centerLabel="Total Theses"
          />
        </DashCard>

        <DashCard
          title="Theses by Students"
          icon={User}
          className="mcDashCard--table"
          right={
            <>
              <DashDropdown
                value={studentOrder}
                options={STUDENT_ORDER_OPTIONS}
                onChange={setStudentOrder}
                width={220}
              />
              <Pager
                onPrev={() => setStudentPage((p) => Math.max(1, p - 1))}
                onNext={() => setStudentPage((p) => Math.min(studentTotalPages, p + 1))}
                canPrev={studentCanPrev}
                canNext={studentCanNext}
              />
            </>
          }
        >
          <div className="mcTableFrame">
            <table className="table table-sm align-middle mb-0 mcDashTable">
              <thead>
                <tr>
                  <th style={{ width: "78%" }}>Full Name</th>
                  <th className="text-end">Theses</th>
                </tr>
              </thead>
              <tbody>
                {studentTableSorted.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="mcMuted">
                      No students found.
                    </td>
                  </tr>
                ) : (
                  studentPageItems.map((row) => (
                    <tr key={row.key}>
                      <td title={row.name || ""}>
                        <div className="mcTitleCell">{row.name || "—"}</div>
                        <div className="mcSubCell">
                          {institution?.name ? `Students of ${institution.name}` : ""}
                        </div>
                      </td>
                      <td className="text-end mcNumCell">{safeNum(row.value)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="mcFoot mcFoot--split">
            <span>
              Showing{" "}
              {studentTableSorted.length === 0
                ? 0
                : (studentCurrentPage - 1) * studentPageSize + 1}{" "}
              –{" "}
              {Math.min(studentCurrentPage * studentPageSize, studentTableSorted.length)} of{" "}
              {studentTableSorted.length}
            </span>
          </div>
        </DashCard>
      </div>

      {/* ======= DEPARTMENTS (Donut + Table) ======= */}
      <div className="mcDashGrid2">
        <DashCard title="Departments Distribution" icon={Layers}>
          <DonutWithLegend
            data={deptDonutData}
            total={deptDonutTotal}
            colors={DEPT_COLORS}
            centerLabel="Total Theses"
          />
        </DashCard>

        <DashCard
          title="Theses by Department"
          icon={Layers}
          className="mcDashCard--table"
          right={
            <>
              <DashDropdown
                value={deptOrder}
                options={DEPT_ORDER_OPTIONS}
                onChange={setDeptOrder}
                width={220}
              />
              <Pager
                onPrev={() => setDeptPage((p) => Math.max(1, p - 1))}
                onNext={() => setDeptPage((p) => Math.min(deptTotalPages, p + 1))}
                canPrev={deptCanPrev}
                canNext={deptCanNext}
              />
            </>
          }
        >
          <div className="mcTableFrame">
            <table className="table table-sm align-middle mb-0 mcDashTable">
              <thead>
                <tr>
                  <th style={{ width: "78%" }}>Department</th>
                  <th className="text-end">Theses</th>
                </tr>
              </thead>
              <tbody>
                {deptTableSorted.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="mcMuted">
                      No departments found.
                    </td>
                  </tr>
                ) : (
                  deptPageItems.map((row) => (
                    <tr key={row.key}>
                      <td title={row.name || ""}>
                        <div className="mcTitleCell">{row.name || "—"}</div>
                        <div className="mcSubCell">
                          {institution?.name ? `Departments of ${institution.name}` : ""}
                        </div>
                      </td>
                      <td className="text-end mcNumCell">{safeNum(row.value)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="mcFoot mcFoot--split">
            <span>
              Showing{" "}
              {deptTableSorted.length === 0 ? 0 : (deptCurrentPage - 1) * deptPageSize + 1} –{" "}
              {Math.min(deptCurrentPage * deptPageSize, deptTableSorted.length)} of{" "}
              {deptTableSorted.length}
            </span>
          </div>
        </DashCard>
      </div>
    </div>
  );
};

export default PanelUniversity;