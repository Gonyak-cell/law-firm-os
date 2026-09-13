import { createHash, randomUUID } from "node:crypto";
import { assertValidHrxMemberPhotoPng } from "../../hrx/src/member-photo-storage.js";

const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/u;
const SELF_FIELDS = ["english_name", "mobile_phone", "contact_email", "professional_profile"];
const NAME_FIELDS = ["display_name", "legal_name"];
const PROFESSIONAL_FIELDS = ["bio", "experience", "education", "qualifications", "practice_areas"];

export function profileError(code, status = 422) {
  return Object.assign(new Error(code), { status, safe_error_code: code });
}

export function profileAdmin(actor) {
  return (actor?.scopes ?? []).some(scope => ["security.admin", "tenant.admin"].includes(scope))
    || (actor?.role_ids ?? []).some(role => ["security_admin", "system_super_admin", "lawos_admin"].includes(role));
}

function authorize(subject, actor) {
  if (!SAFE_ID.test(subject?.tenant_id ?? "") || !SAFE_ID.test(subject?.user_id ?? "")
      || !SAFE_ID.test(actor?.user_id ?? "") || subject.tenant_id !== actor?.tenant_id
      || (subject.user_id !== actor.user_id && !profileAdmin(actor))) {
    throw profileError("PROFILE_PERMISSION_DENIED", 403);
  }
}

function plain(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    && [Object.prototype, null].includes(Object.getPrototypeOf(value));
}

function text(value, max = 500) {
  if (typeof value !== "string" || value.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(value)) {
    throw profileError("PROFILE_INPUT_INVALID");
  }
  return value.trim();
}

function normalizedPatch(patch, actor, administrative) {
  if (!plain(patch)) throw profileError("PROFILE_INPUT_INVALID");
  const allowed = [...SELF_FIELDS, ...(administrative && profileAdmin(actor) ? NAME_FIELDS : [])];
  const next = {};
  for (const key of Object.keys(patch).sort()) {
    if (!allowed.includes(key)) throw profileError("PROFILE_FIELD_FORBIDDEN", 403);
    if (key === "professional_profile") {
      if (!plain(patch[key])) throw profileError("PROFILE_INPUT_INVALID");
      next[key] = {};
      for (const field of Object.keys(patch[key]).sort()) {
        if (!PROFESSIONAL_FIELDS.includes(field)) throw profileError("PROFILE_FIELD_FORBIDDEN", 403);
        const value = patch[key][field];
        if (field === "bio") next[key][field] = text(value, 4000);
        else {
          if (!Array.isArray(value) || value.length > 50) throw profileError("PROFILE_INPUT_INVALID");
          next[key][field] = value.map(item => text(item));
        }
      }
    } else {
      next[key] = text(patch[key], key === "mobile_phone" ? 80 : 254);
      if (key === "display_name" && !next[key]) throw profileError("PROFILE_INPUT_INVALID");
      if (key === "contact_email" && next[key] && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(next[key])) throw profileError("PROFILE_INPUT_INVALID");
    }
  }
  return next;
}

export function createPersonProfileService({ repository, photoStorage } = {}) {
  function read({ subject, actor }) {
    authorize(subject, actor);
    const people = repository.list({ tenant_id: subject.tenant_id, model_type: "Person" })
      .filter(person => person.account_user_id === subject.user_id);
    if (people.length > 1) throw profileError("PERSON_ACCOUNT_LINK_CONFLICT", 409);
    return people[0] ?? null;
  }

  function ensure(subject, actor, legacy = {}) {
    const existing = read({ subject, actor });
    if (existing) return existing;
    // Email is a review hint, never authority to merge two humans.
    if (subject.email && repository.list({ tenant_id: subject.tenant_id, model_type: "Person" })
      .some(person => person.email?.toLowerCase() === subject.email.toLowerCase())) {
      throw profileError("PROFILE_LINK_REVIEW_REQUIRED", 409);
    }
    const suffix = createHash("sha256").update(JSON.stringify([subject.tenant_id, subject.user_id])).digest("hex");
    const entity_id = `entity_profile_${suffix}`;
    const person_id = `person_profile_${suffix}`;
    const display_name = text(legacy.display_name || subject.display_name || subject.user_id, 254);
    const base = { tenant_id: subject.tenant_id, status: "active", owner_user_id: actor.user_id, display_name };
    repository.create({ ...base, model_type: "Entity", entity_id, entity_kind: "person", identity_key: `profile-entity:${subject.user_id}` });
    return repository.create({ ...base, model_type: "Person", person_id, entity_id,
      account_user_id: subject.user_id, identity_key: `profile-person:${subject.user_id}`,
      legal_name: legacy.legal_name ?? display_name, english_name: legacy.english_name ?? "",
      email: subject.email ?? null, mobile_phone: legacy.mobile_phone ?? "",
      professional_profile: legacy.professional_profile ?? null });
  }

  function save({ subject, actor, patch, idempotency_key, legacy, administrative = false }) {
    authorize(subject, actor);
    const next = normalizedPatch(patch, actor, administrative);
    if (!SAFE_ID.test(idempotency_key ?? "")) throw profileError("PROFILE_IDEMPOTENCY_KEY_REQUIRED");
    const key = `profile:${subject.user_id}:${idempotency_key}`;
    const fingerprint = createHash("sha256").update(JSON.stringify({ actor_id: actor.user_id, next })).digest("hex");
    return repository.transaction(() => {
      const replay = repository.getIdempotency({ tenant_id: subject.tenant_id, idempotency_key: key });
      if (replay) {
        if (replay.request_fingerprint !== fingerprint) throw profileError("PROFILE_IDEMPOTENCY_CONFLICT", 409);
        return read({ subject, actor });
      }
      const person = ensure(subject, actor, legacy);
      repository.update({ tenant_id: subject.tenant_id, model_type: "Person", id: person.person_id }, {
        ...next,
        ...(next.display_name ? { canonical_display_name: next.display_name } : {}),
        ...(next.professional_profile ? { professional_profile: { ...person.professional_profile, ...next.professional_profile } } : {}),
      });
      repository.appendAudit({ event_id: `profile_${randomUUID()}`, tenant_id: subject.tenant_id,
        actor_id: actor.user_id, action: "person.profile.update", object_type: "Person", object_id: person.person_id,
        changed_fields: Object.keys(next), outcome: "passed" });
      repository.recordIdempotency({ tenant_id: subject.tenant_id, idempotency_key: key,
        operation: "person.profile.update", request_fingerprint: fingerprint, response: { person_id: person.person_id } });
      return read({ subject, actor });
    });
  }

  async function savePhoto({ subject, actor, bytes, content_type, idempotency_key }) {
    const person = read({ subject, actor });
    if (!person) throw profileError("PROFILE_SAVE_BEFORE_PHOTO", 409);
    if (!photoStorage) throw profileError("PROFILE_PHOTO_UNAVAILABLE", 503);
    if (!SAFE_ID.test(idempotency_key ?? "")) throw profileError("PROFILE_IDEMPOTENCY_KEY_REQUIRED");
    if (content_type !== "image/png" || !Buffer.isBuffer(bytes)) throw profileError("PROFILE_PHOTO_INVALID");
    const key = `profile-photo:${subject.user_id}:${idempotency_key}`;
    const fingerprint = createHash("sha256").update(actor.user_id).update(bytes).digest("hex");
    const replay = () => {
      const entry = repository.getIdempotency({ tenant_id: subject.tenant_id, idempotency_key: key });
      if (entry && entry.request_fingerprint !== fingerprint) throw profileError("PROFILE_IDEMPOTENCY_CONFLICT", 409);
      return entry;
    };
    // Validate even replays, before any storage or metadata change.
    assertValidHrxMemberPhotoPng(bytes);
    if (replay()) return read({ subject, actor });
    const scope = { tenant_id: subject.tenant_id, person_id: person.person_id };
    const photo = await photoStorage.storePhoto({ ...scope, bytes, content_type, idempotency_key });
    await photoStorage.readPhoto({ ...scope, photo });
    // The immutable object may remain unreferenced if this transaction fails. The previous photo stays authoritative.
    return repository.transaction(() => {
      if (replay()) return read({ subject, actor });
      repository.update({ tenant_id: subject.tenant_id, model_type: "Person", id: person.person_id }, { profile_photo: photo });
      repository.appendAudit({ event_id: `profile_${randomUUID()}`, tenant_id: subject.tenant_id, actor_id: actor.user_id,
        action: "person.photo.replace", object_type: "Person", object_id: person.person_id, outcome: "passed" });
      repository.recordIdempotency({ tenant_id: subject.tenant_id, idempotency_key: key,
        operation: "person.photo.replace", request_fingerprint: fingerprint, response: { person_id: person.person_id } });
      return read({ subject, actor });
    });
  }

  return Object.freeze({ read, save, savePhoto });
}
