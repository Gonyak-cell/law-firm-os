import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import test from "node:test";

import { validateOutlookAddinSurfaces } from "../../../scripts/validate-outlook-addin-surfaces.mjs";

const addinRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(addinRoot, "../..");
const contractPath = path.join(repoRoot, "contracts/outlook-addin-surfaces.json");
const baselinePath = path.join(repoRoot, "contracts/outlook-addin-deployment-baseline.json");
const rollbackPath = path.join(repoRoot, "contracts/outlook-addin-rollback.json");
const baselineReceipt = JSON.parse(await readFile(baselinePath, "utf8"));

async function validate(overrides = {}) {
  return validateOutlookAddinSurfaces({
    repoRoot,
    contractPath,
    baseline: baselineReceipt,
    mode: "candidate",
    ...overrides,
  });
}

test("an explicit independent OUTM-01 baseline receipt is required and exact", async () => {
  await assert.rejects(
    validateOutlookAddinSurfaces({ repoRoot, contractPath }),
    /explicit OUTM-01 baseline receipt is required/u,
  );

  const wrongHash = structuredClone(baselineReceipt);
  wrongHash.profiles[1].manifest_sha256 = "0".repeat(64);
  await assert.rejects(validate({ baseline: wrongHash, mode: "baseline" }), /baseline manifest_sha256/u);

  const missingField = structuredClone(baselineReceipt);
  delete missingField.profiles[0].assignment_count;
  await assert.rejects(validate({ baseline: missingField, mode: "baseline" }), /assignment_count is required/u);

  const duplicate = structuredClone(baselineReceipt);
  duplicate.profiles.push(structuredClone(duplicate.profiles[0]));
  await assert.rejects(validate({ baseline: duplicate, mode: "baseline" }), /duplicate baseline ProductId/u);

  const extra = structuredClone(baselineReceipt);
  extra.profiles.push({ ...structuredClone(extra.profiles[0]), product_id: "00000000-0000-0000-0000-000000000000" });
  await assert.rejects(validate({ baseline: extra, mode: "baseline" }), /baseline ProductIds mismatch/u);

  const result = await validate({ mode: "baseline" });
  assert.deepEqual(result.profiles.map(({ product_id, version, manifest_sha256 }) => ({
    product_id, version, manifest_sha256,
  })), baselineReceipt.profiles.map(({ product_id, version, manifest_sha256 }) => ({
    product_id, version, manifest_sha256,
  })));
});

test("rollback contract reconstructs the authoritative 1.0.1.1 bytes without historical assignments", async () => {
  const rollback = JSON.parse(await readFile(rollbackPath, "utf8"));
  assert.equal(rollback.candidate_version, "1.1.0.0");
  assert.equal(rollback.rollback_version, "1.0.1.1");
  assert.equal(rollback.authoritative_baseline_receipt, "contracts/outlook-addin-deployment-baseline.json");
  assert.equal(rollback.assignment_restore_policy, "reconcile_to_validated_single_visible_distribution");
  assert.equal(rollback.raw_assignment_pii_included, false);
  assert.equal(rollback.secret_material_included, false);
  assert.equal(rollback.raw_manifest_xml_included, false);
  assert.equal(rollback.permission_event_diff, "none");

  for (const [index, manifestName] of ["manifest.production.xml", "manifest.inquiry.production.xml"].entries()) {
    const profile = rollback.profiles[index];
    const baseline = baselineReceipt.profiles[index];
    assert.equal(profile.product_id, baseline.product_id);
    assert.equal(profile.rollback_manifest_sha256, baseline.manifest_sha256);
    assert.equal("assignment_count" in profile, false);
    assert.equal("sanitized_assignment_fingerprint_sha256" in profile, false);
    assert.equal(
      profile.rollback_manifest_url,
      `https://d2mthcc8vp3cr2.cloudfront.net/addin/manifests/${baseline.product_id}/1.0.1.1/manifest-${baseline.manifest_sha256}.xml`,
    );
    assert.match(profile.protected_manifest_ref, new RegExp(`manifest\\.${profile.profile}\\.1\\.0\\.1\\.1\\.xml$`, "u"));

    const candidate = await readFile(path.join(addinRoot, manifestName), "utf8");
    const rollbackBytes = candidate.replace("<Version>1.1.0.0</Version>", "<Version>1.0.1.1</Version>");
    assert.notEqual(rollbackBytes, candidate, `${manifestName} must contain the synchronized candidate version`);
    assert.equal(createHash("sha256").update(rollbackBytes).digest("hex"), profile.rollback_manifest_sha256);
  }
  assert.doesNotMatch(JSON.stringify(rollback), /<OfficeApp|@|bearer|secret["']?\s*:/iu);
});
