import assert from "node:assert/strict";
import { chmod, mkdir, mkdtemp, readFile, rm, unlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  buildProductionManifestBindings,
  buildStaticDryRunPlan,
  buildStaticFilesReleaseReceipt,
  openProtectedEvidenceRoot,
  sha256,
  validateCandidateBuildRevision,
  validateForwardStaticRollbackContract,
  validateStaticFilesReleaseReceipt,
  verifyForwardStaticRollbackSnapshot,
} from "../lib/outlook-release-gates.mjs";
import { parseOutlookManifest } from "../lib/outlook-manifest-projection.mjs";
import { inventorySha256 } from "../lib/outlook-release/primitives.mjs";
import { validateOutlookM365CanaryManifestSet } from "../validate-outlook-m365-canary-manifests.mjs";
import {
  clone, contract, hex, readBytes, releaseCandidate, releaseContext, sourceIdentity,
} from "./helpers/outlook-release-fixtures.mjs";

const manifestPaths = [
  "apps/addin/manifest.canary.taskpane.production.xml",
  "apps/addin/manifest.canary.rollback.production.xml",
  "apps/addin/manifest.production.xml",
  "apps/addin/manifest.inquiry.production.xml",
];
const productionOrigin = "https://d2mthcc8vp3cr2.cloudfront.net";
const forwardRollbackBytes = await readBytes("contracts/outlook-addin-forward-static-rollback.json");
const forwardRollback = JSON.parse(forwardRollbackBytes);
const rollbackManifestBytes = await readBytes("apps/addin/manifest.canary.rollback.production.xml");

async function productionBindings(overrides = new Map()) {
  const manifestBytesByPath = new Map();
  for (const manifest of manifestPaths) {
    manifestBytesByPath.set(manifest, overrides.get(manifest) ?? await readBytes(manifest));
  }
  return buildProductionManifestBindings({
    manifestBytesByPath,
    releaseContract: contract,
    origin: productionOrigin,
  });
}

function artifact(file, bytes) {
  return { path: file, byte_size: bytes.byteLength, sha256: sha256(bytes) };
}

async function writeArtifact(root, file, bytes) {
  const bodyRef = `private-local-only/s3/${file}`;
  const absolute = path.join(root, bodyRef);
  await mkdir(path.dirname(absolute), { recursive: true, mode: 0o700 });
  await writeFile(absolute, bytes, { mode: 0o600 });
  return bodyRef;
}

async function protectedSnapshotFixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), "outlook-forward-static-"));
  await chmod(root, 0o700);
  t.after(() => rm(root, { recursive: true, force: true }));
  const fakeContract = clone(contract);
  fakeContract.build.required_static_paths = ["index.html", "outlook-addin/index.html"];
  const values = {
    "addin/assets/matter.css": Buffer.from("body{color:#111}\n"),
    "addin/assets/matter.js": Buffer.from("export const matter = true;\n"),
    "addin/index.html": Buffer.from("<link href=\"/addin/assets/matter.css\"><script src=\"/addin/assets/matter.js\"></script>\n"),
    "outlook-addin/assets/inquiry.css": Buffer.from("body{color:#222}\n"),
    "outlook-addin/assets/inquiry.js": Buffer.from("export const inquiry = true;\n"),
    "outlook-addin/index.html": Buffer.from("<link href=\"/outlook-addin/assets/inquiry.css\"><script src=\"/outlook-addin/assets/inquiry.js\"></script>\n"),
  };
  const fakeForward = clone(forwardRollback);
  const profileFiles = {
    "matter-full": ["addin/assets/matter.css", "addin/assets/matter.js", "addin/index.html"],
    "inquiry-only": [
      "outlook-addin/assets/inquiry.css", "outlook-addin/assets/inquiry.js", "outlook-addin/index.html",
    ],
  };
  const items = [];
  for (const profile of fakeForward.profiles) {
    profile.artifacts = profileFiles[profile.profile].map((file) => artifact(file, values[file]));
    profile.artifact_count = profile.artifacts.length;
    profile.inventory_sha256 = inventorySha256(profile.artifacts);
    profile.taskpane_path = profile.profile === "matter-full" ? "addin/index.html" : "outlook-addin/index.html";
    profile.entry_bundle_path = profile.profile === "matter-full"
      ? "addin/assets/matter.js" : "outlook-addin/assets/inquiry.js";
    for (const row of profile.artifacts) {
      const bodyPath = await writeArtifact(root, row.path, values[row.path]);
      items.push({ key: row.path, sha256: row.sha256, size: row.byte_size, body_path: bodyPath });
    }
  }
  for (let index = items.length; index < 15; index += 1) {
    items.push({
      key: `unused/object-${index}.txt`, sha256: hex("a"), size: 1,
      body_path: `private-local-only/s3/unused/object-${index}.txt`,
    });
  }
  const inventory = {
    inventory_canonical_sha256: hex("9"), object_count: items.length, stable_start_end: true, items,
  };
  const inventoryBytes = Buffer.from(`${JSON.stringify(inventory, null, 2)}\n`);
  const inventoryRef = "aws/s3/static-inventory.json";
  await mkdir(path.join(root, "aws/s3"), { recursive: true, mode: 0o700 });
  await writeFile(path.join(root, inventoryRef), inventoryBytes, { mode: 0o600 });
  fakeForward.snapshot_inventory = {
    ref: inventoryRef,
    sha256: sha256(inventoryBytes),
    canonical_sha256: inventory.inventory_canonical_sha256,
    object_count: items.length,
  };
  return {
    root,
    store: openProtectedEvidenceRoot(root),
    contract: fakeContract,
    forward: fakeForward,
    changedPath: path.join(root, items.find(({ key }) => key === "addin/assets/matter.js").body_path),
    missingPath: path.join(root, items.find(({ key }) => key === "outlook-addin/index.html").body_path),
  };
}

test("production release manifests bind raw and semantic hashes to one exact origin", async () => {
  const bindings = await productionBindings();
  assert.deepEqual(bindings.map(({ stage, version }) => ({ stage, version })), [
    { stage: "taskpane_only", version: "1.3.0.0" },
    { stage: "forward_rollback", version: "1.3.0.2" },
    { stage: "candidate_taskpane", version: "1.3.0.1" },
    { stage: "retained_inquiry", version: "1.1.0.0" },
  ]);
  assert.ok(bindings.every(({ exact_origin, semantic_sha256 }) => exact_origin && /^[a-f0-9]{64}$/u.test(semantic_sha256)));

  const original = await readBytes("apps/addin/manifest.production.xml");
  const escaped = Buffer.from(original.toString("utf8").replaceAll(productionOrigin, "https://static.invalid"));
  await assert.rejects(
    productionBindings(new Map([["apps/addin/manifest.production.xml", escaped]])),
    /escaped the exact origin/,
  );
});

test("forward rollback rejects query-modified aliases even on the exact origin", () => {
  const bytes = Buffer.from(rollbackManifestBytes.toString("utf8").replaceAll(
    "https://d2mthcc8vp3cr2.cloudfront.net/addin/index.html",
    "https://d2mthcc8vp3cr2.cloudfront.net/addin/index.html?rollback=1",
  ));
  const changed = clone(forwardRollback);
  const projection = parseOutlookManifest(bytes.toString("utf8"));
  changed.forward_rollback.manifest_sha256 = sha256(bytes);
  changed.forward_rollback.semantic_sha256 = projection.semantic_manifest_sha256;
  changed.forward_rollback.source_locations = projection.form_source_locations;
  assert.throws(
    () => validateForwardStaticRollbackContract(changed, contract, bytes),
    /not prior-alias-bound/u,
  );
});

test("both profile bundles embed the exact clean source SHA and reject local markers", () => {
  const sourceSha = sourceIdentity.source_sha;
  const matterBytes = Buffer.from(`const revision = "addin@${sourceSha}";\n`);
  const inquiryBytes = Buffer.from(`const revision = "addin@${sourceSha}";\n`);
  const inventory = [
    artifact("assets/matter.js", matterBytes),
    artifact("outlook-addin/assets/inquiry.js", inquiryBytes),
  ];
  const result = validateCandidateBuildRevision({
    inventory,
    bytesByPath: new Map([
      ["assets/matter.js", matterBytes], ["outlook-addin/assets/inquiry.js", inquiryBytes],
    ]),
    releaseContract: contract,
    sourceSha,
  });
  assert.equal(result.profiles.length, 2);

  const unsafe = Buffer.from(`const revision = "addin@${sourceSha}"; const fallback = "addin@local";\n`);
  assert.throws(() => validateCandidateBuildRevision({
    inventory: [artifact("assets/matter.js", unsafe), artifact("outlook-addin/assets/inquiry.js", inquiryBytes)],
    bytesByPath: new Map([["assets/matter.js", unsafe], ["outlook-addin/assets/inquiry.js", inquiryBytes]]),
    releaseContract: contract,
    sourceSha,
  }), /not bound exactly once/);

  const duplicate = Buffer.from(`const first = "addin@${sourceSha}"; const second = "addin@${sourceSha}";\n`);
  assert.throws(() => validateCandidateBuildRevision({
    inventory: [artifact("assets/matter.js", duplicate), artifact("outlook-addin/assets/inquiry.js", inquiryBytes)],
    bytesByPath: new Map([["assets/matter.js", duplicate], ["outlook-addin/assets/inquiry.js", inquiryBytes]]),
    releaseContract: contract,
    sourceSha,
  }), /not bound exactly once/);
});

test("sealed static receipt binds content-addressed candidate and prior snapshot without alias writes", async () => {
  const manifestBindings = await productionBindings();
  const hashes = Object.fromEntries(contract.profiles.map((profile) => [
    profile.profile,
    manifestBindings.find(({ path: manifestPath }) => manifestPath === profile.production_manifest).sha256,
  ]));
  const context = clone(releaseContext);
  for (const profile of contract.profiles) {
    context.manifestHashesByPath[profile.production_manifest] = hashes[profile.profile];
  }
  const candidate = releaseCandidate(hashes, context);
  const staticPlan = buildStaticDryRunPlan({
    releaseReceipt: candidate,
    releaseContext: context,
    sourceLocations: Object.fromEntries(contract.profiles.map((profile) => [
      profile.profile,
      manifestBindings.find(({ path: manifestPath }) => manifestPath === profile.production_manifest).source_locations,
    ])),
    contract,
    bucketRef: "OUTLOOK_STATIC_BUCKET",
  });
  const forwardRollbackResult = validateForwardStaticRollbackContract(forwardRollback, contract, rollbackManifestBytes);
  const priorSnapshotProof = {
    save_id: forwardRollback.save_id,
    snapshot_inventory_sha256: forwardRollback.snapshot_inventory.sha256,
    snapshot_inventory_canonical_sha256: forwardRollback.snapshot_inventory.canonical_sha256,
    prior_snapshot_read_only: true,
    profiles: forwardRollback.profiles.map((profile) => ({
      profile: profile.profile, product_id: profile.product_id, artifact_count: profile.artifact_count,
      inventory_sha256: profile.inventory_sha256, dependency_count: profile.artifact_count,
      exact_bytes_verified: true,
    })),
  };
  const buildRevisionBindings = {
    source_sha: candidate.source_sha,
    local_or_unknown_marker_count: 0,
    profiles: candidate.profile_artifacts.map((profile) => ({
      profile: profile.profile, product_id: profile.product_id,
      build_revision_path: profile.bundle_path, build_revision_sha256: profile.bundle_sha256,
      exact_source_sha_embedded: true,
    })),
  };
  const options = {
    releaseReceipt: candidate,
    releaseContext: context,
    staticPlan,
    releaseContract: contract,
    manifestBindings,
    canaryManifestSet: await validateOutlookM365CanaryManifestSet(),
    forwardRollback,
    forwardRollbackContractRef: "contracts/outlook-addin-forward-static-rollback.json",
    forwardRollbackContractSha256: sha256(forwardRollbackBytes),
    forwardRollbackResult,
    priorSnapshotProof,
    buildRevisionBindings,
  };
  const receipt = buildStaticFilesReleaseReceipt(options);
  assert.deepEqual(validateStaticFilesReleaseReceipt(receipt, options), {
    verdict: "PASS",
    candidate_artifact_count: candidate.artifact_count,
    prior_artifact_count: 15,
    alias_mutation_count: 0,
    external_mutations: 0,
  });
  assert.equal(receipt.coexistence.candidate_prior_coexistence, true);
  assert.equal(receipt.static_plan.overwrite_existing, false);

  const changed = clone(receipt);
  changed.static_plan.profiles[0].operations[0].target_key = "addin/index.html";
  assert.throws(() => validateStaticFilesReleaseReceipt(changed, options), /receipt mismatch/);

  const unbound = clone(buildRevisionBindings);
  unbound.profiles[0].build_revision_path = "assets/unrelated.js";
  assert.throws(() => buildStaticFilesReleaseReceipt({
    ...options,
    buildRevisionBindings: unbound,
  }), /not bound to its entry bundle/u);
});

test("protected prior snapshot rejects modified bytes and missing rollback objects", async (t) => {
  const valid = await protectedSnapshotFixture(t);
  const result = verifyForwardStaticRollbackSnapshot(
    valid.forward, valid.contract, rollbackManifestBytes, valid.store,
  );
  assert.ok(result.profiles.every(({ exact_bytes_verified }) => exact_bytes_verified));

  await writeFile(valid.changedPath, "changed bytes\n", { mode: 0o600 });
  assert.throws(() => verifyForwardStaticRollbackSnapshot(
    valid.forward, valid.contract, rollbackManifestBytes, valid.store,
  ), /SHA-256 mismatch/);

  const missing = await protectedSnapshotFixture(t);
  await unlink(missing.missingPath);
  assert.throws(() => verifyForwardStaticRollbackSnapshot(
    missing.forward, missing.contract, rollbackManifestBytes, missing.store,
  ), /ENOENT/);
});
