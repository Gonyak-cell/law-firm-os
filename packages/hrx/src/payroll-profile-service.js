import { randomUUID } from "node:crypto";
import { createSqlHrxAuditEventStore } from "../../audit/src/hrx-event-store-sql.js";
import { compensationCoversPeriod, encryptCompensationAmount, maskCompensationRef } from "./compensation.js";
import { createPayrollRepository } from "./payroll/repository.js";

const ASSIGNMENT_STATUSES = Object.freeze(["active", "inactive"]);

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function isoDate(input, field, { optional = false } = {}) {
  const value = input?.[field];
  if (optional && (value === undefined || value === null || value === "")) return null;
  const date = requiredString(input, field);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) {
    throw new TypeError(`${field} must be an ISO date`);
  }
  return date;
}

function dateRange(input) {
  const effective_from = isoDate(input, "effective_from");
  const effective_to = isoDate(input, "effective_to", { optional: true });
  if (effective_to && effective_to < effective_from) throw new TypeError("effective_to must not precede effective_from");
  return Object.freeze({ effective_from, effective_to });
}

function overlaps(left, right) {
  return left.effective_from <= (right.effective_to ?? "9999-12-31")
    && right.effective_from <= (left.effective_to ?? "9999-12-31");
}

function activeOn(row, onDate) {
  return row.status === "active" && row.effective_from <= onDate && (!row.effective_to || row.effective_to >= onDate);
}

/**
 * Retirements are append-only rows that carry the same encrypted reference as
 * the assignment they close.  Keep that reference internal and use it as the
 * exact lineage key when resolving an as-of view.  This prevents a retirement
 * tombstone for an open-ended v1 from shadowing an independently scheduled v2
 * that starts in the future.
 */
function visibleActiveAssignments(rows, onDate) {
  const inForce = rows
    .filter((row) => row.effective_from <= onDate && (!row.effective_to || row.effective_to >= onDate))
    .sort((left, right) => right.version - left.version || right.effective_from.localeCompare(left.effective_from));
  const inactiveLineages = new Set(
    inForce
      .filter((row) => row.status === "inactive")
      .map((row) => row.encrypted_amount_ref)
      .filter(Boolean),
  );
  return inForce
    .filter((row) => row.status === "active" && !inactiveLineages.has(row.encrypted_amount_ref));
}

function positiveVersion(input) {
  if (!Number.isInteger(input?.version) || input.version < 1) throw new TypeError("version must be a positive integer");
  return input.version;
}

function assignmentStatus(input) {
  const value = input?.status ?? "active";
  if (!ASSIGNMENT_STATUSES.includes(value)) throw new TypeError(`status must be one of ${ASSIGNMENT_STATUSES.join(", ")}`);
  return value;
}

function actorContext(input = {}) {
  return Object.freeze({
    tenant_id: requiredString(input, "tenant_id"),
    actor_id: requiredString(input, "actor_id"),
  });
}

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function guardedError(message, safeErrorCode, status = 400) {
  const error = new Error(message);
  error.safe_error_code = safeErrorCode;
  error.status = status;
  return error;
}

function compensationIdFromRef(value) {
  const ref = requiredString({ compensation_ref: value }, "compensation_ref");
  if (!ref.startsWith("compensation:") || ref.length === "compensation:".length) {
    throw guardedError("A tenant compensation record is required", "HRX_PAYROLL_COMPENSATION_REF_INVALID");
  }
  let compensationId;
  try {
    compensationId = decodeURIComponent(ref.slice("compensation:".length));
  } catch {
    throw guardedError("A tenant compensation record is required", "HRX_PAYROLL_COMPENSATION_REF_INVALID");
  }
  if (!compensationId.trim()) {
    throw guardedError("A tenant compensation record is required", "HRX_PAYROLL_COMPENSATION_REF_INVALID");
  }
  return compensationId;
}

function assertCompensationRecord(tx, { tenantId, employeeId, compensationRef, profileRange = null }) {
  const compensationId = compensationIdFromRef(compensationRef);
  const record = tx.query("selectOne", {
    table: "hrx_compensation_records",
    where: { tenant_id: tenantId, compensation_id: compensationId },
  });
  if (!record) {
    throw guardedError("선택한 구성원의 급여 기록을 찾을 수 없습니다", "HRX_PAYROLL_COMPENSATION_RECORD_MISSING", 400);
  }
  if (record.employee_id !== employeeId) {
    throw guardedError("다른 구성원의 급여 기록은 연결할 수 없습니다", "HRX_PAYROLL_COMPENSATION_EMPLOYEE_MISMATCH", 400);
  }
  if (profileRange && !compensationCoversPeriod(record, profileRange.effective_from, profileRange.effective_to)) {
    throw guardedError("급여 방식 시행일이 급여 기록 적용 기간과 맞지 않습니다", "HRX_PAYROLL_COMPENSATION_PERIOD_MISMATCH", 400);
  }
  return record;
}

function assertDeductionInput(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw guardedError("공제 정보 형식이 올바르지 않습니다", "HRX_PAYROLL_DEDUCTION_INPUT_INVALID", 400);
  }
  if (!Number.isSafeInteger(value.dependent_count) || value.dependent_count < 0) {
    throw guardedError("부양가족 수를 확인해 주세요", "HRX_PAYROLL_DEDUCTION_INPUT_INVALID", 400);
  }
  if (typeof value.income_tax_exempt !== "boolean") {
    throw guardedError("소득세 비과세 여부를 선택해 주세요", "HRX_PAYROLL_DEDUCTION_INPUT_INVALID", 400);
  }
  for (const field of ["pension", "health", "employment_insurance"]) {
    if (!value[field] || typeof value[field] !== "object" || typeof value[field].enrolled !== "boolean") {
      throw guardedError("4대 보험 가입 여부를 모두 선택해 주세요", "HRX_PAYROLL_DEDUCTION_INPUT_INVALID", 400);
    }
    if (Object.hasOwn(value[field], "contribution_base_krw") && (!Number.isSafeInteger(value[field].contribution_base_krw) || value[field].contribution_base_krw < 0)) {
      throw guardedError("보험료 산정 기준금액을 확인해 주세요", "HRX_PAYROLL_DEDUCTION_INPUT_INVALID", 400);
    }
  }
  if (value.withholding_category !== undefined && value.withholding_category !== null && typeof value.withholding_category !== "string") {
    throw guardedError("원천징수 구분을 확인해 주세요", "HRX_PAYROLL_DEDUCTION_INPUT_INVALID", 400);
  }
}

function visibleAssignment(row) {
  return Object.freeze({
    assignment_id: row.assignment_id,
    payroll_profile_id: row.payroll_profile_id,
    employee_id: row.employee_id,
    item_id: row.item_id,
    version: row.version,
    masked_compensation_ref: maskCompensationRef(row.encrypted_amount_ref),
    encrypted_amount_ref_included: false,
    raw_amount_included: false,
    currency_ref: row.currency_ref,
    effective_from: row.effective_from,
    effective_to: row.effective_to,
    status: row.status,
  });
}

function visibleProfile(row, assignments = []) {
  return Object.freeze({
    payroll_profile_id: row.payroll_profile_id,
    employee_id: row.employee_id,
    employment_type: row.employment_type,
    pay_group_code: row.pay_group_code,
    currency: row.currency,
    compensation_unit: row.compensation_unit,
    compensation_quantity: row.compensation_quantity,
    effective_from: row.effective_from,
    effective_to: row.effective_to,
    status: row.status,
    state_version: row.state_version,
    assignments: Object.freeze(assignments.map((assignment) => Object.freeze({ ...assignment }))),
  });
}

export function createSqlPayrollProfileService({
  store,
  clock = () => new Date().toISOString(),
  idFactory = (prefix) => `${prefix}_${randomUUID()}`,
  encryptionOptions = {},
} = {}) {
  if (!store || typeof store.query !== "function" || typeof store.transaction !== "function") {
    throw new TypeError("payroll profile service requires a transactional store");
  }
  const profiles = createPayrollRepository({ store, clock, idFactory });

  function profile(tx, tenantId, profileId) {
    const row = tx.query("selectOne", {
      table: "hrx_payroll_profiles",
      where: { tenant_id: tenantId, payroll_profile_id: profileId },
    });
    if (!row) throw guardedError("Payroll profile not found", "HRX_PAYROLL_PROFILE_NOT_FOUND", 404);
    return row;
  }

  function item(tx, tenantId, itemId) {
    const row = tx.query("selectOne", {
      table: "hrx_payroll_items",
      where: { tenant_id: tenantId, item_id: itemId },
    });
    if (!row) throw guardedError("Payroll item not found", "HRX_PAYROLL_ITEM_NOT_FOUND", 404);
    return row;
  }

  function listAssignments(contextInput = {}, profileId, options = {}) {
    const context = actorContext(contextInput);
    const currentProfile = profile(store, context.tenant_id, requiredString({ payroll_profile_id: profileId }, "payroll_profile_id"));
    const onDate = options.on_date ? isoDate(options, "on_date") : clock().slice(0, 10);
    const all = store
      .query("select", {
        table: "hrx_payroll_item_assignments",
        where: { tenant_id: context.tenant_id, payroll_profile_id: currentProfile.payroll_profile_id },
      })
      .sort((left, right) => right.version - left.version || right.effective_from.localeCompare(left.effective_from));
    if (options.include_history === true) return Object.freeze(all.map(visibleAssignment));
    const byItem = new Map();
    for (const row of all) {
      const rowsForItem = byItem.get(row.item_id) ?? [];
      rowsForItem.push(row);
      byItem.set(row.item_id, rowsForItem);
    }
    const currentRows = [];
    for (const rowsForItem of byItem.values()) {
      const selected = visibleActiveAssignments(rowsForItem, onDate)[0];
      if (selected) currentRows.push(selected);
    }
    return Object.freeze(currentRows.sort((left, right) => right.effective_from.localeCompare(left.effective_from)).map(visibleAssignment));
  }

  return Object.freeze({
    createProfile(context = {}, input = {}) {
      const actor = actorContext(context);
      const payload = { ...input };
      const profileRange = dateRange(payload);
      assertCompensationRecord(store, {
        tenantId: actor.tenant_id,
        employeeId: requiredString(payload, "employee_id"),
        compensationRef: payload.compensation_ref,
        profileRange,
      });
      if (!Object.hasOwn(payload, "deduction_input") || !payload.deduction_input) {
        throw guardedError("공제 정보를 입력한 뒤 급여 방식을 저장해 주세요", "HRX_PAYROLL_DEDUCTION_INPUT_REQUIRED", 400);
      }
      assertDeductionInput(payload.deduction_input);
      return visibleProfile(profiles.createProfile(actor, payload));
    },
    updateProfile(context = {}, input = {}) {
      const actor = actorContext(context);
      const current = store.query("selectOne", {
        table: "hrx_payroll_profiles",
        where: { tenant_id: actor.tenant_id, payroll_profile_id: requiredString(input, "payroll_profile_id") },
      });
      if (!current) throw guardedError("Payroll profile not found", "HRX_PAYROLL_PROFILE_NOT_FOUND", 404);
      const employeeId = current.employee_id;
      const compensationRef = input.compensation_ref ?? current.compensation_ref;
      const profileRange = dateRange({
        effective_from: current.effective_from,
        effective_to: Object.hasOwn(input, "effective_to") ? input.effective_to : current.effective_to,
      });
      assertCompensationRecord(store, { tenantId: actor.tenant_id, employeeId, compensationRef, profileRange });
      if ((Object.hasOwn(input, "deduction_input") && !input.deduction_input) || (!Object.hasOwn(input, "deduction_input") && !current.deduction_input_json)) {
        throw guardedError("공제 정보를 입력한 뒤 급여 방식을 저장해 주세요", "HRX_PAYROLL_DEDUCTION_INPUT_REQUIRED", 400);
      }
      if (Object.hasOwn(input, "deduction_input")) assertDeductionInput(input.deduction_input);
      return visibleProfile(profiles.updateProfile(actor, input));
    },
    listProfiles(contextInput = {}, options = {}) {
      const context = actorContext(contextInput);
      const onDate = options.on_date ? isoDate(options, "on_date") : clock().slice(0, 10);
      return Object.freeze(
        profiles
          .listProfiles(context, options)
          .filter((row) => options.include_history === true || activeOn(row, onDate))
          .sort((left, right) => right.effective_from.localeCompare(left.effective_from))
          .map((row) => visibleProfile(row)),
      );
    },
    getProfile(contextInput = {}, profileId, options = {}) {
      const context = actorContext(contextInput);
      const row = profile(store, context.tenant_id, requiredString({ payroll_profile_id: profileId }, "payroll_profile_id"));
      return visibleProfile(row, listAssignments(context, row.payroll_profile_id, options));
    },
    createAssignment(contextInput = {}, profileId, input = {}) {
      const context = actorContext(contextInput);
      if (input.tenant_id && input.tenant_id !== context.tenant_id) {
        throw guardedError("Payroll assignment tenant mismatch", "HRX_PAYROLL_TENANT_MISMATCH");
      }
      const range = dateRange(input);
      const row = store.transaction((tx) => {
        const currentProfile = profile(
          tx,
          context.tenant_id,
          requiredString({ payroll_profile_id: profileId }, "payroll_profile_id"),
        );
        const currentItem = item(tx, context.tenant_id, requiredString(input, "item_id"));
        if (currentProfile.status !== "active") throw guardedError("Payroll profile is inactive", "HRX_PAYROLL_PROFILE_INACTIVE");
        if (currentItem.status !== "active") throw guardedError("Payroll item is inactive", "HRX_PAYROLL_ITEM_INACTIVE");
        if (
          range.effective_from < currentProfile.effective_from
          || currentProfile.effective_to && (!range.effective_to || range.effective_to > currentProfile.effective_to)
        ) {
          throw guardedError("Assignment must be within the payroll profile period", "HRX_PAYROLL_ASSIGNMENT_PROFILE_PERIOD");
        }
        if (
          range.effective_from < currentItem.effective_from
          || currentItem.effective_to && (!range.effective_to || range.effective_to > currentItem.effective_to)
        ) {
          throw guardedError("Assignment must be within the payroll item period", "HRX_PAYROLL_ASSIGNMENT_ITEM_PERIOD");
        }
        const assignmentId = input.assignment_id ?? idFactory("payroll_assignment");
        const expectedCurrency = `Currency:${currentProfile.currency}`;
        const currencyRef = input.currency_ref ?? expectedCurrency;
        if (currencyRef !== expectedCurrency) {
          throw guardedError("Assignment currency must match profile", "HRX_PAYROLL_ASSIGNMENT_CURRENCY_MISMATCH");
        }
        const candidate = {
          tenant_id: context.tenant_id,
          assignment_id: assignmentId,
          payroll_profile_id: currentProfile.payroll_profile_id,
          employee_id: currentProfile.employee_id,
          item_id: currentItem.item_id,
          version: positiveVersion(input),
          encrypted_amount_ref: encryptCompensationAmount({
            tenant_id: context.tenant_id,
            employee_id: currentProfile.employee_id,
            compensation_id: assignmentId,
            amount_minor: input.amount_minor,
            currency_ref: currencyRef,
          }, encryptionOptions),
          currency_ref: currencyRef,
          ...range,
          status: assignmentStatus(input),
          source_ref: requiredString(input, "source_ref"),
          raw_amount_included: 0,
          created_at: clock(),
        };
        const existingAssignments = tx.query("select", {
          table: "hrx_payroll_item_assignments",
          where: {
            tenant_id: context.tenant_id,
            employee_id: currentProfile.employee_id,
            item_id: currentItem.item_id,
          },
        });
        const latest = existingAssignments.reduce((selected, existing) => (
          !selected || existing.version > selected.version ? existing : selected
        ), null);
        const conflict = latest?.status === "active" && overlaps(latest, candidate) ? latest : null;
        if (conflict) {
          throw guardedError("Payroll item assignment effective dates overlap", "HRX_PAYROLL_ASSIGNMENT_PERIOD_OVERLAP", 409);
        }
        const inserted = tx.query("insert", { table: "hrx_payroll_item_assignments", row: candidate });
        createSqlHrxAuditEventStore({ store: tx }).append({
          event_id: idFactory("hrx_payroll_assignment_evt"),
          tenant_id: context.tenant_id,
          actor_id: context.actor_id,
          action: "hrx.payroll.assignment.create",
          object_type: "PayrollItemAssignment",
          object_id: inserted.assignment_id,
          decision: "allow",
          reason: "payroll_item_assignment_created",
          occurred_at: clock(),
          metadata: {
            employee_id: inserted.employee_id,
            item_id: inserted.item_id,
            version: inserted.version,
            effective_from: inserted.effective_from,
            effective_to: inserted.effective_to,
            raw_amount_included: false,
            encrypted_amount_ref_included: false,
          },
        });
        return inserted;
      });
      return visibleAssignment(row);
    },
    retireAssignment(contextInput = {}, profileId, assignmentId, input = {}) {
      const context = actorContext(contextInput);
      const currentProfile = profile(store, context.tenant_id, requiredString({ payroll_profile_id: profileId }, "payroll_profile_id"));
      const currentAssignmentId = requiredString({ assignment_id: assignmentId }, "assignment_id");
      const expectedVersion = positiveVersion({ version: input.expected_version ?? input.version });
      const row = store.transaction((tx) => {
        const current = tx.query("selectOne", {
          table: "hrx_payroll_item_assignments",
          where: {
            tenant_id: context.tenant_id,
            assignment_id: currentAssignmentId,
            payroll_profile_id: currentProfile.payroll_profile_id,
          },
        });
        if (!current) throw guardedError("Payroll item assignment not found", "HRX_PAYROLL_ASSIGNMENT_NOT_FOUND", 404);
        if (current.version !== expectedVersion) throw guardedError("Payroll item assignment version conflict", "HRX_STATE_VERSION_CONFLICT", 409);
        if (current.status !== "active") throw guardedError("Payroll item assignment is already inactive", "HRX_PAYROLL_ASSIGNMENT_INACTIVE", 409);
        const today = clock().slice(0, 10);
        const assignmentsForItem = tx.query("select", {
          table: "hrx_payroll_item_assignments",
          where: { tenant_id: context.tenant_id, employee_id: current.employee_id, item_id: current.item_id },
        });
        const currentAssignment = visibleActiveAssignments(assignmentsForItem, today)[0];
        if (!currentAssignment || currentAssignment.assignment_id !== current.assignment_id) {
          throw guardedError("현재 적용 중인 급여 항목만 종료할 수 있습니다", "HRX_PAYROLL_ASSIGNMENT_NOT_CURRENT", 409);
        }
        const latestVersion = Math.max(
          current.version,
          ...assignmentsForItem.map((candidate) => Number(candidate.version) || 0),
        );
        const retirementFrom = current.effective_from > today ? current.effective_from : today;
        const retirementTo = current.effective_to && current.effective_to >= retirementFrom ? current.effective_to : null;
        const retired = {
          ...current,
          assignment_id: idFactory("payroll_assignment_retire"),
          version: latestVersion + 1,
          status: "inactive",
          effective_from: retirementFrom,
          effective_to: retirementTo,
          source_ref: `${current.source_ref}:retired:v${latestVersion + 1}`,
          created_at: clock(),
        };
        const inserted = tx.query("insert", { table: "hrx_payroll_item_assignments", row: retired });
        createSqlHrxAuditEventStore({ store: tx }).append({
          event_id: idFactory("hrx_payroll_assignment_evt"),
          tenant_id: context.tenant_id,
          actor_id: context.actor_id,
          action: "hrx.payroll.assignment.retire",
          object_type: "PayrollItemAssignment",
          object_id: inserted.assignment_id,
          decision: "allow",
          reason: "payroll_item_assignment_retired",
          occurred_at: clock(),
          metadata: {
            employee_id: inserted.employee_id,
            item_id: inserted.item_id,
            supersedes_assignment_id: current.assignment_id,
            version: inserted.version,
            raw_amount_included: false,
            encrypted_amount_ref_included: false,
          },
        });
        return inserted;
      });
      return visibleAssignment(row);
    },
    listAssignments,
  });
}
