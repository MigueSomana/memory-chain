import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Eye,
  Users,
  User,
  GraduationCap,
  BarChart3,
  KeyRound,
  TypeOutline,
  BookMarked,
  QrCode,
  CalendarDays,
  University,
  TextSearch,
  Languages,
  RectangleEllipsis,
  BadgeCheck,
  Clock3,
  OctagonAlert,
  CircleX,
} from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

const safeStr = (v) => String(v ?? "").trim();

const joinPeopleArr = (arr) => {
  if (!Array.isArray(arr) || arr.length === 0) return [];
  return arr
    .map((p) => `${safeStr(p?.name)} ${safeStr(p?.lastname)}`.trim())
    .filter(Boolean);
};

const joinKeywords = (arr) => {
  if (!Array.isArray(arr) || arr.length === 0) return [];
  return arr.map((k) => safeStr(k)).filter(Boolean);
};

const toSentenceCase = (v) => {
  const s = String(v ?? "").trim();
  if (!s) return "—";
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
};

const formatDateShort = (d) => {
  if (!d) return "—";
  try {
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return "—";
    return dt.toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "2-digit",
    });
  } catch {
    return "—";
  }
};

const LANGUAGE_MAP = {
  en: "English",
  es: "Spanish",
  fr: "French",
  pt: "Portuguese",
  ch: "Chinese",
  ko: "Korean",
  ru: "Russian",
};

const languageLabel = (code) => {
  const k = safeStr(code).toLowerCase();
  return LANGUAGE_MAP[k] || (k ? k.toUpperCase() : "—");
};

const normalizeStatus = (s) => safeStr(s).toUpperCase();

const StatusPill = ({ status }) => {
  const up = normalizeStatus(status);

  let label = "Unknown";
  let cls = "mcSheetStatus mcSheetStatus--unknown";
  let Icon = null;

  if (up === "APPROVED") {
    label = "Approved";
    cls = "mcSheetStatus mcSheetStatus--approved";
    Icon = BadgeCheck;
  } else if (up === "PENDING") {
    label = "Pending";
    cls = "mcSheetStatus mcSheetStatus--pending";
    Icon = Clock3;
  } else if (up === "REJECTED") {
    label = "Rejected";
    cls = "mcSheetStatus mcSheetStatus--rejected";
    Icon = OctagonAlert;
  }

  return (
    <div className={cls} title={label}>
      {Icon && (
        <span className="mcSheetStatusIcon">
          <Icon size={16} />
        </span>
      )}
      <span className="mcSheetStatusText">{label}</span>
    </div>
  );
};

function ModalViewThesis({ thesis }) {
  const t = thesis || {};

  const keywords = useMemo(() => joinKeywords(t?.keywords), [t?.keywords]);
  const authorsList = useMemo(() => joinPeopleArr(t?.authors), [t?.authors]);
  const tutorsList = useMemo(() => joinPeopleArr(t?.tutors), [t?.tutors]);
  const hasTutors = useMemo(
    () => Array.isArray(t?.tutors) && t.tutors.length > 0,
    [t?.tutors],
  );

  const langHuman = useMemo(() => languageLabel(t?.language), [t?.language]);
  const thesisDate = useMemo(() => formatDateShort(t?.date), [t?.date]);

  const institutionId = useMemo(() => {
    const inst = t?.institution;
    if (!inst) return "";
    if (typeof inst === "string") return safeStr(inst);
    return safeStr(inst?._id) || "";
  }, [t?.institution]);

  const hasInstitution = useMemo(
    () => Boolean(safeStr(institutionId)),
    [institutionId],
  );

  const [instData, setInstData] = useState(null);
  const [instApprovedCount, setInstApprovedCount] = useState("—");

  useEffect(() => {
    const loadInstitution = async () => {
      try {
        if (!institutionId) {
          setInstData(null);
          return;
        }
        const res = await axios.get(
          `${API_BASE_URL}/api/institutions/${institutionId}`,
        );
        setInstData(res.data || null);
      } catch (e) {
        console.warn("No se pudo cargar institution", e);
        setInstData(null);
      }
    };
    loadInstitution();
  }, [institutionId]);

  useEffect(() => {
    const loadApprovedCount = async () => {
      try {
        if (!institutionId) {
          setInstApprovedCount("—");
          return;
        }
        const res = await axios.get(`${API_BASE_URL}/api/theses`);
        const list = Array.isArray(res.data) ? res.data : [];

        const count = list.reduce((acc, th) => {
          const thInst = th?.institution;
          const thInstId =
            typeof thInst === "string"
              ? String(thInst)
              : String(thInst?._id ?? "");
          const st = String(th?.status || "").toUpperCase();

          if (thInstId === String(institutionId) && st === "APPROVED")
            return acc + 1;
          return acc;
        }, 0);

        setInstApprovedCount(count);
      } catch (e) {
        console.warn("No se pudo calcular approved theses", e);
        setInstApprovedCount("—");
      }
    };
    loadApprovedCount();
  }, [institutionId]);

  const dept = useMemo(() => {
    const a = safeStr(t?.department);
    if (a) return a;
    const b = safeStr(instData?.department);
    return b || "—";
  }, [t?.department, instData?.department]);

  const typ = useMemo(() => {
    const a = safeStr(t?.type);
    if (a) return a;
    const b = safeStr(instData?.type);
    return b || "—";
  }, [t?.type, instData?.type]);

  const instCreated = useMemo(
    () => formatDateShort(instData?.createdAt),
    [instData?.createdAt],
  );

  // ✅ AJUSTE MINIMO: ahora soporta quotes como contador de citas
  const citationsCount =
    t?.stats?.quotes ??
    t?.stats?.citations ??
    t?.quotes ??
    t?.citations ??
    0;

  const likesCount = t?.stats?.likes ?? t?.likes ?? 0;

  return (
    <div
      className="modal fade"
      id="modalViewThesis"
      tabIndex="-1"
      aria-labelledby="modalViewThesisLabel"
      aria-hidden="true"
    >
      <div className="modal-dialog modal-xl modal-dialog-centered">
        <div className="modal-content mcSheetModal">
          {/* UN SOLO PANEL */}
          <div className="mcPanelCard mcSheetPanel">
            {/* HEADER estilo Account Settings */}
            <div className="mcPanelHead">
              <div className="mcPanelHeadLeft">
                <div className="mcPanelIcon">
                  <BookMarked />
                </div>

                <div className="mcSheetHeadTitles">
                  <h5 id="modalViewLabel" className="m-0">
                    Thesis technical sheet
                  </h5>
                </div>
              </div>

              <div className="mcPanelHeadRight d-flex align-items-center gap-2">
                <StatusPill status={t?.status} />
              </div>
            </div>

            {/* BODY con padding + 2 columnas + DIVIDER central */}
            <div className="mcPanelBody mcSheetBody">
              <div className="mcSheetGrid2">
                {/* LEFT (contenido) */}
                <div className="mcSheetLeft">
                  {/* TITLE */}
                  <div className="mcSheetSection">
                    <div className="mcSheetSecHead">
                      <TypeOutline size={16} />
                      <span>TITLE</span>
                    </div>
                    <div className="mcSheetTitle pt-2">
                      {safeStr(t?.title) || "—"}
                    </div>
                  </div>

                  <div className="mcSheetDivider" />

                  {/* ABSTRACT */}
                  <div className="mcSheetSection">
                    <div className="mcSheetSecHead">
                      <TextSearch size={16} />
                      <span>ABSTRACT</span>
                    </div>
                    <div className="mcSheetText pt-2">
                      {safeStr(t?.summary) || "—"}
                    </div>
                  </div>

                  <div className="mcSheetDivider" />

                  {/* KEYWORDS */}
                  <div className="mcSheetSection">
                    <div className="mcSheetSecHead">
                      <KeyRound size={16} />
                      <span>KEYWORDS</span>
                    </div>

                    {keywords.length ? (
                      <div className="mcSheetChips pt-2">
                        {keywords.map((k) => (
                          <span key={k} className="mcSheetChip">
                            {k}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="mcSheetMuted">—</div>
                    )}
                  </div>

                  <div className="mcSheetDivider" />

                  {/* METADATA */}
                  <div className="mcSheetSection">
                    <div className="mcSheetSecHead">
                      <QrCode size={16} />
                      <span>METADATA</span>
                    </div>

                    <div className="mcSheetMetaGrid pt-2">
                      <div className="mcSheetMetaCard">
                        <div className="mcSheetMetaTop">
                          <RectangleEllipsis size={12} />
                          Field
                        </div>
                        <div className="mcSheetMetaVal">
                          {safeStr(t?.field) || "—"}
                        </div>
                      </div>
                      <div className="mcSheetMetaCard">
                        <div className="mcSheetMetaTop">
                          <GraduationCap size={12} />
                          Degree
                        </div>
                        <div className="mcSheetMetaVal">
                          {safeStr(t?.degree) || "—"}
                        </div>
                      </div>
                      <div className="mcSheetMetaCard">
                        <div className="mcSheetMetaTop">
                          <Languages size={12} />
                          Language
                        </div>
                        <div className="mcSheetMetaVal">{langHuman}</div>
                      </div>
                      <div className="mcSheetMetaCard">
                        <div className="mcSheetMetaTop">
                          <CalendarDays size={12} />
                          <span> Date</span>
                        </div>
                        <div className="mcSheetMetaVal">{thesisDate}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mcSheetVSplit" aria-hidden="true" />

                <aside className="mcSheetRightBare">
                  {hasInstitution ? (
                    <div className="mcSheetBlock">
                      <div className="mcSheetSideHead">
                        <University size={16} />
                        <span>INSTITUTION</span>
                      </div>

                      <div className="mcSheetInstTop">
                        <div
                          className="mcSheetInstLogo"
                          title={safeStr(instData?.name) || ""}
                        >
                          {instData?.logoUrl ? (
                            <img
                              src={instData.logoUrl}
                              alt={safeStr(instData?.name) || "Institution"}
                              draggable={false}
                            />
                          ) : (
                            <span>
                              {(safeStr(instData?.name)[0] || "I").toUpperCase()}
                            </span>
                          )}
                        </div>

                        <div className="mcSheetInstInfo">
                          <div className="mcSheetInstName">
                            {safeStr(instData?.name) || "—"}
                          </div>
                          <div className="mcSheetInstSub">
                            {safeStr(instData?.country) || "—"}
                          </div>
                        </div>
                      </div>

                      <div className="mcSheetKvGrid">
                        <div className="mcSheetKv">
                          <div className="mcSheetKvLabel">Department</div>
                          <div className="mcSheetKvValue">{dept}</div>
                        </div>
                        <div className="mcSheetKv mcSheetKv--right">
                          <div className="mcSheetKvLabel">Type</div>
                          <div className="mcSheetKvValue">
                            {toSentenceCase(typ)}
                          </div>
                        </div>
                        <div className="mcSheetKv">
                          <div className="mcSheetKvLabel">Founded</div>
                          <div className="mcSheetKvValue">{instCreated}</div>
                        </div>
                        <div className="mcSheetKv mcSheetKv--right">
                          <div className="mcSheetKvLabel">Approved Theses</div>
                          <div className="mcSheetKvValue mcSheetKvValue--accent">
                            {instApprovedCount}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  <div className="mcSheetSideDivider" />

                  <div className="mcSheetBlock">
                    <div className="mcSheetSideHead">
                      <Users size={16} />
                      <span>AUTHORS</span>
                    </div>

                    <div className="mcSheetPeopleListBare">
                      {authorsList.length ? (
                        authorsList.map((p, idx) => (
                          <div className="mcSheetPersonRowBare" key={`${p}-${idx}`}>
                            <span className="mcSheetAvatarDot">
                              <User size={12} />
                            </span>
                            <span className="mcSheetPersonName">{p}</span>
                          </div>
                        ))
                      ) : (
                        <div className="mcSheetMuted">—</div>
                      )}
                    </div>
                  </div>

                  {hasTutors ? (
                    <>
                      <div className="mcSheetSideDivider" />
                      <div className="mcSheetBlock">
                        <div className="mcSheetSideHead">
                          <GraduationCap size={16} />
                          <span>TUTORS</span>
                        </div>

                        <div className="mcSheetPeopleListBare">
                          {tutorsList.map((p, idx) => (
                            <div className="mcSheetPersonRowBare" key={`${p}-${idx}`}>
                              <span className="mcSheetAvatarDot mcSheetAvatarDot--cap">
                                <User size={12} />
                              </span>
                              <span className="mcSheetPersonName">{p}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  ) : null}

                  <div className="mcSheetSideDivider" />

                  <div className="mcSheetBlock">
                    <div className="mcSheetSideHead">
                      <BarChart3 size={16} />
                      <span>STATISTICS</span>
                    </div>

                    <div className="mcSheetStatsGrid">
                      <div className="mcSheetStatCard">
                        <div className="mcSheetStatNum">
                          {Number(citationsCount) || 0}
                        </div>
                        <div className="mcSheetStatLbl">Citations</div>
                      </div>
                      <div className="mcSheetStatCard">
                        <div className="mcSheetStatNum">
                          {Number(likesCount) || 0}
                        </div>
                        <div className="mcSheetStatLbl">Likes</div>
                      </div>
                    </div>
                  </div>
                </aside>
              </div>
            </div>

            <div className="mcPanelHead mcSheetFooterHead">
              <div className="mcPanelHeadLeft" />
              <div className="mcPanelHeadRight d-flex align-items-center gap-2">
                <button
                  type="button"
                  className="btn btn-outline-memory d-flex align-items-center justify-content-center gap-2"
                  data-bs-dismiss="modal"
                >
                  <span className="d-flex align-items-center">
                    <CircleX size={18} />
                  </span>
                  Close
                </button>

                <a
                  href={`http://localhost:3000/view/${t?._id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-memory d-flex align-items-center justify-content-center gap-2"
                >
                  <span className="d-flex align-items-center">
                    <Eye size={18} />
                  </span>
                  <span>Read Thesis</span>
                </a>
              </div>
            </div>
          </div>
          {/* mcPanelCard */}
        </div>
      </div>
    </div>
  );
}

export default ModalViewThesis;