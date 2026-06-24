export const IMPORT_DATA_MAPPING_ROUTE_POLICIES = Object.freeze([
  Object.freeze({
    method: "GET",
    pattern: /^\/api\/import-jobs$/,
    action: "import:job:read",
    resource_type: "client_matter_import_job",
  }),
  Object.freeze({
    method: "POST",
    pattern: /^\/api\/import-jobs$/,
    action: "import:job:create",
    resource_type: "client_matter_import_job",
  }),
  Object.freeze({
    method: "GET",
    pattern: /^\/api\/import-targets$/,
    action: "import:target:read",
    resource_type: "client_matter_import_target",
  }),
  Object.freeze({
    method: "POST",
    pattern: /^\/api\/import-jobs\/([^/]+)\/source-files$/,
    action: "import:source:stage",
    resource_type: "client_matter_import_source_file",
  }),
  Object.freeze({
    method: "GET",
    pattern: /^\/api\/import-jobs\/([^/]+)\/preview$/,
    action: "import:preview:read",
    resource_type: "client_matter_import_preview",
  }),
  Object.freeze({
    method: "POST",
    pattern: /^\/api\/import-jobs\/([^/]+)\/field-mappings$/,
    action: "import:mapping:write",
    resource_type: "client_matter_import_mapping",
  }),
  Object.freeze({
    method: "POST",
    pattern: /^\/api\/import-jobs\/([^/]+)\/dry-run$/,
    action: "import:dry_run",
    resource_type: "client_matter_import_dry_run",
  }),
  Object.freeze({
    method: "POST",
    pattern: /^\/api\/import-jobs\/([^/]+)\/execute$/,
    action: "import:execute",
    resource_type: "client_matter_import_execution",
  }),
  Object.freeze({
    method: "POST",
    pattern: /^\/api\/import-jobs\/([^/]+)\/rollback$/,
    action: "import:rollback",
    resource_type: "client_matter_import_rollback",
  }),
  Object.freeze({
    method: "GET",
    pattern: /^\/api\/import-jobs\/([^/]+)\/error-report$/,
    action: "import:error_report:read",
    resource_type: "client_matter_import_error_report",
  }),
]);

export function matchImportDataMappingRoute({ pathname, method } = {}) {
  for (const policy of IMPORT_DATA_MAPPING_ROUTE_POLICIES) {
    const match = pathname.match(policy.pattern);
    if (match && policy.method === method) return Object.freeze({ ...policy, params: Object.freeze(match.slice(1)) });
  }
  return null;
}
