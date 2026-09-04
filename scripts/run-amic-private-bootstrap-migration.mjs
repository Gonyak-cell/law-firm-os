#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { realpathSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  verifyClientOperationsPostgresMigrations,
} from "../apps/api/src/client-operations-schema.js";
import {
  resolvePostgresConnectionString,
  resolvePostgresTenantContextSecret,
} from "../apps/api/src/persistence-authority.js";
import { createS3StorageAdapter } from "../packages/dms/src/storage/s3-storage-adapter.js";
import { createHrxMemberPhotoStorage } from "../packages/hrx/src/member-photo-storage.js";
import { createPostgresPool } from "../packages/persistence/src/postgres/pool.js";
import {
  executeAmicPrivateBootstrapMigration,
  validateAmicPrivateBootstrapExecutionPacket,
  validateAmicPrivateBootstrapExecutionPreflightBinding,
  verifyAmicPrivateBootstrapExecutionApprovalPayload,
} from "./lib/amic-private-bootstrap-execution.mjs";
import {
  validateAmicPrivateBootstrapGitState,
  validateAmicPrivateBootstrapPacketInputBinding,
  validateAmicPrivateBootstrapS3Controls,
  verifyAmicPrivateBootstrapAwsCaller,
} from "./lib/amic-private-bootstrap-production.mjs";
import {
  dryRunAmicPrivateBootstrapMigration,
} from "./lib/amic-private-bootstrap-migration.mjs";
import {
  createPrivateProgramOutputDirectory,
  readPrivateProgramBytes,
  readPrivateProgramJson,
  writePrivateProgramJson,
} from "./lib/json-postgres-program-files.mjs";

const ALLOWED_OPTIONS = new Set([
  "root",
  "packet",
  "packet-input",
  "registry",
  "registry-sha256",
  "approval",
  "mapping",
  "output-dir",
  "registration-source",
  "roster-source",
  "contact-source",
  "photo-directory",
]);

function parse(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (!flag?.startsWith("--") || !value || value.startsWith("--")) {
      throw Object.assign(new TypeError("invalid private bootstrap option"), {
        code: "AMIC_PRIVATE_BOOTSTRAP_OPERATOR_OPTION",
      });
    }
    const key = flag.slice(2);
    if (!ALLOWED_OPTIONS.has(key) || options[key] != null) {
      throw Object.assign(new TypeError("unsupported or duplicate private bootstrap option"), {
        code: "AMIC_PRIVATE_BOOTSTRAP_OPERATOR_OPTION",
      });
    }
    options[key] = value;
  }
  return options;
}

function required(value, name) {
  const text = String(value ?? "").trim();
  if (!text) {
    throw Object.assign(new TypeError(`--${name} is required`), {
      code: "AMIC_PRIVATE_BOOTSTRAP_OPERATOR_OPTION",
    });
  }
  return text;
}

function git(root, ...args) {
  return execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  }).trim();
}

function awsJson({ profile, region }, args) {
  return JSON.parse(execFileSync("aws", [
    ...args,
    "--profile", profile,
    "--region", region,
    "--no-cli-pager",
    "--output", "json",
  ], {
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  }));
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function safeCode(error, phase) {
  return String(
    error?.code
      ?? error?.safe_error_code
      ?? `AMIC_PRIVATE_BOOTSTRAP_${phase.toUpperCase().replace(/[^A-Z0-9]+/gu, "_")}_FAILED`,
  ).replace(/[^A-Za-z0-9_.:-]/gu, "_").slice(0, 96);
}

function expectedOperator(environment) {
  return environment === "lawos-production"
    ? "matter-cutover-operator"
    : "matter-staging-admin";
}

let pool = null;
let outputDir = null;
let phase = "options";
let packet = null;
let committedResult = null;

try {
  const options = parse(process.argv.slice(2));
  const root = realpathSync(resolve(options.root ?? process.cwd()));
  if (realpathSync(git(root, "rev-parse", "--show-toplevel")) !== root) {
    throw Object.assign(new Error("private bootstrap must run at the repository root"), {
      code: "AMIC_PRIVATE_BOOTSTRAP_GIT_STATE",
    });
  }
  phase = "private-input";
  packet = readPrivateProgramJson(
    required(options.packet, "packet"),
    "private bootstrap execution packet",
    { worktree: root },
  );
  const packetInput = readPrivateProgramJson(
    required(options["packet-input"], "packet-input"),
    "private bootstrap packet input",
    { worktree: root },
  );
  const sourceSha = git(root, "rev-parse", "HEAD");
  const sourceTree = git(root, "rev-parse", "HEAD^{tree}");
  validateAmicPrivateBootstrapExecutionPacket(packet, {
    sourceSha,
    sourceTree,
  });
  const inputBinding = validateAmicPrivateBootstrapPacketInputBinding({
    packet,
    input: packetInput,
  });
  const exactGit = () => validateAmicPrivateBootstrapGitState({
    status: git(root, "status", "--porcelain=v1", "--untracked-files=all"),
    sourceSha: git(root, "rev-parse", "HEAD"),
    sourceTree: git(root, "rev-parse", "HEAD^{tree}"),
    originMain: packet.environment === "lawos-production"
      ? git(root, "rev-parse", "origin/main")
      : null,
    environment: packet.environment,
    packet,
  });
  exactGit();

  phase = "owner-approval";
  const registryBytes = readPrivateProgramBytes(
    required(options.registry, "registry"),
    "owner trust registry",
    { worktree: root },
  );
  const approvalPath = required(options.approval, "approval");
  const approval = verifyAmicPrivateBootstrapExecutionApprovalPayload({
    packet,
    trustRegistryBytes: registryBytes,
    trustRegistrySha256: required(
      options["registry-sha256"],
      "registry-sha256",
    ),
    approvalReceiptBytes: readPrivateProgramBytes(
      approvalPath,
      "private bootstrap approval receipt",
      { worktree: root },
    ),
    approvalSignatureBytes: readPrivateProgramBytes(
      `${approvalPath}.sig`,
      "private bootstrap approval signature",
      { worktree: root },
    ),
  });

  phase = "local-preflight";
  const sourceOptions = {
    root,
    mappingPath: required(options.mapping, "mapping"),
    registrationPath: options["registration-source"] ?? undefined,
    rosterPath: options["roster-source"] ?? undefined,
    contactPath: options["contact-source"] ?? null,
    photoDirectory: options["photo-directory"] ?? undefined,
  };
  const preflight = await dryRunAmicPrivateBootstrapMigration(sourceOptions);
  validateAmicPrivateBootstrapExecutionPreflightBinding({
    packet,
    preflightReceipt: preflight,
    negativeTenantId: inputBinding.input.negative_tenant_id,
    photoStorageProvider: "s3",
    photoStorageAdapterId: inputBinding.photo_storage_adapter_id,
  });
  exactGit();

  outputDir = createPrivateProgramOutputDirectory(
    required(options["output-dir"], "output-dir"),
    { worktree: root },
  );
  writePrivateProgramJson(join(outputDir, "private-bootstrap-start.json"), {
    schema_version: "law-firm-os.amic-private-bootstrap-start.v1",
    packet_sha256: packet.packet_sha256,
    approval_receipt_sha256: approval.receipt_sha256,
    source_sha: sourceSha,
    source_tree: sourceTree,
    environment: packet.environment,
    current_state: "AUTHORIZED_NOT_EXECUTED",
    aws_write: false,
    postgres_write: false,
    object_storage_write: false,
    source_mutated: false,
    production_ready_claim: false,
  });

  const target = inputBinding.input.production_target;
  const profile = expectedOperator(packet.environment);
  const aws = { profile, region: target.aws_region };
  phase = "aws-caller";
  const caller = verifyAmicPrivateBootstrapAwsCaller({
    target,
    expectedRole: profile,
    identity: awsJson(aws, ["sts", "get-caller-identity"]),
  });
  phase = "storage-controls";
  const controls = validateAmicPrivateBootstrapS3Controls({
    target,
    location: awsJson(aws, [
      "s3api", "get-bucket-location",
      "--bucket", target.photo_bucket_name,
      "--expected-bucket-owner", target.photo_expected_bucket_owner,
    ]),
    versioning: awsJson(aws, [
      "s3api", "get-bucket-versioning",
      "--bucket", target.photo_bucket_name,
      "--expected-bucket-owner", target.photo_expected_bucket_owner,
    ]),
    publicAccessBlock: awsJson(aws, [
      "s3api", "get-public-access-block",
      "--bucket", target.photo_bucket_name,
      "--expected-bucket-owner", target.photo_expected_bucket_owner,
    ]),
    encryption: awsJson(aws, [
      "s3api", "get-bucket-encryption",
      "--bucket", target.photo_bucket_name,
      "--expected-bucket-owner", target.photo_expected_bucket_owner,
    ]),
    ownership: awsJson(aws, [
      "s3api", "get-bucket-ownership-controls",
      "--bucket", target.photo_bucket_name,
      "--expected-bucket-owner", target.photo_expected_bucket_owner,
    ]),
    kms: awsJson(aws, [
      "kms", "describe-key",
      "--key-id", target.photo_kms_key_arn,
    ]),
  });
  writePrivateProgramJson(
    join(outputDir, "private-bootstrap-aws-controls.json"),
    {
      schema_version: "law-firm-os.amic-private-bootstrap-aws-controls.v1",
      packet_sha256: packet.packet_sha256,
      caller,
      storage: controls,
      aws_write: false,
      production_ready_claim: false,
    },
  );

  phase = "database-readiness";
  process.env.AWS_PROFILE = profile;
  process.env.AWS_REGION = target.aws_region;
  process.env.AWS_DEFAULT_REGION = target.aws_region;
  const authorityEnv = {
    LAWOS_RUNTIME_PROFILE: "operational",
    LAWOS_POSTGRES_URL_SECRET_ID: target.database_secret_ref,
    LAWOS_POSTGRES_TENANT_CONTEXT_SECRET_ID:
      target.tenant_context_secret_ref,
    AWS_REGION: target.aws_region,
    AWS_DEFAULT_REGION: target.aws_region,
  };
  let connectionString = await resolvePostgresConnectionString({
    env: authorityEnv,
  });
  let tenantContextSecret = await resolvePostgresTenantContextSecret({
    env: authorityEnv,
  });
  pool = createPostgresPool({
    connectionString,
    sslMode: "verify-full",
    tenantContextSecret,
    max: 1,
    applicationName: "amic-private-bootstrap",
  });
  connectionString = null;
  tenantContextSecret = null;
  await pool.query("SELECT 1 AS private_bootstrap_database_ready");
  const migrations = await verifyClientOperationsPostgresMigrations(pool);
  if (!migrations.some(({ id }) => id === "049_hrx_directory_authority")) {
    throw Object.assign(new Error("HRX directory authority migration is absent"), {
      code: "AMIC_PRIVATE_BOOTSTRAP_DATABASE_SCHEMA",
    });
  }
  const tenantAuthority = await pool.query(
    "SELECT lawos_security.tenant_context_authority_ready() AS ready",
  );
  if (tenantAuthority.rows[0]?.ready !== true) {
    throw Object.assign(new Error("authenticated tenant authority is not ready"), {
      code: "AMIC_PRIVATE_BOOTSTRAP_DATABASE_AUTHORITY",
    });
  }
  const schemaReceipt = {
    schema_version: "law-firm-os.amic-private-bootstrap-database-readiness.v1",
    packet_sha256: packet.packet_sha256,
    migration_count: migrations.length,
    migration_catalog_sha256: sha256(Buffer.from(JSON.stringify(
      migrations.map(({ id, checksum }) => ({ id, checksum })),
    ))),
    hrx_directory_authority_present: true,
    tenant_context_authority_ready: true,
    secret_material_returned: false,
    postgres_write: false,
    production_ready_claim: false,
  };
  writePrivateProgramJson(
    join(outputDir, "private-bootstrap-database-readiness.json"),
    schemaReceipt,
  );

  phase = "migration-execution";
  const storage = createS3StorageAdapter({
    adapter_id: inputBinding.photo_storage_adapter_id,
    credential_ref: `aws-profile:${profile}`,
    bucket: target.photo_bucket_name,
    expected_bucket_owner: target.photo_expected_bucket_owner,
    region: target.aws_region,
    prefix: target.photo_prefix,
    kms_key_id: target.photo_kms_key_arn,
  });
  const memberPhotoStorage = createHrxMemberPhotoStorage({ storage });
  let checkpointIndex = 0;
  committedResult = await executeAmicPrivateBootstrapMigration({
    packet,
    approval,
    sourceSha,
    sourceTree,
    negativeTenantId: inputBinding.input.negative_tenant_id,
    pool,
    memberPhotoStorage,
    onCheckpoint(checkpoint) {
      checkpointIndex += 1;
      writePrivateProgramJson(
        join(
          outputDir,
          `private-bootstrap-checkpoint-${String(checkpointIndex).padStart(2, "0")}.json`,
        ),
        checkpoint,
      );
    },
    ...sourceOptions,
  });
  phase = "database-close";
  await pool.end();
  pool = null;
  phase = "post-execution-source-check";
  exactGit();
  const resultFile = writePrivateProgramJson(
    join(outputDir, "private-bootstrap-execution-result.json"),
    committedResult,
  );
  const summaryFile = writePrivateProgramJson(
    join(outputDir, "private-bootstrap-execution-summary.json"),
    {
      schema_version: "law-firm-os.amic-private-bootstrap-execution-summary.v1",
      outcome: "PASS",
      packet_sha256: packet.packet_sha256,
      approval_receipt_sha256: approval.receipt_sha256,
      result_file_sha256: resultFile.sha256,
      source_sha: sourceSha,
      source_tree: sourceTree,
      environment: packet.environment,
      source_subject_count: committedResult.source_subject_count,
      assigned_subject_count: committedResult.assigned_subject_count,
      quarantined_subject_count: committedResult.quarantined_subject_count,
      directory_readback_count: committedResult.directory_readback_count,
      hrx_record_readback_count: committedResult.hrx_record_readback_count,
      photo_readback_count: committedResult.photo_readback_count,
      tenant_negative_visible_count:
        committedResult.tenant_negative_visible_count,
      repair_required: committedResult.repair_required,
      source_mutated: false,
      raw_identity_returned: false,
      raw_photo_returned: false,
      public_distribution: false,
      production_ready_claim: false,
    },
  );
  process.stdout.write(`${JSON.stringify({
    verdict: "PASS",
    packet_sha256: packet.packet_sha256,
    source_sha: sourceSha,
    environment: packet.environment,
    result_path: resultFile.path,
    summary_path: summaryFile.path,
    directory_readback_count: committedResult.directory_readback_count,
    hrx_record_readback_count: committedResult.hrx_record_readback_count,
    photo_readback_count: committedResult.photo_readback_count,
    tenant_negative_visible_count:
      committedResult.tenant_negative_visible_count,
    repair_required: committedResult.repair_required,
    production_ready_claim: false,
  }, null, 2)}\n`);
} catch (error) {
  const failure = error?.safe_receipt ?? {
    schema_version: "law-firm-os.amic-private-bootstrap-operator-failure.v1",
    outcome: "BLOCKED",
    packet_sha256: packet?.packet_sha256 ?? null,
    failed_phase: phase,
    failure_code: safeCode(error, phase),
    execution_may_have_committed: committedResult?.outcome === "PASS",
    repair_required: committedResult?.outcome === "PASS",
    operator_source_mutation_claim: false,
    raw_identity_returned: false,
    raw_photo_returned: false,
    production_ready_claim: false,
  };
  let failurePath = null;
  if (outputDir) {
    try {
      failurePath = writePrivateProgramJson(
        join(outputDir, "private-bootstrap-failure.json"),
        failure,
      ).path;
    } catch {
      failurePath = null;
    }
  }
  process.stderr.write(`${JSON.stringify({
    verdict: "BLOCKED",
    failed_phase: phase,
    failure_code: safeCode(error, phase),
    failure_path: failurePath,
    repair_required: failure.repair_required === true,
    raw_error_returned: false,
    production_ready_claim: false,
  }, null, 2)}\n`);
  process.exitCode = 1;
} finally {
  if (pool) {
    try {
      await pool.end();
    } catch {
      process.exitCode = 1;
    }
  }
}
