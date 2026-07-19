import { createRecordDomainDescriptor } from "../../persistence/src/record-domain-adapter.js";

const APPEND_ONLY_RECORD_TYPES = new Set(["GoNoGoDecision"]);

export const ENTERPRISE_READINESS_DOMAIN_DESCRIPTOR = createRecordDomainDescriptor({
  domain_id: "enterprise-readiness",
  resolve_record_id: (record) => record.resource_id ?? record.id,
  append_only: (record) => APPEND_ONLY_RECORD_TYPES.has(record.model_type),
  pii_fields: [],
  primary_key_fields: ["resource_id"],
});
