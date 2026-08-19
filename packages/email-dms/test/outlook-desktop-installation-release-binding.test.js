import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import test from "node:test";

import {
  signOutlookDesktopLifecycleRequest,
  verifyOutlookDesktopLifecycleProof,
} from "../src/outlook-desktop-installation-proof.js";

const IDENTITY = Object.freeze({
  platform: "darwin",
  app_version: "0.1.27",
  source_sha: "1".repeat(40),
});

function provenance(overrides = {}) {
  return {
    schema_version: "lawos.outlook-desktop-registration-release.v1",
    release_ticket_id: "release-ticket-1",
    release_ticket_sha256: "2".repeat(64),
    release_ticket_signature_sha256: "3".repeat(64),
    channel: "formal",
    app_id: "com.amic.matter.desktop",
    arch: "arm64",
    source_tree: "4".repeat(40),
    build_manifest_sha256: "5".repeat(64),
    inner_artifact_sha256: "6".repeat(64),
    inner_artifact_bytes: 52_428_800,
    ...overrides,
  };
}

test("device registration release provenance has one closed public schema", async () => {
  const module = await import(
    "../src/outlook-desktop-installation-release-binding.js"
  );
  const value = module.normalizeOutlookDesktopRegistrationReleaseProvenance(
    provenance(),
    IDENTITY,
  );
  assert.deepEqual(Object.keys(value).sort(), [
    "app_id", "arch", "build_manifest_sha256", "channel",
    "inner_artifact_bytes", "inner_artifact_sha256", "release_ticket_id",
    "release_ticket_sha256", "release_ticket_signature_sha256",
    "schema_version", "source_tree",
  ].sort());
  assert.deepEqual(
    module.OUTLOOK_DESKTOP_INSTALLATION_REGISTRATION_BODY_KEYS,
    [
      "app_version", "device_public_key", "platform", "release_provenance",
      "source_sha",
    ],
  );
  assert.equal(
    typeof module.normalizeOutlookDesktopInstallationReleaseAuthority,
    "function",
  );
  const postgres = await import(
    "../src/postgres-outlook-desktop-installation-release-binding.js"
  );
  assert.equal(
    typeof postgres.resolvePostgresOutlookDesktopRegistrationRelease,
    "function",
  );
  assert.deepEqual(module.OUTLOOK_DESKTOP_INSTALLATION_RELEASE_AUTHORITY_KEYS, [
    "app_id", "app_version", "approval_audit_event_binding_sha256",
    "approval_audit_event_id", "approval_sha256", "arch", "channel",
    "embedded_build_manifest_sha256", "macos_technical_evidence_sha256",
    "measured_inner_artifact_bytes", "measured_inner_artifact_sha256",
    "platform", "registered_final_artifact_bytes",
    "registered_final_artifact_sha256", "release_artifact_id",
    "release_ticket_id", "release_ticket_sha256",
    "release_ticket_signature_sha256", "schema_version", "source_sha",
    "source_tree", "tenant_id", "trust_registry_serial",
    "trust_registry_sha256", "valid", "valid_until",
  ]);
  assert.doesNotMatch(
    JSON.stringify(module.OUTLOOK_DESKTOP_INSTALLATION_RELEASE_AUTHORITY_KEYS),
    /artifact_snapshot|path|ticket_bytes|signature_bytes|access_token|secret/iu,
  );
  assert.equal(module.OUTLOOK_DESKTOP_REGISTRATION_RELEASE_SCHEMA,
    "lawos.outlook-desktop-registration-release.v1");
  assert.doesNotMatch(JSON.stringify(value), /@|email|token|secret|credential|ticket_bytes|signature_bytes/iu);
});

test("registration provenance rejects loose, mismatched, and unsigned Windows claims", async () => {
  const { normalizeOutlookDesktopRegistrationReleaseProvenance: normalize } =
    await import("../src/outlook-desktop-installation-release-binding.js");
  for (const value of [
    provenance({ access_token: "secret" }),
    provenance({ channel: "internal" }),
    provenance({ inner_artifact_bytes: 0 }),
  ]) assert.throws(() => normalize(value, IDENTITY));
  assert.throws(
    () => normalize(provenance(), { ...IDENTITY, platform: "win32" }),
    (error) => error?.safe_error_code === "WINDOWS_AUTHENTICODE_REQUIRED",
  );
});

test("release provenance is inside the device-signed registration transcript", () => {
  const keys = generateKeyPairSync("ed25519");
  const publicKey = keys.publicKey.export({ type: "spki", format: "der" })
    .toString("base64");
  const request = {
    method: "POST",
    path: "/api/desktop/installations",
    body: {
      ...IDENTITY,
      activation_authorization_id: "activation-authorization-1",
      device_public_key: publicKey,
      release_provenance: provenance(),
    },
    installation_id: "NEW",
    idempotency_key: "release-provenance-proof-0001",
    nonce: Buffer.alloc(24, 12).toString("base64url"),
    issued_at: "2026-08-17T00:00:00.000Z",
    expires_at: "2026-08-17T00:02:00.000Z",
  };
  const signature = signOutlookDesktopLifecycleRequest(
    request,
    keys.privateKey,
  );
  assert.equal(verifyOutlookDesktopLifecycleProof({
    request,
    signature,
    public_key: publicKey,
    now: "2026-08-17T00:00:30.000Z",
  }).verified, true);
  const changed = {
    ...request,
    body: {
      ...request.body,
      release_provenance: provenance({
        release_ticket_sha256: "9".repeat(64),
      }),
    },
  };
  assert.throws(
    () => verifyOutlookDesktopLifecycleProof({
      request: changed,
      signature,
      public_key: publicKey,
      now: "2026-08-17T00:00:30.000Z",
    }),
    (error) => error?.safe_error_code
      === "OUTLOOK_DESKTOP_PROOF_SIGNATURE_INVALID",
  );
});
