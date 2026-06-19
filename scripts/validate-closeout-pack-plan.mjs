#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const errors = [];
const sourceLedgerPath = "docs/weighted-implementation-ledger.json";
const hrxLedgerPath = "docs/hrx-weighted-implementation-ledger.json";
const planPath = "docs/closeout-pack-plan/closeout-pack-plan.json";
const queuePath = "docs/closeout-pack-plan/next-pack-queue.json";
const riskRanges = {
  A: { min: 1, max: 10 },
  B: { min: 10, max: 40 },
  C: { min: 40, max: 150 },
};

function sha256(text) {
  return createHash("sha256").update(text).digest("hex");
}

function packNumber(id) {
  const match = /^CP00-(\d{3,})$/.exec(id ?? "");
  if (!match) {
    errors.push(`Invalid pack id ${id}`);
    return Number.NaN;
  }
  return Number(match[1]);
}

function nextPackId(id) {
  const number = packNumber(id);
  return `CP00-${String(number + 1).padStart(3, "0")}`;
}

function flattenLedger(ledger) {
  const units = [];
  for (const entry of ledger.entries ?? []) {
    for (const subphase of entry.implementation_subphases ?? []) {
      units.push({
        id: subphase.id,
        program_id: entry.program_id,
        source_micro_phase_id: subphase.source_micro_phase_id,
      });
    }
  }
  return units;
}

function flattenHrxLedger(ledger) {
  const units = [];
  for (const entry of ledger.entries ?? []) {
    for (const subphase of entry.implementation_subphases ?? []) {
      units.push({
        id: subphase.id,
        program_id: entry.program_id,
        source_micro_phase_id: subphase.source_micro_phase_id,
        hrx_embedded: true,
      });
    }
  }
  return units;
}

async function readOptionalHrxLedger() {
  try {
    const text = await readFile(hrxLedgerPath, "utf8");
    const ledger = JSON.parse(text);
    return { text, sha: sha256(text), ledger, units: flattenHrxLedger(ledger) };
  } catch {
    return null;
  }
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function discoverLatestLivePackId() {
  const closeoutRoot = "docs/closeout-packs";
  const entries = await readdir(closeoutRoot, { withFileTypes: true });
  const packIds = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    try {
      const manifest = await readJson(path.join(closeoutRoot, entry.name, "manifest.json"));
      if (/^CP00-\d{3,}$/.test(manifest.pack_id)) packIds.push(manifest.pack_id);
    } catch {
      // Ignore incomplete work-in-progress pack directories.
    }
  }
  packIds.sort((a, b) => packNumber(a) - packNumber(b));
  return packIds.at(-1);
}

function validateRiskRange(pack) {
  if (!["A", "B", "C"].includes(pack.risk_class)) {
    errors.push(`${pack.pack_id} risk_class must be A, B, or C`);
    return;
  }
  const range = riskRanges[pack.risk_class];
  if (pack.unit_count < range.min || pack.unit_count > range.max) {
    if (!pack.override_reason) {
      errors.push(
        `${pack.pack_id} Risk ${pack.risk_class} has ${pack.unit_count} units outside ${range.min}-${range.max} and needs override_reason`,
      );
    }
  }
}

function validatePackShape(pack, seenUnits, ledgerUnitIds) {
  if (pack.planned_pack_id !== pack.pack_id) errors.push(`${pack.pack_id} planned_pack_id must equal pack_id`);
  if (pack.planned_risk_class !== pack.risk_class) errors.push(`${pack.pack_id} planned_risk_class must equal risk_class`);
  if (pack.planned_unit_count !== pack.unit_count) errors.push(`${pack.pack_id} planned_unit_count must equal unit_count`);
  if (pack.plan_ref !== planPath) errors.push(`${pack.pack_id} plan_ref must be ${planPath}`);
  if (pack.deviation_from_plan !== false) errors.push(`${pack.pack_id} deviation_from_plan must be false in plan`);
  if (!Array.isArray(pack.included_units) || pack.included_units.length === 0) {
    errors.push(`${pack.pack_id} included_units must be a non-empty array`);
    return;
  }
  if (pack.unit_count !== pack.included_units.length) {
    errors.push(`${pack.pack_id} unit_count ${pack.unit_count} does not match included_units length ${pack.included_units.length}`);
  }
  validateRiskRange(pack);
  for (const unit of pack.included_units) {
    if (!ledgerUnitIds.has(unit.id)) errors.push(`${pack.pack_id} includes unknown ledger unit ${unit.id}`);
    if (seenUnits.has(unit.id)) errors.push(`Duplicate planned unit ${unit.id}`);
    seenUnits.add(unit.id);
  }
}

function validateGeneratedFields(plan, pack) {
  const generatedStart = packNumber(plan.summary.generated_pack_start_pack_id);
  const current = packNumber(pack.pack_id);
  if (current < generatedStart) return;
  if (pack.generated !== true) errors.push(`${pack.pack_id} must be generated=true after generated start`);
  if (pack.generation_rule_version !== plan.generation_rule_version) {
    errors.push(`${pack.pack_id} generation_rule_version must match plan`);
  }
  if (pack.source_ledger_sha !== plan.source_ledger_sha) errors.push(`${pack.pack_id} source_ledger_sha must match plan`);
  if (pack.included_units.some((unit) => unit.id?.startsWith("RP30."))) {
    if (pack.hrx_source_ledger_sha !== plan.expanded_product_scope?.hrx_source_ledger_sha) {
      errors.push(`${pack.pack_id} hrx_source_ledger_sha must match plan`);
    }
  }
  if (!pack.renumbering_policy) errors.push(`${pack.pack_id} renumbering_policy is required for generated packs`);
}

async function main() {
  const [ledgerText, plan, queue] = await Promise.all([
    readFile(sourceLedgerPath, "utf8"),
    readJson(planPath),
    readJson(queuePath),
  ]);
  const ledgerSha = sha256(ledgerText);
  const ledger = JSON.parse(ledgerText);
  const lawFirmUnits = flattenLedger(ledger);
  const hrx = await readOptionalHrxLedger();
  const ledgerUnits = hrx ? [...lawFirmUnits, ...hrx.units] : lawFirmUnits;
  const ledgerUnitIds = new Set(ledgerUnits.map((unit) => unit.id));
  const ledgerIndex = new Map(ledgerUnits.map((unit, index) => [unit.id, index]));
  const latestLivePackId = await discoverLatestLivePackId();

  if (plan.schema_version !== "law-firm-os.closeout-pack-plan.v1") errors.push("plan schema_version mismatch");
  if (queue.schema_version !== "law-firm-os.next-pack-queue.v1") errors.push("queue schema_version mismatch");
  if (plan.source_ledger_path !== sourceLedgerPath) errors.push("plan source_ledger_path mismatch");
  if (queue.source_ledger_path !== sourceLedgerPath) errors.push("queue source_ledger_path mismatch");
  if (plan.source_ledger_sha !== ledgerSha) errors.push("plan source_ledger_sha does not match live source ledger");
  if (queue.source_ledger_sha !== ledgerSha) errors.push("queue source_ledger_sha does not match live source ledger");
  if (plan.source_ledger_unit_count !== ledgerUnits.length) errors.push("plan source_ledger_unit_count mismatch");
  if (plan.expanded_product_scope?.expanded_total_units !== 55256) errors.push("expanded total must be 55256");
  if (plan.expanded_product_scope?.hrx_boundary !== "embedded_people_hr_evidence_module_inside_law_firm_os") {
    errors.push("HRX boundary must remain embedded in Law Firm OS");
  }
  if (hrx) {
    if (hrx.ledger.hrx_implementation_subphase_count !== 901) errors.push("HRX ledger must contain exactly 901 subphases");
    if (hrx.units.length !== 901) errors.push(`flattened HRX units must be 901, got ${hrx.units.length}`);
    if (plan.expanded_product_scope?.hrx_units_in_plan_source !== true) errors.push("plan must mark HRX units in plan source");
    if (plan.expanded_product_scope?.hrx_source_ledger_path !== hrxLedgerPath) errors.push("plan HRX source ledger path mismatch");
    if (plan.expanded_product_scope?.hrx_source_ledger_sha !== hrx.sha) errors.push("plan HRX source ledger sha mismatch");
    if (plan.expanded_product_scope?.hrx_source_ledger_units !== 901) errors.push("plan HRX source ledger units must be 901");
  }
  const closeoutComplete = plan.summary?.closeout_complete === true && queue.queue_policy?.closeout_complete === true;
  if (!Array.isArray(plan.packs)) {
    errors.push("plan packs must be an array");
  } else if (plan.packs.length === 0 && !closeoutComplete) {
    errors.push("plan packs must be non-empty unless closeout_complete=true");
  }
  if (!Array.isArray(queue.packs)) {
    errors.push("next-pack-queue packs must be an array");
  } else if (queue.packs.length === 0 && !closeoutComplete) {
    errors.push("next-pack-queue packs must be non-empty unless closeout_complete=true");
  }

  if (queue.live_latest_pack_id !== latestLivePackId) {
    errors.push(`queue live_latest_pack_id must be ${latestLivePackId}, got ${queue.live_latest_pack_id}`);
  }
  if (closeoutComplete) {
    if (plan.packs.length !== 0) errors.push("closeout_complete plan must have zero packs");
    if (queue.packs.length !== 0) errors.push("closeout_complete queue must have zero packs");
    if (queue.live_next_unit_id !== null) errors.push("closeout_complete queue live_next_unit_id must be null");
    if (plan.summary?.planned_pack_count !== 0) errors.push("closeout_complete planned_pack_count must be 0");
    if (plan.summary?.planned_unit_count !== 0) errors.push("closeout_complete planned_unit_count must be 0");
    if (errors.length > 0) {
      console.error("Closeout pack plan validation failed:");
      for (const error of errors) console.error(`- ${error}`);
      process.exit(1);
    }
    console.log(`Closeout pack plan validation passed: closeout complete after ${latestLivePackId}.`);
    return;
  }
  const expectedFirstQueuePack = nextPackId(latestLivePackId);
  if (queue.packs?.[0]?.pack_id !== expectedFirstQueuePack) {
    errors.push(`next-pack-queue must start with ${expectedFirstQueuePack}, got ${queue.packs?.[0]?.pack_id}`);
  }
  if (plan.packs?.[0]?.pack_id !== expectedFirstQueuePack) {
    errors.push(`plan must start with ${expectedFirstQueuePack}, got ${plan.packs?.[0]?.pack_id}`);
  }

  const seenUnits = new Set();
  let seenHrxUnit = false;
  for (let index = 0; index < (plan.packs ?? []).length; index += 1) {
    const pack = plan.packs[index];
    validatePackShape(pack, seenUnits, ledgerUnitIds);
    validateGeneratedFields(plan, pack);
    if (index > 0) {
      const previous = plan.packs[index - 1];
      if (packNumber(pack.pack_id) !== packNumber(previous.pack_id) + 1) {
        errors.push(`${pack.pack_id} is not sequential after ${previous.pack_id}`);
      }
    }
    const packHasHrx = pack.included_units.some((unit) => unit.id?.startsWith("RP30."));
    const packHasNonHrx = pack.included_units.some((unit) => !unit.id?.startsWith("RP30."));
    if (seenHrxUnit && packHasNonHrx) errors.push(`${pack.pack_id} non-HRX unit appears after HRX tail started`);
    if (packHasHrx) seenHrxUnit = true;
  }

  const firstUnitId = plan.packs?.[0]?.included_units?.[0]?.id;
  const firstIndex = ledgerIndex.get(firstUnitId);
  if (firstIndex === undefined) {
    errors.push(`First planned unit ${firstUnitId} is missing from ledger`);
  } else {
    const plannedIdsInOrder = plan.packs.flatMap((pack) => pack.included_units.map((unit) => unit.id));
    const ledgerRemainingIds = ledgerUnits.slice(firstIndex).map((unit) => unit.id);
    if (plannedIdsInOrder.length !== ledgerRemainingIds.length) {
      errors.push(`Plan covers ${plannedIdsInOrder.length} units, expected ${ledgerRemainingIds.length} remaining ledger units`);
    }
    const checkLength = Math.min(plannedIdsInOrder.length, ledgerRemainingIds.length);
    for (let index = 0; index < checkLength; index += 1) {
      if (plannedIdsInOrder[index] !== ledgerRemainingIds[index]) {
        errors.push(`Plan order drift at remaining unit ${index}: expected ${ledgerRemainingIds[index]}, got ${plannedIdsInOrder[index]}`);
        break;
      }
    }
  }

  const queuePackIds = new Set(queue.packs.map((pack) => pack.pack_id));
  for (const queuePack of queue.packs) {
    const planPack = plan.packs.find((pack) => pack.pack_id === queuePack.pack_id);
    if (!planPack) {
      errors.push(`queue pack ${queuePack.pack_id} is missing from plan`);
      continue;
    }
    if (queuePack.risk_class !== planPack.risk_class) errors.push(`queue pack ${queuePack.pack_id} risk drift`);
    if (queuePack.unit_count !== planPack.unit_count) errors.push(`queue pack ${queuePack.pack_id} unit count drift`);
  }
  const generatedQueuePreviewAllowed = queue.queue_policy?.generated_queue_preview_after_locked_queue_exhausted === true;
  const generatedQueuePreviewPackId = queue.queue_policy?.generated_queue_preview_pack_id;
  for (const pack of plan.packs) {
    if (pack.source !== "generated_from_weighted_implementation_ledger") continue;
    if (
      queuePackIds.has(pack.pack_id) &&
      !(generatedQueuePreviewAllowed && pack.pack_id === generatedQueuePreviewPackId && pack.pack_id === plan.packs[0]?.pack_id)
    ) {
      errors.push(`${pack.pack_id} generated pack must not be in next locked queue`);
    }
  }

  if (errors.length > 0) {
    console.error("Closeout pack plan validation failed:");
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log(
    `Closeout pack plan validation passed: ${plan.packs.length} packs, ${seenUnits.size} units, queue starts after ${latestLivePackId}.`,
  );
}

await main();
