import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  createPrivateObjectName,
  createSignedDownloadToken,
  deletePrivateUpload,
  openPrivateDownload,
  persistPrivateUpload,
  verifySignedDownloadToken,
} from "../private-upload-storage";

async function streamText(stream: NodeJS.ReadableStream) {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf8");
}

test("private local upload uses a non-guessable object name and remains readable", async () => {
  const priorProvider = process.env.PRIVATE_UPLOAD_STORAGE;
  process.env.PRIVATE_UPLOAD_STORAGE = "local";
  const temporaryDirectory = await fs.promises.mkdtemp(path.join(os.tmpdir(), "arcadia-upload-"));
  const source = path.join(temporaryDirectory, "source.pdf");
  const objectName = createPrivateObjectName("Customer Report.PDF");

  try {
    await fs.promises.writeFile(source, "private-test-content");
    assert.match(objectName, /^\d{4}-\d{2}-\d{2}\/[0-9a-f-]{36}\.pdf$/);
    await persistPrivateUpload(source, objectName, "application/pdf");
    assert.equal(await fs.promises.readFile(source, "utf8"), "private-test-content");
    assert.equal(await streamText(await openPrivateDownload(objectName)), "private-test-content");
    await deletePrivateUpload(objectName);
    await assert.rejects(() => openPrivateDownload(objectName));
  } finally {
    if (priorProvider === undefined) delete process.env.PRIVATE_UPLOAD_STORAGE;
    else process.env.PRIVATE_UPLOAD_STORAGE = priorProvider;
    await fs.promises.rm(temporaryDirectory, { recursive: true, force: true });
    await fs.promises.rmdir(path.resolve("uploads", objectName.split("/")[0])).catch(() => {});
  }
});

test("signed download tokens are scoped and expire", () => {
  const priorSigningKey = process.env.DOWNLOAD_URL_SIGNING_KEY;
  process.env.DOWNLOAD_URL_SIGNING_KEY = "test-only-download-signing-key";
  try {
    const signed = createSignedDownloadToken("document-a", 30);
    assert.equal(verifySignedDownloadToken("document-a", signed.token), true);
    assert.equal(verifySignedDownloadToken("document-b", signed.token), false);
    assert.equal(verifySignedDownloadToken("document-a", `1.${signed.token.split(".")[1]}`), false);
  } finally {
    if (priorSigningKey === undefined) delete process.env.DOWNLOAD_URL_SIGNING_KEY;
    else process.env.DOWNLOAD_URL_SIGNING_KEY = priorSigningKey;
  }
});
