import assert from "node:assert/strict";
import test from "node:test";
import { Readable } from "node:stream";
import { createMasterDataRepository } from "../../../packages/master-data/src/repository.js";
import { createApiServer, createDefaultMasterDataRuntime } from "../src/server.js";
import { highestPrivilegeRegisteredAccount, findRegisteredAccountByEmail } from "../src/matter-vault-account-registry.js";
import { SYNTHETIC_PROFILE_PNG_BASE64 } from "../../../scripts/test/helpers/synthetic-private-runtime-sources.mjs";

// Exercise the real HTTP request listener without binding a socket (sandbox denies listen).
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

test("signed self profile persists safe fields, rejects privileged payloads and binds photo bytes", async () => {
  const repository = createMasterDataRepository();
  const server = createApiServer({ masterDataRuntime: createDefaultMasterDataRuntime({ repository }) });
  try {
    const account = highestPrivilegeRegisteredAccount();
    const login = await dispatch(server, "/api/auth/login", { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: account.email, password: account.local_dev.synthetic_token }) });
    assert.equal(login.status, 200);
    const headers = { authorization: `Bearer ${(await login.json()).session_token}` };
    const call = async (path, options = {}) => {
      const response = await dispatch(server, path, { ...options, headers: { ...headers, ...options.headers } });
      return { status: response.status, body: await response.json() };
    };
    const save = { method: "PATCH", headers: { "content-type": "application/json", "idempotency-key": "self-save" }, body: JSON.stringify({ english_name: "Synthetic Profile", mobile_phone: "010-0000-1234", professional_profile: { bio: "Synthetic only" } }) };
    assert.equal((await dispatch(server, "/api/profile/me", { ...save })).status, 401);
    const saved = await call("/api/profile/me", save);
    assert.equal(saved.status, 200);
    assert.ok(saved.body.item.person_id);
    assert.equal(saved.body.item.english_name, "Synthetic Profile");
    assert.equal(saved.body.item.mobile_phone, "010-0000-1234");
    assert.equal((await call("/api/profile/me")).body.item.professional_profile.bio, "Synthetic only");
    assert.equal((await call("/api/profile/me", save)).body.item.person_id, saved.body.item.person_id);
    assert.equal(repository.list({ model_type: "Person" }).filter(person => person.account_user_id === account.user_id).length, 1);
    assert.equal((await call("/api/profile/me", { ...save, body: JSON.stringify({ title: "forged" }) })).status, 403);
    assert.equal((await call("/api/profile/me", { ...save, body: JSON.stringify({ legal_name: "forged" }) })).status, 403);
    assert.equal((await call("/api/profile/me?tenant_id=other", save)).status, 403);
    assert.equal((await call("/api/profile/me", { ...save, body: JSON.stringify({ mobile_phone: "changed" }) })).status, 409);
    const png = Buffer.from(SYNTHETIC_PROFILE_PNG_BASE64, "base64");
    const upload = { method: "PUT", headers: { "content-type": "image/png", "idempotency-key": "photo-one" }, body: png };
    const photo = await call("/api/profile/me/photo", upload);
    assert.equal(photo.status, 200);
    assert.equal(photo.body.item.photo_url, "/api/profile/me/photo");
    assert.equal(/object_id|object_key|storage_pointer|base64/.test(JSON.stringify(photo.body)), false);
    const read = await dispatch(server, "/api/profile/me/photo", { headers });
    assert.equal(read.status, 200);
    assert.match(read.headers.get("cache-control"), /private.*no-store/);
    assert.equal(read.headers.get("x-content-type-options"), "nosniff");
    assert.deepEqual(Buffer.from(await read.arrayBuffer()), png);
    assert.equal((await call("/api/profile/me/photo", { ...upload, body: Buffer.from("forged") })).status, 422);
    assert.equal((await call("/api/profile/me/photo", { ...upload, headers: { ...upload.headers, "content-type": "image/jpeg" } })).status, 422);
    const ordinary = findRegisteredAccountByEmail("member10@runtime.example.test");
    const signed = await dispatch(server, "/api/auth/login", { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: ordinary.email, password: ordinary.local_dev.synthetic_token }) });
    const ordinaryHeaders = { authorization: `Bearer ${(await signed.json()).session_token}` };
    assert.equal((await dispatch(server, `/api/profile/users/${account.user_id}`, { headers: ordinaryHeaders })).status, 403);
    assert.equal((await dispatch(server, `/api/profile/users/${account.user_id}`, { ...save, headers: { ...save.headers, ...ordinaryHeaders } })).status, 403);
    const adminSave = await call(`/api/profile/users/${ordinary.user_id}`, { ...save, headers: { ...save.headers, "idempotency-key": "admin-save" }, body: JSON.stringify({ display_name: "Edited Synthetic" }) });
    assert.equal(adminSave.status, 200);
    assert.equal((await call(`/api/profile/users/${ordinary.user_id}`)).body.item.display_name, "Edited Synthetic");
    const otherTenant = findRegisteredAccountByEmail("member12@runtime.example.test");
    assert.equal((await call(`/api/profile/users/${otherTenant.user_id}`)).status, 404);
  } finally { server.close(); }
});
