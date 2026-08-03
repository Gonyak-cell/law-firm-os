import React from "react";
import { AlertTriangle, LockKeyhole, RotateCcw } from "lucide-react";

function withKoreanParticle(noun, consonantParticle, vowelParticle) {
  const lastCharacter = [...String(noun).trim()].at(-1);
  if (!lastCharacter) return noun;
  const syllableIndex = lastCharacter.charCodeAt(0) - 0xac00;
  const hasFinalConsonant = syllableIndex >= 0 && syllableIndex < 11172
    ? syllableIndex % 28 !== 0
    : true;
  return `${noun}${hasFinalConsonant ? consonantParticle : vowelParticle}`;
}

export function MatterOperationsState({ result, noun, empty, onRetry, children }) {
  if (result === null || result === undefined || result?.kind === "loading") {
    return (
      <div className="matter-ops-state live-data-state live-data-loading" role="status" aria-live="polite" data-matter-ops-state="loading">
        <strong>{withKoreanParticle(noun, "을", "를")} 불러오는 중입니다</strong>
      </div>
    );
  }
  if (result?.uiState === "denied") {
    return (
      <div className="matter-ops-state live-data-state live-data-denied" role="status" data-matter-ops-state="denied">
        <LockKeyhole size={18} aria-hidden="true" />
        <strong>{noun} 접근 권한이 없습니다</strong>
        <span>권한이 있는 담당자에게 확인해 주세요.</span>
      </div>
    );
  }
  if (result?.uiState === "blocked" || result?.uiState === "review_required" || result?.kind === "blocked" || result?.kind === "guarded") {
    return (
      <div className="matter-ops-state live-data-state live-data-review" role="status" data-matter-ops-state="blocked">
        <AlertTriangle size={18} aria-hidden="true" />
        <strong>{noun} 처리가 막혀 있습니다</strong>
        <span>{result?.message ?? result?.error?.message ?? "필수 정보와 선행 작업을 확인해 주세요."}</span>
      </div>
    );
  }
  if (result?.kind === "error") {
    return (
      <div className="matter-ops-state live-data-state live-data-error" role="alert" data-matter-ops-state="error">
        <AlertTriangle size={18} aria-hidden="true" />
        <strong>{noun}을 불러오지 못했습니다</strong>
        <span>{result?.message ?? result?.error?.message ?? "연결 상태를 확인한 뒤 다시 시도해 주세요."}</span>
        {onRetry && (
          <button type="button" className="secondary-button" onClick={onRetry}>
            <RotateCcw size={15} aria-hidden="true" />
            다시 시도
          </button>
        )}
      </div>
    );
  }
  if (empty || result?.kind === "empty") {
    return (
      <div className="matter-ops-state live-data-state live-data-empty" role="status" data-matter-ops-state="empty">
        <strong>{withKoreanParticle(noun, "이", "가")} 없습니다</strong>
        <span>현재 조건에 맞는 기록이 없습니다.</span>
      </div>
    );
  }
  return children;
}
