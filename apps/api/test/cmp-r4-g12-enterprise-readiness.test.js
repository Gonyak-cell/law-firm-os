import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { PERMISSION_CONTEXT_HEADER } from "../src/permission-gate.js";
import { startApiServer } from "../src/server.js";

const TENANT = "tenant_cmp_g12_synthetic";
const BASE_QUERY = `tenant_id=${TENANT}&permission_ref=perm_ref_cmp_g12_read&audit_hint_ref=audit_hint_cmp_g12_read`;

function permissionContext(effect = "allow") {
  return JSON.stringify({
    principal: { user_id: "user_cmp_g12_enterprise", tenant_id: TENANT, role_ids: ["enterprise_operator"] },
    rules: [{ id: `rule_enterprise_${effect}`, effect, action: "*" }],
    object_acl: [],
  });
}

async function withServer(callback, options = {}) {
  const started = await startApiServer({ port: 0, ...options });
  try {
    return await callback(`http://${started.host}:${started.port}`);
  } finally {
    await new Promise((resolve) => started.server.close(resolve));
  }
}

async function json(baseUrl, path, options = {}) {
  const headers = {
    [PERMISSION_CONTEXT_HEADER]: permissionContext(),
    ...(options.headers ?? {}),
  };
  if (options.body && !headers["content-type"]) headers["content-type"] = "application/json";
  const response = await fetch(`${baseUrl}${path}`, { ...options, headers });
  const body = await response.json();
  return { status: response.status, body };
}

test("G12 Enterprise readiness API health descriptor exposes owner-decision readiness without production claim", async () => {
  await withServer(async (baseUrl) => {
    const { status, body } = await json(baseUrl, "/api/health");
    const enterprise = body.bounded_contexts.find((item) => item.bounded_context === "enterprise-readiness");
    assert.equal(status, 200);
    assert.equal(enterprise.runtime_write_ready, true);
    assert.equal(enterprise.r5_r6_owner_decision_ready, true);
    assert.equal(enterprise.production_ready_claim, false);
    assert.equal(enterprise.go_live_approved, false);
  });
});

test("G12 Enterprise readiness reads return 28 controls and remain permission gated", async () => {
  await withServer(async (baseUrl) => {
    const readiness = await json(baseUrl, `/api/enterprise/readiness?${BASE_QUERY}`);
    assert.equal(readiness.status, 200);
    assert.equal(readiness.body.items.length, 28);
    assert.equal(readiness.body.items.every((item) => item.owner_decision_required === true), true);
    assert.equal(readiness.body.production_ready_claim, false);
    assert.equal(readiness.body.go_live_approved, false);

    const denied = await json(baseUrl, `/api/enterprise/readiness?${BASE_QUERY}`, {
      headers: { [PERMISSION_CONTEXT_HEADER]: undefined },
    });
    assert.equal(denied.status, 403);
    assert.equal(denied.body.count_leak_prevented, true);
  });
});

test("G12 Enterprise writes persist release and go/no-go evidence across restart", async () => {
  const enterpriseReadinessStorePath = join(mkdtempSync(join(tmpdir(), "enterprise-api-g12-")), "enterprise-readiness.json");
  await withServer(async (baseUrl) => {
    const item = await json(baseUrl, "/api/enterprise/items", {
      method: "POST",
      body: JSON.stringify({
        tenant_id: TENANT,
        permission_ref: "perm_ref_cmp_g12_write",
        audit_hint_ref: "audit_hint_cmp_g12_write",
        actor_id: "user_cmp_g12_enterprise",
        idempotency_key: "api-enterprise-item-g12-1",
        enterprise_item: {
          enterprise_item_id: "enterprise_item_cmp_g12_api_001",
          tenant_id: TENANT,
          tuw_id: "CMP-G12-W12-T012",
          item_type: "security-regression-suite",
          control_ref: "security-regression",
          evidence_refs: ["apps/api/test/cmp-r4-g12-enterprise-readiness.test.js"],
        },
      }),
    });
    assert.equal(item.status, 201);
    assert.equal(item.body.item.production_ready_claim, false);

    const rc = await json(baseUrl, "/api/enterprise/release-candidates", {
      method: "POST",
      body: JSON.stringify({
        tenant_id: TENANT,
        permission_ref: "perm_ref_cmp_g12_write",
        audit_hint_ref: "audit_hint_cmp_g12_write",
        actor_id: "user_cmp_g12_enterprise",
        idempotency_key: "api-rc-g12-1",
        release_candidate: {
          release_candidate_id: "rc_cmp_g12_api_001",
          tenant_id: TENANT,
          validation_refs: ["npm run client-matter:cmp-v1:g12:validate"],
        },
      }),
    });
    assert.equal(rc.status, 201);

    const decision = await json(baseUrl, "/api/enterprise/go-no-go", {
      method: "POST",
      body: JSON.stringify({
        tenant_id: TENANT,
        permission_ref: "perm_ref_cmp_g12_write",
        audit_hint_ref: "audit_hint_cmp_g12_write",
        actor_id: "user_cmp_g12_enterprise",
        idempotency_key: "api-go-no-go-g12-1",
        go_no_go: {
          go_no_go_id: "go_no_go_cmp_g12_api_001",
          tenant_id: TENANT,
          decision: "pending_owner_approval",
          owner_approved: false,
          release_gate_passed: false,
        },
      }),
    });
    assert.equal(decision.status, 201);
    assert.equal(decision.body.item.go_live_approved, false);
  }, { enterpriseReadinessStorePath });

  await withServer(async (baseUrl) => {
    const audit = await json(baseUrl, `/api/enterprise/audit?${BASE_QUERY}`);
    assert.ok(audit.body.items.some((event) => event.action === "enterprise.release_candidate.record"));
    assert.ok(audit.body.items.some((event) => event.action === "enterprise.go_no_go.record"));
  }, { enterpriseReadinessStorePath });
});

test("G12 Enterprise write APIs reject premature go and production-ready claims", async () => {
  await withServer(async (baseUrl) => {
    const blocked = await json(baseUrl, "/api/enterprise/go-no-go", {
      method: "POST",
      body: JSON.stringify({
        tenant_id: TENANT,
        permission_ref: "perm_ref_cmp_g12_write",
        audit_hint_ref: "audit_hint_cmp_g12_write",
        actor_id: "user_cmp_g12_enterprise",
        idempotency_key: "api-go-no-go-g12-blocked",
        go_no_go: {
          go_no_go_id: "go_no_go_cmp_g12_blocked",
          tenant_id: TENANT,
          decision: "go",
          owner_approved: false,
          release_gate_passed: false,
        },
      }),
    });
    assert.equal(blocked.status, 400);
  });
});
