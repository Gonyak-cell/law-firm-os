#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PERMISSION_CONTEXT_HEADER } from "../apps/api/src/permission-gate.js";
import { startApiServer } from "../apps/api/src/server.js";
import { createIntakeRuntimeRepository } from "../packages/intake/src/runtime-repository.js";
import { createMasterDataRepository } from "../packages/master-data/src/index.js";
import { createMatterRepository } from "../packages/matter/src/index.js";

const ROOT = process.cwd();
const ARTIFACT_DIR = join(ROOT, "artifacts", "manual-qa");
const JSON_PATH = join(ARTIFACT_DIR, "upl-c03-conflict-review-proof.json");
const MD_PATH = join(ARTIFACT_DIR, "upl-c03-conflict-review-proof.md");
const TENANT = "tenant_upl_c03_conflict_review";
const ACTOR = "user_upl_c03_reviewer";
const INTAKE_ID = "intake_upl_c03_new_client";
const CONFLICT_ID = "conflict_upl_c03_review";
const ENGAGEMENT_ID = "engagement_upl_c03_signed";
const BASE_QUERY = `tenant_id=${TENANT}&permission_ref=upl_c03_conflict_read&audit_hint_ref=upl_c03_api_proof`;

mkdirSync(ARTIFACT_DIR, { recursive: true });

function permissionContext(effect = "allow") {
  return JSON.stringify({
    principal: { user_id: ACTOR, tenant_id: TENANT, role_ids: ["crm_intake_user", "conflict_reviewer"] },
    rules: [{ id: `rule_upl_c03_${effect}`, effect, action: "*" }],
    object_acl: [],
  });
}

async function apiJson(baseUrl, path, options = {}) {
  const headers = {
    [PERMISSION_CONTEXT_HEADER]: permissionContext(),
    ...(options.headers ?? {}),
  };
  if (options.body && !headers["content-type"]) headers["content-type"] = "application/json";
  const response = await fetch(`${baseUrl}${path}`, { ...options, headers });
  const body = await response.json();
  return { status: response.status, body };
}

function writePayload(pathBody, idempotencyKey, extra = {}) {
  return {
    tenant_id: TENANT,
    permission_ref: "upl_c03_conflict_write",
    audit_hint_ref: "upl_c03_api_proof",
    actor_id: ACTOR,
    idempotency_key: idempotencyKey,
    ...pathBody,
    ...extra,
  };
}

const intakeRepository = createIntakeRuntimeRepository({
  seedRecords: [
    {
      model_type: "IntakeRequest",
      intake_request_id: INTAKE_ID,
      tenant_id: TENANT,
      opportunity_id: "opp_upl_c03_new_client",
      requesting_party_id: "party_upl_c03_new_client",
      party_ids: ["party_upl_c03_new_client"],
      requested_scope_summary: "상대방 연계 이해상충 검토",
      status: "open",
      owner_user_id: ACTOR,
    },
  ],
});

const crmMasterDataRepository = createMasterDataRepository({
  seedRecords: [
    {
      model_type: "Party",
      party_id: "party_upl_c03_new_client",
      tenant_id: TENANT,
      party_type: "organization",
      display_name: "상대방 주식회사",
      status: "active",
      owner_user_id: ACTOR,
    },
  ],
});

const matterRepository = createMatterRepository({
  seedRecords: [
    {
      model_type: "MatterParty",
      resource_id: "matter_party_upl_c03_adverse",
      matter_party_id: "matter_party_upl_c03_adverse",
      tenant_id: TENANT,
      matter_id: "matter_upl_c03_former",
      party_id: "party_upl_c03_adverse",
      display_name: "(주) 상대방",
      party_role: "adverse_party",
      role_scope: "matter_conflict_subject",
      conflict_subject: true,
      retroactive_entry: true,
      status: "active",
      raw_contact_values_included: false,
      production_ready_claim: false,
    },
  ],
});

const started = await startApiServer({ port: 0, intakeRepository, crmMasterDataRepository, matterRepository });
let report;
try {
  const baseUrl = `http://${started.host}:${started.port}`;
  const check = await apiJson(baseUrl, "/api/intake/conflict-checks", {
    method: "POST",
    body: JSON.stringify(writePayload({
      conflict_check: {
        conflict_check_id: CONFLICT_ID,
        tenant_id: TENANT,
        intake_request_id: INTAKE_ID,
        party_snapshot: { party_ids: ["party_upl_c03_new_client"], aliases: ["상대방 주식회사"] },
        snapshot_hash: "snapshot_upl_c03_review",
        status: "snapshot_recorded",
        owner_user_id: ACTOR,
      },
      conflict_search: {
        conflict_search_id: "search_upl_c03_review",
        aliases: ["상대방 주식회사"],
        hit_count: 0,
      },
    }, "upl-c03-conflict-check")),
  });
  const hitId = check.body.conflict_hits?.[0]?.conflict_hit_id;
  const prematureToken = await apiJson(baseUrl, "/api/intake/clearance-tokens", {
    method: "POST",
    body: JSON.stringify(writePayload({
      now: "2026-07-03T00:00:00.000Z",
      token: {
        clearance_token_id: "clearance_upl_c03_premature",
        tenant_id: TENANT,
        intake_request_id: INTAKE_ID,
        conflict_check_id: CONFLICT_ID,
        engagement_id: ENGAGEMENT_ID,
        snapshot_hash: check.body.item?.snapshot_hash,
        expires_at: "2026-07-10T00:00:00.000Z",
      },
    }, "upl-c03-clearance-premature")),
  });
  const decision = await apiJson(baseUrl, "/api/intake/conflict-decisions", {
    method: "POST",
    body: JSON.stringify(writePayload({
      conflict_decision: {
        conflict_decision_id: "decision_upl_c03_clear",
        tenant_id: TENANT,
        conflict_check_id: CONFLICT_ID,
        conflict_hit_ids: [hitId],
        reviewer_id: ACTOR,
        decision: "clear",
        rationale: "reviewer_recorded_clearance_basis",
      },
    }, "upl-c03-conflict-decision")),
  });
  const decisionReplay = await apiJson(baseUrl, "/api/intake/conflict-decisions", {
    method: "POST",
    body: JSON.stringify(writePayload({
      conflict_decision: {
        conflict_decision_id: "decision_upl_c03_clear",
        tenant_id: TENANT,
        conflict_check_id: CONFLICT_ID,
        conflict_hit_ids: [hitId],
        reviewer_id: ACTOR,
        decision: "clear",
        rationale: "reviewer_recorded_clearance_basis",
      },
    }, "upl-c03-conflict-decision")),
  });
  const waiver = await apiJson(baseUrl, "/api/intake/waivers", {
    method: "POST",
    body: JSON.stringify(writePayload({
      waiver: {
        waiver_id: "waiver_upl_c03_consent",
        tenant_id: TENANT,
        intake_request_id: INTAKE_ID,
        conflict_check_id: CONFLICT_ID,
        conflict_hit_ids: [hitId],
        consent_document_id: "consent_doc_upl_c03_signed",
        approver_id: ACTOR,
        approval_reason: "reviewer_confirmed_consent_document",
      },
    }, "upl-c03-waiver")),
  });
  const engagement = await apiJson(baseUrl, "/api/intake/engagements", {
    method: "POST",
    body: JSON.stringify(writePayload({
      engagement: {
        engagement_id: ENGAGEMENT_ID,
        tenant_id: TENANT,
        intake_request_id: INTAKE_ID,
        template_id: "matter_engagement_letter",
        signed_document_id: "signed_doc_upl_c03_engagement",
        signature_ref: "signature:signed_doc_upl_c03_engagement",
        template_document: {
          template_document_id: "template_doc_upl_c03_engagement",
          template_id: "matter_engagement_letter",
          document_title: "위임계약서",
          generation_state: "generated",
          merge_field_count: 3,
        },
        signed_document_upload: {
          signed_document_upload_id: "signed_upload_upl_c03_engagement",
          document_id: "signed_doc_upl_c03_engagement",
          signed_document_id: "signed_doc_upl_c03_engagement",
          template_document_id: "template_doc_upl_c03_engagement",
          signature_ref: "signature:signed_doc_upl_c03_engagement",
          content_sha256: "sha256:signed_doc_upl_c03_engagement",
          byte_size: 2048,
          mime_type: "application/pdf",
          upload_state: "uploaded",
          lx_registry_ref: "LX-06",
        },
        approver_id: ACTOR,
      },
    }, "upl-c03-engagement")),
  });
  const token = await apiJson(baseUrl, "/api/intake/clearance-tokens", {
    method: "POST",
    body: JSON.stringify(writePayload({
      now: "2026-07-03T00:00:00.000Z",
      token: {
        clearance_token_id: "clearance_upl_c03_valid",
        tenant_id: TENANT,
        intake_request_id: INTAKE_ID,
        conflict_check_id: CONFLICT_ID,
        engagement_id: ENGAGEMENT_ID,
        snapshot_hash: check.body.item?.snapshot_hash,
        expires_at: "2026-07-10T00:00:00.000Z",
      },
    }, "upl-c03-clearance-valid")),
  });
  const tokenReplay = await apiJson(baseUrl, "/api/intake/clearance-tokens", {
    method: "POST",
    body: JSON.stringify(writePayload({
      now: "2026-07-03T00:00:00.000Z",
      token: {
        clearance_token_id: "clearance_upl_c03_valid",
        tenant_id: TENANT,
        intake_request_id: INTAKE_ID,
        conflict_check_id: CONFLICT_ID,
        engagement_id: ENGAGEMENT_ID,
        snapshot_hash: check.body.item?.snapshot_hash,
        expires_at: "2026-07-10T00:00:00.000Z",
      },
    }, "upl-c03-clearance-valid")),
  });
  const audit = await apiJson(baseUrl, `/api/intake/audit?${BASE_QUERY}`);
  const auditActions = new Set((audit.body.items ?? []).map((event) => event.action));
  const auditHistory = (audit.body.items ?? []).map((event) => ({
    action: event.action,
    object_type: event.object_type,
    object_id: event.object_id,
    metadata: event.metadata,
  }));
  const checks = [
    {
      id: "hit-generated-for-review",
      passed:
        check.status === 201 &&
        check.body.hit_count === 1 &&
        check.body.conflict_hits?.[0]?.hit_source === "former_matter" &&
        check.body.conflict_hits?.[0]?.status === "review_required",
    },
    {
      id: "premature-clearance-blocked-before-ledger-review",
      passed: prematureToken.status === 400 && prematureToken.body.ui_state === "blocked",
    },
    {
      id: "decision-records-reviewer-and-clears-hit",
      passed:
        decision.status === 201 &&
        decision.body.item?.reviewer_id === ACTOR &&
        decision.body.conflict_check?.status === "cleared" &&
        decision.body.conflict_hits?.[0]?.status === "cleared" &&
        decision.body.clearance_link_ready === true,
    },
    {
      id: "waiver-route-records-consent-document",
      passed:
        waiver.status === 201 &&
        waiver.body.waiver?.consent_document_id === "consent_doc_upl_c03_signed" &&
        waiver.body.clearance_link_ready === true,
    },
    {
      id: "signed-engagement-enables-clearance",
      passed:
        engagement.status === 201 &&
        engagement.body.engagement_ready === true &&
        engagement.body.signed_document_upload_id === "signed_upload_upl_c03_engagement" &&
        token.status === 201 &&
        token.body.validation?.valid === true &&
        token.body.conflict_review?.review_satisfied === true &&
        token.body.engagement_review?.engagement_satisfied === true &&
        token.body.item?.conflict_review_satisfied === true &&
        token.body.item?.engagement_review_satisfied === true,
    },
    {
      id: "idempotency-and-audit-history",
      passed:
        decisionReplay.status === 200 &&
        decisionReplay.body.outcome === "idempotent_replay" &&
        tokenReplay.status === 200 &&
        tokenReplay.body.outcome === "idempotent_replay" &&
        audit.status === 200 &&
        ["conflict.search.executed", "conflict.hit.create", "conflict.decision.record", "waiver.approved", "engagement.approved", "clearance.token.issue"].every((action) => auditActions.has(action)),
    },
  ];

  report = {
    schema_version: "law-firm-os.upl-c03.conflict-review-proof.v0.1",
    generated_at: new Date().toISOString(),
    verdict: checks.every((item) => item.passed) ? "PASS" : "FAIL",
    api_url: baseUrl,
    contract_ref: "UPL-C-03",
    route_surface: [
      "POST /api/intake/conflict-checks",
      "POST /api/intake/conflict-decisions",
      "POST /api/intake/waivers",
      "POST /api/intake/engagements",
      "POST /api/intake/clearance-tokens",
      "GET /api/intake/audit",
    ],
    checks,
    observed: {
      check: { status: check.status, item: check.body.item, conflict_search: check.body.conflict_search, conflict_hits: check.body.conflict_hits },
      premature_token: { status: prematureToken.status, ui_state: prematureToken.body.ui_state },
      decision: { status: decision.status, item: decision.body.item, conflict_check: decision.body.conflict_check, conflict_hits: decision.body.conflict_hits, clearance_link_ready: decision.body.clearance_link_ready },
      decision_replay: { status: decisionReplay.status, outcome: decisionReplay.body.outcome },
      waiver: { status: waiver.status, waiver: waiver.body.waiver, clearance_link_ready: waiver.body.clearance_link_ready },
      engagement: { status: engagement.status, item: engagement.body.item, engagement_ready: engagement.body.engagement_ready },
      clearance: { status: token.status, item: token.body.item, validation: token.body.validation, conflict_review: token.body.conflict_review, engagement_review: token.body.engagement_review },
      clearance_replay: { status: tokenReplay.status, outcome: tokenReplay.body.outcome },
      audit: { status: audit.status, actions: [...auditActions].sort(), history: auditHistory },
    },
  };
} finally {
  await new Promise((resolve) => started.server.close(resolve));
}

writeFileSync(JSON_PATH, `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(
  MD_PATH,
  [
    "# UPL-C-03 Conflict Review Proof",
    "",
    `- verdict: ${report.verdict}`,
    `- contract_ref: ${report.contract_ref}`,
    "",
    "## Checks",
    ...report.checks.map((check) => `- ${check.passed ? "PASS" : "FAIL"} ${check.id}`),
    "",
    "## Audit History",
    ...report.observed.audit.history.map((event) => `- ${event.action}: ${event.object_type}:${event.object_id}`),
    "",
  ].join("\n"),
);
console.log(JSON.stringify({ verdict: report.verdict, proof: JSON_PATH, report: MD_PATH }, null, 2));
if (report.verdict !== "PASS") process.exit(1);
