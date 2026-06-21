import assert from "node:assert/strict";
import test from "node:test";
import {
  assertBreakGlassLocked,
  createLockedBreakGlassPlaceholder,
  createLocalDevAuthProvider,
  deriveServerPrincipal,
  emitAuthAuditEvent
} from "../src/index.js";
import { createPersistenceConnection, listPendingOutboxEvents } from "../../persistence/src/index.js";

test("Break-glass placeholder remains locked before owner gate", () => {
  const placeholder = createLockedBreakGlassPlaceholder();
  assert.equal(placeholder.locked, true);
  assert.equal(placeholder.runtime_use_allowed, false);
  assert.equal(assertBreakGlassLocked(placeholder), true);
  assert.throws(() => assertBreakGlassLocked({ locked: false, runtime_use_allowed: true }), /break-glass runtime use is locked/);
});

test("Auth audit hook emits tenant-scoped synthetic outbox event", () => {
  const provider = createLocalDevAuthProvider({
    subjects: [
      {
        synthetic_token: "token-a",
        user_id: "user-a",
        assurance_level: "mfa",
        tenant_memberships: [{ tenant_id: "tenant-a", role_ids: ["attorney"] }]
      }
    ]
  });
  const principal = deriveServerPrincipal({
    provider,
    trustedTenantId: "tenant-a",
    request_id: "req-audit",
    request: { headers: { authorization: "Bearer token-a" } }
  });
  const connection = createPersistenceConnection({ url: "lawos-synthetic://runtime-spine?root=" });
  emitAuthAuditEvent(connection, {
    principal,
    action: "matter.read",
    decision: { effect: "allow", reason: "allow_rule" },
    request_id: "req-audit"
  });
  const events = listPendingOutboxEvents(connection, { tenant_id: "tenant-a" });
  assert.equal(events.length, 1);
  assert.equal(events[0].topic, "runtime-auth.audit");
  assert.equal(events[0].payload.server_derived_principal, true);
  assert.equal(listPendingOutboxEvents(connection, { tenant_id: "tenant-b" }).length, 0);
  connection.close();
});
