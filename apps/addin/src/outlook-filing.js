export const OUTLOOK_EMAIL_FILING_PATH = "/api/outlook/email/file";
export const OUTLOOK_SENT_FILING_PATH = "/api/outlook/sent/file";

function requiredText(value, field) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) throw new TypeError(`${field} is required`);
  return text;
}

/**
 * Build the request for an explicit filing action.
 *
 * The ordinary action stays on the received-mail endpoint. The sent-mail
 * endpoint is selected only by the explicit user action; the server remains
 * responsible for proving that the current Graph item is in Sent Items and
 * was sent by the authenticated mailbox.
 */
export function createOutlookFilingRequest({
  matterId,
  email,
  mode = "manual",
} = {}) {
  const nextMatterId = requiredText(matterId, "matter_id");
  if (!email || typeof email !== "object") throw new TypeError("email is required");
  if (mode !== "manual" && mode !== "sent") throw new TypeError("mode must be manual or sent");
  const sent = mode === "sent";
  const body = { matter_id: nextMatterId, email };
  return Object.freeze({
    path: sent ? OUTLOOK_SENT_FILING_PATH : OUTLOOK_EMAIL_FILING_PATH,
    method: "POST",
    body: Object.freeze(body),
    mode,
  });
}
