import { normalizeClientDepositAllocation } from "./client-deposit-allocation-model.js";
import { buildConfirmedClientDepositSources } from "./client-deposit-source.js";
import { normalizeFeeCommitment } from "./fee-commitment-model.js";

const ACTIVE_CLIENT_STATUSES = new Set(["active", "current", "open"]);

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(`${field} is required`);
  }
  return value.trim();
}

function addWholeKrw(left, right, field) {
  const total = left + right;
  if (!Number.isSafeInteger(total)) {
    throw new TypeError(`${field} exceeds the supported KRW range`);
  }
  return total;
}

function activeClient(record = {}) {
  return ACTIVE_CLIENT_STATUSES.has(
    String(record.status ?? "active").trim().toLowerCase(),
  );
}

function permittedClients(records, tenantId) {
  if (!Array.isArray(records)) {
    throw new TypeError("permitted_client_records is required");
  }
  const clients = new Map();
  for (const record of records) {
    if (
      record?.model_type !== "ClientGroup"
      || record.tenant_id !== tenantId
      || !activeClient(record)
    ) continue;
    const clientId = requiredString(record, "client_group_id");
    if (clients.has(clientId)) {
      throw new TypeError(`Duplicate permitted client: ${clientId}`);
    }
    clients.set(clientId, Object.freeze({
      client_group_id: clientId,
      display_name: requiredString({
        display_name:
          record.display_name ?? record.canonical_display_name ?? clientId,
      }, "display_name"),
    }));
  }
  return clients;
}

function activeAmount(allocation) {
  return allocation.allocated_amount - allocation.reversed_amount;
}

function compareClient(left, right) {
  return (
    left.display_name.localeCompare(right.display_name, "ko")
    || left.client_group_id.localeCompare(right.client_group_id, "en")
  );
}

function compareRanking(left, right) {
  return (
    right.receivable_amount - left.receivable_amount
    || String(left.earliest_due_date).localeCompare(
      String(right.earliest_due_date),
    )
    || compareClient(left, right)
  );
}

export function buildClientReceivables({
  repository,
  tenant_id,
  permitted_client_records,
  currency = "KRW",
  clock = () => new Date(),
} = {}) {
  if (!repository || typeof repository.list !== "function") {
    throw new TypeError("Finance repository is required");
  }
  const tenantId = requiredString({ tenant_id }, "tenant_id");
  if (currency !== "KRW") {
    throw new TypeError("Client receivables currency must be KRW");
  }
  const clients = permittedClients(permitted_client_records, tenantId);
  const permittedClientIds = new Set(clients.keys());
  const source = buildConfirmedClientDepositSources({
    repository,
    tenant_id: tenantId,
    permitted_client_ids: permittedClientIds,
  });
  const receiptsById = new Map(source.receipts.map((receipt) => [
    receipt.transaction.bank_transaction_id,
    receipt,
  ]));

  const allCommitments = repository
    .list({ tenant_id: tenantId, model_type: "FeeCommitment" })
    .filter((commitment) => (
      permittedClientIds.has(commitment.client_group_id)
    ))
    .map(normalizeFeeCommitment);
  const commitmentsById = new Map(allCommitments.map((commitment) => [
    commitment.fee_commitment_id,
    commitment,
  ]));
  if (commitmentsById.size !== allCommitments.length) {
    throw new TypeError("Duplicate FeeCommitment ID");
  }
  const activeCommitments = allCommitments.filter((commitment) => (
    commitment.status === "active"
  ));

  const allocations = repository
    .list({ tenant_id: tenantId, model_type: "ClientDepositAllocation" })
    .filter((allocation) => permittedClientIds.has(allocation.client_group_id))
    .map(normalizeClientDepositAllocation);
  const allocationIds = new Set(
    allocations.map((allocation) => (
      allocation.client_deposit_allocation_id
    )),
  );
  if (allocationIds.size !== allocations.length) {
    throw new TypeError("Duplicate ClientDepositAllocation ID");
  }
  const activeByCommitment = new Map();
  const activeByTransaction = new Map();
  for (const allocation of allocations) {
    const receipt = receiptsById.get(allocation.bank_transaction_id);
    const commitment = commitmentsById.get(allocation.fee_commitment_id);
    const amount = activeAmount(allocation);
    if (
      !receipt
      || !commitment
      || allocation.client_group_id !== receipt.client_group_id
      || allocation.client_group_id !== commitment.client_group_id
      || allocation.bank_transaction_classification_id
        !== receipt.classification.bank_transaction_classification_id
    ) {
      throw new TypeError(
        `ClientDepositAllocation does not reconcile: ${allocation.client_deposit_allocation_id}`,
      );
    }
    if (amount > 0 && commitment.status !== "active") {
      throw new TypeError(
        `Inactive FeeCommitment still has an active deposit allocation: ${commitment.fee_commitment_id}`,
      );
    }
    activeByCommitment.set(
      commitment.fee_commitment_id,
      addWholeKrw(
        activeByCommitment.get(commitment.fee_commitment_id) ?? 0,
        amount,
        "active allocation total by FeeCommitment",
      ),
    );
    activeByTransaction.set(
      receipt.transaction.bank_transaction_id,
      addWholeKrw(
        activeByTransaction.get(receipt.transaction.bank_transaction_id) ?? 0,
        amount,
        "active allocation total by BankTransaction",
      ),
    );
  }

  const commitmentDetails = activeCommitments
    .map((commitment) => {
      const allocatedAmount =
        activeByCommitment.get(commitment.fee_commitment_id) ?? 0;
      if (
        commitment.agreed_amount !== null
        && allocatedAmount > commitment.agreed_amount
      ) {
        throw new TypeError(
          `Active allocations exceed FeeCommitment.agreed_amount: ${commitment.fee_commitment_id}`,
        );
      }
      if (commitment.agreed_amount === null && allocatedAmount !== 0) {
        throw new TypeError(
          `Amount-unknown FeeCommitment has an allocation: ${commitment.fee_commitment_id}`,
        );
      }
      return Object.freeze({
        fee_commitment_id: commitment.fee_commitment_id,
        client_group_id: commitment.client_group_id,
        agreed_amount: commitment.agreed_amount,
        active_allocated_amount: allocatedAmount,
        receivable_amount: commitment.agreed_amount === null
          ? null
          : Math.max(0, commitment.agreed_amount - allocatedAmount),
        amount_status: commitment.agreed_amount === null
          ? "금액 미입력"
          : "금액 확인",
        due_date: commitment.due_date,
        accepted_at: commitment.accepted_at,
      });
    })
    .sort((left, right) => (
      left.client_group_id.localeCompare(right.client_group_id, "en")
      || String(left.due_date).localeCompare(String(right.due_date))
      || left.accepted_at.localeCompare(right.accepted_at)
      || left.fee_commitment_id.localeCompare(right.fee_commitment_id, "en")
    ));

  const depositDetails = source.receipts
    .map((receipt) => {
      const allocatedAmount =
        activeByTransaction.get(receipt.transaction.bank_transaction_id) ?? 0;
      if (allocatedAmount > receipt.net_amount) {
        throw new TypeError(
          `Active allocations exceed the linked-refund-adjusted deposit: ${receipt.transaction.bank_transaction_id}`,
        );
      }
      return Object.freeze({
        bank_transaction_id: receipt.transaction.bank_transaction_id,
        client_group_id: receipt.client_group_id,
        gross_amount: receipt.gross_amount,
        linked_refund_amount: receipt.linked_refund_amount,
        net_amount: receipt.net_amount,
        active_allocated_amount: allocatedAmount,
        overpayment_amount: receipt.net_amount - allocatedAmount,
        occurred_at: receipt.transaction.occurred_at,
      });
    })
    .sort((left, right) => (
      Date.parse(left.occurred_at) - Date.parse(right.occurred_at)
      || left.bank_transaction_id.localeCompare(
        right.bank_transaction_id,
        "en",
      )
    ));

  const clientSummariesWithDisplay = [...clients.values()]
    .map((client) => {
      const clientCommitments = commitmentDetails.filter((commitment) => (
        commitment.client_group_id === client.client_group_id
      ));
      const known = clientCommitments.filter((commitment) => (
        commitment.agreed_amount !== null
      ));
      const unknownAmountCount =
        clientCommitments.length - known.length;
      const agreedAmount = known.length === 0
        ? null
        : known.reduce((total, commitment) => addWholeKrw(
          total,
          commitment.agreed_amount,
          "client agreed amount",
        ), 0);
      const activeAllocatedAmount = known.reduce(
        (total, commitment) => addWholeKrw(
          total,
          commitment.active_allocated_amount,
          "client active allocated amount",
        ),
        0,
      );
      const receivableAmount = known.length === 0
        ? null
        : known.reduce((total, commitment) => addWholeKrw(
          total,
          commitment.receivable_amount,
          "client receivable amount",
        ), 0);
      const overpaymentAmount = depositDetails
        .filter((deposit) => (
          deposit.client_group_id === client.client_group_id
        ))
        .reduce((total, deposit) => addWholeKrw(
          total,
          deposit.overpayment_amount,
          "client overpayment amount",
        ), 0);
      const openDueDates = known
        .filter((commitment) => commitment.receivable_amount > 0)
        .map((commitment) => commitment.due_date)
        .filter(Boolean)
        .sort();
      return Object.freeze({
        client_group_id: client.client_group_id,
        display_name: client.display_name,
        agreed_amount: agreedAmount,
        active_allocated_amount: activeAllocatedAmount,
        receivable_amount: receivableAmount,
        unknown_amount_count: unknownAmountCount,
        overpayment_amount: overpaymentAmount,
        earliest_due_date: openDueDates[0] ?? null,
      });
    });

  const ranking = clientSummariesWithDisplay
    .filter((summary) => summary.receivable_amount > 0)
    .sort(compareRanking)
    .map((summary, index) => Object.freeze({
      rank: index + 1,
      client_group_id: summary.client_group_id,
      display_name: summary.display_name,
      agreed_amount: summary.agreed_amount,
      active_allocated_amount: summary.active_allocated_amount,
      receivable_amount: summary.receivable_amount,
      earliest_due_date: summary.earliest_due_date,
    }));
  const clientSummaries = clientSummariesWithDisplay.map(({
    display_name,
    earliest_due_date,
    ...summary
  }) => Object.freeze(summary));
  const totalReceivables = clientSummaries.reduce(
    (total, summary) => addWholeKrw(
      total,
      summary.receivable_amount ?? 0,
      "total receivables",
    ),
    0,
  );
  const unknownAmountCount = clientSummaries.reduce(
    (total, summary) => total + summary.unknown_amount_count,
    0,
  );
  const totalOverpayment = clientSummaries.reduce(
    (total, summary) => addWholeKrw(
      total,
      summary.overpayment_amount,
      "total overpayment",
    ),
    0,
  );
  const rankingTotal = ranking.reduce(
    (total, summary) => addWholeKrw(
      total,
      summary.receivable_amount,
      "receivables ranking total",
    ),
    0,
  );
  const commitmentTotal = commitmentDetails.reduce(
    (total, commitment) => addWholeKrw(
      total,
      commitment.receivable_amount ?? 0,
      "receivable commitment detail total",
    ),
    0,
  );
  const depositOverpaymentTotal = depositDetails.reduce(
    (total, deposit) => addWholeKrw(
      total,
      deposit.overpayment_amount,
      "deposit overpayment detail total",
    ),
    0,
  );
  if (
    totalReceivables !== rankingTotal
    || totalReceivables !== commitmentTotal
    || totalOverpayment !== depositOverpaymentTotal
  ) {
    throw new TypeError("Client receivables totals do not reconcile");
  }

  return Object.freeze({
    basis: "fee_commitment_and_bank_deposit",
    basis_label: "수임료 약정·은행 입금 기준",
    currency: "KRW",
    as_of: clock().toISOString(),
    total_receivables: totalReceivables,
    unknown_amount_count: unknownAmountCount,
    total_overpayment: totalOverpayment,
    ranking: Object.freeze(ranking),
    client_summaries: Object.freeze(clientSummaries),
    details: Object.freeze({
      fee_commitments: Object.freeze(commitmentDetails),
      deposits: Object.freeze(depositDetails),
      allocations: Object.freeze(allocations.map((allocation) => Object.freeze({
        client_deposit_allocation_id:
          allocation.client_deposit_allocation_id,
        client_group_id: allocation.client_group_id,
        bank_transaction_id: allocation.bank_transaction_id,
        fee_commitment_id: allocation.fee_commitment_id,
        allocated_amount: allocation.allocated_amount,
        reversed_amount: allocation.reversed_amount,
        active_amount: activeAmount(allocation),
        allocation_source: allocation.allocation_source,
        manual_lock: allocation.manual_lock,
        state_version: allocation.state_version,
      }))),
    }),
    reconciliation: Object.freeze({
      status: "passed",
      ranking_total: rankingTotal,
      commitment_detail_total: commitmentTotal,
      client_summary_total: totalReceivables,
      overpayment_detail_total: depositOverpaymentTotal,
    }),
    permission_prefilter_applied: true,
    unauthorized_count_included: false,
    raw_bank_source_included: false,
    invoice_required: false,
    matter_required: false,
    production_ready_claim: false,
  });
}
