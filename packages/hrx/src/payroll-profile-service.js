import { randomUUID } from "node:crypto";
import { createSqlHrxAuditEventStore } from "../../audit/src/hrx-event-store-sql.js";
import { encryptCompensationAmount, maskCompensationRef } from "./compensation.js";
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

function visibleAssignment(row) {
  return Object.freeze({
    tenant_id: row.tenant_id,
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
    source_ref: row.source_ref,
    created_at: row.created_at,
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
    return Object.freeze(
      store
        .query("select", {
          table: "hrx_payroll_item_assignments",
          where: { tenant_id: context.tenant_id, payroll_profile_id: currentProfile.payroll_profile_id },
        })
        .filter((row) => options.include_history === true || activeOn(row, onDate))
        .sort((left, right) => right.effective_from.localeCompare(left.effective_from) || right.version - left.version)
        .map(visibleAssignment),
    );
  }

  return Object.freeze({
    createProfile(context = {}, input = {}) {
      return profiles.createProfile(actorContext(context), input);
    },
    updateProfile(context = {}, input = {}) {
      return profiles.updateProfile(actorContext(context), input);
    },
    listProfiles(contextInput = {}, options = {}) {
      const context = actorContext(contextInput);
      const onDate = options.on_date ? isoDate(options, "on_date") : clock().slice(0, 10);
      return Object.freeze(
        profiles
          .listProfiles(context, options)
          .filter((row) => options.include_history === true || activeOn(row, onDate))
          .sort((left, right) => right.effective_from.localeCompare(left.effective_from))
          .map((row) => Object.freeze(clone(row))),
      );
    },
    getProfile(contextInput = {}, profileId, options = {}) {
      const context = actorContext(contextInput);
      const row = profile(store, context.tenant_id, requiredString({ payroll_profile_id: profileId }, "payroll_profile_id"));
      return Object.freeze({
        ...clone(row),
        assignments: listAssignments(context, row.payroll_profile_id, options),
      });
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
        const conflict = tx
          .query("select", {
            table: "hrx_payroll_item_assignments",
            where: {
              tenant_id: context.tenant_id,
              employee_id: currentProfile.employee_id,
              item_id: currentItem.item_id,
            },
          })
          .find((existing) => overlaps(existing, candidate));
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
    listAssignments,
  });
}
