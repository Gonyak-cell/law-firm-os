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
  Object.freeze({
    id: "003_people_member_fields",
    filename: "003_people_member_fields.sql",
    checksum: "people-member-fields-v1-effective-identity",
    description: "MatterMember effective period and verified Employee identity expansion",
  }),
  Object.freeze({
    id: "004_people_calendar_fields",
    filename: "004_people_calendar_fields.sql",
    checksum: "people-calendar-fields-v1-explicit-kind-provider",
    description: "MatterCalendarEvent explicit kind and tenant-unique provider identity expansion",
  }),
  Object.freeze({
    id: "005_people_task_fields",
    filename: "005_people_task_fields.sql",
    checksum: "people-task-fields-v1-user-time-estimate",
    description: "MatterTask explicit User assignment, time interval, and estimate expansion",
  }),
]);

export function runMatterMigrations(store) {
  if (!store || typeof store.migrate !== "function") return MATTER_CORE_MIGRATIONS;
  for (const migration of MATTER_CORE_MIGRATIONS) store.migrate(migration);
  return MATTER_CORE_MIGRATIONS;
}
