import assert from "node:assert/strict";
import test from "node:test";

import {
  evaluateOutlookDesktopAssignment,
  transitionOutlookDesktopAssignment,
} from "../src/outlook-desktop-assignment-model.js";

const PRINCIPAL = Object.freeze({
  tenant_id: "tenant-outlook-assignment-a",
  user_id: "user-outlook-assignment-a",
  entra_subject_id: "subject-outlook-assignment-a",
});
const POLICY = Object.freeze({
  rollout_stage: "jwsuh_canary",
  maximum_entitled: true,
  rollout_authorized: true,
  account_active: true,
  release_allowed: true,
  policy_revision: 1,
  policy_binding_sha256: "a".repeat(64),
  valid_from: "2026-08-16T00:00:00.000Z",
  valid_until: "2026-08-17T00:00:00.000Z",
});
function trust(activeCount, overrides = {}) {
  return Object.freeze({
    schema_version: "lawos.outlook-desktop-trust-count.v1",
    authority: "server-release-registry",
    tenant_id: PRINCIPAL.tenant_id,
    user_id: PRINCIPAL.user_id,
    entra_subject_id: PRINCIPAL.entra_subject_id,
    active_trusted_install_count: activeCount,
    authority_revision: 1,
    authority_binding_sha256: "b".repeat(64),
    ...overrides,
  });
}

function evaluation(activeCount, overrides = {}) {
  return evaluateOutlookDesktopAssignment({
    principal: PRINCIPAL,
    policy: POLICY,
    trust: trust(activeCount),
    approved_rollout_stage: "jwsuh_canary",
    database_now: "2026-08-16T12:00:00.000Z",
    ...overrides,
  });
}

test("assignment aggregate changes provider generation only across false/true", () => {
  let transition = transitionOutlookDesktopAssignment(null, evaluation(0));
  assert.equal(transition.state.desired_assigned, false);
  assert.equal(transition.state.provider_generation, 0);
  assert.equal(transition.outbox_action, null);

  transition = transitionOutlookDesktopAssignment(
    transition.state,
    evaluation(1),
  );
  assert.equal(transition.state.state_revision, 2);
  assert.equal(transition.state.provider_generation, 1);
  assert.equal(transition.outbox_action, "add");
  const addIntent = transition.state.provider_intent_sha256;

  transition = transitionOutlookDesktopAssignment(
    transition.state,
    evaluation(2),
  );
  assert.equal(transition.state.active_trusted_install_count, 2);
  assert.equal(transition.state.provider_generation, 1);
  assert.equal(transition.state.provider_intent_sha256, addIntent);
  assert.equal(transition.outbox_action, null);

  transition = transitionOutlookDesktopAssignment(
    transition.state,
    evaluation(1),
  );
  assert.equal(transition.state.provider_generation, 1);
  assert.equal(transition.outbox_action, null);

  transition = transitionOutlookDesktopAssignment(
    transition.state,
    evaluation(0),
  );
  assert.equal(transition.state.desired_assigned, false);
  assert.equal(transition.state.provider_generation, 2);
  assert.equal(transition.outbox_action, "remove");

  const replay = transitionOutlookDesktopAssignment(
    transition.state,
    evaluation(0),
  );
  assert.equal(replay.changed, false);
  assert.equal(replay.outbox_action, null);
  assert.deepEqual(replay.state, transition.state);
});

test("policy and trust revisions update aggregate without duplicating provider work", () => {
  let transition = transitionOutlookDesktopAssignment(null, evaluation(1));
  assert.equal(transition.outbox_action, "add");
  const intent = transition.state.provider_intent_sha256;

  transition = transitionOutlookDesktopAssignment(
    transition.state,
    evaluation(1, {
      policy: {
        ...POLICY,
        policy_revision: 2,
        policy_binding_sha256: "d".repeat(64),
      },
    }),
  );
  assert.equal(transition.changed, true);
  assert.equal(transition.outbox_action, null);
  assert.equal(transition.state.provider_generation, 1);
  assert.equal(transition.state.provider_intent_sha256, intent);

  transition = transitionOutlookDesktopAssignment(
    transition.state,
    evaluation(1, {
      policy: {
        ...POLICY,
        policy_revision: 2,
        policy_binding_sha256: "d".repeat(64),
      },
      trust: trust(1, {
        authority_revision: 2,
        authority_binding_sha256: "e".repeat(64),
      }),
    }),
  );
  assert.equal(transition.outbox_action, null);
  assert.equal(transition.state.provider_generation, 1);

  transition = transitionOutlookDesktopAssignment(
    transition.state,
    evaluation(1, {
      policy: {
        ...POLICY,
        policy_revision: 3,
        policy_binding_sha256: "f".repeat(64),
        release_allowed: false,
      },
      trust: trust(1, {
        authority_revision: 2,
        authority_binding_sha256: "e".repeat(64),
      }),
    }),
  );
  assert.equal(transition.outbox_action, "remove");
  assert.equal(transition.state.provider_generation, 2);
});

test("assignment eligibility is closed to the exact canary policy and DB time", () => {
  assert.equal(evaluation(1).desired_assigned, true);
  assert.deepEqual(evaluation(1).denial_reasons, []);

  for (const [field, value, reason] of [
    ["maximum_entitled", false, "maximum_entitlement_denied"],
    ["rollout_authorized", false, "rollout_not_authorized"],
    ["account_active", false, "account_inactive"],
    ["release_allowed", false, "release_denied"],
  ]) {
    const denied = evaluation(1, { policy: { ...POLICY, [field]: value } });
    assert.equal(denied.desired_assigned, false);
    assert.ok(denied.denial_reasons.includes(reason));
  }

  const otherStage = evaluation(1, {
    policy: { ...POLICY, rollout_stage: "expanded" },
  });
  assert.equal(otherStage.desired_assigned, false);
  assert.ok(otherStage.denial_reasons.includes("rollout_stage_not_approved"));
  assert.equal(evaluation(1, {
    policy: { ...POLICY, rollout_stage: "expanded" },
    approved_rollout_stage: "expanded",
  }).desired_assigned, true);

  const unboundPrincipal = evaluation(1, { policy: null });
  assert.equal(unboundPrincipal.desired_assigned, false);
  assert.deepEqual(unboundPrincipal.denial_reasons, ["policy_missing"]);

  const atExpiry = evaluation(1, {
    database_now: POLICY.valid_until,
  });
  assert.equal(atExpiry.desired_assigned, false);
  assert.ok(atExpiry.denial_reasons.includes("policy_not_current"));
  assert.equal(evaluation(0).desired_assigned, false);
});

test("assignment contract rejects loose identities, clocks, trust, and counts", () => {
  assert.throws(
    () => evaluation(1, {
      principal: { ...PRINCIPAL, user_id: "jwsuh@amic.kr" },
    }),
    /user_id/u,
  );
  assert.throws(
    () => evaluation(-1),
    /active_trusted_install_count/u,
  );
  assert.throws(
    () => evaluation(1, { database_now: "not-a-time" }),
    /database_now/u,
  );
  assert.throws(
    () => evaluation(1, { trust: null }),
    /trust/u,
  );
  assert.throws(
    () => evaluation(1, {
      trust: trust(1, { client_claimed: true }),
    }),
    /trust/u,
  );
  assert.throws(
    () => evaluation(1, {
      trust: trust(1, { entra_subject_id: "subject-other" }),
    }),
    /trust/u,
  );
});
