import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

export const MATTER_SMALL_FIRM_TUW_IDS = Object.freeze(
  Array.from({ length: 42 }, (_, index) => `TUW-${String(index + 1).padStart(2, "0")}`),
);
export const MATTER_SMALL_FIRM_RF_IDS = Object.freeze(
  Array.from({ length: 14 }, (_, index) => `RF-${String(index + 1).padStart(2, "0")}`),
);
export const MATTER_SMALL_FIRM_GATE_IDS = Object.freeze(
  Array.from({ length: 6 }, (_, index) => `G${index}`),
);

const VALID_STATUSES = new Set(["PENDING", "IN_PROGRESS", "BLOCKED", "COMPLETE"]);

export function parseMatterSmallFirmGoal(markdown) {
  const rows = String(markdown)
    .split(/\r?\n/)
    .map((line) => line.match(/^\|\s*(TUW-\d{2})\s*\|.*\|\s*(PENDING|IN_PROGRESS|BLOCKED|COMPLETE)\s*\|$/))
    .filter(Boolean)
    .map((match) => Object.freeze({ id: match[1], status: match[2] }));

  return Object.freeze(rows);
}

export function parseMatterSmallFirmExecutionEvidence(markdown) {
  const ids = String(markdown)
    .split(/\r?\n/)
    .map((line) => line.match(
      /^\|\s*\d{4}-\d{2}-\d{2}\s*\|\s*(TUW-\d{2})\s*\|\s*.+\|\s*.+\|\s*.+\|$/,
    ))
    .filter(Boolean)
    .map((match) => match[1]);

  return Object.freeze(ids);
}

export function parseMatterSmallFirmRemediations(markdown) {
  const rows = String(markdown)
    .split(/\r?\n/)
    .map((line) => line.split("|").slice(1, -1).map((cell) => cell.trim()))
    .filter((cells) => (
      cells.length === 6
      && /^RF-\d{2}$/.test(cells[0])
      && VALID_STATUSES.has(cells[5])
    ))
    .map((cells) => Object.freeze({
      id: cells[0],
      dependencies: Object.freeze(cells[4].match(/RF-\d{2}/g) ?? []),
      status: cells[5],
    }));

  return Object.freeze(rows);
}

export function parseMatterSmallFirmRemediationEvidence(markdown) {
  const ids = String(markdown)
    .split(/\r?\n/)
    .map((line) => line.match(
      /^\|\s*\d{4}-\d{2}-\d{2}\s*\|\s*(RF-\d{2})\s*\|\s*.+\|\s*.+\|\s*.+\|$/,
    ))
    .filter(Boolean)
    .map((match) => match[1]);

  return Object.freeze(ids);
}

export function parseMatterSmallFirmFinalGates(markdown) {
  const gates = String(markdown)
    .split(/\r?\n/)
    .map((line) => line.match(/^\|\s*(G[0-5])\s*\|\s*(PASS|FAIL)\s*\|/))
    .filter(Boolean)
    .map((match) => Object.freeze({ id: match[1], status: match[2] }));

  return Object.freeze(gates);
}

export function validateMatterSmallFirmGoal(markdown, { requireComplete = false } = {}) {
  const rows = parseMatterSmallFirmGoal(markdown);
  const executionEvidence = parseMatterSmallFirmExecutionEvidence(markdown);
  const remediationRows = parseMatterSmallFirmRemediations(markdown);
  const remediationEvidence = parseMatterSmallFirmRemediationEvidence(markdown);
  const finalGates = parseMatterSmallFirmFinalGates(markdown);
  const ids = rows.map((row) => row.id);
  const duplicates = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))].sort();
  const missing = MATTER_SMALL_FIRM_TUW_IDS.filter((id) => !ids.includes(id));
  const unexpected = [...new Set(ids.filter((id) => !MATTER_SMALL_FIRM_TUW_IDS.includes(id)))].sort();
  const invalidStatuses = rows.filter((row) => !VALID_STATUSES.has(row.status));
  const incomplete = rows.filter((row) => row.status !== "COMPLETE").map((row) => row.id);
  const remediationIds = remediationRows.map((row) => row.id);
  const duplicateRemediations = [
    ...new Set(remediationIds.filter((id, index) => remediationIds.indexOf(id) !== index)),
  ].sort();
  const missingRemediations = MATTER_SMALL_FIRM_RF_IDS.filter(
    (id) => !remediationIds.includes(id),
  );
  const unexpectedRemediations = [
    ...new Set(remediationIds.filter((id) => !MATTER_SMALL_FIRM_RF_IDS.includes(id))),
  ].sort();
  const incompleteRemediations = remediationRows
    .filter((row) => row.status !== "COMPLETE")
    .map((row) => row.id);
  const remediationById = new Map(remediationRows.map((row) => [row.id, row]));
  const unknownRemediationDependencies = remediationRows.flatMap((row) => (
    row.dependencies
      .filter((dependency) => !MATTER_SMALL_FIRM_RF_IDS.includes(dependency))
      .map((dependency) => `${row.id}->${dependency}`)
  ));
  const incompleteRemediationDependencies = remediationRows.flatMap((row) => (
    row.status === "COMPLETE"
      ? row.dependencies
        .filter((dependency) => remediationById.get(dependency)?.status !== "COMPLETE")
        .map((dependency) => `${row.id}->${dependency}`)
      : []
  ));
  const missingExecutionEvidence = MATTER_SMALL_FIRM_TUW_IDS.filter(
    (id) => !executionEvidence.includes(id),
  );
  const missingRemediationEvidence = MATTER_SMALL_FIRM_RF_IDS.filter(
    (id) => !remediationEvidence.includes(id),
  );
  const duplicateRemediationEvidence = [
    ...new Set(
      remediationEvidence.filter((id, index) => remediationEvidence.indexOf(id) !== index),
    ),
  ].sort();
  const missingFinalGates = MATTER_SMALL_FIRM_GATE_IDS.filter(
    (id) => !finalGates.some((gate) => gate.id === id),
  );
  const failedFinalGates = finalGates
    .filter((gate) => gate.status !== "PASS")
    .map((gate) => gate.id);
  const errors = [];

  if (duplicates.length) errors.push(`duplicate TUW ids: ${duplicates.join(", ")}`);
  if (missing.length) errors.push(`missing TUW ids: ${missing.join(", ")}`);
  if (unexpected.length) errors.push(`unexpected TUW ids: ${unexpected.join(", ")}`);
  if (invalidStatuses.length) errors.push("invalid TUW statuses");
  if (duplicateRemediations.length) {
    errors.push(`duplicate RF ids: ${duplicateRemediations.join(", ")}`);
  }
  if (missingRemediations.length) errors.push(`missing RF ids: ${missingRemediations.join(", ")}`);
  if (unexpectedRemediations.length) {
    errors.push(`unexpected RF ids: ${unexpectedRemediations.join(", ")}`);
  }
  if (unknownRemediationDependencies.length) {
    errors.push(`unknown RF dependencies: ${unknownRemediationDependencies.join(", ")}`);
  }
  if (incompleteRemediationDependencies.length) {
    errors.push(`completed RF has incomplete dependencies: ${incompleteRemediationDependencies.join(", ")}`);
  }
  if (requireComplete && incomplete.length) errors.push(`incomplete TUWs: ${incomplete.join(", ")}`);
  if (requireComplete && incompleteRemediations.length) {
    errors.push(`incomplete RFs: ${incompleteRemediations.join(", ")}`);
  }
  if (requireComplete && missingExecutionEvidence.length) {
    errors.push(`missing TUW execution evidence: ${missingExecutionEvidence.join(", ")}`);
  }
  if (requireComplete && missingRemediationEvidence.length) {
    errors.push(`missing RF execution evidence: ${missingRemediationEvidence.join(", ")}`);
  }
  if (requireComplete && duplicateRemediationEvidence.length) {
    errors.push(`duplicate RF execution evidence: ${duplicateRemediationEvidence.join(", ")}`);
  }
  if (requireComplete && missingFinalGates.length) {
    errors.push(`missing final gates: ${missingFinalGates.join(", ")}`);
  }
  if (requireComplete && failedFinalGates.length) {
    errors.push(`failed final gates: ${failedFinalGates.join(", ")}`);
  }

  return Object.freeze({
    ok: errors.length === 0,
    total: rows.length,
    counts: Object.freeze(
      rows.reduce(
        (counts, row) => ({ ...counts, [row.status]: counts[row.status] + 1 }),
        { PENDING: 0, IN_PROGRESS: 0, BLOCKED: 0, COMPLETE: 0 },
      ),
    ),
    executionEvidenceTotal: executionEvidence.length,
    remediationTotal: remediationRows.length,
    remediationCounts: Object.freeze(
      remediationRows.reduce(
        (counts, row) => ({ ...counts, [row.status]: counts[row.status] + 1 }),
        { PENDING: 0, IN_PROGRESS: 0, BLOCKED: 0, COMPLETE: 0 },
      ),
    ),
    remediationEvidenceTotal: remediationEvidence.length,
    finalGates: Object.freeze(
      MATTER_SMALL_FIRM_GATE_IDS.reduce(
        (statuses, id) => ({
          ...statuses,
          [id]: finalGates.find((gate) => gate.id === id)?.status ?? "MISSING",
        }),
        {},
      ),
    ),
    errors: Object.freeze(errors),
  });
}

async function main() {
  const requireComplete = process.argv.includes("--require-complete");
  const path = process.argv.find((argument) => argument.endsWith(".md"))
    ?? "workbook/matter-small-firm-os-implementation-goal-2026-07-30.md";
  const result = validateMatterSmallFirmGoal(await readFile(path, "utf8"), { requireComplete });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (!result.ok) process.exitCode = 1;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
