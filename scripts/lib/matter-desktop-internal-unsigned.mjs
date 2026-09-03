import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createReadStream, existsSync } from "node:fs";
import { lstat, readdir } from "node:fs/promises";
import path from "node:path";
import {
  DESKTOP_INTERNAL_UNSIGNED_MARKER_NAME,
} from "./matter-desktop-provenance.mjs";

const FORBIDDEN_PACKAGE_PATHS = Object.freeze([
  Object.freeze({
    code: "OPAQUE_ASAR_NOT_SCANNABLE",
    pattern: /(?:^|\/)resources\/app\.asar$/u,
  }),
  Object.freeze({
    code: "LOCAL_API_RUNTIME_INCLUDED",
    pattern: /(?:^|\/)resources\/app\/runtime(?:\/|$)/u,
  }),
  Object.freeze({
    code: "PRIVATE_ROSTER_INCLUDED",
    pattern: /(?:^|\/)hrx-member-roster-source-of-truth\.json$/u,
  }),
  Object.freeze({
    code: "PRIVATE_CONTACTS_INCLUDED",
    pattern: /(?:^|\/)hrx-member-contact-source-of-truth\.json$/u,
  }),
  Object.freeze({
    code: "PRIVATE_PHOTOS_INCLUDED",
    pattern: /(?:^|\/)hrx-member-photos(?:\/|$)/u,
  }),
  Object.freeze({
    code: "REGISTRATION_SEED_INCLUDED",
    pattern: /(?:^|\/)matter-vault-user-registration-seed\.json$/u,
  }),
  Object.freeze({
    code: "CREDENTIAL_FILE_INCLUDED",
    pattern: /(?:^|\/)(?:\.env(?:\.[^/]*)?|credentials?\.json|secrets?\.json)$/iu,
  }),
  Object.freeze({
    code: "PRIVATE_KEY_FILE_INCLUDED",
    pattern: /\.(?:key|p12|pem|pfx)$/iu,
  }),
]);

const FORBIDDEN_SIGNING_ENVIRONMENT_FIELDS = Object.freeze([
  "CSC_KEY_PASSWORD",
  "CSC_LINK",
  "CSC_NAME",
  "MATTER_DESKTOP_AUTHENTICODE",
  "MATTER_DESKTOP_AUTHENTICODE_CERTIFICATE_SHA1",
  "MATTER_DESKTOP_AUTHENTICODE_TIMESTAMP_URL",
  "MATTER_DESKTOP_SIGNTOOL_SHA256",
  "SIGNTOOL_PATH",
  "WIN_CSC_KEY_PASSWORD",
  "WIN_CSC_LINK",
]);

const PRIVATE_SOURCE_KINDS = Object.freeze([
  "contact",
  "photos",
  "registrationSeed",
  "roster",
]);

export function createInternalUnsignedBuilderEnvironment(env = process.env) {
  const configuredSigningFields = FORBIDDEN_SIGNING_ENVIRONMENT_FIELDS.filter(
    (name) => String(env[name] ?? "").trim() !== "",
  );
  assert.deepEqual(
    configuredSigningFields,
    [],
    `internal-unsigned build cannot receive signing configuration: ${configuredSigningFields.join(", ")}`,
  );
  const autoDiscovery = String(env.CSC_IDENTITY_AUTO_DISCOVERY ?? "").trim().toLowerCase();
  assert.ok(
    autoDiscovery === "" || autoDiscovery === "false",
    "internal-unsigned build must disable signing identity auto-discovery",
  );
  return Object.freeze({
    ...env,
    CSC_IDENTITY_AUTO_DISCOVERY: "false",
  });
}

function normalizedRelativePath(value) {
  const normalized = String(value ?? "").replaceAll("\\", "/").replace(/^\.\//u, "");
  assert.ok(normalized && !normalized.startsWith("/") && !normalized.includes("\0"));
  assert.equal(path.posix.normalize(normalized), normalized, "package path must be canonical and relative");
  assert.equal(normalized, normalized.normalize("NFC"), "package path must use NFC");
  return normalized;
}

export function auditInternalUnsignedPackagePaths(filePaths = []) {
  const paths = [...new Set(filePaths.map(normalizedRelativePath))].sort();
  const findings = [];
  for (const filePath of paths) {
    for (const rule of FORBIDDEN_PACKAGE_PATHS) {
      if (rule.pattern.test(filePath)) {
        findings.push(Object.freeze({ code: rule.code, path: filePath }));
      }
    }
  }
  const markerPath = `resources/${DESKTOP_INTERNAL_UNSIGNED_MARKER_NAME}`;
  if (!paths.includes(markerPath)) {
    findings.push(Object.freeze({
      code: "INTERNAL_UNSIGNED_MARKER_MISSING",
      path: markerPath,
    }));
  }
  const includes = (code) => findings.some((finding) => finding.code === code);
  return Object.freeze({
    valid: findings.length === 0,
    file_count: paths.length,
    finding_count: findings.length,
    forbidden_path_count: findings.filter(({ code }) => code !== "INTERNAL_UNSIGNED_MARKER_MISSING").length,
    findings: Object.freeze(findings),
    bundled_local_api: includes("LOCAL_API_RUNTIME_INCLUDED"),
    roster_included: includes("PRIVATE_ROSTER_INCLUDED"),
    contacts_included: includes("PRIVATE_CONTACTS_INCLUDED"),
    photos_included: includes("PRIVATE_PHOTOS_INCLUDED"),
    registration_seed_included: includes("REGISTRATION_SEED_INCLUDED"),
    credential_file_included: includes("CREDENTIAL_FILE_INCLUDED"),
    private_key_file_included: includes("PRIVATE_KEY_FILE_INCLUDED"),
    opaque_asar_included: includes("OPAQUE_ASAR_NOT_SCANNABLE"),
  });
}

export function assertInternalUnsignedPackagePaths(filePaths) {
  const audit = auditInternalUnsignedPackagePaths(filePaths);
  assert.deepEqual(
    audit.findings,
    [],
    `internal-unsigned package contains forbidden paths: ${audit.findings.map(({ code, path: filePath }) => `${code}:${filePath}`).join(", ")}`,
  );
  return audit;
}

export async function listInternalUnsignedPackageFiles(rootPath) {
  const files = [];
  async function visit(currentPath) {
    for (const entry of await readdir(currentPath, { withFileTypes: true })) {
      const absolutePath = path.join(currentPath, entry.name);
      const stat = await lstat(absolutePath);
      assert.equal(stat.isSymbolicLink(), false, "internal-unsigned package cannot contain symbolic links");
      if (stat.isDirectory()) {
        await visit(absolutePath);
      } else {
        assert.equal(stat.isFile(), true, "internal-unsigned package entries must be regular files");
        files.push(path.relative(rootPath, absolutePath).split(path.sep).join("/"));
      }
    }
  }
  await visit(rootPath);
  return Object.freeze(files.sort());
}

async function sha256File(filePath) {
  const digest = createHash("sha256");
  for await (const chunk of createReadStream(filePath)) digest.update(chunk);
  return digest.digest("hex");
}

async function listAbsoluteRegularFiles(rootPath, label) {
  const rootStat = await lstat(rootPath);
  assert.equal(rootStat.isSymbolicLink(), false, `${label} cannot be a symbolic link`);
  if (rootStat.isFile()) return [rootPath];
  assert.equal(rootStat.isDirectory(), true, `${label} must be a regular file or directory`);
  const files = [];
  async function visit(currentPath) {
    for (const entry of await readdir(currentPath, { withFileTypes: true })) {
      const absolutePath = path.join(currentPath, entry.name);
      const entryStat = await lstat(absolutePath);
      assert.equal(entryStat.isSymbolicLink(), false, `${label} cannot contain symbolic links`);
      if (entryStat.isDirectory()) {
        await visit(absolutePath);
      } else {
        assert.equal(entryStat.isFile(), true, `${label} entries must be regular files`);
        files.push(absolutePath);
      }
    }
  }
  await visit(rootPath);
  return files.sort();
}

export async function assertInternalUnsignedPackage({
  rootPath,
  privateSourcePaths = {},
} = {}) {
  const packageRoot = path.resolve(String(rootPath ?? ""));
  assert.ok(rootPath && existsSync(packageRoot), "internal-unsigned package root is required");
  const unexpectedSourceKinds = Object.keys(privateSourcePaths)
    .filter((kind) => !PRIVATE_SOURCE_KINDS.includes(kind));
  assert.deepEqual(unexpectedSourceKinds, [], "private source kinds must use the closed schema");

  const packagePaths = await listInternalUnsignedPackageFiles(packageRoot);
  const pathAudit = assertInternalUnsignedPackagePaths(packagePaths);
  const privateSourceDigests = new Map();
  let privateSourceFileCount = 0;
  for (const kind of PRIVATE_SOURCE_KINDS) {
    const sourcePath = privateSourcePaths[kind];
    if (sourcePath == null || sourcePath === "") continue;
    const absoluteSourcePath = path.resolve(String(sourcePath));
    assert.equal(path.isAbsolute(String(sourcePath)), true, `${kind} private source path must be absolute`);
    if (!existsSync(absoluteSourcePath)) continue;
    for (const filePath of await listAbsoluteRegularFiles(absoluteSourcePath, `${kind} private source`)) {
      const fileStat = await lstat(filePath);
      const digestKey = `${fileStat.size}:${await sha256File(filePath)}`;
      const kinds = privateSourceDigests.get(digestKey) ?? new Set();
      kinds.add(kind);
      privateSourceDigests.set(digestKey, kinds);
      privateSourceFileCount += 1;
    }
  }

  const contentMatches = [];
  for (const relativePath of packagePaths) {
    const filePath = path.join(packageRoot, ...relativePath.split("/"));
    const fileStat = await lstat(filePath);
    const digestKey = `${fileStat.size}:${await sha256File(filePath)}`;
    for (const sourceKind of privateSourceDigests.get(digestKey) ?? []) {
      contentMatches.push(Object.freeze({
        code: "PRIVATE_SOURCE_BYTES_INCLUDED",
        path: relativePath,
        source_kind: sourceKind,
      }));
    }
  }
  assert.deepEqual(
    contentMatches,
    [],
    `internal-unsigned package contains renamed private source bytes: ${contentMatches.map(({ path: relativePath, source_kind: sourceKind }) => `${sourceKind}:${relativePath}`).join(", ")}`,
  );
  return Object.freeze({
    ...pathAudit,
    private_source_file_count: privateSourceFileCount,
    private_source_digest_count: privateSourceDigests.size,
    private_source_content_match_count: 0,
    private_source_content_scan: "verified",
  });
}
