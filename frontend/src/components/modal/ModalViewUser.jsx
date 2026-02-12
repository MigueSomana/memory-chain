// ModalViewUser.jsx
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  User,
  Mail,
  BadgeCheck,
  Clock3,
  OctagonAlert,
  CircleX,
  BarChart3,
  Copy,
  Check,
  CalendarDays,
} from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

const safeStr = (v) => String(v ?? "").trim();

const normalizeStatus = (s) =>
  String(s || "PENDING")
    .trim()
    .toUpperCase();

// ✅ MISMA FORMA que ModalViewThesis (month long, day 2-digit, year numeric)
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

// ============ helpers robustos ============
function getAnyId(v) {
  if (!v) return null;
  if (typeof v === "string") return v;
  if (typeof v === "object" && v.$oid) return String(v.$oid);
  if (typeof v === "object" && v._id) return getAnyId(v._id);
  if (typeof v === "object" && v.id) return String(v.id);
  return null;
}

// ============ STATUS PILL (igual a tu FormProfile) ============
const StatusPill = ({ status }) => {
  const up = normalizeStatus(status);

  let label = "Pending";
  let cls = "mcSheetStatus mcSheetStatus--pending";
  let Icon = Clock3;

  if (up === "APPROVED" || up === "VERIFIED") {
    label = "Verified";
    cls = "mcSheetStatus mcSheetStatus--approved";
    Icon = BadgeCheck;
  } else if (up === "REJECTED") {
    label = "Rejected";
    cls = "mcSheetStatus mcSheetStatus--rejected";
    Icon = OctagonAlert;
  } else {
    label = "Pending";
    cls = "mcSheetStatus mcSheetStatus--pending";
    Icon = Clock3;
  }

  return (
    <div className={cls} title={label}>
      <span className="mcSheetStatusIcon">
        <Icon size={16} />
      </span>
      <span className="mcSheetStatusText">{label}</span>
    </div>
  );
};

function ModalViewUser({ user, institutionId }) {
  const u = user || {};

  const userId = useMemo(() => safeStr(u?._id), [u?._id]);

  // ✅ status del usuario EN ESA institucion (educationalEmails[].status)
  const statusInInstitution = useMemo(() => {
    const edu = u?.educationalEmails;
    if (!Array.isArray(edu) || !edu.length || !institutionId) return "PENDING";

    const found = edu.find((e) => {
      const instRef = e?.institution;
      const id =
        typeof instRef === "string" ? instRef : String(instRef?._id ?? "");
      return String(id) === String(institutionId);
    });

    return normalizeStatus(found?.status || "PENDING");
  }, [u?.educationalEmails, institutionId]);

  // avatar url (img / imgUrl)
  const imgUrl = useMemo(
    () => safeStr(u?.imgUrl || u?.img || u?.avatar || ""),
    [u?.imgUrl, u?.img, u?.avatar],
  );

  const fullName = useMemo(() => {
    const n = safeStr(u?.name);
    const l = safeStr(u?.lastname);
    const out = `${n} ${l}`.trim();
    return out || "—";
  }, [u?.name, u?.lastname]);

  const emailRaw = useMemo(() => safeStr(u?.email), [u?.email]);
  const emailHref = useMemo(
    () => (emailRaw ? `mailto:${emailRaw}` : ""),
    [emailRaw],
  );

  // ✅ antes: formatDateDMY -> ahora: formatDateShort (igual a Thesis)
  const joinedSince = useMemo(
    () => formatDateShort(u?.createdAt),
    [u?.createdAt],
  );

  // ✅ stats desde tesis (misma lógica base de tu FormProfile)
  const [thesisCount, setThesisCount] = useState(0);
  const [likesTotal, setLikesTotal] = useState(0);
  const [citationsTotal, setCitationsTotal] = useState(0);

  useEffect(() => {
    const fetchUserThesesAndStats = async () => {
      try {
        if (!userId) {
          setThesisCount(0);
          setLikesTotal(0);
          setCitationsTotal(0);
          return;
        }

        const tokenLocal = localStorage.getItem("memorychain_token");
        const headers = tokenLocal
          ? { Authorization: `Bearer ${tokenLocal}` }
          : undefined;

        const r = await axios.get(
          `${API_BASE_URL}/api/theses`,
          headers ? { headers } : undefined,
        );

        const list = Array.isArray(r.data)
          ? r.data
          : Array.isArray(r.data?.items)
            ? r.data.items
            : Array.isArray(r.data?.theses)
              ? r.data.theses
              : [];

        const myId = userId;

        const isMine = (t) => {
          const candidates = [
            t?.user,
            t?.createdBy,
            t?.idUser,
            t?.owner,
            t?.author,
            t?.uploadBy,
            t?.uploadby,
            t?.uploadedBy,
            t?.uploader,
          ];

          for (const c of candidates) {
            if (!c) continue;
            if (typeof c === "string" && c === myId) return true;
            if (typeof c === "object" && c?._id === myId) return true;
          }

          if (Array.isArray(t?.authors)) {
            if (t.authors.some((a) => a === myId || a?._id === myId))
              return true;
          }

          if (Array.isArray(t?.author)) {
            if (t.author.some((a) => a === myId || a?._id === myId))
              return true;
          }

          const upId = getAnyId(t?.uploadedBy) || getAnyId(t?.uploadBy);
          if (upId && String(upId) === String(myId)) return true;

          return false;
        };

        const mine = list.filter(isMine);

        setThesisCount(mine.length);

        const cTotal = mine.reduce((acc, t) => {
          const q = Number(t?.quotes ?? t?.citations ?? t?.stats?.quotes ?? 0);
          return acc + (Number.isFinite(q) ? q : 0);
        }, 0);
        setCitationsTotal(cTotal);

        const lTotal = mine.reduce((acc, t) => {
          const likesArr = Array.isArray(t?.likes) ? t.likes.length : null;
          const likesNum = Number(
            t?.likesCount ?? t?.likes ?? t?.stats?.likes ?? 0,
          );
          const val =
            likesArr !== null
              ? likesArr
              : Number.isFinite(likesNum)
                ? likesNum
                : 0;
          return acc + val;
        }, 0);
        setLikesTotal(lTotal);
      } catch (e) {
        console.warn("No se pudo cargar stats de user", e);
        setThesisCount(0);
        setLikesTotal(0);
        setCitationsTotal(0);
      }
    };

    fetchUserThesesAndStats();
  }, [userId]);

  // Copy ID
  const [idCopied, setIdCopied] = useState(false);
  const copyUserId = async () => {
    if (!userId) return;
    try {
      await navigator.clipboard.writeText(userId);
      setIdCopied(true);
      window.setTimeout(() => setIdCopied(false), 900);
    } catch (e) {
      console.warn("Failed to copy user ID", e);
    }
  };

  return (
    <div
      className="modal fade"
      id="modalViewUser"
      tabIndex="-1"
      aria-labelledby="modalViewUserLabel"
      aria-hidden="true"
    >
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content mcSheetModal">
          <div className="mcPanelCard mcSheetPanel">
            {/* HEADER */}
            <div className="mcPanelHead">
              <div className="mcPanelHeadLeft">
                <div className="mcPanelIcon">
                  <User />
                </div>

                <div className="mcSheetHeadTitles">
                  <h5 id="modalViewUserLabel" className="m-0">
                    User profile
                  </h5>
                </div>
              </div>

              <div className="mcPanelHeadRight d-flex align-items-center gap-2">
                <StatusPill status={statusInInstitution} />
              </div>
            </div>

            {/* BODY */}
            <div className="mcPanelBody mcSheetBody">
              <aside className="mcSheetRightBare mcUserSheetSingle">
                {/* IDENTITY */}
                <div className="mcSheetBlock">
                  <div className="mcSheetSideHead">
                    <User size={16} />
                    <span>IDENTITY</span>
                  </div>

                  {/* ✅ 2 columnas: LEFT = KV | RIGHT = Foto/Nombre/Email */}
                  <div className="mcSheetKvGrid mcSheetKvGrid2">
                    <div className="mcSheetKv mcSheetInstTop mcUserInstTop">
                      <div className="mcSheetMembLogo" title={fullName}>
                        {imgUrl ? (
                          <img src={imgUrl} alt={fullName} draggable={false} />
                        ) : (
                          <span className="mcSheetMembLogo">
                            {(safeStr(u?.name)[0] || "U").toUpperCase()}
                            {(safeStr(u?.lastname)[0] || "").toUpperCase()}
                          </span>
                        )}
                      </div>

                      <div className="mcSheetInstInfo">
                        <div className="mcSheetInstName mx-1">{u?.name}</div>
                        <div className="mcSheetInstName mx-1">{u?.lastname}</div>
                        <div className="mcSheetInstSub">
                          {emailRaw ? (
                            <a
                              className="mcLink"
                              href={emailHref}
                              title={`Send email to ${emailRaw}`}
                            >
                              <span className="mcUserEmailLine">
                                <Mail size={14} className="mx-1" /> {emailRaw}
                              </span>
                            </a>
                          ) : (
                            <span className="mcUserEmailLine">
                              <Mail size={14} className="mx-1" /> —
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* LEFT: UserID + Joined (KV GRID) */}
                    <div className="mcSheetKv--right">
                      <div className="mcSheetKvLabel">
                        <span className="d-inline-flex align-items-center gap-2">
                          <CalendarDays size={14} /> Joined since
                        </span>
                      </div>
                      <div className="mcSheetKvValue">{joinedSince}</div>

                      <div className="mcSheetKvLabel mt-1">
                        <span className="d-inline-flex align-items-center gap-2">
                          <User size={14} /> User ID
                        </span>
                      </div>

                      <div className="mcSheetKvValueId mcUserIdRow">
                        {userId ? (
                          <button
                            type="button"
                            className={`mcHashCopyBtn ${idCopied ? "is-copied" : ""}`}
                            onClick={copyUserId}
                            title="Copy user id"
                            aria-label="Copy user id"
                          >
                            {idCopied ? <Check size={12} /> : <Copy size={12} />}
                          </button>
                        ) : null}
                        <span title={userId || ""}>{userId || "—"}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mcSheetSideDivider" />

                {/* STATISTICS */}
                <div className="mcSheetBlock">
                  <div className="mcSheetSideHead">
                    <BarChart3 size={16} />
                    <span>STATISTICS</span>
                  </div>

                  <div className="mcSheetStatsGrid mcSheetStatsGrid--3">
                    <div className="mcSheetStatCard">
                      <div className="mcSheetStatNum">
                        {Number(thesisCount) || 0}
                      </div>
                      <div className="mcSheetStatLbl">Theses</div>
                    </div>

                    <div className="mcSheetStatCard">
                      <div className="mcSheetStatNum">
                        {Number(likesTotal) || 0}
                      </div>
                      <div className="mcSheetStatLbl">Likes</div>
                    </div>

                    <div className="mcSheetStatCard">
                      <div className="mcSheetStatNum">
                        {Number(citationsTotal) || 0}
                      </div>
                      <div className="mcSheetStatLbl">Citations</div>
                    </div>
                  </div>
                </div>
              </aside>
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

export default ModalViewUser;