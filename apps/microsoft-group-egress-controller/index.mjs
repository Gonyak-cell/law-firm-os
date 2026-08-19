import {
  exactObject,
  fail,
  principalFingerprint,
  publicResult,
  sameMembers,
  uuid,
} from "./contract.mjs";
import {
  addBody,
  addTarget,
  expectedMembers,
  inspectGroup,
  inspectPrincipal,
  listMembers,
  removeTarget,
} from "./graph-membership.mjs";
import { createHttpClient } from "./http-client.mjs";
import { configuration } from "./configuration.mjs";
export const CONTRACT_VERSION = "lawos.microsoft-group-egress.v1";
export const OPERATION_NAMES = Object.freeze([
  "group.target.inspect",
  "group.members.read",
  "group.member.add",
  "group.member.remove",
]);
function targetRequest(value, binding) {
  exactObject(value, { required: ["tenant_id", "group_id"] });
  if (
    uuid(value.tenant_id) !== binding.tenantId
    || uuid(value.group_id) !== binding.groupId
  ) {
    fail("INVALID_REQUEST", 400);
  }
}
function memberRequest(value, binding) {
  exactObject(value, {
    required: ["tenant_id", "group_id", "principal_id"],
  });
  if (
    uuid(value.tenant_id) !== binding.tenantId
    || uuid(value.group_id) !== binding.groupId
  ) {
    fail("INVALID_REQUEST", 400);
  }
  const principalId = uuid(value.principal_id);
  if (!binding.allowedPrincipals.has(principalId)) fail("INVALID_REQUEST", 400);
  return principalId;
}
function memberReadResult(members) {
  return Object.freeze({
    member_count: members.length,
    principal_fingerprints: members.map(principalFingerprint).sort(),
  });
}
async function mutate({
  client,
  accessToken,
  binding,
  principalId,
  desiredPresent,
}) {
  await inspectGroup(client, accessToken, binding.groupId);
  await inspectPrincipal(
    client,
    accessToken,
    principalId,
    binding.allowedPrincipals,
  );
  const before = await listMembers(
    client,
    accessToken,
    binding.groupId,
    binding.allowedPrincipals,
  );
  if (before.includes(principalId) === desiredPresent) {
    return Object.freeze({
      desired_present: desiredPresent,
      changed: false,
      readback_equal: true,
      ambiguity_resolved: false,
      member_count: before.length,
      principal_fingerprint: principalFingerprint(principalId),
    });
  }
  const write = desiredPresent
    ? await client.write(accessToken, addTarget(binding.groupId), {
      method: "POST",
      body: addBody(principalId),
    })
    : await client.write(accessToken, removeTarget(binding.groupId, principalId), {
      method: "DELETE",
      body: undefined,
    });
  const permittedStatus = desiredPresent ? 400 : 404;
  const malformedSuccess = write.status !== null
    && write.status >= 200 && write.status < 300 && write.status !== 204;
  if (
    !malformedSuccess && write.status !== null
    && ![204, permittedStatus, 429, 500, 502, 503, 504].includes(write.status)
  ) fail("UPSTREAM_REJECTED", 502);
  let after;
  try {
    await inspectGroup(client, accessToken, binding.groupId);
    after = await listMembers(
      client,
      accessToken,
      binding.groupId,
      binding.allowedPrincipals,
    );
  } catch {
    fail("REMOTE_COMMIT_UNKNOWN", 503, { remote_commit_state: "unknown" });
  }
  const expected = expectedMembers(before, principalId, desiredPresent);
  if (!sameMembers(after, expected)) {
    fail(
      write.ambiguous ? "REMOTE_COMMIT_UNKNOWN" : "READBACK_MISMATCH",
      503,
      { remote_commit_state: "unknown" },
    );
  }
  if (malformedSuccess) {
    fail("UPSTREAM_RESPONSE_INVALID", 502, { remote_commit_state: "applied" });
  }
  return Object.freeze({
    desired_present: desiredPresent,
    changed: true,
    readback_equal: true,
    ambiguity_resolved: write.ambiguous,
    member_count: after.length,
    principal_fingerprint: principalFingerprint(principalId),
  });
}
export function createMicrosoftGroupEgressController(input) {
  const binding = configuration(input);
  const client = createHttpClient(binding);
  return async function microsoftGroupEgressController(event) {
    const operation = OPERATION_NAMES.includes(event?.operation)
      ? event.operation : null;
    try {
      exactObject(event, {
        required: ["contract_version", "operation", "request"],
      });
      if (event.contract_version !== CONTRACT_VERSION) fail("INVALID_REQUEST", 400);
      if (!OPERATION_NAMES.includes(event.operation)) {
        fail("UNSUPPORTED_OPERATION", 400);
      }
      let principalId = null;
      if (event.operation.startsWith("group.member.")) {
        principalId = memberRequest(event.request, binding);
      } else {
        targetRequest(event.request, binding);
      }
      const accessToken = await client.token();
      let result;
      if (event.operation === "group.target.inspect") {
        result = await inspectGroup(client, accessToken, binding.groupId);
      } else if (event.operation === "group.members.read") {
        await inspectGroup(client, accessToken, binding.groupId);
        result = memberReadResult(await listMembers(
          client,
          accessToken,
          binding.groupId,
          binding.allowedPrincipals,
        ));
      } else {
        result = await mutate({
          client,
          accessToken,
          binding,
          principalId,
          desiredPresent: event.operation === "group.member.add",
        });
      }
      return {
        contract_version: CONTRACT_VERSION,
        operation: event.operation,
        ok: true,
        status: 200,
        result,
      };
    } catch (error) {
      const safe = publicResult(error);
      return {
        contract_version: CONTRACT_VERSION,
        operation,
        ok: false,
        ...safe,
      };
    }
  };
}
