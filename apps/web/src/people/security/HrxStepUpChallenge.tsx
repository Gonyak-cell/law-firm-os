import React, { useState } from "react";
import { KeyRound, RefreshCw, ShieldCheck } from "lucide-react";
import { requestHrxStepUpSession } from "../hrxApiClient.ts";
import type { HrxStepUpPurpose } from "../hrxApiClient.ts";

type HrxStepUpChallengeProps = {
  onRetry?: () => void;
  onVerified?: () => void;
  purpose?: HrxStepUpPurpose;
};

const PURPOSE_MESSAGE: Partial<Record<HrxStepUpPurpose, string>> = Object.freeze({
  payroll_export_review: "급여 자료를 검토하려면 6자리 확인 코드를 입력하세요.",
  payroll_payment_processing: "급여 지급을 처리하려면 6자리 확인 코드를 입력하세요.",
  payroll_filing_processing: "급여 신고를 처리하려면 6자리 확인 코드를 입력하세요.",
  payroll_statement_self_service: "내 급여명세서를 확인하려면 6자리 확인 코드를 입력하세요.",
  payroll_year_end_processing: "연말정산 자료를 처리하려면 6자리 확인 코드를 입력하세요.",
  payroll_year_end_review: "연말정산 검토를 승인하려면 6자리 확인 코드를 입력하세요.",
  compensation_access: "급여 기록을 연결하려면 6자리 확인 코드를 입력하세요.",
});

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
        <span>{purpose ? PURPOSE_MESSAGE[purpose] ?? "인사기록을 변경하려면 6자리 확인 코드를 입력하세요." : "인사기록을 보려면 다시 확인하세요."}</span>
        {error && <small role="alert">{error}</small>}
      </div>
      <div className="hrx-step-up-actions">
        {purpose ? (
          <div className="hrx-step-up-form" role="group">
            <label>
              <span className="sr-only">6자리 확인 코드</span>
              <input aria-label="6자리 확인 코드" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} />
            </label>
            <button type="button" className="secondary-button" disabled={busy || code.length !== 6} onClick={verify}>
              <ShieldCheck size={14} />
              확인
            </button>
          </div>
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
