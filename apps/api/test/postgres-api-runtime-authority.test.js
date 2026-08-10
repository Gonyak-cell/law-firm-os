import assert from "node:assert/strict";
import {
  createHash,
  generateKeyPairSync,
  sign,
} from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createLocalStorageAdapter } from "../../../packages/dms/src/storage/local-storage-adapter.js";
import {
  DMS_AUXILIARY_DOMAIN_DESCRIPTOR,
  createDmsAuxiliaryRepository,
} from "../../../packages/dms/src/central-ledger.js";
import { addPeopleVisibleMatterTeamMember } from "../../../packages/matter/src/staffing-service.js";
import { createMatterRepository } from "../../../packages/matter/src/repository.js";
import { MATTER_DOMAIN_DESCRIPTOR } from "../../../packages/matter/src/central-ledger.js";
import { hashDomainValue } from "../../../packages/persistence/src/domain-ledger.js";
import { createPostgresDomainLedger } from "../../../packages/persistence/src/postgres/domain-ledger.js";
import { createRecordRepositoryDomainSnapshot } from "../../../packages/persistence/src/record-domain-adapter.js";
import { createMigratedPostgresFixture } from "../../../packages/persistence/test/helpers/disposable-postgres.js";
import { createCrmRuntimeRepository } from "../../../packages/crm/src/runtime-repository.js";
import { CRM_DOMAIN_DESCRIPTOR } from "../../../packages/crm/src/central-ledger.js";
import { createMasterDataRepository } from "../../../packages/master-data/src/repository.js";
import { MASTER_DATA_DOMAIN_DESCRIPTOR } from "../../../packages/master-data/src/central-ledger.js";
import { createPostgresIdentityLedger } from "../../../packages/runtime-auth/src/postgres-identity-ledger.js";
import {
  createPostgresApiRuntimeAuthority,
  isOutlookIdempotentMutation,
  runPostgresReadWithBaselineRetry,
  runWithRequestFailureCompensation,
} from "../src/postgres-api-runtime-authority.js";
import { handleAiApiRequest } from "../src/ai-runtime-context.js";
import { handleAnalyticsApiRequest } from "../src/analytics-runtime-context.js";
import { handleCrmIntakeApiRequest } from "../src/crm-intake-runtime-context.js";
import { handleFinanceApiRequest } from "../src/finance-runtime-context.js";
import { handleHomeDashboardApiRequest } from "../src/home-dashboard-runtime-context.js";
import { handleHrxApiRequest } from "../src/hrx-runtime-context.js";
import {
  handleClientGroupRegistrationCreate,
  handleClientGroupRegistrationReview,
  handleRecordsSearch,
} from "../src/master-data-context.js";
import { handlePortalApiRequest } from "../src/portal-runtime-context.js";
import { handleReportsApiRequest } from "../src/reports-runtime-context.js";
import {
  handleClientOutlookAuthorizationCallback,
  handleOutlookAddinApiRequest,
} from "../src/outlook-addin-runtime-context.js";
import {
  createPostgresSessionObjectAclResolver,
} from "../src/session-object-acl-authority.js";
import { createPostgresDmsUploadRuntime } from "../../../packages/dms/src/postgres-upload-runtime.js";
import { createSqlHrxRepository } from "../../../packages/hrx/src/repository-sql.js";
import { runHrxMigrations } from "../../../packages/hrx/src/migrations/index.js";
import { createHrxDomainSnapshot } from "../../../packages/hrx/src/postgres-store-v2.js";
import { createFileHrxStore } from "../../../packages/hrx/src/store/file-store.js";
import { createBankImportPreviewTokenAuthority } from "../src/bank-import-preview-token.js";
import { createFinanceRepository } from "../../../packages/billing/src/finance-repository.js";
import { createFinanceDomainSnapshot } from "../../../packages/billing/src/central-ledger.js";
import {
  M365_GRAPH_REQUIRED_SCOPES,
  hashMailboxAddress,
  m365ConnectionId,
} from "../../../packages/email-dms/src/m365-connection-model.js";
import {
  acquireActiveM365Credential,
  M365_GRAPH_CALLBACK_MODES,
  createM365GraphConnectionService,
} from "../../../packages/email-dms/src/m365-graph-connection-service.js";
import {
  createEmailDmsRepository,
} from "../../../packages/email-dms/src/repository.js";
import { outlookEmailFilingAuditEvent } from "../../../packages/email-dms/src/email-filing-service.js";
import {
  EMAIL_DMS_DOMAIN_DESCRIPTOR,
} from "../../../packages/email-dms/src/central-ledger.js";
import {
  PEOPLE_OUTLOOK_CONNECTION_MODEL_TYPE,
  PEOPLE_OUTLOOK_CREDENTIAL_ENVELOPE_PREFIX,
} from "../../../packages/email-dms/src/people-outlook-connection-model.js";
import {
  createClientFixedReportSnapshotTokenAuthority,
} from "../../../packages/reports/src/index.js";
import { createOffboardingCase } from "../../../packages/hrx/src/offboarding.js";
import { createDurablePeopleOutlookStateAuthority } from "../../../packages/integrations-core/src/people-outlook-connection.js";
import {
  createPeopleOutlookOperationalRuntimeFactory,
} from "../src/people-outlook-operational-runtime.js";
import {
  MICROSOFT_EGRESS_REDIRECT_URIS,
} from "../src/microsoft-egress-broker-transport.js";

const TENANT_A = "tenant_postgres_api_authority_a";
const TENANT_B = "tenant_postgres_api_authority_b";
const PAYROLL_ARTIFACT_SECRET = "postgres-api-authority-test-payroll-artifact-secret";
const BANK_IMPORT_PREVIEW_TOKENS = createBankImportPreviewTokenAuthority({
  secret: "postgres-api-authority-bank-preview-secret-material",
});
const POSTGRES_FEE_DEPOSIT_CLASSIFICATION_ID =
  `bank_classification_${createHash("sha256")
    .update(
      `${TENANT_A}|bank-transaction-postgres-fee-commitment`,
    )
    .digest("hex")
    .slice(0, 24)}`;
const TERMINATION_DELIVERY_AT = "2026-07-31T09:00:00.000Z";

function stableStringify(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
}

function signedMicrosoftIdToken(privateKey, claims) {
  const header = Buffer.from(JSON.stringify({
    alg: "RS256",
    kid: "people-outlook-postgres-concurrency-key",
    typ: "JWT",
  })).toString("base64url");
  const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
  const signature = sign(
    "RSA-SHA256",
    Buffer.from(`${header}.${payload}`),
    privateKey,
  ).toString("base64url");
  return `${header}.${payload}.${signature}`;
}

async function importHrxAuthorityBaseline(ledger, tenantId) {
  const store = createFileHrxStore();
  try {
    runHrxMigrations(store);
    await ledger.importSnapshot(createHrxDomainSnapshot({ store, tenant_id: tenantId }).snapshot);
  } finally {
    store.close();
  }
}

async function importMatterAssignmentIdentityBaseline(ledger, tenantId, { employeeId, userId }) {
  const store = createFileHrxStore();
  try {
    runHrxMigrations(store);
    const repository = createSqlHrxRepository({
      store,
      clock: () => "2026-07-31T00:00:00.000Z",
    });
    repository.transaction((tx) => {
      tx.createEmployee({
        tenant_id: tenantId,
        employee_id: employeeId,
        display_name: "PostgreSQL Matter assignment attorney",
        work_email: `${userId}@example.test`,
        status: "active",
        source_ref: "postgres-matter-assignment-test",
      });
      tx.createEmployeeUserLink({
        tenant_id: tenantId,
        link_id: `link-${employeeId}`,
        employee_id: employeeId,
        user_id: userId,
        purpose: "login_mapping",
        source_ref: "postgres-matter-assignment-test",
      });
    });
    await ledger.importSnapshot(createHrxDomainSnapshot({ store, tenant_id: tenantId }).snapshot);
  } finally {
    store.close();
  }
}

async function assertMatterAssignmentRejectsInactiveIdentity({
  fixture,
  tenantId,
  employeeId,
  userId,
  accountStatus,
  membershipStatus,
  idempotencySuffix,
}) {
  const ledger = createPostgresDomainLedger({ pool: fixture.appPool });
  const identityLedger = createPostgresIdentityLedger({
    pool: fixture.appPool,
    clock: () => "2026-07-31T00:00:00.000Z",
  });
  const dmsStorage = createLocalStorageAdapter({
    adapter_id: `postgres-api-matter-assignment-${idempotencySuffix}`,
  });
  const identityInput = `postgres-matter-assignment-${idempotencySuffix}`;
  await identityLedger.provisionDirectoryUser({
    tenant_id: tenantId,
    actor_id: "user_postgres_matter_assignment_test",
    idempotency_key: `${identityInput}-v1`,
    request_hash: createHash("sha256").update(`${identityInput}-v1`).digest("hex"),
    user: {
      user_id: userId,
      email: `${userId}@example.test`,
      status: accountStatus,
      display_name: "PostgreSQL Matter assignment attorney",
      source_ref: "postgres-matter-assignment-test",
    },
    membership: {
      status: membershipStatus,
      role_profile_id: "lawos_staff",
      role_ids: ["lawos_staff"],
      scopes: ["matter:read"],
      hrx_scopes: ["hrx:self"],
      source_ref: "postgres-matter-assignment-test",
    },
  });
  await importMatterAssignmentIdentityBaseline(ledger, tenantId, { employeeId, userId });
  const authority = createPostgresApiRuntimeAuthority({
    ledger,
    dmsStorage,
    payrollArtifactSecret: PAYROLL_ARTIFACT_SECRET,
    bankImportPreviewTokens: BANK_IMPORT_PREVIEW_TOKENS,
    dmsUploadRuntime: createPostgresDmsUploadRuntime({
      pool: fixture.appPool,
      storage: dmsStorage,
      sourceOnly: false,
    }),
    identityRepository: identityLedger,
  });

  return authority.run({
    tenant_id: tenantId,
    request_context: {
      method: "POST",
      pathname: "/api/matters/matter-postgres-assignment/team",
      actor_id: "user_postgres_matter_assignment_test",
    },
    command(runtimes) {
      const directoryUser = runtimes.matterRuntime.userDirectory.listUsers({
        tenant_id: tenantId,
        user_id: userId,
      });
      assert.equal(directoryUser.length, 1);
      assert.equal(directoryUser[0].status, "inactive");

      const identity = runtimes.matterRuntime.peopleAssignmentAuthority.resolveEmployeeUserPair({
        tenant_id: tenantId,
        employee_id: employeeId,
        requested_user_id: userId,
      });
      assert.deepEqual(identity, {
        state: "unresolved",
        reason: "user_identity_inactive",
      });
      assert.throws(() => addPeopleVisibleMatterTeamMember({
        repository: runtimes.matterRuntime.repository,
        employeeDirectory: runtimes.matterRuntime.employeeDirectory,
        employeeUserLinkDirectory: runtimes.matterRuntime.employeeUserLinkDirectory,
        userDirectory: runtimes.matterRuntime.userDirectory,
        peopleAssignmentAuthority: runtimes.matterRuntime.peopleAssignmentAuthority,
        as_of: "2026-07-31T00:00:00.000Z",
        matter: {
          tenant_id: tenantId,
          matter_id: "matter-postgres-assignment-negative",
        },
        member: {
          member_id: `member-${idempotencySuffix}`,
          tenant_id: tenantId,
          matter_id: "matter-postgres-assignment-negative",
          employee_id: employeeId,
          user_id: userId,
          role: "responsible_attorney",
          status: "active",
          valid_from: "2026-07-01T00:00:00.000Z",
        },
        actor_id: "user_postgres_matter_assignment_test",
      }), /user_identity_inactive/u);
      return identity;
    },
  });
}

async function importPendingTerminationDeliveryBaseline(ledger, tenantId) {
  const store = createFileHrxStore();
  const offboardingId = "off-postgres-payroll-evidence";
  const employeeId = "employee-postgres-payroll-evidence";
  const previewReconciliationId = "leave-preview-postgres-payroll-evidence";
  const reconciliationId = "leave-execute-postgres-payroll-evidence";
  const outboxEventId = "leave-outbox-postgres-payroll-evidence";
  const outboxIdempotencyKey =
    "termination:off-postgres-payroll-evidence:payroll-outbox";
  const payload = {
    offboarding_id: offboardingId,
    totals: { unused_minutes: 480 },
    raw_compensation_amount_included: false,
  };
  try {
    runHrxMigrations(store);
    store.query("insert", {
      table: "hrx_employees",
      row: {
        tenant_id: tenantId,
        employee_id: employeeId,
        display_name: "PostgreSQL termination evidence",
        status: "active",
      },
    });
    store.query("insert", {
      table: "hrx_offboarding_cases",
      row: createOffboardingCase({
        tenant_id: tenantId,
        offboarding_id: offboardingId,
        employee_id: employeeId,
        separation_date: "2026-07-31",
        state: "open",
        leave_reconciliation_status: "approved_pending_sync",
      }),
    });
    store.query("insert", {
      table: "hrx_leave_termination_reconciliations",
      row: {
        tenant_id: tenantId,
        reconciliation_id: reconciliationId,
        employee_id: employeeId,
        termination_date: "2026-07-31",
        snapshot_hash: "termination-snapshot-hash",
        state: "approved_pending_sync",
        result_json: JSON.stringify({
          offboarding_id: offboardingId,
          payroll_outbox_event_id: outboxEventId,
          sync_state: "pending",
        }),
        idempotency_key: "termination-execute:postgres-payroll-evidence",
        created_at: TERMINATION_DELIVERY_AT,
        approved_at: TERMINATION_DELIVERY_AT,
        mode: "execute",
        source_version: "termination-source-version",
        preview_reconciliation_id: previewReconciliationId,
        approved_by_actor_id: "user-people-ops-reviewer",
        executed_by_actor_id: "user-people-ops-operator",
        completed_at: null,
      },
    });
    store.query("insert", {
      table: "hrx_leave_sync_outbox",
      row: {
        tenant_id: tenantId,
        outbox_event_id: outboxEventId,
        aggregate_type: "LeaveTerminationReconciliation",
        aggregate_id: previewReconciliationId,
        event_type: "leave.termination.payroll_reconciliation_requested",
        payload_json: JSON.stringify(payload),
        idempotency_key: outboxIdempotencyKey,
        state: "pending",
        attempt_count: 0,
        available_at: TERMINATION_DELIVERY_AT,
        delivered_at: null,
        provider_receipt_ref: null,
        last_error_code: null,
        updated_at: TERMINATION_DELIVERY_AT,
        created_at: TERMINATION_DELIVERY_AT,
      },
    });
    await ledger.importSnapshot(
      createHrxDomainSnapshot({ store, tenant_id: tenantId }).snapshot,
    );
  } finally {
    store.close();
  }
  return {
    employeeId,
    offboardingId,
    reconciliationId,
    outboxEventId,
    providerReceiptRef: "PayrollProviderReceipt:postgres-payroll-evidence",
    providerReceipt: {
      schema_version: "law-firm-os.hrx.provider-receipt.v0.1",
      receipt_id: "payroll-receipt-postgres-payroll-evidence",
      tenant_id: tenantId,
      provider_kind: "payroll",
      provider_id: "payroll-authority",
      operation: "payroll.termination.reconciliation",
      idempotency_key: `${outboxIdempotencyKey}:payroll`,
      payload_hash: `sha256:${createHash("sha256").update(stableStringify(payload)).digest("hex")}`,
      state: "succeeded",
      requested_at: TERMINATION_DELIVERY_AT,
      completed_at: TERMINATION_DELIVERY_AT,
      provider_receipt_ref:
        "PayrollProviderReceipt:postgres-payroll-evidence",
      error_code: null,
    },
  };
}

test("PostgreSQL API authority retries bounded reads and only explicitly idempotent mutations", async () => {
  const waits = [];
  let readAttempts = 0;
  const result = await runPostgresReadWithBaselineRetry({
    method: "GET",
    retryLimit: 4,
    wait: async (milliseconds) => waits.push(milliseconds),
    execute: async () => {
      readAttempts += 1;
      if (readAttempts < 5) {
        throw Object.assign(new Error("concurrent audited read"), {
          safe_error_code: [
            "DOMAIN_BASELINE_CONFLICT",
            "HRX_POSTGRES_BASELINE_CONFLICT",
            "DOMAIN_SHADOW_DIFFERENCE",
            "REPOSITORY_VERSION_CONFLICT",
          ][readAttempts - 1],
        });
      }
      return "read-committed";
    },
  });
  assert.equal(result, "read-committed");
  assert.equal(readAttempts, 5);
  assert.deepEqual(waits, [5, 10, 20, 40]);

  let callbackAttempts = 0;
  await assert.rejects(runPostgresReadWithBaselineRetry({
    method: "GET",
    pathname: "/api/outlook/connection/callback",
    retryLimit: 4,
    wait: async () => assert.fail("OAuth callback must not be retried"),
    execute: async () => {
      callbackAttempts += 1;
      throw Object.assign(new Error("callback commit conflict"), {
        safe_error_code: "DOMAIN_BASELINE_CONFLICT",
      });
    },
  }), /callback commit conflict/u);
  assert.equal(callbackAttempts, 1);

  let slashCallbackAttempts = 0;
  await assert.rejects(runPostgresReadWithBaselineRetry({
    method: "GET",
    pathname: "/api/outlook/connection/callback/",
    retryLimit: 4,
    wait: async () => assert.fail("OAuth callback slash variant must not be retried"),
    execute: async () => {
      slashCallbackAttempts += 1;
      throw Object.assign(new Error("slash callback commit conflict"), {
        safe_error_code: "DOMAIN_BASELINE_CONFLICT",
      });
    },
  }), /slash callback commit conflict/u);
  assert.equal(slashCallbackAttempts, 1);

  let mutationAttempts = 0;
  await assert.rejects(runPostgresReadWithBaselineRetry({
    method: "POST",
    retryLimit: 3,
    wait: async () => {},
    execute: async () => {
      mutationAttempts += 1;
      throw Object.assign(new Error("mutation conflict"), { safe_error_code: "DOMAIN_SHADOW_DIFFERENCE" });
    },
  }), /mutation conflict/u);
  assert.equal(mutationAttempts, 1);

  let idempotentMutationAttempts = 0;
  const idempotentMutation = await runPostgresReadWithBaselineRetry({
    method: "POST",
    retryLimit: 2,
    allowIdempotentWriteRetry: true,
    wait: async () => {},
    execute: async () => {
      idempotentMutationAttempts += 1;
      if (idempotentMutationAttempts === 1) {
        throw Object.assign(new Error("idempotent mutation conflict"), {
          safe_error_code: "REPOSITORY_VERSION_CONFLICT",
        });
      }
      return "idempotent-mutation-replayed";
    },
  });
  assert.equal(idempotentMutation, "idempotent-mutation-replayed");
  assert.equal(idempotentMutationAttempts, 2);

  let idempotentDeleteAttempts = 0;
  const idempotentDelete = await runPostgresReadWithBaselineRetry({
    method: "DELETE",
    retryLimit: 2,
    allowIdempotentWriteRetry: true,
    wait: async () => {},
    execute: async () => {
      idempotentDeleteAttempts += 1;
      if (idempotentDeleteAttempts === 1) {
        throw Object.assign(new Error("idempotent delete conflict"), {
          safe_error_code: "DOMAIN_BASELINE_CONFLICT",
        });
      }
      return "idempotent-delete-replayed";
    },
  });
  assert.equal(idempotentDelete, "idempotent-delete-replayed");
  assert.equal(idempotentDeleteAttempts, 2);

  let uniqueConflictAttempts = 0;
  const uniqueConflictReplay = await runPostgresReadWithBaselineRetry({
    method: "POST",
    retryLimit: 2,
    allowIdempotentWriteRetry: true,
    wait: async () => {},
    execute: async () => {
      uniqueConflictAttempts += 1;
      if (uniqueConflictAttempts === 1) {
        throw Object.assign(new Error("concurrent idempotency claim"), {
          safe_error_code: "POSTGRES_UNIQUE_CONFLICT",
        });
      }
      return "unique-conflict-rematerialized";
    },
  });
  assert.equal(uniqueConflictReplay, "unique-conflict-rematerialized");
  assert.equal(uniqueConflictAttempts, 2);
});

test("PostgreSQL request failure runs registered external compensation once", async () => {
  const calls = [];
  await assert.rejects(runWithRequestFailureCompensation(async (compensator) => {
    compensator.register(async () => calls.push("credential:deleted"));
    throw new Error("domain flush failed");
  }), /domain flush failed/u);
  assert.deepEqual(calls, ["credential:deleted"]);
});

test("OUTM-21 retries only the exact idempotent correction mutation path", () => {
  assert.equal(
    isOutlookIdempotentMutation("POST", "/api/outlook/email/corrections"),
    true,
  );
  for (const [method, pathname] of [
    ["GET", "/api/outlook/email/corrections"],
    ["POST", "/api/outlook/email/corrections/"],
    ["POST", "/api/outlook/email/corrections/current"],
    ["POST", "/api/outlook/email/corrections/other"],
  ]) assert.equal(isOutlookIdempotentMutation(method, pathname), false);
});

test("PostgreSQL request success runs post-commit cleanup but never failure compensation", async () => {
  const calls = [];
  const result = await runWithRequestFailureCompensation(async (compensator) => {
    compensator.register(async () => calls.push("new-credential:deleted"));
    compensator.registerPostCommit(async () => calls.push("old-credential:deleted"));
    return "committed";
  });
  assert.equal(result, "committed");
  assert.deepEqual(calls, ["old-credential:deleted"]);
});

test("PostgreSQL request ignores post-commit cleanup failure after durable commit", async () => {
  const result = await runWithRequestFailureCompensation(async (compensator) => {
    compensator.registerPostCommit(async () => {
      throw new Error("synthetic cleanup outage");
    });
    return "committed";
  });
  assert.equal(result, "committed");
});

test("PostgreSQL request does not retry after new credential compensation fails", async () => {
  let attempts = 0;
  await assert.rejects(runPostgresReadWithBaselineRetry({
    method: "POST",
    pathname: "/api/outlook/email/file",
    retryLimit: 2,
    allowIdempotentWriteRetry: true,
    wait: async () => {},
    execute: async () => runWithRequestFailureCompensation(async (compensator) => {
      attempts += 1;
      compensator.register(async () => {
        throw new Error("synthetic vault cleanup outage");
      });
      throw Object.assign(new Error("baseline conflict with orphan risk"), {
        safe_error_code: "REPOSITORY_VERSION_CONFLICT",
      });
    }),
  }), (error) => error.request_compensation_failed === true);
  assert.equal(attempts, 1);
});

test("PostgreSQL Matter assignment excludes a disabled identity account", async (t) => {
  const fixture = await createMigratedPostgresFixture(t, { appPoolMax: 1 });
  if (!fixture) return;
  const identity = await assertMatterAssignmentRejectsInactiveIdentity({
    fixture,
    tenantId: "tenant_postgres_matter_assignment_disabled_account",
    employeeId: "employee-postgres-matter-disabled-account",
    userId: "user-postgres-matter-disabled-account",
    accountStatus: "disabled",
    membershipStatus: "active",
    idempotencySuffix: "disabled-account",
  });
  assert.deepEqual(identity, {
    state: "unresolved",
    reason: "user_identity_inactive",
  });
});

test("PostgreSQL Matter assignment excludes an inactive same-tenant identity membership", async (t) => {
  const fixture = await createMigratedPostgresFixture(t, { appPoolMax: 1 });
  if (!fixture) return;
  const identity = await assertMatterAssignmentRejectsInactiveIdentity({
    fixture,
    tenantId: "tenant_postgres_matter_assignment_disabled_membership",
    employeeId: "employee-postgres-matter-disabled-membership",
    userId: "user-postgres-matter-disabled-membership",
    accountStatus: "active",
    membershipStatus: "disabled",
    idempotencySuffix: "disabled-membership",
  });
  assert.deepEqual(identity, {
    state: "unresolved",
    reason: "user_identity_inactive",
  });
});

test("PostgreSQL API authority commits canonical client registration, idempotency, audit, and outbox", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  const ledger = createPostgresDomainLedger({ pool: fixture.appPool });
  const dmsStorage = createLocalStorageAdapter({
    adapter_id: "postgres-api-client-registration-test",
  });
  const authority = createPostgresApiRuntimeAuthority({
    ledger,
    dmsStorage,
    payrollArtifactSecret: PAYROLL_ARTIFACT_SECRET,
    bankImportPreviewTokens: BANK_IMPORT_PREVIEW_TOKENS,
    dmsUploadRuntime: createPostgresDmsUploadRuntime({
      pool: fixture.appPool,
      storage: dmsStorage,
      sourceOnly: false,
    }),
  });
  await importHrxAuthorityBaseline(ledger, TENANT_A);
  const context = Object.freeze({
    principal: Object.freeze({
      tenant_id: TENANT_A,
      user_id: "user_postgres_client_registration",
      role_ids: Object.freeze(["client_operations"]),
      scopes: Object.freeze([
        "master_data.client.write",
        "analytics.client.read",
      ]),
    }),
    rules: Object.freeze([
      {
        id: "allow-postgres-client-registration",
        effect: "allow",
        action_prefix: "master_data:client:",
      },
      {
        id: "allow-postgres-client-read",
        effect: "allow",
        action: "analytics:client:read",
      },
    ]),
    object_acl: Object.freeze([]),
  });
  const client = Object.freeze({
    client_type: "organization",
    display_name: "PostgreSQL 신규 고객",
    legal_form: "주식회사",
    registration_number: "PG-CLIENT-2026-001",
    depositor_alias: "PG 신규고객 입금",
  });
  const commonBody = Object.freeze({
    tenant_id: TENANT_A,
    permission_ref: "perm-postgres-client-registration",
    audit_hint_ref: "audit-postgres-client-registration",
    idempotency_key: "postgres-client-registration-create-001",
    client,
  });

  const reviewed = await authority.run({
    tenant_id: TENANT_A,
    request_context: {
      method: "POST",
      pathname: "/master-data/client-groups/review",
      actor_id: context.principal.user_id,
    },
    command(runtimes) {
      return handleClientGroupRegistrationReview({
        body: commonBody,
        context,
        requestId: "request-postgres-client-registration-review",
        runtime: runtimes.masterDataRuntime,
      });
    },
  });
  assert.equal(reviewed.status, 200, JSON.stringify(reviewed.body));
  assert.equal(reviewed.body.outcome, "passed");
  assert.equal(reviewed.body.item.can_create, true);

  const createBody = Object.freeze({
    ...commonBody,
    review_digest: reviewed.body.item.review_digest,
    confirm_distinct_client: false,
  });
  const created = await authority.run({
    tenant_id: TENANT_A,
    request_context: {
      method: "POST",
      pathname: "/master-data/client-groups",
      idempotency_key: commonBody.idempotency_key,
      actor_id: context.principal.user_id,
    },
    command(runtimes) {
      return handleClientGroupRegistrationCreate({
        body: createBody,
        context,
        requestId: "request-postgres-client-registration-create",
        runtime: runtimes.masterDataRuntime,
      });
    },
  });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  assert.equal(created.body.replayed, false);
  const clientGroupId = created.body.item.client_group_id;
  const storedGroup = await ledger.read({
    tenant_id: TENANT_A,
    domain_id: "master-data",
    record_type: "ClientGroup",
    record_id: clientGroupId,
  });
  assert.equal(storedGroup.payload.display_name, client.display_name);
  assert.equal(storedGroup.payload.legal_form, client.legal_form);
  assert.equal(storedGroup.payload.permission_ref, commonBody.permission_ref);
  const storedAliasRecords = await ledger.list({
    tenant_id: TENANT_A,
    domain_id: "master-data",
    record_type: "PartyAlias",
  });
  assert.equal(storedAliasRecords.length, 1);
  assert.equal(
    storedAliasRecords[0].payload.alias_type,
    "bank_depositor_name",
  );
  const storedIdentifierRecords = await ledger.list({
    tenant_id: TENANT_A,
    domain_id: "master-data",
    record_type: "PartyIdentifier",
  });
  assert.equal(storedIdentifierRecords.length, 1);
  assert.equal(
    storedIdentifierRecords[0].payload.identifier_type,
    "business_number",
  );
  assert.equal(
    (await ledger.listIdempotency({
      tenant_id: TENANT_A,
      domain_id: "master-data",
    })).length,
    1,
  );
  assert.equal(
    (await ledger.listAudit({
      tenant_id: TENANT_A,
      domain_id: "master-data",
    })).length,
    1,
  );
  assert.equal(
    (await ledger.listOutbox({
      tenant_id: TENANT_A,
      domain_id: "master-data",
    })).length,
    1,
  );

  const replayed = await authority.run({
    tenant_id: TENANT_A,
    request_context: {
      method: "POST",
      pathname: "/master-data/client-groups",
      idempotency_key: commonBody.idempotency_key,
      actor_id: context.principal.user_id,
    },
    command(runtimes) {
      return handleClientGroupRegistrationCreate({
        body: createBody,
        context,
        requestId: "request-postgres-client-registration-replay",
        runtime: runtimes.masterDataRuntime,
      });
    },
  });
  assert.equal(replayed.status, 200, JSON.stringify(replayed.body));
  assert.equal(replayed.body.replayed, true);
  assert.equal(replayed.body.item.client_group_id, clientGroupId);
  assert.equal(
    (await ledger.list({
      tenant_id: TENANT_A,
      domain_id: "master-data",
      record_type: "ClientGroup",
    })).length,
    1,
  );
  assert.equal(
    (await ledger.listAudit({
      tenant_id: TENANT_A,
      domain_id: "master-data",
    })).length,
    1,
  );
});

test("PostgreSQL API authority persists consultation schedule and completion fields with CRM versions", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  const fixtureNow = new Date();
  const consultationStart = new Date(fixtureNow.getTime() + (24 * 60 * 60 * 1000));
  const consultationEnd = new Date(consultationStart.getTime() + (60 * 60 * 1000));
  const consultationCompletedAt = new Date(
    consultationEnd.getTime() + (5 * 60 * 1000),
  );
  const fixtureReceivedAt = new Date(
    fixtureNow.getTime() - (24 * 60 * 60 * 1000),
  );
  const fixtureCredentialExpiresAt = new Date(
    fixtureNow.getTime() + (30 * 24 * 60 * 60 * 1000),
  );
  const ledger = createPostgresDomainLedger({ pool: fixture.appPool });
  const dmsStorage = createLocalStorageAdapter({
    adapter_id: "postgres-api-consultation-test",
  });
  const authority = createPostgresApiRuntimeAuthority({
    ledger,
    dmsStorage,
    payrollArtifactSecret: PAYROLL_ARTIFACT_SECRET,
    bankImportPreviewTokens: BANK_IMPORT_PREVIEW_TOKENS,
    dmsUploadRuntime: createPostgresDmsUploadRuntime({
      pool: fixture.appPool,
      storage: dmsStorage,
      sourceOnly: false,
    }),
  });
  await importHrxAuthorityBaseline(ledger, TENANT_A);
  const leadId = "lead-postgres-consultation-t03";
  const crmRepository = createCrmRuntimeRepository({
    seedRecords: [{
      model_type: "Lead",
      lead_id: leadId,
      tenant_id: TENANT_A,
      party_id: "party-postgres-consultation-t03",
      display_name: "PostgreSQL 상담 문의",
      status: "active",
      owner_user_id: "user-postgres-consultation-t03",
      inquiry_status: "reviewing",
      source: "manual",
      received_at: fixtureReceivedAt.toISOString(),
      next_action: "상담 일정 확인",
      version: 2,
    }],
  });
  try {
    await ledger.importSnapshot(createRecordRepositoryDomainSnapshot({
      descriptor: CRM_DOMAIN_DESCRIPTOR,
      repositories: [{
        source_id: "postgres-consultation-crm",
        repository: crmRepository,
      }],
      tenant_id: TENANT_A,
    }).snapshot);
  } finally {
    crmRepository.close();
  }
  const context = Object.freeze({
    principal: Object.freeze({
      tenant_id: TENANT_A,
      user_id: "user-postgres-consultation-t03",
      entra_subject_id: "entra-postgres-consultation-t03",
      role_ids: Object.freeze(["system_super_admin"]),
      scopes: Object.freeze(["crm.inquiry.write"]),
    }),
    rules: Object.freeze([{
      id: "allow-postgres-consultation",
      effect: "allow",
      action: "*",
    }]),
    object_acl: Object.freeze([]),
  });
  const scheduled = await authority.run({
    tenant_id: TENANT_A,
    request_context: {
      method: "POST",
      pathname: `/api/crm/inquiries/${leadId}/consultations`,
      idempotency_key: "postgres-consultation-schedule",
      actor_id: "user-postgres-consultation-t03",
    },
    command(runtimes) {
      return handleCrmIntakeApiRequest({
        pathname: `/api/crm/inquiries/${leadId}/consultations`,
        method: "POST",
        query: {},
        body: {
          tenant_id: TENANT_A,
          permission_ref: "perm-postgres-consultation",
          audit_hint_ref: "audit-postgres-consultation",
          expected_inquiry_version: 2,
          consultation: {
            subject: "PostgreSQL 상담",
            scheduled_start: consultationStart.toISOString(),
            scheduled_end: consultationEnd.toISOString(),
            timezone: "Asia/Seoul",
            next_action: "상담 준비",
          },
          reason: "상담 일정 확정",
          idempotency_key: "postgres-consultation-schedule",
        },
        context,
        requestId: "request-postgres-consultation-schedule",
        runtime: runtimes.crmIntakeRuntime,
      });
    },
  });
  assert.equal(scheduled.status, 201);
  const activityId = scheduled.body.item.crm_activity_id;
  const storedSchedule = await ledger.read({
    tenant_id: TENANT_A,
    domain_id: "crm",
    record_type: "CRMActivity",
    record_id: activityId,
  });
  assert.equal(
    storedSchedule.payload.scheduled_start,
    consultationStart.toISOString(),
  );
  assert.equal(storedSchedule.payload.timezone, "Asia/Seoul");
  assert.equal(storedSchedule.payload.version, 1);

  const emailDmsRepository = createEmailDmsRepository({
    seedRecords: [{
      model_type: "M365Connection",
      m365_connection_id: m365ConnectionId({
        tenant_id: TENANT_A,
        user_id: "user-postgres-consultation-t03",
      }),
      tenant_id: TENANT_A,
      user_id: "user-postgres-consultation-t03",
      entra_subject_id: "entra-postgres-consultation-t03",
      mailbox_address_hash: hashMailboxAddress(
        "postgres-consultation@example.invalid",
      ),
      credential_ref:
        "aws-secrets-manager:synthetic/postgres-consultation",
      granted_scopes: [...M365_GRAPH_REQUIRED_SCOPES],
      consented_at: fixtureReceivedAt.toISOString(),
      expires_at: fixtureCredentialExpiresAt.toISOString(),
      revoked_at: null,
      state_version: 1,
    }],
  });
  let calendarProviderCalls = 0;
  const linked = await authority.run({
    tenant_id: TENANT_A,
    request_context: {
      method: "POST",
      pathname:
        `/api/crm/consultations/${activityId}/outlook-event`,
      idempotency_key: "postgres-consultation-outlook-event",
      actor_id: "user-postgres-consultation-t03",
    },
    command(runtimes) {
      return handleCrmIntakeApiRequest({
        pathname:
          `/api/crm/consultations/${activityId}/outlook-event`,
        method: "POST",
        query: {},
        body: {
          tenant_id: TENANT_A,
          permission_ref: "perm-postgres-consultation",
          audit_hint_ref: "audit-postgres-consultation",
          expected_version: 1,
          reason: "Outlook 일정 만들기",
          idempotency_key: "postgres-consultation-outlook-event",
        },
        context,
        requestId: "request-postgres-consultation-outlook-event",
        runtime: {
          ...runtimes.crmIntakeRuntime,
          emailDmsRuntime: {
            ...runtimes.emailDmsRuntime,
            repository: emailDmsRepository,
          },
          m365GraphConfig: {
            feature_enabled: true,
            provider_runtime_enabled: true,
            clock: () => fixtureNow,
            credential_vault: {
              async resolveDelegatedCredential() {
                return {
                  access_token:
                    "postgres-calendar-access-token-never-return",
                  refresh_token:
                    "postgres-calendar-refresh-token-never-return",
                  refresh_profile: "client",
                  refresh_profile_proof: "C".repeat(43),
                  expires_at: fixtureCredentialExpiresAt.toISOString(),
                  granted_scopes: [...M365_GRAPH_REQUIRED_SCOPES],
                };
              },
              async storeDelegatedCredential() {},
            },
            provider: {
              async createMeCalendarEvent() {
                calendarProviderCalls += 1;
                return {
                  event_id: "postgres-calendar-event-t04",
                  web_link:
                    "https://outlook.office.com/calendar/item/postgres-t04",
                  provider_request_id:
                    "postgres-calendar-provider-request-t04",
                };
              },
            },
          },
        },
      });
    },
  });
  assert.equal(linked.status, 201, JSON.stringify(linked.body));
  assert.equal(calendarProviderCalls, 1);
  const storedOutlookEvent = await ledger.read({
    tenant_id: TENANT_A,
    domain_id: "crm",
    record_type: "CRMActivity",
    record_id: activityId,
  });
  assert.equal(
    storedOutlookEvent.payload.outlook_event_id,
    "postgres-calendar-event-t04",
  );
  assert.equal(
    storedOutlookEvent.payload.outlook_event_web_link,
    "https://outlook.office.com/calendar/item/postgres-t04",
  );
  assert.match(
    storedOutlookEvent.payload.outlook_event_transaction_id,
    /^[0-9a-f-]{36}$/,
  );
  assert.equal(storedOutlookEvent.payload.version, 2);

  const completed = await authority.run({
    tenant_id: TENANT_A,
    request_context: {
      method: "PATCH",
      pathname: `/api/crm/activities/${activityId}`,
      idempotency_key: "postgres-consultation-complete",
      actor_id: "user-postgres-consultation-t03",
    },
    command(runtimes) {
      return handleCrmIntakeApiRequest({
        pathname: `/api/crm/activities/${activityId}`,
        method: "PATCH",
        query: {},
        body: {
          tenant_id: TENANT_A,
          permission_ref: "perm-postgres-consultation",
          audit_hint_ref: "audit-postgres-consultation",
          expected_version: 2,
          field_updates: {
            completed_at: consultationCompletedAt.toISOString(),
            outcome: "상담 완료",
            next_action: "수임 여부 검토",
          },
          reason: "상담 완료",
          idempotency_key: "postgres-consultation-complete",
        },
        context,
        requestId: "request-postgres-consultation-complete",
        runtime: runtimes.crmIntakeRuntime,
      });
    },
  });
  assert.equal(completed.status, 200);
  const storedCompletion = await ledger.read({
    tenant_id: TENANT_A,
    domain_id: "crm",
    record_type: "CRMActivity",
    record_id: activityId,
  });
  assert.equal(
    storedCompletion.payload.completed_at,
    consultationCompletedAt.toISOString(),
  );
  assert.equal(storedCompletion.payload.outcome, "상담 완료");
  assert.equal(storedCompletion.payload.version, 3);
  const storedLead = await ledger.read({
    tenant_id: TENANT_A,
    domain_id: "crm",
    record_type: "Lead",
    record_id: leadId,
  });
  assert.equal(storedLead.payload.next_action, "수임 여부 검토");
  assert.equal(storedLead.payload.version, 4);
});

test("PostgreSQL API authority persists accepted inquiry handoff and serves fixed Client report snapshots and CSV", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  const ledger = createPostgresDomainLedger({ pool: fixture.appPool });
  const dmsStorage = createLocalStorageAdapter({
    adapter_id: "postgres-api-engagement-decision-test",
  });
  const authority = createPostgresApiRuntimeAuthority({
    ledger,
    dmsStorage,
    payrollArtifactSecret: PAYROLL_ARTIFACT_SECRET,
    bankImportPreviewTokens: BANK_IMPORT_PREVIEW_TOKENS,
    clientFixedReportTokenAuthority:
      createClientFixedReportSnapshotTokenAuthority({
        secret:
          "postgres-api-fixed-report-token-secret-material-20260731",
        now: () => Date.parse("2026-07-30T03:00:10.000Z"),
      }),
    dmsUploadRuntime: createPostgresDmsUploadRuntime({
      pool: fixture.appPool,
      storage: dmsStorage,
      sourceOnly: false,
    }),
  });
  await importHrxAuthorityBaseline(ledger, TENANT_A);
  const leadId = "lead-postgres-engagement-t01";
  const opportunityId = "opportunity-postgres-engagement-t01";
  const partyId = "party-postgres-engagement-t01";
  const masterDataRepository = createMasterDataRepository({
    seedRecords: [{
      model_type: "Party",
      tenant_id: TENANT_A,
      party_id: partyId,
      party_type: "organization",
      display_name: "PostgreSQL 수임 고객",
      status: "active",
      owner_user_id: "user-postgres-engagement-t01",
    }],
  });
  const crmRepository = createCrmRuntimeRepository({
    seedRecords: [
      {
        model_type: "Lead",
        lead_id: leadId,
        tenant_id: TENANT_A,
        party_id: partyId,
        opportunity_id: opportunityId,
        display_name: "PostgreSQL 수임 문의",
        status: "active",
        owner_user_id: "user-postgres-engagement-t01",
        inquiry_status: "reviewing",
        source: "manual",
        received_at: "2026-07-30T00:00:00.000Z",
        next_action: "수임 여부 검토",
        version: 2,
      },
      {
        model_type: "Opportunity",
        opportunity_id: opportunityId,
        lead_id: leadId,
        tenant_id: TENANT_A,
        party_id: partyId,
        display_name: "PostgreSQL 수임 기회",
        stage: "qualified",
        engagement_decision: "pending",
        engagement_decision_version: 1,
        status: "active",
        owner_user_id: "user-postgres-engagement-t01",
      },
    ],
  });
  try {
    await ledger.importSnapshot(createRecordRepositoryDomainSnapshot({
      descriptor: MASTER_DATA_DOMAIN_DESCRIPTOR,
      repositories: [{
        source_id: "postgres-engagement-master-data",
        repository: masterDataRepository,
      }],
      tenant_id: TENANT_A,
    }).snapshot);
    await ledger.importSnapshot(createRecordRepositoryDomainSnapshot({
      descriptor: CRM_DOMAIN_DESCRIPTOR,
      repositories: [{
        source_id: "postgres-engagement-crm",
        repository: crmRepository,
      }],
      tenant_id: TENANT_A,
    }).snapshot);
  } finally {
    masterDataRepository.close();
    crmRepository.close();
  }
  const context = Object.freeze({
    principal: Object.freeze({
      tenant_id: TENANT_A,
      user_id: "user-postgres-engagement-t01",
      role_ids: Object.freeze(["system_super_admin"]),
      scopes: Object.freeze(["crm.engagement.decide"]),
    }),
    rules: Object.freeze([{
      id: "allow-postgres-engagement",
      effect: "allow",
      action: "*",
    }]),
    object_acl: Object.freeze([]),
  });
  const created = await authority.run({
    tenant_id: TENANT_A,
    request_context: {
      method: "POST",
      pathname:
        `/api/crm/inquiries/${leadId}/engagement-decisions`,
      idempotency_key: "postgres-engagement-decision-1",
      actor_id: "user-postgres-engagement-t01",
    },
    command(runtimes) {
      return handleCrmIntakeApiRequest({
        pathname:
          `/api/crm/inquiries/${leadId}/engagement-decisions`,
        method: "POST",
        query: {},
        body: {
          tenant_id: TENANT_A,
          permission_ref: "perm-postgres-engagement",
          audit_hint_ref: "audit-postgres-engagement",
          engagement_decision: "accepted",
          expected_inquiry_version: 2,
          expected_engagement_version: 1,
          agreed_amount: 12_000_000,
          due_date: "2026-08-31",
          reason: "PostgreSQL 수임 결정",
          idempotency_key: "postgres-engagement-decision-1",
        },
        context,
        requestId: "request-postgres-engagement-decision",
        runtime: {
          ...runtimes.crmIntakeRuntime,
          engagementMasterDataRepository:
            runtimes.masterDataRuntime.repository,
          financeRuntime: runtimes.financeRuntime,
        },
      });
    },
  });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  assert.equal(created.body.outcome, "completed");
  assert.deepEqual(created.body.processing.completed_steps, [
    "decision_recorded",
    "client_group_resolved",
    "fee_commitment_created",
  ]);
  assert.equal(created.body.item.engagement_decision, "accepted");
  assert.equal(created.body.item.stage, "qualified");

  const storedLead = await ledger.read({
    tenant_id: TENANT_A,
    domain_id: "crm",
    record_type: "Lead",
    record_id: leadId,
  });
  const storedOpportunity = await ledger.read({
    tenant_id: TENANT_A,
    domain_id: "crm",
    record_type: "Opportunity",
    record_id: opportunityId,
  });
  const storedProcess = await ledger.read({
    tenant_id: TENANT_A,
    domain_id: "crm",
    record_type: "EngagementDecisionProcess",
    record_id: created.body.processing.engagement_workflow_id,
  });
  const storedClientGroup = await ledger.read({
    tenant_id: TENANT_A,
    domain_id: "master-data",
    record_type: "ClientGroup",
    record_id: created.body.processing.client_group_id,
  });
  const storedFeeCommitment = await ledger.read({
    tenant_id: TENANT_A,
    domain_id: "finance",
    record_type: "FeeCommitment",
    record_id: created.body.processing.fee_commitment_id,
  });
  assert.equal(
    storedLead.payload.client_group_id,
    storedClientGroup.payload.client_group_id,
  );
  assert.equal(storedLead.payload.version, 3);
  assert.equal(storedOpportunity.payload.engagement_decision_version, 2);
  assert.equal(storedOpportunity.payload.engagement_workflow_status, "completed");
  assert.equal(storedProcess.payload.workflow_status, "completed");
  assert.deepEqual(storedProcess.payload.completed_steps, [
    "decision_recorded",
    "client_group_resolved",
    "fee_commitment_created",
  ]);
  assert.equal(storedClientGroup.payload.primary_party_id, partyId);
  assert.equal(storedFeeCommitment.payload.agreed_amount, 12_000_000);
  assert.equal(storedFeeCommitment.payload.opportunity_id, opportunityId);
  assert.equal(
    storedFeeCommitment.payload.client_group_id,
    storedClientGroup.payload.client_group_id,
  );
  assert.equal((await ledger.list({
    tenant_id: TENANT_A,
    domain_id: "matter",
    record_type: "Matter",
  })).length, 0);

  const intakeRequestId = "intake-postgres-engagement-t02";
  const handedOff = await authority.run({
    tenant_id: TENANT_A,
    request_context: {
      method: "POST",
      pathname:
        `/api/crm/opportunities/${opportunityId}/handoff`,
      idempotency_key: "postgres-engagement-handoff-1",
      actor_id: "user-postgres-engagement-t01",
    },
    command(runtimes) {
      return handleCrmIntakeApiRequest({
        pathname:
          `/api/crm/opportunities/${opportunityId}/handoff`,
        method: "POST",
        query: {},
        body: {
          tenant_id: TENANT_A,
          permission_ref: "perm-postgres-engagement",
          audit_hint_ref: "audit-postgres-engagement-handoff",
          intake_request_id: intakeRequestId,
          requested_scope_summary: "PostgreSQL 수임 Intake 인계",
          idempotency_key: "postgres-engagement-handoff-1",
        },
        context,
        requestId: "request-postgres-engagement-handoff",
        runtime: runtimes.crmIntakeRuntime,
      });
    },
  });
  assert.equal(handedOff.status, 201, JSON.stringify(handedOff.body));
  assert.equal(handedOff.body.item.intake_request_id, intakeRequestId);
  assert.equal(handedOff.body.item.source_inquiry_id, leadId);
  assert.equal(
    handedOff.body.item.source_engagement_workflow_id,
    created.body.processing.engagement_workflow_id,
  );
  assert.equal(
    handedOff.body.item.source_client_group_id,
    created.body.processing.client_group_id,
  );
  assert.equal(
    handedOff.body.item.source_fee_commitment_id,
    created.body.processing.fee_commitment_id,
  );
  assert.deepEqual(handedOff.body.item.source_inquiry_evidence_ids, []);
  assert.deepEqual(handedOff.body.item.source_crm_activity_ids, []);
  assert.equal(
    handedOff.body.item.matter_opening_state,
    "waiting_for_intake_clearance",
  );
  assert.equal(handedOff.body.item.matter_id, undefined);
  assert.equal(handedOff.body.automatic_matter_creation, false);

  const storedIntake = await ledger.read({
    tenant_id: TENANT_A,
    domain_id: "intake",
    record_type: "IntakeRequest",
    record_id: intakeRequestId,
  });
  const handedOffOpportunity = await ledger.read({
    tenant_id: TENANT_A,
    domain_id: "crm",
    record_type: "Opportunity",
    record_id: opportunityId,
  });
  assert.equal(storedIntake.payload.source_inquiry_id, leadId);
  assert.equal(
    storedIntake.payload.source_reference_snapshot_sha256,
    handedOff.body.item.source_reference_snapshot_sha256,
  );
  assert.equal(storedIntake.payload.source_evidence_bytes_copied, false);
  assert.equal(storedIntake.payload.source_activity_content_copied, false);
  assert.equal(handedOffOpportunity.payload.stage, "intake_requested");
  assert.equal(
    handedOffOpportunity.payload.intake_request_id,
    intakeRequestId,
  );
  assert.equal(
    handedOffOpportunity.payload.intake_handoff_snapshot_sha256,
    storedIntake.payload.source_reference_snapshot_sha256,
  );
  assert.equal((await ledger.list({
    tenant_id: TENANT_A,
    domain_id: "matter",
    record_type: "Matter",
  })).length, 0);

  const clientAccessScope = await authority.run({
    tenant_id: TENANT_A,
    request_context: {
      method: "GET",
      pathname: "/api/analytics/clients/dashboard",
      actor_id: "user-postgres-engagement-t01",
    },
    command(runtimes) {
      return runtimes.analyticsRuntime.clientOperationsReadModel.read({
        tenant_id: TENANT_A,
        permission_context: context,
        project({
          financeRepository,
          crmRepository,
          matterRepository,
        }) {
          return {
            finance_repository_shared:
              financeRepository
                === runtimes.financeRuntime.repository,
            crm_repository_shared:
              crmRepository
                === runtimes.crmIntakeRuntime.crmRepository,
            matter_repository_shared:
              matterRepository
                === runtimes.matterRuntime.repository,
          };
        },
      });
    },
  });
  assert.deepEqual(
    clientAccessScope.access_scope.allowed_client_group_ids,
    [created.body.processing.client_group_id],
  );
  assert.equal(
    clientAccessScope.access_scope.permission_prefilter_applied,
    true,
  );
  assert.deepEqual(clientAccessScope.item, {
    finance_repository_shared: true,
    crm_repository_shared: true,
    matter_repository_shared: true,
  });

  const clientKpis = await authority.run({
    tenant_id: TENANT_A,
    request_context: {
      method: "GET",
      pathname: "/api/analytics/clients/dashboard",
      actor_id: "user-postgres-engagement-t01",
    },
    command(runtimes) {
      return runtimes.analyticsRuntime.clientOperationsReadModel
        .readKpis({
          tenant_id: TENANT_A,
          permission_context: context,
          as_of: "2026-07-30T03:00:00.000Z",
        });
    },
  });
  assert.deepEqual(clientKpis.item.kpis, {
    new_inquiries: 0,
    consultations_today: 0,
    engagement_reviews: 0,
    deposit_revenue_month: 0,
    receivables_total: 12_000_000,
  });

  const clientAttention = await authority.run({
    tenant_id: TENANT_A,
    request_context: {
      method: "GET",
      pathname: "/api/analytics/clients/dashboard",
      actor_id: "user-postgres-engagement-t01",
    },
    command(runtimes) {
      return runtimes.analyticsRuntime.clientOperationsReadModel
        .readAttentionItems({
          tenant_id: TENANT_A,
          permission_context: context,
          as_of: "2026-07-30T03:00:00.000Z",
        });
    },
  });
  assert.deepEqual(clientAttention.item.attention_item_ids, []);
  assert.deepEqual(
    clientAttention.item.evaluated_attention_types,
    [
      "overdue_consultation",
      "unassigned_new_inquiry",
      "consultation_today",
      "engagement_review",
      "bank_match_review",
      "fee_amount_missing",
    ],
  );

  const clientTrends = await authority.run({
    tenant_id: TENANT_A,
    request_context: {
      method: "GET",
      pathname: "/api/analytics/clients/dashboard",
      actor_id: "user-postgres-engagement-t01",
    },
    command(runtimes) {
      return runtimes.analyticsRuntime.clientOperationsReadModel
        .readTrendsAndRankings({
          tenant_id: TENANT_A,
          permission_context: context,
          as_of: "2026-07-30T03:00:00.000Z",
        });
    },
  });
  assert.equal(
    clientTrends.item.monthly_deposit_revenue.points.length,
    12,
  );
  assert.equal(
    clientTrends.item.monthly_deposit_revenue.total,
    0,
  );
  assert.deepEqual(
    clientTrends.item.inquiry_status.counts,
    {
      "새 문의": 0,
      "확인 중": 0,
      "상담 예정": 0,
      "수임 검토 중": 0,
      "수임 확정": 1,
      "수임하지 않음": 0,
    },
  );
  assert.deepEqual(
    clientTrends.item.revenue_ranking.client_group_ids,
    [],
  );
  assert.deepEqual(
    clientTrends.item.receivables_ranking.client_group_ids,
    [created.body.processing.client_group_id],
  );
  assert.equal(
    clientTrends.item.receivables_ranking.total,
    12_000_000,
  );

  const clientDashboard = await authority.run({
    tenant_id: TENANT_A,
    request_context: {
      method: "GET",
      pathname: "/api/analytics/clients/dashboard",
      actor_id: "user-postgres-engagement-t01",
    },
    command(runtimes) {
      return runtimes.analyticsRuntime.clientOperationsReadModel
        .readDashboard({
          tenant_id: TENANT_A,
          permission_context: context,
          as_of: "2026-07-30T03:00:00.000Z",
        });
    },
  });
  assert.equal(clientDashboard.item.outcome, "complete");
  assert.equal(clientDashboard.item.access_state, "allowed");
  assert.deepEqual(
    clientDashboard.item.sections.kpis.data.values,
    {
      new_inquiries: 0,
      consultations_today: 0,
      engagement_reviews: 0,
      deposit_revenue_month: 0,
      receivables_total: 12_000_000,
    },
  );
  assert.equal(
    clientDashboard.item.sections.monthly_deposit_revenue
      .data.points.length,
    12,
  );
  assert.equal(
    clientDashboard.item.sections.inquiry_status
      .data.counts["수임 확정"],
    1,
  );
  assert.deepEqual(
    clientDashboard.item.sections.receivables_ranking
      .data.client_group_ids,
    [created.body.processing.client_group_id],
  );
  assert.deepEqual(
    Object.fromEntries(
      clientDashboard.item.source_statuses.map(
        ({ source_id, status }) => [source_id, status],
      ),
    ),
    {
      master_data: "available",
      crm: "available",
      deposit_revenue: "no_data",
      receivables: "available",
      bank_review: "no_data",
      fee_amount_tasks: "no_data",
    },
  );
  assert.equal(
    clientDashboard.item.raw_source_payload_included,
    false,
  );
  assert.equal(
    clientDashboard.item.credential_material_included,
    false,
  );
  const currentPrincipalAclId =
    "postgres-fixed-report-current-principal-deny";
  const otherPrincipalAclId =
    "postgres-fixed-report-other-principal-deny";
  const otherTenantAclId =
    "postgres-fixed-report-other-tenant-deny";
  await ledger.write({
    tenant_id: TENANT_A,
    domain_id: "authz",
    record_type: "ObjectAcl",
    record_id: currentPrincipalAclId,
    expected_version: 0,
    payload: {
      tenant_id: TENANT_A,
      acl_id: currentPrincipalAclId,
      resource_id: created.body.processing.client_group_id,
      client_group_id: created.body.processing.client_group_id,
      principal_id: context.principal.user_id,
      effect: "deny",
      action: "analytics:client:read",
    },
  });
  await ledger.write({
    tenant_id: TENANT_A,
    domain_id: "authz",
    record_type: "ObjectAcl",
    record_id: otherPrincipalAclId,
    expected_version: 0,
    payload: {
      tenant_id: TENANT_A,
      acl_id: otherPrincipalAclId,
      resource_id: created.body.processing.client_group_id,
      client_group_id: created.body.processing.client_group_id,
      principal_id: "user-postgres-other-principal",
      effect: "deny",
      action: "analytics:client:read",
    },
  });
  await ledger.write({
    tenant_id: TENANT_B,
    domain_id: "authz",
    record_type: "ObjectAcl",
    record_id: otherTenantAclId,
    expected_version: 0,
    payload: {
      tenant_id: TENANT_B,
      acl_id: otherTenantAclId,
      resource_id: "client-group-other-tenant",
      client_group_id: "client-group-other-tenant",
      principal_id: context.principal.user_id,
      effect: "deny",
      action: "analytics:client:read",
    },
  });
  const objectAclResolver = createPostgresSessionObjectAclResolver({
    ledger,
  });
  const objectAclResolution = await objectAclResolver({
    tenant_id: TENANT_A,
    user_id: context.principal.user_id,
  });
  const otherPrincipalResolution = await objectAclResolver({
    tenant_id: TENANT_A,
    user_id: "user-postgres-other-principal",
  });
  const otherTenantResolution = await objectAclResolver({
    tenant_id: TENANT_B,
    user_id: context.principal.user_id,
  });
  const allowedReaderResolution = await objectAclResolver({
    tenant_id: TENANT_A,
    user_id: "user-postgres-fixed-report-reader",
  });
  assert.equal(objectAclResolution.authoritative, true);
  assert.equal(
    objectAclResolution.source_ref,
    "postgres-v2:lawos_domain.authz/ObjectAcl",
  );
  assert.deepEqual(
    objectAclResolution.object_acl.map(({ id }) => id),
    [currentPrincipalAclId],
  );
  assert.deepEqual(
    otherPrincipalResolution.object_acl.map(({ id }) => id),
    [otherPrincipalAclId],
  );
  assert.deepEqual(
    otherTenantResolution.object_acl.map(({ id }) => id),
    [otherTenantAclId],
  );
  assert.deepEqual(allowedReaderResolution.object_acl, []);
  assert.deepEqual((await ledger.list({
    tenant_id: TENANT_A,
    domain_id: "authz",
    record_type: "ObjectAcl",
  })).map(({ record_id }) => record_id), [
    currentPrincipalAclId,
    otherPrincipalAclId,
  ]);
  const deniedFixedContext = Object.freeze({
    ...context,
    object_acl: objectAclResolution.object_acl,
    object_acl_authority: Object.freeze({
      status: "authoritative",
      source_ref: objectAclResolution.source_ref,
    }),
  });
  const allowedFixedContext = Object.freeze({
    ...context,
    principal: Object.freeze({
      ...context.principal,
      user_id: "user-postgres-fixed-report-reader",
    }),
    object_acl: allowedReaderResolution.object_acl,
    object_acl_authority: Object.freeze({
      status: "authoritative",
      source_ref: allowedReaderResolution.source_ref,
    }),
  });

  const fixedReportQuery = {
    tenant_id: TENANT_A,
    permission_ref: "perm-postgres-fixed-report",
    audit_hint_ref: "audit-postgres-fixed-report",
    as_of: "2026-07-30T03:00:00.000Z",
    revenue_ranking_period: "year",
  };
  const deniedFixedScreen = await authority.run({
    tenant_id: TENANT_A,
    request_context: {
      method: "GET",
      pathname:
        "/api/reports/clients/fixed/receivables_ranking",
      actor_id: deniedFixedContext.principal.user_id,
    },
    command(runtimes) {
      return handleReportsApiRequest({
        pathname:
          "/api/reports/clients/fixed/receivables_ranking",
        method: "GET",
        query: fixedReportQuery,
        body: {},
        context: deniedFixedContext,
        requestId:
          "request-postgres-fixed-report-denied-screen",
        runtime: {
          analyticsRuntime: runtimes.analyticsRuntime,
        },
      });
    },
  });
  assert.equal(deniedFixedScreen.status, 200);
  assert.equal(deniedFixedScreen.body.outcome, "empty");
  assert.equal(deniedFixedScreen.body.ui_state, "no_data");
  assert.deepEqual(deniedFixedScreen.body.item.rows, []);
  assert.equal(
    JSON.stringify(deniedFixedScreen.body).includes("12000000"),
    false,
  );
  const deniedFixedCsv = await authority.run({
    tenant_id: TENANT_A,
    request_context: {
      method: "POST",
      pathname:
        "/api/reports/clients/fixed/receivables_ranking.csv",
      idempotency_key:
        "postgres-fixed-report-denied-export-1",
      actor_id: deniedFixedContext.principal.user_id,
    },
    command(runtimes) {
      return handleReportsApiRequest({
        pathname:
          "/api/reports/clients/fixed/receivables_ranking.csv",
        method: "POST",
        query: {},
        body: {
          tenant_id: TENANT_A,
          permission_ref:
            "perm-postgres-fixed-report-denied-export",
          audit_hint_ref:
            "audit-postgres-fixed-report-denied-export",
          snapshot_token:
            deniedFixedScreen.body.item.snapshot.token,
          snapshot_version:
            deniedFixedScreen.body.item.snapshot.version,
          idempotency_key:
            "postgres-fixed-report-denied-export-1",
        },
        context: deniedFixedContext,
        requestId:
          "request-postgres-fixed-report-denied-export",
        runtime: {
          analyticsRuntime: runtimes.analyticsRuntime,
        },
      });
    },
  });
  assert.equal(deniedFixedCsv.status, 201);
  assert.deepEqual(deniedFixedCsv.body.item.rows, []);
  assert.equal(
    JSON.stringify(deniedFixedCsv.body).includes("12000000"),
    false,
  );

  const fixedScreen = await authority.run({
    tenant_id: TENANT_A,
    request_context: {
      method: "GET",
      pathname:
        "/api/reports/clients/fixed/receivables_ranking",
      actor_id: allowedFixedContext.principal.user_id,
    },
    command(runtimes) {
      return handleReportsApiRequest({
        pathname:
          "/api/reports/clients/fixed/receivables_ranking",
        method: "GET",
        query: fixedReportQuery,
        body: {},
        context: allowedFixedContext,
        requestId: "request-postgres-fixed-report-screen",
        runtime: {
          analyticsRuntime: runtimes.analyticsRuntime,
        },
      });
    },
  });
  assert.equal(
    fixedScreen.status,
    200,
    JSON.stringify(fixedScreen.body),
  );
  assert.equal(fixedScreen.body.item.row_count, 1);
  assert.equal(
    fixedScreen.body.item.rows[0].receivable_amount,
    12_000_000,
  );

  const fixedCsv = await authority.run({
    tenant_id: TENANT_A,
    request_context: {
      method: "POST",
      pathname:
        "/api/reports/clients/fixed/receivables_ranking.csv",
      idempotency_key: "postgres-fixed-report-export-1",
      actor_id: allowedFixedContext.principal.user_id,
    },
    command(runtimes) {
      return handleReportsApiRequest({
        pathname:
          "/api/reports/clients/fixed/receivables_ranking.csv",
        method: "POST",
        query: {},
        body: {
          tenant_id: TENANT_A,
          permission_ref: "perm-postgres-fixed-report-export",
          audit_hint_ref: "audit-postgres-fixed-report-export",
          snapshot_token:
            fixedScreen.body.item.snapshot.token,
          snapshot_version:
            fixedScreen.body.item.snapshot.version,
          idempotency_key: "postgres-fixed-report-export-1",
        },
        context: allowedFixedContext,
        requestId: "request-postgres-fixed-report-export",
        runtime: {
          analyticsRuntime: runtimes.analyticsRuntime,
        },
      });
    },
  });
  assert.equal(
    fixedCsv.status,
    201,
    JSON.stringify(fixedCsv.body),
  );
  assert.deepEqual(
    fixedCsv.body.item.rows,
    fixedScreen.body.item.rows,
  );
  const malformedPrincipalCases = [
    {
      tenant_id: "tenant_postgres_acl_missing_principal",
      record_id: "postgres-acl-missing-principal",
    },
    {
      tenant_id: "tenant_postgres_acl_non_string_principal",
      record_id: "postgres-acl-non-string-principal",
      principal_id: 42,
    },
  ];
  for (const malformed of malformedPrincipalCases) {
    await ledger.write({
      tenant_id: malformed.tenant_id,
      domain_id: "authz",
      record_type: "ObjectAcl",
      record_id: malformed.record_id,
      expected_version: 0,
      payload: {
        tenant_id: malformed.tenant_id,
        acl_id: malformed.record_id,
        resource_id: "revenue_ranking",
        ...(malformed.principal_id === undefined
          ? {}
          : { principal_id: malformed.principal_id }),
        effect: "deny",
        action: "analytics:client:read",
      },
    });
    await assert.rejects(
      objectAclResolver({
        tenant_id: malformed.tenant_id,
        user_id: context.principal.user_id,
      }),
      /ObjectAcl\.principal_id is invalid/u,
    );
  }
  assert.deepEqual(
    (await objectAclResolver({
      tenant_id: TENANT_A,
      user_id: context.principal.user_id,
    })).object_acl.map(({ id }) => id),
    [currentPrincipalAclId],
  );

  const whitespacePrincipalAclId =
    "postgres-acl-whitespace-principal";
  await ledger.write({
    tenant_id: TENANT_A,
    domain_id: "authz",
    record_type: "ObjectAcl",
    record_id: whitespacePrincipalAclId,
    expected_version: 0,
    payload: {
      tenant_id: TENANT_A,
      acl_id: whitespacePrincipalAclId,
      resource_id: "revenue_ranking",
      principal_id: `${context.principal.user_id} `,
      effect: "deny",
      action: "analytics:client:read",
    },
  });
  await assert.rejects(
    objectAclResolver({
      tenant_id: TENANT_A,
      user_id: context.principal.user_id,
    }),
    /ObjectAcl\.principal_id is invalid/u,
  );

  const malformedCanonicalPostgresAclCases = [
    ["action", "action", "analytics:client:read "],
    ["actions", "actions", ["analytics:client:read "]],
    ["resource-id", "resource_id", `${created.body.processing.client_group_id} `],
    ["client-group-id", "client_group_id", `${created.body.processing.client_group_id} `],
    ["resource-type", "resource_type", "ClientGroup "],
  ];
  for (const [label, field, value] of malformedCanonicalPostgresAclCases) {
    const tenantId = `tenant_postgres_acl_malformed_${label}`;
    const recordId = `postgres-acl-malformed-canonical-${label}`;
    await ledger.write({
      tenant_id: tenantId,
      domain_id: "authz",
      record_type: "ObjectAcl",
      record_id: recordId,
      expected_version: 0,
      payload: {
        tenant_id: tenantId,
        acl_id: recordId,
        resource_id: created.body.processing.client_group_id,
        client_group_id: created.body.processing.client_group_id,
        principal_id: context.principal.user_id,
        effect: "deny",
        action: "analytics:client:read",
        [field]: value,
      },
    });
    await assert.rejects(
      objectAclResolver({
        tenant_id: tenantId,
        user_id: context.principal.user_id,
      }),
      new RegExp(`ObjectAcl\\.${field} is invalid`, "u"),
    );
  }

  console.log(JSON.stringify({
    scenario: "postgres-client-fixed-report",
    screen_status: fixedScreen.status,
    csv_status: fixedCsv.status,
    row_count: fixedScreen.body.item.row_count,
    screen_csv_equal: true,
    token_authority_injected_per_request: true,
    object_acl_authority:
      "postgres-v2:lawos_domain.authz/ObjectAcl",
    current_principal_acl_count:
      objectAclResolution.object_acl.length,
    other_principal_leak_count:
      objectAclResolution.object_acl.filter(
        ({ id }) => id === otherPrincipalAclId,
      ).length,
    other_tenant_leak_count:
      objectAclResolution.object_acl.filter(
        ({ id }) => id === otherTenantAclId,
      ).length,
    persisted_client_group_deny_screen_status:
      deniedFixedScreen.status,
    persisted_client_group_deny_csv_status:
      deniedFixedCsv.status,
    persisted_client_group_deny_row_count:
      deniedFixedScreen.body.item.row_count,
    denied_receivable_amount_included: false,
    authoritative_empty_reader_screen_status:
      fixedScreen.status,
    authoritative_empty_reader_csv_status:
      fixedCsv.status,
    malformed_principal_cases_rejected: [
      "whitespace",
      "missing",
      "non-string",
    ],
    malformed_canonical_acl_cases_rejected: [
      "action",
      "actions",
      "resource_id",
      "client_group_id",
      "resource_type",
    ],
    malformed_other_tenant_does_not_poison_current_tenant:
      true,
  }));
});

test("PostgreSQL API authority completes the concurrent audited browser read set without leaking conflicts", async (t) => {
  const fixture = await createMigratedPostgresFixture(t, { appPoolMax: 24 });
  if (!fixture) return;
  const ledger = createPostgresDomainLedger({ pool: fixture.appPool });
  const dmsStorage = createLocalStorageAdapter({ adapter_id: "postgres-api-home-concurrency-test" });
  const authority = createPostgresApiRuntimeAuthority({
    ledger,
    dmsStorage,
    payrollArtifactSecret: PAYROLL_ARTIFACT_SECRET,
    bankImportPreviewTokens: BANK_IMPORT_PREVIEW_TOKENS,
    dmsUploadRuntime: createPostgresDmsUploadRuntime({ pool: fixture.appPool, storage: dmsStorage, sourceOnly: false }),
  });
  assert.equal(authority.domain_ids.includes("email-dms"), true);
  await importHrxAuthorityBaseline(ledger, TENANT_A);
  const emailDmsBoundary = await authority.run({
    tenant_id: TENANT_A,
    request_context: { method: "GET" },
    command: (runtimes) => ({
      authority: runtimes.emailDmsRuntime.authority,
      repository_authority:
        runtimes.emailDmsRuntime.repository.authority,
      storage_shared_with_dms:
        runtimes.emailDmsRuntime.storage === runtimes.dmsRuntime.storage,
      crm_read_model_uses_email_dms_repository:
        runtimes.crmIntakeRuntime.emailDmsRepository
          === runtimes.emailDmsRuntime.repository,
      production_ready_claim:
        runtimes.emailDmsRuntime.production_ready_claim,
    }),
  });
  assert.deepEqual(emailDmsBoundary, {
    authority: "postgres-v2",
    repository_authority: "email-dms",
    storage_shared_with_dms: true,
    crm_read_model_uses_email_dms_repository: true,
    production_ready_claim: false,
  });
  const context = Object.freeze({
    principal: Object.freeze({ tenant_id: TENANT_A, user_id: "user_home_concurrency_test" }),
    rules: Object.freeze([{ id: "allow-home-read", effect: "allow", action: "*" }]),
    object_acl: Object.freeze([]),
  });
  const routes = [
    { pathname: "/api/home/action-inbox", query: { type: "approval" }, handler: "home" },
    { pathname: "/api/home/action-inbox", query: { type: "task" }, handler: "home" },
    { pathname: "/api/home/agenda", query: { from: "2026-07-01T00:00:00.000Z", to: "2026-07-31T23:59:59.999Z" }, handler: "home" },
    { pathname: "/api/home/feed", query: { tab: "notice" }, handler: "home" },
    { pathname: "/api/ai/review-queue", query: {}, handler: "ai" },
    { pathname: "/api/analytics/dashboards", query: {}, handler: "analytics" },
    { pathname: "/api/analytics/finance/monthly", query: {}, handler: "analytics" },
    { pathname: "/api/crm/inquiries", query: {}, handler: "crm" },
    { pathname: "/api/crm/opportunities", query: {}, handler: "crm" },
    { pathname: "/api/data-room/projections", query: {}, handler: "portal" },
    { pathname: "/api/finance/ar-aging", query: {}, handler: "finance" },
    { pathname: "/api/finance/invoices", query: {}, handler: "finance" },
    { pathname: "/api/finance/time-entries", query: {}, handler: "finance" },
    { pathname: "/api/hrx/employees", query: {}, handler: "hrx" },
    { pathname: "/api/hrx/legal-people/search", query: {}, handler: "hrx" },
    { pathname: "/api/hrx/legal-people/ethics", query: {}, handler: "hrx" },
    { pathname: "/api/hrx/legal-people/relationships", query: {}, handler: "hrx" },
    { pathname: "/api/portal/dashboard", query: {}, handler: "portal" },
    { pathname: "/api/portal/rfi", query: {}, handler: "portal" },
    { pathname: "/master-data/records", query: {}, handler: "master-data" },
  ];
  const browserRead = ({
    route,
    occurrence,
    auditHint = `audit_home_concurrency_test_${occurrence}`,
  }) => authority.run({
    tenant_id: TENANT_A,
    request_context: {
      method: "GET",
      pathname: route.pathname,
      request_target_hash: occurrence.padEnd(64, "a"),
      request_body_hash: "b".repeat(64),
      idempotency_key: `home-read-${occurrence}`,
      actor_id: "user_home_concurrency_test",
    },
    command: (runtimes) => {
      const query = {
        tenant_id: TENANT_A,
        permission_ref: "perm_home_concurrency_test",
        audit_hint_ref: auditHint,
        ...route.query,
      };
      const requestId = `req_home_concurrency_test_${occurrence}`;
      if (route.handler === "ai") {
        return handleAiApiRequest({
          pathname: route.pathname,
          method: "GET",
          query,
          context,
          requestId,
          runtime: runtimes.aiRuntime,
        });
      }
      if (route.handler === "analytics") {
        return handleAnalyticsApiRequest({
          pathname: route.pathname,
          method: "GET",
          query,
          context,
          requestId,
          runtime: runtimes.analyticsRuntime,
        });
      }
      if (route.handler === "crm") {
        return handleCrmIntakeApiRequest({
          pathname: route.pathname,
          method: "GET",
          query,
          context,
          requestId,
          runtime: runtimes.crmIntakeRuntime,
        });
      }
      if (route.handler === "finance") {
        return handleFinanceApiRequest({
          pathname: route.pathname,
          method: "GET",
          query,
          context,
          requestId,
          runtime: runtimes.financeRuntime,
        });
      }
      if (route.handler === "hrx") {
        return handleHrxApiRequest({
          pathname: route.pathname,
          method: "GET",
          query,
          context: runtimes.hrxRuntime,
          requestContext: {
            tenant_id: TENANT_A,
            actor_id: "user_home_concurrency_test",
            actor_role: "firm_admin",
            hrx_scopes: ["hrx.employee.read", "hrx.legal_people.read"],
            session_bound: true,
          },
          permissionContext: context,
        });
      }
      if (route.handler === "master-data") {
        return handleRecordsSearch({
          query,
          context,
          requestId,
          runtime: runtimes.masterDataRuntime,
        });
      }
      if (route.handler === "portal") {
        return handlePortalApiRequest({
          pathname: route.pathname,
          method: "GET",
          query,
          context,
          requestId,
          runtime: runtimes.portalRuntime,
        });
      }
      return handleHomeDashboardApiRequest({
        pathname: route.pathname,
        method: "GET",
        query,
        context,
        requestId,
        runtime: runtimes.homeDashboardRuntime,
      });
    },
  });

  const requests = Array.from({ length: 3 }, (_, round) => routes.map((route, index) => ({
    route,
    occurrence: `${round}-${index}`,
  }))).flat();
  const settled = await Promise.allSettled(requests.map(browserRead));
  const failures = settled
    .map((result, index) => ({ result, request: requests[index] }))
    .filter(({ result }) => result.status === "rejected")
    .map(({ result, request }) => ({
      pathname: request.route.pathname,
      occurrence: request.occurrence,
      code: result.reason?.code ?? null,
      safe_error_code: result.reason?.safe_error_code ?? null,
      status: result.reason?.status ?? null,
    }));
  assert.deepEqual(failures, []);
  const results = settled.map((result) => result.value);

  assert.equal(results.length, routes.length * 3);
  assert.equal(
    results.every((result) => result.status === 200),
    true,
    JSON.stringify(results.map((result) => ({
      status: result.status,
      safe_error_codes: result.body?.safe_error_codes ?? [],
    }))),
  );
  assert.equal((await ledger.listAudit({ tenant_id: TENANT_A, domain_id: "analytics" })).length, 12);

  const replay = {
    route: routes[0],
    occurrence: "0-0",
  };
  assert.equal((await browserRead(replay)).status, 200);
  assert.equal((await ledger.listAudit({ tenant_id: TENANT_A, domain_id: "analytics" })).length, 12);

  await assert.rejects(
    browserRead({ ...replay, auditHint: "audit_home_concurrency_test_reused_with_different_semantics" }),
    (error) => error?.safe_error_code === "HOME_AUDIT_IDEMPOTENCY_CONFLICT",
  );
});

test("PostgreSQL API authority commits product state, idempotency, audit and outbox without JSON fallback", async (t) => {
  const fixture = await createMigratedPostgresFixture(t, { appPoolMax: 1 });
  if (!fixture) return;
  assert.equal(fixture.appPool.options.max, 1);
  const ledger = createPostgresDomainLedger({
    pool: fixture.appPool,
    clock: () => new Date("2026-07-18T00:00:00.000Z"),
  });
  const dmsStorage = createLocalStorageAdapter({ adapter_id: "postgres-api-authority-test" });
  const authority = createPostgresApiRuntimeAuthority({
    ledger,
    dmsStorage,
    payrollArtifactSecret: PAYROLL_ARTIFACT_SECRET,
    bankImportPreviewTokens: BANK_IMPORT_PREVIEW_TOKENS,
    dmsUploadRuntime: createPostgresDmsUploadRuntime({ pool: fixture.appPool, storage: dmsStorage, sourceOnly: false }),
  });
  assert.equal(authority.capabilities.json_fallback, false);
  assert.equal(authority.capabilities.dual_write, false);
  assert.equal(authority.capabilities.offline_mutation, false);
  await importHrxAuthorityBaseline(ledger, TENANT_A);
  await importHrxAuthorityBaseline(ledger, TENANT_B);

  const created = await authority.run({
    tenant_id: TENANT_A,
    command(runtimes) {
      return runtimes.matterRuntime.repository.transaction((tx) => {
        const matter = tx.create({
          model_type: "Matter",
          matter_id: "matter_postgres_authority_001",
          tenant_id: TENANT_A,
          client_id: "client_postgres_authority_001",
          title: "PostgreSQL authority matter",
          status: "open",
          matter_code: "PG-AUTH-001",
          created_by: "user_postgres_authority_test",
          created_at: "2026-07-18T00:00:00.000Z",
          permission_envelope_id: "perm_postgres_authority_001",
          audit_trace_id: "audit_postgres_authority_001",
        });
        tx.recordIdempotency({
          tenant_id: TENANT_A,
          idempotency_key: "matter-postgres-authority-create-001",
          operation: "matter_create",
          response: { matter_id: matter.matter_id, outcome: "created" },
        });
        tx.appendAudit({
          tenant_id: TENANT_A,
          event_id: "matter:postgres-authority:create:001",
          action: "matter.created",
          actor_id: "user_postgres_authority_test",
          object_type: "Matter",
          object_id: matter.matter_id,
          metadata: { changed_field_count: 1 },
        });
        return matter;
      });
    },
  });
  assert.equal(created.matter_id, "matter_postgres_authority_001");

  const tenantAItems = await authority.run({
    tenant_id: TENANT_A,
    command: (runtimes) => runtimes.matterRuntime.repository.list({ tenant_id: TENANT_A, model_type: "Matter" }),
  });
  const tenantBItems = await authority.run({
    tenant_id: TENANT_B,
    command: (runtimes) => runtimes.matterRuntime.repository.list({ tenant_id: TENANT_B, model_type: "Matter" }),
  });
  assert.equal(tenantAItems.length, 1);
  assert.equal(tenantBItems.length, 0);
  assert.equal((await ledger.listIdempotency({ tenant_id: TENANT_A, domain_id: "matter" })).length, 1);
  assert.equal((await ledger.listAudit({ tenant_id: TENANT_A, domain_id: "matter" })).length, 1);
  assert.equal((await ledger.listOutbox({ tenant_id: TENANT_A, domain_id: "matter" })).length, 1);
});

test("PostgreSQL API authority resolves ClientGroup and Opportunity before committing a FeeCommitment", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  const ledger = createPostgresDomainLedger({ pool: fixture.appPool });
  const dmsStorage = createLocalStorageAdapter({
    adapter_id: "postgres-api-fee-commitment-test",
  });
  const authority = createPostgresApiRuntimeAuthority({
    ledger,
    dmsStorage,
    payrollArtifactSecret: PAYROLL_ARTIFACT_SECRET,
    bankImportPreviewTokens: BANK_IMPORT_PREVIEW_TOKENS,
    dmsUploadRuntime: createPostgresDmsUploadRuntime({
      pool: fixture.appPool,
      storage: dmsStorage,
      sourceOnly: false,
    }),
  });
  await importHrxAuthorityBaseline(ledger, TENANT_A);
  const masterDataRepository = createMasterDataRepository({
    seedRecords: [
      {
        model_type: "Party",
        tenant_id: TENANT_A,
        party_id: "party-postgres-fee-commitment",
        party_type: "organization",
        display_name: "PostgreSQL 수임 고객",
        status: "active",
        owner_user_id: "user_postgres_fee_commitment",
      },
      {
        model_type: "ClientGroup",
        tenant_id: TENANT_A,
        client_group_id: "client-postgres-fee-commitment",
        display_name: "PostgreSQL 수임 고객",
        member_party_ids: ["party-postgres-fee-commitment"],
        primary_party_id: "party-postgres-fee-commitment",
        status: "active",
        owner_user_id: "user_postgres_fee_commitment",
      },
    ],
  });
  const crmRepository = createCrmRuntimeRepository({
    seedRecords: [{
      model_type: "Opportunity",
      tenant_id: TENANT_A,
      opportunity_id: "opportunity-postgres-fee-commitment",
      party_id: "party-postgres-fee-commitment",
      display_name: "PostgreSQL 수임 확정",
      stage: "closed_won",
      status: "active",
      owner_user_id: "user_postgres_fee_commitment",
    }],
  });
  try {
    await ledger.importSnapshot(createRecordRepositoryDomainSnapshot({
      descriptor: MASTER_DATA_DOMAIN_DESCRIPTOR,
      repositories: [{
        source_id: "postgres-fee-commitment-master-data",
        repository: masterDataRepository,
      }],
      tenant_id: TENANT_A,
    }).snapshot);
    await ledger.importSnapshot(createRecordRepositoryDomainSnapshot({
      descriptor: CRM_DOMAIN_DESCRIPTOR,
      repositories: [{
        source_id: "postgres-fee-commitment-crm",
        repository: crmRepository,
      }],
      tenant_id: TENANT_A,
    }).snapshot);
    const financeRepository = createFinanceRepository({
      seedRecords: [
        {
          model_type: "BankImportBatch",
          bank_import_batch_id: "bank-batch-postgres-fee-commitment",
          tenant_id: TENANT_A,
          source_manifest_hash: "9".repeat(64),
          status: "reconciled",
        },
        {
          model_type: "BankTransaction",
          bank_transaction_id: "bank-transaction-postgres-fee-commitment",
          bank_import_batch_id: "bank-batch-postgres-fee-commitment",
          tenant_id: TENANT_A,
          transaction_fingerprint: "8".repeat(64),
          occurred_at: "2026-07-30T09:00:00+09:00",
          direction: "inflow",
          amount: 9_000_000,
          currency: "KRW",
          status: "posted",
        },
        {
          model_type: "BankTransactionClassification",
          bank_transaction_classification_id:
            POSTGRES_FEE_DEPOSIT_CLASSIFICATION_ID,
          bank_transaction_id: "bank-transaction-postgres-fee-commitment",
          tenant_id: TENANT_A,
          client_group_id: "client-postgres-fee-commitment",
          transaction_direction: "inflow",
          amount: 9_000_000,
          currency: "KRW",
          category: "client_receipt",
          status: "confirmed",
        },
        {
          model_type: "BankTransaction",
          bank_transaction_id: "bank-refund-postgres-fee-commitment",
          bank_import_batch_id: "bank-batch-postgres-fee-commitment",
          tenant_id: TENANT_A,
          account_ref: "account-postgres-fee-commitment",
          transaction_fingerprint: "7".repeat(64),
          date: "2026-07-31",
          occurred_at: "2026-07-31T09:00:00+09:00",
          direction: "outflow",
          amount: 1_000_000,
          balance_after: 8_000_000,
          currency: "KRW",
          counterparty: "PostgreSQL 수임 고객 환불",
          source_category: "고객 환불",
          classification_scope: "unreviewed",
          status: "posted",
        },
      ],
    });
    try {
      await ledger.importSnapshot(createFinanceDomainSnapshot({
        repositories: [{
          source_id: "postgres-fee-commitment-bank-deposit",
          repository: financeRepository,
        }],
        tenant_id: TENANT_A,
      }).snapshot);
    } finally {
      financeRepository.close();
    }
  } finally {
    masterDataRepository.close();
    crmRepository.close();
  }
  assert.equal((await ledger.read({
    tenant_id: TENANT_A,
    domain_id: "master-data",
    record_type: "ClientGroup",
    record_id: "client-postgres-fee-commitment",
  }))?.payload?.primary_party_id, "party-postgres-fee-commitment");
  assert.equal((await ledger.read({
    tenant_id: TENANT_A,
    domain_id: "crm",
    record_type: "Opportunity",
    record_id: "opportunity-postgres-fee-commitment",
  }))?.payload?.party_id, "party-postgres-fee-commitment");
  const context = Object.freeze({
    principal: Object.freeze({
      tenant_id: TENANT_A,
      user_id: "user_postgres_fee_commitment",
      role_ids: Object.freeze(["system_super_admin"]),
      scopes: Object.freeze([
        "finance.fee.write",
        "finance.bank.classify",
      ]),
    }),
    rules: Object.freeze([{
      id: "allow-postgres-fee-commitment",
      effect: "allow",
      action: "*",
    }]),
    object_acl: Object.freeze([]),
  });
  const references = await authority.run({
    tenant_id: TENANT_A,
    request_context: { method: "GET" },
    command: (runtimes) => ({
      client_groups: runtimes.masterDataRuntime.repository.list({
        tenant_id: TENANT_A,
        model_type: "ClientGroup",
      }),
      client_group: runtimes.masterDataRuntime.repository.get({
        tenant_id: TENANT_A,
        model_type: "ClientGroup",
        client_group_id: "client-postgres-fee-commitment",
      }),
      opportunity: runtimes.crmIntakeRuntime.crmRepository.get({
        tenant_id: TENANT_A,
        model_type: "Opportunity",
        opportunity_id: "opportunity-postgres-fee-commitment",
      }),
      opportunities: runtimes.crmIntakeRuntime.crmRepository.list({
        tenant_id: TENANT_A,
        model_type: "Opportunity",
      }),
    }),
  });
  assert.ok(references.client_group, JSON.stringify(references));
  assert.ok(references.opportunity, JSON.stringify(references));
  assert.deepEqual(references.client_group.member_party_ids, [
    "party-postgres-fee-commitment",
  ]);
  assert.equal(references.opportunity.party_id, "party-postgres-fee-commitment");

  const created = await authority.run({
    tenant_id: TENANT_A,
    request_context: {
      method: "POST",
      pathname: "/api/finance/fee-commitments",
      request_target_hash: "f".repeat(64),
      request_body_hash: "e".repeat(64),
      idempotency_key: "postgres-fee-commitment-create",
      actor_id: "user_postgres_fee_commitment",
    },
    command(runtimes) {
      return handleFinanceApiRequest({
        pathname: "/api/finance/fee-commitments",
        method: "POST",
        query: {},
        body: {
          tenant_id: TENANT_A,
          permission_ref: "perm-postgres-fee-commitment",
          audit_hint_ref: "audit-postgres-fee-commitment",
          idempotency_key: "postgres-fee-commitment-create",
          fee_commitment: {
            fee_commitment_id: "fee-commitment-postgres-authority",
            tenant_id: TENANT_A,
            client_group_id: "client-postgres-fee-commitment",
            opportunity_id: "opportunity-postgres-fee-commitment",
            matter_id: null,
            currency: "KRW",
            agreed_amount: 7_000_000,
            due_date: "2026-08-31",
            accepted_at: "2026-07-30T18:00:00+09:00",
            source_fee_arrangement_id: null,
            reason: "PostgreSQL 다중 도메인 수임 확정",
          },
        },
        context,
        requestId: "request-postgres-fee-commitment",
        runtime: runtimes.financeRuntime,
      });
    },
  });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  assert.equal(created.body.item.agreed_amount, 7_000_000);
  assert.deepEqual(created.body.deposit_allocation, {
    outcome: "allocated",
    created_count: 1,
    updated_count: 0,
    allocated_amount: 7_000_000,
    advance_or_overpayment_amount: 2_000_000,
  });

  const updated = await authority.run({
    tenant_id: TENANT_A,
    request_context: {
      method: "PATCH",
      pathname: "/api/finance/fee-commitments/fee-commitment-postgres-authority",
      request_target_hash: "d".repeat(64),
      request_body_hash: "c".repeat(64),
      idempotency_key: "postgres-fee-commitment-update",
      actor_id: "user_postgres_fee_commitment",
    },
    command(runtimes) {
      return handleFinanceApiRequest({
        pathname: "/api/finance/fee-commitments/fee-commitment-postgres-authority",
        method: "PATCH",
        query: {},
        body: {
          tenant_id: TENANT_A,
          permission_ref: "perm-postgres-fee-commitment",
          audit_hint_ref: "audit-postgres-fee-commitment-update",
          idempotency_key: "postgres-fee-commitment-update",
          expected_state_version: 1,
          changes: {
            agreed_amount: 8_000_000,
          },
          reason: "담당 변호사가 확정 금액을 정정함",
        },
        context,
        requestId: "request-postgres-fee-commitment-update",
        runtime: runtimes.financeRuntime,
      });
    },
  });
  assert.equal(updated.status, 200, JSON.stringify(updated.body));
  assert.equal(updated.body.item.agreed_amount, 8_000_000);
  assert.equal(updated.body.item.state_version, 2);
  assert.deepEqual(updated.body.deposit_allocation, {
    outcome: "allocated",
    created_count: 0,
    updated_count: 1,
    allocated_amount: 1_000_000,
    advance_or_overpayment_amount: 1_000_000,
  });

  const [allocationBeforeManual] = await authority.run({
    tenant_id: TENANT_A,
    request_context: { method: "GET" },
    command: (runtimes) => runtimes.financeRuntime.repository.list({
      tenant_id: TENANT_A,
      model_type: "ClientDepositAllocation",
    }),
  });
  const manuallyReallocated = await authority.run({
    tenant_id: TENANT_A,
    request_context: {
      method: "POST",
      pathname: "/api/finance/client-deposit-allocations/reallocate",
      request_target_hash: "b".repeat(64),
      request_body_hash: "a".repeat(64),
      idempotency_key: "postgres-deposit-reallocate",
      actor_id: "user_postgres_fee_commitment",
    },
    command(runtimes) {
      return handleFinanceApiRequest({
        pathname: "/api/finance/client-deposit-allocations/reallocate",
        method: "POST",
        query: {},
        body: {
          tenant_id: TENANT_A,
          permission_ref: "perm-postgres-deposit-reallocate",
          audit_hint_ref: "audit-postgres-deposit-reallocate",
          idempotency_key: "postgres-deposit-reallocate",
          bank_transaction_id:
            "bank-transaction-postgres-fee-commitment",
          expected_allocations: [{
            client_deposit_allocation_id:
              allocationBeforeManual.client_deposit_allocation_id,
            state_version: allocationBeforeManual.state_version,
          }],
          targets: [{
            fee_commitment_id:
              "fee-commitment-postgres-authority",
            active_amount: 7_000_000,
          }],
          reason: "PostgreSQL 수동 입금 연결 확인",
        },
        context,
        requestId: "request-postgres-deposit-reallocate",
        runtime: runtimes.financeRuntime,
      });
    },
  });
  assert.equal(
    manuallyReallocated.status,
    200,
    JSON.stringify(manuallyReallocated.body),
  );
  assert.equal(
    manuallyReallocated.body.item.active_allocated_amount,
    7_000_000,
  );
  assert.equal(manuallyReallocated.body.items[0].manual_lock, true);

  const linkedRefund = await authority.run({
    tenant_id: TENANT_A,
    request_context: {
      method: "POST",
      pathname: "/api/finance/bank-classifications/review",
      request_target_hash: "9".repeat(64),
      request_body_hash: "8".repeat(64),
      idempotency_key: "postgres-deposit-refund-link",
      actor_id: "user_postgres_fee_commitment",
    },
    command(runtimes) {
      return handleFinanceApiRequest({
        pathname: "/api/finance/bank-classifications/review",
        method: "POST",
        query: {},
        body: {
          tenant_id: TENANT_A,
          permission_ref: "perm-postgres-deposit-refund",
          audit_hint_ref: "audit-postgres-deposit-refund",
          idempotency_key: "postgres-deposit-refund-link",
          decisions: [{
            bank_transaction_id:
              "bank-refund-postgres-fee-commitment",
            category: "refund_reversal",
            refund_of_bank_transaction_id:
              "bank-transaction-postgres-fee-commitment",
            expected_state_version: 0,
          }],
        },
        context,
        requestId: "request-postgres-deposit-refund",
        runtime: runtimes.financeRuntime,
      });
    },
  });
  assert.equal(linkedRefund.status, 200, JSON.stringify(linkedRefund.body));
  assert.deepEqual(linkedRefund.body.deposit_allocation_reversal, {
    outcome: "synchronized",
    updated_count: 1,
    linked_refund_amount: 1_000_000,
    refund_reversed_amount: 1_000_000,
    unapplied_refund_amount: 0,
    inactive_commitment_released_amount: 0,
  });

  const persisted = await ledger.read({
    tenant_id: TENANT_A,
    domain_id: "finance",
    record_type: "FeeCommitment",
    record_id: "fee-commitment-postgres-authority",
  });
  assert.equal(persisted.payload.client_group_id, "client-postgres-fee-commitment");
  assert.equal(persisted.payload.opportunity_id, "opportunity-postgres-fee-commitment");
  assert.equal(persisted.payload.agreed_amount, 8_000_000);
  assert.equal(persisted.payload.state_version, 2);
  const allocation = await ledger.list({
    tenant_id: TENANT_A,
    domain_id: "finance",
    record_type: "ClientDepositAllocation",
  });
  assert.equal(allocation.length, 1);
  assert.equal(allocation[0].payload.allocated_amount, 8_000_000);
  assert.equal(allocation[0].payload.reversed_amount, 2_000_000);
  assert.equal(allocation[0].payload.refund_reversed_amount, 1_000_000);
  assert.equal(
    allocation[0].payload.adjustment_reversed_amount,
    1_000_000,
  );
  assert.equal(allocation[0].payload.allocation_source, "manual");
  assert.equal(allocation[0].payload.manual_lock, true);
  assert.equal(allocation[0].payload.state_version, 4);
  assert.equal((await ledger.listIdempotency({
    tenant_id: TENANT_A,
    domain_id: "finance",
  })).length, 7);
  const financeAudit = await ledger.listAudit({
    tenant_id: TENANT_A,
    domain_id: "finance",
  });
  assert.equal(
    financeAudit.some((event) => event.event_type === "fee_commitment.create"),
    true,
  );
  assert.equal(
    financeAudit.filter(
      (event) => event.event_type === "client.deposit.allocation.auto",
    ).length,
    2,
  );
  assert.equal(
    financeAudit.some(
      (event) => event.event_type === "client.deposit.allocation.reallocate",
    ),
    true,
  );
  assert.equal(
    financeAudit.some(
      (event) => (
        event.event_type === "client.deposit.allocation.reversal.sync"
      ),
    ),
    true,
  );
  const updateAudit = financeAudit.find(
    (event) => event.event_type === "fee_commitment.update",
  );
  assert.ok(updateAudit);
  assert.equal(updateAudit.payload.source_payload_included, false);
  assert.match(updateAudit.payload.imported_event_hash, /^[a-f0-9]{64}$/u);
});

test("PostgreSQL API authority commits HRX with central idempotency, audit and outbox in the shared transaction", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  const ledger = createPostgresDomainLedger({ pool: fixture.appPool });
  const dmsStorage = createLocalStorageAdapter({ adapter_id: "postgres-api-hrx-authority-test" });
  const authority = createPostgresApiRuntimeAuthority({
    ledger,
    dmsStorage,
    payrollArtifactSecret: PAYROLL_ARTIFACT_SECRET,
    bankImportPreviewTokens: BANK_IMPORT_PREVIEW_TOKENS,
    dmsUploadRuntime: createPostgresDmsUploadRuntime({ pool: fixture.appPool, storage: dmsStorage, sourceOnly: false }),
  });
  await importHrxAuthorityBaseline(ledger, TENANT_A);

  const created = await authority.run({
    tenant_id: TENANT_A,
    request_context: {
      method: "POST",
      pathname: "/api/hrx/employees",
      request_target_hash: "a".repeat(64),
      request_body_hash: "b".repeat(64),
      idempotency_key: "hrx-employee-create-001",
      actor_id: "user_hrx_postgres_test",
    },
    command(runtimes) {
      return runtimes.hrxRuntime.repository.createEmployee({
        tenant_id: TENANT_A,
        employee_id: "employee-postgres-authority-001",
        display_name: "Synthetic PostgreSQL HRX employee",
        status: "active",
      });
    },
  });
  assert.equal(created.employee_id, "employee-postgres-authority-001");
  assert.equal((await ledger.list({ tenant_id: TENANT_A, domain_id: "hrx", record_type: "hrx_employees" })).length, 1);
  assert.equal((await ledger.listIdempotency({ tenant_id: TENANT_A, domain_id: "hrx" })).length, 1);
  assert.equal((await ledger.listAudit({ tenant_id: TENANT_A, domain_id: "hrx" })).length, 1);
  assert.equal((await ledger.listOutbox({ tenant_id: TENANT_A, domain_id: "hrx" })).length, 1);
});

test("PostgreSQL API authority binds People flags and optional metrics without enabling synthetic payroll", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  const outlookStateDirectory = mkdtempSync(
    join(tmpdir(), "lawos-postgres-people-outlook-state-"),
  );
  t.after(() => rmSync(outlookStateDirectory, { recursive: true, force: true }));
  const ledger = createPostgresDomainLedger({ pool: fixture.appPool });
  const dmsStorage = createLocalStorageAdapter({ adapter_id: "postgres-api-people-bootstrap-test" });
  const peopleMetricsSink = Object.freeze({
    emit(metric) {
      return metric;
    },
  });
  const outlookTokenVault = Object.freeze({
    durable: true,
    opaque_at_rest: true,
    test_only: false,
  });
  let providerIdentityState = {
    schema_version: "people-provider-identity.v1",
    records: [],
    audit_events: [],
    rebind_receipts: [],
  };
  const peopleProviderIdentityRepository = Object.freeze({
    durable: true,
    test_only: false,
    loadState() {
      return structuredClone(providerIdentityState);
    },
    replaceState(nextState) {
      providerIdentityState = structuredClone(nextState);
      return structuredClone(providerIdentityState);
    },
  });
  const outlookConsentService = Object.freeze({
    grant() {},
    revoke() {},
    snapshot() {
      return [{
        tenant_id: TENANT_A,
        consent_ref: "outlook-consent-postgres",
        connection_state: "active",
        expires_at: "2099-07-31T00:00:00.000Z",
      }];
    },
    resolveCredential() {
      return {
        credential_ref: "external-vault:postgres",
        expires_at: "2099-07-31T00:00:00.000Z",
      };
    },
  });
  const adapterCalls = [];
  const outlookCalendarViewAdapter = Object.freeze({
    async read(input) {
      adapterCalls.push(input);
      return { events: [] };
    },
  });
  const outlookOauthPort = Object.freeze({
    begin() {
      return {
        state_ref: "outlook-state-postgres",
        authorize_url: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
      };
    },
    resolveSubjectAddress() {
      return "lawyer@example.test";
    },
  });
  const outlookStateAuthority = createDurablePeopleOutlookStateAuthority({
    filePath: join(outlookStateDirectory, "oauth-state.json"),
  });
  const offboardingAccessSource = Object.freeze({
    read({ tenant_id, offboarding_id, employee_id, system_ref }) {
      return {
        tenant_id,
        offboarding_id,
        employee_id,
        system_ref,
        revoked: true,
        evidence_ref: `IamAuthority:${offboarding_id}:${system_ref}`,
        access_source_version: "iam-authority:v1",
      };
    },
  });
  const authority = createPostgresApiRuntimeAuthority({
    ledger,
    dmsStorage,
    payrollArtifactSecret: PAYROLL_ARTIFACT_SECRET,
    bankImportPreviewTokens: BANK_IMPORT_PREVIEW_TOKENS,
    dmsUploadRuntime: createPostgresDmsUploadRuntime({
      pool: fixture.appPool,
      storage: dmsStorage,
      sourceOnly: false,
    }),
    peopleFeatureFlags: {
      people_overview: true,
      people_member_brief: true,
      outlook_calendar: true,
    },
    peopleMetricsSink,
    peopleProviderIdentityRepository,
    outlookTokenVault,
    outlookConsentService,
    outlookCalendarViewAdapter,
    outlookStateAuthority,
    outlookOauthPort,
    offboardingAccessSource,
    payrollProviders: {
      allowSyntheticArtifactSecret: true,
      allowSyntheticProviders: true,
    },
  });
  await importHrxAuthorityBaseline(ledger, TENANT_A);

  const bootstrap = await authority.run({
    tenant_id: TENANT_A,
    request_context: {
      method: "GET",
      pathname: "/api/hrx/people/team-operations",
    },
    async command(runtimes) {
      const hrxRuntime = runtimes.hrxRuntime;
      const authorization = hrxRuntime.peopleOutlookConnections.begin({
        tenant_id: TENANT_A,
        employee_id: "employee-outlook-postgres",
        can_manage: true,
      });
      hrxRuntime.peopleProviderIdentities.connect({
        tenant_id: TENANT_A,
        employee_id: "employee-outlook-postgres",
        provider_identity_id: "provider-identity-postgres",
        provider_subject_id: "provider-subject-postgres",
        consent_ref: "outlook-consent-postgres",
      });
      const first = hrxRuntime.peopleOutlookCalendarSource.read({
        tenant_id: TENANT_A,
        employee_ids: ["employee-outlook-postgres"],
        as_of: "2026-07-31",
      });
      await hrxRuntime.peopleOutlookCalendarSource.whenIdle();
      const connected = hrxRuntime.peopleOutlookCalendarSource.read({
        tenant_id: TENANT_A,
        employee_ids: ["employee-outlook-postgres"],
        as_of: "2026-07-31",
      });
      return {
        people_overview: hrxRuntime.peopleFeatureFlags.people_overview,
        people_member_brief: hrxRuntime.peopleFeatureFlags.people_member_brief,
        metrics_sink_bound: hrxRuntime.peopleMetricsSink === peopleMetricsSink,
        payroll_provider_mode: hrxRuntime.payrollRuntime.provider_mode,
        bank_reconciliation_port: hrxRuntime.payrollRuntime.bankReconciliationPort,
        outlook_token_vault_bound: hrxRuntime.outlookTokenVault === outlookTokenVault,
        outlook_state_authority_bound:
          hrxRuntime.outlookStateAuthority === outlookStateAuthority,
        offboarding_access_source_bound:
          hrxRuntime.offboardingAccessSource === offboardingAccessSource,
        offboarding_source_probe: hrxRuntime.offboardingAccessSource.read({
          tenant_id: TENANT_A,
          offboarding_id: "off-postgres-bootstrap",
          employee_id: "employee-outlook-postgres",
          system_ref: "IdP:core",
        }),
        outlook_authorization_state: authorization.connection_state,
        outlook_first_state: first.state,
        outlook_connected_state: connected.state,
      };
    },
  });

  assert.deepEqual(bootstrap, {
    people_overview: true,
    people_member_brief: true,
    metrics_sink_bound: true,
    payroll_provider_mode: "external-required",
    bank_reconciliation_port: null,
    outlook_token_vault_bound: true,
    outlook_state_authority_bound: true,
    offboarding_access_source_bound: true,
    offboarding_source_probe: {
      tenant_id: TENANT_A,
      offboarding_id: "off-postgres-bootstrap",
      employee_id: "employee-outlook-postgres",
      system_ref: "IdP:core",
      revoked: true,
      evidence_ref: "IamAuthority:off-postgres-bootstrap:IdP:core",
      access_source_version: "iam-authority:v1",
    },
    outlook_authorization_state: "consent_pending",
    outlook_first_state: "blocked",
    outlook_connected_state: "ok",
  });
  assert.equal(adapterCalls.length, 1);
  assert.equal(adapterCalls[0].credential_ref, "external-vault:postgres");
  assert.equal(adapterCalls[0].subject_address, "lawyer@example.test");
});

test("PostgreSQL API authority injects operational People Outlook ports with the tenant Email DMS repository", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  const ledger = createPostgresDomainLedger({ pool: fixture.appPool });
  const dmsStorage = createLocalStorageAdapter({
    adapter_id: "postgres-api-people-outlook-operational-test",
  });
  const operationalConnections = Object.freeze({
    status() {
      return { connection_state: "not_connected" };
    },
  });
  const operationalCalendarSource = Object.freeze({
    async read() {
      return { state: "blocked", events_by_employee_id: {} };
    },
  });
  let factoryCalls = 0;
  let operationalRepository = null;
  let completionCheckpoint = null;
  let durableCompletionRequired = null;
  const authority = createPostgresApiRuntimeAuthority({
    ledger,
    dmsStorage,
    payrollArtifactSecret: PAYROLL_ARTIFACT_SECRET,
    bankImportPreviewTokens: BANK_IMPORT_PREVIEW_TOKENS,
    dmsUploadRuntime: createPostgresDmsUploadRuntime({
      pool: fixture.appPool,
      storage: dmsStorage,
      sourceOnly: false,
    }),
    peopleFeatureFlags: { outlook_calendar: true },
    peopleOutlookRuntimeFactory({
      repository,
      completion_checkpoint,
      require_durable_completion,
    }) {
      factoryCalls += 1;
      operationalRepository = repository;
      completionCheckpoint = completion_checkpoint;
      durableCompletionRequired = require_durable_completion;
      return Object.freeze({
        connections: operationalConnections,
        calendarSource: operationalCalendarSource,
      });
    },
  });
  await importHrxAuthorityBaseline(ledger, TENANT_A);

  const binding = await authority.run({
    tenant_id: TENANT_A,
    request_context: {
      method: "GET",
      pathname: "/api/hrx/people/team-operations",
    },
    command(runtimes) {
      return {
        repository_bound:
          operationalRepository === runtimes.emailDmsRuntime.repository,
        connections_bound:
          runtimes.hrxRuntime.peopleOutlookConnections
            === operationalConnections,
        calendar_source_bound:
          runtimes.hrxRuntime.peopleOutlookCalendarSource
            === operationalCalendarSource,
      };
    },
  });

  assert.equal(factoryCalls, 1);
  assert.equal(
    completionCheckpoint?.kind,
    "postgres-people-outlook-completion-checkpoint",
  );
  assert.equal(durableCompletionRequired, true);
  assert.deepEqual(binding, {
    repository_bound: true,
    connections_bound: true,
    calendar_source_bound: true,
  });
});

test("PostgreSQL People Outlook OAuth and encrypted credential survive separate request transactions", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  const ledger = createPostgresDomainLedger({ pool: fixture.appPool });
  const dmsStorage = createLocalStorageAdapter({
    adapter_id: "postgres-api-people-outlook-roundtrip-test",
  });
  const graphCalls = [];
  const peopleOutlookRuntimeFactory =
    createPeopleOutlookOperationalRuntimeFactory({
      config: {
        tenant_id: "11111111-1111-4111-8111-111111111111",
        client_id: "22222222-2222-4222-8222-222222222222",
        client_secret: "people-outlook-client-secret-never-return",
        redirect_uri:
          "https://d2mthcc8vp3cr2.cloudfront.net/api/outlook/connection/callback",
        state_encryption_key: Buffer.alloc(32, 11).toString("base64"),
      },
      oauth_client: {
        authorizationUrl({ state }) {
          return `https://login.microsoftonline.com/11111111-1111-4111-8111-111111111111/oauth2/v2.0/authorize?state=${state}`;
        },
        async exchange() {
          return {
            provider_subject_id: "entra-subject-postgres-outlook",
            mailbox_address: "postgres-outlook@example.test",
            access_token: "postgres-outlook-access-token-never-persist",
            refresh_token: "postgres-outlook-refresh-token-never-persist",
            refresh_profile: "people",
            refresh_profile_proof: "P".repeat(43),
            expires_at: "2026-08-03T02:00:00.000Z",
            granted_scopes: [
              "openid",
              "profile",
              "email",
              "offline_access",
              "Calendars.ReadBasic",
            ],
          };
        },
        async refresh() {
          throw new Error("refresh should not run for this credential");
        },
      },
      microsoft_egress_transport: {
        async graphCalendarViewList(input) {
          graphCalls.push(input);
          return { events: [], page_count: 1, provider_request_ids: [] };
        },
      },
      clock: () => Date.parse("2026-08-03T00:30:00.000Z"),
    });
  const authority = createPostgresApiRuntimeAuthority({
    ledger,
    dmsStorage,
    payrollArtifactSecret: PAYROLL_ARTIFACT_SECRET,
    bankImportPreviewTokens: BANK_IMPORT_PREVIEW_TOKENS,
    dmsUploadRuntime: createPostgresDmsUploadRuntime({
      pool: fixture.appPool,
      storage: dmsStorage,
      sourceOnly: false,
    }),
    peopleFeatureFlags: { outlook_calendar: true },
    peopleOutlookRuntimeFactory,
  });
  const principal = {
    tenant_id: TENANT_A,
    employee_id: "employee-postgres-outlook-roundtrip",
    user_id: "user-postgres-outlook-roundtrip",
    session_email: "postgres-outlook@example.test",
    can_manage: true,
  };
  await importMatterAssignmentIdentityBaseline(ledger, TENANT_A, {
    employeeId: principal.employee_id,
    userId: principal.user_id,
  });

  const begun = await authority.run({
    tenant_id: TENANT_A,
    request_context: {
      method: "POST",
      pathname: `/api/hrx/people/members/${principal.employee_id}/outlook-connection`,
    },
    command({ hrxRuntime }) {
      return hrxRuntime.peopleOutlookConnections.begin(principal);
    },
  });
  assert.equal(begun.connection_state, "consent_pending");

  const completed = await authority.run({
    tenant_id: TENANT_A,
    request_context: {
      method: "POST",
      pathname: "/api/hrx/people/me/outlook-connection/complete",
    },
    command({ hrxRuntime }) {
      return hrxRuntime.peopleOutlookConnections.complete({
        ...principal,
        authorization_code: "0.ABC_postgres-outlook-roundtrip",
        state_ref: begun.state_ref,
      });
    },
  });
  assert.equal(completed.connection_state, "connected");

  const persisted = await authority.run({
    tenant_id: TENANT_A,
    request_context: {
      method: "GET",
      pathname: "/api/hrx/people/team-operations",
    },
    command({ emailDmsRuntime }) {
      return emailDmsRuntime.repository.list({
        tenant_id: TENANT_A,
        model_type: PEOPLE_OUTLOOK_CONNECTION_MODEL_TYPE,
      })[0];
    },
  });
  assert.equal(persisted.connection_state, "connected");
  assert.equal(
    persisted.credential_envelope.startsWith(
      PEOPLE_OUTLOOK_CREDENTIAL_ENVELOPE_PREFIX,
    ),
    true,
  );
  const serialized = JSON.stringify(persisted);
  assert.equal(serialized.includes("postgres-outlook-access-token-never-persist"), false);
  assert.equal(serialized.includes("postgres-outlook-refresh-token-never-persist"), false);
  assert.equal(serialized.includes("postgres-outlook@example.test"), false);

  const source = await authority.run({
    tenant_id: TENANT_A,
    request_context: {
      method: "GET",
      pathname: "/api/hrx/people/team-operations",
    },
    command({ hrxRuntime }) {
      return hrxRuntime.peopleOutlookCalendarSource.read({
        tenant_id: TENANT_A,
        employee_ids: [principal.employee_id],
        as_of: "2026-08-03",
        timezone: "Asia/Seoul",
      });
    },
  });
  assert.equal(source.state, "ok");
  assert.equal(graphCalls.length, 1);
  assert.equal(
    graphCalls[0].access_token,
    "postgres-outlook-access-token-never-persist",
  );
  assert.equal(Object.hasOwn(graphCalls[0], "url"), false);

  const legacyDisconnectKey =
    `people-outlook-disconnect:${persisted.people_outlook_connection_id}:${persisted.state_version}`;
  await authority.run({
    tenant_id: TENANT_A,
    request_context: {
      method: "POST",
      pathname: "/internal/test/people-outlook/legacy-disconnect-claim",
      idempotency_key: "postgres-people-outlook-legacy-disconnect-claim",
    },
    command({ emailDmsRuntime }) {
      return emailDmsRuntime.repository.recordIdempotency({
        tenant_id: TENANT_A,
        idempotency_key: legacyDisconnectKey,
        operation: "people.outlook.connection.disconnected",
        response: {
          connection_state: "not_connected",
          state_version: persisted.state_version + 1,
          credential_material_included: false,
        },
        created_at: "2026-08-03T00:30:00.000Z",
      });
    },
  });

  const disconnectPath =
    `/api/hrx/people/members/${principal.employee_id}/outlook-connection`;
  const disconnectRequest = async (idempotencyKey) => authority.run({
    tenant_id: TENANT_A,
    request_context: {
      method: "DELETE",
      pathname: disconnectPath,
      idempotency_key: idempotencyKey,
    },
    command({ hrxRuntime }) {
      return handleHrxApiRequest({
        pathname: disconnectPath,
        method: "DELETE",
        body: { idempotency_key: idempotencyKey },
        context: hrxRuntime,
        requestContext: {
          tenant_id: TENANT_A,
          actor_id: principal.user_id,
          actor_role: "staff",
          hrx_scopes: ["hrx.employee.read"],
          session_bound: true,
          email: principal.session_email,
        },
        permissionContext: {
          principal: {
            user_id: principal.user_id,
            tenant_id: TENANT_A,
            role_ids: ["staff"],
          },
          rules: [{
            id: "postgres-people-outlook-disconnect-self-read",
            effect: "allow",
            action: "hrx.employee.read",
          }],
          object_acl: [],
        },
      });
    },
  });
  const disconnected = await disconnectRequest(
    "postgres-people-outlook-disconnect-request-001",
  );
  assert.equal(disconnected.status, 200);
  assert.equal(disconnected.body.connection.connection_state, "not_connected");

  const revoked = await authority.run({
    tenant_id: TENANT_A,
    request_context: {
      method: "GET",
      pathname: "/api/hrx/people/team-operations",
    },
    command({ emailDmsRuntime }) {
      return emailDmsRuntime.repository.list({
        tenant_id: TENANT_A,
        model_type: PEOPLE_OUTLOOK_CONNECTION_MODEL_TYPE,
      })[0];
    },
  });
  assert.equal(revoked.connection_state, "revoked");
  assert.equal(revoked.credential_envelope, null);
  assert.equal(
    JSON.stringify({ disconnected, revoked }).includes(
      "postgres-outlook-access-token-never-persist",
    ),
    false,
  );

  const replayed = await disconnectRequest(
    "postgres-people-outlook-disconnect-request-002",
  );
  assert.equal(replayed.status, 200);
  assert.equal(replayed.body.connection.connection_state, "not_connected");
});

test("concurrent PostgreSQL self completion commits one durable claim before one broker exchange", async (t) => {
  const fixture = await createMigratedPostgresFixture(t, { appPoolMax: 24 });
  if (!fixture) return;
  const ledger = createPostgresDomainLedger({ pool: fixture.appPool });
  const dmsStorage = createLocalStorageAdapter({
    adapter_id: "postgres-api-people-outlook-concurrency-test",
  });
  const entraTenantId = "11111111-1111-4111-8111-111111111111";
  const clientId = "22222222-2222-4222-8222-222222222222";
  const clientSecret = "postgres-concurrent-client-secret-never-persist";
  const employeeId = "employee-postgres-outlook-concurrent";
  const userId = "user-postgres-outlook-concurrent";
  const email = "postgres-outlook-concurrent@example.test";
  const providerSubjectId = "entra-subject-postgres-outlook-concurrent";
  const authorizationCode = "0.ABC_postgres-outlook-concurrent-code";
  const accessToken = "postgres-concurrent-access-token-never-persist";
  const refreshToken = "postgres-concurrent-refresh-token-never-persist";
  const now = Date.parse("2026-08-03T00:30:00.000Z");
  const { privateKey, publicKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
  });
  const jwk = publicKey.export({ format: "jwk" });
  let oauthNonce = null;
  let issuedIdToken = null;
  let brokerExchangeCount = 0;
  let brokerExchangeInput = null;
  let releaseBrokerExchange;
  let markBrokerExchangeStarted;
  const brokerExchangeReleased = new Promise((resolve) => {
    releaseBrokerExchange = resolve;
  });
  const brokerExchangeStarted = new Promise((resolve) => {
    markBrokerExchangeStarted = resolve;
  });
  const microsoftEgressTransport = Object.freeze({
    async oauthJwksGet() {
      return {
        keys: [{
          ...jwk,
          kid: "people-outlook-postgres-concurrency-key",
          use: "sig",
          alg: "RS256",
        }],
      };
    },
    async oauthTokenExchange(input) {
      brokerExchangeCount += 1;
      brokerExchangeInput = input;
      markBrokerExchangeStarted();
      await brokerExchangeReleased;
      issuedIdToken = signedMicrosoftIdToken(privateKey, {
        iss: `https://login.microsoftonline.com/${entraTenantId}/v2.0`,
        tid: entraTenantId,
        aud: clientId,
        oid: providerSubjectId,
        preferred_username: email,
        nonce: oauthNonce,
        iat: Math.floor(now / 1000),
        nbf: Math.floor(now / 1000) - 10,
        exp: Math.floor(now / 1000) + 3600,
      });
      return {
        token_type: "Bearer",
        access_token: accessToken,
        refresh_token: refreshToken,
        refresh_profile: "people",
        refresh_profile_proof: "P".repeat(43),
        id_token: issuedIdToken,
        expires_in: 3600,
        scope: "openid profile email offline_access Calendars.ReadBasic",
      };
    },
    async oauthTokenRefresh() {
      throw new Error("refresh must not run during OAuth completion");
    },
    async graphCalendarViewList() {
      return { events: [], page_count: 1, provider_request_ids: [] };
    },
  });
  const peopleOutlookRuntimeFactory =
    createPeopleOutlookOperationalRuntimeFactory({
      config: {
        tenant_id: entraTenantId,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: MICROSOFT_EGRESS_REDIRECT_URIS.people,
        state_encryption_key: Buffer.alloc(32, 18).toString("base64"),
      },
      microsoft_egress_transport: microsoftEgressTransport,
      clock: () => now,
    });
  const authority = createPostgresApiRuntimeAuthority({
    ledger,
    dmsStorage,
    payrollArtifactSecret: PAYROLL_ARTIFACT_SECRET,
    bankImportPreviewTokens: BANK_IMPORT_PREVIEW_TOKENS,
    dmsUploadRuntime: createPostgresDmsUploadRuntime({
      pool: fixture.appPool,
      storage: dmsStorage,
      sourceOnly: false,
    }),
    peopleFeatureFlags: { outlook_calendar: true },
    peopleOutlookRuntimeFactory,
  });
  await importMatterAssignmentIdentityBaseline(ledger, TENANT_A, {
    employeeId,
    userId,
  });
  const principal = {
    tenant_id: TENANT_A,
    employee_id: employeeId,
    user_id: userId,
    session_email: email,
    entra_subject_id: providerSubjectId,
    can_manage: true,
  };
  const begun = await authority.run({
    tenant_id: TENANT_A,
    request_context: {
      method: "POST",
      pathname: `/api/hrx/people/members/${employeeId}/outlook-connection`,
      actor_id: userId,
    },
    command({ hrxRuntime }) {
      return hrxRuntime.peopleOutlookConnections.begin(principal);
    },
  });
  const authorizationUrl = new URL(begun.authorize_url);
  oauthNonce = authorizationUrl.searchParams.get("nonce");
  assert.deepEqual(
    authorizationUrl.searchParams.get("scope").split(" "),
    ["openid", "profile", "email", "offline_access", "Calendars.ReadBasic"],
  );
  assert.equal(
    authorizationUrl.searchParams.get("redirect_uri"),
    MICROSOFT_EGRESS_REDIRECT_URIS.people,
  );

  const permissionContext = {
    principal: {
      user_id: userId,
      tenant_id: TENANT_A,
      role_ids: ["staff"],
    },
    rules: [{
      id: "postgres-outlook-concurrent-employee-read",
      effect: "allow",
      action: "hrx.employee.read",
    }],
    object_acl: [],
  };
  let completionOccurrence = 0;
  const completeRequest = () => {
    completionOccurrence += 1;
    return authority.run({
      tenant_id: TENANT_A,
      request_context: {
        method: "POST",
        pathname: "/api/hrx/people/me/outlook-connection/complete",
        actor_id: userId,
        idempotency_key:
          `postgres-outlook-concurrent-complete-${completionOccurrence}`,
      },
      command({ hrxRuntime }) {
        return handleHrxApiRequest({
          pathname: "/api/hrx/people/me/outlook-connection/complete",
          method: "POST",
          body: {
            authorization_code: authorizationCode,
            state_ref: begun.state_ref,
          },
          context: hrxRuntime,
          requestContext: {
            tenant_id: TENANT_A,
            actor_id: userId,
            actor_role: "staff",
            hrx_scopes: ["hrx.employee.read"],
            session_bound: true,
            email,
            entra_subject_id: providerSubjectId,
          },
          permissionContext,
        });
      },
    });
  };

  const first = completeRequest();
  await brokerExchangeStarted;
  assert.equal(brokerExchangeInput.redirect_profile, "people");
  assert.equal(brokerExchangeInput.scopes.includes("Calendars.ReadBasic"), true);
  assert.equal(brokerExchangeInput.scopes.includes("Calendars.ReadWrite"), false);
  assert.equal(brokerExchangeInput.scopes.includes("Mail.Read"), false);
  const second = await completeRequest();
  assert.equal(second.status, 409);
  assert.equal(
    second.body.safe_error_code,
    "OUTLOOK_AUTHORIZATION_IN_PROGRESS",
  );
  assert.equal(brokerExchangeCount, 1);

  const claimedRecords = await ledger.list({
    tenant_id: TENANT_A,
    domain_id: EMAIL_DMS_DOMAIN_DESCRIPTOR.domain_id,
  });
  const claimed = claimedRecords.find(
    ({ record_type }) => record_type === PEOPLE_OUTLOOK_CONNECTION_MODEL_TYPE,
  );
  assert.equal(claimed.payload.connection_state, "reauthorization_required");
  assert.equal(claimed.payload.safe_error_code, "OUTLOOK_AUTHORIZATION_IN_PROGRESS");
  assert.equal(claimed.payload.state_version, 2);
  assert.equal(claimed.payload.oauth_state_hash, null);
  assert.equal(claimed.payload.oauth_verifier_ciphertext, null);
  const claimedIdempotency = await ledger.listIdempotency({
    tenant_id: TENANT_A,
    domain_id: EMAIL_DMS_DOMAIN_DESCRIPTOR.domain_id,
  });
  assert.equal(
    claimedIdempotency.filter(({ key }) => (
      key.startsWith("people-outlook-complete:")
    )).length,
    1,
  );

  releaseBrokerExchange();
  const firstResponse = await first;
  assert.equal(firstResponse.status, 200);
  assert.equal(firstResponse.body.employee_id, employeeId);
  assert.equal(firstResponse.body.connection.connection_state, "connected");
  const replayed = await completeRequest();
  assert.equal(replayed.status, 200);
  assert.equal(replayed.body.connection.connection_state, "connected");
  assert.equal(brokerExchangeCount, 1);

  const durable = {
    records: await ledger.list({
      tenant_id: TENANT_A,
      domain_id: EMAIL_DMS_DOMAIN_DESCRIPTOR.domain_id,
    }),
    idempotency: await ledger.listIdempotency({
      tenant_id: TENANT_A,
      domain_id: EMAIL_DMS_DOMAIN_DESCRIPTOR.domain_id,
    }),
    audit: await ledger.listAudit({
      tenant_id: TENANT_A,
      domain_id: EMAIL_DMS_DOMAIN_DESCRIPTOR.domain_id,
    }),
  };
  const connected = durable.records.find(
    ({ record_type }) => record_type === PEOPLE_OUTLOOK_CONNECTION_MODEL_TYPE,
  );
  assert.equal(connected.payload.connection_state, "connected");
  assert.equal(connected.payload.state_version, 3);
  assert.equal(
    connected.payload.credential_envelope.startsWith(
      PEOPLE_OUTLOOK_CREDENTIAL_ENVELOPE_PREFIX,
    ),
    true,
  );
  assert.equal(
    durable.audit.some(
      ({ event_type }) => event_type === "people.outlook.authorization.consuming",
    ),
    true,
  );
  assert.equal(
    durable.audit.some(
      ({ event_type }) => event_type === "people.outlook.connection.connected",
    ),
    true,
  );
  const durableText = JSON.stringify(durable);
  for (const secret of [
    authorizationCode,
    begun.state_ref,
    accessToken,
    refreshToken,
    issuedIdToken,
    brokerExchangeInput.code_verifier,
    email,
    clientSecret,
  ]) {
    assert.equal(durableText.includes(secret), false);
  }
});

test("PostgreSQL Outlook filing keeps the winning refreshed credential when a concurrent refresh gets 401", async (t) => {
  const fixture = await createMigratedPostgresFixture(t, { appPoolMax: 24 });
  if (!fixture) return;
  const tenant_id = "tenant_postgres_outlook_file_refresh";
  const matter_id = "matter_postgres_outlook_file_refresh";
  const user_id = "user_postgres_outlook_file_refresh";
  const entra_subject_id = "entra-postgres-outlook-file-refresh";
  const mailbox = "postgres-outlook-file-refresh@example.test";
  const credential_ref = "aws-secrets-manager:synthetic/postgres-outlook-file-refresh";
  const refreshed_credential_ref = `${credential_ref}/${entra_subject_id}/m365-connection-state-2`;
  const connection_id = m365ConnectionId({ tenant_id, user_id });
  const now = new Date("2026-08-07T00:00:00.000Z");
  const expires_at = "2026-08-07T00:00:30.000Z";
  const rotated_expires_at = "2026-08-07T02:00:00.000Z";
  const [oldAccess, oldRefresh, newAccess, newRefresh] = [
    "postgres-outlook-file-expiring-access-token-never-persist",
    "postgres-outlook-file-expiring-refresh-token-never-persist",
    "postgres-outlook-file-rotated-access-token-never-persist",
    "postgres-outlook-file-rotated-refresh-token-never-persist",
  ];
  const email = {
    rest_message_id: "rest:postgres-outlook-file-refresh",
    canonical_graph_message_id: "immutable:postgres-outlook-file-refresh",
    internet_message_id: "<postgres-outlook-file-refresh@example.test>",
    conversation_id: "conversation-postgres-outlook-file-refresh",
    item_key: [
      "rest:postgres-outlook-file-refresh",
      "<postgres-outlook-file-refresh@example.test>",
      "conversation-postgres-outlook-file-refresh",
    ].join("\u001f"),
    subject: "PostgreSQL Outlook refresh filing regression",
    sent_at: "2026-08-07T00:00:01.000Z",
    received_at: "2026-08-07T00:00:01.000Z",
    attachments: [],
  };
  const mime_bytes = Buffer.from(
    "From: opposing@example.test\r\nSubject: " + email.subject
      + "\r\nMessage-ID: " + email.internet_message_id
      + "\r\nMIME-Version: 1.0\r\nContent-Type: text/plain\r\n\r\nfixture",
  );
  const ledger = createPostgresDomainLedger({ pool: fixture.appPool });
  const dmsStorage = createLocalStorageAdapter({ adapter_id: "postgres-api-outlook-file-refresh-test" });
  const dmsUploadRuntime = createPostgresDmsUploadRuntime({
    pool: fixture.appPool, storage: dmsStorage, sourceOnly: false, clock: () => now,
    workerId: "dms-worker:postgres-outlook-file-refresh-test",
  });
  const credentialStore = {
    [credential_ref]: {
      access_token: oldAccess, refresh_token: oldRefresh, refresh_profile: "client",
      refresh_profile_proof: "C".repeat(43), expires_at, granted_scopes: [...M365_GRAPH_REQUIRED_SCOPES],
      mailbox_address: mailbox, entra_subject_id, consented_at: "2026-08-06T00:00:00.000Z",
    },
  };
  let refreshCount = 0;
  let graphCount = 0;
  let storeCount = 0;
  let deleteCount = 0;
  const deletedRefs = [];
  let firstRefreshStartedResolve;
  let secondRefreshStartedResolve;
  let winnerCommittedResolve;
  const firstRefreshStarted = new Promise((resolve) => { firstRefreshStartedResolve = resolve; });
  const secondRefreshStarted = new Promise((resolve) => { secondRefreshStartedResolve = resolve; });
  const winnerCommitted = new Promise((resolve) => { winnerCommittedResolve = resolve; });
  const m365GraphConfig = {
    feature_enabled: true, inquiry_feature_enabled: true, provider_runtime_enabled: true, clock: () => now,
    credential_vault: {
      referenceForGeneration({
        entra_subject_id: subjectId,
        credential_generation,
      }) {
        return `${credential_ref}/${subjectId}/${credential_generation}`;
      },
      async resolveDelegatedCredential({ credential_ref: ref }) {
        if (!credentialStore[ref]) {
          throw Object.assign(new Error("credential not found"), {
            name: "ResourceNotFoundException",
          });
        }
        return structuredClone(credentialStore[ref]);
      },
      async storeDelegatedCredential({
        credential_ref: ref,
        credential_generation,
        token_bundle,
      }) {
        storeCount += 1;
        assert.equal(ref, undefined);
        assert.equal(credential_generation, "m365-connection-state-2");
        if (!credentialStore[refreshed_credential_ref]) {
          credentialStore[refreshed_credential_ref] = structuredClone(token_bundle);
        }
        return refreshed_credential_ref;
      },
      async deleteDelegatedCredential({ credential_ref: ref }) {
        deleteCount += 1; deletedRefs.push(ref); delete credentialStore[ref];
      },
    },
    provider: {
      async refreshDelegatedCredential({ credential }) {
        refreshCount += 1; assert.equal(credential.access_token, oldAccess); assert.equal(credential.refresh_token, oldRefresh);
        if (refreshCount === 1) {
          firstRefreshStartedResolve();
          await secondRefreshStarted;
        } else {
          secondRefreshStartedResolve();
          await winnerCommitted;
          throw Object.assign(new Error("concurrent refresh token rejected"), { status: 401 });
        }
        return {
          expires_at: rotated_expires_at,
          token_bundle: { ...credential, access_token: newAccess, refresh_token: newRefresh,
            refresh_profile_proof: "R".repeat(43), expires_at: rotated_expires_at,
            granted_scopes: [...M365_GRAPH_REQUIRED_SCOPES] },
        };
      },
      async getMeMessageMime({ credential, rest_message_id }) {
        graphCount += 1; assert.equal(rest_message_id, email.rest_message_id); assert.equal(credential.access_token, newAccess);
        return {
          mime_bytes, immutable_message_id: "immutable:postgres-outlook-file-refresh",
          internet_message_id: email.internet_message_id, provider_request_id: "provider:postgres-outlook-file-refresh",
          message_metadata: {
            conversation_id: email.conversation_id, internet_message_id: email.internet_message_id,
            subject: email.subject, sender: { address: "opposing@example.test" }, from: { address: "opposing@example.test" },
            recipients: [{ address: mailbox, recipient_type: "to" }], received_at: "2026-08-07T00:00:01.000Z",
            has_attachments: false, is_in_sent_items: false, is_draft: false,
          },
        };
      },
    },
  };
  const sources = [
    [MATTER_DOMAIN_DESCRIPTOR, createMatterRepository({ seedRecords: [{
      model_type: "Matter", tenant_id, matter_id, matter_code: "POSTGRES/OUTLOOK/FILE/REFRESH",
      client_id: "client_postgres_outlook_file_refresh", title: "PostgreSQL Outlook refresh filing Matter",
      status: "open", created_by: user_id, created_at: "2026-08-06T00:00:00.000Z",
      permission_envelope_id: "perm:postgres:outlook:file:refresh", audit_trace_id: "audit:postgres:outlook:file:refresh",
    }] }), "matter"],
    [DMS_AUXILIARY_DOMAIN_DESCRIPTOR, createDmsAuxiliaryRepository(), "dms"],
    [EMAIL_DMS_DOMAIN_DESCRIPTOR, createEmailDmsRepository({ seedRecords: [{
      model_type: "M365Connection", m365_connection_id: connection_id, tenant_id, user_id, entra_subject_id,
      mailbox_address_hash: hashMailboxAddress(mailbox), credential_ref, granted_scopes: [...M365_GRAPH_REQUIRED_SCOPES],
      consented_at: "2026-08-06T00:00:00.000Z", expires_at, revoked_at: null, state_version: 1,
      connection_authority: "delegated", mailbox_scope: "me",
    }] }), "email-dms"],
  ];
  for (const [descriptor, repository, source_id] of sources) {
    try {
      await ledger.importSnapshot(createRecordRepositoryDomainSnapshot({
        descriptor, repositories: [{ source_id, repository }], tenant_id,
      }).snapshot);
    } finally { repository.close(); }
  }
  await importHrxAuthorityBaseline(ledger, tenant_id);
  const authority = createPostgresApiRuntimeAuthority({
    ledger, dmsStorage, payrollArtifactSecret: PAYROLL_ARTIFACT_SECRET,
    bankImportPreviewTokens: BANK_IMPORT_PREVIEW_TOKENS, dmsUploadRuntime,
  });
  const context = {
    principal: { tenant_id, user_id, email: mailbox, entra_subject_id },
    rules: [{ id: "postgres-outlook-file-refresh-allow", effect: "allow", action: "*" }],
    object_acl: [],
  };
  const run = (requestId) => authority.run({
    tenant_id,
    request_context: { method: "POST", pathname: "/api/outlook/email/file", idempotency_key: "postgres-outlook-file-refresh-request", actor_id: user_id },
    command: (runtimes) => handleOutlookAddinApiRequest({
      pathname: "/api/outlook/email/file", method: "POST", query: {},
      body: { tenant_id, matter_id, email }, context, requestId,
      runtime: { ...runtimes, m365GraphConfig },
    }),
  });
  const read = async (domain_id) => ({
    records: await ledger.list({ tenant_id, domain_id }),
    idempotency: await ledger.listIdempotency({ tenant_id, domain_id }),
    audit: await ledger.listAudit({ tenant_id, domain_id }),
  });
  const state = async () => ({
    email: await read(EMAIL_DMS_DOMAIN_DESCRIPTOR.domain_id),
    dms: await read(DMS_AUXILIARY_DOMAIN_DESCRIPTOR.domain_id),
    matter: await read(MATTER_DOMAIN_DESCRIPTOR.domain_id),
  });
  const counts = (value) => [
    value.email.idempotency.filter(({ key }) => key.startsWith("m365-refresh:")).length,
    value.email.audit.filter(({ event_type }) => event_type === "m365.connection.credential.refreshed").length,
    value.dms.records.filter(({ record_type }) => record_type === "DmsEmailThread").length,
    value.dms.idempotency.filter(({ key }) => key.startsWith("outlook-email-file:")).length,
    value.dms.audit.filter(({ event_type }) => event_type === "dms.email.thread.file").length,
    value.matter.records.filter(({ record_type }) => record_type === "MatterTimelineEvent").length,
    value.matter.idempotency.filter(({ key }) => key.startsWith("outlook-email-file:")).length,
    value.matter.audit.filter(({ event_type }) => event_type === "matter.timeline.outlook.file").length,
  ];
  const settleWithin = async (promise, phase) => {
    let timer;
    try {
      return await Promise.race([promise, new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${phase} timed out: ${JSON.stringify({
          refreshCount, storeCount, deleteCount, graphCount,
        })}`)), 5_000);
      })]);
    } finally {
      clearTimeout(timer);
    }
  };
  const firstRequest = run("request-postgres-outlook-file-refresh-first");
  await settleWithin(firstRefreshStarted, "first refresh start");
  const winningRequest = firstRequest.then((result) => {
    winnerCommittedResolve();
    return result;
  }, (error) => {
    winnerCommittedResolve();
    throw error;
  });
  const concurrentRequest = run("request-postgres-outlook-file-refresh-concurrent");
  const [first, replay] = await settleWithin(
    Promise.all([winningRequest, concurrentRequest]),
    "concurrent filings",
  );
  const firstState = await state();
  assert.equal(first.status, 201, JSON.stringify(first.body));
  assert.equal(first.body.outcome, "created");
  assert.equal(first.body.safe_error_codes.includes("DOMAIN_IDEMPOTENCY_REQUIRED"), false);
  assert.equal(replay.status, 200, JSON.stringify({
    first: first.body,
    body: replay.body,
    counters: { refreshCount, storeCount, deleteCount, graphCount },
    connection: firstState.email.records.find(
      ({ record_type }) => record_type === "M365Connection",
    )?.payload,
    thread: firstState.dms.records.find(
      ({ record_type }) => record_type === "DmsEmailThread",
    )?.payload,
  }));
  assert.equal(replay.body.outcome, "idempotent_replay");
  assert.equal(replay.body.idempotent_replay, true);
  assert.deepEqual(
    [refreshCount, storeCount, deleteCount, graphCount],
    [2, 1, 2, 2],
  );
  assert.equal(Object.hasOwn(credentialStore, credential_ref), false);
  assert.equal(Object.hasOwn(credentialStore, refreshed_credential_ref), true);
  assert.deepEqual(deletedRefs, [credential_ref, credential_ref]);
  const documentId = first.body.email_thread.filed_document_ids[0];
  const firstDocument = await dmsUploadRuntime.getDocumentState({ tenant_id, document_id: documentId });
  assert.equal(firstDocument.versions.length, 1);
  const connection = firstState.email.records.find(({ record_type }) => record_type === "M365Connection").payload;
  assert.equal(connection.credential_ref, refreshed_credential_ref);
  assert.deepEqual(connection.pending_vault_cleanup_refs, []);
  assert.deepEqual([connection.state_version, connection.expires_at], [2, rotated_expires_at]);
  assert.deepEqual(counts(firstState), [1, 1, 1, 2, 1, 1, 1, 1]);
  const persistedThread = firstState.dms.records.find(
    ({ record_type }) => record_type === "DmsEmailThread",
  ).payload;
  const filingReceipt = firstState.dms.idempotency.find(
    ({ key }) => key.endsWith(":dms"),
  );
  const filingAudit = firstState.dms.audit.find(
    ({ event_type }) => event_type === "dms.email.thread.file",
  );
  assert.equal(filingReceipt.response.outcome, "created");
  assert.deepEqual(Object.keys(filingAudit.payload).sort(), [
    "imported_event_hash",
    "source_payload_included",
  ]);
  assert.equal(filingAudit.payload.source_payload_included, false);
  assert.equal(
    filingAudit.payload.imported_event_hash,
    hashDomainValue(outlookEmailFilingAuditEvent(persistedThread)),
  );
  assert.equal(
    firstState.dms.idempotency.some(({ key }) => (
      key === `outlook-matter-folders:${tenant_id}:${matter_id}:v1`
    )),
    true,
  );
  const replayDocument = await dmsUploadRuntime.getDocumentState({ tenant_id, document_id: documentId });
  assert.equal(replayDocument.versions.length, 1);
  assert.equal(replayDocument.document.current_version_id, firstDocument.document.current_version_id);
  const replayState = await state();
  assert.deepEqual(counts(replayState), counts(firstState));
  assert.deepEqual(
    replayState.dms.idempotency.find(({ key }) => key === filingReceipt.key),
    filingReceipt,
  );
  assert.equal(replayState.dms.records.find(({ record_type }) => record_type === "DmsEmailThread").payload.status, "active");
  assert.equal(replayState.matter.records.find(({ record_type }) => record_type === "MatterTimelineEvent").payload.source_object_id, first.body.email_thread.email_thread_id);
  const beforeRestartReplay = JSON.stringify({
    domains: replayState,
    document: replayDocument,
  });
  const restartReplay = await settleWithin(
    run("request-postgres-outlook-file-refresh-restart-replay"),
    "restart replay",
  );
  assert.equal(restartReplay.status, 200, JSON.stringify(restartReplay.body));
  assert.equal(restartReplay.body.outcome, "idempotent_replay");
  const restartState = await state();
  const restartDocument = await dmsUploadRuntime.getDocumentState({
    tenant_id,
    document_id: documentId,
  });
  const afterRestartReplay = JSON.stringify({
    domains: restartState,
    document: restartDocument,
  });
  assert.equal(afterRestartReplay, beforeRestartReplay);
  assert.equal(Buffer.byteLength(afterRestartReplay), Buffer.byteLength(beforeRestartReplay));
  assert.deepEqual(counts(restartState), counts(replayState));
  assert.equal(restartState.dms.idempotency.length, replayState.dms.idempotency.length);
  assert.deepEqual([refreshCount, storeCount, deleteCount, graphCount], [2, 1, 2, 3]);
  const durableText = JSON.stringify({
    first: first.body,
    replay: replay.body,
    restart_replay: restartReplay.body,
    durable: restartState,
    document: restartDocument,
  });
  for (const secret of [oldAccess, oldRefresh, newAccess, newRefresh]) assert.equal(durableText.includes(secret), false);
  assert.doesNotMatch(durableText, /(?:access_token|refresh_token|client_secret)/u);
});

test("PostgreSQL revoke tombstone blocks a provider-latched late refresh generation", async (t) => {
  const fixture = await createMigratedPostgresFixture(t, { appPoolMax: 16 });
  if (!fixture) return;
  const tenant_id = "tenant_postgres_m365_revoke_refresh_race";
  const user_id = "user_postgres_m365_revoke_refresh_race";
  const entra_subject_id = "subject_postgres_m365_revoke_refresh_race";
  const mailbox = "postgres-m365-revoke-refresh-race@example.test";
  const credential_ref =
    "aws-secrets-manager:synthetic/postgres-m365-revoke-refresh-race/current";
  const staged_ref =
    `${credential_ref}/${entra_subject_id}/m365-connection-state-2`;
  const connection_id = m365ConnectionId({ tenant_id, user_id });
  const now = new Date("2026-08-07T00:00:00.000Z");
  const expires_at = "2026-08-07T00:00:30.000Z";
  const oldAccess = "postgres-revoke-race-old-access-never-persist";
  const oldRefresh = "postgres-revoke-race-old-refresh-never-persist";
  const lateAccess = "postgres-revoke-race-late-access-never-persist";
  const lateRefresh = "postgres-revoke-race-late-refresh-never-persist";
  const credentialStore = new Map([[credential_ref, {
    access_token: oldAccess,
    refresh_token: oldRefresh,
    refresh_profile: "client",
    refresh_profile_proof: "C".repeat(43),
    entra_subject_id,
    mailbox_address: mailbox,
    consented_at: "2026-08-06T00:00:00.000Z",
    expires_at,
    granted_scopes: [...M365_GRAPH_REQUIRED_SCOPES],
  }]]);
  const tombstones = new Set();
  const deletedRefs = [];
  let refreshCalls = 0;
  let storeCalls = 0;
  let graphCalls = 0;
  let releaseRefresh;
  let refreshStartedResolve;
  const refreshStarted = new Promise((resolve) => {
    refreshStartedResolve = resolve;
  });
  const refreshRelease = new Promise((resolve) => {
    releaseRefresh = resolve;
  });
  const credential_vault = {
    referenceForGeneration({
      entra_subject_id: subjectId,
      credential_generation,
    }) {
      return `${credential_ref}/${subjectId}/${credential_generation}`;
    },
    async resolveDelegatedCredential({ credential_ref: ref }) {
      if (tombstones.has(ref)) {
        throw Object.assign(new Error("credential generation revoked"), {
          safe_error_code: "M365_REAUTHORIZATION_REQUIRED",
          status: 401,
        });
      }
      if (!credentialStore.has(ref)) {
        throw Object.assign(new Error("credential not found"), {
          name: "ResourceNotFoundException",
        });
      }
      return structuredClone(credentialStore.get(ref));
    },
    async storeDelegatedCredential({
      credential_generation,
      token_bundle,
    }) {
      storeCalls += 1;
      assert.equal(credential_generation, "m365-connection-state-2");
      if (!tombstones.has(staged_ref) && !credentialStore.has(staged_ref)) {
        credentialStore.set(staged_ref, structuredClone(token_bundle));
      }
      return staged_ref;
    },
    async deleteDelegatedCredential({ credential_ref: ref }) {
      deletedRefs.push(ref);
      credentialStore.delete(ref);
      tombstones.add(ref);
    },
  };
  const provider = {
    async refreshDelegatedCredential({ credential }) {
      refreshCalls += 1;
      assert.equal(credential.access_token, oldAccess);
      refreshStartedResolve();
      await refreshRelease;
      return {
        token_bundle: {
          ...credential,
          access_token: lateAccess,
          refresh_token: lateRefresh,
          refresh_profile_proof: "R".repeat(43),
          expires_at: "2026-08-07T02:00:00.000Z",
          granted_scopes: [...M365_GRAPH_REQUIRED_SCOPES],
        },
      };
    },
    async revokeDelegatedCredential() {
      return { revoked: true };
    },
    async getMeMessageMime() {
      graphCalls += 1;
      throw new Error("Graph must not run after revoke wins");
    },
  };
  const ledger = createPostgresDomainLedger({ pool: fixture.appPool });
  const seedRepository = createEmailDmsRepository({ seedRecords: [{
    model_type: "M365Connection",
    m365_connection_id: connection_id,
    tenant_id,
    user_id,
    entra_subject_id,
    mailbox_address_hash: hashMailboxAddress(mailbox),
    credential_ref,
    granted_scopes: [...M365_GRAPH_REQUIRED_SCOPES],
    consented_at: "2026-08-06T00:00:00.000Z",
    expires_at,
    revoked_at: null,
    state_version: 1,
  }] });
  try {
    await ledger.importSnapshot(createRecordRepositoryDomainSnapshot({
      descriptor: EMAIL_DMS_DOMAIN_DESCRIPTOR,
      repositories: [{ source_id: "email-dms", repository: seedRepository }],
      tenant_id,
    }).snapshot);
  } finally {
    seedRepository.close();
  }
  await importHrxAuthorityBaseline(ledger, tenant_id);
  const dmsStorage = createLocalStorageAdapter({
    adapter_id: "postgres-m365-revoke-refresh-race",
  });
  const authority = createPostgresApiRuntimeAuthority({
    ledger,
    dmsStorage,
    dmsUploadRuntime: createPostgresDmsUploadRuntime({
      pool: fixture.appPool,
      storage: dmsStorage,
      sourceOnly: false,
      clock: () => now,
      workerId: "dms-worker:postgres-m365-revoke-refresh-race",
    }),
    payrollArtifactSecret: PAYROLL_ARTIFACT_SECRET,
    bankImportPreviewTokens: BANK_IMPORT_PREVIEW_TOKENS,
  });
  const requestContext = (pathname) => ({
    method: "POST",
    pathname,
    idempotency_key: `postgres-m365-revoke-refresh-race:${pathname}`,
    actor_id: user_id,
  });
  const acquire = authority.run({
    tenant_id,
    request_context: requestContext("/test/m365/acquire"),
    command: ({ emailDmsRuntime }) => acquireActiveM365Credential({
      repository: emailDmsRuntime.repository,
      credential_vault,
      provider,
      request_failure_compensator:
        emailDmsRuntime.request_failure_compensator,
      tenant_id,
      user_id,
      entra_subject_id,
      required_scope: "Mail.Read",
      clock: () => now,
    }),
  });
  await refreshStarted;
  const revoked = await authority.run({
    tenant_id,
    request_context: requestContext("/test/m365/revoke"),
    command: ({ emailDmsRuntime }) => createM365GraphConnectionService({
      repository: emailDmsRuntime.repository,
      credential_vault,
      provider,
      feature_enabled: true,
      provider_runtime_enabled: true,
      clock: () => now,
      request_failure_compensator:
        emailDmsRuntime.request_failure_compensator,
    }).revokeConnection({
      tenant_id,
      user_id,
      entra_subject_id,
      expected_state_version: 1,
      reason: "concurrent user revoke",
    }),
  });
  assert.equal(revoked.outcome, "disconnected");
  assert.equal(tombstones.has(staged_ref), true);
  releaseRefresh();
  await assert.rejects(acquire);

  assert.deepEqual([refreshCalls, storeCalls, graphCalls], [1, 1, 0]);
  assert.equal(credentialStore.has(staged_ref), false);
  assert.equal(deletedRefs.includes(credential_ref), true);
  assert.equal(deletedRefs.includes(staged_ref), true);
  const records = await ledger.list({
    tenant_id,
    domain_id: EMAIL_DMS_DOMAIN_DESCRIPTOR.domain_id,
  });
  const durableConnection = records.find(
    ({ record_type }) => record_type === "M365Connection",
  ).payload;
  assert.equal(durableConnection.revoked_at, now.toISOString());
  assert.equal(durableConnection.state_version, 2);
  assert.notEqual(durableConnection.credential_ref, staged_ref);
  const durableText = JSON.stringify({ records });
  for (const secret of [oldAccess, oldRefresh, lateAccess, lateRefresh]) {
    assert.equal(durableText.includes(secret), false);
  }
});

test("PostgreSQL authenticated Client POST completion stays in the outer Email DMS transaction", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  const tenant_id = "tenant_postgres_client_post_completion";
  const user_id = "user_postgres_client_post_completion";
  const entra_subject_id = "subject_postgres_client_post_completion";
  const redirect_uri =
    "https://app.example.invalid/api/outlook/connection/callback";
  const credentialStore = new Map();
  let exchangeCalls = 0;
  const credential_vault = {
    referenceForGeneration({ credential_generation }) {
      return `aws-secrets-manager:synthetic/postgres-client-post/${credential_generation}`;
    },
    async storeDelegatedCredential(input) {
      const ref = this.referenceForGeneration(input);
      credentialStore.set(ref, structuredClone(input.token_bundle));
      return ref;
    },
    async resolveDelegatedCredential({ credential_ref }) {
      return structuredClone(credentialStore.get(credential_ref));
    },
    async deleteDelegatedCredential({ credential_ref }) {
      credentialStore.delete(credential_ref);
    },
  };
  const provider = {
    async completeDelegatedAuthorization() {
      exchangeCalls += 1;
      return {
        authorization_attempt_consumed: true,
        entra_subject_id,
        mailbox_address: "postgres-client-post@example.test",
        granted_scopes: [...M365_GRAPH_REQUIRED_SCOPES],
        consented_at: "2026-08-07T00:00:00.000Z",
        expires_at: "2026-08-07T02:00:00.000Z",
        token_bundle: {
          access_token: "postgres-client-post-access-never-persist",
          refresh_token: "postgres-client-post-refresh-never-persist",
          refresh_profile: "client",
          refresh_profile_proof: "P".repeat(43),
          expires_at: "2026-08-07T02:00:00.000Z",
          granted_scopes: [...M365_GRAPH_REQUIRED_SCOPES],
        },
      };
    },
  };
  const ledger = createPostgresDomainLedger({ pool: fixture.appPool });
  const seedRepository = createEmailDmsRepository();
  try {
    await ledger.importSnapshot(createRecordRepositoryDomainSnapshot({
      descriptor: EMAIL_DMS_DOMAIN_DESCRIPTOR,
      repositories: [{ source_id: "email-dms", repository: seedRepository }],
      tenant_id,
    }).snapshot);
  } finally {
    seedRepository.close();
  }
  await importHrxAuthorityBaseline(ledger, tenant_id);
  const dmsStorage = createLocalStorageAdapter({
    adapter_id: "postgres-client-post-completion",
  });
  const authority = createPostgresApiRuntimeAuthority({
    ledger,
    dmsStorage,
    dmsUploadRuntime: createPostgresDmsUploadRuntime({
      pool: fixture.appPool,
      storage: dmsStorage,
      sourceOnly: false,
    }),
    payrollArtifactSecret: PAYROLL_ARTIFACT_SECRET,
    bankImportPreviewTokens: BANK_IMPORT_PREVIEW_TOKENS,
  });
  const context = {
    principal: {
      tenant_id,
      user_id,
      entra_subject_id,
      email: "postgres-client-post@example.test",
    },
    rules: [{ id: "postgres-client-post-allow", effect: "allow", action: "*" }],
    object_acl: [],
  };
  const response = await authority.run({
    tenant_id,
    request_context: {
      method: "POST",
      pathname: "/api/outlook/connection/complete",
      idempotency_key: "postgres-client-post-completion",
      actor_id: user_id,
    },
    command: (runtimes) => handleOutlookAddinApiRequest({
      pathname: "/api/outlook/connection/complete",
      method: "POST",
      body: {
        actor_id: user_id,
        tenant_id,
        code: "postgres-client-post-code",
        state: "postgres-client-post-state",
        redirect_uri,
      },
      context,
      requestId: "request-postgres-client-post-completion",
      runtime: {
        ...runtimes,
        m365GraphConfig: {
          feature_enabled: true,
          provider_runtime_enabled: true,
          allowed_redirect_uris: [redirect_uri],
          clock: () => new Date("2026-08-07T00:00:00.000Z"),
          credential_vault,
          provider,
        },
      },
    }),
  });

  assert.equal(response.status, 200, JSON.stringify(response.body));
  assert.equal(response.body.outcome, "connected");
  assert.equal(exchangeCalls, 1);
  const records = await ledger.list({
    tenant_id,
    domain_id: EMAIL_DMS_DOMAIN_DESCRIPTOR.domain_id,
  });
  const connection = records.find(
    ({ record_type }) => record_type === "M365Connection",
  )?.payload;
  assert.equal(connection?.state_version, 1);
  assert.equal(
    credentialStore.has(connection?.credential_ref),
    true,
  );
  assert.doesNotMatch(
    JSON.stringify({ records }),
    /postgres-client-post-(?:access|refresh)-never-persist/u,
  );
});

test("PostgreSQL Client callback checkpoint allows one exchange and replays from the attempt Secret", async (t) => {
  const fixture = await createMigratedPostgresFixture(t, { appPoolMax: 16 });
  if (!fixture) return;
  const tenant_id = "tenant_postgres_client_callback_checkpoint";
  const user_id = "user_postgres_client_callback_checkpoint";
  const entra_subject_id = "subject_postgres_client_callback_checkpoint";
  const mailbox = "postgres-client-callback@example.test";
  const state = "postgres-client-callback-state";
  const code = "postgres-client-callback-code";
  const redirect_uri =
    "https://app.example.invalid/api/outlook/connection/callback";
  const attempt_ref = createHash("sha256").update(state).digest("hex");
  const credentialStore = new Map();
  const tombstones = new Set();
  let exchangeCalls = 0;
  let exchangeStartedResolve;
  let releaseExchange;
  const exchangeStarted = new Promise((resolve) => {
    exchangeStartedResolve = resolve;
  });
  const exchangeRelease = new Promise((resolve) => {
    releaseExchange = resolve;
  });
  const credential_vault = {
    referenceForGeneration({
      entra_subject_id: subjectId,
      credential_generation,
    }) {
      return `aws-secrets-manager:synthetic/postgres-client-callback/${subjectId}/${credential_generation}`;
    },
    async storeDelegatedCredential(input) {
      const ref = this.referenceForGeneration(input);
      if (!tombstones.has(ref) && !credentialStore.has(ref)) {
        credentialStore.set(ref, structuredClone(input.token_bundle));
      }
      return ref;
    },
    async resolveDelegatedCredential({ credential_ref }) {
      if (tombstones.has(credential_ref)) {
        throw Object.assign(new Error("credential revoked"), {
          safe_error_code: "M365_REAUTHORIZATION_REQUIRED",
          status: 401,
        });
      }
      if (!credentialStore.has(credential_ref)) {
        throw Object.assign(new Error("credential not found"), {
          name: "ResourceNotFoundException",
        });
      }
      return structuredClone(credentialStore.get(credential_ref));
    },
    async deleteDelegatedCredential({ credential_ref }) {
      credentialStore.delete(credential_ref);
      tombstones.add(credential_ref);
    },
  };
  const principal = Object.freeze({
    tenant_id,
    user_id,
    entra_subject_id,
    redirect_uri,
    callback_mode: M365_GRAPH_CALLBACK_MODES.server_complete,
  });
  const provider = {
    resolveDelegatedAuthorizationState() {
      return principal;
    },
    async completeDelegatedAuthorization() {
      exchangeCalls += 1;
      exchangeStartedResolve();
      await exchangeRelease;
      return {
        authorization_attempt_consumed: true,
        entra_subject_id,
        mailbox_address: mailbox,
        granted_scopes: [...M365_GRAPH_REQUIRED_SCOPES],
        consented_at: "2026-08-07T00:00:00.000Z",
        expires_at: "2026-08-07T02:00:00.000Z",
        token_bundle: {
          access_token: "postgres-client-callback-access-never-persist",
          refresh_token: "postgres-client-callback-refresh-never-persist",
          refresh_profile: "client",
          refresh_profile_proof: "C".repeat(43),
          expires_at: "2026-08-07T02:00:00.000Z",
          granted_scopes: [...M365_GRAPH_REQUIRED_SCOPES],
        },
      };
    },
  };
  const m365GraphConfig = {
    feature_enabled: true,
    provider_runtime_enabled: true,
    allowed_redirect_uris: [redirect_uri],
    clock: () => new Date("2026-08-07T00:00:00.000Z"),
    credential_vault,
    provider,
  };
  const sessionAuth = {
    async verifyOutlookCallbackPrincipal() {
      return { ok: true };
    },
  };
  const ledger = createPostgresDomainLedger({ pool: fixture.appPool });
  const seedRepository = createEmailDmsRepository();
  try {
    await ledger.importSnapshot(createRecordRepositoryDomainSnapshot({
      descriptor: EMAIL_DMS_DOMAIN_DESCRIPTOR,
      repositories: [{ source_id: "email-dms", repository: seedRepository }],
      tenant_id,
    }).snapshot);
  } finally {
    seedRepository.close();
  }
  await importHrxAuthorityBaseline(ledger, tenant_id);
  const dmsStorage = createLocalStorageAdapter({
    adapter_id: "postgres-client-callback-checkpoint",
  });
  const authority = createPostgresApiRuntimeAuthority({
    ledger,
    dmsStorage,
    dmsUploadRuntime: createPostgresDmsUploadRuntime({
      pool: fixture.appPool,
      storage: dmsStorage,
      sourceOnly: false,
      clock: () => new Date("2026-08-07T00:00:00.000Z"),
      workerId: "dms-worker:postgres-client-callback-checkpoint",
    }),
    payrollArtifactSecret: PAYROLL_ARTIFACT_SECRET,
    bankImportPreviewTokens: BANK_IMPORT_PREVIEW_TOKENS,
  });
  const run = (requestId) => authority.run({
    tenant_id,
    request_context: {
      method: "GET",
      pathname: "/api/outlook/connection/callback",
      idempotency_key: `postgres-client-callback:${requestId}`,
      actor_id: user_id,
    },
    command: (runtimes) => handleClientOutlookAuthorizationCallback({
      code,
      state,
      requestId,
      runtime: {
        ...runtimes,
        m365GraphConfig,
        sessionAuth,
      },
    }),
  });

  const first = run("callback-request-first");
  await exchangeStarted;
  const concurrent = await run("callback-request-concurrent");
  assert.equal(concurrent.status, 409);
  assert.deepEqual(concurrent.body.safe_error_codes, [
    "M365_AUTHORIZATION_COMPLETION_IN_PROGRESS",
  ]);
  assert.equal(exchangeCalls, 1);
  assert.equal(credentialStore.size, 0);
  releaseExchange();
  const connected = await first;
  assert.equal(connected.status, 200, JSON.stringify(connected.body));
  assert.equal(connected.body.outcome, "connected");

  const replay = await run("callback-request-replay");
  assert.equal(replay.status, 200, JSON.stringify(replay.body));
  assert.equal(replay.body.item.replayed, true);
  assert.equal(exchangeCalls, 1);
  const attemptCredentialRef = credential_vault.referenceForGeneration({
    ...principal,
    credential_generation: `m365-authorization-attempt-${attempt_ref}`,
  });
  assert.equal(credentialStore.has(attemptCredentialRef), true);
  const records = await ledger.list({
    tenant_id,
    domain_id: EMAIL_DMS_DOMAIN_DESCRIPTOR.domain_id,
  });
  const durableConnection = records.find(
    ({ record_type }) => record_type === "M365Connection",
  ).payload;
  assert.equal(durableConnection.credential_ref, attemptCredentialRef);
  const durableText = JSON.stringify({ records });
  assert.doesNotMatch(
    durableText,
    /postgres-client-callback-(?:access|refresh)-never-persist/u,
  );
});

test("PostgreSQL API authority persists termination completion and its authoritative payroll evidence together", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  const ledger = createPostgresDomainLedger({ pool: fixture.appPool });
  const dmsStorage = createLocalStorageAdapter({
    adapter_id: "postgres-api-termination-evidence-test",
  });
  const authority = createPostgresApiRuntimeAuthority({
    ledger,
    dmsStorage,
    payrollArtifactSecret: PAYROLL_ARTIFACT_SECRET,
    bankImportPreviewTokens: BANK_IMPORT_PREVIEW_TOKENS,
    dmsUploadRuntime: createPostgresDmsUploadRuntime({
      pool: fixture.appPool,
      storage: dmsStorage,
      sourceOnly: false,
    }),
    leaveIntegrationProviders: {
      payroll: {
        operational_authority: true,
        provider_id: "payroll-authority",
      },
    },
    leaveIntegrationProviderEnabled: { payroll: true },
  });
  const seeded = await importPendingTerminationDeliveryBaseline(
    ledger,
    TENANT_A,
  );

  const completion = await authority.run({
    tenant_id: TENANT_A,
    request_context: {
      method: "POST",
      pathname: "/api/hrx/leave/termination/provider-delivery",
      idempotency_key: "postgres-termination-evidence-completion",
    },
    command({ hrxRuntime }) {
      return hrxRuntime.leaveTerminationService.recordPayrollDelivery(
        {
          tenant_id: TENANT_A,
          actor_id: "user-people-ops-operator",
        },
        {
          outbox_event_id: seeded.outboxEventId,
          provider_receipt: seeded.providerReceipt,
        },
      );
    },
  });
  assert.equal(completion.state, "approved_and_synced");

  const persisted = await authority.run({
    tenant_id: TENANT_A,
    request_context: {
      method: "GET",
      pathname: `/api/hrx/lifecycle/offboarding/${seeded.offboardingId}`,
    },
    command({ hrxRuntime }) {
      const store = hrxRuntime.leaveManagementStore;
      return {
        offboarding: store.query("selectOne", {
          table: "hrx_offboarding_cases",
          where: {
            tenant_id: TENANT_A,
            offboarding_id: seeded.offboardingId,
          },
        }),
        reconciliation: store.query("selectOne", {
          table: "hrx_leave_termination_reconciliations",
          where: {
            tenant_id: TENANT_A,
            reconciliation_id: seeded.reconciliationId,
          },
        }),
        outbox: store.query("selectOne", {
          table: "hrx_leave_sync_outbox",
          where: {
            tenant_id: TENANT_A,
            outbox_event_id: seeded.outboxEventId,
          },
        }),
      };
    },
  });
  assert.equal(
    persisted.offboarding.leave_reconciliation_status,
    "approved_and_synced",
  );
  assert.equal(
    persisted.offboarding.leave_reconciliation_evidence_ref,
    seeded.providerReceiptRef,
  );
  assert.equal(persisted.reconciliation.state, "approved_and_synced");
  assert.equal(persisted.outbox.state, "delivered");
  assert.equal(
    persisted.outbox.provider_receipt_ref,
    seeded.providerReceiptRef,
  );
});

test("PostgreSQL API authority overlays relational HRX reads only while preserving generic-ledger writes", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  const ledger = createPostgresDomainLedger({ pool: fixture.appPool });
  const dmsStorage = createLocalStorageAdapter({
    adapter_id: "postgres-api-hrx-relational-overlay-test",
  });
  let projectionMaterializationCount = 0;
  const authority = createPostgresApiRuntimeAuthority({
    ledger,
    dmsStorage,
    payrollArtifactSecret: PAYROLL_ARTIFACT_SECRET,
    bankImportPreviewTokens: BANK_IMPORT_PREVIEW_TOKENS,
    dmsUploadRuntime: createPostgresDmsUploadRuntime({
      pool: fixture.appPool,
      storage: dmsStorage,
      sourceOnly: false,
    }),
    hrxRelationalProjectionReader: {
      authority: "read-model-only",
      fallback_authority: "postgres-v2-generic-ledger",
      async materializeSnapshot({
        source_snapshot: sourceSnapshot,
      }) {
        projectionMaterializationCount += 1;
        const projected = structuredClone(sourceSnapshot);
        projected.tables.hrx_employees =
          projected.tables.hrx_employees.map((employee) => ({
            ...employee,
            display_name: "Relational projection read",
          }));
        return {
          snapshot: projected,
          projected_table_names: ["hrx_employees"],
          fallback_families: [],
        };
      },
    },
  });
  await importHrxAuthorityBaseline(ledger, TENANT_A);
  await authority.run({
    tenant_id: TENANT_A,
    request_context: {
      method: "POST",
      pathname: "/api/hrx/employees",
      idempotency_key: "hrx-relational-overlay-create-001",
    },
    command: (runtimes) =>
      runtimes.hrxRuntime.repository.createEmployee({
        tenant_id: TENANT_A,
        employee_id: "employee-relational-overlay-001",
        display_name: "Generic ledger write",
        status: "active",
      }),
  });
  assert.equal(projectionMaterializationCount, 0);
  const projected = await authority.run({
    tenant_id: TENANT_A,
    request_context: {
      method: "GET",
      pathname: "/api/hrx/employees/employee-relational-overlay-001",
    },
    command: (runtimes) =>
      runtimes.hrxRuntime.repository.getEmployee({
        tenant_id: TENANT_A,
        employee_id: "employee-relational-overlay-001",
      }),
  });
  assert.equal(projected.display_name, "Relational projection read");
  assert.equal(projectionMaterializationCount, 1);
  const generic = await ledger.list({
    tenant_id: TENANT_A,
    domain_id: "hrx",
    record_type: "hrx_employees",
  });
  assert.equal(generic[0].payload.display_name, "Generic ledger write");
  assert.equal(authority.capabilities.hrx_relational_read_projection, true);
  assert.equal(authority.capabilities.json_fallback, false);
  assert.equal(authority.capabilities.dual_write, false);
});

test("PostgreSQL API authority rolls product changes back when the HRX baseline changes before shared commit", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  const ledger = createPostgresDomainLedger({ pool: fixture.appPool });
  const dmsStorage = createLocalStorageAdapter({ adapter_id: "postgres-api-atomic-rollback-test" });
  const authority = createPostgresApiRuntimeAuthority({
    ledger,
    dmsStorage,
    payrollArtifactSecret: PAYROLL_ARTIFACT_SECRET,
    bankImportPreviewTokens: BANK_IMPORT_PREVIEW_TOKENS,
    dmsUploadRuntime: createPostgresDmsUploadRuntime({ pool: fixture.appPool, storage: dmsStorage, sourceOnly: false }),
  });
  await importHrxAuthorityBaseline(ledger, TENANT_A);

  await assert.rejects(authority.run({
    tenant_id: TENANT_A,
    request_context: {
      method: "POST",
      pathname: "/api/runtime-safety/atomic-rollback",
      idempotency_key: "atomic-rollback-001",
    },
    async command(runtimes) {
      runtimes.matterRuntime.repository.transaction((tx) => {
        tx.create({
          model_type: "Matter",
          matter_id: "matter_atomic_rollback_001",
          tenant_id: TENANT_A,
          client_id: "client_atomic_rollback_001",
          title: "Must roll back",
          status: "open",
          matter_code: "ATOMIC-ROLLBACK-001",
          created_by: "user_hrx_postgres_test",
          created_at: "2026-07-18T00:00:00.000Z",
          permission_envelope_id: "perm_atomic_rollback_001",
          audit_trace_id: "audit_atomic_rollback_001",
        });
        tx.recordIdempotency({
          tenant_id: TENANT_A,
          idempotency_key: "matter-atomic-rollback-001",
          operation: "matter_create",
          response: { matter_id: "matter_atomic_rollback_001" },
        });
        tx.appendAudit({
          tenant_id: TENANT_A,
          event_id: "matter:atomic-rollback:001",
          action: "matter.created",
          object_type: "Matter",
          object_id: "matter_atomic_rollback_001",
        });
      });
      runtimes.hrxRuntime.repository.createEmployee({
        tenant_id: TENANT_A,
        employee_id: "employee-atomic-rollback-001",
        display_name: "Must roll back",
        status: "active",
      });
      await ledger.write({
        tenant_id: TENANT_A,
        domain_id: "hrx",
        record_type: "runtime-safety-concurrent-probe",
        record_id: "concurrent-001",
        payload: { probe: true },
        expected_version: 0,
      });
    },
  }), (error) => error?.safe_error_code === "DOMAIN_BASELINE_CONFLICT");

  assert.equal((await ledger.list({ tenant_id: TENANT_A, domain_id: "matter" })).length, 0);
  assert.equal(
    (await ledger.list({ tenant_id: TENANT_A, domain_id: "hrx" }))
      .some((record) => record.record_type === "hrx_employees"),
    false,
  );
});
