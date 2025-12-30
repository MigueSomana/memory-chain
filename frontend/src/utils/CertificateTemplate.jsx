import React from "react";
import isologo from "../assets/isologo.png";
import background from "../assets/background.png";
import MC from "../assets/MC.png";
import PO from "../assets/PO.png";
import BC from "../assets/BC.png";

// Estilo monoespaciado para hashes / CIDs / txHash (mejor legibilidad técnica)
const mono = {
  fontFamily:
    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
};

// Formatea la fecha de emisión en formato legible (fallback a "—")
const formatIssued = (iso) => {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "2-digit",
    });
  } catch {
    return String(iso);
  }
};

// Marca de agua suave estilo “blockchain”
const Watermark = () => (
  <svg
    width="1400"
    height="900"
    viewBox="0 0 1400 900"
    style={{
      position: "absolute",
      inset: 0,
      opacity: 0.08,
      pointerEvents: "none",
    }}
  >
    <path
      d="M860 180 L1080 300 L1220 220"
      stroke="#94A3B8"
      strokeWidth="10"
      opacity="0.22"
      fill="none"
    />
    <path
      d="M1080 300 L1160 520 L1010 650"
      stroke="#94A3B8"
      strokeWidth="10"
      opacity="0.18"
      fill="none"
    />
    {[
      { x: 860, y: 100, s: 160 },
      { x: 1080, y: 250, s: 170 },
      { x: 1210, y: 140, s: 160 },
      { x: 1150, y: 520, s: 170 },
      { x: 820, y: 540, s: 170 },
    ].map((c, idx) => (
      <g key={idx} transform={`translate(${c.x} ${c.y})`}>
        <path
          d={`M18 46 L${c.s - 26} 18 L${c.s - 8} 60 L34 88 Z`}
          fill="none"
          stroke="#0B7E7A"
          strokeWidth="12"
          strokeLinejoin="round"
          opacity="0.9"
        />
        <path
          d={`M34 88 L${c.s - 8} 60 L${c.s - 8} ${c.s - 44} L34 ${c.s - 16} Z`}
          fill="none"
          stroke="#0B7E7A"
          strokeWidth="12"
          strokeLinejoin="round"
          opacity="0.9"
        />
        <path
          d={`M18 46 L34 88 L34 ${c.s - 16} L18 ${c.s - 58} Z`}
          fill="none"
          stroke="#0B7E7A"
          strokeWidth="12"
          strokeLinejoin="round"
          opacity="0.9"
        />
      </g>
    ))}
  </svg>
);

// Convierte arrays de autores/tutores (strings u objetos {name, lastname}) a una sola cadena
const joinPeople = (arr) => {
  if (!Array.isArray(arr)) return "";
  return arr
    .map((p) => {
      if (typeof p === "string") return p;
      return `${p?.name ?? ""} ${p?.lastname ?? ""}`.trim();
    })
    .filter(Boolean)
    .join(", ");
};

// Certificate Template
export default function CertificateTemplate({
  thesis, // datos de la tesis (title, authors, tutors, hashes, etc.)
  certificate, // datos del certificado (ej: explorerTx, metadata extra)
  qrDataUrl, // QR generado en base64/dataURL para verificación
  institution, // institución (por si thesis.institution no viene populate)
}) {
  // Preferimos thesis.institution.name si viene populate; si no, usamos institution prop; si no, texto default
  const instName =
    thesis?.institution?.name || institution?.name || "Institution";

  // Campos auxiliares de institución (opcional)
  const instDept = institution?.department || "";
  const instAddress = institution?.country || "";

  // Logo de institución (si existe)
  const instLogo = institution?.logoUrl || "";

  // Thesis info (contenido principal)
  const title = thesis?.title || "—";
  const degree = thesis?.degree || "";
  const authorsText = joinPeople(thesis?.authors);
  const tutorsText = joinPeople(thesis?.tutors);
  const issued = formatIssued(thesis?.createdAt);

  // Verification metadata (data técnica)
  const fileHash = thesis?.fileHash || "—";
  const ipfsCid = thesis?.ipfsCid || "—";

  // Extrae el txHash desde la URL del explorer, si viene.
  const txHash =
    (certificate?.explorerTx ? certificate.explorerTx.split("/tx/")[1] : "") ||
    "—";

  // Render del certificado
  return (
    <div
      id="mc-certificate"
      style={{
        // 3508x2480 px aprox A4 landscape a ~300dpi (ideal para export)
        width: 3508,
        minHeight: 2480,

        // Contenedor "lienzo" para capas y layout
        position: "relative",
        overflow: "hidden",
        padding: "140px 165px",
        boxSizing: "border-box",

        // Tema base (blanco + texto oscuro)
        background: "#ffffff",
        color: "#0f172a",
        fontFamily:
          "Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
      }}
    >
      {/* Capa 0: fondo con gradientes suaves (no interactivo) */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 20% 0%, rgba(11,126,122,.07), transparent 45%), radial-gradient(circle at 90% 40%, rgba(55,242,197,.08), transparent 45%), linear-gradient(#ffffff, #ffffff)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* Capa 1: imagen background alineada a la derecha con opacidad */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          zIndex: 1,
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "stretch",
        }}
      >
        <img
          src={background}
          alt=""
          style={{
            height: "100%",
            width: "100%",
            objectFit: "contain",
            objectPosition: "right center",
            opacity: 0.25,
            filter: "grayscale(100%)",
          }}
          crossOrigin="anonymous"
        />
      </div>

      {/* Capa 2: watermark (seguridad visual) */}
      <div style={{ position: "absolute", inset: 0, zIndex: 2 }}>
        <Watermark />
      </div>

      {/* Capa 3: doble borde ornamental (firma visual del certificado) */}
      <div
        style={{
          position: "absolute",
          inset: 18,
          border: "6px solid rgba(11,126,122,.35)",
          pointerEvents: "none",
          zIndex: 3,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 52,
          border: "12px solid rgba(11,126,122,.85)",
          pointerEvents: "none",
          zIndex: 3,
        }}
      />

      {/* Capa 4: contenido principal */}
      <div style={{ position: "relative", zIndex: 4 }}>
        <div style={{ width: "100%", maxWidth: 3150, marginInline: "auto" }}>
          {/* Header: institución a la izquierda + marca MemoryChain a la derecha */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto 1fr",
              alignItems: "center",
              gap: 54,
            }}
          >
            {/* Bloque institución */}
            <div style={{ display: "flex", alignItems: "center", gap: 36 }}>
              {instLogo ? (
                <img
                  src={instLogo}
                  alt="Institution"
                  style={{
                    width: 180,
                    height: 180,
                    objectFit: "contain",
                    borderRadius: 36,
                    background: "rgba(255,255,255,.75)",
                    border: "3px solid rgba(15,23,42,.10)",
                    padding: 18,
                  }}
                  crossOrigin="anonymous"
                />
              ) : (
                // Placeholder elegante si no hay logo
                <div
                  style={{
                    width: 180,
                    height: 180,
                    borderRadius: 36,
                    background: "rgba(255,255,255,.75)",
                    border: "3px solid rgba(15,23,42,.10)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 900,
                    fontSize: 44,
                    color: "#0B7E7A",
                  }}
                >
                  UNI
                </div>
              )}

              {/* Info de institución */}
              <div style={{ maxWidth: 1200 }}>
                <div style={{ fontWeight: 900, fontSize: 54, lineHeight: 1.1 }}>
                  {instName}
                </div>
                <div style={{ fontSize: 32, marginTop: 8 }}>{instDept}</div>
                <div style={{ color: "#64748b", fontSize: 32, marginTop: 8 }}>
                  {instAddress}
                </div>
              </div>
            </div>

            {/* Columna centro (vacía para balance visual) */}
            <div />

            {/* Bloque MemoryChain */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 36,
                justifyContent: "flex-end",
              }}
            >
              <div style={{ textAlign: "right" }}>
                <div style={{ fontWeight: 900, fontSize: 54 }}>MemoryChain</div>
                <div style={{ color: "#64748b", fontSize: 32 }}>
                  Immutable Academic Registry
                </div>
              </div>

              <img
                src={isologo}
                alt="MemoryChain"
                style={{
                  width: 180,
                  height: 180,
                  objectFit: "contain",
                  borderRadius: 36,
                  background: "rgba(255,255,255,.75)",
                  border: "3px solid rgba(15,23,42,.10)",
                  padding: 18,
                }}
              />
            </div>
          </div>

          {/* Título + descripción del certificado */}
          <div style={{ textAlign: "center", marginTop: 70 }}>
            <div
              style={{
                fontFamily: "Poppins, Inter, sans-serif",
                fontWeight: 900,
                fontSize: 110,
                letterSpacing: 1.2,
                textTransform: "uppercase",
              }}
            >
              Certificate of Thesis Verification
            </div>

            {/* Barra de color con degradado (branding) */}
            <div
              style={{
                width: 2100,
                height: 14,
                borderRadius: 999,
                background:
                  "linear-gradient(90deg, rgba(11,126,122,1), rgba(55,242,197,.85))",
                margin: "18px auto 0",
              }}
            />

            {/* Texto de propósito (explica blockchain + integridad) */}
            <div
              style={{
                marginTop: 28,
                color: "#64748b",
                fontSize: 42,
                maxWidth: 2900,
                marginInline: "auto",
                lineHeight: 1.45,
              }}
            >
              This certificate confirms that the thesis record below has been
              registered and cryptographically anchored on a public blockchain
              to ensure integrity and verifiability.
            </div>
          </div>

          {/* Body: izquierda info de tesis + derecha panel QR */}
          <div
            style={{
              marginTop: 70,
              display: "grid",
              gridTemplateColumns: "1fr 880px",
              gap: 78,
              alignItems: "start",
            }}
          >
            {/* Panel izquierdo: datos de la tesis + metadata */}
            <div
              style={{
                background: "rgba(255,255,255,.76)",
                border: "3px solid rgba(15,23,42,.10)",
                borderRadius: 54,
                padding: "66px 78px",
                boxShadow: "0 18px 60px rgba(15,23,42,.06)",
                backdropFilter: "blur(2px)",
              }}
            >
              {/* Título de la tesis */}
              <div
                style={{
                  fontFamily: "Poppins, Inter, sans-serif",
                  fontWeight: 900,
                  fontSize: 86,
                  lineHeight: 1.12,
                  textAlign: "center",
                  wordBreak: "break-word",
                }}
              >
                {title}
              </div>

              {/* Autores y tutores */}
              <div
                style={{
                  marginTop: 22,
                  textAlign: "center",
                  fontSize: 54,
                  lineHeight: 1.55,
                }}
              >
                <div>
                  <strong>Author(s):</strong> {authorsText || "—"}
                </div>
                <div style={{ marginTop: 10 }}>
                  <strong>Tutor(s):</strong> {tutorsText || "—"}
                </div>
              </div>

              {/* Contexto académico (degree + institución) */}
              <div style={{ marginTop: 18, textAlign: "center", fontSize: 54 }}>
                {degree ? (
                  <>
                    Awarded for the <strong>{degree}</strong> degree at{" "}
                    <em>{instName}</em>.
                  </>
                ) : (
                  <>
                    Certified by <em>{instName}</em>.
                  </>
                )}
              </div>

              {/* Sección de metadata verificable */}
              <div style={{ marginTop: 60 }}>
                <div
                  style={{
                    background:
                      "linear-gradient(90deg, rgba(11,126,122,1), rgba(11,126,122,.82))",
                    color: "#fff",
                    borderRadius: 36,
                    padding: "26px 32px",
                    textAlign: "center",
                    fontWeight: 900,
                    letterSpacing: 2.2,
                    textTransform: "uppercase",
                    fontSize: 38,
                  }}
                >
                  Verification Metadata
                </div>

                {/* Lista de claves técnicas: FileHash, CID, Tx */}
                <div
                  style={{
                    marginTop: 32,
                    background: "rgba(255,255,255,.86)",
                    border: "3px solid rgba(15,23,42,.10)",
                    borderRadius: 42,
                    padding: "36px 36px",
                    fontSize: 40,
                  }}
                >
                  {[
                    { label: "File Hash", value: fileHash },
                    { label: "IPFS CID", value: ipfsCid },
                    { label: "Smart Contract", value: txHash },
                  ].map((row, idx) => (
                    <div key={idx} style={{ padding: "16px 12px" }}>
                      <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
                        <div
                          style={{
                            width: 360,
                            color: "#64748b",
                            fontWeight: 800,
                          }}
                        >
                          {row.label}
                        </div>

                        {/* Valores largos en mono + break-all */}
                        <div
                          style={{
                            ...mono,
                            wordBreak: "break-all",
                            color: "#0B7E7A",
                            flex: 1,
                            fontSize: 38,
                          }}
                        >
                          {row.value || "—"}
                        </div>
                      </div>

                      {/* Separador interno (no al final) */}
                      {idx < 2 && (
                        <div
                          style={{
                            marginTop: 26,
                            height: 3,
                            background: "rgba(15,23,42,.08)",
                          }}
                        />
                      )}
                    </div>
                  ))}
                </div>

                {/* Nota legal/responsabilidad */}
                <div
                  style={{
                    marginTop: 40,
                    textAlign: "center",
                    fontSize: 34,
                    color: "#64748b",
                    lineHeight: 1.45,
                  }}
                >
                  This certificate attests the record&apos;s integrity at the
                  time of issuance. Rights remain with the authors and
                  institution.
                </div>
              </div>
            </div>

            {/* Panel derecho: QR + fecha + badges */}
            <div
              style={{
                background: "rgba(255,255,255,.78)",
                border: "3px solid rgba(15,23,42,.10)",
                borderRadius: 54,
                padding: 48,
                textAlign: "center",
                boxShadow: "0 18px 60px rgba(15,23,42,.06)",
                backdropFilter: "blur(2px)",
              }}
            >
              <div style={{ fontWeight: 900, fontSize: 46 }}>
                Verify Authenticity
              </div>
              <div
                style={{
                  marginTop: 18,
                  fontSize: 36,
                  color: "#64748b",
                  lineHeight: 1.4,
                }}
              >
                Scan the QR code to validate this certificate and view the
                record.
              </div>

              {/* Contenedor del QR (borde + padding) */}
              <div
                style={{
                  marginTop: 36,
                  borderRadius: 42,
                  border: "3px solid rgba(15,23,42,.10)",
                  background: "#fff",
                  padding: 36,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: 720,
                }}
              >
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="QR"
                    style={{ width: 640, height: 640, objectFit: "contain" }}
                  />
                ) : (
                  <div style={{ color: "#64748b", fontSize: 40 }}>QR…</div>
                )}
              </div>

              {/* Fecha de emisión */}
              <div style={{ marginTop: 34, textAlign: "center" }}>
                <div style={{ marginTop: 10, fontSize: 36, color: "#64748b" }}>
                  <strong style={{ color: "#0f172a" }}>Issued:</strong> {issued}
                </div>
              </div>

              {/* Badges (Polygon / Blockchain / MemoryChain) para confianza visual */}
              <div
                style={{
                  marginTop: 44,
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 28,
                }}
              >
                <img
                  src={PO}
                  alt="Polygon Badge"
                  style={{
                    height: 220,
                    width: "auto",
                    objectFit: "contain",
                    display: "block",
                  }}
                />
                <img
                  src={BC}
                  alt="Blockchain Badge"
                  style={{
                    height: 220,
                    width: "auto",
                    objectFit: "contain",
                    display: "block",
                  }}
                />
                <img
                  src={MC}
                  alt="MemoryChain Badge"
                  style={{
                    height: 220,
                    width: "auto",
                    objectFit: "contain",
                    display: "block",
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
