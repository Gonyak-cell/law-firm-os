import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const MATTER_SOURCE = readFileSync(new URL("../src/outlook-matter-shell.jsx", import.meta.url), "utf8");
const INQUIRY_SOURCE = readFileSync(new URL("../src/outlook-inquiry-shell.jsx", import.meta.url), "utf8");

// This is intentionally authored from OUTM-09 rather than copied from the
// implementation. The profile leaf must earn this exact order and vocabulary.
const EXPECTED_RAIL = [
  ["mail.save-with-attachments", "메일과 첨부 저장", "Archive"],
  ["matter.search", "Matter 찾기", "Search"],
  ["task.create", "업무 만들기", "ListTodo"],
  ["time-entry.draft", "시간기록 초안", "TimerReset"],
  ["all-functions", "전체 기능", "Menu"],
];

test("OUTM-09 matter profile leaf owns exactly five ordered accessible actions", () => {
  assert.match(MATTER_SOURCE, /export const OUTLOOK_MATTER_RAIL = Object\.freeze\(\[/u);
  let cursor = MATTER_SOURCE.indexOf("OUTLOOK_MATTER_RAIL");
  for (const [featureId, label, icon] of EXPECTED_RAIL) {
    const next = MATTER_SOURCE.indexOf(`featureId: "${featureId}"`, cursor);
    assert.ok(next > cursor, `${featureId} must follow the previous rail action`);
    const descriptor = MATTER_SOURCE.slice(next, MATTER_SOURCE.indexOf("}),", next) + 3);
    assert.match(descriptor, new RegExp(`label: "${label}"`, "u"));
    assert.match(descriptor, new RegExp(`Icon: ${icon}`, "u"));
    cursor = next;
  }
  assert.equal((MATTER_SOURCE.match(/featureId: "/gu) ?? []).length, EXPECTED_RAIL.length);
  assert.match(MATTER_SOURCE, /view: "catalog"/u);
  assert.doesNotMatch(MATTER_SOURCE, /inquiry\.entry|문의 기능|UserPlus/u);
});

test("the matter wrapper fixes its profile and descriptor and fails closed on a mismatch", () => {
  assert.match(MATTER_SOURCE, /export function OutlookMatterCompactShell\(/u);
  assert.match(MATTER_SOURCE, /profile = MATTER_PROFILE/u);
  assert.match(MATTER_SOURCE, /railItems: _railItems/u);
  assert.match(MATTER_SOURCE, /if \(profile !== MATTER_PROFILE\) return null/u);
  assert.match(MATTER_SOURCE, /profile=\{MATTER_PROFILE\}/u);
  assert.match(MATTER_SOURCE, /railItems=\{OUTLOOK_MATTER_RAIL\}/u);
  assert.doesNotMatch(MATTER_SOURCE, /profile=\{props\.profile\}|railItems=\{props\.railItems\}/u);
});

test("profile leaves keep the exact rail boundaries separate", () => {
  assert.doesNotMatch(MATTER_SOURCE, /OUTLOOK_INQUIRY_RAIL|OUTLOOK_INQUIRY|inquiry-only/u);
  assert.doesNotMatch(INQUIRY_SOURCE, /OUTLOOK_MATTER_RAIL|mail\.save-with-attachments|matter\.search|task\.create|time-entry\.draft|all-functions/u);
});
