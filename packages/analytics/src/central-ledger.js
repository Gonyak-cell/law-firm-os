import { createRecordDomainDescriptor } from "../../persistence/src/record-domain-adapter.js";

const APPEND_ONLY_RECORD_TYPES = new Set([
  "AnalyticsEvent",
  "AnalyticsExport",
  "ReadModelRefreshRun",
]);

export const ANALYTICS_DOMAIN_DESCRIPTOR = createRecordDomainDescriptor({
  domain_id: "analytics",
  resolve_record_id: (record) => record.resource_id ?? record.id,
  append_only: (record) => APPEND_ONLY_RECORD_TYPES.has(record.model_type),
  references(record) {
    const references = [];
    if (record.matter_id) references.push({
      reference_name: "matter",
      target_domain_id: "matter",
      target_record_type: "Matter",
      target_record_id: record.matter_id,
    });
    if (record.client_group_id) references.push({
      reference_name: "client_group",
      target_domain_id: "master-data",
      target_record_type: "ClientGroup",
      target_record_id: record.client_group_id,
    });
    return references;
  },
  pii_fields: ["event_payload", "export_filters", "employee_id"],
  primary_key_fields: ["resource_id"],
  reference_rules: [
    "*.matter_id->matter.Matter",
    "*.client_group_id->master-data.ClientGroup",
  ],
});
