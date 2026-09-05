import assert from "node:assert/strict";
import { createHash, generateKeyPairSync } from "node:crypto";
import test from "node:test";
import {
  composeInternalUnsignedInstallationRuntime,
  createInternalUnsignedInstallationRuntimeFromEnv,
  handleInternalUnsignedInstallationApiRequest,
} from "../src/internal-unsigned-installation-runtime-context.js";
import {
  OUTLOOK_DESKTOP_AUTOCONNECT_REQUIRED_SCOPE,
  OUTLOOK_DESKTOP_AUTOCONNECT_ROSTER_SCHEMA_VERSION,
  parseOutlookDesktopAutoconnectRoster,
} from "../src/outlook-desktop-entitlement.js";
import { handleOutlookDesktopInstallationApiRequest } from "../src/outlook-desktop-installation-runtime-context.js";

const principal = { tenant_id: "tenant-internal-api", user_id: "user-internal-1", entra_subject_id: "subject-internal-1", scopes: [OUTLOOK_DESKTOP_AUTOCONNECT_REQUIRED_SCOPE] };
const context = { principal, rules: [{ id: "manage", effect: "allow", action_prefix: "outlook:connection:" }], object_acl: [] };
const installationId = "odi_internal_api_000000000001";
const roster = parseOutlookDesktopAutoconnectRoster({
  schema_version: OUTLOOK_DESKTOP_AUTOCONNECT_ROSTER_SCHEMA_VERSION,
  roster_version: "synthetic-internal-api-v1",
  entries: Array.from({ length: 10 }, (_, index) => ({
    tenant_id: principal.tenant_id, user_id: `user-internal-${index + 1}`,
    entra_subject_id: `subject-internal-${index + 1}`, enabled: true,
  })),
});
const installation = { installation_id: installationId, status: "active", state_version: 1, lease_expires_at: "2026-09-05T12:00:00.000Z", retired_at: null };
const attestationBody = { adoption_id: "adoption_synthetic_001", request_sha256: "a".repeat(64), installation_id: installationId };
const attestationPath = "/api/desktop/internal-updates/baseline-adoption-attestation";
const attestation = { document_base64: Buffer.from("synthetic-signed-document").toString("base64"), signature_base64: Buffer.alloc(64, 1).toString("base64"), key_id: "synthetic-attestation-1" };
const proof = { idempotency_key: "synthetic-idem-1", nonce: "synthetic-nonce-1", issued_at: "2026-09-05T11:58:00.000Z", expires_at: "2026-09-05T12:00:00.000Z", signature: "synthetic-proof" };

function call(overrides = {}, service = {}) {
  return handleInternalUnsignedInstallationApiRequest({
    pathname: attestationPath, method: "POST", body: attestationBody,
    principal, context, requestId: "request-synthetic-1",
    runtime: { entitlement_roster: roster, internal_unsigned_installation_service: { attestation_configured: true, ...service } },
    ...overrides,
  });
}

test("internal lifecycle binds the session principal and exact signed path and returns only bounded installation fields", async () => {
  let command;
  const body = { release_authorization_id: "internal-release-1", device_public_key: "synthetic-public-key", installed_receipt_sha256: "b".repeat(64), ...proof };
  const result = await call({ pathname: "/api/desktop/internal-installations", body }, {
    register: async (input) => {
      command = input;
      return { response_status: 201, body: { outcome: "registered", installation: { ...installation, secret: "must-not-return" } } };
    },
  });
  assert.equal(result.status, 201);
  assert.deepEqual(command.principal, { tenant_id: principal.tenant_id, user_id: principal.user_id, entra_subject_id: principal.entra_subject_id });
  assert.equal(command.request.path, "/api/desktop/internal-installations");
  assert.equal(command.request.installation_id, "NEW");
  assert.equal(command.signature, proof.signature);
  assert.equal(Object.hasOwn(command.request.body, "signature"), false);
  assert.deepEqual(result.body.installation, installation);
});

test("attestation requires authentication, entitlement and permission before service access", async () => {
  let calls = 0;
  const service = { attest: async () => { calls += 1; return attestation; } };
  for (const [overrides, status] of [
    [{ principal: null }, 401],
    [{ context: { ...context, rules: [] } }, 403],
    [{ context: { ...context, principal: { ...principal, tenant_id: "other" } } }, 403],
    [{ principal: { ...principal, scopes: [] } }, 403],
    [{ runtime: { entitlement_roster: null, internal_unsigned_installation_service: service } }, 503],
  ]) assert.equal((await call(overrides, service)).status, status);
  assert.equal(calls, 0);
});

test("attestation accepts only exact request fields and emits a bounded signed envelope", async () => {
  let calls = 0;
  const service = { attest: async (input) => {
    calls += 1;
    assert.deepEqual(input, { principal: { tenant_id: principal.tenant_id, user_id: principal.user_id, entra_subject_id: principal.entra_subject_id }, ...attestationBody });
    return attestation;
  } };
  for (const body of [
    { ...attestationBody, release_trusted: true },
    { ...attestationBody, tenant_id: "other" },
    { ...attestationBody, url: "https://example.invalid" },
    { ...attestationBody, installation_id: "invalid" },
    { ...attestationBody, request_sha256: "A".repeat(64) },
    { ...attestationBody, adoption_id: "" },
  ]) assert.equal((await call({ body }, service)).status, 400);
  assert.equal((await call({ method: "GET" }, service)).status, 405);
  assert.equal((await call({ body: { ...attestationBody, extra: "x".repeat(9000) } }, service)).status, 413);
  assert.equal(calls, 0);
  const result = await call({}, service);
  assert.equal(result.status, 200);
  assert.equal(result.body.outcome, "attested");
  assert.deepEqual(result.body.attestation, attestation);
  assert.equal(calls, 1);
});

test("disabled authority, malformed signer output and unsafe database errors remain fail closed", async () => {
  assert.equal((await call()).status, 503);
  for (const invalid of [{ ...attestation, private_key: "secret" }, { ...attestation, document_base64: "invalid-base64" }]) {
    const result = await call({}, { attest: async () => invalid });
    assert.equal(result.status, 503);
    assert.equal(JSON.stringify(result).includes("secret"), false);
  }
  const result = await call({}, { attest: async () => { throw new Error("private database credential"); } });
  assert.equal(result.status, 503);
  assert.equal(JSON.stringify(result).includes("credential"), false);
  const denied = await call({}, { attest: async () => { throw Object.assign(new Error("private detail"), { safe_error_code: "INTERNAL_INSTALLATION_RELEASE_UNTRUSTED", status: 403 }); } });
  assert.equal(denied.status, 403);
  assert.deepEqual(denied.body.safe_error_codes, ["INTERNAL_INSTALLATION_RELEASE_UNTRUSTED"]);
});

test("dedicated internal routes require an explicitly configured attestation signer", async () => {
  let calls = 0;
  for (const configured of [false, undefined, null, "true"]) {
    const service = {
      attestation_configured: configured,
      ...Object.fromEntries(["register", "heartbeat", "retire", "attest"].map((operation) =>
        [operation, async () => { calls += 1; throw new Error("disabled route reached service"); }])),
    };
    for (const [pathname, body] of [
      [attestationPath, attestationBody],
      ["/api/desktop/internal-installations", { release_authorization_id: "internal-release-1", device_public_key: "synthetic-key", installed_receipt_sha256: "b".repeat(64), ...proof }],
      [`/api/desktop/internal-installations/${installationId}/heartbeat`, { expected_state_version: 1, ...proof }],
      [`/api/desktop/internal-installations/${installationId}/retire`, { expected_state_version: 1, retire_reason: "uninstall", ...proof }],
    ]) {
      const result = await call({ pathname, body,
        runtime: { entitlement_roster: roster, internal_unsigned_installation_service: service },
      });
      assert.equal(result.status, 503);
      assert.deepEqual(result.body.safe_error_codes, ["OUTLOOK_DESKTOP_INSTALLATION_RUNTIME_UNAVAILABLE"]);
    }
  }
  assert.equal(calls, 0);
});

test("strict internal installation read precedes existing read and only null permits fallback", async () => {
  let oldCalls = 0;
  const old = { installation_service: { read: async () => "old-read", readTrustedCurrent: async () => { oldCalls += 1; return "old-trusted"; } } };
  assert.equal(composeInternalUnsignedInstallationRuntime(old, null), old);
  const internal = composeInternalUnsignedInstallationRuntime(old, { readTrustedCurrent: async () => installation });
  assert.equal(await internal.installation_service.readTrustedCurrent({ principal }), installation);
  assert.equal(await internal.installation_service.read(), "old-read");
  assert.equal(oldCalls, 0);
  const empty = composeInternalUnsignedInstallationRuntime(old, { readTrustedCurrent: async () => null });
  assert.equal(await empty.installation_service.readTrustedCurrent({ principal }), "old-trusted");
  const failed = composeInternalUnsignedInstallationRuntime(old, { readTrustedCurrent: async () => { throw new Error("database unavailable"); } });
  await assert.rejects(failed.installation_service.readTrustedCurrent({ principal }), /database unavailable/u);
  assert.equal(oldCalls, 1);
  const malformed = composeInternalUnsignedInstallationRuntime(old, { readTrustedCurrent: async () => undefined });
  assert.equal(await malformed.installation_service.readTrustedCurrent({ principal }), undefined);
  assert.equal(oldCalls, 1);
});

test("old-client lifecycle composition preserves the original command and authorization and falls back only on explicit null", async () => {
  for (const operation of ["register", "heartbeat", "retire"]) {
    const command = Object.freeze({ request: Object.freeze({ path: operation === "register"
      ? "/api/desktop/installations" : `/api/desktop/installations/${installationId}/${operation}` }) });
    const options = Object.freeze({ authorize: async () => true });
    let legacyCalls = 0;
    const old = { legacy_installation_service: { [operation]: async (actualCommand, actualOptions) => {
      legacyCalls += 1;
      assert.equal(actualCommand, command);
      assert.equal(actualOptions, options);
      return "ordinary-legacy-result";
    } } };
    let result = Object.freeze({ response_status: 200, body: { outcome: operation } });
    let rejection;
    const runtime = composeInternalUnsignedInstallationRuntime(old, { [`${operation}Legacy`]: async (actualCommand, actualOptions) => {
      assert.equal(actualCommand, command);
      assert.equal(actualOptions, options);
      if (rejection) throw rejection;
      return result;
    } });
    const invoke = () => runtime.legacy_installation_service[operation](command, options);
    assert.equal(await invoke(), result);
    assert.equal(legacyCalls, 0);
    result = undefined;
    assert.equal(await invoke(), undefined);
    assert.equal(legacyCalls, 0);
    for (const code of ["INTERNAL_INSTALLATION_BINDING_MISMATCH", "INTERNAL_INSTALLATION_RETIRED_OR_REVOKED", "INTERNAL_INSTALLATION_RELEASE_UNTRUSTED", "INTERNAL_INSTALLATION_AUTHORITY_UNAVAILABLE"]) {
      rejection = Object.assign(new Error("authority rejected"), { safe_error_code: code });
      await assert.rejects(invoke(), (error) => error === rejection);
      assert.equal(legacyCalls, 0);
    }
    rejection = undefined;
    result = null;
    assert.equal(await invoke(), "ordinary-legacy-result");
    assert.equal(legacyCalls, 1);
  }
});

test("old lifecycle HTTP projection preserves a bounded internal authority denial and rejects caller-supplied binding fields", async () => {
  let calls = 0;
  const runtime = { entitlement_roster: roster, legacy_installation_service: {
    register: async () => { calls += 1; throw Object.assign(new Error("private binding detail"), {
      safe_error_code: "INTERNAL_INSTALLATION_RETIRED_OR_REVOKED", status: 409,
    }); },
  } };
  const body = { platform: "win32", app_version: "0.1.32", source_sha: "a".repeat(40), device_public_key: "synthetic-public-key", ...proof };
  const invoke = (input) => handleOutlookDesktopInstallationApiRequest({
    pathname: "/api/desktop/installations", method: "POST", principal, context, body: input, runtime,
  });
  for (const extra of [{ release_authorization_id: "forged" }, { installed_receipt_sha256: "b".repeat(64) }, { tenant_id: "other" }]) {
    assert.equal((await invoke({ ...body, ...extra })).status, 400);
  }
  assert.equal(calls, 0);
  const result = await invoke(body);
  assert.equal(result.status, 409);
  assert.deepEqual(result.body.safe_error_codes, ["INTERNAL_INSTALLATION_RETIRED_OR_REVOKED"]);
  assert.equal(JSON.stringify(result).includes("private binding detail"), false);
  assert.equal(calls, 1);
});

test("verified schema determines unsigned guard activation without fetching an absent signer", async () => {
  let metadataReads = 0;
  let secretCalls = 0;
  let oldReads = 0;
  const options = {
    env: {},
    pool: { connect: async () => { throw new Error("database unavailable"); } },
    tenant_id: principal.tenant_id,
    verifyAuthority: async () => { metadataReads += 1; },
    resolveSecret: async () => { secretCalls += 1; throw new Error("unexpected secret lookup"); },
  };
  assert.equal(await createInternalUnsignedInstallationRuntimeFromEnv({ ...options, schema_migration_count: 79 }), null);
  await assert.rejects(createInternalUnsignedInstallationRuntimeFromEnv({ ...options, schema_migration_count: 79,
    env: { AWS_REGION: "ap-northeast-2", LAWOS_INTERNAL_INSTALLATION_ATTESTATION_SECRET_ID: "synthetic/attestation" },
  }), /requires migration 80/u);
  for (const count of [undefined, null, 0, 78, 82, "80", true]) {
    await assert.rejects(createInternalUnsignedInstallationRuntimeFromEnv({ ...options, schema_migration_count: count }), /verified migration count/u);
  }
  assert.equal(metadataReads, 0);
  assert.equal(secretCalls, 0);
  const combined = await createInternalUnsignedInstallationRuntimeFromEnv({ ...options, schema_migration_count: 81 });
  assert.equal(combined.configured, true);
  assert.equal(combined.attestation_configured, false);
  const service = await createInternalUnsignedInstallationRuntimeFromEnv({ ...options, schema_migration_count: 80 });
  assert.equal(metadataReads, 2);
  assert.equal(secretCalls, 0);
  assert.equal(service.configured, true);
  assert.equal(service.attestation_configured, false);
  await assert.rejects(service.attest(), (error) => error.status === 503);
  const old = {
    installation_service: { readTrustedCurrent: async () => { oldReads += 1; return "legacy trusted"; } },
    legacy_installation_service: { register: async () => "legacy registered" },
  };
  const runtime = composeInternalUnsignedInstallationRuntime(old, service);
  assert.equal(runtime.internal_unsigned_installation_service, null);
  assert.notEqual(runtime.installation_service.readTrustedCurrent, old.installation_service.readTrustedCurrent);
  assert.notEqual(runtime.legacy_installation_service.register, old.legacy_installation_service.register);
  await assert.rejects(runtime.installation_service.readTrustedCurrent({ principal: {
    tenant_id: principal.tenant_id, user_id: principal.user_id, entra_subject_id: principal.entra_subject_id,
  } }));
  assert.equal(oldReads, 0);
  assert.equal(secretCalls, 0);
});

test("signer configuration is opt-in, closed and secret-reference only with pinned key material", async () => {
  let secretCalls = 0;
  let metadataReads = 0;
  const startupOrder = [];
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const publicHash = createHash("sha256").update(publicKey.export({ type: "spki", format: "der" })).digest("hex");
  const env = { AWS_REGION: "ap-northeast-2", LAWOS_INTERNAL_INSTALLATION_ATTESTATION_SECRET_ID: "synthetic/attestation" };
  const secret = { key_id: "synthetic-attestation-1", private_key_pem: privateKey.export({ type: "pkcs8", format: "pem" }), public_key_sha256: publicHash };
  const options = { env, pool: { connect: async () => { throw new Error("unit fixture requires metadata reader"); } }, tenant_id: principal.tenant_id, schema_migration_count: 80,
    verifyAuthority: async () => { metadataReads += 1; startupOrder.push("verify"); },
    resolveSecret: async (input) => { secretCalls += 1; startupOrder.push("secret"); assert.deepEqual(input, { secretId: "synthetic/attestation", region: "ap-northeast-2" }); return secret; } };
  assert.equal(await createInternalUnsignedInstallationRuntimeFromEnv({ ...options, env: {}, schema_migration_count: 79 }), null);
  assert.equal(secretCalls, 0);
  assert.equal(metadataReads, 0);
  assert.deepEqual(startupOrder, []);
  await assert.rejects(createInternalUnsignedInstallationRuntimeFromEnv({ ...options, env: { LAWOS_INTERNAL_INSTALLATION_ATTESTATION_SECRET_ID: "partial" } }), /incomplete/u);
  for (const field of ["KEY_ID", "PUBLIC_KEY_SHA256", "PRIVATE_KEY", "PRIVATE_KEY_PEM"]) {
    for (const value of ["obsolete-or-inline", ""]) {
      await assert.rejects(createInternalUnsignedInstallationRuntimeFromEnv({ ...options,
        env: { ...env, [`LAWOS_INTERNAL_INSTALLATION_ATTESTATION_${field}`]: value },
      }), /Secrets Manager/u);
    }
  }
  assert.equal(secretCalls, 0);
  assert.equal(metadataReads, 0);
  const service = await createInternalUnsignedInstallationRuntimeFromEnv(options);
  assert.equal(typeof service.attest, "function");
  assert.equal(service.attestation_configured, true);
  assert.equal(metadataReads, 1);
  assert.equal(secretCalls, 1);
  assert.deepEqual(startupOrder, ["verify", "secret"]);
  for (const invalidSecret of [
    { ...secret, arbitrary: true },
    { key_id: secret.key_id, private_key_pem: secret.private_key_pem },
    { ...secret, key_id: "invalid key" },
    { ...secret, key_id: undefined },
    { ...secret, public_key_sha256: "INVALID" },
    { ...secret, public_key_sha256: undefined },
  ]) {
    const readsBefore = metadataReads;
    await assert.rejects(createInternalUnsignedInstallationRuntimeFromEnv({ ...options,
      resolveSecret: async () => invalidSecret,
    }), /secret is invalid/u);
    assert.equal(metadataReads, readsBefore + 1);
  }
  const readsBeforeMismatch = metadataReads;
  await assert.rejects(createInternalUnsignedInstallationRuntimeFromEnv({ ...options,
    resolveSecret: async () => ({ ...secret, public_key_sha256: "f".repeat(64) }),
  }));
  assert.equal(metadataReads, readsBeforeMismatch + 1);
});

test("configured signer rejects authority metadata drift before fetching any secret", async () => {
  let metadataReads = 0;
  let secretCalls = 0;
  const pool = { connect: async () => { throw new Error("unexpected unit database access"); } };
  const drift = Object.assign(new Error("authority metadata drift"), {
    code: "LAWOS_INTERNAL_INSTALLATION_AUTHORITY_READBACK",
  });
  await assert.rejects(createInternalUnsignedInstallationRuntimeFromEnv({
    env: {
      AWS_REGION: "ap-northeast-2",
      LAWOS_INTERNAL_INSTALLATION_ATTESTATION_SECRET_ID: "synthetic/attestation",
    },
    pool,
    tenant_id: principal.tenant_id,
    schema_migration_count: 80,
    verifyAuthority: async (input) => {
      metadataReads += 1;
      assert.equal(input, pool);
      throw drift;
    },
    resolveSecret: async () => {
      secretCalls += 1;
      throw new Error("secret must not be fetched after authority rejection");
    },
  }), (error) => error === drift);
  assert.equal(metadataReads, 1);
  assert.equal(secretCalls, 0);
});

test("HTTP dispatch retains session and permission checks while reaching the internal attestation authority", async () => {
  const { createApiServer } = await import("../src/server.js");
  let authenticated = false;
  let permitted = true;
  let calls = 0;
  let productReads = 0;
  const server = createApiServer({
    sessionAuth: {
      capabilities: {},
      resolvePermissionContextFromHeaders: async () => authenticated
        ? { ok: true, principal, context: { ...context, rules: permitted ? context.rules : [] }, token_payload: { surface: "desktop" } }
        : { ok: false, status: 401 },
    },
    requestRuntimeAuthority: { run: async () => { productReads += 1; throw new Error("unrelated domain read"); } },
    outlookDesktopRuntime: {
      entitlement_roster: roster,
      installation_service: { readTrustedCurrent: async () => { throw new Error("old installation must not gate attestation"); } },
      internal_unsigned_installation_service: { attestation_configured: true, attest: async () => { calls += 1; return attestation; } },
    },
  });
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  try {
    const url = `http://127.0.0.1:${server.address().port}${attestationPath}`;
    const request = (body = attestationBody) => fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    assert.equal((await request()).status, 401);
    authenticated = true;
    permitted = false;
    assert.equal((await request()).status, 403);
    permitted = true;
    const result = await request();
    assert.equal(result.status, 200);
    assert.deepEqual((await result.json()).attestation, attestation);
    assert.equal((await request({ ...attestationBody, extra: "x".repeat(9000) })).status, 413);
    assert.equal(calls, 1);
    assert.equal(productReads, 0);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
