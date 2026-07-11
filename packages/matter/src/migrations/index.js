export const MATTER_CORE_MIGRATIONS = Object.freeze([
  Object.freeze({
    id: "001_matter_core",
    filename: "001_matter_core.sql",
    checksum: "matter-core-r4-001-canonical-identity",
    description: "Matter Core tenant-scoped runtime tables with canonical client and matter code identity",
  }),
  Object.freeze({
    id: "002_matter_worktree",
    filename: "002_matter_worktree.sql",
    checksum: "matter-worktree-v1-model-storage",
    description: "Matter Worktree and template storage keyed by tenant and canonical model identifiers",
  }),
]);

export function runMatterMigrations(store) {
  if (!store || typeof store.migrate !== "function") return MATTER_CORE_MIGRATIONS;
  for (const migration of MATTER_CORE_MIGRATIONS) store.migrate(migration);
  return MATTER_CORE_MIGRATIONS;
}
