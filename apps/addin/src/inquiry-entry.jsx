import React, {
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
} from "react";
import { createRoot } from "react-dom/client";
import {
  AUTH_ERROR_CODES,
  AUTH_STATE,
} from "./addin-auth.js";
import {
  buildInquiryRegistrationRequest,
  createInquiryLoadFence,
  inquiryResultCopy,
  outlookInquiryActionErrorMessage,
} from "./inquiry-actions.js";
import { assertStableOutlookItemIdentity } from "./outlook-item-id.js";
import { startOfficeTaskPane } from "./office-ready.js";
import { bootstrapOutlookSurface } from "./outlook-profile-bootstrap.js";
import {
  buildInquiryActionResult,
  createOutlookInquiryRuntime,
} from "./outlook-inquiry-actions.js";
import { OUTLOOK_OPERATION_STATES } from "./outlook-operation-state.js";
import {
  OutlookInlineOperationState,
  OutlookOneLineField,
  OutlookOverlay,
  outlookRailButtonId,
} from "./outlook-compact-shell.jsx";
import { OutlookInquiryCompactShell } from "./outlook-inquiry-shell.jsx";
import {
  CLOSED_OUTLOOK_OVERLAY_STATE,
  OUTLOOK_OVERLAY_EVENT,
  invalidateOutlookOverlayForItemChange,
  reduceOutlookOverlayState,
} from "./outlook-overlay-state.js";
import { outlookItemIdentityKey } from "./outlook-item-events.js";
import "./styles.css";

bootstrapOutlookSurface("inquiry-only");

const INQUIRY_FEATURE_ID = "inquiry.entry";

function actionError(error) {
  if (!error) return "";
  if (error.safe_error_code === AUTH_ERROR_CODES.nestedAppAuthUnavailable
    || error.safe_error_code === AUTH_ERROR_CODES.nestedAppAuthUnsupported) {
    return "이 Outlook 환경에서는 보안 로그인을 사용할 수 없습니다.";
  }
  return outlookInquiryActionErrorMessage(error);
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
    user_message: "처리 중 다른 메일로 이동했습니다. 선택한 메일을 다시 열어 주세요.",
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
    user_message: "처리 중 다른 메일로 이동했습니다. 선택한 메일을 다시 열어 주세요.",
  });
  const body = await requestJson("/api/outlook/inquiries", {
    method: "POST",
    body: request,
  });
  return buildInquiryActionResult({ action, body, item, isCurrentItem });
}

function itemContextKey(item) {
  if (!item || typeof item !== "object") return "";
  const stable = outlookItemIdentityKey(item);
  if (stable) return stable;
  const fallback = [
    item.office_item_id,
    item.graph_message_id,
    item.internet_message_id,
    item.conversation_id,
  ]
    .filter((value) => typeof value === "string" && value.trim())
    .map((value) => value.trim())
    .join("\u001f");
  return fallback;
}

function CompactStatus({
  testId,
  dataAction,
  dataLeadId,
  dataReplay,
  status = OUTLOOK_OPERATION_STATES.idle,
  visibleMessage,
  fullMessage,
  children,
}) {
  return (
    <div
      className="outlook-flat-action-row outlook-inline-status-row"
      data-testid={testId}
      data-action={dataAction}
      data-lead-id={dataLeadId}
      data-replay={dataReplay}
    >
      <OutlookInlineOperationState
        status={status}
        visibleMessage={visibleMessage}
        fullMessage={fullMessage}
      />
      {children}
    </div>
  );
}

function inquiryOperationMessage(result) {
  const copy = result ? inquiryResultCopy(result) : null;
  if (!copy) return null;
  if (result.stale_item === true) {
    return {
      visibleMessage: "메일이 바뀌어 결과를 다시 확인해 주세요.",
      fullMessage: "문의 등록은 완료됐습니다. 같은 메일을 다시 열고 같은 요청을 다시 실행하면 기존 결과를 확인할 수 있습니다.",
      status: OUTLOOK_OPERATION_STATES.staleItem,
    };
  }
  return {
    visibleMessage: copy.title,
    fullMessage: [copy.title, copy.detail].filter(Boolean).join(" "),
    status: result.item?.idempotent_replay === true
      ? OUTLOOK_OPERATION_STATES.duplicate
      : OUTLOOK_OPERATION_STATES.complete,
  };
}

function reduceInquiryOverlayState(state, event = {}) {
  if (event.type === OUTLOOK_OVERLAY_EVENT.itemChanged) {
    return invalidateOutlookOverlayForItemChange(state, event.itemContextKey);
  }
  return reduceOutlookOverlayState(state, event);
}

function InquiryApp({ runtime }) {
  const [view, setView] = useState(runtime.getState());
  const [inquiries, setInquiries] = useState([]);
  const [selectedLeadId, setSelectedLeadId] = useState("");
  const [inquiryError, setInquiryError] = useState(null);
  const [overlayState, dispatchOverlay] = useReducer(
    reduceInquiryOverlayState,
    CLOSED_OUTLOOK_OVERLAY_STATE,
  );
  const [resultContextKey, setResultContextKey] = useState("");
  const [inquiryLoadFence] = useState(createInquiryLoadFence);
  const previousItemContextKey = useRef({ initialized: false, key: "" });

  const currentItemContextKey = itemContextKey(view.item);
  const authenticated = view.authState === AUTH_STATE.authenticated;

  useEffect(() => {
    const unsubscribe = runtime.subscribe((next) => {
      if (inquiryLoadFence.transition(next.authState === AUTH_STATE.authenticated)) {
        setInquiries([]);
        setSelectedLeadId("");
        setInquiryError(null);
      }
      setView(next);
    });
    void runtime.start();
    return () => {
      unsubscribe();
      runtime.dispose();
    };
  }, [runtime]);

  useEffect(() => {
    const previous = previousItemContextKey.current;
    const changed = previous.initialized && previous.key !== currentItemContextKey;
    previousItemContextKey.current = { initialized: true, key: currentItemContextKey };
    if (changed) {
      dispatchOverlay({
        type: OUTLOOK_OVERLAY_EVENT.itemChanged,
        itemContextKey: currentItemContextKey,
      });
      if (!previous.key && currentItemContextKey) {
        dispatchOverlay({
          type: OUTLOOK_OVERLAY_EVENT.close,
          reason: "item-changed",
        });
      }
      setResultContextKey((current) => current === previous.key ? "" : current);
    }
  }, [currentItemContextKey]);

  useEffect(() => {
    if (!authenticated) {
      setResultContextKey("");
      dispatchOverlay({ type: OUTLOOK_OVERLAY_EVENT.close, reason: "auth-required" });
    }
  }, [authenticated]);

  const loadInquiries = useCallback(async () => {
    if (!authenticated) {
      setInquiries([]);
      setSelectedLeadId("");
      return;
    }
    const isCurrentLoad = inquiryLoadFence.begin(authenticated);
    try {
      const body = await runtime.requestJson("/api/outlook/inquiries?limit=50");
      if (!isCurrentLoad()) return;
      const next = Array.isArray(body.items) ? body.items : [];
      setInquiries(next);
      setSelectedLeadId((current) => next.some(({ lead_id }) => lead_id === current)
        ? current
        : next[0]?.lead_id ?? "");
      setInquiryError(null);
    } catch (error) {
      if (isCurrentLoad()) setInquiryError(error);
    }
  }, [authenticated, inquiryLoadFence, runtime]);

  useEffect(() => { void loadInquiries(); }, [loadInquiries]);
  useEffect(() => { if (view.result) void loadInquiries(); }, [loadInquiries, view.result]);

  const openOverlay = useCallback(() => {
    dispatchOverlay({
      type: OUTLOOK_OVERLAY_EVENT.open,
      featureId: INQUIRY_FEATURE_ID,
      view: "catalog",
      openerId: outlookRailButtonId("inquiry.entry"),
      itemContextKey: currentItemContextKey,
    });
  }, [currentItemContextKey]);

  const closeOverlay = useCallback((reason = "close") => {
    dispatchOverlay({
      type: reason === "escape"
        ? OUTLOOK_OVERLAY_EVENT.escape
        : reason === "outside"
          ? OUTLOOK_OVERLAY_EVENT.outside
          : OUTLOOK_OVERLAY_EVENT.close,
      reason,
    });
  }, []);

  const runInquiryAction = useCallback(async (action, payload = {}) => {
    if (!currentItemContextKey) return null;
    setResultContextKey(currentItemContextKey);
    return runtime.runAction(action, payload);
  }, [currentItemContextKey, runtime]);

  const operationMessage = (
    resultContextKey === currentItemContextKey
    || view.result?.stale_item === true
    || view.result?.source_item_context_key === currentItemContextKey
  )
    ? inquiryOperationMessage(view.result)
    : null;
  const activeError = inquiryError || view.error;
  const staleResult = view.staleResult;
  const authChecking = view.authState === AUTH_STATE.loading || view.authState === AUTH_STATE.acquiring;
  const stateStatus = !authenticated
    ? {
      testId: "auth-gate",
      status: view.authState === AUTH_STATE.unavailable
        ? OUTLOOK_OPERATION_STATES.failed
        : authChecking
          ? OUTLOOK_OPERATION_STATES.working
          : OUTLOOK_OPERATION_STATES.reconnectRequired,
      visibleMessage: view.authState === AUTH_STATE.unavailable
        ? "로그인을 사용할 수 없습니다."
        : view.authState === AUTH_STATE.acquiring
          ? "로그인 중입니다."
          : "로그인이 필요합니다.",
      fullMessage: actionError(view.authError) || "AMIC OS 로그인이 필요합니다.",
      action: view.authState !== AUTH_STATE.unavailable ? (
        <button
          type="button"
          className="outlook-flat-action-button"
          onClick={() => void runtime.signIn()}
          disabled={view.busy !== ""}
          data-testid="sign-in-button"
        >
          AMIC OS 로그인
        </button>
      ) : null,
    }
      : view.itemPending
      ? {
        testId: "busy-state",
        status: OUTLOOK_OPERATION_STATES.working,
        visibleMessage: "메일을 읽는 중입니다.",
        fullMessage: "선택한 Outlook 메일의 안전한 식별자와 미리보기를 확인하고 있습니다.",
      }
      : !view.item
        ? {
          testId: "item-state",
          status: OUTLOOK_OPERATION_STATES.idle,
          visibleMessage: "메일을 선택해 주세요.",
          fullMessage: "문의로 등록하거나 연결할 Outlook 메일을 먼저 선택해 주세요.",
        }
        : view.busy
          ? {
            testId: "busy-state",
            status: OUTLOOK_OPERATION_STATES.working,
            visibleMessage: "처리 중입니다.",
            fullMessage: "문의 등록 요청을 취소하지 말고 서버 결과를 기다려 주세요.",
          }
          : activeError
            ? {
              testId: view.error ? "error-state" : "inquiry-load-error",
              status: OUTLOOK_OPERATION_STATES.failed,
              visibleMessage: "처리하지 못했습니다.",
              fullMessage: actionError(activeError),
            }
            : staleResult
              ? {
                testId: "stale-state",
                status: OUTLOOK_OPERATION_STATES.staleItem,
                visibleMessage: "처리 결과가 다른 메일에 남아 있습니다.",
                fullMessage: "완료된 문의 결과는 원래 메일에 저장했습니다. 원래 메일을 다시 열고 같은 요청을 다시 실행해 기존 결과를 확인해 주세요.",
              }
            : operationMessage
              ? {
                testId: "inquiry-status",
                status: operationMessage.status,
                visibleMessage: operationMessage.visibleMessage,
                fullMessage: operationMessage.fullMessage,
                action: null,
              }
              : null;

  const status = stateStatus ? (
    <CompactStatus
      testId={stateStatus.testId}
      dataAction={stateStatus.testId === "inquiry-status" ? view.result?.action : undefined}
      dataLeadId={stateStatus.testId === "inquiry-status" ? view.result?.item?.lead_id ?? "" : undefined}
      dataReplay={stateStatus.testId === "inquiry-status"
        ? view.result?.item?.idempotent_replay === true ? "true" : "false"
        : undefined}
      status={stateStatus.status}
      visibleMessage={stateStatus.visibleMessage}
      fullMessage={stateStatus.fullMessage}
    >
      {stateStatus.action}
    </CompactStatus>
  ) : null;

  const actionDisabled = !authenticated
    || !view.item
    || view.itemPending
    || view.busy !== ""
    || !currentItemContextKey;
  const linkDisabled = actionDisabled || !selectedLeadId;
  const overlay = (
    <OutlookOverlay
      state={overlayState}
      onClose={closeOverlay}
      heading="문의"
      closeLabel="닫기"
    >
      <div data-inquiry-overlay="true">
        <div className="outlook-flat-action-row" data-action-row="inquiry.create">
          <button
            type="button"
            className="outlook-flat-action-button"
            onClick={() => void runInquiryAction("new")}
            disabled={actionDisabled}
            data-testid="new-inquiry-button"
          >
            새 문의 등록
          </button>
        </div>
        <div className="outlook-flat-action-row" data-action-row="inquiry.link-existing">
          <OutlookOneLineField
            id="existing-inquiry-select"
            label="연결할 문의"
            as="select"
            value={selectedLeadId}
            onChange={(event) => setSelectedLeadId(event.target.value)}
            disabled={!authenticated || inquiries.length === 0 || view.itemPending || view.busy !== ""}
            data-testid="existing-inquiry-select"
          >
            {inquiries.length === 0
              ? <option value="">연결할 문의가 없습니다</option>
              : inquiries.map((inquiry) => (
                <option key={inquiry.lead_id} value={inquiry.lead_id}>{inquiry.display_name}</option>
              ))}
          </OutlookOneLineField>
          <button
            type="button"
            className="outlook-flat-action-button"
            onClick={() => void runInquiryAction("link_existing", { existingLeadId: selectedLeadId })}
            disabled={linkDisabled}
            data-testid="link-inquiry-button"
          >
            기존 문의 연결
          </button>
        </div>
      </div>
    </OutlookOverlay>
  );

  return (
    <OutlookInquiryCompactShell
      activeFeature={overlayState.open ? overlayState.featureId ?? "" : ""}
      onFeatureSelect={({ featureId }) => {
        if (featureId === INQUIRY_FEATURE_ID) openOverlay();
      }}
      status={status}
      overlay={overlay}
    >
      {null}
      </OutlookInquiryCompactShell>
  );
}

const runtime = createOutlookInquiryRuntime({
  actionHandler: registerInquiryAction,
});

startOfficeTaskPane({
  render: () => createRoot(document.getElementById("root")).render(<InquiryApp runtime={runtime} />),
  waitForReady: runtime.ensureOfficeReady,
  register: () => true,
});
