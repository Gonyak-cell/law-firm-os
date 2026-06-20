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
    body = <div className="live-data-state live-data-loading">Loading recruiting pipeline</div>;
  } else if (result.kind === "error") {
    body = <div className="live-data-state live-data-error">Recruiting API failed. Pipeline updates are not staged locally.</div>;
  } else {
    body = (
      <>
        <DataTable
          columns={["Job", "Title", "State", "Positions"]}
          rows={result.job_openings.map((job) => [job.job_opening_id, job.title, job.state, job.position_count])}
        />
        <DataTable
          columns={["Interview", "Application", "State", "Schedule Ref"]}
          rows={result.interviews.map((interview) => [
            interview.interview_id,
            interview.application_id,
            interview.state,
            interview.schedule_source_ref
          ])}
        />
        <DataTable
          columns={["Offer", "Application", "State", "Document Ref"]}
          rows={result.offers.map((offer) => [
            offer.offer_id,
            offer.application_id,
            offer.state,
            offer.document_ref
          ])}
        />
        <div className="approval-queue">
          {result.applications.map((application) => (
            <div className="approval-row" key={application.application_id}>
              <div>
                <strong>{application.application_id}</strong>
                <span>{application.candidate_id} / {application.job_opening_id}</span>
              </div>
              <em>{application.stage}</em>
              <button className="secondary-button" disabled={!NEXT_STAGE[application.stage]} onClick={() => advance(application)}>
                <GitBranch size={14} />
                Advance
              </button>
            </div>
          ))}
        </div>
      </>
    );
  }

  return (
    <Panel className="people-panel span-2" title="Recruiting Pipeline" meta="/api/hrx/recruiting/pipeline">
      {body}
    </Panel>
  );
}
