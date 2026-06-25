import React from "react";
import { useEffect, useState } from "react";
import { FileText } from "lucide-react";
import { DataTable, Panel } from "../../components/primitives.jsx";
import { fetchHrxDocuments } from "../hrxApiClient.ts";

const DOCUMENT_MODE = {
  regulations: {
    panelId: "people-documents",
    title: "회사방침",
    meta: "회사 설정 - 일반",
    kicker: "회사 방침에 대한 설정은 회사 설정 - 일반에서 할 수 있습니다.",
    loadingText: "회사방침 목록을 불러오는 중입니다",
    errorText: "회사방침 목록을 불러오지 못했습니다.",
    emptyText: "표시할 회사방침이 없습니다.",
    rowPrefix: "방침",
    columns: ["방침", "유형", "제목", "등록 상태"],
    sourceState: (document) => document.source_ref ? "등록됨" : "미등록",
    scope: "all",
    types: new Set(["policy", "policy_ack", "leave_notice", "regulation"])
  },
  certificates: {
    panelId: "people-certificates",
    title: "증명서 발급 요청",
    meta: "재직·경력",
    kicker: "재직증명서와 경력증명서의 증명서 발급 요청을 확인합니다.",
    loadingText: "증명서 발급 요청 목록을 불러오는 중입니다",
    errorText: "증명서 발급 요청 목록을 불러오지 못했습니다.",
    emptyText: "표시할 증명서 발급 요청이 없습니다.",
    rowPrefix: "요청",
    columns: ["요청", "유형", "제목", "상태"],
    sourceState: (document) => document.source_ref ? "요청 가능" : "요청 필요",
    scope: "employee",
    types: new Set(["employment", "employment_certificate", "career_certificate"])
  }
};

function documentTypeLabel(value) {
  if (value === "resume") return "이력서";
  if (value === "offer") return "합격자 문서";
  if (value === "policy" || value === "policy_ack") return "회사방침";
  if (value === "leave_notice") return "휴가 안내";
  if (value === "employment" || value === "employment_certificate") return "재직증명서";
  if (value === "career_certificate") return "경력증명서";
  if (value === "employment_contract") return "근로계약서";
  return "문서";
}

function documentTitleLabel(document) {
  if (document.document_type === "policy_ack") return "회사방침 확인";
  if (document.document_type === "leave_notice") return "휴가 안내";
  return document.title ?? "제목 없음";
}

export function HRDocumentWorkspace({ employeeId, refreshKey, mode = "regulations" }) {
  const [result, setResult] = useState(null);
  const config = DOCUMENT_MODE[mode] ?? DOCUMENT_MODE.regulations;

  useEffect(() => {
    let cancelled = false;
    setResult(null);
    fetchHrxDocuments(employeeId, { scope: config.scope }).then((next) => {
      if (!cancelled) setResult(next);
    });
    return () => {
      cancelled = true;
    };
  }, [employeeId, refreshKey, config.scope]);

  let body;
  if (config.scope === "employee" && !employeeId) {
    body = <div className="live-data-state live-data-empty">구성원을 선택하세요.</div>;
  } else if (result === null) {
    body = <div className="live-data-state live-data-loading">{config.loadingText}</div>;
  } else if (result.kind === "empty") {
    body = <div className="live-data-state live-data-empty">구성원을 선택하세요.</div>;
  } else if (result.kind === "error") {
    body = <div className="live-data-state live-data-error">{config.errorText}</div>;
  } else {
    const documents = result.documents.filter((document) => config.types.has(document.document_type));
    body = (
      documents.length === 0
        ? <div className="live-data-state live-data-empty">{config.emptyText}</div>
        : (
          <DataTable
            columns={config.columns}
            rows={documents.map((document, index) => [
              `${config.rowPrefix} ${index + 1}`,
              documentTypeLabel(document.document_type),
              documentTitleLabel(document),
              config.sourceState(document)
            ])}
          />
        )
    );
  }

  return (
    <Panel id={config.panelId} className="people-panel span-2" title={config.title} meta={config.meta}>
      <div className="people-panel-kicker">
        <FileText size={15} />
        {config.kicker}
      </div>
      {body}
    </Panel>
  );
}
