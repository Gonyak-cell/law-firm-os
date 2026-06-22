#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const desktopPackage = JSON.parse(readFileSync(path.join(ROOT, "apps/desktop/package.json"), "utf8"));
const releaseId = `matter-desktop-internal-${desktopPackage.version}`;
const manifestPath = path.join(ROOT, "apps/desktop/dist/release", releaseId, "release-manifest.json");
const checksumPath = path.join(ROOT, "apps/desktop/dist/release", releaseId, "checksums.sha256");
const receiptPath = path.join(ROOT, "docs/desktop/matter-desktop-temporary-release-receipt.md");

function sha256(filePath) {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

assert(existsSync(manifestPath), `missing release manifest: ${path.relative(ROOT, manifestPath)}`);
assert(existsSync(checksumPath), `missing checksums: ${path.relative(ROOT, checksumPath)}`);
assert(existsSync(receiptPath), `missing release receipt: ${path.relative(ROOT, receiptPath)}`);

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const checksums = readFileSync(checksumPath, "utf8");
const receipt = readFileSync(receiptPath, "utf8");

assert.equal(manifest.schema_version, "law-firm-os.matter-desktop-temporary-release.v0.1");
assert.equal(manifest.release_id, releaseId);
assert.equal(manifest.status, "internal_temporary_release_executed");
assert.equal(manifest.product_name, "matter");
assert.equal(manifest.package_name, "@law-firm-os/desktop");
assert.equal(manifest.internal_app_id, "com.amic.matter.desktop.internal");
assert.equal(manifest.channel, "internal");
assert.equal(manifest.custom_domain_required, false);
assert.equal(manifest.public_release_claim, false);
assert.equal(manifest.production_go_live_claim, false);
assert.equal(manifest.owner_approval_claim, false);
assert.equal(manifest.app_store_distribution_claim, false);
assert.equal(manifest.microsoft_store_distribution_claim, false);
assert.equal(manifest.external_pilot_distribution_claim, false);
assert.equal(manifest.artifacts.length, 7);

for (const artifact of manifest.artifacts) {
  const artifactPath = path.join(ROOT, artifact.path);
  assert(existsSync(artifactPath), `missing artifact in release manifest: ${artifact.path}`);
  assert.equal(artifact.sha256, sha256(artifactPath), `sha256 mismatch for ${artifact.path}`);
  assert(checksums.includes(`${artifact.sha256}  ${artifact.display_path}`), `checksum entry missing for ${artifact.display_path}`);
}

const requiredReceiptPhrases = [
  "Status: internal-temporary-release-executed-with-artifacts",
  `Release ID | \`${releaseId}\``,
  `Manifest | \`apps/desktop/dist/release/${releaseId}/release-manifest.json\``,
  "Custom domain requirement | false",
  "macOS app bundle | `apps/desktop/dist/mac/matter.app`",
  "macOS ZIP archive",
  "macOS DMG image",
  "Windows internal manifest",
  "Public release: false",
  "Production go-live: false",
  "Owner approval: false",
];

for (const phrase of requiredReceiptPhrases) {
  assert(receipt.includes(phrase), `temporary release receipt missing phrase: ${phrase}`);
}

console.log(
  JSON.stringify(
    {
      verdict: "PASS",
      release_id: releaseId,
      artifact_count: manifest.artifacts.length,
      checksum_entries_verified: manifest.artifacts.length,
      custom_domain_required: false,
      public_release_claim: false,
      production_go_live_claim: false,
      owner_approval_claim: false,
    },
    null,
    2,
  ),
);
