import assert from "node:assert/strict";
import { createHash } from "node:crypto";

const privateKeyPattern = /(?:authorization|password|secret|token|email|tenant_id|user_id|employee_id|session_id|profile_ref|display_name|legal_name|idempotency_key|matter_id|task_id|followup_id|invoice_id|payment_id|prebill_id|wip_item_id|source_ref|resource_id)$/i;
const privateTextKeyPattern = /(?:authorization|password|secret|token|email|display_name|legal_name)$/i;
const privateTextPatterns = [
  /(?:^|["'\s])\/Users\//,
  /(?:^|["'\s])[A-Za-z]:\\Users\\/i,
  /file:\/\//i,
  /lawos_session_v1\./,
  /tenant_[a-z0-9_-]+/i,
  /employee[-_][a-z0-9_-]+/i,
];

function canonicalValue(value) {
  if (Array.isArray(value)) return value.map((item) => canonicalValue(item));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value).sort().map((key) => [key, canonicalValue(value[key])]),
    );
  }
  return value ?? null;
}

export function contentSha256(value) {
  return createHash("sha256")
    .update(JSON.stringify(canonicalValue(value)))
    .digest("hex");
}

function collectPrivateValue(value, key, result) {
  if (privateKeyPattern.test(key)) {
    const leaves = Array.isArray(value) ? value : [value];
    for (const leaf of leaves) {
      const text = ["string", "number"].includes(typeof leaf) ? String(leaf) : "";
      if (text && (privateTextKeyPattern.test(key) || text.length >= 8)) result.add(text);
      else if (leaf && typeof leaf === "object") {
        for (const [childKey, nested] of Object.entries(leaf)) collectPrivateValue(nested, childKey, result);
      }
    }
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectPrivateValue(item, key, result);
    return;
  }
  if (value && typeof value === "object") {
    for (const [childKey, child] of Object.entries(value)) collectPrivateValue(child, childKey, result);
  }
}

export function collectPrivateValues(...values) {
  const result = new Set();
  for (const value of values) collectPrivateValue(value, "", result);
  return [...result].sort();
}

export function sanitizeHttpReceiptRows(rows) {
  return rows.map((row) => ({
    sequence: Number.isInteger(row.sequence) ? row.sequence : null,
    method: String(row.method ?? ""),
    status: Number.isInteger(row.status) ? row.status : null,
    browser_delivery: String(row.browser_delivery ?? "unknown"),
    observation_kind: String(row.observation_kind ?? "browser"),
    path_sha256: contentSha256(row.path),
    query_sha256: contentSha256(row.query),
    request_body_sha256: contentSha256(row.request_body),
    response_body_sha256: contentSha256(row.response_body),
    failure_sha256: contentSha256(row.failure),
  }));
}

function assertSafeKeys(value) {
  if (Array.isArray(value)) {
    for (const item of value) assertSafeKeys(item);
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    assert.equal(privateKeyPattern.test(key), false, `private evidence key is forbidden: ${key}`);
    assertSafeKeys(child);
  }
}

export function assertNoPrivateEvidence(value, privateValues = []) {
  assertSafeKeys(value);
  const serialized = JSON.stringify(value);
  for (const pattern of privateTextPatterns) {
    assert.equal(pattern.test(serialized), false, `private evidence text matched ${pattern}`);
  }
  for (const privateValue of privateValues) {
    if (!privateValue) continue;
    assert.equal(
      serialized.includes(String(privateValue)),
      false,
      `private evidence value leaked (${contentSha256(privateValue)})`,
    );
  }
}

export function assertOpaqueReceipt(receipt) {
  assert.equal(receipt.schema_version, "rf12-sanitized-http-receipt-v2");
  assert.ok(Array.isArray(receipt.requests));
  for (const row of receipt.requests) {
    for (const key of [
      "path_sha256",
      "query_sha256",
      "request_body_sha256",
      "response_body_sha256",
      "failure_sha256",
    ]) assert.match(row[key], /^[0-9a-f]{64}$/);
  }
}
