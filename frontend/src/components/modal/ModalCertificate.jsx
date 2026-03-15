import React, { useRef, useState, useMemo, useEffect } from "react";
import axios from "axios";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import QRCode from "qrcode";
import CertificateTemplate from "../../utils/CertificateTemplate";
import { useToast } from "../../utils/toast";
import {
  Fingerprint,
  BadgeCheck, 
  Clock3,
  OctagonAlert,
  CircleX,
  Download,
  Copy,
  Blocks,
  Hash,
  CalendarDays,
  Link2,
  Link,
  FileKey,
  Database,
  Check,
} from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const safeStr = (v) => String(v ?? "").trim();
const normalizeStatus = (s) => safeStr(s).toUpperCase();

/* ✅ MISMA FORMA que ModalViewThesis (month long, day 2-digit, year numeric) */
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

const StatusPill = ({ status }) => {
  const up = normalizeStatus(status);

  let label = "Pending";
  let cls = "mcSheetStatus mcSheetStatus--pending";
  let Icon = Clock3;

  if (up === "APPROVED" || up === "CERTIFIED") {
    label = "Certified";
    cls = "mcSheetStatus mcSheetStatus--approved";
    Icon = BadgeCheck;
  } else if (up === "REJECTED") {
    label = "Rejected";
    cls = "mcSheetStatus mcSheetStatus--rejected";
    Icon = OctagonAlert;
  }

  return (
    <div className={cls}>
      <span className="mcSheetStatusIcon">
        <Icon size={16} />
      </span>
      <span className="mcSheetStatusText">{label}</span>
    </div>
  );
};

const trimHash = (hash, start = 8, end = 6) => {
  if (!hash) return "—";
  if (hash.length <= start + end) return hash;
  return `${hash.slice(0, start)}…${hash.slice(-end)}`;
};

function ModalCertificate({ thesis, certificate }) {
  const { showToast } = useToast();

  /* ================= DERIVED ================= */

  const txHash = useMemo(() => {
    const raw =
      certificate?.mongo?.txHash ||
      certificate?.txHash ||
      certificate?.explorerTx ||
      "";
    const s = safeStr(raw);
    if (!s) return "";
    const match = s.includes("/tx/") ? s.split("/tx/")[1] : s;
    return safeStr(match);
  }, [certificate]);

  const blockNumber = useMemo(() => {
    const v =
      certificate?.mongo?.blockNumber ??
      certificate?.blockNumber ??
      certificate?.mongo?.block ??
      certificate?.block ??
      "—";
    return v === null || v === undefined || v === "" ? "—" : v;
  }, [certificate]);

  const chainId = useMemo(() => {
    const v =
      certificate?.mongo?.chainId ??
      certificate?.chainId ??
      certificate?.mongo?.networkId ??
      certificate?.networkId ??
      "—";
    return v === null || v === undefined || v === "" ? "—" : v;
  }, [certificate]);

  const fileHash = useMemo(() => {
    return (
      certificate?.mongo?.fileHash ||
      certificate?.fileHash ||
      thesis?.fileHash ||
      thesis?.mongo?.fileHash ||
      ""
    );
  }, [certificate, thesis]);

  const ipfsCid = useMemo(() => {
    return (
      certificate?.mongo?.ipfsCid ||
      certificate?.ipfsCid ||
      thesis?.ipfsCid ||
      thesis?.mongo?.ipfsCid ||
      ""
    );
  }, [certificate, thesis]);

  /* ✅ FECHA: usar updatedAt + fallbacks */
  const certifiedAtRaw = useMemo(() => {
    return (
      certificate?.mongo?.updatedAt ||
      certificate?.updatedAt ||
      certificate?.mongo?.certifiedAt ||
      certificate?.certifiedAt ||
      certificate?.mongo?.issuedAt ||
      certificate?.issuedAt ||
      certificate?.mongo?.createdAt ||
      certificate?.createdAt ||
      thesis?.updatedAt ||
      thesis?.createdAt ||
      null
    );
  }, [certificate, thesis]);

  const certifiedAt = useMemo(
    () => formatDateShort(certifiedAtRaw),
    [certifiedAtRaw]
  );

  const certStatus = useMemo(() => {
    return certificate?.status || thesis?.status || "PENDING";
  }, [certificate, thesis]);

  /* ================= INSTITUTION FETCH ================= */

  const institutionId = useMemo(() => {
    return (
      thesis?.institution?._id ||
      thesis?.institution?.id ||
      thesis?.institution ||
      thesis?.mongo?.institution?._id ||
      thesis?.mongo?.institution?.id ||
      thesis?.mongo?.institution ||
      certificate?.mongo?.institution?._id ||
      certificate?.mongo?.institution?.id ||
      certificate?.mongo?.institution ||
      certificate?.institution?._id ||
      certificate?.institution?.id ||
      certificate?.institution ||
      ""
    );
  }, [thesis, certificate]);

  const [institutionData, setInstitutionData] = useState(null);
  const [isLoadingInstitution, setIsLoadingInstitution] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchInstitution = async () => {
      if (!institutionId || typeof institutionId !== "string") {
        setInstitutionData(null);
        return;
      }

      try {
        setIsLoadingInstitution(true);

        const { data } = await axios.get(
          `${API_BASE_URL}/api/institutions/${institutionId}`
        );

        if (!isMounted) return;

        setInstitutionData(data?.institution || data || null);
      } catch (error) {
        console.warn("Could not fetch institution data", error);
        if (isMounted) {
          setInstitutionData(null);
        }
      } finally {
        if (isMounted) {
          setIsLoadingInstitution(false);
        }
      }
    };

    fetchInstitution();

    return () => {
      isMounted = false;
    };
  }, [institutionId]);

  /* ================= STATE ================= */
  const [copiedField, setCopiedField] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState("");

  const hiddenWrapRef = useRef(null);

  /* ================= COPY ================= */
  const handleCopy = async (value, key, label = "Copied") => {
    if (!value) {
      showToast({
        message: "Nothing to copy.",
        type: "error",
        icon: OctagonAlert,
        duration: 1600,
      });
      return;
    }

    try {
      await navigator.clipboard.writeText(String(value));
      setCopiedField(key);
      window.setTimeout(() => setCopiedField(null), 900);

      showToast({
        message: `${label} ✅`,
        type: "success",
        icon: Check,
        duration: 1400,
      });
    } catch (e) {
      console.warn("Copy failed", e);
      showToast({
        message: "Copy failed ❌",
        type: "error",
        icon: OctagonAlert,
        duration: 1800,
      });
    }
  };

  /* ================= DOWNLOAD ================= */
  const handleDownloadCertificate = async () => {
    showToast({
      message: "La descarga del certificado está iniciando…",
      type: "success",
      icon: Download,
      duration: 1600,
    });

    if (!thesis || !certificate) {
      showToast({
        message: "Certificate data not available.",
        type: "error",
        icon: OctagonAlert,
        duration: 2000,
      });
      return;
    }

    try {
      setIsGenerating(true);

      showToast({
        message: "Generating certificate…",
        type: "success",
        icon: Clock3,
        duration: 1400,
      });

      const APP_URL = import.meta.env.VITE_APP_URL || window.location.origin;
      const verificationUrl = `${APP_URL}/verify/${thesis._id}`;

      const qr = await QRCode.toDataURL(verificationUrl, {
        errorCorrectionLevel: "M",
        margin: 1,
        width: 320,
      });
      setQrDataUrl(qr);

      await new Promise((r) => setTimeout(r, 80));

      const node = hiddenWrapRef.current?.querySelector("#mc-certificate");
      if (!node) throw new Error("Certificate DOM not found");

      const canvas = await html2canvas(node, {
        scale: 2,
        backgroundColor: "#FCFCFD",
        useCORS: true,
      });

      const imgData = canvas.toDataURL("image/png");

      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "pt",
        format: "a4",
      });

      const pageW = pdf.internal.pageSize.getWidth();
      const imgW = pageW;
      const imgH = (canvas.height * imgW) / canvas.width;

      pdf.addImage(imgData, "PNG", 0, 0, imgW, imgH);
      pdf.save("MemoryChain_Certificate.pdf");

      showToast({
        message: "Certificate downloaded ✅",
        type: "success",
        icon: BadgeCheck,
        duration: 2200,
      });
    } catch (err) {
      console.error(err);
      showToast({
        message: "Could not generate certificate ❌",
        type: "error",
        icon: OctagonAlert,
        duration: 2400,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      <div className="modal fade" id="modalCertificate" tabIndex="-1">
        <div className="modal-dialog modal-xs modal-dialog-centered">
          <div className="modal-content mcSheetModal">
            <div className="mcPanelCard mcSheetPanel">
              {/* HEADER */}
              <div className="mcPanelHead">
                <div className="mcPanelHeadLeft">
                  <div className="mcPanelIcon">
                    <Fingerprint />
                  </div>
                  <h5 className="m-0">Certificate details</h5>
                </div>

                <div className="mcPanelHeadRight">
                  <StatusPill status={certStatus} />
                </div>
              </div>

              {/* BODY */}
              <div className="mcPanelBody mcSheetBody">
                <div className="mcSheetSideHead">
                  <Hash size={16} />
                  <span>BLOCKCHAIN DATA</span>
                </div>

                <div className="mcSheetKvGrid">
                  {/* ROW 1 */}
                  <div className="mcSheetKv">
                    <div className="mcSheetKvLabel">
                      <Hash size={14} /> Chain ID
                    </div>
                    <div className="mcSheetKvValue">{chainId}</div>
                  </div>

                  <div className="mcSheetKv mcSheetKv--right">
                    <div className="mcSheetKvLabel">
                      <Blocks size={14} /> Block
                    </div>
                    <div className="mcSheetKvValue">{blockNumber}</div>
                  </div>

                  {/* ROW 2 */}
                  <div className="mcSheetKv">
                    <div className="mcSheetKvLabel">
                      <Link2 size={14} /> Transaction
                    </div>

                    <div className="mcSheetKvValueId mcUserIdRow">
                      <span title={txHash}>{trimHash(txHash)}</span>

                      <button
                        type="button"
                        className={`mcHashCopyBtn ${
                          copiedField === "tx" ? "is-copied" : ""
                        }`}
                        onClick={() =>
                          handleCopy(txHash, "tx", "Transaction hash copied")
                        }
                        title="Copy transaction hash"
                        aria-label="Copy transaction hash"
                        disabled={!txHash}
                      >
                        {copiedField === "tx" ? (
                          <Check size={12} />
                        ) : (
                          <Copy size={12} />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="mcSheetKv mcSheetKv--right">
                    <div className="mcSheetKvLabel">
                      <CalendarDays size={14} /> Certified
                    </div>
                    <div className="mcSheetKvValue">{certifiedAt}</div>
                  </div>

                  {/* ROW 3 */}
                  <div className="mcSheetKv">
                    <div className="mcSheetKvLabel">
                      <FileKey size={14} /> File Hash
                    </div>

                    <div className="mcSheetKvValueId mcUserIdRow">
                      <span title={fileHash}>{trimHash(fileHash)}</span>

                      <button
                        type="button"
                        className={`mcHashCopyBtn ${
                          copiedField === "file" ? "is-copied" : ""
                        }`}
                        onClick={() =>
                          handleCopy(fileHash, "file", "File hash copied")
                        }
                        title="Copy file hash"
                        aria-label="Copy file hash"
                        disabled={!fileHash}
                      >
                        {copiedField === "file" ? (
                          <Check size={12} />
                        ) : (
                          <Copy size={12} />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="mcSheetKv mcSheetKv--right">
                    <div className="mcSheetKvLabel">
                      <Database size={14} /> IPFS CID
                    </div>

                    <div className="mcSheetKvValueId mcUserIdRow">
                      <button
                        type="button"
                        className={`mcHashCopyBtn ${
                          copiedField === "ipfs" ? "is-copied" : ""
                        }`}
                        onClick={() =>
                          handleCopy(ipfsCid, "ipfs", "IPFS CID copied")
                        }
                        title="Copy IPFS CID"
                        aria-label="Copy IPFS CID"
                        disabled={!ipfsCid}
                      >
                        {copiedField === "ipfs" ? (
                          <Check size={12} />
                        ) : (
                          <Copy size={12} />
                        )}
                      </button>
                      <span title={ipfsCid}>{trimHash(ipfsCid)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* FOOTER */}
              <div className="mcPanelHead mcSheetFooterHead">
                <div className="mcPanelHeadRight d-flex gap-2 ms-auto">
                  <button
                    type="button"
                    className="btn btn-outline-memory d-flex align-items-center gap-2"
                    data-bs-dismiss="modal"
                    disabled={isGenerating}
                  >
                    <CircleX size={18} />
                    Close
                  </button>

                  <a
                    type="button"
                    className="btn btn-polygon d-flex align-items-center gap-2"
                    href={`https://amoy.polygonscan.com/tx/${txHash}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Link size={18} />
                    Transaction
                  </a>

                  <button
                    type="button"
                    className="btn btn-memory d-flex align-items-center gap-2"
                    onClick={handleDownloadCertificate}
                    disabled={isGenerating || isLoadingInstitution}
                    title={
                      isGenerating
                        ? "Generating..."
                        : isLoadingInstitution
                        ? "Loading institution..."
                        : "Download certificate"
                    }
                  >
                    <Download size={18} />
                    Download
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TEMPLATE OCULTO */}
      <div
        ref={hiddenWrapRef}
        style={{
          position: "fixed",
          left: "-99999px",
          top: 0,
          width: 1200,
          opacity: 0,
          pointerEvents: "none",
        }}
      >
        <CertificateTemplate
          thesis={thesis}
          certificate={certificate}
          institution={institutionData}
          qrDataUrl={qrDataUrl}
        />
      </div>
    </>
  );
}

export default ModalCertificate;