import { MASTER_DATA_REPOSITORY_SCHEMA_VERSION } from "../repository.js";

export const MASTER_DATA_REPOSITORY_MIGRATIONS = Object.freeze([
  Object.freeze({
    id: "001_master_data_repository",
    schema_version: MASTER_DATA_REPOSITORY_SCHEMA_VERSION,
    description: "Create file-backed Master Data repository state with a records collection.",
  }),
]);

export function listMasterDataRepositoryMigrations() {
  return MASTER_DATA_REPOSITORY_MIGRATIONS;
}
