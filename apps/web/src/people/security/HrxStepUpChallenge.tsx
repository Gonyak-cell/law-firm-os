import React from "react";
import { KeyRound, RefreshCw, ShieldCheck } from "lucide-react";

export function HrxStepUpChallenge({ action = "hrx.audit.read", reason = "HRX_STEP_UP_REQUIRED", onRetry }) {
  return (
    <div className="hrx-step-up-challenge" data-hrx-step-up-challenge="true">
      <div className="hrx-step-up-icon">
        <KeyRound size={18} />
      </div>
      <div className="hrx-step-up-copy">
        <strong>Fresh step-up required</strong>
        <span>{action}</span>
        <small>{reason}</small>
      </div>
      <div className="hrx-step-up-actions">
        <span>
          <ShieldCheck size={13} />
          Trusted session only
        </span>
        <button className="secondary-button" type="button" onClick={onRetry}>
          <RefreshCw size={14} />
          Recheck
        </button>
      </div>
    </div>
  );
}
