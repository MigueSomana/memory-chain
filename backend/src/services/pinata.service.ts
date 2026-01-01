import axios from "axios";
import FormData from "form-data";
import crypto from "crypto";

// Resultado estandarizado del upload a Pinata
type PinataUploadResult = {
  cid: string; // CID devuelto por IPFS/Pinata
  fileHash: string; // hash sha256 del archivo (para anclar en blockchain)
  ipfsUrl: string; // formato ipfs://...
  gatewayUrl: string; // URL HTTP del gateway de Pinata
};

// Lee configuración de Pinata desde variables de entorno
function getPinataConfig() {
  const jwt = process.env.PINATA_JWT;
  if (!jwt) throw new Error("Falta PINATA_JWT en el .env");

  // Gateway configurable (si no, usa el default de Pinata)
  const gatewayDomain =
    process.env.PINATA_GATEWAY_DOMAIN?.trim() || "gateway.pinata.cloud";

  return { jwt, gatewayDomain };
}

// Sube un PDF (Buffer) a Pinata/IPFS y devuelve CID + hash del archivo
export async function uploadPdfBufferToPinata(
  buffer: Buffer,
  filename: string
): Promise<PinataUploadResult> {
  const { jwt, gatewayDomain } = getPinataConfig();

  // ✅ Hash local del archivo (esto es lo que luego registras on-chain)
  const fileHash = crypto.createHash("sha256").update(buffer).digest("hex");

  const form = new FormData();

  // ✅ Campo requerido por Pinata para archivos: "file"
  form.append("file", buffer, {
    filename: filename || `thesis-${Date.now()}.pdf`, // nombre fallback
    contentType: "application/pdf",
  });

  // (opcional) Metadata para organizar en Pinata (nombre/tags)
  form.append(
    "pinataMetadata",
    JSON.stringify({
      name: filename || `thesis-${Date.now()}.pdf`,
      keyvalues: {
        app: "MemoryChain",
        type: "thesis-pdf",
        hashAlgorithm: "sha256",
        fileHash, // guarda el hash como referencia
      },
    })
  );

  // (opcional) Opciones de pinning
  form.append(
    "pinataOptions",
    JSON.stringify({
      cidVersion: 1, // recomendado para compatibilidad futura
    })
  );

  // Request a Pinata para fijar (pin) el archivo en IPFS
  const res = await axios.post(
    "https://api.pinata.cloud/pinning/pinFileToIPFS",
    form,
    {
      headers: {
        Authorization: `Bearer ${jwt}`, // auth por JWT de Pinata
        ...form.getHeaders(), // headers de FormData (boundary, etc.)
      },
      maxBodyLength: Infinity, // permite archivos grandes
      maxContentLength: Infinity,
    }
  );

  // Pinata devuelve el CID en res.data.IpfsHash
  const cid = res.data?.IpfsHash as string | undefined;
  if (!cid) {
    throw new Error("Pinata no devolvió IpfsHash (CID).");
  }

  // URLs útiles para guardar/mostrar
  const ipfsUrl = `ipfs://${cid}`;
  const gatewayUrl = `https://${gatewayDomain}/ipfs/${cid}`;

  return { cid, fileHash, ipfsUrl, gatewayUrl };
}
