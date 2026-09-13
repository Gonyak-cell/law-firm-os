import { createHash, randomUUID } from "node:crypto";
import { createExternalUser } from "../../../packages/client-portal/src/external-user-service.js";

const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/u;
const ADMIN_SCOPES = new Set(["security.admin", "tenant.admin"]);
const ADMIN_ROLES = new Set(["security_admin", "system_super_admin", "lawos_admin"]);

function failure(code, status = 422) {
  return Object.assign(new Error(code), { safe_error_code: code, status });
}

function admin(actor) {
  return (actor?.scopes ?? []).some(scope => ADMIN_SCOPES.has(scope)) || (actor?.role_ids ?? []).some(role => ADMIN_ROLES.has(role));
}

function cleanText(value, field, { required = false, max = 254 } = {}) {
  if (value == null || value === "") {
    if (required) throw failure(`ONBOARDING_${field.toUpperCase()}_REQUIRED`);
    return "";
  }
  if (typeof value !== "string" || value.length > max || /[\u0000-\u001f]/u.test(value)) throw failure("ONBOARDING_INPUT_INVALID");
  const result = value.trim();
  if (required && !result) throw failure(`ONBOARDING_${field.toUpperCase()}_REQUIRED`);
  return result;
}

function professionalProfile(value) {
  if (value == null) return null;
  if (typeof value !== "object" || Array.isArray(value)) throw failure("ONBOARDING_INPUT_INVALID");
  const allowed = new Set(["bio", "experience", "education", "qualifications", "practice_areas"]);
  if (Object.keys(value).some(key => !allowed.has(key))) throw failure("ONBOARDING_FIELD_FORBIDDEN", 403);
  const result = {};
  for (const [key, item] of Object.entries(value)) {
    if (key === "bio") result.bio = cleanText(item, "professional_profile", { max: 4000 });
    else {
      if (!Array.isArray(item) || item.length > 50) throw failure("ONBOARDING_INPUT_INVALID");
      result[key] = item.map(entry => cleanText(entry, "professional_profile", { max: 500 }));
    }
  }
  return result;
}

function normalize(input = {}, actor) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw failure("ONBOARDING_INPUT_INVALID");
  if (Object.hasOwn(input, "tenant_id") && input.tenant_id !== actor.tenant_id) throw failure("ONBOARDING_TENANT_DENIED", 403);
  const allowed = new Set(["type", "email", "display_name", "legal_name", "english_name", "mobile_phone", "contact_email",
    "professional_profile", "employment_type", "title", "org_unit_id", "effective_from", "client_group_id", "actor_id"]);
  if (input.actor_id && input.actor_id !== actor.user_id) throw failure("ONBOARDING_PERMISSION_DENIED", 403);
  if (Object.keys(input).some(key => !allowed.has(key))) throw failure("ONBOARDING_FIELD_FORBIDDEN", 403);
  if (!["internal", "external"].includes(input.type)) throw failure("ONBOARDING_TYPE_INVALID");
  const email = cleanText(input.email, "email", { required: true }).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email)) throw failure("ONBOARDING_EMAIL_INVALID");
  const shared = {
    type: input.type, email, display_name: cleanText(input.display_name, "display_name", { required: true }),
    legal_name: cleanText(input.legal_name, "legal_name"), english_name: cleanText(input.english_name, "english_name"),
    mobile_phone: cleanText(input.mobile_phone, "mobile_phone", { max: 80 }), contact_email: cleanText(input.contact_email, "contact_email"),
    professional_profile: professionalProfile(input.professional_profile),
  };
  if (input.type === "internal") return { ...shared,
    employment_type: cleanText(input.employment_type || "full_time", "employment_type", { required: true }),
    title: cleanText(input.title, "title"), org_unit_id: cleanText(input.org_unit_id, "org_unit_id"),
    effective_from: cleanText(input.effective_from, "effective_from", { required: true }) };
  return { ...shared, client_group_id: cleanText(input.client_group_id, "client_group_id", { required: true }) };
}

function stableIds(tenantId, email) {
  const suffix = createHash("sha256").update(JSON.stringify([tenantId, email])).digest("hex");
  return Object.freeze({ user_id: `user_person_${suffix.slice(0, 32)}`, entity_id: `entity_person_${suffix}`,
    person_id: `person_profile_${suffix}`, employee_id: `employee_person_${suffix.slice(0, 32)}`,
    profile_id: `employment_person_${suffix.slice(0, 32)}`, link_id: `employee_user_person_${suffix.slice(0, 32)}`,
    external_user_id: `external_user_person_${suffix.slice(0, 32)}` });
}

export function createPersonOnboardingService({ masterRepository, hrxRepository, portalRepository, identityGateway } = {}) {
  if (!masterRepository || !hrxRepository || !portalRepository || !identityGateway) throw new TypeError("person onboarding repositories and identity gateway are required");

  async function onboard({ actor, input, idempotency_key } = {}) {
    if (!admin(actor) || !SAFE_ID.test(actor?.user_id ?? "") || !SAFE_ID.test(actor?.tenant_id ?? "")) throw failure("ONBOARDING_PERMISSION_DENIED", 403);
    if (!SAFE_ID.test(idempotency_key ?? "")) throw failure("ONBOARDING_IDEMPOTENCY_KEY_REQUIRED");
    const normalized = normalize(input, actor);
    const fingerprint = createHash("sha256").update(JSON.stringify(normalized)).digest("hex");
    const persistenceKey = `person-onboarding:${idempotency_key}`;
    const replay = masterRepository.getIdempotency({ tenant_id: actor.tenant_id, idempotency_key: persistenceKey });
    if (replay) {
      if (replay.request_fingerprint !== fingerprint) throw failure("ONBOARDING_IDEMPOTENCY_CONFLICT", 409);
      return Object.freeze({ ...replay.response, idempotent_replay: true,
        invitation: Object.freeze({ ...replay.response.invitation, setup_url: null, token_material_returned: false }) });
    }
    const ids = stableIds(actor.tenant_id, normalized.email);
    const people = masterRepository.list({ tenant_id: actor.tenant_id, model_type: "Person" });
    if (people.some(person => person.account_user_id === ids.user_id || person.email?.toLowerCase() === normalized.email)) throw failure("ONBOARDING_IDENTITY_CONFLICT", 409);
    if (await identityGateway.findByEmail({ tenant_id: actor.tenant_id, email: normalized.email })
      || await identityGateway.findByUserId({ tenant_id: actor.tenant_id, user_id: ids.user_id })) throw failure("ONBOARDING_IDENTITY_CONFLICT", 409);
    if (hrxRepository.listEmployeeUserLinks({ tenant_id: actor.tenant_id, user_id: ids.user_id }).length
      || portalRepository.list({ tenant_id: actor.tenant_id, model_type: "ExternalUser" }).some(row => row.user_id === ids.user_id || row.person_id === ids.person_id)) {
      throw failure("ONBOARDING_ROLE_CONFLICT", 409);
    }
    if (normalized.type === "external") {
      const group = masterRepository.get({ tenant_id: actor.tenant_id, model_type: "ClientGroup", id: normalized.client_group_id });
      if (!group || group.status !== "active") throw failure("ONBOARDING_CLIENT_GROUP_NOT_FOUND", 404);
    }
    const created = { master: false, role: false, identity: false };
    const portalKey = `person-onboarding-role:${idempotency_key}`;
    try {
      masterRepository.transaction(tx => {
        const base = { tenant_id: actor.tenant_id, status: "active", owner_user_id: actor.user_id, display_name: normalized.display_name, synthetic_only: true };
        tx.create({ ...base, model_type: "Entity", entity_id: ids.entity_id, entity_kind: "person", identity_key: `person-onboarding-entity:${ids.user_id}` });
        tx.create({ ...base, model_type: "Person", person_id: ids.person_id, entity_id: ids.entity_id, account_user_id: ids.user_id,
          identity_key: `person-onboarding-person:${ids.user_id}`, canonical_display_name: normalized.display_name,
          legal_name: normalized.legal_name || normalized.display_name, english_name: normalized.english_name,
          email: normalized.email, mobile_phone: normalized.mobile_phone, contact_email: normalized.contact_email,
          professional_profile: normalized.professional_profile });
        created.master = true;
      });
      if (normalized.type === "internal") {
        hrxRepository.transaction(tx => {
          tx.createEmployee({ tenant_id: actor.tenant_id, employee_id: ids.employee_id, person_id: ids.person_id,
            display_name: "Canonical Person", status: "onboarding", source_ref: "canonical-person-onboarding" });
          tx.createEmploymentProfile({ tenant_id: actor.tenant_id, profile_id: ids.profile_id, employee_id: ids.employee_id,
            person_id: ids.person_id, employment_type: normalized.employment_type, status: "active", title: normalized.title || null,
            org_unit_id: normalized.org_unit_id || null, effective_from: normalized.effective_from, source_ref: "canonical-person-onboarding" });
          tx.createEmployeeUserLink({ tenant_id: actor.tenant_id, link_id: ids.link_id, employee_id: ids.employee_id,
            user_id: ids.user_id, purpose: "login_mapping", source_ref: "canonical-person-onboarding" });
        });
      } else {
        createExternalUser({ repository: portalRepository, external_user: { tenant_id: actor.tenant_id,
          external_user_id: ids.external_user_id, person_id: ids.person_id, user_id: ids.user_id,
          email: normalized.email, display_name: normalized.display_name, client_group_id: normalized.client_group_id,
          status: "invited", source_ref: "canonical-person-onboarding" }, actor_id: actor.user_id, idempotency_key: portalKey });
      }
      created.role = true;
      const personReadback = masterRepository.get({ tenant_id: actor.tenant_id, model_type: "Person", id: ids.person_id });
      const roleReadback = normalized.type === "internal"
        ? hrxRepository.getEmployeeUserLink({ tenant_id: actor.tenant_id, link_id: ids.link_id })
        : portalRepository.get({ tenant_id: actor.tenant_id, model_type: "ExternalUser", id: ids.external_user_id });
      if (personReadback?.account_user_id !== ids.user_id || personReadback?.person_id !== ids.person_id
        || roleReadback?.user_id !== ids.user_id || (normalized.type === "external" && roleReadback?.person_id !== ids.person_id)) {
        throw failure("ONBOARDING_READBACK_FAILED", 503);
      }
      const role = normalized.type === "internal"
        ? { role_ids: ["lawos_staff"], scopes: ["profile:read"], hrx_scopes: ["hrx.employee.self.read"] }
        : { role_ids: ["external_user"], scopes: ["profile:read"], hrx_scopes: [] };
      const issued = await identityGateway.provisionInvitation({ tenant_id: actor.tenant_id, user_id: ids.user_id,
        email: normalized.email, display_name: normalized.display_name, person_role: normalized.type, actor_id: actor.user_id, ...role });
      created.identity = true;
      if (issued?.user?.user_id !== ids.user_id || issued.user.tenant_id !== actor.tenant_id) throw failure("ONBOARDING_READBACK_FAILED", 503);
      const safeInvitation = Object.freeze({ setup_url: null, expires_at: issued.expires_at, token_material_returned: false,
        local_test_mailbox_only: true });
      const response = Object.freeze({ outcome: "created", idempotent_replay: false, user: Object.freeze({ user_id: ids.user_id,
        email: normalized.email, status: "invited" }), person: Object.freeze({ person_id: ids.person_id }),
        role_extension: Object.freeze(normalized.type === "internal" ? { type: "internal", employee_id: ids.employee_id, employment_profile_id: ids.profile_id }
          : { type: "external", external_user_id: ids.external_user_id, client_group_id: normalized.client_group_id }),
        access: Object.freeze({ matter_access: normalized.type === "external" ? "denied_until_explicit_acl" : "not_applicable",
          next_action: normalized.type === "external" ? "Grant explicit Matter access separately." : null }), invitation: safeInvitation,
        production_ready_claim: false });
      masterRepository.transaction(tx => {
        tx.appendAudit({ event_id: `person_onboarding_${randomUUID()}`, tenant_id: actor.tenant_id, actor_id: actor.user_id,
          action: "person.onboarding.create", object_type: "Person", object_id: ids.person_id, outcome: "passed",
          role_type: normalized.type, changed_fields: ["account_user_id", "person_id", "role_extension"] });
        tx.recordIdempotency({ tenant_id: actor.tenant_id, idempotency_key: persistenceKey,
          operation: "person.onboarding.create", request_fingerprint: fingerprint, response });
      });
      return Object.freeze({ ...response, invitation: Object.freeze({ ...safeInvitation, setup_url: issued.setup_url,
        token_material_returned: true }) });
    } catch (error) {
      let compensationFailed = false;
      if (created.identity) try { await identityGateway.cancelInvitation({ user_id: ids.user_id }); } catch { compensationFailed = true; }
      if (created.role && normalized.type === "internal") {
        try { hrxRepository.revokeEmployeeUserLink({ tenant_id: actor.tenant_id, link_id: ids.link_id }); } catch { compensationFailed = true; }
        try { hrxRepository.deleteEmploymentProfile({ tenant_id: actor.tenant_id, profile_id: ids.profile_id }); } catch { compensationFailed = true; }
        try { hrxRepository.deleteEmployee({ tenant_id: actor.tenant_id, employee_id: ids.employee_id }); } catch { compensationFailed = true; }
      }
      if (created.role && normalized.type === "external") {
        try { portalRepository.delete({ tenant_id: actor.tenant_id, model_type: "ExternalUser", id: ids.external_user_id }); } catch { compensationFailed = true; }
        try { portalRepository.deleteIdempotency({ tenant_id: actor.tenant_id, idempotency_key: portalKey }); } catch { compensationFailed = true; }
      }
      if (created.master) try { masterRepository.transaction(tx => {
          tx.delete({ tenant_id: actor.tenant_id, model_type: "Person", id: ids.person_id });
          tx.delete({ tenant_id: actor.tenant_id, model_type: "Entity", id: ids.entity_id });
        }); } catch { compensationFailed = true; }
      if (compensationFailed) throw failure("ONBOARDING_RECOVERY_REQUIRED", 503);
      throw error;
    }
  }

  return Object.freeze({ onboard });
}
