import { existsSync, readFileSync } from "node:fs";
import {
  canonicalizeJson,
  sha256Hex,
  validateRuntimeSafetyApprovalBundle,
} from "./runtime-safety-approval-contract.mjs";

export const DECISION_PACKET_SCHEMA_VERSION = "law-firm-os.runtime-safety.decision-packet.v1";

const SHA1 = /^[0-9a-f]{40}$/u;
const TOKEN = /^[A-Za-z0-9._:-]+$/u;
const CLOSED_PACKET_KEYS = Object.freeze([
  "schema_version",
  "packet_id",
  "decision_source_sha",
  "decision_source_tree",
  "action",
  "environment",
  "required_role",
  "allowed_decisions",
  "current_state",
  "requirements",
  "options",
  "external_actions_authorized",
  "claims",
]);

function fail(code, message, details = {}) {
  const error = new Error(message);
  error.code = code;
  error.details = details;
  throw error;
}

function assertClosedObject(value, allowedKeys, code, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(code, `${label} must be an object`);
  const extras = Object.keys(value).filter((key) => !allowedKeys.includes(key));
  if (extras.length > 0) fail(code, `${label} contains unsupported fields`, { extras });
}

function stringArray(value, field) {
  if (!Array.isArray(value) || value.length === 0 || value.some((entry) => typeof entry !== "string" || entry.trim() === "")) {
    fail("DECISION_PACKET", `${field} must be a non-empty string array`);
  }
  if (new Set(value).size !== value.length) fail("DECISION_PACKET", `${field} contains duplicates`);
}

export function validateDecisionPacket(packet, expected = {}) {
  assertClosedObject(packet, CLOSED_PACKET_KEYS, "DECISION_PACKET", "decision packet");
  if (packet.schema_version !== DECISION_PACKET_SCHEMA_VERSION) fail("DECISION_PACKET", "unsupported decision packet schema");
  for (const field of ["packet_id", "action", "environment", "required_role"]) {
    if (typeof packet[field] !== "string" || !TOKEN.test(packet[field])) fail("DECISION_PACKET", `${field} is invalid`);
  }
  if (!SHA1.test(packet.decision_source_sha ?? "") || !SHA1.test(packet.decision_source_tree ?? "")) {
    fail("DECISION_PACKET", "decision source SHA/tree binding is invalid");
  }
  if (packet.decision_source_sha !== expected.sourceSha || packet.decision_source_tree !== expected.sourceTree) {
    fail("DECISION_SOURCE", "decision packet does not bind the expected source SHA/tree");
  }
  if (packet.action !== expected.action || packet.environment !== expected.environment) {
    fail("DECISION_SCOPE", "decision packet action/environment binding does not match");
  }
  if (packet.required_role !== (expected.role ?? "owner")) fail("DECISION_ROLE", "decision packet role does not match");
  if (JSON.stringify(packet.allowed_decisions) !== JSON.stringify(["approved", "rejected"])) {
    fail("DECISION_PACKET", "allowed_decisions must be the closed approved/rejected pair");
  }
  if (packet.current_state !== "PENDING_HUMAN_APPROVAL") fail("DECISION_PACKET", "source packet must remain pending until a detached receipt is validated");
  stringArray(packet.requirements, "requirements");
  if (!Array.isArray(packet.options) || packet.options.length !== 2) fail("DECISION_PACKET", "options must describe approved and rejected outcomes");
  const optionDecisions = [];
  for (const option of packet.options) {
    assertClosedObject(option, ["decision", "effects", "prohibited_actions"], "DECISION_PACKET", "decision option");
    if (!packet.allowed_decisions.includes(option.decision)) fail("DECISION_PACKET", "decision option is not allowed");
    stringArray(option.effects, "option.effects");
    stringArray(option.prohibited_actions, "option.prohibited_actions");
    optionDecisions.push(option.decision);
  }
  if (new Set(optionDecisions).size !== 2) fail("DECISION_PACKET", "decision options are duplicated");
  if (packet.external_actions_authorized !== false) fail("DECISION_PACKET", "decision packet may not authorize external execution");
  assertClosedObject(packet.claims, ["release", "deployment", "cutover", "go_live"], "DECISION_PACKET", "decision packet claims");
  if (Object.values(packet.claims).some((claim) => claim !== false)) fail("DECISION_PACKET", "decision packet contains an affirmative external claim");
  const canonical = canonicalizeJson(packet);
  return Object.freeze({ packet, canonical, packet_sha256: sha256Hex(canonical) });
}

export function evaluateDecisionGate({
  packet,
  sourceSha,
  sourceTree,
  action,
  environment,
  role = "owner",
  trustRegistryPath,
  expectedTrustRegistrySha256,
  approvalReceiptPath,
  now,
} = {}) {
  const validated = validateDecisionPacket(packet, { sourceSha, sourceTree, action, environment, role });
  const missing = [];
  if (!trustRegistryPath || !existsSync(trustRegistryPath)) missing.push("trust_registry");
  if (!/^[0-9a-f]{64}$/u.test(expectedTrustRegistrySha256 ?? "")) missing.push("trust_registry_sha256");
  if (!approvalReceiptPath || !existsSync(approvalReceiptPath) || !existsSync(`${approvalReceiptPath}.sig`)) missing.push("approval_receipt");
  if (missing.length > 0) {
    return Object.freeze({
      outcome: "pending",
      decision: null,
      verified: false,
      implementation_state: "READY",
      execution_state: "APPROVAL_REQUIRED",
      packet_sha256: validated.packet_sha256,
      source_sha: sourceSha,
      source_tree: sourceTree,
      missing: Object.freeze(missing),
      external_actions_executed: 0,
    });
  }
  const approval = validateRuntimeSafetyApprovalBundle({
    registryPath: trustRegistryPath,
    expectedRegistrySha256: expectedTrustRegistrySha256,
    receiptPath: approvalReceiptPath,
    expectedRole: role,
    expectedAction: action,
    expectedEnvironment: environment,
    expectedPacketSha256: validated.packet_sha256,
    expectedSourceSha: sourceSha,
    expectedSourceTree: sourceTree,
    allowedDataScope: [],
    allowedContactScope: [],
    now,
  });
  return Object.freeze({
    outcome: approval.decision,
    decision: approval.decision,
    verified: true,
    implementation_state: "VERIFIED",
    execution_state: "NOT_APPLICABLE",
    packet_sha256: validated.packet_sha256,
    source_sha: sourceSha,
    source_tree: sourceTree,
    approval_id: approval.approval_id,
    key_id: approval.key_id,
    registry_sha256: approval.registry_sha256,
    external_actions_executed: 0,
  });
}

export function readDecisionPacket(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    fail("DECISION_PACKET_JSON", "decision packet must be valid JSON", { cause: error?.message });
  }
}
