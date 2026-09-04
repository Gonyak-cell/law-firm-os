import React, { useEffect, useState } from "react";
import { CheckCircle2, Download, RefreshCw, RotateCcw, ShieldAlert, ShieldCheck } from "lucide-react";
import { Panel } from "./primitives.jsx";

const SAFE_ERROR_COPY = Object.freeze({
  INTERNAL_UPDATE_SESSION_REQUIRED: "다시 로그인한 뒤 업데이트를 확인해 주세요.",
  INTERNAL_UPDATE_BASELINE_MISMATCH: "현재 설치본과 배포 저장소의 서명 기준이 달라 설치를 진행하지 않습니다.",
  INTERNAL_UPDATE_BASELINE_PROOF_INVALID: "현재 설치본의 서명된 기준 자료를 확인할 수 없어 설치를 진행하지 않습니다.",
  INTERNAL_UPDATE_BASELINE_LINEAGE_INVALID: "현재 설치본과 새 릴리스의 버전 계보가 이어지지 않아 설치를 진행하지 않습니다.",
  INTERNAL_UPDATE_BASELINE_AUTHORIZATION_MISMATCH: "현재 설치본의 배포 권한 범위가 일치하지 않아 설치를 진행하지 않습니다.",
  INTERNAL_UPDATE_BASELINE_REVOKED: "현재 설치본의 내부 배포 승인이 폐기되어 관리자 점검이 필요합니다.",
  INTERNAL_UPDATE_BASELINE_CANDIDATE_DENIED: "새 릴리스가 현재 설치본의 검증 기준을 통과하지 못했습니다.",
  INTERNAL_UPDATE_RESTART_OR_DISCARD_REQUIRED: "먼저 열어 둔 설치를 끝내고 앱을 다시 시작하거나, 취소한 설치 대기 상태를 지워 주세요.",
  INTERNAL_UPDATE_USER_ACTIVATION_REQUIRED: "버튼을 직접 눌러 다시 진행해 주세요.",
  INTERNAL_UPDATE_OPERATOR_CONFIRMATION_REQUIRED: "Windows 게시자 경고를 확인한 뒤 설치 파일을 열어 주세요.",
  INTERNAL_UPDATE_ROLLBACK_HISTORY_FULL: "사용한 복구 권한 기록이 가득 차 새 롤백을 준비하지 않습니다. 관리자 점검이 필요합니다.",
  INTERNAL_UPDATE_UNTRUSTED_RENDERER: "신뢰할 수 없는 화면에서는 업데이트를 사용할 수 없습니다."
});

const STATUS_COPY = Object.freeze({
  loading: "설치본 상태를 확인하고 있습니다.",
  initializing: "내부 업데이트 상태를 준비하고 있습니다.",
  disabled: "이 설치본에서는 사내 업데이트를 사용할 수 없습니다.",
  baseline_required: "현재 설치본을 서명된 내부 기준 릴리스와 대조해야 합니다.",
  baseline_established: "현재 설치본을 서명된 내부 기준 릴리스로 확인했습니다.",
  ready: "현재 설치본을 확인했습니다.",
  checking: "서명된 릴리스와 폐기 목록을 확인하고 있습니다.",
  signed_out: "업데이트 확인에는 로그인이 필요합니다.",
  baseline_blocked: "현재 설치본과 배포 저장소의 기준이 달라 설치를 중단했습니다.",
  up_to_date: "현재 설치본이 최신 내부 릴리스입니다.",
  update_available: "검증을 통과한 새 내부 릴리스를 받을 수 있습니다.",
  downloading: "설치 파일을 전용 임시 저장소로 받고 무결성을 확인하고 있습니다.",
  staged: "업데이트 설치 파일의 서명과 해시를 확인했습니다.",
  rollback_staged: "이전 검증 버전 설치 파일의 서명과 해시를 확인했습니다.",
  installer_opened_pending_restart: "설치 파일을 열었습니다. 설치를 끝낸 뒤 AMIC OS를 다시 시작해 주세요.",
  installed_build_matched_pending: "다시 시작한 설치본이 서명된 대상 버전과 일치합니다.",
  blocked: "안전 검증을 통과하지 못해 설치를 진행하지 않습니다."
});

const BUSY_STATES = new Set(["loading", "initializing", "checking", "downloading"]);
const CHECKABLE_STATES = new Set([
  "baseline_required",
  "baseline_established",
  "ready",
  "signed_out",
  "baseline_blocked",
  "up_to_date",
  "installed_build_matched_pending",
  "blocked"
]);

function isUpdateBridge(value) {
  return Boolean(value
    && ["status", "check", "stage", "stageRollback", "open", "discard"]
      .every((method) => typeof value[method] === "function"));
}

function shortHash(value) {
  return /^[a-f0-9]{64}$/u.test(value ?? "") ? `${value.slice(0, 12)}…` : null;
}

function byteLabel(value) {
  if (!Number.isSafeInteger(value) || value < 0) return null;
  if (value < 1024) return `${value} B`;
  const units = ["KB", "MB", "GB"];
  let amount = value / 1024;
  let unit = units[0];
  for (let index = 1; index < units.length && amount >= 1024; index += 1) {
    amount /= 1024;
    unit = units[index];
  }
  return `${amount.toFixed(amount >= 10 ? 0 : 1)} ${unit}`;
}

function statusMessage(status) {
  if (status?.state === "blocked" && SAFE_ERROR_COPY[status.safe_error_code]) {
    return SAFE_ERROR_COPY[status.safe_error_code];
  }
  return STATUS_COPY[status?.state] ?? "업데이트 상태를 확인할 수 없습니다.";
}

function statusTone(status) {
  if (["baseline_established", "ready", "up_to_date", "installed_build_matched_pending"].includes(status?.state)) return "ready";
  if (["signed_out", "baseline_blocked", "blocked", "disabled"].includes(status?.state)) return "blocked";
  if (["staged", "rollback_staged", "installer_opened_pending_restart"].includes(status?.state)) return "warning";
  return "neutral";
}

function StatusIcon({ status }) {
  if (BUSY_STATES.has(status?.state)) return <RefreshCw size={17} aria-hidden="true" />;
  if (statusTone(status) === "ready") return <CheckCircle2 size={17} aria-hidden="true" />;
  if (["blocked", "warning"].includes(statusTone(status))) return <ShieldAlert size={17} aria-hidden="true" />;
  return <ShieldCheck size={17} aria-hidden="true" />;
}

function Fact({ label, value }) {
  if (!value) return null;
  return (
    <div className="internal-update-fact">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

export function InternalUnsignedUpdateView({
  status,
  busy = false,
  stageId = null,
  onCheck,
  onStage,
  onStageRollback,
  onOpen,
  onDiscard
}) {
  const state = status?.state ?? "loading";
  const staged = state === "staged" || state === "rollback_staged";
  const pendingRestart = state === "installer_opened_pending_restart";
  const targetVersion = status?.available_version ?? status?.rollback_version ?? null;
  const targetHash = shortHash(status?.artifact_sha256);
  const receiptHash = shortHash(status?.receipt_sha256);
  const artifactSize = byteLabel(status?.artifact_bytes);
  const actionDisabled = busy || BUSY_STATES.has(state);

  return (
    <Panel
      id="internal-unsigned-update-settings"
      title="AMIC OS 내부 업데이트"
      meta="사내 전용 Windows"
      className="internal-update-panel"
      data-internal-unsigned-update-panel="true"
    >
      <div className="internal-update-intro">
        <Download size={20} aria-hidden="true" />
        <div>
          <strong>AMIC 배포 서명과 파일 해시를 모두 통과한 설치 파일만 엽니다.</strong>
          <p>자동 설치하지 않으며 다운로드 주소와 로컬 파일 위치는 이 화면에 표시하지 않습니다.</p>
        </div>
      </div>

      <div
        className="internal-update-status"
        data-tone={statusTone(status)}
        data-internal-update-state={state}
        role="status"
        aria-live="polite"
      >
        <StatusIcon status={status} />
        <span>{statusMessage(status)}</span>
      </div>

      {(status?.version || targetVersion || targetHash || receiptHash || artifactSize) && (
        <dl className="internal-update-facts" aria-label="업데이트 검증 정보">
          <Fact label="현재 버전" value={status?.version} />
          <Fact label="대상 버전" value={targetVersion} />
          <Fact label="파일 크기" value={artifactSize} />
          <Fact label="파일 SHA-256" value={targetHash} />
          <Fact label="검증 영수증" value={receiptHash} />
        </dl>
      )}

      {status?.rollback_available && state === "up_to_date" && (
        <p className="internal-update-note">
          장애 복구용 이전 검증 버전 {status.rollback_version}이 있습니다. 롤백 권한은 한 번만 사용할 수 있습니다.
        </p>
      )}

      {staged && (
        <div className="internal-update-warning" role="note">
          <ShieldAlert size={17} aria-hidden="true" />
          <p>
            <strong>Windows에서 게시자를 확인할 수 없다는 경고가 표시됩니다.</strong>
            사내 배포본의 대상 버전과 해시가 위 정보와 맞는지 확인한 뒤에만 설치 파일을 여세요.
          </p>
        </div>
      )}

      {pendingRestart && (
        <p className="internal-update-note">
          설치를 취소했다면 아래 버튼으로 대기 상태를 지울 수 있습니다. 설치를 끝냈다면 지우지 말고 앱을 다시 시작하세요.
        </p>
      )}

      <div className="internal-update-actions" aria-label="내부 업데이트 작업">
        {CHECKABLE_STATES.has(state) && (
          <button className="primary-button" type="button" disabled={actionDisabled} onClick={onCheck}>
            {state === "baseline_required" ? "현재 버전 기준 확인" : "업데이트 확인"}
          </button>
        )}
        {state === "update_available" && (
          <button className="primary-button" type="button" disabled={actionDisabled} onClick={onStage}>
            업데이트 파일 받기
          </button>
        )}
        {state === "up_to_date" && status?.rollback_available && (
          <button className="secondary-button" type="button" disabled={actionDisabled} onClick={onStageRollback}>
            <RotateCcw size={15} aria-hidden="true" />
            이전 검증 버전 준비
          </button>
        )}
        {staged && (
          <>
            <button className="primary-button" type="button" disabled={actionDisabled || !stageId} onClick={onOpen}>
              게시자 경고를 확인하고 설치 파일 열기
            </button>
            <button className="secondary-button" type="button" disabled={actionDisabled} onClick={onDiscard}>
              준비한 파일 지우기
            </button>
          </>
        )}
        {pendingRestart && (
          <button className="secondary-button" type="button" disabled={actionDisabled} onClick={onDiscard}>
            설치를 취소했을 때만 대기 상태 지우기
          </button>
        )}
      </div>
    </Panel>
  );
}

function InternalUnsignedUpdateController({ bridge }) {
  const [status, setStatus] = useState({ state: "loading", enabled: true });
  const [stageId, setStageId] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    bridge.status().then((next) => {
      if (active) setStatus(next);
    }).catch(() => {
      if (active) setStatus({ state: "blocked", enabled: true, safe_error_code: "INTERNAL_UPDATE_UI_REQUEST_FAILED" });
    });
    return () => { active = false; };
  }, [bridge]);

  async function run(method) {
    if (busy) return;
    setBusy(true);
    try {
      const next = await bridge[method](...(method === "open" ? [stageId] : []));
      setStatus(next);
      setStageId(next?.stage_id ?? null);
    } catch {
      setStatus({ state: "blocked", enabled: true, safe_error_code: "INTERNAL_UPDATE_UI_REQUEST_FAILED" });
      setStageId(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <InternalUnsignedUpdateView
      status={status}
      busy={busy}
      stageId={stageId}
      onCheck={() => void run("check")}
      onStage={() => void run("stage")}
      onStageRollback={() => void run("stageRollback")}
      onOpen={() => void run("open")}
      onDiscard={() => void run("discard")}
    />
  );
}

export function InternalUnsignedUpdatePanel({ bridge = globalThis.amicInternalUpdate }) {
  if (!isUpdateBridge(bridge)) return null;
  return <InternalUnsignedUpdateController bridge={bridge} />;
}
