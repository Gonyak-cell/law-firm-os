import assert from "node:assert/strict";
import { createHash, generateKeyPairSync } from "node:crypto";
import test from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { composeInternalUnsignedInstallationRuntime } from "../../../apps/api/src/internal-unsigned-installation-runtime-context.js";
import { createPostgresOutlookDesktopOperationalRuntime } from "../../../apps/api/src/outlook-desktop-operational-runtime.js";
import { parseOutlookDesktopAutoconnectRoster } from "../../../apps/api/src/outlook-desktop-entitlement.js";
import { createPostgresOutlookDesktopInstallationAuthorityService } from "../src/postgres-outlook-desktop-installation-authority-service.js";
import { createPostgresInternalUnsignedInstallationAuthority } from "../../../apps/api/src/internal-unsigned-installation-authority.js";
import { verifyInternalUnsignedInstallationAttestation } from "../../runtime-auth/src/internal-unsigned-installation-attestation.js";
import { hashDomainValue } from "../../persistence/src/domain-ledger.js";
import { signOutlookDesktopLifecycleRequest } from "../src/outlook-desktop-installation-proof.js";
import { createOutlookAssignmentAuthorityFixture, roleJsonCall, roleDatabaseNow } from "./support/postgres-outlook-desktop-assignment-authority-fixture.js";

const digest = (value) => createHash("sha256").update(value).digest("hex");

test("internal unsigned PostgreSQL service verifies real device signatures and signs bounded current installation evidence", async (t) => {
  const authority = await createOutlookAssignmentAuthorityFixture(t, {
    tenantId: "tenant-internal-installation-service",
  });
  assert.ok(authority, "actual temporary PostgreSQL is required");
  const actor = { tenant_id: authority.tenantId, ...authority.principal };
  const device = generateKeyPairSync("ed25519");
  const publicDer = device.publicKey.export({ type: "spki", format: "der" });
  const signer = generateKeyPairSync("ed25519");
  const signingPin = digest(signer.publicKey.export({ type: "spki", format: "der" }));
  const now = Date.parse(await roleDatabaseNow(authority.appPool, authority.tenantId));
  const material = {
    tenant_id: authority.tenantId,
    authorization_id: "authorization-service-001",
    ...authority.principal,
    device_key_fingerprint: digest(publicDer),
    installed_receipt_sha256: digest("synthetic actual installed receipt"),
    app_id: "com.amic.matter.desktop.internal", platform: "win32",
    architecture: "x64", channel: "internal-unsigned",
    release_id: "synthetic-internal-service-001", release_sequence: 32,
    version: "0.1.32", source_sha: "a".repeat(40), source_tree: "b".repeat(40),
    installer_sha256: digest("synthetic installer"), installer_bytes: 109711906,
    installer_version_id: "synthetic-immutable-version-001",
    bootstrap_marker_sha256: digest("synthetic bootstrap marker"),
    owner_approval_sha256: digest("synthetic owner grant"),
    valid_from: new Date(now - 1000).toISOString(),
    valid_until: new Date(now + 3600000).toISOString(),
  };
  const grant = { ...material, release_authority_sha256: hashDomainValue(material) };
  await roleJsonCall(authority.controlPool, authority.tenantId,
    "authorize_internal_unsigned_release", grant);
  const service = createPostgresInternalUnsignedInstallationAuthority({
    pool: authority.appPool, tenant_id: authority.tenantId,
    attestation_key_id: "synthetic-attestation-key",
    attestation_private_key: signer.privateKey,
    expected_attestation_public_key_sha256: signingPin,
  });
  const command = (operation, sequence, installationId = "NEW", version = 1) => {
    const request = {
      method: "POST",
      path: operation === "register" ? "/api/desktop/internal-installations"
        : `/api/desktop/internal-installations/${installationId}/${operation}`,
      body: operation === "register" ? {
        release_authorization_id: grant.authorization_id,
        device_public_key: publicDer.toString("base64"),
        installed_receipt_sha256: grant.installed_receipt_sha256,
      } : { expected_state_version: version,
        ...(operation === "retire" ? { retire_reason: "windows_uninstall" } : {}) },
      installation_id: installationId,
      idempotency_key: `internal-service-idempotency-${sequence}`,
      nonce: Buffer.alloc(24, sequence).toString("base64url"),
      issued_at: new Date(Date.now() - 1000).toISOString(),
      expires_at: new Date(Date.now() + 120000).toISOString(),
    };
    return { principal: actor, request, request_id: `internal-service-request-${sequence}`,
      signature: signOutlookDesktopLifecycleRequest(request, device.privateKey) };
  };
  const registrationCommand = command("register", 1);
  const registration = await service.register(registrationCommand);
  assert.equal(registration.response_status, 201);
  assert.deepEqual(await service.register(registrationCommand), registration);
  const installationId = registration.body.installation.installation_id;
  assert.equal((await service.readTrustedCurrent({ principal: actor })).release_trusted, true);
  const attestationRequest = { principal: actor, adoption_id: "synthetic-adoption-service-001",
    request_sha256: digest("synthetic exact adoption request"), installation_id: installationId };
  const attest = async () => {
    const envelope = await service.attest(attestationRequest);
    return verifyInternalUnsignedInstallationAttestation({
      envelope, publicKey: signer.publicKey, expectedPublicKeySha256: signingPin,
      expectedKeyId: "synthetic-attestation-key", adoptionId: attestationRequest.adoption_id,
      requestSha256: attestationRequest.request_sha256, installationId,
    });
  };
  const before = await attest();
  assert.equal(before.installation.state_version, 1);
  assert.equal(before.installation.release_authority_sha256, grant.release_authority_sha256);
  assert.equal(before.installation.installed_receipt_sha256, grant.installed_receipt_sha256);
  assert.equal(before.installation.installer_version_id, grant.installer_version_id);
  assert.equal(before.generated_at, before.installation.authority_snapshot_at);
  assert.match(before.generated_at, /\.\d{3}Z$/u);
  assert.ok(Date.parse(before.expires_at) - Date.parse(before.generated_at) <= 300000);

  const heartbeat = command("heartbeat", 2, installationId);
  const forged = { ...heartbeat, signature: signOutlookDesktopLifecycleRequest(
    heartbeat.request, generateKeyPairSync("ed25519").privateKey) };
  await assert.rejects(service.heartbeat(forged), (error) =>
    error.safe_error_code === "OUTLOOK_DESKTOP_PROOF_SIGNATURE_INVALID");
  assert.equal((await service.readTrustedCurrent({ principal: actor })).state_version, 1);
  assert.equal((await service.heartbeat(heartbeat)).body.installation.state_version, 2);
  const after = await attest();
  assert.equal(after.installation.state_version, 2);
  assert.equal(after.installation.installation_release_binding_sha256,
    before.installation.installation_release_binding_sha256);
  await assert.rejects(service.attest({ ...attestationRequest,
    principal: { ...actor, user_id: "another-user" } }),
  (error) => error.safe_error_code === "INTERNAL_INSTALLATION_TRUSTED_CURRENT_REQUIRED");

  await roleJsonCall(authority.controlPool, authority.tenantId,
    "revoke_internal_unsigned_release", {
      authorization_id: grant.authorization_id,
      expected_release_authority_sha256: grant.release_authority_sha256,
      revocation_id: "synthetic-service-revocation", reason: "release_withdrawn",
      owner_approval_sha256: digest("synthetic revocation approval"),
    });
  await assert.rejects(service.readTrustedCurrent({ principal: actor }), (error) =>
    error.safe_error_code === "INTERNAL_INSTALLATION_RETIRED_OR_REVOKED");
  await assert.rejects(service.attest(attestationRequest), (error) =>
    error.safe_error_code === "INTERNAL_INSTALLATION_RETIRED_OR_REVOKED");
  await assert.rejects(service.heartbeat(command("heartbeat", 3, installationId, 2)),
    (error) => error.safe_error_code === "INTERNAL_INSTALLATION_RETIRED_OR_REVOKED");
  const retired = await service.retire(command("retire", 4, installationId, 2));
  assert.equal(retired.body.installation.status, "retired");
  const count = (await authority.observerPool.query(
    `SELECT (SELECT count(*)::integer FROM lawos_email_dms.outlook_desktop_installation_audit_events WHERE tenant_id=$1) AS audit,
            (SELECT count(*)::integer FROM lawos_email_dms.outlook_desktop_installation_nonces WHERE tenant_id=$1) AS nonces`,
    [authority.tenantId],
  )).rows[0];
  assert.deepEqual(count, { audit: 3, nonces: 3 });
});


const WINDOWS_0132_REQUEST = Object.freeze({
  platform: "win32", app_version: "0.1.32",
  source_sha: "a1bf725fb94302b166cdf9a4a9f6f9c1d2a31ce7",
});
const WINDOWS_0129_REQUEST = Object.freeze({
  platform: "win32", app_version: "0.1.29",
  source_sha: "4df77e1848b52ea455f20b41b9b1c64961bfa1cf",
});

async function oldProtocolFixture(t, suffix) {
  const authority = await createOutlookAssignmentAuthorityFixture(t, {
    tenantId: `tenant-old-installation-${suffix}`,
  });
  assert.ok(authority, "actual temporary PostgreSQL is required");
  const actor = Object.freeze({ tenant_id: authority.tenantId, ...authority.principal });
  const device = generateKeyPairSync("ed25519");
  const publicDer = device.publicKey.export({ type: "spki", format: "der" });
  const signer = generateKeyPairSync("ed25519");
  const signingPin = digest(signer.publicKey.export({ type: "spki", format: "der" }));
  const internal = createPostgresInternalUnsignedInstallationAuthority({
    pool: authority.appPool, tenant_id: authority.tenantId,
    attestation_key_id: `old-protocol-signer-${suffix}`,
    attestation_private_key: signer.privateKey,
    expected_attestation_public_key_sha256: signingPin,
  });
  const roster = parseOutlookDesktopAutoconnectRoster({
    schema_version: "lawos.outlook-desktop-autoconnect-roster.v1",
    roster_version: `old-protocol-roster-${suffix}`,
    entries: Array.from({ length: 10 }, (_, index) => ({
      tenant_id: actor.tenant_id,
      user_id: index === 0 ? actor.user_id : `other-user-${index}`,
      entra_subject_id: index === 0 ? actor.entra_subject_id : `other-subject-${index}`,
      enabled: true,
    })),
  });
  const original = createPostgresOutlookDesktopOperationalRuntime({
    pool: authority.appPool, tenant_id: actor.tenant_id, entitlement_roster: roster,
  });
  const fallbackCalls = { register: 0, heartbeat: 0, retire: 0, read: 0 };
  const monitoredRuntime = {
    ...original,
    legacy_installation_service: {
      ...original.legacy_installation_service,
      ...Object.fromEntries(["register", "heartbeat", "retire"].map((operation) => [operation,
        async (...args) => {
          fallbackCalls[operation] += 1;
          return original.legacy_installation_service[operation](...args);
        }])),
    },
    installation_service: {
      ...original.installation_service,
      async readTrustedCurrent(input) {
        fallbackCalls.read += 1;
        return original.installation_service.readTrustedCurrent(input);
      },
    },
  };
  const runtime = composeInternalUnsignedInstallationRuntime(monitoredRuntime, internal);
  let sequence = 0;
  const command = (operation, {
    installationId = "NEW", stateVersion = 1, tuple = WINDOWS_0132_REQUEST,
    principal = actor, bodyFields = {}, path, signingPath,
  } = {}) => {
    sequence += 1;
    const request = {
      method: "POST",
      path: path ?? (operation === "register" ? "/api/desktop/installations"
        : `/api/desktop/installations/${installationId}/${operation}`),
      body: operation === "register" ? {
        ...tuple, device_public_key: publicDer.toString("base64"), ...bodyFields,
      } : { expected_state_version: stateVersion,
        ...(operation === "retire" ? { retire_reason: "windows_uninstall" } : {}), ...bodyFields },
      installation_id: installationId,
      idempotency_key: `old-protocol-${suffix}-idempotency-${sequence}`,
      nonce: digest(`old-protocol-${suffix}-nonce-${sequence}`),
      issued_at: new Date(Date.now() - 1000).toISOString(),
      expires_at: new Date(Date.now() + 120000).toISOString(),
    };
    return { principal, request, request_id: `old-protocol-${suffix}-request-${sequence}`,
      signature: signOutlookDesktopLifecycleRequest(signingPath ? { ...request, path: signingPath } : request,
        device.privateKey) };
  };
  const authorizeCalls = [];
  const authorize = async (input) => {
    assert.equal(Object.isFrozen(input), true);
    assert.deepEqual(Object.keys(input).sort(), ["installation_id", "operation", "principal"]);
    authorizeCalls.push(input);
    return true;
  };
  const grant = async ({ tuple = WINDOWS_0132_REQUEST, lifetime = 3600000 } = {}) => {
    const now = Date.parse(await roleDatabaseNow(authority.appPool, actor.tenant_id));
    const material = {
      tenant_id: actor.tenant_id, authorization_id: `old-protocol-authorization-${suffix}`,
      ...authority.principal, device_key_fingerprint: digest(publicDer),
      installed_receipt_sha256: digest(`old-protocol-installed-receipt-${suffix}`),
      app_id: "com.amic.matter.desktop.internal", platform: tuple.platform,
      architecture: "x64", channel: "internal-unsigned",
      release_id: `old-protocol-release-${suffix}`, release_sequence: 32,
      version: tuple.app_version, source_sha: tuple.source_sha, source_tree: "b".repeat(40),
      installer_sha256: digest(`old-protocol-installer-${suffix}`), installer_bytes: 109711906,
      installer_version_id: `old-protocol-version-${suffix}`,
      bootstrap_marker_sha256: digest(`old-protocol-bootstrap-${suffix}`),
      owner_approval_sha256: digest(`old-protocol-owner-${suffix}`),
      valid_from: new Date(now - 1000).toISOString(), valid_until: new Date(now + lifetime).toISOString(),
    };
    const value = { ...material, release_authority_sha256: hashDomainValue(material) };
    await roleJsonCall(authority.controlPool, actor.tenant_id, "authorize_internal_unsigned_release", value);
    return value;
  };
  const revoke = (value) => roleJsonCall(authority.controlPool, actor.tenant_id,
    "revoke_internal_unsigned_release", {
      authorization_id: value.authorization_id,
      expected_release_authority_sha256: value.release_authority_sha256,
      revocation_id: `old-protocol-revocation-${suffix}`, reason: "release_withdrawn",
      owner_approval_sha256: digest(`old-protocol-revoke-owner-${suffix}`),
    });
  const generic = createPostgresOutlookDesktopInstallationAuthorityService({
    pool: authority.appPool, tenant_id: actor.tenant_id,
  });
  return { authority, actor, device, signer, signingPin, internal, original, monitoredRuntime, runtime, generic,
    fallbackCalls, command, authorize, authorizeCalls, grant, revoke, suffix };
}

const safeCode = (expected) => (error) => error?.safe_error_code === expected;

test("an unregistered immutable 0.1.32 client completes its unchanged old protocol against the new server authority", async (t) => {
  const f = await oldProtocolFixture(t, "immutable0132");
  assert.equal((await f.authority.observerPool.query(
    "SELECT count(*)::integer AS count FROM lawos_email_dms.outlook_desktop_installations WHERE tenant_id=$1",
    [f.actor.tenant_id],
  )).rows[0].count, 0, "the immutable-client fixture must begin unregistered");
  const approval = await f.grant();
  const request = f.command("register");
  assert.deepEqual(Object.keys(request.request.body).sort(),
    ["app_version", "device_public_key", "platform", "source_sha"]);
  const registered = await f.runtime.legacy_installation_service.register(request, { authorize: f.authorize });
  assert.equal(registered.response_status, 201);
  assert.deepEqual(f.authorizeCalls[0], { operation: "register", principal: f.actor, installation_id: "NEW" });
  assert.deepEqual(await f.runtime.legacy_installation_service.register(request, { authorize: f.authorize }), registered);
  const installationId = registered.body.installation.installation_id;
  const read = await f.generic.read({ principal: f.actor, installation_id: installationId });
  assert.equal(read.platform, WINDOWS_0132_REQUEST.platform);
  assert.equal(read.app_version, WINDOWS_0132_REQUEST.app_version);
  assert.equal(read.source_sha, WINDOWS_0132_REQUEST.source_sha);
  assert.equal(read.state_version, 1);
  const trusted = await f.runtime.installation_service.readTrustedCurrent({ principal: f.actor });
  assert.equal(trusted.installation_id, installationId);
  assert.equal(trusted.release_trusted, true);
  const adoptionId = "immutable0132-adoption";
  const requestSha256 = digest("immutable0132 owner adoption request");
  const envelope = await f.internal.attest({ principal: f.actor, adoption_id: adoptionId,
    request_sha256: requestSha256, installation_id: installationId });
  const attested = verifyInternalUnsignedInstallationAttestation({
    envelope, publicKey: f.signer.publicKey, expectedPublicKeySha256: f.signingPin,
    expectedKeyId: `old-protocol-signer-${f.suffix}`, adoptionId, requestSha256, installationId,
  });
  assert.equal(attested.installation.installed_receipt_sha256, approval.installed_receipt_sha256);
  assert.equal(attested.installation.release_authority_sha256, approval.release_authority_sha256);
  assert.equal((await f.runtime.legacy_installation_service.heartbeat(
    f.command("heartbeat", { installationId }), { authorize: f.authorize })).body.installation.state_version, 2);
  assert.equal((await f.generic.read({ principal: f.actor, installation_id: installationId })).state_version, 2);
  assert.equal((await f.runtime.legacy_installation_service.retire(
    f.command("retire", { installationId, stateVersion: 2 }), { authorize: f.authorize })).body.installation.status, "retired");
  assert.equal((await f.generic.read({ principal: f.actor, installation_id: installationId })).status, "retired");
  assert.deepEqual(f.fallbackCalls, { register: 0, heartbeat: 0, retire: 0, read: 0 });
});

test("old protocol requires authorization and rejects body, cross-path proof, owner, and grant failures without fallback", async (t) => {
  const f = await oldProtocolFixture(t, "old-boundaries");
  const approval = await f.grant();
  const request = f.command("register");
  await assert.rejects(f.internal.registerLegacy(request), safeCode("INTERNAL_INSTALLATION_NOT_AUTHORIZED"));
  await assert.rejects(f.internal.registerLegacy(request, { authorize: async () => false }),
    safeCode("INTERNAL_INSTALLATION_NOT_AUTHORIZED"));
  await assert.rejects(f.runtime.legacy_installation_service.register(
    f.command("register", { bodyFields: { release_authorization_id: approval.authorization_id } }),
    { authorize: f.authorize }), safeCode("INTERNAL_INSTALLATION_REQUEST_INVALID"));
  await assert.rejects(f.runtime.legacy_installation_service.register(
    f.command("register", { signingPath: "/api/desktop/internal-installations" }),
    { authorize: f.authorize }), safeCode("OUTLOOK_DESKTOP_PROOF_SIGNATURE_INVALID"));
  await assert.rejects(f.runtime.legacy_installation_service.register(
    f.command("register", { bodyFields: { source_sha: "c".repeat(40) } }),
    { authorize: f.authorize }), safeCode("INTERNAL_INSTALLATION_RELEASE_UNTRUSTED"));
  await assert.rejects(f.runtime.legacy_installation_service.register(
    f.command("register", { principal: { ...f.actor, user_id: "wrong-owner" } }),
    { authorize: f.authorize }), safeCode("INTERNAL_INSTALLATION_BINDING_MISMATCH"));
  const registered = await f.runtime.legacy_installation_service.register(request, { authorize: f.authorize });
  const installationId = registered.body.installation.installation_id;
  await assert.rejects(f.runtime.legacy_installation_service.heartbeat(
    f.command("heartbeat", { installationId, principal: { ...f.actor, user_id: "wrong-owner" } }),
    { authorize: f.authorize }), safeCode("INTERNAL_INSTALLATION_BINDING_MISMATCH"));
  assert.equal((await f.generic.read({ principal: f.actor, installation_id: installationId })).state_version, 1);
  await f.revoke(approval);
  await assert.rejects(f.runtime.legacy_installation_service.register(f.command("register"), { authorize: f.authorize }),
    safeCode("INTERNAL_INSTALLATION_RETIRED_OR_REVOKED"));
  await assert.rejects(f.runtime.legacy_installation_service.heartbeat(
    f.command("heartbeat", { installationId }), { authorize: f.authorize }),
  safeCode("INTERNAL_INSTALLATION_RETIRED_OR_REVOKED"));
  assert.deepEqual(f.fallbackCalls, { register: 0, heartbeat: 0, retire: 0, read: 0 });
});

test("only no internal grant reaches existing 009 registration and an existing legacy device is never rebound", async (t) => {
  const f = await oldProtocolFixture(t, "009-fallback");
  assert.equal(await f.internal.registerLegacy(f.command("register"), { authorize: f.authorize }), null);
  const registered = await f.runtime.legacy_installation_service.register(
    f.command("register", { tuple: WINDOWS_0129_REQUEST }), { authorize: f.authorize });
  assert.equal(registered.response_status, 201);
  assert.equal(f.fallbackCalls.register, 1);
  const installationId = registered.body.installation.installation_id;
  const before = await f.generic.read({ principal: f.actor, installation_id: installationId });
  assert.equal(before.app_version, "0.1.29");
  assert.equal(before.source_sha, WINDOWS_0129_REQUEST.source_sha);
  await f.grant();
  await assert.rejects(f.runtime.legacy_installation_service.register(f.command("register"), { authorize: f.authorize }),
    safeCode("INTERNAL_INSTALLATION_BINDING_MISMATCH"));
  assert.deepEqual(await f.generic.read({ principal: f.actor, installation_id: installationId }), before);
  assert.equal(f.fallbackCalls.register, 1);
  assert.equal((await f.runtime.legacy_installation_service.heartbeat(
    f.command("heartbeat", { installationId }), { authorize: f.authorize })).body.installation.state_version, 2);
  assert.equal((await f.runtime.legacy_installation_service.retire(
    f.command("retire", { installationId, stateVersion: 2 }), { authorize: f.authorize })).body.installation.status, "retired");
  assert.equal(f.fallbackCalls.heartbeat, 1);
  assert.equal(f.fallbackCalls.retire, 1);
});

test("revoked internal 0.1.29 and expired internal 0.1.32 grants cannot downgrade to old trusted-current compatibility", async (t) => {
  const revoked = await oldProtocolFixture(t, "revoked0129");
  const grant = await revoked.grant({ tuple: WINDOWS_0129_REQUEST });
  const installation = await revoked.runtime.legacy_installation_service.register(
    revoked.command("register", { tuple: WINDOWS_0129_REQUEST }), { authorize: revoked.authorize });
  const installationId = installation.body.installation.installation_id;
  assert.equal((await revoked.original.installation_service.readTrustedCurrent({ principal: revoked.actor })).release_trusted, true,
    "the existing 009 compatibility path would otherwise trust this exact legacy tuple");
  const signerDisabled = createPostgresInternalUnsignedInstallationAuthority({
    pool: revoked.authority.appPool, tenant_id: revoked.actor.tenant_id,
  });
  assert.equal(signerDisabled.attestation_configured, false);
  const signerDisabledRuntime = composeInternalUnsignedInstallationRuntime(revoked.monitoredRuntime, signerDisabled);
  const boundPrincipal = { principal: revoked.actor };
  assert.equal((await signerDisabledRuntime.installation_service.readTrustedCurrent(boundPrincipal)).release_trusted, true);
  for (const partial of [
    { attestation_key_id: "partial-signer" },
    { attestation_private_key: revoked.signer.privateKey },
    { expected_attestation_public_key_sha256: revoked.signingPin },
  ]) {
    assert.throws(() => createPostgresInternalUnsignedInstallationAuthority({
      pool: revoked.authority.appPool, tenant_id: revoked.actor.tenant_id, ...partial,
    }));
  }
  const originalRows = async () => (await revoked.authority.observerPool.query(
    `SELECT 'installation' AS kind,to_jsonb(row) AS data FROM lawos_email_dms.outlook_desktop_installations AS row WHERE tenant_id=$1
     UNION ALL SELECT 'nonce',to_jsonb(row) FROM lawos_email_dms.outlook_desktop_installation_nonces AS row WHERE tenant_id=$1
     UNION ALL SELECT 'idempotency',to_jsonb(row) FROM lawos_email_dms.outlook_desktop_installation_idempotency AS row WHERE tenant_id=$1
     UNION ALL SELECT 'audit',to_jsonb(row) FROM lawos_email_dms.outlook_desktop_installation_audit_events AS row WHERE tenant_id=$1
     ORDER BY kind,data`, [revoked.actor.tenant_id],
  )).rows;
  const beforeDedicatedCalls = await originalRows();
  const unavailable = (error) => error?.safe_error_code === "INTERNAL_INSTALLATION_AUTHORITY_UNAVAILABLE"
    && error.status === 503;
  for (const operation of ["register", "heartbeat", "retire"]) {
    const command = revoked.command(operation, { installationId: operation === "register" ? "NEW" : installationId });
    command.request = {
      ...command.request,
      path: operation === "register" ? "/api/desktop/internal-installations"
        : `/api/desktop/internal-installations/${installationId}/${operation}`,
      body: operation === "register" ? {
        release_authorization_id: grant.authorization_id,
        installed_receipt_sha256: grant.installed_receipt_sha256,
        device_public_key: command.request.body.device_public_key,
      } : command.request.body,
    };
    command.signature = signOutlookDesktopLifecycleRequest(command.request, revoked.device.privateKey);
    await assert.rejects(signerDisabled[operation](command), unavailable);
  }
  await assert.rejects(signerDisabled.attest({ ...boundPrincipal, installation_id: installationId,
    adoption_id: "signer-disabled-adoption", request_sha256: digest("signer disabled adoption") }), unavailable);
  assert.deepEqual(await originalRows(), beforeDedicatedCalls, "disabled dedicated calls must not mutate lifecycle records");
  assert.equal((await signerDisabledRuntime.legacy_installation_service.heartbeat(
    revoked.command("heartbeat", { installationId }), { authorize: revoked.authorize })).body.installation.state_version, 2);
  assert.deepEqual(revoked.authorizeCalls.at(-1), { operation: "heartbeat",
    principal: revoked.actor, installation_id: installationId });
  await revoked.revoke(grant);
  await assert.rejects(signerDisabledRuntime.installation_service.readTrustedCurrent(boundPrincipal),
    safeCode("INTERNAL_INSTALLATION_RETIRED_OR_REVOKED"));
  await assert.rejects(signerDisabledRuntime.legacy_installation_service.heartbeat(
    revoked.command("heartbeat", { installationId, stateVersion: 2 }), { authorize: revoked.authorize }),
  safeCode("INTERNAL_INSTALLATION_RETIRED_OR_REVOKED"));
  await assert.rejects(revoked.runtime.installation_service.readTrustedCurrent({ principal: revoked.actor }),
    safeCode("INTERNAL_INSTALLATION_RETIRED_OR_REVOKED"));
  assert.equal(revoked.fallbackCalls.read, 0);
  assert.equal((await revoked.generic.read({ principal: revoked.actor, installation_id: installationId })).status, "active");
  assert.equal((await signerDisabledRuntime.legacy_installation_service.retire(
    revoked.command("retire", { installationId, stateVersion: 2 }), { authorize: revoked.authorize })).body.installation.status, "retired");
  assert.deepEqual(revoked.authorizeCalls.at(-1), { operation: "retire",
    principal: revoked.actor, installation_id: installationId });
  assert.deepEqual(revoked.fallbackCalls, { register: 0, heartbeat: 0, retire: 0, read: 0 });

  const expired = await oldProtocolFixture(t, "expired0132");
  const expiring = await expired.grant({ lifetime: 2000 });
  await expired.runtime.legacy_installation_service.register(expired.command("register"), { authorize: expired.authorize });
  await delay(Math.max(0, Date.parse(expiring.valid_until) - Date.now() + 5));
  await assert.rejects(expired.runtime.installation_service.readTrustedCurrent({ principal: expired.actor }),
    safeCode("INTERNAL_INSTALLATION_RELEASE_UNTRUSTED"));
  await assert.rejects(expired.runtime.legacy_installation_service.register(expired.command("register"),
    { authorize: expired.authorize }), safeCode("INTERNAL_INSTALLATION_RELEASE_UNTRUSTED"));
  assert.deepEqual(expired.fallbackCalls, { register: 0, heartbeat: 0, retire: 0, read: 0 });
});
