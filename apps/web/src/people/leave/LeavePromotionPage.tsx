import React, { useEffect, useMemo, useState } from "react";
import { CalendarClock, FileCheck2, RefreshCw, ShieldCheck } from "lucide-react";
import { Panel } from "../../components/primitives.jsx";
import {
  createHrxLeavePromotionCampaign,
  fetchHrxLeavePromotionWorkspace,
  issueHrxLeavePromotionNotice,
  previewHrxLeavePromotion,
  recordHrxLeavePromotionEvidence,
  recordHrxLeavePromotionResponse
} from "../hrxApiClient.ts";

type Row = Record<string, unknown>;

function text(row: Row | null | undefined, field: string) {
  const value = row?.[field];
  return typeof value === "string" ? value : value === null || value === undefined ? "" : String(value);
}

function number(row: Row | null | undefined, field: string) {
  const value = Number(row?.[field]);
  return Number.isFinite(value) ? value : 0;
}

function localDate() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

function dateTime(value: unknown) {
  if (typeof value !== "string" || !value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? value : new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "medium", timeStyle: "short" }).format(date);
}

const STATE_LABELS: Record<string, string> = {
  first_notice_pending: "1차 문서 생성 전",
  first_notice_issued: "1차 전달 확인 중",
  first_delivery_failed: "1차 전달 실패",
  awaiting_employee_response: "직원 응답 대기",
  employee_responded: "직원 응답 기록",
  second_notice_issued: "2차 전달 확인 중",
  second_delivery_failed: "2차 전달 실패",
  second_notice_delivered: "2차 열람 확인 대기",
  second_notice_viewed: "2차 증거 확인"
};

export function LeavePromotionPage() {
  const year = localDate().slice(0, 4);
  const [campaigns, setCampaigns] = useState<Row[]>([]);
  const [profiles, setProfiles] = useState<Row[]>([]);
  const [policies, setPolicies] = useState<Row[]>([]);
  const [form, setForm] = useState({ policy_version_id: "", entitlement_period_end: `${year}-12-31`, schedule_profile_id: "kr_lsa61_standard_v2025_10_23" });
  const [preview, setPreview] = useState<Row | null>(null);
  const [selectedCampaignId, setSelectedCampaignId] = useState("");
  const [selectedRecipientId, setSelectedRecipientId] = useState("");
  const [responseDate, setResponseDate] = useState(`${year}-09-01`);
  const [evidence, setEvidence] = useState({ stage: "first", event_type: "delivered", provider_receipt_ref: "", evidence_hash: "" });
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function load(preferCampaignId = "") {
    setBusy("load");
    const result = await fetchHrxLeavePromotionWorkspace();
    setBusy("");
    if (result.kind !== "data") {
      setError("연차 사용 촉진 캠페인을 불러오지 못했습니다.");
      return;
    }
    const nextCampaigns = result.campaigns as Row[];
    const nextProfiles = result.schedule_profiles as Row[];
    const nextPolicies = result.policies as Row[];
    setCampaigns(nextCampaigns);
    setProfiles(nextProfiles);
    setPolicies(nextPolicies);
    setForm((current) => ({
      ...current,
      policy_version_id: current.policy_version_id || text(nextPolicies[0], "policy_version_id"),
      schedule_profile_id: current.schedule_profile_id || text(nextProfiles[0], "id")
    }));
    setSelectedCampaignId((current) => preferCampaignId || current || text(nextCampaigns[0], "campaign_id"));
  }

  useEffect(() => { void load(); }, []);

  const selectedCampaign = campaigns.find((row) => text(row, "campaign_id") === selectedCampaignId) ?? campaigns[0] ?? null;
  const recipients = Array.isArray(selectedCampaign?.recipients) ? selectedCampaign.recipients as Row[] : [];
  const selectedRecipient = recipients.find((row) => text(row, "recipient_id") === selectedRecipientId) ?? null;
  const previewTargets = Array.isArray(preview?.targets) ? preview.targets as Row[] : [];
  const schedule = preview?.legal_schedule as Row | undefined;
  const selectedProfile = useMemo(() => profiles.find((row) => text(row, "id") === form.schedule_profile_id), [profiles, form.schedule_profile_id]);

  async function runPreview() {
    setBusy("preview");
    setError("");
    setMessage("");
    const result = await previewHrxLeavePromotion(form);
    setBusy("");
    if (result.kind !== "data") {
      setError("정책의 촉진 기준과 분 원장을 확인해 대상자를 계산하지 못했습니다.");
      return;
    }
    setPreview(result.preview as Row);
  }

  async function createCampaign() {
    if (!preview) return;
    setBusy("create");
    const result = await createHrxLeavePromotionCampaign({ ...form, idempotency_key: `leave-promotion:${form.policy_version_id}:${form.entitlement_period_end}:${form.schedule_profile_id}` });
    setBusy("");
    if (result.kind !== "data") {
      setError("촉진 캠페인을 저장하지 못했습니다.");
      return;
    }
    const campaign = result.campaign as Row;
    setMessage("대상자와 법정 일정 스냅샷을 저장했습니다.");
    await load(text(campaign, "campaign_id"));
  }

  async function issueNotice(recipient: Row, stage: "first" | "second") {
    const recipientId = text(recipient, "recipient_id");
    setBusy(`${stage}:${recipientId}`);
    setError("");
    const result = await issueHrxLeavePromotionNotice(recipientId, stage, `${year}-${stage === "first" ? "촉구" : "통보"}-v1`);
    setBusy("");
    if (result.kind !== "data") {
      setError(stage === "first" ? "1차 촉구 문서 참조를 만들지 못했습니다." : "응답 기한 또는 1차 전달 증거를 확인해 2차 통보 문서 참조를 만들지 못했습니다.");
      return;
    }
    setSelectedRecipientId(recipientId);
    setEvidence((current) => ({ ...current, stage, provider_receipt_ref: "", evidence_hash: "" }));
    setMessage(`${stage === "first" ? "1차 촉구" : "2차 통보"} 문서 참조를 생성했습니다. 전달 결과는 증거로 별도 기록해야 합니다.`);
    await load(selectedCampaignId);
  }

  async function submitEvidence() {
    if (!selectedRecipient) return;
    setBusy("evidence");
    setError("");
    const result = await recordHrxLeavePromotionEvidence(text(selectedRecipient, "recipient_id"), evidence);
    setBusy("");
    if (result.kind !== "data") {
      setError("문서 생성·전달 순서와 SHA-256 증거값을 확인해 주세요.");
      return;
    }
    setMessage(evidence.event_type === "failed" ? "전달 실패를 실패 상태로 기록했습니다." : evidence.event_type === "viewed" ? "열람 시각을 전달 증거와 분리해 기록했습니다." : "전달 receipt와 증거 해시를 기록했습니다.");
    setEvidence((current) => ({ ...current, provider_receipt_ref: "", evidence_hash: "" }));
    await load(selectedCampaignId);
  }

  async function submitResponse(recipient: Row) {
    setBusy(`response:${text(recipient, "recipient_id")}`);
    setError("");
    const result = await recordHrxLeavePromotionResponse(text(recipient, "recipient_id"), [responseDate]);
    setBusy("");
    if (result.kind !== "data") {
      setError("1차 전달 확인 후 사용 희망일을 기록할 수 있습니다.");
      return;
    }
    setMessage("직원의 사용 희망일과 응답 시각을 별도 증거로 기록했습니다.");
    await load(selectedCampaignId);
  }

  return (
    <Panel id="people-annual-leave-notices" className="people-panel span-2 leave-promotion-panel" title="연차휴가 사용 촉진" meta={`${campaigns.length}개 캠페인`}>
      <div className="people-panel-kicker"><CalendarClock size={15} />법정 마감과 실제 처리 시각, 전달·열람·응답 증거를 분리합니다</div>
      <div className="leave-promotion-boundary"><ShieldCheck size={16} /><span>문서 본문은 HR 문서 모듈에 두고 이 화면에는 참조와 증거 해시만 저장합니다. 법률 검토 전에는 보상 면제 완료로 표시하지 않습니다.</span></div>
      {error && <div className="live-data-state live-data-error" role="alert">{error}</div>}
      {message && <div className="live-data-state live-data-success" role="status">{message}</div>}

      <section className="leave-accrual-section">
        <div className="leave-accrual-section-head"><div><h3>대상 산정</h3><p>활성 정책의 분 원장과 기준일을 스냅샷으로 고정합니다.</p></div><button type="button" className="secondary-button" disabled={busy === "load"} onClick={() => void load(selectedCampaignId)}><RefreshCw size={14} />새로고침</button></div>
        <div className="leave-promotion-controls">
          <label><span>연차 정책</span><select aria-label="연차 정책" value={form.policy_version_id} onChange={(event) => { setForm({ ...form, policy_version_id: event.target.value }); setPreview(null); }}><option value="">정책 선택</option>{policies.map((row) => <option key={text(row, "policy_version_id")} value={text(row, "policy_version_id")}>{text(row, "policy_code")} · v{number(row, "version")}</option>)}</select></label>
          <label><span>권리 기간 종료일</span><input aria-label="권리 기간 종료일" type="date" value={form.entitlement_period_end} onChange={(event) => { setForm({ ...form, entitlement_period_end: event.target.value }); setPreview(null); }} /></label>
          <label><span>법정 일정</span><select aria-label="법정 일정" value={form.schedule_profile_id} onChange={(event) => { setForm({ ...form, schedule_profile_id: event.target.value }); setPreview(null); }}>{profiles.map((row) => <option key={text(row, "id")} value={text(row, "id")}>{text(row, "label")}</option>)}</select></label>
          <button className="secondary-button" type="button" disabled={!form.policy_version_id || busy === "preview"} onClick={() => void runPreview()}>대상 미리보기</button>
          <button className="primary-button" type="button" disabled={!preview || busy === "create"} onClick={() => void createCampaign()}>캠페인 저장</button>
        </div>
        <p className="leave-promotion-profile-note">{text(selectedProfile, "label")} · Asia/Seoul 현지 날짜 기준</p>
      </section>

      {preview && <section className="leave-accrual-section" data-leave-promotion-preview="true">
        <div className="leave-accrual-section-head"><div><h3>산정 결과</h3><p>산정 기준 {text(preview, "source_version").slice(0, 12)}</p></div><span className="record-state-badge preview">법률 검토 필요</span></div>
        <div className="leave-report-summary leave-promotion-summary">
          <span><small>대상자</small><strong>{number(preview, "target_count")}명</strong></span>
          <span><small>1차 시작</small><strong>{text(schedule, "first_notice_window_start")}</strong></span>
          <span><small>1차 마감</small><strong>{dateTime(schedule?.first_notice_deadline_at)}</strong></span>
          <span><small>응답 기한</small><strong>전달 후 {number(schedule, "employee_response_days")}일</strong></span>
          <span><small>2차 마감</small><strong>{dateTime(schedule?.second_notice_deadline_at)}</strong></span>
        </div>
        <div className="data-table-wrap"><table className="data-table"><thead><tr><th>구성원</th><th>미사용</th><th>예약</th><th>해제</th><th>소멸</th><th>원장 버전</th></tr></thead><tbody>{previewTargets.map((row) => <tr key={text(row, "employee_id")}><td><strong>{text(row, "employee_display_name")}</strong></td><td>{number(row, "unused_days")}일</td><td>{number(row, "reserved_minutes")}분</td><td>{number(row, "released_minutes")}분</td><td>{number(row, "expired_minutes")}분</td><td><code>{text(row, "source_version").slice(0, 10)}</code></td></tr>)}</tbody></table></div>
      </section>}

      <section className="leave-accrual-section">
        <div className="leave-accrual-section-head"><div><h3>캠페인 진행</h3><p>전달 실패·미열람·미응답은 완료로 합치지 않습니다.</p></div>{campaigns.length > 0 && <select aria-label="캠페인" value={selectedCampaignId} onChange={(event) => { setSelectedCampaignId(event.target.value); setSelectedRecipientId(""); }}>{campaigns.map((row) => <option key={text(row, "campaign_id")} value={text(row, "campaign_id")}>{text(row, "reference_date")} · {number(row, "target_count")}명</option>)}</select>}</div>
        {recipients.length === 0 ? <div className="live-data-state live-data-empty">저장된 대상자가 없습니다. 대상 미리보기부터 진행하세요.</div> : <div className="leave-promotion-recipient-list">{recipients.map((recipient) => {
          const recipientId = text(recipient, "recipient_id");
          const firstReady = text(recipient, "first_delivery_state") === "delivered";
          const hasResponse = Boolean(text(recipient, "responded_at"));
          return <article key={recipientId} className="leave-promotion-recipient" data-promotion-recipient-id={recipientId}>
            <div className="leave-promotion-recipient-head"><div><strong>{text(recipient, "employee_display_name")}</strong><span>{number(recipient, "unused_days")}일 · {number(recipient, "unused_minutes")}분</span></div><span className={`record-state-badge ${text(recipient, "state")}`}>{STATE_LABELS[text(recipient, "state")] ?? text(recipient, "state")}</span></div>
            <div className="leave-promotion-timeline"><span><small>1차 마감</small><strong>{dateTime(recipient.first_notice_deadline_at)}</strong></span><span><small>1차 전달</small><strong>{text(recipient, "first_delivery_state")}</strong></span><span><small>응답 마감</small><strong>{dateTime(recipient.response_due_at)}</strong></span><span><small>2차 마감</small><strong>{dateTime(recipient.second_notice_deadline_at)}</strong></span><span><small>2차 전달</small><strong>{text(recipient, "second_delivery_state")}</strong></span></div>
            <div className="leave-promotion-actions">
              <button type="button" className="secondary-button" disabled={Boolean(text(recipient, "document_id")) || busy === `first:${recipientId}`} onClick={() => void issueNotice(recipient, "first")}><FileCheck2 size={14} />1차 문서 참조</button>
              <button type="button" className="secondary-button" disabled={!text(recipient, "document_id")} onClick={() => { setSelectedRecipientId(recipientId); setEvidence((current) => ({ ...current, stage: "first" })); }}>1차 증거</button>
              <label><span>사용 희망일</span><input aria-label={`${text(recipient, "employee_display_name")} 사용 희망일`} type="date" value={responseDate} onChange={(event) => setResponseDate(event.target.value)} /></label>
              <button type="button" className="secondary-button" disabled={!firstReady || hasResponse || busy === `response:${recipientId}`} onClick={() => void submitResponse(recipient)}>응답 기록</button>
              <button type="button" className="secondary-button" disabled={!firstReady || hasResponse || Boolean(text(recipient, "second_document_id")) || busy === `second:${recipientId}`} onClick={() => void issueNotice(recipient, "second")}>2차 문서 참조</button>
              <button type="button" className="secondary-button" disabled={!text(recipient, "second_document_id")} onClick={() => { setSelectedRecipientId(recipientId); setEvidence((current) => ({ ...current, stage: "second" })); }}>2차 증거</button>
            </div>
          </article>;
        })}</div>}
      </section>

      {selectedRecipient && <section className="leave-accrual-section leave-promotion-evidence" data-leave-promotion-evidence="true">
        <div className="leave-accrual-section-head"><div><h3>전달·열람 증거</h3><p>{text(selectedRecipient, "employee_display_name")} · 원문이나 인증정보 없이 전달 확인 번호와 SHA-256만 저장합니다.</p></div></div>
        <div className="leave-promotion-evidence-form">
          <label><span>단계</span><select aria-label="증거 단계" value={evidence.stage} onChange={(event) => setEvidence({ ...evidence, stage: event.target.value })}><option value="first">1차 촉구</option><option value="second">2차 통보</option></select></label>
          <label><span>결과</span><select aria-label="증거 결과" value={evidence.event_type} onChange={(event) => setEvidence({ ...evidence, event_type: event.target.value })}><option value="delivered">전달 확인</option><option value="viewed">열람 확인</option><option value="failed">전달 실패</option></select></label>
          <label><span>전달 확인 번호</span><input aria-label="전달 확인 번호" value={evidence.provider_receipt_ref} onChange={(event) => setEvidence({ ...evidence, provider_receipt_ref: event.target.value })} placeholder="전자문서 전달 확인 번호" /></label>
          <label><span>증거 SHA-256</span><input aria-label="증거 SHA-256" value={evidence.evidence_hash} onChange={(event) => setEvidence({ ...evidence, evidence_hash: event.target.value.trim() })} placeholder="64자리 해시" /></label>
          <button className="primary-button" type="button" disabled={evidence.evidence_hash.length !== 64 || (evidence.event_type === "delivered" && !evidence.provider_receipt_ref) || busy === "evidence"} onClick={() => void submitEvidence()}>증거 기록</button>
        </div>
      </section>}
    </Panel>
  );
}
