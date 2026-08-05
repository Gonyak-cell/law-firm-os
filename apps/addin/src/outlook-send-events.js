/**
 * Office message-send event plumbing.
 *
 * This module deliberately has no React, window, or Office global dependency.
 * The task pane supplies the current-item reader, API client, notification
 * writer, and probe recorder so the same handler can run from the command
 * runtime and be tested in isolation.
 */

export const OUTLOOK_SEND_HANDLER_NAME = "onMessageSendHandler";
export const OUTLOOK_SMART_ALERTS_PATH = "/api/outlook/smart-alerts/evaluate";
export const OUTLOOK_SMART_ALERT_TIMEOUT_MS = 8_000;
export const OUTLOOK_WARNING_NOTIFICATION_TIMEOUT_MS = 1_000;

function safeErrorCode(error) {
  return error?.safe_error_code
    ?? error?.code
    ?? (typeof error?.message === "string" && error.message.trim()
      ? error.message.trim()
      : "smart_alert_evaluation_failed");
}

function warningCount(alertBody) {
  return Array.isArray(alertBody?.item?.warnings)
    ? alertBody.item.warnings.length
    : Number(alertBody?.item?.warning_count ?? 0) || 0;
}

function failureWarning(error) {
  return {
    item: {
      warnings: [{
        code: "smart_alert_evaluation_failed",
        safe_error_code: safeErrorCode(error),
      }],
    },
  };
}

function noop() {}

function timeoutError(code) {
  return Object.assign(new Error(code), { safe_error_code: code });
}

function settleWithin(value, {
  timeoutMs,
  timeoutCode,
  setTimeoutImpl,
  clearTimeoutImpl,
}) {
  return new Promise((resolve, reject) => {
    let settled = false;
    let timer = null;
    const finish = (callback, result) => {
      if (settled) return;
      settled = true;
      clearTimeoutImpl(timer);
      callback(result);
    };
    timer = setTimeoutImpl(
      () => finish(reject, timeoutError(timeoutCode)),
      timeoutMs,
    );
    Promise.resolve(value).then(
      (result) => finish(resolve, result),
      (error) => finish(reject, error),
    );
  });
}

/**
 * Handle Outlook's send event without ever blocking the send operation.
 *
 * `event.completed` is guarded locally rather than delegated to callers so a
 * late promise callback cannot complete the same Office event twice. Any
 * failure while reading the message, evaluating alerts, or adding a warning
 * is recorded and the send is explicitly allowed.
 */
export async function handleOutlookMessageSend({
  event = {},
  readMessage,
  requestJson,
  addWarningNotification = async () => {},
  record = noop,
  endpoint = OUTLOOK_SMART_ALERTS_PATH,
  requestTimeoutMs = OUTLOOK_SMART_ALERT_TIMEOUT_MS,
  notificationTimeoutMs = OUTLOOK_WARNING_NOTIFICATION_TIMEOUT_MS,
  setTimeoutImpl = globalThis.setTimeout,
  clearTimeoutImpl = globalThis.clearTimeout,
} = {}) {
  if (
    typeof setTimeoutImpl !== "function"
    || typeof clearTimeoutImpl !== "function"
    || !Number.isSafeInteger(requestTimeoutMs)
    || requestTimeoutMs < 1
    || !Number.isSafeInteger(notificationTimeoutMs)
    || notificationTimeoutMs < 1
  ) {
    throw new TypeError("Smart Alert timeouts are required");
  }
  let completed = false;
  const completeOnce = () => {
    const completion = { allowEvent: true };
    if (!completed) {
      completed = true;
      try {
        if (typeof event?.completed === "function") event.completed(completion);
      } catch {
        // Office owns the callback boundary. A throwing test double or host
        // callback must not cause a second completion attempt.
      }
    }
    return completion;
  };

  const recordResult = (payload) => {
    try {
      record("last_send_handler_result", payload);
    } catch {
      // Telemetry is best effort and must never change send behavior.
    }
  };

  try {
    const message = typeof readMessage === "function"
      ? await readMessage({ allowBodyReadFailure: true })
      : null;
    if (!message) {
      const completion = completeOnce();
      recordResult({
        outcome: "no_item",
        allowEvent: completion.allowEvent,
        raw_body_written: false,
        attachment_bytes_written: false,
      });
      return completion;
    }

    if (typeof requestJson !== "function") {
      throw new Error("smart_alert_request_unavailable");
    }
    const alertBody = await settleWithin(
      requestJson(endpoint, {
        method: "POST",
        body: { message },
        timeoutMs: requestTimeoutMs,
      }),
      {
        timeoutMs: requestTimeoutMs,
        timeoutCode: "OUTLOOK_SMART_ALERT_TIMEOUT",
        setTimeoutImpl,
        clearTimeoutImpl,
      },
    );

    let notificationError = null;
    try {
      await settleWithin(addWarningNotification(alertBody), {
        timeoutMs: notificationTimeoutMs,
        timeoutCode: "OUTLOOK_WARNING_NOTIFICATION_TIMEOUT",
        setTimeoutImpl,
        clearTimeoutImpl,
      });
    } catch (error) {
      notificationError = error;
    }

    const completion = completeOnce();
    recordResult({
      outcome: alertBody?.outcome ?? null,
      warning_count: warningCount(alertBody),
      send_blocked: alertBody?.item?.send_blocked === true,
      provider_runtime_executed: alertBody?.item?.provider_runtime_executed === true,
      allowEvent: completion.allowEvent,
      raw_body_written: false,
      attachment_bytes_written: false,
      ...(notificationError
        ? { notification_error: safeErrorCode(notificationError) }
        : {}),
    });
    return completion;
  } catch (error) {
    // A failed evaluation is warning-only in the current pilot. Make a best-
    // effort notification so the user knows the pre-send check was skipped,
    // then always allow the message to leave Outlook.
    try {
      await settleWithin(addWarningNotification(failureWarning(error)), {
        timeoutMs: notificationTimeoutMs,
        timeoutCode: "OUTLOOK_WARNING_NOTIFICATION_TIMEOUT",
        setTimeoutImpl,
        clearTimeoutImpl,
      });
    } catch {
      // Notification failure is recorded below but cannot block sending.
    }
    const completion = completeOnce();
    recordResult({
      outcome: "allowed_after_local_alert_error",
      safe_error_code: safeErrorCode(error),
      allowEvent: completion.allowEvent,
      raw_body_written: false,
      attachment_bytes_written: false,
    });
    return completion;
  }
}

/**
 * Register the exact manifest function name. Returning false keeps command
 * runtimes without Office.actions observable without throwing at bootstrap.
 */
export function registerOutlookSendHandler({
  Office = globalThis.Office,
  handler = handleOutlookMessageSend,
} = {}) {
  if (typeof Office?.actions?.associate !== "function") return false;
  Office.actions.associate(OUTLOOK_SEND_HANDLER_NAME, handler);
  return true;
}
