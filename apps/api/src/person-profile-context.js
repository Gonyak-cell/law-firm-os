import { randomUUID } from "node:crypto";
import { createPersonProfileService, profileAdmin, profileError } from "../../../packages/master-data/src/person-profile-service.js";
import { createPersonPhotoStorage } from "../../../packages/master-data/src/person-photo-storage.js";

// Local R&D only. Durable PostgreSQL onboarding and cross-domain links are not opened by this slice.
export async function handlePersonProfileRequest({ pathname, method, query = {}, body, bytes, headers = {}, context,
  requestId, repository, storage, portalRepository, hasEmployeeLink = () => false, getSubject, readLegacy, enabled }) {
  const actor = context?.principal;
  const target = pathname.match(/^\/api\/profile\/users\/([A-Za-z0-9][A-Za-z0-9._:-]{0,159})$/u);
  const photoRequest = pathname === "/api/profile/me/photo";
  const administrative = Boolean(target);
  const errorResult = (code, status) => ({ status, body: { request_id: requestId, outcome: "blocked", item: null,
    safe_error_codes: [code], audit_hint_ref: null, ui_state: status === 403 ? "denied" : "error", production_ready_claim: false } });
  try {
    if (!actor?.user_id || !actor.tenant_id || (query.tenant_id && query.tenant_id !== actor.tenant_id)) throw profileError("PROFILE_PERMISSION_DENIED", 403);
    if (pathname !== "/api/profile/me" && !photoRequest && !target) throw profileError("PROFILE_NOT_FOUND", 404);
    if (administrative && !profileAdmin(actor)) throw profileError("PROFILE_PERMISSION_DENIED", 403);
    if (!enabled) {
      if (!administrative && method === "GET") return readLegacy(undefined, photoRequest);
      throw profileError("PROFILE_LOCAL_RD_ONLY", 503);
    }
    if (!(photoRequest ? ["GET", "PUT"] : ["GET", "PATCH"]).includes(method)) throw profileError("PROFILE_METHOD_NOT_ALLOWED", 405);
    const subject = await getSubject({ tenant_id: actor.tenant_id, user_id: target?.[1] ?? actor.user_id });
    if (!subject || subject.tenant_id !== actor.tenant_id || subject.user_id !== (target?.[1] ?? actor.user_id)) throw profileError("PROFILE_NOT_FOUND", 404);
    const external = portalRepository?.list({ tenant_id: actor.tenant_id, model_type: "ExternalUser" })
      .filter(item => item.user_id === subject.user_id) ?? [];
    if (external.length > 1) throw profileError("PROFILE_ROLE_LINK_CONFLICT", 409);
    if (external.length && hasEmployeeLink(subject)) throw profileError("PROFILE_ROLE_LINK_CONFLICT", 409);
    const photoStorage = storage ? {
      storePhoto: input => createPersonPhotoStorage({ storage }).storePhoto(input),
      readPhoto: input => createPersonPhotoStorage({ storage }).readPhoto(input),
    } : null;
    const service = createPersonProfileService({ repository, photoStorage });
    let person = service.read({ subject, actor });
    if (external[0]?.person_id && external[0].person_id !== person?.person_id) throw profileError("PROFILE_ROLE_LINK_CONFLICT", 409);
    // External access identities never fall through to a workforce projection.
    const legacy = external.length ? { status: 200, body: { item: { actor_ref: subject.user_id, tenant_ref: subject.tenant_id,
      display_name: subject.display_name, work_email: subject.email, employee_id: null, professional_profile: null } } }
      : await readLegacy(subject.user_id);
    if (legacy.status !== 200) return legacy;
    if (method === "PATCH") person = service.save({ subject, actor, patch: body, legacy: legacy.body.item,
      administrative, idempotency_key: headers["idempotency-key"] });
    if (method === "PUT") person = await service.savePhoto({ subject, actor, bytes,
      content_type: headers["content-type"], idempotency_key: headers["idempotency-key"] });
    if (photoRequest && method === "GET") {
      if (!person?.profile_photo) {
        if (external.length) throw profileError("PROFILE_PHOTO_NOT_FOUND", 404);
        return readLegacy(subject.user_id, true);
      }
      const photo = await photoStorage.readPhoto({ tenant_id: subject.tenant_id, person_id: person.person_id, photo: person.profile_photo });
      repository.appendAudit({ event_id: `profile_${randomUUID()}`, tenant_id: actor.tenant_id, actor_id: actor.user_id,
        action: "person.photo.read", object_type: "Person", object_id: person.person_id, outcome: "passed" });
      return { status: 200, body: photo.bytes, content_type: photo.content_type, byte_size: photo.byte_size };
    }
    const item = { ...legacy.body.item, work_email: subject.email, person_role: external.length ? "external" : legacy.body.item.employee_id ? "internal" : "person",
      profile_write_enabled: true, person_id: person?.person_id ?? null,
      ...(person ? { display_name: person.display_name, legal_name: person.legal_name, english_name: person.english_name,
        mobile_phone: person.mobile_phone, contact_email: person.contact_email, professional_profile: person.professional_profile } : {}),
      ...(person?.profile_photo ? { photo_url: "/api/profile/me/photo", photo_included: true } : {}) };
    if (administrative) { item.photo_url = null; item.photo_included = false; }
    repository.appendAudit({ event_id: `profile_${randomUUID()}`, tenant_id: actor.tenant_id, actor_id: actor.user_id,
      action: "person.profile.read", object_type: "Person", object_id: person?.person_id ?? subject.user_id, outcome: "passed" });
    return { status: 200, body: { ...legacy.body, request_id: requestId, outcome: "passed", item,
      safe_error_codes: [], audit_hint_ref: null, ui_state: "populated", production_ready_claim: false } };
  } catch (error) {
    if (repository && actor?.tenant_id && actor?.user_id) repository.appendAudit({ event_id: `profile_${randomUUID()}`,
      tenant_id: actor.tenant_id, actor_id: actor.user_id, action: "person.profile.denied", outcome: "blocked" });
    return errorResult(error.safe_error_code ?? "PROFILE_UNAVAILABLE", error.status ?? 503);
  }
}
