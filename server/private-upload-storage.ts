import crypto from "crypto";
import fs from "fs";
import path from "path";
import { BlobServiceClient, type BlockBlobClient } from "@azure/storage-blob";

export type PrivateUploadProvider = "local" | "azure_blob";

const localRoot = path.resolve(process.cwd(), "uploads");
const azureContainerName = process.env.AZURE_STORAGE_CONTAINER_NAME || "credit-application-files";

function provider(): PrivateUploadProvider {
  const configured = (process.env.PRIVATE_UPLOAD_STORAGE || "local").trim().toLowerCase();
  if (configured === "azure" || configured === "azure_blob" || configured === "blob") return "azure_blob";
  return "local";
}

function safeLocalPath(objectName: string) {
  const resolved = path.resolve(localRoot, objectName);
  if (!resolved.startsWith(`${localRoot}${path.sep}`)) throw new Error("Invalid stored file path");
  return resolved;
}

function blobClient(objectName: string): BlockBlobClient {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!connectionString) throw new Error("AZURE_STORAGE_CONNECTION_STRING is required for Azure private uploads");
  return BlobServiceClient.fromConnectionString(connectionString)
    .getContainerClient(azureContainerName)
    .getBlockBlobClient(objectName);
}

function legacyLocalPath(objectName: string) {
  return safeLocalPath(path.basename(objectName));
}

export function privateUploadStatus() {
  const selected = provider();
  return {
    provider: selected,
    configured: selected === "local" || !!process.env.AZURE_STORAGE_CONNECTION_STRING,
    container: selected === "azure_blob" ? azureContainerName : null,
  };
}

export function createPrivateObjectName(originalName: string) {
  const extension = path.extname(originalName).toLowerCase();
  return `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}${extension}`;
}

export async function persistPrivateUpload(localPath: string, objectName: string, contentType: string) {
  if (provider() === "local") {
    const destination = safeLocalPath(objectName);
    await fs.promises.mkdir(path.dirname(destination), { recursive: true });
    if (path.resolve(localPath) !== destination) await fs.promises.copyFile(localPath, destination);
    return;
  }

  await blobClient(objectName).uploadFile(localPath, {
    blobHTTPHeaders: { blobContentType: contentType },
    metadata: { classification: "private-customer-document" },
  });
}

export async function openPrivateDownload(objectName: string) {
  if (provider() === "local") {
    const localPath = safeLocalPath(objectName);
    await fs.promises.access(localPath, fs.constants.R_OK);
    return fs.createReadStream(localPath);
  }

  try {
    const response = await blobClient(objectName).download();
    if (!response.readableStreamBody) throw new Error("Stored document has no readable body");
    return response.readableStreamBody;
  } catch (error: any) {
    if (error?.statusCode !== 404) throw error;
    const legacyPath = legacyLocalPath(objectName);
    await fs.promises.access(legacyPath, fs.constants.R_OK);
    return fs.createReadStream(legacyPath);
  }
}

export async function deletePrivateUpload(objectName: string) {
  if (provider() === "local") {
    await fs.promises.rm(safeLocalPath(objectName), { force: true });
    return;
  }
  await blobClient(objectName).deleteIfExists({ deleteSnapshots: "include" });
  await fs.promises.rm(legacyLocalPath(objectName), { force: true });
}

function downloadSigningKey() {
  return process.env.DOWNLOAD_URL_SIGNING_KEY || process.env.SESSION_SECRET || "";
}

export function createSignedDownloadToken(documentId: string, ttlSeconds = 300) {
  const key = downloadSigningKey();
  if (!key) throw new Error("A download signing key is not configured");
  const expires = Math.floor(Date.now() / 1000) + Math.min(Math.max(ttlSeconds, 30), 900);
  const payload = `${documentId}.${expires}`;
  const signature = crypto.createHmac("sha256", key).update(payload).digest("base64url");
  return { token: `${expires}.${signature}`, expiresAt: new Date(expires * 1000).toISOString() };
}

export function verifySignedDownloadToken(documentId: string, token: string) {
  const key = downloadSigningKey();
  const [rawExpires, supplied] = token.split(".");
  const expires = Number(rawExpires);
  if (!key || !supplied || !Number.isInteger(expires) || expires < Math.floor(Date.now() / 1000)) return false;
  const expected = crypto.createHmac("sha256", key).update(`${documentId}.${expires}`).digest("base64url");
  const left = Buffer.from(supplied);
  const right = Buffer.from(expected);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}
