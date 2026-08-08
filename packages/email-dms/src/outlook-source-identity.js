export const OUTLOOK_SOURCE_IDENTITY_FIELDS = Object.freeze([
  "canonical_graph_message_id",
  "rest_message_id",
  "internet_message_id",
  "conversation_id",
  "item_key",
]);

const ITEM_KEY_SEPARATOR = "\u001f";

const OUTLOOK_SOURCE_IDENTITY_ALIASES = Object.freeze([
  "graph_message_id",
  "graph_immutable_message_id",
  "immutable_message_id",
  "message_id",
  "outlook_item_key",
  "local_outlook_item_key",
  "immutable_item_key",
  "graphMessageId",
  "immutableMessageId",
  "messageId",
  "restMessageId",
  "internetMessageId",
  "conversationId",
  "canonicalGraphMessageId",
  "outlookItemKey",
  "localOutlookItemKey",
  "immutableItemKey",
  "itemKey",
]);

function exactText(value, field, { itemKey = false } = {}) {
  if (
    typeof value !== "string"
    || value.length === 0
    || value.length > 16_384
    || value !== value.trim()
    || (!itemKey && /[\u0000-\u001f\u007f]/u.test(value))
  ) {
    throw new TypeError(`Outlook source identity ${field} is invalid`);
  }
  return value;
}

export function outlookSourceItemKey(identity = {}) {
  return [
    exactText(identity.rest_message_id, "rest_message_id"),
    exactText(identity.internet_message_id, "internet_message_id"),
    exactText(identity.conversation_id, "conversation_id"),
  ].join(ITEM_KEY_SEPARATOR);
}

export function parseExactOutlookSourceIdentity(input, { exactShape = false } = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError("Outlook source identity is required");
  }
  if (
    exactShape
    && (
      Object.keys(input).length !== OUTLOOK_SOURCE_IDENTITY_FIELDS.length
      || OUTLOOK_SOURCE_IDENTITY_FIELDS.some((field) => !Object.hasOwn(input, field))
    )
  ) {
    throw new TypeError("Outlook source identity has an invalid shape");
  }
  const identity = Object.freeze({
    canonical_graph_message_id: exactText(
      input.canonical_graph_message_id,
      "canonical_graph_message_id",
    ),
    rest_message_id: exactText(input.rest_message_id, "rest_message_id"),
    internet_message_id: exactText(input.internet_message_id, "internet_message_id"),
    conversation_id: exactText(input.conversation_id, "conversation_id"),
    item_key: exactText(input.item_key, "item_key", { itemKey: true }),
  });
  if (identity.item_key !== outlookSourceItemKey(identity)) {
    throw new TypeError("Outlook source identity item_key is mismatched");
  }
  return identity;
}

export function assertExactOutlookSourceIdentity(expected, actual, options = {}) {
  const left = parseExactOutlookSourceIdentity(expected);
  const right = parseExactOutlookSourceIdentity(actual, options);
  if (OUTLOOK_SOURCE_IDENTITY_FIELDS.some((field) => left[field] !== right[field])) {
    throw new TypeError("Outlook source identity is incomplete or mismatched");
  }
  return right;
}

export function parseCapturedOutlookSourceIdentity(input) {
  const identity = parseExactOutlookSourceIdentity(input);
  if (OUTLOOK_SOURCE_IDENTITY_ALIASES.some((field) => Object.hasOwn(input, field))) {
    throw new TypeError("Outlook source identity contains an unsupported alias");
  }
  return identity;
}
