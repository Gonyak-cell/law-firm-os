// Deterministic in-process tests for the CMP-G12 enterprise readiness runtime slice.
import test from "node:test";
import assert from "node:assert/strict";
import { startApiServer } from "../src/server.js";

const TENANT = "tenant-a";
const ACTOR = "cmp-g12-enterprise-actor";

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

test.before(async () => {
  const started = await startApiServer({ port: 0 });
  server = started.server;
  baseUrl = `http://${started.host}:${started.port}`;
});

test.after(() => new Promise((resolve) => server.close(resolve)));

test("CMP-G12 health descriptor exposes enterprise readiness after G11", async () => {
  const { status, body } = await json("/api/health");
  assert.equal(status, 200);
  const readiness = body.bounded_contexts.find((context) => context.bounded_context === "enterprise-readiness");
  assert.ok(readiness);
  assert.equal(readiness.cmp_gate, "CMP-G12");
  assert.equal(readiness.tuw_ids.length, 28);
  assert.equal(readiness.tuw_ids[0], "CMP-G12-W12-T001");
  assert.equal(readiness.tuw_ids.at(-1), "CMP-G12-W12-T028");
  assert.ok(readiness.depends_on.includes("CMP-G11-W11"));
  assert.equal(readiness.runtime_readiness_claim, "runtime_api_evidence_only__durable_persistence_open");
});

test("CMP-G12 runtime evidence covers all enterprise readiness TUWs and guardrails", async () => {
  const { status, body } = await json(`/api/enterprise-readiness/runtime/evidence?${query()}`);
  assert.equal(status, 200);
  assert.equal(body.evidence.item_count, 28);
  assert.equal(body.evidence.items.length, 28);
  assert.ok(body.evidence.guardrails.includes("migration_dry_run_vs_cutover_separation"));
  assert.ok(body.evidence.guardrails.includes("credential_reference_no_secret_exposure"));
  assert.equal(body.evidence.items.every((item) => item.enterprise_readiness_receipt.r4_claimed === false), true);
});

test("CMP-G12 admin IAM observability and operations routes require API context", async () => {
  for (const route of [
    "/admin/tenant-settings",
    "/admin/sso",
    "/admin/scim",
    "/admin/mfa",
    "/ops/metrics",
    "/ops/latency",
    "/ops/incidents",
    "/ops/deployments",
    "/ops/rollback-plans",
    "/ops/drills/backup-restore",
    "/ops/performance-smoke",
  ]) {
    const { status, body } = await json(`${route}?${query()}`, {
      method: "POST",
      body: JSON.stringify({ permission_receipt_id: `permission-${route}`, idempotency_key: `idem-${route}` }),
    });
    assert.equal(status, 200, route);
    assert.equal(body.descriptor.api_context.tenant_id, TENANT);
    assert.equal(body.descriptor.api_context.actor_id, ACTOR);
    assert.equal(body.descriptor.enterprise_readiness_receipt.product_state_written, false);
  }
});

test("CMP-G12 migration and integration routes preserve dry-run, human-review, and no-secret boundaries", async () => {
  const migration = await json(`/migration/batches?${query()}`, {
    method: "POST",
    body: JSON.stringify({ dry_run_only: true }),
  });
  assert.equal(migration.status, 200);
  assert.equal(migration.body.descriptor.enterprise_readiness_receipt.dry_run_only, true);

  const duplicateBlocked = await json(`/migration/validate/party?${query()}`, {
    method: "POST",
    body: JSON.stringify({ applies_cutover: true }),
  });
  assert.equal(duplicateBlocked.status, 400);
  assert.equal(duplicateBlocked.body.safe_error_code, "CMP_G12_RUNTIME_BOUNDARY_BLOCKED");

  for (const route of ["/migration/vault/dry-run", "/migration/finance/reconcile", "/admin/connectors"]) {
    const { status, body } = await json(`${route}?${query()}`, { method: "POST", body: JSON.stringify({ dry_run_only: true }) });
    assert.equal(status, 200, route);
    assert.equal(body.descriptor.enterprise_readiness_receipt.external_provider_called, false);
  }

  const credentialBlocked = await json(`/admin/credentials?${query()}`, {
    method: "POST",
    body: JSON.stringify({ secret_value: "plain-secret" }),
  });
  assert.equal(credentialBlocked.status, 400);
  assert.equal(credentialBlocked.body.safe_error_code, "CMP_G12_RUNTIME_BOUNDARY_BLOCKED");

  const accountingExport = await json(`/integrations/accounting/export?${query()}`, {
    method: "POST",
    body: JSON.stringify({ human_review_required: true }),
  });
  assert.equal(accountingExport.status, 200);
  assert.equal(accountingExport.body.descriptor.enterprise_readiness_receipt.human_review_required, true);
  assert.equal(accountingExport.body.descriptor.enterprise_readiness_receipt.external_provider_called, false);
});

test("CMP-G12 compliance UAT release launch and closeout routes block premature production claims", async () => {
  for (const route of [
    "/ops/security-regression",
    "/ops/permission-negative",
    "/ops/compliance/evidence-pack",
    "/ops/compliance/control-map",
    "/uat/scenarios",
    "/uat/feedback",
    "/ops/release-candidates",
    "/ops/go-no-go",
    "/ops/production-readiness",
    "/ops/enterprise-closeout",
  ]) {
    const { status, body } = await json(`${route}?${query()}`, {
      method: "POST",
      body: JSON.stringify({ human_review_required: true }),
    });
    assert.equal(status, 200, route);
    assert.equal(body.descriptor.enterprise_readiness_receipt.production_deployment_executed, false);
    assert.equal(body.descriptor.enterprise_readiness_receipt.r4_claimed, false);
  }

  const releaseBlocked = await json(`/ops/release-candidates?${query()}`, {
    method: "POST",
    body: JSON.stringify({ claims_go_live_approval: true }),
  });
  assert.equal(releaseBlocked.status, 400);
  assert.equal(releaseBlocked.body.safe_error_code, "CMP_G12_RUNTIME_BOUNDARY_BLOCKED");
});

test("CMP-G12 negative routes block secret exposure persistence writes external calls and R4 claims", async () => {
  for (const [route, payload] of [
    ["/api/enterprise-readiness/secret-exposure-test", { credential_value: "secret" }],
    ["/api/enterprise-readiness/persistence-write-test", { writes_product_state: true }],
    ["/api/enterprise-readiness/go-live-claim-test", { claims_r4: true }],
    ["/api/enterprise-readiness/go-live-claim-test", { production_release_executed: true }],
    ["/api/enterprise-readiness/go-live-claim-test", { calls_external_provider_api: true }],
  ]) {
    const { status, body } = await json(`${route}?${query()}`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    assert.equal(status, 400, route);
    assert.equal(body.safe_error_code, "CMP_G12_RUNTIME_BOUNDARY_BLOCKED");
    assert.equal(body.r4_claimed, false);
    assert.equal(body.production_deployment_executed, false);
  }
}
);
