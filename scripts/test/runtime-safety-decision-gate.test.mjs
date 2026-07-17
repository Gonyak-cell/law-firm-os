import { generateKeyPairSync, sign } from "node:crypto";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";
import test from "node:test";
import { canonicalizeJson, sha256Hex } from "../lib/runtime-safety-approval-contract.mjs";
import {
  DECISION_PACKET_SCHEMA_VERSION,
  evaluateDecisionGate,
  validateDecisionPacket,
} from "../lib/runtime-safety-decision-gate.mjs";

const SOURCE_SHA = "a".repeat(40);
const SOURCE_TREE = "b".repeat(40);

function packet() {
  return {
    schema_version: DECISION_PACKET_SCHEMA_VERSION,
    packet_id: "packet-prj-001",
    decision_source_sha: SOURCE_SHA,
    decision_source_tree: SOURCE_TREE,
    action: "readiness-authority",
    environment: "source-local",
    required_role: "owner",
    allowed_decisions: ["approved", "rejected"],
    current_state: "PENDING_HUMAN_APPROVAL",
    requirements: ["Choose the readiness authority."],
    options: [
      { decision: "approved", effects: ["Permit the source-local projection lane."], prohibited_actions: ["No release."] },
      { decision: "rejected", effects: ["Keep current readiness authority."], prohibited_actions: ["No migration."] },
    ],
    external_actions_authorized: false,
    claims: { release: false, deployment: false, cutover: false, go_live: false },
  };
}

function signedFixture(decision = "approved") {
  const root = mkdtempSync(join(tmpdir(), "lawos-decision-gate-"));
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const registry = {
    schema_version: "law-firm-os.runtime-safety.approval-trust-registry.v1",
    generated_at: "2026-07-17T00:00:00.000Z",
    keys: [{
      key_id: "owner-key-1",
      algorithm: "Ed25519",
      public_key_spki_pem: publicKey.export({ type: "spki", format: "pem" }),
      roles: ["owner"],
      actions: ["readiness-authority"],
      environments: ["source-local"],
      valid_from: "2026-07-17T00:00:00.000Z",
      valid_until: "2026-07-19T00:00:00.000Z",
      revoked_at: null,
    }],
  };
  const packetHash = validateDecisionPacket(packet(), {
    sourceSha: SOURCE_SHA,
    sourceTree: SOURCE_TREE,
    action: "readiness-authority",
    environment: "source-local",
    role: "owner",
  }).packet_sha256;
  const receipt = {
    schema_version: "law-firm-os.runtime-safety.approval.v1",
    approval_id: "approval-prj-001",
    key_id: "owner-key-1",
    role: "owner",
    decision,
    packet_sha256: packetHash,
    source_sha: SOURCE_SHA,
    source_tree: SOURCE_TREE,
    action: "readiness-authority",
    environment: "source-local",
    signed_at: "2026-07-17T01:00:00.000Z",
    expires_at: "2026-07-18T01:00:00.000Z",
    data_scope: [],
    contact_scope: [],
  };
  const registryPath = join(root, "registry.json");
  const receiptPath = join(root, "receipt.json");
  writeFileSync(registryPath, JSON.stringify(registry));
  writeFileSync(receiptPath, JSON.stringify(receipt));
  writeFileSync(`${receiptPath}.sig`, sign(null, Buffer.from(canonicalizeJson(receipt)), privateKey));
  return { registryPath, receiptPath, registrySha256: sha256Hex(JSON.stringify(registry)) };
}

test("decision gate returns truthful pending state when trust or detached approval is absent", () => {
  const result = evaluateDecisionGate({
    packet: packet(),
    sourceSha: SOURCE_SHA,
    sourceTree: SOURCE_TREE,
    action: "readiness-authority",
    environment: "source-local",
  });
  assert.equal(result.outcome, "pending");
  assert.equal(result.execution_state, "APPROVAL_REQUIRED");
  assert.equal(result.verified, false);
  assert.equal(result.external_actions_executed, 0);
});

test("decision gate verifies an Ed25519 approved or rejected receipt against the exact packet and source", () => {
  for (const decision of ["approved", "rejected"]) {
    const fixture = signedFixture(decision);
    const result = evaluateDecisionGate({
      packet: packet(),
      sourceSha: SOURCE_SHA,
      sourceTree: SOURCE_TREE,
      action: "readiness-authority",
      environment: "source-local",
      trustRegistryPath: fixture.registryPath,
      expectedTrustRegistrySha256: fixture.registrySha256,
      approvalReceiptPath: fixture.receiptPath,
      now: Date.parse("2026-07-17T02:00:00.000Z"),
    });
    assert.equal(result.outcome, decision);
    assert.equal(result.verified, true);
  }
});

test("decision gate rejects source, scope, claim, registry digest and signature drift", () => {
  for (const mutate of [
    (value) => { value.decision_source_sha = "c".repeat(40); },
    (value) => { value.action = "other-action"; },
    (value) => { value.claims.go_live = true; },
    (value) => { value.options[1].decision = "approved"; },
  ]) {
    const value = packet();
    mutate(value);
    assert.throws(() => validateDecisionPacket(value, {
      sourceSha: SOURCE_SHA,
      sourceTree: SOURCE_TREE,
      action: "readiness-authority",
      environment: "source-local",
      role: "owner",
    }));
  }
  const fixture = signedFixture();
  assert.throws(() => evaluateDecisionGate({
    packet: packet(), sourceSha: SOURCE_SHA, sourceTree: SOURCE_TREE,
    action: "readiness-authority", environment: "source-local",
    trustRegistryPath: fixture.registryPath,
    expectedTrustRegistrySha256: "0".repeat(64),
    approvalReceiptPath: fixture.receiptPath,
    now: Date.parse("2026-07-17T02:00:00.000Z"),
  }));
});
