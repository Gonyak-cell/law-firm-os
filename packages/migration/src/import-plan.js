import { createMigrationPlatformCp756ScopeContractFoundationDescriptor } from "./service.js";

export function createMigrationImportPlanDescriptor() {
  const descriptor = createMigrationPlatformCp756ScopeContractFoundationDescriptor();
  return Object.freeze({
    plan_id: "migration-platform-import-plan-descriptor",
    source_descriptor: descriptor.descriptor,
    supported_source_descriptors: Object.freeze(["file_server", "sharepoint", "google_drive", "imanage"]),
    dry_run_required_before_import: true,
    source_lineage_required: true,
    real_source_payload_included: false,
    external_credential_included: false,
    runtime_import_opened: false,
    writes_product_state: false,
  });
}
