import assert from "node:assert/strict";
import test from "node:test";

import {
  OUTLOOK_VAULT_DELIVERY_TOKEN_MAX_TTL_MS,
  createOutlookVaultDeliveryTokenAuthority,
} from "../src/outlook-vault-delivery-token.js";

const SECRET = "outlook-vault-delivery-test-secret-material-0001";
const PRINCIPAL = Object.freeze({
  tenant_id: "tenant_delivery_token",
  user_id: "user_delivery_token",
  entra_subject_id: "subject_delivery_token",
});
const INPUT = Object.freeze({
  principal: PRINCIPAL,
  operation_id: `vaultop_${"1".repeat(32)}`,
  installation_ref_sha256: "2".repeat(64),
  compose_target_sha256: "3".repeat(64),
  exact_version_ref_sha256: "4".repeat(64),
  expires_at: "2026-08-29T01:02:00.000Z",
});

function harness(overrides = {}) {
  let timestamp = Date.parse("2026-08-29T01:00:00.000Z");
  const authority = createOutlookVaultDeliveryTokenAuthority({
    secret: SECRET,
    now: () => timestamp,
    randomBytesFn: () => Buffer.from("010203040506070809101112", "hex"),
    ...overrides,
  });
  return {
    authority,
    advance(milliseconds) { timestamp += milliseconds; },
  };
}

test("delivery token is opaque, Office-URI bounded, and bound to exact export claims", () => {
  const { authority } = harness();
  const issued = authority.issue(INPUT);
  assert.ok(issued.token_length < 1_800);
  assert.equal(issued.expires_at, "2026-08-29T01:01:00.000Z");
  assert.equal(issued.token.includes(PRINCIPAL.tenant_id), false);
  assert.equal(issued.token.includes(INPUT.operation_id), false);

  const verified = authority.verify(issued.token);
  assert.equal(verified.ok, true);
  assert.deepEqual(verified.claims, {
    schema: authority.schema,
    tenant_id: PRINCIPAL.tenant_id,
    user_id: PRINCIPAL.user_id,
    entra_subject_id: PRINCIPAL.entra_subject_id,
    operation_id: INPUT.operation_id,
    installation_ref_sha256: INPUT.installation_ref_sha256,
    compose_target_sha256: INPUT.compose_target_sha256,
    exact_version_ref_sha256: INPUT.exact_version_ref_sha256,
    iat: Date.parse("2026-08-29T01:00:00.000Z"),
    exp: Date.parse("2026-08-29T01:01:00.000Z"),
  });
});

test("delivery token fails closed after expiry, tampering, or a different server secret", () => {
  const state = harness();
  const issued = state.authority.issue(INPUT);
  const tampered = `${issued.token.slice(0, -1)}${issued.token.endsWith("A") ? "B" : "A"}`;
  assert.deepEqual(state.authority.verify(tampered), {
    ok: false,
    status: 403,
    safe_error_code: "OUTLOOK_VAULT_DELIVERY_TOKEN_INVALID",
  });

  const other = createOutlookVaultDeliveryTokenAuthority({
    secret: "outlook-vault-delivery-other-secret-material-0002",
  });
  assert.equal(other.verify(issued.token).ok, false);

  state.advance(OUTLOOK_VAULT_DELIVERY_TOKEN_MAX_TTL_MS);
  assert.deepEqual(state.authority.verify(issued.token), {
    ok: false,
    status: 410,
    safe_error_code: "OUTLOOK_VAULT_DELIVERY_TOKEN_EXPIRED",
  });
});

test("delivery token authority rejects weak keys, invalid claims, and overlong TTL configuration", () => {
  assert.throws(
    () => createOutlookVaultDeliveryTokenAuthority({ secret: "too-short" }),
    /at least 32 bytes/u,
  );
  assert.throws(
    () => createOutlookVaultDeliveryTokenAuthority({
      secret: SECRET,
      maxTtlMs: OUTLOOK_VAULT_DELIVERY_TOKEN_MAX_TTL_MS + 1,
    }),
    /between 1 and 60 seconds/u,
  );
  const { authority } = harness();
  assert.throws(
    () => authority.issue({ ...INPUT, compose_target_sha256: "not-a-digest" }),
    /compose_target_sha256 is invalid/u,
  );
  assert.throws(
    () => authority.issue({ ...INPUT, expires_at: "2026-08-29T00:59:59.000Z" }),
    /expiry is invalid/u,
  );
});
