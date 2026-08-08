import assert from "node:assert/strict";
import test from "node:test";
import {
  MAX_OUTLOOK_MATTER_QUERY_LENGTH,
  MAX_OUTLOOK_MATTER_SEARCH_DEBOUNCE_MS,
  createOutlookMatterRevalidationRequest,
  createOutlookMatterSearchDebouncer,
  createOutlookMatterSearchRequest,
  createOutlookMatterSelection,
  outlookMatterSelectionForContext,
  revalidateOutlookMatterSelection,
  sanitizeOutlookMatterSearchResponse,
} from "../src/outlook-matter-search.js";

function item(suffix) {
  return Object.freeze({
    rest_message_id: `rest-${suffix}`,
    internet_message_id: `<internet-${suffix}@example.invalid>`,
    conversation_id: `conversation-${suffix}`,
  });
}

function context(suffix = "001", overrides = {}) {
  return Object.freeze({
    item: item(suffix),
    mode: "read",
    provenance: "received",
    ...overrides,
  });
}

const matter = Object.freeze({
  matter_id: "matter-outlook-001",
  matter_code: "OUTLOOK/LIT/001",
  title: "Outlook filing dispute",
  client_display_name: "AMIC Client",
  status: "open",
});

test("Matter search starts only from the explicit search surface and bounds untrusted input", () => {
  assert.equal(createOutlookMatterSearchRequest({ opened: false, query: "OUTLOOK" }), null);
  assert.equal(createOutlookMatterSearchRequest({ opened: true, query: "   " }), null);
  assert.equal(
    createOutlookMatterSearchRequest({
      opened: true,
      query: "9f13f7c6-3a9d-4d6d-9412-88db09548c11",
    }),
    null,
  );

  const request = createOutlookMatterSearchRequest({
    opened: true,
    query: `  OUTLOOK\u0000   ${"가".repeat(MAX_OUTLOOK_MATTER_QUERY_LENGTH)}  `,
    limit: 10_000,
  });
  assert.equal(request.method, "GET");
  assert.equal(request.query.length, MAX_OUTLOOK_MATTER_QUERY_LENGTH);
  assert.equal(request.limit, 20);
  assert.equal(request.path, `/api/outlook/matters?q=${encodeURIComponent(request.query)}&limit=20`);
  assert.equal(request.path.includes("tenant_id"), false);
});

test("Matter search projects only safe active result fields and never denied counts or storage data", () => {
  const result = sanitizeOutlookMatterSearchResponse({
    request_id: "request-matter-search-001",
    omitted_count: 41,
    denied_count: 41,
    storage_pointer: "s3://must-not-return",
    items: [
      {
        ...matter,
        body: "must not return",
        bytes: "must not return",
        storage_pointer: "s3://must-not-return",
      },
      { ...matter, matter_id: "matter-closed", status: "closed" },
    ],
  });

  assert.deepEqual(result, {
    request_id: "request-matter-search-001",
    items: [matter],
  });
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.items), true);
  assert.equal(Object.isFrozen(result.items[0]), true);
  assert.equal(JSON.stringify(result).includes("must-not-return"), false);
  assert.equal("omitted_count" in result, false);
  assert.equal("denied_count" in result, false);
});

test("Matter selection is explicit, canonical, and retained for only one Outlook item context", () => {
  assert.equal(outlookMatterSelectionForContext({ selection: null, itemContext: context() }), null);

  const selection = createOutlookMatterSelection({
    itemContext: context(),
    matter,
  });
  assert.equal(selection.matter_id, matter.matter_id);
  assert.equal(selection.selected_explicitly, true);
  assert.equal(Object.isFrozen(selection), true);
  assert.equal(
    outlookMatterSelectionForContext({ selection, itemContext: context() }),
    selection,
  );
  assert.equal(
    outlookMatterSelectionForContext({ selection, itemContext: context("002") }),
    null,
  );
  assert.equal(
    outlookMatterSelectionForContext({
      selection,
      itemContext: context("001", { mode: "compose", provenance: "draft" }),
    }),
    null,
  );
  for (const invalidMatterId of [
    ` ${matter.matter_id}`,
    `${matter.matter_id} `,
    `matter-${"x".repeat(506)}`,
    "matter\u0000invalid",
  ]) {
    assert.throws(
      () => createOutlookMatterSelection({
        itemContext: context(),
        matter: { ...matter, matter_id: invalidMatterId },
      }),
      (error) => error.safe_error_code === "OUTLOOK_MATTER_SELECTION_REQUIRED",
    );
  }
});

test("Every write revalidation requires the same item key and an exact fresh canonical Matter result", () => {
  const selection = createOutlookMatterSelection({ itemContext: context(), matter });
  const request = createOutlookMatterRevalidationRequest({
    selection,
    itemContext: context(),
  });
  assert.equal(request.method, "GET");
  assert.match(request.path, /^\/api\/outlook\/matters\?q=/u);
  assert.equal(request.path.includes(encodeURIComponent(matter.matter_code)), true);

  const refreshed = revalidateOutlookMatterSelection({
    selection,
    itemContext: context(),
    searchResponse: {
      items: [{ ...matter, title: "Fresh server title", storage_pointer: "blocked" }],
    },
  });
  assert.equal(refreshed.matter_id, matter.matter_id);
  assert.equal(refreshed.title, "Fresh server title");
  assert.equal("storage_pointer" in refreshed, false);

  for (const fixture of [
    { itemContext: context("002"), searchResponse: { items: [matter] } },
    { itemContext: context(), searchResponse: { items: [] } },
    { itemContext: context(), searchResponse: { items: [{ ...matter, status: "closed" }] } },
    { itemContext: context(), searchResponse: { items: [{ ...matter, matter_id: "matter-other" }] } },
  ]) {
    assert.throws(
      () => revalidateOutlookMatterSelection({ selection, ...fixture }),
      (error) => error.safe_error_code === "OUTLOOK_MATTER_SELECTION_STALE",
    );
  }
});

test("Dependency-free debounce runs only the latest bounded search and quarantines stale results", async () => {
  const timers = new Map();
  const calls = [];
  const applied = [];
  let nextTimerId = 0;
  const debouncer = createOutlookMatterSearchDebouncer({
    delayMs: MAX_OUTLOOK_MATTER_SEARCH_DEBOUNCE_MS + 500,
    setTimer(run, delay) {
      const timerId = ++nextTimerId;
      timers.set(timerId, { run, delay });
      return timerId;
    },
    clearTimer(timerId) {
      timers.delete(timerId);
    },
    async requestJson(path) {
      calls.push(path);
      return { items: [{ ...matter, title: path }] };
    },
  });

  assert.equal(debouncer.search({ opened: false, query: "OUTLOOK" }), null);
  debouncer.search({
    opened: true,
    query: "first client",
    onResults: (result) => applied.push(result),
  });
  const latest = debouncer.search({
    opened: true,
    query: "second client",
    onResults: (result) => applied.push(result),
  });

  assert.equal(latest.query, "second client");
  assert.equal(timers.size, 1);
  const [{ run, delay }] = timers.values();
  assert.equal(delay, MAX_OUTLOOK_MATTER_SEARCH_DEBOUNCE_MS);
  await run();
  assert.deepEqual(calls, [latest.path]);
  assert.equal(applied.length, 1);
  assert.equal(applied[0].items[0].title, latest.path);

  debouncer.cancel();
  assert.equal(timers.size, 0);
});
