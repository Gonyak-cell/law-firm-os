import assert from "node:assert/strict";
import test from "node:test";
import { withPostgresTransaction } from "../../../packages/persistence/src/postgres/transaction.js";
import { createMigratedPostgresFixture } from "../../../packages/persistence/test/helpers/disposable-postgres.js";
import { createPostgresIdentityLedger } from "../../../packages/runtime-auth/src/postgres-identity-ledger.js";

const TENANT = "tenant_break_glass_multi_approval";

test("break-glass requires a separate minimum-privilege account and two immutable distinct approvals", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  const now = Date.parse("2026-07-18T08:00:00.000Z");
  const ledger = createPostgresIdentityLedger({ pool: fixture.appPool, clock: () => now });
  const requester = { user_id: "requester-break-glass", email: "requester@example.test", account_status: "active" };
  const request = await ledger.createBreakGlassRequest({
    tenant_id: TENANT,
    break_glass_request_id: "break-glass-multi-001",
    requester,
    requester_label: "security requestor",
    reason: "bounded emergency access test",
    break_glass_account_ref: "secretsmanager://lawos/break-glass/account",
    actor_id: "security-operator",
  });
  assert.equal(request.state, "pending");
  assert.equal(request.minimum_privilege_profile, "break_glass_minimum");
  assert.equal(request.required_approvals, 2);
  assert.equal(request.approval_count, 0);

  await assert.rejects(
    withPostgresTransaction(fixture.appPool, { tenant_id: TENANT }, (client) => client.query(
      `UPDATE lawos_identity.break_glass_requests
          SET approval_count = required_approvals, state = 'approved', activated_at = clock_timestamp()
        WHERE tenant_id = $1 AND break_glass_request_id = $2`,
      [TENANT, request.break_glass_request_id],
    )),
    (error) => error?.postgres_code === "55000" || error?.code === "LAWOS_POSTGRES_ACCESS_DENIED",
  );

  const selfApproval = await ledger.transitionBreakGlassRequest({
    tenant_id: TENANT,
    break_glass_request_id: request.break_glass_request_id,
    state: "approved",
    actor_id: requester.user_id,
  });
  assert.equal(selfApproval.ok, false);
  assert.equal(selfApproval.safe_error_code, "ADMIN_SECURITY_BREAK_GLASS_SELF_APPROVAL_DENIED");

  const first = await ledger.transitionBreakGlassRequest({
    tenant_id: TENANT,
    break_glass_request_id: request.break_glass_request_id,
    state: "approved",
    actor_id: "security-approver-1",
    evidence_sha256: "a".repeat(64),
  });
  assert.equal(first.record.state, "pending");
  assert.equal(first.record.approval_count, 1);
  assert.equal(first.approvals_remaining, 1);
  const replay = await ledger.transitionBreakGlassRequest({
    tenant_id: TENANT,
    break_glass_request_id: request.break_glass_request_id,
    state: "approved",
    actor_id: "security-approver-1",
    evidence_sha256: "a".repeat(64),
  });
  assert.equal(replay.replayed, true);
  assert.equal(replay.record.approval_count, 1);

  const second = await ledger.transitionBreakGlassRequest({
    tenant_id: TENANT,
    break_glass_request_id: request.break_glass_request_id,
    state: "approved",
    actor_id: "security-approver-2",
    evidence_sha256: "b".repeat(64),
  });
  assert.equal(second.record.state, "approved");
  assert.equal(second.record.approval_count, 2);
  assert.ok(second.record.activated_at);

  await assert.rejects(
    withPostgresTransaction(fixture.appPool, { tenant_id: TENANT }, (client) => client.query(
      `UPDATE lawos_identity.break_glass_requests SET break_glass_account_ref = 'changed' WHERE tenant_id = $1 AND break_glass_request_id = $2`,
      [TENANT, request.break_glass_request_id],
    )),
    (error) => error?.postgres_code === "55000" || error?.code === "LAWOS_POSTGRES_ACCESS_DENIED",
  );
  await assert.rejects(
    withPostgresTransaction(fixture.appPool, { tenant_id: TENANT }, (client) => client.query(
      `UPDATE lawos_identity.break_glass_approvals SET approver_id = 'changed' WHERE tenant_id = $1 AND break_glass_request_id = $2`,
      [TENANT, request.break_glass_request_id],
    )),
    (error) => error?.postgres_code === "55000" || error?.code === "LAWOS_POSTGRES_ACCESS_DENIED",
  );
  assert.deepEqual(await ledger.listBreakGlassRequests({ tenant_id: "tenant_break_glass_other" }), []);
  const audit = await ledger.listSecurityAudit({ tenant_id: TENANT });
  const actions = audit.map((event) => event.action);
  assert.equal(actions.filter((action) => action === "admin.security.break_glass.approval_recorded").length, 2);
  assert.equal(actions.includes("admin.security.break_glass.approved"), true);
  assert.equal(JSON.stringify(audit).includes(request.break_glass_account_ref), false);
});
