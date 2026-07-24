#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { realpathSync } from "node:fs";
import { relative, resolve, sep } from "node:path";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createJsonPostgresAuthorityBundle } from "../packages/persistence/src/postgres/authority-bundle.js";
import { runJsonPostgresExecutionMode } from "../packages/persistence/src/postgres/migration-executor.js";
import { createPostgresPool } from "../packages/persistence/src/postgres/pool.js";
import { verifyPostgresMigrationState } from "../packages/persistence/src/postgres/migration-runner.js";
import {
  prepareJsonPostgresDmsObjectManifest,
  runJsonPostgresDmsObjectMigration,
} from "../packages/dms/src/json-postgres-dms-migration.js";
import { createPostgresDmsUploadRuntime } from "../packages/dms/src/postgres-upload-runtime.js";
import { createS3StorageAdapter } from "../packages/dms/src/storage/s3-storage-adapter.js";
import {
  resolvePostgresConnectionString,
  resolvePostgresTenantContextSecret,
} from "../apps/api/src/persistence-authority.js";
import {
  validateJsonPostgresSourceTransformResult,
} from "../apps/api/src/json-postgres-source-transform.js";
import {
  validateJsonPostgresExecutionPacket,
  verifyJsonPostgresExecutionApproval,
} from "./lib/json-postgres-execution-contract.mjs";
import {
  readApprovedSourceBytes,
  readPrivateProgramBytes,
  readPrivateProgramJson,
  createPrivateProgramOutputDirectory,
  writePrivateProgramJson,
} from "./lib/json-postgres-program-files.mjs";
import { verifyJsonPostgresProgramReceipt } from "./lib/json-postgres-program-receipt.mjs";

function parse(argv) {
  const values = {};
  const repeated = { predecessor: [], "dms-source-root": [] };
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (!flag?.startsWith("--") || !value || value.startsWith("--")) throw new TypeError(`invalid option: ${flag ?? ""}`);
    const key = flag.slice(2);
    if (Object.hasOwn(repeated, key)) {
      repeated[key].push(value);
    } else {
      if (values[key] != null) throw new TypeError(`duplicate option: ${flag}`);
      values[key] = value;
    }
  }
  return { ...values, ...repeated };
}

function insideRoot(target, root) {
  const rel = relative(realpathSync(root), realpathSync(target));
  return rel === "" || (rel !== ".." && !rel.startsWith(`..${sep}`));
}

function required(value, name) {
  if (!value) throw new TypeError(`--${name} is required`);
  return value;
}

function git(...args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

function exactCleanHead(packet) {
  const status = git("status", "--porcelain=v1", "--untracked-files=all");
  if (status) throw new Error("execution requires a clean exact-head worktree");
  const sourceSha = git("rev-parse", "HEAD");
  const sourceTree = git("rev-parse", "HEAD^{tree}");
  if (sourceSha !== packet.source_sha || sourceTree !== packet.source_tree) throw new Error("worktree HEAD does not match the execution packet");
  if (packet.phase === "w13-production-cutover" && git("rev-parse", "origin/main") !== sourceSha) {
    throw new Error("production execution requires exact local origin/main");
  }
  return { sourceSha, sourceTree };
}

function expectedAwsRole(phase, mode) {
  if (phase === "w12-real-data-rehearsal") return mode === "readback" ? "matter-readonly-auditor" : "matter-staging-admin";
  if (mode === "readback" || mode === "reconcile") return "matter-readonly-auditor";
  if (mode === "commit" || mode === "resume") return "matter-cutover-operator";
  return "matter-prod-deploy-admin";
}

async function s3BodyToBuffer(body, expectedByteSize) {
  if (!body) throw new Error("DMS source object body is absent");
  if (!Number.isSafeInteger(expectedByteSize) || expectedByteSize < 0) {
    throw new Error("DMS source object size is invalid");
  }
  if (typeof body.transformToByteArray === "function") {
    const value = Buffer.from(await body.transformToByteArray());
    if (value.byteLength !== expectedByteSize) throw new Error("DMS source object size drifted");
    return value;
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of body) {
    const value = Buffer.from(chunk);
    size += value.byteLength;
    if (size > expectedByteSize) throw new Error("DMS source object exceeds its approved size");
    chunks.push(value);
  }
  if (size !== expectedByteSize) throw new Error("DMS source object size drifted");
  return Buffer.concat(chunks);
}

function verifyAwsCaller({ profile, packet, mode }) {
  const role = expectedAwsRole(packet.phase, mode);
  if (!packet.operators.includes(role)) throw new Error("required AWS operator role is absent from the packet");
  const identity = JSON.parse(execFileSync("aws", [
    "sts",
    "get-caller-identity",
    "--profile",
    profile,
    "--region",
    packet.target.aws_region,
    "--no-cli-pager",
    "--output",
    "json",
  ], { encoding: "utf8" }));
  if (identity.Account !== packet.target.aws_account) throw new Error("AWS caller account does not match the packet");
  const escapedRole = role.replaceAll(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  if (!new RegExp(`^arn:aws:sts::${packet.target.aws_account}:assumed-role/${escapedRole}/[^/]+$`, "u").test(identity.Arn ?? "")) {
    throw new Error("AWS caller role does not match the packet and execution mode");
  }
  return { account: identity.Account, role, caller_arn_sha256: createHash("sha256").update(identity.Arn).digest("hex") };
}

const options = parse(process.argv.slice(2));
const packet = readPrivateProgramJson(required(options.packet, "packet"), "execution packet");
const exact = exactCleanHead(packet);
const packetValidation = validateJsonPostgresExecutionPacket(packet, {
  sourceSha: exact.sourceSha,
  sourceTree: exact.sourceTree,
  phase: required(options.phase, "phase"),
});
const trustRegistryPath = required(options.registry, "registry");
const trustRegistry = readPrivateProgramJson(trustRegistryPath, "owner trust registry");
const approvalPath = required(options.approval, "approval");
readPrivateProgramJson(approvalPath, "execution approval receipt");
readPrivateProgramBytes(`${approvalPath}.sig`, "execution approval signature");
const approval = verifyJsonPostgresExecutionApproval({
  packet,
  sourceSha: exact.sourceSha,
  sourceTree: exact.sourceTree,
  trustRegistryPath: resolve(trustRegistryPath),
  trustRegistrySha256: required(options["registry-sha256"], "registry-sha256"),
  approvalReceiptPath: resolve(approvalPath),
});
const runtimePacket = Object.freeze({ ...packet, packet_sha256: packetValidation.packet_sha256 });
const recordTypeCatalog = readPrivateProgramJson(required(options.catalog, "catalog"), "record-type catalog");
const sealedSummary = readPrivateProgramJson(required(options["authority-summary"], "authority-summary"), "authority bundle summary");
let authorityBundle = {
  summary: sealedSummary,
  record_type_catalog: recordTypeCatalog,
};
let corpus = null;
let dmsManifest = null;
let sourceTransformResult = null;
const mode = required(options.mode, "mode");
if (mode !== "preflight") {
  const inventory = readPrivateProgramJson(required(options.inventory, "inventory"), "source inventory");
  const decisions = readPrivateProgramJson(required(options.decisions, "decisions"), "authority decisions");
  const recordAuthority = readPrivateProgramJson(
    required(options["record-authority"], "record-authority"),
    "record authority manifest",
  );
  corpus = readPrivateProgramJson(required(options.corpus, "corpus"), "migration corpus");
  sourceTransformResult = readPrivateProgramJson(
    required(options["source-transform-result"], "source-transform-result"),
    "source transform result",
  );
  const transform = validateJsonPostgresSourceTransformResult(sourceTransformResult);
  if (transform.result_sha256 !== runtimePacket.bindings.transform_sha256
    || transform.migration_manifest_sha256 !== runtimePacket.bindings.migration_manifest_sha256
    || sourceTransformResult.inventory_content_sha256 !== runtimePacket.bindings.inventory_content_sha256
    || corpus.manifest_sha256 !== runtimePacket.bindings.migration_manifest_sha256
    || inventory.inventory_content_sha256 !== runtimePacket.bindings.inventory_content_sha256) {
    throw new Error("migration source transform binding drifted");
  }
  authorityBundle = await createJsonPostgresAuthorityBundle({
    inventory,
    decisions,
    recordTypeCatalog,
    recordAuthority,
    corpus,
    sourceTransformResult,
  });
  if (authorityBundle.summary.bundle_sha256 !== sealedSummary.bundle_sha256
    || authorityBundle.summary.inventory_delta_policy_sha256
      !== runtimePacket.bindings.inventory_delta_policy_sha256) {
    throw new Error("recomputed authority bundle digest or inventory delta policy drifted");
  }
  dmsManifest = prepareJsonPostgresDmsObjectManifest(
    readPrivateProgramJson(required(options["dms-manifest"], "dms-manifest"), "DMS object manifest"),
  );
  if (dmsManifest.manifest_sha256 !== runtimePacket.bindings.dms_object_manifest_sha256
    || dmsManifest.authority_manifest_sha256 !== authorityBundle.summary.authority_manifest_sha256) {
    throw new Error("DMS object manifest binding drifted");
  }
}
const predecessors = options.predecessor.map((path) => {
  const receipt = readPrivateProgramJson(path, "program predecessor receipt");
  const signature = readPrivateProgramBytes(`${path}.sig`, "program predecessor signature");
  return verifyJsonPostgresProgramReceipt({
    receipt,
    signature,
    trustRegistry,
  });
});

let pool = null;
let caller = null;
let dmsStorage = null;
let dmsRuntime = null;
let sourceS3Client = null;
let expectedProgramInputKmsKeyArn = null;
const requiresDatabase = ["commit", "resume", "readback", "reconcile"].includes(mode);
if (mode !== "preflight") {
  const profile = required(options["aws-profile"], "aws-profile");
  caller = verifyAwsCaller({ profile, packet, mode });
  process.env.AWS_PROFILE = profile;
  sourceS3Client = new S3Client({ region: packet.target.aws_region });
  const key = JSON.parse(execFileSync("aws", [
    "kms", "describe-key",
    "--key-id", packet.target.program_input_kms_key_ref,
    "--profile", profile,
    "--region", packet.target.aws_region,
    "--no-cli-pager",
    "--output", "json",
  ], { encoding: "utf8" }));
  expectedProgramInputKmsKeyArn = key.KeyMetadata?.Arn ?? null;
  if (!expectedProgramInputKmsKeyArn) throw new Error("program-input KMS key did not resolve");
}
if (requiresDatabase) {
  const env = {
    LAWOS_RUNTIME_PROFILE: "operational",
    LAWOS_POSTGRES_URL_SECRET_ID: packet.target.database_secret_ref,
    LAWOS_POSTGRES_TENANT_CONTEXT_SECRET_ID: packet.target.tenant_context_secret_ref,
    AWS_REGION: packet.target.aws_region,
  };
  const [connectionString, tenantContextSecret] = await Promise.all([
    resolvePostgresConnectionString({ env }),
    resolvePostgresTenantContextSecret({ env }),
  ]);
  pool = createPostgresPool({
    connectionString,
    sslMode: "verify-full",
    applicationName: `lawos-json-postgres-${mode}`,
    tenantContextSecret,
    max: 1,
  });
  await verifyPostgresMigrationState(pool);
  dmsStorage = createS3StorageAdapter({
    adapter_id: packet.phase === "w13-production-cutover" ? "lawos-production-s3" : "lawos-rehearsal-s3",
    credential_ref: `aws-profile:${profile}`,
    bucket: packet.target.dms_bucket_name,
    expected_bucket_owner: packet.target.dms_expected_bucket_owner,
    region: packet.target.aws_region,
    prefix: packet.target.dms_prefix,
    kms_key_id: packet.target.dms_kms_key_ref,
    object_lock_enabled: packet.target.dms_object_lock_enabled,
    default_retention_days: packet.target.dms_default_retention_days,
  });
  dmsRuntime = createPostgresDmsUploadRuntime({ pool, storage: dmsStorage });
}

const outputDir = createPrivateProgramOutputDirectory(required(options["output-dir"], "output-dir"));
let checkpointIndex = 0;
let dmsCheckpointIndex = 0;
const dmsSourceRoots = options["dms-source-root"].map((path) => realpathSync(resolve(path)));
const dmsCheckpoint = options["dms-checkpoint"]
  ? readPrivateProgramJson(options["dms-checkpoint"], "DMS migration checkpoint")
  : null;
const dmsRunner = mode === "preflight" ? null : async ({ mode: executionMode }) => {
  const dmsMode = executionMode === "stage" ? "dry-run"
    : executionMode === "commit" ? "import"
      : executionMode;
  return runJsonPostgresDmsObjectMigration({
    manifest: dmsManifest,
    mode: dmsMode,
    runtime: dmsRuntime,
    storage: dmsStorage,
    checkpoint: dmsCheckpoint,
    negativeTenantId: options["negative-tenant-id"] ?? null,
    loadBytes: async (object) => {
      if (object.source_object) {
        if (object.source_object.bucket !== packet.target.program_input_bucket_name
          || object.source_object.expected_bucket_owner !== packet.target.program_input_expected_bucket_owner
          || object.source_object.expected_bucket_owner !== packet.target.aws_account) {
          throw new Error("DMS immutable source target does not match the execution packet");
        }
        const response = await sourceS3Client.send(new GetObjectCommand({
          Bucket: object.source_object.bucket,
          Key: object.source_object.key,
          VersionId: object.source_object.version_id,
          ExpectedBucketOwner: object.source_object.expected_bucket_owner,
          ChecksumMode: "ENABLED",
        }));
        if (response.VersionId !== object.source_object.version_id
          || Number(response.ContentLength) !== object.byte_size
          || response.ServerSideEncryption !== "aws:kms"
          || response.SSEKMSKeyId !== expectedProgramInputKmsKeyArn
          || !["GOVERNANCE", "COMPLIANCE"].includes(response.ObjectLockMode)
          || !Number.isFinite(Date.parse(response.ObjectLockRetainUntilDate))
          || Date.parse(response.ObjectLockRetainUntilDate) <= Date.now()) {
          throw new Error("DMS source object storage governance drifted");
        }
        return s3BodyToBuffer(response.Body, object.byte_size);
      }
      if (packet.phase === "w13-production-cutover") {
        throw new Error("production DMS execution requires an immutable S3 source version");
      }
      if (dmsSourceRoots.length === 0 || !dmsSourceRoots.some((root) => insideRoot(object.source_path, root))) {
        throw new Error("DMS source path is outside every approved source root");
      }
      return readApprovedSourceBytes(object.source_path, {
        approvedRoots: dmsSourceRoots,
        expectedByteSize: object.byte_size,
        expectedSha256: object.sha256,
      });
    },
    onCheckpoint: async (value) => {
      dmsCheckpointIndex += 1;
      writePrivateProgramJson(resolve(outputDir, `dms-checkpoint-${String(dmsCheckpointIndex).padStart(4, "0")}.json`), value);
    },
  });
};
let result;
try {
  result = await runJsonPostgresExecutionMode({
    packet: runtimePacket,
    approval,
    authorityBundle,
    corpus,
    mode,
    pool,
    negativeTenantId: options["negative-tenant-id"] ?? null,
    checkpoint: options.checkpoint ? readPrivateProgramJson(options.checkpoint, "migration checkpoint") : null,
    onCheckpoint: async (checkpoint) => {
      checkpointIndex += 1;
      writePrivateProgramJson(resolve(outputDir, `checkpoint-${String(checkpointIndex).padStart(4, "0")}.json`), checkpoint);
    },
    predecessors,
    dmsRunner,
  });
} finally {
  await pool?.end();
}
const output = writePrivateProgramJson(resolve(outputDir, "execution-result.json"), {
  ...result,
  aws_caller: caller,
});
process.stdout.write(`${JSON.stringify({
  verdict: result.outcome,
  phase: result.phase,
  mode: result.mode,
  source_sha: result.source_sha,
  source_tree: result.source_tree,
  packet_sha256: result.packet_sha256,
  result_sha256: result.result_sha256,
  execution_result_file_sha256: output.sha256,
  output_dir: outputDir,
  first_write_state: result.first_write_state,
  dms_result_sha256: result.dms_result_sha256,
  safe_counts: result.safe_counts,
  claims: result.claims,
}, null, 2)}\n`);
