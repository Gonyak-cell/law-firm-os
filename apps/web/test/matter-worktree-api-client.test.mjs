import assert from "node:assert/strict";
import test from "node:test";
import {
  MATTER_WORKTREE_UI_STATES,
  createMatterWorktreeUiState,
  fetchMatterWorktree,
  patchMatterWorktreeNode,
} from "../src/data/apiClient.js";

function jsonResponse(status, body, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

async function withFetch(response, callback) {
  const original = globalThis.fetch;
  let request;
  globalThis.fetch = async (input, init) => {
    request = { input, init };
    return response;
  };
  try {
    return { result: await callback(), request };
  } finally {
    globalThis.fetch = original;
  }
}

test("WT-03-02 models loading, data, empty, denied, error, and conflict states", async () => {
  assert.deepEqual(createMatterWorktreeUiState(), { kind: MATTER_WORKTREE_UI_STATES.loading });

  const data = await withFetch(
    jsonResponse(200, { item: { version: 3, nodes: [{ node_id: "node-1" }], unclassified: { tasks: [] } }, etag: '"3"' }, { etag: '"3"' }),
    () => fetchMatterWorktree({ matterId: "matter-1" })
  );
  assert.equal(data.result.kind, MATTER_WORKTREE_UI_STATES.data);
  assert.equal(data.result.etag, '"3"');
  assert.equal(data.result.currentVersion, 3);
  assert.match(String(data.request.input), /\/api\/matters\/matter-1\/worktree\?/);

  const existingEmptyTree = await withFetch(
    jsonResponse(200, { item: { version: 1, root: { node_id: "root-1", title: "Matter" }, nodes: [], unclassified: { tasks: [] } } }),
    () => fetchMatterWorktree({ matterId: "matter-1" })
  );
  assert.equal(existingEmptyTree.result.kind, MATTER_WORKTREE_UI_STATES.data);

  const empty = await withFetch(
    jsonResponse(200, { item: null, ui_state: "empty" }),
    () => fetchMatterWorktree({ matterId: "matter-1" })
  );
  assert.equal(empty.result.kind, MATTER_WORKTREE_UI_STATES.empty);

  const denied = await withFetch(
    jsonResponse(404, { items: [], count_leak_prevented: true }),
    () => fetchMatterWorktree({ matterId: "matter-hidden" })
  );
  assert.equal(denied.result.kind, MATTER_WORKTREE_UI_STATES.denied);
  assert.equal(denied.result.countLeakPrevented, true);

  const error = await withFetch(
    jsonResponse(500, { safe_error_codes: ["internal_error"] }),
    () => fetchMatterWorktree({ matterId: "matter-1" })
  );
  assert.equal(error.result.kind, MATTER_WORKTREE_UI_STATES.error);

  const conflict = await withFetch(
    jsonResponse(409, { current_version: 5 }),
    () => patchMatterWorktreeNode({ matterId: "matter-1", nodeId: "node-1", payload: { expected_version: 4 } })
  );
  assert.equal(conflict.result.kind, MATTER_WORKTREE_UI_STATES.conflict);
  assert.equal(conflict.result.currentVersion, 5);
  assert.equal(conflict.request.init.method, "PATCH");
});
