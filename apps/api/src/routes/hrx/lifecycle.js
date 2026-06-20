import { randomUUID } from "node:crypto";
import { closeOffboardingCase, createOffboardingCase } from "../../../../../packages/hrx/src/offboarding.js";
import { createOnboardingPlan, updateOnboardingTask } from "../../../../../packages/hrx/src/onboarding.js";

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
  const onboardingPlans = [...(seed.onboarding ?? [])].map(createOnboardingPlan);
  const offboardingCases = [...(seed.offboarding ?? [])].map(createOffboardingCase);

  return Object.freeze({
    async handle(request = {}) {
      try {
        const resource = request.params?.resource ?? request.body?.resource;
        if (request.method === "GET" && resource === "onboarding") {
          return response(200, { outcome: "ok", onboarding: onboardingPlans });
        }
        if (request.method === "POST" && resource === "onboarding") {
          const plan = createOnboardingPlan({ ...request.body, tenant_id: request.context.tenant_id });
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
          const index = onboardingPlans.findIndex((plan) => plan.onboarding_id === request.params?.onboarding_id);
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
          return response(200, { outcome: "ok", offboarding: offboardingCases });
        }
        if (request.method === "POST" && resource === "offboarding") {
          const offboarding = createOffboardingCase({ ...request.body, tenant_id: request.context.tenant_id });
          offboardingCases.push(offboarding);
          await appendAudit(audit, request.context, {
            action: "hrx.offboarding.create",
            object_type: "OffboardingCase",
            object_id: offboarding.offboarding_id,
            reason: "offboarding_case_created",
          });
          return response(201, { outcome: "created", offboarding });
        }
        if (request.method === "POST" && resource === "offboarding_close") {
          const index = offboardingCases.findIndex((item) => item.offboarding_id === request.params?.offboarding_id);
          if (index === -1) return response(404, { outcome: "not_found", safe_error_code: "HRX_OFFBOARDING_NOT_FOUND" });
          offboardingCases[index] = closeOffboardingCase({ ...offboardingCases[index], ...request.body });
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
        return response(400, { outcome: "blocked", safe_error_code: "HRX_LIFECYCLE_ROUTE_ERROR", reason: error.message });
      }
    },
  });
}
