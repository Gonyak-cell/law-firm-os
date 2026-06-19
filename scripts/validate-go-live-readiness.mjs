#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const CONTRACT_PATH = "contracts/go-live-gate-contract.json";

function parseArgs(argv) {
  const args = { fixtures: null };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--fixtures") {
      args.fixtures = argv[i + 1];
      i += 1;
    } else if (argv[i] === "--help" || argv[i] === "-h") {
      args.help = true;
    }
  }
  return args;
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function normalizeStatus(value) {
  return String(value ?? "").trim().toLowerCase();
}

function evaluateGate(gateId, gateContract, gateInput) {
  const missingEvidence = [];
  const failedEvidence = [];
  const criteria = Array.isArray(gateContract.criteria) ? gateContract.criteria : [];
  const evidenceSlots = Array.isArray(gateContract.evidence) ? gateContract.evidence : [];

  if (!gateInput || typeof gateInput !== "object") {
    return {
      status: "fail",
      criteria_count: criteria.length,
      evidence_slot_count: evidenceSlots.length,
      missing_evidence: evidenceSlots.map((slot) => slot.id),
      failed_evidence: [],
      reason: "missing_gate_input"
    };
  }

  for (const slot of evidenceSlots) {
    const slotRecord = gateInput.evidence?.[slot.id];
    if (!slotRecord) {
      missingEvidence.push(slot.id);
      continue;
    }
    if (normalizeStatus(slotRecord.status) !== "satisfied" || !String(slotRecord.ref ?? "").trim()) {
      failedEvidence.push(slot.id);
    }
  }

  const criteriaStatus = normalizeStatus(gateInput.criteria_status);
  const status =
    criteria.length > 0 &&
    evidenceSlots.length > 0 &&
    criteriaStatus === "satisfied" &&
    missingEvidence.length === 0 &&
    failedEvidence.length === 0
      ? "pass"
      : "fail";

  return {
    status,
    criteria_count: criteria.length,
    evidence_slot_count: evidenceSlots.length,
    missing_evidence: missingEvidence,
    failed_evidence: failedEvidence,
    reason: status === "pass" ? "all_required_evidence_satisfied" : "criteria_or_evidence_not_satisfied"
  };
}

function validateContractShape(contract) {
  const errors = [];
  const gateOrder = Array.isArray(contract.gate_order) ? contract.gate_order : [];

  if (contract.schema_version !== "law-firm-os.go-live-gate-contract.v0.1") {
    errors.push("schema_version mismatch");
  }
  if (gateOrder.length !== Object.keys(contract.gates ?? {}).length) {
    errors.push("gate_order and gates size mismatch");
  }
  if (!contract.no_go_policy) {
    errors.push("missing no_go_policy");
  }
  for (const gateId of gateOrder) {
    const gate = contract.gates?.[gateId];
    if (!gate) {
      errors.push(`${gateId}: missing gate contract`);
      continue;
    }
    if (!Array.isArray(gate.criteria) || gate.criteria.length === 0) {
      errors.push(`${gateId}: criteria empty`);
    }
    if (!Array.isArray(gate.evidence) || gate.evidence.length === 0) {
      errors.push(`${gateId}: evidence empty`);
    }
    for (const slot of gate.evidence ?? []) {
      if (!slot.id || !slot.slot || !slot.required_state) {
        errors.push(`${gateId}: evidence slot missing id, slot, or required_state`);
      }
    }
  }
  return errors;
}

const args = parseArgs(process.argv.slice(2));
if (args.help || !args.fixtures) {
  console.error("Usage: node scripts/validate-go-live-readiness.mjs --fixtures <fixture-dir>");
  process.exit(args.help ? 0 : 2);
}

const contract = await readJson(CONTRACT_PATH);
const contractErrors = validateContractShape(contract);
const inputPath = join(resolve(args.fixtures), "readiness-input.json");
const input = await readJson(inputPath);
const gateIds = contract.gate_order ?? [];
const gates = {};

for (const gateId of gateIds) {
  gates[gateId] = evaluateGate(gateId, contract.gates[gateId], input.gates?.[gateId]);
}

const failedGateIds = Object.entries(gates)
  .filter(([, result]) => result.status !== "pass")
  .map(([gateId]) => gateId);
const allPass = contractErrors.length === 0 && failedGateIds.length === 0;

const report = {
  schema_version: "law-firm-os.go-live-readiness-report.v0.1",
  contract_ref: CONTRACT_PATH,
  fixture_dir: args.fixtures,
  input_ref: inputPath,
  fixture_id: input.fixture_id ?? null,
  gate_count: gateIds.length,
  all_pass: allPass,
  failed_gate_ids: failedGateIds,
  contract_errors: contractErrors,
  no_go_policy: contract.no_go_policy,
  gates
};

console.log(JSON.stringify(report, null, 2));
process.exit(allPass ? 0 : 1);
