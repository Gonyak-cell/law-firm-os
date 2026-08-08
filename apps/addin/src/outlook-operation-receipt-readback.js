const SUMMARY_FIELDS = new Set([
  "item_context_ref",
  "matter_id",
  "operation",
  "outcome",
  "filing_mode",
  "request_id",
  "email_thread_id",
  "document_ids",
  "timeline_event_ids",
  "completed_at",
]);
const OPERATIONS = new Set(["file_email", "save_attachments", "create_followup", "operation"]);
const FILING_MODES = new Set(["manual", "sent"]);
const OUTCOMES = new Set([
  "created",
  "idempotent_replay",
  "attachments_saved",
  "pending",
  "prepared",
  "passed",
  "blocked",
  "denied",
  "review_required",
  "evaluated",
  "identity_resolved",
  "message_resolved",
  "authorization_started",
  "completed",
]);
const MAX_REF_LENGTH = 256;

function safeRef(value) {
  if (typeof value !== "string") return "";
  const next = value.normalize("NFKC").trim();
  return next
    && next.length <= MAX_REF_LENGTH
    && !/[\s@]|:\/\//u.test(next)
    && !/[\u0000-\u001f\u007f]/u.test(next)
    ? next
    : "";
}

function refs(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(safeRef).filter(Boolean))].sort();
}

function isoDate(value) {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : "";
}

export function sanitizeOutlookOperationReceiptSummary(
  summary,
  { itemContextRef = "", matterId = "" } = {},
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) return null;
  if (Object.keys(summary).some((field) => !SUMMARY_FIELDS.has(field))) return null;
  const context = safeRef(summary.item_context_ref ?? itemContextRef);
  const matter = safeRef(summary.matter_id ?? matterId);
  const operation = safeRef(summary.operation);
  const outcome = safeRef(summary.outcome);
  const hasFilingMode = Object.hasOwn(summary, "filing_mode");
  const filingMode = hasFilingMode ? safeRef(summary.filing_mode) : operation === "file_email" ? "manual" : "";
  const completedAt = isoDate(summary.completed_at);
  if (
    !/^item-context:[a-f0-9]{16}$/u.test(context)
    || !matter
    || !OPERATIONS.has(operation)
    || !OUTCOMES.has(outcome)
    || (operation === "file_email" && !FILING_MODES.has(filingMode))
    || (operation !== "file_email" && filingMode)
    || !completedAt
  ) return null;
  const documentIds = refs(summary.document_ids);
  const timelineEventIds = refs(summary.timeline_event_ids);
  const requestId = safeRef(summary.request_id);
  const emailThreadId = safeRef(summary.email_thread_id);
  return Object.freeze({
    item_context_ref: context,
    matter_id: matter,
    operation,
    outcome,
    ...(hasFilingMode && filingMode ? { filing_mode: filingMode } : {}),
    ...(requestId ? { request_id: requestId } : {}),
    ...(emailThreadId ? { email_thread_id: emailThreadId } : {}),
    ...(documentIds.length ? { document_ids: Object.freeze(documentIds) } : {}),
    ...(timelineEventIds.length ? { timeline_event_ids: Object.freeze(timelineEventIds) } : {}),
    completed_at: completedAt,
  });
}
