import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const testDir = dirname(fileURLToPath(import.meta.url));
const stylesPath = resolve(testDir, "../src/styles.css");
const styles = await readFile(stylesPath, "utf8");

function tokenValue(name) {
  const match = styles.match(new RegExp(`${name}:\\s*([^;]+);`));
  assert.ok(match, `missing ${name}`);
  return match[1].trim();
}

function lastRuleBody(selector) {
  const rulePattern = /([^{}]+)\{([^{}]*)\}/g;
  let match;
  let body = null;
  while ((match = rulePattern.exec(styles))) {
    const selectors = match[1].split(",").map((value) => value.trim());
    if (selectors.includes(selector)) body = match[2];
  }
  assert.ok(body, `missing final rule for ${selector}`);
  return body;
}

function lastPropertyValue(selector, property) {
  const rulePattern = /([^{}]+)\{([^{}]*)\}/g;
  const propertyPattern = new RegExp(`${property}:\\s*([^;]+);`);
  let match;
  let value = null;
  while ((match = rulePattern.exec(styles))) {
    const selectors = match[1].split(",").map((item) => item.trim());
    if (!selectors.includes(selector)) continue;
    const propertyMatch = match[2].match(propertyPattern);
    if (propertyMatch) value = propertyMatch[1].trim();
  }
  assert.ok(value, `missing ${property} for ${selector}`);
  return value;
}

test("global density tokens match the People directory reference", () => {
  assert.equal(tokenValue("--am-font-size-hero"), "40px");
  assert.equal(tokenValue("--am-font-size-section"), "16px");
  assert.equal(tokenValue("--am-font-size-body"), "14px");
  assert.equal(tokenValue("--am-font-size-meta"), "12px");
  assert.equal(tokenValue("--am-table-row-height"), "44px");
  assert.equal(tokenValue("--am-table-header-height"), "44px");
  assert.equal(tokenValue("--am-tab-height"), "42px");
  assert.equal(tokenValue("--am-page-pad-x"), "20px");
  assert.equal(tokenValue("--am-page-pad-y"), "16px");
  assert.equal(tokenValue("--am-panel-pad"), "16px");
  assert.doesNotMatch(styles, /font-size:\s*11(?:\.5)?px;/);
});

test("shared surfaces consume the density tokens", () => {
  assert.match(styles, /body\s*\{[^}]*font-size:\s*var\(--am-font-size-body\);[^}]*line-height:\s*var\(--am-line-height-body\);/);
  assert.match(styles, /\.panel-head\s*\{[^}]*min-height:\s*52px;[^}]*padding:\s*10px var\(--am-panel-pad\);/);
  assert.match(styles, /\.panel-head h2\s*\{[^}]*font-size:\s*var\(--am-font-size-section\);/);
  assert.match(styles, /\.data-table,\s*\.compact-table\s*\{[^}]*font-size:\s*var\(--am-font-size-body\);/);
  assert.match(styles, /\.data-table th,\s*\.data-table td,[\s\S]*?height:\s*var\(--am-table-row-height\);[\s\S]*?vertical-align:\s*middle;/);
  assert.match(styles, /\.client-selectable-header,[\s\S]*?\.matter-selectable-record-button,[\s\S]*?min-height:\s*var\(--am-table-row-height\);[\s\S]*?font-size:\s*var\(--am-font-size-body\);/);
});

test("late screen rules resolve to the shared density contract", () => {
  const contractStart = styles.lastIndexOf("\nbutton,\ninput,\nselect,\ntextarea {");
  assert.ok(contractStart > styles.lastIndexOf(".home-finance-operation-header select"));
  assert.equal(styles.match(/\nbutton,\ninput,\nselect,\ntextarea \{/g)?.length, 1);
  assert.match(lastRuleBody(".home-dashboard-hero h1"), /font-size:\s*var\(--am-font-size-hero\);/);
  assert.match(lastRuleBody(".matter-worktree-practice-areas button"), /min-height:\s*var\(--am-tab-height\);[^}]*font-size:\s*var\(--am-font-size-section\);/);
  assert.match(lastRuleBody('.hr-roster-surface[data-hr-workforce-density="compact"] .hr-roster-tabs button'), /min-height:\s*var\(--am-tab-height\);[^}]*font-size:\s*var\(--am-font-size-section\);/);
  assert.match(lastRuleBody(".activity-filter-tabs button"), /min-height:\s*var\(--am-tab-height\);[^}]*font-size:\s*var\(--am-font-size-body\);/);
  assert.match(lastRuleBody(".segmented button"), /min-height:\s*var\(--am-control-height\);[^}]*font-size:\s*var\(--am-font-size-body\);/);
  assert.match(lastRuleBody(".share-history-state th"), /height:\s*var\(--am-table-header-height\);[^}]*font-size:\s*var\(--am-font-size-body\);/);
  assert.equal(lastPropertyValue(".client-selectable-header", "min-height"), "var(--am-table-header-height)");
  assert.equal(lastPropertyValue(".matter-selectable-row", "font-size"), "var(--am-font-size-body)");
  assert.equal(lastPropertyValue(".home-finance-table-wrap thead th", "font-size"), "var(--am-font-size-body)");
  assert.equal(lastPropertyValue(".modal .modal-body", "padding"), "var(--am-panel-pad)");
  assert.equal(lastPropertyValue(".notification-meta", "font-size"), "var(--am-font-size-meta)");
  assert.equal(lastPropertyValue(".share-history-state td:first-child small", "font-size"), "var(--am-font-size-meta)");
  assert.equal(lastPropertyValue(".home-feed-read-panel p", "font-size"), "var(--am-font-size-body)");
});

test("responsive density changes spacing without viewport-scaled type", () => {
  assert.match(styles, /@media \(max-width: 1180px\)\s*\{\s*:root,\s*html\[data-skin="forest"\]\s*\{[^}]*--am-page-pad-x:\s*16px;[^}]*--am-page-pad-y:\s*14px;/);
  assert.match(styles, /@media \(max-width: 820px\)\s*\{\s*:root,\s*html\[data-skin="forest"\]\s*\{[^}]*--am-page-pad-x:\s*12px;[^}]*--am-panel-pad:\s*14px;/);
  assert.match(styles, /@media \(max-width: 640px\)\s*\{\s*:root,\s*html\[data-skin="forest"\]\s*\{[^}]*--am-font-size-hero:\s*34px;[^}]*--am-page-pad-x:\s*10px;/);
  assert.doesNotMatch(styles, /font-size:\s*(?:clamp|min|max|calc)\([^;]*(?:vw|vh|vmin|vmax)/);
});
