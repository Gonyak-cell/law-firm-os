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
const JSON_PATH = join(ARTIFACT_DIR, "upl-c04-clearance-ledger-proof.json");
const MD_PATH = join(ARTIFACT_DIR, "upl-c04-clearance-ledger-proof.md");
const TENANT = "tenant_upl_c04_clearance_ledger";
const ACTOR = "user_upl_c04_reviewer";
const INTAKE_ID = "intake_upl_c04_new_client";
const CONFLICT_ID = "conflict_upl_c04_review";
const ENGAGEMENT_ID = "engagement_upl_c04_signed";
const BASE_QUERY = `tenant_id=${TENANT}&permission_ref=upl_c04_ledger_read&audit_hint_ref=upl_c04_api_proof`;

mkdirSync(ARTIFACT_DIR, { recursive: true });

function permissionContext(effect = "allow") {
  return JSON.stringify({
    principal: { user_id: ACTOR, tenant_id: TENANT, role_ids: ["crm_intake_user", "conflict_reviewer", "matter_runtime_user"] },
    rules: [{ id: `rule_upl_c04_${effect}`, effect, action: "*" }],
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

function intakeWrite(payload, idempotencyKey) {
  return {
    tenant_id: TENANT,
    permission_ref: "upl_c04_ledger_write",
    audit_hint_ref: "upl_c04_api_proof",
    actor_id: ACTOR,
    idempotency_key: idempotencyKey,
    ...payload,
  };
}

function openingPayload({ matterId, idempotencyKey, clearanceToken, title }) {
  return {
    tenant_id: TENANT,
    permission_ref: "upl_c04_matter_open",
    audit_hint_ref: "upl_c04_api_proof",
    actor_id: ACTOR,
    idempotency_key: idempotencyKey,
    matter_number_seed: matterId,
    matter: {
      matter_id: matterId,
      tenant_id: TENANT,
      legal_client_party_id: "party_upl_c04_new_client",
      billing_client_party_id: "party_upl_c04_new_client",
      title,
      status: "opening",
      matter_number: `M-UPL-C04-${matterId}`,
      created_by: ACTOR,
      created_at: "2026-07-03T00:00:00.000Z",
      permission_envelope_id: `perm:${TENANT}:${matterId}`,
      audit_trace_id: `audit:${TENANT}:${matterId}`,
    },
    clearance_token: clearanceToken,
  };
}

function blocked(response) {
  return response.status >= 400 && response.status < 500 && response.body.ui_state === "blocked";
}

const intakeRepository = createIntakeRuntimeRepository({
  seedRecords: [
    {
      model_type: "IntakeRequest",
      intake_request_id: INTAKE_ID,
      tenant_id: TENANT,
      opportunity_id: "opp_upl_c04_new_client",
      requesting_party_id: "party_upl_c04_new_client",
      party_ids: ["party_upl_c04_new_client"],
      requested_scope_summary: "원장 기반 통과 토큰 검증",
      status: "open",
      owner_user_id: ACTOR,
    },
  ],
});

const crmMasterDataRepository = createMasterDataRepository({
  seedRecords: [
    {
      model_type: "Party",
      party_id: "party_upl_c04_new_client",
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
      resource_id: "matter_party_upl_c04_adverse",
      matter_party_id: "matter_party_upl_c04_adverse",
      tenant_id: TENANT,
      matter_id: "matter_upl_c04_former",
      party_id: "party_upl_c04_adverse",
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
    body: JSON.stringify(intakeWrite({
      conflict_check: {
        conflict_check_id: CONFLICT_ID,
        tenant_id: TENANT,
        intake_request_id: INTAKE_ID,
        party_snapshot: { party_ids: ["party_upl_c04_new_client"], aliases: ["상대방 주식회사"] },
        snapshot_hash: "snapshot_upl_c04_review",
        status: "snapshot_recorded",
        owner_user_id: ACTOR,
      },
    }, "upl-c04-conflict-check")),
  });
  const hitId = check.body.conflict_hits?.[0]?.conflict_hit_id;
  const decision = await apiJson(baseUrl, "/api/intake/conflict-decisions", {
    method: "POST",
    body: JSON.stringify(intakeWrite({
      conflict_decision: {
        conflict_decision_id: "decision_upl_c04_clear",
        tenant_id: TENANT,
        conflict_check_id: CONFLICT_ID,
        conflict_hit_ids: [hitId],
        reviewer_id: ACTOR,
        decision: "clear",
        rationale: "ledger_clearance_required_before_matter_opening",
      },
    }, "upl-c04-conflict-decision")),
  });
  const waiver = await apiJson(baseUrl, "/api/intake/waivers", {
    method: "POST",
    body: JSON.stringify(intakeWrite({
      waiver: {
        waiver_id: "waiver_upl_c04_consent",
        tenant_id: TENANT,
        intake_request_id: INTAKE_ID,
        conflict_check_id: CONFLICT_ID,
        conflict_hit_ids: [hitId],
        consent_document_id: "consent_doc_upl_c04_signed",
        approver_id: ACTOR,
        approval_reason: "reviewer_confirmed_consent_document",
      },
    }, "upl-c04-waiver")),
  });
  const engagement = await apiJson(baseUrl, "/api/intake/engagements", {
    method: "POST",
    body: JSON.stringify(intakeWrite({
      engagement: {
        engagement_id: ENGAGEMENT_ID,
        tenant_id: TENANT,
        intake_request_id: INTAKE_ID,
        template_id: "matter_engagement_letter",
        signed_document_id: "signed_doc_upl_c04_engagement",
        signature_ref: "signature:signed_doc_upl_c04_engagement",
        template_document: {
          template_document_id: "template_doc_upl_c04_engagement",
          template_id: "matter_engagement_letter",
          document_title: "위임계약서",
          generation_state: "generated",
          merge_field_count: 3,
        },
        signed_document_upload: {
          signed_document_upload_id: "signed_upload_upl_c04_engagement",
          document_id: "signed_doc_upl_c04_engagement",
          signed_document_id: "signed_doc_upl_c04_engagement",
          template_document_id: "template_doc_upl_c04_engagement",
          signature_ref: "signature:signed_doc_upl_c04_engagement",
          content_sha256: "sha256:signed_doc_upl_c04_engagement",
          byte_size: 2048,
          mime_type: "application/pdf",
          upload_state: "uploaded",
          lx_registry_ref: "LX-06",
        },
        approver_id: ACTOR,
      },
    }, "upl-c04-engagement")),
  });
  const token = await apiJson(baseUrl, "/api/intake/clearance-tokens", {
    method: "POST",
    body: JSON.stringify(intakeWrite({
      now: "2026-07-03T00:00:00.000Z",
      token: {
        clearance_token_id: "clearance_upl_c04_valid",
        tenant_id: TENANT,
        intake_request_id: INTAKE_ID,
        conflict_check_id: CONFLICT_ID,
        engagement_id: ENGAGEMENT_ID,
        snapshot_hash: check.body.item?.snapshot_hash,
        expires_at: "2026-07-10T00:00:00.000Z",
      },
    }, "upl-c04-clearance-valid")),
  });

  const issuedToken = token.body.item;
  const fullShapeNeverIssued = await apiJson(baseUrl, "/api/matters/openings", {
    method: "POST",
    body: JSON.stringify(openingPayload({
      matterId: "matter_upl_c04_never_issued",
      idempotencyKey: "upl-c04-matter-open-never-issued",
      title: "C04 never issued token blocked",
      clearanceToken: {
        ...issuedToken,
        clearance_token_id: "clearance_upl_c04_never_issued",
        token_state: "active",
        outcome: "cleared",
        conflict_review_satisfied: true,
      },
    })),
  });
  const forgedEngagement = await apiJson(baseUrl, "/api/matters/openings", {
    method: "POST",
    body: JSON.stringify(openingPayload({
      matterId: "matter_upl_c04_forged_engagement",
      idempotencyKey: "upl-c04-matter-open-forged-engagement",
      title: "C04 forged engagement blocked",
      clearanceToken: { ...issuedToken, engagement_id: "engagement:forged-by-client" },
    })),
  });
  const forgedSnapshot = await apiJson(baseUrl, "/api/matters/openings", {
    method: "POST",
    body: JSON.stringify(openingPayload({
      matterId: "matter_upl_c04_forged_snapshot",
      idempotencyKey: "upl-c04-matter-open-forged-snapshot",
      title: "C04 forged snapshot blocked",
      clearanceToken: { ...issuedToken, snapshot_hash: "snapshot:forged-by-client" },
    })),
  });
  const ledgerOnlyOpen = await apiJson(baseUrl, "/api/matters/openings", {
    method: "POST",
    body: JSON.stringify(openingPayload({
      matterId: "matter_upl_c04_ledger_only",
      idempotencyKey: "upl-c04-matter-open-ledger-only",
      title: "C04 ledger-only matter opening",
      clearanceToken: {
        clearance_token_id: issuedToken.clearance_token_id,
        tenant_id: TENANT,
        token_state: "expired",
        outcome: "blocked",
      },
    })),
  });
  const openedMatterRecord = matterRepository.get({
    tenant_id: TENANT,
    model_type: "Matter",
    matter_id: "matter_upl_c04_ledger_only",
  });
  const audit = await apiJson(baseUrl, `/api/intake/audit?${BASE_QUERY}`);
  const auditActions = new Set((audit.body.items ?? []).map((event) => event.action));

  const checks = [
    {
      id: "default-api-server-wires-matter-opening-to-intake-clearance-ledger",
      passed: blocked(fullShapeNeverIssued),
    },
    {
      id: "issued-token-engagement-forgery-blocked",
      passed: blocked(forgedEngagement),
    },
    {
      id: "issued-token-snapshot-forgery-blocked",
      passed: blocked(forgedSnapshot),
    },
    {
      id: "caller-token-state-shape-ignored-in-favor-of-ledger-record",
      passed:
        ledgerOnlyOpen.status === 201 &&
        openedMatterRecord?.clearance_token_id === issuedToken.clearance_token_id &&
        openedMatterRecord?.engagement_id === issuedToken.engagement_id &&
        openedMatterRecord?.clearance_snapshot_hash === issuedToken.snapshot_hash,
    },
    {
      id: "clearance-lineage-audit-history-present",
      passed:
        check.status === 201 &&
        decision.status === 201 &&
        waiver.status === 201 &&
        engagement.status === 201 &&
        engagement.body.signed_document_upload_id === "signed_upload_upl_c04_engagement" &&
        token.status === 201 &&
        ["conflict.search.executed", "conflict.hit.create", "conflict.decision.record", "waiver.approved", "engagement.approved", "clearance.token.issue"].every((action) => auditActions.has(action)),
    },
  ];

  report = {
    schema_version: "law-firm-os.upl-c04.clearance-ledger-proof.v0.1",
    generated_at: new Date().toISOString(),
    verdict: checks.every((item) => item.passed) ? "PASS" : "FAIL",
    api_url: baseUrl,
    contract_ref: "UPL-C-04",
    route_surface: [
      "POST /api/intake/conflict-checks",
      "POST /api/intake/conflict-decisions",
      "POST /api/intake/waivers",
      "POST /api/intake/engagements",
      "POST /api/intake/clearance-tokens",
      "POST /api/matters/openings",
      "GET /api/intake/audit",
    ],
    checks,
    observed: {
      clearance: { status: token.status, item: issuedToken, validation: token.body.validation },
      never_issued_token: { status: fullShapeNeverIssued.status, ui_state: fullShapeNeverIssued.body.ui_state, safe_error_codes: fullShapeNeverIssued.body.safe_error_codes },
      forged_engagement: { status: forgedEngagement.status, ui_state: forgedEngagement.body.ui_state, safe_error_codes: forgedEngagement.body.safe_error_codes },
      forged_snapshot: { status: forgedSnapshot.status, ui_state: forgedSnapshot.body.ui_state, safe_error_codes: forgedSnapshot.body.safe_error_codes },
      ledger_only_open: { status: ledgerOnlyOpen.status, item: ledgerOnlyOpen.body.item, persisted: openedMatterRecord },
      audit: { status: audit.status, actions: [...auditActions].sort() },
    },
  };
} finally {
  await new Promise((resolve) => started.server.close(resolve));
}

writeFileSync(JSON_PATH, `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(
  MD_PATH,
  [
    "# UPL-C-04 Clearance Ledger Proof",
    "",
    `- verdict: ${report.verdict}`,
    `- contract_ref: ${report.contract_ref}`,
    "",
    "## Checks",
    ...report.checks.map((check) => `- ${check.passed ? "PASS" : "FAIL"} ${check.id}`),
    "",
    "## Blocked Attempts",
    `- never_issued_token: ${report.observed.never_issued_token.status} ${report.observed.never_issued_token.ui_state}`,
    `- forged_engagement: ${report.observed.forged_engagement.status} ${report.observed.forged_engagement.ui_state}`,
    `- forged_snapshot: ${report.observed.forged_snapshot.status} ${report.observed.forged_snapshot.ui_state}`,
    "",
  ].join("\n"),
);
console.log(JSON.stringify({ verdict: report.verdict, proof: JSON_PATH, report: MD_PATH }, null, 2));
if (report.verdict !== "PASS") process.exit(1);
