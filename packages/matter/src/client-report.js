export const MATTER_CLIENT_REPORT_HIDDEN_FIELDS = Object.freeze([
  "conflict_memo",
  "privileged_strategy",
  "internal_notes",
  "raw_audit_event",
  "permission_decision_detail",
  "billing_detail",
  "unauthorized_count",
]);

export function createMatterClientReportProjection({ tenant_id, matter_id, report_id, sections = [] } = {}) {
  if (!tenant_id) throw new TypeError("tenant_id is required");
  if (!matter_id) throw new TypeError("matter_id is required");
  const removed_fields = [];
  const visible_sections = sections
    .filter((section) => section.client_visible !== false && section.privileged !== true)
    .map((section) => {
      const clean = {};
      for (const [key, value] of Object.entries(section)) {
        if (MATTER_CLIENT_REPORT_HIDDEN_FIELDS.includes(key)) removed_fields.push(key);
        else clean[key] = value;
      }
      return Object.freeze(clean);
    });
  return Object.freeze({
    tenant_id,
    matter_id,
    report_id,
    visible_sections: Object.freeze(visible_sections),
    removed_fields: Object.freeze([...new Set(removed_fields)]),
    unauthorized_count_leaked: false,
  });
}
