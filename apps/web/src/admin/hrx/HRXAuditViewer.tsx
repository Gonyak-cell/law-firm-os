import React from "react";
import { useEffect, useState } from "react";
import { ClipboardList } from "lucide-react";
import { DataTable, Panel } from "../../components/primitives.jsx";
import { fetchHrxAuditEvents } from "../../people/hrxApiClient.ts";

export function HRXAuditViewer() {
  const [result, setResult] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setResult(null);
    fetchHrxAuditEvents().then((next) => {
      if (!cancelled) setResult(next);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  let body;
  if (result === null) {
    body = <div className="live-data-state live-data-loading">Loading tenant-scoped HRX audit events</div>;
  } else if (result.kind === "error") {
    body = <div className="live-data-state live-data-error">Audit API failed. No local audit fallback is rendered.</div>;
  } else {
    body = (
      <DataTable
        columns={["Event", "Actor", "Action", "Object"]}
        rows={result.events.map((event) => [event.event_id, event.actor_id, event.action, `${event.object_type}:${event.object_id}`])}
      />
    );
  }

  return (
    <Panel className="people-panel span-2" title="HRX Audit Viewer" meta="/api/hrx/audit">
      <div className="people-panel-kicker">
        <ClipboardList size={15} />
        Tenant-scoped audit events only
      </div>
      {body}
    </Panel>
  );
}
