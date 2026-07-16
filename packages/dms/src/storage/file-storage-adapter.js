import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { writeBinaryFileDurably } from "../../../persistence/src/durable-file.js";
import { createStorageReceipt, sha256Hex } from "./storage-adapter.js";

function requireString(value, field) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function objectKey(object_id) {
  return createHash("sha256").update(requireString(object_id, "object_id")).digest("hex");
}

function filesFor(rootPath, object_id) {
  const key = objectKey(object_id);
  return {
    bytesPath: path.join(rootPath, `${key}.bin`),
    metadataPath: path.join(rootPath, `${key}.json`),
  };
}

export function createFileStorageAdapter({ adapter_id = "file-vault", rootPath } = {}) {
  const resolvedRootPath = requireString(rootPath, "rootPath");
  function readObject(safeObjectId) {
    const paths = filesFor(resolvedRootPath, safeObjectId);
    if (!existsSync(paths.bytesPath)) throw new Error(`object not found: ${safeObjectId}`);
    const bytes = readFileSync(paths.bytesPath);
    const sha256 = sha256Hex(bytes);
    const metadata = existsSync(paths.metadataPath)
      ? JSON.parse(readFileSync(paths.metadataPath, "utf8"))
      : { receipt: createStorageReceipt({ adapter_id, object_id: safeObjectId, bytes }) };
    if (metadata.receipt?.sha256 && metadata.receipt.sha256 !== sha256) {
      throw new Error(`object hash mismatch: ${safeObjectId}`);
    }
    return Object.freeze({
      object_id: safeObjectId,
      bytes: Buffer.from(bytes),
      sha256,
      byte_size: bytes.byteLength,
      mime_type: metadata.receipt?.mime_type ?? "application/octet-stream",
    });
  }
  return Object.freeze({
    adapter_id,
    putObject({ object_id, bytes, content_type } = {}) {
      const safeObjectId = requireString(object_id, "object_id");
      const buffer = Buffer.isBuffer(bytes) ? Buffer.from(bytes) : Buffer.from(String(bytes ?? ""));
      const receipt = createStorageReceipt({ adapter_id, object_id: safeObjectId, bytes: buffer, content_type });
      const paths = filesFor(resolvedRootPath, safeObjectId);
      writeBinaryFileDurably({
        filePath: paths.bytesPath,
        bytes: buffer,
        expectedSha256: receipt.sha256,
        sidecar: { filePath: paths.metadataPath, value: { object_id: safeObjectId, receipt } },
        compensationHook({ error, compensated }) {
          if (!compensated) error.safe_error_code = "DMS_BINARY_COMPENSATION_FAILED";
        },
      });
      return receipt;
    },
    getObject({ object_id } = {}) {
      const safeObjectId = requireString(object_id, "object_id");
      return readObject(safeObjectId);
    },
    statObject({ object_id } = {}) {
      const safeObjectId = requireString(object_id, "object_id");
      const paths = filesFor(resolvedRootPath, safeObjectId);
      if (!existsSync(paths.bytesPath)) return null;
      const object = readObject(safeObjectId);
      return Object.freeze({
        ...createStorageReceipt({
          adapter_id,
          object_id: safeObjectId,
          bytes: object.bytes,
          content_type: object.mime_type,
        }),
        sha256: object.sha256,
      });
    },
  });
}
