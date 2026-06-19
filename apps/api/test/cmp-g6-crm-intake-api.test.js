// Deterministic in-process tests for the CMP-G6 CRM/Intake clearance runtime slice.
import test from "node:test";
import assert from "node:assert/strict";
import { startApiServer } from "../src/server.js";

const TENANT = "tenant-a";
const ACTOR = "cmp-g6-intake-ops";
const PARTY_ID = "party-cmp-g6-client";
const COUNTERPARTY_ID = "party-cmp-g6-counterparty";
const OPPORTUNITY_ID = "opp-cmp-g6-runtime";
const INTAKE_ID = "intake-cmp-g6-runtime";
const CONFLICT_CHECK_ID = "conflict-cmp-g6-runtime";
const CONFLICT_HIT_ID = "hit-cmp-g6-runtime";
const FEE_TERMS_ID = "fee-terms-cmp-g6-runtime";
const ENGAGEMENT_ID = "engagement-cmp-g6-runtime";
const CLEARANCE_TOKEN_ID = "clearance-cmp-g6-runtime";

let server;
let baseUrl;

async function json(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...(options.headers ?? {}),
    },
  });
  return { status: response.status, body: await response.json() };
}

function query(params = {}) {
  return new URLSearchParams({ tenant_id: TENANT, actor_id: ACTOR, ...params }).toString();
}

async function createOpportunity() {
  return json(`/api/crm-intake/opportunities?${query()}`, {
    method: "POST",
    body: JSON.stringify({
      opportunity_id: OPPORTUNITY_ID,
      party_id: PARTY_ID,
      display_name: "CMP G6 Runtime Opportunity",
      stage: "qualified",
    }),
  });
}

test.before(async () => {
  const started = await startApiServer({ port: 0 });
  server = started.server;
  baseUrl = `http://${started.host}:${started.port}`;
});

test.after(() => new Promise((resolve) => server.close(resolve)));

test("CMP-G6 health descriptor exposes CRM/Intake clearance before Matter opening", async () => {
  const { status, body } = await json("/api/health");
  assert.equal(status, 200);
  const crmIntake = body.bounded_contexts.find((context) => context.bounded_context === "crm-intake-clearance");
  assert.ok(crmIntake);
  assert.equal(crmIntake.cmp_gate, "CMP-G6");
  assert.deepEqual(crmIntake.depends_on, ["CMP-G1-W01", "CMP-G2-W02"]);
  assert.deepEqual(crmIntake.feeds_runtime_gate, ["CMP-G4-W04"]);
  assert.equal(crmIntake.tuw_ids.length, 22);
  assert.equal(crmIntake.tuw_ids[0], "CMP-G6-W06-T001");
  assert.equal(crmIntake.tuw_ids.at(-1), "CMP-G6-W06-T022");
  assert.equal(crmIntake.runtime_readiness_claim, "runtime_api_evidence_only__durable_persistence_open");
});

test("CMP-G6 blocks direct Opportunity-to-Matter bypass and allows Opportunity-to-Intake only", async () => {
  const directMatter = await json(`/api/crm-intake/opportunities?${query()}`, {
    method: "POST",
    body: JSON.stringify({
      opportunity_id: "opp-cmp-g6-bypass",
      party_id: PARTY_ID,
      display_name: "Bypass attempt",
      matter_id: "matter-not-allowed",
    }),
  });
  assert.equal(directMatter.status, 400);
  assert.equal(directMatter.body.safe_error_code, "CMP_G6_VALIDATION_ERROR");
  assert.match(directMatter.body.reason, /direct Matter reference/);

  const opportunity = await createOpportunity();
  assert.equal(opportunity.status, 201);
  assert.equal(opportunity.body.opportunity.allowed_conversion_target, "IntakeRequest");
  assert.equal(opportunity.body.opportunity.matter_id, null);

  const blockedPipeline = await json(`/api/crm-intake/opportunities/${OPPORTUNITY_ID}/pipeline?${query()}`, {
    method: "PATCH",
    body: JSON.stringify({
      requested_stage: "closed_won",
      create_matter: true,
    }),
  });
  assert.equal(blockedPipeline.status, 400);
  assert.ok(blockedPipeline.body.descriptor.blocked_claims.includes("opportunity_stage_transition_invalid"));
  assert.ok(blockedPipeline.body.descriptor.blocked_claims.includes("opportunity_to_matter_shortcut_blocked"));

  const pipeline = await json(`/api/crm-intake/opportunities/${OPPORTUNITY_ID}/pipeline?${query()}`, {
    method: "PATCH",
    body: JSON.stringify({ requested_stage: "intake_requested" }),
  });
  assert.equal(pipeline.status, 200);
  assert.equal(pipeline.body.descriptor.stage_transition.to, "intake_requested");

  const blockedIntake = await json(`/api/crm-intake/opportunities/${OPPORTUNITY_ID}/intake-request?${query()}`, {
    method: "POST",
    body: JSON.stringify({
      intake_request_id: "intake-cmp-g6-bypass",
      create_matter: true,
    }),
  });
  assert.equal(blockedIntake.status, 400);
  assert.ok(blockedIntake.body.descriptor.blocked_claims.includes("opportunity_to_matter_shortcut_blocked"));

  const intake = await json(`/api/crm-intake/opportunities/${OPPORTUNITY_ID}/intake-request?${query()}`, {
    method: "POST",
    body: JSON.stringify({
      intake_request_id: INTAKE_ID,
      party_ids: [PARTY_ID, COUNTERPARTY_ID],
      requested_scope_summary: "CMP G6 runtime intake",
    }),
  });
  assert.equal(intake.status, 201);
  assert.equal(intake.body.intake_request.intake_request_id, INTAKE_ID);
  assert.equal(intake.body.intake_request.creates_matter, false);
  assert.equal(intake.body.intake_request.matter_id, null);
});

test("CMP-G6 records conflict snapshot, source-covered search, and reviewer decision", async () => {
  const conflictCheck = await json(`/api/crm-intake/conflict-checks?${query()}`, {
    method: "POST",
    body: JSON.stringify({
      conflict_check_id: CONFLICT_CHECK_ID,
      intake_request_id: INTAKE_ID,
    }),
  });
  assert.equal(conflictCheck.status, 201);
  assert.equal(conflictCheck.body.conflict_check.immutable_snapshot, true);

  const conflictHit = await json(`/api/crm-intake/conflict-hits?${query()}`, {
    method: "POST",
    body: JSON.stringify({
      conflict_hit_id: CONFLICT_HIT_ID,
      conflict_check_id: CONFLICT_CHECK_ID,
      matched_party_id: COUNTERPARTY_ID,
      hit_source: "former_matter",
      source_record_ref: "former_matter:cmp-g6",
      severity: "high",
      audit_hint_ref: "audit-cmp-g6-hit",
    }),
  });
  assert.equal(conflictHit.status, 201);
  assert.equal(conflictHit.body.conflict_hit.raw_hit_payload_visible, false);

  const blockedSearch = await json(`/api/crm-intake/conflict-checks/${CONFLICT_CHECK_ID}/search?${query()}`, {
    method: "POST",
    body: JSON.stringify({
      search_sources: {
        alias_index: [{ alias_ref: "alias-cmp-g6" }],
        relationship_graph: [{ relationship_ref: "relationship-cmp-g6" }],
      },
    }),
  });
  assert.equal(blockedSearch.status, 400);
  assert.ok(blockedSearch.body.descriptor.blocked_claims.includes("conflict_search_former_matter_source_missing"));

  const search = await json(`/api/crm-intake/conflict-checks/${CONFLICT_CHECK_ID}/search?${query()}`, {
    method: "POST",
    body: JSON.stringify({
      search_sources: {
        alias_index: [{ alias_ref: "alias-cmp-g6" }],
        relationship_graph: [{ relationship_ref: "relationship-cmp-g6" }],
        former_matter: [{ matter_ref: "former_matter:cmp-g6" }],
      },
    }),
  });
  assert.equal(search.status, 200);
  assert.equal(search.body.search.source_coverage.alias_index, true);
  assert.equal(search.body.search.source_coverage.former_matter, true);

  const blockedDecision = await json(`/api/crm-intake/conflict-checks/${CONFLICT_CHECK_ID}/decision?${query()}`, {
    method: "POST",
    body: JSON.stringify({ requested_decision: "waiver_required" }),
  });
  assert.equal(blockedDecision.status, 400);
  assert.ok(blockedDecision.body.descriptor.blocked_claims.includes("conflict_decision_reviewer_required"));

  const decision = await json(`/api/crm-intake/conflict-checks/${CONFLICT_CHECK_ID}/decision?${query()}`, {
    method: "POST",
    body: JSON.stringify({
      requested_decision: "waiver_required",
      reviewer_user_id: "user-cmp-g6-risk",
    }),
  });
  assert.equal(decision.status, 200);
  assert.equal(decision.body.decision.decision_receipt.reviewer_required, true);
});

test("CMP-G6 requires waiver, fee terms, engagement approval, and risk audit before clearance token", async () => {
  const prematureClearance = await json(`/api/crm-intake/clearance-tokens?${query()}`, {
    method: "POST",
    body: JSON.stringify({
      clearance_token_id: "clearance-cmp-g6-premature",
      intake_request_id: INTAKE_ID,
      conflict_check_id: CONFLICT_CHECK_ID,
      engagement_id: ENGAGEMENT_ID,
    }),
  });
  assert.equal(prematureClearance.status, 400);
  assert.ok(prematureClearance.body.blocked_claims.includes("engagement_required_for_clearance"));

  const waiver = await json(`/api/crm-intake/waivers?${query()}`, {
    method: "POST",
    body: JSON.stringify({
      waiver_id: "waiver-cmp-g6-runtime",
      intake_request_id: INTAKE_ID,
      conflict_hit_ids: [CONFLICT_HIT_ID],
      consent_document_ref: "dms:waiver-cmp-g6",
      approver_user_id: "user-cmp-g6-risk",
    }),
  });
  assert.equal(waiver.status, 201);
  assert.equal(waiver.body.waiver.consent_document_evidence_required, true);

  const feeTerms = await json(`/api/crm-intake/fee-terms?${query()}`, {
    method: "POST",
    body: JSON.stringify({
      fee_terms_id: FEE_TERMS_ID,
      intake_request_id: INTAKE_ID,
      fee_type: "hourly",
      currency: "KRW",
      rate_card_ref: "rate-card-cmp-g6",
    }),
  });
  assert.equal(feeTerms.status, 201);
  assert.equal(feeTerms.body.fee_terms.fee_type, "hourly");

  const blockedEngagement = await json(`/api/crm-intake/engagements?${query()}`, {
    method: "POST",
    body: JSON.stringify({
      engagement_id: "engagement-cmp-g6-blocked",
      intake_request_id: INTAKE_ID,
      fee_terms_id: FEE_TERMS_ID,
      create_matter: true,
    }),
  });
  assert.equal(blockedEngagement.status, 400);
  assert.ok(blockedEngagement.body.descriptor.blocked_claims.includes("engagement_legal_client_required"));
  assert.ok(blockedEngagement.body.descriptor.blocked_claims.includes("intake_to_matter_shortcut_blocked"));

  const engagement = await json(`/api/crm-intake/engagements?${query()}`, {
    method: "POST",
    body: JSON.stringify({
      engagement_id: ENGAGEMENT_ID,
      intake_request_id: INTAKE_ID,
      legal_client_party_id: PARTY_ID,
      scope_summary: "CMP G6 runtime engagement scope",
      fee_terms_id: FEE_TERMS_ID,
      approval_state: "approved",
    }),
  });
  assert.equal(engagement.status, 201);
  assert.equal(engagement.body.engagement.approval_state, "approved");
  assert.equal(engagement.body.engagement.matter_id, null);

  const risk = await json(`/api/crm-intake/risk-approvals?${query()}`, {
    method: "POST",
    body: JSON.stringify({
      risk_approval_id: "risk-cmp-g6-runtime",
      intake_request_id: INTAKE_ID,
      conflict_check_id: CONFLICT_CHECK_ID,
      reviewer_user_id: "user-cmp-g6-risk",
      approval_audit_ref: "audit-cmp-g6-risk",
    }),
  });
  assert.equal(risk.status, 201);
  assert.equal(risk.body.risk_approval.queue_receipt.approval_audit_required, true);

  const blockedBypassToken = await json(`/api/crm-intake/clearance-tokens?${query()}`, {
    method: "POST",
    body: JSON.stringify({
      clearance_token_id: "clearance-cmp-g6-bypass",
      intake_request_id: INTAKE_ID,
      conflict_check_id: CONFLICT_CHECK_ID,
      engagement_id: ENGAGEMENT_ID,
      create_matter: true,
    }),
  });
  assert.equal(blockedBypassToken.status, 400);
  assert.ok(blockedBypassToken.body.blocked_claims.includes("opportunity_to_matter_bypass_blocked"));

  const clearance = await json(`/api/crm-intake/clearance-tokens?${query()}`, {
    method: "POST",
    body: JSON.stringify({
      clearance_token_id: CLEARANCE_TOKEN_ID,
      intake_request_id: INTAKE_ID,
      conflict_check_id: CONFLICT_CHECK_ID,
      engagement_id: ENGAGEMENT_ID,
    }),
  });
  assert.equal(clearance.status, 201);
  assert.equal(clearance.body.clearance_token.token_state, "candidate");
  assert.equal(clearance.body.clearance_token.clearance_receipt.valid_for_runtime_matter_opening, false);
});

test("CMP-G6 CRM/Intake UI routes mask conflict, finance, waiver, and engagement sensitive details", async () => {
  const confidentialActivity = await json(`/api/crm-intake/activities?${query()}`, {
    method: "POST",
    body: JSON.stringify({
      crm_activity_id: "activity-cmp-g6-confidential",
      party_id: PARTY_ID,
      opportunity_id: OPPORTUNITY_ID,
      activity_type: "meeting",
      subject: "Confidential strategy",
      confidential: true,
    }),
  });
  assert.equal(confidentialActivity.status, 201);
  assert.equal(confidentialActivity.body.permission_trim.outcome, "denied");
  assert.equal(confidentialActivity.body.permission_trim.customer_visible_activity, null);

  const summary = await json(`/api/crm-intake/ui/summary?${query({ party_id: PARTY_ID })}`);
  assert.equal(summary.status, 200);
  assert.equal(summary.body.summary.customer_visible_summary.conflict_details_visible, false);
  assert.equal(summary.body.summary.customer_visible_summary.finance_details_visible, false);
  assert.equal(summary.body.summary.customer_visible_summary.unauthorized_detail_count_visible, false);

  const keyClientPlan = await json(`/api/crm-intake/ui/key-client-plan?${query({ party_id: PARTY_ID })}`);
  assert.equal(keyClientPlan.status, 200);
  assert.equal(keyClientPlan.body.key_client_plan.masked_finance_summary.ar_balance, "masked");
  assert.equal(keyClientPlan.body.key_client_plan.masked_finance_summary.invoice_detail_visible, false);

  const conflictMemo = await json(`/api/crm-intake/ui/conflict-memo?${query({ conflict_check_id: CONFLICT_CHECK_ID, actor_module: "crm" })}`);
  assert.equal(conflictMemo.status, 403);
  assert.equal(conflictMemo.body.conflict_memo.safe_error_code, "INTAKE_CONFLICT_MEMO_DENIED");
  assert.equal(conflictMemo.body.conflict_memo.customer_visible_memo, null);
  assert.equal(conflictMemo.body.conflict_memo.leak_guard.unauthorized_count_visible, false);

  const waiverUi = await json(`/api/crm-intake/ui/waiver-approval?${query({ waiver_id: "waiver-cmp-g6-runtime" })}`);
  assert.equal(waiverUi.status, 200);
  assert.equal(waiverUi.body.waiver_ui.customer_visible_waiver.consent_document_visible, false);
  assert.equal(waiverUi.body.waiver_ui.leak_guard.unauthorized_count_visible, false);

  const engagementUi = await json(`/api/crm-intake/ui/engagement-approval?${query({ engagement_id: ENGAGEMENT_ID })}`);
  assert.equal(engagementUi.status, 200);
  assert.equal(engagementUi.body.engagement_ui.customer_visible_engagement.approved_state_visible, true);
  assert.equal(engagementUi.body.engagement_ui.leak_guard.signed_document_body_visible, false);
});

test("CMP-G6 runtime evidence and audit preserve clearance boundaries without durable R4 claims", async () => {
  const evidence = await json(`/api/crm-intake/runtime/evidence?${query()}`);
  assert.equal(evidence.status, 200);
  assert.equal(evidence.body.evidence.cmp_gate, "CMP-G6");
  assert.equal(evidence.body.evidence.tuw_ids.length, 22);
  assert.equal(evidence.body.evidence.opportunity_to_matter_bypass_blocked, true);
  assert.equal(evidence.body.evidence.intake_conflict_engagement_clearance_required, true);
  assert.equal(evidence.body.evidence.runtime_readiness, "runtime_api_evidence_only__durable_persistence_open");

  const audit = await json(`/api/crm-intake/audit?${query()}`);
  assert.equal(audit.status, 200);
  assert.equal(audit.body.verification.ok, true);
  assert.ok(audit.body.events.length >= 6);
  assert.ok(audit.body.events.every((event) => event.tenant_id === TENANT));
});
