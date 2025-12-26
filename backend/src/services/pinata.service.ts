import axios from "axios";
import FormData from "form-data";
import crypto from "crypto";

type PinataUploadResult = {
  cid: string;
  fileHash: string;
  ipfsUrl: string;
  gatewayUrl: string;
};

function getPinataConfig() {
  const jwt = process.env.PINATA_JWT;
  if (!jwt) throw new Error("Falta PINATA_JWT en el .env");

  const gatewayDomain =
    process.env.PINATA_GATEWAY_DOMAIN?.trim() || "gateway.pinata.cloud";

  return { jwt, gatewayDomain };
}

export async function uploadPdfBufferToPinata(
  buffer: Buffer,
  filename: string
): Promise<PinataUploadResult> {
  const { jwt, gatewayDomain } = getPinataConfig();

  // ✅ hash local (esto es lo que luego anclas on-chain)
  const fileHash = crypto.createHash("sha256").update(buffer).digest("hex");

  const form = new FormData();

  // ✅ campo EXACTO requerido por Pinata: "file"
  form.append("file", buffer, {
    filename: filename || `thesis-${Date.now()}.pdf`,
    contentType: "application/pdf",
  });

  // (opcional) metadata en Pinata (nombre / tags)
  form.append(
    "pinataMetadata",
    JSON.stringify({
      name: filename || `thesis-${Date.now()}.pdf`,
      keyvalues: {
        app: "MemoryChain",
        type: "thesis-pdf",
        hashAlgorithm: "sha256",
        fileHash,
      },
    })
  );

  // (opcional) opciones de pin
  form.append(
    "pinataOptions",
    JSON.stringify({
      cidVersion: 1, // recomendado a futuro
    })
  );

  const res = await axios.post(
    "https://api.pinata.cloud/pinning/pinFileToIPFS",
    form,
    {
      headers: {
        Authorization: `Bearer ${jwt}`,
        ...form.getHeaders(),
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    }
  );

  const cid = res.data?.IpfsHash as string | undefined;
  if (!cid) {
    throw new Error("Pinata no devolvió IpfsHash (CID).");
  }

  const ipfsUrl = `ipfs://${cid}`;
  const gatewayUrl = `https://${gatewayDomain}/ipfs/${cid}`;

  return { cid, fileHash, ipfsUrl, gatewayUrl };
}
