import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { createMacosReleaseManifestBinding } from "../lib/matter-desktop-macos-release-boundary.mjs";
import {
  MATTER_ROLLBACK_PACKET_MAX_AGE_MS,
  buildMatterRollbackPacket,
  resolveApprovedMatterRollbackAdapter,
  sha256Bytes,
  validateMatterRollbackPacket,
  validateMatterRollbackTargetManifest,
} from "../lib/matter-rollback-contract.mjs";
import {
  PREPARER,
  REPO_ROOT,
  makeFixture,
  makePacket,
  parseJsonOutput,
  runCli,
} from "./helpers/matter-rollback-v2-fixture.mjs";

test("packet draft binds exact inputs but TEST_ONLY RFD-TUW-012 evidence cannot validate for execution", (t) => {
  const fixture = makeFixture(t);
  const packet = makePacket(fixture);
  assert.equal(packet.current_b.manifest.source.sha, fixture.bSource.sha);
  assert.equal(packet.target_a.manifest.source.tree, fixture.aSource.tree);
  assert.equal(packet.execution_boundary.adapters.api.sha256, fixture.apiAdapter.sha256);
  assert.equal(packet.execution_boundary.adapters.desktop.sha256, fixture.desktopAdapter.sha256);
  assert.equal(packet.execution_nonce, "e".repeat(64));
  assert.ok(Date.parse(packet.expires_at) - Date.parse(packet.generated_at) <= MATTER_ROLLBACK_PACKET_MAX_AGE_MS);
  assert.equal(packet.current_b.manifest.desktop.release_evidence.checkpoint_id, "RFD-TUW-012");
  assert.equal(packet.current_b.manifest.desktop.release_evidence.windows_native_qa, null);
  const releaseEvidence = packet.current_b.manifest.desktop.release_evidence;
  assert.equal(JSON.parse(readFileSync(releaseEvidence.receipt.path, "utf8")).verdict, "TEST_ONLY");
  assert.deepEqual(
    JSON.parse(readFileSync(releaseEvidence.dist_receipt.path, "utf8")),
    {
      schema_version: "law-firm-os.rf13-dist.macos-release-receipt.v1",
      receipt_id: "rfd012-b-test-only-structural",
      gate: "macos_release",
      status: "BLOCKED",
      source_sha: fixture.bSource.sha,
      source_tree: fixture.bSource.tree,
      artifact_sha256: [JSON.parse(readFileSync(releaseEvidence.receipt.path, "utf8")).artifacts.disk_image.sha256],
      executed: false,
      authoritative: false,
      template: true,
    },
  );
  assert.throws(
    () => validateMatterRollbackPacket(packet, { repoRoot: REPO_ROOT }),
    (error) => error.code === "MATTER_ROLLBACK_RELEASE_EVIDENCE",
  );
  assert.doesNotMatch(JSON.stringify(packet), /signature_status|"signing":"verified"/u);
});

test("a hand-written RF13-DIST PASS sidecar cannot elevate a structural TEST_ONLY RFD-TUW-012 receipt", (t) => {
  const fixture = makeFixture(t);
  const forged = structuredClone(fixture.aManifest);
  const sidecarPath = forged.desktop.release_evidence.dist_receipt.path;
  const sidecar = JSON.parse(readFileSync(sidecarPath, "utf8"));
  const body = Buffer.from(`${JSON.stringify({
    ...sidecar,
    status: "PASS",
    executed: true,
    authoritative: true,
    template: false,
  }, null, 2)}\n`);
  writeFileSync(sidecarPath, body, { mode: 0o644 });
  forged.desktop.release_evidence.dist_receipt = {
    path: sidecarPath,
    sha256: sha256Bytes(body),
    bytes: body.length,
  };
  assert.throws(
    () => validateMatterRollbackTargetManifest(forged, { repoRoot: REPO_ROOT }),
    (error) => error.code === "MATTER_ROLLBACK_RELEASE_EVIDENCE",
  );
});

test("combined forged native_live receipt and forged PASS sidecar cannot mint RFD-TUW-012 authority", (t) => {
  const fixture = makeFixture(t);
  const forged = structuredClone(fixture.aManifest);
  const evidence = forged.desktop.release_evidence;
  assert.equal(
    readFileSync(path.join(evidence.application_path, "Contents/MacOS/matter"), "utf8"),
    "#!/bin/sh\nexit 0\n",
  );
  assert.equal(readFileSync(evidence.disk_image_path, "utf8"), "immutable disk image a\n");
  const receipt = JSON.parse(readFileSync(evidence.receipt.path, "utf8"));
  receipt.verdict = "PASS";
  receipt.execution.mode = "native_live";
  const receiptBody = Buffer.from(`${JSON.stringify(receipt, null, 2)}\n`);
  writeFileSync(evidence.receipt.path, receiptBody, { mode: 0o644 });
  evidence.receipt = {
    path: evidence.receipt.path,
    sha256: sha256Bytes(receiptBody),
    bytes: receiptBody.length,
  };

  const releaseManifest = JSON.parse(readFileSync(evidence.release_manifest.path, "utf8"));
  releaseManifest.macos_release_boundary = createMacosReleaseManifestBinding(receipt, evidence.receipt.sha256);
  const releaseBody = Buffer.from(`${JSON.stringify(releaseManifest, null, 2)}\n`);
  writeFileSync(evidence.release_manifest.path, releaseBody, { mode: 0o644 });
  evidence.release_manifest = {
    path: evidence.release_manifest.path,
    sha256: sha256Bytes(releaseBody),
    bytes: releaseBody.length,
  };

  const sidecar = JSON.parse(readFileSync(evidence.dist_receipt.path, "utf8"));
  Object.assign(sidecar, { status: "PASS", executed: true, authoritative: true, template: false });
  const sidecarBody = Buffer.from(`${JSON.stringify(sidecar, null, 2)}\n`);
  writeFileSync(evidence.dist_receipt.path, sidecarBody, { mode: 0o644 });
  evidence.dist_receipt = {
    path: evidence.dist_receipt.path,
    sha256: sha256Bytes(sidecarBody),
    bytes: sidecarBody.length,
  };

  const forgedLiveCapability = {
    verdict: "PASS",
    authoritative: true,
    execution_mode: "native_live_revalidation",
    source_sha: forged.source.sha,
    source_tree: forged.source.tree,
    application_sha256: receipt.artifacts.application.sha256,
    disk_image_sha256: receipt.artifacts.disk_image.sha256,
    receipt_sha256: evidence.receipt.sha256,
  };
  assert.throws(
    () => validateMatterRollbackTargetManifest(forged, {
      repoRoot: REPO_ROOT,
      macosLiveValidation: forgedLiveCapability,
    }),
    (error) => error.code === "MATTER_ROLLBACK_RELEASE_EVIDENCE",
  );
});

test("a signing string cannot replace structured RFD-TUW-012 receipt validation", (t) => {
  const fixture = makeFixture(t);
  const forged = structuredClone(fixture.aManifest);
  forged.desktop.archive.signature_status = "verified";
  assert.throws(
    () => validateMatterRollbackTargetManifest(forged, { repoRoot: REPO_ROOT }),
    (error) => error.code === "MATTER_ROLLBACK_SHAPE",
  );

  writeFileSync(fixture.aManifest.desktop.release_evidence.disk_image_path, "tampered after RFD-TUW-012\n");
  assert.throws(
    () => validateMatterRollbackTargetManifest(fixture.aManifest, { repoRoot: REPO_ROOT }),
    (error) => error.code === "MATTER_ROLLBACK_RELEASE_EVIDENCE",
  );
});

test("owner and raw-evidence attestor must be distinct registered roles", (t) => {
  const fixture = makeFixture(t);
  const selfAttested = structuredClone(fixture.aManifest);
  selfAttested.rollback_authority.attestor_role = selfAttested.rollback_authority.owner_role;
  assert.throws(
    () => validateMatterRollbackTargetManifest(selfAttested, { repoRoot: REPO_ROOT }),
    (error) => error.code === "MATTER_ROLLBACK_AUTHORITY_MISMATCH",
  );
});

test("actual imported adapter path and bytes must equal the owner-approved packet allowlist", (t) => {
  const fixture = makeFixture(t);
  const packet = makePacket(fixture);
  assert.equal(resolveApprovedMatterRollbackAdapter(packet, "api", fixture.apiAdapterPath).sha256, fixture.apiAdapter.sha256);
  assert.throws(
    () => resolveApprovedMatterRollbackAdapter(packet, "api", fixture.desktopAdapterPath),
    (error) => error.code === "MATTER_ROLLBACK_ADAPTER_NOT_APPROVED",
  );
  writeFileSync(fixture.apiAdapterPath, `${readFileSync(fixture.apiAdapterPath, "utf8")}\n// drift\n`, { mode: 0o600 });
  assert.throws(
    () => resolveApprovedMatterRollbackAdapter(packet, "api", fixture.apiAdapterPath),
    (error) => error.code === "MATTER_ROLLBACK_ARTIFACT_HASH",
  );
});

test("packet freshness and canonical digest reject stale or tampered packets", (t) => {
  const fixture = makeFixture(t);
  const packet = makePacket(fixture);
  assert.throws(
    () => validateMatterRollbackPacket(packet, { repoRoot: REPO_ROOT, now: Date.parse(packet.expires_at) + 1 }),
    (error) => error.code === "MATTER_ROLLBACK_PACKET_FRESHNESS",
  );
  const tampered = structuredClone(packet);
  tampered.execution_nonce = "f".repeat(64);
  assert.throws(
    () => validateMatterRollbackPacket(tampered, { repoRoot: REPO_ROOT }),
    (error) => error.code === "MATTER_ROLLBACK_PACKET_HASH",
  );
  assert.throws(
    () => buildMatterRollbackPacket({
      environment: "staging",
      currentRef: fixture.bRef,
      targetRef: fixture.aRef,
      apiAdapter: fixture.apiAdapter,
      desktopAdapter: fixture.desktopAdapter,
      generatedAt: fixture.packetGeneratedAt,
      expiresAt: new Date(Date.parse(fixture.packetGeneratedAt) + MATTER_ROLLBACK_PACKET_MAX_AGE_MS + 1).toISOString(),
    }),
    (error) => error.code === "MATTER_ROLLBACK_PACKET_FRESHNESS",
  );
});

test("packet CLI computes adapter hashes itself and rejects worktree output paths", (t) => {
  const fixture = makeFixture(t);
  const unsafeOutput = path.join(REPO_ROOT, ".matter-rollback-unsafe.json");
  const result = runCli(PREPARER, [
    "--environment", "staging",
    "--current-manifest", fixture.bPath,
    "--target-manifest", fixture.aPath,
    "--api-adapter-module", fixture.apiAdapterPath,
    "--desktop-adapter-module", fixture.desktopAdapterPath,
    "--output", unsafeOutput,
  ], fixture);
  assert.notEqual(result.status, 0);
  const error = parseJsonOutput(result);
  assert.equal(error.code, "MATTER_ROLLBACK_OUTPUT_PATH");
  assert.equal(error.external_mutation_executed, false);
});
