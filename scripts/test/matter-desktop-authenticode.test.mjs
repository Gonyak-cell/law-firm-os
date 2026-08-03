import assert from "node:assert/strict";
import test from "node:test";
import {
  injectMatterDesktopAuthenticodeConfiguration,
  resolveMatterDesktopAuthenticodeConfiguration,
  validateMatterDesktopAuthenticodeSignatures,
} from "../lib/matter-desktop-authenticode.mjs";

test("final Windows build uses only a certificate-store thumbprint and approved RFC3161 endpoint", () => {
  const value = resolveMatterDesktopAuthenticodeConfiguration({
    platform: "win32",
    formalRelease: true,
    env: {
      MATTER_DESKTOP_AUTHENTICODE: "1",
      MATTER_DESKTOP_AUTHENTICODE_CERTIFICATE_SHA1: "a".repeat(40),
      MATTER_DESKTOP_AUTHENTICODE_TIMESTAMP_URL: "https://timestamp.digicert.com",
    },
  });
  assert.equal(value.certificate_sha1, "A".repeat(40));
  const config = injectMatterDesktopAuthenticodeConfiguration(
    "appId: com.amic.matter\nwin:\n  target:\n    - nsis\n",
    value,
  );
  assert.match(config, /^win:\n  signtoolOptions:\n/mu);
  assert.match(config, /certificateSha1: "A{40}"/u);
  assert.match(config, /rfc3161TimeStampServer: "https:\/\/timestamp\.digicert\.com"/u);
  assert.match(config, /signingHashAlgorithms:\n      - sha256/u);
  assert.equal(config.includes("-c.win."), false);
  assert.doesNotMatch(JSON.stringify(value), /password|pfx|private_key/iu);
});

test("Authenticode configuration rejects non-Windows and unapproved timestamp inputs", () => {
  assert.throws(() => resolveMatterDesktopAuthenticodeConfiguration({
    platform: "darwin",
    formalRelease: true,
    env: {
      MATTER_DESKTOP_AUTHENTICODE: "1",
      MATTER_DESKTOP_AUTHENTICODE_CERTIFICATE_SHA1: "A".repeat(40),
    },
  }), /Windows/u);
  assert.throws(() => resolveMatterDesktopAuthenticodeConfiguration({
    platform: "win32",
    formalRelease: true,
    env: {
      MATTER_DESKTOP_AUTHENTICODE: "1",
      MATTER_DESKTOP_AUTHENTICODE_CERTIFICATE_SHA1: "A".repeat(40),
      MATTER_DESKTOP_AUTHENTICODE_TIMESTAMP_URL: "http://timestamp.invalid",
    },
  }), /not approved/u);
  assert.throws(() => injectMatterDesktopAuthenticodeConfiguration(
    "appId: com.amic.matter\n",
    {
      certificate_sha1: "A".repeat(40),
      timestamp_url: "https://timestamp.digicert.com",
    },
  ), /exactly one win block/u);
});

function signature(overrides = {}) {
  return {
    status: "Valid",
    status_message: "Signature verified.",
    signature_type: "Authenticode",
    signer_certificate_present: true,
    time_stamper_certificate_present: true,
    signer_thumbprint: "A".repeat(40),
    signer_subject: "CN=AMIC Law Firm, O=AMIC Law Firm, C=KR",
    signer_issuer: "CN=Example Code Signing CA, O=Example CA, C=US",
    signer_team_equivalent: "AMIC Law Firm",
    ...overrides,
  };
}

const EXPECTED_SIGNER = {
  thumbprint_sha1: "A".repeat(40),
  subject: "CN=AMIC Law Firm, O=AMIC Law Firm, C=KR",
  issuer: "CN=Example Code Signing CA, O=Example CA, C=US",
  team_equivalent: "AMIC Law Firm",
};

test("Authenticode final gate accepts only the approved signer pair", () => {
  const result = validateMatterDesktopAuthenticodeSignatures([
    signature(),
    signature(),
  ], { expectedSigner: EXPECTED_SIGNER });
  assert.equal(result.signature_count, 2);
  assert.equal(result.signer_thumbprint_sha256_source, "A".repeat(40));
  assert.equal(result.signer_subject, EXPECTED_SIGNER.subject);
  assert.equal(result.signer_issuer, EXPECTED_SIGNER.issuer);
  assert.equal(result.signer_team_equivalent, EXPECTED_SIGNER.team_equivalent);
});

test("Authenticode final gate rejects missing timestamps and arbitrary fingerprints", () => {
  assert.throws(() => validateMatterDesktopAuthenticodeSignatures([
    signature(),
    signature({ time_stamper_certificate_present: false }),
  ]), /timestamp/u);
  assert.throws(() => validateMatterDesktopAuthenticodeSignatures([
    signature(),
    signature({ signer_certificate_present: false }),
  ]), /signature/u);
  assert.throws(() => validateMatterDesktopAuthenticodeSignatures([
    signature({ signer_thumbprint: "B".repeat(40) }),
    signature({ signer_thumbprint: "B".repeat(40) }),
  ], { expectedSigner: EXPECTED_SIGNER }), /approved Windows signing authority/u);
});
