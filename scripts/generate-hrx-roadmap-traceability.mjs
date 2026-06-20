#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const backlogPath = resolve(root, "docs/hrx-enterprise/roadmap-package/HRX_Roadmap_03_TUW_BACKLOG.csv");
const prPath = resolve(root, "docs/hrx-enterprise/roadmap-package/HRX_Roadmap_04_PR_SEQUENCE.md");
const statusLedgerPath = resolve(root, "docs/hrx-enterprise/tuw-status-ledger.json");

function parseCsvLine(line) {
  const cells = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === "\"") {
      if (quoted && line[index + 1] === "\"") {
        current += "\"";
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === "," && !quoted) {
      cells.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current);
  return cells;
}

function parseCsv(text) {
  const lines = text.replace(/^\uFEFF/, "").trim().split(/\r?\n/);
  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) =>
    Object.fromEntries(parseCsvLine(line).map((value, index) => [headers[index], value])),
  );
}

function escapePipe(value) {
  return String(value ?? "")
    .replace(/\r?\n/g, " ")
    .replace(/\|/g, "\\|")
    .trim();
}

function groupBy(rows, field) {
  return rows.reduce((accumulator, row) => {
    const key = row[field] || "unknown";
    accumulator.set(key, [...(accumulator.get(key) ?? []), row]);
    return accumulator;
  }, new Map());
}

function parsePrSequence(text) {
  const rows = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.startsWith("| PR-")) continue;
    const cells = line
      .slice(1, -1)
      .split("|")
      .map((cell) => cell.trim());
    if (cells.length >= 5) {
      rows.push({
        pr: cells[0],
        branch: cells[1].replaceAll("`", ""),
        layer: cells[2],
        scope: cells[3],
        exitCriteria: cells[4],
      });
    }
  }
  return rows;
}

const rows = parseCsv(readFileSync(backlogPath, "utf8"));
const prRows = parsePrSequence(readFileSync(prPath, "utf8"));
const statusLedger = existsSync(statusLedgerPath)
  ? JSON.parse(readFileSync(statusLedgerPath, "utf8"))
  : { entries: [] };
const statusById = new Map((statusLedger.entries ?? []).map((entry) => [entry.id, entry]));
const byLayer = groupBy(rows, "Layer");
const bySeverity = groupBy(rows, "Severity");
const byPr = groupBy(rows, "PR sequence");

const matrixLines = [
  "# HRX Enterprise Roadmap TUW Traceability Matrix",
  "",
  "Status: PR-00 governance baseline",
  "Date: 2026-06-20",
  "Canonical source: `docs/hrx-enterprise/roadmap-package/HRX_Roadmap_03_TUW_BACKLOG.csv`",
  `Imported TUWs: ${rows.length}`,
  `P0 TUWs: ${bySeverity.get("P0")?.length ?? 0}`,
  `P1 TUWs: ${bySeverity.get("P1")?.length ?? 0}`,
  "Execution sequence: PR-00 through PR-15",
  "Current boundary: `runtime_api_evidence_only__durable_persistence_open`",
  "Target state: `runtime_write_ready__durable_persistence_guarded`",
  "",
  "## Matrix Rules",
  "",
  "- Every roadmap TUW must have an ID, layer, severity, target files, acceptance criteria, validation command, dependency, PR sequence, and risk.",
  "- `Current status` reflects implementation status at roadmap intake time; it is not proof of completion.",
  "- P0 TUWs block the relevant PR exit gate until implemented or the plan is explicitly changed by owner decision.",
  "- P1 TUWs are still in the full implementation goal and cannot be ignored in final completion accounting.",
  "- Descriptor, fixture, static UI, and in-memory-only evidence cannot satisfy durable runtime or release readiness.",
  "",
  "## Summary",
  "",
  "| Dimension | Count |",
  "| --- | ---: |",
  `| Total TUWs | ${rows.length} |`,
  `| P0 | ${bySeverity.get("P0")?.length ?? 0} |`,
  `| P1 | ${bySeverity.get("P1")?.length ?? 0} |`,
  ...[...byLayer.entries()].map(([layer, items]) => `| ${layer} | ${items.length} |`),
  "",
  "## Matrix",
  "",
  "| ID | Layer | Epic | Severity | Source status | Implementation status | Evidence | Target files | Acceptance criteria | Tests/commands | Dependencies | PR sequence | Risk if skipped |",
  "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
  ...rows.map((row) => {
    const status = statusById.get(row.ID);
    return [
      row.ID,
      row.Layer,
      row.Epic,
      row.Severity,
      row["Current status"],
      status?.status ?? "open",
      status?.evidence?.join("; ") ?? "",
      row["Target files"],
      row["Acceptance criteria"],
      row["Tests/commands"],
      row.Dependencies,
      row["PR sequence"],
      row["Risk if skipped"],
    ]
      .map(escapePipe)
      .join(" | ")
      .replace(/^/, "| ")
      .replace(/$/, " |");
  }),
  "",
];

const boardLines = [
  "# HRX Sequential PR Board",
  "",
  "Status: PR-00 governance baseline",
  "Date: 2026-06-20",
  "Canonical source: `docs/hrx-enterprise/roadmap-package/HRX_Roadmap_04_PR_SEQUENCE.md`",
  "Backlog source: `docs/hrx-enterprise/roadmap-package/HRX_Roadmap_03_TUW_BACKLOG.csv`",
  "",
  "## Sequence Rules",
  "",
  "- Implement PR-00 through PR-15 in order.",
  "- Do not start a later PR implementation until the prior PR gate has current repo evidence or an owner decision changes the sequence.",
  "- PR-15 prepares a decision package; it does not self-authorize go-live.",
  "",
  "| PR | Branch | Layer | TUWs | P0 | P1 | Scope | Exit criteria |",
  "| --- | --- | --- | ---: | ---: | ---: | --- | --- |",
  ...prRows.map((prRow) => {
    const items = byPr.get(prRow.pr) ?? [];
    return [
      prRow.pr,
      `\`${prRow.branch}\``,
      prRow.layer,
      items.length,
      items.filter((item) => item.Severity === "P0").length,
      items.filter((item) => item.Severity === "P1").length,
      prRow.scope,
      prRow.exitCriteria,
    ]
      .map(escapePipe)
      .join(" | ")
      .replace(/^/, "| ")
      .replace(/$/, " |");
  }),
  "",
];

writeFileSync(resolve(root, "docs/hrx-enterprise/tuw-traceability-matrix.md"), `${matrixLines.join("\n").trimEnd()}\n`);
writeFileSync(resolve(root, "docs/hrx-enterprise/sequential-pack-pr-board.md"), `${boardLines.join("\n").trimEnd()}\n`);

console.log("HRX roadmap traceability generated.");
console.log(`tuw_count: ${rows.length}`);
console.log(`p0_count: ${bySeverity.get("P0")?.length ?? 0}`);
console.log(`p1_count: ${bySeverity.get("P1")?.length ?? 0}`);
console.log(`pr_count: ${prRows.length}`);
