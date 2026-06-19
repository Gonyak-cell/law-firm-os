import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

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
} from "../packages/time-expense/src/index.js";

async function readJson(relPath) {
  return JSON.parse(await readFile(new URL(relPath, import.meta.url), "utf8"));
}

async function readOptionalJson(relPath) {
  try {
    return await readJson(relPath);
  } catch {
    return null;
  }
}

const timeExpenseContract = await readJson("../contracts/time-expense-core-contract.json");
const closeoutPlan = await readJson("../docs/closeout-pack-plan/closeout-pack-plan.json");
const cp342Manifest = await readOptionalJson("../docs/closeout-packs/cp00-342/manifest.json");
const cp343Manifest = await readOptionalJson("../docs/closeout-packs/cp00-343/manifest.json");
const cp344Manifest = await readOptionalJson("../docs/closeout-packs/cp00-344/manifest.json");
const cp345Manifest = await readOptionalJson("../docs/closeout-packs/cp00-345/manifest.json");
const cp346Manifest = await readOptionalJson("../docs/closeout-packs/cp00-346/manifest.json");
const cp347Manifest = await readOptionalJson("../docs/closeout-packs/cp00-347/manifest.json");
const cp348Manifest = await readOptionalJson("../docs/closeout-packs/cp00-348/manifest.json");
const cp349Manifest = await readOptionalJson("../docs/closeout-packs/cp00-349/manifest.json");
const cp350Manifest = await readOptionalJson("../docs/closeout-packs/cp00-350/manifest.json");
const cp351Manifest = await readOptionalJson("../docs/closeout-packs/cp00-351/manifest.json");
const cp352Manifest = await readOptionalJson("../docs/closeout-packs/cp00-352/manifest.json");
const cp353Manifest = await readOptionalJson("../docs/closeout-packs/cp00-353/manifest.json");
const cp354Manifest = await readOptionalJson("../docs/closeout-packs/cp00-354/manifest.json");
const cp355Manifest = await readOptionalJson("../docs/closeout-packs/cp00-355/manifest.json");
const cp356Manifest = await readOptionalJson("../docs/closeout-packs/cp00-356/manifest.json");
const cp357Manifest = await readOptionalJson("../docs/closeout-packs/cp00-357/manifest.json");
const cp358Manifest = await readOptionalJson("../docs/closeout-packs/cp00-358/manifest.json");
const cp359Manifest = await readOptionalJson("../docs/closeout-packs/cp00-359/manifest.json");
const cp360Manifest = await readOptionalJson("../docs/closeout-packs/cp00-360/manifest.json");
const cp361Manifest = await readOptionalJson("../docs/closeout-packs/cp00-361/manifest.json");
const cp362Manifest = await readOptionalJson("../docs/closeout-packs/cp00-362/manifest.json");
const cp363Manifest = await readOptionalJson("../docs/closeout-packs/cp00-363/manifest.json");
const cp342PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-342") ?? cp342Manifest?.plan_binding_snapshot;
const cp343PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-343") ?? cp343Manifest?.plan_binding_snapshot;
const cp344PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-344") ?? cp344Manifest?.plan_binding_snapshot;
const cp345PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-345") ?? cp345Manifest?.plan_binding_snapshot;
const cp346PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-346") ?? cp346Manifest?.plan_binding_snapshot;
const cp347PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-347") ?? cp347Manifest?.plan_binding_snapshot;
const cp348PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-348") ?? cp348Manifest?.plan_binding_snapshot;
const cp349PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-349") ?? cp349Manifest?.plan_binding_snapshot;
const cp350PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-350") ?? cp350Manifest?.plan_binding_snapshot;
const cp351PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-351") ?? cp351Manifest?.plan_binding_snapshot;
const cp352PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-352") ?? cp352Manifest?.plan_binding_snapshot;
const cp353PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-353") ?? cp353Manifest?.plan_binding_snapshot;
const cp354PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-354") ?? cp354Manifest?.plan_binding_snapshot;
const cp355PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-355") ?? cp355Manifest?.plan_binding_snapshot;
const cp356PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-356") ?? cp356Manifest?.plan_binding_snapshot;
const cp357PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-357") ?? cp357Manifest?.plan_binding_snapshot;
const cp358PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-358") ?? cp358Manifest?.plan_binding_snapshot;
const cp359PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-359") ?? cp359Manifest?.plan_binding_snapshot;
const cp360PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-360") ?? cp360Manifest?.plan_binding_snapshot;
const cp361PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-361") ?? cp361Manifest?.plan_binding_snapshot;
const cp362PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-362") ?? cp362Manifest?.plan_binding_snapshot;
const cp363PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-363") ?? cp363Manifest?.plan_binding_snapshot;

assert.equal(timeExpenseContract.schema_version, "law-firm-os.time-expense-core-contract.v0.1");
assert.equal(timeExpenseContract.program.program_id, "RP11");
assert.equal(timeExpenseContract.program.program_title, "Time Expense Disbursement");
assert.equal(timeExpenseContract.program.upstream_program_id, "RP10");
assert.equal(timeExpenseContract.program.hermes_gate, "H11");
assert.equal(timeExpenseContract.program.claude_gate, "C11");
assert.equal(timeExpenseContract.program.descriptor_only, true);
assert.deepEqual(timeExpenseContract.program, JSON.parse(JSON.stringify(TIME_EXPENSE_CORE_PROGRAM_CONTRACT)));
assert.equal(timeExpenseContract.current_pack.pack_id, "CP00-363");
assert.equal(timeExpenseContract.program.current_pack_id, "CP00-363");
assert.deepEqual(timeExpenseContract.current_pack, JSON.parse(JSON.stringify(TIME_EXPENSE_CORE_CP363_PACK_BINDING)));
assert.deepEqual(timeExpenseContract.no_write_attestation, JSON.parse(JSON.stringify(TIME_EXPENSE_CORE_CP363_NO_WRITE_ATTESTATION)));

assert.ok(cp342PlanPack, "CP00-342 must exist in closeout-pack-plan.json");
assert.equal(cp342PlanPack.unit_count, TIME_EXPENSE_CORE_CP342_PACK_BINDING.unit_count, "CP00-342 unit count drift");
assert.ok(cp343PlanPack, "CP00-343 must exist in closeout-pack-plan.json");
assert.equal(cp343PlanPack.unit_count, TIME_EXPENSE_CORE_CP343_PACK_BINDING.unit_count, "CP00-343 unit count drift");
assert.ok(cp344PlanPack, "CP00-344 must exist in closeout-pack-plan.json");
assert.equal(cp344PlanPack.unit_count, TIME_EXPENSE_CORE_CP344_PACK_BINDING.unit_count, "CP00-344 unit count drift");
assert.ok(cp345PlanPack, "CP00-345 must exist in closeout-pack-plan.json");
assert.equal(cp345PlanPack.unit_count, TIME_EXPENSE_CORE_CP345_PACK_BINDING.unit_count, "CP00-345 unit count drift");
assert.ok(cp346PlanPack, "CP00-346 must exist in closeout-pack-plan.json");
assert.equal(cp346PlanPack.unit_count, TIME_EXPENSE_CORE_CP346_PACK_BINDING.unit_count, "CP00-346 unit count drift");
assert.ok(cp347PlanPack, "CP00-347 must exist in closeout-pack-plan.json");
assert.equal(cp347PlanPack.unit_count, TIME_EXPENSE_CORE_CP347_PACK_BINDING.unit_count, "CP00-347 unit count drift");
assert.ok(cp348PlanPack, "CP00-348 must exist in closeout-pack-plan.json");
assert.equal(cp348PlanPack.unit_count, TIME_EXPENSE_CORE_CP348_PACK_BINDING.unit_count, "CP00-348 unit count drift");
assert.ok(cp349PlanPack, "CP00-349 must exist in closeout-pack-plan.json");
assert.equal(cp349PlanPack.unit_count, TIME_EXPENSE_CORE_CP349_PACK_BINDING.unit_count, "CP00-349 unit count drift");
assert.ok(cp350PlanPack, "CP00-350 must exist in closeout-pack-plan.json");
assert.equal(cp350PlanPack.unit_count, TIME_EXPENSE_CORE_CP350_PACK_BINDING.unit_count, "CP00-350 unit count drift");
assert.ok(cp351PlanPack, "CP00-351 must exist in closeout-pack-plan.json");
assert.equal(cp351PlanPack.unit_count, TIME_EXPENSE_CORE_CP351_PACK_BINDING.unit_count, "CP00-351 unit count drift");
assert.ok(cp352PlanPack, "CP00-352 must exist in closeout-pack-plan.json");
assert.equal(cp352PlanPack.unit_count, TIME_EXPENSE_CORE_CP352_PACK_BINDING.unit_count, "CP00-352 unit count drift");
assert.ok(cp353PlanPack, "CP00-353 must exist in closeout-pack-plan.json");
assert.equal(cp353PlanPack.unit_count, TIME_EXPENSE_CORE_CP353_PACK_BINDING.unit_count, "CP00-353 unit count drift");
assert.ok(cp354PlanPack, "CP00-354 must exist in closeout-pack-plan.json");
assert.equal(cp354PlanPack.unit_count, TIME_EXPENSE_CORE_CP354_PACK_BINDING.unit_count, "CP00-354 unit count drift");
assert.ok(cp355PlanPack, "CP00-355 must exist in closeout-pack-plan.json");
assert.equal(cp355PlanPack.unit_count, TIME_EXPENSE_CORE_CP355_PACK_BINDING.unit_count, "CP00-355 unit count drift");
assert.ok(cp356PlanPack, "CP00-356 must exist in closeout-pack-plan.json");
assert.equal(cp356PlanPack.unit_count, TIME_EXPENSE_CORE_CP356_PACK_BINDING.unit_count, "CP00-356 unit count drift");
assert.ok(cp357PlanPack, "CP00-357 must exist in closeout-pack-plan.json");
assert.equal(cp357PlanPack.unit_count, TIME_EXPENSE_CORE_CP357_PACK_BINDING.unit_count, "CP00-357 unit count drift");
assert.ok(cp358PlanPack, "CP00-358 must exist in closeout-pack-plan.json");
assert.equal(cp358PlanPack.unit_count, TIME_EXPENSE_CORE_CP358_PACK_BINDING.unit_count, "CP00-358 unit count drift");
assert.ok(cp359PlanPack, "CP00-359 must exist in closeout-pack-plan.json");
assert.equal(cp359PlanPack.unit_count, TIME_EXPENSE_CORE_CP359_PACK_BINDING.unit_count, "CP00-359 unit count drift");
assert.ok(cp360PlanPack, "CP00-360 must exist in closeout-pack-plan.json");
assert.equal(cp360PlanPack.unit_count, TIME_EXPENSE_CORE_CP360_PACK_BINDING.unit_count, "CP00-360 unit count drift");
assert.ok(cp361PlanPack, "CP00-361 must exist in closeout-pack-plan.json");
assert.equal(cp361PlanPack.unit_count, TIME_EXPENSE_CORE_CP361_PACK_BINDING.unit_count, "CP00-361 unit count drift");
assert.ok(cp362PlanPack, "CP00-362 must exist in closeout-pack-plan.json");
assert.equal(cp362PlanPack.unit_count, TIME_EXPENSE_CORE_CP362_PACK_BINDING.unit_count, "CP00-362 unit count drift");
assert.ok(cp363PlanPack, "CP00-363 must exist in closeout-pack-plan.json");
assert.equal(cp363PlanPack.unit_count, TIME_EXPENSE_CORE_CP363_PACK_BINDING.unit_count, "CP00-363 unit count drift");

const cp342Coverage = validateTimeExpenseCoreCp342Coverage(cp342PlanPack);
const cp342Descriptor = createTimeExpenseCoreCp342ScopeContractFoundationDescriptor();
const cp342CaseSet = createTimeExpenseCoreCp342ScopeContractFoundationCaseSet();
const cp342Foundation = validateTimeExpenseCoreCp342ScopeContractFoundationDescriptor(cp342Descriptor, timeExpenseContract);
const cp342Hermes = createTimeExpenseCoreCp342HermesEvidencePacket(cp342PlanPack, timeExpenseContract, cp342Descriptor);
const cp342Claude = createTimeExpenseCoreCp342ClaudeReviewPacket(cp342PlanPack);
const cp342Handoff = createTimeExpenseCoreCp342CloseoutHandoff();
const cp343Coverage = validateTimeExpenseCoreCp343Coverage(cp343PlanPack);
const cp343Descriptor = createTimeExpenseCoreCp343P01CloseoutP02ServiceFoundationDescriptor();
const cp343CaseSet = createTimeExpenseCoreCp343P01CloseoutP02ServiceFoundationCaseSet();
const cp343Foundation = validateTimeExpenseCoreCp343P01CloseoutP02ServiceFoundationDescriptor(cp343Descriptor, timeExpenseContract);
const cp343Hermes = createTimeExpenseCoreCp343HermesEvidencePacket(cp343PlanPack, timeExpenseContract, cp343Descriptor);
const cp343Claude = createTimeExpenseCoreCp343ClaudeReviewPacket(cp343PlanPack);
const cp343Handoff = createTimeExpenseCoreCp343CloseoutHandoff();
const cp344Coverage = validateTimeExpenseCoreCp344Coverage(cp344PlanPack);
const cp344Descriptor = createTimeExpenseCoreCp344ServiceSliceDescriptor();
const cp344CaseSet = createTimeExpenseCoreCp344ServiceSliceCaseSet();
const cp344Slice = validateTimeExpenseCoreCp344ServiceSliceDescriptor(cp344Descriptor, timeExpenseContract);
const cp344Hermes = createTimeExpenseCoreCp344HermesEvidencePacket(cp344PlanPack, timeExpenseContract, cp344Descriptor);
const cp344Claude = createTimeExpenseCoreCp344ClaudeReviewPacket(cp344PlanPack);
const cp344Handoff = createTimeExpenseCoreCp344CloseoutHandoff();
const cp345Coverage = validateTimeExpenseCoreCp345Coverage(cp345PlanPack);
const cp345Descriptor = createTimeExpenseCoreCp345ServiceBindingSliceDescriptor();
const cp345CaseSet = createTimeExpenseCoreCp345ServiceBindingSliceCaseSet();
const cp345Slice = validateTimeExpenseCoreCp345ServiceBindingSliceDescriptor(cp345Descriptor, timeExpenseContract);
const cp345Hermes = createTimeExpenseCoreCp345HermesEvidencePacket(cp345PlanPack, timeExpenseContract, cp345Descriptor);
const cp345Claude = createTimeExpenseCoreCp345ClaudeReviewPacket(cp345PlanPack);
const cp345Handoff = createTimeExpenseCoreCp345CloseoutHandoff();
const cp346Coverage = validateTimeExpenseCoreCp346Coverage(cp346PlanPack);
const cp346Descriptor = createTimeExpenseCoreCp346P02CloseoutP03InterfaceP04UiFoundationDescriptor();
const cp346CaseSet = createTimeExpenseCoreCp346P02CloseoutP03InterfaceP04UiFoundationCaseSet();
const cp346Foundation = validateTimeExpenseCoreCp346P02CloseoutP03InterfaceP04UiFoundationDescriptor(cp346Descriptor, timeExpenseContract);
const cp346Hermes = createTimeExpenseCoreCp346HermesEvidencePacket(cp346PlanPack, timeExpenseContract, cp346Descriptor);
const cp346Claude = createTimeExpenseCoreCp346ClaudeReviewPacket(cp346PlanPack);
const cp346Handoff = createTimeExpenseCoreCp346CloseoutHandoff();
const cp347Coverage = validateTimeExpenseCoreCp347Coverage(cp347PlanPack);
const cp347Descriptor = createTimeExpenseCoreCp347UiWorkflowSliceDescriptor();
const cp347CaseSet = createTimeExpenseCoreCp347UiWorkflowSliceCaseSet();
const cp347Slice = validateTimeExpenseCoreCp347UiWorkflowSliceDescriptor(cp347Descriptor, timeExpenseContract);
const cp347Hermes = createTimeExpenseCoreCp347HermesEvidencePacket(cp347PlanPack, timeExpenseContract, cp347Descriptor);
const cp347Claude = createTimeExpenseCoreCp347ClaudeReviewPacket(cp347PlanPack);
const cp347Handoff = createTimeExpenseCoreCp347CloseoutHandoff();
const cp348Coverage = validateTimeExpenseCoreCp348Coverage(cp348PlanPack);
const cp348Descriptor = createTimeExpenseCoreCp348UiBindingSliceDescriptor();
const cp348CaseSet = createTimeExpenseCoreCp348UiBindingSliceCaseSet();
const cp348Slice = validateTimeExpenseCoreCp348UiBindingSliceDescriptor(cp348Descriptor, timeExpenseContract);
const cp348Hermes = createTimeExpenseCoreCp348HermesEvidencePacket(cp348PlanPack, timeExpenseContract, cp348Descriptor);
const cp348Claude = createTimeExpenseCoreCp348ClaudeReviewPacket(cp348PlanPack);
const cp348Handoff = createTimeExpenseCoreCp348CloseoutHandoff();
const cp349Coverage = validateTimeExpenseCoreCp349Coverage(cp349PlanPack);
const cp349Descriptor = createTimeExpenseCoreCp349UiBindingTailDescriptor();
const cp349CaseSet = createTimeExpenseCoreCp349UiBindingTailCaseSet();
const cp349Tail = validateTimeExpenseCoreCp349UiBindingTailDescriptor(cp349Descriptor, timeExpenseContract);
const cp349Hermes = createTimeExpenseCoreCp349HermesEvidencePacket(cp349PlanPack, timeExpenseContract, cp349Descriptor);
const cp349Claude = createTimeExpenseCoreCp349ClaudeReviewPacket(cp349PlanPack);
const cp349Handoff = createTimeExpenseCoreCp349CloseoutHandoff();
const cp350Coverage = validateTimeExpenseCoreCp350Coverage(cp350PlanPack);
const cp350Descriptor = createTimeExpenseCoreCp350P04CloseoutP05FixtureFoundationDescriptor();
const cp350CaseSet = createTimeExpenseCoreCp350P04CloseoutP05FixtureFoundationCaseSet();
const cp350Foundation = validateTimeExpenseCoreCp350P04CloseoutP05FixtureFoundationDescriptor(cp350Descriptor, timeExpenseContract);
const cp350Hermes = createTimeExpenseCoreCp350HermesEvidencePacket(cp350PlanPack, timeExpenseContract, cp350Descriptor);
const cp350Claude = createTimeExpenseCoreCp350ClaudeReviewPacket(cp350PlanPack);
const cp350Handoff = createTimeExpenseCoreCp350CloseoutHandoff();
const cp351Coverage = validateTimeExpenseCoreCp351Coverage(cp351PlanPack);
const cp351Descriptor = createTimeExpenseCoreCp351FixtureSliceDescriptor();
const cp351CaseSet = createTimeExpenseCoreCp351FixtureSliceCaseSet();
const cp351Slice = validateTimeExpenseCoreCp351FixtureSliceDescriptor(cp351Descriptor, timeExpenseContract);
const cp351Hermes = createTimeExpenseCoreCp351HermesEvidencePacket(cp351PlanPack, timeExpenseContract, cp351Descriptor);
const cp351Claude = createTimeExpenseCoreCp351ClaudeReviewPacket(cp351PlanPack);
const cp351Handoff = createTimeExpenseCoreCp351CloseoutHandoff();
const cp352Coverage = validateTimeExpenseCoreCp352Coverage(cp352PlanPack);
const cp352Descriptor = createTimeExpenseCoreCp352FixtureBindingSliceDescriptor();
const cp352CaseSet = createTimeExpenseCoreCp352FixtureBindingSliceCaseSet();
const cp352Slice = validateTimeExpenseCoreCp352FixtureBindingSliceDescriptor(cp352Descriptor, timeExpenseContract);
const cp352Hermes = createTimeExpenseCoreCp352HermesEvidencePacket(cp352PlanPack, timeExpenseContract, cp352Descriptor);
const cp352Claude = createTimeExpenseCoreCp352ClaudeReviewPacket(cp352PlanPack);
const cp352Handoff = createTimeExpenseCoreCp352CloseoutHandoff();
const cp353Coverage = validateTimeExpenseCoreCp353Coverage(cp353PlanPack);
const cp353Descriptor = createTimeExpenseCoreCp353P05CloseoutP06PermissionFoundationDescriptor();
const cp353CaseSet = createTimeExpenseCoreCp353P05CloseoutP06PermissionFoundationCaseSet();
const cp353Foundation = validateTimeExpenseCoreCp353P05CloseoutP06PermissionFoundationDescriptor(cp353Descriptor, timeExpenseContract);
const cp353Hermes = createTimeExpenseCoreCp353HermesEvidencePacket(cp353PlanPack, timeExpenseContract, cp353Descriptor);
const cp353Claude = createTimeExpenseCoreCp353ClaudeReviewPacket(cp353PlanPack);
const cp353Handoff = createTimeExpenseCoreCp353CloseoutHandoff();
const cp354Coverage = validateTimeExpenseCoreCp354Coverage(cp354PlanPack);
const cp354Descriptor = createTimeExpenseCoreCp354PermissionSliceDescriptor();
const cp354CaseSet = createTimeExpenseCoreCp354PermissionSliceCaseSet();
const cp354Slice = validateTimeExpenseCoreCp354PermissionSliceDescriptor(cp354Descriptor, timeExpenseContract);
const cp354Hermes = createTimeExpenseCoreCp354HermesEvidencePacket(cp354PlanPack, timeExpenseContract, cp354Descriptor);
const cp354Claude = createTimeExpenseCoreCp354ClaudeReviewPacket(cp354PlanPack);
const cp354Handoff = createTimeExpenseCoreCp354CloseoutHandoff();
const cp355Coverage = validateTimeExpenseCoreCp355Coverage(cp355PlanPack);
const cp355Descriptor = createTimeExpenseCoreCp355P06CloseoutP07FailureFoundationDescriptor();
const cp355CaseSet = createTimeExpenseCoreCp355P06CloseoutP07FailureFoundationCaseSet();
const cp355Foundation = validateTimeExpenseCoreCp355P06CloseoutP07FailureFoundationDescriptor(cp355Descriptor, timeExpenseContract);
const cp355Hermes = createTimeExpenseCoreCp355HermesEvidencePacket(cp355PlanPack, timeExpenseContract, cp355Descriptor);
const cp355Claude = createTimeExpenseCoreCp355ClaudeReviewPacket(cp355PlanPack);
const cp355Handoff = createTimeExpenseCoreCp355CloseoutHandoff();
const cp356Coverage = validateTimeExpenseCoreCp356Coverage(cp356PlanPack);
const cp356Descriptor = createTimeExpenseCoreCp356FailureSliceDescriptor();
const cp356CaseSet = createTimeExpenseCoreCp356FailureSliceCaseSet();
const cp356Slice = validateTimeExpenseCoreCp356FailureSliceDescriptor(cp356Descriptor, timeExpenseContract);
const cp356Hermes = createTimeExpenseCoreCp356HermesEvidencePacket(cp356PlanPack, timeExpenseContract, cp356Descriptor);
const cp356Claude = createTimeExpenseCoreCp356ClaudeReviewPacket(cp356PlanPack);
const cp356Handoff = createTimeExpenseCoreCp356CloseoutHandoff();
const cp357Coverage = validateTimeExpenseCoreCp357Coverage(cp357PlanPack);
const cp357Descriptor = createTimeExpenseCoreCp357FailureBindingSliceDescriptor();
const cp357CaseSet = createTimeExpenseCoreCp357FailureBindingSliceCaseSet();
const cp357Slice = validateTimeExpenseCoreCp357FailureBindingSliceDescriptor(cp357Descriptor, timeExpenseContract);
const cp357Hermes = createTimeExpenseCoreCp357HermesEvidencePacket(cp357PlanPack, timeExpenseContract, cp357Descriptor);
const cp357Claude = createTimeExpenseCoreCp357ClaudeReviewPacket(cp357PlanPack);
const cp357Handoff = createTimeExpenseCoreCp357CloseoutHandoff();
const cp358Coverage = validateTimeExpenseCoreCp358Coverage(cp358PlanPack);
const cp358Descriptor = createTimeExpenseCoreCp358FailureTailSliceDescriptor();
const cp358CaseSet = createTimeExpenseCoreCp358FailureTailSliceCaseSet();
const cp358Slice = validateTimeExpenseCoreCp358FailureTailSliceDescriptor(cp358Descriptor, timeExpenseContract);
const cp358Hermes = createTimeExpenseCoreCp358HermesEvidencePacket(cp358PlanPack, timeExpenseContract, cp358Descriptor);
const cp358Claude = createTimeExpenseCoreCp358ClaudeReviewPacket(cp358PlanPack);
const cp358Handoff = createTimeExpenseCoreCp358CloseoutHandoff();
const cp359Coverage = validateTimeExpenseCoreCp359Coverage(cp359PlanPack);
const cp359Descriptor = createTimeExpenseCoreCp359FailureFixtureSliceDescriptor();
const cp359CaseSet = createTimeExpenseCoreCp359FailureFixtureSliceCaseSet();
const cp359Slice = validateTimeExpenseCoreCp359FailureFixtureSliceDescriptor(cp359Descriptor, timeExpenseContract);
const cp359Hermes = createTimeExpenseCoreCp359HermesEvidencePacket(cp359PlanPack, timeExpenseContract, cp359Descriptor);
const cp359Claude = createTimeExpenseCoreCp359ClaudeReviewPacket(cp359PlanPack);
const cp359Handoff = createTimeExpenseCoreCp359CloseoutHandoff();
const cp360Coverage = validateTimeExpenseCoreCp360Coverage(cp360PlanPack);
const cp360Descriptor = createTimeExpenseCoreCp360FailureHermesSliceDescriptor();
const cp360CaseSet = createTimeExpenseCoreCp360FailureHermesSliceCaseSet();
const cp360Slice = validateTimeExpenseCoreCp360FailureHermesSliceDescriptor(cp360Descriptor, timeExpenseContract);
const cp360Hermes = createTimeExpenseCoreCp360HermesEvidencePacket(cp360PlanPack, timeExpenseContract, cp360Descriptor);
const cp360Claude = createTimeExpenseCoreCp360ClaudeReviewPacket(cp360PlanPack);
const cp360Handoff = createTimeExpenseCoreCp360CloseoutHandoff();
const cp361Coverage = validateTimeExpenseCoreCp361Coverage(cp361PlanPack);
const cp361Descriptor = createTimeExpenseCoreCp361P07CloseoutP08HermesFoundationDescriptor();
const cp361CaseSet = createTimeExpenseCoreCp361P07CloseoutP08HermesFoundationCaseSet();
const cp361Foundation = validateTimeExpenseCoreCp361P07CloseoutP08HermesFoundationDescriptor(cp361Descriptor, timeExpenseContract);
const cp361Hermes = createTimeExpenseCoreCp361HermesEvidencePacket(cp361PlanPack, timeExpenseContract, cp361Descriptor);
const cp361Claude = createTimeExpenseCoreCp361ClaudeReviewPacket(cp361PlanPack);
const cp361Handoff = createTimeExpenseCoreCp361CloseoutHandoff();
const cp362Coverage = validateTimeExpenseCoreCp362Coverage(cp362PlanPack);
const cp362Descriptor = createTimeExpenseCoreCp362P08CloseoutP09ReviewFoundationDescriptor();
const cp362CaseSet = createTimeExpenseCoreCp362P08CloseoutP09ReviewFoundationCaseSet();
const cp362Foundation = validateTimeExpenseCoreCp362P08CloseoutP09ReviewFoundationDescriptor(cp362Descriptor, timeExpenseContract);
const cp362Hermes = createTimeExpenseCoreCp362HermesEvidencePacket(cp362PlanPack, timeExpenseContract, cp362Descriptor);
const cp362Claude = createTimeExpenseCoreCp362ClaudeReviewPacket(cp362PlanPack);
const cp362Handoff = createTimeExpenseCoreCp362CloseoutHandoff();
const cp363Coverage = validateTimeExpenseCoreCp363Coverage(cp363PlanPack);
const cp363Descriptor = createTimeExpenseCoreCp363ReviewCloseoutSliceDescriptor();
const cp363CaseSet = createTimeExpenseCoreCp363ReviewCloseoutSliceCaseSet();
const cp363Slice = validateTimeExpenseCoreCp363ReviewCloseoutSliceDescriptor(cp363Descriptor, timeExpenseContract);
const cp363Hermes = createTimeExpenseCoreCp363HermesEvidencePacket(cp363PlanPack, timeExpenseContract, cp363Descriptor);
const cp363Claude = createTimeExpenseCoreCp363ClaudeReviewPacket(cp363PlanPack);
const cp363Handoff = createTimeExpenseCoreCp363CloseoutHandoff();

assert.equal(cp342Coverage.valid, true, cp342Coverage.errors.join("; "));
assert.equal(cp342Coverage.summary.unit_count, 150);
assert.equal(cp342Coverage.summary.by_phase["RP11.P00"], 52);
assert.equal(cp342Coverage.summary.by_phase["RP11.P01"], 98);
assert.equal(cp342Foundation.valid, true, cp342Foundation.errors.join("; "));
assert.equal(cp342CaseSet.section_count, 20);
for (const [microId, titles] of Object.entries(TIME_EXPENSE_CORE_CP342_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp342CaseSet.sections[microId].rows[timeExpenseCoreRowKey(title)];
    assert.ok(row, `CP00-342 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  timeExpenseContract.scope_contract_foundation_descriptor,
  JSON.parse(JSON.stringify(cp342Descriptor)),
  "contract scope_contract_foundation_descriptor drift",
);
assert.deepEqual(timeExpenseContract.cp342_requirements, JSON.parse(JSON.stringify(TIME_EXPENSE_CORE_CP342_REQUIREMENTS)));
assert.deepEqual(timeExpenseContract.cp342_no_write_attestation, JSON.parse(JSON.stringify(TIME_EXPENSE_CORE_CP342_NO_WRITE_ATTESTATION)));
assert.equal(cp342Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp342Hermes.production_ready_candidate, true);
assert.equal(cp342Claude.review_packet, "C11.CP00-342.time_expense_core_scope_contract_foundation_descriptor");
assert.equal(cp342Claude.read_only, true);
assert.equal(cp342Handoff.to_pack_id, "CP00-343");
assert.equal(cp342Handoff.next_subphase_id, "RP11.P01.M08.S06");
assert.equal(cp343Coverage.valid, true, cp343Coverage.errors.join("; "));
assert.equal(cp343Coverage.summary.unit_count, 150);
assert.equal(cp343Coverage.summary.by_phase["RP11.P01"], 14);
assert.equal(cp343Coverage.summary.by_phase["RP11.P02"], 136);
assert.equal(cp343Foundation.valid, true, cp343Foundation.errors.join("; "));
assert.equal(cp343CaseSet.section_count, 11);
for (const [microId, titles] of Object.entries(TIME_EXPENSE_CORE_CP343_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp343CaseSet.sections[microId].rows[timeExpenseCoreRowKey(title)];
    assert.ok(row, `CP00-343 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  timeExpenseContract.p01_closeout_p02_service_foundation_descriptor,
  JSON.parse(JSON.stringify(cp343Descriptor)),
  "contract p01_closeout_p02_service_foundation_descriptor drift",
);
assert.deepEqual(timeExpenseContract.cp343_requirements, JSON.parse(JSON.stringify(TIME_EXPENSE_CORE_CP343_REQUIREMENTS)));
assert.deepEqual(timeExpenseContract.cp343_no_write_attestation, JSON.parse(JSON.stringify(TIME_EXPENSE_CORE_CP343_NO_WRITE_ATTESTATION)));
assert.equal(cp343Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp343Hermes.production_ready_candidate, true);
assert.equal(cp343Claude.review_packet, "C11.CP00-343.time_expense_core_p01_closeout_p02_service_foundation_descriptor");
assert.equal(cp343Claude.read_only, true);
assert.equal(cp343Handoff.to_pack_id, "CP00-344");
assert.equal(cp343Handoff.next_subphase_id, "RP11.P02.M07.S11");
assert.equal(cp344Coverage.valid, true, cp344Coverage.errors.join("; "));
assert.equal(cp344Coverage.summary.unit_count, 10);
assert.equal(cp344Coverage.summary.by_micro_phase["RP11.P02.M07"], 10);
assert.equal(cp344Slice.valid, true, cp344Slice.errors.join("; "));
assert.equal(cp344CaseSet.section_count, 1);
for (const [microId, titles] of Object.entries(TIME_EXPENSE_CORE_CP344_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp344CaseSet.sections[microId].rows[timeExpenseCoreRowKey(title)];
    assert.ok(row, `CP00-344 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  timeExpenseContract.service_slice_descriptor,
  JSON.parse(JSON.stringify(cp344Descriptor)),
  "contract service_slice_descriptor drift",
);
assert.deepEqual(timeExpenseContract.cp344_requirements, JSON.parse(JSON.stringify(TIME_EXPENSE_CORE_CP344_REQUIREMENTS)));
assert.deepEqual(timeExpenseContract.cp344_no_write_attestation, JSON.parse(JSON.stringify(TIME_EXPENSE_CORE_CP344_NO_WRITE_ATTESTATION)));
assert.equal(cp344Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp344Hermes.production_ready_candidate, true);
assert.equal(cp344Claude.review_packet, "C11.CP00-344.time_expense_core_service_slice_descriptor");
assert.equal(cp344Claude.read_only, true);
assert.equal(cp344Handoff.to_pack_id, "CP00-345");
assert.equal(cp344Handoff.next_subphase_id, "RP11.P02.M07.S21");
assert.equal(cp345Coverage.valid, true, cp345Coverage.errors.join("; "));
assert.equal(cp345Coverage.summary.unit_count, 40);
assert.equal(cp345Coverage.summary.by_micro_phase["RP11.P02.M08"], 20);
assert.equal(cp345Slice.valid, true, cp345Slice.errors.join("; "));
assert.equal(cp345CaseSet.section_count, 3);
for (const [microId, titles] of Object.entries(TIME_EXPENSE_CORE_CP345_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp345CaseSet.sections[microId].rows[timeExpenseCoreRowKey(title)];
    assert.ok(row, `CP00-345 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  timeExpenseContract.service_binding_slice_descriptor,
  JSON.parse(JSON.stringify(cp345Descriptor)),
  "contract service_binding_slice_descriptor drift",
);
assert.deepEqual(timeExpenseContract.cp345_requirements, JSON.parse(JSON.stringify(TIME_EXPENSE_CORE_CP345_REQUIREMENTS)));
assert.deepEqual(timeExpenseContract.cp345_no_write_attestation, JSON.parse(JSON.stringify(TIME_EXPENSE_CORE_CP345_NO_WRITE_ATTESTATION)));
assert.equal(cp345Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp345Hermes.production_ready_candidate, true);
assert.equal(cp345Claude.review_packet, "C11.CP00-345.time_expense_core_service_binding_slice_descriptor");
assert.equal(cp345Claude.read_only, true);
assert.equal(cp345Handoff.to_pack_id, "CP00-346");
assert.equal(cp345Handoff.next_subphase_id, "RP11.P02.M09.S19");
assert.equal(cp346Coverage.valid, true, cp346Coverage.errors.join("; "));
assert.equal(cp346Coverage.summary.unit_count, 150);
assert.equal(cp346Coverage.summary.by_phase["RP11.P02"], 13);
assert.equal(cp346Coverage.summary.by_phase["RP11.P03"], 112);
assert.equal(cp346Coverage.summary.by_phase["RP11.P04"], 25);
assert.equal(cp346Foundation.valid, true, cp346Foundation.errors.join("; "));
assert.equal(cp346CaseSet.section_count, 17);
for (const [microId, titles] of Object.entries(TIME_EXPENSE_CORE_CP346_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp346CaseSet.sections[microId].rows[timeExpenseCoreRowKey(title)];
    assert.ok(row, `CP00-346 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  timeExpenseContract.p02_closeout_p03_interface_p04_ui_foundation_descriptor,
  JSON.parse(JSON.stringify(cp346Descriptor)),
  "contract p02_closeout_p03_interface_p04_ui_foundation_descriptor drift",
);
assert.deepEqual(timeExpenseContract.cp346_requirements, JSON.parse(JSON.stringify(TIME_EXPENSE_CORE_CP346_REQUIREMENTS)));
assert.deepEqual(timeExpenseContract.cp346_no_write_attestation, JSON.parse(JSON.stringify(TIME_EXPENSE_CORE_CP346_NO_WRITE_ATTESTATION)));
assert.equal(cp346Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp346Hermes.production_ready_candidate, true);
assert.equal(cp346Claude.review_packet, "C11.CP00-346.time_expense_core_p02_closeout_p03_interface_p04_ui_foundation_descriptor");
assert.equal(cp346Claude.read_only, true);
assert.equal(cp346Handoff.to_pack_id, "CP00-347");
assert.equal(cp346Handoff.next_subphase_id, "RP11.P04.M03.S06");
assert.equal(cp347Coverage.valid, true, cp347Coverage.errors.join("; "));
assert.equal(cp347Coverage.summary.unit_count, 40);
assert.equal(cp347Coverage.summary.by_micro_phase["RP11.P04.M04"], 20);
assert.equal(cp347Slice.valid, true, cp347Slice.errors.join("; "));
assert.equal(cp347CaseSet.section_count, 3);
for (const [microId, titles] of Object.entries(TIME_EXPENSE_CORE_CP347_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp347CaseSet.sections[microId].rows[timeExpenseCoreRowKey(title)];
    assert.ok(row, `CP00-347 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  timeExpenseContract.ui_workflow_slice_descriptor,
  JSON.parse(JSON.stringify(cp347Descriptor)),
  "contract ui_workflow_slice_descriptor drift",
);
assert.deepEqual(timeExpenseContract.cp347_requirements, JSON.parse(JSON.stringify(TIME_EXPENSE_CORE_CP347_REQUIREMENTS)));
assert.deepEqual(timeExpenseContract.cp347_no_write_attestation, JSON.parse(JSON.stringify(TIME_EXPENSE_CORE_CP347_NO_WRITE_ATTESTATION)));
assert.equal(cp347Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp347Hermes.production_ready_candidate, true);
assert.equal(cp347Claude.review_packet, "C11.CP00-347.time_expense_core_ui_workflow_slice_descriptor");
assert.equal(cp347Claude.read_only, true);
assert.equal(cp347Handoff.to_pack_id, "CP00-348");
assert.equal(cp347Handoff.next_subphase_id, "RP11.P04.M05.S06");
assert.equal(cp348Coverage.valid, true, cp348Coverage.errors.join("; "));
assert.equal(cp348Coverage.summary.unit_count, 10);
assert.equal(cp348Coverage.summary.by_micro_phase["RP11.P04.M05"], 10);
assert.equal(cp348Slice.valid, true, cp348Slice.errors.join("; "));
assert.equal(cp348CaseSet.section_count, 1);
for (const [microId, titles] of Object.entries(TIME_EXPENSE_CORE_CP348_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp348CaseSet.sections[microId].rows[timeExpenseCoreRowKey(title)];
    assert.ok(row, `CP00-348 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  timeExpenseContract.ui_binding_slice_descriptor,
  JSON.parse(JSON.stringify(cp348Descriptor)),
  "contract ui_binding_slice_descriptor drift",
);
assert.deepEqual(timeExpenseContract.cp348_requirements, JSON.parse(JSON.stringify(TIME_EXPENSE_CORE_CP348_REQUIREMENTS)));
assert.deepEqual(timeExpenseContract.cp348_no_write_attestation, JSON.parse(JSON.stringify(TIME_EXPENSE_CORE_CP348_NO_WRITE_ATTESTATION)));
assert.equal(cp348Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp348Hermes.production_ready_candidate, true);
assert.equal(cp348Claude.review_packet, "C11.CP00-348.time_expense_core_ui_binding_slice_descriptor");
assert.equal(cp348Claude.read_only, true);
assert.equal(cp348Handoff.to_pack_id, "CP00-349");
assert.equal(cp348Handoff.next_subphase_id, "RP11.P04.M05.S16");
assert.equal(cp349Coverage.valid, true, cp349Coverage.errors.join("; "));
assert.equal(cp349Coverage.summary.unit_count, 10);
assert.equal(cp349Coverage.summary.by_micro_phase["RP11.P04.M06"], 5);
assert.equal(cp349Tail.valid, true, cp349Tail.errors.join("; "));
assert.equal(cp349CaseSet.section_count, 2);
for (const [microId, titles] of Object.entries(TIME_EXPENSE_CORE_CP349_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp349CaseSet.sections[microId].rows[timeExpenseCoreRowKey(title)];
    assert.ok(row, `CP00-349 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  timeExpenseContract.ui_binding_tail_descriptor,
  JSON.parse(JSON.stringify(cp349Descriptor)),
  "contract ui_binding_tail_descriptor drift",
);
assert.deepEqual(timeExpenseContract.cp349_requirements, JSON.parse(JSON.stringify(TIME_EXPENSE_CORE_CP349_REQUIREMENTS)));
assert.deepEqual(timeExpenseContract.cp349_no_write_attestation, JSON.parse(JSON.stringify(TIME_EXPENSE_CORE_CP349_NO_WRITE_ATTESTATION)));
assert.equal(cp349Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp349Hermes.production_ready_candidate, true);
assert.equal(cp349Claude.review_packet, "C11.CP00-349.time_expense_core_ui_binding_tail_descriptor");
assert.equal(cp349Claude.read_only, true);
assert.equal(cp349Handoff.to_pack_id, "CP00-350");
assert.equal(cp349Handoff.next_subphase_id, "RP11.P04.M06.S06");
assert.equal(cp350Coverage.valid, true, cp350Coverage.errors.join("; "));
assert.equal(cp350Coverage.summary.unit_count, 150);
assert.equal(cp350Coverage.summary.by_phase["RP11.P04"], 83);
assert.equal(cp350Coverage.summary.by_phase["RP11.P05"], 67);
assert.equal(cp350Foundation.valid, true, cp350Foundation.errors.join("; "));
assert.equal(cp350CaseSet.section_count, 11);
for (const [microId, titles] of Object.entries(TIME_EXPENSE_CORE_CP350_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp350CaseSet.sections[microId].rows[timeExpenseCoreRowKey(title)];
    assert.ok(row, `CP00-350 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  timeExpenseContract.p04_closeout_p05_fixture_foundation_descriptor,
  JSON.parse(JSON.stringify(cp350Descriptor)),
  "contract p04_closeout_p05_fixture_foundation_descriptor drift",
);
assert.deepEqual(timeExpenseContract.cp350_requirements, JSON.parse(JSON.stringify(TIME_EXPENSE_CORE_CP350_REQUIREMENTS)));
assert.deepEqual(timeExpenseContract.cp350_no_write_attestation, JSON.parse(JSON.stringify(TIME_EXPENSE_CORE_CP350_NO_WRITE_ATTESTATION)));
assert.equal(cp350Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp350Hermes.production_ready_candidate, true);
assert.equal(cp350Claude.review_packet, "C11.CP00-350.time_expense_core_p04_closeout_p05_fixture_foundation_descriptor");
assert.equal(cp350Claude.read_only, true);
assert.equal(cp350Handoff.to_pack_id, "CP00-351");
assert.equal(cp350Handoff.next_subphase_id, "RP11.P05.M05.S08");
assert.equal(cp351Coverage.valid, true, cp351Coverage.errors.join("; "));
assert.equal(cp351Coverage.summary.unit_count, 10);
assert.equal(cp351Coverage.summary.by_micro_phase["RP11.P05.M05"], 10);
assert.equal(cp351Slice.valid, true, cp351Slice.errors.join("; "));
assert.equal(cp351CaseSet.section_count, 1);
for (const [microId, titles] of Object.entries(TIME_EXPENSE_CORE_CP351_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp351CaseSet.sections[microId].rows[timeExpenseCoreRowKey(title)];
    assert.ok(row, `CP00-351 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  timeExpenseContract.fixture_slice_descriptor,
  JSON.parse(JSON.stringify(cp351Descriptor)),
  "contract fixture_slice_descriptor drift",
);
assert.deepEqual(timeExpenseContract.cp351_requirements, JSON.parse(JSON.stringify(TIME_EXPENSE_CORE_CP351_REQUIREMENTS)));
assert.deepEqual(timeExpenseContract.cp351_no_write_attestation, JSON.parse(JSON.stringify(TIME_EXPENSE_CORE_CP351_NO_WRITE_ATTESTATION)));
assert.equal(cp351Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp351Hermes.production_ready_candidate, true);
assert.equal(cp351Claude.review_packet, "C11.CP00-351.time_expense_core_fixture_slice_descriptor");
assert.equal(cp351Claude.read_only, true);
assert.equal(cp351Handoff.to_pack_id, "CP00-352");
assert.equal(cp351Handoff.next_subphase_id, "RP11.P05.M05.S18");
assert.equal(cp352Coverage.valid, true, cp352Coverage.errors.join("; "));
assert.equal(cp352Coverage.summary.unit_count, 10);
assert.equal(cp352Coverage.summary.by_micro_phase["RP11.P05.M06"], 7);
assert.equal(cp352Slice.valid, true, cp352Slice.errors.join("; "));
assert.equal(cp352CaseSet.section_count, 2);
for (const [microId, titles] of Object.entries(TIME_EXPENSE_CORE_CP352_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp352CaseSet.sections[microId].rows[timeExpenseCoreRowKey(title)];
    assert.ok(row, `CP00-352 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  timeExpenseContract.fixture_binding_slice_descriptor,
  JSON.parse(JSON.stringify(cp352Descriptor)),
  "contract fixture_binding_slice_descriptor drift",
);
assert.deepEqual(timeExpenseContract.cp352_requirements, JSON.parse(JSON.stringify(TIME_EXPENSE_CORE_CP352_REQUIREMENTS)));
assert.deepEqual(timeExpenseContract.cp352_no_write_attestation, JSON.parse(JSON.stringify(TIME_EXPENSE_CORE_CP352_NO_WRITE_ATTESTATION)));
assert.equal(cp352Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp352Hermes.production_ready_candidate, true);
assert.equal(cp352Claude.review_packet, "C11.CP00-352.time_expense_core_fixture_binding_slice_descriptor");
assert.equal(cp352Claude.read_only, true);
assert.equal(cp352Handoff.to_pack_id, "CP00-353");
assert.equal(cp352Handoff.next_subphase_id, "RP11.P05.M06.S08");
assert.equal(cp353Coverage.valid, true, cp353Coverage.errors.join("; "));
assert.equal(cp353Coverage.summary.unit_count, 150);
assert.equal(cp353Coverage.summary.by_phase["RP11.P05"], 81);
assert.equal(cp353Coverage.summary.by_phase["RP11.P06"], 69);
assert.equal(cp353Foundation.valid, true, cp353Foundation.errors.join("; "));
assert.equal(cp353CaseSet.section_count, 10);
for (const [microId, titles] of Object.entries(TIME_EXPENSE_CORE_CP353_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp353CaseSet.sections[microId].rows[timeExpenseCoreRowKey(title)];
    assert.ok(row, `CP00-353 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  timeExpenseContract.p05_closeout_p06_permission_foundation_descriptor,
  JSON.parse(JSON.stringify(cp353Descriptor)),
  "contract p05_closeout_p06_permission_foundation_descriptor drift",
);
assert.deepEqual(timeExpenseContract.cp353_requirements, JSON.parse(JSON.stringify(TIME_EXPENSE_CORE_CP353_REQUIREMENTS)));
assert.deepEqual(timeExpenseContract.cp353_no_write_attestation, JSON.parse(JSON.stringify(TIME_EXPENSE_CORE_CP353_NO_WRITE_ATTESTATION)));
assert.equal(cp353Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp353Hermes.production_ready_candidate, true);
assert.equal(cp353Claude.review_packet, "C11.CP00-353.time_expense_core_p05_closeout_p06_permission_foundation_descriptor");
assert.equal(cp353Claude.read_only, true);
assert.equal(cp353Handoff.to_pack_id, "CP00-354");
assert.equal(cp353Handoff.next_subphase_id, "RP11.P06.M04.S06");
assert.equal(cp354Coverage.valid, true, cp354Coverage.errors.join("; "));
assert.equal(cp354Coverage.summary.unit_count, 40);
assert.equal(cp354Coverage.summary.by_micro_phase["RP11.P06.M05"], 22);
assert.equal(cp354Slice.valid, true, cp354Slice.errors.join("; "));
assert.equal(cp354CaseSet.section_count, 3);
for (const [microId, titles] of Object.entries(TIME_EXPENSE_CORE_CP354_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp354CaseSet.sections[microId].rows[timeExpenseCoreRowKey(title)];
    assert.ok(row, `CP00-354 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  timeExpenseContract.permission_slice_descriptor,
  JSON.parse(JSON.stringify(cp354Descriptor)),
  "contract permission_slice_descriptor drift",
);
assert.deepEqual(timeExpenseContract.cp354_requirements, JSON.parse(JSON.stringify(TIME_EXPENSE_CORE_CP354_REQUIREMENTS)));
assert.deepEqual(timeExpenseContract.cp354_no_write_attestation, JSON.parse(JSON.stringify(TIME_EXPENSE_CORE_CP354_NO_WRITE_ATTESTATION)));
assert.equal(cp354Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp354Hermes.production_ready_candidate, true);
assert.equal(cp354Claude.review_packet, "C11.CP00-354.time_expense_core_permission_slice_descriptor");
assert.equal(cp354Claude.read_only, true);
assert.equal(cp354Handoff.to_pack_id, "CP00-355");
assert.equal(cp354Handoff.next_subphase_id, "RP11.P06.M06.S04");
assert.equal(cp355Coverage.valid, true, cp355Coverage.errors.join("; "));
assert.equal(cp355Coverage.summary.unit_count, 150);
assert.equal(cp355Coverage.summary.by_phase["RP11.P06"], 90);
assert.equal(cp355Coverage.summary.by_phase["RP11.P07"], 60);
assert.equal(cp355Foundation.valid, true, cp355Foundation.errors.join("; "));
assert.equal(cp355CaseSet.section_count, 9);
for (const [microId, titles] of Object.entries(TIME_EXPENSE_CORE_CP355_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp355CaseSet.sections[microId].rows[timeExpenseCoreRowKey(title)];
    assert.ok(row, `CP00-355 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  timeExpenseContract.p06_closeout_p07_failure_foundation_descriptor,
  JSON.parse(JSON.stringify(cp355Descriptor)),
  "contract p06_closeout_p07_failure_foundation_descriptor drift",
);
assert.deepEqual(timeExpenseContract.cp355_requirements, JSON.parse(JSON.stringify(TIME_EXPENSE_CORE_CP355_REQUIREMENTS)));
assert.deepEqual(timeExpenseContract.cp355_no_write_attestation, JSON.parse(JSON.stringify(TIME_EXPENSE_CORE_CP355_NO_WRITE_ATTESTATION)));
assert.equal(cp355Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp355Hermes.production_ready_candidate, true);
assert.equal(cp355Claude.review_packet, "C11.CP00-355.time_expense_core_p06_closeout_p07_failure_foundation_descriptor");
assert.equal(cp355Claude.read_only, true);
assert.equal(cp355Handoff.to_pack_id, "CP00-356");
assert.equal(cp355Handoff.next_subphase_id, "RP11.P07.M03.S19");
assert.equal(cp356Coverage.valid, true, cp356Coverage.errors.join("; "));
assert.equal(cp356Coverage.summary.unit_count, 10);
assert.equal(cp356Coverage.summary.by_micro_phase["RP11.P07.M04"], 6);
assert.equal(cp356Slice.valid, true, cp356Slice.errors.join("; "));
assert.equal(cp356CaseSet.section_count, 2);
for (const [microId, titles] of Object.entries(TIME_EXPENSE_CORE_CP356_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp356CaseSet.sections[microId].rows[timeExpenseCoreRowKey(title)];
    assert.ok(row, `CP00-356 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  timeExpenseContract.failure_slice_descriptor,
  JSON.parse(JSON.stringify(cp356Descriptor)),
  "contract failure_slice_descriptor drift",
);
assert.deepEqual(timeExpenseContract.cp356_requirements, JSON.parse(JSON.stringify(TIME_EXPENSE_CORE_CP356_REQUIREMENTS)));
assert.deepEqual(timeExpenseContract.cp356_no_write_attestation, JSON.parse(JSON.stringify(TIME_EXPENSE_CORE_CP356_NO_WRITE_ATTESTATION)));
assert.equal(cp356Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp356Hermes.production_ready_candidate, true);
assert.equal(cp356Claude.review_packet, "C11.CP00-356.time_expense_core_failure_slice_descriptor");
assert.equal(cp356Claude.read_only, true);
assert.equal(cp356Handoff.to_pack_id, "CP00-357");
assert.equal(cp356Handoff.next_subphase_id, "RP11.P07.M04.S07");
assert.equal(cp357Coverage.valid, true, cp357Coverage.errors.join("; "));
assert.equal(cp357Coverage.summary.unit_count, 10);
assert.equal(cp357Coverage.summary.by_micro_phase["RP11.P07.M04"], 10);
assert.equal(cp357Slice.valid, true, cp357Slice.errors.join("; "));
assert.equal(cp357CaseSet.section_count, 1);
for (const [microId, titles] of Object.entries(TIME_EXPENSE_CORE_CP357_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp357CaseSet.sections[microId].rows[timeExpenseCoreRowKey(title)];
    assert.ok(row, `CP00-357 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  timeExpenseContract.failure_binding_slice_descriptor,
  JSON.parse(JSON.stringify(cp357Descriptor)),
  "contract failure_binding_slice_descriptor drift",
);
assert.deepEqual(timeExpenseContract.cp357_requirements, JSON.parse(JSON.stringify(TIME_EXPENSE_CORE_CP357_REQUIREMENTS)));
assert.deepEqual(timeExpenseContract.cp357_no_write_attestation, JSON.parse(JSON.stringify(TIME_EXPENSE_CORE_CP357_NO_WRITE_ATTESTATION)));
assert.equal(cp357Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp357Hermes.production_ready_candidate, true);
assert.equal(cp357Claude.review_packet, "C11.CP00-357.time_expense_core_failure_binding_slice_descriptor");
assert.equal(cp357Claude.read_only, true);
assert.equal(cp357Handoff.to_pack_id, "CP00-358");
assert.equal(cp357Handoff.next_subphase_id, "RP11.P07.M04.S17");
assert.equal(cp358Coverage.valid, true, cp358Coverage.errors.join("; "));
assert.equal(cp358Coverage.summary.unit_count, 40);
assert.equal(cp358Coverage.summary.by_micro_phase["RP11.P07.M05"], 22);
assert.equal(cp358Slice.valid, true, cp358Slice.errors.join("; "));
assert.equal(cp358CaseSet.section_count, 3);
for (const [microId, titles] of Object.entries(TIME_EXPENSE_CORE_CP358_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp358CaseSet.sections[microId].rows[timeExpenseCoreRowKey(title)];
    assert.ok(row, `CP00-358 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  timeExpenseContract.failure_tail_slice_descriptor,
  JSON.parse(JSON.stringify(cp358Descriptor)),
  "contract failure_tail_slice_descriptor drift",
);
assert.deepEqual(timeExpenseContract.cp358_requirements, JSON.parse(JSON.stringify(TIME_EXPENSE_CORE_CP358_REQUIREMENTS)));
assert.deepEqual(timeExpenseContract.cp358_no_write_attestation, JSON.parse(JSON.stringify(TIME_EXPENSE_CORE_CP358_NO_WRITE_ATTESTATION)));
assert.equal(cp358Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp358Hermes.production_ready_candidate, true);
assert.equal(cp358Claude.review_packet, "C11.CP00-358.time_expense_core_failure_tail_slice_descriptor");
assert.equal(cp358Claude.read_only, true);
assert.equal(cp358Handoff.to_pack_id, "CP00-359");
assert.equal(cp358Handoff.next_subphase_id, "RP11.P07.M06.S15");
assert.equal(cp359Coverage.valid, true, cp359Coverage.errors.join("; "));
assert.equal(cp359Coverage.summary.unit_count, 10);
assert.equal(cp359Coverage.summary.by_micro_phase["RP11.P07.M06"], 6);
assert.equal(cp359Slice.valid, true, cp359Slice.errors.join("; "));
assert.equal(cp359CaseSet.section_count, 2);
for (const [microId, titles] of Object.entries(TIME_EXPENSE_CORE_CP359_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp359CaseSet.sections[microId].rows[timeExpenseCoreRowKey(title)];
    assert.ok(row, `CP00-359 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  timeExpenseContract.failure_fixture_slice_descriptor,
  JSON.parse(JSON.stringify(cp359Descriptor)),
  "contract failure_fixture_slice_descriptor drift",
);
assert.deepEqual(timeExpenseContract.cp359_requirements, JSON.parse(JSON.stringify(TIME_EXPENSE_CORE_CP359_REQUIREMENTS)));
assert.deepEqual(timeExpenseContract.cp359_no_write_attestation, JSON.parse(JSON.stringify(TIME_EXPENSE_CORE_CP359_NO_WRITE_ATTESTATION)));
assert.equal(cp359Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp359Hermes.production_ready_candidate, true);
assert.equal(cp359Claude.review_packet, "C11.CP00-359.time_expense_core_failure_fixture_slice_descriptor");
assert.equal(cp359Claude.read_only, true);
assert.equal(cp359Handoff.to_pack_id, "CP00-360");
assert.equal(cp359Handoff.next_subphase_id, "RP11.P07.M07.S05");
assert.equal(cp360Coverage.valid, true, cp360Coverage.errors.join("; "));
assert.equal(cp360Coverage.summary.unit_count, 40);
assert.equal(cp360Coverage.summary.by_micro_phase["RP11.P07.M08"], 20);
assert.equal(cp360Slice.valid, true, cp360Slice.errors.join("; "));
assert.equal(cp360CaseSet.section_count, 3);
for (const [microId, titles] of Object.entries(TIME_EXPENSE_CORE_CP360_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp360CaseSet.sections[microId].rows[timeExpenseCoreRowKey(title)];
    assert.ok(row, `CP00-360 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  timeExpenseContract.failure_hermes_slice_descriptor,
  JSON.parse(JSON.stringify(cp360Descriptor)),
  "contract failure_hermes_slice_descriptor drift",
);
assert.deepEqual(timeExpenseContract.cp360_requirements, JSON.parse(JSON.stringify(TIME_EXPENSE_CORE_CP360_REQUIREMENTS)));
assert.deepEqual(timeExpenseContract.cp360_no_write_attestation, JSON.parse(JSON.stringify(TIME_EXPENSE_CORE_CP360_NO_WRITE_ATTESTATION)));
assert.equal(cp360Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp360Hermes.production_ready_candidate, true);
assert.equal(cp360Claude.review_packet, "C11.CP00-360.time_expense_core_failure_hermes_slice_descriptor");
assert.equal(cp360Claude.read_only, true);
assert.equal(cp360Handoff.to_pack_id, "CP00-361");
assert.equal(cp360Handoff.next_subphase_id, "RP11.P07.M09.S03");
assert.equal(cp361Coverage.valid, true, cp361Coverage.errors.join("; "));
assert.equal(cp361Coverage.summary.unit_count, 150);
assert.equal(cp361Coverage.summary.by_phase["RP11.P07"], 29);
assert.equal(cp361Coverage.summary.by_phase["RP11.P08"], 121);
assert.equal(cp361Foundation.valid, true, cp361Foundation.errors.join("; "));
assert.equal(cp361CaseSet.section_count, 11);
for (const [microId, titles] of Object.entries(TIME_EXPENSE_CORE_CP361_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp361CaseSet.sections[microId].rows[timeExpenseCoreRowKey(title)];
    assert.ok(row, `CP00-361 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  timeExpenseContract.p07_closeout_p08_hermes_foundation_descriptor,
  JSON.parse(JSON.stringify(cp361Descriptor)),
  "contract p07_closeout_p08_hermes_foundation_descriptor drift",
);
assert.deepEqual(timeExpenseContract.cp361_requirements, JSON.parse(JSON.stringify(TIME_EXPENSE_CORE_CP361_REQUIREMENTS)));
assert.deepEqual(timeExpenseContract.cp361_no_write_attestation, JSON.parse(JSON.stringify(TIME_EXPENSE_CORE_CP361_NO_WRITE_ATTESTATION)));
assert.equal(cp361Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp361Hermes.production_ready_candidate, true);
assert.equal(cp361Claude.review_packet, "C11.CP00-361.time_expense_core_p07_closeout_p08_hermes_foundation_descriptor");
assert.equal(cp361Claude.read_only, true);
assert.equal(cp361Handoff.to_pack_id, "CP00-362");
assert.equal(cp361Handoff.next_subphase_id, "RP11.P08.M08.S02");
assert.equal(cp362Coverage.valid, true, cp362Coverage.errors.join("; "));
assert.equal(cp362Coverage.summary.unit_count, 150);
assert.equal(cp362Coverage.summary.by_phase["RP11.P08"], 47);
assert.equal(cp362Coverage.summary.by_phase["RP11.P09"], 103);
assert.equal(cp362Foundation.valid, true, cp362Foundation.errors.join("; "));
assert.equal(cp362CaseSet.section_count, 12);
for (const [microId, titles] of Object.entries(TIME_EXPENSE_CORE_CP362_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp362CaseSet.sections[microId].rows[timeExpenseCoreRowKey(title)];
    assert.ok(row, `CP00-362 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  timeExpenseContract.p08_closeout_p09_review_foundation_descriptor,
  JSON.parse(JSON.stringify(cp362Descriptor)),
  "contract p08_closeout_p09_review_foundation_descriptor drift",
);
assert.deepEqual(timeExpenseContract.cp362_requirements, JSON.parse(JSON.stringify(TIME_EXPENSE_CORE_CP362_REQUIREMENTS)));
assert.deepEqual(timeExpenseContract.cp362_no_write_attestation, JSON.parse(JSON.stringify(TIME_EXPENSE_CORE_CP362_NO_WRITE_ATTESTATION)));
assert.equal(cp362Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp362Hermes.production_ready_candidate, true);
assert.equal(cp362Claude.review_packet, "C11.CP00-362.time_expense_core_p08_closeout_p09_review_foundation_descriptor");
assert.equal(cp362Claude.read_only, true);
assert.equal(cp362Handoff.to_pack_id, "CP00-363");
assert.equal(cp362Handoff.next_subphase_id, "RP11.P09.M09.S01");
assert.equal(cp363Coverage.valid, true, cp363Coverage.errors.join("; "));
assert.equal(cp363Coverage.summary.unit_count, 12);
assert.equal(cp363Coverage.summary.by_micro_phase["RP11.P09.M09"], 8);
assert.equal(cp363Coverage.summary.by_micro_phase["RP11.P09.M10"], 4);
assert.equal(cp363Slice.valid, true, cp363Slice.errors.join("; "));
assert.equal(cp363CaseSet.section_count, 2);
for (const [microId, titles] of Object.entries(TIME_EXPENSE_CORE_CP363_REQUIREMENTS.required_section_rows)) {
  for (const title of titles) {
    const row = cp363CaseSet.sections[microId].rows[timeExpenseCoreRowKey(title)];
    assert.ok(row, `CP00-363 ${microId} missing row ${title}`);
    assert.equal(row.descriptor_only, true);
    assert.equal(row.runtime_execution, false);
  }
}
assert.deepEqual(
  timeExpenseContract.review_closeout_slice_descriptor,
  JSON.parse(JSON.stringify(cp363Descriptor)),
  "contract review_closeout_slice_descriptor drift",
);
assert.deepEqual(timeExpenseContract.cp363_requirements, JSON.parse(JSON.stringify(TIME_EXPENSE_CORE_CP363_REQUIREMENTS)));
assert.deepEqual(timeExpenseContract.cp363_no_write_attestation, JSON.parse(JSON.stringify(TIME_EXPENSE_CORE_CP363_NO_WRITE_ATTESTATION)));
assert.equal(cp363Descriptor.authority_boundary.claude_is_final_approval, false);
assert.equal(cp363Hermes.production_ready_candidate, true);
assert.equal(cp363Claude.review_packet, "C11.CP00-363.time_expense_core_review_closeout_slice_descriptor");
assert.equal(cp363Claude.read_only, true);
assert.equal(cp363Handoff.to_pack_id, "CP00-364");
assert.equal(cp363Handoff.next_subphase_id, "RP12.P00.M00.S01");
assert.equal(TIME_EXPENSE_CORE_CP363_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(TIME_EXPENSE_CORE_CP363_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(TIME_EXPENSE_CORE_CP362_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(TIME_EXPENSE_CORE_CP362_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(TIME_EXPENSE_CORE_CP361_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(TIME_EXPENSE_CORE_CP361_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(TIME_EXPENSE_CORE_CP360_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(TIME_EXPENSE_CORE_CP360_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(TIME_EXPENSE_CORE_CP359_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(TIME_EXPENSE_CORE_CP359_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(TIME_EXPENSE_CORE_CP358_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(TIME_EXPENSE_CORE_CP358_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(TIME_EXPENSE_CORE_CP357_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(TIME_EXPENSE_CORE_CP357_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(TIME_EXPENSE_CORE_CP356_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(TIME_EXPENSE_CORE_CP356_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(TIME_EXPENSE_CORE_CP355_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(TIME_EXPENSE_CORE_CP355_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(TIME_EXPENSE_CORE_CP354_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(TIME_EXPENSE_CORE_CP354_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(TIME_EXPENSE_CORE_CP353_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(TIME_EXPENSE_CORE_CP353_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(TIME_EXPENSE_CORE_CP352_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(TIME_EXPENSE_CORE_CP352_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(TIME_EXPENSE_CORE_CP351_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(TIME_EXPENSE_CORE_CP351_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(TIME_EXPENSE_CORE_CP350_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(TIME_EXPENSE_CORE_CP350_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(TIME_EXPENSE_CORE_CP349_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(TIME_EXPENSE_CORE_CP349_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(TIME_EXPENSE_CORE_CP348_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(TIME_EXPENSE_CORE_CP348_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(TIME_EXPENSE_CORE_CP347_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(TIME_EXPENSE_CORE_CP347_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(TIME_EXPENSE_CORE_CP346_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(TIME_EXPENSE_CORE_CP346_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(TIME_EXPENSE_CORE_CP345_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(TIME_EXPENSE_CORE_CP345_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(TIME_EXPENSE_CORE_CP344_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(TIME_EXPENSE_CORE_CP344_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(TIME_EXPENSE_CORE_CP343_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(TIME_EXPENSE_CORE_CP343_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(TIME_EXPENSE_CORE_CP342_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(TIME_EXPENSE_CORE_CP342_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

assert.ok(Array.isArray(timeExpenseContract.historical_pack_bindings));
assert.equal(timeExpenseContract.historical_pack_bindings.at(-1).pack_id, "CP00-363");

console.log(
  JSON.stringify(
    {
      ok: true,
      validator: "rp11:time-expense-core:validate",
      pack_id: TIME_EXPENSE_CORE_CP363_PACK_BINDING.pack_id,
      covered_units: cp363Coverage.summary.unit_count,
      program_id: TIME_EXPENSE_CORE_PROGRAM_CONTRACT.program_id,
      hermes_gate: cp363Hermes.gate,
      claude_gate: timeExpenseContract.current_pack.claude_gate,
      source_p08_closeout_p09_review_foundation_pack_id: TIME_EXPENSE_CORE_CP363_PACK_BINDING.upstream_pack_id,
      scope_contract_foundation_units_preserved: cp342Coverage.summary.unit_count,
      p01_closeout_p02_service_foundation_units_preserved: cp343Coverage.summary.unit_count,
      service_slice_units_preserved: cp344Coverage.summary.unit_count,
      service_binding_slice_units_preserved: cp345Coverage.summary.unit_count,
      p02_closeout_p03_interface_p04_ui_foundation_units_preserved: cp346Coverage.summary.unit_count,
      ui_workflow_slice_units_preserved: cp347Coverage.summary.unit_count,
      ui_binding_slice_units_preserved: cp348Coverage.summary.unit_count,
      ui_binding_tail_units_preserved: cp349Coverage.summary.unit_count,
      p04_closeout_p05_fixture_foundation_units_preserved: cp350Coverage.summary.unit_count,
      fixture_slice_units_preserved: cp351Coverage.summary.unit_count,
      fixture_binding_slice_units_preserved: cp352Coverage.summary.unit_count,
      p05_closeout_p06_permission_foundation_units_preserved: cp353Coverage.summary.unit_count,
      permission_slice_units_preserved: cp354Coverage.summary.unit_count,
      p06_closeout_p07_failure_foundation_units_preserved: cp355Coverage.summary.unit_count,
      failure_slice_units_preserved: cp356Coverage.summary.unit_count,
      failure_binding_slice_units_preserved: cp357Coverage.summary.unit_count,
      failure_tail_slice_units_preserved: cp358Coverage.summary.unit_count,
      failure_fixture_slice_units_preserved: cp359Coverage.summary.unit_count,
      failure_hermes_slice_units_preserved: cp360Coverage.summary.unit_count,
      p07_closeout_p08_hermes_foundation_units_preserved: cp361Coverage.summary.unit_count,
      p08_closeout_p09_review_foundation_units_preserved: cp362Coverage.summary.unit_count,
      next_pack_id: cp363Handoff.to_pack_id,
      production_ready_candidate: cp363Hermes.production_ready_candidate,
    },
    null,
    2,
  ),
);
