import React from "react";
import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, FileCheck2, FileWarning, Link2, LockKeyhole, RefreshCw, Search, ShieldCheck, UploadCloud } from "lucide-react";
import { fetchVaultBridgeStatus, fetchVaultDocuments, fetchVaultMatterLookup, fetchVaultUploadPreflight } from "../data/apiClient.js";
import { DataTable, PageHeader, Panel } from "./primitives.jsx";
import { DesktopDeniedState } from "./DesktopDeniedState.jsx";
import { EmailFilingView } from "./EmailFilingView.jsx";
import { VaultBreadcrumb } from "./VaultBreadcrumb.jsx";
import { VaultDocumentDetail } from "./VaultDocumentDetail.jsx";
import { VaultSecurityBadges } from "./VaultSecurityBadges.jsx";

const VAULT_PERMISSION_REF = "ui_cmp_g5_vault_live";
const VAULT_AUDIT_HINT_REF = "ui_cmp_g5_vault_probe";
const DEFAULT_MATTER_LOOKUP_QUERY = "AMIC";
const UUID_INPUT_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function vaultRows(items) {
  return items.map((item, index) => [
    `문서 ${index + 1}`,
    item.title,
    registeredAccountLabel(item),
    vaultStatus(item.status),
    item.current_version_id ? "현재 버전" : "확인 필요",
    privilegeLabel(item.privilege_label_id),
    holdLabel(item.legal_hold_id)
  ]);
}

function registeredAccountLabel(item) {
  const account = item.registered_account;
  if (!account) return "미연동";
  return account.display_name ?? "등록 계정";
}

function vaultStatus(value) {
  if (value === "review_required") return "검토 필요";
  if (value === "archived") return "보관됨";
  if (value === "current") return "현재 버전";
  return "사용 중";
}

function privilegeLabel(value) {
  if (!value) return "기본";
  if (value.includes("confidential")) return "기밀";
  if (value.includes("privileged")) return "특권";
  return "기본";
}

function holdLabel(value) {
  if (!value) return "없음";
  return value.includes("hold") ? "보존 설정" : "확인 필요";
}

const VAULT_SECTIONS = new Set(["vault-documents", "vault-detail", "vault-email"]);

function bridgeCodeLabel(code) {
  if (code === "MATTER_VAULT_BRIDGE_REQUIRED") return "브리지 설정 필요";
  if (code === "MATTER_VAULT_BRIDGE_BLOCKED") return "브리지 인증 차단";
  if (code === "MATTER_VAULT_BRIDGE_RUNTIME_UNAVAILABLE") return "Vault 런타임 확인 필요";
  if (code === "MATTER_VAULT_BRIDGE_STATUS_UNAVAILABLE") return "Vault 상태 확인 필요";
  return code ?? "확인 필요";
}

function bridgeSourceLabel(mode) {
  if (mode === "matter_app_api") return "Matter app API";
  if (mode === "vault_projection_only") return "Vault projection-only";
  if (mode === "stale_projection") return "Stale projection";
  if (mode === "denied") return "권한 차단";
  return "확인 필요";
}

function bridgeDescriptor(result) {
  if (result === null) {
    return {
      tone: "loading",
      Icon: ShieldCheck,
      meta: "확인 중",
      state: "상태 확인 중",
      source: "대기",
      boundary: "쓰기 차단",
      request: "대기",
      note: "Matter, Client, Vault 연결 상태를 확인하고 있습니다.",
      ready: false
    };
  }

  if (result.kind === "data") {
    const ready = result.runtimeWriteReady && result.repositoryDurable && !result.productionReadyClaim;
    return {
      tone: ready ? "ready" : "blocked",
      Icon: ready ? CheckCircle2 : LockKeyhole,
      meta: ready ? "API 준비" : "경계 확인",
      state: ready ? "런타임 준비" : "쓰기 차단",
      source: bridgeSourceLabel(result.sourceMode),
      boundary: ready ? "합성 사전검사 가능" : "쓰기 차단",
      request: result.requestId ?? "요청 없음",
      note: result.productionReadyClaim
        ? "운영 승인 주장이 감지되어 쓰기 상태로 올리지 않습니다."
        : "운영 승인 주장은 만들지 않고 연결 상태만 표시합니다.",
      ready
    };
  }

  if (result.kind === "guarded") {
    const code = result.safeErrorCodes?.[0] ?? null;
    return {
      tone: "blocked",
      Icon: LockKeyhole,
      meta: "차단됨",
      state: bridgeCodeLabel(code),
      source: "fail-closed",
      boundary: result.countLeakPrevented ? "건수 비노출" : "쓰기 차단",
      request: result.requestId ?? "요청 없음",
      note: "토큰 값은 화면에 표시하지 않습니다.",
      ready: false
    };
  }

  return {
    tone: "error",
    Icon: AlertTriangle,
    meta: "확인 실패",
    state: "연결 상태 확인 실패",
    source: "확인 필요",
    boundary: "쓰기 차단",
    request: "요청 없음",
    note: "새로고침하거나 런타임 설정을 확인하세요.",
    ready: false
  };
}

function VaultBridgeStatusPanel({ result }) {
  const descriptor = bridgeDescriptor(result);
  const Icon = descriptor.Icon;
  const safeCodes = result?.safeErrorCodes ?? [];
  return (
    <Panel id="vault-connection-status" className="vault-panel vault-bridge-panel" title="Matter 연결 상태" meta={descriptor.meta}>
      <div
        className={`vault-bridge-status ${descriptor.tone}`}
        data-lcx-vltui-02-vault-bridge-panel="true"
        data-vault-bridge-kind={result?.kind ?? "loading"}
        data-vault-bridge-ready={descriptor.ready ? "true" : "false"}
      >
        <div className="vault-bridge-strip">
          <Icon size={16} />
          <span>{descriptor.note}</span>
        </div>
        <dl className="vault-bridge-facts">
          <div>
            <dt>상태</dt>
            <dd>{descriptor.state}</dd>
          </div>
          <div>
            <dt>소스</dt>
            <dd>{descriptor.source}</dd>
          </div>
          <div>
            <dt>경계</dt>
            <dd>{descriptor.boundary}</dd>
          </div>
          <div>
            <dt>요청</dt>
            <dd>{descriptor.request}</dd>
          </div>
        </dl>
        {safeCodes.length > 0 && (
          <div className="vault-bridge-codes" aria-label="안전 오류 코드">
            {safeCodes.map((code) => (
              <span key={code}>{bridgeCodeLabel(code)}</span>
            ))}
          </div>
        )}
      </div>
    </Panel>
  );
}

function matterLookupCodeLabel(code) {
  if (code === "MATTER_VAULT_BRIDGE_REQUIRED") return "브리지 설정 필요";
  if (code === "MATTER_VAULT_BRIDGE_BLOCKED") return "브리지 인증 차단";
  if (code === "MATTER_VAULT_LOOKUP_QUERY_REQUIRED") return "검색어 필요";
  if (code === "MATTER_API_VALIDATION_ERROR") return "입력 형식 차단";
  return code ?? "확인 필요";
}

function uploadPreflightCodeLabel(code) {
  if (code === "MATTER_VAULT_BRIDGE_REQUIRED") return "브리지 설정 필요";
  if (code === "MATTER_VAULT_BRIDGE_BLOCKED") return "브리지 인증 차단";
  if (code === "MATTER_VAULT_UPLOAD_PREFLIGHT_MATTER_REQUIRED") return "Matter 선택 필요";
  if (code === "MATTER_VAULT_UPLOAD_PREFLIGHT_SOURCE_BLOCKED") return "원천 상태 차단";
  if (code === "MATTER_VAULT_UPLOAD_PREFLIGHT_LIFECYCLE_BLOCKED") return "사건 상태 차단";
  if (code === "MATTER_UNAUTHORIZED_OMISSION") return "권한 차단";
  if (code === "MATTER_REVIEW_REQUIRED") return "검토 필요";
  if (code === "MATTER_APPROVAL_REQUIRED") return "승인 필요";
  if (code === "MATTER_NOT_FOUND") return "Matter 확인 필요";
  return code ?? "확인 필요";
}

function MatterLookupState({ result, queryTooShort, uuidBlocked }) {
  if (uuidBlocked) {
    return (
      <div className="live-data-state live-data-denied" data-vault-matter-lookup-uuid-blocked="true">
        <strong>UUID 직접 입력은 허용하지 않습니다</strong>
        Matter Code, 이름, 고객명으로 검색하세요.
      </div>
    );
  }
  if (queryTooShort) {
    return (
      <div className="live-data-state live-data-empty">
        <strong>두 글자 이상 입력하세요</strong>
      </div>
    );
  }
  if (result === null) {
    return (
      <div className="live-data-state live-data-loading">
        <strong>Matter 후보를 확인하는 중입니다</strong>
      </div>
    );
  }
  if (result.kind === "error") {
    return (
      <div className="live-data-state live-data-error">
        <strong>Matter 후보를 확인하지 못했습니다</strong>
      </div>
    );
  }
  if (result.kind === "guarded") {
    return (
      <div className="live-data-state live-data-denied">
        <strong>Matter lookup 차단됨</strong>
        {result.safeErrorCodes?.map(matterLookupCodeLabel).join(" / ") || "연결 상태를 확인하세요."}
      </div>
    );
  }
  if (result.uiState === "empty" || result.items.length === 0) {
    return (
      <div className="live-data-state live-data-empty">
        <strong>선택할 Matter가 없습니다</strong>
      </div>
    );
  }
  return null;
}

function VaultMatterLookupPanel({ query, setQuery, result, selectedMatter, setSelectedMatter }) {
  const normalizedQuery = query.trim();
  const uuidBlocked = UUID_INPUT_PATTERN.test(normalizedQuery);
  const queryTooShort = normalizedQuery.length < 2;
  const items = !uuidBlocked && result?.kind === "data" ? result.items : [];
  const kind = uuidBlocked ? "blocked-local" : queryTooShort ? "query-required" : result?.kind ?? "loading";
  return (
    <Panel id="vault-matter-picker" className="vault-panel vault-matter-picker-panel" title="Matter 선택" meta="문서 작업 기준">
      <div
        className="vault-matter-picker"
        data-lcx-vltui-02-matter-picker="true"
        data-vault-matter-lookup-kind={kind}
        data-vault-matter-selected-ref={selectedMatter?.selected_ref ?? ""}
      >
        <label className="vault-lookup-field">
          <span>
            <Search size={14} />
            Matter 검색
          </span>
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setSelectedMatter(null);
            }}
            aria-label="Matter 검색"
            placeholder="Matter Code, 이름, 고객명"
          />
        </label>
        <MatterLookupState result={result} queryTooShort={queryTooShort} uuidBlocked={uuidBlocked} />
        {items.length > 0 && (
          <div className="vault-lookup-results" data-vault-matter-lookup-results="true">
            {items.map((item) => (
              <button
                type="button"
                key={item.selected_ref}
                className={selectedMatter?.selected_ref === item.selected_ref ? "selected" : ""}
                onClick={() => setSelectedMatter(item)}
              >
                <strong>{item.matter_code ?? item.matter_name}</strong>
                <span>{item.client_display_name ?? "고객 확인 필요"}</span>
              </button>
            ))}
          </div>
        )}
        <div className="vault-selected-matter" data-vault-selected-matter-state={selectedMatter ? "selected" : "empty"}>
          <Link2 size={15} />
          <span>{selectedMatter ? `${selectedMatter.matter_code ?? selectedMatter.matter_name} / ${selectedMatter.client_display_name ?? "고객"}` : "Matter 선택 전"}</span>
        </div>
      </div>
    </Panel>
  );
}

function canRunVaultUploadPreflight({ bridgeResult, selectedMatter }) {
  return Boolean(
    selectedMatter &&
    bridgeResult?.kind === "data" &&
    bridgeResult.sourceMode === "matter_app_api" &&
    bridgeResult.runtimeWriteReady &&
    bridgeResult.repositoryDurable &&
    !bridgeResult.productionReadyClaim
  );
}

function uploadPreflightDescriptor({ bridgeResult, selectedMatter, result, pending }) {
  const ready = canRunVaultUploadPreflight({ bridgeResult, selectedMatter });
  if (!selectedMatter) {
    return {
      state: "no-matter",
      tone: "blocked",
      Icon: FileWarning,
      label: "Matter 선택 전",
      note: "먼저 Matter를 선택하세요.",
      next: "대기",
      canRun: false
    };
  }
  if (bridgeResult === null) {
    return {
      state: "source-checking",
      tone: "loading",
      Icon: ShieldCheck,
      label: "연결 확인 중",
      note: "Matter app 원천 상태를 확인하고 있습니다.",
      next: "대기",
      canRun: false
    };
  }
  if (!ready) {
    return {
      state: "source-blocked",
      tone: "blocked",
      Icon: LockKeyhole,
      label: "사전검사 차단",
      note: "Matter app 원천, 저장소, 승인 경계를 통과해야 합니다.",
      next: "쓰기 차단",
      canRun: false
    };
  }
  if (pending) {
    return {
      state: "checking",
      tone: "loading",
      Icon: ShieldCheck,
      label: "사전검사 중",
      note: "문서 파일은 전송하지 않고 권한만 확인합니다.",
      next: "확인 중",
      canRun: false
    };
  }
  if (result?.kind === "data") {
    return {
      state: "passed",
      tone: "ready",
      Icon: FileCheck2,
      label: "사전검사 통과",
      note: "참조가 생성되었지만 Vault 쓰기는 계속 차단됩니다.",
      next: "권한 확인만 가능",
      canRun: true
    };
  }
  if (result?.kind === "guarded") {
    return {
      state: "guarded",
      tone: "blocked",
      Icon: LockKeyhole,
      label: "사전검사 차단",
      note: "권한 또는 원천 상태가 통과하지 않았습니다.",
      next: "쓰기 차단",
      canRun: true
    };
  }
  if (result?.kind === "error") {
    return {
      state: "error",
      tone: "error",
      Icon: AlertTriangle,
      label: "사전검사 실패",
      note: "새로고침 후 다시 확인하세요.",
      next: "확인 필요",
      canRun: true
    };
  }
  return {
    state: "ready-to-check",
    tone: "ready",
    Icon: UploadCloud,
    label: "사전검사 준비",
    note: "문서 파일은 전송하지 않고 Matter 원천과 권한만 확인합니다.",
    next: "권한 확인만 가능",
    canRun: true
  };
}

function VaultUploadPreflightPanel({ bridgeResult, selectedMatter, result, pending, onRun }) {
  const descriptor = uploadPreflightDescriptor({ bridgeResult, selectedMatter, result, pending });
  const Icon = descriptor.Icon;
  const safeCodes = result?.safeErrorCodes ?? [];
  const selectedLabel = selectedMatter
    ? `${selectedMatter.matter_code ?? selectedMatter.matter_name} / ${selectedMatter.client_display_name ?? "고객"}`
    : "Matter 선택 전";
  const preflightRef = result?.kind === "data" ? result.preflightRef : "";
  const writeEnabled = result?.vaultDocumentWriteEnabled === true;
  return (
    <Panel id="vault-upload-preflight" className="vault-panel vault-upload-preflight-panel" title="업로드 사전검사" meta="문서 전송 없음">
      <div
        className={`vault-upload-preflight ${descriptor.tone}`}
        data-lcx-vltui-02-upload-preflight="true"
        data-vault-upload-preflight-state={descriptor.state}
        data-vault-upload-write-enabled={writeEnabled ? "true" : "false"}
        data-vault-upload-preflight-ref={preflightRef}
      >
        <div className="vault-upload-preflight-strip">
          <Icon size={16} />
          <span>{descriptor.note}</span>
        </div>
        <dl className="vault-bridge-facts">
          <div>
            <dt>상태</dt>
            <dd>{descriptor.label}</dd>
          </div>
          <div>
            <dt>Matter</dt>
            <dd>{selectedLabel}</dd>
          </div>
          <div>
            <dt>다음 단계</dt>
            <dd>{descriptor.next}</dd>
          </div>
          <div>
            <dt>Vault 쓰기</dt>
            <dd>{writeEnabled ? "허용" : "차단"}</dd>
          </div>
        </dl>
        <button
          type="button"
          className="secondary-button vault-upload-preflight-action"
          onClick={onRun}
          disabled={!descriptor.canRun || pending}
        >
          <UploadCloud size={15} />
          사전검사 실행
        </button>
        {safeCodes.length > 0 && (
          <div className="vault-bridge-codes" aria-label="업로드 사전검사 안전 오류 코드">
            {safeCodes.map((code) => (
              <span key={code}>{uploadPreflightCodeLabel(code)}</span>
            ))}
          </div>
        )}
        {preflightRef && (
          <div className="vault-preflight-ref">
            <FileCheck2 size={15} />
            <span>{preflightRef}</span>
          </div>
        )}
      </div>
    </Panel>
  );
}

function actionBoundaryBase({ bridgeResult, selectedMatter, uploadPreflightResult }) {
  if (!selectedMatter) {
    return {
      state: "matter-required",
      tone: "blocked",
      Icon: FileWarning,
      label: "Matter 선택 필요",
      note: "Matter를 선택해야 문서 작업 경계를 확인할 수 있습니다."
    };
  }
  if (!canRunVaultUploadPreflight({ bridgeResult, selectedMatter })) {
    return {
      state: "source-blocked",
      tone: "blocked",
      Icon: LockKeyhole,
      label: "원천 확인 필요",
      note: "Matter app 원천, 저장소, 승인 경계를 먼저 통과해야 합니다."
    };
  }
  if (uploadPreflightResult?.kind === "data") {
    return {
      state: "preflight-checked",
      tone: "ready",
      Icon: ShieldCheck,
      label: "권한 확인 완료",
      note: "사전검사 참조는 생성됐지만 Vault 쓰기는 차단됩니다."
    };
  }
  if (uploadPreflightResult?.kind === "guarded") {
    return {
      state: "permission-blocked",
      tone: "blocked",
      Icon: LockKeyhole,
      label: "권한 차단",
      note: "권한 또는 원천 상태가 통과하지 않았습니다."
    };
  }
  if (uploadPreflightResult?.kind === "error") {
    return {
      state: "check-failed",
      tone: "error",
      Icon: AlertTriangle,
      label: "확인 실패",
      note: "사전검사를 다시 실행한 뒤 문서 작업 경계를 확인하세요."
    };
  }
  return {
    state: "preflight-required",
    tone: "blocked",
    Icon: UploadCloud,
    label: "사전검사 필요",
    note: "업로드 사전검사를 실행해야 문서 작업 경계를 확인할 수 있습니다."
  };
}

function actionBoundaryRows(base) {
  const checked = base.state === "preflight-checked";
  const guardedState = checked ? "guarded" : base.state;
  const guardedStatus = checked ? "권한 확인만 완료" : base.label;
  const guardedNote = checked ? "실제 파일과 저장소 포인터는 전송하지 않습니다." : base.note;
  return [
    {
      id: "version-upload",
      label: "새 버전 등록",
      owner: "Vault",
      state: guardedState,
      status: guardedStatus,
      note: guardedNote,
      action: "버전 등록 차단"
    },
    {
      id: "metadata-mutation",
      label: "메타데이터 변경",
      owner: "Matter app",
      state: guardedState,
      status: guardedStatus,
      note: checked ? "Matter 참조만 확인했고 메타데이터 변경은 차단합니다." : base.note,
      action: "변경 차단"
    },
    {
      id: "legal-hold",
      label: "법적 보존",
      owner: "Owner 결정 필요",
      state: checked ? "owner-blocked" : base.state,
      status: checked ? "결정 필요" : base.label,
      note: checked ? "보존 설정은 소유자 결정 전까지 변경하지 않습니다." : base.note,
      action: "보존 변경 차단"
    },
    {
      id: "retention",
      label: "보존 정책",
      owner: "Vault Records",
      state: checked ? "records-blocked" : base.state,
      status: checked ? "정책 연결 필요" : base.label,
      note: checked ? "기록 정책 연결 전까지 보존 기간을 변경하지 않습니다." : base.note,
      action: "정책 변경 차단"
    },
    {
      id: "document-action",
      label: "문서 작업",
      owner: "Matter app + Vault",
      state: guardedState,
      status: guardedStatus,
      note: checked ? "문서 열람 외 작업은 별도 정책 확인 전까지 차단합니다." : base.note,
      action: "작업 차단"
    }
  ];
}

function boundaryState(rows, id) {
  return rows.find((row) => row.id === id)?.state ?? "unknown";
}

function VaultActionBoundaryPanel({ bridgeResult, selectedMatter, uploadPreflightResult }) {
  const base = actionBoundaryBase({ bridgeResult, selectedMatter, uploadPreflightResult });
  const rows = actionBoundaryRows(base);
  const Icon = base.Icon;
  const preflightRef = uploadPreflightResult?.kind === "data" ? uploadPreflightResult.preflightRef : "";
  return (
    <Panel id="vault-action-boundaries" className="vault-panel vault-action-boundary-panel" title="문서 작업 경계" meta="쓰기 차단">
      <div
        className={`vault-action-boundary ${base.tone}`}
        data-lcx-vltui-02-action-boundaries="true"
        data-vault-boundary-base-state={base.state}
        data-vault-boundary-write-enabled="false"
        data-vault-boundary-preflight-ref={preflightRef}
        data-vault-version-upload-state={boundaryState(rows, "version-upload")}
        data-vault-metadata-mutation-state={boundaryState(rows, "metadata-mutation")}
        data-vault-legal-hold-state={boundaryState(rows, "legal-hold")}
        data-vault-retention-state={boundaryState(rows, "retention")}
        data-vault-document-action-state={boundaryState(rows, "document-action")}
      >
        <div className="vault-action-boundary-strip">
          <Icon size={16} />
          <span>{base.note}</span>
        </div>
        <div className="vault-action-boundary-list">
          {rows.map((row) => (
            <div
              key={row.id}
              className="vault-action-boundary-row"
              data-vault-boundary-row="true"
              data-vault-boundary-action={row.id}
              data-vault-boundary-state={row.state}
              data-vault-boundary-owner={row.owner}
              data-vault-boundary-write-enabled="false"
            >
              <div className="vault-action-boundary-main">
                <strong>{row.label}</strong>
                <span>{row.note}</span>
              </div>
              <div className="vault-action-boundary-meta">
                <span>{row.owner}</span>
                <span>{row.status}</span>
              </div>
              <button type="button" className="secondary-button vault-action-boundary-action" disabled>
                <LockKeyhole size={14} />
                {row.action}
              </button>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
}

export function VaultSurface({ labels, liveCtx = "allow", activeSection = "" }) {
  const [result, setResult] = useState(null);
  const [bridgeResult, setBridgeResult] = useState(null);
  const [matterLookupQuery, setMatterLookupQuery] = useState(DEFAULT_MATTER_LOOKUP_QUERY);
  const [matterLookupResult, setMatterLookupResult] = useState(null);
  const [selectedMatter, setSelectedMatter] = useState(null);
  const [uploadPreflightResult, setUploadPreflightResult] = useState(null);
  const [uploadPreflightPending, setUploadPreflightPending] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);
  const currentSection = VAULT_SECTIONS.has(activeSection) ? activeSection : "vault-documents";

  useEffect(() => {
    let cancelled = false;
    setResult(null);
    setBridgeResult(null);
    setUploadPreflightResult(null);
    setUploadPreflightPending(false);
    fetchVaultDocuments({
      ctx: liveCtx,
      permissionRef: VAULT_PERMISSION_REF,
      auditHintRef: VAULT_AUDIT_HINT_REF
    }).then((next) => {
      if (!cancelled) setResult(next);
    });
    fetchVaultBridgeStatus({ ctx: liveCtx }).then((next) => {
      if (!cancelled) setBridgeResult(next);
    });
    return () => {
      cancelled = true;
    };
  }, [liveCtx, refreshToken]);

  useEffect(() => {
    let cancelled = false;
    const query = matterLookupQuery.trim();
    setMatterLookupResult(null);
    if (UUID_INPUT_PATTERN.test(query) || query.length < 2) {
      return () => {
        cancelled = true;
      };
    }
    fetchVaultMatterLookup({ ctx: liveCtx, query }).then((next) => {
      if (!cancelled) setMatterLookupResult(next);
    });
    return () => {
      cancelled = true;
    };
  }, [liveCtx, matterLookupQuery, refreshToken]);

  useEffect(() => {
    setUploadPreflightResult(null);
    setUploadPreflightPending(false);
  }, [selectedMatter?.selected_ref, bridgeResult?.requestId, liveCtx]);

  const handleUploadPreflight = async () => {
    if (!canRunVaultUploadPreflight({ bridgeResult, selectedMatter }) || uploadPreflightPending) return;
    setUploadPreflightPending(true);
    setUploadPreflightResult(null);
    const next = await fetchVaultUploadPreflight({
      ctx: liveCtx,
      selectedMatter,
      bridgeStatus: bridgeResult
    });
    setUploadPreflightResult(next);
    setUploadPreflightPending(false);
  };

  const documents = result?.kind === "data" ? result.items : [];
  const selected = documents[0] ?? null;
  let body;
  if (result === null) {
    body = (
      <div className="live-data-state live-data-loading">
        <strong>Vault 문서 목록을 불러오는 중입니다</strong>
      </div>
    );
  } else if (result.kind === "error") {
    body = (
      <div className="live-data-state live-data-error">
        <strong>Vault 문서 목록을 불러오지 못했습니다</strong>
        새로고침하거나 연결 상태를 확인하세요.
      </div>
    );
  } else if (result.uiState === "denied") {
    body = <DesktopDeniedState />;
  } else if (result.uiState === "review_required" || result.outcome === "review_required") {
    body = (
      <div className="live-data-state live-data-review">
        <strong>검토가 필요합니다</strong>
        검토가 끝나면 Vault 문서를 확인할 수 있습니다.
      </div>
    );
  } else if (documents.length === 0) {
    body = (
      <div className="live-data-state live-data-empty">
        <strong>표시할 문서가 없습니다</strong>
      </div>
    );
  } else {
    body = (
      <div className="vault-live-stack">
        <div className="vault-safe-strip">
          <ShieldCheck size={15} />
          <span>문서 본문은 권한이 있을 때만 표시합니다.</span>
        </div>
        <VaultBreadcrumb matterId={selected?.matter_id} workspaceId={selected?.workspace_id} />
        <VaultSecurityBadges document={selected} />
        <DataTable columns={["문서", "제목", "등록 계정", "상태", "버전", "권한", "보존"]} rows={vaultRows(documents)} />
      </div>
    );
  }

  return (
    <section id="vault-home" className="surface stack vault-surface" data-cmp-g5-vault-surface="true">
      <PageHeader
        title={labels.vaultTitle}
        subtitle="Vault 문서와 권한 상태를 확인합니다. 권한이 없는 본문은 숨깁니다."
        actions={
          <button className="secondary-button" onClick={() => setRefreshToken((value) => value + 1)}>
            <RefreshCw size={15} />
            새로고침
          </button>
        }
      />
      <div className="vault-runtime-grid">
        {currentSection === "vault-documents" && (
          <>
            <Panel id="vault-documents" className="vault-panel" title="Vault 문서함" meta="권한 기준 적용">
              {body}
            </Panel>
            <div className="vault-side-stack">
              <VaultBridgeStatusPanel result={bridgeResult} />
              <VaultMatterLookupPanel
                query={matterLookupQuery}
                setQuery={setMatterLookupQuery}
                result={matterLookupResult}
                selectedMatter={selectedMatter}
                setSelectedMatter={setSelectedMatter}
              />
              <VaultUploadPreflightPanel
                bridgeResult={bridgeResult}
                selectedMatter={selectedMatter}
                result={uploadPreflightResult}
                pending={uploadPreflightPending}
                onRun={handleUploadPreflight}
              />
              <VaultActionBoundaryPanel
                bridgeResult={bridgeResult}
                selectedMatter={selectedMatter}
                uploadPreflightResult={uploadPreflightResult}
              />
            </div>
          </>
        )}
        {currentSection === "vault-detail" && <VaultDocumentDetail document={selected} />}
        {currentSection === "vault-email" && <EmailFilingView />}
      </div>
    </section>
  );
}
