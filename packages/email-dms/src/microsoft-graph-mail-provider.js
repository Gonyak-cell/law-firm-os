export const MICROSOFT_GRAPH_MAIL_PROVIDER_ERROR_CODES = Object.freeze({
  invalid_request: "M365_GRAPH_MAIL_REQUEST_INVALID",
  provider_error: "M365_GRAPH_MAIL_PROVIDER_ERROR",
  provider_response_invalid: "M365_GRAPH_MAIL_RESPONSE_INVALID",
  mime_too_large: "M365_GRAPH_MAIL_MIME_TOO_LARGE",
});

const DEFAULT_GRAPH_BASE_URL = "https://graph.microsoft.com/v1.0";
const DEFAULT_MAX_MIME_BYTES = 50 * 1024 * 1024;
const DEFAULT_TIMEOUT_MS = 30_000;

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

function providerError(code, message, status = 502) {
  return Object.assign(new Error(message), {
    safe_error_code: code,
    status,
  });
}

function positiveLimit(value, fallback, field) {
  const resolved = value ?? fallback;
  if (!Number.isSafeInteger(resolved) || resolved < 1) {
    throw new TypeError(`${field} must be a positive safe integer`);
  }
  return resolved;
}

function graphBaseUrl(value) {
  const url = new URL(value ?? DEFAULT_GRAPH_BASE_URL);
  if (
    url.protocol !== "https:"
    || url.username
    || url.password
    || url.search
    || url.hash
  ) {
    throw new TypeError("graph_base_url must be a safe HTTPS URL");
  }
  return url.toString().replace(/\/+$/u, "");
}

function graphRequestHeaders(accessToken, extra = {}) {
  return {
    authorization: `Bearer ${accessToken}`,
    accept: "application/json",
    ...extra,
  };
}

function providerRequestId(response) {
  return response.headers.get("request-id")
    ?? response.headers.get("client-request-id")
    ?? null;
}

function safeProviderFailure(response, operation) {
  return providerError(
    MICROSOFT_GRAPH_MAIL_PROVIDER_ERROR_CODES.provider_error,
    `Microsoft Graph ${operation} failed`,
    response.status === 401 || response.status === 403 ? 403 : 502,
  );
}

async function readJson(response, operation) {
  if (!response.ok) throw safeProviderFailure(response, operation);
  try {
    const value = await response.json();
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new TypeError("response body is not an object");
    }
    return value;
  } catch (error) {
    if (error?.safe_error_code) throw error;
    throw providerError(
      MICROSOFT_GRAPH_MAIL_PROVIDER_ERROR_CODES.provider_response_invalid,
      `Microsoft Graph ${operation} response is invalid`,
    );
  }
}

async function readBoundedBytes(response, maxBytes) {
  if (!response.ok) throw safeProviderFailure(response, "MIME read");
  const declaredLength = Number(response.headers.get("content-length"));
  if (
    Number.isFinite(declaredLength)
    && declaredLength > maxBytes
  ) {
    throw providerError(
      MICROSOFT_GRAPH_MAIL_PROVIDER_ERROR_CODES.mime_too_large,
      "Microsoft Graph MIME response exceeds the allowed size",
      413,
    );
  }
  const reader = response.body?.getReader?.();
  if (!reader) {
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.byteLength > maxBytes) {
      throw providerError(
        MICROSOFT_GRAPH_MAIL_PROVIDER_ERROR_CODES.mime_too_large,
        "Microsoft Graph MIME response exceeds the allowed size",
        413,
      );
    }
    return bytes;
  }
  const chunks = [];
  let byteLength = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = Buffer.from(value);
    byteLength += chunk.byteLength;
    if (byteLength > maxBytes) {
      await reader.cancel().catch(() => {});
      throw providerError(
        MICROSOFT_GRAPH_MAIL_PROVIDER_ERROR_CODES.mime_too_large,
        "Microsoft Graph MIME response exceeds the allowed size",
        413,
      );
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks, byteLength);
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
    display_name:
      typeof address.name === "string" && address.name.trim()
        ? address.name.trim().slice(0, 200)
        : null,
    address: email,
  });
}

function normalizedRecipients(message) {
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
  if (
    requiredString(message.id, "message.id")
    !== immutableMessageId
  ) {
    throw providerError(
      MICROSOFT_GRAPH_MAIL_PROVIDER_ERROR_CODES.provider_response_invalid,
      "Microsoft Graph message identity changed during retrieval",
    );
  }
  const receivedAt = Date.parse(message.receivedDateTime);
  if (!Number.isFinite(receivedAt)) {
    throw providerError(
      MICROSOFT_GRAPH_MAIL_PROVIDER_ERROR_CODES.provider_response_invalid,
      "Microsoft Graph message received time is invalid",
    );
  }
  return Object.freeze({
    conversation_id:
      typeof message.conversationId === "string"
      && message.conversationId.trim()
        ? message.conversationId.trim()
        : null,
    internet_message_id:
      typeof message.internetMessageId === "string"
      && message.internetMessageId.trim()
        ? message.internetMessageId.trim()
        : null,
    subject:
      typeof message.subject === "string"
        ? message.subject.trim().slice(0, 998)
        : "",
    sender: normalizedAddress(message.from),
    recipients: normalizedRecipients(message),
    received_at: new Date(receivedAt).toISOString(),
    has_attachments: message.hasAttachments === true,
  });
}

function looksLikeMimeMessage(bytes) {
  if (!Buffer.isBuffer(bytes) || bytes.byteLength === 0) return false;
  const head = bytes.subarray(0, Math.min(bytes.byteLength, 64 * 1024))
    .toString("latin1");
  return /(?:^|\r?\n)(?:from|to|date|subject|message-id|mime-version):/iu
    .test(head)
    && /\r?\n\r?\n/u.test(head);
}

export function createMicrosoftGraphMailProvider({
  fetch_impl = globalThis.fetch,
  graph_base_url = DEFAULT_GRAPH_BASE_URL,
  max_mime_bytes = DEFAULT_MAX_MIME_BYTES,
  timeout_ms = DEFAULT_TIMEOUT_MS,
} = {}) {
  if (typeof fetch_impl !== "function") {
    throw new TypeError("fetch_impl is required");
  }
  const baseUrl = graphBaseUrl(graph_base_url);
  const maxMimeBytes = positiveLimit(
    max_mime_bytes,
    DEFAULT_MAX_MIME_BYTES,
    "max_mime_bytes",
  );
  const timeoutMs = positiveLimit(
    timeout_ms,
    DEFAULT_TIMEOUT_MS,
    "timeout_ms",
  );

  async function graphFetch(path, options = {}) {
    try {
      return await fetch_impl(`${baseUrl}${path}`, {
        ...options,
        signal: options.signal ?? AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      if (error?.safe_error_code) throw error;
      throw providerError(
        MICROSOFT_GRAPH_MAIL_PROVIDER_ERROR_CODES.provider_error,
        "Microsoft Graph mail request failed",
      );
    }
  }

  return Object.freeze({
    provider: "microsoft-graph",
    mailbox_scope: "me",
    automatic_mailbox_scan_enabled: false,
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
      const accessToken = requiredString(
        input.credential?.access_token,
        "credential.access_token",
        16 * 1024,
      );
      const restMessageId = requiredString(
        input.rest_message_id ?? input.message_id,
        "rest_message_id",
      );
      const translationResponse = await graphFetch(
        "/me/translateExchangeIds",
        {
          method: "POST",
          headers: graphRequestHeaders(accessToken, {
            "content-type": "application/json",
          }),
          body: JSON.stringify({
            inputIds: [restMessageId],
            sourceIdType: "restId",
            targetIdType: "restImmutableEntryId",
          }),
        },
      );
      const translation = await readJson(
        translationResponse,
        "ID translation",
      );
      const translated = Array.isArray(translation.value)
        ? translation.value
        : [];
      if (
        translated.length !== 1
        || translated[0]?.sourceId !== restMessageId
      ) {
        throw providerError(
          MICROSOFT_GRAPH_MAIL_PROVIDER_ERROR_CODES.provider_response_invalid,
          "Microsoft Graph ID translation response is invalid",
        );
      }
      const immutableMessageId = requiredString(
        translated[0].targetId,
        "translation.targetId",
      );
      const encodedId = encodeURIComponent(immutableMessageId);
      const preferHeader = { Prefer: 'IdType="ImmutableId"' };
      const metadataResponse = await graphFetch(
        `/me/messages/${encodedId}?$select=id,internetMessageId,conversationId,subject,from,toRecipients,ccRecipients,bccRecipients,receivedDateTime,hasAttachments`,
        {
          method: "GET",
          headers: graphRequestHeaders(accessToken, preferHeader),
        },
      );
      const metadata = normalizedMessageMetadata(
        await readJson(metadataResponse, "message metadata read"),
        immutableMessageId,
      );
      const mimeResponse = await graphFetch(
        `/me/messages/${encodedId}/$value`,
        {
          method: "GET",
          headers: graphRequestHeaders(accessToken, {
            ...preferHeader,
            accept: "message/rfc822, application/octet-stream",
          }),
        },
      );
      const mimeBytes = await readBoundedBytes(
        mimeResponse,
        maxMimeBytes,
      );
      if (!looksLikeMimeMessage(mimeBytes)) {
        throw providerError(
          MICROSOFT_GRAPH_MAIL_PROVIDER_ERROR_CODES.provider_response_invalid,
          "Microsoft Graph MIME response is invalid",
        );
      }
      return Object.freeze({
        mime_bytes: mimeBytes,
        immutable_message_id: immutableMessageId,
        internet_message_id: metadata.internet_message_id,
        message_metadata: metadata,
        provider_request_id: providerRequestId(mimeResponse),
        translation_request_id: providerRequestId(translationResponse),
        metadata_request_id: providerRequestId(metadataResponse),
        mailbox_scope: "me",
        credential_material_included: false,
        production_ready_claim: false,
      });
    },
  });
}
