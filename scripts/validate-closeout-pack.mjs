#!/usr/bin/env node
import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";

const errors = [];
const root = "docs/closeout-packs";
const requiredLegacyFiles = [
  "packet.json",
  "command-evidence.json",
  "claude-review-result.json",
  "adjudication.md",
  "construction-inspection.json",
];
const requiredPackFiles = [
  "manifest.json",
  "command-evidence.json",
  "claude-review-result.json",
  "adjudication.md",
  "construction-inspection.json",
];
const riskRanges = {
  A: { min: 1, max: 10 },
  B: { min: 10, max: 40 },
  C: { min: 40, max: 150 },
};
const hardenedReviewStartPackNumber = 178;
const implementationLayerStartPackNumber = 328;
let closeoutPackPlanCache;

async function exists(relativePath) {
  try {
    await access(path.resolve(relativePath));
    return true;
  } catch {
    return false;
  }
}

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.resolve(relativePath), "utf8"));
}

async function readText(relativePath) {
  return readFile(path.resolve(relativePath), "utf8");
}

function requireEqual(actual, expected, label) {
  if (actual !== expected) errors.push(`${label} must be ${expected}, got ${actual}`);
}

function requireTrue(actual, label) {
  if (actual !== true) errors.push(`${label} must be true`);
}

function requireArray(value, label) {
  if (!Array.isArray(value)) errors.push(`${label} must be an array`);
}

function packNumber(packId) {
  const match = /^CP00-(\d{3,})$/.exec(packId);
  return match ? Number(match[1]) : Number.NaN;
}

async function readCloseoutPackPlan() {
  if (closeoutPackPlanCache !== undefined) return closeoutPackPlanCache;
  if (!(await exists("docs/closeout-pack-plan/closeout-pack-plan.json"))) {
    closeoutPackPlanCache = null;
    return closeoutPackPlanCache;
  }
  closeoutPackPlanCache = await readJson("docs/closeout-pack-plan/closeout-pack-plan.json");
  return closeoutPackPlanCache;
}

async function plannedPackFor(packId) {
  const plan = await readCloseoutPackPlan();
  return plan?.packs?.find((pack) => pack.pack_id === packId);
}

function primarySubphaseIdFor(packId, manifest) {
  if (manifest.primary_subphase_id) return manifest.primary_subphase_id;
  const transitionUnit = (manifest.included_units ?? []).find((unit) => unit.source === "current_pack_transition_change");
  if (transitionUnit?.id) return transitionUnit.id;
  if (packId === "CP00-001") return "RP00.P02.M05.S05";
  return manifest.included_units?.at?.(-1)?.id;
}

function productionReadyFlagFor(packId, manifest) {
  if (manifest.production_ready_flag) return manifest.production_ready_flag;
  if (manifest.closeout_state_policy?.production_ready_flag) return manifest.closeout_state_policy.production_ready_flag;
  if (packId === "CP00-001") return "control_plane_permission_audit_binding_permission_precheck_verified";
  return undefined;
}

async function countCompleteLegacyCloseouts() {
  const closeoutRoot = "docs/goal-closeout";
  const entries = await readdir(path.resolve(closeoutRoot), { withFileTypes: true });
  const dirs = entries.filter((entry) => entry.isDirectory()).map((entry) => path.join(closeoutRoot, entry.name));
  let complete = 0;
  for (const dir of dirs) {
    let hasAll = true;
    for (const file of requiredLegacyFiles) {
      if (!(await exists(path.join(dir, file)))) {
        hasAll = false;
        break;
      }
    }
    if (hasAll) complete += 1;
  }
  return { dirs: dirs.length, complete };
}

async function discoverPackIds() {
  if (process.argv.length > 2) return process.argv.slice(2);
  const entries = await readdir(path.resolve(root), { withFileTypes: true });
  return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name.toUpperCase());
}

function validatePackCountPolicy(manifest, packRoot) {
  requireEqual(manifest.plan_totals?.law_firm_os_units, 54355, `${packRoot} Law Firm OS unit total`);
  requireEqual(manifest.plan_totals?.hrx_embedded_people_units, 901, `${packRoot} HRX embedded People unit total`);
  requireEqual(manifest.plan_totals?.expanded_total_units, 55256, `${packRoot} expanded unit total`);
  requireEqual(
    manifest.plan_totals?.hrx_product_boundary,
    "embedded_people_hr_evidence_module_inside_law_firm_os",
    `${packRoot} HRX product boundary`,
  );
  requireEqual(manifest.pack_count_policy?.estimated_total_packs_approx, 1000, `${packRoot} pack count estimate`);
  requireEqual(manifest.pack_count_policy?.estimated_range_min, 760, `${packRoot} pack estimate min`);
  requireEqual(manifest.pack_count_policy?.estimated_range_max, 1295, `${packRoot} pack estimate max`);
  requireTrue(manifest.pack_count_policy?.not_equal_distribution, `${packRoot} not_equal_distribution`);
  requireTrue(manifest.pack_count_policy?.not_1000_units_per_pack, `${packRoot} not_1000_units_per_pack`);
  requireTrue(
    manifest.pack_count_policy?.do_not_calculate_pack_size_as_total_units_divided_by_1000,
    `${packRoot} arithmetic pack-size prohibition`,
  );
  for (const [risk, range] of Object.entries(riskRanges)) {
    requireEqual(manifest.pack_count_policy?.risk_class_unit_ranges?.[risk]?.min_units, range.min, `${packRoot} Risk ${risk} min`);
    requireEqual(manifest.pack_count_policy?.risk_class_unit_ranges?.[risk]?.max_units, range.max, `${packRoot} Risk ${risk} max`);
  }
}

async function validatePlanBinding(packId, packRoot, manifest, plannedPack) {
  if (packNumber(packId) < 51) return;
  if (!plannedPack) {
    errors.push(`${packRoot} must be present in docs/closeout-pack-plan/closeout-pack-plan.json`);
    return;
  }
  requireEqual(manifest.planned_pack_id, packId, `${packRoot} planned_pack_id`);
  requireEqual(manifest.planned_risk_class, plannedPack.risk_class, `${packRoot} planned_risk_class`);
  requireEqual(manifest.planned_unit_count, plannedPack.unit_count, `${packRoot} planned_unit_count`);
  requireEqual(manifest.plan_ref, "docs/closeout-pack-plan/closeout-pack-plan.json", `${packRoot} plan_ref`);
  const hasDeviationReason =
    typeof manifest.deviation_from_plan === "string" ? manifest.deviation_from_plan.trim().length > 0 : Boolean(manifest.deviation_from_plan?.reason);
  if (manifest.deviation_from_plan !== false && !hasDeviationReason) {
    errors.push(`${packRoot} deviation_from_plan must be false or carry a reason`);
  }
  if (manifest.deviation_from_plan === false) {
    const plannedUnitIds = plannedPack.included_units.map((unit) => unit.id);
    const manifestUnitIds = (manifest.included_units ?? []).map((unit) => unit.id);
    requireEqual(manifest.risk_class, plannedPack.risk_class, `${packRoot} risk_class must match plan`);
    requireEqual(manifest.unit_count, plannedPack.unit_count, `${packRoot} unit_count must match plan`);
    requireEqual(manifestUnitIds.join(","), plannedUnitIds.join(","), `${packRoot} included_units must match plan`);
  }
}

async function validateManifest(packId, packRoot, manifest) {
  let plannedPack = await plannedPackFor(packId);
  if (!plannedPack && packNumber(packId) >= 51 && manifest.plan_binding_snapshot?.pack_id === packId) {
    plannedPack = manifest.plan_binding_snapshot;
  }
  requireEqual(manifest.schema_version, "law-firm-os.closeout-pack.v0.1", `${packRoot} schema_version`);
  requireEqual(manifest.pack_id, packId, `${packRoot} pack_id`);
  if (!["in_progress", "production_ready"].includes(manifest.status)) {
    errors.push(`${packRoot} status must be in_progress or production_ready`);
  }
  if (packNumber(packId) >= implementationLayerStartPackNumber) {
    if (!["descriptor", "runtime", "mixed"].includes(manifest.implementation_layer)) {
      errors.push(`${packRoot} implementation_layer must be descriptor, runtime, or mixed`);
    }
    if (manifest.implementation_layer === "descriptor" && manifest.implementation_summary?.descriptor_only !== true) {
      errors.push(`${packRoot} descriptor implementation_layer requires implementation_summary.descriptor_only=true`);
    }
    if (["runtime", "mixed"].includes(manifest.implementation_layer)) {
      requireTrue(manifest.runtime_ready, `${packRoot} runtime_ready`);
      if (!manifest.runtime_readiness) errors.push(`${packRoot} runtime/mixed implementation_layer requires runtime_readiness block`);
    }
  }
  if (plannedPack) {
    requireEqual(manifest.program_id, plannedPack.included_units[0]?.program_id, `${packRoot} program_id`);
  } else {
    requireEqual(manifest.program_id, "RP00", `${packRoot} program_id`);
  }
  if (!riskRanges[manifest.risk_class]) errors.push(`${packRoot} risk_class must be A, B, or C`);
  requireArray(manifest.included_units, `${packRoot} included_units`);
  if (Array.isArray(manifest.included_units)) {
    const unitIds = new Set();
    for (const unit of manifest.included_units) {
      if (!unit.id) errors.push(`${packRoot} included unit missing id`);
      if (unitIds.has(unit.id)) errors.push(`${packRoot} duplicate included unit ${unit.id}`);
      unitIds.add(unit.id);
      requireEqual(unit.risk_class, manifest.risk_class, `${packRoot} included unit ${unit.id} risk_class`);
      if (manifest.status === "production_ready") {
        requireEqual(unit.status, "production_ready", `${packRoot} included unit ${unit.id} status`);
      }
      const refs = [...(unit.evidence_refs ?? []), ...(unit.implementation_refs ?? [])];
      if (refs.length === 0) errors.push(`${packRoot} included unit ${unit.id} must include evidence or implementation refs`);
      for (const ref of unit.evidence_refs ?? []) {
        if (ref.startsWith("docs/") && !(await exists(ref))) errors.push(`${packRoot} included unit ${unit.id} missing evidence ref ${ref}`);
      }
    }
    requireEqual(manifest.unit_count, manifest.included_units.length, `${packRoot} unit_count`);
    const range = riskRanges[manifest.risk_class];
    if (range && (manifest.unit_count < range.min || manifest.unit_count > range.max)) {
      const overrideReason = manifest.override_reason ?? plannedPack?.override_reason;
      if (!overrideReason) {
        errors.push(`${packRoot} Risk ${manifest.risk_class} unit_count ${manifest.unit_count} outside ${range.min}-${range.max}`);
      }
    }
  }
  await validatePlanBinding(packId, packRoot, manifest, plannedPack);
  validatePackCountPolicy(manifest, packRoot);
  const artifactSet = new Set(manifest.required_pack_artifacts ?? []);
  for (const file of requiredPackFiles) {
    const artifact = `${packRoot}/${file}`;
    if (!artifactSet.has(artifact)) errors.push(`${packRoot} required_pack_artifacts missing ${artifact}`);
    if (!(await exists(artifact))) errors.push(`${packRoot} missing ${artifact}`);
  }
  requireTrue(manifest.worktree_transition_policy?.do_not_revert_existing_changes, `${packRoot} do_not_revert_existing_changes`);
  requireTrue(
    manifest.worktree_transition_policy?.legacy_individual_closeout_evidence_preserved,
    `${packRoot} legacy evidence preservation`,
  );
  requireEqual(manifest.worktree_transition_policy?.new_primary_completion_unit, "closeout_pack", `${packRoot} primary completion unit`);
  requireEqual(
    manifest.pack_level_claude_review?.required_model,
    "claude-opus-4-8",
    `${packRoot} required Claude model`,
  );
  requireEqual(manifest.pack_level_claude_review?.required_effort, "max", `${packRoot} required Claude effort`);
  requireEqual(manifest.pack_level_claude_review?.required_mode, "read_only", `${packRoot} required Claude mode`);
  requireTrue(
    manifest.pack_level_claude_review?.exactly_one_valid_pack_review_required,
    `${packRoot} exactly one valid pack review flag`,
  );
  if (manifest.status === "production_ready") {
    requireTrue(manifest.production_ready, `${packRoot} manifest production_ready`);
    if (!["review_completed", "review_waived_by_user"].includes(manifest.pack_level_claude_review?.status)) {
      errors.push(`${packRoot} pack-level Claude review status must be review_completed or review_waived_by_user`);
    }
    requireEqual(manifest.commit_policy?.required, true, `${packRoot} commit required`);
  }
}

function validateCommandEvidence(packId, packRoot, manifest, commandEvidence) {
  requireEqual(commandEvidence.pack_id, packId, `${packRoot} command evidence pack_id`);
  requireEqual(commandEvidence.subphase_id, primarySubphaseIdFor(packId, manifest), `${packRoot} command evidence subphase_id`);
  requireTrue(commandEvidence.no_real_data, `${packRoot} command evidence no_real_data`);
  requireEqual(commandEvidence.writes_product_state, false, `${packRoot} command evidence writes_product_state`);
  requireArray(commandEvidence.commands, `${packRoot} command evidence commands`);
  const notes = commandEvidence.notes ?? [];
  if (!notes.some((note) => note.includes("No real client") && note.includes("credential") && note.includes("secret"))) {
    errors.push(`${packRoot} command evidence must attest no real client, matter, document, billing, settlement, credential, or secret data`);
  }
  const requiredHermesIds = new Set(["rp00_control_plane_contract_validate", "spec_requirement_validate"]);
  for (const commandId of commandEvidence.hermes_gate?.command_ids ?? []) {
    if (!requiredHermesIds.has(commandId)) errors.push(`${packRoot} Hermes command id ${commandId} not allowed for closeout pack`);
  }
  if (manifest.status !== "production_ready") return;
  requireEqual(commandEvidence.status, "passed", `${packRoot} command evidence status`);
  requireTrue(commandEvidence.production_ready, `${packRoot} command evidence production_ready`);
  requireEqual(commandEvidence.hermes_gate?.status, "passed", `${packRoot} Hermes gate status`);
  requireEqual(commandEvidence.gate_outcome, "passed_after_pack_evidence_creation", `${packRoot} gate outcome`);
  const requiredCommands = [
    "node --check scripts/validate-closeout-pack.mjs",
    "npm run closeout-pack:validate",
    "npm test",
    "npm run validate",
    "npm run spec:requirements:validate",
    "npm run weighted:validate",
    "npm run fullplan:validate",
    "npm run goal:closeout:validate",
    "npm run rp00:control-plane:validate",
    "git diff --check",
  ];
  if (packNumber(packId) >= 51) {
    requiredCommands.unshift("npm run closeout-pack-plan:validate");
  }
  for (const command of requiredCommands) {
    const row = (commandEvidence.commands ?? []).find((item) => item.command === command);
    if (!row) errors.push(`${packRoot} command evidence missing ${command}`);
    if (row && row.exit_code !== 0) errors.push(`${packRoot} command evidence ${command} must have exit_code 0`);
  }
}

function reviewToolsValue(review) {
  const tools = review.review_execution?.tools;
  return Array.isArray(tools) ? tools.join(",") : String(tools ?? "");
}

function hasExplicitClaudeReviewWaiver(manifest, review) {
  const manifestWaiver = manifest.pack_level_claude_review?.user_waiver;
  const reviewWaiver = review.user_waiver;
  return (
    manifest.pack_level_claude_review?.status === "review_waived_by_user" &&
    review.status === "review_waived_by_user" &&
    review.review_execution?.source === "user_instruction" &&
    manifestWaiver?.not_counted_as_valid_review === true &&
    reviewWaiver?.not_counted_as_valid_review === true &&
    manifestWaiver?.future_precedent === false &&
    reviewWaiver?.future_precedent === false &&
    typeof reviewWaiver?.owner_instruction === "string" &&
    reviewWaiver.owner_instruction.includes("클로드 리뷰") &&
    reviewWaiver.owner_instruction.includes("생략")
  );
}

async function validateHardenedClaudeReview(packId, packRoot, review) {
  const tools = reviewToolsValue(review);
  requireEqual(tools, "Read,Grep,Glob", `${packRoot} hardened Claude review tools`);
  requireEqual(
    review.review_execution?.runner,
    "scripts/run-closeout-pack-claude-review.mjs",
    `${packRoot} hardened Claude review runner`,
  );
  if (!review.review_receipt_ref) {
    errors.push(`${packRoot} hardened Claude review must include review_receipt_ref`);
    return;
  }
  if (!(await exists(review.review_receipt_ref))) {
    errors.push(`${packRoot} hardened Claude review missing receipt ${review.review_receipt_ref}`);
    return;
  }
  const receipt = await readJson(review.review_receipt_ref);
  requireEqual(receipt.schema_version, "law-firm-os.closeout-pack-claude-review-receipt.v0.1", `${packRoot} receipt schema_version`);
  requireEqual(receipt.pack_id, packId, `${packRoot} receipt pack_id`);
  requireTrue(receipt.valid_review, `${packRoot} receipt valid_review`);
  requireTrue(receipt.closeout_eligible, `${packRoot} receipt closeout_eligible`);
  requireEqual(receipt.invalid_reason, null, `${packRoot} receipt invalid_reason`);
  requireEqual(receipt.review_execution?.source, "claude_cli", `${packRoot} receipt source`);
  requireEqual(receipt.review_execution?.runner, "scripts/run-closeout-pack-claude-review.mjs", `${packRoot} receipt runner`);
  requireEqual(receipt.review_execution?.model, "claude-opus-4-8", `${packRoot} receipt model`);
  requireEqual(receipt.review_execution?.effort, "max", `${packRoot} receipt effort`);
  requireEqual(receipt.review_execution?.tools, "Read,Grep,Glob", `${packRoot} receipt tools`);
  requireTrue(receipt.review_execution?.read_only, `${packRoot} receipt read_only`);
  requireEqual(receipt.review_execution?.permission_mode, "dontAsk", `${packRoot} receipt permission_mode`);
  requireEqual(receipt.review_execution?.status, 0, `${packRoot} receipt raw status`);
  if (!receipt.review_execution?.session_id) errors.push(`${packRoot} receipt missing session_id`);
  if (!receipt.review_execution?.uuid) errors.push(`${packRoot} receipt missing uuid`);
  if (typeof receipt.review_execution?.total_cost_usd !== "number") errors.push(`${packRoot} receipt missing total_cost_usd`);
  if ((receipt.review_execution?.permission_denials ?? []).length !== 0) {
    errors.push(`${packRoot} receipt permission_denials must be empty`);
  }
  if ((receipt.raw_output?.stdout_bytes ?? 0) <= 0) errors.push(`${packRoot} receipt stdout_bytes must be greater than 0`);
  const validRefs = review.valid_review_receipts ?? [];
  if (!Array.isArray(validRefs) || validRefs.length !== 1 || validRefs[0] !== review.review_receipt_ref) {
    errors.push(`${packRoot} must declare exactly one valid_review_receipts entry matching review_receipt_ref`);
  }
  for (const attempt of review.invalid_review_attempts ?? []) {
    if (attempt.status !== "invalid_not_accepted") {
      errors.push(`${packRoot} invalid review attempt ${attempt.attempt_id ?? "unknown"} must be invalid_not_accepted`);
    }
  }
}

async function validateClaudeReview(packId, packRoot, manifest, review) {
  requireEqual(review.pack_id, packId, `${packRoot} Claude review pack_id`);
  if (hasExplicitClaudeReviewWaiver(manifest, review)) {
    requireEqual(review.exactly_one_valid_pack_level_claude_review_run, false, `${packRoot} waived review valid-run flag`);
    requireEqual(review.parsed_review?.overall_verdict, "WAIVED_BY_USER", `${packRoot} waived review verdict`);
    requireEqual(review.parsed_review?.not_counted_as_review_evidence, true, `${packRoot} waived review evidence marker`);
    return;
  }
  requireEqual(review.review_execution?.source, "claude_cli", `${packRoot} Claude review source`);
  requireEqual(review.review_execution?.model, "claude-opus-4-8", `${packRoot} Claude review model`);
  requireEqual(review.review_execution?.effort, "max", `${packRoot} Claude review effort`);
  requireTrue(review.review_execution?.read_only, `${packRoot} Claude review read_only`);
  if (manifest.status !== "production_ready") return;
  requireEqual(review.status, "review_completed", `${packRoot} Claude review status`);
  requireTrue(review.exactly_one_valid_pack_level_claude_review_run, `${packRoot} exactly one valid pack-level Claude run`);
  if (!review.review_execution?.session_id) errors.push(`${packRoot} Claude review missing session_id`);
  if (!review.review_execution?.uuid) errors.push(`${packRoot} Claude review missing uuid`);
  if (typeof review.review_execution?.total_cost_usd !== "number") errors.push(`${packRoot} Claude review missing total_cost_usd`);
  if ((review.review_execution?.permission_denials ?? []).length !== 0) {
    errors.push(`${packRoot} Claude review permission_denials must be empty`);
  }
  if (!["PASS", "PASS_WITH_FINDINGS"].includes(review.parsed_review?.overall_verdict)) {
    errors.push(`${packRoot} Claude review verdict must be PASS or PASS_WITH_FINDINGS`);
  }
  if (review.parsed_review?.blocks_pack_closeout === true || review.parsed_review?.blocks_goal_closeout === true) {
    errors.push(`${packRoot} Claude review must not block pack closeout`);
  }
  const counts = review.parsed_review?.finding_counts ?? {};
  requireEqual(counts.p0, 0, `${packRoot} unresolved P0 count`);
  requireEqual(counts.p1, 0, `${packRoot} unresolved P1 count`);
  requireEqual(counts.p2, 0, `${packRoot} unresolved P2 count`);
  if (packNumber(packId) >= hardenedReviewStartPackNumber) {
    await validateHardenedClaudeReview(packId, packRoot, review);
  }
}

async function validateAdjudication(packRoot, manifest) {
  const text = await readText(`${packRoot}/adjudication.md`);
  if (manifest.status !== "production_ready") return;
  for (const required of [
    "P0 findings: 0",
    "P1 findings: 0",
    "P2 findings: 0",
    "Production ready after adjudication: yes",
  ]) {
    if (!text.includes(required)) errors.push(`${packRoot} adjudication missing ${required}`);
  }
}

function validateInspection(packId, packRoot, manifest, inspection) {
  requireEqual(inspection.pack_id, packId, `${packRoot} inspection pack_id`);
  requireEqual(inspection.subphase_id, primarySubphaseIdFor(packId, manifest), `${packRoot} inspection subphase_id`);
  if (manifest.status !== "production_ready") return;
  requireEqual(inspection.verdict, "PASS", `${packRoot} inspection verdict`);
  requireTrue(inspection.production_ready, `${packRoot} inspection production_ready`);
  requireTrue(inspection.pack_production_ready, `${packRoot} inspection pack production_ready`);
  requireTrue(inspection.included_units_production_ready, `${packRoot} included units production_ready`);
  if (manifest.pack_level_claude_review?.status === "review_waived_by_user") {
    requireTrue(inspection.pack_level_claude_review_waived_by_user, `${packRoot} pack-level Claude review waived by user`);
  } else {
    requireTrue(inspection.pack_level_claude_review_completed, `${packRoot} pack-level Claude review completed`);
  }
  requireEqual(inspection.claude_findings?.p2_status, "fixed_or_deferred", `${packRoot} P2 disposition`);
  const productionReadyFlag = productionReadyFlagFor(packId, manifest);
  if (!productionReadyFlag) {
    errors.push(`${packRoot} production-ready inspection flag could not be derived`);
  } else {
    requireTrue(inspection[productionReadyFlag], `${packRoot} ${productionReadyFlag}`);
  }
  if (!inspection.human_acceptance_or_explicit_next_goal_boundary) {
    errors.push(`${packRoot} inspection must record human acceptance or explicit next goal boundary`);
  }
}

async function validatePack(packId) {
  const normalizedPackId = packId.toUpperCase();
  const packRoot = `${root}/${normalizedPackId.toLowerCase()}`;
  const manifest = await readJson(`${packRoot}/manifest.json`);
  const commandEvidence = await readJson(`${packRoot}/command-evidence.json`);
  const review = await readJson(`${packRoot}/claude-review-result.json`);
  const inspection = await readJson(`${packRoot}/construction-inspection.json`);
  const liveCloseouts = await countCompleteLegacyCloseouts();

  await validateManifest(normalizedPackId, packRoot, manifest);
  if (manifest.live_closeout_snapshot) {
    if (liveCloseouts.dirs < manifest.live_closeout_snapshot.goal_closeout_dirs) {
      errors.push(`${packRoot} live goal-closeout dir count must not fall below the recorded snapshot`);
    }
    if (liveCloseouts.complete < manifest.live_closeout_snapshot.goal_closeout_dirs_with_required_artifacts) {
      errors.push(`${packRoot} live completed goal-closeout dir count must not fall below the recorded snapshot`);
    }
    if (55256 - liveCloseouts.complete > manifest.live_closeout_snapshot.remaining_by_closeout_dir_proxy) {
      errors.push(`${packRoot} remaining closeout-dir proxy must not increase beyond the recorded snapshot`);
    }
  }
  validateCommandEvidence(normalizedPackId, packRoot, manifest, commandEvidence);
  await validateClaudeReview(normalizedPackId, packRoot, manifest, review);
  await validateAdjudication(packRoot, manifest);
  validateInspection(normalizedPackId, packRoot, manifest, inspection);
}

const packIds = await discoverPackIds();
for (const packId of packIds) {
  await validatePack(packId);
}

if (errors.length > 0) {
  console.error("Closeout Pack validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Closeout Pack validation passed.");
console.log(`packs: ${packIds.join(", ")}`);
