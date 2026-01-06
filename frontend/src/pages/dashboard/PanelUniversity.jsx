import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  MetricTableIcon,
  LikeTableIcon,
  AproveTableIcon,
  StatusIcon,
  HeartIcon,
  PersonIcon,
  TimerIcon,
  VerificationIcon,
  RejectedIcon,
  DepartmentIcon,
  CheckCircle,
  CrossCircle,
} from "../../utils/icons";

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";

import {
  getAuthInstitution,
  getIdInstitution,
  getAuthToken,
} from "../../utils/authSession";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

const safeNum = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const normalizeStatus = (s) => String(s || "").toUpperCase();

// 🔹 si tus iconos son JSX, los hace “grandes”
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

// ✅ agrupar contador por key
const inc = (obj, key, by = 1) => {
  const k = String(key || "").trim();
  if (!k) return;
  obj[k] = safeNum(obj[k]) + safeNum(by);
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

  // ✅ membership
  const [isMember, setIsMember] = useState(false);
  const [memberChecked, setMemberChecked] = useState(false);

  // ✅ tablas: status
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [statusPage, setStatusPage] = useState(1);
  const statusPageSize = 5;

  // ✅ likes
  const [likesOrder, setLikesOrder] = useState("DESC");
  const [likesPage, setLikesPage] = useState(1);
  const likesPageSize = 5;

  // ✅ students theses
  const [studentOrder, setStudentOrder] = useState("DESC"); // ASC/DESC by thesis count
  const [studentPage, setStudentPage] = useState(1);
  const studentPageSize = 5;

  // ✅ departments theses
  const [deptOrder, setDeptOrder] = useState("DESC"); // ASC/DESC by thesis count
  const [deptPage, setDeptPage] = useState(1);
  const deptPageSize = 5;

  // =========================
  // ✅ 1) MEMBERSHIP CHECK
  // =========================
  useEffect(() => {
    const checkMembership = async () => {
      try {
        setMemberChecked(false);

        // ✅ Opción A (recomendada): viene del objeto institution (ej: isActiveMembership)
        // ✅ Opción B: si tienes endpoint, cámbialo aquí.
        // Por ahora, lo resolvemos con lo que haya disponible:
        const local = sessionInstitution;

        // Ajusta estos campos según tu modelo real:
        const active =
          !!local?.isMember ||
          !!local?.membershipActive ||
          !!local?.isMembershipActive ||
          !!local?.membership?.isActive ||
          !!local?.membership?.active ||
          !!local?.planActive ||
          !!local?.isActiveMembership;

        // Si no viene nada, intentamos refrescar institution del backend y re-evaluar
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
            console.error(
              "Error fetching institution for membership check:",
              e
            );
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

  // refrescar institution si hace falta (mantengo tu lógica)
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

      // Espera a que se determine membresía
      if (!memberChecked) return;

      // Si no es miembro, NO cargamos el resto
      if (!isMember) {
        setTheses([]);
        setLoading(false);
        setLoadError("");
        return;
      }

      try {
        setLoading(true);
        setLoadError("");

        const res = await axios.get(
          `${API_BASE_URL}/api/theses/sub/${institutionId}`
        );
        const data = Array.isArray(res.data) ? res.data : [];
        setTheses(data);
      } catch (err) {
        console.error(err);
        setLoadError("Error loading institution dashboard data.");
        setTheses([]);
      } finally {
        setLoading(false);
      }
    };

    fetchInstitutionTheses();
  }, [institutionId, isMember, memberChecked]);

  // ✅ traer students (members) solo si isMember
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
  // ✅ TOP METRICS
  // =========================
  const totalTheses = theses.length;

  const approvedTheses = useMemo(
    () => theses.filter((t) => normalizeStatus(t.status) === "APPROVED").length,
    [theses]
  );

  const rejectedTheses = useMemo(
    () => theses.filter((t) => normalizeStatus(t.status) === "REJECTED").length,
    [theses]
  );

  const totalLikes = useMemo(
    () => theses.reduce((acc, t) => acc + safeNum(t.likes), 0),
    [theses]
  );

  const verificationRate = useMemo(
    () => pct(approvedTheses, totalTheses),
    [approvedTheses, totalTheses]
  );

  const rejectedRate = useMemo(
    () => pct(rejectedTheses, totalTheses),
    [rejectedTheses, totalTheses]
  );

  const avgVerificationDays = useMemo(() => {
    const decided = theses.filter((t) => {
      const st = normalizeStatus(t.status);
      return st === "APPROVED" || st === "REJECTED";
    });

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
  // ✅ DONUT 1: STATUS
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

  // ✅ tabla status
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
    if (othersSum > 0)
      final.push({ key: "OTHERS", name: "Others", value: othersSum });
    return final;
  }, [thesesSortedByLikesDesc]);

  const likesDonutTotal = useMemo(
    () => likesTop3DonutData.reduce((acc, d) => acc + safeNum(d.value), 0),
    [likesTop3DonutData]
  );

  const likesTableSorted = useMemo(() => {
    const dir = String(likesOrder || "DESC").toUpperCase();
    const sorted = [...theses].sort(
      (a, b) => safeNum(a.likes) - safeNum(b.likes)
    );
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
  // ✅ STUDENTS: #THESES (Top3 + Others + table ASC/DESC)
  // =========================
  const studentLabelById = useMemo(() => {
    const map = {};
    students.forEach((s) => {
      const id = s?._id || s?.id;
      if (!id) return;
      const name = [s?.name, s?.lastname].filter(Boolean).join(" ").trim();
      const label = name || s?.email || String(id);
      map[String(id)] = label;
    });
    return map;
  }, [students]);

  const studentThesisCountsObj = useMemo(() => {
    const counts = {};
    theses.forEach((t) => {
      const uploader = t?.uploadedBy?._id || t?.uploadedBy;
      if (uploader) {
        inc(counts, String(uploader), 1);
        return;
      }

      const a0 = Array.isArray(t?.authors) ? t.authors[0] : null;
      if (!a0) return;

      if (typeof a0 === "string") {
        inc(counts, a0, 1);
      } else {
        const key =
          a0?.email ||
          [a0?.name, a0?.lastname].filter(Boolean).join(" ").trim();
        if (key) inc(counts, key, 1);
      }
    });
    return counts;
  }, [theses]);

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
    return [...studentThesisRows].sort(
      (a, b) => safeNum(b.value) - safeNum(a.value)
    );
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
    if (othersSum > 0)
      final.push({ key: "STU_OTHERS", name: "Others", value: othersSum });
    return final;
  }, [studentSortedDesc]);

  const studentDonutTotal = useMemo(
    () => studentDonutData.reduce((acc, d) => acc + safeNum(d.value), 0),
    [studentDonutData]
  );

  const studentTableSorted = useMemo(() => {
    const dir = String(studentOrder || "DESC").toUpperCase();
    const sorted = [...studentThesisRows].sort(
      (a, b) => safeNum(a.value) - safeNum(b.value)
    );
    return dir === "ASC" ? sorted : sorted.reverse();
  }, [studentThesisRows, studentOrder]);

  const studentTotalPages = useMemo(
    () => Math.max(1, Math.ceil(studentTableSorted.length / studentPageSize)),
    [studentTableSorted.length]
  );
  const studentCurrentPage = Math.min(
    Math.max(1, studentPage),
    studentTotalPages
  );

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
  // ✅ DEPARTMENTS: #THESES (Top3 + Others + table ASC/DESC)
  // =========================
  const deptCountsObj = useMemo(() => {
    const counts = {};
    theses.forEach((t) => {
      const deptRaw = String(t?.department || "").trim();
      const dept = deptRaw || "Unknown";
      inc(counts, dept, 1);
    });
    return counts;
  }, [theses]);

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
    if (othersSum > 0)
      final.push({ key: "DEPT_OTHERS", name: "Others", value: othersSum });
    return final;
  }, [deptSortedDesc]);

  const deptDonutTotal = useMemo(
    () => deptDonutData.reduce((acc, d) => acc + safeNum(d.value), 0),
    [deptDonutData]
  );

  const deptTableSorted = useMemo(() => {
    const dir = String(deptOrder || "DESC").toUpperCase();
    const sorted = [...deptRows].sort(
      (a, b) => safeNum(a.value) - safeNum(b.value)
    );
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
  // UI styles
  // =========================
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

  const STATUS_COLORS = {
    APPROVED: "#198754",
    PENDING: "#ffc107",
    REJECTED: "#dc3545",
  };

  // palettes (máx 4 slices: top3 + others)
  const LIKES_COLORS = ["#0d6efd", "#20c997", "#6f42c1", "#adb5bd"];
  const STUDENT_COLORS = ["#0dcaf0", "#198754", "#6f42c1", "#adb5bd"];
  const DEPT_COLORS = ["#fd7e14", "#0d6efd", "#20c997", "#adb5bd"];

  // =========================
  // Render: loading/error base
  // =========================
  if (!memberChecked) {
    return (
      <div className="container py-3 text-muted">Checking membership…</div>
    );
  }

  // ✅ siempre mostramos el banner
  const MembershipBanner = () => (
    <div className="mb-3">
      {isMember ? (
        <div
          className="alert border-0"
          role="alert"
          style={{
            backgroundColor: "#20c997",
            color: "#fff",
            fontWeight: 600,
          }}
        >
          <span className="mx-2">{CheckCircle}</span> Your membership plan is{" "}
          <strong>active</strong>.
        </div>
      ) : (
        <div
          className="alert border-0"
          role="alert"
          style={{
            backgroundColor: "#dc3545",
            color: "#fff",
            fontWeight: 600,
          }}
        >
          <span className="mx-2">{CrossCircle}</span> Your membership plan is{" "}
          <strong>inactive</strong>.
        </div>
      )}
    </div>
  );

  // ✅ si no es miembro, SOLO mostramos el aviso
  if (!isMember) {
    return (
      <div className="container py-3">
        <MembershipBanner />
      </div>
    );
  }

  // ✅ miembro: seguimos como siempre
  if (loading)
    return <div className="container py-3 text-muted">Loading dashboard…</div>;

  if (loadError) {
    return (
      <div className="container py-3">
        <MembershipBanner />
        <div className="alert alert-danger">{loadError}</div>
      </div>
    );
  }

  return (
    <div className="container py-3">
      <MembershipBanner />

      {/* TOP CARDS - fila 1 */}
      <div className="row g-3">
        <div className="col-12 col-md-6 col-xl-3">
          <a
            href="/members-institution"
            className="btn btn-memory w-100 mc-card-shadow"
            style={{ ...cardStyle, padding: 16 }}
          >
            <div className="t-white" style={{ fontWeight: 700, fontSize: 18 }}>
              List of Member
            </div>
            <div style={iconRow}>{renderIcon(PersonIcon, 45)}</div>
          </a>
        </div>
        <div className="col-12 col-md-6 col-xl-3">
          <div className="card shadow-sm mc-card-shadow" style={cardStyle}>
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
          <div className="card shadow-sm mc-card-shadow" style={cardStyle}>
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
          <div className="card shadow-sm mc-card-shadow" style={cardStyle}>
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

      {/* TOP CARDS - fila 2 */}
      <div className="row g-3 pt-3">
        <div className="col-12 col-md-6 col-xl-3">
          <div className="card shadow-sm mc-card-shadow" style={cardStyle}>
            <div className="card-body text-center">
              <div style={titleStyle}>Verification Rate</div>
              <div style={iconRow}>
                {renderIcon(VerificationIcon, 40)}
                <div style={bigNumber}>{verificationRate}%</div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-md-6 col-xl-3">
          <div className="card shadow-sm mc-card-shadow" style={cardStyle}>
            <div className="card-body text-center">
              <div style={titleStyle}>Rejected Rate</div>
              <div style={iconRow}>
                {renderIcon(RejectedIcon, 40)}
                <div style={bigNumber}>{rejectedRate}%</div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-md-6 col-xl-3">
          <div className="card shadow-sm mc-card-shadow" style={cardStyle}>
            <div className="card-body text-center">
              <div style={titleStyle}>AVG Verification Days</div>
              <div style={iconRow}>
                {renderIcon(TimerIcon, 40)}
                <div style={bigNumber}>{avgVerificationDays}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-md-6 col-xl-3">
          <div className="card shadow-sm mc-card-shadow" style={cardStyle}>
            <div className="card-body text-center">
              <div style={titleStyle}>Total Members</div>
              <div style={iconRow}>
                {renderIcon(PersonIcon, 40)}
                <div style={bigNumber}>{totalMembers}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ======== 1) STATUS SECTION ======== */}
      <div className="row g-3 mt-1">
        {/* Donut */}
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
                {statusDonutTotal === 0 ? (
                  <div className="text-muted d-flex align-items-center justify-content-center h-100">
                    <i>No data to display.</i>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusDonutData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius="60%"
                        outerRadius="85%"
                        paddingAngle={2}
                        stroke="transparent"
                      >
                        {statusDonutData.map((entry) => (
                          <Cell
                            key={entry.key}
                            fill={STATUS_COLORS[entry.key] || "#6c757d"}
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
                        {statusDonutTotal}
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
                        background: STATUS_COLORS[k],
                        verticalAlign: "middle",
                      }}
                    />
                    &nbsp;&nbsp;{prettyStatus(k)}:{" "}
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

        {/* Table */}
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

                  <div
                    className="btn-group"
                    role="group"
                    aria-label="Status pagination"
                  >
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm"
                      onClick={() => setStatusPage((p) => Math.max(1, p - 1))}
                      disabled={!statusCanPrev}
                      title="Previous"
                    >
                      ‹
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm"
                      onClick={() =>
                        setStatusPage((p) => Math.min(statusTotalPages, p + 1))
                      }
                      disabled={!statusCanNext}
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
                    {statusTableSorted.length === 0 ? (
                      <tr>
                        <td colSpan={2} className="text-muted">
                          No theses found.
                        </td>
                      </tr>
                    ) : (
                      statusPageItems.map((t) => {
                        const st = normalizeStatus(t.status);
                        const badgeClass =
                          st === "APPROVED"
                            ? "text-bg-success"
                            : st === "REJECTED"
                            ? "text-bg-danger"
                            : "text-bg-warning";

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
                              <div
                                className="text-muted"
                                style={{ fontSize: 12 }}
                              >
                                {t?.institution?.name
                                  ? `${t.institution.name} - ${
                                      t.department || ""
                                    }`
                                  : ""}
                              </div>
                            </td>
                            <td className="text-end">
                              <span className={`badge ${badgeClass}`}>
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
                {statusTableSorted.length === 0
                  ? 0
                  : (statusCurrentPage - 1) * statusPageSize + 1}
                –{" "}
                {Math.min(
                  statusCurrentPage * statusPageSize,
                  statusTableSorted.length
                )}{" "}
                of {statusTableSorted.length}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ======== 2) LIKES SECTION ======== */}
      <div className="row g-3 mt-1">
        {/* Donut */}
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
                  <div className="text-muted d-flex align-items-center justify-content-center h-100">
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
                            fill={
                              ["#0d6efd", "#20c997", "#6f42c1", "#adb5bd"][
                                idx
                              ] || "#adb5bd"
                            }
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
                        background:
                          ["#0d6efd", "#20c997", "#6f42c1", "#adb5bd"][idx] ||
                          "#adb5bd",
                        verticalAlign: "middle",
                      }}
                    />
                    &nbsp;&nbsp;{trimLabel(d.name, 18)}:{" "}
                    <strong>{safeNum(d.value)}</strong>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
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

                  <div
                    className="btn-group"
                    role="group"
                    aria-label="Likes pagination"
                  >
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
                      onClick={() =>
                        setLikesPage((p) => Math.min(likesTotalPages, p + 1))
                      }
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
                      likesPageItems.map((t) => (
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
                            <div
                              className="text-muted"
                              style={{ fontSize: 12 }}
                            >
                              {t?.institution?.name
                                ? `${t.institution.name} - ${
                                    t.department || ""
                                  }`
                                : ""}
                            </div>
                          </td>
                          <td className="text-end" style={{ fontWeight: 800 }}>
                            {safeNum(t.likes)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="text-muted mt-2" style={{ fontSize: 12 }}>
                Showing{" "}
                {likesTableSorted.length === 0
                  ? 0
                  : (likesCurrentPage - 1) * likesPageSize + 1}
                –{" "}
                {Math.min(
                  likesCurrentPage * likesPageSize,
                  likesTableSorted.length
                )}{" "}
                of {likesTableSorted.length}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ======== 3) STUDENTS SECTION ======== */}
      <div className="row g-3 mt-1">
        {/* Donut */}
        <div className="col-12 col-lg-6">
          <div className="card mc-card-shadow" style={{ borderRadius: 16 }}>
            <div className="card-body">
              <div
                className="text-center"
                style={{ fontWeight: 700, fontSize: 18, color: "#495057" }}
              >
                Students Thesis Distribution
              </div>

              <div style={{ height: 295 }}>
                {studentDonutTotal === 0 ? (
                  <div className="text-muted d-flex align-items-center justify-content-center h-100">
                    <i>No student data to display.</i>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={studentDonutData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius="60%"
                        outerRadius="85%"
                        paddingAngle={2}
                        stroke="transparent"
                      >
                        {studentDonutData.map((entry, idx) => (
                          <Cell
                            key={entry.key}
                            fill={
                              ["#0dcaf0", "#198754", "#6f42c1", "#adb5bd"][
                                idx
                              ] || "#adb5bd"
                            }
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
                        {studentDonutTotal}
                      </text>
                      <text
                        x="50%"
                        y="58%"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        style={{ fontSize: 12, fill: "#6c757d" }}
                      >
                        Total Theses
                      </text>
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="d-flex flex-wrap gap-2 mt-2 justify-content-center align-items-center">
                {studentDonutData.map((d, idx) => (
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
                        background:
                          ["#0dcaf0", "#198754", "#6f42c1", "#adb5bd"][idx] ||
                          "#adb5bd",
                        verticalAlign: "middle",
                      }}
                    />
                    &nbsp;&nbsp;{trimLabel(d.name, 18)}:{" "}
                    <strong>{safeNum(d.value)}</strong>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
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
                      {PersonIcon}
                    </span>
                    Thesis by Students
                  </span>
                </div>

                <div className="d-flex align-items-center gap-2">
                  <select
                    className="form-select form-select-sm"
                    style={{ width: 180 }}
                    value={studentOrder}
                    onChange={(e) => setStudentOrder(e.target.value)}
                  >
                    <option value="DESC">Theses: High → Low</option>
                    <option value="ASC">Theses: Low → High</option>
                  </select>

                  <div
                    className="btn-group"
                    role="group"
                    aria-label="Students pagination"
                  >
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm"
                      onClick={() => setStudentPage((p) => Math.max(1, p - 1))}
                      disabled={!studentCanPrev}
                      title="Previous"
                    >
                      ‹
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm"
                      onClick={() =>
                        setStudentPage((p) =>
                          Math.min(studentTotalPages, p + 1)
                        )
                      }
                      disabled={!studentCanNext}
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
                      <th style={{ width: "80%" }}>Full Name</th>
                      <th className="text-end">Theses</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentTableSorted.length === 0 ? (
                      <tr>
                        <td colSpan={2} className="text-muted">
                          No students found.
                        </td>
                      </tr>
                    ) : (
                      studentPageItems.map((row) => (
                        <tr key={row.key}>
                          <td title={row.name || ""}>
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
                              {row.name || "—"}
                            </div>
                            <div
                              className="text-muted"
                              style={{ fontSize: 12 }}
                            >
                              {institution?.name
                                ? ` Students of ${institution.name}`
                                : ""}
                            </div>
                          </td>
                          <td className="text-end" style={{ fontWeight: 800 }}>
                            {safeNum(row.value)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="text-muted mt-2" style={{ fontSize: 12 }}>
                Showing{" "}
                {studentTableSorted.length === 0
                  ? 0
                  : (studentCurrentPage - 1) * studentPageSize + 1}
                –{" "}
                {Math.min(
                  studentCurrentPage * studentPageSize,
                  studentTableSorted.length
                )}{" "}
                of {studentTableSorted.length}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ======== 4) DEPARTMENTS SECTION ======== */}
      <div className="row g-3 mt-1">
        {/* Donut */}
        <div className="col-12 col-lg-6">
          <div className="card mc-card-shadow" style={{ borderRadius: 16 }}>
            <div className="card-body">
              <div
                className="text-center"
                style={{ fontWeight: 700, fontSize: 18, color: "#495057" }}
              >
                Departments Thesis Distribution
              </div>

              <div style={{ height: 295 }}>
                {deptDonutTotal === 0 ? (
                  <div className="text-muted d-flex align-items-center justify-content-center h-100">
                    <i>No department data to display.</i>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={deptDonutData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius="60%"
                        outerRadius="85%"
                        paddingAngle={2}
                        stroke="transparent"
                      >
                        {deptDonutData.map((entry, idx) => (
                          <Cell
                            key={entry.key}
                            fill={
                              ["#fd7e14", "#0d6efd", "#20c997", "#adb5bd"][
                                idx
                              ] || "#adb5bd"
                            }
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
                        {deptDonutTotal}
                      </text>
                      <text
                        x="50%"
                        y="58%"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        style={{ fontSize: 12, fill: "#6c757d" }}
                      >
                        Total Theses
                      </text>
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="d-flex flex-wrap gap-2 mt-2 justify-content-center align-items-center">
                {deptDonutData.map((d, idx) => (
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
                        background:
                          ["#fd7e14", "#0d6efd", "#20c997", "#adb5bd"][idx] ||
                          "#adb5bd",
                        verticalAlign: "middle",
                      }}
                    />
                    &nbsp;&nbsp;{trimLabel(d.name, 18)}:{" "}
                    <strong>{safeNum(d.value)}</strong>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
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
                      {DepartmentIcon}
                    </span>
                    Thesis by Department
                  </span>
                </div>

                <div className="d-flex align-items-center gap-2">
                  <select
                    className="form-select form-select-sm"
                    style={{ width: 180 }}
                    value={deptOrder}
                    onChange={(e) => setDeptOrder(e.target.value)}
                  >
                    <option value="DESC">Theses: High → Low</option>
                    <option value="ASC">Theses: Low → High</option>
                  </select>

                  <div
                    className="btn-group"
                    role="group"
                    aria-label="Departments pagination"
                  >
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm"
                      onClick={() => setDeptPage((p) => Math.max(1, p - 1))}
                      disabled={!deptCanPrev}
                      title="Previous"
                    >
                      ‹
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm"
                      onClick={() =>
                        setDeptPage((p) => Math.min(deptTotalPages, p + 1))
                      }
                      disabled={!deptCanNext}
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
                      <th style={{ width: "80%" }}>Department</th>
                      <th className="text-end">Theses</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deptTableSorted.length === 0 ? (
                      <tr>
                        <td colSpan={2} className="text-muted">
                          No departments found.
                        </td>
                      </tr>
                    ) : (
                      deptPageItems.map((row) => (
                        <tr key={row.key}>
                          <td title={row.name || ""}>
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
                              {row.name || "—"}
                            </div>
                            <div
                              className="text-muted"
                              style={{ fontSize: 12 }}
                            >
                              {institution?.name
                                ? ` Departments of ${institution.name}`
                                : ""}
                            </div>
                          </td>
                          <td className="text-end" style={{ fontWeight: 800 }}>
                            {safeNum(row.value)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="text-muted mt-2" style={{ fontSize: 12 }}>
                Showing{" "}
                {deptTableSorted.length === 0
                  ? 0
                  : (deptCurrentPage - 1) * deptPageSize + 1}
                –{" "}
                {Math.min(
                  deptCurrentPage * deptPageSize,
                  deptTableSorted.length
                )}{" "}
                of {deptTableSorted.length}
              </div>
            </div>
          </div>
        </div>

        {/* Scroll Top */}
        <div className="d-flex justify-content-center align-items-center mt-3">
          <button
            type="button"
            className="btn btn-memory w-100"
            style={{
              maxWidth: 420,
              height: 46,
              borderRadius: 14,
              fontWeight: 700,
            }}
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          >
            Scroll Top
          </button>
        </div>
      </div>
    </div>
  );
};

export default PanelUniversity;
