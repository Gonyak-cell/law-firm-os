import { createHash } from "node:crypto";

import {
  CONTRACT_VERSION,
  createMicrosoftGroupEgressController,
} from "./index.mjs";

export const TENANT_ID = "11111111-1111-4111-8111-111111111111";
export const GROUP_ID = "22222222-2222-4222-8222-222222222222";
export const PRINCIPAL_ID = "33333333-3333-4333-8333-333333333333";
export const SECOND_PRINCIPAL_ID = "44444444-4444-4444-8444-444444444444";
export const OUTSIDE_PRINCIPAL_ID = "55555555-5555-4555-8555-555555555555";
export const CLIENT_ID = "66666666-6666-4666-8666-666666666666";
export const CREDENTIAL_REF = "secret-ref:microsoft-group-egress:test";
export const CLIENT_SECRET = "fixture-client-secret-must-never-leak";
export const ACCESS_TOKEN = "fixture-access-token-must-never-leak";
export const GRAPH_ORIGIN = "https://graph.microsoft.com";
export const LOGIN_ORIGIN = "https://login.microsoftonline.com";

export function fingerprint(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function envelope(operation, request = {}) {
  return { contract_version: CONTRACT_VERSION, operation, request };
}

export function targetRequest(extra = {}) {
  return { tenant_id: TENANT_ID, group_id: GROUP_ID, ...extra };
}

export function memberRequest(principalId = PRINCIPAL_ID, extra = {}) {
  return targetRequest({ principal_id: principalId, ...extra });
}

export function group(overrides = {}) {
  return {
    "@odata.context": `${GRAPH_ORIGIN}/v1.0/$metadata#groups/$entity`,
    id: GROUP_ID,
    groupTypes: ["Unified"],
    mailEnabled: true,
    securityEnabled: false,
    visibility: "Private",
    membershipRule: null,
    membershipRuleProcessingState: null,
    resourceProvisioningOptions: [],
    isAssignableToRole: false,
    ...overrides,
  };
}

export function user(id = PRINCIPAL_ID, overrides = {}) {
  return {
    "@odata.context": `${GRAPH_ORIGIN}/v1.0/$metadata#users/$entity`,
    "@odata.type": "#microsoft.graph.user",
    id,
    userType: "Member",
    accountEnabled: true,
    ...overrides,
  };
}

export function member(id = PRINCIPAL_ID, overrides = {}) {
  const { "@odata.context": _context, ...value } = user(id, overrides);
  return value;
}

export function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

export function empty(status = 204, headers = {}) {
  return new Response(null, { status, headers });
}

export function tokenResponse(overrides = {}) {
  return json({
    token_type: "Bearer",
    expires_in: 3600,
    ext_expires_in: 3600,
    access_token: ACCESS_TOKEN,
    ...overrides,
  });
}

export function membersResponse(ids, overrides = {}) {
  return json({
    "@odata.context": `${GRAPH_ORIGIN}/v1.0/$metadata#directoryObjects`,
    value: ids.map((id) => member(id)),
    ...overrides,
  });
}

export function createController({
  fetch_impl,
  with_credential,
  clock = () => Date.parse("2026-08-16T00:00:00.000Z"),
  sleep = async () => {},
  ...overrides
} = {}) {
  const credentialCalls = [];
  const resolver = with_credential ?? (async (reference, consume) => {
    credentialCalls.push(reference);
    return consume({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET });
  });
  const controller = createMicrosoftGroupEgressController({
    tenant_id: TENANT_ID,
    group_id: GROUP_ID,
    allowed_principal_ids: [PRINCIPAL_ID, SECOND_PRINCIPAL_ID],
    credential_ref: CREDENTIAL_REF,
    with_credential: resolver,
    fetch_impl,
    clock,
    sleep,
    ...overrides,
  });
  return { controller, credentialCalls };
}

export function assertSafeEnvelope(assert, result, ...observed) {
  const serialized = [result, ...observed].map((value) => (
    value instanceof Error ? `${value.name}:${value.message}` : JSON.stringify(value)
  )).join("\n");
  for (const secret of [
    TENANT_ID,
    GROUP_ID,
    PRINCIPAL_ID,
    SECOND_PRINCIPAL_ID,
    OUTSIDE_PRINCIPAL_ID,
    CLIENT_ID,
    CREDENTIAL_REF,
    CLIENT_SECRET,
    ACCESS_TOKEN,
    "jwsuh@amic.kr",
  ]) {
    assert.equal(serialized.includes(secret), false, secret);
  }
}
