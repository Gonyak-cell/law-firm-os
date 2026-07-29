import { createHash } from "node:crypto";
import { appendFinanceAuditEvent } from "./finance-audit.js";

export const BANK_CLASSIFICATION_CATEGORIES = Object.freeze({
  client_receipt: Object.freeze({ primary_type: "sales", label: "고객 매출" }),
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
const CLIENT_NAME_FIELDS = Object.freeze([
  "display_name",
  "canonical_display_name",
  "legal_name",
  "name",
  "organization_name",
  "alias_value",
]);
const RULE_MATCH_FIELDS = new Set(["counterparty", "memo"]);
const PAYROLL_TITLE_RULES = Object.freeze([
  Object.freeze({ category: "partner", pattern: /partner|파트너|대표변호사|구성원변호사/iu }),
  Object.freeze({ category: "advisor", pattern: /advisor|adviser|counsel|고문|자문위원|자문역/iu }),
]);

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

function classificationId(transaction) {
  return stableId("bank_classification", `${transaction.tenant_id}|${transaction.bank_transaction_id}`);
}

export function normalizeBankMatchValue(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/주식회사|유한회사|법무법인|회계법인|세무법인|법률사무소|\(주\)|㈜/gu, "")
    .replace(/[^0-9a-z가-힣]/gu, "");
}

function namesOf(record = {}) {
  const values = CLIENT_NAME_FIELDS.flatMap((field) => {
    const value = record[field];
    return Array.isArray(value) ? value : [value];
  });
  for (const field of ["aliases", "alternate_names", "name_variants"]) {
    if (Array.isArray(record[field])) values.push(...record[field]);
  }
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

  const aliasesByClient = new Map([...groups].map(([clientId, group]) => [clientId, new Set(namesOf(group))]));
  for (const record of records.filter(active)) {
    const clientId = record.model_type === "ClientGroup"
      ? record.client_group_id
      : record.canonical_client_group_id
        ?? clientIdByEntity.get(record.entity_id)
        ?? clientIdByParty.get(record.party_id);
    if (!clientId || !groups.has(clientId)) continue;
    const aliases = aliasesByClient.get(clientId);
    for (const alias of namesOf(record)) aliases.add(alias);
  }

  return [...groups.values()].map((group) => freeze({
    client_group_id: group.client_group_id,
    display_name: group.display_name ?? group.canonical_display_name ?? group.client_group_id,
    aliases: freeze([...aliasesByClient.get(group.client_group_id)]),
  }));
}

function clientMatch(counterparty, clientRecords) {
  const value = normalizeBankMatchValue(counterparty);
  if (!value) return null;
  const directory = buildClientDirectory(clientRecords);
  const exact = directory.filter((client) => client.aliases.includes(value));
  if (exact.length === 1) return freeze({ client: exact[0], match_kind: "client_exact", confidence: "high" });
  const prefix = directory.filter((client) => client.aliases.some((alias) => (
    Math.min(alias.length, value.length) >= 4 && (alias.startsWith(value) || value.startsWith(alias))
  )));
  if (prefix.length === 1) return freeze({ client: prefix[0], match_kind: "client_unique_prefix", confidence: "high" });
  return null;
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

function matchingRule(transaction, rules = []) {
  const matches = rules
    .filter((rule) => rule.model_type === "BankClassificationRule" && rule.status !== "inactive")
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
    bank_transaction_classification_id: classificationId(transaction),
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
    client_group_id: values.client_group_id ?? null,
    employee_id: values.employee_id ?? null,
    matter_id: values.matter_id ?? null,
    payroll_category: contract.primary_type === "payroll" ? values.payroll_category ?? "unclassified" : null,
    status: values.status ?? "confirmed",
    confidence: values.confidence ?? "high",
    classification_source: values.classification_source ?? "automatic",
    rationale_code: values.rationale_code ?? "deterministic_fallback",
    rule_id: values.rule_id ?? null,
    reviewed_by: values.reviewed_by ?? null,
    reviewed_at: values.reviewed_at ?? null,
    state_version: Number(values.state_version ?? 1),
    raw_source_payload_included: false,
    invoice_required: false,
    matter_required: false,
  });
}

function automaticProposal(transaction, { client_records = [], employees = [], rules = [] } = {}) {
  const rule = matchingRule(transaction, rules);
  if (rule) {
    return classificationProposal(transaction, {
      ...rule,
      rule_id: rule.bank_classification_rule_id,
      classification_source: "saved_rule",
      rationale_code: "saved_exact_counterparty_rule",
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
    if (matchedClient) {
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
    if (/매출취소|환급|환불|취소/iu.test(`${transaction.counterparty ?? ""} ${transaction.memo ?? ""}`)) {
      return classificationProposal(transaction, {
        category: "refund_reversal",
        rationale_code: "refund_or_reversal_text",
      });
    }
    return classificationProposal(transaction, {
      category: "other_inflow",
      rationale_code: "no_registered_client_match",
    });
  }

  const employee = employeeMatch(transaction, employees);
  if (employee) {
    return classificationProposal(transaction, {
      category: "salary_payment",
      employee_id: employee.employee_id,
      payroll_category: bankPayrollCategory(employee.title),
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

function persistClassifications({
  repository,
  tenant_id,
  classifications,
  actor_id,
  idempotency_key,
  action,
  rules = [],
} = {}) {
  const tenantId = requiredString({ tenant_id }, "tenant_id");
  const actorId = requiredString({ actor_id }, "actor_id");
  const idempotencyKey = requiredString({ idempotency_key }, "idempotency_key");
  const replay = repository.getIdempotency({ tenant_id: tenantId, idempotency_key: idempotencyKey });
  if (replay) return freeze({ ...replay.response, idempotent_replay: true });

  return repository.transaction((tx) => {
    let createdCount = 0;
    let updatedCount = 0;
    let protectedManualCount = 0;
    for (const classification of classifications) {
      const existing = tx.get({
        tenant_id: tenantId,
        model_type: "BankTransactionClassification",
        id: classification.bank_transaction_classification_id,
      });
      if (existing?.classification_source === "manual_review" && classification.classification_source !== "manual_review") {
        protectedManualCount += 1;
        continue;
      }
      const next = freeze({
        ...classification,
        state_version: Number(existing?.state_version ?? 0) + 1,
        created_at: existing?.created_at,
      });
      if (existing) {
        tx.update({
          tenant_id: tenantId,
          model_type: "BankTransactionClassification",
          id: classification.bank_transaction_classification_id,
        }, next);
        updatedCount += 1;
      } else {
        tx.create(next);
        createdCount += 1;
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
    const persisted = tx.list({ tenant_id: tenantId, model_type: "BankTransactionClassification" });
    const summary = summarizeBankTransactionClassifications(persisted);
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
      audit_event: auditEvent,
      idempotent_replay: false,
    });
    tx.recordIdempotency({
      tenant_id: tenantId,
      idempotency_key: idempotencyKey,
      operation: action,
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
} = {}) {
  const tenantId = requiredString({ tenant_id }, "tenant_id");
  const transactions = repository.list({ tenant_id: tenantId, model_type: "BankTransaction" });
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
    actor_id,
    idempotency_key,
    action: "bank.transaction.classification.auto",
  });
}

function reviewedRule(transaction, classification, decision, actorId) {
  if (decision.remember_match !== true) return null;
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

export function reviewBankTransactionClassifications({
  repository,
  tenant_id,
  decisions = [],
  actor_id,
  idempotency_key,
} = {}) {
  const tenantId = requiredString({ tenant_id }, "tenant_id");
  const actorId = requiredString({ actor_id }, "actor_id");
  if (!Array.isArray(decisions) || decisions.length === 0 || decisions.length > 500) {
    throw new TypeError("decisions must contain 1 to 500 rows");
  }
  const now = new Date().toISOString();
  const rules = [];
  const classifications = decisions.map((decision) => {
    const bankTransactionId = requiredString(decision, "bank_transaction_id");
    const transaction = repository.get({
      tenant_id: tenantId,
      model_type: "BankTransaction",
      id: bankTransactionId,
    });
    if (!transaction) throw new TypeError(`BankTransaction not found: ${bankTransactionId}`);
    const classification = classificationProposal(transaction, {
      category: decision.category,
      client_group_id: decision.client_group_id,
      employee_id: decision.employee_id,
      matter_id: decision.matter_id,
      payroll_category: decision.payroll_category,
      status: "confirmed",
      confidence: "reviewed",
      classification_source: "manual_review",
      rationale_code: "manual_review_confirmed",
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
    action: "bank.transaction.classification.review",
    rules,
  });
}
