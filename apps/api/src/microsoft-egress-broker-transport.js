import {
  InvokeCommand,
  LambdaClient,
} from "@aws-sdk/client-lambda";

export const MICROSOFT_EGRESS_BROKER_CONTRACT_VERSION =
  "lawos.microsoft-egress.v1";
export const MICROSOFT_EGRESS_BROKER_FUNCTION_NAME =
  "lawos-microsoft-egress-prod";
export const MICROSOFT_EGRESS_MAX_MIME_BYTES = 3 * 1024 * 1024;
export const MICROSOFT_EGRESS_REDIRECT_URIS = Object.freeze({
  people:
    "https://d2mthcc8vp3cr2.cloudfront.net/api/outlook/connection/callback",
  client:
    "https://d2mthcc8vp3cr2.cloudfront.net/api/outlook/connection/callback",
});

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const REDIRECT_PROFILES = new Set(["people", "client"]);
const SCOPE_ALLOWLIST = new Set([
  "openid",
  "profile",
  "email",
  "offline_access",
  "Calendars.ReadBasic",
  "Calendars.ReadWrite",
  "Mail.Read",
]);

function requiredText(value, name, maxLength = 4096) {
  const text = String(value ?? "").trim();
  if (!text || text.length > maxLength) {
    throw new TypeError(`${name} is required`);
  }
  return text;
}

function requiredUuid(value, name) {
  const text = requiredText(value, name, 64);
  if (!UUID_PATTERN.test(text)) throw new TypeError(`${name} must be a UUID`);
  return text.toLowerCase();
}

function exactInput(input, fields, name) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError(`${name} request is required`);
  }
  if (Object.keys(input).some((field) => !fields.includes(field))) {
    throw new TypeError(`${name} request contains unsupported fields`);
  }
  return input;
}

function scopes(value) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new TypeError("scopes are required");
  }
  const resolved = [...new Set(value.map((scope) => (
    requiredText(scope, "scope", 64)
  )))];
  if (resolved.some((scope) => !SCOPE_ALLOWLIST.has(scope))) {
    throw new TypeError("scopes contain an unsupported Microsoft permission");
  }
  return resolved;
}

function safeStatus(value, fallback = 502) {
  const status = Number(value);
  return Number.isInteger(status) && status >= 400 && status <= 599
    ? status
    : fallback;
}

function brokerError(code, message, status = 502, details = {}) {
  return Object.assign(new Error(message), {
    safe_error_code: code,
    status,
    ...details,
  });
}

function responseEnvelope(payload, operation) {
  let body;
  try {
    body = JSON.parse(Buffer.from(payload ?? []).toString("utf8"));
  } catch {
    throw brokerError(
      "MICROSOFT_EGRESS_RESPONSE_INVALID",
      "Microsoft egress broker response is invalid",
    );
  }
  if (
    !body
    || typeof body !== "object"
    || Array.isArray(body)
    || body.contract_version !== MICROSOFT_EGRESS_BROKER_CONTRACT_VERSION
    || body.operation !== operation
    || typeof body.ok !== "boolean"
  ) {
    throw brokerError(
      "MICROSOFT_EGRESS_RESPONSE_INVALID",
      "Microsoft egress broker response is invalid",
    );
  }
  if (!body.ok) {
    const rawCode = String(body.error?.code ?? "REJECTED").trim();
    const code = /^[A-Z][A-Z0-9_]{0,100}$/u.test(rawCode)
      ? rawCode
      : "REJECTED";
    const retryAfter = Number(body.error?.retry_after_seconds);
    const providerRequestId = typeof body.error?.provider_request_id === "string"
      ? body.error.provider_request_id.trim().slice(0, 512) || null
      : null;
    throw brokerError(
      `MICROSOFT_EGRESS_${code}`,
      `Microsoft egress broker rejected ${operation}`,
      safeStatus(body.status),
      {
        retry_after_seconds:
          Number.isFinite(retryAfter) && retryAfter >= 0
            ? Math.min(300, retryAfter)
            : null,
        provider_request_id: providerRequestId,
      },
    );
  }
  if (
    !Number.isInteger(body.status)
    || body.status < 200
    || body.status > 299
    || !body.result
    || typeof body.result !== "object"
    || Array.isArray(body.result)
  ) {
    throw brokerError(
      "MICROSOFT_EGRESS_RESPONSE_INVALID",
      "Microsoft egress broker response is invalid",
    );
  }
  return body.result;
}

export function createMicrosoftEgressBrokerTransport({
  lambda_client = null,
  region = process.env.AWS_REGION
    ?? process.env.AWS_DEFAULT_REGION
    ?? process.env.LAWOS_AWS_REGION
    ?? "ap-northeast-2",
} = {}) {
  const client = lambda_client ?? new LambdaClient({
    region: requiredText(region, "AWS region", 100),
  });
  if (typeof client?.send !== "function") {
    throw new TypeError("Lambda client is required");
  }

  async function invoke(operation, request) {
    let response;
    try {
      response = await client.send(new InvokeCommand({
        FunctionName: MICROSOFT_EGRESS_BROKER_FUNCTION_NAME,
        InvocationType: "RequestResponse",
        LogType: "None",
        Payload: Buffer.from(JSON.stringify({
          contract_version: MICROSOFT_EGRESS_BROKER_CONTRACT_VERSION,
          operation,
          request,
        }), "utf8"),
      }));
    } catch {
      throw brokerError(
        "MICROSOFT_EGRESS_UNAVAILABLE",
        "Microsoft egress broker is unavailable",
        503,
      );
    }
    if (
      response?.FunctionError
      || response?.StatusCode !== 200
      || !response?.Payload
    ) {
      throw brokerError(
        "MICROSOFT_EGRESS_INVOKE_FAILED",
        "Microsoft egress broker invocation failed",
        503,
      );
    }
    return responseEnvelope(response.Payload, operation);
  }

  return Object.freeze({
    async oauthJwksGet(input = {}) {
      exactInput(input, ["tenant_id"], "oauth.jwks.get");
      return invoke("oauth.jwks.get", {
        tenant_id: requiredUuid(input.tenant_id, "tenant_id"),
      });
    },

    async oauthTokenExchange(input = {}) {
      exactInput(input, [
        "tenant_id",
        "client_id",
        "client_secret",
        "authorization_code",
        "code_verifier",
        "redirect_profile",
        "scopes",
      ], "oauth.token.exchange");
      const redirectProfile = requiredText(
        input.redirect_profile,
        "redirect_profile",
        16,
      );
      if (!REDIRECT_PROFILES.has(redirectProfile)) {
        throw new TypeError("redirect_profile must be people or client");
      }
      return invoke("oauth.token.exchange", {
        tenant_id: requiredUuid(input.tenant_id, "tenant_id"),
        client_id: requiredUuid(input.client_id, "client_id"),
        ...(input.client_secret
          ? {
              client_secret: requiredText(
                input.client_secret,
                "client_secret",
                4096,
              ),
            }
          : {}),
        authorization_code: requiredText(
          input.authorization_code,
          "authorization_code",
        ),
        code_verifier: requiredText(input.code_verifier, "code_verifier", 128),
        redirect_profile: redirectProfile,
        scopes: scopes(input.scopes),
      });
    },

    async oauthTokenRefresh(input = {}) {
      exactInput(input, [
        "tenant_id",
        "client_id",
        "client_secret",
        "refresh_token",
        "scopes",
      ], "oauth.token.refresh");
      return invoke("oauth.token.refresh", {
        tenant_id: requiredUuid(input.tenant_id, "tenant_id"),
        client_id: requiredUuid(input.client_id, "client_id"),
        ...(input.client_secret
          ? {
              client_secret: requiredText(
                input.client_secret,
                "client_secret",
                4096,
              ),
            }
          : {}),
        refresh_token: requiredText(input.refresh_token, "refresh_token", 32 * 1024),
        scopes: scopes(input.scopes),
      });
    },

    async graphCalendarViewList(input = {}) {
      exactInput(input, [
        "access_token",
        "start_date_time",
        "end_date_time",
        "timezone",
      ], "graph.calendarView.list");
      return invoke("graph.calendarView.list", {
        access_token: requiredText(input.access_token, "access_token", 32 * 1024),
        start_date_time: requiredText(input.start_date_time, "start_date_time", 100),
        end_date_time: requiredText(input.end_date_time, "end_date_time", 100),
        timezone: requiredText(input.timezone, "timezone", 100),
      });
    },

    async graphCalendarEventCreate(input = {}) {
      exactInput(input, [
        "access_token",
        "subject",
        "start_at",
        "end_at",
        "transaction_id",
      ], "graph.calendarEvent.create");
      return invoke("graph.calendarEvent.create", {
        access_token: requiredText(input.access_token, "access_token", 32 * 1024),
        subject: requiredText(input.subject, "subject", 160),
        start_at: requiredText(input.start_at, "start_at", 100),
        end_at: requiredText(input.end_at, "end_at", 100),
        transaction_id: requiredText(input.transaction_id, "transaction_id", 128),
      });
    },

    async graphMailMessageExport(input = {}) {
      exactInput(input, [
        "access_token",
        "rest_message_id",
      ], "graph.mailMessage.export");
      const result = await invoke("graph.mailMessage.export", {
        access_token: requiredText(input.access_token, "access_token", 32 * 1024),
        rest_message_id: requiredText(input.rest_message_id, "rest_message_id"),
      });
      if (!Number.isSafeInteger(result.mime_bytes) || result.mime_bytes < 1) {
        throw brokerError(
          "MICROSOFT_EGRESS_RESPONSE_INVALID",
          "Microsoft egress broker MIME response is invalid",
        );
      }
      if (result.mime_bytes > MICROSOFT_EGRESS_MAX_MIME_BYTES) {
        throw brokerError(
          "MICROSOFT_EGRESS_MIME_TOO_LARGE",
          "Microsoft egress broker MIME exceeds the 3 MiB limit",
          413,
        );
      }
      return result;
    },
  });
}
