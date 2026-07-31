import { createHash } from "node:crypto";
import { stableJsonStringify } from "../../persistence/src/durable-file.js";
import { appendFinanceAuditEvent } from "./finance-audit.js";

export const BANK_CLASSIFICATION_CATEGORIES = Object.freeze({
  client_receipt: Object.freeze({ primary_type: "sales", label: "고객 입금" }),
  salary_payment: Object.freeze({ primary_type: "payroll", label: "급여 지급" }),
  tax: Object.freeze({ primary_type: "operating_expense", label: "세금" }),
  social_insurance: Object.freeze({ primary_type: "operating_expense", label: "4대보험" }),
  card_settlement: Object.freeze({ primary_type: "operating_expense", label: "카드대금" }),
  professional_services: Object.freeze({ primary_type: "operating_expense", label: "용역·외주" }),
  rent_office: Object.freeze({ primary_type: "operating_expense", label: "임차·사무실" }),
  finance_lease: Object.freeze({ primary_type: "operating_expense", label: "금융·리스" }),
  case_disbursement: Object.freeze({ primary_type: "operating_expense", label: "사건비용" }),
  bank_postage_fee: Object.freeze({ primary_type: "operating_expense", label: "수수료·우편" }),
  general_operating: Object.freeze({ primary_type: "operating_expense", label: "기타 운영비" }),
  related_party_transfer: Object.freeze({ primary_type: "non_operating", label: "관계사 자금이동" }),
  vehicle_financing: Object.freeze({ primary_type: "non_operating", label: "차량금융" }),
  security_deposit: Object.freeze({ primary_type: "non_operating", label: "보증금" }),
  interest_income: Object.freeze({ primary_type: "non_operating", label: "이자수입" }),
  refund_reversal: Object.freeze({ primary_type: "non_operating", label: "취소·환급" }),
  other_inflow: Object.freeze({ primary_type: "non_operating", label: "기타 입금" }),
  zero_amount_source: Object.freeze({ primary_type: "non_operating", label: "0원 원천기록" }),
});

const INACTIVE_STATUSES = new Set(["archived", "deleted", "inactive", "merged", "closed"]);
const CLIENT_CANONICAL_NAME_FIELDS = Object.freeze([
  "display_name",
  "canonical_display_name",
  "legal_name",
  "name",
  "organization_name",
]);
const CLIENT_SAVED_ALIAS_FIELDS = Object.freeze([
  "alias_value",
  "aliases",
  "alternate_names",
  "name_variants",
  "approved_aliases",
  "approved_bank_aliases",
  "bank_deposit_aliases",
]);
const PARTY_ALIAS_BANK_DEPOSITOR_TYPE = "bank_depositor_name";
const RULE_MATCH_FIELDS = new Set(["counterparty", "memo"]);
const REFUND_TEXT_PATTERN = /매출취소|환급|환불|취소/iu;
const PAYROLL_CATEGORIES = new Set(["partner", "advisor", "staff"]);
const PAYROLL_TITLE_RULES = Object.freeze([
  Object.freeze({ category: "partner", pattern: /partner|파트너|대표변호사|구성원변호사/iu }),
  Object.freeze({ category: "advisor", pattern: /advisor|adviser|counsel|고문|자문위원|자문역/iu }),
]);
const AUTO_CLASSIFICATION_ACTION = "bank.transaction.classification.auto";
const REVIEW_CLASSIFICATION_ACTION = "bank.transaction.classification.review";

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function stableId(prefix, value) {
  return `${prefix}_${createHash("sha256").update(String(value)).digest("hex").slice(0, 24)}`;
}

function freeze(value) {
  return Object.freeze(value);
}

function commandFingerprint({ action, tenantId, actorId, payload }) {
  return createHash("sha256")
    .update(stableJsonStringify({
      action,
      tenant_id: tenantId,
      actor_id: actorId,
      payload,
    }))
    .digest("hex");
}

function classificationConflict(message, safeErrorCode, status = 409) {
  return Object.assign(new TypeError(message), {
    safe_error_code: safeErrorCode,
    status,
  });
}

export function resolveBankClassificationCommandReplay({
  repository,
  tenant_id,
  actor_id,
  idempotency_key,
  action,
  payload,
} = {}) {
  const tenantId = requiredString({ tenant_id }, "tenant_id");
  const actorId = requiredString({ actor_id }, "actor_id");
  const idempotencyKey = requiredString({ idempotency_key }, "idempotency_key");
  const commandAction = requiredString({ action }, "action");
  const requestFingerprint = commandFingerprint({
    action: commandAction,
    tenantId,
    actorId,
    payload,
  });
  const replay = repository.getIdempotency({
    tenant_id: tenantId,
    idempotency_key: idempotencyKey,
  });
  if (!replay) return null;
  if (
    replay.operation !== commandAction
    || replay.request_fingerprint !== requestFingerprint
  ) {
    throw classificationConflict(
      "idempotency_key is already bound to another bank classification request",
      "FINANCE_IDEMPOTENCY_CONFLICT",
    );
  }
  return freeze({ ...replay.response, idempotent_replay: true });
}

export function bankTransactionClassificationId(transaction) {
  return stableId("bank_classification", `${transaction.tenant_id}|${transaction.bank_transaction_id}`);
}

export function normalizeBankMatchValue(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/주식회사|유한회사|법무법인|회계법인|세무법인|법률사무소|\(주\)|㈜/gu, "")
    .replace(/[^0-9a-z가-힣]/gu, "");
}

function namesOf(record = {}, fields = []) {
  const values = fields.flatMap((field) => {
    const value = record[field];
    return Array.isArray(value) ? value : [value];
  });
  return [...new Set(values.map(normalizeBankMatchValue).filter(Boolean))];
}

function active(record = {}) {
  return !INACTIVE_STATUSES.has(String(record.status ?? "active").trim().toLowerCase());
}

function buildClientDirectory(records = []) {
  const groups = new Map(
    records
      .filter((record) => record.model_type === "ClientGroup" && active(record))
      .map((record) => [record.client_group_id, record]),
  );
  const clientIdByEntity = new Map();
  const clientIdByParty = new Map();
  for (const group of groups.values()) {
    for (const entityId of [group.primary_entity_id, group.canonical_entity_id, ...(group.member_entity_ids ?? [])].filter(Boolean)) {
      clientIdByEntity.set(entityId, group.client_group_id);
    }
    for (const partyId of [group.primary_party_id, ...(group.member_party_ids ?? [])].filter(Boolean)) {
      clientIdByParty.set(partyId, group.client_group_id);
    }
  }

  const namesByClient = new Map([...groups].map(([clientId, group]) => [clientId, {
    canonical_names: new Set(namesOf(group, CLIENT_CANONICAL_NAME_FIELDS)),
    saved_aliases: new Set(namesOf(group, CLIENT_SAVED_ALIAS_FIELDS)),
  }]));
  for (const record of records.filter(active)) {
    const clientId = record.model_type === "ClientGroup"
      ? record.client_group_id
      : record.canonical_client_group_id
        ?? clientIdByEntity.get(record.entity_id)
        ?? clientIdByParty.get(record.party_id);
    if (!clientId || !groups.has(clientId)) continue;
    const names = namesByClient.get(clientId);
    for (const name of namesOf(record, CLIENT_CANONICAL_NAME_FIELDS)) names.canonical_names.add(name);
    const activeBankDepositorAlias = record.model_type === "PartyAlias"
      && String(record.status ?? "").trim().toLowerCase() === "active"
      && record.alias_type === PARTY_ALIAS_BANK_DEPOSITOR_TYPE;
    const savedAliases = record.model_type === "PartyAlias"
      ? activeBankDepositorAlias
        ? namesOf(record, ["alias_value"])
        : []
      : namesOf(record, CLIENT_SAVED_ALIAS_FIELDS);
    for (const alias of savedAliases) names.saved_aliases.add(alias);
  }

  return [...groups.values()].map((group) => freeze({
    client_group_id: group.client_group_id,
    display_name: group.display_name ?? group.canonical_display_name ?? group.client_group_id,
    canonical_names: freeze([...namesByClient.get(group.client_group_id).canonical_names]),
    saved_aliases: freeze([...namesByClient.get(group.client_group_id).saved_aliases]),
  }));
}

function clientMatch(counterparty, clientRecords) {
  const value = normalizeBankMatchValue(counterparty);
  if (!value) return freeze({ client: null, match_kind: "no_registered_client_match", confidence: "needs_review" });
  const directory = buildClientDirectory(clientRecords);
  const exact = directory.filter((client) => (
    client.canonical_names.includes(value) || client.saved_aliases.includes(value)
  ));
  if (exact.length === 1) {
    return freeze({
      client: exact[0],
      match_kind: exact[0].canonical_names.includes(value) ? "client_exact" : "client_saved_alias",
      confidence: "high",
    });
  }
  if (exact.length > 1) {
    return freeze({ client: null, match_kind: "client_name_ambiguous", confidence: "needs_review" });
  }
  const partial = directory.filter((client) => (
    [...client.canonical_names, ...client.saved_aliases].some((name) => (
      Math.min(name.length, value.length) >= 4 && (name.startsWith(value) || value.startsWith(name))
    ))
  ));
  if (partial.length > 0) {
    return freeze({ client: null, match_kind: "client_partial_name", confidence: "needs_review" });
  }
  return freeze({ client: null, match_kind: "no_registered_client_match", confidence: "needs_review" });
}

function employeeMatch(transaction, employees = []) {
  const salaryText = `${transaction.counterparty ?? ""} ${transaction.memo ?? ""}`;
  if (!/급여|상여/iu.test(`${transaction.source_category ?? ""} ${salaryText}`)) return null;
  const normalizedMemo = normalizeBankMatchValue(transaction.memo);
  const normalizedCounterparty = normalizeBankMatchValue(transaction.counterparty);
  const matches = employees.filter((employee) => {
    if (!active(employee)) return false;
    const aliases = [employee.display_name, employee.legal_name, ...(employee.aliases ?? [])]
      .map(normalizeBankMatchValue)
      .filter(Boolean);
    return aliases.some((alias) => (
      normalizedMemo === alias
      || normalizedCounterparty.endsWith(alias)
      || (alias.length >= 3 && normalizedCounterparty.includes(alias))
    ));
  });
  return matches.length === 1 ? matches[0] : null;
}

export function bankPayrollCategory(title) {
  const normalized = String(title ?? "").trim();
  return PAYROLL_TITLE_RULES.find((rule) => rule.pattern.test(normalized))?.category ?? "staff";
}

export function bankEmployeePayrollCategory(employee = {}) {
  const explicit = String(employee.payroll_category ?? "").trim();
  return PAYROLL_CATEGORIES.has(explicit) ? explicit : bankPayrollCategory(employee.title);
}

function matchingRule(transaction, rules = []) {
  const matches = rules
    .filter((rule) => rule.model_type === "BankClassificationRule" && rule.status !== "inactive")
    .filter((rule) => rule.category !== "refund_reversal")
    .filter((rule) => RULE_MATCH_FIELDS.has(rule.match_field))
    .filter((rule) => normalizeBankMatchValue(transaction[rule.match_field]) === rule.normalized_match_value)
    .sort((left, right) => Number(right.priority ?? 0) - Number(left.priority ?? 0));
  return matches[0] ?? null;
}

function classificationProposal(transaction, values) {
  const category = requiredString(values, "category");
  const contract = BANK_CLASSIFICATION_CATEGORIES[category];
  if (!contract) throw new TypeError(`Unsupported bank classification category: ${category}`);
  if (contract.primary_type === "sales" && (transaction.direction !== "inflow" || !values.client_group_id)) {
    throw new TypeError("Sales classification requires an inflow linked to a client");
  }
  if (contract.primary_type === "payroll" && transaction.direction !== "outflow") {
    throw new TypeError("Payroll classification requires an outflow");
  }
  if (contract.primary_type === "operating_expense" && transaction.direction !== "outflow") {
    throw new TypeError("Operating expense classification requires an outflow");
  }
  return freeze({
    model_type: "BankTransactionClassification",
    bank_transaction_classification_id: bankTransactionClassificationId(transaction),
    tenant_id: transaction.tenant_id,
    bank_transaction_id: transaction.bank_transaction_id,
    account_ref: transaction.account_ref,
    transaction_date: transaction.date,
    transaction_month: transaction.date.slice(0, 7),
    transaction_direction: transaction.direction,
    amount: Number(transaction.amount),
    currency: transaction.currency,
    primary_type: contract.primary_type,
    category,
    category_label: contract.label,
    client_group_id: contract.primary_type === "sales" || category === "refund_reversal"
      ? values.client_group_id ?? null
      : null,
    employee_id: contract.primary_type === "payroll" ? values.employee_id ?? null : null,
    matter_id: values.matter_id ?? null,
    payroll_category: contract.primary_type === "payroll" ? values.payroll_category ?? "unclassified" : null,
    status: values.status ?? "confirmed",
    confidence: values.confidence ?? "high",
    classification_source: values.classification_source ?? "automatic",
    rationale_code: values.rationale_code ?? "deterministic_fallback",
    manual_lock: values.manual_lock === true,
    refund_of_bank_transaction_id: category === "refund_reversal"
      ? values.refund_of_bank_transaction_id ?? null
      : null,
    rule_id: values.rule_id ?? null,
    reviewed_by: values.reviewed_by ?? null,
    reviewed_at: values.reviewed_at ?? null,
    state_version: Number(values.state_version ?? 1),
    raw_source_payload_included: false,
    invoice_required: false,
    matter_required: false,
    allocation_required_for_revenue: category === "client_receipt",
    revenue_effect: category === "client_receipt" ? "candidate_only" : "none",
  });
}

function automaticProposal(transaction, { client_records = [], employees = [], rules = [] } = {}) {
  const rule = matchingRule(transaction, rules);
  if (rule) {
    return classificationProposal(transaction, {
      ...rule,
      rule_id: rule.bank_classification_rule_id,
      classification_source: "saved_rule",
      rationale_code: rule.category === "client_receipt"
        ? "client_saved_alias"
        : "saved_exact_counterparty_rule",
      confidence: "high",
    });
  }

  if (transaction.zero_amount_source_record === true || Number(transaction.amount) === 0) {
    return classificationProposal(transaction, {
      category: "zero_amount_source",
      rationale_code: "zero_amount_source_record",
    });
  }

  if (transaction.direction === "inflow") {
    const matchedClient = clientMatch(transaction.counterparty, client_records);
    if (matchedClient.client) {
      return classificationProposal(transaction, {
        category: "client_receipt",
        client_group_id: matchedClient.client.client_group_id,
        rationale_code: matchedClient.match_kind,
        confidence: matchedClient.confidence,
      });
    }
    if (transaction.classification_scope === "petra_bridge" || /페트라브릿/iu.test(transaction.counterparty ?? "")) {
      return classificationProposal(transaction, {
        category: "related_party_transfer",
        rationale_code: "related_party_scope_or_counterparty",
      });
    }
    if (transaction.classification_scope === "vehicle_financing") {
      return classificationProposal(transaction, {
        category: "vehicle_financing",
        rationale_code: "vehicle_financing_scope",
      });
    }
    if (/이자/iu.test(`${transaction.source_category ?? ""} ${transaction.counterparty ?? ""}`)) {
      return classificationProposal(transaction, {
        category: "interest_income",
        rationale_code: "interest_income_source",
      });
    }
    if (REFUND_TEXT_PATTERN.test(`${transaction.counterparty ?? ""} ${transaction.memo ?? ""}`)) {
      return classificationProposal(transaction, {
        category: "refund_reversal",
        rationale_code: "refund_or_reversal_text",
      });
    }
    return classificationProposal(transaction, {
      category: "other_inflow",
      status: "review_required",
      confidence: matchedClient.confidence,
      rationale_code: matchedClient.match_kind,
    });
  }

  if (REFUND_TEXT_PATTERN.test(`${transaction.source_category ?? ""} ${transaction.counterparty ?? ""} ${transaction.memo ?? ""}`)) {
    return classificationProposal(transaction, {
      category: "refund_reversal",
      status: "review_required",
      confidence: "needs_review",
      rationale_code: "refund_link_required",
    });
  }

  const employee = employeeMatch(transaction, employees);
  if (employee) {
    return classificationProposal(transaction, {
      category: "salary_payment",
      employee_id: employee.employee_id,
      payroll_category: bankEmployeePayrollCategory(employee),
      rationale_code: "salary_month_and_employee_exact",
    });
  }
  if (/급여|상여/iu.test(`${transaction.source_category ?? ""} ${transaction.counterparty ?? ""} ${transaction.memo ?? ""}`)) {
    return classificationProposal(transaction, {
      category: "salary_payment",
      payroll_category: "unclassified",
      rationale_code: "salary_source_without_employee_match",
      confidence: "medium",
    });
  }
  if (transaction.classification_scope === "petra_bridge") {
    return classificationProposal(transaction, {
      category: "related_party_transfer",
      rationale_code: "related_party_scope",
    });
  }
  if (transaction.classification_scope === "vehicle_financing") {
    return classificationProposal(transaction, {
      category: "vehicle_financing",
      rationale_code: "vehicle_financing_scope",
    });
  }
  if (/보증금/iu.test(transaction.source_category ?? "")) {
    return classificationProposal(transaction, {
      category: "security_deposit",
      rationale_code: "security_deposit_source",
    });
  }

  const text = `${transaction.source_category ?? ""} ${transaction.method ?? ""} ${transaction.counterparty ?? ""} ${transaction.memo ?? ""}`;
  const mapped = [
    ["social_insurance", /보험료|국민건강|국민연금|고용보험|산재보험/iu],
    ["card_settlement", /카드대금|카드인터넷/iu],
    ["tax", /세금|국세|지방세|원천세|부가세|세무서/iu],
    ["professional_services", /용역|외주|세무대행|전산|프로필촬영|패스포토/iu],
    ["rent_office", /임대|임차|사무실|관리비|씨이오스위트/iu],
    ["case_disbursement", /송달|대법원|전자소|증표|대납|과태료|자동차세|통행료/iu],
    ["bank_postage_fee", /수수료|우체국|우정사업본부|UMS|공공기관_KPN/iu],
    ["finance_lease", /금융|리스|캐피탈/iu],
  ].find(([, pattern]) => pattern.test(text));
  return classificationProposal(transaction, {
    category: mapped?.[0] ?? "general_operating",
    rationale_code: mapped ? `deterministic_${mapped[0]}` : "operating_outflow_fallback",
    confidence: mapped ? "high" : "medium",
  });
}

export function previewBankTransactionClassifications({
  transactions = [],
  client_records = [],
  employees = [],
  rules = [],
} = {}) {
  const classifications = transactions.map((transaction) => automaticProposal(transaction, {
    client_records,
    employees,
    rules,
  }));
  return freeze({
    classifications: freeze(classifications),
    summary: summarizeBankTransactionClassifications(classifications),
  });
}

export function summarizeBankTransactionClassifications(classifications = []) {
  const categories = new Map();
  const primaryTypes = new Map();
  for (const classification of classifications) {
    const category = categories.get(classification.category) ?? {
      category: classification.category,
      label: classification.category_label,
      primary_type: classification.primary_type,
      transaction_count: 0,
      amount: 0,
    };
    category.transaction_count += 1;
    category.amount += Number(classification.amount ?? 0);
    categories.set(classification.category, category);
    const primary = primaryTypes.get(classification.primary_type) ?? {
      primary_type: classification.primary_type,
      transaction_count: 0,
      amount: 0,
    };
    primary.transaction_count += 1;
    primary.amount += Number(classification.amount ?? 0);
    primaryTypes.set(classification.primary_type, primary);
  }
  return freeze({
    transaction_count: classifications.length,
    confirmed_count: classifications.filter((row) => row.status === "confirmed").length,
    review_count: classifications.filter((row) => row.status !== "confirmed").length,
    categories: freeze([...categories.values()].map((row) => freeze({ ...row }))),
    primary_types: freeze([...primaryTypes.values()].map((row) => freeze({ ...row }))),
  });
}

function classificationCommandReceipt(record) {
  return freeze({
    bank_transaction_id: record.bank_transaction_id,
    bank_transaction_classification_id:
      record.bank_transaction_classification_id,
    state_version: record.state_version,
    category: record.category,
    status: record.status,
    client_group_id: record.client_group_id ?? null,
    employee_id: record.employee_id ?? null,
    refund_of_bank_transaction_id:
      record.refund_of_bank_transaction_id ?? null,
  });
}

function persistClassifications({
  repository,
  tenant_id,
  classifications,
  actor_id,
  idempotency_key,
  action,
  rules = [],
  request_fingerprint,
  expected_state_versions = new Map(),
  receipt_transaction_ids = null,
} = {}) {
  const tenantId = requiredString({ tenant_id }, "tenant_id");
  const actorId = requiredString({ actor_id }, "actor_id");
  const idempotencyKey = requiredString({ idempotency_key }, "idempotency_key");
  const requestFingerprint = requiredString(
    { request_fingerprint },
    "request_fingerprint",
  );
  const replay = repository.getIdempotency({ tenant_id: tenantId, idempotency_key: idempotencyKey });
  if (replay) {
    if (
      replay.operation !== action
      || replay.request_fingerprint !== requestFingerprint
    ) {
      throw classificationConflict(
        "idempotency_key is already bound to another bank classification request",
        "FINANCE_IDEMPOTENCY_CONFLICT",
      );
    }
    return freeze({ ...replay.response, idempotent_replay: true });
  }

  return repository.transaction((tx) => {
    let createdCount = 0;
    let updatedCount = 0;
    let protectedManualCount = 0;
    const receipts = [];
    const summaryRecords = [];
    for (const classification of classifications) {
      const existing = tx.get({
        tenant_id: tenantId,
        model_type: "BankTransactionClassification",
        id: classification.bank_transaction_classification_id,
      });
      const expectedVersion = expected_state_versions.get(
        classification.bank_transaction_id,
      );
      const currentVersion = Number(existing?.state_version ?? 0);
      if (
        expectedVersion !== undefined
        && (
          !Number.isSafeInteger(expectedVersion)
          || expectedVersion < 0
          || expectedVersion !== currentVersion
        )
      ) {
        throw classificationConflict(
          "Bank classification state_version is stale",
          "FINANCE_BANK_CLASSIFICATION_VERSION_CONFLICT",
        );
      }
      if (
        (existing?.manual_lock === true || existing?.classification_source === "manual_review")
        && classification.classification_source !== "manual_review"
      ) {
        protectedManualCount += 1;
        if (
          receipt_transaction_ids === null
          || receipt_transaction_ids.has(classification.bank_transaction_id)
        ) {
          summaryRecords.push(existing);
          receipts.push(classificationCommandReceipt(existing));
        }
        continue;
      }
      const next = freeze({
        ...classification,
        state_version: currentVersion + 1,
        created_at: existing?.created_at,
      });
      let persisted;
      if (existing) {
        persisted = tx.update({
          tenant_id: tenantId,
          model_type: "BankTransactionClassification",
          id: classification.bank_transaction_classification_id,
        }, next);
        updatedCount += 1;
      } else {
        persisted = tx.create(next);
        createdCount += 1;
      }
      if (
        receipt_transaction_ids === null
        || receipt_transaction_ids.has(classification.bank_transaction_id)
      ) {
        summaryRecords.push(persisted);
        receipts.push(classificationCommandReceipt(persisted));
      }
    }
    for (const rule of rules) {
      const ref = {
        tenant_id: tenantId,
        model_type: "BankClassificationRule",
        id: rule.bank_classification_rule_id,
      };
      if (tx.get(ref)) tx.update(ref, rule);
      else tx.create(rule);
    }
    const summary = summarizeBankTransactionClassifications(summaryRecords);
    const auditEvent = appendFinanceAuditEvent({
      repository: tx,
      event: {
        tenant_id: tenantId,
        actor_id: actorId,
        action,
        object_type: "BankTransactionClassification",
        object_id: "bank-transaction-classification-batch",
        idempotency_key: idempotencyKey,
        metadata: {
          requested_count: classifications.length,
          created_count: createdCount,
          updated_count: updatedCount,
          protected_manual_count: protectedManualCount,
          rule_count: rules.length,
          linked_refund_count: classifications.filter((classification) => (
            classification.category === "refund_reversal"
            && classification.refund_of_bank_transaction_id
          )).length,
          confirmed_count: summary.confirmed_count,
          review_count: summary.review_count,
          raw_source_payload_included: false,
          individual_payroll_values_included: false,
        },
      },
    });
    const response = freeze({
      outcome: "classified",
      created_count: createdCount,
      updated_count: updatedCount,
      protected_manual_count: protectedManualCount,
      rule_count: rules.length,
      summary,
      classifications: freeze(receipts),
      idempotency_key: idempotencyKey,
      request_fingerprint: requestFingerprint,
      audit_event: auditEvent,
      idempotent_replay: false,
    });
    tx.recordIdempotency({
      tenant_id: tenantId,
      idempotency_key: idempotencyKey,
      operation: action,
      request_fingerprint: requestFingerprint,
      response,
    });
    return response;
  });
}

export function autoClassifyBankTransactions({
  repository,
  tenant_id,
  client_records = [],
  employees = [],
  actor_id,
  idempotency_key,
  bank_transaction_id = null,
  expected_state_version,
  bank_transaction_ids = null,
} = {}) {
  const tenantId = requiredString({ tenant_id }, "tenant_id");
  const actorId = requiredString({ actor_id }, "actor_id");
  const transactionId = bank_transaction_id === null
    ? null
    : requiredString({ bank_transaction_id }, "bank_transaction_id");
  if (bank_transaction_ids !== null && !Array.isArray(bank_transaction_ids)) {
    throw new TypeError(
      "bank_transaction_ids must contain unique transaction IDs",
    );
  }
  const allowedTransactionIds = bank_transaction_ids === null
    ? null
    : new Set(bank_transaction_ids.map((value) => requiredString(
        { bank_transaction_id: value },
        "bank_transaction_id",
      )));
  if (
    bank_transaction_ids !== null
    && allowedTransactionIds.size !== bank_transaction_ids.length
  ) {
    throw new TypeError("bank_transaction_ids must contain unique transaction IDs");
  }
  if (transactionId !== null && allowedTransactionIds !== null) {
    throw new TypeError(
      "bank_transaction_ids cannot be combined with bank_transaction_id",
    );
  }
  const requestPayload = {
    bank_transaction_id: transactionId,
    expected_state_version: transactionId === null
      ? null
      : expected_state_version,
  };
  const replay = resolveBankClassificationCommandReplay({
    repository,
    tenant_id: tenantId,
    actor_id: actorId,
    idempotency_key,
    action: AUTO_CLASSIFICATION_ACTION,
    payload: requestPayload,
  });
  if (replay) return replay;
  const allTransactions = repository.list({
    tenant_id: tenantId,
    model_type: "BankTransaction",
  });
  const transactions = transactionId === null
    ? allowedTransactionIds === null
      ? allTransactions
      : allTransactions.filter((transaction) => (
          allowedTransactionIds.has(transaction.bank_transaction_id)
        ))
    : allTransactions.filter((transaction) => (
        transaction.bank_transaction_id === transactionId
      ));
  if (transactionId !== null && transactions.length !== 1) {
    throw classificationConflict(
      "BankTransaction not found",
      "FINANCE_NOT_FOUND",
      404,
    );
  }
  if (
    transactionId !== null
    && (
      !Number.isSafeInteger(expected_state_version)
      || expected_state_version < 0
    )
  ) {
    throw new TypeError(
      "expected_state_version must be a non-negative integer for a targeted automatic classification",
    );
  }
  const rules = repository.list({ tenant_id: tenantId, model_type: "BankClassificationRule" });
  const preview = previewBankTransactionClassifications({
    transactions,
    client_records,
    employees,
    rules,
  });
  return persistClassifications({
    repository,
    tenant_id: tenantId,
    classifications: preview.classifications,
    actor_id: actorId,
    idempotency_key,
    action: AUTO_CLASSIFICATION_ACTION,
    request_fingerprint: commandFingerprint({
      action: AUTO_CLASSIFICATION_ACTION,
      tenantId,
      actorId,
      payload: requestPayload,
    }),
    expected_state_versions: transactionId === null
      ? new Map()
      : new Map([[transactionId, expected_state_version]]),
    receipt_transaction_ids: transactionId === null
      ? allowedTransactionIds
      : new Set([transactionId]),
  });
}

function reviewedRule(transaction, classification, decision, actorId) {
  if (decision.remember_match !== true) return null;
  if (classification.category === "refund_reversal") return null;
  const matchField = RULE_MATCH_FIELDS.has(decision.match_field) ? decision.match_field : "counterparty";
  const normalizedMatchValue = normalizeBankMatchValue(transaction[matchField]);
  if (!normalizedMatchValue) throw new TypeError("A remembered classification rule requires a non-empty match value");
  return freeze({
    model_type: "BankClassificationRule",
    bank_classification_rule_id: stableId(
      "bank_rule",
      `${transaction.tenant_id}|${matchField}|${normalizedMatchValue}`,
    ),
    tenant_id: transaction.tenant_id,
    match_field: matchField,
    normalized_match_value: normalizedMatchValue,
    category: classification.category,
    primary_type: classification.primary_type,
    client_group_id: classification.client_group_id,
    employee_id: classification.employee_id,
    matter_id: classification.matter_id,
    payroll_category: classification.payroll_category,
    priority: 100,
    status: "active",
    created_by: actorId,
    raw_source_payload_included: false,
  });
}

function refundError(message, safeErrorCode) {
  return Object.assign(new TypeError(message), {
    safe_error_code: safeErrorCode,
    status: 409,
  });
}

function refundLinkValues({
  repository,
  tenantId,
  transaction,
  decision,
  replacedTransactionIds,
  pendingRefundAmounts,
}) {
  if (transaction.direction !== "outflow") {
    throw refundError("A client refund must be an outflow", "FINANCE_REFUND_OUTFLOW_REQUIRED");
  }
  const originalTransactionId = requiredString(decision, "refund_of_bank_transaction_id");
  if (originalTransactionId === transaction.bank_transaction_id) {
    throw refundError("A refund cannot reference itself", "FINANCE_REFUND_ORIGINAL_INVALID");
  }
  if (replacedTransactionIds.has(originalTransactionId)) {
    throw refundError(
      "The original inflow cannot be reclassified in the same refund request",
      "FINANCE_REFUND_ORIGINAL_INVALID",
    );
  }
  const originalTransaction = repository.get({
    tenant_id: tenantId,
    model_type: "BankTransaction",
    id: originalTransactionId,
  });
  if (!originalTransaction || originalTransaction.direction !== "inflow") {
    throw refundError("The original client inflow was not found", "FINANCE_REFUND_ORIGINAL_INVALID");
  }
  const originalClassification = repository.get({
    tenant_id: tenantId,
    model_type: "BankTransactionClassification",
    id: bankTransactionClassificationId(originalTransaction),
  });
  if (
    originalClassification?.category !== "client_receipt"
    || originalClassification.status !== "confirmed"
    || !originalClassification.client_group_id
  ) {
    throw refundError(
      "The original inflow is not confirmed client revenue",
      "FINANCE_REFUND_ORIGINAL_NOT_REVENUE",
    );
  }
  if (
    decision.client_group_id
    && decision.client_group_id !== originalClassification.client_group_id
  ) {
    throw refundError(
      "A client refund must use the original receipt customer",
      "FINANCE_REFUND_CLIENT_MISMATCH",
    );
  }
  if (transaction.currency !== originalTransaction.currency) {
    throw refundError(
      "Refund currency must match the original inflow",
      "FINANCE_REFUND_CURRENCY_MISMATCH",
    );
  }
  const refundAmount = Number(transaction.amount);
  const originalAmount = Number(originalTransaction.amount);
  if (
    !Number.isSafeInteger(refundAmount)
    || refundAmount <= 0
    || !Number.isSafeInteger(originalAmount)
    || originalAmount <= 0
  ) {
    throw refundError(
      "Refund and original amounts must be positive whole KRW values",
      "FINANCE_REFUND_AMOUNT_INVALID",
    );
  }
  const persistedRefunds = repository
    .list({ tenant_id: tenantId, model_type: "BankTransactionClassification" })
    .filter((classification) => (
      classification.category === "refund_reversal"
      && classification.status === "confirmed"
      && classification.refund_of_bank_transaction_id === originalTransactionId
      && !replacedTransactionIds.has(classification.bank_transaction_id)
    ));
  if (persistedRefunds.some((classification) => (
    !Number.isSafeInteger(Number(classification.amount)) || Number(classification.amount) <= 0
  ))) {
    throw refundError("A stored refund amount is invalid", "FINANCE_REFUND_STATE_INVALID");
  }
  const persistedRefundAmount = persistedRefunds
    .reduce((total, classification) => total + Number(classification.amount), 0);
  const pendingRefundAmount = pendingRefundAmounts.get(originalTransactionId) ?? 0;
  const totalRefundAmount = persistedRefundAmount + pendingRefundAmount + refundAmount;
  if (!Number.isSafeInteger(totalRefundAmount)) {
    throw refundError("Refund total exceeds the supported KRW range", "FINANCE_REFUND_AMOUNT_INVALID");
  }
  if (totalRefundAmount > originalAmount) {
    throw refundError(
      "Refund total exceeds the original client inflow",
      "FINANCE_REFUND_AMOUNT_EXCEEDED",
    );
  }
  pendingRefundAmounts.set(originalTransactionId, pendingRefundAmount + refundAmount);
  return freeze({
    client_group_id: originalClassification.client_group_id,
    refund_of_bank_transaction_id: originalTransactionId,
  });
}

export function reviewBankTransactionClassifications({
  repository,
  tenant_id,
  decisions = [],
  actor_id,
  idempotency_key,
  require_expected_state_version = false,
} = {}) {
  const tenantId = requiredString({ tenant_id }, "tenant_id");
  const actorId = requiredString({ actor_id }, "actor_id");
  if (!Array.isArray(decisions) || decisions.length === 0 || decisions.length > 500) {
    throw new TypeError("decisions must contain 1 to 500 rows");
  }
  const transactionIds = new Set();
  for (const decision of decisions) {
    const bankTransactionId = requiredString(decision, "bank_transaction_id");
    if (
      require_expected_state_version
      && (
        !Number.isSafeInteger(decision.expected_state_version)
        || decision.expected_state_version < 0
      )
    ) {
      throw new TypeError(
        "expected_state_version must be a non-negative integer",
      );
    }
    if (transactionIds.has(bankTransactionId)) {
      throw new TypeError(`Duplicate classification decision: ${bankTransactionId}`);
    }
    transactionIds.add(bankTransactionId);
  }
  const replay = resolveBankClassificationCommandReplay({
    repository,
    tenant_id: tenantId,
    actor_id: actorId,
    idempotency_key,
    action: REVIEW_CLASSIFICATION_ACTION,
    payload: { decisions },
  });
  if (replay) return replay;
  const now = new Date().toISOString();
  const rules = [];
  const pendingRefundAmounts = new Map();
  const expectedStateVersions = new Map();
  const classifications = decisions.map((decision) => {
    const bankTransactionId = requiredString(decision, "bank_transaction_id");
    if (decision.expected_state_version !== undefined) {
      const expectedVersion = decision.expected_state_version;
      if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 0) {
        throw new TypeError(
          "expected_state_version must be a non-negative integer",
        );
      }
      expectedStateVersions.set(bankTransactionId, expectedVersion);
    }
    const transaction = repository.get({
      tenant_id: tenantId,
      model_type: "BankTransaction",
      id: bankTransactionId,
    });
    if (!transaction) throw new TypeError(`BankTransaction not found: ${bankTransactionId}`);
    const existing = repository.get({
      tenant_id: tenantId,
      model_type: "BankTransactionClassification",
      id: bankTransactionClassificationId(transaction),
    });
    const refundLink = decision.category === "refund_reversal"
      ? refundLinkValues({
          repository,
          tenantId,
          transaction,
          decision,
          replacedTransactionIds: transactionIds,
          pendingRefundAmounts,
        })
      : null;
    const clientLinkChanged = existing?.client_group_id !== decision.client_group_id;
    const rationaleCode = decision.category === "refund_reversal"
      ? "manual_refund_linked"
      : decision.category === "client_receipt"
        ? clientLinkChanged && existing?.client_group_id
          ? "manual_client_relinked"
          : "manual_client_linked"
        : existing?.client_group_id
          ? "manual_client_unlinked"
          : "manual_review_confirmed";
    const classification = classificationProposal(transaction, {
      category: decision.category,
      client_group_id: refundLink?.client_group_id ?? decision.client_group_id,
      refund_of_bank_transaction_id: refundLink?.refund_of_bank_transaction_id,
      employee_id: decision.employee_id,
      matter_id: decision.matter_id,
      payroll_category: decision.payroll_category,
      status: "confirmed",
      confidence: "reviewed",
      classification_source: "manual_review",
      rationale_code: rationaleCode,
      manual_lock: true,
      reviewed_by: actorId,
      reviewed_at: now,
    });
    const rule = reviewedRule(transaction, classification, decision, actorId);
    if (rule) rules.push(rule);
    return classification;
  });
  return persistClassifications({
    repository,
    tenant_id: tenantId,
    classifications,
    actor_id: actorId,
    idempotency_key,
    action: REVIEW_CLASSIFICATION_ACTION,
    rules,
    request_fingerprint: commandFingerprint({
      action: REVIEW_CLASSIFICATION_ACTION,
      tenantId,
      actorId,
      payload: { decisions },
    }),
    expected_state_versions: expectedStateVersions,
    receipt_transaction_ids: transactionIds,
  });
}
