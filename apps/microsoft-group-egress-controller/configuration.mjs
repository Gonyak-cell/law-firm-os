import {
  exactObject,
  opaqueReference,
  uuid,
} from "./contract.mjs";
import { MAX_REQUEST_TIMEOUT_MS } from "./bounded-request.mjs";

function invalidConfiguration() {
  throw new TypeError("Microsoft group egress configuration is invalid");
}

export function configuration(input) {
  try {
    exactObject(input, {
      required: [
        "tenant_id", "group_id", "allowed_principal_ids", "credential_ref",
        "with_credential", "fetch_impl",
      ],
      optional: [
        "clock", "sleep", "request_timeout_ms", "set_timeout", "clear_timeout",
      ],
      code: "CONFIGURATION_INVALID",
      status: 500,
    });
    const tenantId = uuid(input.tenant_id, "CONFIGURATION_INVALID");
    const groupId = uuid(input.group_id, "CONFIGURATION_INVALID");
    const hasSetTimeout = input.set_timeout !== undefined;
    const hasClearTimeout = input.clear_timeout !== undefined;
    if (
      !Array.isArray(input.allowed_principal_ids)
      || input.allowed_principal_ids.length < 1
      || input.allowed_principal_ids.length > 10
      || typeof input.with_credential !== "function"
      || typeof input.fetch_impl !== "function"
      || (input.clock !== undefined && typeof input.clock !== "function")
      || (input.sleep !== undefined && typeof input.sleep !== "function")
      || (input.request_timeout_ms !== undefined
        && (!Number.isInteger(input.request_timeout_ms)
          || input.request_timeout_ms < 1
          || input.request_timeout_ms > MAX_REQUEST_TIMEOUT_MS))
      || hasSetTimeout !== hasClearTimeout
      || (hasSetTimeout && (typeof input.set_timeout !== "function"
        || typeof input.clear_timeout !== "function"))
    ) {
      invalidConfiguration();
    }
    const principals = input.allowed_principal_ids.map((value) => (
      uuid(value, "CONFIGURATION_INVALID")
    ));
    if (
      new Set(principals).size !== principals.length
      || principals.includes(tenantId)
      || principals.includes(groupId)
      || tenantId === groupId
    ) {
      invalidConfiguration();
    }
    return Object.freeze({
      tenantId,
      groupId,
      allowedPrincipals: new Set(principals),
      credentialRef: opaqueReference(input.credential_ref),
      withCredential: input.with_credential,
      fetchImpl: input.fetch_impl,
      clock: input.clock ?? Date.now,
      sleep: input.sleep ?? ((milliseconds) => new Promise((resolve) => {
        setTimeout(resolve, milliseconds);
      })),
      requestTimeoutMs: input.request_timeout_ms ?? MAX_REQUEST_TIMEOUT_MS,
      setTimeoutImpl: input.set_timeout ?? setTimeout,
      clearTimeoutImpl: input.clear_timeout ?? clearTimeout,
    });
  } catch (error) {
    if (error instanceof TypeError) throw error;
    invalidConfiguration();
  }
}
