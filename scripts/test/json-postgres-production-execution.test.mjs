import assert from "node:assert/strict";
import {
  createHash,
  generateKeyPairSync,
  sign,
} from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  JSON_POSTGRES_PRODUCTION_ACCOUNT,
  JSON_POSTGRES_PRODUCTION_ARTIFACT_STACK,
  JSON_POSTGRES_PRODUCTION_STACK,
  JSON_POSTGRES_DISABLED_HRX_MAPPING_OBJECT_KEY,
  JSON_POSTGRES_DISABLED_HRX_VALIDATION_OBJECT_KEY,
  JSON_POSTGRES_PROFILE_ARTIFACT_PROMOTE_AUTHORITY_ACTION,
  JSON_POSTGRES_PROFILE_ARTIFACT_PROMOTE_AUTHORITY_ENVIRONMENT,
  JSON_POSTGRES_PROFILE_ARTIFACT_PROMOTE_AUTHORITY_ROLE,
  JSON_POSTGRES_PROFILE_ARTIFACT_PROMOTE_AUTHORITY_VERSION,
  assertJsonPostgresArtifactBucketState,
  assertJsonPostgresArtifactStoreBinding,
  assertJsonPostgresProductionCaller,
  assertJsonPostgresProfileArtifactReviewedChangeSet,
  assertJsonPostgresProfileArtifactTargetStack,
  assertJsonPostgresProductionStack,
  buildJsonPostgresProfileArtifactTransition,
  buildJsonPostgresArtifactStoreParameters,
  buildJsonPostgresProductionStackParameters,
  createJsonPostgresProductionWorkerEventLocator,
  jsonPostgresProductionCombinedTemplateSha256,
  jsonPostgresProductionInfrastructureResultSha256,
  jsonPostgresProductionParametersSha256,
  validateJsonPostgresProductionChangeSet,
  validateJsonPostgresProfileArtifactChangeSet,
  validateObservedChangeSetParameters,
  validateJsonPostgresW15ProductionChangeSet,
  validateJsonPostgresW15WorkerObservability,
} from "../lib/json-postgres-production-execution.mjs";
import {
  canonicalizeJson,
} from "../lib/runtime-safety-approval-contract.mjs";

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function describedParameters(parameters) {
  return Object.entries(parameters).map(([ParameterKey, ParameterValue]) => ({
    ParameterKey,
    ParameterValue: String(ParameterValue),
    UsePreviousValue: false,
  }));
}

function packet() {
  return {
    source_sha: "a".repeat(40),
    source_tree: "b".repeat(40),
    packet_sha256: "c".repeat(64),
    bindings: {
      artifact_sha256: "d".repeat(64),
      artifact_manifest_sha256: "1".repeat(64),
    },
    target: {
      artifact_bucket_name: "lawos-prod-artifacts-770880870480",
      artifact_kms_key_ref: "alias/lawos-production-artifacts",
      program_input_bucket_name: "lawos-prod-program-input-770880870480",
      program_input_expected_bucket_owner:
        JSON_POSTGRES_PRODUCTION_ACCOUNT,
      dms_bucket_name: "lawos-prod-dms-770880870480",
      approved_tenant_ids: ["tenant-approved"],
    },
  };
}

function profileArtifactManifest({
  value = packet(),
  artifactDigit,
  profileDigit,
  filename = "lawos-production.zip",
} = {}) {
  const privateManifestSha256 = profileDigit.repeat(64);
  return {
    schema_version: "law-firm-os.json-postgres-production-artifact.v2",
    source_sha: value.source_sha,
    source_tree: value.source_tree,
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
      metadata_sha256: artifactDigit.repeat(64),
      generation_ref:
        `profile_generation_${privateManifestSha256.slice(0, 32)}`,
      private_manifest_schema_version:
        "law-firm-os.profile-photo-replacement-manifest.v2",
      private_manifest_sha256: privateManifestSha256,
      private_manifest_entry_count: 10,
      injected_photo_entry_count: 10,
      git_source_photo_entry_count: 0,
    },
    artifact_sha256: artifactDigit.repeat(64),
    artifact_filename: filename,
  };
}

function profileArtifactStack({
  value = packet(),
  baselineManifest,
  artifactVersion = "baseline-version-1",
  runtimeGeneration = 7,
  projectionWorkerEnabled = true,
} = {}) {
  const baselinePacketSha256 = "2".repeat(64);
  const workerEventSha256 = "4".repeat(64);
  const workerEvent = projectionWorkerEnabled
    ? {
        schema_version:
          "law-firm-os.immutable-program-input-locator.v1",
        bucket: value.target.program_input_bucket_name,
        key:
          `program-input/${baselinePacketSha256}/w15-worker-event/`
          + `${value.source_sha}/${workerEventSha256}.json`,
        version_id: "worker-event-version-1",
        expected_bucket_owner:
          value.target.program_input_expected_bucket_owner,
        sha256: workerEventSha256,
        byte_size: 512,
      }
    : {};
  const parameters = {
    ArtifactBucket: value.target.artifact_bucket_name,
    ArtifactKey:
      `lawos-production/${value.source_sha}/`
      + `${baselineManifest.artifact_sha256}.zip`,
    ArtifactVersion: artifactVersion,
    SourceSha: value.source_sha,
    SourceTree: value.source_tree,
    ArtifactSha256: baselineManifest.artifact_sha256,
    OwnerTrustRegistrySha256: "3".repeat(64),
    BootstrapApprovalId: "baseline-approval",
    Owner: "lawos-owner",
    ReviewDate: "2026-07-31",
    ExpirationDate: "2027-07-31",
    AllowedOrigins: "https://lawos.example,https://app.lawos.example",
    PasswordResetSesIdentityArn:
      "arn:aws:ses:ap-northeast-2:770880870480:identity/lawos.example",
    PasswordResetFromEmail: "no-reply@lawos.example",
    EnableLambdaEniBootstrap: "false",
    RuntimeGeneration: String(runtimeGeneration),
    ExecutionPacketSha256: baselinePacketSha256,
    ProgramInputBucketName: value.target.program_input_bucket_name,
    DmsBucketName: value.target.dms_bucket_name,
    PrimaryTenantId: "tenant-approved",
    EnableProductionTraffic: "true",
    EnableProjectionWorker: projectionWorkerEnabled ? "true" : "false",
    ProjectionWorkerEventJson: JSON.stringify(workerEvent),
    HrxProjectionMappingObjectKey: projectionWorkerEnabled
      ? "program-input/exact/mapping.json"
      : JSON_POSTGRES_DISABLED_HRX_MAPPING_OBJECT_KEY,
    HrxProjectionValidationObjectKey: projectionWorkerEnabled
      ? "program-input/exact/validation.json"
      : JSON_POSTGRES_DISABLED_HRX_VALIDATION_OBJECT_KEY,
    ProjectionWorkerLagThresholdMs: "24",
    MonthlyCostCeilingKrw: "300000",
  };
  return {
    StackStatus: "UPDATE_COMPLETE",
    Parameters: Object.entries(parameters).map(
      ([ParameterKey, ParameterValue]) => ({
        ParameterKey,
        ParameterValue,
        UsePreviousValue: false,
      }),
    ),
  };
}

function profileArtifactUpload({
  value = packet(),
  targetManifest,
  artifactVersion = "target-version-1",
  uploadPacketSha256 = value.packet_sha256,
} = {}) {
  const receipt = {
    schema_version:
      "law-firm-os.json-postgres-production-artifact-upload.v1",
    operation: "upload-artifact",
    outcome: "PASS",
    source_sha: value.source_sha,
    source_tree: value.source_tree,
    packet_sha256: uploadPacketSha256,
    artifact_sha256: targetManifest.artifact_sha256,
    artifact_key:
      `lawos-production/${value.source_sha}/`
      + `${targetManifest.artifact_sha256}.zip`,
    artifact_version: artifactVersion,
    production_write_count: 0,
  };
  return {
    ...receipt,
    result_sha256:
      jsonPostgresProductionInfrastructureResultSha256(receipt),
  };
}

function priorProfileArtifactPromoteReceipt({
  value,
  currentStack,
  rollbackBaselineManifest,
  rollbackBaselineManifestSha256,
  rollbackTargetManifest,
  rollbackTargetManifestSha256,
  rollbackUpload,
}) {
  const current = Object.fromEntries(currentStack.Parameters.map((entry) => [
    entry.ParameterKey,
    entry.ParameterValue,
  ]));
  const profileCounts = {
    private_manifest_entry_count: 10,
    injected_photo_entry_count: 10,
    git_source_photo_entry_count: 0,
  };
  const receipt = {
    schema_version:
      "law-firm-os.json-postgres-production-infrastructure-result.v1",
    operation: "execute-profile-artifact-change-set",
    purpose: "profile-artifact-rebind",
    outcome: "PASS",
    generated_at: new Date(Date.now() - 2_000).toISOString(),
    profile_artifact_action: "promote",
    source_sha: value.source_sha,
    source_tree: value.source_tree,
    packet_sha256: current.ExecutionPacketSha256,
    target_execution_packet_sha256: current.ExecutionPacketSha256,
    target_runtime_generation: Number(current.RuntimeGeneration),
    target_parameters_sha256:
      jsonPostgresProductionParametersSha256(current),
    target_artifact_sha256: rollbackBaselineManifest.artifact_sha256,
    target_artifact_manifest_sha256: rollbackBaselineManifestSha256,
    target_artifact_key: current.ArtifactKey,
    target_artifact_version: current.ArtifactVersion,
    target_profile_generation_ref:
      rollbackBaselineManifest.profile_photo_artifact.generation_ref,
    target_private_manifest_sha256:
      rollbackBaselineManifest.profile_photo_artifact.private_manifest_sha256,
    target_profile_counts: profileCounts,
    target_approval_id_sha256: sha256(current.BootstrapApprovalId),
    baseline_approval_id_sha256: sha256("prior-a-approval"),
    baseline_artifact_sha256: rollbackTargetManifest.artifact_sha256,
    baseline_artifact_manifest_sha256: rollbackTargetManifestSha256,
    baseline_artifact_key: rollbackUpload.artifact_key,
    baseline_artifact_version: rollbackUpload.artifact_version,
    baseline_profile_generation_ref:
      rollbackTargetManifest.profile_photo_artifact.generation_ref,
    baseline_private_manifest_sha256:
      rollbackTargetManifest.profile_photo_artifact.private_manifest_sha256,
    baseline_profile_counts: profileCounts,
    baseline_execution_packet_sha256: rollbackUpload.packet_sha256,
    target_artifact_version_verified: true,
    target_artifact_version_head_verified_count: 1,
    target_artifact_server_side_encryption: "aws:kms",
    target_artifact_kms_key_ref_sha256: "c".repeat(64),
    reviewed_change_set_sha256: "d".repeat(64),
    active_successful_lambda_count: 4,
    lambda_code_sha256_verified_count: 4,
    runtime_generation_bound_lambda_count: 4,
    production_traffic_enabled: true,
    lambda_eni_bootstrap_enabled: false,
    production_data_write_count: 0,
    production_write_count: 0,
    aws_mutation_count: 1,
    profile_artifact_transition_sha256: "a".repeat(64),
    approval_receipt_sha256: "b".repeat(64),
  };
  return {
    ...receipt,
    result_sha256:
      jsonPostgresProductionInfrastructureResultSha256(receipt),
  };
}

function profileArtifactPromoteAuthorityKey() {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const now = Date.now();
  const keyId = "profile-artifact-promote-attestor";
  const registry = {
    schema_version: "law-firm-os.runtime-safety.approval-trust-registry.v1",
    generated_at: new Date(now - 60_000).toISOString(),
    keys: [{
      key_id: keyId,
      algorithm: "Ed25519",
      public_key_spki_pem: publicKey.export({
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
  const trustRegistryBytes = Buffer.from(
    `${JSON.stringify(registry, null, 2)}\n`,
  );
  return {
    privateKey,
    publicKey,
    keyId,
    trustRegistryBytes,
    trustRegistrySha256: sha256(trustRegistryBytes),
  };
}

function signedProfileArtifactPromoteReceipt({
  receipt,
  value,
  authorityKey,
}) {
  const receiptBytes = Buffer.from(`${JSON.stringify(receipt, null, 2)}\n`);
  const authority = {
    schema_version:
      JSON_POSTGRES_PROFILE_ARTIFACT_PROMOTE_AUTHORITY_VERSION,
    action: JSON_POSTGRES_PROFILE_ARTIFACT_PROMOTE_AUTHORITY_ACTION,
    environment:
      JSON_POSTGRES_PROFILE_ARTIFACT_PROMOTE_AUTHORITY_ENVIRONMENT,
    receipt_bytes_sha256: sha256(receiptBytes),
    receipt_result_sha256: receipt.result_sha256,
    trust_registry_sha256: authorityKey.trustRegistrySha256,
    source_sha: value.source_sha,
    source_tree: value.source_tree,
    signer_key_id: authorityKey.keyId,
    signer_fingerprint_sha256: sha256(authorityKey.publicKey.export({
      type: "spki",
      format: "der",
    })),
    signed_at: new Date(Date.now() - 1_000).toISOString(),
  };
  return {
    receipt,
    receiptBytes,
    authority,
    authorityBytes: Buffer.from(`${JSON.stringify(authority, null, 2)}\n`),
    signatureBytes: sign(
      null,
      Buffer.from(canonicalizeJson(authority)),
      authorityKey.privateKey,
    ),
    trustRegistryBytes: authorityKey.trustRegistryBytes,
  };
}

function replaceProfileArtifactPromoteAuthority(
  fixture,
  authority,
  privateKey = fixture.priorPromote.authorityKey.privateKey,
) {
  fixture.input.priorPromoteExecutionReceiptAuthorityBytes = Buffer.from(
    `${JSON.stringify(authority, null, 2)}\n`,
  );
  fixture.input.priorPromoteExecutionReceiptSignatureBytes = sign(
    null,
    Buffer.from(canonicalizeJson(authority)),
    privateKey,
  );
}

function profileArtifactTransitionFixture({
  action = "promote",
  value = packet(),
  baselineArtifactDigit = "e",
  baselineProfileDigit = "6",
  targetArtifactDigit = "d",
  targetProfileDigit = "7",
  targetArtifactVersion = "target-version-1",
  runtimeGeneration = 8,
  projectionWorkerEnabled = true,
} = {}) {
  value.bindings.artifact_sha256 = targetArtifactDigit.repeat(64);
  const baselineManifest = profileArtifactManifest({
    value,
    artifactDigit: baselineArtifactDigit,
    profileDigit: baselineProfileDigit,
  });
  const targetManifest = profileArtifactManifest({
    value,
    artifactDigit: targetArtifactDigit,
    profileDigit: targetProfileDigit,
  });
  const currentStack = profileArtifactStack({
    value,
    baselineManifest,
    projectionWorkerEnabled,
  });
  const artifactUploadEvidence = profileArtifactUpload({
    value,
    targetManifest,
    artifactVersion: targetArtifactVersion,
    uploadPacketSha256: action === "rollback"
      ? "5".repeat(64)
      : value.packet_sha256,
  });
  let priorPromote = null;
  if (action === "rollback") {
    const authorityKey = profileArtifactPromoteAuthorityKey();
    currentStack.Parameters.find(
      (entry) => entry.ParameterKey === "OwnerTrustRegistrySha256",
    ).ParameterValue = authorityKey.trustRegistrySha256;
    priorPromote = signedProfileArtifactPromoteReceipt({
      receipt: priorProfileArtifactPromoteReceipt({
        value,
        currentStack,
        rollbackBaselineManifest: baselineManifest,
        rollbackBaselineManifestSha256: "8".repeat(64),
        rollbackTargetManifest: targetManifest,
        rollbackTargetManifestSha256:
          value.bindings.artifact_manifest_sha256,
        rollbackUpload: artifactUploadEvidence,
      }),
      value,
      authorityKey,
    });
    priorPromote.authorityKey = authorityKey;
  }
  const input = {
    profileArtifactAction: action,
    packet: value,
    baselineManifest,
    baselineManifestSha256: "8".repeat(64),
    targetManifest,
    targetManifestSha256: value.bindings.artifact_manifest_sha256,
    artifactUploadEvidence,
    priorPromoteExecutionReceiptBytes: priorPromote?.receiptBytes ?? null,
    priorPromoteExecutionReceiptAuthorityBytes:
      priorPromote?.authorityBytes ?? null,
    priorPromoteExecutionReceiptSignatureBytes:
      priorPromote?.signatureBytes ?? null,
    priorPromoteExecutionReceiptTrustRegistryBytes:
      priorPromote?.trustRegistryBytes ?? null,
    currentStack,
    trustRegistrySha256: "9".repeat(64),
    approvalId: "target-approval",
    owner: "lawos-owner",
    reviewDate: "2026-08-01",
    expirationDate: "2027-08-01",
    runtimeGeneration,
  };
  return {
    input,
    baselineManifest,
    targetManifest,
    currentStack,
    priorPromote,
  };
}

function profileArtifactTemplate() {
  return {
    Resources: Object.fromEntries([
      ["ApiFunction", "AWS::Lambda::Function"],
      ["AdminFunction", "AWS::Lambda::Function"],
      ["ProjectionAuditorFunction", "AWS::Lambda::Function"],
      ["ProjectionWorkerFunction", "AWS::Lambda::Function"],
      ["HttpApiIntegration", "AWS::ApiGatewayV2::Integration"],
      ["PasswordResetWorkerSchedule", "AWS::Events::Rule"],
      ["PasswordResetWorkerInvokePermission", "AWS::Lambda::Permission"],
      ["ProjectionWorkerSchedule", "AWS::Events::Rule"],
      ["ProjectionWorkerInvokePermission", "AWS::Lambda::Permission"],
      ["Database", "AWS::RDS::DBInstance"],
    ].map(([logicalId]) => [logicalId, {}])),
  };
}

function profileArtifactChangeSet(parameters) {
  return {
    StackName: JSON_POSTGRES_PRODUCTION_STACK,
    ChangeSetType: "UPDATE",
    ChangeSetId: "profile-artifact-change-set-1",
    Parameters: describedParameters(parameters),
    Changes: [
      ["ApiFunction", "AWS::Lambda::Function"],
      ["AdminFunction", "AWS::Lambda::Function"],
      ["ProjectionAuditorFunction", "AWS::Lambda::Function"],
      ["ProjectionWorkerFunction", "AWS::Lambda::Function"],
    ].map(([LogicalResourceId, ResourceType]) => ({
      ResourceChange: {
        Action: "Modify",
        LogicalResourceId,
        ResourceType,
        Replacement: "False",
        Scope: ["Properties"],
      },
    })),
  };
}

test("production caller must use the exact role chain", () => {
  assert.equal(assertJsonPostgresProductionCaller({
    Account: JSON_POSTGRES_PRODUCTION_ACCOUNT,
    Arn: `arn:aws:sts::${JSON_POSTGRES_PRODUCTION_ACCOUNT}:assumed-role/matter-prod-deploy-admin/codex`,
  }).role, "matter-prod-deploy-admin");
  assert.equal(assertJsonPostgresProductionCaller({
    Account: JSON_POSTGRES_PRODUCTION_ACCOUNT,
    Arn: `arn:aws:sts::${JSON_POSTGRES_PRODUCTION_ACCOUNT}:assumed-role/matter-cutover-operator/codex`,
  }, { role: "matter-cutover-operator" }).role, "matter-cutover-operator");
  assert.throws(() => assertJsonPostgresProductionCaller({
    Account: JSON_POSTGRES_PRODUCTION_ACCOUNT,
    Arn: `arn:aws:iam::${JSON_POSTGRES_PRODUCTION_ACCOUNT}:role/AdministratorAccess`,
  }), /exact assumed role/u);
  assert.throws(() => assertJsonPostgresProductionCaller({
    Account: JSON_POSTGRES_PRODUCTION_ACCOUNT,
    Arn: `arn:aws:sts::${JSON_POSTGRES_PRODUCTION_ACCOUNT}:assumed-role/matter-prod-deploy-admin/codex`,
  }, { role: "matter-cutover-operator" }), /matter-cutover-operator/u);
});

test("production stack parameters preserve exact packet, tenant, traffic and ENI boundaries", () => {
  const value = packet();
  assert.deepEqual(buildJsonPostgresArtifactStoreParameters({
    packet: value,
    owner: "lawos-owner",
    reviewDate: "2026-07-23",
  }), {
    ArtifactBucketName: "lawos-prod-artifacts-770880870480",
    SourceSha: "a".repeat(40),
    SourceTree: "b".repeat(40),
    ExecutionPacketSha256: "c".repeat(64),
    Owner: "lawos-owner",
    ReviewDate: "2026-07-23",
  });
  const parameters = buildJsonPostgresProductionStackParameters({
    packet: value,
    artifactVersion: "version-1",
    trustRegistrySha256: "e".repeat(64),
    approvalId: "approval-1",
    owner: "lawos-owner",
    reviewDate: "2026-07-23",
    expirationDate: "2027-07-23",
    allowedOrigins: ["https://lawos.example"],
    passwordResetSesIdentityArn: "arn:aws:ses:ap-northeast-2:770880870480:identity/lawos.example",
    passwordResetFromEmail: "no-reply@lawos.example",
    primaryTenantId: "tenant-approved",
    runtimeGeneration: 1,
    enableLambdaEniBootstrap: true,
  });
  assert.equal(parameters.EnableProductionTraffic, "false");
  assert.equal(parameters.EnableLambdaEniBootstrap, "true");
  assert.equal(parameters.EnableProjectionWorker, "false");
  assert.equal(parameters.ProjectionWorkerEventJson, "{}");
  assert.equal(
    parameters.HrxProjectionMappingObjectKey,
    JSON_POSTGRES_DISABLED_HRX_MAPPING_OBJECT_KEY,
  );
  assert.equal(
    parameters.HrxProjectionValidationObjectKey,
    JSON_POSTGRES_DISABLED_HRX_VALIDATION_OBJECT_KEY,
  );
  assert.equal(parameters.ProjectionWorkerLagThresholdMs, "24");
  assert.equal(parameters.MonthlyCostCeilingKrw, "300000");
  assert.throws(() => buildJsonPostgresProductionStackParameters({
    ...parameters,
    packet: value,
    primaryTenantId: "tenant-unapproved",
  }), /primary tenant/u);
});

test("W15 worker event uses a compact exact immutable program-input locator", () => {
  const value = packet();
  value.target.program_input_expected_bucket_owner =
    JSON_POSTGRES_PRODUCTION_ACCOUNT;
  const digest = "f".repeat(64);
  const key =
    `program-input/${value.packet_sha256}/w15-worker-event/`
    + `${value.source_sha}/${digest}.json`;
  const locator = createJsonPostgresProductionWorkerEventLocator({
    packet: value,
    key,
    versionId: "worker-event-version-001",
    sha256: digest,
    byteSize: 8234,
  });
  assert.equal(locator.key, key);
  assert.equal(locator.byte_size, 8234);
  assert.ok(Buffer.byteLength(JSON.stringify(locator)) < 4096);
  for (const overrides of [
    { key: `program-input/${value.packet_sha256}/other/${digest}.json` },
    { versionId: "null" },
    { sha256: "not-a-digest" },
    { byteSize: 0 },
  ]) {
    assert.throws(
      () => createJsonPostgresProductionWorkerEventLocator({
        packet: value,
        key,
        versionId: "worker-event-version-001",
        sha256: digest,
        byteSize: 8234,
        ...overrides,
      }),
      /worker event locator/u,
    );
  }
});

test("production change-set review rejects removals and unsafe replacements", () => {
  const template = { Resources: { ApiFunction: {}, Database: {} } };
  const expectedParameters = { DeploymentMode: "exact" };
  const parametersSha256 =
    jsonPostgresProductionParametersSha256(expectedParameters);
  const base = {
    StackName: JSON_POSTGRES_PRODUCTION_STACK,
    ChangeSetId: "change-set-1",
    Parameters: describedParameters(expectedParameters),
    Changes: [
      { ResourceChange: { Action: "Add", LogicalResourceId: "ApiFunction", ResourceType: "AWS::Lambda::Function", Replacement: "False" } },
      { ResourceChange: { Action: "Add", LogicalResourceId: "Database", ResourceType: "AWS::RDS::DBInstance", Replacement: "False" } },
    ],
  };
  const result = validateJsonPostgresProductionChangeSet(base, {
    stackName: JSON_POSTGRES_PRODUCTION_STACK,
    changeSetType: "CREATE",
    template,
    expectedParameters,
    parametersSha256,
    templateSha256: "b".repeat(64),
  });
  assert.equal(result.change_count, 2);
  assert.throws(() => validateJsonPostgresProductionChangeSet({
    ...base,
    ChangeSetType: "UPDATE",
  }, {
    stackName: JSON_POSTGRES_PRODUCTION_STACK,
    changeSetType: "CREATE",
    template,
    expectedParameters,
    parametersSha256,
    templateSha256: "b".repeat(64),
  }), /binding is invalid/u);
  const unsafe = structuredClone(base);
  unsafe.ChangeSetType = "UPDATE";
  unsafe.Changes[0].ResourceChange.Action = "Remove";
  assert.throws(() => validateJsonPostgresProductionChangeSet(unsafe, {
    stackName: JSON_POSTGRES_PRODUCTION_STACK,
    changeSetType: "UPDATE",
    template,
    expectedParameters,
    parametersSha256,
    templateSha256: "b".repeat(64),
  }), /may not add or remove/u);
  const replacement = structuredClone(base);
  replacement.Changes[1].ResourceChange.Replacement = "True";
  assert.throws(() => validateJsonPostgresProductionChangeSet(replacement, {
    stackName: JSON_POSTGRES_PRODUCTION_STACK,
    changeSetType: "CREATE",
    template,
    expectedParameters,
    parametersSha256,
    templateSha256: "b".repeat(64),
  }), /unapproved replacement/u);
  const versionedTemplateUrl =
    "https://lawos-production-artifacts-770880870480"
    + ".s3.ap-northeast-2.amazonaws.com/cloudformation-template/exact.json"
    + "?versionId=version-1";
  const versionBound = { ...base };
  assert.equal(
    validateJsonPostgresProductionChangeSet(versionBound, {
      stackName: JSON_POSTGRES_PRODUCTION_STACK,
      changeSetType: "CREATE",
      template,
      expectedParameters,
      parametersSha256,
      templateSha256: "b".repeat(64),
      templateUrl: versionedTemplateUrl,
    }).template_url,
    versionedTemplateUrl,
  );
  assert.throws(
    () => validateJsonPostgresProductionChangeSet(versionBound, {
      stackName: JSON_POSTGRES_PRODUCTION_STACK,
      changeSetType: "CREATE",
      template,
      expectedParameters,
      parametersSha256,
      templateSha256: "b".repeat(64),
      templateUrl: versionedTemplateUrl.split("?")[0],
    }),
    /binding is invalid/u,
  );
  assert.equal(JSON_POSTGRES_PRODUCTION_ARTIFACT_STACK, "lawos-production-artifact-store");
});

test("change-set parameters require exact explicit closed observations", () => {
  const expected = {
    AllowedOrigins: "https://lawos.example",
    ArtifactVersion: "immutable-version-a",
  };
  const changeSet = { Parameters: describedParameters(expected) };
  assert.equal(
    validateObservedChangeSetParameters(changeSet, expected)
      .observed_parameters_sha256,
    jsonPostgresProductionParametersSha256(expected),
  );
  for (const mutate of [
    (value) => {
      value.Parameters[0].ParameterValue = "https://evil.example";
    },
    (value) => {
      value.Parameters[1].ParameterValue = "immutable-version-b";
    },
    (value) => {
      value.Parameters[1].ParameterKey = "AllowedOrigins";
    },
    (value) => {
      value.Parameters.pop();
    },
    (value) => {
      value.Parameters.push({ ParameterKey: "Extra", ParameterValue: "x" });
    },
    (value) => {
      value.Parameters[0].UsePreviousValue = true;
    },
    (value) => {
      value.Parameters[0].ResolvedValue = "https://evil.example";
    },
    (value) => {
      value.Parameters[0].Unexpected = "x";
    },
    (value) => {
      delete value.Parameters[0].ParameterValue;
    },
  ]) {
    const adversary = structuredClone(changeSet);
    mutate(adversary);
    assert.throws(
      () => validateObservedChangeSetParameters(adversary, expected),
      /parameters/u,
    );
  }
});

test("W15 update review permits only bounded projection additions and exact supporting modifications", () => {
  const expectedParameters = { ProjectionMode: "exact" };
  const parametersSha256 =
    jsonPostgresProductionParametersSha256(expectedParameters);
  const template = {
    Resources: {
      ApiFunction: {},
      ProjectionWorkerExecutionRole: {},
      ProjectionWorkerDeadLetterAlarm: {},
      ProjectionWorkerDeadLetterQueue: {},
      ProjectionWorkerDeadLetterQueuePolicy: {},
      ProjectionWorkerDeliveryFailureAlarm: {},
      ProjectionWorkerErrorAlarm: {},
      ProjectionWorkerEventInvokeConfig: {},
      ProjectionWorkerFunction: {},
      ProjectionWorkerSchedule: {},
      ProjectionWorkerInvokePermission: {},
      ProjectionWorkerLagAlarm: {},
      Database: {},
    },
  };
  const changeSet = {
    StackName: JSON_POSTGRES_PRODUCTION_STACK,
    ChangeSetType: "UPDATE",
    ChangeSetId: "w15-change-set-1",
    Parameters: describedParameters(expectedParameters),
    Changes: [
      {
        ResourceChange: {
          Action: "Modify",
          LogicalResourceId: "ApiFunction",
          ResourceType: "AWS::Lambda::Function",
          Replacement: "False",
        },
      },
      ...[
        ["ProjectionWorkerExecutionRole", "AWS::IAM::Role", "False"],
        ["ProjectionWorkerDeadLetterAlarm", "AWS::CloudWatch::Alarm", "False"],
        ["ProjectionWorkerDeadLetterQueue", "AWS::SQS::Queue", "False"],
        [
          "ProjectionWorkerDeadLetterQueuePolicy",
          "AWS::SQS::QueuePolicy",
          "False",
        ],
        [
          "ProjectionWorkerDeliveryFailureAlarm",
          "AWS::CloudWatch::Alarm",
          "False",
        ],
        ["ProjectionWorkerErrorAlarm", "AWS::CloudWatch::Alarm", "False"],
        [
          "ProjectionWorkerEventInvokeConfig",
          "AWS::Lambda::EventInvokeConfig",
          "False",
        ],
        ["ProjectionWorkerFunction", "AWS::Lambda::Function", "False"],
        ["ProjectionWorkerLagAlarm", "AWS::CloudWatch::Alarm", "False"],
        ["ProjectionWorkerSchedule", "AWS::Events::Rule", "Conditional"],
        [
          "ProjectionWorkerInvokePermission",
          "AWS::Lambda::Permission",
          "Conditional",
        ],
      ].map(([LogicalResourceId, ResourceType, Replacement]) => ({
        ResourceChange: {
          Action: "Add",
          LogicalResourceId,
          ResourceType,
          Replacement,
        },
      })),
    ],
  };
  const reviewed = validateJsonPostgresW15ProductionChangeSet(changeSet, {
    template,
    expectedParameters,
    parametersSha256,
    templateSha256: "b".repeat(64),
  });
  assert.equal(reviewed.add_count, 11);
  assert.equal(reviewed.modify_count, 1);
  const database = structuredClone(changeSet);
  database.Changes.push({
    ResourceChange: {
      Action: "Modify",
      LogicalResourceId: "Database",
      ResourceType: "AWS::RDS::DBInstance",
      Replacement: "False",
    },
  });
  assert.throws(
    () => validateJsonPostgresW15ProductionChangeSet(database, {
      template,
      expectedParameters,
      parametersSha256,
      templateSha256: "b".repeat(64),
    }),
    /unapproved resource change/u,
  );
  const replacement = structuredClone(changeSet);
  replacement.Changes[1].ResourceChange.Replacement = "True";
  assert.throws(
    () => validateJsonPostgresW15ProductionChangeSet(replacement, {
      template,
      expectedParameters,
      parametersSha256,
      templateSha256: "b".repeat(64),
    }),
    /unapproved resource change/u,
  );
});

test("W15 worker observability binds delivery and execution retries to one empty encrypted DLQ", () => {
  const ruleArn =
    "arn:aws:events:ap-northeast-2:770880870480:"
    + "rule/lawos-production-projection-worker";
  const functionArn =
    "arn:aws:lambda:ap-northeast-2:770880870480:"
    + "function:lawos-production-projection-worker";
  const queueArn =
    "arn:aws:sqs:ap-northeast-2:770880870480:"
    + "lawos-production-projection-worker-dead-letter";
  const queueUrl =
    "https://sqs.ap-northeast-2.amazonaws.com/770880870480/"
    + "lawos-production-projection-worker-dead-letter";
  const observation = {
    rule: {
      Name: "lawos-production-projection-worker",
      Arn: ruleArn,
    },
    targets: {
      Targets: [{
        Id: "lawos-production-projection-worker",
        Arn: functionArn,
        RetryPolicy: {
          MaximumEventAgeInSeconds: 900,
          MaximumRetryAttempts: 2,
        },
        DeadLetterConfig: { Arn: queueArn },
      }],
    },
    invokeConfig: {
      FunctionArn: `${functionArn}:$LATEST`,
      MaximumEventAgeInSeconds: 900,
      MaximumRetryAttempts: 2,
      DestinationConfig: {
        OnFailure: { Destination: queueArn },
      },
    },
    queueUrl,
    queueAttributes: {
      Attributes: {
        QueueArn: queueArn,
        SqsManagedSseEnabled: "true",
        MessageRetentionPeriod: "1209600",
        ApproximateNumberOfMessages: "0",
        ApproximateNumberOfMessagesNotVisible: "0",
        Policy: JSON.stringify({
          Statement: [{
            Sid: "AllowExactProjectionWorkerScheduleDeliveryFailures",
            Effect: "Allow",
            Principal: { Service: "events.amazonaws.com" },
            Action: "sqs:SendMessage",
            Resource: queueArn,
            Condition: {
              ArnEquals: { "aws:SourceArn": ruleArn },
              StringEquals: {
                "aws:SourceAccount": JSON_POSTGRES_PRODUCTION_ACCOUNT,
              },
            },
          }],
        }),
      },
    },
    alarms: {
      MetricAlarms: [
        {
          AlarmName: "lawos-production-projection-worker-errors",
          Namespace: "AWS/Lambda",
          MetricName: "Errors",
          Threshold: 1,
          Dimensions: [{
            Name: "FunctionName",
            Value: "lawos-production-projection-worker",
          }],
          StateValue: "OK",
        },
        {
          AlarmName:
            "lawos-production-projection-worker-delivery-failures",
          Namespace: "AWS/Events",
          MetricName: "FailedInvocations",
          Threshold: 1,
          Dimensions: [{
            Name: "RuleName",
            Value: "lawos-production-projection-worker",
          }],
          StateValue: "INSUFFICIENT_DATA",
        },
        {
          AlarmName: "lawos-production-projection-worker-dead-letter",
          Namespace: "AWS/SQS",
          MetricName: "ApproximateNumberOfMessagesVisible",
          Threshold: 1,
          Dimensions: [{
            Name: "QueueName",
            Value: "lawos-production-projection-worker-dead-letter",
          }],
          StateValue: "OK",
        },
        {
          AlarmName: "lawos-production-projection-worker-lag",
          Namespace: "LawOS/W15",
          MetricName: "OutboxLagMilliseconds",
          Threshold: 24,
          Dimensions: [{
            Name: "Worker",
            Value: "relational-projection",
          }],
          StateValue: "OK",
        },
      ],
    },
  };
  assert.equal(
    validateJsonPostgresW15WorkerObservability(observation).verdict,
    "PASS",
  );
  const unsafeQueue = structuredClone(observation);
  unsafeQueue.queueAttributes.Attributes.Policy = JSON.stringify({
    Statement: [{
      ...JSON.parse(observation.queueAttributes.Attributes.Policy)
        .Statement[0],
      Principal: "*",
    }],
  });
  assert.throws(
    () => validateJsonPostgresW15WorkerObservability(unsafeQueue),
    /retry or dead-letter runtime drifted/u,
  );
  const alarmed = structuredClone(observation);
  alarmed.alarms.MetricAlarms[0].StateValue = "ALARM";
  assert.throws(
    () => validateJsonPostgresW15WorkerObservability(alarmed),
    /alarm state or contract drifted/u,
  );
});

test("artifact bucket and production stack observations are exact and fail closed", () => {
  const value = packet();
  const keyArn = "arn:aws:kms:ap-northeast-2:770880870480:key/key-1";
  const exactStoreOutputs = {
    ArtifactBucketName: value.target.artifact_bucket_name,
    ArtifactKmsKeyArn: keyArn,
    SourceSha: value.source_sha,
    SourceTree: value.source_tree,
    ExecutionPacketSha256: value.packet_sha256,
  };
  assert.equal(assertJsonPostgresArtifactStoreBinding({
    packet: value,
    outputs: exactStoreOutputs,
    sourceTreeMatches: true,
  }).exact_packet_binding, true);
  const ancestorStoreOutputs = {
    ...exactStoreOutputs,
    SourceSha: "e".repeat(40),
    SourceTree: "f".repeat(40),
    ExecutionPacketSha256: "1".repeat(64),
  };
  assert.equal(assertJsonPostgresArtifactStoreBinding({
    packet: value,
    outputs: ancestorStoreOutputs,
    sourceIsAncestor: true,
    sourceTreeMatches: true,
  }).reused_ancestor_store, true);
  assert.throws(() => assertJsonPostgresArtifactStoreBinding({
    packet: value,
    outputs: ancestorStoreOutputs,
    sourceIsAncestor: false,
    sourceTreeMatches: true,
  }), /binding drifted/u);
  assert.throws(() => assertJsonPostgresArtifactStoreBinding({
    packet: value,
    outputs: { ...exactStoreOutputs, ExecutionPacketSha256: "2".repeat(64) },
    sourceIsAncestor: true,
    sourceTreeMatches: true,
  }), /binding drifted/u);
  assert.equal(assertJsonPostgresArtifactBucketState({
    packet: value,
    expectedKmsKeyArn: keyArn,
    versioning: { Status: "Enabled" },
    publicAccess: { PublicAccessBlockConfiguration: {
      BlockPublicAcls: true,
      BlockPublicPolicy: true,
      IgnorePublicAcls: true,
      RestrictPublicBuckets: true,
    } },
    objectLock: { ObjectLockConfiguration: {
      ObjectLockEnabled: "Enabled",
      Rule: { DefaultRetention: { Mode: "COMPLIANCE", Days: 365 } },
    } },
    encryption: { ServerSideEncryptionConfiguration: {
      Rules: [{
        ApplyServerSideEncryptionByDefault: {
          SSEAlgorithm: "aws:kms",
          KMSMasterKeyID: keyArn,
        },
      }],
    } },
  }).verdict, "PASS");
  const stackParameters = buildJsonPostgresProductionStackParameters({
    packet: value,
    artifactVersion: "v1",
    trustRegistrySha256: "e".repeat(64),
    approvalId: "approval-1",
    owner: "lawos-owner",
    reviewDate: "2026-08-01",
    expirationDate: "2027-08-01",
    allowedOrigins: ["https://lawos.example"],
    passwordResetSesIdentityArn:
      "arn:aws:ses:ap-northeast-2:770880870480:identity/lawos.example",
    passwordResetFromEmail: "no-reply@lawos.example",
    primaryTenantId: "tenant-approved",
    runtimeGeneration: 1,
    enableLambdaEniBootstrap: false,
  });
  const stack = {
    StackStatus: "CREATE_COMPLETE",
    Parameters: describedParameters(stackParameters),
  };
  assert.equal(assertJsonPostgresProductionStack(stack, {
    packet: value,
    artifactVersion: "v1",
    trustRegistrySha256: "e".repeat(64),
  }).temporary_eni_allow_expected, 0);
  const trafficStack = structuredClone(stack);
  trafficStack.Parameters.find((entry) =>
    entry.ParameterKey === "EnableProductionTraffic").ParameterValue = "true";
  const goLive = assertJsonPostgresProductionStack(trafficStack, {
    packet: value,
    artifactVersion: "v1",
    trustRegistrySha256: "e".repeat(64),
    trafficEnabled: true,
  });
  assert.equal(goLive.traffic_enabled, true);
  assert.equal(goLive.temporary_eni_allow_expected, 0);
  const workerStack = structuredClone(trafficStack);
  const workerParameters = Object.fromEntries(
    workerStack.Parameters.map((entry) => [
      entry.ParameterKey,
      entry,
    ]),
  );
  workerParameters.EnableProjectionWorker.ParameterValue = "true";
  const workerEventSha256 = "9".repeat(64);
  workerParameters.ProjectionWorkerEventJson.ParameterValue =
    JSON.stringify({
      schema_version:
        "law-firm-os.immutable-program-input-locator.v1",
      bucket: value.target.program_input_bucket_name,
      key:
        `program-input/${value.packet_sha256}/w15-worker-event/`
        + `${value.source_sha}/${workerEventSha256}.json`,
      version_id: "worker-event-version-1",
      expected_bucket_owner:
        value.target.program_input_expected_bucket_owner,
      sha256: workerEventSha256,
      byte_size: 512,
    });
  workerParameters.HrxProjectionMappingObjectKey.ParameterValue =
    "program-input/exact/mapping.json";
  workerParameters.HrxProjectionValidationObjectKey.ParameterValue =
    "program-input/exact/validation.json";
  assert.equal(assertJsonPostgresProductionStack(workerStack, {
    packet: value,
    artifactVersion: "v1",
    trustRegistrySha256: "e".repeat(64),
    trafficEnabled: true,
    projectionWorkerEnabled: true,
  }).traffic_enabled, true);
  workerParameters.HrxProjectionMappingObjectKey.ParameterValue =
    JSON_POSTGRES_DISABLED_HRX_MAPPING_OBJECT_KEY;
  assert.throws(
    () => assertJsonPostgresProductionStack(workerStack, {
      packet: value,
      artifactVersion: "v1",
      trustRegistrySha256: "e".repeat(64),
      trafficEnabled: true,
      projectionWorkerEnabled: true,
    }),
    /projection runtime input binding drifted/u,
  );
});

test("profile artifact transition uses one exact-bound path for promote and rollback", () => {
  for (const fixture of [
    profileArtifactTransitionFixture({ action: "promote" }),
    profileArtifactTransitionFixture({
      action: "rollback",
      baselineArtifactDigit: "d",
      baselineProfileDigit: "7",
      targetArtifactDigit: "e",
      targetProfileDigit: "6",
      targetArtifactVersion: "prior-immutable-version-a",
    }),
  ]) {
    const before = Object.fromEntries(
      fixture.currentStack.Parameters.map((entry) => [
        entry.ParameterKey,
        entry.ParameterValue,
      ]),
    );
    const transition = buildJsonPostgresProfileArtifactTransition(
      fixture.input,
    );
    assert.equal(
      transition.evidence.profile_artifact_action,
      fixture.input.profileArtifactAction,
    );
    assert.equal(transition.evidence.production_traffic_enabled, true);
    assert.equal(transition.evidence.lambda_eni_bootstrap_enabled, false);
    assert.equal(transition.evidence.projection_worker_enabled, true);
    assert.deepEqual(transition.evidence.baseline_profile_counts, {
      private_manifest_entry_count: 10,
      injected_photo_entry_count: 10,
      git_source_photo_entry_count: 0,
    });
    assert.deepEqual(
      transition.evidence.target_profile_counts,
      transition.evidence.baseline_profile_counts,
    );
    assert.equal(transition.evidence.previous_runtime_generation, 7);
    assert.equal(transition.evidence.target_runtime_generation, 8);
    assert.equal(transition.evidence.production_data_write_count, 0);
    if (fixture.input.profileArtifactAction === "rollback") {
      assert.equal(
        transition.evidence.target_artifact_version,
        "prior-immutable-version-a",
      );
      assert.notEqual(
        transition.evidence.target_artifact_upload_packet_sha256,
        transition.evidence.target_execution_packet_sha256,
      );
      assert.equal(
        transition.evidence.target_artifact_upload_receipt_sha256,
        fixture.input.artifactUploadEvidence.result_sha256,
      );
      assert.equal(
        transition.evidence.prior_promote_execution_receipt_sha256,
        fixture.priorPromote.receipt.result_sha256,
      );
      assert.equal(
        transition.evidence
          .prior_promote_execution_receipt_trust_registry_sha256,
        fixture.priorPromote.authorityKey.trustRegistrySha256,
      );
      assert.equal(
        transition.evidence
          .prior_promote_execution_receipt_signer_key_id,
        fixture.priorPromote.authorityKey.keyId,
      );
    }
    for (const key of [
      "ArtifactBucket",
      "SourceSha",
      "SourceTree",
      "AllowedOrigins",
      "PasswordResetSesIdentityArn",
      "PasswordResetFromEmail",
      "ProgramInputBucketName",
      "DmsBucketName",
      "PrimaryTenantId",
      "EnableProductionTraffic",
      "EnableLambdaEniBootstrap",
      "EnableProjectionWorker",
      "ProjectionWorkerEventJson",
      "HrxProjectionMappingObjectKey",
      "HrxProjectionValidationObjectKey",
      "ProjectionWorkerLagThresholdMs",
      "MonthlyCostCeilingKrw",
    ]) {
      assert.equal(transition.parameters[key], before[key], key);
    }
    const targetStack = {
      StackStatus: "UPDATE_COMPLETE",
      Parameters: Object.entries(transition.parameters).map(
        ([ParameterKey, ParameterValue]) => ({
          ParameterKey,
          ParameterValue,
        }),
      ),
    };
    assert.equal(assertJsonPostgresProfileArtifactTargetStack(targetStack, {
      transition,
    }).artifact_version, transition.evidence.target_artifact_version);
  }
});

test("profile artifact transition rejects source, artifact, upload, stack, generation, traffic, and projection drift", () => {
  {
    const fixture = profileArtifactTransitionFixture();
    fixture.input.baselineManifest.source_sha = "f".repeat(40);
    assert.throws(
      () => buildJsonPostgresProfileArtifactTransition(fixture.input),
      /source binding drifted/u,
    );
  }
  {
    const fixture = profileArtifactTransitionFixture();
    fixture.input.targetManifest = structuredClone(
      fixture.input.baselineManifest,
    );
    fixture.input.packet.bindings.artifact_sha256 =
      fixture.input.targetManifest.artifact_sha256;
    fixture.input.artifactUploadEvidence.artifact_sha256 =
      fixture.input.targetManifest.artifact_sha256;
    fixture.input.artifactUploadEvidence.artifact_key =
      `lawos-production/${fixture.input.packet.source_sha}/`
      + `${fixture.input.targetManifest.artifact_sha256}.zip`;
    assert.throws(
      () => buildJsonPostgresProfileArtifactTransition(fixture.input),
      /must change artifact and profile generation/u,
    );
  }
  {
    const fixture = profileArtifactTransitionFixture();
    fixture.input.targetManifest.profile_photo_artifact.generation_ref =
      fixture.input.baselineManifest.profile_photo_artifact.generation_ref;
    fixture.input.targetManifest.profile_photo_artifact
      .private_manifest_sha256 = fixture.input.baselineManifest
        .profile_photo_artifact.private_manifest_sha256;
    assert.throws(
      () => buildJsonPostgresProfileArtifactTransition(fixture.input),
      /must change artifact and profile generation/u,
    );
  }
  for (const artifactVersion of ["", "null"]) {
    const fixture = profileArtifactTransitionFixture();
    fixture.input.artifactUploadEvidence.artifact_version = artifactVersion;
    assert.throws(
      () => buildJsonPostgresProfileArtifactTransition(fixture.input),
      /upload evidence is invalid/u,
    );
  }
  for (const [key, value] of [
    ["EnableProductionTraffic", "false"],
    ["EnableLambdaEniBootstrap", "true"],
  ]) {
    const fixture = profileArtifactTransitionFixture();
    fixture.input.currentStack.Parameters.find(
      (entry) => entry.ParameterKey === key,
    ).ParameterValue = value;
    assert.throws(
      () => buildJsonPostgresProfileArtifactTransition(fixture.input),
      /parameter .* drifted/u,
    );
  }
  {
    const fixture = profileArtifactTransitionFixture({
      runtimeGeneration: 9,
    });
    assert.throws(
      () => buildJsonPostgresProfileArtifactTransition(fixture.input),
      /advance by exactly one/u,
    );
  }
  {
    const fixture = profileArtifactTransitionFixture();
    fixture.input.currentStack.Parameters.find(
      (entry) => entry.ParameterKey === "ArtifactKey",
    ).ParameterValue = "lawos-production/" + "f".repeat(40)
      + "/" + "0".repeat(64) + ".zip";
    assert.throws(
      () => buildJsonPostgresProfileArtifactTransition(fixture.input),
      /baseline stack binding drifted/u,
    );
  }
  {
    const fixture = profileArtifactTransitionFixture();
    fixture.input.currentStack.Parameters.find(
      (entry) => entry.ParameterKey === "ArtifactVersion",
    ).ParameterValue = "null";
    assert.throws(
      () => buildJsonPostgresProfileArtifactTransition(fixture.input),
      /baseline stack binding drifted/u,
    );
  }
  for (const mutate of [
    (parameters) => parameters.pop(),
    (parameters) => parameters.push(structuredClone(parameters[0])),
    (parameters) => {
      parameters[0].ParameterKey = "UnexpectedParameter";
    },
  ]) {
    const fixture = profileArtifactTransitionFixture();
    mutate(fixture.input.currentStack.Parameters);
    assert.throws(
      () => buildJsonPostgresProfileArtifactTransition(fixture.input),
      /parameter inventory drifted/u,
    );
  }
  {
    const fixture = profileArtifactTransitionFixture();
    fixture.input.approvalId = "baseline-approval";
    assert.throws(
      () => buildJsonPostgresProfileArtifactTransition(fixture.input),
      /baseline stack binding drifted/u,
    );
  }
  {
    const fixture = profileArtifactTransitionFixture({
      action: "rollback",
      baselineArtifactDigit: "d",
      baselineProfileDigit: "7",
      targetArtifactDigit: "e",
      targetProfileDigit: "6",
      targetArtifactVersion: "prior-immutable-version-a",
    });
    fixture.input.priorPromoteExecutionReceiptBytes = null;
    assert.throws(
      () => buildJsonPostgresProfileArtifactTransition(fixture.input),
      /prior profile artifact promote receipt bytes/u,
    );
  }
  {
    const fixture = profileArtifactTransitionFixture({
      action: "rollback",
      baselineArtifactDigit: "d",
      baselineProfileDigit: "7",
      targetArtifactDigit: "e",
      targetProfileDigit: "6",
      targetArtifactVersion: "prior-immutable-version-a",
    });
    const authority = structuredClone(fixture.priorPromote.authority);
    authority.signer_fingerprint_sha256 = "0".repeat(64);
    replaceProfileArtifactPromoteAuthority(fixture, authority);
    assert.throws(
      () => buildJsonPostgresProfileArtifactTransition(fixture.input),
      /receipt authority signature/u,
    );
  }
  {
    const fixture = profileArtifactTransitionFixture({
      action: "rollback",
      baselineArtifactDigit: "d",
      baselineProfileDigit: "7",
      targetArtifactDigit: "e",
      targetProfileDigit: "6",
      targetArtifactVersion: "prior-immutable-version-a",
    });
    const authority = structuredClone(fixture.priorPromote.authority);
    authority.source_sha = "f".repeat(40);
    replaceProfileArtifactPromoteAuthority(fixture, authority);
    assert.throws(
      () => buildJsonPostgresProfileArtifactTransition(fixture.input),
      /receipt authority binding/u,
    );
  }
  {
    const fixture = profileArtifactTransitionFixture({
      action: "rollback",
      baselineArtifactDigit: "d",
      baselineProfileDigit: "7",
      targetArtifactDigit: "e",
      targetProfileDigit: "6",
      targetArtifactVersion: "prior-immutable-version-a",
    });
    const { publicKey, privateKey } = generateKeyPairSync("ed25519");
    const authority = structuredClone(fixture.priorPromote.authority);
    authority.signer_key_id = "caller-selected-wrong-key";
    authority.signer_fingerprint_sha256 = sha256(publicKey.export({
      type: "spki",
      format: "der",
    }));
    replaceProfileArtifactPromoteAuthority(fixture, authority, privateKey);
    assert.throws(
      () => buildJsonPostgresProfileArtifactTransition(fixture.input),
      /receipt authority key/u,
    );
  }
  {
    const fixture = profileArtifactTransitionFixture({
      action: "rollback",
      baselineArtifactDigit: "d",
      baselineProfileDigit: "7",
      targetArtifactDigit: "e",
      targetProfileDigit: "6",
      targetArtifactVersion: "prior-immutable-version-a",
    });
    const attacker = profileArtifactPromoteAuthorityKey();
    const authority = structuredClone(fixture.priorPromote.authority);
    authority.trust_registry_sha256 = attacker.trustRegistrySha256;
    authority.signer_key_id = attacker.keyId;
    authority.signer_fingerprint_sha256 = sha256(attacker.publicKey.export({
      type: "spki",
      format: "der",
    }));
    fixture.input.priorPromoteExecutionReceiptTrustRegistryBytes =
      attacker.trustRegistryBytes;
    replaceProfileArtifactPromoteAuthority(
      fixture,
      authority,
      attacker.privateKey,
    );
    assert.throws(
      () => buildJsonPostgresProfileArtifactTransition(fixture.input),
      /receipt authority binding/u,
    );
  }
  {
    const fixture = profileArtifactTransitionFixture({
      action: "rollback",
      baselineArtifactDigit: "d",
      baselineProfileDigit: "7",
      targetArtifactDigit: "e",
      targetProfileDigit: "6",
      targetArtifactVersion: "newly-reuploaded-version-a",
    });
    const forged = structuredClone(fixture.priorPromote.receipt);
    forged.baseline_artifact_version = "prior-immutable-version-a";
    forged.result_sha256 =
      jsonPostgresProductionInfrastructureResultSha256(forged);
    fixture.input.priorPromoteExecutionReceiptBytes = Buffer.from(
      `${JSON.stringify(forged, null, 2)}\n`,
    );
    assert.throws(
      () => buildJsonPostgresProfileArtifactTransition(fixture.input),
      /prior profile artifact promote receipt authority binding/u,
    );
  }
  {
    const fixture = profileArtifactTransitionFixture({
      action: "rollback",
      baselineArtifactDigit: "d",
      baselineProfileDigit: "7",
      targetArtifactDigit: "e",
      targetProfileDigit: "6",
      targetArtifactVersion: "prior-immutable-version-a",
    });
    const forged = structuredClone(fixture.priorPromote.receipt);
    forged.target_runtime_generation += 1;
    forged.result_sha256 =
      jsonPostgresProductionInfrastructureResultSha256(forged);
    fixture.input.priorPromoteExecutionReceiptBytes = Buffer.from(
      `${JSON.stringify(forged, null, 2)}\n`,
    );
    assert.throws(
      () => buildJsonPostgresProfileArtifactTransition(fixture.input),
      /prior profile artifact promote receipt authority binding/u,
    );
  }
  {
    const fixture = profileArtifactTransitionFixture({
      action: "rollback",
      baselineArtifactDigit: "d",
      baselineProfileDigit: "7",
      targetArtifactDigit: "e",
      targetProfileDigit: "6",
      targetArtifactVersion: "prior-immutable-version-a",
    });
    fixture.input.approvalId = "prior-a-approval";
    assert.throws(
      () => buildJsonPostgresProfileArtifactTransition(fixture.input),
      /prior profile artifact promote receipt lineage/u,
    );
  }
});

test("profile artifact review rejects database, extra, replacement, stale, action, target, and receipt-hash drift", () => {
  const fixture = profileArtifactTransitionFixture();
  const transition = buildJsonPostgresProfileArtifactTransition(fixture.input);
  const template = profileArtifactTemplate();
  const changeSet = profileArtifactChangeSet(transition.parameters);
  const changeReview = validateJsonPostgresProfileArtifactChangeSet(
    changeSet,
    {
      template,
      expectedParameters: transition.parameters,
      parametersSha256: transition.evidence.target_parameters_sha256,
      templateSha256: "a".repeat(64),
      profileArtifactAction: "promote",
      profileArtifactTransitionSha256:
        transition.evidence.profile_artifact_transition_sha256,
    },
  );
  const uploadVersion = {
    target_artifact_version_verified: true,
    target_artifact_version_head_verified_count: 1,
    target_artifact_version: transition.evidence.target_artifact_version,
    target_artifact_object_lock_mode: "COMPLIANCE",
    target_artifact_server_side_encryption: "aws:kms",
    target_artifact_kms_key_ref_sha256: "c".repeat(64),
  };
  const review = {
    schema_version:
      "law-firm-os.json-postgres-production-reviewed-change-set.v1",
    operation: "create-profile-artifact-change-set",
    outcome: "PASS",
    ...changeReview,
    ...transition.evidence,
    ...uploadVersion,
    artifact_version: transition.evidence.target_artifact_version,
    aws_mutation_count: 1,
    production_write_count: 0,
  };
  review.result_sha256 =
    jsonPostgresProductionInfrastructureResultSha256(review);
  assert.equal(assertJsonPostgresProfileArtifactReviewedChangeSet(review, {
    transition,
    template,
    uploadVersion,
  }).verdict, "PASS");

  for (const [key, value] of [
    ["AllowedOrigins", "https://evil.example"],
    ["ArtifactVersion", "malicious-version"],
  ]) {
    const adversary = structuredClone(changeSet);
    adversary.Parameters.find((entry) => entry.ParameterKey === key)
      .ParameterValue = value;
    assert.throws(
      () => validateJsonPostgresProfileArtifactChangeSet(adversary, {
        template,
        expectedParameters: transition.parameters,
        parametersSha256: transition.evidence.target_parameters_sha256,
        templateSha256: "a".repeat(64),
        profileArtifactAction: "promote",
        profileArtifactTransitionSha256:
          transition.evidence.profile_artifact_transition_sha256,
      }),
      /parameters drifted/u,
    );
  }

  for (const mutate of [
    (value) => value.Changes.push({
      ResourceChange: {
        Action: "Modify",
        LogicalResourceId: "Database",
        ResourceType: "AWS::RDS::DBInstance",
        Replacement: "False",
        Scope: ["Properties"],
      },
    }),
    (value) => {
      value.Changes[0].ResourceChange.Replacement = "True";
    },
    (value) => {
      value.Changes[0].ResourceChange.LogicalResourceId = "UnknownResource";
    },
  ]) {
    const adversary = structuredClone(changeSet);
    mutate(adversary);
    assert.throws(
      () => validateJsonPostgresProfileArtifactChangeSet(adversary, {
        template,
        expectedParameters: transition.parameters,
        parametersSha256: transition.evidence.target_parameters_sha256,
        templateSha256: "a".repeat(64),
        profileArtifactAction: "promote",
        profileArtifactTransitionSha256:
          transition.evidence.profile_artifact_transition_sha256,
      }),
      /unapproved resource change/u,
    );
  }

  const stale = profileArtifactTransitionFixture();
  stale.input.currentStack.Parameters.find(
    (entry) => entry.ParameterKey === "ArtifactVersion",
  ).ParameterValue = "new-baseline-version";
  const staleTransition = buildJsonPostgresProfileArtifactTransition(
    stale.input,
  );
  assert.throws(
    () => assertJsonPostgresProfileArtifactReviewedChangeSet(review, {
      transition: staleTransition,
      template,
      uploadVersion,
    }),
    /binding is invalid/u,
  );

  const projectionDrift = profileArtifactTransitionFixture();
  const projectionParameters = Object.fromEntries(
    projectionDrift.input.currentStack.Parameters.map((entry) => [
      entry.ParameterKey,
      entry,
    ]),
  );
  projectionParameters.EnableProjectionWorker.ParameterValue = "false";
  projectionParameters.ProjectionWorkerEventJson.ParameterValue = "{}";
  projectionParameters.HrxProjectionMappingObjectKey.ParameterValue =
    JSON_POSTGRES_DISABLED_HRX_MAPPING_OBJECT_KEY;
  projectionParameters.HrxProjectionValidationObjectKey.ParameterValue =
    JSON_POSTGRES_DISABLED_HRX_VALIDATION_OBJECT_KEY;
  const projectionTransition = buildJsonPostgresProfileArtifactTransition(
    projectionDrift.input,
  );
  assert.throws(
    () => assertJsonPostgresProfileArtifactReviewedChangeSet(review, {
      transition: projectionTransition,
      template,
      uploadVersion,
    }),
    /binding is invalid/u,
  );

  for (const mutate of [
    (value) => {
      value.profile_artifact_action = "rollback";
    },
    (value) => {
      value.target_artifact_sha256 = "0".repeat(64);
    },
    (value) => {
      value.reviewed_change_set_sha256 = "0".repeat(64);
    },
    (value) => {
      value.result_sha256 = "0".repeat(64);
    },
    (value) => {
      value.target_artifact_server_side_encryption = "AES256";
    },
    (value) => {
      value.target_artifact_kms_key_ref_sha256 = "0".repeat(64);
    },
  ]) {
    const adversary = structuredClone(review);
    mutate(adversary);
    assert.throws(
      () => assertJsonPostgresProfileArtifactReviewedChangeSet(adversary, {
        transition,
        template,
        uploadVersion,
      }),
      /binding is invalid|hash drifted/u,
    );
  }
});

test("profile artifact runner exposes reviewed promote and rollback operations without direct Lambda mutation", () => {
  const source = readFileSync(
    "scripts/run-json-postgres-production-infrastructure.mjs",
    "utf8",
  );
  assert.match(source, /"create-profile-artifact-change-set"/u);
  assert.match(source, /"execute-profile-artifact-change-set"/u);
  assert.match(source, /requiredOption\("--baseline-artifact-manifest"\)/u);
  assert.match(
    source,
    /requiredOption\("--prior-profile-artifact-promote-receipt"\)/u,
  );
  assert.match(
    source,
    /--prior-profile-artifact-promote-receipt-authority/u,
  );
  assert.match(
    source,
    /--prior-profile-artifact-promote-receipt-signature/u,
  );
  assert.match(
    source,
    /--prior-profile-artifact-promote-receipt-trust-registry/u,
  );
  assert.match(
    source,
    /priorPromoteExecutionReceiptTrustRegistryBytes/u,
  );
  assert.match(source, /requiredOption\(\s*"--profile-artifact-action"/u);
  assert.match(source, /new URL\("\.\.\/", import\.meta\.url\)/u);
  assert.match(source, /cwd must be its repository root/u);
  assert.match(source, /buildJsonPostgresProfileArtifactTransition/u);
  assert.match(source, /assertJsonPostgresProfileArtifactReviewedChangeSet/u);
  assert.match(source, /assertJsonPostgresProfileArtifactTargetStack/u);
  assert.match(source, /profileArtifact\.profileArtifactAction/u);
  assert.doesNotMatch(
    source,
    /"lambda",\s*"update-function-(?:code|configuration)"/u,
  );
});

test("combined template and parameter digests are deterministic", () => {
  assert.equal(
    jsonPostgresProductionCombinedTemplateSha256({
      artifactStoreTemplate: { b: 2 },
      productionTemplate: { a: 1 },
    }),
    jsonPostgresProductionCombinedTemplateSha256({
      productionTemplate: { a: 1 },
      artifactStoreTemplate: { b: 2 },
    }),
  );
  assert.equal(
    jsonPostgresProductionParametersSha256({ b: 2, a: 1 }),
    jsonPostgresProductionParametersSha256({ a: 1, b: 2 }),
  );
});
