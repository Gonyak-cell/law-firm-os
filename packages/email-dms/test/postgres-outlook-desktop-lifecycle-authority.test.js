import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import { POSTGRES_TENANT_CONTEXT_SECRET } from "../../persistence/src/postgres/pool.js";
import {
  assertPostgresOutlookDesktopLifecycleAuthority,
  createPostgresOutlookDesktopLifecycleAuthority,
} from "../src/postgres-outlook-desktop-lifecycle-authority.js";

const TENANT = "tenant-lifecycle-adapter";
const PRINCIPAL = Object.freeze({
  entra_subject_id: "subject-lifecycle-adapter",
  tenant_id: TENANT,
  user_id: "user-lifecycle-adapter",
});
const DIGEST = "a".repeat(64);
const INSTALLATION_ID = "odi_lifecycle_adapter_000001";
const ISSUED_AT = "2026-08-17T00:00:00.000Z";
const VALID_UNTIL = "2026-08-17T00:05:00.000Z";

function lifecycleChallengeReceipt() {
  const issued = {
    challenge_nonce_base64url: "A".repeat(43),
    challenge_nonce_sha256: DIGEST,
    device_key_fingerprint: DIGEST,
    entra_subject_id: PRINCIPAL.entra_subject_id,
    event_id: "event-lifecycle-adapter",
    expected_state_version: 1,
    idempotency_key: "idempotency-lifecycle-adapter",
    installation_id: INSTALLATION_ID,
    issued_at: ISSUED_AT,
    lifecycle_challenge_id: `olc_${"b".repeat(32)}`,
    operation: "heartbeat",
    release_authority_sha256: DIGEST,
    request_id: "request-lifecycle-adapter",
    retire_intent_id: null,
    schema_version: "lawos.outlook-desktop-lifecycle-challenge.v1",
    tenant_id: TENANT,
    user_id: PRINCIPAL.user_id,
    valid_until: VALID_UNTIL,
  };
  const bytes = Buffer.from(`${JSON.stringify(issued)}\n`, "utf8");
  return {
    ...issued,
    issued_challenge: issued,
    issued_challenge_base64: bytes.toString("base64"),
    issued_challenge_sha256: createHash("sha256").update(bytes).digest("hex"),
    outcome: "issued",
  };
}

function lifecycleChallengeRequest() {
  return {
    device_key_fingerprint: DIGEST,
    entra_subject_id: PRINCIPAL.entra_subject_id,
    event_id: "event-lifecycle-adapter",
    expected_state_version: 1,
    idempotency_key: "idempotency-lifecycle-adapter",
    installation_id: INSTALLATION_ID,
    operation: "heartbeat",
    request_id: "request-lifecycle-adapter",
    user_id: PRINCIPAL.user_id,
  };
}

function lifecycleAuthorization() {
  const challenge = lifecycleChallengeReceipt();
  return {
    activation_authorization_id: null,
    device_key_fingerprint: DIGEST,
    device_public_key_spki_sha256: DIGEST,
    device_signature_sha256: DIGEST,
    entra_subject_id: PRINCIPAL.entra_subject_id,
    event_id: challenge.event_id,
    expected_state_version: 1,
    idempotency_key: challenge.idempotency_key,
    installation_id: INSTALLATION_ID,
    issued_challenge_sha256: challenge.issued_challenge_sha256,
    lifecycle_authorization_id: "lifecycle-authority-adapter",
    lifecycle_challenge_id: challenge.lifecycle_challenge_id,
    nonce_hash: DIGEST,
    operation: "heartbeat",
    proof_expires_at: VALID_UNTIL,
    proof_issued_at: ISSUED_AT,
    proof_receipt_sha256: DIGEST,
    proof_transcript_sha256: DIGEST,
    release_authority_sha256: null,
    request_fingerprint: DIGEST,
    request_id: challenge.request_id,
    retire_intent_id: null,
    user_id: PRINCIPAL.user_id,
  };
}

function lifecyclePool({ errorCode, kind }) {
  const calls = [];
  const pool = {
    [POSTGRES_TENANT_CONTEXT_SECRET]: Buffer.alloc(32, kind === "app" ? 4 : 5),
    connectCount: 0,
    async connect() {
      pool.connectCount += 1;
      return {
        async query(sql, values = []) {
          const statement = String(sql).replace(/\s+/gu, " ").trim();
          calls.push({ statement, values: [...values] });
          if (statement.includes("lawos_security.current_tenant_id")) {
            return { rows: [{ tenant_id: TENANT }] };
          }
          const name = statement.match(/lawos_email_dms[.]([a-z_]+)/u)?.[1];
          if (name && errorCode) {
            throw Object.assign(new Error("private database material"), {
              code: errorCode,
              detail: "private detail",
            });
          }
          if (name === "issue_outlook_desktop_lifecycle_challenge") {
            return { rows: [{ value: lifecycleChallengeReceipt() }] };
          }
          if (name === "mint_outlook_desktop_lifecycle_verifier_receipt") {
            return { rows: [{ value: {
              authorization_binding_sha256: DIGEST,
              authorized_at: ISSUED_AT,
              lifecycle_authorization_id: "lifecycle-authority-adapter",
              outcome: "authorized",
              tenant_id: TENANT,
              valid_until: VALID_UNTIL,
            } }] };
          }
          if (name === "heartbeat_outlook_desktop_installation") {
            return { rows: [{ value: {
              body: { outcome: "heartbeat" },
              response_status: 200,
            } }] };
          }
          return { rows: [] };
        },
        release() {
          calls.push({ statement: "RELEASE", values: [] });
        },
      };
    },
  };
  return { calls, pool };
}

test("lifecycle authority uses exact app/verifier SECDEF boundaries", async () => {
  const app = lifecyclePool({ kind: "app" });
  const verifier = lifecyclePool({ kind: "verifier" });
  const authority = createPostgresOutlookDesktopLifecycleAuthority({
    app_pool: app.pool,
    tenant_id: TENANT,
    verifier_pool: verifier.pool,
  });
  assert.equal(assertPostgresOutlookDesktopLifecycleAuthority(authority), authority);
  assert.deepEqual(Object.keys(authority).sort(), [
    "consumeLifecycleTransition",
    "issueLifecycleChallenge",
    "schema_version",
    "verifyLifecycleTransition",
  ]);

  const challenge = await authority.issueLifecycleChallenge({
    principal: PRINCIPAL,
    request: lifecycleChallengeRequest(),
  });
  assert.equal(challenge.lifecycle_challenge_id, `olc_${"b".repeat(32)}`);
  const receipt = await authority.verifyLifecycleTransition({
    authorization: lifecycleAuthorization(),
  });
  assert.equal(receipt.lifecycle_authorization_id, "lifecycle-authority-adapter");
  const consumed = await authority.consumeLifecycleTransition({
    authorization: {
      ...lifecycleChallengeRequest(),
      lifecycle_authorization_id: "lifecycle-authority-adapter",
    },
    operation: "heartbeat",
    principal: PRINCIPAL,
  });
  assert.equal(consumed.response_status, 200);

  assert.equal(app.calls.some(({ statement }) =>
    statement.includes("issue_outlook_desktop_lifecycle_challenge")), true);
  assert.equal(app.calls.some(({ statement }) =>
    statement.includes("heartbeat_outlook_desktop_installation")), true);
  assert.equal(verifier.calls.some(({ statement }) =>
    statement.includes("mint_outlook_desktop_lifecycle_verifier_receipt")), true);
  assert.equal([...app.calls, ...verifier.calls]
    .filter(({ statement }) => statement.startsWith("BEGIN ISOLATION LEVEL"))
    .every(({ statement }) => statement === "BEGIN ISOLATION LEVEL SERIALIZABLE"),
  true);
});

test("lifecycle authority rejects principal drift before PostgreSQL", async () => {
  const app = lifecyclePool({ kind: "app" });
  const verifier = lifecyclePool({ kind: "verifier" });
  const authority = createPostgresOutlookDesktopLifecycleAuthority({
    app_pool: app.pool,
    tenant_id: TENANT,
    verifier_pool: verifier.pool,
  });
  assert.throws(() => authority.issueLifecycleChallenge({
    principal: { ...PRINCIPAL, user_id: "user-foreign" },
    request: lifecycleChallengeRequest(),
  }), (error) => error?.safe_error_code ===
    "OUTLOOK_DESKTOP_LIFECYCLE_BINDING_MISMATCH");
  assert.throws(() => authority.consumeLifecycleTransition({
    authorization: {
      ...lifecycleChallengeRequest(),
      lifecycle_authorization_id: "lifecycle-authority-adapter",
    },
    operation: "retire",
    principal: PRINCIPAL,
  }), (error) => error?.safe_error_code ===
    "OUTLOOK_DESKTOP_LIFECYCLE_BINDING_MISMATCH");
  assert.equal(app.pool.connectCount, 0);
  assert.equal(verifier.pool.connectCount, 0);
});

for (const [postgresCode, safeErrorCode] of [
  ["LCH01", "OUTLOOK_DESKTOP_LIFECYCLE_CHALLENGE_REPLAY_CONFLICT"],
  ["LLC01", "OUTLOOK_DESKTOP_LIFECYCLE_AUTHORIZATION_REPLAY_CONFLICT"],
]) {
  test(`lifecycle authority maps private ${postgresCode} without detail`, async () => {
    const app = lifecyclePool({
      errorCode: postgresCode === "LCH01" ? postgresCode : undefined,
      kind: "app",
    });
    const verifier = lifecyclePool({
      errorCode: postgresCode === "LLC01" ? postgresCode : undefined,
      kind: "verifier",
    });
    const authority = createPostgresOutlookDesktopLifecycleAuthority({
      app_pool: app.pool,
      tenant_id: TENANT,
      verifier_pool: verifier.pool,
    });
    const promise = postgresCode === "LCH01"
      ? authority.issueLifecycleChallenge({
        principal: PRINCIPAL,
        request: lifecycleChallengeRequest(),
      })
      : authority.verifyLifecycleTransition({
        authorization: lifecycleAuthorization(),
      });
    await assert.rejects(promise, (error) => {
      assert.equal(error.safe_error_code, safeErrorCode);
      assert.equal(error.status, 409);
      assert.doesNotMatch(JSON.stringify(error), /private|detail/iu);
      return true;
    });
  });
}
