import React, { useState } from "react";
import { KeyRound, RefreshCw, ShieldCheck } from "lucide-react";
import { requestHrxStepUpSession } from "../hrxApiClient.ts";

type HrxStepUpChallengeProps = {
  onRetry?: () => void;
  onVerified?: () => void;
  purpose?: "leave_accrual_execute" | "leave_ledger_adjustment" | "leave_termination_settlement";
};

export function HrxStepUpChallenge({ onRetry, onVerified, purpose }: HrxStepUpChallengeProps) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function verify(event: { preventDefault(): void }) {
    event.preventDefault();
    if (!purpose) return;
    setBusy(true);
    setError("");
    const result = await requestHrxStepUpSession(purpose, code);
    setBusy(false);
    if (result.kind !== "data") {
      setError("확인 코드를 다시 확인하세요.");
      return;
    }
    setCode("");
    onVerified?.();
  }

  return (
    <div className="hrx-step-up-challenge" data-hrx-step-up-challenge="true">
      <div className="hrx-step-up-icon">
        <KeyRound size={18} />
      </div>
      <div className="hrx-step-up-copy">
        <strong>추가 확인이 필요합니다</strong>
        <span>{purpose ? "휴가 원장이나 퇴사 정산을 변경하려면 6자리 확인 코드를 입력하세요." : "인사기록을 보려면 다시 확인하세요."}</span>
        {error && <small role="alert">{error}</small>}
      </div>
      <div className="hrx-step-up-actions">
        {purpose ? (
          <form className="hrx-step-up-form" onSubmit={verify}>
            <label>
              <span className="sr-only">6자리 확인 코드</span>
              <input aria-label="6자리 확인 코드" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} />
            </label>
            <button className="secondary-button" disabled={busy || code.length !== 6}>
              <ShieldCheck size={14} />
              확인
            </button>
          </form>
        ) : (
          <>
            <span><ShieldCheck size={13} />권한 확인</span>
            <button className="secondary-button" type="button" onClick={onRetry}>
              <RefreshCw size={14} />
              다시 확인
            </button>
          </>
        )}
      </div>
    </div>
  );
}
