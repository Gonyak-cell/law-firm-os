import { createHash } from "node:crypto";
import { encryptCompensationAmount } from "../../../packages/hrx/src/compensation.js";
import {
  PAYROLL_STATEMENT_TEMPLATE_SCHEMA,
  PAYROLL_STATEMENT_TEMPLATE_VERSION,
  createEncryptedPayrollArtifactVault,
  createPayrollDocumentService,
} from "../../../packages/hrx/src/payroll/document-service.js";
import {
  SYNTHETIC_PAYROLL_FILING_SCHEMAS,
  createPayrollFilingService,
} from "../../../packages/hrx/src/payroll/filing-service.js";
import { createSqlPayrollItemCatalog } from "../../../packages/hrx/src/payroll-item-catalog.js";
import { createSqlPayrollProfileService } from "../../../packages/hrx/src/payroll-profile-service.js";
import { createSqlPayrollTimeInputService } from "../../../packages/hrx/src/payroll-time-input-snapshot.js";
import { createPayrollInputSnapshotService, createServerCompensationResolver } from "../../../packages/hrx/src/payroll/input-snapshot-service.js";
import { createPayrollPaymentService } from "../../../packages/hrx/src/payroll/payment-service.js";
import { createPayrollRepository } from "../../../packages/hrx/src/payroll/repository.js";
import { createPayrollRunService } from "../../../packages/hrx/src/payroll/run-service.js";
import { createPayrollYearEndService } from "../../../packages/hrx/src/payroll/year-end-service.js";
import { HRX_PROVIDER_RECEIPT_SCHEMA_VERSION } from "../../../packages/hrx/src/provider-receipt-contract.js";

const SYNTHETIC_PERIOD = Object.freeze({
  period_id: "payroll-period-2026-07",
  period_code: "2026-07",
  period_start: "2026-07-01",
  period_end: "2026-07-31",
  cutoff_at: "2026-07-31T18:00:00+09:00",
  pay_date: "2026-08-05",
});

const EARNING_RULES = Object.freeze({
  schema_version: "law-firm-os.hrx.payroll-earning-rules.v0.1",
  fixture_only: true,
  currency: "KRW",
  rounding_mode: "nearest",
  monthly: {
    proration_basis: "calendar_days",
    rate_divisor_minutes: 9_600,
    unpaid_leave: { rate_bps: 10_000, taxable: true },
  },
  segment_rates: {
    overtime: { rate_bps: 5_000, taxable: true },
    night: { rate_bps: 5_000, taxable: true },
    holiday: { rate_bps: 10_000, taxable: true },
  },
  allowances: [],
  unused_leave: null,
});

const STATUTORY_RULES = Object.freeze({
  schema_version: "law-firm-os.hrx.payroll-statutory-rules.v0.1",
  package_id: "synthetic-payroll-statutory-2026-h2",
  version_code: "SYNTHETIC-2026-H2",
  effective_from: "2026-07-01",
  effective_to: "2026-12-31",
  currency: "KRW",
  fixture_only: true,
  source_document_ref: "artifact:synthetic/payroll-statutory-2026-h2",
  source_document_hash: "c".repeat(64),
  rounding_mode: "nearest",
  income_tax: {
    local_income_tax_rate_bps: 1_000,
    dependent_overflow: "highest_available",
    brackets: [
      { dependent_count: 0, minimum_taxable_krw: 0, maximum_taxable_krw: 999_999, tax_krw: 0 },
      { dependent_count: 0, minimum_taxable_krw: 1_000_000, maximum_taxable_krw: 1_999_999, tax_krw: 50_000 },
      { dependent_count: 0, minimum_taxable_krw: 2_000_000, maximum_taxable_krw: null, tax_krw: 150_000 },
    ],
    withholding_categories: [],
  },
  pension: { employee_rate_bps: 500, minimum_base_krw: 1_000_000, maximum_base_krw: 3_000_000 },
  health: { employee_rate_bps: 400, minimum_base_krw: 1_000_000, maximum_base_krw: 5_000_000 },
  long_term_care: { rate_bps_of_health: 1_000 },
  employment_insurance: { employee_rate_bps: 100 },
  custom_deduction_net_floor_krw: 100_000,
});

function sha256(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function hasRow(store, table, where) {
  return store.query("selectOne", { table, where }) !== undefined;
}

function payrollPolicy(tenantId) {
  return Object.freeze({
    schema_version: "law-firm-os.hrx.company-time-payroll-policy.v0.1",
    manifest_id: `company_time_payroll_policy_synthetic_${tenantId}`,
    tenant_id: tenantId,
    environment: "synthetic",
    status: "draft",
    effective_from: "2026-07-01",
    source_document_hash: null,
    standard_work: { timezone: "Asia/Seoul", daily_minutes: 480, rounding_minutes: 1, rounding_mode: "none" },
    leave: { default_expiration_months: 12, allocation_order: "earliest_expiry_then_earned_at" },
    payroll: { frequency: "monthly", cutoff_day: null, pay_day: null, non_business_day_rule: null },
    employment_types: ["full_time", "part_time", "contractor", "intern"],
    provider_ids: { document_delivery: null, bank_transfer: null, tax_filing: null, calendar: null },
    decisions: [
      { decision_id: "COMPANY_STANDARD_WORKDAY", status: "pending_owner", source_ref: null },
      { decision_id: "LEAVE_EXPIRATION", status: "pending_owner", source_ref: null },
      { decision_id: "PAYROLL_CALENDAR", status: "pending_owner", source_ref: null },
      { decision_id: "EMPLOYMENT_TYPES", status: "pending_owner", source_ref: null },
      { decision_id: "PROVIDER_IDENTIFIERS", status: "pending_owner", source_ref: null },
    ],
  });
}

function publishRule(repository, tenantId, input) {
  const preparer = { tenant_id: tenantId, actor_id: "system-payroll-preparer" };
  const approver = { tenant_id: tenantId, actor_id: "system-payroll-approver" };
  if (repository.listRuleVersions(preparer, { rule_kind: input.rule_kind }).some((row) => row.approval_state === "published")) return;
  const draft = repository.createRuleVersion(preparer, input);
  const reviewed = repository.reviewRuleVersion(approver, { rule_version_id: draft.rule_version_id, expected_version: draft.state_version });
  repository.publishRuleVersion(approver, { rule_version_id: reviewed.rule_version_id, expected_version: reviewed.state_version });
}

function publishStatementTemplate(repository, tenantId) {
  const preparer = { tenant_id: tenantId, actor_id: "system-payroll-preparer" };
  const approver = { tenant_id: tenantId, actor_id: "system-payroll-approver" };
  if (repository.listStatementTemplates(preparer, { status: "published" }).length) return;
  const draft = repository.createStatementTemplate(preparer, {
    template_id: "forest-payroll-statement-v1",
    version_code: PAYROLL_STATEMENT_TEMPLATE_VERSION,
    schema: PAYROLL_STATEMENT_TEMPLATE_SCHEMA,
  });
  repository.publishStatementTemplate(approver, { template_id: draft.template_id, expected_version: draft.state_version });
}

function syntheticReceipt(request, { providerKind, operation }) {
  const completedAt = "2026-07-15T01:00:00.000Z";
  return Object.freeze({
    schema_version: HRX_PROVIDER_RECEIPT_SCHEMA_VERSION,
    receipt_id: `synthetic-${providerKind}-${sha256(request).slice(0, 20)}`,
    tenant_id: request.tenant_id,
    provider_kind: providerKind,
    provider_id: `lawos-${providerKind}-sandbox`,
    operation,
    idempotency_key: request.idempotency_key,
    payload_hash: request.payload_hash,
    state: "succeeded",
    requested_at: completedAt,
    completed_at: completedAt,
    provider_receipt_ref: `provider:sandbox/${providerKind}/${sha256(request).slice(0, 24)}`,
    error_code: null,
  });
}

export function seedSyntheticPayrollRuntimeStore(store, tenantIds, options = {}) {
  const now = options.clock ?? (() => "2026-07-15T01:00:00.000Z");
  const repository = createPayrollRepository({ store, clock: now });
  for (const tenantId of tenantIds) {
    const context = { tenant_id: tenantId, actor_id: "system-payroll-preparer" };
    const employees = store.query("select", { table: "hrx_employees", where: { tenant_id: tenantId } })
      .filter((row) => ["active", "on_leave"].includes(row.status))
      .sort((left, right) => left.employee_id.localeCompare(right.employee_id));

    employees.forEach((employee, index) => {
      const compensationId = `payroll-synthetic-comp-${employee.employee_id}`;
      if (!hasRow(store, "hrx_compensation_records", { tenant_id: tenantId, compensation_id: compensationId })) {
        store.query("insert", {
          table: "hrx_compensation_records",
          row: {
            tenant_id: tenantId,
            compensation_id: compensationId,
            employee_id: employee.employee_id,
            encrypted_amount_ref: encryptCompensationAmount({
              tenant_id: tenantId,
              employee_id: employee.employee_id,
              compensation_id: compensationId,
              amount_minor: 3_000_000 + index * 250_000,
              currency_ref: "KRW",
            }, { iv: Buffer.alloc(12, (index % 254) + 1), allowSyntheticKey: true }),
            currency_ref: "KRW",
            raw_amount_included: false,
            effective_from: "2026-01-01",
            effective_to: null,
            source_ref: `artifact:synthetic/payroll-compensation/${employee.employee_id}`,
            employment_contract_id: `synthetic-contract-${employee.employee_id}`,
            contract_document_ref: `artifact:synthetic/payroll-contract/${employee.employee_id}`,
            created_at: now(),
            updated_at: now(),
          },
        });
      }
      const profileId = `payroll-profile-${employee.employee_id}`;
      if (!hasRow(store, "hrx_payroll_profiles", { tenant_id: tenantId, payroll_profile_id: profileId })) {
        repository.createProfile(context, {
          payroll_profile_id: profileId,
          employee_id: employee.employee_id,
          employment_type: "monthly",
          pay_group_code: "KR-MONTHLY",
          compensation_ref: `compensation:${compensationId}`,
          deduction_input: {
            dependent_count: 0,
            income_tax_exempt: false,
            withholding_category: null,
            pension: { enrolled: true },
            health: { enrolled: true },
            employment_insurance: { enrolled: true },
          },
          effective_from: "2026-01-01",
        });
      }
    });

    publishRule(repository, tenantId, {
      rule_version_id: "payroll-earnings-synthetic-2026-h2",
      rule_kind: "payroll_earnings",
      version_code: "SYNTHETIC-2026-H2",
      effective_from: "2026-07-01",
      effective_to: "2026-12-31",
      source_document_hash: sha256(EARNING_RULES),
      rules: EARNING_RULES,
    });
    publishRule(repository, tenantId, {
      rule_version_id: "payroll-statutory-synthetic-2026-h2",
      rule_kind: "payroll_statutory",
      version_code: "SYNTHETIC-2026-H2",
      effective_from: "2026-07-01",
      effective_to: "2026-12-31",
      source_document_hash: STATUTORY_RULES.source_document_hash,
      rules: STATUTORY_RULES,
    });
    publishStatementTemplate(repository, tenantId);

    let period = repository.listPeriods(context).find((row) => row.period_code === SYNTHETIC_PERIOD.period_code);
    if (!period) period = repository.createPeriod(context, SYNTHETIC_PERIOD);
    if (period.status === "draft") period = repository.transitionPeriod(context, { period_id: period.period_id, status: "open", expected_version: period.state_version });
    if (!repository.listRuns(context, { period_id: period.period_id }).some((row) => row.run_type === "regular")) {
      repository.createRun(context, { run_id: "payroll-run-2026-07", period_id: period.period_id, run_type: "regular" });
    }
  }
}

export function createHrxPayrollRuntime({
  store,
  clock,
  audit,
  artifactStorage,
  artifactSecret,
  compensationKeyMaterial,
  allowSyntheticArtifactSecret = true,
  allowSyntheticCompensationKey = true,
  allowSyntheticProviders = true,
  deliveryPort,
  accountResolver: providedAccountResolver,
  bankAdapter,
  bankReconciliationPort,
  filingProviderPort,
  filingSchemaRegistry,
} = {}) {
  if (!store) return null;
  const itemCatalog = createSqlPayrollItemCatalog({ store, audit, ...(clock ? { clock } : {}) });
  const compensationEncryptionOptions = {
    ...(compensationKeyMaterial ? { keyMaterial: compensationKeyMaterial } : {}),
    allowSyntheticKey: allowSyntheticCompensationKey,
  };
  const profileService = createSqlPayrollProfileService({
    store,
    ...(clock ? { clock } : {}),
    encryptionOptions: compensationEncryptionOptions,
  });
  const timeInputService = createSqlPayrollTimeInputService({ store, ...(clock ? { clock } : {}) });
  const payrollRepository = createPayrollRepository({ store, ...(clock ? { clock } : {}) });
  const inputSnapshotService = createPayrollInputSnapshotService({
    store,
    payrollRepository,
    compensationResolver: createServerCompensationResolver({
      store,
      ...(compensationKeyMaterial ? { keyMaterial: compensationKeyMaterial } : {}),
      allowSyntheticKey: allowSyntheticCompensationKey,
    }),
    policyManifest: (tenantId) => payrollPolicy(tenantId),
    ...(clock ? { clock } : {}),
  });
  const runService = createPayrollRunService({ payrollRepository, inputSnapshotService, ...(clock ? { clock } : {}) });
  const artifactVault = createEncryptedPayrollArtifactVault({
    ...(artifactStorage ? { storage: artifactStorage } : {}),
    ...(artifactSecret ? { secret: artifactSecret } : {}),
    allowSyntheticSecret: allowSyntheticArtifactSecret,
  });
  const documentService = createPayrollDocumentService({
    repository: payrollRepository,
    store,
    artifactVault,
    deliveryPort: deliveryPort ?? (allowSyntheticProviders ? {
      async send(request) {
        return syntheticReceipt(request, { providerKind: "delivery", operation: `statement.${request.channel}` });
      },
    } : null),
    ...(clock ? { clock } : {}),
  });
  const syntheticAccountResolver = {
    resolve({ tenant_id, employee_id }) {
      const employee = store.query("selectOne", { table: "hrx_employees", where: { tenant_id, employee_id } });
      if (!employee) return null;
      const seed = sha256({ tenant_id, employee_id });
      return Object.freeze({
        tokenized_account_ref: `token:payroll-bank/${employee_id}/${seed.slice(0, 16)}`,
        bank_code: "999",
        account_number: `9${seed.replace(/[^0-9]/g, "").padEnd(13, "0").slice(0, 13)}`,
        account_holder: employee.display_name,
      });
    },
  };
  const unavailableBankAdapter = Object.freeze({
    format_code: "PROVIDER_REQUIRED",
    render() {
      const error = new Error("Authoritative payroll bank adapter is required");
      error.safe_error_code = "HRX_PAYROLL_BANK_PROVIDER_REQUIRED";
      error.status = 503;
      throw error;
    },
  });
  const accountResolver = providedAccountResolver
    ?? (allowSyntheticProviders ? syntheticAccountResolver : Object.freeze({ resolve: () => null }));
  const paymentService = createPayrollPaymentService({
    repository: payrollRepository,
    accountResolver,
    bankAdapter: bankAdapter ?? (allowSyntheticProviders ? undefined : unavailableBankAdapter),
    artifactVault,
    ...(clock ? { clock } : {}),
  });
  const filingService = createPayrollFilingService({
    repository: payrollRepository,
    artifactVault,
    providerPort: filingProviderPort ?? (allowSyntheticProviders ? {
      async submit(request) {
        return syntheticReceipt(request, { providerKind: "filing", operation: `filing.${request.filing_kind}` });
      },
    } : null),
    schemaRegistry: filingSchemaRegistry ?? (allowSyntheticProviders ? SYNTHETIC_PAYROLL_FILING_SCHEMAS : Object.freeze({})),
    ...(clock ? { clock } : {}),
  });
  const resolvedBankReconciliationPort = bankReconciliationPort ?? (allowSyntheticProviders ? Object.freeze({
    async reconcile({ context, bundle }) {
      const providerReceipt = syntheticReceipt({
        tenant_id: context.tenant_id,
        idempotency_key: `${bundle.batch.payment_batch_id}:reconcile`,
        payload_hash: `sha256:${sha256({ payment_batch_id: bundle.batch.payment_batch_id, checksum: bundle.batch.checksum })}`,
      }, { providerKind: "bank", operation: "bulk_transfer_reconcile" });
      return Object.freeze({
        provider_receipt: providerReceipt,
        items: bundle.items.map((item) => Object.freeze({
          employee_id: item.employee_id,
          state: "paid",
          provider_receipt_ref: `provider:sandbox/bank/item/${item.payment_item_id}`,
        })),
        reported_paid_total_krw: bundle.items.reduce((sum, item) => sum + item.amount_krw, 0),
      });
    },
  }) : null);
  const yearEndService = createPayrollYearEndService({ repository: payrollRepository });
  return Object.freeze({
    itemCatalog,
    profileService,
    timeInputService,
    payrollRepository,
    inputSnapshotService,
    runService,
    documentService,
    paymentService,
    filingService,
    yearEndService,
    artifactVault,
    bankReconciliationPort: resolvedBankReconciliationPort,
    provider_mode: allowSyntheticProviders ? "synthetic-test" : "external-required",
  });
}
