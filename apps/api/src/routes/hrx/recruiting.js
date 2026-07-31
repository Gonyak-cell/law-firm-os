import { randomUUID } from "node:crypto";
import { createApplication, transitionApplicationStage } from "../../../../../packages/hrx/src/recruiting/application.js";
import { createCandidateProfile } from "../../../../../packages/hrx/src/recruiting/candidate.js";
import { assertCandidateConsentAllowsProcessing, createCandidateConsent } from "../../../../../packages/hrx/src/recruiting/consent.js";
import { executeCandidateConversion } from "../../../../../packages/hrx/src/recruiting/conversion-service.js";
import { createInterview } from "../../../../../packages/hrx/src/recruiting/interview.js";
import { completeInterviewWithFeedbackSource } from "../../../../../packages/hrx/src/recruiting/interview-feedback.js";
import { createJobOpening, transitionJobOpening } from "../../../../../packages/hrx/src/recruiting/job-opening.js";
import { createOffer, transitionOffer } from "../../../../../packages/hrx/src/recruiting/offer.js";
import { createInMemoryHrxRepository } from "../../../../../packages/hrx/src/repository.js";

function response(status, body) {
  return Object.freeze({ status, body: Object.freeze(body) });
}

async function appendAudit(audit, context = {}, event = {}) {
  return audit?.append?.({
    event_id: event.event_id ?? `hrx_recruiting_evt_${randomUUID()}`,
    tenant_id: context.tenant_id,
    actor_id: context.actor_id,
    action: event.action,
    object_type: event.object_type,
    object_id: event.object_id,
    decision: event.decision ?? "allow",
    reason: event.reason,
    metadata: Object.freeze({ ...(event.metadata ?? {}) }),
  });
}

function requireActiveEmployee(repository, tenantId, employeeId, field) {
  const employee = typeof employeeId === "string" && employeeId.trim()
    ? repository.getEmployee({ tenant_id: tenantId, employee_id: employeeId.trim() })
    : null;
  if (!employee || employee.status !== "active") {
    const error = new Error(`${field} must reference an active employee in the signed tenant`);
    error.status = 409;
    error.safe_error_code = "HRX_RECRUITING_EMPLOYEE_AUTHORITY_INVALID";
    throw error;
  }
  return employee;
}

function requireScopedRecord(collection, tenantId, field, value, safeErrorCode) {
  const record = collection.find((item) => item.tenant_id === tenantId && item[field] === value);
  if (!record) {
    const error = new Error(`${field} not found: ${value}`);
    error.status = 404;
    error.safe_error_code = safeErrorCode;
    throw error;
  }
  return record;
}

export function createHrxRecruitingRoute({
  audit,
  seed = {},
  repository = createInMemoryHrxRepository(),
  clock,
} = {}) {
  const candidates = [...(seed.candidates ?? [])].map(createCandidateProfile);
  const consents = [...(seed.consents ?? [])].map(createCandidateConsent);
  const jobOpenings = [...(seed.job_openings ?? [])].map(createJobOpening);
  const applications = [...(seed.applications ?? [])].map(createApplication);
  const interviews = [...(seed.interviews ?? [])].map(createInterview);
  const offers = [...(seed.offers ?? [])].map(createOffer);

  return Object.freeze({
    async handle(request = {}) {
      try {
        const resource = request.params?.resource ?? request.body?.resource;
        if (request.method === "GET" && resource === "pipeline") {
          return response(200, {
            outcome: "ok",
            candidates,
            job_openings: jobOpenings,
            applications,
            interviews,
            offers,
          });
        }
        if (request.method === "POST" && resource === "candidates") {
          if (!request.body?.consent) {
            throw new TypeError("candidate consent is required before processing");
          }
          const consent = createCandidateConsent({ ...request.body.consent, tenant_id: request.context.tenant_id });
          assertCandidateConsentAllowsProcessing([...consents, consent], {
            tenant_id: request.context.tenant_id,
            candidate_id: request.body.candidate_id,
          });
          const candidate = createCandidateProfile({ ...request.body, tenant_id: request.context.tenant_id });
          consents.push(consent);
          candidates.push(candidate);
          await appendAudit(audit, request.context, {
            action: "hrx.candidate.create",
            object_type: "Candidate",
            object_id: candidate.candidate_id,
            reason: "candidate_created_with_consent",
            metadata: { consent_id: consent.consent_id },
          });
          return response(201, { outcome: "created", candidate });
        }
        if (request.method === "POST" && resource === "job_openings") {
          requireActiveEmployee(
            repository,
            request.context.tenant_id,
            request.body.hiring_manager_employee_id,
            "hiring_manager_employee_id",
          );
          const opening = createJobOpening({ ...request.body, tenant_id: request.context.tenant_id });
          jobOpenings.push(opening);
          await appendAudit(audit, request.context, {
            action: "hrx.job_opening.create",
            object_type: "JobOpening",
            object_id: opening.job_opening_id,
            reason: "job_opening_created",
          });
          return response(201, { outcome: "created", job_opening: opening });
        }
        if (request.method === "POST" && resource === "job_opening_stage") {
          const index = jobOpenings.findIndex((item) => item.job_opening_id === request.params?.job_opening_id);
          if (index === -1) return response(404, { outcome: "not_found", safe_error_code: "HRX_JOB_OPENING_NOT_FOUND" });
          jobOpenings[index] = transitionJobOpening(jobOpenings[index], request.body);
          await appendAudit(audit, request.context, {
            action: "hrx.job_opening.stage.update",
            object_type: "JobOpening",
            object_id: jobOpenings[index].job_opening_id,
            reason: "job_opening_stage_updated",
            metadata: { state: jobOpenings[index].state },
          });
          return response(200, { outcome: "updated", job_opening: jobOpenings[index] });
        }
        if (request.method === "POST" && resource === "applications") {
          const application = createApplication({ ...request.body, tenant_id: request.context.tenant_id });
          applications.push(application);
          await appendAudit(audit, request.context, {
            action: "hrx.application.create",
            object_type: "Application",
            object_id: application.application_id,
            reason: "application_created",
          });
          return response(201, { outcome: "created", application });
        }
        if (request.method === "POST" && resource === "application_stage") {
          const index = applications.findIndex((item) => item.application_id === request.params?.application_id);
          if (index === -1) return response(404, { outcome: "not_found", safe_error_code: "HRX_APPLICATION_NOT_FOUND" });
          applications[index] = transitionApplicationStage(applications[index], request.body);
          await appendAudit(audit, request.context, {
            action: "hrx.application.stage.update",
            object_type: "Application",
            object_id: applications[index].application_id,
            reason: "application_stage_updated",
            metadata: { stage: applications[index].stage },
          });
          return response(200, { outcome: "updated", application: applications[index] });
        }
        if (request.method === "POST" && resource === "interviews") {
          const interview = createInterview({ ...request.body, tenant_id: request.context.tenant_id });
          for (const interviewerEmployeeId of interview.interviewer_employee_ids) {
            requireActiveEmployee(
              repository,
              request.context.tenant_id,
              interviewerEmployeeId,
              "interviewer_employee_ids",
            );
          }
          interviews.push(interview);
          await appendAudit(audit, request.context, {
            action: "hrx.interview.create",
            object_type: "Interview",
            object_id: interview.interview_id,
            reason: "interview_created",
          });
          return response(201, { outcome: "created", interview });
        }
        if (request.method === "POST" && resource === "interview_feedback") {
          const index = interviews.findIndex((item) => item.interview_id === request.params?.interview_id);
          if (index === -1) return response(404, { outcome: "not_found", safe_error_code: "HRX_INTERVIEW_NOT_FOUND" });
          interviews[index] = completeInterviewWithFeedbackSource(interviews[index], request.body);
          await appendAudit(audit, request.context, {
            action: "hrx.interview.feedback.record",
            object_type: "Interview",
            object_id: interviews[index].interview_id,
            reason: "interview_feedback_source_recorded",
            metadata: { feedback_source_ref: interviews[index].feedback_source_ref },
          });
          return response(200, { outcome: "completed", interview: interviews[index] });
        }
        if (request.method === "POST" && resource === "offers") {
          const offer = createOffer({ ...request.body, tenant_id: request.context.tenant_id });
          offers.push(offer);
          await appendAudit(audit, request.context, {
            action: "hrx.offer.create",
            object_type: "Offer",
            object_id: offer.offer_id,
            reason: "offer_created",
          });
          return response(201, { outcome: "created", offer });
        }
        if (request.method === "POST" && resource === "offer_stage") {
          const index = offers.findIndex((item) => item.offer_id === request.params?.offer_id);
          if (index === -1) return response(404, { outcome: "not_found", safe_error_code: "HRX_OFFER_NOT_FOUND" });
          offers[index] = transitionOffer(offers[index], {
            ...request.body,
            approval_ref: offers[index].approval_ref,
          });
          await appendAudit(audit, request.context, {
            action: "hrx.offer.stage.update",
            object_type: "Offer",
            object_id: offers[index].offer_id,
            reason: "offer_stage_updated",
            metadata: { state: offers[index].state },
          });
          return response(200, { outcome: "updated", offer: offers[index] });
        }
        if (request.method === "POST" && resource === "convert_to_employee") {
          const tenantId = request.context.tenant_id;
          const application = requireScopedRecord(
            applications,
            tenantId,
            "application_id",
            request.params?.application_id,
            "HRX_APPLICATION_NOT_FOUND",
          );
          const candidate = requireScopedRecord(
            candidates,
            tenantId,
            "candidate_id",
            application.candidate_id,
            "HRX_CANDIDATE_NOT_FOUND",
          );
          const offer = offers.find((item) => (
            item.tenant_id === tenantId
            && item.application_id === application.application_id
            && item.candidate_id === candidate.candidate_id
          ));
          if (!offer) {
            return response(404, { outcome: "not_found", safe_error_code: "HRX_OFFER_NOT_FOUND" });
          }
          const jobOpening = requireScopedRecord(
            jobOpenings,
            tenantId,
            "job_opening_id",
            application.job_opening_id,
            "HRX_JOB_OPENING_NOT_FOUND",
          );
          const result = executeCandidateConversion({
            repository,
            audit,
            actor: request.context,
            input: request.body,
            authority: {
              candidate,
              application,
              offer,
              job_opening: jobOpening,
            },
            ...(clock ? { clock } : {}),
          });
          return response(result.replayed ? 200 : 201, {
            outcome: result.replayed ? "replayed" : "converted",
            replayed: result.replayed,
            receipt: result.receipt,
            conversion: {
              employee: result.receipt.results.employee.value,
              employment_profile: result.receipt.results.employment_profile.value,
              employee_user_link: result.receipt.results.employee_user_link.value,
              crm_party_linked: result.receipt.crm_party_linked,
            },
          });
        }
        return response(405, { outcome: "blocked", safe_error_code: "METHOD_NOT_ALLOWED" });
      } catch (error) {
        return response(
          Number.isInteger(error.status) ? error.status : 400,
          {
            outcome: "blocked",
            safe_error_code: error.safe_error_code ?? "HRX_RECRUITING_ROUTE_ERROR",
            reason: error.message,
          },
        );
      }
    },
  });
}
