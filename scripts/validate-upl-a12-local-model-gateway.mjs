#!/usr/bin/env node
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = process.cwd();
const artifactPath = "artifacts/manual-qa/upl-a12-local-model-gateway-proof.json";
const matrixPath = "artifacts/manual-qa/wave1-70-tuw-strict-verification-2026-07-03.md";

function read(path) {
  return readFileSync(resolve(ROOT, path), "utf8");
}

function assertHash(value, label) {
  assert.match(String(value ?? ""), /^[a-f0-9]{64}$/, `${label} must be a sha256 hash`);
}

assert.equal(existsSync(resolve(ROOT, artifactPath)), true, `missing ${artifactPath}`);
assert.equal(existsSync(resolve(ROOT, matrixPath)), true, `missing ${matrixPath}`);

const artifactText = read(artifactPath);
const artifact = JSON.parse(artifactText);
const matrix = read(matrixPath);

assert.equal(artifact.schema_version, "lawos.wave1.upl-a12.local-model-gateway-proof.v1");
assert.deepEqual(artifact.row_ids, ["UPL-A-12", "UPL-D-16"]);
assert.equal(artifact.status, "PASS");
assert.equal(artifact.strict_boundary.approved_local_model_gateway, true);
assert.equal(artifact.strict_boundary.prompt_response_text_stored, false);
assert.equal(artifact.strict_boundary.production_ready_claim, false);
assert.equal(artifact.provider_receipt.external_call_made, true);
assert.equal(typeof artifact.provider_receipt.provider, "string");
assert.equal(typeof artifact.provider_receipt.model, "string");
assertHash(artifact.provider_receipt.request_hash, "provider request_hash");
assertHash(artifact.provider_receipt.response_hash, "provider response_hash");
assertHash(artifact.audit_receipt.prompt_hash, "audit prompt_hash");
assertHash(artifact.audit_receipt.output_hash, "audit output_hash");
assert.equal(artifact.audit_receipt.payload_policy, "metadata_only");
assert.equal(artifact.review_queue_receipt.state, "pending_review");
assert.equal(artifact.review_queue_receipt.answer_status, "review_required");
assert.ok(artifact.review_queue_receipt.review_id.startsWith("review-upl-a12-local-model-"));

for (const id of [
  "ollama-model-installed",
  "route-used-real-model",
  "model-request-hash-present",
  "model-response-hash-present",
  "review-queue-item-created",
  "audit-event-created",
  "audit-payload-policy-metadata-only",
  "blocked-raw-fields-rejected",
  "artifact-omits-prompt-and-response-text",
]) {
  assert.equal(artifact.checks.find((check) => check.id === id)?.passed, true, `artifact check failed: ${id}`);
}

for (const field of ["employee_salary", "document_body", "client_secret"]) {
  assert.equal(artifact.blocked_field_checks.find((check) => check.field === field)?.passed, true, `${field} must be rejected`);
}

for (const forbidden of [
  "Summarize leave policy guidance",
  "raw-fixture-value-not-sent",
  "연차 정책은",
  "Hello, how are you",
]) {
  assert.equal(artifactText.includes(forbidden), false, `artifact leaked prompt/response text: ${forbidden}`);
}

assert.match(matrix, /\| UPL-A-12 \| PASS \|/);
assert.match(matrix, /\| UPL-D-16 \| PASS \|/);

console.log("UPL-A-12 local model gateway validator PASS");
