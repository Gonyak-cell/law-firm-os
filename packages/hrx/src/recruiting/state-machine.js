import { createApplication, transitionApplicationStage } from "./application.js";
import { createJobOpening, transitionJobOpening } from "./job-opening.js";
import { createOffer, transitionOffer } from "./offer.js";

export function assertRecruitingStageTransition(entity = {}, change = {}) {
  if (entity.application_id) return transitionApplicationStage(entity, change);
  if (entity.job_opening_id) return transitionJobOpening(entity, change);
  if (entity.offer_id) return transitionOffer(entity, change);
  throw new TypeError("recruiting state transition requires application, job opening, or offer entity");
}

export function createRecruitingPipelineSnapshot(input = {}) {
  return Object.freeze({
    tenant_id: input.tenant_id,
    job_openings: Object.freeze((input.job_openings ?? []).map(createJobOpening)),
    applications: Object.freeze((input.applications ?? []).map(createApplication)),
    offers: Object.freeze((input.offers ?? []).map(createOffer)),
    invalid_stage_transition_blocked: true,
  });
}
