import assert from "node:assert/strict";
import test from "node:test";
import {
  revalidateOutlookMatterWrite,
} from "../src/outlook-matter-write-guard.js";

test("write guard re-reads active Matter state and permission on every call", () => {
  let matter = { matter_id: "matter-001", status: "open" };
  let allowed = true;
  const input = {
    tenantId: "tenant-001",
    matterId: "matter-001",
    getMatter: () => matter,
    authorize: () => ({ effect: allowed ? "allow" : "deny", reason: "fixture" }),
  };

  assert.equal(revalidateOutlookMatterWrite(input).outcome, "allowed");
  allowed = false;
  assert.equal(revalidateOutlookMatterWrite(input).outcome, "permission_changed");
  allowed = true;
  matter = { ...matter, status: "closed" };
  assert.equal(revalidateOutlookMatterWrite(input).outcome, "matter_inactive");
  matter = null;
  assert.equal(revalidateOutlookMatterWrite(input).outcome, "matter_not_found");
});
