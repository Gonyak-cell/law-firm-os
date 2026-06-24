import React from "react";
import { KeyRound, RefreshCw, ShieldCheck } from "lucide-react";

export function HrxStepUpChallenge({ onRetry }) {
  return (
    <div className="hrx-step-up-challenge" data-hrx-step-up-challenge="true">
      <div className="hrx-step-up-icon">
        <KeyRound size={18} />
      </div>
      <div className="hrx-step-up-copy">
        <strong>추가 확인이 필요합니다</strong>
        <span>활동 기록을 보려면 다시 확인해주세요.</span>
        <small>확인 후 권한이 있는 정보만 표시됩니다.</small>
      </div>
      <div className="hrx-step-up-actions">
        <span>
          <ShieldCheck size={13} />
          권한 확인
        </span>
        <button className="secondary-button" type="button" onClick={onRetry}>
          <RefreshCw size={14} />
          다시 확인
        </button>
      </div>
    </div>
  );
}
