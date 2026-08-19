import path from "node:path";
import { ROLLBACK_DOWNLOAD_TIMEOUT_MS, canonicalJson, isCanonicalCodeSha256Base64, sha256 } from "./outlook-production-aws-inventory-contract.mjs";
import {
  captureExistingOrNewFile,
  ensurePrivateRollbackDirectory,
  isInside,
  readVerifiedPrivateFile,
  readVerifiedPrivateZip,
  rollbackFailureCode,
  syncDirectory,
  unlinkIfIdentity,
  verifyPrivateCopy,
  verifyHeldZip,
  withTimeout,
} from "./outlook-production-aws-inventory-secure-store-primitives.mjs";

export async function captureAuditorRollbackCode({ functionName, location, codeSha256Base64, rollbackDir, repoRoot, download }) {
  if (!rollbackDir) return { status: "BLOCKED_ROLLBACK_CAPTURE_FAILED", error_code: "ROLLBACK_DIRECTORY_REQUIRED", path: null, manifest_path: null, bytes: null, zip_sha256: null, code_sha256_base64: null, matches_code_sha256: false };
  let zipPath = null;
  let manifestPath = null;
  let zipIdentity = null;
  let manifestIdentity = null;
  let zipCreated = false;
  let manifestCreated = false;
  try {
    if (functionName !== "lawos-production-projection-auditor") throw new Error("ROLLBACK_FUNCTION_NOT_ALLOWLISTED");
    const directory = await ensurePrivateRollbackDirectory(rollbackDir, repoRoot);
    if (typeof location !== "string" || location.length === 0 || !isCanonicalCodeSha256Base64(codeSha256Base64) || typeof download !== "function") throw new Error("ROLLBACK_CODE_METADATA_MISSING");
    const controller = new AbortController();
    const bytes = await withTimeout(download(location, { signal: controller.signal }), ROLLBACK_DOWNLOAD_TIMEOUT_MS, "ROLLBACK_DOWNLOAD_TIMEOUT", () => controller.abort());
    if (!Buffer.isBuffer(bytes)) throw new Error("ROLLBACK_DOWNLOAD_NOT_BYTES");
    const digest = sha256(bytes);
    const expectedDigest = Buffer.from(codeSha256Base64, "base64").toString("hex");
    if (digest !== expectedDigest) throw new Error("ROLLBACK_CODE_SHA_MISMATCH");
    await verifyPrivateCopy(directory, bytes);
    zipPath = path.join(directory, `${functionName}-${digest}.zip`);
    manifestPath = path.join(directory, `${functionName}-${digest}.manifest.json`);
    const zipResult = await captureExistingOrNewFile(zipPath, bytes, digest, { zip: true });
    zipIdentity = zipResult.info;
    zipCreated = zipResult.created;
    const manifest = {
      schema_version: "amic-os.outlook.lambda-rollback-code.v2",
      function_name: functionName,
      zip_basename: path.basename(zipPath),
      zip_path: zipPath,
      code_sha256_base64: codeSha256Base64,
      zip_sha256: digest,
      bytes: bytes.byteLength,
      matches_code_sha256: true,
      source_url_stripped: true,
    };
    const manifestBytes = Buffer.from(`${canonicalJson(manifest)}\n`, "utf8");
    const manifestResult = await captureExistingOrNewFile(manifestPath, manifestBytes, sha256(manifestBytes));
    manifestIdentity = manifestResult.info;
    manifestCreated = manifestResult.created;
    const storedManifest = JSON.parse((await readVerifiedPrivateFile(manifestPath, manifestBytes.byteLength, sha256(manifestBytes))).toString("utf8"));
    if (canonicalJson(storedManifest) !== canonicalJson(manifest)) throw new Error("ROLLBACK_MANIFEST_MISMATCH");
    const finalBytes = await readVerifiedPrivateZip(zipPath, { expectedBytes: bytes.byteLength, expectedDigest: digest });
    if (!finalBytes.equals(bytes)) throw new Error("ROLLBACK_FILE_DIGEST_MISMATCH");
    await syncDirectory(directory);
    const result = { status: "CAPTURED", error_code: null, path: zipPath, manifest_path: manifestPath, bytes: bytes.byteLength, zip_sha256: digest, code_sha256_base64: codeSha256Base64, matches_code_sha256: true };
    Object.defineProperty(result, "buffer", { value: finalBytes, enumerable: false });
    return result;
  } catch (error) {
    if (manifestCreated && manifestPath && manifestIdentity) await unlinkIfIdentity(manifestPath, manifestIdentity);
    if (zipCreated && zipPath && zipIdentity) await unlinkIfIdentity(zipPath, zipIdentity);
    return { status: "BLOCKED_ROLLBACK_CAPTURE_FAILED", error_code: rollbackFailureCode(error), path: null, manifest_path: null, bytes: null, zip_sha256: null, code_sha256_base64: null, matches_code_sha256: false };
  }
}

export {
  captureExistingOrNewFile,
  ensurePrivateRollbackDirectory,
  isInside,
  readVerifiedPrivateFile,
  readVerifiedPrivateZip,
  verifyHeldZip,
};
