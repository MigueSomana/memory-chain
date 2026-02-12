import React, { useMemo, useState, useEffect } from "react";
import NavbarReal from "../../components/navbar/NavbarReal";
import Layout from "../../components/layout/LayoutPrivado";
import { getAuthRole, getAuthToken } from "../../utils/authSession";
import ModalViewThesis from "../../components/modal/ModalViewThesis";
import axios from "axios";
import { useToast } from "../../utils/toast";
import {
  Eye,
  Quote,
  HeartPlus,
  HeartMinus,
  Heart,
  TextQuote,
  Funnel,
  ChevronDown,
  GraduationCap,
  University,
  Binoculars,
  ArrowDown01,
  ArrowUp10,
  ArrowDownAZ,
  ArrowUpZA,
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  UserPen,
  BadgeCheck,
} from "lucide-react";

// ===================== CONFIG GLOBAL =====================
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";
const gateway = import.meta.env.VITE_PINATA_GATEWAY_DOMAIN;

const role = getAuthRole();
const token = getAuthToken();

// ===================== SORT OPTIONS (idéntico a ThesisSearch) =====================
const SORT_OPTIONS = [
  { key: "recent", label: "Most recent", icon: <ArrowDown01 size={18} /> },
  { key: "oldest", label: "Oldest", icon: <ArrowUp10 size={18} /> },
  { key: "title_az", label: "Title A–Z", icon: <ArrowDownAZ size={18} /> },
  { key: "title_za", label: "Title Z–A", icon: <ArrowUpZA size={18} /> },
  {
    key: "ratings_most",
    label: "Most ratings",
    icon: <ArrowDownWideNarrow size={18} />,
  },
  {
    key: "ratings_least",
    label: "Least ratings",
    icon: <ArrowUpNarrowWide size={18} />,
  },
];

// ===================== HELPERS =====================
const normalizeStatus = (s) => String(s || "").toUpperCase();

const getYearFromThesis = (t) => {
  if (t?.date) {
    const dt = new Date(t.date);
    const y = dt.getFullYear();
    if (!Number.isNaN(y) && y > 0) return y;
  }
  const yLegacy = Number(t?.year);
  if (Number.isFinite(yLegacy) && yLegacy > 0) return yLegacy;

  if (t?.createdAt) {
    const dt = new Date(t.createdAt);
    const y = dt.getFullYear();
    if (!Number.isNaN(y) && y > 0) return y;
  }
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

const getInstitutionId = (inst) => {
  if (!inst) return null;
  if (typeof inst === "string") return String(inst);
  if (inst?._id) return String(inst._id);
  return null;
};

// ✅ Status UI con Independiente (mismo criterio que ThesisSearch final)
const statusUi = (raw, isIndependent) => {
  const s = normalizeStatus(raw);

  // Independiente: neutro por defecto, si está APPROVED -> verde (certified)
  if (isIndependent) {
    if (s === "APPROVED") return { label: "Independent Research", tone: "certified" };
    return { label: "Independent Research", tone: "neutral" };
  }

  if (s === "APPROVED") return { label: "Certified", tone: "certified" };
  if (s === "PENDING") return { label: "Pending", tone: "pending" };
  if (s === "REJECTED") return { label: "Rejected", tone: "rejected" };
  return { label: "Unknown", tone: "neutral" };
};

const safeDegreeLabel = (deg) => {
  const d = String(deg || "").trim();
  if (!d) return "";
  return d;
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
        return parts.join(" ");
      }
      return "";
    })
    .join(" ")
    .toLowerCase();
};

// ===================== APA helpers =====================
async function copyToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return true;
  }
  return false;
}

function toTitleCaseSentenceCase(title = "") {
  const t = String(title).trim();
  if (!t) return "";
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function initialFromWord(word) {
  const w = String(word || "").trim();
  if (!w) return "";
  return w[0].toUpperCase() + ".";
}

function formatPersonAPA(person) {
  if (!person) return "";
  if (typeof person === "string") return person.trim();

  const lastname = String(person.lastname || "").trim();
  const name = String(person.name || person.firstName || "").trim();

  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .map(initialFromWord)
    .join(" ");

  if (!lastname && !initials) return "";
  if (!lastname) return initials;
  if (!initials) return lastname;

  return `${lastname}, ${initials}`;
}

function formatAuthorsAPA(authors = []) {
  const list = Array.isArray(authors) ? authors : [];
  const formatted = list.map(formatPersonAPA).filter(Boolean);

  if (formatted.length === 0) return "Author, A. A.";
  if (formatted.length === 1) return formatted[0];

  if (formatted.length <= 20) {
    const last = formatted[formatted.length - 1];
    const firsts = formatted.slice(0, -1);
    return `${firsts.join(", ")}, & ${last}`;
  }

  const first19 = formatted.slice(0, 19).join(", ");
  const last = formatted[formatted.length - 1];
  return `${first19}, … ${last}`;
}

function buildThesisApa7Citation_ThesisSearchStyle(thesis) {
  const authors = formatAuthorsAPA(thesis?.authors);
  const y = getYearFromThesis(thesis);
  const year = Number.isNaN(y) ? "n.d." : String(y);

  const title = toTitleCaseSentenceCase(thesis?.title || "Untitled thesis");

  const degreeRaw = String(thesis?.degree || "").toLowerCase();
  const thesisType =
    degreeRaw.includes("phd") || degreeRaw.includes("doctor")
      ? "Doctoral dissertation"
      : degreeRaw.includes("master")
      ? "Master’s thesis"
      : "Bachelor’s thesis";

  const instName =
    typeof thesis?.institution === "object" && thesis?.institution
      ? thesis.institution.name || ""
      : "";

  const url = `http://localhost:3000/view/${thesis?._id}`;
  const bracket = instName ? `[${thesisType}, ${instName}]` : `[${thesisType}]`;
  const base = `${authors} (${year}). ${title} ${bracket}`;
  return url ? `${base}. ${url}` : `${base}.`;
}

// ===================== COMPONENT: LikedThesesSearch (UI = ThesisSearch) =====================
const LikedThesesSearch = () => {
  const { showToast } = useToast();

  // Data
  const [theses, setTheses] = useState([]);
  const [liked, setLiked] = useState({});
  const [institutions, setInstitutions] = useState([]);
  const [selectedForView, setSelectedForView] = useState(null);

  // Load states
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // Filters
  const [query, setQuery] = useState("");
  const [language, setLanguage] = useState("all");
  const [degree, setDegree] = useState("all");

  const now = new Date().getFullYear();
  const [minYear, setMinYear] = useState(1980);
  const [maxYear, setMaxYear] = useState(now);

  // ✅ institutionFilter por ID
  const [institutionFilter, setInstitutionFilter] = useState("all");

  // ✅ status filter incluye INDEPENDENT
  // all | APPROVED | PENDING | INDEPENDENT
  const [statusFilter, setStatusFilter] = useState("all");

  // Sort + pagination
  const [sortBy, setSortBy] = useState("recent");
  const activeSortOption =
    SORT_OPTIONS.find((o) => o.key === sortBy) || SORT_OPTIONS[0];

  const [page, setPage] = useState(1);
  const pageSize = 10;

  // ===================== LOAD: My Likes =====================
  useEffect(() => {
    const fetchMyLikes = async () => {
      try {
        setLoading(true);
        setLoadError("");

        if (!token) {
          setTheses([]);
          setLoadError("You must be logged in to view your liked theses.");
          return;
        }

        const headers = { Authorization: `Bearer ${token}` };
        const res = await axios.get(`${API_BASE_URL}/api/users/me/liked-theses`, {
          headers,
        });

        const data = Array.isArray(res.data) ? res.data : [];

        let currentUserId = null;
        try {
          const rawUser = localStorage.getItem("memorychain_user");
          if (rawUser) {
            const parsed = JSON.parse(rawUser);
            currentUserId = parsed?._id || parsed?.id || null;
          }
        } catch (e) {
          console.warn("No se pudo parsear memorychain_user", e);
        }

        const mapped = data.map((t) => {
          const likesCount = t.likes ?? 0;

          const userLiked =
            Array.isArray(t.likedBy) && currentUserId
              ? t.likedBy.some((u) => String(u?._id ?? u) === String(currentUserId))
              : true;

          const derivedYear = getYearFromThesis(t);
          return {
            ...t,
            likes: likesCount,
            userLiked,
            derivedYear,
            quotes: t.quotes ?? 0, // ✅ nuevo backend
          };
        });

        setTheses(mapped);

        const likedMap = {};
        mapped.forEach((t) => {
          likedMap[t._id] = true;
        });
        setLiked(likedMap);
      } catch (err) {
        console.error("Error loading liked theses:", err);
        setLoadError("Error loading liked theses. Please try again later.");
        setTheses([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMyLikes();
  }, []);

  // ===================== LOAD: Institutions (para dropdown) =====================
  useEffect(() => {
    const fetchInstitutions = async () => {
      try {
        const tokenLocal = localStorage.getItem("memorychain_token");
        const headers = tokenLocal
          ? { Authorization: `Bearer ${tokenLocal}` }
          : undefined;

        const res = await axios.get(
          `${API_BASE_URL}/api/institutions`,
          headers ? { headers } : undefined
        );

        const data = Array.isArray(res.data) ? res.data : [];
        setInstitutions(data);
      } catch (err) {
        console.error("Error loading institutions for liked filter:", err);
        setInstitutions([]);
      }
    };

    fetchInstitutions();
  }, []);

  // ===================== Institution options (ID + Name) =====================
  const institutionOptions = useMemo(() => {
    const mapped = (institutions || [])
      .map((i) => ({
        id: i?._id ? String(i._id) : null,
        name: i?.name ? String(i.name) : "",
      }))
      .filter((x) => x.id && x.name);

    const byId = new Map();
    for (const item of mapped) {
      if (!byId.has(item.id)) byId.set(item.id, item);
    }

    const unique = Array.from(byId.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );

    return [{ id: "all", name: "All Institutions" }, ...unique];
  }, [institutions]);

  const institutionIdToName = useMemo(() => {
    const map = new Map();
    institutionOptions.forEach((opt) => {
      if (opt.id !== "all") map.set(String(opt.id), String(opt.name));
    });
    return map;
  }, [institutionOptions]);

  const getInstitutionNameResolved = (thesis) => {
    const inst = thesis?.institution;
    if (!inst) return "";

    if (typeof inst === "object") return inst?.name || "";

    const maybeName = institutionIdToName.get(String(inst));
    return maybeName || "";
  };

  // ===================== FILTERED =====================
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const selectedStatus = normalizeStatus(statusFilter);

    const selectedInstId =
      institutionFilter !== "all" ? String(institutionFilter) : null;

    return theses.filter((t) => {
      const status = normalizeStatus(t.status);
      if (status === "REJECTED") return false;

      const instId = getInstitutionId(t.institution);
      const isIndependent = !instId;

      const instName = getInstitutionNameResolved(t);
      const authorsSearch = buildAuthorsSearchString(t.authors);

      const keywordsSearch = Array.isArray(t.keywords)
        ? t.keywords.map((k) => String(k).toLowerCase())
        : [];

      const matchesQ =
        !q ||
        (t.title || "").toLowerCase().includes(q) ||
        authorsSearch.includes(q) ||
        keywordsSearch.some((k) => k.includes(q)) ||
        (instName || "").toLowerCase().includes(q);

      const matchesLang =
        language === "all" || (t.language || "").toLowerCase() === language;

      const matchesDegree =
        degree === "all" || String(t.degree || "") === degree;

      const yearNum = Number.isFinite(Number(t.derivedYear))
        ? Number(t.derivedYear)
        : getYearFromThesis(t);

      const inYearRange =
        !Number.isNaN(yearNum) &&
        yearNum >= Number(minYear) &&
        yearNum <= Number(maxYear);

      // ✅ Status filter con INDEPENDENT (mismo criterio)
      let matchesStatus = true;
      if (selectedStatus === "INDEPENDENT") {
        matchesStatus = isIndependent;
      } else if (selectedStatus === "ALL") {
        matchesStatus = isIndependent || status === "APPROVED" || status === "PENDING";
      } else if (selectedStatus === "APPROVED" || selectedStatus === "PENDING") {
        matchesStatus = !isIndependent && status === selectedStatus;
      } else {
        matchesStatus = false;
      }

      const matchesInstitution = selectedInstId ? instId === selectedInstId : true;

      return (
        matchesInstitution &&
        matchesQ &&
        matchesLang &&
        matchesDegree &&
        inYearRange &&
        matchesStatus
      );
    });
  }, [
    theses,
    query,
    language,
    degree,
    minYear,
    maxYear,
    institutionFilter,
    statusFilter,
    institutionIdToName,
  ]);

  // ===================== ORDERED =====================
  const filteredOrdered = useMemo(() => {
    const arr = [...filtered];

    arr.sort((a, b) => {
      const byTitle = (a.title || "").localeCompare(b.title || "");
      const byId = String(a._id ?? "").localeCompare(String(b._id ?? ""));
      const ra = Number(a.likes ?? 0);
      const rb = Number(b.likes ?? 0);

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
        case "ratings_most":
          if (rb !== ra) return rb - ra;
          if (byTitle !== 0) return byTitle;
          return byId;
        case "ratings_least":
          if (ra !== rb) return ra - rb;
          if (byTitle !== 0) return byTitle;
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

  const pageItems = useMemo(() => filteredOrdered.slice(start, end), [
    filteredOrdered,
    start,
    end,
  ]);

  const pagesArray = useMemo(
    () => Array.from({ length: totalPages }, (_, i) => i + 1),
    [totalPages]
  );

  const go = (p) => setPage(p);

  // ===================== View modal =====================
  const handleView = (thesis) => {
    setSelectedForView(thesis);

    const el = document.getElementById("modalViewThesis");
    if (!el) return;

    const modal = window.bootstrap?.Modal?.getOrCreateInstance(el, {
      backdrop: "static",
      keyboard: false,
    });
    modal?.show();
  };

  // ===================== Cite (Clipboard + quotes counter + toast) =====================
  const handleQuote = async (thesis) => {
    try {
      const citation = buildThesisApa7Citation_ThesisSearchStyle(thesis, gateway);
      const ok = await copyToClipboard(citation);

      if (!ok) {
        alert("Failed Copied ❌");
        return;
      }

      showToast({
        message: "Citation copied to clipboard",
        type: "success",
        icon: BadgeCheck,
        duration: 2200,
      });

      // ✅ increment quotes en backend
      try {
        const resp = await axios.post(`${API_BASE_URL}/api/theses/${thesis._id}/quote`);
        const updatedThesis = resp?.data?.thesis;

        if (updatedThesis?._id) {
          setTheses((prev) =>
            prev.map((t) =>
              String(t._id) === String(updatedThesis._id)
                ? { ...t, quotes: updatedThesis.quotes ?? (t.quotes ?? 0) + 1 }
                : t
            )
          );
        } else {
          setTheses((prev) =>
            prev.map((t) =>
              String(t._id) === String(thesis._id)
                ? { ...t, quotes: (t.quotes ?? 0) + 1 }
                : t
            )
          );
        }
      } catch (e) {
        console.error("Error incrementing quote count:", e);
        // fallback local
        setTheses((prev) =>
          prev.map((t) =>
            String(t._id) === String(thesis._id)
              ? { ...t, quotes: (t.quotes ?? 0) + 1 }
              : t
          )
        );
      }
    } catch (e) {
      console.error(e);
      alert("Failed Copied ❌");
    }
  };

  // ===================== Like toggle (toast + remove from list when unlike) =====================
  const handleToggleLike = async (id) => {
    if (!token) return;

    try {
      const headers = { Authorization: `Bearer ${token}` };

      const res = await axios.post(`${API_BASE_URL}/api/theses/${id}/like`, null, {
        headers,
      });

      const { thesis, liked: isLiked } = res.data || {};
      if (!thesis || !thesis._id) return;

      showToast({
        message: isLiked ? "Added to likes" : "Removed from likes",
        type: "success",
        icon: isLiked ? HeartPlus : HeartMinus,
        duration: 2000,
      });

      // Si ya no está liked => removemos del listado
      if (!isLiked) {
        setTheses((prev) => prev.filter((t) => String(t._id) !== String(thesis._id)));
        setLiked((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
        return;
      }

      // Si volvió a liked (raro aquí, pero robusto)
      setTheses((prev) =>
        prev.map((t) => {
          if (String(t._id) !== String(thesis._id)) return t;

          const preservedInstitution = t.institution;
          const preservedDepartment = t.department;

          return {
            ...t,
            likes: thesis.likes ?? t.likes ?? 0,
            likedBy: thesis.likedBy ?? t.likedBy,
            userLiked: true,
            derivedYear: getYearFromThesis({ ...t, ...thesis }),
            institution:
              typeof thesis.institution === "object" && thesis.institution
                ? thesis.institution
                : preservedInstitution,
            department: thesis.department ?? preservedDepartment,
          };
        })
      );

      setLiked((prev) => ({ ...prev, [id]: true }));
    } catch (err) {
      console.error("Error toggling like:", err);
    }
  };

  // ===================== UI STATES =====================
  if (loading) {
    return (
      <div className="mcExploreWrap">
        <div className="mcExploreContainer">
          <div className="mcMuted">Loading liked theses…</div>
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

  // Labels (dropdown)
  const languageLabel =
    language === "all" ? "All Languages" : String(language).toUpperCase();

  const degreeLabel =
    degree === "all" ? "All Degrees" : String(degree || "All Degrees");

  const instLabel =
    institutionFilter === "all"
      ? "All Institutions"
      : institutionOptions.find((x) => String(x.id) === String(institutionFilter))
          ?.name || "All Institutions";

  // ===================== RENDER =====================
  return (
    <div className="mcExploreWrap">
      <ModalViewThesis thesis={selectedForView} />

      <div className="mcExploreContainer">
        {/* ===== TOP ROW ===== */}
        <div className="mcTopRow">
          <div className="mcSearch">
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
              placeholder="Search your liked theses..."
              value={query}
              onChange={(e) => {
                setPage(1);
                setQuery(e.target.value);
              }}
            />
          </div>

          <div className="mcTopMeta">
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
        </div>

        {/* ===== GRID ===== */}
        <div className="mcExploreGrid">
          {/* Filters */}
          <aside className="mcFilters">
            <div className="mcFiltersCard">
              <div className="mcFiltersHead">
                <div className="mcFiltersHeadLeft">
                  <span className="mcFilterIcon" aria-hidden="true">
                    <Funnel size={20} />
                  </span>
                  <span className="mcFiltersTitle">Filters</span>
                </div>
              </div>

              <div className="mcFiltersBody">
                {/* Status */}
                <div className="mcField">
                  <div className="mcFieldLabel">Status</div>
                  <div className="mcPills">
                    {[
                      { key: "APPROVED", label: "Certified" },
                      { key: "PENDING", label: "Pending" },
                      { key: "INDEPENDENT", label: "Independent" },
                      { key: "all", label: "All" },
                    ].map((s) => (
                      <button
                        key={s.key}
                        type="button"
                        className={`mcPill ${statusFilter === s.key ? "is-active" : ""}`}
                        onClick={() => {
                          setPage(1);
                          setStatusFilter(s.key);
                        }}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Year range */}
                <div className="mcField">
                  <div className="mcFieldLabel">
                    Year Range:{" "}
                    <span className="mcGreenStrong">
                      {minYear} - {maxYear}
                    </span>
                  </div>

                  <div className="mcRangeWrap">
                    <input
                      type="range"
                      className="mcRange"
                      min={1980}
                      max={now}
                      step={1}
                      value={minYear}
                      onChange={(e) => {
                        setPage(1);
                        setMinYear(Math.min(Number(e.target.value), maxYear));
                      }}
                    />
                    <input
                      type="range"
                      className="mcRange mcRangeTop"
                      min={1980}
                      max={now}
                      step={1}
                      value={maxYear}
                      onChange={(e) => {
                        setPage(1);
                        setMaxYear(Math.max(Number(e.target.value), minYear));
                      }}
                    />
                  </div>
                </div>

                {/* Language */}
                <div className="mcField">
                  <div className="mcFieldLabel">Language</div>

                  <div className="dropdown mcSelectDd">
                    <button
                      className="mcSelectBtn"
                      type="button"
                      data-bs-toggle="dropdown"
                      aria-expanded="false"
                    >
                      <span className="mcSelectText">{languageLabel}</span>
                      <ChevronDown size={18} />
                    </button>

                    <ul className="dropdown-menu mcDropdownMenu w-100">
                      {["all", "en", "es", "fr", "pt", "ch", "ko", "ru"].map((l) => (
                        <li key={l}>
                          <button
                            type="button"
                            className={`dropdown-item ${language === l ? "active" : ""}`}
                            onClick={() => {
                              setPage(1);
                              setLanguage(l);
                            }}
                          >
                            {l === "all" ? "All Languages" : l.toUpperCase()}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Degree */}
                <div className="mcField">
                  <div className="mcFieldLabel">Academic Degree</div>

                  <div className="dropdown mcSelectDd">
                    <button
                      className="mcSelectBtn"
                      type="button"
                      data-bs-toggle="dropdown"
                      aria-expanded="false"
                    >
                      <span className="mcSelectText">{degreeLabel}</span>
                      <ChevronDown size={18} />
                    </button>

                    <ul className="dropdown-menu mcDropdownMenu w-100">
                      {["all", "Bachelor", "Master", "PhD"].map((d) => (
                        <li key={d}>
                          <button
                            type="button"
                            className={`dropdown-item ${degree === d ? "active" : ""}`}
                            onClick={() => {
                              setPage(1);
                              setDegree(d);
                            }}
                          >
                            {d === "all" ? "All Degrees" : d}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Institution */}
                <div className="mcField">
                  <div className="mcFieldLabel">Institution</div>

                  <div className="dropdown mcSelectDd">
                    <button
                      className="mcSelectBtn"
                      type="button"
                      data-bs-toggle="dropdown"
                      aria-expanded="false"
                    >
                      <span className="mcSelectText">{instLabel}</span>
                      <ChevronDown size={18} />
                    </button>

                    <ul className="dropdown-menu mcDropdownMenu w-100">
                      {institutionOptions.map((opt) => (
                        <li key={opt.id}>
                          <button
                            type="button"
                            className={`dropdown-item ${
                              String(institutionFilter) === String(opt.id) ? "active" : ""
                            }`}
                            onClick={() => {
                              setPage(1);
                              setInstitutionFilter(opt.id);
                            }}
                          >
                            {opt.name}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Clear */}
                <div className="mcFiltersActions">
                  <button
                    className="mcClearBtn"
                    type="button"
                    onClick={() => {
                      setQuery("");
                      setLanguage("all");
                      setDegree("all");
                      setMinYear(1980);
                      setMaxYear(now);
                      setInstitutionFilter("all");
                      setStatusFilter("all");
                      setSortBy("recent");
                      setPage(1);
                    }}
                  >
                    Clear filters
                  </button>
                </div>
              </div>
            </div>
          </aside>

          {/* Results */}
          <section className="mcResults">
            <div className="mcCardsGrid">
              {pageItems.map((t, idx) => {
                const rowKey = `${t._id}-${start + idx}`;
                const isLiked = liked[t._id] ?? t.userLiked ?? true;

                const instId = getInstitutionId(t.institution);
                const isIndependent = !instId;

                const instNameRaw = getInstitutionNameResolved(t);

                const year = Number.isFinite(Number(t.derivedYear))
                  ? Number(t.derivedYear)
                  : getYearFromThesis(t);

                const sUI = statusUi(t.status, isIndependent);

                const authorsText = Array.isArray(t.authors)
                  ? t.authors
                      .map((a) =>
                        typeof a === "string"
                          ? a
                          : `${a.lastname ?? ""} ${a.name ?? ""}`.trim()
                      )
                      .filter(Boolean)
                      .join(", ")
                  : "";

                const degreeText = safeDegreeLabel(t.degree);
                const citedCount = Number(t.quotes ?? 0);

                return (
                  <article key={rowKey} className={`mcCard ${sUI.tone}`}>
                    <div className="mcCardTop">
                      <div className="mcStatus">
                        <span className={`mcStatusDot ${sUI.tone}`} />
                        <span className="mcStatusLabel">{sUI.label}</span>
                      </div>
                      <div className="mcYear">{Number.isNaN(year) ? "—" : year}</div>
                    </div>

                    <div className="mcCardBody">
                      <h3 className="mcCardTitle" title={t.title}>
                        {t.title}
                      </h3>

                      <div className="mcCardAuthors mcMetaRow" title={authorsText}>
                        <span className="mcMetaIcon" aria-hidden="true">
                          <UserPen size={18} />
                        </span>
                        <span className="mcMetaText">{authorsText || "—"}</span>
                      </div>

                      <div className="mcCardMeta">
                        <div className="mcMetaRow" title={instNameRaw}>
                          <span className="mcMetaIcon" aria-hidden="true">
                            {instNameRaw ? <University size={18} /> : <Binoculars size={18} />}
                          </span>
                          <span className="mcMetaText">
                            {instNameRaw || "Independent Research"}
                          </span>
                        </div>

                        <div className="mcMetaRow">
                          <span className="mcMetaIcon" aria-hidden="true">
                            <GraduationCap size={18} />
                          </span>
                          <span className="mcMetaText">{degreeText || "—"}</span>
                        </div>
                      </div>

                      {Array.isArray(t.keywords) && t.keywords.length > 0 && (
                        <div className="mcTags">
                          {t.keywords.slice(0, 3).map((k, kidx) => (
                            <span key={`${rowKey}-kw-${kidx}`} className="mcTag">
                              {k}
                            </span>
                          ))}
                          {t.keywords.length > 3 && (
                            <span className="mcTag mcTagMuted">
                              +{t.keywords.length - 3}
                            </span>
                          )}
                        </div>
                      )}

                      <div className="mcCardDivider" />

                      <div className="mcCardFooter">
                        <div className="mcMetrics">
                          <span className="mcMetric">
                            <span className="mcMetricIcon fix1" aria-hidden="true">
                              <TextQuote size={18} />
                            </span>
                            <span className="mcMetricVal">{citedCount}</span>
                            <span className="mcMetricLbl">cited</span>
                          </span>

                          <span className="mcMetric">
                            <span className="mcMetricIcon fix1" aria-hidden="true">
                              <Heart size={18} />
                            </span>
                            <span className="mcMetricVal">{t.likes ?? 0}</span>
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

                          <button
                            type="button"
                            className="mcIconBtn"
                            title="Cite"
                            onClick={() => handleQuote(t)}
                          >
                            <Quote size={18} />
                          </button>

                          {role !== "INSTITUTION" && (
                            <button
                              type="button"
                              className={`mcIconBtn ${isLiked ? "is-liked" : ""}`}
                              title={isLiked ? "Unlike" : "Like"}
                              onClick={() => handleToggleLike(t._id)}
                            >
                              {isLiked ? <HeartPlus size={18} /> : <HeartMinus size={18} />}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}

              {pageItems.length === 0 && <div className="mcMuted">No liked theses found.</div>}
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
    </div>
  );
};

// ===================== PAGE: ListLike =====================
const ListLike = () => {
  return (
    <div className="d-flex" style={{ minHeight: "100vh" }}>
      <NavbarReal />

      <div className="flex-grow-1">
        <Layout showBackDashboard title="My Like List" icon={<Heart />}>
          <LikedThesesSearch />
        </Layout>
      </div>
    </div>
  );
};

export default ListLike;