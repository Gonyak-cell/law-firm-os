import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { AlertTriangle, Check, FileText, FolderDown, MailCheck, Search, ShieldCheck, TimerReset } from "lucide-react";
import { PublicClientApplication } from "@azure/msal-browser";
import "./styles.css";

const ADDIN_SESSION_STORAGE_KEY = "lawos_addin_session_token";
const params = new URLSearchParams(window.location.search);
const TENANT_ID = params.get("tenantId") ?? "tenant_rp05_synthetic";
const PROOF_MATTER_ID = params.get("matterId") ?? "matter_rp05_synthetic";
const ENTRA_CLIENT_ID = params.get("entraClientId") ?? "";
const ENTRA_TENANT_ID = params.get("entraTenantId") ?? "organizations";
const MSAL_SCOPES = params.getAll("msalScope").length > 0 ? params.getAll("msalScope") : ["openid", "profile", "User.Read", "Mail.Read"];
let msalBridgePromise = null;

function apiBaseUrl() {
  const fromQuery = params.get("apiBase");
  if (fromQuery) return fromQuery.replace(/\/+$/, "");
  const fromOffice = window.Office?.context?.requirements ? "" : "";
  return fromOffice;
}

async function addinSessionToken() {
  try {
    const token = window.sessionStorage?.getItem(ADDIN_SESSION_STORAGE_KEY);
    if (token) return token;
  } catch {
  }
  try {
    return (await window.OfficeRuntime?.storage?.getItem?.(ADDIN_SESSION_STORAGE_KEY)) ?? "";
  } catch {
    return "";
  }
}

async function initializeMsalBridge() {
  if (!ENTRA_CLIENT_ID) {
    const unconfigured = {
      configured: false,
      initialized: false,
      account_count: 0,
      scopes: MSAL_SCOPES,
      provider_runtime_executed: false,
      graph_request_executed: false,
      token_material_returned: false,
      production_write_claim: false,
      reason: "entra_client_id_missing",
    };
    recordOutlookEventProbe("msal_bridge", unconfigured);
    return unconfigured;
  }

  if (!msalBridgePromise) {
    msalBridgePromise = (async () => {
      const instance = new PublicClientApplication({
        auth: {
          clientId: ENTRA_CLIENT_ID,
          authority: `https://login.microsoftonline.com/${ENTRA_TENANT_ID}`,
        },
        cache: {
          cacheLocation: "sessionStorage",
          storeAuthStateInCookie: false,
        },
      });
      await instance.initialize();
      const accounts = instance.getAllAccounts();
      const receipt = {
        configured: true,
        initialized: true,
        account_count: accounts.length,
        scopes: MSAL_SCOPES,
        provider_runtime_executed: false,
        graph_request_executed: false,
        token_material_returned: false,
        production_write_claim: false,
      };
      recordOutlookEventProbe("msal_bridge", receipt);
      return receipt;
    })();
  }
  return msalBridgePromise;
}

async function requestJson(path, { method = "GET", body } = {}) {
  const token = await addinSessionToken();
  const headers = { "content-type": "application/json" };
  if (token) headers.authorization = `Bearer ${token}`;
  const response = await fetch(`${apiBaseUrl()}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.safe_error_codes?.[0] ?? payload.message ?? "request_failed");
  return payload;
}

function recordOutlookEventProbe(key, value) {
  window.__LAWOS_OUTLOOK_EVENT_PROBE = {
    ...(window.__LAWOS_OUTLOOK_EVENT_PROBE ?? {}),
    [key]: value,
  };
}

function completeSendEvent(event, payload = {}) {
  const completion = { allowEvent: true, ...payload };
  recordOutlookEventProbe("last_completion", {
    allowEvent: completion.allowEvent,
    completed_at: new Date().toISOString(),
  });
  if (typeof event?.completed === "function") event.completed(completion);
  return completion;
}

function officeItemSnapshot() {
  const item = window.Office?.context?.mailbox?.item;
  const now = new Date().toISOString();
  if (!item) {
    return {
      graph_message_id: "graph-proof-outlook-001",
      internet_message_id: "<proof-outlook-001@amic.law>",
      conversation_id: "conversation-proof-outlook",
      from: { name: "상대방 담당자", email: "counsel@example.com" },
      to: [{ name: "AMIC 변호사", email: "lawyer@amic.law" }],
      cc: [{ name: "고객 담당자", email: "client@example.com" }],
      bcc: [],
      subject: "계약 검토 의견 및 첨부",
      body_preview: "계약 검토 의견입니다. 첨부 확인 부탁드립니다.",
      sent_at: now,
      received_at: now,
      mailbox_ref: "mailbox:proof",
      account_ref: "account:outlook-proof",
      attachments: [
        {
          attachment_id: "att-proof-contract",
          name: "계약검토의견.txt",
          content_type: "text/plain",
          content_text: "계약 검토 의견 proof attachment",
          confidentiality: "confidential",
        },
        {
          attachment_id: "att-proof-reference",
          name: "참고자료.txt",
          content_type: "text/plain",
          content_text: "참고자료 proof attachment",
          confidentiality: "internal",
        },
      ],
    };
  }
  return {
    graph_message_id: item.itemId ?? `office-item-${Date.now()}`,
    internet_message_id: item.internetMessageId ?? `<${item.itemId ?? Date.now()}@outlook.office>`,
    conversation_id: item.conversationId ?? `conversation:${item.itemId ?? Date.now()}`,
    from: item.from ? { name: item.from.displayName, email: item.from.emailAddress } : { name: null, email: "unknown@outlook" },
    to: Array.isArray(item.to) ? item.to.map((recipient) => ({ name: recipient.displayName, email: recipient.emailAddress })) : [],
    cc: Array.isArray(item.cc) ? item.cc.map((recipient) => ({ name: recipient.displayName, email: recipient.emailAddress })) : [],
    bcc: [],
    subject: item.subject ?? "제목 없음",
    body_preview: item.normalizedSubject ?? item.subject ?? "",
    sent_at: item.dateTimeCreated ? new Date(item.dateTimeCreated).toISOString() : now,
    received_at: item.dateTimeModified ? new Date(item.dateTimeModified).toISOString() : now,
    mailbox_ref: "mailbox:officejs",
    account_ref: window.Office?.context?.mailbox?.userProfile?.emailAddress ?? "account:officejs",
    attachments: Array.isArray(item.attachments)
      ? item.attachments.map((attachment) => ({
          attachment_id: attachment.id,
          name: attachment.name,
          content_type: attachment.contentType,
          size: attachment.size,
          confidentiality: "internal",
        }))
      : [],
  };
}

async function addWarningNotification(alertBody) {
  const warnings = alertBody?.item?.warnings ?? [];
  const notificationMessages = window.Office?.context?.mailbox?.item?.notificationMessages;
  if (warnings.length === 0 || typeof notificationMessages?.addAsync !== "function") return;
  const messageType = window.Office?.MailboxEnums?.ItemNotificationMessageType?.InformationalMessage ?? "informationalMessage";
  await new Promise((resolve) => {
    notificationMessages.addAsync(
      "lawos-smart-alert-warning",
      {
        type: messageType,
        message: `${warnings.length} warning`,
        icon: "icon16",
        persistent: false,
      },
      () => resolve(),
    );
  });
}

export async function onMessageSendHandler(event = {}) {
  try {
    const body = await requestJson("/api/outlook/smart-alerts/evaluate", {
      method: "POST",
      body: { message: officeItemSnapshot() },
    });
    await addWarningNotification(body);
    const completion = completeSendEvent(event, { allowEvent: true });
    recordOutlookEventProbe("last_send_handler_result", {
      outcome: body.outcome ?? null,
      warning_count: body.item?.warning_count ?? 0,
      send_blocked: body.item?.send_blocked === true,
      provider_runtime_executed: body.item?.provider_runtime_executed === true,
      allowEvent: completion.allowEvent,
      raw_body_written: false,
      attachment_bytes_written: false,
    });
    return completion;
  } catch (error) {
    const completion = completeSendEvent(event, { allowEvent: true });
    recordOutlookEventProbe("last_send_handler_result", {
      outcome: "allowed_after_local_alert_error",
      safe_error_code: error?.message ?? "smart_alert_evaluation_failed",
      allowEvent: completion.allowEvent,
      raw_body_written: false,
      attachment_bytes_written: false,
    });
    return completion;
  }
}

function registerOutlookEventHandlers() {
  window.__LAWOS_INIT_MSAL_BRIDGE = initializeMsalBridge;
  window.__LAWOS_OUTLOOK_ASSOCIATED_HANDLERS = {
    ...(window.__LAWOS_OUTLOOK_ASSOCIATED_HANDLERS ?? {}),
    onMessageSendHandler,
  };
  const associated = new Set(window.__LAWOS_OUTLOOK_ASSOCIATED_ACTIONS ?? []);
  if (typeof window.Office?.actions?.associate === "function") {
    window.Office.actions.associate("onMessageSendHandler", onMessageSendHandler);
    associated.add("onMessageSendHandler");
  }
  window.__LAWOS_OUTLOOK_ASSOCIATED_ACTIONS = [...associated];
}

function StatusLine({ icon: Icon, label, value, tone = "neutral" }) {
  return (
    <div className={`status-line ${tone}`}>
      <Icon size={15} />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function outcomeLabel(value, fallback) {
  return {
    created: "완료",
    attachments_saved: "저장됨",
    idempotent_replay: "확인됨",
  }[value] ?? fallback;
}

function App() {
  const [bootstrap, setBootstrap] = useState(null);
  const [matters, setMatters] = useState([]);
  const [selectedMatterId, setSelectedMatterId] = useState(PROOF_MATTER_ID);
  const [emailResult, setEmailResult] = useState(null);
  const [attachmentResult, setAttachmentResult] = useState(null);
  const [followupResult, setFollowupResult] = useState(null);
  const [alertResult, setAlertResult] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const item = useMemo(() => officeItemSnapshot(), []);

  async function loadBase() {
    setError("");
    const [boot, matterBody] = await Promise.all([
      requestJson(`/api/outlook/bootstrap?tenant_id=${encodeURIComponent(TENANT_ID)}`),
      requestJson(`/api/outlook/matters?tenant_id=${encodeURIComponent(TENANT_ID)}&q=${encodeURIComponent(PROOF_MATTER_ID)}`),
    ]);
    setBootstrap(boot.item);
    setMatters(matterBody.items ?? []);
    if (matterBody.items?.[0]?.matter_id) setSelectedMatterId(matterBody.items[0].matter_id);
  }

  async function refreshMatter() {
    if (!selectedMatterId) return;
    const [timelineBody, documentBody] = await Promise.all([
      requestJson(`/api/outlook/matters/${encodeURIComponent(selectedMatterId)}/timeline?tenant_id=${encodeURIComponent(TENANT_ID)}`),
      requestJson(`/api/outlook/matters/${encodeURIComponent(selectedMatterId)}/documents?tenant_id=${encodeURIComponent(TENANT_ID)}`),
    ]);
    setTimeline(timelineBody.item?.visible_entries ?? []);
    setDocuments(documentBody.items ?? []);
  }

  useEffect(() => {
    loadBase().then(refreshMatter).catch((nextError) => setError(nextError.message));
  }, []);

  async function runAction(name, fn) {
    setBusy(name);
    setError("");
    try {
      await fn();
      await refreshMatter();
    } catch (nextError) {
      setError(nextError.message);
    } finally {
      setBusy("");
    }
  }

  async function fileEmail() {
    const body = await requestJson("/api/outlook/email/file", {
      method: "POST",
      body: { tenant_id: TENANT_ID, matter_id: selectedMatterId, email: item },
    });
    setEmailResult(body);
  }

  async function saveAttachments() {
    const threadId = emailResult?.email_thread?.email_thread_id ?? `thread:${item.conversation_id}`;
    const body = await requestJson("/api/outlook/attachments/save", {
      method: "POST",
      body: {
        tenant_id: TENANT_ID,
        matter_id: selectedMatterId,
        email_thread_id: threadId,
        selected_attachment_ids: item.attachments.map((attachment) => attachment.attachment_id),
        attachments: item.attachments,
      },
    });
    setAttachmentResult(body);
  }

  async function createFollowup() {
    const threadId = emailResult?.email_thread?.email_thread_id ?? `thread:${item.conversation_id}`;
    const body = await requestJson("/api/outlook/followups", {
      method: "POST",
      body: {
        tenant_id: TENANT_ID,
        matter_id: selectedMatterId,
        kind: "task",
        title: "메일 검토 후 후속 조치",
        due_at: "2026-07-10T09:00:00.000Z",
        source_email_thread_id: threadId,
      },
    });
    setFollowupResult(body);
  }

  async function evaluateAlerts() {
    const body = await requestJson("/api/outlook/smart-alerts/evaluate", {
      method: "POST",
      body: {
        message: {
          to: [{ name: "외부 수신자", email: "outside@example.com" }],
          body_preview: "첨부 확인 부탁드립니다.",
          attachments: [{ attachment_id: "conf-1", name: "비밀자료.pdf", confidentiality: "highly_confidential" }],
        },
      },
    });
    setAlertResult(body);
  }

  const selectedMatter = matters.find((matter) => matter.matter_id === selectedMatterId) ?? matters[0];

  return (
    <main className="addin-shell" data-outlook-addin-taskpane="true">
      <header className="pane-header">
        <div>
          <p className="eyebrow">Outlook filing</p>
          <h1>matter 연결</h1>
        </div>
        <span className="mode-badge">경고 전용</span>
      </header>

      <section className="status-stack" aria-label="연결 상태">
        <StatusLine icon={ShieldCheck} label="인증" value={bootstrap?.auth_shell?.signed_session_supported ? "세션 확인" : "대기"} tone="good" />
        <StatusLine icon={MailCheck} label="M365" value={bootstrap?.external_receipt_boundary?.entra_admin_consent_receipt_present ? "외부 영수증 있음" : "provider-gated"} />
        <StatusLine icon={AlertTriangle} label="발송 정책" value="차단 없음" tone="warn" />
      </section>

      <section className="pane-section">
        <div className="section-title">
          <Search size={15} />
          <h2>matter 선택</h2>
        </div>
        <select value={selectedMatterId} onChange={(event) => setSelectedMatterId(event.target.value)} data-testid="matter-select">
          {matters.map((matter) => (
            <option key={matter.matter_id} value={matter.matter_id}>
              {matter.lookup_label}
            </option>
          ))}
        </select>
        <p className="safe-copy">{selectedMatter?.client_display_name ?? "고객명 없음"} · {selectedMatter?.status ?? "상태 없음"}</p>
      </section>

      <section className="pane-section">
        <div className="section-title">
          <FileText size={15} />
          <h2>현재 메일</h2>
        </div>
        <strong className="subject">{item.subject}</strong>
        <p className="safe-copy">{item.body_preview}</p>
        <div className="button-row">
          <button type="button" onClick={() => runAction("file", fileEmail)} disabled={!selectedMatterId || busy !== ""} data-testid="file-email-button">
            <MailCheck size={15} />
            메일 filing
          </button>
          <button type="button" onClick={() => runAction("attachments", saveAttachments)} disabled={!emailResult || busy !== ""} data-testid="save-attachments-button">
            <FolderDown size={15} />
            첨부 저장
          </button>
        </div>
      </section>

      <section className="pane-section">
        <div className="section-title">
          <TimerReset size={15} />
          <h2>후속 조치</h2>
        </div>
        <div className="button-row">
          <button type="button" onClick={() => runAction("followup", createFollowup)} disabled={!emailResult || busy !== ""} data-testid="create-task-button">
            <Check size={15} />
            업무 생성
          </button>
          <button type="button" onClick={() => runAction("alerts", evaluateAlerts)} disabled={busy !== ""} data-testid="smart-alert-button">
            <AlertTriangle size={15} />
            경고 점검
          </button>
        </div>
      </section>

      <section className="result-strip" data-testid="proof-status">
        <span data-testid="email-status" data-outcome={emailResult?.outcome ?? ""}>{outcomeLabel(emailResult?.outcome, "메일 대기")}</span>
        <span data-testid="attachment-status" data-outcome={attachmentResult?.outcome ?? ""}>{outcomeLabel(attachmentResult?.outcome, "첨부 대기")}</span>
        <span data-testid="followup-status" data-outcome={followupResult?.outcome ?? ""}>{outcomeLabel(followupResult?.outcome, "업무 대기")}</span>
        <span data-testid="alert-status">{alertResult?.item?.warning_count ?? 0} warning</span>
      </section>

      <section className="pane-section two-col">
        <div>
          <div className="section-title">
            <MailCheck size={15} />
            <h2>timeline</h2>
          </div>
          <ul className="compact-list" data-testid="timeline-list">
            {timeline.slice(0, 4).map((entry) => (
              <li key={entry.event_id}>{entry.title}</li>
            ))}
          </ul>
        </div>
        <div>
          <div className="section-title">
            <FolderDown size={15} />
            <h2>문서</h2>
          </div>
          <ul className="compact-list" data-testid="document-list">
            {documents.slice(0, 4).map((document) => (
              <li key={document.document_id}>{document.title}</li>
            ))}
          </ul>
        </div>
      </section>

      {busy ? <p className="notice" data-testid="busy-state">처리 중: {busy}</p> : null}
      {error ? <p className="error" data-testid="error-state">{error}</p> : null}
    </main>
  );
}

registerOutlookEventHandlers();
createRoot(document.getElementById("root")).render(<App />);
