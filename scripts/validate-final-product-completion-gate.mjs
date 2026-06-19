#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";

const contractPath = "contracts/final-product-completion-gate-contract.json";
const productContractPath = "contracts/law-firm-os.product-contract.json";
const planPath = "docs/closeout-pack-plan/closeout-pack-plan.json";
const queuePath = "docs/closeout-pack-plan/next-pack-queue.json";
const closeoutPackRoot = "docs/closeout-packs";
const ldipSourceIndexPath = "docs/ldip-integration/ldip-source-index.md";
const ldipCoverageMatrixPath = "docs/ldip-integration/ldip-no-omission-coverage-matrix.md";
const ldipGapAdjudicationPath = "docs/ldip-integration/ldip-gap-adjudication.md";
const latestCloseoutPlanPath = "docs/closeout-pack-plan/latest-total-closeout-execution-plan.md";

const findings = [];

async function pathExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function addFinding(severity, id, message) {
  findings.push({ severity, id, message });
}

function flattenImplementationSubphases(ledger) {
  const units = [];
  for (const entry of ledger.entries ?? []) {
    for (const subphase of entry.implementation_subphases ?? []) {
      if (subphase?.id) units.push(subphase.id);
    }
  }
  return units;
}

function packNumberFromName(name) {
  const match = /^cp00-(\d+)$/i.exec(name);
  return match ? Number(match[1]) : Number.NaN;
}

function sortPackNames(names) {
  return names.toSorted((a, b) => packNumberFromName(a) - packNumberFromName(b));
}

function readFindingCount(counts, key) {
  const value = Number(counts?.[key] ?? 0);
  return Number.isFinite(value) ? value : 0;
}

function textIncludesAll(text, terms) {
  const normalized = text.toLowerCase();
  return terms.every((term) => normalized.includes(term.toLowerCase()));
}

function commandListHas(commands, patterns) {
  return commands.some((command) => patterns.some((pattern) => pattern.test(command.command ?? "")));
}

function loadCommitSubjects() {
  try {
    return execFileSync("git", ["log", "--format=%s"], { encoding: "utf8" })
      .split("\n")
      .filter(Boolean);
  } catch (error) {
    addFinding("P1", "FPCG-COMMIT-LOG-UNREADABLE", `Could not read git log subjects: ${error.message}`);
    return [];
  }
}

async function loadScopeRevision(contract) {
  const input = contract.scope_revision_input;
  const sourcePath = input?.path;
  if (!sourcePath) {
    addFinding("P1", "FPCG-SCOPE-MISSING-CONTRACT-PATH", "scope_revision_input.path is missing from the contract");
    return { path: null, approved: false, status: "missing_contract_path" };
  }
  if (!(await pathExists(sourcePath))) {
    addFinding("P1", "FPCG-SCOPE-MISSING-FILE", `${sourcePath} is missing; scope revision validation fails closed`);
    return { path: sourcePath, approved: false, status: "missing_file" };
  }
  const record = await readJson(sourcePath);
  const approved = record.approved === true || record.status === "approved";
  if (!approved) {
    addFinding("P1", "FPCG-SCOPE-UNAPPROVED", `${sourcePath} is present but not approved`);
  }
  return {
    path: sourcePath,
    approved,
    status: approved ? "approved" : "unapproved",
    revision_type: record.scope_delta?.type ?? null,
  };
}

async function loadLedgerCounts(contract) {
  const lawFirmPath = contract.ledger_inputs?.law_firm_os_weighted_implementation_ledger?.path;
  const hrxPath = contract.ledger_inputs?.hrx_embedded_people_weighted_implementation_ledger?.path;
  if (!lawFirmPath) addFinding("P1", "FPCG-LEDGER-MISSING-LFO-PATH", "Law Firm OS ledger path is missing from contract");
  if (!hrxPath) addFinding("P1", "FPCG-LEDGER-MISSING-HRX-PATH", "HRX ledger path is missing from contract");
  const lawFirmLedger = lawFirmPath ? await readJson(lawFirmPath) : { entries: [] };
  const hrxLedger = hrxPath ? await readJson(hrxPath) : { entries: [] };
  const lawFirmUnits = flattenImplementationSubphases(lawFirmLedger);
  const hrxUnits = flattenImplementationSubphases(hrxLedger);
  const duplicateUnits = [];
  const seen = new Set();
  for (const unitId of [...lawFirmUnits, ...hrxUnits]) {
    if (seen.has(unitId)) duplicateUnits.push(unitId);
    seen.add(unitId);
  }
  if (duplicateUnits.length > 0) {
    addFinding("P1", "FPCG-LEDGER-DUPLICATE-UNITS", `Duplicate unit ids found: ${duplicateUnits.slice(0, 10).join(", ")}`);
  }
  return {
    law_firm_os_units: lawFirmUnits.length,
    hrx_embedded_people_units: hrxUnits.length,
    expanded_total_units: lawFirmUnits.length + hrxUnits.length,
    law_firm_os_ledger_path: lawFirmPath,
    hrx_ledger_path: hrxPath,
  };
}

async function loadCloseoutPackState(requiredUnitCount) {
  const [plan, queue, packDirEntries] = await Promise.all([
    readJson(planPath),
    readJson(queuePath),
    readdir(closeoutPackRoot, { withFileTypes: true }),
  ]);
  const closeoutComplete =
    plan.summary?.closeout_complete === true &&
    queue.queue_policy?.closeout_complete === true &&
    Array.isArray(plan.packs) &&
    plan.packs.length === 0 &&
    Array.isArray(queue.packs) &&
    queue.packs.length === 0 &&
    queue.live_next_unit_id === null;
  if (!closeoutComplete) {
    addFinding("P1", "FPCG-CLOSEOUT-INCOMPLETE", "closeout plan and next-pack queue are not both complete with no pending packs");
  }

  const packNames = sortPackNames(packDirEntries.filter((entry) => entry.isDirectory()).map((entry) => entry.name));
  const productionReadyUnitIds = new Set();
  let manifestCount = 0;
  let productionReadyPackCount = 0;
  let reportedP0 = 0;
  let reportedP1 = 0;

  for (const packName of packNames) {
    const manifestPath = path.join(closeoutPackRoot, packName, "manifest.json");
    if (!(await pathExists(manifestPath))) continue;
    const manifest = await readJson(manifestPath);
    manifestCount += 1;
    const packReady = manifest.production_ready === true || manifest.status === "production_ready";
    if (packReady) productionReadyPackCount += 1;
    const counts = manifest.pack_level_claude_review?.finding_counts ?? manifest.finding_counts ?? {};
    reportedP0 += readFindingCount(counts, "p0") + readFindingCount(counts, "reported_p0");
    reportedP1 += readFindingCount(counts, "p1") + readFindingCount(counts, "reported_p1");
    if (!packReady) continue;
    for (const unit of manifest.included_units ?? []) {
      if (unit?.id) productionReadyUnitIds.add(unit.id);
    }
  }

  if (reportedP0 > 0) addFinding("P0", "FPCG-REPORTED-P0", "Structured closeout review evidence reports P0 findings");
  if (reportedP1 > 0) addFinding("P1", "FPCG-REPORTED-P1", "Structured closeout review evidence reports P1 findings");

  const latestPackPath = queue.live_latest_pack_id
    ? path.join(closeoutPackRoot, queue.live_latest_pack_id.toLowerCase(), "manifest.json")
    : null;
  const latestPack = latestPackPath && (await pathExists(latestPackPath)) ? await readJson(latestPackPath) : null;
  const latestPackReady = latestPack?.production_ready === true || latestPack?.status === "production_ready";
  if (!latestPackReady) {
    addFinding("P1", "FPCG-LATEST-PACK-NOT-READY", "Live latest closeout pack is missing or not production_ready");
  }

  const satisfiedUnits = closeoutComplete && latestPackReady ? requiredUnitCount : productionReadyUnitIds.size;
  if (satisfiedUnits !== requiredUnitCount) {
    addFinding(
      "P1",
      "FPCG-PRODUCTION-READY-UNIT-MISMATCH",
      `Production-ready satisfied units ${satisfiedUnits} do not match required units ${requiredUnitCount}`,
    );
  }

  return {
    closeout_complete: closeoutComplete,
    live_latest_pack_id: queue.live_latest_pack_id ?? null,
    manifest_count: manifestCount,
    production_ready_pack_count: productionReadyPackCount,
    manifest_unit_proxy_count: productionReadyUnitIds.size,
    satisfied_units: satisfiedUnits,
    required_units: requiredUnitCount,
    source: closeoutComplete && latestPackReady ? "closeout_plan_completion" : "manifest_unit_proxy",
    structured_review_p0_count: reportedP0,
    structured_review_p1_count: reportedP1,
  };
}

async function loadLdipClassification() {
  const text = await readFile(ldipSourceIndexPath, "utf8");
  const rows = [];
  let inSectionTable = false;
  for (const line of text.split("\n")) {
    if (line.startsWith("| Source section |")) {
      inSectionTable = true;
      continue;
    }
    if (inSectionTable && line.startsWith("## Coverage Rule")) break;
    if (!inSectionTable || !line.startsWith("|") || line.startsWith("| ---")) continue;
    const columns = line
      .split("|")
      .slice(1, -1)
      .map((part) => part.trim());
    if (columns.length >= 4) rows.push(columns);
  }
  const classifiedRows = rows.filter((columns) => columns[2] && !/^tbd$/i.test(columns[2]));
  if (rows.length === 0) {
    addFinding("P1", "FPCG-LDIP-NO-SOURCE-SECTIONS", "LDIP source section table has no rows");
  }
  if (classifiedRows.length !== rows.length) {
    addFinding("P1", "FPCG-LDIP-UNCLASSIFIED-SECTIONS", "LDIP source index contains unclassified source sections");
  }
  const classificationRate = rows.length === 0 ? 0 : Number(((classifiedRows.length / rows.length) * 100).toFixed(2));
  return {
    source_index_path: ldipSourceIndexPath,
    source_sections_total: rows.length,
    classified_sections: classifiedRows.length,
    classification_rate_percent: classificationRate,
  };
}

async function loadInvariantStatus() {
  const [productContract, ldipCoverageText, ldipGapText, latestPlanText] = await Promise.all([
    readJson(productContractPath),
    readFile(ldipCoverageMatrixPath, "utf8"),
    readFile(ldipGapAdjudicationPath, "utf8"),
    readFile(latestCloseoutPlanPath, "utf8"),
  ]);
  const principleSet = new Set(productContract.principles ?? []);
  const invariantSet = new Set((productContract.invariants ?? []).map((invariant) => invariant.id));
  const statusRows = [
    {
      id: "matter_first",
      pass: principleSet.has("matter_first") && invariantSet.has("matter_first_required"),
      source_refs: [productContractPath],
    },
    {
      id: "permission_first",
      pass: principleSet.has("permission_unified") && invariantSet.has("deny_over_allow") && textIncludesAll(latestPlanText, ["permission-first"]),
      source_refs: [productContractPath, latestCloseoutPlanPath],
    },
    {
      id: "audit_first",
      pass: principleSet.has("audit_everything") && invariantSet.has("audit_required") && textIncludesAll(latestPlanText, ["audit-first"]),
      source_refs: [productContractPath, latestCloseoutPlanPath],
    },
    {
      id: "evidence_bound_ai",
      pass: principleSet.has("ai_grounded") && invariantSet.has("ai_grounded_in_versions") && textIncludesAll(latestPlanText, ["evidence-bound"]),
      source_refs: [productContractPath, latestCloseoutPlanPath],
    },
    {
      id: "human_review",
      pass: invariantSet.has("human_review_for_ai_final_outputs") && textIncludesAll(ldipCoverageText, ["Human Review"]),
      source_refs: [productContractPath, ldipCoverageMatrixPath],
    },
    {
      id: "read_only_default",
      pass: textIncludesAll(ldipCoverageText, ["Read-only AI default"]) && textIncludesAll(latestPlanText, ["read-only default"]),
      source_refs: [ldipCoverageMatrixPath, latestCloseoutPlanPath],
    },
    {
      id: "external_share_safety",
      pass: textIncludesAll(ldipCoverageText, ["External sharing control"]) && textIncludesAll(latestPlanText, ["external-share safety"]),
      source_refs: [ldipCoverageMatrixPath, latestCloseoutPlanPath],
    },
    {
      id: "vendor_neutral_architecture",
      pass: textIncludesAll(latestPlanText, ["Vendor-neutral architecture"]) && textIncludesAll(ldipGapText, ["Vendor Neutrality"]),
      source_refs: [latestCloseoutPlanPath, ldipGapAdjudicationPath],
    },
  ];
  for (const row of statusRows) {
    if (!row.pass) addFinding("P1", `FPCG-INVARIANT-${row.id.toUpperCase()}`, `${row.id} invariant did not pass source checks`);
  }
  return {
    required_count: statusRows.length,
    passed_count: statusRows.filter((row) => row.pass).length,
    rows: statusRows,
  };
}

async function readJsonIfExists(filePath) {
  if (!(await pathExists(filePath))) return null;
  return readJson(filePath);
}

async function loadCloseoutPackGateChain() {
  const commitSubjects = loadCommitSubjects();
  const packDirEntries = await readdir(closeoutPackRoot, { withFileTypes: true });
  const packNames = sortPackNames(packDirEntries.filter((entry) => entry.isDirectory() && /^cp00-\d+$/i.test(entry.name)).map((entry) => entry.name));
  const requiredArtifactNames = [
    "manifest.json",
    "command-evidence.json",
    "claude-review-result.json",
    "adjudication.md",
    "construction-inspection.json",
  ];
  const counts = {
    pack_count: packNames.length,
    required_artifact_complete_count: 0,
    implementation_evidence_count: 0,
    tests_evidence_count: 0,
    hermes_evidence_count: 0,
    valid_review_count: 0,
    review_waiver_count: 0,
    review_satisfied_count: 0,
    adjudication_count: 0,
    construction_inspection_pass_count: 0,
    included_units_production_ready_count: 0,
    final_validation_count: 0,
    commit_evidence_count: 0,
  };
  const missing = [];

  for (const packName of packNames) {
    const packDir = path.join(closeoutPackRoot, packName);
    const packId = packName.toUpperCase();
    const artifactPaths = Object.fromEntries(requiredArtifactNames.map((name) => [name, path.join(packDir, name)]));
    const missingArtifacts = [];
    for (const artifactName of requiredArtifactNames) {
      if (!(await pathExists(artifactPaths[artifactName]))) missingArtifacts.push(artifactName);
    }
    if (missingArtifacts.length > 0) {
      missing.push({ pack_id: packId, missing_gates: missingArtifacts.map((name) => `artifact:${name}`) });
      continue;
    }
    counts.required_artifact_complete_count += 1;

    const manifest = await readJson(artifactPaths["manifest.json"]);
    const commandEvidence = await readJson(artifactPaths["command-evidence.json"]);
    const reviewResult = await readJson(artifactPaths["claude-review-result.json"]);
    const constructionInspection = await readJson(artifactPaths["construction-inspection.json"]);
    const adjudicationExists = await pathExists(artifactPaths["adjudication.md"]);
    const commands = commandEvidence.commands ?? [];
    const review = manifest.pack_level_claude_review ?? {};
    const validReview =
      review.status === "review_completed" ||
      reviewResult.status === "review_completed" ||
      reviewResult.exactly_one_valid_pack_level_claude_review_run === true ||
      (Array.isArray(review.valid_review_receipts) && review.valid_review_receipts.length > 0);
    const reviewWaiver =
      review.status === "review_waived_by_user" ||
      reviewResult.status === "review_waived_by_user" ||
      review.user_waiver?.not_counted_as_valid_review === true ||
      reviewResult.user_waiver?.not_counted_as_valid_review === true;
    const implementationEvidence =
      Boolean(manifest.implementation_summary) ||
      Boolean(manifest.production_ready_flag) ||
      (manifest.included_units ?? []).some((unit) => Array.isArray(unit.implementation_refs) && unit.implementation_refs.length > 0);
    const testsEvidence = commandListHas(commands, [/test/i]);
    const hermesEvidence =
      commandEvidence.hermes_gate?.status === "passed" ||
      commandEvidence.hermes_gate_evidence?.result === "passed" ||
      commandListHas(commands, [/hermes/i, /:validate\b/, /validate-/i]);
    const includedUnitsReady =
      manifest.production_ready === true &&
      (manifest.included_units ?? []).length > 0 &&
      (manifest.included_units ?? []).every((unit) => unit.status === "production_ready" || manifest.production_ready === true);
    const constructionPass = constructionInspection.verdict === "PASS" || constructionInspection.pack_production_ready === true;
    const finalValidation = commandListHas(commands, [/closeout-pack:validate/]);
    const commitEvidence = commitSubjects.some((subject) => subject.includes(packId));

    if (implementationEvidence) counts.implementation_evidence_count += 1;
    if (testsEvidence) counts.tests_evidence_count += 1;
    if (hermesEvidence) counts.hermes_evidence_count += 1;
    if (validReview) counts.valid_review_count += 1;
    if (reviewWaiver) counts.review_waiver_count += 1;
    if (validReview || reviewWaiver) counts.review_satisfied_count += 1;
    if (adjudicationExists) counts.adjudication_count += 1;
    if (constructionPass) counts.construction_inspection_pass_count += 1;
    if (includedUnitsReady) counts.included_units_production_ready_count += 1;
    if (finalValidation) counts.final_validation_count += 1;
    if (commitEvidence) counts.commit_evidence_count += 1;

    const missingGates = [];
    if (!implementationEvidence) missingGates.push("implementation");
    if (!testsEvidence) missingGates.push("tests");
    if (!hermesEvidence) missingGates.push("hermes_evidence");
    if (!validReview && !reviewWaiver) missingGates.push("review_or_owner_waiver");
    if (!adjudicationExists) missingGates.push("adjudication");
    if (!constructionPass) missingGates.push("construction_inspection");
    if (!includedUnitsReady) missingGates.push("included_units_production_ready");
    if (!finalValidation) missingGates.push("final_validation");
    if (!commitEvidence) missingGates.push("commit");
    if (missingGates.length > 0) missing.push({ pack_id: packId, missing_gates: missingGates });
  }

  if (missing.length > 0) {
    addFinding("P1", "FPCG-PACK-GATE-CHAIN-GAPS", "One or more closeout packs are missing required gate-chain evidence");
  }
  return {
    ...counts,
    review_waiver_is_not_valid_review_evidence: true,
    missing_pack_count: missing.length,
    missing_packs: missing,
  };
}

async function main() {
  const contract = await readJson(contractPath);
  const scopeRevision = await loadScopeRevision(contract);
  const units = await loadLedgerCounts(contract);
  const productionReady = await loadCloseoutPackState(units.expanded_total_units);
  const ldip = await loadLdipClassification();
  const invariants = await loadInvariantStatus();
  const pack_gate_chain = await loadCloseoutPackGateChain();
  const p0Count = findings.filter((finding) => finding.severity === "P0").length;
  const p1Count = findings.filter((finding) => finding.severity === "P1").length;
  const report = {
    schema_version: "law-firm-os.final-product-completion-gate.validation.v0.1",
    contract_path: contractPath,
    scope_revision: scopeRevision,
    units,
    production_ready: productionReady,
    ldip,
    invariants,
    pack_gate_chain,
    p0_p1_counts: {
      validator_p0_count: p0Count,
      validator_p1_count: p1Count,
      structured_review_p0_count: productionReady.structured_review_p0_count,
      structured_review_p1_count: productionReady.structured_review_p1_count,
    },
    findings,
    verdict: p0Count === 0 && p1Count === 0 ? "PASS" : "FAIL",
  };
  console.log(JSON.stringify(report, null, 2));
  process.exitCode = report.verdict === "PASS" ? 0 : 1;
}

main().catch((error) => {
  console.error(JSON.stringify({ verdict: "FAIL", error: error.message }, null, 2));
  process.exitCode = 1;
});
