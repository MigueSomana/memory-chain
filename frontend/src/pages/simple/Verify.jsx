// Verify.jsx (Wizard-style, reusing mcWizard* classes like FormThesis)
// ✅ No Navbar here (mounted elsewhere)
// ✅ Keeps your Verify logic (search by hash, /verify/:id deep-link, certificate modal, PDF preview)

import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import ModalCertificate from "../../components/modal/ModalCertificate";

import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";

import {
  Search,
  ShieldCheck,
  FileSearch,
  Eye,
  Award,
  CircleX,
  ArrowBigRightDash,
  ArrowBigLeftDash,
  Copy,
  CheckCircle2,
  Clock3,
  XCircle,
} from "lucide-react";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";
const gateway = import.meta.env.VITE_PINATA_GATEWAY_DOMAIN;

const safeStr = (v) => String(v ?? "").trim();
const norm = (v) => safeStr(v).toLowerCase();

/* ===================== SINGLE PDF VIEWER (same as before, minimal inline tweaks) ===================== */
function SinglePdfViewer({ url, height = 720 }) {
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

      <div
        ref={scrollRef}
        onScroll={onScroll}
        style={{
          height: "100%",
          overflow: "auto",
          padding: 12,
          borderRadius: 16,
          border: "1px solid rgba(255,255,255,.10)",
          background: "rgba(0,0,0,.18)",
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
            onLoadError={(e) => console.error("PDF load error (Verify Single):", e)}
            loading={
              <div className="mcWizardCallout">
                Loading PDF… <span style={{ opacity: 0.7 }}>Please wait</span>
              </div>
            }
            error={
              <div className="mcWizardCalloutWarn">
                Could not open the PDF.
              </div>
            }
          >
            <div style={{ width: "min(980px, 100%)" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {Array.from({ length: numPages }, (_, i) => i + 1).map((p) => (
                  <div
                    key={p}
                    ref={(el) => (pageRefs.current[p - 1] = el)}
                    style={{
                      background: "rgba(0,0,0,.16)",
                      padding: 10,
                      borderRadius: 16,
                      border: "1px solid rgba(255,255,255,.10)",
                      overflow: "hidden",
                      margin: "0 auto",
                      maxWidth: 980,
                    }}
                  >
                    <div style={{ width: "100%", display: "flex", justifyContent: "center" }}>
                      <div style={{ maxWidth: "100%", overflow: "hidden", display: "flex", justifyContent: "center" }}>
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

      <div className="mcPdfDock">
        <div className="mcPdfPill">
          <button
            type="button"
            onClick={goPrev}
            disabled={!canPrev}
            className="mcPdfPillBtn"
            title="Previous page"
          >
            ◀
          </button>

          <div className="mcPdfPillText">
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
            className="mcPdfPillBtn"
            title="Next page"
          >
            ▶
          </button>
        </div>
      </div>
    </div>
  );
}

/* ===================== VERIFY (Wizard) ===================== */

const STEP_KEYS = ["search", "result", "preview", "certificate"];
const STEP_INDEX = STEP_KEYS.reduce((acc, k, i) => ((acc[k] = i), acc), {});

const Verify = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  // Wizard state
  const [stepKey, setStepKey] = useState("search");
  const step = STEP_INDEX[stepKey] ?? 0;

  // Core state
  const [hashInput, setHashInput] = useState("");
  const [selectedThesis, setSelectedThesis] = useState(null);
  const [certificateData, setCertificateData] = useState(null);

  const [loading, setLoading] = useState(false);
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

  const statusLabel = isApproved
    ? "APPROVED"
    : isPending
    ? "PENDING"
    : isRejected
    ? "REJECTED"
    : selectedThesis
    ? "UNKNOWN"
    : "IDLE";

  const statusIcon = isApproved ? CheckCircle2 : isPending ? Clock3 : isRejected ? XCircle : ShieldCheck;

  const pdfUrl = useMemo(() => {
    const cid = safeStr(selectedThesis?.ipfsCid);
    if (!cid || !gateway) return "";
    return `https://${gateway}/ipfs/${cid}`;
  }, [selectedThesis]);

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

  const resetAll = () => {
    setHashInput("");
    setSelectedThesis(null);
    setCertificateData(null);
    setLoading(false);
    setErrorMsg("");
    setHasSearched(false);
    setStepKey("search");
    navigate("/verify", { replace: true });
  };

  // Deep-link: /verify/:id
  useEffect(() => {
    const loadById = async () => {
      if (!id) return;

      if (isTypingRef.current) return;

      try {
        setLoading(true);
        setErrorMsg("");
        setHasSearched(true);

        const thesisRes = await axios.get(`${API_BASE_URL}/api/theses/${id}`);
        const thesis = thesisRes.data;

        if (!thesis?._id) {
          setSelectedThesis(null);
          setCertificateData(null);
          setStepKey("search");
          setErrorMsg("No match found. Check the link and try again.");
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

        setStepKey("result");
      } catch {
        setSelectedThesis(null);
        setCertificateData(null);
        setStepKey("search");
        setErrorMsg("No match found. Check the link and try again.");
      } finally {
        setLoading(false);
      }
    };

    loadById();
  }, [id]);

  const doSearch = async () => {
    const q = safeStr(hashInput);

    if (!q) {
      setErrorMsg("Enter a file hash or transaction hash.");
      setSelectedThesis(null);
      setCertificateData(null);
      setHasSearched(true);
      navigate("/verify", { replace: true });
      return false;
    }

    try {
      setLoading(true);
      setErrorMsg("");
      setHasSearched(true);

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
        setErrorMsg("No match found. Check the hash and try again.");
        navigate("/verify", { replace: true });
        return false;
      }

      const thesisRes = await axios.get(`${API_BASE_URL}/api/theses/${found._id}`);
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

      return true;
    } catch {
      setSelectedThesis(null);
      setCertificateData(null);
      setErrorMsg("No match found. Check the hash and try again.");
      navigate("/verify", { replace: true });
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Step validation
  const validateStep = (k) => {
    if (k === "search") {
      const q = safeStr(hashInput);
      if (!q) {
        setErrorMsg("Enter a file hash or transaction hash.");
        return false;
      }
    }
    if (k === "result") {
      if (!selectedThesis) return false;
    }
    if (k === "preview") {
      if (!selectedThesis) return false;
    }
    if (k === "certificate") {
      if (!selectedThesis) return false;
    }
    return true;
  };

  const goPrev = () => {
    if (loading) return;
    const prev = Math.max(0, step - 1);
    setStepKey(STEP_KEYS[prev]);
  };

  const goNext = async () => {
    if (loading) return;

    // validate current step
    const ok = validateStep(stepKey);
    if (!ok) return;

    // special: search step actually triggers the search
    if (stepKey === "search") {
      const found = await doSearch();
      if (!found) return;
      setStepKey("result");
      return;
    }

    const next = Math.min(STEP_KEYS.length - 1, step + 1);
    setStepKey(STEP_KEYS[next]);
  };

  const jumpTo = async (targetKey) => {
    if (loading) return;

    const targetIdx = STEP_INDEX[targetKey] ?? 0;
    if (targetIdx <= step) {
      setStepKey(targetKey);
      return;
    }

    // forward jump: validate sequentially
    for (let i = step; i < targetIdx; i++) {
      const k = STEP_KEYS[i];

      if (k === "search") {
        // forward jump from search requires doing the search
        const ok = validateStep("search");
        if (!ok) return;
        const found = await doSearch();
        if (!found) return;
        // after successful search we can continue validating next steps
        continue;
      }

      if (!validateStep(k)) return;
    }

    setStepKey(targetKey);
  };

  const stepState = (idx) => {
    if (idx < step) return "done";
    if (idx === step) return "active";
    return "upcoming";
  };

  const steps = useMemo(() => {
    return [
      { key: "search", title: "Search", icon: Search },
      { key: "result", title: "Status", icon: ShieldCheck },
      { key: "preview", title: "Preview", icon: Eye },
      { key: "certificate", title: "Certificate", icon: Award },
    ];
  }, []);

  const currentStepMeta = steps.find((s) => s.key === stepKey);

  return (
    <form
      className="mcWizardWrap"
      onSubmit={(e) => {
        e.preventDefault();
        if (stepKey === "search") goNext();
      }}
      onKeyDown={(ev) => {
        // prevent accidental Enter submits outside textarea (same behavior as FormThesis)
        if (ev.key === "Enter") {
          const tag = String(ev.target?.tagName || "").toLowerCase();
          const isTextarea = tag === "textarea";
          if (!isTextarea) ev.preventDefault();
        }
      }}
    >
      {/* ===================== STEPPER ===================== */}
      <div className="mcWizardStepper">
        <div className="mcWizardStepperRail" aria-hidden="true" />

        {steps.map((s, idx) => {
          const st = stepState(idx);
          const active = st === "active";
          const done = st === "done";

          return (
            <button
              key={s.key}
              type="button"
              className={`mcStepItem ${active ? "is-active" : ""} ${done ? "is-done" : ""}`}
              onClick={() => jumpTo(s.key)}
              disabled={loading}
            >
              <span className={`mcStepDot ${active ? "is-active" : ""} ${done ? "is-done" : ""}`}>
                {done ? (
                  <span className="mcStepCheck" aria-hidden="true">
                    ✓
                  </span>
                ) : (
                  <span className="mcStepIcon" aria-hidden="true">
                    <s.icon />
                  </span>
                )}
              </span>

              <span className="mcStepText">
                <span className={`mcStepTitle ${active ? "is-active" : ""}`}>{s.title}</span>
                <span className="mcStepSub">{s.sub}</span>
              </span>
            </button>
          );
        })}
      </div>

      {/* ===================== MAIN CARD ===================== */}
      <section className="mcWizardCard">
        <header className="mcWizardCardHead">
          <div className="mcWizardCardHeadLeft">
            <span className="mcWizardCardHeadTitle">
              <span className="mcWizardCardHeadIcon">
                {currentStepMeta?.icon ? <currentStepMeta.icon /> : null}
              </span>
              <h2 className="mcWizardH2">{currentStepMeta?.title || "Verify"}</h2>
            </span>
          </div>
        </header>

        <div className="mcWizardCardBody">
          {/* STEP: SEARCH */}
          {stepKey === "search" && (
            <div className="mcWizardPane">
              <div className="mcWizardField">
                <label className="mcWizardLabel">File hash or transaction hash</label>

                <div className="input-group mcWizardInputGroup">
                  <span className="input-group-text" style={{ background: "transparent", borderColor: "rgba(255,255,255,.10)" }}>
                    <FileSearch size={18} />
                  </span>

                  <input
                    type="text"
                    className={`form-control mcWizardInputGroupInput ${errorMsg ? "is-invalid" : ""}`}
                    placeholder="Paste fileHash or txHash…"
                    value={hashInput}
                    onChange={(e) => {
                      markTyping();
                      setHashInput(e.target.value);
                      if (errorMsg) setErrorMsg("");
                    }}
                    disabled={loading}
                    autoComplete="off"
                    spellCheck={false}
                  />

                  <button
                    type="button"
                    className="btn btn-memory mcWizardInputGroupBtn d-flex align-items-center gap-2"
                    onClick={goNext}
                    disabled={loading}
                  >
                    <Search size={18} />
                    {loading ? "Searching..." : "Search"}
                  </button>
                </div>

                {errorMsg ? <div className="invalid-feedback d-block">{errorMsg}</div> : null}
              </div>

              <div className="mcWizardInfoBanner">
                <div className="mcWizardInfoIcon fill-y" aria-hidden="true">
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <div className="mcWizardInfoTitle">On-chain verification</div>
                  <div className="mcWizardInfoText">
                    Paste a <b>file hash</b> or <b>transaction hash</b>. We’ll show status, metadata and (if approved) the PDF preview.
                  </div>
                </div>
              </div>

              {hasSearched && !selectedThesis && !loading ? (
                <div className="mcWizardCalloutWarn mt-3">
                  No match found. Double-check the hash and try again.
                </div>
              ) : null}
            </div>
          )}

          {/* STEP: RESULT */}
          {stepKey === "result" && (
            <div className="mcWizardPane">
              {!selectedThesis ? (
                <div className="mcWizardCalloutWarn">
                  No thesis loaded. Go back and search again.
                </div>
              ) : (
                <>
                  <div className="mcWizardRowBetween">
                    <div>
                      <div className="mcWizardSectionTitle">Verification result</div>
                      <div className="mcWizardMuted">Status + technical fields</div>
                    </div>

                    <div className="d-flex align-items-center gap-2">
                      <span className="mcWizardMuted">Status:</span>
                      <span className="d-flex align-items-center gap-2">
                        {React.createElement(statusIcon, { size: 18 })}
                        <b>{statusLabel}</b>
                      </span>
                    </div>
                  </div>

                  <div className="mcWizardDivider" />

                  <div className="mcWizardGrid2">
                    <div className="mcWizardField">
                      <label className="mcWizardLabel">Thesis ID</label>
                      <div className="input-group mcWizardInputGroup">
                        <input className="form-control mcWizardInputGroupInput" value={selectedThesis?._id || "—"} readOnly />
                        <button
                          type="button"
                          className="btn btn-outline-memory mcWizardInputGroupBtn d-flex align-items-center gap-2"
                          onClick={() => copyToClipboard(selectedThesis?._id)}
                        >
                          <Copy size={18} /> Copy
                        </button>
                      </div>
                    </div>

                    <div className="mcWizardField">
                      <label className="mcWizardLabel">Current status</label>
                      <input className="mcWizardInput" value={statusLabel} readOnly />
                    </div>
                  </div>

                  {isApproved ? (
                    <div className="mcWizardGrid2 mt-3">
                      <div className="mcWizardField">
                        <label className="mcWizardLabel">IPFS CID</label>
                        <div className="input-group mcWizardInputGroup">
                          <input className="form-control mcWizardInputGroupInput" value={selectedThesis?.ipfsCid || "—"} readOnly />
                          <button
                            type="button"
                            className="btn btn-outline-memory mcWizardInputGroupBtn d-flex align-items-center gap-2"
                            onClick={() => copyToClipboard(selectedThesis?.ipfsCid)}
                            disabled={!selectedThesis?.ipfsCid}
                          >
                            <Copy size={18} /> Copy
                          </button>
                        </div>
                      </div>

                      <div className="mcWizardField">
                        <label className="mcWizardLabel">File hash</label>
                        <div className="input-group mcWizardInputGroup">
                          <input className="form-control mcWizardInputGroupInput" value={selectedThesis?.fileHash || "—"} readOnly />
                          <button
                            type="button"
                            className="btn btn-outline-memory mcWizardInputGroupBtn d-flex align-items-center gap-2"
                            onClick={() => copyToClipboard(selectedThesis?.fileHash)}
                            disabled={!selectedThesis?.fileHash}
                          >
                            <Copy size={18} /> Copy
                          </button>
                        </div>
                      </div>

                      <div className="mcWizardField">
                        <label className="mcWizardLabel">Transaction hash</label>
                        <div className="input-group mcWizardInputGroup">
                          <input className="form-control mcWizardInputGroupInput" value={selectedThesis?.txHash || "—"} readOnly />
                          <button
                            type="button"
                            className="btn btn-outline-memory mcWizardInputGroupBtn d-flex align-items-center gap-2"
                            onClick={() => copyToClipboard(selectedThesis?.txHash)}
                            disabled={!selectedThesis?.txHash}
                          >
                            <Copy size={18} /> Copy
                          </button>
                        </div>
                      </div>

                      <div className="mcWizardField">
                        <label className="mcWizardLabel">Preview</label>
                        <input className="mcWizardInput" value={canPreview ? "UNLOCKED" : "LOCKED"} readOnly />
                      </div>
                    </div>
                  ) : (
                    <div className="mcWizardCalloutWarn mt-3">
                      Full technical details and preview unlock once status is <b>APPROVED</b>.
                    </div>
                  )}

                  <div className="mcWizardInfoBanner mt-3">
                    <div className="mcWizardInfoIcon fill-y" aria-hidden="true">
                      <Clock3 size={24} />
                    </div>
                    <div>
                      <div className="mcWizardInfoTitle">Certification</div>
                      <div className="mcWizardInfoText">
                        If the thesis is approved, you can preview the PDF and open the certificate (when available).
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* STEP: PREVIEW */}
          {stepKey === "preview" && (
            <div className="mcWizardPane">
              {!selectedThesis ? (
                <div className="mcWizardCalloutWarn">
                  No thesis loaded. Go back and search again.
                </div>
              ) : !isApproved ? (
                <div className="mcWizardCalloutWarn">
                  Preview locked. Status must be <b>APPROVED</b>.
                </div>
              ) : !pdfUrl ? (
                <div className="mcWizardCalloutWarn">
                  Preview unavailable. Missing CID or gateway.
                </div>
              ) : (
                <div style={{ height: 720 }}>
                  <SinglePdfViewer url={pdfUrl} height={720} />
                </div>
              )}
            </div>
          )}

          {/* STEP: CERTIFICATE */}
          {stepKey === "certificate" && (
            <div className="mcWizardPane">
              {!selectedThesis ? (
                <div className="mcWizardCalloutWarn">
                  No thesis loaded. Go back and search again.
                </div>
              ) : !isApproved ? (
                <div className="mcWizardCalloutWarn">
                  Certificate is available only when status is <b>APPROVED</b>.
                </div>
              ) : (
                <>
                  <div className="mcWizardField">
                    <label className="mcWizardLabel">Certificate</label>

                    {canShowCertificateBtn ? (
                      <div className="mcWizardCallout">
                        Certificate data is available. Click the button below to open it.
                      </div>
                    ) : (
                      <div className="mcWizardCalloutWarn">
                        Certificate data is not available yet (or endpoint returned nothing).
                      </div>
                    )}

                    <div className="d-flex align-items-center gap-2 mt-3">
                      <button
                        type="button"
                        className="btn btn-memory d-flex align-items-center gap-2"
                        onClick={openCertificateModal}
                        disabled={!canShowCertificateBtn}
                      >
                        <Award size={18} />
                        Open certificate
                      </button>

                      <button
                        type="button"
                        className="btn btn-outline-memory d-flex align-items-center gap-2"
                        onClick={() => copyToClipboard(selectedThesis?.txHash)}
                        disabled={!selectedThesis?.txHash}
                      >
                        <Copy size={18} />
                        Copy txHash
                      </button>
                    </div>
                  </div>

                  <div className="mcWizardInfoBanner mt-3">
                    <div className="mcWizardInfoIcon fill-y" aria-hidden="true">
                      <ShieldCheck size={24} />
                    </div>
                    <div>
                      <div className="mcWizardInfoTitle">Trust signal</div>
                      <div className="mcWizardInfoText">
                        The certificate summarizes the thesis metadata and its on-chain proof (when approved).
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* ===================== FOOTER ACTIONS ===================== */}
        <footer className="mcWizardFooter">
          <button
            type="button"
            className="btn btn-outline-memory mcWizardNavBtn"
            onClick={step === 0 ? () => window.history.back() : goPrev}
            disabled={loading}
          >
            {step === 0 ? (
              <span className="d-flex align-items-center">
                <CircleX className="mx-2" />
                Cancel
              </span>
            ) : (
              <span className="d-flex align-items-center">
                <ArrowBigLeftDash className="mx-2" />
                Previous
              </span>
            )}
          </button>

          <div className="d-flex align-items-center gap-2">
            {hasSearched || selectedThesis ? (
              <button
                type="button"
                className="btn btn-outline-danger mcWizardNavBtn"
                onClick={resetAll}
                disabled={loading}
                title="Clear and start over"
              >
                <span className="d-flex align-items-center">
                  <CircleX className="mx-2" />
                  Reset
                </span>
              </button>
            ) : null}

            {step < STEP_KEYS.length - 1 ? (
              <button
                type="button"
                className="btn btn-memory mcWizardNavBtn"
                onClick={goNext}
                disabled={loading}
              >
                <span className="d-flex align-items-center justify-content-center" aria-hidden="true">
                  Next
                  <ArrowBigRightDash className="mx-2" />
                </span>
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-memory mcWizardNavBtn"
                onClick={openCertificateModal}
                disabled={loading || !canShowCertificateBtn}
                title="Open certificate"
              >
                <span className="d-flex align-items-center justify-content-center" aria-hidden="true">
                  Open
                  <Award className="mx-2" />
                </span>
              </button>
            )}
          </div>
        </footer>
      </section>

      <ModalCertificate
        thesis={selectedThesis}
        certificate={certificateData}
        onClose={() => {
          // keep your old close behavior, but wizard-friendly:
          // do not nuke the whole session unless you want to.
          // If you want the original full reset, call resetAll().
        }}
      />
    </form>
  );
};

export default Verify;