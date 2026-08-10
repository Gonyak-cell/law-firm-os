import assert from "node:assert/strict";
import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { validateM365ReleaseReceipt } from "../lib/outlook-release-gates.mjs";
import { sha256, sorted } from "../lib/outlook-release/primitives.mjs";
import { approveGoLive, completedM365Fixture } from "./helpers/outlook-m365-fixture.mjs";
import { hostProof } from "./helpers/m365-proof-values.mjs";
import {
  awaitingM365Receipt, clone, hex, m365Options, oid, releaseCandidate,
} from "./helpers/outlook-release-fixtures.mjs";
import { createProtectedFixtureRoot, trustedRoot, writeProtectedJson } from "./helpers/protected-fixture.mjs";

test("awaiting packet requires null controls and cannot overclaim any external gate", async (t) => {
  const root = await createProtectedFixtureRoot();
  t.after(() => rm(root, { recursive: true, force: true }));
  const hashes = { "matter-full": hex("1"), "inquiry-only": hex("2") };
  const receipt = awaitingM365Receipt(hashes);
  const options = m365Options(hashes, trustedRoot(root));
  assert.deepEqual(validateM365ReleaseReceipt(receipt, options), {
    status: "awaiting_authorized_deployment", external_mutation_performed: false, blocked_external: true,
  });
  const claimed = clone(receipt);
  claimed.claims.central_deployment_verified = true;
  assert.throws(() => validateM365ReleaseReceipt(claimed, options), /overclaims/);
  for (const field of ["deployment_verified", "external_provider_proof", "go_live"]) {
    const overclaim = clone(receipt);
    overclaim[field] = true;
    assert.throws(() => validateM365ReleaseReceipt(overclaim, options), /fields mismatch/);
  }
  const nested = clone(receipt);
  nested.profiles[0].external_provider_proof = true;
  assert.throws(() => validateM365ReleaseReceipt(nested, options), /fields mismatch/);
  const nonNullControl = clone(receipt);
  nonNullControl.execution_control.operator_ref = "operator-ref:unapproved";
  assert.throws(() => validateM365ReleaseReceipt(nonNullControl, options), /null\/pending/);
  const stale = clone(receipt);
  stale.source_sha = oid("f");
  assert.throws(() => validateM365ReleaseReceipt(stale, options), /stale for the exact current source/);
  const staleCandidate = releaseCandidate(hashes);
  staleCandidate.source_sha = oid("f");
  assert.throws(() => validateM365ReleaseReceipt(receipt, { ...options, releaseCandidate: staleCandidate }), /stale for the exact current source/);
});

test("executed packet verifies actual protected prerequisite, control, central, propagation, and host bytes", async (t) => {
  const fixture = await completedM365Fixture();
  t.after(() => rm(fixture.root, { recursive: true, force: true }));
  const result = validateM365ReleaseReceipt(fixture.receipt, fixture.options);
  assert.deepEqual(result, {
    status: "deployment_verified", external_mutation_performed: true,
    central_deployment_verified: true, propagation_verified: true,
    real_outlook_verified: true, go_live_approved: false,
  });
  assert.equal(fixture.receipt.host_evidence.length, fixture.options.contract.m365.required_host_evidence.length);
  assert.ok(fixture.receipt.host_evidence.every(({ product_id }) => product_id
    === "8f3cc90d-56dd-4c1c-b9c2-0a1100500101"));
  await approveGoLive(fixture);
  assert.equal(validateM365ReleaseReceipt(fixture.receipt, fixture.options).go_live_approved, true);
});

test("retained inquiry ProductId stays registered but cannot regain assignment or host visibility", async (t) => {
  const root = await createProtectedFixtureRoot();
  t.after(() => rm(root, { recursive: true, force: true }));
  const hashes = { "matter-full": hex("1"), "inquiry-only": hex("2") };
  const receipt = awaitingM365Receipt(hashes);
  const options = m365Options(hashes, trustedRoot(root));
  const inquiry = receipt.profiles.find(({ profile }) => profile === "inquiry-only");
  assert.equal(inquiry.assignment_count, 0);
  assert.equal(inquiry.assignment_state, "unassigned");
  assert.equal(inquiry.production_user_visible, false);

  const assigned = clone(receipt);
  const assignedInquiry = assigned.profiles.find(({ profile }) => profile === "inquiry-only");
  assignedInquiry.assignment_count = 1;
  assignedInquiry.assignment_fingerprint_sha256 = hex("f");
  assert.throws(() => validateM365ReleaseReceipt(assigned, options), /must remain unassigned/);

  const everyone = clone(receipt);
  everyone.profiles.find(({ profile }) => profile === "inquiry-only").assign_to_everyone = true;
  assert.throws(() => validateM365ReleaseReceipt(everyone, options), /production distribution drifted/);

  const overlap = clone(receipt);
  overlap.production_distribution.assignment_overlap_count = 1;
  assert.throws(() => validateM365ReleaseReceipt(overlap, options), /production distribution mismatch/);

  const executed = await completedM365Fixture();
  t.after(() => rm(executed.root, { recursive: true, force: true }));
  const retained = executed.receipt.profiles.find(({ profile }) => profile === "inquiry-only");
  const base = executed.receipt.host_evidence[0];
  const forbiddenHost = {
    product_id: retained.product_id, host: base.host, executed: true, result: "pass",
    manifest_sha256: retained.candidate_manifest_sha256, bundle_sha256: retained.bundle_sha256,
    scenarios: [
      ...executed.options.contract.m365.required_common_host_scenarios,
      ...executed.options.contract.m365.required_profile_scenarios[retained.profile],
    ],
    host_version: base.host_version, observed_at_utc: base.observed_at_utc,
    accessibility_check: "pass", host_dom_manipulation: false,
  };
  const binding = await writeProtectedJson(
    executed.root,
    "runtime/hosts/retained-inquiry-forbidden.json",
    hostProof(forbiddenHost),
  );
  executed.receipt.host_evidence.push({
    ...forbiddenHost, evidence_kind: "real_outlook_host",
    evidence_ref: binding.evidence_ref, evidence_sha256: binding.evidence_sha256,
  });
  assert.throws(
    () => validateM365ReleaseReceipt(executed.receipt, executed.options),
    /real Outlook evidence is incomplete/,
  );
});

test("pilot proof binds the nine-user allowlist, explicit exclusion, and zero inquiry groups", async (t) => {
  const fixture = await completedM365Fixture();
  t.after(() => rm(fixture.root, { recursive: true, force: true }));
  const control = fixture.receipt.execution_control.pilot_assignment;
  const proofPath = path.join(fixture.root, control.evidence_ref);
  const proof = JSON.parse(await readFile(proofPath, "utf8"));
  proof.assignments.find(({ product_id }) => product_id === "952431be-51b8-42a2-9bf6-769a15934e85")
    .group_refs = ["group-ref:outlook-pilot-nine"];
  const changed = await writeProtectedJson(fixture.root, control.evidence_ref, proof);
  control.evidence_sha256 = changed.evidence_sha256;
  assert.throws(
    () => validateM365ReleaseReceipt(fixture.receipt, fixture.options),
    /pilot group assignment drifted/,
  );

  const excluded = await completedM365Fixture();
  t.after(() => rm(excluded.root, { recursive: true, force: true }));
  excluded.receipt.execution_control.pilot_assignment.excluded_principal_fingerprint_sha256 = hex("f");
  assert.throws(
    () => validateM365ReleaseReceipt(excluded.receipt, excluded.options),
    /authorization proof does not exactly authorize/,
  );
});

test("pilot proof rejects eligible and excluded principal overlap without leaking principal refs", async (t) => {
  const fixture = await completedM365Fixture();
  t.after(() => rm(fixture.root, { recursive: true, force: true }));
  const control = fixture.receipt.execution_control.pilot_assignment;
  const proofPath = path.join(fixture.root, control.evidence_ref);
  const proof = JSON.parse(await readFile(proofPath, "utf8"));
  const excludedRef = proof.excluded_principal_refs[0];
  assert.equal(proof.eligible_principal_refs.length, 9);
  assert.equal(proof.excluded_principal_refs.length, 1);
  const visibleOutput = JSON.stringify({
    receipt: fixture.receipt,
    result: validateM365ReleaseReceipt(fixture.receipt, fixture.options),
  });
  assert.equal(visibleOutput.includes("eligible_principal_refs"), false);
  assert.equal(visibleOutput.includes("excluded_principal_refs"), false);
  assert.equal(visibleOutput.includes(excludedRef), false);

  proof.eligible_principal_refs.reverse();
  const reordered = await writeProtectedJson(fixture.root, control.evidence_ref, proof);
  control.evidence_sha256 = reordered.evidence_sha256;
  assert.throws(
    () => validateM365ReleaseReceipt(fixture.receipt, fixture.options),
    /assignment safety correction\/rollback prerequisite is incomplete/,
  );

  proof.eligible_principal_refs[0] = excludedRef;
  proof.eligible_principal_fingerprint_sha256 = sha256(
    JSON.stringify(sorted(proof.eligible_principal_refs)),
  );
  const changed = await writeProtectedJson(fixture.root, control.evidence_ref, proof);
  control.evidence_sha256 = changed.evidence_sha256;

  assert.throws(
    () => validateM365ReleaseReceipt(fixture.receipt, fixture.options),
    /eligible and excluded principals must be disjoint/,
  );
});

test("pilot and assignment-safety provider observations must be inside the authorized window and follow approval", async (t) => {
  const stalePilot = await completedM365Fixture({ pilotObservedAtUtc: "2026-08-07T23:59:59Z" });
  t.after(() => rm(stalePilot.root, { recursive: true, force: true }));
  assert.throws(
    () => validateM365ReleaseReceipt(stalePilot.receipt, stalePilot.options),
    /pilot assignment observation occurred outside the authorized change window/,
  );

  const prematurePilot = await completedM365Fixture({ pilotObservedAtUtc: "2026-08-08T00:10:00Z" });
  t.after(() => rm(prematurePilot.root, { recursive: true, force: true }));
  assert.throws(
    () => validateM365ReleaseReceipt(prematurePilot.receipt, prematurePilot.options),
    /pilot assignment observation predates protected authorization approval/,
  );

  const staleSafety = await completedM365Fixture({ assignmentSafetyObservedAtUtc: "2026-08-08T04:00:01Z" });
  t.after(() => rm(staleSafety.root, { recursive: true, force: true }));
  assert.throws(
    () => validateM365ReleaseReceipt(staleSafety.receipt, staleSafety.options),
    /assignment safety observation occurred outside the authorized change window/,
  );
});

test("pilot principals require exact Entra direct-membership readback with zero nested groups", async (t) => {
  const nested = await completedM365Fixture();
  t.after(() => rm(nested.root, { recursive: true, force: true }));
  const nestedControl = nested.receipt.execution_control.pilot_assignment;
  const nestedPath = path.join(nested.root, nestedControl.evidence_ref);
  const nestedProof = JSON.parse(await readFile(nestedPath, "utf8"));
  nestedProof.direct_membership_readbacks[0].nested_group_count = 1;
  const nestedBinding = await writeProtectedJson(nested.root, nestedControl.evidence_ref, nestedProof);
  nestedControl.evidence_sha256 = nestedBinding.evidence_sha256;
  assert.throws(
    () => validateM365ReleaseReceipt(nested.receipt, nested.options),
    /provider direct-membership readback drifted/,
  );

  const missing = await completedM365Fixture();
  t.after(() => rm(missing.root, { recursive: true, force: true }));
  const missingControl = missing.receipt.execution_control.pilot_assignment;
  const missingPath = path.join(missing.root, missingControl.evidence_ref);
  const missingProof = JSON.parse(await readFile(missingPath, "utf8"));
  const missingReadback = missingProof.direct_membership_readbacks[0];
  missingReadback.direct_member_principal_refs.pop();
  missingReadback.direct_member_fingerprint_sha256 = sha256(
    JSON.stringify(sorted(missingReadback.direct_member_principal_refs)),
  );
  const missingBinding = await writeProtectedJson(missing.root, missingControl.evidence_ref, missingProof);
  missingControl.evidence_sha256 = missingBinding.evidence_sha256;
  assert.throws(
    () => validateM365ReleaseReceipt(missing.receipt, missing.options),
    /eligible principals are not bound to provider direct-membership readback/,
  );

  const excluded = await completedM365Fixture();
  t.after(() => rm(excluded.root, { recursive: true, force: true }));
  const excludedControl = excluded.receipt.execution_control.pilot_assignment;
  const excludedPath = path.join(excluded.root, excludedControl.evidence_ref);
  const excludedProof = JSON.parse(await readFile(excludedPath, "utf8"));
  const excludedReadback = excludedProof.direct_membership_readbacks[0];
  excludedReadback.direct_member_principal_refs.push(excludedProof.excluded_principal_refs[0]);
  excludedReadback.direct_member_fingerprint_sha256 = sha256(
    JSON.stringify(sorted(excludedReadback.direct_member_principal_refs)),
  );
  const excludedBinding = await writeProtectedJson(excluded.root, excludedControl.evidence_ref, excludedProof);
  excludedControl.evidence_sha256 = excludedBinding.evidence_sha256;
  assert.throws(
    () => validateM365ReleaseReceipt(excluded.receipt, excluded.options),
    /excluded principal appears in provider direct-membership readback/,
  );
});

test("assignment-safety prerequisite requires exact correction actions and a reconciling rollback", async (t) => {
  const matterId = "8f3cc90d-56dd-4c1c-b9c2-0a1100500101";
  const inquiryId = "952431be-51b8-42a2-9bf6-769a15934e85";
  const corrected = await completedM365Fixture({
    currentAssignmentOverrides: {
      [matterId]: { group_refs: ["group-ref:wrong-matter-cohort"] },
      [inquiryId]: { assign_to_everyone: true, group_refs: ["group-ref:legacy-inquiry"] },
    },
  });
  t.after(() => rm(corrected.root, { recursive: true, force: true }));
  assert.equal(validateM365ReleaseReceipt(corrected.receipt, corrected.options).status, "deployment_verified");
  const safetyBinding = corrected.receipt.execution_control.assignment_safety_evidence;
  const safety = JSON.parse(await readFile(path.join(corrected.root, safetyBinding.evidence_ref), "utf8"));
  assert.equal(safety.correction_required, true);
  assert.deepEqual(
    safety.required_correction_actions.map(({ action, product_id }) => `${product_id}:${action}`),
    [
      `${inquiryId}:disable_assign_to_everyone`,
      `${inquiryId}:replace_group_assignments`,
      `${matterId}:replace_group_assignments`,
    ],
  );
  const reorderedSafety = structuredClone(safety);
  [reorderedSafety.required_correction_actions[0], reorderedSafety.required_correction_actions[2]] = [
    reorderedSafety.required_correction_actions[2], reorderedSafety.required_correction_actions[0],
  ];
  const reorderedSafetyBinding = await writeProtectedJson(
    corrected.root, safetyBinding.evidence_ref, reorderedSafety,
  );
  safetyBinding.evidence_sha256 = reorderedSafetyBinding.evidence_sha256;
  assert.throws(
    () => validateM365ReleaseReceipt(corrected.receipt, corrected.options),
    /assignment safety correction\/rollback prerequisite is incomplete/,
  );

  for (const mutate of [
    (proof) => { proof.current_assignments.find(({ product_id }) => product_id === inquiryId).assign_to_everyone = true; },
    (proof) => {
      const current = proof.current_assignments.find(({ product_id }) => product_id === inquiryId);
      current.group_refs = ["group-ref:legacy-inquiry"];
      current.assignment_count = 1;
      current.assignment_fingerprint_sha256 = sha256(JSON.stringify(current.group_refs));
    },
    (proof) => {
      const current = proof.current_assignments.find(({ product_id }) => product_id === matterId);
      current.group_refs = ["group-ref:wrong-matter-cohort"];
      current.assignment_count = 1;
      current.assignment_fingerprint_sha256 = sha256(JSON.stringify(current.group_refs));
    },
  ]) {
    const forged = await completedM365Fixture();
    t.after(() => rm(forged.root, { recursive: true, force: true }));
    const binding = forged.receipt.execution_control.assignment_safety_evidence;
    const proofPath = path.join(forged.root, binding.evidence_ref);
    const proof = JSON.parse(await readFile(proofPath, "utf8"));
    mutate(proof);
    const changed = await writeProtectedJson(forged.root, binding.evidence_ref, proof);
    binding.evidence_sha256 = changed.evidence_sha256;
    assert.throws(
      () => validateM365ReleaseReceipt(forged.receipt, forged.options),
      /assignment safety correction\/rollback prerequisite is incomplete/,
    );
  }

  const absent = await completedM365Fixture();
  t.after(() => rm(absent.root, { recursive: true, force: true }));
  absent.receipt.execution_control.assignment_safety_evidence = null;
  assert.throws(
    () => validateM365ReleaseReceipt(absent.receipt, absent.options),
    /assignment safety evidence must be an object with exact fields/,
  );
});

test("central deployment proof hash-binds the pilot provider and assignment-safety evidence", async (t) => {
  for (const field of ["pilot_assignment_evidence_sha256", "assignment_safety_evidence_sha256"]) {
    const fixture = await completedM365Fixture();
    t.after(() => rm(fixture.root, { recursive: true, force: true }));
    const binding = fixture.receipt.execution_control.central_deployment_evidence;
    const proofPath = path.join(fixture.root, binding.evidence_ref);
    const proof = JSON.parse(await readFile(proofPath, "utf8"));
    proof[field] = hex("f");
    const changed = await writeProtectedJson(fixture.root, binding.evidence_ref, proof);
    binding.evidence_sha256 = changed.evidence_sha256;
    assert.throws(
      () => validateM365ReleaseReceipt(fixture.receipt, fixture.options),
      /central deployment proof is not bound to the authorized execution controls/,
    );
  }
});

test("central assignment transition proves inquiry zero readback before Matter exact-nine assignment", async (t) => {
  const fixture = await completedM365Fixture({
    currentAssignmentOverrides: {
      "8f3cc90d-56dd-4c1c-b9c2-0a1100500101": { group_refs: ["group-ref:wrong-matter-cohort"] },
      "952431be-51b8-42a2-9bf6-769a15934e85": {
        assign_to_everyone: true, group_refs: ["group-ref:legacy-inquiry"],
      },
    },
  });
  t.after(() => rm(fixture.root, { recursive: true, force: true }));
  assert.equal(validateM365ReleaseReceipt(fixture.receipt, fixture.options).status, "deployment_verified");
  assert.deepEqual(fixture.receipt.operations.map(({ product_id }) => product_id), [
    "952431be-51b8-42a2-9bf6-769a15934e85",
    "8f3cc90d-56dd-4c1c-b9c2-0a1100500101",
  ]);
  const binding = fixture.receipt.execution_control.central_deployment_evidence;
  const proofPath = path.join(fixture.root, binding.evidence_ref);
  const proof = JSON.parse(await readFile(proofPath, "utf8"));
  assert.deepEqual(proof.assignment_transition.map(({ action, product_id }) => `${product_id}:${action}`), [
    "952431be-51b8-42a2-9bf6-769a15934e85:disable_assign_to_everyone",
    "952431be-51b8-42a2-9bf6-769a15934e85:replace_group_assignments",
    "952431be-51b8-42a2-9bf6-769a15934e85:verify_zero_assignment_readback",
    "8f3cc90d-56dd-4c1c-b9c2-0a1100500101:replace_group_assignments",
    "8f3cc90d-56dd-4c1c-b9c2-0a1100500101:verify_exact_nine_readback",
  ]);

  const matterFirst = await completedM365Fixture();
  t.after(() => rm(matterFirst.root, { recursive: true, force: true }));
  matterFirst.receipt.operations.reverse();
  assert.throws(
    () => validateM365ReleaseReceipt(matterFirst.receipt, matterFirst.options),
    /central assignment operations\/readbacks must be inquiry-first and Matter-last/,
  );

  const reordered = await completedM365Fixture();
  t.after(() => rm(reordered.root, { recursive: true, force: true }));
  const reorderedBinding = reordered.receipt.execution_control.central_deployment_evidence;
  const reorderedPath = path.join(reordered.root, reorderedBinding.evidence_ref);
  const reorderedProof = JSON.parse(await readFile(reorderedPath, "utf8"));
  [reorderedProof.assignment_transition[1], reorderedProof.assignment_transition[3]] = [
    reorderedProof.assignment_transition[3], reorderedProof.assignment_transition[1],
  ];
  reorderedProof.assignment_transition.forEach((step, index) => {
    step.sequence = index + 1;
    step.observed_at_utc = `2026-08-08T00:${55 + index}:00Z`;
  });
  const changed = await writeProtectedJson(reordered.root, reorderedBinding.evidence_ref, reorderedProof);
  reorderedBinding.evidence_sha256 = changed.evidence_sha256;
  assert.throws(
    () => validateM365ReleaseReceipt(reordered.receipt, reordered.options),
    /central assignment transition violated inquiry-safe-before-Matter risk order/,
  );

  for (const [index, field] of [[2, "readback_sha256"], [4, "principal_fingerprint_sha256"]]) {
    const forged = await completedM365Fixture();
    t.after(() => rm(forged.root, { recursive: true, force: true }));
    const forgedBinding = forged.receipt.execution_control.central_deployment_evidence;
    const forgedPath = path.join(forged.root, forgedBinding.evidence_ref);
    const forgedProof = JSON.parse(await readFile(forgedPath, "utf8"));
    forgedProof.assignment_transition[index][field] = hex("f");
    const forgedChanged = await writeProtectedJson(
      forged.root, forgedBinding.evidence_ref, forgedProof,
    );
    forgedBinding.evidence_sha256 = forgedChanged.evidence_sha256;
    assert.throws(
      () => validateM365ReleaseReceipt(forged.receipt, forged.options),
      /central assignment transition violated inquiry-safe-before-Matter risk order/,
    );
  }
});

test("central/static-only authorization cannot complete API, migration, or provider config mutations", async (t) => {
  const fixture = await completedM365Fixture({
    authorizedActions: ["m365_central_single_visible_transition", "static_dual_namespace_publish"],
  });
  t.after(() => rm(fixture.root, { recursive: true, force: true }));
  assert.throws(
    () => validateM365ReleaseReceipt(fixture.receipt, fixture.options),
    /does not exactly authorize every executed mutation class/,
  );
});

test("mutation proofs reject mismatched authorization identity and out-of-window execution", async (t) => {
  const wrongRef = await completedM365Fixture();
  t.after(() => rm(wrongRef.root, { recursive: true, force: true }));
  const migrationBinding = wrongRef.receipt.prerequisites.additive_migrations;
  const migrationPath = path.join(wrongRef.root, migrationBinding.evidence_ref);
  const migration = JSON.parse(await readFile(migrationPath, "utf8"));
  migration.authorization_ref = "change-ref:different-migration-window";
  const changedMigration = await writeProtectedJson(wrongRef.root, migrationBinding.evidence_ref, migration);
  migrationBinding.evidence_sha256 = changedMigration.evidence_sha256;
  assert.throws(
    () => validateM365ReleaseReceipt(wrongRef.receipt, wrongRef.options),
    /mutation authorization binding drifted/,
  );

  const late = await completedM365Fixture();
  t.after(() => rm(late.root, { recursive: true, force: true }));
  const apiBinding = late.receipt.prerequisites.api_release;
  const apiPath = path.join(late.root, apiBinding.evidence_ref);
  const api = JSON.parse(await readFile(apiPath, "utf8"));
  api.observed_at_utc = "2026-08-08T04:00:01Z";
  const changedApi = await writeProtectedJson(late.root, apiBinding.evidence_ref, api);
  apiBinding.evidence_sha256 = changedApi.evidence_sha256;
  assert.throws(
    () => validateM365ReleaseReceipt(late.receipt, late.options),
    /outside its authorized window/,
  );
});

test("rollback rehearsal readback rejects any bundle restoration drift", async (t) => {
  const fixture = await completedM365Fixture();
  t.after(() => rm(fixture.root, { recursive: true, force: true }));
  const binding = fixture.receipt.execution_control.rollback_rehearsal_evidence;
  const proofPath = path.join(fixture.root, binding.evidence_ref);
  const proof = JSON.parse(await readFile(proofPath, "utf8"));
  proof.profiles[0].entry_bundle_sha256 = hex("f");
  const changed = await writeProtectedJson(fixture.root, binding.evidence_ref, proof);
  binding.evidence_sha256 = changed.evidence_sha256;
  assert.throws(
    () => validateM365ReleaseReceipt(fixture.receipt, fixture.options),
    /did not restore the exact protected bundle/,
  );

  const unsafe = await completedM365Fixture();
  t.after(() => rm(unsafe.root, { recursive: true, force: true }));
  const unsafeBinding = unsafe.receipt.execution_control.rollback_rehearsal_evidence;
  const unsafePath = path.join(unsafe.root, unsafeBinding.evidence_ref);
  const unsafeProof = JSON.parse(await readFile(unsafePath, "utf8"));
  unsafeProof.unsafe_assignment_preservation_allowed = true;
  const changedUnsafe = await writeProtectedJson(unsafe.root, unsafeBinding.evidence_ref, unsafeProof);
  unsafeBinding.evidence_sha256 = changedUnsafe.evidence_sha256;
  assert.throws(
    () => validateM365ReleaseReceipt(unsafe.receipt, unsafe.options),
    /rollback rehearsal assignment reconciliation\/readback is invalid/,
  );

  const premature = await completedM365Fixture();
  t.after(() => rm(premature.root, { recursive: true, force: true }));
  const prematureBinding = premature.receipt.execution_control.rollback_rehearsal_evidence;
  const prematurePath = path.join(premature.root, prematureBinding.evidence_ref);
  const prematureProof = JSON.parse(await readFile(prematurePath, "utf8"));
  prematureProof.rehearsed_at_utc = "2026-08-08T00:30:00Z";
  const changedPremature = await writeProtectedJson(
    premature.root, prematureBinding.evidence_ref, prematureProof,
  );
  prematureBinding.evidence_sha256 = changedPremature.evidence_sha256;
  assert.throws(
    () => validateM365ReleaseReceipt(premature.receipt, premature.options),
    /rollback rehearsal predates the protected assignment-safety prerequisite/,
  );
});

test("executed claims reject stale, nonexistent, tampered, or wrong-class protected proofs", async (t) => {
  const stale = await completedM365Fixture();
  t.after(() => rm(stale.root, { recursive: true, force: true }));
  const apiPath = path.join(stale.root, stale.receipt.prerequisites.api_release.evidence_ref);
  const apiProof = JSON.parse(await readFile(apiPath, "utf8"));
  apiProof.source_sha = oid("f");
  const staleBinding = await writeProtectedJson(stale.root, stale.receipt.prerequisites.api_release.evidence_ref, apiProof);
  stale.receipt.prerequisites.api_release.evidence_sha256 = staleBinding.evidence_sha256;
  assert.throws(() => validateM365ReleaseReceipt(stale.receipt, stale.options), /exact source identity/);

  const missing = await completedM365Fixture();
  t.after(() => rm(missing.root, { recursive: true, force: true }));
  missing.receipt.prerequisites.api_release.evidence_ref = "prerequisites/not-recorded.json";
  assert.throws(() => validateM365ReleaseReceipt(missing.receipt, missing.options), /ENOENT/);

  const tampered = await completedM365Fixture();
  t.after(() => rm(tampered.root, { recursive: true, force: true }));
  const target = path.join(tampered.root, tampered.receipt.prerequisites.api_release.evidence_ref);
  await writeFile(target, "{}\n", { mode: 0o600 });
  assert.throws(() => validateM365ReleaseReceipt(tampered.receipt, tampered.options), /SHA-256 mismatch/);

  const wrongClass = await completedM365Fixture();
  t.after(() => rm(wrongClass.root, { recursive: true, force: true }));
  const graphPath = path.join(wrongClass.root, wrongClass.receipt.prerequisites.graph_endpoint_and_secret_reference.evidence_ref);
  const graph = JSON.parse(await readFile(graphPath, "utf8"));
  graph.proof_class = "approved_template_runtime";
  const graphBinding = await writeProtectedJson(wrongClass.root, wrongClass.receipt.prerequisites.graph_endpoint_and_secret_reference.evidence_ref, graph);
  wrongClass.receipt.prerequisites.graph_endpoint_and_secret_reference.evidence_sha256 = graphBinding.evidence_sha256;
  assert.throws(() => validateM365ReleaseReceipt(wrongClass.receipt, wrongClass.options), /proof_class mismatch/);
});

test("executed packet rejects control drift, unknown ProductId, and dual-prefix overclaim", async (t) => {
  const fixture = await completedM365Fixture();
  t.after(() => rm(fixture.root, { recursive: true, force: true }));
  const missingField = clone(fixture.receipt);
  delete missingField.execution_control.abort_criteria;
  assert.throws(() => validateM365ReleaseReceipt(missingField, fixture.options), /fields mismatch/);
  const operatorDrift = clone(fixture.receipt);
  operatorDrift.execution_control.operator_ref = "operator-ref:different-person";
  assert.throws(() => validateM365ReleaseReceipt(operatorDrift, fixture.options), /authorization proof/);
  const pilotDrift = clone(fixture.receipt);
  pilotDrift.execution_control.pilot_assignment.fingerprint_sha256 = hex("f");
  assert.throws(() => validateM365ReleaseReceipt(pilotDrift, fixture.options), /fingerprint\/groups/);
  const unknown = clone(fixture.receipt);
  unknown.profiles[0].product_id = "00000000-0000-0000-0000-000000000000";
  assert.throws(() => validateM365ReleaseReceipt(unknown, fixture.options), /ProductIds/);
  const coverage = clone(fixture.receipt);
  coverage.static_release.profiles[1].source_location_coverage = false;
  assert.throws(() => validateM365ReleaseReceipt(coverage, fixture.options), /static release exact inventory binding/);
  const planHash = clone(fixture.receipt);
  planHash.static_release.plan_sha256 = hex("f");
  assert.throws(() => validateM365ReleaseReceipt(planHash, fixture.options), /static release exact inventory binding/);
  const traversal = clone(fixture.receipt);
  traversal.prerequisites.api_release.evidence_ref = "../api.json";
  assert.throws(() => validateM365ReleaseReceipt(traversal, fixture.options), /unsafe/);
  const rollbackSwap = clone(fixture.options.rollback);
  rollbackSwap.profiles[0].entry_bundle = clone(rollbackSwap.profiles[1].entry_bundle);
  assert.throws(
    () => validateM365ReleaseReceipt(fixture.receipt, { ...fixture.options, rollback: rollbackSwap }),
    /M365 rollback context mismatch/,
  );
});

test("host and propagation claims require protected evidence matching each receipt row", async (t) => {
  const fixture = await completedM365Fixture();
  t.after(() => rm(fixture.root, { recursive: true, force: true }));
  const missingObservation = clone(fixture.receipt);
  missingObservation.propagation_observations.pop();
  assert.throws(() => validateM365ReleaseReceipt(missingObservation, fixture.options), /propagation observations/);
  const duplicate = clone(fixture.receipt);
  duplicate.propagation_observations.push(clone(duplicate.propagation_observations[0]));
  assert.throws(() => validateM365ReleaseReceipt(duplicate, fixture.options), /duplicated/);
  const browser = clone(fixture.receipt);
  browser.host_evidence[0].evidence_kind = "browser_harness";
  assert.throws(() => validateM365ReleaseReceipt(browser, fixture.options), /real Outlook/);
  const placeholder = clone(fixture.receipt);
  placeholder.host_evidence[0].host_version = "test-host-version";
  assert.throws(() => validateM365ReleaseReceipt(placeholder, fixture.options), /protected evidence|placeholder/);
  const duplicateHost = clone(fixture.receipt);
  duplicateHost.host_evidence.push(clone(duplicateHost.host_evidence[0]));
  assert.throws(() => validateM365ReleaseReceipt(duplicateHost, fixture.options), /duplicated/);
  const premature = clone(fixture.receipt);
  premature.claims.go_live_approved = true;
  assert.throws(() => validateM365ReleaseReceipt(premature, fixture.options), /advance together/);
});
