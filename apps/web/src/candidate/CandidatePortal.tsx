import React from "react";
import { useEffect, useState } from "react";
import { BadgeCheck } from "lucide-react";
import { DataTable, Panel, Property } from "../components/primitives.jsx";
import { fetchCandidatePortal } from "../people/hrxApiClient.ts";

function stageLabel(value) {
  if (value === "submitted") return "접수";
  if (value === "screening") return "검토";
  if (value === "interview") return "면접";
  if (value === "offer") return "합격자";
  if (value === "hired") return "구성원 등록";
  if (value === "created" || value === "updated") return "확인";
  return "확인 필요";
}

function candidateTypeLabel(value) {
  if (value === "candidate") return "지원자";
  return "지원자";
}

function documentTypeLabel(value) {
  if (value === "resume") return "이력서";
  if (value === "offer") return "합격자 문서";
  if (value === "policy") return "정책 문서";
  return "문서";
}

export function CandidatePortal({ candidateId }) {
  const [result, setResult] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setResult(null);
    if (!candidateId) return undefined;
    fetchCandidatePortal(candidateId).then((next) => {
      if (!cancelled) setResult(next);
    });
    return () => {
      cancelled = true;
    };
  }, [candidateId]);

  let body;
  if (!candidateId) {
    body = <div className="live-data-state live-data-empty">지원자를 선택하세요.</div>;
  } else if (result === null) {
    body = <div className="live-data-state live-data-loading">지원자 정보를 불러오는 중입니다</div>;
  } else if (result.kind === "error") {
    body = <div className="live-data-state live-data-error">지원자 정보를 불러오지 못했습니다.</div>;
  } else {
    body = (
      <>
        <div className="property-grid people-profile-grid">
          <Property label="지원자" value={result.candidate.legal_name} />
          <Property label="구분" value={candidateTypeLabel(result.candidate.data_subject_type)} />
          <Property label="지원 경로" value={result.candidate.source_ref ? "등록됨" : "미등록"} />
          <Property label="이력서" value={result.candidate.resume_ref ? "권한 필요" : "미등록"} />
        </div>
        <DataTable
          columns={["지원", "공고", "단계", "사유"]}
          rows={result.applications.map((application, index) => [
            `지원 ${index + 1}`,
            `공고 ${index + 1}`,
            stageLabel(application.stage),
            stageLabel(application.stage_reason)
          ])}
        />
        <DataTable
          columns={["문서", "유형", "출처", "내용"]}
          rows={result.documents.map((document, index) => [`문서 ${index + 1}`, documentTypeLabel(document.document_type), document.source_ref ? "등록됨" : "미등록", "권한 필요"])}
        />
      </>
    );
  }

  return (
    <Panel className="people-panel span-2" title="지원자 정보" meta="구성원 등록">
      <div className="people-panel-kicker">
        <BadgeCheck size={15} />
        지원 내역과 문서 정보를 확인합니다
      </div>
      {body}
    </Panel>
  );
}
