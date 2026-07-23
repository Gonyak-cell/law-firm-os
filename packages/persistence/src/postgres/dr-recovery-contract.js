import { createHash } from "node:crypto";
import { canonicalizeJson } from "../../../runtime-auth/src/runtime-safety-approval-contract.js";
import { validateJsonPostgresPerformanceAcceptance } from "./performance-acceptance.js";

export const JSON_POSTGRES_DR_TARGET_VERSION =
  "law-firm-os.json-postgres-dr-target.v1";

const SHA1 = /^[0-9a-f]{40}$/u;
const SHA256 = /^[0-9a-f]{64}$/u;
const IDENTIFIER = /^[a-z][a-z0-9-]{0,62}$/u;
const TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u;
const KEYS = Object.freeze([
  "schema_version",
  "source_sha",
  "source_tree",
  "packet_sha256",
  "performance_acceptance_sha256",
  "cut009_receipt_sha256",
  "migration_result_sha256",
  "source_database_identifier",
  "restore_database_identifier",
  "endpoint_address",
  "endpoint_port",
  "database_name",
  "aws_account",
  "aws_region",
  "source_latest_restorable_at",
  "restore_started_at",
  "restore_available_at",
  "rpo_ms",
  "rto_ms",
  "vpc_sha256",
  "subnet_group_sha256",
  "security_group_set_sha256",
  "kms_key_arn_sha256",
  "isolated",
  "public_access",
  "deletion_protection",
  "dr_target_sha256",
]);

function fail(message) {
  throw new Error(message);
}

function material(value) {
  return Object.fromEntries(KEYS
    .filter((key) => key !== "dr_target_sha256")
    .map((key) => [key, value[key]]));
}

function digest(value) {
  return createHash("sha256").update(canonicalizeJson(material(value))).digest("hex");
}

export function createJsonPostgresDrTarget(input = {}, {
  performanceAcceptance,
} = {}) {
  const acceptance = validateJsonPostgresPerformanceAcceptance(performanceAcceptance);
  const value = Object.fromEntries(KEYS
    .filter((key) => !["schema_version", "dr_target_sha256"].includes(key))
    .map((key) => [key, input[key]]));
  value.schema_version = JSON_POSTGRES_DR_TARGET_VERSION;
  value.performance_acceptance_sha256 = acceptance.acceptance_sha256;
  value.dr_target_sha256 = digest(value);
  validateJsonPostgresDrTarget(value, { performanceAcceptance });
  return Object.freeze(value);
}

export function validateJsonPostgresDrTarget(value = {}, {
  sourceSha,
  sourceTree,
  packetSha256,
  performanceAcceptance,
} = {}) {
  const acceptance = validateJsonPostgresPerformanceAcceptance(performanceAcceptance);
  if (!value || typeof value !== "object" || Array.isArray(value)
    || JSON.stringify(Object.keys(value).sort()) !== JSON.stringify([...KEYS].sort())
    || value.schema_version !== JSON_POSTGRES_DR_TARGET_VERSION
    || !SHA1.test(value.source_sha ?? "")
    || !SHA1.test(value.source_tree ?? "")
    || !SHA256.test(value.packet_sha256 ?? "")
    || !SHA256.test(value.performance_acceptance_sha256 ?? "")
    || !SHA256.test(value.cut009_receipt_sha256 ?? "")
    || !SHA256.test(value.migration_result_sha256 ?? "")
    || !IDENTIFIER.test(value.source_database_identifier ?? "")
    || !IDENTIFIER.test(value.restore_database_identifier ?? "")
    || value.source_database_identifier !== "lawos-production-postgres"
    || !value.restore_database_identifier.startsWith(`lawos-production-dr-${value.source_sha.slice(0, 10)}-`)
    || value.aws_account !== "770880870480"
    || value.aws_region !== "ap-northeast-2"
    || !new RegExp(`^[a-z0-9-]+\\.[a-z0-9.-]+\\.${value.aws_region}\\.rds\\.amazonaws\\.com$`, "u")
      .test(value.endpoint_address ?? "")
    || value.endpoint_port !== 5432
    || value.database_name !== "lawos"
    || ![value.source_latest_restorable_at, value.restore_started_at, value.restore_available_at]
      .every((time) => TIME.test(time ?? "") && Number.isFinite(Date.parse(time)))
    || Date.parse(value.restore_available_at) < Date.parse(value.restore_started_at)
    || !Number.isSafeInteger(value.rpo_ms)
    || value.rpo_ms < 0
    || !Number.isSafeInteger(value.rto_ms)
    || value.rto_ms < 0
    || [value.vpc_sha256, value.subnet_group_sha256, value.security_group_set_sha256, value.kms_key_arn_sha256]
      .some((hash) => !SHA256.test(hash ?? ""))
    || value.isolated !== true
    || value.public_access !== false
    || value.deletion_protection !== false
    || value.performance_acceptance_sha256 !== acceptance.acceptance_sha256
    || value.rpo_ms > acceptance.rpo_target_ms
    || value.rto_ms > acceptance.rto_target_ms
    || value.dr_target_sha256 !== digest(value)) {
    fail("DR target schema, binding, isolation, objective, or digest is invalid");
  }
  if ((sourceSha && value.source_sha !== sourceSha)
    || (sourceTree && value.source_tree !== sourceTree)
    || (packetSha256 && value.packet_sha256 !== packetSha256)) {
    fail("DR target source or packet binding drifted");
  }
  return Object.freeze({
    valid: true,
    dr_target_sha256: value.dr_target_sha256,
    rpo_ms: value.rpo_ms,
    rto_ms: value.rto_ms,
  });
}
