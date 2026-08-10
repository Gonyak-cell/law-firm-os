import assert from "node:assert/strict";
import { readFile, rm } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { validateM365ReleaseReceipt } from "../lib/outlook-release-gates.mjs";
import { approveGoLive, completedM365Fixture } from "./helpers/outlook-m365-fixture.mjs";
import { writeProtectedJson } from "./helpers/protected-fixture.mjs";

const shift = (value, milliseconds) => new Date(Date.parse(value) + milliseconds).toISOString();

async function readProof(fixture, binding) {
  return JSON.parse(await readFile(path.join(fixture.root, binding.evidence_ref), "utf8"));
}

async function rewriteProof(fixture, binding, update) {
  const proof = await readProof(fixture, binding);
  update(proof);
  const rewritten = await writeProtectedJson(fixture.root, binding.evidence_ref, proof);
  binding.evidence_sha256 = rewritten.evidence_sha256;
  return proof;
}

async function rewriteObservation(fixture, entry, observedAtUtc) {
  entry.observed_at_utc = observedAtUtc;
  await rewriteProof(fixture, entry, (proof) => { proof.observed_at_utc = observedAtUtc; });
}

async function fixtureFor(t) {
  const fixture = await completedM365Fixture();
  t.after(() => rm(fixture.root, { recursive: true, force: true }));
  return fixture;
}

async function centralObservedAt(fixture) {
  const proof = await readProof(fixture, fixture.receipt.execution_control.central_deployment_evidence);
  return proof.observed_at_utc;
}

async function requiredGoLiveAt(fixture) {
  const control = fixture.receipt.execution_control;
  const [central, monitoring, rollback] = await Promise.all([
    readProof(fixture, control.central_deployment_evidence),
    readProof(fixture, control.monitoring_evidence),
    readProof(fixture, control.rollback_rehearsal_evidence),
  ]);
  const values = [
    central.observed_at_utc, monitoring.approved_at_utc, rollback.rehearsed_at_utc,
    ...fixture.receipt.propagation_observations.map(({ observed_at_utc }) => observed_at_utc),
    ...fixture.receipt.host_evidence.map(({ observed_at_utc }) => observed_at_utc),
  ];
  return new Date(Math.max(...values.map(Date.parse))).toISOString();
}

test("T+0 may equal the protected central deployment observation", async (t) => {
  const fixture = await fixtureFor(t);
  const central = await centralObservedAt(fixture);
  for (const entry of fixture.receipt.propagation_observations.filter(({ hour }) => hour === 0)) {
    await rewriteObservation(fixture, entry, central);
  }
  assert.doesNotThrow(() => validateM365ReleaseReceipt(fixture.receipt, fixture.options));
});

test("T+0 rejects one millisecond before protected central deployment", async (t) => {
  const fixture = await fixtureFor(t);
  const entry = fixture.receipt.propagation_observations.find(({ hour }) => hour === 0);
  await rewriteObservation(fixture, entry, shift(await centralObservedAt(fixture), -1));
  assert.throws(
    () => validateM365ReleaseReceipt(fixture.receipt, fixture.options),
    /propagation observation precedes central deployment/,
  );
});

test("every real Outlook host may equal protected central deployment", async (t) => {
  const fixture = await fixtureFor(t);
  const central = await centralObservedAt(fixture);
  for (const entry of fixture.receipt.host_evidence) await rewriteObservation(fixture, entry, central);
  assert.doesNotThrow(() => validateM365ReleaseReceipt(fixture.receipt, fixture.options));
});

test("a real Outlook host rejects one millisecond before protected central deployment", async (t) => {
  const fixture = await fixtureFor(t);
  await rewriteObservation(fixture, fixture.receipt.host_evidence[0], shift(await centralObservedAt(fixture), -1));
  assert.throws(
    () => validateM365ReleaseReceipt(fixture.receipt, fixture.options),
    /real Outlook observation precedes central deployment/,
  );
});

test("T+72 may equal its profile T+0 plus exactly 72 hours", async (t) => {
  const fixture = await fixtureFor(t);
  const productId = fixture.receipt.profiles[0].product_id;
  const observations = fixture.receipt.propagation_observations.filter((entry) => entry.product_id === productId);
  const t0 = observations.find(({ hour }) => hour === 0).observed_at_utc;
  await rewriteObservation(fixture, observations.find(({ hour }) => hour === 72), shift(t0, 72 * 3_600_000));
  assert.doesNotThrow(() => validateM365ReleaseReceipt(fixture.receipt, fixture.options));
});

test("T+72 rejects one millisecond before its profile schedule", async (t) => {
  const fixture = await fixtureFor(t);
  const productId = fixture.receipt.profiles[0].product_id;
  const observations = fixture.receipt.propagation_observations.filter((entry) => entry.product_id === productId);
  const t0 = observations.find(({ hour }) => hour === 0).observed_at_utc;
  await rewriteObservation(fixture, observations.find(({ hour }) => hour === 72), shift(t0, 72 * 3_600_000 - 1));
  assert.throws(
    () => validateM365ReleaseReceipt(fixture.receipt, fixture.options),
    /before their stated window/,
  );
});

test("go-live approval may equal the latest required protected evidence", async (t) => {
  const fixture = await approveGoLive(await fixtureFor(t));
  const requiredAt = await requiredGoLiveAt(fixture);
  await rewriteProof(fixture, fixture.receipt.execution_control.go_live_evidence, (proof) => {
    proof.approved_at_utc = requiredAt;
  });
  assert.equal(validateM365ReleaseReceipt(fixture.receipt, fixture.options).go_live_approved, true);
});

test("go-live approval rejects one millisecond before required protected evidence", async (t) => {
  const fixture = await approveGoLive(await fixtureFor(t));
  const requiredAt = await requiredGoLiveAt(fixture);
  await rewriteProof(fixture, fixture.receipt.execution_control.go_live_evidence, (proof) => {
    proof.approved_at_utc = shift(requiredAt, -1);
  });
  assert.throws(
    () => validateM365ReleaseReceipt(fixture.receipt, fixture.options),
    /go-live approval precedes required evidence/,
  );
});

test("protected completion rejects a normalized invalid calendar timestamp", async (t) => {
  const fixture = await fixtureFor(t);
  await rewriteObservation(fixture, fixture.receipt.host_evidence[0], "2026-02-30T03:00:00Z");
  assert.throws(
    () => validateM365ReleaseReceipt(fixture.receipt, fixture.options),
    /real Outlook observation must be an exact UTC timestamp/,
  );
});

test("an otherwise ordered protected chain rejects a trusted cutoff before deployment", async (t) => {
  const fixture = await fixtureFor(t);
  const options = { ...fixture.options, validationCutoffUtc: shift(await centralObservedAt(fixture), -1) };
  assert.throws(
    () => validateM365ReleaseReceipt(fixture.receipt, options),
    /trusted validation cutoff/,
  );
});

test("the latest completion may equal the trusted validation cutoff", async (t) => {
  const fixture = await approveGoLive(await fixtureFor(t));
  assert.equal(fixture.options.validationCutoffUtc, "2026-08-12T02:00:00.000Z");
  assert.equal(validateM365ReleaseReceipt(fixture.receipt, fixture.options).go_live_approved, true);
});

for (const [name, bindingKey, field] of [
  ["authorization", "authorization_evidence", "approved_at_utc"],
  ["pilot assignment", "pilot_assignment", "observed_at_utc"],
  ["monitoring plan", "monitoring_evidence", "approved_at_utc"],
  ["rollback rehearsal", "rollback_rehearsal_evidence", "rehearsed_at_utc"],
]) {
  test(`${name} completion rejects one millisecond after the trusted cutoff`, async (t) => {
    const fixture = await fixtureFor(t);
    const binding = fixture.receipt.execution_control[bindingKey];
    await rewriteProof(fixture, binding, (proof) => {
      proof[field] = shift(fixture.options.validationCutoffUtc, 1);
    });
    assert.throws(
      () => validateM365ReleaseReceipt(fixture.receipt, fixture.options),
      /trusted validation cutoff/,
    );
  });
}

for (const name of [
  "api_release", "additive_migrations", "graph_endpoint_and_secret_reference",
  "docusign_endpoint_and_secret_reference", "approved_template_runtime",
  "precedent_index_runtime", "static_release",
]) {
  test(`${name} completion rejects one millisecond after the trusted cutoff`, async (t) => {
    const fixture = await fixtureFor(t);
    const binding = fixture.receipt.prerequisites[name];
    const cutoff = "2026-08-08T03:59:59.999Z";
    await rewriteProof(fixture, binding, (proof) => { proof.observed_at_utc = shift(cutoff, 1); });
    assert.throws(
      () => validateM365ReleaseReceipt(fixture.receipt, { ...fixture.options, validationCutoffUtc: cutoff }),
      new RegExp(`${name} observation occurs after the trusted validation cutoff`),
    );
  });
}

test("propagation completion rejects one millisecond after the trusted cutoff", async (t) => {
  const fixture = await fixtureFor(t);
  const observedAt = shift(fixture.options.validationCutoffUtc, 1);
  await rewriteObservation(fixture, fixture.receipt.propagation_observations.at(-1), observedAt);
  assert.throws(
    () => validateM365ReleaseReceipt(fixture.receipt, fixture.options),
    /M365 propagation observation occurs after the trusted validation cutoff/,
  );
});

test("real Outlook completion rejects one millisecond after the trusted cutoff", async (t) => {
  const fixture = await fixtureFor(t);
  const observedAt = shift(fixture.options.validationCutoffUtc, 1);
  await rewriteObservation(fixture, fixture.receipt.host_evidence[0], observedAt);
  assert.throws(
    () => validateM365ReleaseReceipt(fixture.receipt, fixture.options),
    /real Outlook observation occurs after the trusted validation cutoff/,
  );
});

test("go-live completion rejects one millisecond after the trusted cutoff", async (t) => {
  const fixture = await approveGoLive(await fixtureFor(t));
  await rewriteProof(fixture, fixture.receipt.execution_control.go_live_evidence, (proof) => {
    proof.approved_at_utc = shift(fixture.options.validationCutoffUtc, 1);
  });
  assert.throws(
    () => validateM365ReleaseReceipt(fixture.receipt, fixture.options),
    /go-live approval occurs after the trusted validation cutoff/,
  );
});
