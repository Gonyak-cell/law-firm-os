import React from "react";
import {
  OutlookCriticalValueRow,
  OutlookOneLineField,
} from "./outlook-compact-shell.jsx";

const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/u;
const CONTEXT_CONTROL_CHARACTERS = /[\u0000-\u001d\u007f]/u;
const SHA256 = /^[a-f0-9]{64}$/u;
const RESULT_FIELDS = ["apply_to_current_view", "current", "idempotency_fingerprint", "idempotent_replay", "operation_context", "outcome", "request_id", "timeline_events"];
const TIMELINE_TYPES = new Set(["outlook.email.filing.corrected_from", "outlook.email.filing.corrected_to"]);
const SUBMIT_HELP_ID = "filing-correction-submit-help";

function asText(value) {
  if (typeof value !== "string") return "";
  return value.normalize("NFKC").replace(/[\u0000-\u001f\u007f]/gu, " ").replace(/\s+/gu, " ").trim().slice(0, 512);
}

function exactId(value) {
  if (typeof value !== "string" || !value || value !== value.trim() || CONTROL_CHARACTERS.test(value)) return "";
  return value;
}

function matterIdentity(value) {
  if (!value || typeof value !== "object") return "";
  return exactId(value.matter_id);
}

function matterDisplay(value) {
  if (typeof value === "string") return asText(value);
  if (!value || typeof value !== "object") return "";
  const code = asText(value.matter_code ?? value.code ?? value.matterCode);
  const title = asText(value.title ?? value.matter_title ?? value.matterTitle);
  const id = matterIdentity(value);
  return [code, title].filter(Boolean).join(" — ") || id;
}

function selectedMatter(value) {
  const id = matterIdentity(value);
  const display = matterDisplay(value) || id;
  return id ? { id, display } : null;
}

function normalizeTargetOptions(values) {
  const seen = new Set();
  const options = [];
  for (const value of Array.isArray(values) ? values : []) {
    const normalized = selectedMatter(value);
    if (!normalized || seen.has(normalized.id)) continue;
    seen.add(normalized.id);
    options.push(normalized);
  }
  return options;
}

function normalizeReason(value) {
  if (typeof value !== "string") return "";
  if (CONTROL_CHARACTERS.test(value)) return "";
  const normalized = value.trim();
  return normalized && normalized.length <= 500 && !CONTROL_CHARACTERS.test(normalized) ? normalized : "";
}

function validOperationContext(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)
    || Object.keys(value).sort().join("\u001f") !== "item_context_key\u001fsession_generation") return false;
  const itemContextKey = value.item_context_key;
  return typeof itemContextKey === "string"
    && itemContextKey.length > 0
    && itemContextKey.length <= 2048
    && itemContextKey === itemContextKey.trim()
    && !CONTEXT_CONTROL_CHARACTERS.test(itemContextKey)
    && Number.isSafeInteger(value.session_generation)
    && value.session_generation >= 0;
}

function normalizedResultOutcome(result, expectedTargetId = "") {
  if (!result || typeof result !== "object" || Array.isArray(result)) return "";
  if (Object.keys(result).sort().join("\u001f") !== RESULT_FIELDS.join("\u001f")) return "";
  const outcome = result.outcome;
  const replay = outcome === "idempotent_replay";
  if ((outcome !== "created" && !replay) || result.idempotent_replay !== replay || result.apply_to_current_view !== true) return "";
  if (!validOperationContext(result.operation_context)) return "";
  if (!exactId(result.request_id) || !SHA256.test(result.idempotency_fingerprint)) return "";
  if (!result.current || typeof result.current !== "object" || Array.isArray(result.current)
    || result.current.event_kind !== "correction" || result.current.status !== "applied"
    || !matterIdentity(result.current) || (expectedTargetId && result.current.matter_id !== expectedTargetId)) return "";
  if (!Array.isArray(result.timeline_events) || result.timeline_events.length !== 2
    || result.timeline_events.some((entry) => !entry || typeof entry !== "object" || Array.isArray(entry)
      || !exactId(entry.event_id) || !matterIdentity(entry) || !TIMELINE_TYPES.has(entry.type))) return "";
  return outcome;
}

function resultCopy(result, expectedTargetId) {
  const outcome = normalizedResultOutcome(result, expectedTargetId);
  return outcome === "created" ? "변경됨" : outcome === "idempotent_replay" ? "이미 변경됨" : "";
}

export function OutlookFilingCorrectionPanel({
  currentPlacement,
  currentMatter,
  currentMatterDisplay,
  targetMatters = [],
  targetMatterId = "",
  targetQuery = "",
  reason = "",
  confirmed = false,
  busy = false,
  result = null,
  onTargetQueryChange,
  onTargetMatterChange,
  onReasonChange,
  onConfirmationChange,
  onSubmit,
  onCopy,
}) {
  const currentId = matterIdentity(currentPlacement);
  const currentDisplay = asText(currentMatterDisplay) || matterDisplay(currentMatter) || matterDisplay(currentPlacement) || currentId;
  const requestedTargetId = exactId(targetMatterId);
  const options = normalizeTargetOptions(targetMatters);
  const selected = options.find((option) => option.id === requestedTargetId) || null;
  const targetId = selected?.id || "";
  const targetDisplay = selected?.display || "";
  const reasonValue = normalizeReason(reason);
  const currentInvalid = !currentId;
  const targetInvalid = !targetId;
  const sameMatter = Boolean(currentId && targetId && currentId === targetId);
  const disabled = Boolean(
    busy
    || currentInvalid
    || targetInvalid
    || sameMatter
    || !reasonValue
    || confirmed !== true
    || typeof onSubmit !== "function",
  );
  const submitExplanation = busy
    ? "처리 중입니다."
    : currentInvalid
      ? "현재 Matter를 확인해 주세요."
      : targetInvalid
        ? "새 Matter를 선택해 주세요."
        : sameMatter
          ? "다른 Matter를 선택해 주세요."
          : !reasonValue
            ? "이동 사유는 한 줄로 입력해 주세요."
            : confirmed !== true
              ? "변경 내용을 확인해 주세요."
              : typeof onSubmit !== "function" ? "변경 요청을 준비해 주세요." : "";
  const successCopy = resultCopy(result, targetId);
  const handleSubmit = (event) => {
    event.preventDefault();
    if (!disabled) onSubmit();
  };

  return (
    <form className="outlook-filing-correction-panel" data-filing-correction-panel="true" aria-busy={busy ? "true" : "false"} onSubmit={handleSubmit}>
      {currentId && currentDisplay ? (
        <OutlookCriticalValueRow
          label="현재 Matter"
          value={currentDisplay}
          onCopy={onCopy}
          copyLabel="복사"
        />
      ) : <p className="outlook-one-line">현재 Matter를 확인해 주세요.</p>}
      <OutlookOneLineField
        id="filing-correction-target-search"
        name="filing_correction_target_search"
        label="대상 Matter 검색"
        type="search"
        value={targetQuery}
        onChange={onTargetQueryChange}
        placeholder="새 Matter"
        autoComplete="off"
        disabled={Boolean(busy) || typeof onTargetQueryChange !== "function"}
        data-testid="filing-correction-target-search"
      />
      <OutlookOneLineField
        id="filing-correction-target-matter"
        name="filing_correction_target_matter"
        label="대상 Matter 선택"
        as="select"
        value={targetId}
        onChange={onTargetMatterChange}
        disabled={Boolean(busy) || options.length === 0 || typeof onTargetMatterChange !== "function"}
        data-testid="filing-correction-target-select"
      >
        <option value="">Matter를 선택해 주세요</option>
        {options.map((option) => <option key={option.id} value={option.id}>{option.display}</option>)}
      </OutlookOneLineField>
      {targetDisplay ? (
        <OutlookCriticalValueRow
          label="대상 Matter"
          value={targetDisplay}
          onCopy={onCopy}
          copyLabel="복사"
        />
      ) : null}
      <OutlookOneLineField
        id="filing-correction-reason"
        name="filing_correction_reason"
        label="정정 사유"
        type="text"
        value={reason}
        onChange={onReasonChange}
        placeholder="이동 사유"
        autoComplete="off"
        maxLength={500}
        disabled={Boolean(busy) || typeof onReasonChange !== "function"}
        data-testid="filing-correction-reason"
      />
      <label className="outlook-flat-action-row" htmlFor="filing-correction-confirmation">
        <span className="outlook-flat-action-label">변경 내용을 확인했습니다</span>
        <input
          id="filing-correction-confirmation"
          name="filing_correction_confirmation"
          type="checkbox"
          checked={confirmed === true}
          onChange={onConfirmationChange}
          disabled={Boolean(busy) || typeof onConfirmationChange !== "function"}
          data-testid="filing-correction-confirmation"
        />
      </label>
      <div className="outlook-flat-action-row" data-action-row="filing.correct-placement">
        <span className="outlook-flat-action-label">저장 위치 바꾸기</span>
        <button
          type="submit"
          className="outlook-flat-action-button"
          disabled={disabled}
          aria-describedby={submitExplanation ? SUBMIT_HELP_ID : undefined}
          data-testid="filing-correction-submit"
        >
          변경
        </button>
      </div>
      {submitExplanation ? (
        <p className="outlook-one-line" id={SUBMIT_HELP_ID} role="status" data-testid="filing-correction-submit-help">
          {submitExplanation}
        </p>
      ) : null}
      {successCopy ? (
        <p className="outlook-one-line" role="status" data-testid="filing-correction-result">
          {successCopy}
        </p>
      ) : null}
    </form>
  );
}

export default OutlookFilingCorrectionPanel;
