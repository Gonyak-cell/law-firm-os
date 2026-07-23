import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { validatePrivateStagingInternalAuthContract } from "../lib/private-staging-internal-auth-contract.mjs";

function fixture() {
  return JSON.parse(readFileSync(new URL("../../infra/lawos-private-staging/internal-auth-contract.json", import.meta.url), "utf8"));
}

test("private staging internal auth contract is PostgreSQL-backed and first-use safe", () => {
  const result = validatePrivateStagingInternalAuthContract(fixture());
  assert.equal(result.verdict, "PASS");
  assert.equal(result.authority, "internal-password");
  assert.equal(result.directory_authority, "postgres-v2");
  assert.equal(result.entra_dependency_count, 0);
  assert.equal(result.real_email_delivery_authorized, false);
});

test("internal auth rejects static fallback, real staging email, and Entra", () => {
  const fallback = fixture();
  fallback.account_directory.static_roster_operational_fallback = true;
  assert.throws(() => validatePrivateStagingInternalAuthContract(fallback), /static roster fallback/u);

  const email = fixture();
  email.delivery.synthetic_mailboxes_only = false;
  assert.throws(() => validatePrivateStagingInternalAuthContract(email), /synthetic only/u);

  const entra = fixture();
  entra.authority = "entra-oidc";
  assert.throws(() => validatePrivateStagingInternalAuthContract(entra), /Entra/u);
});

test("internal auth rejects address and secret material in its source contract", () => {
  const address = fixture();
  address.delivery.sender = "person@example.com";
  assert.throws(() => validatePrivateStagingInternalAuthContract(address), /sender or recipient/u);

  const secret = fixture();
  secret.password_hash = "forbidden";
  assert.throws(() => validatePrivateStagingInternalAuthContract(secret), /credential material/u);
});
