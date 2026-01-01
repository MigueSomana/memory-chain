import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import NavbarInit from "../../components/navbar/NavbarInit";
import ModalCertificate from "../../components/modal/ModalCertificate";
import {
  SearchIcon,
  EyeIcon,
  CheckCircle,
  CopyIcon2,
  CrossCircle,
  TimeCircle,
} from "../../utils/icons";
import Blockchainground from "../../assets/blockchainground.png";
import SearchPNG from "../../assets/Search.png";
import NotFoundPNG from "../../assets/NotFound.png";

import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";
const gateway = import.meta.env.VITE_PINATA_GATEWAY_DOMAIN;

const safeStr = (v) => String(v ?? "").trim();
const norm = (v) => safeStr(v).toLowerCase();

const monoStyle = {
  fontFamily:
    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  fontSize: 12,
  wordBreak: "break-all",
  whiteSpace: "normal",
  lineHeight: 1.25,
};

const codeBoxBase = {
  ...monoStyle,
  background: "#f8f9fa",
  border: "1px solid rgba(0,0,0,.08)",
  borderRadius: 10,
  padding: "10px 40px 10px 12px",
  position: "relative",
  minHeight: 38,
  display: "flex",
  alignItems: "center",
};

const copyIconWrap = {
  position: "absolute",
  right: 10,
  top: "50%",
  transform: "translateY(-50%)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  opacity: 0.85,
  userSelect: "none",
};

const PlaceholderArt = ({ src, alt = "" }) => {
  const boxStyle = {
    width: 320,
    height: 320,
    maxWidth: "75vw",
    maxHeight: "55vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  const imgStyle = {
    width: "100%",
    height: "100%",
    objectFit: "contain",
    display: "block",
    userSelect: "none",
    pointerEvents: "none",
  };

  return (
    <div style={boxStyle}>
      <img src={src} alt={alt} style={imgStyle} draggable={false} />
    </div>
  );
};

/* ===================== SINGLE PDF VIEWER (para Verify) ===================== */

function SinglePdfViewer({ url, height }) {
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);

  const FIXED_SCALE = 0.7;

  const scrollRef = useRef(null);
  const pageRefs = useRef([]);

  useEffect(() => {
    setNumPages(0);
    setPageNumber(1);
    if (scrollRef.current) scrollRef.current.scrollTo({ top: 0 });
  }, [url]);

  const canPrev = pageNumber > 1;
  const canNext = numPages > 0 && pageNumber < numPages;

  const scrollToPage = (p) => {
    const target = Math.max(1, Math.min(p, Math.max(1, numPages)));
    const el = pageRefs.current[target - 1];
    const container = scrollRef.current;

    if (!el || !container) {
      setPageNumber(target);
      return;
    }

    const topPadding = 12;
    container.scrollTo({
      top: Math.max(0, el.offsetTop - topPadding),
      behavior: "smooth",
    });

    setPageNumber(target);
  };

  const goPrev = () => scrollToPage(pageNumber - 1);
  const goNext = () => scrollToPage(pageNumber + 1);

  const onScroll = () => {
    const container = scrollRef.current;
    if (!container) return;

    const scrollTop = container.scrollTop;
    const threshold = 24;

    let current = 1;
    for (let i = 0; i < pageRefs.current.length; i++) {
      const el = pageRefs.current[i];
      if (!el) continue;
      if (el.offsetTop - threshold <= scrollTop) current = i + 1;
      else break;
    }

    if (current !== pageNumber) setPageNumber(current);
  };

  if (!url) return null;

  return (
    <div style={{ height, width: "100%", position: "relative" }}>
      <style>{`
        .react-pdf__Page { display: flex; justify-content: center; }
        .react-pdf__Page__canvas { margin: 0 auto !important; display: block; }
        .react-pdf__Page__textContent { left: 50% !important; transform: translateX(-50%) !important; }
        .react-pdf__Page__annotations { left: 50% !important; transform: translateX(-50%) !important; }
      `}</style>

      {/* Scroll body */}
      <div
        ref={scrollRef}
        onScroll={onScroll}
        style={{
          height: "100%",
          overflow: "auto",
          padding: 12,
          borderRadius: 5,
        }}
      >
        <div style={{ display: "flex", justifyContent: "center" }}>
          <Document
            file={url}
            onLoadSuccess={(info) => {
              setNumPages(info.numPages);
              setPageNumber(1);
              if (scrollRef.current) scrollRef.current.scrollTo({ top: 0 });
            }}
            onLoadError={(e) => {
              console.error("PDF load error (Verify Single):", e);
            }}
            loading={<div style={noticeStyleDark}>Loading PDF…</div>}
            error={
              <div style={{ ...noticeStyleDark, borderColor: "#ff6b6b" }}>
                Could not open the PDF.
              </div>
            }
          >
            <div style={{ width: "min(980px, 100%)" }}>
              <div
                style={{ display: "flex", flexDirection: "column", gap: 14 }}
              >
                {Array.from({ length: numPages }, (_, i) => i + 1).map((p) => (
                  <div
                    key={p}
                    ref={(el) => (pageRefs.current[p - 1] = el)}
                    style={singlePageCardDark}
                  >
                    <div style={pageCenter}>
                      <div style={pageFrame}>
                        <Page pageNumber={p} scale={FIXED_SCALE} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Document>
        </div>
      </div>

      {/* Controls bottom (single): paginación CENTRADA */}
      <div style={controlsDockCentered}>
        <div style={pagerPill}>
          <button
            type="button"
            onClick={goPrev}
            disabled={!canPrev}
            style={pillIconBtn(!canPrev)}
            title="Previous page"
          >
            ◀
          </button>

          <div style={pagerTextSmallCentered}>
            {numPages ? (
              <>
                Page <b>{pageNumber}</b> / {numPages}
              </>
            ) : (
              <>—</>
            )}
          </div>

          <button
            type="button"
            onClick={goNext}
            disabled={!canNext}
            style={pillIconBtn(!canNext)}
            title="Next page"
          >
            ▶
          </button>
        </div>
      </div>
    </div>
  );
}

/* ===================== STYLES para viewer dentro de Verify ===================== */

const darkPillBg = "rgba(15,15,16,0.55)";
const darkPillBorder = "1px solid rgba(255,255,255,0.10)";

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

const pagerTextSmallCentered = {
  color: "white",
  fontWeight: 900,
  fontSize: 12,
  minWidth: 120,
  textAlign: "center",
  opacity: 0.95,
};

const controlsDockCentered = {
  position: "sticky",
  left: 0,
  right: 0,
  bottom: 6,
  zIndex: 10,
  padding: "6px 10px",
  background: "transparent",
  display: "flex",
  justifyContent: "center",
};

const noticeStyleDark = {
  color: "white",
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(15,15,16,0.35)",
  borderRadius: 12,
  padding: 12,
  maxWidth: 520,
  margin: "12px auto",
  textAlign: "center",
};

const singlePageCardDark = {
  background: "rgba(15,15,16,0.25)",
  padding: 10,
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.10)",
  overflow: "hidden",
  margin: "0 auto",
  maxWidth: 980,
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

/* ===================== VERIFY PAGE ===================== */

const Verify = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const [hashInput, setHashInput] = useState("");
  const [selectedThesis, setSelectedThesis] = useState(null);
  const [certificateData, setCertificateData] = useState(null);

  const [loading, setLoading] = useState(false);
  const [rightMsg, setRightMsg] = useState(
    "Start searching for certification now"
  );
  const [errorMsg, setErrorMsg] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  const isTypingRef = useRef(false);
  const typingTimerRef = useRef(null);

  const markTyping = () => {
    isTypingRef.current = true;
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      isTypingRef.current = false;
    }, 450);
  };

  const iframeH = 600;

  const statusUpper = useMemo(
    () => safeStr(selectedThesis?.status).toUpperCase(),
    [selectedThesis]
  );

  const isApproved = statusUpper === "APPROVED";
  const isPending = statusUpper === "PENDING";
  const isRejected = statusUpper === "REJECTED";

  // URL del PDF con gateway Pinata (SIN iframe)
  const pdfUrl = useMemo(() => {
    const cid = safeStr(selectedThesis?.ipfsCid);
    if (!cid || !gateway) return "";
    return `https://${gateway}/ipfs/${cid}`;
  }, [selectedThesis, gateway]);

  const canPreview = !!selectedThesis && isApproved && !!pdfUrl;

  const canShowCertificateBtn = useMemo(
    () => !!selectedThesis && !!certificateData && isApproved,
    [selectedThesis, certificateData, isApproved]
  );

  const copyToClipboard = async (text) => {
    const value = safeStr(text);
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // sin warnings
    }
  };

  const openCertificateModal = () => {
    const el = document.getElementById("modalCertificate");
    if (!el) return;
    const modal = window.bootstrap?.Modal.getOrCreateInstance(el);
    modal?.show();
  };

  const rightIsNotFound =
    hasSearched &&
    !selectedThesis &&
    !loading &&
    safeStr(rightMsg).toLowerCase().includes("no match");

  const rightIsIdle = !hasSearched && !selectedThesis && !loading;

  useEffect(() => {
    const loadById = async () => {
      if (!id) {
        setSelectedThesis(null);
        setCertificateData(null);
        setErrorMsg("");

        if (!hasSearched) {
          setRightMsg("Start searching for certification now");
        }
        return;
      }

      if (isTypingRef.current) return;

      try {
        setLoading(true);
        setErrorMsg("");
        setRightMsg("Loading thesis...");

        const thesisRes = await axios.get(`${API_BASE_URL}/api/theses/${id}`);
        const thesis = thesisRes.data;

        if (!thesis?._id) {
          setSelectedThesis(null);
          setCertificateData(null);
          setHasSearched(true);
          setRightMsg("No match found. Check the link and try again.");
          return;
        }

        setSelectedThesis(thesis);

        if (!isTypingRef.current) {
          setHashInput(thesis?.fileHash || thesis?.txHash || "");
        }

        try {
          const certRes = await axios.get(
            `${API_BASE_URL}/api/theses/${thesis._id}/certificate`
          );
          setCertificateData(certRes.data);
        } catch {
          setCertificateData(null);
        }

        setHasSearched(true);
        setRightMsg("");
      } catch {
        setSelectedThesis(null);
        setCertificateData(null);
        setHasSearched(true);
        setRightMsg("No match found. Check the link and try again.");
      } finally {
        setLoading(false);
      }
    };

    loadById();
  }, [id, hasSearched]);

  const handleSearch = async (ev) => {
    ev?.preventDefault?.();

    setHasSearched(true);

    const q = safeStr(hashInput);

    if (!q) {
      setErrorMsg("Enter a file hash or transaction hash.");
      setSelectedThesis(null);
      setCertificateData(null);
      navigate("/verify", { replace: true });
      return;
    }

    try {
      setLoading(true);
      setErrorMsg("");
      setRightMsg(
        <div className="alert alert-light" role="alert">
          Searching...
        </div>
      );

      const listRes = await axios.get(`${API_BASE_URL}/api/theses`);
      const list = Array.isArray(listRes.data) ? listRes.data : [];

      const needle = norm(q);
      const found = list.find((t) => {
        const f = norm(t?.fileHash);
        const tx = norm(t?.txHash);
        return needle && (needle === f || needle === tx);
      });

      if (!found?._id) {
        setSelectedThesis(null);
        setCertificateData(null);
        setRightMsg("No match found. Check the hash and try again.");
        navigate("/verify", { replace: true }); // deja /verify pero sin reset
        return;
      }

      const thesisRes = await axios.get(
        `${API_BASE_URL}/api/theses/${found._id}`
      );
      const thesis = thesisRes.data;

      setSelectedThesis(thesis);
      navigate(`/verify/${thesis._id}`, { replace: true });

      try {
        const certRes = await axios.get(
          `${API_BASE_URL}/api/theses/${thesis._id}/certificate`
        );
        setCertificateData(certRes.data);
      } catch {
        setCertificateData(null);
      }

      setRightMsg("");
    } catch {
      setSelectedThesis(null);
      setCertificateData(null);
      setRightMsg("No match found. Check the hash and try again.");
      navigate("/verify", { replace: true });
    } finally {
      setLoading(false);
    }
  };

  const Step = ({ icon, title, subtitle }) => (
    <div className="mb-3">
      <div className="d-flex align-items-start gap-3">
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 999,
            background: "#20C997",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flex: "0 0 auto",
          }}
        >
          <span
            style={{
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {icon}
          </span>
        </div>

        <div className="flex-grow-1">
          <div style={{ fontWeight: 800, fontSize: 17, lineHeight: 1.2 }}>
            {title}
          </div>
          {subtitle ? (
            <div className="text-muted mt-1" style={{ fontSize: 12 }}>
              {subtitle}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );

  const leftIsEmpty = !selectedThesis && !loading && !errorMsg;

  const CopyField = ({ label, value }) => {
    const v = safeStr(value);
    return (
      <div className="col-12">
        <div className="text-muted" style={{ fontSize: 11 }}>
          {label}
        </div>

        <div style={codeBoxBase}>
          <span>{v || "—"}</span>

          {v ? (
            <span
              style={copyIconWrap}
              title="Copy"
              onClick={() => copyToClipboard(v)}
            >
              {CopyIcon2}
            </span>
          ) : null}
        </div>
      </div>
    );
  };

  const StatusPill = () => {
    if (!selectedThesis) return null;

    let label = "Unknown";
    let bg = "#f1f3f5";
    let color = "#495057";
    let icon = CheckCircle;

    if (isApproved) {
      label = "Approved";
      bg = "#20C997";
      color = "#fff";
      icon = CheckCircle;
    } else if (isPending) {
      label = "Pending";
      bg = "#ffc107";
      color = "#fff";
      icon = TimeCircle;
    } else if (isRejected) {
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
        <span style={{ display: "flex", alignItems: "center" }}>{icon}</span>
      </div>
    );
  };

  const showTechSheet = !!selectedThesis;
  const showFullTechSheet = !!selectedThesis && isApproved;
  const rightBlockedByStatus = !!selectedThesis && !isApproved;

  return (
    <>
      <div
        style={{
          backgroundImage: `url(${Blockchainground})`,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right bottom",
          backgroundSize: "auto 100%",
        }}
      >
        <NavbarInit />

        <div
          style={{
            background:
              "linear-gradient(90deg, rgba(255,255,255,0.70) 0%, rgba(255,255,255,0.3) 100%)",
          }}
        >
          <div className="container py-4">
            <div className="row gx-5 gy-4 align-items-center">
              {/* LEFT */}
              <div className="col-12 col-lg-6">
                <div
                  className="mb-3 d-flex justify-content-center"
                  style={{ maxWidth: 560 }}
                >
                  <h2 className="fw-bold mb-0">
                    Verify your thesis in 3 steps
                  </h2>
                </div>

                <div
                  style={{ maxWidth: 560, paddingTop: leftIsEmpty ? 10 : 0 }}
                >
                  <Step
                    icon={SearchIcon}
                    title="Step 1: Paste the hash"
                    subtitle="Use the file hash or the blockchain transaction hash."
                  />

                  <div
                    className="d-flex justify-content-center"
                    style={{ marginTop: leftIsEmpty ? 18 : 0 }}
                  >
                    <div style={{ width: "100%", paddingInline: 12 }}>
                      <form onSubmit={handleSearch}>
                        <div className="input-group">
                          <input
                            type="text"
                            className="form-control"
                            placeholder="Paste fileHash or txHash…"
                            value={hashInput}
                            onChange={(e) => {
                              markTyping();
                              setHashInput(e.target.value);
                            }}
                            disabled={loading}
                            autoComplete="off"
                            spellCheck={false}
                          />
                          <button
                            type="submit"
                            className="btn btn-memory"
                            disabled={loading}
                            style={{ minWidth: 120 }}
                          >
                            {loading ? "Searching..." : "Search"}
                          </button>
                        </div>

                        {errorMsg ? (
                          <div
                            className="alert alert-danger mt-3 mb-0"
                            role="alert"
                          >
                            {errorMsg}
                          </div>
                        ) : null}
                      </form>
                    </div>
                  </div>

                  <div style={{ height: leftIsEmpty ? 26 : 16 }} />

                  <Step
                    icon={EyeIcon}
                    title="Step 2: Check the status"
                    subtitle="Only approved theses can be previewed here."
                  />

                  {showTechSheet ? (
                    <div
                      className="card shadow-sm my-3"
                      style={{ borderRadius: 16, overflow: "hidden" }}
                    >
                      <div style={{ padding: "12px 14px 10px" }}>
                        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                          <span className="badge text-bg-light">
                            ID:{" "}
                            <strong className="ms-1">
                              {selectedThesis._id}
                            </strong>
                          </span>
                          <StatusPill />
                        </div>

                        {showFullTechSheet ? (
                          <div className="row g-2 mt-0">
                            <CopyField
                              label="IPFS CID"
                              value={selectedThesis?.ipfsCid}
                            />
                            <CopyField
                              label="File hash"
                              value={selectedThesis?.fileHash}
                            />
                            <CopyField
                              label="Transaction hash"
                              value={selectedThesis?.txHash}
                            />
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ) : null}

                  <div style={{ height: leftIsEmpty ? 24 : 10 }} />

                  <Step
                    icon={CheckCircle}
                    title="Step 3: Open the certificate"
                    subtitle="Available only for approved on-chain certificates."
                  />

                  <div
                    className="d-flex justify-content-center"
                    style={{ marginTop: leftIsEmpty ? 16 : 6 }}
                  >
                    <div style={{ width: "100%", paddingInline: 12 }}>
                      {canShowCertificateBtn ? (
                        <div className="d-flex justify-content-center">
                          <button
                            type="button"
                            className="btn btn-memory"
                            onClick={() => {
                              if (!selectedThesis) return;
                              openCertificateModal();
                            }}
                            style={{ minWidth: 220 }}
                          >
                            Open certificate
                          </button>
                        </div>
                      ) : (
                        <div
                          className="text-muted text-center"
                          style={{ fontSize: 12 }}
                        >
                          (This appears only when an approved on-chain
                          certificate exists.)
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT */}
              <div className="col-12 col-lg-6">
                <div style={{ minHeight: iframeH }}>
                  {rightBlockedByStatus ? (
                    <div
                      className="d-flex align-items-center justify-content-center text-center"
                      style={{ minHeight: iframeH, padding: 24 }}
                    >
                      <div className="text-muted d-flex flex-column align-items-center justify-content-center">
                        <PlaceholderArt src={NotFoundPNG} alt="Not approved" />
                        <div className="mt-3" style={{ fontWeight: 600 }}>
                          <div className="alert alert-warning" role="alert">
                            Please verify and update your thesis so its status
                            can be changed.
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : !selectedThesis ? (
                    <div
                      className="d-flex align-items-center justify-content-center text-center"
                      style={{ minHeight: iframeH, padding: 24 }}
                    >
                      <div className="text-muted d-flex flex-column align-items-center justify-content-center">
                        {rightIsNotFound ? (
                          <PlaceholderArt src={NotFoundPNG} alt="Not found" />
                        ) : (
                          <PlaceholderArt src={SearchPNG} alt="Search" />
                        )}

                        <div className="mt-3" style={{ fontWeight: 600 }}>
                          {rightIsNotFound ? (
                            <div className="alert alert-danger" role="alert">
                              No thesis found. Please double-check the hash
                            </div>
                          ) : rightIsIdle ? (
                            <div className="alert alert-light" role="alert">
                              Start searching for certification now
                            </div>
                          ) : (
                            rightMsg || (
                              <div className="alert alert-light" role="alert">
                                Start searching for certification now
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  ) : canPreview ? (
                    <div style={{ height: iframeH }}>
                      {/*  Viewer bonito con pdf.js (single) */}
                      <SinglePdfViewer url={pdfUrl} height={iframeH} />
                    </div>
                  ) : (
                    <div
                      className="d-flex align-items-center justify-content-center text-center"
                      style={{ minHeight: iframeH, padding: 24 }}
                    >
                      <div className="text-muted d-flex flex-column align-items-center justify-content-center">
                        <PlaceholderArt
                          src={NotFoundPNG}
                          alt="Preview unavailable"
                        />
                        <div className="mt-3" style={{ fontWeight: 600 }}>
                          <div className="alert alert-danger" role="alert">
                            Preview unavailable. Please try again later.
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <ModalCertificate
              thesis={selectedThesis}
              certificate={certificateData}
              onClose={() => {
                setCertificateData(null);
                setSelectedThesis(null);
                setErrorMsg("");
                setHasSearched(false);
                setRightMsg("Start searching for certification now");
                navigate("/verify", { replace: true });
              }}
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default Verify;
