import React, { useEffect, useRef, useState } from "react";
import {
  createOutlookDocumentApprovalIdempotencyKey, createOutlookDocumentApprovalRequest, createOutlookDocumentCatalogRequest,
  createOutlookDocumentPublishIdempotencyKey, createOutlookDocumentPublishRequest, createOutlookDocusignActionIdempotencyKey,
  createOutlookDocusignReconcileRequest, createOutlookDocusignSendRequest, parseOutlookDocumentApprovalResponse,
  parseOutlookDocumentCatalogResponse, parseOutlookDocumentPublishResponse,
  parseOutlookDocusignReconcileResponse, parseOutlookDocusignSendResponse,
} from "./outlook-document-signing.js";
import { OutlookDocumentSigningPanel } from "./outlook-document-signing-panel.jsx";

const ERROR = "문서 상태를 확인할 수 없습니다. 다시 시도해 주세요.";

function empty(owner = "") {
  return {
    owner, templates: [], approvals: [], selectedTemplateId: "", selectedTemplateVersion: "",
    mergeValues: {}, signerValues: {}, draft: null, approval: null, publishedDocumentRef: null,
    esignRequests: [], readiness: null, loading: false, busy: false, partial: false, error: "",
    retry: null, authoritative: false,
  };
}

function text(value) { return typeof value === "string" && value === value.trim() && value.length > 0; }

function sessionBoundary(error) { return error?.status === 401 || error?.statusCode === 401 || ["AUTH_SESSION_REQUIRED", "AUTH_SESSION_EXPIRED", "AUTH_SESSION_INVALID"].includes(error?.safe_error_code); }

function conflict(error) { return error?.status === 409 || error?.statusCode === 409; }

function owned(epoch, owner, snapshot, refs) {
  if (!refs.mounted.current || refs.epoch.current !== epoch || refs.owner.current !== owner) return false;
  try {
    return typeof refs.context.current === "function" && refs.context.current(snapshot) === true;
  } catch {
    return false;
  }
}

function approved(approval) { return approval?.decision === "approved" || approval?.status === "approved"; }

function matchingApproval(approvals, templateId, templateVersion, templateHash = "") {
  const matches = approvals.filter((item) => item.template_id === templateId && item.template_version === templateVersion && (!templateHash || item.template_hash === templateHash));
  return matches.find(approved) || matches[0] || null;
}

function minimalDraft(approval, templates) {
  if (!approval) return null;
  const template = templates.find((item) => item.template_id === approval.template_id && item.template_version === approval.template_version);
  return { draft_id: approval.draft_id, approval_state: approved(approval) ? "approved" : "approval_required", title: template?.label || "문서", immutable: false };
}

function publishChain(state, draftId) {
  const draft = state.draft;
  const approval = state.approval;
  const receipt = approval?.approval_receipt;
  const template = state.templates.find((item) => item.template_id === state.selectedTemplateId && item.template_version === state.selectedTemplateVersion);
  if (!draftId || draft?.draft_id !== draftId || approval?.draft_id !== draftId || !approved(approval) || !receipt || !template
    || approval.template_id !== template.template_id || approval.template_version !== template.template_version || approval.template_hash !== template.template_hash
    || (draft.template_id && draft.template_id !== approval.template_id) || (draft.template_version && draft.template_version !== approval.template_version)
    || (draft.template_hash && draft.template_hash !== approval.template_hash) || (draft.input_fingerprint && draft.input_fingerprint !== approval.input_fingerprint)) return null;
  return Object.freeze({ template_id: approval.template_id, template_version: approval.template_version, template_hash: approval.template_hash, input_fingerprint: approval.input_fingerprint, input_hash: receipt.input_hash, approval_receipt_id: receipt.receipt_id });
}

function catalogState(value, owner, previous) {
  const retry = previous.retry?.kind === "catalog" ? null : previous.retry;
  const oldSelection = value.templates.some((item) => item.template_id === previous.selectedTemplateId && item.template_version === previous.selectedTemplateVersion);
  const restored = value.approval_requests.find((item) => approved(item) && value.templates.some((template) => template.template_id === item.template_id && template.template_version === item.template_version && template.template_hash === item.template_hash));
  const selected = oldSelection
    ? { template_id: previous.selectedTemplateId, template_version: previous.selectedTemplateVersion }
    : restored || value.templates[0] || { template_id: "", template_version: "" };
  const selectedTemplate = value.templates.find((item) => item.template_id === selected.template_id && item.template_version === selected.template_version);
  const approval = matchingApproval(value.approval_requests, selected.template_id, selected.template_version, selectedTemplate?.template_hash);
  const sameSelection = selected.template_id === previous.selectedTemplateId && selected.template_version === previous.selectedTemplateVersion && previous.templates.some((item) => item.template_id === selected.template_id && item.template_version === selected.template_version && item.template_hash === selectedTemplate?.template_hash);
  return {
    ...empty(owner),
    templates: value.templates,
    approvals: value.approval_requests,
    selectedTemplateId: selected.template_id,
    selectedTemplateVersion: selected.template_version,
    mergeValues: sameSelection ? previous.mergeValues : {},
    signerValues: sameSelection ? previous.signerValues : {},
    draft: minimalDraft(approval, value.templates),
    approval,
    publishedDocumentRef: previous.publishedDocumentRef,
    esignRequests: value.esign_requests,
    readiness: value.readiness,
    partial: Boolean(retry) || value.readiness.esign_ready !== true,
    error: retry ? previous.error || ERROR : "",
    retry,
    authoritative: true,
  };
}

export function OutlookDocumentSigningFeature({
  requestJson, contextKey = "", matterId = "", offline = false, isContextCurrent, onCopy, onOpenDocument,
}) {
  const owner = `${contextKey}\u001f${matterId}`;
  const valid = typeof requestJson === "function" && typeof isContextCurrent === "function" && text(contextKey) && text(matterId);
  const [state, setState] = useState(() => empty(owner));
  const [refresh, setRefresh] = useState(0);
  const refs = {
    mounted: useRef(false), epoch: useRef(0), owner: useRef(owner), context: useRef(isContextCurrent), request: useRef(requestJson), operation: useRef(null),
  };
  refs.owner.current = owner; refs.context.current = isContextCurrent; refs.request.current = requestJson;

  useEffect(() => {
    refs.mounted.current = true;
    return () => { refs.mounted.current = false; refs.epoch.current += 1; refs.operation.current = null; };
  }, []);

  useEffect(() => {
    const epoch = ++refs.epoch.current;
    const snapshot = Object.freeze({ contextKey, matterId });
    const current = () => owned(epoch, owner, snapshot, refs);
    refs.operation.current = null;
    if (!valid || !current()) {
      setState(empty(owner));
      return () => { refs.epoch.current += 1; };
    }
    if (offline === true) {
      setState((value) => value.owner === owner ? { ...value, loading: false, busy: false } : empty(owner));
      return () => { refs.epoch.current += 1; };
    }
    let request;
    try { request = createOutlookDocumentCatalogRequest({ matter_id: matterId }); }
    catch { setState(empty(owner)); return () => { refs.epoch.current += 1; }; }
    setState((value) => value.owner === owner
      ? { ...value, loading: true, busy: false, error: "", authoritative: false }
      : { ...empty(owner), loading: true });
    (async () => {
      try {
        const response = await refs.request.current(request.path);
        if (!current()) return;
        const parsed = parseOutlookDocumentCatalogResponse(response, matterId);
        if (!current()) return;
        setState((value) => catalogState(parsed, owner, value.owner === owner ? value : empty(owner)));
      } catch (error) {
        if (!current()) return;
        if (sessionBoundary(error)) {
          setState((value) => value.owner === owner ? { ...value, loading: false, busy: false, authoritative: false, error: "", retry: null } : value);
          return;
        }
        setState((value) => value.owner === owner
          ? { ...value, loading: false, busy: false, authoritative: false, error: ERROR, retry: Object.freeze({ kind: "catalog" }) }
          : value);
      }
    })();
    return () => { refs.epoch.current += 1; };
  }, [contextKey, matterId, offline, owner, refresh, valid]);

  const visible = state.owner === owner ? state : empty(owner);
  const canMutate = valid && offline !== true && visible.authoritative;
  const snapshot = Object.freeze({ contextKey, matterId });

  function selectTemplate(next) { if (!owned(refs.epoch.current, owner, snapshot, refs)) return;
    setState((value) => {
      if (value.owner !== owner || value.retry) return value;
      const template = value.templates.find((item) => item.template_id === next?.template_id && item.template_version === next?.template_version);
      if (!template) return value;
      const approval = matchingApproval(value.approvals, template.template_id, template.template_version, template.template_hash);
      return { ...value, selectedTemplateId: template.template_id, selectedTemplateVersion: template.template_version, mergeValues: {}, signerValues: {}, draft: minimalDraft(approval, value.templates), approval, error: "", partial: value.readiness?.esign_ready !== true };
    });
  }

  function editInput(field, key, value) {
    if (!owned(refs.epoch.current, owner, snapshot, refs)) return;
    setState((current) => {
      if (current.owner !== owner || current[field]?.[key] === value) return current;
      return { ...current, [field]: { ...current[field], [key]: value }, draft: null, approval: null };
    });
  }

  function parseDescriptor(descriptor, response) {
    if (descriptor.kind === "approval") return parseOutlookDocumentApprovalResponse(response, { matter_id: matterId, template_id: descriptor.templateId, template_version: descriptor.templateVersion, template_hash: descriptor.templateHash, title: descriptor.title });
    if (descriptor.kind === "publish") return parseOutlookDocumentPublishResponse(response, { matter_id: matterId, draft_id: descriptor.draftId, ...descriptor.expected });
    return (descriptor.action === "send" ? parseOutlookDocusignSendResponse : parseOutlookDocusignReconcileResponse)(response, { matter_id: matterId, request_id: descriptor.requestId });
  }

  function applyResult(descriptor, parsed, retry) {
    setState((value) => {
      if (value.owner !== owner) return value;
      const common = { busy: false, partial: retry || value.readiness?.esign_ready !== true, error: retry ? ERROR : "", retry: retry ? descriptor : null };
      if (descriptor.kind === "approval") return { ...value, ...common, draft: parsed.draft || value.draft, approval: parsed.approval_request || (parsed.draft ? null : value.approval) };
      if (descriptor.kind === "publish") return { ...value, ...common, draft: parsed.draft || value.draft, publishedDocumentRef: parsed.canonical_document_ref || value.publishedDocumentRef };
      return { ...value, ...common, esignRequests: parsed.item ? value.esignRequests.map((item) => item.request_id === descriptor.requestId ? parsed.item : item) : value.esignRequests };
    });
  }

  async function operate(makeDescriptor) {
    const epoch = refs.epoch.current;
    if (refs.operation.current || !canMutate || !owned(epoch, owner, snapshot, refs)) return;
    const token = Symbol("document-operation");
    const current = () => refs.operation.current === token && owned(epoch, owner, snapshot, refs);
    refs.operation.current = token;
    setState((value) => value.owner === owner ? { ...value, busy: true, error: "" } : value);
    let descriptor = null;
    try {
      descriptor = await makeDescriptor();
      if (!descriptor || !current()) {
        if (current()) setState((value) => value.owner === owner ? { ...value, busy: false } : value);
        return;
      }
      const response = await refs.request.current(descriptor.request.path, { method: descriptor.request.method, body: descriptor.request.body });
      if (!current()) return;
      const parsed = parseDescriptor(descriptor, response);
      if (!current()) return;
      const retry = descriptor.kind === "approval" || descriptor.kind === "publish"
        ? parsed.partial === true
        : ["partial", "blocked", "provider_blocked", "reconciliation_required"].includes(parsed.outcome);
      applyResult(descriptor, parsed, retry);
    } catch (error) {
      if (!current()) return;
      if (sessionBoundary(error)) {
        setState((value) => value.owner === owner ? { ...value, busy: false, authoritative: false, partial: value.readiness?.esign_ready !== true, error: "", retry: null } : value);
        return;
      }
      if (conflict(error)) {
        setState((value) => value.owner === owner ? { ...value, busy: false, authoritative: false, partial: false, error: "", retry: null } : value);
        setRefresh((value) => value + 1);
        return;
      }
      if (descriptor) {
        try {
          const parsed = parseDescriptor(descriptor, error);
          if (current()) { applyResult(descriptor, parsed, true); return; }
        } catch { /* The generic safe error below is the only visible failure. */ }
      }
      setState((value) => value.owner === owner ? { ...value, busy: false, error: ERROR, retry: descriptor } : value);
    } finally {
      if (refs.operation.current === token) refs.operation.current = null;
    }
  }

  function requestApproval(input) {
    return operate(async () => {
      const template = visible.templates.find((item) => item.template_id === input?.template_id && item.template_version === input?.template_version);
      if (!template) return null;
      const intent = { matter_id: matterId, template_id: template.template_id, template_version: template.template_version, title: template.label, merge_data: input.merge_data, signer_role_refs: input.signer_role_refs };
      const idempotency_key = await createOutlookDocumentApprovalIdempotencyKey({ ...intent, template_hash: template.template_hash });
      return Object.freeze({ kind: "approval", templateId: template.template_id, templateVersion: template.template_version, templateHash: template.template_hash, title: template.label, request: createOutlookDocumentApprovalRequest({ ...intent, idempotency_key }) });
    });
  }

  function publish(draftId) {
    return operate(async () => {
      const expected = publishChain(visible, draftId);
      if (!expected) return null;
      const idempotency_key = await createOutlookDocumentPublishIdempotencyKey({ matter_id: matterId, draft_id: draftId });
      return Object.freeze({ kind: "publish", draftId, expected, request: createOutlookDocumentPublishRequest({ matter_id: matterId, draft_id: draftId, idempotency_key }) });
    });
  }

  function esign(action, requestId) {
    return operate(async () => {
      const item = visible.esignRequests.find((value) => value.request_id === requestId);
      if (!item || (action === "send" ? item.can_send !== true : item.can_reconcile !== true)) return null;
      const intent_id = globalThis.crypto.randomUUID();
      const idempotency_key = await createOutlookDocusignActionIdempotencyKey({ matter_id: matterId, request_id: requestId, action, intent_id });
      const build = action === "send" ? createOutlookDocusignSendRequest : createOutlookDocusignReconcileRequest;
      return Object.freeze({ kind: "esign", action, requestId, request: build({ matter_id: matterId, request_id: requestId, idempotency_key }) });
    });
  }

  function retry() { if (!owned(refs.epoch.current, owner, snapshot, refs)) return;
    if (visible.retry?.kind === "catalog") { setRefresh((value) => value + 1); return; }
    if (visible.retry) operate(async () => visible.retry);
  }

  const retryOnly = Boolean(visible.retry && visible.retry.kind !== "catalog");
  const publishReady = Boolean(publishChain(visible, visible.draft?.draft_id));
  return <OutlookDocumentSigningPanel
    templates={visible.templates} selectedTemplateId={visible.selectedTemplateId} selectedTemplateVersion={visible.selectedTemplateVersion}
    mergeValues={visible.mergeValues} signerValues={visible.signerValues} draft={visible.draft} approval={visible.approval}
    publishedDocumentRef={visible.publishedDocumentRef} esignRequests={visible.esignRequests} loading={visible.loading} busy={visible.busy}
    partial={visible.partial} error={visible.error} onTemplateChange={!retryOnly && canMutate ? selectTemplate : undefined}
    onMergeValueChange={!retryOnly && canMutate ? (key, value) => editInput("mergeValues", key, value) : undefined}
    onSignerValueChange={!retryOnly && canMutate ? (key, value) => editInput("signerValues", key, value) : undefined}
    onRequestApproval={!retryOnly && canMutate ? requestApproval : undefined} onPublish={!retryOnly && canMutate && publishReady ? publish : undefined}
    onSend={!retryOnly && canMutate ? (requestId) => esign("send", requestId) : undefined} onReconcile={!retryOnly && canMutate ? (requestId) => esign("reconcile", requestId) : undefined}
    onCopy={typeof onCopy === "function" ? (ref) => { if (owned(refs.epoch.current, owner, snapshot, refs)) onCopy(ref); } : undefined} onOpenDocument={typeof onOpenDocument === "function" ? (ref) => { if (owned(refs.epoch.current, owner, snapshot, refs)) onOpenDocument(ref); } : undefined} onRetry={visible.retry && offline !== true && valid ? retry : undefined}
  />;
}

export default OutlookDocumentSigningFeature;
