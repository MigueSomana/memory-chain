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
import Verifyground from "../../assets/verify.png";
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
          borderRadius: 12,
          border: "1px solid rgba(0,0,0,.08)",
          background: "rgba(255,255,255,0.85)",
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
            loading={
              <div style={noticeStyleLight}>
                Loading PDF… <span style={{ opacity: 0.7 }}>Please wait</span>
              </div>
            }
            error={
              <div style={{ ...noticeStyleLight, borderColor: "#ff6b6b" }}>
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
                    style={singlePageCardLight}
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
        <div style={pagerPillLight}>
          <button
            type="button"
            onClick={goPrev}
            disabled={!canPrev}
            style={pillIconBtnLight(!canPrev)}
            title="Previous page"
          >
            ◀
          </button>

          <div style={pagerTextSmallCenteredDark}>
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
            style={pillIconBtnLight(!canNext)}
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

const pillBorderLight = "1px solid rgba(0,0,0,.10)";
const pillBgLight = "rgba(255,255,255,0.92)";

function pillIconBtnLight(disabled) {
  return {
    border: pillBorderLight,
    background: pillBgLight,
    color: "#141416",
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

const pagerPillLight = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "6px 10px",
  borderRadius: 999,
  background: pillBgLight,
  border: pillBorderLight,
  boxShadow: "0 10px 25px rgba(0,0,0,0.10)",
};

const pagerTextSmallCenteredDark = {
  color: "#141416",
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

const noticeStyleLight = {
  color: "#141416",
  border: "1px solid rgba(0,0,0,.14)",
  background: "rgba(255,255,255,0.88)",
  borderRadius: 12,
  padding: 12,
  maxWidth: 520,
  margin: "12px auto",
  textAlign: "center",
};

const singlePageCardLight = {
  background: "rgba(255,255,255,0.88)",
  padding: 10,
  borderRadius: 12,
  border: "1px solid rgba(0,0,0,.10)",
  overflow: "hidden",
  margin: "0 auto",
  maxWidth: 980,
  boxShadow: "0 12px 30px rgba(0,0,0,0.08)",
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

  const statusUpper = useMemo(
    () => safeStr(selectedThesis?.status).toUpperCase(),
    [selectedThesis]
  );

  const isApproved = statusUpper === "APPROVED";
  const isPending = statusUpper === "PENDING";
  const isRejected = statusUpper === "REJECTED";

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
    } catch (e) {
      console.log(e);
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
        navigate("/verify", { replace: true });
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

  /* ✅ Step card: soporta "rightSlot" para alinear botón con el texto */
  const StepCard = ({ icon, title, subtitle, children, rightSlot }) => (
    <div className="mc-stepcard">
      <div className="d-flex align-items-start gap-3">
        <div className="mc-stepcard__icon">
          <span className="mc-stepcard__iconInner">{icon}</span>
        </div>

        <div className="flex-grow-1">
          {/* Header row: texto + slot derecho (botón) */}
          <div className="mc-stepcard__head">
            <div>
              <div className="mc-stepcard__title">{title}</div>
              {subtitle ? (
                <div className="mc-stepcard__sub">{subtitle}</div>
              ) : null}
            </div>

            {rightSlot ? (
              <div className="mc-stepcard__right">{rightSlot}</div>
            ) : null}
          </div>

          {children ? (
            <div className="mc-stepcard__content">{children}</div>
          ) : null}
        </div>
      </div>
    </div>
  );

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
      <div style={{ background: "#ffffff" }}>
        <NavbarInit />
        <div
          style={{
            backgroundImage: `url(${Verifyground})`,
            backgroundPosition: "right center",
            backgroundRepeat: "no-repeat",
            backgroundSize: "auto 100%",
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
                    Verify your thesis in{" "}
                    <strong style={{ color: "#20C997" }}>3</strong> steps
                  </h2>
                </div>

                {/* ✅ Step cards stack */}
                <div style={{ maxWidth: 560 }} className="mc-stepsStack">
                  {/* STEP 1 (search adentro) */}
                  <StepCard
                    icon={SearchIcon}
                    title="Step 1: Paste the hash"
                    subtitle="Use the file hash or the blockchain transaction hash."
                  >
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
                  </StepCard>

                  {/* STEP 2 (solo el step; la tech card VA AFUERA) */}
                  <StepCard
                    icon={EyeIcon}
                    title="Step 2: Check the status"
                    subtitle="Only approved theses can be previewed here."
                  />
                </div>

                {/* ✅ Tech sheet card AFUERA del step (como estaba antes) */}
                {showTechSheet ? (
                  <div
                    className="card shadow-sm mt-3"
                    style={{
                      borderRadius: 16,
                      overflow: "hidden",
                      maxWidth: 560,
                    }}
                  >
                    <div style={{ padding: "12px 14px 10px" }}>
                      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                        <span className="badge text-bg-light">
                          ID:{" "}
                          <strong className="ms-1">{selectedThesis._id}</strong>
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

                {/* ✅ separación simétrica: mismo gap visual antes del Step 3 */}
                <div style={{ height: 14 }} />

                {/* STEP 3 con botón alineado horizontal con texto */}
                <div style={{ maxWidth: 560 }} className="mc-stepsStack">
                  <StepCard
                    icon={CheckCircle}
                    title="Step 3: Open the certificate"
                    subtitle="Available only for approved on-chain certificates."
                    rightSlot={
                      canShowCertificateBtn ? (
                        <button
                          type="button"
                          className="btn btn-memory"
                          onClick={() => {
                            if (!selectedThesis) return;
                            openCertificateModal();
                          }}
                          style={{ minWidth: 120, paddingInline: 18 }}
                        >
                          Open
                        </button>
                      ) : null
                    }
                  >
                    {!canShowCertificateBtn ? (
                      <div className="text-muted" style={{ fontSize: 12 }}>
                        (This appears only when an approved on-chain certificate
                        exists.)
                      </div>
                    ) : null}
                  </StepCard>
                </div>
              </div>

              {/* RIGHT */}
              <div className="col-12 col-lg-6">
                <div style={{ minHeight: 600 }}>
                  {rightBlockedByStatus ? (
                    <div className="mc-rightState">
                      <div className="mc-rightCard">
                        <div className="mc-rightTitle">Preview locked</div>
                        <div className="mc-rightText">
                          This thesis is not approved yet. Ask the institution
                          to verify and update the status so the preview can be
                          enabled.
                        </div>
                        <div className="mc-rightHint">
                          <span className="mc-dot" /> Status must be{" "}
                          <b>APPROVED</b>
                        </div>
                      </div>
                    </div>
                  ) : !selectedThesis ? (
                    <div className="mc-rightState">
                      <div className="mc-rightCard">
                        <div className="mc-rightTitle">
                          {rightIsNotFound
                            ? "No match found"
                            : "Ready to verify"}
                        </div>
                        <div className="mc-rightText">
                          {rightIsNotFound
                            ? "Please double-check the hash and try again."
                            : rightIsIdle
                            ? "Paste a file hash or transaction hash to start verification."
                            : safeStr(rightMsg) ||
                              "Paste a file hash or transaction hash."}
                        </div>
                        <div className="mc-rightHint">
                          <span className="mc-dot" /> Tip: try a txHash too
                        </div>
                      </div>
                    </div>
                  ) : canPreview ? (
                    <div style={{ height: 600 }}>
                      <SinglePdfViewer url={pdfUrl} height={600} />
                    </div>
                  ) : (
                    <div className="mc-rightState">
                      <div className="mc-rightCard">
                        <div className="mc-rightTitle">Preview unavailable</div>
                        <div className="mc-rightText">
                          We couldn't load the PDF preview. This can happen due
                          to gateway/CORS, missing CID, or a temporary network
                          issue.
                        </div>
                        <div className="mc-rightHint">
                          <span className="mc-dot" /> Try again in a moment
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
