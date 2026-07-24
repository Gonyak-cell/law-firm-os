#!/usr/bin/env node
import { execFileSync, spawnSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  readFileSync,
} from "node:fs";
import { join } from "node:path";
import {
  prepareJsonPostgresDmsObjectManifest,
} from "../packages/dms/src/json-postgres-dms-migration.js";
import {
  createJsonPostgresAuthorityBundle,
} from "../packages/persistence/src/postgres/authority-bundle.js";
import {
  validateJsonPostgresExecutionPacket,
  verifyJsonPostgresExecutionApproval,
} from "../packages/persistence/src/postgres/execution-contract.js";
import {
  verifyJsonPostgresProgramReceipt,
} from "../packages/persistence/src/postgres/program-receipt.js";
import {
  validateJsonPostgresSourceTransformResult,
} from "../apps/api/src/json-postgres-source-transform.js";
import {
  validateJsonPostgresRehearsalBackupRetentionContract,
} from "./lib/json-postgres-rehearsal-contracts.mjs";
import {
  JSON_POSTGRES_REHEARSAL_ACCOUNT,
  JSON_POSTGRES_REHEARSAL_FUNCTION,
  JSON_POSTGRES_REHEARSAL_MONTHLY_FORECAST_KRW,
  JSON_POSTGRES_REHEARSAL_PROGRAM_INPUT_BUCKET,
  JSON_POSTGRES_REHEARSAL_REGION,
  JSON_POSTGRES_REHEARSAL_ROLE,
  JSON_POSTGRES_REHEARSAL_STACK,
  assertJsonPostgresRehearsalBucketState,
  assertJsonPostgresRehearsalEniAuthority,
  assertJsonPostgresRehearsalLambda,
  assertJsonPostgresRehearsalStack,
  createJsonPostgresImmutableInputLocator,
} from "./lib/json-postgres-rehearsal-execution.mjs";
import {
  assertJsonPostgresRehearsalProgramCaller,
  createJsonPostgresRehearsalLocatorSet,
  createJsonPostgresRehearsalProgramEvent,
  jsonPostgresRehearsalProfileForMode,
  validateJsonPostgresRehearsalExecutionEvidence,
  validateJsonPostgresRehearsalLocatorSet,
  validateJsonPostgresRehearsalProgramResponse,
  validateJsonPostgresRehearsalValidationEvidence,
} from "./lib/json-postgres-rehearsal-program.mjs";
import {
  assertPrivateStagingBudget,
  assertPrivateStagingRds,
} from "./lib/private-staging-aws-execution.mjs";
import {
  createPrivateProgramOutputDirectory,
  readPrivateProgramBytes,
  readPrivateProgramJson,
  sha256ProgramBytes,
  writePrivateProgramJson,
} from "./lib/json-postgres-program-files.mjs";

const OPERATIONS = new Set(["prepare", "invoke"]);
const SHA256 = /^[0-9a-f]{64}$/u;
const INPUTS = Object.freeze([
  ["authority_summary", "--authority-summary", "application/json"],
  ["base_manifest", "--base-manifest", "application/json"],
  ["record_type_catalog", "--catalog", "application/json"],
  ["inventory", "--inventory", "application/json"],
  ["authority_decisions", "--decisions", "application/json"],
  ["record_authority", "--record-authority", "application/json"],
  ["migration_corpus", "--corpus", "application/json"],
  [
    "source_transform_result",
    "--source-transform-result",
    "application/json",
  ],
  ["dms_manifest", "--dms-manifest", "application/json"],
]);

function parse(argv) {
  const values = {};
  const predecessors = [];
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (!flag?.startsWith("--") || !value || value.startsWith("--")) {
      throw new TypeError(`invalid option: ${flag ?? ""}`);
    }
    if (flag === "--predecessor") {
      predecessors.push(value);
    } else {
      if (values[flag] != null) {
        throw new TypeError(`duplicate option: ${flag}`);
      }
      values[flag] = value;
    }
  }
  return Object.freeze({ values, predecessors });
}

function required(value, name) {
  if (!value) throw new TypeError(`${name} is required`);
  return value;
}

function git(...args) {
  return execFileSync("git", args, {
    cwd: process.cwd(),
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  }).trim();
}

function parameterMap(stack) {
  return Object.fromEntries(
    (stack?.Parameters ?? []).map(({ ParameterKey, ParameterValue }) => [
      ParameterKey,
      ParameterValue,
    ]),
  );
}

function outputMap(stack) {
  return Object.fromEntries(
    (stack?.Outputs ?? []).map(({ OutputKey, OutputValue }) => [
      OutputKey,
      OutputValue,
    ]),
  );
}

const parsed = parse(process.argv.slice(2));
const option = (name, fallback = null) =>
  parsed.values[name] ?? fallback;
const operation = required(option("--operation"), "--operation");
if (!OPERATIONS.has(operation)) {
  throw new Error("unsupported W12 program operation");
}
const mode = operation === "invoke"
  ? required(option("--mode"), "--mode")
  : null;
const validationKind = option("--validation-kind");
const profile = option(
  "--profile",
  operation === "prepare"
    ? "matter-staging-admin"
    : jsonPostgresRehearsalProfileForMode(mode),
);

function awsArgs(args, { region = true } = {}) {
  return [
    ...args,
    "--profile", profile,
    ...(region ? ["--region", JSON_POSTGRES_REHEARSAL_REGION] : []),
    "--no-cli-pager",
    "--output", "json",
  ];
}

function awsJson(args, options = {}) {
  const output = execFileSync("aws", awsArgs(args, options), {
    cwd: process.cwd(),
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
  return output ? JSON.parse(output) : {};
}

function awsTryJson(args, options = {}) {
  const result = spawnSync("aws", awsArgs(args, options), {
    cwd: process.cwd(),
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
  if (result.status === 0) {
    return result.stdout.trim() ? JSON.parse(result.stdout) : {};
  }
  if (/(?:does not exist|not found|NoSuch|404|Not Found)/iu
    .test(result.stderr ?? "")) {
    return null;
  }
  throw new Error(
    `AWS read failed (${sha256ProgramBytes(result.stderr ?? "")
      .slice(0, 16)})`,
  );
}

function exactCleanHead(packetSource) {
  if (git("status", "--porcelain=v1", "--untracked-files=all")) {
    throw new Error(
      "W12 program execution requires a clean exact-head worktree",
    );
  }
  const sourceSha = git("rev-parse", "HEAD");
  const sourceTree = git("rev-parse", "HEAD^{tree}");
  const validated = validateJsonPostgresExecutionPacket(packetSource, {
    sourceSha,
    sourceTree,
    phase: "w12-real-data-rehearsal",
  });
  return Object.freeze({
    sourceSha,
    sourceTree,
    packet: Object.freeze({
      ...packetSource,
      packet_sha256: validated.packet_sha256,
    }),
  });
}

function bucketState(bucket, kmsKeyArn) {
  return assertJsonPostgresRehearsalBucketState({
    bucketName: bucket,
    expectedBucketName: bucket,
    expectedKmsKeyArn: kmsKeyArn,
    versioning: awsJson([
      "s3api", "get-bucket-versioning",
      "--bucket", bucket,
      "--expected-bucket-owner", JSON_POSTGRES_REHEARSAL_ACCOUNT,
    ]),
    publicAccess: awsJson([
      "s3api", "get-public-access-block",
      "--bucket", bucket,
      "--expected-bucket-owner", JSON_POSTGRES_REHEARSAL_ACCOUNT,
    ]),
    objectLock: awsJson([
      "s3api", "get-object-lock-configuration",
      "--bucket", bucket,
      "--expected-bucket-owner", JSON_POSTGRES_REHEARSAL_ACCOUNT,
    ]),
    encryption: awsJson([
      "s3api", "get-bucket-encryption",
      "--bucket", bucket,
      "--expected-bucket-owner", JSON_POSTGRES_REHEARSAL_ACCOUNT,
    ]),
  });
}

function runtimeState({ packet, approval }) {
  const stack = awsJson([
    "cloudformation",
    "describe-stacks",
    "--stack-name",
    JSON_POSTGRES_REHEARSAL_STACK,
  ]).Stacks?.[0];
  const parameters = parameterMap(stack);
  const outputs = outputMap(stack);
  assertJsonPostgresRehearsalStack(stack, {
    packet,
    artifactVersion: parameters.W12ArtifactVersion,
    trustRegistrySha256: approval.registry_sha256,
    approvalId: approval.approval_id,
    eniBootstrapEnabled: false,
  });
  const lambda = assertJsonPostgresRehearsalLambda(
    awsJson([
      "lambda",
      "get-function-configuration",
      "--function-name",
      JSON_POSTGRES_REHEARSAL_FUNCTION,
    ]),
    { packet, expectedVpcId: outputs.VpcId },
  );
  const policyNames = (awsJson([
    "iam",
    "list-role-policies",
    "--role-name",
    JSON_POSTGRES_REHEARSAL_ROLE,
  ], { region: false }).PolicyNames ?? []).sort();
  const policyDocuments = policyNames.map((policyName) =>
    awsJson([
      "iam",
      "get-role-policy",
      "--role-name",
      JSON_POSTGRES_REHEARSAL_ROLE,
      "--policy-name",
      policyName,
    ], { region: false }).PolicyDocument);
  const eni = assertJsonPostgresRehearsalEniAuthority({
    policyNames,
    policyDocuments,
  });
  const inputBucket = bucketState(
    packet.target.program_input_bucket_name,
    outputs.StagingKmsKeyArn,
  );
  const rds = assertPrivateStagingRds(awsJson([
    "rds",
    "describe-db-instances",
    "--db-instance-identifier",
    "lawos-private-staging-postgres",
  ]).DBInstances?.[0]);
  const budget = assertPrivateStagingBudget(awsJson([
    "budgets",
    "describe-budget",
    "--account-id",
    JSON_POSTGRES_REHEARSAL_ACCOUNT,
    "--budget-name",
    "lawos-private-staging-monthly",
  ], { region: false }).Budget);
  if (JSON_POSTGRES_REHEARSAL_MONTHLY_FORECAST_KRW
    > packet.target.monthly_cost_ceiling_krw) {
    throw new Error("W12 monthly forecast exceeds the approved ceiling");
  }
  return Object.freeze({
    kmsKeyArn: outputs.StagingKmsKeyArn,
    stack_status: stack.StackStatus,
    lambda,
    eni,
    input_bucket: inputBucket,
    rds,
    budget,
  });
}

function putImmutableObject({
  packet,
  retention,
  kind,
  category,
  path,
  contentType,
  kmsKeyArn,
} = {}) {
  const bytes = readPrivateProgramBytes(path, `W12 ${kind} input`);
  const digest = sha256ProgramBytes(bytes);
  const extension = contentType === "application/json" ? ".json" : ".bin";
  const key =
    `program-input/${packet.packet_sha256}/${category}/${kind}/`
    + `${digest}${extension}`;
  let head = awsTryJson([
    "s3api",
    "head-object",
    "--bucket", packet.target.program_input_bucket_name,
    "--key", key,
    "--expected-bucket-owner", JSON_POSTGRES_REHEARSAL_ACCOUNT,
    "--checksum-mode", "ENABLED",
  ]);
  let created = false;
  if (!head) {
    awsJson([
      "s3api",
      "put-object",
      "--bucket", packet.target.program_input_bucket_name,
      "--key", key,
      "--body", path,
      "--expected-bucket-owner", JSON_POSTGRES_REHEARSAL_ACCOUNT,
      "--content-type", contentType,
      "--server-side-encryption", "aws:kms",
      "--ssekms-key-id", kmsKeyArn,
      "--checksum-algorithm", "SHA256",
      "--checksum-sha256",
      Buffer.from(digest, "hex").toString("base64"),
      "--object-lock-mode", "COMPLIANCE",
      "--object-lock-retain-until-date",
      retention.contract.dms_retain_until,
      "--metadata",
      `sha256=${digest},source-sha=${packet.source_sha},source-tree=${packet.source_tree},packet-sha256=${packet.packet_sha256},input-kind=${kind}`,
      "--tagging",
      "environment=lawos-staging&program=lawos-private-rehearsal",
    ]);
    created = true;
    head = awsJson([
      "s3api",
      "head-object",
      "--bucket", packet.target.program_input_bucket_name,
      "--key", key,
      "--expected-bucket-owner", JSON_POSTGRES_REHEARSAL_ACCOUNT,
      "--checksum-mode", "ENABLED",
    ]);
  }
  if (!head.VersionId
    || head.VersionId === "null"
    || Number(head.ContentLength) !== bytes.byteLength
    || head.ServerSideEncryption !== "aws:kms"
    || head.SSEKMSKeyId !== kmsKeyArn
    || head.ChecksumSHA256
      !== Buffer.from(digest, "hex").toString("base64")
    || head.ObjectLockMode !== "COMPLIANCE"
    || Date.parse(head.ObjectLockRetainUntilDate)
      < Date.parse(retention.contract.dms_retain_until)
    || head.Metadata?.sha256 !== digest
    || head.Metadata?.["source-sha"] !== packet.source_sha
    || head.Metadata?.["source-tree"] !== packet.source_tree
    || head.Metadata?.["packet-sha256"] !== packet.packet_sha256
    || head.Metadata?.["input-kind"] !== kind) {
    throw new Error(`W12 immutable ${kind} upload drifted`);
  }
  return Object.freeze({
    locator: createJsonPostgresImmutableInputLocator({
      bucket: packet.target.program_input_bucket_name,
      key,
      versionId: head.VersionId,
      expectedBucketOwner: JSON_POSTGRES_REHEARSAL_ACCOUNT,
      sha256: digest,
      byteSize: bytes.byteLength,
    }),
    created,
  });
}

async function validateLocalMigrationInputs({ packet, paths }) {
  const authoritySummary = readPrivateProgramJson(
    paths.authority_summary,
    "W12 authority summary",
  );
  const baseManifest = readPrivateProgramJson(
    paths.base_manifest,
    "W12 base authority manifest",
  );
  const recordTypeCatalog = readPrivateProgramJson(
    paths.record_type_catalog,
    "W12 record-type catalog",
  );
  const inventory = readPrivateProgramJson(
    paths.inventory,
    "W12 source inventory",
  );
  const decisions = readPrivateProgramJson(
    paths.authority_decisions,
    "W12 authority decisions",
  );
  const recordAuthority = readPrivateProgramJson(
    paths.record_authority,
    "W12 record authority",
  );
  const corpus = readPrivateProgramJson(
    paths.migration_corpus,
    "W12 migration corpus",
  );
  const sourceTransformResult = readPrivateProgramJson(
    paths.source_transform_result,
    "W12 source transform result",
  );
  const transform = validateJsonPostgresSourceTransformResult(
    sourceTransformResult,
  );
  const authorityBundle = await createJsonPostgresAuthorityBundle({
    inventory,
    decisions,
    recordTypeCatalog,
    recordAuthority,
    corpus,
    baseManifest,
    sourceTransformResult,
  });
  const dmsManifest = prepareJsonPostgresDmsObjectManifest(
    readPrivateProgramJson(paths.dms_manifest, "W12 DMS manifest"),
  );
  if (authoritySummary.bundle_sha256
      !== authorityBundle.summary.bundle_sha256
    || authoritySummary.inventory_content_sha256
      !== packet.bindings.inventory_content_sha256
    || authoritySummary.record_type_catalog_sha256
      !== packet.bindings.record_type_catalog_sha256
    || authoritySummary.record_authority_sha256
      !== packet.bindings.record_authority_sha256
    || authoritySummary.authority_manifest_sha256
      !== packet.bindings.authority_manifest_sha256
    || authoritySummary.migration_manifest_sha256
      !== packet.bindings.migration_manifest_sha256
    || authoritySummary.transform_sha256
      !== packet.bindings.transform_sha256
    || transform.result_sha256 !== packet.bindings.transform_sha256
    || corpus.manifest_sha256 !== packet.bindings.migration_manifest_sha256
    || dmsManifest.manifest_sha256
      !== packet.bindings.dms_object_manifest_sha256
    || dmsManifest.authority_manifest_sha256
      !== packet.bindings.authority_manifest_sha256) {
    throw new Error("W12 local migration input binding drifted");
  }
  return Object.freeze({
    authority_bundle_sha256: authorityBundle.summary.bundle_sha256,
    dms_manifest_sha256: dmsManifest.manifest_sha256,
    source_object_count: dmsManifest.objects.length,
  });
}

const packetPath = required(option("--packet"), "--packet");
const packetSource = readPrivateProgramJson(
  packetPath,
  "W12 execution packet",
);
const exact = exactCleanHead(packetSource);
const packet = exact.packet;
const registryPath = required(option("--registry"), "--registry");
const registrySha256 = required(
  option("--registry-sha256"),
  "--registry-sha256",
);
if (!SHA256.test(registrySha256)) {
  throw new Error("W12 trust-registry SHA-256 is invalid");
}
const approvalPath = required(option("--approval"), "--approval");
const approvalSignaturePath = required(
  option("--approval-signature"),
  "--approval-signature",
);
const approvalSignature = readPrivateProgramBytes(
  approvalSignaturePath,
  "W12 execution approval signature",
);
if (sha256ProgramBytes(approvalSignature)
  !== sha256ProgramBytes(readPrivateProgramBytes(
    `${approvalPath}.sig`,
    "W12 default execution approval signature",
  ))) {
  throw new Error("W12 approval signature path drifted");
}
const approval = verifyJsonPostgresExecutionApproval({
  packet: packetSource,
  sourceSha: exact.sourceSha,
  sourceTree: exact.sourceTree,
  trustRegistryPath: registryPath,
  trustRegistrySha256: registrySha256,
  approvalReceiptPath: approvalPath,
});
const trustRegistry = readPrivateProgramJson(
  registryPath,
  "W12 owner trust registry",
);
const caller = assertJsonPostgresRehearsalProgramCaller(
  awsJson(["sts", "get-caller-identity"]),
  {
    profile,
    mode,
    prepare: operation === "prepare",
  },
);
const runtime = runtimeState({ packet, approval });
const evidenceDir = createPrivateProgramOutputDirectory(
  required(option("--evidence-dir"), "--evidence-dir"),
);

let result;
if (operation === "prepare") {
  const retention = validateJsonPostgresRehearsalBackupRetentionContract(
    readPrivateProgramJson(
      required(
        option("--backup-retention-contract"),
        "--backup-retention-contract",
      ),
      "W12 backup and retention contract",
    ),
  );
  if (retention.contract_sha256
      !== packet.bindings.backup_retention_contract_sha256
    || Date.parse(retention.contract.dms_retain_until) <= Date.now()) {
    throw new Error("W12 backup and retention contract drifted");
  }
  const paths = Object.fromEntries(INPUTS.map(([key, flag]) => [
    key,
    required(option(flag), flag),
  ]));
  const local = await validateLocalMigrationInputs({ packet, paths });
  const uploads = [];
  const upload = (parameters) => {
    const value = putImmutableObject({
      packet,
      retention,
      kmsKeyArn: runtime.kmsKeyArn,
      ...parameters,
    });
    uploads.push(value);
    return value.locator;
  };
  const authorization = {
    packet: upload({
      kind: "packet",
      category: "authorization",
      path: packetPath,
      contentType: "application/json",
    }),
    trust_registry: upload({
      kind: "trust-registry",
      category: "authorization",
      path: registryPath,
      contentType: "application/json",
    }),
    approval_receipt: upload({
      kind: "approval-receipt",
      category: "authorization",
      path: approvalPath,
      contentType: "application/json",
    }),
    approval_signature: upload({
      kind: "approval-signature",
      category: "authorization",
      path: approvalSignaturePath,
      contentType: "application/octet-stream",
    }),
  };
  const inputs = Object.fromEntries(INPUTS.map(
    ([key, , contentType]) => [key, upload({
      kind: key.replaceAll("_", "-"),
      category: "migration",
      path: paths[key],
      contentType,
    })],
  ));
  for (const [key, flag] of [
    ["checkpoint", "--checkpoint"],
    ["dms_checkpoint", "--dms-checkpoint"],
  ]) {
    if (option(flag)) {
      inputs[key] = upload({
        kind: key.replaceAll("_", "-"),
        category: "checkpoint",
        path: option(flag),
        contentType: "application/json",
      });
    }
  }
  const predecessors = parsed.predecessors.map((path, index) => {
    const receipt = readPrivateProgramJson(
      path,
      `W12 predecessor ${index + 1}`,
    );
    const signaturePath = `${path}.sig`;
    const signature = readPrivateProgramBytes(
      signaturePath,
      `W12 predecessor signature ${index + 1}`,
    );
    const verified = verifyJsonPostgresProgramReceipt({
      receipt,
      signature,
      trustRegistry,
      expected: {
        sourceSha: packet.source_sha,
        sourceTree: packet.source_tree,
        packetSha256: packet.packet_sha256,
      },
    });
    if (verified.execution_state !== "PASS") {
      throw new Error("W12 predecessor receipt is not PASS");
    }
    const receiptKind =
      `${String(index + 1).padStart(2, "0")}-${verified.receipt_kind}`;
    return {
      receipt: upload({
        kind: `${receiptKind}-receipt`,
        category: "predecessor",
        path,
        contentType: "application/json",
      }),
      signature: upload({
        kind: `${receiptKind}-signature`,
        category: "predecessor",
        path: signaturePath,
        contentType: "application/octet-stream",
      }),
    };
  });
  const locatorSet = createJsonPostgresRehearsalLocatorSet({
    packet,
    authorization,
    inputs,
    predecessors,
  });
  const locatorOutput = writePrivateProgramJson(
    join(evidenceDir, "program-locator-set.json"),
    locatorSet,
  );
  result = {
    schema_version:
      "law-firm-os.json-postgres-rehearsal-program-operation.v1",
    operation,
    outcome: "PASS",
    source_sha: packet.source_sha,
    source_tree: packet.source_tree,
    packet_sha256: packet.packet_sha256,
    profile: caller.role,
    locator_set_sha256: locatorSet.locator_set_sha256,
    locator_set_file_sha256: locatorOutput.sha256,
    immutable_input_count: uploads.length,
    immutable_input_created_count:
      uploads.filter((item) => item.created).length,
    predecessor_receipt_count: predecessors.length,
    authority_bundle_sha256: local.authority_bundle_sha256,
    dms_manifest_sha256: local.dms_manifest_sha256,
    dms_source_object_count: local.source_object_count,
    temporary_eni_allow_count: runtime.eni.temporary_eni_allow_count,
    public_resource_count: 0,
    monthly_cost_forecast_krw:
      JSON_POSTGRES_REHEARSAL_MONTHLY_FORECAST_KRW,
    production_write_count: 0,
    external_email_send_count: 0,
    raw_pii_evidence_count: 0,
    secret_material_recorded: false,
  };
} else {
  const locatorSet = readPrivateProgramJson(
    required(option("--locator-set"), "--locator-set"),
    "W12 immutable locator set",
  );
  validateJsonPostgresRehearsalLocatorSet(locatorSet, { packet });
  const event = createJsonPostgresRehearsalProgramEvent({
    packet,
    locatorSet,
    mode,
    attemptRef: required(option("--attempt-ref"), "--attempt-ref"),
    negativeTenantId: option("--negative-tenant-id"),
    validationKind,
  });
  const eventOutput = writePrivateProgramJson(
    join(evidenceDir, "program-event.json"),
    event,
  );
  const responsePath = join(evidenceDir, "lambda-response.json");
  const invocation = awsJson([
    "lambda",
    "invoke",
    "--function-name",
    JSON_POSTGRES_REHEARSAL_FUNCTION,
    "--invocation-type",
    "RequestResponse",
    "--cli-binary-format",
    "raw-in-base64-out",
    "--payload",
    `fileb://${eventOutput.path}`,
    responsePath,
  ]);
  if (!existsSync(responsePath)) {
    throw new Error("W12 Lambda response file is absent");
  }
  chmodSync(responsePath, 0o600);
  const responseBytes = readFileSync(responsePath);
  if (invocation.FunctionError) {
    throw new Error(
      `W12 Lambda invocation failed (${sha256ProgramBytes(responseBytes)
        .slice(0, 16)})`,
    );
  }
  let response;
  try {
    response = JSON.parse(responseBytes);
  } catch {
    throw new Error("W12 Lambda response is not JSON");
  }
  validateJsonPostgresRehearsalProgramResponse(response, {
    packet,
    mode,
    validationKind,
  });
  const evidenceKey =
    `program-execution/${packet.packet_sha256}/${event.attempt_ref}/`
    + `execution-result-${response.execution_evidence_sha256}.json`;
  const head = awsJson([
    "s3api",
    "head-object",
    "--bucket",
    JSON_POSTGRES_REHEARSAL_PROGRAM_INPUT_BUCKET,
    "--key",
    evidenceKey,
    "--expected-bucket-owner",
    JSON_POSTGRES_REHEARSAL_ACCOUNT,
    "--checksum-mode",
    "ENABLED",
  ]);
  if (!head.VersionId
    || head.VersionId === "null"
    || head.ServerSideEncryption !== "aws:kms"
    || head.SSEKMSKeyId !== runtime.kmsKeyArn
    || head.ObjectLockMode !== "COMPLIANCE"
    || Date.parse(head.ObjectLockRetainUntilDate)
      < Date.now() + 364 * 24 * 60 * 60 * 1000) {
    throw new Error("W12 immutable execution evidence governance drifted");
  }
  const executionEvidencePath =
    join(evidenceDir, "execution-evidence.json");
  const downloaded = awsJson([
    "s3api",
    "get-object",
    "--bucket",
    JSON_POSTGRES_REHEARSAL_PROGRAM_INPUT_BUCKET,
    "--key",
    evidenceKey,
    "--version-id",
    head.VersionId,
    "--expected-bucket-owner",
    JSON_POSTGRES_REHEARSAL_ACCOUNT,
    "--checksum-mode",
    "ENABLED",
    executionEvidencePath,
  ]);
  chmodSync(executionEvidencePath, 0o600);
  const executionEvidenceBytes = readFileSync(executionEvidencePath);
  if (downloaded.VersionId !== head.VersionId
    || executionEvidenceBytes.byteLength !== Number(head.ContentLength)
    || sha256ProgramBytes(executionEvidenceBytes)
      !== response.execution_evidence_sha256) {
    throw new Error("W12 immutable execution evidence content drifted");
  }
  const executionEvidence = JSON.parse(executionEvidenceBytes);
  validateJsonPostgresRehearsalExecutionEvidence(executionEvidence, {
    packet,
    mode,
    response,
  });
  let validationEvidence = null;
  let validationEvidenceBytes = null;
  if (validationKind) {
    const validationKey =
      `program-execution/${packet.packet_sha256}/${event.attempt_ref}/`
      + `w12-${validationKind}-`
      + `${response.rehearsal_validation_evidence_sha256}.json`;
    const validationHead = awsJson([
      "s3api",
      "head-object",
      "--bucket",
      JSON_POSTGRES_REHEARSAL_PROGRAM_INPUT_BUCKET,
      "--key",
      validationKey,
      "--expected-bucket-owner",
      JSON_POSTGRES_REHEARSAL_ACCOUNT,
      "--checksum-mode",
      "ENABLED",
    ]);
    if (!validationHead.VersionId
      || validationHead.VersionId === "null"
      || validationHead.ServerSideEncryption !== "aws:kms"
      || validationHead.SSEKMSKeyId !== runtime.kmsKeyArn
      || validationHead.ObjectLockMode !== "COMPLIANCE"
      || Date.parse(validationHead.ObjectLockRetainUntilDate)
        < Date.now() + 364 * 24 * 60 * 60 * 1000) {
      throw new Error(
        "W12 immutable rehearsal validation governance drifted",
      );
    }
    const validationEvidencePath = join(
      evidenceDir,
      `${validationKind}-evidence.json`,
    );
    const downloadedValidation = awsJson([
      "s3api",
      "get-object",
      "--bucket",
      JSON_POSTGRES_REHEARSAL_PROGRAM_INPUT_BUCKET,
      "--key",
      validationKey,
      "--version-id",
      validationHead.VersionId,
      "--expected-bucket-owner",
      JSON_POSTGRES_REHEARSAL_ACCOUNT,
      "--checksum-mode",
      "ENABLED",
      validationEvidencePath,
    ]);
    chmodSync(validationEvidencePath, 0o600);
    validationEvidenceBytes = readFileSync(validationEvidencePath);
    if (downloadedValidation.VersionId !== validationHead.VersionId
      || validationEvidenceBytes.byteLength
        !== Number(validationHead.ContentLength)
      || sha256ProgramBytes(validationEvidenceBytes)
        !== response.rehearsal_validation_evidence_sha256) {
      throw new Error(
        "W12 immutable rehearsal validation content drifted",
      );
    }
    validationEvidence = JSON.parse(validationEvidenceBytes);
    validateJsonPostgresRehearsalValidationEvidence(
      validationEvidence,
      {
        packet,
        validationKind,
        response,
      },
    );
  }
  result = {
    schema_version:
      "law-firm-os.json-postgres-rehearsal-program-operation.v1",
    operation,
    mode,
    outcome: "PASS",
    source_sha: packet.source_sha,
    source_tree: packet.source_tree,
    packet_sha256: packet.packet_sha256,
    profile: caller.role,
    locator_set_sha256: locatorSet.locator_set_sha256,
    result_sha256: response.result_sha256,
    execution_evidence_sha256: response.execution_evidence_sha256,
    response_file_sha256: sha256ProgramBytes(responseBytes),
    execution_evidence_file_sha256:
      sha256ProgramBytes(executionEvidenceBytes),
    ...(validationEvidence ? {
      rehearsal_validation_kind: validationKind,
      rehearsal_validation_result_sha256:
        validationEvidence.result_sha256,
      rehearsal_validation_evidence_sha256:
        response.rehearsal_validation_evidence_sha256,
      rehearsal_validation_evidence_file_sha256:
        sha256ProgramBytes(validationEvidenceBytes),
    } : {}),
    safe_counts: response.safe_counts,
    claims: response.claims,
    first_write_state: response.first_write_state,
    temporary_eni_allow_count: runtime.eni.temporary_eni_allow_count,
    public_resource_count: 0,
    monthly_cost_forecast_krw:
      JSON_POSTGRES_REHEARSAL_MONTHLY_FORECAST_KRW,
    production_write_count: 0,
    external_email_send_count: 0,
    raw_pii_evidence_count: 0,
    secret_material_recorded: false,
  };
}

const resultOutput = writePrivateProgramJson(
  join(evidenceDir, `${operation}-result.json`),
  result,
);
process.stdout.write(`${JSON.stringify({
  verdict: "PASS",
  operation,
  mode,
  source_sha: packet.source_sha,
  source_tree: packet.source_tree,
  packet_sha256: packet.packet_sha256,
  result_path: resultOutput.path,
  result_file_sha256: resultOutput.sha256,
}, null, 2)}\n`);
