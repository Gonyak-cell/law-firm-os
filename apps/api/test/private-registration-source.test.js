import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const registration = { tenant_id: "tenant_private_fixture", users: [{ user_id: "user_private_fixture", email: "private-fixture@example.test", display_name: "Synthetic private account", highest_privilege: true }] };

function fixture(t) {
  const directory = realpathSync(mkdtempSync(join(tmpdir(), "lawos-private-registration-")));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const env = { ...process.env };
  for (const key of ["LAWOS_IDENTITY_REGISTRATION_SOURCE_PATH", "LAWOS_IDENTITY_TENANT_ID", "LAWOS_HRX_MEMBER_ROSTER_SOURCE_PATH", "LAWOS_HRX_MEMBER_PHOTO_SOURCE_PATH"]) delete env[key];
  return { directory, env };
}

test("account registry supports explicit private input and stays empty when no source is packaged", (t) => {
  const { directory, env } = fixture(t);
  const modulePath = join(directory, "apps/api/src/registry.mjs");
  mkdirSync(dirname(modulePath), { recursive: true });
  copyFileSync(join(root, "apps/api/src/matter-vault-account-registry.js"), modulePath);
  const expression = `const m = await import(${JSON.stringify(pathToFileURL(modulePath).href)}); console.log(JSON.stringify({tenant:m.MATTER_VAULT_REGISTERED_TENANT_ID,accounts:m.listRegisteredAccounts(),highest:m.highestPrivilegeRegisteredAccount(),path:m.MATTER_VAULT_ACCOUNT_REGISTRY_PATH}));`;
  const run = (extra = {}) => spawnSync(process.execPath, ["--input-type=module", "-e", expression], { cwd: directory, env: { ...env, ...extra }, encoding: "utf8" });
  let result = run({ LAWOS_IDENTITY_TENANT_ID: "tenant_server_authority" });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), { tenant: "tenant_server_authority", accounts: [], highest: null, path: null });
  const privatePath = join(directory, "private registration.json");
  writeFileSync(privatePath, JSON.stringify(registration));
  writeFileSync(join(dirname(modulePath), "matter-vault-user-registration-seed.json"), JSON.stringify({ tenant_id: "tenant_packaged", users: [] }));
  assert.equal(JSON.parse(run().stdout).tenant, "tenant_packaged");
  result = run({ LAWOS_IDENTITY_REGISTRATION_SOURCE_PATH: "private registration.json" });
  assert.equal(result.status, 0, result.stderr);
  const value = JSON.parse(result.stdout);
  assert.equal(value.path, privatePath);
  assert.equal(value.tenant, registration.tenant_id);
  assert.equal(value.accounts[0].email, registration.users[0].email);
  assert.equal(value.highest.user_id, registration.users[0].user_id);
  result = run({ LAWOS_IDENTITY_REGISTRATION_SOURCE_PATH: "absent.json" });
  assert.notEqual(result.status, 0, "an explicit missing source must not fall back to packaged accounts");
  writeFileSync(privatePath, JSON.stringify({ tenant_id: "tenant_invalid" }));
  assert.notEqual(run({ LAWOS_IDENTITY_REGISTRATION_SOURCE_PATH: privatePath }).status, 0);
  writeFileSync(privatePath, "invalid JSON");
  assert.notEqual(run({ LAWOS_IDENTITY_REGISTRATION_SOURCE_PATH: privatePath }).status, 0);
});

test("renderer privacy validation uses external registration values and still rejects leaked data or absent evidence", (t) => {
  const { directory, env } = fixture(t);
  const workspace = join(directory, "workspace");
  const renderer = join(workspace, "apps/web/dist");
  const photos = join(directory, "private photos");
  mkdirSync(renderer, { recursive: true });
  mkdirSync(photos);
  const registrationPath = join(directory, "private-registration.json");
  const rosterPath = join(directory, "private-roster.json");
  writeFileSync(registrationPath, JSON.stringify(registration));
  writeFileSync(rosterPath, JSON.stringify({ tenant_id: "tenant_private_roster", members: [{ display_name: "Private roster fixture", user_id: "user_roster_fixture" }] }));
  writeFileSync(join(photos, "synthetic.png"), Buffer.from("synthetic-private-photo-bytes"));
  const page = join(renderer, "index.html");
  writeFileSync(page, "Public application shell");
  const sourceEnv = { ...env, LAWOS_IDENTITY_REGISTRATION_SOURCE_PATH: registrationPath, LAWOS_HRX_MEMBER_ROSTER_SOURCE_PATH: rosterPath, LAWOS_HRX_MEMBER_PHOTO_SOURCE_PATH: photos };
  const run = (extra = {}) => spawnSync(process.execPath, [join(root, "scripts/validate-public-renderer-no-hrx-roster-pii.mjs")], { cwd: workspace, env: { ...sourceEnv, ...extra }, encoding: "utf8" });
  let result = run();
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).registration_account_count, 1);
  assert.equal(JSON.parse(result.stdout).protected_values_printed, false);
  writeFileSync(page, registration.users[0].email);
  result = run();
  assert.notEqual(result.status, 0, "account-only identity leakage must be detected");
  assert.equal(result.stderr.includes(registration.users[0].email), false);
  writeFileSync(page, "Public application shell");
  copyFileSync(join(photos, "synthetic.png"), join(renderer, "copied-photo.bin"));
  assert.notEqual(run().status, 0, "private photo bytes must be rejected regardless of filename");
  rmSync(join(renderer, "copied-photo.bin"));
  assert.notEqual(run({ LAWOS_IDENTITY_REGISTRATION_SOURCE_PATH: join(directory, "missing.json") }).status, 0);
  writeFileSync(registrationPath, JSON.stringify({ tenant_id: "tenant_empty", users: [] }));
  assert.notEqual(run().status, 0, "empty registration evidence must not disable account checks");
});
