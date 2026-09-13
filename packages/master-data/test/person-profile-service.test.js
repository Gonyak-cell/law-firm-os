import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createMasterDataRepository } from "../src/repository.js";
import { createPersonProfileService } from "../src/person-profile-service.js";
import { createPersonPhotoStorage } from "../src/person-photo-storage.js";
import { createLocalStorageAdapter } from "../../dms/src/storage/local-storage-adapter.js";
import { SYNTHETIC_PROFILE_PNG_BASE64 } from "../../../scripts/test/helpers/synthetic-private-runtime-sources.mjs";

const subject = { tenant_id: "tenant_synthetic", user_id: "user_one", display_name: "Synthetic Person", email: "one@example.test" };
const request = { subject, actor: subject, idempotency_key: "save-1", patch: { english_name: "Synthetic Person", mobile_phone: "010-0000-0000", professional_profile: { bio: "Synthetic bio", experience: ["Synthetic experience"] } } };

test("self profile creates one Person, persists and replays across repository reopen", async () => {
  const dir = await mkdtemp(join(tmpdir(), "person-profile-test-"));
  const previousBackupRoot = process.env.LAWOS_LOCAL_BACKUP_ROOT;
  process.env.LAWOS_LOCAL_BACKUP_ROOT = join(dir, "backups");
  try {
    const filePath = join(dir, "people.json");
    let repository = createMasterDataRepository({ filePath });
    let service = createPersonProfileService({ repository });
    const saved = service.save(request);
    assert.equal(saved.english_name, request.patch.english_name);
    assert.equal(saved.mobile_phone, request.patch.mobile_phone);
    assert.equal(saved.account_user_id, subject.user_id);
    repository.close();
    repository = createMasterDataRepository({ filePath });
    service = createPersonProfileService({ repository });
    assert.deepEqual(service.save(request), saved);
    assert.equal(repository.list({ tenant_id: subject.tenant_id, model_type: "Person" }).length, 1);
    assert.equal(repository.listAudit().length, 1);
    assert.equal(service.read({ subject, actor: subject }).professional_profile.bio, "Synthetic bio");
    assert.throws(() => service.save({ ...request, patch: { mobile_phone: "different" } }), /PROFILE_IDEMPOTENCY_CONFLICT/);
    assert.equal(repository.listAudit().some(event => JSON.stringify(event).includes("Synthetic bio")), false);
    repository.close();
  } finally {
    if (previousBackupRoot === undefined) delete process.env.LAWOS_LOCAL_BACKUP_ROOT;
    else process.env.LAWOS_LOCAL_BACKUP_ROOT = previousBackupRoot;
    await rm(dir, { recursive: true, force: true });
  }
});

test("self service rejects privileged fields, nested injection, another subject and another tenant", () => {
  const repository = createMasterDataRepository();
  const service = createPersonProfileService({ repository });
  for (const field of ["display_name", "legal_name", "email", "work_email", "user_id", "account_user_id", "person_id", "status", "title", "org_unit_id", "client_group_id", "matter_ids", "roles", "scopes", "photo"]) {
    assert.throws(() => service.save({ ...request, patch: { [field]: "forged" } }), /PROFILE_FIELD_FORBIDDEN/, field);
  }
  assert.throws(() => service.save({ ...request, patch: { professional_profile: { scopes: ["tenant.admin"] } } }), /PROFILE_FIELD_FORBIDDEN/);
  assert.throws(() => service.save({ ...request, subject: { ...subject, user_id: "other" } }), /PROFILE_PERMISSION_DENIED/);
  assert.throws(() => service.save({ ...request, subject: { ...subject, tenant_id: "other" }, actor: { ...subject, scopes: ["tenant.admin"] } }), /PROFILE_PERMISSION_DENIED/);
  assert.throws(() => service.read({ subject, actor: null }), /PROFILE_PERMISSION_DENIED/);
  assert.equal(repository.list().length, 0);
});

test("admin may edit canonical names but cannot edit authentication or access fields", () => {
  const service = createPersonProfileService({ repository: createMasterDataRepository() });
  const admin = { ...subject, user_id: "admin", scopes: ["tenant.admin"] };
  assert.equal(service.save({ ...request, actor: admin, administrative: true, patch: { display_name: "Edited", legal_name: "Legal" } }).legal_name, "Legal");
  assert.throws(() => service.save({ ...request, actor: admin, patch: { email: "other@example.test" } }), /PROFILE_FIELD_FORBIDDEN/);
});

test("all repository write paths reject ambiguous account links; unlinked legacy email requires review", () => {
  const repository = createMasterDataRepository();
  const service = createPersonProfileService({ repository });
  const person = service.save(request);
  for (const method of ["create", "upsert", "seed"]) {
    assert.throws(() => repository[method]({ ...person, person_id: "duplicate" }), /PERSON_ACCOUNT_LINK_CONFLICT/);
  }
  repository.create({ ...person, person_id: "unlinked", account_user_id: null, email: "legacy@example.test" });
  const legacy = { ...subject, user_id: "legacy", email: "legacy@example.test" };
  assert.throws(() => service.save({ ...request, subject: legacy, actor: legacy }), /PROFILE_LINK_REVIEW_REQUIRED/);
});

test("audit failure rolls back initial Person and Entity creation", () => {
  const repository = createMasterDataRepository();
  const failing = { ...repository, appendAudit() { throw new Error("audit unavailable"); } };
  const service = createPersonProfileService({ repository: failing });
  assert.throws(() => service.save(request), /audit unavailable/);
  assert.equal(repository.list().length, 0);
  assert.equal(repository.getIdempotency({ tenant_id: subject.tenant_id, idempotency_key: "profile:user_one:save-1" }), undefined);
});

test("failed photo metadata commit preserves the old version and retry converges", async () => {
  const repository = createMasterDataRepository();
  let failAudit = false;
  const service = createPersonProfileService({ repository: { ...repository, appendAudit(event) {
    if (failAudit) throw new Error("audit unavailable");
    return repository.appendAudit(event);
  } }, photoStorage: createPersonPhotoStorage({ storage: createLocalStorageAdapter() }) });
  service.save(request);
  const upload = { subject, actor: subject, bytes: Buffer.from(SYNTHETIC_PROFILE_PNG_BASE64, "base64"), content_type: "image/png", idempotency_key: "photo-one" };
  const first = await service.savePhoto(upload);
  const replacement = { ...upload, bytes: Buffer.concat([upload.bytes, Buffer.from("synthetic")]), idempotency_key: "photo-two" };
  failAudit = true;
  await assert.rejects(service.savePhoto(replacement), /audit unavailable/);
  assert.deepEqual(service.read({ subject, actor: subject }).profile_photo, first.profile_photo);
  failAudit = false;
  const second = await service.savePhoto(replacement);
  assert.notEqual(second.profile_photo.sha256, first.profile_photo.sha256);
  assert.deepEqual((await service.savePhoto(replacement)).profile_photo, second.profile_photo);
  await assert.rejects(service.savePhoto({ ...replacement, bytes: upload.bytes }), /PROFILE_IDEMPOTENCY_CONFLICT/);
  await assert.rejects(service.savePhoto({ ...upload, actor: { ...subject, user_id: "other" } }), /PROFILE_PERMISSION_DENIED/);
});
