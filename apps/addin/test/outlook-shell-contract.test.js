import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const SRC_DIR = path.join(TEST_DIR, "..", "src");

async function source(name) {
  return fs.readFile(path.join(SRC_DIR, name), "utf8");
}

test("OUTM-08 exposes the compact AMIC primitive vocabulary without decorative fallbacks", async () => {
  const shell = await source("outlook-compact-shell.jsx");
  const styles = await source("styles.css");
  for (const marker of [
    "outlook-compact-shell",
    "outlook-icon-rail",
    "outlook-icon-button",
    "outlook-overlay-layer",
    "outlook-flat-action-row",
    "outlook-one-line-field",
    "outlook-critical-value-row",
    "outlook-inline-operation-state",
    "outlook-visually-hidden",
  ]) {
    assert.match(shell, new RegExp(marker));
    assert.match(styles, new RegExp(`\\.${marker}`));
  }
  assert.match(styles, /--outlook-rail-width:\s*44px/u);
  assert.match(styles, /@media\s*\(prefers-reduced-motion:\s*reduce\)/u);
  assert.match(styles, /overflow-x:\s*hidden/u);
  assert.match(styles, /outlook-critical-value[\s\S]*white-space:\s*nowrap/u);
  for (const forbidden of [
    "pane-header",
    "mode-badge",
    "status-stack",
    "operation-summary",
    "rail-label",
    "rail-tooltip",
    "title=",
    "gradient",
  ]) {
    assert.doesNotMatch(shell, new RegExp(forbidden, "u"));
    assert.doesNotMatch(styles, new RegExp(forbidden, "u"));
  }
});

test("the shared shell has no profile vocabulary or profile-specific icons", async () => {
  const shell = await source("outlook-compact-shell.jsx");
  for (const forbidden of [
    "matter-full",
    "inquiry-only",
    "mail.save-with-attachments",
    "matter.search",
    "task.create",
    "time-entry.draft",
    "all-functions",
    "inquiry.entry",
    "메일과 첨부 저장",
    "Matter 찾기",
    "업무 만들기",
    "시간기록 초안",
    "전체 기능",
    "문의 기능",
    "Archive",
    "ListTodo",
    "Search",
    "TimerReset",
    "UserPlus",
    "Menu",
  ]) {
    assert.doesNotMatch(shell, new RegExp(forbidden, "u"));
  }
  assert.match(shell, /function OutlookIconRail\(\{[\s\S]*railItems/u);
  assert.match(shell, /const items = Array\.isArray\(railItems\) \? railItems : \[\]/u);
  assert.match(shell, /if \(!profile \|\| !Array\.isArray\(railItems\)\) return null/u);
  assert.doesNotMatch(shell, /railForProfile|profile\s*===/u);
});

test("the overlay is portal-based and has one scrim, dialog heading, close control, and local focus guards", async () => {
  const shell = await source("outlook-compact-shell.jsx");
  assert.match(shell, /createPortal\(/u);
  assert.equal((shell.match(/className="outlook-overlay-scrim"/gu) ?? []).length, 1);
  assert.doesNotMatch(shell, /<button[^>]*outlook-overlay-scrim/u);
  assert.match(shell, /className="outlook-overlay-scrim"[^>]*role="presentation"/u);
  assert.match(shell, /outlook-overlay-scrim[\s\S]*onPointerDown=\{\(event\) => \{[\s\S]*event\.preventDefault\(\)[\s\S]*requestClose\("outside"\)/u);
  assert.equal((shell.match(/outlook-overlay-close/gu) ?? []).length, 2);
  assert.match(shell, /role="dialog"/u);
  assert.match(shell, /aria-modal="true"/u);
  assert.match(shell, /className="outlook-visually-hidden"/u);
  assert.match(shell, /key === "Escape"/u);
  assert.match(shell, /document\.body\.style\.overflow = "hidden"/u);
  assert.match(shell, /document\.getElementById\("root"\)/u);
  assert.match(shell, /focusables\(dialog\)/u);
  assert.match(shell, /outlook-icon-rail button:not\(\[disabled\]\)/u);
  assert.match(shell, /isConnected[\s\S]*disabled[\s\S]*focus\(\)/u);
  assert.match(shell, /function scheduleOverlayFocusRestore/u);
  assert.match(shell, /requestAnimationFrame\(/u);
  assert.match(shell, /cancelAnimationFrame/u);
  assert.match(shell, /isOpenRef\.current/u);
  assert.match(shell, /mountedRef\.current/u);
  assert.match(shell, /mountedRef\.current && !isOpenRef\.current[\s\S]*restoreFocusAfterOverlayClose/u);
  assert.match(shell, /function OutlookCriticalValueRow[\s\S]*const criticalId = useId\(\)/u);
  assert.match(shell, /<code id=\{criticalId\}[\s\S]*aria-label=\{label\}/u);
  assert.match(shell, /aria-controls=\{criticalId\}/u);
  const critical = shell.slice(shell.indexOf("function OutlookCriticalValueRow"), shell.indexOf("function focusables"));
  assert.match(critical, /typeof onCopy === "function"/u);
  assert.doesNotMatch(shell, /window\.parent|parent\.document/u);
});

test("operation status has one recovery live region and failure alert linkage", async () => {
  const shell = await source("outlook-compact-shell.jsx");
  assert.match(shell, /onCloseRef = useRef\(onClose\)/u);
  assert.match(shell, /onCloseRef\.current = onClose/u);
  assert.match(shell, /\[isOpen, state\?\.openerId, state\?\.restoreFocusTo\]/u);
  assert.match(shell, /OPERATION_FAILURE_STATES/u);
  assert.match(shell, /role=\{isFailureLike \? "alert" : "status"\}/u);
  assert.match(shell, /aria-controls=\{isFailureLike \? recoveryId : undefined\}/u);
  assert.match(shell, /id=\{recoveryId\}[\s\S]*aria-live="polite"/u);
  assert.equal((shell.match(/aria-live="polite"/gu) ?? []).length, 1);
});
