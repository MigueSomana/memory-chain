import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { Document, Page, pdfjs } from "react-pdf";
import { ViewOneIcon, ViewTwoIcon } from "../utils/icons";

import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";
const gateway = import.meta.env.VITE_PINATA_GATEWAY_DOMAIN;

export default function ViewerPDF() {
  const { id } = useParams();

  const [cid, setCid] = useState("");
  const [title, setTitle] = useState("PDF Viewer");
  const [numPages, setNumPages] = useState(0);

  // En modo libro saltamos de 2 en 2
  const [pageNumber, setPageNumber] = useState(1);

  const DEFAULT_ZOOM = 0.9;

  // Rangos por modo
  const BOOK_MIN = 0.7;
  const BOOK_MAX = 0.95;

  const SINGLE_MIN = 0.8;
  const SINGLE_MAX = 1.35;

  const leftCtrlSlot = {
    justifySelf: "start",
    transform: "translateX(200%)",
  };

  const rightCtrlSlot = {
    justifySelf: "end",
    transform: "translateX(-50%)",
  };

  const ZOOM_STEP = 0.05;

  const [scale, setScale] = useState(DEFAULT_ZOOM);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  /* ✅ Modo:
     - "book" = dos páginas tipo libro (con paginación)
     - "single" = páginas individuales con scroll (SIN paginación)
  */
  const [viewMode, setViewMode] = useState("book"); // "book" | "single"

  const [stage, setStage] = useState("cover"); // cover -> opening -> open
  const openTimerRef = useRef(null);

  const scrollRef = useRef(null);

  // 1) Buscar tesis y obtener CID
  useEffect(() => {
    let mounted = true;

    async function run() {
      try {
        setLoading(true);
        setErr("");
        setCid("");
        setNumPages(0);
        setPageNumber(1);
        setStage("cover");
        setViewMode("book");
        setScale(clamp(DEFAULT_ZOOM, BOOK_MIN, BOOK_MAX));

        if (!id) {
          setErr("Missing thesis id in URL.");
          return;
        }

        const res = await axios.get(`${API_BASE_URL}/api/theses/${id}`);
        const ipfsCid = res.data?.ipfsCid;
        const t = res.data?.title;

        if (!gateway) {
          setErr("Missing VITE_PINATA_GATEWAY_DOMAIN in frontend .env.");
          return;
        }

        if (!ipfsCid) {
          setErr("This thesis has no ipfsCid. Can't open the PDF.");
          return;
        }

        if (mounted) {
          setCid(String(ipfsCid));
          setTitle(String(t || "PDF Viewer"));
        }
      } catch (e) {
        console.log(e);
        if (mounted) setErr("Could not load thesis data. Check API or ID.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    run();
    return () => {
      mounted = false;
      if (openTimerRef.current) clearTimeout(openTimerRef.current);
    };
  }, [id]);

  // 2) Construir URL del PDF con gateway Pinata
  const url = useMemo(() => {
    return cid && gateway ? `https://${gateway}/ipfs/${cid}` : "";
  }, [cid]);

  //  Páginas visibles en libro
  const leftPage = pageNumber;
  const rightPage = pageNumber + 1;
  const canPrevBook = pageNumber > 1;
  const canNextBook = numPages > 0 && pageNumber + 1 < numPages;

  const goPrevBook = () => setPageNumber((p) => Math.max(1, p - 2));
  const goNextBook = () =>
    setPageNumber((p) => Math.min(maxBookStart(numPages), p + 2));

  const zoomMin = viewMode === "book" ? BOOK_MIN : SINGLE_MIN;
  const zoomMax = viewMode === "book" ? BOOK_MAX : SINGLE_MAX;

  const zoomOut = () =>
    setScale((s) =>
      clamp(Number((s - ZOOM_STEP).toFixed(2)), zoomMin, zoomMax)
    );
  const zoomIn = () =>
    setScale((s) =>
      clamp(Number((s + ZOOM_STEP).toFixed(2)), zoomMin, zoomMax)
    );

  /* Al cargar el PDF: dispara animación “abrir libro” */
  const onPdfLoadSuccess = (info) => {
    setNumPages(info.numPages);
    setPageNumber(1);

    setStage("opening");
    if (openTimerRef.current) clearTimeout(openTimerRef.current);
    openTimerRef.current = setTimeout(() => setStage("open"), 520);
  };

  const onPdfLoadError = (e) => {
    console.error("PDF load error:", e);
    setErr(
      "Could not load the PDF. This could be gateway CORS or an invalid URL."
    );
  };

  const toggleViewMode = () => {
    setViewMode((m) => {
      const next = m === "book" ? "single" : "book";

      const nextMin = next === "book" ? BOOK_MIN : SINGLE_MIN;
      const nextMax = next === "book" ? BOOK_MAX : SINGLE_MAX;
      setScale(clamp(DEFAULT_ZOOM, nextMin, nextMax));

      if (next === "book") {
        setPageNumber(1);
        setStage("open");
      }

      if (scrollRef.current) {
        scrollRef.current.scrollTo({ top: 0, behavior: "smooth" });
      }

      return next;
    });
  };

  if (loading) {
    return (
      <div
        style={{
          padding: 16,
          background: "#141416",
          color: "white",
          minHeight: "100vh",
        }}
      >
        Loading viewer…
      </div>
    );
  }

  if (err) {
    return (
      <div
        style={{
          padding: 16,
          background: "#141416",
          color: "white",
          minHeight: "100vh",
        }}
      >
        <b>Error:</b> {err}
      </div>
    );
  }

  return (
    <div style={appShell}>
      <style>{`
        .react-pdf__Page { display: flex; justify-content: center; }
        .react-pdf__Page__canvas { margin: 0 auto !important; display: block; }
        .react-pdf__Page__textContent { left: 50% !important; transform: translateX(-50%) !important; }
        .react-pdf__Page__annotations { left: 50% !important; transform: translateX(-50%) !important; }
      `}</style>

      {/* Top bar */}
      <div style={topBar}>
        <div style={topTitle}>{title}</div>
      </div>

      {/* Body */}
      <div ref={scrollRef} style={bodyStyle}>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <Document
            file={url}
            onLoadSuccess={onPdfLoadSuccess}
            onLoadError={onPdfLoadError}
            loading={<div style={noticeStyle}>Loading PDF…</div>}
            error={
              <div style={{ ...noticeStyle, borderColor: "#ff6b6b" }}>
                Could not open the PDF.
              </div>
            }
          >
            {/* ====== BOOK MODE ====== */}
            {viewMode === "book" && (
              <div style={{ width: "min(1200px, 100%)" }}>
                <div style={{ position: "relative", perspective: 1400 }}>
                  <div style={bookShell}>
                    {/* Left page */}
                    <div style={bookHalfLeft}>
                      {stage !== "open" ? (
                        <div style={coverInner}>
                          <div
                            style={{
                              fontWeight: 900,
                              fontSize: 18,
                              marginBottom: 8,
                            }}
                          >
                            {title}
                          </div>
                          <div style={{ opacity: 0.75, fontSize: 13 }}>
                            Opening document…
                          </div>
                          <div
                            style={{
                              marginTop: 12,
                              opacity: 0.6,
                              fontSize: 12,
                            }}
                          >
                            CID:{" "}
                            <span style={{ fontFamily: "monospace" }}>
                              {cid}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div style={pageCenter}>
                          <div style={pageFrame}>
                            <Page pageNumber={leftPage} scale={scale} />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right page */}
                    <div style={bookHalfRight(stage)}>
                      {stage === "open" ? (
                        <div style={pageCenter}>
                          <div style={pageFrame}>
                            {rightPage <= numPages ? (
                              <Page pageNumber={rightPage} scale={scale} />
                            ) : (
                              <div style={blankPage}>
                                <div style={{ opacity: 0.7, fontWeight: 800 }}>
                                  End
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div style={blankPage}>
                          <div style={{ opacity: 0.0 }}>.</div>
                        </div>
                      )}
                    </div>

                    {/* Spine */}
                    <div style={spineStyle} />
                  </div>
                </div>
              </div>
            )}

            {/* ====== SINGLE SCROLL MODE (SIN PAGINACIÓN) ====== */}
            {viewMode === "single" && (
              <div style={{ width: "min(980px, 100%)" }}>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 14 }}
                >
                  {Array.from({ length: numPages }, (_, i) => i + 1).map(
                    (p) => (
                      <div key={p} style={singlePageCard}>
                        <div style={pageCenter}>
                          <div style={pageFrame}>
                            <Page pageNumber={p} scale={scale} />
                          </div>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}
          </Document>
        </div>
      </div>

      {/* Controls bottom (compactos y transparentes) */}
      <div style={controlsDock}>
        <div style={controlsGrid}>
          {/* Left */}
          <div style={leftCtrlSlot}>
            <button
              type="button"
              onClick={toggleViewMode}
              style={modeBtn}
              title="Toggle view mode"
            >
              {viewMode === "book" ? (
                <span>{ViewOneIcon}</span>
              ) : (
                <span>{ViewTwoIcon}</span>
              )}
            </button>
          </div>

          {/* Center (solo book) */}
          <div style={{ justifySelf: "center" }}>
            {viewMode === "book" ? (
              <div style={pagerPill}>
                <button
                  type="button"
                  onClick={goPrevBook}
                  disabled={!canPrevBook}
                  style={pillIconBtn(!canPrevBook)}
                  title="Previous spread"
                >
                  ◀
                </button>

                <div style={pagerText}>
                  {numPages ? (
                    <>
                      Pages <b>{leftPage}</b>
                      {rightPage <= numPages ? (
                        <>
                          –<b>{rightPage}</b>
                        </>
                      ) : null}{" "}
                      / {numPages}
                    </>
                  ) : (
                    <>—</>
                  )}
                </div>

                <button
                  type="button"
                  onClick={goNextBook}
                  disabled={!canNextBook}
                  style={pillIconBtn(!canNextBook)}
                  title="Next spread"
                >
                  ▶
                </button>
              </div>
            ) : (
              <div />
            )}
          </div>

          <div style={rightCtrlSlot}>
            <div style={zoomPill}>
              <button
                type="button"
                onClick={zoomOut}
                style={pillIconBtn(false)}
                title="Zoom out"
              >
                −
              </button>

              <div style={zoomBubble}>{Math.round(scale * 100) + 5}%</div>

              <button
                type="button"
                onClick={zoomIn}
                style={pillIconBtn(false)}
                title="Zoom in"
              >
                +
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===================== HELPERS ===================== */

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function maxBookStart(numPages) {
  if (!numPages || numPages <= 1) return 1;
  const last = numPages % 2 === 0 ? numPages - 1 : numPages; // última impar
  return Math.max(1, last);
}

/* ===================== STYLES ===================== */

const appShell = {
  minHeight: "100vh",
  background: "#141416",
  display: "flex",
  flexDirection: "column",
};

const topBar = {
  position: "sticky",
  top: 0,
  zIndex: 20,
  height: 52,
  display: "flex",
  alignItems: "center",
  padding: "10px 12px",
  background: "#0f0f10",
  borderBottom: "1px solid rgba(255,255,255,0.08)",
  color: "white",
};

const topTitle = {
  width: "100%",
  textAlign: "center",
  fontWeight: 800,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const bodyStyle = {
  flex: 1,
  overflow: "auto",
  padding: 0,
  paddingBottom: 40,
};

const noticeStyle = {
  color: "white",
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(255,255,255,0.06)",
  borderRadius: 12,
  padding: 12,
  maxWidth: 720,
  margin: "12px auto",
  textAlign: "center",
};

/* ✅ CONTROLES: transparentes y compactos */
const controlsDock = {
  position: "fixed",
  left: 0,
  right: 0,
  bottom: 6,
  zIndex: 50,
  padding: "4px 10px",
  background: "transparent",
};

const controlsGrid = {
  display: "grid",
  gridTemplateColumns: "1fr auto 1fr",
  alignItems: "center",
  gap: 8,
  maxWidth: 1200,
  margin: "0 auto",
};

const darkPillBg = "rgba(15,15,16,0.55)";
const darkPillBorder = "1px solid rgba(255,255,255,0.10)";

const modeBtn = {
  border: darkPillBorder,
  background: "rgba(15,15,16,0.75)",
  padding: "7px 10px",
  borderRadius: 999,
  cursor: "pointer",
  fontWeight: 900,
  fontSize: 12,
};

function pillIconBtn(disabled) {
  return {
    border: darkPillBorder,
    background: darkPillBg,
    color: "white",
    fontSize: 14,
    fontWeight: 900,
    padding: "7px 9px",
    borderRadius: 999,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.35 : 0.95,
    userSelect: "none",
    lineHeight: 1,
  };
}

const pagerPill = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "5px 8px",
  borderRadius: 999,
  background: darkPillBg,
  border: darkPillBorder,
};

const pagerText = {
  color: "white",
  fontWeight: 900,
  fontSize: 12,
  minWidth: 160,
  textAlign: "center",
  opacity: 0.95,
};

const zoomPill = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "5px 8px",
  borderRadius: 999,
  background: darkPillBg,
  border: darkPillBorder,
};

const zoomBubble = {
  minWidth: 54,
  textAlign: "center",
  fontWeight: 900,
  fontSize: 12,
  color: "rgba(255,255,255,0.92)",
  padding: "6px 10px",
  borderRadius: 999,
};

const pageCenter = {
  width: "100%",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
};

const pageFrame = {
  maxWidth: "100%",
  overflow: "hidden",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  padding: 0,
};

/* ===================== BOOK VIEW ===================== */

const bookShell = {
  position: "relative",
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 0,
  borderRadius: 16,
  overflow: "hidden",
  background: "#1c1c1f",
  boxShadow: "0 18px 40px rgba(0,0,0,0.40)",
  border: "1px solid rgba(255,255,255,0.08)",
  marginTop: 0,
};

const bookHalfLeft = {
  background: "#1c1c1f",
  padding: 0,
  minHeight: 520,
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  overflow: "hidden",
};

function bookHalfRight(stage) {
  const isCover = stage === "cover";
  const isOpening = stage === "opening";
  const rotateY = isCover ? -180 : isOpening ? -30 : 0;

  return {
    background: "#1c1c1f",
    padding: 0,
    minHeight: 520,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    transformOrigin: "left center",
    transformStyle: "preserve-3d",
    transform: `rotateY(${rotateY}deg)`,
    transition: "transform 520ms ease",
    backfaceVisibility: "hidden",
    overflow: "hidden",
  };
}

const spineStyle = {
  position: "absolute",
  top: 0,
  bottom: 0,
  left: "50%",
  width: 2,
  transform: "translateX(-1px)",
  background: "rgba(255,255,255,0.10)",
  boxShadow: "0 0 0 1px rgba(0,0,0,0.25)",
};

const coverInner = {
  width: "100%",
  minHeight: 520,
  borderRadius: 14,
  background:
    "linear-gradient(135deg, rgba(255,255,255,0.07), rgba(255,255,255,0.03))",
  border: "1px solid rgba(255,255,255,0.10)",
  color: "white",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  textAlign: "center",
  padding: 18,
};

const blankPage = {
  width: "100%",
  minHeight: 520,
  borderRadius: 14,
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  color: "rgba(255,255,255,0.65)",
};

/* ===================== SINGLE SCROLL ===================== */

const singlePageCard = {
  background: "#1c1c1f",
  padding: 12,
  borderRadius: 12,
  boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
  border: "1px solid rgba(255,255,255,0.08)",
  overflow: "hidden",
  margin: "0 auto",
  maxWidth: 980,
};
