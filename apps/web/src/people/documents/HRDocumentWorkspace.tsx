import React from "react";
import { useEffect, useState } from "react";
import { FileText } from "lucide-react";
import { DataTable, Panel } from "../../components/primitives.jsx";
import { fetchHrxDocuments } from "../hrxApiClient.ts";

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
    body = <div className="live-data-state live-data-empty">Select an employee to load HR document metadata.</div>;
  } else if (result === null) {
    body = <div className="live-data-state live-data-loading">Loading HR document metadata</div>;
  } else if (result.kind === "error") {
    body = <div className="live-data-state live-data-error">Document API failed. No document bodies are cached locally.</div>;
  } else if (result.documents.length === 0) {
    body = <div className="live-data-state live-data-empty">No document metadata returned.</div>;
  } else {
    body = (
      <DataTable
        columns={["Document", "Type", "Title", "Source Ref"]}
        rows={result.documents.map((document) => [
          document.document_id,
          document.document_type,
          document.title ?? "Untitled",
          document.source_ref
        ])}
      />
    );
  }

  return (
    <Panel className="people-panel span-2" title="HR Documents" meta="Metadata only">
      <div className="people-panel-kicker">
        <FileText size={15} />
        source_ref rendered, document body omitted
      </div>
      {body}
    </Panel>
  );
}
