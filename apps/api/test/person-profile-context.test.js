import assert from "node:assert/strict";
import test from "node:test";
import { createMasterDataRepository } from "../../../packages/master-data/src/repository.js";
import { createLocalStorageAdapter } from "../../../packages/dms/src/storage/local-storage-adapter.js";
import { handlePersonProfileRequest } from "../src/person-profile-context.js";
import { createClientPortalRepository } from "../../../packages/client-portal/src/runtime-repository.js";
import { SYNTHETIC_PROFILE_PNG_BASE64 } from "../../../scripts/test/helpers/synthetic-private-runtime-sources.mjs";

const actor = { tenant_id: "tenant_synthetic", user_id: "external_synthetic" };
const subject = { ...actor, display_name: "External Synthetic", email: "external@example.test" };
function fixture() {
  const repository = createMasterDataRepository();
  const portalRepository = createClientPortalRepository({ seedRecords: [{ model_type: "ExternalUser", tenant_id: actor.tenant_id,
    external_user_id: "external_access", party_id: "party_synthetic", display_name: subject.display_name, email: subject.email,
    user_id: actor.user_id, client_group_id: "client_synthetic" }] });
  return { pathname: "/api/profile/me", method: "GET", repository, storage: createLocalStorageAdapter(),
    context: { principal: actor }, enabled: true, getSubject: async () => subject,
    portalRepository,
    readLegacy() { throw new Error("External must not read HRX"); } };
}

test("external profile save/read never enters HRX, creates no employment or access grants", async () => {
  const input = fixture();
  const saved = await handlePersonProfileRequest({ ...input, method: "PATCH", headers: { "idempotency-key": "external-1" }, body: { mobile_phone: "synthetic" } });
  assert.equal(saved.status, 200);
  assert.equal(saved.body.item.employee_id, null);
  assert.equal(saved.body.item.mobile_phone, "synthetic");
  assert.equal(saved.body.item.title, undefined);
  assert.ok(saved.body.item.person_id);
  const read = await handlePersonProfileRequest(input);
  assert.equal(read.body.item.person_id, saved.body.item.person_id);
  assert.deepEqual(input.repository.list().map(row => row.model_type).sort(), ["Entity", "Person"]);
  const photo = await handlePersonProfileRequest({ ...input, pathname: "/api/profile/me/photo", method: "PUT",
    headers: { "content-type": "image/png", "idempotency-key": "photo-external" }, bytes: Buffer.from(SYNTHETIC_PROFILE_PNG_BASE64, "base64") });
  assert.equal(photo.status, 200);
  const image = await handlePersonProfileRequest({ ...input, pathname: "/api/profile/me/photo" });
  assert.equal(image.status, 200);
  assert.ok(Buffer.isBuffer(image.body));
});

test("profile route denies cross tenant, foreign subject, duplicate external extensions and nonlocal writes", async () => {
  const input = fixture();
  assert.equal((await handlePersonProfileRequest({ ...input, query: { tenant_id: "other" } })).status, 403);
  assert.equal((await handlePersonProfileRequest({ ...input, getSubject: async () => ({ ...subject, user_id: "other" }) })).status, 404);
  assert.equal((await handlePersonProfileRequest({ ...input, pathname: "/api/profile/users/internal_synthetic" })).status, 403);
  assert.equal((await handlePersonProfileRequest({ ...input, portalRepository: { list: () => [{ user_id: actor.user_id }, { user_id: actor.user_id }] } })).status, 409);
  assert.equal((await handlePersonProfileRequest({ ...input, enabled: false, method: "PATCH", body: {} })).status, 503);
  assert.equal((await handlePersonProfileRequest({ ...input, hasEmployeeLink: () => true })).status, 409);
  assert.equal(input.repository.list().length, 0);
});

test("existing mismatched person extension fails closed without canonical mutation", async () => {
  const input = fixture();
  assert.equal((await handlePersonProfileRequest({ ...input, portalRepository: { list: () => [{ user_id: actor.user_id, person_id: "foreign" }] } })).status, 409);
  assert.equal(input.repository.list().length, 0);
});
