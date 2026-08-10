import assert from "node:assert/strict";
import test from "node:test";
import {
  filterAndPaginateOutlookMatters,
  parseOutlookMatterSearchInput,
} from "../src/outlook-matter-search-contract.js";

const records = Object.freeze([
  Object.freeze({ matter_id: "matter-c", matter_code: "B-001", title: "Beta", client_display_name: "Client", status: "open" }),
  Object.freeze({ matter_id: "matter-a", matter_code: "A-001", title: "Alpha", client_display_name: "Client", status: "open" }),
  Object.freeze({ matter_id: "matter-b", matter_code: "A-001", title: "Alpha", client_display_name: "Client", status: "paused" }),
]);

test("Matter search has deterministic stable sorting and cursor pagination", () => {
  const input = parseOutlookMatterSearchInput({ query: "client", limit: 2 });
  const first = filterAndPaginateOutlookMatters({ items: records, input });
  const reversed = filterAndPaginateOutlookMatters({ items: [...records].reverse(), input });

  assert.deepEqual(first.items.map((item) => item.matter_id), ["matter-a", "matter-b"]);
  assert.deepEqual(reversed.items.map((item) => item.matter_id), ["matter-a", "matter-b"]);
  assert.equal(first.page_info.has_more, true);
  assert.ok(first.page_info.next_cursor);

  const second = filterAndPaginateOutlookMatters({
    items: records,
    input: parseOutlookMatterSearchInput({
      query: "client",
      limit: 2,
      cursor: first.page_info.next_cursor,
    }),
  });
  assert.deepEqual(second.items.map((item) => item.matter_id), ["matter-c"]);
  assert.deepEqual(second.page_info, {
    limit: 2,
    has_more: false,
    next_cursor: null,
  });
  assert.throws(
    () => filterAndPaginateOutlookMatters({
      items: records,
      input: parseOutlookMatterSearchInput({
        query: "different",
        limit: 2,
        cursor: first.page_info.next_cursor,
      }),
    }),
    /cursor does not match/u,
  );
});

test("exact canonical revalidation is independent of cached display text", () => {
  const result = filterAndPaginateOutlookMatters({
    items: [{
      ...records[0],
      matter_code: "RENAMED-001",
      title: "Renamed title",
      client_display_name: "Renamed client",
    }],
    input: parseOutlookMatterSearchInput({
      matter_id: "matter-c",
      limit: 1,
    }),
  });
  assert.deepEqual(result.items.map((item) => item.matter_id), ["matter-c"]);
  assert.equal(result.page_info.has_more, false);
});
