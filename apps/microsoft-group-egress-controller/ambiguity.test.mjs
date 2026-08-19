import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import {
  GRAPH_ORIGIN,
  GROUP_ID,
  PRINCIPAL_ID,
  createController,
  empty,
  envelope,
  group,
  json,
  memberRequest,
  membersResponse,
  tokenResponse,
  user,
} from "./test-fixtures.mjs";

function statefulController({ initial = [], add, remove } = {}) {
  let members = [...initial];
  const calls = [];
  const { controller } = createController({
    fetch_impl: async (url, options) => {
      calls.push({ url, options });
      const parsed = new URL(url);
      if (parsed.hostname === "login.microsoftonline.com") return tokenResponse();
      if (parsed.pathname === `/v1.0/groups/${GROUP_ID}`) return json(group());
      if (parsed.pathname === `/v1.0/users/${PRINCIPAL_ID}`) return json(user());
      if (parsed.pathname === `/v1.0/groups/${GROUP_ID}/members` && options.method === "GET") {
        return membersResponse(members);
      }
      if (options.method === "POST") {
        const action = add ?? (() => { members = [...members, PRINCIPAL_ID]; return empty(); });
        return action({ calls, get members() { return members; }, setMembers: (next) => { members = next; } });
      }
      if (options.method === "DELETE") {
        const action = remove ?? (() => { members = members.filter((id) => id !== PRINCIPAL_ID); return empty(); });
        return action({ calls, get members() { return members; }, setMembers: (next) => { members = next; } });
      }
      throw new Error(`unexpected fixture route ${options.method} ${parsed.pathname}`);
    },
  });
  return { controller, calls, members: () => members };
}

test("add and remove use only exact $ref grammar and require exact read-after-write equality", async () => {
  const expectedFingerprint = createHash("sha256")
    .update(PRINCIPAL_ID, "utf8")
    .digest("hex");
  const addHarness = statefulController();
  const added = await addHarness.controller(envelope("group.member.add", memberRequest()));
  assert.equal(added.ok, true);
  assert.deepEqual(added.result, {
    desired_present: true,
    changed: true,
    readback_equal: true,
    ambiguity_resolved: false,
    member_count: 1,
    principal_fingerprint: expectedFingerprint,
  });
  const addCall = addHarness.calls.find(({ url, options }) => (
    new URL(url).hostname === "graph.microsoft.com" && options.method === "POST"
  ));
  assert.equal(new URL(addCall.url).pathname, `/v1.0/groups/${GROUP_ID}/members/$ref`);
  assert.deepEqual(JSON.parse(addCall.options.body), {
    "@odata.id": `${GRAPH_ORIGIN}/v1.0/directoryObjects/${PRINCIPAL_ID}`,
  });
  assert.deepEqual(Object.keys(JSON.parse(addCall.options.body)), ["@odata.id"]);

  const removeHarness = statefulController({ initial: [PRINCIPAL_ID] });
  const removed = await removeHarness.controller(envelope("group.member.remove", memberRequest()));
  assert.equal(removed.ok, true);
  assert.equal(removed.result.desired_present, false);
  assert.equal(removed.result.changed, true);
  assert.equal(removed.result.readback_equal, true);
  assert.equal(removed.result.principal_fingerprint, expectedFingerprint);
  const deleteCall = removeHarness.calls.find(({ options }) => options.method === "DELETE");
  assert.equal(new URL(deleteCall.url).pathname,
    `/v1.0/groups/${GROUP_ID}/members/${PRINCIPAL_ID}/$ref`);
  assert.equal(deleteCall.options.body, undefined);
});

test("already-present add and already-absent remove are idempotent without a write", async () => {
  for (const [operation, initial, desired] of [
    ["group.member.add", [PRINCIPAL_ID], true],
    ["group.member.remove", [], false],
  ]) {
    const harness = statefulController({ initial });
    const result = await harness.controller(envelope(operation, memberRequest()));
    assert.equal(result.ok, true);
    assert.equal(result.result.changed, false);
    assert.equal(result.result.desired_present, desired);
    assert.equal(result.result.readback_equal, true);
    const mutationCalls = harness.calls.filter(({ url, options }) =>
      new URL(url).hostname === "graph.microsoft.com"
      && ["POST", "DELETE"].includes(options.method));
    assert.equal(mutationCalls.length, 0);
  }
});

test("a lost add response is resolved only by an exact post-read and is never retried", async () => {
  let writes = 0;
  const harness = statefulController({
    add: ({ setMembers }) => {
      writes += 1;
      setMembers([PRINCIPAL_ID]);
      throw new Error("socket reset after remote commit");
    },
  });
  const result = await harness.controller(envelope("group.member.add", memberRequest()));
  assert.equal(result.ok, true);
  assert.equal(result.result.ambiguity_resolved, true);
  assert.equal(result.result.readback_equal, true);
  assert.equal(writes, 1);
});

test("ambiguous add/remove and stale 204 readback stay unknown when equality is absent", async () => {
  const scenarios = [
    {
      operation: "group.member.add",
      initial: [],
      add: () => { throw new Error("lost before or after commit"); },
    },
    {
      operation: "group.member.remove",
      initial: [PRINCIPAL_ID],
      remove: () => { throw new Error("lost before or after commit"); },
    },
    {
      operation: "group.member.add",
      initial: [],
      add: () => empty(204),
      expectedCode: "READBACK_MISMATCH",
    },
    {
      operation: "group.member.remove",
      initial: [PRINCIPAL_ID],
      remove: () => empty(204),
      expectedCode: "READBACK_MISMATCH",
    },
  ];
  for (const scenario of scenarios) {
    let writes = 0;
    const wrapped = scenario.add
      ? { add: (state) => { writes += 1; return scenario.add(state); } }
      : { remove: (state) => { writes += 1; return scenario.remove(state); } };
    const harness = statefulController({ initial: scenario.initial, ...wrapped });
    const result = await harness.controller(envelope(scenario.operation, memberRequest()));
    assert.equal(result.ok, false, scenario.operation);
    assert.equal(result.error.code, scenario.expectedCode ?? "REMOTE_COMMIT_UNKNOWN");
    assert.equal(result.error.remote_commit_state, "unknown");
    assert.equal(writes, 1);
  }
});

test("documented duplicate add, missing remove, and transient writes resolve only through equality", async () => {
  for (const [operation, status, initial, post] of [
    ["group.member.add", 400, [], [PRINCIPAL_ID]],
    ["group.member.add", 429, [], [PRINCIPAL_ID]],
    ["group.member.add", 503, [], [PRINCIPAL_ID]],
    ["group.member.remove", 404, [PRINCIPAL_ID], []],
    ["group.member.remove", 503, [PRINCIPAL_ID], []],
  ]) {
    let writes = 0;
    const action = ({ setMembers }) => {
      writes += 1;
      setMembers(post);
      return json({ error: { message: "must not escape" } }, status);
    };
    const harness = statefulController({
      initial,
      ...(operation.endsWith("add") ? { add: action } : { remove: action }),
    });
    const result = await harness.controller(envelope(operation, memberRequest()));
    assert.equal(result.ok, true, `${operation}:${status}`);
    assert.equal(result.result.ambiguity_resolved, true);
    assert.equal(writes, 1);
    assert.equal(JSON.stringify(result).includes("must not escape"), false);
  }
});

test("non-contract add/remove statuses fail closed without broad idempotency semantics", async () => {
  for (const [operation, status, initial] of [
    ["group.member.add", 404, []],
    ["group.member.add", 409, []],
    ["group.member.remove", 400, [PRINCIPAL_ID]],
    ["group.member.remove", 409, [PRINCIPAL_ID]],
  ]) {
    let writes = 0;
    const action = () => {
      writes += 1;
      return json({}, status);
    };
    const harness = statefulController({
      initial,
      ...(operation.endsWith("add") ? { add: action } : { remove: action }),
    });
    const result = await harness.controller(envelope(operation, memberRequest()));
    assert.equal(result.ok, false, `${operation}:${status}`);
    assert.equal(result.error.code, "UPSTREAM_REJECTED");
    assert.equal(writes, 1);
  }
});

test("a malformed write response is ambiguous and resolves only by exact readback", async () => {
  let writes = 0;
  const harness = statefulController({
    add: ({ setMembers }) => {
      writes += 1;
      setMembers([PRINCIPAL_ID]);
      return {};
    },
  });
  const result = await harness.controller(envelope("group.member.add", memberRequest()));
  assert.equal(result.ok, true);
  assert.equal(result.result.ambiguity_resolved, true);
  assert.equal(writes, 1);
});

test("a non-contract success status never becomes public success after applied readback", async () => {
  let writes = 0;
  const harness = statefulController({
    add: ({ setMembers }) => {
      writes += 1;
      setMembers([PRINCIPAL_ID]);
      return empty(201);
    },
  });
  const result = await harness.controller(envelope("group.member.add", memberRequest()));
  assert.equal(result.ok, false);
  assert.equal(result.error.code, "UPSTREAM_RESPONSE_INVALID");
  assert.equal(result.error.remote_commit_state, "applied");
  assert.equal(writes, 1);
});

test("read-after-write rejects concurrent member drift even when the target converged", async () => {
  const harness = statefulController({
    add: ({ setMembers }) => {
      setMembers([PRINCIPAL_ID, "44444444-4444-4444-8444-444444444444"]);
      return empty();
    },
  });
  const result = await harness.controller(envelope("group.member.add", memberRequest()));
  assert.equal(result.ok, false);
  assert.equal(result.error.code, "READBACK_MISMATCH");
  assert.equal(result.error.remote_commit_state, "unknown");
});

test("401/403 writes fail closed without claiming readback resolution", async () => {
  for (const status of [401, 403]) {
    let writes = 0;
    const harness = statefulController({
      add: () => { writes += 1; return json({ secret: "provider detail" }, status); },
    });
    const result = await harness.controller(envelope("group.member.add", memberRequest()));
    assert.equal(result.ok, false);
    assert.equal(result.status, status);
    assert.equal(result.error.code, "UPSTREAM_AUTHORIZATION_FAILED");
    assert.equal(Object.hasOwn(result.error, "remote_commit_state"), false);
    assert.equal(writes, 1);
  }
});
