export const MICROSOFT_GRAPH_MAIL_PROVIDER_ERROR_CODES = Object.freeze({
  invalid_request: "M365_GRAPH_MAIL_INVALID_REQUEST",
  provider_error: "M365_GRAPH_MAIL_PROVIDER_ERROR",
  provider_response_invalid: "M365_GRAPH_MAIL_RESPONSE_INVALID",
  mime_too_large: "M365_GRAPH_MAIL_MIME_TOO_LARGE",
});

export const MICROSOFT_GRAPH_MAIL_MAX_MIME_BYTES = 3 * 1024 * 1024;

function providerError(code, message, status = 502) {
  return Object.assign(new Error(message), {
    safe_error_code: code,
    status,
  });
}

function requiredString(value, field, maxLength = 2048) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text || text.length > maxLength) {
    throw providerError(
      MICROSOFT_GRAPH_MAIL_PROVIDER_ERROR_CODES.invalid_request,
      `${field} is required`,
      400,
    );
  }
  return text;
}

function optionalString(value, maxLength = 2048) {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text && text.length <= maxLength ? text : null;
}

function positiveLimit(value) {
  const resolved = value ?? MICROSOFT_GRAPH_MAIL_MAX_MIME_BYTES;
  if (
    !Number.isSafeInteger(resolved)
    || resolved < 1
    || resolved > MICROSOFT_GRAPH_MAIL_MAX_MIME_BYTES
  ) {
    throw new TypeError(
      "max_mime_bytes must be within the 3 MiB broker limit",
    );
  }
  return resolved;
}

function normalizedAddress(value) {
  const address = value?.emailAddress ?? value;
  if (!address || typeof address !== "object" || Array.isArray(address)) {
    return null;
  }
  const email = typeof address.address === "string"
    ? address.address.trim().toLowerCase()
    : "";
  if (!email || email.length > 320 || !email.includes("@")) return null;
  return Object.freeze({
    display_name: optionalString(
      address.display_name ?? address.name,
      200,
    ),
    address: email,
  });
}

function normalizedRecipients(message) {
  if (Array.isArray(message.recipients)) {
    return Object.freeze(message.recipients.map((value) => {
      const recipient = normalizedAddress(value);
      if (!recipient) return null;
      return Object.freeze({
        ...recipient,
        recipient_type: ["to", "cc", "bcc"].includes(value.recipient_type)
          ? value.recipient_type
          : "to",
      });
    }).filter(Boolean));
  }
  const recipients = [];
  for (const [field, recipientType] of [
    ["toRecipients", "to"],
    ["ccRecipients", "cc"],
    ["bccRecipients", "bcc"],
  ]) {
    for (const value of Array.isArray(message[field]) ? message[field] : []) {
      const recipient = normalizedAddress(value);
      if (recipient) {
        recipients.push(Object.freeze({
          ...recipient,
          recipient_type: recipientType,
        }));
      }
    }
  }
  return Object.freeze(recipients);
}

function normalizedMessageMetadata(message, immutableMessageId) {
  if (!message || typeof message !== "object" || Array.isArray(message)) {
    throw providerError(
      MICROSOFT_GRAPH_MAIL_PROVIDER_ERROR_CODES.provider_response_invalid,
      "Microsoft Graph message metadata is invalid",
    );
  }
  if (
    message.id != null
    && requiredString(message.id, "message.id") !== immutableMessageId
  ) {
    throw providerError(
      MICROSOFT_GRAPH_MAIL_PROVIDER_ERROR_CODES.provider_response_invalid,
      "Microsoft Graph message identity changed during retrieval",
    );
  }
  const receivedAt = Date.parse(
    message.received_at ?? message.receivedDateTime,
  );
  if (!Number.isFinite(receivedAt)) {
    throw providerError(
      MICROSOFT_GRAPH_MAIL_PROVIDER_ERROR_CODES.provider_response_invalid,
      "Microsoft Graph message received time is invalid",
    );
  }
  return Object.freeze({
    conversation_id: optionalString(
      message.conversation_id ?? message.conversationId,
      512,
    ),
    internet_message_id: optionalString(
      message.internet_message_id ?? message.internetMessageId,
      998,
    ),
    subject: optionalString(message.subject, 998) ?? "",
    sender: normalizedAddress(message.sender ?? message.from),
    recipients: normalizedRecipients(message),
    received_at: new Date(receivedAt).toISOString(),
    has_attachments:
      message.has_attachments === true || message.hasAttachments === true,
  });
}

function decodedMime(result, maxBytes) {
  const declaredBytes = Number(result?.mime_bytes);
  if (!Number.isSafeInteger(declaredBytes) || declaredBytes < 1) {
    throw providerError(
      MICROSOFT_GRAPH_MAIL_PROVIDER_ERROR_CODES.provider_response_invalid,
      "Microsoft Graph MIME size is invalid",
    );
  }
  if (declaredBytes > maxBytes) {
    throw providerError(
      MICROSOFT_GRAPH_MAIL_PROVIDER_ERROR_CODES.mime_too_large,
      "Microsoft Graph MIME exceeds the 3 MiB broker limit",
      413,
    );
  }
  const encoded = requiredString(
    result.mime_base64,
    "mime_base64",
    Math.ceil(MICROSOFT_GRAPH_MAIL_MAX_MIME_BYTES / 3) * 4 + 4,
  );
  if (
    encoded.length % 4 !== 0
    || !/^[A-Za-z0-9+/]+={0,2}$/u.test(encoded)
  ) {
    throw providerError(
      MICROSOFT_GRAPH_MAIL_PROVIDER_ERROR_CODES.provider_response_invalid,
      "Microsoft Graph MIME encoding is invalid",
    );
  }
  const bytes = Buffer.from(encoded, "base64");
  if (
    bytes.byteLength !== declaredBytes
    || bytes.toString("base64") !== encoded
  ) {
    throw providerError(
      MICROSOFT_GRAPH_MAIL_PROVIDER_ERROR_CODES.provider_response_invalid,
      "Microsoft Graph MIME size does not reconcile",
    );
  }
  return bytes;
}

function looksLikeMimeMessage(bytes) {
  const head = bytes.subarray(0, Math.min(bytes.byteLength, 64 * 1024))
    .toString("latin1");
  return /(?:^|\r?\n)(?:from|to|date|subject|message-id|mime-version):/iu
    .test(head)
    && /\r?\n\r?\n/u.test(head);
}

function utcInstant(value, field) {
  const text = requiredString(value, field);
  const parsed = Date.parse(text);
  if (!Number.isFinite(parsed)) {
    throw providerError(
      MICROSOFT_GRAPH_MAIL_PROVIDER_ERROR_CODES.invalid_request,
      `${field} must be a valid instant`,
      400,
    );
  }
  return new Date(parsed).toISOString();
}

function safeWebLink(value) {
  if (value == null) return null;
  const text = requiredString(value, "event.web_link");
  let url;
  try {
    url = new URL(text);
  } catch {
    throw providerError(
      MICROSOFT_GRAPH_MAIL_PROVIDER_ERROR_CODES.provider_response_invalid,
      "Microsoft Graph calendar web link is invalid",
    );
  }
  const hostname = url.hostname.toLowerCase();
  const allowed = ["outlook.office.com", "outlook.office365.com"]
    .some((host) => hostname === host || hostname.endsWith(`.${host}`));
  if (
    url.protocol !== "https:"
    || url.username
    || url.password
    || !allowed
  ) {
    throw providerError(
      MICROSOFT_GRAPH_MAIL_PROVIDER_ERROR_CODES.provider_response_invalid,
      "Microsoft Graph calendar web link is invalid",
    );
  }
  return url.toString();
}

function brokerFailure(error, operation) {
  if (
    error?.status === 413
    || String(error?.safe_error_code ?? "").includes("MIME_TOO_LARGE")
  ) {
    return providerError(
      MICROSOFT_GRAPH_MAIL_PROVIDER_ERROR_CODES.mime_too_large,
      "Microsoft Graph MIME exceeds the 3 MiB broker limit",
      413,
    );
  }
  return providerError(
    MICROSOFT_GRAPH_MAIL_PROVIDER_ERROR_CODES.provider_error,
    `Microsoft Graph ${operation} failed through the egress broker`,
    error?.status === 401 || error?.status === 403 ? 403 : 502,
  );
}

export function createMicrosoftGraphMailProvider({
  microsoft_egress_transport,
  max_mime_bytes,
} = {}) {
  for (const method of [
    "graphCalendarEventCreate",
    "graphMailMessageExport",
  ]) {
    if (typeof microsoft_egress_transport?.[method] !== "function") {
      throw new TypeError(`Microsoft egress transport ${method} is required`);
    }
  }
  const maxMimeBytes = positiveLimit(max_mime_bytes);

  return Object.freeze({
    provider: "microsoft-graph",
    mailbox_scope: "me",
    automatic_mailbox_scan_enabled: false,
    automatic_calendar_sync_enabled: false,

    async createMeCalendarEvent(input = {}) {
      const event = input.event;
      if (
        input.mailbox_scope !== "me"
        || !event
        || typeof event !== "object"
        || Array.isArray(event)
        || event.time_zone !== "UTC"
        || event.sensitivity !== "private"
        || event.show_as !== "busy"
      ) {
        throw providerError(
          MICROSOFT_GRAPH_MAIL_PROVIDER_ERROR_CODES.invalid_request,
          "Microsoft Graph calendar request must use delegated /me and the private UTC event contract",
          400,
        );
      }
      const allowedEventFields = new Set([
        "subject",
        "start_at",
        "end_at",
        "time_zone",
        "sensitivity",
        "show_as",
      ]);
      if (Object.keys(event).some((field) => !allowedEventFields.has(field))) {
        throw providerError(
          MICROSOFT_GRAPH_MAIL_PROVIDER_ERROR_CODES.invalid_request,
          "Microsoft Graph calendar event contains unsupported fields",
          400,
        );
      }
      const startAt = utcInstant(event.start_at, "event.start_at");
      const endAt = utcInstant(event.end_at, "event.end_at");
      if (Date.parse(endAt) <= Date.parse(startAt)) {
        throw providerError(
          MICROSOFT_GRAPH_MAIL_PROVIDER_ERROR_CODES.invalid_request,
          "Microsoft Graph calendar event must end after it starts",
          400,
        );
      }
      let result;
      try {
        result = await microsoft_egress_transport.graphCalendarEventCreate({
          access_token: requiredString(
            input.credential?.access_token,
            "credential.access_token",
            16 * 1024,
          ),
          subject: requiredString(event.subject, "event.subject", 160),
          start_at: startAt,
          end_at: endAt,
          transaction_id: requiredString(
            input.transaction_id,
            "transaction_id",
            128,
          ),
        });
      } catch (error) {
        if (error?.safe_error_code?.startsWith("M365_GRAPH_MAIL_")) {
          throw error;
        }
        throw brokerFailure(error, "calendar event create");
      }
      return Object.freeze({
        event_id: requiredString(result?.event_id, "event.id"),
        web_link: safeWebLink(result?.web_link),
        provider_request_id: optionalString(
          result?.provider_request_id,
          512,
        ),
        mailbox_scope: "me",
        credential_material_included: false,
        production_ready_claim: false,
      });
    },

    async getMeMessageMime(input = {}) {
      if (
        input.mailbox_scope !== "me"
        || input.prefer_immutable_id !== true
        || input.source_id_type !== "restId"
        || input.target_id_type !== "restImmutableEntryId"
      ) {
        throw providerError(
          MICROSOFT_GRAPH_MAIL_PROVIDER_ERROR_CODES.invalid_request,
          "Microsoft Graph mail request must use delegated /me immutable IDs",
          400,
        );
      }
      let result;
      try {
        result = await microsoft_egress_transport.graphMailMessageExport({
          access_token: requiredString(
            input.credential?.access_token,
            "credential.access_token",
            16 * 1024,
          ),
          rest_message_id: requiredString(
            input.rest_message_id ?? input.message_id,
            "rest_message_id",
          ),
        });
      } catch (error) {
        if (error?.safe_error_code?.startsWith("M365_GRAPH_MAIL_")) {
          throw error;
        }
        throw brokerFailure(error, "mail export");
      }
      const immutableMessageId = requiredString(
        result?.immutable_message_id,
        "immutable_message_id",
      );
      const mimeBytes = decodedMime(result, maxMimeBytes);
      if (!looksLikeMimeMessage(mimeBytes)) {
        throw providerError(
          MICROSOFT_GRAPH_MAIL_PROVIDER_ERROR_CODES.provider_response_invalid,
          "Microsoft Graph MIME response is invalid",
        );
      }
      const metadata = normalizedMessageMetadata(
        result.message_metadata,
        immutableMessageId,
      );
      const requestIds = result.provider_request_ids;
      return Object.freeze({
        mime_bytes: mimeBytes,
        immutable_message_id: immutableMessageId,
        internet_message_id: optionalString(
          result.internet_message_id ?? metadata.internet_message_id,
          998,
        ),
        message_metadata: metadata,
        provider_request_id: optionalString(requestIds?.mime, 512),
        translation_request_id: optionalString(requestIds?.translation, 512),
        metadata_request_id: optionalString(requestIds?.metadata, 512),
        mailbox_scope: "me",
        credential_material_included: false,
        production_ready_claim: false,
      });
    },
  });
}
