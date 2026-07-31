#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DERIVED_STORE_PATH_MANIFEST, STORE_PATH_MANIFEST } from "../apps/api/src/store-path-manifest.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const JSON_STORE_ADAPTERS = Object.freeze({
  hrxStorePath: "packages/hrx/src/store/file-store.js",
  masterDataStorePath: "packages/master-data/src/repository.js",
  matterStorePath: "packages/matter/src/repository.js",
  dmsStorePath: "packages/dms/src/repository.js",
  crmStorePath: "packages/crm/src/runtime-repository.js",
  intakeStorePath: "packages/intake/src/runtime-repository.js",
  crmMasterDataStorePath: "packages/master-data/src/repository.js",
  financeStorePath: "packages/billing/src/finance-repository.js",
  analyticsStorePath: "packages/analytics/src/runtime-repository.js",
  aiStorePath: "packages/ai-governance/src/runtime-repository.js",
  portalStorePath: "packages/client-portal/src/runtime-repository.js",
  uiReadinessStorePath: "packages/platform/src/ui-readiness-repository.js",
  enterpriseReadinessStorePath: "packages/enterprise/src/enterprise-readiness-repository.js",
  authCredentialStorePath: "apps/api/src/auth-credential-store.js",
  authPasswordResetStorePath: "apps/api/src/auth-password-reset-store.js",
});

const TRUST_STORE_ADAPTERS = Object.freeze({
  objectAclStorePath: "packages/authz/src/object-acl-store.js",
});

const ALLOWED_DIRECT_WRITERS = Object.freeze({
  "apps/api/src/lambda.js": "administrative_artifacts_only_after_authority_pattern_check",
  "apps/api/src/local-durable-store-paths.js": "local_secret_material_0600",
  "packages/authz/src/trust-runtime-store.js": "file_current_object_acl_authority",
  "packages/persistence/src/connection.js": "synthetic_persistence_connection",
  "packages/persistence/src/durable-file.js": "common_durable_writer_primitive",
  "packages/persistence/src/s3-backup-queue.js": "backup_queue_artifact_primitive",
});

function absolute(path) {
  return join(ROOT, path);
}

function read(path) {
  return readFileSync(absolute(path), "utf8");
}

function sourceFilesUnder(path) {
  const output = [];
  const visit = (current) => {
    for (const name of readdirSync(current)) {
      const fullPath = join(current, name);
      if (["node_modules", "dist", "test", "tests"].includes(name)) continue;
      const stat = statSync(fullPath);
      if (stat.isDirectory()) visit(fullPath);
      else if (/\.(?:js|mjs)$/u.test(name) && !/\.test\./u.test(name)) {
        output.push(relative(ROOT, fullPath).replaceAll("\\", "/"));
      }
    }
  };
  visit(absolute(path));
  return output.sort();
}

function discoverDirectWriters() {
  const writerCall = /\b(?:writeFileSync|appendFileSync|renameSync|writeFile|appendFile|rename)\s*\(/u;
  return [...sourceFilesUnder("apps/api/src"), ...sourceFilesUnder("packages")]
    .filter((path) => /node:fs(?:\/promises)?/u.test(read(path)) && writerCall.test(read(path)))
    .sort();
}

function validateManifestAdapters() {
  const securityAudit = STORE_PATH_MANIFEST.find((entry) => entry.key === "securityAuditStorePath");
  assert.ok(securityAudit, "security audit manifest path is missing");
  const sessionAuth = read("apps/api/src/session-auth.js");
  assert.match(sessionAuth, /appendNdjsonDurably/u, "security audit store has not adopted the durable append helper");
  assert.doesNotMatch(sessionAuth, /appendFileSync\s*\(/u, "security audit store still appends directly");

  const covered = [];
  for (const [key, sourcePath] of Object.entries(JSON_STORE_ADAPTERS)) {
    assert.ok(STORE_PATH_MANIFEST.some((entry) => entry.key === key), `unknown manifest key ${key}`);
    const source = read(sourcePath);
    assert.match(source, /createDurableJsonStateController/u, `${key} has not adopted generation-controlled persistence`);
    assert.doesNotMatch(source, /writeJsonFileDurably/u, `${key} still uses the legacy writer`);
    covered.push(key);
  }
  for (const [key, sourcePath] of Object.entries(
    TRUST_STORE_ADAPTERS,
  )) {
    assert.ok(
      STORE_PATH_MANIFEST.some((entry) => entry.key === key),
      `unknown manifest key ${key}`,
    );
    assert.match(
      read(sourcePath),
      /createTrustRuntimeStore/u,
      `${key} is not backed by the canonical trust store`,
    );
    covered.push(key);
  }
  covered.push(securityAudit.key);
  assert.equal(new Set(covered).size, STORE_PATH_MANIFEST.length, "manifest path coverage is incomplete");
  return covered;
}

function validateDmsBytes() {
  assert.equal(DERIVED_STORE_PATH_MANIFEST.some((entry) => entry.key === "dmsObjectStorePath"), true);
  const source = read("packages/dms/src/storage/file-storage-adapter.js");
  assert.match(source, /writeBinaryFileDurably/u, "DMS bytes have not adopted the durable byte writer");
  assert.doesNotMatch(source, /writeFileSync\s*\(/u, "DMS bytes still write directly");
}

function validateLambdaAuthorityWrites() {
  const source = read("apps/api/src/lambda.js");
  assert.match(source, /writeDurableJsonFile/u, "Lambda administrative JSON writers do not use the durable writer");
  assert.match(source, /appendNdjsonDurably/u, "Lambda administrative audit writers do not use the durable append helper");
  const forbidden = [
    /await\s+writeFile\(resolvedPath\s*,/gu,
    /await\s+appendFile\(resolvedPath\s*,/gu,
    /await\s+writeFile\(finance\.resolvedPath\s*,/gu,
    /await\s+writeFile\(analytics\.resolvedPath\s*,/gu,
    /await\s+writeFile\(storePath\s*,/gu,
  ].flatMap((pattern) => [...source.matchAll(pattern)].map((match) => match[0]));
  assert.deepEqual(forbidden, [], `Lambda retains direct authority writes: ${forbidden.join(", ")}`);
}

function validateAllowedDirectWriters() {
  const discovered = discoverDirectWriters();
  const unexpected = discovered.filter((path) => !Object.hasOwn(ALLOWED_DIRECT_WRITERS, path));
  assert.deepEqual(unexpected, [], `unclassified direct filesystem writers: ${unexpected.join(", ")}`);

  const localSecrets = read("apps/api/src/local-durable-store-paths.js");
  assert.match(localSecrets, /mode:\s*0o600/u, "local secret material is not created with mode 0600");
  const syntheticConnection = read("packages/persistence/src/connection.js");
  assert.match(syntheticConnection, /lawos-synthetic-persistence-connection/u);
  const optionalTrustStore = read("packages/authz/src/trust-runtime-store.js");
  assert.match(optionalTrustStore, /filePath/u);
  return discovered;
}

function validateNoLegacyConsumers() {
  const consumers = [...sourceFilesUnder("apps/api/src"), ...sourceFilesUnder("packages")]
    .filter((path) => path !== "packages/persistence/src/durable-file.js")
    .filter((path) => read(path).includes("writeJsonFileDurably"));
  assert.deepEqual(consumers, [], `legacy durable writer consumers remain: ${consumers.join(", ")}`);
}

try {
  const coveredManifestKeys = validateManifestAdapters();
  validateDmsBytes();
  validateLambdaAuthorityWrites();
  const directWriters = validateAllowedDirectWriters();
  validateNoLegacyConsumers();
  console.log(JSON.stringify({
    verdict: "PASS",
    validator: "runtime-store-writer-coverage",
    manifest_path_count: STORE_PATH_MANIFEST.length,
    manifest_path_covered_count: coveredManifestKeys.length,
    derived_dms_bytes_covered: true,
    direct_writer_file_count: directWriters.length,
    allowed_direct_writer_file_count: directWriters.length,
    unclassified_direct_writer_file_count: 0,
    operational_direct_authority_write_count: 0,
    production_ready_claim: false,
    go_live_claim: false,
  }, null, 2));
} catch (error) {
  console.error(error?.stack || error?.message || String(error));
  process.exit(1);
}
