import { createHash } from "node:crypto";

import { createPartyAliasService } from "./alias-service.js";
import { createCrmCanonicalWriteService } from "./crm-canonical-write-service.js";
import { createClientGroupService } from "./client-group-service.js";
import { createContactPointService } from "./contact-point-service.js";
import { createMasterDataDuplicateService } from "./duplicate-service.js";
import { createPartyIdentifierService } from "./identifier-service.js";

const CLIENT_TYPES = Object.freeze(["person", "organization"]);
const DUPLICATE_MODEL_TYPES = Object.freeze(["Party", "Entity", "Person", "Organization"]);
const REGISTRATION_IDENTIFIER_TYPES = Object.freeze(["business_number", "registration_id"]);
const REGISTRATION_OPERATION = "master_data.client_registration.create";

export const CLIENT_REGISTRATION_ERROR_CODES = Object.freeze({
  invalid_input: "MASTER_DATA_CLIENT_REGISTRATION_INVALID_INPUT",
  review_digest_mismatch: "MASTER_DATA_CLIENT_REGISTRATION_REVIEW_DIGEST_MISMATCH",
  distinct_confirmation_required: "MASTER_DATA_CLIENT_REGISTRATION_DISTINCT_CONFIRMATION_REQUIRED",
  unlinked_duplicate: "MASTER_DATA_CLIENT_REGISTRATION_UNLINKED_DUPLICATE",
  identifier_conflict: "MASTER_DATA_CLIENT_REGISTRATION_IDENTIFIER_CONFLICT",
  idempotency_conflict: "MASTER_DATA_CLIENT_REGISTRATION_IDEMPOTENCY_CONFLICT",
});

function commandError(code, message, status = 409) {
  return Object.assign(new Error(message), {
    safe_error_code: code,
    status,
  });
}

function requiredString(input, field, maxLength = 500) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "" || value.trim().length > maxLength) {
    throw new TypeError(`${field} is required`);
  }
  return value.trim();
}

function optionalString(input, field, maxLength = 500) {
  const value = input?.[field];
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || value.trim().length > maxLength) {
    throw new TypeError(`${field} must be a string`);
  }
  return value.trim();
}

function normalizeText(value) {
  return String(value ?? "").normalize("NFKC").trim().toLowerCase();
}

function normalizeIdentifier(value) {
  return normalizeText(value).replace(/[^0-9a-z가-힣]/gu, "");
}

function sameOrSimilarName(left, right) {
  const normalizedLeft = normalizeText(left);
  const normalizedRight = normalizeText(right);
  if (!normalizedLeft || !normalizedRight) return null;
  if (normalizedLeft === normalizedRight) return "exact_display_name";
  if (normalizedLeft.includes(normalizedRight) || normalizedRight.includes(normalizedLeft)) {
    return "similar_display_name";
  }
  return null;
}

function digestPayload(input) {
  return {
    tenant_id: input.tenant_id,
    client_type: input.client_type,
    display_name: input.display_name,
    legal_form: input.legal_form,
    registration_number: input.registration_number,
    email: input.email,
    phone: input.phone,
    depositor_alias: input.depositor_alias,
  };
}

function normalizePermissionProof(proof) {
  if (!proof || typeof proof !== "object" || Array.isArray(proof)) return null;
  const visibleCandidates = Array.isArray(proof.visible_candidate_snapshot)
    ? proof.visible_candidate_snapshot
      .filter((candidate) => candidate && typeof candidate === "object")
      .map((candidate) => ({
        client_group_id: String(candidate.client_group_id ?? "").trim(),
        display_name: String(candidate.display_name ?? "").trim(),
        client_type: String(candidate.client_type ?? "").trim(),
        reason_codes: [...new Set(
          (candidate.reason_codes ?? candidate.reasons ?? [])
            .filter((reason) => typeof reason === "string" && reason.trim() !== "")
            .map((reason) => reason.trim()),
        )].sort(),
      }))
      .filter((candidate) => candidate.client_group_id !== "")
      .sort((left, right) => left.client_group_id.localeCompare(right.client_group_id))
    : [];
  return {
    principal_id: String(proof.principal_id ?? "").trim(),
    principal_tenant_id: String(proof.principal_tenant_id ?? "").trim(),
    role_ids: [...new Set(
      (proof.role_ids ?? [])
        .filter((roleId) => typeof roleId === "string" && roleId.trim() !== "")
        .map((roleId) => roleId.trim()),
    )].sort(),
    permission_action: String(proof.permission_action ?? "").trim(),
    permission_decision: String(proof.permission_decision ?? "").trim(),
    route_action: String(proof.route_action ?? "").trim(),
    route_effect: String(proof.route_effect ?? "").trim(),
    route_reason: String(proof.route_reason ?? "").trim(),
    route_rule_id: String(proof.route_rule_id ?? "").trim(),
    hidden_candidate_presence: proof.hidden_candidate_presence === true,
    visible_candidate_snapshot: visibleCandidates,
    permission_context_fingerprint: String(proof.permission_context_fingerprint ?? "").trim(),
  };
}

function reviewDigest(input, duplicateSnapshot = {}, permissionProof = null) {
  const normalizedPermissionProof = normalizePermissionProof(permissionProof);
  return createHash("sha256")
    .update(JSON.stringify({
      ...digestPayload(input),
      duplicate_snapshot: normalizedPermissionProof
        ? {
            visible_candidates: normalizedPermissionProof.visible_candidate_snapshot,
            hidden_candidate_presence: normalizedPermissionProof.hidden_candidate_presence,
          }
        : duplicateSnapshot,
      permission_proof: normalizedPermissionProof,
    }))
    .digest("hex");
}

function requestFingerprint(input) {
  return createHash("sha256")
    .update(JSON.stringify({
      ...digestPayload(input),
      actor_id: input.actor_id,
      permission_ref: input.permission_ref,
      audit_hint_ref: input.audit_hint_ref,
    }))
    .digest("hex");
}

function keyDigest(tenantId, idempotencyKey) {
  return createHash("sha256")
    .update(`${tenantId}:${idempotencyKey}`)
    .digest("hex")
    .slice(0, 32);
}

function resolveContext(input, defaults = {}) {
  const suppliedTenant = input?.tenant_id;
  const suppliedActor = input?.actor_id;
  const tenantId = requiredString(
    { tenant_id: suppliedTenant ?? defaults.tenant_id },
    "tenant_id",
    200,
  );
  const actorId = requiredString(
    { actor_id: suppliedActor ?? defaults.actor_id },
    "actor_id",
    200,
  );
  if (defaults.tenant_id && suppliedTenant && tenantId !== defaults.tenant_id) {
    throw commandError(CLIENT_REGISTRATION_ERROR_CODES.invalid_input, "tenant_id does not match the trusted registration scope", 400);
  }
  if (defaults.actor_id && suppliedActor && actorId !== defaults.actor_id) {
    throw commandError(CLIENT_REGISTRATION_ERROR_CODES.invalid_input, "actor_id does not match the trusted registration actor", 400);
  }
  return { tenant_id: tenantId, actor_id: actorId };
}

function normalizeRegistrationInput(input = {}, defaults = {}) {
  const context = resolveContext(input, defaults);
  const clientType = requiredString(input, "client_type", 32);
  if (!CLIENT_TYPES.includes(clientType)) {
    throw commandError(CLIENT_REGISTRATION_ERROR_CODES.invalid_input, "client_type must be person or organization", 400);
  }
  const displayName = requiredString(input, "display_name");
  const legalForm = optionalString(input, "legal_form", 200);
  const registrationNumber = optionalString(input, "registration_number", 200);
  const email = optionalString(input, "email", 320);
  const phone = optionalString(input, "phone", 100);
  const depositorAlias = optionalString(input, "depositor_alias", 500);
  const permissionRef = optionalString(input, "permission_ref", 500);
  const auditHintRef = optionalString(input, "audit_hint_ref", 500);
  if (clientType === "person" && (legalForm !== null || registrationNumber !== null)) {
    throw commandError(CLIENT_REGISTRATION_ERROR_CODES.invalid_input, "legal_form and registration_number are organization-only", 400);
  }
  if (clientType === "organization" && legalForm === null) {
    throw commandError(CLIENT_REGISTRATION_ERROR_CODES.invalid_input, "legal_form is required for organizations", 400);
  }
  if (clientType === "organization" && (email !== null || phone !== null)) {
    throw commandError(CLIENT_REGISTRATION_ERROR_CODES.invalid_input, "email and phone are person-only", 400);
  }
  return Object.freeze({
    ...context,
    client_type: clientType,
    display_name: displayName,
    legal_form: legalForm,
    registration_number: registrationNumber,
    email,
    phone,
    depositor_alias: depositorAlias,
    permission_ref: permissionRef,
    audit_hint_ref: auditHintRef,
    permission_proof: input.permission_proof ?? null,
  });
}

function modelPrimaryId(record) {
  return record?.party_id
    ?? record?.entity_id
    ?? record?.person_id
    ?? record?.organization_id
    ?? record?.id
    ?? null;
}

function recordClientGroupIds(record, groups) {
  const result = new Set();
  const add = (value) => {
    if (typeof value === "string" && value.trim() !== "") result.add(value);
  };
  add(record?.client_group_id);
  add(record?.canonical_client_group_id);
  for (const group of groups) {
    if (group.primary_entity_id === record?.entity_id || group.primary_party_id === record?.party_id) add(group.client_group_id);
    if ((group.member_entity_ids ?? []).includes(record?.entity_id)) add(group.client_group_id);
    if ((group.member_party_ids ?? []).includes(record?.party_id)) add(group.client_group_id);
  }
  return result;
}

function inferClientType(group, repository, tenantId, fallback) {
  if (CLIENT_TYPES.includes(group?.client_type)) return group.client_type;
  const partyIds = [group?.primary_party_id, ...(group?.member_party_ids ?? [])].filter(Boolean);
  for (const partyId of partyIds) {
    const party = repository.get({ tenant_id: tenantId, model_type: "Party", id: partyId });
    if (CLIENT_TYPES.includes(party?.party_type)) return party.party_type;
  }
  const entityIds = [group?.primary_entity_id, ...(group?.member_entity_ids ?? [])].filter(Boolean);
  for (const entityId of entityIds) {
    const entity = repository.get({ tenant_id: tenantId, model_type: "Entity", id: entityId });
    if (entity?.entity_kind === "person") return "person";
    if (entity?.entity_kind === "organization") return "organization";
  }
  return fallback;
}

function findIdentifierConflicts(repository, tenantId, registrationNumber) {
  if (!registrationNumber) return Object.freeze([]);
  const normalized = normalizeIdentifier(registrationNumber);
  const organizationConflicts = repository
    .list({ tenant_id: tenantId, model_type: "Organization" })
    .filter((record) => normalizeIdentifier(record.registration_number) === normalized)
    .map((record) => ({ model_type: "Organization", id: modelPrimaryId(record) }));
  const identifierConflicts = repository
    .list({ tenant_id: tenantId, model_type: "PartyIdentifier" })
    .filter((record) => REGISTRATION_IDENTIFIER_TYPES.includes(record.identifier_type))
    .filter((record) => normalizeIdentifier(record.identifier_value) === normalized)
    .map((record) => ({ model_type: "PartyIdentifier", id: record.party_identifier_id }));
  return Object.freeze([...organizationConflicts, ...identifierConflicts]);
}

function buildReview(repository, duplicateService, input, permissionProof = null) {
  const groups = repository.list({ tenant_id: input.tenant_id, model_type: "ClientGroup" });
  const duplicateCandidates = duplicateService.findCandidates({
    tenant_id: input.tenant_id,
    display_name: input.display_name,
    identifier_type: input.client_type === "organization" ? "business_number" : undefined,
    identifier_value: input.registration_number,
  });
  const nameRecords = duplicateCandidates.name_candidates.filter((record) => DUPLICATE_MODEL_TYPES.includes(record.model_type));
  const visibleGroups = new Map();
  const unlinkedRecords = [];

  const addVisibleGroup = (group, reason, record) => {
    if (!group || typeof group.client_group_id !== "string") return;
    const existing = visibleGroups.get(group.client_group_id) ?? {
      group,
      reasons: new Set(),
      recordModels: new Set(),
    };
    if (reason) {
      existing.reasons.add(reason);
    }
    if (record?.model_type) existing.recordModels.add(record.model_type);
    visibleGroups.set(group.client_group_id, existing);
  };

  for (const group of groups) {
    const nameReason = sameOrSimilarName(group.display_name, input.display_name);
    if (nameReason) addVisibleGroup(group, nameReason);
  }

  for (const record of nameRecords) {
    const linkedGroupIds = recordClientGroupIds(record, groups);
    if (linkedGroupIds.size === 0) {
      unlinkedRecords.push(record);
      continue;
    }
    const nameReason = sameOrSimilarName(record.display_name, input.display_name);
    for (const groupId of linkedGroupIds) {
      const group = groups.find((candidate) => candidate.client_group_id === groupId);
      addVisibleGroup(group, nameReason, record);
    }
  }

  const exactIdentifierConflicts = findIdentifierConflicts(repository, input.tenant_id, input.registration_number);
  for (const conflict of exactIdentifierConflicts) {
    const record = repository.get({ tenant_id: input.tenant_id, model_type: conflict.model_type, id: conflict.id });
    if (!record) continue;
    for (const groupId of recordClientGroupIds(record, groups)) {
      const group = groups.find((candidate) => candidate.client_group_id === groupId);
      addVisibleGroup(group, "exact_identifier_conflict", record);
    }
  }

  const clientGroupCandidates = [...visibleGroups.values()]
    .sort((left, right) => String(left.group.client_group_id).localeCompare(String(right.group.client_group_id)))
    .map(({ group, reasons, recordModels }) => {
      for (const modelType of recordModels) reasons.add(`linked_${modelType.toLowerCase()}`);
      const safeReasons = [...reasons].sort();
      return Object.freeze({
        client_group_id: group.client_group_id,
        display_name: String(group.display_name ?? "").trim(),
        client_type: inferClientType(group, repository, input.tenant_id, input.client_type),
        reason_codes: Object.freeze(safeReasons),
      });
    });
  const unmatchedModelTypes = [...new Set(unlinkedRecords.map((record) => record.model_type))].sort();
  const topReasonCodes = [];
  if (clientGroupCandidates.length > 0) topReasonCodes.push("visible_name_candidate");
  if (unlinkedRecords.length > 0) topReasonCodes.push("unlinked_duplicate_candidate");
  if (exactIdentifierConflicts.length > 0) {
    topReasonCodes.push("exact_identifier_conflict", "exact_registration_number_conflict");
  }
  const duplicateSnapshot = {
    visible_candidates: clientGroupCandidates.map((candidate) => ({
      client_group_id: candidate.client_group_id,
      display_name: candidate.display_name,
      client_type: candidate.client_type,
      reason_codes: [...candidate.reason_codes],
    })),
    unlinked_candidates: unlinkedRecords
      .map((record) => `${record.model_type}:${modelPrimaryId(record) ?? ""}`)
      .sort(),
    identifier_conflicts: exactIdentifierConflicts
      .map((conflict) => `${conflict.model_type}:${conflict.id ?? ""}`)
      .sort(),
  };
  return Object.freeze({
    outcome: "reviewed",
    review_digest: reviewDigest(input, duplicateSnapshot, permissionProof),
    client_type: input.client_type,
    client_group_candidates: Object.freeze(clientGroupCandidates),
    visible_candidates: Object.freeze(clientGroupCandidates),
    has_visible_name_candidates: clientGroupCandidates.length > 0,
    has_unmatched_duplicate_candidates: unlinkedRecords.length > 0,
    unmatched_duplicate_candidate_count: unlinkedRecords.length,
    unmatched_duplicate_candidate_model_types: Object.freeze(unmatchedModelTypes),
    has_exact_identifier_conflict: exactIdentifierConflicts.length > 0,
    exact_identifier_conflict_count: exactIdentifierConflicts.length,
    reason_codes: Object.freeze(topReasonCodes),
    review_required: clientGroupCandidates.length > 0 || unlinkedRecords.length > 0 || exactIdentifierConflicts.length > 0,
    blocked: unlinkedRecords.length > 0 || exactIdentifierConflicts.length > 0,
    idempotent_replay: false,
  });
}

function publicReview(review) {
  return Object.freeze({ ...review });
}

function deterministicRecordIds(tenantId, idempotencyKey) {
  const suffix = keyDigest(tenantId, idempotencyKey);
  return Object.freeze({
    account_id: `client_registration_${suffix}`,
    contact_id: `client_registration_${suffix}`,
    party_id: `party_client_registration_${suffix}`,
    entity_id: `entity_client_registration_${suffix}`,
    person_id: `person_client_registration_${suffix}`,
    organization_id: `organization_client_registration_${suffix}`,
    client_group_id: `client_group_client_registration_${suffix}`,
    email_contact_point_id: `contact_point_email_client_registration_${suffix}`,
    phone_contact_point_id: `contact_point_phone_client_registration_${suffix}`,
    party_identifier_id: `party_identifier_client_registration_${suffix}`,
    party_alias_id: `party_alias_client_registration_${suffix}`,
  });
}

function safeCreateSummary({ input, graph, clientGroup, identifier, alias, auditEvent, digest, idempotentReplay = false }) {
  const typeRecord = input.client_type === "organization" ? graph.organization : graph.person;
  return Object.freeze({
    outcome: idempotentReplay ? "idempotent_replay" : "created",
    idempotent_replay: idempotentReplay,
    client_group_id: clientGroup.client_group_id,
    display_name: clientGroup.display_name,
    client_type: input.client_type,
    depositor_alias_saved: Boolean(alias),
    registration_number_saved: Boolean(identifier),
    contact_saved: input.client_type === "person" && Boolean(input.email || input.phone),
    review_digest: digest,
    canonical_record_ids: Object.freeze({
      party_id: graph.party.party_id,
      entity_id: graph.entity.entity_id,
      person_id: input.client_type === "person" ? typeRecord.person_id : null,
      organization_id: input.client_type === "organization" ? typeRecord.organization_id : null,
      client_group_id: clientGroup.client_group_id,
      party_identifier_id: identifier?.party_identifier_id ?? null,
      party_alias_id: alias?.party_alias_id ?? null,
    }),
    primary_party_id: clientGroup.primary_party_id,
    primary_entity_id: clientGroup.primary_entity_id,
    audit_event_id: auditEvent?.event_id ?? null,
  });
}

export function createClientRegistrationService({ repository, tenant_id, actor_id } = {}) {
  if (!repository || typeof repository.list !== "function" || typeof repository.create !== "function") {
    throw new TypeError("Client registration service requires a Master Data repository");
  }
  const defaults = Object.freeze({ tenant_id, actor_id });
  const duplicateService = createMasterDataDuplicateService({ repository });

  function review(input = {}, options = {}) {
    const normalized = normalizeRegistrationInput(input, defaults);
    return publicReview(buildReview(
      repository,
      duplicateService,
      normalized,
      options.permission_proof ?? normalized.permission_proof,
    ));
  }

  function create(input = {}) {
    const normalized = normalizeRegistrationInput(input, defaults);
    const idempotencyKey = requiredString(input, "idempotency_key", 300);
    const suppliedReviewDigest = requiredString(input, "review_digest", 200);
    const fingerprint = requestFingerprint(normalized);

    if (typeof repository.getIdempotency !== "function") {
      throw new TypeError("Master Data repository getIdempotency is required");
    }
    const replay = repository.getIdempotency({ tenant_id: normalized.tenant_id, idempotency_key: idempotencyKey });
    if (replay) {
      const previousFingerprint = replay.request_fingerprint ?? replay.response?.request_fingerprint ?? null;
      if (replay.operation !== REGISTRATION_OPERATION || previousFingerprint !== fingerprint) {
        throw commandError(CLIENT_REGISTRATION_ERROR_CODES.idempotency_conflict, "idempotency_key is already used for a different registration", 409);
      }
      return Object.freeze({ ...replay.response, outcome: "idempotent_replay", idempotent_replay: true });
    }

    const registrationReview = buildReview(repository, duplicateService, normalized, normalized.permission_proof);
    const digest = registrationReview.review_digest;
    if (suppliedReviewDigest !== digest) {
      throw commandError(CLIENT_REGISTRATION_ERROR_CODES.review_digest_mismatch, "review_digest is stale or does not match this registration", 409);
    }
    if (registrationReview.has_exact_identifier_conflict) {
      throw commandError(CLIENT_REGISTRATION_ERROR_CODES.identifier_conflict, "an exact registration identifier already exists in this tenant", 409);
    }
    if (registrationReview.has_unmatched_duplicate_candidates) {
      throw commandError(CLIENT_REGISTRATION_ERROR_CODES.unlinked_duplicate, "an unresolved duplicate candidate is not linked to a ClientGroup", 409);
    }
    if (registrationReview.has_visible_name_candidates && input.confirm_distinct_client !== true) {
      throw commandError(CLIENT_REGISTRATION_ERROR_CODES.distinct_confirmation_required, "confirm_distinct_client is required when a visible ClientGroup candidate exists", 409);
    }

    const ids = deterministicRecordIds(normalized.tenant_id, idempotencyKey);
    return repository.transaction((tx) => {
      const crmService = createCrmCanonicalWriteService({ repository: tx });
      const graph = normalized.client_type === "organization"
        ? crmService.writeAccount({
            tenant_id: normalized.tenant_id,
            owner_user_id: normalized.actor_id,
            synthetic_only: false,
            permission_ref: normalized.permission_ref,
            audit_hint_ref: normalized.audit_hint_ref,
            account_id: ids.account_id,
            party_id: ids.party_id,
            entity_id: ids.entity_id,
            organization_id: ids.organization_id,
            client_group_id: ids.client_group_id,
            client_group_display_name: normalized.display_name,
            client_group_client_type: normalized.client_type,
            display_name: normalized.display_name,
            legal_form: normalized.legal_form,
            registration_number: normalized.registration_number,
          })
        : crmService.writeContact({
            tenant_id: normalized.tenant_id,
            owner_user_id: normalized.actor_id,
            synthetic_only: false,
            permission_ref: normalized.permission_ref,
            audit_hint_ref: normalized.audit_hint_ref,
            contact_id: ids.contact_id,
            party_id: ids.party_id,
            entity_id: ids.entity_id,
            person_id: ids.person_id,
            contact_point_id: normalized.email
              ? ids.email_contact_point_id
              : ids.phone_contact_point_id,
            display_name: normalized.display_name,
            legal_form: normalized.legal_form,
            email: normalized.email,
            phone: normalized.phone,
            contact_point_value: normalized.email ?? normalized.phone,
            contact_type: normalized.email ? "email" : "phone",
          });

      const clientGroup = normalized.client_type === "organization"
        ? graph.client_group
        : createClientGroupService({ repository: tx }).create({
            tenant_id: normalized.tenant_id,
            owner_user_id: normalized.actor_id,
            synthetic_only: false,
            permission_ref: normalized.permission_ref,
            audit_hint_ref: normalized.audit_hint_ref,
            client_group_id: ids.client_group_id,
            display_name: normalized.display_name,
            client_type: normalized.client_type,
            legal_form: normalized.legal_form,
            member_entity_ids: [graph.entity.entity_id],
            member_party_ids: [graph.party.party_id],
            primary_entity_id: graph.entity.entity_id,
            primary_party_id: graph.party.party_id,
            status: "active",
          });

      const typeRecord = normalized.client_type === "organization" ? graph.organization : graph.person;
      const typeModel = normalized.client_type === "organization" ? "Organization" : "Person";
      const typeIdField = normalized.client_type === "organization" ? "organization_id" : "person_id";
      tx.update(
        { tenant_id: normalized.tenant_id, model_type: "Entity", id: graph.entity.entity_id },
        { canonical_client_group_id: clientGroup.client_group_id },
      );
      tx.update(
        { tenant_id: normalized.tenant_id, model_type: typeModel, id: typeRecord[typeIdField] },
        { canonical_client_group_id: clientGroup.client_group_id },
      );

      const secondaryPhoneContact = normalized.client_type === "person"
        && normalized.email
        && normalized.phone
        ? createContactPointService({ repository: tx }).create({
            tenant_id: normalized.tenant_id,
            owner_user_id: normalized.actor_id,
            synthetic_only: false,
            permission_ref: normalized.permission_ref,
            audit_hint_ref: normalized.audit_hint_ref,
            contact_point_id: ids.phone_contact_point_id,
            owner_entity_id: graph.entity.entity_id,
            owner_party_id: graph.party.party_id,
            contact_type: "phone",
            value: normalized.phone,
            is_primary: true,
            verified: false,
            verification_status: "unverified",
            status: "active",
          })
        : null;
      const identifier = normalized.registration_number
        ? createPartyIdentifierService({ repository: tx }).create({
            tenant_id: normalized.tenant_id,
            owner_user_id: normalized.actor_id,
            synthetic_only: false,
            permission_ref: normalized.permission_ref,
            audit_hint_ref: normalized.audit_hint_ref,
            party_identifier_id: ids.party_identifier_id,
            party_id: graph.party.party_id,
            identifier_type: "business_number",
            identifier_value: normalized.registration_number,
            status: "active",
            verified: false,
          })
        : null;
      const alias = normalized.depositor_alias
        ? createPartyAliasService({ repository: tx }).create({
            tenant_id: normalized.tenant_id,
            owner_user_id: normalized.actor_id,
            synthetic_only: false,
            permission_ref: normalized.permission_ref,
            audit_hint_ref: normalized.audit_hint_ref,
            party_alias_id: ids.party_alias_id,
            party_id: graph.party.party_id,
            alias_value: normalized.depositor_alias,
            alias_type: "bank_depositor_name",
            status: "active",
          })
        : null;
      const auditEvent = tx.appendAudit({
        event_id: `master_data:client-registration:${keyDigest(normalized.tenant_id, idempotencyKey)}`,
        tenant_id: normalized.tenant_id,
        actor_id: normalized.actor_id,
        action: REGISTRATION_OPERATION,
        object_type: "ClientGroup",
        object_id: clientGroup.client_group_id,
        decision: "allow",
        reason: "canonical_client_registration",
        source: "master-data-runtime",
        metadata: {
          client_type: normalized.client_type,
          review_digest: digest,
          visible_candidate_count: registrationReview.client_group_candidates.length,
          has_registration_identifier: Boolean(identifier),
          has_depositor_alias: Boolean(alias),
          contact_point_count:
            (graph.contact_point ? 1 : 0)
            + (secondaryPhoneContact ? 1 : 0),
          permission_ref: normalized.permission_ref,
          audit_hint_ref: normalized.audit_hint_ref,
          raw_pii_included: false,
        },
      });
      const response = safeCreateSummary({
        input: normalized,
        graph,
        clientGroup,
        identifier,
        alias,
        auditEvent,
        digest,
      });
      tx.recordIdempotency({
        tenant_id: normalized.tenant_id,
        idempotency_key: idempotencyKey,
        operation: REGISTRATION_OPERATION,
        request_fingerprint: fingerprint,
        response,
      });
      return response;
    });
  }

  return Object.freeze({
    review,
    create,
    reviewClientRegistration: review,
    createClientRegistration: create,
  });
}

export const createCanonicalClientRegistrationService = createClientRegistrationService;
