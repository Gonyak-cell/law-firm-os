import React from "react";
import { useEffect, useState } from "react";
import { GitBranch } from "lucide-react";
import { DataTable, Panel } from "../../components/primitives.jsx";
import { fetchRecruitingPipeline, updateHrxApplicationStage } from "../hrxApiClient.ts";

const NEXT_STAGE = {
  submitted: "screening",
  screening: "interview",
  interview: "offer",
  offer: "hired"
};

function stageLabel(value) {
  if (value === "submitted") return "접수";
  if (value === "screening") return "검토";
  if (value === "interview") return "면접";
  if (value === "offer") return "합격자";
  if (value === "hired") return "구성원 등록";
  if (value === "open") return "진행 중";
  if (value === "sent") return "발송";
  if (value === "scheduled") return "예정";
  if (value === "completed") return "완료";
  return "확인 필요";
}

export function RecruitingPipeline() {
  const [result, setResult] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setResult(null);
    fetchRecruitingPipeline().then((next) => {
      if (!cancelled) setResult(next);
    });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  async function advance(application) {
    const stage = NEXT_STAGE[application.stage];
    if (!stage) return;
    const updated = await updateHrxApplicationStage(application.application_id, stage);
    if (updated.kind === "data") setRefreshKey((key) => key + 1);
    else setResult({ kind: "error" });
  }

  let body;
  if (result === null) {
    body = <div className="live-data-state live-data-loading">구성원 등록 정보를 불러오는 중입니다</div>;
  } else if (result.kind === "error") {
    body = <div className="live-data-state live-data-error">구성원 등록 정보를 불러오지 못했습니다.</div>;
  } else {
    body = (
      <>
        <DataTable
          columns={["공고", "제목", "상태", "모집"]}
          rows={result.job_openings.map((job, index) => [`공고 ${index + 1}`, job.title, stageLabel(job.state), job.position_count ? "모집 중" : "확인 필요"])}
        />
        <DataTable
          columns={["면접", "지원", "상태", "일정"]}
          rows={result.interviews.map((interview, index) => [
            `면접 ${index + 1}`,
            `지원 ${index + 1}`,
            stageLabel(interview.state),
            interview.schedule_source_ref ? "등록됨" : "미등록"
          ])}
        />
        <DataTable
          columns={["합격자", "지원", "상태", "문서"]}
          rows={result.offers.map((offer, index) => [
            `합격자 ${index + 1}`,
            `지원 ${index + 1}`,
            stageLabel(offer.state),
            offer.document_ref ? "준비됨" : "미등록"
          ])}
        />
        <div className="approval-queue">
          {result.applications.map((application, index) => (
            <div className="approval-row" key={application.application_id}>
              <div>
                <strong>{`지원 ${index + 1}`}</strong>
                <span>지원자 / 구성원 등록</span>
              </div>
              <em>{stageLabel(application.stage)}</em>
              <button className="secondary-button" disabled={!NEXT_STAGE[application.stage]} onClick={() => advance(application)}>
                <GitBranch size={14} />
                다음 단계
              </button>
            </div>
          ))}
        </div>
      </>
    );
  }

  return (
    <Panel id="people-recruiting" className="people-panel span-2" title="구성원 등록" meta="채용 연동">
      {body}
    </Panel>
  );
}
