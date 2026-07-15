import { createHash } from "node:crypto";
import { createLeavePolicyService } from "./policy-service.js";
import { resolveLeaveTypeEconomics } from "./type-economics.js";

export const LEAVE_TYPE_RULE_BACKFILL_APPROVAL_SCHEMA_VERSION = "law-firm-os.hrx.leave-type-rule-backfill-approval.v0.1";

function requiredString(value, field) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function stableStringify(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
}

function hash(value) {
  return `sha256:${createHash("sha256").update(stableStringify(value)).digest("hex")}`;
}

function rules(row) {
  return JSON.parse(row.rules_json ?? "{}");
}

function guardedError(message, safeErrorCode) {
  const error = new TypeError(message);
  error.safe_error_code = safeErrorCode;
  error.status = 409;
  return error;
}

export function createLeaveTypeRuleBackfillService({ store, clock = () => new Date().toISOString() } = {}) {
  if (!store || typeof store.query !== "function" || typeof store.transaction !== "function") {
    throw new TypeError("leave type rule backfill requires a transactional store");
  }

  function preview(context = {}, { effective_from: effectiveFrom } = {}) {
    const tenantId = requiredString(context.tenant_id, "tenant_id");
    const nextEffectiveFrom = requiredString(effectiveFrom, "effective_from");
    const types = store.query("select", { table: "hrx_leave_types", where: { tenant_id: tenantId, status: "active" } });
    const policies = store.query("select", { table: "hrx_leave_policy_versions", where: { tenant_id: tenantId } });
    const activePolicies = policies.filter((policy) => policy.status === "active").sort((left, right) => left.policy_version_id.localeCompare(right.policy_version_id));
    const actions = [];

    for (const source of activePolicies) {
      const groupTypes = types.filter((type) => type.group_id === source.group_id).sort((left, right) => left.leave_type_id.localeCompare(right.leave_type_id));
      if (groupTypes.length === 0) continue;
      const draft = policies
        .filter((policy) => policy.policy_code === source.policy_code && policy.status === "draft")
        .sort((left, right) => right.version - left.version)[0] ?? null;
      const targetRules = draft ? rules(draft) : rules(source);
      const existingTypeRules = targetRules.type_rules ?? {};
      const missingTypes = groupTypes.filter((type) => !existingTypeRules[type.leave_type_id]);
      if (missingTypes.length === 0) continue;
      const typeRules = Object.fromEntries(missingTypes.map((type) => [
        type.leave_type_id,
        resolveLeaveTypeEconomics({}, type.leave_type_id),
      ]));
      actions.push(Object.freeze({
        operation: draft ? "update_draft" : "create_draft",
        source_policy_version_id: source.policy_version_id,
        target_policy_version_id: draft?.policy_version_id ?? `${source.policy_version_id}-type-rules-v${source.version + 1}`,
        group_id: source.group_id,
        policy_code: source.policy_code,
        version: draft?.version ?? source.version + 1,
        effective_from: draft?.effective_from ?? nextEffectiveFrom,
        source_rules_hash: hash(rules(source)),
        before_rules_hash: hash(targetRules),
        before_rules: targetRules,
        type_rules: typeRules,
      }));
    }

    const receipt = {
      schema_version: "law-firm-os.hrx.leave-type-rule-backfill-preview.v0.1",
      tenant_id: tenantId,
      effective_from: nextEffectiveFrom,
      source_policy_count: activePolicies.length,
      action_count: actions.length,
      type_rule_count: actions.reduce((sum, action) => sum + Object.keys(action.type_rules).length, 0),
      actions,
    };
    return Object.freeze({ ...receipt, preview_hash: hash(receipt) });
  }

  function execute(context = {}, input = {}) {
    const tenantId = requiredString(context.tenant_id, "tenant_id");
    const current = preview(context, { effective_from: input.effective_from });
    const approval = input.approval_manifest;
    if (
      approval?.schema_version !== LEAVE_TYPE_RULE_BACKFILL_APPROVAL_SCHEMA_VERSION ||
      approval.tenant_id !== tenantId ||
      approval.preview_hash !== current.preview_hash ||
      approval.decision !== "approved" ||
      typeof approval.approved_by_actor_id !== "string" || !approval.approved_by_actor_id.trim()
    ) {
      throw guardedError("matching owner approval manifest is required", "HRX_LEAVE_TYPE_RULE_BACKFILL_APPROVAL_REQUIRED");
    }
    const createdAt = clock();
    const policies = store.query("select", { table: "hrx_leave_policy_versions", where: { tenant_id: tenantId } });
    const byId = new Map(policies.map((policy) => [policy.policy_version_id, policy]));

    const results = store.transaction((tx) => {
      const policyService = createLeavePolicyService({ store: tx, clock });
      return current.actions.map((action) => {
        const target = byId.get(action.target_policy_version_id);
        const baseRules = target ? rules(target) : rules(byId.get(action.source_policy_version_id));
        const mergedRules = { ...baseRules, type_rules: { ...(baseRules.type_rules ?? {}), ...action.type_rules } };
        const policy = action.operation === "update_draft"
          ? policyService.updatePolicyDraft(context, action.target_policy_version_id, { rules: mergedRules })
          : policyService.createNextPolicyVersion(context, action.source_policy_version_id, {
            policy_version_id: action.target_policy_version_id,
            effective_from: action.effective_from,
            rules: mergedRules,
          });
        return Object.freeze({ operation: action.operation, policy_version_id: policy.policy_version_id, rule_count: Object.keys(action.type_rules).length });
      });
    });

    return Object.freeze({
      outcome: "drafts_created",
      preview_hash: current.preview_hash,
      approved_by_actor_id: approval.approved_by_actor_id,
      approved_at: approval.approved_at ?? createdAt,
      results: Object.freeze(results),
      rollback_manifest: Object.freeze({
        schema_version: "law-firm-os.hrx.leave-type-rule-backfill-rollback.v0.1",
        tenant_id: tenantId,
        generated_at: createdAt,
        actions: Object.freeze(current.actions.map((action) => Object.freeze({
          operation: action.operation === "create_draft" ? "delete_draft" : "restore_draft_rules",
          policy_version_id: action.target_policy_version_id,
          before_rules_hash: action.before_rules_hash,
          before_rules: action.operation === "update_draft" ? action.before_rules : null,
        }))),
      }),
    });
  }

  return Object.freeze({ preview, execute });
}
