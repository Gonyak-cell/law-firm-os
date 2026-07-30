import assert from "node:assert/strict";
import test from "node:test";
import {
  BANK_IMPORT_PREVIEW_TOKEN_PREFIX,
  createBankImportPreviewTokenAuthority,
} from "../src/bank-import-preview-token.js";

const SECRET = "bank-import-preview-test-secret-material-123456789";
const ISSUED_AT = Date.parse("2026-07-30T01:00:00.000Z");
const input = Object.freeze({
  preview_id: "bank_import_preview_1234567890abcdef12345678",
  preview_manifest_sha256: "a".repeat(64),
  source_file_sha256: "b".repeat(64),
  source_type: "xlsx",
  account_ref: "account-preview-test",
  tenant_id: "tenant-preview-test",
  actor_id: "user-preview-test",
});

test("CL-P1-W01-T03 preview confirmation tokens bind tenant, actor, file, account, and manifest", () => {
  let now = ISSUED_AT;
  const authority = createBankImportPreviewTokenAuthority({
    secret: SECRET,
    now: () => now,
  });
  const issued = authority.issue(input);

  assert.match(issued.token, new RegExp(`^${BANK_IMPORT_PREVIEW_TOKEN_PREFIX}\\.`));
  assert.equal(issued.expires_at, "2026-07-30T01:10:00.000Z");
  assert.equal(authority.verify(issued.token, input).ok, true);
  assert.equal(createBankImportPreviewTokenAuthority({
    secret: SECRET,
    now: () => now,
  }).verify(issued.token, input).ok, true);
  assert.equal(authority.verify(issued.token, {
    ...input,
    actor_id: "another-user",
  }).reason, "bank_import_preview_token_mismatch");

  const suffix = issued.token.endsWith("a") ? "b" : "a";
  const tampered = `${issued.token.slice(0, -1)}${suffix}`;
  assert.equal(authority.verify(tampered).reason, "bank_import_preview_token_invalid");

  now += 10 * 60 * 1000;
  const expired = authority.verify(issued.token);
  assert.equal(expired.reason, "bank_import_preview_token_expired");
  assert.equal(expired.payload.preview_manifest_sha256, input.preview_manifest_sha256);
});

test("CL-P1-W01-T03 preview token authority rejects weak secrets and excessive lifetimes", () => {
  assert.throws(
    () => createBankImportPreviewTokenAuthority({ secret: "short" }),
    /at least 32 bytes/,
  );
  assert.throws(
    () => createBankImportPreviewTokenAuthority({ secret: SECRET, ttlMs: 31 * 60 * 1000 }),
    /between 1 and 30 minutes/,
  );
});
