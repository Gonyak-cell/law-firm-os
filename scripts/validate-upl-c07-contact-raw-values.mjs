#!/usr/bin/env node
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();

function read(path) {
  return readFileSync(join(ROOT, path), "utf8");
}

function readJson(path) {
  return JSON.parse(read(path));
}

function assertExists(path) {
  assert.ok(existsSync(join(ROOT, path)), `${path} must exist`);
}

function assertPatterns(path, patterns) {
  const source = read(path);
  for (const pattern of patterns) assert.match(source, pattern, `${path} must match ${pattern}`);
}

assertPatterns("apps/api/src/crm-intake-runtime-context.js", [
  /function normalizeRawContactValue/,
  /input\.email \?\? input\.email_value/,
  /input\.phone \?\? input\.mobile_phone/,
  /raw_contact_value_stored: rawContactValue\.hasValue/,
  /const CONTACT_VALUE_READER_ROLES/,
  /crm_contact_value_reader/,
  /return hasReaderRole && String\(query\?\.permission_ref \?\? ""\)\.includes\("contact_value"\)/,
  /email_value_included: contactType === "email"/,
  /phone_value_included: contactType === "phone"/,
  /contact_value_masked: Boolean\(rawValue\)/,
]);

assertPatterns("apps/api/test/cmp-r4-g6-crm-intake.test.js", [
  /raw@example\.invalid/,
  /contact_point_value_included, false/,
  /contact_point_value_included, true/,
  /email_value_included, true/,
  /raw_contact_value_stored, true/,
  /patched@example\.invalid/,
]);

assertPatterns("apps/web/src/data/apiClient.js", [
  /ui_upl_c07_contact_value_read/,
  /ui_upl_c07_contact_value_write/,
  /crm_contact_value_reader/,
  /\.\.\.\(contactEmail \? \{ email: contactEmail \} : \{\}\)/,
  /\.\.\.\(contactPhone \? \{ phone: contactPhone \} : \{\}\)/,
]);

assertExists("scripts/run-upl-c07-contact-raw-values-proof.mjs");
const proof = readJson("artifacts/manual-qa/upl-c07-contact-raw-values-proof.json");
assert.equal(proof.verdict, "PASS");
assert.equal(proof.contract_ref, "UPL-C-07");
assert.deepEqual(proof.route_surface, ["POST /api/crm/contacts", "GET /api/crm/contacts"]);
assert.ok(proof.checks.every((check) => check.passed === true));
assert.equal(proof.observed.created.email.status, 201);
assert.equal(proof.observed.created.phone.status, 201);
assert.equal(proof.observed.created.email.audit_metadata.raw_contact_value_stored, true);
assert.equal(proof.observed.created.phone.audit_metadata.raw_contact_value_stored, true);
assert.equal(proof.observed.masked_read.email.contact_point_value_included, false);
assert.equal(proof.observed.masked_read.email.contact_value_masked, true);
assert.equal("email" in proof.observed.masked_read.email, false);
assert.equal(proof.observed.visible_read.email.email_value_included, true);
assert.equal(proof.observed.visible_read.email.email, "contact.raw.uplc07@example.invalid");
assert.equal(proof.observed.visible_read.phone.phone_value_included, true);
assert.equal(proof.observed.visible_read.phone.phone, "+82 10-5555-0707");
assert.equal(proof.observed.restart_visible_read.email.contact_point_value, "contact.raw.uplc07@example.invalid");
assert.equal(proof.observed.restart_visible_read.phone.contact_point_value, "+82 10-5555-0707");
assertExists("artifacts/manual-qa/upl-c07-contact-raw-values-proof.md");

console.log(JSON.stringify({ ok: true, validator: "UPL-C-07", proof: proof.contract_ref }, null, 2));
