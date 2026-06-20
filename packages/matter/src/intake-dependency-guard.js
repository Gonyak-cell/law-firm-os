export function assertMatterOpeningIntakeDependency(input = {}) {
  if (input.opportunity_id && !input.intake_request_id) {
    throw new Error("Opportunity direct Matter opening is blocked; intake_request_id is required");
  }
  if (input.opportunity_to_matter === true || input.create_from_opportunity === true) {
    throw new Error("Opportunity direct Matter opening is blocked");
  }
  if (!input.clearance_token_id && !input.clearance_token?.clearance_token_id) {
    throw new Error("Matter opening requires clearance_token_id");
  }
}

export function matterOpeningDependencyDecision(input = {}) {
  try {
    assertMatterOpeningIntakeDependency(input);
    return Object.freeze({ outcome: "allow", blocked_claims: Object.freeze([]) });
  } catch (error) {
    return Object.freeze({
      outcome: "blocked",
      safe_error_code: "MATTER_INTAKE_DEPENDENCY_REQUIRED",
      blocked_claims: Object.freeze(["opportunity_direct_matter_blocked"]),
      reason: error.message,
    });
  }
}
