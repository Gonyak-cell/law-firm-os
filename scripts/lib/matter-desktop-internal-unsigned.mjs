import assert from "node:assert/strict";
import { createHash, createPublicKey } from "node:crypto";
import { createReadStream, existsSync } from "node:fs";
import { lstat, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import {
  DESKTOP_INTERNAL_UNSIGNED_MARKER_NAME,
} from "./matter-desktop-provenance.mjs";

export const INTERNAL_UNSIGNED_UPDATE_TRUST_FILENAME =
  "matter-internal-update-trust.json";
export const INTERNAL_UNSIGNED_UPDATE_TRUST_SCHEMA =
  "law-firm-os.matter-desktop-internal-update-trust.v1";
export const INTERNAL_UNSIGNED_UPDATE_KEY_ID = "matter-internal-update-key-v1";

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

const PRIVATE_SOURCE_TEXT_FIELDS = Object.freeze({
  contact: Object.freeze([
    "display_name", "email", "employee_id", "legal_name", "mobile", "phone",
    "telephone", "tenant_id", "user_id", "work_email",
  ]),
  registrationSeed: Object.freeze([
    "display_name", "email", "english_name", "tenant_id", "user_id",
  ]),
  roster: Object.freeze([
    "display_name", "employee_id", "legal_name", "manager_employee_id",
    "tenant_id", "user_id", "work_email",
  ]),
});
const MAX_PRIVATE_SOURCE_JSON_BYTES = 5 * 1024 * 1024;

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

export function createInternalUnsignedUpdateTrustManifest(env = process.env) {
  const encoded = String(
    env.MATTER_INTERNAL_UPDATE_PUBLIC_KEY_SPKI_BASE64 ?? "",
  ).trim();
  const der = Buffer.from(encoded, "base64");
  assert.ok(
    der.byteLength > 0 && der.byteLength <= 4096 && der.toString("base64") === encoded,
    "internal-unsigned build requires a canonical Ed25519 public-key SPKI",
  );
  let publicKey;
  try {
    publicKey = createPublicKey({ key: der, format: "der", type: "spki" });
  } catch {
    assert.fail("internal-unsigned build requires a valid Ed25519 public-key SPKI");
  }
  assert.equal(
    publicKey.asymmetricKeyType,
    "ed25519",
    "internal-unsigned update trust key must be Ed25519",
  );
  return Object.freeze({
    schema_version: INTERNAL_UNSIGNED_UPDATE_TRUST_SCHEMA,
    key_id: INTERNAL_UNSIGNED_UPDATE_KEY_ID,
    public_key_spki_base64: encoded,
    private_key_material_included: false,
    public_release_allowed: false,
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
  const trustPath = `resources/${INTERNAL_UNSIGNED_UPDATE_TRUST_FILENAME}`;
  if (!paths.includes(markerPath)) {
    findings.push(Object.freeze({
      code: "INTERNAL_UNSIGNED_MARKER_MISSING",
      path: markerPath,
    }));
  }
  if (!paths.includes(trustPath)) {
    findings.push(Object.freeze({
      code: "INTERNAL_UPDATE_TRUST_MISSING",
      path: trustPath,
    }));
  }
  const includes = (code) => findings.some((finding) => finding.code === code);
  return Object.freeze({
    valid: findings.length === 0,
    file_count: paths.length,
    finding_count: findings.length,
    forbidden_path_count: findings.filter(({ code }) => ![
      "INTERNAL_UNSIGNED_MARKER_MISSING",
      "INTERNAL_UPDATE_TRUST_MISSING",
    ].includes(code)).length,
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

function collectPrivateTextValues(value, fieldNames, values) {
  if (Array.isArray(value)) {
    for (const item of value) collectPrivateTextValues(item, fieldNames, values);
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [field, item] of Object.entries(value)) {
    if (fieldNames.has(field) && typeof item === "string" && item.trim().length >= 4) {
      values.add(item.trim());
    }
    collectPrivateTextValues(item, fieldNames, values);
  }
}

async function privateSourceTextPatterns(privateSourcePaths) {
  const patterns = new Map();
  for (const [kind, fields] of Object.entries(PRIVATE_SOURCE_TEXT_FIELDS)) {
    const sourcePath = privateSourcePaths[kind];
    if (sourcePath == null || sourcePath === "") continue;
    const absoluteSourcePath = path.resolve(String(sourcePath));
    if (!existsSync(absoluteSourcePath)) continue;
    const values = new Set();
    let jsonFileCount = 0;
    for (const filePath of await listAbsoluteRegularFiles(absoluteSourcePath, `${kind} private source`)) {
      if (path.extname(filePath).toLowerCase() !== ".json") continue;
      jsonFileCount += 1;
      const fileStat = await lstat(filePath);
      assert.ok(
        fileStat.size > 0 && fileStat.size <= MAX_PRIVATE_SOURCE_JSON_BYTES,
        `${kind} private source JSON exceeds the bounded value-scan size`,
      );
      let parsed;
      try {
        parsed = JSON.parse(await readFile(filePath, "utf8"));
      } catch {
        assert.fail(`${kind} private source must contain valid JSON`);
      }
      collectPrivateTextValues(parsed, new Set(fields), values);
    }
    assert.ok(jsonFileCount > 0, `${kind} private source requires a JSON value-scan input`);
    assert.ok(values.size > 0, `${kind} private source exposes no protected values`);
    for (const value of values) {
      const kinds = patterns.get(value) ?? new Set();
      kinds.add(kind);
      patterns.set(value, kinds);
    }
  }
  return patterns;
}

async function findPrivateSourceValueMatches(packageRoot, packagePaths, protectedValues) {
  if (protectedValues.size === 0) return [];
  const patterns = [...protectedValues.entries()].map(([value, kinds]) => Object.freeze({
    bytes: Buffer.from(value, "utf8"),
    kinds: Object.freeze([...kinds].sort()),
  }));
  const carryBytes = Math.max(...patterns.map(({ bytes }) => bytes.byteLength)) - 1;
  const findings = [];
  for (const relativePath of packagePaths) {
    const matched = new Set();
    let carry = Buffer.alloc(0);
    for await (const rawChunk of createReadStream(path.join(packageRoot, ...relativePath.split("/")))) {
      const chunk = Buffer.isBuffer(rawChunk) ? rawChunk : Buffer.from(rawChunk);
      const window = carry.byteLength === 0 ? chunk : Buffer.concat([carry, chunk]);
      for (let index = 0; index < patterns.length; index += 1) {
        if (!matched.has(index) && window.indexOf(patterns[index].bytes) !== -1) matched.add(index);
      }
      carry = carryBytes > 0
        ? Buffer.from(window.subarray(Math.max(0, window.byteLength - carryBytes)))
        : Buffer.alloc(0);
    }
    if (matched.size > 0) {
      findings.push(Object.freeze({
        code: "PRIVATE_SOURCE_VALUE_INCLUDED",
        path: relativePath,
        protected_value_match_count: matched.size,
        source_kinds: Object.freeze([
          ...new Set([...matched].flatMap((index) => patterns[index].kinds)),
        ].sort()),
      }));
    }
  }
  return findings;
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
  const protectedValues = await privateSourceTextPatterns(privateSourcePaths);
  const valueMatches = await findPrivateSourceValueMatches(
    packageRoot,
    packagePaths,
    protectedValues,
  );
  assert.deepEqual(
    valueMatches,
    [],
    `internal-unsigned package contains protected source values: ${valueMatches.map(({ path: relativePath, protected_value_match_count: count, source_kinds: kinds }) => `${kinds.join("+")}:${relativePath}:${count}`).join(", ")}`,
  );
  return Object.freeze({
    ...pathAudit,
    private_source_file_count: privateSourceFileCount,
    private_source_digest_count: privateSourceDigests.size,
    private_source_content_match_count: 0,
    private_source_content_scan: "verified",
    private_source_protected_value_count: protectedValues.size,
    private_source_value_match_count: 0,
    private_source_value_scan: "verified",
  });
}
