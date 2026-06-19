import { createMigrationPlatformCp756ScopeContractFoundationDescriptor } from "./service.js";

export function createMigrationMapperDescriptor() {
  const descriptor = createMigrationPlatformCp756ScopeContractFoundationDescriptor();
  return Object.freeze({
    mapper_id: "migration-platform-mapper-descriptor",
    source_descriptor: descriptor.descriptor,
    target_entities: Object.freeze(["Matter", "Document", "Client", "User", "PermissionRule", "SourceLineage"]),
    requires_human_mapping_approval: true,
    cross_tenant_access_allowed: false,
    source_payload_included: false,
    runtime_mapping_opened: false,
    writes_product_state: false,
  });
}
