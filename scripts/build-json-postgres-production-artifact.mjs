#!/usr/bin/env node
import { createHash } from "node:crypto";
import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  statSync,
  lutimesSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import {
  assertPrivateStagingGitBlobMaterialization,
  validateRdsCaBundle,
} from "./lib/private-staging-artifact.mjs";
import {
  JSON_POSTGRES_PRODUCTION_ARTIFACT_SCHEMA,
  JSON_POSTGRES_PRODUCTION_REDACTION_TARGETS,
  JSON_POSTGRES_PRODUCTION_SOURCE_OVERRIDES,
  emptyJsonPostgresProductionSources,
  parseJsonPostgresProductionGitTree,
  redactJsonPostgresProductionRuntimeSource,
  validateJsonPostgresProductionArtifactEntries,
  validateJsonPostgresProductionDeploymentManifest,
  validateJsonPostgresProductionSourceBoundary,
  validateJsonPostgresProductionSourceOverrides,
} from "./lib/json-postgres-production-artifact.mjs";

const RDS_CA_URL = "https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem";

function option(name, fallback = null) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1];
}

function required(value, name) {
  const text = String(value ?? "").trim();
  if (!text) throw new Error(`${name} is required`);
  return text;
}

function git(...args) {
  return execFileSync("git", args, {
    cwd: process.cwd(),
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  }).trim();
}

function gitBytes(...args) {
  return execFileSync("git", args, {
    cwd: process.cwd(),
    encoding: null,
    maxBuffer: 64 * 1024 * 1024,
  });
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function deterministicArchiveEntries(root, timestamp) {
  const files = [];
  function visit(relativePath = "") {
    const directory = join(root, relativePath);
    for (const entry of readdirSync(directory, { withFileTypes: true })
      .sort((left, right) => left.name.localeCompare(right.name, "en"))) {
      const path = relativePath ? join(relativePath, entry.name) : entry.name;
      const absolute = join(root, path);
      if (entry.isDirectory()) {
        utimesSync(absolute, timestamp, timestamp);
        visit(path);
      } else {
        if (entry.isSymbolicLink()) lutimesSync(absolute, timestamp, timestamp);
        else utimesSync(absolute, timestamp, timestamp);
        files.push(path.replaceAll("\\", "/"));
      }
    }
  }
  visit();
  return files.sort();
}

function outsideRepository(path, label) {
  const root = realpathSync(process.cwd());
  const targetInput = resolve(required(path, label));
  if (existsSync(targetInput) && lstatSync(targetInput).isSymbolicLink()) {
    throw new Error(`${label} must not be a symlink`);
  }
  let existingParent = targetInput;
  while (!existsSync(existingParent)) existingParent = dirname(existingParent);
  const target = resolve(realpathSync(existingParent), relative(existingParent, targetInput));
  if (target === root || relative(root, target).split(/[\\/]/u)[0] !== "..") {
    throw new Error(`${label} must remain outside the repository worktree`);
  }
  return target;
}

function providedCaBundlePath(path) {
  const target = outsideRepository(path, "provided RDS CA bundle");
  if (!existsSync(target)
    || lstatSync(target).isSymbolicLink()
    || !statSync(target).isFile()) {
    throw new Error("provided RDS CA bundle must be an existing regular non-symlink file");
  }
  return realpathSync(target);
}

const nodeMajor = Number(process.versions.node.split(".")[0]);
if (nodeMajor !== 22) throw new Error("production artifact must be built with Node.js 22");
const sourceSha = git("rev-parse", "HEAD");
const sourceTree = git("rev-parse", "HEAD^{tree}");
if (sourceSha !== required(option("--source-sha", sourceSha), "--source-sha")
  || sourceTree !== required(option("--source-tree", sourceTree), "--source-tree")) {
  throw new Error("production artifact source SHA/tree drifted");
}
if (git("status", "--porcelain=v1", "--untracked-files=all")) {
  throw new Error("production artifact build requires a clean exact-head worktree");
}
const outputDir = outsideRepository(option("--output-dir"), "--output-dir");
const providedCaPath = option("--rds-ca-bundle")
  ? providedCaBundlePath(option("--rds-ca-bundle"))
  : null;
mkdirSync(outputDir, { recursive: true, mode: 0o700 });
chmodSync(outputDir, 0o700);
const stagingRoot = mkdtempSync(join(tmpdir(), "lawos-production-artifact-"));

try {
  const tracked = parseJsonPostgresProductionGitTree(
    gitBytes("ls-tree", "-rz", "--full-tree", sourceSha),
  );
  for (const entry of tracked) {
    const targetPath = join(stagingRoot, entry.path);
    mkdirSync(dirname(targetPath), { recursive: true });
    const exactBlobBytes = gitBytes("cat-file", "blob", entry.oid);
    writeFileSync(targetPath, exactBlobBytes, {
      mode: entry.mode === "100755" ? 0o755 : 0o644,
    });
    assertPrivateStagingGitBlobMaterialization(
      entry,
      exactBlobBytes,
      readFileSync(targetPath),
    );
  }

  const emptySources = emptyJsonPostgresProductionSources();
  for (const [targetPath, value] of [
    ["apps/api/src/matter-vault-user-registration-seed.json", emptySources.account_seed],
    ["apps/api/src/hrx-member-roster-source-of-truth.json", emptySources.roster],
  ]) {
    const absoluteTarget = join(stagingRoot, targetPath);
    mkdirSync(dirname(absoluteTarget), { recursive: true });
    writeFileSync(absoluteTarget, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o644 });
  }

  const sourceOverrides = JSON_POSTGRES_PRODUCTION_SOURCE_OVERRIDES.map((override) => {
    const bytes = readFileSync(join(stagingRoot, override.source_path));
    const targetPath = join(stagingRoot, override.target_path);
    mkdirSync(dirname(targetPath), { recursive: true });
    writeFileSync(targetPath, bytes, { mode: 0o644 });
    return {
      ...override,
      sha256: sha256(bytes),
      byte_size: bytes.byteLength,
      text: bytes.toString("utf8"),
    };
  });
  const overrideValidation =
    validateJsonPostgresProductionSourceOverrides(sourceOverrides);

  const sourceRedactions = JSON_POSTGRES_PRODUCTION_REDACTION_TARGETS.map((targetPath) => {
    const absoluteTarget = join(stagingRoot, targetPath);
    const redacted = redactJsonPostgresProductionRuntimeSource({
      targetPath,
      text: readFileSync(absoluteTarget, "utf8"),
    });
    writeFileSync(absoluteTarget, redacted.text, { mode: 0o644 });
    return {
      target_path: targetPath,
      purpose: redacted.purpose,
      sha256: sha256(Buffer.from(redacted.text)),
      byte_size: redacted.byte_size,
    };
  });

  const sourceBoundary = validateJsonPostgresProductionSourceBoundary(
    tracked
      .map((entry) => entry.path)
      .filter((path) => !/\.(?:png|jpg|jpeg|webp)$/iu.test(path))
      .map((path) => ({
        path,
        text: readFileSync(join(stagingRoot, path), "utf8"),
      })),
  );

  const caBytes = providedCaPath
    ? readFileSync(providedCaPath)
    : await (async () => {
      const response = await fetch(RDS_CA_URL, {
        signal: AbortSignal.timeout(30_000),
      });
      if (!response.ok) {
        throw new Error(`RDS CA bundle fetch failed: HTTP ${response.status}`);
      }
      return Buffer.from(await response.arrayBuffer());
    })();
  const ca = validateRdsCaBundle(caBytes);
  const caPath = join(stagingRoot, "certs/global-bundle.pem");
  mkdirSync(dirname(caPath), { recursive: true });
  writeFileSync(caPath, caBytes, { mode: 0o644 });

  const npmVersion = execFileSync("npm", ["--version"], { encoding: "utf8" }).trim();
  execFileSync(
    "npm",
    ["ci", "--omit=dev", "--ignore-scripts", "--no-audit", "--no-fund"],
    {
      cwd: stagingRoot,
      env: { ...process.env, NODE_ENV: "production" },
      stdio: ["ignore", "ignore", "inherit"],
    },
  );
  const sourceTimestamp = new Date(
    Number(git("show", "-s", "--format=%ct", sourceSha)) * 1000,
  );
  const deploymentManifest = {
    schema_version: JSON_POSTGRES_PRODUCTION_ARTIFACT_SCHEMA,
    source_sha: sourceSha,
    source_tree: sourceTree,
    source_timestamp: sourceTimestamp.toISOString(),
    runtime: `nodejs${nodeMajor}.x`,
    node_version: process.versions.node,
    npm_version: npmVersion,
    dependency_lock_sha256: sha256(
      readFileSync(join(stagingRoot, "package-lock.json")),
    ),
    rds_ca_bundle: {
      source: RDS_CA_URL,
      retrieval_mode: "validated-truststore-bytes",
      sha256: sha256(caBytes),
      byte_size: ca.byte_size,
      certificate_count: ca.certificate_count,
    },
    source_overrides: sourceOverrides.map(({ text: _text, ...override }) => override),
    source_override_count: overrideValidation.override_count,
    source_redactions: sourceRedactions,
    source_redaction_count: sourceRedactions.length,
    scanned_source_count: sourceBoundary.scanned_source_count,
    packaged_real_identity_count: 0,
    packaged_real_client_count: overrideValidation.packaged_real_client_count,
    packaged_static_role_assignment_count:
      overrideValidation.packaged_static_role_assignment_count,
    packaged_account_seed_count: 0,
    packaged_roster_count: 0,
    data_scope: "approved-immutable-inputs-only",
    operational_authority: "postgres-v2",
    json_fallback: false,
    json_writer: false,
    dual_write: false,
    file_current_authority: false,
    offline_mutation: false,
    memory_fallback: false,
    secrets_in_environment: false,
    production_ready_claim: false,
  };
  validateJsonPostgresProductionDeploymentManifest(deploymentManifest);
  writeFileSync(
    join(stagingRoot, "deployment-manifest.json"),
    `${JSON.stringify(deploymentManifest, null, 2)}\n`,
    { mode: 0o644 },
  );

  const archiveFilename = `lawos-production-${sourceSha}.zip`;
  const manifestFilename = `lawos-production-${sourceSha}.manifest.json`;
  const archivePath = join(outputDir, archiveFilename);
  const manifestPath = join(outputDir, manifestFilename);
  if (existsSync(archivePath) || existsSync(manifestPath)) {
    throw new Error("production artifact output already exists");
  }
  const deterministicEntries = deterministicArchiveEntries(stagingRoot, sourceTimestamp);
  execFileSync("zip", ["-X", "-q", archivePath, "-@"], {
    cwd: stagingRoot,
    input: `${deterministicEntries.join("\n")}\n`,
  });
  chmodSync(archivePath, 0o600);
  const entries = execFileSync("unzip", ["-Z1", archivePath], {
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  }).trim().split("\n").filter((entry) => entry && !entry.endsWith("/"));
  const validatedEntries = validateJsonPostgresProductionArtifactEntries(entries);
  const archiveBytes = readFileSync(archivePath);
  if (archiveBytes.byteLength > 50 * 1024 * 1024) {
    throw new Error("production artifact exceeds the direct Lambda archive limit");
  }
  const archiveSha = sha256(archiveBytes);
  const outerManifest = {
    ...deploymentManifest,
    artifact_filename: archiveFilename,
    artifact_sha256: archiveSha,
    artifact_byte_size: archiveBytes.byteLength,
    artifact_entry_count: validatedEntries.entry_count,
    artifact_entries_sha256: sha256(
      Buffer.from(`${entries.sort().join("\n")}\n`),
    ),
    artifact_runtime_store_entry_count: 0,
    artifact_real_json_store_count: 0,
    artifact_private_staging_entry_count: 0,
    artifact_s3_key: `lawos-production/${sourceSha}/${archiveSha}.zip`,
    manifest_canonical_sha256: "",
  };
  outerManifest.manifest_canonical_sha256 = sha256(
    Buffer.from(stableJson({
      ...outerManifest,
      manifest_canonical_sha256: "",
    })),
  );
  writeFileSync(
    manifestPath,
    `${JSON.stringify(outerManifest, null, 2)}\n`,
    { mode: 0o600 },
  );
  chmodSync(manifestPath, 0o600);
  process.stdout.write(`${JSON.stringify({
    verdict: "PASS",
    source_sha: sourceSha,
    source_tree: sourceTree,
    artifact_sha256: archiveSha,
    artifact_byte_size: archiveBytes.byteLength,
    artifact_entry_count: validatedEntries.entry_count,
    artifact_path: archivePath,
    manifest_path: manifestPath,
    artifact_s3_key: outerManifest.artifact_s3_key,
    packaged_real_identity_count: 0,
    packaged_real_client_count: 0,
    packaged_static_role_assignment_count: 0,
    legacy_authority_counter_total: 0,
    secret_material_recorded: false,
    upload_executed: false,
  }, null, 2)}\n`);
} finally {
  rmSync(stagingRoot, { recursive: true, force: true });
}
