#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const sourceLedgerPath = "docs/weighted-implementation-ledger.json";
const hrxLedgerPath = "docs/hrx-weighted-implementation-ledger.json";
const outputDir = "docs/closeout-pack-plan";
const planPath = path.join(outputDir, "closeout-pack-plan.json");
const queuePath = path.join(outputDir, "next-pack-queue.json");
const generationRuleVersion = "law-firm-os.closeout-pack-plan.generator.v1";
const renumberingPolicy =
  "Pack IDs are monotonic after the latest live closeout pack. If a requested locked queue skips live-open ledger units, live-open units are inserted first and requested packs are shifted with correction_reason.";

const riskRanges = {
  A: { min: 1, max: 10 },
  B: { min: 10, max: 40 },
  C: { min: 40, max: 150 },
};

const requestedLockedQueue = [
  {
    requested_pack_id: "CP00-051",
    risk_class: "A",
    requested_unit_count: 10,
    range_label: "RP00.P02.M09.S01-S10",
    segments: [["RP00.P02.M09.S01", "RP00.P02.M09.S10"]],
  },
  {
    requested_pack_id: "CP00-052",
    risk_class: "A",
    requested_unit_count: 4,
    range_label: "RP00.P02.M09.S11 + RP00.P02.M10.S01-S03",
    segments: [
      ["RP00.P02.M09.S11", "RP00.P02.M09.S11"],
      ["RP00.P02.M10.S01", "RP00.P02.M10.S03"],
    ],
  },
  {
    requested_pack_id: "CP00-053",
    risk_class: "B",
    requested_unit_count: 20,
    range_label: "RP00.P03.M00-M04",
    segments: [["RP00.P03.M00.S01", "RP00.P03.M04.S04"]],
  },
  {
    requested_pack_id: "CP00-054",
    risk_class: "A",
    requested_unit_count: 6,
    range_label: "RP00.P03.M05.S01-S06",
    segments: [["RP00.P03.M05.S01", "RP00.P03.M05.S06"]],
  },
  {
    requested_pack_id: "CP00-055",
    risk_class: "A",
    requested_unit_count: 5,
    range_label: "RP00.P03.M05.S07-S11",
    segments: [["RP00.P03.M05.S07", "RP00.P03.M05.S11"]],
  },
  {
    requested_pack_id: "CP00-056",
    risk_class: "B",
    requested_unit_count: 21,
    range_label: "RP00.P03.M06-M10",
    segments: [["RP00.P03.M06.S01", "RP00.P03.M10.S01"]],
  },
  {
    requested_pack_id: "CP00-057",
    risk_class: "C",
    requested_unit_count: 5,
    range_label: "RP00.P04.M00.S01-RP00.P04.M01.S04",
    segments: [["RP00.P04.M00.S01", "RP00.P04.M01.S04"]],
    override_reason: "small C boundary before B",
  },
  {
    requested_pack_id: "CP00-058",
    risk_class: "B",
    requested_unit_count: 26,
    range_label: "RP00.P04.M02.S01-RP00.P04.M04.S11",
    segments: [["RP00.P04.M02.S01", "RP00.P04.M04.S11"]],
  },
  {
    requested_pack_id: "CP00-059",
    risk_class: "A",
    requested_unit_count: 10,
    range_label: "RP00.P04.M05.S01-S10",
    segments: [["RP00.P04.M05.S01", "RP00.P04.M05.S10"]],
  },
  {
    requested_pack_id: "CP00-060",
    risk_class: "A",
    requested_unit_count: 1,
    range_label: "RP00.P04.M05.S11",
    segments: [["RP00.P04.M05.S11", "RP00.P04.M05.S11"]],
  },
  {
    requested_pack_id: "CP00-061",
    risk_class: "C",
    requested_unit_count: 8,
    range_label: "RP00.P04.M06.S01-S08",
    segments: [["RP00.P04.M06.S01", "RP00.P04.M06.S08"]],
    override_reason: "isolated fixture pack",
  },
  {
    requested_pack_id: "CP00-062",
    risk_class: "B",
    requested_unit_count: 11,
    range_label: "RP00.P04.M07.S01-S11",
    segments: [["RP00.P04.M07.S01", "RP00.P04.M07.S11"]],
  },
  {
    requested_pack_id: "CP00-063",
    risk_class: "C",
    requested_unit_count: 51,
    range_label: "RP00.P04.M08.S01-RP00.P05.M04.S11",
    segments: [["RP00.P04.M08.S01", "RP00.P05.M04.S11"]],
  },
  {
    requested_pack_id: "CP00-064",
    risk_class: "A",
    requested_unit_count: 10,
    range_label: "RP00.P05.M05.S01-S10",
    segments: [["RP00.P05.M05.S01", "RP00.P05.M05.S10"]],
  },
  {
    requested_pack_id: "CP00-065",
    risk_class: "A",
    requested_unit_count: 1,
    range_label: "RP00.P05.M05.S11",
    segments: [["RP00.P05.M05.S11", "RP00.P05.M05.S11"]],
  },
  {
    requested_pack_id: "CP00-066",
    risk_class: "C",
    requested_unit_count: 39,
    range_label: "RP00.P05.M06.S01-RP00.P05.M10.S04",
    segments: [["RP00.P05.M06.S01", "RP00.P05.M10.S04"]],
    override_reason: "39 is accepted as phase-terminal C pack",
  },
  {
    requested_pack_id: "CP00-067",
    risk_class: "A",
    requested_unit_count: 10,
    range_label: "RP00.P06.M00.S01-RP00.P06.M02.S04",
    segments: [["RP00.P06.M00.S01", "RP00.P06.M02.S04"]],
  },
  {
    requested_pack_id: "CP00-068",
    risk_class: "A",
    requested_unit_count: 10,
    range_label: "RP00.P06.M02.S05-RP00.P06.M03.S03",
    segments: [["RP00.P06.M02.S05", "RP00.P06.M03.S03"]],
  },
  {
    requested_pack_id: "CP00-069",
    risk_class: "A",
    requested_unit_count: 10,
    range_label: "RP00.P06.M03.S04-S13",
    segments: [["RP00.P06.M03.S04", "RP00.P06.M03.S13"]],
  },
  {
    requested_pack_id: "CP00-070",
    risk_class: "A",
    requested_unit_count: 10,
    range_label: "RP00.P06.M03.S14-RP00.P06.M04.S03",
    segments: [["RP00.P06.M03.S14", "RP00.P06.M04.S03"]],
  },
  {
    requested_pack_id: "CP00-071",
    risk_class: "A",
    requested_unit_count: 10,
    range_label: "RP00.P06.M04.S04-S13",
    segments: [["RP00.P06.M04.S04", "RP00.P06.M04.S13"]],
  },
  {
    requested_pack_id: "CP00-072",
    risk_class: "A",
    requested_unit_count: 10,
    range_label: "RP00.P06.M04.S14-RP00.P06.M05.S09",
    segments: [["RP00.P06.M04.S14", "RP00.P06.M05.S09"]],
  },
  {
    requested_pack_id: "CP00-073",
    risk_class: "A",
    requested_unit_count: 10,
    range_label: "RP00.P06.M05.S10-S19",
    segments: [["RP00.P06.M05.S10", "RP00.P06.M05.S19"]],
  },
  {
    requested_pack_id: "CP00-074",
    risk_class: "A",
    requested_unit_count: 10,
    range_label: "RP00.P06.M05.S20-RP00.P06.M06.S09",
    segments: [["RP00.P06.M05.S20", "RP00.P06.M06.S09"]],
  },
  {
    requested_pack_id: "CP00-075",
    risk_class: "A",
    requested_unit_count: 10,
    range_label: "RP00.P06.M06.S10-RP00.P06.M07.S08",
    segments: [["RP00.P06.M06.S10", "RP00.P06.M07.S08"]],
  },
  {
    requested_pack_id: "CP00-076",
    risk_class: "A",
    requested_unit_count: 10,
    range_label: "RP00.P06.M07.S09-S18",
    segments: [["RP00.P06.M07.S09", "RP00.P06.M07.S18"]],
  },
  {
    requested_pack_id: "CP00-077",
    risk_class: "A",
    requested_unit_count: 10,
    range_label: "RP00.P06.M07.S19-RP00.P06.M08.S08",
    segments: [["RP00.P06.M07.S19", "RP00.P06.M08.S08"]],
  },
  {
    requested_pack_id: "CP00-078",
    risk_class: "A",
    requested_unit_count: 10,
    range_label: "RP00.P06.M08.S09-RP00.P06.M09.S07",
    segments: [["RP00.P06.M08.S09", "RP00.P06.M09.S07"]],
  },
  {
    requested_pack_id: "CP00-079",
    risk_class: "A",
    requested_unit_count: 7,
    range_label: "RP00.P06.M09.S08-RP00.P06.M10.S03",
    segments: [["RP00.P06.M09.S08", "RP00.P06.M10.S03"]],
  },
  {
    requested_pack_id: "CP00-080",
    risk_class: "C",
    requested_unit_count: 6,
    range_label: "RP00.P07.M00.S01-RP00.P07.M01.S03",
    segments: [["RP00.P07.M00.S01", "RP00.P07.M01.S03"]],
    override_reason: "small C boundary before B",
  },
  {
    requested_pack_id: "CP00-081",
    risk_class: "B",
    requested_unit_count: 30,
    range_label: "RP00.P07.M02.S01-RP00.P07.M03.S19",
    segments: [["RP00.P07.M02.S01", "RP00.P07.M03.S19"]],
  },
  {
    requested_pack_id: "CP00-082",
    risk_class: "B",
    requested_unit_count: 15,
    range_label: "RP00.P07.M03.S20-RP00.P07.M04.S14",
    segments: [["RP00.P07.M03.S20", "RP00.P07.M04.S14"]],
  },
  {
    requested_pack_id: "CP00-083",
    risk_class: "A",
    requested_unit_count: 10,
    range_label: "RP00.P07.M05.S01-S10",
    segments: [["RP00.P07.M05.S01", "RP00.P07.M05.S10"]],
  },
  {
    requested_pack_id: "CP00-084",
    risk_class: "A",
    requested_unit_count: 10,
    range_label: "RP00.P07.M05.S11-S20",
    segments: [["RP00.P07.M05.S11", "RP00.P07.M05.S20"]],
  },
  {
    requested_pack_id: "CP00-085",
    risk_class: "C",
    requested_unit_count: 11,
    range_label: "RP00.P07.M06.S01-S11",
    segments: [["RP00.P07.M06.S01", "RP00.P07.M06.S11"]],
    override_reason: "isolated synthetic fixture pack",
  },
  {
    requested_pack_id: "CP00-086",
    risk_class: "B",
    requested_unit_count: 20,
    range_label: "RP00.P07.M07.S01-S20",
    segments: [["RP00.P07.M07.S01", "RP00.P07.M07.S20"]],
  },
  {
    requested_pack_id: "CP00-087",
    risk_class: "C",
    requested_unit_count: 56,
    range_label: "RP00.P07.M08.S01-RP00.P08.M04.S11",
    segments: [["RP00.P07.M08.S01", "RP00.P08.M04.S11"]],
  },
  {
    requested_pack_id: "CP00-088",
    risk_class: "A",
    requested_unit_count: 10,
    range_label: "RP00.P08.M05.S01-S10",
    segments: [["RP00.P08.M05.S01", "RP00.P08.M05.S10"]],
  },
  {
    requested_pack_id: "CP00-089",
    risk_class: "A",
    requested_unit_count: 1,
    range_label: "RP00.P08.M05.S11",
    segments: [["RP00.P08.M05.S11", "RP00.P08.M05.S11"]],
  },
  {
    requested_pack_id: "CP00-090",
    risk_class: "C",
    requested_unit_count: 61,
    range_label: "RP00.P08.M06.S01-RP00.P09.M04.S05",
    segments: [["RP00.P08.M06.S01", "RP00.P09.M04.S05"]],
  },
  {
    requested_pack_id: "CP00-091",
    risk_class: "A",
    requested_unit_count: 10,
    range_label: "RP00.P09.M05.S01-S10",
    segments: [["RP00.P09.M05.S01", "RP00.P09.M05.S10"]],
  },
  {
    requested_pack_id: "CP00-092",
    risk_class: "A",
    requested_unit_count: 1,
    range_label: "RP00.P09.M05.S11",
    segments: [["RP00.P09.M05.S11", "RP00.P09.M05.S11"]],
  },
  {
    requested_pack_id: "CP00-093",
    risk_class: "C",
    requested_unit_count: 24,
    range_label: "RP00.P09.M06.S01-RP00.P09.M10.S01",
    segments: [["RP00.P09.M06.S01", "RP00.P09.M10.S01"]],
    override_reason: "RP00 terminal closeout C pack",
  },
];

function packId(number) {
  return `CP00-${String(number).padStart(3, "0")}`;
}

function packNumber(id) {
  const match = /^CP00-(\d{3,})$/.exec(id);
  if (!match) throw new Error(`Invalid pack id ${id}`);
  return Number(match[1]);
}

function sha256(text) {
  return createHash("sha256").update(text).digest("hex");
}

function summarizeUnits(units) {
  return units.map((unit) => ({
    id: unit.id,
    title: unit.title,
    source_micro_phase_id: unit.source_micro_phase_id,
    program_id: unit.program_id,
    phase_id: unit.phase_id,
    micro_id: unit.micro_id,
    micro_title: unit.micro_title,
    deliverable_type: unit.deliverable_type,
    hrx_embedded: unit.hrx_embedded === true ? true : undefined,
  }));
}

function rangeSummary(units) {
  if (units.length === 0) return "";
  if (units.length === 1) return units[0].id;
  return `${units[0].id}-${units.at(-1).id}`;
}

function flattenLedger(ledger) {
  const units = [];
  for (const entry of ledger.entries ?? []) {
    for (const subphase of entry.implementation_subphases ?? []) {
      units.push({
        id: subphase.id,
        title: subphase.title,
        deliverable_type: subphase.deliverable_type,
        source_micro_phase_id: subphase.source_micro_phase_id,
        program_id: entry.program_id,
        program_title: entry.program_title,
        phase_id: entry.phase_id,
        phase_title: entry.phase_title,
        micro_id: entry.micro_id,
        micro_title: entry.micro_title,
        order: subphase.order,
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
        title: subphase.title,
        deliverable_type: subphase.deliverable_type,
        source_micro_phase_id: subphase.source_micro_phase_id,
        program_id: entry.program_id,
        program_title: entry.program_title,
        phase_id: entry.phase_id,
        phase_title: entry.phase_title,
        micro_id: entry.micro_id,
        micro_title: entry.micro_title,
        order: subphase.order,
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

function classifyUnitRisk(unit) {
  const text = [
    unit.id,
    unit.title,
    unit.deliverable_type,
    unit.source_micro_phase_id,
    unit.micro_title,
  ]
    .join(" ")
    .toLowerCase();
  const riskAKeywords = [
    "permission",
    "audit",
    "tenant",
    "security",
    "approval",
    "unauthorized",
    "idempotency",
    "lock",
    "persistence boundary",
    "access",
    "authz",
    "cross-tenant",
    "hr sensitive",
    "payroll",
    "compensation",
    "candidate",
    "employee",
    "hrx",
  ];
  if (riskAKeywords.some((keyword) => text.includes(keyword))) return "A";
  const riskCKeywords = [
    "fixture",
    "synthetic",
    "export",
    "readme",
    "docs",
    "documentation",
    "validator",
    "hermes evidence packet",
    "claude review packet",
    "closeout",
    "handoff",
    "scope inventory",
    "inventory",
    "planning",
  ];
  if (riskCKeywords.some((keyword) => text.includes(keyword))) return "C";
  return "B";
}

function rangeOverrideReason(riskClass, unitCount, reason) {
  const range = riskRanges[riskClass];
  if (!range) return reason;
  if (unitCount >= range.min && unitCount <= range.max) return reason;
  return reason ?? `Generated ${riskClass} pack has ${unitCount} units outside ${range.min}-${range.max} because ledger-order cohesion is smaller than the default risk range.`;
}

function expandSegments(segments, unitIndex, units) {
  const expanded = [];
  for (const [startId, endId] of segments) {
    const start = unitIndex.get(startId);
    const end = unitIndex.get(endId);
    if (start === undefined || end === undefined) {
      throw new Error(`Unknown locked segment ${startId}-${endId}`);
    }
    if (end < start) throw new Error(`Locked segment ${startId}-${endId} is reversed`);
    expanded.push(...units.slice(start, end + 1));
  }
  return expanded;
}

async function discoverLatestLivePack() {
  const closeoutRoot = "docs/closeout-packs";
  const entries = await readdir(closeoutRoot, { withFileTypes: true });
  const manifests = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const manifestPath = path.join(closeoutRoot, entry.name, "manifest.json");
    try {
      const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
      if (/^CP00-\d{3,}$/.test(manifest.pack_id)) {
        manifests.push({ path: manifestPath, manifest });
      }
    } catch {
      // Ignore incomplete work-in-progress directories.
    }
  }
  manifests.sort((a, b) => packNumber(a.manifest.pack_id) - packNumber(b.manifest.pack_id));
  const latest = manifests.at(-1);
  if (!latest) throw new Error("No live closeout pack manifest found");
  return {
    pack_id: latest.manifest.pack_id,
    pack_number: packNumber(latest.manifest.pack_id),
    manifest_path: latest.path,
    primary_subphase_id: latest.manifest.primary_subphase_id,
    next_subphase:
      latest.manifest.included_units?.at?.(-1)?.next_subphase ??
      latest.manifest.closeout_state_policy?.next_subphase ??
      latest.manifest.next_subphase,
  };
}

function createPack({
  pack_id,
  risk_class,
  units,
  source,
  requestedDefinition,
  generated,
  correction_reason,
  override_reason,
  sourceLedgerSha,
  hrxSourceLedgerSha,
}) {
  const unitCount = units.length;
  const range = riskRanges[risk_class];
  return {
    pack_id,
    planned_pack_id: pack_id,
    requested_pack_id: requestedDefinition?.requested_pack_id,
    title: `${pack_id} ${rangeSummary(units)} ${source}`,
    risk_class,
    planned_risk_class: risk_class,
    planned_unit_count: unitCount,
    unit_count: unitCount,
    range: {
      first_unit_id: units[0]?.id,
      last_unit_id: units.at(-1)?.id,
      description: requestedDefinition?.range_label ?? rangeSummary(units),
    },
    source,
    generated,
    generation_rule_version: generated ? generationRuleVersion : undefined,
    source_ledger_sha: generated ? sourceLedgerSha : undefined,
    hrx_source_ledger_sha: generated && units.some((unit) => unit.hrx_embedded === true) ? hrxSourceLedgerSha : undefined,
    renumbering_policy: generated ? renumberingPolicy : undefined,
    requested_unit_count: requestedDefinition?.requested_unit_count,
    correction_reason,
    override_reason: rangeOverrideReason(risk_class, unitCount, override_reason),
    within_default_risk_range: range ? unitCount >= range.min && unitCount <= range.max : false,
    plan_ref: planPath,
    deviation_from_plan: false,
    included_units: summarizeUnits(units),
  };
}

function buildGeneratedPacks({ units, startIndex, nextPackNumber, sourceLedgerSha, hrxSourceLedgerSha }) {
  const packs = [];
  let cursor = startIndex;
  let number = nextPackNumber;
  while (cursor < units.length) {
    const riskClass = classifyUnitRisk(units[cursor]);
    const range = riskRanges[riskClass];
    const start = cursor;
    const targetSize = range.max;
    cursor = Math.min(cursor + targetSize, units.length);
    while (cursor > start + 1 && units[cursor - 1].program_id !== units[start].program_id) {
      cursor -= 1;
    }
    if (cursor === start) cursor = Math.min(start + targetSize, units.length);
    const packUnits = units.slice(start, cursor);
    packs.push(
      createPack({
        pack_id: packId(number),
        risk_class: riskClass,
        units: packUnits,
        source: "generated_from_weighted_implementation_ledger",
        generated: true,
        sourceLedgerSha,
        hrxSourceLedgerSha,
      }),
    );
    number += 1;
  }
  return packs;
}

async function main() {
  const sourceLedgerText = await readFile(sourceLedgerPath, "utf8");
  const sourceLedgerSha = sha256(sourceLedgerText);
  const ledger = JSON.parse(sourceLedgerText);
  const lawFirmUnits = flattenLedger(ledger);
  const hrx = await readOptionalHrxLedger();
  const units = hrx ? [...lawFirmUnits, ...hrx.units] : lawFirmUnits;
  const unitIndex = new Map(units.map((unit, index) => [unit.id, index]));
  const live = await discoverLatestLivePack();
  const requestedFirstUnitId = requestedLockedQueue[0].segments[0][0];
  const livePrimaryIndex = unitIndex.get(live.primary_subphase_id);
  const latestNextUnitId = live.next_subphase ?? units[livePrimaryIndex + 1]?.id;
  const requestedFirstIndex = unitIndex.get(requestedFirstUnitId);
  if (requestedFirstIndex === undefined) throw new Error(`Requested first unit ${requestedFirstUnitId} is not in ${sourceLedgerPath}`);
  const closeoutComplete = latestNextUnitId === undefined && livePrimaryIndex === units.length - 1;
  if (closeoutComplete) {
    const generatedAt = new Date().toISOString();
    const plan = {
      schema_version: "law-firm-os.closeout-pack-plan.v1",
      generated_at: generatedAt,
      generated_by: "scripts/generate-closeout-pack-plan.mjs",
      generation_rule_version: generationRuleVersion,
      source_ledger_path: sourceLedgerPath,
      source_ledger_sha: sourceLedgerSha,
      source_ledger_unit_count: units.length,
      expanded_product_scope: {
        law_firm_os_units: 54355,
        hrx_embedded_people_units: 901,
        expanded_total_units: 55256,
        hrx_boundary: "embedded_people_hr_evidence_module_inside_law_firm_os",
        hrx_units_in_plan_source: hrx ? true : false,
        hrx_source_ledger_path: hrx ? hrxLedgerPath : undefined,
        hrx_source_ledger_sha: hrx?.sha,
        hrx_source_ledger_units: hrx?.units.length,
        current_pack_plan_source_note:
          "All source ledger units are closed by live closeout state. HRX remains embedded scope inside Law Firm OS.",
      },
      risk_ranges: riskRanges,
      risk_classification_rules_ref: "docs/closeout-pack-plan/risk-classification-rules.md",
      live_state: live,
      requested_queue_policy: {
        requested_first_pack_id: "CP00-051",
        requested_first_unit_id: requestedFirstUnitId,
        requested_rp01_start_pack_id: "CP00-094",
        correction_policy: "live_repo_state_overrides_requested_queue_when_the_two_conflict",
        correction_events: [
          {
            type: "all_source_units_closed_by_live_state",
            live_latest_pack_id: live.pack_id,
            live_latest_unit_id: live.primary_subphase_id,
            correction_reason: "Live closeout state covers the final source ledger unit; no additional closeout packs remain.",
          },
        ],
        actual_first_planned_pack_id: null,
        actual_first_planned_unit_id: null,
        actual_generated_pack_start_pack_id: null,
        actual_generated_first_unit_id: null,
        actual_rp01_start_pack_id: null,
      },
      pack_count_estimate_policy: {
        estimated_total_packs_approx: 1000,
        estimated_range_min: 760,
        estimated_range_max: 1295,
        not_equal_distribution: true,
        not_1000_units_per_pack: true,
        risk_based_execution_estimate: true,
      },
      summary: {
        closeout_complete: true,
        planned_pack_count: 0,
        planned_unit_count: 0,
        first_planned_pack_id: null,
        first_planned_unit_id: null,
        last_planned_pack_id: null,
        last_planned_unit_id: null,
        generated_pack_start_pack_id: null,
        risk_pack_distribution: {},
        planned_unit_distribution_by_program: {},
      },
      packs: [],
    };
    const queue = {
      schema_version: "law-firm-os.next-pack-queue.v1",
      generated_at: generatedAt,
      generated_by: plan.generated_by,
      plan_ref: planPath,
      source_ledger_path: sourceLedgerPath,
      source_ledger_sha: sourceLedgerSha,
      live_latest_pack_id: live.pack_id,
      live_next_unit_id: null,
      queue_policy: {
        starts_after_live_latest_pack: true,
        live_state_overrides_requested_queue: true,
        closeout_complete: true,
        generated_queue_preview_after_locked_queue_exhausted: false,
      },
      packs: [],
    };
    await mkdir(outputDir, { recursive: true });
    await writeFile(planPath, `${JSON.stringify(plan, null, 2)}\n`);
    await writeFile(queuePath, `${JSON.stringify(queue, null, 2)}\n`);
    console.log(`Generated ${planPath} with 0 packs and 0 units.`);
    console.log(`Generated ${queuePath} with 0 next-queue packs; closeout complete.`);
    return;
  }
  const latestNextIndex = unitIndex.get(latestNextUnitId);
  if (latestNextIndex === undefined) throw new Error(`Live next unit ${latestNextUnitId} is not in ${sourceLedgerPath}`);

  const packs = [];
  let nextPackNumber = live.pack_number + 1;
  const correctionEvents = [];
  if (latestNextIndex < requestedFirstIndex) {
    const correctionUnits = units.slice(latestNextIndex, requestedFirstIndex);
    const riskClass = correctionUnits.some((unit) => classifyUnitRisk(unit) === "A") ? "A" : classifyUnitRisk(correctionUnits[0]);
    const correctionReason = `Live CP00-050 manifest points to ${latestNextUnitId}, while requested CP00-051 starts at ${requestedFirstUnitId}; inserted live-open units first and shifted the requested locked queue.`;
    correctionEvents.push({
      type: "live_open_units_inserted_before_requested_queue",
      inserted_pack_id: packId(nextPackNumber),
      inserted_unit_count: correctionUnits.length,
      inserted_range: rangeSummary(correctionUnits),
      correction_reason: correctionReason,
    });
    packs.push(
      createPack({
        pack_id: packId(nextPackNumber),
        risk_class: riskClass,
        units: correctionUnits,
        source: "live_correction_before_requested_locked_queue",
        generated: false,
        correction_reason: correctionReason,
        sourceLedgerSha,
      }),
    );
    nextPackNumber += 1;
  } else if (latestNextIndex > requestedFirstIndex) {
    correctionEvents.push({
      type: "requested_queue_starts_before_live_next_unit",
      skipped_requested_first_unit_id: requestedFirstUnitId,
      live_next_unit_id: latestNextUnitId,
      correction_reason: "Live closeout state is ahead of the requested queue; generation starts from the live next unit.",
    });
  }

  for (const definition of requestedLockedQueue) {
    const expanded = expandSegments(definition.segments, unitIndex, units);
    const liveOpenExpanded = expanded.filter((unit) => unitIndex.get(unit.id) >= latestNextIndex);
    if (liveOpenExpanded.length === 0) {
      correctionEvents.push({
        type: "requested_locked_pack_already_closed_by_live_state",
        requested_pack_id: definition.requested_pack_id,
        skipped_range: rangeSummary(expanded),
        live_next_unit_id: latestNextUnitId,
        correction_reason: `Requested ${definition.requested_pack_id} is already closed by live state; generation skips ${rangeSummary(expanded)} and continues from ${latestNextUnitId}.`,
      });
      continue;
    }
    const actualUnitCount = liveOpenExpanded.length;
    const correctionParts = [];
    if (definition.requested_pack_id !== packId(nextPackNumber)) {
      correctionParts.push(`requested ${definition.requested_pack_id} shifted to ${packId(nextPackNumber)} by live sequential cursor`);
    }
    if (liveOpenExpanded.length !== expanded.length) {
      correctionParts.push(`skipped ${expanded.length - liveOpenExpanded.length} already-closed live unit(s) before ${latestNextUnitId}`);
    }
    if (actualUnitCount !== definition.requested_unit_count) {
      correctionParts.push(`requested unit count ${definition.requested_unit_count} corrected to ledger count ${actualUnitCount}`);
    }
    packs.push(
      createPack({
        pack_id: packId(nextPackNumber),
        risk_class: definition.risk_class,
        units: liveOpenExpanded,
        source: "requested_locked_queue",
        requestedDefinition: definition,
        generated: false,
        correction_reason: correctionParts.length > 0 ? correctionParts.join("; ") : undefined,
        override_reason: definition.override_reason,
        sourceLedgerSha,
      }),
    );
    nextPackNumber += 1;
  }

  let generatedStartIndex;
  if (packs.length > 0) {
    const lastLockedUnitId = packs.at(-1).included_units.at(-1).id;
    generatedStartIndex = unitIndex.get(lastLockedUnitId) + 1;
  } else {
    generatedStartIndex = latestNextIndex;
    correctionEvents.push({
      type: "requested_locked_queue_exhausted_by_live_state",
      live_next_unit_id: latestNextUnitId,
      generated_start_pack_id: packId(nextPackNumber),
      correction_reason:
        "All requested locked queue units are already closed by live state; generation starts from the live next unit.",
    });
  }
  const generatedStartPackId = packId(nextPackNumber);
  const generatedPacks = buildGeneratedPacks({
    units,
    startIndex: generatedStartIndex,
    nextPackNumber,
    sourceLedgerSha,
    hrxSourceLedgerSha: hrx?.sha,
  });
  packs.push(...generatedPacks);

  const programDistribution = {};
  const riskDistribution = {};
  for (const pack of packs) {
    riskDistribution[pack.risk_class] = (riskDistribution[pack.risk_class] ?? 0) + 1;
    for (const unit of pack.included_units) {
      programDistribution[unit.program_id] = (programDistribution[unit.program_id] ?? 0) + 1;
    }
  }

  const plan = {
    schema_version: "law-firm-os.closeout-pack-plan.v1",
    generated_at: new Date().toISOString(),
    generated_by: "scripts/generate-closeout-pack-plan.mjs",
    generation_rule_version: generationRuleVersion,
    source_ledger_path: sourceLedgerPath,
    source_ledger_sha: sourceLedgerSha,
    source_ledger_unit_count: units.length,
    expanded_product_scope: {
      law_firm_os_units: 54355,
      hrx_embedded_people_units: 901,
      expanded_total_units: 55256,
      hrx_boundary: "embedded_people_hr_evidence_module_inside_law_firm_os",
      hrx_units_in_plan_source: hrx ? true : false,
      hrx_source_ledger_path: hrx ? hrxLedgerPath : undefined,
      hrx_source_ledger_sha: hrx?.sha,
      hrx_source_ledger_units: hrx?.units.length,
      current_pack_plan_source_note:
        hrx
          ? "This plan is generated from the Law Firm OS weighted ledger plus appended HRX RP30 source ledger units. HRX remains embedded scope and is appended after RP29."
          : "This plan is generated from docs/weighted-implementation-ledger.json. HRX 901 units remain embedded scope and must be added when the weighted ledger source is extended with HRX implementation units.",
    },
    risk_ranges: riskRanges,
    risk_classification_rules_ref: "docs/closeout-pack-plan/risk-classification-rules.md",
    live_state: live,
    requested_queue_policy: {
      requested_first_pack_id: "CP00-051",
      requested_first_unit_id: requestedFirstUnitId,
      requested_rp01_start_pack_id: "CP00-094",
      correction_policy: "live_repo_state_overrides_requested_queue_when_the_two_conflict",
      correction_events: correctionEvents,
      actual_first_planned_pack_id: packs[0].pack_id,
      actual_first_planned_unit_id: packs[0].included_units[0].id,
      actual_generated_pack_start_pack_id: generatedStartPackId,
      actual_generated_first_unit_id: generatedPacks[0]?.included_units[0]?.id,
      actual_rp01_start_pack_id: packs.find((pack) => pack.included_units[0]?.program_id === "RP01")?.pack_id,
    },
    pack_count_estimate_policy: {
      estimated_total_packs_approx: 1000,
      estimated_range_min: 760,
      estimated_range_max: 1295,
      not_equal_distribution: true,
      not_1000_units_per_pack: true,
      risk_based_execution_estimate: true,
    },
    summary: {
      planned_pack_count: packs.length,
      planned_unit_count: packs.reduce((sum, pack) => sum + pack.unit_count, 0),
      first_planned_pack_id: packs[0]?.pack_id,
      first_planned_unit_id: packs[0]?.included_units[0]?.id,
      last_planned_pack_id: packs.at(-1)?.pack_id,
      last_planned_unit_id: packs.at(-1)?.included_units.at(-1)?.id,
      generated_pack_start_pack_id: generatedStartPackId,
      risk_pack_distribution: riskDistribution,
      planned_unit_distribution_by_program: programDistribution,
    },
    packs,
  };

  const lockedQueuePacks = packs.filter((pack) => pack.source !== "generated_from_weighted_implementation_ledger");
  const generatedQueuePreviewAfterLockedQueueExhausted = lockedQueuePacks.length === 0 && generatedPacks.length > 0;
  const queuePacks = generatedQueuePreviewAfterLockedQueueExhausted ? [generatedPacks[0]] : lockedQueuePacks;
  const queue = {
    schema_version: "law-firm-os.next-pack-queue.v1",
    generated_at: plan.generated_at,
    generated_by: plan.generated_by,
    plan_ref: planPath,
    source_ledger_path: sourceLedgerPath,
    source_ledger_sha: sourceLedgerSha,
    live_latest_pack_id: live.pack_id,
    live_next_unit_id: latestNextUnitId,
    queue_policy: {
      starts_after_live_latest_pack: true,
      live_state_overrides_requested_queue: true,
      cp00_057_to_cp00_093_requested_locked_queue_preserved_as_shifted_requested_pack_refs:
        correctionEvents.length > 0,
      generated_queue_preview_after_locked_queue_exhausted: generatedQueuePreviewAfterLockedQueueExhausted,
      generated_queue_preview_pack_id: generatedQueuePreviewAfterLockedQueueExhausted ? generatedPacks[0].pack_id : undefined,
    },
    packs: queuePacks.map((pack) => ({
      pack_id: pack.pack_id,
      requested_pack_id: pack.requested_pack_id,
      risk_class: pack.risk_class,
      unit_count: pack.unit_count,
      first_unit_id: pack.range.first_unit_id,
      last_unit_id: pack.range.last_unit_id,
      range_description: pack.range.description,
      source: pack.source,
      correction_reason: pack.correction_reason,
      override_reason: pack.override_reason,
      plan_ref: pack.plan_ref,
    })),
  };

  await mkdir(outputDir, { recursive: true });
  await writeFile(planPath, `${JSON.stringify(plan, null, 2)}\n`);
  await writeFile(queuePath, `${JSON.stringify(queue, null, 2)}\n`);
  console.log(`Generated ${planPath} with ${plan.summary.planned_pack_count} packs and ${plan.summary.planned_unit_count} units.`);
  console.log(
    `Generated ${queuePath} with ${queue.packs.length} ${
      generatedQueuePreviewAfterLockedQueueExhausted ? "generated preview" : "locked/corrected"
    } next-queue packs.`,
  );
}

await main();
