import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const packagedSeedPath = join(__dirname, "matter-vault-user-registration-seed.json");
const repoSeedPath = resolve(
  __dirname,
  "../../../docs/reorganization/client-matter-os/matter-vault-r4/launch/matter-vault-user-registration-seed.json",
);

export const MATTER_VAULT_ACCOUNT_REGISTRY_SOURCE = "matter-vault-user-registration-seed";
export const MATTER_VAULT_ACCOUNT_REGISTRY_PATH = existsSync(packagedSeedPath) ? packagedSeedPath : repoSeedPath;
export const MATTER_VAULT_USER_REGISTRATION_SEED = Object.freeze(
  JSON.parse(readFileSync(MATTER_VAULT_ACCOUNT_REGISTRY_PATH, "utf8")),
);
export const MATTER_VAULT_REGISTERED_TENANT_ID = MATTER_VAULT_USER_REGISTRATION_SEED.tenant_id;

export function normalizeAccountEmail(email) {
  return String(email ?? "").trim().toLowerCase();
}

export function registeredAccountPublicRef(user) {
  if (!user) return null;
  return Object.freeze({
    user_id: user.user_id,
    email: user.email,
    display_name: user.display_name,
    english_name: user.english_name,
    source_title: user.source_title,
    status: user.status,
    registration_state: user.registration_state,
    highest_privilege: user.highest_privilege === true,
    privilege_rank: user.privilege_rank,
    role_ids: Object.freeze([...(user.role_ids ?? [])]),
    group_ids: Object.freeze([...(user.group_ids ?? [])]),
    scopes: Object.freeze([...(user.scopes ?? [])]),
  });
}

export function listRegisteredAccounts(seed = MATTER_VAULT_USER_REGISTRATION_SEED) {
  return Object.freeze(seed.users.map((user) => registeredAccountPublicRef(user)));
}

export function findRegisteredAccountByEmail(email, seed = MATTER_VAULT_USER_REGISTRATION_SEED) {
  const normalized = normalizeAccountEmail(email);
  return seed.users.find((user) => normalizeAccountEmail(user.email) === normalized) ?? null;
}

export function findRegisteredAccountByUserId(userId, seed = MATTER_VAULT_USER_REGISTRATION_SEED) {
  return seed.users.find((user) => user.user_id === userId) ?? null;
}

export function highestPrivilegeRegisteredAccount(seed = MATTER_VAULT_USER_REGISTRATION_SEED) {
  return (
    findRegisteredAccountByEmail(seed.highest_privilege_account?.email, seed) ??
    seed.users.find((user) => user.highest_privilege === true) ??
    seed.users[0] ??
    null
  );
}

export function resolveRegisteredAccount({ user_id, email } = {}, seed = MATTER_VAULT_USER_REGISTRATION_SEED) {
  return findRegisteredAccountByUserId(user_id, seed) ?? findRegisteredAccountByEmail(email, seed);
}
