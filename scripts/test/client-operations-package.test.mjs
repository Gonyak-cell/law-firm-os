import assert from "node:assert/strict";
import { createHash, generateKeyPairSync, randomUUID, sign } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";
import {
  CLIENT_OPERATIONS_TRUST_ANCHOR_ENV,
  sha256Path,
  readClientOperationsGitIdentity,
  validateClientOperationsPackage,
} from "../verify-client-operations-package.mjs";

const RUN_ID = "run-20260731-client-ops-001";
let ACTIVE_SOURCE_SHA;
let ACTIVE_RUN_ID = RUN_ID;
let ACTIVE_TEST_KEY_ID;
let ACTIVE_TEST_SIGNING_KEY;

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function runPath(relativePath) {
  return `runs/${ACTIVE_RUN_ID}/${relativePath}`;
}

function initGitFixture(root) {
  writeFileSync(path.join(root, ".gitignore"), "runs/\n");
  writeFileSync(path.join(root, "source.txt"), "client-operations-source-v1\n");
  execFileSync("git", ["init", "-b", "main"], { cwd: root, stdio: "ignore" });
  execFileSync("git", ["config", "user.email", "qa@example.invalid"], { cwd: root, stdio: "ignore" });
  execFileSync("git", ["config", "user.name", "Client Operations QA"], { cwd: root, stdio: "ignore" });
  execFileSync("git", ["add", ".gitignore", "source.txt"], { cwd: root, stdio: "ignore" });
  execFileSync("git", ["commit", "-m", "client operations fixture source"], { cwd: root, stdio: "ignore" });
  const sourceSha = execFileSync("git", ["rev-parse", "HEAD^{commit}"], { cwd: root, encoding: "utf8" }).trim();
  execFileSync("git", ["update-ref", "refs/remotes/origin/main", sourceSha], { cwd: root, stdio: "ignore" });
  ACTIVE_SOURCE_SHA = sourceSha;
  return sourceSha;
}

function writeJson(root, relativePath, value) {
  const absolute = path.join(root, relativePath);
  mkdirSync(path.dirname(absolute), { recursive: true });
  writeFileSync(absolute, `${JSON.stringify(value)}\n`);
  return absolute;
}

function writeBytes(root, relativePath, value) {
  const absolute = path.join(root, relativePath);
  mkdirSync(path.dirname(absolute), { recursive: true });
  writeFileSync(absolute, value);
  return absolute;
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
  }
  return value;
}

function canonicalDigest(value) {
  return sha256(JSON.stringify(canonical(value)));
}

function signPayload(value) {
  return sign(null, Buffer.from(JSON.stringify(canonical(value))), ACTIVE_TEST_SIGNING_KEY).toString("base64");
}

function receiptRef(root, relativePath, receipt, artifactSha, attestationBindings = {}) {
  const scopedPath = relativePath.startsWith("runs/") ? relativePath : runPath(relativePath);
  const scopedReceipt = { run_id: ACTIVE_RUN_ID, ...receipt };
  writeJson(root, scopedPath, scopedReceipt);
  const receiptBytes = readFileSync(path.join(root, scopedPath));
  const receiptSha = sha256(receiptBytes);
  const attestationPath = scopedPath.replace(/\.json$/u, ".attestation.json");
  const attestation = {
    schema_version: "law-firm-os.client-operations.receipt-attestation.v1",
    issuer: "github-actions",
    public_key_id: ACTIVE_TEST_KEY_ID,
    independently_generated: true,
    signed: true,
    signature_algorithm: "ed25519",
    provenance_type: "trusted-ci-build",
    run_id: ACTIVE_RUN_ID,
    workflow_run_id: ACTIVE_RUN_ID,
    generated_by: "github-actions",
    generated_at: "2026-07-31T00:00:00.000Z",
    git_object_exists: true,
    receipt_sha256: receiptSha,
    source_sha: ACTIVE_SOURCE_SHA,
    ...(artifactSha ? { artifact_sha256: artifactSha } : {}),
    ...attestationBindings,
  };
  writeJson(root, attestationPath, { ...attestation, signature: signPayload(attestation) });
  return {
    receipt_path: scopedPath,
    receipt_sha256: receiptSha,
    attestation_path: attestationPath,
    attestation_sha256: sha256(readFileSync(path.join(root, attestationPath))),
  };
}

function artifactManifest(root, artifactPath, artifactKind, bytes) {
  const scopedArtifactPath = artifactPath.startsWith("runs/") ? artifactPath : runPath(artifactPath);
  const manifestPath = `${scopedArtifactPath}.manifest.json`;
  const manifestBase = {
    schema_version: "law-firm-os.client-operations.artifact-manifest.v1",
    artifact_kind: artifactKind,
    commit_sha: ACTIVE_SOURCE_SHA,
    run_id: ACTIVE_RUN_ID,
  };
  const manifestDigest = canonicalDigest(manifestBase);
  const marker = Buffer.from([
    `LAWOS_ARTIFACT_COMMIT_SHA=${ACTIVE_SOURCE_SHA}`,
    `LAWOS_ARTIFACT_MANIFEST_DIGEST=${manifestDigest}`,
    `LAWOS_ARTIFACT_RUN_ID=${ACTIVE_RUN_ID}`,
    "",
  ].join("\n"));
  const artifactBytes = Buffer.concat([bytes, marker]);
  writeBytes(root, scopedArtifactPath, artifactBytes);
  const artifactSha = sha256(artifactBytes);
  writeJson(root, manifestPath, {
    ...manifestBase,
    artifact_sha256: artifactSha,
    manifest_digest: manifestDigest,
  });
  return {
    artifact_path: scopedArtifactPath,
    artifact_sha256: artifactSha,
    embedded_manifest_path: manifestPath,
    embedded_manifest_sha256: sha256(readFileSync(path.join(root, manifestPath))),
  };
}

function buildEntry(root, key, artifactPath, bytes) {
  const artifact = artifactManifest(root, artifactPath, key, bytes);
  const schema = key === "web_build"
    ? "law-firm-os.client-operations.web-build-receipt.v1"
    : "law-firm-os.client-operations.addin-build-receipt.v1";
  const receiptPath = `receipts/${key}.json`;
  const receipt = receiptRef(root, receiptPath, {
    schema_version: schema,
    status: "PASS",
    source_sha: ACTIVE_SOURCE_SHA,
    artifact_sha256: artifact.artifact_sha256,
    embedded_manifest_sha256: artifact.embedded_manifest_sha256,
    embedded_commit_sha: ACTIVE_SOURCE_SHA,
    tests_passed: true,
  }, artifact.artifact_sha256, {
    artifact_manifest_sha256: artifact.embedded_manifest_sha256,
    artifact_kind: key,
  });
  return {
    ...receipt,
    ...artifact,
  };
}

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBytes = Buffer.from(type, "ascii");
  const body = Buffer.concat([typeBytes, data]);
  const output = Buffer.alloc(12 + data.length);
  output.writeUInt32BE(data.length, 0);
  body.copy(output, 4);
  output.writeUInt32BE(crc32(body), 8 + data.length);
  return output;
}

function gradientPng(width = 320, height = 180, variant = 0) {
  const raw = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y += 1) {
    const row = y * (1 + width * 4);
    raw[row] = 0;
    for (let x = 0; x < width; x += 1) {
      const offset = row + 1 + x * 4;
      raw[offset] = (x + variant) % 256;
      raw[offset + 1] = y % 256;
      raw[offset + 2] = (x + y) % 256;
      raw[offset + 3] = 255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.concat([signature, pngChunk("IHDR", ihdr), pngChunk("IDAT", deflateSync(raw)), pngChunk("IEND", Buffer.alloc(0))]);
}

function makeFixture({ mode = "release" } = {}) {
  const keyPair = generateKeyPairSync("ed25519");
  ACTIVE_TEST_KEY_ID = `test-ephemeral-${randomUUID()}`;
  ACTIVE_TEST_SIGNING_KEY = keyPair.privateKey;
  const root = mkdtempSync(path.join(tmpdir(), "client-operations-package-"));
  const sourceSha = initGitFixture(root);
  ACTIVE_RUN_ID = `${RUN_ID}-${mode}`;
  const web = buildEntry(root, "web_build", "artifacts/web-build.bin", Buffer.from("web-build"));
  const addin = buildEntry(root, "addin_build", "artifacts/addin-build.bin", Buffer.from("addin-build"));

  const migrationSha = sha256(Buffer.from("migration-set-v1"));
  const migration = receiptRef(root, "receipts/migration.json", {
    schema_version: "law-firm-os.client-operations.migration-receipt.v1",
    status: "PASS",
    source_sha: ACTIVE_SOURCE_SHA,
    migration_sha256: migrationSha,
  }, migrationSha);
  const apiArtifact = artifactManifest(root, "artifacts/api-package.bin", "api_package", Buffer.from("api-package"));
  const apiSha = apiArtifact.artifact_sha256;
  const fixtureValues = {
    client_ref: "fixture-client-001",
    matter_ref: "fixture-matter-001",
    phase: "active",
    open_balance_cents: 125000,
    currency: "KRW",
  };
  const apiResponsePath = runPath("responses/api-signed-session.json");
  const apiResponse = {
    schema_version: "law-firm-os.client-operations.api-response.v1",
    run_id: ACTIVE_RUN_ID,
    source_sha: ACTIVE_SOURCE_SHA,
    api_artifact_sha256: apiSha,
    status: 200,
    signed_session_observed: true,
    session_principal_source: "api_signed_session",
    fixture_values: fixtureValues,
  };
  writeJson(root, apiResponsePath, apiResponse);
  const apiResponseSha = sha256(readFileSync(path.join(root, apiResponsePath)));
  const fixtureValuesSha = canonicalDigest(fixtureValues);
  const api = receiptRef(root, "receipts/api-signed-session.json", {
    schema_version: "law-firm-os.client-operations.api-signed-session-receipt.v1",
    status: "PASS",
    source_sha: ACTIVE_SOURCE_SHA,
    signed_session_observed: true,
    session_principal_source: "api_signed_session",
    api_artifact_sha256: apiSha,
    api_embedded_manifest_sha256: apiArtifact.embedded_manifest_sha256,
    api_response_path: apiResponsePath,
    api_response_sha256: apiResponseSha,
    fixture_values_sha256: fixtureValuesSha,
  }, apiSha, {
    artifact_manifest_sha256: apiArtifact.embedded_manifest_sha256,
    artifact_kind: "api_package",
    api_response_sha256: apiResponseSha,
    fixture_values_sha256: fixtureValuesSha,
  });
  const packageProvenance = artifactManifest(root, "artifacts/client-operations-package.zip", "package_artifact", Buffer.from("client-operations-package"));
  const packageSha = packageProvenance.artifact_sha256;
  const packageArtifact = {
    ...packageProvenance,
    source_sha: ACTIVE_SOURCE_SHA,
    web_artifact_sha256: web.artifact_sha256,
    addin_artifact_sha256: addin.artifact_sha256,
    migration_sha256: migrationSha,
    api_artifact_sha256: apiSha,
  };

  const manifest = {
    schema_version: "law-firm-os.client-operations-package-evidence.v1",
    verification: {
      mode,
      scenario_id: "VC-CL-PKG-001",
      run_id: ACTIVE_RUN_ID,
      claims: {
        exact_main: mode === "release",
        logged_in_screen: mode === "release",
        deployed: mode === "release",
      },
    },
    source: {
      sha: ACTIVE_SOURCE_SHA,
      branch: "main",
      main_sha: ACTIVE_SOURCE_SHA,
      worktree_dirty: false,
    },
    web_build: web,
    addin_build: addin,
  };

  if (mode === "release") {
    manifest.migration_receipt = { ...migration, migration_sha256: migrationSha };
    manifest.api_signed_session_receipt = {
      ...api,
      api_artifact_sha256: apiSha,
      api_artifact_path: apiArtifact.artifact_path,
      api_embedded_manifest_path: apiArtifact.embedded_manifest_path,
      api_embedded_manifest_sha256: apiArtifact.embedded_manifest_sha256,
      api_response_path: apiResponsePath,
      api_response_sha256: apiResponseSha,
      fixture_values_sha256: fixtureValuesSha,
    };
    const packageReceipt = receiptRef(root, "receipts/package-artifact.json", {
      schema_version: "law-firm-os.client-operations.package-build-receipt.v1",
      status: "PASS",
    source_sha: ACTIVE_SOURCE_SHA,
      artifact_sha256: packageSha,
      embedded_manifest_sha256: packageArtifact.embedded_manifest_sha256,
      web_artifact_sha256: web.artifact_sha256,
      addin_artifact_sha256: addin.artifact_sha256,
      migration_sha256: migrationSha,
      api_artifact_sha256: apiSha,
    }, packageSha, {
      artifact_manifest_sha256: packageArtifact.embedded_manifest_sha256,
      artifact_kind: "package_artifact",
    });
    manifest.package_artifact = { ...packageArtifact, ...packageReceipt };

    const screenPath = runPath("screens/client-operations.png");
    const screenBytes = gradientPng();
    writeBytes(root, screenPath, screenBytes);
    const screenSha = sha256(screenBytes);
    const metadataPath = runPath("screens/client-operations.runtime.json");
    const metadata = {
      schema_version: "law-firm-os.client-operations.screen-runtime-metadata.v1",
      run_id: ACTIVE_RUN_ID,
      screenshot_sha256: screenSha,
      source_sha: ACTIVE_SOURCE_SHA,
      package_artifact_sha256: packageSha,
      api_artifact_sha256: apiSha,
      api_response_sha256: apiResponseSha,
      fixture_values_sha256: fixtureValuesSha,
      displayed_fixture_values: fixtureValues,
      non_placeholder: true,
      content_marker_count: 2,
      app: { name: "Law Firm OS", version: "0.1.17", build_sha: ACTIVE_SOURCE_SHA },
      runtime: {
        name: "Law Firm OS Web",
        version: "0.1.17",
        authenticated: true,
        session_principal_source: "api_signed_session",
        route: "/client/dashboard",
      },
      screenshot: {
        format: "png",
        width: 320,
        height: 180,
        markers: ["client_operations", "signed_in"],
        captured_at: "2026-07-31T00:00:00.000Z",
      },
    };
    writeJson(root, metadataPath, metadata);
    const runtimeMetadataSha = sha256(readFileSync(path.join(root, metadataPath)));
    const capturePath = runPath("responses/browser-capture.json");
    const capture = {
      schema_version: "law-firm-os.client-operations.runtime-capture-receipt.v1",
      public_key_id: ACTIVE_TEST_KEY_ID,
      issuer: "browser-runner",
      signature_algorithm: "ed25519",
      run_id: ACTIVE_RUN_ID,
      source_sha: ACTIVE_SOURCE_SHA,
      package_artifact_sha256: packageSha,
      api_artifact_sha256: apiSha,
      api_response_sha256: apiResponseSha,
      fixture_values_sha256: fixtureValuesSha,
      screenshot_sha256: screenSha,
      runtime_metadata_sha256: runtimeMetadataSha,
      authenticated: true,
      session_principal_source: "api_signed_session",
      route: "/client/dashboard",
      browser: "playwright",
      browser_run_id: ACTIVE_RUN_ID,
      captured_at: "2026-07-31T00:00:00.000Z",
      displayed_fixture_values: fixtureValues,
    };
    writeJson(root, capturePath, { ...capture, signature: signPayload(capture) });
    const captureSha = sha256(readFileSync(path.join(root, capturePath)));
    const screen = receiptRef(root, "receipts/logged-in-screen.json", {
      schema_version: "law-firm-os.client-operations.logged-in-screen-receipt.v1",
      status: "PASS",
      source_sha: ACTIVE_SOURCE_SHA,
      package_artifact_sha256: packageSha,
      api_artifact_sha256: apiSha,
      logged_in: true,
      signed_session_observed: true,
      screen_sha256: screenSha,
      runtime_metadata_sha256: runtimeMetadataSha,
      api_response_sha256: apiResponseSha,
      fixture_values_sha256: fixtureValuesSha,
      capture_receipt_sha256: captureSha,
      capture_receipt_path: capturePath,
    }, packageSha, {
      screen_sha256: screenSha,
      runtime_metadata_sha256: runtimeMetadataSha,
      api_response_sha256: apiResponseSha,
      fixture_values_sha256: fixtureValuesSha,
      capture_receipt_sha256: captureSha,
    });
    manifest.logged_in_screen_receipt = {
      ...screen,
      screen_path: screenPath,
      screen_sha256: screenSha,
      package_artifact_sha256: packageSha,
      runtime_metadata_path: metadataPath,
      runtime_metadata_sha256: runtimeMetadataSha,
      capture_receipt_path: capturePath,
      capture_receipt_sha256: captureSha,
    };
    const request = {
      method: "GET",
      url: "https://matter-ops.amic.kr/client-operations",
      body_sha256: sha256(Buffer.from("request-body")),
    };
    request.request_sha256 = canonicalDigest(request);
    const response = {
      status: 200,
      url: request.url,
      body_sha256: sha256(Buffer.from("deployed-response")),
      package_artifact_sha256: packageSha,
      source_sha: ACTIVE_SOURCE_SHA,
    };
    response.response_sha256 = canonicalDigest(response);
    const deploy = receiptRef(root, "receipts/deploy.json", {
      schema_version: "law-firm-os.client-operations.deploy-receipt.v1",
      status: "PASS",
      source_sha: ACTIVE_SOURCE_SHA,
      package_artifact_sha256: packageSha,
      deployed: true,
      environment: "staging",
      authoritative_url: request.url,
      request,
      response,
      external_gate: {
        status: "PASS",
        authoritative: true,
        gate_id: "matter-release-gate-20260731-001",
        provider: "matter-release-gate",
      },
    }, packageSha);
    manifest.deploy_receipt = deploy;
  }

  return {
    root,
    manifest,
    sourceSha,
    mainSha: sourceSha,
    gitIdentity: readClientOperationsGitIdentity(root),
    testPublicKey: keyPair.publicKey,
    testKeyId: ACTIVE_TEST_KEY_ID,
  };
}

function writeExternalTrustAnchor(fixture) {
  const trustRoot = mkdtempSync(path.join(tmpdir(), "client-operations-trust-"));
  const trustPath = path.join(trustRoot, "trust-anchor.json");
  const publicKeyDer = fixture.testPublicKey.export({ format: "der", type: "spki" });
  writeFileSync(trustPath, `${JSON.stringify({
    schema_version: "law-firm-os.client-operations.trust-anchor.v1",
    key_id: fixture.testKeyId,
    public_key_der_base64: publicKeyDer.toString("base64"),
  })}\n`);
  return { trustRoot, trustPath };
}

function verify(fixture, mode = fixture.manifest.verification.mode) {
  const trust = writeExternalTrustAnchor(fixture);
  const previous = process.env[CLIENT_OPERATIONS_TRUST_ANCHOR_ENV];
  process.env[CLIENT_OPERATIONS_TRUST_ANCHOR_ENV] = trust.trustPath;
  try {
    return validateClientOperationsPackage({
      root: fixture.root,
      manifest: fixture.manifest,
      mode,
    });
  } finally {
    if (previous === undefined) delete process.env[CLIENT_OPERATIONS_TRUST_ANCHOR_ENV];
    else process.env[CLIENT_OPERATIONS_TRUST_ANCHOR_ENV] = previous;
    rmSync(trust.trustRoot, { recursive: true, force: true });
  }
}

test("VC-CL-PKG-001 local mode proves only local web/add-in builds and tests", () => {
  const fixture = makeFixture({ mode: "local" });
  try {
    const result = verify(fixture);
    assert.equal(result.verdict, "BLOCKED_EXTERNAL", result.errors.join("\n"));
    assert.deepEqual(result.claims, {
      local_builds: true,
      exact_main: false,
      logged_in_screen: false,
      deployed: false,
    });
    assert.equal(result.components.migration_receipt, null);
    assert.equal(result.components.api_signed_session_receipt, null);
    assert.equal(result.components.package_artifact, null);
    assert.equal(result.source_api_package_screen_sha_bound, false);
    assert.ok(result.blocked_reasons.length > 0);
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("VC-CL-PKG-001 local mode rejects an exact-main, logged-in, or deployed claim", () => {
  const fixture = makeFixture({ mode: "local" });
  try {
    fixture.manifest.verification.claims.exact_main = true;
    fixture.manifest.verification.claims.logged_in_screen = true;
    fixture.manifest.verification.claims.deployed = true;
    fixture.manifest.verification.claims.source_api_package_screen_sha_bound = true;
    const result = verify(fixture);
    assert.equal(result.verdict, "FAIL");
    assert.ok(result.errors.some((error) => error.includes("local mode cannot claim exact_main proof")));
    assert.ok(result.errors.some((error) => error.includes("local mode cannot claim logged_in_screen proof")));
    assert.ok(result.errors.some((error) => error.includes("local mode cannot claim deployed proof")));
    assert.ok(result.errors.some((error) => error.includes("local mode cannot claim source_api_package_screen_sha_bound proof")));
    assert.equal(result.claims.exact_main, false);
    assert.equal(result.claims.logged_in_screen, false);
    assert.equal(result.claims.deployed, false);
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("VC-CL-PKG-001 release mode binds source/main, builds, migration, signed session, package, screen, and deploy receipts", () => {
  const fixture = makeFixture();
  try {
    const result = verify(fixture);
    assert.equal(result.verdict, "PASS", result.errors.join("\n"));
    assert.deepEqual(result.claims, {
      local_builds: true,
      exact_main: true,
      logged_in_screen: true,
      deployed: true,
    });
    assert.equal(result.source.sha, fixture.sourceSha);
    assert.equal(result.source.main_sha, fixture.mainSha);
    assert.equal(result.source_api_package_screen_sha_bound, true);
    assert.equal(result.components.package_artifact.artifact_sha256, sha256Path(path.join(fixture.root, fixture.manifest.package_artifact.artifact_path)));
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("VC-CL-PKG-001 release mode permits a detached checkout when its SHA is exactly main", () => {
  const fixture = makeFixture();
  try {
    execFileSync("git", ["checkout", "--detach", fixture.sourceSha], { cwd: fixture.root, stdio: "ignore" });
    fixture.manifest.source.branch = "DETACHED";
    const result = verify(fixture);
    assert.equal(result.verdict, "PASS", result.errors.join("\n"));
    assert.equal(result.claims.exact_main, true);
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("VC-CL-PKG-001 tampered build bytes fail closed with an artifact SHA mismatch", () => {
  const fixture = makeFixture();
  try {
    writeBytes(fixture.root, fixture.manifest.web_build.artifact_path, Buffer.from("tampered"));
    const result = verify(fixture);
    assert.equal(result.verdict, "FAIL");
    assert.ok(result.errors.some((error) => error.includes("web_build artifact SHA mismatch/tampered")));
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("VC-CL-PKG-001 tampered receipt bytes fail closed even when the receipt payload still parses", () => {
  const fixture = makeFixture();
  try {
    const receiptPath = path.join(fixture.root, fixture.manifest.api_signed_session_receipt.receipt_path);
    const receipt = JSON.parse(readFileSync(receiptPath, "utf8"));
    receipt.status = "PASS";
    receipt.audit_note = "tampered";
    writeFileSync(receiptPath, `${JSON.stringify(receipt)}\n`);
    const result = verify(fixture);
    assert.equal(result.verdict, "FAIL");
    assert.ok(result.errors.some((error) => error.includes("api_signed_session_receipt receipt SHA mismatch/tampered")));
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("VC-CL-PKG-001 missing migration receipt fails closed in release mode", () => {
  const fixture = makeFixture();
  try {
    unlinkSync(path.join(fixture.root, fixture.manifest.migration_receipt.receipt_path));
    const result = verify(fixture);
    assert.equal(result.verdict, "FAIL");
    assert.ok(result.errors.some((error) => error.includes("missing migration_receipt receipt")));
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("VC-CL-PKG-001 stale receipt source SHA fails closed even when its file digest is fresh", () => {
  const fixture = makeFixture();
  try {
    const receiptPath = path.join(fixture.root, fixture.manifest.api_signed_session_receipt.receipt_path);
    const receipt = JSON.parse(readFileSync(receiptPath, "utf8"));
    receipt.source_sha = "d".repeat(40);
    writeFileSync(receiptPath, `${JSON.stringify(receipt)}\n`);
    fixture.manifest.api_signed_session_receipt.receipt_sha256 = sha256(readFileSync(receiptPath));
    const result = verify(fixture);
    assert.equal(result.verdict, "FAIL");
    assert.ok(result.errors.some((error) => error.includes("api_signed_session_receipt receipt source SHA is stale/mismatched")));
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("VC-CL-PKG-001 mismatched component SHA fails closed at the package binding", () => {
  const fixture = makeFixture();
  try {
    fixture.manifest.package_artifact.web_artifact_sha256 = "e".repeat(64);
    const result = verify(fixture);
    assert.equal(result.verdict, "FAIL");
    assert.ok(result.errors.some((error) => error.includes("package_artifact web_artifact_sha256 binding mismatch")));
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("VC-CL-PKG-001 stale source SHA and branch/main identity fail closed", () => {
  const fixture = makeFixture();
  try {
    fixture.manifest.source.sha = "f".repeat(40);
    fixture.manifest.source.main_sha = "f".repeat(40);
    const result = verify(fixture);
    assert.equal(result.verdict, "FAIL");
    assert.ok(result.errors.some((error) => error.includes("source SHA is stale/mismatched with current HEAD")));
    assert.ok(result.errors.some((error) => error.includes("source main SHA is stale/mismatched")));
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("VC-CL-PKG-001 release mode requires the logged-in screen and deploy receipts", () => {
  const fixture = makeFixture();
  try {
    delete fixture.manifest.logged_in_screen_receipt;
    delete fixture.manifest.deploy_receipt;
    const result = verify(fixture);
    assert.equal(result.verdict, "FAIL");
    assert.ok(result.errors.some((error) => error.includes("missing logged_in_screen_receipt manifest entry")));
    assert.ok(result.errors.some((error) => error.includes("missing deploy_receipt manifest entry")));
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("VC-CL-PKG-001 receipts containing a session token fail closed without echoing the secret", () => {
  const fixture = makeFixture();
  try {
    const receiptPath = path.join(fixture.root, fixture.manifest.api_signed_session_receipt.receipt_path);
    const receipt = JSON.parse(readFileSync(receiptPath, "utf8"));
    receipt.session_token = "synthetic-secret-must-not-leak";
    writeFileSync(receiptPath, `${JSON.stringify(receipt)}\n`);
    fixture.manifest.api_signed_session_receipt.receipt_sha256 = sha256(readFileSync(receiptPath));
    const result = verify(fixture);
    assert.equal(result.verdict, "FAIL");
    assert.ok(result.errors.some((error) => error.includes("forbidden secret or PII key path") && error.includes("sessiontoken")));
    assert.equal(JSON.stringify(result).includes("synthetic-secret-must-not-leak"), false);
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("VC-CL-PKG-001 normalized recursive secret/PII key paths fail closed", () => {
  const fixture = makeFixture();
  try {
    const receiptPath = path.join(fixture.root, fixture.manifest.api_signed_session_receipt.receipt_path);
    const receipt = JSON.parse(readFileSync(receiptPath, "utf8"));
    receipt.runtime = { metadata: { "Auth-Token": "must-not-be-recorded" } };
    writeFileSync(receiptPath, `${JSON.stringify(receipt)}\n`);
    fixture.manifest.api_signed_session_receipt.receipt_sha256 = sha256(readFileSync(receiptPath));
    const result = verify(fixture);
    assert.equal(result.verdict, "FAIL");
    assert.ok(result.errors.some((error) => error.includes("metadata.authtoken")));
    assert.equal(JSON.stringify(result).includes("must-not-be-recorded"), false);
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("VC-CL-PKG-001 artifact paths cannot escape the repository", () => {
  const fixture = makeFixture({ mode: "local" });
  try {
    fixture.manifest.web_build.artifact_path = "../outside.bin";
    const result = verify(fixture);
    assert.equal(result.verdict, "FAIL");
    assert.ok(result.errors.some((error) => error.includes("must stay inside the repository")));
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("VC-CL-PKG-001 forged receipt attestation cannot assert an independent signed receipt", () => {
  const fixture = makeFixture();
  try {
    const attestationPath = path.join(fixture.root, fixture.manifest.api_signed_session_receipt.attestation_path);
    const attestation = JSON.parse(readFileSync(attestationPath, "utf8"));
    attestation.independently_generated = false;
    writeFileSync(attestationPath, `${JSON.stringify(attestation)}\n`);
    fixture.manifest.api_signed_session_receipt.attestation_sha256 = sha256(readFileSync(attestationPath));
    const result = verify(fixture);
    assert.equal(result.verdict, "FAIL");
    assert.ok(result.errors.some((error) => error.includes("trusted-ci-build")));
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("VC-CL-PKG-001 self-authored Ed25519-shaped signature fails trusted-key verification", () => {
  const fixture = makeFixture();
  try {
    const attestationPath = path.join(fixture.root, fixture.manifest.api_signed_session_receipt.attestation_path);
    const attestation = JSON.parse(readFileSync(attestationPath, "utf8"));
    attestation.signature = "A".repeat(128);
    writeFileSync(attestationPath, `${JSON.stringify(attestation)}\n`);
    fixture.manifest.api_signed_session_receipt.attestation_sha256 = sha256(readFileSync(attestationPath));
    const result = verify(fixture);
    assert.equal(result.verdict, "FAIL");
    assert.ok(result.errors.some((error) => error.includes("trusted independent signer")));
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("VC-CL-PKG-001 production release rejects a valid packet signed by the test/repository key", () => {
  const fixture = makeFixture();
  const configuredTrustAnchor = process.env[CLIENT_OPERATIONS_TRUST_ANCHOR_ENV];
  try {
    delete process.env[CLIENT_OPERATIONS_TRUST_ANCHOR_ENV];
    const result = validateClientOperationsPackage({
      root: fixture.root,
      manifest: fixture.manifest,
      mode: "release",
    });
    assert.equal(result.verdict, "BLOCKED_EXTERNAL", result.errors.join("\n"));
    assert.deepEqual(result.errors, []);
    assert.ok(result.blocked_reasons.some((reason) => reason.includes(CLIENT_OPERATIONS_TRUST_ANCHOR_ENV)));
    assert.equal(result.claims.exact_main, false);
  } finally {
    if (configuredTrustAnchor === undefined) delete process.env[CLIENT_OPERATIONS_TRUST_ANCHOR_ENV];
    else process.env[CLIENT_OPERATIONS_TRUST_ANCHOR_ENV] = configuredTrustAnchor;
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("VC-CL-PKG-001 production validation rejects a symbol-bearing injected verifier in release mode", () => {
  const fixture = makeFixture();
  const trust = writeExternalTrustAnchor(fixture);
  const previous = process.env[CLIENT_OPERATIONS_TRUST_ANCHOR_ENV];
  try {
    process.env[CLIENT_OPERATIONS_TRUST_ANCHOR_ENV] = trust.trustPath;
    const injectedVerifier = {
      [Symbol("test-verifier")]: true,
      verify: () => true,
    };
    const result = validateClientOperationsPackage({
      root: fixture.root,
      manifest: fixture.manifest,
      mode: "release",
      testVerifier: injectedVerifier,
    });
    assert.equal(result.verdict, "FAIL");
    assert.ok(result.errors.some((error) => error.includes("does not accept injected testVerifier")));
    assert.equal(result.claims.exact_main, false);
  } finally {
    if (previous === undefined) delete process.env[CLIENT_OPERATIONS_TRUST_ANCHOR_ENV];
    else process.env[CLIENT_OPERATIONS_TRUST_ANCHOR_ENV] = previous;
    rmSync(fixture.root, { recursive: true, force: true });
    rmSync(trust.trustRoot, { recursive: true, force: true });
  }
});

test("VC-CL-PKG-001 release cannot report PASS while the real worktree is dirty", () => {
  const fixture = makeFixture();
  try {
    writeFileSync(path.join(fixture.root, "untracked-dirty-proof.txt"), "dirty\n");
    const result = verify(fixture);
    assert.equal(result.verdict, "FAIL");
    assert.ok(result.errors.some((error) => error.includes("source worktree_dirty does not match current Git worktree")));
    assert.equal(result.claims.exact_main, false);
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("VC-CL-PKG-001 manifest fields cannot override the release trust root", () => {
  const fixture = makeFixture();
  try {
    fixture.manifest.trust_anchor = {
      schema_version: "law-firm-os.client-operations.trust-anchor.v1",
      key_id: fixture.testKeyId,
    };
    const result = verify(fixture);
    assert.equal(result.verdict, "FAIL");
    assert.ok(result.errors.some((error) => error.includes("client-operations manifest contains unknown field trustanchor")));
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("VC-CL-PKG-001 fake PNG bytes cannot assert a logged-in screen", () => {
  const fixture = makeFixture();
  try {
    const fakePng = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
    writeBytes(fixture.root, fixture.manifest.logged_in_screen_receipt.screen_path, fakePng);
    fixture.manifest.logged_in_screen_receipt.screen_sha256 = sha256(fakePng);
    const result = verify(fixture);
    assert.equal(result.verdict, "FAIL");
    assert.ok(result.errors.some((error) => error.includes("real PNG signature") || error.includes("non-placeholder PNG")));
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("VC-CL-PKG-001 arbitrary package bytes cannot pass without embedded commit/manifest provenance", () => {
  const fixture = makeFixture();
  try {
    const packagePath = fixture.manifest.package_artifact.artifact_path;
    const arbitrary = Buffer.from("arbitrary package bytes");
    writeBytes(fixture.root, packagePath, arbitrary);
    fixture.manifest.package_artifact.artifact_sha256 = sha256(arbitrary);
    const result = verify(fixture);
    assert.equal(result.verdict, "FAIL");
    assert.ok(result.errors.some((error) => error.includes("embedded artifact") || error.includes("embedded commit/manifest provenance marker")));
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("VC-CL-PKG-001 release cannot trust an injected non-Git source identity", () => {
  const fixture = makeFixture();
  try {
    fixture.manifest.source.sha = "a".repeat(40);
    fixture.manifest.source.main_sha = "a".repeat(40);
    const result = validateClientOperationsPackage({
      root: fixture.root,
      manifest: fixture.manifest,
      mode: "release",
      gitIdentity: {
        head_sha: "a".repeat(40),
        branch: "main",
        worktree_dirty: false,
        main_sha: "a".repeat(40),
        object_shas: ["a".repeat(40)],
      },
    });
    assert.equal(result.verdict, "FAIL");
    assert.ok(result.errors.some((error) => error.includes("source SHA is stale/mismatched")));
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("VC-CL-PKG-001 CLI release passes with ignored, run-scoped evidence in a clean Git repo", () => {
  const fixture = makeFixture();
  const trust = writeExternalTrustAnchor(fixture);
  try {
    const manifestPath = runPath("manifest.json");
    writeJson(fixture.root, manifestPath, fixture.manifest);
    const verifierPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../verify-client-operations-package.mjs");
    const output = execFileSync(process.execPath, [verifierPath, "--manifest", manifestPath, "--mode", "release"], {
      cwd: fixture.root,
      encoding: "utf8",
      env: { ...process.env, [CLIENT_OPERATIONS_TRUST_ANCHOR_ENV]: trust.trustPath },
    });
    const result = JSON.parse(output);
    assert.equal(result.verdict, "PASS", result.errors?.join("\n"));
    assert.equal(result.claims.exact_main, true);
    assert.equal(readClientOperationsGitIdentity(fixture.root).worktree_dirty, false);
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
    rmSync(trust.trustRoot, { recursive: true, force: true });
  }
});

test("VC-CL-PKG-001 production CLI rejects a repository test key without an external trust anchor", () => {
  const fixture = makeFixture();
  try {
    const manifestPath = runPath("manifest.json");
    writeJson(fixture.root, manifestPath, fixture.manifest);
    const verifierPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../verify-client-operations-package.mjs");
    const env = { ...process.env };
    delete env[CLIENT_OPERATIONS_TRUST_ANCHOR_ENV];
    let thrown;
    try {
      execFileSync(process.execPath, [verifierPath, "--manifest", manifestPath, "--mode", "release"], {
        cwd: fixture.root,
        encoding: "utf8",
        env,
      });
    } catch (error) {
      thrown = error;
    }
    assert.ok(thrown, "CLI must not pass without an external trust anchor");
    const result = JSON.parse(thrown.stdout);
    assert.equal(result.verdict, "BLOCKED_EXTERNAL", result.errors?.join("\n"));
    assert.equal(result.claims.exact_main, false);
    assert.ok(result.blocked_reasons.some((reason) => reason.includes(CLIENT_OPERATIONS_TRUST_ANCHOR_ENV)));
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("VC-CL-PKG-001 production CLI rejects a trust anchor stored inside the repository", () => {
  const fixture = makeFixture();
  try {
    const manifestPath = runPath("manifest.json");
    writeJson(fixture.root, manifestPath, fixture.manifest);
    const publicKeyDer = fixture.testPublicKey.export({ format: "der", type: "spki" });
    const trustPath = writeJson(fixture.root, "trust-anchor.json", {
      schema_version: "law-firm-os.client-operations.trust-anchor.v1",
      key_id: fixture.testKeyId,
      public_key_der_base64: publicKeyDer.toString("base64"),
    });
    const verifierPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../verify-client-operations-package.mjs");
    const env = { ...process.env, [CLIENT_OPERATIONS_TRUST_ANCHOR_ENV]: trustPath };
    let thrown;
    try {
      execFileSync(process.execPath, [verifierPath, "--manifest", manifestPath, "--mode", "release"], {
        cwd: fixture.root,
        encoding: "utf8",
        env,
      });
    } catch (error) {
      thrown = error;
    }
    assert.ok(thrown, "CLI must reject a repository-local trust anchor");
    const result = JSON.parse(thrown.stdout);
    assert.equal(result.verdict, "FAIL");
    assert.ok(result.errors.some((error) => error.includes("outside the repository")));
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("VC-CL-PKG-001 production CLI rejects an external anchor reached through an ignored runs symlink", () => {
  const fixture = makeFixture();
  const trust = writeExternalTrustAnchor(fixture);
  try {
    const manifestPath = runPath("manifest.json");
    writeJson(fixture.root, manifestPath, fixture.manifest);
    const symlinkPath = path.join(fixture.root, runPath("trust-anchor.json"));
    mkdirSync(path.dirname(symlinkPath), { recursive: true });
    symlinkSync(trust.trustPath, symlinkPath);
    const verifierPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../verify-client-operations-package.mjs");
    const env = { ...process.env, [CLIENT_OPERATIONS_TRUST_ANCHOR_ENV]: symlinkPath };
    let thrown;
    try {
      execFileSync(process.execPath, [verifierPath, "--manifest", manifestPath, "--mode", "release"], {
        cwd: fixture.root,
        encoding: "utf8",
        env,
      });
    } catch (error) {
      thrown = error;
    }
    assert.ok(thrown, "CLI must reject a trust anchor reached through a repository symlink");
    const result = JSON.parse(thrown.stdout);
    assert.equal(result.verdict, "FAIL");
    assert.ok(result.errors.some((error) => error.includes("symbolic link")));
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
    rmSync(trust.trustRoot, { recursive: true, force: true });
  }
});

test("VC-CL-PKG-001 production CLI rejects an external symlink path even when its target is external", () => {
  const fixture = makeFixture();
  const trust = writeExternalTrustAnchor(fixture);
  const symlinkRoot = mkdtempSync(path.join(tmpdir(), "client-operations-anchor-link-"));
  try {
    const symlinkPath = path.join(symlinkRoot, "anchor.json");
    symlinkSync(trust.trustPath, symlinkPath);
    const manifestPath = runPath("manifest.json");
    writeJson(fixture.root, manifestPath, fixture.manifest);
    const verifierPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../verify-client-operations-package.mjs");
    const env = { ...process.env, [CLIENT_OPERATIONS_TRUST_ANCHOR_ENV]: symlinkPath };
    let thrown;
    try {
      execFileSync(process.execPath, [verifierPath, "--manifest", manifestPath, "--mode", "release"], {
        cwd: fixture.root,
        encoding: "utf8",
        env,
      });
    } catch (error) {
      thrown = error;
    }
    assert.ok(thrown, "CLI must reject a symlink trust-anchor path even outside the repository");
    const result = JSON.parse(thrown.stdout);
    assert.equal(result.verdict, "FAIL");
    assert.ok(result.errors.some((error) => error.includes("symbolic link")));
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
    rmSync(trust.trustRoot, { recursive: true, force: true });
    rmSync(symlinkRoot, { recursive: true, force: true });
  }
});

test("VC-CL-PKG-001 production CLI fails when the external anchor does not match the packet signer", () => {
  const fixture = makeFixture();
  const trust = mkdtempSync(path.join(tmpdir(), "client-operations-wrong-trust-"));
  try {
    const wrongPair = generateKeyPairSync("ed25519");
    const trustPath = path.join(trust, "trust-anchor.json");
    writeFileSync(trustPath, `${JSON.stringify({
      schema_version: "law-firm-os.client-operations.trust-anchor.v1",
      key_id: "external-unrelated-key",
      public_key_der_base64: wrongPair.publicKey.export({ format: "der", type: "spki" }).toString("base64"),
    })}\n`);
    const manifestPath = runPath("manifest.json");
    writeJson(fixture.root, manifestPath, fixture.manifest);
    const verifierPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../verify-client-operations-package.mjs");
    const env = { ...process.env, [CLIENT_OPERATIONS_TRUST_ANCHOR_ENV]: trustPath };
    let thrown;
    try {
      execFileSync(process.execPath, [verifierPath, "--manifest", manifestPath, "--mode", "release"], {
        cwd: fixture.root,
        encoding: "utf8",
        env,
      });
    } catch (error) {
      thrown = error;
    }
    assert.ok(thrown, "CLI must reject a packet signed by a different key");
    const result = JSON.parse(thrown.stdout);
    assert.equal(result.verdict, "FAIL");
    assert.ok(result.errors.some((error) => error.includes("trusted independent signer")));
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
    rmSync(trust, { recursive: true, force: true });
  }
});

test("VC-CL-PKG-001 valid but unrelated screenshot and rewritten metadata fail signed capture binding", () => {
  const fixture = makeFixture();
  try {
    const screenPath = path.join(fixture.root, fixture.manifest.logged_in_screen_receipt.screen_path);
    const replacement = gradientPng(320, 180, 1);
    writeFileSync(screenPath, replacement);
    fixture.manifest.logged_in_screen_receipt.screen_sha256 = sha256(replacement);
    const metadataPath = path.join(fixture.root, fixture.manifest.logged_in_screen_receipt.runtime_metadata_path);
    const metadata = JSON.parse(readFileSync(metadataPath, "utf8"));
    metadata.runtime.route = "/other-route";
    writeFileSync(metadataPath, `${JSON.stringify(metadata)}\n`);
    fixture.manifest.logged_in_screen_receipt.runtime_metadata_sha256 = sha256(readFileSync(metadataPath));
    const result = verify(fixture);
    assert.equal(result.verdict, "FAIL");
    assert.ok(result.errors.some((error) => error.includes("runtime capture receipt screenshot SHA mismatch")
      || error.includes("attestation screenshot_sha256 binding mismatch")
      || error.includes("runtime metadata SHA mismatch")));
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("VC-CL-PKG-001 nested financial PII and malformed JSON never echo source text", () => {
  const fixture = makeFixture();
  try {
    const receiptPath = path.join(fixture.root, fixture.manifest.api_signed_session_receipt.receipt_path);
    const receipt = JSON.parse(readFileSync(receiptPath, "utf8"));
    receipt.audit = { details: { "BаnkAccountNumber": "4111-LEAK" } };
    writeFileSync(receiptPath, `${JSON.stringify(receipt)}\n`);
    fixture.manifest.api_signed_session_receipt.receipt_sha256 = sha256(readFileSync(receiptPath));
    const piiResult = verify(fixture);
    assert.equal(piiResult.verdict, "FAIL");
    assert.equal(JSON.stringify(piiResult).includes("4111-LEAK"), false);

    writeFileSync(receiptPath, '{"schema_version":"DO_NOT_LEAK_123"');
    fixture.manifest.api_signed_session_receipt.receipt_sha256 = sha256(readFileSync(receiptPath));
    const malformedResult = verify(fixture);
    assert.equal(malformedResult.verdict, "FAIL");
    assert.equal(JSON.stringify(malformedResult).includes("DO_NOT_LEAK_123"), false);
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
});
