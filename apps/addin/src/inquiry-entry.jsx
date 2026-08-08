import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { Check, Link2, MailCheck, UserPlus } from "lucide-react";
import {
  AUTH_ERROR_CODES,
  AUTH_STATE,
} from "./addin-auth.js";
import {
  buildInquiryRegistrationRequest,
  inquiryResultCopy,
  outlookActionErrorMessage,
} from "./inquiry-actions.js";
import { assertStableOutlookItemIdentity } from "./outlook-item-content.js";
import { startOfficeTaskPane } from "./office-ready.js";
import { bootstrapOutlookSurface } from "./outlook-profile-bootstrap.js";
import { createOutlookTaskPaneRuntime } from "./outlook-taskpane-runtime.js";
import "./styles.css";

const { binding: SURFACE_BINDING, presentation: QUERY_PRESENTATION } =
  bootstrapOutlookSurface("inquiry-only");

function actionError(error) {
  if (!error) return "";
  if (error.user_message) return error.user_message;
  if (error.safe_error_code === "LAWOS_INTERACTION_REQUIRED" || error.safe_error_code === "AUTH_SESSION_REQUIRED") {
    return "AMIC OS에 로그인한 뒤 다시 시도해 주세요.";
  }
  if (error.safe_error_code === AUTH_ERROR_CODES.nestedAppAuthUnavailable
    || error.safe_error_code === AUTH_ERROR_CODES.nestedAppAuthUnsupported) {
    return "이 Outlook 환경에서는 보안 로그인을 사용할 수 없습니다.";
  }
  return outlookActionErrorMessage(error);
}

async function registerInquiryAction({
  action,
  existingLeadId,
  item,
  requestJson,
  isCurrentItem,
}) {
  assertStableOutlookItemIdentity(item);
  if (!isCurrentItem(item)) throw Object.assign(new Error("OUTLOOK_ITEM_CHANGED_DURING_ACTION"), {
    safe_error_code: "OUTLOOK_ITEM_CHANGED_DURING_ACTION",
    user_message: "처리 중 다른 메일로 이동했습니다. 현재 메일을 다시 선택해 주세요.",
  });
  const request = await buildInquiryRegistrationRequest({
    action,
    // Use the captured item identity. Resolving Office.context again here
    // could silently turn a write for A into a write for a newly selected B.
    rest_message_id: item.graph_message_id,
    ...(action === "link_existing" ? { existing_lead_id: existingLeadId } : {}),
  });
  if (!isCurrentItem(item)) throw Object.assign(new Error("OUTLOOK_ITEM_CHANGED_DURING_ACTION"), {
    safe_error_code: "OUTLOOK_ITEM_CHANGED_DURING_ACTION",
    user_message: "처리 중 다른 메일로 이동했습니다. 현재 메일을 다시 선택해 주세요.",
  });
  const body = await requestJson("/api/outlook/inquiries", {
    method: "POST",
    body: request,
  });
  if (!isCurrentItem(item)) {
    throw Object.assign(new Error("OUTLOOK_ITEM_CHANGED_DURING_ACTION"), {
      safe_error_code: "OUTLOOK_ITEM_CHANGED_DURING_ACTION",
      user_message: "처리 중 다른 메일로 이동했습니다. 현재 메일을 다시 선택해 주세요.",
    });
  }
  return {
    action,
    outcome: body.outcome,
    item: body.item,
    refreshInquiries: true,
  };
}

function InquiryApp({ runtime }) {
  const [view, setView] = useState(runtime.getState());
  const [inquiries, setInquiries] = useState([]);
  const [selectedLeadId, setSelectedLeadId] = useState("");
  const [inquiryError, setInquiryError] = useState(null);
  useEffect(() => {
    const unsubscribe = runtime.subscribe(setView);
    void runtime.start();
    return () => {
      unsubscribe();
      runtime.dispose();
    };
  }, [runtime]);

  const authenticated = view.authState === AUTH_STATE.authenticated;
  const loadInquiries = async () => {
    if (!authenticated) {
      setInquiries([]);
      setSelectedLeadId("");
      return;
    }
    try {
      const body = await runtime.requestJson("/api/outlook/inquiries?limit=50");
      const next = Array.isArray(body.items) ? body.items : [];
      setInquiries(next);
      setSelectedLeadId((current) => next.some(({ lead_id }) => lead_id === current)
        ? current
        : next[0]?.lead_id ?? "");
      setInquiryError(null);
    } catch (error) {
      setInquiryError(error);
    }
  };

  useEffect(() => { void loadInquiries(); }, [authenticated]);
  useEffect(() => { if (view.result) void loadInquiries(); }, [view.result]);

  const profileLabel = SURFACE_BINDING.profile.key === "inquiry-only" ? "Client 문의" : "메일 처리";
  const queryHint = QUERY_PRESENTATION.clientInquiryOnly ? "inquiry-only" : "fixed-inquiry-entry";
  const inquiryCopy = view.result ? inquiryResultCopy(view.result) : null;

  return (
    <main className="addin-shell" data-outlook-profile={SURFACE_BINDING.key} data-query-hint={queryHint}>
      <header className="pane-header">
        <div>
          <p className="eyebrow">AMIC OS</p>
          <h1>{profileLabel}</h1>
          <p className="subtitle">선택한 메일을 Client 문의 근거로 등록합니다.</p>
        </div>
        <MailCheck size={24} aria-hidden="true" />
      </header>

      <section className="pane-section">
        <div className="section-title"><MailCheck size={15} /><h2>현재 메일</h2></div>
        <strong className="subject">{view.item?.subject ?? "메일을 열어 주세요"}</strong>
        <p className="safe-copy">{view.item?.body_preview ?? "처리할 메일을 선택하면 내용이 표시됩니다."}</p>
      </section>

      {!authenticated ? (
        <section className="pane-section auth-card" data-testid="auth-gate">
          <strong>{view.authState === AUTH_STATE.unavailable ? "보안 로그인 사용 불가" : "AMIC OS 로그인 필요"}</strong>
          {view.authError ? <p className="error" role="alert">{actionError(view.authError)}</p> : null}
          {view.authState !== AUTH_STATE.unavailable ? (
            <button type="button" onClick={() => void runtime.signIn()} disabled={view.busy !== ""} data-testid="sign-in-button">
              AMIC OS 로그인
            </button>
          ) : null}
        </section>
      ) : null}

      <section className="pane-section action-section" aria-labelledby="inquiry-actions-title">
        <div className="section-title"><MailCheck size={15} /><h2 id="inquiry-actions-title">문의 처리</h2></div>
        <div className="action-list">
          <div className="action-item">
            <div className="action-copy"><strong>새 문의로 등록</strong><span>현재 메일을 근거로 Client 문의를 만듭니다.</span></div>
            <button type="button" onClick={() => void runtime.runAction("new")} disabled={!authenticated || !view.item || view.itemPending || view.busy !== ""} data-testid="new-inquiry-button">
              <UserPlus size={15} /> 새 문의 등록
            </button>
          </div>
          <div className="action-item">
            <div className="action-copy"><strong>기존 문의에 연결</strong><span>이미 접수한 문의에 이 메일을 추가합니다.</span></div>
            <label htmlFor="existing-inquiry-select">연결할 문의</label>
            <select id="existing-inquiry-select" value={selectedLeadId} onChange={(event) => setSelectedLeadId(event.target.value)} disabled={!authenticated || inquiries.length === 0 || view.itemPending || view.busy !== ""} data-testid="existing-inquiry-select">
              {inquiries.length === 0
                ? <option value="">연결할 문의가 없습니다</option>
                : inquiries.map((inquiry) => <option key={inquiry.lead_id} value={inquiry.lead_id}>{inquiry.display_name}</option>)}
            </select>
            <button className="secondary-button" type="button" onClick={() => void runtime.runAction("link_existing", { existingLeadId: selectedLeadId })} disabled={!authenticated || !view.item || view.itemPending || !selectedLeadId || view.busy !== ""} data-testid="link-inquiry-button">
              <Link2 size={15} /> 기존 문의에 연결
            </button>
          </div>
        </div>
      </section>

      {inquiryCopy ? (
        <section className="action-result success" role="status" aria-live="polite" data-testid="inquiry-status" data-action={view.result.action}>
          <Check size={17} />
          <div><strong>{inquiryCopy.title}</strong><span>{inquiryCopy.detail}</span></div>
        </section>
      ) : null}
      {view.busy ? <p className="notice" role="status" data-testid="busy-state">처리하고 있습니다.</p> : null}
      {inquiryError ? <p className="error" role="alert" data-testid="inquiry-load-error">{actionError(inquiryError)}</p> : null}
      {view.error ? <p className="error" role="alert" data-testid="error-state">{actionError(view.error)}</p> : null}
    </main>
  );
}

const runtime = createOutlookTaskPaneRuntime({
  actionHandler: registerInquiryAction,
});

startOfficeTaskPane({
  render: () => createRoot(document.getElementById("root")).render(<InquiryApp runtime={runtime} />),
  waitForReady: runtime.ensureOfficeReady,
  register: () => true,
});
