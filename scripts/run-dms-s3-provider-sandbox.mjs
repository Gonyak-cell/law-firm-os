#!/usr/bin/env node
import { createHash, randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createS3StorageAdapter } from "../packages/dms/src/storage/s3-storage-adapter.js";
import { sha256Hex } from "../packages/dms/src/storage/storage-adapter.js";
import { validateRuntimeSafetyEvidence } from "./lib/runtime-safety-evidence-contract.mjs";

function arg(name, fallback = null) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1];
}

function required(value, name) {
  if (typeof value !== "string" || value.trim() === "") throw new Error(`${name} is required`);
  return value.trim();
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function git(...args) {
  return execFileSync("git", args, { cwd: process.cwd(), encoding: "utf8" }).trim();
}

function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
}

function timestampAfter(startedAt) {
  return new Date(Math.max(Date.now(), Date.parse(startedAt) + 1)).toISOString();
}

const startedAt = new Date().toISOString();
const bucket = required(arg("--bucket", process.env.DMS_S3_BUCKET), "--bucket");
const expectedBucketOwner = required(arg("--expected-bucket-owner", process.env.DMS_S3_EXPECTED_BUCKET_OWNER), "--expected-bucket-owner");
const approvalRef = required(arg("--approval-ref", process.env.DMS_S3_APPROVAL_REF), "--approval-ref");
const userInstructionSha = required(arg("--user-instruction-sha256"), "--user-instruction-sha256");
if (!/^[0-9a-f]{64}$/u.test(userInstructionSha)) throw new Error("--user-instruction-sha256 must be lowercase SHA-256");
const receiptPath = resolve(required(arg("--receipt"), "--receipt"));
const outputPath = resolve(arg("--output", `${receiptPath}.output.json`));
const prefix = arg("--prefix", `lawos-dms-sandbox/${new Date().toISOString().slice(0, 10)}/${randomUUID()}`);
const adapter = createS3StorageAdapter({
  adapter_id: "aws-s3-sandbox",
  bucket,
  prefix,
  region: arg("--region", process.env.AWS_REGION ?? "ap-northeast-2"),
  expected_bucket_owner: expectedBucketOwner,
  credential_ref: arg("--credential-ref", `aws-profile:${process.env.AWS_PROFILE ?? "default"}`),
  kms_key_id: arg("--kms-key-id", "alias/aws/s3"),
  object_lock_enabled: true,
});

const shared = { session_id: `session-${randomUUID()}`, object_id: `object-${randomUUID()}`, content_type: "text/plain" };
const tenantA = `tenant-synthetic-a-${randomUUID()}`;
const tenantB = `tenant-synthetic-b-${randomUUID()}`;
const bytesA = Buffer.from(`LAWOS DMS synthetic provider proof A ${randomUUID()}`);
const bytesB = Buffer.from(`LAWOS DMS synthetic provider proof B ${randomUUID()}`);

await adapter.stageObject({ tenant_id: tenantA, ...shared, bytes: bytesA, expected_sha256: sha256Hex(bytesA) });
await adapter.stageObject({ tenant_id: tenantB, ...shared, bytes: bytesB, expected_sha256: sha256Hex(bytesB) });
const stagedA = await adapter.digestObject({ tenant_id: tenantA, ...shared });
const stagedB = await adapter.digestObject({ tenant_id: tenantB, ...shared });
if (stagedA?.sha256 !== sha256Hex(bytesA) || stagedB?.sha256 !== sha256Hex(bytesB)) throw new Error("tenant-qualified staged digest verification failed");

const committedA = await adapter.finalizeObject({ tenant_id: tenantA, ...shared });
const committedB = await adapter.finalizeObject({ tenant_id: tenantB, ...shared });
const readA = await adapter.getObject({ tenant_id: tenantA, object_id: shared.object_id });
const readB = await adapter.getObject({ tenant_id: tenantB, object_id: shared.object_id });
if (!readA.bytes.equals(bytesA) || !readB.bytes.equals(bytesB) || readA.sha256 === readB.sha256) throw new Error("tenant-qualified committed readback failed");

const holdObjectId = `held-${randomUUID()}`;
const holdBytes = Buffer.from(`LAWOS DMS synthetic legal hold proof ${randomUUID()}`);
const holdReceipt = await adapter.putObject({ tenant_id: tenantA, object_id: holdObjectId, bytes: holdBytes, content_type: "text/plain" });
await adapter.setObjectLegalHold({ tenant_id: tenantA, object_id: holdObjectId, status: "ON" });
let legalHoldBlockedDelete = false;
try {
  await adapter.deleteCommittedObject({ tenant_id: tenantA, object_id: holdObjectId, expected_sha256: holdReceipt.sha256 });
} catch (error) {
  legalHoldBlockedDelete = error?.$metadata?.httpStatusCode === 403 || ["AccessDenied", "InvalidRequest"].includes(error?.name);
}
if (!legalHoldBlockedDelete || (await adapter.getObjectLegalHold({ tenant_id: tenantA, object_id: holdObjectId })).status !== "ON") {
  throw new Error("provider legal hold did not fail closed");
}
await adapter.setObjectLegalHold({ tenant_id: tenantA, object_id: holdObjectId, status: "OFF" });
await adapter.deleteCommittedObject({ tenant_id: tenantA, object_id: holdObjectId, expected_sha256: holdReceipt.sha256 });

const retainedObjectId = `retained-${randomUUID()}`;
const retainedBytes = Buffer.from(`LAWOS DMS synthetic retention proof ${randomUUID()}`);
const retainedReceipt = await adapter.putObject({ tenant_id: tenantB, object_id: retainedObjectId, bytes: retainedBytes, content_type: "text/plain" });
const retainUntil = new Date(Date.now() + 5 * 60_000).toISOString();
await adapter.setObjectRetention({ tenant_id: tenantB, object_id: retainedObjectId, retain_until: retainUntil });
const retention = await adapter.getObjectRetention({ tenant_id: tenantB, object_id: retainedObjectId });
let retentionBlockedDelete = false;
try {
  await adapter.deleteCommittedObject({ tenant_id: tenantB, object_id: retainedObjectId, expected_sha256: retainedReceipt.sha256 });
} catch (error) {
  retentionBlockedDelete = error?.$metadata?.httpStatusCode === 403 || ["AccessDenied", "InvalidRequest"].includes(error?.name);
}
if (!retentionBlockedDelete || retention.mode !== "GOVERNANCE" || retention.retain_until !== retainUntil) {
  throw new Error("provider retention did not fail closed");
}

await adapter.deleteCommittedObject({ tenant_id: tenantA, object_id: shared.object_id, expected_sha256: committedA.sha256 });
await adapter.deleteCommittedObject({ tenant_id: tenantB, object_id: shared.object_id, expected_sha256: committedB.sha256 });

const safeOutput = {
  schema_version: "law-firm-os.dms-s3-provider-sandbox-output.v0.1",
  provider: "aws-s3",
  environment: "sandbox",
  synthetic_only: true,
  tenant_isolation_verified: true,
  independent_digest_readback_verified: true,
  finalize_verified: true,
  legal_hold_roundtrip_verified: true,
  retention_roundtrip_verified: true,
  conditional_delete_verified: true,
  retained_synthetic_object_count: 1,
  retain_until: retainUntil,
  raw_object_keys_recorded: false,
  raw_bytes_recorded: false,
  secret_material_recorded: false,
};
writeJson(outputPath, safeOutput);
const finishedAt = timestampAfter(startedAt);
const outputBytes = readFileSync(outputPath);
const resultSlice = "isolated:RS-DMS-001:provider-sandbox";
const receipt = {
  schema_version: "law-firm-os.runtime-safety.command-evidence.v0.2",
  tuw_id: "RS-DMS-001",
  implementation_state: "VERIFIED",
  execution_state: "EXECUTED",
  target_source_sha: git("rev-parse", "HEAD"),
  target_tree: git("rev-parse", "HEAD^{tree}"),
  toolchain_sha: git("hash-object", fileURLToPath(import.meta.url)),
  profile: "external-authorized",
  commands: [{
    ordinal: 1,
    argv: [
      "node", "scripts/run-dms-s3-provider-sandbox.mjs",
      "--bucket", bucket,
      "--expected-bucket-owner", expectedBucketOwner,
      "--approval-ref", approvalRef,
      "--user-instruction-sha256", userInstructionSha,
      "--receipt", receiptPath,
      "--output", outputPath,
    ],
    cwd: process.cwd(),
    env_keys: ["AWS_PROFILE", "AWS_REGION"],
    parser: "json",
    timeout_ms: 3_600_000,
    result_slice: resultSlice,
  }],
  results: [{
    ordinal: 1,
    exit_code: 0,
    started_at: startedAt,
    finished_at: finishedAt,
    output_sha256: sha256(outputBytes),
    result_slice: resultSlice,
    passed: true,
    skipped: 0,
  }],
  started_at: startedAt,
  finished_at: finishedAt,
  safe_counts: {
    tenant_count: 2,
    staged_write_count: 4,
    finalized_write_count: 4,
    independent_digest_count: 2,
    legal_hold_denial_count: 1,
    retention_denial_count: 1,
    retained_synthetic_object_count: 1,
    non_retained_cleanup_count: 3,
  },
  skip_count: 0,
  output_path: outputPath,
  output_sha256: sha256(outputBytes),
  claims: {
    verified: true,
    source_merge_candidate: true,
    production_ready: false,
    release_executed: false,
    aws_mutation_executed: true,
    provider_contacted: true,
    idp_contacted: false,
    staging_contacted: false,
    production_contacted: false,
    real_data_contacted: false,
    windows_signing_executed: false,
    cutover_executed: false,
    json_authority_disabled: false,
    go_live: false,
  },
  external_actions: [{
    action: "dms_s3_provider_sandbox_write",
    environment: "sandbox",
    executed: true,
    approval_id: approvalRef,
    user_instruction_sha256: userInstructionSha,
  }],
};
validateRuntimeSafetyEvidence(receipt, { outputBytes, allowedOutputRoots: [dirname(outputPath)] });
writeJson(receiptPath, receipt);
process.stdout.write(`${JSON.stringify({
  outcome: "PASS",
  receipt_path: receiptPath,
  receipt_sha256: sha256(readFileSync(receiptPath)),
  output_sha256: receipt.output_sha256,
  safe_counts: receipt.safe_counts,
})}\n`);
