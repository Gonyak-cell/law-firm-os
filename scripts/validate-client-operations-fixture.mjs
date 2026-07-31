import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { isDeepStrictEqual } from "node:util";
import { normalizeBankMatchValue } from "../packages/billing/src/bank-classification-service.js";
import {
  LAWOS_CLIENT_SCOPES,
  resolveLawosUserRoleAssignment,
} from "../apps/api/src/lawos-role-registry.js";
import {
  findRegisteredAccountByEmail,
} from "../apps/api/src/matter-vault-account-registry.js";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const FIXTURE_RELATIVE_ROOT = "apps/api/test/fixtures/client-operations-v1";

export const CLIENT_OPERATIONS_FIXTURE_PATHS = Object.freeze({
  contract: "contracts/client-operations-v1-contract.json",
  input: `${FIXTURE_RELATIVE_ROOT}/input.json`,
  scenarios: `${FIXTURE_RELATIVE_ROOT}/scenarios.json`,
  expectedRevenue: `${FIXTURE_RELATIVE_ROOT}/expected-revenue.json`,
  expectedReceivables: `${FIXTURE_RELATIVE_ROOT}/expected-receivables.json`,
  expectedDashboard: `${FIXTURE_RELATIVE_ROOT}/expected-dashboard.json`,
  expectedCsvRoot: `${FIXTURE_RELATIVE_ROOT}/expected-csv`,
});

function readJson(root, relativePath) {
  return JSON.parse(readFileSync(resolve(root, relativePath), "utf8"));
}

function sorted(values) {
  return [...values].sort((left, right) => String(left).localeCompare(String(right), "en"));
}

function safeDate(value) {
  const milliseconds = Date.parse(value);
  return Number.isFinite(milliseconds) ? milliseconds : null;
}

function zonedDatePart(value, timeZone, part) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));
  return parts.find((entry) => entry.type === part)?.value ?? "";
}

function zonedDate(value, timeZone) {
  return [
    zonedDatePart(value, timeZone, "year"),
    zonedDatePart(value, timeZone, "month"),
    zonedDatePart(value, timeZone, "day"),
  ].join("-");
}

function zonedMonth(value, timeZone) {
  return [
    zonedDatePart(value, timeZone, "year"),
    zonedDatePart(value, timeZone, "month"),
  ].join("-");
}

function addToSetMap(map, key, value) {
  if (!key) return;
  const values = map.get(key) ?? new Set();
  values.add(value);
  map.set(key, values);
}

function clientMatchDirectory(clients) {
  const names = new Map();
  const aliases = new Map();
  for (const client of clients) {
    for (const name of client.names ?? []) {
      addToSetMap(names, normalizeBankMatchValue(name), client.client_group_id);
    }
    for (const alias of client.approved_aliases ?? []) {
      addToSetMap(aliases, normalizeBankMatchValue(alias), client.client_group_id);
    }
  }
  return { names, aliases };
}

function matchClient(counterparty, directory) {
  const normalized = normalizeBankMatchValue(counterparty);
  const nameMatches = directory.names.get(normalized) ?? new Set();
  const aliasMatches = directory.aliases.get(normalized) ?? new Set();
  const matches = new Set([...nameMatches, ...aliasMatches]);
  if (matches.size !== 1) {
    return {
      client_group_id: null,
      match_kind: null,
      outcome: matches.size > 1 ? "review_required" : "unmatched",
    };
  }
  const client_group_id = [...matches][0];
  return {
    client_group_id,
    match_kind: nameMatches.has(client_group_id) ? "client_exact" : "client_saved_alias",
    outcome: "matched",
  };
}

function classifyTransactions(input, errors) {
  const directory = clientMatchDirectory(input.clients);
  const seenFingerprints = new Set();
  const classifiedById = new Map();
  const classified = [];

  for (const transaction of input.bank_transactions) {
    const duplicate = seenFingerprints.has(transaction.fingerprint);
    seenFingerprints.add(transaction.fingerprint);
    let result;
    if (duplicate) {
      result = {
        client_group_id: null,
        match_kind: null,
        outcome: "duplicate_ignored",
      };
    } else if (transaction.direction === "outflow" && transaction.refund_of_bank_transaction_id) {
      const original = classifiedById.get(transaction.refund_of_bank_transaction_id);
      result = original?.client_group_id
        ? {
            client_group_id: original.client_group_id,
            match_kind: "linked_refund",
            outcome: "linked_refund",
          }
        : {
            client_group_id: null,
            match_kind: null,
            outcome: "review_required",
          };
    } else {
      result = matchClient(transaction.counterparty, directory);
    }
    const entry = { ...transaction, ...result, duplicate };
    classified.push(entry);
    classifiedById.set(transaction.bank_transaction_id, entry);

    if (!duplicate && "expected_client_group_id" in transaction) {
      if (entry.client_group_id !== transaction.expected_client_group_id) {
        errors.push(
          `${transaction.bank_transaction_id}: expected client ${transaction.expected_client_group_id}, got ${entry.client_group_id}`,
        );
      }
    }
    if (!duplicate && transaction.expected_match_kind && entry.match_kind !== transaction.expected_match_kind) {
      errors.push(
        `${transaction.bank_transaction_id}: expected match kind ${transaction.expected_match_kind}, got ${entry.match_kind}`,
      );
    }
    if (transaction.expected_outcome && entry.outcome !== transaction.expected_outcome) {
      errors.push(
        `${transaction.bank_transaction_id}: expected outcome ${transaction.expected_outcome}, got ${entry.outcome}`,
      );
    }
  }
  return classified;
}

function computeRevenue(input, errors) {
  const classified = classifyTransactions(input, errors);
  const from = safeDate(input.revenue_period.from);
  const to = safeDate(input.revenue_period.to);
  const clients = new Map(input.clients.map((client) => [client.client_group_id, client]));
  const byClient = new Map();
  let unmatchedInflowAmount = 0;
  let duplicateIgnoredAmount = 0;

  function summaryFor(clientId) {
    if (!byClient.has(clientId)) {
      byClient.set(clientId, {
        client_group_id: clientId,
        matched_inflow_amount: 0,
        linked_refund_amount: 0,
        latest_deposit_at: null,
      });
    }
    return byClient.get(clientId);
  }

  for (const transaction of classified) {
    const occurredAt = safeDate(transaction.occurred_at);
    if (occurredAt == null || occurredAt < from || occurredAt > to) continue;
    if (transaction.duplicate) {
      duplicateIgnoredAmount += transaction.amount;
      continue;
    }
    if (!transaction.client_group_id) {
      if (transaction.direction === "inflow") unmatchedInflowAmount += transaction.amount;
      continue;
    }
    const summary = summaryFor(transaction.client_group_id);
    if (transaction.direction === "inflow") {
      summary.matched_inflow_amount += transaction.amount;
      if (!summary.latest_deposit_at || transaction.occurred_at > summary.latest_deposit_at) {
        summary.latest_deposit_at = transaction.occurred_at;
      }
    } else if (transaction.outcome === "linked_refund") {
      summary.linked_refund_amount += transaction.amount;
    }
  }

  const ranking = [...byClient.values()]
    .map((entry) => ({
      ...entry,
      display_name: clients.get(entry.client_group_id)?.display_name ?? entry.client_group_id,
      net_deposit_revenue: entry.matched_inflow_amount - entry.linked_refund_amount,
    }))
    .filter((entry) => entry.net_deposit_revenue !== 0)
    .sort((left, right) => (
      right.net_deposit_revenue - left.net_deposit_revenue
      || String(right.latest_deposit_at).localeCompare(String(left.latest_deposit_at))
      || left.display_name.localeCompare(right.display_name, "ko")
      || left.client_group_id.localeCompare(right.client_group_id, "en")
    ))
    .map((entry, index) => ({
      rank: index + 1,
      client_group_id: entry.client_group_id,
      display_name: entry.display_name,
      matched_inflow_amount: entry.matched_inflow_amount,
      linked_refund_amount: entry.linked_refund_amount,
      net_deposit_revenue: entry.net_deposit_revenue,
      latest_deposit_at: entry.latest_deposit_at,
    }));

  const monthlySeries = Array.from({ length: 12 }, (_, index) => {
    const date = new Date(Date.UTC(2025, 7 + index, 1));
    return {
      month: `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`,
      net_deposit_revenue: 0,
    };
  });
  const monthlyByKey = new Map(monthlySeries.map((entry) => [entry.month, entry]));
  for (const transaction of classified) {
    if (transaction.duplicate || !transaction.client_group_id) continue;
    const month = zonedMonth(transaction.occurred_at, input.timezone);
    const bucket = monthlyByKey.get(month);
    if (!bucket) continue;
    if (transaction.direction === "inflow") bucket.net_deposit_revenue += transaction.amount;
    else if (transaction.outcome === "linked_refund") bucket.net_deposit_revenue -= transaction.amount;
  }

  return {
    classified,
    total_net_deposit_revenue: ranking.reduce((total, entry) => total + entry.net_deposit_revenue, 0),
    unmatched_inflow_amount: unmatchedInflowAmount,
    duplicate_ignored_amount: duplicateIgnoredAmount,
    ranking,
    monthly_series: monthlySeries,
  };
}

function computeReceivables(input, revenue, errors) {
  const clients = new Map(input.clients.map((client) => [client.client_group_id, client]));
  const fees = new Map(input.fee_commitments.map((fee) => [fee.fee_commitment_id, fee]));
  const transactions = new Map(revenue.classified.map((transaction) => [transaction.bank_transaction_id, transaction]));
  const allocatedByFee = new Map();
  const allocatedByBank = new Map();

  for (const allocation of input.deposit_allocations) {
    const activeAmount = allocation.allocated_amount - allocation.reversed_amount;
    if (!fees.has(allocation.fee_commitment_id)) {
      errors.push(`${allocation.client_deposit_allocation_id}: unknown fee commitment`);
    }
    if (!transactions.has(allocation.bank_transaction_id)) {
      errors.push(`${allocation.client_deposit_allocation_id}: unknown bank transaction`);
    }
    allocatedByFee.set(
      allocation.fee_commitment_id,
      (allocatedByFee.get(allocation.fee_commitment_id) ?? 0) + activeAmount,
    );
    allocatedByBank.set(
      allocation.bank_transaction_id,
      (allocatedByBank.get(allocation.bank_transaction_id) ?? 0) + activeAmount,
    );
  }

  for (const [feeId, allocatedAmount] of allocatedByFee) {
    const fee = fees.get(feeId);
    if (fee?.agreed_amount != null && allocatedAmount > fee.agreed_amount) {
      errors.push(`${feeId}: active allocation exceeds agreed amount`);
    }
  }
  for (const [bankId, allocatedAmount] of allocatedByBank) {
    const transaction = transactions.get(bankId);
    if (transaction && allocatedAmount > transaction.amount) {
      errors.push(`${bankId}: active allocation exceeds bank transaction amount`);
    }
  }

  const clientSummaries = input.clients.map((client) => {
    const clientFees = input.fee_commitments.filter(
      (fee) => fee.client_group_id === client.client_group_id && fee.status === "active",
    );
    const knownFees = clientFees.filter((fee) => fee.agreed_amount != null);
    const unknownAmountCount = clientFees.length - knownFees.length;
    const agreedAmount = knownFees.length > 0
      ? knownFees.reduce((total, fee) => total + fee.agreed_amount, 0)
      : null;
    const activeAllocatedAmount = knownFees.reduce(
      (total, fee) => total + (allocatedByFee.get(fee.fee_commitment_id) ?? 0),
      0,
    );
    const receivableAmount = knownFees.length > 0
      ? knownFees.reduce(
          (total, fee) => total + Math.max(0, fee.agreed_amount - (allocatedByFee.get(fee.fee_commitment_id) ?? 0)),
          0,
        )
      : null;
    const overpaymentAmount = revenue.classified
      .filter((transaction) => (
        !transaction.duplicate
        && transaction.direction === "inflow"
        && transaction.client_group_id === client.client_group_id
        && transaction.allocation_eligible !== false
      ))
      .reduce(
        (total, transaction) => (
          total + Math.max(0, transaction.amount - (allocatedByBank.get(transaction.bank_transaction_id) ?? 0))
        ),
        0,
      );
    const openDueDates = knownFees
      .filter((fee) => fee.agreed_amount - (allocatedByFee.get(fee.fee_commitment_id) ?? 0) > 0)
      .map((fee) => fee.due_date)
      .filter(Boolean)
      .sort();
    return {
      client_group_id: client.client_group_id,
      agreed_amount: agreedAmount,
      active_allocated_amount: activeAllocatedAmount,
      receivable_amount: receivableAmount,
      unknown_amount_count: unknownAmountCount,
      overpayment_amount: overpaymentAmount,
      earliest_due_date: openDueDates[0] ?? null,
    };
  });

  const ranking = clientSummaries
    .filter((summary) => summary.receivable_amount > 0)
    .sort((left, right) => (
      right.receivable_amount - left.receivable_amount
      || String(left.earliest_due_date).localeCompare(String(right.earliest_due_date))
      || clients.get(left.client_group_id).display_name.localeCompare(
        clients.get(right.client_group_id).display_name,
        "ko",
      )
      || left.client_group_id.localeCompare(right.client_group_id, "en")
    ))
    .map((summary, index) => ({
      rank: index + 1,
      client_group_id: summary.client_group_id,
      display_name: clients.get(summary.client_group_id).display_name,
      agreed_amount: summary.agreed_amount,
      active_allocated_amount: summary.active_allocated_amount,
      receivable_amount: summary.receivable_amount,
      earliest_due_date: summary.earliest_due_date,
    }));

  return {
    total_receivables: clientSummaries.reduce(
      (total, summary) => total + (summary.receivable_amount ?? 0),
      0,
    ),
    unknown_amount_count: clientSummaries.reduce(
      (total, summary) => total + summary.unknown_amount_count,
      0,
    ),
    total_overpayment: clientSummaries.reduce(
      (total, summary) => total + summary.overpayment_amount,
      0,
    ),
    ranking,
    client_summaries: clientSummaries.map(({ earliest_due_date, ...summary }) => summary),
  };
}

function visibleInquiryStatus(inquiry, consultations) {
  if (inquiry.engagement_decision === "accepted") return "수임 확정";
  if (inquiry.engagement_decision === "declined" || inquiry.inquiry_status === "closed") return "수임하지 않음";
  if (inquiry.engagement_decision === "pending" || inquiry.opportunity_id) return "수임 검토 중";
  const hasIncompleteConsultation = consultations.some(
    (consultation) => consultation.lead_id === inquiry.lead_id && consultation.completed_at == null,
  );
  if (hasIncompleteConsultation) return "상담 예정";
  if (inquiry.inquiry_status === "new") return "새 문의";
  return "확인 중";
}

function computeDashboard(input, revenue, receivables) {
  const today = zonedDate(input.as_of, input.timezone);
  const inquiryStatusCounts = Object.fromEntries(
    ["새 문의", "확인 중", "상담 예정", "수임 검토 중", "수임 확정", "수임하지 않음"]
      .map((status) => [status, 0]),
  );
  for (const inquiry of input.inquiries) {
    inquiryStatusCounts[visibleInquiryStatus(inquiry, input.consultations)] += 1;
  }
  return {
    kpis: {
      new_inquiries: input.inquiries.filter((inquiry) => inquiry.inquiry_status === "new").length,
      consultations_today: input.consultations.filter((consultation) => (
        consultation.completed_at == null
        && zonedDate(consultation.scheduled_start, input.timezone) === today
      )).length,
      engagement_reviews: input.inquiries.filter(
        (inquiry) => inquiry.engagement_decision === "pending",
      ).length,
      deposit_revenue_month: revenue.total_net_deposit_revenue,
      receivables_total: receivables.total_receivables,
    },
    inquiry_status_counts: inquiryStatusCounts,
    revenue_ranking_client_ids: revenue.ranking.map((entry) => entry.client_group_id),
    receivables_ranking_client_ids: receivables.ranking.map((entry) => entry.client_group_id),
  };
}

function fixtureReferences(input) {
  const references = new Set([input.fixture_id]);
  const add = (value) => {
    if (value) references.add(value);
  };
  for (const client of input.clients) add(client.client_group_id);
  for (const transaction of input.bank_transactions) {
    add(transaction.bank_transaction_id);
    add(transaction.fingerprint);
  }
  for (const fee of input.fee_commitments) add(fee.fee_commitment_id);
  for (const allocation of input.deposit_allocations) add(allocation.client_deposit_allocation_id);
  for (const inquiry of input.inquiries) {
    add(inquiry.lead_id);
    add(inquiry.opportunity_id);
  }
  for (const consultation of input.consultations) add(consultation.activity_id);
  for (const evidence of input.outlook_email_evidence ?? []) add(evidence.inquiry_email_evidence_id);
  for (const permission of input.permission_fixtures) add(permission.principal_id);
  return references;
}

function walkMoneyValues(value, path, errors) {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => walkMoneyValues(entry, `${path}[${index}]`, errors));
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, entry] of Object.entries(value)) {
    const entryPath = `${path}.${key}`;
    if (key.endsWith("_amount") && entry != null) {
      if (!Number.isSafeInteger(entry) || entry < 0) {
        errors.push(`${entryPath}: money must be a non-negative safe integer`);
      }
    }
    walkMoneyValues(entry, entryPath, errors);
  }
}

function compare(errors, label, actual, expected) {
  if (!isDeepStrictEqual(actual, expected)) {
    errors.push(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function csvLine(values) {
  return values.map((value) => {
    const text = String(value ?? "");
    return /[",\n]/u.test(text) ? `"${text.replaceAll("\"", "\"\"")}"` : text;
  }).join(",");
}

function expectedCsvDocuments(revenue, receivables, dashboard) {
  return {
    "monthly-deposit-revenue.csv": [
      csvLine(["월", "입금 매출"]),
      ...revenue.monthly_series.map((entry) => csvLine([entry.month, entry.net_deposit_revenue])),
      "",
    ].join("\n"),
    "client-revenue-ranking.csv": [
      csvLine(["순위", "고객", "연결 입금", "환불", "입금 매출"]),
      ...revenue.ranking.map((entry) => csvLine([
        entry.rank,
        entry.display_name,
        entry.matched_inflow_amount,
        entry.linked_refund_amount,
        entry.net_deposit_revenue,
      ])),
      "",
    ].join("\n"),
    "client-receivables-ranking.csv": [
      csvLine(["순위", "고객", "약정 수임료", "반영 입금", "미수금", "가장 이른 지급기한"]),
      ...receivables.ranking.map((entry) => csvLine([
        entry.rank,
        entry.display_name,
        entry.agreed_amount,
        entry.active_allocated_amount,
        entry.receivable_amount,
        entry.earliest_due_date,
      ])),
      "",
    ].join("\n"),
    "inquiry-status.csv": [
      csvLine(["상태", "건수"]),
      ...Object.entries(dashboard.inquiry_status_counts).map(([status, count]) => csvLine([status, count])),
      "",
    ].join("\n"),
  };
}

function validateCapabilities(contract, errors) {
  compare(
    errors,
    "contract all client scopes",
    sorted(contract.capabilities.all_client_scopes),
    sorted(LAWOS_CLIENT_SCOPES),
  );
  const emailByProfile = {
    staff: "yjlee@amic.kr",
    attorney: "jh731@amic.kr",
    operations: "wsjo@amic.kr",
    partner: "bj.park@amic.kr",
    admin: "ytkim@amic.kr",
  };
  const clientScopeSet = new Set(LAWOS_CLIENT_SCOPES);
  for (const [profile, email] of Object.entries(emailByProfile)) {
    const account = findRegisteredAccountByEmail(email);
    if (!account) {
      errors.push(`capability profile ${profile}: registered account ${email} is missing`);
      continue;
    }
    const assignment = resolveLawosUserRoleAssignment(account);
    const actual = (assignment?.scopes ?? []).filter((scope) => clientScopeSet.has(scope));
    compare(
      errors,
      `capability profile ${profile}`,
      sorted(actual),
      sorted(contract.capabilities.profiles[profile] ?? []),
    );
  }
}

function validateEvidence(input, errors) {
  const dedupeKeys = new Set();
  for (const evidence of input.outlook_email_evidence ?? []) {
    const key = `${evidence.mailbox_address}|${evidence.internet_message_id}`;
    if (dedupeKeys.has(key)) errors.push(`${evidence.inquiry_email_evidence_id}: duplicate Outlook evidence key`);
    dedupeKeys.add(key);
    if (!/^[0-9a-f]{64}$/u.test(evidence.mime_sha256 ?? "")) {
      errors.push(`${evidence.inquiry_email_evidence_id}: MIME SHA-256 must be 64 lowercase hex characters`);
    }
    if (evidence.original_mime_immutable !== true || evidence.sanitized_display_copy_separate !== true) {
      errors.push(`${evidence.inquiry_email_evidence_id}: immutable MIME and separate display copy are required`);
    }
  }
}

export function loadClientOperationsFixture(root = REPO_ROOT) {
  return {
    contract: readJson(root, CLIENT_OPERATIONS_FIXTURE_PATHS.contract),
    input: readJson(root, CLIENT_OPERATIONS_FIXTURE_PATHS.input),
    scenarios: readJson(root, CLIENT_OPERATIONS_FIXTURE_PATHS.scenarios),
    expectedRevenue: readJson(root, CLIENT_OPERATIONS_FIXTURE_PATHS.expectedRevenue),
    expectedReceivables: readJson(root, CLIENT_OPERATIONS_FIXTURE_PATHS.expectedReceivables),
    expectedDashboard: readJson(root, CLIENT_OPERATIONS_FIXTURE_PATHS.expectedDashboard),
  };
}

export function validateClientOperationsFixture({ root = REPO_ROOT, data } = {}) {
  const fixture = data ?? loadClientOperationsFixture(root);
  const {
    contract,
    input,
    scenarios,
    expectedRevenue,
    expectedReceivables,
    expectedDashboard,
  } = fixture;
  const errors = [];

  if (contract.schema_version !== "law-firm-os.client-operations.v1") {
    errors.push("contract schema_version is not client-operations.v1");
  }
  if (!existsSync(resolve(root, contract.source_plan))) {
    errors.push(`contract source plan is missing: ${contract.source_plan}`);
  }
  if (input.synthetic_only !== true) errors.push("fixture must be explicitly synthetic_only");
  if (input.currency !== "KRW" || input.currency !== contract.scope.currency) {
    errors.push("fixture and contract currency must both be KRW");
  }
  if (input.timezone !== "Asia/Seoul" || input.timezone !== contract.scope.timezone) {
    errors.push("fixture and contract timezone must both be Asia/Seoul");
  }
  if (safeDate(input.as_of) == null || safeDate(input.revenue_period.from) == null || safeDate(input.revenue_period.to) == null) {
    errors.push("fixture as_of and revenue period must contain valid timestamps");
  }
  walkMoneyValues(input, "input", errors);
  validateEvidence(input, errors);
  validateCapabilities(contract, errors);

  if (contract.scope.invoice_required_for_revenue !== false
      || contract.scope.matter_required_for_revenue !== false
      || contract.scope.hidden_client_sections_restored !== false
      || contract.scope.automatic_outlook_mailbox_scan !== false
      || contract.scope.automatic_matter_creation !== false) {
    errors.push("small-firm scope guardrails must remain false");
  }
  if (contract.outlook.inquiry_capture_trigger !== "explicit_addin_button_click"
      || contract.outlook.background_mail_scan !== false) {
    errors.push("Outlook inquiry capture must remain explicit-button only");
  }
  compare(
    errors,
    "bank normalization example",
    normalizeBankMatchValue("주식회사 한빛건설"),
    normalizeBankMatchValue("한빛건설"),
  );

  const references = fixtureReferences(input);
  const scenarioIds = scenarios.scenarios.map((scenario) => scenario.id);
  const uniqueScenarioIds = new Set(scenarioIds);
  if (scenarios.scenario_count !== 32 || scenarios.scenarios.length !== 32) {
    errors.push("scenario registry must contain exactly 32 scenarios");
  }
  if (uniqueScenarioIds.size !== scenarioIds.length) errors.push("scenario IDs must be unique");
  compare(errors, "contract scenario IDs", scenarioIds, contract.verification_scenario_ids);
  if (!existsSync(resolve(root, scenarios.contract_test_file))) {
    errors.push(`scenario contract test is missing: ${scenarios.contract_test_file}`);
  }
  for (const scenario of scenarios.scenarios) {
    if (!/^VC-CL-[A-Z]+-\d{3}$/u.test(scenario.id)) errors.push(`${scenario.id}: invalid scenario ID`);
    if (!scenario.area || !scenario.planned_test_file) errors.push(`${scenario.id}: area and planned test file are required`);
    if (!scenario.expected || Object.keys(scenario.expected).length === 0) {
      errors.push(`${scenario.id}: expected result is required`);
    }
    for (const reference of scenario.fixture_refs ?? []) {
      if (!references.has(reference)) errors.push(`${scenario.id}: unknown fixture reference ${reference}`);
    }
  }

  const revenue = computeRevenue(input, errors);
  compare(errors, "revenue total", revenue.total_net_deposit_revenue, expectedRevenue.total_net_deposit_revenue);
  compare(errors, "unmatched inflows", revenue.unmatched_inflow_amount, expectedRevenue.unmatched_inflow_amount);
  compare(errors, "duplicate ignored", revenue.duplicate_ignored_amount, expectedRevenue.duplicate_ignored_amount);
  compare(errors, "revenue ranking", revenue.ranking, expectedRevenue.ranking);
  compare(errors, "monthly revenue series", revenue.monthly_series, expectedRevenue.monthly_series);

  const receivables = computeReceivables(input, revenue, errors);
  compare(errors, "receivables total", receivables.total_receivables, expectedReceivables.total_receivables);
  compare(errors, "unknown agreed amount count", receivables.unknown_amount_count, expectedReceivables.unknown_amount_count);
  compare(errors, "overpayment total", receivables.total_overpayment, expectedReceivables.total_overpayment);
  compare(errors, "receivables ranking", receivables.ranking, expectedReceivables.ranking);
  compare(errors, "receivables client summaries", receivables.client_summaries, expectedReceivables.client_summaries);

  const dashboard = computeDashboard(input, revenue, receivables);
  compare(errors, "dashboard KPI", dashboard.kpis, expectedDashboard.kpis);
  compare(errors, "dashboard inquiry status", dashboard.inquiry_status_counts, expectedDashboard.inquiry_status_counts);
  compare(
    errors,
    "dashboard revenue ranking IDs",
    dashboard.revenue_ranking_client_ids,
    expectedDashboard.revenue_ranking_client_ids,
  );
  compare(
    errors,
    "dashboard receivables ranking IDs",
    dashboard.receivables_ranking_client_ids,
    expectedDashboard.receivables_ranking_client_ids,
  );
  for (const attentionId of expectedDashboard.attention_item_ids) {
    if (!references.has(attentionId)) errors.push(`dashboard attention item is unknown: ${attentionId}`);
  }

  const csvDocuments = expectedCsvDocuments(revenue, receivables, dashboard);
  for (const [fileName, expectedDocument] of Object.entries(csvDocuments)) {
    const path = resolve(root, CLIENT_OPERATIONS_FIXTURE_PATHS.expectedCsvRoot, fileName);
    if (!existsSync(path)) {
      errors.push(`expected CSV is missing: ${fileName}`);
      continue;
    }
    compare(errors, `expected CSV ${fileName}`, readFileSync(path, "utf8"), expectedDocument);
  }

  return Object.freeze({
    verdict: errors.length === 0 ? "PASS" : "FAIL",
    verification_level: "fixture-contract",
    scenario_count: scenarios.scenarios.length,
    scenario_ids: Object.freeze([...scenarioIds]),
    planned_runtime_test_file_count: new Set(
      scenarios.scenarios.map((scenario) => scenario.planned_test_file),
    ).size,
    totals: Object.freeze({
      deposit_revenue_month: revenue.total_net_deposit_revenue,
      receivables: receivables.total_receivables,
      overpayment: receivables.total_overpayment,
      new_inquiries: dashboard.kpis.new_inquiries,
      consultations_today: dashboard.kpis.consultations_today,
      engagement_reviews: dashboard.kpis.engagement_reviews,
    }),
    errors: Object.freeze(errors),
  });
}

const directExecution = process.argv[1]
  && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (directExecution) {
  try {
    const result = validateClientOperationsFixture();
    console.log(JSON.stringify(result, null, 2));
    if (result.verdict !== "PASS") process.exitCode = 1;
  } catch (error) {
    console.error(JSON.stringify({
      verdict: "FAIL",
      verification_level: "fixture-contract",
      errors: [error instanceof Error ? error.message : String(error)],
    }, null, 2));
    process.exitCode = 1;
  }
}
