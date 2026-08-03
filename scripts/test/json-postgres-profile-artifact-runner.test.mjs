import { execFileSync, spawnSync } from "node:child_process";
import {
  chmodSync,
  copyFileSync,
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createHash,
  generateKeyPairSync,
  sign,
} from "node:crypto";
import assert from "node:assert/strict";
import test from "node:test";
import {
  buildJsonPostgresProductionArtifactStoreTemplate,
  buildJsonPostgresProductionTemplate,
  validateJsonPostgresProductionTemplate,
} from "../lib/json-postgres-production-infrastructure.mjs";
import {
  createJsonPostgresExecutionPacket,
  validateJsonPostgresExecutionPacket,
} from "../lib/json-postgres-execution-contract.mjs";
import {
  JSON_POSTGRES_PROFILE_ARTIFACT_PROMOTE_AUTHORITY_ACTION,
  JSON_POSTGRES_PROFILE_ARTIFACT_PROMOTE_AUTHORITY_ENVIRONMENT,
  JSON_POSTGRES_PROFILE_ARTIFACT_PROMOTE_AUTHORITY_ROLE,
  JSON_POSTGRES_PROFILE_ARTIFACT_PROMOTE_AUTHORITY_VERSION,
  jsonPostgresProductionCombinedTemplateSha256,
  jsonPostgresProductionInfrastructureResultSha256,
} from "../lib/json-postgres-production-execution.mjs";
import {
  canonicalizeJson,
} from "../lib/runtime-safety-approval-contract.mjs";
import {
  JSON_POSTGRES_INVENTORY_DELTA_POLICY_SHA256,
} from "../../packages/persistence/src/postgres/source-authority-manifest.js";

const REPOSITORY_ROOT = realpathSync(
  fileURLToPath(new URL("../../", import.meta.url)),
);
const AUTHORITY_RUNNER = join(
  REPOSITORY_ROOT,
  "scripts/run-json-postgres-production-infrastructure.mjs",
);
const ACCOUNT = "770880870480";
const ARTIFACT_BUCKET = `lawos-prod-artifacts-${ACCOUNT}`;
const PROGRAM_INPUT_BUCKET = `lawos-prod-program-input-${ACCOUNT}`;
const DMS_BUCKET = `lawos-prod-dms-${ACCOUNT}`;
const KMS_ARN =
  `arn:aws:kms:ap-northeast-2:${ACCOUNT}:key/profile-artifact-test`;

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function privateFile(path, bytes) {
  writeFileSync(path, bytes, { mode: 0o600 });
  chmodSync(path, 0o600);
  return path;
}

function privateJson(path, value) {
  return privateFile(path, `${JSON.stringify(value, null, 2)}\n`);
}

function copyRunnerRepository(worktree) {
  mkdirSync(join(worktree, "scripts"), { recursive: true });
  mkdirSync(join(worktree, "apps/api/src"), { recursive: true });
  mkdirSync(join(worktree, "packages"), { recursive: true });
  mkdirSync(join(worktree, "infra/lawos-production"), { recursive: true });
  copyFileSync(
    join(REPOSITORY_ROOT, "scripts/run-json-postgres-production-infrastructure.mjs"),
    join(worktree, "scripts/run-json-postgres-production-infrastructure.mjs"),
  );
  copyFileSync(
    join(REPOSITORY_ROOT, "scripts/validate-profile-photo-replacement-manifest.mjs"),
    join(worktree, "scripts/validate-profile-photo-replacement-manifest.mjs"),
  );
  cpSync(
    join(REPOSITORY_ROOT, "scripts/lib"),
    join(worktree, "scripts/lib"),
    { recursive: true },
  );
  for (const packageName of ["persistence", "runtime-auth"]) {
    cpSync(
      join(REPOSITORY_ROOT, "packages", packageName),
      join(worktree, "packages", packageName),
      { recursive: true },
    );
  }
  copyFileSync(
    join(REPOSITORY_ROOT, "apps/api/src/immutable-program-input.js"),
    join(worktree, "apps/api/src/immutable-program-input.js"),
  );
  copyFileSync(
    join(REPOSITORY_ROOT, "apps/api/src/hrx-role-scope-matrix.js"),
    join(worktree, "apps/api/src/hrx-role-scope-matrix.js"),
  );
  copyFileSync(
    join(REPOSITORY_ROOT, "package.json"),
    join(worktree, "package.json"),
  );
  copyFileSync(
    join(REPOSITORY_ROOT, "infra/lawos-production/cost-estimate.json"),
    join(worktree, "infra/lawos-production/cost-estimate.json"),
  );
  symlinkSync(
    join(REPOSITORY_ROOT, "node_modules"),
    join(worktree, "node_modules"),
    "dir",
  );
}

function parameterMap(stack) {
  return Object.fromEntries(stack.Parameters.map((entry) => [
    entry.ParameterKey,
    entry.ParameterValue,
  ]));
}

function profileManifest({
  sourceSha,
  sourceTree,
  artifactSha256,
  privateManifestSha256,
  artifactFilename,
}) {
  return {
    schema_version: "law-firm-os.json-postgres-production-artifact.v2",
    source_sha: sourceSha,
    source_tree: sourceTree,
    data_scope: "approved-immutable-inputs-only",
    operational_authority: "postgres-v2",
    json_fallback: false,
    json_writer: false,
    dual_write: false,
    file_current_authority: false,
    offline_mutation: false,
    memory_fallback: false,
    packaged_real_identity_count: 0,
    packaged_real_client_count: 0,
    packaged_static_role_assignment_count: 0,
    packaged_private_profile_photo_count: 10,
    secrets_in_environment: false,
    production_ready_claim: false,
    profile_photo_artifact: {
      metadata_path:
        "apps/api/src/hrx-member-photo-artifact-metadata.json",
      metadata_schema_version:
        "law-firm-os.profile-photo-artifact-metadata.v1",
      metadata_sha256: sha256(`metadata:${privateManifestSha256}`),
      generation_ref:
        `profile_generation_${privateManifestSha256.slice(0, 32)}`,
      private_manifest_schema_version:
        "law-firm-os.profile-photo-replacement-manifest.v2",
      private_manifest_sha256: privateManifestSha256,
      private_manifest_entry_count: 10,
      injected_photo_entry_count: 10,
      git_source_photo_entry_count: 0,
    },
    artifact_sha256: artifactSha256,
    artifact_filename: artifactFilename,
  };
}

function packetBindings({
  artifactSha256,
  artifactManifestSha256,
  combinedTemplateSha256,
}) {
  const digest = "d".repeat(64);
  const values = Object.fromEntries([
    "artifact_sha256",
    "artifact_manifest_sha256",
    "lockfile_sha256",
    "migration_catalog_sha256",
    "record_type_catalog_sha256",
    "record_authority_sha256",
    "field_crosswalk_sha256",
    "authority_manifest_sha256",
    "authority_bundle_sha256",
    "migration_manifest_sha256",
    "dms_object_manifest_sha256",
    "inventory_content_sha256",
    "inventory_delta_policy_sha256",
    "transform_sha256",
    "infrastructure_template_sha256",
    "dms_provider_contract_sha256",
    "backup_retention_contract_sha256",
    "performance_acceptance_sha256",
    "post_write_runbook_sha256",
    "w12_terminal_receipt_sha256",
    "cut012_terminal_receipt_sha256",
    "go_live_receipt_sha256",
  ].map((key) => [key, digest]));
  return {
    ...values,
    artifact_sha256: artifactSha256,
    artifact_manifest_sha256: artifactManifestSha256,
    inventory_delta_policy_sha256:
      JSON_POSTGRES_INVENTORY_DELTA_POLICY_SHA256,
    infrastructure_template_sha256: combinedTemplateSha256,
    cut012_terminal_receipt_sha256: "0".repeat(64),
    go_live_receipt_sha256: "0".repeat(64),
  };
}

function productionTarget() {
  return {
    target_ref: "lawos-production",
    aws_account: ACCOUNT,
    aws_region: "ap-northeast-2",
    artifact_bucket_ref: "bucket:lawos-prod-artifacts",
    artifact_bucket_name: ARTIFACT_BUCKET,
    artifact_expected_bucket_owner: ACCOUNT,
    artifact_kms_key_ref: "alias/lawos-prod-artifacts",
    artifact_object_lock_enabled: true,
    artifact_versioning_enabled: true,
    artifact_public_access_blocked: true,
    database_secret_ref: "secret:lawos-prod-db",
    tenant_context_secret_ref: "secret:lawos-prod-tenant-context",
    dms_bucket_ref: "bucket:lawos-prod-dms",
    dms_bucket_name: DMS_BUCKET,
    dms_prefix: "approved-real-migration",
    dms_kms_key_ref: "alias/lawos-prod-dms",
    dms_expected_bucket_owner: ACCOUNT,
    dms_default_retention_days: 365,
    dms_object_lock_enabled: true,
    dms_versioning_enabled: true,
    dms_public_access_blocked: true,
    program_input_bucket_ref: "bucket:lawos-prod-program-input",
    program_input_bucket_name: PROGRAM_INPUT_BUCKET,
    program_input_expected_bucket_owner: ACCOUNT,
    program_input_kms_key_ref: "alias/lawos-prod-program-input",
    program_input_object_lock_enabled: true,
    program_input_versioning_enabled: true,
    program_input_public_access_blocked: true,
    approved_tenant_ids: ["tenant_amic"],
    backup_target_ref: "backup:lawos-prod",
    isolated: false,
    production: true,
    public_access: false,
    tls_mode: "verify-full",
    monthly_cost_ceiling_krw: 300000,
  };
}

function signedPacket({
  root,
  id,
  approvalId = `profile-artifact-approval-${id}`,
  sourceSha,
  sourceTree,
  bindings,
}) {
  const built = createJsonPostgresExecutionPacket({
    packetId: `lawos-profile-artifact-${id}`,
    sourceSha,
    sourceTree,
    phase: "w13-production-cutover",
    bindings,
    target: productionTarget(),
  });
  const validated = validateJsonPostgresExecutionPacket(built.packet, {
    sourceSha,
    sourceTree,
    phase: "w13-production-cutover",
  });
  const approvalKey = generateKeyPairSync("ed25519");
  const receiptAuthorityKey = generateKeyPairSync("ed25519");
  const now = Date.now();
  const approvalKeyId = `owner-key-${id}`;
  const receiptAuthorityKeyId = `profile-artifact-receipt-attestor-${id}`;
  const registry = {
    schema_version: "law-firm-os.runtime-safety.approval-trust-registry.v1",
    generated_at: new Date(now - 60_000).toISOString(),
    keys: [{
      key_id: approvalKeyId,
      algorithm: "Ed25519",
      public_key_spki_pem:
        approvalKey.publicKey.export({ type: "spki", format: "pem" }),
      roles: ["owner"],
      actions: [validated.action],
      environments: [validated.environment],
      valid_from: new Date(now - 86_400_000).toISOString(),
      valid_until: new Date(now + 86_400_000).toISOString(),
      revoked_at: null,
    }, {
      key_id: receiptAuthorityKeyId,
      algorithm: "Ed25519",
      public_key_spki_pem: receiptAuthorityKey.publicKey.export({
        type: "spki",
        format: "pem",
      }),
      roles: [JSON_POSTGRES_PROFILE_ARTIFACT_PROMOTE_AUTHORITY_ROLE],
      actions: [JSON_POSTGRES_PROFILE_ARTIFACT_PROMOTE_AUTHORITY_ACTION],
      environments: [
        JSON_POSTGRES_PROFILE_ARTIFACT_PROMOTE_AUTHORITY_ENVIRONMENT,
      ],
      valid_from: new Date(now - 86_400_000).toISOString(),
      valid_until: new Date(now + 86_400_000).toISOString(),
      revoked_at: null,
    }],
  };
  const approval = {
    schema_version: "law-firm-os.runtime-safety.approval.v1",
    approval_id: approvalId,
    key_id: approvalKeyId,
    role: "owner",
    decision: "approved",
    packet_sha256: validated.packet_sha256,
    source_sha: sourceSha,
    source_tree: sourceTree,
    action: validated.action,
    environment: validated.environment,
    signed_at: new Date(now - 30_000).toISOString(),
    expires_at: new Date(now + 3_600_000).toISOString(),
    data_scope: [
      "approved-real-manifest",
      `authority-manifest:${built.packet.bindings.authority_manifest_sha256}`,
      `inventory:${built.packet.bindings.inventory_content_sha256}`,
      `inventory-delta-policy:${built.packet.bindings.inventory_delta_policy_sha256}`,
    ],
    contact_scope: built.packet.contact_scope,
  };
  const packetPath = privateJson(join(root, `packet-${id}.json`), built.packet);
  const registryBytes = `${JSON.stringify(registry, null, 2)}\n`;
  const registryPath = privateFile(
    join(root, `registry-${id}.json`),
    registryBytes,
  );
  const approvalPath = privateJson(
    join(root, `approval-${id}.json`),
    approval,
  );
  privateFile(
    `${approvalPath}.sig`,
    sign(
      null,
      Buffer.from(canonicalizeJson(approval)),
      approvalKey.privateKey,
    ),
  );
  return {
    packet: built.packet,
    packetSha256: validated.packet_sha256,
    packetPath,
    registryPath,
    registrySha256: sha256(registryBytes),
    approvalPath,
    approvalSigner: {
      keyId: approvalKeyId,
      privateKey: approvalKey.privateKey,
      publicKey: approvalKey.publicKey,
    },
    receiptAuthoritySigner: {
      keyId: receiptAuthorityKeyId,
      privateKey: receiptAuthorityKey.privateKey,
      publicKey: receiptAuthorityKey.publicKey,
    },
  };
}

function signedPromoteReceiptAuthority({
  root,
  name,
  receiptPath,
  receipt,
  packet,
  signer = packet.receiptAuthoritySigner,
  trustRegistrySha256 = packet.registrySha256,
  mutate = () => {},
}) {
  const receiptBytes = readFileSync(receiptPath);
  const authority = {
    schema_version:
      JSON_POSTGRES_PROFILE_ARTIFACT_PROMOTE_AUTHORITY_VERSION,
    action: JSON_POSTGRES_PROFILE_ARTIFACT_PROMOTE_AUTHORITY_ACTION,
    environment:
      JSON_POSTGRES_PROFILE_ARTIFACT_PROMOTE_AUTHORITY_ENVIRONMENT,
    receipt_bytes_sha256: sha256(receiptBytes),
    receipt_result_sha256: receipt.result_sha256,
    trust_registry_sha256: trustRegistrySha256,
    source_sha: packet.packet.source_sha,
    source_tree: packet.packet.source_tree,
    signer_key_id: signer.keyId,
    signer_fingerprint_sha256: sha256(signer.publicKey.export({
      type: "spki",
      format: "der",
    })),
    signed_at: new Date().toISOString(),
  };
  mutate(authority);
  const authorityPath = privateJson(
    join(root, `${name}-authority.json`),
    authority,
  );
  const signaturePath = privateFile(
    join(root, `${name}-authority.sig`),
    sign(
      null,
      Buffer.from(canonicalizeJson(authority)),
      signer.privateKey,
    ),
  );
  return { authority, authorityPath, signaturePath };
}

function executionInput(path, runtimeGeneration, attemptRef) {
  return privateJson(path, {
    schema_version:
      "law-firm-os.json-postgres-production-infrastructure-input.v1",
    attempt_ref: attemptRef,
    owner: "lawos-owner",
    review_date: "2026-08-01",
    expiration_date: "2027-08-01",
    allowed_origins: ["https://lawos.example"],
    password_reset_ses_identity_arn:
      `arn:aws:ses:ap-northeast-2:${ACCOUNT}:identity/lawos.example`,
    password_reset_from_email: "no-reply@lawos.example",
    primary_tenant_id: "tenant_amic",
    runtime_generation: runtimeGeneration,
    projection_worker_event_json: "{}",
  });
}

function uploadReceipt({
  sourceSha,
  sourceTree,
  packetSha256,
  artifactSha256,
  artifactPath,
  artifactVersion,
  templateRawSha256,
}) {
  const receipt = {
    schema_version:
      "law-firm-os.json-postgres-production-artifact-upload.v1",
    operation: "upload-artifact",
    outcome: "PASS",
    source_sha: sourceSha,
    source_tree: sourceTree,
    packet_sha256: packetSha256,
    artifact_sha256: artifactSha256,
    artifact_key:
      `lawos-production/${sourceSha}/${artifactSha256}.zip`,
    artifact_version: artifactVersion,
    artifact_byte_size: readFileSync(artifactPath).byteLength,
    object_lock_mode: "COMPLIANCE",
    cloudformation_template: {
      sha256: templateRawSha256,
      version_id: "template-version-1",
      template_url:
        `https://${ARTIFACT_BUCKET}.s3.ap-northeast-2.amazonaws.com/`
        + "cloudformation-template/exact.json?versionId=template-version-1",
    },
    production_write_count: 0,
  };
  return {
    ...receipt,
    result_sha256:
      jsonPostgresProductionInfrastructureResultSha256(receipt),
  };
}

function stackParameters({
  sourceSha,
  sourceTree,
  artifactSha256,
  artifactVersion,
  executionPacketSha256,
  runtimeGeneration,
}) {
  const workerDigest = "4".repeat(64);
  const workerEvent = {
    schema_version: "law-firm-os.immutable-program-input-locator.v1",
    bucket: PROGRAM_INPUT_BUCKET,
    key:
      `program-input/${executionPacketSha256}/w15-worker-event/`
      + `${sourceSha}/${workerDigest}.json`,
    version_id: "worker-event-version-1",
    expected_bucket_owner: ACCOUNT,
    sha256: workerDigest,
    byte_size: 512,
  };
  const parameters = {
    ArtifactBucket: ARTIFACT_BUCKET,
    ArtifactKey:
      `lawos-production/${sourceSha}/${artifactSha256}.zip`,
    ArtifactVersion: artifactVersion,
    SourceSha: sourceSha,
    SourceTree: sourceTree,
    ArtifactSha256: artifactSha256,
    OwnerTrustRegistrySha256: "3".repeat(64),
    BootstrapApprovalId: "baseline-approval",
    Owner: "lawos-owner",
    ReviewDate: "2026-07-31",
    ExpirationDate: "2027-07-31",
    AllowedOrigins: "https://lawos.example",
    PasswordResetSesIdentityArn:
      `arn:aws:ses:ap-northeast-2:${ACCOUNT}:identity/lawos.example`,
    PasswordResetFromEmail: "no-reply@lawos.example",
    EnableLambdaEniBootstrap: "false",
    RuntimeGeneration: String(runtimeGeneration),
    ExecutionPacketSha256: executionPacketSha256,
    ProgramInputBucketName: PROGRAM_INPUT_BUCKET,
    DmsBucketName: DMS_BUCKET,
    PrimaryTenantId: "tenant_amic",
    EnableProductionTraffic: "true",
    EnableProjectionWorker: "true",
    ProjectionWorkerEventJson: JSON.stringify(workerEvent),
    HrxProjectionMappingObjectKey: "program-input/exact/mapping.json",
    HrxProjectionValidationObjectKey:
      "program-input/exact/validation.json",
    ProjectionWorkerLagThresholdMs: "24",
    MonthlyCostCeilingKrw: "300000",
  };
  return Object.entries(parameters).map(([ParameterKey, ParameterValue]) => ({
    ParameterKey,
    ParameterValue,
    UsePreviousValue: false,
  }));
}

function fakeAwsScript() {
  return `#!${process.execPath}
const fs = require("node:fs");
const statePath = process.env.FAKE_AWS_STATE;
const state = JSON.parse(fs.readFileSync(statePath, "utf8"));
const args = process.argv.slice(2);
const value = (name) => args[args.indexOf(name) + 1];
const save = () => fs.writeFileSync(statePath, JSON.stringify(state));
const out = (body) => process.stdout.write(JSON.stringify(body));
state.calls.push({ fake: true, args });
const service = args[0];
const command = args[1];
if (service === "sts" && command === "get-caller-identity") {
  save(); out({ Account: "${ACCOUNT}", Arn: "arn:aws:sts::${ACCOUNT}:assumed-role/matter-prod-deploy-admin/fake-test" });
} else if (service === "cloudformation" && command === "describe-stacks") {
  const name = value("--stack-name");
  save(); out({ Stacks: [name === "lawos-production-artifact-store"
    ? { StackStatus: "UPDATE_COMPLETE", Outputs: [{ OutputKey: "ArtifactKmsKeyArn", OutputValue: state.kmsArn }] }
    : state.stack] });
} else if (service === "s3api" && command === "head-object") {
  const object = state.objects[value("--key") + "|" + value("--version-id")];
  if (!object) { process.stderr.write("NoSuchKey"); process.exit(1); }
  save(); out(object);
} else if (service === "cloudformation" && command === "create-change-set") {
  const id = "fake-change-set-" + (++state.nextChangeSet);
  const parameters = JSON.parse(value("--parameters")).map((entry) => ({
    ...entry,
    UsePreviousValue: false,
  }));
  state.changeSets[id] = {
    StackName: value("--stack-name"), ChangeSetType: "UPDATE", ChangeSetId: id,
    Parameters: parameters,
    Changes: ["ApiFunction", "AdminFunction", "ProjectionAuditorFunction", "ProjectionWorkerFunction"].map((LogicalResourceId) => ({
      ResourceChange: { Action: "Modify", LogicalResourceId, ResourceType: "AWS::Lambda::Function", Replacement: "False", Scope: ["Properties"] },
    })),
  };
  state.mutations.push({ kind: "create-change-set", id });
  save(); out({ Id: id });
} else if (service === "cloudformation" && command === "describe-change-set") {
  const changeSet = state.changeSets[value("--change-set-name")];
  save(); out(changeSet);
} else if (service === "cloudformation" && command === "get-template") {
  save(); out({ TemplateBody: state.template });
} else if (service === "cloudformation" && command === "execute-change-set") {
  const id = value("--change-set-name");
  state.stack = { StackStatus: "UPDATE_COMPLETE", Parameters: state.changeSets[id].Parameters };
  state.mutations.push({ kind: "execute-change-set", id });
  save(); out({});
} else if (service === "cloudformation" && command === "wait") {
  save(); out({});
} else if (service === "iam" && command === "list-role-policies") {
  const role = value("--role-name");
  const policy = role.replace("-role", "-runtime");
  save(); out({ PolicyNames: [policy] });
} else if (service === "iam" && command === "get-role-policy") {
  save(); out({ PolicyDocument: { Statement: [{ Sid: "DenyFunctionCodeEc2Networking", Effect: "Deny", Resource: "*", Condition: { ArnEquals: { "lambda:SourceFunctionArn": "arn:aws:lambda:ap-northeast-2:${ACCOUNT}:function:fake" } } }] } });
} else if (service === "lambda" && command === "get-function-configuration") {
  const parameters = Object.fromEntries(state.stack.Parameters.map((entry) => [entry.ParameterKey, entry.ParameterValue]));
  const functionName = value("--function-name");
  const variables = {
    LAWOS_DEPLOYMENT_COMMIT: parameters.SourceSha,
    LAWOS_DEPLOYMENT_TREE: parameters.SourceTree,
    LAWOS_DEPLOYMENT_ARTIFACT_SHA256: parameters.ArtifactSha256,
    LAWOS_EXECUTION_PACKET_SHA256: parameters.ExecutionPacketSha256,
  };
  variables.LAWOS_RUNTIME_GENERATION = parameters.RuntimeGeneration;
  save(); out({ State: "Active", LastUpdateStatus: "Successful", CodeSha256: Buffer.from(parameters.ArtifactSha256, "hex").toString("base64"), Environment: { Variables: variables } });
} else if (service === "events" && command === "describe-rule") {
  const parameters = Object.fromEntries(state.stack.Parameters.map((entry) => [entry.ParameterKey, entry.ParameterValue]));
  const name = value("--name");
  save(); out({ State: name === "lawos-production-password-reset-worker" ? "ENABLED" : (parameters.EnableProjectionWorker === "true" ? "ENABLED" : "DISABLED") });
} else {
  process.stderr.write("unsupported fake AWS command: " + args.join(" "));
  process.exit(2);
}
`;
}

function runRunner({
  cwd,
  env,
  operation,
  packet,
  artifactPath,
  manifestPath,
  baselineManifestPath,
  uploadPath,
  artifactStoreTemplatePath,
  productionTemplatePath,
  inputPath,
  evidenceDir,
  action,
  reviewedChangeSetPath,
  priorPromoteReceiptPath,
  priorPromoteReceiptAuthorityPath,
  priorPromoteReceiptSignaturePath,
  priorPromoteReceiptTrustRegistryPath,
  expectFailure,
}) {
  const args = [
    join(cwd, "scripts/run-json-postgres-production-infrastructure.mjs"),
    "--operation", operation,
    "--packet", packet.packetPath,
    "--trust-registry-sha256", packet.registrySha256,
    "--trust-registry", packet.registryPath,
    "--approval-receipt", packet.approvalPath,
    "--artifact", artifactPath,
    "--artifact-manifest", manifestPath,
    "--artifact-store-template", artifactStoreTemplatePath,
    "--production-template", productionTemplatePath,
    "--execution-input", inputPath,
    "--evidence-dir", evidenceDir,
    "--profile-artifact-action", action,
    "--baseline-artifact-manifest", baselineManifestPath,
    "--artifact-upload-evidence", uploadPath,
    ...(priorPromoteReceiptPath
      ? [
          "--prior-profile-artifact-promote-receipt",
          priorPromoteReceiptPath,
        ]
      : []),
    ...(priorPromoteReceiptAuthorityPath
      ? [
          "--prior-profile-artifact-promote-receipt-authority",
          priorPromoteReceiptAuthorityPath,
        ]
      : []),
    ...(priorPromoteReceiptSignaturePath
      ? [
          "--prior-profile-artifact-promote-receipt-signature",
          priorPromoteReceiptSignaturePath,
        ]
      : []),
    ...(priorPromoteReceiptTrustRegistryPath
      ? [
          "--prior-profile-artifact-promote-receipt-trust-registry",
          priorPromoteReceiptTrustRegistryPath,
        ]
      : []),
    ...(reviewedChangeSetPath
      ? ["--reviewed-change-set", reviewedChangeSetPath]
      : []),
  ];
  const result = spawnSync(process.execPath, args, {
    cwd,
    env,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
  if (expectFailure) {
    assert.notEqual(result.status, 0, result.stdout);
    assert.match(result.stderr, expectFailure);
    return null;
  }
  assert.equal(result.status, 0, result.stderr);
  const resultPath = JSON.parse(result.stdout).result_path;
  const receipt = JSON.parse(readFileSync(resultPath, "utf8"));
  Object.defineProperty(receipt, "resultPath", {
    value: resultPath,
    enumerable: false,
  });
  return receipt;
}

test("fake-AWS runner promotes B, fails stale/replay, and rolls back to prior immutable A version", (testContext) => {
  const root = mkdtempSync(join(tmpdir(), "lawos-profile-artifact-runner-"));
  testContext.after(() => rmSync(root, { recursive: true, force: true }));
  const worktree = join(root, "clean-worktree");
  const privateRoot = join(root, "private");
  const fakeBin = join(root, "fake-bin");
  copyRunnerRepository(worktree);
  mkdirSync(privateRoot, { mode: 0o700 });
  mkdirSync(fakeBin, { mode: 0o700 });
  writeFileSync(join(worktree, "source.txt"), "profile artifact runner\n");
  execFileSync("git", ["init", "-q"], { cwd: worktree });
  execFileSync("git", ["config", "user.email", "fake@example.invalid"], { cwd: worktree });
  execFileSync("git", ["config", "user.name", "Fake Runner"], { cwd: worktree });
  execFileSync("git", ["add", "."], { cwd: worktree });
  execFileSync("git", ["commit", "-qm", "fixture"], { cwd: worktree });
  const sourceSha = execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: worktree,
    encoding: "utf8",
  }).trim();
  const sourceTree = execFileSync("git", ["rev-parse", "HEAD^{tree}"], {
    cwd: worktree,
    encoding: "utf8",
  }).trim();

  const stagingTemplate = JSON.parse(readFileSync(
    join(REPOSITORY_ROOT, "infra/lawos-private-staging/template.json"),
    "utf8",
  ));
  const artifactStoreTemplate =
    buildJsonPostgresProductionArtifactStoreTemplate();
  const productionTemplate = buildJsonPostgresProductionTemplate(
    stagingTemplate,
  );
  for (const logicalId of [
    "ApiFunction",
    "AdminFunction",
    "ProjectionAuditorFunction",
    "ProjectionWorkerFunction",
  ]) {
    assert.deepEqual(
      productionTemplate.Resources[logicalId].Properties.Environment.Variables
        .LAWOS_RUNTIME_GENERATION,
      { Ref: "RuntimeGeneration" },
    );
  }
  const runtimeDriftTemplate = structuredClone(productionTemplate);
  delete runtimeDriftTemplate.Resources.ProjectionWorkerFunction.Properties
    .Environment.Variables.LAWOS_RUNTIME_GENERATION;
  assert.throws(
    () => validateJsonPostgresProductionTemplate(runtimeDriftTemplate),
    /production Lambda authority contract drifted/u,
  );
  const artifactStoreTemplatePath = privateJson(
    join(privateRoot, "artifact-store-template.json"),
    artifactStoreTemplate,
  );
  const productionTemplatePath = privateJson(
    join(privateRoot, "production-template.json"),
    productionTemplate,
  );
  const combinedTemplateSha256 =
    jsonPostgresProductionCombinedTemplateSha256({
      artifactStoreTemplate,
      productionTemplate,
    });
  const templateRawSha256 = sha256(readFileSync(productionTemplatePath));

  const artifactAPath = privateFile(
    join(privateRoot, "artifact-a.zip"),
    Buffer.from("immutable-profile-artifact-a"),
  );
  const artifactBPath = privateFile(
    join(privateRoot, "artifact-b.zip"),
    Buffer.from("immutable-profile-artifact-b"),
  );
  const artifactASha256 = sha256(readFileSync(artifactAPath));
  const artifactBSha256 = sha256(readFileSync(artifactBPath));
  const manifestA = profileManifest({
    sourceSha,
    sourceTree,
    artifactSha256: artifactASha256,
    privateManifestSha256: "a".repeat(64),
    artifactFilename: basename(artifactAPath),
  });
  const manifestB = profileManifest({
    sourceSha,
    sourceTree,
    artifactSha256: artifactBSha256,
    privateManifestSha256: "b".repeat(64),
    artifactFilename: basename(artifactBPath),
  });
  const manifestAPath = privateJson(
    join(privateRoot, "manifest-a.json"),
    manifestA,
  );
  const manifestBPath = privateJson(
    join(privateRoot, "manifest-b.json"),
    manifestB,
  );
  const promotePacket = signedPacket({
    root: privateRoot,
    id: "promote-b",
    sourceSha,
    sourceTree,
    bindings: packetBindings({
      artifactSha256: artifactBSha256,
      artifactManifestSha256: sha256(readFileSync(manifestBPath)),
      combinedTemplateSha256,
    }),
  });
  const rollbackPacket = signedPacket({
    root: privateRoot,
    id: "rollback-a",
    sourceSha,
    sourceTree,
    bindings: packetBindings({
      artifactSha256: artifactASha256,
      artifactManifestSha256: sha256(readFileSync(manifestAPath)),
      combinedTemplateSha256,
    }),
  });
  const sameApprovalRollbackPacket = signedPacket({
    root: privateRoot,
    id: "rollback-a-same-approval",
    approvalId: "profile-artifact-approval-promote-b",
    sourceSha,
    sourceTree,
    bindings: packetBindings({
      artifactSha256: artifactASha256,
      artifactManifestSha256: sha256(readFileSync(manifestAPath)),
      combinedTemplateSha256,
    }),
  });
  const baselineApprovalRollbackPacket = signedPacket({
    root: privateRoot,
    id: "rollback-a-baseline-approval",
    approvalId: "baseline-approval",
    sourceSha,
    sourceTree,
    bindings: packetBindings({
      artifactSha256: artifactASha256,
      artifactManifestSha256: sha256(readFileSync(manifestAPath)),
      combinedTemplateSha256,
    }),
  });
  const oldPacketSha256 = "6".repeat(64);
  const priorUploadPacketSha256 = oldPacketSha256;
  assert.notEqual(priorUploadPacketSha256, rollbackPacket.packetSha256);
  const uploadA = uploadReceipt({
    sourceSha,
    sourceTree,
    packetSha256: priorUploadPacketSha256,
    artifactSha256: artifactASha256,
    artifactPath: artifactAPath,
    artifactVersion: "immutable-version-a",
    templateRawSha256,
  });
  const uploadB = uploadReceipt({
    sourceSha,
    sourceTree,
    packetSha256: promotePacket.packetSha256,
    artifactSha256: artifactBSha256,
    artifactPath: artifactBPath,
    artifactVersion: "immutable-version-b",
    templateRawSha256,
  });
  const uploadAPath = privateJson(join(privateRoot, "upload-a.json"), uploadA);
  const uploadBPath = privateJson(join(privateRoot, "upload-b.json"), uploadB);
  const promoteInputPath = executionInput(
    join(privateRoot, "input-promote.json"),
    8,
    "profile-promote",
  );
  const rollbackInputPath = executionInput(
    join(privateRoot, "input-rollback.json"),
    9,
    "profile-rollback",
  );

  const retainedUntil = new Date(Date.now() + 86_400_000).toISOString();
  const object = (artifactPath, artifactSha256, packetSha256, version) => ({
    VersionId: version,
    ContentLength: readFileSync(artifactPath).byteLength,
    ServerSideEncryption: "aws:kms",
    SSEKMSKeyId: KMS_ARN,
    Metadata: {
      sha256: artifactSha256,
      "source-sha": sourceSha,
      "source-tree": sourceTree,
      "packet-sha256": packetSha256,
    },
    ChecksumSHA256:
      Buffer.from(artifactSha256, "hex").toString("base64"),
    ObjectLockMode: "COMPLIANCE",
    ObjectLockRetainUntilDate: retainedUntil,
  });
  const state = {
    calls: [],
    mutations: [],
    nextChangeSet: 0,
    changeSets: {},
    kmsArn: KMS_ARN,
    template: productionTemplate,
    stack: {
      StackStatus: "UPDATE_COMPLETE",
      Parameters: stackParameters({
        sourceSha,
        sourceTree,
        artifactSha256: artifactASha256,
        artifactVersion: "immutable-version-a",
        executionPacketSha256: oldPacketSha256,
        runtimeGeneration: 7,
      }),
    },
    objects: {
      [`${uploadA.artifact_key}|${uploadA.artifact_version}`]:
        object(
          artifactAPath,
          artifactASha256,
          priorUploadPacketSha256,
          uploadA.artifact_version,
        ),
      [`${uploadB.artifact_key}|${uploadB.artifact_version}`]:
        object(
          artifactBPath,
          artifactBSha256,
          promotePacket.packetSha256,
          uploadB.artifact_version,
        ),
    },
  };
  const statePath = privateJson(join(privateRoot, "fake-aws-state.json"), state);
  const fakeAwsPath = privateFile(join(fakeBin, "aws"), fakeAwsScript());
  chmodSync(fakeAwsPath, 0o700);
  const path = `${fakeBin}:${process.env.PATH}`;
  assert.equal(execFileSync("which", ["aws"], {
    env: { ...process.env, PATH: path },
    encoding: "utf8",
  }).trim(), fakeAwsPath);
  const env = {
    ...process.env,
    PATH: path,
    FAKE_AWS_STATE: statePath,
  };
  const unrelatedRepository = join(root, "unrelated-repository");
  mkdirSync(unrelatedRepository);
  const wrongRoot = spawnSync(
    process.execPath,
    [AUTHORITY_RUNNER, "--operation", "preflight"],
    {
      cwd: unrelatedRepository,
      env,
      encoding: "utf8",
    },
  );
  assert.notEqual(wrongRoot.status, 0);
  assert.match(wrongRoot.stderr, /cwd must be its repository root/u);
  assert.equal(JSON.parse(readFileSync(statePath, "utf8")).calls.length, 0);
  let evidenceSequence = 0;
  const evidenceDir = (label) =>
    join(privateRoot, `evidence-${++evidenceSequence}-${label}`);
  const common = {
    cwd: worktree,
    env,
    artifactStoreTemplatePath,
    productionTemplatePath,
  };

  let fakeState = JSON.parse(readFileSync(statePath, "utf8"));
  fakeState.stack.Parameters.find(
    (entry) => entry.ParameterKey === "AllowedOrigins",
  ).UsePreviousValue = true;
  privateFile(statePath, JSON.stringify(fakeState));
  runRunner({
    ...common,
    operation: "create-profile-artifact-change-set",
    packet: promotePacket,
    artifactPath: artifactBPath,
    manifestPath: manifestBPath,
    baselineManifestPath: manifestAPath,
    uploadPath: uploadBPath,
    inputPath: promoteInputPath,
    evidenceDir: evidenceDir("promote-stack-use-previous-value"),
    action: "promote",
    expectFailure: /production stack parameter inventory drifted/u,
  });
  fakeState = JSON.parse(readFileSync(statePath, "utf8"));
  assert.equal(fakeState.mutations.length, 0);
  assert.equal(
    fakeState.mutations.filter(
      (entry) => entry.kind === "execute-change-set",
    ).length,
    0,
  );
  fakeState.stack.Parameters.find(
    (entry) => entry.ParameterKey === "AllowedOrigins",
  ).UsePreviousValue = false;
  privateFile(statePath, JSON.stringify(fakeState));

  const promoteReview = runRunner({
    ...common,
    operation: "create-profile-artifact-change-set",
    packet: promotePacket,
    artifactPath: artifactBPath,
    manifestPath: manifestBPath,
    baselineManifestPath: manifestAPath,
    uploadPath: uploadBPath,
    inputPath: promoteInputPath,
    evidenceDir: evidenceDir("promote-create"),
    action: "promote",
  });
  assert.equal(promoteReview.target_artifact_version, "immutable-version-b");
  assert.equal(promoteReview.target_artifact_version_verified, true);
  assert.equal(
    promoteReview.target_artifact_server_side_encryption,
    "aws:kms",
  );
  assert.equal(
    promoteReview.target_artifact_kms_key_ref_sha256,
    sha256(KMS_ARN),
  );
  const createdPromotePath = promoteReview.resultPath;
  assert.equal(readFileSync(createdPromotePath).byteLength > 0, true);

  fakeState = JSON.parse(readFileSync(statePath, "utf8"));
  const targetObjectLocator =
    `${uploadB.artifact_key}|${uploadB.artifact_version}`;
  fakeState.objects[targetObjectLocator].SSEKMSKeyId =
    `arn:aws:kms:ap-northeast-2:${ACCOUNT}:key/wrong-profile-artifact-key`;
  privateFile(statePath, JSON.stringify(fakeState));
  const mutationsBeforeKmsDrift = fakeState.mutations.length;
  const executeCallsBeforeKmsDrift = fakeState.mutations.filter(
    (entry) => entry.kind === "execute-change-set",
  ).length;
  runRunner({
    ...common,
    operation: "execute-profile-artifact-change-set",
    packet: promotePacket,
    artifactPath: artifactBPath,
    manifestPath: manifestBPath,
    baselineManifestPath: manifestAPath,
    uploadPath: uploadBPath,
    inputPath: promoteInputPath,
    evidenceDir: evidenceDir("promote-kms-drift"),
    action: "promote",
    reviewedChangeSetPath: createdPromotePath,
    expectFailure: /profile artifact immutable upload version drifted/u,
  });
  fakeState = JSON.parse(readFileSync(statePath, "utf8"));
  assert.equal(fakeState.mutations.length, mutationsBeforeKmsDrift);
  assert.equal(
    fakeState.mutations.filter(
      (entry) => entry.kind === "execute-change-set",
    ).length,
    executeCallsBeforeKmsDrift,
  );
  fakeState.objects[targetObjectLocator].SSEKMSKeyId = KMS_ARN;
  privateFile(statePath, JSON.stringify(fakeState));
  for (const [key, maliciousValue] of [
    ["AllowedOrigins", "https://evil.example"],
    ["ArtifactVersion", "malicious-version"],
  ]) {
    const described = fakeState.changeSets[promoteReview.change_set_id]
      .Parameters.find((entry) => entry.ParameterKey === key);
    const expectedValue = described.ParameterValue;
    described.ParameterValue = maliciousValue;
    privateFile(statePath, JSON.stringify(fakeState));
    const mutationsBeforeParameterDrift = fakeState.mutations.length;
    const executeCallsBeforeParameterDrift = fakeState.mutations.filter(
      (entry) => entry.kind === "execute-change-set",
    ).length;
    runRunner({
      ...common,
      operation: "execute-profile-artifact-change-set",
      packet: promotePacket,
      artifactPath: artifactBPath,
      manifestPath: manifestBPath,
      baselineManifestPath: manifestAPath,
      uploadPath: uploadBPath,
      inputPath: promoteInputPath,
      evidenceDir: evidenceDir(`promote-malicious-${key}`),
      action: "promote",
      reviewedChangeSetPath: createdPromotePath,
      expectFailure: /change-set parameters drifted/u,
    });
    fakeState = JSON.parse(readFileSync(statePath, "utf8"));
    assert.equal(fakeState.mutations.length, mutationsBeforeParameterDrift);
    assert.equal(
      fakeState.mutations.filter(
        (entry) => entry.kind === "execute-change-set",
      ).length,
      executeCallsBeforeParameterDrift,
    );
    fakeState.changeSets[promoteReview.change_set_id].Parameters.find(
      (entry) => entry.ParameterKey === key,
    ).ParameterValue = expectedValue;
    privateFile(statePath, JSON.stringify(fakeState));
  }
  const ambiguousParameter = fakeState.changeSets[promoteReview.change_set_id]
    .Parameters.find((entry) => entry.ParameterKey === "AllowedOrigins");
  ambiguousParameter.UsePreviousValue = true;
  privateFile(statePath, JSON.stringify(fakeState));
  const mutationsBeforeAmbiguousParameter = fakeState.mutations.length;
  const executeCallsBeforeAmbiguousParameter = fakeState.mutations.filter(
    (entry) => entry.kind === "execute-change-set",
  ).length;
  runRunner({
    ...common,
    operation: "execute-profile-artifact-change-set",
    packet: promotePacket,
    artifactPath: artifactBPath,
    manifestPath: manifestBPath,
    baselineManifestPath: manifestAPath,
    uploadPath: uploadBPath,
    inputPath: promoteInputPath,
    evidenceDir: evidenceDir("promote-use-previous-value"),
    action: "promote",
    reviewedChangeSetPath: createdPromotePath,
    expectFailure: /change-set parameters are ambiguous/u,
  });
  fakeState = JSON.parse(readFileSync(statePath, "utf8"));
  assert.equal(fakeState.mutations.length, mutationsBeforeAmbiguousParameter);
  assert.equal(
    fakeState.mutations.filter(
      (entry) => entry.kind === "execute-change-set",
    ).length,
    executeCallsBeforeAmbiguousParameter,
  );
  fakeState.changeSets[promoteReview.change_set_id].Parameters.find(
    (entry) => entry.ParameterKey === "AllowedOrigins",
  ).UsePreviousValue = false;
  privateFile(statePath, JSON.stringify(fakeState));
  const baselineVersion = fakeState.stack.Parameters.find(
    (entry) => entry.ParameterKey === "ArtifactVersion",
  );
  baselineVersion.ParameterValue = "stale-version";
  privateFile(statePath, JSON.stringify(fakeState));
  const mutationsBeforeStale = fakeState.mutations.length;
  runRunner({
    ...common,
    operation: "execute-profile-artifact-change-set",
    packet: promotePacket,
    artifactPath: artifactBPath,
    manifestPath: manifestBPath,
    baselineManifestPath: manifestAPath,
    uploadPath: uploadBPath,
    inputPath: promoteInputPath,
    evidenceDir: evidenceDir("promote-stale"),
    action: "promote",
    reviewedChangeSetPath: createdPromotePath,
    expectFailure:
      /baseline stack binding drifted|reviewed profile artifact change set binding is invalid/u,
  });
  fakeState = JSON.parse(readFileSync(statePath, "utf8"));
  assert.equal(fakeState.mutations.length, mutationsBeforeStale);
  fakeState.stack.Parameters.find(
    (entry) => entry.ParameterKey === "ArtifactVersion",
  ).ParameterValue = "immutable-version-a";
  privateFile(statePath, JSON.stringify(fakeState));

  const promoted = runRunner({
    ...common,
    operation: "execute-profile-artifact-change-set",
    packet: promotePacket,
    artifactPath: artifactBPath,
    manifestPath: manifestBPath,
    baselineManifestPath: manifestAPath,
    uploadPath: uploadBPath,
    inputPath: promoteInputPath,
    evidenceDir: evidenceDir("promote-execute"),
    action: "promote",
    reviewedChangeSetPath: createdPromotePath,
  });
  assert.equal(promoted.target_artifact_version, "immutable-version-b");
  assert.equal(
    promoted.reviewed_change_set_sha256,
    promoteReview.reviewed_change_set_sha256,
  );
  assert.equal(promoted.target_artifact_server_side_encryption, "aws:kms");
  assert.equal(promoted.target_artifact_kms_key_ref_sha256, sha256(KMS_ARN));
  assert.equal(promoted.runtime_generation_bound_lambda_count, 4);
  const promotedReceiptPath = promoted.resultPath;
  const promoteReceiptAuthority = signedPromoteReceiptAuthority({
    root: privateRoot,
    name: "promote-execution",
    receiptPath: promotedReceiptPath,
    receipt: promoted,
    packet: promotePacket,
  });
  const validPriorPromoteAuthority = {
    priorPromoteReceiptAuthorityPath:
      promoteReceiptAuthority.authorityPath,
    priorPromoteReceiptSignaturePath:
      promoteReceiptAuthority.signaturePath,
    priorPromoteReceiptTrustRegistryPath: promotePacket.registryPath,
  };
  fakeState = JSON.parse(readFileSync(statePath, "utf8"));
  const mutationsBeforeReplay = fakeState.mutations.length;
  runRunner({
    ...common,
    operation: "execute-profile-artifact-change-set",
    packet: promotePacket,
    artifactPath: artifactBPath,
    manifestPath: manifestBPath,
    baselineManifestPath: manifestAPath,
    uploadPath: uploadBPath,
    inputPath: promoteInputPath,
    evidenceDir: evidenceDir("promote-replay"),
    action: "promote",
    reviewedChangeSetPath: createdPromotePath,
    expectFailure: /baseline stack binding drifted/u,
  });
  fakeState = JSON.parse(readFileSync(statePath, "utf8"));
  assert.equal(fakeState.mutations.length, mutationsBeforeReplay);

  const rejectedMutationSnapshot = () => {
    const observed = JSON.parse(readFileSync(statePath, "utf8"));
    return {
      mutations: observed.mutations.length,
      executeChangeSets: observed.mutations.filter(
        (entry) => entry.kind === "execute-change-set",
      ).length,
    };
  };
  const assertRejectedWithoutMutation = (before) => {
    assert.deepEqual(rejectedMutationSnapshot(), before);
  };
  let beforeRejectedRollback = rejectedMutationSnapshot();
  runRunner({
    ...common,
    operation: "create-profile-artifact-change-set",
    packet: rollbackPacket,
    artifactPath: artifactAPath,
    manifestPath: manifestAPath,
    baselineManifestPath: manifestBPath,
    uploadPath: uploadAPath,
    inputPath: rollbackInputPath,
    evidenceDir: evidenceDir("rollback-missing-prior-promote"),
    action: "rollback",
    expectFailure: /--prior-profile-artifact-promote-receipt is required/u,
  });
  assertRejectedWithoutMutation(beforeRejectedRollback);

  const tamperedPromoteReceipt = structuredClone(promoted);
  tamperedPromoteReceipt.baseline_artifact_version = "tampered-version-a";
  const tamperedPromoteReceiptPath = privateJson(
    join(privateRoot, "tampered-promote-receipt.json"),
    tamperedPromoteReceipt,
  );
  beforeRejectedRollback = rejectedMutationSnapshot();
  runRunner({
    ...common,
    operation: "create-profile-artifact-change-set",
    packet: rollbackPacket,
    artifactPath: artifactAPath,
    manifestPath: manifestAPath,
    baselineManifestPath: manifestBPath,
    uploadPath: uploadAPath,
    inputPath: rollbackInputPath,
    evidenceDir: evidenceDir("rollback-tampered-prior-promote"),
    action: "rollback",
    priorPromoteReceiptPath: tamperedPromoteReceiptPath,
    ...validPriorPromoteAuthority,
    expectFailure: /prior profile artifact promote receipt authority/u,
  });
  assertRejectedWithoutMutation(beforeRejectedRollback);

  const wrongLineagePromoteReceipt = structuredClone(promoted);
  wrongLineagePromoteReceipt.baseline_artifact_version =
    "wrong-lineage-version-a";
  wrongLineagePromoteReceipt.result_sha256 =
    jsonPostgresProductionInfrastructureResultSha256(
      wrongLineagePromoteReceipt,
    );
  const wrongLineagePromoteReceiptPath = privateJson(
    join(privateRoot, "wrong-lineage-promote-receipt.json"),
    wrongLineagePromoteReceipt,
  );
  beforeRejectedRollback = rejectedMutationSnapshot();
  runRunner({
    ...common,
    operation: "create-profile-artifact-change-set",
    packet: rollbackPacket,
    artifactPath: artifactAPath,
    manifestPath: manifestAPath,
    baselineManifestPath: manifestBPath,
    uploadPath: uploadAPath,
    inputPath: rollbackInputPath,
    evidenceDir: evidenceDir("rollback-wrong-lineage-prior-promote"),
    action: "rollback",
    priorPromoteReceiptPath: wrongLineagePromoteReceiptPath,
    ...validPriorPromoteAuthority,
    expectFailure: /prior profile artifact promote receipt authority/u,
  });
  assertRejectedWithoutMutation(beforeRejectedRollback);

  const wrongFingerprintAuthority = signedPromoteReceiptAuthority({
    root: privateRoot,
    name: "promote-wrong-fingerprint",
    receiptPath: promotedReceiptPath,
    receipt: promoted,
    packet: promotePacket,
    mutate: (authority) => {
      authority.signer_fingerprint_sha256 = "0".repeat(64);
    },
  });
  beforeRejectedRollback = rejectedMutationSnapshot();
  runRunner({
    ...common,
    operation: "create-profile-artifact-change-set",
    packet: rollbackPacket,
    artifactPath: artifactAPath,
    manifestPath: manifestAPath,
    baselineManifestPath: manifestBPath,
    uploadPath: uploadAPath,
    inputPath: rollbackInputPath,
    evidenceDir: evidenceDir("rollback-wrong-authority-fingerprint"),
    action: "rollback",
    priorPromoteReceiptPath: promotedReceiptPath,
    priorPromoteReceiptAuthorityPath:
      wrongFingerprintAuthority.authorityPath,
    priorPromoteReceiptSignaturePath:
      wrongFingerprintAuthority.signaturePath,
    priorPromoteReceiptTrustRegistryPath: promotePacket.registryPath,
    expectFailure: /prior profile artifact promote receipt authority signature/u,
  });
  assertRejectedWithoutMutation(beforeRejectedRollback);

  const wrongSourceAuthority = signedPromoteReceiptAuthority({
    root: privateRoot,
    name: "promote-wrong-source",
    receiptPath: promotedReceiptPath,
    receipt: promoted,
    packet: promotePacket,
    mutate: (authority) => {
      authority.source_sha = "f".repeat(40);
    },
  });
  beforeRejectedRollback = rejectedMutationSnapshot();
  runRunner({
    ...common,
    operation: "create-profile-artifact-change-set",
    packet: rollbackPacket,
    artifactPath: artifactAPath,
    manifestPath: manifestAPath,
    baselineManifestPath: manifestBPath,
    uploadPath: uploadAPath,
    inputPath: rollbackInputPath,
    evidenceDir: evidenceDir("rollback-wrong-authority-source"),
    action: "rollback",
    priorPromoteReceiptPath: promotedReceiptPath,
    priorPromoteReceiptAuthorityPath: wrongSourceAuthority.authorityPath,
    priorPromoteReceiptSignaturePath: wrongSourceAuthority.signaturePath,
    priorPromoteReceiptTrustRegistryPath: promotePacket.registryPath,
    expectFailure: /prior profile artifact promote receipt authority binding/u,
  });
  assertRejectedWithoutMutation(beforeRejectedRollback);

  const wrongKeyAuthority = signedPromoteReceiptAuthority({
    root: privateRoot,
    name: "promote-wrong-key",
    receiptPath: promotedReceiptPath,
    receipt: promoted,
    packet: promotePacket,
    signer: promotePacket.approvalSigner,
  });
  beforeRejectedRollback = rejectedMutationSnapshot();
  runRunner({
    ...common,
    operation: "create-profile-artifact-change-set",
    packet: rollbackPacket,
    artifactPath: artifactAPath,
    manifestPath: manifestAPath,
    baselineManifestPath: manifestBPath,
    uploadPath: uploadAPath,
    inputPath: rollbackInputPath,
    evidenceDir: evidenceDir("rollback-wrong-authority-key"),
    action: "rollback",
    priorPromoteReceiptPath: promotedReceiptPath,
    priorPromoteReceiptAuthorityPath: wrongKeyAuthority.authorityPath,
    priorPromoteReceiptSignaturePath: wrongKeyAuthority.signaturePath,
    priorPromoteReceiptTrustRegistryPath: promotePacket.registryPath,
    expectFailure: /prior profile artifact promote receipt authority key/u,
  });
  assertRejectedWithoutMutation(beforeRejectedRollback);

  const uploadAReuploaded = uploadReceipt({
    sourceSha,
    sourceTree,
    packetSha256: priorUploadPacketSha256,
    artifactSha256: artifactASha256,
    artifactPath: artifactAPath,
    artifactVersion: "immutable-version-a-reuploaded",
    templateRawSha256,
  });
  const uploadAReuploadedPath = privateJson(
    join(privateRoot, "upload-a-reuploaded.json"),
    uploadAReuploaded,
  );
  fakeState = JSON.parse(readFileSync(statePath, "utf8"));
  fakeState.objects[
    `${uploadAReuploaded.artifact_key}|${uploadAReuploaded.artifact_version}`
  ] = object(
    artifactAPath,
    artifactASha256,
    priorUploadPacketSha256,
    uploadAReuploaded.artifact_version,
  );
  privateFile(statePath, JSON.stringify(fakeState));
  const selfConsistentForgedPromoteReceipt = structuredClone(promoted);
  selfConsistentForgedPromoteReceipt.baseline_artifact_version =
    uploadAReuploaded.artifact_version;
  selfConsistentForgedPromoteReceipt.result_sha256 =
    jsonPostgresProductionInfrastructureResultSha256(
      selfConsistentForgedPromoteReceipt,
    );
  const selfConsistentForgedPromoteReceiptPath = privateJson(
    join(privateRoot, "self-consistent-forged-promote-receipt.json"),
    selfConsistentForgedPromoteReceipt,
  );
  const selfConsistentForgedPromoteAuthority = signedPromoteReceiptAuthority({
    root: privateRoot,
    name: "self-consistent-forged-promote",
    receiptPath: selfConsistentForgedPromoteReceiptPath,
    receipt: selfConsistentForgedPromoteReceipt,
    packet: rollbackPacket,
  });
  beforeRejectedRollback = rejectedMutationSnapshot();
  runRunner({
    ...common,
    operation: "create-profile-artifact-change-set",
    packet: rollbackPacket,
    artifactPath: artifactAPath,
    manifestPath: manifestAPath,
    baselineManifestPath: manifestBPath,
    uploadPath: uploadAReuploadedPath,
    inputPath: rollbackInputPath,
    evidenceDir: evidenceDir("rollback-self-consistent-forged-promote"),
    action: "rollback",
    priorPromoteReceiptPath: selfConsistentForgedPromoteReceiptPath,
    priorPromoteReceiptAuthorityPath:
      selfConsistentForgedPromoteAuthority.authorityPath,
    priorPromoteReceiptSignaturePath:
      selfConsistentForgedPromoteAuthority.signaturePath,
    priorPromoteReceiptTrustRegistryPath: rollbackPacket.registryPath,
    expectFailure: /prior profile artifact promote receipt authority binding/u,
  });
  assertRejectedWithoutMutation(beforeRejectedRollback);

  beforeRejectedRollback = rejectedMutationSnapshot();
  runRunner({
    ...common,
    operation: "create-profile-artifact-change-set",
    packet: rollbackPacket,
    artifactPath: artifactAPath,
    manifestPath: manifestAPath,
    baselineManifestPath: manifestBPath,
    uploadPath: uploadAReuploadedPath,
    inputPath: rollbackInputPath,
    evidenceDir: evidenceDir("rollback-reuploaded-a"),
    action: "rollback",
    priorPromoteReceiptPath: promotedReceiptPath,
    ...validPriorPromoteAuthority,
    expectFailure: /prior profile artifact promote receipt lineage/u,
  });
  assertRejectedWithoutMutation(beforeRejectedRollback);

  beforeRejectedRollback = rejectedMutationSnapshot();
  runRunner({
    ...common,
    operation: "create-profile-artifact-change-set",
    packet: sameApprovalRollbackPacket,
    artifactPath: artifactAPath,
    manifestPath: manifestAPath,
    baselineManifestPath: manifestBPath,
    uploadPath: uploadAPath,
    inputPath: rollbackInputPath,
    evidenceDir: evidenceDir("rollback-same-approval"),
    action: "rollback",
    priorPromoteReceiptPath: promotedReceiptPath,
    ...validPriorPromoteAuthority,
    expectFailure: /baseline stack binding drifted/u,
  });
  assertRejectedWithoutMutation(beforeRejectedRollback);

  beforeRejectedRollback = rejectedMutationSnapshot();
  runRunner({
    ...common,
    operation: "create-profile-artifact-change-set",
    packet: baselineApprovalRollbackPacket,
    artifactPath: artifactAPath,
    manifestPath: manifestAPath,
    baselineManifestPath: manifestBPath,
    uploadPath: uploadAPath,
    inputPath: rollbackInputPath,
    evidenceDir: evidenceDir("rollback-baseline-approval-replay"),
    action: "rollback",
    priorPromoteReceiptPath: promotedReceiptPath,
    ...validPriorPromoteAuthority,
    expectFailure: /prior profile artifact promote receipt lineage/u,
  });
  assertRejectedWithoutMutation(beforeRejectedRollback);

  const rollbackReview = runRunner({
    ...common,
    operation: "create-profile-artifact-change-set",
    packet: rollbackPacket,
    artifactPath: artifactAPath,
    manifestPath: manifestAPath,
    baselineManifestPath: manifestBPath,
    uploadPath: uploadAPath,
    inputPath: rollbackInputPath,
    evidenceDir: evidenceDir("rollback-create"),
    action: "rollback",
    priorPromoteReceiptPath: promotedReceiptPath,
    ...validPriorPromoteAuthority,
  });
  assert.equal(rollbackReview.target_artifact_version, "immutable-version-a");
  assert.equal(
    rollbackReview.target_artifact_server_side_encryption,
    "aws:kms",
  );
  assert.equal(
    rollbackReview.target_artifact_kms_key_ref_sha256,
    sha256(KMS_ARN),
  );
  assert.equal(
    rollbackReview.target_artifact_version_head_verified_count,
    1,
  );
  assert.equal(
    rollbackReview.target_artifact_upload_packet_sha256,
    priorUploadPacketSha256,
  );
  assert.equal(
    rollbackReview.target_artifact_upload_receipt_sha256,
    uploadA.result_sha256,
  );
  assert.equal(
    rollbackReview.prior_promote_execution_receipt_sha256,
    promoted.result_sha256,
  );
  assert.equal(
    rollbackReview.prior_promote_execution_receipt_bytes_sha256,
    sha256(readFileSync(promotedReceiptPath)),
  );
  assert.equal(
    rollbackReview.prior_promote_execution_receipt_authority_sha256,
    sha256(readFileSync(promoteReceiptAuthority.authorityPath)),
  );
  assert.equal(
    rollbackReview.prior_promote_execution_receipt_signature_sha256,
    sha256(readFileSync(promoteReceiptAuthority.signaturePath)),
  );
  assert.equal(
    rollbackReview.prior_promote_execution_receipt_trust_registry_sha256,
    promotePacket.registrySha256,
  );
  assert.equal(
    rollbackReview.prior_promote_execution_receipt_signer_key_id,
    promotePacket.receiptAuthoritySigner.keyId,
  );
  assert.equal(
    rollbackReview
      .prior_promote_execution_receipt_signer_fingerprint_sha256,
    sha256(promotePacket.receiptAuthoritySigner.publicKey.export({
      type: "spki",
      format: "der",
    })),
  );
  assert.equal(
    rollbackReview.prior_promote_execution_receipt_authority_signed_at,
    promoteReceiptAuthority.authority.signed_at,
  );
  const createdRollbackPath = rollbackReview.resultPath;
  const rolledBack = runRunner({
    ...common,
    operation: "execute-profile-artifact-change-set",
    packet: rollbackPacket,
    artifactPath: artifactAPath,
    manifestPath: manifestAPath,
    baselineManifestPath: manifestBPath,
    uploadPath: uploadAPath,
    inputPath: rollbackInputPath,
    evidenceDir: evidenceDir("rollback-execute"),
    action: "rollback",
    reviewedChangeSetPath: createdRollbackPath,
    priorPromoteReceiptPath: promotedReceiptPath,
    ...validPriorPromoteAuthority,
  });
  assert.equal(rolledBack.target_artifact_version, "immutable-version-a");
  assert.equal(
    rolledBack.reviewed_change_set_sha256,
    rollbackReview.reviewed_change_set_sha256,
  );
  assert.equal(rolledBack.target_artifact_server_side_encryption, "aws:kms");
  assert.equal(rolledBack.target_artifact_kms_key_ref_sha256, sha256(KMS_ARN));
  for (const key of [
    "prior_promote_execution_receipt_sha256",
    "prior_promote_execution_receipt_bytes_sha256",
    "prior_promote_execution_receipt_authority_sha256",
    "prior_promote_execution_receipt_signature_sha256",
    "prior_promote_execution_receipt_trust_registry_sha256",
    "prior_promote_execution_receipt_signer_key_id",
    "prior_promote_execution_receipt_signer_fingerprint_sha256",
    "prior_promote_execution_receipt_authority_signed_at",
  ]) {
    assert.equal(rolledBack[key], rollbackReview[key], key);
  }
  assert.equal(rolledBack.target_artifact_version_head_verified_count, 1);
  assert.equal(rolledBack.runtime_generation_bound_lambda_count, 4);
  assert.equal(rolledBack.production_traffic_enabled, true);
  assert.equal(rolledBack.lambda_eni_bootstrap_enabled, false);
  assert.equal(rolledBack.projection_worker_enabled, true);
  assert.equal(rolledBack.production_write_count, 0);

  fakeState = JSON.parse(readFileSync(statePath, "utf8"));
  const finalParameters = parameterMap(fakeState.stack);
  assert.equal(finalParameters.ArtifactVersion, "immutable-version-a");
  assert.equal(finalParameters.ArtifactSha256, artifactASha256);
  assert.equal(finalParameters.RuntimeGeneration, "9");
  assert.equal(finalParameters.EnableProductionTraffic, "true");
  assert.equal(finalParameters.EnableLambdaEniBootstrap, "false");
  assert.equal(finalParameters.EnableProjectionWorker, "true");
  assert.deepEqual(
    fakeState.mutations.map((entry) => entry.kind),
    [
      "create-change-set",
      "execute-change-set",
      "create-change-set",
      "execute-change-set",
    ],
  );
  assert.equal(fakeState.calls.every((entry) => entry.fake === true), true);
});
