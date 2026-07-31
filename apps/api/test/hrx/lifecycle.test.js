import assert from "node:assert/strict";
import test from "node:test";
import { createHrxAuditEventStore } from "../../../../packages/audit/src/hrx-event-store.js";
import { createHrxLifecycleRoute } from "../../src/routes/hrx/lifecycle.js";

const context = Object.freeze({ tenant_id: "tenant-a", actor_id: "people-ops-001" });

test("lifecycle route manages onboarding plan and task updates with audit", async () => {
  const audit = createHrxAuditEventStore();
  const route = createHrxLifecycleRoute({ audit });
  const created = await route.handle({
    method: "POST",
    context,
    params: { resource: "onboarding" },
    body: {
      onboarding_id: "onb-001",
      employee_id: "emp-001",
      start_date: "2026-08-01",
      tasks: [{ task_id: "task-001", title: "Complete policy acknowledgement", owner_role: "people_ops" }],
      document_refs: ["DocRef:policy-ack-001"],
      access_requests: [{ request_id: "access-001", system_ref: "DMS", access_level: "associate" }],
    },
  });
  assert.equal(created.status, 201);
  assert.equal(created.body.onboarding.tasks[0].status, "pending");

  const updated = await route.handle({
    method: "POST",
    context,
    params: { resource: "onboarding_task", onboarding_id: "onb-001", task_id: "task-001" },
    body: { status: "completed" },
  });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.onboarding.tasks[0].status, "completed");
  assert.deepEqual(
    audit.list({ tenant_id: "tenant-a" }).map((event) => event.action),
    ["hrx.onboarding.create", "hrx.onboarding.task.update"],
  );
});

test("lifecycle route closes only authoritative offboarding evidence", async () => {
  const audit = createHrxAuditEventStore();
  const base = {
    tenant_id: context.tenant_id,
    employee_id: "emp-001",
    separation_date: "2026-08-31",
    document_returns: [{ document_ref: "Laptop:asset-001", returned: true }],
  };
  const route = createHrxLifecycleRoute({
    audit,
    seed: { offboarding: [
      {
        ...base,
        offboarding_id: "off-pending",
        access_revocations: [{ system_ref: "DMS", revoked: true }],
        legal_hold_checks: [{ hold_ref: "HoldCheck:001", clear: false }],
        matter_reassignments: [{ matter_id: "matter-001", reassigned: false }],
        handover_items: [{ item_id: "handover-001", title: "Matter handover", completed: false }],
        leave_reconciliation_status: "pending",
      },
      {
        ...base,
        offboarding_id: "off-ready",
        access_revocations: [{ system_ref: "DMS", revoked: true, confirmation_ref: "LX-11:AccessRevocation:001" }],
        legal_hold_checks: [{ hold_ref: "HoldCheck:001", clear: true }],
        matter_reassignments: [{ matter_id: "matter-001", reassigned_to_employee_id: "emp-002", reassigned: true, handover_ref: "Handover:001" }],
        handover_items: [{ item_id: "handover-001", title: "Matter handover", completed: true }],
        leave_reconciliation_status: "approved_and_synced",
        leave_reconciliation_evidence_ref: "PayrollProviderReceipt:off-ready",
      },
    ] },
  });

  const blocked = await route.handle({
    method: "POST",
    context,
    params: { resource: "offboarding_close", offboarding_id: "off-pending" },
    body: {},
  });
  assert.equal(blocked.status, 400);

  const forgedCreation = await route.handle({
    method: "POST",
    context,
    params: { resource: "offboarding" },
    body: {
      offboarding_id: "off-forged",
      employee_id: "emp-001",
      separation_date: "2026-09-30",
      leave_reconciliation_status: "approved_and_synced",
      leave_reconciliation_evidence_ref: "PayrollProviderReceipt:forged",
    },
  });
  assert.equal(forgedCreation.status, 400);
  assert.equal(
    forgedCreation.body.safe_error_code,
    "HRX_OFFBOARDING_LEAVE_EVIDENCE_FORBIDDEN",
  );

  const forged = await route.handle({
    method: "POST",
    context,
    params: { resource: "offboarding_close", offboarding_id: "off-pending" },
    body: {
      legal_hold_checks: [{ hold_ref: "HoldCheck:001", clear: true }],
    },
  });
  assert.equal(forged.status, 400);
  assert.equal(forged.body.safe_error_code, "HRX_OFFBOARDING_EVIDENCE_MISMATCH");

  const closed = await route.handle({
    method: "POST",
    context,
    params: { resource: "offboarding_close", offboarding_id: "off-ready" },
    body: {},
  });
  assert.equal(closed.status, 200);
  assert.equal(closed.body.offboarding.state, "closed");
  assert.equal(audit.list({ tenant_id: "tenant-a" }).at(-1).action, "hrx.offboarding.close");
});

test("lifecycle route snapshots template versions, enforces dependencies, and isolates tenants", async () => {
  const audit = createHrxAuditEventStore();
  const templateV1 = {
    tenant_id: "tenant-a",
    template_id: "lawyer-onboarding",
    version: "1",
    lifecycle_kind: "onboarding",
    role_key: "lawyer",
    effective_from: "2026-01-01",
    tasks: [
      { task_id: "documents", title: "입사 서류 확인", owner_role: "people_ops", due_offset_days: -2 },
      {
        task_id: "account",
        title: "업무 계정 설정",
        owner_role: "it_ops",
        due_offset_days: 0,
        depends_on_task_ids: ["documents"],
      },
      { task_id: "default-security-training", title: "보안 교육", owner_role: "people_ops", due_offset_days: 1 },
      { task_id: "default-confidentiality-pledge", title: "비밀유지 서약", owner_role: "people_ops", due_offset_days: 1 },
    ],
  };
  const route = createHrxLifecycleRoute({
    audit,
    seed: {
      templates: [
        templateV1,
        { ...templateV1, tenant_id: "tenant-b" },
      ],
    },
  });

  const createdV1 = await route.handle({
    method: "POST",
    context,
    params: { resource: "onboarding" },
    body: {
      onboarding_id: "onb-template-v1",
      employee_id: "emp-001",
      start_date: "2026-08-01",
      template_id: "lawyer-onboarding",
      template_version: "1",
    },
  });
  assert.equal(createdV1.status, 201);
  assert.equal(createdV1.body.onboarding.template_ref.version, "1");
  assert.equal(
    createdV1.body.onboarding.tasks.find((task) => task.task_id === "documents").due_on,
    "2026-07-30",
  );

  const dependencyBlocked = await route.handle({
    method: "POST",
    context,
    params: {
      resource: "onboarding_task",
      onboarding_id: "onb-template-v1",
      task_id: "account",
    },
    body: { status: "completed" },
  });
  assert.equal(dependencyBlocked.status, 409);
  assert.equal(dependencyBlocked.body.safe_error_code, "HRX_LIFECYCLE_TASK_DEPENDENCY_INCOMPLETE");

  const templateV2 = await route.handle({
    method: "POST",
    context,
    params: { resource: "lifecycle_templates" },
    body: {
      ...templateV1,
      version: "2",
      effective_from: "2026-07-01",
      tasks: templateV1.tasks.map((task) =>
        task.task_id === "documents" ? { ...task, title: "입사 서류와 자격 확인" } : task),
    },
  });
  assert.equal(templateV2.status, 201);

  const readV1 = await route.handle({
    method: "GET",
    context,
    params: { resource: "onboarding" },
  });
  assert.equal(readV1.body.onboarding[0].template_ref.version, "1");
  assert.equal(
    readV1.body.onboarding[0].tasks.find((task) => task.task_id === "documents").title,
    "입사 서류 확인",
  );

  const failed = await route.handle({
    method: "POST",
    context,
    params: {
      resource: "onboarding_task",
      onboarding_id: "onb-template-v1",
      task_id: "documents",
    },
    body: { status: "failed", failure_reason: "문서 제공자 응답 지연" },
  });
  assert.equal(failed.status, 200);
  const retried = await route.handle({
    method: "POST",
    context,
    params: {
      resource: "onboarding_task",
      onboarding_id: "onb-template-v1",
      task_id: "documents",
    },
    body: { retry: true },
  });
  assert.equal(retried.body.onboarding.tasks.find((task) => task.task_id === "documents").status, "pending");

  const tenantBRead = await route.handle({
    method: "GET",
    context: { ...context, tenant_id: "tenant-b" },
    params: { resource: "onboarding" },
  });
  assert.deepEqual(tenantBRead.body.onboarding, []);
});
