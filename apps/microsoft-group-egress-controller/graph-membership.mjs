import {
  exactObject,
  fail,
  sortedUnique,
  uuid,
} from "./contract.mjs";
import { GRAPH_ORIGIN } from "./http-client.mjs";

const GROUP_SELECT = [
  "id",
  "groupTypes",
  "mailEnabled",
  "securityEnabled",
  "visibility",
  "membershipRule",
  "membershipRuleProcessingState",
  "resourceProvisioningOptions",
  "isAssignableToRole",
].join(",");
const MEMBER_SELECT = "id,userType,accountEnabled";
const PAGE_SIZE = 100;
const MAX_PAGES = 5;

function graphUrl(pathname, query = {}) {
  const url = new URL(pathname, GRAPH_ORIGIN);
  for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value);
  return url;
}

function targetViolation() {
  fail("TARGET_POLICY_VIOLATION", 409);
}

export async function inspectGroup(client, accessToken, groupId) {
  const url = graphUrl(`/v1.0/groups/${groupId}`, { $select: GROUP_SELECT });
  const response = await client.get(accessToken, url);
  let value;
  try {
    value = exactObject(response, {
      required: [
        "id", "groupTypes", "mailEnabled", "securityEnabled", "visibility",
        "membershipRule", "membershipRuleProcessingState",
        "resourceProvisioningOptions", "isAssignableToRole",
      ],
      optional: ["@odata.context"],
      code: "TARGET_POLICY_VIOLATION",
      status: 409,
    });
  } catch {
    targetViolation();
  }
  if (
    uuid(value.id, "TARGET_POLICY_VIOLATION") !== groupId
    || !Array.isArray(value.groupTypes)
    || value.groupTypes.length !== 1
    || value.groupTypes[0] !== "Unified"
    || value.mailEnabled !== true
    || value.securityEnabled !== false
    || value.visibility !== "Private"
    || value.membershipRule !== null
    || value.membershipRuleProcessingState !== null
    || !Array.isArray(value.resourceProvisioningOptions)
    || value.resourceProvisioningOptions.length !== 0
    || value.isAssignableToRole !== false
  ) {
    targetViolation();
  }
  return Object.freeze({
    target_verified: true,
    group_type: "Unified",
    visibility: "Private",
    dynamic_membership: false,
    team_enabled: false,
    role_assignable: false,
  });
}

function validPrincipal(value, expectedId, allowedPrincipals) {
  try {
    exactObject(value, {
      required: ["@odata.type", "id", "userType", "accountEnabled"],
      optional: ["@odata.context"],
      code: "PRINCIPAL_POLICY_VIOLATION",
      status: 409,
    });
    if (
      value["@odata.type"] !== "#microsoft.graph.user"
      || uuid(value.id, "PRINCIPAL_POLICY_VIOLATION") !== expectedId
      || !allowedPrincipals.has(expectedId)
      || value.userType !== "Member"
      || value.accountEnabled !== true
    ) {
      fail("PRINCIPAL_POLICY_VIOLATION", 409);
    }
  } catch {
    fail("PRINCIPAL_POLICY_VIOLATION", 409);
  }
  return expectedId;
}

export async function inspectPrincipal(
  client,
  accessToken,
  principalId,
  allowedPrincipals,
) {
  const url = graphUrl(`/v1.0/users/${principalId}`, { $select: MEMBER_SELECT });
  const response = await client.get(accessToken, url);
  return validPrincipal(response, principalId, allowedPrincipals);
}

function nextPage(value, groupId) {
  if (value === undefined) return null;
  if (typeof value !== "string" || value.length > 16 * 1024) targetViolation();
  let url;
  try {
    url = new URL(value);
  } catch {
    targetViolation();
  }
  const keys = [...url.searchParams.keys()];
  const allowed = new Set(["$skiptoken", "$select", "$top"]);
  if (
    url.origin !== GRAPH_ORIGIN
    || url.pathname !== `/v1.0/groups/${groupId}/members`
    || url.username
    || url.password
    || url.hash
    || keys.some((key) => !allowed.has(key))
    || keys.length !== new Set(keys).size
    || !url.searchParams.get("$skiptoken")
    || url.searchParams.get("$skiptoken").length > 8 * 1024
    || (url.searchParams.has("$select")
      && url.searchParams.get("$select") !== MEMBER_SELECT)
    || (url.searchParams.has("$top")
      && url.searchParams.get("$top") !== String(PAGE_SIZE))
  ) {
    targetViolation();
  }
  return url;
}

export async function listMembers(
  client,
  accessToken,
  groupId,
  allowedPrincipals,
) {
  let url = graphUrl(`/v1.0/groups/${groupId}/members`, {
    $select: MEMBER_SELECT,
    $top: String(PAGE_SIZE),
  });
  const visited = new Set();
  const members = [];
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const canonical = url.toString();
    if (visited.has(canonical)) fail("UPSTREAM_RESPONSE_INVALID", 502);
    visited.add(canonical);
    const body = exactObject(await client.get(accessToken, url), {
      required: ["value"],
      optional: ["@odata.context", "@odata.nextLink"],
      code: "UPSTREAM_RESPONSE_INVALID",
      status: 502,
    });
    if (!Array.isArray(body.value) || body.value.length > PAGE_SIZE) {
      fail("UPSTREAM_RESPONSE_INVALID", 502);
    }
    for (const entry of body.value) {
      const id = uuid(entry?.id, "TARGET_POLICY_VIOLATION");
      validPrincipal(entry, id, allowedPrincipals);
      if (members.includes(id)) fail("UPSTREAM_RESPONSE_INVALID", 502);
      members.push(id);
      if (members.length > allowedPrincipals.size) targetViolation();
    }
    const next = nextPage(body["@odata.nextLink"], groupId);
    if (!next) return sortedUnique(members);
    url = next;
  }
  fail("PAGE_BUDGET_EXHAUSTED", 502);
}

export function expectedMembers(before, principalId, desiredPresent) {
  const values = new Set(before);
  if (desiredPresent) values.add(principalId);
  else values.delete(principalId);
  return sortedUnique(values);
}

export function addTarget(groupId) {
  return graphUrl(`/v1.0/groups/${groupId}/members/$ref`);
}

export function removeTarget(groupId, principalId) {
  return graphUrl(`/v1.0/groups/${groupId}/members/${principalId}/$ref`);
}

export function addBody(principalId) {
  return JSON.stringify({
    "@odata.id": `${GRAPH_ORIGIN}/v1.0/directoryObjects/${principalId}`,
  });
}
