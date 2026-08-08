import assert from "node:assert/strict";
import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { validateM365ReleaseReceipt } from "../lib/outlook-release-gates.mjs";
import { approveGoLive, completedM365Fixture } from "./helpers/outlook-m365-fixture.mjs";
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
  await approveGoLive(fixture);
  assert.equal(validateM365ReleaseReceipt(fixture.receipt, fixture.options).go_live_approved, true);
});

test("central/static-only authorization cannot complete API, migration, or provider config mutations", async (t) => {
  const fixture = await completedM365Fixture({
    authorizedActions: ["m365_central_manifest_update", "static_dual_namespace_publish"],
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
  const early = clone(fixture.receipt);
  early.propagation_observations.find(({ hour }) => hour === 72).observed_at_utc = "2026-08-08T02:00:00Z";
  assert.throws(() => validateM365ReleaseReceipt(early, fixture.options), /protected evidence|before their stated window/);
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
