import React from "react";
import { useEffect, useState } from "react";
import { RefreshCw, ShieldCheck, Sparkles } from "lucide-react";
import { PRODUCT_BRAND } from "../brand/brand";
import { fetchAiReviewQueue } from "../data/apiClient.js";
import { CompactTable, Panel } from "./primitives.jsx";

const AI_PERMISSION_REF = "ui_cmp_g9_ai_live";
const AI_AUDIT_HINT_REF = "ui_cmp_g9_ai_probe";

function reviewStatusLabel(value) {
  const normalized = String(value ?? "").toLowerCase();
  if (normalized.includes("approved")) return "승인됨";
  if (normalized.includes("rejected")) return "반려";
  if (normalized.includes("completed")) return "완료";
  if (normalized.includes("pending")) return "대기";
  if (normalized.includes("review")) return "검토 중";
  return "확인 필요";
}

function reviewerLabel(value) {
  const normalized = String(value ?? "").toLowerCase();
  if (normalized.includes("partner")) return "파트너";
  if (normalized.includes("manager")) return "관리자";
  if (normalized.includes("admin")) return "관리 담당자";
  if (normalized.includes("lawyer") || normalized.includes("attorney")) return "변호사";
  return "담당자";
}

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
  let body;
  if (result === null) body = <div className="live-data-state live-data-loading"><strong>문의 내역 불러오는 중</strong> 검토 요청을 확인하고 있습니다.</div>;
  else if (result.kind === "error") body = <div className="live-data-state live-data-error"><strong>문의 내역을 불러올 수 없습니다</strong> 새로고침하거나 연결 상태를 확인하세요.</div>;
  else if (result.uiState === "denied") body = <div className="live-data-state live-data-denied"><strong>접근할 수 없습니다</strong> 현재 권한으로는 이 문의를 볼 수 없습니다.</div>;
  else if (result.uiState === "review_required" || result.outcome === "review_required") body = <div className="live-data-state live-data-review"><strong>검토가 필요합니다</strong> 담당자 확인 후 답변을 볼 수 있습니다.</div>;
  else body = (
    <div className="ai-runtime-stack">
      <div className="intake-safe-strip">
        <ShieldCheck size={15} />
        <span>민감한 근거와 내부 메모는 승인된 담당자에게만 표시됩니다.</span>
      </div>
      <CompactTable
        columns={["요청", "답변", "상태", "담당"]}
        rows={items.map((item, index) => [
          `검토 ${index + 1}`,
          `답변 ${index + 1}`,
          reviewStatusLabel(item.status),
          reviewerLabel(item.reviewer_role)
        ])}
      />
    </div>
  );
  return (
    <Panel title="검토 요청" meta="담당자 확인" className="ai-runtime-panel" data-cmp-g9-ai-runtime="true">
      <div className="analytics-runtime-actions">
        <button className="secondary-button" onClick={() => setRefreshToken((value) => value + 1)}>
          <RefreshCw size={15} />
          새로고침
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
        <p>{`${PRODUCT_BRAND} 업무 질문과 담당자 검토가 필요한 답변을 확인합니다.`}</p>
      </div>
      <AiRuntimePanel liveCtx={liveCtx} />
      <Panel title="답변" meta="검토 후 표시">
        <div className="live-data-state live-data-empty">
          <strong>표시할 답변이 없습니다</strong>
          담당자 검토가 끝난 답변만 이곳에 표시됩니다.
        </div>
      </Panel>
      <label className="ask-input">
        <input placeholder={labels.search} />
        <button className="primary-button">
          <Sparkles size={15} />
          문의
        </button>
      </label>
      <div className="cohort-replay-grid">
        <Panel title="그룹" meta="저장된 대상">
          <CompactTable columns={["그룹", "사용자", "상태"]} rows={[]} />
        </Panel>
        <Panel title="활동 기록" meta="최근 업무">
          <div className="live-data-state live-data-empty">
            <strong>표시할 활동 기록이 없습니다</strong>
            권한이 있는 활동 기록만 이곳에 표시됩니다.
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
        <p>업무 질문을 남기고 검토된 답변을 확인합니다.</p>
      </div>
      <Panel title="답변" meta="검토 후 표시">
        <div className="live-data-state live-data-empty">
          <strong>표시할 답변이 없습니다</strong>
          담당자 검토가 끝난 답변만 이곳에 표시됩니다.
        </div>
      </Panel>
      <label className="ask-input">
        <input placeholder={labels.search} />
        <button className="primary-button">
          <Sparkles size={15} />
          문의
        </button>
      </label>
    </section>
  );
}
