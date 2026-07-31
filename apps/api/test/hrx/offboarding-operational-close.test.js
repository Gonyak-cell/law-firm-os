import assert from "node:assert/strict";
import test from "node:test";
import { createHrxRuntimeContext, handleHrxApiRequest } from "../../src/hrx-runtime-context.js";
import { createOffboardingSourceVersion } from "../../../../packages/hrx/src/offboarding-evidence.js";
import { createFileHrxStore } from "../../../../packages/hrx/src/store/file-store.js";
import { runHrxMigrations } from "../../../../packages/hrx/src/migrations/index.js";

const TENANT_ID = "tenant-a";
const OFFBOARDING_ID = "off-001";
const MATTER_ID = "matter_rp05_synthetic_opening";
const NOW = "2026-07-30T10:00:00.000Z";
const VALID_UNTIL = "2026-12-31T23:59:59.000Z";
const ACCESS_EVIDENCE_REF = "LX-11:AccessRevocation:off-001:idp-core";

function request(context, matterContext, actorId, pathname, method = "GET", body = {}) {
  return handleHrxApiRequest({
    pathname,
    method,
    body,
    context,
    matterContext,
    requestContext: {
      tenant_id: TENANT_ID,
      actor_id: actorId,
      actor_role: "hr_admin",
      hrx_scopes: ["hrx.lifecycle.read", "hrx.lifecycle.write"],
      session_bound: true,
    },
  });
}

function mutableMatterContext() {
  const state = {
    matterStatus: "open",
    memberStatus: "active",
  };
  return {
    state,
    context: {
      repository: {
        list({ tenant_id: tenantId, model_type: modelType }) {
          if (tenantId !== TENANT_ID) return [];
          if (modelType === "Matter") {
            return [{
              tenant_id: TENANT_ID,
              model_type: "Matter",
              matter_id: MATTER_ID,
              status: state.matterStatus,
            }];
          }
          if (modelType === "MatterMember") {
            return [{
              tenant_id: TENANT_ID,
              model_type: "MatterMember",
              matter_id: MATTER_ID,
              member_id: "member-departing",
              employee_id: "emp-001",
              role: "responsible_attorney",
              status: state.memberStatus,
              valid_from: "2026-01-01",
              valid_to: null,
            }];
          }
          return [];
        },
      },
    },
  };
}

function createSyntheticAccessAuthority(patch = {}) {
  const state = {
    revoked: true,
    evidence_ref: ACCESS_EVIDENCE_REF,
    offboarding_id: null,
    access_source_version: createOffboardingSourceVersion({
      system_ref: "IdP:core",
      revoked: true,
      confirmation_ref: ACCESS_EVIDENCE_REF,
    }),
    ...patch,
  };
  return {
    state,
    source: {
      read({ tenant_id, offboarding_id, employee_id, system_ref }) {
        return {
          tenant_id,
          offboarding_id: state.offboarding_id ?? offboarding_id,
          employee_id,
          system_ref,
          revoked: state.revoked,
          evidence_ref: state.evidence_ref,
          access_source_version: state.access_source_version,
        };
      },
    },
  };
}

function createRuntime(accessAuthority) {
  assert.ok(accessAuthority?.source, "test must inject a synthetic access authority");
  const store = createFileHrxStore();
  runHrxMigrations(store);
  const context = createHrxRuntimeContext({
    store,
    clock: () => NOW,
    offboardingAccessSource: accessAuthority.source,
  });
  context.repository.createEmployee({
    tenant_id: TENANT_ID,
    employee_id: "emp-001",
    display_name: "퇴사 예정 구성원",
    status: "active",
    source_ref: "HRX:test:offboarding",
  });
  context.repository.createEmployeeUserLink({
    tenant_id: TENANT_ID,
    link_id: "link-departing",
    employee_id: "emp-001",
    user_id: "user-departing",
    purpose: "login_mapping",
    source_ref: "IAM:test:user-departing",
  });
  return {
    store,
    context,
    accessAuthority,
  };
}

function recordMatterEvidence(context, matterContext, category, subjectRef, evidenceRef) {
  return request(
    context,
    matterContext,
    "user-people-ops-reviewer",
    `/api/hrx/lifecycle/offboarding/${OFFBOARDING_ID}/evidence`,
    "POST",
    {
      category,
      subject_ref: subjectRef,
      evidence_ref: evidenceRef,
      valid_until: VALID_UNTIL,
    },
  );
}

test("offboarding close requires current Matter evidence and atomically revokes linked accounts", () => {
  const runtime = createRuntime(createSyntheticAccessAuthority());
  const { context } = runtime;
  const matter = mutableMatterContext();
  const initialLinks = context.repository.listEmployeeUserLinks({
    tenant_id: TENANT_ID,
    employee_id: "emp-001",
  });
  assert.ok(initialLinks.length > 0);

  const blockedByMatter = request(
    context,
    matter.context,
    "user-people-ops-reviewer",
    `/api/hrx/lifecycle/offboarding/${OFFBOARDING_ID}/close`,
    "POST",
  );
  assert.equal(blockedByMatter.status, 409);
  assert.equal(blockedByMatter.body.safe_error_code, "HRX_OFFBOARDING_OPERATIONAL_CLOSE_BLOCKED");
  assert.equal(
    blockedByMatter.body.decision.blockers.some((blocker) => blocker.code === "active_matter_assignment"),
    true,
  );

  const selfConfirmation = request(
    context,
    matter.context,
    initialLinks[0].user_id,
    `/api/hrx/lifecycle/offboarding/${OFFBOARDING_ID}/evidence`,
    "POST",
    {
      category: "matter_reassignment",
      subject_ref: MATTER_ID,
      evidence_ref: `MatterHandover:${OFFBOARDING_ID}:${MATTER_ID}`,
      valid_until: VALID_UNTIL,
    },
  );
  assert.equal(selfConfirmation.status, 409);
  assert.equal(selfConfirmation.body.safe_error_code, "HRX_OFFBOARDING_SELF_CONFIRMATION_BLOCKED");

  const evidenceBeforeReassignment = recordMatterEvidence(
    context,
    matter.context,
    "matter_reassignment",
    MATTER_ID,
    `MatterHandover:${OFFBOARDING_ID}:${MATTER_ID}`,
  );
  assert.equal(evidenceBeforeReassignment.status, 409);
  assert.equal(
    evidenceBeforeReassignment.body.safe_error_code,
    "HRX_OFFBOARDING_EVIDENCE_SOURCE_NOT_READY",
  );

  matter.state.memberStatus = "inactive";
  assert.equal(
    recordMatterEvidence(
      context,
      matter.context,
      "matter_reassignment",
      MATTER_ID,
      `MatterHandover:${OFFBOARDING_ID}:${MATTER_ID}`,
    ).status,
    201,
  );
  assert.equal(
    recordMatterEvidence(
      context,
      matter.context,
      "handover",
      "handover-matter-files",
      `MatterHandover:${OFFBOARDING_ID}:${MATTER_ID}`,
    ).status,
    201,
  );

  matter.state.matterStatus = "closed";
  const stale = request(
    context,
    matter.context,
    "user-people-ops-reviewer",
    `/api/hrx/lifecycle/offboarding/${OFFBOARDING_ID}/close`,
    "POST",
  );
  assert.equal(stale.status, 409);
  assert.equal(
    stale.body.decision.blockers.some((blocker) => blocker.code === "evidence_source_stale"),
    true,
  );

  assert.equal(
    recordMatterEvidence(
      context,
      matter.context,
      "matter_reassignment",
      MATTER_ID,
      `MatterHandover:${OFFBOARDING_ID}:${MATTER_ID}`,
    ).status,
    201,
  );
  assert.equal(
    recordMatterEvidence(
      context,
      matter.context,
      "handover",
      "handover-matter-files",
      `MatterHandover:${OFFBOARDING_ID}:${MATTER_ID}`,
    ).status,
    201,
  );

  const closed = request(
    context,
    matter.context,
    "user-people-ops-reviewer",
    `/api/hrx/lifecycle/offboarding/${OFFBOARDING_ID}/close`,
    "POST",
  );
  assert.equal(closed.status, 200, JSON.stringify(closed.body));
  assert.equal(closed.body.offboarding.state, "closed");
  assert.equal(closed.body.operational_close.ready, true);
  assert.deepEqual(closed.body.account_revocation.revoked_link_ids, initialLinks.map((link) => link.link_id));
  assert.equal(
    context.repository.listEmployeeUserLinks({
      tenant_id: TENANT_ID,
      employee_id: "emp-001",
    }).length,
    0,
  );

  const readback = request(
    context,
    matter.context,
    "user-people-ops-reviewer",
    "/api/hrx/lifecycle/offboarding",
  );
  const closedReadback = readback.body.offboarding.find(
    (item) => item.offboarding_id === OFFBOARDING_ID,
  );
  assert.equal(closedReadback.state, "closed");
  assert.equal(closedReadback.operational_close.ready, true);
  assert.equal(
    context.audit.list({ tenant_id: TENANT_ID })
      .some((event) =>
        event.action === "hrx.offboarding.close" &&
        event.metadata.revoked_employee_user_link_count === initialLinks.length),
    true,
  );
  runtime.store.close();
});

test("offboarding evidence route rejects arbitrary and stale client pointers", () => {
  const runtime = createRuntime(createSyntheticAccessAuthority());
  const { context } = runtime;
  const matter = mutableMatterContext();
  matter.state.memberStatus = "inactive";

  const arbitrary = request(
    context,
    matter.context,
    "user-people-ops-reviewer",
    `/api/hrx/lifecycle/offboarding/${OFFBOARDING_ID}/evidence`,
    "POST",
    {
      category: "matter_reassignment",
      subject_ref: "matter-not-on-case",
      evidence_ref: "MatterHandover:forged",
      valid_until: VALID_UNTIL,
    },
  );
  assert.equal(arbitrary.status, 400);
  assert.equal(arbitrary.body.safe_error_code, "HRX_OFFBOARDING_EVIDENCE_POINTER_INVALID");

  const staleVersion = request(
    context,
    matter.context,
    "user-people-ops-reviewer",
    `/api/hrx/lifecycle/offboarding/${OFFBOARDING_ID}/evidence`,
    "POST",
    {
      category: "matter_reassignment",
      subject_ref: MATTER_ID,
      evidence_ref: `MatterHandover:${OFFBOARDING_ID}:${MATTER_ID}`,
      source_version: "sha256:stale-client-version",
      valid_until: VALID_UNTIL,
    },
  );
  assert.equal(staleVersion.status, 409);
  assert.equal(staleVersion.body.safe_error_code, "HRX_OFFBOARDING_EVIDENCE_SOURCE_STALE");
  runtime.store.close();
});

test("offboarding creation cannot self-attest completed leave reconciliation", () => {
  const runtime = createRuntime(createSyntheticAccessAuthority());
  const created = request(
    runtime.context,
    null,
    "user-people-ops-reviewer",
    "/api/hrx/lifecycle/offboarding",
    "POST",
    {
      offboarding_id: "off-forged-leave",
      employee_id: "emp-001",
      separation_date: "2026-08-31",
      leave_reconciliation_status: "approved_and_synced",
      leave_reconciliation_evidence_ref: "PayrollProviderReceipt:forged",
    },
  );
  assert.equal(created.status, 400);
  assert.equal(
    created.body.safe_error_code,
    "HRX_OFFBOARDING_LEAVE_EVIDENCE_FORBIDDEN",
  );
  assert.equal(
    runtime.context.offboardingCases.some(
      (item) => item.offboarding_id === "off-forged-leave",
    ),
    false,
  );
  runtime.store.close();
});

test("offboarding access authority must bind evidence to the exact case", () => {
  const authority = createSyntheticAccessAuthority({
    offboarding_id: "off-previous-employment",
  });
  const runtime = createRuntime(authority);
  const evidenceCount = runtime.context.offboardingEvidence.length;
  const response = request(
    runtime.context,
    null,
    "user-people-ops-reviewer",
    `/api/hrx/lifecycle/offboarding/${OFFBOARDING_ID}/evidence`,
    "POST",
    {
      category: "access_revocation",
      subject_ref: "IdP:core",
      evidence_ref: authority.state.evidence_ref,
      source_version: authority.state.access_source_version,
      valid_until: VALID_UNTIL,
    },
  );
  assert.equal(response.status, 503);
  assert.equal(
    response.body.safe_error_code,
    "HRX_OFFBOARDING_ACCESS_SOURCE_INVALID",
  );
  assert.equal(runtime.context.offboardingEvidence.length, evidenceCount);
  runtime.store.close();
});

test("offboarding access evidence ignores forged case-local state and requires current authority evidence", () => {
  const authority = createSyntheticAccessAuthority({
    revoked: false,
    evidence_ref: "AccessAuthority:off-001:idp-core",
    access_source_version: "access-authority:v1",
  });
  const runtime = createRuntime(authority);
  const { context } = runtime;
  const matter = mutableMatterContext();
  matter.state.memberStatus = "inactive";

  const forgedCaseEvidence = request(
    context,
    null,
    "user-people-ops-reviewer",
    `/api/hrx/lifecycle/offboarding/${OFFBOARDING_ID}/evidence`,
    "POST",
    {
      category: "access_revocation",
      subject_ref: "IdP:core",
      evidence_ref: ACCESS_EVIDENCE_REF,
      valid_until: VALID_UNTIL,
    },
  );
  assert.equal(forgedCaseEvidence.status, 400);
  assert.equal(
    forgedCaseEvidence.body.safe_error_code,
    "HRX_OFFBOARDING_EVIDENCE_POINTER_INVALID",
  );

  const notRevoked = request(
    context,
    null,
    "user-people-ops-reviewer",
    `/api/hrx/lifecycle/offboarding/${OFFBOARDING_ID}/evidence`,
    "POST",
    {
      category: "access_revocation",
      subject_ref: "IdP:core",
      evidence_ref: authority.state.evidence_ref,
      valid_until: VALID_UNTIL,
    },
  );
  assert.equal(notRevoked.status, 409);
  assert.equal(
    notRevoked.body.safe_error_code,
    "HRX_OFFBOARDING_EVIDENCE_SOURCE_NOT_READY",
  );

  authority.state.revoked = true;
  const recorded = request(
    context,
    null,
    "user-people-ops-reviewer",
    `/api/hrx/lifecycle/offboarding/${OFFBOARDING_ID}/evidence`,
    "POST",
    {
      category: "access_revocation",
      subject_ref: "IdP:core",
      evidence_ref: authority.state.evidence_ref,
      source_version: authority.state.access_source_version,
      valid_until: VALID_UNTIL,
    },
  );
  assert.equal(recorded.status, 201, JSON.stringify(recorded.body));
  assert.equal(recorded.body.receipt.source_version, "access-authority:v1");

  authority.state.access_source_version = "access-authority:v2";
  const stale = request(
    context,
    matter.context,
    "user-people-ops-reviewer",
    `/api/hrx/lifecycle/offboarding/${OFFBOARDING_ID}/close`,
    "POST",
  );
  assert.equal(stale.status, 409);
  assert.equal(
    stale.body.decision.blockers.some(
      (blocker) =>
        blocker.category === "access_revocation" &&
        blocker.code === "evidence_source_stale",
    ),
    true,
  );

  const evidenceCountBeforeInvalidSource = context.offboardingEvidence.length;
  authority.state.evidence_ref = "";
  const invalidSource = request(
    context,
    null,
    "user-people-ops-reviewer",
    `/api/hrx/lifecycle/offboarding/${OFFBOARDING_ID}/evidence`,
    "POST",
    {
      category: "access_revocation",
      subject_ref: "IdP:core",
      evidence_ref: "forged:missing-authority-ref",
      valid_until: VALID_UNTIL,
    },
  );
  assert.equal(invalidSource.status, 503);
  assert.equal(
    invalidSource.body.safe_error_code,
    "HRX_OFFBOARDING_ACCESS_SOURCE_INVALID",
  );
  assert.equal(context.offboardingEvidence.length, evidenceCountBeforeInvalidSource);

  const noAccessCase = {
    tenant_id: TENANT_ID,
    offboarding_id: "off-no-access-scope",
    employee_id: "emp-001",
    separation_date: "2026-07-31",
    state: "open",
    template_ref: null,
    template_snapshot: null,
    tasks: [],
    leave_reconciliation_status: "approved_and_synced",
    leave_reconciliation_evidence_ref: "PayrollProviderReceipt:no-access",
    access_revocations: [],
    document_returns: [],
    legal_hold_checks: [],
    matter_reassignments: [],
    handover_items: [],
  };
  context.durableCollections.offboardingCases.insert(noAccessCase);
  context.offboardingCases.push(noAccessCase);
  const missingAccessScope = request(
    context,
    mutableMatterContext().context,
    "user-people-ops-reviewer",
    "/api/hrx/lifecycle/offboarding/off-no-access-scope/close",
    "POST",
  );
  assert.equal(missingAccessScope.status, 409);
  assert.equal(
    missingAccessScope.body.safe_error_code,
    "HRX_OFFBOARDING_ACCESS_SCOPE_REQUIRED",
  );
  runtime.store.close();
});
