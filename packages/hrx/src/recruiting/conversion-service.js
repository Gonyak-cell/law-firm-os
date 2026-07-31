import { createHash, randomUUID } from "node:crypto";
import { createLoginMapping } from "../identity-link.js";
import { convertCandidateToEmployee } from "./convert-to-employee.js";
import { createApplication } from "./application.js";
import { createCandidateProfile } from "./candidate.js";
import { createJobOpening } from "./job-opening.js";
import { createOffer } from "./offer.js";

export const HRX_CANDIDATE_CONVERSION_RECEIPT_VERSION =
  "law-firm-os.hrx-candidate-conversion-receipt.v1";

const CLIENT_INPUT_FIELDS = new Set(["idempotency_key", "effective_from", "employment_type"]);

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, canonicalize(value[key])]),
  );
}

function digest(value) {
  return createHash("sha256").update(JSON.stringify(canonicalize(value))).digest("hex");
}

function serviceError(status, safeErrorCode, message) {
  const error = new Error(message);
  error.status = status;
  error.safe_error_code = safeErrorCode;
  return error;
}

function assertClientInput(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw serviceError(400, "HRX_CANDIDATE_CONVERSION_INPUT_INVALID", "candidate conversion input is required");
  }
  const authorityFields = Object.keys(input).filter((field) => !CLIENT_INPUT_FIELDS.has(field));
  if (authorityFields.length > 0) {
    throw serviceError(
      400,
      "HRX_CANDIDATE_CONVERSION_AUTHORITY_FIELDS_FORBIDDEN",
      `candidate conversion identifiers and employment authority are server-owned: ${authorityFields.join(", ")}`,
    );
  }
}

function validatedAuthority(authority, tenantId) {
  const candidate = createCandidateProfile(authority?.candidate);
  const application = createApplication(authority?.application);
  const offer = createOffer(authority?.offer);
  const jobOpening = createJobOpening(authority?.job_opening);
  if ([candidate, application, offer, jobOpening].some((record) => record.tenant_id !== tenantId)) {
    throw serviceError(
      403,
      "HRX_CANDIDATE_CONVERSION_TENANT_MISMATCH",
      "candidate conversion authority does not belong to the signed tenant",
    );
  }
  if (
    application.candidate_id !== candidate.candidate_id
    || offer.application_id !== application.application_id
    || offer.candidate_id !== candidate.candidate_id
    || jobOpening.job_opening_id !== application.job_opening_id
  ) {
    throw serviceError(
      409,
      "HRX_CANDIDATE_CONVERSION_AUTHORITY_MISMATCH",
      "candidate conversion authority records do not describe one application",
    );
  }
  return Object.freeze({
    candidate,
    application,
    offer,
    jobOpening,
    employee_user_link: authority?.employee_user_link ?? null,
  });
}

function conversionEntityIds(authority) {
  const suffix = digest({
    tenant_id: authority.candidate.tenant_id,
    candidate_id: authority.candidate.candidate_id,
    application_id: authority.application.application_id,
  }).slice(0, 24);
  return Object.freeze({
    employee_id: `emp_candidate_${suffix}`,
    profile_id: `profile_candidate_${suffix}`,
  });
}

function assertAuthoritativeManager(repository, authority) {
  const manager = repository.getEmployee({
    tenant_id: authority.candidate.tenant_id,
    employee_id: authority.jobOpening.hiring_manager_employee_id,
  });
  if (!manager || manager.status !== "active") {
    throw serviceError(
      409,
      "HRX_CANDIDATE_CONVERSION_MANAGER_UNAVAILABLE",
      "job opening hiring manager is not an active employee in the signed tenant",
    );
  }
}

function eventId(tenantId, idempotencyKey, state) {
  return `hrx_candidate_conversion_${digest({ tenant_id: tenantId, idempotency_key: idempotencyKey, state })}`;
}

function appendAudit(audit, actor = {}, event = {}) {
  return audit.append({
    event_id: event.event_id,
    tenant_id: actor.tenant_id,
    actor_id: actor.actor_id,
    action: event.action,
    object_type: "CandidateConversion",
    object_id: event.object_id,
    decision: event.decision ?? "allow",
    reason: event.reason,
    source: "hrx-candidate-conversion-service",
    occurred_at: event.occurred_at,
    metadata: event.metadata,
  });
}

function conversionAuditEvents(audit, tenantId, idempotencyKey) {
  return audit
    .list({ tenant_id: tenantId })
    .filter(
      (event) =>
        event.object_type === "CandidateConversion" &&
        event.metadata?.idempotency_key === idempotencyKey,
    );
}

function completedConversionForCandidate(audit, tenantId, candidateId) {
  return audit
    .list({ tenant_id: tenantId })
    .find(
      (event) =>
        event.action === "hrx.candidate.convert_to_employee.completed" &&
        event.metadata?.candidate_id === candidateId,
    );
}

function findConvertedEmployee(repository, tenantId, candidateId) {
  return repository
    .listEmployees({ tenant_id: tenantId })
    .find((employee) => employee.source_ref === `Candidate:${candidateId}`);
}

function employeeUserLinkInput(authority, conversion) {
  const userId = typeof authority?.user_id === "string" ? authority.user_id.trim() : "";
  const linkId = typeof authority?.link_id === "string" ? authority.link_id.trim() : "";
  if (!userId && !linkId) return null;
  if (!userId || !linkId) {
    throw new TypeError("user_id and link_id must be provided together");
  }
  return createLoginMapping({
    tenant_id: conversion.tenant_id,
    link_id: linkId,
    employee_id: conversion.employee.employee_id,
    user_id: userId,
    source_ref: `CandidateConversion:${conversion.candidate_id}`,
  });
}

function sameEntity(current, expected, fields) {
  return Boolean(current) && fields.every((field) => current[field] === expected[field]);
}

function prepareConversion(input, authority) {
  const ids = conversionEntityIds(authority);
  const conversion = convertCandidateToEmployee({
    candidate: authority.candidate,
    application: authority.application,
    offer: authority.offer,
    approval_ref: authority.offer.approval_ref,
    ...ids,
    title: authority.jobOpening.title,
    org_unit_id: authority.jobOpening.department_ref,
    manager_employee_id: authority.jobOpening.hiring_manager_employee_id,
    effective_from: requiredString(input, "effective_from"),
    employment_type: input.employment_type,
    work_email: authority.candidate.email,
  });
  const employeeUserLink = employeeUserLinkInput(authority.employee_user_link, conversion);
  const command = Object.freeze({
    tenant_id: conversion.tenant_id,
    candidate_id: conversion.candidate_id,
    application_id: conversion.application_id,
    offer_id: conversion.offer_id,
    approval_ref: conversion.approval_ref,
    employee: conversion.employee,
    employment_profile: conversion.employment_profile,
    employee_user_link: employeeUserLink,
  });
  return Object.freeze({
    conversion,
    employeeUserLink,
    requestHash: digest(command),
  });
}

function readExistingResult(repository, prepared) {
  const { conversion, employeeUserLink } = prepared;
  const tenantId = conversion.tenant_id;
  const employee = repository.getEmployee({
    tenant_id: tenantId,
    employee_id: conversion.employee.employee_id,
  });
  const profile = repository.getEmploymentProfile({
    tenant_id: tenantId,
    profile_id: conversion.employment_profile.profile_id,
  });
  const link = employeeUserLink
    ? repository.getEmployeeUserLink({
        tenant_id: tenantId,
        link_id: employeeUserLink.link_id,
      })
    : null;
  return Object.freeze({ employee, profile, link });
}

function assertExistingResultMatches(prepared, existing) {
  const { conversion, employeeUserLink } = prepared;
  if (
    existing.employee &&
    !sameEntity(existing.employee, conversion.employee, [
      "tenant_id",
      "employee_id",
      "display_name",
      "source_ref",
    ])
  ) {
    throw serviceError(409, "HRX_CANDIDATE_CONVERSION_EMPLOYEE_CONFLICT", "employee_id belongs to another record");
  }
  if (
    existing.profile &&
    !sameEntity(existing.profile, conversion.employment_profile, [
      "tenant_id",
      "profile_id",
      "employee_id",
      "source_ref",
    ])
  ) {
    throw serviceError(409, "HRX_CANDIDATE_CONVERSION_PROFILE_CONFLICT", "profile_id belongs to another record");
  }
  if (
    existing.link &&
    !sameEntity(existing.link, employeeUserLink, [
      "tenant_id",
      "link_id",
      "employee_id",
      "user_id",
      "purpose",
    ])
  ) {
    throw serviceError(409, "HRX_CANDIDATE_CONVERSION_USER_LINK_CONFLICT", "link_id belongs to another record");
  }
}

function persistConversion(repository, prepared) {
  return repository.transaction((transactionRepository) => {
    const existing = readExistingResult(transactionRepository, prepared);
    assertExistingResultMatches(prepared, existing);
    const employee = existing.employee ?? transactionRepository.createEmployee(prepared.conversion.employee);
    const employmentProfile =
      existing.profile ??
      transactionRepository.createEmploymentProfile(prepared.conversion.employment_profile);
    const employeeUserLink = prepared.employeeUserLink
      ? existing.link ?? transactionRepository.createEmployeeUserLink(prepared.employeeUserLink)
      : null;
    return Object.freeze({
      employee,
      employment_profile: employmentProfile,
      employee_user_link: employeeUserLink,
      recovered_existing_state: Boolean(existing.employee || existing.profile || existing.link),
      employee_outcome: existing.employee ? "reused" : "created",
      employment_profile_outcome: existing.profile ? "reused" : "created",
      employee_user_link_outcome: prepared.employeeUserLink
        ? existing.link
          ? "reused"
          : "created"
        : "not_requested",
    });
  });
}

function createReceipt(prepared, persisted, idempotencyKey, completedAt) {
  return Object.freeze({
    schema_version: HRX_CANDIDATE_CONVERSION_RECEIPT_VERSION,
    receipt_id: `candidate-conversion:${prepared.conversion.application_id}`,
    tenant_id: prepared.conversion.tenant_id,
    idempotency_key: idempotencyKey,
    request_hash: prepared.requestHash,
    candidate_id: prepared.conversion.candidate_id,
    application_id: prepared.conversion.application_id,
    offer_id: prepared.conversion.offer_id,
    approval_ref: prepared.conversion.approval_ref,
    state: "completed",
    completed_at: completedAt,
    results: Object.freeze({
      employee: Object.freeze({
        outcome: persisted.employee_outcome,
        value: persisted.employee,
      }),
      employment_profile: Object.freeze({
        outcome: persisted.employment_profile_outcome,
        value: persisted.employment_profile,
      }),
      employee_user_link: Object.freeze({
        outcome: persisted.employee_user_link_outcome,
        value: persisted.employee_user_link,
      }),
    }),
    recovered_existing_state: persisted.recovered_existing_state,
    crm_party_linked: false,
  });
}

export function executeCandidateConversion({
  repository,
  audit,
  actor,
  input,
  authority,
  clock = () => new Date().toISOString(),
} = {}) {
  if (!repository || typeof repository.transaction !== "function") {
    throw new TypeError("candidate conversion repository with transaction is required");
  }
  if (!audit || typeof audit.append !== "function" || typeof audit.list !== "function") {
    throw new TypeError("candidate conversion audit store is required");
  }
  const tenantId = requiredString(actor, "tenant_id");
  requiredString(actor, "actor_id");
  assertClientInput(input);
  const idempotencyKey = requiredString(input, "idempotency_key");
  const resolvedAuthority = validatedAuthority(authority, tenantId);
  assertAuthoritativeManager(repository, resolvedAuthority);
  const prepared = prepareConversion(input, resolvedAuthority);
  const priorEvents = conversionAuditEvents(audit, tenantId, idempotencyKey);
  const priorRequestHash = priorEvents.find((event) => event.metadata?.request_hash)?.metadata?.request_hash;
  if (priorRequestHash && priorRequestHash !== prepared.requestHash) {
    throw serviceError(
      409,
      "HRX_CANDIDATE_CONVERSION_IDEMPOTENCY_CONFLICT",
      "idempotency key was already used for a different conversion request",
    );
  }
  const completed = priorEvents.find((event) => event.action === "hrx.candidate.convert_to_employee.completed");
  if (completed?.metadata?.receipt) {
    return Object.freeze({ receipt: completed.metadata.receipt, replayed: true });
  }
  const completedForCandidate = completedConversionForCandidate(
    audit,
    tenantId,
    prepared.conversion.candidate_id,
  );
  if (
    completedForCandidate &&
    completedForCandidate.metadata?.idempotency_key !== idempotencyKey
  ) {
    throw serviceError(
      409,
      "HRX_CANDIDATE_ALREADY_CONVERTED",
      "candidate was already converted with another idempotency key",
    );
  }
  const existingConvertedEmployee = findConvertedEmployee(
    repository,
    tenantId,
    prepared.conversion.candidate_id,
  );
  if (existingConvertedEmployee && priorEvents.length === 0) {
    throw serviceError(
      409,
      "HRX_CANDIDATE_ALREADY_CONVERTED",
      "candidate conversion already exists without this idempotency key",
    );
  }

  const startedAt = clock();
  if (priorEvents.length === 0) {
    appendAudit(audit, actor, {
      event_id: eventId(tenantId, idempotencyKey, "started"),
      action: "hrx.candidate.convert_to_employee.started",
      object_id: prepared.conversion.application_id,
      reason: "candidate_conversion_started",
      occurred_at: startedAt,
      metadata: {
        idempotency_key: idempotencyKey,
        request_hash: prepared.requestHash,
        candidate_id: prepared.conversion.candidate_id,
        application_id: prepared.conversion.application_id,
        offer_id: prepared.conversion.offer_id,
      },
    });
  }

  try {
    const persisted = persistConversion(repository, prepared);
    const receipt = createReceipt(prepared, persisted, idempotencyKey, clock());
    appendAudit(audit, actor, {
      event_id: eventId(tenantId, idempotencyKey, "completed"),
      action: "hrx.candidate.convert_to_employee.completed",
      object_id: prepared.conversion.application_id,
      reason: "candidate_converted_to_employee",
      occurred_at: receipt.completed_at,
      metadata: {
        idempotency_key: idempotencyKey,
        request_hash: prepared.requestHash,
        candidate_id: receipt.candidate_id,
        application_id: receipt.application_id,
        offer_id: receipt.offer_id,
        employee_id: receipt.results.employee.value.employee_id,
        profile_id: receipt.results.employment_profile.value.profile_id,
        link_id: receipt.results.employee_user_link.value?.link_id ?? null,
        receipt,
      },
    });
    return Object.freeze({ receipt, replayed: false });
  } catch (error) {
    appendAudit(audit, actor, {
      event_id: `hrx_candidate_conversion_failed_${randomUUID()}`,
      action: "hrx.candidate.convert_to_employee.recovery_pending",
      object_id: prepared.conversion.application_id,
      decision: "review_required",
      reason: "candidate_conversion_requires_retry",
      occurred_at: clock(),
      metadata: {
        idempotency_key: idempotencyKey,
        request_hash: prepared.requestHash,
        candidate_id: prepared.conversion.candidate_id,
        application_id: prepared.conversion.application_id,
        offer_id: prepared.conversion.offer_id,
        safe_error_code: error.safe_error_code ?? "HRX_CANDIDATE_CONVERSION_WRITE_FAILED",
      },
    });
    throw error;
  }
}
