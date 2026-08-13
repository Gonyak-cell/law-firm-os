import assert from "node:assert/strict";
import test from "node:test";
import {
  injectMatterDesktopAuthenticodeConfiguration,
  matterDesktopAuthenticodePowerShell,
  resolveMatterDesktopAuthenticodeConfiguration,
  runAfterMatterDesktopAuthenticodeVerification,
  validateMatterDesktopAuthenticodeSignatures,
} from "../lib/matter-desktop-authenticode.mjs";

const CERTIFICATE_SHA1 = "A".repeat(40);

function record(overrides = {}) {
  return {
    status: "Valid",
    status_message: "Signature verified.",
    signature_type: "Authenticode",
    time_stamper_certificate_present: true,
    signer_subject: "CN=AMIC Law",
    signer_issuer: "CN=SSL.com Code Signing CA",
    signer_serial_number: "01AB",
    signer_thumbprint: CERTIFICATE_SHA1,
    signer_certificate_sha256: "C".repeat(64),
    signer_not_before: "2026-01-01T00:00:00.000Z",
    signer_not_after: "2027-01-01T00:00:00.000Z",
    signer_public_key_algorithm_oid: "1.2.840.113549.1.1.1",
    signer_signature_algorithm_oid: "1.2.840.113549.1.1.11",
    signer_eku_oids: ["1.3.6.1.5.5.7.3.3"],
    timestamp_subject: "CN=SSL.com Timestamp Responder",
    timestamp_issuer: "CN=SSL.com Timestamp CA",
    timestamp_serial_number: "02CD",
    timestamp_thumbprint: "B".repeat(40),
    timestamp_certificate_sha256: "D".repeat(64),
    timestamp_not_before: "2026-01-01T00:00:00.000Z",
    timestamp_not_after: "2030-01-01T00:00:00.000Z",
    timestamp_public_key_algorithm_oid: "1.2.840.113549.1.1.1",
    timestamp_signature_algorithm_oid: "1.2.840.113549.1.1.11",
    timestamp_eku_oids: ["1.3.6.1.5.5.7.3.8"],
    ...overrides,
  };
}

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

  const sslCom = resolveMatterDesktopAuthenticodeConfiguration({
    platform: "win32",
    formalRelease: true,
    env: {
      MATTER_DESKTOP_AUTHENTICODE: "1",
      MATTER_DESKTOP_AUTHENTICODE_CERTIFICATE_SHA1: "a".repeat(40),
      MATTER_DESKTOP_AUTHENTICODE_TIMESTAMP_URL: "http://ts.ssl.com",
    },
  });
  assert.equal(sslCom.timestamp_url, "http://ts.ssl.com");
  for (const nearMatch of [
    "https://ts.ssl.com",
    "http://ts.ssl.com/",
    "http://ts.ssl.com.evil.invalid",
    "http://TS.ssl.com",
    " http://ts.ssl.com ",
  ]) {
    assert.throws(() => resolveMatterDesktopAuthenticodeConfiguration({
      platform: "win32",
      formalRelease: true,
      env: {
        MATTER_DESKTOP_AUTHENTICODE: "1",
        MATTER_DESKTOP_AUTHENTICODE_CERTIFICATE_SHA1: "A".repeat(40),
        MATTER_DESKTOP_AUTHENTICODE_TIMESTAMP_URL: nearMatch,
      },
    }), /not approved/u);
  }
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
    record(),
    record({ time_stamper_certificate_present: false }),
  ], { expectedCertificateSha1: CERTIFICATE_SHA1 }), /timestamp/u);
});

test("Authenticode final gate binds public signer, timestamp, and EKU metadata", () => {
  const result = validateMatterDesktopAuthenticodeSignatures(
    [record(), record()],
    { expectedCertificateSha1: CERTIFICATE_SHA1 },
  );
  assert.equal(result.signer_certificate_sha1, CERTIFICATE_SHA1);
  assert.equal(result.signer.subject, "CN=AMIC Law");
  assert.equal(result.signer_code_signing_eku_verified, true);
  assert.equal(result.timestamp_eku_verified, true);
  assert.equal(result.timestamps.length, 2);

  assert.throws(() => validateMatterDesktopAuthenticodeSignatures(
    [record(), record()],
    { expectedCertificateSha1: "C".repeat(40) },
  ), /expected certificate/u);
  assert.throws(() => validateMatterDesktopAuthenticodeSignatures(
    [record(), record({ signer_subject: "CN=Different Signer" })],
    { expectedCertificateSha1: CERTIFICATE_SHA1 },
  ), /different Authenticode signers/u);
  assert.throws(() => validateMatterDesktopAuthenticodeSignatures(
    [record(), record({ signer_eku_oids: [] })],
    { expectedCertificateSha1: CERTIFICATE_SHA1 },
  ), /signer certificate metadata or EKU/u);
  assert.throws(() => validateMatterDesktopAuthenticodeSignatures(
    [record(), record({ timestamp_eku_oids: ["1.3.6.1.5.5.7.3.3"] })],
    { expectedCertificateSha1: CERTIFICATE_SHA1 },
  ), /timestamp certificate metadata or EKU/u);
});

test("PowerShell probe emits only public certificate metadata", () => {
  const source = matterDesktopAuthenticodePowerShell();
  for (const field of [
    "signer_subject",
    "signer_thumbprint",
    "signer_certificate_sha256",
    "signer_eku_oids",
    "timestamp_subject",
    "timestamp_thumbprint",
    "timestamp_certificate_sha256",
    "timestamp_eku_oids",
  ]) assert.match(source, new RegExp(field, "u"));
  assert.doesNotMatch(source, /password|private.?key|pfx/iu);
});

test("an invalid installer signature blocks execution and a valid signature precedes it", async () => {
  const calls = [];
  await assert.rejects(() => runAfterMatterDesktopAuthenticodeVerification({
    records: [record(), record({ signer_thumbprint: "C".repeat(40) })],
    expectedCertificateSha1: CERTIFICATE_SHA1,
    action: async () => calls.push("executed"),
  }), /expected certificate/u);
  assert.deepEqual(calls, []);

  const result = await runAfterMatterDesktopAuthenticodeVerification({
    records: [record(), record()],
    expectedCertificateSha1: CERTIFICATE_SHA1,
    action: async () => {
      calls.push("executed");
      return "ok";
    },
  });
  assert.equal(result.verification.signature_count, 2);
  assert.equal(result.value, "ok");
  assert.deepEqual(calls, ["executed"]);
});

test("a replacement installed executable cannot reach the launch action", async () => {
  let launched = false;
  await assert.rejects(
    () => runAfterMatterDesktopAuthenticodeVerification({
      records: [record(), record()],
      expectedCertificateSha1: CERTIFICATE_SHA1,
      expectedExecutableSha256: "a".repeat(64),
      actualExecutableSha256: "b".repeat(64),
      action: async () => { launched = true; },
    }),
    /installed executable bytes do not match the packaged executable/u,
  );
  assert.equal(launched, false);

  const result = await runAfterMatterDesktopAuthenticodeVerification({
    records: [record(), record()],
    expectedCertificateSha1: CERTIFICATE_SHA1,
    expectedExecutableSha256: "a".repeat(64),
    actualExecutableSha256: "a".repeat(64),
    action: async () => { launched = true; return "launched"; },
  });
  assert.equal(result.value, "launched");
  assert.equal(result.executable_parity.byte_identical, true);
  assert.equal(launched, true);
});
