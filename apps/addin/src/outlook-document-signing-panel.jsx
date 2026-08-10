import React from "react";
import { OutlookOneLineField } from "./outlook-compact-shell.jsx";

const KEY = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/u;
const REF = KEY;
const SHA = /^[a-f0-9]{64}$/u;
const CANONICAL_REF = /^matter:\/\/[A-Za-z0-9][A-Za-z0-9._:-]{0,255}\/documents\/[A-Za-z0-9][A-Za-z0-9._:-]{0,255}\/versions\/[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/u;
const MAX_ESIGN_REQUESTS = 8;
const TEMPLATE_KEYS = new Set([
  "template_id", "template_version", "template_hash", "label", "category", "merge_field_count", "merge_fields", "signer_roles",
  "requires_approval", "approval_receipt_present", "raw_template_body_included", "raw_contact_values_included", "production_ready_claim",
]);
const DRAFT_KEYS = new Set([
  "draft_id", "matter_id", "template_id", "template_version", "template_hash", "input_fingerprint", "title", "status", "safe_excerpt",
  "merge_field_count", "signer_role_count", "approval_state", "publish_state", "immutable",
]);
const REQUEST_KEYS = new Set([
  "request_id", "matter_id", "document", "recipients", "state", "canonical_document_ref", "can_send", "can_reconcile", "completion_artifacts",
  "production_ready_claim",
]);
const ARTIFACT_KEYS = new Set(["document_id", "version_id", "sha256", "immutable"]);
const COMPLETION_ARTIFACT_KEYS = new Set(["signed_pdf", "certificate"]);
const MERGE_ENTRY_KEYS = new Set(["key", "label"]);
const SIGNER_ENTRY_KEYS = new Set(["role_id", "required", "label"]);
const BLOCKED_SCHEMA_KEYS = new Set([
  "actor_id", "actorId", "tenant_id", "tenantId", "permission_ref", "audit_hint_ref", "audit_hint", "access_token", "refresh_token",
  "token", "secret", "password", "raw_body", "email_body", "document_bytes", "content_base64", "attachment_bytes", "storage_pointer",
  "storage_path", "object_key", "local_path", "provider_payload", "provider_credentials", "envelope_id", "account_id", "base_uri",
  "permission_envelope_id", "audit_trace_id", "requested_by_actor_id", "raw_storage_path_included", "raw_contact_values", "raw_template_body",
]);
const STATES = Object.freeze({
  draft: "초안", review_required: "검토 필요", approved: "승인됨", provider_pending: "전송 준비 중",
  draft_created: "전송 준비됨", sent: "전송됨", delivered: "전달됨", completed_artifacts_pending: "완료 자료 확인 중",
  completed: "완료", declined: "거절됨", voided: "취소됨", reconciliation_required: "상태 확인 필요", provider_blocked: "전송 차단",
});
const FIELD_LABELS = Object.freeze({
  client_name: "의뢰인 이름", matter_title: "Matter 제목", effective_date: "효력일", attorney_name: "담당 변호사", responsible_attorney: "담당 변호사",
  client_contact_authorization: "의뢰인 연락처 권한", contact_email: "연락처 이메일", client_address: "의뢰인 주소",
});
const ROLE_LABELS = Object.freeze({ client: "의뢰인", attorney: "담당 변호사", witness: "증인" });

function text(value, max = 512) {
  if (typeof value !== "string" || /[\u0000-\u001f\u007f]/u.test(value)) return "";
  return value.normalize("NFKC").replace(/\s+/gu, " ").trim().slice(0, max);
}

function object(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasBlockedKey(value, seen = new WeakSet()) {
  if (!object(value) && !Array.isArray(value)) return false;
  if (seen.has(value)) return true;
  seen.add(value);
  return Object.entries(value).some(([name, child]) => BLOCKED_SCHEMA_KEYS.has(name) || hasBlockedKey(child, seen));
}

function hasOnlyKeys(value, allowed) {
  return object(value) && Object.keys(value).every((name) => allowed.has(name));
}

function key(value) {
  const candidate = typeof value === "string" ? value.trim() : "";
  return KEY.test(candidate) && !BLOCKED_SCHEMA_KEYS.has(candidate) ? candidate : "";
}

function ref(value) {
  const candidate = typeof value === "string" ? value.trim() : "";
  return REF.test(candidate) && !BLOCKED_SCHEMA_KEYS.has(candidate) ? candidate : "";
}

function label(value, fallback) {
  const normalized = text(value, 80);
  return normalized || fallback;
}

function humanKey(value, fallback) {
  const safe = key(value);
  return FIELD_LABELS[safe] || ROLE_LABELS[safe] || fallback;
}

function templateVersionValue(value) {
  return ref(value);
}

function templateSelectionValue(template) {
  return `${encodeURIComponent(template.template_id)}~${encodeURIComponent(template.template_version)}`;
}

export function normalizeOutlookDocumentTemplate(input) {
  if (!object(input) || !hasOnlyKeys(input, TEMPLATE_KEYS) || hasBlockedKey(input)) return null;
  if (!Array.isArray(input.merge_fields) || input.merge_fields.length > 64 || !Array.isArray(input.signer_roles) || input.signer_roles.length > 32) return null;
  if (Object.hasOwn(input, "category") && input.category !== "document") return null;
  if (Object.hasOwn(input, "requires_approval") && input.requires_approval !== true) return null;
  if (Object.hasOwn(input, "approval_receipt_present") && input.approval_receipt_present !== true) return null;
  if (Object.hasOwn(input, "raw_template_body_included") && input.raw_template_body_included !== false) return null;
  if (Object.hasOwn(input, "raw_contact_values_included") && input.raw_contact_values_included !== false) return null;
  if (Object.hasOwn(input, "production_ready_claim") && input.production_ready_claim !== false) return null;
  if (Object.hasOwn(input, "merge_field_count") && (!Number.isSafeInteger(input.merge_field_count) || input.merge_field_count !== input.merge_fields.length)) return null;
  if (Object.hasOwn(input, "signer_role_count") && (!Number.isSafeInteger(input.signer_role_count) || input.signer_role_count !== input.signer_roles.length)) return null;
  const templateId = ref(input.template_id);
  const version = templateVersionValue(input.template_version);
  if (!templateId || !version) return null;
  const mergeFields = [];
  const seenFields = new Set();
  for (const entry of input.merge_fields) {
    if (object(entry) && (!hasOnlyKeys(entry, MERGE_ENTRY_KEYS) || hasBlockedKey(entry))) continue;
    if (object(entry) && Object.hasOwn(entry, "label") && typeof entry.label !== "string") continue;
    const rawKey = typeof entry === "string" ? entry : entry?.key;
    const fieldKey = key(rawKey);
    if (!fieldKey || seenFields.has(fieldKey)) continue;
    seenFields.add(fieldKey);
    mergeFields.push({ key: fieldKey, label: humanKey(entry?.label || fieldKey, `병합 항목 ${mergeFields.length + 1}`) });
  }
  const signerRoles = [];
  const seenRoles = new Set();
  for (const entry of input.signer_roles) {
    if (!object(entry) || !hasOnlyKeys(entry, SIGNER_ENTRY_KEYS) || hasBlockedKey(entry)) continue;
    if (typeof entry.required !== "boolean" || (Object.hasOwn(entry, "label") && typeof entry.label !== "string")) continue;
    const roleId = key(entry?.role_id);
    if (!roleId || seenRoles.has(roleId)) continue;
    seenRoles.add(roleId);
    signerRoles.push({ role_id: roleId, required: entry?.required === true, label: humanKey(entry?.label || roleId, `서명자 ${signerRoles.length + 1}`) });
  }
  return { template_id: templateId, template_version: version, label: label(input.label, "승인된 문서 서식"), merge_fields: mergeFields, signer_roles: signerRoles };
}

function templatesOf(values) {
  const seen = new Set();
  return (Array.isArray(values) ? values : []).map(normalizeOutlookDocumentTemplate).filter((value) => {
    const identity = value && `${value.template_id}\u001f${value.template_version}`;
    if (!value || seen.has(identity)) return false;
    seen.add(identity);
    return true;
  });
}

function templateIdCounts(values) {
  const counts = new Map();
  for (const value of values) counts.set(value.template_id, (counts.get(value.template_id) || 0) + 1);
  return counts;
}

function valueOf(values, field) {
  if (!values || typeof values !== "object" || hasBlockedKey(values)) return "";
  let raw;
  if (Array.isArray(values)) {
    const entry = values.find((item) => item && typeof item === "object" && !hasBlockedKey(item) && (item.role_id === field || item.key === field));
    raw = entry?.party_ref ?? entry?.value;
  } else raw = values[field];
  const normalized = text(raw, 1000);
  return normalized && !/(?:^(?:https?|file|data|javascript):\/\/|[\\/]\.\.?[\\/]|(?:secret|token|password|credential)\s*[:=])/iu.test(normalized)
    && !/^[a-f0-9]{64}$/iu.test(normalized) ? normalized : "";
}

function safeRef(value) {
  if (typeof value !== "string" || /[\u0000-\u001f\u007f]/u.test(value)) return "";
  return CANONICAL_REF.test(value) ? value : "";
}

export function normalizeOutlookPublishedDocumentRef(value) {
  return safeRef(value) || null;
}

function safeArtifact(input) {
  if (!object(input) || hasBlockedKey(input) || !hasOnlyKeys(input, ARTIFACT_KEYS) || input.immutable !== true) return null;
  const documentId = ref(input.document_id);
  const versionId = ref(input.version_id);
  const sha256 = typeof input.sha256 === "string" && SHA.test(input.sha256) ? input.sha256 : "";
  return documentId && versionId && sha256 ? { document_id: documentId, version_id: versionId, sha256, immutable: true } : null;
}

function safeCompletionArtifacts(value, state) {
  if (value === undefined) return null;
  if (value === null) return state === "completed" ? null : { signed_pdf: null, certificate: null };
  if (!object(value) || hasBlockedKey(value) || !hasOnlyKeys(value, COMPLETION_ARTIFACT_KEYS)) return null;
  const signedPdf = value.signed_pdf === null ? null : safeArtifact(value.signed_pdf);
  const certificate = value.certificate === null ? null : safeArtifact(value.certificate);
  if ((value.signed_pdf !== null && !signedPdf) || (value.certificate !== null && !certificate)) return null;
  const sameDocument = signedPdf && certificate && signedPdf.document_id === certificate.document_id;
  if (sameDocument) return null;
  if (state === "completed") {
    if (!signedPdf || !certificate) return null;
  } else if (state !== "completed_artifacts_pending" && (signedPdf || certificate)) return null;
  return { signed_pdf: signedPdf, certificate };
}

function safeDraft(input) {
  if (!object(input) || hasBlockedKey(input) || !hasOnlyKeys(input, DRAFT_KEYS)) return null;
  const draftId = ref(input.draft_id);
  return draftId ? { draft_id: draftId, approval_state: text(input.approval_state, 40), title: label(input.title, "문서"), immutable: input.immutable === true } : null;
}

function safeRequest(input) {
  if (!object(input)) return null;
  const source = object(input.item) ? input.item : input;
  if (!hasOnlyKeys(source, REQUEST_KEYS) || hasBlockedKey(source)) return null;
  const requestId = ref(source.request_id);
  const canonical = safeRef(source.canonical_document_ref);
  const state = STATES[source.state] ? source.state : "";
  const completionArtifacts = safeCompletionArtifacts(source.completion_artifacts, state);
  if (Object.hasOwn(source, "production_ready_claim") && source.production_ready_claim !== false) return null;
  return requestId && state && completionArtifacts ? { request_id: requestId, state, canonical_document_ref: canonical, can_send: source.can_send === true, can_reconcile: source.can_reconcile === true, completion_artifacts: completionArtifacts } : null;
}

function visibleError(value) {
  const candidate = typeof value === "string" ? value : value?.visibleMessage;
  const normalized = text(candidate, 180);
  return normalized && !/(?:tenant|actor|provider|credential|token|password|secret|path|storage|bytes?|sha|hash|contact|email|request[_ -]?id|document[_ -]?id)/iu.test(normalized)
    ? normalized : "문서 상태를 확인할 수 없습니다.";
}

function RefActions({ canonical, onCopy, onOpen, actionTestId = "document-canonical-actions" }) {
  if (!canonical) return null;
  return (
    <div className="outlook-flat-action-row" data-testid={actionTestId}>
      <span className="outlook-flat-action-label">문서 참조</span>
      <code className="outlook-one-line" data-testid="document-canonical-ref">{canonical}</code>
      {typeof onCopy === "function" ? <button type="button" className="outlook-flat-action-button" data-testid="document-canonical-copy" onClick={() => onCopy(canonical)}>참조 복사</button> : null}
      {typeof onOpen === "function" ? <button type="button" className="outlook-flat-action-button" data-testid="document-canonical-open" onClick={() => onOpen(canonical)}>열기</button> : null}
    </div>
  );
}

export function OutlookDocumentSigningPanel({
  templates = [], templateId = "", templateVersion = "", selectedTemplateId = "", selectedTemplateVersion = "", mergeValues = {}, mergeData, signerValues = {}, signerRoleRefs, draft = null,
  approval = null, publishedDocumentRef = null, esignRequests = [], requests, busy = false, loading = false, partial = false, error = "",
  onTemplateChange, onMergeValueChange, onSignerValueChange, onRequestApproval, onPublish, onSend, onReconcile, onCopy, onOpenDocument, onRetry,
}) {
  const safeTemplates = templatesOf(templates);
  const chosenId = ref(selectedTemplateId || templateId);
  const chosenVersion = templateVersionValue(selectedTemplateVersion || templateVersion);
  const selected = safeTemplates.find((item) => item.template_id === chosenId && item.template_version === chosenVersion) || null;
  const idCounts = templateIdCounts(safeTemplates);
  const merge = mergeData && typeof mergeData === "object" ? mergeData : mergeValues;
  const signer = signerRoleRefs && typeof signerRoleRefs === "object" ? signerRoleRefs : signerValues;
  const safeDraftValue = safeDraft(draft);
  const publishedRef = normalizeOutlookPublishedDocumentRef(publishedDocumentRef);
  const approvalState = text(approval?.decision || approval?.status, 40) === "approved" || safeDraftValue?.approval_state === "approved" ? "approved" : "required";
  const complete = Boolean(selected) && selected.merge_fields.every(({ key: fieldKey }) => valueOf(merge, fieldKey)) && selected.signer_roles.every(({ role_id, required }) => !required || valueOf(signer, role_id));
  const actionDisabled = Boolean(busy || loading || !selected || !complete || typeof onRequestApproval !== "function");
  const handleApproval = () => {
    if (actionDisabled) return;
    onRequestApproval({ template_id: selected.template_id, template_version: selected.template_version, merge_data: Object.fromEntries(selected.merge_fields.map(({ key: fieldKey }) => [fieldKey, valueOf(merge, fieldKey)])), signer_role_refs: selected.signer_roles.filter(({ role_id }) => valueOf(signer, role_id)).map(({ role_id }) => ({ role_id, party_ref: valueOf(signer, role_id) })) });
  };
  const requestIds = new Set();
  const safeRequests = (Array.isArray(requests) ? requests : esignRequests).map(safeRequest).filter((request) => {
    if (!request || requestIds.has(request.request_id)) return false;
    requestIds.add(request.request_id);
    return true;
  }).slice(0, MAX_ESIGN_REQUESTS);
  const statusText = loading ? "문서 상태 확인 중" : busy ? "처리 중" : "";
  return (
    <section className="outlook-document-signing-panel" data-testid="outlook-document-signing-panel" aria-busy={busy || loading ? "true" : "false"}>
      {statusText ? <p className="outlook-one-line" role="status" aria-live="polite" data-testid="document-status">{statusText}</p> : null}
      {error ? <p className="outlook-one-line" role="alert" data-testid="document-error">{visibleError(error)}</p> : null}
      {partial ? <p className="outlook-one-line" role="status" aria-live="polite" data-testid="document-partial">일부 문서 상태만 확인됨</p> : null}
      <OutlookOneLineField id="generated-document-template" name="generated_document_template" label="승인된 문서 서식" as="select" value={selected ? templateSelectionValue(selected) : ""} onChange={(event) => {
        const next = safeTemplates.find((item) => templateSelectionValue(item) === event.target.value);
        if (next) onTemplateChange?.({ template_id: next.template_id, template_version: next.template_version });
      }} disabled={Boolean(busy || loading) || !safeTemplates.length || typeof onTemplateChange !== "function"} data-testid="document-template-select">
        <option value="">승인된 서식 선택</option>
        {safeTemplates.map((item) => <option key={templateSelectionValue(item)} value={templateSelectionValue(item)}>{item.label}{idCounts.get(item.template_id) > 1 ? ` · ${item.template_version}` : ""}</option>)}
      </OutlookOneLineField>
      {!safeTemplates.length ? <p className="outlook-one-line" data-testid="document-empty">승인된 서식 없음</p> : null}
      {selected ? (
        <>
          {selected.merge_fields.map((field, index) => <OutlookOneLineField key={field.key} id={`document-merge-${index}`} name={`document_merge_${index}`} label={field.label} value={valueOf(merge, field.key)} onChange={(event) => onMergeValueChange?.(field.key, event.target.value)} disabled={Boolean(busy || loading) || typeof onMergeValueChange !== "function"} autoComplete="off" maxLength={1000} data-testid={`document-merge-field-${index}`} />)}
          {selected.signer_roles.map((role, index) => <OutlookOneLineField key={role.role_id} id={`document-signer-${index}`} name={`document_signer_${index}`} label={role.label} value={valueOf(signer, role.role_id)} onChange={(event) => onSignerValueChange?.(role.role_id, event.target.value)} disabled={Boolean(busy || loading) || typeof onSignerValueChange !== "function"} autoComplete="off" data-testid={`document-signer-field-${index}`} />)}
          <div className="outlook-flat-action-row" data-action-row="document.request-approval">
            <span className="outlook-flat-action-label">문서 상태</span><span className="outlook-one-line" data-testid="document-approval-state">{approvalState === "approved" ? "승인됨" : "승인 필요"}</span>
            <button type="button" className="outlook-flat-action-button" data-testid="document-request-approval" onClick={handleApproval} disabled={actionDisabled}>승인 요청</button>
          </div>
          {approvalState === "approved" && safeDraftValue ? <div className="outlook-flat-action-row" data-action-row="document.publish"><span className="outlook-flat-action-label">Vault 문서</span><button type="button" className="outlook-flat-action-button" data-testid="document-publish" onClick={() => onPublish?.(safeDraftValue.draft_id)} disabled={Boolean(busy || loading) || typeof onPublish !== "function" || safeDraftValue.immutable}>게시</button></div> : null}
        </>
      ) : null}
      {publishedRef ? <RefActions canonical={publishedRef} actionTestId="document-published-reference" onCopy={onCopy} onOpen={onOpenDocument} /> : null}
      {safeRequests.map((request) => <div key={request.request_id} className="outlook-flat-action-row" data-testid="document-esign-request"><span className="outlook-flat-action-label">서명 · {STATES[request.state]}</span>{request.can_send && typeof onSend === "function" ? <button type="button" className="outlook-flat-action-button" data-testid="document-esign-send" onClick={() => onSend(request.request_id)} disabled={Boolean(busy || loading)}>보내기</button> : null}{request.can_reconcile && typeof onReconcile === "function" ? <button type="button" className="outlook-flat-action-button" data-testid="document-esign-reconcile" onClick={() => onReconcile(request.request_id)} disabled={Boolean(busy || loading)}>상태 확인</button> : null}<RefActions canonical={request.canonical_document_ref} onCopy={onCopy} onOpen={onOpenDocument} /></div>)}
      {typeof onRetry === "function" && (error || partial) ? <div className="outlook-flat-action-row"><span className="outlook-flat-action-label">문서 상태</span><button type="button" className="outlook-flat-action-button" data-testid="document-retry" onClick={onRetry} disabled={Boolean(busy || loading)}>다시 시도</button></div> : null}
    </section>
  );
}

export default OutlookDocumentSigningPanel;
