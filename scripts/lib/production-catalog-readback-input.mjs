import {
  CATALOG_READBACK_ACTION,
  CATALOG_READBACK_OPERATION,
} from "../../packages/persistence/src/postgres/catalog-readback-authorization.js";
import {
  catalogReadbackCanonicalSnapshot,
} from "../../packages/persistence/src/postgres/catalog-readback-canonical.js";
import {
  canonicalizeJson,
} from "../../packages/runtime-auth/src/runtime-safety-approval-contract.js";
import {
  task3ExactKeys as exactKeys,
  task3Fail as fail,
} from "./production-catalog-readback-common.mjs";

const INVOKE_EVENT_KEYS = Object.freeze([
  "schema_version",
  "action",
  "operation",
  "packet",
  "authorization",
  "preflight_receipt_sha256",
]);
const INVOKE_AUTHORIZATION_KEYS = Object.freeze([
  "trust_registry_json",
  "approval_receipt_json",
  "approval_signature_base64",
]);
const EXECUTION_INPUT_KEYS = Object.freeze([
  "authorization",
  "event",
  "diagnosticZip",
  "rollbackZip",
  "confirmation",
  "preflightReceipt",
  "task2Inventory",
]);
const EXECUTION_AUTHORIZATION_KEYS = Object.freeze([
  "packet",
  "packet_sha256",
]);

export function validateExecutionInput(input) {
  exactKeys(
    input,
    EXECUTION_INPUT_KEYS,
    "TASK3_EXECUTION_INPUT_INVALID",
    "catalog readback execution input",
  );
  exactKeys(
    input.authorization,
    EXECUTION_AUTHORIZATION_KEYS,
    "TASK3_EXECUTION_INPUT_INVALID",
    "catalog readback execution authorization",
  );
  if (!Buffer.isBuffer(input.diagnosticZip)
    || !Buffer.isBuffer(input.rollbackZip)) {
    fail("TASK3_EXECUTION_INPUT_INVALID", "catalog readback ZIP bytes are invalid");
  }
  const snapshot = catalogReadbackCanonicalSnapshot({
    authorization: input.authorization,
    event: input.event,
    confirmation: input.confirmation,
    preflightReceipt: input.preflightReceipt,
    task2Inventory: input.task2Inventory,
  });
  return Object.freeze({
    ...snapshot,
    diagnosticZip: Buffer.from(input.diagnosticZip),
    rollbackZip: Buffer.from(input.rollbackZip),
  });
}

export function validateInvokeEvent(event, packet, preflightReceiptSha256) {
  const snapshot = catalogReadbackCanonicalSnapshot(event);
  exactKeys(
    snapshot,
    INVOKE_EVENT_KEYS,
    "TASK3_INVOKE_EVENT_INVALID",
    "catalog readback invoke event",
  );
  exactKeys(
    snapshot.authorization,
    INVOKE_AUTHORIZATION_KEYS,
    "TASK3_INVOKE_EVENT_INVALID",
    "catalog readback invoke authorization",
  );
  if (snapshot.schema_version
      !== "law-firm-os.production-migration-catalog-readback-event.v1"
    || snapshot.action !== CATALOG_READBACK_ACTION
    || snapshot.operation !== CATALOG_READBACK_OPERATION
    || snapshot.preflight_receipt_sha256 !== preflightReceiptSha256
    || canonicalizeJson(snapshot.packet) !== canonicalizeJson(packet)
    || Object.values(snapshot.authorization)
      .some((value) => typeof value !== "string" || !value)) {
    fail("TASK3_INVOKE_EVENT_INVALID", "catalog readback invoke event drifted");
  }
  return snapshot;
}
