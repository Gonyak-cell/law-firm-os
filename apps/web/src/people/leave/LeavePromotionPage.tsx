import React, { useEffect, useState } from "react";
import { FileCheck2 } from "lucide-react";
import { Panel } from "../../components/primitives.jsx";
import {
  createHrxLeavePromotionCampaign,
  fetchHrxLeavePromotionWorkspace,
  issueHrxLeavePromotionBatch,
  issueHrxLeavePromotionNotice,
  previewHrxLeavePromotion,
  recordHrxLeavePromotionEvidence,
  recordHrxLeavePromotionResponse,
  revokeHrxLeavePromotionEvidence
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

function rows(row: Row | null | undefined, field: string) {
  return Array.isArray(row?.[field]) ? row[field] as Row[] : [];
}

function deliveryLabel(value: string) {
  return (({ not_created: "미생성", pending: "확인 중", delivered: "전달", failed: "실패" } as Record<string, string>)[value] ?? value) || "-";
}

function evidenceEventLabel(value: string) {
  return (({ delivered: "전달", viewed: "열람", failed: "실패" } as Record<string, string>)[value] ?? value) || "-";
}

function stateTone(value: string) {
  if (value.includes("failed")) return "error";
  if (value.includes("delivered") || value.includes("viewed") || value.includes("responded")) return "live";
  return "review";
}

function evidenceSummary(recipient: Row) {
  const evidence = rows(recipient, "evidence_receipts");
  const active = evidence.filter((receipt) => text(receipt, "state") === "active");
  const delivered = active.filter((receipt) => text(receipt, "event_type") === "delivered").length;
  const viewed = active.filter((receipt) => text(receipt, "event_type") === "viewed").length;
  const failed = active.filter((receipt) => text(receipt, "event_type") === "failed").length;
  const revoked = evidence.length - active.length;
  const values = [delivered ? `전달 ${delivered}` : "", viewed ? `열람 ${viewed}` : "", failed ? `실패 ${failed}` : "", revoked ? `취소 ${revoked}` : ""].filter(Boolean);
  return values.join(" · ") || "-";
}

function noticeVersion(year: string, stage: "first" | "second") {
  return `${year}-${stage === "first" ? "촉구" : "통보"}-v1`;
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
  const [selectedRecipientIds, setSelectedRecipientIds] = useState<string[]>([]);
  const [batchStage, setBatchStage] = useState<"first" | "second">("first");
  const [batchResult, setBatchResult] = useState<Row | null>(null);
  const [responseDate, setResponseDate] = useState(`${year}-09-01`);
  const [evidence, setEvidence] = useState({ stage: "first", event_type: "delivered", provider_receipt_ref: "", evidence_hash: "" });
  const [revocationReason, setRevocationReason] = useState("OPERATOR_CORRECTION");
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
    const result = await issueHrxLeavePromotionNotice(recipientId, stage, noticeVersion(year, stage));
    setBusy("");
    if (result.kind !== "data") {
      setError(stage === "first" ? "1차 촉구 문서 참조를 만들지 못했습니다." : "응답 기한 또는 1차 전달 증거를 확인해 2차 통보 문서 참조를 만들지 못했습니다.");
      return;
    }
    setSelectedRecipientId(recipientId);
    setEvidence((current) => ({ ...current, stage, provider_receipt_ref: "", evidence_hash: "" }));
    setMessage(`${stage === "first" ? "1차 촉구" : "2차 통보"} 문서를 전달 대기열에 넣었습니다.`);
    await load(selectedCampaignId);
  }

  async function issueBatch(recipientIds = selectedRecipientIds, stage = batchStage) {
    const campaignId = text(selectedCampaign, "campaign_id");
    const visibleRecipientIds = new Set(recipients.map((recipient) => text(recipient, "recipient_id")));
    const targetIds = [...new Set(recipientIds)].filter((recipientId) => visibleRecipientIds.has(recipientId));
    if (!campaignId || targetIds.length === 0) return;
    const documentVersion = noticeVersion(year, stage);
    setBusy("batch");
    setError("");
    setMessage("");
    const result = await issueHrxLeavePromotionBatch(campaignId, {
      stage,
      document_version: documentVersion,
      recipient_ids: targetIds,
      idempotency_key: `leave-promotion-batch:${campaignId}:${stage}:${documentVersion}:${[...targetIds].sort().join(",")}`
    });
    setBusy("");
    if (result.kind !== "data") {
      setError("선택한 대상의 문서 생성을 처리하지 못했습니다.");
      return;
    }
    setBatchStage(stage);
    setBatchResult({ ...(result.batch as Row), stage });
    await load(campaignId);
  }

  async function retryFailedBatch() {
    const failedIds = rows(batchResult, "results").filter((result) => text(result, "outcome") === "failed").map((result) => text(result, "recipient_id"));
    const stage = text(batchResult, "stage") === "second" ? "second" : "first";
    await issueBatch(failedIds, stage);
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
    setMessage(evidence.event_type === "failed" ? "전달 실패를 기록했습니다." : evidence.event_type === "viewed" ? "열람 시각을 기록했습니다." : "전달 확인 번호와 증거 해시를 기록했습니다.");
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

  async function revokeEvidence(receipt: Row) {
    if (!selectedRecipient) return;
    const receiptId = text(receipt, "receipt_id");
    setBusy(`revoke:${receiptId}`);
    setError("");
    const result = await revokeHrxLeavePromotionEvidence(text(selectedRecipient, "recipient_id"), receiptId, revocationReason.trim());
    setBusy("");
    if (result.kind !== "data") {
      setError("증거 취소 사유와 현재 상태를 확인해 주세요.");
      return;
    }
    setMessage("증거 기록을 취소했습니다.");
    await load(selectedCampaignId);
  }

  const visibleSelectedRecipientIds = selectedRecipientIds.filter((recipientId) => recipients.some((recipient) => text(recipient, "recipient_id") === recipientId));
  const allRecipientsSelected = recipients.length > 0 && visibleSelectedRecipientIds.length === recipients.length;
  const batchFailures = rows(batchResult, "results").filter((result) => text(result, "outcome") === "failed");
  const selectedReceipts = rows(selectedRecipient, "evidence_receipts");
  const selectedFirstReady = text(selectedRecipient, "first_delivery_state") === "delivered";
  const selectedHasResponse = Boolean(text(selectedRecipient, "responded_at"));
  const selectedStageHasDocument = evidence.stage === "first" ? Boolean(text(selectedRecipient, "document_id")) : Boolean(text(selectedRecipient, "second_document_id"));

  return (
    <Panel id="people-annual-leave-notices" className="people-panel span-2 leave-promotion-panel" title="연차휴가 사용 촉진" meta={`${campaigns.length}건`}>
      {error && <div className="live-data-state live-data-error" role="alert">{error}</div>}
      {message && <div className="live-data-state live-data-success" role="status">{message}</div>}

      <section className="leave-accrual-section">
        <div className="leave-accrual-section-head"><h3>대상 산정</h3></div>
        <div className="leave-promotion-controls">
          <label><span>연차 정책</span><select aria-label="연차 정책" value={form.policy_version_id} onChange={(event) => { setForm({ ...form, policy_version_id: event.target.value }); setPreview(null); }}><option value="">정책 선택</option>{policies.map((row) => <option key={text(row, "policy_version_id")} value={text(row, "policy_version_id")}>{text(row, "policy_code")} · v{number(row, "version")}</option>)}</select></label>
          <label><span>권리 기간 종료일</span><input aria-label="권리 기간 종료일" type="date" value={form.entitlement_period_end} onChange={(event) => { setForm({ ...form, entitlement_period_end: event.target.value }); setPreview(null); }} /></label>
          <label><span>법정 일정</span><select aria-label="법정 일정" value={form.schedule_profile_id} onChange={(event) => { setForm({ ...form, schedule_profile_id: event.target.value }); setPreview(null); }}>{profiles.map((row) => <option key={text(row, "id")} value={text(row, "id")}>{text(row, "label")}</option>)}</select></label>
          <button className="secondary-button" type="button" disabled={!form.policy_version_id || busy === "preview"} onClick={() => void runPreview()}>대상 미리보기</button>
          <button className="primary-button" type="button" disabled={!preview || busy === "create"} onClick={() => void createCampaign()}>캠페인 저장</button>
        </div>
      </section>

      {preview && <section className="leave-accrual-section" data-leave-promotion-preview="true">
        <div className="leave-accrual-section-head"><h3>산정 결과</h3></div>
        <div className="leave-report-summary leave-promotion-summary">
          <span><small>대상자</small><strong>{number(preview, "target_count")}명</strong></span>
          <span><small>1차 시작</small><strong>{text(schedule, "first_notice_window_start")}</strong></span>
          <span><small>1차 마감</small><strong>{dateTime(schedule?.first_notice_deadline_at)}</strong></span>
          <span><small>응답 기한</small><strong>전달 후 {number(schedule, "employee_response_days")}일</strong></span>
          <span><small>2차 마감</small><strong>{dateTime(schedule?.second_notice_deadline_at)}</strong></span>
        </div>
        <div className="data-table-wrap"><table className="data-table"><thead><tr><th>구성원</th><th>미사용</th><th>예약</th><th>해제</th><th>소멸</th></tr></thead><tbody>{previewTargets.map((row) => <tr key={text(row, "employee_id")}><td><strong>{text(row, "employee_display_name")}</strong></td><td>{number(row, "unused_days")}일</td><td>{number(row, "reserved_minutes")}분</td><td>{number(row, "released_minutes")}분</td><td>{number(row, "expired_minutes")}분</td></tr>)}</tbody></table></div>
      </section>}

      <section className="leave-accrual-section">
        <div className="leave-accrual-section-head"><h3>캠페인 진행</h3>{campaigns.length > 0 && <select aria-label="캠페인" value={selectedCampaignId} onChange={(event) => { setSelectedCampaignId(event.target.value); setSelectedRecipientId(""); setSelectedRecipientIds([]); setBatchResult(null); }}>{campaigns.map((row) => <option key={text(row, "campaign_id")} value={text(row, "campaign_id")}>{text(row, "reference_date")} · {number(row, "target_count")}명</option>)}</select>}</div>
        {recipients.length > 0 ? <>
          <div className="leave-promotion-batch-toolbar" data-leave-promotion-batch="true">
            <label><span>문서 단계</span><select aria-label="일괄 문서 단계" value={batchStage} onChange={(event) => { setBatchStage(event.target.value === "second" ? "second" : "first"); setBatchResult(null); }}><option value="first">1차 촉구</option><option value="second">2차 통보</option></select></label>
            <span className="leave-promotion-selection-count">{visibleSelectedRecipientIds.length}명 선택</span>
            <button className="primary-button" type="button" disabled={visibleSelectedRecipientIds.length === 0 || busy === "batch"} onClick={() => void issueBatch()}><FileCheck2 size={14} />{batchStage === "first" ? "1차 일괄 생성" : "2차 일괄 생성"}</button>
            {batchFailures.length > 0 && <button className="secondary-button" type="button" disabled={busy === "batch"} onClick={() => void retryFailedBatch()}>실패 {batchFailures.length}건 재시도</button>}
            {batchResult && <output className="leave-promotion-batch-result" aria-live="polite">신규 {number(batchResult, "issued_count")} · 재사용 {number(batchResult, "replayed_count")} · 실패 {number(batchResult, "failed_count")}</output>}
          </div>
          <div className="data-table-wrap leave-promotion-table-wrap"><table className="data-table leave-promotion-table">
            <thead><tr><th className="leave-promotion-select-cell"><input type="checkbox" aria-label="촉진 대상 전체 선택" checked={allRecipientsSelected} onChange={(event) => setSelectedRecipientIds(event.target.checked ? recipients.map((recipient) => text(recipient, "recipient_id")) : [])} /></th><th>구성원</th><th>미사용</th><th>상태</th><th>1차 전달</th><th>응답</th><th>2차 전달</th><th>증거</th><th>처리</th></tr></thead>
            <tbody>{recipients.map((recipient) => {
              const recipientId = text(recipient, "recipient_id");
              const checked = visibleSelectedRecipientIds.includes(recipientId);
              const firstReady = text(recipient, "first_delivery_state") === "delivered";
              const hasResponse = Boolean(text(recipient, "responded_at"));
              return <tr key={recipientId} data-promotion-recipient-id={recipientId}>
                <td className="leave-promotion-select-cell"><input type="checkbox" aria-label={`${text(recipient, "employee_display_name")} 선택`} checked={checked} onChange={(event) => setSelectedRecipientIds((current) => event.target.checked ? [...new Set([...current, recipientId])] : current.filter((value) => value !== recipientId))} /></td>
                <td><strong>{text(recipient, "employee_display_name")}</strong></td>
                <td>{number(recipient, "unused_days")}일</td>
                <td><span className="record-state-badge" data-state={stateTone(text(recipient, "state"))}>{STATE_LABELS[text(recipient, "state")] ?? text(recipient, "state")}</span></td>
                <td>{deliveryLabel(text(recipient, "first_delivery_state"))}</td>
                <td>{text(recipient, "responded_at") ? dateTime(recipient.responded_at) : "-"}</td>
                <td>{deliveryLabel(text(recipient, "second_delivery_state"))}</td>
                <td>{evidenceSummary(recipient)}</td>
                <td><div className="leave-promotion-row-actions">
                  <button type="button" className="secondary-button" disabled={Boolean(text(recipient, "document_id")) || busy === `first:${recipientId}`} onClick={() => void issueNotice(recipient, "first")}>1차</button>
                  <button type="button" className="secondary-button" disabled={!firstReady || hasResponse || Boolean(text(recipient, "second_document_id")) || busy === `second:${recipientId}`} onClick={() => void issueNotice(recipient, "second")}>2차</button>
                  <button type="button" className="secondary-button" disabled={!text(recipient, "document_id")} onClick={() => { setSelectedRecipientId(recipientId); setEvidence((current) => ({ ...current, stage: text(recipient, "second_document_id") ? "second" : "first", provider_receipt_ref: "", evidence_hash: "" })); }}>처리</button>
                </div></td>
              </tr>;
            })}</tbody>
          </table></div>
        </> : <div className="live-data-state live-data-empty">대상 없음</div>}
      </section>

      {selectedRecipient && <section className="leave-accrual-section leave-promotion-evidence" data-leave-promotion-evidence="true">
        <div className="leave-accrual-section-head"><h3>수신자 처리</h3><span>{text(selectedRecipient, "employee_display_name")}</span></div>
        <div className="leave-promotion-response-form">
          <label><span>사용 희망일</span><input aria-label={`${text(selectedRecipient, "employee_display_name")} 사용 희망일`} type="date" value={responseDate} onChange={(event) => setResponseDate(event.target.value)} /></label>
          <button type="button" className="secondary-button" disabled={!selectedFirstReady || selectedHasResponse || busy === `response:${text(selectedRecipient, "recipient_id")}`} onClick={() => void submitResponse(selectedRecipient)}>응답 기록</button>
        </div>
        <div className="leave-promotion-evidence-form">
          <label><span>단계</span><select aria-label="증거 단계" value={evidence.stage} onChange={(event) => setEvidence({ ...evidence, stage: event.target.value })}><option value="first">1차 촉구</option><option value="second">2차 통보</option></select></label>
          <label><span>결과</span><select aria-label="증거 결과" value={evidence.event_type} onChange={(event) => setEvidence({ ...evidence, event_type: event.target.value, provider_receipt_ref: event.target.value === "delivered" ? evidence.provider_receipt_ref : "" })}><option value="delivered">전달 확인</option><option value="viewed">열람 확인</option><option value="failed">전달 실패</option></select></label>
          <label><span>전달 확인 번호</span><input aria-label="전달 확인 번호" disabled={evidence.event_type !== "delivered"} value={evidence.provider_receipt_ref} onChange={(event) => setEvidence({ ...evidence, provider_receipt_ref: event.target.value })} placeholder="전자문서 전달 확인 번호" /></label>
          <label><span>증거 SHA-256</span><input aria-label="증거 SHA-256" value={evidence.evidence_hash} onChange={(event) => setEvidence({ ...evidence, evidence_hash: event.target.value.trim() })} placeholder="64자리 해시" /></label>
          <button className="primary-button" type="button" disabled={!selectedStageHasDocument || evidence.evidence_hash.length !== 64 || (evidence.event_type === "delivered" && !evidence.provider_receipt_ref) || busy === "evidence"} onClick={() => void submitEvidence()}>증거 기록</button>
        </div>
        {selectedReceipts.length > 0 && <>
          <div className="leave-promotion-revocation"><label><span>취소 사유 코드</span><input aria-label="증거 취소 사유 코드" value={revocationReason} onChange={(event) => setRevocationReason(event.target.value)} /></label></div>
          <div className="data-table-wrap leave-promotion-receipts"><table className="data-table"><thead><tr><th>발생일</th><th>단계</th><th>결과</th><th>확인 번호</th><th>증거 해시</th><th>상태</th><th>관리</th></tr></thead><tbody>{selectedReceipts.map((receipt) => <tr key={text(receipt, "receipt_id")}>
            <td>{dateTime(receipt.occurred_at)}</td><td>{text(receipt, "stage") === "second" ? "2차" : "1차"}</td><td>{evidenceEventLabel(text(receipt, "event_type"))}</td><td title={text(receipt, "provider_receipt_ref")}>{text(receipt, "provider_receipt_ref") || "-"}</td><td title={text(receipt, "evidence_hash")}>{text(receipt, "evidence_hash").slice(0, 12)}</td><td><span className="record-state-badge" data-state={text(receipt, "state") === "active" ? "live" : "error"}>{text(receipt, "state") === "active" ? "유효" : "취소"}</span></td><td>{text(receipt, "state") === "active" && <button type="button" className="secondary-button" disabled={revocationReason.trim().length < 2 || busy === `revoke:${text(receipt, "receipt_id")}`} onClick={() => void revokeEvidence(receipt)}>취소</button>}</td>
          </tr>)}</tbody></table></div>
        </>}
      </section>}
    </Panel>
  );
}
