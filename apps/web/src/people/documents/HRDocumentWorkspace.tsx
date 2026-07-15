import React from "react";
import { useEffect, useState } from "react";
import { BadgeCheck, FilePlus2, FileText, TimerReset, Upload } from "lucide-react";
import { DataTable, Panel } from "../../components/primitives.jsx";
import {
  createHrxEmploymentContractDocument,
  expireHrxEmploymentContractDocument,
  fetchHrxDocuments,
  fetchHrxExpiringDocuments,
  renewHrxEmploymentContractDocument,
  signHrxEmploymentContractDocument,
  terminateHrxEmploymentContractDocument
} from "../hrxApiClient.ts";

type HrxDocument = {
  document_id: string;
  document_type: string;
  title?: string | null;
  source_ref?: string | null;
  signature_ref?: string | null;
  contract_state?: string | null;
  expires_on?: string | null;
};

type HrxDocumentLoadResult =
  | { kind: "data"; documents: HrxDocument[] }
  | { kind: "empty" | "error" | "guarded" | "step_up_required"; documents?: HrxDocument[] };

type HrxExpiringResult = HrxDocumentLoadResult;

type DocumentModeKey = "regulations" | "certificates" | "contracts";
type DocumentModeConfig = {
  panelId: string;
  title: string;
  loadingText: string;
  errorText: string;
  emptyText: string;
  rowPrefix: string;
  columns: string[];
  sourceState: (document: HrxDocument) => string;
  scope: "all" | "employee";
  types: Set<string>;
};

const DOCUMENT_MODE: Record<DocumentModeKey, DocumentModeConfig> = {
  regulations: {
    panelId: "people-documents",
    title: "회사방침",
    loadingText: "회사방침 목록을 불러오는 중입니다",
    errorText: "회사방침 목록을 불러오지 못했습니다.",
    emptyText: "표시할 회사방침이 없습니다.",
    rowPrefix: "방침",
    columns: ["방침", "유형", "제목", "등록 상태"],
    sourceState: (document: HrxDocument) => document.source_ref ? "등록됨" : "미등록",
    scope: "all",
    types: new Set(["policy", "policy_ack", "leave_notice", "regulation"])
  },
  certificates: {
    panelId: "people-certificates",
    title: "증명서 발급 요청",
    loadingText: "증명서 발급 요청 목록을 불러오는 중입니다",
    errorText: "증명서 발급 요청 목록을 불러오지 못했습니다.",
    emptyText: "표시할 증명서 발급 요청이 없습니다.",
    rowPrefix: "요청",
    columns: ["요청", "유형", "제목", "상태"],
    sourceState: (document: HrxDocument) => document.source_ref ? "요청 가능" : "요청 필요",
    scope: "employee",
    types: new Set(["employment", "employment_certificate", "career_certificate"])
  },
  contracts: {
    panelId: "people-employment-contracts",
    title: "근로계약서",
    loadingText: "근로계약서 목록을 불러오는 중입니다",
    errorText: "근로계약서 목록을 불러오지 못했습니다.",
    emptyText: "표시할 근로계약서가 없습니다.",
    rowPrefix: "계약",
    columns: ["계약서", "상태", "만료일", "D-day", "서명본", "원본", "작업"],
    sourceState: (document: HrxDocument) => document.source_ref ? "등록됨" : "미등록",
    scope: "employee",
    types: new Set(["employment_contract"])
  }
};

function resolveDocumentMode(mode: string): DocumentModeConfig {
  if (mode === "certificates") return DOCUMENT_MODE.certificates;
  if (mode === "contracts") return DOCUMENT_MODE.contracts;
  return DOCUMENT_MODE.regulations;
}

function documentTypeLabel(value: string): string {
  if (value === "resume") return "이력서";
  if (value === "offer") return "합격자 문서";
  if (value === "policy" || value === "policy_ack") return "회사방침";
  if (value === "leave_notice") return "휴가 안내";
  if (value === "employment" || value === "employment_certificate") return "재직증명서";
  if (value === "career_certificate") return "경력증명서";
  if (value === "employment_contract") return "근로계약서";
  return "문서";
}

function documentTitleLabel(document: HrxDocument): string {
  if (document.document_type === "policy_ack") return "회사방침 확인";
  if (document.document_type === "leave_notice") return "휴가 안내";
  return document.title ?? "제목 없음";
}

function contractStateLabel(value?: string | null): string {
  if (value === "draft") return "작성 중";
  if (value === "approved") return "서명 대기";
  if (value === "signed") return "서명됨";
  if (value === "renewed") return "갱신됨";
  if (value === "terminated") return "종료됨";
  if (value === "expired") return "만료됨";
  return "상태 확인";
}

function compactRef(value?: string | null): string {
  if (!value) return "없음";
  return String(value).replace(/^Vault:/, "Vault ");
}

function daysUntilLabel(value?: string | null): string {
  if (!value) return "미지정";
  const expiresAt = new Date(`${value}T00:00:00.000Z`).getTime();
  if (Number.isNaN(expiresAt)) return "확인";
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const days = Math.ceil((expiresAt - todayStart) / (24 * 60 * 60 * 1000));
  if (days < 0) return `D+${Math.abs(days)}`;
  if (days === 0) return "D-day";
  return `D-${days}`;
}

function vaultReferenceLink(value?: string | null) {
  if (!value) return "없음";
  return (
    <a className="hr-document-ref-link" href={`?view=vault&query=${encodeURIComponent(value)}`}>
      {compactRef(value)}
    </a>
  );
}

function isHrxDocument(value: unknown): value is HrxDocument {
  if (!value || typeof value !== "object") return false;
  return typeof (value as HrxDocument).document_id === "string" && typeof (value as HrxDocument).document_type === "string";
}

function normalizeDocumentResult(value: { kind?: string; documents?: unknown }): HrxDocumentLoadResult {
  if (value.kind === "data" && Array.isArray(value.documents)) {
    return { kind: "data", documents: value.documents.filter(isHrxDocument) };
  }
  if (value.kind === "empty" || value.kind === "guarded" || value.kind === "step_up_required") {
    return { kind: value.kind };
  }
  return { kind: "error" };
}

export function HRDocumentWorkspace({ employeeId, refreshKey, mode = "regulations" }: { employeeId?: string | null; refreshKey?: unknown; mode?: string }) {
  const [result, setResult] = useState<HrxDocumentLoadResult | null>(null);
  const [expiringResult, setExpiringResult] = useState<HrxExpiringResult | null>(null);
  const [localRefreshKey, setLocalRefreshKey] = useState(0);
  const [form, setForm] = useState({ expires_on: "2026-07-31" });
  const [actionStatus, setActionStatus] = useState<string | null>(null);
  const config = resolveDocumentMode(mode);

  useEffect(() => {
    let cancelled = false;
    setResult(null);
    setExpiringResult(null);
    const loadDocuments = mode === "contracts"
      ? Promise.all([
        fetchHrxDocuments(employeeId, { scope: config.scope }),
        fetchHrxExpiringDocuments({ employee_id: employeeId, days: 30 })
      ])
      : Promise.all([fetchHrxDocuments(employeeId, { scope: config.scope }), Promise.resolve(null)]);
    loadDocuments.then(([next, expiring]) => {
      if (cancelled) return;
      setResult(normalizeDocumentResult(next));
      setExpiringResult(expiring ? normalizeDocumentResult(expiring) : null);
    });
    return () => {
      cancelled = true;
    };
  }, [employeeId, refreshKey, localRefreshKey, config.scope, mode]);

  function reload() {
    setLocalRefreshKey((key) => key + 1);
  }

  async function createContract(event: { preventDefault(): void }) {
    event.preventDefault();
    setActionStatus("processing");
    const created = await createHrxEmploymentContractDocument(employeeId, form);
    setActionStatus(created.kind === "data" ? "created" : "error");
    if (created.kind === "data") reload();
  }

  async function signContract(document: HrxDocument) {
    setActionStatus("processing");
    const signed = await signHrxEmploymentContractDocument(
      document.document_id,
      `Vault:${document.document_id}:signed:${Date.now()}`
    );
    setActionStatus(signed.kind === "data" ? "signed" : "error");
    if (signed.kind === "data") reload();
  }

  async function expireContract(document: HrxDocument) {
    setActionStatus("processing");
    const expired = await expireHrxEmploymentContractDocument(document.document_id);
    setActionStatus(expired.kind === "data" ? "expired" : "error");
    if (expired.kind === "data") reload();
  }

  async function renewContract(document: HrxDocument) {
    setActionStatus("processing");
    const renewed = await renewHrxEmploymentContractDocument(document.document_id, form.expires_on || document.expires_on);
    setActionStatus(renewed.kind === "data" ? "renewed" : "error");
    if (renewed.kind === "data") reload();
  }

  async function terminateContract(document: HrxDocument) {
    setActionStatus("processing");
    const terminated = await terminateHrxEmploymentContractDocument(document.document_id);
    setActionStatus(terminated.kind === "data" ? "terminated" : "error");
    if (terminated.kind === "data") reload();
  }

  function contractAction(document: HrxDocument) {
    if (document.contract_state === "draft" || document.contract_state === "approved") {
      return (
        <button type="button" className="secondary-button hr-document-inline-action" onClick={() => signContract(document)}>
          <Upload size={14} />
          서명 등록
        </button>
      );
    }
    if (document.contract_state === "signed" || document.contract_state === "renewed") {
      return (
        <span className="hr-document-action-strip">
          <button type="button" className="secondary-button hr-document-inline-action" onClick={() => renewContract(document)}>
            <TimerReset size={14} />
            갱신
          </button>
          <button type="button" className="secondary-button hr-document-inline-action" onClick={() => expireContract(document)}>
            <TimerReset size={14} />
            만료 처리
          </button>
          <button type="button" className="secondary-button hr-document-inline-action" onClick={() => terminateContract(document)}>
            <FileText size={14} />
            해지
          </button>
        </span>
      );
    }
    return <span className="hr-document-muted">완료</span>;
  }

  let body;
  if (config.scope === "employee" && !employeeId) {
    body = <div className="live-data-state live-data-empty">구성원을 선택하세요.</div>;
  } else if (result === null) {
    body = <div className="live-data-state live-data-loading">{config.loadingText}</div>;
  } else if (result.kind === "empty") {
    body = <div className="live-data-state live-data-empty">구성원을 선택하세요.</div>;
  } else if (result.kind === "error" || result.kind !== "data") {
    body = <div className="live-data-state live-data-error">{config.errorText}</div>;
  } else {
    const documents = result.documents.filter((document: HrxDocument) => config.types.has(document.document_type));
    if (mode === "contracts") {
      const expiringDocuments = expiringResult?.kind === "data" ? expiringResult.documents : [];
      body = (
        <>
          <form className="hr-document-action-bar" onSubmit={createContract}>
            <label>
              <span>만료일</span>
              <input type="date" value={form.expires_on} onChange={(event: { target: { value: string } }) => setForm({ ...form, expires_on: event.target.value })} />
            </label>
            <button className="primary-button" disabled={!employeeId || actionStatus === "processing"}>
              <FilePlus2 size={15} />
              계약 생성
            </button>
            <span className="hr-document-action-status" data-hr-document-action-status={actionStatus ?? "idle"}>
              {actionStatus === "processing" ? "처리 중" : actionStatus === "error" ? "처리 실패" : actionStatus === "created" ? "생성됨" : actionStatus === "signed" ? "서명됨" : actionStatus === "renewed" ? "갱신됨" : actionStatus === "terminated" ? "해지됨" : actionStatus === "expired" ? "만료됨" : "대기"}
            </span>
          </form>
          <div className="hr-document-lifecycle-summary">
            <span><BadgeCheck size={14} />계약 {documents.length}건</span>
            <span><TimerReset size={14} />30일 내 만료 {expiringDocuments.length}건</span>
          </div>
          {documents.length === 0 ? (
            <div className="live-data-state live-data-empty">{config.emptyText}</div>
          ) : (
            <DataTable
              columns={config.columns}
              rows={documents.map((document: HrxDocument, index: number) => [
                `${config.rowPrefix} ${index + 1}`,
                contractStateLabel(document.contract_state),
                document.expires_on ?? "미지정",
                <span className="hr-document-mono-number">{daysUntilLabel(document.expires_on)}</span>,
                vaultReferenceLink(document.signature_ref),
                vaultReferenceLink(document.source_ref),
                contractAction(document)
              ])}
            />
          )}
        </>
      );
    } else {
      body = (
        documents.length === 0
          ? <div className="live-data-state live-data-empty">{config.emptyText}</div>
          : (
            <DataTable
              columns={config.columns}
              rows={documents.map((document: HrxDocument, index: number) => [
                `${config.rowPrefix} ${index + 1}`,
                documentTypeLabel(document.document_type),
                documentTitleLabel(document),
                config.sourceState(document)
              ])}
            />
          )
      );
    }
  }

  return (
    <Panel id={config.panelId} className="people-panel span-2" title={config.title}>
      {body}
    </Panel>
  );
}
