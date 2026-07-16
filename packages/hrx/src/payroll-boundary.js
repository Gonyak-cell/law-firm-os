const BLOCKED_PAYROLL_FIELDS = Object.freeze(["net_pay", "gross_pay", "tax_withholding", "disbursement_instruction"]);
const READINESS_STAGES = Object.freeze(["calculation_runtime", "internal_runtime", "package_verified", "production_approved", "go_live"]);
const TOKENIZED_REF = /^(?:artifact|document|provider|token|vault):[^\s@]+$/;
const SHA256 = /^[a-f0-9]{64}$/;

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

export function createPayrollExportPreview(input = {}) {
  for (const field of BLOCKED_PAYROLL_FIELDS) {
    if (Object.hasOwn(input, field)) throw new TypeError(`Payroll export preview must not include ${field}`);
  }
  return Object.freeze({
    tenant_id: requiredString(input, "tenant_id"),
    preview_id: requiredString(input, "preview_id"),
    payroll_period: requiredString(input, "payroll_period"),
    employee_ids: Object.freeze([...(input.employee_ids ?? [])]),
    external_provider: input.external_provider ?? null,
    human_review_required: true,
    calculation_runtime: false,
    disbursement_instruction_included: false,
  });
}

function hasHash(value) {
  return typeof value === "string" && SHA256.test(value);
}

function hasRef(value) {
  return typeof value === "string" && TOKENIZED_REF.test(value);
}

function providerKinds(receipts, environment) {
  return new Set((receipts ?? [])
    .filter((receipt) => receipt?.environment === environment && receipt?.state === "succeeded" && hasRef(receipt.provider_receipt_ref))
    .map((receipt) => receipt.provider_kind));
}

function missingChecks(checks) {
  return Object.freeze(Object.entries(checks).filter(([, passed]) => !passed).map(([name]) => name));
}

export function evaluatePayrollReadiness(input = {}) {
  const sandboxKinds = providerKinds(input.provider_receipts, "sandbox");
  const productionKinds = providerKinds(input.provider_receipts, "production");
  const missing = {
    calculation_runtime: missingChecks({
      domain_suite_hash: hasHash(input.domain_suite_hash),
      golden_fixture_hash: hasHash(input.golden_fixture_hash),
      parallel_comparison_hash: hasHash(input.parallel_comparison_hash),
      unexplained_variance_zero: input.unexplained_variance_count === 0,
    }),
    internal_runtime: missingChecks({
      api_suite_hash: hasHash(input.api_suite_hash),
      authz_suite_hash: hasHash(input.authz_suite_hash),
      migration_reconciliation_hash: hasHash(input.migration_reconciliation_hash),
      forest_browser_qa_ref: hasRef(input.forest_browser_qa_ref),
    }),
    package_verified: missingChecks({
      macos_package_hash: hasHash(input.macos_package_hash),
      windows_package_hash: hasHash(input.windows_package_hash),
      package_qa_ref: hasRef(input.package_qa_ref),
    }),
    production_approved: missingChecks({
      owner_approval_ref: hasRef(input.owner_approval_ref),
      legal_signoff_ref: hasRef(input.legal_signoff_ref),
      labor_signoff_ref: hasRef(input.labor_signoff_ref),
      tax_signoff_ref: hasRef(input.tax_signoff_ref),
      delivery_sandbox_receipt: sandboxKinds.has("delivery"),
      bank_sandbox_receipt: sandboxKinds.has("bank"),
      filing_sandbox_receipt: sandboxKinds.has("filing"),
    }),
    go_live: missingChecks({
      go_live_approval_ref: hasRef(input.go_live_approval_ref),
      delivery_production_receipt: productionKinds.has("delivery"),
      bank_production_receipt: productionKinds.has("bank"),
      filing_production_receipt: productionKinds.has("filing"),
    }),
  };
  const calculationRuntime = missing.calculation_runtime.length === 0;
  const internalRuntime = calculationRuntime && missing.internal_runtime.length === 0;
  const packageVerified = internalRuntime && missing.package_verified.length === 0;
  const productionApproved = packageVerified && missing.production_approved.length === 0;
  const goLive = productionApproved && missing.go_live.length === 0;
  return Object.freeze({
    schema_version: "law-firm-os.hrx.payroll-readiness.v0.1",
    tenant_id: requiredString(input, "tenant_id"),
    calculation_runtime: calculationRuntime,
    internal_runtime: internalRuntime,
    package_verified: packageVerified,
    production_approved: productionApproved,
    go_live: goLive,
    missing: Object.freeze(Object.fromEntries(Object.entries(missing).map(([stage, values]) => [stage, values]))),
  });
}

export function assertPayrollReadinessStage(input = {}, stage) {
  if (!READINESS_STAGES.includes(stage)) throw new TypeError("payroll readiness stage is invalid");
  const readiness = evaluatePayrollReadiness(input);
  if (readiness[stage] !== true) {
    const stageIndex = READINESS_STAGES.indexOf(stage);
    const missing = READINESS_STAGES.slice(0, stageIndex + 1).flatMap((name) => readiness.missing[name].map((item) => `${name}.${item}`));
    const error = new Error(`Payroll readiness evidence is incomplete: ${missing.join(", ")}`);
    error.safe_error_code = "HRX_PAYROLL_READINESS_EVIDENCE_MISSING";
    error.status = 409;
    error.missing = Object.freeze(missing);
    throw error;
  }
  return readiness;
}
