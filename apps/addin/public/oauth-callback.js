const status = document.getElementById("status");
const params = new URLSearchParams(window.location.hash.slice(1));
const message = {
  type: "lawos-outlook-oauth",
  state: params.get("state") || "",
  code: params.get("code") || "",
  error: params.get("error") || "",
};
window.history.replaceState(null, "", window.location.pathname);

function show(messageText) {
  if (status) status.textContent = messageText;
}

function send() {
  if (!message.state || (!message.code && !message.error)) {
    show("연결 결과가 올바르지 않습니다. 이 창을 닫고 다시 시도해 주세요.");
    return;
  }
  const serialized = JSON.stringify(message);
  if (typeof window.Office?.context?.ui?.messageParent !== "function") {
    show("연결 응답을 전달할 수 없습니다. Outlook에서 다시 시도해 주세요.");
    return;
  }
  try {
    window.Office.context.ui.messageParent(serialized, {
      targetOrigin: window.location.origin,
    });
    show("연결 응답을 전달했습니다. 이 창을 닫아도 됩니다.");
  } catch {
    show("연결 응답을 전달하지 못했습니다. 이 창을 닫고 다시 시도해 주세요.");
  }
}

if (typeof window.Office?.onReady === "function") {
  window.Office.onReady(send);
} else {
  send();
}
