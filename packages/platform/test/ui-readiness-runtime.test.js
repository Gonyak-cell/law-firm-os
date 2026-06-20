import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  adjudicateUiReadiness,
  createUiReadinessRepository,
  recordCriticalPathRun,
  recordUiReadinessCheck,
} from "../src/index.js";

const TENANT = "tenant-cmp-g11";
const ACTOR = "user-cmp-g11";

function createUiReadinessChain(repository) {
  const check = recordUiReadinessCheck({
    repository,
    ui_check: {
      ui_check_id: "ui-check-g11-001",
      tenant_id: TENANT,
      tuw_id: "CMP-G11-W11-T036",
      route_id: "ask",
      ui_surface_id: "ai-review-queue",
      api_backed_surface: true,
      permission_states_covered: true,
      review_states_covered: true,
      responsive_states_covered: true,
      accessibility_checked: true,
    },
    actor_id: ACTOR,
    idempotency_key: "ui-check-1",
  });
  const run = recordCriticalPathRun({
    repository,
    critical_path_run: {
      critical_path_run_id: "critical-path-g11-001",
      tenant_id: TENANT,
      route_id: "ask",
      viewport_matrix: ["desktop", "mobile"],
      evidence_refs: ["apps/web/test/ui-regression.test.mjs"],
      permission_gate_verified: true,
    },
    actor_id: ACTOR,
    idempotency_key: "critical-path-1",
  });
  const adjudication = adjudicateUiReadiness({
    repository,
    ui_adjudication: {
      ui_adjudication_id: "ui-adjudication-g11-001",
      tenant_id: TENANT,
      ui_check_id: check.ui_check.ui_check_id,
      decision: "approve_with_findings",
      reviewer_id: "owner-g11",
    },
    actor_id: ACTOR,
    idempotency_key: "ui-adjudication-1",
  });
  return { check, run, adjudication };
}

test("G11 UI readiness runtime persists checks, critical paths, adjudication, audit, and idempotency", () => {
  const storePath = join(mkdtempSync(join(tmpdir(), "ui-g11-")), "ui-readiness.json");
  const repository = createUiReadinessRepository({ filePath: storePath });
  const result = createUiReadinessChain(repository);
  assert.equal(result.check.ui_check.api_backed_surface, true);
  assert.equal(result.run.critical_path_run.screenshot_payload_included, false);
  assert.equal(result.adjudication.ui_adjudication.decision, "approve_with_findings");
  repository.close();

  const reopened = createUiReadinessRepository({ filePath: storePath });
  assert.equal(reopened.list({ tenant_id: TENANT, model_type: "UiReadinessCheck" }).length, 1);
  assert.equal(reopened.getIdempotency({ tenant_id: TENANT, idempotency_key: "critical-path-1" }).operation, "ui_critical_path_run_record");
  assert.equal(reopened.listAudit({ tenant_id: TENANT }).some((event) => event.action === "ui.readiness.adjudicate"), true);
});

test("G11 UI readiness blocks non-API-backed and unverified critical paths", () => {
  const repository = createUiReadinessRepository();
  assert.throws(
    () =>
      recordUiReadinessCheck({
        repository,
        ui_check: {
          ui_check_id: "ui-check-unsafe",
          tenant_id: TENANT,
          tuw_id: "CMP-G11-W11-T003",
          route_id: "home",
          ui_surface_id: "api-client",
          api_backed_surface: false,
          permission_states_covered: true,
          responsive_states_covered: true,
        },
        actor_id: ACTOR,
        idempotency_key: "ui-check-unsafe",
      }),
    /API-backed/,
  );
  assert.throws(
    () =>
      recordCriticalPathRun({
        repository,
        critical_path_run: {
          critical_path_run_id: "critical-path-unsafe",
          tenant_id: TENANT,
          route_id: "home",
          evidence_refs: ["apps/web/test/ui-regression.test.mjs"],
          permission_gate_verified: false,
        },
        actor_id: ACTOR,
        idempotency_key: "critical-path-unsafe",
      }),
    /permission gate/,
  );
});
