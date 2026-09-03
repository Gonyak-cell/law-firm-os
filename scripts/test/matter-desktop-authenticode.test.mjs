import assert from "node:assert/strict";
import test from "node:test";
import {
  injectMatterDesktopAuthenticodeConfiguration,
  matterDesktopAuthenticodePowerShell,
  resolveMatterDesktopAuthenticodeConfiguration,
  runAfterMatterDesktopAuthenticodeVerification,
  runAfterUnsignedMatterDesktopTechnicalCandidateInspection,
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

function unsignedRecord(overrides = {}) {
  return {
    status: "NotSigned",
    status_message: "Authenticode signature absent.",
    signature_type: "None",
    time_stamper_certificate_present: false,
    signer_subject: null,
    signer_issuer: null,
    signer_serial_number: null,
    signer_thumbprint: null,
    signer_certificate_sha256: null,
    signer_not_before: null,
    signer_not_after: null,
    signer_public_key_algorithm_oid: null,
    signer_signature_algorithm_oid: null,
    signer_eku_oids: [],
    timestamp_subject: null,
    timestamp_issuer: null,
    timestamp_serial_number: null,
    timestamp_thumbprint: null,
    timestamp_certificate_sha256: null,
    timestamp_not_before: null,
    timestamp_not_after: null,
    timestamp_public_key_algorithm_oid: null,
    timestamp_signature_algorithm_oid: null,
    timestamp_eku_oids: [],
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
  assert.throws(() => resolveMatterDesktopAuthenticodeConfiguration({
    platform: "win32",
    formalRelease: true,
    env: { MATTER_DESKTOP_AUTHENTICODE: "1" },
  }), /40-character certificate-store thumbprint/u);
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
  assert.match(source, /\$ErrorActionPreference = 'Stop'/u);
  assert.match(source, /Get-Item -LiteralPath \$env:MATTER_AUTHENTICODE_PATH -Force -ErrorAction Stop/u);
  assert.match(source, /Get-AuthenticodeSignature -LiteralPath \$artifact\.FullName -ErrorAction Stop/u);
  assert.match(source, /\$signature\.Status\.ToString\(\)/u);
  assert.match(
    source,
    /elseif \(\$signature\.Status -eq 'NotSigned'\) \{ 'Authenticode signature absent\.' \}/u,
  );
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

test("an unsigned technical candidate may run native QA but remains Authenticode-blocked", async () => {
  const calls = [];
  const result = await runAfterUnsignedMatterDesktopTechnicalCandidateInspection({
    records: [unsignedRecord(), unsignedRecord()],
    expectedExecutableSha256: "a".repeat(64),
    actualExecutableSha256: "a".repeat(64),
    action: async () => { calls.push("native-qa"); return "completed"; },
  });
  assert.equal(result.verification, null);
  assert.equal(
    result.verification?.signature_count === 2 ? "PASS" : "BLOCKED_AUTHENTICODE",
    "BLOCKED_AUTHENTICODE",
  );
  assert.equal(result.executable_parity.byte_identical, true);
  assert.equal(result.value, "completed");
  assert.deepEqual(calls, ["native-qa"]);

  await assert.rejects(
    () => runAfterUnsignedMatterDesktopTechnicalCandidateInspection({
      records: [unsignedRecord(), unsignedRecord()],
      expectedExecutableSha256: "a".repeat(64),
      actualExecutableSha256: "b".repeat(64),
      action: async () => calls.push("mismatched"),
    }),
    /installed executable bytes do not match the packaged executable/u,
  );
  assert.deepEqual(calls, ["native-qa"]);
});

test("an unsigned technical candidate rejects incomplete or inconsistent PowerShell evidence", async () => {
  async function rejectsBeforeAction(records) {
    let executed = false;
    await assert.rejects(
      () => runAfterUnsignedMatterDesktopTechnicalCandidateInspection({
        records,
        action: async () => { executed = true; },
      }),
      /complete unsigned technical-candidate Authenticode records are required/u,
    );
    assert.equal(executed, false);
  }

  for (const field of Object.keys(unsignedRecord())) {
    for (const position of [0, 1]) {
      const records = [unsignedRecord(), unsignedRecord()];
      delete records[position][field];
      await rejectsBeforeAction(records);
    }
  }

  for (const [status, statusMessage] of [
    ["Unknown", "Unknown error"],
    ["UnknownError", "Unknown error"],
    ["Error", "Error"],
    ["HashMismatch", "The contents of file have changed."],
  ]) {
    await rejectsBeforeAction([
      unsignedRecord(),
      unsignedRecord({ status, status_message: statusMessage }),
    ]);
  }
  await rejectsBeforeAction([
    unsignedRecord(),
    record(),
  ]);
  await rejectsBeforeAction([
    unsignedRecord(),
    unsignedRecord({ status_message: "The file is not digitally signed." }),
  ]);
  await rejectsBeforeAction([
    unsignedRecord(),
    unsignedRecord({
      status_message: "Authenticode signature absent. ",
    }),
  ]);

  for (const prefix of ["signer", "timestamp"]) {
    for (const field of [
      "subject",
      "issuer",
      "serial_number",
      "thumbprint",
      "certificate_sha256",
      "not_before",
      "not_after",
      "public_key_algorithm_oid",
      "signature_algorithm_oid",
      "eku_oids",
    ]) {
      await rejectsBeforeAction([
        unsignedRecord(),
        unsignedRecord({
          [`${prefix}_${field}`]: field === "eku_oids" ? ["1.2.3"] : "unexpected",
        }),
      ]);
    }
  }
  for (const extraMetadata of [
    { unexpected: "metadata" },
    { thumbprint: "A".repeat(40) },
    { signer: { subject: "CN=Unexpected" } },
    { timestamp_certificate: { thumbprint: "B".repeat(40) } },
  ]) {
    await rejectsBeforeAction([
      unsignedRecord(),
      unsignedRecord(extraMetadata),
    ]);
  }
});

test("unsigned inspection rejects JavaScript shape and prototype bypasses before action", async () => {
  async function rejectsBeforeAction(records) {
    let executed = false;
    await assert.rejects(
      () => runAfterUnsignedMatterDesktopTechnicalCandidateInspection({
        records,
        action: async () => { executed = true; },
      }),
      /complete unsigned technical-candidate Authenticode records are required/u,
    );
    assert.equal(executed, false);
  }

  const sparse = new Array(2);
  sparse[0] = unsignedRecord();
  await rejectsBeforeAction(sparse);

  const shadowedEvery = [unsignedRecord(), unsignedRecord()];
  shadowedEvery.every = () => true;
  await rejectsBeforeAction(shadowedEvery);

  const accessorIndex = [unsignedRecord(), unsignedRecord()];
  Object.defineProperty(accessorIndex, 1, { enumerable: true, get: () => unsignedRecord() });
  await rejectsBeforeAction(accessorIndex);

  const customArrayPrototype = [unsignedRecord(), unsignedRecord()];
  Object.setPrototypeOf(customArrayPrototype, Object.create(Array.prototype));
  await rejectsBeforeAction(customArrayPrototype);

  const inheritedRequired = unsignedRecord();
  delete inheritedRequired.status;
  Object.setPrototypeOf(inheritedRequired, { status: "NotSigned" });
  const inheritedExtra = Object.setPrototypeOf(unsignedRecord(), { unexpected: true });
  const nullPrototype = Object.assign(Object.create(null), unsignedRecord());
  const customPrototype = Object.setPrototypeOf(unsignedRecord(), { custom: true });
  const arrayRecord = Object.assign([], unsignedRecord());
  for (const malformed of [inheritedRequired, inheritedExtra, nullPrototype, customPrototype, arrayRecord, null]) {
    await rejectsBeforeAction([unsignedRecord(), malformed]);
  }

  for (const overrides of [
    { status: new String("NotSigned") },
    { status_message: new String(unsignedRecord().status_message) },
    { signature_type: new String("None") },
    { time_stamper_certificate_present: new Boolean(false) },
  ]) await rejectsBeforeAction([unsignedRecord(), unsignedRecord(overrides)]);

  for (const mutate of [
    (value) => { value[Symbol("extra")] = true; },
    (value) => Object.defineProperty(value, "extra", { value: true }),
    (value) => Object.defineProperty(value, "extra", { enumerable: true, get: () => true }),
    (value) => Object.defineProperty(value, "status", { value: "NotSigned", enumerable: false }),
  ]) {
    const malformed = unsignedRecord();
    mutate(malformed);
    await rejectsBeforeAction([unsignedRecord(), malformed]);
  }

  let accessorCalled = false;
  const accessorRecord = unsignedRecord();
  Object.defineProperty(accessorRecord, "status", {
    enumerable: true,
    get: () => { accessorCalled = true; return "NotSigned"; },
  });
  await rejectsBeforeAction([unsignedRecord(), accessorRecord]);
  assert.equal(accessorCalled, false);
});

test("unsigned inspection rejects live and revoked proxies without traps or action", async () => {
  async function rejectsBeforeAction(records) {
    let executed = false;
    await assert.rejects(
      () => runAfterUnsignedMatterDesktopTechnicalCandidateInspection({
        records,
        action: async () => { executed = true; },
      }),
      /complete unsigned technical-candidate Authenticode records are required/u,
    );
    assert.equal(executed, false);
  }

  let trapCalled = false;
  const hidingHandler = {
    getPrototypeOf: () => { trapCalled = true; return Object.prototype; },
    ownKeys: (target) => { trapCalled = true; return Reflect.ownKeys(target).filter((key) => key !== "unexpected"); },
    getOwnPropertyDescriptor: (target, key) => { trapCalled = true; return Reflect.getOwnPropertyDescriptor(target, key); },
  };
  await rejectsBeforeAction(new Proxy([unsignedRecord(), unsignedRecord()], hidingHandler));
  await rejectsBeforeAction([
    unsignedRecord(),
    new Proxy(unsignedRecord({ unexpected: true }), hidingHandler),
  ]);
  await rejectsBeforeAction([
    unsignedRecord(),
    unsignedRecord({ signer_eku_oids: new Proxy([], hidingHandler) }),
  ]);
  assert.equal(trapCalled, false);

  for (const target of [
    [unsignedRecord(), unsignedRecord()],
    unsignedRecord(),
    [],
  ]) {
    const { proxy, revoke } = Proxy.revocable(target, {});
    revoke();
    if (Array.isArray(target) && target.length === 2) await rejectsBeforeAction(proxy);
    else if (Array.isArray(target)) await rejectsBeforeAction([
      unsignedRecord(),
      unsignedRecord({ signer_eku_oids: proxy }),
    ]);
    else await rejectsBeforeAction([unsignedRecord(), proxy]);
  }
});

test("a signed candidate without an exact expected signer thumbprint cannot run", async () => {
  let executed = false;
  const inheritedOptIn = Object.assign(Object.create({ allowUnsignedTechnicalCandidate: true }), {
    records: [unsignedRecord(), unsignedRecord()],
    action: async () => { executed = true; },
  });
  await assert.rejects(
    () => runAfterMatterDesktopAuthenticodeVerification(inheritedOptIn),
    /expected Authenticode certificate SHA-1 thumbprint is required/u,
  );
  await assert.rejects(
    () => runAfterMatterDesktopAuthenticodeVerification({
      records: [record(), record()],
      action: async () => { executed = true; },
    }),
    /expected Authenticode certificate SHA-1 thumbprint is required/u,
  );
  assert.equal(executed, false);
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
