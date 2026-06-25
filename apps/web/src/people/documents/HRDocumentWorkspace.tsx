import React from "react";
import { useEffect, useState } from "react";
import { FileText } from "lucide-react";
import { DataTable, Panel } from "../../components/primitives.jsx";
import { fetchHrxDocuments } from "../hrxApiClient.ts";

function documentTypeLabel(value) {
  if (value === "resume") return "이력서";
  if (value === "offer") return "채용 제안서";
  if (value === "policy") return "정책 문서";
  if (value === "employment") return "인사 문서";
  return "문서";
}

export function HRDocumentWorkspace({ employeeId, refreshKey }) {
  const [result, setResult] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setResult(null);
    fetchHrxDocuments(employeeId).then((next) => {
      if (!cancelled) setResult(next);
    });
    return () => {
      cancelled = true;
    };
  }, [employeeId, refreshKey]);

  let body;
  if (!employeeId) {
    body = <div className="live-data-state live-data-empty">구성원을 선택하세요.</div>;
  } else if (result === null) {
    body = <div className="live-data-state live-data-loading">문서 목록을 불러오는 중입니다</div>;
  } else if (result.kind === "empty") {
    body = <div className="live-data-state live-data-empty">구성원을 선택하세요.</div>;
  } else if (result.kind === "error") {
    body = <div className="live-data-state live-data-error">문서 목록을 불러오지 못했습니다.</div>;
  } else if (result.documents.length === 0) {
    body = <div className="live-data-state live-data-empty">표시할 문서가 없습니다.</div>;
  } else {
    body = (
      <DataTable
        columns={["문서", "유형", "제목", "등록 상태"]}
        rows={result.documents.map((document, index) => [
          `문서 ${index + 1}`,
          documentTypeLabel(document.document_type),
          document.title ?? "제목 없음",
          document.source_ref ? "등록됨" : "미등록"
        ])}
      />
    );
  }

  return (
    <Panel id="people-documents" className="people-panel span-2" title="인사 문서" meta="권한 기준 적용">
      <div className="people-panel-kicker">
        <FileText size={15} />
        문서 본문은 권한이 있을 때만 표시합니다.
      </div>
      {body}
    </Panel>
  );
}
