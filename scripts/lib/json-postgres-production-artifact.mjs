import { createHash } from "node:crypto";
import { posix } from "node:path";
import {
  parsePrivateStagingGitTree,
  privateStagingArtifactSourcePathAllowed,
} from "./private-staging-artifact.mjs";

const FORBIDDEN_ARCHIVE_ENTRY =
  /(^|\/)(\.env(?:\.|$)|\.git|artifacts|workbook)(\/|$)|\.(?:pem|key|p12|pfx|sqlite|sqlite3|db)$/iu;
const FIRST_PARTY_TEST_ENTRY = /(^|\/)(?:test|tests|__tests__)(\/|$)/iu;
const REAL_IDENTITY_MARKER =
  /@amic\.(?:kr|law)|\b(?:user|emp)_amic_[a-z0-9_]+\b/iu;
const PRIVATE_STAGING_SOURCE = /(^|\/)(?:private-staging[^/]*|[^/]*private-staging[^/]*)(?:\/|$)/iu;
const SHA256 = /^[a-f0-9]{64}$/u;

export const JSON_POSTGRES_PRODUCTION_ARTIFACT_SCHEMA =
  "law-firm-os.json-postgres-production-artifact.v1";

export const JSON_POSTGRES_PRODUCTION_SOURCE_OVERRIDES = Object.freeze([
  Object.freeze({
    source_path: "packages/master-data/src/production-client-candidates.js",
    target_path: "packages/master-data/src/amic-client-candidates.js",
    purpose: "real-clients-loaded-from-approved-postgres-migration-only",
  }),
  Object.freeze({
    source_path: "apps/api/src/production-lawos-role-registry.js",
    target_path: "apps/api/src/lawos-role-registry.js",
    purpose: "roles-loaded-from-postgres-identity-membership-only",
  }),
]);

export const JSON_POSTGRES_PRODUCTION_REDACTION_TARGETS = Object.freeze([
  "apps/api/src/lambda.js",
  "packages/matter/src/worktree-template-model.js",
]);

export const JSON_POSTGRES_PRODUCTION_REQUIRED_PROFILE_PHOTO_ENTRIES = Object.freeze([
  "apps/api/src/hrx-member-photos/167499af06d33e69afce9bf8047ec0233c4037aecda34e3056ba83f287af103f.png",
  "apps/api/src/hrx-member-photos/729b8639553bbcfd2b721efd1f8c06ab4c2e1d9c52679b64950322979548fb81.png",
  "apps/api/src/hrx-member-photos/b6ad38508be75403e379885a95ef91c3f77da7d19ac4f8635ba328f6a6da0725.png",
  "apps/api/src/hrx-member-photos/c1fd85d4f8d574a98a743afea034d702d3b4242a9c57ecf2c0ecad9e5cd31ad8.png",
  "apps/api/src/hrx-member-photos/e72b1c79fcf11f443a3d347924ffc6e8a339b004c824395d756f273f2422e9e7.png",
]);
export const JSON_POSTGRES_PRODUCTION_PUBLIC_PROFILE_CATALOG_ENTRY =
  "apps/api/src/hrx-public-professional-profile-catalog.json";
export const JSON_POSTGRES_PRODUCTION_OUTLOOK_SECRET_PUBLICATION_ENTRY = "apps/api/src/json-postgres-outlook-secret-publication.js";
export const JSON_POSTGRES_PRODUCTION_LAMBDA_ENTRYPOINT =
  "apps/api/src/lambda.js";
export const JSON_POSTGRES_PRODUCTION_PROGRAM_ADMIN_ENTRYPOINT =
  "apps/api/src/json-postgres-program-admin-lambda.js";
export const JSON_POSTGRES_PRODUCTION_OUTLOOK_RUNTIME_ENTRYPOINTS = Object.freeze([
  JSON_POSTGRES_PRODUCTION_LAMBDA_ENTRYPOINT,
  JSON_POSTGRES_PRODUCTION_PROGRAM_ADMIN_ENTRYPOINT,
]);

export function deriveJsonPostgresProductionOutlookRuntimeEntries({
  readText,
} = {}) {
  if (typeof readText !== "function") {
    throw new TypeError("production Outlook runtime source reader is required");
  }
  const entries = new Set();
  const pending = [...JSON_POSTGRES_PRODUCTION_OUTLOOK_RUNTIME_ENTRYPOINTS];
  while (pending.length) {
    const entry = pending.shift();
    if (entries.has(entry)) continue;
    if (entry.startsWith("../") || posix.isAbsolute(entry)) {
      throw new Error("production Outlook runtime import escaped the source root");
    }
    entries.add(entry);
    if (!/\.(?:c|m)?js$/u.test(entry)) continue;
    const source = String(readText(entry));
    const specifiers = [
      ...source.matchAll(
        /(?:^|\n)[ \t]*(?:import|export)\s+(?:(?:[^;])*?\s+from\s+)?["']([^"']+)["'][^;]*;/gu,
      ),
      ...source.matchAll(/\bimport\s*\(\s*["']([^"']+)["']\s*\)/gu),
    ].map((match) => match[1]);
    for (const specifier of specifiers) {
      if (specifier.startsWith(".")) {
        let imported = posix.normalize(
          posix.join(posix.dirname(entry), specifier),
        );
        if (!posix.extname(imported)) imported += ".js";
        pending.push(imported);
        continue;
      }
      const workspaceImport = /^@law-firm-os\/([a-z0-9-]+)(?:\/(.+))?$/u
        .exec(specifier);
      if (!workspaceImport) continue;
      const [, packageName, subpath] = workspaceImport;
      const packageRoot = `packages/${packageName}`;
      const packageManifest = `${packageRoot}/package.json`;
      const packageDefinition = JSON.parse(String(readText(packageManifest)));
      const exportPath = packageDefinition?.exports?.[subpath ? `./${subpath}` : "."];
      if (packageDefinition?.name !== `@law-firm-os/${packageName}`
        || typeof exportPath !== "string"
        || !exportPath.startsWith("./")) {
        throw new Error(`production Outlook runtime package export is invalid: ${specifier}`);
      }
      pending.push(packageManifest, posix.join(packageRoot, exportPath));
    }
  }
  for (const [entry, base] of [
    ["packages/persistence/src/postgres/migration-catalog.js",
      "packages/persistence/src/postgres/migrations"],
    ["packages/email-dms/src/migrations/index.js",
      "packages/email-dms/src/migrations"],
    ["packages/hrx/src/migrations/index.js", "packages/hrx/src/migrations"],
  ]) {
    if (!entries.has(entry)) {
      throw new Error(`production Lambda runtime does not reach ${entry}`);
    }
    for (const [, name] of String(readText(entry))
      .matchAll(/["'](?:\.\/)?([^"'/]+\.sql)["']/gu)) {
      entries.add(posix.join(base, name));
    }
  }
  return Object.freeze([...entries].sort());
}

export const JSON_POSTGRES_PRODUCTION_OUTLOOK_RUNTIME_ENTRIES = Object.freeze([
  "apps/api/src/admin-permission-runtime-context.js",
  "apps/api/src/ai-runtime-context.js",
  "apps/api/src/amic-bank-classification-directory.js",
  "apps/api/src/amic-vault-egress-broker-transport.js",
  "apps/api/src/amic-vault-exact-export-runtime.js",
  "apps/api/src/amic-vault-export-provider.js",
  "apps/api/src/amic-vault-http-export-provider.js",
  "apps/api/src/amic-vault-http-upload-provider.js",
  "apps/api/src/amic-vault-read-runtime.js",
  "apps/api/src/amic-vault-source-save-runtime.js",
  "apps/api/src/amic-vault-upload-provider.js",
  "apps/api/src/analytics-runtime-context.js",
  "apps/api/src/api-handler-dispatcher.js",
  "apps/api/src/auth-credential-store.js",
  "apps/api/src/auth-password-reset-queue.js",
  "apps/api/src/auth-password-reset-store.js",
  "apps/api/src/aws-secret-reference.js",
  "apps/api/src/bank-import-preview-token.js",
  "apps/api/src/client-operations-config.js",
  "apps/api/src/client-operations-migration-catalog.js",
  "apps/api/src/client-operations-migration-plan.js",
  "apps/api/src/client-operations-migration.js",
  "apps/api/src/client-operations-model-registry.js",
  "apps/api/src/client-operations-read-path.js",
  "apps/api/src/client-operations-read-providers.js",
  "apps/api/src/client-operations-readiness.js",
  "apps/api/src/client-operations-schema.js",
  "apps/api/src/client-outlook-oauth-callback.js",
  "apps/api/src/client-outlook-operational-runtime.js",
  "apps/api/src/crm-intake-runtime-context.js",
  "apps/api/src/data-cloud-runtime-context.js",
  "apps/api/src/desktop-vault-export-runtime.js",
  "apps/api/src/desktop-vault-upload-runtime.js",
  "apps/api/src/docusign-api.js",
  "apps/api/src/docusign-completion-artifact-store.js",
  "apps/api/src/docusign-runtime.js",
  "apps/api/src/enterprise-readiness-context.js",
  "apps/api/src/entra-oidc-provider.js",
  "apps/api/src/external-tenant-provisioning.js",
  "apps/api/src/finance-runtime-context.js",
  "apps/api/src/home-dashboard-operational-state.js",
  "apps/api/src/home-dashboard-runtime-context.js",
  "apps/api/src/hrx-member-roster-registry.js",
  "apps/api/src/hrx-payroll-reconciliation-checkpoint.js",
  "apps/api/src/hrx-payroll-runtime.js",
  "apps/api/src/hrx-relational-projection-input.js",
  "apps/api/src/hrx-role-scope-matrix.js",
  "apps/api/src/hrx-runtime-context.js",
  "apps/api/src/hrx-step-up-token.js",
  "apps/api/src/immutable-program-input.js",
  "apps/api/src/import-data-mapping-runtime-context.js",
  "apps/api/src/intake-engagement-completion-checkpoint.js",
  "apps/api/src/json-postgres-outlook-authority-approval.js",
  "apps/api/src/json-postgres-outlook-authority-claim-readback.js",
  "apps/api/src/json-postgres-outlook-authority-claim-store.js",
  "apps/api/src/json-postgres-outlook-authority-claim.js",
  "apps/api/src/json-postgres-outlook-authority-migration-adapter.js",
  "apps/api/src/json-postgres-outlook-authority-operation.js",
  "apps/api/src/json-postgres-outlook-authority-terminal-contract.js",
  "apps/api/src/json-postgres-outlook-authority-terminal-receipts.js",
  "apps/api/src/json-postgres-outlook-authority-terminal-storage.js",
  "apps/api/src/json-postgres-outlook-authority-terminal.js",
  "apps/api/src/json-postgres-outlook-secret-publication.js",
  "apps/api/src/json-postgres-program-admin-lambda.js",
  "apps/api/src/json-postgres-program-inputs.js",
  "apps/api/src/json-postgres-source-transform.js",
  "apps/api/src/lambda.js",
  "apps/api/src/lawos-role-registry.js",
  "apps/api/src/local-durable-store-paths.js",
  "apps/api/src/m365-credential-vault.js",
  "apps/api/src/master-data-context.js",
  "apps/api/src/matter-runtime-context.js",
  "apps/api/src/matter-runtime-replay.js",
  "apps/api/src/matter-vault-account-registry.js",
  "apps/api/src/matter-worktree-authorization.js",
  "apps/api/src/matter-worktree-read-api.js",
  "apps/api/src/matter-worktree-task-api.js",
  "apps/api/src/matter-worktree-write-api.js",
  "apps/api/src/microsoft-delegated-oauth-client.js",
  "apps/api/src/microsoft-egress-broker-transport.js",
  "apps/api/src/microsoft-office-sso-provider.js",
  "apps/api/src/middleware/actor-context.js",
  "apps/api/src/middleware/hrx-audit-write.js",
  "apps/api/src/middleware/hrx-authz.js",
  "apps/api/src/middleware/hrx-step-up-context.js",
  "apps/api/src/middleware/hrx-step-up.js",
  "apps/api/src/middleware/tenant-context.js",
  "apps/api/src/outlook-addin-runtime-context.js",
  "apps/api/src/outlook-attachment-receipt-authority.js",
  "apps/api/src/outlook-attachment-receipt-readback.js",
  "apps/api/src/outlook-conversation-canonical-message.js",
  "apps/api/src/outlook-conversation-current-authority.js",
  "apps/api/src/outlook-conversation-filing-runtime.js",
  "apps/api/src/outlook-conversation-maintenance-invocation.js",
  "apps/api/src/outlook-conversation-maintenance-worker.js",
  "apps/api/src/outlook-conversation-message-worker.js",
  "apps/api/src/outlook-conversation-operational-runtime.js",
  "apps/api/src/outlook-conversation-policy-api.js",
  "apps/api/src/outlook-conversation-recovery-worker.js",
  "apps/api/src/outlook-conversation-subscription-worker.js",
  "apps/api/src/outlook-desktop-activation-authority-reservation.js",
  "apps/api/src/outlook-desktop-activation-authority-service.js",
  "apps/api/src/outlook-desktop-activation-authority.js",
  "apps/api/src/outlook-desktop-activation-runtime-context.js",
  "apps/api/src/outlook-desktop-entitlement.js",
  "apps/api/src/outlook-desktop-installation-runtime-context.js",
  "apps/api/src/outlook-desktop-lifecycle-verifier.js",
  "apps/api/src/outlook-desktop-operational-runtime.js",
  "apps/api/src/outlook-document-api.js",
  "apps/api/src/outlook-email-filing-correction-permissions.js",
  "apps/api/src/outlook-email-filing-correction-projection-validation.js",
  "apps/api/src/outlook-email-filing-correction-projection.js",
  "apps/api/src/outlook-email-filing-correction-repository.js",
  "apps/api/src/outlook-email-filing-correction-response.js",
  "apps/api/src/outlook-email-filing-correction.js",
  "apps/api/src/outlook-graph-webhook.js",
  "apps/api/src/outlook-inquiry-registration-service.js",
  "apps/api/src/outlook-installation-protected-route-gate.js",
  "apps/api/src/outlook-installation-route-policy.js",
  "apps/api/src/outlook-matter-search-contract.js",
  "apps/api/src/outlook-matter-write-guard.js",
  "apps/api/src/outlook-operation-receipt-durable-chain.js",
  "apps/api/src/outlook-operation-receipt-readback.js",
  "apps/api/src/outlook-operation-response.js",
  "apps/api/src/outlook-precedent-runtime-context.js",
  "apps/api/src/outlook-readiness.js",
  "apps/api/src/outlook-time-entry-draft-adapter.js",
  "apps/api/src/outlook-time-entry-role-authority.js",
  "apps/api/src/outlook-trusted-current-installation.js",
  "apps/api/src/outlook-vault-attachment-delivery-runtime.js",
  "apps/api/src/outlook-vault-delivery-token.js",
  "apps/api/src/password-reset-email-template.js",
  "apps/api/src/people-outlook-completion-checkpoint.js",
  "apps/api/src/people-outlook-oauth-callback.js",
  "apps/api/src/people-outlook-operational-runtime.js",
  "apps/api/src/permission-gate.js",
  "apps/api/src/persistence-authority.js",
  "apps/api/src/portal-runtime-context.js",
  "apps/api/src/postgres-api-runtime-authority.js",
  "apps/api/src/postgres-m365-cleanup-session.js",
  "apps/api/src/postgres-m365-conversation-port.js",
  "apps/api/src/postgres-m365-mail-port.js",
  "apps/api/src/postgres-only-runtime-configuration.js",
  "apps/api/src/production-migration-catalog-readback-event.js",
  "apps/api/src/production-migration-catalog-readback-live-authority.js",
  "apps/api/src/production-migration-catalog-readback.js",
  "apps/api/src/program-evidence-retention.js",
  "apps/api/src/record-actions-runtime-context.js",
  "apps/api/src/reports-runtime-context.js",
  "apps/api/src/routes/admin-permission.js",
  "apps/api/src/routes/crm.js",
  "apps/api/src/routes/data-cloud.js",
  "apps/api/src/routes/hrx/ai.js",
  "apps/api/src/routes/hrx/leave-provider-callback.js",
  "apps/api/src/routes/hrx/payroll-runtime.js",
  "apps/api/src/routes/hrx/payroll-statement-provider-callback.js",
  "apps/api/src/routes/hrx/payroll.js",
  "apps/api/src/routes/hrx/route-policy-map.js",
  "apps/api/src/routes/import-data-mapping.js",
  "apps/api/src/routes/record-actions.js",
  "apps/api/src/routes/reports.js",
  "apps/api/src/runtime-profile.js",
  "apps/api/src/server.js",
  "apps/api/src/session-auth.js",
  "apps/api/src/session-object-acl-authority.js",
  "apps/api/src/staff-auth-authority.js",
  "apps/api/src/store-path-manifest.js",
  "apps/api/src/ui-readiness-context.js",
  "apps/api/src/vault-capability-projection.js",
  "apps/api/src/vault-dms-runtime-context.js",
  "apps/api/src/vault-operation-owner.js",
  "apps/api/src/vault-precedent-runtime-context.js",
  "packages/admin/src/client-matter-g7.js",
  "packages/admin/src/index.js",
  "packages/admin/src/permission-admin-service.js",
  "packages/admin/src/registry.js",
  "packages/admin/src/service.js",
  "packages/admin/src/validators.js",
  "packages/ai-governance/src/audit.js",
  "packages/ai-governance/src/central-ledger.js",
  "packages/ai-governance/src/export-control-service.js",
  "packages/ai-governance/src/output-service.js",
  "packages/ai-governance/src/policy-service.js",
  "packages/ai-governance/src/prompt-log-service.js",
  "packages/ai-governance/src/retrieval-service.js",
  "packages/ai-governance/src/runtime-repository.js",
  "packages/analytics/src/audit.js",
  "packages/analytics/src/central-ledger.js",
  "packages/analytics/src/client-operations-read-model.js",
  "packages/analytics/src/dashboard-service.js",
  "packages/analytics/src/export-control-service.js",
  "packages/analytics/src/finance-read-model.js",
  "packages/analytics/src/metrics-service.js",
  "packages/analytics/src/refresh-job-service.js",
  "packages/analytics/src/runtime-repository.js",
  "packages/audit/src/durable-audit-store.js",
  "packages/audit/src/events.js",
  "packages/audit/src/hrx-event-store-sql.js",
  "packages/audit/src/hrx-event-store.js",
  "packages/audit/src/hrx-events.js",
  "packages/audit/src/hrx-hash-chain.js",
  "packages/authz/src/admin-simulator.js",
  "packages/authz/src/api-fixture-ui-readiness-catalog.js",
  "packages/authz/src/api-permission-audit-binding.js",
  "packages/authz/src/api-synthetic-fixture-set.js",
  "packages/authz/src/break-glass-service.js",
  "packages/authz/src/ethical-wall-store.js",
  "packages/authz/src/evaluate.js",
  "packages/authz/src/failure-taxonomy-evidence-harness.js",
  "packages/authz/src/failure-taxonomy-risk-boundary.js",
  "packages/authz/src/failure-taxonomy-test-fixture-boundary.js",
  "packages/authz/src/failure-taxonomy-workflow-binding.js",
  "packages/authz/src/fixture-evidence-permission-matrix.js",
  "packages/authz/src/fixture-evidence-review-readiness-catalog.js",
  "packages/authz/src/fixture-workflow-binding.js",
  "packages/authz/src/foundation-catalog.js",
  "packages/authz/src/hermes-evidence-synthetic-fixture-boundary.js",
  "packages/authz/src/hermes-evidence-synthetic-fixture-verdict-boundary.js",
  "packages/authz/src/hermes-evidence-workflow-binding.js",
  "packages/authz/src/hrx-break-glass.js",
  "packages/authz/src/hrx-candidate-policy.js",
  "packages/authz/src/hrx-compensation-policy.js",
  "packages/authz/src/hrx-evaluation-policy.js",
  "packages/authz/src/hrx-policy-engine.js",
  "packages/authz/src/hrx-sensitive-scopes.js",
  "packages/authz/src/hrx-step-up-session.js",
  "packages/authz/src/index.js",
  "packages/authz/src/interface-closeout-catalog.js",
  "packages/authz/src/legal-hold-store.js",
  "packages/authz/src/matter-permission-envelope.js",
  "packages/authz/src/model-service-catalog.js",
  "packages/authz/src/object-acl-store.js",
  "packages/authz/src/permission-audit-terminal-boundary.js",
  "packages/authz/src/permission-context-store.js",
  "packages/authz/src/permission-controls.js",
  "packages/authz/src/permission-fixture-failure-taxonomy.js",
  "packages/authz/src/permission-matrix-risk-boundary.js",
  "packages/authz/src/permission-matrix-workflow-binding.js",
  "packages/authz/src/policy-store.js",
  "packages/authz/src/privacy-minimization.js",
  "packages/authz/src/service-workflow.js",
  "packages/authz/src/sso-subject-map.js",
  "packages/authz/src/synthetic-fixture-boundary.js",
  "packages/authz/src/terminal-review-closeout-readiness-catalog.js",
  "packages/authz/src/terminal-review-question-boundary.js",
  "packages/authz/src/trust-context.js",
  "packages/authz/src/trust-runtime-store.js",
  "packages/authz/src/ui-evidence-state-snapshot.js",
  "packages/authz/src/ui-permission-audit-binding.js",
  "packages/authz/src/ui-synthetic-fixture-golden-case-catalog.js",
  "packages/authz/src/vault-object-acl.js",
  "packages/billing/src/bank-classification-service.js",
  "packages/billing/src/bank-transaction-service.js",
  "packages/billing/src/central-ledger.js",
  "packages/billing/src/client-deposit-allocation-model.js",
  "packages/billing/src/client-deposit-allocation-service.js",
  "packages/billing/src/client-deposit-reallocation-service.js",
  "packages/billing/src/client-deposit-revenue-service.js",
  "packages/billing/src/client-deposit-source.js",
  "packages/billing/src/client-receivables-service.js",
  "packages/billing/src/fee-commitment-model.js",
  "packages/billing/src/fee-commitment-service.js",
  "packages/billing/src/finance-audit.js",
  "packages/billing/src/finance-repository.js",
  "packages/billing/src/invoice-pdf-service.js",
  "packages/billing/src/invoice-service.js",
  "packages/billing/src/prebill-service.js",
  "packages/billing/src/wip-service.js",
  "packages/client-portal/src/approval-service.js",
  "packages/client-portal/src/audit.js",
  "packages/client-portal/src/central-ledger.js",
  "packages/client-portal/src/external-user-service.js",
  "packages/client-portal/src/magic-link-service.js",
  "packages/client-portal/src/portal-projection-service.js",
  "packages/client-portal/src/rfi-service.js",
  "packages/client-portal/src/runtime-repository.js",
  "packages/client-portal/src/secure-link-service.js",
  "packages/crm/src/activity-service.js",
  "packages/crm/src/audit.js",
  "packages/crm/src/central-ledger.js",
  "packages/crm/src/engagement-decision-service.js",
  "packages/crm/src/inquiry-read-model.js",
  "packages/crm/src/intake-handoff-service.js",
  "packages/crm/src/lead-inquiry-service.js",
  "packages/crm/src/lead-service.js",
  "packages/crm/src/model.js",
  "packages/crm/src/opportunity-service.js",
  "packages/crm/src/runtime-repository.js",
  "packages/data-cloud/src/index.js",
  "packages/data-cloud/src/service.js",
  "packages/data-room/src/data-room-runtime-service.js",
  "packages/dms/src/audit.js",
  "packages/dms/src/central-ledger.js",
  "packages/dms/src/document-service.js",
  "packages/dms/src/file-object-service.js",
  "packages/dms/src/json-postgres-dms-migration.js",
  "packages/dms/src/migrations/index.js",
  "packages/dms/src/model.js",
  "packages/dms/src/persistence-guard.js",
  "packages/dms/src/postgres-consumer-storage.js",
  "packages/dms/src/postgres-upload-runtime.js",
  "packages/dms/src/precedent-source.js",
  "packages/dms/src/registry.js",
  "packages/dms/src/repository.js",
  "packages/dms/src/search/document-privilege-repository.js",
  "packages/dms/src/search/index-repository.js",
  "packages/dms/src/search/indexer.js",
  "packages/dms/src/search/postgres-precedent-repository.js",
  "packages/dms/src/search/precedent-common.js",
  "packages/dms/src/search/precedent-cursor.js",
  "packages/dms/src/search/precedent-extraction-receipt.js",
  "packages/dms/src/search/precedent-index-repository.js",
  "packages/dms/src/search/precedent-persistence.js",
  "packages/dms/src/search/precedent-readiness-repository.js",
  "packages/dms/src/search/precedent-registry-repository.js",
  "packages/dms/src/search/precedent-search-repository.js",
  "packages/dms/src/search/search-service.js",
  "packages/dms/src/storage/bounded-storage-read.js",
  "packages/dms/src/storage/download-service.js",
  "packages/dms/src/storage/file-bounded-object-reader.js",
  "packages/dms/src/storage/file-quarantine-authority.js",
  "packages/dms/src/storage/file-root-binding.js",
  "packages/dms/src/storage/file-storage-adapter.js",
  "packages/dms/src/storage/file-storage-lifecycle.js",
  "packages/dms/src/storage/file-storage-paths.js",
  "packages/dms/src/storage/local-storage-adapter.js",
  "packages/dms/src/storage/quarantine-record.js",
  "packages/dms/src/storage/s3-bounded-client.js",
  "packages/dms/src/storage/s3-bounded-commands.js",
  "packages/dms/src/storage/s3-bounded-http-handler.js",
  "packages/dms/src/storage/s3-bounded-http-runtime.js",
  "packages/dms/src/storage/s3-bounded-object-reader.js",
  "packages/dms/src/storage/s3-object-governance.js",
  "packages/dms/src/storage/s3-provider-body.js",
  "packages/dms/src/storage/s3-provider-response.js",
  "packages/dms/src/storage/s3-staged-object-lifecycle.js",
  "packages/dms/src/storage/s3-storage-adapter-placeholder.js",
  "packages/dms/src/storage/s3-storage-adapter.js",
  "packages/dms/src/storage/storage-adapter.js",
  "packages/dms/src/vault-object.js",
  "packages/dms/src/vault-operation-receipt.js",
  "packages/dms/src/vault-permission-service.js",
  "packages/dms/src/workspace-service.js",
  "packages/email-dms/src/central-ledger.js",
  "packages/email-dms/src/conversation-sync-model.js",
  "packages/email-dms/src/durable-mime-authority.js",
  "packages/email-dms/src/email-filing-canonical.js",
  "packages/email-dms/src/email-filing-correction-model.js",
  "packages/email-dms/src/email-filing-correction-service.js",
  "packages/email-dms/src/email-filing-correction-trust-boundary.js",
  "packages/email-dms/src/email-filing-original-resolver.js",
  "packages/email-dms/src/email-filing-service.js",
  "packages/email-dms/src/email-model.js",
  "packages/email-dms/src/exact-document-id.js",
  "packages/email-dms/src/graph-cursor-codec.js",
  "packages/email-dms/src/graph-delta-reconciliation-service.js",
  "packages/email-dms/src/graph-notification-model.js",
  "packages/email-dms/src/graph-subscription-binding.js",
  "packages/email-dms/src/inquiry-evidence-model.js",
  "packages/email-dms/src/inquiry-evidence-storage-service.js",
  "packages/email-dms/src/m365-connection-model.js",
  "packages/email-dms/src/m365-conversation-sync-port.js",
  "packages/email-dms/src/m365-graph-connection-service.js",
  "packages/email-dms/src/m365-graph-ports.js",
  "packages/email-dms/src/microsoft-graph-conversation-provider.js",
  "packages/email-dms/src/microsoft-graph-mail-provider.js",
  "packages/email-dms/src/migrations/001_m365_connection.sql",
  "packages/email-dms/src/migrations/002_inquiry_evidence.sql",
  "packages/email-dms/src/migrations/003_email_filing_correction.sql",
  "packages/email-dms/src/migrations/004_outlook_conversation_sync.sql",
  "packages/email-dms/src/migrations/005_outlook_desktop_installation.sql",
  "packages/email-dms/src/migrations/006_outlook_desktop_release_trust.sql",
  "packages/email-dms/src/migrations/007_outlook_desktop_assignment.sql",
  "packages/email-dms/src/migrations/008_outlook_desktop_trusted_current_read.sql",
  "packages/email-dms/src/migrations/009_outlook_desktop_legacy_windows_compatibility.sql",
  "packages/email-dms/src/migrations/index.js",
  "packages/email-dms/src/outlook-desktop-activation-bindings.js",
  "packages/email-dms/src/outlook-desktop-activation-challenge.js",
  "packages/email-dms/src/outlook-desktop-activation-contract.js",
  "packages/email-dms/src/outlook-desktop-activation-local-measurement.js",
  "packages/email-dms/src/outlook-desktop-activation-operator-receipt.js",
  "packages/email-dms/src/outlook-desktop-activation-primitives.js",
  "packages/email-dms/src/outlook-desktop-activation-release.js",
  "packages/email-dms/src/outlook-desktop-activation-result.js",
  "packages/email-dms/src/outlook-desktop-activation-schema.js",
  "packages/email-dms/src/outlook-desktop-assignment-authority-catalog.js",
  "packages/email-dms/src/outlook-desktop-assignment-authority-readback.js",
  "packages/email-dms/src/outlook-desktop-assignment-bootstrap-authority.js",
  "packages/email-dms/src/outlook-desktop-assignment-contract.js",
  "packages/email-dms/src/outlook-desktop-assignment-migration-postflight.js",
  "packages/email-dms/src/outlook-desktop-installation-model.js",
  "packages/email-dms/src/outlook-desktop-installation-proof.js",
  "packages/email-dms/src/outlook-desktop-lifecycle-proof.js",
  "packages/email-dms/src/outlook-desktop-release-artifact-authority.js",
  "packages/email-dms/src/outlook-desktop-release-artifact-snapshot.js",
  "packages/email-dms/src/outlook-desktop-release-ticket-verifier.js",
  "packages/email-dms/src/outlook-desktop-trusted-current-read-authority-catalog.js",
  "packages/email-dms/src/outlook-source-identity.js",
  "packages/email-dms/src/people-outlook-connection-model.js",
  "packages/email-dms/src/postgres-conversation-maintenance-authority.js",
  "packages/email-dms/src/postgres-conversation-maintenance-store.js",
  "packages/email-dms/src/postgres-conversation-policy-service.js",
  "packages/email-dms/src/postgres-conversation-sync-store.js",
  "packages/email-dms/src/postgres-graph-notification-queue.js",
  "packages/email-dms/src/postgres-graph-subscription-cleanup.js",
  "packages/email-dms/src/postgres-graph-subscription-create-recovery.js",
  "packages/email-dms/src/postgres-graph-subscription-service.js",
  "packages/email-dms/src/postgres-graph-subscription-state-support.js",
  "packages/email-dms/src/postgres-graph-subscription-state.js",
  "packages/email-dms/src/postgres-outlook-desktop-activation-control-authority.js",
  "packages/email-dms/src/postgres-outlook-desktop-installation-authority-service.js",
  "packages/email-dms/src/postgres-outlook-desktop-installation-service.js",
  "packages/email-dms/src/postgres-outlook-desktop-lifecycle-authority.js",
  "packages/email-dms/src/repository-mime-authority.js",
  "packages/email-dms/src/repository.js",
  "packages/enterprise/src/central-ledger.js",
  "packages/enterprise/src/enterprise-readiness-repository.js",
  "packages/enterprise/src/enterprise-readiness-service.js",
  "packages/hrx/src/ai/answer-schema.js",
  "packages/hrx/src/ai/audit.js",
  "packages/hrx/src/ai/citation-validator.js",
  "packages/hrx/src/ai/decision-guard.js",
  "packages/hrx/src/ai/model-gateway.js",
  "packages/hrx/src/ai/model-provider-registry.js",
  "packages/hrx/src/ai/rag.js",
  "packages/hrx/src/ai/review-queue-sql.js",
  "packages/hrx/src/ai/review-queue.js",
  "packages/hrx/src/ai/source-ingestion.js",
  "packages/hrx/src/ai/source-registry.js",
  "packages/hrx/src/analytics.js",
  "packages/hrx/src/approval.js",
  "packages/hrx/src/attendance-correction-workflow.js",
  "packages/hrx/src/attendance.js",
  "packages/hrx/src/company-policy-manifest.js",
  "packages/hrx/src/compensation.js",
  "packages/hrx/src/contracts.js",
  "packages/hrx/src/documents.js",
  "packages/hrx/src/documents/source-adapter.js",
  "packages/hrx/src/employee-lifecycle.js",
  "packages/hrx/src/employment-profile.js",
  "packages/hrx/src/identity-link.js",
  "packages/hrx/src/leave/accrual-batch-repository.js",
  "packages/hrx/src/leave/accrual-batch-service.js",
  "packages/hrx/src/leave/accrual-period-generator.js",
  "packages/hrx/src/leave/accrual-service.js",
  "packages/hrx/src/leave/allocation.js",
  "packages/hrx/src/leave/approval-delegation.js",
  "packages/hrx/src/leave/balance.js",
  "packages/hrx/src/leave/entitlement-command-service.js",
  "packages/hrx/src/leave/entitlement-lifecycle.js",
  "packages/hrx/src/leave/entitlement-read-service.js",
  "packages/hrx/src/leave/expiration-service.js",
  "packages/hrx/src/leave/integration-service.js",
  "packages/hrx/src/leave/management-service.js",
  "packages/hrx/src/leave/occurrence-upload-batch-service.js",
  "packages/hrx/src/leave/policy-service.js",
  "packages/hrx/src/leave/promotion-balance.js",
  "packages/hrx/src/leave/promotion-service.js",
  "packages/hrx/src/leave/provider-adapters.js",
  "packages/hrx/src/leave/reporting-service.js",
  "packages/hrx/src/leave/request-service.js",
  "packages/hrx/src/leave/termination-service.js",
  "packages/hrx/src/leave/type-economics.js",
  "packages/hrx/src/leave/work-schedule.js",
  "packages/hrx/src/leave/xlsx-export.js",
  "packages/hrx/src/legal-people-api.js",
  "packages/hrx/src/legal-people-ethics.js",
  "packages/hrx/src/legal-people-relationship-ledger.js",
  "packages/hrx/src/lifecycle-template.js",
  "packages/hrx/src/matter-people-document-graph.js",
  "packages/hrx/src/migrations/001_hrx_core.sql",
  "packages/hrx/src/migrations/002_hrx_documents_leave_audit.sql",
  "packages/hrx/src/migrations/003_hrx_ai_analytics.sql",
  "packages/hrx/src/migrations/004_hrx_attendance.sql",
  "packages/hrx/src/migrations/005_hrx_overtime.sql",
  "packages/hrx/src/migrations/006_hrx_recruiting_lifecycle.sql",
  "packages/hrx/src/migrations/007_hrx_leave_management.sql",
  "packages/hrx/src/migrations/008_hrx_leave_reporting.sql",
  "packages/hrx/src/migrations/009_hrx_leave_promotion.sql",
  "packages/hrx/src/migrations/010_hrx_leave_integrations.sql",
  "packages/hrx/src/migrations/011_hrx_leave_type_economics.sql",
  "packages/hrx/src/migrations/012_hrx_leave_job_outbox.sql",
  "packages/hrx/src/migrations/013_hrx_leave_accrual_batches.sql",
  "packages/hrx/src/migrations/014_hrx_leave_occurrence_metadata.sql",
  "packages/hrx/src/migrations/015_hrx_leave_occurrence_upload_batches.sql",
  "packages/hrx/src/migrations/016_hrx_leave_promotion_exclusions.sql",
  "packages/hrx/src/migrations/017_hrx_leave_promotion_notice_hashes.sql",
  "packages/hrx/src/migrations/018_hrx_leave_promotion_evidence_receipts.sql",
  "packages/hrx/src/migrations/019_hrx_leave_integration_dead_letters.sql",
  "packages/hrx/src/migrations/020_hrx_leave_rule_snapshots.sql",
  "packages/hrx/src/migrations/021_hrx_payroll_runtime.sql",
  "packages/hrx/src/migrations/022_hrx_payroll_inputs.sql",
  "packages/hrx/src/migrations/023_hrx_payroll_profile_units.sql",
  "packages/hrx/src/migrations/024_hrx_payroll_run_controls.sql",
  "packages/hrx/src/migrations/025_hrx_payroll_year_end.sql",
  "packages/hrx/src/migrations/026_hrx_payroll_catalog_assignments.sql",
  "packages/hrx/src/migrations/027_hrx_attendance_approval_receipts.sql",
  "packages/hrx/src/migrations/028_hrx_leave_accrual_rule_versions.sql",
  "packages/hrx/src/migrations/029_hrx_leave_accrual_rule_version_index.sql",
  "packages/hrx/src/migrations/030_hrx_operational_authority.sql",
  "packages/hrx/src/migrations/031_hrx_leave_command_receipts_append_only.sql",
  "packages/hrx/src/migrations/032_hrx_professional_profile.sql",
  "packages/hrx/src/migrations/033_hrx_lifecycle_templates.sql",
  "packages/hrx/src/migrations/034_hrx_offboarding_evidence.sql",
  "packages/hrx/src/migrations/035_hrx_attendance_immutability.sql",
  "packages/hrx/src/migrations/036_hrx_attendance_correction_requests.sql",
  "packages/hrx/src/migrations/037_hrx_leave_provider_result_state.sql",
  "packages/hrx/src/migrations/038_hrx_overtime_minutes.sql",
  "packages/hrx/src/migrations/039_hrx_payroll_adjustment_keys.sql",
  "packages/hrx/src/migrations/040_hrx_payroll_provider_states.sql",
  "packages/hrx/src/migrations/041_hrx_offboarding_leave_evidence.sql",
  "packages/hrx/src/migrations/042_hrx_payroll_statement_provider_events.sql",
  "packages/hrx/src/migrations/043_hrx_minimum_wage_legal_review.sql",
  "packages/hrx/src/migrations/044_hrx_payroll_provider_attempts.sql",
  "packages/hrx/src/migrations/045_hrx_leave_promotion_fingerprint.sql",
  "packages/hrx/src/migrations/046_hrx_payment_reconciliation_staging.sql",
  "packages/hrx/src/migrations/047_hrx_payroll_filing_corrections.sql",
  "packages/hrx/src/migrations/048_hrx_recruiting_pipeline_receipts.sql",
  "packages/hrx/src/migrations/index.js",
  "packages/hrx/src/observability.js",
  "packages/hrx/src/offboarding-evidence.js",
  "packages/hrx/src/offboarding.js",
  "packages/hrx/src/onboarding.js",
  "packages/hrx/src/outlook-calendar-privacy.js",
  "packages/hrx/src/outlook-meeting-classifier.js",
  "packages/hrx/src/overtime.js",
  "packages/hrx/src/payroll-boundary.js",
  "packages/hrx/src/payroll-export-service.js",
  "packages/hrx/src/payroll-item-catalog.js",
  "packages/hrx/src/payroll-profile-service.js",
  "packages/hrx/src/payroll-time-input-snapshot.js",
  "packages/hrx/src/payroll/allowance-rule-service.js",
  "packages/hrx/src/payroll/calculation-engine.js",
  "packages/hrx/src/payroll/close-precheck.js",
  "packages/hrx/src/payroll/deduction-engine.js",
  "packages/hrx/src/payroll/document-service.js",
  "packages/hrx/src/payroll/filing-service.js",
  "packages/hrx/src/payroll/input-snapshot-service.js",
  "packages/hrx/src/payroll/minimum-wage.js",
  "packages/hrx/src/payroll/money.js",
  "packages/hrx/src/payroll/payment-service.js",
  "packages/hrx/src/payroll/repository.js",
  "packages/hrx/src/payroll/run-service.js",
  "packages/hrx/src/payroll/statutory-rule-service.js",
  "packages/hrx/src/payroll/year-end-service.js",
  "packages/hrx/src/people-action-queues.js",
  "packages/hrx/src/people-attention-window.js",
  "packages/hrx/src/people-capacity.js",
  "packages/hrx/src/people-daily-brief.js",
  "packages/hrx/src/people-deadline-staffing.js",
  "packages/hrx/src/people-event-dedupe.js",
  "packages/hrx/src/people-feature-flags.js",
  "packages/hrx/src/people-intervals.js",
  "packages/hrx/src/people-leave-intervals.js",
  "packages/hrx/src/people-matter-selectors.js",
  "packages/hrx/src/people-presentation.js",
  "packages/hrx/src/people-source-envelope.js",
  "packages/hrx/src/people-team-operations.js",
  "packages/hrx/src/people-workload-stage1.js",
  "packages/hrx/src/postgres-migrations.js",
  "packages/hrx/src/postgres-projection-role.js",
  "packages/hrx/src/postgres-store-v2.js",
  "packages/hrx/src/provider-receipt-contract.js",
  "packages/hrx/src/recruiting/application.js",
  "packages/hrx/src/recruiting/candidate.js",
  "packages/hrx/src/recruiting/consent.js",
  "packages/hrx/src/recruiting/conversion-service.js",
  "packages/hrx/src/recruiting/convert-to-employee.js",
  "packages/hrx/src/recruiting/interview.js",
  "packages/hrx/src/recruiting/job-opening.js",
  "packages/hrx/src/recruiting/offer.js",
  "packages/hrx/src/recruiting/privacy.js",
  "packages/hrx/src/relational-projection-contract.js",
  "packages/hrx/src/relational-projection-reader.js",
  "packages/hrx/src/relational-projection-validation.js",
  "packages/hrx/src/relational-read-projection.js",
  "packages/hrx/src/repository-sql.js",
  "packages/hrx/src/repository.js",
  "packages/hrx/src/risk-event.js",
  "packages/hrx/src/rules/leave-policy.js",
  "packages/hrx/src/schema.js",
  "packages/hrx/src/store/file-store.js",
  "packages/hrx/src/store/port.js",
  "packages/import-data/src/amic-cashflow-source.js",
  "packages/import-data/src/index.js",
  "packages/import-data/src/service.js",
  "packages/intake/src/audit.js",
  "packages/intake/src/central-ledger.js",
  "packages/intake/src/clearance-token-service.js",
  "packages/intake/src/conflict-check-service.js",
  "packages/intake/src/conflict-decision-service.js",
  "packages/intake/src/conflict-search-service.js",
  "packages/intake/src/engagement-approval-binding.js",
  "packages/intake/src/engagement-approval-command.js",
  "packages/intake/src/engagement-approval-persistence.js",
  "packages/intake/src/engagement-approval-response.js",
  "packages/intake/src/engagement-legacy-idempotency-readiness.js",
  "packages/intake/src/engagement-service.js",
  "packages/intake/src/intake-request-service.js",
  "packages/intake/src/model.js",
  "packages/intake/src/runtime-repository.js",
  "packages/intake/src/waiver-service.js",
  "packages/integrations-core/src/client-matter-g7.js",
  "packages/integrations-core/src/docusign-action-result.js",
  "packages/integrations-core/src/docusign-approved-matter-source.js",
  "packages/integrations-core/src/docusign-completion-artifacts.js",
  "packages/integrations-core/src/docusign-completion-authority.js",
  "packages/integrations-core/src/docusign-completion-operation.js",
  "packages/integrations-core/src/docusign-envelope-adapter.js",
  "packages/integrations-core/src/docusign-envelope-authority.js",
  "packages/integrations-core/src/docusign-envelope-events.js",
  "packages/integrations-core/src/docusign-envelope-model.js",
  "packages/integrations-core/src/docusign-envelope-outbox.js",
  "packages/integrations-core/src/docusign-envelope-reconcile.js",
  "packages/integrations-core/src/docusign-envelope-repository.js",
  "packages/integrations-core/src/docusign-envelope-send.js",
  "packages/integrations-core/src/docusign-event-model.js",
  "packages/integrations-core/src/docusign-postgres-repository.js",
  "packages/integrations-core/src/hrx-m365-doc-source.js",
  "packages/integrations-core/src/index.js",
  "packages/integrations-core/src/outlook-calendar-cache.js",
  "packages/integrations-core/src/outlook-calendar-view.js",
  "packages/integrations-core/src/outlook-consent-repository.js",
  "packages/integrations-core/src/outlook-consent-transition.js",
  "packages/integrations-core/src/outlook-token-vault-port.js",
  "packages/integrations-core/src/outlook-token-vault.js",
  "packages/integrations-core/src/people-outlook-calendar-source.js",
  "packages/integrations-core/src/people-outlook-connection.js",
  "packages/integrations-core/src/people-provider-identity-helpers.js",
  "packages/integrations-core/src/people-provider-identity-operations.js",
  "packages/integrations-core/src/people-provider-identity-rebind.js",
  "packages/integrations-core/src/people-provider-identity-registry.js",
  "packages/integrations-core/src/people-provider-identity-repository.js",
  "packages/integrations-core/src/people-provider-identity-state.js",
  "packages/integrations-core/src/people-provider-identity.js",
  "packages/integrations-core/src/registry.js",
  "packages/integrations-core/src/service.js",
  "packages/integrations-core/src/validators.js",
  "packages/master-data/src/alias-service.js",
  "packages/master-data/src/amic-client-candidates.js",
  "packages/master-data/src/audit.js",
  "packages/master-data/src/billing-profile-service.js",
  "packages/master-data/src/central-ledger.js",
  "packages/master-data/src/client-group-service.js",
  "packages/master-data/src/client-registration-service.js",
  "packages/master-data/src/contact-point-service.js",
  "packages/master-data/src/crm-canonical-write-service.js",
  "packages/master-data/src/duplicate-service.js",
  "packages/master-data/src/identifier-service.js",
  "packages/master-data/src/index.js",
  "packages/master-data/src/merge-split-service.js",
  "packages/master-data/src/migrations/index.js",
  "packages/master-data/src/model.js",
  "packages/master-data/src/organization-service.js",
  "packages/master-data/src/person-service.js",
  "packages/master-data/src/reference-integrity.js",
  "packages/master-data/src/registry.js",
  "packages/master-data/src/relationship-service.js",
  "packages/master-data/src/repository.js",
  "packages/master-data/src/service.js",
  "packages/master-data/src/validators.js",
  "packages/matter/src/activity-calendar-channel-service.js",
  "packages/matter/src/agreement-docx-renderer.js",
  "packages/matter/src/agreement-docx.js",
  "packages/matter/src/agreement-input.js",
  "packages/matter/src/amic-matter-code-candidates.js",
  "packages/matter/src/approved-document-builder-service.js",
  "packages/matter/src/audit.js",
  "packages/matter/src/calendar-service.js",
  "packages/matter/src/canonical-identity-service.js",
  "packages/matter/src/central-ledger.js",
  "packages/matter/src/client-matter-g4.js",
  "packages/matter/src/client-report.js",
  "packages/matter/src/closing-service.js",
  "packages/matter/src/deadline-dual-control.js",
  "packages/matter/src/document-approval-service.js",
  "packages/matter/src/document-builder-events.js",
  "packages/matter/src/document-builder-safe-projection.js",
  "packages/matter/src/document-builder-values.js",
  "packages/matter/src/document-email-builder-service.js",
  "packages/matter/src/document-publication-reconciliation.js",
  "packages/matter/src/document-publication-service.js",
  "packages/matter/src/document-template-authority.js",
  "packages/matter/src/email-ai-matter-review-service.js",
  "packages/matter/src/hr-risk-link.js",
  "packages/matter/src/hrx-workload-projection.js",
  "packages/matter/src/index.js",
  "packages/matter/src/intake-dependency-guard.js",
  "packages/matter/src/matter-opening-authority.js",
  "packages/matter/src/matter-opening-orchestrator.js",
  "packages/matter/src/matter-opening-service.js",
  "packages/matter/src/matter-party-service.js",
  "packages/matter/src/matter-profile-service.js",
  "packages/matter/src/matter-vault-link-repository.js",
  "packages/matter/src/matter-vault-link.js",
  "packages/matter/src/migrations/index.js",
  "packages/matter/src/model.js",
  "packages/matter/src/numbering-service.js",
  "packages/matter/src/opening-service.js",
  "packages/matter/src/outlook-task-adapter.js",
  "packages/matter/src/people-assignment-authority.js",
  "packages/matter/src/people-calendar-cutover.js",
  "packages/matter/src/people-calendar-migration.js",
  "packages/matter/src/people-data-migration.js",
  "packages/matter/src/people-member-cutover.js",
  "packages/matter/src/people-member-migration.js",
  "packages/matter/src/people-task-cutover.js",
  "packages/matter/src/people-task-migration.js",
  "packages/matter/src/practice-area.js",
  "packages/matter/src/registry.js",
  "packages/matter/src/repository-record.js",
  "packages/matter/src/repository-v2.js",
  "packages/matter/src/repository.js",
  "packages/matter/src/role-policy.js",
  "packages/matter/src/service.js",
  "packages/matter/src/staffing-service.js",
  "packages/matter/src/status-history.js",
  "packages/matter/src/task-service.js",
  "packages/matter/src/timeline-cursor-authority.js",
  "packages/matter/src/timeline-projection.js",
  "packages/matter/src/timeline-read-model.js",
  "packages/matter/src/timeline-repository.js",
  "packages/matter/src/validators.js",
  "packages/matter/src/visibility-service.js",
  "packages/matter/src/worktree-concurrency.js",
  "packages/matter/src/worktree-model.js",
  "packages/matter/src/worktree-mutation.js",
  "packages/matter/src/worktree-projection.js",
  "packages/matter/src/worktree-structure.js",
  "packages/matter/src/worktree-template-model.js",
  "packages/matter/src/worktree-template-snapshot.js",
  "packages/payments/src/accounting-export-service.js",
  "packages/payments/src/ar-service.js",
  "packages/payments/src/matching-service.js",
  "packages/payments/src/payment-allocation-service.js",
  "packages/payments/src/payment-service.js",
  "packages/payments/src/trust-ledger-service.js",
  "packages/persistence/src/backup.js",
  "packages/persistence/src/config.js",
  "packages/persistence/src/connection.js",
  "packages/persistence/src/credential-reference.js",
  "packages/persistence/src/domain-ledger.js",
  "packages/persistence/src/durable-append.js",
  "packages/persistence/src/durable-file.js",
  "packages/persistence/src/hmac-envelope.js",
  "packages/persistence/src/id.js",
  "packages/persistence/src/idempotency.js",
  "packages/persistence/src/index.js",
  "packages/persistence/src/lifecycle.js",
  "packages/persistence/src/migration-runner.js",
  "packages/persistence/src/migrations/index.js",
  "packages/persistence/src/outbox.js",
  "packages/persistence/src/postgres/application-role.js",
  "packages/persistence/src/postgres/authority-bundle.js",
  "packages/persistence/src/postgres/backup-restore-state-contract.js",
  "packages/persistence/src/postgres/catalog-readback-authorization-fields.js",
  "packages/persistence/src/postgres/catalog-readback-authorization.js",
  "packages/persistence/src/postgres/catalog-readback-canonical.js",
  "packages/persistence/src/postgres/catalog-readback-lineage.js",
  "packages/persistence/src/postgres/catalog-readback-receipts.js",
  "packages/persistence/src/postgres/database-target-receipt.js",
  "packages/persistence/src/postgres/domain-ledger.js",
  "packages/persistence/src/postgres/dr-recovery-contract.js",
  "packages/persistence/src/postgres/errors.js",
  "packages/persistence/src/postgres/execution-contract.js",
  "packages/persistence/src/postgres/index.js",
  "packages/persistence/src/postgres/json-postgres-migration.js",
  "packages/persistence/src/postgres/migration-catalog-readback.js",
  "packages/persistence/src/postgres/migration-catalog.js",
  "packages/persistence/src/postgres/migration-executor.js",
  "packages/persistence/src/postgres/migration-reconciliation.js",
  "packages/persistence/src/postgres/migration-runner.js",
  "packages/persistence/src/postgres/migrations/001_repository_port_v2.sql",
  "packages/persistence/src/postgres/migrations/002_identity_ledger.sql",
  "packages/persistence/src/postgres/migrations/003_domain_ledger.sql",
  "packages/persistence/src/postgres/migrations/004_dms_upload_runtime.sql",
  "packages/persistence/src/postgres/migrations/005_domain_runtime_authority.sql",
  "packages/persistence/src/postgres/migrations/006_entra_oidc_authority.sql",
  "packages/persistence/src/postgres/migrations/007_break_glass_multi_approval.sql",
  "packages/persistence/src/postgres/migrations/008_dms_permanent_delete_approval.sql",
  "packages/persistence/src/postgres/migrations/009_authenticated_tenant_context.sql",
  "packages/persistence/src/postgres/migrations/010_internal_password_directory.sql",
  "packages/persistence/src/postgres/migrations/011_identity_session_membership_authority.sql",
  "packages/persistence/src/postgres/migrations/012_outlook_document_source_identity.sql",
  "packages/persistence/src/postgres/migrations/013_dms_precedent_search.sql",
  "packages/persistence/src/postgres/migrations/014_docusign_outbox.sql",
  "packages/persistence/src/postgres/migrations/015_external_tenant_provisioning.sql",
  "packages/persistence/src/postgres/outlook-authority-migration-receipts.js",
  "packages/persistence/src/postgres/outlook-authority-migration-seam.js",
  "packages/persistence/src/postgres/outlook-authority-roles.js",
  "packages/persistence/src/postgres/performance-acceptance.js",
  "packages/persistence/src/postgres/pool.js",
  "packages/persistence/src/postgres/program-receipt.js",
  "packages/persistence/src/postgres/program-stage-evidence.js",
  "packages/persistence/src/postgres/program-stage-gates.js",
  "packages/persistence/src/postgres/program-stage-observation.js",
  "packages/persistence/src/postgres/record-type-catalog.js",
  "packages/persistence/src/postgres/rehearsal-capacity-result.js",
  "packages/persistence/src/postgres/rehearsal-restore-contract.js",
  "packages/persistence/src/postgres/rehearsal-runtime-validation.js",
  "packages/persistence/src/postgres/repository-v2.js",
  "packages/persistence/src/postgres/role-password.js",
  "packages/persistence/src/postgres/source-adjudication.js",
  "packages/persistence/src/postgres/source-authority-manifest.js",
  "packages/persistence/src/postgres/source-inventory.js",
  "packages/persistence/src/postgres/source-locator-manifest.js",
  "packages/persistence/src/postgres/source-read-contract.js",
  "packages/persistence/src/postgres/transaction.js",
  "packages/persistence/src/postgres/w15-inventory-bootstrap-contract.js",
  "packages/persistence/src/record-domain-adapter.js",
  "packages/persistence/src/repository-port-v2.js",
  "packages/persistence/src/repository.js",
  "packages/persistence/src/residency.js",
  "packages/persistence/src/s3-backup-queue.js",
  "packages/persistence/src/schema.js",
  "packages/persistence/src/transaction.js",
  "packages/platform/src/persistence/migration-runner.js",
  "packages/platform/src/persistence/store-port.js",
  "packages/platform/src/ui-readiness-central-ledger.js",
  "packages/platform/src/ui-readiness-repository.js",
  "packages/platform/src/ui-readiness-service.js",
  "packages/record-actions/src/index.js",
  "packages/record-actions/src/service.js",
  "packages/reports/src/client-fixed-report-service.js",
  "packages/reports/src/index.js",
  "packages/reports/src/service.js",
  "packages/runtime-auth/src/assurance.js",
  "packages/runtime-auth/src/audit.js",
  "packages/runtime-auth/src/authz-context.js",
  "packages/runtime-auth/src/break-glass.js",
  "packages/runtime-auth/src/external-release-trust-common.js",
  "packages/runtime-auth/src/external-release-trust-receipt.js",
  "packages/runtime-auth/src/external-release-trust-registry.js",
  "packages/runtime-auth/src/external-release-trust.js",
  "packages/runtime-auth/src/identity-ledger.js",
  "packages/runtime-auth/src/index.js",
  "packages/runtime-auth/src/local-provider.js",
  "packages/runtime-auth/src/membership.js",
  "packages/runtime-auth/src/policy-hooks.js",
  "packages/runtime-auth/src/postgres-identity-ledger.js",
  "packages/runtime-auth/src/postgres-tenant-provisioning.js",
  "packages/runtime-auth/src/principal.js",
  "packages/runtime-auth/src/provider.js",
  "packages/runtime-auth/src/runtime-safety-approval-contract.js",
  "packages/runtime-auth/src/session.js",
  "packages/runtime-auth/src/step-up-provider.js",
  "packages/runtime-model/src/schema-registry.js",
  "packages/runtime-model/src/validators.js",
  "packages/time-expense/src/disbursement-service.js",
  "packages/time-expense/src/expense-service.js",
  "packages/time-expense/src/fee-arrangement-service.js",
  "packages/time-expense/src/rate-card-service.js",
  "packages/time-expense/src/time-entry-service.js",
]);
export const JSON_POSTGRES_PRODUCTION_OUTLOOK_RUNTIME_ENTRIES_SHA256 =
  createHash("sha256").update(Buffer.from(
    `${JSON_POSTGRES_PRODUCTION_OUTLOOK_RUNTIME_ENTRIES.join("\n")}\n`,
  )).digest("hex");

export function validateJsonPostgresProductionOutlookRuntimeEntries(entries) {
  if (!Array.isArray(entries)
    || entries.length !== JSON_POSTGRES_PRODUCTION_OUTLOOK_RUNTIME_ENTRIES.length
    || entries.some((entry, index) =>
      entry !== JSON_POSTGRES_PRODUCTION_OUTLOOK_RUNTIME_ENTRIES[index])) {
    throw new Error("production Outlook runtime import closure drifted");
  }
  return Object.freeze({
    entry_count: entries.length,
    entries_sha256: JSON_POSTGRES_PRODUCTION_OUTLOOK_RUNTIME_ENTRIES_SHA256,
  });
}

export function validateJsonPostgresProductionExtractedSymlinks(entries) {
  if (!Array.isArray(entries) || entries.length === 0) {
    throw new Error("production artifact extracted symlink inventory is required");
  }
  const normalized = entries.map((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)
      || Object.keys(entry).sort().join("\0") !== "path\0target\0target_kind") {
      throw new Error("production artifact extracted symlink row is invalid");
    }
    const path = String(entry.path ?? "");
    const target = String(entry.target ?? "");
    if (!path || path.includes("\\") || path.includes("\0")
      || posix.isAbsolute(path) || posix.normalize(path) !== path
      || path.split("/").some((segment) => !segment || segment === "." || segment === "..")) {
      throw new Error("production artifact extracted symlink path is unsafe");
    }
    if (!target || target.includes("\\") || target.includes("\0")
      || posix.isAbsolute(target)) {
      throw new Error("production artifact extracted symlink target is unsafe");
    }
    const resolvedTarget = posix.normalize(posix.join(posix.dirname(path), target));
    if (resolvedTarget === ".." || resolvedTarget.startsWith("../")
      || posix.isAbsolute(resolvedTarget)) {
      throw new Error("production artifact extracted symlink target escaped the archive");
    }
    if (entry.target_kind !== "file" && entry.target_kind !== "directory") {
      throw new Error("production artifact extracted symlink target is missing or unsupported");
    }
    return Object.freeze({ path, target, target_kind: entry.target_kind });
  }).sort((left, right) => left.path.localeCompare(right.path, "en"));
  if (new Set(normalized.map(({ path }) => path)).size !== normalized.length) {
    throw new Error("production artifact extracted symlink inventory contains duplicate paths");
  }
  return Object.freeze({
    artifact_symlink_count: normalized.length,
    artifact_symlink_entries_sha256: createHash("sha256").update(Buffer.from(
      `lawos.json-postgres-production-artifact-symlinks.v1\0${JSON.stringify(normalized)}`,
    )).digest("hex"),
    artifact_symlink_escape_count: 0,
  });
}

function requiredText(value, name) {
  const text = String(value ?? "").trim();
  if (!text) throw new TypeError(`${name} is required`);
  return text;
}

export function emptyJsonPostgresProductionSources() {
  return Object.freeze({
    account_seed: Object.freeze({
      schema_version: "law-firm-os.matter-vault-user-registration-seed.v0.1",
      created_at: "1970-01-01T00:00:00.000Z",
      status: "production-postgres-directory-only",
      tenant_id: "",
      source: Object.freeze({ kind: "postgres-v2-account-directory", account_count: 0 }),
      registration_boundary: Object.freeze({
        external_identity_account_creation: false,
        passwords_or_real_tokens_included: false,
        operator_approval_required_for_production_invites: true,
      }),
      highest_privilege_account: null,
      users: Object.freeze([]),
    }),
    roster: Object.freeze({
      schema_version: "law-firm-os.hrx-member-roster-source-of-truth.v0.1",
      created_at: "1970-01-01T00:00:00.000Z",
      status: "production-postgres-directory-only",
      tenant_id: "",
      source_ref: "postgres-v2-hrx-records",
      change_control: Object.freeze({
        default_persistence: "postgres-v2",
        implicit_regeneration_allowed: false,
        passwords_or_real_tokens_included: false,
      }),
      members: Object.freeze([]),
    }),
  });
}

export function productionArtifactSourcePathAllowed(path) {
  const normalized = String(path ?? "").replaceAll("\\", "/").replace(/^\.\//u, "");
  if (JSON_POSTGRES_PRODUCTION_REQUIRED_PROFILE_PHOTO_ENTRIES.includes(normalized)) return true;
  return privateStagingArtifactSourcePathAllowed(normalized)
    && !PRIVATE_STAGING_SOURCE.test(normalized);
}

export function parseJsonPostgresProductionGitTree(value) {
  return Object.freeze(
    parsePrivateStagingGitTree(value, {
      sourcePathAllowed: productionArtifactSourcePathAllowed,
    }),
  );
}

export function redactJsonPostgresProductionRuntimeSource({ targetPath, text } = {}) {
  const path = requiredText(targetPath, "production redaction target");
  if (!JSON_POSTGRES_PRODUCTION_REDACTION_TARGETS.includes(path)) {
    throw new TypeError(`unsupported production redaction target: ${path}`);
  }
  let output = String(text ?? "");
  if (path === "apps/api/src/lambda.js") {
    let employeeIndex = 0;
    const employeeIds = new Map();
    output = output
      .replace(/\b[A-Z0-9._%+-]+@amic\.kr\b/giu, "redacted-production-user@production.invalid")
      .replace(/\buser_amic_[a-z0-9_]+\b/giu, "user_production_redacted")
      .replace(/\bemp_amic_[a-z0-9_]+\b/giu, (source) => {
        if (!employeeIds.has(source)) {
          employeeIndex += 1;
          employeeIds.set(source, `employee_production_redacted_${employeeIndex}`);
        }
        return employeeIds.get(source);
      })
      .replaceAll("assumed-role/lawos-private-staging-api-role/", "assumed-role/lawos-production-api-role/");
  } else if (path === "packages/matter/src/worktree-template-model.js") {
    output = output.replace(/\b[A-Z0-9._%+-]+@amic\.kr\b/giu, "redacted-production-user@production.invalid");
  }
  if (output === text) throw new Error(`production source redaction made no change: ${path}`);
  if (REAL_IDENTITY_MARKER.test(output)) {
    throw new Error(`production source redaction left a real identity marker: ${path}`);
  }
  return Object.freeze({
    target_path: path,
    purpose: "remove-real-identity-source-markers-from-deployment-code",
    text: output,
    byte_size: Buffer.byteLength(output),
  });
}

export function validateJsonPostgresProductionSourceBoundary(entries = []) {
  const violations = entries
    .filter((entry) => REAL_IDENTITY_MARKER.test(String(entry?.text ?? "")))
    .map((entry) => requiredText(entry.path, "production source path"));
  if (violations.length) {
    throw new Error(`production artifact source contains real identity markers: ${violations.slice(0, 5).join(", ")}`);
  }
  return Object.freeze({
    scanned_source_count: entries.length,
    real_identity_marker_count: 0,
  });
}

export function validateJsonPostgresProductionSourceOverrides(overrides) {
  if (!Array.isArray(overrides)
    || overrides.length !== JSON_POSTGRES_PRODUCTION_SOURCE_OVERRIDES.length) {
    throw new Error("production source override set is incomplete");
  }
  const expected = new Map(
    JSON_POSTGRES_PRODUCTION_SOURCE_OVERRIDES.map((entry) => [entry.target_path, entry]),
  );
  for (const override of overrides) {
    const contract = expected.get(override?.target_path);
    if (!contract
      || override.source_path !== contract.source_path
      || override.purpose !== contract.purpose
      || !SHA256.test(String(override.sha256 ?? ""))
      || !Number.isSafeInteger(override.byte_size)
      || override.byte_size < 1) {
      throw new Error("production source override binding is invalid");
    }
    const text = String(override.text ?? "");
    if (Buffer.byteLength(text) !== override.byte_size || REAL_IDENTITY_MARKER.test(text)) {
      throw new Error("production source override contains real identity material");
    }
    if (override.target_path.endsWith("amic-client-candidates.js")
      && !/AMIC_CURRENT_CLIENT_CANDIDATES\s*=\s*Object\.freeze\(\[\]\)/u.test(text)) {
      throw new Error("production client candidate source must be empty");
    }
    if (override.target_path.endsWith("lawos-role-registry.js")
      && (!text.includes('LAWOS_ROLE_REGISTRY_SOURCE = "postgres-v2-account-membership"')
        || !text.includes("LAWOS_INTERNAL_ROLE_ASSIGNMENTS = Object.freeze([])"))) {
      throw new Error("production role source must use PostgreSQL membership only");
    }
    expected.delete(override.target_path);
  }
  if (expected.size) throw new Error("production source override target is missing");
  return Object.freeze({
    override_count: overrides.length,
    packaged_real_client_count: 0,
    packaged_static_role_assignment_count: 0,
  });
}

export function validateJsonPostgresProductionArtifactEntries(entries, {
  outlookRuntimeEntries = JSON_POSTGRES_PRODUCTION_OUTLOOK_RUNTIME_ENTRIES,
} = {}) {
  const runtime = validateJsonPostgresProductionOutlookRuntimeEntries(
    outlookRuntimeEntries,
  );
  const raw = entries.map((entry) => String(entry).replace(/^\.\//u, ""));
  if (raw.some((entry) =>
    !entry
    || entry.includes("\\")
    || entry.startsWith("/")
    || entry.split("/").includes(".."))) {
    throw new Error("production artifact contains an unsafe archive path");
  }
  if (new Set(raw).size !== raw.length) throw new Error("production artifact contains a duplicate entry");
  const normalized = [...raw].sort();
  const required = [
    "apps/api/src/lambda.js",
    JSON_POSTGRES_PRODUCTION_PROGRAM_ADMIN_ENTRYPOINT,
    ...outlookRuntimeEntries,
    "apps/api/src/immutable-program-input.js",
    "apps/api/src/matter-vault-user-registration-seed.json",
    "apps/api/src/hrx-member-roster-source-of-truth.json",
    JSON_POSTGRES_PRODUCTION_PUBLIC_PROFILE_CATALOG_ENTRY,
    "certs/global-bundle.pem",
    "deployment-manifest.json",
    "package.json",
    "packages/dms/src/json-postgres-dms-migration.js",
    "packages/persistence/src/postgres/execution-contract.js",
    "packages/persistence/src/postgres/program-receipt.js",
    ...JSON_POSTGRES_PRODUCTION_REQUIRED_PROFILE_PHOTO_ENTRIES,
  ];
  for (const path of required) {
    if (!normalized.includes(path)) throw new Error(`production artifact is missing ${path}`);
  }
  const forbidden = normalized.filter((entry) =>
    (entry !== "certs/global-bundle.pem" && FORBIDDEN_ARCHIVE_ENTRY.test(entry))
    || (!entry.startsWith("node_modules/") && FIRST_PARTY_TEST_ENTRY.test(entry))
    || entry.startsWith("infra/")
    || entry.startsWith("scripts/")
    || PRIVATE_STAGING_SOURCE.test(entry));
  if (forbidden.length) {
    throw new Error(`production artifact contains forbidden entries: ${forbidden.slice(0, 5).join(", ")}`);
  }
  const runtimeStores = normalized.filter((entry) =>
    /(^|\/)(?:runtime-stores?|runtime_store|store-data)(\/|$)/iu.test(entry)
    || /(?:^|\/)(?:hrx|master-data|matter|dms|crm|intake|finance|analytics|portal|auth)-(?:store|runtime)\.json$/iu.test(entry));
  if (runtimeStores.length) throw new Error("production artifact contains a legacy runtime store");
  return Object.freeze({
    entry_count: normalized.length,
    forbidden_entry_count: 0,
    runtime_store_entry_count: 0,
    real_json_store_count: 0,
    private_staging_entry_count: 0,
    outlook_runtime_entry_count: runtime.entry_count,
    outlook_runtime_entries_sha256: runtime.entries_sha256,
  });
}

export function validateJsonPostgresProductionDeploymentManifest(manifest) {
  if (manifest?.schema_version !== JSON_POSTGRES_PRODUCTION_ARTIFACT_SCHEMA
    || manifest?.data_scope !== "approved-immutable-inputs-only"
    || manifest?.operational_authority !== "postgres-v2"
    || manifest?.json_fallback !== false
    || manifest?.json_writer !== false
    || manifest?.dual_write !== false
    || manifest?.file_current_authority !== false
    || manifest?.offline_mutation !== false
    || manifest?.memory_fallback !== false
    || manifest?.packaged_real_identity_count !== 0
    || manifest?.packaged_real_client_count !== 0
    || manifest?.packaged_static_role_assignment_count !== 0
    || manifest?.secrets_in_environment !== false
    || manifest?.production_ready_claim !== false) {
    throw new Error("production deployment manifest authority boundary drifted");
  }
  return Object.freeze({
    verdict: "PASS",
    data_scope: manifest.data_scope,
    operational_authority: manifest.operational_authority,
    legacy_authority_counter_total: 0,
  });
}
