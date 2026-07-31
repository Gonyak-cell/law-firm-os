import { randomUUID } from "node:crypto";
import { SYNTHETIC_PAYROLL_FILING_SCHEMAS } from "../../../../../packages/hrx/src/payroll/filing-service.js";
import { HRX_PAYMENT_RECONCILIATION_MANUAL_REQUIRED } from "../../../../../packages/hrx/src/payroll/repository.js";
import { createPayrollStepUpReceipt } from "../../../../../packages/hrx/src/payroll/run-service.js";
import { serializePayrollClosePrecheck } from "../../../../../packages/hrx/src/payroll/close-precheck.js";
import { serializeMinimumWageImpact } from "../../../../../packages/hrx/src/payroll/minimum-wage.js";
import {
  publicEmployeeDisplayName,
  publicPeopleLabel,
} from "../../../../../packages/hrx/src/people-presentation.js";

const PAYMENT_RECONCILIATION_REMATERIALIZATION_ERRORS = new WeakSet();
const PUBLIC_PAYROLL_SAFE_ERROR_CODES = new Set(`
  HRX_MINIMUM_WAGE_COVERAGE_INVALID
  HRX_MINIMUM_WAGE_INPUT_SOURCE_REQUIRED
  HRX_MINIMUM_WAGE_LEGAL_REVIEW_REQUIRED
  HRX_MINIMUM_WAGE_LEGAL_REVIEW_SCOPE_REQUIRED
  HRX_MINIMUM_WAGE_LEGAL_REVIEW_STATE_INVALID
  HRX_MINIMUM_WAGE_NOT_FOUND
  HRX_PAYROLL_ADJUSTMENT_AMOUNT_INVALID
  HRX_PAYROLL_ADJUSTMENT_EMPTY
  HRX_PAYROLL_ADJUSTMENT_SOURCE_CHANGED
  HRX_PAYROLL_ADJUSTMENT_SOURCE_INVALID
  HRX_PAYROLL_ADJUSTMENT_STATE_INVALID
  HRX_PAYROLL_ASSIGNMENT_CURRENCY_MISMATCH
  HRX_PAYROLL_ASSIGNMENT_INACTIVE
  HRX_PAYROLL_ASSIGNMENT_ITEM_PERIOD
  HRX_PAYROLL_ASSIGNMENT_NOT_CURRENT
  HRX_PAYROLL_ASSIGNMENT_NOT_FOUND
  HRX_PAYROLL_ASSIGNMENT_PERIOD_OVERLAP
  HRX_PAYROLL_ASSIGNMENT_PROFILE_PERIOD
  HRX_PAYROLL_ATTENDANCE_APPROVAL_IDEMPOTENCY_CONFLICT
  HRX_PAYROLL_ATTENDANCE_NOT_FOUND
  HRX_PAYROLL_BANK_PROVIDER_REQUIRED
  HRX_PAYROLL_BLOCKERS_OPEN
  HRX_PAYROLL_CLOSE_PRECHECK_BLOCKED
  HRX_PAYROLL_CLOSE_PRECHECK_DISABLED
  HRX_PAYROLL_COMPENSATION_EMPLOYEE_MISMATCH
  HRX_PAYROLL_COMPENSATION_PERIOD_MISMATCH
  HRX_PAYROLL_COMPENSATION_RECORD_MISSING
  HRX_PAYROLL_COMPENSATION_REF_INVALID
  HRX_PAYROLL_CORRECTION_KEY_CONFLICT
  HRX_PAYROLL_DASHBOARD_MONTH_INVALID
  HRX_PAYROLL_DEDUCTION_INPUT_INVALID
  HRX_PAYROLL_DEDUCTION_INPUT_REQUIRED
  HRX_PAYROLL_DELIVERY_PROVIDER_REQUIRED
  HRX_PAYROLL_DELIVERY_REVOKED
  HRX_PAYROLL_DELIVERY_STATE_INVALID
  HRX_PAYROLL_FILING_ATTEMPT_STATE_INVALID
  HRX_PAYROLL_FILING_CORRECTION_NO_CHANGE
  HRX_PAYROLL_FILING_CORRECTION_SOURCE_INVALID
  HRX_PAYROLL_FILING_NOT_FOUND
  HRX_PAYROLL_FILING_PROVIDER_PENDING
  HRX_PAYROLL_FILING_PROVIDER_REQUIRED
  HRX_PAYROLL_FILING_RECEIPT_DUPLICATE
  HRX_PAYROLL_FILING_RECORDS_FORBIDDEN
  HRX_PAYROLL_FILING_RESULTS_REQUIRED
  HRX_PAYROLL_FILING_RESULT_DUPLICATE
  HRX_PAYROLL_FILING_SCHEMA_UNAPPROVED
  HRX_PAYROLL_FILING_SOURCE_HASH_MISMATCH
  HRX_PAYROLL_FILING_SOURCE_VERIFICATION_REQUIRED
  HRX_PAYROLL_FILING_STATE_INVALID
  HRX_PAYROLL_FILING_TOTAL_MISMATCH
  HRX_PAYROLL_ISSUE_STATE_INVALID
  HRX_PAYROLL_ITEM_INACTIVE
  HRX_PAYROLL_ITEM_NOT_FOUND
  HRX_PAYROLL_MIGRATION_APPROVAL_REQUIRED
  HRX_PAYROLL_MIGRATION_BACKUP_UNAVAILABLE
  HRX_PAYROLL_MIGRATION_ROLLBACK_STALE
  HRX_PAYROLL_NOT_FOUND
  HRX_PAYROLL_NO_PAYABLE_ITEMS
  HRX_PAYROLL_PAYMENT_ACCOUNT_MISSING
  HRX_PAYROLL_PAYMENT_APPROVER_SEPARATION
  HRX_PAYROLL_PAYMENT_COUNT_MISMATCH
  HRX_PAYROLL_PAYMENT_NOT_FOUND
  HRX_PAYROLL_PAYMENT_OUTCOME_DUPLICATE
  HRX_PAYROLL_PAYMENT_RECONCILIATION_INCOMPLETE
  HRX_PAYROLL_PAYMENT_RESULT_HASH_MISMATCH
  HRX_PAYROLL_PAYMENT_RESULT_INVALID
  HRX_PAYROLL_PAYMENT_RETRY_SCOPE_INVALID
  HRX_PAYROLL_PAYMENT_STATE_INVALID
  HRX_PAYROLL_PAYMENT_TAMPERED
  HRX_PAYROLL_PAYMENT_TOTAL_MISMATCH
  HRX_PAYROLL_PREVIEW_EXISTS
  HRX_PAYROLL_PROFILE_ID_MISMATCH
  HRX_PAYROLL_PROFILE_INACTIVE
  HRX_PAYROLL_PROFILE_NOT_FOUND
  HRX_PAYROLL_PROVIDER_EVENT_CONFLICT
  HRX_PAYROLL_PROVIDER_EVENT_OUT_OF_ORDER
  HRX_PAYROLL_PROVIDER_EVENT_STATE_UNKNOWN
  HRX_PAYROLL_PROVIDER_EVENT_TIME_INVALID
  HRX_PAYROLL_PROVIDER_ID_MISMATCH
  HRX_PAYROLL_PROVIDER_RECEIPT_INVALID
  HRX_PAYROLL_PROVIDER_RECEIPT_REQUIRED
  HRX_PAYROLL_PROVIDER_REPORTED_FAILED
  HRX_PAYROLL_PROVIDER_REQUEST_FAILED
  HRX_PAYROLL_PROVIDER_STATUS_INVALID
  HRX_PAYROLL_PROVIDER_STATUS_REQUIRED
  HRX_PAYROLL_PROVIDER_STATUS_UNAVAILABLE
  HRX_PAYROLL_RECONCILIATION_MANUAL_REQUIRED
  HRX_PAYROLL_RECONCILIATION_RECOVERY_STATE_INVALID
  HRX_PAYROLL_RECOVERY_WORKFLOW_REQUIRED
  HRX_PAYROLL_RESULT_IMMUTABLE
  HRX_PAYROLL_RETIREMENT_PLAN_DUPLICATE
  HRX_PAYROLL_RULE_COVERAGE_INVALID
  HRX_PAYROLL_RULE_NOT_FOUND
  HRX_PAYROLL_RULE_PUBLISH_DISABLED
  HRX_PAYROLL_RULE_STATE_INVALID
  HRX_PAYROLL_RUNTIME_ERROR
  HRX_PAYROLL_RUN_DUPLICATE
  HRX_PAYROLL_RUN_NOT_CLOSED
  HRX_PAYROLL_SELF_APPROVAL
  HRX_PAYROLL_SNAPSHOT_MISMATCH
  HRX_PAYROLL_STATEMENT_DELIVERY_DISABLED
  HRX_PAYROLL_STATEMENT_INTEGRITY
  HRX_PAYROLL_STATEMENT_NOT_FOUND
  HRX_PAYROLL_STATE_INVALID
  HRX_PAYROLL_TEMPLATE_STATE_INVALID
  HRX_PAYROLL_TENANT_MISMATCH
  HRX_PAYROLL_TERMINATION_DATE_INVALID
  HRX_PAYROLL_TIME_OVERTIME_EXCEEDS_ATTENDANCE
  HRX_PAYROLL_WITHHOLDING_CATEGORY_REQUIRED
  HRX_PAYROLL_YEAR_END_COLLECTION_INCOMPLETE
  HRX_PAYROLL_YEAR_END_COLLECTION_REQUIRED
  HRX_PAYROLL_YEAR_END_INPUT_IMMUTABLE
  HRX_PAYROLL_YEAR_END_REVIEW_REQUIRED
  HRX_PAYROLL_YEAR_END_STATE_INVALID
  HRX_POSTGRES_BASELINE_CONFLICT
  HRX_PROVIDER_ATTEMPT_COUNT_MISMATCH
  HRX_PROVIDER_CONNECTION_REQUIRED
  HRX_PROVIDER_IDEMPOTENCY_CONFLICT
  HRX_PROVIDER_ITEM_DUPLICATE
  HRX_PROVIDER_OPERATION_COMPLETE
  HRX_PROVIDER_OPERATION_IN_PROGRESS
  HRX_PROVIDER_OPERATION_STATE_INVALID
  HRX_PROVIDER_PRODUCTION_REFERENCE_REQUIRED
  HRX_PROVIDER_RECEIPT_DUPLICATE
  HRX_PROVIDER_RECEIPT_SCOPE_MISMATCH
  HRX_PROVIDER_RESULT_UNKNOWN
  HRX_PROVIDER_RETRY_LIMIT_EXCEEDED
  HRX_PROVIDER_SYNTHETIC_PRODUCTION_FORBIDDEN
  HRX_PROVIDER_SYNTHETIC_RECEIPT_FORBIDDEN
  HRX_STATE_VERSION_CONFLICT
  HRX_STEP_UP_EXPIRED
  HRX_STEP_UP_INVALID
  HRX_STEP_UP_REQUIRED
  HRX_STEP_UP_SCOPE_INVALID
  POSTGRES_ACCESS_DENIED
  POSTGRES_OPERATION_FAILED
  POSTGRES_TRANSACTION_RETRY_EXHAUSTED
  POSTGRES_UNIQUE_CONFLICT
`.trim().split(/\s+/));

const PROVIDER_ERROR_BY_ACTION = Object.freeze({
  "filing-submit": Object.freeze({
    status: 503,
    safe_error_code: "HRX_PAYROLL_FILING_PROVIDER_UNAVAILABLE",
    reason: "급여 신고 연동을 일시적으로 사용할 수 없습니다.",
  }),
  payment: Object.freeze({
    status: 503,
    safe_error_code: "HRX_PAYROLL_PAYMENT_PROVIDER_UNAVAILABLE",
    reason: "급여 지급 연동을 일시적으로 사용할 수 없습니다.",
  }),
  statement: Object.freeze({
    status: 503,
    safe_error_code: "HRX_PAYROLL_STATEMENT_PROVIDER_UNAVAILABLE",
    reason: "급여명세서 연동을 일시적으로 사용할 수 없습니다.",
  }),
});

function response(status, body) {
  return Object.freeze({ status, body: Object.freeze(body) });
}

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || !value.trim()) throw new TypeError(`${field} is required`);
  return value.trim();
}

function parseJson(value, fallback) {
  if (typeof value !== "string" || !value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

const MISSING_EMPLOYEE_DISPLAY_NAME = "구성원 이름 확인 필요";

function safeHumanDisplayName(value, fallback, opaqueIdentifiers = []) {
  return publicPeopleLabel(value, {
    references: opaqueIdentifiers,
    fallback,
  });
}

function publicErrorReason(status) {
  if (status === 401 || status === 403) return "급여 작업 권한을 확인할 수 없습니다.";
  if (status === 404) return "요청한 급여 정보를 찾을 수 없습니다.";
  if (status === 409) return "현재 상태에서는 급여 작업을 처리할 수 없습니다.";
  if (status === 429) return "급여 요청이 많습니다. 잠시 후 다시 시도해 주세요.";
  if (status >= 500) return "급여 서비스를 일시적으로 사용할 수 없습니다.";
  return "급여 요청값을 확인해 주세요.";
}

function providerError(action) {
  if (action === "filing-submit") return PROVIDER_ERROR_BY_ACTION["filing-submit"];
  if (action?.startsWith("payment-")) return PROVIDER_ERROR_BY_ACTION.payment;
  if (action?.startsWith("statement")) return PROVIDER_ERROR_BY_ACTION.statement;
  return Object.freeze({
    status: 500,
    safe_error_code: "HRX_PAYROLL_RUNTIME_ERROR",
    reason: "급여 요청을 처리할 수 없습니다.",
  });
}

function safeError(error, action) {
  const safeErrorCode = typeof error?.safe_error_code === "string"
    && PUBLIC_PAYROLL_SAFE_ERROR_CODES.has(error.safe_error_code)
    ? error.safe_error_code
    : null;
  if (!safeErrorCode) {
    const fallback = error instanceof TypeError
      ? Object.freeze({
          status: 400,
          safe_error_code: "HRX_PAYROLL_REQUEST_INVALID",
          reason: "급여 요청값을 확인해 주세요.",
        })
      : providerError(action);
    return response(fallback.status, {
      outcome: "blocked",
      safe_error_code: fallback.safe_error_code,
      reason: fallback.reason,
    });
  }
  const status = Number.isInteger(error?.status) && error.status >= 400 && error.status < 600
    ? error.status
    : 400;
  return response(status, {
    outcome: "blocked",
    safe_error_code: safeErrorCode,
    reason: publicErrorReason(status),
  });
}

function hasScope(context, scope) {
  return Array.isArray(context?.hrx_scopes) && context.hrx_scopes.includes(scope);
}

function canViewPayrollAmounts(context) {
  return context?.can_view_payroll_details === true || hasScope(context, "hrx.payroll.amount.read");
}

function runStatusLabel(status) {
  return ({ draft: "입력 대기", snapshot_ready: "계산 준비", previewed: "검토 중", approved: "승인", closed: "마감", cancelled: "취소" })[status] ?? status;
}

function payrollMonth(value) {
  if (typeof value !== "string" || !/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) {
    const error = new TypeError("month must be YYYY-MM");
    error.safe_error_code = "HRX_PAYROLL_DASHBOARD_MONTH_INVALID";
    error.status = 400;
    throw error;
  }
  return value;
}

function runRecency(run) {
  const value = run.closed_at ?? run.approved_at ?? run.updated_at ?? run.created_at;
  const parsed = Date.parse(value ?? "");
  return Number.isFinite(parsed) ? parsed : 0;
}

function payrollCategory(title) {
  const value = String(title ?? "").trim().toLowerCase();
  if (!value) return "unclassified";
  if (/partner|파트너|대표변호사|구성원변호사/.test(value)) return "partner";
  if (/advisor|adviser|counsel|고문|자문위원|자문역/.test(value)) return "advisor";
  return "staff";
}

function effectiveEmploymentProfile(store, context, employeeId, periodEnd) {
  return store.query("select", {
    table: "hrx_employment_profiles",
    where: { tenant_id: context.tenant_id, employee_id: employeeId },
  })
    .filter((row) => row.effective_from <= periodEnd && (!row.effective_to || row.effective_to >= periodEnd))
    .sort((left, right) => right.effective_from.localeCompare(left.effective_from) || Number(right.state_version ?? 0) - Number(left.state_version ?? 0))[0] ?? null;
}

function dashboardSummary(runtime, store, context, monthInput) {
  const month = payrollMonth(monthInput);
  const period = runtime.payrollRepository.listPeriods(context).find((row) => row.period_code === month);
  if (!period) return null;
  const run = runtime.payrollRepository.listRuns(context, { period_id: period.period_id })
    .filter((row) => row.status === "approved" || row.status === "closed")
    .sort((left, right) => {
      const statusDelta = Number(right.status === "closed") - Number(left.status === "closed");
      return statusDelta || runRecency(right) - runRecency(left) || right.run_id.localeCompare(left.run_id);
    })[0];
  if (!run) return null;

  const categories = new Map([
    ["partner", { category: "partner", label: "파트너", gross_krw: 0, employee_count: 0 }],
    ["advisor", { category: "advisor", label: "고문", gross_krw: 0, employee_count: 0 }],
    ["staff", { category: "staff", label: "직원", gross_krw: 0, employee_count: 0 }],
    ["unclassified", { category: "unclassified", label: "미분류", gross_krw: 0, employee_count: 0 }],
  ]);
  const results = runtime.payrollRepository.getRunBundle(context, { run_id: run.run_id }).results;
  for (const result of results) {
    const profile = effectiveEmploymentProfile(store, context, result.employee_id, period.period_end);
    const category = payrollCategory(profile?.title);
    const aggregate = categories.get(category);
    aggregate.gross_krw += Number(result.gross_krw ?? 0);
    aggregate.employee_count += 1;
  }
  const grossKrw = [...categories.values()].reduce((sum, category) => sum + category.gross_krw, 0);
  return Object.freeze({
    month,
    currency: "KRW",
    run_status: run.status,
    gross_krw: grossKrw,
    employee_count: results.length,
    categories: Object.freeze([...categories.values()].map((category) => Object.freeze({ ...category }))),
    individual_values_included: false,
    individual_identifiers_included: false,
    credential_material_included: false,
    production_ready_claim: false,
  });
}

function selfEmployeeId(store, context) {
  const link = store.query("selectOne", { table: "hrx_employee_user_links", where: { tenant_id: context.tenant_id, user_id: context.actor_id } });
  if (!link?.employee_id) {
    const error = new Error("Payroll statement not found");
    error.safe_error_code = "HRX_PAYROLL_STATEMENT_NOT_FOUND";
    error.status = 404;
    throw error;
  }
  return link.employee_id;
}

function paymentBundle(runtime, context, batchId) {
  const value = runtime.paymentService.bundle(context, batchId);
  return Object.freeze({ ...value, production_ready_claim: false });
}

function paymentReconciliationPending(operation) {
  return response(202, {
    outcome: "pending",
    provider_operation_state: operation.state,
    retryable: false,
    manual_reconciliation_required: false,
    production_ready_claim: false,
  });
}

function paymentReconciliationUnknown(claim) {
  return response(409, {
    outcome: "unknown_reconciliation_required",
    safe_error_code: HRX_PAYMENT_RECONCILIATION_MANUAL_REQUIRED,
    provider_operation_state: "unknown",
    idempotency_key: claim.plan.scope.idempotency_key,
    payload_hash: claim.plan.scope.payload_hash,
    retryable: false,
    manual_reconciliation_required: true,
    effectful_retry_blocked: true,
    production_ready_claim: false,
  });
}

function supportsReadOnlyReconciliationLookup(port) {
  return port?.recovery_lookup === "read_only_by_idempotency_key"
    && typeof port.lookup === "function";
}

function sameProviderOperationVersion(local, authoritative) {
  return local?.provider_operation_id === authoritative?.provider_operation_id
    && local?.request_hash === authoritative?.request_hash
    && local?.state === authoritative?.state
    && local?.state_version === authoritative?.state_version;
}

function paymentReconciliationRematerializationRequired() {
  const error = new Error("PostgreSQL bank checkpoint changed after HRX materialization");
  error.safe_error_code = "HRX_POSTGRES_BASELINE_CONFLICT";
  error.status = 409;
  PAYMENT_RECONCILIATION_REMATERIALIZATION_ERRORS.add(error);
  return error;
}

async function executePaymentReconciliation(runtime, context, {
  payment_batch_id: batchId,
  mode,
  body = {},
} = {}) {
  const current = runtime.paymentService.bundle(context, batchId);
  if (mode === "initial" && current.batch.state === "reconciled") {
    const payment = runtime.paymentService.reconcile(context, { payment_batch_id: batchId });
    return response(200, {
      outcome: "replayed",
      payment: Object.freeze({ ...payment, production_ready_claim: false }),
    });
  }
  if (mode === "retry" && !current.items.some((item) => item.state === "failed")) {
    const payment = runtime.paymentService.retryFailed(context, { payment_batch_id: batchId });
    return response(200, {
      outcome: "replayed",
      payment: Object.freeze({ ...payment, production_ready_claim: false }),
    });
  }
  const operatorRecovery = body?.confirm_unknown_reconciliation === true;
  if (!operatorRecovery && typeof runtime.bankReconciliationPort?.reconcile !== "function") {
    const error = new Error("Authoritative bank reconciliation provider is required");
    error.safe_error_code = "HRX_PAYROLL_BANK_PROVIDER_REQUIRED";
    error.status = 503;
    throw error;
  }
  const claimInput = Object.freeze({ payment_batch_id: batchId, mode });
  let checkpointClaim = null;
  let claim;
  if (runtime.bankReconciliationCheckpoint) {
    const prepared = runtime.paymentService.prepareReconciliationClaim(context, claimInput);
    if (prepared.status === "completed") {
      return response(200, {
        outcome: "replayed",
        payment: Object.freeze({ ...prepared.payment, production_ready_claim: false }),
      });
    }
    checkpointClaim = await runtime.bankReconciliationCheckpoint.claim(context, prepared);
    if (!checkpointClaim.should_execute
      && checkpointClaim.operation?.state === "in_progress") {
      checkpointClaim = await runtime.bankReconciliationCheckpoint.expire(context, prepared);
      if (checkpointClaim.operation?.state === "in_progress") {
        return paymentReconciliationPending(checkpointClaim.operation);
      }
    }
    if (!checkpointClaim.should_execute
      && !sameProviderOperationVersion(prepared.operation, checkpointClaim.operation)) {
      throw paymentReconciliationRematerializationRequired();
    }
    claim = runtime.paymentService.claimReconciliation(context, claimInput, {
      plan: prepared.plan,
    });
  } else {
    claim = runtime.paymentService.claimReconciliation(context, claimInput);
  }
  if (claim.status === "completed") {
    return response(200, {
      outcome: "replayed",
      payment: Object.freeze({ ...claim.payment, production_ready_claim: false }),
    });
  }
  const authoritativeOperation = checkpointClaim?.operation ?? claim.operation;
  const manualRequired = authoritativeOperation.state === "unknown"
    && authoritativeOperation.safe_error_code === HRX_PAYMENT_RECONCILIATION_MANUAL_REQUIRED;
  if (manualRequired) {
    let providerResult = operatorRecovery ? body : null;
    if (!providerResult && supportsReadOnlyReconciliationLookup(runtime.bankReconciliationPort)) {
      providerResult = await runtime.bankReconciliationPort.lookup({
        context,
        bundle: claim.plan.current,
        mode,
        ...claim.provider_request,
      });
    }
    if (!providerResult) return paymentReconciliationUnknown(claim);
    const validated = runtime.paymentService.validateReconciliationResult(context, claim, providerResult);
    if (runtime.bankReconciliationCheckpoint) {
      await runtime.bankReconciliationCheckpoint.stage(context, claim, validated);
    }
    const payment = runtime.paymentService.recoverReconciliation(
      context,
      claim,
      providerResult,
      validated,
    );
    return response(200, {
      outcome: payment.reconciliation_state,
      payment: Object.freeze({ ...payment, production_ready_claim: false }),
    });
  }
  if (operatorRecovery) {
    const error = new Error("Manual bank reconciliation is not required");
    error.safe_error_code = "HRX_PAYROLL_RECONCILIATION_RECOVERY_STATE_INVALID";
    error.status = 409;
    throw error;
  }
  if (checkpointClaim && !checkpointClaim.should_execute) {
    return paymentReconciliationPending(authoritativeOperation);
  }
  if (!claim.should_execute) return paymentReconciliationPending(claim.operation);

  let providerResult;
  try {
    providerResult = await runtime.bankReconciliationPort.reconcile({
      context,
      bundle: claim.plan.current,
      mode,
      ...claim.provider_request,
    });
  } catch (error) {
    if (runtime.bankReconciliationCheckpoint) {
      await runtime.bankReconciliationCheckpoint.fail(context, claim, error);
    }
    runtime.paymentService.failReconciliation(context, claim, error);
    throw error;
  }
  let payment;
  try {
    const validated = runtime.paymentService.validateReconciliationResult(context, claim, providerResult);
    if (runtime.bankReconciliationCheckpoint) {
      await runtime.bankReconciliationCheckpoint.stage(context, claim, validated);
    }
    payment = runtime.paymentService.settleReconciliation(context, claim, providerResult, validated);
  } catch (error) {
    if (runtime.bankReconciliationCheckpoint) {
      await runtime.bankReconciliationCheckpoint.fail(context, claim, error);
    }
    runtime.paymentService.failReconciliation(context, claim, error);
    throw error;
  }
  return response(200, {
    outcome: mode === "initial" ? "reconciled" : payment.reconciliation_state,
    payment: Object.freeze({ ...payment, production_ready_claim: false }),
  });
}

function payrollPresentationDirectory(store, context) {
  const employeeRecords = store.query("select", { table: "hrx_employees", where: { tenant_id: context.tenant_id } });
  const links = store.query("select", { table: "hrx_employee_user_links", where: { tenant_id: context.tenant_id } });
  const opaqueIdentifiers = [
    ...employeeRecords.map((row) => row.employee_id),
    ...links.map((row) => row.user_id),
  ].filter((value) => typeof value === "string" && value.trim());
  const displayNames = new Map(employeeRecords.map((row) => [
    row.employee_id,
    safeHumanDisplayName(row.display_name, MISSING_EMPLOYEE_DISPLAY_NAME, [
      ...opaqueIdentifiers,
      row.employee_id,
      ...links.filter((link) => link.employee_id === row.employee_id).map((link) => link.user_id),
    ]),
  ]));
  const actorDisplayName = (actorId) => {
    if (typeof actorId !== "string" || !actorId.trim()) return null;
    const matchingLinks = links.filter((link) => link.user_id === actorId);
    if (matchingLinks.length !== 1) return null;
    const employee = employeeRecords.find((row) => row.employee_id === matchingLinks[0].employee_id);
    if (!employee) return null;
    return safeHumanDisplayName(employee.display_name, null, [
      actorId,
      employee.employee_id,
      ...opaqueIdentifiers,
    ]);
  };
  return { displayNames, actorDisplayName };
}

function employeeRows(bundle, presentation) {
  const issues = new Map();
  for (const row of bundle.issues) {
    const values = issues.get(row.employee_id) ?? [];
    values.push({ ...row, details: parseJson(row.details_json, {}) });
    issues.set(row.employee_id, values);
  }
  const snapshots = new Map(bundle.snapshots.map((row) => [row.employee_id, row]));
  const resultByEmployee = new Map(bundle.results.map((row) => [row.employee_id, row]));
  const employeeIds = [...new Set([...snapshots.keys(), ...resultByEmployee.keys(), ...issues.keys()])].filter(Boolean).sort();
  return employeeIds.map((employeeId) => {
    const result = resultByEmployee.get(employeeId);
    const employeeIssues = issues.get(employeeId) ?? [];
    const priorVariance = employeeIssues.find((row) => row.issue_code === "PAYROLL_PRIOR_PERIOD_VARIANCE")?.details?.net_delta_krw ?? 0;
    return Object.freeze({
      employee_id: employeeId,
      result_id: result?.result_id ?? null,
      display_name: presentation.displayNames.get(employeeId) ?? MISSING_EMPLOYEE_DISPLAY_NAME,
      gross_krw: result?.gross_krw ?? 0,
      deduction_krw: result?.deduction_krw ?? 0,
      net_krw: result?.net_krw ?? 0,
      variance_krw: priorVariance,
      issue_count: employeeIssues.filter((row) => row.state === "open").length,
      blocker_count: employeeIssues.filter((row) => row.state === "open" && row.severity === "blocker").length,
      status: result ? "calculated" : "input",
    });
  });
}

function runBundle(runtime, store, context, runId) {
  const bundle = runtime.payrollRepository.getRunBundle(context, { run_id: runId });
  const presentation = payrollPresentationDirectory(store, context);
  const employees = employeeRows(bundle, presentation);
  const approvedByActorDisplayName = presentation.actorDisplayName(bundle.run.approved_by_actor_id);
  const totals = employees.reduce((sum, row) => ({
    gross_krw: sum.gross_krw + row.gross_krw,
    deduction_krw: sum.deduction_krw + row.deduction_krw,
    net_krw: sum.net_krw + row.net_krw,
    issue_count: sum.issue_count + row.issue_count,
  }), { gross_krw: 0, deduction_krw: 0, net_krw: 0, issue_count: 0 });
  return Object.freeze({
    ...bundle,
    snapshots: Object.freeze(bundle.snapshots.map((row) => ({
      snapshot_id: row.snapshot_id,
      run_id: row.run_id,
      employee_id: row.employee_id,
      source_refs: parseJson(row.source_refs_json, []),
      source_hash: row.source_hash,
      payable_minutes: row.payable_minutes,
      paid_leave_minutes: row.paid_leave_minutes,
      unpaid_leave_minutes: row.unpaid_leave_minutes,
      captured_at: row.captured_at,
    }))),
    run: Object.freeze({
      ...bundle.run,
      status_label: runStatusLabel(bundle.run.status),
      approved_by_actor_display_name: approvedByActorDisplayName,
    }),
    employees: Object.freeze(employees),
    totals: Object.freeze(totals),
    line_items: Object.freeze(bundle.line_items.map((row) => ({ ...row, metadata: parseJson(row.metadata_json, {}) }))),
    issues: Object.freeze(bundle.issues.map((row) => ({ ...row, details: parseJson(row.details_json, {}) }))),
    adjustments: runtime.payrollRepository.listAdjustments(context, { run_id: runId }),
    statements: runtime.documentService.list(context, { run_id: runId }),
    payment_batches: runtime.payrollRepository.listPaymentBatches(context, { run_id: runId }).map((batch) => Object.freeze({
      ...batch,
      items: runtime.payrollRepository.listPaymentItems(context, { payment_batch_id: batch.payment_batch_id }).map((item) => Object.freeze({
        payment_item_id: item.payment_item_id,
        employee_id: item.employee_id,
        amount_krw: item.amount_krw,
        state: item.state,
        provider_result_state: item.provider_result_state ?? (item.state === "paid" ? "succeeded" : item.state),
        safe_error_code: item.safe_error_code ?? null,
        attempt_count: item.attempt_count ?? 0,
        paid_at: item.paid_at ?? null,
        state_version: item.state_version,
        account_ref_included: false,
      })),
    })),
    filings: runtime.filingService.list(context, { run_id: runId }),
    year_end: runtime.yearEndService?.summary(context, { run_id: runId }) ?? null,
    audit_history: Object.freeze(runtime.payrollRepository.listAuditEvents(context, { object_id: runId }).map((event) => Object.freeze({
      event_id: event.event_id,
      action: event.action,
      actor_id: event.actor_id,
      actor_display_name: presentation.actorDisplayName(event.actor_id),
      occurred_at: event.occurred_at,
    }))),
  });
}

function workspace(runtime, store, context) {
  const periods = runtime.payrollRepository.listPeriods(context).map((period) => {
    const runs = runtime.payrollRepository.listRuns(context, { period_id: period.period_id }).map((run) => {
      const bundle = runBundle(runtime, store, context, run.run_id);
      return Object.freeze({ ...bundle.run, totals: bundle.totals, employee_count: bundle.employees.length });
    });
    return Object.freeze({ ...period, runs: Object.freeze(runs) });
  });
  return Object.freeze({ periods: Object.freeze(periods), production_ready_claim: false });
}

export function createHrxPayrollRuntimeRoute({ runtime, store, audit, clock = () => new Date().toISOString() } = {}) {
  if (!runtime || !store) return null;
  function appendProfileReadAudit(context, action, objectId, resultCount) {
    audit?.append?.({
      event_id: `hrx_payroll_profile_read_evt_${randomUUID()}`,
      tenant_id: context.tenant_id,
      actor_id: context.actor_id,
      action,
      object_type: "PayrollProfile",
      object_id: objectId,
      decision: "allow",
      reason: action === "hrx.payroll.self.read" ? "payroll_self_profile_read" : "payroll_profile_read",
      metadata: { result_count: resultCount, amount_included: false, encrypted_amount_ref_included: false },
    });
  }
  return Object.freeze({
    async handle(request = {}) {
      try {
        const context = request.context;
        const action = request.params?.action;
        if (action === "items") {
          if (request.method === "GET") return response(200, { outcome: "ok", items: runtime.itemCatalog.list(context, { include_inactive: request.query?.include_inactive === "true" }) });
          if (request.method === "POST") return response(201, { outcome: "created", item: runtime.itemCatalog.create(context, request.body) });
          if (request.method === "PATCH") return response(200, { outcome: "updated", item: runtime.itemCatalog.update(context, requiredString(request.params, "item_id"), request.body) });
        }
        if (action === "profile-self" || action === "profiles") {
          const employeeId = requiredString(request.params, "employee_id");
          const listed = runtime.profileService.listProfiles(context, {
            employee_id: employeeId,
            on_date: request.query?.on_date,
            include_history: request.query?.include_history === "true",
          });
          const profiles = listed.map((profile) => runtime.profileService.getProfile(context, profile.payroll_profile_id, {
            on_date: request.query?.on_date,
            include_history: request.query?.include_history === "true",
          }));
          appendProfileReadAudit(context, action === "profile-self" ? "hrx.payroll.self.read" : "hrx.payroll.profiles.read", employeeId, profiles.length);
          return response(200, { outcome: "ok", profiles });
        }
        if (request.method === "POST" && action === "profile-create") {
          return response(201, { outcome: "created", profile: runtime.profileService.createProfile(context, request.body) });
        }
        if (request.method === "PATCH" && action === "profile-update") {
          const pathProfileId = requiredString(request.params, "payroll_profile_id");
          const body = request.body && typeof request.body === "object" && !Array.isArray(request.body) ? request.body : {};
          if (Object.hasOwn(body, "payroll_profile_id") && body.payroll_profile_id !== pathProfileId) {
            const error = new Error("Payroll profile path and body identifiers must match");
            error.safe_error_code = "HRX_PAYROLL_PROFILE_ID_MISMATCH";
            error.status = 400;
            throw error;
          }
          return response(200, { outcome: "updated", profile: runtime.profileService.updateProfile(context, { ...body, payroll_profile_id: pathProfileId }) });
        }
        if (request.method === "POST" && action === "assignment-create") {
          return response(201, { outcome: "created", assignment: runtime.profileService.createAssignment(context, requiredString(request.params, "payroll_profile_id"), request.body) });
        }
        if (request.method === "POST" && action === "assignment-retire") {
          return response(200, { outcome: "retired", assignment: runtime.profileService.retireAssignment(context, requiredString(request.params, "payroll_profile_id"), requiredString(request.params, "assignment_id"), request.body) });
        }
        if (action === "rules-list" && request.method === "GET") {
          return response(200, { outcome: "ok", rules: runtime.allowanceRuleService.list(context) });
        }
        if (action === "rules-create" && request.method === "POST") {
          return response(201, { outcome: "created", rule: runtime.allowanceRuleService.createDraft(context, request.body) });
        }
        if (action === "rules-review" && request.method === "POST") {
          return response(200, { outcome: "reviewed", rule: runtime.allowanceRuleService.review(context, {
            rule_version_id: requiredString(request.params, "rule_version_id"),
            expected_version: request.body.expected_version,
          }) });
        }
        if (action === "rules-publish" && request.method === "POST") {
          if (context.step_up_verified !== true || context.step_up_purpose !== "payroll_export_review") {
            return response(403, { outcome: "blocked", safe_error_code: "HRX_STEP_UP_REQUIRED", step_up_required: true, required_purpose: "payroll_export_review", fail_closed: true });
          }
          return response(200, { outcome: "published", rule: runtime.allowanceRuleService.publish(context, {
            rule_version_id: requiredString(request.params, "rule_version_id"),
            expected_version: request.body.expected_version,
          }) });
        }
        if (action === "minimum-wage-list" && request.method === "GET") {
          return response(200, {
            outcome: "ok",
            standards: runtime.minimumWageService.list(context),
            permissions: Object.freeze({
              can_legal_approve: hasScope(context, "hrx.payroll.minimum_wage.legal_review"),
            }),
          });
        }
        if (action === "minimum-wage-create" && request.method === "POST") {
          return response(201, { outcome: "created", standard: runtime.minimumWageService.createDraft(context, request.body) });
        }
        if (action === "minimum-wage-legal-approve" && request.method === "POST") {
          if (!hasScope(context, "hrx.payroll.minimum_wage.legal_review")) {
            return response(403, {
              outcome: "blocked",
              safe_error_code: "HRX_MINIMUM_WAGE_LEGAL_REVIEW_SCOPE_REQUIRED",
              fail_closed: true,
            });
          }
          if (context.step_up_verified !== true || context.step_up_purpose !== "payroll_export_review") {
            return response(403, {
              outcome: "blocked",
              safe_error_code: "HRX_STEP_UP_REQUIRED",
              step_up_required: true,
              required_purpose: "payroll_export_review",
              fail_closed: true,
            });
          }
          return response(200, { outcome: "legal_approved", standard: runtime.minimumWageService.legallyApprove(context, {
            rule_version_id: requiredString(request.params, "rule_version_id"),
            expected_version: request.body.expected_version,
            legal_review_ref: request.body.legal_review_ref,
          }) });
        }
        if (action === "minimum-wage-review" && request.method === "POST") {
          return response(200, { outcome: "reviewed", standard: runtime.minimumWageService.review(context, {
            rule_version_id: requiredString(request.params, "rule_version_id"),
            expected_version: request.body.expected_version,
          }) });
        }
        if (action === "minimum-wage-publish" && request.method === "POST") {
          if (context.step_up_verified !== true || context.step_up_purpose !== "payroll_export_review") {
            return response(403, { outcome: "blocked", safe_error_code: "HRX_STEP_UP_REQUIRED", step_up_required: true, required_purpose: "payroll_export_review", fail_closed: true });
          }
          return response(200, { outcome: "published", standard: runtime.minimumWageService.publish(context, {
            rule_version_id: requiredString(request.params, "rule_version_id"),
            expected_version: request.body.expected_version,
          }) });
        }
        if (action === "minimum-wage-preview" && request.method === "POST") {
          let employees;
          if (runtime.minimumWageInputResolver?.resolve) {
            employees = await runtime.minimumWageInputResolver.resolve(context, {
              as_of: request.body.as_of,
            });
          } else if (runtime.provider_mode === "synthetic-test" && Array.isArray(request.body.employees)) {
            employees = request.body.employees;
          } else {
            return response(503, {
              outcome: "blocked",
              safe_error_code: "HRX_MINIMUM_WAGE_INPUT_SOURCE_REQUIRED",
              production_ready_claim: false,
            });
          }
          const employeeRecords = store.query("select", { table: "hrx_employees", where: { tenant_id: context.tenant_id } });
          const userIdByEmployeeId = new Map(
            store.query("select", { table: "hrx_employee_user_links", where: { tenant_id: context.tenant_id } })
              .map((link) => [link.employee_id, link.user_id]),
          );
          const displayNameByEmployeeId = new Map(
            employeeRecords.map((employee) => [
              employee.employee_id,
              publicEmployeeDisplayName({
                ...employee,
                user_id: userIdByEmployeeId.get(employee.employee_id),
              }, MISSING_EMPLOYEE_DISPLAY_NAME),
            ]),
          );
          employees = employees.map((employee) => ({
            ...employee,
            display_name: displayNameByEmployeeId.get(employee.employee_id) ?? MISSING_EMPLOYEE_DISPLAY_NAME,
          }));
          const report = runtime.minimumWageService.preview(context, {
            as_of: request.body.as_of,
            employees,
          });
          return response(200, {
            outcome: report.review_required_count > 0 ? "review_required" : "ok",
            impact: serializeMinimumWageImpact(report, { can_view_amounts: canViewPayrollAmounts(context) }),
          });
        }
        if (request.method === "POST" && action === "attendance-approve") {
          const approvalReceipt = runtime.timeInputService.recordAttendanceApproval(context, request.body);
          audit?.append?.({
            event_id: `hrx_payroll_time_evt_${randomUUID()}`,
            tenant_id: context.tenant_id,
            actor_id: context.actor_id,
            action: "hrx.payroll.attendance.approve",
            object_type: "AttendanceRecord",
            object_id: approvalReceipt.attendance_id,
            decision: "allow",
            reason: "attendance_approved_for_payroll",
            metadata: { payroll_calculation_runtime: false, disbursement_instruction_included: false },
          });
          return response(201, { outcome: "approved", approval_receipt: approvalReceipt });
        }
        if (request.method === "GET" && action === "dashboard-summary") {
          const summary = dashboardSummary(runtime, store, context, request.query?.month);
          audit?.append?.({
            event_id: `hrx_payroll_dashboard_evt_${randomUUID()}`,
            tenant_id: context.tenant_id,
            actor_id: context.actor_id,
            action: "hrx.payroll.dashboard_summary.read",
            object_type: "PayrollAggregate",
            object_id: request.query?.month ?? "invalid-month",
            decision: "allow",
            reason: "payroll_dashboard_aggregate_read",
            metadata: {
              result_count: summary ? 1 : 0,
              individual_values_included: false,
              individual_identifiers_included: false,
            },
          });
          return response(200, { outcome: summary ? "ok" : "empty", summary });
        }
        if (request.method === "GET" && action === "list") return response(200, { outcome: "ok", workspace: workspace(runtime, store, context) });
        if (request.method === "GET" && action === "bundle") {
          return response(200, { outcome: "ok", bundle: runBundle(runtime, store, context, requiredString(request.params, "run_id")) });
        }
        if (request.method === "GET" && action === "precheck") {
          if (!runtime.closePrecheckService) return response(404, { outcome: "blocked", safe_error_code: "HRX_PAYROLL_CLOSE_PRECHECK_DISABLED" });
          const report = runtime.closePrecheckService.evaluate(context, {
            run_id: requiredString(request.params, "run_id"),
            as_of: request.query?.as_of,
          });
          return response(200, {
            outcome: report.ready ? "ready" : "review_required",
            precheck: serializePayrollClosePrecheck(report, { can_view_details: context.can_view_payroll_details === true }),
          });
        }
        if (request.method === "POST" && action === "period-create") {
          let period = runtime.payrollRepository.createPeriod(context, request.body);
          if (request.body.open === true) period = runtime.payrollRepository.transitionPeriod(context, { period_id: period.period_id, status: "open", expected_version: period.state_version });
          return response(201, { outcome: "created", period });
        }
        if (request.method === "POST" && action === "run-create") {
          if (request.body.run_type === "adjustment") {
            const created = runtime.payrollRepository.createAdjustmentRun(context, request.body);
            return response(created.idempotent_replay ? 200 : 201, {
              outcome: created.idempotent_replay ? "replayed" : "created",
              run: created.run,
              adjustments: created.adjustments,
            });
          }
          const run = runtime.payrollRepository.createRun(context, request.body);
          return response(run.idempotent_replay ? 200 : 201, { outcome: run.idempotent_replay ? "replayed" : "created", run });
        }
        if (request.method === "POST" && action === "snapshot") {
          const capture = runtime.inputSnapshotService.capture(context, { ...request.body, run_id: requiredString(request.params, "run_id") });
          return response(200, { outcome: capture.ready ? "ready" : "review_required", capture, bundle: runBundle(runtime, store, context, capture.run.run_id) });
        }
        if (request.method === "POST" && action === "preview") {
          const runId = requiredString(request.params, "run_id");
          runtime.runService.preview(context, { ...request.body, run_id: runId });
          return response(200, { outcome: "previewed", bundle: runBundle(runtime, store, context, runId) });
        }
        if (request.method === "POST" && action === "issue-resolve") {
          const issue = runtime.payrollRepository.resolveIssue(context, {
            ...request.body,
            issue_id: requiredString(request.params, "issue_id"),
            state: request.body.state ?? "resolved",
            resolution_code: request.body.resolution_code ?? "REVIEWED_SOURCE_EVIDENCE",
          });
          return response(200, { outcome: "resolved", issue });
        }
        if (request.method === "POST" && action === "approve") {
          if (context.step_up_verified !== true || context.step_up_purpose !== "payroll_export_review") {
            return response(403, { outcome: "blocked", safe_error_code: "HRX_STEP_UP_REQUIRED", step_up_required: true, required_purpose: "payroll_export_review", fail_closed: true });
          }
          const runId = requiredString(request.params, "run_id");
          const now = clock();
          const receipt = createPayrollStepUpReceipt({
            receipt_ref: `artifact:step-up/payroll/${randomUUID()}`,
            actor_id: context.actor_id,
            action: "payroll.approve",
            object_id: runId,
            issued_at: now,
            expires_at: new Date(Date.parse(now) + 5 * 60_000).toISOString(),
          });
          runtime.runService.approve(context, { ...request.body, run_id: runId, step_up_receipt: receipt });
          return response(200, { outcome: "approved", bundle: runBundle(runtime, store, context, runId) });
        }
        if (request.method === "POST" && action === "close") {
          const runId = requiredString(request.params, "run_id");
          runtime.runService.close(context, { ...request.body, run_id: runId });
          return response(200, { outcome: "closed", bundle: runBundle(runtime, store, context, runId) });
        }
        if (request.method === "GET" && action === "statements-list") {
          const runId = requiredString(request.params, "run_id");
          return response(200, { outcome: "ok", statements: runtime.documentService.list(context, { run_id: runId }) });
        }
        if (request.method === "POST" && action === "statements-generate") {
          const generated = await runtime.documentService.generate(context, { ...request.body, run_id: requiredString(request.params, "run_id") });
          return response(200, { outcome: "generated", generated });
        }
        if (request.method === "GET" && action === "statement-export") {
          const artifact = await runtime.documentService.exportRegister(context, { run_id: requiredString(request.params, "run_id"), format: request.query?.format ?? "csv" });
          return response(200, { outcome: "exported", artifact });
        }
        if (request.method === "POST" && action === "statements-deliver") {
          const delivery = await runtime.documentService.deliver(context, { ...request.body, run_id: requiredString(request.params, "run_id") });
          return response(200, { outcome: delivery.overall_state, delivery });
        }
        if (request.method === "GET" && action === "statements-self") {
          const employeeId = selfEmployeeId(store, context);
          return response(200, { outcome: "ok", statements: runtime.documentService.selfList(context, { employee_id: employeeId }) });
        }
        if (request.method === "GET" && action === "statement-read") {
          const statement = await runtime.documentService.read(context, { employee_id: selfEmployeeId(store, context), statement_id: requiredString(request.params, "statement_id") });
          return response(200, { outcome: "ok", artifact: statement });
        }
        if (request.method === "POST" && action === "statement-revoke") {
          const statement = runtime.documentService.revoke(context, { statement_id: requiredString(request.params, "statement_id") });
          return response(200, { outcome: "revoked", statement });
        }
        if (request.method === "POST" && action === "payment-prepare") {
          const payment = runtime.paymentService.prepare(context, { ...request.body, run_id: requiredString(request.params, "run_id") });
          return response(200, { outcome: "prepared", payment: Object.freeze({ ...payment, production_ready_claim: false }) });
        }
        if (request.method === "GET" && action === "payment-bundle") {
          return response(200, { outcome: "ok", payment: paymentBundle(runtime, context, requiredString(request.params, "payment_batch_id")) });
        }
        if (request.method === "POST" && action === "payment-approve") {
          if (context.step_up_verified !== true || context.step_up_purpose !== "payroll_payment_processing") {
            return response(403, { outcome: "blocked", safe_error_code: "HRX_STEP_UP_REQUIRED", step_up_required: true, required_purpose: "payroll_payment_processing", fail_closed: true });
          }
          const batchId = requiredString(request.params, "payment_batch_id");
          const now = clock();
          const receipt = createPayrollStepUpReceipt({ receipt_ref: `artifact:step-up/payroll-payment/${randomUUID()}`, actor_id: context.actor_id, action: "payroll.payment.approve", object_id: batchId, issued_at: now, expires_at: new Date(Date.parse(now) + 5 * 60_000).toISOString() });
          const payment = runtime.paymentService.approve(context, { ...request.body, payment_batch_id: batchId, step_up_receipt: receipt });
          return response(200, { outcome: "approved", payment: Object.freeze({ ...payment, production_ready_claim: false }) });
        }
        if (request.method === "POST" && action === "payment-export") {
          const artifact = await runtime.paymentService.exportBatch(context, { ...request.body, payment_batch_id: requiredString(request.params, "payment_batch_id") });
          return response(200, { outcome: "exported", artifact });
        }
        if (request.method === "POST" && action === "payment-reconcile") {
          return await executePaymentReconciliation(runtime, context, {
            payment_batch_id: requiredString(request.params, "payment_batch_id"),
            mode: "initial",
            body: request.body,
          });
        }
        if (request.method === "POST" && action === "payment-retry-failed") {
          return await executePaymentReconciliation(runtime, context, {
            payment_batch_id: requiredString(request.params, "payment_batch_id"),
            mode: "retry",
            body: request.body,
          });
        }
        if (request.method === "GET" && action === "filing-list") {
          const runId = requiredString(request.params, "run_id");
          return response(200, { outcome: "ok", filings: runtime.filingService.list(context, { run_id: runId }) });
        }
        if (request.method === "POST" && action === "filing-create") {
          const filingKind = requiredString(request.body, "filing_kind");
          const runId = requiredString(request.params, "run_id");
          const filing = await runtime.filingService.createPackage(context, {
            ...request.body,
            run_id: runId,
            schema_version: request.body.schema_version ?? SYNTHETIC_PAYROLL_FILING_SCHEMAS[filingKind],
          });
          return response(200, { outcome: "created", filing });
        }
        if (request.method === "POST" && action === "year-end-collect") {
          const runId = requiredString(request.params, "run_id");
          return response(200, { outcome: "collected", year_end: runtime.yearEndService.collectRun(context, { ...request.body, run_id: runId }) });
        }
        if (request.method === "POST" && action === "year-end-calculate") {
          const runId = requiredString(request.params, "run_id");
          return response(200, { outcome: "calculated", year_end: runtime.yearEndService.calculateRun(context, { ...request.body, run_id: runId }) });
        }
        if (request.method === "POST" && action === "year-end-review") {
          if (context.step_up_verified !== true || context.step_up_purpose !== "payroll_year_end_review") {
            return response(403, { outcome: "blocked", safe_error_code: "HRX_STEP_UP_REQUIRED", step_up_required: true, required_purpose: "payroll_year_end_review", fail_closed: true });
          }
          const runId = requiredString(request.params, "run_id");
          const reviewReceiptRef = `artifact:step-up/payroll-year-end/${randomUUID()}`;
          return response(200, { outcome: "reviewed", year_end: runtime.yearEndService.reviewRun(context, { ...request.body, run_id: runId, review_receipt_ref: reviewReceiptRef }) });
        }
        if (request.method === "POST" && action === "filing-validate") {
          const filing = runtime.filingService.validate(context, { ...request.body, filing_job_id: requiredString(request.params, "filing_job_id") });
          return response(200, { outcome: "validated", filing });
        }
        if (request.method === "POST" && action === "filing-submit") {
          const submission = await runtime.filingService.submit(context, { ...request.body, filing_job_id: requiredString(request.params, "filing_job_id") });
          return response(200, { outcome: submission.job.state, submission });
        }
        if (request.method === "POST" && action === "filing-correct") {
          const filing = await runtime.filingService.correct(context, { ...request.body, filing_job_id: requiredString(request.params, "filing_job_id") });
          return response(200, { outcome: "corrected", filing });
        }
        return response(405, { outcome: "blocked", safe_error_code: "METHOD_NOT_ALLOWED" });
      } catch (error) {
        if (PAYMENT_RECONCILIATION_REMATERIALIZATION_ERRORS.has(error)) throw error;
        return safeError(error, request.params?.action);
      }
    },
  });
}
