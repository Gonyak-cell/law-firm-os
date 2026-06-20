import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  createEnterpriseReadinessRepository,
  recordEnterpriseReadinessItem,
  recordGoNoGoDecision,
  recordReleaseCandidate,
} from "../src/index.js";

const TENANT = "tenant-cmp-g12";
const ACTOR = "user-cmp-g12";

function createEnterpriseChain(repository) {
  const item = recordEnterpriseReadinessItem({
    repository,
    enterprise_item: {
      enterprise_item_id: "enterprise-item-g12-001",
      tenant_id: TENANT,
      tuw_id: "CMP-G12-W12-T012",
      item_type: "security-regression-suite",
      control_ref: "security-regression",
      evidence_refs: ["apps/api/test/cmp-r4-g12-enterprise-readiness.test.js"],
    },
    actor_id: ACTOR,
    idempotency_key: "enterprise-item-1",
  });
  const releaseCandidate = recordReleaseCandidate({
    repository,
    release_candidate: {
      release_candidate_id: "rc-g12-001",
      tenant_id: TENANT,
      validation_refs: ["npm run client-matter:cmp-v1:g12:validate"],
      status: "owner_decision_pending",
    },
    actor_id: ACTOR,
    idempotency_key: "release-candidate-1",
  });
  const decision = recordGoNoGoDecision({
    repository,
    go_no_go: {
      go_no_go_id: "go-no-go-g12-001",
      tenant_id: TENANT,
      decision: "pending_owner_approval",
      owner_approved: false,
      release_gate_passed: false,
    },
    actor_id: ACTOR,
    idempotency_key: "go-no-go-1",
  });
  return { item, releaseCandidate, decision };
}

test("G12 enterprise readiness runtime persists items, release candidates, go/no-go, audit, and idempotency", () => {
  const storePath = join(mkdtempSync(join(tmpdir(), "enterprise-g12-")), "enterprise-readiness.json");
  const repository = createEnterpriseReadinessRepository({ filePath: storePath });
  const result = createEnterpriseChain(repository);
  assert.equal(result.item.enterprise_item.production_ready_claim, false);
  assert.equal(result.releaseCandidate.release_candidate.status, "owner_decision_pending");
  assert.equal(result.decision.go_no_go.go_live_approved, false);
  repository.close();

  const reopened = createEnterpriseReadinessRepository({ filePath: storePath });
  assert.equal(reopened.list({ tenant_id: TENANT, model_type: "EnterpriseReadinessItem" }).length, 1);
  assert.equal(reopened.getIdempotency({ tenant_id: TENANT, idempotency_key: "release-candidate-1" }).operation, "enterprise_release_candidate_record");
  assert.equal(reopened.listAudit({ tenant_id: TENANT }).some((event) => event.action === "enterprise.go_no_go.record"), true);
});

test("G12 enterprise readiness blocks premature production and go-live claims", () => {
  const repository = createEnterpriseReadinessRepository();
  assert.throws(
    () =>
      recordEnterpriseReadinessItem({
        repository,
        enterprise_item: {
          enterprise_item_id: "enterprise-item-unsafe",
          tenant_id: TENANT,
          item_type: "production-readiness-checklist",
          control_ref: "prod-ready",
          evidence_refs: ["evidence"],
          production_ready_claim: true,
        },
        actor_id: ACTOR,
        idempotency_key: "enterprise-item-unsafe",
      }),
    /production/,
  );
  assert.throws(
    () =>
      recordGoNoGoDecision({
        repository,
        go_no_go: {
          go_no_go_id: "go-no-go-unsafe",
          tenant_id: TENANT,
          decision: "go",
          owner_approved: false,
          release_gate_passed: false,
        },
        actor_id: ACTOR,
        idempotency_key: "go-no-go-unsafe",
      }),
    /owner approval/,
  );
});
