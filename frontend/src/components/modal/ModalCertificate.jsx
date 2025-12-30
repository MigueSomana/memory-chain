import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import QRCode from "qrcode";

import CertificateTemplate from "../../utils/CertificateTemplate";

import {
  FacebookIcon,
  TwitterIcon,
  InstagramIcon,
  DownloadIcon,
  CopyIcon,
} from "../../utils/icons";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

function ModalCertificate({ thesis, certificate }) {
  const txHash = certificate?.explorerTx?.split("/tx/")[1] || "";

  const [qrDataUrl, setQrDataUrl] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  // ✅ Institution fetched
  const [institution, setInstitution] = useState(null);
  const [instLoading, setInstLoading] = useState(false);
  const [instError, setInstError] = useState("");

  const hiddenWrapRef = useRef(null);

  const institutionId = useMemo(() => {
    const inst = thesis?.institution;
    // puede venir como objeto con _id o como string
    return typeof inst === "string" ? inst : inst?._id || "";
  }, [thesis]);

  // ✅ Fetch institution by ID
  useEffect(() => {
    const fetchInstitution = async () => {
      if (!institutionId) {
        setInstitution(null);
        return;
      }

      try {
        setInstLoading(true);
        setInstError("");

        // Ajusta el endpoint a tu backend:
        // Ejemplo: /api/institutions/:id
        const res = await axios.get(`${API_BASE_URL}/api/institutions/${institutionId}`);

        setInstitution(res.data || null);
      } catch (err) {
        console.error("Error fetching institution:", err);
        setInstitution(null);
        setInstError("No se pudo cargar la institución.");
      } finally {
        setInstLoading(false);
      }
    };

    fetchInstitution();
  }, [institutionId]);

  const renderTrimmedHash = (hash, start = 10, end = 10) => {
    if (!hash) return "";
    if (hash.length <= start + end) return hash;
    return `${hash.slice(0, start)}…${hash.slice(-end)}`;
  };

  const handleCopyTx = async () => {
    if (!txHash) return;
    try {
      await navigator.clipboard.writeText(txHash);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleFacebook = () => console.log("Facebook share", certificate);
  const handleTwitter = () => console.log("Twitter share", certificate);
  const handleInstagram = () => console.log("Instagram share", certificate);

  const handleDownloadCertificate = async () => {
    if (!thesis || !certificate) return;

    try {
      setIsGenerating(true);

      const APP_URL = import.meta.env.VITE_APP_URL || window.location.origin;
      const verificationUrl = `${APP_URL}/verify/${thesis._id}`;

      const qr = await QRCode.toDataURL(verificationUrl, {
        errorCorrectionLevel: "M",
        margin: 1,
        width: 320,
      });
      setQrDataUrl(qr);

      // espera a que React pinte el QR dentro del template oculto
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
      const pageH = pdf.internal.pageSize.getHeight();

      const imgW = pageW;
      const imgH = (canvas.height * imgW) / canvas.width;
      const y = (pageH - imgH) / 2;

      pdf.addImage(imgData, "PNG", 0, Math.max(0, y), imgW, imgH);

      const safeTitle = (thesis?.title || "certificate")
        .replace(/[^\w\s-]/g, "")
        .trim()
        .slice(0, 60)
        .replace(/\s+/g, "_");

      pdf.save(`MemoryChain_Certificate_${safeTitle}.pdf`);
    } catch (err) {
      console.error(err);
      alert("No se pudo generar el certificado.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      <div
        className="modal fade modal"
        id="modalCertificate"
        tabIndex="-1"
        aria-labelledby="modalCertificateLabel"
        aria-hidden="true"
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content bg-mc-dark text-white">
            <div className="modal-body container mb-4">
              <div className="row">
                <div className="button-close-modal-fix">
                  <button
                    type="button"
                    className="btn-close"
                    data-bs-dismiss="modal"
                    aria-label="Close"
                    disabled={isGenerating}
                  ></button>
                </div>
                <div className="col-12 d-flex flex-column align-items-center justify-content-center py-1">
                  <h3 id="modalCertificateLabel" className="fw-bold mb-2">
                    Share
                  </h3>

                  {/* opcional: warning si la institución no cargó */}
                  {instError ? (
                    <div className="alert alert-warning py-2 w-100" role="alert">
                      {instError}
                    </div>
                  ) : null}

                  <p className="d-flex align-items-center gap-2 flex-wrap mb-4">
                    <strong>SmartContract ID:</strong>

                    <a
                      className="t-white"
                      href={certificate?.explorerTx}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={txHash}
                    >
                      {renderTrimmedHash(txHash)}
                    </a>

                    <button
                      type="button"
                      className="btn btn-link p-0 d-flex align-items-center"
                      onClick={handleCopyTx}
                      title="Copy transaction hash"
                      disabled={isGenerating}
                    >
                      {CopyIcon}
                    </button>
                  </p>

                  <div className="d-flex align-items-center justify-content-center gap-3 mb-4">
                    <button
                      type="button"
                      className="btn btn-memory d-flex align-items-center justify-content-center"
                      style={{ width: 78, height: 64, borderRadius: 16 }}
                      onClick={handleFacebook}
                      disabled={isGenerating}
                    >
                      {FacebookIcon}
                    </button>
                    <button
                      type="button"
                      className="btn btn-memory d-flex align-items-center justify-content-center"
                      style={{ width: 78, height: 64, borderRadius: 16 }}
                      onClick={handleTwitter}
                      disabled={isGenerating}
                    >
                      {TwitterIcon}
                    </button>
                    <button
                      type="button"
                      className="btn btn-memory d-flex align-items-center justify-content-center"
                      style={{ width: 78, height: 64, borderRadius: 16 }}
                      onClick={handleInstagram}
                      disabled={isGenerating}
                    >
                      {InstagramIcon}
                    </button>
                  </div>

                  <div className="d-flex align-items-center justify-content-center gap-3">
                    <button
                      type="button"
                      className="btn btn-memory d-flex align-items-center justify-content-center"
                      style={{ width: 72, height: 44, borderRadius: 10 }}
                      onClick={handleDownloadCertificate}
                      disabled={!certificate || isGenerating || instLoading}
                      title={
                        isGenerating
                          ? "Generating..."
                          : instLoading
                          ? "Loading institution..."
                          : "Download certificate"
                      }
                    >
                      {DownloadIcon}
                    </button>

                    <button
                      type="button"
                      className="btn btn-secondary"
                      data-bs-dismiss="modal"
                      style={{ height: 44, borderRadius: 10, paddingInline: 18 }}
                      disabled={isGenerating}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Template oculto para generar PDF */}
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
          qrDataUrl={qrDataUrl}
          institution={institution} // ✅ aquí
        />
      </div>
    </>
  );
}

export default ModalCertificate;
