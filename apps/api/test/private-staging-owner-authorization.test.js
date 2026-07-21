import assert from "node:assert/strict";
import { createHash, generateKeyPairSync, sign } from "node:crypto";
import test from "node:test";
import { authorizePrivateStagingAdminInvocation, PRIVATE_STAGING_OWNER_AUTHORIZATION_ACTION } from "../src/private-staging-owner-authorization.js";
import { canonicalizeJson } from "../../../packages/runtime-auth/src/runtime-safety-approval-contract.js";

const SOURCE_SHA = "a".repeat(40);
const SOURCE_TREE = "b".repeat(40);
const PACKET_SHA = "c".repeat(64);
const APPROVAL_ID = "LAWOS-PRIVATE-STAGING-OWNER-AUTHORIZATION-TEST";
const ADMIN_ACTION = "lawos-private-staging-database-bootstrap";
const NOW = Date.parse("2026-07-20T12:00:00.000Z");

function bundle({ expired = false, revoked = false } = {}) {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const registry = {
    schema_version: "law-firm-os.runtime-safety.approval-trust-registry.v1",
    generated_at: "2026-07-20T00:00:00.000Z",
    keys: [{
      key_id: "lawos-owner-test",
      algorithm: "Ed25519",
      public_key_spki_pem: publicKey.export({ type: "spki", format: "pem" }),
      roles: ["owner"],
      actions: [PRIVATE_STAGING_OWNER_AUTHORIZATION_ACTION],
      environments: ["staging"],
      valid_from: "2026-07-19T00:00:00.000Z",
      valid_until: "2026-07-30T00:00:00.000Z",
      revoked_at: revoked ? "2026-07-20T01:00:00.000Z" : null,
    }],
  };
  const receipt = {
    schema_version: "law-firm-os.runtime-safety.approval.v1",
    approval_id: APPROVAL_ID,
    key_id: "lawos-owner-test",
    role: "owner",
    decision: "approved",
    packet_sha256: PACKET_SHA,
    source_sha: SOURCE_SHA,
    source_tree: SOURCE_TREE,
    action: PRIVATE_STAGING_OWNER_AUTHORIZATION_ACTION,
    environment: "staging",
    signed_at: "2026-07-20T02:00:00.000Z",
    expires_at: expired ? "2026-07-20T03:00:00.000Z" : "2026-07-27T06:51:00.000Z",
    data_scope: ["synthetic-only"],
    contact_scope: ["synthetic-mailbox-only"],
  };
  const registryJson = `${JSON.stringify(registry, null, 2)}\n`;
  const receiptJson = `${JSON.stringify(receipt, null, 2)}\n`;
  return {
    event: {
      owner_authorization: {
        registry_json: registryJson,
        receipt_json: receiptJson,
        signature_base64: sign(null, Buffer.from(canonicalizeJson(receipt)), privateKey).toString("base64"),
      },
    },
    env: {
      LAWOS_OWNER_TRUST_REGISTRY_SHA256: createHash("sha256").update(registryJson).digest("hex"),
      LAWOS_OWNER_INSTRUCTION_SHA256: PACKET_SHA,
      LAWOS_DEPLOYMENT_COMMIT: SOURCE_SHA,
      LAWOS_DEPLOYMENT_TREE: SOURCE_TREE,
    },
  };
}

test("deployed authorization rejects expired and revoked signed owner grants before a claim", async () => {
  let claimCount = 0;
  const claimAuthorization = async () => { claimCount += 1; return { claim_fingerprint: "d".repeat(64), claim_body_sha256: "e".repeat(64) }; };
  for (const variant of [{ expired: true }, { revoked: true }]) {
    const input = bundle(variant);
    await assert.rejects(
      authorizePrivateStagingAdminInvocation({ ...input, action: ADMIN_ACTION, approvalId: APPROVAL_ID, now: NOW, claimAuthorization }),
      variant.expired ? /expired/u : /revoked/u,
    );
  }
  assert.equal(claimCount, 0);
});

test("a signed owner grant is atomically consumed once for each privileged action", async () => {
  const input = bundle();
  const consumed = new Set();
  const claimAuthorization = async ({ action, approval }) => {
    const key = `${approval.receipt_sha256}:${action}`;
    if (consumed.has(key)) {
      const error = new Error("owner authorization was already consumed for this action");
      error.code = "PRIVATE_STAGING_APPROVAL_REPLAY";
      throw error;
    }
    consumed.add(key);
    return { claim_fingerprint: createHash("sha256").update(key).digest("hex"), claim_body_sha256: "f".repeat(64) };
  };
  const first = await authorizePrivateStagingAdminInvocation({ ...input, action: ADMIN_ACTION, approvalId: APPROVAL_ID, now: NOW, claimAuthorization });
  assert.equal(first.approval_id, APPROVAL_ID);
  assert.match(first.claim_fingerprint, /^[a-f0-9]{64}$/u);
  await assert.rejects(
    authorizePrivateStagingAdminInvocation({ ...input, action: ADMIN_ACTION, approvalId: APPROVAL_ID, now: NOW, claimAuthorization }),
    (error) => error.code === "PRIVATE_STAGING_APPROVAL_REPLAY",
  );
});
