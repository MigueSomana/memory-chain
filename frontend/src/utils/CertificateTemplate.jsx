import React from "react";

const mono = {
  fontFamily:
    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
};

const trimMiddle = (s, start = 12, end = 10) => {
  if (!s) return "";
  if (s.length <= start + end) return s;
  return `${s.slice(0, start)}…${s.slice(-end)}`;
};

const formatIssued = (iso) => {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "2-digit",
    });
  } catch {
    return iso;
  }
};

export default function CertificateTemplate({
  thesis,
  certificate,
  qrDataUrl,
  verificationUrl,
  institutionLogoUrl, // opcional (si lo tienes)
  platformLogoUrl, // opcional (tu logo)
}) {
  const instName = thesis?.institution?.name || "Institution";
  const degree = thesis?.degree || "";
  const department = thesis?.department || "";
  const field = thesis?.field || "";
  const title = thesis?.title || "Thesis Title";

  const authors = Array.isArray(thesis?.authors) ? thesis.authors : [];
  const authorsText = authors
    .map((a) => `${a?.name ?? ""} ${a?.lastname ?? ""}`.trim())
    .filter(Boolean)
    .join(", ");

  // Datos técnicos
  const fileHash = thesis?.fileHash || certificate?.onchain?.fileHash || "";
  const ipfsCid = thesis?.ipfsCid || certificate?.onchain?.ipfsCid || "";
  const chainId =
    thesis?.chainId ||
    certificate?.mongo?.chainId ||
    certificate?.onchain?.chainId ||
    "";
  const blockNumber =
    thesis?.blockNumber ||
    certificate?.mongo?.blockNumber ||
    certificate?.onchain?.blockNumber ||
    "";
  const hashAlg = thesis?.hashAlgorithm || "sha256";

  // Network label simple
  const networkLabel =
    chainId === 80002
      ? "Polygon Amoy (Testnet)"
      : chainId === 137
      ? "Polygon Mainnet"
      : chainId
      ? `Chain ${chainId}`
      : "—";

  // Smart contract: idealmente viene del backend (si no, lo dejas vacío)
  const smartContract =
    certificate?.onchain?.contractAddress ||
    certificate?.mongo?.contractAddress ||
    "";

  // URL tx
  const explorerTx = certificate?.explorerTx || "";
  const txHash =
    explorerTx?.split("/tx/")[1] ||
    thesis?.txHash ||
    certificate?.mongo?.txHash ||
    "";

  const issuedIso = thesis?.updatedAt || thesis?.createdAt || "";
  const issued = formatIssued(issuedIso);

  // Redacción fluida (como pediste)
  const subtitle = [
    authorsText ? `Authors: ${authorsText}` : "",
    degree || instName
      ? `For the ${degree}${degree && instName ? ", " : ""}${instName}`
      : "",
    department || field
      ? `${department}${department && field ? " • " : ""}${field}`
      : "",
  ]
    .filter(Boolean)
    .join(" — ");

  return (
    <div
      id="mc-certificate"
      style={{
        width: 1123, // A4 landscape approx at 96dpi (puedes cambiar)
        minHeight: 794,
        background: "#FCFCFD",
        color: "#0f172a",
        borderRadius: 18,
        border: "2px solid rgba(25,179,153,.25)",
        position: "relative",
        overflow: "hidden",
        padding: 36,
        boxSizing: "border-box",
        fontFamily:
          "Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
      }}
    >
      {/* Barra izquierda */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 14,
          background: "linear-gradient(180deg, #19B399, rgba(25,179,153,.55))",
        }}
      />

      {/* Header logos */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            maxWidth: 360,
          }}
        >
          {institutionLogoUrl ? (
            <img
              src={institutionLogoUrl}
              alt="Institution logo"
              style={{ width: 56, height: 56, objectFit: "contain" }}
              crossOrigin="anonymous"
            />
          ) : (
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 12,
                background: "rgba(15,23,42,.06)",
                border: "1px solid rgba(15,23,42,.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#64748b",
                fontWeight: 800,
              }}
            >
              UNI
            </div>
          )}
          <div>
            <div style={{ fontWeight: 900, letterSpacing: 0.2, fontSize: 16 }}>
              {instName}
            </div>
            <div style={{ color: "#64748b", fontSize: 12 }}>
              {department || field
                ? `${department}${department && field ? " • " : ""}${field}`
                : "Research & Innovation"}
            </div>
          </div>
        </div>

        {/* Sello */}
        <div
          style={{
            width: 92,
            height: 92,
            borderRadius: 999,
            border: "2px dashed rgba(25,179,153,.85)",
            background: "rgba(25,179,153,.06)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            color: "#19B399",
          }}
        >
          <div style={{ fontWeight: 900, fontSize: 12, letterSpacing: 1 }}>
            BLOCKCHAIN
          </div>
          <div style={{ fontWeight: 900, fontSize: 12, letterSpacing: 1 }}>
            VERIFIED
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            maxWidth: 360,
            justifyContent: "flex-end",
          }}
        >
          <div style={{ textAlign: "right" }}>
            <div style={{ fontWeight: 900, letterSpacing: 0.2, fontSize: 16 }}>
              MemoryChain
            </div>
            <div style={{ color: "#64748b", fontSize: 12 }}>
              Immutable Academic Registry
            </div>
          </div>
          {platformLogoUrl ? (
            <img
              src={platformLogoUrl}
              alt="Platform logo"
              style={{ width: 56, height: 56, objectFit: "contain" }}
              crossOrigin="anonymous"
            />
          ) : (
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 12,
                background: "rgba(25,179,153,.10)",
                border: "1px solid rgba(25,179,153,.25)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#0f172a",
                fontWeight: 900,
              }}
            >
              MC
            </div>
          )}
        </div>
      </div>

      {/* Title */}
      <div style={{ textAlign: "center", marginTop: 18 }}>
        <div
          style={{
            fontFamily: "Poppins, Inter, sans-serif",
            fontWeight: 900,
            fontSize: 30,
            letterSpacing: 0.3,
          }}
        >
          CERTIFICATE OF THESIS VERIFICATION
        </div>
        <div style={{ marginTop: 6, color: "#64748b", fontSize: 13 }}>
          This document certifies that the following thesis metadata was
          registered and verified on a public blockchain.
        </div>
      </div>

      {/* Main content */}
      <div style={{ display: "flex", gap: 16, marginTop: 18 }}>
        {/* Left - Thesis */}
        <div style={{ flex: 1 }}>
          <div
            style={{
              background: "#fff",
              borderRadius: 14,
              border: "1px solid rgba(15,23,42,.10)",
              padding: "16px 18px",
            }}
          >
            <div
              style={{
                color: "#19B399",
                fontWeight: 900,
                letterSpacing: 1,
                fontSize: 11,
                textTransform: "uppercase",
              }}
            >
              Thesis
            </div>

            {/* Título grande y con espacio para largo */}
            <div
              style={{
                marginTop: 10,
                fontFamily: "Poppins, Inter, sans-serif",
                fontWeight: 900,
                fontSize: 26,
                lineHeight: 1.15,
                wordBreak: "break-word",
              }}
            >
              {title}
            </div>

            {/* Texto fluido */}
            <div
              style={{
                marginTop: 10,
                fontSize: 13,
                color: "#0f172a",
                lineHeight: 1.5,
              }}
            >
              {subtitle || "—"}
            </div>

            {/* Issued */}
            <div style={{ marginTop: 12, fontSize: 12, color: "#64748b" }}>
              <strong style={{ color: "#0f172a" }}>Issued:</strong>{" "}
              {issued || "—"}
            </div>
          </div>

          {/* Bloque técnico: una sola línea con hash/cid/network/contract */}
          <div
            style={{
              marginTop: 12,
              background: "rgba(25,179,153,.06)",
              border: "1px solid rgba(25,179,153,.25)",
              borderRadius: 14,
              padding: "14px 16px",
            }}
          >
            <div
              style={{
                color: "#19B399",
                fontWeight: 900,
                letterSpacing: 1,
                fontSize: 11,
                textTransform: "uppercase",
              }}
            >
              On-chain verification
            </div>

            {/* misma linea como pediste */}
            <div
              style={{
                marginTop: 10,
                fontSize: 12,
                display: "flex",
                flexWrap: "wrap",
                gap: 10,
                alignItems: "center",
              }}
            >
              <span style={{ color: "#64748b" }}>Hash ({hashAlg}):</span>
              <strong style={mono} title={fileHash}>
                {trimMiddle(fileHash, 14, 10)}
              </strong>

              <span style={{ color: "#64748b", marginLeft: 10 }}>CID:</span>
              <strong style={mono} title={ipfsCid}>
                {trimMiddle(ipfsCid, 16, 10)}
              </strong>

              <span style={{ color: "#64748b", marginLeft: 10 }}>Network:</span>
              <strong>{networkLabel}</strong>

              <span style={{ color: "#64748b", marginLeft: 10 }}>
                Smart contract:
              </span>
              <strong style={mono} title={smartContract || ""}>
                {smartContract ? trimMiddle(smartContract, 10, 8) : "—"}
              </strong>
            </div>

            {/* línea secundaria opcional: tx + block */}
            <div
              style={{
                marginTop: 8,
                fontSize: 12,
                display: "flex",
                flexWrap: "wrap",
                gap: 10,
                alignItems: "center",
              }}
            >
              <span style={{ color: "#64748b" }}>Tx:</span>
              <strong style={mono} title={txHash}>
                {txHash ? trimMiddle(txHash, 12, 10) : "—"}
              </strong>

              <span style={{ color: "#64748b", marginLeft: 10 }}>Block:</span>
              <strong>{blockNumber || "—"}</strong>

              {explorerTx ? (
                <span style={{ marginLeft: 10, color: "#19B399" }}>
                  {explorerTx}
                </span>
              ) : null}
            </div>
          </div>

          {/* Nota legal pequeña */}
          <div
            style={{
              marginTop: 10,
              fontSize: 11,
              color: "#64748b",
              textAlign: "center",
            }}
          >
            This certificate attests to the existence and integrity of the
            referenced thesis at the time of registration. Rights remain with
            the authors and institution.
          </div>
        </div>

        {/* Right - QR */}
        <div style={{ width: 260 }}>
          <div
            style={{
              background: "#fff",
              borderRadius: 14,
              border: "1px solid rgba(15,23,42,.10)",
              padding: 14,
            }}
          >
            <div style={{ fontWeight: 900, fontSize: 13 }}>
              Verify authenticity
            </div>
            <div
              style={{
                marginTop: 6,
                color: "#64748b",
                fontSize: 12,
                lineHeight: 1.4,
              }}
            >
              Scan the QR code to validate this certificate and view the
              immutable on-chain record.
            </div>

            <div
              style={{
                marginTop: 12,
                borderRadius: 12,
                border: "1px solid rgba(15,23,42,.10)",
                padding: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="QR"
                  style={{ width: 180, height: 180, objectFit: "contain" }}
                  crossOrigin="anonymous"
                />
              ) : (
                <div
                  style={{
                    width: 180,
                    height: 180,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#64748b",
                  }}
                >
                  QR…
                </div>
              )}
            </div>

            <div
              style={{
                marginTop: 10,
                fontSize: 11,
                color: "#0f172a",
                ...mono,
                wordBreak: "break-all",
                padding: "8px 10px",
                borderRadius: 10,
                border: "1px solid rgba(15,23,42,.08)",
                background: "#fff",
              }}
            >
              {verificationUrl || "—"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
