import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import ModalCertificate from "../../components/modal/ModalCertificate";
import { useToast } from "../../utils/toast";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";

import {
  Search,
  ShieldCheck,
  FileSearch,
  Eye,
  FileBadge,
  Copy,
  Check,
  Clock3,
  XCircle,
  Link2Off,
  CircleQuestionMark,
  CircleSlash,
  OctagonAlert,
  BadgeCheck,
  RefreshCcw,
} from "lucide-react";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";
const gateway = import.meta.env.VITE_PINATA_GATEWAY_DOMAIN;

const safeStr = (v) => String(v ?? "").trim();
const norm = (v) => safeStr(v).toLowerCase();

/* ===================== CLIPBOARD (igual que tus otras vistas) ===================== */
async function copyToClipboard(text) {
  try {
    if (!text) return false;
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

/* ===================== PDF VIEWER (MINI, NO CONTROLS) ===================== */
function SinglePdfViewer({ url, height = 720 }) {
  const [numPages, setNumPages] = useState(0);
  const FIXED_SCALE = 0.7;

  useEffect(() => {
    setNumPages(0);
  }, [url]);

  if (!url) return null;

  return (
    <div className="mcVerify2PdfMini" style={{ height, width: "100%" }}>
      <style>{`
        .react-pdf__Page { display: flex; justify-content: center; }
        .react-pdf__Page__canvas { margin: 0 auto !important; display: block; }
        .react-pdf__Page__textContent { display: none !important; }
        .react-pdf__Page__annotations { display: none !important; }
      `}</style>

      <div className="mcVerify2PdfMiniScroll">
        <Document
          file={url}
          onLoadSuccess={(info) => setNumPages(info.numPages)}
          onLoadError={(e) => console.error("PDF load error (Verify):", e)}
          loading={<div className="mcWizardCallout">Loading PDF…</div>}
          error={
            <div className="mcWizardCalloutWarn">Could not open the PDF.</div>
          }
        >
          <div className="mcVerify2PdfMiniPages">
            {Array.from({ length: numPages }, (_, i) => i + 1).map((p) => (
              <div key={p} className="mcVerify2PdfMiniPage">
                <Page
                  pageNumber={p}
                  scale={FIXED_SCALE}
                  renderAnnotationLayer={false}
                  renderTextLayer={false}
                />
              </div>
            ))}
          </div>
        </Document>
      </div>
    </div>
  );
}

/* ===================== VERIFY ===================== */
const Verify = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { showToast } = useToast();

  const [hashInput, setHashInput] = useState("");
  const [selectedThesis, setSelectedThesis] = useState(null);
  const [certificateData, setCertificateData] = useState(null);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  const [certLoading, setCertLoading] = useState(false);
  const [certError, setCertError] = useState("");

  // ✅ feedback visual de copy (misma dinámica que LibraryPSearch)
  const [copiedKey, setCopiedKey] = useState(null);

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
    [selectedThesis],
  );

  const hasTx = !!safeStr(selectedThesis?.txHash);

  const statusKey = useMemo(() => {
    if (!selectedThesis) return "IDLE";

    if (statusUpper === "REJECTED") return "REJECTED";
    if (statusUpper === "PENDING") return "PENDING";

    if (statusUpper === "APPROVED") return hasTx ? "APPROVED" : "NOT_CERTIFIED";

    if (statusUpper === "NOT_CERTIFIED") return "NOT_CERTIFIED";
    if (!hasTx) return "NOT_CERTIFIED";

    return "UNKNOWN";
  }, [selectedThesis, statusUpper, hasTx]);

  const statusLabel = useMemo(() => {
    if (statusKey === "NOT_CERTIFIED") return "NOT CERTIFIED";
    return statusKey;
  }, [statusKey]);

  const RightIcon = useMemo(() => {
    if (statusKey === "APPROVED") return BadgeCheck;
    if (statusKey === "PENDING") return Clock3;
    if (statusKey === "REJECTED") return OctagonAlert;
    if (statusKey === "NOT_CERTIFIED") return CircleSlash;
    if (statusKey === "UNKNOWN") return CircleQuestionMark;
    return ShieldCheck;
  }, [statusKey]);

  // ✅ tone usando tus clases (approved/pending/rejected/unknown)
  const pillTone = useMemo(() => {
    if (statusKey === "APPROVED") return "approved";
    if (statusKey === "PENDING") return "pending";
    if (statusKey === "REJECTED") return "rejected";
    return "unknown";
  }, [statusKey]);

  const panelTone = useMemo(() => {
    if (statusKey === "APPROVED") return "approved";
    if (statusKey === "PENDING") return "pending";
    if (statusKey === "REJECTED") return "rejected";
    if (statusKey === "NOT_CERTIFIED") return "notcert";
    if (statusKey === "UNKNOWN") return "unknown";
    return "idle";
  }, [statusKey]);

  const pdfUrl = useMemo(() => {
    const cid = safeStr(selectedThesis?.ipfsCid);
    if (!cid || !gateway) return "";
    return `https://${gateway}/ipfs/${cid}`;
  }, [selectedThesis]);

  const canPreview = !!selectedThesis && statusKey === "APPROVED" && !!pdfUrl;
  const canShowCertificateBtn = !!selectedThesis && statusKey === "APPROVED";

  const openCertificateModal = () => {
    const el = document.getElementById("modalCertificate");
    if (!el) {
      console.warn("[Verify] modalCertificate element not found in DOM");
      return;
    }
    const modal = window.bootstrap?.Modal?.getOrCreateInstance(el, {
      backdrop: "static",
      keyboard: true,
    });
    modal?.show();
  };

  // ✅ COPIAR con:
  // - MISMA clase/botón visual (mcHashCopyBtn + check)
  // - TOAST como ThesisSearch (useToast)
  const handleCopy = async (key, value, label = "Copied") => {
    const text = safeStr(value);
    const ok = await copyToClipboard(text);

    if (!ok) {
      showToast({
        message: "Could not copy to clipboard",
        type: "error",
        icon: OctagonAlert,
        duration: 2200,
      });
      return;
    }

    setCopiedKey(String(key));
    setTimeout(() => setCopiedKey(null), 1400);

    showToast({
      message: label,
      type: "success",
      icon: BadgeCheck,
      duration: 2000,
    });
  };

  const handleOpenCertificate = async () => {
    if (!selectedThesis?._id) return;
    if (statusKey !== "APPROVED") return;

    setCertError("");

    try {
      setCertLoading(true);

      if (certificateData) {
        openCertificateModal();
        return;
      }

      const res = await axios.get(
        `${API_BASE_URL}/api/certificates/thesis/${selectedThesis._id}`,
      );

      const payload = res?.data;
      if (!payload) {
        setCertError("Certificate not available yet.");
        showToast({
          message: "Certificate not available yet",
          type: "error",
          icon: OctagonAlert,
          duration: 2200,
        });
        return;
      }

      setCertificateData(payload);
      setTimeout(() => openCertificateModal(), 0);
    } catch (e) {
      console.error("[Verify] openCertificate error:", e);
      setCertificateData(null);
      setCertError("No se pudo obtener el certificado.");
      showToast({
        message: "No se pudo obtener el certificado",
        type: "error",
        icon: OctagonAlert,
        duration: 2200,
      });
    } finally {
      setCertLoading(false);
    }
  };

  const resetAll = () => {
    setHashInput("");
    setSelectedThesis(null);
    setCertificateData(null);
    setLoading(false);
    setErrorMsg("");
    setHasSearched(false);
    setCertLoading(false);
    setCertError("");
    setCopiedKey(null);
    navigate("/verify", { replace: true });
  };

  // Deep-link /verify/:id
  useEffect(() => {
    const loadById = async () => {
      if (!id) return;
      if (isTypingRef.current) return;

      try {
        setLoading(true);
        setErrorMsg("");
        setHasSearched(true);
        setCertError("");
        setCopiedKey(null);

        const thesisRes = await axios.get(`${API_BASE_URL}/api/theses/${id}`);
        const thesis = thesisRes.data;

        if (!thesis?._id) {
          setSelectedThesis(null);
          setCertificateData(null);
          setErrorMsg("No match found. Check the link and try again.");
          return;
        }

        setSelectedThesis(thesis);

        if (!isTypingRef.current) {
          setHashInput(thesis?.fileHash || thesis?.txHash || "");
        }

        // precarga opcional — si falla no importa
        try {
          const certRes = await axios.get(
            `${API_BASE_URL}/api/certificates/thesis/${thesis._id}`,
          );
          setCertificateData(certRes.data);
        } catch {
          setCertificateData(null);
        }
      } catch {
        setSelectedThesis(null);
        setCertificateData(null);
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
      setCertError("");
      setCopiedKey(null);
      navigate("/verify", { replace: true });
      return false;
    }

    try {
      setLoading(true);
      setErrorMsg("");
      setHasSearched(true);
      setCertError("");
      setCopiedKey(null);

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

      const thesisRes = await axios.get(
        `${API_BASE_URL}/api/theses/${found._id}`,
      );
      const thesis = thesisRes.data;

      setSelectedThesis(thesis);
      setCertificateData(null);
      navigate(`/verify/${thesis._id}`, { replace: true });

      // precarga opcional
      try {
        const certRes = await axios.get(
          `${API_BASE_URL}/api/certificates/thesis/${thesis._id}`,
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

  const onHashKeyDown = (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    if (loading) return;
    doSearch();
  };

  const rightSubtitle = useMemo(() => {
    if (!selectedThesis)
      return "Paste a file hash or transaction hash to start verification.";
    if (statusKey === "NOT_CERTIFIED")
      return "This thesis exists, but it has not been certified on-chain yet.";
    if (statusKey === "PENDING")
      return "This thesis is pending review. Preview/certificate unlock after approval.";
    if (statusKey === "REJECTED")
      return "This thesis was rejected. Preview/certificate are not available.";
    if (statusKey === "UNKNOWN")
      return "Status is not recognized. Please verify the record details.";
    if (statusKey === "APPROVED")
      return "Approved and certified. Preview is available.";
    return "—";
  }, [selectedThesis, statusKey]);

  const rightTip = useMemo(() => {
    if (!selectedThesis) return { icon: Search, text: "Tip: try a txHash too" };
    if (statusKey === "NOT_CERTIFIED")
      return { icon: Link2Off, text: "No on-chain transaction yet" };
    if (statusKey === "PENDING")
      return { icon: Clock3, text: "Waiting for approval" };
    if (statusKey === "REJECTED")
      return { icon: XCircle, text: "Not eligible for certificate" };
    if (statusKey === "UNKNOWN")
      return { icon: ShieldCheck, text: "Check the record fields" };
    if (statusKey === "APPROVED")
      return { icon: Eye, text: "Preview unlocked" };
    return { icon: ShieldCheck, text: "—" };
  }, [selectedThesis, statusKey]);

  const TipIcon = rightTip.icon;
  const showApprovedMeta = !!selectedThesis && statusKey === "APPROVED";

  return (
    <div className="mcVerify2Wrap">
      <div className="mcVerify2Grid">
        {/* LEFT */}
        <aside className="mcVerify2Left">
          {/* STEP 1 */}
          <section className="mcVerify2StepCard">
            <div className="mcVerify2StepHead">
              <div className="mcVerify2StepText">
                <div className="mcVerify2StepTitle">Paste the hash</div>
                <div className="mcVerify2StepSub">
                  Use the file hash or the blockchain transaction hash.
                </div>
              </div>
            </div>

            <div className="input-group mcWizardInputGroup">
              <input
                className={`form-control mcWizardInputGroupInput ${
                  errorMsg ? "is-invalid" : ""
                }`}
                value={hashInput}
                onChange={(e) => {
                  markTyping();
                  setHashInput(e.target.value);
                  if (errorMsg) setErrorMsg("");
                }}
                onKeyDown={onHashKeyDown}
                placeholder="Paste fileHash or txHash..."
                disabled={loading}
                autoComplete="off"
                spellCheck={false}
              />

              <button
                type="button"
                className="btn btn-outline-memory mcWizardInputGroupBtn d-flex align-items-center gap-2"
                onClick={doSearch}
                disabled={!hashInput.trim() || loading}
              >
                <Search size={18} /> {loading ? "Searching" : "Search"}
              </button>
            </div>

            {errorMsg ? (
              <div className="invalid-feedback d-block">{errorMsg}</div>
            ) : null}
          </section>

          {/* STEP 2 */}
          <section className="mcVerify2StepCard mcVerify2StepCard--status">
            {/* pill top-right */}
            {hasSearched && selectedThesis ? (
              <div className="mcVerify2StatusCorner">
                <span className={`mcSheetStatus mcSheetStatus--${pillTone}`}>
                  <span className="mcSheetStatusIcon">
                    <RightIcon size={16} />
                  </span>
                  {statusLabel}
                </span>
              </div>
            ) : null}

            <div className="mcVerify2StepHead">
              <div className="mcVerify2StepText">
                <div className="mcVerify2StepTitle">Verification</div>
                <div className="mcVerify2StepSub">
                  Status + preview + certificate (only when approved).
                </div>
              </div>
            </div>

            {/* Meta SOLO si APPROVED */}
            {showApprovedMeta ? (
              <div className="mcVerify2Meta">
                {/* Thesis ID */}
                <div className="mcVerify2MetaRow">
                  <span className="mcVerify2MetaKey">Thesis ID</span>
                  <span className="mcVerify2Mono">{selectedThesis?._id || "—"}</span>

                  <button
                    className={`mcHashCopyBtn ${
                      copiedKey === "thesisId" ? "is-copied" : ""
                    }`}
                    type="button"
                    title="Copy thesis id"
                    onClick={() =>
                      handleCopy("thesisId", selectedThesis?._id, "Thesis ID copied")
                    }
                    disabled={!selectedThesis?._id}
                  >
                    {copiedKey === "thesisId" ? (
                      <Check size={16} />
                    ) : (
                      <Copy size={16} />
                    )}
                  </button>
                </div>

                {/* File hash */}
                <div className="mcVerify2MetaRow">
                  <span className="mcVerify2MetaKey">File hash</span>
                  <span className="mcVerify2Mono">
                    {selectedThesis?.fileHash || "—"}
                  </span>

                  <button
                    className={`mcHashCopyBtn ${
                      copiedKey === "fileHash" ? "is-copied" : ""
                    }`}
                    type="button"
                    title="Copy file hash"
                    onClick={() =>
                      handleCopy("fileHash", selectedThesis?.fileHash, "File hash copied")
                    }
                    disabled={!selectedThesis?.fileHash}
                  >
                    {copiedKey === "fileHash" ? (
                      <Check size={16} />
                    ) : (
                      <Copy size={16} />
                    )}
                  </button>
                </div>

                {/* Transaction */}
                <div className="mcVerify2MetaRow">
                  <span className="mcVerify2MetaKey">Transaction</span>
                  <span className="mcVerify2Mono">
                    {selectedThesis?.txHash || "—"}
                  </span>

                  <button
                    className={`mcHashCopyBtn ${
                      copiedKey === "txHash" ? "is-copied" : ""
                    }`}
                    type="button"
                    title="Copy tx hash"
                    onClick={() =>
                      handleCopy("txHash", selectedThesis?.txHash, "Transaction hash copied")
                    }
                    disabled={!selectedThesis?.txHash}
                  >
                    {copiedKey === "txHash" ? (
                      <Check size={16} />
                    ) : (
                      <Copy size={16} />
                    )}
                  </button>
                </div>

                {/* IPFS CID */}
                <div className="mcVerify2MetaRow">
                  <span className="mcVerify2MetaKey">IPFS CID</span>
                  <span className="mcVerify2Mono">
                    {selectedThesis?.ipfsCid || "—"}
                  </span>

                  <button
                    className={`mcHashCopyBtn ${
                      copiedKey === "ipfsCid" ? "is-copied" : ""
                    }`}
                    type="button"
                    title="Copy IPFS CID"
                    onClick={() =>
                      handleCopy("ipfsCid", selectedThesis?.ipfsCid, "IPFS CID copied")
                    }
                    disabled={!selectedThesis?.ipfsCid}
                  >
                    {copiedKey === "ipfsCid" ? (
                      <Check size={16} />
                    ) : (
                      <Copy size={16} />
                    )}
                  </button>
                </div>
              </div>
            ) : selectedThesis ? (
              <div className="mcVerify2Empty">
                Details unlock when the thesis is <b>APPROVED</b>.
              </div>
            ) : (
              <div className="mcVerify2Empty">
                Paste a hash and search to load a thesis.
              </div>
            )}

            {/* acciones centradas */}
            <div className="mcVerify2Actions mcVerify2Actions--center">
              {canShowCertificateBtn ? (
                <button
                  type="button"
                  className="btn btn-memory d-flex align-items-center gap-2"
                  onClick={handleOpenCertificate}
                  disabled={loading || certLoading}
                  title="Open certificate"
                >
                  <FileBadge size={18} />
                  {certLoading ? "Loading…" : "Open certificate"}
                </button>
              ) : null}

              {hasSearched ? (
                <button
                  type="button"
                  className="btn btn-outline-memory d-flex align-items-center gap-2"
                  onClick={resetAll}
                  disabled={loading || certLoading}
                  title="Clear and start over"
                >
                  <RefreshCcw size={18} />
                  Reset
                </button>
              ) : null}
            </div>

            {certError ? (
              <div className="mcWizardCalloutWarn" style={{ marginTop: 10 }}>
                {certError}
              </div>
            ) : null}
          </section>
        </aside>

        {/* RIGHT */}
        <section className={`mcVerify2Right mcVerify2Right--${panelTone}`}>
          {!loading && !selectedThesis && !errorMsg ? (
            <div className="mcVerify2RightInner">
              <div className={`mcVerify2HeroIcon is-${panelTone}`}>
                <ShieldCheck size={34} />
              </div>
              <div className="mcVerify2HeroTitle">Ready to verify</div>
              <div className="mcVerify2HeroText">
                Paste a file hash or transaction hash to start verification.
              </div>
              <div className="mcVerify2TipPill">
                <Search size={16} />
                <span>Tip: try a txHash too</span>
              </div>
            </div>
          ) : null}

          {loading ? (
            <div className="mcVerify2RightInner">
              <div className={`mcVerify2HeroIcon is-${panelTone}`}>
                <Search size={34} />
              </div>
              <div className="mcVerify2HeroTitle">Searching…</div>
              <div className="mcVerify2HeroText">
                Checking the hash against the registry.
              </div>
              <div className="mcVerify2TipPill">
                <Clock3 size={16} />
                <span>Please wait</span>
              </div>
            </div>
          ) : null}

          {!loading && errorMsg && hasSearched && !selectedThesis ? (
            <div className="mcVerify2RightInner">
              <div className={`mcVerify2HeroIcon is-rejected`}>
                <XCircle size={34} />
              </div>
              <div className="mcVerify2HeroTitle">No match found</div>
              <div className="mcVerify2HeroText">Check the hash and try again.</div>
              <div className="mcVerify2TipPill">
                <FileSearch size={16} />
                <span>Paste the full hash</span>
              </div>
            </div>
          ) : null}

          {!loading && selectedThesis && !canPreview ? (
            <div className="mcVerify2RightInner">
              <div className={`mcVerify2HeroIcon is-${panelTone}`}>
                <RightIcon size={34} />
              </div>
              <div className="mcVerify2HeroTitle">Status: {statusLabel}</div>
              <div className="mcVerify2HeroText">{rightSubtitle}</div>
              <div className="mcVerify2TipPill">
                <TipIcon size={16} />
                <span>{rightTip.text}</span>
              </div>
            </div>
          ) : null}

          {!loading && selectedThesis && canPreview ? (
            <div className="mcVerify2PreviewWrap">
              <div className="mcVerify2PreviewBody">
                <div className="mcVerify2PreviewInset">
                  <SinglePdfViewer url={pdfUrl} height={600} />
                </div>
              </div>
            </div>
          ) : null}
        </section>
      </div>

      <ModalCertificate
        thesis={selectedThesis}
        certificate={certificateData}
        onClose={() => {
          setCertificateData(null);
        }}
      />
    </div>
  );
};

export default Verify;