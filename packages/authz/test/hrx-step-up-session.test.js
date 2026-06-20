import assert from "node:assert/strict";
import test from "node:test";
import {
  createHrxStepUpSession,
  createInMemoryHrxStepUpSessionStore,
  isHrxStepUpSessionFresh,
} from "../src/hrx-step-up-session.js";

const context = Object.freeze({ tenant_id: "tenant-a", actor_id: "hr-001" });

test("HRX step-up session requires fresh MFA assurance and tenant actor binding", () => {
  const session = createHrxStepUpSession({
    tenant_id: "tenant-a",
    actor_id: "hr-001",
    purpose: "audit_read",
    mfa: true,
    assurance_level: 2,
    issued_at: "2026-06-20T00:00:00.000Z",
    expires_at: "2026-06-20T00:05:00.000Z",
  });
  assert.equal(isHrxStepUpSessionFresh(session, { context, now: "2026-06-20T00:01:00.000Z" }), true);
  assert.equal(isHrxStepUpSessionFresh(session, { context, now: "2026-06-20T00:06:00.000Z" }), false);
  assert.equal(
    isHrxStepUpSessionFresh(session, { context: { tenant_id: "tenant-a", actor_id: "other" }, now: "2026-06-20T00:01:00.000Z" }),
    false,
  );
});

test("HRX step-up session store issues verifies and revokes sessions", () => {
  const store = createInMemoryHrxStepUpSessionStore({ clock: () => "2026-06-20T00:00:00.000Z" });
  const session = store.issue({
    tenant_id: "tenant-a",
    actor_id: "hr-001",
    purpose: "payroll_preview",
    mfa: true,
    assurance_level: 2,
  });
  assert.equal(store.verify(session.session_id, { context, now: "2026-06-20T00:01:00.000Z" }), true);
  assert.equal(store.list({ tenant_id: "tenant-a", actor_id: "hr-001" }).length, 1);
  store.revoke(session.session_id, { revoked_at: "2026-06-20T00:02:00.000Z" });
  assert.equal(store.verify(session.session_id, { context, now: "2026-06-20T00:03:00.000Z" }), false);
});

test("HRX step-up session rejects weak or non-MFA evidence", () => {
  assert.throws(
    () => createHrxStepUpSession({ tenant_id: "tenant-a", actor_id: "hr-001", purpose: "audit_read", mfa: false, assurance_level: 2 }),
    /mfa must be true/,
  );
  assert.throws(
    () => createHrxStepUpSession({ tenant_id: "tenant-a", actor_id: "hr-001", purpose: "audit_read", mfa: true, assurance_level: 1 }),
    /assurance_level/,
  );
});
