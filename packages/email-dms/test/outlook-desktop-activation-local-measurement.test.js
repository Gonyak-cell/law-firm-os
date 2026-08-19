import assert from "node:assert/strict";
import test, { after } from "node:test";

import {
  normalizeOutlookDesktopActivationLocalMeasurementEvidence,
  outlookDesktopActivationLocalMeasurementEvidenceFromApprovedRelease,
  outlookDesktopActivationLocalMeasurementEvidenceSha256,
} from "../src/outlook-desktop-activation-local-measurement.js";
import {
  outlookDesktopActivationIssuedChallengeSha256,
} from "../src/outlook-desktop-activation-challenge.js";
import {
  assertOutlookDesktopActivationReplayIdentity,
} from "../src/outlook-desktop-activation-contract.js";
import {
  activationFixture,
  canonicalBytes,
  hash,
} from "./helpers/outlook-desktop-activation-contract-fixture.js";
import {
  hasCode,
  useActivationTestEnvironment,
  withReceipt,
  withRequest,
} from "./helpers/outlook-desktop-activation-test-utils.js";

after(useActivationTestEnvironment());

test("local measurement digest domain and canonical framing are frozen", () => {
  assert.equal(outlookDesktopActivationLocalMeasurementEvidenceSha256({
    arch: "arm64",
    build_manifest_sha256: "1".repeat(64),
    inner_artifact_bytes: 123,
    inner_artifact_sha256: "2".repeat(64),
    platform: "darwin",
    release_ticket_sha256: "3".repeat(64),
    release_ticket_signature_sha256: "4".repeat(64),
    source_sha: "5".repeat(40),
    source_tree: "6".repeat(40),
    version: "0.1.27",
  }), "c139bcf5833dc1ec23c0ea19a1ca8a712b6a7ebe5e1a2f89edec4340c17d59b0");
});

test("local measurement evidence is one closed path-free release identity", async (t) => {
  const item = await activationFixture(t);
  const evidence = outlookDesktopActivationLocalMeasurementEvidenceFromApprovedRelease(
    item.approvedRelease,
  );

  assert.deepEqual(evidence, {
    arch: item.approvedRelease.arch,
    build_manifest_sha256: item.approvedRelease.embedded_build_manifest_sha256,
    inner_artifact_bytes: item.approvedRelease.measured_inner_artifact_bytes,
    inner_artifact_sha256: item.approvedRelease.measured_inner_artifact_sha256,
    platform: item.approvedRelease.platform,
    release_ticket_sha256: item.approvedRelease.release_ticket_sha256,
    release_ticket_signature_sha256: item.approvedRelease.release_ticket_signature_sha256,
    source_sha: item.approvedRelease.source_sha,
    source_tree: item.approvedRelease.source_tree,
    version: item.approvedRelease.app_version,
  });
  assert.ok(Object.isFrozen(evidence));
  assert.equal(
    outlookDesktopActivationLocalMeasurementEvidenceSha256(evidence),
    hash(canonicalBytes({
      domain: "lawos.outlook-desktop-local-measurement-evidence.v1",
      local_measurement_evidence: evidence,
    })),
  );
  assert.equal(/path|email|subject|user|tenant|serial/iu.test(JSON.stringify(evidence)), false);
});

test("local measurement evidence rejects aliases, extras, and non-lowercase digests", async (t) => {
  const item = await activationFixture(t);
  const evidence = outlookDesktopActivationLocalMeasurementEvidenceFromApprovedRelease(
    item.approvedRelease,
  );
  for (const candidate of [
    { ...evidence, artifact_path: "/Applications/Matter.app" },
    { ...evidence, artifact_sha256: evidence.inner_artifact_sha256 },
    { ...evidence, inner_artifact_sha256: evidence.inner_artifact_sha256.toUpperCase() },
    { ...evidence, inner_artifact_bytes: 0 },
    { ...evidence, platform: "win32" },
  ]) {
    assert.throws(
      () => normalizeOutlookDesktopActivationLocalMeasurementEvidence(candidate),
      hasCode("OUTLOOK_ACTIVATION_LOCAL_MEASUREMENT_INVALID"),
    );
  }
});

test("local measurement evidence rejects stateful accessors without invoking them", async (t) => {
  const item = await activationFixture(t);
  const evidence = outlookDesktopActivationLocalMeasurementEvidenceFromApprovedRelease(
    item.approvedRelease,
  );
  const candidate = { ...evidence };
  let reads = 0;
  Object.defineProperty(candidate, "inner_artifact_bytes", {
    enumerable: true,
    get() {
      reads += 1;
      return reads <= 3 ? evidence.inner_artifact_bytes : 0;
    },
  });

  assert.throws(
    () => normalizeOutlookDesktopActivationLocalMeasurementEvidence(candidate),
    hasCode("OUTLOOK_ACTIVATION_LOCAL_MEASUREMENT_INVALID"),
  );
  assert.equal(reads, 0);
});

test("local measurement evidence rejects coercive objects without stringifying them", async (t) => {
  const item = await activationFixture(t);
  const evidence = outlookDesktopActivationLocalMeasurementEvidenceFromApprovedRelease(
    item.approvedRelease,
  );
  for (const field of [
    "inner_artifact_sha256", "build_manifest_sha256", "platform", "arch", "version",
    "source_sha", "source_tree", "release_ticket_sha256",
    "release_ticket_signature_sha256",
  ]) {
    let stringifications = 0;
    const coerciveValue = {
      toString() {
        stringifications += 1;
        return evidence[field];
      },
    };
    assert.throws(
      () => outlookDesktopActivationLocalMeasurementEvidenceSha256({
        ...evidence,
        [field]: coerciveValue,
      }),
      hasCode("OUTLOOK_ACTIVATION_LOCAL_MEASUREMENT_INVALID"),
    );
    assert.equal(stringifications, 0);
  }
});

test("issued challenge digest hashes the exact validated canonical bytes", async (t) => {
  const item = await activationFixture(t);
  const expected = hash(canonicalBytes(item.challenge));

  assert.equal(outlookDesktopActivationIssuedChallengeSha256(item.challenge), expected);
  assert.equal(
    outlookDesktopActivationIssuedChallengeSha256(
      Object.fromEntries(Object.entries(item.challenge).reverse()),
    ),
    expected,
  );
  assert.throws(
    () => outlookDesktopActivationIssuedChallengeSha256({
      ...item.challenge,
      activation_binding_sha256: "f".repeat(64),
    }),
    hasCode("OUTLOOK_ACTIVATION_BINDING_MISMATCH"),
  );
});

test("issued challenge digest is wall-clock independent and binds exact time fields", async (t) => {
  const item = await activationFixture(t);
  const expected = hash(canonicalBytes(item.challenge));
  let clockReads = 0;
  t.mock.method(Date, "now", () => {
    clockReads += 1;
    return Date.parse(item.challenge.expires_at) + 86_400_000;
  });

  assert.equal(outlookDesktopActivationIssuedChallengeSha256(item.challenge), expected);
  assert.equal(clockReads, 0);

  const timeMutated = structuredClone(item.challenge);
  timeMutated.expires_at = new Date(
    Date.parse(timeMutated.expires_at) - 1,
  ).toISOString();
  assert.notEqual(outlookDesktopActivationIssuedChallengeSha256(timeMutated), expected);
  assert.equal(clockReads, 0);
});

test("issued challenge digest rejects stateful accessors without invoking them", async (t) => {
  const item = await activationFixture(t);
  for (const [path, field] of [
    [[], "activation_id"],
    [["approved_release"], "app_version"],
  ]) {
    const candidate = structuredClone(item.challenge);
    const target = path.reduce((value, key) => value[key], candidate);
    const original = target[field];
    let reads = 0;
    Object.defineProperty(target, field, {
      enumerable: true,
      get() {
        reads += 1;
        return reads === 1 ? original : "invalid-after-validation";
      },
    });

    assert.throws(
      () => outlookDesktopActivationIssuedChallengeSha256(candidate),
      hasCode("OUTLOOK_ACTIVATION_CHALLENGE_INVALID"),
    );
    assert.equal(reads, 0);
  }
});

test("issued challenge digest rejects proxy TOCTOU inputs without invoking traps", async (t) => {
  const item = await activationFixture(t);
  let traps = 0;
  const candidate = new Proxy(structuredClone(item.challenge), {
    getOwnPropertyDescriptor(target, key) {
      traps += 1;
      return Reflect.getOwnPropertyDescriptor(target, key);
    },
    getPrototypeOf(target) {
      traps += 1;
      return Reflect.getPrototypeOf(target);
    },
    ownKeys(target) {
      traps += 1;
      return Reflect.ownKeys(target);
    },
  });

  assert.throws(
    () => outlookDesktopActivationIssuedChallengeSha256(candidate),
    hasCode("OUTLOOK_ACTIVATION_CHALLENGE_INVALID"),
  );
  assert.equal(traps, 0);
});

test("issued challenge digest rejects coercive values without stringifying them", async (t) => {
  const item = await activationFixture(t);
  for (const [path, field] of [
    [[], "activation_id"],
    [["approved_release"], "app_version"],
  ]) {
    const candidate = structuredClone(item.challenge);
    const target = path.reduce((value, key) => value[key], candidate);
    const original = target[field];
    let stringifications = 0;
    target[field] = {
      toString() {
        stringifications += 1;
        return original;
      },
    };

    assert.throws(
      () => outlookDesktopActivationIssuedChallengeSha256(candidate),
      hasCode("OUTLOOK_ACTIVATION_CHALLENGE_INVALID"),
    );
    assert.equal(stringifications, 0);
  }
});

test("request and signed operator receipt bind the exact local measurement digest", async (t) => {
  const item = await activationFixture(t);
  const expected = outlookDesktopActivationLocalMeasurementEvidenceSha256(
    outlookDesktopActivationLocalMeasurementEvidenceFromApprovedRelease(item.approvedRelease),
  );
  const verified = item.contract.verifyOperatorActivation(item.verification_input);

  assert.equal(item.challenge.local_measurement_evidence_sha256, expected);
  assert.equal(item.request.local_measurement_evidence_sha256, expected);
  assert.equal(item.receipt.local_measurement_evidence_sha256, expected);
  assert.equal(item.receipt.bindings.local_measurement_evidence_sha256, expected);
  assert.equal(verified.bindings.local_measurement_evidence_sha256, expected);
  assert.equal(verified.operator.local_measurement_evidence_sha256, expected);

  const replayMaterial = {
    activation_binding_sha256: item.challenge.activation_binding_sha256,
    activation_id: item.challenge.activation_id,
    challenge_nonce_sha256: item.challenge.challenge_nonce_sha256,
    device_key_fingerprint_sha256:
      item.request.candidate_device.continuity_key_fingerprint_sha256,
    entra_subject: item.principal.entra_subject,
    lawos_tenant_id: item.principal.lawos_tenant_id,
    lawos_user_id: item.principal.lawos_user_id,
    local_measurement_evidence_sha256: expected,
    operator_receipt_sha256: hash(item.operator_receipt_bytes),
    operator_receipt_signature_sha256: hash(item.operator_receipt_signature_bytes),
    policy_revision: item.pilotPolicy.policy_revision,
    release_ticket_sha256: hash(item.release_ticket_bytes),
    roster_sha256: item.pilotPolicy.roster_sha256,
  };
  assert.equal(
    verified.single_use_consumption.replay_identity_sha256,
    hash(canonicalBytes(replayMaterial)),
  );
  assert.throws(
    () => assertOutlookDesktopActivationReplayIdentity({
      stored_consumption: {
        ...verified.single_use_consumption,
        replay_identity_sha256: hash(canonicalBytes({
          ...replayMaterial,
          local_measurement_evidence_sha256: "c".repeat(64),
        })),
      },
      verified_activation: verified,
    }),
    hasCode("OUTLOOK_ACTIVATION_REPLAY_IDENTITY_MISMATCH"),
  );

  assert.throws(
    () => item.contract.verifyOperatorActivation(withRequest(item, (request) => {
      request.local_measurement_evidence_sha256 = "f".repeat(64);
    })),
    hasCode("OUTLOOK_ACTIVATION_LOCAL_MEASUREMENT_MISMATCH"),
  );
  assert.throws(
    () => item.contract.verifyOperatorActivation({
      ...item.verification_input,
      issued_challenge: {
        ...item.challenge,
        local_measurement_evidence_sha256: "f".repeat(64),
      },
    }),
    hasCode("OUTLOOK_ACTIVATION_LOCAL_MEASUREMENT_MISMATCH"),
  );
  for (const mutate of [
    (receipt) => { receipt.local_measurement_evidence_sha256 = "e".repeat(64); },
    (receipt) => { receipt.bindings.local_measurement_evidence_sha256 = "d".repeat(64); },
  ]) {
    assert.throws(
      () => item.contract.verifyOperatorActivation(withReceipt(item, mutate)),
      hasCode("OUTLOOK_ACTIVATION_OPERATOR_BINDING_MISMATCH"),
    );
  }
});
