import assert from "node:assert/strict";
import {
  createHash,
  generateKeyPairSync,
  sign as signBytes,
} from "node:crypto";
import test from "node:test";
import {
  OUTLOOK_DESKTOP_PROOF_DOMAIN,
  OUTLOOK_DESKTOP_PROOF_MAX_CLOCK_SKEW_MS,
  OUTLOOK_DESKTOP_PROOF_MAX_LIFETIME_MS,
  canonicalOutlookDesktopLifecycleRequest,
  classifyOutlookDesktopLifecycleReplay,
  outlookDesktopPublicKeyFingerprint,
  signOutlookDesktopLifecycleRequest,
  verifyOutlookDesktopLifecycleProof,
} from "../src/outlook-desktop-installation-proof.js";

const NOW = "2026-08-11T00:00:30.000Z";
const ISSUED_AT = "2026-08-11T00:00:00.000Z";
const EXPIRES_AT = "2026-08-11T00:02:00.000Z";
const INSTALLATION_ID = "odi_1234567890abcdefghijklmn";
const NONCE = Buffer.alloc(24, 7).toString("base64url");

function keyPair() {
  const pair = generateKeyPairSync("ed25519");
  return {
    ...pair,
    publicKeySpki: pair.publicKey
      .export({ type: "spki", format: "der" })
      .toString("base64"),
  };
}

function registrationRequest(publicKeySpki, overrides = {}) {
  return {
    method: "POST",
    path: "/api/desktop/installations",
    body: {
      platform: "darwin",
      app_version: "0.1.26",
      source_sha: "2".repeat(40),
      device_public_key: publicKeySpki,
    },
    installation_id: "NEW",
    idempotency_key: "idem_registration_0001",
    nonce: NONCE,
    issued_at: ISSUED_AT,
    expires_at: EXPIRES_AT,
    ...overrides,
  };
}

function lifecycleRequest(operation, overrides = {}) {
  return {
    method: "POST",
    path: `/api/desktop/installations/${INSTALLATION_ID}/${operation}`,
    body: operation === "retire"
      ? { expected_state_version: 2, retire_reason: "device_disconnect" }
      : { expected_state_version: 1, app_version: "0.1.26" },
    installation_id: INSTALLATION_ID,
    idempotency_key: `idem_${operation}_0001`,
    nonce: Buffer.alloc(24, operation === "retire" ? 9 : 8).toString("base64url"),
    issued_at: ISSUED_AT,
    expires_at: EXPIRES_AT,
    ...overrides,
  };
}

function signAndVerify(request, pair, publicKeySpki = pair.publicKeySpki) {
  const signature = signOutlookDesktopLifecycleRequest(request, pair.privateKey);
  return verifyOutlookDesktopLifecycleProof({
    request,
    signature,
    public_key: publicKeySpki,
    now: NOW,
  });
}

test("candidate Ed25519 key self-signs a canonical registration request", () => {
  const pair = keyPair();
  const request = registrationRequest(pair.publicKeySpki);
  const canonical = canonicalOutlookDesktopLifecycleRequest(request);
  const verified = signAndVerify(request, pair);

  assert.equal(OUTLOOK_DESKTOP_PROOF_DOMAIN, "lawos.outlook-desktop-installation.v1");
  assert.equal(canonical.transcript.split("\n")[0], OUTLOOK_DESKTOP_PROOF_DOMAIN);
  assert.equal(canonical.transcript.split("\n").length, 9);
  assert.equal(canonical.operation, "register");
  assert.equal(canonical.installation_id, "NEW");
  assert.equal(verified.verified, true);
  assert.equal(verified.operation, "register");
  assert.equal(
    verified.public_key_fingerprint,
    outlookDesktopPublicKeyFingerprint(pair.publicKeySpki),
  );
  assert.match(verified.request_fingerprint, /^[a-f0-9]{64}$/u);
  assert.match(verified.nonce_hash, /^[a-f0-9]{64}$/u);
});

test("stored Ed25519 key verifies heartbeat and retire proofs", () => {
  const pair = keyPair();
  for (const operation of ["heartbeat", "retire"]) {
    const verified = signAndVerify(lifecycleRequest(operation), pair);
    assert.equal(verified.verified, true);
    assert.equal(verified.operation, operation);
    assert.equal(verified.installation_id, INSTALLATION_ID);
  }
});

test("method path body installation idempotency nonce and time tampering fail closed", () => {
  const pair = keyPair();
  const original = lifecycleRequest("heartbeat");
  const signature = signOutlookDesktopLifecycleRequest(original, pair.privateKey);
  const tampered = [
    { ...original, method: "GET" },
    { ...original, path: `/api/desktop/installations/${INSTALLATION_ID}/retire` },
    { ...original, body: { ...original.body, expected_state_version: 2 } },
    {
      ...original,
      path: "/api/desktop/installations/odi_abcdefghijklmnopqrstuvwx/heartbeat",
      installation_id: "odi_abcdefghijklmnopqrstuvwx",
    },
    { ...original, idempotency_key: "idem_heartbeat_9999" },
    { ...original, nonce: Buffer.alloc(24, 10).toString("base64url") },
    { ...original, issued_at: "2026-08-11T00:00:01.000Z" },
    { ...original, expires_at: "2026-08-11T00:02:01.000Z" },
  ];

  for (const request of tampered) {
    assert.throws(
      () => verifyOutlookDesktopLifecycleProof({
        request,
        signature,
        public_key: pair.publicKeySpki,
        now: NOW,
      }),
      (error) => String(error?.safe_error_code ?? "").startsWith("OUTLOOK_DESKTOP_PROOF_"),
    );
  }
});

test("a different key and malformed or non-Ed25519 SPKI are rejected", () => {
  const pair = keyPair();
  const other = keyPair();
  const request = registrationRequest(pair.publicKeySpki);
  const signature = signOutlookDesktopLifecycleRequest(request, pair.privateKey);

  assert.throws(
    () => verifyOutlookDesktopLifecycleProof({
      request,
      signature,
      public_key: other.publicKeySpki,
      now: NOW,
    }),
    (error) => error?.safe_error_code === "OUTLOOK_DESKTOP_PROOF_SIGNATURE_INVALID",
  );
  for (const publicKey of ["not-spki", `${pair.publicKeySpki}=`, (() => {
    const rsa = generateKeyPairSync("rsa", { modulusLength: 2048 }).publicKey;
    return rsa.export({ type: "spki", format: "der" }).toString("base64");
  })()]) {
    assert.throws(
      () => outlookDesktopPublicKeyFingerprint(publicKey),
      (error) => error?.safe_error_code === "OUTLOOK_DESKTOP_PROOF_PUBLIC_KEY_INVALID",
    );
  }
});

test("server-owned canonical JSON is stable and rejects unsupported values", () => {
  const pair = keyPair();
  const left = registrationRequest(pair.publicKeySpki, {
    body: { z: [3, 2, 1], a: { y: true, x: null } },
  });
  const right = registrationRequest(pair.publicKeySpki, {
    body: { a: { x: null, y: true }, z: [3, 2, 1] },
  });
  assert.equal(
    canonicalOutlookDesktopLifecycleRequest(left).body_sha256,
    canonicalOutlookDesktopLifecycleRequest(right).body_sha256,
  );
  for (const body of [
    { unsupported: undefined },
    { non_finite: Number.NaN },
    { bigint: 1n },
    new Date(ISSUED_AT),
  ]) {
    assert.throws(
      () => canonicalOutlookDesktopLifecycleRequest(
        registrationRequest(pair.publicKeySpki, { body }),
      ),
      (error) => error?.safe_error_code === "OUTLOOK_DESKTOP_PROOF_CANONICAL_JSON_INVALID",
    );
  }

  const canonical = canonicalOutlookDesktopLifecycleRequest(left);
  const noncanonicalBodyHash = createHash("sha256")
    .update(JSON.stringify(left.body))
    .digest("base64url");
  const noncanonicalTranscript = canonical.transcript.replace(
    canonical.body_sha256,
    noncanonicalBodyHash,
  );
  const noncanonicalSignature = signBytes(
    null,
    Buffer.from(noncanonicalTranscript, "utf8"),
    pair.privateKey,
  ).toString("base64url");
  assert.throws(
    () => verifyOutlookDesktopLifecycleProof({
      request: left,
      signature: noncanonicalSignature,
      public_key: pair.publicKeySpki,
      now: NOW,
    }),
    (error) => error?.safe_error_code === "OUTLOOK_DESKTOP_PROOF_SIGNATURE_INVALID",
  );
});

test("nonce and freshness windows are bounded against server time", () => {
  const pair = keyPair();
  assert.equal(OUTLOOK_DESKTOP_PROOF_MAX_LIFETIME_MS, 5 * 60 * 1000);
  assert.equal(OUTLOOK_DESKTOP_PROOF_MAX_CLOCK_SKEW_MS, 30 * 1000);
  const invalid = [
    registrationRequest(pair.publicKeySpki, { nonce: Buffer.alloc(15).toString("base64url") }),
    registrationRequest(pair.publicKeySpki, { nonce: `${NONCE}=` }),
    registrationRequest(pair.publicKeySpki, {
      issued_at: "2026-08-11T00:01:00.001Z",
      expires_at: "2026-08-11T00:02:00.000Z",
    }),
    registrationRequest(pair.publicKeySpki, {
      issued_at: "2026-08-10T23:50:00.000Z",
      expires_at: "2026-08-11T00:00:30.000Z",
    }),
    registrationRequest(pair.publicKeySpki, {
      issued_at: "2026-08-11T00:00:00.000Z",
      expires_at: "2026-08-11T00:05:00.001Z",
    }),
    registrationRequest(pair.publicKeySpki, {
      issued_at: "2026-08-11T00:00:00Z",
    }),
  ];
  for (const request of invalid) {
    assert.throws(
      () => signAndVerify(request, pair),
      (error) => String(error?.safe_error_code ?? "").startsWith("OUTLOOK_DESKTOP_PROOF_"),
    );
  }
});

test("semantic idempotency returns the original receipt before nonce replay checks", () => {
  const pair = keyPair();
  const verified = signAndVerify(lifecycleRequest("heartbeat"), pair);
  const originalResponse = Object.freeze({
    installation_id: INSTALLATION_ID,
    state_version: 2,
    lease_expires_at: "2026-08-18T00:00:30.000Z",
  });
  const receipt = Object.freeze({
    request_fingerprint: verified.request_fingerprint,
    response_status: 200,
    response: originalResponse,
  });
  const result = classifyOutlookDesktopLifecycleReplay({
    verified_request: verified,
    idempotency_receipt: receipt,
    nonce_receipt: { nonce_hash: verified.nonce_hash },
  });

  assert.deepEqual(result, {
    disposition: "exact_replay",
    response_status: 200,
    response: originalResponse,
  });
  assert.equal(result.response.lease_expires_at, "2026-08-18T00:00:30.000Z");
});

test("same idempotency key with another semantic request conflicts", () => {
  const pair = keyPair();
  const first = signAndVerify(lifecycleRequest("heartbeat"), pair);
  const changed = signAndVerify(lifecycleRequest("heartbeat", {
    body: { expected_state_version: 2, app_version: "0.1.26" },
    nonce: Buffer.alloc(24, 11).toString("base64url"),
  }), pair);

  assert.notEqual(first.request_fingerprint, changed.request_fingerprint);
  assert.throws(
    () => classifyOutlookDesktopLifecycleReplay({
      verified_request: changed,
      idempotency_receipt: {
        request_fingerprint: first.request_fingerprint,
        response_status: 200,
        response: {},
      },
    }),
    (error) => error?.safe_error_code === "OUTLOOK_DESKTOP_PROOF_IDEMPOTENCY_CONFLICT",
  );
});

test("a consumed nonce without its exact idempotency receipt is rejected", () => {
  const pair = keyPair();
  const verified = signAndVerify(lifecycleRequest("retire"), pair);
  assert.throws(
    () => classifyOutlookDesktopLifecycleReplay({
      verified_request: verified,
      nonce_receipt: { nonce_hash: verified.nonce_hash },
    }),
    (error) => error?.safe_error_code === "OUTLOOK_DESKTOP_PROOF_NONCE_REPLAY",
  );
  assert.deepEqual(
    classifyOutlookDesktopLifecycleReplay({ verified_request: verified }),
    { disposition: "fresh" },
  );
});
