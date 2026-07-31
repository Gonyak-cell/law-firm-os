import { randomUUID } from "node:crypto";
import {
  closeOffboardingCase,
  createOffboardingCase,
  updateOffboardingTask,
} from "../../../../../packages/hrx/src/offboarding.js";
import { createOnboardingPlan, updateOnboardingTask } from "../../../../../packages/hrx/src/onboarding.js";
import { createLifecycleTemplate } from "../../../../../packages/hrx/src/lifecycle-template.js";

function response(status, body) {
  return Object.freeze({ status, body: Object.freeze(body) });
}

async function appendAudit(audit, context = {}, event = {}) {
  return audit?.append?.({
    event_id: event.event_id ?? `hrx_lifecycle_evt_${randomUUID()}`,
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

export function createHrxLifecycleRoute({ audit, seed = {} } = {}) {
  const templates = [...(seed.templates ?? [])].map((input) => Object.freeze({
    tenant_id: input.tenant_id,
    template_version_id: `${input.template_id}:${input.version}`,
    ...createLifecycleTemplate(input),
  }));
  const onboardingPlans = [...(seed.onboarding ?? [])].map(createOnboardingPlan);
  const offboardingCases = [...(seed.offboarding ?? [])].map(createOffboardingCase);

  function resolveTemplate(request, lifecycleKind, anchorDate) {
    return templates
      .filter((template) => template.tenant_id === request.context.tenant_id)
      .filter((template) => template.lifecycle_kind === lifecycleKind)
      .filter((template) => !request.body.template_id || template.template_id === request.body.template_id)
      .filter((template) => !request.body.template_version || template.version === request.body.template_version)
      .filter((template) => !request.body.role_key || template.role_key === request.body.role_key)
      .filter((template) => template.effective_from <= anchorDate)
      .sort((left, right) => right.effective_from.localeCompare(left.effective_from))[0];
  }

  return Object.freeze({
    async handle(request = {}) {
      try {
        const resource = request.params?.resource ?? request.body?.resource;
        if (request.method === "GET" && resource === "lifecycle_templates") {
          return response(200, {
            outcome: "ok",
            templates: templates.filter((template) => template.tenant_id === request.context.tenant_id),
          });
        }
        if (request.method === "POST" && resource === "lifecycle_templates") {
          const template = Object.freeze({
            tenant_id: request.context.tenant_id,
            template_version_id: `${request.body.template_id}:${request.body.version}`,
            ...createLifecycleTemplate(request.body),
          });
          if (templates.some((candidate) =>
            candidate.tenant_id === template.tenant_id &&
            candidate.template_version_id === template.template_version_id)) {
            const error = new Error("Lifecycle template version already exists");
            error.status = 409;
            error.safe_error_code = "HRX_LIFECYCLE_TEMPLATE_VERSION_EXISTS";
            throw error;
          }
          templates.push(template);
          await appendAudit(audit, request.context, {
            action: "hrx.lifecycle.template.create",
            object_type: "LifecycleTemplate",
            object_id: template.template_version_id,
            reason: "lifecycle_template_version_created",
          });
          return response(201, { outcome: "created", template });
        }
        if (request.method === "GET" && resource === "onboarding") {
          return response(200, {
            outcome: "ok",
            onboarding: onboardingPlans.filter((plan) => plan.tenant_id === request.context.tenant_id),
          });
        }
        if (request.method === "POST" && resource === "onboarding") {
          const template = request.body.template_id
            ? resolveTemplate(request, "onboarding", request.body.start_date)
            : null;
          if (request.body.template_id && !template) {
            return response(404, { outcome: "not_found", safe_error_code: "HRX_LIFECYCLE_TEMPLATE_NOT_FOUND" });
          }
          const plan = createOnboardingPlan({
            ...request.body,
            tenant_id: request.context.tenant_id,
            ...(template ? { template } : {}),
          });
          onboardingPlans.push(plan);
          await appendAudit(audit, request.context, {
            action: "hrx.onboarding.create",
            object_type: "OnboardingPlan",
            object_id: plan.onboarding_id,
            reason: "onboarding_plan_created",
          });
          return response(201, { outcome: "created", onboarding: plan });
        }
        if (request.method === "POST" && resource === "onboarding_task") {
          const index = onboardingPlans.findIndex(
            (plan) =>
              plan.tenant_id === request.context.tenant_id &&
              plan.onboarding_id === request.params?.onboarding_id,
          );
          if (index === -1) return response(404, { outcome: "not_found", safe_error_code: "HRX_ONBOARDING_NOT_FOUND" });
          onboardingPlans[index] = updateOnboardingTask(onboardingPlans[index], request.params?.task_id, request.body);
          await appendAudit(audit, request.context, {
            action: "hrx.onboarding.task.update",
            object_type: "OnboardingTask",
            object_id: request.params?.task_id,
            reason: "onboarding_task_updated",
            metadata: { onboarding_id: onboardingPlans[index].onboarding_id },
          });
          return response(200, { outcome: "updated", onboarding: onboardingPlans[index] });
        }
        if (request.method === "GET" && resource === "offboarding") {
          return response(200, { outcome: "ok", offboarding: offboardingCases.filter((item) => item.tenant_id === request.context.tenant_id) });
        }
        if (request.method === "POST" && resource === "offboarding") {
          const leaveCompletionStatusClaimed =
            request.body.leave_reconciliation_status !== undefined &&
            request.body.leave_reconciliation_status !== "pending";
          const leaveCompletionEvidenceClaimed =
            request.body.leave_reconciliation_evidence_ref !== undefined &&
            request.body.leave_reconciliation_evidence_ref !== null &&
            request.body.leave_reconciliation_evidence_ref !== "";
          if (
            leaveCompletionStatusClaimed ||
            leaveCompletionEvidenceClaimed
          ) {
            const error = new Error(
              "Leave reconciliation completion can only be recorded by the payroll delivery workflow",
            );
            error.status = 400;
            error.safe_error_code =
              "HRX_OFFBOARDING_LEAVE_EVIDENCE_FORBIDDEN";
            throw error;
          }
          const template = request.body.template_id
            ? resolveTemplate(request, "offboarding", request.body.separation_date)
            : null;
          if (request.body.template_id && !template) {
            return response(404, { outcome: "not_found", safe_error_code: "HRX_LIFECYCLE_TEMPLATE_NOT_FOUND" });
          }
          const offboarding = createOffboardingCase({
            ...request.body,
            tenant_id: request.context.tenant_id,
            ...(template ? { template } : {}),
          });
          offboardingCases.push(offboarding);
          await appendAudit(audit, request.context, {
            action: "hrx.offboarding.create",
            object_type: "OffboardingCase",
            object_id: offboarding.offboarding_id,
            reason: "offboarding_case_created",
          });
          return response(201, { outcome: "created", offboarding });
        }
        if (request.method === "POST" && resource === "offboarding_task") {
          const index = offboardingCases.findIndex(
            (item) =>
              item.tenant_id === request.context.tenant_id &&
              item.offboarding_id === request.params?.offboarding_id,
          );
          if (index === -1) {
            return response(404, { outcome: "not_found", safe_error_code: "HRX_OFFBOARDING_NOT_FOUND" });
          }
          offboardingCases[index] = updateOffboardingTask(
            offboardingCases[index],
            request.params?.task_id,
            request.body,
          );
          await appendAudit(audit, request.context, {
            action: "hrx.offboarding.task.update",
            object_type: "OffboardingTask",
            object_id: request.params?.task_id,
            reason: "offboarding_task_updated",
            metadata: { offboarding_id: offboardingCases[index].offboarding_id },
          });
          return response(200, { outcome: "updated", offboarding: offboardingCases[index] });
        }
        if (request.method === "POST" && resource === "offboarding_close") {
          const index = offboardingCases.findIndex((item) => item.tenant_id === request.context.tenant_id && item.offboarding_id === request.params?.offboarding_id);
          if (index === -1) return response(404, { outcome: "not_found", safe_error_code: "HRX_OFFBOARDING_NOT_FOUND" });
          offboardingCases[index] = closeOffboardingCase(request.body, { current_case: offboardingCases[index] });
          await appendAudit(audit, request.context, {
            action: "hrx.offboarding.close",
            object_type: "OffboardingCase",
            object_id: offboardingCases[index].offboarding_id,
            reason: "offboarding_case_closed",
          });
          return response(200, { outcome: "closed", offboarding: offboardingCases[index] });
        }
        return response(405, { outcome: "blocked", safe_error_code: "METHOD_NOT_ALLOWED" });
      } catch (error) {
        return response(
          Number.isInteger(error.status) ? error.status : 400,
          {
            outcome: "blocked",
            safe_error_code: error.safe_error_code ?? "HRX_LIFECYCLE_ROUTE_ERROR",
            reason: error.message,
          },
        );
      }
    },
  });
}
