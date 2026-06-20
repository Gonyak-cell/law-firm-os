import React from "react";
import { useEffect, useState } from "react";
import { BadgeCheck } from "lucide-react";
import { DataTable, Panel, Property } from "../components/primitives.jsx";
import { fetchCandidatePortal } from "../people/hrxApiClient.ts";

export function CandidatePortal({ candidateId = "cand-001" }) {
  const [result, setResult] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setResult(null);
    fetchCandidatePortal(candidateId).then((next) => {
      if (!cancelled) setResult(next);
    });
    return () => {
      cancelled = true;
    };
  }, [candidateId]);

  let body;
  if (result === null) {
    body = <div className="live-data-state live-data-loading">Loading candidate-scoped portal data</div>;
  } else if (result.kind === "error") {
    body = <div className="live-data-state live-data-error">Candidate portal API failed. No candidate mock fallback is rendered.</div>;
  } else {
    body = (
      <>
        <div className="property-grid people-profile-grid">
          <Property label="Candidate" value={result.candidate.legal_name} />
          <Property label="Subject Type" value={result.candidate.data_subject_type} />
          <Property label="Source" value={result.candidate.source_ref} />
          <Property label="Resume Ref" value={result.candidate.resume_ref} />
        </div>
        <DataTable
          columns={["Application", "Job", "Stage", "Reason"]}
          rows={result.applications.map((application) => [
            application.application_id,
            application.job_opening_id,
            application.stage,
            application.stage_reason ?? "Scoped status"
          ])}
        />
        <DataTable
          columns={["Document", "Type", "Source Ref", "Body"]}
          rows={result.documents.map((document) => [document.document_id, document.document_type, document.source_ref, "Omitted"])}
        />
      </>
    );
  }

  return (
    <Panel className="people-panel span-2" title="Candidate Portal" meta="/api/hrx/candidate/portal">
      <div className="people-panel-kicker">
        <BadgeCheck size={15} />
        Candidate-scoped application, status, and document metadata
      </div>
      {body}
    </Panel>
  );
}
