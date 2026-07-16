import { normalizeLeavePolicyRules } from "./type-economics.js";

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function guardedError(message, safeErrorCode, status = 409) {
  const error = new TypeError(message);
  error.safe_error_code = safeErrorCode;
  error.status = status;
  return error;
}

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function stringifyRules(value) {
  return JSON.stringify(normalizeLeavePolicyRules(value));
}

function parseRules(row) {
  return Object.freeze({ ...clone(row), rules: Object.freeze(JSON.parse(row.rules_json ?? "{}")) });
}

function parseEvidenceRule(row) {
  if (!row) return row;
  let evidenceRule = {};
  try {
    evidenceRule = JSON.parse(row.evidence_rule_json ?? "{}");
  } catch {
    evidenceRule = {};
  }
  return Object.freeze({ ...clone(row), evidence_rule: Object.freeze(evidenceRule) });
}

function overlaps(left, right) {
  const leftEnd = left.effective_to || "9999-12-31";
  const rightEnd = right.effective_to || "9999-12-31";
  return left.effective_from <= rightEnd && right.effective_from <= leftEnd;
}

function validateDateRange(input) {
  const effectiveFrom = requiredString(input, "effective_from");
  const effectiveTo = input.effective_to ?? null;
  if (effectiveTo !== null && (typeof effectiveTo !== "string" || effectiveTo < effectiveFrom)) {
    throw new TypeError("effective_to must be on or after effective_from");
  }
  return { effectiveFrom, effectiveTo };
}

function previousDate(date) {
  const value = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(value.valueOf())) throw new TypeError("effective_from must be an ISO date");
  return new Date(value.valueOf() - 86_400_000).toISOString().slice(0, 10);
}

export function createLeavePolicyService({ store, clock = () => new Date().toISOString() } = {}) {
  if (!store || typeof store.query !== "function") throw new TypeError("leave policy service requires store.query");

  function get(table, tenantId, idField, id) {
    return store.query("selectOne", { table, where: { tenant_id: tenantId, [idField]: id } });
  }

  function createPolicyVersion(context = {}, input = {}) {
    const tenantId = requiredString(context, "tenant_id");
    const groupId = requiredString(input, "group_id");
    if (!get("hrx_leave_groups", tenantId, "group_id", groupId)) {
      throw guardedError("Leave group not found", "HRX_LEAVE_GROUP_NOT_FOUND", 404);
    }
    if (!Number.isInteger(input.version) || input.version < 1) throw new TypeError("version must be a positive integer");
    const { effectiveFrom, effectiveTo } = validateDateRange(input);
    const row = store.query("insert", {
      table: "hrx_leave_policy_versions",
      row: {
        tenant_id: tenantId,
        policy_version_id: requiredString(input, "policy_version_id"),
        group_id: groupId,
        policy_code: requiredString(input, "policy_code"),
        version: input.version,
        effective_from: effectiveFrom,
        effective_to: effectiveTo,
        status: "draft",
        rules_json: stringifyRules(input.rules ?? {}),
        created_at: clock(),
        updated_at: clock(),
      },
    });
    return parseRules(row);
  }

  return Object.freeze({
    listConfiguration(context = {}) {
      const tenantId = requiredString(context, "tenant_id");
      return Object.freeze({
        groups: Object.freeze(store.query("select", { table: "hrx_leave_groups", where: { tenant_id: tenantId } }).map(clone)),
        types: Object.freeze(store.query("select", { table: "hrx_leave_types", where: { tenant_id: tenantId } }).map(parseEvidenceRule)),
        policies: Object.freeze(
          store.query("select", { table: "hrx_leave_policy_versions", where: { tenant_id: tenantId } }).map(parseRules),
        ),
      });
    },

    listActiveTypes(context = {}, { on_date: onDate = clock().slice(0, 10) } = {}) {
      const tenantId = requiredString(context, "tenant_id");
      const activePolicyGroups = new Set(
        store
          .query("select", { table: "hrx_leave_policy_versions", where: { tenant_id: tenantId, status: "active" } })
          .filter((policy) => policy.effective_from <= onDate && (!policy.effective_to || policy.effective_to >= onDate))
          .map((policy) => policy.group_id),
      );
      return Object.freeze(
        store
          .query("select", { table: "hrx_leave_types", where: { tenant_id: tenantId, status: "active" } })
          .filter((type) => activePolicyGroups.has(type.group_id))
          .map(parseEvidenceRule),
      );
    },

    createGroup(context = {}, input = {}) {
      const tenantId = requiredString(context, "tenant_id");
      return store.query("insert", {
        table: "hrx_leave_groups",
        row: {
          tenant_id: tenantId,
          group_id: requiredString(input, "group_id"),
          code: requiredString(input, "code").toUpperCase(),
          display_name: requiredString(input, "display_name"),
          status: input.status ?? "active",
          state_version: 1,
          created_at: clock(),
          updated_at: clock(),
        },
      });
    },

    updateGroup(context = {}, groupId, input = {}) {
      const tenantId = requiredString(context, "tenant_id");
      const current = get("hrx_leave_groups", tenantId, "group_id", requiredString({ group_id: groupId }, "group_id"));
      if (!current) throw guardedError("Leave group not found", "HRX_LEAVE_GROUP_NOT_FOUND", 404);
      const expectedVersion = input.expected_version;
      if (!Number.isInteger(expectedVersion)) throw new TypeError("expected_version is required");
      return store.query("updateOne", {
        table: "hrx_leave_groups",
        where: { tenant_id: tenantId, group_id: current.group_id },
        expected_version: expectedVersion,
        patch: {
          display_name: input.display_name ? requiredString(input, "display_name") : current.display_name,
          status: input.status ?? current.status,
          state_version: current.state_version + 1,
          updated_at: clock(),
        },
      });
    },

    createType(context = {}, input = {}) {
      const tenantId = requiredString(context, "tenant_id");
      const groupId = requiredString(input, "group_id");
      if (!get("hrx_leave_groups", tenantId, "group_id", groupId)) {
        throw guardedError("Leave group not found", "HRX_LEAVE_GROUP_NOT_FOUND", 404);
      }
      const requestUnit = input.request_unit ?? "minutes";
      if (!["minutes", "half_day", "day"].includes(requestUnit)) throw new TypeError("request_unit is invalid");
      return store.query("insert", {
        table: "hrx_leave_types",
        row: {
          tenant_id: tenantId,
          leave_type_id: requiredString(input, "leave_type_id"),
          group_id: groupId,
          code: requiredString(input, "code").toUpperCase(),
          display_name: requiredString(input, "display_name"),
          request_unit: requestUnit,
          evidence_rule_json: JSON.stringify(input.evidence_rule ?? {}),
          status: input.status ?? "active",
          created_at: clock(),
          updated_at: clock(),
        },
      });
    },

    updateType(context = {}, leaveTypeId, input = {}) {
      const tenantId = requiredString(context, "tenant_id");
      const current = get("hrx_leave_types", tenantId, "leave_type_id", requiredString({ leave_type_id: leaveTypeId }, "leave_type_id"));
      if (!current) throw guardedError("Leave type not found", "HRX_LEAVE_TYPE_NOT_FOUND", 404);
      const historical = store.query("select", {
        table: "hrx_leave_requests",
        where: { tenant_id: tenantId, leave_type_id: current.leave_type_id },
      }).length > 0;
      if (historical && (input.code || input.group_id || input.request_unit)) {
        throw guardedError("A leave type used by requests can only be renamed or deactivated", "HRX_LEAVE_TYPE_HISTORY_IMMUTABLE");
      }
      const patch = {
        display_name: input.display_name ? requiredString(input, "display_name") : current.display_name,
        status: input.status ?? current.status,
        updated_at: clock(),
      };
      if (!historical) {
        if (input.code) patch.code = requiredString(input, "code").toUpperCase();
        if (input.group_id) patch.group_id = requiredString(input, "group_id");
        if (input.request_unit) patch.request_unit = input.request_unit;
        if (input.evidence_rule) patch.evidence_rule_json = JSON.stringify(input.evidence_rule);
      }
      return store.query("updateOne", {
        table: "hrx_leave_types",
        where: { tenant_id: tenantId, leave_type_id: current.leave_type_id },
        patch,
      });
    },

    createPolicyVersion,

    createNextPolicyVersion(context = {}, sourcePolicyVersionId, input = {}) {
      const tenantId = requiredString(context, "tenant_id");
      const source = get(
        "hrx_leave_policy_versions",
        tenantId,
        "policy_version_id",
        requiredString({ policy_version_id: sourcePolicyVersionId }, "policy_version_id"),
      );
      if (!source) throw guardedError("Leave policy version not found", "HRX_LEAVE_POLICY_NOT_FOUND", 404);
      return createPolicyVersion(context, {
        policy_version_id: input.policy_version_id,
        group_id: source.group_id,
        policy_code: source.policy_code,
        version: source.version + 1,
        effective_from: input.effective_from,
        effective_to: input.effective_to ?? null,
        rules: input.rules ?? JSON.parse(source.rules_json),
      });
    },

    updatePolicyDraft(context = {}, policyVersionId, input = {}) {
      const tenantId = requiredString(context, "tenant_id");
      const current = get(
        "hrx_leave_policy_versions",
        tenantId,
        "policy_version_id",
        requiredString({ policy_version_id: policyVersionId }, "policy_version_id"),
      );
      if (!current) throw guardedError("Leave policy version not found", "HRX_LEAVE_POLICY_NOT_FOUND", 404);
      if (current.status !== "draft") {
        throw guardedError("Published leave policy versions are immutable; create a new version", "HRX_LEAVE_POLICY_VERSION_IMMUTABLE");
      }
      const dates = validateDateRange({
        effective_from: input.effective_from ?? current.effective_from,
        effective_to: input.effective_to === undefined ? current.effective_to : input.effective_to,
      });
      const next = store.query("updateOne", {
        table: "hrx_leave_policy_versions",
        where: { tenant_id: tenantId, policy_version_id: current.policy_version_id },
        patch: {
          effective_from: dates.effectiveFrom,
          effective_to: dates.effectiveTo,
          rules_json: input.rules ? stringifyRules(input.rules) : current.rules_json,
          updated_at: clock(),
        },
      });
      return parseRules(next);
    },

    publishPolicyVersion(context = {}, policyVersionId) {
      const tenantId = requiredString(context, "tenant_id");
      const current = get(
        "hrx_leave_policy_versions",
        tenantId,
        "policy_version_id",
        requiredString({ policy_version_id: policyVersionId }, "policy_version_id"),
      );
      if (!current) throw guardedError("Leave policy version not found", "HRX_LEAVE_POLICY_NOT_FOUND", 404);
      if (current.status !== "draft") {
        throw guardedError("Only a draft policy version can be published", "HRX_LEAVE_POLICY_VERSION_IMMUTABLE");
      }
      const conflicts = store
        .query("select", {
          table: "hrx_leave_policy_versions",
          where: { tenant_id: tenantId, policy_code: current.policy_code, status: "active" },
        })
        .filter((policy) => overlaps(policy, current));
      if (conflicts.some((policy) => policy.effective_from >= current.effective_from) || conflicts.length > 1) {
        throw guardedError("Leave policy effective dates overlap an active version", "HRX_LEAVE_POLICY_EFFECTIVE_OVERLAP");
      }
      return store.transaction((tx) => {
        const predecessor = conflicts[0];
        if (predecessor) {
          tx.query("updateOne", {
            table: "hrx_leave_policy_versions",
            where: { tenant_id: tenantId, policy_version_id: predecessor.policy_version_id },
            patch: { status: "retired", effective_to: previousDate(current.effective_from), updated_at: clock() },
          });
        }
        return parseRules(tx.query("updateOne", {
          table: "hrx_leave_policy_versions",
          where: { tenant_id: tenantId, policy_version_id: current.policy_version_id },
          patch: { status: "active", updated_at: clock() },
        }));
      });
    },
  });
}
