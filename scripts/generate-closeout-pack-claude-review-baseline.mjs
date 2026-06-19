#!/usr/bin/env node
import path from "node:path";
import {
  MAX_PROMPT_BYTES,
  READ_ONLY_TOOLS,
  REQUIRED_EFFORT,
  REQUIRED_MODEL,
  REVIEW_BASELINE_SCHEMA_VERSION,
  REVIEW_HARDENING_VERSION,
  byteLength,
  canonicalToolsString,
  detectFullDiffOrSourcePrompt,
  getReviewSchema,
  isImplementationLikePath,
  normalizePackId,
  packNumber,
  packSlug,
  parseArgs,
  readManifestIfPresent,
  readPlanPack,
  reviewArtifactRoot,
  runGitStatus,
  validationCommandList,
  writeJson,
} from "./lib/closeout-pack-claude-review-hardening.mjs";
import { mkdir, writeFile } from "node:fs/promises";

const args = parseArgs(process.argv.slice(2));
const packId = normalizePackId(args._[0]);
const outputRoot = args.out ?? reviewArtifactRoot(packId);
const planPack = await readPlanPack(packId);
const manifest = await readManifestIfPresent(packId);
const statusRows = runGitStatus();

const byDeliverable = {};
const byMicroTitle = {};
for (const unit of planPack.included_units ?? []) {
  byDeliverable[unit.deliverable_type] = (byDeliverable[unit.deliverable_type] ?? 0) + 1;
  byMicroTitle[unit.micro_title] = (byMicroTitle[unit.micro_title] ?? 0) + 1;
}

const activeImplementationRefs = new Set([
  ...(manifest?.implementation_summary?.source_refs ?? []),
  ...((manifest?.included_units ?? []).flatMap((unit) => unit.implementation_refs ?? [])),
]);
const declaredActiveUntrackedImplementationFiles = new Set(
  (manifest?.worktree_transition_policy?.active_pack_required_untracked_files ?? []).filter(isImplementationLikePath),
);
const activeImplementationRefList = [...new Set([...activeImplementationRefs, ...declaredActiveUntrackedImplementationFiles])];
const activePackCloseoutArtifactRoot = `docs/closeout-packs/${packSlug(packId)}/`;
function isActiveImplementationStatusPath(file) {
  return activeImplementationRefs.has(file) || activeImplementationRefList.some((ref) => ref.startsWith(file) || file.startsWith(ref));
}
function isActivePackCloseoutArtifactPath(file) {
  return file === activePackCloseoutArtifactRoot || file.startsWith(activePackCloseoutArtifactRoot);
}
const untrackedImplementationFiles = statusRows
  .filter((row) => row.untracked && isImplementationLikePath(row.file) && !isActivePackCloseoutArtifactPath(row.file))
  .map((row) => row.file)
  .sort();
const untrackedImplementationFileSet = new Set(untrackedImplementationFiles);
const activeUntrackedImplementationFilesOmitted = [...declaredActiveUntrackedImplementationFiles]
  .filter((file) => untrackedImplementationFiles.includes(file) && activeImplementationRefs.has(file) === false)
  .sort();
const sourceInspectionMode = "read_tools_used";
const summaryOnlyProhibitedReasons = [];
if (["B", "C"].includes(planPack.risk_class)) summaryOnlyProhibitedReasons.push(`Risk ${planPack.risk_class} pack`);
if (packNumber(packId) === 178) summaryOnlyProhibitedReasons.push("new RP05 post-CP177 continuation boundary");
if ((byDeliverable.security_audit ?? 0) > 0) summaryOnlyProhibitedReasons.push("security/audit deliverables present");
if ((byDeliverable.claude_review ?? 0) > 0) summaryOnlyProhibitedReasons.push("review evidence deliverables present");

const changedFileScope = {
  schema_version: `${REVIEW_HARDENING_VERSION}.changed-file-scope.v0.1`,
  pack_id: packId,
  active_pack_scope_available: Boolean(manifest),
  active_pack_implementation_refs: [...activeImplementationRefs].sort(),
  active_pack_required_untracked_files: [...declaredActiveUntrackedImplementationFiles].sort(),
  active_pack_closeout_artifact_root: activePackCloseoutArtifactRoot,
  git_status_rows: statusRows,
  untracked_implementation_files: untrackedImplementationFiles,
  active_untracked_implementation_files_omitted: activeUntrackedImplementationFilesOmitted,
  unrelated_dirty_files_preserved: statusRows
    .filter(
      (row) =>
        !isActiveImplementationStatusPath(row.file) &&
        !isActivePackCloseoutArtifactPath(row.file) &&
        !untrackedImplementationFileSet.has(row.file),
    )
    .map((row) => row.file)
    .sort(),
};

const reviewSchemaPath = path.join(outputRoot, "review-schema.json");
const request = {
  schema_version: `${REVIEW_HARDENING_VERSION}.request.v0.1`,
  pack_id: packId,
  created_at: new Date().toISOString(),
  model: REQUIRED_MODEL,
  effort: REQUIRED_EFFORT,
  permission_mode: "dontAsk",
  read_only: true,
  tools: READ_ONLY_TOOLS,
  tools_string: canonicalToolsString(READ_ONLY_TOOLS),
  output_format: "json",
  json_schema_ref: reviewSchemaPath,
  prompt_ref: path.join(outputRoot, "prompt.txt"),
  raw_output_ref: path.join(outputRoot, "raw-output.json"),
  receipt_ref: path.join(outputRoot, "review-receipt.json"),
  runner: "scripts/run-closeout-pack-claude-review.mjs",
  command_args: [
    "-p",
    "<prompt.txt content as one spawn arg>",
    "--model",
    REQUIRED_MODEL,
    "--effort",
    REQUIRED_EFFORT,
    "--permission-mode",
    "dontAsk",
    "--tools",
    canonicalToolsString(READ_ONLY_TOOLS),
    "--json-schema",
    "<review-schema.json content as one spawn arg>",
    "--output-format",
    "json",
  ],
};

const authorityBoundary = {
  claude_role: "read_only_independent_reviewer",
  claude_is_final_approver: false,
  human_final_approval_required_for_enterprise_trust_claim: true,
  enterprise_trust_claim_closed: true,
  hermes_runtime_embedded_in_product: false,
  imported_pattern: "deterministic_control_plane_review_packet_and_receipt",
};

const prompt = `You are the Law Firm OS Closeout Pack read-only reviewer for ${packId}.

Review only through read-only tools: Read, Grep, Glob. Do not run Bash. Do not edit files. Do not write files. Do not call connectors or APIs.

Pack baseline:
- pack_id: ${packId}
- risk_class: ${planPack.risk_class}
- unit_count: ${planPack.unit_count}
- range: ${planPack.range?.description}
- program_id: ${planPack.included_units?.[0]?.program_id}
- first_unit_id: ${planPack.range?.first_unit_id}
- last_unit_id: ${planPack.range?.last_unit_id}
- deliverable_distribution: ${JSON.stringify(byDeliverable)}
- micro_title_distribution: ${JSON.stringify(byMicroTitle)}

Changed file scope:
- changed-file-scope.json records active implementation refs, current dirty/untracked files, and omitted active untracked implementation files.
- Do not infer unrelated dirty files are part of this pack.

Validation commands expected before closeout:
${validationCommandList(packId).map((command) => `- ${command}`).join("\n")}

Review focus:
- Verify the pack-level production_ready claim is supported by implementation, tests, Hermes/local validation, adjudication, inspection, and no-write/no-real-data boundaries.
- For CP178+ review hardening, reject auth failures, 0-byte stdout, malformed JSON, fenced JSON with prose, tool-call-shaped output, and missing required fields as valid review evidence.
- Check that Claude remains a read-only reviewer and not final approval authority.
- Check that Hermes control-plane patterns are used only for deterministic review packet/receipt handling, not product runtime execution.
- Interpret blocks_goal_closeout as this CP closeout goal only. Do not set blocks_goal_closeout=true solely because Claude is not final human/enterprise-trust approval authority; that expected authority boundary is outside this receipt unless the pack itself claims runtime or enterprise trust.

Authority boundary:
${JSON.stringify(authorityBoundary, null, 2)}

Output JSON only according to review-schema.json.`;

const promptBytes = byteLength(prompt);
const validationReport = {
  schema_version: `${REVIEW_HARDENING_VERSION}.validation-report.v0.1`,
  pack_id: packId,
  prompt_bytes: promptBytes,
  prompt_size_limit_bytes: MAX_PROMPT_BYTES,
  prompt_size_ok: promptBytes <= MAX_PROMPT_BYTES,
  prompt_contains_full_diff_or_source: detectFullDiffOrSourcePrompt(prompt),
  source_inspection_mode: sourceInspectionMode,
  source_inspection_mode_allowed: ["read_tools_used", "curated_excerpts_with_hashes"].includes(sourceInspectionMode),
  summary_only_review_allowed: summaryOnlyProhibitedReasons.length === 0,
  summary_only_prohibited_reasons: summaryOnlyProhibitedReasons,
  review_schema_ref: reviewSchemaPath,
  review_schema_present: true,
  tools: READ_ONLY_TOOLS,
  forbidden_tools_present: false,
  active_untracked_implementation_files_omitted: activeUntrackedImplementationFilesOmitted,
};

const baseline = {
  schema_version: REVIEW_BASELINE_SCHEMA_VERSION,
  pack_id: packId,
  created_at: request.created_at,
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  source_plan_pack: planPack,
  manifest_ref: manifest ? `docs/closeout-packs/${packSlug(packId)}/manifest.json` : null,
  source_inspection_mode: sourceInspectionMode,
  summary_only_review_allowed: validationReport.summary_only_review_allowed,
  summary_only_prohibited_reasons: summaryOnlyProhibitedReasons,
  prompt_bytes: promptBytes,
  authority_boundary: authorityBoundary,
  validation_commands: validationCommandList(packId),
};

const packet = `# ${packId} Claude Review Packet

Schema: ${REVIEW_BASELINE_SCHEMA_VERSION}

This packet intentionally excludes full source and full diff content. The reviewer must inspect source through Read, Grep, and Glob only.

## Pack

- Risk: ${planPack.risk_class}
- Units: ${planPack.unit_count}
- Range: ${planPack.range?.description}

## Boundary

- Claude role: read-only independent reviewer
- Claude final approval: no
- Human/final approval and enterprise trust claim: closed outside this receipt
- Hermes runtime in Law Firm OS product: no

## Generated Files

- review-baseline.json
- review-packet.md
- review-request.json
- prompt.txt
- changed-file-scope.json
- validation-report.json
- review-schema.json
`;

await mkdir(outputRoot, { recursive: true });
await writeJson(path.join(outputRoot, "review-baseline.json"), baseline);
await writeFile(path.resolve(outputRoot, "review-packet.md"), packet);
await writeJson(path.join(outputRoot, "review-request.json"), request);
await writeFile(path.resolve(outputRoot, "prompt.txt"), prompt);
await writeJson(path.join(outputRoot, "changed-file-scope.json"), changedFileScope);
await writeJson(path.join(outputRoot, "validation-report.json"), validationReport);
await writeJson(reviewSchemaPath, getReviewSchema());

if (!validationReport.prompt_size_ok || validationReport.prompt_contains_full_diff_or_source) {
  console.error(`Generated ${packId} review baseline with validation warnings.`);
  process.exitCode = 1;
} else {
  console.log(`Generated ${packId} Claude review baseline.`);
  console.log(`output: ${outputRoot}`);
  console.log(`prompt_bytes: ${promptBytes}`);
}
