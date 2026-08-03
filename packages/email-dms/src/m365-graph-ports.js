import {
  M365_GRAPH_ERROR_CODES,
  resolveActiveM365Connection,
} from "./m365-graph-connection-service.js";
import { hashMailboxAddress } from "./m365-connection-model.js";

export const CLIENT_INQUIRY_OUTLOOK_FEATURE_FLAG =
  "client_inquiry_outlook_v1";

const MAILBOX_OVERRIDE_FIELDS = Object.freeze([
  "mailbox",
  "mailbox_id",
  "mailbox_address",
  "mailbox_user_principal_name",
  "target_user_id",
  "user_principal_name",
]);

function requiredString(input, field, maxLength = 2048) {
  const value = input?.[field];
  if (
    typeof value !== "string"
    || value.trim() === ""
    || value.trim().length > maxLength
  ) {
    throw new TypeError(`${field} is required`);
  }
  return value.trim();
}

function optionalString(value, maxLength = 2048) {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text ? text.slice(0, maxLength) : null;
}

function safeAddress(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const address = optionalString(value.address, 320)?.toLowerCase();
  if (!address || !address.includes("@")) return null;
  return Object.freeze({
    display_name: optionalString(value.display_name, 200),
    address,
  });
}

function safeMessageMetadata(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const receivedAt = Date.parse(value.received_at);
  return Object.freeze({
    conversation_id: optionalString(value.conversation_id, 512),
    internet_message_id:
      optionalString(value.internet_message_id, 998),
    subject: optionalString(value.subject, 998) ?? "",
    sender: safeAddress(value.sender),
    recipients: Object.freeze(
      (Array.isArray(value.recipients) ? value.recipients : [])
        .slice(0, 1000)
        .map((recipient) => {
          const address = safeAddress(recipient);
          if (!address) return null;
          const recipientType = ["to", "cc", "bcc"].includes(
            recipient?.recipient_type,
          )
            ? recipient.recipient_type
            : "to";
          return Object.freeze({
            ...address,
            recipient_type: recipientType,
          });
        })
        .filter(Boolean),
    ),
    received_at:
      Number.isFinite(receivedAt)
        ? new Date(receivedAt).toISOString()
        : null,
    has_attachments: value.has_attachments === true,
  });
}

function safeOutlookWebLink(value) {
  if (value === null || value === undefined) return null;
  const text =
    typeof value === "string"
    && value.trim()
    && value.trim().length <= 2_048
      ? value.trim()
      : null;
  if (!text) {
    throw commandError(
      M365_GRAPH_ERROR_CODES.provider_invalid,
      "Microsoft Graph calendar web link is invalid",
      502,
    );
  }
  let url;
  try {
    url = new URL(text);
  } catch {
    throw commandError(
      M365_GRAPH_ERROR_CODES.provider_invalid,
      "Microsoft Graph calendar web link is invalid",
      502,
    );
  }
  const hostname = url.hostname.toLowerCase();
  const allowedHost = [
    "outlook.office.com",
    "outlook.office365.com",
  ].some((host) => hostname === host || hostname.endsWith(`.${host}`));
  if (
    url.protocol !== "https:"
    || url.username
    || url.password
    || !allowedHost
  ) {
    throw commandError(
      M365_GRAPH_ERROR_CODES.provider_invalid,
      "Microsoft Graph calendar web link is invalid",
      502,
    );
  }
  return url.toString();
}

function safeCalendarEvent(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("event is required");
  }
  const allowedFields = new Set([
    "subject",
    "start_at",
    "end_at",
    "time_zone",
    "sensitivity",
    "show_as",
  ]);
  if (Object.keys(value).some((field) => !allowedFields.has(field))) {
    throw new TypeError("event contains unsupported fields");
  }
  const startAt = requiredString(value, "start_at");
  const endAt = requiredString(value, "end_at");
  if (
    !Number.isFinite(Date.parse(startAt))
    || !Number.isFinite(Date.parse(endAt))
    || Date.parse(endAt) <= Date.parse(startAt)
  ) {
    throw new TypeError("event start_at and end_at are invalid");
  }
  if (
    value.time_zone !== "UTC"
    || value.sensitivity !== "private"
    || value.show_as !== "busy"
  ) {
    throw new TypeError(
      "event must use UTC, private sensitivity, and busy availability",
    );
  }
  return Object.freeze({
    subject: requiredString(value, "subject", 160),
    start_at: new Date(startAt).toISOString(),
    end_at: new Date(endAt).toISOString(),
    time_zone: "UTC",
    sensitivity: "private",
    show_as: "busy",
  });
}

function commandError(code, message, status = 409) {
  return Object.assign(new Error(message), {
    safe_error_code: code,
    status,
  });
}

function assertRuntime({
  feature_enabled,
  provider_runtime_enabled,
  provider,
  credential_vault,
}) {
  if (feature_enabled !== true) {
    throw commandError(
      M365_GRAPH_ERROR_CODES.feature_disabled,
      "Microsoft 365 connection is disabled",
      503,
    );
  }
  if (
    provider_runtime_enabled !== true
    || !provider
    || typeof credential_vault?.resolveDelegatedCredential !== "function"
  ) {
    throw commandError(
      M365_GRAPH_ERROR_CODES.provider_runtime_disabled,
      "Microsoft 365 provider runtime is not ready",
      503,
    );
  }
}

function assertOwnMailboxOnly(input = {}) {
  if (MAILBOX_OVERRIDE_FIELDS.some((field) => (
    input[field] !== null && input[field] !== undefined
  ))) {
    throw commandError(
      M365_GRAPH_ERROR_CODES.mailbox_override,
      "Only the signed-in user's own Microsoft 365 mailbox is allowed",
      403,
    );
  }
}

async function activeCredential({
  repository,
  credential_vault,
  required_scope,
  clock,
  input,
}) {
  const { connection } = resolveActiveM365Connection({
    repository,
    tenant_id: input.tenant_id,
    user_id: input.user_id,
    entra_subject_id: input.entra_subject_id,
    required_scope,
    clock,
  });
  const credential = await credential_vault.resolveDelegatedCredential({
    credential_ref: connection.credential_ref,
  });
  if (!credential || typeof credential !== "object") {
    throw commandError(
      M365_GRAPH_ERROR_CODES.connection_not_found,
      "Microsoft 365 delegated credential was not found",
      409,
    );
  }
  return Object.freeze({ connection, credential });
}

export function createM365MailPort({
  repository,
  credential_vault,
  provider,
  feature_enabled = false,
  inquiry_feature_enabled = false,
  provider_runtime_enabled = false,
  clock = () => new Date(),
} = {}) {
  return Object.freeze({
    mailbox_scope: "me",
    shared_mailbox_enabled: false,
    automatic_mailbox_scan_enabled: false,
    async getOwnMessageMime(input = {}) {
      assertRuntime({
        feature_enabled:
          feature_enabled === true
          && inquiry_feature_enabled === true,
        provider_runtime_enabled,
        provider,
        credential_vault,
      });
      assertOwnMailboxOnly(input);
      if (typeof provider.getMeMessageMime !== "function") {
        throw commandError(
          M365_GRAPH_ERROR_CODES.provider_runtime_disabled,
          "Microsoft Graph mail provider is unavailable",
          503,
        );
      }
      const { connection, credential } = await activeCredential({
        repository,
        credential_vault,
        required_scope: "Mail.Read",
        clock,
        input,
      });
      let mailboxAddress;
      try {
        mailboxAddress = requiredString({
          mailbox_address: credential.mailbox_address,
        }, "mailbox_address").normalize("NFKC").toLowerCase();
      } catch {
        throw commandError(
          M365_GRAPH_ERROR_CODES.provider_invalid,
          "Microsoft 365 credential is missing its verified mailbox identity",
          502,
        );
      }
      if (
        hashMailboxAddress(mailboxAddress)
        !== connection.mailbox_address_hash
      ) {
        throw commandError(
          M365_GRAPH_ERROR_CODES.provider_invalid,
          "Microsoft 365 mailbox identity does not reconcile",
          502,
        );
      }
      const restMessageId = requiredString({
        rest_message_id:
          input.rest_message_id ?? input.message_id,
      }, "rest_message_id");
      const result = await provider.getMeMessageMime({
        credential,
        rest_message_id: restMessageId,
        mailbox_scope: "me",
        prefer_immutable_id: true,
        source_id_type: "restId",
        target_id_type: "restImmutableEntryId",
      });
      if (
        !result
        || !Buffer.isBuffer(result.mime_bytes)
        || result.mime_bytes.byteLength === 0
      ) {
        throw commandError(
          M365_GRAPH_ERROR_CODES.provider_invalid,
          "Microsoft Graph mail response is invalid",
          502,
        );
      }
      return Object.freeze({
        mime_bytes: result.mime_bytes,
        immutable_message_id: requiredString(
          result,
          "immutable_message_id",
        ),
        internet_message_id:
          typeof result.internet_message_id === "string"
          && result.internet_message_id.trim()
            ? result.internet_message_id.trim()
            : null,
        provider_request_id:
          typeof result.provider_request_id === "string"
          && result.provider_request_id.trim()
            ? result.provider_request_id.trim()
            : null,
        message_metadata:
          safeMessageMetadata(result.message_metadata),
        source_id_type: "restId",
        target_id_type: "restImmutableEntryId",
        mailbox_scope: "me",
        mailbox_address: mailboxAddress,
        prefer_immutable_id: true,
        credential_material_included: false,
        production_ready_claim: false,
      });
    },
  });
}

export function createM365CalendarPort({
  repository,
  credential_vault,
  provider,
  feature_enabled = false,
  provider_runtime_enabled = false,
  clock = () => new Date(),
} = {}) {
  return Object.freeze({
    mailbox_scope: "me",
    shared_calendar_enabled: false,
    automatic_calendar_sync_enabled: false,
    async createOwnEvent(input = {}) {
      assertRuntime({
        feature_enabled,
        provider_runtime_enabled,
        provider,
        credential_vault,
      });
      assertOwnMailboxOnly(input);
      if (typeof provider.createMeCalendarEvent !== "function") {
        throw commandError(
          M365_GRAPH_ERROR_CODES.provider_runtime_disabled,
          "Microsoft Graph calendar provider is unavailable",
          503,
        );
      }
      const { credential } = await activeCredential({
        repository,
        credential_vault,
        required_scope: "Calendars.ReadWrite",
        clock,
        input,
      });
      const transactionId = requiredString(
        input,
        "transaction_id",
        128,
      );
      const event = safeCalendarEvent(input.event);
      const result = await provider.createMeCalendarEvent({
        credential,
        event,
        transaction_id: transactionId,
        mailbox_scope: "me",
      });
      const eventId =
        typeof result?.event_id === "string"
        && result.event_id.trim()
        && result.event_id.trim().length <= 2_048
          ? result.event_id.trim()
          : null;
      if (!eventId) {
        throw commandError(
          M365_GRAPH_ERROR_CODES.provider_invalid,
          "Microsoft Graph calendar event ID is invalid",
          502,
        );
      }
      return Object.freeze({
        event_id: eventId,
        web_link: safeOutlookWebLink(result?.web_link),
        transaction_id: transactionId,
        provider_request_id:
          typeof result.provider_request_id === "string"
          && result.provider_request_id.trim()
            ? result.provider_request_id.trim()
            : null,
        mailbox_scope: "me",
        credential_material_included: false,
        production_ready_claim: false,
      });
    },
  });
}
