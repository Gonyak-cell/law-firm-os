import assert from "node:assert/strict";
import test from "node:test";
import {
  createOutlookMatterRevalidationRequest,
  createOutlookMatterSearchRequest,
  createOutlookMatterSelection,
  outlookMatterSelectionForContext,
  revalidateOutlookMatterSelection,
} from "../src/outlook-matter-search.js";

function itemContext(suffix = "a") {
  return {
    item: {
      rest_message_id: `rest-${suffix}`,
      internet_message_id: `<message-${suffix}@example.invalid>`,
      conversation_id: `conversation-${suffix}`,
    },
    mode: "read",
    provenance: "received",
  };
}

const matter = {
  matter_id: "matter-main-wiring",
  matter_code: "OUTLOOK/MAIN/001",
  title: "Main wiring Matter",
  client_display_name: "AMIC Client",
  status: "open",
};

test("Matter remains an explicit, item-bound search and revalidation flow", () => {
  assert.equal(createOutlookMatterSearchRequest({ opened: false, query: "Matter" }), null);
  const search = createOutlookMatterSearchRequest({ opened: true, query: "Matter", limit: 50 });
  assert.equal(search.path, "/api/outlook/matters?q=Matter&limit=20");

  const selected = createOutlookMatterSelection({ itemContext: itemContext(), matter });
  assert.strictEqual(outlookMatterSelectionForContext({ selection: selected, itemContext: itemContext() }), selected);
  assert.equal(outlookMatterSelectionForContext({ selection: selected, itemContext: itemContext("b") }), null);
  assert.equal(createOutlookMatterRevalidationRequest({ selection: selected, itemContext: itemContext() }).path,
    "/api/outlook/matters?matter_id=matter-main-wiring&limit=1");
  const refreshed = revalidateOutlookMatterSelection({
    selection: selected,
    itemContext: itemContext(),
    searchResponse: { items: [{ ...matter, title: "Fresh title" }] },
  });
  assert.equal(refreshed.matter_id, matter.matter_id);
  assert.equal(refreshed.title, "Fresh title");
});
