import { createHash } from "node:crypto";

import {
  COLD_START_SCHEMA,
  PERCENTILE_METHOD,
  REQUIRED_RUN_COUNT,
  validateColdStartReceiptAuthoritatively,
} from "./matter-desktop-cold-start-contract.mjs";
import {
  validateFormalPackageLoopbackNativeQaCapability,
  validateFormalPackageLoopbackQaReceipt,
} from "./formal-package-loopback-evidence.mjs";
import { validateFormalPackageLoopbackTranscript } from "./formal-package-loopback-transcript.mjs";
import { readAndValidateProfileMediaAdminGoal } from "./profile-media-admin-goal.mjs";
import { assertNoPrivateMaterial } from "./profile-media-evidence-shared.mjs";
import { validateTestOnlyProfileMediaMeasurementReceipt } from "./profile-media-measurement-validator.mjs";
import {
  RF13_OPERATIONAL_ATTESTATION_POLICIES,
  readRf13OperationalContentReference,
  validateRf13OperationalPinnedContent,
  validateRf13ProfileMeasurementAttestation,
  validateRf13ProfileMetrics,
  validateRf13ReceiptAttestation,
} from "./matter-rf13-operational-attestation.mjs";
import {
  jsonPostgresProductionInfrastructureResultSha256,
  verifyJsonPostgresProfileArtifactPromoteReceiptAuthority,
} from "./json-postgres-production-execution.mjs";
import {
  isProfileMediaDeferEligible,
  validateProfileMediaDecision,
} from "../validate-profile-media-operability-decision.mjs";

export const RF13_WEB_FULL_RECEIPT_SCHEMA = "law-firm-os.rf13.web-full-navigation.v1";
export const RF13_PROFILE_MEASUREMENT_RECEIPT_SCHEMA = "law-firm-os.profile-media-operability-measurement.production.v1";
export const RF13_PROFILE_OPERATION_RECEIPT_SCHEMA = "law-firm-os.profile-media-api-operation.v4";

const SHA256 = /^[a-f0-9]{64}$/u;
const PROFILE_GENERATION_REF = /^profile_generation_[a-f0-9]{32}$/u;
const APPROVED_AT_REST_ENCRYPTION = new Set(["AWS_KMS"]);
const PROFILE_PRODUCTION_API_SMOKE_SCHEMA = "law-firm-os.profile-production-api-smoke.v1";
const PROFILE_CHANGE_SET_REVIEW_SCHEMA = "law-firm-os.json-postgres-production-reviewed-change-set.v1";
const PROFILE_CHANGE_SET_EXECUTION_SCHEMA = "law-firm-os.json-postgres-production-infrastructure-result.v1";
const SAFE_CONTENT_PATH = /^[A-Za-z0-9._/-]+$/u;
const PRIOR_PROMOTE_RECEIPT_FIELDS = Object.freeze([
  "prior_promote_execution_receipt_sha256",
  "prior_promote_execution_receipt_bytes_sha256",
  "prior_promote_execution_receipt_authority_sha256",
  "prior_promote_execution_receipt_signature_sha256",
  "prior_promote_execution_receipt_trust_registry_sha256",
  "prior_promote_execution_receipt_signer_key_id",
  "prior_promote_execution_receipt_signer_fingerprint_sha256",
  "prior_promote_execution_receipt_authority_signed_at",
]);
const ACCEPTED_PROFILE_MEASUREMENTS = new WeakSet();
const ACCEPTED_PROFILE_OPERATIONS = new WeakSet();

export class Rf13OperationalEvidenceError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "Rf13OperationalEvidenceError";
    this.code = code;
  }
}

function fail(code, message) {
  throw new Rf13OperationalEvidenceError(code, message);
}

function record(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail("RFD_OPERATIONAL_RECEIPT_INVALID", `${label} must be an object`);
  return value;
}

function exactKeys(value, expected, label) {
  record(value, label);
  const actual = Object.keys(value).toSorted();
  if (JSON.stringify(actual) !== JSON.stringify([...expected].toSorted())) {
    fail("RFD_OPERATIONAL_RECEIPT_INVALID", `${label} fields do not match the closed schema`);
  }
}

function sameSource(receiptSource, expectedSource) {
  return receiptSource?.source_sha === expectedSource?.sha
    && receiptSource?.source_tree === expectedSource?.tree
    && receiptSource?.source_dirty === false
    && expectedSource?.dirty === false;
}

function attestationSource(receiptSource) {
  return Object.freeze({ sha: receiptSource.sha, tree: receiptSource.tree, dirty: receiptSource.dirty });
}

function attestationReference(reference, schemaVersion) {
  return Object.freeze({ ...reference, schema_version: schemaVersion });
}

function parseTimestamp(value, label) {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString() !== value) {
    fail("RFD_OPERATIONAL_RECEIPT_INVALID", `${label} must be an ISO timestamp`);
  }
  return parsed;
}

function validatePinnedBinaryContent(reference, bytes, { label, exactBytes = null, maxBytes }) {
  exactKeys(reference, ["path", "sha256", "bytes"], `${label} reference`);
  if (typeof reference.path !== "string"
    || !SAFE_CONTENT_PATH.test(reference.path)
    || reference.path.startsWith("/")
    || reference.path.includes("\\")
    || reference.path.split("/").some((part) => !part || part === "." || part === "..")
    || !SHA256.test(reference.sha256)
    || !Number.isSafeInteger(reference.bytes)
    || reference.bytes < 1
    || reference.bytes > maxBytes
    || (exactBytes !== null && reference.bytes !== exactBytes)
    || !Buffer.isBuffer(bytes)
    || bytes.length !== reference.bytes
    || createHash("sha256").update(bytes).digest("hex") !== reference.sha256) {
    fail("RFD041_PROFILE_OPERATION_RECEIPT_INVALID", `${label} bytes do not match the signed content reference`);
  }
  return bytes;
}

function validatePriorPromoteExecutionAuthority({
  references,
  pinned,
  promoteExecution,
  rollbackReview,
  source,
  expectedTrustRegistrySha256,
}) {
  exactKeys(references, ["authority", "signature", "trust_registry"], "prior promote execution authority references");
  exactKeys(pinned, ["authorityBytes", "signatureBytes", "trustRegistryBytes"], "pinned prior promote execution authority");
  const authorityBytes = validatePinnedBinaryContent(references.authority, pinned.authorityBytes, {
    label: "prior promote execution authority",
    maxBytes: 256 * 1024,
  });
  const signatureBytes = validatePinnedBinaryContent(references.signature, pinned.signatureBytes, {
    label: "prior promote execution signature",
    exactBytes: 64,
    maxBytes: 64,
  });
  const trustRegistryBytes = validatePinnedBinaryContent(references.trust_registry, pinned.trustRegistryBytes, {
    label: "prior promote execution trust registry",
    maxBytes: 1024 * 1024,
  });
  let authentication;
  try {
    authentication = verifyJsonPostgresProfileArtifactPromoteReceiptAuthority({
      receiptBytes: promoteExecution.bytes,
      authorityBytes,
      signatureBytes,
      trustRegistryBytes,
      expectedTrustRegistrySha256,
      expectedSourceSha: source.sha,
      expectedSourceTree: source.tree,
      now: rollbackReview.generated_at,
    });
  } catch {
    fail("RFD041_PROFILE_OPERATION_FAILED", "prior promote execution receipt authority is invalid");
  }
  if (authentication.receipt?.schema_version !== PROFILE_CHANGE_SET_EXECUTION_SCHEMA
    || authentication.receipt?.profile_artifact_action !== "promote"
    || authentication.receipt_authority_sha256 !== references.authority.sha256
    || authentication.receipt_signature_sha256 !== references.signature.sha256
    || authentication.receipt_trust_registry_sha256 !== references.trust_registry.sha256) {
    fail("RFD041_PROFILE_OPERATION_FAILED", "prior promote execution authority does not bind the accepted promote receipt");
  }
  return authentication;
}

function validateProfileArtifactDescriptor(value, label) {
  exactKeys(value, ["filename", "sha256", "bytes", "generation_ref"], label);
  if (typeof value.filename !== "string"
    || !/^[A-Za-z0-9._-]+\.zip$/u.test(value.filename)
    || !SHA256.test(value.sha256)
    || !Number.isSafeInteger(value.bytes)
    || value.bytes < 1
    || !PROFILE_GENERATION_REF.test(value.generation_ref)) {
    fail("RFD041_PROFILE_OPERATION_RECEIPT_INVALID", `${label} is not a valid opaque artifact descriptor`);
  }
  return value;
}

function sameProfileArtifact(left, right) {
  return left.filename === right.filename
    && left.sha256 === right.sha256
    && left.bytes === right.bytes
    && left.generation_ref === right.generation_ref;
}

function validatePrivateManifestDescriptor(value, label) {
  exactKeys(value, ["sha256", "bytes", "profile_count"], label);
  if (!SHA256.test(value.sha256) || !Number.isSafeInteger(value.bytes) || value.bytes < 1
    || value.profile_count !== 10) {
    fail("RFD041_PROFILE_OPERATION_RECEIPT_INVALID", `${label} is not an aggregate ten-profile manifest`);
  }
  return value;
}

function validateProfileArtifactCounts(value, label) {
  exactKeys(value, [
    "private_manifest_entry_count", "injected_photo_entry_count", "git_source_photo_entry_count",
  ], label);
  if (value.private_manifest_entry_count !== 10
    || value.injected_photo_entry_count !== 10
    || value.git_source_photo_entry_count !== 0) {
    fail("RFD041_PROFILE_OPERATION_FAILED", `${label} does not describe the exact private ten-profile artifact`);
  }
  return value;
}

function validateProfileSmokeReceipt(value, { source, artifact, label }) {
  exactKeys(value, [
    "schema_version", "producer", "generated_at", "verdict", "source", "api_artifact",
    "profile_photo", "profile_reads", "boundary", "private_values_emitted",
  ], label);
  if (value.schema_version !== PROFILE_PRODUCTION_API_SMOKE_SCHEMA
    || value.producer !== "run-profile-production-api-smoke"
    || value.verdict !== "PASS"
    || value.private_values_emitted !== false) {
    fail("RFD041_PROFILE_OPERATION_RECEIPT_INVALID", `${label} identity or verdict is invalid`);
  }
  const generatedAt = parseTimestamp(value.generated_at, `${label} generated_at`);
  exactKeys(value.source, ["sha", "tree", "api_source_revision"], `${label} source`);
  exactKeys(value.api_artifact, ["filename", "sha256", "bytes"], `${label} API artifact`);
  exactKeys(value.profile_photo, ["generation_verified", "expected_profile_count", "passed_profile_count"], `${label} profile binding`);
  const readKeys = [
    "expected", "passed", "http_200", "outcome_passed", "ui_state_populated", "photo_included",
    "png_decoded", "generation_match", "content_digest_match",
  ];
  exactKeys(value.profile_reads, readKeys, `${label} profile reads`);
  exactKeys(value.boundary, [
    "authorized_production_read_only", "health_get_count", "authenticated_get_count", "total_get_count", "api_write_request_count",
    "external_mutation_count", "database_mutation_count", "aws_control_plane_call_count",
    "deployment_count", "desktop_deploy_count", "desktop_reinstall_count", "local_receipt_write_count",
  ], `${label} boundary`);
  if (value.source.sha !== source.sha || value.source.tree !== source.tree
    || value.source.api_source_revision !== source.sha
    || value.api_artifact.filename !== artifact.filename
    || value.api_artifact.sha256 !== artifact.sha256
    || value.api_artifact.bytes !== artifact.bytes
    || value.profile_photo.generation_verified !== true
    || value.profile_photo.expected_profile_count !== 10
    || value.profile_photo.passed_profile_count !== 10
    || readKeys.some((key) => value.profile_reads[key] !== 10)
    || value.boundary.authorized_production_read_only !== true
    || value.boundary.health_get_count !== 1
    || value.boundary.authenticated_get_count !== 10
    || value.boundary.total_get_count !== 11
    || value.boundary.local_receipt_write_count !== 1
    || Object.entries(value.boundary).some(([key, count]) => (
      ![
        "authorized_production_read_only", "health_get_count", "authenticated_get_count",
        "total_get_count", "local_receipt_write_count",
      ].includes(key)
      && count !== 0
    ))) {
    fail("RFD041_PROFILE_OPERATION_FAILED", `${label} is not an exact read-only ten-of-ten artifact smoke`);
  }
  return Object.freeze({ value, generated_at: generatedAt });
}

function validateProfileChangeSetReceipt(value, {
  source,
  action,
  kind,
  baselineArtifact,
  targetArtifact,
  baselineManifest,
  targetManifest,
  label,
}) {
  const schema = kind === "review" ? PROFILE_CHANGE_SET_REVIEW_SCHEMA : PROFILE_CHANGE_SET_EXECUTION_SCHEMA;
  const operation = kind === "review" ? "create-profile-artifact-change-set" : "execute-profile-artifact-change-set";
  const baselineCounts = validateProfileArtifactCounts(value?.baseline_profile_counts, `${label} baseline profile counts`);
  const targetCounts = validateProfileArtifactCounts(value?.target_profile_counts, `${label} target profile counts`);
  if (value?.schema_version !== schema
    || value.operation !== operation
    || value.purpose !== "profile-artifact-rebind"
    || value.profile_artifact_action !== action
    || value.outcome !== "PASS"
    || value.source_sha !== source.sha
    || value.source_tree !== source.tree
    || value.baseline_artifact_sha256 !== baselineArtifact.sha256
    || !SHA256.test(value.baseline_artifact_manifest_sha256 ?? "")
    || value.baseline_artifact_key !== `lawos-production/${source.sha}/${baselineArtifact.sha256}.zip`
    || value.target_artifact_sha256 !== targetArtifact.sha256
    || !SHA256.test(value.target_artifact_manifest_sha256 ?? "")
    || value.target_artifact_key !== `lawos-production/${source.sha}/${targetArtifact.sha256}.zip`
    || value.baseline_profile_generation_ref !== baselineArtifact.generation_ref
    || value.target_profile_generation_ref !== targetArtifact.generation_ref
    || value.baseline_private_manifest_sha256 !== baselineManifest.sha256
    || value.target_private_manifest_sha256 !== targetManifest.sha256
    || value.target_artifact_version_verified !== true
    || value.target_artifact_version_head_verified_count !== 1
    || value.target_artifact_object_lock_mode !== "COMPLIANCE"
    || value.target_artifact_server_side_encryption !== "aws:kms"
    || !SHA256.test(value.target_artifact_kms_key_ref_sha256 ?? "")
    || !SHA256.test(value.profile_artifact_transition_sha256 ?? "")
    || typeof value.target_artifact_version !== "string"
    || value.target_artifact_version.length < 1
    || typeof value.baseline_artifact_version !== "string"
    || value.baseline_artifact_version.length < 1
    || value.baseline_artifact_version === value.target_artifact_version
    || !SHA256.test(value.baseline_execution_packet_sha256 ?? "")
    || !Number.isSafeInteger(value.previous_runtime_generation)
    || value.previous_runtime_generation < 1
    || !SHA256.test(value.target_execution_packet_sha256 ?? "")
    || value.baseline_execution_packet_sha256 === value.target_execution_packet_sha256
    || !SHA256.test(value.target_artifact_upload_packet_sha256 ?? "")
    || !SHA256.test(value.target_artifact_upload_receipt_sha256 ?? "")
    || !Number.isSafeInteger(value.target_runtime_generation)
    || value.target_runtime_generation !== value.previous_runtime_generation + 1
    || !SHA256.test(value.baseline_approval_id_sha256 ?? "")
    || !SHA256.test(value.target_approval_id_sha256 ?? "")
    || value.baseline_approval_id_sha256 === value.target_approval_id_sha256
    || !SHA256.test(value.baseline_owner_trust_registry_sha256 ?? "")
    || !SHA256.test(value.target_owner_trust_registry_sha256 ?? "")
    || !SHA256.test(value.target_parameters_sha256 ?? "")
    || !SHA256.test(value.reviewed_change_set_sha256 ?? "")
    || !SHA256.test(value.packet_sha256 ?? "")
    || value.packet_sha256 !== value.target_execution_packet_sha256
    || !SHA256.test(value.approval_receipt_sha256 ?? "")
    || value.registry_sha256 !== value.target_owner_trust_registry_sha256
    || !SHA256.test(value.result_sha256 ?? "")
    || value.result_sha256 !== jsonPostgresProductionInfrastructureResultSha256(value)
    || value.production_data_write_count !== 0
    || value.production_write_count !== 0
    || value.aws_mutation_count !== 1
    || value.raw_pii_evidence_count !== 0
    || value.secret_material_recorded !== false) {
    fail("RFD041_PROFILE_OPERATION_FAILED", `${label} does not prove the exact governed profile artifact transition`);
  }
  if (action === "rollback") {
    if (PRIOR_PROMOTE_RECEIPT_FIELDS.slice(0, 5).some((key) => !SHA256.test(value[key] ?? ""))
      || !/^[A-Za-z0-9._-]{1,200}$/u.test(value.prior_promote_execution_receipt_signer_key_id ?? "")
      || !SHA256.test(value.prior_promote_execution_receipt_signer_fingerprint_sha256 ?? "")) {
      fail("RFD041_PROFILE_OPERATION_FAILED", `${label} lacks authenticated prior promote execution lineage`);
    }
    parseTimestamp(
      value.prior_promote_execution_receipt_authority_signed_at,
      `${label} prior promote authority signed_at`,
    );
  } else if (PRIOR_PROMOTE_RECEIPT_FIELDS.some((key) => Object.hasOwn(value, key))) {
    fail("RFD041_PROFILE_OPERATION_FAILED", `${label} cannot contain rollback-only prior promote authority fields`);
  }
  if (kind === "execution" && (value.production_traffic_enabled !== true
    || value.lambda_eni_bootstrap_enabled !== false
    || value.temporary_eni_allow_count !== 0)) {
    fail("RFD041_PROFILE_OPERATION_FAILED", `${label} changed the production execution boundary`);
  }
  return Object.freeze({
    value,
    baseline_counts: baselineCounts,
    target_counts: targetCounts,
    generated_at: parseTimestamp(value.generated_at, `${label} generated_at`),
    object_version_ref_sha256: createHash("sha256").update(value.target_artifact_version).digest("hex"),
  });
}

function validateProfileOperationalReceiptSet({
  repoRoot,
  pinnedReceipts,
  references,
  priorAuthorityReferences,
  priorPromoteExecutionAuthority,
  source,
  artifacts,
  manifests,
  expectedTrustRegistrySha256,
}) {
  const receiptKeys = [
    "promote_review", "promote_execution", "candidate_smoke",
    "rollback_review", "rollback_execution", "restored_smoke",
  ];
  exactKeys(references, receiptKeys, "profile operational receipt set");
  if (pinnedReceipts !== undefined) exactKeys(pinnedReceipts, receiptKeys, "pinned profile operational receipt set");
  const read = (key, schema) => {
    try {
      if (pinnedReceipts !== undefined) {
        exactKeys(pinnedReceipts[key], ["reference", "bytes"], `${key} pinned operational receipt`);
        if (JSON.stringify(pinnedReceipts[key].reference) !== JSON.stringify(references[key])) {
          fail("RFD041_PROFILE_OPERATION_RECEIPT_INVALID", `${key} pinned reference does not match the signed operation receipt`);
        }
        return validateRf13OperationalPinnedContent({
          reference: pinnedReceipts[key].reference,
          bytes: pinnedReceipts[key].bytes,
          expectedSchema: schema,
        });
      }
      return readRf13OperationalContentReference({ repoRoot, reference: references[key], expectedSchema: schema });
    } catch {
      fail("RFD041_PROFILE_OPERATION_RECEIPT_INVALID", `${key} content reference could not be re-read`);
    }
  };
  const raw = {
    promoteReview: read("promote_review", PROFILE_CHANGE_SET_REVIEW_SCHEMA),
    promoteExecution: read("promote_execution", PROFILE_CHANGE_SET_EXECUTION_SCHEMA),
    candidateSmoke: read("candidate_smoke", PROFILE_PRODUCTION_API_SMOKE_SCHEMA),
    rollbackReview: read("rollback_review", PROFILE_CHANGE_SET_REVIEW_SCHEMA),
    rollbackExecution: read("rollback_execution", PROFILE_CHANGE_SET_EXECUTION_SCHEMA),
    restoredSmoke: read("restored_smoke", PROFILE_PRODUCTION_API_SMOKE_SCHEMA),
  };
  const checked = {
    promoteReview: validateProfileChangeSetReceipt(raw.promoteReview.value, {
      source, action: "promote", kind: "review", baselineArtifact: artifacts.baseline,
      targetArtifact: artifacts.candidate, baselineManifest: manifests.baseline,
      targetManifest: manifests.candidate, label: "promote reviewed change set",
    }),
    promoteExecution: validateProfileChangeSetReceipt(raw.promoteExecution.value, {
      source, action: "promote", kind: "execution", baselineArtifact: artifacts.baseline,
      targetArtifact: artifacts.candidate, baselineManifest: manifests.baseline,
      targetManifest: manifests.candidate, label: "promote change-set execution",
    }),
    candidateSmoke: validateProfileSmokeReceipt(raw.candidateSmoke.value, {
      source, artifact: artifacts.candidate, label: "candidate profile smoke",
    }),
    rollbackReview: validateProfileChangeSetReceipt(raw.rollbackReview.value, {
      source, action: "rollback", kind: "review", baselineArtifact: artifacts.candidate,
      targetArtifact: artifacts.restored, baselineManifest: manifests.candidate,
      targetManifest: manifests.restored, label: "rollback reviewed change set",
    }),
    rollbackExecution: validateProfileChangeSetReceipt(raw.rollbackExecution.value, {
      source, action: "rollback", kind: "execution", baselineArtifact: artifacts.candidate,
      targetArtifact: artifacts.restored, baselineManifest: manifests.candidate,
      targetManifest: manifests.restored, label: "rollback change-set execution",
    }),
    restoredSmoke: validateProfileSmokeReceipt(raw.restoredSmoke.value, {
      source, artifact: artifacts.restored, label: "restored profile smoke",
    }),
  };
  const transitionLineageKeys = [
    "baseline_artifact_manifest_sha256", "baseline_artifact_key", "baseline_artifact_version",
    "baseline_execution_packet_sha256", "previous_runtime_generation", "target_artifact_manifest_sha256",
    "target_artifact_key", "target_artifact_upload_packet_sha256", "target_artifact_upload_receipt_sha256",
    "target_execution_packet_sha256", "target_runtime_generation", "baseline_approval_id_sha256",
    "target_approval_id_sha256", "baseline_owner_trust_registry_sha256", "target_owner_trust_registry_sha256",
    "target_parameters_sha256", "reviewed_change_set_sha256", "target_artifact_object_lock_mode",
    "target_artifact_server_side_encryption", "target_artifact_kms_key_ref_sha256",
    ...PRIOR_PROMOTE_RECEIPT_FIELDS,
  ];
  if (checked.promoteReview.value.profile_artifact_transition_sha256
      !== checked.promoteExecution.value.profile_artifact_transition_sha256
    || checked.promoteReview.value.target_artifact_version
      !== checked.promoteExecution.value.target_artifact_version
    || checked.rollbackReview.value.profile_artifact_transition_sha256
      !== checked.rollbackExecution.value.profile_artifact_transition_sha256
    || checked.rollbackReview.value.target_artifact_version
      !== checked.rollbackExecution.value.target_artifact_version
    || checked.promoteExecution.value.profile_artifact_transition_sha256
      === checked.rollbackExecution.value.profile_artifact_transition_sha256
    || checked.promoteExecution.value.target_artifact_version
      === checked.rollbackExecution.value.target_artifact_version) {
    fail("RFD041_PROFILE_OPERATION_FAILED", "profile review and execution receipts do not form distinct promote and rollback transitions");
  }
  if (transitionLineageKeys.some((key) => (
    checked.promoteReview.value[key] !== checked.promoteExecution.value[key]
      || checked.rollbackReview.value[key] !== checked.rollbackExecution.value[key]
  ))
    || JSON.stringify(checked.promoteReview.value.baseline_profile_counts)
      !== JSON.stringify(checked.promoteExecution.value.baseline_profile_counts)
    || JSON.stringify(checked.promoteReview.value.target_profile_counts)
      !== JSON.stringify(checked.promoteExecution.value.target_profile_counts)
    || JSON.stringify(checked.rollbackReview.value.baseline_profile_counts)
      !== JSON.stringify(checked.rollbackExecution.value.baseline_profile_counts)
    || JSON.stringify(checked.rollbackReview.value.target_profile_counts)
      !== JSON.stringify(checked.rollbackExecution.value.target_profile_counts)
    || checked.rollbackReview.value.prior_promote_execution_receipt_sha256
      !== checked.promoteExecution.value.result_sha256
    || checked.rollbackExecution.value.prior_promote_execution_receipt_sha256
      !== checked.promoteExecution.value.result_sha256
    || checked.promoteExecution.value.baseline_artifact_manifest_sha256
      !== checked.rollbackExecution.value.target_artifact_manifest_sha256
    || checked.promoteExecution.value.baseline_artifact_key
      !== checked.rollbackExecution.value.target_artifact_key
    || checked.promoteExecution.value.baseline_artifact_version
      !== checked.rollbackExecution.value.target_artifact_version
    || JSON.stringify(checked.promoteExecution.value.baseline_profile_counts)
      !== JSON.stringify(checked.rollbackExecution.value.target_profile_counts)
    || checked.promoteExecution.value.baseline_execution_packet_sha256
      !== checked.rollbackExecution.value.target_artifact_upload_packet_sha256
    || checked.promoteExecution.value.target_artifact_manifest_sha256
      !== checked.rollbackExecution.value.baseline_artifact_manifest_sha256
    || checked.promoteExecution.value.target_artifact_key
      !== checked.rollbackExecution.value.baseline_artifact_key
    || checked.promoteExecution.value.target_artifact_version
      !== checked.rollbackExecution.value.baseline_artifact_version
    || JSON.stringify(checked.promoteExecution.value.target_profile_counts)
      !== JSON.stringify(checked.rollbackExecution.value.baseline_profile_counts)
    || checked.promoteExecution.value.target_artifact_upload_packet_sha256
      !== checked.promoteExecution.value.target_execution_packet_sha256
    || checked.promoteExecution.value.target_execution_packet_sha256
      !== checked.rollbackExecution.value.baseline_execution_packet_sha256
    || checked.promoteExecution.value.target_runtime_generation
      !== checked.rollbackExecution.value.previous_runtime_generation
    || checked.promoteExecution.value.target_approval_id_sha256
      !== checked.rollbackExecution.value.baseline_approval_id_sha256
    || checked.promoteExecution.value.target_approval_id_sha256
      === checked.rollbackExecution.value.target_approval_id_sha256) {
    fail("RFD041_PROFILE_OPERATION_FAILED", "rollback does not bind the exact promoted B state, original A version, and distinct approval lineage");
  }
  if (checked.promoteExecution.value.target_owner_trust_registry_sha256
      !== checked.rollbackExecution.value.baseline_owner_trust_registry_sha256
    || checked.promoteExecution.value.target_owner_trust_registry_sha256
      !== checked.rollbackExecution.value.target_owner_trust_registry_sha256) {
    fail("RFD041_PROFILE_OPERATION_FAILED", "profile promote and rollback drifted the owner trust registry");
  }
  if (!priorPromoteExecutionAuthority) {
    fail("RFD041_PROFILE_OPERATION_FAILED", "prior promote execution receipt requires independent detached authority bytes");
  }
  const priorAuthority = validatePriorPromoteExecutionAuthority({
    references: priorAuthorityReferences,
    pinned: priorPromoteExecutionAuthority,
    promoteExecution: raw.promoteExecution,
    rollbackReview: checked.rollbackReview,
    source,
    expectedTrustRegistrySha256,
  });
  const expectedPriorFields = {
    prior_promote_execution_receipt_sha256: priorAuthority.receipt.result_sha256,
    prior_promote_execution_receipt_bytes_sha256: priorAuthority.receipt_bytes_sha256,
    prior_promote_execution_receipt_authority_sha256: priorAuthority.receipt_authority_sha256,
    prior_promote_execution_receipt_signature_sha256: priorAuthority.receipt_signature_sha256,
    prior_promote_execution_receipt_trust_registry_sha256: priorAuthority.receipt_trust_registry_sha256,
    prior_promote_execution_receipt_signer_key_id: priorAuthority.receipt_signer_key_id,
    prior_promote_execution_receipt_signer_fingerprint_sha256: priorAuthority.receipt_signer_fingerprint_sha256,
    prior_promote_execution_receipt_authority_signed_at: priorAuthority.receipt_authority_signed_at,
  };
  if (PRIOR_PROMOTE_RECEIPT_FIELDS.some((key) => (
    checked.rollbackReview.value[key] !== expectedPriorFields[key]
      || checked.rollbackExecution.value[key] !== expectedPriorFields[key]
  ))
    || expectedPriorFields.prior_promote_execution_receipt_sha256
      !== checked.promoteExecution.value.result_sha256
    || expectedPriorFields.prior_promote_execution_receipt_bytes_sha256
      !== references.promote_execution.sha256
    || expectedPriorFields.prior_promote_execution_receipt_trust_registry_sha256
      !== expectedTrustRegistrySha256
    || parseTimestamp(
      expectedPriorFields.prior_promote_execution_receipt_authority_signed_at,
      "authenticated prior promote authority signed_at",
    ) > checked.rollbackReview.generated_at) {
    fail("RFD041_PROFILE_OPERATION_FAILED", "rollback receipts do not match the independently authenticated prior promote execution");
  }
  return Object.freeze({
    raw: Object.freeze(raw),
    checked: Object.freeze(checked),
    prior_authority: priorAuthority,
  });
}

export function validateProfileMeasurementEnvelope(bytes, receiptSource) {
  const receipt = parseJson(bytes, "RFD041_PROFILE_MEASUREMENT_INVALID", "profile measurement receipt");
  try {
    assertNoPrivateMaterial(receipt);
  } catch (error) {
    normalizeCanonicalError(error, error?.code ?? "RFD041_PROFILE_MEASUREMENT_PRIVATE_MATERIAL", "profile measurement privacy boundary");
  }
  exactKeys(receipt, [
    "schema_version", "producer", "generated_at", "environment", "source", "metrics",
  ], "profile measurement receipt");
  if (receipt.schema_version !== RF13_PROFILE_MEASUREMENT_RECEIPT_SCHEMA
    || receipt.producer !== "profile-media-production-observer"
    || receipt.environment !== "PRODUCTION") {
    fail("RFD041_PROFILE_MEASUREMENT_INVALID", "profile measurement is not the canonical production receipt");
  }
  parseTimestamp(receipt.generated_at, "profile measurement generated_at");
  exactKeys(receipt.source, ["source_sha", "source_tree", "source_dirty"], "profile measurement source");
  if (!sameSource(receipt.source, receiptSource)) {
    fail("RFD041_PROFILE_MEASUREMENT_SOURCE_MISMATCH", "profile measurement source is stale");
  }
  let metrics;
  try { metrics = validateRf13ProfileMetrics(receipt.metrics); } catch (error) {
    if (error?.code === "RFD_PROFILE_METRICS_INVALID") fail(error.code, error.message);
    throw error;
  }
  return Object.freeze({
    receipt,
    generated_at: receipt.generated_at,
    metrics,
  });
}

export function validateProfileMeasurementProducerEvidence({
  bytes,
  reference,
  receiptSource,
  attestation,
} = {}) {
  const envelope = validateProfileMeasurementEnvelope(bytes, receiptSource);
  if (!attestation) {
    fail("RFD041_PROFILE_MEASUREMENT_AUTHORITY_REQUIRED", "profile completion requires a detached governed measurement attestation");
  }
  let authority;
  try {
    authority = validateRf13ProfileMeasurementAttestation({
      reference: attestationReference(reference, RF13_PROFILE_MEASUREMENT_RECEIPT_SCHEMA),
      source: attestationSource(receiptSource),
      attestation,
    });
  } catch (error) {
    if (error?.code === "RFD_PROFILE_METRICS_INVALID") throw error;
    fail("RFD041_PROFILE_MEASUREMENT_AUTHORITY_INVALID", "profile measurement attestation is invalid");
  }
  if (authority.generated_at !== envelope.generated_at
    || JSON.stringify(authority.metrics) !== JSON.stringify(envelope.metrics)) {
    fail("RFD041_PROFILE_MEASUREMENT_AUTHORITY_INVALID", "signed measurement packet does not match the exact receipt metrics");
  }
  const result = Object.freeze({
    receipt_reference: Object.freeze({ ...reference }),
    receipt: envelope.receipt,
    source: attestationSource(receiptSource),
    generated_at: authority.generated_at,
    environment: authority.environment,
    metrics: authority.metrics,
    attestation: authority.attestation,
  });
  ACCEPTED_PROFILE_MEASUREMENTS.add(result);
  return result;
}

function parseJson(bytes, code, label) {
  try {
    return JSON.parse(bytes.toString("utf8"));
  } catch {
    fail(code, `${label} is not valid JSON`);
  }
}

function normalizeCanonicalError(error, code, label) {
  if (error instanceof Rf13OperationalEvidenceError) throw error;
  fail(code, `${label} failed its canonical validator`);
}

export async function validateColdStartProducerEvidence({
  bytes,
  reference,
  repoRoot,
  receiptSource,
  coldStartAuthority,
  requirePass,
  now,
  unitId,
} = {}) {
  const receipt = parseJson(bytes, "RFD_COLD_START_RECEIPT_INVALID", "cold-start producer receipt");
  if (receipt?.schema_version !== COLD_START_SCHEMA) {
    fail("RFD_COLD_START_RECEIPT_INVALID", "cold-start receipt is not the canonical v2 producer output");
  }
  if (!coldStartAuthority) {
    const code = unitId === "RFD-TUW-040"
      ? "RFD040_LIVE_COLD_START_AUTHORITY_REQUIRED"
      : "RFD038_LIVE_COLD_START_AUTHORITY_REQUIRED";
    fail(code, "cold-start completion requires the live canonical authority capability");
  }
  exactKeys(coldStartAuthority, ["measurementValidation", "receiptBytes"], "cold-start authority");
  if (!(Buffer.isBuffer(coldStartAuthority.receiptBytes)
      || coldStartAuthority.receiptBytes instanceof Uint8Array)
    || !Buffer.from(coldStartAuthority.receiptBytes).equals(bytes)) {
    fail(
      "RFD_COLD_START_RECEIPT_INVALID",
      "cold-start authority bytes must equal the descriptor-pinned evidence receipt bytes",
    );
  }
  let authoritative;
  try {
    authoritative = await validateColdStartReceiptAuthoritatively(receipt, {
      repoRoot,
      measurementValidation: coldStartAuthority.measurementValidation,
      receiptBytes: bytes,
      ...(now ? { now } : {}),
    });
  } catch (error) {
    normalizeCanonicalError(error, "RFD_COLD_START_RECEIPT_INVALID", "cold-start receipt");
  }
  const sealedArchive = authoritative?.sealed_archive;
  if (authoritative?.receipt !== receipt
    || !sealedArchive
    || typeof sealedArchive.path !== "string"
    || sealedArchive.sha256 !== receipt.artifact?.authority?.indexed_artifact_sha256
    || !Number.isSafeInteger(sealedArchive.bytes)
    || sealedArchive.bytes < 1) {
    fail("RFD_COLD_START_ARCHIVE_AUTHORITY_INVALID", "cold-start authority did not return the exact sealed archive descriptor");
  }
  if (!sameSource(receipt.source, receiptSource)) {
    fail("RFD_COLD_START_SOURCE_MISMATCH", "cold-start producer source does not match the RF13 acceptance source");
  }
  if (receipt.run_count !== REQUIRED_RUN_COUNT || receipt.runs.length !== REQUIRED_RUN_COUNT) {
    fail("RFD_COLD_START_RUN_SET_INVALID", "cold-start producer must contain exactly five real launch records");
  }
  if (receipt.percentile_method !== PERCENTILE_METHOD) {
    fail("RFD_COLD_START_METHOD_MISMATCH", "cold-start producer percentile method drifted");
  }
  if (requirePass && receipt.status !== "PASS") {
    fail("RFD038_BASELINE_ERRORS", "RFD038 baseline requires a canonical five-run PASS receipt");
  }
  const errors = receipt.status === "PASS"
    ? 0
    : Math.max(1, receipt.runs.reduce((total, run) => total
      + Number(run.error_count ?? 0)
      + Number(run.console_error_count ?? 0)
      + (run.exit_code === 0 && run.signal === null && run.home_ready_observed === true ? 0 : 1), 0));
  return Object.freeze({
    receipt_reference: Object.freeze({ ...reference }),
    receipt,
    source: Object.freeze({ ...receiptSource }),
    archive: Object.freeze({ ...sealedArchive }),
    host: Object.freeze({ ...receipt.host_fingerprint }),
    method: receipt.percentile_method,
    runs_ms: Object.freeze(receipt.runs.map(({ duration_ms: duration }) => duration)),
    median_ms: receipt.median_ms,
    p95_ms: receipt.p95_ms,
    errors,
    renderer_sha256: receipt.renderer.sha256,
    renderer_file_count: receipt.renderer.file_count,
    build_manifest_sha256: receipt.artifact.manifest_sha256,
  });
}

export function validateFormalPackageNavigationEvidence({
  receiptBytes,
  receiptReference,
  transcriptBytes,
  transcriptReference,
  receiptSource,
  authorityCapability,
} = {}) {
  const receipt = parseJson(receiptBytes, "RFD039_PACKAGE_QA_RECEIPT_INVALID", "formal package QA receipt");
  const transcript = parseJson(transcriptBytes, "RFD039_PACKAGE_QA_TRANSCRIPT_INVALID", "formal package QA transcript");
  if (receipt.platform !== "macos") {
    fail("RFD039_PACKAGE_QA_PLATFORM_MISMATCH", "RFD039 must use the canonical macOS matter-app custom-origin package runner");
  }
  const expected = {
    expectedPlatform: receipt.platform,
    expectedSourceSha: receiptSource.sha,
    expectedSourceTree: receiptSource.tree,
    expectedArtifactSha256: receipt?.bindings?.package_artifact?.sha256,
    expectedExecutedPackageSha256: receipt?.bindings?.executed_package?.sha256,
    expectedManifestSha256: receipt?.bindings?.package_manifest?.sha256,
  };
  try {
    validateFormalPackageLoopbackTranscript(transcript, {
      platform: expected.expectedPlatform,
      sourceSha: expected.expectedSourceSha,
      sourceTree: expected.expectedSourceTree,
      artifactSha256: expected.expectedArtifactSha256,
      executedPackageSha256: expected.expectedExecutedPackageSha256,
      manifestSha256: expected.expectedManifestSha256,
      executedMemberDigestSha256: receipt.bindings.executed_package.member_digest_sha256,
      privacyReceiptSha256s: receipt.bindings.artifact_privacy.receipts.map(({ sha256 }) => sha256),
    });
    validateFormalPackageLoopbackQaReceipt(receipt, { ...expected, transcript });
  } catch (error) {
    normalizeCanonicalError(error, "RFD039_PACKAGE_QA_RECEIPT_INVALID", "formal package QA receipt/transcript");
  }
  if (!authorityCapability) {
    fail("RFD039_LIVE_PACKAGE_QA_AUTHORITY_REQUIRED", "packaged navigation requires the live canonical native-QA capability");
  }
  try {
    validateFormalPackageLoopbackNativeQaCapability(authorityCapability, {
      platform: receipt.platform,
      source_sha: receiptSource.sha,
      source_tree: receiptSource.tree,
      artifact_sha256: expected.expectedArtifactSha256,
      executed_package_sha256: expected.expectedExecutedPackageSha256,
      manifest_sha256: expected.expectedManifestSha256,
      verdict: "PASS",
      receipt_sha256: receiptReference.sha256,
      transcript_sha256: transcriptReference.sha256,
    });
  } catch (error) {
    normalizeCanonicalError(error, "RFD039_PACKAGE_QA_AUTHORITY_INVALID", "formal package native-QA capability");
  }
  if (receipt.bindings.runner_transcript.sha256 !== transcriptReference.sha256
    || receipt.bindings.runner_transcript.bytes !== transcriptReference.bytes
    || receipt.native_verdict !== "PASS"
    || receipt.verdict !== "PASS"
    || receipt.scenarios.restart_session_restored !== true
    || receipt.runtime.external_network_request_count !== 0
    || receipt.diagnostics.page_error_count !== 0
    || receipt.diagnostics.console_error_count !== 0
    || receipt.diagnostics.external_request_count !== 0
    || transcript.diagnostics.page_errors.length !== 0
    || transcript.diagnostics.console_errors.length !== 0
    || transcript.diagnostics.external_requests.length !== 0
    || receipt.execution.package_launch_count < 2
    || receipt.screenshots.length < 1) {
    fail("RFD039_PACKAGED_NAVIGATION_FAILED", "formal package receipt does not prove custom-origin navigation, offline rendering, restart, and zero runtime errors");
  }
  const artifact = receipt.package.artifacts.find(({ sha256 }) => (
    sha256 === receipt.bindings.package_artifact.sha256
  ));
  if (!artifact) fail("RFD039_CANDIDATE_ARTIFACT_MISMATCH", "formal package primary artifact is not bound to the QA receipt");
  return Object.freeze({
    receipt_reference: Object.freeze({ ...receiptReference }),
    transcript_reference: Object.freeze({ ...transcriptReference }),
    receipt,
    transcript,
    source: Object.freeze({ ...receiptSource }),
    primary_artifact: Object.freeze({ path: artifact.path, sha256: artifact.sha256, bytes: artifact.bytes }),
    package_artifacts: Object.freeze(receipt.package.artifacts.map((item) => Object.freeze({ ...item }))),
    renderer_sha256: receipt.source.renderer.sha256,
    renderer_file_count: receipt.source.renderer.file_count,
    build_manifest_sha256: receipt.bindings.package_manifest.sha256,
  });
}

export async function validateWebFullProducerEvidence({
  bytes,
  reference,
  receiptSource,
  attestation,
} = {}) {
  const receipt = parseJson(bytes, "RFD040_WEB_FULL_RECEIPT_INVALID", "web-full receipt");
  exactKeys(receipt, [
    "schema_version", "producer", "generated_at", "source", "navigation", "diagnostics", "test_counts",
  ], "web-full receipt");
  if (receipt.schema_version !== RF13_WEB_FULL_RECEIPT_SCHEMA || receipt.producer !== "rfd040-web-full-navigation-qa") {
    fail("RFD040_WEB_FULL_RECEIPT_INVALID", "web-full receipt producer identity is invalid");
  }
  parseTimestamp(receipt.generated_at, "web-full generated_at");
  exactKeys(receipt.source, ["source_sha", "source_tree", "source_dirty"], "web-full source");
  if (!sameSource(receipt.source, receiptSource)) fail("RFD040_WEB_FULL_SOURCE_MISMATCH", "web-full receipt source is stale");
  exactKeys(receipt.navigation, ["full_app_rendered", "deep_link_verified", "restart_verified"], "web-full navigation");
  if (Object.values(receipt.navigation).some((value) => value !== true)) fail("RFD040_WEB_FULL_NAVIGATION_FAILED", "web-full navigation scenarios did not pass");
  exactKeys(receipt.diagnostics, ["chunk_errors", "runtime_errors", "blank_screens"], "web-full diagnostics");
  if (Object.values(receipt.diagnostics).some((value) => value !== 0)) fail("RFD040_WEB_FULL_NAVIGATION_FAILED", "web-full diagnostics contain failures");
  exactKeys(receipt.test_counts, ["total", "passed", "failed", "skipped"], "web-full test counts");
  if (!Number.isSafeInteger(receipt.test_counts.total)
    || receipt.test_counts.total < 1
    || receipt.test_counts.passed !== receipt.test_counts.total
    || receipt.test_counts.failed !== 0
    || receipt.test_counts.skipped !== 0) {
    fail("RFD040_WEB_FULL_RECEIPT_INVALID", "web-full receipt test counts are not an all-pass execution");
  }
  if (!attestation) {
    fail("RFD040_WEB_FULL_AUTHORITY_REQUIRED", "web-full completion requires a detached governed producer attestation");
  }
  let authority;
  try {
    authority = validateRf13ReceiptAttestation({
      purpose: RF13_OPERATIONAL_ATTESTATION_POLICIES.webFull.purpose,
      reference: attestationReference(reference, RF13_WEB_FULL_RECEIPT_SCHEMA),
      source: attestationSource(receiptSource),
      attestation,
    });
  } catch {
    fail("RFD040_WEB_FULL_AUTHORITY_INVALID", "web-full producer attestation is invalid");
  }
  if (parseTimestamp(receipt.generated_at, "web-full generated_at") > parseTimestamp(authority.signed_at, "web-full signed_at")) {
    fail("RFD040_WEB_FULL_AUTHORITY_INVALID", "web-full receipt cannot postdate its attestation");
  }
  return Object.freeze({ receipt_reference: Object.freeze({ ...reference }), receipt, attestation: authority });
}

export async function validateProfileOperationEvidence({
  bytes,
  reference,
  measurementReference,
  acceptedMeasurement,
  repoRoot,
  pinnedOperationalReceipts,
  priorPromoteExecutionAuthority,
  receiptSource,
  attestation,
} = {}) {
  const receipt = parseJson(bytes, "RFD041_PROFILE_OPERATION_RECEIPT_INVALID", "profile operation receipt");
  exactKeys(receipt, [
    "schema_version", "producer", "generated_at", "environment", "source", "measurement_receipt",
    "artifacts", "private_manifests", "operational_receipts", "prior_promote_execution_authority",
    "deployment_controls", "events", "desktop",
  ], "profile operation receipt");
  if (receipt.schema_version !== RF13_PROFILE_OPERATION_RECEIPT_SCHEMA
    || receipt.producer !== "profile-media-api-operation"
    || receipt.environment !== "PRODUCTION") {
    fail("RFD041_PROFILE_OPERATION_RECEIPT_INVALID", "profile operation is not a production API receipt");
  }
  const operationGeneratedAt = parseTimestamp(receipt.generated_at, "profile operation generated_at");
  if (!ACCEPTED_PROFILE_MEASUREMENTS.has(acceptedMeasurement)) {
    fail("RFD041_PROFILE_OPERATION_ORDER_INVALID", "profile operation requires the canonical same-process measurement capability");
  }
  exactKeys(receipt.source, ["source_sha", "source_tree", "source_dirty"], "profile operation source");
  if (!sameSource(receipt.source, receiptSource)) fail("RFD041_PROFILE_OPERATION_SOURCE_MISMATCH", "profile operation source is stale");
  if (JSON.stringify(receipt.measurement_receipt) !== JSON.stringify(measurementReference)) {
    fail("RFD041_MEASUREMENT_BINDING_MISMATCH", "profile operation does not bind the exact measurement receipt");
  }
  if (JSON.stringify(acceptedMeasurement.receipt_reference) !== JSON.stringify(measurementReference)
    || JSON.stringify(acceptedMeasurement.source) !== JSON.stringify(attestationSource(receiptSource))) {
    fail("RFD041_MEASUREMENT_BINDING_MISMATCH", "profile operation does not use the accepted measurement lineage and source");
  }
  exactKeys(receipt.artifacts, ["baseline", "candidate", "restored"], "profile operation artifacts");
  const baselineArtifact = validateProfileArtifactDescriptor(receipt.artifacts.baseline, "baseline API artifact");
  const candidateArtifact = validateProfileArtifactDescriptor(receipt.artifacts.candidate, "candidate API artifact");
  const restoredArtifact = validateProfileArtifactDescriptor(receipt.artifacts.restored, "restored API artifact");
  if (candidateArtifact.sha256 === baselineArtifact.sha256
    || candidateArtifact.generation_ref === baselineArtifact.generation_ref
    || !sameProfileArtifact(restoredArtifact, baselineArtifact)) {
    fail("RFD041_PROFILE_OPERATION_FAILED", "profile replacement must use a distinct candidate artifact and generation");
  }
  exactKeys(receipt.private_manifests, ["baseline", "candidate", "restored"], "profile private manifests");
  const baselineManifest = validatePrivateManifestDescriptor(receipt.private_manifests.baseline, "baseline private manifest");
  const candidateManifest = validatePrivateManifestDescriptor(receipt.private_manifests.candidate, "candidate private manifest");
  const restoredManifest = validatePrivateManifestDescriptor(receipt.private_manifests.restored, "restored private manifest");
  if (candidateManifest.sha256 === baselineManifest.sha256
    || JSON.stringify(restoredManifest) !== JSON.stringify(baselineManifest)) {
    fail("RFD041_PROFILE_OPERATION_FAILED", "profile replacement must use a distinct private manifest and restore the exact baseline manifest");
  }
  const operational = validateProfileOperationalReceiptSet({
    repoRoot,
    pinnedReceipts: pinnedOperationalReceipts,
    references: receipt.operational_receipts,
    priorAuthorityReferences: receipt.prior_promote_execution_authority,
    priorPromoteExecutionAuthority,
    source: attestationSource(receiptSource),
    artifacts: { baseline: baselineArtifact, candidate: candidateArtifact, restored: restoredArtifact },
    manifests: { baseline: baselineManifest, candidate: candidateManifest, restored: restoredManifest },
    expectedTrustRegistrySha256: receipt.deployment_controls?.owner_trust_registry_sha256,
  });
  exactKeys(receipt.deployment_controls, [
    "immutable_versioned_object", "candidate_object_version_ref_sha256", "restored_object_version_ref_sha256",
    "at_rest_encryption", "kms_key_ref_sha256", "owner_trust_registry_sha256", "reviewed_change_set",
    "promote_review_receipt_sha256", "promote_execution_receipt_sha256",
    "rollback_review_receipt_sha256", "rollback_execution_receipt_sha256", "ad_hoc_direct_update",
  ], "profile deployment controls");
  if (receipt.deployment_controls.immutable_versioned_object !== true
    || receipt.deployment_controls.candidate_object_version_ref_sha256
      !== operational.checked.promoteExecution.object_version_ref_sha256
    || receipt.deployment_controls.restored_object_version_ref_sha256
      !== operational.checked.rollbackExecution.object_version_ref_sha256
    || !APPROVED_AT_REST_ENCRYPTION.has(receipt.deployment_controls.at_rest_encryption)
    || receipt.deployment_controls.kms_key_ref_sha256
      !== operational.checked.promoteExecution.value.target_artifact_kms_key_ref_sha256
    || receipt.deployment_controls.kms_key_ref_sha256
      !== operational.checked.rollbackExecution.value.target_artifact_kms_key_ref_sha256
    || receipt.deployment_controls.owner_trust_registry_sha256
      !== operational.checked.promoteExecution.value.target_owner_trust_registry_sha256
    || receipt.deployment_controls.owner_trust_registry_sha256
      !== operational.checked.rollbackExecution.value.target_owner_trust_registry_sha256
    || receipt.deployment_controls.owner_trust_registry_sha256
      !== receipt.prior_promote_execution_authority.trust_registry.sha256
    || receipt.deployment_controls.reviewed_change_set !== true
    || receipt.deployment_controls.promote_review_receipt_sha256 !== receipt.operational_receipts.promote_review.sha256
    || receipt.deployment_controls.promote_execution_receipt_sha256 !== receipt.operational_receipts.promote_execution.sha256
    || receipt.deployment_controls.rollback_review_receipt_sha256 !== receipt.operational_receipts.rollback_review.sha256
    || receipt.deployment_controls.rollback_execution_receipt_sha256 !== receipt.operational_receipts.rollback_execution.sha256
    || receipt.deployment_controls.ad_hoc_direct_update !== false) {
    fail("RFD041_PROFILE_OPERATION_FAILED", "profile artifact deployment controls are not reviewable and immutable");
  }
  if (!Array.isArray(receipt.events) || receipt.events.length !== 5) {
    fail("RFD041_PROFILE_OPERATION_ORDER_INVALID", "profile operation must contain the exact five-step A/B/A sequence");
  }
  const eventContracts = [
    ["baseline_read", ["step", "started_at", "completed_at", "artifact_sha256", "profile_reads_expected", "profile_reads_passed"]],
    ["candidate_deploy", ["step", "started_at", "completed_at", "from_artifact_sha256", "to_artifact_sha256", "review_receipt_sha256", "execution_receipt_sha256"]],
    ["candidate_read", ["step", "started_at", "completed_at", "artifact_sha256", "smoke_receipt_sha256", "profile_reads_expected", "profile_reads_passed"]],
    ["rollback_deploy", ["step", "started_at", "completed_at", "from_artifact_sha256", "to_artifact_sha256", "review_receipt_sha256", "execution_receipt_sha256"]],
    ["restored_baseline_read", ["step", "started_at", "completed_at", "artifact_sha256", "smoke_receipt_sha256", "profile_reads_expected", "profile_reads_passed"]],
  ];
  const times = receipt.events.map((event, index) => {
    const [step, keys] = eventContracts[index];
    exactKeys(event, keys, `${step} event`);
    if (event.step !== step) fail("RFD041_PROFILE_OPERATION_ORDER_INVALID", "profile operation event order is invalid");
    const started = parseTimestamp(event.started_at, `${step} started_at`);
    const completed = parseTimestamp(event.completed_at, `${step} completed_at`);
    if (completed < started || (index > 0 && started < parseTimestamp(receipt.events[index - 1].completed_at, "prior event completed_at"))) {
      fail("RFD041_PROFILE_OPERATION_ORDER_INVALID", "profile operation event timestamps are not monotonic");
    }
    return Object.freeze({ started, completed });
  });
  const [baselineRead, candidateDeploy, candidateRead, rollbackDeploy, restoredRead] = receipt.events;
  if (baselineRead.artifact_sha256 !== baselineArtifact.sha256
    || baselineRead.profile_reads_expected !== 10 || baselineRead.profile_reads_passed !== 10
    || candidateDeploy.from_artifact_sha256 !== baselineArtifact.sha256
    || candidateDeploy.to_artifact_sha256 !== candidateArtifact.sha256
    || candidateDeploy.review_receipt_sha256 !== receipt.operational_receipts.promote_review.sha256
    || candidateDeploy.execution_receipt_sha256 !== receipt.operational_receipts.promote_execution.sha256
    || candidateRead.artifact_sha256 !== candidateArtifact.sha256
    || candidateRead.smoke_receipt_sha256 !== receipt.operational_receipts.candidate_smoke.sha256
    || candidateRead.profile_reads_expected !== 10 || candidateRead.profile_reads_passed !== 10
    || rollbackDeploy.from_artifact_sha256 !== candidateArtifact.sha256
    || rollbackDeploy.to_artifact_sha256 !== restoredArtifact.sha256
    || rollbackDeploy.review_receipt_sha256 !== receipt.operational_receipts.rollback_review.sha256
    || rollbackDeploy.execution_receipt_sha256 !== receipt.operational_receipts.rollback_execution.sha256
    || restoredRead.artifact_sha256 !== restoredArtifact.sha256
    || restoredRead.smoke_receipt_sha256 !== receipt.operational_receipts.restored_smoke.sha256
    || restoredRead.profile_reads_expected !== 10 || restoredRead.profile_reads_passed !== 10) {
    fail("RFD041_PROFILE_OPERATION_FAILED", "profile A/B/A events do not bind exact artifacts, change sets, and smoke receipts");
  }
  const nestedTimes = operational.checked;
  if (nestedTimes.promoteReview.generated_at < times[0].completed
    || nestedTimes.promoteReview.generated_at > times[1].started
    || nestedTimes.promoteExecution.generated_at < times[1].started
    || nestedTimes.promoteExecution.generated_at > times[1].completed
    || nestedTimes.candidateSmoke.generated_at < times[2].started
    || nestedTimes.candidateSmoke.generated_at > times[2].completed
    || nestedTimes.rollbackReview.generated_at < times[2].completed
    || nestedTimes.rollbackReview.generated_at > times[3].started
    || nestedTimes.rollbackExecution.generated_at < times[3].started
    || nestedTimes.rollbackExecution.generated_at > times[3].completed
    || nestedTimes.restoredSmoke.generated_at < times[4].started
    || nestedTimes.restoredSmoke.generated_at > times[4].completed) {
    fail("RFD041_PROFILE_OPERATION_ORDER_INVALID", "profile operational receipt timestamps do not fit the ordered A/B/A events");
  }
  const measurementGeneratedAt = parseTimestamp(acceptedMeasurement.generated_at, "accepted profile measurement generated_at");
  const measurementSignedAt = parseTimestamp(acceptedMeasurement.attestation.signed_at, "accepted profile measurement signed_at");
  if (times[0].started < measurementGeneratedAt || times[0].started < measurementSignedAt
    || operationGeneratedAt < times.at(-1).completed) {
    fail("RFD041_PROFILE_OPERATION_ORDER_INVALID", "profile operation does not follow its measurement and ordered events");
  }
  const rollbackMinutes = (times.at(-1).completed - times[3].started) / 60_000;
  exactKeys(receipt.desktop, ["redeploys", "reinstalls"], "profile desktop boundary");
  if (rollbackMinutes < 0 || rollbackMinutes > 15
    || acceptedMeasurement.metrics.profile_api_reads.expected !== 10
    || acceptedMeasurement.metrics.profile_api_reads.passed !== candidateRead.profile_reads_passed
    || acceptedMeasurement.metrics.rollback.minutes !== rollbackMinutes
    || acceptedMeasurement.metrics.rollback.exact_hash_match !== true
    || acceptedMeasurement.metrics.rollback.profile_reads_passed !== restoredRead.profile_reads_passed
    || acceptedMeasurement.metrics.desktop_reinstall_count !== 0
    || receipt.desktop.redeploys !== 0 || receipt.desktop.reinstalls !== 0) {
    fail("RFD041_PROFILE_OPERATION_FAILED", "profile replacement or rollback did not meet the ten-person operating contract");
  }
  if (!attestation) {
    fail("RFD041_PRODUCTION_PROFILE_AUTHORITY_REQUIRED", "profile completion requires a detached governed operation attestation");
  }
  let authority;
  try {
    authority = validateRf13ReceiptAttestation({
      purpose: RF13_OPERATIONAL_ATTESTATION_POLICIES.profileOperation.purpose,
      reference: attestationReference(reference, RF13_PROFILE_OPERATION_RECEIPT_SCHEMA),
      source: attestationSource(receiptSource),
      attestation,
    });
  } catch {
    fail("RFD041_PRODUCTION_PROFILE_AUTHORITY_INVALID", "profile API operation attestation is invalid");
  }
  if (operationGeneratedAt > parseTimestamp(authority.signed_at, "profile operation signed_at")) {
    fail("RFD041_PRODUCTION_PROFILE_AUTHORITY_INVALID", "profile operation cannot postdate its attestation");
  }
  if (authority.approval_id === acceptedMeasurement.attestation.approval_id
    || authority.key_id === acceptedMeasurement.attestation.key_id
    || authority.key_fingerprint_sha256
      === acceptedMeasurement.attestation.key_fingerprint_sha256
    || authority.key_id === operational.prior_authority.receipt_signer_key_id
    || authority.key_fingerprint_sha256
      === operational.prior_authority.receipt_signer_fingerprint_sha256) {
    fail("RFD041_PRODUCTION_PROFILE_AUTHORITY_INVALID", "measurement, prior promote, and operation require independent key identities");
  }
  const result = Object.freeze({
    receipt_reference: Object.freeze({ ...reference }),
    receipt,
    source: attestationSource(receiptSource),
    measurement_reference: Object.freeze({ ...measurementReference }),
    owner_trust_registry_sha256: receipt.deployment_controls.owner_trust_registry_sha256,
    rollback_minutes: rollbackMinutes,
    attestation: authority,
  });
  ACCEPTED_PROFILE_OPERATIONS.add(result);
  return result;
}

export function validateProfileMeasurementEvidence(descriptor, context) {
  if (!context) fail("RFD041_PROFILE_MEASUREMENT_CONTEXT_REQUIRED", "profile measurement requires an independently supplied canonical validation context");
  try {
    return validateTestOnlyProfileMediaMeasurementReceipt(descriptor, context);
  } catch (error) {
    normalizeCanonicalError(error, error?.code ?? "RFD041_PROFILE_MEASUREMENT_INVALID", "profile measurement receipt");
  }
}

export async function validateProfileDecisionEvidence({
  bytes,
  reference,
  measurementReference,
  repoRoot,
  acceptedMeasurement,
  acceptedOperation,
  attestation,
} = {}) {
  const record = parseJson(bytes, "RFD042_PROFILE_DECISION_RECEIPT_INVALID", "profile decision receipt");
  try {
    validateProfileMediaDecision(record);
  } catch (error) {
    if (error?.code !== "PRODUCTION_CAPABILITY_UNAVAILABLE") {
      normalizeCanonicalError(error, error?.code ?? "RFD042_PROFILE_DECISION_RECEIPT_INVALID", "profile decision receipt");
    }
  }
  if (JSON.stringify(record.measurement_receipt) !== JSON.stringify(measurementReference)) {
    fail("RFD042_MEASUREMENT_BINDING_MISMATCH", "profile decision does not bind the accepted RFD041 measurement");
  }
  if (!ACCEPTED_PROFILE_MEASUREMENTS.has(acceptedMeasurement)
    || !ACCEPTED_PROFILE_OPERATIONS.has(acceptedOperation)) {
    fail("RFD042_ACCEPTED_MEASUREMENT_REQUIRED", "profile decision requires canonical same-process measurement and operation capabilities");
  }
  if (JSON.stringify(acceptedMeasurement.receipt_reference) !== JSON.stringify(measurementReference)
    || JSON.stringify(acceptedOperation.measurement_reference) !== JSON.stringify(measurementReference)
    || JSON.stringify(acceptedMeasurement.source) !== JSON.stringify(acceptedOperation.source)) {
    fail("RFD042_MEASUREMENT_BINDING_MISMATCH", "profile decision does not use one accepted measurement-operation lineage");
  }
  parseTimestamp(acceptedMeasurement.generated_at, "accepted profile measurement generated_at");
  const acceptedMetrics = validateRf13ProfileMetrics(acceptedMeasurement.metrics);
  if (!attestation) {
    fail("RFD042_PRODUCTION_PROFILE_AUTHORITY_REQUIRED", "profile decision requires a detached governed decision attestation");
  }
  let authority;
  try {
    authority = validateRf13ReceiptAttestation({
      purpose: RF13_OPERATIONAL_ATTESTATION_POLICIES.profileDecision.purpose,
      reference: attestationReference(reference, record.schema_version),
      source: acceptedOperation?.source
        ? {
          sha: acceptedOperation.source.sha,
          tree: acceptedOperation.source.tree,
          dirty: acceptedOperation.source.dirty,
        }
        : undefined,
      attestation,
    });
  } catch {
    fail("RFD042_PRODUCTION_PROFILE_AUTHORITY_INVALID", "profile decision attestation is invalid");
  }
  if (!acceptedOperation?.attestation
    || parseTimestamp(authority.signed_at, "profile decision signed_at") < parseTimestamp(
      acceptedOperation.attestation.signed_at,
      "accepted profile operation signed_at",
    )) {
    fail("RFD042_PROFILE_DECISION_ORDER_INVALID", "profile decision must follow the accepted operation attestation");
  }
  if (new Set([
    acceptedMeasurement.attestation.approval_id,
    acceptedOperation.attestation.approval_id,
    authority.approval_id,
  ]).size !== 3 || new Set([
    acceptedMeasurement.attestation.key_id,
    acceptedOperation.attestation.key_id,
    authority.key_id,
  ]).size !== 3 || new Set([
    acceptedMeasurement.attestation.key_fingerprint_sha256,
    acceptedOperation.attestation.key_fingerprint_sha256,
    authority.key_fingerprint_sha256,
  ]).size !== 3) {
    fail("RFD042_PRODUCTION_PROFILE_AUTHORITY_INVALID", "measurement, operation, and decision require independent approval and key identities");
  }
  const measurementDate = acceptedMeasurement.generated_at.slice(0, 10);
  const signedDate = authority.signed_at.slice(0, 10);
  if (record.review_date < measurementDate || record.review_date > signedDate) {
    fail("RFD042_REVIEW_DATE_MISMATCH", "profile decision review date must be between measurement and trusted signing dates");
  }
  const selected = record.decision?.create_admin_goal === true ? "create_admin_goal" : "defer_server_file";
  const deferEligible = isProfileMediaDeferEligible(acceptedMetrics);
  const expectedDecision = deferEligible ? "defer_server_file" : "create_admin_goal";
  if (selected !== expectedDecision) {
    fail("RFD042_PROFILE_DECISION_MISMATCH", "profile decision does not match the accepted measurement thresholds");
  }
  if (selected === "create_admin_goal") {
    try {
      readAndValidateProfileMediaAdminGoal(repoRoot, record.admin_goal_reference);
    } catch (error) {
      normalizeCanonicalError(error, error?.code ?? "RFD042_ADMIN_GOAL_INVALID", "profile admin Goal");
    }
  } else if (record.admin_goal_reference !== null) {
    fail("RFD042_ADMIN_GOAL_INVALID", "defer decision cannot bind an admin Goal");
  }
  const policy = Object.freeze({ defer_eligible: deferEligible, expected_decision: expectedDecision });
  return Object.freeze({
    receipt_reference: Object.freeze({ ...reference }),
    record,
    accepted_measurement: Object.freeze({ ...acceptedMeasurement, metrics: acceptedMetrics }),
    decision: selected,
    defer_eligible: deferEligible,
    policy,
    attestation: authority,
  });
}
