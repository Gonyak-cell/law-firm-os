#!/usr/bin/env node
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const goalId = "cti-s2-authentication-execute";
const closeoutDir = `docs/goal-closeout/${goalId}`;
const verdict = "BLOCKED_I8_S1_G_PROBE_CONDITIONS_UNMET_AFTER_S2_G_CODE_PASS";
const requiredFiles = [
  `${closeoutDir}/packet.json`,
  `${closeoutDir}/command-evidence.json`,
  `${closeoutDir}/construction-inspection.json`,
  `${closeoutDir}/claude-review-result.json`,
  `${closeoutDir}/adjudication.md`,
  "docs/launch/cti-s2-authentication-execute-crosswalk-2026-07-06.json",
  "docs/launch/cti-s2-authentication-execute-crosswalk-2026-07-06.md",
  "workbook/launch-tuw/launch-tuw-ledger.json",
  "workbook/launch-tuw/10_PRE.md",
];

function readText(path) {
  assert.equal(existsSync(path), true, `Missing required file: ${path}`);
  return readFileSync(path, "utf8");
}

function readJson(path) {
  return JSON.parse(readText(path));
}

for (const file of requiredFiles) readText(file);

const packet = readJson(`${closeoutDir}/packet.json`);
const commandEvidence = readJson(`${closeoutDir}/command-evidence.json`);
const construction = readJson(`${closeoutDir}/construction-inspection.json`);
const claudeReview = readJson(`${closeoutDir}/claude-review-result.json`);
const crosswalk = readJson("docs/launch/cti-s2-authentication-execute-crosswalk-2026-07-06.json");
const ledger = readJson("workbook/launch-tuw/launch-tuw-ledger.json");
const preMd = readText("workbook/launch-tuw/10_PRE.md");
const credentialStore = readText("apps/api/src/auth-credential-store.js");
const sessionAuth = readText("apps/api/src/session-auth.js");
const desktopAuth = readText("apps/desktop/src/main/auth.js");
const desktopRuntime = readText("apps/api/src/matter-temp-desktop-runtime-lambda.mjs");
const storeManifest = readText("apps/api/src/store-path-manifest.js");
const server = readText("apps/api/src/server.js");
const catalog = readText("docs/runbooks/store-env-catalog.md");
const packageJson = readJson("package.json");
const desktopPackageJson = readJson("apps/desktop/package.json");

assert.equal(packet.goal_id, goalId);
assert.equal(packet.closeout_verdict, verdict);
assert.equal(packet.s2_g.status, "PASS_CODE_AND_LOCAL_STAGING_SYNTHETIC_FIXTURES");
assert.equal(packet.s2_g.production_deployment_executed, false);
assert.equal(packet.s2_g.production_credential_store_write_executed, false);
assert.equal(packet.implemented_surfaces.auth_provider.provider_id, "lawos-internal-password-provider-v1");
assert.equal(packet.implemented_surfaces.auth_provider.hash_algorithm, "node:crypto.scrypt");
assert.equal(packet.implemented_surfaces.login_cut_path.operational_synthetic_token_rejected, true);
assert.equal(packet.implemented_surfaces.verify_token_replacement.credential_rev_mismatch_rejected, true);
assert.equal(packet.implemented_surfaces.desktop_v0_1_10_password_flow.root_package_version, "0.1.10");
assert.equal(packet.implemented_surfaces.desktop_v0_1_10_password_flow.desktop_package_version, "0.1.10");
assert.equal(packet.i8_s1_g_authenticated_probe.status, "BLOCKED_CONDITIONS_UNMET");
assert.equal(packet.i8_s1_g_authenticated_probe.executed, false);
assert.equal(packet.i8_s1_g_authenticated_probe.debug_endpoint_used, false);
assert.equal(packet.i8_s1_g_authenticated_probe.direct_token_mint_used, false);
assert.equal(packet.i8_s1_g_authenticated_probe.secret_value_lookup_or_output_used, false);
assert.equal(packet.i8_s1_g_authenticated_probe.temporary_backdoor_principal_used, false);

for (const [key, value] of Object.entries(packet.authority_boundary)) {
  if (["s2_code_implemented", "local_staging_synthetic_tests_executed"].includes(key)) {
    assert.equal(value, true, `authority boundary ${key} should be true`);
  } else {
    assert.equal(value, false, `authority boundary ${key} should be false`);
  }
}

assert.equal(commandEvidence.goal_id, goalId);
assert.equal(commandEvidence.secret_values_recorded, false);
assert.equal(commandEvidence.plaintext_passwords_recorded, false);
assert.equal(commandEvidence.token_material_recorded, false);
assert.equal(commandEvidence.commands_run.every((entry) => entry.exit_code === 0), true);
for (const requiredCommand of [
  "node --test apps/api/test/session-auth-api.test.js",
  "node --test apps/api/test/matter-temp-desktop-runtime-lambda.test.js",
  "node scripts/validate-store-path-preflight.mjs",
  "node workbook/launch-tuw/validate-launch-tuw-ledger.mjs",
]) {
  assert.equal(commandEvidence.commands_run.some((entry) => entry.command.includes(requiredCommand)), true, `missing command evidence: ${requiredCommand}`);
}
assert.equal(commandEvidence.validation_results.i8_s1_g_authenticated_probe, "BLOCKED_CONDITIONS_UNMET");

assert.equal(construction.goal_id, goalId);
assert.equal(construction.final_verdict, verdict);
assert.equal(construction.checks.some((check) => check.id === "i8_s1_g_authenticated_probe" && check.result === "BLOCKED_CONDITIONS_UNMET"), true);
assert.equal(claudeReview.status, "not_run");
assert.equal(claudeReview.valid_review_evidence, false);

assert.equal(crosswalk.goal_id, goalId);
assert.equal(crosswalk.launch_tuw_work_package, "LT-PRE-W13");
assert.equal(crosswalk.status, "blocked_i8_s1_g_probe_conditions_unmet_after_s2_g_code_pass");
for (const item of ["S2-T01", "S2-T02", "S2-T04", "S2-T06", "S1-G authenticated probe"]) {
  assert.equal(crosswalk.mappings.some((entry) => entry.cti_item === item), true, `crosswalk missing ${item}`);
}
assert.equal(crosswalk.mappings.some((entry) => entry.cti_item === "S1-G authenticated probe" && entry.status === "BLOCKED_CONDITIONS_UNMET"), true);

const wp = ledger.work_packages.find((entry) => entry.wp_id === "LT-PRE-W13");
assert.equal(wp?.goal_id, goalId);
assert.equal(wp?.terminal_tuw, "LT-PRE-W13-T06");
const tuws = ledger.tuws.filter((entry) => entry.id.startsWith("LT-PRE-W13-"));
assert.equal(tuws.length, 6);
assert.equal(tuws.some((entry) => entry.id === "LT-PRE-W13-T06" && entry.terminal === true), true);
for (const id of ["LT-PRE-W13-T01", "LT-PRE-W13-T02", "LT-PRE-W13-T03", "LT-PRE-W13-T04", "LT-PRE-W13-T05", "LT-PRE-W13-T06"]) {
  assert.match(preMd, new RegExp(`#### ${id} —`), `PRE markdown missing ${id}`);
}

assert.equal(packageJson.version, "0.1.10");
assert.equal(desktopPackageJson.version, "0.1.10");
assert.match(credentialStore, /LAWOS_INTERNAL_PASSWORD_PROVIDER_ID = "lawos-internal-password-provider-v1"/);
assert.match(credentialStore, /node:crypto\.scrypt/);
assert.match(credentialStore, /validateSessionCredential/);
assert.match(sessionAuth, /AUTH_SYNTHETIC_LOGIN_DISABLED/);
assert.match(sessionAuth, /credential_rev/);
assert.match(sessionAuth, /validateSessionCredential/);
assert.match(desktopAuth, /reset_token/);
assert.match(desktopAuth, /session_token/);
assert.match(desktopAuth, /credential_hash/);
assert.match(desktopRuntime, /LAWOS_INTERNAL_PASSWORD_PROVIDER_ID/);
assert.match(desktopRuntime, /password_hash_algorithm: "node:crypto\.scrypt"/);
assert.match(storeManifest, /LAWOS_AUTH_CREDENTIAL_STORE_PATH/);
assert.match(server, /authCredentialStorePath/);
assert.match(catalog, /LAWOS_AUTH_CREDENTIAL_STORE_PATH/);

console.log(JSON.stringify({
  status: "PASS",
  goal_id: goalId,
  closeout_verdict: verdict,
  s2_g: "PASS_CODE_AND_LOCAL_STAGING_SYNTHETIC_FIXTURES",
  i8_s1_g_authenticated_probe: "BLOCKED_CONDITIONS_UNMET",
  production_ready_claim: false,
  go_live_claim: false
}, null, 2));
