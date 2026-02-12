import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Globe,
  University,
  Info,
  MapPin,
  Layers,
  CalendarDays,
  BarChart3,
  BadgeCheck,
  CircleX,
  Clock3,
} from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

const safeStr = (v) => String(v ?? "").trim();

const toSentenceCase = (v) => {
  const s = String(v ?? "").trim();
  if (!s) return "—";
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
};

// ✅ MISMA FORMA que en ModalViewThesis (month long, day 2-digit, year numeric)
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

const normalizeStatus = (s) => safeStr(s).toUpperCase();

// ✅ MISMA LÓGICA ROBUSTA DE MEMBERSHIP (como PanelUniversity)
const resolveIsMember = (inst) => {
  const x = inst || {};
  const active =
    !!x?.isMember ||
    !!x?.membershipActive ||
    !!x?.isMembershipActive ||
    !!x?.membership?.isActive ||
    !!x?.membership?.active ||
    !!x?.planActive ||
    !!x?.isActiveMembership;
  return !!active;
};

/**
 * ACTIVE/INACTIVE pill usando tus colores existentes:
 * - Activo: usa mcSheetStatus--approved (verde)
 * - Inactivo: usa mcSheetStatus--rejected (rojo)
 */
const MemberPill = ({ isMember }) => {
  const active = !!isMember;

  const label = active ? "Active" : "Inactive";
  const cls = active
    ? "mcSheetStatus mcSheetStatus--approved"
    : "mcSheetStatus mcSheetStatus--rejected";
  const Icon = active ? BadgeCheck : CircleX;

  return (
    <div className={cls} title={label}>
      <span className="mcSheetStatusIcon">
        <Icon size={16} />
      </span>
      <span className="mcSheetStatusText">{label}</span>
    </div>
  );
};

function ModalViewInstitution({ institution }) {
  const inst = institution || {};

  const institutionId = useMemo(() => {
    if (!inst) return "";
    if (typeof inst === "string") return safeStr(inst);
    return safeStr(inst?._id) || "";
  }, [inst]);

  const hasInstitution = useMemo(
    () => Boolean(safeStr(institutionId)),
    [institutionId],
  );

  // ✅ State local para poder “corregir” membership (como el dashboard)
  const [instData, setInstData] = useState(inst || null);
  const [memberChecked, setMemberChecked] = useState(false);
  const [isMember, setIsMember] = useState(resolveIsMember(inst));

  // ✅ 1) MEMBERSHIP CHECK (idéntico enfoque)
  useEffect(() => {
    const checkMembership = async () => {
      try {
        setMemberChecked(false);

        const local = inst || {};
        const activeLocal = resolveIsMember(local);

        // si ya viene activo, listo
        if (activeLocal) {
          setIsMember(true);
          setInstData(local);
          return;
        }

        // si no viene activo, intentamos refrescar desde API
        if (institutionId) {
          try {
            const res = await axios.get(
              `${API_BASE_URL}/api/institutions/${institutionId}`,
            );
            const fresh = res.data || null;
            setInstData(fresh);
            setIsMember(resolveIsMember(fresh));
          } catch (e) {
            console.warn("Error fetching institution for membership:", e);
            setInstData(local);
            setIsMember(!!activeLocal);
          }
        } else {
          setInstData(local);
          setIsMember(!!activeLocal);
        }
      } finally {
        setMemberChecked(true);
      }
    };

    checkMembership();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [institutionId]);

  // si cambia prop institution, mantenemos instData base
  useEffect(() => {
    setInstData(inst || null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [institutionId]);

  // ✅ aquí cambia la fecha: misma lógica que Thesis
  const created = useMemo(
    () => formatDateShort(instData?.createdAt),
    [instData?.createdAt],
  );

  // departments: Array (puede venir como array de strings u objetos)
  const departments = useMemo(() => {
    const arr = instData?.departments;
    if (!Array.isArray(arr) || !arr.length) return [];
    return arr
      .map((d) => {
        if (typeof d === "string") return safeStr(d);
        return safeStr(d?.name || d?.title || d?._id || "");
      })
      .filter(Boolean);
  }, [instData?.departments]);

  // website (normaliza para link)
  const website = useMemo(() => {
    const w = safeStr(instData?.website);
    if (!w) return "";
    if (/^https?:\/\//i.test(w)) return w;
    return `https://${w}`;
  }, [instData?.website]);

  // ✅ STATS
  const [thesesCount, setThesesCount] = useState("—");
  const [studentsCount, setStudentsCount] = useState("—");

  // theses count: NO REJECTED
  useEffect(() => {
    const loadThesesCount = async () => {
      try {
        if (!institutionId) {
          setThesesCount("—");
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

          const st = normalizeStatus(th?.status);
          const notRejected = st !== "REJECTED";

          if (thInstId === String(institutionId) && notRejected) return acc + 1;
          return acc;
        }, 0);

        setThesesCount(count);
      } catch (e) {
        console.warn("No se pudo calcular theses count", e);
        setThesesCount("—");
      }
    };

    loadThesesCount();
  }, [institutionId]);

  // students count: usar endpoint como PanelUniversity si existe
  useEffect(() => {
    const loadStudentsCount = async () => {
      try {
        if (!institutionId) {
          setStudentsCount("—");
          return;
        }

        const tokenLocal = localStorage.getItem("memorychain_token");
        const headers = tokenLocal
          ? { Authorization: `Bearer ${tokenLocal}` }
          : undefined;

        // 1) Preferido: endpoint específico
        try {
          const res = await axios.get(
            `${API_BASE_URL}/api/institutions/${institutionId}/students`,
            headers ? { headers } : undefined,
          );
          const data = Array.isArray(res.data) ? res.data : [];
          setStudentsCount(data.length);
          return;
        } catch (e) {
          console.warn(
            "No se pudo obtener students count desde endpoint específico, intentando fallback general:",
            e,
          );
          // seguimos a fallback
        }

        // 2) Fallback general: /api/users (si existe)
        const res2 = await axios.get(
          `${API_BASE_URL}/api/users`,
          headers ? { headers } : undefined,
        );
        const list = Array.isArray(res2.data) ? res2.data : [];

        const count = list.reduce((acc, u) => {
          const directInst = u?.institution;
          const directId =
            typeof directInst === "string"
              ? String(directInst)
              : String(directInst?._id ?? "");

          const edu = u?.educationalEmails;
          const hasEdu = Array.isArray(edu)
            ? edu.some((e) => {
                const instRef = e?.institution;
                const instId =
                  typeof instRef === "string"
                    ? String(instRef)
                    : String(instRef?._id ?? "");
                return instId === String(institutionId);
              })
            : false;

          if (directId === String(institutionId) || hasEdu) return acc + 1;
          return acc;
        }, 0);

        setStudentsCount(count);
      } catch (e) {
        console.warn("No se pudo calcular students count", e);
        setStudentsCount("—");
      }
    };

    loadStudentsCount();
  }, [institutionId]);

  // ✅ “quitamos metadata” y lo pasamos a IDENTITY (Right) como KV grid
  const identityCountry = useMemo(
    () => safeStr(instData?.country) || "—",
    [instData?.country],
  );
  const identityType = useMemo(
    () => toSentenceCase(instData?.type),
    [instData?.type],
  );
  const identityWebsiteLabel = useMemo(
    () => safeStr(instData?.website) || "—",
    [instData?.website],
  );

  return (
    <div
      className="modal fade"
      id="modalViewInstitution"
      tabIndex="-1"
      aria-labelledby="modalViewInstitutionLabel"
      aria-hidden="true"
    >
      <div className="modal-dialog modal-lg modal-dialog-centered">
        <div className="modal-content mcSheetModal">
          <div className="mcPanelCard mcSheetPanel">
            {/* HEADER */}
            <div className="mcPanelHead">
              <div className="mcPanelHeadLeft">
                <div className="mcPanelIcon">
                  <University />
                </div>

                <div className="mcSheetHeadTitles">
                  <h5 id="modalViewInstitutionLabel" className="m-0">
                    Institution profile
                  </h5>
                </div>
              </div>

              <div className="mcPanelHeadRight d-flex align-items-center gap-2">
                {/* ✅ membership como dashboard (robusto) */}
                <MemberPill isMember={isMember} />
              </div>
            </div>

            {/* BODY */}
            <div className="mcPanelBody mcSheetBody">
              <div className="mcSheetGrid2">
                {/* LEFT */}
                <div className="mcSheetLeft">
                  {/* NAME */}
                  <div className="mcSheetSection">
                    <div className="mcSheetSecHead">
                      <University size={16} />
                      <span>NAME</span>
                    </div>
                    <div className="mcSheetTitle pt-2">
                      {safeStr(instData?.name) || "—"}
                    </div>
                  </div>

                  <div className="mcSheetDivider" />

                  {/* DESCRIPTION */}
                  <div className="mcSheetSection">
                    <div className="mcSheetSecHead">
                      <Info size={16} />
                      <span>DESCRIPTION</span>
                    </div>
                    <div className="mcSheetText pt-2">
                      {safeStr(instData?.description) || "—"}
                    </div>
                  </div>

                  <div className="mcSheetDivider" />

                  {/* DEPARTMENTS */}
                  <div className="mcSheetSection">
                    <div className="mcSheetSecHead">
                      <Layers size={16} />
                      <span>DEPARTMENTS</span>
                    </div>

                    {departments.length ? (
                      <div className="mcSheetChips pt-2">
                        {departments.map((d) => (
                          <span key={d} className="mcSheetChip">
                            {d}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="mcSheetMuted">—</div>
                    )}
                  </div>
                </div>

                <div className="mcSheetVSplit" aria-hidden="true" />

                {/* RIGHT */}
                <aside className="mcSheetRightBare">
                  {/* IDENTITY */}
                  {hasInstitution ? (
                    <div className="mcSheetBlock">
                      <div className="mcSheetSideHead">
                        <University size={16} />
                        <span>IDENTITY</span>
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
                            {identityCountry !== "—" ? identityCountry : "—"}
                          </div>
                        </div>
                      </div>

                      <div className="mcSheetKvGrid">
                        <div className="mcSheetKv">
                          <div className="mcSheetKvLabel">
                            <span className="d-inline-flex align-items-center gap-2">
                              <MapPin size={14} /> Country
                            </span>
                          </div>
                          <div className="mcSheetKvValue">{identityCountry}</div>
                        </div>

                        <div className="mcSheetKv mcSheetKv--right">
                          <div className="mcSheetKvLabel">
                            <span className="d-inline-flex align-items-center gap-2">
                              <Layers size={14} /> Type
                            </span>
                          </div>
                          <div className="mcSheetKvValue">{identityType}</div>
                        </div>

                        <div className="mcSheetKv">
                          <div className="mcSheetKvLabel">
                            <span className="d-inline-flex align-items-center gap-2">
                              <CalendarDays size={14} /> Joined since
                            </span>
                          </div>
                          <div className="mcSheetKvValue">{created}</div>
                        </div>

                        <div className="mcSheetKv mcSheetKv--right">
                          <div className="mcSheetKvLabel">
                            <span className="d-inline-flex align-items-center gap-2">
                              <Globe size={14} /> Website
                            </span>
                          </div>
                          <div className="mcSheetKvValue">
                            {website ? (
                              <a
                                href={website}
                                target="_blank"
                                rel="noreferrer"
                                className="mcLink"
                                title={identityWebsiteLabel}
                              >
                                {identityWebsiteLabel}
                              </a>
                            ) : (
                              "—"
                            )}
                          </div>
                        </div>
                      </div>

                      {!memberChecked ? (
                        <div className="mcSheetMuted pt-2 d-flex align-items-center gap-2">
                          <Clock3 size={14} /> Checking membership…
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="mcSheetSideDivider" />

                  {/* STATISTICS */}
                  <div className="mcSheetBlock">
                    <div className="mcSheetSideHead">
                      <BarChart3 size={16} />
                      <span>STATISTICS</span>
                    </div>

                    <div className="mcSheetStatsGrid">
                      <div className="mcSheetStatCard">
                        <div className="mcSheetStatNum">
                          {Number(thesesCount) || 0}
                        </div>
                        <div className="mcSheetStatLbl">Theses</div>
                      </div>

                      <div className="mcSheetStatCard">
                        <div className="mcSheetStatNum">
                          {Number(studentsCount) || 0}
                        </div>
                        <div className="mcSheetStatLbl">Members</div>
                      </div>
                    </div>
                  </div>
                </aside>
              </div>
            </div>

            {/* FOOTER */}
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
              </div>
            </div>
          </div>
          {/* mcPanelCard */}
        </div>
      </div>
    </div>
  );
}

export default ModalViewInstitution;