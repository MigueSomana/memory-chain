import { create, type Client } from "@storacha/client";
import crypto from "crypto";
import { File } from "buffer";

let clientPromise: Promise<Client> | null = null;

async function getClient(): Promise<Client> {
  if (!clientPromise) {
    clientPromise = create(); // usa Space activo de `storacha login`
  }
  return clientPromise;
}

export async function uploadBufferToStoracha(
  buffer: Buffer,
  filename: string
): Promise<{ cid: string; fileHash: string }> {
  try {
    const client = await getClient();

    // ✅ FORMA CORRECTA PARA NODE (Blob a File real)
    const file = new File([buffer], filename, {
      type: "application/pdf",
    });

    const cid = await client.uploadFile(file);

    const fileHash = crypto
      .createHash("sha256")
      .update(buffer)
      .digest("hex");

    return {
      cid: cid.toString(),
      fileHash,
    };
  } catch (error) {
    console.error("❌ ERROR SUBIENDO A STORACHA:", error);
    throw new Error("Storacha upload failed");
  }
}
