export const SHA256 = /^[a-f0-9]{64}$/u;
export const GIT_OID = /^[a-f0-9]{40}$/u;
export const PRODUCT_IDS = [
  "8f3cc90d-56dd-4c1c-b9c2-0a1100500101",
  "952431be-51b8-42a2-9bf6-769a15934e85",
];
export const PROFILE_NAMES = ["inquiry-only", "matter-full"];
export const PROFILE_CONTRACTS = {
  [PRODUCT_IDS[0]]: {
    profile: "matter-full",
    mailbox_min_version: "1.14",
    production_manifest: "apps/addin/manifest.production.xml",
    taskpane_html: "index.html",
    required_static_paths: ["event-runtime.html", "event-runtime.js", "index.html"],
  },
  [PRODUCT_IDS[1]]: {
    profile: "inquiry-only",
    mailbox_min_version: "1.3",
    production_manifest: "apps/addin/manifest.inquiry.production.xml",
    taskpane_html: "outlook-addin/index.html",
    required_static_paths: ["outlook-addin/index.html"],
  },
};
export const MANIFEST_PATHS = [
  "apps/addin/manifest.inquiry.production.xml",
  "apps/addin/manifest.inquiry.xml",
  "apps/addin/manifest.production.xml",
  "apps/addin/manifest.xml",
];
export const CLIENT_GRAPH_SCOPES = ["Calendars.ReadWrite", "Mail.Read", "offline_access"];
export const CLIENT_OAUTH_SCOPES = ["Calendars.ReadWrite", "email", "Mail.Read", "offline_access", "openid", "profile"];
export const APPROVED_LICENSES = ["0BSD", "Apache-2.0", "BlueOak-1.0.0", "BSD-2-Clause", "BSD-3-Clause", "CC-BY-4.0", "ISC", "MIT"];
export const REQUIRED_HOSTS = ["classic-outlook-windows", "new-outlook-windows", "outlook-macos", "owa"];
export const REQUIRED_COMMON_HOST_SCENARIOS = ["auth-reconnect", "item-switch", "offline-recovery"];
export const REQUIRED_PREREQUISITES = [
  "additive_migrations",
  "api_release",
  "approved_template_runtime",
  "docusign_endpoint_and_secret_reference",
  "graph_endpoint_and_secret_reference",
  "precedent_index_runtime",
  "static_release",
];
export const MUTATION_ACTIONS = Object.freeze({
  additive_migrations: "additive_migration_apply",
  api_release: "api_lambda_code_deploy",
  central_deployment: "m365_central_manifest_update",
  docusign_endpoint_and_secret_reference: "docusign_endpoint_secret_config",
  graph_endpoint_and_secret_reference: "graph_endpoint_secret_config",
  static_release: "static_dual_namespace_publish",
});
export const REQUIRED_MUTATION_ACTIONS = Object.freeze(Object.values(MUTATION_ACTIONS));
export const REQUIRED_PROOF_CLASSES = [
  ...REQUIRED_PREREQUISITES,
  "authorization",
  "central_deployment",
  "go_live_approval",
  "monitoring_plan",
  "pilot_assignment",
  "propagation_observation",
  "real_outlook_host",
  "rollback_rehearsal",
  "rollback_static_inventory",
];
export const REQUIRED_RELEASE_PATHS = [
  "apps/addin/src/inquiry-entry.jsx",
  "apps/addin/src/matter-entry.js",
  "apps/api/src/microsoft-delegated-oauth-client.js",
  "apps/api/src/outlook-graph-webhook.js",
  "apps/api/src/outlook-time-entry-draft-adapter.js",
  "packages/dms/src/search/postgres-precedent-repository.js",
  "packages/email-dms/src/email-filing-correction-service.js",
  "packages/email-dms/src/graph-subscription-service.js",
  "packages/email-dms/src/m365-connection-model.js",
  "packages/integrations-core/src/docusign-envelope-adapter.js",
  "packages/integrations-core/src/docusign-postgres-repository.js",
  "packages/matter/src/approved-document-builder-service.js",
  "packages/matter/src/outlook-task-adapter.js",
];
export const REQUIRED_TEST_PATHS = [
  "apps/addin/test/outlook-profile-build-artifact.mjs",
  "apps/api/test/microsoft-delegated-oauth-client.test.js",
  "apps/api/test/outlook-graph-webhook.test.js",
  "apps/api/test/outlook-time-entry-draft-postgres.test.js",
  "packages/dms/test/postgres-precedent-search.test.js",
  "packages/email-dms/test/email-filing-correction-concurrency.test.js",
  "packages/email-dms/test/graph-notification-queue.test.js",
  "packages/integrations-core/test/docusign-concurrency.test.js",
  "packages/integrations-core/test/docusign-postgres-concurrency.test.js",
  "packages/matter/test/document-builder-docx.test.js",
  "packages/matter/test/outlook-task-adapter.test.js",
];
export const REQUIRED_STATIC_PATHS = [
  "amic-law-icon.png", "event-runtime.html", "event-runtime.js", "index.html",
  "oauth-callback.html", "oauth-callback.js", "oauth-start.html", "oauth-start.js",
  "outlook-addin/index.html",
];
export const FORBIDDEN_BUILD_SUFFIXES = [".key", ".map", ".p12", ".pem", ".pfx"];
export const FORBIDDEN_BUILD_TEXT = [
  "-----BEGIN PRIVATE KEY-----", "-----BEGIN RSA PRIVATE KEY-----", "/Users/",
  "/home/runner/work/", "sourcesContent\"",
];
export const STATIC_NAMESPACES = [
  { excluded_source_prefixes: ["outlook-addin/"], invalidation_path: "/addin/*", product_id: PRODUCT_IDS[0], profile: "matter-full", source_prefix: "", target_prefix: "addin/" },
  { excluded_source_prefixes: [], invalidation_path: "/outlook-addin/*", product_id: PRODUCT_IDS[1], profile: "inquiry-only", source_prefix: "outlook-addin/", target_prefix: "outlook-addin/" },
];
export const CANDIDATE_ALLOWED_CLAIM = "Exact source, deterministic local build, four official manifest validations, frozen profile drift, rollback metadata, and dependency licenses passed.";
export const CANDIDATE_BLOCKED_CLAIM = "This receipt is not API/static/M365 deployment, propagation, real Outlook host, Graph delivery, DocuSign sandbox, or go-live evidence.";
