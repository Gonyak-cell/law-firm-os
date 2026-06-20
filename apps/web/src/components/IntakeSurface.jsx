import React from "react";
import { useEffect, useMemo, useState } from "react";
import { ClipboardCheck, RefreshCw, ShieldCheck } from "lucide-react";
import { fetchCrmOpportunities, fetchIntakeRequests } from "../data/apiClient.js";
import { DataTable, MetricCard, PageHeader, Panel } from "./primitives.jsx";

const CRM_INTAKE_PERMISSION_REF = "ui_cmp_g6_crm_intake_live";
const CRM_INTAKE_AUDIT_HINT_REF = "ui_cmp_g6_crm_intake_probe";

function opportunityRows(items) {
  return items.map((item) => [
    item.opportunity_id,
    item.display_name,
    item.stage,
    item.party_id,
    item.direct_matter_reference_included === false ? "blocked" : "review"
  ]);
}

function intakeRows(items) {
  return items.map((item) => [
    item.intake_request_id,
    item.opportunity_id,
    item.status,
    item.requesting_party_id,
    item.creates_matter === false ? "clearance gate" : "review"
  ]);
}

function LiveState({ result, noun }) {
  if (result === null) {
    return (
      <div className="live-data-state live-data-loading">
        <strong>Loading {noun}</strong>
        Reading CRM/Intake runtime data from the API.
      </div>
    );
  }
  if (result.kind === "error") {
    return (
      <div className="live-data-state live-data-error">
        <strong>{noun} API unavailable</strong>
        Start the Law Firm OS API and reload this live surface.
      </div>
    );
  }
  if (result.uiState === "denied") {
    return (
      <div className="live-data-state live-data-denied">
        <strong>Access denied</strong>
        The permission gate blocked this CRM/Intake request.
      </div>
    );
  }
  if (result.uiState === "review_required" || result.outcome === "review_required") {
    return (
      <div className="live-data-state live-data-review">
        <strong>Review required</strong>
        This CRM/Intake request requires review before rows can be displayed.
      </div>
    );
  }
  if (result.items.length === 0) {
    return (
      <div className="live-data-state live-data-empty">
        <strong>No {noun}</strong>
        The live query returned no rows.
      </div>
    );
  }
  return null;
}

export function IntakeSurface({ labels, liveCtx = "allow" }) {
  const [opportunities, setOpportunities] = useState(null);
  const [requests, setRequests] = useState(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setOpportunities(null);
    setRequests(null);
    Promise.all([
      fetchCrmOpportunities({
        ctx: liveCtx,
        permissionRef: CRM_INTAKE_PERMISSION_REF,
        auditHintRef: CRM_INTAKE_AUDIT_HINT_REF
      }),
      fetchIntakeRequests({
        ctx: liveCtx,
        permissionRef: CRM_INTAKE_PERMISSION_REF,
        auditHintRef: CRM_INTAKE_AUDIT_HINT_REF
      })
    ]).then(([nextOpportunities, nextRequests]) => {
      if (!cancelled) {
        setOpportunities(nextOpportunities);
        setRequests(nextRequests);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [liveCtx, refreshToken]);

  const opportunityItems = opportunities?.kind === "data" ? opportunities.items : [];
  const requestItems = requests?.kind === "data" ? requests.items : [];
  const metrics = useMemo(
    () => ({
      opportunities: opportunityItems.length,
      intake: requestItems.length,
      gated: requestItems.filter((item) => item.creates_matter === false).length
    }),
    [opportunityItems, requestItems]
  );

  const opportunityState = <LiveState result={opportunities} noun="opportunities" />;
  const requestState = <LiveState result={requests} noun="intake requests" />;

  return (
    <section className="surface stack intake-surface" data-cmp-g6-intake-surface="true">
      <PageHeader
        eyebrow="CMP-G6"
        title={labels.intakeTitle}
        subtitle="CRM opportunity to Intake clearance runtime with conflict gate and no direct Matter conversion."
        actions={
          <button className="secondary-button" onClick={() => setRefreshToken((value) => value + 1)}>
            <RefreshCw size={15} />
            Refresh
          </button>
        }
      />
      <div className="clients-metric-grid">
        <MetricCard label="Opportunities" value={metrics.opportunities} delta="CRM rows" tone="blue" />
        <MetricCard label="Intake" value={metrics.intake} delta="clearance queue" tone="green" />
        <MetricCard label="Matter gate" value={metrics.gated} delta="direct open blocked" tone="purple" />
      </div>
      <div className="intake-runtime-grid">
        <Panel className="span-2 intake-panel" title="Opportunity Pipeline" meta="/api/crm/opportunities">
          {opportunityState || (
            <div className="intake-live-stack">
              <div className="intake-safe-strip">
                <ShieldCheck size={15} />
                <span>Opportunity rows can hand off only to IntakeRequest; Matter creation remains blocked.</span>
              </div>
              <DataTable
                columns={["Opportunity", "Name", "Stage", "Party", "Matter shortcut"]}
                rows={opportunityRows(opportunityItems)}
              />
            </div>
          )}
        </Panel>
        <Panel className="span-2 intake-panel" title="Intake Clearance" meta="/api/intake/requests">
          {requestState || (
            <div className="intake-live-stack">
              <DataTable
                columns={["Request", "Opportunity", "Status", "Requesting party", "Gate"]}
                rows={intakeRows(requestItems)}
              />
            </div>
          )}
        </Panel>
        <Panel className="intake-panel" title="Conflict Boundary" meta="memo ACL">
          <div className="matter-boundary-card">
            <ClipboardCheck size={20} />
            <strong>Conflict memo ACL active</strong>
            <span>Memo body and raw query content stay outside list projections.</span>
          </div>
        </Panel>
        <Panel className="intake-panel" title="Release Boundary" meta="owner gated">
          <div className="matter-boundary-card">
            <ShieldCheck size={20} />
            <strong>R4 runtime write-ready only</strong>
            <span>Go-live and production-ready claims still require owner approval and release gates.</span>
          </div>
        </Panel>
      </div>
    </section>
  );
}
