import assert from "node:assert/strict";
import { chmod, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  buildCrossSurfaceForwardRollbackReceipt,
  openProtectedEvidenceRoot,
  sha256,
  validateCrossSurfaceForwardRollbackContract,
  verifyCrossSurfaceForwardRollbackEvidence,
} from "../lib/outlook-release-gates.mjs";
import { canonical, inventorySha256 } from "../lib/outlook-release/primitives.mjs";
import { clone, oid, readBytes } from "./helpers/outlook-release-fixtures.mjs";

const packetBytes = await readBytes("contracts/outlook-addin-forward-rollback-packet.json");
const packet = JSON.parse(packetBytes);
const forwardStaticBytes = await readBytes("contracts/outlook-addin-forward-static-rollback.json");
const forwardStatic = JSON.parse(forwardStaticBytes);
const rollbackManifestBytes = await readBytes("apps/addin/manifest.canary.rollback.production.xml");

function validate(candidate = packet, bytes = packetBytes) {
  return validateCrossSurfaceForwardRollbackContract(candidate, {
    packetBytes: bytes,
    forwardStatic,
    forwardStaticBytes,
    rollbackManifestBytes,
  });
}

async function writeJson(root, relative, value) {
  const absolute = path.join(root, relative);
  await mkdir(path.dirname(absolute), { recursive: true, mode: 0o700 });
  const bytes = Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
  await writeFile(absolute, bytes, { mode: 0o600 });
  return { bytes, sha256: sha256(bytes) };
}

async function protectedEvidenceFixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), "outlook-forward-rollback-packet-"));
  await chmod(root, 0o700);
  t.after(() => rm(root, { recursive: true, force: true }));
  const candidate = clone(packet);
  const api = candidate.surfaces.api;
  const version = {
    FunctionName: api.function_name,
    FunctionArn: api.published_version_arn,
    Runtime: api.configuration.runtime,
    Handler: api.configuration.handler,
    CodeSize: api.code_size_bytes,
    Timeout: api.configuration.timeout_seconds,
    MemorySize: api.configuration.memory_mib,
    CodeSha256: api.code_sha256_base64,
    Version: api.published_version,
    Architectures: [api.configuration.architecture],
    Environment: {
      ValuesStored: false,
      VariableCount: api.configuration.environment_variable_count,
      VariableNameSetSha256: api.configuration.environment_variable_name_set_sha256,
      VariablesCanonicalSha256: api.configuration.environment_variables_canonical_sha256,
    },
  };
  api.published_version_snapshot_sha256 = inventorySha256(canonical(version));
  const versions = await writeJson(root, api.evidence.versions_ref, {
    available: true,
    value: { Versions: [version] },
  });
  api.evidence.versions_sha256 = versions.sha256;

  const latest = {
    FunctionName: api.function_name,
    FunctionArn: api.function_arn,
    Version: "$LATEST",
    CodeSha256: api.checkpoint_latest.code_sha256_base64,
    Runtime: "nodejs22.x",
    Handler: "apps/api/src/lambda.handler",
    MemorySize: 2048,
    Timeout: 120,
    Architectures: ["x86_64"],
    Environment: {
      ValuesStored: false,
      VariableCount: 49,
      VariableNameSetSha256: api.configuration.environment_variable_name_set_sha256,
      VariablesCanonicalSha256: api.configuration.environment_variables_canonical_sha256,
    },
  };
  const configuration = await writeJson(root, api.evidence.checkpoint_configuration_ref, latest);
  api.evidence.checkpoint_configuration_sha256 = configuration.sha256;

  const cloudfront = candidate.surfaces.cloudfront;
  const distribution = {
    ETag: "historical-reference-only",
    DistributionConfig: {
      CacheBehaviors: {
        Quantity: 1,
        Items: [{
          PathPattern: cloudfront.behavior_path_pattern,
          TargetOriginId: cloudfront.restore_target_origin_id,
        }],
      },
    },
  };
  cloudfront.config_canonical_sha256 = inventorySha256(canonical(distribution.DistributionConfig));
  const distributionFile = await writeJson(root, cloudfront.evidence.config_ref, distribution);
  cloudfront.evidence.config_sha256 = distributionFile.sha256;

  return { candidate, store: openProtectedEvidenceRoot(root) };
}

test("cross-surface packet is monotonic, immutable, data-preserving, and desktop-noop", () => {
  const result = validate();
  assert.equal(result.forward_manifest_version, "1.3.0.4");
  assert.equal(result.api_published_version, "11");
  assert.equal(result.external_mutations, 0);
  assert.equal(result.data_mutations, 0);
  assert.equal(result.desktop_mutations, 0);
  assert.deepEqual(result.rollback_order, [
    "restore_static_aliases",
    "forward_update_m365_manifest",
    "restore_cloudfront_behavior",
    "restore_api_published_version",
    "readback_all_surfaces",
  ]);
});

test("cross-surface packet rejects missing API version and a lower manifest version", () => {
  const missingVersion = clone(packet);
  delete missingVersion.surfaces.api.published_version;
  assert.throws(() => validate(missingVersion), /published version|fields/u);

  const downgrade = clone(packet);
  downgrade.surfaces.m365.forward_manifest_version = "1.2.0.9";
  assert.throws(() => validate(downgrade), /strictly forward|manifest identity/u);
});

test("cross-surface packet rejects prior bundle drift, wildcard resources, and data deletion", () => {
  const alteredForwardBytes = Buffer.from(`${forwardStaticBytes.toString("utf8")}\n`);
  assert.throws(() => validateCrossSurfaceForwardRollbackContract(packet, {
    packetBytes,
    forwardStatic,
    forwardStaticBytes: alteredForwardBytes,
    rollbackManifestBytes,
  }), /static rollback contract SHA-256/u);

  const wildcard = clone(packet);
  wildcard.surfaces.api.published_version_arn = "arn:aws:lambda:*:770880870480:function:matter-lawos-api-prod:11";
  assert.throws(() => validate(wildcard), /exact published-version ARN/u);

  const deletion = clone(packet);
  deletion.data_policy.database_action = "delete_rows";
  assert.throws(() => validate(deletion), /data-preservation|database action/u);
});

test("protected evidence resolves exact Lambda v11 and CloudFront rollback targets", async (t) => {
  const fixture = await protectedEvidenceFixture(t);
  const contractResult = validate(fixture.candidate, Buffer.from(`${JSON.stringify(fixture.candidate, null, 2)}\n`));
  const evidence = verifyCrossSurfaceForwardRollbackEvidence(fixture.candidate, fixture.store);
  assert.equal(evidence.api.published_version, "11");
  assert.equal(evidence.cloudfront.behavior_target_origin_id, "matter-temp-desktop-api-origin");
  assert.equal(evidence.stale_guard_values_reused, false);

  const receipt = buildCrossSurfaceForwardRollbackReceipt({
    packet: fixture.candidate,
    packetSha256: contractResult.packet_sha256,
    sourceSha: oid("a"),
    sourceTree: oid("b"),
    contractResult,
    evidence,
    staticSnapshotProof: {
      save_id: forwardStatic.save_id,
      prior_snapshot_read_only: true,
      snapshot_inventory_sha256: forwardStatic.snapshot_inventory.sha256,
      snapshot_inventory_canonical_sha256: forwardStatic.snapshot_inventory.canonical_sha256,
      profiles: forwardStatic.profiles.map(({ profile, product_id, artifact_count, inventory_sha256 }) => ({
        profile, product_id, artifact_count, inventory_sha256,
        dependency_count: artifact_count, exact_bytes_verified: true,
      })),
    },
    desktopReadback: {
      macos_exact_package_hashes_verified: true,
      windows_package_hashes_contract_bound: true,
      desktop_source_diff_count: 0,
      desktop_mutation_count: 0,
    },
  });
  assert.equal(receipt.verdict, "PASS_LOCAL_DRY_RUN");
  assert.equal(receipt.mutations.external, 0);
  assert.equal(receipt.mutations.database_rows, 0);
  assert.equal(receipt.mutations.desktop, 0);
  assert.equal(receipt.actual_outlook_proved, false);
});
