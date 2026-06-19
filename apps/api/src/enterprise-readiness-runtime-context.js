const SYNTHETIC_TENANT = "tenant-a";
const RUNTIME_READINESS = "runtime_api_evidence_only__durable_persistence_open";

export const CMP_G12_TUW_IDS = Object.freeze(
  Array.from({ length: 28 }, (_, index) => `CMP-G12-W12-T${String(index + 1).padStart(3, "0")}`),
);

const ITEM_ROWS = [
  ["CMP-G12-W12-T001", "Tenant admin", "Settings", "/admin/tenant-settings", "TenantSettings", "Admin governance", "tenant_admin_settings"],
  ["CMP-G12-W12-T002", "IAM enterprise", "SSO", "/admin/sso", "SSOSettings", "Admin governance", "migration_boundary"],
  ["CMP-G12-W12-T003", "IAM enterprise", "SCIM", "/admin/scim", "SCIMConfig", "Admin governance", "migration_boundary"],
  ["CMP-G12-W12-T004", "IAM enterprise", "MFA", "/admin/mfa", "MFAPolicy", "Admin governance", "policy_artifact"],
  ["CMP-G12-W12-T005", "Observability", "Metrics", "/ops/metrics", "ObservabilityMetric", "Operations dashboard", "artifact_linkage"],
  ["CMP-G12-W12-T006", "Observability", "Latency", "/ops/latency", "RouteLatency", "Operations dashboard", "api_context"],
  ["CMP-G12-W12-T007", "Incident response", "Runbook", "/ops/incidents", "IncidentRunbook", "Operations dashboard", "incident_runbook"],
  ["CMP-G12-W12-T008", "Release engineering", "Deployment run", "/ops/deployments", "DeploymentRun", "Operations dashboard", "deployment_run"],
  ["CMP-G12-W12-T009", "Release engineering", "Rollback", "/ops/rollback-plans", "RollbackPlan", "Operations dashboard", "rollback_plan"],
  ["CMP-G12-W12-T010", "DR", "Backup restore", "/ops/drills/backup-restore", "BackupRestoreDrill", "DR report", "backup_restore"],
  ["CMP-G12-W12-T011", "Performance", "Smoke", "/ops/performance-smoke", "PerformanceSmokeReport", "Performance report", "performance_smoke"],
  ["CMP-G12-W12-T012", "Security test", "Regression", "/ops/security-regression", "SecurityRegressionReport", "Security dashboard", "security_regression"],
  ["CMP-G12-W12-T013", "Security test", "Permission negative", "/ops/permission-negative", "PermissionNegativeReport", "Security dashboard", "permission_negative"],
  ["CMP-G12-W12-T014", "Migration", "Batch", "/migration/batches", "MigrationBatch", "Migration dashboard", "migration_batch"],
  ["CMP-G12-W12-T015", "Migration", "Duplicate validation", "/migration/validate/party", "MigrationValidation", "Migration dashboard", "duplicate_party_validation"],
  ["CMP-G12-W12-T016", "Migration", "Vault migration", "/migration/vault/dry-run", "VaultMigrationDryRun", "Migration dashboard", "vault_migration_dry_run"],
  ["CMP-G12-W12-T017", "Migration", "Finance reconciliation", "/migration/finance/reconcile", "FinanceMigrationReconciliation", "Migration dashboard", "finance_reconciliation"],
  ["CMP-G12-W12-T018", "Integrations", "Connector registry", "/admin/connectors", "IntegrationConnection", "Vault connector settings", "connector_registry"],
  ["CMP-G12-W12-T019", "Integrations", "CredentialRef", "/admin/credentials", "CredentialRef", "Connector settings", "credential_reference"],
  ["CMP-G12-W12-T020", "Integrations", "Accounting export", "/integrations/accounting/export", "AccountingConnectorExport", "Finance export", "accounting_export"],
  ["CMP-G12-W12-T021", "Compliance", "Evidence pack", "/ops/compliance/evidence-pack", "ComplianceEvidencePack", "Compliance report", "evidence_pack"],
  ["CMP-G12-W12-T022", "Compliance", "Control map", "/ops/compliance/control-map", "ComplianceControlMap", "Compliance report", "control_map"],
  ["CMP-G12-W12-T023", "UAT", "UAT scripts", "/uat/scenarios", "UATScenarioPack", "UAT dashboard", "uat_scenarios"],
  ["CMP-G12-W12-T024", "UAT", "Pilot feedback", "/uat/feedback", "PilotFeedback", "UAT dashboard", "pilot_feedback"],
  ["CMP-G12-W12-T025", "Release", "Release candidate", "/ops/release-candidates", "ReleaseCandidate", "Release dashboard", "release_candidate"],
  ["CMP-G12-W12-T026", "Launch", "Go/No-go", "/ops/go-no-go", "GoNoGoChecklist", "Launch dashboard", "go_no_go"],
  ["CMP-G12-W12-T027", "Launch", "Production report", "/ops/production-readiness", "ProductionReadinessReport", "Launch dashboard", "production_readiness_report"],
  ["CMP-G12-W12-T028", "Gate closeout", "Closeout", "/ops/enterprise-closeout", "G12EnterpriseCloseout", "Launch dashboard", "g12_closeout"],
];

export const ENTERPRISE_READINESS_ITEMS = Object.freeze(
  ITEM_ROWS.map(([tuw_id, capability, feature, route, model, surface, guardrail]) =>
    Object.freeze({ tuw_id, capability, feature, route, model, surface, guardrail }),
  ),
);

const ROUTE_TO_ITEM = Object.freeze(Object.fromEntries(ENTERPRISE_READINESS_ITEMS.map((item) => [item.route, item])));

const ENTERPRISE_READINESS_PREFIXES = Object.freeze([
  "/api/enterprise-readiness/runtime/evidence",
  "/api/enterprise-readiness/secret-exposure-test",
  "/api/enterprise-readiness/persistence-write-test",
  "/api/enterprise-readiness/go-live-claim-test",
  ...ENTERPRISE_READINESS_ITEMS.map((item) => item.route),
]);

export const ENTERPRISE_READINESS_BOUNDED_CONTEXT = Object.freeze({
  bounded_context: "enterprise-readiness",
  cmp_gate: "CMP-G12",
  cmp_work_package: "CMP-G12-W12",
  depends_on: Object.freeze([
    "CMP-G1-W01",
    "CMP-G2-W02",
    "CMP-G3-W03",
    "CMP-G4-W04",
    "CMP-G5-W05",
    "CMP-G6-W06",
    "CMP-G7-W07",
    "CMP-G8-W08",
    "CMP-G9-W09",
    "CMP-G10-W10",
    "CMP-G11-W11",
  ]),
  package_ref: "packages/platform; packages/enterprise; packages/admin; scripts; docs/release; docs/compliance",
  runtime_routes: ENTERPRISE_READINESS_PREFIXES,
  tuw_ids: CMP_G12_TUW_IDS,
  runtime_readiness_claim: RUNTIME_READINESS,
});

export function isEnterpriseReadinessPath(pathname) {
  return ENTERPRISE_READINESS_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function createEnterpriseReadinessRuntimeContext() {
  return Object.freeze({
    runtime_api_evidence_only: true,
    durable_persistence_open: true,
    production_deployment_allowed: false,
    external_provider_calls_allowed: false,
    secret_values_allowed: false,
    migration_execution_allowed: false,
    release_auto_approval_allowed: false,
    r4_claim_allowed: false,
  });
}

function response(status, body) {
  return { status, body };
}

function requireTenant(query = {}) {
  if (query.tenant_id !== SYNTHETIC_TENANT) {
    const error = new Error("CMP-G12 synthetic tenant is required");
    error.safe_error_code = "CMP_G12_TENANT_REQUIRED";
    throw error;
  }
  return query.tenant_id;
}

function fail(message, safeErrorCode = "CMP_G12_VALIDATION_ERROR") {
  const error = new Error(message);
  error.safe_error_code = safeErrorCode;
  throw error;
}

function safeError(error) {
  return response(400, {
    outcome: "blocked",
    safe_error_code: error.safe_error_code ?? "CMP_G12_VALIDATION_ERROR",
    reason: error.message,
    runtime_readiness_claim: RUNTIME_READINESS,
    r4_claimed: false,
    production_deployment_executed: false,
  });
}

function hasFlag(value = {}, flags = new Set()) {
  const stack = [value];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || typeof current !== "object") continue;
    for (const [key, nested] of Object.entries(current)) {
      if (nested === true && flags.has(key)) return key;
      if (typeof nested === "string" && flags.has(key) && nested.trim() !== "") return key;
      if (nested && typeof nested === "object") stack.push(nested);
    }
  }
  return null;
}

const FORBIDDEN_RUNTIME_FLAGS = new Set([
  "claims_r4",
  "claims_runtime_ready",
  "claims_production_ready",
  "claims_go_live_approval",
  "claims_cutover_approved",
  "production_release_executed",
  "deploy_executed",
  "applies_cutover",
  "auto_approve",
  "auto_promote",
  "writes_product_state",
  "creates_database_rows",
  "updates_database_rows",
  "deletes_database_rows",
  "persists_secret",
  "stores_secret_material",
  "secret_value",
  "token_value",
  "credential_value",
  "calls_external_provider_api",
  "calls_external_accounting_api",
  "export_payload_sent",
  "import_execution_started",
  "executes_migration_runtime",
  "executes_release_runtime",
  "executes_backup_restore_runtime",
  "executes_security_regression_runtime",
]);

function requireNoForbiddenRuntimeClaim(body = {}) {
  const flag = hasFlag(body, FORBIDDEN_RUNTIME_FLAGS);
  if (flag) {
    fail(`CMP-G12 blocks forbidden enterprise readiness claim or side effect: ${flag}`, "CMP_G12_RUNTIME_BOUNDARY_BLOCKED");
  }
}

function itemDefaults(item, body = {}) {
  const migrationGuarded = item.capability === "Migration" || ["SSO", "SCIM", "Deployment run", "Rollback", "Backup restore"].includes(item.feature);
  const humanReviewRequired = ["Accounting export", "Release candidate", "Go/No-go", "Production report", "Closeout"].includes(item.feature);
  return {
    tenant_id: body.tenant_id ?? SYNTHETIC_TENANT,
    actor_id: body.actor_id ?? "cmp-g12-enterprise-actor",
    permission_receipt_id: body.permission_receipt_id ?? `permission-${item.tuw_id.toLowerCase()}`,
    audit_event_type: body.audit_event_type ?? `cmp.g12.${item.guardrail}.reviewed`,
    idempotency_key: body.idempotency_key ?? `idem-${item.tuw_id.toLowerCase()}`,
    migration_plan_ref: migrationGuarded ? body.migration_plan_ref ?? `docs/release/${item.tuw_id}-migration-plan.md` : null,
    rollback_plan_ref: migrationGuarded ? body.rollback_plan_ref ?? `docs/release/${item.tuw_id}-rollback.md` : null,
    seed_fixture_ref: body.seed_fixture_ref ?? `fixtures/cmp-g12/${item.tuw_id}.json`,
    evidence_artifact_ref: body.evidence_artifact_ref ?? `docs/reorganization/client-matter-os/cmp-v1/evidence/${item.tuw_id}.md`,
    dry_run_only: migrationGuarded ? body.dry_run_only !== false : false,
    human_review_required: humanReviewRequired ? body.human_review_required !== false : body.human_review_required === true,
  };
}

function createDescriptor(item, body = {}) {
  requireNoForbiddenRuntimeClaim(body);
  const defaults = itemDefaults(item, body);
  const blockedClaims = [];

  if (!defaults.permission_receipt_id) blockedClaims.push("permission_receipt_required");
  if (!defaults.audit_event_type) blockedClaims.push("audit_event_required");
  if (!defaults.idempotency_key) blockedClaims.push("idempotency_key_required");
  if (defaults.migration_plan_ref && defaults.dry_run_only !== true) blockedClaims.push("migration_dry_run_only_required");
  if (["Accounting export", "Release candidate", "Go/No-go", "Production report", "Closeout"].includes(item.feature) && defaults.human_review_required !== true) {
    blockedClaims.push("human_review_required");
  }

  return Object.freeze({
    descriptor_type: `cmp_g12_${item.guardrail}_runtime_descriptor`,
    tuw_id: item.tuw_id,
    capability: item.capability,
    feature: item.feature,
    route: item.route,
    model: item.model,
    surface: item.surface,
    outcome: blockedClaims.length > 0 ? "blocked" : "review_required",
    blocked_claims: Object.freeze(blockedClaims),
    api_context: Object.freeze({
      tenant_id: defaults.tenant_id,
      actor_id: defaults.actor_id,
      permission_receipt_id: defaults.permission_receipt_id,
      audit_event_type: defaults.audit_event_type,
      idempotency_key: defaults.idempotency_key,
    }),
    enterprise_readiness_receipt: Object.freeze({
      evidence_artifact_ref: defaults.evidence_artifact_ref,
      migration_plan_ref: defaults.migration_plan_ref,
      rollback_plan_ref: defaults.rollback_plan_ref,
      seed_fixture_ref: defaults.seed_fixture_ref,
      dry_run_only: defaults.dry_run_only,
      human_review_required: defaults.human_review_required,
      secret_value_exposed: false,
      external_provider_called: false,
      product_state_written: false,
      production_deployment_executed: false,
      r4_claimed: false,
      runtime_readiness_claim: RUNTIME_READINESS,
    }),
  });
}

export function createEnterpriseReadinessRuntimeEvidence() {
  return Object.freeze({
    bounded_context: ENTERPRISE_READINESS_BOUNDED_CONTEXT,
    runtime_readiness_claim: RUNTIME_READINESS,
    item_count: ENTERPRISE_READINESS_ITEMS.length,
    items: Object.freeze(ENTERPRISE_READINESS_ITEMS.map((item) => createDescriptor(item))),
    guardrails: Object.freeze([
      "tenant_actor_permission_audit_idempotency_context",
      "migration_dry_run_vs_cutover_separation",
      "rollback_seed_synthetic_boundaries",
      "credential_reference_no_secret_exposure",
      "human_review_before_accounting_export_release_go_no_go",
      "no_r4_claim_without_durable_persistence",
    ]),
  });
}

function routeItemFor(pathname) {
  return ROUTE_TO_ITEM[pathname] ?? null;
}

export async function handleEnterpriseReadinessApiRequest({ pathname, method, query, body }) {
  try {
    requireTenant(query);

    if (pathname === "/api/enterprise-readiness/runtime/evidence") {
      if (method !== "GET") fail("CMP-G12 runtime evidence is read-only", "CMP_G12_METHOD_NOT_ALLOWED");
      return response(200, {
        outcome: "review_required",
        evidence: createEnterpriseReadinessRuntimeEvidence(),
      });
    }

    if (["/api/enterprise-readiness/secret-exposure-test", "/api/enterprise-readiness/persistence-write-test", "/api/enterprise-readiness/go-live-claim-test"].includes(pathname)) {
      requireNoForbiddenRuntimeClaim(body);
      fail("CMP-G12 negative test route requires a blocked payload", "CMP_G12_NEGATIVE_TEST_EXPECTED");
    }

    if (!["GET", "POST"].includes(method)) {
      fail("CMP-G12 route supports GET and POST only", "CMP_G12_METHOD_NOT_ALLOWED");
    }

    const item = routeItemFor(pathname);
    if (!item) fail("Unknown CMP-G12 route", "CMP_G12_ROUTE_NOT_FOUND");

    const descriptor = createDescriptor(item, { ...body, tenant_id: query.tenant_id, actor_id: query.actor_id });
    return response(descriptor.outcome === "blocked" ? 400 : 200, {
      outcome: descriptor.outcome,
      descriptor,
      runtime_readiness_claim: RUNTIME_READINESS,
    });
  } catch (error) {
    return safeError(error);
  }
}
