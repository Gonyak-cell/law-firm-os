import assert from "node:assert/strict";
import { createHash, generateKeyPairSync } from "node:crypto";
import test from "node:test";

import { hashDomainValue } from "../../persistence/src/domain-ledger.js";
import { signOutlookDesktopLifecycleRequest } from "../src/outlook-desktop-installation-proof.js";
import { createPostgresOutlookDesktopLegacyWindowsCompatibilityService } from "../src/postgres-outlook-desktop-installation-service.js";
import {
  authorityDigest,
  createOutlookAssignmentAuthorityFixture,
  roleDatabaseNow,
  roleJsonCall,
} from "./support/postgres-outlook-desktop-assignment-authority-fixture.js";
import { roleQuery } from "./support/postgres-outlook-desktop-positive-role-fixture.js";

const TABLES = [
  "internal_unsigned_release_authorizations",
  "internal_unsigned_release_revocations",
  "internal_unsigned_installation_bindings",
  "outlook_desktop_installations",
  "outlook_desktop_installation_nonces",
  "outlook_desktop_installation_idempotency",
  "outlook_desktop_installation_audit_events",
];

async function fixture(t, suffix) {
  const authority = await createOutlookAssignmentAuthorityFixture({
    after: t.after.bind(t),
    skip: (reason) => assert.fail(`Actual PostgreSQL is required: ${reason}`),
  }, { tenantId: `tenant-internal-legacy-bridge-${suffix}` });
  assert.ok(authority, "an actual temporary PostgreSQL fixture is required");
  return authority;
}

function device() {
  const pair = generateKeyPairSync("ed25519");
  const der = pair.publicKey.export({ type: "spki", format: "der" });
  return { privateKey: pair.privateKey, publicKey: der.toString("base64"),
    fingerprint: createHash("sha256").update(der).digest("hex") };
}

async function grantFor(authority, pair, suffix, overrides = {}) {
  const now = Date.parse(await roleDatabaseNow(authority.appPool, authority.tenantId));
  const grant = {
    tenant_id: authority.tenantId,
    authorization_id: `legacy-bridge-authorization-${suffix}`,
    ...authority.principal,
    device_key_fingerprint: pair.fingerprint,
    installed_receipt_sha256: authorityDigest(`installed-receipt-${suffix}`),
    app_id: "com.amic.matter.desktop.internal", platform: "win32", architecture: "x64",
    channel: "internal-unsigned", release_id: `internal-release-${suffix}`,
    release_sequence: 32, version: "0.1.32", source_sha: "a".repeat(40),
    source_tree: "b".repeat(40), installer_sha256: authorityDigest(`installer-${suffix}`),
    installer_bytes: 109711906, installer_version_id: `installer-version-${suffix}`,
    bootstrap_marker_sha256: authorityDigest(`bootstrap-${suffix}`),
    owner_approval_sha256: authorityDigest(`owner-approval-${suffix}`),
    valid_from: new Date(now - 1000).toISOString(),
    valid_until: new Date(now + 3600000).toISOString(),
    ...overrides,
  };
  return { ...grant, release_authority_sha256: hashDomainValue(grant) };
}

function authorize(authority, grant) {
  return roleJsonCall(authority.controlPool, authority.tenantId,
    "authorize_internal_unsigned_release", grant);
}

function requestFor(authority, grant, pair, suffix, {
  operation = "register", installationId = "NEW", stateVersion = 1,
} = {}) {
  return {
    operation, principal: { ...authority.principal },
    request_id: `request-legacy-bridge-${suffix}`, installation_id: installationId,
    body: operation === "register" ? {
      platform: grant.platform, app_version: grant.version,
      source_sha: grant.source_sha, device_public_key: pair.publicKey,
    } : {
      expected_state_version: stateVersion,
      ...(operation === "retire" ? { retire_reason: "windows_uninstall" } : {}),
    },
    verified: {
      idempotency_key: `idempotency-legacy-bridge-${suffix}`,
      nonce_hash: authorityDigest(`nonce-${suffix}`),
      request_fingerprint: authorityDigest(`original-client-request-${suffix}`),
      issued_at: new Date(Date.now() - 1000).toISOString(),
      expires_at: new Date(Date.now() + 120000).toISOString(),
      device_key_fingerprint: pair.fingerprint,
    },
  };
}

function apply(authority, request) {
  return roleJsonCall(authority.appPool, authority.tenantId,
    "apply_internal_unsigned_installation", request);
}

function readCurrent(authority) {
  return roleQuery(authority.appPool, authority.tenantId,
    "SELECT lawos_email_dms.read_current_internal_unsigned_installation($1,$2,$3) AS value",
    [authority.tenantId, authority.principal.user_id, authority.principal.entra_subject_id], true);
}

function readKey(authority, installationId, principal = authority.principal) {
  return roleQuery(authority.appPool, authority.tenantId,
    "SELECT lawos_email_dms.read_internal_unsigned_installation_proof_key($1,$2,$3,$4) AS value",
    [authority.tenantId, principal.user_id, principal.entra_subject_id, installationId], true);
}

function revoke(authority, grant, suffix) {
  return roleJsonCall(authority.controlPool, authority.tenantId,
    "revoke_internal_unsigned_release", {
      authorization_id: grant.authorization_id,
      expected_release_authority_sha256: grant.release_authority_sha256,
      revocation_id: `legacy-bridge-revocation-${suffix}`, reason: "release_withdrawn",
      owner_approval_sha256: authorityDigest(`revoke-owner-${suffix}`),
    });
}

async function rows(authority) {
  const result = {};
  for (const table of TABLES) {
    result[table] = (await authority.observerPool.query(
      `SELECT COALESCE(jsonb_agg(to_jsonb(row) ORDER BY to_jsonb(row)::text),'[]'::jsonb) AS value
       FROM lawos_email_dms.${table} AS row WHERE tenant_id=$1`, [authority.tenantId],
    )).rows[0].value;
  }
  return result;
}

async function rejectWithoutWrites(authority, request, expectedCode, before) {
  await assert.rejects(apply(authority, request), (error) => {
    assert.equal(error?.postgres_code ?? error?.code, expectedCode,
      `unexpected error for body fields ${Object.keys(request.body).join(",")}`);
    return true;
  });
  assert.deepEqual(await rows(authority), before);
}

test("unchanged Windows registration body resolves its sole approved grant and preserves replay evidence", async (t) => {
  const authority = await fixture(t, "success");
  const pair = device();
  const grant = await grantFor(authority, pair, "success");
  await authorize(authority, grant);
  const request = requestFor(authority, grant, pair, "success-register");
  const registered = await apply(authority, request);
  assert.equal(registered.response_status, 201);
  assert.equal(registered.body.outcome, "registered");
  const installationId = registered.body.installation.installation_id;
  const saved = await rows(authority);
  assert.deepEqual(await apply(authority, request), registered);
  assert.deepEqual(await rows(authority), saved);
  for (const table of ["outlook_desktop_installation_nonces", "outlook_desktop_installation_idempotency"]) {
    assert.equal(saved[table].length, 1);
    assert.equal(saved[table][0].request_fingerprint, request.verified.request_fingerprint);
    assert.equal(saved[table][0].idempotency_key, request.verified.idempotency_key);
  }
  const audit = saved.outlook_desktop_installation_audit_events;
  assert.equal(audit.length, 1);
  assert.equal(audit[0].request_id, request.request_id);
  assert.equal(audit[0].idempotency_key, request.verified.idempotency_key);
  assert.equal(audit[0].details.release_authorization_id, grant.authorization_id);
  assert.equal(audit[0].details.release_authority_sha256, grant.release_authority_sha256);
  const current = await readCurrent(authority);
  assert.equal(current.installation.installation_id, installationId);
  assert.equal(current.installation.state_version, 1);
  assert.equal(current.installation.status, "active");
  assert.equal(current.installation.release_trusted, true);
  assert.equal(current.installation.retired_at, null);
  for (const key of ["tenant_id", "app_id", "platform", "architecture", "release_id",
    "release_sequence", "version", "source_sha", "source_tree", "installer_sha256",
    "installer_bytes", "installer_version_id", "bootstrap_marker_sha256",
    "installed_receipt_sha256", "release_authority_sha256"]) {
    assert.equal(current.installation[key], grant[key], key);
  }
  assert.match(current.installation.installation_release_binding_sha256, /^[a-f0-9]{64}$/u);
  assert.ok(Date.parse(current.expires_at) > Date.parse(current.installation.authority_snapshot_at));
  assert.ok(Date.parse(current.installation.lease_expires_at) >= Date.parse(current.expires_at));
  assert.deepEqual(await readKey(authority, installationId), {
    device_public_key: pair.publicKey, device_key_fingerprint: pair.fingerprint,
  });
  await assert.rejects(readKey(authority, installationId, {
    ...authority.principal, entra_subject_id: "other-subject",
  }), (error) => (error?.postgres_code ?? error?.code) === "LIU03");
  assert.deepEqual(await rows(authority), saved);
});

test("legacy grant admission returns not applicable only for zero exact candidates and denies malformed, mismatched, or ambiguous grants", async (t) => {
  const authority = await fixture(t, "boundaries");
  const pair = device();
  const grant = await grantFor(authority, pair, "boundaries");
  const request = requestFor(authority, grant, pair, "boundaries-register");
  await rejectWithoutWrites(authority, request, "LIU09", await rows(authority));
  await authorize(authority, grant);
  const saved = await rows(authority);
  const otherPair = device();
  for (const altered of [
    { ...request, principal: { ...request.principal, user_id: "other-user" } },
    { ...request, principal: { ...request.principal, entra_subject_id: "other-subject" } },
  ]) await rejectWithoutWrites(authority, altered, "LIU03", saved);
  await rejectWithoutWrites(authority,
    requestFor(authority, grant, otherPair, "other-device"), "LIU09", saved);
  for (const body of [
    { ...request.body, release_authorization_id: grant.authorization_id },
    { ...request.body, installed_receipt_sha256: grant.installed_receipt_sha256 },
    { ...request.body, platform: null },
    { ...request.body, app_version: 32 },
    { ...request.body, source_sha: [] },
    { ...request.body, device_public_key: {} },
    Object.fromEntries(Object.entries(request.body).filter(([key]) => key !== "source_sha")),
  ]) await rejectWithoutWrites(authority, { ...request, body }, "LIU08", saved);
  for (const body of [
    { ...request.body, platform: "darwin" },
    { ...request.body, app_version: "0.1.33" },
    { ...request.body, source_sha: "c".repeat(40) },
  ]) await rejectWithoutWrites(authority, { ...request, body }, "LIU08", saved);
  const second = await grantFor(authority, pair, "ambiguous");
  await authorize(authority, second);
  await rejectWithoutWrites(authority, request, "LIU08", await rows(authority));
  await revoke(authority, second, "ambiguous");
  await rejectWithoutWrites(authority, request, "LIU08", await rows(authority));
});

test("revoked and expired matching grants never fall back and still allow owned installation retirement", async (t) => {
  const authority = await fixture(t, "withdrawn");
  for (const kind of ["revoked", "expired"]) {
    const pair = device();
    const now = Date.parse(await roleDatabaseNow(authority.appPool, authority.tenantId));
    const grant = await grantFor(authority, pair, kind, kind === "expired" ? {
      valid_until: new Date(now + 2500).toISOString(),
    } : {});
    await authorize(authority, grant);
    const registered = await apply(authority, requestFor(authority, grant, pair, `${kind}-register`));
    const installationId = registered.body.installation.installation_id;
    if (kind === "revoked") await revoke(authority, grant, kind);
    else await authority.observerPool.query(
      "SELECT pg_sleep(GREATEST(0,extract(epoch FROM $1::timestamptz-clock_timestamp()))+0.01)",
      [grant.valid_until],
    );
    const expectedCode = kind === "revoked" ? "LIU06" : "LIU08";
    await assert.rejects(readCurrent(authority),
      (error) => (error?.postgres_code ?? error?.code) === expectedCode);
    const saved = await rows(authority);
    await rejectWithoutWrites(authority,
      requestFor(authority, grant, pair, `${kind}-register-again`), expectedCode, saved);
    await rejectWithoutWrites(authority,
      requestFor(authority, grant, pair, `${kind}-heartbeat`, { operation: "heartbeat", installationId }),
      expectedCode, saved);
    assert.equal((await readKey(authority, installationId)).device_key_fingerprint, pair.fingerprint);
    const retired = await apply(authority,
      requestFor(authority, grant, pair, `${kind}-retire`, { operation: "retire", installationId }));
    assert.equal(retired.body.installation.status, "retired");
    assert.equal(retired.body.installation.state_version, 2);
  }
});

test("an existing real 009 installation cannot be silently rebound by a matching internal grant", async (t) => {
  const authority = await fixture(t, "existing");
  const pair = device();
  const service = createPostgresOutlookDesktopLegacyWindowsCompatibilityService({
    pool: authority.appPool, tenant_id: authority.tenantId,
  });
  const legacyRequest = {
    method: "POST", path: "/api/desktop/installations", installation_id: "NEW",
    body: { platform: "win32", app_version: "0.1.29",
      source_sha: "4df77e1848b52ea455f20b41b9b1c64961bfa1cf", device_public_key: pair.publicKey },
    idempotency_key: "idempotency-real-009-before-internal-bridge",
    nonce: Buffer.alloc(24, 9).toString("base64url"),
    issued_at: new Date(Date.now() - 1000).toISOString(),
    expires_at: new Date(Date.now() + 120000).toISOString(),
  };
  const legacy = await service.register({
    principal: { tenant_id: authority.tenantId, ...authority.principal },
    request_id: "request-real-009-before-internal-bridge", request: legacyRequest,
    signature: signOutlookDesktopLifecycleRequest(legacyRequest, pair.privateKey),
  }, { authorize: async () => true });
  assert.equal(legacy.body.outcome, "registered");
  assert.equal(await readKey(authority, legacy.body.installation.installation_id), null);
  const grant = await grantFor(authority, pair, "existing");
  await authorize(authority, grant);
  await rejectWithoutWrites(authority,
    requestFor(authority, grant, pair, "existing-register"), "LIU03", await rows(authority));
  assert.equal(await readCurrent(authority), null);
});
