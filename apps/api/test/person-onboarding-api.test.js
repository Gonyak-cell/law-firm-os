import assert from "node:assert/strict";
import test from "node:test";
import { Readable } from "node:stream";
import { createMasterDataRepository } from "../../../packages/master-data/src/repository.js";
import { createInMemoryHrxRepository } from "../../../packages/hrx/src/repository.js";
import { createClientPortalRepository } from "../../../packages/client-portal/src/runtime-repository.js";
import { createHrxRuntimeContext } from "../src/hrx-runtime-context.js";
import { createPortalRuntimeContext } from "../src/portal-runtime-context.js";
import { createApiServer, createDefaultMasterDataRuntime } from "../src/server.js";
import { highestPrivilegeRegisteredAccount, findRegisteredAccountByEmail, MATTER_VAULT_REGISTERED_TENANT_ID } from "../src/matter-vault-account-registry.js";
import { SYNTHETIC_PROFILE_PNG_BASE64 } from "../../../scripts/test/helpers/synthetic-private-runtime-sources.mjs";

function dispatch(server, path, options = {}) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`No response for ${options.method ?? "GET"} ${path}`)), 10000);
    const req = Readable.from(options.body === undefined ? [] : [Buffer.from(options.body)]);
    Object.assign(req, { url: path, method: options.method ?? "GET", headers: options.headers ?? {}, socket: { remoteAddress: "127.0.0.1" } });
    let status, headers;
    server.listeners("request")[0](req, { writeHead(code, values) { status = code; headers = values; },
      end(value) { clearTimeout(timeout); resolve(new Response(value, { status, headers })); } }).catch(error => { clearTimeout(timeout); reject(error); });
  });
}

async function signed(server, account) {
  const response = await dispatch(server, "/api/auth/login", { method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: account.email, password: account.local_dev.synthetic_token }) });
  return { authorization: `Bearer ${(await response.json()).session_token}`, "content-type": "application/json" };
}

test("signed web onboarding integrates account, Person, internal/external extension, replay, setup and deny-default ACL", async () => {
  const master = createMasterDataRepository({ seedRecords: [{ model_type: "ClientGroup", tenant_id: MATTER_VAULT_REGISTERED_TENANT_ID,
    client_group_id: "client_group_onboarding_synthetic", display_name: "Synthetic Client", status: "active", owner_user_id: "seed" }] });
  const hrx = createInMemoryHrxRepository();
  const portal = createClientPortalRepository();
  const server = createApiServer({ masterDataRuntime: createDefaultMasterDataRuntime({ repository: master }),
    hrxRuntime: createHrxRuntimeContext({ repository: hrx, seedRuntimeFixtures: false }),
    portalRuntime: createPortalRuntimeContext({ repository: portal }) });
  try {
    const headers = await signed(server, highestPrivilegeRegisteredAccount());
    const options = await dispatch(server, "/api/admin/security/person-invitations", { headers });
    assert.equal(options.status, 200);
    assert.equal((await options.json()).items.some(item => item.client_group_id === "client_group_onboarding_synthetic"), true);
    const forgedHrxLink = await dispatch(server, "/api/hrx/employees", {
      method: "POST",
      headers,
      body: JSON.stringify({
        employee_id: "employee_forged_person_link",
        display_name: "Forged",
        person_id: "person_forged",
      }),
    });
    assert.equal(forgedHrxLink.status, 400);
    const post = (body, key) => dispatch(server, "/api/admin/security/person-invitations", {
      method: "POST",
      headers: { ...headers, "idempotency-key": key },
      body: JSON.stringify(body),
    });
    const internalBody = { type: "internal", email: "new-internal@example.test", display_name: "New Internal",
      legal_name: "New Internal Legal", employment_type: "full_time", title: "Associate", effective_from: "2026-09-13" };
    const internal = await post(internalBody, "api-onboard-internal");
    const internalResult = await internal.json();
    assert.equal(internal.status, 201, JSON.stringify(internalResult));
    assert.match(internalResult.invitation.setup_url, /token=/);
    const activated = await dispatch(server, `/api/hrx/employees/${internalResult.role_extension.employee_id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ status: "active" }),
    });
    assert.equal(activated.status, 200);
    const replay = await post(internalBody, "api-onboard-internal");
    assert.equal(replay.status, 200);
    assert.equal((await replay.json()).invitation.setup_url, null);
    assert.equal((await post({ ...internalBody, title: "Partner" }, "api-onboard-internal")).status, 409);
    const directory = await dispatch(server, "/api/admin/security/users", { headers });
    assert.equal((await directory.json()).items.some(item => item.user_id === internalResult.user.user_id), true);
    const adminEdit = await dispatch(server, `/api/profile/users/${internalResult.user.user_id}`, { method: "PATCH",
      headers: { ...headers, "idempotency-key": "api-onboard-admin-profile" },
      body: JSON.stringify({ contact_email: "profile-contact@example.test", professional_profile: { bio: "Synthetic profile" } }) });
    assert.equal(adminEdit.status, 200);
    assert.equal((await adminEdit.json()).item.professional_profile.bio, "Synthetic profile");

    const external = await post({ type: "external", email: "new-external@example.test", display_name: "New External",
      legal_name: "New External Legal", client_group_id: "client_group_onboarding_synthetic" }, "api-onboard-external");
    assert.equal(external.status, 201);
    const externalResult = await external.json();
    assert.equal(externalResult.access.matter_access, "denied_until_explicit_acl");
    assert.equal(portal.list({ tenant_id: MATTER_VAULT_REGISTERED_TENANT_ID, model_type: "ExternalAcl" }).length, 0);
    assert.equal(hrx.listEmployees({ tenant_id: MATTER_VAULT_REGISTERED_TENANT_ID }).length, 1);

    const externalToken = new URL(externalResult.invitation.setup_url, "http://local.test").searchParams.get("invitation_token");
    assert.equal((await dispatch(server, "/api/auth/invitations/accept", { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ token: externalToken, password: "External-password-2026!" }) })).status, 200);
    const externalLogin = await dispatch(server, "/api/auth/login", { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "new-external@example.test", password: "External-password-2026!" }) });
    const externalHeaders = { authorization: `Bearer ${(await externalLogin.json()).session_token}` };
    assert.equal((await dispatch(server, "/api/hrx/people/me", { headers: externalHeaders })).status, 403);
    const externalProfile = await dispatch(server, "/api/profile/me", { method: "PATCH", headers: { ...externalHeaders,
      "content-type": "application/json", "idempotency-key": "external-self-profile" }, body: JSON.stringify({ mobile_phone: "010-2222-3333" }) });
    assert.equal(externalProfile.status, 200);
    assert.equal((await externalProfile.json()).item.mobile_phone, "010-2222-3333");
    const png = Buffer.from(SYNTHETIC_PROFILE_PNG_BASE64, "base64");
    assert.equal((await dispatch(server, "/api/profile/me/photo", { method: "PUT", headers: { ...externalHeaders,
      "content-type": "image/png", "idempotency-key": "external-self-photo" }, body: png })).status, 200);

    const token = new URL(internalResult.invitation.setup_url, "http://local.test").searchParams.get("invitation_token");
    const accepted = await dispatch(server, "/api/auth/invitations/accept", { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, password: "Synthetic-password-2026!" }) });
    assert.equal(accepted.status, 200);
    assert.equal((await dispatch(server, "/api/auth/invitations/accept", { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, password: "Synthetic-password-2026!" }) })).status, 401);
    assert.equal((await dispatch(server, "/api/auth/login", { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: internalBody.email, password: "Synthetic-password-2026!" }) })).status, 200);

    const ordinary = findRegisteredAccountByEmail("member10@runtime.example.test");
    const ordinaryHeaders = await signed(server, ordinary);
    assert.equal((await dispatch(server, "/api/admin/security/person-invitations", { method: "POST",
      headers: { ...ordinaryHeaders, "idempotency-key": "api-onboard-denied" }, body: JSON.stringify({ ...internalBody, email: "denied@example.test" }) })).status, 403);
  } finally { server.close(); }
});
