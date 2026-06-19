import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, readFileSync } from "node:fs";

import {
  TIME_EXPENSE_CORE_CP342_NO_WRITE_ATTESTATION,
  TIME_EXPENSE_CORE_CP342_PACK_BINDING,
  TIME_EXPENSE_CORE_CP342_REQUIREMENTS,
  TIME_EXPENSE_CORE_CP343_NO_WRITE_ATTESTATION,
  TIME_EXPENSE_CORE_CP343_PACK_BINDING,
  TIME_EXPENSE_CORE_CP343_REQUIREMENTS,
  TIME_EXPENSE_CORE_CP344_NO_WRITE_ATTESTATION,
  TIME_EXPENSE_CORE_CP344_PACK_BINDING,
  TIME_EXPENSE_CORE_CP344_REQUIREMENTS,
  TIME_EXPENSE_CORE_CP345_NO_WRITE_ATTESTATION,
  TIME_EXPENSE_CORE_CP345_PACK_BINDING,
  TIME_EXPENSE_CORE_CP345_REQUIREMENTS,
  TIME_EXPENSE_CORE_CP346_NO_WRITE_ATTESTATION,
  TIME_EXPENSE_CORE_CP346_PACK_BINDING,
  TIME_EXPENSE_CORE_CP346_REQUIREMENTS,
  TIME_EXPENSE_CORE_CP347_NO_WRITE_ATTESTATION,
  TIME_EXPENSE_CORE_CP347_PACK_BINDING,
  TIME_EXPENSE_CORE_CP347_REQUIREMENTS,
  TIME_EXPENSE_CORE_CP348_NO_WRITE_ATTESTATION,
  TIME_EXPENSE_CORE_CP348_PACK_BINDING,
  TIME_EXPENSE_CORE_CP348_REQUIREMENTS,
  TIME_EXPENSE_CORE_CP349_NO_WRITE_ATTESTATION,
  TIME_EXPENSE_CORE_CP349_PACK_BINDING,
  TIME_EXPENSE_CORE_CP349_REQUIREMENTS,
  TIME_EXPENSE_CORE_CP350_NO_WRITE_ATTESTATION,
  TIME_EXPENSE_CORE_CP350_PACK_BINDING,
  TIME_EXPENSE_CORE_CP350_REQUIREMENTS,
  TIME_EXPENSE_CORE_CP351_NO_WRITE_ATTESTATION,
  TIME_EXPENSE_CORE_CP351_PACK_BINDING,
  TIME_EXPENSE_CORE_CP351_REQUIREMENTS,
  TIME_EXPENSE_CORE_CP352_NO_WRITE_ATTESTATION,
  TIME_EXPENSE_CORE_CP352_PACK_BINDING,
  TIME_EXPENSE_CORE_CP352_REQUIREMENTS,
  TIME_EXPENSE_CORE_CP353_NO_WRITE_ATTESTATION,
  TIME_EXPENSE_CORE_CP353_PACK_BINDING,
  TIME_EXPENSE_CORE_CP353_REQUIREMENTS,
  TIME_EXPENSE_CORE_CP354_NO_WRITE_ATTESTATION,
  TIME_EXPENSE_CORE_CP354_PACK_BINDING,
  TIME_EXPENSE_CORE_CP354_REQUIREMENTS,
  TIME_EXPENSE_CORE_CP355_NO_WRITE_ATTESTATION,
  TIME_EXPENSE_CORE_CP355_PACK_BINDING,
  TIME_EXPENSE_CORE_CP355_REQUIREMENTS,
  TIME_EXPENSE_CORE_CP356_NO_WRITE_ATTESTATION,
  TIME_EXPENSE_CORE_CP356_PACK_BINDING,
  TIME_EXPENSE_CORE_CP356_REQUIREMENTS,
  TIME_EXPENSE_CORE_CP357_NO_WRITE_ATTESTATION,
  TIME_EXPENSE_CORE_CP357_PACK_BINDING,
  TIME_EXPENSE_CORE_CP357_REQUIREMENTS,
  TIME_EXPENSE_CORE_CP358_NO_WRITE_ATTESTATION,
  TIME_EXPENSE_CORE_CP358_PACK_BINDING,
  TIME_EXPENSE_CORE_CP358_REQUIREMENTS,
  TIME_EXPENSE_CORE_CP359_NO_WRITE_ATTESTATION,
  TIME_EXPENSE_CORE_CP359_PACK_BINDING,
  TIME_EXPENSE_CORE_CP359_REQUIREMENTS,
  TIME_EXPENSE_CORE_CP360_NO_WRITE_ATTESTATION,
  TIME_EXPENSE_CORE_CP360_PACK_BINDING,
  TIME_EXPENSE_CORE_CP360_REQUIREMENTS,
  TIME_EXPENSE_CORE_CP361_NO_WRITE_ATTESTATION,
  TIME_EXPENSE_CORE_CP361_PACK_BINDING,
  TIME_EXPENSE_CORE_CP361_REQUIREMENTS,
  TIME_EXPENSE_CORE_CP362_NO_WRITE_ATTESTATION,
  TIME_EXPENSE_CORE_CP362_PACK_BINDING,
  TIME_EXPENSE_CORE_CP362_REQUIREMENTS,
  TIME_EXPENSE_CORE_CP363_NO_WRITE_ATTESTATION,
  TIME_EXPENSE_CORE_CP363_PACK_BINDING,
  TIME_EXPENSE_CORE_CP363_REQUIREMENTS,
  TIME_EXPENSE_CORE_PROGRAM_CONTRACT,
  createTimeExpenseCoreCp342ClaudeReviewPacket,
  createTimeExpenseCoreCp342CloseoutHandoff,
  createTimeExpenseCoreCp342HermesEvidencePacket,
  createTimeExpenseCoreCp342ScopeContractFoundationCaseSet,
  createTimeExpenseCoreCp342ScopeContractFoundationDescriptor,
  createTimeExpenseCoreCp343ClaudeReviewPacket,
  createTimeExpenseCoreCp343CloseoutHandoff,
  createTimeExpenseCoreCp343HermesEvidencePacket,
  createTimeExpenseCoreCp343P01CloseoutP02ServiceFoundationCaseSet,
  createTimeExpenseCoreCp343P01CloseoutP02ServiceFoundationDescriptor,
  createTimeExpenseCoreCp344ClaudeReviewPacket,
  createTimeExpenseCoreCp344CloseoutHandoff,
  createTimeExpenseCoreCp344HermesEvidencePacket,
  createTimeExpenseCoreCp344ServiceSliceCaseSet,
  createTimeExpenseCoreCp344ServiceSliceDescriptor,
  createTimeExpenseCoreCp345ClaudeReviewPacket,
  createTimeExpenseCoreCp345CloseoutHandoff,
  createTimeExpenseCoreCp345HermesEvidencePacket,
  createTimeExpenseCoreCp345ServiceBindingSliceCaseSet,
  createTimeExpenseCoreCp345ServiceBindingSliceDescriptor,
  createTimeExpenseCoreCp346ClaudeReviewPacket,
  createTimeExpenseCoreCp346CloseoutHandoff,
  createTimeExpenseCoreCp346HermesEvidencePacket,
  createTimeExpenseCoreCp346P02CloseoutP03InterfaceP04UiFoundationCaseSet,
  createTimeExpenseCoreCp346P02CloseoutP03InterfaceP04UiFoundationDescriptor,
  createTimeExpenseCoreCp347ClaudeReviewPacket,
  createTimeExpenseCoreCp347CloseoutHandoff,
  createTimeExpenseCoreCp347HermesEvidencePacket,
  createTimeExpenseCoreCp347UiWorkflowSliceCaseSet,
  createTimeExpenseCoreCp347UiWorkflowSliceDescriptor,
  createTimeExpenseCoreCp348ClaudeReviewPacket,
  createTimeExpenseCoreCp348CloseoutHandoff,
  createTimeExpenseCoreCp348HermesEvidencePacket,
  createTimeExpenseCoreCp348UiBindingSliceCaseSet,
  createTimeExpenseCoreCp348UiBindingSliceDescriptor,
  createTimeExpenseCoreCp349ClaudeReviewPacket,
  createTimeExpenseCoreCp349CloseoutHandoff,
  createTimeExpenseCoreCp349HermesEvidencePacket,
  createTimeExpenseCoreCp349UiBindingTailCaseSet,
  createTimeExpenseCoreCp349UiBindingTailDescriptor,
  createTimeExpenseCoreCp350ClaudeReviewPacket,
  createTimeExpenseCoreCp350CloseoutHandoff,
  createTimeExpenseCoreCp350HermesEvidencePacket,
  createTimeExpenseCoreCp350P04CloseoutP05FixtureFoundationCaseSet,
  createTimeExpenseCoreCp350P04CloseoutP05FixtureFoundationDescriptor,
  createTimeExpenseCoreCp351ClaudeReviewPacket,
  createTimeExpenseCoreCp351CloseoutHandoff,
  createTimeExpenseCoreCp351FixtureSliceCaseSet,
  createTimeExpenseCoreCp351FixtureSliceDescriptor,
  createTimeExpenseCoreCp351HermesEvidencePacket,
  createTimeExpenseCoreCp352ClaudeReviewPacket,
  createTimeExpenseCoreCp352CloseoutHandoff,
  createTimeExpenseCoreCp352FixtureBindingSliceCaseSet,
  createTimeExpenseCoreCp352FixtureBindingSliceDescriptor,
  createTimeExpenseCoreCp352HermesEvidencePacket,
  createTimeExpenseCoreCp353ClaudeReviewPacket,
  createTimeExpenseCoreCp353CloseoutHandoff,
  createTimeExpenseCoreCp353HermesEvidencePacket,
  createTimeExpenseCoreCp353P05CloseoutP06PermissionFoundationCaseSet,
  createTimeExpenseCoreCp353P05CloseoutP06PermissionFoundationDescriptor,
  createTimeExpenseCoreCp354ClaudeReviewPacket,
  createTimeExpenseCoreCp354CloseoutHandoff,
  createTimeExpenseCoreCp354HermesEvidencePacket,
  createTimeExpenseCoreCp354PermissionSliceCaseSet,
  createTimeExpenseCoreCp354PermissionSliceDescriptor,
  createTimeExpenseCoreCp355ClaudeReviewPacket,
  createTimeExpenseCoreCp355CloseoutHandoff,
  createTimeExpenseCoreCp355HermesEvidencePacket,
  createTimeExpenseCoreCp355P06CloseoutP07FailureFoundationCaseSet,
  createTimeExpenseCoreCp355P06CloseoutP07FailureFoundationDescriptor,
  createTimeExpenseCoreCp356ClaudeReviewPacket,
  createTimeExpenseCoreCp356CloseoutHandoff,
  createTimeExpenseCoreCp356FailureSliceCaseSet,
  createTimeExpenseCoreCp356FailureSliceDescriptor,
  createTimeExpenseCoreCp356HermesEvidencePacket,
  createTimeExpenseCoreCp357ClaudeReviewPacket,
  createTimeExpenseCoreCp357CloseoutHandoff,
  createTimeExpenseCoreCp357FailureBindingSliceCaseSet,
  createTimeExpenseCoreCp357FailureBindingSliceDescriptor,
  createTimeExpenseCoreCp357HermesEvidencePacket,
  createTimeExpenseCoreCp358ClaudeReviewPacket,
  createTimeExpenseCoreCp358CloseoutHandoff,
  createTimeExpenseCoreCp358FailureTailSliceCaseSet,
  createTimeExpenseCoreCp358FailureTailSliceDescriptor,
  createTimeExpenseCoreCp358HermesEvidencePacket,
  createTimeExpenseCoreCp359ClaudeReviewPacket,
  createTimeExpenseCoreCp359CloseoutHandoff,
  createTimeExpenseCoreCp359FailureFixtureSliceCaseSet,
  createTimeExpenseCoreCp359FailureFixtureSliceDescriptor,
  createTimeExpenseCoreCp359HermesEvidencePacket,
  createTimeExpenseCoreCp360ClaudeReviewPacket,
  createTimeExpenseCoreCp360CloseoutHandoff,
  createTimeExpenseCoreCp360FailureHermesSliceCaseSet,
  createTimeExpenseCoreCp360FailureHermesSliceDescriptor,
  createTimeExpenseCoreCp360HermesEvidencePacket,
  createTimeExpenseCoreCp361ClaudeReviewPacket,
  createTimeExpenseCoreCp361CloseoutHandoff,
  createTimeExpenseCoreCp361HermesEvidencePacket,
  createTimeExpenseCoreCp361P07CloseoutP08HermesFoundationCaseSet,
  createTimeExpenseCoreCp361P07CloseoutP08HermesFoundationDescriptor,
  createTimeExpenseCoreCp362ClaudeReviewPacket,
  createTimeExpenseCoreCp362CloseoutHandoff,
  createTimeExpenseCoreCp362HermesEvidencePacket,
  createTimeExpenseCoreCp362P08CloseoutP09ReviewFoundationCaseSet,
  createTimeExpenseCoreCp362P08CloseoutP09ReviewFoundationDescriptor,
  createTimeExpenseCoreCp363ClaudeReviewPacket,
  createTimeExpenseCoreCp363CloseoutHandoff,
  createTimeExpenseCoreCp363HermesEvidencePacket,
  createTimeExpenseCoreCp363ReviewCloseoutSliceCaseSet,
  createTimeExpenseCoreCp363ReviewCloseoutSliceDescriptor,
  timeExpenseCoreRowKey,
  validateTimeExpenseCoreCp342Coverage,
  validateTimeExpenseCoreCp342ScopeContractFoundationDescriptor,
  validateTimeExpenseCoreCp343Coverage,
  validateTimeExpenseCoreCp343P01CloseoutP02ServiceFoundationDescriptor,
  validateTimeExpenseCoreCp344Coverage,
  validateTimeExpenseCoreCp344ServiceSliceDescriptor,
  validateTimeExpenseCoreCp345Coverage,
  validateTimeExpenseCoreCp345ServiceBindingSliceDescriptor,
  validateTimeExpenseCoreCp346Coverage,
  validateTimeExpenseCoreCp346P02CloseoutP03InterfaceP04UiFoundationDescriptor,
  validateTimeExpenseCoreCp347Coverage,
  validateTimeExpenseCoreCp347UiWorkflowSliceDescriptor,
  validateTimeExpenseCoreCp348Coverage,
  validateTimeExpenseCoreCp348UiBindingSliceDescriptor,
  validateTimeExpenseCoreCp349Coverage,
  validateTimeExpenseCoreCp349UiBindingTailDescriptor,
  validateTimeExpenseCoreCp350Coverage,
  validateTimeExpenseCoreCp350P04CloseoutP05FixtureFoundationDescriptor,
  validateTimeExpenseCoreCp351Coverage,
  validateTimeExpenseCoreCp351FixtureSliceDescriptor,
  validateTimeExpenseCoreCp352Coverage,
  validateTimeExpenseCoreCp352FixtureBindingSliceDescriptor,
  validateTimeExpenseCoreCp353Coverage,
  validateTimeExpenseCoreCp353P05CloseoutP06PermissionFoundationDescriptor,
  validateTimeExpenseCoreCp354Coverage,
  validateTimeExpenseCoreCp354PermissionSliceDescriptor,
  validateTimeExpenseCoreCp355Coverage,
  validateTimeExpenseCoreCp355P06CloseoutP07FailureFoundationDescriptor,
  validateTimeExpenseCoreCp356Coverage,
  validateTimeExpenseCoreCp356FailureSliceDescriptor,
  validateTimeExpenseCoreCp357Coverage,
  validateTimeExpenseCoreCp357FailureBindingSliceDescriptor,
  validateTimeExpenseCoreCp358Coverage,
  validateTimeExpenseCoreCp358FailureTailSliceDescriptor,
  validateTimeExpenseCoreCp359Coverage,
  validateTimeExpenseCoreCp359FailureFixtureSliceDescriptor,
  validateTimeExpenseCoreCp360Coverage,
  validateTimeExpenseCoreCp360FailureHermesSliceDescriptor,
  validateTimeExpenseCoreCp361Coverage,
  validateTimeExpenseCoreCp361P07CloseoutP08HermesFoundationDescriptor,
  validateTimeExpenseCoreCp362Coverage,
  validateTimeExpenseCoreCp362P08CloseoutP09ReviewFoundationDescriptor,
  validateTimeExpenseCoreCp363Coverage,
  validateTimeExpenseCoreCp363ReviewCloseoutSliceDescriptor,
} from "../src/index.js";

const timeExpenseContract = JSON.parse(
  readFileSync(new URL("../../../contracts/time-expense-core-contract.json", import.meta.url), "utf8"),
);
const closeoutPlan = JSON.parse(
  readFileSync(new URL("../../../docs/closeout-pack-plan/closeout-pack-plan.json", import.meta.url), "utf8"),
);
const cp342ManifestPath = new URL("../../../docs/closeout-packs/cp00-342/manifest.json", import.meta.url);
const cp342Manifest = existsSync(cp342ManifestPath) ? JSON.parse(readFileSync(cp342ManifestPath, "utf8")) : null;
const cp342PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-342") ?? cp342Manifest?.plan_binding_snapshot;
const cp343ManifestPath = new URL("../../../docs/closeout-packs/cp00-343/manifest.json", import.meta.url);
const cp343Manifest = existsSync(cp343ManifestPath) ? JSON.parse(readFileSync(cp343ManifestPath, "utf8")) : null;
const cp343PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-343") ?? cp343Manifest?.plan_binding_snapshot;
const cp344ManifestPath = new URL("../../../docs/closeout-packs/cp00-344/manifest.json", import.meta.url);
const cp344Manifest = existsSync(cp344ManifestPath) ? JSON.parse(readFileSync(cp344ManifestPath, "utf8")) : null;
const cp344PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-344") ?? cp344Manifest?.plan_binding_snapshot;
const cp345ManifestPath = new URL("../../../docs/closeout-packs/cp00-345/manifest.json", import.meta.url);
const cp345Manifest = existsSync(cp345ManifestPath) ? JSON.parse(readFileSync(cp345ManifestPath, "utf8")) : null;
const cp345PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-345") ?? cp345Manifest?.plan_binding_snapshot;
const cp346ManifestPath = new URL("../../../docs/closeout-packs/cp00-346/manifest.json", import.meta.url);
const cp346Manifest = existsSync(cp346ManifestPath) ? JSON.parse(readFileSync(cp346ManifestPath, "utf8")) : null;
const cp346PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-346") ?? cp346Manifest?.plan_binding_snapshot;
const cp347ManifestPath = new URL("../../../docs/closeout-packs/cp00-347/manifest.json", import.meta.url);
const cp347Manifest = existsSync(cp347ManifestPath) ? JSON.parse(readFileSync(cp347ManifestPath, "utf8")) : null;
const cp347PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-347") ?? cp347Manifest?.plan_binding_snapshot;
const cp348ManifestPath = new URL("../../../docs/closeout-packs/cp00-348/manifest.json", import.meta.url);
const cp348Manifest = existsSync(cp348ManifestPath) ? JSON.parse(readFileSync(cp348ManifestPath, "utf8")) : null;
const cp348PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-348") ?? cp348Manifest?.plan_binding_snapshot;
const cp349ManifestPath = new URL("../../../docs/closeout-packs/cp00-349/manifest.json", import.meta.url);
const cp349Manifest = existsSync(cp349ManifestPath) ? JSON.parse(readFileSync(cp349ManifestPath, "utf8")) : null;
const cp349PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-349") ?? cp349Manifest?.plan_binding_snapshot;
const cp350ManifestPath = new URL("../../../docs/closeout-packs/cp00-350/manifest.json", import.meta.url);
const cp350Manifest = existsSync(cp350ManifestPath) ? JSON.parse(readFileSync(cp350ManifestPath, "utf8")) : null;
const cp350PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-350") ?? cp350Manifest?.plan_binding_snapshot;
const cp351ManifestPath = new URL("../../../docs/closeout-packs/cp00-351/manifest.json", import.meta.url);
const cp351Manifest = existsSync(cp351ManifestPath) ? JSON.parse(readFileSync(cp351ManifestPath, "utf8")) : null;
const cp351PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-351") ?? cp351Manifest?.plan_binding_snapshot;
const cp352ManifestPath = new URL("../../../docs/closeout-packs/cp00-352/manifest.json", import.meta.url);
const cp352Manifest = existsSync(cp352ManifestPath) ? JSON.parse(readFileSync(cp352ManifestPath, "utf8")) : null;
const cp352PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-352") ?? cp352Manifest?.plan_binding_snapshot;
const cp353ManifestPath = new URL("../../../docs/closeout-packs/cp00-353/manifest.json", import.meta.url);
const cp353Manifest = existsSync(cp353ManifestPath) ? JSON.parse(readFileSync(cp353ManifestPath, "utf8")) : null;
const cp353PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-353") ?? cp353Manifest?.plan_binding_snapshot;
const cp354ManifestPath = new URL("../../../docs/closeout-packs/cp00-354/manifest.json", import.meta.url);
const cp354Manifest = existsSync(cp354ManifestPath) ? JSON.parse(readFileSync(cp354ManifestPath, "utf8")) : null;
const cp354PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-354") ?? cp354Manifest?.plan_binding_snapshot;
const cp355ManifestPath = new URL("../../../docs/closeout-packs/cp00-355/manifest.json", import.meta.url);
const cp355Manifest = existsSync(cp355ManifestPath) ? JSON.parse(readFileSync(cp355ManifestPath, "utf8")) : null;
const cp355PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-355") ?? cp355Manifest?.plan_binding_snapshot;
const cp356ManifestPath = new URL("../../../docs/closeout-packs/cp00-356/manifest.json", import.meta.url);
const cp356Manifest = existsSync(cp356ManifestPath) ? JSON.parse(readFileSync(cp356ManifestPath, "utf8")) : null;
const cp356PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-356") ?? cp356Manifest?.plan_binding_snapshot;
const cp357ManifestPath = new URL("../../../docs/closeout-packs/cp00-357/manifest.json", import.meta.url);
const cp357Manifest = existsSync(cp357ManifestPath) ? JSON.parse(readFileSync(cp357ManifestPath, "utf8")) : null;
const cp357PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-357") ?? cp357Manifest?.plan_binding_snapshot;
const cp358ManifestPath = new URL("../../../docs/closeout-packs/cp00-358/manifest.json", import.meta.url);
const cp358Manifest = existsSync(cp358ManifestPath) ? JSON.parse(readFileSync(cp358ManifestPath, "utf8")) : null;
const cp358PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-358") ?? cp358Manifest?.plan_binding_snapshot;
const cp359ManifestPath = new URL("../../../docs/closeout-packs/cp00-359/manifest.json", import.meta.url);
const cp359Manifest = existsSync(cp359ManifestPath) ? JSON.parse(readFileSync(cp359ManifestPath, "utf8")) : null;
const cp359PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-359") ?? cp359Manifest?.plan_binding_snapshot;
const cp360ManifestPath = new URL("../../../docs/closeout-packs/cp00-360/manifest.json", import.meta.url);
const cp360Manifest = existsSync(cp360ManifestPath) ? JSON.parse(readFileSync(cp360ManifestPath, "utf8")) : null;
const cp360PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-360") ?? cp360Manifest?.plan_binding_snapshot;
const cp361ManifestPath = new URL("../../../docs/closeout-packs/cp00-361/manifest.json", import.meta.url);
const cp361Manifest = existsSync(cp361ManifestPath) ? JSON.parse(readFileSync(cp361ManifestPath, "utf8")) : null;
const cp361PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-361") ?? cp361Manifest?.plan_binding_snapshot;
const cp362ManifestPath = new URL("../../../docs/closeout-packs/cp00-362/manifest.json", import.meta.url);
const cp362Manifest = existsSync(cp362ManifestPath) ? JSON.parse(readFileSync(cp362ManifestPath, "utf8")) : null;
const cp362PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-362") ?? cp362Manifest?.plan_binding_snapshot;
const cp363ManifestPath = new URL("../../../docs/closeout-packs/cp00-363/manifest.json", import.meta.url);
const cp363Manifest = existsSync(cp363ManifestPath) ? JSON.parse(readFileSync(cp363ManifestPath, "utf8")) : null;
const cp363PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-363") ?? cp363Manifest?.plan_binding_snapshot;

test("RP11 program contract pins the TimeExpense descriptor-only bootstrap", () => {
  assert.equal(TIME_EXPENSE_CORE_PROGRAM_CONTRACT.program_id, "RP11");
  assert.equal(TIME_EXPENSE_CORE_PROGRAM_CONTRACT.program_title, "Time Expense Disbursement");
  assert.equal(TIME_EXPENSE_CORE_PROGRAM_CONTRACT.upstream_program_id, "RP10");
  assert.equal(TIME_EXPENSE_CORE_PROGRAM_CONTRACT.hermes_gate, "H11");
  assert.equal(TIME_EXPENSE_CORE_PROGRAM_CONTRACT.claude_gate, "C11");
  assert.equal(TIME_EXPENSE_CORE_PROGRAM_CONTRACT.descriptor_only, true);
  assert.ok(["CP00-342", "CP00-343", "CP00-344", "CP00-345", "CP00-346", "CP00-347", "CP00-348", "CP00-349", "CP00-350", "CP00-351", "CP00-352", "CP00-353", "CP00-354", "CP00-355", "CP00-356", "CP00-357", "CP00-358", "CP00-359", "CP00-360", "CP00-361", "CP00-362", "CP00-363"].includes(timeExpenseContract.current_pack.pack_id));
  assert.equal(timeExpenseContract.program.program_id, "RP11");
});

test("CP00-342 plan binding covers the planned 150 RP11 scope and model foundation units", () => {
  const coverage = validateTimeExpenseCoreCp342Coverage(cp342PlanPack);

  assert.equal(TIME_EXPENSE_CORE_CP342_PACK_BINDING.pack_id, "CP00-342");
  assert.equal(TIME_EXPENSE_CORE_CP342_PACK_BINDING.risk_class, "C");
  assert.equal(TIME_EXPENSE_CORE_CP342_PACK_BINDING.unit_count, 150);
  assert.equal(TIME_EXPENSE_CORE_CP342_PACK_BINDING.range, "RP11.P00.M00.S01-RP11.P01.M08.S05");
  assert.equal(TIME_EXPENSE_CORE_CP342_PACK_BINDING.upstream_pack_id, "CP00-341");
  assert.equal(TIME_EXPENSE_CORE_CP342_PACK_BINDING.next_pack_id, "CP00-343");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_phase["RP11.P00"], 52);
  assert.equal(coverage.summary.by_phase["RP11.P01"], 98);
  assert.equal(Object.keys(TIME_EXPENSE_CORE_CP342_REQUIREMENTS.required_section_rows).length, 20);
});

test("CP00-342 scope contract foundation rows stay descriptor-only", () => {
  const caseSet = createTimeExpenseCoreCp342ScopeContractFoundationCaseSet();
  const descriptor = createTimeExpenseCoreCp342ScopeContractFoundationDescriptor();
  const validation = validateTimeExpenseCoreCp342ScopeContractFoundationDescriptor(descriptor, timeExpenseContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 20);
  for (const [microId, titles] of Object.entries(TIME_EXPENSE_CORE_CP342_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[timeExpenseCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m03 = caseSet.sections["RP11.P00.M03"].rows;
  assert.equal(m03.non_goal_boundary.time_entry_runtime_opened, false);
  assert.equal(m03.permission_baseline_note.cross_tenant_access_allowed, false);
  assert.equal(m03.synthetic_data_policy.real_client_data_loaded, false);
  const p01m03 = caseSet.sections["RP11.P01.M03"].rows;
  assert.equal(p01m03.state_transition_map.writes_state_transition, false);
  assert.equal(p01m03.claude_model_review_prompt.claude_final_approval_claimed, false);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-342 evidence packets and handoff preserve time-expense bootstrap authority boundaries", () => {
  const descriptor = createTimeExpenseCoreCp342ScopeContractFoundationDescriptor();
  const hermes = createTimeExpenseCoreCp342HermesEvidencePacket(cp342PlanPack, timeExpenseContract, descriptor);
  const claude = createTimeExpenseCoreCp342ClaudeReviewPacket(cp342PlanPack);
  const handoff = createTimeExpenseCoreCp342CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.gate, "H11");
  assert.equal(claude.gate, "C11");
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-342-to-CP00-343");
  assert.equal(handoff.next_subphase_id, "RP11.P01.M08.S06");
  assert.equal(handoff.production_ready_flag, "time_expense_core_scope_contract_foundation_descriptor_verified");
  assert.equal(TIME_EXPENSE_CORE_CP342_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(TIME_EXPENSE_CORE_CP342_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
});

test("CP00-343 plan binding covers the planned 150 RP11 P01 closeout and P02 service foundation units", () => {
  const coverage = validateTimeExpenseCoreCp343Coverage(cp343PlanPack);

  assert.equal(TIME_EXPENSE_CORE_CP343_PACK_BINDING.pack_id, "CP00-343");
  assert.equal(TIME_EXPENSE_CORE_CP343_PACK_BINDING.risk_class, "C");
  assert.equal(TIME_EXPENSE_CORE_CP343_PACK_BINDING.unit_count, 150);
  assert.equal(TIME_EXPENSE_CORE_CP343_PACK_BINDING.range, "RP11.P01.M08.S06-RP11.P02.M07.S10");
  assert.equal(TIME_EXPENSE_CORE_CP343_PACK_BINDING.upstream_pack_id, "CP00-342");
  assert.equal(TIME_EXPENSE_CORE_CP343_PACK_BINDING.next_pack_id, "CP00-344");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_phase["RP11.P01"], 14);
  assert.equal(coverage.summary.by_phase["RP11.P02"], 136);
  assert.equal(Object.keys(TIME_EXPENSE_CORE_CP343_REQUIREMENTS.required_section_rows).length, 11);
});

test("CP00-343 P01 closeout and P02 service foundation rows stay descriptor-only", () => {
  const caseSet = createTimeExpenseCoreCp343P01CloseoutP02ServiceFoundationCaseSet();
  const descriptor = createTimeExpenseCoreCp343P01CloseoutP02ServiceFoundationDescriptor();
  const validation = validateTimeExpenseCoreCp343P01CloseoutP02ServiceFoundationDescriptor(descriptor, timeExpenseContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 11);
  for (const [microId, titles] of Object.entries(TIME_EXPENSE_CORE_CP343_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[timeExpenseCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m05 = caseSet.sections["RP11.P02.M05"].rows;
  assert.equal(m05.tenant_boundary_precheck.cross_tenant_access_allowed, false);
  assert.equal(m05.permission_precheck.permission_decision_detail_included, false);
  assert.equal(m05.lock_acquisition_rule.acquires_runtime_lock, false);
  assert.equal(m05.rollback_behavior.performs_rollback_runtime, false);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-343 evidence packets and handoff route the P01 closeout to the P02 service phase", () => {
  const descriptor = createTimeExpenseCoreCp343P01CloseoutP02ServiceFoundationDescriptor();
  const hermes = createTimeExpenseCoreCp343HermesEvidencePacket(cp343PlanPack, timeExpenseContract, descriptor);
  const claude = createTimeExpenseCoreCp343ClaudeReviewPacket(cp343PlanPack);
  const handoff = createTimeExpenseCoreCp343CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-343-to-CP00-344");
  assert.equal(handoff.next_subphase_id, "RP11.P02.M07.S11");
  assert.equal(handoff.production_ready_flag, "time_expense_core_p01_closeout_p02_service_foundation_descriptor_verified");
});

test("CP00-344 plan binding covers the planned 10 RP11 service slice units", () => {
  const coverage = validateTimeExpenseCoreCp344Coverage(cp344PlanPack);

  assert.equal(TIME_EXPENSE_CORE_CP344_PACK_BINDING.pack_id, "CP00-344");
  assert.equal(TIME_EXPENSE_CORE_CP344_PACK_BINDING.risk_class, "A");
  assert.equal(TIME_EXPENSE_CORE_CP344_PACK_BINDING.unit_count, 10);
  assert.equal(TIME_EXPENSE_CORE_CP344_PACK_BINDING.range, "RP11.P02.M07.S11-RP11.P02.M07.S20");
  assert.equal(TIME_EXPENSE_CORE_CP344_PACK_BINDING.upstream_pack_id, "CP00-343");
  assert.equal(TIME_EXPENSE_CORE_CP344_PACK_BINDING.next_pack_id, "CP00-345");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP11.P02.M07"], 10);
});

test("CP00-344 service slice rows stay descriptor-only", () => {
  const caseSet = createTimeExpenseCoreCp344ServiceSliceCaseSet();
  const descriptor = createTimeExpenseCoreCp344ServiceSliceDescriptor();
  const validation = validateTimeExpenseCoreCp344ServiceSliceDescriptor(descriptor, timeExpenseContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  for (const [microId, titles] of Object.entries(TIME_EXPENSE_CORE_CP344_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[timeExpenseCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m07 = caseSet.sections["RP11.P02.M07"].rows;
  assert.equal(m07.lock_acquisition_rule.acquires_runtime_lock, false);
  assert.equal(m07.rollback_behavior.performs_rollback_runtime, false);
  assert.equal(m07.unit_test_denied_path.expected_outcome, "denied_customer_safe");
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-344 evidence packets and handoff preserve service slice authority boundaries", () => {
  const descriptor = createTimeExpenseCoreCp344ServiceSliceDescriptor();
  const hermes = createTimeExpenseCoreCp344HermesEvidencePacket(cp344PlanPack, timeExpenseContract, descriptor);
  const claude = createTimeExpenseCoreCp344ClaudeReviewPacket(cp344PlanPack);
  const handoff = createTimeExpenseCoreCp344CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-344-to-CP00-345");
  assert.equal(handoff.next_subphase_id, "RP11.P02.M07.S21");
  assert.equal(handoff.production_ready_flag, "time_expense_core_service_slice_descriptor_verified");
});

test("CP00-345 plan binding covers the planned 40 RP11 service binding slice units", () => {
  const coverage = validateTimeExpenseCoreCp345Coverage(cp345PlanPack);

  assert.equal(TIME_EXPENSE_CORE_CP345_PACK_BINDING.pack_id, "CP00-345");
  assert.equal(TIME_EXPENSE_CORE_CP345_PACK_BINDING.risk_class, "B");
  assert.equal(TIME_EXPENSE_CORE_CP345_PACK_BINDING.unit_count, 40);
  assert.equal(TIME_EXPENSE_CORE_CP345_PACK_BINDING.range, "RP11.P02.M07.S21-RP11.P02.M09.S18");
  assert.equal(TIME_EXPENSE_CORE_CP345_PACK_BINDING.upstream_pack_id, "CP00-344");
  assert.equal(TIME_EXPENSE_CORE_CP345_PACK_BINDING.next_pack_id, "CP00-346");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_micro_phase["RP11.P02.M08"], 20);
});

test("CP00-345 service binding slice rows stay descriptor-only", () => {
  const caseSet = createTimeExpenseCoreCp345ServiceBindingSliceCaseSet();
  const descriptor = createTimeExpenseCoreCp345ServiceBindingSliceDescriptor();
  const validation = validateTimeExpenseCoreCp345ServiceBindingSliceDescriptor(descriptor, timeExpenseContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  for (const [microId, titles] of Object.entries(TIME_EXPENSE_CORE_CP345_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[timeExpenseCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m07 = caseSet.sections["RP11.P02.M07"].rows;
  assert.equal(m07.unit_test_review_path.expected_outcome, "review_required");
  assert.equal(m07.integration_smoke_case.dispatches_integration_smoke_runtime, false);
  const m08 = caseSet.sections["RP11.P02.M08"].rows;
  assert.equal(m08.tenant_boundary_precheck.cross_tenant_access_allowed, false);
  assert.equal(m08.lock_acquisition_rule.acquires_runtime_lock, false);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-345 evidence packets and handoff preserve service binding slice authority boundaries", () => {
  const descriptor = createTimeExpenseCoreCp345ServiceBindingSliceDescriptor();
  const hermes = createTimeExpenseCoreCp345HermesEvidencePacket(cp345PlanPack, timeExpenseContract, descriptor);
  const claude = createTimeExpenseCoreCp345ClaudeReviewPacket(cp345PlanPack);
  const handoff = createTimeExpenseCoreCp345CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-345-to-CP00-346");
  assert.equal(handoff.next_subphase_id, "RP11.P02.M09.S19");
  assert.equal(handoff.production_ready_flag, "time_expense_core_service_binding_slice_descriptor_verified");
});

test("CP00-346 plan binding covers the planned 150 RP11 P02 closeout, P03 interface, and P04 UI foundation units", () => {
  const coverage = validateTimeExpenseCoreCp346Coverage(cp346PlanPack);

  assert.equal(TIME_EXPENSE_CORE_CP346_PACK_BINDING.pack_id, "CP00-346");
  assert.equal(TIME_EXPENSE_CORE_CP346_PACK_BINDING.risk_class, "C");
  assert.equal(TIME_EXPENSE_CORE_CP346_PACK_BINDING.unit_count, 150);
  assert.equal(TIME_EXPENSE_CORE_CP346_PACK_BINDING.range, "RP11.P02.M09.S19-RP11.P04.M03.S05");
  assert.equal(TIME_EXPENSE_CORE_CP346_PACK_BINDING.upstream_pack_id, "CP00-345");
  assert.equal(TIME_EXPENSE_CORE_CP346_PACK_BINDING.next_pack_id, "CP00-347");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_phase["RP11.P02"], 13);
  assert.equal(coverage.summary.by_phase["RP11.P03"], 112);
  assert.equal(coverage.summary.by_phase["RP11.P04"], 25);
  assert.equal(Object.keys(TIME_EXPENSE_CORE_CP346_REQUIREMENTS.required_section_rows).length, 17);
});

test("CP00-346 interface and UI foundation rows stay descriptor-only", () => {
  const caseSet = createTimeExpenseCoreCp346P02CloseoutP03InterfaceP04UiFoundationCaseSet();
  const descriptor = createTimeExpenseCoreCp346P02CloseoutP03InterfaceP04UiFoundationDescriptor();
  const validation = validateTimeExpenseCoreCp346P02CloseoutP03InterfaceP04UiFoundationDescriptor(descriptor, timeExpenseContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 17);
  for (const [microId, titles] of Object.entries(TIME_EXPENSE_CORE_CP346_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[timeExpenseCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m05 = caseSet.sections["RP11.P03.M05"].rows;
  assert.equal(m05.permission_annotation.permission_decision_detail_included, false);
  assert.equal(m05.pagination_or_filtering_contract.no_unauthorized_count_leak, true);
  assert.equal(m05.unauthorized_data_omission.unauthorized_data_omitted, true);
  const ui = caseSet.sections["RP11.P04.M01"].rows;
  assert.equal(ui.empty_state.no_unauthorized_count_leak, true);
  assert.equal(ui.denied_state.permission_decision_detail_included, false);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-346 evidence packets and handoff route the P02/P03 closeout to the P04 UI phase", () => {
  const descriptor = createTimeExpenseCoreCp346P02CloseoutP03InterfaceP04UiFoundationDescriptor();
  const hermes = createTimeExpenseCoreCp346HermesEvidencePacket(cp346PlanPack, timeExpenseContract, descriptor);
  const claude = createTimeExpenseCoreCp346ClaudeReviewPacket(cp346PlanPack);
  const handoff = createTimeExpenseCoreCp346CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-346-to-CP00-347");
  assert.equal(handoff.next_subphase_id, "RP11.P04.M03.S06");
  assert.equal(handoff.production_ready_flag, "time_expense_core_p02_closeout_p03_interface_p04_ui_foundation_descriptor_verified");
});

test("CP00-347 plan binding covers the planned 40 RP11 UI workflow slice units", () => {
  const coverage = validateTimeExpenseCoreCp347Coverage(cp347PlanPack);

  assert.equal(TIME_EXPENSE_CORE_CP347_PACK_BINDING.pack_id, "CP00-347");
  assert.equal(TIME_EXPENSE_CORE_CP347_PACK_BINDING.risk_class, "B");
  assert.equal(TIME_EXPENSE_CORE_CP347_PACK_BINDING.unit_count, 40);
  assert.equal(TIME_EXPENSE_CORE_CP347_PACK_BINDING.range, "RP11.P04.M03.S06-RP11.P04.M05.S05");
  assert.equal(TIME_EXPENSE_CORE_CP347_PACK_BINDING.upstream_pack_id, "CP00-346");
  assert.equal(TIME_EXPENSE_CORE_CP347_PACK_BINDING.next_pack_id, "CP00-348");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_micro_phase["RP11.P04.M04"], 20);
});

test("CP00-347 UI workflow slice rows stay descriptor-only", () => {
  const caseSet = createTimeExpenseCoreCp347UiWorkflowSliceCaseSet();
  const descriptor = createTimeExpenseCoreCp347UiWorkflowSliceDescriptor();
  const validation = validateTimeExpenseCoreCp347UiWorkflowSliceDescriptor(descriptor, timeExpenseContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  for (const [microId, titles] of Object.entries(TIME_EXPENSE_CORE_CP347_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[timeExpenseCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m04 = caseSet.sections["RP11.P04.M04"].rows;
  assert.equal(m04.permission_badge.permission_decision_detail_included, false);
  assert.equal(m04.build_smoke.executes_ui_runtime, false);
  assert.equal(m04.claude_ui_leak_prompt.leak_detected, false);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-347 evidence packets and handoff preserve UI workflow slice authority boundaries", () => {
  const descriptor = createTimeExpenseCoreCp347UiWorkflowSliceDescriptor();
  const hermes = createTimeExpenseCoreCp347HermesEvidencePacket(cp347PlanPack, timeExpenseContract, descriptor);
  const claude = createTimeExpenseCoreCp347ClaudeReviewPacket(cp347PlanPack);
  const handoff = createTimeExpenseCoreCp347CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-347-to-CP00-348");
  assert.equal(handoff.next_subphase_id, "RP11.P04.M05.S06");
  assert.equal(handoff.production_ready_flag, "time_expense_core_ui_workflow_slice_descriptor_verified");
});

test("CP00-348 plan binding covers the planned 10 RP11 UI binding slice units", () => {
  const coverage = validateTimeExpenseCoreCp348Coverage(cp348PlanPack);

  assert.equal(TIME_EXPENSE_CORE_CP348_PACK_BINDING.pack_id, "CP00-348");
  assert.equal(TIME_EXPENSE_CORE_CP348_PACK_BINDING.risk_class, "A");
  assert.equal(TIME_EXPENSE_CORE_CP348_PACK_BINDING.unit_count, 10);
  assert.equal(TIME_EXPENSE_CORE_CP348_PACK_BINDING.range, "RP11.P04.M05.S06-RP11.P04.M05.S15");
  assert.equal(TIME_EXPENSE_CORE_CP348_PACK_BINDING.upstream_pack_id, "CP00-347");
  assert.equal(TIME_EXPENSE_CORE_CP348_PACK_BINDING.next_pack_id, "CP00-349");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP11.P04.M05"], 10);
});

test("CP00-348 UI binding slice rows stay descriptor-only", () => {
  const caseSet = createTimeExpenseCoreCp348UiBindingSliceCaseSet();
  const descriptor = createTimeExpenseCoreCp348UiBindingSliceDescriptor();
  const validation = validateTimeExpenseCoreCp348UiBindingSliceDescriptor(descriptor, timeExpenseContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  for (const [microId, titles] of Object.entries(TIME_EXPENSE_CORE_CP348_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[timeExpenseCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m05 = caseSet.sections["RP11.P04.M05"].rows;
  assert.equal(m05.permission_badge.permission_decision_detail_included, false);
  assert.equal(m05.audit_hint_display.audit_hint_detail_included, false);
  assert.equal(m05.error_message_copy.validation_error_detail_included, false);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-348 evidence packets and handoff preserve UI binding slice authority boundaries", () => {
  const descriptor = createTimeExpenseCoreCp348UiBindingSliceDescriptor();
  const hermes = createTimeExpenseCoreCp348HermesEvidencePacket(cp348PlanPack, timeExpenseContract, descriptor);
  const claude = createTimeExpenseCoreCp348ClaudeReviewPacket(cp348PlanPack);
  const handoff = createTimeExpenseCoreCp348CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-348-to-CP00-349");
  assert.equal(handoff.next_subphase_id, "RP11.P04.M05.S16");
  assert.equal(handoff.production_ready_flag, "time_expense_core_ui_binding_slice_descriptor_verified");
});

test("CP00-349 plan binding covers the planned 10 RP11 UI binding tail units", () => {
  const coverage = validateTimeExpenseCoreCp349Coverage(cp349PlanPack);

  assert.equal(TIME_EXPENSE_CORE_CP349_PACK_BINDING.pack_id, "CP00-349");
  assert.equal(TIME_EXPENSE_CORE_CP349_PACK_BINDING.risk_class, "A");
  assert.equal(TIME_EXPENSE_CORE_CP349_PACK_BINDING.unit_count, 10);
  assert.equal(TIME_EXPENSE_CORE_CP349_PACK_BINDING.range, "RP11.P04.M05.S16-RP11.P04.M06.S05");
  assert.equal(TIME_EXPENSE_CORE_CP349_PACK_BINDING.upstream_pack_id, "CP00-348");
  assert.equal(TIME_EXPENSE_CORE_CP349_PACK_BINDING.next_pack_id, "CP00-350");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP11.P04.M05"], 5);
  assert.equal(coverage.summary.by_micro_phase["RP11.P04.M06"], 5);
});

test("CP00-349 UI binding tail rows stay descriptor-only", () => {
  const caseSet = createTimeExpenseCoreCp349UiBindingTailCaseSet();
  const descriptor = createTimeExpenseCoreCp349UiBindingTailDescriptor();
  const validation = validateTimeExpenseCoreCp349UiBindingTailDescriptor(descriptor, timeExpenseContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  for (const [microId, titles] of Object.entries(TIME_EXPENSE_CORE_CP349_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[timeExpenseCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m05 = caseSet.sections["RP11.P04.M05"].rows;
  assert.equal(m05.synthetic_fixture_binding.real_client_data_loaded, false);
  assert.equal(m05.build_smoke.executes_ui_runtime, false);
  assert.equal(m05.claude_ui_leak_prompt.leak_detected, false);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-349 evidence packets and handoff preserve UI binding tail authority boundaries", () => {
  const descriptor = createTimeExpenseCoreCp349UiBindingTailDescriptor();
  const hermes = createTimeExpenseCoreCp349HermesEvidencePacket(cp349PlanPack, timeExpenseContract, descriptor);
  const claude = createTimeExpenseCoreCp349ClaudeReviewPacket(cp349PlanPack);
  const handoff = createTimeExpenseCoreCp349CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-349-to-CP00-350");
  assert.equal(handoff.next_subphase_id, "RP11.P04.M06.S06");
  assert.equal(handoff.production_ready_flag, "time_expense_core_ui_binding_tail_descriptor_verified");
});

test("CP00-350 plan binding covers the planned 150 RP11 P04 closeout and P05 fixture foundation units", () => {
  const coverage = validateTimeExpenseCoreCp350Coverage(cp350PlanPack);

  assert.equal(TIME_EXPENSE_CORE_CP350_PACK_BINDING.pack_id, "CP00-350");
  assert.equal(TIME_EXPENSE_CORE_CP350_PACK_BINDING.risk_class, "C");
  assert.equal(TIME_EXPENSE_CORE_CP350_PACK_BINDING.unit_count, 150);
  assert.equal(TIME_EXPENSE_CORE_CP350_PACK_BINDING.range, "RP11.P04.M06.S06-RP11.P05.M05.S07");
  assert.equal(TIME_EXPENSE_CORE_CP350_PACK_BINDING.upstream_pack_id, "CP00-349");
  assert.equal(TIME_EXPENSE_CORE_CP350_PACK_BINDING.next_pack_id, "CP00-351");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_phase["RP11.P04"], 83);
  assert.equal(coverage.summary.by_phase["RP11.P05"], 67);
  assert.equal(Object.keys(TIME_EXPENSE_CORE_CP350_REQUIREMENTS.required_section_rows).length, 11);
});

test("CP00-350 P04 closeout and P05 fixture foundation rows stay descriptor-only", () => {
  const caseSet = createTimeExpenseCoreCp350P04CloseoutP05FixtureFoundationCaseSet();
  const descriptor = createTimeExpenseCoreCp350P04CloseoutP05FixtureFoundationDescriptor();
  const validation = validateTimeExpenseCoreCp350P04CloseoutP05FixtureFoundationDescriptor(descriptor, timeExpenseContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 11);
  for (const [microId, titles] of Object.entries(TIME_EXPENSE_CORE_CP350_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[timeExpenseCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m03 = caseSet.sections["RP11.P05.M03"].rows;
  assert.equal(m03.base_tenant_fixture.real_client_data_loaded, false);
  assert.equal(m03.cross_tenant_case.cross_tenant_access_allowed, false);
  assert.equal(m03.security_trimming_case.unauthorized_data_omitted, true);
  assert.equal(m03.ai_retrieval_or_analytics_case.dispatches_ai_runtime, false);
  assert.equal(m03.no_real_data_check.real_client_data_loaded, false);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-350 evidence packets and handoff route the P04 closeout to the P05 fixture phase", () => {
  const descriptor = createTimeExpenseCoreCp350P04CloseoutP05FixtureFoundationDescriptor();
  const hermes = createTimeExpenseCoreCp350HermesEvidencePacket(cp350PlanPack, timeExpenseContract, descriptor);
  const claude = createTimeExpenseCoreCp350ClaudeReviewPacket(cp350PlanPack);
  const handoff = createTimeExpenseCoreCp350CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-350-to-CP00-351");
  assert.equal(handoff.next_subphase_id, "RP11.P05.M05.S08");
  assert.equal(handoff.production_ready_flag, "time_expense_core_p04_closeout_p05_fixture_foundation_descriptor_verified");
});

test("CP00-351 plan binding covers the planned 10 RP11 fixture slice units", () => {
  const coverage = validateTimeExpenseCoreCp351Coverage(cp351PlanPack);

  assert.equal(TIME_EXPENSE_CORE_CP351_PACK_BINDING.pack_id, "CP00-351");
  assert.equal(TIME_EXPENSE_CORE_CP351_PACK_BINDING.risk_class, "A");
  assert.equal(TIME_EXPENSE_CORE_CP351_PACK_BINDING.unit_count, 10);
  assert.equal(TIME_EXPENSE_CORE_CP351_PACK_BINDING.range, "RP11.P05.M05.S08-RP11.P05.M05.S17");
  assert.equal(TIME_EXPENSE_CORE_CP351_PACK_BINDING.upstream_pack_id, "CP00-350");
  assert.equal(TIME_EXPENSE_CORE_CP351_PACK_BINDING.next_pack_id, "CP00-352");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP11.P05.M05"], 10);
});

test("CP00-351 fixture slice rows stay descriptor-only", () => {
  const caseSet = createTimeExpenseCoreCp351FixtureSliceCaseSet();
  const descriptor = createTimeExpenseCoreCp351FixtureSliceDescriptor();
  const validation = validateTimeExpenseCoreCp351FixtureSliceDescriptor(descriptor, timeExpenseContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  for (const [microId, titles] of Object.entries(TIME_EXPENSE_CORE_CP351_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[timeExpenseCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m05 = caseSet.sections["RP11.P05.M05"].rows;
  assert.equal(m05.cross_tenant_case.cross_tenant_access_allowed, false);
  assert.equal(m05.security_trimming_case.unauthorized_data_omitted, true);
  assert.equal(m05.ai_retrieval_or_analytics_case.dispatches_ai_runtime, false);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-351 evidence packets and handoff preserve fixture slice authority boundaries", () => {
  const descriptor = createTimeExpenseCoreCp351FixtureSliceDescriptor();
  const hermes = createTimeExpenseCoreCp351HermesEvidencePacket(cp351PlanPack, timeExpenseContract, descriptor);
  const claude = createTimeExpenseCoreCp351ClaudeReviewPacket(cp351PlanPack);
  const handoff = createTimeExpenseCoreCp351CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-351-to-CP00-352");
  assert.equal(handoff.next_subphase_id, "RP11.P05.M05.S18");
  assert.equal(handoff.production_ready_flag, "time_expense_core_fixture_slice_descriptor_verified");
});

test("CP00-352 plan binding covers the planned 10 RP11 fixture binding slice units", () => {
  const coverage = validateTimeExpenseCoreCp352Coverage(cp352PlanPack);

  assert.equal(TIME_EXPENSE_CORE_CP352_PACK_BINDING.pack_id, "CP00-352");
  assert.equal(TIME_EXPENSE_CORE_CP352_PACK_BINDING.risk_class, "A");
  assert.equal(TIME_EXPENSE_CORE_CP352_PACK_BINDING.unit_count, 10);
  assert.equal(TIME_EXPENSE_CORE_CP352_PACK_BINDING.range, "RP11.P05.M05.S18-RP11.P05.M06.S07");
  assert.equal(TIME_EXPENSE_CORE_CP352_PACK_BINDING.upstream_pack_id, "CP00-351");
  assert.equal(TIME_EXPENSE_CORE_CP352_PACK_BINDING.next_pack_id, "CP00-353");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP11.P05.M06"], 7);
});

test("CP00-352 fixture binding slice rows stay descriptor-only", () => {
  const caseSet = createTimeExpenseCoreCp352FixtureBindingSliceCaseSet();
  const descriptor = createTimeExpenseCoreCp352FixtureBindingSliceDescriptor();
  const validation = validateTimeExpenseCoreCp352FixtureBindingSliceDescriptor(descriptor, timeExpenseContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  for (const [microId, titles] of Object.entries(TIME_EXPENSE_CORE_CP352_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[timeExpenseCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m05 = caseSet.sections["RP11.P05.M05"].rows;
  assert.equal(m05.claude_missing_test_prompt.claude_final_approval_claimed, false);
  assert.equal(m05.no_real_data_check.real_client_data_loaded, false);
  const m06 = caseSet.sections["RP11.P05.M06"].rows;
  assert.equal(m06.base_tenant_fixture.real_client_data_loaded, false);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-352 evidence packets and handoff preserve fixture binding slice authority boundaries", () => {
  const descriptor = createTimeExpenseCoreCp352FixtureBindingSliceDescriptor();
  const hermes = createTimeExpenseCoreCp352HermesEvidencePacket(cp352PlanPack, timeExpenseContract, descriptor);
  const claude = createTimeExpenseCoreCp352ClaudeReviewPacket(cp352PlanPack);
  const handoff = createTimeExpenseCoreCp352CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-352-to-CP00-353");
  assert.equal(handoff.next_subphase_id, "RP11.P05.M06.S08");
  assert.equal(handoff.production_ready_flag, "time_expense_core_fixture_binding_slice_descriptor_verified");
});

test("CP00-353 plan binding covers the planned 150 RP11 P05 closeout and P06 permission foundation units", () => {
  const coverage = validateTimeExpenseCoreCp353Coverage(cp353PlanPack);

  assert.equal(TIME_EXPENSE_CORE_CP353_PACK_BINDING.pack_id, "CP00-353");
  assert.equal(TIME_EXPENSE_CORE_CP353_PACK_BINDING.risk_class, "C");
  assert.equal(TIME_EXPENSE_CORE_CP353_PACK_BINDING.unit_count, 150);
  assert.equal(TIME_EXPENSE_CORE_CP353_PACK_BINDING.range, "RP11.P05.M06.S08-RP11.P06.M04.S05");
  assert.equal(TIME_EXPENSE_CORE_CP353_PACK_BINDING.upstream_pack_id, "CP00-352");
  assert.equal(TIME_EXPENSE_CORE_CP353_PACK_BINDING.next_pack_id, "CP00-354");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_phase["RP11.P05"], 81);
  assert.equal(coverage.summary.by_phase["RP11.P06"], 69);
  assert.equal(Object.keys(TIME_EXPENSE_CORE_CP353_REQUIREMENTS.required_section_rows).length, 10);
});

test("CP00-353 P05 closeout and P06 permission foundation rows stay descriptor-only", () => {
  const caseSet = createTimeExpenseCoreCp353P05CloseoutP06PermissionFoundationCaseSet();
  const descriptor = createTimeExpenseCoreCp353P05CloseoutP06PermissionFoundationDescriptor();
  const validation = validateTimeExpenseCoreCp353P05CloseoutP06PermissionFoundationDescriptor(descriptor, timeExpenseContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 10);
  for (const [microId, titles] of Object.entries(TIME_EXPENSE_CORE_CP353_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[timeExpenseCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m03 = caseSet.sections["RP11.P06.M03"].rows;
  assert.equal(m03.permission_matrix_row.deny_over_allow_enforced, true);
  assert.equal(m03.view_decision_binding.permission_decision_detail_included, false);
  assert.equal(m03.ai_retrieval_decision_binding.dispatches_ai_runtime, false);
  assert.equal(m03.security_trimming_proof.unauthorized_data_omitted, true);
  assert.equal(m03.audit_event_expectation.writes_audit_event, false);
  assert.equal(m03.leak_prevention_test.leak_detected, false);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-353 evidence packets and handoff route the P05 closeout to the P06 permission phase", () => {
  const descriptor = createTimeExpenseCoreCp353P05CloseoutP06PermissionFoundationDescriptor();
  const hermes = createTimeExpenseCoreCp353HermesEvidencePacket(cp353PlanPack, timeExpenseContract, descriptor);
  const claude = createTimeExpenseCoreCp353ClaudeReviewPacket(cp353PlanPack);
  const handoff = createTimeExpenseCoreCp353CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-353-to-CP00-354");
  assert.equal(handoff.next_subphase_id, "RP11.P06.M04.S06");
  assert.equal(handoff.production_ready_flag, "time_expense_core_p05_closeout_p06_permission_foundation_descriptor_verified");
});

test("CP00-354 plan binding covers the planned 40 RP11 permission slice units", () => {
  const coverage = validateTimeExpenseCoreCp354Coverage(cp354PlanPack);

  assert.equal(TIME_EXPENSE_CORE_CP354_PACK_BINDING.pack_id, "CP00-354");
  assert.equal(TIME_EXPENSE_CORE_CP354_PACK_BINDING.risk_class, "B");
  assert.equal(TIME_EXPENSE_CORE_CP354_PACK_BINDING.unit_count, 40);
  assert.equal(TIME_EXPENSE_CORE_CP354_PACK_BINDING.range, "RP11.P06.M04.S06-RP11.P06.M06.S03");
  assert.equal(TIME_EXPENSE_CORE_CP354_PACK_BINDING.upstream_pack_id, "CP00-353");
  assert.equal(TIME_EXPENSE_CORE_CP354_PACK_BINDING.next_pack_id, "CP00-355");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_micro_phase["RP11.P06.M05"], 22);
});

test("CP00-354 permission slice rows stay descriptor-only", () => {
  const caseSet = createTimeExpenseCoreCp354PermissionSliceCaseSet();
  const descriptor = createTimeExpenseCoreCp354PermissionSliceDescriptor();
  const validation = validateTimeExpenseCoreCp354PermissionSliceDescriptor(descriptor, timeExpenseContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  for (const [microId, titles] of Object.entries(TIME_EXPENSE_CORE_CP354_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[timeExpenseCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m05 = caseSet.sections["RP11.P06.M05"].rows;
  assert.equal(m05.permission_matrix_row.deny_over_allow_enforced, true);
  assert.equal(m05.ai_retrieval_decision_binding.dispatches_ai_runtime, false);
  assert.equal(m05.cross_tenant_test.cross_tenant_access_allowed, false);
  assert.equal(m05.leak_prevention_test.leak_detected, false);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-354 evidence packets and handoff preserve permission slice authority boundaries", () => {
  const descriptor = createTimeExpenseCoreCp354PermissionSliceDescriptor();
  const hermes = createTimeExpenseCoreCp354HermesEvidencePacket(cp354PlanPack, timeExpenseContract, descriptor);
  const claude = createTimeExpenseCoreCp354ClaudeReviewPacket(cp354PlanPack);
  const handoff = createTimeExpenseCoreCp354CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-354-to-CP00-355");
  assert.equal(handoff.next_subphase_id, "RP11.P06.M06.S04");
  assert.equal(handoff.production_ready_flag, "time_expense_core_permission_slice_descriptor_verified");
});

test("CP00-355 plan binding covers the planned 150 RP11 P06 closeout and P07 failure foundation units", () => {
  const coverage = validateTimeExpenseCoreCp355Coverage(cp355PlanPack);

  assert.equal(TIME_EXPENSE_CORE_CP355_PACK_BINDING.pack_id, "CP00-355");
  assert.equal(TIME_EXPENSE_CORE_CP355_PACK_BINDING.risk_class, "C");
  assert.equal(TIME_EXPENSE_CORE_CP355_PACK_BINDING.unit_count, 150);
  assert.equal(TIME_EXPENSE_CORE_CP355_PACK_BINDING.range, "RP11.P06.M06.S04-RP11.P07.M03.S18");
  assert.equal(TIME_EXPENSE_CORE_CP355_PACK_BINDING.upstream_pack_id, "CP00-354");
  assert.equal(TIME_EXPENSE_CORE_CP355_PACK_BINDING.next_pack_id, "CP00-356");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_phase["RP11.P06"], 90);
  assert.equal(coverage.summary.by_phase["RP11.P07"], 60);
  assert.equal(Object.keys(TIME_EXPENSE_CORE_CP355_REQUIREMENTS.required_section_rows).length, 9);
});

test("CP00-355 P06 closeout and P07 failure foundation rows stay descriptor-only", () => {
  const caseSet = createTimeExpenseCoreCp355P06CloseoutP07FailureFoundationCaseSet();
  const descriptor = createTimeExpenseCoreCp355P06CloseoutP07FailureFoundationDescriptor();
  const validation = validateTimeExpenseCoreCp355P06CloseoutP07FailureFoundationDescriptor(descriptor, timeExpenseContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 9);
  for (const [microId, titles] of Object.entries(TIME_EXPENSE_CORE_CP355_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[timeExpenseCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m02 = caseSet.sections["RP11.P07.M02"].rows;
  assert.equal(m02.cross_tenant_failure.cross_tenant_access_allowed, false);
  assert.equal(m02.permission_denied_failure.permission_decision_detail_included, false);
  assert.equal(m02.ambiguous_rule_failure.deny_over_allow_enforced, true);
  assert.equal(m02.lock_conflict_failure.acquires_runtime_lock, false);
  assert.equal(m02.rollback_expectation.performs_rollback_runtime, false);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-355 evidence packets and handoff route the P06 closeout to the P07 failure phase", () => {
  const descriptor = createTimeExpenseCoreCp355P06CloseoutP07FailureFoundationDescriptor();
  const hermes = createTimeExpenseCoreCp355HermesEvidencePacket(cp355PlanPack, timeExpenseContract, descriptor);
  const claude = createTimeExpenseCoreCp355ClaudeReviewPacket(cp355PlanPack);
  const handoff = createTimeExpenseCoreCp355CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-355-to-CP00-356");
  assert.equal(handoff.next_subphase_id, "RP11.P07.M03.S19");
  assert.equal(handoff.production_ready_flag, "time_expense_core_p06_closeout_p07_failure_foundation_descriptor_verified");
});

test("CP00-356 plan binding covers the planned 10 RP11 failure slice units", () => {
  const coverage = validateTimeExpenseCoreCp356Coverage(cp356PlanPack);

  assert.equal(TIME_EXPENSE_CORE_CP356_PACK_BINDING.pack_id, "CP00-356");
  assert.equal(TIME_EXPENSE_CORE_CP356_PACK_BINDING.risk_class, "A");
  assert.equal(TIME_EXPENSE_CORE_CP356_PACK_BINDING.unit_count, 10);
  assert.equal(TIME_EXPENSE_CORE_CP356_PACK_BINDING.range, "RP11.P07.M03.S19-RP11.P07.M04.S06");
  assert.equal(TIME_EXPENSE_CORE_CP356_PACK_BINDING.upstream_pack_id, "CP00-355");
  assert.equal(TIME_EXPENSE_CORE_CP356_PACK_BINDING.next_pack_id, "CP00-357");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP11.P07.M04"], 6);
});

test("CP00-356 failure slice rows stay descriptor-only", () => {
  const caseSet = createTimeExpenseCoreCp356FailureSliceCaseSet();
  const descriptor = createTimeExpenseCoreCp356FailureSliceDescriptor();
  const validation = validateTimeExpenseCoreCp356FailureSliceDescriptor(descriptor, timeExpenseContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  for (const [microId, titles] of Object.entries(TIME_EXPENSE_CORE_CP356_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[timeExpenseCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m03 = caseSet.sections["RP11.P07.M03"].rows;
  assert.equal(m03.audit_failure_hint.audit_hint_detail_included, false);
  assert.equal(m03.claude_edge_case_prompt.claude_final_approval_claimed, false);
  assert.equal(m03.human_escalation_note.human_approval_route_required_before_runtime, true);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-356 evidence packets and handoff preserve failure slice authority boundaries", () => {
  const descriptor = createTimeExpenseCoreCp356FailureSliceDescriptor();
  const hermes = createTimeExpenseCoreCp356HermesEvidencePacket(cp356PlanPack, timeExpenseContract, descriptor);
  const claude = createTimeExpenseCoreCp356ClaudeReviewPacket(cp356PlanPack);
  const handoff = createTimeExpenseCoreCp356CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-356-to-CP00-357");
  assert.equal(handoff.next_subphase_id, "RP11.P07.M04.S07");
  assert.equal(handoff.production_ready_flag, "time_expense_core_failure_slice_descriptor_verified");
});

test("CP00-357 plan binding covers the planned 10 RP11 failure binding slice units", () => {
  const coverage = validateTimeExpenseCoreCp357Coverage(cp357PlanPack);

  assert.equal(TIME_EXPENSE_CORE_CP357_PACK_BINDING.pack_id, "CP00-357");
  assert.equal(TIME_EXPENSE_CORE_CP357_PACK_BINDING.risk_class, "A");
  assert.equal(TIME_EXPENSE_CORE_CP357_PACK_BINDING.unit_count, 10);
  assert.equal(TIME_EXPENSE_CORE_CP357_PACK_BINDING.range, "RP11.P07.M04.S07-RP11.P07.M04.S16");
  assert.equal(TIME_EXPENSE_CORE_CP357_PACK_BINDING.upstream_pack_id, "CP00-356");
  assert.equal(TIME_EXPENSE_CORE_CP357_PACK_BINDING.next_pack_id, "CP00-358");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP11.P07.M04"], 10);
});

test("CP00-357 failure binding slice rows stay descriptor-only", () => {
  const caseSet = createTimeExpenseCoreCp357FailureBindingSliceCaseSet();
  const descriptor = createTimeExpenseCoreCp357FailureBindingSliceDescriptor();
  const validation = validateTimeExpenseCoreCp357FailureBindingSliceDescriptor(descriptor, timeExpenseContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  for (const [microId, titles] of Object.entries(TIME_EXPENSE_CORE_CP357_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[timeExpenseCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m04 = caseSet.sections["RP11.P07.M04"].rows;
  assert.equal(m04.cross_tenant_failure.cross_tenant_access_allowed, false);
  assert.equal(m04.lock_conflict_failure.acquires_runtime_lock, false);
  assert.equal(m04.rollback_expectation.performs_rollback_runtime, false);
  assert.equal(m04.blocked_claim_receipt.blocked_claim_detail_included, false);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-357 evidence packets and handoff preserve failure binding slice authority boundaries", () => {
  const descriptor = createTimeExpenseCoreCp357FailureBindingSliceDescriptor();
  const hermes = createTimeExpenseCoreCp357HermesEvidencePacket(cp357PlanPack, timeExpenseContract, descriptor);
  const claude = createTimeExpenseCoreCp357ClaudeReviewPacket(cp357PlanPack);
  const handoff = createTimeExpenseCoreCp357CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-357-to-CP00-358");
  assert.equal(handoff.next_subphase_id, "RP11.P07.M04.S17");
  assert.equal(handoff.production_ready_flag, "time_expense_core_failure_binding_slice_descriptor_verified");
});

test("CP00-358 plan binding covers the planned 40 RP11 failure tail slice units", () => {
  const coverage = validateTimeExpenseCoreCp358Coverage(cp358PlanPack);

  assert.equal(TIME_EXPENSE_CORE_CP358_PACK_BINDING.pack_id, "CP00-358");
  assert.equal(TIME_EXPENSE_CORE_CP358_PACK_BINDING.risk_class, "B");
  assert.equal(TIME_EXPENSE_CORE_CP358_PACK_BINDING.unit_count, 40);
  assert.equal(TIME_EXPENSE_CORE_CP358_PACK_BINDING.range, "RP11.P07.M04.S17-RP11.P07.M06.S14");
  assert.equal(TIME_EXPENSE_CORE_CP358_PACK_BINDING.upstream_pack_id, "CP00-357");
  assert.equal(TIME_EXPENSE_CORE_CP358_PACK_BINDING.next_pack_id, "CP00-359");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_micro_phase["RP11.P07.M05"], 22);
});

test("CP00-358 failure tail slice rows stay descriptor-only", () => {
  const caseSet = createTimeExpenseCoreCp358FailureTailSliceCaseSet();
  const descriptor = createTimeExpenseCoreCp358FailureTailSliceDescriptor();
  const validation = validateTimeExpenseCoreCp358FailureTailSliceDescriptor(descriptor, timeExpenseContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  for (const [microId, titles] of Object.entries(TIME_EXPENSE_CORE_CP358_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[timeExpenseCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m05 = caseSet.sections["RP11.P07.M05"].rows;
  assert.equal(m05.cross_tenant_failure.cross_tenant_access_allowed, false);
  assert.equal(m05.claude_edge_case_prompt.claude_final_approval_claimed, false);
  assert.equal(m05.human_escalation_note.human_approval_route_required_before_runtime, true);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-358 evidence packets and handoff preserve failure tail slice authority boundaries", () => {
  const descriptor = createTimeExpenseCoreCp358FailureTailSliceDescriptor();
  const hermes = createTimeExpenseCoreCp358HermesEvidencePacket(cp358PlanPack, timeExpenseContract, descriptor);
  const claude = createTimeExpenseCoreCp358ClaudeReviewPacket(cp358PlanPack);
  const handoff = createTimeExpenseCoreCp358CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-358-to-CP00-359");
  assert.equal(handoff.next_subphase_id, "RP11.P07.M06.S15");
  assert.equal(handoff.production_ready_flag, "time_expense_core_failure_tail_slice_descriptor_verified");
});

test("CP00-359 plan binding covers the planned 10 RP11 failure fixture slice units", () => {
  const coverage = validateTimeExpenseCoreCp359Coverage(cp359PlanPack);

  assert.equal(TIME_EXPENSE_CORE_CP359_PACK_BINDING.pack_id, "CP00-359");
  assert.equal(TIME_EXPENSE_CORE_CP359_PACK_BINDING.risk_class, "A");
  assert.equal(TIME_EXPENSE_CORE_CP359_PACK_BINDING.unit_count, 10);
  assert.equal(TIME_EXPENSE_CORE_CP359_PACK_BINDING.range, "RP11.P07.M06.S15-RP11.P07.M07.S04");
  assert.equal(TIME_EXPENSE_CORE_CP359_PACK_BINDING.upstream_pack_id, "CP00-358");
  assert.equal(TIME_EXPENSE_CORE_CP359_PACK_BINDING.next_pack_id, "CP00-360");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_micro_phase["RP11.P07.M06"], 6);
});

test("CP00-359 failure fixture slice rows stay descriptor-only", () => {
  const caseSet = createTimeExpenseCoreCp359FailureFixtureSliceCaseSet();
  const descriptor = createTimeExpenseCoreCp359FailureFixtureSliceDescriptor();
  const validation = validateTimeExpenseCoreCp359FailureFixtureSliceDescriptor(descriptor, timeExpenseContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  for (const [microId, titles] of Object.entries(TIME_EXPENSE_CORE_CP359_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[timeExpenseCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m06 = caseSet.sections["RP11.P07.M06"].rows;
  assert.equal(m06.blocked_claim_receipt.blocked_claim_detail_included, false);
  assert.equal(m06.failure_fixture.real_client_data_loaded, false);
  assert.equal(m06.hermes_failure_evidence.emits_hermes_runtime_receipt, false);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-359 evidence packets and handoff preserve failure fixture slice authority boundaries", () => {
  const descriptor = createTimeExpenseCoreCp359FailureFixtureSliceDescriptor();
  const hermes = createTimeExpenseCoreCp359HermesEvidencePacket(cp359PlanPack, timeExpenseContract, descriptor);
  const claude = createTimeExpenseCoreCp359ClaudeReviewPacket(cp359PlanPack);
  const handoff = createTimeExpenseCoreCp359CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-359-to-CP00-360");
  assert.equal(handoff.next_subphase_id, "RP11.P07.M07.S05");
  assert.equal(handoff.production_ready_flag, "time_expense_core_failure_fixture_slice_descriptor_verified");
});

test("CP00-360 plan binding covers the planned 40 RP11 failure hermes slice units", () => {
  const coverage = validateTimeExpenseCoreCp360Coverage(cp360PlanPack);

  assert.equal(TIME_EXPENSE_CORE_CP360_PACK_BINDING.pack_id, "CP00-360");
  assert.equal(TIME_EXPENSE_CORE_CP360_PACK_BINDING.risk_class, "B");
  assert.equal(TIME_EXPENSE_CORE_CP360_PACK_BINDING.unit_count, 40);
  assert.equal(TIME_EXPENSE_CORE_CP360_PACK_BINDING.range, "RP11.P07.M07.S05-RP11.P07.M09.S02");
  assert.equal(TIME_EXPENSE_CORE_CP360_PACK_BINDING.upstream_pack_id, "CP00-359");
  assert.equal(TIME_EXPENSE_CORE_CP360_PACK_BINDING.next_pack_id, "CP00-361");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_micro_phase["RP11.P07.M08"], 20);
});

test("CP00-360 failure hermes slice rows stay descriptor-only", () => {
  const caseSet = createTimeExpenseCoreCp360FailureHermesSliceCaseSet();
  const descriptor = createTimeExpenseCoreCp360FailureHermesSliceDescriptor();
  const validation = validateTimeExpenseCoreCp360FailureHermesSliceDescriptor(descriptor, timeExpenseContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  for (const [microId, titles] of Object.entries(TIME_EXPENSE_CORE_CP360_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[timeExpenseCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m08 = caseSet.sections["RP11.P07.M08"].rows;
  assert.equal(m08.cross_tenant_failure.cross_tenant_access_allowed, false);
  assert.equal(m08.hermes_failure_evidence.emits_hermes_runtime_receipt, false);
  const m07 = caseSet.sections["RP11.P07.M07"].rows;
  assert.equal(m07.claude_edge_case_prompt.claude_final_approval_claimed, false);
  assert.equal(m07.human_escalation_note.human_approval_route_required_before_runtime, true);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-360 evidence packets and handoff preserve failure hermes slice authority boundaries", () => {
  const descriptor = createTimeExpenseCoreCp360FailureHermesSliceDescriptor();
  const hermes = createTimeExpenseCoreCp360HermesEvidencePacket(cp360PlanPack, timeExpenseContract, descriptor);
  const claude = createTimeExpenseCoreCp360ClaudeReviewPacket(cp360PlanPack);
  const handoff = createTimeExpenseCoreCp360CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-360-to-CP00-361");
  assert.equal(handoff.next_subphase_id, "RP11.P07.M09.S03");
  assert.equal(handoff.production_ready_flag, "time_expense_core_failure_hermes_slice_descriptor_verified");
});

test("CP00-361 plan binding covers the planned 150 RP11 P07 closeout and P08 hermes foundation units", () => {
  const coverage = validateTimeExpenseCoreCp361Coverage(cp361PlanPack);

  assert.equal(TIME_EXPENSE_CORE_CP361_PACK_BINDING.pack_id, "CP00-361");
  assert.equal(TIME_EXPENSE_CORE_CP361_PACK_BINDING.risk_class, "C");
  assert.equal(TIME_EXPENSE_CORE_CP361_PACK_BINDING.unit_count, 150);
  assert.equal(TIME_EXPENSE_CORE_CP361_PACK_BINDING.range, "RP11.P07.M09.S03-RP11.P08.M08.S01");
  assert.equal(TIME_EXPENSE_CORE_CP361_PACK_BINDING.upstream_pack_id, "CP00-360");
  assert.equal(TIME_EXPENSE_CORE_CP361_PACK_BINDING.next_pack_id, "CP00-362");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_phase["RP11.P07"], 29);
  assert.equal(coverage.summary.by_phase["RP11.P08"], 121);
  assert.equal(Object.keys(TIME_EXPENSE_CORE_CP361_REQUIREMENTS.required_section_rows).length, 11);
});

test("CP00-361 P07 closeout and P08 hermes foundation rows stay descriptor-only", () => {
  const caseSet = createTimeExpenseCoreCp361P07CloseoutP08HermesFoundationCaseSet();
  const descriptor = createTimeExpenseCoreCp361P07CloseoutP08HermesFoundationDescriptor();
  const validation = validateTimeExpenseCoreCp361P07CloseoutP08HermesFoundationDescriptor(descriptor, timeExpenseContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 11);
  for (const [microId, titles] of Object.entries(TIME_EXPENSE_CORE_CP361_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[timeExpenseCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m03 = caseSet.sections["RP11.P08.M03"].rows;
  assert.equal(m03.hermes_command_matrix.executes_command_runtime, false);
  assert.equal(m03.permission_summary_receipt.permission_decision_detail_included, false);
  assert.equal(m03.no_real_data_receipt.real_client_data_loaded, false);
  assert.equal(m03.claude_dependency_marker.claude_final_approval_claimed, false);
  assert.equal(m03.human_approval_marker.human_approval_route_required_before_runtime, true);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-361 evidence packets and handoff route the P07 closeout to the P08 hermes phase", () => {
  const descriptor = createTimeExpenseCoreCp361P07CloseoutP08HermesFoundationDescriptor();
  const hermes = createTimeExpenseCoreCp361HermesEvidencePacket(cp361PlanPack, timeExpenseContract, descriptor);
  const claude = createTimeExpenseCoreCp361ClaudeReviewPacket(cp361PlanPack);
  const handoff = createTimeExpenseCoreCp361CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-361-to-CP00-362");
  assert.equal(handoff.next_subphase_id, "RP11.P08.M08.S02");
  assert.equal(handoff.production_ready_flag, "time_expense_core_p07_closeout_p08_hermes_foundation_descriptor_verified");
});

test("CP00-362 plan binding covers the planned 150 RP11 P08 closeout and P09 review foundation units", () => {
  const coverage = validateTimeExpenseCoreCp362Coverage(cp362PlanPack);

  assert.equal(TIME_EXPENSE_CORE_CP362_PACK_BINDING.pack_id, "CP00-362");
  assert.equal(TIME_EXPENSE_CORE_CP362_PACK_BINDING.risk_class, "C");
  assert.equal(TIME_EXPENSE_CORE_CP362_PACK_BINDING.unit_count, 150);
  assert.equal(TIME_EXPENSE_CORE_CP362_PACK_BINDING.range, "RP11.P08.M08.S02-RP11.P09.M08.S08");
  assert.equal(TIME_EXPENSE_CORE_CP362_PACK_BINDING.upstream_pack_id, "CP00-361");
  assert.equal(TIME_EXPENSE_CORE_CP362_PACK_BINDING.next_pack_id, "CP00-363");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_phase["RP11.P08"], 47);
  assert.equal(coverage.summary.by_phase["RP11.P09"], 103);
  assert.equal(Object.keys(TIME_EXPENSE_CORE_CP362_REQUIREMENTS.required_section_rows).length, 12);
});

test("CP00-362 P08 closeout and P09 review foundation rows stay descriptor-only", () => {
  const caseSet = createTimeExpenseCoreCp362P08CloseoutP09ReviewFoundationCaseSet();
  const descriptor = createTimeExpenseCoreCp362P08CloseoutP09ReviewFoundationDescriptor();
  const validation = validateTimeExpenseCoreCp362P08CloseoutP09ReviewFoundationDescriptor(descriptor, timeExpenseContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 12);
  for (const [microId, titles] of Object.entries(TIME_EXPENSE_CORE_CP362_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[timeExpenseCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m03 = caseSet.sections["RP11.P09.M03"].rows;
  assert.equal(m03.permission_bypass_questions.permission_bypass_detected, false);
  assert.equal(m03.ui_leak_questions.leak_detected, false);
  assert.equal(m03.go_no_go_verdict_format.claude_final_approval_claimed, false);
  assert.equal(m03.human_approval_summary.human_final_approval_required, true);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-362 evidence packets and handoff route the P08 closeout to the P09 review phase", () => {
  const descriptor = createTimeExpenseCoreCp362P08CloseoutP09ReviewFoundationDescriptor();
  const hermes = createTimeExpenseCoreCp362HermesEvidencePacket(cp362PlanPack, timeExpenseContract, descriptor);
  const claude = createTimeExpenseCoreCp362ClaudeReviewPacket(cp362PlanPack);
  const handoff = createTimeExpenseCoreCp362CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-362-to-CP00-363");
  assert.equal(handoff.next_subphase_id, "RP11.P09.M09.S01");
  assert.equal(handoff.production_ready_flag, "time_expense_core_p08_closeout_p09_review_foundation_descriptor_verified");
});

test("CP00-363 plan binding covers the planned 12 RP11 review closeout units", () => {
  const coverage = validateTimeExpenseCoreCp363Coverage(cp363PlanPack);

  assert.equal(TIME_EXPENSE_CORE_CP363_PACK_BINDING.pack_id, "CP00-363");
  assert.equal(TIME_EXPENSE_CORE_CP363_PACK_BINDING.risk_class, "C");
  assert.equal(TIME_EXPENSE_CORE_CP363_PACK_BINDING.unit_count, 12);
  assert.equal(TIME_EXPENSE_CORE_CP363_PACK_BINDING.range, "RP11.P09.M09.S01-RP11.P09.M10.S04");
  assert.equal(TIME_EXPENSE_CORE_CP363_PACK_BINDING.upstream_pack_id, "CP00-362");
  assert.equal(TIME_EXPENSE_CORE_CP363_PACK_BINDING.next_pack_id, "CP00-364");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 12);
  assert.equal(coverage.summary.by_micro_phase["RP11.P09.M09"], 8);
  assert.equal(coverage.summary.by_micro_phase["RP11.P09.M10"], 4);
  assert.equal(Object.keys(TIME_EXPENSE_CORE_CP363_REQUIREMENTS.required_section_rows).length, 2);
});

test("CP00-363 review closeout slice rows stay descriptor-only", () => {
  const caseSet = createTimeExpenseCoreCp363ReviewCloseoutSliceCaseSet();
  const descriptor = createTimeExpenseCoreCp363ReviewCloseoutSliceDescriptor();
  const validation = validateTimeExpenseCoreCp363ReviewCloseoutSliceDescriptor(descriptor, timeExpenseContract);

  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(caseSet.section_count, 2);
  for (const [microId, titles] of Object.entries(TIME_EXPENSE_CORE_CP363_REQUIREMENTS.required_section_rows)) {
    for (const title of titles) {
      const row = caseSet.sections[microId].rows[timeExpenseCoreRowKey(title)];
      assert.ok(row, `missing row ${title} in ${microId}`);
      assert.equal(row.descriptor_only, true);
      assert.equal(row.runtime_execution, false);
    }
  }
  const m09 = caseSet.sections["RP11.P09.M09"].rows;
  assert.equal(m09.permission_bypass_questions.permission_bypass_detected, false);
  assert.equal(m09.ui_leak_questions.leak_detected, false);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
});

test("CP00-363 evidence packets and handoff close RP11 and route to RP12", () => {
  const descriptor = createTimeExpenseCoreCp363ReviewCloseoutSliceDescriptor();
  const hermes = createTimeExpenseCoreCp363HermesEvidencePacket(cp363PlanPack, timeExpenseContract, descriptor);
  const claude = createTimeExpenseCoreCp363ClaudeReviewPacket(cp363PlanPack);
  const handoff = createTimeExpenseCoreCp363CloseoutHandoff();

  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.required_model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.handoff_id, "CP00-363-to-CP00-364");
  assert.equal(handoff.next_subphase_id, "RP12.P00.M00.S01");
  assert.equal(handoff.production_ready_flag, "time_expense_core_review_closeout_slice_descriptor_verified");
});
