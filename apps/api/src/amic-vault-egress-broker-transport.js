import {
  InvokeCommand,
  LambdaClient,
} from "@aws-sdk/client-lambda";

import {
  MICROSOFT_EGRESS_BROKER_FUNCTION_NAME,
} from "./microsoft-egress-broker-transport.js";

export const AMIC_VAULT_EGRESS_BROKER_CONTRACT_VERSION =
  "lawos.amic-vault-egress.v1";
export const AMIC_VAULT_EGRESS_BROKER_OPERATION = "vault.http.request";
export const LAWOS_AMIC_VAULT_EGRESS_BROKER_ENABLED_ENV =
  "LAWOS_AMIC_VAULT_EGRESS_BROKER_ENABLED";

const MAX_REQUEST_BYTES = 3 * 1024 * 1024;
const MAX_RESPONSE_BYTES = 4 * 1024 * 1024;
const REQUEST_HEADERS = Object.freeze([
  "accept",
  "accept-encoding",
  "content-type",
  "x-amic-os-account-ledger-id",
  "x-amic-os-vault-provider-token",
]);
const RESPONSE_HEADERS = new Set([
  "cache-control",
  "content-disposition",
  "content-length",
  "content-type",
  "retry-after",
  "x-amic-vault-audit-event-id",
  "x-amic-vault-authority-kind",
  "x-amic-vault-authority-ref",
  "x-amic-vault-byte-size",
  "x-amic-vault-correlation-id",
  "x-amic-vault-document-id",
  "x-amic-vault-export-ref",
  "x-amic-vault-file-object-id",
  "x-amic-vault-provider-revision",
  "x-amic-vault-sha256",
  "x-amic-vault-version-id",
  "x-content-type-options",
]);

function transportError(code, message) {
  return Object.assign(new Error(message), {
    code,
    safe_error_code: code,
    status: 503,
  });
}

function plainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function canonicalBase64(value, maximum, field) {
  if (typeof value !== "string" || value.length > Math.ceil(maximum / 3) * 4 + 8) {
    throw transportError(
      "VAULT_EGRESS_RESPONSE_INVALID",
      `AMIC Vault egress ${field} is invalid`,
    );
  }
  const bytes = Buffer.from(value, "base64");
  if (bytes.byteLength > maximum || bytes.toString("base64") !== value) {
    throw transportError(
      "VAULT_EGRESS_RESPONSE_INVALID",
      `AMIC Vault egress ${field} is invalid`,
    );
  }
  return bytes;
}

function safeHeaders(value) {
  if (!plainObject(value)) {
    throw transportError(
      "VAULT_EGRESS_RESPONSE_INVALID",
      "AMIC Vault egress response headers are invalid",
    );
  }
  const headers = new Headers();
  for (const [name, item] of Object.entries(value)) {
    const normalized = name.toLowerCase();
    if (
      !RESPONSE_HEADERS.has(normalized)
      || typeof item !== "string"
      || item.length > 4_096
      || /[\r\n]/u.test(item)
    ) {
      throw transportError(
        "VAULT_EGRESS_RESPONSE_INVALID",
        "AMIC Vault egress response headers are invalid",
      );
    }
    headers.set(normalized, item);
  }
  return headers;
}

function responseEnvelope(payload) {
  let body;
  try {
    body = JSON.parse(Buffer.from(payload ?? []).toString("utf8"));
  } catch {
    throw transportError(
      "VAULT_EGRESS_RESPONSE_INVALID",
      "AMIC Vault egress broker response is invalid",
    );
  }
  if (
    !plainObject(body)
    || body.contract_version !== AMIC_VAULT_EGRESS_BROKER_CONTRACT_VERSION
    || body.operation !== AMIC_VAULT_EGRESS_BROKER_OPERATION
    || typeof body.ok !== "boolean"
  ) {
    throw transportError(
      "VAULT_EGRESS_RESPONSE_INVALID",
      "AMIC Vault egress broker response is invalid",
    );
  }
  if (!body.ok) {
    throw transportError(
      "VAULT_EGRESS_REJECTED",
      "AMIC Vault egress broker rejected the request",
    );
  }
  const result = body.result;
  if (
    !plainObject(result)
    || !Number.isInteger(result.status)
    || result.status < 200
    || result.status > 599
  ) {
    throw transportError(
      "VAULT_EGRESS_RESPONSE_INVALID",
      "AMIC Vault egress broker result is invalid",
    );
  }
  return Object.freeze({
    status: result.status,
    headers: safeHeaders(result.headers),
    bytes: canonicalBase64(result.body_base64, MAX_RESPONSE_BYTES, "body"),
  });
}

function requestHeaders(request) {
  const headers = {};
  for (const name of REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value !== null) headers[name] = value;
  }
  if (!headers["x-amic-os-vault-provider-token"]) {
    throw transportError(
      "VAULT_EGRESS_REQUEST_INVALID",
      "AMIC Vault egress credential is unavailable",
    );
  }
  return Object.freeze(headers);
}

export function createAmicVaultEgressBrokerFetch({
  lambda_client = null,
  region = process.env.AWS_REGION
    ?? process.env.AWS_DEFAULT_REGION
    ?? process.env.LAWOS_AWS_REGION
    ?? "ap-northeast-2",
} = {}) {
  const client = lambda_client ?? new LambdaClient({ region });
  if (typeof client?.send !== "function") {
    throw new TypeError("Lambda client is required");
  }

  return async function amicVaultEgressFetch(url, init = {}) {
    if (init?.signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const request = new Request(url, { ...init, signal: undefined });
    const target = new URL(request.url);
    if (
      request.method !== "POST"
      || target.protocol !== "https:"
      || target.username
      || target.password
      || target.search
      || target.hash
    ) {
      throw transportError(
        "VAULT_EGRESS_REQUEST_INVALID",
        "AMIC Vault egress target is invalid",
      );
    }
    const bytes = Buffer.from(await request.arrayBuffer());
    if (bytes.byteLength > MAX_REQUEST_BYTES) {
      throw transportError(
        "VAULT_EGRESS_REQUEST_TOO_LARGE",
        "AMIC Vault egress request exceeded its bound",
      );
    }
    let response;
    try {
      response = await client.send(new InvokeCommand({
        FunctionName: MICROSOFT_EGRESS_BROKER_FUNCTION_NAME,
        InvocationType: "RequestResponse",
        LogType: "None",
        Payload: Buffer.from(JSON.stringify({
          contract_version: AMIC_VAULT_EGRESS_BROKER_CONTRACT_VERSION,
          operation: AMIC_VAULT_EGRESS_BROKER_OPERATION,
          request: {
            pathname: target.pathname,
            headers: requestHeaders(request),
            body_base64: bytes.toString("base64"),
          },
        }), "utf8"),
      }));
    } catch {
      throw transportError(
        "VAULT_EGRESS_UNAVAILABLE",
        "AMIC Vault egress broker is unavailable",
      );
    }
    if (
      response?.FunctionError
      || response?.StatusCode !== 200
      || !response?.Payload
    ) {
      throw transportError(
        "VAULT_EGRESS_INVOKE_FAILED",
        "AMIC Vault egress broker invocation failed",
      );
    }
    if (init?.signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const resolved = responseEnvelope(response.Payload);
    return new Response(
      resolved.bytes.byteLength === 0 ? null : resolved.bytes,
      {
        status: resolved.status,
        headers: resolved.headers,
      },
    );
  };
}

export const AMIC_VAULT_EGRESS_MAX_REQUEST_BYTES = MAX_REQUEST_BYTES;
export const AMIC_VAULT_EGRESS_MAX_RESPONSE_BYTES = MAX_RESPONSE_BYTES;
