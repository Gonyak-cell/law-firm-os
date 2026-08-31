import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const MATTER_SOURCE = readFileSync(new URL("../src/outlook-matter-shell.jsx", import.meta.url), "utf8");
const INQUIRY_SOURCE = readFileSync(new URL("../src/outlook-inquiry-shell.jsx", import.meta.url), "utf8");

// This is intentionally authored from OUTM-09 rather than copied from the
// implementation. The profile leaf must earn this exact order and vocabulary.
const EXPECTED_RAIL = [
  ["mail.save-with-attachments", "저장 옵션"],
  ["matter.search", "저장 위치 선택"],
  ["task.create", "관련 작업 만들기"],
  ["time-entry.draft", "시간 기록 초안"],
  ["all-functions", "추가 작업"],
];

test("OUTM-09 matter profile leaf owns exactly five ordered text actions", () => {
  assert.match(MATTER_SOURCE, /export const OUTLOOK_MATTER_RAIL = Object\.freeze\(\[/u);
  let cursor = MATTER_SOURCE.indexOf("OUTLOOK_MATTER_RAIL");
  for (const [featureId, label] of EXPECTED_RAIL) {
    const next = MATTER_SOURCE.indexOf(`featureId: "${featureId}"`, cursor);
    assert.ok(next > cursor, `${featureId} must follow the previous rail action`);
    const descriptor = MATTER_SOURCE.slice(next, MATTER_SOURCE.indexOf("}),", next) + 3);
    assert.match(descriptor, new RegExp(`label: "${label}"`, "u"));
    assert.doesNotMatch(descriptor, /Icon:/u);
    cursor = next;
  }
  const baseRailSource = MATTER_SOURCE.slice(
    MATTER_SOURCE.indexOf("export const OUTLOOK_MATTER_RAIL"),
    MATTER_SOURCE.indexOf("export const OUTLOOK_VAULT_ATTACHMENT_RAIL_ITEM"),
  );
  assert.equal((baseRailSource.match(/featureId: "/gu) ?? []).length, EXPECTED_RAIL.length);
  assert.match(MATTER_SOURCE, /view: "catalog"/u);
  assert.doesNotMatch(MATTER_SOURCE, /inquiry\.entry|문의 기능|UserPlus|lucide-react/u);
});

test("Vault attachment is added only to the enabled compose rail", () => {
  assert.match(MATTER_SOURCE, /featureId: "vault\.attach-exact-version"/u);
  assert.match(MATTER_SOURCE, /label: "Vault에서 첨부"/u);
  assert.match(MATTER_SOURCE, /itemMode === "compose" && vaultExactAttachmentEnabled === true/u);
  assert.match(MATTER_SOURCE, /Object\.freeze\(\[OUTLOOK_VAULT_ATTACHMENT_RAIL_ITEM, \.\.\.OUTLOOK_MATTER_RAIL\]\)/u);
  assert.doesNotMatch(
    MATTER_SOURCE.slice(
      MATTER_SOURCE.indexOf("OUTLOOK_VAULT_ATTACHMENT_RAIL_ITEM"),
      MATTER_SOURCE.indexOf("export function outlookMatterRailForContext"),
    ),
    /Icon:/u,
  );
});

test("the matter wrapper fixes its profile and descriptor and fails closed on a mismatch", () => {
  assert.match(MATTER_SOURCE, /export function OutlookMatterCompactShell\(/u);
  assert.match(MATTER_SOURCE, /profile = MATTER_PROFILE/u);
  assert.doesNotMatch(MATTER_SOURCE, /railItems:/u);
  assert.match(MATTER_SOURCE, /if \(profile !== MATTER_PROFILE\) return null/u);
  assert.match(MATTER_SOURCE, /profile=\{MATTER_PROFILE\}/u);
  assert.match(MATTER_SOURCE, /railItems=\{outlookMatterRailForContext/u);
  assert.match(MATTER_SOURCE, /itemMode/u);
  assert.match(MATTER_SOURCE, /vaultExactAttachmentEnabled/u);
  assert.match(MATTER_SOURCE, /layout="filing"/u);
  assert.doesNotMatch(MATTER_SOURCE, /profile=\{props\.profile\}|railItems=\{props\.railItems\}/u);
});

test("profile leaves keep the exact rail boundaries separate", () => {
  assert.doesNotMatch(MATTER_SOURCE, /OUTLOOK_INQUIRY_RAIL|OUTLOOK_INQUIRY|inquiry-only/u);
  assert.doesNotMatch(INQUIRY_SOURCE, /OUTLOOK_MATTER_RAIL|mail\.save-with-attachments|matter\.search|task\.create|time-entry\.draft|all-functions/u);
});
