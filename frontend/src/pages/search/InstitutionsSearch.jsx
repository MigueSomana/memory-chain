import React, { useMemo, useState, useEffect } from "react";
import axios from "axios";
import ThesisSearch from "../search/ThesisSearch"; // ✅ ajusta el path real

import {
  Funnel,
  ArrowDownAZ,
  ArrowUpZA,
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  ChevronDown,
  MapPinned,
  School,
  Globe,
  BookMarked,
  Eye,
  BookSearch,
  X,
} from "lucide-react";

// ===================== CONFIG GLOBAL =====================
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

// ===================== SORT OPTIONS (Institutions) =====================
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

const formatType = (t) =>
  t ? t.charAt(0).toUpperCase() + t.slice(1).toLowerCase() : "";

// ===================== InstitutionsSearch =====================
const InstitutionsSearch = () => {
  const [institutions, setInstitutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // Conteos SOLO de APPROVED + PENDING (rechazadas NO cuentan)
  const [thesisCounts, setThesisCounts] = useState({});

  // Filters
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");
  const [country, setCountry] = useState("all");
  const [onlyMembers, setOnlyMembers] = useState(false);

  // Sort + pagination
  const [sortBy, setSortBy] = useState("name_az");
  const activeSortOption =
    SORT_OPTIONS.find((o) => o.key === sortBy) || SORT_OPTIONS[0];

  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Focus mode
  const [focusedInstitutionId, setFocusedInstitutionId] = useState(null);

  // ===================== LOAD INSTITUTIONS =====================
  useEffect(() => {
    const fetchInstitutions = async () => {
      try {
        setLoading(true);
        setLoadError("");

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
        console.error("Error loading institutions:", err);
        setLoadError("Error loading institutions. Please try again later.");
        setInstitutions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchInstitutions();
  }, []);

  // ===================== LOAD THESES COUNTS =====================
  useEffect(() => {
    const fetchThesesAndBuildCounts = async () => {
      try {
        const tokenLocal = localStorage.getItem("memorychain_token");
        const headers = tokenLocal
          ? { Authorization: `Bearer ${tokenLocal}` }
          : undefined;

        const res = await axios.get(
          `${API_BASE_URL}/api/theses`,
          headers ? { headers } : undefined
        );

        const theses = Array.isArray(res.data) ? res.data : [];
        const counts = {};

        const normalizeStatus = (s) => String(s || "").toUpperCase();

        for (const thesis of theses) {
          const status = normalizeStatus(thesis?.status);
          if (status === "REJECTED") continue;
          if (status !== "APPROVED" && status !== "PENDING") continue;

          const instField = thesis.institution;
          const instId =
            typeof instField === "string"
              ? instField
              : instField?._id
              ? String(instField._id)
              : null;

          if (!instId) continue;
          counts[instId] = (counts[instId] || 0) + 1;
        }

        setThesisCounts(counts);
      } catch (err) {
        console.error("Error loading theses for counts:", err);
        setThesisCounts({});
      }
    };

    fetchThesesAndBuildCounts();
  }, []);

  // ===================== OPTIONS =====================
  const countryOptions = useMemo(() => {
    const set = new Set(institutions.map((i) => i.country).filter(Boolean));
    return ["all", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [institutions]);

  const typeOptions = useMemo(() => {
    const set = new Set(institutions.map((i) => i.type).filter(Boolean));
    const arr = Array.from(set).map((t) => String(t));
    arr.sort((a, b) => a.localeCompare(b));
    return ["all", ...arr];
  }, [institutions]);

  // ===================== FILTERED =====================
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const selectedType = String(type || "all").toLowerCase();
    const selectedCountry = String(country || "all").toLowerCase();

    return institutions.filter((i) => {
      const name = i.name || "";
      const countryVal = i.country || "";
      const typeVal = i.type || "";
      const isMemberVal = !!i.isMember;

      const matchesQ =
        !q ||
        name.toLowerCase().includes(q) ||
        countryVal.toLowerCase().includes(q);

      const matchesType =
        selectedType === "all" || typeVal.toLowerCase() === selectedType;

      const matchesCountry =
        selectedCountry === "all" ||
        countryVal.toLowerCase() === selectedCountry;

      const matchesMember = !onlyMembers || isMemberVal;

      return matchesQ && matchesType && matchesCountry && matchesMember;
    });
  }, [institutions, query, type, country, onlyMembers]);

  // ===================== ORDERED =====================
  const filteredOrdered = useMemo(() => {
    const arr = [...filtered];

    arr.sort((a, b) => {
      const nameCmp = (a.name || "").localeCompare(b.name || "");
      const idCmp = String(a._id ?? "").localeCompare(String(b._id ?? ""));

      const ta = thesisCounts[a._id] ?? 0;
      const tb = thesisCounts[b._id] ?? 0;

      switch (sortBy) {
        case "name_az":
          if (nameCmp !== 0) return nameCmp;
          return idCmp;
        case "name_za":
          if (nameCmp !== 0) return -nameCmp;
          return idCmp;
        case "theses_most":
          if (tb !== ta) return tb - ta;
          if (nameCmp !== 0) return nameCmp;
          return idCmp;
        case "theses_least":
          if (ta !== tb) return ta - tb;
          if (nameCmp !== 0) return nameCmp;
          return idCmp;
        default:
          return 0;
      }
    });

    return arr;
  }, [filtered, sortBy, thesisCounts]);

  // ===================== PAGINATION (NO FOCUS) =====================
  const totalPages = Math.max(1, Math.ceil(filteredOrdered.length / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const start = (currentPage - 1) * pageSize;
  const end = start + pageSize;

  const institutionsToRender = useMemo(() => {
    // ✅ En focus, solo mostramos la barra + ThesisSearch debajo (no cards)
    if (focusedInstitutionId) return [];
    return filteredOrdered.slice(start, end);
  }, [filteredOrdered, focusedInstitutionId, start, end]);

  const pagesArray = useMemo(
    () => Array.from({ length: totalPages }, (_, i) => i + 1),
    [totalPages]
  );

  const go = (p) => setPage(p);

  const handleToggleFocus = (id) => {
    setFocusedInstitutionId((current) =>
      current && String(current) === String(id) ? null : String(id)
    );
  };

  const focusedInstitution = useMemo(() => {
    if (!focusedInstitutionId) return null;
    return (
      institutions.find((x) => String(x._id) === String(focusedInstitutionId)) ||
      null
    );
  }, [focusedInstitutionId, institutions]);

  // ===================== UI STATES =====================
  if (loading) {
    return (
      <div className="mcExploreWrap">
        <div className="mcExploreContainer">
          <div className="mcMuted">Loading institutions…</div>
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

  const showHeader = !focusedInstitutionId;

  const typeLabel = type === "all" ? "All Types" : formatType(type);
  const countryLabel =
    country === "all" ? "All Countries" : String(country || "All Countries");

  return (
    <div className="mcExploreWrap">
      <div className="mcExploreContainer">
        {/* ===================== FOCUS BAR + THESISSEARCH (LITERAL) ===================== */}
        {focusedInstitutionId && focusedInstitution && (
          <>
            <div className="mcInstFocusBar">
              <div className="mcInstFocusLeft">
                <span className="mcInstFocusIcon" aria-hidden="true">
                  <Funnel size={18} />
                </span>

                <span className="mcInstFocusName">
                  {focusedInstitution?.name || "Institution"}
                </span>

                {focusedInstitution?.isMember ? (
                  <span className="mcInstFocusBadge is-active">
                    <span className="mcStatusDot active" /> Active
                  </span>
                ) : (
                  <span className="mcInstFocusBadge is-inactive">
                    <span className="mcStatusDot inactive" /> Inactive
                  </span>
                )}
              </div>

              <div className="mcInstFocusActions">
                {focusedInstitution?.website ? (
                  <a
                    className="mcIconBtn mcIconBtnLink"
                    href={focusedInstitution.website}
                    target="_blank"
                    rel="noreferrer"
                    title="Open website"
                  >
                    <Globe size={18} />
                  </a>
                ) : null}

                <button
                  className="mcIconBtn"
                  type="button"
                  title="Close focus"
                  onClick={() => handleToggleFocus(focusedInstitutionId)}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* ✅ Debajo: MISMA ventana ThesisSearch, LOCKED a esta institución */}
            <div className="mcFocusThesisWindow">
              <ThesisSearch
                key={String(focusedInstitutionId)} // ✅ fuerza remount al cambiar de institución
                lockedInstitutionId={String(focusedInstitution._id)}
                lockedInstitutionName={focusedInstitution.name || "Institution"}
              />
            </div>
          </>
        )}

        {/* ===================== TOP ROW (solo si NO focus) ===================== */}
        {showHeader && (
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
                placeholder="Search institutions by name or country..."
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
                institution{filteredOrdered.length !== 1 ? "s" : ""} found
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
                <span className="mcSortLabelDesktop">
                  {activeSortOption.label}
                </span>
              </button>

              <ul className="dropdown-menu dropdown-menu-end mcDropdownMenu">
                {SORT_OPTIONS.map((opt) => (
                  <li key={opt.key}>
                    <button
                      className={`dropdown-item ${
                        sortBy === opt.key ? "active" : ""
                      }`}
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
        )}

        {/* ===================== GRID: filters + results (NO focus) ===================== */}
        {showHeader && (
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
                  {/* Type */}
                  <div className="mcField">
                    <div className="mcFieldLabel">Institution type</div>

                    <div className="dropdown mcSelectDd">
                      <button
                        className="mcSelectBtn"
                        type="button"
                        data-bs-toggle="dropdown"
                        aria-expanded="false"
                      >
                        <span className="mcSelectText">{typeLabel}</span>
                        <ChevronDown size={18} />
                      </button>

                      <ul className="dropdown-menu mcDropdownMenu w-100">
                        {typeOptions.map((t) => (
                          <li key={t}>
                            <button
                              type="button"
                              className={`dropdown-item ${
                                type === t ? "active" : ""
                              }`}
                              onClick={() => {
                                setPage(1);
                                setType(t);
                              }}
                            >
                              {t === "all" ? "All Types" : formatType(t)}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Country */}
                  <div className="mcField">
                    <div className="mcFieldLabel">Country</div>

                    <div className="dropdown mcSelectDd">
                      <button
                        className="mcSelectBtn"
                        type="button"
                        data-bs-toggle="dropdown"
                        aria-expanded="false"
                      >
                        <span className="mcSelectText">{countryLabel}</span>
                        <ChevronDown size={18} />
                      </button>

                      <ul className="dropdown-menu mcDropdownMenu w-100">
                        {countryOptions.map((c) => (
                          <li key={c}>
                            <button
                              type="button"
                              className={`dropdown-item ${
                                country === c ? "active" : ""
                              }`}
                              onClick={() => {
                                setPage(1);
                                setCountry(c);
                              }}
                            >
                              {c === "all" ? "All Countries" : c}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Membership */}
                  <div className="mcField">
                    <div className="mcFieldLabel">Membership</div>

                    <div className="mcPills">
                      <button
                        type="button"
                        className={`mcPill ${onlyMembers ? "is-active" : ""}`}
                        onClick={() => {
                          setPage(1);
                          setOnlyMembers((v) => !v);
                        }}
                      >
                        Only active
                      </button>

                      <button
                        type="button"
                        className={`mcPill ${!onlyMembers ? "is-active" : ""}`}
                        onClick={() => {
                          setPage(1);
                          setOnlyMembers(false);
                        }}
                      >
                        All
                      </button>
                    </div>
                  </div>

                  {/* Clear */}
                  <div className="mcFiltersActions">
                    <button
                      className="mcClearBtn"
                      type="button"
                      onClick={() => {
                        setQuery("");
                        setType("all");
                        setCountry("all");
                        setOnlyMembers(false);
                        setSortBy("name_az");
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
                {institutionsToRender.map((i, idx) => {
                  const rowKey = `${i._id}-${start + idx}`;
                  const thesisCount = thesisCounts[i._id] ?? 0;

                  const tone = i.isMember ? "active" : "inactive";
                  const statusLabel = i.isMember ? "Active" : "Inactive";

                  return (
                    <article
                      key={rowKey}
                      className={`mcCard mcInstCard ${tone}`}
                    >
                      <div className="mcCardTop">
                        <div className="mcStatus">
                          <span className={`mcStatusDot ${tone}`} />
                          <span className="mcStatusLabel">{statusLabel}</span>
                        </div>
                        <div className="mcYear mcInstRightTop">
                          {i.country || "—"}
                        </div>
                      </div>

                      <div className="mcCardBody">
                        <div className="mcInstTitleRow">
                          <span className="mcInstTitleIcon" aria-hidden="true">
                            {i.logoUrl ? (
                              <img
                                src={i.logoUrl}
                                alt="Institution logo"
                                width="60"
                                height="60"
                                style={{
                                  width: 60,
                                  height: 60,
                                  objectFit: "cover",
                                  borderRadius: 14,
                                }}
                              />
                            ) : (
                              <div
                                style={{
                                  width: 60,
                                  height: 60,
                                  borderRadius: 14,
                                  background: "#1b1b1b",
                                  display: "grid",
                                  placeItems: "center",
                                  color: "#9aa0a6",
                                  fontSize: 12,
                                }}
                              >
                                Logo
                              </div>
                            )}
                          </span>

                          <h3
                            className="mcCardTitle mcInstTitle"
                            title={i.name}
                          >
                            {i.name}
                          </h3>
                        </div>

                        <div className="mcCardMeta mcInstMeta mt-2">
                          <div
                            className="mcMetaRow"
                            title={formatType(i.type)}
                          >
                            <span className="mcMetaIcon" aria-hidden="true">
                              <School size={18} />
                            </span>
                            <span className="mcMetaText">
                              {formatType(i.type) || "—"}
                            </span>
                          </div>

                          <div className="mcMetaRow" title={i.country || ""}>
                            <span className="mcMetaIcon" aria-hidden="true">
                              <MapPinned size={18} />
                            </span>
                            <span className="mcMetaText">
                              {i.country || "—"}
                            </span>
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
                              onClick={() => alert("Demo: View institution")}
                            >
                              <Eye size={18} />
                            </button>

                            <button
                              type="button"
                              className="mcIconBtn"
                              title="Open focus"
                              onClick={() => handleToggleFocus(i._id)}
                            >
                              <BookSearch size={18} />
                            </button>

                            {i.website ? (
                              <a
                                href={i.website}
                                className="mcIconBtn mcIconBtnLink"
                                target="_blank"
                                rel="noreferrer"
                                title="Open website"
                              >
                                <Globe size={18} />
                              </a>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}

                {institutionsToRender.length === 0 && (
                  <div className="mcMuted">No institutions found.</div>
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
                      className={`mcPagerNum ${
                        p === currentPage ? "is-active" : ""
                      }`}
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
        )}
      </div>
    </div>
  );
};

export default InstitutionsSearch;
