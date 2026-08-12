import assert from "node:assert/strict";
import {
  createHash,
  createPrivateKey,
  createPublicKey,
  sign as signBytes,
} from "node:crypto";
import {
  existsSync,
  lstatSync,
  readFileSync,
  realpathSync,
  statSync,
} from "node:fs";
import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import {
  basename,
  dirname,
  isAbsolute,
  join,
  relative,
  resolve,
  sep,
} from "node:path";
import {
  canonicalizeUpdateMetadata,
  EXTERNAL_PILOT_UPDATE_SCHEMA,
  signUpdateMetadata,
} from "../../apps/desktop/src/main/updates.js";
import {
  requireDesktopReleaseArtifact,
  validateDesktopReleaseArtifactIndex,
} from "./matter-desktop-release-paths.mjs";
import { validateDesktopBuildManifest } from "./matter-desktop-provenance.mjs";
import {
  TRUST_REGISTRY_SCHEMA_VERSION,
  resolveTrustedFile,
  verifyDetachedReceipt,
} from "./external-release-trust.mjs";
import { resolveExternalPilotTrustRegistry } from "./matter-desktop-external-pilot-trust.mjs";
import { verifyExternalPilotBundle } from "../verify-matter-desktop-external-pilot-bundle.mjs";

export const EXTERNAL_PILOT_DECISION_SCHEMA = "law-firm-os.matter-desktop-external-pilot-decision.v1";
export const EXTERNAL_PILOT_RELEASE_SCHEMA = "law-firm-os.matter-desktop-external-pilot-release.v1";
export const TENANT_CONFIG_SCHEMA = "law-firm-os.matter-desktop-tenant-config.v1";
export const EXTERNAL_RELEASE_RECEIPT_SCHEMA = "law-firm-os.external-release-receipt.v0.2";
export const EXTERNAL_PILOT_APPROVAL_RECEIPT_TYPE = "macos_external_pilot_publication_approval";
export const VERIFICATION_CLOSURE_SCHEMA = "law-firm-os.matter-desktop-external-pilot-verification-closure.v1";
export const WINDOWS_EXTERNAL_PILOT_BLOCKER = "WINDOWS_AUTHENTICODE_AND_NATIVE_SMOKE_REQUIRED";

const SHA256 = /^[0-9a-f]{64}$/u;
const GIT_OBJECT = /^[0-9a-f]{40}$/u;
const VERSION = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/u;
const IDENTIFIER = /^[a-z0-9][a-z0-9._-]{2,79}$/u;
const LAWOS_TENANT_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const ENTRA_TENANT_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const KEY_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{2,127}$/u;
const APPROVAL_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/u;
const APP_ID = /^[A-Za-z0-9]+(?:[.-][A-Za-z0-9]+){2,}$/u;

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function externalPilotBindingSha256(decision) {
  return sha256(Buffer.from(JSON.stringify({
    pilot_id: decision.pilot_id,
    lawos_tenant_id: decision.lawos_tenant_id,
    entra_tenant_id: decision.entra_tenant_id,
    source_sha: decision.formal_candidate.source_sha,
    source_tree: decision.formal_candidate.source_tree,
    version: decision.formal_candidate.version,
  }), "utf8"));
}

export function validateVerificationClosure(closure, label = "verification closure") {
  exactKeys(closure, [
    "schema_version",
    "launcher_sha256",
    "node_executable",
    "node_sha256",
    "prepare_cli_sha256",
    "generator_sha256",
    "verifier_sha256",
    "trust_resolver_sha256",
    "trust_helper_sha256",
    "updates_sha256",
    "release_paths_sha256",
    "provenance_sha256",
  ], label);
  assert.equal(closure.schema_version, VERIFICATION_CLOSURE_SCHEMA);
  assert.ok(isAbsolute(closure.node_executable ?? ""), `${label}.node_executable must be absolute`);
  for (const [key, value] of Object.entries(closure)) {
    if (key.endsWith("_sha256")) assert.match(value ?? "", SHA256, `${label}.${key} is invalid`);
  }
  return closure;
}

function exactKeys(value, keys, label) {
  assert.ok(value && typeof value === "object" && !Array.isArray(value), `${label} must be an object`);
  assert.deepEqual(Object.keys(value).sort(), [...keys].sort(), `${label} keys must match the schema`);
}

function canonicalIso(value, label) {
  assert.equal(typeof value, "string", `${label} must be a string`);
  assert.equal(new Date(value).toISOString(), value, `${label} must be a canonical ISO timestamp`);
  return Date.parse(value);
}

function validateDestination(value) {
  assert.equal(typeof value, "string", "publication destination must be a string");
  const destination = new URL(value);
  assert.ok(["https:", "s3:"].includes(destination.protocol), "publication destination must use HTTPS or S3");
  assert.equal(destination.username, "", "publication destination cannot contain credentials");
  assert.equal(destination.password, "", "publication destination cannot contain credentials");
  assert.equal(destination.search, "", "publication destination cannot contain a query string");
  assert.equal(destination.hash, "", "publication destination cannot contain a fragment");
  assert.ok(destination.hostname.length > 0, "publication destination host is required");
  assert.ok(destination.pathname.length > 1, "publication destination must name a pilot-specific path");
  return destination.toString();
}

function validateReceiptRef(ref, label) {
  exactKeys(ref, ["path", "sha256", "signature_ref"], label);
  assert.equal(typeof ref.path, "string", `${label}.path must be a string`);
  assert.ok(ref.path.length > 0, `${label}.path is required`);
  assert.match(ref.sha256 ?? "", SHA256, `${label}.sha256 is invalid`);
  exactKeys(ref.signature_ref, ["path", "sha256"], `${label}.signature_ref`);
  assert.equal(typeof ref.signature_ref.path, "string", `${label}.signature_ref.path must be a string`);
  assert.ok(ref.signature_ref.path.length > 0, `${label}.signature_ref.path is required`);
  assert.match(ref.signature_ref.sha256 ?? "", SHA256, `${label}.signature_ref.sha256 is invalid`);
}

export function validateExternalPilotDecision(decision, { now = Date.now() } = {}) {
  exactKeys(decision, [
    "schema_version",
    "pilot_id",
    "firm_id",
    "lawos_tenant_id",
    "entra_tenant_id",
    "distribution_channel",
    "app_identity",
    "formal_candidate",
    "tenant_configuration",
    "signing",
    "trusted_verifier",
    "approval",
    "publication",
  ], "external-pilot decision");
  assert.equal(decision.schema_version, EXTERNAL_PILOT_DECISION_SCHEMA);
  assert.match(decision.pilot_id ?? "", IDENTIFIER, "pilot_id is invalid");
  assert.match(decision.firm_id ?? "", IDENTIFIER, "firm_id is invalid");
  assert.match(decision.lawos_tenant_id ?? "", LAWOS_TENANT_ID, "lawos_tenant_id is invalid");
  assert.match(decision.entra_tenant_id ?? "", ENTRA_TENANT_ID, "entra_tenant_id is invalid");
  assert.equal(decision.distribution_channel, "external-pilot");

  exactKeys(decision.app_identity, ["strategy", "app_id"], "app_identity");
  assert.equal(decision.app_identity.strategy, "reuse-formal-notarized-candidate");
  assert.match(decision.app_identity.app_id ?? "", APP_ID, "app_identity.app_id is invalid");

  exactKeys(decision.formal_candidate, [
    "version",
    "source_sha",
    "source_tree",
    "channel",
    "app_id",
    "artifact_index_sha256",
    "macos_zip_sha256",
    "macos_dmg_sha256",
    "package_lock_sha256",
    "desktop_package_sha256",
  ], "formal_candidate");
  assert.match(decision.formal_candidate.version ?? "", VERSION);
  assert.match(decision.formal_candidate.source_sha ?? "", GIT_OBJECT);
  assert.match(decision.formal_candidate.source_tree ?? "", GIT_OBJECT);
  assert.equal(decision.formal_candidate.channel, "formal");
  assert.equal(decision.formal_candidate.app_id, decision.app_identity.app_id);
  assert.match(decision.formal_candidate.artifact_index_sha256 ?? "", SHA256);
  assert.match(decision.formal_candidate.macos_zip_sha256 ?? "", SHA256);
  assert.match(decision.formal_candidate.macos_dmg_sha256 ?? "", SHA256);
  assert.match(decision.formal_candidate.package_lock_sha256 ?? "", SHA256);
  assert.match(decision.formal_candidate.desktop_package_sha256 ?? "", SHA256);

  exactKeys(decision.tenant_configuration, ["sha256"], "tenant_configuration");
  assert.match(decision.tenant_configuration.sha256 ?? "", SHA256);
  exactKeys(decision.signing, ["algorithm", "key_id", "public_key_sha256"], "signing");
  assert.equal(decision.signing.algorithm, "ed25519");
  assert.match(decision.signing.key_id ?? "", KEY_ID);
  assert.match(decision.signing.public_key_sha256 ?? "", SHA256);
  exactKeys(decision.trusted_verifier, ["delivery", "closure"], "trusted_verifier");
  assert.equal(decision.trusted_verifier.delivery, "out-of-band-or-preinstalled");
  validateVerificationClosure(decision.trusted_verifier.closure, "trusted_verifier.closure");

  exactKeys(decision.approval, ["receipt_ref"], "approval");
  validateReceiptRef(decision.approval.receipt_ref, "approval.receipt_ref");
  assert.notEqual(decision.approval.receipt_ref.sha256, "0".repeat(64), "external-pilot preparation requires an explicit signed approval receipt");

  exactKeys(decision.publication, ["approved", "destination", "audience"], "publication");
  assert.equal(decision.publication.approved, true, "publication destination requires explicit approval");
  assert.equal(decision.publication.audience, "named-pilot-only");
  validateDestination(decision.publication.destination);
  return decision;
}

export function validateExternalPilotTenantConfig(config, decision, { now = Date.now() } = {}) {
  exactKeys(config, [
    "schema_version",
    "pilot_id",
    "firm_id",
    "lawos_tenant_id",
    "entra_tenant_id",
    "runtime_endpoint",
    "issued_at",
    "expires_at",
  ], "tenant configuration");
  assert.equal(config.schema_version, TENANT_CONFIG_SCHEMA);
  assert.equal(config.pilot_id, decision.pilot_id, "tenant configuration pilot_id mismatch");
  assert.equal(config.firm_id, decision.firm_id, "tenant configuration firm_id mismatch");
  assert.equal(config.lawos_tenant_id, decision.lawos_tenant_id, "tenant configuration lawos_tenant_id mismatch");
  assert.equal(config.entra_tenant_id, decision.entra_tenant_id, "tenant configuration entra_tenant_id mismatch");
  const endpoint = new URL(config.runtime_endpoint);
  assert.equal(endpoint.protocol, "https:", "tenant runtime endpoint must use HTTPS");
  assert.equal(endpoint.username, "", "tenant runtime endpoint cannot contain credentials");
  assert.equal(endpoint.password, "", "tenant runtime endpoint cannot contain credentials");
  assert.equal(endpoint.search, "", "tenant runtime endpoint cannot contain a query string");
  assert.equal(endpoint.hash, "", "tenant runtime endpoint cannot contain a fragment");
  assert.ok(endpoint.hostname.length > 0, "tenant runtime endpoint host is required");
  const issuedAt = canonicalIso(config.issued_at, "tenant config issued_at");
  const expiresAt = canonicalIso(config.expires_at, "tenant config expires_at");
  assert.ok(issuedAt <= now, "tenant configuration is not active yet");
  assert.ok(expiresAt > now, "tenant configuration is expired");
  assert.ok(expiresAt > issuedAt, "tenant configuration expiry must follow issuance");
  return config;
}

function verifyPublicationApproval({
  decision,
  evidenceRoot,
  trustRegistry,
  now,
}) {
  const root = existingDirectory(evidenceRoot, "external-pilot approval evidence root");
  const receiptRef = decision.approval.receipt_ref;
  const receiptPath = resolveTrustedFile(root, receiptRef.path);
  const receiptBytes = readFileSync(receiptPath);
  assert.equal(sha256(receiptBytes), receiptRef.sha256, "external-pilot approval receipt digest mismatch");
  const receipt = JSON.parse(receiptBytes);
  const verification = verifyDetachedReceipt({
    rootDir: root,
    receiptRef,
    receiptBytes,
    receipt,
    registry: trustRegistry,
    expectedReceiptType: EXTERNAL_PILOT_APPROVAL_RECEIPT_TYPE,
    expectedReceiptSource: "release_owner",
    expectedPilotId: decision.pilot_id,
    expectedLawosTenantId: decision.lawos_tenant_id,
    expectedEntraTenantId: decision.entra_tenant_id,
    expectedSourceSha: decision.formal_candidate.source_sha,
    expectedSourceTree: decision.formal_candidate.source_tree,
    expectedVersion: decision.formal_candidate.version,
    expectedRole: "release_owner",
    expectedOperation: EXTERNAL_PILOT_APPROVAL_RECEIPT_TYPE,
    expectedArtifactSha256: decision.formal_candidate.artifact_index_sha256,
    expectedBindingSha256: externalPilotBindingSha256(decision),
    now,
  });
  exactKeys(receipt, [
    "schema_version",
    "receipt_type",
    "receipt_source",
    "verdict",
    "key_id",
    "issued_at",
    "expires_at",
    "pilot_id",
    "lawos_tenant_id",
    "entra_tenant_id",
    "source_sha",
    "source_tree",
    "version",
    "artifact_sha256",
    "binding_sha256",
    "role",
    "operation",
    "approval",
  ], "external-pilot approval receipt");
  assert.equal(receipt.schema_version, EXTERNAL_RELEASE_RECEIPT_SCHEMA);
  assert.equal(receipt.receipt_type, EXTERNAL_PILOT_APPROVAL_RECEIPT_TYPE);
  assert.equal(receipt.receipt_source, "release_owner");
  assert.equal(receipt.verdict, "APPROVED");
  assert.match(receipt.key_id ?? "", KEY_ID);
  assert.equal(receipt.pilot_id, decision.pilot_id);
  assert.equal(receipt.lawos_tenant_id, decision.lawos_tenant_id);
  assert.equal(receipt.entra_tenant_id, decision.entra_tenant_id);
  assert.equal(receipt.source_sha, decision.formal_candidate.source_sha);
  assert.equal(receipt.source_tree, decision.formal_candidate.source_tree);
  assert.equal(receipt.version, decision.formal_candidate.version);
  assert.equal(receipt.artifact_sha256, decision.formal_candidate.artifact_index_sha256);
  assert.equal(receipt.binding_sha256, externalPilotBindingSha256(decision));
  assert.equal(receipt.role, "release_owner");
  assert.equal(receipt.operation, EXTERNAL_PILOT_APPROVAL_RECEIPT_TYPE);
  exactKeys(receipt.approval, [
    "approval_id",
    "scope",
    "firm_id",
    "distribution_channel",
    "app_id",
    "publication_destination",
    "audience",
    "artifact_index_sha256",
    "tenant_config_sha256",
    "release_signing_key_id",
    "release_signing_public_key_sha256",
    "verification_closure",
  ], "external-pilot approval scope");
  assert.match(receipt.approval.approval_id ?? "", APPROVAL_ID, "approval_id is invalid");
  assert.equal(receipt.approval.scope, "named-macos-external-pilot");
  assert.equal(receipt.approval.firm_id, decision.firm_id);
  assert.equal(receipt.approval.distribution_channel, decision.distribution_channel);
  assert.equal(receipt.approval.app_id, decision.app_identity.app_id);
  assert.equal(receipt.approval.publication_destination, decision.publication.destination);
  assert.equal(receipt.approval.audience, decision.publication.audience);
  assert.equal(
    receipt.approval.artifact_index_sha256,
    decision.formal_candidate.artifact_index_sha256,
    "signed approval artifact_index_sha256 does not match the decision",
  );
  assert.equal(receipt.approval.tenant_config_sha256, decision.tenant_configuration.sha256);
  assert.equal(receipt.approval.release_signing_key_id, decision.signing.key_id);
  assert.equal(receipt.approval.release_signing_public_key_sha256, decision.signing.public_key_sha256);
  assert.deepEqual(receipt.approval.verification_closure, decision.trusted_verifier.closure);
  return {
    receipt,
    receiptBytes,
    signatureBytes: readFileSync(resolveTrustedFile(root, receiptRef.signature_ref.path)),
    verification,
    registry: trustRegistry,
    registrySha256: trustRegistry.sha256,
  };
}

function existingRegularFile(candidate, label) {
  const input = resolve(candidate);
  assert.equal(existsSync(input), true, `${label} does not exist`);
  assert.equal(lstatSync(input).isSymbolicLink(), false, `${label} cannot be a symlink`);
  const filePath = realpathSync(input);
  assert.equal(statSync(filePath).isFile(), true, `${label} must be a regular file`);
  return filePath;
}

function existingDirectory(candidate, label) {
  const input = resolve(candidate);
  assert.equal(existsSync(input), true, `${label} does not exist`);
  assert.equal(lstatSync(input).isSymbolicLink(), false, `${label} cannot be a symlink`);
  const directory = realpathSync(input);
  assert.equal(statSync(directory).isDirectory(), true, `${label} must be a directory`);
  return directory;
}

function privateKeyFile(candidate, worktreeRoot) {
  const filePath = existingRegularFile(candidate, "external-pilot signing private key");
  assert.equal(statSync(filePath).mode & 0o077, 0, "external-pilot signing private key must be mode 0600");
  const rel = relative(realpathSync(worktreeRoot), filePath);
  assert.ok(rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel), "external-pilot signing private key must remain outside the worktree");
  return filePath;
}

function artifactSourcePath(formalRoot, index, artifact) {
  const prefix = `${index.artifact_root}/`;
  assert.ok(artifact.path.startsWith(prefix), `formal artifact path is outside its index root: ${artifact.path}`);
  const suffix = artifact.path.slice(prefix.length);
  assert.ok(suffix.length > 0 && !suffix.split("/").includes(".."), "formal artifact suffix is invalid");
  const sourcePath = existingRegularFile(join(formalRoot, ...suffix.split("/")), artifact.id);
  const rel = relative(formalRoot, sourcePath);
  assert.equal(rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel), false, "formal artifact escapes the release root");
  const body = readFileSync(sourcePath);
  assert.equal(sha256(body), artifact.sha256, `formal artifact hash mismatch: ${artifact.id}`);
  assert.equal(body.length, artifact.bytes, `formal artifact size mismatch: ${artifact.id}`);
  return { artifact, sourcePath, body };
}

function receiptValue(source, label) {
  const prefix = `- ${label}:`;
  const line = source.split(/\r?\n/u).find((entry) => entry.startsWith(prefix));
  assert.ok(line, `formal macOS receipt is missing ${label}`);
  const value = line.slice(prefix.length).trim();
  return value.startsWith("`") && value.endsWith("`") ? value.slice(1, -1) : value;
}

function receiptField(source, label) {
  const prefix = `${label}:`;
  const line = source.split(/\r?\n/u).find((entry) => entry.startsWith(prefix));
  assert.ok(line, `formal macOS receipt is missing ${label}`);
  const value = line.slice(prefix.length).trim();
  return value.startsWith("`") && value.endsWith("`") ? value.slice(1, -1) : value;
}

function readFormalCandidate(formalReleaseRoot, decision) {
  const root = existingDirectory(formalReleaseRoot, "formal release root");
  const indexPath = existingRegularFile(join(root, "artifact-index.json"), "formal artifact index");
  const indexBytes = readFileSync(indexPath);
  assert.equal(sha256(indexBytes), decision.formal_candidate.artifact_index_sha256, "formal artifact index is not the approved candidate");
  const index = validateDesktopReleaseArtifactIndex(JSON.parse(indexBytes));
  assert.equal(index.version, decision.formal_candidate.version);
  assert.equal(index.source_sha, decision.formal_candidate.source_sha);
  assert.equal(index.source_tree, decision.formal_candidate.source_tree);
  assert.equal(index.source_dirty, false);
  assert.equal(index.channel, "formal");
  assert.equal(index.app_id, decision.app_identity.app_id);

  const checksums = readFileSync(existingRegularFile(join(root, "checksums.sha256"), "formal checksums"), "utf8");
  const required = Object.fromEntries([
    "macos_zip_archive",
    "macos_dmg_image",
    "macos_build_manifest",
    "macos_build_receipt",
  ].map((id) => {
    const artifact = requireDesktopReleaseArtifact(index, id);
    assert.ok(checksums.includes(`${artifact.sha256}  ${artifact.path}`), `formal checksum is missing ${id}`);
    return [id, artifactSourcePath(root, index, artifact)];
  }));
  assert.equal(required.macos_zip_archive.artifact.sha256, decision.formal_candidate.macos_zip_sha256);
  assert.equal(required.macos_dmg_image.artifact.sha256, decision.formal_candidate.macos_dmg_sha256);

  const buildManifest = validateDesktopBuildManifest(JSON.parse(required.macos_build_manifest.body));
  assert.equal(buildManifest.version, decision.formal_candidate.version);
  assert.equal(buildManifest.source_sha, decision.formal_candidate.source_sha);
  assert.equal(buildManifest.source_tree, decision.formal_candidate.source_tree);
  assert.equal(buildManifest.source_dirty, false);
  assert.equal(buildManifest.channel, "formal");
  assert.equal(buildManifest.app_id, decision.app_identity.app_id);
  assert.equal(buildManifest.platform, "darwin");

  const receipt = required.macos_build_receipt.body.toString("utf8");
  const requiredReceiptFields = {
    "App ID": decision.app_identity.app_id,
    Version: decision.formal_candidate.version,
    Channel: "formal",
    "Build manifest SHA-256": sha256(required.macos_build_manifest.body),
    "Source SHA": decision.formal_candidate.source_sha,
    "Source tree": decision.formal_candidate.source_tree,
    "Source dirty": "false",
    "Renderer SHA-256": buildManifest.renderer.sha256,
    "Renderer files": String(buildManifest.renderer.file_count),
    "Built at": buildManifest.built_at,
  };
  for (const [label, expected] of Object.entries(requiredReceiptFields)) {
    assert.equal(receiptField(receipt, label), expected, `formal macOS receipt provenance mismatch: ${label}`);
  }
  const requiredReceiptValues = {
    "Developer ID signing": "applied",
    "requested signing mode": "developer-id",
    "codesign verify": "pass",
    "strict codesign verify": "pass",
    "gatekeeper assess": "pass",
    "public distribution approval": "not claimed",
    "notarization requested": "true",
    "notarization credential source": "present",
    "notarization state": "submitted_and_accepted_by_notarytool",
    "DMG codesign verify": "pass",
    "DMG notarization state": "submitted_and_accepted_by_notarytool",
    "DMG stapler validate": "pass",
    "DMG Gatekeeper assess": "pass",
    "DMG image verify": "pass",
  };
  for (const [label, expected] of Object.entries(requiredReceiptValues)) {
    assert.equal(receiptValue(receipt, label), expected, `formal macOS receipt is not distribution-ready: ${label}`);
  }
  assert.match(receiptValue(receipt, "resolved signing identity"), /^Developer ID Application:/u);
  return { root, index, indexBytes, buildManifest, required };
}

function sriSha512(integrity, label) {
  assert.match(integrity ?? "", /^sha512-[A-Za-z0-9+/]+={0,2}$/u, `${label} integrity must be SHA-512 SRI`);
  return Buffer.from(integrity.slice("sha512-".length), "base64").toString("hex").toUpperCase();
}

function deterministicUuid(material) {
  const hex = sha256(material).slice(0, 32).split("");
  hex[12] = "5";
  hex[16] = ["8", "9", "a", "b"][Number.parseInt(hex[16], 16) % 4];
  const body = hex.join("");
  return `${body.slice(0, 8)}-${body.slice(8, 12)}-${body.slice(12, 16)}-${body.slice(16, 20)}-${body.slice(20)}`;
}

function buildSbom({ packageLock, desktopPackage, decision, generatedAt }) {
  assert.equal(packageLock.lockfileVersion, 3, "npm lockfile v3 is required for desktop SBOM");
  const workspace = packageLock.packages?.["apps/desktop"];
  assert.equal(workspace?.name, desktopPackage.name);
  assert.equal(workspace?.version, desktopPackage.version);
  const component = (name) => {
    const descriptor = packageLock.packages?.[`node_modules/${name}`];
    assert.ok(descriptor, `desktop SBOM dependency is missing from lockfile: ${name}`);
    assert.equal(descriptor.license, "MIT", `desktop SBOM dependency license changed: ${name}`);
    return {
      type: name === "electron" ? "framework" : "library",
      "bom-ref": `pkg:npm/${name}@${descriptor.version}`,
      name,
      version: descriptor.version,
      scope: "required",
      hashes: [{ alg: "SHA-512", content: sriSha512(descriptor.integrity, name) }],
      licenses: [{ license: { id: descriptor.license } }],
      purl: `pkg:npm/${name}@${descriptor.version}`,
      externalReferences: [{ type: "distribution", url: descriptor.resolved }],
    };
  };
  const components = [component("electron"), component("unpdf")];
  const rootRef = `pkg:npm/%40law-firm-os/desktop@${desktopPackage.version}`;
  return {
    bomFormat: "CycloneDX",
    specVersion: "1.5",
    serialNumber: `urn:uuid:${deterministicUuid(`${decision.pilot_id}:${decision.formal_candidate.source_sha}:${decision.tenant_configuration.sha256}`)}`,
    version: 1,
    metadata: {
      timestamp: generatedAt,
      component: {
        type: "application",
        "bom-ref": rootRef,
        group: "law-firm-os",
        name: "matter-desktop-external-pilot",
        version: desktopPackage.version,
        properties: [
          { name: "law-firm-os:pilot-id", value: decision.pilot_id },
          { name: "law-firm-os:source-sha", value: decision.formal_candidate.source_sha },
          { name: "law-firm-os:distribution-channel", value: "external-pilot" },
        ],
      },
    },
    components,
    dependencies: [{ ref: rootRef, dependsOn: components.map((entry) => entry["bom-ref"]) }],
  };
}

function thirdPartyNotices({ electronVersion, unpdfVersion, electronLicense, unpdfLicense }) {
  assert.ok(electronLicense.includes("Electron contributors"), "Electron license text does not match the locked component");
  assert.ok(unpdfLicense.includes("Johann Schopplich"), "unpdf license text does not match the locked component");
  return [
    "matter desktop external-pilot third-party notices",
    "",
    `Electron ${electronVersion} (MIT)`,
    "",
    electronLicense.trimEnd(),
    "",
    "Chromium and bundled component notices are in LICENSES.chromium.html.",
    "",
    `unpdf ${unpdfVersion} (MIT)`,
    "",
    unpdfLicense.trimEnd(),
    "",
  ].join("\n");
}

function installDocument({ decision, zipName, dmgName }) {
  const closure = decision.trusted_verifier.closure;
  return `# Install matter for ${decision.pilot_id}

This package is only for the named macOS pilot \`${decision.pilot_id}\` at \`${decision.firm_id}\`. It is not a public download or an App Store package.

## Obtain the trusted verifier before installation

Do not execute a verifier from this bundle. No executable verifier is included. Obtain the approved verifier through a separate trusted channel or use the separately installed release verifier.

Before executing anything, obtain the approved verification-closure record through an independent trusted channel. The closure printed here and in this bundle is reference data only; it is not a trust root. It binds the launcher, exact canonical Node executable and bytes, verifier, trust resolver, shared helper, update verifier, preparation entrypoint/generator, and their local release/provenance dependencies:

\`\`\`json
${JSON.stringify(closure, null, 2)}
\`\`\`

For example, compare the separately obtained expected value with:

\`\`\`bash
shasum -a 256 /trusted/path/run-trusted-matter-desktop-external-pilot.sh
shasum -a 256 ${closure.node_executable}
shasum -a 256 /trusted/path/verify-matter-desktop-external-pilot-bundle.mjs
shasum -a 256 /trusted/path/lib/matter-desktop-external-pilot-trust.mjs
shasum -a 256 /trusted/path/lib/external-release-trust.mjs
shasum -a 256 /trusted/path/../apps/desktop/src/main/updates.js
\`\`\`

Stop before executing the launcher if any file, canonical path, or digest does not equal the independently obtained signed closure. Do not invoke the Node entrypoint directly.

Obtain this Ed25519 public-key fingerprint through the approved out-of-band channel:

\`${decision.signing.public_key_sha256}\`

The verifier has no trust-root, registry-path, registry-digest, or environment-variable override. It consults only the versioned governance-installed production trust-root policy. The registry reference recorded in the bundle is data, not authority. The current source policy is deliberately unconfigured and must stop with \`TRUST_ROOT_NOT_CONFIGURED\` until the governance owner installs the production root outside both the release bundle and the caller's inputs.

After the independently delivered closure and fingerprint match, run the independently delivered launcher by its absolute canonical, non-symlink path. Pass every closure value exactly; the launcher hashes the full closure before Node imports any module, strips \`NODE_OPTIONS\`/\`NODE_PATH\` by starting Node under \`env -i\`, and executes only the exact hashed Node binary:

\`\`\`bash
/trusted/path/run-trusted-matter-desktop-external-pilot.sh verify \\
  --expected-launcher-sha256 ${closure.launcher_sha256} \\
  --node-executable ${closure.node_executable} \\
  --expected-node-sha256 ${closure.node_sha256} \\
  --expected-prepare-cli-sha256 ${closure.prepare_cli_sha256} \\
  --expected-generator-sha256 ${closure.generator_sha256} \\
  --expected-verifier-sha256 ${closure.verifier_sha256} \\
  --expected-trust-resolver-sha256 ${closure.trust_resolver_sha256} \\
  --expected-trust-helper-sha256 ${closure.trust_helper_sha256} \\
  --expected-updates-sha256 ${closure.updates_sha256} \\
  --expected-release-paths-sha256 ${closure.release_paths_sha256} \\
  --expected-provenance-sha256 ${closure.provenance_sha256} \\
  -- \\
  --bundle /absolute/path/to/this-bundle \\
  --expected-key-sha256 ${decision.signing.public_key_sha256}
\`\`\`

Stop if verification does not print \`"verdict": "PASS"\`.

## Install on macOS

1. Keep \`${zipName}\` unchanged for update and rollback verification.
2. Open \`${dmgName}\` and copy \`matter.app\` to \`/Applications\`.
   This replaces any existing \`/Applications/matter.app\`, including a differently scoped build with the same filename. Stop unless the assigned device has a verified rollback bundle for the existing installation.
3. Verify Gatekeeper before first launch:

   \`\`\`bash
   spctl --assess --type execute --verbose=4 /Applications/matter.app
   \`\`\`

4. Give \`tenant-config.json\`, \`tenant-config.sig\`, and the verified key fingerprint to the approved onboarding operator.
5. Do not infer or reuse the AMIC tenant endpoint. The generic desktop binary does not consume \`tenant-config.json\` automatically. The onboarding operator must apply its signed runtime endpoint, LawOS tenant ID, and Entra tenant ID through the approved per-firm runtime bootstrap before launch.
6. Launch only with the named pilot account and complete the pilot smoke checklist.

No upload, tenant activation, public release, production go-live, App Store publication, or Windows distribution is performed by this bundle.
`;
}

function rollbackDocument({ decision }) {
  return `# Roll back matter for ${decision.pilot_id}

Use only a previously verified bundle for the same \`${decision.firm_id}\` firm, \`${decision.lawos_tenant_id}\` LawOS tenant, and \`${decision.entra_tenant_id}\` Entra tenant.

1. Stop the pilot rollout and quit \`matter.app\`.
2. Verify the previous bundle with its out-of-band Ed25519 key fingerprint, governance-installed production trust root, and the separately obtained, digest-verified or preinstalled trusted verifier plus shared trust helper. Never execute a verifier from a release bundle, and never treat a registry reference inside one as authority.
3. Restore \`matter.app\` from the previous verified DMG.
4. Have the approved onboarding operator restore that bundle's signed tenant configuration. Do not reuse a configuration whose pilot, firm, tenant, or digest differs.
5. Re-run Gatekeeper and the named-pilot smoke checklist.

Do not delete user data, tenant records, or audit evidence as part of application rollback. If the previous signed bundle or tenant configuration is unavailable, leave the rollout stopped and escalate to the release owner.
`;
}

async function writeJson(filePath, value) {
  const body = Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
  await writeFile(filePath, body);
  return body;
}

async function fileRecord(root, relativePath, id, kind) {
  const body = await readFile(join(root, relativePath));
  return { id, path: relativePath, kind, bytes: body.length, sha256: sha256(body) };
}

function outputTarget(outputDir) {
  const target = resolve(outputDir);
  assert.equal(existsSync(target), false, "external-pilot output directory already exists");
  return target;
}

export async function prepareExternalPilotBundle({
  worktreeRoot,
  formalReleaseRoot,
  decisionPath,
  tenantConfigPath,
  approvalEvidenceRoot,
  testOnlyTrustRoot = null,
  verificationClosure,
  privateKeyPath,
  electronDistPath,
  unpdfLicensePath,
  verifierPath,
  trustHelperPath,
  packageLockPath,
  desktopPackagePath,
  outputDir,
  now = Date.now(),
}) {
  const root = existingDirectory(worktreeRoot, "worktree root");
  const decisionBytes = await readFile(existingRegularFile(decisionPath, "external-pilot decision"));
  const decision = validateExternalPilotDecision(JSON.parse(decisionBytes), { now });
  assert.deepEqual(
    validateVerificationClosure(verificationClosure, "trusted launcher verification closure"),
    decision.trusted_verifier.closure,
    "trusted launcher verification closure does not match the signed decision scope",
  );
  const tenantConfigBytes = await readFile(existingRegularFile(tenantConfigPath, "tenant configuration"));
  const tenantConfig = validateExternalPilotTenantConfig(JSON.parse(tenantConfigBytes), decision, { now });
  assert.equal(sha256(tenantConfigBytes), decision.tenant_configuration.sha256, "tenant configuration digest does not match the approved decision");
  const trustedHelperBytes = await readFile(existingRegularFile(trustHelperPath, "shared external-release trust helper"));
  assert.equal(
    sha256(trustedHelperBytes),
    decision.trusted_verifier.closure.trust_helper_sha256,
    "shared external-release trust helper does not match the approved out-of-band digest",
  );
  const trustRegistry = resolveExternalPilotTrustRegistry({ testOnlyTrustRoot, now });
  const approval = verifyPublicationApproval({
    decision,
    evidenceRoot: approvalEvidenceRoot,
    trustRegistry,
    now,
  });
  assert.ok(
    Date.parse(tenantConfig.expires_at) <= Date.parse(approval.receipt.expires_at),
    "tenant configuration cannot outlive the signed external-pilot approval",
  );

  const signingKeyPath = privateKeyFile(privateKeyPath, root);
  const privateKey = createPrivateKey(await readFile(signingKeyPath));
  assert.equal(privateKey.asymmetricKeyType, "ed25519", "external-pilot signing key must be Ed25519");
  const publicKey = createPublicKey(privateKey);
  const publicKeyPem = Buffer.from(publicKey.export({ type: "spki", format: "pem" }));
  const publicKeySha256 = sha256(publicKey.export({ type: "spki", format: "der" }));
  assert.equal(publicKeySha256, decision.signing.public_key_sha256, "signing key does not match the approved decision");
  const trustedVerifierBytes = await readFile(existingRegularFile(verifierPath, "trusted external bundle verifier"));
  assert.equal(
    sha256(trustedVerifierBytes),
    decision.trusted_verifier.closure.verifier_sha256,
    "trusted external verifier does not match the approved out-of-band digest",
  );

  const formal = readFormalCandidate(formalReleaseRoot, decision);
  const packageLockBytes = await readFile(existingRegularFile(packageLockPath, "package lock"));
  const desktopPackageBytes = await readFile(existingRegularFile(desktopPackagePath, "desktop package"));
  assert.equal(sha256(packageLockBytes), decision.formal_candidate.package_lock_sha256, "package lock does not match the approved formal candidate");
  assert.equal(sha256(desktopPackageBytes), decision.formal_candidate.desktop_package_sha256, "desktop package does not match the approved formal candidate");
  const packageLock = JSON.parse(packageLockBytes);
  const desktopPackage = JSON.parse(desktopPackageBytes);
  assert.equal(desktopPackage.name, "@law-firm-os/desktop");
  assert.equal(desktopPackage.version, decision.formal_candidate.version);

  const electronDist = existingDirectory(electronDistPath, "Electron distribution license directory");
  const electronVersion = (await readFile(existingRegularFile(join(electronDist, "version"), "Electron version"), "utf8")).trim();
  const lockedElectron = packageLock.packages?.["node_modules/electron"];
  const lockedUnpdf = packageLock.packages?.["node_modules/unpdf"];
  assert.equal(electronVersion, lockedElectron?.version, "Electron license source version does not match lockfile");
  const electronLicense = await readFile(existingRegularFile(join(electronDist, "LICENSE"), "Electron license"), "utf8");
  const chromiumLicensePath = existingRegularFile(join(electronDist, "LICENSES.chromium.html"), "Chromium notices");
  const chromiumLicense = await readFile(chromiumLicensePath);
  assert.ok(chromiumLicense.length > 0 && chromiumLicense.toString("utf8", 0, 200).toLowerCase().includes("html"), "Chromium notices are invalid");
  const unpdfLicense = await readFile(existingRegularFile(unpdfLicensePath, "unpdf license"), "utf8");
  assert.equal(lockedUnpdf?.version, "1.8.0", "unpdf license source version is not pinned to the lockfile");

  const target = outputTarget(outputDir);
  await mkdir(dirname(target), { recursive: true });
  const temporaryRoot = await mkdtemp(join(dirname(target), `.${decision.pilot_id}-`));
  const generatedAt = new Date(now).toISOString();
  try {
    await mkdir(join(temporaryRoot, "macos"), { recursive: true });
    await mkdir(join(temporaryRoot, "provenance"), { recursive: true });
    const sourceCopies = [
      ["macos_zip_archive", "macos", "zip_archive"],
      ["macos_dmg_image", "macos", "dmg_image"],
      ["macos_build_manifest", "provenance", "build_manifest"],
      ["macos_build_receipt", "provenance", "build_receipt"],
    ];
    const artifacts = [];
    for (const [id, directory, kind] of sourceCopies) {
      const source = formal.required[id];
      const relativePath = `${directory}/${basename(source.sourcePath)}`;
      await copyFile(source.sourcePath, join(temporaryRoot, relativePath));
      const record = await fileRecord(temporaryRoot, relativePath, id, kind);
      assert.equal(record.sha256, source.artifact.sha256, `preserved candidate bytes changed: ${id}`);
      assert.equal(record.bytes, source.artifact.bytes, `preserved candidate size changed: ${id}`);
      artifacts.push(record);
    }

    await writeFile(join(temporaryRoot, "tenant-config.json"), tenantConfigBytes);
    await writeFile(join(temporaryRoot, "tenant-config.sig"), signBytes(null, tenantConfigBytes, privateKey));
    await writeFile(join(temporaryRoot, "signing-public-key.pem"), publicKeyPem);
    await writeFile(join(temporaryRoot, "approval-receipt.json"), approval.receiptBytes);
    await writeFile(join(temporaryRoot, "approval-receipt.sig"), approval.signatureBytes);
    const bundledApprovalRef = {
      path: "approval-receipt.json",
      sha256: sha256(approval.receiptBytes),
      signature_ref: {
        path: "approval-receipt.sig",
        sha256: sha256(approval.signatureBytes),
      },
    };
    await writeJson(join(temporaryRoot, "approval-receipt-ref.json"), bundledApprovalRef);
    await writeFile(join(temporaryRoot, "provenance/package-lock.json"), packageLockBytes);
    await writeFile(join(temporaryRoot, "provenance/desktop-package.json"), desktopPackageBytes);
    const sbom = buildSbom({ packageLock, desktopPackage, decision, generatedAt });
    await writeJson(join(temporaryRoot, "sbom.cdx.json"), sbom);
    await writeFile(join(temporaryRoot, "THIRD-PARTY-NOTICES.txt"), thirdPartyNotices({
      electronVersion,
      unpdfVersion: lockedUnpdf.version,
      electronLicense,
      unpdfLicense,
    }));
    await writeFile(join(temporaryRoot, "LICENSES.chromium.html"), chromiumLicense);
    const zipArtifact = artifacts.find((artifact) => artifact.id === "macos_zip_archive");
    const dmgArtifact = artifacts.find((artifact) => artifact.id === "macos_dmg_image");
    await writeFile(join(temporaryRoot, "INSTALL.md"), installDocument({
      decision,
      zipName: basename(zipArtifact.path),
      dmgName: basename(dmgArtifact.path),
    }));
    await writeFile(join(temporaryRoot, "ROLLBACK.md"), rollbackDocument({ decision }));
    await writeJson(join(temporaryRoot, "trusted-verifier-reference.json"), {
      delivery: "out-of-band-or-preinstalled",
      closure: decision.trusted_verifier.closure,
      executable_verifier_in_bundle: false,
      bundle_reference_is_trust_root: false,
      pre_execution_digest_check_required: true,
    });

    const macosArtifactChecksumBytes = Buffer.from([
      `${dmgArtifact.sha256}  ${basename(dmgArtifact.path)}`,
      `${zipArtifact.sha256}  ${basename(zipArtifact.path)}`,
      "",
    ].join("\n"));
    await writeFile(join(temporaryRoot, "macos-artifact-checksums.sha256"), macosArtifactChecksumBytes);
    await writeFile(
      join(temporaryRoot, "macos-artifact-checksums.sig"),
      signBytes(null, macosArtifactChecksumBytes, privateKey),
    );
    const sbomBytes = await readFile(join(temporaryRoot, "sbom.cdx.json"));
    const receiptExpiresAt = new Date(Math.min(
      Date.parse(tenantConfig.expires_at),
      Date.parse(approval.receipt.expires_at),
    )).toISOString();
    const macosDistributionReceipt = {
      schema_version: EXTERNAL_RELEASE_RECEIPT_SCHEMA,
      receipt_type: "macos_distribution_artifacts",
      receipt_source: "release_pipeline",
      verdict: "PASS",
      key_id: decision.signing.key_id,
      issued_at: generatedAt,
      expires_at: receiptExpiresAt,
      pilot_id: decision.pilot_id,
      lawos_tenant_id: decision.lawos_tenant_id,
      entra_tenant_id: decision.entra_tenant_id,
      source_sha: formal.index.source_sha,
      source_tree: formal.index.source_tree,
      version: desktopPackage.version,
      artifact_sha256: dmgArtifact.sha256,
      binding_sha256: externalPilotBindingSha256(decision),
      role: "release_pipeline",
      operation: "macos_distribution_artifacts",
      distribution_channel: "external-pilot",
      signing: {
        developer_id: true,
        notarized: true,
        stapled: true,
        gatekeeper_accepted: true,
        notarization_ticket_ref: `${dmgArtifact.path}#stapled-notarization-ticket`,
        artifact_checksums_algorithm: "ed25519",
        artifact_checksums_key_id: decision.signing.key_id,
        artifact_checksums_signature_path: "macos-artifact-checksums.sig",
      },
      artifacts: {
        package: {
          path: dmgArtifact.path,
          sha256: dmgArtifact.sha256,
          kind: "notarized_stapled_dmg",
        },
        checksums: {
          path: "macos-artifact-checksums.sha256",
          sha256: sha256(macosArtifactChecksumBytes),
        },
        sbom: {
          path: "sbom.cdx.json",
          sha256: sha256(sbomBytes),
        },
      },
      claim_policy: {
        macos_artifact_gate_only: true,
        external_pilot_go_live_approved: false,
        public_release_claim: false,
        production_go_live_claim: false,
      },
    };
    const macosReceiptBytes = await writeJson(
      join(temporaryRoot, "macos-distribution-receipt.json"),
      macosDistributionReceipt,
    );
    const macosReceiptSignature = signBytes(null, macosReceiptBytes, privateKey);
    await writeFile(join(temporaryRoot, "macos-distribution-receipt.sig"), macosReceiptSignature);
    const macosReceiptRef = {
      path: "macos-distribution-receipt.json",
      sha256: sha256(macosReceiptBytes),
      signature_ref: {
        path: "macos-distribution-receipt.sig",
        sha256: sha256(macosReceiptSignature),
      },
    };
    await writeJson(join(temporaryRoot, "macos-distribution-receipt-ref.json"), macosReceiptRef);
    verifyDetachedReceipt({
      rootDir: temporaryRoot,
      receiptRef: macosReceiptRef,
      receiptBytes: macosReceiptBytes,
      receipt: macosDistributionReceipt,
      registry: approval.registry,
      expectedReceiptType: "macos_distribution_artifacts",
      expectedReceiptSource: "release_pipeline",
      expectedPilotId: decision.pilot_id,
      expectedLawosTenantId: decision.lawos_tenant_id,
      expectedEntraTenantId: decision.entra_tenant_id,
      expectedSourceSha: formal.index.source_sha,
      expectedSourceTree: formal.index.source_tree,
      expectedVersion: desktopPackage.version,
      expectedRole: "release_pipeline",
      expectedOperation: "macos_distribution_artifacts",
      expectedArtifactSha256: dmgArtifact.sha256,
      expectedBindingSha256: externalPilotBindingSha256(decision),
      now,
    });
    await writeJson(join(temporaryRoot, "trust-registry-reference.json"), {
      schema_version: TRUST_REGISTRY_SCHEMA_VERSION,
      sha256: approval.registrySha256,
      included_in_bundle: false,
      bundle_reference_is_trust_root: false,
      caller_supplied_registry_authority: false,
      production_trust_root_required: true,
    });

    const windowsBlocker = {
      status: "BLOCKED",
      blocker_code: WINDOWS_EXTERNAL_PILOT_BLOCKER,
      reason: "Windows external-pilot distribution requires valid Authenticode signatures on the installer and executable plus native Windows install, launch, update, rollback, and uninstall smoke evidence.",
      authenticode_verified: false,
      native_install_smoke_verified: false,
      windows_artifacts_included: false,
      store_distribution_claim: false,
    };
    await writeJson(join(temporaryRoot, "WINDOWS-BLOCKER.json"), windowsBlocker);

    const contentPaths = [
      "tenant-config.json",
      "signing-public-key.pem",
      "provenance/package-lock.json",
      "provenance/desktop-package.json",
      "sbom.cdx.json",
      "THIRD-PARTY-NOTICES.txt",
      "LICENSES.chromium.html",
      "INSTALL.md",
      "ROLLBACK.md",
      "trusted-verifier-reference.json",
      "approval-receipt.json",
      "approval-receipt.sig",
      "approval-receipt-ref.json",
      "trust-registry-reference.json",
      "macos-artifact-checksums.sha256",
      "macos-artifact-checksums.sig",
      "macos-distribution-receipt.json",
      "macos-distribution-receipt.sig",
      "macos-distribution-receipt-ref.json",
      "WINDOWS-BLOCKER.json",
    ];
    const bundleContents = await Promise.all(contentPaths.map((relativePath) => (
      fileRecord(temporaryRoot, relativePath, relativePath, "bundle_support")
    )));
    const manifest = {
      schema_version: EXTERNAL_PILOT_RELEASE_SCHEMA,
      release_id: `matter-desktop-${decision.pilot_id}-v${desktopPackage.version}`,
      status: "publication_ready_not_published",
      generated_at: generatedAt,
      product_name: "matter",
      package_name: desktopPackage.name,
      version: desktopPackage.version,
      pilot_id: decision.pilot_id,
      firm_id: decision.firm_id,
      lawos_tenant_id: decision.lawos_tenant_id,
      entra_tenant_id: decision.entra_tenant_id,
      distribution_channel: "external-pilot",
      named_pilot_only: true,
      app_identity: decision.app_identity,
      source_candidate: {
        version: formal.index.version,
        source_sha: formal.index.source_sha,
        source_tree: formal.index.source_tree,
        source_dirty: false,
        channel: formal.index.channel,
        app_id: formal.index.app_id,
        artifact_index_sha256: sha256(formal.indexBytes),
        package_lock_sha256: sha256(packageLockBytes),
        desktop_package_sha256: sha256(desktopPackageBytes),
        bytes_preserved: true,
      },
      tenant_configuration: {
        path: "tenant-config.json",
        signature_path: "tenant-config.sig",
        sha256: decision.tenant_configuration.sha256,
        runtime_endpoint: tenantConfig.runtime_endpoint,
        generic_binary: true,
        consumed_automatically_by_binary: false,
        signed_onboarding_required: true,
      },
      signing: {
        algorithm: "ed25519",
        key_id: decision.signing.key_id,
        public_key_path: "signing-public-key.pem",
        public_key_sha256: publicKeySha256,
        checksum_signature_path: "checksums.sig",
        update_metadata_signature_path: "update-metadata.sig",
        trusted_external_verifier: {
          delivery: decision.trusted_verifier.delivery,
          closure: decision.trusted_verifier.closure,
          bundled_executable: false,
        },
        trust_registry: {
          schema_version: TRUST_REGISTRY_SCHEMA_VERSION,
          sha256: approval.registrySha256,
          included_in_bundle: false,
          bundle_reference_is_trust_root: false,
          caller_supplied_registry_authority: false,
          production_trust_root_required: true,
        },
      },
      approval: {
        verification: "trusted_detached_receipt",
        receipt_ref: bundledApprovalRef,
        key_id: approval.receipt.key_id,
        approval_id: approval.receipt.approval.approval_id,
        scope: approval.receipt.approval.scope,
        issued_at: approval.receipt.issued_at,
        expires_at: approval.receipt.expires_at,
      },
      publication: {
        approved: decision.publication.approved,
        destination: decision.publication.destination,
        audience: decision.publication.audience,
        performed: false,
      },
      macos: {
        status: "READY_FOR_NAMED_PILOT_PUBLICATION",
        distribution_receipt_path: "macos-distribution-receipt.json",
        distribution_receipt_ref_path: "macos-distribution-receipt-ref.json",
        distribution_receipt_signature_path: "macos-distribution-receipt.sig",
        developer_id_verified_by_formal_receipt: true,
        notarization_verified_by_formal_receipt: true,
        staple_verified_by_formal_receipt: true,
        gatekeeper_verified_by_formal_receipt: true,
      },
      windows: {
        status: "BLOCKED",
        blocker_code: WINDOWS_EXTERNAL_PILOT_BLOCKER,
        artifacts_included: false,
        authenticode_verified: false,
        native_install_smoke_verified: false,
      },
      artifacts,
      bundle_contents: bundleContents,
      macos_artifact_publication_approved: true,
      external_pilot_go_live_claim: false,
      global_release_readiness_claim: false,
      publication_performed: false,
      public_release_claim: false,
      production_go_live_claim: false,
      app_store_distribution_claim: false,
      microsoft_store_distribution_claim: false,
    };
    const manifestBytes = await writeJson(join(temporaryRoot, "release-manifest.json"), manifest);
    const updateMetadata = {
      schemaVersion: EXTERNAL_PILOT_UPDATE_SCHEMA,
      version: desktopPackage.version,
      channel: "external-pilot",
      pilotId: decision.pilot_id,
      appId: decision.app_identity.app_id,
      keyId: decision.signing.key_id,
      artifactFilename: zipArtifact.path,
      artifactSha256: zipArtifact.sha256,
      artifactBytes: zipArtifact.bytes,
      tenantConfigSha256: decision.tenant_configuration.sha256,
      releaseManifestSha256: sha256(manifestBytes),
      lawosTenantId: decision.lawos_tenant_id,
      entraTenantId: decision.entra_tenant_id,
      sourceSha: formal.index.source_sha,
      sourceTree: formal.index.source_tree,
      generatedAt,
      expiresAt: receiptExpiresAt,
      approvalId: approval.receipt.approval.approval_id,
      approvalExpiresAt: approval.receipt.expires_at,
    };
    const updateMetadataBytes = Buffer.from(`${canonicalizeUpdateMetadata(updateMetadata)}\n`);
    await writeFile(join(temporaryRoot, "update-metadata.json"), updateMetadataBytes);
    await writeFile(
      join(temporaryRoot, "update-metadata.sig"),
      Buffer.from(signUpdateMetadata(updateMetadata, privateKey), "base64"),
    );

    const checksumPaths = [
      ...artifacts.map((artifact) => artifact.path),
      ...contentPaths,
      "tenant-config.sig",
      "release-manifest.json",
      "update-metadata.json",
      "update-metadata.sig",
    ].sort();
    const checksumLines = [];
    for (const relativePath of checksumPaths) {
      const body = await readFile(join(temporaryRoot, relativePath));
      checksumLines.push(`${sha256(body)}  ${relativePath}`);
    }
    const checksumBytes = Buffer.from(`${checksumLines.join("\n")}\n`);
    await writeFile(join(temporaryRoot, "checksums.sha256"), checksumBytes);
    await writeFile(join(temporaryRoot, "checksums.sig"), signBytes(null, checksumBytes, privateKey));

    const verification = verifyExternalPilotBundle({
      bundleDir: temporaryRoot,
      expectedKeySha256: publicKeySha256,
      verificationClosure,
      testOnlyTrustRoot,
      now,
    });
    await rename(temporaryRoot, target);
    return {
      ...verification,
      bundle_root: target,
      release_manifest: join(target, "release-manifest.json"),
      checksums: join(target, "checksums.sha256"),
      checksums_signature: join(target, "checksums.sig"),
      update_metadata: join(target, "update-metadata.json"),
      update_metadata_signature: join(target, "update-metadata.sig"),
      tenant_configuration: join(target, "tenant-config.json"),
      tenant_configuration_signature: join(target, "tenant-config.sig"),
      sbom: join(target, "sbom.cdx.json"),
      notices: join(target, "THIRD-PARTY-NOTICES.txt"),
      install: join(target, "INSTALL.md"),
      rollback: join(target, "ROLLBACK.md"),
      windows_blocker: join(target, "WINDOWS-BLOCKER.json"),
    };
  } catch (error) {
    await rm(temporaryRoot, { recursive: true, force: true });
    throw error;
  }
}
