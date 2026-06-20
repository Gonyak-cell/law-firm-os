import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  createBreakGlassService,
  createEthicalWallStore,
  createLegalHoldStore,
  createObjectAclStore,
  createPermissionContextStore,
  createPolicyStore,
  minimizeForPrivacy,
} from "../src/index.js";
import { createIdempotencyStore } from "../../platform/src/index.js";

const TENANT = "tenant_cmp_g1";

function tempFile(name) {
  return join(mkdtempSync(join(tmpdir(), "cmp-g1-authz-")), name);
}

test("G1 permission context store persists write, audit, and idempotency evidence", () => {
  const filePath = tempFile("permission-context.json");
  const store = createPermissionContextStore({ filePath });
  const context = {
    context_id: "ctx-matter-read",
    principal: { tenant_id: TENANT, user_id: "user-001" },
    rules: [{ id: "allow-read", effect: "allow", action: "matter.read" }],
    object_acl: [{ id: "acl-001", effect: "allow", principal_id: "user-001", action: "matter.read" }],
  };

  const first = store.savePermissionContext({ context, actor_id: "security-admin", idempotency_key: "ctx-key-001" });
  const replay = store.savePermissionContext({ context, actor_id: "security-admin", idempotency_key: "ctx-key-001" });

  assert.equal(first.idempotent_replay, false);
  assert.equal(first.item.record_type, "PermissionContext");
  assert.equal(first.item.writes_product_state, true);
  assert.equal(first.item.evaluates_runtime_permission, true);
  assert.equal(first.audit_event.action, "permission_context.save");
  assert.equal(replay.idempotent_replay, true);
  assert.equal(store.listAudit({ tenant_id: TENANT }).length, 1);
  assert.equal(existsSync(filePath), true);

  const persisted = JSON.parse(readFileSync(filePath, "utf8"));
  assert.equal(persisted.store_kind, "permission-context-store");
  assert.equal(persisted.records.length, 1);

  const reloaded = createPermissionContextStore({ filePath });
  assert.equal(reloaded.get({ tenant_id: TENANT, record_type: "PermissionContext", record_id: "ctx-matter-read" }).record_id, "ctx-matter-read");
});

test("G1 trust stores write policies, ACLs, walls, holds, and break-glass requests with audit events", () => {
  const actor_id = "security-admin";
  const policy = createPolicyStore({ filePath: tempFile("policy.json") });
  const acl = createObjectAclStore({ filePath: tempFile("acl.json") });
  const wall = createEthicalWallStore({ filePath: tempFile("wall.json") });
  const hold = createLegalHoldStore({ filePath: tempFile("hold.json") });
  const breakGlass = createBreakGlassService({ filePath: tempFile("break-glass.json") });

  const savedPolicy = policy.savePolicy({ policy: { tenant_id: TENANT, policy_id: "policy-001", effect: "deny" }, actor_id, idempotency_key: "policy-key" });
  const savedAcl = acl.saveObjectAcl({ acl: { tenant_id: TENANT, acl_id: "acl-001", resource_id: "matter-001", effect: "allow" }, actor_id, idempotency_key: "acl-key" });
  const savedWall = wall.saveEthicalWall({ wall: { tenant_id: TENANT, ethical_wall_id: "wall-001", restricted_principal_ids: ["user-002"] }, actor_id, idempotency_key: "wall-key" });
  const savedHold = hold.saveLegalHold({ hold: { tenant_id: TENANT, legal_hold_id: "hold-001", matter_id: "matter-001" }, actor_id, idempotency_key: "hold-key" });
  const savedBreakGlass = breakGlass.requestBreakGlass({
    request: { tenant_id: TENANT, break_glass_id: "bg-001", reason: "matter emergency", approval_required: true },
    actor_id,
    idempotency_key: "bg-key",
  });

  for (const result of [savedPolicy, savedAcl, savedWall, savedHold, savedBreakGlass]) {
    assert.equal(result.outcome, "updated");
    assert.equal(result.item.writes_product_state, true);
    assert.equal(result.item.writes_audit_event, true);
    assert.equal(result.item.production_ready_claim, false);
    assert.equal(result.audit_event.production_ready_claim, false);
  }
  assert.equal(savedBreakGlass.item.status, "approval_required");
});

test("G1 idempotency and privacy guards avoid replay drift and sensitive field exposure", () => {
  const idempotency = createIdempotencyStore({ filePath: tempFile("idempotency.json") });
  idempotency.save({ tenant_id: TENANT, idempotency_key: "write-key-001", operation: "matter.write", response: { ok: true } });

  assert.deepEqual(idempotency.get({ tenant_id: TENANT, idempotency_key: "write-key-001" }).response, { ok: true });

  const minimized = minimizeForPrivacy({
    tenant_id: TENANT,
    display_name: "Matter Alpha",
    secret: "do-not-emit",
    raw_payload: { nested: true },
  });
  assert.equal(minimized.display_name, "Matter Alpha");
  assert.equal(minimized.secret, "[omitted]");
  assert.equal(minimized.raw_payload, "[omitted]");
  assert.equal(minimized.privacy_minimized, true);
  assert.equal(minimized.production_ready_claim, false);
});
