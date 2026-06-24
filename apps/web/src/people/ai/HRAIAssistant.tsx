import React from "react";
import { useEffect, useState } from "react";
import { Bot, ClipboardCheck, Send } from "lucide-react";
import { DataTable, Panel } from "../../components/primitives.jsx";
import { askHrxAiAssistant, fetchHrxAiReviews } from "../hrxApiClient.ts";

function aiOutcomeLabel(value) {
  const normalized = String(value ?? "").toLowerCase();
  if (normalized.includes("blocked") || normalized.includes("denied")) return "담당자 검토 필요";
  if (normalized.includes("review")) return "검토 중";
  if (normalized.includes("answer") || normalized.includes("advisory")) return "답변 준비됨";
  return "검토 대기";
}

function riskLabel(value) {
  const normalized = String(value ?? "").toLowerCase();
  if (normalized.includes("high")) return "높음";
  if (normalized.includes("medium")) return "보통";
  if (normalized.includes("low")) return "낮음";
  return "확인 필요";
}

function reviewStateLabel(value) {
  const normalized = String(value ?? "").toLowerCase();
  if (normalized.includes("approved")) return "승인됨";
  if (normalized.includes("rejected")) return "반려";
  if (normalized.includes("blocked")) return "검토 필요";
  if (normalized.includes("pending")) return "대기";
  if (normalized.includes("review")) return "검토 중";
  return "확인 필요";
}

function reviewReasonLabel(value) {
  const normalized = String(value ?? "").toLowerCase();
  if (normalized.includes("final") || normalized.includes("decision")) return "최종 판단은 담당자가 확인합니다.";
  if (normalized.includes("policy")) return "정책 확인이 필요합니다.";
  if (normalized.includes("sensitive") || normalized.includes("risk")) return "민감한 항목은 담당자 검토 후 처리합니다.";
  if (normalized.includes("missing")) return "추가 확인이 필요합니다.";
  return "담당자 검토가 필요합니다.";
}

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
    ? reviews.reviews.map((item, index) => [
        `검토 ${index + 1}`,
        riskLabel(item.risk_level),
        reviewStateLabel(item.state),
        reviewReasonLabel(item.reason)
      ])
    : [];

  return (
    <Panel className="people-panel span-2" title="인사 문의" meta="담당자 검토">
      <div className="people-panel-kicker">
        <Bot size={15} />
        민감한 결정은 담당자 검토 후 처리합니다.
      </div>
      <div className="approval-actions hrx-ai-actions">
        <button className="secondary-button" onClick={askAdvisory}>
          <Send size={14} />
          문의
        </button>
        <button className="secondary-button" onClick={askBlockedDecision}>
          <ClipboardCheck size={14} />
          검토
        </button>
      </div>
      {result === null ? (
        <div className="live-data-state live-data-loading">검토된 답변을 준비할 수 있습니다.</div>
      ) : result.kind === "error" ? (
        <div className="live-data-state live-data-error">답변을 준비할 수 없습니다.</div>
      ) : (
        <div className="hrx-ai-result">
          <strong>{aiOutcomeLabel(result.outcome)}</strong>
          <span>검토 상태: {reviewStateLabel(result.review_item?.state)}</span>
          <span>{reviewReasonLabel(result.review_item ? result.review_item.reason : result.answer?.reason)}</span>
          <em>{result.citations.length ? `참고 자료 ${result.citations.length}건 확인` : "검토 대기"}</em>
        </div>
      )}
      <DataTable columns={["검토", "위험", "상태", "사유"]} rows={reviewRows} />
    </Panel>
  );
}
