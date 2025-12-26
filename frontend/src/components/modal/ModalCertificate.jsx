import React, { useRef, useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import QRCode from "qrcode";

import CertificateTemplate from "../../utils/CertificateTemplate"; // ajusta ruta
import {
  FacebookIcon,
  TwitterIcon,
  InstagramIcon,
  DownloadIcon,
  CopyIcon,
} from "../../utils/icons";

function ModalCertificate({ thesis, certificate }) {
  const txHash = certificate?.explorerTx?.split("/tx/")[1] || "";

  const [qrDataUrl, setQrDataUrl] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  // Contenedor oculto para renderizar el certificado
  const hiddenWrapRef = useRef(null);

  const renderTrimmedHash = (hash, start = 10, end = 8) => {
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

  // Handlers share (vacíos)
  const handleFacebook = () => console.log("Facebook share", certificate);
  const handleTwitter = () => console.log("Twitter share", certificate);
  const handleInstagram = () => console.log("Instagram share", certificate);

  const handleDownloadCertificate = async () => {
    if (!thesis || !certificate) return;

    try {
      setIsGenerating(true);

      // 1) arma URL de verificación (ajústala a tu ruta real)
      const APP_URL = import.meta.env.VITE_APP_URL || window.location.origin;
      const verificationUrl = `${APP_URL}/verify/${thesis._id}`;

      // 2) genera QR en base64
      const qr = await QRCode.toDataURL(verificationUrl, {
        errorCorrectionLevel: "M",
        margin: 1,
        width: 320,
      });
      setQrDataUrl(qr);

      // 3) espera un tick para que el template renderice con el QR
      await new Promise((r) => setTimeout(r, 50));

      const node = hiddenWrapRef.current?.querySelector("#mc-certificate");
      if (!node) throw new Error("Certificate DOM not found");

      // 4) render a canvas
      const canvas = await html2canvas(node, {
        scale: 2,
        backgroundColor: "#FCFCFD",
        useCORS: true,
        allowTaint: false,
      });

      const imgData = canvas.toDataURL("image/png");

      // 5) PDF (landscape A4)
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "pt",
        format: "a4",
      });

      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();

      // Mantener aspect ratio
      const imgW = pageW;
      const imgH = (canvas.height * imgW) / canvas.width;

      const y = (pageH - imgH) / 2; // centrado vertical si sobra
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

  const institutionLogoUrl = ""; // si lo tienes
  const platformLogoUrl = "";    // tu logo si lo tienes

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
          <div className="modal-content bg-dark text-white">
            <div className="modal-body container mb-4">
              <div className="row">
                <div className="button-close-modal-fix">
                  <button
                    type="button"
                    className="btn-close"
                    data-bs-dismiss="modal"
                    aria-label="Close"
                  ></button>
                </div>

                <div className="col-12 d-flex flex-column align-items-center justify-content-center py-1">
                  <h3 id="modalCertificateLabel" className="fw-bold mb-2">
                    Share
                  </h3>

                  <p className="d-flex align-items-center gap-2 flex-wrap mb-4">
                    <strong>SC ID:</strong>

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
                    >
                      {CopyIcon}
                    </button>
                  </p>

                  <div className="d-flex align-items-center justify-content-center gap-3 mb-4">
                    <button
                      type="button"
                      className="btn btn-memory d-flex align-items-center justify-content-center"
                      style={{ width: 78, height: 64, borderRadius: 16 }}
                      aria-label="Share on Facebook"
                      onClick={handleFacebook}
                    >
                      {FacebookIcon}
                    </button>

                    <button
                      type="button"
                      className="btn btn-memory d-flex align-items-center justify-content-center"
                      style={{ width: 78, height: 64, borderRadius: 16 }}
                      aria-label="Share on Twitter"
                      onClick={handleTwitter}
                    >
                      {TwitterIcon}
                    </button>

                    <button
                      type="button"
                      className="btn btn-memory d-flex align-items-center justify-content-center"
                      style={{ width: 78, height: 64, borderRadius: 16 }}
                      aria-label="Share on Instagram"
                      onClick={handleInstagram}
                    >
                      {InstagramIcon}
                    </button>
                  </div>

                  <div className="d-flex align-items-center justify-content-center gap-3">
                    <button
                      type="button"
                      className={`btn btn-memory d-flex align-items-center justify-content-center ${
                        !certificate || isGenerating ? "disabled" : ""
                      }`}
                      style={{ width: 72, height: 44, borderRadius: 10 }}
                      aria-label="Download"
                      onClick={handleDownloadCertificate}
                      disabled={!certificate || isGenerating}
                      title={isGenerating ? "Generating..." : "Download certificate"}
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

      {/* RENDER OCULTO DEL CERTIFICADO (para capturar) */}
      <div
        ref={hiddenWrapRef}
        style={{
          position: "fixed",
          left: "-99999px",
          top: 0,
          width: 1200,
          pointerEvents: "none",
          opacity: 0,
        }}
      >
        <CertificateTemplate
          thesis={thesis}
          certificate={certificate}
          qrDataUrl={qrDataUrl}
          verificationUrl={(import.meta.env.VITE_APP_URL || window.location.origin) + `/verify/${thesis?._id}`}
          institutionLogoUrl={institutionLogoUrl}
          platformLogoUrl={platformLogoUrl}
        />
      </div>
    </>
  );
}

export default ModalCertificate;
