import React, { useEffect, useRef, useState } from "react";
import {
  createOutlookConversationPolicyCurrentRequest,
  createOutlookConversationPolicyEnableRequest,
  createOutlookConversationPolicyRevokeRequest,
  parseOutlookConversationPolicyCurrentResponse,
  parseOutlookConversationPolicyEnableResponse,
  parseOutlookConversationPolicyRevokeResponse,
} from "./outlook-conversation-policy.js";
import { OutlookConversationPolicyPanel } from "./outlook-conversation-policy-panel.jsx";

const EMPTY = Object.freeze({
  owner: "",
  policy: null,
  readiness: null,
  busy: false,
  error: null,
  syncPending: false,
  readable: false,
});

function text(value) {
  return typeof value === "string" && value === value.trim() && value.length > 0;
}

function sessionBoundary(error) {
  return error?.status === 401
    || error?.statusCode === 401
    || ["AUTH_SESSION_REQUIRED", "AUTH_SESSION_EXPIRED"].includes(error?.safe_error_code);
}

const versionConflict = (error) => error?.status === 409 || error?.statusCode === 409;

function owned({ epoch, epochRef, mountedRef, owner, ownerRef, snapshot, contextCurrentRef }) {
  if (!mountedRef.current || epochRef.current !== epoch || ownerRef.current !== owner) return false;
  const isContextCurrent = contextCurrentRef.current;
  if (typeof isContextCurrent !== "function") return false;
  try {
    return isContextCurrent(snapshot) === true;
  } catch {
    return false;
  }
}

function requestBody(request) {
  return { method: request.method, body: request.body };
}

async function readCurrent({ requestJsonRef, m365ConnectionId, matterId, conversationId, current }) {
  if (!current()) return null;
  const request = createOutlookConversationPolicyCurrentRequest({
    m365_connection_id: m365ConnectionId,
    matter_id: matterId,
    conversation_id: conversationId,
  });
  const requestJson = requestJsonRef.current; if (typeof requestJson !== "function") return null;
  const response = await requestJson(request.path);
  if (!current()) return null;
  const parsed = parseOutlookConversationPolicyCurrentResponse(response, {
    matter_id: matterId,
    conversation_id: conversationId,
  });
  return current() ? parsed : null;
}

export function OutlookConversationPolicyFeature({
  requestJson,
  contextKey = "",
  matterId = "",
  conversationId = "",
  m365ConnectionId = "",
  seedEmailThreadId = "",
  connectionRequired = false,
  offline = false,
  isContextCurrent,
  onReconnect,
}) {
  const owner = [
    contextKey, matterId, conversationId, m365ConnectionId, seedEmailThreadId,
    connectionRequired ? "connection-required" : "connection-ready",
  ].join("\u001f");
  const needsConnection = connectionRequired === true || !text(m365ConnectionId);
  const canRead = typeof requestJson === "function" && typeof isContextCurrent === "function"
    && text(contextKey) && !needsConnection && offline !== true && text(matterId) && text(conversationId);
  const [state, setState] = useState(EMPTY);
  const epochRef = useRef(0);
  const mountedRef = useRef(true);
  const ownerRef = useRef(owner);
  const contextCurrentRef = useRef(isContextCurrent); const requestJsonRef = useRef(requestJson);
  const intentRef = useRef(null); const inflightRef = useRef(false);
  ownerRef.current = owner; contextCurrentRef.current = isContextCurrent; requestJsonRef.current = requestJson;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      epochRef.current += 1;
    };
  }, []);

  useEffect(() => {
    const epoch = ++epochRef.current;
    const snapshot = Object.freeze({
      contextKey, matterId, conversationId, m365ConnectionId, seedEmailThreadId, connectionRequired, offline,
    });
    const current = () => owned({ epoch, epochRef, mountedRef, owner, ownerRef, snapshot, contextCurrentRef });
    intentRef.current = null;
    inflightRef.current = false;
    setState((value) => value.owner === owner
      ? { ...value, busy: canRead, error: null, readable: canRead }
      : { ...EMPTY, owner, busy: canRead, readable: canRead });
    if (!canRead) return () => { epochRef.current += 1; };

    (async () => {
      try {
        const parsed = await readCurrent({
          requestJsonRef, m365ConnectionId, matterId, conversationId, current,
        });
        if (!parsed || !current()) return;
        setState({ ...EMPTY, owner, policy: parsed.item, readiness: parsed.readiness, readable: true });
      } catch (error) {
        if (!current()) return;
        if (sessionBoundary(error)) return;
        setState((value) => value.owner === owner
          ? { ...value, busy: false, error: true, readable: true }
          : value);
      }
    })();
    return () => { epochRef.current += 1; };
  }, [canRead, connectionRequired, contextKey, conversationId, m365ConnectionId, matterId, offline, owner, seedEmailThreadId]);

  const visible = state.owner === owner ? state : { ...EMPTY, owner, busy: canRead, readable: canRead };
  const refreshing = canRead && state.owner === owner && state.readable !== true;
  const snapshot = Object.freeze({
    contextKey, matterId, conversationId, m365ConnectionId, seedEmailThreadId, connectionRequired, offline,
  });

  async function mutate(operation) {
    if (inflightRef.current || !canRead || !owned({
      epoch: epochRef.current, epochRef, mountedRef, owner, ownerRef, snapshot, contextCurrentRef,
    })) return;
    const policy = visible.policy;
    if (operation === "enable" && (!text(seedEmailThreadId) || ["active", "paused"].includes(policy?.status))) return;
    if (operation === "revoke" && !["active", "paused"].includes(policy?.status)) return;

    const epoch = epochRef.current;
    const current = () => owned({ epoch, epochRef, mountedRef, owner, ownerRef, snapshot, contextCurrentRef });
    inflightRef.current = true;
    setState((value) => value.owner === owner ? { ...value, busy: true, error: null } : value);
    try {
      let intent = intentRef.current;
      if (!intent || intent.owner !== owner || intent.operation !== operation) {
        const idempotencyKey = `outlook-conversation-${operation}:${globalThis.crypto.randomUUID()}`;
        const request = operation === "enable"
          ? createOutlookConversationPolicyEnableRequest({
            m365_connection_id: m365ConnectionId,
            matter_id: matterId,
            conversation_id: conversationId,
            seed_email_thread_id: seedEmailThreadId,
            expected_version: policy?.status === "revoked" ? policy.version : 0,
            idempotency_key: idempotencyKey,
            reason: "Outlook 대화 자동 저장 켜기",
          })
          : createOutlookConversationPolicyRevokeRequest({
            policy_id: policy.policy_id,
            m365_connection_id: m365ConnectionId,
            matter_id: matterId,
            expected_version: policy.version,
            idempotency_key: idempotencyKey,
            reason: "Outlook 대화 자동 저장 끄기",
          });
        intent = Object.freeze({ owner, operation, request });
        intentRef.current = intent;
      }
      const latestRequestJson = requestJsonRef.current; if (typeof latestRequestJson !== "function") return;
      const response = await latestRequestJson(intent.request.path, requestBody(intent.request));
      if (!current()) return;
      const parsed = operation === "enable"
        ? parseOutlookConversationPolicyEnableResponse(response, { matter_id: matterId, conversation_id: conversationId })
        : parseOutlookConversationPolicyRevokeResponse(response, { matter_id: matterId, conversation_id: conversationId });
      if (!current()) return;
      if (parsed.outcome === "idempotent_replay") {
        try {
          const authoritative = await readCurrent({
            requestJsonRef, m365ConnectionId, matterId, conversationId, current,
          });
          if (!authoritative || !current()) return;
          intentRef.current = null;
          setState((value) => value.owner === owner ? {
            ...value,
            policy: authoritative.item,
            readiness: authoritative.readiness,
            busy: false,
            error: null,
            readable: true,
            syncPending: parsed.subscription_sync === "retry_scheduled",
          } : value);
        } catch (error) {
          if (!current()) return;
          if (sessionBoundary(error)) return;
          setState((value) => value.owner === owner ? { ...value, busy: false, error: true } : value);
        }
        return;
      }
      intentRef.current = null;
      setState((value) => value.owner === owner ? {
        ...value,
        policy: parsed.item,
        busy: false,
        error: null,
        syncPending: parsed.subscription_sync === "retry_scheduled",
      } : value);
    } catch (error) {
      if (!current()) return;
      if (sessionBoundary(error)) return;
      if (versionConflict(error)) {
        intentRef.current = null;
        try {
          const authoritative = await readCurrent({
            requestJsonRef, m365ConnectionId, matterId, conversationId, current,
          });
          if (!authoritative || !current()) return;
          setState((value) => value.owner === owner ? {
            ...value,
            policy: authoritative.item,
            readiness: authoritative.readiness,
            busy: false,
            error: null,
            readable: true,
            syncPending: false,
          } : value);
        } catch (readError) {
          if (!current()) return;
          if (sessionBoundary(readError)) return;
          setState((value) => value.owner === owner ? { ...value, busy: false, error: true } : value);
        }
        return;
      }
      setState((value) => value.owner === owner ? {
        ...value,
        busy: false,
        error: true,
      } : value);
    } finally {
      if (current()) inflightRef.current = false;
    }
  }

  const active = ["active", "paused"].includes(visible.policy?.status);
  return (
    <OutlookConversationPolicyPanel
      policy={visible.policy}
      readiness={visible.readiness}
      connectionRequired={needsConnection}
      filingRequired={!active && !text(seedEmailThreadId)}
      syncPending={visible.syncPending}
      busy={visible.busy || refreshing}
      error={visible.error}
      onEnable={canRead && visible.readable ? () => mutate("enable") : undefined}
      onRevoke={canRead && visible.readable ? () => mutate("revoke") : undefined}
      onReconnect={onReconnect}
    />
  );
}

export default OutlookConversationPolicyFeature;
