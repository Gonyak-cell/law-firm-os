import { appendFinanceAuditEvent } from "./finance-audit.js";
import { canonicalFinanceRequestFingerprint } from "./finance-repository.js";
import { rateForRole } from "../../time-expense/src/rate-card-service.js";
import { findFeeArrangementForMatter, normalizeFeeArrangementType } from "../../time-expense/src/fee-arrangement-service.js";

const MS_PER_DAY = 86_400_000;
const WIP_SOURCE_ID_FIELDS = Object.freeze({
  TimeEntry: "time_entry_id",
  Expense: "expense_id",
  Disbursement: "disbursement_id",
});
const LEGACY_TIME_ENTRY_DEFAULT_TERMS_PREDICATE = "approved_for_wip_without_weekly_workflow_fields_v1";
const WEEKLY_TIME_ENTRY_FIELDS = Object.freeze([
  "submitted_at",
  "locked_at",
  "lock_grace_until",
  "grace_expires_at",
  "unlock_grace_until",
  "unlocked_at",
  "unlock_reason",
  "lock_history",
  "status_before_lock",
  "status_before_unlock",
]);

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function requireDateOnly(value, field) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new TypeError(`${field} must be a valid ISO date`);
  }
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new TypeError(`${field} must be a valid ISO date`);
  }
  return value;
}

function sourceId(item) {
  return item.resource_id ?? item.time_entry_id ?? item.expense_id ?? item.disbursement_id;
}

function assertCanonicalProjection(supplied, canonical, label) {
  for (const key of Object.keys(supplied ?? {})) {
    if (!Object.hasOwn(canonical, key)) continue;
    if (canonicalFinanceRequestFingerprint(supplied[key]) !== canonicalFinanceRequestFingerprint(canonical[key])) {
      throw new Error(`${label} differs from its canonical finance record`);
    }
  }
}

function timeEntryIsLockedForWip(item) {
  if (item.model_type !== "TimeEntry") return true;
  if (item.status === "locked" || item.locked_at) return true;
  return item.status === "approved"
    && !Object.hasOwn(item, "locked_at")
    && !item.submitted_at;
}

function isLegacyTimeEntryForDefaultTerms(item) {
  return item.model_type === "TimeEntry"
    && item.status === "approved"
    && item.approved_for_wip === true
    && WEEKLY_TIME_ENTRY_FIELDS.every((field) => !Object.hasOwn(item, field));
}

function legacyTimeEntriesForDefaultTerms(approved) {
  const timeEntries = approved.filter(({ item }) => item.model_type === "TimeEntry");
  if (timeEntries.some(({ item }) => !isLegacyTimeEntryForDefaultTerms(item))) {
    throw new Error("explicit canonical FeeArrangement is required for modern TimeEntry WIP");
  }
  return timeEntries;
}

function weeklyTimeNotLockedError() {
  const error = new Error("time entry must be locked before WIP generation");
  error.code = "WEEKLY_TIME_NOT_LOCKED";
  error.status = 409;
  error.status_code = 409;
  return error;
}

function canonicalWipSources({ repository, tenant_id, matter_id, source_items }) {
  if (source_items != null && !Array.isArray(source_items)) throw new TypeError("source_items must be an array");
  const supplied = source_items == null
    ? repository
        .list({ tenant_id, matter_id })
        .filter((item) => Object.hasOwn(WIP_SOURCE_ID_FIELDS, item.model_type))
        .filter((item) => (item.status === "approved" || item.approved_for_wip === true) && item.billable !== false)
    : source_items;
  return supplied.map((selection) => {
    if (!selection || typeof selection !== "object") throw new TypeError("source item must be an object");
    const modelType = requiredString(selection, "model_type");
    const idField = WIP_SOURCE_ID_FIELDS[modelType];
    if (!idField) throw new Error("source item model_type is not billable WIP");
    const sourceTenantId = requiredString(selection, "tenant_id");
    const sourceMatterId = requiredString(selection, "matter_id");
    if (sourceTenantId !== tenant_id) throw new Error("source item tenant must match WIP tenant");
    if (sourceMatterId !== matter_id) throw new Error("source item Matter must match WIP Matter");
    const selectedId = requiredString({ [idField]: selection[idField] ?? selection.resource_id }, idField);
    if (selection.resource_id && selection[idField] && selection.resource_id !== selection[idField]) {
      throw new Error("source item resource identity is inconsistent");
    }
    const canonical = repository.get({
      tenant_id,
      model_type: modelType,
      [idField]: selectedId,
    });
    if (!canonical) throw new Error("source item must exist in the canonical finance repository");
    if (canonical.tenant_id !== tenant_id) throw new Error("canonical source item tenant mismatch");
    if (canonical.matter_id !== matter_id) throw new Error("canonical source item Matter mismatch");
    assertCanonicalProjection(selection, canonical, "source item");
    if (!((canonical.status === "approved" || canonical.approved_for_wip === true) && canonical.billable !== false)) {
      throw new Error("source item must be approved and billable");
    }
    if (!timeEntryIsLockedForWip(canonical)) throw weeklyTimeNotLockedError();
    return {
      item: canonical,
      source_id: selectedId,
    };
  });
}

function canonicalWipBillingTerms({
  repository,
  tenant_id,
  matter_id,
  approved,
  rate_card,
  fee_arrangement,
  fee_arrangement_id,
}) {
  if (fee_arrangement != null && typeof fee_arrangement !== "object") {
    throw new TypeError("fee_arrangement must be an object");
  }
  if (rate_card != null && typeof rate_card !== "object") throw new TypeError("rate_card must be an object");
  if (fee_arrangement) {
    if (requiredString(fee_arrangement, "tenant_id") !== tenant_id) {
      throw new Error("FeeArrangement tenant must match WIP tenant");
    }
    if (requiredString(fee_arrangement, "matter_id") !== matter_id) {
      throw new Error("FeeArrangement Matter must match WIP Matter");
    }
  }
  const suppliedArrangementId = fee_arrangement
    ? requiredString(
        { fee_arrangement_id: fee_arrangement.fee_arrangement_id ?? fee_arrangement.resource_id },
        "fee_arrangement_id",
      )
    : null;
  const explicitArrangementId = fee_arrangement_id == null
    ? null
    : requiredString({ fee_arrangement_id }, "fee_arrangement_id");
  if (explicitArrangementId && suppliedArrangementId && explicitArrangementId !== suppliedArrangementId) {
    throw new Error("FeeArrangement identity is inconsistent");
  }
  const selectedArrangementId = explicitArrangementId ?? suppliedArrangementId;
  const arrangement = findFeeArrangementForMatter({
    repository,
    tenant_id,
    matter_id,
    fee_arrangement_id: selectedArrangementId,
  });
  const hasTimeEntry = approved.some(({ item }) => item.model_type === "TimeEntry");
  if (selectedArrangementId && !arrangement) throw new Error("FeeArrangement must exist in the canonical finance repository");
  if (arrangement) {
    if (arrangement.tenant_id !== tenant_id) throw new Error("canonical FeeArrangement tenant mismatch");
    if (arrangement.matter_id !== matter_id) throw new Error("canonical FeeArrangement Matter mismatch");
    if (arrangement.status !== "active") throw new Error("FeeArrangement must be active");
    if (fee_arrangement) assertCanonicalProjection(fee_arrangement, arrangement, "FeeArrangement");
    if (arrangement.server_created_default === true && hasTimeEntry) {
      legacyTimeEntriesForDefaultTerms(approved);
      if (arrangement.legacy_compatibility_predicate !== LEGACY_TIME_ENTRY_DEFAULT_TERMS_PREDICATE) {
        throw new Error("server-created FeeArrangement is missing its canonical legacy predicate");
      }
    }
  }
  if (!arrangement) {
    if (!hasTimeEntry) {
      if (rate_card) throw new Error("RateCard must be linked by a canonical FeeArrangement");
      return { arrangement: null, rateCard: null, createArrangement: false };
    }
    const legacyTimeEntries = legacyTimeEntriesForDefaultTerms(approved);
    if (!rate_card) throw new Error("repository-backed FeeArrangement is required for TimeEntry WIP");
    if (requiredString(rate_card, "tenant_id") !== tenant_id) {
      throw new Error("RateCard tenant must match WIP tenant");
    }
    const rateCardId = requiredString(
      { rate_card_id: rate_card.rate_card_id ?? rate_card.resource_id },
      "rate_card_id",
    );
    const canonicalRateCard = repository.get({
      tenant_id,
      model_type: "RateCard",
      rate_card_id: rateCardId,
    });
    if (!canonicalRateCard) throw new Error("RateCard must exist in the canonical finance repository");
    if (canonicalRateCard.status !== "active") throw new Error("RateCard must be active");
    const activeRateCards = repository
      .list({ tenant_id, model_type: "RateCard" })
      .filter((candidate) => candidate.status === "active");
    if (activeRateCards.length !== 1 || activeRateCards[0].rate_card_id !== rateCardId) {
      throw new Error("repository-backed FeeArrangement is required when the canonical default RateCard is ambiguous");
    }
    assertCanonicalProjection(rate_card, canonicalRateCard, "RateCard");
    const defaultArrangement = Object.freeze({
      model_type: "FeeArrangement",
      fee_arrangement_id: `fee:canonical-hourly:${tenant_id}:${matter_id}:${rateCardId}`,
      tenant_id,
      matter_id,
      billing_profile_id: `billing-profile:canonical-hourly:${tenant_id}:${matter_id}`,
      rate_card_id: rateCardId,
      type: "hourly",
      arrangement_type: "hourly",
      status: "active",
      rate_overrides: Object.freeze([]),
      server_created_default: true,
      canonical_default_terms: true,
      legacy_compatibility_predicate: LEGACY_TIME_ENTRY_DEFAULT_TERMS_PREDICATE,
      legacy_source_refs: Object.freeze(legacyTimeEntries.map(({ source_id }) => source_id).sort()),
    });
    return { arrangement: defaultArrangement, rateCard: canonicalRateCard, createArrangement: true };
  }

  const linkedRateCardId = requiredString(arrangement, "rate_card_id");
  if (rate_card) {
    if (requiredString(rate_card, "tenant_id") !== tenant_id) {
      throw new Error("RateCard tenant must match WIP tenant");
    }
    const suppliedRateCardId = requiredString(
      { rate_card_id: rate_card.rate_card_id ?? rate_card.resource_id },
      "rate_card_id",
    );
    if (suppliedRateCardId !== linkedRateCardId) {
      throw new Error("RateCard must exactly match the FeeArrangement link");
    }
  }
  const rateCard = repository.get({
    tenant_id,
    model_type: "RateCard",
    rate_card_id: linkedRateCardId,
  });
  if (!rateCard) throw new Error("linked RateCard must exist in the canonical finance repository");
  if (rateCard.tenant_id !== tenant_id) throw new Error("canonical RateCard tenant mismatch");
  if (rateCard.status !== "active") throw new Error("linked RateCard must be active");
  if (rate_card) assertCanonicalProjection(rate_card, rateCard, "RateCard");
  return { arrangement, rateCard, createArrangement: false };
}

function sourceIdentity(item, id = item.source_id ?? sourceId(item)) {
  return `${item.matter_id}:${item.source_model_type ?? item.model_type}:${id}`;
}

function wipSourceKey(item, id = item.source_id ?? sourceId(item)) {
  return `${item.source_model_type ?? item.model_type}:${id}`;
}

function wipSourceSetIdentity({ tenant_id, matter_id, sources }) {
  const sourceRefs = sources
    .map((source) => {
      const item = source.item ?? source;
      return Object.freeze({
        model_type: requiredString({
          model_type: item.source_model_type ?? item.model_type,
        }, "model_type"),
        source_id: requiredString({
          source_id: source.source_id ?? item.source_id ?? sourceId(item),
        }, "source_id"),
      });
    })
    .sort((left, right) =>
      left.model_type.localeCompare(right.model_type)
      || left.source_id.localeCompare(right.source_id));
  const fingerprint = canonicalFinanceRequestFingerprint({
    tenant_id,
    matter_id,
    source_refs: sourceRefs,
  });
  return Object.freeze({
    source_set_id: `wip-source-set:${fingerprint}`,
    source_set_fingerprint: fingerprint,
    source_refs: Object.freeze(sourceRefs),
  });
}

function sourceDate(item) {
  return item.work_date ?? item.incurred_on ?? item.expense_date ?? item.disbursement_date ?? item.created_at?.slice(0, 10);
}

function ageInDays(date, asOfDate) {
  const sourceMs = Date.parse(`${requireDateOnly(date, "source date")}T00:00:00.000Z`);
  const asOfMs = Date.parse(`${asOfDate}T00:00:00.000Z`);
  return Math.max(0, Math.floor((asOfMs - sourceMs) / MS_PER_DAY));
}

function approvedForBilling(item) {
  if (item.approved_for_wip === true) return true;
  return item.status === "approved" || item.status === "locked";
}

function billedWipItemIds(repository, tenantId) {
  const snapshots = new Map(
    repository
      .list({ tenant_id: tenantId, model_type: "WipSnapshot" })
      .map((snapshot) => [snapshot.wip_snapshot_id, snapshot]),
  );
  const prebills = new Map(
    repository
      .list({ tenant_id: tenantId, model_type: "PreBill" })
      .map((prebill) => [prebill.prebill_id, prebill]),
  );
  const itemIds = new Set(
    repository
      .list({ tenant_id: tenantId, model_type: "InvoiceLine" })
      .map((line) => line.wip_item_id)
      .filter(Boolean),
  );
  for (const invoice of repository.list({ tenant_id: tenantId, model_type: "Invoice" })) {
    const snapshot = snapshots.get(prebills.get(invoice.prebill_id)?.wip_snapshot_id);
    for (const itemId of snapshot?.item_refs ?? []) itemIds.add(itemId);
  }
  return itemIds;
}

function queryError(error, fallbackCode = "billing_configuration_error") {
  const message = error instanceof Error ? error.message : String(error);
  if (message.startsWith("RateCard missing role rate")) return { error_code: "missing_role_rate", error_message: message };
  return { error_code: fallbackCode, error_message: message };
}

function amountForSource(item, rateCard) {
  if (item.model_type === "TimeEntry") return Number(((Number(item.duration_minutes) / 60) * rateForRole(rateCard, item.role_id)).toFixed(2));
  return Number(item.amount ?? 0);
}

function moneyValue(value) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : 0;
}

function retainerAvailableAmount(feeArrangement) {
  return moneyValue(feeArrangement?.retainer_available_amount ?? feeArrangement?.retainer_balance_amount ?? feeArrangement?.retainer_amount);
}

function feeArrangementConsumption({ repository, tenant_id, matter_id, feeArrangement }) {
  if (!feeArrangement) {
    return {
      fixedFeeApplied: false,
      upfrontFeeApplied: false,
      successFeeApplied: false,
      retainerDrawdownTotal: 0,
    };
  }
  const timeWipItems = repository
    .list({ tenant_id, matter_id, model_type: "WipItem" })
    .filter((item) =>
      item.source_model_type === "TimeEntry"
      && item.fee_arrangement_id === feeArrangement.fee_arrangement_id);
  return {
    fixedFeeApplied: timeWipItems.some((item) =>
      item.fixed_fee_applied === true
      || item.billing_calculation_source === "fee_arrangement.fixed"),
    upfrontFeeApplied: timeWipItems.some((item) =>
      item.upfront_fee_applied === true
      || item.billing_calculation_source === "fee_arrangement.success_fee"),
    successFeeApplied: timeWipItems.some((item) => item.success_fee_applied === true),
    retainerDrawdownTotal: moneyValue(
      timeWipItems.reduce((sum, item) => sum + Number(item.retainer_drawdown_amount ?? 0), 0),
    ),
  };
}

function calculateWipAmountForSource({
  item,
  rateCard,
  feeArrangement,
  fixedFeeApplied,
  upfrontFeeApplied,
  successFeeApplied,
  retainerRemaining,
}) {
  const standardAmount = amountForSource(item, rateCard);
  if (!feeArrangement || item.model_type !== "TimeEntry") {
    return Object.freeze({
      amount: moneyValue(standardAmount),
      standard_amount: moneyValue(standardAmount),
      retainer_drawdown_amount: 0,
      fixed_fee_applied: false,
      upfront_fee_applied: false,
      success_fee_applied: false,
      billing_calculation_source: feeArrangement ? "fee_arrangement.pass_through" : "rate_card",
      fee_arrangement_type: feeArrangement ? normalizeFeeArrangementType(feeArrangement) : "hourly",
    });
  }

  const type = normalizeFeeArrangementType(feeArrangement);
  if (type === "fixed") {
    const applyFixedFee = fixedFeeApplied !== true;
    return Object.freeze({
      amount: applyFixedFee ? moneyValue(feeArrangement.fixed_fee_amount) : 0,
      standard_amount: moneyValue(standardAmount),
      retainer_drawdown_amount: 0,
      fixed_fee_applied: applyFixedFee,
      upfront_fee_applied: false,
      success_fee_applied: false,
      billing_calculation_source: "fee_arrangement.fixed",
      fee_arrangement_type: type,
    });
  }
  if (type === "success_fee") {
    const applyUpfrontFee = upfrontFeeApplied !== true;
    const applySuccessFee = feeArrangement.success_condition_met === true && successFeeApplied !== true;
    const upfrontAmount = applyUpfrontFee ? moneyValue(feeArrangement.upfront_fee_amount) : 0;
    const successAmount = applySuccessFee ? moneyValue(feeArrangement.success_fee_amount) : 0;
    return Object.freeze({
      amount: moneyValue(upfrontAmount + successAmount),
      standard_amount: moneyValue(standardAmount),
      retainer_drawdown_amount: 0,
      fixed_fee_applied: false,
      upfront_fee_applied: applyUpfrontFee,
      success_fee_applied: applySuccessFee,
      billing_calculation_source: "fee_arrangement.success_fee",
      fee_arrangement_type: type,
    });
  }
  if (type === "retainer") {
    const drawdown = Math.min(moneyValue(standardAmount), Math.max(0, moneyValue(retainerRemaining)));
    return Object.freeze({
      amount: moneyValue(standardAmount - drawdown),
      standard_amount: moneyValue(standardAmount),
      retainer_drawdown_amount: drawdown,
      fixed_fee_applied: false,
      upfront_fee_applied: false,
      success_fee_applied: false,
      billing_calculation_source: "fee_arrangement.retainer_drawdown",
      fee_arrangement_type: type,
    });
  }
  return Object.freeze({
    amount: moneyValue(standardAmount),
    standard_amount: moneyValue(standardAmount),
    retainer_drawdown_amount: 0,
    fixed_fee_applied: false,
    upfront_fee_applied: false,
    success_fee_applied: false,
    billing_calculation_source: "fee_arrangement.hourly",
    fee_arrangement_type: type,
  });
}

export function queryMatterBillingWip({ repository, tenant_id, matter_id, as_of_date } = {}) {
  const tenantId = requiredString({ tenant_id }, "tenant_id");
  const matterId = matter_id === undefined || matter_id === null ? null : requiredString({ matter_id }, "matter_id");
  const asOfDate = requireDateOnly(as_of_date ?? new Date().toISOString().slice(0, 10), "as_of_date");
  const billedItemIds = billedWipItemIds(repository, tenantId);
  const allWipBySource = new Map(
    repository
      .list({ tenant_id: tenantId, model_type: "WipItem" })
      .map((item) => [sourceIdentity(item), item]),
  );
  const existingWipBySource = new Map(
    [...allWipBySource]
      .filter(([, item]) => !billedItemIds.has(item.wip_item_id)),
  );
  const sources = repository
    .list({ tenant_id: tenantId })
    .filter((item) => ["TimeEntry", "Expense", "Disbursement"].includes(item.model_type))
    .filter((item) => !matterId || item.matter_id === matterId)
    .filter((item) => item.billable !== false && approvedForBilling(item))
    .filter((item) => !billedItemIds.has(allWipBySource.get(sourceIdentity(item))?.wip_item_id))
    .sort((left, right) => {
      return String(left.matter_id).localeCompare(String(right.matter_id))
        || String(sourceDate(left) ?? "").localeCompare(String(sourceDate(right) ?? ""))
        || String(sourceId(left)).localeCompare(String(sourceId(right)));
    });

  const billingByMatter = new Map();
  const rows = sources.map((item) => {
    const id = sourceId(item);
    const base = {
      matter_id: item.matter_id,
      source_model_type: item.model_type,
      source_id: id,
      wip_item_id: null,
      work_date: sourceDate(item) ?? null,
      age_days: null,
      amount: null,
      currency: null,
      status: "error",
      error_code: null,
      error_message: null,
    };
    let ageDays;
    try {
      ageDays = ageInDays(base.work_date, asOfDate);
    } catch (error) {
      return Object.freeze({ ...base, ...queryError(error, "missing_source_date") });
    }
    if (!timeEntryIsLockedForWip(item)) {
      return Object.freeze({
        ...base,
        age_days: ageDays,
        error_code: "weekly_time_not_locked",
        error_message: "time entry must be locked before billing",
      });
    }

    const existingWip = existingWipBySource.get(sourceIdentity(item, id));
    if (existingWip) {
      return Object.freeze({
        ...base,
        wip_item_id: existingWip.wip_item_id,
        age_days: ageDays,
        amount: moneyValue(existingWip.amount),
        currency: existingWip.currency ?? item.currency ?? "KRW",
        status: existingWip.status === "locked" ? "in_prebill" : "ready",
      });
    }

    let billing = billingByMatter.get(item.matter_id);
    if (!billing) {
      const feeArrangement = findFeeArrangementForMatter({ repository, tenant_id: tenantId, matter_id: item.matter_id });
      const rateCard = feeArrangement?.rate_card_id
        ? repository.get({ tenant_id: tenantId, model_type: "RateCard", rate_card_id: feeArrangement.rate_card_id })
        : null;
      const consumption = feeArrangementConsumption({
        repository,
        tenant_id: tenantId,
        matter_id: item.matter_id,
        feeArrangement,
      });
      billing = {
        feeArrangement,
        rateCard,
        ...consumption,
        retainerRemaining: moneyValue(
          retainerAvailableAmount(feeArrangement) - consumption.retainerDrawdownTotal,
        ),
      };
      billingByMatter.set(item.matter_id, billing);
    }
    if (item.model_type === "TimeEntry" && !billing.feeArrangement) {
      return Object.freeze({
        ...base,
        age_days: ageDays,
        error_code: "missing_fee_arrangement",
        error_message: "active fee arrangement is required",
      });
    }
    if (item.model_type === "TimeEntry" && !billing.rateCard) {
      return Object.freeze({
        ...base,
        age_days: ageDays,
        error_code: "missing_rate_card",
        error_message: "fee arrangement rate card is required",
      });
    }
    try {
      const calculation = calculateWipAmountForSource({
        item,
        rateCard: billing.rateCard,
        feeArrangement: billing.feeArrangement,
        fixedFeeApplied: billing.fixedFeeApplied,
        upfrontFeeApplied: billing.upfrontFeeApplied,
        successFeeApplied: billing.successFeeApplied,
        retainerRemaining: billing.retainerRemaining,
      });
      if (item.model_type === "TimeEntry") {
        billing.fixedFeeApplied ||= calculation.fixed_fee_applied;
        billing.upfrontFeeApplied ||= calculation.upfront_fee_applied;
        billing.successFeeApplied ||= calculation.success_fee_applied;
        billing.retainerRemaining = moneyValue(billing.retainerRemaining - calculation.retainer_drawdown_amount);
      }
      return Object.freeze({
        ...base,
        age_days: ageDays,
        amount: calculation.amount,
        currency: billing.rateCard?.currency ?? item.currency ?? "KRW",
        status: "ready",
      });
    } catch (error) {
      return Object.freeze({ ...base, age_days: ageDays, ...queryError(error) });
    }
  });

  const eligibleSourcesByMatter = new Map();
  for (const row of rows) {
    if (row.status !== "ready" || row.wip_item_id !== null) continue;
    const current = eligibleSourcesByMatter.get(row.matter_id) ?? [];
    current.push(row);
    eligibleSourcesByMatter.set(row.matter_id, current);
  }
  const eligibleSourceSets = [...eligibleSourcesByMatter]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([eligibleMatterId, eligibleSources]) => {
      const identity = wipSourceSetIdentity({
        tenant_id: tenantId,
        matter_id: eligibleMatterId,
        sources: eligibleSources,
      });
      return Object.freeze({
        matter_id: eligibleMatterId,
        source_set_id: identity.source_set_id,
        source_count: identity.source_refs.length,
        source_refs: identity.source_refs,
      });
    });

  const matterGroups = new Map();
  for (const row of rows) {
    const current = matterGroups.get(row.matter_id) ?? {
      matter_id: row.matter_id,
      item_count: 0,
      ready_count: 0,
      error_count: 0,
      total_amount: 0,
      age_days_total: 0,
      oldest_age_days: 0,
    };
    current.item_count += 1;
    current.error_count += row.status === "error" ? 1 : 0;
    current.ready_count += row.status === "error" ? 0 : 1;
    current.total_amount = moneyValue(current.total_amount + (row.amount ?? 0));
    current.age_days_total += row.age_days ?? 0;
    current.oldest_age_days = Math.max(current.oldest_age_days, row.age_days ?? 0);
    matterGroups.set(row.matter_id, current);
  }
  const matters = [...matterGroups.values()]
    .sort((left, right) => left.matter_id.localeCompare(right.matter_id))
    .map((group) => Object.freeze({ ...group }));
  return Object.freeze({
    tenant_id: tenantId,
    matter_id: matterId,
    as_of_date: asOfDate,
    rows: Object.freeze(rows),
    eligible_source_sets: Object.freeze(eligibleSourceSets),
    matters: Object.freeze(matters),
    totals: Object.freeze({
      item_count: matters.reduce((total, group) => total + group.item_count, 0),
      ready_count: matters.reduce((total, group) => total + group.ready_count, 0),
      error_count: matters.reduce((total, group) => total + group.error_count, 0),
      total_amount: moneyValue(matters.reduce((total, group) => total + group.total_amount, 0)),
      age_days_total: matters.reduce((total, group) => total + group.age_days_total, 0),
    }),
  });
}

export function generateWipFromApprovedItems({
  repository,
  tenant_id,
  matter_id,
  source_items,
  rate_card,
  fee_arrangement,
  fee_arrangement_id,
  actor_id,
  idempotency_key,
} = {}) {
  requiredString({ tenant_id }, "tenant_id");
  requiredString({ matter_id }, "matter_id");
  requiredString({ actor_id }, "actor_id");
  requiredString({ idempotency_key }, "idempotency_key");
  const automaticSourceSelection = source_items == null;
  const idempotencyBase = {
    tenant_id,
    idempotency_key,
    operation: "wip_generate",
    actor_id,
    object_type: "Matter",
    object_id: matter_id,
  };
  const priorAutomaticReceipt = automaticSourceSelection
    ? repository.getIdempotency(idempotencyBase)
    : null;
  const selectedSourceItems = priorAutomaticReceipt
    ? priorAutomaticReceipt.response?.wip_items?.map((item) => {
        const modelType = requiredString({
          model_type: item.source_model_type,
        }, "model_type");
        const idField = WIP_SOURCE_ID_FIELDS[modelType];
        if (!idField) throw new Error("stored WIP source item model_type is not billable");
        return {
          model_type: modelType,
          [idField]: item.source_id,
          tenant_id: item.tenant_id,
          matter_id: item.matter_id,
        };
      })
    : source_items;
  let approved = canonicalWipSources({
    repository,
    tenant_id,
    matter_id,
    source_items: selectedSourceItems,
  })
    .sort((left, right) =>
      left.item.model_type.localeCompare(right.item.model_type) ||
      String(left.source_id).localeCompare(String(right.source_id)));
  const existingSources = new Set(
    repository
      .list({ tenant_id, matter_id, model_type: "WipItem" })
      .map((item) => wipSourceKey(item)),
  );
  if (automaticSourceSelection && !priorAutomaticReceipt) {
    approved = approved.filter(({ item, source_id }) =>
      !existingSources.has(wipSourceKey(item, source_id)));
  }
  if (approved.length === 0) throw new Error("approved billable source item is required");
  const { arrangement, rateCard, createArrangement } = canonicalWipBillingTerms({
    repository,
    tenant_id,
    matter_id,
    approved,
    rate_card,
    fee_arrangement,
    fee_arrangement_id,
  });
  const sourceSet = wipSourceSetIdentity({
    tenant_id,
    matter_id,
    sources: approved,
  });
  const idempotency = {
    ...idempotencyBase,
    request: automaticSourceSelection
      ? {
          tenant_id,
          matter_id,
          source_selection: "eligible_new_sources",
          rate_card_id: rateCard?.rate_card_id ?? null,
          fee_arrangement_id: arrangement?.fee_arrangement_id ?? null,
        }
      : {
          tenant_id,
          matter_id,
          source_refs: approved.map(({ item, source_id }) => ({
            source_model_type: item.model_type,
            source_id,
          })),
          rate_card_id: rateCard?.rate_card_id ?? null,
          fee_arrangement_id: arrangement?.fee_arrangement_id ?? null,
        },
  };
  const replay = repository.getIdempotency(idempotency);
  if (replay) return Object.freeze({ ...replay.response, idempotent_replay: true });
  const sourceKeys = new Set();
  for (const { item, source_id } of approved) {
    const sourceKey = `${item.model_type}:${source_id}`;
    if (sourceKeys.has(sourceKey)) throw new Error("approved billable source item is duplicated");
    sourceKeys.add(sourceKey);
  }
  if (approved.some(({ item, source_id }) => existingSources.has(wipSourceKey(item, source_id)))) {
    const error = new Error("WIP source item already exists for this matter");
    error.code = "FINANCE_WIP_SOURCE_CONFLICT";
    error.status = 409;
    error.status_code = 409;
    throw error;
  }

  return repository.transaction((tx) => {
    const canonicalArrangement = createArrangement ? tx.create(arrangement) : arrangement;
    const legacySourceRefs = canonicalArrangement?.server_created_default === true
      ? approved.filter(({ item }) => isLegacyTimeEntryForDefaultTerms(item)).map(({ source_id }) => source_id)
      : [];
    const consumption = feeArrangementConsumption({
      repository: tx,
      tenant_id,
      matter_id,
      feeArrangement: canonicalArrangement,
    });
    let fixedFeeApplied = consumption.fixedFeeApplied;
    let upfrontFeeApplied = consumption.upfrontFeeApplied;
    let successFeeApplied = consumption.successFeeApplied;
    let retainerRemaining = moneyValue(
      retainerAvailableAmount(canonicalArrangement) - consumption.retainerDrawdownTotal,
    );
    const wip_items = approved.map(({ item, source_id }) => {
      const calculation = calculateWipAmountForSource({
        item,
        rateCard,
        feeArrangement: canonicalArrangement,
        fixedFeeApplied,
        upfrontFeeApplied,
        successFeeApplied,
        retainerRemaining,
      });
      if (item.model_type === "TimeEntry") {
        fixedFeeApplied ||= calculation.fixed_fee_applied;
        upfrontFeeApplied ||= calculation.upfront_fee_applied;
        successFeeApplied ||= calculation.success_fee_applied;
        retainerRemaining = moneyValue(retainerRemaining - calculation.retainer_drawdown_amount);
      }
      return tx.create({
        model_type: "WipItem",
        wip_item_id: `wip:${tenant_id}:${matter_id}:${item.model_type}:${source_id}`,
        tenant_id,
        matter_id,
        source_model_type: item.model_type,
        source_id,
        source_set_id: sourceSet.source_set_id,
        amount: calculation.amount,
        standard_amount: calculation.standard_amount,
        fee_arrangement_id: canonicalArrangement?.fee_arrangement_id ?? null,
        fee_arrangement_type: calculation.fee_arrangement_type,
        billing_calculation_source: calculation.billing_calculation_source,
        retainer_drawdown_amount: calculation.retainer_drawdown_amount,
        fixed_fee_applied: calculation.fixed_fee_applied,
        upfront_fee_applied: calculation.upfront_fee_applied,
        success_fee_applied: calculation.success_fee_applied,
        currency: rateCard?.currency ?? item.currency ?? "KRW",
        status: "open",
      });
    });
    const auditEvent = appendFinanceAuditEvent({
      repository: tx,
      event: {
        tenant_id,
        actor_id,
        action: "wip.generate",
        object_type: "Matter",
        object_id: matter_id,
        idempotency_key,
        metadata: {
          wip_item_count: wip_items.length,
          source_set_id: sourceSet.source_set_id,
          source_refs: sourceSet.source_refs,
          fee_arrangement_id: canonicalArrangement?.fee_arrangement_id ?? null,
          fee_arrangement_type: canonicalArrangement ? normalizeFeeArrangementType(canonicalArrangement) : "hourly",
          legacy_compatibility_predicate: canonicalArrangement?.legacy_compatibility_predicate ?? null,
          legacy_source_refs: legacySourceRefs,
        },
      },
    });
    const response = Object.freeze({
      outcome: "created",
      source_set_id: sourceSet.source_set_id,
      source_refs: sourceSet.source_refs,
      wip_items: Object.freeze(wip_items),
      audit_event: auditEvent,
      idempotent_replay: false,
    });
    tx.recordIdempotency({ ...idempotency, response });
    return response;
  });
}

export function lockWipSnapshot({ repository, tenant_id, matter_id, wip_item_ids, actor_id, idempotency_key, wip_snapshot_id } = {}) {
  requiredString({ tenant_id }, "tenant_id");
  requiredString({ matter_id }, "matter_id");
  requiredString({ actor_id }, "actor_id");
  requiredString({ idempotency_key }, "idempotency_key");
  const selectedIds = [...(wip_item_ids ?? [])].sort();
  const items = repository
    .list({ tenant_id, matter_id, model_type: "WipItem" })
    .filter((item) => selectedIds.includes(item.wip_item_id))
    .sort((left, right) => left.wip_item_id.localeCompare(right.wip_item_id));
  if (!Array.isArray(wip_item_ids) || wip_item_ids.length === 0 || items.length !== wip_item_ids.length) {
    throw new Error("WIP snapshot item refs must match source WIP items");
  }
  const sourceSet = wipSourceSetIdentity({
    tenant_id,
    matter_id,
    sources: items,
  });
  const idempotency = {
    tenant_id,
    idempotency_key,
    operation: "wip_snapshot_lock",
    actor_id,
    object_type: "Matter",
    object_id: matter_id,
    request: {
      tenant_id,
      matter_id,
      wip_item_ids: selectedIds,
      source_set_id: sourceSet.source_set_id,
      wip_snapshot_id: wip_snapshot_id ?? null,
    },
  };
  const replay = repository.getIdempotency(idempotency);
  if (replay) return Object.freeze({ ...replay.response, idempotent_replay: true });
  if (items.some((item) => item.status !== "open")) throw new Error("WIP snapshot requires open WIP items");
  return repository.transaction((tx) => {
    const feeArrangementIds = new Set(items.map((item) => item.fee_arrangement_id).filter(Boolean));
    const feeArrangementTypes = new Set(items.map((item) => item.fee_arrangement_type).filter(Boolean));
    const snapshot = tx.create({
      model_type: "WipSnapshot",
      wip_snapshot_id: wip_snapshot_id
        ?? `snapshot:${tenant_id}:${matter_id}:${sourceSet.source_set_fingerprint}`,
      tenant_id,
      matter_id,
      source_set_id: sourceSet.source_set_id,
      source_refs: sourceSet.source_refs,
      item_refs: Object.freeze(selectedIds),
      item_snapshots: Object.freeze(items.map((item) => Object.freeze({
        wip_item_id: item.wip_item_id,
        source_model_type: item.source_model_type,
        source_id: item.source_id,
        amount: item.amount,
        standard_amount: item.standard_amount ?? item.amount,
        currency: item.currency,
      }))),
      locked_at: new Date().toISOString(),
      immutable_snapshot: true,
      total_amount: moneyValue(items.reduce((sum, item) => sum + Number(item.amount ?? 0), 0)),
      standard_amount: moneyValue(items.reduce((sum, item) => sum + Number(item.standard_amount ?? item.amount ?? 0), 0)),
      retainer_drawdown_total: moneyValue(items.reduce((sum, item) => sum + Number(item.retainer_drawdown_amount ?? 0), 0)),
      success_fee_applied: items.some((item) => item.success_fee_applied === true),
      fee_arrangement_id: feeArrangementIds.size === 1 ? feeArrangementIds.values().next().value : null,
      fee_arrangement_type: feeArrangementTypes.size === 1 ? feeArrangementTypes.values().next().value : "mixed",
      status: "locked",
    });
    for (const item of items) tx.update({ tenant_id, model_type: "WipItem", wip_item_id: item.wip_item_id }, { status: "locked", updates_database_rows: true });
    const auditEvent = appendFinanceAuditEvent({
      repository: tx,
      event: {
        tenant_id,
        actor_id,
        action: "wip.snapshot.lock",
        object_type: "WipSnapshot",
        object_id: snapshot.wip_snapshot_id,
        idempotency_key,
        metadata: {
          source_set_id: sourceSet.source_set_id,
          source_refs: sourceSet.source_refs,
        },
      },
    });
    const response = Object.freeze({ outcome: "created", wip_snapshot: snapshot, audit_event: auditEvent, idempotent_replay: false });
    tx.recordIdempotency({ ...idempotency, response });
    return response;
  });
}
