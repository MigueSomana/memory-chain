import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  EyeFillIcon,
  CheckCircle,
  CrossCircle,
  TimeCircle,
} from "../../utils/icons";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

const safeStr = (v) => String(v ?? "").trim();
const joinPeople = (arr) => {
  if (!Array.isArray(arr) || arr.length === 0) return "—";
  return arr
    .map((p) => `${safeStr(p?.name)} ${safeStr(p?.lastname)}`.trim())
    .filter(Boolean)
    .join("\n");
};

const joinKeywords = (arr) => {
  if (!Array.isArray(arr) || arr.length === 0) return [];
  return arr.map((k) => safeStr(k)).filter(Boolean);
};

const toSentenceCase = (v) => {
  const s = String(v ?? "").trim();
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
};

// ✅ Formato tipo "Account created" (month long + day 2-digit + year)
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
  let bg = "#f1f3f5";
  let color = "#495057";
  let icon = null;

  if (up === "APPROVED") {
    label = "Approved";
    bg = "#20C997";
    color = "#fff";
    icon = CheckCircle;
  } else if (up === "PENDING") {
    label = "Pending";
    bg = "#ffc107";
    color = "#fff";
    icon = TimeCircle;
  } else if (up === "REJECTED") {
    label = "Rejected";
    bg = "#dc3545";
    color = "#fff";
    icon = CrossCircle;
  }

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "10px 10px",
        borderRadius: 10,
        gap: 10,
        background: bg,
        color,
        fontWeight: 800,
        fontSize: 14,
        lineHeight: 1,
        userSelect: "none",
      }}
      title={label}
    >
      <span>{label}</span>
      {icon ? (
        <span style={{ display: "flex", alignItems: "center" }}>{icon}</span>
      ) : null}
    </div>
  );
};

function ModalView({ thesis }) {
  const t = thesis || {};

  const keywords = useMemo(() => joinKeywords(t?.keywords), [t?.keywords]);
  const authors = useMemo(() => joinPeople(t?.authors), [t?.authors]);
  const tutors = useMemo(() => joinPeople(t?.tutors), [t?.tutors]);
  const hasTutors = useMemo(
    () => Array.isArray(t?.tutors) && t.tutors.length > 0,
    [t?.tutors]
  );
  const langHuman = useMemo(() => languageLabel(t?.language), [t?.language]);

  // ✅ Fecha de publicación (nuevo campo date) formateada igual que "Account created"
  const thesisDate = useMemo(() => formatDateShort(t?.date), [t?.date]);

  // Extraer institutionId desde Thesis (porque en Thesis el campo es ObjectId)
  const institutionId = useMemo(() => {
    const inst = t?.institution;
    if (!inst) return "";
    if (typeof inst === "string") return safeStr(inst);
    // por si en algún lado viene populate
    return safeStr(inst?._id) || "";
  }, [t?.institution]);

  // ✅ ocultar el bloque completo si NO hay institución
  const hasInstitution = useMemo(() => Boolean(safeStr(institutionId)), [institutionId]);

  // Estado institución (se llena con axios)
  const [instData, setInstData] = useState(null);
  const [instApprovedCount, setInstApprovedCount] = useState("—");

  // Cargar institución por ID (GET /api/institutions/:id)
  useEffect(() => {
    const loadInstitution = async () => {
      try {
        if (!institutionId) {
          setInstData(null);
          return;
        }

        const res = await axios.get(
          `${API_BASE_URL}/api/institutions/${institutionId}`
        );
        setInstData(res.data || null);
      } catch (e) {
        console.warn("No se pudo cargar institution", e);
        setInstData(null);
      }
    };

    loadInstitution();
  }, [institutionId]);

  // Calcular approved theses count (sin auth)
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
    [instData?.createdAt]
  );

  return (
    <>
      <div
        className="modal fade modal"
        id="modalView"
        tabIndex="-1"
        aria-labelledby="modalViewLabel"
        aria-hidden="true"
      >
        <div className="modal-dialog modal-lg modal-dialog-centered">
          <div className="modal-content bg-mc-dark text-white">
            <div className="modal-body container mb-4">
              <div className="row">
                <div className="button-close-modal-fix">
                  <button
                    type="button"
                    className="btn-close btn-close-white"
                    data-bs-dismiss="modal"
                    aria-label="Close"
                  />
                </div>

                <div className="col-12 py-3 px-4">
                  {/* HEADER */}
                  <div className="d-flex flex-wrap align-items-start justify-content-between gap-3">
                    <div style={{ maxWidth: 620 }}>
                      <h3 id="modalViewLabel" className="fw-bold mb-1">
                        Thesis technical sheet
                      </h3>
                    </div>

                    <div className="d-flex align-items-center gap-2">
                      <StatusPill status={t?.status} />
                    </div>
                  </div>

                  <div className="mt-3" />

                  {/* CONTENT GRID */}
                  <div className="row g-3">
                    {/* LEFT COLUMN (solo Title + Summary) */}
                    <div
                      className={
                        hasInstitution ? "col-12 col-lg-8" : "col-12 col-lg-8"
                      }
                    >
                      {/* TITLE + SUMMARY */}
                      <div
                        className="p-3"
                        style={{
                          borderRadius: 14,
                          background: "rgba(255,255,255,0.06)",
                          border: "1px solid rgba(255,255,255,0.10)",
                        }}
                      >
                        <div className="text-white-50" style={{ fontSize: 11 }}>
                          TITLE
                        </div>
                        <div
                          className="fw-bold"
                          style={{ fontSize: 18, lineHeight: 1.2 }}
                        >
                          {safeStr(t?.title) || "—"}
                        </div>

                        <div
                          className="mt-3 text-white-50"
                          style={{ fontSize: 11 }}
                        >
                          ABSTRACT
                        </div>
                        <div
                          style={{
                            fontSize: 13,
                            lineHeight: 1.45,
                            opacity: 0.95,
                          }}
                        >
                          {safeStr(t?.summary) || "—"}
                        </div>

                        <div className="col-12 mt-3">
                          <div
                            className="text-white-50"
                            style={{ fontSize: 11 }}
                          >
                            KEYWORDS
                          </div>

                          {keywords.length ? (
                            <div className="d-flex flex-wrap gap-2 mt-1 ">
                              {keywords.map((k) => (
                                <span
                                  key={k}
                                  className="badge"
                                  style={{
                                    background: "rgba(32,201,151,0.18)",
                                    border: "1px solid rgba(32,201,151,0.35)",
                                    color: "#dffcf3",
                                    padding: "8px 10px",
                                    borderRadius: 999,
                                    fontWeight: 700,
                                    fontSize: 12,
                                  }}
                                >
                                  {k}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <div
                              className="text-white-50"
                              style={{ fontSize: 13 }}
                            >
                              —
                            </div>
                          )}
                        </div>

                        <div className="row mt-3">
                          <div className="col-3">
                            <div
                              className="text-white-50"
                              style={{ fontSize: 11 }}
                            >
                              FIELD
                            </div>
                            <div
                              className="fw-semibold"
                              style={{ fontSize: 13 }}
                            >
                              {safeStr(t?.field) || "—"}
                            </div>
                          </div>

                          <div className="col-3 text-center">
                            <div
                              className="text-white-50"
                              style={{ fontSize: 11 }}
                            >
                              DEGREE
                            </div>
                            <div
                              className="fw-semibold"
                              style={{ fontSize: 13 }}
                            >
                              {safeStr(t?.degree) || "—"}
                            </div>
                          </div>

                          <div className="col-3 text-center">
                            <div
                              className="text-white-50"
                              style={{ fontSize: 11 }}
                            >
                              LANGUAGE
                            </div>
                            <div
                              className="fw-semibold"
                              style={{ fontSize: 13 }}
                            >
                              {langHuman}
                            </div>
                          </div>

                          {/* ✅ CAMBIO: YEAR -> DATE con mismo formato que account created */}
                          <div className="col-3 text-end">
                            <div
                              className="text-white-50"
                              style={{ fontSize: 11 }}
                            >
                              DATE
                            </div>
                            <div
                              className="fw-semibold"
                              style={{ fontSize: 13 }}
                            >
                              {thesisDate}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* ✅ RIGHT COLUMN: solo si hay institución */}
                    {hasInstitution ? (
                      <div className="col-12 col-lg-4">
                        {/* INSTITUTION CARD */}
                        <div
                          className="p-3"
                          style={{
                            borderRadius: 14,
                            background: "rgba(255,255,255,0.06)",
                            border: "1px solid rgba(255,255,255,0.10)",
                            position: "relative",
                            overflow: "hidden",
                          }}
                        >
                          <div className="d-flex align-items-start justify-content-between gap-3">
                            <div>
                              <div className="fw-bold" style={{ fontSize: 16 }}>
                                {safeStr(instData?.name) || "—"}
                              </div>
                              <div
                                className="fw-semibold"
                                style={{ fontSize: 13 }}
                              >
                                {safeStr(instData?.country) || "—"}
                              </div>
                            </div>

                            {/* Logo esquina superior derecha */}
                            <div
                              style={{
                                width: 56,
                                height: 56,
                                borderRadius: 12,
                                overflow: "hidden",
                                background: "rgba(255,255,255,0.08)",
                                border: "1px solid rgba(255,255,255,0.10)",
                                flex: "0 0 auto",
                              }}
                              title={safeStr(instData?.name) || ""}
                            >
                              {instData?.logoUrl ? (
                                <img
                                  src={instData.logoUrl}
                                  alt={safeStr(instData?.name) || "Institution"}
                                  style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover",
                                  }}
                                  draggable={false}
                                />
                              ) : (
                                <div
                                  className="w-100 h-100 d-flex align-items-center justify-content-center text-white-50"
                                  style={{ fontSize: 11 }}
                                >
                                  No logo
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="mt-3" />

                          <div className="row g-2">
                            <div className="col-12">
                              <div
                                className="text-white-50"
                                style={{ fontSize: 11 }}
                              >
                                DEPARTMENT
                              </div>
                              <div
                                className="fw-semibold"
                                style={{ fontSize: 13 }}
                              >
                                {dept}
                              </div>
                            </div>
                            <div className="col-12">
                              <div
                                className="text-white-50"
                                style={{ fontSize: 11 }}
                              >
                                TYPE
                              </div>
                              <div
                                className="fw-semibold"
                                style={{ fontSize: 13 }}
                              >
                                {toSentenceCase(typ)}
                              </div>
                            </div>

                            <div className="col-6">
                              <div
                                className="text-white-50"
                                style={{ fontSize: 11 }}
                              >
                                ACCOUNT CREATED
                              </div>
                              <div
                                className="fw-semibold"
                                style={{ fontSize: 13 }}
                              >
                                {instCreated}
                              </div>
                            </div>

                            <div className="col-6 text-end">
                              <div
                                className="text-white-50"
                                style={{ fontSize: 11 }}
                              >
                                APPROVED THESES
                              </div>
                              <div
                                className="fw-semibold"
                                style={{ fontSize: 13 }}
                              >
                                {instApprovedCount}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* AUTHORS/TUTORS CARD */}
                        <div
                          className="p-3 mt-3"
                          style={{
                            borderRadius: 14,
                            background: "rgba(255,255,255,0.06)",
                            border: "1px solid rgba(255,255,255,0.10)",
                          }}
                        >
                          <div className="row g-3">
                            <div className="col-12 text-center">
                              <div
                                className="text-white-50"
                                style={{ fontSize: 11 }}
                              >
                                AUTHORS
                              </div>
                              <div
                                className="fw-semibold"
                                style={{
                                  fontSize: 13,
                                  whiteSpace: "pre-line",
                                }}
                              >
                                {authors}
                              </div>
                            </div>

                            {/* ✅ ocultar TUTORS si no hay */}
                            {hasTutors ? (
                              <div className="col-12 text-center">
                                <div
                                  className="text-white-50"
                                  style={{ fontSize: 11 }}
                                >
                                  TUTORS
                                </div>
                                <div
                                  className="fw-semibold"
                                  style={{
                                    fontSize: 13,
                                    whiteSpace: "pre-line",
                                  }}
                                >
                                  {tutors}
                                </div>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    ) : (
                      // ✅ si NO hay institution, mostramos SOLO el card de Authors/Tutors en la derecha
                      <div className="col-12 col-lg-4">
                        <div
                          className="p-3"
                          style={{
                            borderRadius: 14,
                            background: "rgba(255,255,255,0.06)",
                            border: "1px solid rgba(255,255,255,0.10)",
                          }}
                        >
                          <div className="row g-3">
                            <div className="col-12 text-center">
                              <div
                                className="text-white-50"
                                style={{ fontSize: 11 }}
                              >
                                AUTHORS
                              </div>
                              <div
                                className="fw-semibold"
                                style={{
                                  fontSize: 13,
                                  whiteSpace: "pre-line",
                                }}
                              >
                                {authors}
                              </div>
                            </div>

                            {/* ✅ ocultar TUTORS si no hay */}
                            {hasTutors ? (
                              <div className="col-12 text-center">
                                <div
                                  className="text-white-50"
                                  style={{ fontSize: 11 }}
                                >
                                  TUTORS
                                </div>
                                <div
                                  className="fw-semibold"
                                  style={{
                                    fontSize: 13,
                                    whiteSpace: "pre-line",
                                  }}
                                >
                                  {tutors}
                                </div>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* FOOTER BUTTONS (sin tocar el botón view) */}
                  <div className="mt-4 d-flex align-items-center justify-content-center gap-3">
                    <a
                      href={`http://localhost:3000/view/${t?._id}`}
                      target="_blank"
                      type="button"
                      className="btn btn-memory d-flex align-items-center justify-content-center gap-2"
                      style={{
                        width: 110,
                        height: 44,
                        borderRadius: 10,
                      }}
                      rel="noreferrer"
                    >
                      <span className="d-flex align-items-center">
                        {EyeFillIcon}
                      </span>
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: 14,
                          lineHeight: 1,
                        }}
                      >
                        Read
                      </span>
                    </a>

                    <button
                      type="button"
                      className="btn btn-secondary"
                      data-bs-dismiss="modal"
                      style={{
                        height: 44,
                        borderRadius: 10,
                        paddingInline: 18,
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
                {/* col */}
              </div>
              {/* row */}
            </div>
            {/* modal-body */}
          </div>
        </div>
      </div>
    </>
  );
}

export default ModalView;
