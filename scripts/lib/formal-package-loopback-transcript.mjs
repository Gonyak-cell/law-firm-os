import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";

export const FORMAL_PACKAGE_LOOPBACK_TRANSCRIPT_SCHEMA =
  "law-firm-os.formal-package-loopback-native-transcript.v1";

const GIT_SHA = /^[0-9a-f]{40}$/u;
const SHA256 = /^[0-9a-f]{64}$/u;
const RUNNER_CAPABILITIES = Object.freeze({
  macos: "native-macos-dmg",
  windows: "native-windows-nsis",
});

function exactKeys(value, expected, label) {
  assert.ok(value && typeof value === "object" && !Array.isArray(value), `${label} must be an object`);
  assert.deepEqual(Object.keys(value).sort(), [...expected].sort(), `${label} fields drifted`);
}

function timestamp(value, label) {
  assert.equal(new Date(value).toISOString(), value, `${label} must be a canonical ISO timestamp`);
}

function sha(value, label, pattern = SHA256) {
  assert.match(value ?? "", pattern, `${label} is invalid`);
}

function positiveCount(value, label) {
  assert.ok(Number.isSafeInteger(value) && value > 0, `${label} must be positive`);
}

export function canonicalFormalPackageLoopbackJson(value) {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
}

export function sha256FormalPackageLoopbackBytes(value) {
  return createHash("sha256").update(value).digest("hex");
}

function writeCanonicalFile(filePath, bytes) {
  const temporaryPath = `${filePath}.${process.pid}.${randomUUID()}.tmp`;
  try {
    writeFileSync(temporaryPath, bytes, { flag: "wx", mode: 0o600 });
    renameSync(temporaryPath, filePath);
  } finally {
    rmSync(temporaryPath, { force: true });
  }
}

export function validateFormalPackageLoopbackTranscript(transcript, expected = {}) {
  exactKeys(transcript, [
    "artifacts", "diagnostics", "execution", "finished_at", "platform", "requests",
    "runtime", "schema_version", "screenshots", "source", "started_at", "tuw_id",
  ], "native transcript");
  assert.equal(transcript.schema_version, FORMAL_PACKAGE_LOOPBACK_TRANSCRIPT_SCHEMA);
  assert.equal(transcript.tuw_id, "RFD-TUW-014");
  assert.equal(transcript.platform, expected.platform);
  assert.ok(Object.hasOwn(RUNNER_CAPABILITIES, transcript.platform), "native transcript platform is invalid");
  timestamp(transcript.started_at, "native transcript started_at");
  timestamp(transcript.finished_at, "native transcript finished_at");
  assert.ok(Date.parse(transcript.finished_at) >= Date.parse(transcript.started_at));

  exactKeys(transcript.source, ["revision", "source_tree"], "native transcript source");
  sha(transcript.source.revision, "native transcript source revision", GIT_SHA);
  sha(transcript.source.source_tree, "native transcript source tree", GIT_SHA);
  assert.equal(transcript.source.revision, expected.sourceSha);
  assert.equal(transcript.source.source_tree, expected.sourceTree);

  exactKeys(transcript.artifacts, [
    "executed_member_digest_sha256", "executed_package_sha256", "manifest_sha256",
    "package_artifact_sha256", "privacy_receipt_sha256s",
  ], "native transcript artifacts");
  for (const field of [
    "executed_member_digest_sha256", "executed_package_sha256", "manifest_sha256",
    "package_artifact_sha256",
  ]) sha(transcript.artifacts[field], `native transcript ${field}`);
  assert.equal(transcript.artifacts.package_artifact_sha256, expected.artifactSha256);
  assert.equal(transcript.artifacts.executed_package_sha256, expected.executedPackageSha256);
  assert.equal(transcript.artifacts.manifest_sha256, expected.manifestSha256);
  assert.equal(transcript.artifacts.executed_member_digest_sha256, expected.executedMemberDigestSha256);
  assert.ok(Array.isArray(transcript.artifacts.privacy_receipt_sha256s));
  assert.ok(transcript.artifacts.privacy_receipt_sha256s.length >= 2, "native transcript requires expanded and packaged privacy receipts");
  transcript.artifacts.privacy_receipt_sha256s.forEach((value) => sha(value, "native transcript privacy receipt"));
  assert.deepEqual(
    transcript.artifacts.privacy_receipt_sha256s,
    [...new Set(transcript.artifacts.privacy_receipt_sha256s)].sort(),
    "native transcript privacy receipt hashes must be unique and sorted",
  );
  if (expected.privacyReceiptSha256s) {
    assert.deepEqual(
      transcript.artifacts.privacy_receipt_sha256s,
      expected.privacyReceiptSha256s,
      "native transcript privacy receipts drifted from the canonical receipt",
    );
  }

  exactKeys(transcript.runtime, ["base_url", "health_source_sha", "mode", "topology"], "native transcript runtime");
  const baseUrl = new URL(transcript.runtime.base_url);
  assert.equal(baseUrl.protocol, "http:");
  assert.equal(baseUrl.hostname, "127.0.0.1");
  assert.match(baseUrl.port, /^\d{1,5}$/u);
  assert.ok(Number(baseUrl.port) > 0 && Number(baseUrl.port) <= 65_535);
  assert.equal(baseUrl.username, "");
  assert.equal(baseUrl.password, "");
  assert.equal(baseUrl.pathname, "/");
  assert.equal(baseUrl.search, "");
  assert.equal(baseUrl.hash, "");
  assert.equal(transcript.runtime.mode, "production-auth-http");
  assert.equal(transcript.runtime.topology, "thin-client");
  assert.equal(transcript.runtime.health_source_sha, expected.sourceSha);

  exactKeys(transcript.execution, [
    "adapter_invocation_count", "classification", "package_launch_count", "process_invocation_count",
    "runner_capability",
  ], "native transcript execution");
  assert.equal(transcript.execution.classification, "ACTUAL_NATIVE_RUNNER");
  assert.equal(transcript.execution.runner_capability, RUNNER_CAPABILITIES[transcript.platform]);
  positiveCount(transcript.execution.process_invocation_count, "process invocation count");
  assert.ok(transcript.execution.package_launch_count >= 2, "initial and restart package launches are required");
  assert.ok(transcript.execution.adapter_invocation_count >= 6, "Matter UI adapter invocations are required");

  assert.ok(Array.isArray(transcript.requests) && transcript.requests.length > 0, "native transcript requests are required");
  transcript.requests.forEach((row, index) => {
    exactKeys(row, ["body_action", "method", "path", "remote_loopback", "sequence", "status"], "native transcript request");
    assert.equal(row.sequence, index + 1);
    assert.match(row.method, /^[A-Z]{3,12}$/u);
    assert.match(row.path, /^\/api\//u);
    assert.ok(Number.isInteger(row.status) && row.status >= 100 && row.status <= 599);
    assert.ok(row.body_action === null || typeof row.body_action === "string");
    assert.equal(row.remote_loopback, true);
  });

  assert.ok(Array.isArray(transcript.screenshots) && transcript.screenshots.length > 0, "native transcript screenshots are required");
  transcript.screenshots.forEach((row, index) => {
    exactKeys(row, ["bytes", "name", "path", "sequence", "sha256"], "native transcript screenshot");
    assert.equal(row.sequence, index + 1);
    assert.match(row.name, /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u);
    assert.ok(typeof row.path === "string" && row.path.length > 0);
    sha(row.sha256, "native transcript screenshot");
    positiveCount(row.bytes, "native transcript screenshot bytes");
  });

  exactKeys(transcript.diagnostics, [
    "aws_request_count", "console_errors", "external_requests", "page_errors",
  ], "native transcript diagnostics");
  assert.deepEqual(transcript.diagnostics.page_errors, []);
  assert.deepEqual(transcript.diagnostics.console_errors, []);
  assert.deepEqual(transcript.diagnostics.external_requests, []);
  assert.equal(transcript.diagnostics.aws_request_count, 0);
  return transcript;
}

export function writeFormalPackageLoopbackTranscript(filePath, transcript, expected = {}) {
  validateFormalPackageLoopbackTranscript(transcript, expected);
  const bytes = canonicalFormalPackageLoopbackJson(transcript);
  writeCanonicalFile(filePath, bytes);
  return Object.freeze({
    path: filePath,
    sha256: sha256FormalPackageLoopbackBytes(bytes),
    bytes: bytes.byteLength,
  });
}

export function readFormalPackageLoopbackTranscript(filePath, expected = {}) {
  const bytes = readFileSync(filePath);
  const transcript = JSON.parse(bytes.toString("utf8"));
  assert.deepEqual(bytes, canonicalFormalPackageLoopbackJson(transcript), "native transcript must use canonical JSON bytes");
  validateFormalPackageLoopbackTranscript(transcript, expected);
  return Object.freeze({
    transcript,
    sha256: sha256FormalPackageLoopbackBytes(bytes),
    bytes: bytes.byteLength,
  });
}
