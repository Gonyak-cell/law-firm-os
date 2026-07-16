import { randomUUID } from "node:crypto";

const ITEM_KINDS = Object.freeze(["earning", "deduction"]);
const TAX_TREATMENTS = Object.freeze(["taxable", "non_taxable"]);
const VALUE_MODES = Object.freeze(["fixed", "variable"]);
const ITEM_STATUSES = Object.freeze(["active", "inactive"]);

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function enumValue(input, field, allowed) {
  const value = requiredString(input, field);
  if (!allowed.includes(value)) throw new TypeError(`${field} must be one of ${allowed.join(", ")}`);
  return value;
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

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function requireTenant(context = {}) {
  return requiredString(context, "tenant_id");
}

export function createPayrollItem(input = {}) {
  const calculationOrder = input.calculation_order;
  if (!Number.isInteger(calculationOrder) || calculationOrder < 0) {
    throw new TypeError("calculation_order must be a non-negative integer");
  }
  const effectiveFrom = isoDate(input, "effective_from");
  const effectiveTo = isoDate(input, "effective_to", { optional: true });
  if (effectiveTo && effectiveTo < effectiveFrom) throw new TypeError("effective_to must not precede effective_from");
  return Object.freeze({
    tenant_id: requiredString(input, "tenant_id"),
    item_id: requiredString(input, "item_id"),
    code: requiredString(input, "code").toUpperCase(),
    display_name: requiredString(input, "display_name"),
    kind: enumValue(input, "kind", ITEM_KINDS),
    tax_treatment: enumValue(input, "tax_treatment", TAX_TREATMENTS),
    value_mode: enumValue(input, "value_mode", VALUE_MODES),
    calculation_order: calculationOrder,
    effective_from: effectiveFrom,
    effective_to: effectiveTo,
    status: enumValue({ status: input.status ?? "active" }, "status", ITEM_STATUSES),
  });
}

export function createInMemoryPayrollItemCatalog(seed = []) {
  const records = new Map();
  const key = (tenantId, itemId) => `${tenantId}:${itemId}`;

  function create(input) {
    const item = createPayrollItem(input);
    const itemKey = key(item.tenant_id, item.item_id);
    if (records.has(itemKey)) throw new Error(`Duplicate payroll item: ${item.item_id}`);
    const duplicateCode = [...records.values()].some(
      (candidate) => candidate.tenant_id === item.tenant_id && candidate.code === item.code,
    );
    if (duplicateCode) throw new Error(`Duplicate payroll item code: ${item.code}`);
    records.set(itemKey, clone(item));
    return Object.freeze(clone(item));
  }

  for (const item of seed) create(item);

  return Object.freeze({
    create(context, input = {}) {
      const tenantId = requireTenant(context);
      if (input.tenant_id && input.tenant_id !== tenantId) throw new Error("Payroll item tenant mismatch");
      return create({ ...input, tenant_id: tenantId });
    },
    get(context, itemId) {
      const tenantId = requireTenant(context);
      const item = records.get(key(tenantId, requiredString({ itemId }, "itemId")));
      return item ? Object.freeze(clone(item)) : undefined;
    },
    list(context, { include_inactive = false } = {}) {
      const tenantId = requireTenant(context);
      return Object.freeze(
        [...records.values()]
          .filter((item) => item.tenant_id === tenantId && (include_inactive || item.status === "active"))
          .sort((left, right) => left.calculation_order - right.calculation_order || left.code.localeCompare(right.code))
          .map((item) => Object.freeze(clone(item))),
      );
    },
  });
}

export function createSqlPayrollItemCatalog({ store, audit, clock = () => new Date().toISOString() } = {}) {
  if (!store || typeof store.query !== "function") throw new TypeError("payroll item catalog requires store.query");

  function context(input = {}) {
    return Object.freeze({ tenant_id: requireTenant(input), actor_id: requiredString(input, "actor_id") });
  }

  function appendAudit(actor, action, item, reason) {
    if (!audit || typeof audit.append !== "function") return;
    audit.append({
      event_id: `hrx_payroll_item_evt_${randomUUID()}`,
      tenant_id: actor.tenant_id,
      actor_id: actor.actor_id,
      action,
      object_type: "PayrollItem",
      object_id: item.item_id,
      decision: "allow",
      reason,
      metadata: { code: item.code, kind: item.kind, state_version: item.state_version },
    });
  }

  return Object.freeze({
    list(input = {}, { include_inactive = false } = {}) {
      const actor = context(input);
      return Object.freeze(
        store
          .query("select", { table: "hrx_payroll_items", where: { tenant_id: actor.tenant_id } })
          .filter((item) => include_inactive || item.status === "active")
          .sort((left, right) => left.calculation_order - right.calculation_order || left.code.localeCompare(right.code))
          .map((item) => Object.freeze(clone(item))),
      );
    },
    create(input = {}, itemInput = {}) {
      const actor = context(input);
      const item = createPayrollItem({ ...itemInput, tenant_id: actor.tenant_id });
      const now = clock();
      const created = store.query("insert", {
        table: "hrx_payroll_items",
        row: { ...item, state_version: 1, created_at: now, updated_at: now },
      });
      appendAudit(actor, "hrx.payroll.items.create", created, "payroll_item_created");
      return Object.freeze(clone(created));
    },
    update(input = {}, itemId, patch = {}) {
      const actor = context(input);
      const id = requiredString({ item_id: itemId }, "item_id");
      const current = store.query("selectOne", {
        table: "hrx_payroll_items",
        where: { tenant_id: actor.tenant_id, item_id: id },
      });
      if (!current) {
        const error = new Error("Payroll item not found");
        error.status = 404;
        error.safe_error_code = "HRX_PAYROLL_ITEM_NOT_FOUND";
        throw error;
      }
      if (!Number.isInteger(patch.expected_version)) throw new TypeError("expected_version is required");
      const item = createPayrollItem({
        ...current,
        ...patch,
        tenant_id: actor.tenant_id,
        item_id: current.item_id,
        code: current.code,
      });
      const updated = store.query("updateOne", {
        table: "hrx_payroll_items",
        where: { tenant_id: actor.tenant_id, item_id: current.item_id },
        expected_version: patch.expected_version,
        patch: { ...item, state_version: current.state_version + 1, updated_at: clock() },
      });
      appendAudit(actor, "hrx.payroll.items.update", updated, "payroll_item_updated");
      return Object.freeze(clone(updated));
    },
  });
}
