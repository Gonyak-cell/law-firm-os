#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const errors = [];

function add(message) {
  errors.push(message);
}

function read(file) {
  return readFileSync(path.join(ROOT, file), "utf8");
}

function readJson(file) {
  return JSON.parse(read(file));
}

function exists(file) {
  return existsSync(path.join(ROOT, file));
}

function assert(condition, message) {
  if (!condition) add(message);
}

const smokeFile = "docs/reorganization/client-matter-os/matter-vault-r4/launch/external-production-smoke-receipt.json";
const migrationFile = "docs/reorganization/client-matter-os/matter-vault-r4/launch/production-migration-operator-receipt.json";
const remainingFile = "docs/reorganization/client-matter-os/matter-vault-r4/launch/remaining-external-receipts.md";
const manifestFile = "docs/reorganization/client-matter-os/matter-vault-r4/package-manifest.json";

for (const file of [smokeFile, migrationFile, remainingFile, manifestFile]) {
  if (!exists(file)) add(`${file}: missing`);
}

if (errors.length === 0) {
  const smoke = readJson(smokeFile);
  const migration = readJson(migrationFile);
  const manifest = readJson(manifestFile);
  const remaining = read(remainingFile);

  assert(smoke.schema_version === "law-firm-os.matter-vault-r4-external-production-smoke-receipt.v0.1", "external smoke receipt schema mismatch");
  assert(smoke.status === "blocked_missing_external_environment", "external smoke status must remain blocked_missing_external_environment");
  assert(smoke.operator_receipt_received === false, "external smoke receipt must remain false");
  assert(Array.isArray(smoke.available_environment) && smoke.available_environment.length === 0, "external smoke available environment must be empty");
  assert(Array.isArray(smoke.smoke_cases) && smoke.smoke_cases.length === 10, "external smoke must enumerate 10 smoke cases");
  assert(Array.isArray(smoke.failed_cases) && smoke.failed_cases.length === 0, "external smoke failed cases must be empty while blocked");

  assert(migration.schema_version === "law-firm-os.matter-vault-r4-production-migration-operator-receipt.v0.1", "production migration receipt schema mismatch");
  assert(migration.status === "blocked_missing_operator_environment", "production migration status must remain blocked_missing_operator_environment");
  assert(migration.operator_receipt_received === false, "production migration operator receipt must remain false");
  assert(Array.isArray(migration.available_environment) && migration.available_environment.length === 0, "production migration available environment must be empty");
  assert(Array.isArray(migration.failed_rows) && migration.failed_rows.length === 0, "production migration failed rows must be empty while blocked");

  for (const source of [
    smoke,
    migration,
    manifest,
  ]) {
    assert(source.launch_authorization_claim === false || source.launch_readiness_lane?.launch_authorization_claim === false, "launch authorization claim must remain false");
    assert(source.go_live_claim === false || source.launch_readiness_lane, "go_live_claim must remain false when present");
    assert(source.production_ready_claim === false || source.launch_readiness_lane, "production_ready_claim must remain false when present");
  }

  assert(manifest.launch_readiness_lane?.owner_release_authority_received === true, "owner release authority must remain received");
  assert(manifest.launch_readiness_lane?.external_production_smoke_receipt_received === false, "manifest external production smoke must remain false");
  assert(manifest.launch_readiness_lane?.migration_operator_receipt_received === false, "manifest migration operator receipt must remain false");
  assert(manifest.external_receipt_lane?.validator === "npm run matter-vault:r4:external-receipts:validate", "manifest external receipt validator missing");
  assert(manifest.external_receipt_lane?.external_production_smoke_status === "blocked_missing_external_environment", "manifest external smoke status mismatch");
  assert(manifest.external_receipt_lane?.production_migration_operator_status === "blocked_missing_operator_environment", "manifest production migration status mismatch");

  for (const phrase of [
    "External production smoke and production migration operator receipts are absent",
    "actual launch/go-live completed and production-ready completed claims remain false",
  ]) {
    if (!remaining.includes(phrase)) add(`${remainingFile}: missing phrase ${phrase}`);
  }
}

for (const file of [smokeFile, migrationFile, remainingFile]) {
  if (!exists(file)) continue;
  const text = read(file);
  for (const pattern of [
    /"launch_authorization_claim"\s*:\s*true/i,
    /"go_live_claim"\s*:\s*true/i,
    /"production_ready_claim"\s*:\s*true/i,
    /go-live approved/i,
    /launch approved/i,
    /production deployment approved/i,
  ]) {
    if (pattern.test(text)) add(`${file}: forbidden launch claim ${pattern.source}`);
  }
}

if (errors.length > 0) {
  console.error("Matter-Vault R4 external receipt validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Matter-Vault R4 external receipt validation passed.");
console.log("external_production_smoke_receipt_received: false");
console.log("production_migration_operator_receipt_received: false");
console.log("external_production_smoke_status: blocked_missing_external_environment");
console.log("production_migration_operator_status: blocked_missing_operator_environment");
