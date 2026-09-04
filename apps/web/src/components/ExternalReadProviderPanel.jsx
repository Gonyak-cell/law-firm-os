import React, { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Database, KeyRound, RefreshCw, ShieldCheck } from "lucide-react";
import {
  connectExternalReadProvider,
  disableExternalReadConnection,
  fetchExternalReadFirstSync,
  fetchExternalReadLegalEntities,
  fetchExternalReadLatestSync,
  fetchExternalReadProviders,
  reconnectExternalReadConnection,
  repairExternalReadConnection,
  revokeExternalReadConnection,
  rotateExternalReadConnection,
  syncExternalReadConnection
} from "../data/apiClient.js";
import { Panel } from "./primitives.jsx";

const ERROR_COPY = Object.freeze({
  EXTERNAL_READ_AUTHENTICATION_REQUIRED: "다시 로그인한 뒤 연결해 주세요.",
  EXTERNAL_READ_PERMISSION_DENIED: "외부 데이터 연결 권한이 없습니다.",
  EXTERNAL_READ_PROVIDER_UNAVAILABLE: "현재 승인된 공급자가 없습니다.",
  EXTERNAL_READ_PROVIDER_VALIDATION_FAILED: "API 키 또는 공급자 응답을 확인해 주세요.",
  EXTERNAL_READ_ONBOARDING_IN_PROGRESS: "같은 연결을 확인하고 있습니다. 잠시 후 다시 시도해 주세요.",
  EXTERNAL_READ_ONBOARDING_REPAIR_REQUIRED: "비밀정보 정리가 필요합니다. 관리자 점검 전에는 다시 연결하지 마세요.",
  EXTERNAL_READ_OPERATION_REPAIR_REQUIRED: "중간 비밀정보 정리가 필요합니다. 복구를 완료하기 전에는 연결을 사용하지 않습니다.",
  EXTERNAL_READ_ROTATION_VALIDATION_FAILED: "새 API 키를 검증하지 못했습니다. 기존 키와 마지막 정상 데이터는 유지됩니다.",
  EXTERNAL_READ_SYNC_FAILED: "새 데이터를 읽지 못했습니다. 마지막 정상 데이터는 유지됩니다.",
  EXTERNAL_READ_RECONNECT_FAILED: "연결을 다시 검증하지 못했습니다. 중지 상태를 유지합니다."
});

function newIdempotencyKey() {
  try {
    return `external-read-ui:${globalThis.crypto.randomUUID()}`;
  } catch {
    return `external-read-ui:${Date.now()}:${Math.random().toString(36).slice(2)}`;
  }
}

function failureMessage(result) {
  const code = result?.safeErrorCodes?.[0];
  if (code && ERROR_COPY[code]) return ERROR_COPY[code];
  if (result?.kind === "denied") return "로그인 또는 관리자 권한을 확인해 주세요.";
  return "연결을 완료하지 못했습니다. 입력값과 네트워크 상태를 확인한 뒤 다시 시도해 주세요.";
}

function ProviderAvailability({ state, message }) {
  const busy = state === "loading" || state === "submitting";
  return (
    <div
      className={`external-read-status external-read-status-${state}`}
      role="status"
      aria-live="polite"
      data-external-read-status={state}
    >
      {state === "ready" ? <CheckCircle2 size={17} /> : busy ? <RefreshCw size={17} aria-hidden="true" /> : <ShieldCheck size={17} />}
      <span>{message}</span>
    </div>
  );
}

function Receipt({ label, value }) {
  if (!value) return null;
  return (
    <div className="external-read-receipt-row">
      <span>{label}</span>
      <code>{value}</code>
    </div>
  );
}

export function ExternalReadProviderPanel() {
  const [catalog, setCatalog] = useState({ state: "loading", providers: [], legalEntities: [], message: "승인된 공급자와 법인 범위를 확인하고 있습니다." });
  const [providerId, setProviderId] = useState("");
  const [legalEntityId, setLegalEntityId] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState(newIdempotencyKey);
  const [result, setResult] = useState(null);
  const [submitState, setSubmitState] = useState("idle");
  const [lifecycleBusy, setLifecycleBusy] = useState("");
  const [rotationKey, setRotationKey] = useState("");
  const [revokeConfirmed, setRevokeConfirmed] = useState(false);
  const selectedProvider = useMemo(
    () => catalog.providers.find((provider) => provider.provider_id === providerId) ?? null,
    [catalog.providers, providerId]
  );

  useEffect(() => {
    let active = true;
    Promise.all([
      fetchExternalReadProviders(),
      fetchExternalReadLegalEntities()
    ]).then(([response, legalEntities]) => {
      if (!active) return;
      if (response.kind !== "data") {
        setCatalog({ state: "error", providers: [], legalEntities: [], message: failureMessage(response) });
        return;
      }
      if (response.providerCount === 0 || response.onboardingAvailable !== true) {
        setCatalog({
          state: "empty",
          providers: [],
          legalEntities: [],
          message: "현재 승인·등록된 공급자가 없습니다. 공급자 팩이 배포되기 전에는 API 키를 받지 않습니다."
        });
        return;
      }
      if (legalEntities.kind !== "data") {
        setCatalog({ state: "error", providers: [], legalEntities: [], message: "승인된 법인 범위를 확인하지 못했습니다." });
        return;
      }
      if (legalEntities.legalEntityCount === 0) {
        setCatalog({ state: "empty", providers: response.providers, legalEntities: [], message: "현재 테넌트에 승인된 법인 범위가 없습니다." });
        return;
      }
      setCatalog({
        state: "available",
        providers: response.providers,
        legalEntities: legalEntities.legalEntities,
        message: `${response.providerCount}개 공급자를 연결할 수 있습니다.`
      });
      setProviderId((current) => current || response.providers[0]?.provider_id || "");
      setLegalEntityId((current) => current || legalEntities.legalEntities[0] || "");
    });
    return () => { active = false; };
  }, []);

  async function submit(event) {
    event.preventDefault();
    if (submitState === "submitting") return;
    setResult(null);
    setSubmitState("submitting");
    const response = await connectExternalReadProvider({
      legalEntityId,
      providerId,
      apiKey,
      idempotencyKey
    });
    setApiKey("");
    if (response.kind !== "data") {
      setResult({ state: "error", message: failureMessage(response), connection: response.connection ?? null });
      setSubmitState("error");
      return;
    }
    const readback = await fetchExternalReadFirstSync({
      connectionId: response.connection.connection_id,
      legalEntityId
    });
    if (readback.kind !== "data") {
      setResult({
        state: "error",
        message: "연결은 저장됐지만 최초 동기화 확인 영수증을 읽지 못했습니다.",
        connection: response.connection
      });
      setSubmitState("error");
      return;
    }
    setResult({
      state: "ready",
      message: `${readback.snapshot.item_count}건을 읽기 전용으로 확인했습니다.`,
      connection: response.connection,
      snapshot: readback.snapshot
    });
    setSubmitState("ready");
    setIdempotencyKey(newIdempotencyKey());
  }

  async function runLifecycle(action) {
    const connection = result?.connection;
    if (!connection || lifecycleBusy) return;
    setLifecycleBusy(action);
    const input = {
      connectionId: connection.connection_id,
      legalEntityId: connection.legal_entity_id ?? legalEntityId,
      idempotencyKey: newIdempotencyKey()
    };
    const request = action === "sync"
      ? syncExternalReadConnection(input)
      : action === "disable"
        ? disableExternalReadConnection({ ...input, reasonCode: "ADMIN_DISABLED" })
        : action === "reconnect"
          ? reconnectExternalReadConnection(input)
          : action === "rotate"
            ? rotateExternalReadConnection({ ...input, apiKey: rotationKey })
            : action === "revoke"
              ? revokeExternalReadConnection({ ...input, reasonCode: "ADMIN_REVOKED" })
              : repairExternalReadConnection(input);
    const response = await request;
    setRotationKey("");
    setRevokeConfirmed(false);
    if (response.kind !== "data") {
      const failedConnection = response.connection ?? connection;
      setResult((current) => ({
        ...current,
        state: failedConnection.state === "repair_required" ? "repair_required" : "error",
        message: failureMessage(response),
        connection: failedConnection
      }));
      setLifecycleBusy("");
      return;
    }
    let snapshot = result.snapshot ?? null;
    if (["sync", "reconnect", "rotate"].includes(action)) {
      const latest = await fetchExternalReadLatestSync({
        connectionId: response.connection.connection_id,
        legalEntityId: response.connection.legal_entity_id ?? legalEntityId
      });
      if (latest.kind === "data") snapshot = latest.snapshot;
    }
    const state = response.connection.state;
    const messages = {
      sync: `${response.operation?.result?.item_count ?? snapshot?.item_count ?? 0}건의 최신 데이터를 확인했습니다.`,
      disable: "연결을 중지했습니다. 저장된 키는 재연결을 위해 서버에 유지됩니다.",
      reconnect: "저장된 키를 다시 검증하고 연결을 재개했습니다.",
      rotate: "새 API 키 검증과 교체를 완료하고 이전 키를 폐기했습니다.",
      revoke: "연결과 저장된 API 키를 폐기했습니다.",
      repair: `비밀정보 정리를 완료했습니다. 현재 상태: ${state}`
    };
    setResult({
      state,
      message: messages[action],
      connection: response.connection,
      operation: response.operation,
      snapshot
    });
    setLifecycleBusy("");
  }

  const unavailable = catalog.state !== "available";
  const submitting = submitState === "submitting";

  return (
    <Panel
      id="external-read-provider-settings"
      title="외부 데이터 연결"
      meta="읽기 전용"
      className="external-read-provider-panel"
      data-external-read-provider-panel="true"
    >
      <div className="external-read-intro">
        <Database size={20} />
        <div>
          <strong>승인된 공급자만 법인별로 연결합니다.</strong>
          <p>키는 서버에서 검증한 뒤 AWS Secrets Manager에 저장하며, 이 화면에는 다시 표시하지 않습니다.</p>
        </div>
      </div>

      <ProviderAvailability state={catalog.state} message={catalog.message} />

      <form className="external-read-form" onSubmit={submit} autoComplete="off">
        <label className="field">
          <span>공급자</span>
          <select
            value={providerId}
            onChange={(event) => { setProviderId(event.target.value); setIdempotencyKey(newIdempotencyKey()); }}
            disabled={unavailable || submitting}
            required
          >
            {catalog.providers.map((provider) => (
              <option key={provider.provider_id} value={provider.provider_id}>{provider.display_name}</option>
            ))}
          </select>
          {selectedProvider && (
            <small>{selectedProvider.capabilities.length}개 읽기 기능 · 어댑터 {selectedProvider.adapter_version}</small>
          )}
        </label>

        <label className="field">
          <span>법인 식별자</span>
          <select
            value={legalEntityId}
            onChange={(event) => { setLegalEntityId(event.target.value); setIdempotencyKey(newIdempotencyKey()); }}
            disabled={unavailable || submitting}
            required
          >
            {catalog.legalEntities.map((legalEntity) => (
              <option key={legalEntity} value={legalEntity}>{legalEntity}</option>
            ))}
          </select>
          <small>현재 테넌트의 서버 원장에 등록된 법인만 선택할 수 있습니다.</small>
        </label>

        <label className="field external-read-key-field">
          <span>API 키</span>
          <span className="external-read-key-control">
            <KeyRound size={16} aria-hidden="true" />
            <input
              type="password"
              value={apiKey}
              onChange={(event) => { setApiKey(event.target.value); setIdempotencyKey(newIdempotencyKey()); }}
              maxLength={8192}
              autoComplete="new-password"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck="false"
              disabled={unavailable || submitting}
              required
            />
          </span>
          <small>브라우저에 저장하지 않으며 제출 뒤 즉시 입력값을 지웁니다.</small>
        </label>

        <div className="external-read-submit-row">
          <p>저장 전에 실제 공급자 읽기 요청과 최초 동기화를 완료합니다.</p>
          <button className="primary-button" type="submit" disabled={unavailable || submitting || !providerId || !legalEntityId || !apiKey}>
            {submitting ? "연결 확인 중" : "연결 확인 및 저장"}
          </button>
        </div>
      </form>

      {result && (
        <div className="external-read-result" data-external-read-result={result.state}>
          <ProviderAvailability state={result.state} message={result.message} />
          {result.connection && (
            <div className="external-read-receipts" aria-label="연결 영수증">
              <Receipt label="연결" value={result.connection.connection_id} />
              <Receipt label="공급자 확인" value={result.connection.first_sync?.provider_receipt_ref} />
              <Receipt label="최초 동기화" value={result.snapshot?.sync_receipt_ref ?? result.connection.first_sync?.sync_receipt_ref} />
              <Receipt label="감사" value={result.connection.audit_receipt_ref} />
              <Receipt label="최근 작업" value={result.operation?.operation_id ?? result.connection.last_operation?.operation_id} />
            </div>
          )}
          {result.connection && result.connection.state !== "revoked" && (
            <div className="external-read-lifecycle" aria-label="연결 관리">
              <div className="external-read-lifecycle-actions">
                {result.connection.state === "ready" && (
                  <>
                    <button className="secondary-button" type="button" disabled={Boolean(lifecycleBusy)} onClick={() => void runLifecycle("sync")}>최신 데이터 다시 읽기</button>
                    <button className="secondary-button" type="button" disabled={Boolean(lifecycleBusy)} onClick={() => void runLifecycle("disable")}>연결 중지</button>
                  </>
                )}
                {result.connection.state === "disabled" && (
                  <button className="secondary-button" type="button" disabled={Boolean(lifecycleBusy)} onClick={() => void runLifecycle("reconnect")}>연결 재개</button>
                )}
                {result.connection.state === "repair_required" && (
                  <button className="secondary-button" type="button" disabled={Boolean(lifecycleBusy)} onClick={() => void runLifecycle("repair")}>비밀정보 정리 복구</button>
                )}
              </div>

              {result.connection.state === "ready" && (
                <form
                  className="external-read-lifecycle-block"
                  onSubmit={(event) => { event.preventDefault(); void runLifecycle("rotate"); }}
                >
                  <label className="field external-read-key-field">
                    <span>새 API 키</span>
                    <span className="external-read-key-control">
                      <KeyRound size={16} aria-hidden="true" />
                      <input
                        type="password"
                        value={rotationKey}
                        onChange={(event) => setRotationKey(event.target.value)}
                        maxLength={8192}
                        autoComplete="new-password"
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck="false"
                        disabled={Boolean(lifecycleBusy)}
                      />
                    </span>
                  </label>
                  <button className="secondary-button" type="submit" disabled={Boolean(lifecycleBusy) || !rotationKey}>검증 후 키 교체</button>
                </form>
              )}

              {["ready", "disabled"].includes(result.connection.state) && (
                <div className="external-read-lifecycle-block external-read-revoke-block">
                  <label>
                    <input type="checkbox" checked={revokeConfirmed} onChange={(event) => setRevokeConfirmed(event.target.checked)} disabled={Boolean(lifecycleBusy)} />
                    <span>이 연결의 저장된 키를 폐기하며 자동 복구되지 않음을 확인합니다.</span>
                  </label>
                  <button className="secondary-button danger" type="button" disabled={Boolean(lifecycleBusy) || !revokeConfirmed} onClick={() => void runLifecycle("revoke")}>연결과 키 폐기</button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </Panel>
  );
}
