import React from "react";
import { useEffect, useState } from "react";
import { Bot, ClipboardCheck, Send } from "lucide-react";
import { DataTable, Panel } from "../../components/primitives.jsx";
import { askHrxAiAssistant, fetchHrxAiReviews } from "../hrxApiClient.ts";

export function HRAIAssistant() {
  const [result, setResult] = useState(null);
  const [reviews, setReviews] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchHrxAiReviews().then((next) => {
      if (!cancelled) setReviews(next);
    });
    return () => {
      cancelled = true;
    };
  }, [result]);

  async function askAdvisory() {
    setResult(null);
    const next = await askHrxAiAssistant("Summarize leave policy guidance for a manager", { decision_mode: "advisory" });
    setResult(next);
  }

  async function askBlockedDecision() {
    setResult(null);
    const next = await askHrxAiAssistant("Make the final hire decision for this candidate", {
      decision_mode: "final",
      decision_domain: "hire",
      final_decision: true
    });
    setResult(next);
  }

  const reviewRows = reviews?.kind === "data"
    ? reviews.reviews.map((item) => [item.review_id, item.risk_level, item.state, item.reason])
    : [];

  return (
    <Panel className="people-panel span-2" title="HR AI Assistant" meta="/api/hrx/ai/assistant">
      <div className="people-panel-kicker">
        <Bot size={15} />
        Source-grounded assistant with human review queue
      </div>
      <div className="approval-actions hrx-ai-actions">
        <button className="secondary-button" onClick={askAdvisory}>
          <Send size={14} />
          Ask
        </button>
        <button className="secondary-button" onClick={askBlockedDecision}>
          <ClipboardCheck size={14} />
          Review
        </button>
      </div>
      {result === null ? (
        <div className="live-data-state live-data-loading">AI route is ready; no static response is rendered.</div>
      ) : result.kind === "error" ? (
        <div className="live-data-state live-data-error">AI API failed. No local assistant fallback is rendered.</div>
      ) : (
        <div className="hrx-ai-result">
          <strong>{result.outcome}</strong>
          <span>{result.review_item ? result.review_item.reason : result.answer?.reason ?? "cited_answer"}</span>
          <em>{result.citations.map((citation) => citation.source_ref).join(", ") || "review queue"}</em>
        </div>
      )}
      <DataTable columns={["Review", "Risk", "State", "Reason"]} rows={reviewRows} />
    </Panel>
  );
}
