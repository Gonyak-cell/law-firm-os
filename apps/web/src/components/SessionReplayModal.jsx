import React from "react";
import { X } from "lucide-react";

export function SessionReplayModal({ onClose }) {
  return (
    <div className="replay-detail">
      <header className="replay-detail-top">
        <h2>활동 기록</h2>
        <button className="icon-button" onClick={onClose} aria-label="닫기">
          <X size={16} />
        </button>
      </header>
      <div className="live-data-state live-data-empty">
        <strong>표시할 활동 기록이 없습니다</strong>
        권한이 있는 업무 기록만 이곳에 표시됩니다.
      </div>
    </div>
  );
}
