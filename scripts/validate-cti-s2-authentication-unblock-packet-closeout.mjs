#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";

const errors = [];

function err(message) {
  errors.push(message);
}

function assert(condition, message) {
  if (!condition) err(message);
}

function readText(path) {
  if (!existsSync(path)) {
    err(`Missing file: ${path}`);
    return "";
  }
  return readFileSync(path, "utf8");
}

function readJson(path) {
  const text = readText(path);
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (error) {
    err(`Invalid JSON: ${path}: ${error.message}`);
    return null;
  }
}

function includesAll(text, needles, label) {
  for (const needle of needles) assert(text.includes(needle), `${label} missing ${needle}`);
}

const goalId = "cti-s2-authentication-unblock-packet";
const closeoutDir = `docs/goal-closeout/${goalId}`;
const packetPath = "docs/launch/cti-s2-authentication-unblock-packet-2026-07-06.md";
const crosswalkJsonPath = "docs/launch/cti-s2-authentication-unblock-crosswalk-2026-07-06.json";
const crosswalkMdPath = "docs/launch/cti-s2-authentication-unblock-crosswalk-2026-07-06.md";
const approvalReceiptJsonPath = "docs/launch/cti-i7-owner-approval-receipt-2026-07-06.json";
const approvalReceiptMdPath = "docs/launch/cti-i7-owner-approval-receipt-2026-07-06.md";
const probeApprovalReceiptJsonPath = "docs/launch/cti-i8-owner-approval-receipt-2026-07-06.json";
const probeApprovalReceiptMdPath = "docs/launch/cti-i8-owner-approval-receipt-2026-07-06.md";
const executeApprovalReceiptJsonPath = "docs/launch/cti-i9-owner-approval-receipt-2026-07-06.json";
const executeApprovalReceiptMdPath = "docs/launch/cti-i9-owner-approval-receipt-2026-07-06.md";
const validatorPath = "scripts/validate-cti-s2-authentication-unblock-packet-closeout.mjs";
const requiredApprovalRef = "I7-CTI-S2-AUTHENTICATION-UNBLOCK-PACKET-OWNER-APPROVAL-2026-07-06";
const futureProbeApprovalRef = "I8-CTI-S2-S1G-AUTHENTICATED-PROBE-OWNER-APPROVAL-2026-07-06";
const executeApprovalRef = "I9-CTI-S2-AUTHENTICATION-EXECUTE-OWNER-APPROVAL-2026-07-06";

for (const file of [
  packetPath,
  crosswalkJsonPath,
  crosswalkMdPath,
  approvalReceiptJsonPath,
  approvalReceiptMdPath,
  probeApprovalReceiptJsonPath,
  probeApprovalReceiptMdPath,
  executeApprovalReceiptJsonPath,
  executeApprovalReceiptMdPath,
  `${closeoutDir}/packet.json`,
  `${closeoutDir}/command-evidence.json`,
  `${closeoutDir}/adjudication.md`,
  `${closeoutDir}/construction-inspection.json`,
  `${closeoutDir}/claude-review-result.json`,
  validatorPath,
]) {
  assert(existsSync(file), `Expected S2 unblock artifact is missing: ${file}`);
}

const packetText = readText(packetPath);
const adjudicationText = readText(`${closeoutDir}/adjudication.md`);
const crosswalkText = readText(crosswalkMdPath);
const closeoutPacket = readJson(`${closeoutDir}/packet.json`);
const commandEvidence = readJson(`${closeoutDir}/command-evidence.json`);
const construction = readJson(`${closeoutDir}/construction-inspection.json`);
const claudeReview = readJson(`${closeoutDir}/claude-review-result.json`);
const crosswalk = readJson(crosswalkJsonPath);
const approvalReceipt = readJson(approvalReceiptJsonPath);
const probeApprovalReceipt = readJson(probeApprovalReceiptJsonPath);
const executeApprovalReceipt = readJson(executeApprovalReceiptJsonPath);
const ledger = readJson("workbook/launch-tuw/launch-tuw-ledger.json");

includesAll(packetText, [
  "I7_OWNER_APPROVAL_RECORDED",
  requiredApprovalRef,
  approvalReceiptMdPath,
  "lawos-internal-password-provider-v1",
  "LAWOS_AUTH_CREDENTIAL_STORE_PATH=/mnt/lawos/auth/credential-store.json",
  "Node `crypto.scrypt`",
  "credential-store-backed internal password provider",
  "POST /api/auth/login",
  "`verifyToken`",
  "signed session payload + account registry + credential status/revision + role registry",
  "Production password generation and distribution remain cutover-bound",
  "desktop `v0.1.10`",
  "no debug endpoint, no secret fetch, no direct token minting",
  futureProbeApprovalRef,
  probeApprovalReceiptMdPath,
  executeApprovalRef,
  executeApprovalReceiptMdPath,
  "effective only after S2 AUTHENTICATION execute PASS",
  "separate bounded `cti-s2-authentication-execute` goal",
  "Rollback And Abort Criteria",
  "I7 승인합니다",
], "S2 unblock packet");

for (const phrase of [
  "auth provider choice",
  "login cut path",
  "verifyToken cut path",
  "session principal model",
  "password distribution boundary",
  "desktop dependency",
  "S1-G authenticated probe method",
  "rollback/abort criteria",
]) {
  assert(packetText.toLowerCase().includes(phrase.toLowerCase()), `Packet missing done criterion phrase: ${phrase}`);
}

assert(closeoutPacket?.goal_id === goalId, "closeout packet goal_id mismatch");
assert(closeoutPacket?.status === "i7_owner_approval_recorded", "closeout packet status mismatch");
assert(closeoutPacket?.required_approval_ref === requiredApprovalRef, "required approval ref mismatch");
assert(closeoutPacket?.approval_status === "approved", "approval status mismatch");
assert(closeoutPacket?.approval_signature_ref === requiredApprovalRef, "approval signature ref mismatch");
assert(closeoutPacket?.approval_receipt === approvalReceiptMdPath, "approval receipt mismatch");
assert(closeoutPacket?.s2_execute_approval?.approval_ref === executeApprovalRef, "I9 execute approval ref mismatch");
assert(closeoutPacket?.s2_execute_approval?.approval_status === "recorded", "I9 execute approval status mismatch");
assert(closeoutPacket?.s2_execute_approval?.approval_receipt === executeApprovalReceiptMdPath, "I9 execute approval receipt mismatch");
assert(closeoutPacket?.s2_execute_approval?.approved_goal === "cti-s2-authentication-execute", "I9 approved goal mismatch");
assert(closeoutPacket?.s2_execute_approval?.s2_implementation_executed_by_this_closeout === false, "I9 receipt must not make this closeout execute S2 implementation");
assert(closeoutPacket?.s2_execute_approval?.production_mutation_executed_by_this_closeout === false, "I9 receipt must not make this closeout mutate production");
assert(closeoutPacket?.closeout_verdict === "I7_OWNER_APPROVAL_RECORDED", "closeout verdict mismatch");
assert(closeoutPacket?.input_blocker === "BLOCKED_S1_G_AUTHENTICATED_PROBE_REQUIRES_S2_OR_APPROVED_PROBE_PRINCIPAL", "input blocker mismatch");
assert(closeoutPacket?.selected_choices?.auth_provider?.provider_id === "lawos-internal-password-provider-v1", "auth provider choice mismatch");
assert(closeoutPacket?.selected_choices?.auth_provider?.credential_store_path === "/mnt/lawos/auth/credential-store.json", "credential store path mismatch");
assert(closeoutPacket?.selected_choices?.auth_provider?.operational_synthetic_login_allowed === false, "operational synthetic login must be false");
assert(closeoutPacket?.selected_choices?.auth_provider?.local_dev_synthetic_login_allowed === true, "local-dev synthetic login should remain true");
assert(closeoutPacket?.selected_choices?.login_verify_cut_path?.synthetic_token_dependency_in_operational === false, "verify/login path must remove operational synthetic dependency");
assert(closeoutPacket?.selected_choices?.session_principal_model?.credential_rev_required === true, "credential_rev must be required");
assert(closeoutPacket?.selected_choices?.password_distribution_boundary?.plaintext_password_receipts_allowed === false, "plaintext password receipts must be false");
assert(closeoutPacket?.selected_choices?.desktop_dependency?.target_version === "v0.1.10", "desktop version mismatch");
assert(closeoutPacket?.selected_choices?.s1_g_authenticated_probe?.method === "real_session_only_no_debug_endpoint_no_secret_fetch_no_direct_token_mint", "S1-G probe method mismatch");
assert(closeoutPacket?.selected_choices?.s1_g_authenticated_probe?.requires_future_approval_ref === futureProbeApprovalRef, "future probe approval ref mismatch");
assert(closeoutPacket?.selected_choices?.s1_g_authenticated_probe?.conditional_approval_status === "recorded_effective_after_s2_execute_pass", "I8 conditional approval status mismatch");
assert(closeoutPacket?.selected_choices?.s1_g_authenticated_probe?.conditional_approval_receipt === probeApprovalReceiptMdPath, "I8 conditional approval receipt mismatch");
assert(closeoutPacket?.selected_choices?.s1_g_authenticated_probe?.executed_by_this_goal === false, "S1-G probe must not be executed by this goal");

for (const [key, value] of Object.entries(closeoutPacket?.done_criteria_coverage ?? {})) {
  assert(value === true, `done criteria coverage must be true: ${key}`);
}
for (const [key, value] of Object.entries(closeoutPacket?.authority_boundary ?? {})) {
  assert(value === false, `authority boundary must be false: ${key}`);
}

assert(construction?.final_verdict === "I7_OWNER_APPROVAL_RECORDED", "construction verdict mismatch");
assert(construction?.checks?.some((check) => check.id === "owner_approval_gate" && check.result === "PASS_I7_RECORDED"), "construction missing I7 recorded gate");
for (const [key, value] of Object.entries(construction?.authority_boundary ?? {})) {
  assert(value === false, `construction authority boundary must be false: ${key}`);
}

assert(claudeReview?.status === "not_run", "Claude review status should be not_run");
assert(claudeReview?.valid_review_evidence === false, "Claude review must not be valid evidence");

assert(crosswalk?.goal_id === goalId, "crosswalk goal_id mismatch");
assert(crosswalk?.launch_tuw_work_package === "LT-PRE-W12", "crosswalk TUW package mismatch");
assert(crosswalk?.required_approval_ref === requiredApprovalRef, "crosswalk required approval ref mismatch");
assert(crosswalk?.approval_status === "approved", "crosswalk approval status mismatch");
assert(crosswalk?.approval_signature_ref === requiredApprovalRef, "crosswalk approval signature ref mismatch");
assert(crosswalk?.approval_receipt === approvalReceiptMdPath, "crosswalk approval receipt mismatch");
assert(crosswalk?.mappings?.some((entry) => entry.cti_item === "S2-T01" && entry.status === "choice_owner_approved_by_i7"), "S2-T01 mapping missing");
assert(crosswalk?.mappings?.some((entry) => entry.cti_item === "S2-T02" && entry.status === "choice_owner_approved_by_i7"), "S2-T02 mapping missing");
assert(crosswalk?.mappings?.some((entry) => entry.cti_item === "S2-T04" && entry.status === "choice_owner_approved_by_i7"), "S2-T04 mapping missing");
assert(crosswalk?.mappings?.some((entry) => entry.cti_item === "S2-T06" && entry.status === "choice_owner_approved_by_i7"), "S2-T06 mapping missing");
assert(crosswalk?.mappings?.some((entry) => entry.cti_item === "S1-G authenticated probe" && entry.status === "conditional_probe_approval_recorded_i8_effective_after_s2_execute_pass"), "S1-G probe mapping missing");
assert(crosswalk?.conditional_probe_approval?.approval_ref === futureProbeApprovalRef, "crosswalk I8 approval ref mismatch");
assert(crosswalk?.conditional_probe_approval?.approval_status === "conditional_approval_recorded", "crosswalk I8 approval status mismatch");
assert(crosswalk?.conditional_probe_approval?.approval_receipt === probeApprovalReceiptMdPath, "crosswalk I8 approval receipt mismatch");
assert(crosswalk?.conditional_probe_approval?.s1_g_authenticated_probe_executed === false, "crosswalk must not record S1-G probe execution");
assert(crosswalk?.s2_execute_approval?.approval_ref === executeApprovalRef, "crosswalk I9 approval ref mismatch");
assert(crosswalk?.s2_execute_approval?.approval_status === "recorded", "crosswalk I9 approval status mismatch");
assert(crosswalk?.s2_execute_approval?.approval_receipt === executeApprovalReceiptMdPath, "crosswalk I9 approval receipt mismatch");
assert(crosswalk?.s2_execute_approval?.approved_goal === "cti-s2-authentication-execute", "crosswalk I9 approved goal mismatch");
assert(crosswalk?.s2_execute_approval?.s2_implementation_executed_by_this_closeout === false, "crosswalk must not record S2 implementation execution");
assert(crosswalk?.s2_execute_approval?.production_mutation_executed_by_this_closeout === false, "crosswalk must not record production mutation");
for (const [key, value] of Object.entries(crosswalk?.authority_boundary ?? {})) {
  assert(value === false, `crosswalk authority boundary must be false: ${key}`);
}
includesAll(crosswalkText, ["LT-PRE-W12", "i7_owner_approval_recorded", approvalReceiptMdPath, futureProbeApprovalRef, probeApprovalReceiptMdPath, executeApprovalRef, executeApprovalReceiptMdPath, "Non-Claims"], "crosswalk markdown");
includesAll(adjudicationText, [requiredApprovalRef, "I7_OWNER_APPROVAL_RECORDED", approvalReceiptMdPath, futureProbeApprovalRef, probeApprovalReceiptMdPath, executeApprovalRef, executeApprovalReceiptMdPath, "Not Run", "S2 implementation"], "adjudication");

assert(approvalReceipt?.status === "recorded", "approval receipt status mismatch");
assert(approvalReceipt?.approval_signature_ref === requiredApprovalRef, "approval receipt ref mismatch");
assert(approvalReceipt?.goal_id === goalId, "approval receipt goal mismatch");
assert(approvalReceipt?.production_mutation_executed === false, "approval receipt must not record production mutation");
assert(approvalReceipt?.credential_store_write_executed === false, "approval receipt must not record credential store write");
assert(approvalReceipt?.password_generation_issuance_distribution_executed === false, "approval receipt must not record password issuance");
assert(probeApprovalReceipt?.status === "conditional_approval_recorded", "I8 approval receipt status mismatch");
assert(probeApprovalReceipt?.approval_signature_ref === futureProbeApprovalRef, "I8 approval receipt ref mismatch");
assert(probeApprovalReceipt?.effective_conditions?.s2_authentication_execute_pass_required === true, "I8 must require S2 execute PASS");
assert(probeApprovalReceipt?.effective_conditions?.debug_endpoint_allowed === false, "I8 must reject debug endpoint");
assert(probeApprovalReceipt?.effective_conditions?.direct_token_mint_allowed === false, "I8 must reject direct token mint");
assert(probeApprovalReceipt?.effective_conditions?.secret_value_lookup_or_output_allowed === false, "I8 must reject secret value lookup/output");
assert(probeApprovalReceipt?.s1_g_authenticated_probe_executed === false, "I8 receipt must not execute probe");
assert(probeApprovalReceipt?.production_migration_executed === false, "I8 receipt must not execute migration");
assert(probeApprovalReceipt?.production_store_write_executed === false, "I8 receipt must not execute production store write");
assert(probeApprovalReceipt?.cutover_executed === false, "I8 receipt must not execute cutover");
assert(executeApprovalReceipt?.status === "recorded", "I9 approval receipt status mismatch");
assert(executeApprovalReceipt?.approval_signature_ref === executeApprovalRef, "I9 approval receipt ref mismatch");
assert(executeApprovalReceipt?.future_cti_binding?.includes("cti-s2-authentication-execute"), "I9 receipt missing execute goal binding");
for (const item of ["S2-T01", "S2-T02", "S2-T04", "S2-T06"]) {
  assert(executeApprovalReceipt?.future_cti_binding?.includes(item), `I9 receipt missing ${item}`);
}
assert(executeApprovalReceipt?.s2_implementation_executed_by_this_receipt === false, "I9 receipt must not execute S2 implementation");
assert(executeApprovalReceipt?.production_mutation_executed_by_this_receipt === false, "I9 receipt must not execute production mutation");
assert(executeApprovalReceipt?.production_credential_store_write_executed === false, "I9 receipt must not execute credential store write");
assert(executeApprovalReceipt?.password_generation_issuance_distribution_executed === false, "I9 receipt must not execute password issuance");
assert(executeApprovalReceipt?.s1_g_authenticated_probe_executed === false, "I9 receipt must not execute S1-G probe");
assert(executeApprovalReceipt?.s3_tenant_migration_executed === false, "I9 receipt must not execute S3 migration");
assert(executeApprovalReceipt?.s4_production_account_permission_injection_executed === false, "I9 receipt must not execute S4 injection");
assert(executeApprovalReceipt?.cutover_executed === false, "I9 receipt must not execute cutover");

const commandText = JSON.stringify(commandEvidence ?? {});
includesAll(commandText, [
  "S1 execute packet",
  "session-auth.js",
  "desktop aws-runtime/auth",
  "S2 implementation or code deployment",
  "production credential store write",
  "password generation, issuance, or distribution",
  "S1-G authenticated production probe",
  futureProbeApprovalRef,
  executeApprovalRef,
], "command evidence");
assert((commandEvidence?.commands_run ?? []).every((entry) => entry.exit_code === 0), "all commands_run entries must have exit_code 0");

const wp = ledger?.work_packages?.find((item) => item.wp_id === "LT-PRE-W12");
assert(wp?.goal_id === goalId, "LT-PRE-W12 work package missing or goal_id mismatch");
assert(wp?.terminal_tuw === "LT-PRE-W12-T06", "LT-PRE-W12 terminal TUW mismatch");
const tuws = ledger?.tuws?.filter((item) => String(item.id).startsWith("LT-PRE-W12-")) ?? [];
assert(tuws.length === 6, `Expected 6 LT-PRE-W12 TUWs, got ${tuws.length}`);
assert(tuws.some((item) => item.id === "LT-PRE-W12-T06" && item.terminal === true), "LT-PRE-W12 terminal TUW missing");
assert(tuws.every((item) => item.gate_binding?.includes("PRE-EXIT")), "all LT-PRE-W12 TUWs must bind PRE-EXIT");

if (errors.length > 0) {
  console.error(`CTI S2 authentication unblock packet validation failed with ${errors.length} error(s):`);
  for (const item of errors) console.error(`  - ${item}`);
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      status: "PASS",
      goal_id: goalId,
      closeout_verdict: "I7_OWNER_APPROVAL_RECORDED",
      required_approval_ref: requiredApprovalRef,
      approval_status: "approved",
      s2_implementation_executed: false,
      production_mutation_executed: false,
      password_issuance_executed: false,
      s1_g_probe_executed: false,
    },
    null,
    2,
  ),
);
