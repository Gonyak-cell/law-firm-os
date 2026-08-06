const status = document.getElementById("status");
const params = new URLSearchParams(window.location.hash.slice(1));
const message = {
  type: "lawos-outlook-oauth",
  state: params.get("state") || "",
  code: params.get("code") || "",
  error: params.get("error") || "",
};
let delivered = false;
try {
  if (typeof window.history?.replaceState === "function") {
    window.history.replaceState(null, "", window.location.pathname);
  }
} catch {
  // URL scrubbing is best-effort; it must not block callback delivery.
}

function show(messageText) {
  if (status) status.textContent = messageText;
}

function send({ finalAttempt = false } = {}) {
  if (delivered) return true;
  if (!message.state || (!message.code && !message.error)) {
    delivered = true;
    show("연결 결과가 올바르지 않습니다. 이 창을 닫고 다시 시도해 주세요.");
    return true;
  }
  const serialized = JSON.stringify(message);
  if (typeof window.Office?.context?.ui?.messageParent !== "function") {
    if (finalAttempt) show("연결 응답을 전달할 수 없습니다. Outlook에서 다시 시도해 주세요.");
    return false;
  }
  try {
    window.Office.context.ui.messageParent(serialized, {
      targetOrigin: window.location.origin,
    });
    delivered = true;
    show("연결 응답을 전달했습니다. 이 창을 닫아도 됩니다.");
    return true;
  } catch {
    if (finalAttempt) show("연결 응답을 전달하지 못했습니다. 이 창을 닫고 다시 시도해 주세요.");
    return false;
  }
}

const timer = window.setTimeout(() => send({ finalAttempt: true }), 5_000);
const onOfficeReady = () => {
  if (send({ finalAttempt: true })) window.clearTimeout(timer);
};
try {
  window.Office.initialize = onOfficeReady;
  window.Office.onReady?.(onOfficeReady);
} catch {
  // The bounded final attempt still handles hosts that reject readiness registration.
}
