import { S3Client } from "@aws-sdk/client-s3";
import {
  validateHrxRelationalMappingManifest,
} from "../../../packages/hrx/src/relational-projection-contract.js";
import {
  validateHrxRelationalProjectionValidation,
} from "../../../packages/hrx/src/relational-projection-validation.js";
import {
  IMMUTABLE_PROGRAM_INPUT_LOCATOR_VERSION,
  readImmutableProgramJson,
} from "./immutable-program-input.js";
import {
  resolveJsonPostgresScheduledProgramEvent,
} from "./json-postgres-program-inputs.js";

const SHA1 = /^[a-f0-9]{40}$/u;
const SHA256 = /^[a-f0-9]{64}$/u;
const AWS_ACCOUNT = /^\d{12}$/u;
const MAX_MAPPING_BYTES = 16 * 1024 * 1024;
const MAX_VALIDATION_BYTES = 16 * 1024 * 1024;
const MAX_EVENT_LOCATOR_BYTES = 640;

function fail(message) {
  throw Object.assign(new Error(message), {
    code: "LAWOS_HRX_PROJECTION_RUNTIME_INPUT",
    safe_error_code: "LAWOS_HRX_PROJECTION_RUNTIME_INPUT",
  });
}

function requiredText(value, label, pattern = null) {
  const text = String(value ?? "").trim();
  if (!text || (pattern && !pattern.test(text))) {
    fail(`${label} is invalid`);
  }
  return text;
}

function parseLocator(value) {
  const text = requiredText(
    value,
    "LAWOS_HRX_RELATIONAL_PROJECTION_EVENT_LOCATOR",
  );
  if (Buffer.byteLength(text) > MAX_EVENT_LOCATOR_BYTES) {
    fail("HRX relational projection event locator is too large");
  }
  try {
    return JSON.parse(text);
  } catch {
    fail("HRX relational projection event locator is not valid JSON");
  }
}

export async function loadHrxRelationalProjectionRuntimeInput({
  env = process.env,
  s3Client = new S3Client({
    region: env.AWS_REGION ?? env.AWS_DEFAULT_REGION,
  }),
  resolveEvent = resolveJsonPostgresScheduledProgramEvent,
  readJson = readImmutableProgramJson,
  validateMapping = validateHrxRelationalMappingManifest,
  validateValidation = validateHrxRelationalProjectionValidation,
} = {}) {
  const enabled = String(
    env.LAWOS_HRX_RELATIONAL_PROJECTION_ENABLED ?? "false",
  ).trim();
  if (enabled === "false") return null;
  if (enabled !== "true") {
    fail("LAWOS_HRX_RELATIONAL_PROJECTION_ENABLED must be true or false");
  }
  const sourceSha = requiredText(
    env.LAWOS_DEPLOYMENT_COMMIT,
    "LAWOS_DEPLOYMENT_COMMIT",
    SHA1,
  );
  const sourceTree = requiredText(
    env.LAWOS_DEPLOYMENT_TREE,
    "LAWOS_DEPLOYMENT_TREE",
    SHA1,
  );
  const artifactSha256 = requiredText(
    env.LAWOS_DEPLOYMENT_ARTIFACT_SHA256,
    "LAWOS_DEPLOYMENT_ARTIFACT_SHA256",
    SHA256,
  );
  const packetSha256 = requiredText(
    env.LAWOS_EXECUTION_PACKET_SHA256,
    "LAWOS_EXECUTION_PACKET_SHA256",
    SHA256,
  );
  const bucket = requiredText(
    env.LAWOS_PROGRAM_INPUT_BUCKET,
    "LAWOS_PROGRAM_INPUT_BUCKET",
  );
  const expectedBucketOwner = requiredText(
    env.LAWOS_AWS_ACCOUNT_ID,
    "LAWOS_AWS_ACCOUNT_ID",
    AWS_ACCOUNT,
  );
  const expectedKmsKeyArn = requiredText(
    env.LAWOS_PROGRAM_INPUT_KMS_KEY_ARN,
    "LAWOS_PROGRAM_INPUT_KMS_KEY_ARN",
  );
  const eventLocator = parseLocator(
    env.LAWOS_HRX_RELATIONAL_PROJECTION_EVENT_LOCATOR,
  );
  if (eventLocator?.schema_version
      !== IMMUTABLE_PROGRAM_INPUT_LOCATOR_VERSION) {
    fail("HRX relational projection event must use an immutable locator");
  }
  const event = await resolveEvent({
    event: eventLocator,
    env,
    s3Client,
  });
  if (event.source_sha !== sourceSha
    || event.source_tree !== sourceTree
    || event.artifact_sha256 !== artifactSha256
    || event.packet_sha256 !== packetSha256
    || event.mode !== "resume"
    || !event.inputs?.mapping_manifest
    || !event.inputs?.validation_evidence) {
    fail("HRX relational projection event drifted from the deployed exact source");
  }
  const read = (locator, maxBytes) => readJson({
    locator,
    client: s3Client,
    expectedBucket: bucket,
    expectedBucketOwner,
    expectedKmsKeyArn,
    maxBytes,
  });
  const [mappingManifest, validationEvidence] = await Promise.all([
    read(event.inputs.mapping_manifest, MAX_MAPPING_BYTES),
    read(event.inputs.validation_evidence, MAX_VALIDATION_BYTES),
  ]);
  validateMapping(mappingManifest);
  validateValidation(validationEvidence);
  if (validationEvidence.outcome !== "PASS"
    || validationEvidence.source_sha !== sourceSha
    || validationEvidence.source_tree !== sourceTree
    || validationEvidence.packet_sha256 !== packetSha256
    || validationEvidence.mapping_manifest_sha256
      !== mappingManifest.manifest_sha256
    || validationEvidence.inventory_sha256
      !== mappingManifest.inventory_sha256
    || validationEvidence.performance_acceptance_sha256
      !== mappingManifest.performance_acceptance_sha256
    || validationEvidence.source_authority
      !== "postgres-v2-generic-ledger"
    || validationEvidence.projection_authority !== "read-only"
    || validationEvidence.claims?.generic_ledger_authority_preserved
      !== true
    || validationEvidence.claims?.projection_consumers_read_only
      !== true
    || validationEvidence.claims?.authority_promotion_not_granted
      !== true) {
    fail("HRX relational projection validation evidence binding drifted");
  }
  return Object.freeze({
    mappingManifest,
    validationEvidence,
    source_authority: "postgres-v2-generic-ledger",
    projection_authority: "read-model-only",
    json_fallback: false,
  });
}
