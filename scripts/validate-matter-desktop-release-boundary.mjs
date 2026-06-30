#!/usr/bin/env node
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const desktopPackage = JSON.parse(readFileSync(path.join(ROOT, "apps/desktop/package.json"), "utf8"));
const releaseId = `matter-desktop-internal-${desktopPackage.version}`;
const manifestPath = path.join(ROOT, "apps/desktop/dist/release", releaseId, "release-manifest.json");
const macosReceiptPath = path.join(ROOT, "docs/lazycodex/evidence/matter-desktop/artifacts/macos-build.md");
const releaseReceiptPath = path.join(ROOT, "docs/desktop/matter-desktop-temporary-release-receipt.md");
const ownerPacketPath = path.join(ROOT, "docs/desktop/matter-desktop-owner-decision-packet.md");

function readRequired(filePath) {
  assert(existsSync(filePath), `missing file: ${path.relative(ROOT, filePath)}`);
  return readFileSync(filePath, "utf8");
}

function receiptValue(source, label) {
  const prefix = `- ${label}:`;
  const line = source.split(/\r?\n/).find((entry) => entry.startsWith(prefix));
  assert(line, `missing receipt line: ${label}`);
  return line.slice(prefix.length).trim();
}

const manifest = JSON.parse(readRequired(manifestPath));
const macosReceipt = readRequired(macosReceiptPath);
const releaseReceipt = readRequired(releaseReceiptPath);
const ownerPacket = readRequired(ownerPacketPath);

const signing = {
  developerIdSigning: receiptValue(macosReceipt, "Developer ID signing"),
  requestedSigningMode: receiptValue(macosReceipt, "requested signing mode"),
  resolvedSigningIdentity: receiptValue(macosReceipt, "resolved signing identity"),
  codesignVerify: receiptValue(macosReceipt, "codesign verify"),
  strictCodesignVerify: receiptValue(macosReceipt, "strict codesign verify"),
  gatekeeperAssess: receiptValue(macosReceipt, "gatekeeper assess"),
  publicDistributionApproval: receiptValue(macosReceipt, "public distribution approval"),
  notarizationRequested: receiptValue(macosReceipt, "notarization requested"),
  notarizationCredentialSource: receiptValue(macosReceipt, "notarization credential source"),
  notarizationState: receiptValue(macosReceipt, "notarization state"),
};

assert.equal(manifest.release_id, releaseId, "release manifest id mismatch");
assert.equal(manifest.public_release_claim, false, "public release claim must remain false");
assert.equal(manifest.production_go_live_claim, false, "production go-live claim must remain false");
assert.equal(manifest.owner_approval_claim, false, "owner approval claim must remain false");
assert.equal(manifest.app_store_distribution_claim, false, "App Store distribution claim must remain false");
assert.equal(manifest.external_pilot_distribution_claim, false, "external pilot distribution claim must remain false");

assert.equal(signing.developerIdSigning, "applied", "Developer ID signing must be applied for release boundary closeout");
assert.equal(signing.requestedSigningMode, "developer-id", "macOS build must be run in Developer ID signing mode");
assert.match(signing.resolvedSigningIdentity, /^Developer ID Application:/, "resolved signing identity must be a Developer ID Application identity");
assert.equal(signing.codesignVerify, "pass", "codesign verify must pass");
assert.equal(signing.strictCodesignVerify, "pass", "strict codesign verify must pass");
assert.equal(signing.gatekeeperAssess, "pass", "Gatekeeper assessment must pass after notarization and stapling");
assert.equal(signing.publicDistributionApproval, "not claimed", "public distribution approval must not be claimed");
assert.equal(signing.notarizationRequested, "true", "notarization must be requested for notarized release boundary closeout");
assert.equal(signing.notarizationCredentialSource, "present", "notarization credential source must be recorded as present");
assert.equal(signing.notarizationState, "submitted_and_accepted_by_notarytool", "notarization state must record accepted notarytool submission");

assert.deepEqual(manifest.macos_signing, {
  developer_id_signing: signing.developerIdSigning,
  requested_signing_mode: signing.requestedSigningMode,
  resolved_signing_identity: signing.resolvedSigningIdentity,
  codesign_verify: signing.codesignVerify,
  strict_codesign_verify: signing.strictCodesignVerify,
  gatekeeper_assess: signing.gatekeeperAssess,
  public_distribution_approval: signing.publicDistributionApproval,
  notarization_requested: signing.notarizationRequested,
  notarization_credential_source: signing.notarizationCredentialSource,
  notarization_state: signing.notarizationState,
}, "release manifest macOS signing state must match macOS receipt");

const requiredReleaseReceiptPhrases = [
  "Developer ID signing | applied",
  "notarization requested | true",
  "notarization credential source | present",
  "notarization state | submitted_and_accepted_by_notarytool",
  "Public release: false",
  "Production go-live: false",
  "Owner approval: false",
];
for (const phrase of requiredReleaseReceiptPhrases) {
  assert(releaseReceipt.includes(phrase), `release receipt missing boundary phrase: ${phrase}`);
}

const ownerPacketStatusOk =
  ownerPacket.includes("Status: owner-decision-not-recorded") ||
  ownerPacket.includes("Status: owner-approval-gate-recorded");
assert(ownerPacketStatusOk, "owner decision packet status must be not-recorded or owner-approval-gate-recorded");

const requiredOwnerPacketPhrases = [
  "| public-release | false |",
  "| owner-approved | false |",
  "notarization",
  "public release: false",
];
for (const phrase of requiredOwnerPacketPhrases) {
  assert(ownerPacket.includes(phrase), `owner decision packet missing boundary phrase: ${phrase}`);
}

console.log(
  JSON.stringify(
    {
      verdict: "PASS",
      release_id: releaseId,
      developer_id_signing: signing.developerIdSigning,
      signing_identity: signing.resolvedSigningIdentity,
      codesign_verify: signing.codesignVerify,
      strict_codesign_verify: signing.strictCodesignVerify,
      gatekeeper_assess: signing.gatekeeperAssess,
      notarization_state: signing.notarizationState,
      public_release_claim: false,
      production_go_live_claim: false,
      owner_approval_claim: false,
    },
    null,
    2,
  ),
);
