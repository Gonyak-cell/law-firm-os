function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function isoDate(input, field) {
  const value = requiredString(input, field);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new TypeError(`${field} must be an ISO date`);
  return value;
}

export function createHrxOrgUnit(input = {}) {
  return Object.freeze({
    tenant_id: requiredString(input, "tenant_id"),
    org_unit_id: requiredString(input, "org_unit_id"),
    display_name: requiredString(input, "display_name"),
    parent_org_unit_id: input.parent_org_unit_id ?? null,
    effective_from: isoDate(input, "effective_from"),
    effective_to: input.effective_to ?? null,
  });
}

export function createHrxOrgHistoryEntry(input = {}) {
  return Object.freeze({
    tenant_id: requiredString(input, "tenant_id"),
    org_unit_id: requiredString(input, "org_unit_id"),
    change_type: requiredString(input, "change_type"),
    effective_from: isoDate(input, "effective_from"),
    previous_parent_org_unit_id: input.previous_parent_org_unit_id ?? null,
    next_parent_org_unit_id: input.next_parent_org_unit_id ?? null,
  });
}

function clone(value) {
  return value ? JSON.parse(JSON.stringify(value)) : undefined;
}

function key(tenantId, orgUnitId) {
  return `${tenantId}:${orgUnitId}`;
}

function requireOrgRef(ref = {}) {
  return {
    tenant_id: requiredString(ref, "tenant_id"),
    org_unit_id: requiredString(ref, "org_unit_id"),
  };
}

export function createInMemoryHrxOrgDirectory(seed = []) {
  const orgUnits = new Map();
  const history = [];

  const directory = {
    create(input) {
      const orgUnit = createHrxOrgUnit(input);
      const orgKey = key(orgUnit.tenant_id, orgUnit.org_unit_id);
      if (orgUnits.has(orgKey)) throw new Error(`OrgUnit already exists: ${orgUnit.org_unit_id}`);
      orgUnits.set(orgKey, clone(orgUnit));
      history.push(
        createHrxOrgHistoryEntry({
          tenant_id: orgUnit.tenant_id,
          org_unit_id: orgUnit.org_unit_id,
          change_type: "created",
          effective_from: orgUnit.effective_from,
          next_parent_org_unit_id: orgUnit.parent_org_unit_id,
        }),
      );
      return clone(orgUnit);
    },

    list(query = {}) {
      const tenantId = requiredString(query, "tenant_id");
      return [...orgUnits.values()]
        .filter((unit) => unit.tenant_id === tenantId)
        .filter((unit) => !Object.hasOwn(query, "parent_org_unit_id") || unit.parent_org_unit_id === query.parent_org_unit_id)
        .sort((left, right) => left.org_unit_id.localeCompare(right.org_unit_id))
        .map(clone);
    },

    update(ref, patch = {}) {
      const currentRef = requireOrgRef(ref);
      const orgKey = key(currentRef.tenant_id, currentRef.org_unit_id);
      const current = orgUnits.get(orgKey);
      if (!current) throw new ReferenceError(`OrgUnit not found: ${currentRef.org_unit_id}`);
      const next = createHrxOrgUnit({
        ...current,
        ...patch,
        tenant_id: current.tenant_id,
        org_unit_id: current.org_unit_id,
        effective_from: patch.effective_from ?? current.effective_from,
      });
      orgUnits.set(orgKey, clone(next));
      history.push(
        createHrxOrgHistoryEntry({
          tenant_id: next.tenant_id,
          org_unit_id: next.org_unit_id,
          change_type: patch.change_type ?? "updated",
          effective_from: next.effective_from,
          previous_parent_org_unit_id: current.parent_org_unit_id,
          next_parent_org_unit_id: next.parent_org_unit_id,
        }),
      );
      return clone(next);
    },

    history(query = {}) {
      const tenantId = requiredString(query, "tenant_id");
      return history
        .filter((entry) => entry.tenant_id === tenantId)
        .filter((entry) => !query.org_unit_id || entry.org_unit_id === query.org_unit_id)
        .map(clone);
    },
  };

  for (const orgUnit of seed) directory.create(orgUnit);
  return Object.freeze(directory);
}
