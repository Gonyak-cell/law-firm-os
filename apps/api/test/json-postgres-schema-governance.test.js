import assert from "node:assert/strict";
import { createHash, generateKeyPairSync, sign } from "node:crypto";
import { copyFileSync, linkSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import {
  externalReleaseAuthorityBindingSha256,
  PRODUCTION_TRUST_ROOT_POLICY,
  SCHEMA_GOVERNANCE_INSTALLATION_SCHEMA_VERSION,
  SCHEMA_GOVERNANCE_TRUST_ANCHOR,
  TRUST_REGISTRY_SCHEMA_VERSION,
  verifyProductionTrustedRegistry,
  verifySchemaGovernanceTrustedRegistry,
} from "../../../packages/runtime-auth/src/external-release-trust.js";
import {
  createJsonPostgresOutlookAuthorityApprovalReceiptInput,
  verifyJsonPostgresOutlookAuthorityApproval,
} from "../src/json-postgres-outlook-authority-approval.js";
import { JSON_POSTGRES_SCHEMA_GOVERNANCE_READBACK_ACTION, readJsonPostgresSchemaGovernance } from "../src/json-postgres-program-inputs.js";
import { authorization, operationEvent } from "./json-postgres-outlook-authority-fixtures.js";

const now = Date.parse("2026-08-17T00:06:00.000Z");
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");

function fixture(t) {
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = "test";
  const directory = realpathSync(mkdtempSync(path.join(tmpdir(), "lawos-schema-governance-")));
  t.after(() => {
    if (previous === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previous;
    rmSync(directory, { recursive: true, force: true });
  });
  const root = path.join(directory, "installed");
  mkdirSync(root);
  const rootKeys = generateKeyPairSync("ed25519");
  const leafKeys = generateKeyPairSync("ed25519");
  const packet = authorization().packet;
  const event = operationEvent({ packet_sha256: packet.packet_sha256 });
  const scope = {
    pilot_id: "amic-os-outlook", lawos_tenant_id: "lawos-production",
    entra_tenant_id: "2f10d109-c2ad-43a4-a813-4dea28119e52",
    source_sha: packet.source_sha, source_tree: packet.source_tree,
    version: packet.schema_version,
  };
  const leaf = {
    key_id: "synthetic-schema-leaf", algorithm: "Ed25519",
    public_key_spki_pem: leafKeys.publicKey.export({ type: "spki", format: "pem" }),
    valid_from: "2026-08-16T00:00:00.000Z", valid_until: "2026-08-18T00:00:00.000Z", revoked_at: null,
    allowed_receipt_sources: ["law-firm-os"],
    allowed_receipt_types: ["lawos-json-postgres-production-cutover-owner-approval"],
    allowed_pilot_ids: [scope.pilot_id], allowed_lawos_tenant_ids: [scope.lawos_tenant_id],
    allowed_entra_tenant_ids: [scope.entra_tenant_id], allowed_source_shas: [scope.source_sha],
    allowed_source_trees: [scope.source_tree], allowed_versions: [scope.version],
    allowed_roles: ["owner"], allowed_operations: ["lawos-json-postgres-production-cutover"],
    allowed_artifact_sha256s: [event.artifact_sha256],
    allowed_binding_sha256s: [externalReleaseAuthorityBindingSha256(scope)],
  };
  const registry = {
    schema_version: TRUST_REGISTRY_SCHEMA_VERSION, registry_serial: SCHEMA_GOVERNANCE_TRUST_ANCHOR.registry_serial,
    generated_at: "2026-08-16T00:00:00.000Z", keys: [leaf],
  };
  const options = {
    now,
    testOnlyInstallation: {
      test_only: true, installation_root: root, registry_serial: registry.registry_serial,
      root_public_key_spki_sha256: hash(rootKeys.publicKey.export({ type: "spki", format: "der" })),
    },
  };
  const publicNames = ["root-public-key.spki.pem", "trust-registry.json", "trust-registry.json.sig"];
  const save = (name, bytes) => writeFileSync(path.join(root, name), bytes);
  function updateManifest() {
    const manifest = {
      schema_version: SCHEMA_GOVERNANCE_INSTALLATION_SCHEMA_VERSION,
      registry_serial: options.testOnlyInstallation.registry_serial,
      files: Object.fromEntries(publicNames.map((name) => {
        const bytes = readFileSync(path.join(root, name));
        return [name, { sha256: hash(bytes), size_bytes: bytes.length }];
      })),
    };
    save("installation.json", JSON.stringify(manifest));
    return manifest;
  }
  function seal() {
    const registryBytes = Buffer.from(JSON.stringify(registry));
    save("root-public-key.spki.pem", rootKeys.publicKey.export({ type: "spki", format: "pem" }));
    save("trust-registry.json", registryBytes);
    save("trust-registry.json.sig", sign(null, registryBytes, rootKeys.privateKey));
    updateManifest();
  }
  seal();
  const verify = () => verifySchemaGovernanceTrustedRegistry(options);
  function receipt(productionTrust = verify()) {
    const value = createJsonPostgresOutlookAuthorityApprovalReceiptInput({
      event, packet, productionTrust, approvalId: "synthetic-schema-approval", keyId: leaf.key_id,
      issuedAt: "2026-08-17T00:05:00.000Z", expiresAt: "2026-08-17T00:10:00.000Z",
    });
    const receiptBytes = Buffer.from(JSON.stringify(value));
    return { event, packet, productionTrust, receiptBytes,
      signatureBytes: sign(null, receiptBytes, leafKeys.privateKey), now };
  }
  const readbackEvent = {
    action: JSON_POSTGRES_SCHEMA_GOVERNANCE_READBACK_ACTION, attempt_ref: "synthetic-schema-readback",
    source_sha: event.source_sha, source_tree: event.source_tree, artifact_sha256: event.artifact_sha256,
  };
  const env = {
    LAWOS_AWS_ACCOUNT_ID: "770880870480", AWS_REGION: "ap-northeast-2",
    LAWOS_DEPLOYMENT_COMMIT: event.source_sha, LAWOS_DEPLOYMENT_TREE: event.source_tree,
    LAWOS_DEPLOYMENT_ARTIFACT_SHA256: event.artifact_sha256,
  };
  return { root, directory, rootKeys, leaf, registry, options, publicNames, save, updateManifest, seal, verify, receipt, readbackEvent, env };
}

test("installed schema root verifies a distinct, exact leaf and readback without input or secret access", (t) => {
  const f = fixture(t);
  const trust = f.verify();
  assert.equal(trust.registrySerial, 2026090603);
  assert.equal(trust.installationSha256, hash(readFileSync(path.join(f.root, "installation.json"))));
  assert.equal(verifyJsonPostgresOutlookAuthorityApproval(f.receipt(trust)).trust_root_verified, true);
  const result = readJsonPostgresSchemaGovernance({ event: f.readbackEvent, env: f.env, now, verifyRegistry: f.verify });
  assert.equal(result.outcome, "PASS");
  assert.equal(result.installation_sha256, trust.installationSha256);
  for (const field of ["database_read_count", "database_write_count", "secret_read_count", "program_input_read_count", "approval_claim_write_count"]) assert.equal(result[field], 0);
  assert.equal(PRODUCTION_TRUST_ROOT_POLICY.configured, false);
  assert.throws(() => verifyProductionTrustedRegistry(), { code: "TRUST_ROOT_NOT_CONFIGURED" });
});

test("schema trust is source-pinned and refuses production caller or environment overrides", (t) => {
  const f = fixture(t);
  assert.equal(SCHEMA_GOVERNANCE_TRUST_ANCHOR.installation_root, "/opt/lawos-schema-governance");
  assert.equal(Object.isFrozen(SCHEMA_GOVERNANCE_TRUST_ANCHOR), true);
  for (const options of [null, { rootDir: f.root }, { now }, { testOnlyPolicy: f.options }, { ...f.options, registryPath: f.root }]) {
    assert.throws(() => verifySchemaGovernanceTrustedRegistry(options), { code: "TRUST_ROOT_OVERRIDE_FORBIDDEN" });
  }
  const moduleUrl = new URL("../../../packages/runtime-auth/src/external-release-trust.js", import.meta.url).href;
  const child = spawnSync(process.execPath, ["--input-type=module", "--eval",
    `import {verifySchemaGovernanceTrustedRegistry as verify} from ${JSON.stringify(moduleUrl)}; try { verify(JSON.parse(process.argv[1])); } catch(e) { process.stdout.write(e.code); }`, JSON.stringify(f.options)], {
    encoding: "utf8", env: { ...process.env, NODE_ENV: "production", LAWOS_SCHEMA_GOVERNANCE_ROOT: f.root },
  });
  assert.equal(child.status, 0, child.stderr);
  assert.equal(child.stdout, "TRUST_ROOT_OVERRIDE_FORBIDDEN");
});

for (const [label, mutate, code] of [
  ["wrong root", (f) => { f.options.testOnlyInstallation.root_public_key_spki_sha256 = "0".repeat(64); }, "TRUST_ROOT_KEY_DIGEST_MISMATCH"],
  ["unsigned registry", (f) => { f.save("trust-registry.json", JSON.stringify({ ...f.registry, generated_at: "2026-08-15T00:00:00.000Z" })); f.updateManifest(); }, "TRUST_REGISTRY_SIGNATURE_INVALID"],
  ["forged signature", (f) => { f.save("trust-registry.json.sig", Buffer.alloc(64)); f.updateManifest(); }, "TRUST_REGISTRY_SIGNATURE_INVALID"],
  ["root as leaf", (f) => { f.leaf.public_key_spki_pem = f.rootKeys.publicKey.export({ type: "spki", format: "pem" }); f.seal(); }, "TRUST_REGISTRY_ROOT_KEY_REUSE"],
  ["old registry serial", (f) => { f.registry.registry_serial -= 1; f.seal(); }, "TRUST_REGISTRY_ROLLBACK"],
  ["wrong tenant", (f) => { f.leaf.allowed_lawos_tenant_ids = ["other-tenant"]; f.seal(); }, "SCHEMA_GOVERNANCE_SCOPE_INVALID"],
  ["other operation", (f) => { f.leaf.allowed_operations = ["public-release"]; f.seal(); }, "SCHEMA_GOVERNANCE_SCOPE_INVALID"],
  ["wildcard artifact", (f) => { f.leaf.allowed_artifact_sha256s = ["*"]; f.seal(); }, "SCHEMA_GOVERNANCE_SCOPE_INVALID"],
  ["multiple sources", (f) => { f.leaf.allowed_source_shas.push("3".repeat(40)); f.seal(); }, "SCHEMA_GOVERNANCE_SCOPE_INVALID"],
  ["wrong binding", (f) => { f.leaf.allowed_binding_sha256s = ["0".repeat(64)]; f.seal(); }, "SCHEMA_GOVERNANCE_SCOPE_INVALID"],
  ["unlisted file path", (f) => { const m = f.updateManifest(); m.files["../other.json"] = m.files["trust-registry.json"]; f.save("installation.json", JSON.stringify(m)); }, "SCHEMA_GOVERNANCE_INSTALLATION_INVALID"],
  ["oversize file table", (f) => { f.save("installation.json", Buffer.alloc(4097)); }, "TRUST_FILE_TOO_LARGE"],
  ["oversize registry", (f) => { f.save("trust-registry.json", Buffer.alloc(128 * 1024 + 1)); }, "TRUST_FILE_TOO_LARGE"],
]) {
  test(`schema installation rejects ${label}`, (t) => {
    const f = fixture(t); mutate(f);
    assert.throws(f.verify, { code });
  });
}

for (const name of ["installation.json", "root-public-key.spki.pem", "trust-registry.json", "trust-registry.json.sig"]) {
  for (const kind of ["symbolic", "hard"]) test(`schema installation rejects ${kind} link for ${name}`, (t) => {
    const f = fixture(t);
    const target = path.join(f.root, name), other = path.join(f.directory, "other");
    copyFileSync(target, other); rmSync(target);
    if (kind === "symbolic") symlinkSync(other, target); else linkSync(other, target);
    assert.throws(f.verify, { code: kind === "symbolic" ? "TRUST_SYMLINK_FORBIDDEN" : "TRUST_HARDLINK_FORBIDDEN" });
  });
}

for (const kind of ["expired", "revoked"]) test(`schema approval and runtime readback reject ${kind} leaf`, (t) => {
  const f = fixture(t);
  if (kind === "expired") f.leaf.valid_until = "2026-08-17T00:04:00.000Z";
  else f.leaf.revoked_at = "2026-08-17T00:04:00.000Z";
  f.seal();
  assert.throws(() => verifyJsonPostgresOutlookAuthorityApproval(f.receipt()), {
    code: kind === "expired" ? "TRUST_RECEIPT_TIME_INVALID" : "TRUSTED_KEY_REVOKED",
  });
  assert.throws(() => readJsonPostgresSchemaGovernance({ event: f.readbackEvent, env: f.env, now, verifyRegistry: f.verify }), { code: "LAWOS_SCHEMA_GOVERNANCE_READBACK" });
});

test("schema readback rejects HTTP, caller paths, foreign region and deployment drift before installation read", (t) => {
  const f = fixture(t);
  let reads = 0;
  for (const [event, env] of [
    [{ ...f.readbackEvent, requestContext: {} }, f.env],
    [{ ...f.readbackEvent, root_path: f.root }, f.env],
    [f.readbackEvent, { ...f.env, AWS_REGION: "us-east-1" }],
    [{ ...f.readbackEvent, source_sha: "0".repeat(40) }, f.env],
  ]) {
    assert.throws(() => readJsonPostgresSchemaGovernance({ event, env, now, verifyRegistry() { reads += 1; return f.verify(); } }));
  }
  assert.equal(reads, 0);
  const env = { ...f.env, LAWOS_DEPLOYMENT_ARTIFACT_SHA256: "0".repeat(64) };
  const event = { ...f.readbackEvent, artifact_sha256: env.LAWOS_DEPLOYMENT_ARTIFACT_SHA256 };
  assert.throws(() => readJsonPostgresSchemaGovernance({ event, env, now, verifyRegistry: f.verify }), { code: "LAWOS_SCHEMA_GOVERNANCE_READBACK" });
});
