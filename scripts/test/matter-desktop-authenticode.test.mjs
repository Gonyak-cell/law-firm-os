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

test("Authenticode final gate rejects non-Windows, unapproved timestamp and missing timestamp signature", () => {
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
  assert.throws(() => validateMatterDesktopAuthenticodeSignatures([
    {
      status: "Valid",
      status_message: "Signature verified.",
      signature_type: "Authenticode",
      time_stamper_certificate_present: true,
      signer_thumbprint: "A".repeat(40),
    },
    {
      status: "Valid",
      status_message: "Signature verified.",
      signature_type: "Authenticode",
      time_stamper_certificate_present: false,
      signer_thumbprint: "A".repeat(40),
    },
  ]), /timestamp/u);
});
