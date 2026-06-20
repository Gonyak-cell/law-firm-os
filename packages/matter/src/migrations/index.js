export const MATTER_CORE_MIGRATIONS = Object.freeze([
  Object.freeze({
    id: "001_matter_core",
    filename: "001_matter_core.sql",
    checksum: "matter-core-r4-001",
    description: "Matter Core tenant-scoped runtime tables for CMP R4 G4",
  }),
]);

export function runMatterMigrations(store) {
  if (!store || typeof store.migrate !== "function") return MATTER_CORE_MIGRATIONS;
  for (const migration of MATTER_CORE_MIGRATIONS) store.migrate(migration);
  return MATTER_CORE_MIGRATIONS;
}
