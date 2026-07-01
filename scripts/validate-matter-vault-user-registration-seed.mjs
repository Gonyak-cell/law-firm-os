#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const seedPath = path.join(
  ROOT,
  "docs/reorganization/client-matter-os/matter-vault-r4/launch/matter-vault-user-registration-seed.json",
);
const receiptPath = path.join(
  ROOT,
  "docs/reorganization/client-matter-os/matter-vault-r4/launch/matter-vault-user-registration-receipt.md",
);
const packagePath = path.join(ROOT, "package.json");

const expectedEmails = [
  "ytkim@amic.kr",
  "wsjo@amic.kr",
  "sypark@amic.kr",
  "bj.park@amic.kr",
  "yhlim@amic.kr",
  "jwsuh@amic.kr",
  "smcho@amic.kr",
  "tryoon@amic.kr",
  "yjlee@amic.kr",
  "matter.desktop.qa@amic.kr",
];

const errors = [];

function assert(condition, message) {
  if (!condition) errors.push(message);
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

for (const filePath of [seedPath, receiptPath, packagePath]) {
  assert(existsSync(filePath), `missing file: ${path.relative(ROOT, filePath)}`);
}

let seed = null;
let receipt = "";
let packageJson = null;

if (errors.length === 0) {
  seed = readJson(seedPath);
  receipt = readFileSync(receiptPath, "utf8");
  packageJson = readJson(packagePath);

  assert(seed.schema_version === "law-firm-os.matter-vault-user-registration-seed.v0.1", "seed schema mismatch");
  assert(seed.status === "registered-local-seed", "seed status must be registered-local-seed");
  assert(seed.tenant_id === "tenant_amic_matter_vault", "tenant id mismatch");
  assert(seed.source?.account_count === 10, "source account count must be 10");
  assert(seed.source?.phone_numbers_imported === false, "phone numbers must not be imported");
  assert(seed.registration_boundary?.production_idp_account_creation === false, "production IDP creation must remain false");
  assert(seed.registration_boundary?.m365_graph_user_write === false, "M365/Graph user write must remain false");
  assert(seed.registration_boundary?.passwords_or_real_tokens_included === false, "real credentials must not be included");
  assert(seed.registration_boundary?.local_dev_synthetic_tokens_only === true, "only local dev synthetic tokens are allowed");

  const users = seed.users ?? [];
  assert(users.length === expectedEmails.length, `expected ${expectedEmails.length} users`);
  const emails = users.map((user) => user.email);
  assert(new Set(emails).size === emails.length, "user emails must be unique");
  for (const email of expectedEmails) {
    assert(emails.includes(email), `missing expected account: ${email}`);
  }

  const highest = users.filter((user) => user.highest_privilege === true);
  assert(highest.length === 1, "exactly one highest privilege account is required");
  assert(highest[0]?.email === "jwsuh@amic.kr", "jwsuh@amic.kr must be the highest privilege account");
  assert(highest[0]?.privilege_rank === 1000, "jwsuh@amic.kr must have privilege rank 1000");
  assert(highest[0]?.role_ids?.includes("system_super_admin"), "jwsuh@amic.kr must have system_super_admin");
  assert(highest[0]?.role_ids?.includes("security_admin"), "jwsuh@amic.kr must have security_admin");
  assert(highest[0]?.scopes?.includes("user.admin"), "jwsuh@amic.kr must have user.admin scope");
  assert(highest[0]?.scopes?.includes("security.admin"), "jwsuh@amic.kr must have security.admin scope");

  for (const user of users) {
    assert(user.status === "active", `${user.email}: status must be active`);
    assert(user.registration_state === "registered_seed", `${user.email}: registration state mismatch`);
    assert(user.mfa_required === true, `${user.email}: mfa_required must be true`);
    assert(user.assurance_level === "mfa", `${user.email}: assurance level must be mfa`);
    assert(user.local_dev?.synthetic_only === true, `${user.email}: local synthetic token boundary missing`);
    assert(user.local_dev?.synthetic_token === `local-dev-only:${user.email}`, `${user.email}: local synthetic token mismatch`);
    assert(user.tenant_memberships?.length === 1, `${user.email}: one tenant membership required`);
    assert(user.tenant_memberships?.[0]?.tenant_id === seed.tenant_id, `${user.email}: tenant membership mismatch`);
    assert(user.tenant_memberships?.[0]?.role_ids?.join("|") === user.role_ids?.join("|"), `${user.email}: membership roles must mirror user roles`);
    assert(user.tenant_memberships?.[0]?.group_ids?.join("|") === user.group_ids?.join("|"), `${user.email}: membership groups must mirror user groups`);
    assert(user.tenant_memberships?.[0]?.scopes?.join("|") === user.scopes?.join("|"), `${user.email}: membership scopes must mirror user scopes`);

    if (user.email !== "jwsuh@amic.kr") {
      assert(!user.role_ids?.includes("system_super_admin"), `${user.email}: only jwsuh@amic.kr may be system_super_admin`);
      assert(user.privilege_rank < 1000, `${user.email}: non-highest account rank must be below 1000`);
    }
  }

  const serialized = JSON.stringify(seed);
  assert(!/(010|011|016|017|018|019)[- .]?\d{3,4}[- .]?\d{4}/.test(serialized), "seed must not include phone numbers");
  assert(!/(access_token|refresh_token|id_token|password)\s*[:=]/i.test(serialized), "seed must not include real credential fields");

  const requiredReceiptPhrases = [
    "Status: registered-local-seed",
    "Registered account count: 10",
    "jwsuh@amic.kr",
    "system_super_admin",
    "production IDP account creation: false",
    "M365 or Graph user write: false",
    "passwords or real tokens included: false",
    "phone numbers imported: false",
    "local-dev synthetic tokens only: true",
    "does not claim production account creation",
  ];
  for (const phrase of requiredReceiptPhrases) {
    assert(receipt.includes(phrase), `receipt missing phrase: ${phrase}`);
  }

  assert(
    packageJson.scripts?.["matter-vault:user-registration:validate"] ===
      "node scripts/validate-matter-vault-user-registration-seed.mjs",
    "package script matter-vault:user-registration:validate missing",
  );
}

if (errors.length > 0) {
  console.error("Matter-Vault user registration seed validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Matter-Vault user registration seed validation passed.");
console.log("registered_account_count: 10");
console.log("highest_privilege_account: jwsuh@amic.kr");
console.log("production_idp_account_creation: false");
