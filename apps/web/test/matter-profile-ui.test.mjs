import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const profilePanel = readFileSync(new URL("../src/components/MatterProfilePanel.jsx", import.meta.url), "utf8");
const mattersSurface = readFileSync(new URL("../src/components/MattersSurface.jsx", import.meta.url), "utf8");

test("Matter detail surface mounts the type-specific profile panel and stakeholder references", () => {
  for (const label of ["민사소송", "형사소송", "행정소송", "Deal", "기업자문", "재판부 전화번호", "담당자 전화번호"]) {
    assert.match(profilePanel, new RegExp(label));
  }
  assert.match(profilePanel, /data-matter-profile-panel/);
  assert.match(profilePanel, /data-matter-stakeholder-list/);
  assert.match(profilePanel, /연락처 참조/);
  assert.match(profilePanel, /STAKEHOLDER_FIELD_ROLES/);
  assert.match(profilePanel, /statusOutcome === "updated"/);
  assert.match(profilePanel, /statusOutcome === "created"/);
  assert.match(profilePanel, /review_status: "review_required"/);
  assert.match(mattersSurface, /<MatterProfilePanel/);
});
