import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import {
  autoClassifyClientDeposit,
  confirmClientDepositBankImport,
  fetchClientDepositDetail,
  fetchClientDeposits,
  getClientDepositRouteContext,
  previewClientDepositBankImport,
  reviewClientDepositClassification
} from "../data/apiClient.js";
import {
  buildClientDepositOperationsModel,
  clientDepositResultState
} from "./ClientDepositOperationsModel.js";

const MONEY = new Intl.NumberFormat("ko-KR", {
  style: "currency",
  currency: "KRW",
  maximumFractionDigits: 0
});

const EMPTY_ACTION_RESULTS = Object.freeze({
  auto: null,
  manualLink: null,
  manualUnlink: null,
  rememberAlias: null,
  refundLink: null
});
const ACTION_PENDING_TYPES = new Set(Object.keys(EMPTY_ACTION_RESULTS));
const IMPORT_PENDING_TYPES = new Set(["preview", "import"]);

function visibleDate(row) {
  return row.date || (row.occurredAt ? row.occurredAt.slice(0, 10) : "날짜 미확인");
}

function directionLabel(direction) {
  return direction === "outflow" ? "출금" : "입금";
}

function actionKeyPart(value) {
  return String(value ?? "").trim().replace(/[^A-Za-z0-9_-]+/gu, "-").slice(0, 28);
}

function stableCommandKey(cache, fingerprint, prefix) {
  const prior = cache.get(fingerprint);
  if (prior) return prior;
  const uuid = globalThis.crypto?.randomUUID?.().replaceAll("-", "")
    ?? `${Date.now()}${Math.random().toString(16).slice(2)}`;
  const key = `${prefix}:${actionKeyPart(fingerprint)}:${uuid}`.slice(0, 128);
  cache.set(fingerprint, key);
  if (cache.size > 80) cache.delete(cache.keys().next().value);
  return key;
}

function listState(result) {
  if (result === null) return "loading";
  return clientDepositResultState(result);
}

function StateNotice({ state, onRetry }) {
  const copy = {
    loading: ["불러오는 중입니다", "은행 입금 내역을 확인하고 있습니다."],
    empty: ["표시할 입금 내역이 없습니다", "기간이나 조건을 바꿔 다시 확인해 보세요."],
    denied: ["입금 내역을 볼 권한이 없습니다", "금액과 거래 건수는 표시하지 않습니다."],
    review_required: ["권한 확인이 필요합니다", "승인된 계정으로 다시 확인해 주세요."],
    partial: ["일부 입금만 불러왔습니다", "불러오지 못한 항목은 합계에 포함하지 않습니다."],
    blocked: ["입금 내역을 표시할 수 없습니다", "서명된 세션과 접근 범위를 확인해 주세요."],
    error: ["입금 내역을 불러오지 못했습니다", "연결 상태를 확인한 뒤 다시 시도하세요."]
  }[state] ?? ["입금 내역을 확인할 수 없습니다", "잠시 후 다시 시도하세요."];
  return (
    <div className={`client-deposit-state client-deposit-state--${state}`} role={state === "error" ? "alert" : "status"}>
      <strong>{copy[0]}</strong>
      <span>{copy[1]}</span>
      {onRetry && !["loading", "denied", "review_required"].includes(state) && (
        <button className="secondary-button" type="button" onClick={onRetry}>
          다시 불러오기
        </button>
      )}
    </div>
  );
}

function PreviewState({ model }) {
  if (model.preview.state === "loading") return null;
  if (["error", "blocked", "denied", "review_required", "conflict"].includes(model.preview.state)) {
    return <StateNotice state={model.preview.state} />;
  }
  if (!["data", "partial"].includes(model.preview.state)) return null;
  return (
    <div className="client-deposit-preview" data-client-deposit-preview={model.preview.state}>
      <div className="client-deposit-preview__counts" aria-label="가져오기 미리보기 건수">
        <span><strong>{model.preview.counts.total}</strong>전체</span>
        <span><strong>{model.preview.counts.new}</strong>새 거래</span>
        <span><strong>{model.preview.counts.duplicate}</strong>중복</span>
        <span><strong>{model.preview.counts.error}</strong>오류</span>
      </div>
      {model.preview.duplicateFile && (
        <p className="client-deposit-inline-note" role="status">
          새 거래가 없는 파일입니다. 기존 거래는 다시 만들지 않습니다.
        </p>
      )}
      <div className="client-deposit-preview__rows" role="list" aria-label="거래 미리보기">
        {model.preview.items.slice(0, 8).map((item) => (
          <div key={item.transactionId} role="listitem" className="client-deposit-preview__row">
            <span>{item.rowNumber ? `${item.rowNumber}행` : "행 미확인"}</span>
            <span>{item.date ?? "날짜 미확인"}</span>
            <span>{item.direction ? directionLabel(item.direction) : "방향 미확인"}</span>
            <strong>{item.amount === null ? "금액 미확인" : MONEY.format(item.amount)}</strong>
            <span>{item.statusLabel}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SafeDepositDetail({ result, selectedRow, detailRef, onClose }) {
  const item = result?.kind === "data"
    && result.item?.bank_transaction_id === selectedRow.transactionId
    && result.item?.bank_transaction_classification_id === selectedRow.classificationId
    ? result.item
    : null;
  return (
    <aside
      ref={detailRef}
      className="client-deposit-detail"
      tabIndex={-1}
      aria-label="선택한 거래 상세"
      data-client-deposit-detail={selectedRow.transactionId}
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose();
      }}
    >
      <div className="client-deposit-detail__header">
        <div>
          <span className="client-deposit-eyebrow">선택한 거래</span>
          <h3>{visibleDate(selectedRow)} · {MONEY.format(selectedRow.amount)}</h3>
        </div>
        <button className="icon-button" type="button" aria-label="거래 상세 닫기" onClick={onClose}>×</button>
      </div>
      {result === null && <StateNotice state="loading" />}
      {result && result.kind !== "data" && (
        <StateNotice state={listState(result)} />
      )}
      {item && (
        <dl className="client-deposit-detail__facts">
          <div><dt>거래 방향</dt><dd>{directionLabel(item.transaction_direction)}</dd></div>
          <div><dt>연결 상태</dt><dd>{selectedRow.linkLabel}</dd></div>
          <div><dt>분류</dt><dd>{selectedRow.categoryLabel}</dd></div>
          <div><dt>상태 버전</dt><dd>{item.state_version}</dd></div>
          <div><dt>원천 형식</dt><dd>{item.source_type?.toUpperCase() ?? "미확인"}</dd></div>
          <div>
            <dt>원천 위치</dt>
            <dd>{item.source_row_number ? `${item.source_row_number}행` : item.source_page_number ? `${item.source_page_number}쪽` : "미확인"}</dd>
          </div>
          <div className="client-deposit-detail__wide">
            <dt>거래 확인값</dt>
            <dd>{item.bank_reference_hash ? `${item.bank_reference_hash.slice(0, 12)}…` : "미확인"}</dd>
          </div>
        </dl>
      )}
      <p className="client-deposit-boundary-note">
        계좌번호, 거래 상대, 메모 원문은 이 화면에 표시하지 않습니다.
      </p>
    </aside>
  );
}

export function ClientDepositOperationsPanel({
  ctx = "allow",
  clients = [],
  initialClientId = "",
  onReturn = null
}) {
  const [filters, setFilters] = useState({
    from: "",
    to: "",
    direction: "",
    status: "",
    clientGroupId: initialClientId
  });
  const [search, setSearch] = useState("");
  const [listResult, setListResult] = useState(null);
  const [selectedTransactionId, setSelectedTransactionId] = useState("");
  const [detailResult, setDetailResult] = useState(null);
  const [sourceFile, setSourceFile] = useState(null);
  const [accountRef, setAccountRef] = useState("");
  const [previewResult, setPreviewResult] = useState(null);
  const [importRequest, setImportRequest] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [actionCommands, setActionCommands] = useState({});
  const [actionResults, setActionResults] = useState(EMPTY_ACTION_RESULTS);
  const [actionType, setActionType] = useState("manualLink");
  const [actionClientId, setActionClientId] = useState("");
  const [refundOriginId, setRefundOriginId] = useState("");
  const [actionReason, setActionReason] = useState("");
  const [matchField, setMatchField] = useState("counterparty");
  const [pending, setPending] = useState("");
  const [feedback, setFeedback] = useState(null);
  const listRequestRef = useRef(0);
  const detailRequestRef = useRef(0);
  const previewRequestRef = useRef(0);
  const confirmRequestRef = useRef(0);
  const importContextRef = useRef(0);
  const actionRequestRef = useRef(0);
  const activeActionRequestRef = useRef(null);
  const actionContextRef = useRef("");
  const mountedRef = useRef(false);
  const commandKeysRef = useRef(new Map());
  const rowButtonRefs = useRef(new Map());
  const detailRef = useRef(null);

  const invalidateImportContext = useCallback(() => {
    importContextRef.current += 1;
    previewRequestRef.current += 1;
    confirmRequestRef.current += 1;
    setPreviewResult(null);
    setImportRequest(null);
    setImportResult(null);
    setPending((current) => IMPORT_PENDING_TYPES.has(current) ? "" : current);
    setFeedback((current) => current?.scope === "import" ? null : current);
  }, []);

  const invalidateActionContext = useCallback(() => {
    actionRequestRef.current += 1;
    activeActionRequestRef.current = null;
    setActionCommands({});
    setActionResults(EMPTY_ACTION_RESULTS);
    setPending((current) => ACTION_PENDING_TYPES.has(current) ? "" : current);
    setFeedback((current) => current?.scope === "action" ? null : current);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      importContextRef.current += 1;
      previewRequestRef.current += 1;
      confirmRequestRef.current += 1;
      actionRequestRef.current += 1;
      activeActionRequestRef.current = null;
    };
  }, []);

  const authorizedClients = useMemo(() => clients
    .map((client) => ({
      id: clientDepositId(client),
      label: clientDepositClientLabel(client)
    }))
    .filter((client) => client.id && client.label), [clients]);
  const authorizedClientIds = useMemo(
    () => authorizedClients.map((client) => client.id),
    [authorizedClients]
  );

  const loadDeposits = useCallback(async ({ append = false, cursor = null } = {}) => {
    const requestId = ++listRequestRef.current;
    if (!append) setListResult(null);
    const result = await fetchClientDeposits({
      ctx,
      ...filters,
      clientGroupId: filters.clientGroupId,
      cursor
    });
    if (requestId !== listRequestRef.current) return;
    setListResult((current) => {
      if (!append || result.kind !== "data" || current?.kind !== "data") return result;
      const byId = new Map(current.items.map((item) => [item.bank_transaction_id, item]));
      result.items.forEach((item) => byId.set(item.bank_transaction_id, item));
      return {
        ...result,
        items: [...byId.values()]
      };
    });
  }, [ctx, filters]);

  useEffect(() => {
    loadDeposits();
    return () => {
      listRequestRef.current += 1;
    };
  }, [loadDeposits]);

  const model = useMemo(() => buildClientDepositOperationsModel({
    previewResult,
    importResult,
    importRequest,
    classificationsResult: listResult,
    requestedTransactionId: selectedTransactionId,
    actionCommands,
    actionResults,
    authorizedClientGroupIds: authorizedClientIds
  }), [
    actionCommands,
    actionResults,
    authorizedClientIds,
    importRequest,
    importResult,
    listResult,
    previewResult,
    selectedTransactionId
  ]);
  const selected = model.selectedRow;
  const actionContextFingerprint = JSON.stringify([
    selected?.transactionId ?? "",
    selected?.stateVersion ?? null,
    actionType,
    actionClientId,
    refundOriginId,
    matchField,
    actionReason
  ]);
  actionContextRef.current = actionContextFingerprint;

  useEffect(() => {
    if (activeActionRequestRef.current !== null) invalidateActionContext();
  }, [actionContextFingerprint, invalidateActionContext]);

  useEffect(() => {
    if (!selectedTransactionId || !model.selectedRow) {
      setDetailResult(null);
      return undefined;
    }
    const requestId = ++detailRequestRef.current;
    setDetailResult(null);
    fetchClientDepositDetail({
      transactionId: selectedTransactionId,
      expectedClassificationId: model.selectedRow.classificationId,
      ctx
    }).then((result) => {
      if (requestId === detailRequestRef.current) setDetailResult(result);
    });
    queueMicrotask(() => detailRef.current?.focus());
    return () => {
      detailRequestRef.current += 1;
    };
  }, [ctx, model.selectedRow, selectedTransactionId]);

  const visibleRows = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("ko-KR");
    if (!query) return model.rows;
    return model.rows.filter((row) => [
      row.transactionId,
      row.clientDisplayName,
      row.categoryLabel,
      row.linkLabel,
      visibleDate(row)
    ].some((value) => String(value ?? "").toLocaleLowerCase("ko-KR").includes(query)));
  }, [model.rows, search]);

  const refundOrigins = useMemo(() => model.rows.filter((row) => (
    row.direction === "inflow"
    && row.category === "client_receipt"
    && row.status === "confirmed"
    && row.clientGroupId
    && authorizedClientIds.includes(row.clientGroupId)
  )), [authorizedClientIds, model.rows]);

  const closeDetail = useCallback(() => {
    const prior = selectedTransactionId;
    invalidateActionContext();
    setSelectedTransactionId("");
    queueMicrotask(() => rowButtonRefs.current.get(prior)?.focus());
  }, [invalidateActionContext, selectedTransactionId]);

  async function handlePreview() {
    if (!sourceFile || !accountRef.trim()) {
      setFeedback({
        scope: "import",
        kind: "error",
        text: "계좌 식별값과 XLSX 또는 PDF 파일을 선택해 주세요."
      });
      return;
    }
    const requestId = ++previewRequestRef.current;
    const contextId = importContextRef.current;
    confirmRequestRef.current += 1;
    setPending("preview");
    setFeedback((current) => current?.scope === "import" ? null : current);
    setPreviewResult(null);
    setImportRequest(null);
    setImportResult(null);
    const result = await previewClientDepositBankImport({
      file: sourceFile,
      accountRef: accountRef.trim(),
      ctx
    });
    if (
      !mountedRef.current
      || requestId !== previewRequestRef.current
      || contextId !== importContextRef.current
    ) return;
    setPreviewResult(result);
    if (result.kind === "data") {
      const route = getClientDepositRouteContext({ ctx });
      const preview = result.preview;
      const fingerprint = `${preview.preview_id}:${preview.preview_manifest_sha256}`;
      const idempotencyKey = stableCommandKey(
        commandKeysRef.current,
        fingerprint,
        "client-deposit-import"
      );
      setImportRequest({
        tenant_id: route.tenant_id,
        permission_ref: route.permission_ref,
        audit_hint_ref: route.audit_hint_ref,
        accountRef: preview.account_ref,
        sourceFileSha256: preview.source_file_sha256,
        previewManifestSha256: preview.preview_manifest_sha256,
        file: result.preparedFile,
        idempotencyKey
      });
    }
    setPending((current) => current === "preview" ? "" : current);
  }

  async function handleConfirmImport() {
    const current = buildClientDepositOperationsModel({
      previewResult,
      importRequest,
      classificationsResult: listResult,
      authorizedClientGroupIds: authorizedClientIds
    });
    if (!current.canConfirmImport || !current.import.command) {
      setFeedback({
        scope: "import",
        kind: "error",
        text: "미리보기를 다시 확인한 뒤 가져와 주세요."
      });
      return;
    }
    const requestId = ++confirmRequestRef.current;
    const contextId = importContextRef.current;
    setPending("import");
    setFeedback((value) => value?.scope === "import" ? null : value);
    const result = await confirmClientDepositBankImport({
      command: current.import.command,
      expectedPreview: {
        previewId: current.preview.previewId,
        counts: current.preview.counts
      },
      ctx
    });
    if (
      !mountedRef.current
      || requestId !== confirmRequestRef.current
      || contextId !== importContextRef.current
    ) return;
    const verified = buildClientDepositOperationsModel({
      previewResult,
      importRequest,
      importResult: result,
      classificationsResult: listResult,
      authorizedClientGroupIds: authorizedClientIds
    });
    setImportResult(result);
    if (["confirmed", "replayed"].includes(verified.import.phase)) {
      setFeedback({
        scope: "import",
        kind: "success",
        text: verified.import.phase === "replayed"
          ? "이미 처리된 파일입니다. 현재 입금 내역을 다시 불러왔습니다."
          : `${verified.import.transactionCount}건을 가져왔습니다.`
      });
      await loadDeposits();
    } else {
      setFeedback({
        scope: "import",
        kind: result.kind === "conflict" ? "conflict" : "error",
        text: result.kind === "conflict"
          ? "파일 또는 요청이 바뀌었습니다. 미리보기를 다시 확인해 주세요."
          : "가져오기를 완료하지 못했습니다."
      });
    }
    setPending((currentPending) => currentPending === "import" ? "" : currentPending);
  }

  async function runAction(type) {
    const route = getClientDepositRouteContext({ ctx });
    if (!selected || !route) return;
    const requestId = ++actionRequestRef.current;
    const contextFingerprint = actionContextFingerprint;
    activeActionRequestRef.current = requestId;
    const fingerprint = [
      type,
      selected.transactionId,
      selected.stateVersion,
      actionClientId,
      refundOriginId,
      matchField,
      actionReason
    ].join(":");
    const request = {
      tenant_id: route.tenant_id,
      permission_ref: route.permission_ref,
      audit_hint_ref: route.audit_hint_ref,
      transactionId: selected.transactionId,
      expectedVersion: selected.stateVersion,
      clientGroupId: actionClientId,
      refundOfTransactionId: refundOriginId,
      matchField,
      reason: actionReason,
      idempotencyKey: stableCommandKey(
        commandKeysRef.current,
        fingerprint,
        `client-deposit-${type}`
      )
    };
    const nextCommands = { ...actionCommands, [type]: request };
    const prepared = buildClientDepositOperationsModel({
      previewResult,
      importResult,
      importRequest,
      classificationsResult: listResult,
      requestedTransactionId: selected.transactionId,
      actionCommands: nextCommands,
      actionResults,
      authorizedClientGroupIds: authorizedClientIds
    });
    const action = prepared.actions[type];
    if (!action.command || !action.binding) {
      activeActionRequestRef.current = null;
      setFeedback({
        scope: "action",
        kind: "error",
        text: "선택한 거래와 변경 내용을 다시 확인해 주세요."
      });
      return;
    }
    setActionCommands(nextCommands);
    setPending(type);
    setFeedback((current) => current?.scope === "action" ? null : current);
    const result = type === "auto"
      ? await autoClassifyClientDeposit({
        command: action.command,
        binding: action.binding,
        ctx
      })
      : await reviewClientDepositClassification({
        command: action.command,
        binding: action.binding,
        ctx
      });
    if (
      !mountedRef.current
      || requestId !== actionRequestRef.current
      || activeActionRequestRef.current !== requestId
      || contextFingerprint !== actionContextRef.current
    ) return;
    activeActionRequestRef.current = null;
    const nextResults = { ...actionResults, [type]: result };
    const verified = buildClientDepositOperationsModel({
      previewResult,
      importResult,
      importRequest,
      classificationsResult: listResult,
      requestedTransactionId: selected.transactionId,
      actionCommands: nextCommands,
      actionResults: nextResults,
      authorizedClientGroupIds: authorizedClientIds
    });
    setActionResults(nextResults);
    if (verified.actions[type].state === "data") {
      setActionCommands({});
      setActionResults(EMPTY_ACTION_RESULTS);
      setFeedback({
        scope: "action",
        kind: "success",
        text: result.idempotent_replay
          ? "이미 반영된 변경입니다. 최신 내역을 불러왔습니다."
          : "입금 분류를 반영했습니다."
      });
      setActionReason("");
      await loadDeposits();
    } else {
      setFeedback({
        scope: "action",
        kind: result.kind === "conflict" ? "conflict" : "error",
        text: result.kind === "conflict"
          ? "다른 변경과 겹쳤습니다. 최신 내역을 불러온 뒤 다시 시도해 주세요."
          : "선택한 거래에 변경 결과를 안전하게 결속하지 못했습니다."
      });
    }
    setPending((current) => current === type ? "" : current);
  }

  const currentListState = listState(listResult);
  const hasRows = ["data", "partial"].includes(currentListState);

  return (
    <div className="client-deposit-operations" data-client-deposit-operations="true">
      <header className="client-deposit-heading">
        <div>
          <span className="client-deposit-eyebrow">은행 거래 기준</span>
          <h2>입금 매출 내역</h2>
          <p>입금이 확인된 시점의 수납을 보고, 고객 연결이 필요한 거래를 바로 정리합니다.</p>
        </div>
        <div className="client-deposit-heading__actions">
          <span className="client-deposit-basis">수납 기준</span>
          {initialClientId && onReturn && (
            <button className="secondary-button" type="button" onClick={onReturn}>
              고객 정보로 돌아가기
            </button>
          )}
        </div>
      </header>

      <details className="client-deposit-import">
        <summary>은행 거래 가져오기</summary>
        <div className="client-deposit-import__body">
          <p>파일은 먼저 미리보기만 만듭니다. 새 거래 건수를 확인한 뒤에만 반영됩니다.</p>
          <div className="client-deposit-import__controls">
            <label>
              계좌 식별값
              <input
                value={accountRef}
                onChange={(event) => {
                  invalidateImportContext();
                  setAccountRef(event.target.value);
                }}
                placeholder="예: 운영계좌"
                autoComplete="off"
              />
            </label>
            <label>
              XLSX 또는 PDF
              <input
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,.pdf,application/pdf"
                onChange={(event) => {
                  invalidateImportContext();
                  setSourceFile(event.target.files?.[0] ?? null);
                }}
              />
            </label>
            <button
              className="secondary-button"
              type="button"
              disabled={pending !== ""}
              onClick={handlePreview}
            >
              {pending === "preview" ? "미리보는 중…" : "미리보기"}
            </button>
          </div>
          <PreviewState model={model} />
          {["preview", "duplicate", "confirmed", "replayed", "conflict", "error"].includes(model.import.phase) && (
            <div className="client-deposit-import__confirm">
              <span role="status">{model.import.label}</span>
              {model.canConfirmImport && (
                <button
                  className="primary-button"
                  type="button"
                  disabled={pending !== ""}
                  onClick={handleConfirmImport}
                >
                  {pending === "import" ? "가져오는 중…" : `${model.preview.counts.new}건 가져오기`}
                </button>
              )}
            </div>
          )}
        </div>
      </details>

      {feedback && (
        <div className={`client-deposit-feedback client-deposit-feedback--${feedback.kind}`} role={feedback.kind === "error" ? "alert" : "status"}>
          <span>{feedback.text}</span>
          {feedback.kind === "conflict" && (
            <button className="secondary-button" type="button" onClick={() => loadDeposits()}>
              최신 내역 불러오기
            </button>
          )}
        </div>
      )}

      <div className="client-deposit-filters" role="search" aria-label="입금 내역 찾기">
        <label>
          검색
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="고객, 분류, 거래번호"
          />
        </label>
        <label>
          시작일
          <input type="date" value={filters.from} onChange={(event) => setFilters((value) => ({ ...value, from: event.target.value }))} />
        </label>
        <label>
          종료일
          <input type="date" value={filters.to} onChange={(event) => setFilters((value) => ({ ...value, to: event.target.value }))} />
        </label>
        <label>
          방향
          <select value={filters.direction} onChange={(event) => setFilters((value) => ({ ...value, direction: event.target.value }))}>
            <option value="">전체</option>
            <option value="inflow">입금</option>
            <option value="outflow">출금·환불</option>
          </select>
        </label>
        <label>
          상태
          <select value={filters.status} onChange={(event) => setFilters((value) => ({ ...value, status: event.target.value }))}>
            <option value="">전체</option>
            <option value="confirmed">반영됨</option>
            <option value="review_required">확인 필요</option>
          </select>
        </label>
        <label>
          고객
          <select value={filters.clientGroupId} onChange={(event) => setFilters((value) => ({ ...value, clientGroupId: event.target.value }))}>
            <option value="">전체</option>
            {authorizedClients.map((client) => <option key={client.id} value={client.id}>{client.label}</option>)}
          </select>
        </label>
      </div>

      {!hasRows && <StateNotice state={currentListState} onRetry={() => loadDeposits()} />}
      {hasRows && currentListState === "partial" && <StateNotice state="partial" onRetry={() => loadDeposits()} />}
      {hasRows && (currentListState !== "partial" || model.rows.length > 0) && (
        <div className={`client-deposit-workspace${selected ? " has-selection" : ""}`}>
          <div>
            <div className="client-deposit-list-meta">
              <span>현재 화면 {visibleRows.length}건</span>
              <span>거래를 선택하면 확인 가능한 거래 정보와 연결 작업이 열립니다.</span>
            </div>
            {visibleRows.length === 0 ? (
              <StateNotice state="empty" />
            ) : (
              <div className="client-deposit-table" role="group" aria-label="입금 매출 내역">
                <div className="client-deposit-table__head" aria-hidden="true">
                  <span>일자</span>
                  <span>구분</span>
                  <span>금액</span>
                  <span>고객 연결</span>
                  <span>상태</span>
                </div>
                {visibleRows.map((row) => (
                  <button
                    key={row.transactionId}
                    ref={(node) => {
                      if (node) rowButtonRefs.current.set(row.transactionId, node);
                      else rowButtonRefs.current.delete(row.transactionId);
                    }}
                    className={`client-deposit-table__row${selectedTransactionId === row.transactionId ? " is-selected" : ""}`}
                    type="button"
                    data-client-deposit-transaction={row.transactionId}
                    aria-expanded={selectedTransactionId === row.transactionId}
                    aria-label={`${visibleDate(row)} ${directionLabel(row.direction)} ${row.categoryLabel} ${MONEY.format(row.amount)} ${row.clientDisplayName ?? row.linkLabel} ${row.statusLabel}`}
                    onClick={() => {
                      if (selectedTransactionId !== row.transactionId) {
                        invalidateActionContext();
                        setSelectedTransactionId(row.transactionId);
                      }
                    }}
                  >
                    <span data-label="일자">{visibleDate(row)}</span>
                    <span data-label="구분">{directionLabel(row.direction)} · {row.categoryLabel}</span>
                    <strong data-label="금액">{MONEY.format(row.amount)}</strong>
                    <span data-label="고객 연결">{row.clientDisplayName ?? row.linkLabel}</span>
                    <span data-label="상태"><em className={`client-deposit-status client-deposit-status--${row.status}`}>{row.statusLabel}</em></span>
                  </button>
                ))}
              </div>
            )}
            {listResult?.pageInfo?.hasMore && (
              <button
                className="secondary-button client-deposit-load-more"
                type="button"
                disabled={pending !== ""}
                onClick={() => loadDeposits({
                  append: true,
                  cursor: listResult.pageInfo.nextCursor
                })}
              >
                다음 입금 내역
              </button>
            )}
          </div>

          {selected && (
            <div className="client-deposit-side">
              <SafeDepositDetail
                result={detailResult}
                selectedRow={selected}
                detailRef={detailRef}
                onClose={closeDetail}
              />
              <section className="client-deposit-actions" aria-label="입금 분류 작업">
                <div className="client-deposit-actions__header">
                  <div>
                    <span className="client-deposit-eyebrow">거래별 작업</span>
                    <h3>{selected.direction === "outflow" ? "환불 원거래 연결" : "고객 연결"}</h3>
                  </div>
                  <button
                    className="secondary-button"
                    type="button"
                    disabled={pending !== ""}
                    onClick={() => runAction("auto")}
                  >
                    자동 분류
                  </button>
                </div>
                {selected.direction === "inflow" ? (
                  <>
                    <label>
                      작업
                      <select
                        name="client-deposit-action-type"
                        value={actionType}
                        onChange={(event) => {
                          invalidateActionContext();
                          setActionType(event.target.value);
                        }}
                      >
                        <option value="manualLink">고객 연결</option>
                        <option value="rememberAlias">연결하고 입금자명 기억</option>
                        <option value="manualUnlink">고객 연결 해제</option>
                      </select>
                    </label>
                    {actionType !== "manualUnlink" && (
                      <label>
                        고객
                        <select
                          name="client-deposit-action-client"
                          value={actionClientId}
                          onChange={(event) => {
                            invalidateActionContext();
                            setActionClientId(event.target.value);
                          }}
                        >
                          <option value="">고객 선택</option>
                          {authorizedClients.map((client) => <option key={client.id} value={client.id}>{client.label}</option>)}
                        </select>
                      </label>
                    )}
                    {actionType === "rememberAlias" && (
                      <label>
                        기억할 기준
                        <select
                          name="client-deposit-action-match-field"
                          value={matchField}
                          onChange={(event) => {
                            invalidateActionContext();
                            setMatchField(event.target.value);
                          }}
                        >
                          <option value="counterparty">입금자명</option>
                          <option value="memo">거래 메모</option>
                        </select>
                      </label>
                    )}
                  </>
                ) : (
                  <label>
                    원래 입금
                    <select
                      name="client-deposit-refund-origin"
                      value={refundOriginId}
                      onChange={(event) => {
                        invalidateActionContext();
                        setRefundOriginId(event.target.value);
                      }}
                    >
                      <option value="">입금 거래 선택</option>
                      {refundOrigins.map((row) => (
                        <option key={row.transactionId} value={row.transactionId}>
                          {visibleDate(row)} · {row.clientDisplayName ?? "고객"} · {MONEY.format(row.amount)}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <label>
                  확인 사유
                  <input
                    name="client-deposit-action-reason"
                    value={actionReason}
                    onChange={(event) => {
                      invalidateActionContext();
                      setActionReason(event.target.value);
                    }}
                    placeholder="확인한 내용을 짧게 남겨 주세요"
                  />
                </label>
                <button
                  className="primary-button"
                  type="button"
                  disabled={
                    pending !== ""
                    || !actionReason.trim()
                    || (selected.direction === "inflow"
                      ? actionType !== "manualUnlink" && !actionClientId
                      : !refundOriginId)
                  }
                  onClick={() => runAction(selected.direction === "outflow" ? "refundLink" : actionType)}
                >
                  {pending && pending !== "preview" && pending !== "import" ? "반영하는 중…" : "변경 반영"}
                </button>
              </section>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function clientDepositId(client) {
  return String(
    client?.client_group_id
    ?? client?.clientGroupId
    ?? client?.resource_id
    ?? client?.id
    ?? ""
  ).trim();
}

function clientDepositClientLabel(client) {
  return String(
    client?.display_name
    ?? client?.client_display_name
    ?? client?.canonical_display_name
    ?? client?.name
    ?? ""
  ).trim();
}
