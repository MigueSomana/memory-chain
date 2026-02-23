// ModalViewUser.jsx
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useToast } from "../../utils/toast";
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

function getAnyId(v) {
  if (!v) return null;
  if (typeof v === "string") return v;
  if (typeof v === "object" && v.$oid) return String(v.$oid);
  if (typeof v === "object" && v._id) return getAnyId(v._id);
  if (typeof v === "object" && v.id) return String(v.id);
  return null;
}

// ============ STATUS PILL ============
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
  const { showToast } = useToast();

  const userId = useMemo(() => safeStr(getAnyId(u?._id) || ""), [u?._id]);

  // ✅ IMPORTANTe: usa educationalEmails (principal) y fallback a __memberStatus
  const statusInInstitution = useMemo(() => {
    const edu = u?.educationalEmails;
    if (Array.isArray(edu) && edu.length && institutionId) {
      const found = edu.find((e) => {
        const instId = getAnyId(e?.institution);
        return instId && String(instId) === String(institutionId);
      });
      if (found?.status) return normalizeStatus(found.status);
    }
    // fallback por si viene sin edu
    if (u?.__memberStatus) return normalizeStatus(u.__memberStatus);
    return "PENDING";
  }, [u?.educationalEmails, u?.__memberStatus, institutionId]);

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
  const emailHref = useMemo(() => (emailRaw ? `mailto:${emailRaw}` : ""), [emailRaw]);

  const joinedSince = useMemo(() => formatDateShort(u?.createdAt), [u?.createdAt]);

  // stats
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
            const cid = getAnyId(c);
            if (cid && String(cid) === String(myId)) return true;
          }

          if (Array.isArray(t?.authors)) {
            if (t.authors.some((a) => getAnyId(a?._id) === myId || a === myId)) return true;
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
          const likesNum = Number(t?.likesCount ?? t?.likes ?? t?.stats?.likes ?? 0);
          const val =
            likesArr !== null ? likesArr : Number.isFinite(likesNum) ? likesNum : 0;
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

  // Copy ID + toast
  const [idCopied, setIdCopied] = useState(false);
  const copyUserId = async () => {
    if (!userId) return;
    try {
      await navigator.clipboard.writeText(userId);
      setIdCopied(true);
      window.setTimeout(() => setIdCopied(false), 900);

      showToast({
        message: "User ID copied",
        type: "success",
        icon: BadgeCheck,
        duration: 2000,
      });
    } catch (e) {
      console.warn("Failed to copy user ID", e);
      showToast({
        message: "Could not copy user ID",
        type: "error",
        icon: OctagonAlert,
        duration: 2200,
      });
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
                            <a className="mcLink" href={emailHref} title={`Send email to ${emailRaw}`}>
                              <span className="mcUserEmailLine mx-1">{emailRaw}</span>
                            </a>
                          ) : (
                            <span className="mcUserEmailLine">
                              <Mail size={14} className="mx-1" /> —
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

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
                      <div className="mcSheetStatNum">{Number(thesisCount) || 0}</div>
                      <div className="mcSheetStatLbl">Theses</div>
                    </div>

                    <div className="mcSheetStatCard">
                      <div className="mcSheetStatNum">{Number(likesTotal) || 0}</div>
                      <div className="mcSheetStatLbl">Likes</div>
                    </div>

                    <div className="mcSheetStatCard">
                      <div className="mcSheetStatNum">{Number(citationsTotal) || 0}</div>
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