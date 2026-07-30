import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  AlertTriangle,
  Archive,
  Check,
  FileText,
  FolderDown,
  Link2,
  MailCheck,
  ShieldCheck,
  TimerReset,
  UserPlus,
} from "lucide-react";
import { PublicClientApplication } from "@azure/msal-browser";
import {
  buildInquiryRegistrationRequest,
  inquiryResultCopy,
  outlookActionErrorMessage,
} from "./inquiry-actions.js";
import {
  resolveCurrentOutlookRestMessageId,
} from "./outlook-item-id.js";
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
  let payload;
  try {
    payload = await response.json();
  } catch {
    const error = new Error("API_RESPONSE_INVALID");
    error.safe_error_code = "API_RESPONSE_INVALID";
    throw error;
  }
  if (!response.ok) {
    const code = payload.safe_error_codes?.[0]
      ?? payload.message
      ?? "request_failed";
    const error = new Error(code);
    error.safe_error_code = code;
    error.status = response.status;
    throw error;
  }
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
        message: `확인할 내용이 ${warnings.length}건 있습니다.`,
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
  window.__LAWOS_RESOLVE_CURRENT_OUTLOOK_REST_MESSAGE_ID =
    () => resolveCurrentOutlookRestMessageId({
      Office: window.Office,
    });
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
    created: "보관 완료",
    attachments_saved: "첨부 저장 완료",
    idempotent_replay: "이미 처리됨",
  }[value] ?? fallback;
}

function busyLabel(value) {
  return {
    new_inquiry: "새 문의를 등록하고 있습니다.",
    link_inquiry: "기존 문의에 연결하고 있습니다.",
    file: "Matter에 메일을 보관하고 있습니다.",
    attachments: "첨부 파일을 저장하고 있습니다.",
    followup: "후속 업무를 만들고 있습니다.",
    alerts: "발송 전 확인 사항을 점검하고 있습니다.",
  }[value] ?? "처리하고 있습니다.";
}

function App() {
  const [bootstrap, setBootstrap] = useState(null);
  const [matters, setMatters] = useState([]);
  const [inquiries, setInquiries] = useState([]);
  const [selectedMatterId, setSelectedMatterId] = useState(PROOF_MATTER_ID);
  const [selectedLeadId, setSelectedLeadId] = useState("");
  const [inquiryResult, setInquiryResult] = useState(null);
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
    const [boot, matterBody, inquiryBody] = await Promise.all([
      requestJson(`/api/outlook/bootstrap?tenant_id=${encodeURIComponent(TENANT_ID)}`),
      requestJson(`/api/outlook/matters?tenant_id=${encodeURIComponent(TENANT_ID)}&q=${encodeURIComponent(PROOF_MATTER_ID)}`),
      requestJson(`/api/outlook/inquiries?tenant_id=${encodeURIComponent(TENANT_ID)}&limit=50`),
    ]);
    const nextMatters = matterBody.items ?? [];
    const nextMatterId = nextMatters.find(
      (matter) => matter.matter_id === PROOF_MATTER_ID,
    )?.matter_id ?? nextMatters[0]?.matter_id ?? "";
    const nextInquiries = inquiryBody.items ?? [];
    setBootstrap(boot.item);
    setMatters(nextMatters);
    setSelectedMatterId(nextMatterId);
    setInquiries(nextInquiries);
    setSelectedLeadId(nextInquiries[0]?.lead_id ?? "");
    await refreshMatter(nextMatterId);
  }

  async function loadInquiries() {
    const body = await requestJson(
      `/api/outlook/inquiries?tenant_id=${encodeURIComponent(TENANT_ID)}&limit=50`,
    );
    const nextInquiries = body.items ?? [];
    setInquiries(nextInquiries);
    setSelectedLeadId((current) => (
      nextInquiries.some((inquiry) => inquiry.lead_id === current)
        ? current
        : nextInquiries[0]?.lead_id ?? ""
    ));
  }

  async function refreshMatter(matterId = selectedMatterId) {
    if (!matterId) {
      setTimeline([]);
      setDocuments([]);
      return;
    }
    const [timelineBody, documentBody] = await Promise.all([
      requestJson(`/api/outlook/matters/${encodeURIComponent(matterId)}/timeline?tenant_id=${encodeURIComponent(TENANT_ID)}`),
      requestJson(`/api/outlook/matters/${encodeURIComponent(matterId)}/documents?tenant_id=${encodeURIComponent(TENANT_ID)}`),
    ]);
    setTimeline(timelineBody.item?.visible_entries ?? []);
    setDocuments(documentBody.items ?? []);
  }

  useEffect(() => {
    loadBase().catch((nextError) => {
      setError(outlookActionErrorMessage(nextError));
    });
  }, []);

  async function runAction(name, fn) {
    setBusy(name);
    setError("");
    try {
      await fn();
    } catch (nextError) {
      setError(outlookActionErrorMessage(nextError));
    } finally {
      setBusy("");
    }
  }

  async function registerInquiry(action) {
    const identity = resolveCurrentOutlookRestMessageId({
      Office: window.Office,
    });
    const request = await buildInquiryRegistrationRequest({
      tenant_id: TENANT_ID,
      action,
      rest_message_id: identity.rest_message_id,
      ...(action === "link_existing"
        ? { existing_lead_id: selectedLeadId }
        : {}),
    });
    const body = await requestJson("/api/outlook/inquiries", {
      method: "POST",
      body: request,
    });
    setInquiryResult({
      action,
      outcome: body.outcome,
      item: body.item,
    });
    await loadInquiries();
  }

  async function fileEmail() {
    const body = await requestJson("/api/outlook/email/file", {
      method: "POST",
      body: { tenant_id: TENANT_ID, matter_id: selectedMatterId, email: item },
    });
    setEmailResult(body);
    await refreshMatter(selectedMatterId);
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
    await refreshMatter(selectedMatterId);
  }

  async function createFollowup() {
    const threadId = emailResult?.email_thread?.email_thread_id ?? `thread:${item.conversation_id}`;
    const dueAt = new Date(Date.now() + (24 * 60 * 60 * 1000))
      .toISOString();
    const body = await requestJson("/api/outlook/followups", {
      method: "POST",
      body: {
        tenant_id: TENANT_ID,
        matter_id: selectedMatterId,
        kind: "task",
        title: "메일 검토 후 후속 조치",
        due_at: dueAt,
        source_email_thread_id: threadId,
      },
    });
    setFollowupResult(body);
    await refreshMatter(selectedMatterId);
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
  const inquiryCopy = inquiryResult
    ? inquiryResultCopy(inquiryResult)
    : null;

  return (
    <main className="addin-shell" data-outlook-addin-taskpane="true">
      <header className="pane-header">
        <div>
          <p className="eyebrow">Outlook</p>
          <h1>메일 처리</h1>
        </div>
        <span className="mode-badge">확인 후 저장</span>
      </header>

      <section className="status-stack" aria-label="연결 상태">
        <StatusLine icon={ShieldCheck} label="로그인" value={bootstrap?.auth_shell?.signed_session_supported ? "연결됨" : "확인 중"} tone="good" />
        <StatusLine icon={MailCheck} label="Outlook" value={bootstrap?.external_receipt_boundary?.entra_admin_consent_receipt_present ? "연결됨" : "연결 확인 필요"} />
        <StatusLine icon={AlertTriangle} label="발송 전 확인" value="안내만 표시" tone="warn" />
      </section>

      <section className="pane-section">
        <div className="section-title">
          <FileText size={15} />
          <h2>현재 메일</h2>
        </div>
        <strong className="subject">{item.subject}</strong>
        <p className="safe-copy">{item.body_preview}</p>
      </section>

      <section className="pane-section action-section" aria-labelledby="mail-actions-title">
        <div className="section-title">
          <MailCheck size={15} />
          <h2 id="mail-actions-title">이 메일 처리</h2>
        </div>

        <div className="action-list">
          <div className="action-item">
            <div className="action-copy">
              <strong>새 문의로 등록</strong>
              <span>현재 메일을 근거로 문의 기록을 만듭니다.</span>
            </div>
            <button
              type="button"
              onClick={() => runAction(
                "new_inquiry",
                () => registerInquiry("new"),
              )}
              disabled={busy !== ""}
              data-testid="new-inquiry-button"
            >
              <UserPlus size={15} />
              새 문의 등록
            </button>
          </div>

          <div className="action-item">
            <div className="action-copy">
              <strong>기존 문의에 연결</strong>
              <span>이미 접수한 문의에 이 메일을 추가합니다.</span>
            </div>
            <label htmlFor="existing-inquiry-select">연결할 문의</label>
            <select
              id="existing-inquiry-select"
              value={selectedLeadId}
              onChange={(event) => setSelectedLeadId(event.target.value)}
              disabled={inquiries.length === 0 || busy !== ""}
              data-testid="existing-inquiry-select"
            >
              {inquiries.length === 0
                ? <option value="">연결할 문의가 없습니다</option>
                : inquiries.map((inquiry) => (
                  <option key={inquiry.lead_id} value={inquiry.lead_id}>
                    {inquiry.display_name}
                  </option>
                ))}
            </select>
            <button
              className="secondary-button"
              type="button"
              onClick={() => runAction(
                "link_inquiry",
                () => registerInquiry("link_existing"),
              )}
              disabled={!selectedLeadId || busy !== ""}
              data-testid="link-inquiry-button"
            >
              <Link2 size={15} />
              기존 문의에 연결
            </button>
          </div>

          <div className="action-item">
            <div className="action-copy">
              <strong>Matter에 보관</strong>
              <span>선택한 Matter의 메일 기록에 보관합니다.</span>
            </div>
            <label htmlFor="matter-select">보관할 Matter</label>
            <select
              id="matter-select"
              value={selectedMatterId}
              onChange={(event) => setSelectedMatterId(event.target.value)}
              disabled={matters.length === 0 || busy !== ""}
              data-testid="matter-select"
            >
              {matters.length === 0
                ? <option value="">선택할 Matter가 없습니다</option>
                : matters.map((matter) => (
                  <option key={matter.matter_id} value={matter.matter_id}>
                    {matter.lookup_label}
                  </option>
                ))}
            </select>
            <p className="field-note">
              {selectedMatter?.client_display_name ?? "고객 정보 없음"}
            </p>
            <button
              className="secondary-button"
              type="button"
              onClick={() => runAction("file", fileEmail)}
              disabled={!selectedMatterId || busy !== ""}
              data-testid="file-email-button"
            >
              <Archive size={15} />
              Matter에 보관
            </button>
          </div>
        </div>
      </section>

      {inquiryCopy ? (
        <section
          className="action-result success"
          role="status"
          aria-live="polite"
          data-testid="inquiry-status"
          data-action={inquiryResult.action}
          data-lead-id={inquiryResult.item?.lead_id ?? ""}
          data-replay={inquiryResult.item?.idempotent_replay === true ? "true" : "false"}
        >
          <Check size={17} />
          <div>
            <strong>{inquiryCopy.title}</strong>
            <span>{inquiryCopy.detail}</span>
          </div>
        </section>
      ) : null}

      {emailResult ? (
        <section className="action-result success" role="status" aria-live="polite">
          <Check size={17} />
          <div>
            <strong>
              {emailResult.outcome === "idempotent_replay"
                ? "이미 Matter에 보관된 메일입니다."
                : "Matter에 보관했습니다."}
            </strong>
            <span>{selectedMatter?.lookup_label ?? selectedMatterId}</span>
          </div>
        </section>
      ) : null}

      <section className="pane-section">
        <div className="section-title">
          <TimerReset size={15} />
          <h2>추가 작업</h2>
        </div>
        <div className="button-row">
          <button className="secondary-button" type="button" onClick={() => runAction("attachments", saveAttachments)} disabled={!emailResult || busy !== ""} data-testid="save-attachments-button">
            <FolderDown size={15} />
            첨부 파일 저장
          </button>
          <button className="secondary-button" type="button" onClick={() => runAction("followup", createFollowup)} disabled={!emailResult || busy !== ""} data-testid="create-task-button">
            <Check size={15} />
            후속 업무 만들기
          </button>
          <button className="secondary-button full-width" type="button" onClick={() => runAction("alerts", evaluateAlerts)} disabled={busy !== ""} data-testid="smart-alert-button">
            <AlertTriangle size={15} />
            발송 전 확인
          </button>
        </div>
      </section>

      <section className="operation-summary" data-testid="proof-status" aria-label="추가 작업 결과">
        <span data-testid="email-status" data-outcome={emailResult?.outcome ?? ""}>{outcomeLabel(emailResult?.outcome, "Matter 보관 전")}</span>
        <span data-testid="attachment-status" data-outcome={attachmentResult?.outcome ?? ""}>{outcomeLabel(attachmentResult?.outcome, "첨부 저장 전")}</span>
        <span data-testid="followup-status" data-outcome={followupResult?.outcome ?? ""}>{outcomeLabel(followupResult?.outcome, "후속 업무 전")}</span>
        <span data-testid="alert-status" data-warning-count={alertResult?.item?.warning_count ?? 0}>확인할 내용 {alertResult?.item?.warning_count ?? 0}건</span>
      </section>

      <section className="pane-section two-col">
        <div>
          <div className="section-title">
            <MailCheck size={15} />
            <h2>최근 기록</h2>
          </div>
          <ul className="compact-list" data-testid="timeline-list">
            {timeline.length === 0
              ? <li className="empty-item">기록이 없습니다.</li>
              : timeline.slice(0, 4).map((entry) => (
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
            {documents.length === 0
              ? <li className="empty-item">문서가 없습니다.</li>
              : documents.slice(0, 4).map((document) => (
                <li key={document.document_id}>{document.title}</li>
              ))}
          </ul>
        </div>
      </section>

      {busy ? <p className="notice" role="status" aria-live="polite" data-testid="busy-state">{busyLabel(busy)}</p> : null}
      {error ? <p className="error" role="alert" data-testid="error-state">{error}</p> : null}
    </main>
  );
}

registerOutlookEventHandlers();
createRoot(document.getElementById("root")).render(<App />);
