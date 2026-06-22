import React from "react";
import { useEffect, useMemo, useState } from "react";
import { RefreshCw, ShieldCheck, Sparkles } from "lucide-react";
import { PRODUCT_BRAND } from "../brand/brand";
import { fetchAiReviewQueue } from "../data/apiClient.js";
import { CompactTable, Panel } from "./primitives.jsx";

const AI_PERMISSION_REF = "ui_cmp_g9_ai_live";
const AI_AUDIT_HINT_REF = "ui_cmp_g9_ai_probe";

function AiRuntimePanel({ liveCtx = "allow" }) {
  const [result, setResult] = useState(null);
  const [refreshToken, setRefreshToken] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setResult(null);
    fetchAiReviewQueue({ ctx: liveCtx, permissionRef: AI_PERMISSION_REF, auditHintRef: AI_AUDIT_HINT_REF }).then((next) => {
      if (!cancelled) setResult(next);
    });
    return () => {
      cancelled = true;
    };
  }, [liveCtx, refreshToken]);
  const items = result?.kind === "data" ? result.items : [];
  const metrics = useMemo(() => ({ open: items.filter((item) => item.status === "open").length }), [items]);
  let body;
  if (result === null) body = <div className="live-data-state live-data-loading"><strong>Loading AI review</strong> Reading review queue from the API.</div>;
  else if (result.kind === "error") body = <div className="live-data-state live-data-error"><strong>AI API unavailable</strong> Start the Law Firm OS API and reload.</div>;
  else if (result.uiState === "denied") body = <div className="live-data-state live-data-denied"><strong>Access denied</strong> The permission gate blocked this AI request.</div>;
  else if (result.uiState === "review_required" || result.outcome === "review_required") body = <div className="live-data-state live-data-review"><strong>Review required</strong> This AI queue request needs review.</div>;
  else body = (
    <div className="ai-runtime-stack">
      <div className="intake-safe-strip">
        <ShieldCheck size={15} />
        <span>Permission-before-AI is enforced; outputs stay in human review and RAG evidence omits raw payloads.</span>
      </div>
      <CompactTable
        columns={["Task", "Output", "Status", "Reviewer"]}
        rows={items.map((item) => [item.review_task_id, item.ai_output_id, item.status, item.reviewer_role])}
      />
    </div>
  );
  return (
    <Panel title="CMP-G9 AI Review Queue" meta="/api/ai/review-queue" className="ai-runtime-panel" data-cmp-g9-ai-runtime="true">
      <div className="analytics-runtime-actions">
        <strong>{metrics.open} open reviews</strong>
        <span>raw prompt/output omitted</span>
        <button className="secondary-button" onClick={() => setRefreshToken((value) => value + 1)}>
          <RefreshCw size={15} />
          Refresh
        </button>
      </div>
      {body}
    </Panel>
  );
}

export function AskSurface({ labels, variant, liveCtx = "allow" }) {
  if (variant === "retention") {
    return <AskRetentionSurface labels={labels} />;
  }

  return (
    <section className="surface ask-surface">
      <div className="ask-header">
        <Sparkles size={22} />
        <h1>{labels.askTitle}</h1>
        <p>{`Guidance, answers, cohorts, and replay context for your ${PRODUCT_BRAND} workspace.`}</p>
      </div>
      <AiRuntimePanel liveCtx={liveCtx} />
      <Panel title="Answer" meta="Generated chart response">
        <div className="live-data-state live-data-empty">
          <strong>No generated answer</strong>
          Server-reviewed AI output is shown only after the AI review queue returns an approved response.
        </div>
      </Panel>
      <label className="ask-input">
        <input placeholder={labels.search} />
        <button className="primary-button">
          <Sparkles size={15} />
          Ask
        </button>
      </label>
      <div className="cohort-replay-grid">
        <Panel title="Cohorts" meta="Saved user groups">
          <CompactTable columns={["Cohort", "Users", "Sync"]} rows={[]} />
        </Panel>
        <Panel title="Session Replay" meta="Recent workspace sessions">
          <div className="live-data-state live-data-empty">
            <strong>No local replay rows</strong>
            Session replay requires a live, permission-checked event stream.
          </div>
        </Panel>
      </div>
    </section>
  );
}

export function AskRetentionSurface({ labels }) {
  return (
    <section className="surface ask-surface">
      <div className="ask-header compact">
        <Sparkles size={22} />
        <h1>{labels.askTitle}</h1>
        <p>Ask a question, inspect the generated chart, and continue with follow-up prompts.</p>
      </div>
      <Panel title="Answer" meta="Generated retention chart">
        <div className="live-data-state live-data-empty">
          <strong>No generated retention chart</strong>
          Retention answers require a live analytics response.
        </div>
      </Panel>
      <label className="ask-input">
        <input placeholder={labels.search} />
        <button className="primary-button">
          <Sparkles size={15} />
          Ask
        </button>
      </label>
    </section>
  );
}
