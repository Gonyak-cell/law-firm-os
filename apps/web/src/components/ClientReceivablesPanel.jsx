import React, { useEffect, useId, useRef, useState } from "react";

import { normalizeFeeCommitmentMutationResult } from "./ClientReceivablesModel.js";

const MAX_VISIBLE_ROWS = 50;
const MAX_REALLOCATION_ROWS = 200;
const MAX_REASON_LENGTH = 500;

const STATE_COPY = Object.freeze({
  loading: Object.freeze({
    title: "수임료와 미수금을 불러오는 중입니다.",
    detail: "확인 전 금액은 0원으로 표시하지 않습니다.",
  }),
  empty: Object.freeze({
    title: "등록된 수임료 약정이 없습니다.",
    detail: "수임료 약정 또는 입금 내역이 아직 없습니다.",
  }),
  denied: Object.freeze({
    title: "수임료와 미수금을 볼 권한이 없습니다.",
    detail: "권한 밖 고객의 이름, 건수, 금액은 표시하지 않습니다.",
  }),
  review_required: Object.freeze({
    title: "수임료와 미수금을 보려면 담당자 확인이 필요합니다.",
    detail: "확인이 끝난 뒤 다시 불러와 주세요.",
  }),
  partial: Object.freeze({
    title: "수임료와 미수금 일부만 확인했습니다.",
    detail: "확인하지 못한 원천의 금액은 0원으로 표시하거나 변경하지 않습니다.",
  }),
  error: Object.freeze({
    title: "수임료와 미수금을 불러오지 못했습니다.",
    detail: "현재 값을 바꾸지 말고 잠시 후 다시 확인해 주세요.",
  }),
});

const TAB_LABELS = Object.freeze({
  all: "전체",
  outstanding: "미수금 있음",
  amount_unknown: "금액 미정",
  overpaid: "선입금·초과 입금",
  settled: "정산 완료",
});

const PARTIAL_SOURCE_LABELS = Object.freeze({
  receivables: "미수금 요약",
  feeCommitments: "수임료 약정",
  allocations: "입금 배분",
  deposits: "은행 입금",
  clients: "고객 목록",
});

function readField(value, camel, snake = camel) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  if (Object.prototype.hasOwnProperty.call(value, camel)) return value[camel];
  return value[snake];
}

function identifier(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function safeText(value, fallback = "확인할 수 없음", maxLength = 80) {
  if (typeof value !== "string") return fallback;
  const normalized = value.replace(/[\u0000-\u001f\u007f]/gu, " ").replace(/\s+/gu, " ").trim();
  if (!normalized) return fallback;
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 1)}…` : normalized;
}

function safeRows(value) {
  return Array.isArray(value) ? value : [];
}

function boundedRowCount(value) {
  return Number.isSafeInteger(value) && value > 0
    ? Math.min(value, MAX_VISIBLE_ROWS)
    : MAX_VISIBLE_ROWS;
}

function formatWon(value) {
  if (!Number.isSafeInteger(value) || value < 0) return "확인할 수 없음";
  return `${new Intl.NumberFormat("ko-KR").format(value)}원`;
}

function formatCount(value) {
  return Number.isSafeInteger(value) && value >= 0 ? `${value}건` : "확인할 수 없음";
}

function formatDate(value, fallback = "정해지지 않음") {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}/u.test(value)) return fallback;
  return value.slice(0, 10).replaceAll("-", ".");
}

function parseWholeWon(value) {
  const normalized = String(value ?? "").replaceAll(",", "").trim();
  if (!/^\d+$/u.test(normalized)) return null;
  const amount = Number(normalized);
  return Number.isSafeInteger(amount) && amount >= 0 ? amount : null;
}

function isExpectedVersion(value) {
  return Number.isSafeInteger(value) && value >= 1;
}

function invoke(callback, payload) {
  if (typeof callback === "function") callback(payload);
}

function collectClientOptions(clients, summaries) {
  const byId = new Map();
  for (const row of [...safeRows(clients), ...safeRows(summaries)]) {
    const clientGroupId = identifier(readField(row, "clientGroupId", "client_group_id"));
    if (!clientGroupId) continue;
    const displayName = safeText(readField(row, "displayName", "display_name"), "이름 확인 필요");
    const current = byId.get(clientGroupId);
    if (!current || current.displayName === "이름 확인 필요") {
      byId.set(clientGroupId, { clientGroupId, displayName, summary: row });
    }
  }
  return [...byId.values()];
}

function matchingClientId(row) {
  return identifier(readField(row, "clientGroupId", "client_group_id"));
}

function feeId(row) {
  return identifier(readField(row, "feeCommitmentId", "fee_commitment_id"));
}

function depositId(row) {
  return identifier(readField(row, "bankTransactionId", "bank_transaction_id"));
}

function allocationId(row) {
  return identifier(readField(row, "clientDepositAllocationId", "client_deposit_allocation_id"));
}

function feeScenarioLabels(summary, commitments, allocations) {
  const clientGroupId = matchingClientId(summary);
  const allClientCommitments = commitments.filter((row) => matchingClientId(row) === clientGroupId);
  const clientCommitments = allClientCommitments.filter((row) => row.active !== false);
  const commitmentIds = new Set(allClientCommitments.map(feeId).filter(Boolean));
  const clientAllocations = allocations.filter((row) => commitmentIds.has(feeId(row)));
  const allCancelled = allClientCommitments.length > 0
    && allClientCommitments.every((row) => row.status === "cancelled");
  const hasUnknownAmount = (
    Number.isSafeInteger(summary.unknownAmountCount)
    && summary.unknownAmountCount > 0
  ) || clientCommitments.some((row) => row.agreedAmount === null);
  const labels = [];
  if (
    Number.isSafeInteger(summary.activeAllocatedAmount)
    && summary.activeAllocatedAmount > 0
    && Number.isSafeInteger(summary.receivableAmount)
    && summary.receivableAmount > 0
  ) labels.push("일부 입금");
  if (hasUnknownAmount) labels.push("금액 미정");
  if (Number.isSafeInteger(summary.overpaymentAmount) && summary.overpaymentAmount > 0) labels.push("선입금·초과 입금");
  if (
    !allCancelled
    && clientCommitments.length > 0
    && !hasUnknownAmount
    && summary.receivableAmount === 0
  ) labels.push("정산 완료");
  if (clientCommitments.length > 1) labels.push("여러 수임료 약정");
  if (allCancelled) labels.push("취소됨");
  if (clientAllocations.some((row) => row.manualLock === true)) labels.push("수동 배분 유지");
  if (clientAllocations.some((row) => Number.isSafeInteger(row.reversedAmount) && row.reversedAmount > 0)) {
    labels.push("환불 반영 배분");
  }
  return labels;
}

function mutationState(value) {
  if (!value) return null;
  if (typeof value.state === "string") return value;
  return normalizeFeeCommitmentMutationResult(value);
}

export function nextClientReceivablesTabIndex(currentIndex, key, count) {
  if (!Number.isSafeInteger(currentIndex) || !Number.isSafeInteger(count) || count < 1) return null;
  if (key === "Home") return 0;
  if (key === "End") return count - 1;
  if (key === "ArrowRight" || key === "ArrowDown") return (currentIndex + 1) % count;
  if (key === "ArrowLeft" || key === "ArrowUp") return (currentIndex - 1 + count) % count;
  return null;
}

function StateNotice({ state, detail, onRefresh }) {
  const copy = STATE_COPY[state] ?? STATE_COPY.error;
  return (
    <div
      className={`client-consultation-state live-data-state live-data-${state === "review_required" ? "review" : state}`}
      role={state === "error" ? "alert" : "status"}
      data-client-receivables-state={state}
    >
      <strong>{copy.title}</strong>
      <span>{detail || copy.detail}</span>
      {state === "error" && typeof onRefresh === "function" ? (
        <button className="secondary-button" type="button" onClick={onRefresh}>
          다시 불러오기
        </button>
      ) : null}
    </div>
  );
}

function MutationNotice({ mutation, onRefresh }) {
  const noticeRef = useRef(null);
  const state = mutation?.state ?? null;
  useEffect(() => {
    if (state === "stale_conflict") noticeRef.current?.focus();
  }, [state]);
  if (!state || state === "loading") return null;
  const copy = {
    passed: "변경 사항을 저장했습니다.",
    replayed: "이미 처리된 요청과 같은 결과를 확인했습니다.",
    partial: "변경 결과 일부만 확인했습니다. 최신 내용을 다시 확인해 주세요.",
    denied: "변경할 권한이 없습니다.",
    error: "변경 결과를 확인하지 못했습니다.",
    stale_conflict: "다른 사용자가 먼저 수정했습니다. 최신 내용을 불러온 뒤 다시 입력해 주세요.",
  }[state] ?? "변경 결과를 확인하지 못했습니다.";
  const failed = ["partial", "denied", "error", "stale_conflict"].includes(state);
  return (
    <div
      ref={noticeRef}
      className={`client-command-state ${state === "stale_conflict" ? "conflict" : failed ? state : "success"}`}
      role={state === "stale_conflict" ? "alert" : "status"}
      tabIndex={state === "stale_conflict" ? -1 : undefined}
      data-client-receivables-mutation={state}
    >
      {copy}
      {state === "stale_conflict" && typeof onRefresh === "function" ? (
        <button className="secondary-button" type="button" onClick={onRefresh}>
          최신 내용 다시 불러오기
        </button>
      ) : null}
    </div>
  );
}

function StatusTabs({ tabs, activeCode, onChange }) {
  const visibleTabs = safeRows(tabs);
  function handleKeyDown(event, index) {
    const nextIndex = nextClientReceivablesTabIndex(index, event.key, visibleTabs.length);
    if (nextIndex === null) return;
    event.preventDefault();
    const nextTab = visibleTabs[nextIndex];
    invoke(onChange, nextTab.code);
    event.currentTarget.parentElement?.querySelectorAll('[role="tab"]')[nextIndex]?.focus();
  }
  return (
    <div className="client-consultation-tabs" role="tablist" aria-label="수임료·미수금 상태">
      {visibleTabs.map((tab, index) => {
        const active = tab.code === activeCode;
        return (
          <button
            key={tab.code}
            type="button"
            role="tab"
            aria-selected={active}
            aria-controls="client-receivables-client-list"
            tabIndex={active ? 0 : -1}
            className={active ? "active" : ""}
            data-client-receivables-status-tab={tab.code}
            onClick={() => invoke(onChange, tab.code)}
            onKeyDown={(event) => handleKeyDown(event, index)}
          >
            {TAB_LABELS[tab.code] ?? safeText(tab.label, "상태")}
          </button>
        );
      })}
    </div>
  );
}

function ReceivablesSummary({ model }) {
  return (
    <div className="client-consultation-detail-facts" aria-label="수임료·미수금 요약" data-client-receivables-summary="true">
      <div>
        <strong>남은 미수금</strong>
        <span>{formatWon(model.totalReceivables)}</span>
      </div>
      <div>
        <strong>금액 미정</strong>
        <span>{formatCount(model.unknownAmountCount)}</span>
      </div>
      <div>
        <strong>선입금·초과 입금</strong>
        <span>{formatWon(model.totalOverpayment)}</span>
      </div>
      <div>
        <strong>아직 배분하지 않은 금액</strong>
        <span>{formatWon(model.unallocatedAmount)}</span>
      </div>
    </div>
  );
}

function CreateFeeForm({ selectedClient, disabled, pending, onCreate }) {
  const amountId = useId();
  const dueDateId = useId();
  const reasonId = useId();
  const [amount, setAmount] = useState("");
  const [amountUndecided, setAmountUndecided] = useState(false);
  const [dueDate, setDueDate] = useState("");
  const [reason, setReason] = useState("");
  const agreedAmount = amountUndecided ? null : parseWholeWon(amount);
  const valid = Boolean(
    selectedClient
    && (amountUndecided || agreedAmount !== null)
    && reason.trim()
    && !disabled
    && !pending
    && typeof onCreate === "function",
  );
  function submit(event) {
    event.preventDefault();
    if (!valid) return;
    invoke(onCreate, {
      clientGroupId: selectedClient.clientGroupId,
      agreedAmount,
      dueDate: dueDate || null,
      reason: reason.trim(),
    });
  }
  return (
    <form className="client-command-form" data-client-receivables-create-form="true" onSubmit={submit} noValidate>
      <div className="client-command-form-heading">
        <div>
          <strong>수임료 약정 등록</strong>
          <span>{selectedClient ? `${selectedClient.displayName} 고객` : "고객을 먼저 선택하세요."}</span>
        </div>
      </div>
      <div className="client-command-form-grid">
        <label className="client-command-field" htmlFor={amountId}>
          <span>약정 수임료</span>
          <input
            id={amountId}
            inputMode="numeric"
            value={amount}
            disabled={disabled || pending || amountUndecided}
            placeholder="원 단위 금액"
            aria-describedby={`${amountId}-help`}
            onChange={(event) => setAmount(event.target.value)}
          />
          <small id={`${amountId}-help`}>0원과 금액 미정은 서로 다르게 기록합니다.</small>
        </label>
        <label className="client-command-field" htmlFor={dueDateId}>
          <span>납부기한</span>
          <input
            id={dueDateId}
            type="date"
            value={dueDate}
            disabled={disabled || pending}
            onChange={(event) => setDueDate(event.target.value)}
          />
        </label>
      </div>
      <label className="client-command-checkbox">
        <input
          type="checkbox"
          checked={amountUndecided}
          disabled={disabled || pending || Boolean(amount.trim())}
          onChange={(event) => setAmountUndecided(event.target.checked)}
        />
        <span>수임료 금액이 아직 정해지지 않았습니다.</span>
      </label>
      <label className="client-command-field" htmlFor={reasonId}>
        <span>등록 사유</span>
        <textarea
          id={reasonId}
          rows={2}
          value={reason}
          maxLength={MAX_REASON_LENGTH}
          disabled={disabled || pending}
          onChange={(event) => setReason(event.target.value)}
        />
      </label>
      <div className="client-command-form-footer">
        <span>저장할 때 권한과 최신 상태를 다시 확인합니다.</span>
        <button className="primary-button" type="submit" disabled={!valid}>
          {pending ? "등록 중" : "수임료 약정 등록"}
        </button>
      </div>
    </form>
  );
}

function FeeWriteForm({ fee, disabled, pendingAction, onUpdate, onCancel }) {
  const amountId = useId();
  const dueDateId = useId();
  const reasonId = useId();
  const [storedDraft, setStoredDraft] = useState(null);
  const currentFeeId = feeId(fee);
  const fallback = {
    feeId: currentFeeId,
    amount: fee.agreedAmount === null ? "" : String(fee.agreedAmount),
    amountUndecided: fee.agreedAmount === null,
    dueDate: fee.dueDate ?? "",
    reason: "",
    cancelConfirmed: false,
  };
  const draft = storedDraft?.feeId === currentFeeId ? storedDraft : fallback;
  function updateDraft(changes) {
    setStoredDraft({ ...draft, ...changes, feeId: currentFeeId });
  }
  const agreedAmount = draft.amountUndecided ? null : parseWholeWon(draft.amount);
  const amountValid = draft.amountUndecided || agreedAmount !== null;
  const changes = {};
  if (amountValid && agreedAmount !== fee.agreedAmount) changes.agreedAmount = agreedAmount;
  const nextDueDate = draft.dueDate || null;
  if (nextDueDate !== (fee.dueDate ?? null)) changes.dueDate = nextDueDate;
  const hasExpectedVersion = isExpectedVersion(fee.stateVersion);
  const writeBlocked = disabled || !hasExpectedVersion;
  const updateValid = Boolean(
    !writeBlocked
    && !pendingAction
    && amountValid
    && draft.reason.trim()
    && Object.keys(changes).length > 0
    && typeof onUpdate === "function",
  );
  const cancelValid = Boolean(
    !writeBlocked
    && !pendingAction
    && draft.reason.trim()
    && draft.cancelConfirmed
    && typeof onCancel === "function",
  );
  function submit(event) {
    event.preventDefault();
    if (!updateValid) return;
    invoke(onUpdate, {
      feeCommitmentId: currentFeeId,
      expectedStateVersion: fee.stateVersion,
      changes,
      reason: draft.reason.trim(),
    });
  }
  function cancel() {
    if (!cancelValid) return;
    invoke(onCancel, {
      feeCommitmentId: currentFeeId,
      expectedStateVersion: fee.stateVersion,
      reason: draft.reason.trim(),
    });
  }
  return (
    <form className="client-command-form compact" data-client-receivables-update-form="true" onSubmit={submit} noValidate>
      <strong>선택한 수임료 약정 변경</strong>
      <div className="client-command-form-grid">
        <label className="client-command-field" htmlFor={amountId}>
          <span>약정 수임료</span>
          <input
            id={amountId}
            inputMode="numeric"
            value={draft.amount}
            disabled={writeBlocked || Boolean(pendingAction) || draft.amountUndecided}
            onChange={(event) => updateDraft({ amount: event.target.value })}
          />
        </label>
        <label className="client-command-field" htmlFor={dueDateId}>
          <span>납부기한</span>
          <input
            id={dueDateId}
            type="date"
            value={draft.dueDate}
            disabled={writeBlocked || Boolean(pendingAction)}
            onChange={(event) => updateDraft({ dueDate: event.target.value })}
          />
        </label>
      </div>
      <label className="client-command-checkbox">
        <input
          type="checkbox"
          checked={draft.amountUndecided}
          disabled={writeBlocked || Boolean(pendingAction) || Boolean(draft.amount.trim())}
          onChange={(event) => updateDraft({ amountUndecided: event.target.checked })}
        />
        <span>금액 미정으로 기록</span>
      </label>
      <label className="client-command-field" htmlFor={reasonId}>
        <span>변경·취소 사유</span>
        <textarea
          id={reasonId}
          rows={2}
          value={draft.reason}
          maxLength={MAX_REASON_LENGTH}
          disabled={writeBlocked || Boolean(pendingAction)}
          aria-describedby={`${reasonId}-version`}
          onChange={(event) => updateDraft({ reason: event.target.value })}
        />
        <small id={`${reasonId}-version`}>
          {hasExpectedVersion
            ? `현재 변경 번호 ${fee.stateVersion}를 기준으로 저장합니다.`
            : "최신 변경 번호를 확인해야 변경할 수 있습니다."}
        </small>
      </label>
      <label className="client-command-checkbox">
        <input
          type="checkbox"
          checked={draft.cancelConfirmed}
          disabled={writeBlocked || Boolean(pendingAction)}
          onChange={(event) => updateDraft({ cancelConfirmed: event.target.checked })}
        />
        <span>이 수임료 약정을 취소하는 경우 확인했습니다.</span>
      </label>
      <div className="client-command-form-footer">
        <button className="secondary-button" type="submit" disabled={!updateValid}>
          {pendingAction === "update" ? "변경 중" : "약정 변경 저장"}
        </button>
        <button
          className="primary-button danger-button"
          type="button"
          disabled={!cancelValid}
          style={{ backgroundColor: "var(--am-danger)" }}
          onClick={cancel}
        >
          {pendingAction === "cancel" ? "취소 중" : "수임료 약정 취소"}
        </button>
      </div>
    </form>
  );
}

function buildReallocationTargets(allocations, selectedFee, activeAmount) {
  const targetAmounts = new Map();
  for (const row of allocations) {
    const targetFeeId = feeId(row);
    if (!targetFeeId || !Number.isSafeInteger(row.activeAmount) || row.activeAmount < 0) return null;
    const next = (targetAmounts.get(targetFeeId) ?? 0) + row.activeAmount;
    if (!Number.isSafeInteger(next)) return null;
    targetAmounts.set(targetFeeId, next);
  }
  targetAmounts.set(feeId(selectedFee), activeAmount);
  return [...targetAmounts.entries()].map(([feeCommitmentId, amount]) => ({
    feeCommitmentId,
    activeAmount: amount,
  }));
}

function DepositReallocationForm({ deposit, fee, allocations, disabled, pending, onReallocate }) {
  const amountId = useId();
  const reasonId = useId();
  const currentFeeId = feeId(fee);
  const currentDepositId = depositId(deposit);
  const selectedAllocations = allocations.filter((row) => depositId(row) === currentDepositId);
  const currentActiveAmount = selectedAllocations
    .filter((row) => feeId(row) === currentFeeId)
    .reduce((sum, row) => sum + (Number.isSafeInteger(row.activeAmount) ? row.activeAmount : 0), 0);
  const [storedDraft, setStoredDraft] = useState(null);
  const draftKey = `${currentDepositId}:${currentFeeId}`;
  const draft = storedDraft?.key === draftKey
    ? storedDraft
    : { key: draftKey, amount: String(currentActiveAmount), reason: "" };
  function updateDraft(changes) {
    setStoredDraft({ ...draft, ...changes, key: draftKey });
  }
  const activeAmount = parseWholeWon(draft.amount);
  const expectedAllocations = selectedAllocations.map((row) => ({
    clientDepositAllocationId: allocationId(row),
    stateVersion: row.stateVersion,
  }));
  const versionsValid = selectedAllocations.length <= MAX_REALLOCATION_ROWS
    && expectedAllocations.every((row) => row.clientDepositAllocationId && isExpectedVersion(row.stateVersion));
  const targets = activeAmount === null ? null : buildReallocationTargets(selectedAllocations, fee, activeAmount);
  const targetTotal = targets?.reduce((sum, row) => sum + row.activeAmount, 0) ?? null;
  const amountWithinFee = activeAmount !== null
    && Number.isSafeInteger(fee.agreedAmount)
    && activeAmount <= fee.agreedAmount;
  const amountWithinDeposit = Number.isSafeInteger(targetTotal)
    && Number.isSafeInteger(deposit.netAmount)
    && targetTotal <= deposit.netAmount;
  const valid = Boolean(
    !disabled
    && !pending
    && fee.active !== false
    && amountWithinFee
    && amountWithinDeposit
    && versionsValid
    && draft.reason.trim()
    && targets
    && typeof onReallocate === "function",
  );
  function submit(event) {
    event.preventDefault();
    if (!valid) return;
    invoke(onReallocate, {
      bankTransactionId: currentDepositId,
      clientGroupId: matchingClientId(deposit),
      depositNetAmount: deposit.netAmount,
      expectedAllocations,
      targets,
      reason: draft.reason.trim(),
    });
  }
  return (
    <form className="client-command-form compact" data-client-receivables-reallocation-form="true" onSubmit={submit} noValidate>
      <strong>입금 배분 다시 정하기</strong>
      <label className="client-command-field" htmlFor={amountId}>
        <span>선택한 수임료에 배분할 금액</span>
        <input
          id={amountId}
          inputMode="numeric"
          value={draft.amount}
          disabled={disabled || pending || fee.agreedAmount === null || fee.active === false}
          aria-describedby={`${amountId}-help`}
          onChange={(event) => updateDraft({ amount: event.target.value })}
        />
        <small id={`${amountId}-help`}>
          환불 반영 후 입금액과 약정 수임료보다 많이 배분할 수 없습니다.
        </small>
      </label>
      <label className="client-command-field" htmlFor={reasonId}>
        <span>재배분 사유</span>
        <textarea
          id={reasonId}
          rows={2}
          value={draft.reason}
          maxLength={MAX_REASON_LENGTH}
          disabled={disabled || pending}
          onChange={(event) => updateDraft({ reason: event.target.value })}
        />
      </label>
      <div className="client-command-form-footer">
        <span>
          {versionsValid
            ? `현재 배분 기록 ${expectedAllocations.length}건의 변경 번호를 함께 확인합니다.`
            : "각 배분 기록의 변경 번호를 모두 확인해야 다시 배분할 수 있습니다."}
        </span>
        <button className="primary-button" type="submit" disabled={!valid}>
          {pending ? "재배분 중" : "입금 배분 저장"}
        </button>
      </div>
    </form>
  );
}

function SelectionDetail({
  client,
  fee,
  deposit,
  allocations,
  commitments,
  writeBlocked,
  pendingAction,
  onSelectClient,
  onSelectFee,
  onSelectDeposit,
  onCreate,
  onUpdate,
  onCancel,
  onReallocate,
  returnFocusRef,
}) {
  const headingRef = useRef(null);
  const [activeAction, setActiveAction] = useState(null);
  const selectedClientId = matchingClientId(client);
  const selectedFeeId = feeId(fee);
  const selectedDepositId = depositId(deposit);
  useEffect(() => {
    if (selectedClientId) headingRef.current?.focus();
  }, [selectedClientId]);
  useEffect(() => {
    setActiveAction(null);
  }, [selectedClientId, selectedFeeId, selectedDepositId]);
  useEffect(() => {
    if (writeBlocked) setActiveAction(null);
  }, [writeBlocked]);
  if (!client) return null;
  const selectedDepositAllocations = allocations.filter((row) => depositId(row) === selectedDepositId);
  const selectedFeeAllocations = allocations.filter((row) => feeId(row) === selectedFeeId);
  function close() {
    setActiveAction(null);
    invoke(onSelectFee, null);
    invoke(onSelectDeposit, null);
    invoke(onSelectClient, null);
    returnFocusRef?.current?.focus();
  }
  function handleKeyDown(event) {
    if (event.key !== "Escape") return;
    event.preventDefault();
    close();
  }
  return (
    <section
      className="client-consultation-detail"
      aria-labelledby="client-receivables-detail-heading"
      data-client-receivables-detail="true"
      style={{ position: "relative" }}
      onKeyDown={handleKeyDown}
    >
      <div className="client-consultation-detail-header">
        <div style={{ paddingInlineEnd: "40px" }}>
          <span className="client-consultation-detail-kicker">선택 고객 금액 내역</span>
          <h2 id="client-receivables-detail-heading" ref={headingRef} tabIndex={-1}>
            {client?.displayName ?? "고객"}
          </h2>
        </div>
        <button
          className="record-overlay-close"
          type="button"
          aria-label="수임료·미수금 상세 닫기"
          style={{ position: "absolute", insetBlockStart: "10px", insetInlineEnd: "10px" }}
          onClick={close}
        >
          <span aria-hidden="true">×</span>
        </button>
      </div>
      <div
        className="client-consultation-tabs"
        role="group"
        aria-label="금액 작업 선택"
        data-client-receivables-actions="true"
      >
        <button
          type="button"
          className={activeAction === "fee" ? "active" : ""}
          aria-pressed={activeAction === "fee"}
          aria-controls="client-receivables-fee-action"
          disabled={
            !fee
            || writeBlocked
            || (typeof onUpdate !== "function" && typeof onCancel !== "function")
          }
          data-client-receivables-action="fee"
          onClick={() => setActiveAction(activeAction === "fee" ? null : "fee")}
        >
          약정 변경
        </button>
        <button
          type="button"
          className={activeAction === "deposit" ? "active" : ""}
          aria-pressed={activeAction === "deposit"}
          aria-controls="client-receivables-deposit-action"
          disabled={!fee || !deposit || writeBlocked || typeof onReallocate !== "function"}
          data-client-receivables-action="deposit"
          onClick={() => setActiveAction(activeAction === "deposit" ? null : "deposit")}
        >
          입금 배분
        </button>
        {typeof onCreate === "function" ? (
          <button
            type="button"
            className={activeAction === "create" ? "active" : ""}
            aria-pressed={activeAction === "create"}
            aria-controls="client-receivables-create-action"
            disabled={writeBlocked}
            data-client-receivables-action="create"
            onClick={() => setActiveAction(activeAction === "create" ? null : "create")}
          >
            새 약정
          </button>
        ) : null}
      </div>
      {fee ? (
        <>
          <div className="client-consultation-detail-facts" aria-label="수임료 약정 상세">
            <span><b>약정 수임료</b>{fee.agreedAmount === null ? "금액 미정" : formatWon(fee.agreedAmount)}</span>
            <span><b>연결 입금</b>{formatWon(fee.activeAllocatedAmount)}</span>
            <span><b>남은 미수금</b>{fee.receivableAmount === null ? "금액 미정" : formatWon(fee.receivableAmount)}</span>
            <span><b>납부기한</b>{formatDate(fee.dueDate)}</span>
            <span><b>약정 상태</b>{safeText(fee.statusLabel, "상태 확인 필요", 40)}</span>
            <span><b>현재 변경 번호</b>{isExpectedVersion(fee.stateVersion) ? fee.stateVersion : "확인 필요"}</span>
          </div>
          {selectedFeeAllocations.length > 0 ? (
            <div className="client-activities-list" role="list" aria-label="선택한 수임료의 입금 배분">
              {selectedFeeAllocations.slice(0, MAX_VISIBLE_ROWS).map((row, index) => (
                <div className="client-activity-row" role="listitem" key={allocationId(row) ?? index}>
                  <strong>{safeText(row.allocationSourceLabel, row.manualLock ? "수동 배분" : "자동 배분", 40)}</strong>
                  <span>현재 배분 {formatWon(row.activeAmount)}</span>
                  <small>
                    {Number.isSafeInteger(row.reversedAmount) && row.reversedAmount > 0
                      ? `환불 반영 배분 ${formatWon(row.reversedAmount)}`
                      : row.manualLock
                        ? "수동 배분 유지"
                        : "환불 반영 없음"}
                  </small>
                </div>
              ))}
            </div>
          ) : null}
        </>
      ) : null}
      {deposit ? (
        <>
          <div className="client-consultation-detail-facts" aria-label="입금 배분 상세">
            <span><b>입금일</b>{formatDate(deposit.occurredAt, "일자 확인 필요")}</span>
            <span><b>입금액</b>{formatWon(deposit.grossAmount)}</span>
            <span><b>환불 반영</b>{formatWon(deposit.linkedRefundAmount)}</span>
            <span><b>배분 후 남은 입금액</b>{formatWon(deposit.netAmount)}</span>
            <span><b>현재 배분</b>{formatWon(deposit.activeAllocatedAmount)}</span>
            <span><b>선입금·초과 입금</b>{formatWon(deposit.overpaymentAmount)}</span>
          </div>
          {selectedDepositAllocations.length > 0 ? (
            <div className="client-activities-list" role="list" aria-label="선택한 입금의 현재 배분">
              {selectedDepositAllocations.slice(0, MAX_VISIBLE_ROWS).map((row, index) => {
                const targetFee = commitments.find((item) => feeId(item) === feeId(row));
                return (
                  <div className="client-activity-row" role="listitem" key={allocationId(row) ?? index}>
                    <strong>
                      {targetFee?.agreedAmount === null
                        ? "금액 미정 약정"
                        : `약정 수임료 ${formatWon(targetFee?.agreedAmount)}`}
                    </strong>
                    <span>현재 배분 {formatWon(row.activeAmount)}</span>
                    <small>
                      {Number.isSafeInteger(row.reversedAmount) && row.reversedAmount > 0
                        ? `환불 반영 배분 ${formatWon(row.reversedAmount)}`
                        : row.manualLock
                          ? "수동 배분 유지"
                          : "자동 배분"}
                    </small>
                  </div>
                );
              })}
            </div>
          ) : null}
          {!fee ? (
            <div className="client-consultation-boundary-note" role="status">
              입금을 다시 배분하려면 수임료 약정을 명시적으로 선택하세요.
            </div>
          ) : null}
        </>
      ) : null}
      {activeAction === "fee" && fee ? (
        <div id="client-receivables-fee-action">
          <FeeWriteForm
            fee={fee}
            disabled={writeBlocked}
            pendingAction={pendingAction}
            onUpdate={onUpdate}
            onCancel={onCancel}
          />
        </div>
      ) : null}
      {activeAction === "deposit" && fee && deposit ? (
        <div id="client-receivables-deposit-action">
          <DepositReallocationForm
            deposit={deposit}
            fee={fee}
            allocations={allocations}
            disabled={writeBlocked}
            pending={pendingAction === "reallocate"}
            onReallocate={onReallocate}
          />
        </div>
      ) : null}
      {activeAction === "create" && typeof onCreate === "function" ? (
        <div id="client-receivables-create-action">
          <CreateFeeForm
            selectedClient={client}
            disabled={writeBlocked}
            pending={pendingAction === "create"}
            onCreate={onCreate}
          />
        </div>
      ) : null}
    </section>
  );
}

export function ClientReceivablesPanel({
  model,
  clients = [],
  selectedClientId = null,
  selectedFeeCommitmentId = null,
  selectedDepositId = null,
  maxVisibleRows = MAX_VISIBLE_ROWS,
  pendingAction = null,
  mutationResult = null,
  onStatusTabChange,
  onSearchChange,
  onSelectClient,
  onSelectFeeCommitment,
  onSelectDeposit,
  onCreateFeeCommitment,
  onUpdateFeeCommitment,
  onCancelFeeCommitment,
  onReallocateDeposit,
  onRefresh,
}) {
  const state = model && (model.state === "data" || STATE_COPY[model.state]) ? model.state : "error";
  const clientSelectRef = useRef(null);
  if (["loading", "denied", "review_required", "error"].includes(state)) {
    return <StateNotice state={state} onRefresh={onRefresh} />;
  }

  const rowLimit = boundedRowCount(maxVisibleRows);
  const commitments = safeRows(model.commitments);
  const visibleCommitments = safeRows(model.visibleCommitments);
  const allocations = safeRows(model.allocations);
  const deposits = safeRows(model.deposits);
  const summaries = safeRows(model.clientSummaries);
  const allClientOptions = collectClientOptions(clients, summaries);
  const visibleClientIds = new Set(visibleCommitments.map(matchingClientId).filter(Boolean));
  const activeStatusTab = identifier(model.activeStatusTab) ?? "all";
  const hasListFilter = activeStatusTab !== "all"
    || (typeof model.searchQuery === "string" && model.searchQuery.trim().length > 0);
  const eligibleClientOptions = hasListFilter
    ? allClientOptions.filter((row) => visibleClientIds.has(row.clientGroupId))
    : allClientOptions;
  const clientOptions = eligibleClientOptions.slice(0, rowLimit);
  const requestedClientId = identifier(selectedClientId);
  const requestedFeeId = identifier(selectedFeeCommitmentId);
  const requestedDepositId = identifier(selectedDepositId);
  const selectedClient = clientOptions.find((row) => row.clientGroupId === requestedClientId) ?? null;
  const feeOptions = selectedClient
    ? visibleCommitments.filter((row) => matchingClientId(row) === selectedClient.clientGroupId).slice(0, rowLimit)
    : [];
  const depositOptions = selectedClient
    ? deposits.filter((row) => matchingClientId(row) === selectedClient.clientGroupId).slice(0, rowLimit)
    : [];
  const selectedFee = selectedClient
    ? feeOptions.find((row) => feeId(row) === requestedFeeId) ?? null
    : null;
  const selectedDeposit = selectedClient
    ? depositOptions.find((row) => depositId(row) === requestedDepositId) ?? null
    : null;
  const selectedClientToken = selectedClient
    ? `client-${clientOptions.indexOf(selectedClient) + 1}`
    : "";
  const selectedFeeToken = selectedFee ? `fee-${feeOptions.indexOf(selectedFee) + 1}` : "";
  const selectedDepositToken = selectedDeposit ? `deposit-${depositOptions.indexOf(selectedDeposit) + 1}` : "";
  const mutation = mutationState(mutationResult ?? model.mutation);
  const staleConflict = mutation?.state === "stale_conflict";
  const writeBlocked = state !== "data" || staleConflict;
  const visibleSummaries = summaries
    .filter((row) => visibleClientIds.has(matchingClientId(row)))
    .filter((row) => clientOptions.some((client) => client.clientGroupId === matchingClientId(row)))
    .slice(0, rowLimit);
  const rowsTruncated = eligibleClientOptions.length > rowLimit
    || visibleCommitments.length > rowLimit
    || deposits.length > rowLimit;
  const partialSourceText = safeRows(model.partialSources)
    .map((source) => PARTIAL_SOURCE_LABELS[source])
    .filter(Boolean)
    .join(", ");

  function changeClient(event) {
    const nextIndex = Number(event.target.value.replace("client-", "")) - 1;
    const next = clientOptions[nextIndex] ?? null;
    invoke(onSelectClient, next?.clientGroupId ?? null);
  }

  function changeFee(event) {
    const nextIndex = Number(event.target.value.replace("fee-", "")) - 1;
    invoke(onSelectFeeCommitment, feeId(feeOptions[nextIndex]) ?? null);
  }

  function changeDeposit(event) {
    const nextIndex = Number(event.target.value.replace("deposit-", "")) - 1;
    invoke(onSelectDeposit, depositId(depositOptions[nextIndex]) ?? null);
  }

  function clearSelectionForFilter() {
    if (requestedFeeId) invoke(onSelectFeeCommitment, null);
    if (requestedDepositId) invoke(onSelectDeposit, null);
    if (requestedClientId) invoke(onSelectClient, null);
  }

  function changeStatusTab(code) {
    clearSelectionForFilter();
    invoke(onStatusTabChange, code);
  }

  function changeSearchQuery(query) {
    clearSelectionForFilter();
    invoke(onSearchChange, query);
  }

  return (
    <section
      className="client-consultation-surface"
      aria-labelledby="client-receivables-heading"
      data-client-receivables-panel="true"
      data-client-receivables-state={state}
      data-client-receivables-invoice-required="false"
      data-client-receivables-matter-required="false"
    >
      <div className="client-consultation-toolbar">
        <div>
          <strong id="client-receivables-heading">수임료·미수금</strong>
          <span>고객, 수임료 약정, 입금을 직접 선택해 확인하고 변경합니다.</span>
        </div>
        <label className="client-consultation-search">
          <span>고객 검색</span>
          <input
            type="search"
            value={model.searchQuery ?? ""}
            placeholder="고객명"
            aria-label="수임료·미수금 고객 검색"
            onChange={(event) => changeSearchQuery(event.target.value)}
          />
        </label>
      </div>

      <StatusTabs
        tabs={model.statusTabs}
        activeCode={model.activeStatusTab}
        onChange={changeStatusTab}
      />

      {state === "partial" ? (
        <StateNotice
          state="partial"
          detail={safeText(
            model.partialReason,
            partialSourceText
              ? `${partialSourceText} 일부를 확인하지 못했습니다.`
              : STATE_COPY.partial.detail,
            180,
          )}
        />
      ) : null}

      {state === "empty" ? <StateNotice state="empty" /> : <ReceivablesSummary model={model} />}

      {typeof onCreateFeeCommitment !== "function" ? (
        <div
          className="client-consultation-boundary-note"
          role="note"
          data-client-receivables-engagement-create-notice="true"
        >
          새 수임료 약정은 상담·수임 관리에서 수임을 확정할 때 함께 등록됩니다.
        </div>
      ) : null}

      <div className="client-command-form compact" aria-label="수임료·미수금 선택">
        <div className="client-command-form-grid">
          <label className="client-command-field">
            <span>고객 선택</span>
            <select
              ref={clientSelectRef}
              value={selectedClientToken}
              data-client-receivables-client-select="true"
              disabled={clientOptions.length === 0 || typeof onSelectClient !== "function"}
              onChange={changeClient}
            >
              <option value="">고객을 선택하세요</option>
              {clientOptions.map((client, index) => (
                <option key={client.clientGroupId} value={`client-${index + 1}`}>
                  {client.displayName}
                </option>
              ))}
            </select>
          </label>
          <label className="client-command-field">
            <span>수임료 약정 선택</span>
            <select
              value={selectedFeeToken}
              data-client-receivables-fee-select="true"
              disabled={!selectedClient || feeOptions.length === 0 || typeof onSelectFeeCommitment !== "function"}
              onChange={changeFee}
            >
              <option value="">수임료 약정을 선택하세요</option>
              {feeOptions.map((fee, index) => (
                <option key={feeId(fee) ?? index} value={`fee-${index + 1}`}>
                  {fee.agreedAmount === null ? "금액 미정" : `약정 수임료 ${formatWon(fee.agreedAmount)}`}
                  {fee.dueDate ? ` · ${formatDate(fee.dueDate)}` : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="client-command-field">
            <span>입금 선택</span>
            <select
              value={selectedDepositToken}
              data-client-receivables-deposit-select="true"
              disabled={!selectedClient || depositOptions.length === 0 || typeof onSelectDeposit !== "function"}
              onChange={changeDeposit}
            >
              <option value="">입금을 선택하세요</option>
              {depositOptions.map((deposit, index) => (
                <option key={depositId(deposit) ?? index} value={`deposit-${index + 1}`}>
                  {formatDate(deposit.occurredAt, "일자 확인 필요")}
                  {` · 입금액 ${formatWon(deposit.netAmount)}`}
                  {Number.isSafeInteger(deposit.overpaymentAmount) && deposit.overpaymentAmount > 0
                    ? ` · 초과 ${formatWon(deposit.overpaymentAmount)}`
                    : ""}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {rowsTruncated ? (
        <div className="client-consultation-boundary-note" role="status" data-client-receivables-bounded="true">
          한 화면에는 최대 {rowLimit}건만 표시합니다. 더 많은 기록은 상위 화면에서 범위를 좁혀 주세요.
        </div>
      ) : null}

      {visibleSummaries.length > 0 ? (
        <div
          id="client-receivables-client-list"
          className="client-consultation-list"
          role="list"
          aria-label="고객별 수임료·미수금"
        >
          {visibleSummaries.map((summary, index) => {
            const clientGroupId = matchingClientId(summary);
            const client = clientOptions.find((row) => row.clientGroupId === clientGroupId);
            const selected = selectedClient?.clientGroupId === clientGroupId;
            const scenarios = feeScenarioLabels(summary, commitments, allocations);
            return (
              <div className={selected ? "client-consultation-row selected" : "client-consultation-row"} role="listitem" key={clientGroupId ?? index}>
                <button
                  className="client-consultation-row-button"
                  type="button"
                  aria-pressed={selected}
                  aria-label={`${client?.displayName ?? "고객"} 수임료·미수금 선택`}
                  disabled={typeof onSelectClient !== "function"}
                  data-client-receivables-client-row={index + 1}
                  data-client-ar-scenarios={scenarios.join(",")}
                  onClick={() => invoke(onSelectClient, clientGroupId)}
                >
                  <span className="client-consultation-row-heading">
                    <strong>{client?.displayName ?? "이름 확인 필요"}</strong>
                    <span>{scenarios.length > 0 ? scenarios.join(" · ") : "정산 상태 확인"}</span>
                  </span>
                  <span className="client-consultation-row-meta">
                    <b>
                      {summary.receivableAmount === null
                        ? "남은 미수금 금액 미정"
                        : `남은 미수금 ${formatWon(summary.receivableAmount)}`}
                    </b>
                    <span>
                      {summary.agreedAmount === null
                        ? "약정 수임료 금액 미정"
                        : `약정 수임료 ${formatWon(summary.agreedAmount)}`}
                    </span>
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      ) : state !== "empty" ? (
        <div className="client-consultation-state live-data-state live-data-empty" role="status">
          <strong>조건에 맞는 수임료 약정이 없습니다.</strong>
        </div>
      ) : null}

      <MutationNotice mutation={mutation} onRefresh={onRefresh} />

      <SelectionDetail
        client={selectedClient}
        fee={selectedFee}
        deposit={selectedDeposit}
        allocations={allocations}
        commitments={commitments}
        writeBlocked={writeBlocked}
        pendingAction={pendingAction}
        onSelectClient={onSelectClient}
        onSelectFee={onSelectFeeCommitment}
        onSelectDeposit={onSelectDeposit}
        onCreate={onCreateFeeCommitment}
        onUpdate={onUpdateFeeCommitment}
        onCancel={onCancelFeeCommitment}
        onReallocate={onReallocateDeposit}
        returnFocusRef={clientSelectRef}
      />

      {!selectedClient ? (
        <div className="client-consultation-boundary-note" role="status">
          약정을 변경하거나 입금을 배분하려면 고객을 먼저 선택하세요.
        </div>
      ) : null}
    </section>
  );
}

export default ClientReceivablesPanel;
