#!/usr/bin/env node
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const BRAND_PATH = "apps/web/src/brand/brand.js";
const NAMING_RULES_PATH = "docs/launch/matter-naming-rules.md";
const BACKLOG_PATH = "docs/launch/matter-branding-backlog.md";
const P1_EVIDENCE_PATH = "docs/lazycodex/evidence/matter-desktop/lcx-desk-01-shell.md";

const REQUIRED_CLASSIFICATIONS = [
  "product_brand",
  "domain_object",
  "machine_identifier",
  "evidence",
  "historical"
];

const PRODUCT_MISUSE_PATTERNS = [
  /\bAsk matter\b/,
  /\bask matter\b/,
  /\bmatter workspace\b/,
  /\bwith matter\b/,
  /\bto matter\b/,
  /\bfrom matter\b/,
  /\bnews from matter\b/,
  /\bsetting up matter\b/,
  /\bmatter-ready-\d+\b/,
  /matter에게/,
  /matter 작업공간/,
  /matter는/,
  /matter 시작/,
  /matter에 로그인/
];

function read(path) {
  return readFileSync(path, "utf8");
}

function stripCell(value) {
  return (value ?? "").trim().replace(/^`|`$/g, "");
}

function parseBacklogRows(markdown) {
  const rows = [];
  for (const line of markdown.split("\n")) {
    if (!line.startsWith("| MB-") && !line.startsWith("| MP-")) continue;
    const cells = line.split("|").map((cell) => cell.trim());
    if (line.startsWith("| MB-")) {
      rows.push({
        id: cells[1],
        file: stripCell(cells[2]),
        currentText: stripCell(cells[3]),
        targetText: stripCell(cells[4]),
        classification: stripCell(cells[5]),
        tuw: stripCell(cells[6]),
        status: stripCell(cells[7])
      });
    } else {
      rows.push({
        id: cells[1],
        surface: stripCell(cells[2]),
        examples: stripCell(cells[3]),
        classification: stripCell(cells[4]),
        reason: stripCell(cells[5])
      });
    }
  }
  return rows;
}

function isProductBrandMisuse(text) {
  return PRODUCT_MISUSE_PATTERNS.some((pattern) => pattern.test(text));
}

function isPreservedException(text) {
  return (
    /\bMatter (Core|API|Home|Vault|Graph|Analytics|Profiles)\b/.test(text) ||
    /\bmatter_id\b/.test(text) ||
    /\/api\/matters/.test(text) ||
    /\blaw-firm-os\b/.test(text) ||
    /packages\/matter/.test(text) ||
    /docs\/launch\/matter-naming-rules\.md/.test(text)
  );
}

function productRowsForSource(rows) {
  return rows.filter(
    (row) =>
      row.id.startsWith("MB-") &&
      row.status === "planned" &&
      (row.classification === "product_brand" || row.classification === "ui_brand")
  );
}

function scanSourceForUnclassifiedProductCopy(rows) {
  const brandRows = rows.filter((row) => row.id.startsWith("MB-"));
  const plannedRows = productRowsForSource(rows);
  const sourcePaths = [...new Set(brandRows.map((row) => row.file))].sort();
  const findings = [];

  for (const path of sourcePaths) {
    const allowedTexts = plannedRows.filter((row) => row.file === path).map((row) => row.currentText);
    const lines = read(path).split("\n");
    lines.forEach((line, index) => {
      if (!isProductBrandMisuse(line)) return;
      if (allowedTexts.some((text) => text && line.includes(text))) return;
      findings.push({
        path,
        line: index + 1,
        text: line.trim()
      });
    });
  }

  return findings;
}

assert(existsSync(BRAND_PATH), `${BRAND_PATH} is missing`);
assert(existsSync(NAMING_RULES_PATH), `${NAMING_RULES_PATH} is missing`);
assert(existsSync(BACKLOG_PATH), `${BACKLOG_PATH} is missing`);
if (!existsSync(P1_EVIDENCE_PATH)) {
  assert(!existsSync("apps/desktop"), "P0 must not create apps/desktop");
}

const brandSource = read(BRAND_PATH);
const namingRules = read(NAMING_RULES_PATH);
const backlog = read(BACKLOG_PATH);
const rows = parseBacklogRows(backlog);

assert.match(brandSource, /PRODUCT_BRAND\s*=\s*"matter"/, "PRODUCT_BRAND must be matter");
assert.match(brandSource, /UI_BRAND\s*=\s*"matter"/, "UI_BRAND must be matter");
assert.match(namingRules, /Product brand \| matter/, "matter product brand rule is missing");
assert.match(namingRules, /Machine identifier \| `law-firm-os`/, "law-firm-os preservation rule is missing");

for (const classification of REQUIRED_CLASSIFICATIONS) {
  assert(
    rows.some((row) => row.classification === classification || backlog.includes(classification)),
    `missing classification ${classification}`
  );
}

assert.equal(isProductBrandMisuse("Ask matter"), true, "misuse probe must fail without backlog classification");
assert.equal(isPreservedException("Matter Core"), true, "domain_object probe must pass");
assert.equal(isPreservedException("matter_id"), true, "machine_identifier probe must pass");
assert.equal(isPreservedException("docs/launch/matter-naming-rules.md"), true, "historical probe must pass");

const unclassifiedFindings = scanSourceForUnclassifiedProductCopy(rows);
assert.deepEqual(unclassifiedFindings, [], "unclassified user-facing matter brand misuse found");

console.log(
  JSON.stringify(
    {
      verdict: "PASS",
      product_brand: "matter",
      ui_brand: "matter",
      backlog: BACKLOG_PATH,
      planned_product_brand_changes: productRowsForSource(rows).length,
      preserve_classifications: rows.filter((row) => row.id.startsWith("MP-")).length,
      unclassified_user_facing_misuse: unclassifiedFindings.length,
      probes: {
        user_facing_misuse_without_backlog: "fails",
        domain_object: "passes",
        machine_identifier: "passes",
        historical: "passes"
      }
    },
    null,
    2
  )
);
