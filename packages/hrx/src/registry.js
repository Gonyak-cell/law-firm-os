function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

function unique(items) {
  return Object.freeze([...new Set(items)]);
}

export function hrxRowKey(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export const HRX_PROGRAM_CONTRACT = deepFreeze({
  program_id: "RP30",
  program_title: "People HR Evidence (HRX Embedded)",
  program_scope: "embedded People/HR evidence, HR documents, rule metadata, sensitive HR guards, and HR audit evidence inside Law Firm OS",
  package_name: "hrx-people",
  contract_ref: "contracts/hrx-people-contract.json",
  upstream_program_id: "RP29",
  upstream_scope: "Commercial Readiness",
  hermes_gate: "H30",
  claude_gate: "C30",
  hrx_embedded: true,
  separate_product: false,
  source_ledgers: [
    "docs/rp30-people-hr-evidence-detailed-microphases.json",
    "docs/hrx-requirement-ledger.json",
    "docs/hrx-weighted-implementation-ledger.json",
  ],
  entities: [
    "Employee",
    "EmploymentProfile",
    "HRDocument",
    "EmploymentContract",
    "CompensationRecord",
    "LeaveBalance",
    "LeaveRequest",
    "AttendanceRecord",
    "OvertimeRecord",
    "HRPolicy",
    "Candidate",
    "JobOpening",
    "Interview",
    "OnboardingPlan",
    "OffboardingPlan",
    "HRRiskEvent",
  ],
  workflows: [
    "employee registry",
    "hr document workspace",
    "leave and attendance approval",
    "recruitment evidence",
    "onboarding offboarding checklist",
    "hr risk review",
  ],
});

export const HRX_NO_WRITE_ATTESTATION = deepFreeze({
  descriptor_only: true,
  runtime_execution: false,
  payroll_calculation_runtime_executed: false,
  hr_ai_final_judgment_executed: false,
  permission_decision_written: false,
  audit_event_written: false,
  product_state_written: false,
  runtime_receipt_emitted: false,
  separate_hrx_product_created: false,
  real_employee_data_included: false,
  real_candidate_data_included: false,
  real_payroll_data_included: false,
  real_client_data_included: false,
  credential_or_secret_included: false,
  local_validation_claims_enterprise_trust: false,
});

export const HRX_CP897_PACK_BINDING = deepFreeze({
  pack_id: "CP00-897",
  planned_pack_id: "CP00-897",
  risk_class: "A",
  unit_count: 10,
  first_unit_id: "RP30.P00.M00.S01",
  last_unit_id: "RP30.P00.M05.S02",
  range: "RP30.P00.M00.S01-RP30.P00.M05.S02",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-896",
  next_pack_id: "CP00-898",
  next_subphase_id: "RP30.P00.M06.S01",
  production_ready_flag: "hrx_contract_acceptance_baseline_descriptor_verified",
  hermes_gate: "H30",
  claude_gate: "C30",
});

export const HRX_CP898_PACK_BINDING = deepFreeze({
  pack_id: "CP00-898",
  planned_pack_id: "CP00-898",
  risk_class: "A",
  unit_count: 10,
  first_unit_id: "RP30.P00.M06.S01",
  last_unit_id: "RP30.P00.M09.S01",
  range: "RP30.P00.M06.S01-RP30.P00.M09.S01",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-897",
  next_pack_id: "CP00-899",
  next_subphase_id: "RP30.P00.M09.S02",
  production_ready_flag: "hrx_contract_acceptance_baseline_continuation_descriptor_verified",
  hermes_gate: "H30",
  claude_gate: "C30",
});

export const HRX_CP899_PACK_BINDING = deepFreeze({
  pack_id: "CP00-899",
  planned_pack_id: "CP00-899",
  risk_class: "A",
  unit_count: 10,
  first_unit_id: "RP30.P00.M09.S02",
  last_unit_id: "RP30.P01.M01.S02",
  range: "RP30.P00.M09.S02-RP30.P01.M01.S02",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-898",
  next_pack_id: "CP00-900",
  next_subphase_id: "RP30.P01.M01.S03",
  production_ready_flag: "hrx_domain_employee_profile_bridge_descriptor_verified",
  hermes_gate: "H30",
  claude_gate: "C30",
});

export const HRX_CP900_PACK_BINDING = deepFreeze({
  pack_id: "CP00-900",
  planned_pack_id: "CP00-900",
  risk_class: "A",
  unit_count: 10,
  first_unit_id: "RP30.P01.M01.S03",
  last_unit_id: "RP30.P01.M03.S02",
  range: "RP30.P01.M01.S03-RP30.P01.M03.S02",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-899",
  next_pack_id: "CP00-901",
  next_subphase_id: "RP30.P01.M03.S03",
  production_ready_flag: "hrx_hr_document_contract_bridge_descriptor_verified",
  hermes_gate: "H30",
  claude_gate: "C30",
});

export const HRX_CP901_PACK_BINDING = deepFreeze({
  pack_id: "CP00-901",
  planned_pack_id: "CP00-901",
  risk_class: "A",
  unit_count: 10,
  first_unit_id: "RP30.P01.M03.S03",
  last_unit_id: "RP30.P01.M05.S02",
  range: "RP30.P01.M03.S03-RP30.P01.M05.S02",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-900",
  next_pack_id: "CP00-902",
  next_subphase_id: "RP30.P01.M05.S03",
  production_ready_flag: "hrx_contract_compensation_graph_bridge_descriptor_verified",
  hermes_gate: "H30",
  claude_gate: "C30",
});

export const HRX_CP902_PACK_BINDING = deepFreeze({
  pack_id: "CP00-902",
  planned_pack_id: "CP00-902",
  risk_class: "A",
  unit_count: 10,
  first_unit_id: "RP30.P01.M05.S03",
  last_unit_id: "RP30.P01.M06.S03",
  range: "RP30.P01.M05.S03-RP30.P01.M06.S03",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-901",
  next_pack_id: "CP00-903",
  next_subphase_id: "RP30.P01.M06.S04",
  production_ready_flag: "hrx_people_graph_employee_bridge_descriptor_verified",
  hermes_gate: "H30",
  claude_gate: "C30",
});

export const HRX_CP903_PACK_BINDING = deepFreeze({
  pack_id: "CP00-903",
  planned_pack_id: "CP00-903",
  risk_class: "A",
  unit_count: 10,
  first_unit_id: "RP30.P01.M06.S04",
  last_unit_id: "RP30.P01.M08.S03",
  range: "RP30.P01.M06.S04-RP30.P01.M08.S03",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-902",
  next_pack_id: "CP00-904",
  next_subphase_id: "RP30.P01.M08.S04",
  production_ready_flag: "hrx_employee_profile_document_bridge_descriptor_verified",
  hermes_gate: "H30",
  claude_gate: "C30",
});

export const HRX_CP904_PACK_BINDING = deepFreeze({
  pack_id: "CP00-904",
  planned_pack_id: "CP00-904",
  risk_class: "A",
  unit_count: 10,
  first_unit_id: "RP30.P01.M08.S04",
  last_unit_id: "RP30.P01.M10.S03",
  range: "RP30.P01.M08.S04-RP30.P01.M10.S03",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-903",
  next_pack_id: "CP00-905",
  next_subphase_id: "RP30.P01.M10.S04",
  production_ready_flag: "hrx_document_contract_compensation_bridge_descriptor_verified",
  hermes_gate: "H30",
  claude_gate: "C30",
});

export const HRX_CP905_PACK_BINDING = deepFreeze({
  pack_id: "CP00-905",
  planned_pack_id: "CP00-905",
  risk_class: "A",
  unit_count: 10,
  first_unit_id: "RP30.P01.M10.S04",
  last_unit_id: "RP30.P02.M00.S08",
  range: "RP30.P01.M10.S04-RP30.P02.M00.S08",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-904",
  next_pack_id: "CP00-906",
  next_subphase_id: "RP30.P02.M00.S09",
  production_ready_flag: "hrx_compensation_rule_engine_bridge_descriptor_verified",
  hermes_gate: "H30",
  claude_gate: "C30",
});

export const HRX_CP906_PACK_BINDING = deepFreeze({
  pack_id: "CP00-906",
  planned_pack_id: "CP00-906",
  risk_class: "A",
  unit_count: 10,
  first_unit_id: "RP30.P02.M00.S09",
  last_unit_id: "RP30.P02.M01.S05",
  range: "RP30.P02.M00.S09-RP30.P02.M01.S05",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-905",
  next_pack_id: "CP00-907",
  next_subphase_id: "RP30.P02.M01.S06",
  production_ready_flag: "hrx_rule_engine_leave_workflow_bridge_descriptor_verified",
  hermes_gate: "H30",
  claude_gate: "C30",
});

export const HRX_CP907_PACK_BINDING = deepFreeze({
  pack_id: "CP00-907",
  planned_pack_id: "CP00-907",
  risk_class: "A",
  unit_count: 10,
  first_unit_id: "RP30.P02.M01.S06",
  last_unit_id: "RP30.P02.M02.S02",
  range: "RP30.P02.M01.S06-RP30.P02.M02.S02",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-906",
  next_pack_id: "CP00-908",
  next_subphase_id: "RP30.P02.M02.S03",
  production_ready_flag: "hrx_leave_attendance_workflow_bridge_descriptor_verified",
  hermes_gate: "H30",
  claude_gate: "C30",
});

export const HRX_CP908_PACK_BINDING = deepFreeze({
  pack_id: "CP00-908",
  planned_pack_id: "CP00-908",
  risk_class: "A",
  unit_count: 10,
  first_unit_id: "RP30.P02.M02.S03",
  last_unit_id: "RP30.P02.M02.S12",
  range: "RP30.P02.M02.S03-RP30.P02.M02.S12",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-907",
  next_pack_id: "CP00-909",
  next_subphase_id: "RP30.P02.M02.S13",
  production_ready_flag: "hrx_attendance_workflow_tail_descriptor_verified",
  hermes_gate: "H30",
  claude_gate: "C30",
});

export const HRX_CP909_PACK_BINDING = deepFreeze({
  pack_id: "CP00-909",
  planned_pack_id: "CP00-909",
  risk_class: "A",
  unit_count: 10,
  first_unit_id: "RP30.P02.M02.S13",
  last_unit_id: "RP30.P02.M03.S09",
  range: "RP30.P02.M02.S13-RP30.P02.M03.S09",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-908",
  next_pack_id: "CP00-910",
  next_subphase_id: "RP30.P02.M03.S10",
  production_ready_flag: "hrx_attendance_recruitment_workflow_bridge_descriptor_verified",
  hermes_gate: "H30",
  claude_gate: "C30",
});

export const HRX_CP910_PACK_BINDING = deepFreeze({
  pack_id: "CP00-910",
  planned_pack_id: "CP00-910",
  risk_class: "A",
  unit_count: 10,
  first_unit_id: "RP30.P02.M03.S10",
  last_unit_id: "RP30.P02.M04.S06",
  range: "RP30.P02.M03.S10-RP30.P02.M04.S06",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-909",
  next_pack_id: "CP00-911",
  next_subphase_id: "RP30.P02.M04.S07",
  production_ready_flag: "hrx_recruitment_risk_workflow_bridge_descriptor_verified",
  hermes_gate: "H30",
  claude_gate: "C30",
});

export const HRX_CP911_PACK_BINDING = deepFreeze({
  pack_id: "CP00-911",
  planned_pack_id: "CP00-911",
  risk_class: "A",
  unit_count: 10,
  first_unit_id: "RP30.P02.M04.S07",
  last_unit_id: "RP30.P02.M05.S04",
  range: "RP30.P02.M04.S07-RP30.P02.M05.S04",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-910",
  next_pack_id: "CP00-912",
  next_subphase_id: "RP30.P02.M05.S05",
  production_ready_flag: "hrx_risk_approval_workflow_bridge_descriptor_verified",
  hermes_gate: "H30",
  claude_gate: "C30",
});

export const HRX_CP912_PACK_BINDING = deepFreeze({
  pack_id: "CP00-912",
  planned_pack_id: "CP00-912",
  risk_class: "A",
  unit_count: 10,
  first_unit_id: "RP30.P02.M05.S05",
  last_unit_id: "RP30.P02.M06.S01",
  range: "RP30.P02.M05.S05-RP30.P02.M06.S01",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-911",
  next_pack_id: "CP00-913",
  next_subphase_id: "RP30.P02.M06.S02",
  production_ready_flag: "hrx_approval_rule_engine_bridge_descriptor_verified",
  hermes_gate: "H30",
  claude_gate: "C30",
});

export const HRX_CP913_PACK_BINDING = deepFreeze({
  pack_id: "CP00-913",
  planned_pack_id: "CP00-913",
  risk_class: "A",
  unit_count: 10,
  first_unit_id: "RP30.P02.M06.S02",
  last_unit_id: "RP30.P02.M06.S11",
  range: "RP30.P02.M06.S02-RP30.P02.M06.S11",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-912",
  next_pack_id: "CP00-914",
  next_subphase_id: "RP30.P02.M06.S12",
  production_ready_flag: "hrx_rule_engine_tail_descriptor_verified",
  hermes_gate: "H30",
  claude_gate: "C30",
});

export const HRX_CP914_PACK_BINDING = deepFreeze({
  pack_id: "CP00-914",
  planned_pack_id: "CP00-914",
  risk_class: "A",
  unit_count: 10,
  first_unit_id: "RP30.P02.M06.S12",
  last_unit_id: "RP30.P02.M07.S09",
  range: "RP30.P02.M06.S12-RP30.P02.M07.S09",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-913",
  next_pack_id: "CP00-915",
  next_subphase_id: "RP30.P02.M07.S10",
  production_ready_flag: "hrx_rule_engine_leave_workflow_tail_bridge_descriptor_verified",
  hermes_gate: "H30",
  claude_gate: "C30",
});

export const HRX_CP915_PACK_BINDING = deepFreeze({
  pack_id: "CP00-915",
  planned_pack_id: "CP00-915",
  risk_class: "A",
  unit_count: 10,
  first_unit_id: "RP30.P02.M07.S10",
  last_unit_id: "RP30.P02.M08.S07",
  range: "RP30.P02.M07.S10-RP30.P02.M08.S07",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-914",
  next_pack_id: "CP00-916",
  next_subphase_id: "RP30.P02.M08.S08",
  production_ready_flag: "hrx_leave_attendance_workflow_tail_bridge_descriptor_verified",
  hermes_gate: "H30",
  claude_gate: "C30",
});

export const HRX_CP916_PACK_BINDING = deepFreeze({
  pack_id: "CP00-916",
  planned_pack_id: "CP00-916",
  risk_class: "A",
  unit_count: 10,
  first_unit_id: "RP30.P02.M08.S08",
  last_unit_id: "RP30.P02.M09.S05",
  range: "RP30.P02.M08.S08-RP30.P02.M09.S05",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-915",
  next_pack_id: "CP00-917",
  next_subphase_id: "RP30.P02.M09.S06",
  production_ready_flag: "hrx_attendance_recruitment_workflow_tail_bridge_descriptor_verified",
  hermes_gate: "H30",
  claude_gate: "C30",
});

export const HRX_CP917_PACK_BINDING = deepFreeze({
  pack_id: "CP00-917",
  planned_pack_id: "CP00-917",
  risk_class: "A",
  unit_count: 10,
  first_unit_id: "RP30.P02.M09.S06",
  last_unit_id: "RP30.P02.M10.S03",
  range: "RP30.P02.M09.S06-RP30.P02.M10.S03",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-916",
  next_pack_id: "CP00-918",
  next_subphase_id: "RP30.P02.M10.S04",
  production_ready_flag: "hrx_recruitment_risk_workflow_tail_bridge_descriptor_verified",
  hermes_gate: "H30",
  claude_gate: "C30",
});

export const HRX_CP918_PACK_BINDING = deepFreeze({
  pack_id: "CP00-918",
  planned_pack_id: "CP00-918",
  risk_class: "A",
  unit_count: 10,
  first_unit_id: "RP30.P02.M10.S04",
  last_unit_id: "RP30.P03.M00.S01",
  range: "RP30.P02.M10.S04-RP30.P03.M00.S01",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-917",
  next_pack_id: "CP00-919",
  next_subphase_id: "RP30.P03.M00.S02",
  production_ready_flag: "hrx_risk_hr_api_foundation_bridge_descriptor_verified",
  hermes_gate: "H30",
  claude_gate: "C30",
});

export const HRX_CP919_PACK_BINDING = deepFreeze({
  pack_id: "CP00-919",
  planned_pack_id: "CP00-919",
  risk_class: "A",
  unit_count: 10,
  first_unit_id: "RP30.P03.M00.S02",
  last_unit_id: "RP30.P03.M02.S01",
  range: "RP30.P03.M00.S02-RP30.P03.M02.S01",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-918",
  next_pack_id: "CP00-920",
  next_subphase_id: "RP30.P03.M02.S02",
  production_ready_flag: "hrx_hr_employee_leave_api_bridge_descriptor_verified",
  hermes_gate: "H30",
  claude_gate: "C30",
});

export const HRX_CP920_PACK_BINDING = deepFreeze({
  pack_id: "CP00-920",
  planned_pack_id: "CP00-920",
  risk_class: "A",
  unit_count: 10,
  first_unit_id: "RP30.P03.M02.S02",
  last_unit_id: "RP30.P03.M04.S01",
  range: "RP30.P03.M02.S02-RP30.P03.M04.S01",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-919",
  next_pack_id: "CP00-921",
  next_subphase_id: "RP30.P03.M04.S02",
  production_ready_flag: "hrx_leave_candidate_evidence_api_bridge_descriptor_verified",
  hermes_gate: "H30",
  claude_gate: "C30",
});

export const HRX_CP921_PACK_BINDING = deepFreeze({
  pack_id: "CP00-921",
  planned_pack_id: "CP00-921",
  risk_class: "A",
  unit_count: 10,
  first_unit_id: "RP30.P03.M04.S02",
  last_unit_id: "RP30.P03.M05.S06",
  range: "RP30.P03.M04.S02-RP30.P03.M05.S06",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-920",
  next_pack_id: "CP00-922",
  next_subphase_id: "RP30.P03.M05.S07",
  production_ready_flag: "hrx_evidence_error_model_bridge_descriptor_verified",
  hermes_gate: "H30",
  claude_gate: "C30",
});

export const HRX_CP922_PACK_BINDING = deepFreeze({
  pack_id: "CP00-922",
  planned_pack_id: "CP00-922",
  risk_class: "A",
  unit_count: 10,
  first_unit_id: "RP30.P03.M05.S07",
  last_unit_id: "RP30.P03.M07.S02",
  range: "RP30.P03.M05.S07-RP30.P03.M07.S02",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-921",
  next_pack_id: "CP00-923",
  next_subphase_id: "RP30.P03.M07.S03",
  production_ready_flag: "hrx_error_model_hr_employee_api_bridge_descriptor_verified",
  hermes_gate: "H30",
  claude_gate: "C30",
});

export const HRX_CP923_PACK_BINDING = deepFreeze({
  pack_id: "CP00-923",
  planned_pack_id: "CP00-923",
  risk_class: "A",
  unit_count: 10,
  first_unit_id: "RP30.P03.M07.S03",
  last_unit_id: "RP30.P03.M09.S02",
  range: "RP30.P03.M07.S03-RP30.P03.M09.S02",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-922",
  next_pack_id: "CP00-924",
  next_subphase_id: "RP30.P03.M09.S03",
  production_ready_flag: "hrx_employee_leave_candidate_api_bridge_descriptor_verified",
  hermes_gate: "H30",
  claude_gate: "C30",
});

export const HRX_CP924_PACK_BINDING = deepFreeze({
  pack_id: "CP00-924",
  planned_pack_id: "CP00-924",
  risk_class: "A",
  unit_count: 10,
  first_unit_id: "RP30.P03.M09.S03",
  last_unit_id: "RP30.P04.M00.S02",
  range: "RP30.P03.M09.S03-RP30.P04.M00.S02",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-923",
  next_pack_id: "CP00-925",
  next_subphase_id: "RP30.P04.M00.S03",
  production_ready_flag: "hrx_candidate_evidence_hr_operations_bridge_descriptor_verified",
  hermes_gate: "H30",
  claude_gate: "C30",
});

export const HRX_CP925_PACK_BINDING = deepFreeze({
  pack_id: "CP00-925",
  planned_pack_id: "CP00-925",
  risk_class: "A",
  unit_count: 10,
  first_unit_id: "RP30.P04.M00.S03",
  last_unit_id: "RP30.P04.M01.S03",
  range: "RP30.P04.M00.S03-RP30.P04.M01.S03",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-924",
  next_pack_id: "CP00-926",
  next_subphase_id: "RP30.P04.M01.S04",
  production_ready_flag: "hrx_hr_operations_employee_portal_bridge_descriptor_verified",
  hermes_gate: "H30",
  claude_gate: "C30",
});

export const HRX_CP926_PACK_BINDING = deepFreeze({
  pack_id: "CP00-926",
  planned_pack_id: "CP00-926",
  risk_class: "A",
  unit_count: 10,
  first_unit_id: "RP30.P04.M01.S04",
  last_unit_id: "RP30.P04.M02.S04",
  range: "RP30.P04.M01.S04-RP30.P04.M02.S04",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-925",
  next_pack_id: "CP00-927",
  next_subphase_id: "RP30.P04.M02.S05",
  production_ready_flag: "hrx_employee_candidate_portal_bridge_descriptor_verified",
  hermes_gate: "H30",
  claude_gate: "C30",
});

export const HRX_CP927_PACK_BINDING = deepFreeze({
  pack_id: "CP00-927",
  planned_pack_id: "CP00-927",
  risk_class: "A",
  unit_count: 10,
  first_unit_id: "RP30.P04.M02.S05",
  last_unit_id: "RP30.P04.M03.S05",
  range: "RP30.P04.M02.S05-RP30.P04.M03.S05",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-926",
  next_pack_id: "CP00-928",
  next_subphase_id: "RP30.P04.M03.S06",
  production_ready_flag: "hrx_candidate_ai_review_queue_bridge_descriptor_verified",
  hermes_gate: "H30",
  claude_gate: "C30",
});

export const HRX_CP928_PACK_BINDING = deepFreeze({
  pack_id: "CP00-928",
  planned_pack_id: "CP00-928",
  risk_class: "A",
  unit_count: 10,
  first_unit_id: "RP30.P04.M03.S06",
  last_unit_id: "RP30.P04.M04.S06",
  range: "RP30.P04.M03.S06-RP30.P04.M04.S06",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-927",
  next_pack_id: "CP00-929",
  next_subphase_id: "RP30.P04.M04.S07",
  production_ready_flag: "hrx_ai_review_admin_policy_bridge_descriptor_verified",
  hermes_gate: "H30",
  claude_gate: "C30",
});

export const HRX_CP929_PACK_BINDING = deepFreeze({
  pack_id: "CP00-929",
  planned_pack_id: "CP00-929",
  risk_class: "A",
  unit_count: 10,
  first_unit_id: "RP30.P04.M04.S07",
  last_unit_id: "RP30.P04.M05.S07",
  range: "RP30.P04.M04.S07-RP30.P04.M05.S07",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-928",
  next_pack_id: "CP00-930",
  next_subphase_id: "RP30.P04.M05.S08",
  production_ready_flag: "hrx_admin_policy_denied_state_bridge_descriptor_verified",
  hermes_gate: "H30",
  claude_gate: "C30",
});

export const HRX_CP930_PACK_BINDING = deepFreeze({
  pack_id: "CP00-930",
  planned_pack_id: "CP00-930",
  risk_class: "A",
  unit_count: 10,
  first_unit_id: "RP30.P04.M05.S08",
  last_unit_id: "RP30.P04.M06.S08",
  range: "RP30.P04.M05.S08-RP30.P04.M06.S08",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-929",
  next_pack_id: "CP00-931",
  next_subphase_id: "RP30.P04.M06.S09",
  production_ready_flag: "hrx_denied_state_hr_operations_bridge_descriptor_verified",
  hermes_gate: "H30",
  claude_gate: "C30",
});

export const HRX_CP931_PACK_BINDING = deepFreeze({
  pack_id: "CP00-931",
  planned_pack_id: "CP00-931",
  risk_class: "A",
  unit_count: 10,
  first_unit_id: "RP30.P04.M06.S09",
  last_unit_id: "RP30.P04.M08.S01",
  range: "RP30.P04.M06.S09-RP30.P04.M08.S01",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-930",
  next_pack_id: "CP00-932",
  next_subphase_id: "RP30.P04.M08.S02",
  production_ready_flag: "hrx_hr_operations_employee_candidate_portal_bridge_descriptor_verified",
  hermes_gate: "H30",
  claude_gate: "C30",
});

export const HRX_CP932_PACK_BINDING = deepFreeze({
  pack_id: "CP00-932",
  planned_pack_id: "CP00-932",
  risk_class: "A",
  unit_count: 10,
  first_unit_id: "RP30.P04.M08.S02",
  last_unit_id: "RP30.P04.M09.S03",
  range: "RP30.P04.M08.S02-RP30.P04.M09.S03",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-931",
  next_pack_id: "CP00-933",
  next_subphase_id: "RP30.P04.M09.S04",
  production_ready_flag: "hrx_candidate_ai_review_queue_bridge_descriptor_verified",
  hermes_gate: "H30",
  claude_gate: "C30",
});

export const HRX_CP933_PACK_BINDING = deepFreeze({
  pack_id: "CP00-933",
  planned_pack_id: "CP00-933",
  risk_class: "A",
  unit_count: 10,
  first_unit_id: "RP30.P04.M09.S04",
  last_unit_id: "RP30.P04.M10.S05",
  range: "RP30.P04.M09.S04-RP30.P04.M10.S05",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-932",
  next_pack_id: "CP00-934",
  next_subphase_id: "RP30.P04.M10.S06",
  production_ready_flag: "hrx_ai_review_admin_policy_tail_bridge_descriptor_verified",
  hermes_gate: "H30",
  claude_gate: "C30",
});

export const HRX_CP934_PACK_BINDING = deepFreeze({
  pack_id: "CP00-934",
  planned_pack_id: "CP00-934",
  risk_class: "A",
  unit_count: 10,
  first_unit_id: "RP30.P04.M10.S06",
  last_unit_id: "RP30.P05.M00.S06",
  range: "RP30.P04.M10.S06-RP30.P05.M00.S06",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-933",
  next_pack_id: "CP00-935",
  next_subphase_id: "RP30.P05.M00.S07",
  production_ready_flag: "hrx_admin_policy_synthetic_tenant_bridge_descriptor_verified",
  hermes_gate: "H30",
  claude_gate: "C30",
});

export const HRX_CP935_PACK_BINDING = deepFreeze({
  pack_id: "CP00-935",
  planned_pack_id: "CP00-935",
  risk_class: "A",
  unit_count: 10,
  first_unit_id: "RP30.P05.M00.S07",
  last_unit_id: "RP30.P05.M01.S07",
  range: "RP30.P05.M00.S07-RP30.P05.M01.S07",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-934",
  next_pack_id: "CP00-936",
  next_subphase_id: "RP30.P05.M01.S08",
  production_ready_flag: "hrx_synthetic_tenant_employee_fixture_bridge_descriptor_verified",
  hermes_gate: "H30",
  claude_gate: "C30",
});

export const HRX_CP936_PACK_BINDING = deepFreeze({
  pack_id: "CP00-936",
  planned_pack_id: "CP00-936",
  risk_class: "A",
  unit_count: 10,
  first_unit_id: "RP30.P05.M01.S08",
  last_unit_id: "RP30.P05.M02.S08",
  range: "RP30.P05.M01.S08-RP30.P05.M02.S08",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-935",
  next_pack_id: "CP00-937",
  next_subphase_id: "RP30.P05.M02.S09",
  production_ready_flag: "hrx_employee_candidate_fixture_bridge_descriptor_verified",
  hermes_gate: "H30",
  claude_gate: "C30",
});

export const HRX_CP937_PACK_BINDING = deepFreeze({
  pack_id: "CP00-937",
  planned_pack_id: "CP00-937",
  risk_class: "A",
  unit_count: 10,
  first_unit_id: "RP30.P05.M02.S09",
  last_unit_id: "RP30.P05.M03.S09",
  range: "RP30.P05.M02.S09-RP30.P05.M03.S09",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-936",
  next_pack_id: "CP00-938",
  next_subphase_id: "RP30.P05.M04.S01",
  production_ready_flag: "hrx_candidate_leave_fixture_bridge_descriptor_verified",
  hermes_gate: "H30",
  claude_gate: "C30",
});

export const HRX_CP938_PACK_BINDING = deepFreeze({
  pack_id: "CP00-938",
  planned_pack_id: "CP00-938",
  risk_class: "A",
  unit_count: 10,
  first_unit_id: "RP30.P05.M04.S01",
  last_unit_id: "RP30.P05.M05.S01",
  range: "RP30.P05.M04.S01-RP30.P05.M05.S01",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-937",
  next_pack_id: "CP00-939",
  next_subphase_id: "RP30.P05.M05.S02",
  production_ready_flag: "hrx_risk_audit_fixture_bridge_descriptor_verified",
  hermes_gate: "H30",
  claude_gate: "C30",
});

export const HRX_CP939_PACK_BINDING = deepFreeze({
  pack_id: "CP00-939",
  planned_pack_id: "CP00-939",
  risk_class: "A",
  unit_count: 10,
  first_unit_id: "RP30.P05.M05.S02",
  last_unit_id: "RP30.P05.M06.S02",
  range: "RP30.P05.M05.S02-RP30.P05.M06.S02",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-938",
  next_pack_id: "CP00-940",
  next_subphase_id: "RP30.P05.M06.S03",
  production_ready_flag: "hrx_audit_fixture_synthetic_tenant_bridge_descriptor_verified",
  hermes_gate: "H30",
  claude_gate: "C30",
});

export const HRX_CP940_PACK_BINDING = deepFreeze({
  pack_id: "CP00-940",
  planned_pack_id: "CP00-940",
  risk_class: "A",
  unit_count: 10,
  first_unit_id: "RP30.P05.M06.S03",
  last_unit_id: "RP30.P05.M07.S03",
  range: "RP30.P05.M06.S03-RP30.P05.M07.S03",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-939",
  next_pack_id: "CP00-941",
  next_subphase_id: "RP30.P05.M07.S04",
  production_ready_flag: "hrx_synthetic_tenant_employee_fixture_tail_bridge_descriptor_verified",
  hermes_gate: "H30",
  claude_gate: "C30",
});

export const HRX_CP941_PACK_BINDING = deepFreeze({
  pack_id: "CP00-941",
  planned_pack_id: "CP00-941",
  risk_class: "A",
  unit_count: 10,
  first_unit_id: "RP30.P05.M07.S04",
  last_unit_id: "RP30.P05.M08.S05",
  range: "RP30.P05.M07.S04-RP30.P05.M08.S05",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-940",
  next_pack_id: "CP00-942",
  next_subphase_id: "RP30.P05.M08.S06",
  production_ready_flag: "hrx_employee_candidate_fixture_tail_bridge_descriptor_verified",
  hermes_gate: "H30",
  claude_gate: "C30",
});

export const HRX_CP942_PACK_BINDING = deepFreeze({
  pack_id: "CP00-942",
  planned_pack_id: "CP00-942",
  risk_class: "A",
  unit_count: 10,
  first_unit_id: "RP30.P05.M08.S06",
  last_unit_id: "RP30.P05.M09.S07",
  range: "RP30.P05.M08.S06-RP30.P05.M09.S07",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-941",
  next_pack_id: "CP00-943",
  next_subphase_id: "RP30.P05.M09.S08",
  production_ready_flag: "hrx_candidate_leave_fixture_tail_bridge_descriptor_verified",
  hermes_gate: "H30",
  claude_gate: "C30",
});

export const HRX_CP943_PACK_BINDING = deepFreeze({
  pack_id: "CP00-943",
  planned_pack_id: "CP00-943",
  risk_class: "A",
  unit_count: 10,
  first_unit_id: "RP30.P05.M09.S08",
  last_unit_id: "RP30.P05.M10.S09",
  range: "RP30.P05.M09.S08-RP30.P05.M10.S09",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-942",
  next_pack_id: "CP00-944",
  next_subphase_id: "RP30.P06.M00.S01",
  production_ready_flag: "hrx_leave_risk_fixture_tail_bridge_descriptor_verified",
  hermes_gate: "H30",
  claude_gate: "C30",
});

export const HRX_CP944_PACK_BINDING = deepFreeze({
  pack_id: "CP00-944",
  planned_pack_id: "CP00-944",
  risk_class: "A",
  unit_count: 10,
  first_unit_id: "RP30.P06.M00.S01",
  last_unit_id: "RP30.P06.M00.S10",
  range: "RP30.P06.M00.S01-RP30.P06.M00.S10",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-943",
  next_pack_id: "CP00-945",
  next_subphase_id: "RP30.P06.M00.S11",
  production_ready_flag: "hrx_hr_permission_foundation_descriptor_verified",
  hermes_gate: "H30",
  claude_gate: "C30",
});

export const HRX_CP945_PACK_BINDING = deepFreeze({
  pack_id: "CP00-945",
  planned_pack_id: "CP00-945",
  risk_class: "A",
  unit_count: 10,
  first_unit_id: "RP30.P06.M00.S11",
  last_unit_id: "RP30.P06.M01.S07",
  range: "RP30.P06.M00.S11-RP30.P06.M01.S07",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-944",
  next_pack_id: "CP00-946",
  next_subphase_id: "RP30.P06.M01.S08",
  production_ready_flag: "hrx_hr_permission_sensitive_guard_bridge_descriptor_verified",
  hermes_gate: "H30",
  claude_gate: "C30",
});

export const HRX_CP946_PACK_BINDING = deepFreeze({
  pack_id: "CP00-946",
  planned_pack_id: "CP00-946",
  risk_class: "A",
  unit_count: 10,
  first_unit_id: "RP30.P06.M01.S08",
  last_unit_id: "RP30.P06.M02.S04",
  range: "RP30.P06.M01.S08-RP30.P06.M02.S04",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-945",
  next_pack_id: "CP00-947",
  next_subphase_id: "RP30.P06.M02.S05",
  production_ready_flag: "hrx_sensitive_guard_payroll_restriction_bridge_descriptor_verified",
  hermes_gate: "H30",
  claude_gate: "C30",
});

export const HRX_CP947_PACK_BINDING = deepFreeze({
  pack_id: "CP00-947",
  planned_pack_id: "CP00-947",
  risk_class: "A",
  unit_count: 10,
  first_unit_id: "RP30.P06.M02.S05",
  last_unit_id: "RP30.P06.M03.S01",
  range: "RP30.P06.M02.S05-RP30.P06.M03.S01",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-946",
  next_pack_id: "CP00-948",
  next_subphase_id: "RP30.P06.M03.S02",
  production_ready_flag: "hrx_payroll_evaluation_restriction_bridge_descriptor_verified",
  hermes_gate: "H30",
  claude_gate: "C30",
});

export const HRX_CP948_PACK_BINDING = deepFreeze({
  pack_id: "CP00-948",
  planned_pack_id: "CP00-948",
  risk_class: "A",
  unit_count: 10,
  first_unit_id: "RP30.P06.M03.S02",
  last_unit_id: "RP30.P06.M03.S11",
  range: "RP30.P06.M03.S02-RP30.P06.M03.S11",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-947",
  next_pack_id: "CP00-949",
  next_subphase_id: "RP30.P06.M03.S12",
  production_ready_flag: "hrx_evaluation_restriction_tail_descriptor_verified",
  hermes_gate: "H30",
  claude_gate: "C30",
});

export const HRX_CP949_PACK_BINDING = deepFreeze({
  pack_id: "CP00-949",
  planned_pack_id: "CP00-949",
  risk_class: "A",
  unit_count: 10,
  first_unit_id: "RP30.P06.M03.S12",
  last_unit_id: "RP30.P06.M04.S08",
  range: "RP30.P06.M03.S12-RP30.P06.M04.S08",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-948",
  next_pack_id: "CP00-950",
  next_subphase_id: "RP30.P06.M04.S09",
  production_ready_flag: "hrx_evaluation_candidate_privacy_bridge_descriptor_verified",
  hermes_gate: "H30",
  claude_gate: "C30",
});

export const HRX_CP950_PACK_BINDING = deepFreeze({
  pack_id: "CP00-950",
  planned_pack_id: "CP00-950",
  risk_class: "A",
  unit_count: 10,
  first_unit_id: "RP30.P06.M04.S09",
  last_unit_id: "RP30.P06.M05.S06",
  range: "RP30.P06.M04.S09-RP30.P06.M05.S06",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-949",
  next_pack_id: "CP00-951",
  next_subphase_id: "RP30.P06.M05.S07",
  production_ready_flag: "hrx_candidate_privacy_audit_hint_bridge_descriptor_verified",
  hermes_gate: "H30",
  claude_gate: "C30",
});

export const HRX_CP951_PACK_BINDING = deepFreeze({
  pack_id: "CP00-951",
  planned_pack_id: "CP00-951",
  risk_class: "A",
  unit_count: 10,
  first_unit_id: "RP30.P06.M05.S07",
  last_unit_id: "RP30.P06.M06.S03",
  range: "RP30.P06.M05.S07-RP30.P06.M06.S03",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-950",
  next_pack_id: "CP00-952",
  next_subphase_id: "RP30.P06.M06.S04",
  production_ready_flag: "hrx_audit_hint_hr_permission_bridge_descriptor_verified",
  hermes_gate: "H30",
  claude_gate: "C30",
});

export const HRX_CP952_PACK_BINDING = deepFreeze({
  pack_id: "CP00-952",
  planned_pack_id: "CP00-952",
  risk_class: "A",
  unit_count: 10,
  first_unit_id: "RP30.P06.M06.S04",
  last_unit_id: "RP30.P06.M07.S01",
  range: "RP30.P06.M06.S04-RP30.P06.M07.S01",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-951",
  next_pack_id: "CP00-953",
  next_subphase_id: "RP30.P06.M07.S02",
  production_ready_flag: "hrx_hr_permission_sensitive_guard_m06_m07_bridge_descriptor_verified",
  hermes_gate: "H30",
  claude_gate: "C30",
});

export const HRX_CP953_PACK_BINDING = deepFreeze({
  pack_id: "CP00-953",
  planned_pack_id: "CP00-953",
  risk_class: "A",
  unit_count: 10,
  first_unit_id: "RP30.P06.M07.S02",
  last_unit_id: "RP30.P06.M07.S11",
  range: "RP30.P06.M07.S02-RP30.P06.M07.S11",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-952",
  next_pack_id: "CP00-954",
  next_subphase_id: "RP30.P06.M07.S12",
  production_ready_flag: "hrx_sensitive_guard_m07_tail_descriptor_verified",
  hermes_gate: "H30",
  claude_gate: "C30",
});

export const HRX_CP954_PACK_BINDING = deepFreeze({
  pack_id: "CP00-954",
  planned_pack_id: "CP00-954",
  risk_class: "A",
  unit_count: 10,
  first_unit_id: "RP30.P06.M07.S12",
  last_unit_id: "RP30.P06.M08.S09",
  range: "RP30.P06.M07.S12-RP30.P06.M08.S09",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-953",
  next_pack_id: "CP00-955",
  next_subphase_id: "RP30.P06.M08.S10",
  production_ready_flag: "hrx_sensitive_guard_payroll_restriction_m07_m08_bridge_descriptor_verified",
  hermes_gate: "H30",
  claude_gate: "C30",
});

export const HRX_CP955_PACK_BINDING = deepFreeze({
  pack_id: "CP00-955",
  planned_pack_id: "CP00-955",
  risk_class: "A",
  unit_count: 10,
  first_unit_id: "RP30.P06.M08.S10",
  last_unit_id: "RP30.P06.M09.S07",
  range: "RP30.P06.M08.S10-RP30.P06.M09.S07",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-954",
  next_pack_id: "CP00-956",
  next_subphase_id: "RP30.P06.M09.S08",
  production_ready_flag: "hrx_payroll_evaluation_restriction_m08_m09_bridge_descriptor_verified",
  hermes_gate: "H30",
  claude_gate: "C30",
});

export const HRX_CP956_PACK_BINDING = deepFreeze({
  pack_id: "CP00-956",
  planned_pack_id: "CP00-956",
  risk_class: "A",
  unit_count: 10,
  first_unit_id: "RP30.P06.M09.S08",
  last_unit_id: "RP30.P06.M10.S05",
  range: "RP30.P06.M09.S08-RP30.P06.M10.S05",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-955",
  next_pack_id: "CP00-957",
  next_subphase_id: "RP30.P06.M10.S06",
  production_ready_flag: "hrx_evaluation_candidate_privacy_m09_m10_bridge_descriptor_verified",
  hermes_gate: "H30",
  claude_gate: "C30",
});

export const HRX_CP957_PACK_BINDING = deepFreeze({
  pack_id: "CP00-957",
  planned_pack_id: "CP00-957",
  risk_class: "A",
  unit_count: 10,
  first_unit_id: "RP30.P06.M10.S06",
  last_unit_id: "RP30.P07.M00.S03",
  range: "RP30.P06.M10.S06-RP30.P07.M00.S03",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-956",
  next_pack_id: "CP00-958",
  next_subphase_id: "RP30.P07.M00.S04",
  production_ready_flag: "hrx_candidate_privacy_missing_user_link_m10_p07_bridge_descriptor_verified",
  hermes_gate: "H30",
  claude_gate: "C30",
});

export const HRX_CP958_PACK_BINDING = deepFreeze({
  pack_id: "CP00-958",
  planned_pack_id: "CP00-958",
  risk_class: "A",
  unit_count: 10,
  first_unit_id: "RP30.P07.M00.S04",
  last_unit_id: "RP30.P07.M00.S13",
  range: "RP30.P07.M00.S04-RP30.P07.M00.S13",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-957",
  next_pack_id: "CP00-959",
  next_subphase_id: "RP30.P07.M01.S01",
  production_ready_flag: "hrx_missing_user_link_p07_tail_descriptor_verified",
  hermes_gate: "H30",
  claude_gate: "C30",
});

export const HRX_CP959_PACK_BINDING = deepFreeze({
  pack_id: "CP00-959",
  planned_pack_id: "CP00-959",
  risk_class: "A",
  unit_count: 10,
  first_unit_id: "RP30.P07.M01.S01",
  last_unit_id: "RP30.P07.M01.S10",
  range: "RP30.P07.M01.S01-RP30.P07.M01.S10",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-958",
  next_pack_id: "CP00-960",
  next_subphase_id: "RP30.P07.M01.S11",
  production_ready_flag: "hrx_payroll_runtime_attempt_p07_foundation_descriptor_verified",
  hermes_gate: "H30",
  claude_gate: "C30",
});

export const HRX_CP960_PACK_BINDING = deepFreeze({
  pack_id: "CP00-960",
  planned_pack_id: "CP00-960",
  risk_class: "A",
  unit_count: 10,
  first_unit_id: "RP30.P07.M01.S11",
  last_unit_id: "RP30.P07.M02.S07",
  range: "RP30.P07.M01.S11-RP30.P07.M02.S07",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-959",
  next_pack_id: "CP00-961",
  next_subphase_id: "RP30.P07.M02.S08",
  production_ready_flag: "hrx_payroll_runtime_attempt_ai_scoring_p07_bridge_descriptor_verified",
  hermes_gate: "H30",
  claude_gate: "C30",
});

export const HRX_CP961_PACK_BINDING = deepFreeze({
  pack_id: "CP00-961",
  planned_pack_id: "CP00-961",
  risk_class: "A",
  unit_count: 10,
  first_unit_id: "RP30.P07.M02.S08",
  last_unit_id: "RP30.P07.M03.S04",
  range: "RP30.P07.M02.S08-RP30.P07.M03.S04",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-960",
  next_pack_id: "CP00-962",
  next_subphase_id: "RP30.P07.M03.S05",
  production_ready_flag: "hrx_ai_scoring_cross_tenant_access_p07_bridge_descriptor_verified",
  hermes_gate: "H30",
  claude_gate: "C30",
});

export const HRX_CP962_PACK_BINDING = deepFreeze({
  pack_id: "CP00-962",
  planned_pack_id: "CP00-962",
  risk_class: "A",
  unit_count: 10,
  first_unit_id: "RP30.P07.M03.S05",
  last_unit_id: "RP30.P07.M04.S01",
  range: "RP30.P07.M03.S05-RP30.P07.M04.S01",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-961",
  next_pack_id: "CP00-963",
  next_subphase_id: "RP30.P07.M04.S02",
  production_ready_flag: "hrx_cross_tenant_access_storage_decision_gap_p07_bridge_descriptor_verified",
  hermes_gate: "H30",
  claude_gate: "C30",
});

export const HRX_CP963_PACK_BINDING = deepFreeze({
  pack_id: "CP00-963",
  planned_pack_id: "CP00-963",
  risk_class: "A",
  unit_count: 10,
  first_unit_id: "RP30.P07.M04.S02",
  last_unit_id: "RP30.P07.M04.S11",
  range: "RP30.P07.M04.S02-RP30.P07.M04.S11",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-962",
  next_pack_id: "CP00-964",
  next_subphase_id: "RP30.P07.M04.S12",
  production_ready_flag: "hrx_storage_decision_gap_p07_mid_descriptor_verified",
  hermes_gate: "H30",
  claude_gate: "C30",
});

export const HRX_CP964_PACK_BINDING = deepFreeze({
  pack_id: "CP00-964",
  planned_pack_id: "CP00-964",
  risk_class: "A",
  unit_count: 10,
  first_unit_id: "RP30.P07.M04.S12",
  last_unit_id: "RP30.P07.M05.S09",
  range: "RP30.P07.M04.S12-RP30.P07.M05.S09",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-963",
  next_pack_id: "CP00-965",
  next_subphase_id: "RP30.P07.M05.S10",
  production_ready_flag: "hrx_storage_decision_gap_recovery_p07_bridge_descriptor_verified",
  hermes_gate: "H30",
  claude_gate: "C30",
});

export const HRX_CP965_PACK_BINDING = deepFreeze({
  pack_id: "CP00-965",
  planned_pack_id: "CP00-965",
  risk_class: "A",
  unit_count: 10,
  first_unit_id: "RP30.P07.M05.S10",
  last_unit_id: "RP30.P07.M06.S07",
  range: "RP30.P07.M05.S10-RP30.P07.M06.S07",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-964",
  next_pack_id: "CP00-966",
  next_subphase_id: "RP30.P07.M06.S08",
  production_ready_flag: "hrx_recovery_missing_user_link_p07_bridge_descriptor_verified",
  hermes_gate: "H30",
  claude_gate: "C30",
});

export const HRX_CP966_PACK_BINDING = deepFreeze({
  pack_id: "CP00-966",
  planned_pack_id: "CP00-966",
  risk_class: "A",
  unit_count: 10,
  first_unit_id: "RP30.P07.M06.S08",
  last_unit_id: "RP30.P07.M07.S05",
  range: "RP30.P07.M06.S08-RP30.P07.M07.S05",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-965",
  next_pack_id: "CP00-967",
  next_subphase_id: "RP30.P07.M07.S06",
  production_ready_flag: "hrx_missing_user_link_payroll_runtime_attempt_p07_bridge_descriptor_verified",
  hermes_gate: "H30",
  claude_gate: "C30",
});

export const HRX_CP967_PACK_BINDING = deepFreeze({
  pack_id: "CP00-967",
  planned_pack_id: "CP00-967",
  risk_class: "A",
  unit_count: 10,
  first_unit_id: "RP30.P07.M07.S06",
  last_unit_id: "RP30.P07.M08.S03",
  range: "RP30.P07.M07.S06-RP30.P07.M08.S03",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-966",
  next_pack_id: "CP00-968",
  next_subphase_id: "RP30.P07.M08.S04",
  production_ready_flag: "hrx_payroll_runtime_attempt_ai_scoring_p07_tail_bridge_descriptor_verified",
  hermes_gate: "H30",
  claude_gate: "C30",
});

export const HRX_CP968_PACK_BINDING = deepFreeze({
  pack_id: "CP00-968",
  planned_pack_id: "CP00-968",
  risk_class: "A",
  unit_count: 10,
  first_unit_id: "RP30.P07.M08.S04",
  last_unit_id: "RP30.P07.M09.S01",
  range: "RP30.P07.M08.S04-RP30.P07.M09.S01",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-967",
  next_pack_id: "CP00-969",
  next_subphase_id: "RP30.P07.M09.S02",
  production_ready_flag: "hrx_ai_scoring_cross_tenant_access_p07_bridge_descriptor_verified",
  hermes_gate: "H30",
  claude_gate: "C30",
});

export const HRX_CP969_PACK_BINDING = deepFreeze({
  pack_id: "CP00-969",
  planned_pack_id: "CP00-969",
  risk_class: "A",
  unit_count: 10,
  first_unit_id: "RP30.P07.M09.S02",
  last_unit_id: "RP30.P07.M09.S11",
  range: "RP30.P07.M09.S02-RP30.P07.M09.S11",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-968",
  next_pack_id: "CP00-970",
  next_subphase_id: "RP30.P07.M09.S12",
  production_ready_flag: "hrx_cross_tenant_access_p07_tail_descriptor_verified",
  hermes_gate: "H30",
  claude_gate: "C30",
});

export const HRX_CP970_PACK_BINDING = deepFreeze({
  pack_id: "CP00-970",
  planned_pack_id: "CP00-970",
  risk_class: "A",
  unit_count: 10,
  first_unit_id: "RP30.P07.M09.S12",
  last_unit_id: "RP30.P07.M10.S09",
  range: "RP30.P07.M09.S12-RP30.P07.M10.S09",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-969",
  next_pack_id: "CP00-971",
  next_subphase_id: "RP30.P07.M10.S10",
  production_ready_flag: "hrx_cross_tenant_access_storage_decision_gap_p07_bridge_descriptor_verified",
  hermes_gate: "H30",
  claude_gate: "C30",
});

export const HRX_CP971_PACK_BINDING = deepFreeze({
  pack_id: "CP00-971",
  planned_pack_id: "CP00-971",
  risk_class: "A",
  unit_count: 10,
  first_unit_id: "RP30.P07.M10.S10",
  last_unit_id: "RP30.P08.M00.S07",
  range: "RP30.P07.M10.S10-RP30.P08.M00.S07",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-970",
  next_pack_id: "CP00-972",
  next_subphase_id: "RP30.P08.M00.S08",
  production_ready_flag: "hrx_storage_decision_gap_h30_command_matrix_p08_bridge_descriptor_verified",
  hermes_gate: "H30",
  claude_gate: "C30",
});

export const HRX_CP972_PACK_BINDING = deepFreeze({
  pack_id: "CP00-972",
  planned_pack_id: "CP00-972",
  risk_class: "A",
  unit_count: 10,
  first_unit_id: "RP30.P08.M00.S08",
  last_unit_id: "RP30.P08.M01.S08",
  range: "RP30.P08.M00.S08-RP30.P08.M01.S08",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-971",
  next_pack_id: "CP00-973",
  next_subphase_id: "RP30.P08.M01.S09",
  production_ready_flag: "hrx_h30_command_matrix_evidence_template_p08_bridge_descriptor_verified",
  hermes_gate: "H30",
  claude_gate: "C30",
});

export const HRX_CP973_PACK_BINDING = deepFreeze({
  pack_id: "CP00-973",
  planned_pack_id: "CP00-973",
  risk_class: "A",
  unit_count: 10,
  first_unit_id: "RP30.P08.M01.S09",
  last_unit_id: "RP30.P08.M02.S09",
  range: "RP30.P08.M01.S09-RP30.P08.M02.S09",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-972",
  next_pack_id: "CP00-974",
  next_subphase_id: "RP30.P08.M03.S01",
  production_ready_flag: "hrx_evidence_template_no_real_data_p08_bridge_descriptor_verified",
  hermes_gate: "H30",
  claude_gate: "C30",
});

export const HRX_CP974_PACK_BINDING = deepFreeze({
  pack_id: "CP00-974",
  planned_pack_id: "CP00-974",
  risk_class: "A",
  unit_count: 10,
  first_unit_id: "RP30.P08.M03.S01",
  last_unit_id: "RP30.P08.M04.S01",
  range: "RP30.P08.M03.S01-RP30.P08.M04.S01",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-973",
  next_pack_id: "CP00-975",
  next_subphase_id: "RP30.P08.M04.S02",
  production_ready_flag: "hrx_blocked_claims_claude_dependency_p08_bridge_descriptor_verified",
  hermes_gate: "H30",
  claude_gate: "C30",
});

export const HRX_CP975_PACK_BINDING = deepFreeze({
  pack_id: "CP00-975",
  planned_pack_id: "CP00-975",
  risk_class: "A",
  unit_count: 10,
  first_unit_id: "RP30.P08.M04.S02",
  last_unit_id: "RP30.P08.M05.S02",
  range: "RP30.P08.M04.S02-RP30.P08.M05.S02",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-974",
  next_pack_id: "CP00-976",
  next_subphase_id: "RP30.P08.M05.S03",
  production_ready_flag: "hrx_claude_dependency_human_approval_p08_bridge_descriptor_verified",
  hermes_gate: "H30",
  claude_gate: "C30",
});

export const HRX_CP976_PACK_BINDING = deepFreeze({
  pack_id: "CP00-976",
  planned_pack_id: "CP00-976",
  risk_class: "A",
  unit_count: 10,
  first_unit_id: "RP30.P08.M05.S03",
  last_unit_id: "RP30.P08.M06.S04",
  range: "RP30.P08.M05.S03-RP30.P08.M06.S04",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-975",
  next_pack_id: "CP00-977",
  next_subphase_id: "RP30.P08.M06.S05",
  production_ready_flag: "hrx_human_approval_h30_command_matrix_p08_bridge_descriptor_verified",
  hermes_gate: "H30",
  claude_gate: "C30",
});

export const HRX_CP977_PACK_BINDING = deepFreeze({
  pack_id: "CP00-977",
  planned_pack_id: "CP00-977",
  risk_class: "A",
  unit_count: 10,
  first_unit_id: "RP30.P08.M06.S05",
  last_unit_id: "RP30.P08.M07.S05",
  range: "RP30.P08.M06.S05-RP30.P08.M07.S05",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-976",
  next_pack_id: "CP00-978",
  next_subphase_id: "RP30.P08.M07.S06",
  production_ready_flag: "hrx_h30_command_matrix_evidence_template_p08_bridge_descriptor_verified",
  hermes_gate: "H30",
  claude_gate: "C30",
});

export const HRX_CP978_PACK_BINDING = deepFreeze({
  pack_id: "CP00-978",
  planned_pack_id: "CP00-978",
  risk_class: "A",
  unit_count: 10,
  first_unit_id: "RP30.P08.M07.S06",
  last_unit_id: "RP30.P08.M08.S07",
  range: "RP30.P08.M07.S06-RP30.P08.M08.S07",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-977",
  next_pack_id: "CP00-979",
  next_subphase_id: "RP30.P08.M08.S08",
  production_ready_flag: "hrx_evidence_template_no_real_data_p08_tail_bridge_descriptor_verified",
  hermes_gate: "H30",
  claude_gate: "C30",
});

export const HRX_CP979_PACK_BINDING = deepFreeze({
  pack_id: "CP00-979",
  planned_pack_id: "CP00-979",
  risk_class: "A",
  unit_count: 10,
  first_unit_id: "RP30.P08.M08.S08",
  last_unit_id: "RP30.P08.M10.S01",
  range: "RP30.P08.M08.S08-RP30.P08.M10.S01",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-978",
  next_pack_id: "CP00-980",
  next_subphase_id: "RP30.P08.M10.S02",
  production_ready_flag: "hrx_no_real_data_blocked_claims_claude_dependency_p08_bridge_descriptor_verified",
  hermes_gate: "H30",
  claude_gate: "C30",
});

export const HRX_CP980_PACK_BINDING = deepFreeze({
  pack_id: "CP00-980",
  planned_pack_id: "CP00-980",
  risk_class: "A",
  unit_count: 10,
  first_unit_id: "RP30.P08.M10.S02",
  last_unit_id: "RP30.P09.M00.S02",
  range: "RP30.P08.M10.S02-RP30.P09.M00.S02",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-979",
  next_pack_id: "CP00-981",
  next_subphase_id: "RP30.P09.M00.S03",
  production_ready_flag: "hrx_claude_dependency_architecture_review_p09_bridge_descriptor_verified",
  hermes_gate: "H30",
  claude_gate: "C30",
});

export const HRX_CP981_PACK_BINDING = deepFreeze({
  pack_id: "CP00-981",
  planned_pack_id: "CP00-981",
  risk_class: "A",
  unit_count: 10,
  first_unit_id: "RP30.P09.M00.S03",
  last_unit_id: "RP30.P09.M02.S02",
  range: "RP30.P09.M00.S03-RP30.P09.M02.S02",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-980",
  next_pack_id: "CP00-982",
  next_subphase_id: "RP30.P09.M02.S03",
  production_ready_flag: "hrx_architecture_security_bypass_review_p09_bridge_descriptor_verified",
  hermes_gate: "H30",
  claude_gate: "C30",
});

export const HRX_CP982_PACK_BINDING = deepFreeze({
  pack_id: "CP00-982",
  planned_pack_id: "CP00-982",
  risk_class: "A",
  unit_count: 10,
  first_unit_id: "RP30.P09.M02.S03",
  last_unit_id: "RP30.P09.M04.S02",
  range: "RP30.P09.M02.S03-RP30.P09.M04.S02",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-981",
  next_pack_id: "CP00-983",
  next_subphase_id: "RP30.P09.M04.S03",
  production_ready_flag: "hrx_bypass_missing_tests_risk_register_p09_bridge_descriptor_verified",
  hermes_gate: "H30",
  claude_gate: "C30",
});

export const HRX_CP983_PACK_BINDING = deepFreeze({
  pack_id: "CP00-983",
  planned_pack_id: "CP00-983",
  risk_class: "A",
  unit_count: 10,
  first_unit_id: "RP30.P09.M04.S03",
  last_unit_id: "RP30.P09.M05.S07",
  range: "RP30.P09.M04.S03-RP30.P09.M05.S07",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-982",
  next_pack_id: "CP00-984",
  next_subphase_id: "RP30.P09.M05.S08",
  production_ready_flag: "hrx_risk_register_human_summary_p09_bridge_descriptor_verified",
  hermes_gate: "H30",
  claude_gate: "C30",
});

export const HRX_CP984_PACK_BINDING = deepFreeze({
  pack_id: "CP00-984",
  planned_pack_id: "CP00-984",
  risk_class: "A",
  unit_count: 10,
  first_unit_id: "RP30.P09.M05.S08",
  last_unit_id: "RP30.P09.M07.S04",
  range: "RP30.P09.M05.S08-RP30.P09.M07.S04",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-983",
  next_pack_id: "CP00-985",
  next_subphase_id: "RP30.P09.M07.S05",
  production_ready_flag: "hrx_human_summary_architecture_security_review_p09_bridge_descriptor_verified",
  hermes_gate: "H30",
  claude_gate: "C30",
});

export const HRX_CP985_PACK_BINDING = deepFreeze({
  pack_id: "CP00-985",
  planned_pack_id: "CP00-985",
  risk_class: "A",
  unit_count: 10,
  first_unit_id: "RP30.P09.M07.S05",
  last_unit_id: "RP30.P09.M09.S04",
  range: "RP30.P09.M07.S05-RP30.P09.M09.S04",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-984",
  next_pack_id: "CP00-986",
  next_subphase_id: "RP30.P09.M09.S05",
  production_ready_flag: "hrx_security_bypass_missing_tests_p09_bridge_descriptor_verified",
  hermes_gate: "H30",
  claude_gate: "C30",
});

export const HRX_CP986_PACK_BINDING = deepFreeze({
  pack_id: "CP00-986",
  planned_pack_id: "CP00-986",
  risk_class: "A",
  unit_count: 10,
  first_unit_id: "RP30.P09.M09.S05",
  last_unit_id: "RP30.P09.M10.S09",
  range: "RP30.P09.M09.S05-RP30.P09.M10.S09",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-985",
  next_pack_id: "CP00-987",
  next_subphase_id: "RP30.P09.M10.S10",
  production_ready_flag: "hrx_missing_tests_risk_register_p09_bridge_descriptor_verified",
  hermes_gate: "H30",
  claude_gate: "C30",
});

export const HRX_CP987_PACK_BINDING = deepFreeze({
  pack_id: "CP00-987",
  planned_pack_id: "CP00-987",
  risk_class: "A",
  unit_count: 1,
  first_unit_id: "RP30.P09.M10.S10",
  last_unit_id: "RP30.P09.M10.S10",
  range: "RP30.P09.M10.S10",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-986",
  next_pack_id: null,
  next_subphase_id: null,
  production_ready_flag: "hrx_risk_register_p09_final_tail_descriptor_verified",
  hermes_gate: "H30",
  claude_gate: "C30",
});

export const HRX_CP897_REQUIRED_SECTION_ROWS = deepFreeze({
  "RP30.P00.M00": ["scope HRX slice subphase 1"],
  "RP30.P00.M01": ["admission HRX slice subphase 1"],
  "RP30.P00.M02": ["non-goal HRX slice subphase 1", "non-goal HRX slice subphase 2"],
  "RP30.P00.M03": ["decision HRX slice subphase 1", "decision HRX slice subphase 2"],
  "RP30.P00.M04": ["review HRX slice subphase 1", "review HRX slice subphase 2"],
  "RP30.P00.M05": ["closeout HRX slice subphase 1", "closeout HRX slice subphase 2"],
});

export const HRX_CP897_REQUIREMENTS = deepFreeze({
  deliverable_counts: {
    implementation: 8,
    security_audit: 2,
  },
  phase_counts: {
    "RP30.P00": 10,
  },
  micro_phase_row_counts: {
    "RP30.P00.M00": 1,
    "RP30.P00.M01": 1,
    "RP30.P00.M02": 2,
    "RP30.P00.M03": 2,
    "RP30.P00.M04": 2,
    "RP30.P00.M05": 2,
  },
  micro_title_row_counts: {
    "scope HRX slice": 1,
    "admission HRX slice": 1,
    "non-goal HRX slice": 2,
    "decision HRX slice": 2,
    "review HRX slice": 2,
    "closeout HRX slice": 2,
  },
  required_section_rows: HRX_CP897_REQUIRED_SECTION_ROWS,
  mandatory_artifacts: [
    "docs/rp30-people-hr-evidence-detailed-microphases.json",
    "docs/rp30-people-hr-evidence-detailed-microphases.md",
    "docs/hrx-requirement-ledger.json",
    "docs/hrx-requirement-ledger.md",
    "docs/hrx-weighted-implementation-ledger.json",
    "docs/hrx-weighted-implementation-ledger.md",
    "docs/hrx-integration/hrx-full-integration-plan.md",
    "docs/hrx-integration/hrx-no-omission-coverage-matrix.md",
    "docs/hrx-integration/hrx-overlay-closeout-pack-map.json",
    "contracts/hrx-people-contract.json",
    "packages/hrx/src/registry.js",
    "packages/hrx/src/validators.js",
    "packages/hrx/test/model.test.js",
    "scripts/validate-rp30-hrx-people-contract.mjs",
    "package.json",
  ],
  required_capabilities: unique([
    "hrx_embedded_scope_descriptor",
    "hrx_admission_gate_descriptor",
    "hrx_non_goal_boundary_descriptor",
    "hrx_decision_boundary_descriptor",
    "hrx_review_boundary_descriptor",
    "hrx_closeout_boundary_descriptor",
    "hrx_sensitive_guard_descriptor",
    "hrx_user_employee_separation_descriptor",
    "hrx_payroll_runtime_deferred_descriptor",
  ]),
  safety_gates: unique([
    "hrx_remains_embedded_inside_law_firm_os",
    "no_separate_hrx_product",
    "real_employee_candidate_payroll_data_forbidden",
    "payroll_calculation_runtime_deferred",
    "hr_ai_final_judgment_forbidden",
    "permission_and_audit_writes_forbidden",
    "human_approval_required_for_runtime_opening",
  ]),
  required_no_leak_guards: unique([
    "no_real_employee_data",
    "no_real_candidate_data",
    "no_real_payroll_data",
    "no_credentials_or_secrets",
    "no_sensitive_hr_permission_leak",
    "no_runtime_receipts",
  ]),
});

export const HRX_CP898_REQUIRED_SECTION_ROWS = deepFreeze({
  "RP30.P00.M06": ["scope HRX slice subphase 1", "scope HRX slice subphase 2", "scope HRX slice subphase 3"],
  "RP30.P00.M07": ["admission HRX slice subphase 1", "admission HRX slice subphase 2", "admission HRX slice subphase 3"],
  "RP30.P00.M08": ["non-goal HRX slice subphase 1", "non-goal HRX slice subphase 2", "non-goal HRX slice subphase 3"],
  "RP30.P00.M09": ["decision HRX slice subphase 1"],
});

export const HRX_CP898_REQUIREMENTS = deepFreeze({
  deliverable_counts: {
    implementation: 10,
  },
  phase_counts: {
    "RP30.P00": 10,
  },
  micro_phase_row_counts: {
    "RP30.P00.M06": 3,
    "RP30.P00.M07": 3,
    "RP30.P00.M08": 3,
    "RP30.P00.M09": 1,
  },
  micro_title_row_counts: {
    "scope HRX slice": 3,
    "admission HRX slice": 3,
    "non-goal HRX slice": 3,
    "decision HRX slice": 1,
  },
  required_section_rows: HRX_CP898_REQUIRED_SECTION_ROWS,
  mandatory_artifacts: HRX_CP897_REQUIREMENTS.mandatory_artifacts,
  required_capabilities: unique([
    ...HRX_CP897_REQUIREMENTS.required_capabilities,
    "hrx_contract_baseline_continuation_descriptor",
    "hrx_scope_admission_non_goal_continuation_descriptor",
  ]),
  safety_gates: unique([
    ...HRX_CP897_REQUIREMENTS.safety_gates,
    "hrx_continuation_rows_do_not_open_runtime",
    "hrx_continuation_does_not_split_product",
  ]),
  required_no_leak_guards: HRX_CP897_REQUIREMENTS.required_no_leak_guards,
});

export const HRX_CP899_REQUIRED_SECTION_ROWS = deepFreeze({
  "RP30.P00.M09": ["decision HRX slice subphase 2"],
  "RP30.P00.M10": ["review HRX slice subphase 1", "review HRX slice subphase 2"],
  "RP30.P01.M00": [
    "Employee HRX slice subphase 1",
    "Employee HRX slice subphase 2",
    "Employee HRX slice subphase 3",
    "Employee HRX slice subphase 4",
    "Employee HRX slice subphase 5",
  ],
  "RP30.P01.M01": ["EmploymentProfile HRX slice subphase 1", "EmploymentProfile HRX slice subphase 2"],
});

export const HRX_CP899_REQUIREMENTS = deepFreeze({
  deliverable_counts: {
    implementation: 10,
  },
  phase_counts: {
    "RP30.P00": 3,
    "RP30.P01": 7,
  },
  micro_phase_row_counts: {
    "RP30.P00.M09": 1,
    "RP30.P00.M10": 2,
    "RP30.P01.M00": 5,
    "RP30.P01.M01": 2,
  },
  micro_title_row_counts: {
    "decision HRX slice": 1,
    "review HRX slice": 2,
    "Employee HRX slice": 5,
    "EmploymentProfile HRX slice": 2,
  },
  required_section_rows: HRX_CP899_REQUIRED_SECTION_ROWS,
  mandatory_artifacts: HRX_CP897_REQUIREMENTS.mandatory_artifacts,
  required_capabilities: unique([
    ...HRX_CP898_REQUIREMENTS.required_capabilities,
    "hrx_domain_employee_profile_bridge_descriptor",
    "hrx_decision_review_to_domain_handoff_descriptor",
    "hrx_employee_entity_descriptor",
    "hrx_employment_profile_entity_descriptor",
    "hrx_employee_user_reverse_link_descriptor",
    "hrx_employment_profile_employee_reference_descriptor",
  ]),
  safety_gates: unique([
    ...HRX_CP898_REQUIREMENTS.safety_gates,
    "hrx_domain_bridge_rows_do_not_open_runtime",
    "hrx_employee_profile_does_not_conflate_user_account",
    "hrx_domain_bridge_does_not_split_product",
  ]),
  required_no_leak_guards: HRX_CP897_REQUIREMENTS.required_no_leak_guards,
});

export const HRX_CP900_REQUIRED_SECTION_ROWS = deepFreeze({
  "RP30.P01.M01": [
    "EmploymentProfile HRX slice subphase 3",
    "EmploymentProfile HRX slice subphase 4",
    "EmploymentProfile HRX slice subphase 5",
  ],
  "RP30.P01.M02": [
    "HRDocument HRX slice subphase 1",
    "HRDocument HRX slice subphase 2",
    "HRDocument HRX slice subphase 3",
    "HRDocument HRX slice subphase 4",
    "HRDocument HRX slice subphase 5",
  ],
  "RP30.P01.M03": ["EmploymentContract HRX slice subphase 1", "EmploymentContract HRX slice subphase 2"],
});

export const HRX_CP900_REQUIREMENTS = deepFreeze({
  deliverable_counts: {
    implementation: 10,
  },
  phase_counts: {
    "RP30.P01": 10,
  },
  micro_phase_row_counts: {
    "RP30.P01.M01": 3,
    "RP30.P01.M02": 5,
    "RP30.P01.M03": 2,
  },
  micro_title_row_counts: {
    "EmploymentProfile HRX slice": 3,
    "HRDocument HRX slice": 5,
    "EmploymentContract HRX slice": 2,
  },
  required_section_rows: HRX_CP900_REQUIRED_SECTION_ROWS,
  mandatory_artifacts: HRX_CP897_REQUIREMENTS.mandatory_artifacts,
  required_capabilities: unique([
    ...HRX_CP899_REQUIREMENTS.required_capabilities,
    "hrx_hr_document_contract_bridge_descriptor",
    "hrx_hr_document_entity_descriptor",
    "hrx_hr_document_employee_profile_reference_descriptor",
    "hrx_employment_contract_entity_descriptor",
    "hrx_employment_contract_profile_reference_descriptor",
    "hrx_document_storage_runtime_deferred_descriptor",
  ]),
  safety_gates: unique([
    ...HRX_CP899_REQUIREMENTS.safety_gates,
    "hrx_document_contract_rows_do_not_open_runtime",
    "hrx_document_bodies_and_contract_text_not_included",
    "hrx_signature_and_execution_runtime_deferred",
  ]),
  required_no_leak_guards: HRX_CP897_REQUIREMENTS.required_no_leak_guards,
});

export const HRX_CP901_REQUIRED_SECTION_ROWS = deepFreeze({
  "RP30.P01.M03": [
    "EmploymentContract HRX slice subphase 3",
    "EmploymentContract HRX slice subphase 4",
    "EmploymentContract HRX slice subphase 5",
  ],
  "RP30.P01.M04": [
    "CompensationRecord HRX slice subphase 1",
    "CompensationRecord HRX slice subphase 2",
    "CompensationRecord HRX slice subphase 3",
    "CompensationRecord HRX slice subphase 4",
    "CompensationRecord HRX slice subphase 5",
  ],
  "RP30.P01.M05": ["PeopleGraph HRX slice subphase 1", "PeopleGraph HRX slice subphase 2"],
});

export const HRX_CP901_REQUIREMENTS = deepFreeze({
  deliverable_counts: {
    implementation: 8,
    security_audit: 2,
  },
  phase_counts: {
    "RP30.P01": 10,
  },
  micro_phase_row_counts: {
    "RP30.P01.M03": 3,
    "RP30.P01.M04": 5,
    "RP30.P01.M05": 2,
  },
  micro_title_row_counts: {
    "EmploymentContract HRX slice": 3,
    "CompensationRecord HRX slice": 5,
    "PeopleGraph HRX slice": 2,
  },
  required_section_rows: HRX_CP901_REQUIRED_SECTION_ROWS,
  mandatory_artifacts: HRX_CP897_REQUIREMENTS.mandatory_artifacts,
  required_capabilities: unique([
    ...HRX_CP900_REQUIREMENTS.required_capabilities,
    "hrx_contract_compensation_graph_bridge_descriptor",
    "hrx_compensation_record_entity_descriptor",
    "hrx_compensation_amount_runtime_deferred_descriptor",
    "hrx_people_graph_security_audit_descriptor",
    "hrx_people_graph_permission_edges_deferred_descriptor",
  ]),
  safety_gates: unique([
    ...HRX_CP900_REQUIREMENTS.safety_gates,
    "hrx_compensation_rows_do_not_open_payroll_runtime",
    "hrx_compensation_amounts_not_included",
    "hrx_people_graph_security_rows_do_not_emit_permission_edges",
  ]),
  required_no_leak_guards: HRX_CP897_REQUIREMENTS.required_no_leak_guards,
});

export const HRX_CP902_REQUIRED_SECTION_ROWS = deepFreeze({
  "RP30.P01.M05": [
    "PeopleGraph HRX slice subphase 3",
    "PeopleGraph HRX slice subphase 4",
    "PeopleGraph HRX slice subphase 5",
    "PeopleGraph HRX slice subphase 6",
    "PeopleGraph HRX slice subphase 7",
    "PeopleGraph HRX slice subphase 8",
    "PeopleGraph HRX slice subphase 9",
  ],
  "RP30.P01.M06": ["Employee HRX slice subphase 1", "Employee HRX slice subphase 2", "Employee HRX slice subphase 3"],
});

export const HRX_CP902_REQUIREMENTS = deepFreeze({
  deliverable_counts: {
    implementation: 3,
    security_audit: 7,
  },
  phase_counts: {
    "RP30.P01": 10,
  },
  micro_phase_row_counts: {
    "RP30.P01.M05": 7,
    "RP30.P01.M06": 3,
  },
  micro_title_row_counts: {
    "PeopleGraph HRX slice": 7,
    "Employee HRX slice": 3,
  },
  required_section_rows: HRX_CP902_REQUIRED_SECTION_ROWS,
  mandatory_artifacts: HRX_CP897_REQUIREMENTS.mandatory_artifacts,
  required_capabilities: unique([
    ...HRX_CP901_REQUIREMENTS.required_capabilities,
    "hrx_people_graph_employee_bridge_descriptor",
    "hrx_people_graph_security_continuation_descriptor",
    "hrx_employee_entity_reentry_descriptor",
    "hrx_employee_user_reverse_link_continuation_descriptor",
  ]),
  safety_gates: unique([
    ...HRX_CP901_REQUIREMENTS.safety_gates,
    "hrx_people_graph_rows_do_not_emit_permission_edges",
    "hrx_employee_reentry_does_not_conflate_user_account",
  ]),
  required_no_leak_guards: HRX_CP897_REQUIREMENTS.required_no_leak_guards,
});

export const HRX_CP903_REQUIRED_SECTION_ROWS = deepFreeze({
  "RP30.P01.M06": ["Employee HRX slice subphase 4", "Employee HRX slice subphase 5"],
  "RP30.P01.M07": [
    "EmploymentProfile HRX slice subphase 1",
    "EmploymentProfile HRX slice subphase 2",
    "EmploymentProfile HRX slice subphase 3",
    "EmploymentProfile HRX slice subphase 4",
    "EmploymentProfile HRX slice subphase 5",
  ],
  "RP30.P01.M08": [
    "HRDocument HRX slice subphase 1",
    "HRDocument HRX slice subphase 2",
    "HRDocument HRX slice subphase 3",
  ],
});

export const HRX_CP903_REQUIREMENTS = deepFreeze({
  deliverable_counts: {
    implementation: 10,
  },
  phase_counts: {
    "RP30.P01": 10,
  },
  micro_phase_row_counts: {
    "RP30.P01.M06": 2,
    "RP30.P01.M07": 5,
    "RP30.P01.M08": 3,
  },
  micro_title_row_counts: {
    "Employee HRX slice": 2,
    "EmploymentProfile HRX slice": 5,
    "HRDocument HRX slice": 3,
  },
  required_section_rows: HRX_CP903_REQUIRED_SECTION_ROWS,
  mandatory_artifacts: HRX_CP897_REQUIREMENTS.mandatory_artifacts,
  required_capabilities: unique([
    ...HRX_CP902_REQUIREMENTS.required_capabilities,
    "hrx_employee_profile_document_bridge_descriptor",
    "hrx_employee_tail_descriptor",
    "hrx_employment_profile_employee_link_continuation_descriptor",
    "hrx_hr_document_profile_link_descriptor",
  ]),
  safety_gates: unique([
    ...HRX_CP902_REQUIREMENTS.safety_gates,
    "hrx_employee_tail_does_not_authorize_user_session",
    "hrx_hr_document_reentry_does_not_store_document_body",
  ]),
  required_no_leak_guards: HRX_CP897_REQUIREMENTS.required_no_leak_guards,
});

export const HRX_CP904_REQUIRED_SECTION_ROWS = deepFreeze({
  "RP30.P01.M08": ["HRDocument HRX slice subphase 4", "HRDocument HRX slice subphase 5"],
  "RP30.P01.M09": [
    "EmploymentContract HRX slice subphase 1",
    "EmploymentContract HRX slice subphase 2",
    "EmploymentContract HRX slice subphase 3",
    "EmploymentContract HRX slice subphase 4",
    "EmploymentContract HRX slice subphase 5",
  ],
  "RP30.P01.M10": [
    "CompensationRecord HRX slice subphase 1",
    "CompensationRecord HRX slice subphase 2",
    "CompensationRecord HRX slice subphase 3",
  ],
});

export const HRX_CP904_REQUIREMENTS = deepFreeze({
  deliverable_counts: {
    implementation: 10,
  },
  phase_counts: {
    "RP30.P01": 10,
  },
  micro_phase_row_counts: {
    "RP30.P01.M08": 2,
    "RP30.P01.M09": 5,
    "RP30.P01.M10": 3,
  },
  micro_title_row_counts: {
    "HRDocument HRX slice": 2,
    "EmploymentContract HRX slice": 5,
    "CompensationRecord HRX slice": 3,
  },
  required_section_rows: HRX_CP904_REQUIRED_SECTION_ROWS,
  mandatory_artifacts: HRX_CP897_REQUIREMENTS.mandatory_artifacts,
  required_capabilities: unique([
    ...HRX_CP903_REQUIREMENTS.required_capabilities,
    "hrx_document_contract_compensation_bridge_descriptor",
    "hrx_hr_document_tail_descriptor",
    "hrx_employment_contract_document_link_descriptor",
    "hrx_compensation_record_contract_link_descriptor",
  ]),
  safety_gates: unique([
    ...HRX_CP903_REQUIREMENTS.safety_gates,
    "hrx_hr_document_tail_does_not_store_document_body",
    "hrx_employment_contract_reentry_does_not_store_contract_text",
    "hrx_compensation_record_reentry_does_not_include_amounts",
  ]),
  required_no_leak_guards: HRX_CP897_REQUIREMENTS.required_no_leak_guards,
});

export const HRX_CP905_REQUIRED_SECTION_ROWS = deepFreeze({
  "RP30.P01.M10": ["CompensationRecord HRX slice subphase 4", "CompensationRecord HRX slice subphase 5"],
  "RP30.P02.M00": [
    "RuleEngine HRX slice subphase 1",
    "RuleEngine HRX slice subphase 2",
    "RuleEngine HRX slice subphase 3",
    "RuleEngine HRX slice subphase 4",
    "RuleEngine HRX slice subphase 5",
    "RuleEngine HRX slice subphase 6",
    "RuleEngine HRX slice subphase 7",
    "RuleEngine HRX slice subphase 8",
  ],
});

export const HRX_CP905_REQUIREMENTS = deepFreeze({
  deliverable_counts: {
    implementation: 10,
  },
  phase_counts: {
    "RP30.P01": 2,
    "RP30.P02": 8,
  },
  micro_phase_row_counts: {
    "RP30.P01.M10": 2,
    "RP30.P02.M00": 8,
  },
  micro_title_row_counts: {
    "CompensationRecord HRX slice": 2,
    "RuleEngine HRX slice": 8,
  },
  required_section_rows: HRX_CP905_REQUIRED_SECTION_ROWS,
  mandatory_artifacts: HRX_CP897_REQUIREMENTS.mandatory_artifacts,
  required_capabilities: unique([
    ...HRX_CP904_REQUIREMENTS.required_capabilities,
    "hrx_compensation_rule_engine_bridge_descriptor",
    "hrx_compensation_record_tail_descriptor",
    "hrx_rule_engine_descriptor",
    "hrx_rule_engine_runtime_deferred_descriptor",
  ]),
  safety_gates: unique([
    ...HRX_CP904_REQUIREMENTS.safety_gates,
    "hrx_compensation_record_tail_does_not_include_amounts",
    "hrx_rule_engine_does_not_execute_rules",
    "hrx_rule_engine_does_not_write_decisions",
  ]),
  required_no_leak_guards: HRX_CP897_REQUIREMENTS.required_no_leak_guards,
});

export const HRX_CP906_REQUIRED_SECTION_ROWS = deepFreeze({
  "RP30.P02.M00": [
    "RuleEngine HRX slice subphase 9",
    "RuleEngine HRX slice subphase 10",
    "RuleEngine HRX slice subphase 11",
    "RuleEngine HRX slice subphase 12",
    "RuleEngine HRX slice subphase 13",
  ],
  "RP30.P02.M01": [
    "LeaveWorkflow HRX slice subphase 1",
    "LeaveWorkflow HRX slice subphase 2",
    "LeaveWorkflow HRX slice subphase 3",
    "LeaveWorkflow HRX slice subphase 4",
    "LeaveWorkflow HRX slice subphase 5",
  ],
});

export const HRX_CP906_REQUIREMENTS = deepFreeze({
  deliverable_counts: {
    implementation: 10,
  },
  phase_counts: {
    "RP30.P02": 10,
  },
  micro_phase_row_counts: {
    "RP30.P02.M00": 5,
    "RP30.P02.M01": 5,
  },
  micro_title_row_counts: {
    "RuleEngine HRX slice": 5,
    "LeaveWorkflow HRX slice": 5,
  },
  required_section_rows: HRX_CP906_REQUIRED_SECTION_ROWS,
  mandatory_artifacts: HRX_CP897_REQUIREMENTS.mandatory_artifacts,
  required_capabilities: unique([
    ...HRX_CP905_REQUIREMENTS.required_capabilities,
    "hrx_rule_engine_leave_workflow_bridge_descriptor",
    "hrx_rule_engine_tail_descriptor",
    "hrx_leave_workflow_descriptor",
    "hrx_leave_workflow_runtime_deferred_descriptor",
  ]),
  safety_gates: unique([
    ...HRX_CP905_REQUIREMENTS.safety_gates,
    "hrx_rule_engine_tail_does_not_execute_rules",
    "hrx_leave_workflow_does_not_execute_requests",
    "hrx_leave_workflow_does_not_write_approval_decisions",
  ]),
  required_no_leak_guards: HRX_CP897_REQUIREMENTS.required_no_leak_guards,
});

export const HRX_CP907_REQUIRED_SECTION_ROWS = deepFreeze({
  "RP30.P02.M01": [
    "LeaveWorkflow HRX slice subphase 6",
    "LeaveWorkflow HRX slice subphase 7",
    "LeaveWorkflow HRX slice subphase 8",
    "LeaveWorkflow HRX slice subphase 9",
    "LeaveWorkflow HRX slice subphase 10",
    "LeaveWorkflow HRX slice subphase 11",
    "LeaveWorkflow HRX slice subphase 12",
    "LeaveWorkflow HRX slice subphase 13",
  ],
  "RP30.P02.M02": [
    "AttendanceWorkflow HRX slice subphase 1",
    "AttendanceWorkflow HRX slice subphase 2",
  ],
});

export const HRX_CP907_REQUIREMENTS = deepFreeze({
  deliverable_counts: {
    implementation: 10,
  },
  phase_counts: {
    "RP30.P02": 10,
  },
  micro_phase_row_counts: {
    "RP30.P02.M01": 8,
    "RP30.P02.M02": 2,
  },
  micro_title_row_counts: {
    "LeaveWorkflow HRX slice": 8,
    "AttendanceWorkflow HRX slice": 2,
  },
  required_section_rows: HRX_CP907_REQUIRED_SECTION_ROWS,
  mandatory_artifacts: HRX_CP897_REQUIREMENTS.mandatory_artifacts,
  required_capabilities: unique([
    ...HRX_CP906_REQUIREMENTS.required_capabilities,
    "hrx_leave_attendance_workflow_bridge_descriptor",
    "hrx_leave_workflow_tail_descriptor",
    "hrx_attendance_workflow_descriptor",
    "hrx_attendance_workflow_runtime_deferred_descriptor",
  ]),
  safety_gates: unique([
    ...HRX_CP906_REQUIREMENTS.safety_gates,
    "hrx_leave_workflow_tail_does_not_execute_requests",
    "hrx_attendance_workflow_does_not_execute_requests",
    "hrx_attendance_workflow_does_not_write_decisions",
  ]),
  required_no_leak_guards: HRX_CP897_REQUIREMENTS.required_no_leak_guards,
});

export const HRX_CP908_REQUIRED_SECTION_ROWS = deepFreeze({
  "RP30.P02.M02": [
    "AttendanceWorkflow HRX slice subphase 3",
    "AttendanceWorkflow HRX slice subphase 4",
    "AttendanceWorkflow HRX slice subphase 5",
    "AttendanceWorkflow HRX slice subphase 6",
    "AttendanceWorkflow HRX slice subphase 7",
    "AttendanceWorkflow HRX slice subphase 8",
    "AttendanceWorkflow HRX slice subphase 9",
    "AttendanceWorkflow HRX slice subphase 10",
    "AttendanceWorkflow HRX slice subphase 11",
    "AttendanceWorkflow HRX slice subphase 12",
  ],
});

export const HRX_CP908_REQUIREMENTS = deepFreeze({
  deliverable_counts: {
    implementation: 10,
  },
  phase_counts: {
    "RP30.P02": 10,
  },
  micro_phase_row_counts: {
    "RP30.P02.M02": 10,
  },
  micro_title_row_counts: {
    "AttendanceWorkflow HRX slice": 10,
  },
  required_section_rows: HRX_CP908_REQUIRED_SECTION_ROWS,
  mandatory_artifacts: HRX_CP897_REQUIREMENTS.mandatory_artifacts,
  required_capabilities: unique([
    ...HRX_CP907_REQUIREMENTS.required_capabilities,
    "hrx_attendance_workflow_tail_descriptor",
    "hrx_attendance_record_writes_deferred_descriptor",
  ]),
  safety_gates: unique([
    ...HRX_CP907_REQUIREMENTS.safety_gates,
    "hrx_attendance_workflow_tail_does_not_execute_requests",
    "hrx_attendance_workflow_tail_does_not_write_decisions",
    "hrx_attendance_workflow_tail_does_not_write_records",
  ]),
  required_no_leak_guards: HRX_CP897_REQUIREMENTS.required_no_leak_guards,
});

export const HRX_CP909_REQUIRED_SECTION_ROWS = deepFreeze({
  "RP30.P02.M02": ["AttendanceWorkflow HRX slice subphase 13"],
  "RP30.P02.M03": [
    "RecruitmentWorkflow HRX slice subphase 1",
    "RecruitmentWorkflow HRX slice subphase 2",
    "RecruitmentWorkflow HRX slice subphase 3",
    "RecruitmentWorkflow HRX slice subphase 4",
    "RecruitmentWorkflow HRX slice subphase 5",
    "RecruitmentWorkflow HRX slice subphase 6",
    "RecruitmentWorkflow HRX slice subphase 7",
    "RecruitmentWorkflow HRX slice subphase 8",
    "RecruitmentWorkflow HRX slice subphase 9",
  ],
});

export const HRX_CP909_REQUIREMENTS = deepFreeze({
  deliverable_counts: {
    implementation: 10,
  },
  phase_counts: {
    "RP30.P02": 10,
  },
  micro_phase_row_counts: {
    "RP30.P02.M02": 1,
    "RP30.P02.M03": 9,
  },
  micro_title_row_counts: {
    "AttendanceWorkflow HRX slice": 1,
    "RecruitmentWorkflow HRX slice": 9,
  },
  required_section_rows: HRX_CP909_REQUIRED_SECTION_ROWS,
  mandatory_artifacts: HRX_CP897_REQUIREMENTS.mandatory_artifacts,
  required_capabilities: unique([
    ...HRX_CP908_REQUIREMENTS.required_capabilities,
    "hrx_attendance_recruitment_workflow_bridge_descriptor",
    "hrx_attendance_workflow_final_tail_descriptor",
    "hrx_recruitment_workflow_descriptor",
    "hrx_recruitment_workflow_runtime_deferred_descriptor",
  ]),
  safety_gates: unique([
    ...HRX_CP908_REQUIREMENTS.safety_gates,
    "hrx_attendance_workflow_final_tail_does_not_write_records",
    "hrx_recruitment_workflow_does_not_execute_requests",
    "hrx_recruitment_workflow_does_not_write_decisions",
    "hrx_recruitment_workflow_does_not_create_candidate_or_offer_records",
  ]),
  required_no_leak_guards: HRX_CP897_REQUIREMENTS.required_no_leak_guards,
});

export const HRX_CP910_REQUIRED_SECTION_ROWS = deepFreeze({
  "RP30.P02.M03": [
    "RecruitmentWorkflow HRX slice subphase 10",
    "RecruitmentWorkflow HRX slice subphase 11",
    "RecruitmentWorkflow HRX slice subphase 12",
    "RecruitmentWorkflow HRX slice subphase 13",
  ],
  "RP30.P02.M04": [
    "RiskWorkflow HRX slice subphase 1",
    "RiskWorkflow HRX slice subphase 2",
    "RiskWorkflow HRX slice subphase 3",
    "RiskWorkflow HRX slice subphase 4",
    "RiskWorkflow HRX slice subphase 5",
    "RiskWorkflow HRX slice subphase 6",
  ],
});

export const HRX_CP910_REQUIREMENTS = deepFreeze({
  deliverable_counts: {
    implementation: 10,
  },
  phase_counts: {
    "RP30.P02": 10,
  },
  micro_phase_row_counts: {
    "RP30.P02.M03": 4,
    "RP30.P02.M04": 6,
  },
  micro_title_row_counts: {
    "RecruitmentWorkflow HRX slice": 4,
    "RiskWorkflow HRX slice": 6,
  },
  required_section_rows: HRX_CP910_REQUIRED_SECTION_ROWS,
  mandatory_artifacts: HRX_CP897_REQUIREMENTS.mandatory_artifacts,
  required_capabilities: unique([
    ...HRX_CP909_REQUIREMENTS.required_capabilities,
    "hrx_recruitment_risk_workflow_bridge_descriptor",
    "hrx_recruitment_workflow_tail_descriptor",
    "hrx_risk_workflow_descriptor",
    "hrx_risk_workflow_runtime_deferred_descriptor",
    "hrx_risk_score_calculation_deferred_descriptor",
  ]),
  safety_gates: unique([
    ...HRX_CP909_REQUIREMENTS.safety_gates,
    "hrx_recruitment_workflow_tail_does_not_create_candidate_or_offer_records",
    "hrx_risk_workflow_does_not_execute_requests",
    "hrx_risk_workflow_does_not_write_decisions",
    "hrx_risk_workflow_does_not_write_records",
    "hrx_risk_workflow_does_not_calculate_scores",
  ]),
  required_no_leak_guards: HRX_CP897_REQUIREMENTS.required_no_leak_guards,
});

export const HRX_CP911_REQUIRED_SECTION_ROWS = deepFreeze({
  "RP30.P02.M04": [
    "RiskWorkflow HRX slice subphase 7",
    "RiskWorkflow HRX slice subphase 8",
    "RiskWorkflow HRX slice subphase 9",
    "RiskWorkflow HRX slice subphase 10",
    "RiskWorkflow HRX slice subphase 11",
    "RiskWorkflow HRX slice subphase 12",
  ],
  "RP30.P02.M05": [
    "ApprovalWorkflow HRX slice subphase 1",
    "ApprovalWorkflow HRX slice subphase 2",
    "ApprovalWorkflow HRX slice subphase 3",
    "ApprovalWorkflow HRX slice subphase 4",
  ],
});

export const HRX_CP911_REQUIREMENTS = deepFreeze({
  deliverable_counts: {
    implementation: 6,
    security_audit: 4,
  },
  phase_counts: {
    "RP30.P02": 10,
  },
  micro_phase_row_counts: {
    "RP30.P02.M04": 6,
    "RP30.P02.M05": 4,
  },
  micro_title_row_counts: {
    "RiskWorkflow HRX slice": 6,
    "ApprovalWorkflow HRX slice": 4,
  },
  required_section_rows: HRX_CP911_REQUIRED_SECTION_ROWS,
  mandatory_artifacts: HRX_CP897_REQUIREMENTS.mandatory_artifacts,
  required_capabilities: unique([
    ...HRX_CP910_REQUIREMENTS.required_capabilities,
    "hrx_risk_approval_workflow_bridge_descriptor",
    "hrx_risk_workflow_tail_descriptor",
    "hrx_approval_workflow_descriptor",
    "hrx_approval_workflow_runtime_deferred_descriptor",
    "hrx_approval_workflow_security_audit_descriptor",
  ]),
  safety_gates: unique([
    ...HRX_CP910_REQUIREMENTS.safety_gates,
    "hrx_risk_workflow_tail_does_not_calculate_scores",
    "hrx_approval_workflow_does_not_execute_requests",
    "hrx_approval_workflow_does_not_write_decisions",
    "hrx_approval_workflow_does_not_write_records",
  ]),
  required_no_leak_guards: HRX_CP897_REQUIREMENTS.required_no_leak_guards,
});

export const HRX_CP912_REQUIRED_SECTION_ROWS = deepFreeze({
  "RP30.P02.M05": [
    "ApprovalWorkflow HRX slice subphase 5",
    "ApprovalWorkflow HRX slice subphase 6",
    "ApprovalWorkflow HRX slice subphase 7",
    "ApprovalWorkflow HRX slice subphase 8",
    "ApprovalWorkflow HRX slice subphase 9",
    "ApprovalWorkflow HRX slice subphase 10",
    "ApprovalWorkflow HRX slice subphase 11",
    "ApprovalWorkflow HRX slice subphase 12",
    "ApprovalWorkflow HRX slice subphase 13",
  ],
  "RP30.P02.M06": ["RuleEngine HRX slice subphase 1"],
});

export const HRX_CP912_REQUIREMENTS = deepFreeze({
  deliverable_counts: {
    security_audit: 9,
    implementation: 1,
  },
  phase_counts: {
    "RP30.P02": 10,
  },
  micro_phase_row_counts: {
    "RP30.P02.M05": 9,
    "RP30.P02.M06": 1,
  },
  micro_title_row_counts: {
    "ApprovalWorkflow HRX slice": 9,
    "RuleEngine HRX slice": 1,
  },
  required_section_rows: HRX_CP912_REQUIRED_SECTION_ROWS,
  mandatory_artifacts: HRX_CP897_REQUIREMENTS.mandatory_artifacts,
  required_capabilities: unique([
    ...HRX_CP911_REQUIREMENTS.required_capabilities,
    "hrx_approval_rule_engine_bridge_descriptor",
    "hrx_approval_workflow_tail_descriptor",
    "hrx_rule_engine_reentry_descriptor",
    "hrx_rule_engine_runtime_deferred_descriptor",
  ]),
  safety_gates: unique([
    ...HRX_CP911_REQUIREMENTS.safety_gates,
    "hrx_approval_workflow_tail_does_not_write_decisions",
    "hrx_rule_engine_reentry_does_not_create_rule_definitions",
    "hrx_rule_engine_reentry_does_not_execute_rules",
    "hrx_rule_engine_reentry_does_not_write_decisions",
  ]),
  required_no_leak_guards: HRX_CP897_REQUIREMENTS.required_no_leak_guards,
});

export const HRX_CP913_REQUIRED_SECTION_ROWS = deepFreeze({
  "RP30.P02.M06": [
    "RuleEngine HRX slice subphase 2",
    "RuleEngine HRX slice subphase 3",
    "RuleEngine HRX slice subphase 4",
    "RuleEngine HRX slice subphase 5",
    "RuleEngine HRX slice subphase 6",
    "RuleEngine HRX slice subphase 7",
    "RuleEngine HRX slice subphase 8",
    "RuleEngine HRX slice subphase 9",
    "RuleEngine HRX slice subphase 10",
    "RuleEngine HRX slice subphase 11",
  ],
});

export const HRX_CP913_REQUIREMENTS = deepFreeze({
  deliverable_counts: {
    implementation: 10,
  },
  phase_counts: {
    "RP30.P02": 10,
  },
  micro_phase_row_counts: {
    "RP30.P02.M06": 10,
  },
  micro_title_row_counts: {
    "RuleEngine HRX slice": 10,
  },
  required_section_rows: HRX_CP913_REQUIRED_SECTION_ROWS,
  mandatory_artifacts: HRX_CP897_REQUIREMENTS.mandatory_artifacts,
  required_capabilities: unique([
    ...HRX_CP912_REQUIREMENTS.required_capabilities,
    "hrx_rule_engine_tail_descriptor",
    "hrx_rule_engine_tail_runtime_deferred_descriptor",
    "hrx_rule_engine_tail_decision_write_deferred_descriptor",
  ]),
  safety_gates: unique([
    ...HRX_CP912_REQUIREMENTS.safety_gates,
    "hrx_rule_engine_tail_does_not_create_rule_definitions",
    "hrx_rule_engine_tail_does_not_execute_rules",
    "hrx_rule_engine_tail_does_not_write_decisions",
  ]),
  required_no_leak_guards: HRX_CP897_REQUIREMENTS.required_no_leak_guards,
});

export const HRX_CP914_REQUIRED_SECTION_ROWS = deepFreeze({
  "RP30.P02.M06": ["RuleEngine HRX slice subphase 12"],
  "RP30.P02.M07": [
    "LeaveWorkflow HRX slice subphase 1",
    "LeaveWorkflow HRX slice subphase 2",
    "LeaveWorkflow HRX slice subphase 3",
    "LeaveWorkflow HRX slice subphase 4",
    "LeaveWorkflow HRX slice subphase 5",
    "LeaveWorkflow HRX slice subphase 6",
    "LeaveWorkflow HRX slice subphase 7",
    "LeaveWorkflow HRX slice subphase 8",
    "LeaveWorkflow HRX slice subphase 9",
  ],
});

export const HRX_CP914_REQUIREMENTS = deepFreeze({
  deliverable_counts: {
    implementation: 10,
  },
  phase_counts: {
    "RP30.P02": 10,
  },
  micro_phase_row_counts: {
    "RP30.P02.M06": 1,
    "RP30.P02.M07": 9,
  },
  micro_title_row_counts: {
    "RuleEngine HRX slice": 1,
    "LeaveWorkflow HRX slice": 9,
  },
  required_section_rows: HRX_CP914_REQUIRED_SECTION_ROWS,
  mandatory_artifacts: HRX_CP897_REQUIREMENTS.mandatory_artifacts,
  required_capabilities: unique([
    ...HRX_CP913_REQUIREMENTS.required_capabilities,
    "hrx_rule_engine_leave_workflow_bridge_descriptor",
    "hrx_rule_engine_final_tail_descriptor",
    "hrx_leave_workflow_reentry_descriptor",
    "hrx_leave_workflow_runtime_deferred_descriptor",
  ]),
  safety_gates: unique([
    ...HRX_CP913_REQUIREMENTS.safety_gates,
    "hrx_rule_engine_final_tail_does_not_create_rule_definitions",
    "hrx_rule_engine_final_tail_does_not_execute_rules",
    "hrx_rule_engine_final_tail_does_not_write_decisions",
    "hrx_leave_workflow_does_not_execute_requests",
    "hrx_leave_workflow_does_not_write_approval_decisions",
  ]),
  required_no_leak_guards: HRX_CP897_REQUIREMENTS.required_no_leak_guards,
});

export const HRX_CP915_REQUIRED_SECTION_ROWS = deepFreeze({
  "RP30.P02.M07": [
    "LeaveWorkflow HRX slice subphase 10",
    "LeaveWorkflow HRX slice subphase 11",
    "LeaveWorkflow HRX slice subphase 12",
  ],
  "RP30.P02.M08": [
    "AttendanceWorkflow HRX slice subphase 1",
    "AttendanceWorkflow HRX slice subphase 2",
    "AttendanceWorkflow HRX slice subphase 3",
    "AttendanceWorkflow HRX slice subphase 4",
    "AttendanceWorkflow HRX slice subphase 5",
    "AttendanceWorkflow HRX slice subphase 6",
    "AttendanceWorkflow HRX slice subphase 7",
  ],
});

export const HRX_CP915_REQUIREMENTS = deepFreeze({
  deliverable_counts: {
    implementation: 10,
  },
  phase_counts: {
    "RP30.P02": 10,
  },
  micro_phase_row_counts: {
    "RP30.P02.M07": 3,
    "RP30.P02.M08": 7,
  },
  micro_title_row_counts: {
    "LeaveWorkflow HRX slice": 3,
    "AttendanceWorkflow HRX slice": 7,
  },
  required_section_rows: HRX_CP915_REQUIRED_SECTION_ROWS,
  mandatory_artifacts: HRX_CP897_REQUIREMENTS.mandatory_artifacts,
  required_capabilities: unique([
    ...HRX_CP914_REQUIREMENTS.required_capabilities,
    "hrx_leave_attendance_workflow_bridge_descriptor",
    "hrx_leave_workflow_final_tail_descriptor",
    "hrx_attendance_workflow_reentry_descriptor",
    "hrx_attendance_workflow_runtime_deferred_descriptor",
  ]),
  safety_gates: unique([
    ...HRX_CP914_REQUIREMENTS.safety_gates,
    "hrx_leave_workflow_final_tail_does_not_execute_requests",
    "hrx_leave_workflow_final_tail_does_not_write_approval_decisions",
    "hrx_attendance_workflow_does_not_execute_requests",
    "hrx_attendance_workflow_does_not_write_decisions",
    "hrx_attendance_workflow_does_not_write_records",
  ]),
  required_no_leak_guards: HRX_CP897_REQUIREMENTS.required_no_leak_guards,
});

export const HRX_CP916_REQUIRED_SECTION_ROWS = deepFreeze({
  "RP30.P02.M08": [
    "AttendanceWorkflow HRX slice subphase 8",
    "AttendanceWorkflow HRX slice subphase 9",
    "AttendanceWorkflow HRX slice subphase 10",
    "AttendanceWorkflow HRX slice subphase 11",
    "AttendanceWorkflow HRX slice subphase 12",
  ],
  "RP30.P02.M09": [
    "RecruitmentWorkflow HRX slice subphase 1",
    "RecruitmentWorkflow HRX slice subphase 2",
    "RecruitmentWorkflow HRX slice subphase 3",
    "RecruitmentWorkflow HRX slice subphase 4",
    "RecruitmentWorkflow HRX slice subphase 5",
  ],
});

export const HRX_CP916_REQUIREMENTS = deepFreeze({
  deliverable_counts: {
    implementation: 10,
  },
  phase_counts: {
    "RP30.P02": 10,
  },
  micro_phase_row_counts: {
    "RP30.P02.M08": 5,
    "RP30.P02.M09": 5,
  },
  micro_title_row_counts: {
    "AttendanceWorkflow HRX slice": 5,
    "RecruitmentWorkflow HRX slice": 5,
  },
  required_section_rows: HRX_CP916_REQUIRED_SECTION_ROWS,
  mandatory_artifacts: HRX_CP897_REQUIREMENTS.mandatory_artifacts,
  required_capabilities: unique([
    ...HRX_CP915_REQUIREMENTS.required_capabilities,
    "hrx_attendance_recruitment_workflow_bridge_descriptor",
    "hrx_attendance_workflow_tail_descriptor",
    "hrx_recruitment_workflow_reentry_descriptor",
    "hrx_recruitment_workflow_runtime_deferred_descriptor",
  ]),
  safety_gates: unique([
    ...HRX_CP915_REQUIREMENTS.safety_gates,
    "hrx_attendance_workflow_tail_does_not_write_records",
    "hrx_recruitment_workflow_does_not_execute_requests",
    "hrx_recruitment_workflow_does_not_write_decisions",
    "hrx_recruitment_workflow_does_not_create_candidate_or_offer_records",
  ]),
  required_no_leak_guards: HRX_CP897_REQUIREMENTS.required_no_leak_guards,
});

export const HRX_CP917_REQUIRED_SECTION_ROWS = deepFreeze({
  "RP30.P02.M09": [
    "RecruitmentWorkflow HRX slice subphase 6",
    "RecruitmentWorkflow HRX slice subphase 7",
    "RecruitmentWorkflow HRX slice subphase 8",
    "RecruitmentWorkflow HRX slice subphase 9",
    "RecruitmentWorkflow HRX slice subphase 10",
    "RecruitmentWorkflow HRX slice subphase 11",
    "RecruitmentWorkflow HRX slice subphase 12",
  ],
  "RP30.P02.M10": [
    "RiskWorkflow HRX slice subphase 1",
    "RiskWorkflow HRX slice subphase 2",
    "RiskWorkflow HRX slice subphase 3",
  ],
});

export const HRX_CP917_REQUIREMENTS = deepFreeze({
  deliverable_counts: {
    implementation: 10,
  },
  phase_counts: {
    "RP30.P02": 10,
  },
  micro_phase_row_counts: {
    "RP30.P02.M09": 7,
    "RP30.P02.M10": 3,
  },
  micro_title_row_counts: {
    "RecruitmentWorkflow HRX slice": 7,
    "RiskWorkflow HRX slice": 3,
  },
  required_section_rows: HRX_CP917_REQUIRED_SECTION_ROWS,
  mandatory_artifacts: HRX_CP897_REQUIREMENTS.mandatory_artifacts,
  required_capabilities: unique([
    ...HRX_CP916_REQUIREMENTS.required_capabilities,
    "hrx_recruitment_risk_workflow_tail_bridge_descriptor",
    "hrx_recruitment_workflow_tail_descriptor",
    "hrx_risk_workflow_reentry_descriptor",
    "hrx_risk_workflow_runtime_deferred_descriptor",
    "hrx_risk_score_calculation_deferred_descriptor",
  ]),
  safety_gates: unique([
    ...HRX_CP916_REQUIREMENTS.safety_gates,
    "hrx_recruitment_workflow_tail_does_not_create_candidate_or_offer_records",
    "hrx_risk_workflow_does_not_execute_events",
    "hrx_risk_workflow_does_not_write_decisions",
    "hrx_risk_workflow_does_not_write_records",
    "hrx_risk_workflow_does_not_calculate_scores",
  ]),
  required_no_leak_guards: HRX_CP897_REQUIREMENTS.required_no_leak_guards,
});

export const HRX_CP918_REQUIRED_SECTION_ROWS = deepFreeze({
  "RP30.P02.M10": [
    "RiskWorkflow HRX slice subphase 4",
    "RiskWorkflow HRX slice subphase 5",
    "RiskWorkflow HRX slice subphase 6",
    "RiskWorkflow HRX slice subphase 7",
    "RiskWorkflow HRX slice subphase 8",
    "RiskWorkflow HRX slice subphase 9",
    "RiskWorkflow HRX slice subphase 10",
    "RiskWorkflow HRX slice subphase 11",
    "RiskWorkflow HRX slice subphase 12",
  ],
  "RP30.P03.M00": ["HRApi HRX slice subphase 1"],
});

export const HRX_CP918_REQUIREMENTS = deepFreeze({
  deliverable_counts: {
    implementation: 10,
  },
  phase_counts: {
    "RP30.P02": 9,
    "RP30.P03": 1,
  },
  micro_phase_row_counts: {
    "RP30.P02.M10": 9,
    "RP30.P03.M00": 1,
  },
  micro_title_row_counts: {
    "RiskWorkflow HRX slice": 9,
    "HRApi HRX slice": 1,
  },
  required_section_rows: HRX_CP918_REQUIRED_SECTION_ROWS,
  mandatory_artifacts: HRX_CP897_REQUIREMENTS.mandatory_artifacts,
  required_capabilities: unique([
    ...HRX_CP917_REQUIREMENTS.required_capabilities,
    "hrx_risk_hr_api_foundation_bridge_descriptor",
    "hrx_risk_workflow_tail_descriptor",
    "hrx_hr_api_foundation_descriptor",
    "hrx_hr_api_runtime_deferred_descriptor",
  ]),
  safety_gates: unique([
    ...HRX_CP917_REQUIREMENTS.safety_gates,
    "hrx_risk_workflow_tail_does_not_calculate_scores",
    "hrx_hr_api_does_not_open_runtime",
    "hrx_hr_api_does_not_accept_payloads",
    "hrx_hr_api_does_not_write_records",
  ]),
  required_no_leak_guards: HRX_CP897_REQUIREMENTS.required_no_leak_guards,
});

export const HRX_CP919_REQUIRED_SECTION_ROWS = deepFreeze({
  "RP30.P03.M00": [
    "HRApi HRX slice subphase 2",
    "HRApi HRX slice subphase 3",
    "HRApi HRX slice subphase 4",
    "HRApi HRX slice subphase 5",
  ],
  "RP30.P03.M01": [
    "EmployeeApi HRX slice subphase 1",
    "EmployeeApi HRX slice subphase 2",
    "EmployeeApi HRX slice subphase 3",
    "EmployeeApi HRX slice subphase 4",
    "EmployeeApi HRX slice subphase 5",
  ],
  "RP30.P03.M02": ["LeaveApi HRX slice subphase 1"],
});

export const HRX_CP919_REQUIREMENTS = deepFreeze({
  deliverable_counts: {
    implementation: 10,
  },
  phase_counts: {
    "RP30.P03": 10,
  },
  micro_phase_row_counts: {
    "RP30.P03.M00": 4,
    "RP30.P03.M01": 5,
    "RP30.P03.M02": 1,
  },
  micro_title_row_counts: {
    "HRApi HRX slice": 4,
    "EmployeeApi HRX slice": 5,
    "LeaveApi HRX slice": 1,
  },
  required_section_rows: HRX_CP919_REQUIRED_SECTION_ROWS,
  mandatory_artifacts: HRX_CP897_REQUIREMENTS.mandatory_artifacts,
  required_capabilities: unique([
    ...HRX_CP918_REQUIREMENTS.required_capabilities,
    "hrx_hr_employee_leave_api_bridge_descriptor",
    "hrx_hr_api_tail_descriptor",
    "hrx_employee_api_foundation_descriptor",
    "hrx_leave_api_foundation_descriptor",
    "hrx_api_runtime_deferred_descriptor",
  ]),
  safety_gates: unique([
    ...HRX_CP918_REQUIREMENTS.safety_gates,
    "hrx_employee_api_does_not_open_runtime",
    "hrx_employee_api_does_not_accept_payloads",
    "hrx_employee_api_does_not_write_records",
    "hrx_leave_api_does_not_open_runtime",
    "hrx_leave_api_does_not_accept_payloads",
    "hrx_leave_api_does_not_write_records",
  ]),
  required_no_leak_guards: HRX_CP897_REQUIREMENTS.required_no_leak_guards,
});

export const HRX_CP920_REQUIRED_SECTION_ROWS = deepFreeze({
  "RP30.P03.M02": [
    "LeaveApi HRX slice subphase 2",
    "LeaveApi HRX slice subphase 3",
    "LeaveApi HRX slice subphase 4",
    "LeaveApi HRX slice subphase 5",
  ],
  "RP30.P03.M03": [
    "CandidateApi HRX slice subphase 1",
    "CandidateApi HRX slice subphase 2",
    "CandidateApi HRX slice subphase 3",
    "CandidateApi HRX slice subphase 4",
    "CandidateApi HRX slice subphase 5",
  ],
  "RP30.P03.M04": ["EvidenceApi HRX slice subphase 1"],
});

export const HRX_CP920_REQUIREMENTS = deepFreeze({
  deliverable_counts: {
    implementation: 10,
  },
  phase_counts: {
    "RP30.P03": 10,
  },
  micro_phase_row_counts: {
    "RP30.P03.M02": 4,
    "RP30.P03.M03": 5,
    "RP30.P03.M04": 1,
  },
  micro_title_row_counts: {
    "LeaveApi HRX slice": 4,
    "CandidateApi HRX slice": 5,
    "EvidenceApi HRX slice": 1,
  },
  required_section_rows: HRX_CP920_REQUIRED_SECTION_ROWS,
  mandatory_artifacts: HRX_CP897_REQUIREMENTS.mandatory_artifacts,
  required_capabilities: unique([
    ...HRX_CP919_REQUIREMENTS.required_capabilities,
    "hrx_leave_candidate_evidence_api_bridge_descriptor",
    "hrx_leave_api_tail_descriptor",
    "hrx_candidate_api_foundation_descriptor",
    "hrx_evidence_api_foundation_descriptor",
    "hrx_api_runtime_deferred_descriptor",
  ]),
  safety_gates: unique([
    ...HRX_CP919_REQUIREMENTS.safety_gates,
    "hrx_candidate_api_does_not_open_runtime",
    "hrx_candidate_api_does_not_accept_payloads",
    "hrx_candidate_api_does_not_write_records",
    "hrx_evidence_api_does_not_open_runtime",
    "hrx_evidence_api_does_not_accept_payloads",
    "hrx_evidence_api_does_not_write_records",
  ]),
  required_no_leak_guards: HRX_CP897_REQUIREMENTS.required_no_leak_guards,
});

export const HRX_CP921_REQUIRED_SECTION_ROWS = deepFreeze({
  "RP30.P03.M04": [
    "EvidenceApi HRX slice subphase 2",
    "EvidenceApi HRX slice subphase 3",
    "EvidenceApi HRX slice subphase 4",
    "EvidenceApi HRX slice subphase 5",
  ],
  "RP30.P03.M05": [
    "ErrorModel HRX slice subphase 1",
    "ErrorModel HRX slice subphase 2",
    "ErrorModel HRX slice subphase 3",
    "ErrorModel HRX slice subphase 4",
    "ErrorModel HRX slice subphase 5",
    "ErrorModel HRX slice subphase 6",
  ],
});

export const HRX_CP921_REQUIREMENTS = deepFreeze({
  deliverable_counts: {
    implementation: 4,
    security_audit: 6,
  },
  phase_counts: {
    "RP30.P03": 10,
  },
  micro_phase_row_counts: {
    "RP30.P03.M04": 4,
    "RP30.P03.M05": 6,
  },
  micro_title_row_counts: {
    "EvidenceApi HRX slice": 4,
    "ErrorModel HRX slice": 6,
  },
  required_section_rows: HRX_CP921_REQUIRED_SECTION_ROWS,
  mandatory_artifacts: HRX_CP897_REQUIREMENTS.mandatory_artifacts,
  required_capabilities: unique([
    ...HRX_CP920_REQUIREMENTS.required_capabilities,
    "hrx_evidence_error_model_bridge_descriptor",
    "hrx_evidence_api_tail_descriptor",
    "hrx_error_model_security_audit_descriptor",
    "hrx_error_model_runtime_deferred_descriptor",
  ]),
  safety_gates: unique([
    ...HRX_CP920_REQUIREMENTS.safety_gates,
    "hrx_error_model_does_not_open_runtime",
    "hrx_error_model_does_not_accept_payloads",
    "hrx_error_model_does_not_write_records",
    "hrx_error_model_does_not_execute_policy_rules",
  ]),
  required_no_leak_guards: HRX_CP897_REQUIREMENTS.required_no_leak_guards,
});

export const HRX_CP922_REQUIRED_SECTION_ROWS = deepFreeze({
  "RP30.P03.M05": [
    "ErrorModel HRX slice subphase 7",
    "ErrorModel HRX slice subphase 8",
    "ErrorModel HRX slice subphase 9",
  ],
  "RP30.P03.M06": [
    "HRApi HRX slice subphase 1",
    "HRApi HRX slice subphase 2",
    "HRApi HRX slice subphase 3",
    "HRApi HRX slice subphase 4",
    "HRApi HRX slice subphase 5",
  ],
  "RP30.P03.M07": [
    "EmployeeApi HRX slice subphase 1",
    "EmployeeApi HRX slice subphase 2",
  ],
});

export const HRX_CP922_REQUIREMENTS = deepFreeze({
  deliverable_counts: {
    implementation: 7,
    security_audit: 3,
  },
  phase_counts: {
    "RP30.P03": 10,
  },
  micro_phase_row_counts: {
    "RP30.P03.M05": 3,
    "RP30.P03.M06": 5,
    "RP30.P03.M07": 2,
  },
  micro_title_row_counts: {
    "ErrorModel HRX slice": 3,
    "HRApi HRX slice": 5,
    "EmployeeApi HRX slice": 2,
  },
  required_section_rows: HRX_CP922_REQUIRED_SECTION_ROWS,
  mandatory_artifacts: HRX_CP897_REQUIREMENTS.mandatory_artifacts,
  required_capabilities: unique([
    ...HRX_CP921_REQUIREMENTS.required_capabilities,
    "hrx_error_model_hr_employee_api_bridge_descriptor",
    "hrx_error_model_tail_descriptor",
    "hrx_hr_api_reentry_descriptor",
    "hrx_employee_api_reentry_descriptor",
  ]),
  safety_gates: unique([
    ...HRX_CP921_REQUIREMENTS.safety_gates,
    "hrx_hr_api_reentry_does_not_open_runtime",
    "hrx_hr_api_reentry_does_not_accept_payloads",
    "hrx_hr_api_reentry_does_not_write_records",
    "hrx_employee_api_reentry_does_not_open_runtime",
    "hrx_employee_api_reentry_does_not_accept_payloads",
    "hrx_employee_api_reentry_does_not_write_records",
  ]),
  required_no_leak_guards: HRX_CP897_REQUIREMENTS.required_no_leak_guards,
});

export const HRX_CP923_REQUIRED_SECTION_ROWS = deepFreeze({
  "RP30.P03.M07": [
    "EmployeeApi HRX slice subphase 3",
    "EmployeeApi HRX slice subphase 4",
    "EmployeeApi HRX slice subphase 5",
  ],
  "RP30.P03.M08": [
    "LeaveApi HRX slice subphase 1",
    "LeaveApi HRX slice subphase 2",
    "LeaveApi HRX slice subphase 3",
    "LeaveApi HRX slice subphase 4",
    "LeaveApi HRX slice subphase 5",
  ],
  "RP30.P03.M09": [
    "CandidateApi HRX slice subphase 1",
    "CandidateApi HRX slice subphase 2",
  ],
});

export const HRX_CP923_REQUIREMENTS = deepFreeze({
  deliverable_counts: {
    implementation: 10,
  },
  phase_counts: {
    "RP30.P03": 10,
  },
  micro_phase_row_counts: {
    "RP30.P03.M07": 3,
    "RP30.P03.M08": 5,
    "RP30.P03.M09": 2,
  },
  micro_title_row_counts: {
    "EmployeeApi HRX slice": 3,
    "LeaveApi HRX slice": 5,
    "CandidateApi HRX slice": 2,
  },
  required_section_rows: HRX_CP923_REQUIRED_SECTION_ROWS,
  mandatory_artifacts: HRX_CP897_REQUIREMENTS.mandatory_artifacts,
  required_capabilities: unique([
    ...HRX_CP922_REQUIREMENTS.required_capabilities,
    "hrx_employee_leave_candidate_api_bridge_descriptor",
    "hrx_employee_api_tail_descriptor",
    "hrx_leave_api_reentry_descriptor",
    "hrx_candidate_api_reentry_descriptor",
  ]),
  safety_gates: unique([
    ...HRX_CP922_REQUIREMENTS.safety_gates,
    "hrx_employee_api_tail_does_not_open_runtime",
    "hrx_employee_api_tail_does_not_accept_payloads",
    "hrx_employee_api_tail_does_not_write_records",
    "hrx_leave_api_reentry_does_not_open_runtime",
    "hrx_leave_api_reentry_does_not_accept_payloads",
    "hrx_leave_api_reentry_does_not_write_records",
    "hrx_candidate_api_reentry_does_not_open_runtime",
    "hrx_candidate_api_reentry_does_not_accept_payloads",
    "hrx_candidate_api_reentry_does_not_write_records",
  ]),
  required_no_leak_guards: HRX_CP897_REQUIREMENTS.required_no_leak_guards,
});

export const HRX_CP924_REQUIRED_SECTION_ROWS = deepFreeze({
  "RP30.P03.M09": [
    "CandidateApi HRX slice subphase 3",
    "CandidateApi HRX slice subphase 4",
    "CandidateApi HRX slice subphase 5",
  ],
  "RP30.P03.M10": [
    "EvidenceApi HRX slice subphase 1",
    "EvidenceApi HRX slice subphase 2",
    "EvidenceApi HRX slice subphase 3",
    "EvidenceApi HRX slice subphase 4",
    "EvidenceApi HRX slice subphase 5",
  ],
  "RP30.P04.M00": [
    "HROperations HRX slice subphase 1",
    "HROperations HRX slice subphase 2",
  ],
});

export const HRX_CP924_REQUIREMENTS = deepFreeze({
  deliverable_counts: {
    implementation: 10,
  },
  phase_counts: {
    "RP30.P03": 8,
    "RP30.P04": 2,
  },
  micro_phase_row_counts: {
    "RP30.P03.M09": 3,
    "RP30.P03.M10": 5,
    "RP30.P04.M00": 2,
  },
  micro_title_row_counts: {
    "CandidateApi HRX slice": 3,
    "EvidenceApi HRX slice": 5,
    "HROperations HRX slice": 2,
  },
  required_section_rows: HRX_CP924_REQUIRED_SECTION_ROWS,
  mandatory_artifacts: HRX_CP897_REQUIREMENTS.mandatory_artifacts,
  required_capabilities: unique([
    ...HRX_CP923_REQUIREMENTS.required_capabilities,
    "hrx_candidate_evidence_hr_operations_bridge_descriptor",
    "hrx_candidate_api_tail_descriptor",
    "hrx_evidence_api_reentry_descriptor",
    "hrx_hr_operations_foundation_descriptor",
  ]),
  safety_gates: unique([
    ...HRX_CP923_REQUIREMENTS.safety_gates,
    "hrx_candidate_api_tail_does_not_open_runtime",
    "hrx_candidate_api_tail_does_not_accept_payloads",
    "hrx_candidate_api_tail_does_not_write_records",
    "hrx_evidence_api_reentry_does_not_open_runtime",
    "hrx_evidence_api_reentry_does_not_accept_payloads",
    "hrx_evidence_api_reentry_does_not_write_records",
    "hrx_hr_operations_does_not_open_runtime",
    "hrx_hr_operations_does_not_write_records",
    "hrx_hr_operations_does_not_execute_policies",
    "hrx_hr_operations_does_not_finalize_hr_state",
  ]),
  required_no_leak_guards: HRX_CP897_REQUIREMENTS.required_no_leak_guards,
});

export const HRX_CP925_REQUIRED_SECTION_ROWS = deepFreeze({
  "RP30.P04.M00": [
    "HROperations HRX slice subphase 3",
    "HROperations HRX slice subphase 4",
    "HROperations HRX slice subphase 5",
    "HROperations HRX slice subphase 6",
    "HROperations HRX slice subphase 7",
    "HROperations HRX slice subphase 8",
    "HROperations HRX slice subphase 9",
  ],
  "RP30.P04.M01": [
    "EmployeePortal HRX slice subphase 1",
    "EmployeePortal HRX slice subphase 2",
    "EmployeePortal HRX slice subphase 3",
  ],
});

export const HRX_CP925_REQUIREMENTS = deepFreeze({
  deliverable_counts: {
    implementation: 10,
  },
  phase_counts: {
    "RP30.P04": 10,
  },
  micro_phase_row_counts: {
    "RP30.P04.M00": 7,
    "RP30.P04.M01": 3,
  },
  micro_title_row_counts: {
    "HROperations HRX slice": 7,
    "EmployeePortal HRX slice": 3,
  },
  required_section_rows: HRX_CP925_REQUIRED_SECTION_ROWS,
  mandatory_artifacts: HRX_CP897_REQUIREMENTS.mandatory_artifacts,
  required_capabilities: unique([
    ...HRX_CP924_REQUIREMENTS.required_capabilities,
    "hrx_hr_operations_employee_portal_bridge_descriptor",
    "hrx_hr_operations_tail_descriptor",
    "hrx_employee_portal_foundation_descriptor",
  ]),
  safety_gates: unique([
    ...HRX_CP924_REQUIREMENTS.safety_gates,
    "hrx_hr_operations_tail_does_not_open_runtime",
    "hrx_hr_operations_tail_does_not_write_records",
    "hrx_hr_operations_tail_does_not_execute_policies",
    "hrx_hr_operations_tail_does_not_finalize_hr_state",
    "hrx_employee_portal_does_not_open_runtime",
    "hrx_employee_portal_does_not_write_records",
    "hrx_employee_portal_does_not_execute_self_service_actions",
    "hrx_employee_portal_does_not_bypass_permissions",
  ]),
  required_no_leak_guards: HRX_CP897_REQUIREMENTS.required_no_leak_guards,
});

export const HRX_CP926_REQUIRED_SECTION_ROWS = deepFreeze({
  "RP30.P04.M01": [
    "EmployeePortal HRX slice subphase 4",
    "EmployeePortal HRX slice subphase 5",
    "EmployeePortal HRX slice subphase 6",
    "EmployeePortal HRX slice subphase 7",
    "EmployeePortal HRX slice subphase 8",
    "EmployeePortal HRX slice subphase 9",
  ],
  "RP30.P04.M02": [
    "CandidatePortal HRX slice subphase 1",
    "CandidatePortal HRX slice subphase 2",
    "CandidatePortal HRX slice subphase 3",
    "CandidatePortal HRX slice subphase 4",
  ],
});

export const HRX_CP926_REQUIREMENTS = deepFreeze({
  deliverable_counts: {
    implementation: 10,
  },
  phase_counts: {
    "RP30.P04": 10,
  },
  micro_phase_row_counts: {
    "RP30.P04.M01": 6,
    "RP30.P04.M02": 4,
  },
  micro_title_row_counts: {
    "EmployeePortal HRX slice": 6,
    "CandidatePortal HRX slice": 4,
  },
  required_section_rows: HRX_CP926_REQUIRED_SECTION_ROWS,
  mandatory_artifacts: HRX_CP897_REQUIREMENTS.mandatory_artifacts,
  required_capabilities: unique([
    ...HRX_CP925_REQUIREMENTS.required_capabilities,
    "hrx_employee_candidate_portal_bridge_descriptor",
    "hrx_employee_portal_tail_descriptor",
    "hrx_candidate_portal_foundation_descriptor",
  ]),
  safety_gates: unique([
    ...HRX_CP925_REQUIREMENTS.safety_gates,
    "hrx_employee_portal_tail_does_not_open_runtime",
    "hrx_employee_portal_tail_does_not_write_records",
    "hrx_employee_portal_tail_does_not_execute_self_service_actions",
    "hrx_employee_portal_tail_does_not_bypass_permissions",
    "hrx_candidate_portal_does_not_open_runtime",
    "hrx_candidate_portal_does_not_write_records",
    "hrx_candidate_portal_does_not_execute_self_service_actions",
    "hrx_candidate_portal_does_not_bypass_permissions",
  ]),
  required_no_leak_guards: HRX_CP897_REQUIREMENTS.required_no_leak_guards,
});

export const HRX_CP927_REQUIRED_SECTION_ROWS = deepFreeze({
  "RP30.P04.M02": [
    "CandidatePortal HRX slice subphase 5",
    "CandidatePortal HRX slice subphase 6",
    "CandidatePortal HRX slice subphase 7",
    "CandidatePortal HRX slice subphase 8",
    "CandidatePortal HRX slice subphase 9",
  ],
  "RP30.P04.M03": [
    "AIReviewQueue HRX slice subphase 1",
    "AIReviewQueue HRX slice subphase 2",
    "AIReviewQueue HRX slice subphase 3",
    "AIReviewQueue HRX slice subphase 4",
    "AIReviewQueue HRX slice subphase 5",
  ],
});

export const HRX_CP927_REQUIREMENTS = deepFreeze({
  deliverable_counts: {
    implementation: 10,
  },
  phase_counts: {
    "RP30.P04": 10,
  },
  micro_phase_row_counts: {
    "RP30.P04.M02": 5,
    "RP30.P04.M03": 5,
  },
  micro_title_row_counts: {
    "CandidatePortal HRX slice": 5,
    "AIReviewQueue HRX slice": 5,
  },
  required_section_rows: HRX_CP927_REQUIRED_SECTION_ROWS,
  mandatory_artifacts: HRX_CP897_REQUIREMENTS.mandatory_artifacts,
  required_capabilities: unique([
    ...HRX_CP926_REQUIREMENTS.required_capabilities,
    "hrx_candidate_ai_review_queue_bridge_descriptor",
    "hrx_candidate_portal_tail_descriptor",
    "hrx_ai_review_queue_foundation_descriptor",
  ]),
  safety_gates: unique([
    ...HRX_CP926_REQUIREMENTS.safety_gates,
    "hrx_candidate_portal_tail_does_not_open_runtime",
    "hrx_candidate_portal_tail_does_not_write_records",
    "hrx_candidate_portal_tail_does_not_execute_self_service_actions",
    "hrx_candidate_portal_tail_does_not_bypass_permissions",
    "hrx_ai_review_queue_does_not_open_runtime",
    "hrx_ai_review_queue_does_not_write_records",
    "hrx_ai_review_queue_does_not_execute_review_actions",
    "hrx_ai_review_queue_does_not_issue_final_judgment",
  ]),
  required_no_leak_guards: HRX_CP897_REQUIREMENTS.required_no_leak_guards,
});

export const HRX_CP928_REQUIRED_SECTION_ROWS = deepFreeze({
  "RP30.P04.M03": [
    "AIReviewQueue HRX slice subphase 6",
    "AIReviewQueue HRX slice subphase 7",
    "AIReviewQueue HRX slice subphase 8",
    "AIReviewQueue HRX slice subphase 9",
  ],
  "RP30.P04.M04": [
    "AdminPolicy HRX slice subphase 1",
    "AdminPolicy HRX slice subphase 2",
    "AdminPolicy HRX slice subphase 3",
    "AdminPolicy HRX slice subphase 4",
    "AdminPolicy HRX slice subphase 5",
    "AdminPolicy HRX slice subphase 6",
  ],
});

export const HRX_CP928_REQUIREMENTS = deepFreeze({
  deliverable_counts: {
    implementation: 10,
  },
  phase_counts: {
    "RP30.P04": 10,
  },
  micro_phase_row_counts: {
    "RP30.P04.M03": 4,
    "RP30.P04.M04": 6,
  },
  micro_title_row_counts: {
    "AIReviewQueue HRX slice": 4,
    "AdminPolicy HRX slice": 6,
  },
  required_section_rows: HRX_CP928_REQUIRED_SECTION_ROWS,
  mandatory_artifacts: HRX_CP897_REQUIREMENTS.mandatory_artifacts,
  required_capabilities: unique([
    ...HRX_CP927_REQUIREMENTS.required_capabilities,
    "hrx_ai_review_admin_policy_bridge_descriptor",
    "hrx_ai_review_queue_tail_descriptor",
    "hrx_admin_policy_foundation_descriptor",
  ]),
  safety_gates: unique([
    ...HRX_CP927_REQUIREMENTS.safety_gates,
    "hrx_ai_review_queue_tail_does_not_open_runtime",
    "hrx_ai_review_queue_tail_does_not_write_records",
    "hrx_ai_review_queue_tail_does_not_execute_review_actions",
    "hrx_ai_review_queue_tail_does_not_issue_final_judgment",
    "hrx_admin_policy_does_not_open_runtime",
    "hrx_admin_policy_does_not_write_records",
    "hrx_admin_policy_does_not_execute_rules",
    "hrx_admin_policy_does_not_finalize_policy",
  ]),
  required_no_leak_guards: HRX_CP897_REQUIREMENTS.required_no_leak_guards,
});

export const HRX_CP929_REQUIRED_SECTION_ROWS = deepFreeze({
  "RP30.P04.M04": [
    "AdminPolicy HRX slice subphase 7",
    "AdminPolicy HRX slice subphase 8",
    "AdminPolicy HRX slice subphase 9",
  ],
  "RP30.P04.M05": [
    "DeniedState HRX slice subphase 1",
    "DeniedState HRX slice subphase 2",
    "DeniedState HRX slice subphase 3",
    "DeniedState HRX slice subphase 4",
    "DeniedState HRX slice subphase 5",
    "DeniedState HRX slice subphase 6",
    "DeniedState HRX slice subphase 7",
  ],
});

export const HRX_CP929_REQUIREMENTS = deepFreeze({
  deliverable_counts: {
    implementation: 3,
    security_audit: 7,
  },
  phase_counts: {
    "RP30.P04": 10,
  },
  micro_phase_row_counts: {
    "RP30.P04.M04": 3,
    "RP30.P04.M05": 7,
  },
  micro_title_row_counts: {
    "AdminPolicy HRX slice": 3,
    "DeniedState HRX slice": 7,
  },
  required_section_rows: HRX_CP929_REQUIRED_SECTION_ROWS,
  mandatory_artifacts: HRX_CP897_REQUIREMENTS.mandatory_artifacts,
  required_capabilities: unique([
    ...HRX_CP928_REQUIREMENTS.required_capabilities,
    "hrx_admin_policy_denied_state_bridge_descriptor",
    "hrx_admin_policy_tail_descriptor",
    "hrx_denied_state_security_audit_descriptor",
  ]),
  safety_gates: unique([
    ...HRX_CP928_REQUIREMENTS.safety_gates,
    "hrx_admin_policy_tail_does_not_open_runtime",
    "hrx_admin_policy_tail_does_not_write_records",
    "hrx_admin_policy_tail_does_not_execute_rules",
    "hrx_admin_policy_tail_does_not_finalize_policy",
    "hrx_denied_state_does_not_open_runtime",
    "hrx_denied_state_does_not_write_records",
    "hrx_denied_state_does_not_grant_access",
    "hrx_denied_state_does_not_bypass_policy",
  ]),
  required_no_leak_guards: HRX_CP897_REQUIREMENTS.required_no_leak_guards,
});

export const HRX_CP930_REQUIRED_SECTION_ROWS = deepFreeze({
  "RP30.P04.M05": [
    "DeniedState HRX slice subphase 8",
    "DeniedState HRX slice subphase 9",
  ],
  "RP30.P04.M06": [
    "HROperations HRX slice subphase 1",
    "HROperations HRX slice subphase 2",
    "HROperations HRX slice subphase 3",
    "HROperations HRX slice subphase 4",
    "HROperations HRX slice subphase 5",
    "HROperations HRX slice subphase 6",
    "HROperations HRX slice subphase 7",
    "HROperations HRX slice subphase 8",
  ],
});

export const HRX_CP930_REQUIREMENTS = deepFreeze({
  deliverable_counts: {
    security_audit: 2,
    implementation: 8,
  },
  phase_counts: {
    "RP30.P04": 10,
  },
  micro_phase_row_counts: {
    "RP30.P04.M05": 2,
    "RP30.P04.M06": 8,
  },
  micro_title_row_counts: {
    "DeniedState HRX slice": 2,
    "HROperations HRX slice": 8,
  },
  required_section_rows: HRX_CP930_REQUIRED_SECTION_ROWS,
  mandatory_artifacts: HRX_CP897_REQUIREMENTS.mandatory_artifacts,
  required_capabilities: unique([
    ...HRX_CP929_REQUIREMENTS.required_capabilities,
    "hrx_denied_state_hr_operations_bridge_descriptor",
    "hrx_denied_state_tail_security_audit_descriptor",
    "hrx_hr_operations_foundation_descriptor",
  ]),
  safety_gates: unique([
    ...HRX_CP929_REQUIREMENTS.safety_gates,
    "hrx_denied_state_tail_does_not_open_runtime",
    "hrx_denied_state_tail_does_not_write_records",
    "hrx_denied_state_tail_does_not_grant_access",
    "hrx_denied_state_tail_does_not_bypass_policy",
    "hrx_hr_operations_does_not_open_runtime",
    "hrx_hr_operations_does_not_write_records",
    "hrx_hr_operations_does_not_execute_policy",
    "hrx_hr_operations_does_not_finalize_state",
  ]),
  required_no_leak_guards: HRX_CP897_REQUIREMENTS.required_no_leak_guards,
});

export const HRX_CP931_REQUIRED_SECTION_ROWS = deepFreeze({
  "RP30.P04.M06": [
    "HROperations HRX slice subphase 9",
  ],
  "RP30.P04.M07": [
    "EmployeePortal HRX slice subphase 1",
    "EmployeePortal HRX slice subphase 2",
    "EmployeePortal HRX slice subphase 3",
    "EmployeePortal HRX slice subphase 4",
    "EmployeePortal HRX slice subphase 5",
    "EmployeePortal HRX slice subphase 6",
    "EmployeePortal HRX slice subphase 7",
    "EmployeePortal HRX slice subphase 8",
  ],
  "RP30.P04.M08": [
    "CandidatePortal HRX slice subphase 1",
  ],
});

export const HRX_CP931_REQUIREMENTS = deepFreeze({
  deliverable_counts: {
    implementation: 10,
  },
  phase_counts: {
    "RP30.P04": 10,
  },
  micro_phase_row_counts: {
    "RP30.P04.M06": 1,
    "RP30.P04.M07": 8,
    "RP30.P04.M08": 1,
  },
  micro_title_row_counts: {
    "HROperations HRX slice": 1,
    "EmployeePortal HRX slice": 8,
    "CandidatePortal HRX slice": 1,
  },
  required_section_rows: HRX_CP931_REQUIRED_SECTION_ROWS,
  mandatory_artifacts: HRX_CP897_REQUIREMENTS.mandatory_artifacts,
  required_capabilities: unique([
    ...HRX_CP930_REQUIREMENTS.required_capabilities,
    "hrx_hr_operations_employee_candidate_portal_bridge_descriptor",
    "hrx_hr_operations_tail_descriptor",
    "hrx_employee_portal_foundation_descriptor",
    "hrx_candidate_portal_foundation_descriptor",
  ]),
  safety_gates: unique([
    ...HRX_CP930_REQUIREMENTS.safety_gates,
    "hrx_hr_operations_tail_does_not_open_runtime",
    "hrx_hr_operations_tail_does_not_write_records",
    "hrx_hr_operations_tail_does_not_execute_policies",
    "hrx_hr_operations_tail_does_not_finalize_hr_state",
    "hrx_employee_portal_does_not_open_runtime",
    "hrx_employee_portal_does_not_write_records",
    "hrx_employee_portal_does_not_execute_self_service_actions",
    "hrx_employee_portal_does_not_bypass_permissions",
    "hrx_candidate_portal_does_not_open_runtime",
    "hrx_candidate_portal_does_not_write_records",
    "hrx_candidate_portal_does_not_execute_self_service_actions",
    "hrx_candidate_portal_does_not_bypass_permissions",
  ]),
  required_no_leak_guards: HRX_CP897_REQUIREMENTS.required_no_leak_guards,
});

export const HRX_CP932_REQUIRED_SECTION_ROWS = deepFreeze({
  "RP30.P04.M08": [
    "CandidatePortal HRX slice subphase 2",
    "CandidatePortal HRX slice subphase 3",
    "CandidatePortal HRX slice subphase 4",
    "CandidatePortal HRX slice subphase 5",
    "CandidatePortal HRX slice subphase 6",
    "CandidatePortal HRX slice subphase 7",
    "CandidatePortal HRX slice subphase 8",
  ],
  "RP30.P04.M09": [
    "AIReviewQueue HRX slice subphase 1",
    "AIReviewQueue HRX slice subphase 2",
    "AIReviewQueue HRX slice subphase 3",
  ],
});

export const HRX_CP932_REQUIREMENTS = deepFreeze({
  deliverable_counts: {
    implementation: 10,
  },
  phase_counts: {
    "RP30.P04": 10,
  },
  micro_phase_row_counts: {
    "RP30.P04.M08": 7,
    "RP30.P04.M09": 3,
  },
  micro_title_row_counts: {
    "CandidatePortal HRX slice": 7,
    "AIReviewQueue HRX slice": 3,
  },
  required_section_rows: HRX_CP932_REQUIRED_SECTION_ROWS,
  mandatory_artifacts: HRX_CP897_REQUIREMENTS.mandatory_artifacts,
  required_capabilities: unique([
    ...HRX_CP931_REQUIREMENTS.required_capabilities,
    "hrx_candidate_ai_review_queue_bridge_descriptor",
    "hrx_candidate_portal_tail_descriptor",
    "hrx_ai_review_queue_foundation_descriptor",
  ]),
  safety_gates: unique([
    ...HRX_CP931_REQUIREMENTS.safety_gates,
    "hrx_candidate_portal_tail_does_not_open_runtime",
    "hrx_candidate_portal_tail_does_not_write_records",
    "hrx_candidate_portal_tail_does_not_execute_self_service_actions",
    "hrx_candidate_portal_tail_does_not_bypass_permissions",
    "hrx_ai_review_queue_does_not_open_runtime",
    "hrx_ai_review_queue_does_not_write_records",
    "hrx_ai_review_queue_does_not_execute_review_actions",
    "hrx_ai_review_queue_does_not_allow_final_judgment",
  ]),
  required_no_leak_guards: HRX_CP897_REQUIREMENTS.required_no_leak_guards,
});

export const HRX_CP933_REQUIRED_SECTION_ROWS = deepFreeze({
  "RP30.P04.M09": [
    "AIReviewQueue HRX slice subphase 4",
    "AIReviewQueue HRX slice subphase 5",
    "AIReviewQueue HRX slice subphase 6",
    "AIReviewQueue HRX slice subphase 7",
    "AIReviewQueue HRX slice subphase 8",
  ],
  "RP30.P04.M10": [
    "AdminPolicy HRX slice subphase 1",
    "AdminPolicy HRX slice subphase 2",
    "AdminPolicy HRX slice subphase 3",
    "AdminPolicy HRX slice subphase 4",
    "AdminPolicy HRX slice subphase 5",
  ],
});

export const HRX_CP933_REQUIREMENTS = deepFreeze({
  deliverable_counts: {
    implementation: 10,
  },
  phase_counts: {
    "RP30.P04": 10,
  },
  micro_phase_row_counts: {
    "RP30.P04.M09": 5,
    "RP30.P04.M10": 5,
  },
  micro_title_row_counts: {
    "AIReviewQueue HRX slice": 5,
    "AdminPolicy HRX slice": 5,
  },
  required_section_rows: HRX_CP933_REQUIRED_SECTION_ROWS,
  mandatory_artifacts: HRX_CP897_REQUIREMENTS.mandatory_artifacts,
  required_capabilities: unique([
    ...HRX_CP932_REQUIREMENTS.required_capabilities,
    "hrx_ai_review_admin_policy_tail_bridge_descriptor",
    "hrx_ai_review_queue_tail_descriptor",
    "hrx_admin_policy_foundation_descriptor",
  ]),
  safety_gates: unique([
    ...HRX_CP932_REQUIREMENTS.safety_gates,
    "hrx_ai_review_queue_tail_does_not_open_runtime",
    "hrx_ai_review_queue_tail_does_not_write_records",
    "hrx_ai_review_queue_tail_does_not_execute_review_actions",
    "hrx_ai_review_queue_tail_does_not_issue_final_judgment",
    "hrx_admin_policy_does_not_open_runtime",
    "hrx_admin_policy_does_not_write_records",
    "hrx_admin_policy_does_not_execute_rules",
    "hrx_admin_policy_does_not_finalize_policy",
  ]),
  required_no_leak_guards: HRX_CP897_REQUIREMENTS.required_no_leak_guards,
});

export const HRX_CP934_REQUIRED_SECTION_ROWS = deepFreeze({
  "RP30.P04.M10": [
    "AdminPolicy HRX slice subphase 6",
    "AdminPolicy HRX slice subphase 7",
    "AdminPolicy HRX slice subphase 8",
    "AdminPolicy HRX slice subphase 9",
  ],
  "RP30.P05.M00": [
    "SyntheticTenant HRX slice subphase 1",
    "SyntheticTenant HRX slice subphase 2",
    "SyntheticTenant HRX slice subphase 3",
    "SyntheticTenant HRX slice subphase 4",
    "SyntheticTenant HRX slice subphase 5",
    "SyntheticTenant HRX slice subphase 6",
  ],
});

export const HRX_CP934_REQUIREMENTS = deepFreeze({
  deliverable_counts: {
    implementation: 10,
  },
  phase_counts: {
    "RP30.P04": 4,
    "RP30.P05": 6,
  },
  micro_phase_row_counts: {
    "RP30.P04.M10": 4,
    "RP30.P05.M00": 6,
  },
  micro_title_row_counts: {
    "AdminPolicy HRX slice": 4,
    "SyntheticTenant HRX slice": 6,
  },
  required_section_rows: HRX_CP934_REQUIRED_SECTION_ROWS,
  mandatory_artifacts: HRX_CP897_REQUIREMENTS.mandatory_artifacts,
  required_capabilities: unique([
    ...HRX_CP933_REQUIREMENTS.required_capabilities,
    "hrx_admin_policy_synthetic_tenant_bridge_descriptor",
    "hrx_admin_policy_tail_descriptor",
    "hrx_synthetic_tenant_foundation_descriptor",
  ]),
  safety_gates: unique([
    ...HRX_CP933_REQUIREMENTS.safety_gates,
    "hrx_admin_policy_tail_does_not_open_runtime",
    "hrx_admin_policy_tail_does_not_write_records",
    "hrx_admin_policy_tail_does_not_execute_rules",
    "hrx_admin_policy_tail_does_not_finalize_policy",
    "hrx_synthetic_tenant_does_not_open_runtime",
    "hrx_synthetic_tenant_does_not_write_records",
    "hrx_synthetic_tenant_does_not_use_real_hr_data",
    "hrx_synthetic_tenant_does_not_bypass_permissions",
  ]),
  required_no_leak_guards: HRX_CP897_REQUIREMENTS.required_no_leak_guards,
});

export const HRX_CP935_REQUIRED_SECTION_ROWS = deepFreeze({
  "RP30.P05.M00": [
    "SyntheticTenant HRX slice subphase 7",
    "SyntheticTenant HRX slice subphase 8",
    "SyntheticTenant HRX slice subphase 9",
  ],
  "RP30.P05.M01": [
    "EmployeeFixture HRX slice subphase 1",
    "EmployeeFixture HRX slice subphase 2",
    "EmployeeFixture HRX slice subphase 3",
    "EmployeeFixture HRX slice subphase 4",
    "EmployeeFixture HRX slice subphase 5",
    "EmployeeFixture HRX slice subphase 6",
    "EmployeeFixture HRX slice subphase 7",
  ],
});

export const HRX_CP935_REQUIREMENTS = deepFreeze({
  deliverable_counts: {
    implementation: 10,
  },
  phase_counts: {
    "RP30.P05": 10,
  },
  micro_phase_row_counts: {
    "RP30.P05.M00": 3,
    "RP30.P05.M01": 7,
  },
  micro_title_row_counts: {
    "SyntheticTenant HRX slice": 3,
    "EmployeeFixture HRX slice": 7,
  },
  required_section_rows: HRX_CP935_REQUIRED_SECTION_ROWS,
  mandatory_artifacts: HRX_CP897_REQUIREMENTS.mandatory_artifacts,
  required_capabilities: unique([
    ...HRX_CP934_REQUIREMENTS.required_capabilities,
    "hrx_synthetic_tenant_employee_fixture_bridge_descriptor",
    "hrx_synthetic_tenant_tail_descriptor",
    "hrx_employee_fixture_foundation_descriptor",
  ]),
  safety_gates: unique([
    ...HRX_CP934_REQUIREMENTS.safety_gates,
    "hrx_synthetic_tenant_tail_does_not_open_runtime",
    "hrx_synthetic_tenant_tail_does_not_write_records",
    "hrx_synthetic_tenant_tail_does_not_use_real_hr_data",
    "hrx_employee_fixture_does_not_open_runtime",
    "hrx_employee_fixture_does_not_write_records",
    "hrx_employee_fixture_does_not_use_real_employee_data",
    "hrx_employee_fixture_does_not_bypass_permissions",
  ]),
  required_no_leak_guards: HRX_CP897_REQUIREMENTS.required_no_leak_guards,
});

export const HRX_CP936_REQUIRED_SECTION_ROWS = deepFreeze({
  "RP30.P05.M01": [
    "EmployeeFixture HRX slice subphase 8",
    "EmployeeFixture HRX slice subphase 9",
  ],
  "RP30.P05.M02": [
    "CandidateFixture HRX slice subphase 1",
    "CandidateFixture HRX slice subphase 2",
    "CandidateFixture HRX slice subphase 3",
    "CandidateFixture HRX slice subphase 4",
    "CandidateFixture HRX slice subphase 5",
    "CandidateFixture HRX slice subphase 6",
    "CandidateFixture HRX slice subphase 7",
    "CandidateFixture HRX slice subphase 8",
  ],
});

export const HRX_CP936_REQUIREMENTS = deepFreeze({
  deliverable_counts: {
    implementation: 10,
  },
  phase_counts: {
    "RP30.P05": 10,
  },
  micro_phase_row_counts: {
    "RP30.P05.M01": 2,
    "RP30.P05.M02": 8,
  },
  micro_title_row_counts: {
    "EmployeeFixture HRX slice": 2,
    "CandidateFixture HRX slice": 8,
  },
  required_section_rows: HRX_CP936_REQUIRED_SECTION_ROWS,
  mandatory_artifacts: HRX_CP897_REQUIREMENTS.mandatory_artifacts,
  required_capabilities: unique([
    ...HRX_CP935_REQUIREMENTS.required_capabilities,
    "hrx_employee_candidate_fixture_bridge_descriptor",
    "hrx_employee_fixture_tail_descriptor",
    "hrx_candidate_fixture_foundation_descriptor",
  ]),
  safety_gates: unique([
    ...HRX_CP935_REQUIREMENTS.safety_gates,
    "hrx_employee_fixture_tail_does_not_open_runtime",
    "hrx_employee_fixture_tail_does_not_write_records",
    "hrx_employee_fixture_tail_does_not_use_real_employee_data",
    "hrx_candidate_fixture_does_not_open_runtime",
    "hrx_candidate_fixture_does_not_write_records",
    "hrx_candidate_fixture_does_not_use_real_candidate_data",
    "hrx_candidate_fixture_does_not_bypass_permissions",
    "hrx_candidate_fixture_does_not_open_identity_link_runtime",
  ]),
  required_no_leak_guards: HRX_CP897_REQUIREMENTS.required_no_leak_guards,
});

export const HRX_CP937_REQUIRED_SECTION_ROWS = deepFreeze({
  "RP30.P05.M02": [
    "CandidateFixture HRX slice subphase 9",
  ],
  "RP30.P05.M03": [
    "LeaveFixture HRX slice subphase 1",
    "LeaveFixture HRX slice subphase 2",
    "LeaveFixture HRX slice subphase 3",
    "LeaveFixture HRX slice subphase 4",
    "LeaveFixture HRX slice subphase 5",
    "LeaveFixture HRX slice subphase 6",
    "LeaveFixture HRX slice subphase 7",
    "LeaveFixture HRX slice subphase 8",
    "LeaveFixture HRX slice subphase 9",
  ],
});

export const HRX_CP937_REQUIREMENTS = deepFreeze({
  deliverable_counts: {
    implementation: 10,
  },
  phase_counts: {
    "RP30.P05": 10,
  },
  micro_phase_row_counts: {
    "RP30.P05.M02": 1,
    "RP30.P05.M03": 9,
  },
  micro_title_row_counts: {
    "CandidateFixture HRX slice": 1,
    "LeaveFixture HRX slice": 9,
  },
  required_section_rows: HRX_CP937_REQUIRED_SECTION_ROWS,
  mandatory_artifacts: HRX_CP897_REQUIREMENTS.mandatory_artifacts,
  required_capabilities: unique([
    ...HRX_CP936_REQUIREMENTS.required_capabilities,
    "hrx_candidate_leave_fixture_bridge_descriptor",
    "hrx_candidate_fixture_tail_descriptor",
    "hrx_leave_fixture_foundation_descriptor",
  ]),
  safety_gates: unique([
    ...HRX_CP936_REQUIREMENTS.safety_gates,
    "hrx_candidate_fixture_tail_does_not_open_runtime",
    "hrx_candidate_fixture_tail_does_not_write_records",
    "hrx_candidate_fixture_tail_does_not_use_real_candidate_data",
    "hrx_leave_fixture_does_not_open_runtime",
    "hrx_leave_fixture_does_not_write_records",
    "hrx_leave_fixture_does_not_use_real_leave_data",
    "hrx_leave_fixture_does_not_bypass_permissions",
    "hrx_leave_fixture_does_not_open_request_runtime",
  ]),
  required_no_leak_guards: HRX_CP897_REQUIREMENTS.required_no_leak_guards,
});

export const HRX_CP938_REQUIRED_SECTION_ROWS = deepFreeze({
  "RP30.P05.M04": [
    "RiskFixture HRX slice subphase 1",
    "RiskFixture HRX slice subphase 2",
    "RiskFixture HRX slice subphase 3",
    "RiskFixture HRX slice subphase 4",
    "RiskFixture HRX slice subphase 5",
    "RiskFixture HRX slice subphase 6",
    "RiskFixture HRX slice subphase 7",
    "RiskFixture HRX slice subphase 8",
    "RiskFixture HRX slice subphase 9",
  ],
  "RP30.P05.M05": [
    "AuditFixture HRX slice subphase 1",
  ],
});

export const HRX_CP938_REQUIREMENTS = deepFreeze({
  deliverable_counts: {
    implementation: 9,
    security_audit: 1,
  },
  phase_counts: {
    "RP30.P05": 10,
  },
  micro_phase_row_counts: {
    "RP30.P05.M04": 9,
    "RP30.P05.M05": 1,
  },
  micro_title_row_counts: {
    "RiskFixture HRX slice": 9,
    "AuditFixture HRX slice": 1,
  },
  required_section_rows: HRX_CP938_REQUIRED_SECTION_ROWS,
  mandatory_artifacts: HRX_CP897_REQUIREMENTS.mandatory_artifacts,
  required_capabilities: unique([
    ...HRX_CP937_REQUIREMENTS.required_capabilities,
    "hrx_risk_audit_fixture_bridge_descriptor",
    "hrx_risk_fixture_foundation_descriptor",
    "hrx_audit_fixture_foundation_descriptor",
  ]),
  safety_gates: unique([
    ...HRX_CP937_REQUIREMENTS.safety_gates,
    "hrx_risk_fixture_does_not_open_runtime",
    "hrx_risk_fixture_does_not_write_records",
    "hrx_risk_fixture_does_not_use_real_risk_data",
    "hrx_risk_fixture_does_not_calculate_scores",
    "hrx_audit_fixture_does_not_open_runtime",
    "hrx_audit_fixture_does_not_write_records",
    "hrx_audit_fixture_does_not_use_real_audit_data",
    "hrx_audit_fixture_does_not_emit_runtime_receipts",
  ]),
  required_no_leak_guards: HRX_CP897_REQUIREMENTS.required_no_leak_guards,
});

export const HRX_CP939_REQUIRED_SECTION_ROWS = deepFreeze({
  "RP30.P05.M05": [
    "AuditFixture HRX slice subphase 2",
    "AuditFixture HRX slice subphase 3",
    "AuditFixture HRX slice subphase 4",
    "AuditFixture HRX slice subphase 5",
    "AuditFixture HRX slice subphase 6",
    "AuditFixture HRX slice subphase 7",
    "AuditFixture HRX slice subphase 8",
    "AuditFixture HRX slice subphase 9",
  ],
  "RP30.P05.M06": [
    "SyntheticTenant HRX slice subphase 1",
    "SyntheticTenant HRX slice subphase 2",
  ],
});

export const HRX_CP939_REQUIREMENTS = deepFreeze({
  deliverable_counts: {
    implementation: 2,
    security_audit: 8,
  },
  phase_counts: {
    "RP30.P05": 10,
  },
  micro_phase_row_counts: {
    "RP30.P05.M05": 8,
    "RP30.P05.M06": 2,
  },
  micro_title_row_counts: {
    "AuditFixture HRX slice": 8,
    "SyntheticTenant HRX slice": 2,
  },
  required_section_rows: HRX_CP939_REQUIRED_SECTION_ROWS,
  mandatory_artifacts: HRX_CP897_REQUIREMENTS.mandatory_artifacts,
  required_capabilities: unique([
    ...HRX_CP938_REQUIREMENTS.required_capabilities,
    "hrx_audit_fixture_synthetic_tenant_bridge_descriptor",
    "hrx_audit_fixture_tail_descriptor",
    "hrx_synthetic_tenant_foundation_descriptor",
  ]),
  safety_gates: unique([
    ...HRX_CP938_REQUIREMENTS.safety_gates,
    "hrx_audit_fixture_tail_does_not_open_runtime",
    "hrx_audit_fixture_tail_does_not_write_records",
    "hrx_audit_fixture_tail_does_not_use_real_audit_data",
    "hrx_audit_fixture_tail_does_not_emit_runtime_receipts",
    "hrx_synthetic_tenant_foundation_does_not_open_runtime",
    "hrx_synthetic_tenant_foundation_does_not_write_records",
    "hrx_synthetic_tenant_foundation_does_not_use_real_hr_data",
    "hrx_synthetic_tenant_foundation_does_not_bypass_permissions",
    "hrx_synthetic_tenant_foundation_does_not_open_fixture_runtime",
  ]),
  required_no_leak_guards: HRX_CP897_REQUIREMENTS.required_no_leak_guards,
});

export const HRX_CP940_REQUIRED_SECTION_ROWS = deepFreeze({
  "RP30.P05.M06": [
    "SyntheticTenant HRX slice subphase 3",
    "SyntheticTenant HRX slice subphase 4",
    "SyntheticTenant HRX slice subphase 5",
    "SyntheticTenant HRX slice subphase 6",
    "SyntheticTenant HRX slice subphase 7",
    "SyntheticTenant HRX slice subphase 8",
    "SyntheticTenant HRX slice subphase 9",
  ],
  "RP30.P05.M07": [
    "EmployeeFixture HRX slice subphase 1",
    "EmployeeFixture HRX slice subphase 2",
    "EmployeeFixture HRX slice subphase 3",
  ],
});

export const HRX_CP940_REQUIREMENTS = deepFreeze({
  deliverable_counts: {
    implementation: 10,
  },
  phase_counts: {
    "RP30.P05": 10,
  },
  micro_phase_row_counts: {
    "RP30.P05.M06": 7,
    "RP30.P05.M07": 3,
  },
  micro_title_row_counts: {
    "SyntheticTenant HRX slice": 7,
    "EmployeeFixture HRX slice": 3,
  },
  required_section_rows: HRX_CP940_REQUIRED_SECTION_ROWS,
  mandatory_artifacts: HRX_CP897_REQUIREMENTS.mandatory_artifacts,
  required_capabilities: unique([
    ...HRX_CP939_REQUIREMENTS.required_capabilities,
    "hrx_synthetic_tenant_employee_fixture_tail_bridge_descriptor",
    "hrx_synthetic_tenant_tail_descriptor",
    "hrx_employee_fixture_foundation_descriptor",
  ]),
  safety_gates: unique([
    ...HRX_CP939_REQUIREMENTS.safety_gates,
    "hrx_synthetic_tenant_tail_does_not_open_runtime",
    "hrx_synthetic_tenant_tail_does_not_write_records",
    "hrx_synthetic_tenant_tail_does_not_use_real_hr_data",
    "hrx_synthetic_tenant_tail_does_not_bypass_permissions",
    "hrx_synthetic_tenant_tail_does_not_open_fixture_runtime",
    "hrx_employee_fixture_foundation_does_not_open_runtime",
    "hrx_employee_fixture_foundation_does_not_write_records",
    "hrx_employee_fixture_foundation_does_not_use_real_employee_data",
    "hrx_employee_fixture_foundation_does_not_bypass_permissions",
    "hrx_employee_fixture_foundation_does_not_open_identity_link_runtime",
  ]),
  required_no_leak_guards: HRX_CP897_REQUIREMENTS.required_no_leak_guards,
});

export const HRX_CP941_REQUIRED_SECTION_ROWS = deepFreeze({
  "RP30.P05.M07": [
    "EmployeeFixture HRX slice subphase 4",
    "EmployeeFixture HRX slice subphase 5",
    "EmployeeFixture HRX slice subphase 6",
    "EmployeeFixture HRX slice subphase 7",
    "EmployeeFixture HRX slice subphase 8",
  ],
  "RP30.P05.M08": [
    "CandidateFixture HRX slice subphase 1",
    "CandidateFixture HRX slice subphase 2",
    "CandidateFixture HRX slice subphase 3",
    "CandidateFixture HRX slice subphase 4",
    "CandidateFixture HRX slice subphase 5",
  ],
});

export const HRX_CP941_REQUIREMENTS = deepFreeze({
  deliverable_counts: {
    implementation: 10,
  },
  phase_counts: {
    "RP30.P05": 10,
  },
  micro_phase_row_counts: {
    "RP30.P05.M07": 5,
    "RP30.P05.M08": 5,
  },
  micro_title_row_counts: {
    "EmployeeFixture HRX slice": 5,
    "CandidateFixture HRX slice": 5,
  },
  required_section_rows: HRX_CP941_REQUIRED_SECTION_ROWS,
  mandatory_artifacts: HRX_CP897_REQUIREMENTS.mandatory_artifacts,
  required_capabilities: unique([
    ...HRX_CP940_REQUIREMENTS.required_capabilities,
    "hrx_employee_candidate_fixture_tail_bridge_descriptor",
    "hrx_employee_fixture_tail_descriptor",
    "hrx_candidate_fixture_foundation_descriptor",
  ]),
  safety_gates: unique([
    ...HRX_CP940_REQUIREMENTS.safety_gates,
    "hrx_employee_fixture_tail_does_not_open_runtime",
    "hrx_employee_fixture_tail_does_not_write_records",
    "hrx_employee_fixture_tail_does_not_use_real_employee_data",
    "hrx_employee_fixture_tail_does_not_bypass_permissions",
    "hrx_employee_fixture_tail_does_not_open_identity_link_runtime",
    "hrx_candidate_fixture_foundation_does_not_open_runtime",
    "hrx_candidate_fixture_foundation_does_not_write_records",
    "hrx_candidate_fixture_foundation_does_not_use_real_candidate_data",
    "hrx_candidate_fixture_foundation_does_not_bypass_permissions",
    "hrx_candidate_fixture_foundation_does_not_open_identity_link_runtime",
  ]),
  required_no_leak_guards: HRX_CP897_REQUIREMENTS.required_no_leak_guards,
});

export const HRX_CP942_REQUIRED_SECTION_ROWS = deepFreeze({
  "RP30.P05.M08": [
    "CandidateFixture HRX slice subphase 6",
    "CandidateFixture HRX slice subphase 7",
    "CandidateFixture HRX slice subphase 8",
  ],
  "RP30.P05.M09": [
    "LeaveFixture HRX slice subphase 1",
    "LeaveFixture HRX slice subphase 2",
    "LeaveFixture HRX slice subphase 3",
    "LeaveFixture HRX slice subphase 4",
    "LeaveFixture HRX slice subphase 5",
    "LeaveFixture HRX slice subphase 6",
    "LeaveFixture HRX slice subphase 7",
  ],
});

export const HRX_CP942_REQUIREMENTS = deepFreeze({
  deliverable_counts: {
    implementation: 10,
  },
  phase_counts: {
    "RP30.P05": 10,
  },
  micro_phase_row_counts: {
    "RP30.P05.M08": 3,
    "RP30.P05.M09": 7,
  },
  micro_title_row_counts: {
    "CandidateFixture HRX slice": 3,
    "LeaveFixture HRX slice": 7,
  },
  required_section_rows: HRX_CP942_REQUIRED_SECTION_ROWS,
  mandatory_artifacts: HRX_CP897_REQUIREMENTS.mandatory_artifacts,
  required_capabilities: unique([
    ...HRX_CP941_REQUIREMENTS.required_capabilities,
    "hrx_candidate_leave_fixture_tail_bridge_descriptor",
    "hrx_candidate_fixture_tail_descriptor",
    "hrx_leave_fixture_foundation_descriptor",
  ]),
  safety_gates: unique([
    ...HRX_CP941_REQUIREMENTS.safety_gates,
    "hrx_candidate_fixture_tail_does_not_open_runtime",
    "hrx_candidate_fixture_tail_does_not_write_records",
    "hrx_candidate_fixture_tail_does_not_use_real_candidate_data",
    "hrx_candidate_fixture_tail_does_not_bypass_permissions",
    "hrx_candidate_fixture_tail_does_not_open_identity_link_runtime",
    "hrx_leave_fixture_foundation_does_not_open_runtime",
    "hrx_leave_fixture_foundation_does_not_write_records",
    "hrx_leave_fixture_foundation_does_not_use_real_leave_data",
    "hrx_leave_fixture_foundation_does_not_bypass_permissions",
    "hrx_leave_fixture_foundation_does_not_open_request_runtime",
  ]),
  required_no_leak_guards: HRX_CP897_REQUIREMENTS.required_no_leak_guards,
});

export const HRX_CP943_REQUIRED_SECTION_ROWS = deepFreeze({
  "RP30.P05.M09": [
    "LeaveFixture HRX slice subphase 8",
  ],
  "RP30.P05.M10": [
    "RiskFixture HRX slice subphase 1",
    "RiskFixture HRX slice subphase 2",
    "RiskFixture HRX slice subphase 3",
    "RiskFixture HRX slice subphase 4",
    "RiskFixture HRX slice subphase 5",
    "RiskFixture HRX slice subphase 6",
    "RiskFixture HRX slice subphase 7",
    "RiskFixture HRX slice subphase 8",
    "RiskFixture HRX slice subphase 9",
  ],
});

export const HRX_CP943_REQUIREMENTS = deepFreeze({
  deliverable_counts: {
    implementation: 10,
  },
  phase_counts: {
    "RP30.P05": 10,
  },
  micro_phase_row_counts: {
    "RP30.P05.M09": 1,
    "RP30.P05.M10": 9,
  },
  micro_title_row_counts: {
    "LeaveFixture HRX slice": 1,
    "RiskFixture HRX slice": 9,
  },
  required_section_rows: HRX_CP943_REQUIRED_SECTION_ROWS,
  mandatory_artifacts: HRX_CP897_REQUIREMENTS.mandatory_artifacts,
  required_capabilities: unique([
    ...HRX_CP942_REQUIREMENTS.required_capabilities,
    "hrx_leave_risk_fixture_tail_bridge_descriptor",
    "hrx_leave_fixture_tail_descriptor",
    "hrx_risk_fixture_foundation_descriptor",
  ]),
  safety_gates: unique([
    ...HRX_CP942_REQUIREMENTS.safety_gates,
    "hrx_leave_fixture_tail_does_not_open_runtime",
    "hrx_leave_fixture_tail_does_not_write_records",
    "hrx_leave_fixture_tail_does_not_use_real_leave_data",
    "hrx_leave_fixture_tail_does_not_bypass_permissions",
    "hrx_leave_fixture_tail_does_not_open_request_runtime",
    "hrx_risk_fixture_foundation_does_not_open_runtime",
    "hrx_risk_fixture_foundation_does_not_write_records",
    "hrx_risk_fixture_foundation_does_not_use_real_risk_data",
    "hrx_risk_fixture_foundation_does_not_bypass_permissions",
    "hrx_risk_fixture_foundation_does_not_calculate_scores",
  ]),
  required_no_leak_guards: HRX_CP897_REQUIREMENTS.required_no_leak_guards,
});

export const HRX_CP944_REQUIRED_SECTION_ROWS = deepFreeze({
  "RP30.P06.M00": [
    "HRPermission HRX slice subphase 1",
    "HRPermission HRX slice subphase 2",
    "HRPermission HRX slice subphase 3",
    "HRPermission HRX slice subphase 4",
    "HRPermission HRX slice subphase 5",
    "HRPermission HRX slice subphase 6",
    "HRPermission HRX slice subphase 7",
    "HRPermission HRX slice subphase 8",
    "HRPermission HRX slice subphase 9",
    "HRPermission HRX slice subphase 10",
  ],
});

export const HRX_CP944_REQUIREMENTS = deepFreeze({
  deliverable_counts: {
    implementation: 10,
  },
  phase_counts: {
    "RP30.P06": 10,
  },
  micro_phase_row_counts: {
    "RP30.P06.M00": 10,
  },
  micro_title_row_counts: {
    "HRPermission HRX slice": 10,
  },
  required_section_rows: HRX_CP944_REQUIRED_SECTION_ROWS,
  mandatory_artifacts: HRX_CP897_REQUIREMENTS.mandatory_artifacts,
  required_capabilities: unique([
    ...HRX_CP943_REQUIREMENTS.required_capabilities,
    "hrx_hr_permission_foundation_descriptor",
    "hrx_hr_permission_policy_descriptor",
  ]),
  safety_gates: unique([
    ...HRX_CP943_REQUIREMENTS.safety_gates,
    "hrx_hr_permission_foundation_does_not_open_runtime",
    "hrx_hr_permission_foundation_does_not_write_records",
    "hrx_hr_permission_foundation_does_not_use_real_permission_data",
    "hrx_hr_permission_foundation_does_not_bypass_permissions",
    "hrx_hr_permission_foundation_does_not_emit_permission_decisions",
  ]),
  required_no_leak_guards: HRX_CP897_REQUIREMENTS.required_no_leak_guards,
});

export const HRX_CP945_REQUIRED_SECTION_ROWS = deepFreeze({
  "RP30.P06.M00": [
    "HRPermission HRX slice subphase 11",
    "HRPermission HRX slice subphase 12",
    "HRPermission HRX slice subphase 13",
  ],
  "RP30.P06.M01": [
    "SensitiveGuard HRX slice subphase 1",
    "SensitiveGuard HRX slice subphase 2",
    "SensitiveGuard HRX slice subphase 3",
    "SensitiveGuard HRX slice subphase 4",
    "SensitiveGuard HRX slice subphase 5",
    "SensitiveGuard HRX slice subphase 6",
    "SensitiveGuard HRX slice subphase 7",
  ],
});

export const HRX_CP945_REQUIREMENTS = deepFreeze({
  deliverable_counts: {
    implementation: 10,
  },
  phase_counts: {
    "RP30.P06": 10,
  },
  micro_phase_row_counts: {
    "RP30.P06.M00": 3,
    "RP30.P06.M01": 7,
  },
  micro_title_row_counts: {
    "HRPermission HRX slice": 3,
    "SensitiveGuard HRX slice": 7,
  },
  required_section_rows: HRX_CP945_REQUIRED_SECTION_ROWS,
  mandatory_artifacts: HRX_CP897_REQUIREMENTS.mandatory_artifacts,
  required_capabilities: unique([
    ...HRX_CP944_REQUIREMENTS.required_capabilities,
    "hrx_hr_permission_sensitive_guard_bridge_descriptor",
    "hrx_hr_permission_tail_descriptor",
    "hrx_sensitive_guard_foundation_descriptor",
  ]),
  safety_gates: unique([
    ...HRX_CP944_REQUIREMENTS.safety_gates,
    "hrx_hr_permission_tail_does_not_open_runtime",
    "hrx_hr_permission_tail_does_not_write_records",
    "hrx_hr_permission_tail_does_not_emit_permission_decisions",
    "hrx_sensitive_guard_foundation_does_not_open_runtime",
    "hrx_sensitive_guard_foundation_does_not_write_records",
    "hrx_sensitive_guard_foundation_does_not_use_real_sensitive_data",
    "hrx_sensitive_guard_foundation_does_not_bypass_permissions",
    "hrx_sensitive_guard_foundation_does_not_emit_guard_decisions",
  ]),
  required_no_leak_guards: HRX_CP897_REQUIREMENTS.required_no_leak_guards,
});

export const HRX_CP946_REQUIRED_SECTION_ROWS = deepFreeze({
  "RP30.P06.M01": [
    "SensitiveGuard HRX slice subphase 8",
    "SensitiveGuard HRX slice subphase 9",
    "SensitiveGuard HRX slice subphase 10",
    "SensitiveGuard HRX slice subphase 11",
    "SensitiveGuard HRX slice subphase 12",
    "SensitiveGuard HRX slice subphase 13",
  ],
  "RP30.P06.M02": [
    "PayrollRestriction HRX slice subphase 1",
    "PayrollRestriction HRX slice subphase 2",
    "PayrollRestriction HRX slice subphase 3",
    "PayrollRestriction HRX slice subphase 4",
  ],
});

export const HRX_CP946_REQUIREMENTS = deepFreeze({
  deliverable_counts: {
    implementation: 10,
  },
  phase_counts: {
    "RP30.P06": 10,
  },
  micro_phase_row_counts: {
    "RP30.P06.M01": 6,
    "RP30.P06.M02": 4,
  },
  micro_title_row_counts: {
    "SensitiveGuard HRX slice": 6,
    "PayrollRestriction HRX slice": 4,
  },
  required_section_rows: HRX_CP946_REQUIRED_SECTION_ROWS,
  mandatory_artifacts: HRX_CP897_REQUIREMENTS.mandatory_artifacts,
  required_capabilities: unique([
    ...HRX_CP945_REQUIREMENTS.required_capabilities,
    "hrx_sensitive_guard_payroll_restriction_bridge_descriptor",
    "hrx_sensitive_guard_tail_descriptor",
    "hrx_payroll_restriction_foundation_descriptor",
  ]),
  safety_gates: unique([
    ...HRX_CP945_REQUIREMENTS.safety_gates,
    "hrx_sensitive_guard_tail_does_not_open_runtime",
    "hrx_sensitive_guard_tail_does_not_write_records",
    "hrx_sensitive_guard_tail_does_not_use_real_sensitive_data",
    "hrx_sensitive_guard_tail_does_not_bypass_permissions",
    "hrx_sensitive_guard_tail_does_not_emit_guard_decisions",
    "hrx_payroll_restriction_foundation_does_not_open_runtime",
    "hrx_payroll_restriction_foundation_does_not_write_records",
    "hrx_payroll_restriction_foundation_does_not_use_real_payroll_data",
    "hrx_payroll_restriction_foundation_does_not_bypass_permissions",
    "hrx_payroll_restriction_foundation_does_not_emit_payroll_decisions",
  ]),
  required_no_leak_guards: HRX_CP897_REQUIREMENTS.required_no_leak_guards,
});

export const HRX_CP947_REQUIRED_SECTION_ROWS = deepFreeze({
  "RP30.P06.M02": [
    "PayrollRestriction HRX slice subphase 5",
    "PayrollRestriction HRX slice subphase 6",
    "PayrollRestriction HRX slice subphase 7",
    "PayrollRestriction HRX slice subphase 8",
    "PayrollRestriction HRX slice subphase 9",
    "PayrollRestriction HRX slice subphase 10",
    "PayrollRestriction HRX slice subphase 11",
    "PayrollRestriction HRX slice subphase 12",
    "PayrollRestriction HRX slice subphase 13",
  ],
  "RP30.P06.M03": [
    "EvaluationRestriction HRX slice subphase 1",
  ],
});

export const HRX_CP947_REQUIREMENTS = deepFreeze({
  deliverable_counts: {
    implementation: 10,
  },
  phase_counts: {
    "RP30.P06": 10,
  },
  micro_phase_row_counts: {
    "RP30.P06.M02": 9,
    "RP30.P06.M03": 1,
  },
  micro_title_row_counts: {
    "PayrollRestriction HRX slice": 9,
    "EvaluationRestriction HRX slice": 1,
  },
  required_section_rows: HRX_CP947_REQUIRED_SECTION_ROWS,
  mandatory_artifacts: HRX_CP897_REQUIREMENTS.mandatory_artifacts,
  required_capabilities: unique([
    ...HRX_CP946_REQUIREMENTS.required_capabilities,
    "hrx_payroll_evaluation_restriction_bridge_descriptor",
    "hrx_payroll_restriction_tail_descriptor",
    "hrx_evaluation_restriction_foundation_descriptor",
  ]),
  safety_gates: unique([
    ...HRX_CP946_REQUIREMENTS.safety_gates,
    "hrx_payroll_restriction_tail_does_not_open_runtime",
    "hrx_payroll_restriction_tail_does_not_write_records",
    "hrx_payroll_restriction_tail_does_not_use_real_payroll_data",
    "hrx_payroll_restriction_tail_does_not_bypass_permissions",
    "hrx_payroll_restriction_tail_does_not_emit_payroll_decisions",
    "hrx_evaluation_restriction_foundation_does_not_open_runtime",
    "hrx_evaluation_restriction_foundation_does_not_write_records",
    "hrx_evaluation_restriction_foundation_does_not_use_real_evaluation_data",
    "hrx_evaluation_restriction_foundation_does_not_bypass_permissions",
    "hrx_evaluation_restriction_foundation_does_not_emit_evaluation_decisions",
  ]),
  required_no_leak_guards: HRX_CP897_REQUIREMENTS.required_no_leak_guards,
});

export const HRX_CP948_REQUIRED_SECTION_ROWS = deepFreeze({
  "RP30.P06.M03": [
    "EvaluationRestriction HRX slice subphase 2",
    "EvaluationRestriction HRX slice subphase 3",
    "EvaluationRestriction HRX slice subphase 4",
    "EvaluationRestriction HRX slice subphase 5",
    "EvaluationRestriction HRX slice subphase 6",
    "EvaluationRestriction HRX slice subphase 7",
    "EvaluationRestriction HRX slice subphase 8",
    "EvaluationRestriction HRX slice subphase 9",
    "EvaluationRestriction HRX slice subphase 10",
    "EvaluationRestriction HRX slice subphase 11",
  ],
});

export const HRX_CP948_REQUIREMENTS = deepFreeze({
  deliverable_counts: {
    implementation: 10,
  },
  phase_counts: {
    "RP30.P06": 10,
  },
  micro_phase_row_counts: {
    "RP30.P06.M03": 10,
  },
  micro_title_row_counts: {
    "EvaluationRestriction HRX slice": 10,
  },
  required_section_rows: HRX_CP948_REQUIRED_SECTION_ROWS,
  mandatory_artifacts: HRX_CP897_REQUIREMENTS.mandatory_artifacts,
  required_capabilities: unique([
    ...HRX_CP947_REQUIREMENTS.required_capabilities,
    "hrx_evaluation_restriction_tail_descriptor",
  ]),
  safety_gates: unique([
    ...HRX_CP947_REQUIREMENTS.safety_gates,
    "hrx_evaluation_restriction_tail_does_not_open_runtime",
    "hrx_evaluation_restriction_tail_does_not_write_records",
    "hrx_evaluation_restriction_tail_does_not_use_real_evaluation_data",
    "hrx_evaluation_restriction_tail_does_not_bypass_permissions",
    "hrx_evaluation_restriction_tail_does_not_emit_evaluation_decisions",
    "hrx_evaluation_restriction_tail_does_not_open_score_runtime",
  ]),
  required_no_leak_guards: HRX_CP897_REQUIREMENTS.required_no_leak_guards,
});

export const HRX_CP949_REQUIRED_SECTION_ROWS = deepFreeze({
  "RP30.P06.M03": [
    "EvaluationRestriction HRX slice subphase 12",
    "EvaluationRestriction HRX slice subphase 13",
  ],
  "RP30.P06.M04": [
    "CandidatePrivacy HRX slice subphase 1",
    "CandidatePrivacy HRX slice subphase 2",
    "CandidatePrivacy HRX slice subphase 3",
    "CandidatePrivacy HRX slice subphase 4",
    "CandidatePrivacy HRX slice subphase 5",
    "CandidatePrivacy HRX slice subphase 6",
    "CandidatePrivacy HRX slice subphase 7",
    "CandidatePrivacy HRX slice subphase 8",
  ],
});

export const HRX_CP949_REQUIREMENTS = deepFreeze({
  deliverable_counts: {
    implementation: 10,
  },
  phase_counts: {
    "RP30.P06": 10,
  },
  micro_phase_row_counts: {
    "RP30.P06.M03": 2,
    "RP30.P06.M04": 8,
  },
  micro_title_row_counts: {
    "EvaluationRestriction HRX slice": 2,
    "CandidatePrivacy HRX slice": 8,
  },
  required_section_rows: HRX_CP949_REQUIRED_SECTION_ROWS,
  mandatory_artifacts: HRX_CP897_REQUIREMENTS.mandatory_artifacts,
  required_capabilities: unique([
    ...HRX_CP948_REQUIREMENTS.required_capabilities,
    "hrx_evaluation_candidate_privacy_bridge_descriptor",
    "hrx_evaluation_restriction_final_tail_descriptor",
    "hrx_candidate_privacy_foundation_descriptor",
  ]),
  safety_gates: unique([
    ...HRX_CP948_REQUIREMENTS.safety_gates,
    "hrx_evaluation_restriction_final_tail_does_not_open_runtime",
    "hrx_evaluation_restriction_final_tail_does_not_write_records",
    "hrx_evaluation_restriction_final_tail_does_not_use_real_evaluation_data",
    "hrx_evaluation_restriction_final_tail_does_not_bypass_permissions",
    "hrx_evaluation_restriction_final_tail_does_not_emit_evaluation_decisions",
    "hrx_candidate_privacy_foundation_does_not_open_runtime",
    "hrx_candidate_privacy_foundation_does_not_write_records",
    "hrx_candidate_privacy_foundation_does_not_use_real_candidate_data",
    "hrx_candidate_privacy_foundation_does_not_bypass_permissions",
    "hrx_candidate_privacy_foundation_does_not_emit_privacy_decisions",
    "hrx_candidate_privacy_foundation_does_not_open_masking_runtime",
  ]),
  required_no_leak_guards: HRX_CP897_REQUIREMENTS.required_no_leak_guards,
});

export const HRX_CP950_REQUIRED_SECTION_ROWS = deepFreeze({
  "RP30.P06.M04": [
    "CandidatePrivacy HRX slice subphase 9",
    "CandidatePrivacy HRX slice subphase 10",
    "CandidatePrivacy HRX slice subphase 11",
    "CandidatePrivacy HRX slice subphase 12",
  ],
  "RP30.P06.M05": [
    "AuditHint HRX slice subphase 1",
    "AuditHint HRX slice subphase 2",
    "AuditHint HRX slice subphase 3",
    "AuditHint HRX slice subphase 4",
    "AuditHint HRX slice subphase 5",
    "AuditHint HRX slice subphase 6",
  ],
});

export const HRX_CP950_REQUIREMENTS = deepFreeze({
  deliverable_counts: {
    implementation: 4,
    security_audit: 6,
  },
  phase_counts: {
    "RP30.P06": 10,
  },
  micro_phase_row_counts: {
    "RP30.P06.M04": 4,
    "RP30.P06.M05": 6,
  },
  micro_title_row_counts: {
    "CandidatePrivacy HRX slice": 4,
    "AuditHint HRX slice": 6,
  },
  required_section_rows: HRX_CP950_REQUIRED_SECTION_ROWS,
  mandatory_artifacts: HRX_CP897_REQUIREMENTS.mandatory_artifacts,
  required_capabilities: unique([
    ...HRX_CP949_REQUIREMENTS.required_capabilities,
    "hrx_candidate_privacy_audit_hint_bridge_descriptor",
    "hrx_candidate_privacy_tail_descriptor",
    "hrx_audit_hint_foundation_descriptor",
  ]),
  safety_gates: unique([
    ...HRX_CP949_REQUIREMENTS.safety_gates,
    "hrx_candidate_privacy_tail_does_not_open_runtime",
    "hrx_candidate_privacy_tail_does_not_write_records",
    "hrx_candidate_privacy_tail_does_not_use_real_candidate_data",
    "hrx_candidate_privacy_tail_does_not_bypass_permissions",
    "hrx_candidate_privacy_tail_does_not_emit_privacy_decisions",
    "hrx_candidate_privacy_tail_does_not_open_masking_runtime",
    "hrx_audit_hint_foundation_does_not_open_runtime",
    "hrx_audit_hint_foundation_does_not_write_records",
    "hrx_audit_hint_foundation_does_not_write_audit_events",
    "hrx_audit_hint_foundation_does_not_use_real_hr_or_candidate_data",
    "hrx_audit_hint_foundation_does_not_bypass_permissions",
    "hrx_audit_hint_foundation_does_not_emit_audit_decisions",
  ]),
  required_no_leak_guards: HRX_CP897_REQUIREMENTS.required_no_leak_guards,
});

export const HRX_CP951_REQUIRED_SECTION_ROWS = deepFreeze({
  "RP30.P06.M05": [
    "AuditHint HRX slice subphase 7",
    "AuditHint HRX slice subphase 8",
    "AuditHint HRX slice subphase 9",
    "AuditHint HRX slice subphase 10",
    "AuditHint HRX slice subphase 11",
    "AuditHint HRX slice subphase 12",
    "AuditHint HRX slice subphase 13",
  ],
  "RP30.P06.M06": [
    "HRPermission HRX slice subphase 1",
    "HRPermission HRX slice subphase 2",
    "HRPermission HRX slice subphase 3",
  ],
});

export const HRX_CP951_REQUIREMENTS = deepFreeze({
  deliverable_counts: {
    security_audit: 7,
    implementation: 3,
  },
  phase_counts: {
    "RP30.P06": 10,
  },
  micro_phase_row_counts: {
    "RP30.P06.M05": 7,
    "RP30.P06.M06": 3,
  },
  micro_title_row_counts: {
    "AuditHint HRX slice": 7,
    "HRPermission HRX slice": 3,
  },
  required_section_rows: HRX_CP951_REQUIRED_SECTION_ROWS,
  mandatory_artifacts: HRX_CP897_REQUIREMENTS.mandatory_artifacts,
  required_capabilities: unique([
    ...HRX_CP950_REQUIREMENTS.required_capabilities,
    "hrx_audit_hint_hr_permission_bridge_descriptor",
    "hrx_audit_hint_tail_descriptor",
    "hrx_hr_permission_m06_foundation_descriptor",
  ]),
  safety_gates: unique([
    ...HRX_CP950_REQUIREMENTS.safety_gates,
    "hrx_audit_hint_tail_does_not_open_runtime",
    "hrx_audit_hint_tail_does_not_write_records",
    "hrx_audit_hint_tail_does_not_write_audit_events",
    "hrx_audit_hint_tail_does_not_use_real_hr_or_candidate_data",
    "hrx_audit_hint_tail_does_not_bypass_permissions",
    "hrx_audit_hint_tail_does_not_emit_audit_decisions",
    "hrx_hr_permission_m06_foundation_does_not_open_runtime",
    "hrx_hr_permission_m06_foundation_does_not_write_records",
    "hrx_hr_permission_m06_foundation_does_not_use_real_hr_data",
    "hrx_hr_permission_m06_foundation_does_not_bypass_permissions",
    "hrx_hr_permission_m06_foundation_does_not_emit_permission_decisions",
  ]),
  required_no_leak_guards: HRX_CP897_REQUIREMENTS.required_no_leak_guards,
});

export const HRX_CP952_REQUIRED_SECTION_ROWS = deepFreeze({
  "RP30.P06.M06": [
    "HRPermission HRX slice subphase 4",
    "HRPermission HRX slice subphase 5",
    "HRPermission HRX slice subphase 6",
    "HRPermission HRX slice subphase 7",
    "HRPermission HRX slice subphase 8",
    "HRPermission HRX slice subphase 9",
    "HRPermission HRX slice subphase 10",
    "HRPermission HRX slice subphase 11",
    "HRPermission HRX slice subphase 12",
  ],
  "RP30.P06.M07": [
    "SensitiveGuard HRX slice subphase 1",
  ],
});

export const HRX_CP952_REQUIREMENTS = deepFreeze({
  deliverable_counts: {
    implementation: 10,
  },
  phase_counts: {
    "RP30.P06": 10,
  },
  micro_phase_row_counts: {
    "RP30.P06.M06": 9,
    "RP30.P06.M07": 1,
  },
  micro_title_row_counts: {
    "HRPermission HRX slice": 9,
    "SensitiveGuard HRX slice": 1,
  },
  required_section_rows: HRX_CP952_REQUIRED_SECTION_ROWS,
  mandatory_artifacts: HRX_CP897_REQUIREMENTS.mandatory_artifacts,
  required_capabilities: unique([
    ...HRX_CP951_REQUIREMENTS.required_capabilities,
    "hrx_hr_permission_sensitive_guard_m06_m07_bridge_descriptor",
    "hrx_hr_permission_m06_tail_descriptor",
    "hrx_sensitive_guard_m07_foundation_descriptor",
  ]),
  safety_gates: unique([
    ...HRX_CP951_REQUIREMENTS.safety_gates,
    "hrx_hr_permission_m06_tail_does_not_open_runtime",
    "hrx_hr_permission_m06_tail_does_not_write_records",
    "hrx_hr_permission_m06_tail_does_not_use_real_permission_data",
    "hrx_hr_permission_m06_tail_does_not_bypass_permissions",
    "hrx_hr_permission_m06_tail_does_not_emit_permission_decisions",
    "hrx_sensitive_guard_m07_foundation_does_not_open_runtime",
    "hrx_sensitive_guard_m07_foundation_does_not_write_records",
    "hrx_sensitive_guard_m07_foundation_does_not_use_real_sensitive_data",
    "hrx_sensitive_guard_m07_foundation_does_not_bypass_permissions",
    "hrx_sensitive_guard_m07_foundation_does_not_emit_guard_decisions",
  ]),
  required_no_leak_guards: HRX_CP897_REQUIREMENTS.required_no_leak_guards,
});

export const HRX_CP953_REQUIRED_SECTION_ROWS = deepFreeze({
  "RP30.P06.M07": [
    "SensitiveGuard HRX slice subphase 2",
    "SensitiveGuard HRX slice subphase 3",
    "SensitiveGuard HRX slice subphase 4",
    "SensitiveGuard HRX slice subphase 5",
    "SensitiveGuard HRX slice subphase 6",
    "SensitiveGuard HRX slice subphase 7",
    "SensitiveGuard HRX slice subphase 8",
    "SensitiveGuard HRX slice subphase 9",
    "SensitiveGuard HRX slice subphase 10",
    "SensitiveGuard HRX slice subphase 11",
  ],
});

export const HRX_CP953_REQUIREMENTS = deepFreeze({
  deliverable_counts: {
    implementation: 10,
  },
  phase_counts: {
    "RP30.P06": 10,
  },
  micro_phase_row_counts: {
    "RP30.P06.M07": 10,
  },
  micro_title_row_counts: {
    "SensitiveGuard HRX slice": 10,
  },
  required_section_rows: HRX_CP953_REQUIRED_SECTION_ROWS,
  mandatory_artifacts: HRX_CP897_REQUIREMENTS.mandatory_artifacts,
  required_capabilities: unique([
    ...HRX_CP952_REQUIREMENTS.required_capabilities,
    "hrx_sensitive_guard_m07_tail_descriptor",
  ]),
  safety_gates: unique([
    ...HRX_CP952_REQUIREMENTS.safety_gates,
    "hrx_sensitive_guard_m07_tail_does_not_open_runtime",
    "hrx_sensitive_guard_m07_tail_does_not_write_records",
    "hrx_sensitive_guard_m07_tail_does_not_use_real_sensitive_data",
    "hrx_sensitive_guard_m07_tail_does_not_bypass_permissions",
    "hrx_sensitive_guard_m07_tail_does_not_emit_guard_decisions",
  ]),
  required_no_leak_guards: HRX_CP897_REQUIREMENTS.required_no_leak_guards,
});

export const HRX_CP954_REQUIRED_SECTION_ROWS = deepFreeze({
  "RP30.P06.M07": ["SensitiveGuard HRX slice subphase 12"],
  "RP30.P06.M08": [
    "PayrollRestriction HRX slice subphase 1",
    "PayrollRestriction HRX slice subphase 2",
    "PayrollRestriction HRX slice subphase 3",
    "PayrollRestriction HRX slice subphase 4",
    "PayrollRestriction HRX slice subphase 5",
    "PayrollRestriction HRX slice subphase 6",
    "PayrollRestriction HRX slice subphase 7",
    "PayrollRestriction HRX slice subphase 8",
    "PayrollRestriction HRX slice subphase 9",
  ],
});

export const HRX_CP954_REQUIREMENTS = deepFreeze({
  deliverable_counts: {
    implementation: 10,
  },
  phase_counts: {
    "RP30.P06": 10,
  },
  micro_phase_row_counts: {
    "RP30.P06.M07": 1,
    "RP30.P06.M08": 9,
  },
  micro_title_row_counts: {
    "SensitiveGuard HRX slice": 1,
    "PayrollRestriction HRX slice": 9,
  },
  required_section_rows: HRX_CP954_REQUIRED_SECTION_ROWS,
  mandatory_artifacts: HRX_CP897_REQUIREMENTS.mandatory_artifacts,
  required_capabilities: unique([
    ...HRX_CP953_REQUIREMENTS.required_capabilities,
    "hrx_sensitive_guard_payroll_restriction_m07_m08_bridge_descriptor",
    "hrx_sensitive_guard_m07_final_tail_descriptor",
    "hrx_payroll_restriction_m08_foundation_descriptor",
    "hrx_payroll_restriction_runtime_deferred_descriptor",
  ]),
  safety_gates: unique([
    ...HRX_CP953_REQUIREMENTS.safety_gates,
    "hrx_sensitive_guard_m07_final_tail_does_not_open_runtime",
    "hrx_sensitive_guard_m07_final_tail_does_not_write_records",
    "hrx_sensitive_guard_m07_final_tail_does_not_use_real_sensitive_data",
    "hrx_sensitive_guard_m07_final_tail_does_not_bypass_permissions",
    "hrx_sensitive_guard_m07_final_tail_does_not_emit_guard_decisions",
    "hrx_payroll_restriction_m08_foundation_does_not_open_runtime",
    "hrx_payroll_restriction_m08_foundation_does_not_write_records",
    "hrx_payroll_restriction_m08_foundation_does_not_use_real_payroll_data",
    "hrx_payroll_restriction_m08_foundation_does_not_bypass_permissions",
    "hrx_payroll_restriction_m08_foundation_does_not_execute_policy",
    "hrx_payroll_restriction_m08_foundation_does_not_emit_restriction_decisions",
    "hrx_payroll_restriction_m08_foundation_does_not_open_calculation_runtime",
  ]),
  required_no_leak_guards: HRX_CP897_REQUIREMENTS.required_no_leak_guards,
});

export const HRX_CP955_REQUIRED_SECTION_ROWS = deepFreeze({
  "RP30.P06.M08": [
    "PayrollRestriction HRX slice subphase 10",
    "PayrollRestriction HRX slice subphase 11",
    "PayrollRestriction HRX slice subphase 12",
  ],
  "RP30.P06.M09": [
    "EvaluationRestriction HRX slice subphase 1",
    "EvaluationRestriction HRX slice subphase 2",
    "EvaluationRestriction HRX slice subphase 3",
    "EvaluationRestriction HRX slice subphase 4",
    "EvaluationRestriction HRX slice subphase 5",
    "EvaluationRestriction HRX slice subphase 6",
    "EvaluationRestriction HRX slice subphase 7",
  ],
});

export const HRX_CP955_REQUIREMENTS = deepFreeze({
  deliverable_counts: {
    implementation: 10,
  },
  phase_counts: {
    "RP30.P06": 10,
  },
  micro_phase_row_counts: {
    "RP30.P06.M08": 3,
    "RP30.P06.M09": 7,
  },
  micro_title_row_counts: {
    "PayrollRestriction HRX slice": 3,
    "EvaluationRestriction HRX slice": 7,
  },
  required_section_rows: HRX_CP955_REQUIRED_SECTION_ROWS,
  mandatory_artifacts: HRX_CP897_REQUIREMENTS.mandatory_artifacts,
  required_capabilities: unique([
    ...HRX_CP954_REQUIREMENTS.required_capabilities,
    "hrx_payroll_evaluation_restriction_m08_m09_bridge_descriptor",
    "hrx_payroll_restriction_m08_tail_descriptor",
    "hrx_evaluation_restriction_m09_foundation_descriptor",
    "hrx_evaluation_restriction_runtime_deferred_descriptor",
  ]),
  safety_gates: unique([
    ...HRX_CP954_REQUIREMENTS.safety_gates,
    "hrx_payroll_restriction_m08_tail_does_not_open_runtime",
    "hrx_payroll_restriction_m08_tail_does_not_write_records",
    "hrx_payroll_restriction_m08_tail_does_not_use_real_payroll_data",
    "hrx_payroll_restriction_m08_tail_does_not_bypass_permissions",
    "hrx_payroll_restriction_m08_tail_does_not_execute_policy",
    "hrx_payroll_restriction_m08_tail_does_not_emit_restriction_decisions",
    "hrx_payroll_restriction_m08_tail_does_not_open_calculation_runtime",
    "hrx_evaluation_restriction_m09_foundation_does_not_open_runtime",
    "hrx_evaluation_restriction_m09_foundation_does_not_write_records",
    "hrx_evaluation_restriction_m09_foundation_does_not_use_real_evaluation_data",
    "hrx_evaluation_restriction_m09_foundation_does_not_bypass_permissions",
    "hrx_evaluation_restriction_m09_foundation_does_not_execute_policy",
    "hrx_evaluation_restriction_m09_foundation_does_not_emit_restriction_decisions",
    "hrx_evaluation_restriction_m09_foundation_does_not_open_score_runtime",
  ]),
  required_no_leak_guards: HRX_CP897_REQUIREMENTS.required_no_leak_guards,
});

export const HRX_CP956_REQUIRED_SECTION_ROWS = deepFreeze({
  "RP30.P06.M09": [
    "EvaluationRestriction HRX slice subphase 8",
    "EvaluationRestriction HRX slice subphase 9",
    "EvaluationRestriction HRX slice subphase 10",
    "EvaluationRestriction HRX slice subphase 11",
    "EvaluationRestriction HRX slice subphase 12",
  ],
  "RP30.P06.M10": [
    "CandidatePrivacy HRX slice subphase 1",
    "CandidatePrivacy HRX slice subphase 2",
    "CandidatePrivacy HRX slice subphase 3",
    "CandidatePrivacy HRX slice subphase 4",
    "CandidatePrivacy HRX slice subphase 5",
  ],
});

export const HRX_CP956_REQUIREMENTS = deepFreeze({
  deliverable_counts: {
    implementation: 10,
  },
  phase_counts: {
    "RP30.P06": 10,
  },
  micro_phase_row_counts: {
    "RP30.P06.M09": 5,
    "RP30.P06.M10": 5,
  },
  micro_title_row_counts: {
    "EvaluationRestriction HRX slice": 5,
    "CandidatePrivacy HRX slice": 5,
  },
  required_section_rows: HRX_CP956_REQUIRED_SECTION_ROWS,
  mandatory_artifacts: HRX_CP897_REQUIREMENTS.mandatory_artifacts,
  required_capabilities: unique([
    ...HRX_CP955_REQUIREMENTS.required_capabilities,
    "hrx_evaluation_candidate_privacy_m09_m10_bridge_descriptor",
    "hrx_evaluation_restriction_m09_tail_descriptor",
    "hrx_candidate_privacy_m10_foundation_descriptor",
    "hrx_candidate_privacy_masking_runtime_deferred_descriptor",
  ]),
  safety_gates: unique([
    ...HRX_CP955_REQUIREMENTS.safety_gates,
    "hrx_evaluation_restriction_m09_tail_does_not_open_runtime",
    "hrx_evaluation_restriction_m09_tail_does_not_write_records",
    "hrx_evaluation_restriction_m09_tail_does_not_use_real_evaluation_data",
    "hrx_evaluation_restriction_m09_tail_does_not_bypass_permissions",
    "hrx_evaluation_restriction_m09_tail_does_not_execute_policy",
    "hrx_evaluation_restriction_m09_tail_does_not_emit_evaluation_decisions",
    "hrx_evaluation_restriction_m09_tail_does_not_open_score_runtime",
    "hrx_candidate_privacy_m10_foundation_does_not_open_runtime",
    "hrx_candidate_privacy_m10_foundation_does_not_write_records",
    "hrx_candidate_privacy_m10_foundation_does_not_use_real_candidate_data",
    "hrx_candidate_privacy_m10_foundation_does_not_bypass_permissions",
    "hrx_candidate_privacy_m10_foundation_does_not_execute_policy",
    "hrx_candidate_privacy_m10_foundation_does_not_emit_privacy_decisions",
    "hrx_candidate_privacy_m10_foundation_does_not_open_masking_runtime",
  ]),
  required_no_leak_guards: HRX_CP897_REQUIREMENTS.required_no_leak_guards,
});

export const HRX_CP957_REQUIRED_SECTION_ROWS = deepFreeze({
  "RP30.P06.M10": [
    "CandidatePrivacy HRX slice subphase 6",
    "CandidatePrivacy HRX slice subphase 7",
    "CandidatePrivacy HRX slice subphase 8",
    "CandidatePrivacy HRX slice subphase 9",
    "CandidatePrivacy HRX slice subphase 10",
    "CandidatePrivacy HRX slice subphase 11",
    "CandidatePrivacy HRX slice subphase 12",
  ],
  "RP30.P07.M00": [
    "MissingUserLink HRX slice subphase 1",
    "MissingUserLink HRX slice subphase 2",
    "MissingUserLink HRX slice subphase 3",
  ],
});

export const HRX_CP957_REQUIREMENTS = deepFreeze({
  deliverable_counts: {
    implementation: 10,
  },
  phase_counts: {
    "RP30.P06": 7,
    "RP30.P07": 3,
  },
  micro_phase_row_counts: {
    "RP30.P06.M10": 7,
    "RP30.P07.M00": 3,
  },
  micro_title_row_counts: {
    "CandidatePrivacy HRX slice": 7,
    "MissingUserLink HRX slice": 3,
  },
  required_section_rows: HRX_CP957_REQUIRED_SECTION_ROWS,
  mandatory_artifacts: HRX_CP897_REQUIREMENTS.mandatory_artifacts,
  required_capabilities: unique([
    ...HRX_CP956_REQUIREMENTS.required_capabilities,
    "hrx_candidate_privacy_missing_user_link_m10_p07_bridge_descriptor",
    "hrx_candidate_privacy_m10_tail_descriptor",
    "hrx_missing_user_link_p07_foundation_descriptor",
    "hrx_missing_user_link_runtime_deferred_descriptor",
  ]),
  safety_gates: unique([
    ...HRX_CP956_REQUIREMENTS.safety_gates,
    "hrx_candidate_privacy_m10_tail_does_not_open_runtime",
    "hrx_candidate_privacy_m10_tail_does_not_write_records",
    "hrx_candidate_privacy_m10_tail_does_not_use_real_candidate_data",
    "hrx_candidate_privacy_m10_tail_does_not_bypass_permissions",
    "hrx_candidate_privacy_m10_tail_does_not_execute_policy",
    "hrx_candidate_privacy_m10_tail_does_not_emit_privacy_decisions",
    "hrx_candidate_privacy_m10_tail_does_not_open_masking_runtime",
    "hrx_missing_user_link_p07_foundation_does_not_open_runtime",
    "hrx_missing_user_link_p07_foundation_does_not_write_records",
    "hrx_missing_user_link_p07_foundation_does_not_use_real_hr_data",
    "hrx_missing_user_link_p07_foundation_does_not_bypass_permissions",
    "hrx_missing_user_link_p07_foundation_does_not_execute_policy",
    "hrx_missing_user_link_p07_foundation_does_not_emit_link_decisions",
    "hrx_missing_user_link_p07_foundation_preserves_user_employee_separation",
  ]),
  required_no_leak_guards: HRX_CP897_REQUIREMENTS.required_no_leak_guards,
});

export const HRX_CP958_REQUIRED_SECTION_ROWS = deepFreeze({
  "RP30.P07.M00": [
    "MissingUserLink HRX slice subphase 4",
    "MissingUserLink HRX slice subphase 5",
    "MissingUserLink HRX slice subphase 6",
    "MissingUserLink HRX slice subphase 7",
    "MissingUserLink HRX slice subphase 8",
    "MissingUserLink HRX slice subphase 9",
    "MissingUserLink HRX slice subphase 10",
    "MissingUserLink HRX slice subphase 11",
    "MissingUserLink HRX slice subphase 12",
    "MissingUserLink HRX slice subphase 13",
  ],
});

export const HRX_CP958_REQUIREMENTS = deepFreeze({
  deliverable_counts: {
    implementation: 10,
  },
  phase_counts: {
    "RP30.P07": 10,
  },
  micro_phase_row_counts: {
    "RP30.P07.M00": 10,
  },
  micro_title_row_counts: {
    "MissingUserLink HRX slice": 10,
  },
  required_section_rows: HRX_CP958_REQUIRED_SECTION_ROWS,
  mandatory_artifacts: HRX_CP897_REQUIREMENTS.mandatory_artifacts,
  required_capabilities: unique([
    ...HRX_CP957_REQUIREMENTS.required_capabilities,
    "hrx_missing_user_link_p07_tail_descriptor",
    "hrx_missing_user_link_tail_runtime_deferred_descriptor",
  ]),
  safety_gates: unique([
    ...HRX_CP957_REQUIREMENTS.safety_gates,
    "hrx_missing_user_link_p07_tail_does_not_open_runtime",
    "hrx_missing_user_link_p07_tail_does_not_write_records",
    "hrx_missing_user_link_p07_tail_does_not_use_real_hr_data",
    "hrx_missing_user_link_p07_tail_does_not_bypass_permissions",
    "hrx_missing_user_link_p07_tail_does_not_execute_policy",
    "hrx_missing_user_link_p07_tail_does_not_emit_link_decisions",
    "hrx_missing_user_link_p07_tail_preserves_user_employee_separation",
  ]),
  required_no_leak_guards: HRX_CP897_REQUIREMENTS.required_no_leak_guards,
});

export const HRX_CP959_REQUIRED_SECTION_ROWS = deepFreeze({
  "RP30.P07.M01": [
    "PayrollRuntimeAttempt HRX slice subphase 1",
    "PayrollRuntimeAttempt HRX slice subphase 2",
    "PayrollRuntimeAttempt HRX slice subphase 3",
    "PayrollRuntimeAttempt HRX slice subphase 4",
    "PayrollRuntimeAttempt HRX slice subphase 5",
    "PayrollRuntimeAttempt HRX slice subphase 6",
    "PayrollRuntimeAttempt HRX slice subphase 7",
    "PayrollRuntimeAttempt HRX slice subphase 8",
    "PayrollRuntimeAttempt HRX slice subphase 9",
    "PayrollRuntimeAttempt HRX slice subphase 10",
  ],
});

export const HRX_CP959_REQUIREMENTS = deepFreeze({
  deliverable_counts: {
    implementation: 10,
  },
  phase_counts: {
    "RP30.P07": 10,
  },
  micro_phase_row_counts: {
    "RP30.P07.M01": 10,
  },
  micro_title_row_counts: {
    "PayrollRuntimeAttempt HRX slice": 10,
  },
  required_section_rows: HRX_CP959_REQUIRED_SECTION_ROWS,
  mandatory_artifacts: HRX_CP897_REQUIREMENTS.mandatory_artifacts,
  required_capabilities: unique([
    ...HRX_CP958_REQUIREMENTS.required_capabilities,
    "hrx_payroll_runtime_attempt_p07_foundation_descriptor",
    "hrx_payroll_runtime_attempt_runtime_deferred_descriptor",
  ]),
  safety_gates: unique([
    ...HRX_CP958_REQUIREMENTS.safety_gates,
    "hrx_payroll_runtime_attempt_p07_foundation_does_not_open_runtime",
    "hrx_payroll_runtime_attempt_p07_foundation_does_not_write_records",
    "hrx_payroll_runtime_attempt_p07_foundation_does_not_use_real_payroll_data",
    "hrx_payroll_runtime_attempt_p07_foundation_does_not_bypass_permissions",
    "hrx_payroll_runtime_attempt_p07_foundation_does_not_execute_policy",
    "hrx_payroll_runtime_attempt_p07_foundation_does_not_emit_decisions",
    "hrx_payroll_runtime_attempt_p07_foundation_does_not_open_calculation_runtime",
  ]),
  required_no_leak_guards: HRX_CP897_REQUIREMENTS.required_no_leak_guards,
});

export const HRX_CP960_REQUIRED_SECTION_ROWS = deepFreeze({
  "RP30.P07.M01": [
    "PayrollRuntimeAttempt HRX slice subphase 11",
    "PayrollRuntimeAttempt HRX slice subphase 12",
    "PayrollRuntimeAttempt HRX slice subphase 13",
  ],
  "RP30.P07.M02": [
    "AIScoringAttempt HRX slice subphase 1",
    "AIScoringAttempt HRX slice subphase 2",
    "AIScoringAttempt HRX slice subphase 3",
    "AIScoringAttempt HRX slice subphase 4",
    "AIScoringAttempt HRX slice subphase 5",
    "AIScoringAttempt HRX slice subphase 6",
    "AIScoringAttempt HRX slice subphase 7",
  ],
});

export const HRX_CP960_REQUIREMENTS = deepFreeze({
  deliverable_counts: {
    implementation: 10,
  },
  phase_counts: {
    "RP30.P07": 10,
  },
  micro_phase_row_counts: {
    "RP30.P07.M01": 3,
    "RP30.P07.M02": 7,
  },
  micro_title_row_counts: {
    "PayrollRuntimeAttempt HRX slice": 3,
    "AIScoringAttempt HRX slice": 7,
  },
  required_section_rows: HRX_CP960_REQUIRED_SECTION_ROWS,
  mandatory_artifacts: HRX_CP897_REQUIREMENTS.mandatory_artifacts,
  required_capabilities: unique([
    ...HRX_CP959_REQUIREMENTS.required_capabilities,
    "hrx_payroll_runtime_attempt_p07_tail_descriptor",
    "hrx_ai_scoring_attempt_p07_foundation_descriptor",
    "hrx_ai_scoring_attempt_runtime_deferred_descriptor",
  ]),
  safety_gates: unique([
    ...HRX_CP959_REQUIREMENTS.safety_gates,
    "hrx_payroll_runtime_attempt_p07_tail_does_not_open_runtime",
    "hrx_payroll_runtime_attempt_p07_tail_does_not_write_records",
    "hrx_payroll_runtime_attempt_p07_tail_does_not_use_real_payroll_data",
    "hrx_payroll_runtime_attempt_p07_tail_does_not_bypass_permissions",
    "hrx_payroll_runtime_attempt_p07_tail_does_not_open_calculation_runtime",
    "hrx_ai_scoring_attempt_p07_foundation_does_not_open_runtime",
    "hrx_ai_scoring_attempt_p07_foundation_does_not_write_records",
    "hrx_ai_scoring_attempt_p07_foundation_does_not_use_real_evaluation_data",
    "hrx_ai_scoring_attempt_p07_foundation_does_not_bypass_permissions",
    "hrx_ai_scoring_attempt_p07_foundation_does_not_execute_policy",
    "hrx_ai_scoring_attempt_p07_foundation_does_not_emit_decisions",
    "hrx_ai_scoring_attempt_p07_foundation_does_not_open_score_runtime",
  ]),
  required_no_leak_guards: HRX_CP897_REQUIREMENTS.required_no_leak_guards,
});

export const HRX_CP961_REQUIRED_SECTION_ROWS = deepFreeze({
  "RP30.P07.M02": [
    "AIScoringAttempt HRX slice subphase 8",
    "AIScoringAttempt HRX slice subphase 9",
    "AIScoringAttempt HRX slice subphase 10",
    "AIScoringAttempt HRX slice subphase 11",
    "AIScoringAttempt HRX slice subphase 12",
    "AIScoringAttempt HRX slice subphase 13",
  ],
  "RP30.P07.M03": [
    "CrossTenantAccess HRX slice subphase 1",
    "CrossTenantAccess HRX slice subphase 2",
    "CrossTenantAccess HRX slice subphase 3",
    "CrossTenantAccess HRX slice subphase 4",
  ],
});

export const HRX_CP961_REQUIREMENTS = deepFreeze({
  deliverable_counts: {
    implementation: 10,
  },
  phase_counts: {
    "RP30.P07": 10,
  },
  micro_phase_row_counts: {
    "RP30.P07.M02": 6,
    "RP30.P07.M03": 4,
  },
  micro_title_row_counts: {
    "AIScoringAttempt HRX slice": 6,
    "CrossTenantAccess HRX slice": 4,
  },
  required_section_rows: HRX_CP961_REQUIRED_SECTION_ROWS,
  mandatory_artifacts: HRX_CP897_REQUIREMENTS.mandatory_artifacts,
  required_capabilities: unique([
    ...HRX_CP960_REQUIREMENTS.required_capabilities,
    "hrx_ai_scoring_attempt_p07_tail_descriptor",
    "hrx_cross_tenant_access_p07_foundation_descriptor",
    "hrx_cross_tenant_access_runtime_deferred_descriptor",
  ]),
  safety_gates: unique([
    ...HRX_CP960_REQUIREMENTS.safety_gates,
    "hrx_ai_scoring_attempt_p07_tail_does_not_open_runtime",
    "hrx_ai_scoring_attempt_p07_tail_does_not_write_records",
    "hrx_ai_scoring_attempt_p07_tail_does_not_use_real_evaluation_data",
    "hrx_ai_scoring_attempt_p07_tail_does_not_emit_decisions",
    "hrx_ai_scoring_attempt_p07_tail_does_not_open_score_runtime",
    "hrx_cross_tenant_access_p07_foundation_does_not_open_runtime",
    "hrx_cross_tenant_access_p07_foundation_does_not_write_records",
    "hrx_cross_tenant_access_p07_foundation_does_not_use_real_tenant_data",
    "hrx_cross_tenant_access_p07_foundation_does_not_bypass_permissions",
    "hrx_cross_tenant_access_p07_foundation_does_not_execute_policy",
    "hrx_cross_tenant_access_p07_foundation_does_not_emit_decisions",
    "hrx_cross_tenant_access_p07_foundation_preserves_tenant_boundaries",
  ]),
  required_no_leak_guards: HRX_CP897_REQUIREMENTS.required_no_leak_guards,
});

export const HRX_CP962_REQUIRED_SECTION_ROWS = deepFreeze({
  "RP30.P07.M03": [
    "CrossTenantAccess HRX slice subphase 5",
    "CrossTenantAccess HRX slice subphase 6",
    "CrossTenantAccess HRX slice subphase 7",
    "CrossTenantAccess HRX slice subphase 8",
    "CrossTenantAccess HRX slice subphase 9",
    "CrossTenantAccess HRX slice subphase 10",
    "CrossTenantAccess HRX slice subphase 11",
    "CrossTenantAccess HRX slice subphase 12",
    "CrossTenantAccess HRX slice subphase 13",
  ],
  "RP30.P07.M04": [
    "StorageDecisionGap HRX slice subphase 1",
  ],
});

export const HRX_CP962_REQUIREMENTS = deepFreeze({
  deliverable_counts: {
    implementation: 10,
  },
  phase_counts: {
    "RP30.P07": 10,
  },
  micro_phase_row_counts: {
    "RP30.P07.M03": 9,
    "RP30.P07.M04": 1,
  },
  micro_title_row_counts: {
    "CrossTenantAccess HRX slice": 9,
    "StorageDecisionGap HRX slice": 1,
  },
  required_section_rows: HRX_CP962_REQUIRED_SECTION_ROWS,
  mandatory_artifacts: HRX_CP897_REQUIREMENTS.mandatory_artifacts,
  required_capabilities: unique([
    ...HRX_CP961_REQUIREMENTS.required_capabilities,
    "hrx_cross_tenant_access_p07_tail_descriptor",
    "hrx_storage_decision_gap_p07_foundation_descriptor",
    "hrx_storage_decision_gap_runtime_deferred_descriptor",
  ]),
  safety_gates: unique([
    ...HRX_CP961_REQUIREMENTS.safety_gates,
    "hrx_cross_tenant_access_p07_tail_does_not_open_runtime",
    "hrx_cross_tenant_access_p07_tail_does_not_write_records",
    "hrx_cross_tenant_access_p07_tail_does_not_use_real_tenant_data",
    "hrx_cross_tenant_access_p07_tail_does_not_bypass_permissions",
    "hrx_cross_tenant_access_p07_tail_does_not_execute_policy",
    "hrx_cross_tenant_access_p07_tail_does_not_emit_decisions",
    "hrx_cross_tenant_access_p07_tail_preserves_tenant_boundaries",
    "hrx_storage_decision_gap_p07_foundation_does_not_open_runtime",
    "hrx_storage_decision_gap_p07_foundation_does_not_write_records",
    "hrx_storage_decision_gap_p07_foundation_does_not_use_real_storage_data",
    "hrx_storage_decision_gap_p07_foundation_does_not_bypass_permissions",
    "hrx_storage_decision_gap_p07_foundation_does_not_execute_policy",
    "hrx_storage_decision_gap_p07_foundation_does_not_emit_decisions",
    "hrx_storage_decision_gap_p07_foundation_does_not_open_gap_resolution_runtime",
  ]),
  required_no_leak_guards: HRX_CP897_REQUIREMENTS.required_no_leak_guards,
});

export const HRX_CP963_REQUIRED_SECTION_ROWS = deepFreeze({
  "RP30.P07.M04": [
    "StorageDecisionGap HRX slice subphase 2",
    "StorageDecisionGap HRX slice subphase 3",
    "StorageDecisionGap HRX slice subphase 4",
    "StorageDecisionGap HRX slice subphase 5",
    "StorageDecisionGap HRX slice subphase 6",
    "StorageDecisionGap HRX slice subphase 7",
    "StorageDecisionGap HRX slice subphase 8",
    "StorageDecisionGap HRX slice subphase 9",
    "StorageDecisionGap HRX slice subphase 10",
    "StorageDecisionGap HRX slice subphase 11",
  ],
});

export const HRX_CP963_REQUIREMENTS = deepFreeze({
  deliverable_counts: {
    implementation: 10,
  },
  phase_counts: {
    "RP30.P07": 10,
  },
  micro_phase_row_counts: {
    "RP30.P07.M04": 10,
  },
  micro_title_row_counts: {
    "StorageDecisionGap HRX slice": 10,
  },
  required_section_rows: HRX_CP963_REQUIRED_SECTION_ROWS,
  mandatory_artifacts: HRX_CP897_REQUIREMENTS.mandatory_artifacts,
  required_capabilities: unique([
    ...HRX_CP962_REQUIREMENTS.required_capabilities,
    "hrx_storage_decision_gap_p07_mid_descriptor",
    "hrx_storage_decision_gap_gap_resolution_deferred_descriptor",
  ]),
  safety_gates: unique([
    ...HRX_CP962_REQUIREMENTS.safety_gates,
    "hrx_storage_decision_gap_p07_mid_does_not_open_runtime",
    "hrx_storage_decision_gap_p07_mid_does_not_write_records",
    "hrx_storage_decision_gap_p07_mid_does_not_use_real_storage_data",
    "hrx_storage_decision_gap_p07_mid_does_not_bypass_permissions",
    "hrx_storage_decision_gap_p07_mid_does_not_execute_policy",
    "hrx_storage_decision_gap_p07_mid_does_not_emit_decisions",
    "hrx_storage_decision_gap_p07_mid_does_not_open_storage_runtime",
    "hrx_storage_decision_gap_p07_mid_does_not_open_gap_resolution_runtime",
  ]),
  required_no_leak_guards: HRX_CP897_REQUIREMENTS.required_no_leak_guards,
});

export const HRX_CP964_REQUIRED_SECTION_ROWS = deepFreeze({
  "RP30.P07.M04": [
    "StorageDecisionGap HRX slice subphase 12",
  ],
  "RP30.P07.M05": [
    "Recovery HRX slice subphase 1",
    "Recovery HRX slice subphase 2",
    "Recovery HRX slice subphase 3",
    "Recovery HRX slice subphase 4",
    "Recovery HRX slice subphase 5",
    "Recovery HRX slice subphase 6",
    "Recovery HRX slice subphase 7",
    "Recovery HRX slice subphase 8",
    "Recovery HRX slice subphase 9",
  ],
});

export const HRX_CP964_REQUIREMENTS = deepFreeze({
  deliverable_counts: {
    implementation: 1,
    security_audit: 9,
  },
  phase_counts: {
    "RP30.P07": 10,
  },
  micro_phase_row_counts: {
    "RP30.P07.M04": 1,
    "RP30.P07.M05": 9,
  },
  micro_title_row_counts: {
    "StorageDecisionGap HRX slice": 1,
    "Recovery HRX slice": 9,
  },
  required_section_rows: HRX_CP964_REQUIRED_SECTION_ROWS,
  mandatory_artifacts: HRX_CP897_REQUIREMENTS.mandatory_artifacts,
  required_capabilities: unique([
    ...HRX_CP963_REQUIREMENTS.required_capabilities,
    "hrx_storage_decision_gap_p07_tail_descriptor",
    "hrx_recovery_p07_foundation_descriptor",
    "hrx_recovery_runtime_deferred_descriptor",
  ]),
  safety_gates: unique([
    ...HRX_CP963_REQUIREMENTS.safety_gates,
    "hrx_storage_decision_gap_p07_tail_does_not_open_runtime",
    "hrx_storage_decision_gap_p07_tail_does_not_write_records",
    "hrx_storage_decision_gap_p07_tail_does_not_use_real_storage_data",
    "hrx_storage_decision_gap_p07_tail_does_not_bypass_permissions",
    "hrx_storage_decision_gap_p07_tail_does_not_emit_decisions",
    "hrx_storage_decision_gap_p07_tail_does_not_open_gap_resolution_runtime",
    "hrx_recovery_p07_foundation_does_not_open_runtime",
    "hrx_recovery_p07_foundation_does_not_write_records",
    "hrx_recovery_p07_foundation_does_not_use_real_recovery_data",
    "hrx_recovery_p07_foundation_does_not_bypass_permissions",
    "hrx_recovery_p07_foundation_does_not_execute_policy",
    "hrx_recovery_p07_foundation_does_not_emit_decisions",
    "hrx_recovery_p07_foundation_does_not_open_replay_runtime",
    "hrx_recovery_p07_foundation_does_not_open_auto_remediation_runtime",
  ]),
  required_no_leak_guards: HRX_CP897_REQUIREMENTS.required_no_leak_guards,
});

export const HRX_CP965_REQUIRED_SECTION_ROWS = deepFreeze({
  "RP30.P07.M05": [
    "Recovery HRX slice subphase 10",
    "Recovery HRX slice subphase 11",
    "Recovery HRX slice subphase 12",
  ],
  "RP30.P07.M06": [
    "MissingUserLink HRX slice subphase 1",
    "MissingUserLink HRX slice subphase 2",
    "MissingUserLink HRX slice subphase 3",
    "MissingUserLink HRX slice subphase 4",
    "MissingUserLink HRX slice subphase 5",
    "MissingUserLink HRX slice subphase 6",
    "MissingUserLink HRX slice subphase 7",
  ],
});

export const HRX_CP965_REQUIREMENTS = deepFreeze({
  deliverable_counts: {
    implementation: 7,
    security_audit: 3,
  },
  phase_counts: {
    "RP30.P07": 10,
  },
  micro_phase_row_counts: {
    "RP30.P07.M05": 3,
    "RP30.P07.M06": 7,
  },
  micro_title_row_counts: {
    "Recovery HRX slice": 3,
    "MissingUserLink HRX slice": 7,
  },
  required_section_rows: HRX_CP965_REQUIRED_SECTION_ROWS,
  mandatory_artifacts: HRX_CP897_REQUIREMENTS.mandatory_artifacts,
  required_capabilities: unique([
    ...HRX_CP964_REQUIREMENTS.required_capabilities,
    "hrx_recovery_p07_tail_descriptor",
    "hrx_missing_user_link_p07_foundation_descriptor",
    "hrx_missing_user_link_runtime_deferred_descriptor",
  ]),
  safety_gates: unique([
    ...HRX_CP964_REQUIREMENTS.safety_gates,
    "hrx_recovery_p07_tail_does_not_open_runtime",
    "hrx_recovery_p07_tail_does_not_write_records",
    "hrx_recovery_p07_tail_does_not_use_real_recovery_data",
    "hrx_recovery_p07_tail_does_not_bypass_permissions",
    "hrx_recovery_p07_tail_does_not_emit_decisions",
    "hrx_recovery_p07_tail_does_not_open_replay_runtime",
    "hrx_recovery_p07_tail_does_not_open_auto_remediation_runtime",
    "hrx_missing_user_link_p07_foundation_does_not_open_runtime",
    "hrx_missing_user_link_p07_foundation_does_not_write_records",
    "hrx_missing_user_link_p07_foundation_does_not_use_real_user_data",
    "hrx_missing_user_link_p07_foundation_does_not_bypass_permissions",
    "hrx_missing_user_link_p07_foundation_does_not_execute_policy",
    "hrx_missing_user_link_p07_foundation_does_not_emit_decisions",
    "hrx_missing_user_link_p07_foundation_does_not_open_user_employee_link_runtime",
  ]),
  required_no_leak_guards: HRX_CP897_REQUIREMENTS.required_no_leak_guards,
});

export const HRX_CP966_REQUIRED_SECTION_ROWS = deepFreeze({
  "RP30.P07.M06": [
    "MissingUserLink HRX slice subphase 8",
    "MissingUserLink HRX slice subphase 9",
    "MissingUserLink HRX slice subphase 10",
    "MissingUserLink HRX slice subphase 11",
    "MissingUserLink HRX slice subphase 12",
  ],
  "RP30.P07.M07": [
    "PayrollRuntimeAttempt HRX slice subphase 1",
    "PayrollRuntimeAttempt HRX slice subphase 2",
    "PayrollRuntimeAttempt HRX slice subphase 3",
    "PayrollRuntimeAttempt HRX slice subphase 4",
    "PayrollRuntimeAttempt HRX slice subphase 5",
  ],
});

export const HRX_CP966_REQUIREMENTS = deepFreeze({
  deliverable_counts: {
    implementation: 10,
  },
  phase_counts: {
    "RP30.P07": 10,
  },
  micro_phase_row_counts: {
    "RP30.P07.M06": 5,
    "RP30.P07.M07": 5,
  },
  micro_title_row_counts: {
    "MissingUserLink HRX slice": 5,
    "PayrollRuntimeAttempt HRX slice": 5,
  },
  required_section_rows: HRX_CP966_REQUIRED_SECTION_ROWS,
  mandatory_artifacts: HRX_CP897_REQUIREMENTS.mandatory_artifacts,
  required_capabilities: unique([
    ...HRX_CP965_REQUIREMENTS.required_capabilities,
    "hrx_missing_user_link_p07_tail_descriptor",
    "hrx_payroll_runtime_attempt_p07_foundation_descriptor",
    "hrx_payroll_runtime_attempt_runtime_deferred_descriptor",
  ]),
  safety_gates: unique([
    ...HRX_CP965_REQUIREMENTS.safety_gates,
    "hrx_missing_user_link_p07_tail_does_not_open_runtime",
    "hrx_missing_user_link_p07_tail_does_not_write_records",
    "hrx_missing_user_link_p07_tail_does_not_use_real_user_data",
    "hrx_missing_user_link_p07_tail_does_not_bypass_permissions",
    "hrx_missing_user_link_p07_tail_does_not_emit_decisions",
    "hrx_missing_user_link_p07_tail_does_not_open_user_employee_link_runtime",
    "hrx_payroll_runtime_attempt_p07_foundation_does_not_open_runtime",
    "hrx_payroll_runtime_attempt_p07_foundation_does_not_write_records",
    "hrx_payroll_runtime_attempt_p07_foundation_does_not_use_real_payroll_data",
    "hrx_payroll_runtime_attempt_p07_foundation_does_not_bypass_permissions",
    "hrx_payroll_runtime_attempt_p07_foundation_does_not_execute_policy",
    "hrx_payroll_runtime_attempt_p07_foundation_does_not_emit_decisions",
    "hrx_payroll_runtime_attempt_p07_foundation_does_not_open_calculation_runtime",
  ]),
  required_no_leak_guards: HRX_CP897_REQUIREMENTS.required_no_leak_guards,
});

export const HRX_CP967_REQUIRED_SECTION_ROWS = deepFreeze({
  "RP30.P07.M07": [
    "PayrollRuntimeAttempt HRX slice subphase 6",
    "PayrollRuntimeAttempt HRX slice subphase 7",
    "PayrollRuntimeAttempt HRX slice subphase 8",
    "PayrollRuntimeAttempt HRX slice subphase 9",
    "PayrollRuntimeAttempt HRX slice subphase 10",
    "PayrollRuntimeAttempt HRX slice subphase 11",
    "PayrollRuntimeAttempt HRX slice subphase 12",
  ],
  "RP30.P07.M08": [
    "AIScoringAttempt HRX slice subphase 1",
    "AIScoringAttempt HRX slice subphase 2",
    "AIScoringAttempt HRX slice subphase 3",
  ],
});

export const HRX_CP967_REQUIREMENTS = deepFreeze({
  deliverable_counts: {
    implementation: 10,
  },
  phase_counts: {
    "RP30.P07": 10,
  },
  micro_phase_row_counts: {
    "RP30.P07.M07": 7,
    "RP30.P07.M08": 3,
  },
  micro_title_row_counts: {
    "PayrollRuntimeAttempt HRX slice": 7,
    "AIScoringAttempt HRX slice": 3,
  },
  required_section_rows: HRX_CP967_REQUIRED_SECTION_ROWS,
  mandatory_artifacts: HRX_CP897_REQUIREMENTS.mandatory_artifacts,
  required_capabilities: unique([
    ...HRX_CP966_REQUIREMENTS.required_capabilities,
    "hrx_payroll_runtime_attempt_p07_tail_descriptor",
    "hrx_ai_scoring_attempt_p07_foundation_descriptor",
    "hrx_ai_scoring_attempt_runtime_deferred_descriptor",
  ]),
  safety_gates: unique([
    ...HRX_CP966_REQUIREMENTS.safety_gates,
    "hrx_payroll_runtime_attempt_p07_tail_does_not_open_runtime",
    "hrx_payroll_runtime_attempt_p07_tail_does_not_write_records",
    "hrx_payroll_runtime_attempt_p07_tail_does_not_use_real_payroll_data",
    "hrx_payroll_runtime_attempt_p07_tail_does_not_bypass_permissions",
    "hrx_payroll_runtime_attempt_p07_tail_does_not_open_calculation_runtime",
    "hrx_ai_scoring_attempt_p07_foundation_does_not_open_runtime",
    "hrx_ai_scoring_attempt_p07_foundation_does_not_write_records",
    "hrx_ai_scoring_attempt_p07_foundation_does_not_use_real_evaluation_data",
    "hrx_ai_scoring_attempt_p07_foundation_does_not_bypass_permissions",
    "hrx_ai_scoring_attempt_p07_foundation_does_not_execute_policy",
    "hrx_ai_scoring_attempt_p07_foundation_does_not_emit_decisions",
    "hrx_ai_scoring_attempt_p07_foundation_does_not_open_score_runtime",
  ]),
  required_no_leak_guards: HRX_CP897_REQUIREMENTS.required_no_leak_guards,
});

export const HRX_CP968_REQUIRED_SECTION_ROWS = deepFreeze({
  "RP30.P07.M08": [
    "AIScoringAttempt HRX slice subphase 4",
    "AIScoringAttempt HRX slice subphase 5",
    "AIScoringAttempt HRX slice subphase 6",
    "AIScoringAttempt HRX slice subphase 7",
    "AIScoringAttempt HRX slice subphase 8",
    "AIScoringAttempt HRX slice subphase 9",
    "AIScoringAttempt HRX slice subphase 10",
    "AIScoringAttempt HRX slice subphase 11",
    "AIScoringAttempt HRX slice subphase 12",
  ],
  "RP30.P07.M09": [
    "CrossTenantAccess HRX slice subphase 1",
  ],
});

export const HRX_CP968_REQUIREMENTS = deepFreeze({
  deliverable_counts: {
    implementation: 10,
  },
  phase_counts: {
    "RP30.P07": 10,
  },
  micro_phase_row_counts: {
    "RP30.P07.M08": 9,
    "RP30.P07.M09": 1,
  },
  micro_title_row_counts: {
    "AIScoringAttempt HRX slice": 9,
    "CrossTenantAccess HRX slice": 1,
  },
  required_section_rows: HRX_CP968_REQUIRED_SECTION_ROWS,
  mandatory_artifacts: HRX_CP897_REQUIREMENTS.mandatory_artifacts,
  required_capabilities: unique([
    ...HRX_CP967_REQUIREMENTS.required_capabilities,
    "hrx_ai_scoring_attempt_p07_tail_descriptor",
    "hrx_cross_tenant_access_p07_foundation_descriptor",
    "hrx_cross_tenant_access_runtime_deferred_descriptor",
  ]),
  safety_gates: unique([
    ...HRX_CP967_REQUIREMENTS.safety_gates,
    "hrx_ai_scoring_attempt_p07_tail_does_not_open_runtime",
    "hrx_ai_scoring_attempt_p07_tail_does_not_write_records",
    "hrx_ai_scoring_attempt_p07_tail_does_not_use_real_evaluation_data",
    "hrx_ai_scoring_attempt_p07_tail_does_not_bypass_permissions",
    "hrx_ai_scoring_attempt_p07_tail_does_not_open_score_runtime",
    "hrx_ai_scoring_attempt_p07_tail_does_not_allow_final_judgment",
    "hrx_cross_tenant_access_p07_foundation_does_not_open_runtime",
    "hrx_cross_tenant_access_p07_foundation_does_not_write_records",
    "hrx_cross_tenant_access_p07_foundation_does_not_use_real_tenant_data",
    "hrx_cross_tenant_access_p07_foundation_does_not_bypass_permissions",
    "hrx_cross_tenant_access_p07_foundation_does_not_execute_policy",
    "hrx_cross_tenant_access_p07_foundation_does_not_emit_decisions",
    "hrx_cross_tenant_access_p07_foundation_does_not_open_cross_tenant_runtime",
    "hrx_cross_tenant_access_p07_foundation_does_not_bypass_tenant_boundary",
  ]),
  required_no_leak_guards: HRX_CP897_REQUIREMENTS.required_no_leak_guards,
});

export const HRX_CP969_REQUIRED_SECTION_ROWS = deepFreeze({
  "RP30.P07.M09": [
    "CrossTenantAccess HRX slice subphase 2",
    "CrossTenantAccess HRX slice subphase 3",
    "CrossTenantAccess HRX slice subphase 4",
    "CrossTenantAccess HRX slice subphase 5",
    "CrossTenantAccess HRX slice subphase 6",
    "CrossTenantAccess HRX slice subphase 7",
    "CrossTenantAccess HRX slice subphase 8",
    "CrossTenantAccess HRX slice subphase 9",
    "CrossTenantAccess HRX slice subphase 10",
    "CrossTenantAccess HRX slice subphase 11",
  ],
});

export const HRX_CP969_REQUIREMENTS = deepFreeze({
  deliverable_counts: {
    implementation: 10,
  },
  phase_counts: {
    "RP30.P07": 10,
  },
  micro_phase_row_counts: {
    "RP30.P07.M09": 10,
  },
  micro_title_row_counts: {
    "CrossTenantAccess HRX slice": 10,
  },
  required_section_rows: HRX_CP969_REQUIRED_SECTION_ROWS,
  mandatory_artifacts: HRX_CP897_REQUIREMENTS.mandatory_artifacts,
  required_capabilities: unique([
    ...HRX_CP968_REQUIREMENTS.required_capabilities,
    "hrx_cross_tenant_access_p07_tail_descriptor",
  ]),
  safety_gates: unique([
    ...HRX_CP968_REQUIREMENTS.safety_gates,
    "hrx_cross_tenant_access_p07_tail_does_not_open_runtime",
    "hrx_cross_tenant_access_p07_tail_does_not_write_records",
    "hrx_cross_tenant_access_p07_tail_does_not_use_real_tenant_data",
    "hrx_cross_tenant_access_p07_tail_does_not_bypass_permissions",
    "hrx_cross_tenant_access_p07_tail_does_not_execute_policy",
    "hrx_cross_tenant_access_p07_tail_does_not_emit_decisions",
    "hrx_cross_tenant_access_p07_tail_does_not_open_cross_tenant_runtime",
    "hrx_cross_tenant_access_p07_tail_does_not_bypass_tenant_boundary",
  ]),
  required_no_leak_guards: HRX_CP897_REQUIREMENTS.required_no_leak_guards,
});

export const HRX_CP970_REQUIRED_SECTION_ROWS = deepFreeze({
  "RP30.P07.M09": [
    "CrossTenantAccess HRX slice subphase 12",
  ],
  "RP30.P07.M10": [
    "StorageDecisionGap HRX slice subphase 1",
    "StorageDecisionGap HRX slice subphase 2",
    "StorageDecisionGap HRX slice subphase 3",
    "StorageDecisionGap HRX slice subphase 4",
    "StorageDecisionGap HRX slice subphase 5",
    "StorageDecisionGap HRX slice subphase 6",
    "StorageDecisionGap HRX slice subphase 7",
    "StorageDecisionGap HRX slice subphase 8",
    "StorageDecisionGap HRX slice subphase 9",
  ],
});

export const HRX_CP970_REQUIREMENTS = deepFreeze({
  deliverable_counts: {
    implementation: 10,
  },
  phase_counts: {
    "RP30.P07": 10,
  },
  micro_phase_row_counts: {
    "RP30.P07.M09": 1,
    "RP30.P07.M10": 9,
  },
  micro_title_row_counts: {
    "CrossTenantAccess HRX slice": 1,
    "StorageDecisionGap HRX slice": 9,
  },
  required_section_rows: HRX_CP970_REQUIRED_SECTION_ROWS,
  mandatory_artifacts: HRX_CP897_REQUIREMENTS.mandatory_artifacts,
  required_capabilities: unique([
    ...HRX_CP969_REQUIREMENTS.required_capabilities,
    "hrx_storage_decision_gap_p07_foundation_descriptor",
    "hrx_storage_decision_gap_runtime_deferred_descriptor",
  ]),
  safety_gates: unique([
    ...HRX_CP969_REQUIREMENTS.safety_gates,
    "hrx_storage_decision_gap_p07_foundation_does_not_open_runtime",
    "hrx_storage_decision_gap_p07_foundation_does_not_write_records",
    "hrx_storage_decision_gap_p07_foundation_does_not_use_real_storage_data",
    "hrx_storage_decision_gap_p07_foundation_does_not_bypass_permissions",
    "hrx_storage_decision_gap_p07_foundation_does_not_execute_policy",
    "hrx_storage_decision_gap_p07_foundation_does_not_emit_decisions",
    "hrx_storage_decision_gap_p07_foundation_does_not_open_storage_runtime",
    "hrx_storage_decision_gap_p07_foundation_does_not_open_gap_resolution_runtime",
  ]),
  required_no_leak_guards: HRX_CP897_REQUIREMENTS.required_no_leak_guards,
});

export const HRX_CP971_REQUIRED_SECTION_ROWS = deepFreeze({
  "RP30.P07.M10": [
    "StorageDecisionGap HRX slice subphase 10",
    "StorageDecisionGap HRX slice subphase 11",
    "StorageDecisionGap HRX slice subphase 12",
  ],
  "RP30.P08.M00": [
    "H30CommandMatrix HRX slice subphase 1",
    "H30CommandMatrix HRX slice subphase 2",
    "H30CommandMatrix HRX slice subphase 3",
    "H30CommandMatrix HRX slice subphase 4",
    "H30CommandMatrix HRX slice subphase 5",
    "H30CommandMatrix HRX slice subphase 6",
    "H30CommandMatrix HRX slice subphase 7",
  ],
});

export const HRX_CP971_REQUIREMENTS = deepFreeze({
  deliverable_counts: {
    implementation: 10,
  },
  phase_counts: {
    "RP30.P07": 3,
    "RP30.P08": 7,
  },
  micro_phase_row_counts: {
    "RP30.P07.M10": 3,
    "RP30.P08.M00": 7,
  },
  micro_title_row_counts: {
    "StorageDecisionGap HRX slice": 3,
    "H30CommandMatrix HRX slice": 7,
  },
  required_section_rows: HRX_CP971_REQUIRED_SECTION_ROWS,
  mandatory_artifacts: HRX_CP897_REQUIREMENTS.mandatory_artifacts,
  required_capabilities: unique([
    ...HRX_CP970_REQUIREMENTS.required_capabilities,
    "hrx_storage_decision_gap_p07_tail_descriptor",
    "hrx_h30_command_matrix_p08_foundation_descriptor",
    "hrx_h30_command_matrix_runtime_deferred_descriptor",
  ]),
  safety_gates: unique([
    ...HRX_CP970_REQUIREMENTS.safety_gates,
    "hrx_storage_decision_gap_p07_tail_does_not_open_runtime",
    "hrx_storage_decision_gap_p07_tail_does_not_write_records",
    "hrx_storage_decision_gap_p07_tail_does_not_use_real_storage_data",
    "hrx_storage_decision_gap_p07_tail_does_not_bypass_permissions",
    "hrx_storage_decision_gap_p07_tail_does_not_execute_policy",
    "hrx_storage_decision_gap_p07_tail_does_not_emit_decisions",
    "hrx_storage_decision_gap_p07_tail_does_not_open_storage_runtime",
    "hrx_storage_decision_gap_p07_tail_does_not_open_gap_resolution_runtime",
    "hrx_h30_command_matrix_p08_foundation_does_not_open_runtime",
    "hrx_h30_command_matrix_p08_foundation_does_not_write_records",
    "hrx_h30_command_matrix_p08_foundation_does_not_use_real_command_data",
    "hrx_h30_command_matrix_p08_foundation_does_not_bypass_permissions",
    "hrx_h30_command_matrix_p08_foundation_does_not_execute_policy",
    "hrx_h30_command_matrix_p08_foundation_does_not_emit_decisions",
    "hrx_h30_command_matrix_p08_foundation_does_not_open_command_execution_runtime",
  ]),
  required_no_leak_guards: HRX_CP897_REQUIREMENTS.required_no_leak_guards,
});

export const HRX_CP972_REQUIRED_SECTION_ROWS = deepFreeze({
  "RP30.P08.M00": [
    "H30CommandMatrix HRX slice subphase 8",
    "H30CommandMatrix HRX slice subphase 9",
  ],
  "RP30.P08.M01": [
    "EvidenceTemplate HRX slice subphase 1",
    "EvidenceTemplate HRX slice subphase 2",
    "EvidenceTemplate HRX slice subphase 3",
    "EvidenceTemplate HRX slice subphase 4",
    "EvidenceTemplate HRX slice subphase 5",
    "EvidenceTemplate HRX slice subphase 6",
    "EvidenceTemplate HRX slice subphase 7",
    "EvidenceTemplate HRX slice subphase 8",
  ],
});

export const HRX_CP972_REQUIREMENTS = deepFreeze({
  deliverable_counts: {
    implementation: 10,
  },
  phase_counts: {
    "RP30.P08": 10,
  },
  micro_phase_row_counts: {
    "RP30.P08.M00": 2,
    "RP30.P08.M01": 8,
  },
  micro_title_row_counts: {
    "H30CommandMatrix HRX slice": 2,
    "EvidenceTemplate HRX slice": 8,
  },
  required_section_rows: HRX_CP972_REQUIRED_SECTION_ROWS,
  mandatory_artifacts: HRX_CP897_REQUIREMENTS.mandatory_artifacts,
  required_capabilities: unique([
    ...HRX_CP971_REQUIREMENTS.required_capabilities,
    "hrx_h30_command_matrix_p08_tail_descriptor",
    "hrx_evidence_template_p08_foundation_descriptor",
    "hrx_evidence_template_runtime_deferred_descriptor",
  ]),
  safety_gates: unique([
    ...HRX_CP971_REQUIREMENTS.safety_gates,
    "hrx_h30_command_matrix_p08_tail_does_not_open_runtime",
    "hrx_h30_command_matrix_p08_tail_does_not_write_records",
    "hrx_h30_command_matrix_p08_tail_does_not_use_real_command_data",
    "hrx_h30_command_matrix_p08_tail_does_not_bypass_permissions",
    "hrx_h30_command_matrix_p08_tail_does_not_execute_policy",
    "hrx_h30_command_matrix_p08_tail_does_not_emit_decisions",
    "hrx_h30_command_matrix_p08_tail_does_not_open_command_execution_runtime",
    "hrx_evidence_template_p08_foundation_does_not_open_runtime",
    "hrx_evidence_template_p08_foundation_does_not_write_records",
    "hrx_evidence_template_p08_foundation_does_not_use_real_evidence_data",
    "hrx_evidence_template_p08_foundation_does_not_bypass_permissions",
    "hrx_evidence_template_p08_foundation_does_not_execute_policy",
    "hrx_evidence_template_p08_foundation_does_not_emit_decisions",
    "hrx_evidence_template_p08_foundation_does_not_open_render_runtime",
  ]),
  required_no_leak_guards: HRX_CP897_REQUIREMENTS.required_no_leak_guards,
});

export const HRX_CP973_REQUIRED_SECTION_ROWS = deepFreeze({
  "RP30.P08.M01": [
    "EvidenceTemplate HRX slice subphase 9",
  ],
  "RP30.P08.M02": [
    "NoRealData HRX slice subphase 1",
    "NoRealData HRX slice subphase 2",
    "NoRealData HRX slice subphase 3",
    "NoRealData HRX slice subphase 4",
    "NoRealData HRX slice subphase 5",
    "NoRealData HRX slice subphase 6",
    "NoRealData HRX slice subphase 7",
    "NoRealData HRX slice subphase 8",
    "NoRealData HRX slice subphase 9",
  ],
});

export const HRX_CP973_REQUIREMENTS = deepFreeze({
  deliverable_counts: {
    implementation: 10,
  },
  phase_counts: {
    "RP30.P08": 10,
  },
  micro_phase_row_counts: {
    "RP30.P08.M01": 1,
    "RP30.P08.M02": 9,
  },
  micro_title_row_counts: {
    "EvidenceTemplate HRX slice": 1,
    "NoRealData HRX slice": 9,
  },
  required_section_rows: HRX_CP973_REQUIRED_SECTION_ROWS,
  mandatory_artifacts: HRX_CP897_REQUIREMENTS.mandatory_artifacts,
  required_capabilities: unique([
    ...HRX_CP972_REQUIREMENTS.required_capabilities,
    "hrx_evidence_template_p08_tail_descriptor",
    "hrx_no_real_data_p08_foundation_descriptor",
    "hrx_no_real_data_runtime_deferred_descriptor",
  ]),
  safety_gates: unique([
    ...HRX_CP972_REQUIREMENTS.safety_gates,
    "hrx_evidence_template_p08_tail_does_not_open_runtime",
    "hrx_evidence_template_p08_tail_does_not_write_records",
    "hrx_evidence_template_p08_tail_does_not_use_real_evidence_data",
    "hrx_evidence_template_p08_tail_does_not_bypass_permissions",
    "hrx_evidence_template_p08_tail_does_not_execute_policy",
    "hrx_evidence_template_p08_tail_does_not_emit_decisions",
    "hrx_evidence_template_p08_tail_does_not_open_render_runtime",
    "hrx_no_real_data_p08_foundation_does_not_open_runtime",
    "hrx_no_real_data_p08_foundation_does_not_write_records",
    "hrx_no_real_data_p08_foundation_does_not_use_real_data",
    "hrx_no_real_data_p08_foundation_does_not_bypass_permissions",
    "hrx_no_real_data_p08_foundation_does_not_execute_policy",
    "hrx_no_real_data_p08_foundation_does_not_emit_decisions",
    "hrx_no_real_data_p08_foundation_does_not_open_enforcement_runtime",
  ]),
  required_no_leak_guards: HRX_CP897_REQUIREMENTS.required_no_leak_guards,
});

export const HRX_CP974_REQUIRED_SECTION_ROWS = deepFreeze({
  "RP30.P08.M03": [
    "BlockedClaims HRX slice subphase 1",
    "BlockedClaims HRX slice subphase 2",
    "BlockedClaims HRX slice subphase 3",
    "BlockedClaims HRX slice subphase 4",
    "BlockedClaims HRX slice subphase 5",
    "BlockedClaims HRX slice subphase 6",
    "BlockedClaims HRX slice subphase 7",
    "BlockedClaims HRX slice subphase 8",
    "BlockedClaims HRX slice subphase 9",
  ],
  "RP30.P08.M04": [
    "ClaudeDependency HRX slice subphase 1",
  ],
});

export const HRX_CP974_REQUIREMENTS = deepFreeze({
  deliverable_counts: {
    implementation: 10,
  },
  phase_counts: {
    "RP30.P08": 10,
  },
  micro_phase_row_counts: {
    "RP30.P08.M03": 9,
    "RP30.P08.M04": 1,
  },
  micro_title_row_counts: {
    "BlockedClaims HRX slice": 9,
    "ClaudeDependency HRX slice": 1,
  },
  required_section_rows: HRX_CP974_REQUIRED_SECTION_ROWS,
  mandatory_artifacts: HRX_CP897_REQUIREMENTS.mandatory_artifacts,
  required_capabilities: unique([
    ...HRX_CP973_REQUIREMENTS.required_capabilities,
    "hrx_blocked_claims_p08_foundation_descriptor",
    "hrx_blocked_claims_runtime_deferred_descriptor",
    "hrx_claude_dependency_p08_foundation_descriptor",
    "hrx_claude_dependency_runtime_deferred_descriptor",
  ]),
  safety_gates: unique([
    ...HRX_CP973_REQUIREMENTS.safety_gates,
    "hrx_blocked_claims_p08_foundation_does_not_open_runtime",
    "hrx_blocked_claims_p08_foundation_does_not_write_records",
    "hrx_blocked_claims_p08_foundation_does_not_use_real_claim_data",
    "hrx_blocked_claims_p08_foundation_does_not_bypass_permissions",
    "hrx_blocked_claims_p08_foundation_does_not_execute_policy",
    "hrx_blocked_claims_p08_foundation_does_not_emit_decisions",
    "hrx_blocked_claims_p08_foundation_does_not_open_claim_override_runtime",
    "hrx_claude_dependency_p08_foundation_does_not_open_runtime",
    "hrx_claude_dependency_p08_foundation_does_not_write_records",
    "hrx_claude_dependency_p08_foundation_does_not_use_real_review_data",
    "hrx_claude_dependency_p08_foundation_does_not_bypass_permissions",
    "hrx_claude_dependency_p08_foundation_does_not_execute_policy",
    "hrx_claude_dependency_p08_foundation_does_not_emit_decisions",
    "hrx_claude_dependency_p08_foundation_does_not_open_review_runtime",
  ]),
  required_no_leak_guards: HRX_CP897_REQUIREMENTS.required_no_leak_guards,
});

export const HRX_CP975_REQUIRED_SECTION_ROWS = deepFreeze({
  "RP30.P08.M04": [
    "ClaudeDependency HRX slice subphase 2",
    "ClaudeDependency HRX slice subphase 3",
    "ClaudeDependency HRX slice subphase 4",
    "ClaudeDependency HRX slice subphase 5",
    "ClaudeDependency HRX slice subphase 6",
    "ClaudeDependency HRX slice subphase 7",
    "ClaudeDependency HRX slice subphase 8",
    "ClaudeDependency HRX slice subphase 9",
  ],
  "RP30.P08.M05": [
    "HumanApproval HRX slice subphase 1",
    "HumanApproval HRX slice subphase 2",
  ],
});

export const HRX_CP975_REQUIREMENTS = deepFreeze({
  deliverable_counts: {
    implementation: 8,
    security_audit: 2,
  },
  phase_counts: {
    "RP30.P08": 10,
  },
  micro_phase_row_counts: {
    "RP30.P08.M04": 8,
    "RP30.P08.M05": 2,
  },
  micro_title_row_counts: {
    "ClaudeDependency HRX slice": 8,
    "HumanApproval HRX slice": 2,
  },
  required_section_rows: HRX_CP975_REQUIRED_SECTION_ROWS,
  mandatory_artifacts: HRX_CP897_REQUIREMENTS.mandatory_artifacts,
  required_capabilities: unique([
    ...HRX_CP974_REQUIREMENTS.required_capabilities,
    "hrx_claude_dependency_p08_tail_descriptor",
    "hrx_human_approval_p08_foundation_descriptor",
    "hrx_human_approval_runtime_deferred_descriptor",
  ]),
  safety_gates: unique([
    ...HRX_CP974_REQUIREMENTS.safety_gates,
    "hrx_claude_dependency_p08_tail_does_not_open_runtime",
    "hrx_claude_dependency_p08_tail_does_not_write_records",
    "hrx_claude_dependency_p08_tail_does_not_use_real_review_data",
    "hrx_claude_dependency_p08_tail_does_not_bypass_permissions",
    "hrx_claude_dependency_p08_tail_does_not_execute_policy",
    "hrx_claude_dependency_p08_tail_does_not_emit_decisions",
    "hrx_claude_dependency_p08_tail_does_not_open_review_runtime",
    "hrx_human_approval_p08_foundation_does_not_open_runtime",
    "hrx_human_approval_p08_foundation_does_not_write_records",
    "hrx_human_approval_p08_foundation_does_not_use_real_approval_data",
    "hrx_human_approval_p08_foundation_does_not_bypass_permissions",
    "hrx_human_approval_p08_foundation_does_not_execute_policy",
    "hrx_human_approval_p08_foundation_does_not_emit_decisions",
    "hrx_human_approval_p08_foundation_does_not_open_final_approval_runtime",
  ]),
  required_no_leak_guards: HRX_CP897_REQUIREMENTS.required_no_leak_guards,
});

export const HRX_CP976_REQUIRED_SECTION_ROWS = deepFreeze({
  "RP30.P08.M05": [
    "HumanApproval HRX slice subphase 3",
    "HumanApproval HRX slice subphase 4",
    "HumanApproval HRX slice subphase 5",
    "HumanApproval HRX slice subphase 6",
    "HumanApproval HRX slice subphase 7",
    "HumanApproval HRX slice subphase 8",
  ],
  "RP30.P08.M06": [
    "H30CommandMatrix HRX slice subphase 1",
    "H30CommandMatrix HRX slice subphase 2",
    "H30CommandMatrix HRX slice subphase 3",
    "H30CommandMatrix HRX slice subphase 4",
  ],
});

export const HRX_CP976_REQUIREMENTS = deepFreeze({
  deliverable_counts: {
    implementation: 4,
    security_audit: 6,
  },
  phase_counts: {
    "RP30.P08": 10,
  },
  micro_phase_row_counts: {
    "RP30.P08.M05": 6,
    "RP30.P08.M06": 4,
  },
  micro_title_row_counts: {
    "HumanApproval HRX slice": 6,
    "H30CommandMatrix HRX slice": 4,
  },
  required_section_rows: HRX_CP976_REQUIRED_SECTION_ROWS,
  mandatory_artifacts: HRX_CP897_REQUIREMENTS.mandatory_artifacts,
  required_capabilities: unique([
    ...HRX_CP975_REQUIREMENTS.required_capabilities,
    "hrx_human_approval_p08_tail_descriptor",
    "hrx_h30_command_matrix_p08_foundation_descriptor",
    "hrx_h30_command_matrix_runtime_deferred_descriptor",
  ]),
  safety_gates: unique([
    ...HRX_CP975_REQUIREMENTS.safety_gates,
    "hrx_human_approval_p08_tail_does_not_open_runtime",
    "hrx_human_approval_p08_tail_does_not_write_records",
    "hrx_human_approval_p08_tail_does_not_use_real_approval_data",
    "hrx_human_approval_p08_tail_does_not_bypass_permissions",
    "hrx_human_approval_p08_tail_does_not_execute_policy",
    "hrx_human_approval_p08_tail_does_not_emit_decisions",
    "hrx_human_approval_p08_tail_does_not_open_final_approval_runtime",
    "hrx_h30_command_matrix_p08_foundation_does_not_open_runtime",
    "hrx_h30_command_matrix_p08_foundation_does_not_write_records",
    "hrx_h30_command_matrix_p08_foundation_does_not_use_real_command_data",
    "hrx_h30_command_matrix_p08_foundation_does_not_bypass_permissions",
    "hrx_h30_command_matrix_p08_foundation_does_not_execute_policy",
    "hrx_h30_command_matrix_p08_foundation_does_not_emit_decisions",
    "hrx_h30_command_matrix_p08_foundation_does_not_open_command_execution_runtime",
  ]),
  required_no_leak_guards: HRX_CP897_REQUIREMENTS.required_no_leak_guards,
});

export const HRX_CP977_REQUIRED_SECTION_ROWS = deepFreeze({
  "RP30.P08.M06": [
    "H30CommandMatrix HRX slice subphase 5",
    "H30CommandMatrix HRX slice subphase 6",
    "H30CommandMatrix HRX slice subphase 7",
    "H30CommandMatrix HRX slice subphase 8",
    "H30CommandMatrix HRX slice subphase 9",
  ],
  "RP30.P08.M07": [
    "EvidenceTemplate HRX slice subphase 1",
    "EvidenceTemplate HRX slice subphase 2",
    "EvidenceTemplate HRX slice subphase 3",
    "EvidenceTemplate HRX slice subphase 4",
    "EvidenceTemplate HRX slice subphase 5",
  ],
});

export const HRX_CP977_REQUIREMENTS = deepFreeze({
  deliverable_counts: {
    implementation: 10,
  },
  phase_counts: {
    "RP30.P08": 10,
  },
  micro_phase_row_counts: {
    "RP30.P08.M06": 5,
    "RP30.P08.M07": 5,
  },
  micro_title_row_counts: {
    "H30CommandMatrix HRX slice": 5,
    "EvidenceTemplate HRX slice": 5,
  },
  required_section_rows: HRX_CP977_REQUIRED_SECTION_ROWS,
  mandatory_artifacts: HRX_CP897_REQUIREMENTS.mandatory_artifacts,
  required_capabilities: unique([
    ...HRX_CP976_REQUIREMENTS.required_capabilities,
    "hrx_h30_command_matrix_p08_tail_descriptor",
    "hrx_evidence_template_p08_foundation_descriptor",
    "hrx_evidence_template_runtime_deferred_descriptor",
  ]),
  safety_gates: unique([
    ...HRX_CP976_REQUIREMENTS.safety_gates,
    "hrx_h30_command_matrix_p08_tail_does_not_open_runtime",
    "hrx_h30_command_matrix_p08_tail_does_not_write_records",
    "hrx_h30_command_matrix_p08_tail_does_not_use_real_command_data",
    "hrx_h30_command_matrix_p08_tail_does_not_bypass_permissions",
    "hrx_h30_command_matrix_p08_tail_does_not_execute_policy",
    "hrx_h30_command_matrix_p08_tail_does_not_emit_decisions",
    "hrx_h30_command_matrix_p08_tail_does_not_open_command_execution_runtime",
    "hrx_evidence_template_p08_foundation_does_not_open_runtime",
    "hrx_evidence_template_p08_foundation_does_not_write_records",
    "hrx_evidence_template_p08_foundation_does_not_use_real_evidence_data",
    "hrx_evidence_template_p08_foundation_does_not_bypass_permissions",
    "hrx_evidence_template_p08_foundation_does_not_execute_policy",
    "hrx_evidence_template_p08_foundation_does_not_emit_decisions",
    "hrx_evidence_template_p08_foundation_does_not_open_render_runtime",
  ]),
  required_no_leak_guards: HRX_CP897_REQUIREMENTS.required_no_leak_guards,
});

export const HRX_CP978_REQUIRED_SECTION_ROWS = deepFreeze({
  "RP30.P08.M07": [
    "EvidenceTemplate HRX slice subphase 6",
    "EvidenceTemplate HRX slice subphase 7",
    "EvidenceTemplate HRX slice subphase 8",
  ],
  "RP30.P08.M08": [
    "NoRealData HRX slice subphase 1",
    "NoRealData HRX slice subphase 2",
    "NoRealData HRX slice subphase 3",
    "NoRealData HRX slice subphase 4",
    "NoRealData HRX slice subphase 5",
    "NoRealData HRX slice subphase 6",
    "NoRealData HRX slice subphase 7",
  ],
});

export const HRX_CP978_REQUIREMENTS = deepFreeze({
  deliverable_counts: {
    implementation: 10,
  },
  phase_counts: {
    "RP30.P08": 10,
  },
  micro_phase_row_counts: {
    "RP30.P08.M07": 3,
    "RP30.P08.M08": 7,
  },
  micro_title_row_counts: {
    "EvidenceTemplate HRX slice": 3,
    "NoRealData HRX slice": 7,
  },
  required_section_rows: HRX_CP978_REQUIRED_SECTION_ROWS,
  mandatory_artifacts: HRX_CP897_REQUIREMENTS.mandatory_artifacts,
  required_capabilities: unique([
    ...HRX_CP977_REQUIREMENTS.required_capabilities,
    "hrx_evidence_template_p08_tail_descriptor",
    "hrx_no_real_data_p08_foundation_descriptor",
    "hrx_no_real_data_runtime_deferred_descriptor",
  ]),
  safety_gates: unique([
    ...HRX_CP977_REQUIREMENTS.safety_gates,
    "hrx_evidence_template_p08_tail_does_not_open_runtime",
    "hrx_evidence_template_p08_tail_does_not_write_records",
    "hrx_evidence_template_p08_tail_does_not_use_real_evidence_data",
    "hrx_evidence_template_p08_tail_does_not_bypass_permissions",
    "hrx_evidence_template_p08_tail_does_not_execute_policy",
    "hrx_evidence_template_p08_tail_does_not_emit_decisions",
    "hrx_evidence_template_p08_tail_does_not_open_render_runtime",
    "hrx_no_real_data_p08_foundation_does_not_open_runtime",
    "hrx_no_real_data_p08_foundation_does_not_write_records",
    "hrx_no_real_data_p08_foundation_does_not_use_real_data",
    "hrx_no_real_data_p08_foundation_does_not_bypass_permissions",
    "hrx_no_real_data_p08_foundation_does_not_execute_policy",
    "hrx_no_real_data_p08_foundation_does_not_emit_decisions",
    "hrx_no_real_data_p08_foundation_does_not_open_enforcement_runtime",
  ]),
  required_no_leak_guards: HRX_CP897_REQUIREMENTS.required_no_leak_guards,
});

export const HRX_CP979_REQUIRED_SECTION_ROWS = deepFreeze({
  "RP30.P08.M08": [
    "NoRealData HRX slice subphase 8",
  ],
  "RP30.P08.M09": [
    "BlockedClaims HRX slice subphase 1",
    "BlockedClaims HRX slice subphase 2",
    "BlockedClaims HRX slice subphase 3",
    "BlockedClaims HRX slice subphase 4",
    "BlockedClaims HRX slice subphase 5",
    "BlockedClaims HRX slice subphase 6",
    "BlockedClaims HRX slice subphase 7",
    "BlockedClaims HRX slice subphase 8",
  ],
  "RP30.P08.M10": [
    "ClaudeDependency HRX slice subphase 1",
  ],
});

export const HRX_CP979_REQUIREMENTS = deepFreeze({
  deliverable_counts: {
    implementation: 10,
  },
  phase_counts: {
    "RP30.P08": 10,
  },
  micro_phase_row_counts: {
    "RP30.P08.M08": 1,
    "RP30.P08.M09": 8,
    "RP30.P08.M10": 1,
  },
  micro_title_row_counts: {
    "NoRealData HRX slice": 1,
    "BlockedClaims HRX slice": 8,
    "ClaudeDependency HRX slice": 1,
  },
  required_section_rows: HRX_CP979_REQUIRED_SECTION_ROWS,
  mandatory_artifacts: HRX_CP897_REQUIREMENTS.mandatory_artifacts,
  required_capabilities: unique([
    ...HRX_CP978_REQUIREMENTS.required_capabilities,
    "hrx_no_real_data_p08_tail_descriptor",
    "hrx_blocked_claims_p08_foundation_descriptor",
    "hrx_blocked_claims_runtime_deferred_descriptor",
    "hrx_claude_dependency_p08_foundation_descriptor",
    "hrx_claude_dependency_runtime_deferred_descriptor",
  ]),
  safety_gates: unique([
    ...HRX_CP978_REQUIREMENTS.safety_gates,
    "hrx_no_real_data_p08_tail_does_not_open_runtime",
    "hrx_no_real_data_p08_tail_does_not_write_records",
    "hrx_no_real_data_p08_tail_does_not_use_real_data",
    "hrx_no_real_data_p08_tail_does_not_bypass_permissions",
    "hrx_no_real_data_p08_tail_does_not_execute_policy",
    "hrx_no_real_data_p08_tail_does_not_emit_decisions",
    "hrx_no_real_data_p08_tail_does_not_open_enforcement_runtime",
    "hrx_blocked_claims_p08_foundation_does_not_open_runtime",
    "hrx_blocked_claims_p08_foundation_does_not_write_records",
    "hrx_blocked_claims_p08_foundation_does_not_use_real_claim_data",
    "hrx_blocked_claims_p08_foundation_does_not_bypass_permissions",
    "hrx_blocked_claims_p08_foundation_does_not_execute_policy",
    "hrx_blocked_claims_p08_foundation_does_not_emit_decisions",
    "hrx_blocked_claims_p08_foundation_does_not_open_claim_override_runtime",
    "hrx_claude_dependency_p08_foundation_does_not_open_runtime",
    "hrx_claude_dependency_p08_foundation_does_not_write_records",
    "hrx_claude_dependency_p08_foundation_does_not_use_real_review_data",
    "hrx_claude_dependency_p08_foundation_does_not_bypass_permissions",
    "hrx_claude_dependency_p08_foundation_does_not_execute_policy",
    "hrx_claude_dependency_p08_foundation_does_not_emit_decisions",
    "hrx_claude_dependency_p08_foundation_does_not_open_review_runtime",
  ]),
  required_no_leak_guards: HRX_CP897_REQUIREMENTS.required_no_leak_guards,
});

export const HRX_CP980_REQUIRED_SECTION_ROWS = deepFreeze({
  "RP30.P08.M10": [
    "ClaudeDependency HRX slice subphase 2",
    "ClaudeDependency HRX slice subphase 3",
    "ClaudeDependency HRX slice subphase 4",
    "ClaudeDependency HRX slice subphase 5",
    "ClaudeDependency HRX slice subphase 6",
    "ClaudeDependency HRX slice subphase 7",
    "ClaudeDependency HRX slice subphase 8",
    "ClaudeDependency HRX slice subphase 9",
  ],
  "RP30.P09.M00": [
    "ArchitectureReview HRX slice subphase 1",
    "ArchitectureReview HRX slice subphase 2",
  ],
});

export const HRX_CP980_REQUIREMENTS = deepFreeze({
  deliverable_counts: {
    implementation: 8,
    claude_review: 2,
  },
  phase_counts: {
    "RP30.P08": 8,
    "RP30.P09": 2,
  },
  micro_phase_row_counts: {
    "RP30.P08.M10": 8,
    "RP30.P09.M00": 2,
  },
  micro_title_row_counts: {
    "ClaudeDependency HRX slice": 8,
    "ArchitectureReview HRX slice": 2,
  },
  required_section_rows: HRX_CP980_REQUIRED_SECTION_ROWS,
  mandatory_artifacts: HRX_CP897_REQUIREMENTS.mandatory_artifacts,
  required_capabilities: unique([
    ...HRX_CP979_REQUIREMENTS.required_capabilities,
    "hrx_claude_dependency_p08_tail_descriptor",
    "hrx_architecture_review_p09_foundation_descriptor",
    "hrx_architecture_review_runtime_deferred_descriptor",
  ]),
  safety_gates: unique([
    ...HRX_CP979_REQUIREMENTS.safety_gates,
    "hrx_claude_dependency_p08_tail_does_not_open_runtime",
    "hrx_claude_dependency_p08_tail_does_not_write_records",
    "hrx_claude_dependency_p08_tail_does_not_use_real_review_data",
    "hrx_claude_dependency_p08_tail_does_not_bypass_permissions",
    "hrx_claude_dependency_p08_tail_does_not_execute_policy",
    "hrx_claude_dependency_p08_tail_does_not_emit_decisions",
    "hrx_claude_dependency_p08_tail_does_not_open_review_runtime",
    "hrx_architecture_review_p09_foundation_does_not_open_runtime",
    "hrx_architecture_review_p09_foundation_does_not_write_records",
    "hrx_architecture_review_p09_foundation_does_not_use_real_review_data",
    "hrx_architecture_review_p09_foundation_does_not_bypass_permissions",
    "hrx_architecture_review_p09_foundation_does_not_execute_policy",
    "hrx_architecture_review_p09_foundation_does_not_emit_decisions",
    "hrx_architecture_review_p09_foundation_does_not_open_final_approval_runtime",
  ]),
  required_no_leak_guards: HRX_CP897_REQUIREMENTS.required_no_leak_guards,
});

export const HRX_CP981_REQUIRED_SECTION_ROWS = deepFreeze({
  "RP30.P09.M00": [
    "ArchitectureReview HRX slice subphase 3",
    "ArchitectureReview HRX slice subphase 4",
    "ArchitectureReview HRX slice subphase 5",
  ],
  "RP30.P09.M01": [
    "SecurityReview HRX slice subphase 1",
    "SecurityReview HRX slice subphase 2",
    "SecurityReview HRX slice subphase 3",
    "SecurityReview HRX slice subphase 4",
    "SecurityReview HRX slice subphase 5",
  ],
  "RP30.P09.M02": [
    "BypassReview HRX slice subphase 1",
    "BypassReview HRX slice subphase 2",
  ],
});

export const HRX_CP981_REQUIREMENTS = deepFreeze({
  deliverable_counts: {
    claude_review: 10,
  },
  phase_counts: {
    "RP30.P09": 10,
  },
  micro_phase_row_counts: {
    "RP30.P09.M00": 3,
    "RP30.P09.M01": 5,
    "RP30.P09.M02": 2,
  },
  micro_title_row_counts: {
    "ArchitectureReview HRX slice": 3,
    "SecurityReview HRX slice": 5,
    "BypassReview HRX slice": 2,
  },
  required_section_rows: HRX_CP981_REQUIRED_SECTION_ROWS,
  mandatory_artifacts: HRX_CP897_REQUIREMENTS.mandatory_artifacts,
  required_capabilities: unique([
    ...HRX_CP980_REQUIREMENTS.required_capabilities,
    "hrx_architecture_review_p09_tail_descriptor",
    "hrx_security_review_p09_foundation_descriptor",
    "hrx_security_review_runtime_deferred_descriptor",
    "hrx_bypass_review_p09_foundation_descriptor",
    "hrx_bypass_review_runtime_deferred_descriptor",
  ]),
  safety_gates: unique([
    ...HRX_CP980_REQUIREMENTS.safety_gates,
    "hrx_architecture_review_p09_tail_does_not_open_runtime",
    "hrx_architecture_review_p09_tail_does_not_write_records",
    "hrx_architecture_review_p09_tail_does_not_use_real_review_data",
    "hrx_architecture_review_p09_tail_does_not_bypass_permissions",
    "hrx_architecture_review_p09_tail_does_not_execute_policy",
    "hrx_architecture_review_p09_tail_does_not_emit_decisions",
    "hrx_architecture_review_p09_tail_does_not_open_final_approval_runtime",
    "hrx_security_review_p09_foundation_does_not_open_runtime",
    "hrx_security_review_p09_foundation_does_not_write_records",
    "hrx_security_review_p09_foundation_does_not_use_real_review_data",
    "hrx_security_review_p09_foundation_does_not_bypass_permissions",
    "hrx_security_review_p09_foundation_does_not_execute_policy",
    "hrx_security_review_p09_foundation_does_not_emit_decisions",
    "hrx_security_review_p09_foundation_does_not_open_final_approval_runtime",
    "hrx_bypass_review_p09_foundation_does_not_open_runtime",
    "hrx_bypass_review_p09_foundation_does_not_write_records",
    "hrx_bypass_review_p09_foundation_does_not_use_real_review_data",
    "hrx_bypass_review_p09_foundation_does_not_bypass_permissions",
    "hrx_bypass_review_p09_foundation_does_not_execute_policy",
    "hrx_bypass_review_p09_foundation_does_not_emit_decisions",
    "hrx_bypass_review_p09_foundation_does_not_open_final_approval_runtime",
    "hrx_bypass_review_p09_foundation_does_not_open_override_runtime",
  ]),
  required_no_leak_guards: HRX_CP897_REQUIREMENTS.required_no_leak_guards,
});

export const HRX_CP982_REQUIRED_SECTION_ROWS = deepFreeze({
  "RP30.P09.M02": [
    "BypassReview HRX slice subphase 3",
    "BypassReview HRX slice subphase 4",
    "BypassReview HRX slice subphase 5",
  ],
  "RP30.P09.M03": [
    "MissingTests HRX slice subphase 1",
    "MissingTests HRX slice subphase 2",
    "MissingTests HRX slice subphase 3",
    "MissingTests HRX slice subphase 4",
    "MissingTests HRX slice subphase 5",
  ],
  "RP30.P09.M04": [
    "RiskRegister HRX slice subphase 1",
    "RiskRegister HRX slice subphase 2",
  ],
});

export const HRX_CP982_REQUIREMENTS = deepFreeze({
  deliverable_counts: {
    claude_review: 10,
  },
  phase_counts: {
    "RP30.P09": 10,
  },
  micro_phase_row_counts: {
    "RP30.P09.M02": 3,
    "RP30.P09.M03": 5,
    "RP30.P09.M04": 2,
  },
  micro_title_row_counts: {
    "BypassReview HRX slice": 3,
    "MissingTests HRX slice": 5,
    "RiskRegister HRX slice": 2,
  },
  required_section_rows: HRX_CP982_REQUIRED_SECTION_ROWS,
  mandatory_artifacts: HRX_CP897_REQUIREMENTS.mandatory_artifacts,
  required_capabilities: unique([
    ...HRX_CP981_REQUIREMENTS.required_capabilities,
    "hrx_bypass_review_p09_tail_descriptor",
    "hrx_missing_tests_p09_foundation_descriptor",
    "hrx_missing_tests_runtime_deferred_descriptor",
    "hrx_risk_register_p09_foundation_descriptor",
    "hrx_risk_register_runtime_deferred_descriptor",
  ]),
  safety_gates: unique([
    ...HRX_CP981_REQUIREMENTS.safety_gates,
    "hrx_bypass_review_p09_tail_does_not_open_runtime",
    "hrx_bypass_review_p09_tail_does_not_write_records",
    "hrx_bypass_review_p09_tail_does_not_use_real_review_data",
    "hrx_bypass_review_p09_tail_does_not_bypass_permissions",
    "hrx_bypass_review_p09_tail_does_not_execute_policy",
    "hrx_bypass_review_p09_tail_does_not_emit_decisions",
    "hrx_bypass_review_p09_tail_does_not_open_final_approval_runtime",
    "hrx_bypass_review_p09_tail_does_not_open_override_runtime",
    "hrx_missing_tests_p09_foundation_does_not_open_runtime",
    "hrx_missing_tests_p09_foundation_does_not_write_records",
    "hrx_missing_tests_p09_foundation_does_not_use_real_review_data",
    "hrx_missing_tests_p09_foundation_does_not_bypass_permissions",
    "hrx_missing_tests_p09_foundation_does_not_execute_policy",
    "hrx_missing_tests_p09_foundation_does_not_emit_decisions",
    "hrx_missing_tests_p09_foundation_does_not_open_final_approval_runtime",
    "hrx_missing_tests_p09_foundation_does_not_mark_tests_complete",
    "hrx_risk_register_p09_foundation_does_not_open_runtime",
    "hrx_risk_register_p09_foundation_does_not_write_records",
    "hrx_risk_register_p09_foundation_does_not_use_real_review_data",
    "hrx_risk_register_p09_foundation_does_not_bypass_permissions",
    "hrx_risk_register_p09_foundation_does_not_execute_policy",
    "hrx_risk_register_p09_foundation_does_not_emit_decisions",
    "hrx_risk_register_p09_foundation_does_not_open_final_approval_runtime",
    "hrx_risk_register_p09_foundation_does_not_register_real_risks",
  ]),
  required_no_leak_guards: HRX_CP897_REQUIREMENTS.required_no_leak_guards,
});

export const HRX_CP983_REQUIRED_SECTION_ROWS = deepFreeze({
  "RP30.P09.M04": [
    "RiskRegister HRX slice subphase 3",
    "RiskRegister HRX slice subphase 4",
    "RiskRegister HRX slice subphase 5",
  ],
  "RP30.P09.M05": [
    "HumanSummary HRX slice subphase 1",
    "HumanSummary HRX slice subphase 2",
    "HumanSummary HRX slice subphase 3",
    "HumanSummary HRX slice subphase 4",
    "HumanSummary HRX slice subphase 5",
    "HumanSummary HRX slice subphase 6",
    "HumanSummary HRX slice subphase 7",
  ],
});

export const HRX_CP983_REQUIREMENTS = deepFreeze({
  deliverable_counts: {
    claude_review: 3,
    security_audit: 7,
  },
  phase_counts: {
    "RP30.P09": 10,
  },
  micro_phase_row_counts: {
    "RP30.P09.M04": 3,
    "RP30.P09.M05": 7,
  },
  micro_title_row_counts: {
    "RiskRegister HRX slice": 3,
    "HumanSummary HRX slice": 7,
  },
  required_section_rows: HRX_CP983_REQUIRED_SECTION_ROWS,
  mandatory_artifacts: HRX_CP897_REQUIREMENTS.mandatory_artifacts,
  required_capabilities: unique([
    ...HRX_CP982_REQUIREMENTS.required_capabilities,
    "hrx_risk_register_p09_tail_descriptor",
    "hrx_human_summary_p09_foundation_descriptor",
    "hrx_human_summary_runtime_deferred_descriptor",
    "hrx_human_summary_text_generation_deferred_descriptor",
  ]),
  safety_gates: unique([
    ...HRX_CP982_REQUIREMENTS.safety_gates,
    "hrx_risk_register_p09_tail_does_not_open_runtime",
    "hrx_risk_register_p09_tail_does_not_write_records",
    "hrx_risk_register_p09_tail_does_not_use_real_review_data",
    "hrx_risk_register_p09_tail_does_not_bypass_permissions",
    "hrx_risk_register_p09_tail_does_not_execute_policy",
    "hrx_risk_register_p09_tail_does_not_emit_decisions",
    "hrx_risk_register_p09_tail_does_not_open_final_approval_runtime",
    "hrx_risk_register_p09_tail_does_not_register_real_risks",
    "hrx_human_summary_p09_foundation_does_not_open_runtime",
    "hrx_human_summary_p09_foundation_does_not_write_records",
    "hrx_human_summary_p09_foundation_does_not_use_real_review_data",
    "hrx_human_summary_p09_foundation_does_not_bypass_permissions",
    "hrx_human_summary_p09_foundation_does_not_execute_policy",
    "hrx_human_summary_p09_foundation_does_not_emit_decisions",
    "hrx_human_summary_p09_foundation_does_not_open_final_approval_runtime",
    "hrx_human_summary_p09_foundation_does_not_generate_summary_text",
  ]),
  required_no_leak_guards: HRX_CP897_REQUIREMENTS.required_no_leak_guards,
});

export const HRX_CP984_REQUIRED_SECTION_ROWS = deepFreeze({
  "RP30.P09.M05": [
    "HumanSummary HRX slice subphase 8",
  ],
  "RP30.P09.M06": [
    "ArchitectureReview HRX slice subphase 1",
    "ArchitectureReview HRX slice subphase 2",
    "ArchitectureReview HRX slice subphase 3",
    "ArchitectureReview HRX slice subphase 4",
    "ArchitectureReview HRX slice subphase 5",
  ],
  "RP30.P09.M07": [
    "SecurityReview HRX slice subphase 1",
    "SecurityReview HRX slice subphase 2",
    "SecurityReview HRX slice subphase 3",
    "SecurityReview HRX slice subphase 4",
  ],
});

export const HRX_CP984_REQUIREMENTS = deepFreeze({
  deliverable_counts: {
    security_audit: 1,
    claude_review: 9,
  },
  phase_counts: {
    "RP30.P09": 10,
  },
  micro_phase_row_counts: {
    "RP30.P09.M05": 1,
    "RP30.P09.M06": 5,
    "RP30.P09.M07": 4,
  },
  micro_title_row_counts: {
    "HumanSummary HRX slice": 1,
    "ArchitectureReview HRX slice": 5,
    "SecurityReview HRX slice": 4,
  },
  required_section_rows: HRX_CP984_REQUIRED_SECTION_ROWS,
  mandatory_artifacts: HRX_CP897_REQUIREMENTS.mandatory_artifacts,
  required_capabilities: unique([
    ...HRX_CP983_REQUIREMENTS.required_capabilities,
    "hrx_human_summary_p09_tail_descriptor",
    "hrx_architecture_review_p09_foundation_descriptor",
    "hrx_architecture_review_runtime_deferred_descriptor",
    "hrx_security_review_p09_foundation_descriptor",
    "hrx_security_review_runtime_deferred_descriptor",
  ]),
  safety_gates: unique([
    ...HRX_CP983_REQUIREMENTS.safety_gates,
    "hrx_human_summary_p09_tail_does_not_open_runtime",
    "hrx_human_summary_p09_tail_does_not_write_records",
    "hrx_human_summary_p09_tail_does_not_use_real_review_data",
    "hrx_human_summary_p09_tail_does_not_bypass_permissions",
    "hrx_human_summary_p09_tail_does_not_execute_policy",
    "hrx_human_summary_p09_tail_does_not_emit_decisions",
    "hrx_human_summary_p09_tail_does_not_open_final_approval_runtime",
    "hrx_human_summary_p09_tail_does_not_generate_summary_text",
    "hrx_architecture_review_p09_foundation_does_not_open_runtime",
    "hrx_architecture_review_p09_foundation_does_not_write_records",
    "hrx_architecture_review_p09_foundation_does_not_use_real_review_data",
    "hrx_architecture_review_p09_foundation_does_not_bypass_permissions",
    "hrx_architecture_review_p09_foundation_does_not_execute_policy",
    "hrx_architecture_review_p09_foundation_does_not_emit_decisions",
    "hrx_architecture_review_p09_foundation_does_not_open_final_approval_runtime",
    "hrx_security_review_p09_foundation_does_not_open_runtime",
    "hrx_security_review_p09_foundation_does_not_write_records",
    "hrx_security_review_p09_foundation_does_not_use_real_review_data",
    "hrx_security_review_p09_foundation_does_not_bypass_permissions",
    "hrx_security_review_p09_foundation_does_not_execute_policy",
    "hrx_security_review_p09_foundation_does_not_emit_decisions",
    "hrx_security_review_p09_foundation_does_not_open_final_approval_runtime",
  ]),
  required_no_leak_guards: HRX_CP897_REQUIREMENTS.required_no_leak_guards,
});

export const HRX_CP985_REQUIRED_SECTION_ROWS = deepFreeze({
  "RP30.P09.M07": [
    "SecurityReview HRX slice subphase 5",
  ],
  "RP30.P09.M08": [
    "BypassReview HRX slice subphase 1",
    "BypassReview HRX slice subphase 2",
    "BypassReview HRX slice subphase 3",
    "BypassReview HRX slice subphase 4",
    "BypassReview HRX slice subphase 5",
  ],
  "RP30.P09.M09": [
    "MissingTests HRX slice subphase 1",
    "MissingTests HRX slice subphase 2",
    "MissingTests HRX slice subphase 3",
    "MissingTests HRX slice subphase 4",
  ],
});

export const HRX_CP985_REQUIREMENTS = deepFreeze({
  deliverable_counts: {
    claude_review: 10,
  },
  phase_counts: {
    "RP30.P09": 10,
  },
  micro_phase_row_counts: {
    "RP30.P09.M07": 1,
    "RP30.P09.M08": 5,
    "RP30.P09.M09": 4,
  },
  micro_title_row_counts: {
    "SecurityReview HRX slice": 1,
    "BypassReview HRX slice": 5,
    "MissingTests HRX slice": 4,
  },
  required_section_rows: HRX_CP985_REQUIRED_SECTION_ROWS,
  mandatory_artifacts: HRX_CP897_REQUIREMENTS.mandatory_artifacts,
  required_capabilities: unique([
    ...HRX_CP984_REQUIREMENTS.required_capabilities,
    "hrx_security_review_p09_tail_descriptor",
    "hrx_bypass_review_p09_foundation_descriptor",
    "hrx_bypass_review_runtime_deferred_descriptor",
    "hrx_bypass_review_override_deferred_descriptor",
    "hrx_missing_tests_p09_foundation_descriptor",
    "hrx_missing_tests_runtime_deferred_descriptor",
  ]),
  safety_gates: unique([
    ...HRX_CP984_REQUIREMENTS.safety_gates,
    "hrx_security_review_p09_tail_does_not_open_runtime",
    "hrx_security_review_p09_tail_does_not_write_records",
    "hrx_security_review_p09_tail_does_not_use_real_review_data",
    "hrx_security_review_p09_tail_does_not_bypass_permissions",
    "hrx_security_review_p09_tail_does_not_execute_policy",
    "hrx_security_review_p09_tail_does_not_emit_decisions",
    "hrx_security_review_p09_tail_does_not_open_final_approval_runtime",
    "hrx_bypass_review_p09_foundation_does_not_open_runtime",
    "hrx_bypass_review_p09_foundation_does_not_write_records",
    "hrx_bypass_review_p09_foundation_does_not_use_real_review_data",
    "hrx_bypass_review_p09_foundation_does_not_bypass_permissions",
    "hrx_bypass_review_p09_foundation_does_not_execute_policy",
    "hrx_bypass_review_p09_foundation_does_not_emit_decisions",
    "hrx_bypass_review_p09_foundation_does_not_open_final_approval_runtime",
    "hrx_bypass_review_p09_foundation_does_not_open_override_runtime",
    "hrx_missing_tests_p09_foundation_does_not_open_runtime",
    "hrx_missing_tests_p09_foundation_does_not_write_records",
    "hrx_missing_tests_p09_foundation_does_not_use_real_review_data",
    "hrx_missing_tests_p09_foundation_does_not_bypass_permissions",
    "hrx_missing_tests_p09_foundation_does_not_execute_policy",
    "hrx_missing_tests_p09_foundation_does_not_emit_decisions",
    "hrx_missing_tests_p09_foundation_does_not_open_final_approval_runtime",
    "hrx_missing_tests_p09_foundation_does_not_mark_tests_complete",
  ]),
  required_no_leak_guards: HRX_CP897_REQUIREMENTS.required_no_leak_guards,
});

export const HRX_CP986_REQUIRED_SECTION_ROWS = deepFreeze({
  "RP30.P09.M09": [
    "MissingTests HRX slice subphase 5",
  ],
  "RP30.P09.M10": [
    "RiskRegister HRX slice subphase 1",
    "RiskRegister HRX slice subphase 2",
    "RiskRegister HRX slice subphase 3",
    "RiskRegister HRX slice subphase 4",
    "RiskRegister HRX slice subphase 5",
    "RiskRegister HRX slice subphase 6",
    "RiskRegister HRX slice subphase 7",
    "RiskRegister HRX slice subphase 8",
    "RiskRegister HRX slice subphase 9",
  ],
});

export const HRX_CP986_REQUIREMENTS = deepFreeze({
  deliverable_counts: {
    claude_review: 10,
  },
  phase_counts: {
    "RP30.P09": 10,
  },
  micro_phase_row_counts: {
    "RP30.P09.M09": 1,
    "RP30.P09.M10": 9,
  },
  micro_title_row_counts: {
    "MissingTests HRX slice": 1,
    "RiskRegister HRX slice": 9,
  },
  required_section_rows: HRX_CP986_REQUIRED_SECTION_ROWS,
  mandatory_artifacts: HRX_CP897_REQUIREMENTS.mandatory_artifacts,
  required_capabilities: unique([
    ...HRX_CP985_REQUIREMENTS.required_capabilities,
    "hrx_missing_tests_p09_tail_descriptor",
    "hrx_risk_register_p09_foundation_descriptor",
    "hrx_risk_register_runtime_deferred_descriptor",
    "hrx_risk_register_real_risk_registration_deferred_descriptor",
  ]),
  safety_gates: unique([
    ...HRX_CP985_REQUIREMENTS.safety_gates,
    "hrx_missing_tests_p09_tail_does_not_open_runtime",
    "hrx_missing_tests_p09_tail_does_not_write_records",
    "hrx_missing_tests_p09_tail_does_not_use_real_review_data",
    "hrx_missing_tests_p09_tail_does_not_bypass_permissions",
    "hrx_missing_tests_p09_tail_does_not_execute_policy",
    "hrx_missing_tests_p09_tail_does_not_emit_decisions",
    "hrx_missing_tests_p09_tail_does_not_open_final_approval_runtime",
    "hrx_missing_tests_p09_tail_does_not_mark_tests_complete",
    "hrx_risk_register_p09_foundation_does_not_open_runtime",
    "hrx_risk_register_p09_foundation_does_not_write_records",
    "hrx_risk_register_p09_foundation_does_not_use_real_review_data",
    "hrx_risk_register_p09_foundation_does_not_bypass_permissions",
    "hrx_risk_register_p09_foundation_does_not_execute_policy",
    "hrx_risk_register_p09_foundation_does_not_emit_decisions",
    "hrx_risk_register_p09_foundation_does_not_open_final_approval_runtime",
    "hrx_risk_register_p09_foundation_does_not_register_real_risks",
  ]),
  required_no_leak_guards: HRX_CP897_REQUIREMENTS.required_no_leak_guards,
});

export const HRX_CP987_REQUIRED_SECTION_ROWS = deepFreeze({
  "RP30.P09.M10": [
    "RiskRegister HRX slice subphase 10",
  ],
});

export const HRX_CP987_REQUIREMENTS = deepFreeze({
  deliverable_counts: {
    claude_review: 1,
  },
  phase_counts: {
    "RP30.P09": 1,
  },
  micro_phase_row_counts: {
    "RP30.P09.M10": 1,
  },
  micro_title_row_counts: {
    "RiskRegister HRX slice": 1,
  },
  required_section_rows: HRX_CP987_REQUIRED_SECTION_ROWS,
  mandatory_artifacts: HRX_CP897_REQUIREMENTS.mandatory_artifacts,
  required_capabilities: unique([
    ...HRX_CP986_REQUIREMENTS.required_capabilities,
    "hrx_risk_register_p09_final_tail_descriptor",
    "hrx_closeout_queue_completion_descriptor",
  ]),
  safety_gates: unique([
    ...HRX_CP986_REQUIREMENTS.safety_gates,
    "hrx_risk_register_p09_final_tail_does_not_open_runtime",
    "hrx_risk_register_p09_final_tail_does_not_write_records",
    "hrx_risk_register_p09_final_tail_does_not_use_real_review_data",
    "hrx_risk_register_p09_final_tail_does_not_bypass_permissions",
    "hrx_risk_register_p09_final_tail_does_not_execute_policy",
    "hrx_risk_register_p09_final_tail_does_not_emit_decisions",
    "hrx_risk_register_p09_final_tail_does_not_open_final_approval_runtime",
    "hrx_risk_register_p09_final_tail_does_not_register_real_risks",
  ]),
  required_no_leak_guards: HRX_CP897_REQUIREMENTS.required_no_leak_guards,
});

export const HRX_BLOCKED_CLAIMS = deepFreeze([
  "separate_hrx_product",
  "payroll_runtime_open",
  "hr_ai_final_judgment",
  "real_employee_data_used",
  "real_candidate_data_used",
  "permission_write",
  "audit_write",
  "enterprise_trust_from_local_validation",
]);

function createHrxBaselineRows(microId, titles) {
  const rows = {};
  for (const title of titles) {
    const key = hrxRowKey(title);
    rows[key] = deepFreeze({
      micro_phase_id: microId,
      title,
      descriptor_only: true,
      hrx_embedded: true,
      separate_product_created: false,
      runtime_execution: false,
      payroll_calculation_runtime_executed: false,
      hr_ai_final_judgment_executed: false,
      permission_decision_written: false,
      audit_event_written: false,
      product_state_written: false,
      runtime_receipt_emitted: false,
      real_employee_data_included: false,
      real_candidate_data_included: false,
      real_payroll_data_included: false,
      credential_or_secret_included: false,
      user_employee_separation_preserved: true,
      employee_user_reverse_link_only: true,
      sensitive_hr_guard_required: true,
      h30_review_only: true,
      c30_read_only: true,
      human_final_approval_required: true,
      scope_descriptor: key.includes("scope"),
      admission_descriptor: key.includes("admission"),
      non_goal_descriptor: key.includes("non_goal"),
      decision_descriptor: key.includes("decision"),
      review_descriptor: key.includes("review"),
      closeout_descriptor: key.includes("closeout"),
    });
  }
  return deepFreeze(rows);
}

function createHrxDomainRows(microId, titles) {
  const rows = {};
  for (const title of titles) {
    const key = hrxRowKey(title);
    const isEmployee = key.startsWith("employee_hrx_slice");
    const isEmploymentProfile = key.startsWith("employmentprofile_hrx_slice");
    const isHrDocument = key.startsWith("hrdocument_hrx_slice");
    const isEmploymentContract = key.startsWith("employmentcontract_hrx_slice");
    const isCompensationRecord = key.startsWith("compensationrecord_hrx_slice");
    const isPeopleGraph = key.startsWith("peoplegraph_hrx_slice");
    const isRuleEngine = key.startsWith("ruleengine_hrx_slice");
    const isLeaveWorkflow = key.startsWith("leaveworkflow_hrx_slice");
    const isAttendanceWorkflow = key.startsWith("attendanceworkflow_hrx_slice");
    const isRecruitmentWorkflow = key.startsWith("recruitmentworkflow_hrx_slice");
    const isRiskWorkflow = key.startsWith("riskworkflow_hrx_slice");
    const isApprovalWorkflow = key.startsWith("approvalworkflow_hrx_slice");
    const isHrApi = key.startsWith("hrapi_hrx_slice");
    const isEmployeeApi = key.startsWith("employeeapi_hrx_slice");
    const isLeaveApi = key.startsWith("leaveapi_hrx_slice");
    const isCandidateApi = key.startsWith("candidateapi_hrx_slice");
    const isEvidenceApi = key.startsWith("evidenceapi_hrx_slice");
    const isErrorModel = key.startsWith("errormodel_hrx_slice");
    const isHrOperations = key.startsWith("hroperations_hrx_slice");
    const isEmployeePortal = key.startsWith("employeeportal_hrx_slice");
    const isCandidatePortal = key.startsWith("candidateportal_hrx_slice");
    const isAiReviewQueue = key.startsWith("aireviewqueue_hrx_slice");
    const isAdminPolicy = key.startsWith("adminpolicy_hrx_slice");
    const isDeniedState = key.startsWith("deniedstate_hrx_slice");
    const isSyntheticTenant = key.startsWith("synthetictenant_hrx_slice");
    const isEmployeeFixture = key.startsWith("employeefixture_hrx_slice");
    const isCandidateFixture = key.startsWith("candidatefixture_hrx_slice");
    const isLeaveFixture = key.startsWith("leavefixture_hrx_slice");
    const isRiskFixture = key.startsWith("riskfixture_hrx_slice");
    const isAuditFixture = key.startsWith("auditfixture_hrx_slice");
    const isHrPermission = key.startsWith("hrpermission_hrx_slice");
    const isSensitiveGuard = key.startsWith("sensitiveguard_hrx_slice");
    const isPayrollRestriction = key.startsWith("payrollrestriction_hrx_slice");
    const isEvaluationRestriction = key.startsWith("evaluationrestriction_hrx_slice");
    const isCandidatePrivacy = key.startsWith("candidateprivacy_hrx_slice");
    const isMissingUserLink = key.startsWith("missinguserlink_hrx_slice");
    const isPayrollRuntimeAttempt = key.startsWith("payrollruntimeattempt_hrx_slice");
    const isAiScoringAttempt = key.startsWith("aiscoringattempt_hrx_slice");
    const isCrossTenantAccess = key.startsWith("crosstenantaccess_hrx_slice");
    const isStorageDecisionGap = key.startsWith("storagedecisiongap_hrx_slice");
    const isH30CommandMatrix = key.startsWith("h30commandmatrix_hrx_slice");
    const isEvidenceTemplate = key.startsWith("evidencetemplate_hrx_slice");
    const isNoRealData = key.startsWith("norealdata_hrx_slice");
    const isBlockedClaims = key.startsWith("blockedclaims_hrx_slice");
    const isClaudeDependency = key.startsWith("claudedependency_hrx_slice");
    const isHumanApproval = key.startsWith("humanapproval_hrx_slice");
    const isArchitectureReview = key.startsWith("architecturereview_hrx_slice");
    const isSecurityReview = key.startsWith("securityreview_hrx_slice");
    const isBypassReview = key.startsWith("bypassreview_hrx_slice");
    const isMissingTests = key.startsWith("missingtests_hrx_slice");
    const isRiskRegister = key.startsWith("riskregister_hrx_slice");
    const isHumanSummary = key.startsWith("humansummary_hrx_slice");
    const isRecovery = key.startsWith("recovery_hrx_slice");
    const isAuditHint = key.startsWith("audithint_hrx_slice");
    rows[key] = deepFreeze({
      micro_phase_id: microId,
      title,
      descriptor_only: true,
      hrx_embedded: true,
      separate_product_created: false,
      runtime_execution: false,
      payroll_calculation_runtime_executed: false,
      hr_ai_final_judgment_executed: false,
      permission_decision_written: false,
      audit_event_written: false,
      product_state_written: false,
      runtime_receipt_emitted: false,
      real_employee_data_included: false,
      real_candidate_data_included: false,
      real_payroll_data_included: false,
      credential_or_secret_included: false,
      user_employee_separation_preserved: true,
      employee_user_reverse_link_only: true,
      user_account_conflated: false,
      employment_profile_references_employee: isEmploymentProfile,
      employment_profile_references_user_account: false,
      hr_document_references_employment_profile: isHrDocument,
      employment_contract_references_employment_profile: isEmploymentContract,
      document_body_included: false,
      contract_text_included: false,
      document_storage_runtime_opened: false,
      contract_execution_runtime_opened: false,
      signature_runtime_opened: false,
      document_authority_finalized: false,
      compensation_record_descriptor: isCompensationRecord,
      compensation_amount_included: false,
      compensation_currency_included: false,
      compensation_payroll_runtime_opened: false,
      people_graph_descriptor: isPeopleGraph,
      people_graph_permission_edges_included: false,
      people_graph_runtime_opened: false,
      people_graph_security_audit_descriptor: isPeopleGraph,
      rule_engine_descriptor: isRuleEngine,
      rule_definition_included: false,
      rule_execution_runtime_opened: false,
      rule_decision_written: false,
      rule_final_judgment_allowed: false,
      leave_workflow_descriptor: isLeaveWorkflow,
      leave_request_payload_included: false,
      leave_workflow_runtime_opened: false,
      leave_approval_decision_written: false,
      leave_policy_rule_execution_opened: false,
      attendance_workflow_descriptor: isAttendanceWorkflow,
      attendance_event_payload_included: false,
      attendance_workflow_runtime_opened: false,
      attendance_decision_written: false,
      attendance_policy_rule_execution_opened: false,
      attendance_record_write_opened: false,
      recruitment_workflow_descriptor: isRecruitmentWorkflow,
      recruitment_candidate_payload_included: false,
      recruitment_workflow_runtime_opened: false,
      recruitment_decision_written: false,
      recruitment_policy_rule_execution_opened: false,
      recruitment_record_write_opened: false,
      recruitment_offer_created: false,
      risk_workflow_descriptor: isRiskWorkflow,
      risk_event_payload_included: false,
      risk_workflow_runtime_opened: false,
      risk_decision_written: false,
      risk_policy_rule_execution_opened: false,
      risk_record_write_opened: false,
      risk_score_calculated: false,
      approval_workflow_descriptor: isApprovalWorkflow,
      approval_request_payload_included: false,
      approval_workflow_runtime_opened: false,
      approval_decision_written: false,
      approval_policy_rule_execution_opened: false,
      approval_record_write_opened: false,
      approval_delegation_runtime_opened: false,
      hr_api_descriptor: isHrApi,
      hr_api_request_payload_included: false,
      hr_api_response_payload_included: false,
      hr_api_runtime_opened: false,
      hr_api_record_write_opened: false,
      employee_api_descriptor: isEmployeeApi,
      employee_api_request_payload_included: false,
      employee_api_response_payload_included: false,
      employee_api_runtime_opened: false,
      employee_api_record_write_opened: false,
      leave_api_descriptor: isLeaveApi,
      leave_api_request_payload_included: false,
      leave_api_response_payload_included: false,
      leave_api_runtime_opened: false,
      leave_api_record_write_opened: false,
      candidate_api_descriptor: isCandidateApi,
      candidate_api_request_payload_included: false,
      candidate_api_response_payload_included: false,
      candidate_api_runtime_opened: false,
      candidate_api_record_write_opened: false,
      evidence_api_descriptor: isEvidenceApi,
      evidence_api_request_payload_included: false,
      evidence_api_response_payload_included: false,
      evidence_api_runtime_opened: false,
      evidence_api_record_write_opened: false,
      error_model_descriptor: isErrorModel,
      error_code_payload_included: false,
      error_response_payload_included: false,
      error_model_runtime_opened: false,
      error_model_record_write_opened: false,
      error_policy_rule_execution_opened: false,
      hr_operations_descriptor: isHrOperations,
      hr_operations_runtime_opened: false,
      hr_operations_record_write_opened: false,
      hr_operations_policy_execution_opened: false,
      hr_operations_finalization_allowed: false,
      employee_portal_descriptor: isEmployeePortal,
      employee_portal_runtime_opened: false,
      employee_portal_record_write_opened: false,
      employee_portal_self_service_action_executed: false,
      employee_portal_permission_bypass_allowed: false,
      candidate_portal_descriptor: isCandidatePortal,
      candidate_portal_runtime_opened: false,
      candidate_portal_record_write_opened: false,
      candidate_portal_self_service_action_executed: false,
      candidate_portal_permission_bypass_allowed: false,
      ai_review_queue_descriptor: isAiReviewQueue,
      ai_review_queue_runtime_opened: false,
      ai_review_queue_record_write_opened: false,
      ai_review_queue_review_action_executed: false,
      ai_review_queue_final_judgment_allowed: false,
      admin_policy_descriptor: isAdminPolicy,
      admin_policy_runtime_opened: false,
      admin_policy_record_write_opened: false,
      admin_policy_rule_execution_opened: false,
      admin_policy_finalization_allowed: false,
      denied_state_descriptor: isDeniedState,
      denied_state_security_audit_descriptor: isDeniedState,
      denied_state_runtime_opened: false,
      denied_state_record_write_opened: false,
      denied_state_access_granted: false,
      denied_state_policy_bypass_allowed: false,
      synthetic_tenant_descriptor: isSyntheticTenant,
      synthetic_tenant_runtime_opened: false,
      synthetic_tenant_record_write_opened: false,
      synthetic_tenant_real_data_allowed: false,
      synthetic_tenant_permission_bypass_allowed: false,
      synthetic_tenant_fixture_runtime_opened: false,
      employee_fixture_descriptor: isEmployeeFixture,
      employee_fixture_runtime_opened: false,
      employee_fixture_record_write_opened: false,
      employee_fixture_real_data_allowed: false,
      employee_fixture_permission_bypass_allowed: false,
      employee_fixture_identity_link_runtime_opened: false,
      candidate_fixture_descriptor: isCandidateFixture,
      candidate_fixture_runtime_opened: false,
      candidate_fixture_record_write_opened: false,
      candidate_fixture_real_data_allowed: false,
      candidate_fixture_permission_bypass_allowed: false,
      candidate_fixture_identity_link_runtime_opened: false,
      leave_fixture_descriptor: isLeaveFixture,
      leave_fixture_runtime_opened: false,
      leave_fixture_record_write_opened: false,
      leave_fixture_real_data_allowed: false,
      leave_fixture_permission_bypass_allowed: false,
      leave_fixture_request_runtime_opened: false,
      risk_fixture_descriptor: isRiskFixture,
      risk_fixture_runtime_opened: false,
      risk_fixture_record_write_opened: false,
      risk_fixture_real_data_allowed: false,
      risk_fixture_score_calculated: false,
      risk_fixture_permission_bypass_allowed: false,
      audit_fixture_descriptor: isAuditFixture,
      audit_fixture_security_audit_descriptor: isAuditFixture,
      audit_fixture_runtime_opened: false,
      audit_fixture_record_write_opened: false,
      audit_fixture_real_data_allowed: false,
      audit_fixture_runtime_receipt_emitted: false,
      hr_permission_descriptor: isHrPermission,
      hr_permission_runtime_opened: false,
      hr_permission_record_write_opened: false,
      hr_permission_real_data_allowed: false,
      hr_permission_bypass_allowed: false,
      hr_permission_policy_runtime_opened: false,
      hr_permission_decision_emitted: false,
      sensitive_guard_descriptor: isSensitiveGuard,
      sensitive_guard_runtime_opened: false,
      sensitive_guard_record_write_opened: false,
      sensitive_guard_real_data_allowed: false,
      sensitive_guard_bypass_allowed: false,
      sensitive_guard_policy_runtime_opened: false,
      sensitive_guard_decision_emitted: false,
      payroll_restriction_descriptor: isPayrollRestriction,
      payroll_restriction_runtime_opened: false,
      payroll_restriction_record_write_opened: false,
      payroll_restriction_real_data_allowed: false,
      payroll_restriction_bypass_allowed: false,
      payroll_restriction_policy_runtime_opened: false,
      payroll_restriction_decision_emitted: false,
      payroll_restriction_calculation_runtime_opened: false,
      evaluation_restriction_descriptor: isEvaluationRestriction,
      evaluation_restriction_runtime_opened: false,
      evaluation_restriction_record_write_opened: false,
      evaluation_restriction_real_data_allowed: false,
      evaluation_restriction_bypass_allowed: false,
      evaluation_restriction_policy_runtime_opened: false,
      evaluation_restriction_decision_emitted: false,
      evaluation_restriction_score_runtime_opened: false,
      candidate_privacy_descriptor: isCandidatePrivacy,
      candidate_privacy_runtime_opened: false,
      candidate_privacy_record_write_opened: false,
      candidate_privacy_real_data_allowed: false,
      candidate_privacy_bypass_allowed: false,
      candidate_privacy_policy_runtime_opened: false,
      candidate_privacy_decision_emitted: false,
      candidate_privacy_masking_runtime_opened: false,
      missing_user_link_descriptor: isMissingUserLink,
      missing_user_link_runtime_opened: false,
      missing_user_link_record_write_opened: false,
      missing_user_link_real_data_allowed: false,
      missing_user_link_bypass_allowed: false,
      missing_user_link_policy_runtime_opened: false,
      missing_user_link_decision_emitted: false,
      missing_user_link_user_employee_link_runtime_opened: false,
      payroll_runtime_attempt_descriptor: isPayrollRuntimeAttempt,
      payroll_runtime_attempt_runtime_opened: false,
      payroll_runtime_attempt_record_write_opened: false,
      payroll_runtime_attempt_real_data_allowed: false,
      payroll_runtime_attempt_bypass_allowed: false,
      payroll_runtime_attempt_policy_runtime_opened: false,
      payroll_runtime_attempt_decision_emitted: false,
      payroll_runtime_attempt_calculation_runtime_opened: false,
      ai_scoring_attempt_descriptor: isAiScoringAttempt,
      ai_scoring_attempt_runtime_opened: false,
      ai_scoring_attempt_record_write_opened: false,
      ai_scoring_attempt_real_data_allowed: false,
      ai_scoring_attempt_bypass_allowed: false,
      ai_scoring_attempt_policy_runtime_opened: false,
      ai_scoring_attempt_decision_emitted: false,
      ai_scoring_attempt_score_runtime_opened: false,
      ai_scoring_attempt_final_judgment_allowed: false,
      cross_tenant_access_descriptor: isCrossTenantAccess,
      cross_tenant_access_runtime_opened: false,
      cross_tenant_access_record_write_opened: false,
      cross_tenant_access_real_data_allowed: false,
      cross_tenant_access_bypass_allowed: false,
      cross_tenant_access_policy_runtime_opened: false,
      cross_tenant_access_decision_emitted: false,
      cross_tenant_access_cross_tenant_runtime_opened: false,
      cross_tenant_access_tenant_boundary_bypass_allowed: false,
      storage_decision_gap_descriptor: isStorageDecisionGap,
      storage_decision_gap_runtime_opened: false,
      storage_decision_gap_record_write_opened: false,
      storage_decision_gap_real_data_allowed: false,
      storage_decision_gap_bypass_allowed: false,
      storage_decision_gap_policy_runtime_opened: false,
      storage_decision_gap_decision_emitted: false,
      storage_decision_gap_storage_runtime_opened: false,
      storage_decision_gap_gap_resolution_runtime_opened: false,
      h30_command_matrix_descriptor: isH30CommandMatrix,
      h30_command_matrix_runtime_opened: false,
      h30_command_matrix_record_write_opened: false,
      h30_command_matrix_real_data_allowed: false,
      h30_command_matrix_bypass_allowed: false,
      h30_command_matrix_policy_runtime_opened: false,
      h30_command_matrix_decision_emitted: false,
      h30_command_matrix_command_execution_runtime_opened: false,
      evidence_template_descriptor: isEvidenceTemplate,
      evidence_template_runtime_opened: false,
      evidence_template_record_write_opened: false,
      evidence_template_real_data_allowed: false,
      evidence_template_bypass_allowed: false,
      evidence_template_policy_runtime_opened: false,
      evidence_template_decision_emitted: false,
      evidence_template_render_runtime_opened: false,
      no_real_data_descriptor: isNoRealData,
      no_real_data_runtime_opened: false,
      no_real_data_record_write_opened: false,
      no_real_data_real_data_allowed: false,
      no_real_data_bypass_allowed: false,
      no_real_data_policy_runtime_opened: false,
      no_real_data_decision_emitted: false,
      no_real_data_enforcement_runtime_opened: false,
      blocked_claims_descriptor: isBlockedClaims,
      blocked_claims_runtime_opened: false,
      blocked_claims_record_write_opened: false,
      blocked_claims_real_data_allowed: false,
      blocked_claims_bypass_allowed: false,
      blocked_claims_policy_runtime_opened: false,
      blocked_claims_decision_emitted: false,
      blocked_claims_claim_override_runtime_opened: false,
      claude_dependency_descriptor: isClaudeDependency,
      claude_dependency_runtime_opened: false,
      claude_dependency_record_write_opened: false,
      claude_dependency_real_data_allowed: false,
      claude_dependency_bypass_allowed: false,
      claude_dependency_policy_runtime_opened: false,
      claude_dependency_decision_emitted: false,
      claude_dependency_review_runtime_opened: false,
      human_approval_descriptor: isHumanApproval,
      human_approval_runtime_opened: false,
      human_approval_record_write_opened: false,
      human_approval_real_data_allowed: false,
      human_approval_bypass_allowed: false,
      human_approval_policy_runtime_opened: false,
      human_approval_decision_emitted: false,
      human_approval_final_approval_runtime_opened: false,
      architecture_review_descriptor: isArchitectureReview,
      architecture_review_runtime_opened: false,
      architecture_review_record_write_opened: false,
      architecture_review_real_data_allowed: false,
      architecture_review_bypass_allowed: false,
      architecture_review_policy_runtime_opened: false,
      architecture_review_decision_emitted: false,
      architecture_review_final_approval_runtime_opened: false,
      security_review_descriptor: isSecurityReview,
      security_review_runtime_opened: false,
      security_review_record_write_opened: false,
      security_review_real_data_allowed: false,
      security_review_bypass_allowed: false,
      security_review_policy_runtime_opened: false,
      security_review_decision_emitted: false,
      security_review_final_approval_runtime_opened: false,
      bypass_review_descriptor: isBypassReview,
      bypass_review_runtime_opened: false,
      bypass_review_record_write_opened: false,
      bypass_review_real_data_allowed: false,
      bypass_review_bypass_allowed: false,
      bypass_review_policy_runtime_opened: false,
      bypass_review_decision_emitted: false,
      bypass_review_final_approval_runtime_opened: false,
      bypass_review_override_runtime_opened: false,
      missing_tests_descriptor: isMissingTests,
      missing_tests_runtime_opened: false,
      missing_tests_record_write_opened: false,
      missing_tests_real_data_allowed: false,
      missing_tests_bypass_allowed: false,
      missing_tests_policy_runtime_opened: false,
      missing_tests_decision_emitted: false,
      missing_tests_final_approval_runtime_opened: false,
      missing_tests_test_completion_marked: false,
      risk_register_descriptor: isRiskRegister,
      risk_register_runtime_opened: false,
      risk_register_record_write_opened: false,
      risk_register_real_data_allowed: false,
      risk_register_bypass_allowed: false,
      risk_register_policy_runtime_opened: false,
      risk_register_decision_emitted: false,
      risk_register_final_approval_runtime_opened: false,
      risk_register_real_risk_registered: false,
      human_summary_descriptor: isHumanSummary,
      human_summary_runtime_opened: false,
      human_summary_record_write_opened: false,
      human_summary_real_data_allowed: false,
      human_summary_bypass_allowed: false,
      human_summary_policy_runtime_opened: false,
      human_summary_decision_emitted: false,
      human_summary_final_approval_runtime_opened: false,
      human_summary_text_generated: false,
      recovery_descriptor: isRecovery,
      recovery_runtime_opened: false,
      recovery_record_write_opened: false,
      recovery_real_data_allowed: false,
      recovery_bypass_allowed: false,
      recovery_policy_runtime_opened: false,
      recovery_decision_emitted: false,
      recovery_replay_runtime_opened: false,
      recovery_auto_remediation_runtime_opened: false,
      audit_hint_descriptor: isAuditHint,
      audit_hint_security_audit_descriptor: isAuditHint,
      audit_hint_runtime_opened: false,
      audit_hint_record_write_opened: false,
      audit_hint_audit_event_write_opened: false,
      audit_hint_real_data_allowed: false,
      audit_hint_bypass_allowed: false,
      audit_hint_policy_runtime_opened: false,
      audit_hint_decision_emitted: false,
      audit_hint_runtime_receipt_emitted: false,
      sensitive_hr_guard_required: true,
      h30_review_only: true,
      c30_read_only: true,
      human_final_approval_required: true,
      domain_bridge_descriptor: true,
      decision_descriptor: key.includes("decision"),
      review_descriptor: key.includes("review"),
      employee_entity_descriptor: isEmployee,
      employment_profile_descriptor: isEmploymentProfile,
      hr_document_descriptor: isHrDocument,
      employment_contract_descriptor: isEmploymentContract,
      entity_name: isEmployee
        ? "Employee"
        : isEmploymentProfile
          ? "EmploymentProfile"
        : isHrDocument
          ? "HRDocument"
          : isEmploymentContract
            ? "EmploymentContract"
            : isCompensationRecord
              ? "CompensationRecord"
              : isPeopleGraph
                ? "PeopleGraph"
                : isRuleEngine
                  ? "RuleEngine"
                  : isLeaveWorkflow
                    ? "LeaveWorkflow"
                    : isAttendanceWorkflow
                      ? "AttendanceWorkflow"
                      : isRecruitmentWorkflow
                        ? "RecruitmentWorkflow"
                        : isRiskWorkflow
                          ? "RiskWorkflow"
                          : isApprovalWorkflow
                            ? "ApprovalWorkflow"
                            : isHrApi
                              ? "HRApi"
                              : isEmployeeApi
                                ? "EmployeeApi"
                                : isLeaveApi
                                  ? "LeaveApi"
                                  : isCandidateApi
                                    ? "CandidateApi"
                                    : isEvidenceApi
                                      ? "EvidenceApi"
                                      : isErrorModel
                                        ? "ErrorModel"
                                        : isHrOperations
                                          ? "HROperations"
                                        : isEmployeePortal
                                          ? "EmployeePortal"
                                          : isCandidatePortal
                                            ? "CandidatePortal"
                                            : isAiReviewQueue
                                              ? "AIReviewQueue"
                                              : isAdminPolicy
                                                ? "AdminPolicy"
                                                : isDeniedState
                                                  ? "DeniedState"
                                                  : isSyntheticTenant
                                                    ? "SyntheticTenant"
                                                    : isEmployeeFixture
                                                      ? "EmployeeFixture"
                                                      : isCandidateFixture
                                                        ? "CandidateFixture"
                                                        : isLeaveFixture
                                                          ? "LeaveFixture"
                                                          : isRiskFixture
                                                            ? "RiskFixture"
                                                            : isAuditFixture
                                                              ? "AuditFixture"
                                                              : isHrPermission
                                                                ? "HRPermission"
                                                                : isSensitiveGuard
                                                                  ? "SensitiveGuard"
                                                                  : isPayrollRestriction
                                                                    ? "PayrollRestriction"
                                                                    : isEvaluationRestriction
                                                                      ? "EvaluationRestriction"
                                                                      : isCandidatePrivacy
                                                                        ? "CandidatePrivacy"
                                                                        : isMissingUserLink
                                                                          ? "MissingUserLink"
                                                                          : isPayrollRuntimeAttempt
                                                                            ? "PayrollRuntimeAttempt"
                                                                            : isAiScoringAttempt
                                                                              ? "AIScoringAttempt"
                                                                              : isCrossTenantAccess
                                                                                ? "CrossTenantAccess"
                                                                                : isStorageDecisionGap
                                                                                  ? "StorageDecisionGap"
                                                                                  : isH30CommandMatrix
                                                                                    ? "H30CommandMatrix"
                                                                                    : isEvidenceTemplate
                                                                                      ? "EvidenceTemplate"
                                                                                      : isNoRealData
                                                                                        ? "NoRealData"
                                                                                        : isBlockedClaims
                                                                                        ? "BlockedClaims"
                                                                                        : isClaudeDependency
                                                                                          ? "ClaudeDependency"
                        : isHumanApproval
                          ? "HumanApproval"
                          : isArchitectureReview
                            ? "ArchitectureReview"
                          : isSecurityReview
                            ? "SecurityReview"
                          : isBypassReview
                            ? "BypassReview"
                          : isMissingTests
                            ? "MissingTests"
                          : isRiskRegister
                            ? "RiskRegister"
                          : isHumanSummary
                            ? "HumanSummary"
                          : isRecovery
                            ? "Recovery"
                                                                                                : isAuditHint
                                                                                                  ? "AuditHint"
                                              : "HRXBaselineBoundary",
    });
  }
  return deepFreeze(rows);
}

export function createHrxCp897ContractBaselineCaseSet() {
  const sections = {};
  for (const [microId, titles] of Object.entries(HRX_CP897_REQUIRED_SECTION_ROWS)) {
    sections[microId] = deepFreeze({
      micro_phase_id: microId,
      row_count: titles.length,
      rows: createHrxBaselineRows(microId, titles),
    });
  }
  return deepFreeze({
    pack_id: HRX_CP897_PACK_BINDING.pack_id,
    section_count: Object.keys(sections).length,
    row_count: Object.values(sections).reduce((sum, section) => sum + section.row_count, 0),
    sections,
  });
}

export function createHrxCp897HermesEvidencePacket() {
  return deepFreeze({
    gate: HRX_CP897_PACK_BINDING.hermes_gate,
    pack_id: HRX_CP897_PACK_BINDING.pack_id,
    evidence_kind: "hrx_contract_acceptance_baseline",
    emits_runtime_receipt: false,
    required_commands: [
      "npm run rp30:validate",
      "npm run hrx:requirements:validate",
      "npm run hrx:weighted:validate",
      "npm run rp30:hrx:validate",
    ],
    evidence_fields: [
      "hrx_embedded",
      "scope_boundary",
      "admission_boundary",
      "non_goal_boundary",
      "decision_boundary",
      "review_boundary",
      "closeout_boundary",
      "sensitive_hr_guard",
      "payroll_runtime_deferred",
    ],
  });
}

export function createHrxCp897ClaudeReviewPacket() {
  return deepFreeze({
    gate: HRX_CP897_PACK_BINDING.claude_gate,
    pack_id: HRX_CP897_PACK_BINDING.pack_id,
    read_only: true,
    promotes_claude_to_final_approval: false,
    review_questions: [
      "Does CP897 keep HRX embedded inside Law Firm OS instead of creating a separate HRX product?",
      "Do scope/admission/non-goal/decision/review/closeout baseline rows remain descriptor-only and no-runtime?",
      "Are payroll runtime, HR AI final judgment, real employee/candidate data, permission writes, audit writes, credentials, and secrets explicitly closed?",
    ],
  });
}

export function createHrxCp897CloseoutHandoff() {
  return deepFreeze({
    from_pack_id: HRX_CP897_PACK_BINDING.pack_id,
    to_pack_id: HRX_CP897_PACK_BINDING.next_pack_id,
    next_subphase_id: HRX_CP897_PACK_BINDING.next_subphase_id,
    handoff_contract: "Continue RP30 P00 contract baseline rows without opening HRX runtime, payroll calculation, HR AI final judgment, permission/audit writes, real HR data, or a separate HRX product.",
  });
}

export function createHrxCp897ContractBaselineDescriptor() {
  const caseSet = createHrxCp897ContractBaselineCaseSet();
  return deepFreeze({
    descriptor: "HrxCp897ContractBaselineDescriptor",
    source_descriptor: "CommercialCp896ReviewCloseoutHandoffDescriptor",
    pack_id: HRX_CP897_PACK_BINDING.pack_id,
    program_contract: HRX_PROGRAM_CONTRACT,
    authority_boundary: {
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: HRX_CP897_PACK_BINDING.next_pack_id,
    },
    hrx_contract_baseline_case_set: caseSet,
    baseline_decisions: {
      hrx_embedded_inside_law_firm_os: true,
      separate_hrx_product_created: false,
      user_employee_separation_preserved: true,
      employee_user_link_direction: "Employee.user_id reverse link to User",
      payroll_calculation_runtime_deferred: true,
      hr_ai_final_judgment_allowed: false,
      sensitive_hr_guard_required: true,
      real_employee_candidate_payroll_data_allowed: false,
    },
    requirement_refs: [
      "HRX-CORE-001",
      "HRX-CORE-002",
      "HRX-CORE-003",
      "HRX-GATE-001",
      "HRX-GATE-002",
      "HRX-GATE-003",
      "HRX-GATE-004",
      "HRX-GATE-005",
      "HRX-GATE-006",
    ],
    hermes_packet: createHrxCp897HermesEvidencePacket(),
    claude_packet: createHrxCp897ClaudeReviewPacket(),
    closeout_handoff: createHrxCp897CloseoutHandoff(),
    required_capabilities: HRX_CP897_REQUIREMENTS.required_capabilities,
    safety_gates: HRX_CP897_REQUIREMENTS.safety_gates,
    no_leak_guards: HRX_CP897_REQUIREMENTS.required_no_leak_guards,
    blocked_claims: HRX_BLOCKED_CLAIMS,
    ...HRX_NO_WRITE_ATTESTATION,
  });
}

export function createHrxCp898ContractBaselineContinuationCaseSet() {
  const sections = {};
  for (const [microId, titles] of Object.entries(HRX_CP898_REQUIRED_SECTION_ROWS)) {
    sections[microId] = deepFreeze({
      micro_phase_id: microId,
      row_count: titles.length,
      rows: createHrxBaselineRows(microId, titles),
    });
  }
  return deepFreeze({
    pack_id: HRX_CP898_PACK_BINDING.pack_id,
    section_count: Object.keys(sections).length,
    row_count: Object.values(sections).reduce((sum, section) => sum + section.row_count, 0),
    sections,
  });
}

export function createHrxCp898HermesEvidencePacket() {
  return deepFreeze({
    gate: HRX_CP898_PACK_BINDING.hermes_gate,
    pack_id: HRX_CP898_PACK_BINDING.pack_id,
    evidence_kind: "hrx_contract_acceptance_baseline_continuation",
    emits_runtime_receipt: false,
    required_commands: [
      "npm run rp30:validate",
      "npm run hrx:requirements:validate",
      "npm run hrx:weighted:validate",
      "npm run rp30:hrx:validate",
    ],
    evidence_fields: [
      "hrx_embedded",
      "scope_continuation",
      "admission_continuation",
      "non_goal_continuation",
      "decision_boundary",
      "sensitive_hr_guard",
      "payroll_runtime_deferred",
    ],
  });
}

export function createHrxCp898ClaudeReviewPacket() {
  return deepFreeze({
    gate: HRX_CP898_PACK_BINDING.claude_gate,
    pack_id: HRX_CP898_PACK_BINDING.pack_id,
    read_only: true,
    promotes_claude_to_final_approval: false,
    review_questions: [
      "Does CP898 continue the RP30 P00 HRX baseline without creating a separate HRX product?",
      "Do scope/admission/non-goal/decision continuation rows remain descriptor-only and no-runtime?",
      "Are payroll runtime, HR AI final judgment, real HR data, permission writes, audit writes, credentials, and secrets still closed?",
    ],
  });
}

export function createHrxCp898CloseoutHandoff() {
  return deepFreeze({
    from_pack_id: HRX_CP898_PACK_BINDING.pack_id,
    to_pack_id: HRX_CP898_PACK_BINDING.next_pack_id,
    next_subphase_id: HRX_CP898_PACK_BINDING.next_subphase_id,
    handoff_contract: "Continue RP30 P00 decision/review closeout rows without opening HRX runtime, payroll calculation, HR AI final judgment, permission/audit writes, real HR data, or a separate HRX product.",
  });
}

export function createHrxCp898ContractBaselineContinuationDescriptor() {
  const caseSet = createHrxCp898ContractBaselineContinuationCaseSet();
  return deepFreeze({
    descriptor: "HrxCp898ContractBaselineContinuationDescriptor",
    source_descriptor: "HrxCp897ContractBaselineDescriptor",
    pack_id: HRX_CP898_PACK_BINDING.pack_id,
    program_contract: HRX_PROGRAM_CONTRACT,
    authority_boundary: {
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: HRX_CP898_PACK_BINDING.next_pack_id,
    },
    hrx_contract_baseline_case_set: caseSet,
    baseline_decisions: {
      hrx_embedded_inside_law_firm_os: true,
      separate_hrx_product_created: false,
      user_employee_separation_preserved: true,
      employee_user_link_direction: "Employee.user_id reverse link to User",
      payroll_calculation_runtime_deferred: true,
      hr_ai_final_judgment_allowed: false,
      sensitive_hr_guard_required: true,
      real_employee_candidate_payroll_data_allowed: false,
    },
    requirement_refs: [
      "HRX-CORE-001",
      "HRX-CORE-002",
      "HRX-CORE-003",
      "HRX-GATE-001",
      "HRX-GATE-002",
      "HRX-GATE-003",
      "HRX-GATE-004",
      "HRX-GATE-005",
      "HRX-GATE-006",
    ],
    hermes_packet: createHrxCp898HermesEvidencePacket(),
    claude_packet: createHrxCp898ClaudeReviewPacket(),
    closeout_handoff: createHrxCp898CloseoutHandoff(),
    required_capabilities: HRX_CP898_REQUIREMENTS.required_capabilities,
    safety_gates: HRX_CP898_REQUIREMENTS.safety_gates,
    no_leak_guards: HRX_CP898_REQUIREMENTS.required_no_leak_guards,
    blocked_claims: HRX_BLOCKED_CLAIMS,
    ...HRX_NO_WRITE_ATTESTATION,
  });
}

export function createHrxCp899DomainEmployeeProfileBridgeCaseSet() {
  const sections = {};
  for (const [microId, titles] of Object.entries(HRX_CP899_REQUIRED_SECTION_ROWS)) {
    sections[microId] = deepFreeze({
      micro_phase_id: microId,
      row_count: titles.length,
      rows: createHrxDomainRows(microId, titles),
    });
  }
  return deepFreeze({
    pack_id: HRX_CP899_PACK_BINDING.pack_id,
    section_count: Object.keys(sections).length,
    row_count: Object.values(sections).reduce((sum, section) => sum + section.row_count, 0),
    sections,
  });
}

export function createHrxCp899HermesEvidencePacket() {
  return deepFreeze({
    gate: HRX_CP899_PACK_BINDING.hermes_gate,
    pack_id: HRX_CP899_PACK_BINDING.pack_id,
    evidence_kind: "hrx_domain_employee_profile_bridge",
    emits_runtime_receipt: false,
    required_commands: [
      "npm run rp30:validate",
      "npm run hrx:requirements:validate",
      "npm run hrx:weighted:validate",
      "npm run rp30:hrx:validate",
    ],
    evidence_fields: [
      "hrx_embedded",
      "decision_review_handoff",
      "employee_entity_descriptor",
      "employment_profile_entity_descriptor",
      "employee_user_reverse_link_only",
      "employment_profile_employee_reference",
      "payroll_runtime_deferred",
    ],
  });
}

export function createHrxCp899ClaudeReviewPacket() {
  return deepFreeze({
    gate: HRX_CP899_PACK_BINDING.claude_gate,
    pack_id: HRX_CP899_PACK_BINDING.pack_id,
    read_only: true,
    promotes_claude_to_final_approval: false,
    review_questions: [
      "Does CP899 bridge P00 decision/review rows into P01 Employee and EmploymentProfile domain descriptors without opening runtime?",
      "Does Employee remain separate from User with only an Employee.user_id reverse link to User?",
      "Does EmploymentProfile reference Employee instead of becoming or authorizing a user account?",
      "Are payroll runtime, HR AI final judgment, real HR data, permission writes, audit writes, credentials, and secrets still closed?",
    ],
  });
}

export function createHrxCp899CloseoutHandoff() {
  return deepFreeze({
    from_pack_id: HRX_CP899_PACK_BINDING.pack_id,
    to_pack_id: HRX_CP899_PACK_BINDING.next_pack_id,
    next_subphase_id: HRX_CP899_PACK_BINDING.next_subphase_id,
    handoff_contract: "Continue RP30 P01 EmploymentProfile descriptor rows while preserving Employee/User separation, keeping HRX embedded inside Law Firm OS, and leaving payroll runtime, HR AI final judgment, permission/audit writes, real HR data, and separate-product claims closed.",
  });
}

export function createHrxCp899DomainEmployeeProfileBridgeDescriptor() {
  const caseSet = createHrxCp899DomainEmployeeProfileBridgeCaseSet();
  return deepFreeze({
    descriptor: "HrxCp899DomainEmployeeProfileBridgeDescriptor",
    source_descriptor: "HrxCp898ContractBaselineContinuationDescriptor",
    pack_id: HRX_CP899_PACK_BINDING.pack_id,
    program_contract: HRX_PROGRAM_CONTRACT,
    authority_boundary: {
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: HRX_CP899_PACK_BINDING.next_pack_id,
    },
    hrx_domain_employee_profile_case_set: caseSet,
    domain_entities: {
      Employee: deepFreeze({
        descriptor_only: true,
        user_account: false,
        user_id_relation: "reverse link to User only",
        may_authorize_user_session: false,
        sensitive_hr_guard_required: true,
      }),
      EmploymentProfile: deepFreeze({
        descriptor_only: true,
        employee_reference_required: true,
        references_user_account_directly: false,
        compensation_runtime_deferred: true,
        sensitive_hr_guard_required: true,
      }),
    },
    baseline_decisions: {
      hrx_embedded_inside_law_firm_os: true,
      separate_hrx_product_created: false,
      user_employee_separation_preserved: true,
      employee_user_link_direction: "Employee.user_id reverse link to User",
      employment_profile_links_to_employee_only: true,
      employment_profile_user_account_conflation_allowed: false,
      payroll_calculation_runtime_deferred: true,
      hr_ai_final_judgment_allowed: false,
      sensitive_hr_guard_required: true,
      real_employee_candidate_payroll_data_allowed: false,
    },
    requirement_refs: [
      "HRX-CORE-001",
      "HRX-CORE-002",
      "HRX-CORE-003",
      "HRX-GATE-001",
      "HRX-GATE-002",
      "HRX-GATE-003",
      "HRX-GATE-004",
      "HRX-GATE-005",
      "HRX-GATE-006",
    ],
    hermes_packet: createHrxCp899HermesEvidencePacket(),
    claude_packet: createHrxCp899ClaudeReviewPacket(),
    closeout_handoff: createHrxCp899CloseoutHandoff(),
    required_capabilities: HRX_CP899_REQUIREMENTS.required_capabilities,
    safety_gates: HRX_CP899_REQUIREMENTS.safety_gates,
    no_leak_guards: HRX_CP899_REQUIREMENTS.required_no_leak_guards,
    blocked_claims: HRX_BLOCKED_CLAIMS,
    ...HRX_NO_WRITE_ATTESTATION,
  });
}

export function createHrxCp900HrDocumentContractBridgeCaseSet() {
  const sections = {};
  for (const [microId, titles] of Object.entries(HRX_CP900_REQUIRED_SECTION_ROWS)) {
    sections[microId] = deepFreeze({
      micro_phase_id: microId,
      row_count: titles.length,
      rows: createHrxDomainRows(microId, titles),
    });
  }
  return deepFreeze({
    pack_id: HRX_CP900_PACK_BINDING.pack_id,
    section_count: Object.keys(sections).length,
    row_count: Object.values(sections).reduce((sum, section) => sum + section.row_count, 0),
    sections,
  });
}

export function createHrxCp900HermesEvidencePacket() {
  return deepFreeze({
    gate: HRX_CP900_PACK_BINDING.hermes_gate,
    pack_id: HRX_CP900_PACK_BINDING.pack_id,
    evidence_kind: "hrx_hr_document_contract_bridge",
    emits_runtime_receipt: false,
    required_commands: [
      "npm run rp30:validate",
      "npm run hrx:requirements:validate",
      "npm run hrx:weighted:validate",
      "npm run rp30:hrx:validate",
    ],
    evidence_fields: [
      "hrx_embedded",
      "employment_profile_tail",
      "hr_document_entity_descriptor",
      "employment_contract_entity_descriptor",
      "document_body_absent",
      "contract_text_absent",
      "signature_runtime_deferred",
      "payroll_runtime_deferred",
    ],
  });
}

export function createHrxCp900ClaudeReviewPacket() {
  return deepFreeze({
    gate: HRX_CP900_PACK_BINDING.claude_gate,
    pack_id: HRX_CP900_PACK_BINDING.pack_id,
    read_only: true,
    promotes_claude_to_final_approval: false,
    review_questions: [
      "Does CP900 continue EmploymentProfile descriptor rows into HRDocument and EmploymentContract descriptors without opening runtime?",
      "Do HRDocument rows reference EmploymentProfile without storing document bodies or real HR documents?",
      "Do EmploymentContract rows reference EmploymentProfile without contract execution, signature runtime, payroll runtime, or final HR AI judgment?",
      "Are permission writes, audit writes, product-state writes, credentials, secrets, and real employee/candidate/payroll/document data still closed?",
    ],
  });
}

export function createHrxCp900CloseoutHandoff() {
  return deepFreeze({
    from_pack_id: HRX_CP900_PACK_BINDING.pack_id,
    to_pack_id: HRX_CP900_PACK_BINDING.next_pack_id,
    next_subphase_id: HRX_CP900_PACK_BINDING.next_subphase_id,
    handoff_contract: "Continue RP30 P01 EmploymentContract descriptor rows and then compensation/people-graph descriptors while keeping document bodies, contract text, signature/execution runtime, payroll runtime, HR AI final judgment, permission/audit writes, real HR data, and separate-product claims closed.",
  });
}

export function createHrxCp900HrDocumentContractBridgeDescriptor() {
  const caseSet = createHrxCp900HrDocumentContractBridgeCaseSet();
  return deepFreeze({
    descriptor: "HrxCp900HrDocumentContractBridgeDescriptor",
    source_descriptor: "HrxCp899DomainEmployeeProfileBridgeDescriptor",
    pack_id: HRX_CP900_PACK_BINDING.pack_id,
    program_contract: HRX_PROGRAM_CONTRACT,
    authority_boundary: {
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: HRX_CP900_PACK_BINDING.next_pack_id,
    },
    hrx_hr_document_contract_case_set: caseSet,
    domain_entities: {
      EmploymentProfile: deepFreeze({
        descriptor_only: true,
        employee_reference_required: true,
        references_user_account_directly: false,
        sensitive_hr_guard_required: true,
      }),
      HRDocument: deepFreeze({
        descriptor_only: true,
        employment_profile_reference_required: true,
        document_body_included: false,
        storage_runtime_opened: false,
        sensitive_hr_guard_required: true,
      }),
      EmploymentContract: deepFreeze({
        descriptor_only: true,
        employment_profile_reference_required: true,
        contract_text_included: false,
        execution_runtime_opened: false,
        signature_runtime_opened: false,
        payroll_runtime_opened: false,
        sensitive_hr_guard_required: true,
      }),
    },
    baseline_decisions: {
      hrx_embedded_inside_law_firm_os: true,
      separate_hrx_product_created: false,
      employment_profile_links_to_employee_only: true,
      employment_profile_user_account_conflation_allowed: false,
      hr_document_links_to_employment_profile_only: true,
      employment_contract_links_to_employment_profile_only: true,
      document_body_storage_runtime_deferred: true,
      contract_execution_runtime_deferred: true,
      signature_runtime_deferred: true,
      payroll_calculation_runtime_deferred: true,
      hr_ai_final_judgment_allowed: false,
      sensitive_hr_guard_required: true,
      real_employee_candidate_payroll_document_data_allowed: false,
    },
    requirement_refs: [
      "HRX-CORE-001",
      "HRX-CORE-002",
      "HRX-CORE-003",
      "HRX-GATE-001",
      "HRX-GATE-002",
      "HRX-GATE-003",
      "HRX-GATE-004",
      "HRX-GATE-005",
      "HRX-GATE-006",
    ],
    hermes_packet: createHrxCp900HermesEvidencePacket(),
    claude_packet: createHrxCp900ClaudeReviewPacket(),
    closeout_handoff: createHrxCp900CloseoutHandoff(),
    required_capabilities: HRX_CP900_REQUIREMENTS.required_capabilities,
    safety_gates: HRX_CP900_REQUIREMENTS.safety_gates,
    no_leak_guards: HRX_CP900_REQUIREMENTS.required_no_leak_guards,
    blocked_claims: HRX_BLOCKED_CLAIMS,
    ...HRX_NO_WRITE_ATTESTATION,
  });
}

export function createHrxCp901ContractCompensationGraphBridgeCaseSet() {
  const sections = {};
  for (const [microId, titles] of Object.entries(HRX_CP901_REQUIRED_SECTION_ROWS)) {
    sections[microId] = deepFreeze({
      micro_phase_id: microId,
      row_count: titles.length,
      rows: createHrxDomainRows(microId, titles),
    });
  }
  return deepFreeze({
    pack_id: HRX_CP901_PACK_BINDING.pack_id,
    section_count: Object.keys(sections).length,
    row_count: Object.values(sections).reduce((sum, section) => sum + section.row_count, 0),
    sections,
  });
}

export function createHrxCp901HermesEvidencePacket() {
  return deepFreeze({
    gate: HRX_CP901_PACK_BINDING.hermes_gate,
    pack_id: HRX_CP901_PACK_BINDING.pack_id,
    evidence_kind: "hrx_contract_compensation_graph_bridge",
    emits_runtime_receipt: false,
    required_commands: [
      "npm run rp30:validate",
      "npm run hrx:requirements:validate",
      "npm run hrx:weighted:validate",
      "npm run rp30:hrx:validate",
    ],
    evidence_fields: [
      "hrx_embedded",
      "employment_contract_tail",
      "compensation_record_entity_descriptor",
      "compensation_amount_absent",
      "payroll_runtime_deferred",
      "people_graph_security_audit_descriptor",
      "permission_edges_deferred",
    ],
  });
}

export function createHrxCp901ClaudeReviewPacket() {
  return deepFreeze({
    gate: HRX_CP901_PACK_BINDING.claude_gate,
    pack_id: HRX_CP901_PACK_BINDING.pack_id,
    read_only: true,
    promotes_claude_to_final_approval: false,
    review_questions: [
      "Does CP901 continue EmploymentContract tail rows into CompensationRecord and PeopleGraph descriptors without opening runtime?",
      "Do CompensationRecord rows avoid compensation amounts, currencies, payroll calculation, and real payroll data?",
      "Do PeopleGraph security-audit rows avoid emitting permission edges, audit writes, runtime receipts, or product-state writes?",
      "Are HR AI final judgment, credentials, secrets, and separate HRX product claims still closed?",
    ],
  });
}

export function createHrxCp901CloseoutHandoff() {
  return deepFreeze({
    from_pack_id: HRX_CP901_PACK_BINDING.pack_id,
    to_pack_id: HRX_CP901_PACK_BINDING.next_pack_id,
    next_subphase_id: HRX_CP901_PACK_BINDING.next_subphase_id,
    handoff_contract: "Continue RP30 P01 PeopleGraph security and permission descriptors while keeping compensation amounts, payroll runtime, permission edges, audit writes, HR AI final judgment, real HR data, and separate-product claims closed.",
  });
}

export function createHrxCp901ContractCompensationGraphBridgeDescriptor() {
  const caseSet = createHrxCp901ContractCompensationGraphBridgeCaseSet();
  return deepFreeze({
    descriptor: "HrxCp901ContractCompensationGraphBridgeDescriptor",
    source_descriptor: "HrxCp900HrDocumentContractBridgeDescriptor",
    pack_id: HRX_CP901_PACK_BINDING.pack_id,
    program_contract: HRX_PROGRAM_CONTRACT,
    authority_boundary: {
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: HRX_CP901_PACK_BINDING.next_pack_id,
    },
    hrx_contract_compensation_graph_case_set: caseSet,
    domain_entities: {
      EmploymentContract: deepFreeze({
        descriptor_only: true,
        employment_profile_reference_required: true,
        execution_runtime_opened: false,
        signature_runtime_opened: false,
        payroll_runtime_opened: false,
        sensitive_hr_guard_required: true,
      }),
      CompensationRecord: deepFreeze({
        descriptor_only: true,
        employment_contract_reference_required: true,
        compensation_amount_included: false,
        compensation_currency_included: false,
        payroll_runtime_opened: false,
        sensitive_hr_guard_required: true,
      }),
      PeopleGraph: deepFreeze({
        descriptor_only: true,
        security_audit_descriptor: true,
        permission_edges_included: false,
        graph_runtime_opened: false,
        audit_event_written: false,
        sensitive_hr_guard_required: true,
      }),
    },
    baseline_decisions: {
      hrx_embedded_inside_law_firm_os: true,
      separate_hrx_product_created: false,
      employment_contract_links_to_employment_profile_only: true,
      compensation_record_links_to_employment_contract_only: true,
      compensation_amounts_included: false,
      payroll_calculation_runtime_deferred: true,
      people_graph_permission_edges_deferred: true,
      people_graph_runtime_deferred: true,
      hr_ai_final_judgment_allowed: false,
      sensitive_hr_guard_required: true,
      real_employee_candidate_payroll_document_data_allowed: false,
    },
    requirement_refs: [
      "HRX-CORE-001",
      "HRX-CORE-002",
      "HRX-CORE-003",
      "HRX-GATE-001",
      "HRX-GATE-002",
      "HRX-GATE-003",
      "HRX-GATE-004",
      "HRX-GATE-005",
      "HRX-GATE-006",
    ],
    hermes_packet: createHrxCp901HermesEvidencePacket(),
    claude_packet: createHrxCp901ClaudeReviewPacket(),
    closeout_handoff: createHrxCp901CloseoutHandoff(),
    required_capabilities: HRX_CP901_REQUIREMENTS.required_capabilities,
    safety_gates: HRX_CP901_REQUIREMENTS.safety_gates,
    no_leak_guards: HRX_CP901_REQUIREMENTS.required_no_leak_guards,
    blocked_claims: HRX_BLOCKED_CLAIMS,
    ...HRX_NO_WRITE_ATTESTATION,
  });
}

export function createHrxCp902PeopleGraphEmployeeBridgeCaseSet() {
  const sections = {};
  for (const [microId, titles] of Object.entries(HRX_CP902_REQUIRED_SECTION_ROWS)) {
    sections[microId] = deepFreeze({
      micro_phase_id: microId,
      row_count: titles.length,
      rows: createHrxDomainRows(microId, titles),
    });
  }
  return deepFreeze({
    pack_id: HRX_CP902_PACK_BINDING.pack_id,
    section_count: Object.keys(sections).length,
    row_count: Object.values(sections).reduce((sum, section) => sum + section.row_count, 0),
    sections,
  });
}

export function createHrxCp902HermesEvidencePacket() {
  return deepFreeze({
    gate: HRX_CP902_PACK_BINDING.hermes_gate,
    pack_id: HRX_CP902_PACK_BINDING.pack_id,
    evidence_kind: "hrx_people_graph_employee_bridge",
    emits_runtime_receipt: false,
    required_commands: [
      "npm run rp30:validate",
      "npm run hrx:requirements:validate",
      "npm run hrx:weighted:validate",
      "npm run rp30:hrx:validate",
    ],
    evidence_fields: [
      "hrx_embedded",
      "people_graph_security_continuation",
      "permission_edges_deferred",
      "employee_entity_reentry_descriptor",
      "employee_user_reverse_link_only",
      "payroll_runtime_deferred",
    ],
  });
}

export function createHrxCp902ClaudeReviewPacket() {
  return deepFreeze({
    gate: HRX_CP902_PACK_BINDING.claude_gate,
    pack_id: HRX_CP902_PACK_BINDING.pack_id,
    read_only: true,
    promotes_claude_to_final_approval: false,
    review_questions: [
      "Does CP902 continue PeopleGraph security-audit rows without emitting permission edges, graph runtime, audit writes, or runtime receipts?",
      "Do Employee re-entry rows remain separate from User with only an Employee.user_id reverse-link descriptor?",
      "Are payroll runtime, HR AI final judgment, real HR data, credentials, secrets, and separate HRX product claims still closed?",
    ],
  });
}

export function createHrxCp902CloseoutHandoff() {
  return deepFreeze({
    from_pack_id: HRX_CP902_PACK_BINDING.pack_id,
    to_pack_id: HRX_CP902_PACK_BINDING.next_pack_id,
    next_subphase_id: HRX_CP902_PACK_BINDING.next_subphase_id,
    handoff_contract: "Continue RP30 P01 Employee tail rows into EmploymentProfile and HRDocument descriptors while keeping PeopleGraph permission edges, payroll runtime, HR AI final judgment, real HR data, and separate-product claims closed.",
  });
}

export function createHrxCp902PeopleGraphEmployeeBridgeDescriptor() {
  const caseSet = createHrxCp902PeopleGraphEmployeeBridgeCaseSet();
  return deepFreeze({
    descriptor: "HrxCp902PeopleGraphEmployeeBridgeDescriptor",
    source_descriptor: "HrxCp901ContractCompensationGraphBridgeDescriptor",
    pack_id: HRX_CP902_PACK_BINDING.pack_id,
    program_contract: HRX_PROGRAM_CONTRACT,
    authority_boundary: {
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: HRX_CP902_PACK_BINDING.next_pack_id,
    },
    hrx_people_graph_employee_case_set: caseSet,
    domain_entities: {
      PeopleGraph: deepFreeze({
        descriptor_only: true,
        security_audit_descriptor: true,
        permission_edges_included: false,
        graph_runtime_opened: false,
        audit_event_written: false,
        sensitive_hr_guard_required: true,
      }),
      Employee: deepFreeze({
        descriptor_only: true,
        user_account: false,
        user_id_relation: "reverse link to User only",
        may_authorize_user_session: false,
        sensitive_hr_guard_required: true,
      }),
    },
    baseline_decisions: {
      hrx_embedded_inside_law_firm_os: true,
      separate_hrx_product_created: false,
      people_graph_permission_edges_deferred: true,
      people_graph_runtime_deferred: true,
      user_employee_separation_preserved: true,
      employee_user_link_direction: "Employee.user_id reverse link to User",
      payroll_calculation_runtime_deferred: true,
      hr_ai_final_judgment_allowed: false,
      sensitive_hr_guard_required: true,
      real_employee_candidate_payroll_document_data_allowed: false,
    },
    requirement_refs: [
      "HRX-CORE-001",
      "HRX-CORE-002",
      "HRX-CORE-003",
      "HRX-GATE-001",
      "HRX-GATE-002",
      "HRX-GATE-003",
      "HRX-GATE-004",
      "HRX-GATE-005",
      "HRX-GATE-006",
    ],
    hermes_packet: createHrxCp902HermesEvidencePacket(),
    claude_packet: createHrxCp902ClaudeReviewPacket(),
    closeout_handoff: createHrxCp902CloseoutHandoff(),
    required_capabilities: HRX_CP902_REQUIREMENTS.required_capabilities,
    safety_gates: HRX_CP902_REQUIREMENTS.safety_gates,
    no_leak_guards: HRX_CP902_REQUIREMENTS.required_no_leak_guards,
    blocked_claims: HRX_BLOCKED_CLAIMS,
    ...HRX_NO_WRITE_ATTESTATION,
  });
}

export function createHrxCp903EmployeeProfileDocumentBridgeCaseSet() {
  const sections = {};
  for (const [microId, titles] of Object.entries(HRX_CP903_REQUIRED_SECTION_ROWS)) {
    sections[microId] = deepFreeze({
      micro_phase_id: microId,
      row_count: titles.length,
      rows: createHrxDomainRows(microId, titles),
    });
  }
  return deepFreeze({
    pack_id: HRX_CP903_PACK_BINDING.pack_id,
    section_count: Object.keys(sections).length,
    row_count: Object.values(sections).reduce((sum, section) => sum + section.row_count, 0),
    sections,
  });
}

export function createHrxCp903HermesEvidencePacket() {
  return deepFreeze({
    gate: HRX_CP903_PACK_BINDING.hermes_gate,
    pack_id: HRX_CP903_PACK_BINDING.pack_id,
    evidence_kind: "hrx_employee_profile_document_bridge",
    emits_runtime_receipt: false,
    required_commands: [
      "npm run rp30:validate",
      "npm run hrx:requirements:validate",
      "npm run hrx:weighted:validate",
      "npm run rp30:hrx:validate",
    ],
    evidence_fields: [
      "hrx_embedded",
      "employee_tail_descriptor",
      "employee_user_reverse_link_only",
      "employment_profile_employee_link_only",
      "hr_document_profile_link_only",
      "document_body_storage_deferred",
    ],
  });
}

export function createHrxCp903ClaudeReviewPacket() {
  return deepFreeze({
    gate: HRX_CP903_PACK_BINDING.claude_gate,
    pack_id: HRX_CP903_PACK_BINDING.pack_id,
    read_only: true,
    promotes_claude_to_final_approval: false,
    review_questions: [
      "Does CP903 continue Employee tail rows without authorizing user sessions or conflating Employee with User?",
      "Do EmploymentProfile rows link to Employee only and avoid direct user-account references?",
      "Do HRDocument rows remain descriptor-only without document bodies, storage runtime, real HR data, credentials, secrets, payroll runtime, or HR AI final judgment?",
    ],
  });
}

export function createHrxCp903CloseoutHandoff() {
  return deepFreeze({
    from_pack_id: HRX_CP903_PACK_BINDING.pack_id,
    to_pack_id: HRX_CP903_PACK_BINDING.next_pack_id,
    next_subphase_id: HRX_CP903_PACK_BINDING.next_subphase_id,
    handoff_contract: "Continue RP30 P01 HRDocument tail rows into EmploymentContract and CompensationRecord descriptors while keeping document bodies, payroll runtime, HR AI final judgment, real HR data, credentials, secrets, and separate-product claims closed.",
  });
}

export function createHrxCp903EmployeeProfileDocumentBridgeDescriptor() {
  const caseSet = createHrxCp903EmployeeProfileDocumentBridgeCaseSet();
  return deepFreeze({
    descriptor: "HrxCp903EmployeeProfileDocumentBridgeDescriptor",
    source_descriptor: "HrxCp902PeopleGraphEmployeeBridgeDescriptor",
    pack_id: HRX_CP903_PACK_BINDING.pack_id,
    program_contract: HRX_PROGRAM_CONTRACT,
    authority_boundary: {
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: HRX_CP903_PACK_BINDING.next_pack_id,
    },
    hrx_employee_profile_document_case_set: caseSet,
    domain_entities: {
      Employee: deepFreeze({
        descriptor_only: true,
        user_account: false,
        user_id_relation: "reverse link to User only",
        may_authorize_user_session: false,
        sensitive_hr_guard_required: true,
      }),
      EmploymentProfile: deepFreeze({
        descriptor_only: true,
        employee_reference_required: true,
        references_user_account_directly: false,
        sensitive_hr_guard_required: true,
      }),
      HRDocument: deepFreeze({
        descriptor_only: true,
        employment_profile_reference_required: true,
        document_body_included: false,
        storage_runtime_opened: false,
        sensitive_hr_guard_required: true,
      }),
    },
    baseline_decisions: {
      hrx_embedded_inside_law_firm_os: true,
      separate_hrx_product_created: false,
      user_employee_separation_preserved: true,
      employee_user_link_direction: "Employee.user_id reverse link to User",
      employment_profile_links_to_employee_only: true,
      employment_profile_user_account_conflation_allowed: false,
      hr_document_links_to_employment_profile_only: true,
      document_body_storage_runtime_deferred: true,
      payroll_calculation_runtime_deferred: true,
      hr_ai_final_judgment_allowed: false,
      sensitive_hr_guard_required: true,
      real_employee_candidate_payroll_document_data_allowed: false,
    },
    requirement_refs: [
      "HRX-CORE-001",
      "HRX-CORE-002",
      "HRX-CORE-003",
      "HRX-GATE-001",
      "HRX-GATE-002",
      "HRX-GATE-003",
      "HRX-GATE-004",
      "HRX-GATE-005",
      "HRX-GATE-006",
    ],
    hermes_packet: createHrxCp903HermesEvidencePacket(),
    claude_packet: createHrxCp903ClaudeReviewPacket(),
    closeout_handoff: createHrxCp903CloseoutHandoff(),
    required_capabilities: HRX_CP903_REQUIREMENTS.required_capabilities,
    safety_gates: HRX_CP903_REQUIREMENTS.safety_gates,
    no_leak_guards: HRX_CP903_REQUIREMENTS.required_no_leak_guards,
    blocked_claims: HRX_BLOCKED_CLAIMS,
    ...HRX_NO_WRITE_ATTESTATION,
  });
}

export function createHrxCp904DocumentContractCompensationBridgeCaseSet() {
  const sections = {};
  for (const [microId, titles] of Object.entries(HRX_CP904_REQUIRED_SECTION_ROWS)) {
    sections[microId] = deepFreeze({
      micro_phase_id: microId,
      row_count: titles.length,
      rows: createHrxDomainRows(microId, titles),
    });
  }
  return deepFreeze({
    pack_id: HRX_CP904_PACK_BINDING.pack_id,
    section_count: Object.keys(sections).length,
    row_count: Object.values(sections).reduce((sum, section) => sum + section.row_count, 0),
    sections,
  });
}

export function createHrxCp904HermesEvidencePacket() {
  return deepFreeze({
    gate: HRX_CP904_PACK_BINDING.hermes_gate,
    pack_id: HRX_CP904_PACK_BINDING.pack_id,
    evidence_kind: "hrx_document_contract_compensation_bridge",
    emits_runtime_receipt: false,
    required_commands: [
      "npm run rp30:validate",
      "npm run hrx:requirements:validate",
      "npm run hrx:weighted:validate",
      "npm run rp30:hrx:validate",
    ],
    evidence_fields: [
      "hrx_embedded",
      "hr_document_tail_descriptor",
      "document_body_storage_deferred",
      "employment_contract_descriptor",
      "contract_execution_deferred",
      "compensation_amounts_deferred",
      "payroll_runtime_deferred",
    ],
  });
}

export function createHrxCp904ClaudeReviewPacket() {
  return deepFreeze({
    gate: HRX_CP904_PACK_BINDING.claude_gate,
    pack_id: HRX_CP904_PACK_BINDING.pack_id,
    read_only: true,
    promotes_claude_to_final_approval: false,
    review_questions: [
      "Do HRDocument tail rows remain descriptor-only without document bodies or storage runtime?",
      "Do EmploymentContract rows remain descriptor-only without contract text, execution runtime, or signature runtime?",
      "Do CompensationRecord rows avoid amounts, currencies, payroll runtime, real HR data, credentials, secrets, separate HRX product claims, and HR AI final judgment?",
    ],
  });
}

export function createHrxCp904CloseoutHandoff() {
  return deepFreeze({
    from_pack_id: HRX_CP904_PACK_BINDING.pack_id,
    to_pack_id: HRX_CP904_PACK_BINDING.next_pack_id,
    next_subphase_id: HRX_CP904_PACK_BINDING.next_subphase_id,
    handoff_contract: "Continue RP30 P01 CompensationRecord tail rows into RP30 P02 RuleEngine descriptors while keeping compensation amounts, payroll runtime, HR AI final judgment, real HR data, credentials, secrets, and separate-product claims closed.",
  });
}

export function createHrxCp904DocumentContractCompensationBridgeDescriptor() {
  const caseSet = createHrxCp904DocumentContractCompensationBridgeCaseSet();
  return deepFreeze({
    descriptor: "HrxCp904DocumentContractCompensationBridgeDescriptor",
    source_descriptor: "HrxCp903EmployeeProfileDocumentBridgeDescriptor",
    pack_id: HRX_CP904_PACK_BINDING.pack_id,
    program_contract: HRX_PROGRAM_CONTRACT,
    authority_boundary: {
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: HRX_CP904_PACK_BINDING.next_pack_id,
    },
    hrx_document_contract_compensation_case_set: caseSet,
    domain_entities: {
      HRDocument: deepFreeze({
        descriptor_only: true,
        employment_profile_reference_required: true,
        document_body_included: false,
        storage_runtime_opened: false,
        sensitive_hr_guard_required: true,
      }),
      EmploymentContract: deepFreeze({
        descriptor_only: true,
        employment_profile_reference_required: true,
        contract_text_included: false,
        execution_runtime_opened: false,
        signature_runtime_opened: false,
        sensitive_hr_guard_required: true,
      }),
      CompensationRecord: deepFreeze({
        descriptor_only: true,
        employment_contract_reference_required: true,
        compensation_amount_included: false,
        compensation_currency_included: false,
        payroll_runtime_opened: false,
        sensitive_hr_guard_required: true,
      }),
    },
    baseline_decisions: {
      hrx_embedded_inside_law_firm_os: true,
      separate_hrx_product_created: false,
      hr_document_links_to_employment_profile_only: true,
      document_body_storage_runtime_deferred: true,
      employment_contract_links_to_employment_profile_only: true,
      contract_execution_runtime_deferred: true,
      signature_runtime_deferred: true,
      compensation_record_links_to_employment_contract_only: true,
      compensation_amounts_included: false,
      payroll_calculation_runtime_deferred: true,
      hr_ai_final_judgment_allowed: false,
      sensitive_hr_guard_required: true,
      real_employee_candidate_payroll_document_data_allowed: false,
    },
    requirement_refs: [
      "HRX-CORE-001",
      "HRX-CORE-002",
      "HRX-CORE-003",
      "HRX-GATE-001",
      "HRX-GATE-002",
      "HRX-GATE-003",
      "HRX-GATE-004",
      "HRX-GATE-005",
      "HRX-GATE-006",
    ],
    hermes_packet: createHrxCp904HermesEvidencePacket(),
    claude_packet: createHrxCp904ClaudeReviewPacket(),
    closeout_handoff: createHrxCp904CloseoutHandoff(),
    required_capabilities: HRX_CP904_REQUIREMENTS.required_capabilities,
    safety_gates: HRX_CP904_REQUIREMENTS.safety_gates,
    no_leak_guards: HRX_CP904_REQUIREMENTS.required_no_leak_guards,
    blocked_claims: HRX_BLOCKED_CLAIMS,
    ...HRX_NO_WRITE_ATTESTATION,
  });
}

export function createHrxCp905CompensationRuleEngineBridgeCaseSet() {
  const sections = {};
  for (const [microId, titles] of Object.entries(HRX_CP905_REQUIRED_SECTION_ROWS)) {
    sections[microId] = deepFreeze({
      micro_phase_id: microId,
      row_count: titles.length,
      rows: createHrxDomainRows(microId, titles),
    });
  }
  return deepFreeze({
    pack_id: HRX_CP905_PACK_BINDING.pack_id,
    section_count: Object.keys(sections).length,
    row_count: Object.values(sections).reduce((sum, section) => sum + section.row_count, 0),
    sections,
  });
}

export function createHrxCp905HermesEvidencePacket() {
  return deepFreeze({
    gate: HRX_CP905_PACK_BINDING.hermes_gate,
    pack_id: HRX_CP905_PACK_BINDING.pack_id,
    evidence_kind: "hrx_compensation_rule_engine_bridge",
    emits_runtime_receipt: false,
    required_commands: [
      "npm run rp30:validate",
      "npm run hrx:requirements:validate",
      "npm run hrx:weighted:validate",
      "npm run rp30:hrx:validate",
    ],
    evidence_fields: [
      "hrx_embedded",
      "compensation_record_tail_descriptor",
      "compensation_amounts_deferred",
      "payroll_runtime_deferred",
      "rule_engine_descriptor",
      "rule_execution_deferred",
      "rule_decision_writes_deferred",
    ],
  });
}

export function createHrxCp905ClaudeReviewPacket() {
  return deepFreeze({
    gate: HRX_CP905_PACK_BINDING.claude_gate,
    pack_id: HRX_CP905_PACK_BINDING.pack_id,
    read_only: true,
    promotes_claude_to_final_approval: false,
    review_questions: [
      "Do CompensationRecord tail rows avoid compensation amounts, currencies, payroll runtime, and payroll values?",
      "Do RuleEngine rows remain descriptor-only without rule definitions, rule execution runtime, decision writes, or HR AI final judgment?",
      "Are real HR data, credentials, secrets, runtime receipts, permission/audit writes, and separate HRX product claims still closed?",
    ],
  });
}

export function createHrxCp905CloseoutHandoff() {
  return deepFreeze({
    from_pack_id: HRX_CP905_PACK_BINDING.pack_id,
    to_pack_id: HRX_CP905_PACK_BINDING.next_pack_id,
    next_subphase_id: HRX_CP905_PACK_BINDING.next_subphase_id,
    handoff_contract: "Continue RP30 P02 RuleEngine tail rows into LeaveWorkflow descriptors while keeping rule execution, decision writes, HR AI final judgment, payroll runtime, real HR data, credentials, secrets, and separate-product claims closed.",
  });
}

export function createHrxCp905CompensationRuleEngineBridgeDescriptor() {
  const caseSet = createHrxCp905CompensationRuleEngineBridgeCaseSet();
  return deepFreeze({
    descriptor: "HrxCp905CompensationRuleEngineBridgeDescriptor",
    source_descriptor: "HrxCp904DocumentContractCompensationBridgeDescriptor",
    pack_id: HRX_CP905_PACK_BINDING.pack_id,
    program_contract: HRX_PROGRAM_CONTRACT,
    authority_boundary: {
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: HRX_CP905_PACK_BINDING.next_pack_id,
    },
    hrx_compensation_rule_engine_case_set: caseSet,
    domain_entities: {
      CompensationRecord: deepFreeze({
        descriptor_only: true,
        employment_contract_reference_required: true,
        compensation_amount_included: false,
        compensation_currency_included: false,
        payroll_runtime_opened: false,
        sensitive_hr_guard_required: true,
      }),
      RuleEngine: deepFreeze({
        descriptor_only: true,
        rule_definition_included: false,
        rule_execution_runtime_opened: false,
        rule_decision_written: false,
        rule_final_judgment_allowed: false,
        sensitive_hr_guard_required: true,
      }),
    },
    baseline_decisions: {
      hrx_embedded_inside_law_firm_os: true,
      separate_hrx_product_created: false,
      compensation_record_links_to_employment_contract_only: true,
      compensation_amounts_included: false,
      payroll_calculation_runtime_deferred: true,
      rule_engine_descriptor_only: true,
      rule_definition_runtime_deferred: true,
      rule_execution_runtime_deferred: true,
      rule_decision_writes_deferred: true,
      hr_ai_final_judgment_allowed: false,
      sensitive_hr_guard_required: true,
      real_employee_candidate_payroll_document_data_allowed: false,
    },
    requirement_refs: [
      "HRX-CORE-001",
      "HRX-CORE-002",
      "HRX-CORE-003",
      "HRX-GATE-001",
      "HRX-GATE-002",
      "HRX-GATE-003",
      "HRX-GATE-004",
      "HRX-GATE-005",
      "HRX-GATE-006",
    ],
    hermes_packet: createHrxCp905HermesEvidencePacket(),
    claude_packet: createHrxCp905ClaudeReviewPacket(),
    closeout_handoff: createHrxCp905CloseoutHandoff(),
    required_capabilities: HRX_CP905_REQUIREMENTS.required_capabilities,
    safety_gates: HRX_CP905_REQUIREMENTS.safety_gates,
    no_leak_guards: HRX_CP905_REQUIREMENTS.required_no_leak_guards,
    blocked_claims: HRX_BLOCKED_CLAIMS,
    ...HRX_NO_WRITE_ATTESTATION,
  });
}

export function createHrxCp906RuleEngineLeaveWorkflowBridgeCaseSet() {
  const sections = {};
  for (const [microId, titles] of Object.entries(HRX_CP906_REQUIRED_SECTION_ROWS)) {
    sections[microId] = deepFreeze({
      micro_phase_id: microId,
      row_count: titles.length,
      rows: createHrxDomainRows(microId, titles),
    });
  }
  return deepFreeze({
    pack_id: HRX_CP906_PACK_BINDING.pack_id,
    section_count: Object.keys(sections).length,
    row_count: Object.values(sections).reduce((sum, section) => sum + section.row_count, 0),
    sections,
  });
}

export function createHrxCp906HermesEvidencePacket() {
  return deepFreeze({
    gate: HRX_CP906_PACK_BINDING.hermes_gate,
    pack_id: HRX_CP906_PACK_BINDING.pack_id,
    evidence_kind: "hrx_rule_engine_leave_workflow_bridge",
    emits_runtime_receipt: false,
    required_commands: [
      "npm run rp30:validate",
      "npm run hrx:requirements:validate",
      "npm run hrx:weighted:validate",
      "npm run rp30:hrx:validate",
    ],
    evidence_fields: [
      "hrx_embedded",
      "rule_engine_tail_descriptor",
      "rule_execution_deferred",
      "rule_decision_writes_deferred",
      "leave_workflow_descriptor",
      "leave_request_payloads_deferred",
      "leave_workflow_runtime_deferred",
      "leave_approval_decision_writes_deferred",
    ],
  });
}

export function createHrxCp906ClaudeReviewPacket() {
  return deepFreeze({
    gate: HRX_CP906_PACK_BINDING.claude_gate,
    pack_id: HRX_CP906_PACK_BINDING.pack_id,
    read_only: true,
    promotes_claude_to_final_approval: false,
    review_questions: [
      "Do RuleEngine tail rows remain descriptor-only without rule definitions, rule execution runtime, decision writes, or HR AI final judgment?",
      "Do LeaveWorkflow rows remain descriptor-only without leave request payloads, workflow runtime, approval decision writes, or policy rule execution?",
      "Are real HR data, credentials, secrets, runtime receipts, permission/audit writes, and separate HRX product claims still closed?",
    ],
  });
}

export function createHrxCp906CloseoutHandoff() {
  return deepFreeze({
    from_pack_id: HRX_CP906_PACK_BINDING.pack_id,
    to_pack_id: HRX_CP906_PACK_BINDING.next_pack_id,
    next_subphase_id: HRX_CP906_PACK_BINDING.next_subphase_id,
    handoff_contract: "Continue RP30 P02 LeaveWorkflow tail rows into AttendanceWorkflow descriptors while keeping workflow execution, approval decision writes, rule execution, HR AI final judgment, real HR data, credentials, secrets, and separate-product claims closed.",
  });
}

export function createHrxCp906RuleEngineLeaveWorkflowBridgeDescriptor() {
  const caseSet = createHrxCp906RuleEngineLeaveWorkflowBridgeCaseSet();
  return deepFreeze({
    descriptor: "HrxCp906RuleEngineLeaveWorkflowBridgeDescriptor",
    source_descriptor: "HrxCp905CompensationRuleEngineBridgeDescriptor",
    pack_id: HRX_CP906_PACK_BINDING.pack_id,
    program_contract: HRX_PROGRAM_CONTRACT,
    authority_boundary: {
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: HRX_CP906_PACK_BINDING.next_pack_id,
    },
    hrx_rule_engine_leave_workflow_case_set: caseSet,
    domain_entities: {
      RuleEngine: deepFreeze({
        descriptor_only: true,
        rule_definition_included: false,
        rule_execution_runtime_opened: false,
        rule_decision_written: false,
        rule_final_judgment_allowed: false,
        sensitive_hr_guard_required: true,
      }),
      LeaveWorkflow: deepFreeze({
        descriptor_only: true,
        leave_request_payload_included: false,
        workflow_runtime_opened: false,
        approval_decision_written: false,
        policy_rule_execution_opened: false,
        sensitive_hr_guard_required: true,
      }),
    },
    baseline_decisions: {
      hrx_embedded_inside_law_firm_os: true,
      separate_hrx_product_created: false,
      rule_engine_descriptor_only: true,
      rule_definition_runtime_deferred: true,
      rule_execution_runtime_deferred: true,
      rule_decision_writes_deferred: true,
      leave_workflow_descriptor_only: true,
      leave_request_payloads_deferred: true,
      leave_workflow_runtime_deferred: true,
      leave_approval_decision_writes_deferred: true,
      leave_policy_rule_execution_deferred: true,
      payroll_calculation_runtime_deferred: true,
      hr_ai_final_judgment_allowed: false,
      sensitive_hr_guard_required: true,
      real_employee_candidate_payroll_document_data_allowed: false,
    },
    requirement_refs: [
      "HRX-CORE-001",
      "HRX-CORE-002",
      "HRX-CORE-003",
      "HRX-GATE-001",
      "HRX-GATE-002",
      "HRX-GATE-003",
      "HRX-GATE-004",
      "HRX-GATE-005",
      "HRX-GATE-006",
    ],
    hermes_packet: createHrxCp906HermesEvidencePacket(),
    claude_packet: createHrxCp906ClaudeReviewPacket(),
    closeout_handoff: createHrxCp906CloseoutHandoff(),
    required_capabilities: HRX_CP906_REQUIREMENTS.required_capabilities,
    safety_gates: HRX_CP906_REQUIREMENTS.safety_gates,
    no_leak_guards: HRX_CP906_REQUIREMENTS.required_no_leak_guards,
    blocked_claims: HRX_BLOCKED_CLAIMS,
    ...HRX_NO_WRITE_ATTESTATION,
  });
}

export function createHrxCp907LeaveAttendanceWorkflowBridgeCaseSet() {
  const sections = {};
  for (const [microId, titles] of Object.entries(HRX_CP907_REQUIRED_SECTION_ROWS)) {
    sections[microId] = deepFreeze({
      micro_phase_id: microId,
      row_count: titles.length,
      rows: createHrxDomainRows(microId, titles),
    });
  }
  return deepFreeze({
    pack_id: HRX_CP907_PACK_BINDING.pack_id,
    section_count: Object.keys(sections).length,
    row_count: Object.values(sections).reduce((sum, section) => sum + section.row_count, 0),
    sections,
  });
}

export function createHrxCp907HermesEvidencePacket() {
  return deepFreeze({
    gate: HRX_CP907_PACK_BINDING.hermes_gate,
    pack_id: HRX_CP907_PACK_BINDING.pack_id,
    evidence_kind: "hrx_leave_attendance_workflow_bridge",
    emits_runtime_receipt: false,
    required_commands: [
      "npm run rp30:validate",
      "npm run hrx:requirements:validate",
      "npm run hrx:weighted:validate",
      "npm run rp30:hrx:validate",
    ],
    evidence_fields: [
      "hrx_embedded",
      "leave_workflow_tail_descriptor",
      "leave_request_payloads_deferred",
      "leave_workflow_runtime_deferred",
      "leave_approval_decision_writes_deferred",
      "attendance_workflow_descriptor",
      "attendance_event_payloads_deferred",
      "attendance_workflow_runtime_deferred",
      "attendance_decision_writes_deferred",
    ],
  });
}

export function createHrxCp907ClaudeReviewPacket() {
  return deepFreeze({
    gate: HRX_CP907_PACK_BINDING.claude_gate,
    pack_id: HRX_CP907_PACK_BINDING.pack_id,
    read_only: true,
    promotes_claude_to_final_approval: false,
    review_questions: [
      "Do LeaveWorkflow tail rows remain descriptor-only without leave request payloads, workflow runtime, approval decision writes, or policy rule execution?",
      "Do AttendanceWorkflow rows remain descriptor-only without attendance event payloads, workflow runtime, decision writes, policy rule execution, or attendance record writes?",
      "Are real HR data, credentials, secrets, runtime receipts, permission/audit writes, and separate HRX product claims still closed?",
    ],
  });
}

export function createHrxCp907CloseoutHandoff() {
  return deepFreeze({
    from_pack_id: HRX_CP907_PACK_BINDING.pack_id,
    to_pack_id: HRX_CP907_PACK_BINDING.next_pack_id,
    next_subphase_id: HRX_CP907_PACK_BINDING.next_subphase_id,
    handoff_contract: "Continue RP30 P02 AttendanceWorkflow tail rows while keeping attendance event payloads, workflow runtime, attendance decision writes, policy rule execution, record writes, HR AI final judgment, real HR data, credentials, secrets, and separate-product claims closed.",
  });
}

export function createHrxCp907LeaveAttendanceWorkflowBridgeDescriptor() {
  const caseSet = createHrxCp907LeaveAttendanceWorkflowBridgeCaseSet();
  return deepFreeze({
    descriptor: "HrxCp907LeaveAttendanceWorkflowBridgeDescriptor",
    source_descriptor: "HrxCp906RuleEngineLeaveWorkflowBridgeDescriptor",
    pack_id: HRX_CP907_PACK_BINDING.pack_id,
    program_contract: HRX_PROGRAM_CONTRACT,
    authority_boundary: {
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: HRX_CP907_PACK_BINDING.next_pack_id,
    },
    hrx_leave_attendance_workflow_case_set: caseSet,
    domain_entities: {
      LeaveWorkflow: deepFreeze({
        descriptor_only: true,
        leave_request_payload_included: false,
        workflow_runtime_opened: false,
        approval_decision_written: false,
        policy_rule_execution_opened: false,
        sensitive_hr_guard_required: true,
      }),
      AttendanceWorkflow: deepFreeze({
        descriptor_only: true,
        attendance_event_payload_included: false,
        workflow_runtime_opened: false,
        attendance_decision_written: false,
        policy_rule_execution_opened: false,
        attendance_record_write_opened: false,
        sensitive_hr_guard_required: true,
      }),
    },
    baseline_decisions: {
      hrx_embedded_inside_law_firm_os: true,
      separate_hrx_product_created: false,
      leave_workflow_descriptor_only: true,
      leave_request_payloads_deferred: true,
      leave_workflow_runtime_deferred: true,
      leave_approval_decision_writes_deferred: true,
      leave_policy_rule_execution_deferred: true,
      attendance_workflow_descriptor_only: true,
      attendance_event_payloads_deferred: true,
      attendance_workflow_runtime_deferred: true,
      attendance_decision_writes_deferred: true,
      attendance_policy_rule_execution_deferred: true,
      attendance_record_writes_deferred: true,
      payroll_calculation_runtime_deferred: true,
      hr_ai_final_judgment_allowed: false,
      sensitive_hr_guard_required: true,
      real_employee_candidate_payroll_document_data_allowed: false,
    },
    requirement_refs: [
      "HRX-CORE-001",
      "HRX-CORE-002",
      "HRX-CORE-003",
      "HRX-GATE-001",
      "HRX-GATE-002",
      "HRX-GATE-003",
      "HRX-GATE-004",
      "HRX-GATE-005",
      "HRX-GATE-006",
    ],
    hermes_packet: createHrxCp907HermesEvidencePacket(),
    claude_packet: createHrxCp907ClaudeReviewPacket(),
    closeout_handoff: createHrxCp907CloseoutHandoff(),
    required_capabilities: HRX_CP907_REQUIREMENTS.required_capabilities,
    safety_gates: HRX_CP907_REQUIREMENTS.safety_gates,
    no_leak_guards: HRX_CP907_REQUIREMENTS.required_no_leak_guards,
    blocked_claims: HRX_BLOCKED_CLAIMS,
    ...HRX_NO_WRITE_ATTESTATION,
  });
}

export function createHrxCp908AttendanceWorkflowTailCaseSet() {
  const sections = {};
  for (const [microId, titles] of Object.entries(HRX_CP908_REQUIRED_SECTION_ROWS)) {
    sections[microId] = deepFreeze({
      micro_phase_id: microId,
      row_count: titles.length,
      rows: createHrxDomainRows(microId, titles),
    });
  }
  return deepFreeze({
    pack_id: HRX_CP908_PACK_BINDING.pack_id,
    section_count: Object.keys(sections).length,
    row_count: Object.values(sections).reduce((sum, section) => sum + section.row_count, 0),
    sections,
  });
}

export function createHrxCp908HermesEvidencePacket() {
  return deepFreeze({
    gate: HRX_CP908_PACK_BINDING.hermes_gate,
    pack_id: HRX_CP908_PACK_BINDING.pack_id,
    evidence_kind: "hrx_attendance_workflow_tail",
    emits_runtime_receipt: false,
    required_commands: [
      "npm run rp30:validate",
      "npm run hrx:requirements:validate",
      "npm run hrx:weighted:validate",
      "npm run rp30:hrx:validate",
    ],
    evidence_fields: [
      "hrx_embedded",
      "attendance_workflow_tail_descriptor",
      "attendance_event_payloads_deferred",
      "attendance_workflow_runtime_deferred",
      "attendance_decision_writes_deferred",
      "attendance_policy_rule_execution_deferred",
      "attendance_record_writes_deferred",
    ],
  });
}

export function createHrxCp908ClaudeReviewPacket() {
  return deepFreeze({
    gate: HRX_CP908_PACK_BINDING.claude_gate,
    pack_id: HRX_CP908_PACK_BINDING.pack_id,
    read_only: true,
    promotes_claude_to_final_approval: false,
    review_questions: [
      "Do AttendanceWorkflow tail rows remain descriptor-only without attendance event payloads, workflow runtime, decision writes, policy rule execution, or attendance record writes?",
      "Does the pack avoid opening leave, recruitment, payroll, HR AI final judgment, permission/audit writes, runtime receipts, or product-state writes?",
      "Are real HR data, credentials, secrets, runtime receipts, and separate HRX product claims still closed?",
    ],
  });
}

export function createHrxCp908CloseoutHandoff() {
  return deepFreeze({
    from_pack_id: HRX_CP908_PACK_BINDING.pack_id,
    to_pack_id: HRX_CP908_PACK_BINDING.next_pack_id,
    next_subphase_id: HRX_CP908_PACK_BINDING.next_subphase_id,
    handoff_contract: "Continue the final AttendanceWorkflow tail row into RecruitmentWorkflow descriptors while keeping attendance runtime, attendance record writes, recruitment runtime, HR AI final judgment, real HR data, credentials, secrets, and separate-product claims closed.",
  });
}

export function createHrxCp908AttendanceWorkflowTailDescriptor() {
  const caseSet = createHrxCp908AttendanceWorkflowTailCaseSet();
  return deepFreeze({
    descriptor: "HrxCp908AttendanceWorkflowTailDescriptor",
    source_descriptor: "HrxCp907LeaveAttendanceWorkflowBridgeDescriptor",
    pack_id: HRX_CP908_PACK_BINDING.pack_id,
    program_contract: HRX_PROGRAM_CONTRACT,
    authority_boundary: {
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: HRX_CP908_PACK_BINDING.next_pack_id,
    },
    hrx_attendance_workflow_tail_case_set: caseSet,
    domain_entities: {
      AttendanceWorkflow: deepFreeze({
        descriptor_only: true,
        attendance_event_payload_included: false,
        workflow_runtime_opened: false,
        attendance_decision_written: false,
        policy_rule_execution_opened: false,
        attendance_record_write_opened: false,
        sensitive_hr_guard_required: true,
      }),
    },
    baseline_decisions: {
      hrx_embedded_inside_law_firm_os: true,
      separate_hrx_product_created: false,
      attendance_workflow_descriptor_only: true,
      attendance_event_payloads_deferred: true,
      attendance_workflow_runtime_deferred: true,
      attendance_decision_writes_deferred: true,
      attendance_policy_rule_execution_deferred: true,
      attendance_record_writes_deferred: true,
      payroll_calculation_runtime_deferred: true,
      hr_ai_final_judgment_allowed: false,
      sensitive_hr_guard_required: true,
      real_employee_candidate_payroll_document_data_allowed: false,
    },
    requirement_refs: [
      "HRX-CORE-001",
      "HRX-CORE-002",
      "HRX-CORE-003",
      "HRX-GATE-001",
      "HRX-GATE-002",
      "HRX-GATE-003",
      "HRX-GATE-004",
      "HRX-GATE-005",
      "HRX-GATE-006",
    ],
    hermes_packet: createHrxCp908HermesEvidencePacket(),
    claude_packet: createHrxCp908ClaudeReviewPacket(),
    closeout_handoff: createHrxCp908CloseoutHandoff(),
    required_capabilities: HRX_CP908_REQUIREMENTS.required_capabilities,
    safety_gates: HRX_CP908_REQUIREMENTS.safety_gates,
    no_leak_guards: HRX_CP908_REQUIREMENTS.required_no_leak_guards,
    blocked_claims: HRX_BLOCKED_CLAIMS,
    ...HRX_NO_WRITE_ATTESTATION,
  });
}

export function createHrxCp909AttendanceRecruitmentWorkflowBridgeCaseSet() {
  const sections = {};
  for (const [microId, titles] of Object.entries(HRX_CP909_REQUIRED_SECTION_ROWS)) {
    sections[microId] = deepFreeze({
      micro_phase_id: microId,
      row_count: titles.length,
      rows: createHrxDomainRows(microId, titles),
    });
  }
  return deepFreeze({
    pack_id: HRX_CP909_PACK_BINDING.pack_id,
    section_count: Object.keys(sections).length,
    row_count: Object.values(sections).reduce((sum, section) => sum + section.row_count, 0),
    sections,
  });
}

export function createHrxCp909HermesEvidencePacket() {
  return deepFreeze({
    gate: HRX_CP909_PACK_BINDING.hermes_gate,
    pack_id: HRX_CP909_PACK_BINDING.pack_id,
    evidence_kind: "hrx_attendance_recruitment_workflow_bridge",
    emits_runtime_receipt: false,
    required_commands: [
      "npm run rp30:validate",
      "npm run hrx:requirements:validate",
      "npm run hrx:weighted:validate",
      "npm run rp30:hrx:validate",
    ],
    evidence_fields: [
      "hrx_embedded",
      "attendance_workflow_final_tail_descriptor",
      "attendance_record_writes_deferred",
      "recruitment_workflow_descriptor",
      "recruitment_candidate_payloads_deferred",
      "recruitment_workflow_runtime_deferred",
      "recruitment_decision_writes_deferred",
      "recruitment_offer_creation_deferred",
    ],
  });
}

export function createHrxCp909ClaudeReviewPacket() {
  return deepFreeze({
    gate: HRX_CP909_PACK_BINDING.claude_gate,
    pack_id: HRX_CP909_PACK_BINDING.pack_id,
    read_only: true,
    promotes_claude_to_final_approval: false,
    review_questions: [
      "Does the AttendanceWorkflow final tail row remain descriptor-only without attendance payloads, runtime, decision writes, policy rule execution, or record writes?",
      "Do RecruitmentWorkflow rows remain descriptor-only without candidate payloads, workflow runtime, recruitment decision writes, policy rule execution, record writes, or offer creation?",
      "Are real HR data, credentials, secrets, runtime receipts, permission/audit writes, and separate HRX product claims still closed?",
    ],
  });
}

export function createHrxCp909CloseoutHandoff() {
  return deepFreeze({
    from_pack_id: HRX_CP909_PACK_BINDING.pack_id,
    to_pack_id: HRX_CP909_PACK_BINDING.next_pack_id,
    next_subphase_id: HRX_CP909_PACK_BINDING.next_subphase_id,
    handoff_contract: "Continue RecruitmentWorkflow tail rows into RiskWorkflow descriptors while keeping recruitment runtime, candidate payloads, offer creation, risk runtime, HR AI final judgment, real HR data, credentials, secrets, and separate-product claims closed.",
  });
}

export function createHrxCp909AttendanceRecruitmentWorkflowBridgeDescriptor() {
  const caseSet = createHrxCp909AttendanceRecruitmentWorkflowBridgeCaseSet();
  return deepFreeze({
    descriptor: "HrxCp909AttendanceRecruitmentWorkflowBridgeDescriptor",
    source_descriptor: "HrxCp908AttendanceWorkflowTailDescriptor",
    pack_id: HRX_CP909_PACK_BINDING.pack_id,
    program_contract: HRX_PROGRAM_CONTRACT,
    authority_boundary: {
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: HRX_CP909_PACK_BINDING.next_pack_id,
    },
    hrx_attendance_recruitment_workflow_case_set: caseSet,
    domain_entities: {
      AttendanceWorkflow: deepFreeze({
        descriptor_only: true,
        attendance_event_payload_included: false,
        workflow_runtime_opened: false,
        attendance_decision_written: false,
        policy_rule_execution_opened: false,
        attendance_record_write_opened: false,
        sensitive_hr_guard_required: true,
      }),
      RecruitmentWorkflow: deepFreeze({
        descriptor_only: true,
        recruitment_candidate_payload_included: false,
        workflow_runtime_opened: false,
        recruitment_decision_written: false,
        policy_rule_execution_opened: false,
        recruitment_record_write_opened: false,
        recruitment_offer_created: false,
        sensitive_hr_guard_required: true,
      }),
    },
    baseline_decisions: {
      hrx_embedded_inside_law_firm_os: true,
      separate_hrx_product_created: false,
      attendance_workflow_descriptor_only: true,
      attendance_event_payloads_deferred: true,
      attendance_workflow_runtime_deferred: true,
      attendance_decision_writes_deferred: true,
      attendance_policy_rule_execution_deferred: true,
      attendance_record_writes_deferred: true,
      recruitment_workflow_descriptor_only: true,
      recruitment_candidate_payloads_deferred: true,
      recruitment_workflow_runtime_deferred: true,
      recruitment_decision_writes_deferred: true,
      recruitment_policy_rule_execution_deferred: true,
      recruitment_record_writes_deferred: true,
      recruitment_offer_creation_deferred: true,
      payroll_calculation_runtime_deferred: true,
      hr_ai_final_judgment_allowed: false,
      sensitive_hr_guard_required: true,
      real_employee_candidate_payroll_document_data_allowed: false,
    },
    requirement_refs: [
      "HRX-CORE-001",
      "HRX-CORE-002",
      "HRX-CORE-003",
      "HRX-GATE-001",
      "HRX-GATE-002",
      "HRX-GATE-003",
      "HRX-GATE-004",
      "HRX-GATE-005",
      "HRX-GATE-006",
    ],
    hermes_packet: createHrxCp909HermesEvidencePacket(),
    claude_packet: createHrxCp909ClaudeReviewPacket(),
    closeout_handoff: createHrxCp909CloseoutHandoff(),
    required_capabilities: HRX_CP909_REQUIREMENTS.required_capabilities,
    safety_gates: HRX_CP909_REQUIREMENTS.safety_gates,
    no_leak_guards: HRX_CP909_REQUIREMENTS.required_no_leak_guards,
    blocked_claims: HRX_BLOCKED_CLAIMS,
    ...HRX_NO_WRITE_ATTESTATION,
  });
}

export function createHrxCp910RecruitmentRiskWorkflowBridgeCaseSet() {
  const sections = {};
  for (const [microId, titles] of Object.entries(HRX_CP910_REQUIRED_SECTION_ROWS)) {
    sections[microId] = deepFreeze({
      micro_phase_id: microId,
      row_count: titles.length,
      rows: createHrxDomainRows(microId, titles),
    });
  }
  return deepFreeze({
    pack_id: HRX_CP910_PACK_BINDING.pack_id,
    section_count: Object.keys(sections).length,
    row_count: Object.values(sections).reduce((sum, section) => sum + section.row_count, 0),
    sections,
  });
}

export function createHrxCp910HermesEvidencePacket() {
  return deepFreeze({
    gate: HRX_CP910_PACK_BINDING.hermes_gate,
    pack_id: HRX_CP910_PACK_BINDING.pack_id,
    evidence_kind: "hrx_recruitment_risk_workflow_bridge",
    emits_runtime_receipt: false,
    required_commands: [
      "npm run rp30:validate",
      "npm run hrx:requirements:validate",
      "npm run hrx:weighted:validate",
      "npm run rp30:hrx:validate",
    ],
    evidence_fields: [
      "hrx_embedded",
      "recruitment_workflow_tail_descriptor",
      "recruitment_candidate_payloads_deferred",
      "recruitment_offer_creation_deferred",
      "risk_workflow_descriptor",
      "risk_event_payloads_deferred",
      "risk_workflow_runtime_deferred",
      "risk_decision_writes_deferred",
      "risk_record_writes_deferred",
      "risk_score_calculation_deferred",
    ],
  });
}

export function createHrxCp910ClaudeReviewPacket() {
  return deepFreeze({
    gate: HRX_CP910_PACK_BINDING.claude_gate,
    pack_id: HRX_CP910_PACK_BINDING.pack_id,
    read_only: true,
    promotes_claude_to_final_approval: false,
    review_questions: [
      "Do RecruitmentWorkflow tail rows remain descriptor-only without candidate payloads, workflow runtime, recruitment decision writes, policy rule execution, record writes, or offer creation?",
      "Do RiskWorkflow rows remain descriptor-only without risk event payloads, workflow runtime, risk decision writes, policy rule execution, record writes, or score calculation?",
      "Are real HR data, credentials, secrets, runtime receipts, permission/audit writes, and separate HRX product claims still closed?",
    ],
  });
}

export function createHrxCp910CloseoutHandoff() {
  return deepFreeze({
    from_pack_id: HRX_CP910_PACK_BINDING.pack_id,
    to_pack_id: HRX_CP910_PACK_BINDING.next_pack_id,
    next_subphase_id: HRX_CP910_PACK_BINDING.next_subphase_id,
    handoff_contract: "Continue RiskWorkflow tail rows into ApprovalWorkflow descriptors while keeping risk runtime, risk scores, risk decisions, approval runtime, HR AI final judgment, real HR data, credentials, secrets, and separate-product claims closed.",
  });
}

export function createHrxCp910RecruitmentRiskWorkflowBridgeDescriptor() {
  const caseSet = createHrxCp910RecruitmentRiskWorkflowBridgeCaseSet();
  return deepFreeze({
    descriptor: "HrxCp910RecruitmentRiskWorkflowBridgeDescriptor",
    source_descriptor: "HrxCp909AttendanceRecruitmentWorkflowBridgeDescriptor",
    pack_id: HRX_CP910_PACK_BINDING.pack_id,
    program_contract: HRX_PROGRAM_CONTRACT,
    authority_boundary: {
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: HRX_CP910_PACK_BINDING.next_pack_id,
    },
    hrx_recruitment_risk_workflow_case_set: caseSet,
    domain_entities: {
      RecruitmentWorkflow: deepFreeze({
        descriptor_only: true,
        recruitment_candidate_payload_included: false,
        workflow_runtime_opened: false,
        recruitment_decision_written: false,
        policy_rule_execution_opened: false,
        recruitment_record_write_opened: false,
        recruitment_offer_created: false,
        sensitive_hr_guard_required: true,
      }),
      RiskWorkflow: deepFreeze({
        descriptor_only: true,
        risk_event_payload_included: false,
        workflow_runtime_opened: false,
        risk_decision_written: false,
        policy_rule_execution_opened: false,
        risk_record_write_opened: false,
        risk_score_calculated: false,
        sensitive_hr_guard_required: true,
      }),
    },
    baseline_decisions: {
      hrx_embedded_inside_law_firm_os: true,
      separate_hrx_product_created: false,
      recruitment_workflow_descriptor_only: true,
      recruitment_candidate_payloads_deferred: true,
      recruitment_workflow_runtime_deferred: true,
      recruitment_decision_writes_deferred: true,
      recruitment_policy_rule_execution_deferred: true,
      recruitment_record_writes_deferred: true,
      recruitment_offer_creation_deferred: true,
      risk_workflow_descriptor_only: true,
      risk_event_payloads_deferred: true,
      risk_workflow_runtime_deferred: true,
      risk_decision_writes_deferred: true,
      risk_policy_rule_execution_deferred: true,
      risk_record_writes_deferred: true,
      risk_score_calculation_deferred: true,
      payroll_calculation_runtime_deferred: true,
      hr_ai_final_judgment_allowed: false,
      sensitive_hr_guard_required: true,
      real_employee_candidate_payroll_document_data_allowed: false,
    },
    requirement_refs: [
      "HRX-CORE-001",
      "HRX-CORE-002",
      "HRX-CORE-003",
      "HRX-GATE-001",
      "HRX-GATE-002",
      "HRX-GATE-003",
      "HRX-GATE-004",
      "HRX-GATE-005",
      "HRX-GATE-006",
    ],
    hermes_packet: createHrxCp910HermesEvidencePacket(),
    claude_packet: createHrxCp910ClaudeReviewPacket(),
    closeout_handoff: createHrxCp910CloseoutHandoff(),
    required_capabilities: HRX_CP910_REQUIREMENTS.required_capabilities,
    safety_gates: HRX_CP910_REQUIREMENTS.safety_gates,
    no_leak_guards: HRX_CP910_REQUIREMENTS.required_no_leak_guards,
    blocked_claims: HRX_BLOCKED_CLAIMS,
    ...HRX_NO_WRITE_ATTESTATION,
  });
}

export function createHrxCp911RiskApprovalWorkflowBridgeCaseSet() {
  const sections = {};
  for (const [microId, titles] of Object.entries(HRX_CP911_REQUIRED_SECTION_ROWS)) {
    sections[microId] = deepFreeze({
      micro_phase_id: microId,
      row_count: titles.length,
      rows: createHrxDomainRows(microId, titles),
    });
  }
  return deepFreeze({
    pack_id: HRX_CP911_PACK_BINDING.pack_id,
    section_count: Object.keys(sections).length,
    row_count: Object.values(sections).reduce((sum, section) => sum + section.row_count, 0),
    sections,
  });
}

export function createHrxCp911HermesEvidencePacket() {
  return deepFreeze({
    gate: HRX_CP911_PACK_BINDING.hermes_gate,
    pack_id: HRX_CP911_PACK_BINDING.pack_id,
    evidence_kind: "hrx_risk_approval_workflow_bridge",
    emits_runtime_receipt: false,
    required_commands: [
      "npm run rp30:validate",
      "npm run hrx:requirements:validate",
      "npm run hrx:weighted:validate",
      "npm run rp30:hrx:validate",
    ],
    evidence_fields: [
      "hrx_embedded",
      "risk_workflow_tail_descriptor",
      "risk_score_calculation_deferred",
      "risk_record_writes_deferred",
      "approval_workflow_descriptor",
      "approval_request_payloads_deferred",
      "approval_workflow_runtime_deferred",
      "approval_decision_writes_deferred",
      "approval_record_writes_deferred",
    ],
  });
}

export function createHrxCp911ClaudeReviewPacket() {
  return deepFreeze({
    gate: HRX_CP911_PACK_BINDING.claude_gate,
    pack_id: HRX_CP911_PACK_BINDING.pack_id,
    read_only: true,
    promotes_claude_to_final_approval: false,
    review_questions: [
      "Do RiskWorkflow tail rows remain descriptor-only without risk event payloads, workflow runtime, risk decision writes, policy rule execution, record writes, or score calculation?",
      "Do ApprovalWorkflow security-audit rows remain descriptor-only without approval request payloads, workflow runtime, approval decision writes, policy rule execution, record writes, or delegation runtime?",
      "Are real HR data, credentials, secrets, runtime receipts, permission/audit writes, and separate HRX product claims still closed?",
    ],
  });
}

export function createHrxCp911CloseoutHandoff() {
  return deepFreeze({
    from_pack_id: HRX_CP911_PACK_BINDING.pack_id,
    to_pack_id: HRX_CP911_PACK_BINDING.next_pack_id,
    next_subphase_id: HRX_CP911_PACK_BINDING.next_subphase_id,
    handoff_contract: "Continue ApprovalWorkflow tail rows into RuleEngine descriptors while keeping approval runtime, approval decisions, delegation runtime, rule runtime, HR AI final judgment, real HR data, credentials, secrets, and separate-product claims closed.",
  });
}

export function createHrxCp911RiskApprovalWorkflowBridgeDescriptor() {
  const caseSet = createHrxCp911RiskApprovalWorkflowBridgeCaseSet();
  return deepFreeze({
    descriptor: "HrxCp911RiskApprovalWorkflowBridgeDescriptor",
    source_descriptor: "HrxCp910RecruitmentRiskWorkflowBridgeDescriptor",
    pack_id: HRX_CP911_PACK_BINDING.pack_id,
    program_contract: HRX_PROGRAM_CONTRACT,
    authority_boundary: {
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: HRX_CP911_PACK_BINDING.next_pack_id,
    },
    hrx_risk_approval_workflow_case_set: caseSet,
    domain_entities: {
      RiskWorkflow: deepFreeze({
        descriptor_only: true,
        risk_event_payload_included: false,
        workflow_runtime_opened: false,
        risk_decision_written: false,
        policy_rule_execution_opened: false,
        risk_record_write_opened: false,
        risk_score_calculated: false,
        sensitive_hr_guard_required: true,
      }),
      ApprovalWorkflow: deepFreeze({
        descriptor_only: true,
        approval_request_payload_included: false,
        workflow_runtime_opened: false,
        approval_decision_written: false,
        policy_rule_execution_opened: false,
        approval_record_write_opened: false,
        approval_delegation_runtime_opened: false,
        sensitive_hr_guard_required: true,
      }),
    },
    baseline_decisions: {
      hrx_embedded_inside_law_firm_os: true,
      separate_hrx_product_created: false,
      risk_workflow_descriptor_only: true,
      risk_event_payloads_deferred: true,
      risk_workflow_runtime_deferred: true,
      risk_decision_writes_deferred: true,
      risk_policy_rule_execution_deferred: true,
      risk_record_writes_deferred: true,
      risk_score_calculation_deferred: true,
      approval_workflow_descriptor_only: true,
      approval_request_payloads_deferred: true,
      approval_workflow_runtime_deferred: true,
      approval_decision_writes_deferred: true,
      approval_policy_rule_execution_deferred: true,
      approval_record_writes_deferred: true,
      approval_delegation_runtime_deferred: true,
      payroll_calculation_runtime_deferred: true,
      hr_ai_final_judgment_allowed: false,
      sensitive_hr_guard_required: true,
      real_employee_candidate_payroll_document_data_allowed: false,
    },
    requirement_refs: [
      "HRX-CORE-001",
      "HRX-CORE-002",
      "HRX-CORE-003",
      "HRX-GATE-001",
      "HRX-GATE-002",
      "HRX-GATE-003",
      "HRX-GATE-004",
      "HRX-GATE-005",
      "HRX-GATE-006",
    ],
    hermes_packet: createHrxCp911HermesEvidencePacket(),
    claude_packet: createHrxCp911ClaudeReviewPacket(),
    closeout_handoff: createHrxCp911CloseoutHandoff(),
    required_capabilities: HRX_CP911_REQUIREMENTS.required_capabilities,
    safety_gates: HRX_CP911_REQUIREMENTS.safety_gates,
    no_leak_guards: HRX_CP911_REQUIREMENTS.required_no_leak_guards,
    blocked_claims: HRX_BLOCKED_CLAIMS,
    ...HRX_NO_WRITE_ATTESTATION,
  });
}

export function createHrxCp912ApprovalRuleEngineBridgeCaseSet() {
  const sections = {};
  for (const [microId, titles] of Object.entries(HRX_CP912_REQUIRED_SECTION_ROWS)) {
    sections[microId] = deepFreeze({
      micro_phase_id: microId,
      row_count: titles.length,
      rows: createHrxDomainRows(microId, titles),
    });
  }
  return deepFreeze({
    pack_id: HRX_CP912_PACK_BINDING.pack_id,
    section_count: Object.keys(sections).length,
    row_count: Object.values(sections).reduce((sum, section) => sum + section.row_count, 0),
    sections,
  });
}

export function createHrxCp912HermesEvidencePacket() {
  return deepFreeze({
    gate: HRX_CP912_PACK_BINDING.hermes_gate,
    pack_id: HRX_CP912_PACK_BINDING.pack_id,
    evidence_kind: "hrx_approval_rule_engine_bridge",
    emits_runtime_receipt: false,
    required_commands: [
      "npm run rp30:validate",
      "npm run hrx:requirements:validate",
      "npm run hrx:weighted:validate",
      "npm run rp30:hrx:validate",
    ],
    evidence_fields: [
      "hrx_embedded",
      "approval_workflow_tail_descriptor",
      "approval_request_payloads_deferred",
      "approval_workflow_runtime_deferred",
      "approval_decision_writes_deferred",
      "approval_delegation_runtime_deferred",
      "rule_engine_reentry_descriptor",
      "rule_definitions_deferred",
      "rule_execution_runtime_deferred",
      "rule_decision_writes_deferred",
    ],
  });
}

export function createHrxCp912ClaudeReviewPacket() {
  return deepFreeze({
    gate: HRX_CP912_PACK_BINDING.claude_gate,
    pack_id: HRX_CP912_PACK_BINDING.pack_id,
    read_only: true,
    promotes_claude_to_final_approval: false,
    review_questions: [
      "Do ApprovalWorkflow tail rows remain descriptor-only without approval request payloads, workflow runtime, approval decision writes, policy rule execution, record writes, or delegation runtime?",
      "Does the RuleEngine re-entry row remain descriptor-only without rule definitions, rule execution runtime, rule decision writes, or HR AI final judgment?",
      "Are real HR data, credentials, secrets, runtime receipts, permission/audit writes, and separate HRX product claims still closed?",
    ],
  });
}

export function createHrxCp912CloseoutHandoff() {
  return deepFreeze({
    from_pack_id: HRX_CP912_PACK_BINDING.pack_id,
    to_pack_id: HRX_CP912_PACK_BINDING.next_pack_id,
    next_subphase_id: HRX_CP912_PACK_BINDING.next_subphase_id,
    handoff_contract: "Continue RuleEngine tail rows while keeping rule definitions, rule execution runtime, rule decisions, HR AI final judgment, real HR data, credentials, secrets, and separate-product claims closed.",
  });
}

export function createHrxCp912ApprovalRuleEngineBridgeDescriptor() {
  const caseSet = createHrxCp912ApprovalRuleEngineBridgeCaseSet();
  return deepFreeze({
    descriptor: "HrxCp912ApprovalRuleEngineBridgeDescriptor",
    source_descriptor: "HrxCp911RiskApprovalWorkflowBridgeDescriptor",
    pack_id: HRX_CP912_PACK_BINDING.pack_id,
    program_contract: HRX_PROGRAM_CONTRACT,
    authority_boundary: {
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: HRX_CP912_PACK_BINDING.next_pack_id,
    },
    hrx_approval_rule_engine_case_set: caseSet,
    domain_entities: {
      ApprovalWorkflow: deepFreeze({
        descriptor_only: true,
        approval_request_payload_included: false,
        workflow_runtime_opened: false,
        approval_decision_written: false,
        policy_rule_execution_opened: false,
        approval_record_write_opened: false,
        approval_delegation_runtime_opened: false,
        sensitive_hr_guard_required: true,
      }),
      RuleEngine: deepFreeze({
        descriptor_only: true,
        rule_definition_included: false,
        rule_execution_runtime_opened: false,
        rule_decision_written: false,
        rule_final_judgment_allowed: false,
        sensitive_hr_guard_required: true,
      }),
    },
    baseline_decisions: {
      hrx_embedded_inside_law_firm_os: true,
      separate_hrx_product_created: false,
      approval_workflow_descriptor_only: true,
      approval_request_payloads_deferred: true,
      approval_workflow_runtime_deferred: true,
      approval_decision_writes_deferred: true,
      approval_policy_rule_execution_deferred: true,
      approval_record_writes_deferred: true,
      approval_delegation_runtime_deferred: true,
      rule_engine_descriptor_only: true,
      rule_definitions_deferred: true,
      rule_execution_runtime_deferred: true,
      rule_decision_writes_deferred: true,
      rule_final_judgment_allowed: false,
      payroll_calculation_runtime_deferred: true,
      hr_ai_final_judgment_allowed: false,
      sensitive_hr_guard_required: true,
      real_employee_candidate_payroll_document_data_allowed: false,
    },
    requirement_refs: [
      "HRX-CORE-001",
      "HRX-CORE-002",
      "HRX-CORE-003",
      "HRX-GATE-001",
      "HRX-GATE-002",
      "HRX-GATE-003",
      "HRX-GATE-004",
      "HRX-GATE-005",
      "HRX-GATE-006",
    ],
    hermes_packet: createHrxCp912HermesEvidencePacket(),
    claude_packet: createHrxCp912ClaudeReviewPacket(),
    closeout_handoff: createHrxCp912CloseoutHandoff(),
    required_capabilities: HRX_CP912_REQUIREMENTS.required_capabilities,
    safety_gates: HRX_CP912_REQUIREMENTS.safety_gates,
    no_leak_guards: HRX_CP912_REQUIREMENTS.required_no_leak_guards,
    blocked_claims: HRX_BLOCKED_CLAIMS,
    ...HRX_NO_WRITE_ATTESTATION,
  });
}

export function createHrxCp913RuleEngineTailCaseSet() {
  const sections = {};
  for (const [microId, titles] of Object.entries(HRX_CP913_REQUIRED_SECTION_ROWS)) {
    sections[microId] = deepFreeze({
      micro_phase_id: microId,
      row_count: titles.length,
      rows: createHrxDomainRows(microId, titles),
    });
  }
  return deepFreeze({
    pack_id: HRX_CP913_PACK_BINDING.pack_id,
    section_count: Object.keys(sections).length,
    row_count: Object.values(sections).reduce((sum, section) => sum + section.row_count, 0),
    sections,
  });
}

export function createHrxCp913HermesEvidencePacket() {
  return deepFreeze({
    gate: HRX_CP913_PACK_BINDING.hermes_gate,
    pack_id: HRX_CP913_PACK_BINDING.pack_id,
    evidence_kind: "hrx_rule_engine_tail",
    emits_runtime_receipt: false,
    required_commands: [
      "npm run rp30:validate",
      "npm run hrx:requirements:validate",
      "npm run hrx:weighted:validate",
      "npm run rp30:hrx:validate",
    ],
    evidence_fields: [
      "hrx_embedded",
      "rule_engine_tail_descriptor",
      "rule_definitions_deferred",
      "rule_execution_runtime_deferred",
      "rule_decision_writes_deferred",
      "rule_final_judgment_deferred",
    ],
  });
}

export function createHrxCp913ClaudeReviewPacket() {
  return deepFreeze({
    gate: HRX_CP913_PACK_BINDING.claude_gate,
    pack_id: HRX_CP913_PACK_BINDING.pack_id,
    read_only: true,
    promotes_claude_to_final_approval: false,
    review_questions: [
      "Do RuleEngine tail rows remain descriptor-only without rule definitions, rule execution runtime, rule decision writes, or HR AI final judgment?",
      "Does the pack avoid runtime receipts, permission/audit writes, product-state writes, payroll runtime, credentials, secrets, and real HR data?",
      "Does the closeout handoff route only the next descriptor slice and avoid claiming runtime or enterprise-trust readiness?",
    ],
  });
}

export function createHrxCp913CloseoutHandoff() {
  return deepFreeze({
    from_pack_id: HRX_CP913_PACK_BINDING.pack_id,
    to_pack_id: HRX_CP913_PACK_BINDING.next_pack_id,
    next_subphase_id: HRX_CP913_PACK_BINDING.next_subphase_id,
    handoff_contract: "Continue the final RuleEngine tail row into LeaveWorkflow descriptors while keeping rule execution, leave workflow runtime, leave decisions, HR AI final judgment, real HR data, credentials, secrets, and separate-product claims closed.",
  });
}

export function createHrxCp913RuleEngineTailDescriptor() {
  const caseSet = createHrxCp913RuleEngineTailCaseSet();
  return deepFreeze({
    descriptor: "HrxCp913RuleEngineTailDescriptor",
    source_descriptor: "HrxCp912ApprovalRuleEngineBridgeDescriptor",
    pack_id: HRX_CP913_PACK_BINDING.pack_id,
    program_contract: HRX_PROGRAM_CONTRACT,
    authority_boundary: {
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: HRX_CP913_PACK_BINDING.next_pack_id,
    },
    hrx_rule_engine_tail_case_set: caseSet,
    domain_entities: {
      RuleEngine: deepFreeze({
        descriptor_only: true,
        rule_definition_included: false,
        rule_execution_runtime_opened: false,
        rule_decision_written: false,
        rule_final_judgment_allowed: false,
        sensitive_hr_guard_required: true,
      }),
    },
    baseline_decisions: {
      hrx_embedded_inside_law_firm_os: true,
      separate_hrx_product_created: false,
      rule_engine_descriptor_only: true,
      rule_definitions_deferred: true,
      rule_execution_runtime_deferred: true,
      rule_decision_writes_deferred: true,
      rule_final_judgment_allowed: false,
      payroll_calculation_runtime_deferred: true,
      hr_ai_final_judgment_allowed: false,
      sensitive_hr_guard_required: true,
      real_employee_candidate_payroll_document_data_allowed: false,
    },
    requirement_refs: [
      "HRX-CORE-001",
      "HRX-CORE-002",
      "HRX-CORE-003",
      "HRX-GATE-001",
      "HRX-GATE-002",
      "HRX-GATE-003",
      "HRX-GATE-004",
      "HRX-GATE-005",
      "HRX-GATE-006",
    ],
    hermes_packet: createHrxCp913HermesEvidencePacket(),
    claude_packet: createHrxCp913ClaudeReviewPacket(),
    closeout_handoff: createHrxCp913CloseoutHandoff(),
    required_capabilities: HRX_CP913_REQUIREMENTS.required_capabilities,
    safety_gates: HRX_CP913_REQUIREMENTS.safety_gates,
    no_leak_guards: HRX_CP913_REQUIREMENTS.required_no_leak_guards,
    blocked_claims: HRX_BLOCKED_CLAIMS,
    ...HRX_NO_WRITE_ATTESTATION,
  });
}

export function createHrxCp914RuleEngineLeaveWorkflowBridgeCaseSet() {
  const sections = {};
  for (const [microId, titles] of Object.entries(HRX_CP914_REQUIRED_SECTION_ROWS)) {
    sections[microId] = deepFreeze({
      micro_phase_id: microId,
      row_count: titles.length,
      rows: createHrxDomainRows(microId, titles),
    });
  }
  return deepFreeze({
    pack_id: HRX_CP914_PACK_BINDING.pack_id,
    section_count: Object.keys(sections).length,
    row_count: Object.values(sections).reduce((sum, section) => sum + section.row_count, 0),
    sections,
  });
}

export function createHrxCp914HermesEvidencePacket() {
  return deepFreeze({
    gate: HRX_CP914_PACK_BINDING.hermes_gate,
    pack_id: HRX_CP914_PACK_BINDING.pack_id,
    evidence_kind: "hrx_rule_engine_leave_workflow_tail_bridge",
    emits_runtime_receipt: false,
    required_commands: [
      "npm run rp30:validate",
      "npm run hrx:requirements:validate",
      "npm run hrx:weighted:validate",
      "npm run rp30:hrx:validate",
    ],
    evidence_fields: [
      "hrx_embedded",
      "rule_engine_final_tail_descriptor",
      "rule_definitions_deferred",
      "rule_execution_runtime_deferred",
      "rule_decision_writes_deferred",
      "leave_workflow_reentry_descriptor",
      "leave_request_payloads_deferred",
      "leave_workflow_runtime_deferred",
      "leave_approval_decision_writes_deferred",
    ],
  });
}

export function createHrxCp914ClaudeReviewPacket() {
  return deepFreeze({
    gate: HRX_CP914_PACK_BINDING.claude_gate,
    pack_id: HRX_CP914_PACK_BINDING.pack_id,
    read_only: true,
    promotes_claude_to_final_approval: false,
    review_questions: [
      "Does the final RuleEngine tail row remain descriptor-only without rule definitions, rule execution runtime, rule decision writes, or HR AI final judgment?",
      "Do LeaveWorkflow re-entry rows remain descriptor-only without leave request payloads, workflow runtime, approval decision writes, or policy rule execution?",
      "Are real HR data, credentials, secrets, runtime receipts, permission/audit writes, and separate HRX product claims still closed?",
    ],
  });
}

export function createHrxCp914CloseoutHandoff() {
  return deepFreeze({
    from_pack_id: HRX_CP914_PACK_BINDING.pack_id,
    to_pack_id: HRX_CP914_PACK_BINDING.next_pack_id,
    next_subphase_id: HRX_CP914_PACK_BINDING.next_subphase_id,
    handoff_contract: "Continue RP30 P02 LeaveWorkflow tail rows into AttendanceWorkflow descriptors while keeping leave request payloads, workflow runtime, approval decision writes, policy rule execution, HR AI final judgment, real HR data, credentials, secrets, and separate-product claims closed.",
  });
}

export function createHrxCp914RuleEngineLeaveWorkflowBridgeDescriptor() {
  const caseSet = createHrxCp914RuleEngineLeaveWorkflowBridgeCaseSet();
  return deepFreeze({
    descriptor: "HrxCp914RuleEngineLeaveWorkflowBridgeDescriptor",
    source_descriptor: "HrxCp913RuleEngineTailDescriptor",
    pack_id: HRX_CP914_PACK_BINDING.pack_id,
    program_contract: HRX_PROGRAM_CONTRACT,
    authority_boundary: {
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: HRX_CP914_PACK_BINDING.next_pack_id,
    },
    hrx_rule_engine_leave_workflow_bridge_case_set: caseSet,
    domain_entities: {
      RuleEngine: deepFreeze({
        descriptor_only: true,
        rule_definition_included: false,
        rule_execution_runtime_opened: false,
        rule_decision_written: false,
        rule_final_judgment_allowed: false,
        sensitive_hr_guard_required: true,
      }),
      LeaveWorkflow: deepFreeze({
        descriptor_only: true,
        leave_request_payload_included: false,
        workflow_runtime_opened: false,
        approval_decision_written: false,
        policy_rule_execution_opened: false,
        sensitive_hr_guard_required: true,
      }),
    },
    baseline_decisions: {
      hrx_embedded_inside_law_firm_os: true,
      separate_hrx_product_created: false,
      rule_engine_descriptor_only: true,
      rule_definition_runtime_deferred: true,
      rule_definitions_deferred: true,
      rule_execution_runtime_deferred: true,
      rule_decision_writes_deferred: true,
      rule_final_judgment_allowed: false,
      leave_workflow_descriptor_only: true,
      leave_request_payloads_deferred: true,
      leave_workflow_runtime_deferred: true,
      leave_approval_decision_writes_deferred: true,
      leave_policy_rule_execution_deferred: true,
      payroll_calculation_runtime_deferred: true,
      hr_ai_final_judgment_allowed: false,
      sensitive_hr_guard_required: true,
      real_employee_candidate_payroll_document_data_allowed: false,
    },
    requirement_refs: [
      "HRX-CORE-001",
      "HRX-CORE-002",
      "HRX-CORE-003",
      "HRX-GATE-001",
      "HRX-GATE-002",
      "HRX-GATE-003",
      "HRX-GATE-004",
      "HRX-GATE-005",
      "HRX-GATE-006",
    ],
    hermes_packet: createHrxCp914HermesEvidencePacket(),
    claude_packet: createHrxCp914ClaudeReviewPacket(),
    closeout_handoff: createHrxCp914CloseoutHandoff(),
    required_capabilities: HRX_CP914_REQUIREMENTS.required_capabilities,
    safety_gates: HRX_CP914_REQUIREMENTS.safety_gates,
    no_leak_guards: HRX_CP914_REQUIREMENTS.required_no_leak_guards,
    blocked_claims: HRX_BLOCKED_CLAIMS,
    ...HRX_NO_WRITE_ATTESTATION,
  });
}

export function createHrxCp915LeaveAttendanceWorkflowBridgeCaseSet() {
  const sections = {};
  for (const [microId, titles] of Object.entries(HRX_CP915_REQUIRED_SECTION_ROWS)) {
    sections[microId] = deepFreeze({
      micro_phase_id: microId,
      row_count: titles.length,
      rows: createHrxDomainRows(microId, titles),
    });
  }
  return deepFreeze({
    pack_id: HRX_CP915_PACK_BINDING.pack_id,
    section_count: Object.keys(sections).length,
    row_count: Object.values(sections).reduce((sum, section) => sum + section.row_count, 0),
    sections,
  });
}

export function createHrxCp915HermesEvidencePacket() {
  return deepFreeze({
    gate: HRX_CP915_PACK_BINDING.hermes_gate,
    pack_id: HRX_CP915_PACK_BINDING.pack_id,
    evidence_kind: "hrx_leave_attendance_workflow_tail_bridge",
    emits_runtime_receipt: false,
    required_commands: [
      "npm run rp30:validate",
      "npm run hrx:requirements:validate",
      "npm run hrx:weighted:validate",
      "npm run rp30:hrx:validate",
    ],
    evidence_fields: [
      "hrx_embedded",
      "leave_workflow_final_tail_descriptor",
      "leave_request_payloads_deferred",
      "leave_workflow_runtime_deferred",
      "leave_approval_decision_writes_deferred",
      "attendance_workflow_reentry_descriptor",
      "attendance_event_payloads_deferred",
      "attendance_workflow_runtime_deferred",
      "attendance_decision_writes_deferred",
    ],
  });
}

export function createHrxCp915ClaudeReviewPacket() {
  return deepFreeze({
    gate: HRX_CP915_PACK_BINDING.claude_gate,
    pack_id: HRX_CP915_PACK_BINDING.pack_id,
    read_only: true,
    promotes_claude_to_final_approval: false,
    review_questions: [
      "Do LeaveWorkflow final tail rows remain descriptor-only without leave request payloads, workflow runtime, approval decision writes, or policy rule execution?",
      "Do AttendanceWorkflow re-entry rows remain descriptor-only without attendance event payloads, workflow runtime, decision writes, policy rule execution, or attendance record writes?",
      "Are real HR data, credentials, secrets, runtime receipts, permission/audit writes, and separate HRX product claims still closed?",
    ],
  });
}

export function createHrxCp915CloseoutHandoff() {
  return deepFreeze({
    from_pack_id: HRX_CP915_PACK_BINDING.pack_id,
    to_pack_id: HRX_CP915_PACK_BINDING.next_pack_id,
    next_subphase_id: HRX_CP915_PACK_BINDING.next_subphase_id,
    handoff_contract: "Continue RP30 P02 AttendanceWorkflow tail rows into RecruitmentWorkflow descriptors while keeping attendance event payloads, workflow runtime, attendance decision writes, policy rule execution, record writes, recruitment runtime, HR AI final judgment, real HR data, credentials, secrets, and separate-product claims closed.",
  });
}

export function createHrxCp915LeaveAttendanceWorkflowBridgeDescriptor() {
  const caseSet = createHrxCp915LeaveAttendanceWorkflowBridgeCaseSet();
  return deepFreeze({
    descriptor: "HrxCp915LeaveAttendanceWorkflowBridgeDescriptor",
    source_descriptor: "HrxCp914RuleEngineLeaveWorkflowBridgeDescriptor",
    pack_id: HRX_CP915_PACK_BINDING.pack_id,
    program_contract: HRX_PROGRAM_CONTRACT,
    authority_boundary: {
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: HRX_CP915_PACK_BINDING.next_pack_id,
    },
    hrx_leave_attendance_workflow_bridge_case_set: caseSet,
    domain_entities: {
      LeaveWorkflow: deepFreeze({
        descriptor_only: true,
        leave_request_payload_included: false,
        workflow_runtime_opened: false,
        approval_decision_written: false,
        policy_rule_execution_opened: false,
        sensitive_hr_guard_required: true,
      }),
      AttendanceWorkflow: deepFreeze({
        descriptor_only: true,
        attendance_event_payload_included: false,
        workflow_runtime_opened: false,
        attendance_decision_written: false,
        policy_rule_execution_opened: false,
        attendance_record_write_opened: false,
        sensitive_hr_guard_required: true,
      }),
    },
    baseline_decisions: {
      hrx_embedded_inside_law_firm_os: true,
      separate_hrx_product_created: false,
      leave_workflow_descriptor_only: true,
      leave_request_payloads_deferred: true,
      leave_workflow_runtime_deferred: true,
      leave_approval_decision_writes_deferred: true,
      leave_policy_rule_execution_deferred: true,
      attendance_workflow_descriptor_only: true,
      attendance_event_payloads_deferred: true,
      attendance_workflow_runtime_deferred: true,
      attendance_decision_writes_deferred: true,
      attendance_policy_rule_execution_deferred: true,
      attendance_record_writes_deferred: true,
      payroll_calculation_runtime_deferred: true,
      hr_ai_final_judgment_allowed: false,
      sensitive_hr_guard_required: true,
      real_employee_candidate_payroll_document_data_allowed: false,
    },
    requirement_refs: [
      "HRX-CORE-001",
      "HRX-CORE-002",
      "HRX-CORE-003",
      "HRX-GATE-001",
      "HRX-GATE-002",
      "HRX-GATE-003",
      "HRX-GATE-004",
      "HRX-GATE-005",
      "HRX-GATE-006",
    ],
    hermes_packet: createHrxCp915HermesEvidencePacket(),
    claude_packet: createHrxCp915ClaudeReviewPacket(),
    closeout_handoff: createHrxCp915CloseoutHandoff(),
    required_capabilities: HRX_CP915_REQUIREMENTS.required_capabilities,
    safety_gates: HRX_CP915_REQUIREMENTS.safety_gates,
    no_leak_guards: HRX_CP915_REQUIREMENTS.required_no_leak_guards,
    blocked_claims: HRX_BLOCKED_CLAIMS,
    ...HRX_NO_WRITE_ATTESTATION,
  });
}

export function createHrxCp916AttendanceRecruitmentWorkflowBridgeCaseSet() {
  const sections = {};
  for (const [microId, titles] of Object.entries(HRX_CP916_REQUIRED_SECTION_ROWS)) {
    sections[microId] = deepFreeze({
      micro_phase_id: microId,
      row_count: titles.length,
      rows: createHrxDomainRows(microId, titles),
    });
  }
  return deepFreeze({
    pack_id: HRX_CP916_PACK_BINDING.pack_id,
    section_count: Object.keys(sections).length,
    row_count: Object.values(sections).reduce((sum, section) => sum + section.row_count, 0),
    sections,
  });
}

export function createHrxCp916HermesEvidencePacket() {
  return deepFreeze({
    gate: HRX_CP916_PACK_BINDING.hermes_gate,
    pack_id: HRX_CP916_PACK_BINDING.pack_id,
    evidence_kind: "hrx_attendance_recruitment_workflow_tail_bridge",
    emits_runtime_receipt: false,
    required_commands: [
      "npm run rp30:validate",
      "npm run hrx:requirements:validate",
      "npm run hrx:weighted:validate",
      "npm run rp30:hrx:validate",
    ],
    evidence_fields: [
      "hrx_embedded",
      "attendance_workflow_tail_descriptor",
      "attendance_event_payloads_deferred",
      "attendance_workflow_runtime_deferred",
      "attendance_decision_writes_deferred",
      "attendance_record_writes_deferred",
      "recruitment_workflow_reentry_descriptor",
      "recruitment_candidate_payloads_deferred",
      "recruitment_workflow_runtime_deferred",
      "recruitment_decision_writes_deferred",
    ],
  });
}

export function createHrxCp916ClaudeReviewPacket() {
  return deepFreeze({
    gate: HRX_CP916_PACK_BINDING.claude_gate,
    pack_id: HRX_CP916_PACK_BINDING.pack_id,
    read_only: true,
    promotes_claude_to_final_approval: false,
    review_questions: [
      "Do AttendanceWorkflow tail rows remain descriptor-only without attendance event payloads, workflow runtime, decision writes, policy rule execution, or attendance record writes?",
      "Do RecruitmentWorkflow re-entry rows remain descriptor-only without candidate payloads, workflow runtime, recruitment decision writes, policy rule execution, record writes, or offer creation?",
      "Are real HR data, credentials, secrets, runtime receipts, permission/audit writes, and separate HRX product claims still closed?",
    ],
  });
}

export function createHrxCp916CloseoutHandoff() {
  return deepFreeze({
    from_pack_id: HRX_CP916_PACK_BINDING.pack_id,
    to_pack_id: HRX_CP916_PACK_BINDING.next_pack_id,
    next_subphase_id: HRX_CP916_PACK_BINDING.next_subphase_id,
    handoff_contract: "Continue RP30 P02 RecruitmentWorkflow tail rows into RiskWorkflow descriptors while keeping recruitment candidate payloads, offer creation, workflow runtime, recruitment decision writes, risk runtime, HR AI final judgment, real HR data, credentials, secrets, and separate-product claims closed.",
  });
}

export function createHrxCp916AttendanceRecruitmentWorkflowBridgeDescriptor() {
  const caseSet = createHrxCp916AttendanceRecruitmentWorkflowBridgeCaseSet();
  return deepFreeze({
    descriptor: "HrxCp916AttendanceRecruitmentWorkflowBridgeDescriptor",
    source_descriptor: "HrxCp915LeaveAttendanceWorkflowBridgeDescriptor",
    pack_id: HRX_CP916_PACK_BINDING.pack_id,
    program_contract: HRX_PROGRAM_CONTRACT,
    authority_boundary: {
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: HRX_CP916_PACK_BINDING.next_pack_id,
    },
    hrx_attendance_recruitment_workflow_bridge_case_set: caseSet,
    domain_entities: {
      AttendanceWorkflow: deepFreeze({
        descriptor_only: true,
        attendance_event_payload_included: false,
        workflow_runtime_opened: false,
        attendance_decision_written: false,
        policy_rule_execution_opened: false,
        attendance_record_write_opened: false,
        sensitive_hr_guard_required: true,
      }),
      RecruitmentWorkflow: deepFreeze({
        descriptor_only: true,
        recruitment_candidate_payload_included: false,
        workflow_runtime_opened: false,
        recruitment_decision_written: false,
        policy_rule_execution_opened: false,
        recruitment_record_write_opened: false,
        recruitment_offer_created: false,
        sensitive_hr_guard_required: true,
      }),
    },
    baseline_decisions: {
      hrx_embedded_inside_law_firm_os: true,
      separate_hrx_product_created: false,
      attendance_workflow_descriptor_only: true,
      attendance_event_payloads_deferred: true,
      attendance_workflow_runtime_deferred: true,
      attendance_decision_writes_deferred: true,
      attendance_policy_rule_execution_deferred: true,
      attendance_record_writes_deferred: true,
      recruitment_workflow_descriptor_only: true,
      recruitment_candidate_payloads_deferred: true,
      recruitment_workflow_runtime_deferred: true,
      recruitment_decision_writes_deferred: true,
      recruitment_policy_rule_execution_deferred: true,
      recruitment_record_writes_deferred: true,
      recruitment_offer_creation_deferred: true,
      payroll_calculation_runtime_deferred: true,
      hr_ai_final_judgment_allowed: false,
      sensitive_hr_guard_required: true,
      real_employee_candidate_payroll_document_data_allowed: false,
    },
    requirement_refs: [
      "HRX-CORE-001",
      "HRX-CORE-002",
      "HRX-CORE-003",
      "HRX-GATE-001",
      "HRX-GATE-002",
      "HRX-GATE-003",
      "HRX-GATE-004",
      "HRX-GATE-005",
      "HRX-GATE-006",
    ],
    hermes_packet: createHrxCp916HermesEvidencePacket(),
    claude_packet: createHrxCp916ClaudeReviewPacket(),
    closeout_handoff: createHrxCp916CloseoutHandoff(),
    required_capabilities: HRX_CP916_REQUIREMENTS.required_capabilities,
    safety_gates: HRX_CP916_REQUIREMENTS.safety_gates,
    no_leak_guards: HRX_CP916_REQUIREMENTS.required_no_leak_guards,
    blocked_claims: HRX_BLOCKED_CLAIMS,
    ...HRX_NO_WRITE_ATTESTATION,
  });
}

export function createHrxCp917RecruitmentRiskWorkflowBridgeCaseSet() {
  const sections = {};
  for (const [microId, titles] of Object.entries(HRX_CP917_REQUIRED_SECTION_ROWS)) {
    sections[microId] = deepFreeze({
      micro_phase_id: microId,
      row_count: titles.length,
      rows: createHrxDomainRows(microId, titles),
    });
  }
  return deepFreeze({
    pack_id: HRX_CP917_PACK_BINDING.pack_id,
    section_count: Object.keys(sections).length,
    row_count: Object.values(sections).reduce((sum, section) => sum + section.row_count, 0),
    sections,
  });
}

export function createHrxCp917HermesEvidencePacket() {
  return deepFreeze({
    gate: HRX_CP917_PACK_BINDING.hermes_gate,
    pack_id: HRX_CP917_PACK_BINDING.pack_id,
    evidence_kind: "hrx_recruitment_risk_workflow_tail_bridge",
    emits_runtime_receipt: false,
    required_commands: [
      "npm run rp30:validate",
      "npm run hrx:requirements:validate",
      "npm run hrx:weighted:validate",
      "npm run rp30:hrx:validate",
    ],
    evidence_fields: [
      "hrx_embedded",
      "recruitment_workflow_tail_descriptor",
      "recruitment_candidate_payloads_deferred",
      "recruitment_offer_creation_deferred",
      "risk_workflow_reentry_descriptor",
      "risk_event_payloads_deferred",
      "risk_workflow_runtime_deferred",
      "risk_decision_writes_deferred",
      "risk_record_writes_deferred",
      "risk_score_calculation_deferred",
    ],
  });
}

export function createHrxCp917ClaudeReviewPacket() {
  return deepFreeze({
    gate: HRX_CP917_PACK_BINDING.claude_gate,
    pack_id: HRX_CP917_PACK_BINDING.pack_id,
    read_only: true,
    promotes_claude_to_final_approval: false,
    review_questions: [
      "Do RecruitmentWorkflow tail rows remain descriptor-only without candidate payloads, workflow runtime, recruitment decision writes, policy rule execution, record writes, or offer creation?",
      "Do RiskWorkflow re-entry rows remain descriptor-only without risk event payloads, workflow runtime, risk decision writes, policy rule execution, record writes, or score calculation?",
      "Are real HR data, credentials, secrets, runtime receipts, permission/audit writes, and separate HRX product claims still closed?",
    ],
  });
}

export function createHrxCp917CloseoutHandoff() {
  return deepFreeze({
    from_pack_id: HRX_CP917_PACK_BINDING.pack_id,
    to_pack_id: HRX_CP917_PACK_BINDING.next_pack_id,
    next_subphase_id: HRX_CP917_PACK_BINDING.next_subphase_id,
    handoff_contract: "Continue RP30 P02 RiskWorkflow tail rows into the RP30 P03 HRApi foundation while keeping risk event payloads, risk workflow runtime, risk decisions, risk scores, HR API runtime, HR AI final judgment, real HR data, credentials, secrets, and separate-product claims closed.",
  });
}

export function createHrxCp917RecruitmentRiskWorkflowBridgeDescriptor() {
  const caseSet = createHrxCp917RecruitmentRiskWorkflowBridgeCaseSet();
  return deepFreeze({
    descriptor: "HrxCp917RecruitmentRiskWorkflowBridgeDescriptor",
    source_descriptor: "HrxCp916AttendanceRecruitmentWorkflowBridgeDescriptor",
    pack_id: HRX_CP917_PACK_BINDING.pack_id,
    program_contract: HRX_PROGRAM_CONTRACT,
    authority_boundary: {
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: HRX_CP917_PACK_BINDING.next_pack_id,
    },
    hrx_recruitment_risk_workflow_bridge_case_set: caseSet,
    domain_entities: {
      RecruitmentWorkflow: deepFreeze({
        descriptor_only: true,
        recruitment_candidate_payload_included: false,
        workflow_runtime_opened: false,
        recruitment_decision_written: false,
        policy_rule_execution_opened: false,
        recruitment_record_write_opened: false,
        recruitment_offer_created: false,
        sensitive_hr_guard_required: true,
      }),
      RiskWorkflow: deepFreeze({
        descriptor_only: true,
        risk_event_payload_included: false,
        workflow_runtime_opened: false,
        risk_decision_written: false,
        policy_rule_execution_opened: false,
        risk_record_write_opened: false,
        risk_score_calculated: false,
        sensitive_hr_guard_required: true,
      }),
    },
    baseline_decisions: {
      hrx_embedded_inside_law_firm_os: true,
      separate_hrx_product_created: false,
      recruitment_workflow_descriptor_only: true,
      recruitment_candidate_payloads_deferred: true,
      recruitment_workflow_runtime_deferred: true,
      recruitment_decision_writes_deferred: true,
      recruitment_policy_rule_execution_deferred: true,
      recruitment_record_writes_deferred: true,
      recruitment_offer_creation_deferred: true,
      risk_workflow_descriptor_only: true,
      risk_event_payloads_deferred: true,
      risk_workflow_runtime_deferred: true,
      risk_decision_writes_deferred: true,
      risk_policy_rule_execution_deferred: true,
      risk_record_writes_deferred: true,
      risk_score_calculation_deferred: true,
      payroll_calculation_runtime_deferred: true,
      hr_ai_final_judgment_allowed: false,
      sensitive_hr_guard_required: true,
      real_employee_candidate_payroll_document_data_allowed: false,
    },
    requirement_refs: [
      "HRX-CORE-001",
      "HRX-CORE-002",
      "HRX-CORE-003",
      "HRX-GATE-001",
      "HRX-GATE-002",
      "HRX-GATE-003",
      "HRX-GATE-004",
      "HRX-GATE-005",
      "HRX-GATE-006",
    ],
    hermes_packet: createHrxCp917HermesEvidencePacket(),
    claude_packet: createHrxCp917ClaudeReviewPacket(),
    closeout_handoff: createHrxCp917CloseoutHandoff(),
    required_capabilities: HRX_CP917_REQUIREMENTS.required_capabilities,
    safety_gates: HRX_CP917_REQUIREMENTS.safety_gates,
    no_leak_guards: HRX_CP917_REQUIREMENTS.required_no_leak_guards,
    blocked_claims: HRX_BLOCKED_CLAIMS,
    ...HRX_NO_WRITE_ATTESTATION,
  });
}

export function createHrxCp918RiskHrApiFoundationBridgeCaseSet() {
  const sections = {};
  for (const [microId, titles] of Object.entries(HRX_CP918_REQUIRED_SECTION_ROWS)) {
    sections[microId] = deepFreeze({
      micro_phase_id: microId,
      row_count: titles.length,
      rows: createHrxDomainRows(microId, titles),
    });
  }
  return deepFreeze({
    pack_id: HRX_CP918_PACK_BINDING.pack_id,
    section_count: Object.keys(sections).length,
    row_count: Object.values(sections).reduce((sum, section) => sum + section.row_count, 0),
    sections,
  });
}

export function createHrxCp918HermesEvidencePacket() {
  return deepFreeze({
    gate: HRX_CP918_PACK_BINDING.hermes_gate,
    pack_id: HRX_CP918_PACK_BINDING.pack_id,
    evidence_kind: "hrx_risk_hr_api_foundation_bridge",
    emits_runtime_receipt: false,
    required_commands: [
      "npm run rp30:validate",
      "npm run hrx:requirements:validate",
      "npm run hrx:weighted:validate",
      "npm run rp30:hrx:validate",
    ],
    evidence_fields: [
      "hrx_embedded",
      "risk_workflow_tail_descriptor",
      "risk_event_payloads_deferred",
      "risk_workflow_runtime_deferred",
      "risk_score_calculation_deferred",
      "hr_api_foundation_descriptor",
      "hr_api_request_payloads_deferred",
      "hr_api_response_payloads_deferred",
      "hr_api_runtime_deferred",
      "hr_api_record_writes_deferred",
    ],
  });
}

export function createHrxCp918ClaudeReviewPacket() {
  return deepFreeze({
    gate: HRX_CP918_PACK_BINDING.claude_gate,
    pack_id: HRX_CP918_PACK_BINDING.pack_id,
    read_only: true,
    promotes_claude_to_final_approval: false,
    review_questions: [
      "Do RiskWorkflow tail rows remain descriptor-only without risk event payloads, workflow runtime, risk decision writes, record writes, or score calculation?",
      "Does the HRApi foundation row remain descriptor-only without API request/response payloads, runtime, record writes, or product-state writes?",
      "Are real HR data, credentials, secrets, runtime receipts, permission/audit writes, and separate HRX product claims still closed?",
    ],
  });
}

export function createHrxCp918CloseoutHandoff() {
  return deepFreeze({
    from_pack_id: HRX_CP918_PACK_BINDING.pack_id,
    to_pack_id: HRX_CP918_PACK_BINDING.next_pack_id,
    next_subphase_id: HRX_CP918_PACK_BINDING.next_subphase_id,
    handoff_contract: "Continue RP30 P03 HRApi rows into EmployeeApi and LeaveApi descriptors while keeping API request/response payloads, API runtime, record writes, HR AI final judgment, real HR data, credentials, secrets, and separate-product claims closed.",
  });
}

export function createHrxCp918RiskHrApiFoundationBridgeDescriptor() {
  const caseSet = createHrxCp918RiskHrApiFoundationBridgeCaseSet();
  return deepFreeze({
    descriptor: "HrxCp918RiskHrApiFoundationBridgeDescriptor",
    source_descriptor: "HrxCp917RecruitmentRiskWorkflowBridgeDescriptor",
    pack_id: HRX_CP918_PACK_BINDING.pack_id,
    program_contract: HRX_PROGRAM_CONTRACT,
    authority_boundary: {
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: HRX_CP918_PACK_BINDING.next_pack_id,
    },
    hrx_risk_hr_api_foundation_bridge_case_set: caseSet,
    domain_entities: {
      RiskWorkflow: deepFreeze({
        descriptor_only: true,
        risk_event_payload_included: false,
        workflow_runtime_opened: false,
        risk_decision_written: false,
        policy_rule_execution_opened: false,
        risk_record_write_opened: false,
        risk_score_calculated: false,
        sensitive_hr_guard_required: true,
      }),
      HRApi: deepFreeze({
        descriptor_only: true,
        hr_api_request_payload_included: false,
        hr_api_response_payload_included: false,
        hr_api_runtime_opened: false,
        hr_api_record_write_opened: false,
        sensitive_hr_guard_required: true,
      }),
    },
    baseline_decisions: {
      hrx_embedded_inside_law_firm_os: true,
      separate_hrx_product_created: false,
      risk_workflow_descriptor_only: true,
      risk_event_payloads_deferred: true,
      risk_workflow_runtime_deferred: true,
      risk_decision_writes_deferred: true,
      risk_policy_rule_execution_deferred: true,
      risk_record_writes_deferred: true,
      risk_score_calculation_deferred: true,
      hr_api_descriptor_only: true,
      hr_api_request_payloads_deferred: true,
      hr_api_response_payloads_deferred: true,
      hr_api_runtime_deferred: true,
      hr_api_record_writes_deferred: true,
      payroll_calculation_runtime_deferred: true,
      hr_ai_final_judgment_allowed: false,
      sensitive_hr_guard_required: true,
      real_employee_candidate_payroll_document_data_allowed: false,
    },
    requirement_refs: [
      "HRX-CORE-001",
      "HRX-CORE-002",
      "HRX-CORE-003",
      "HRX-GATE-001",
      "HRX-GATE-002",
      "HRX-GATE-003",
      "HRX-GATE-004",
      "HRX-GATE-005",
      "HRX-GATE-006",
    ],
    hermes_packet: createHrxCp918HermesEvidencePacket(),
    claude_packet: createHrxCp918ClaudeReviewPacket(),
    closeout_handoff: createHrxCp918CloseoutHandoff(),
    required_capabilities: HRX_CP918_REQUIREMENTS.required_capabilities,
    safety_gates: HRX_CP918_REQUIREMENTS.safety_gates,
    no_leak_guards: HRX_CP918_REQUIREMENTS.required_no_leak_guards,
    blocked_claims: HRX_BLOCKED_CLAIMS,
    ...HRX_NO_WRITE_ATTESTATION,
  });
}

export function createHrxCp919HrEmployeeLeaveApiBridgeCaseSet() {
  const sections = {};
  for (const [microId, titles] of Object.entries(HRX_CP919_REQUIRED_SECTION_ROWS)) {
    sections[microId] = deepFreeze({
      micro_phase_id: microId,
      row_count: titles.length,
      rows: createHrxDomainRows(microId, titles),
    });
  }
  return deepFreeze({
    pack_id: HRX_CP919_PACK_BINDING.pack_id,
    section_count: Object.keys(sections).length,
    row_count: Object.values(sections).reduce((sum, section) => sum + section.row_count, 0),
    sections,
  });
}

export function createHrxCp919HermesEvidencePacket() {
  return deepFreeze({
    gate: HRX_CP919_PACK_BINDING.hermes_gate,
    pack_id: HRX_CP919_PACK_BINDING.pack_id,
    evidence_kind: "hrx_hr_employee_leave_api_bridge",
    emits_runtime_receipt: false,
    required_commands: [
      "npm run rp30:validate",
      "npm run hrx:requirements:validate",
      "npm run hrx:weighted:validate",
      "npm run rp30:hrx:validate",
    ],
    evidence_fields: [
      "hrx_embedded",
      "hr_api_tail_descriptor",
      "employee_api_foundation_descriptor",
      "leave_api_foundation_descriptor",
      "api_request_payloads_deferred",
      "api_response_payloads_deferred",
      "api_runtime_deferred",
      "api_record_writes_deferred",
    ],
  });
}

export function createHrxCp919ClaudeReviewPacket() {
  return deepFreeze({
    gate: HRX_CP919_PACK_BINDING.claude_gate,
    pack_id: HRX_CP919_PACK_BINDING.pack_id,
    read_only: true,
    promotes_claude_to_final_approval: false,
    review_questions: [
      "Do HRApi tail rows remain descriptor-only without API request/response payloads, runtime, record writes, or product-state writes?",
      "Do EmployeeApi and LeaveApi foundation rows remain descriptor-only without API payloads, runtime, record writes, or HR AI final judgment?",
      "Are real HR data, credentials, secrets, runtime receipts, permission/audit writes, and separate HRX product claims still closed?",
    ],
  });
}

export function createHrxCp919CloseoutHandoff() {
  return deepFreeze({
    from_pack_id: HRX_CP919_PACK_BINDING.pack_id,
    to_pack_id: HRX_CP919_PACK_BINDING.next_pack_id,
    next_subphase_id: HRX_CP919_PACK_BINDING.next_subphase_id,
    handoff_contract: "Continue RP30 P03 LeaveApi tail rows into CandidateApi and EvidenceApi descriptors while keeping API request/response payloads, API runtime, record writes, HR AI final judgment, real HR data, credentials, secrets, and separate-product claims closed.",
  });
}

export function createHrxCp919HrEmployeeLeaveApiBridgeDescriptor() {
  const caseSet = createHrxCp919HrEmployeeLeaveApiBridgeCaseSet();
  return deepFreeze({
    descriptor: "HrxCp919HrEmployeeLeaveApiBridgeDescriptor",
    source_descriptor: "HrxCp918RiskHrApiFoundationBridgeDescriptor",
    pack_id: HRX_CP919_PACK_BINDING.pack_id,
    program_contract: HRX_PROGRAM_CONTRACT,
    authority_boundary: {
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: HRX_CP919_PACK_BINDING.next_pack_id,
    },
    hrx_hr_employee_leave_api_bridge_case_set: caseSet,
    domain_entities: {
      HRApi: deepFreeze({
        descriptor_only: true,
        hr_api_request_payload_included: false,
        hr_api_response_payload_included: false,
        hr_api_runtime_opened: false,
        hr_api_record_write_opened: false,
        sensitive_hr_guard_required: true,
      }),
      EmployeeApi: deepFreeze({
        descriptor_only: true,
        employee_api_request_payload_included: false,
        employee_api_response_payload_included: false,
        employee_api_runtime_opened: false,
        employee_api_record_write_opened: false,
        sensitive_hr_guard_required: true,
      }),
      LeaveApi: deepFreeze({
        descriptor_only: true,
        leave_api_request_payload_included: false,
        leave_api_response_payload_included: false,
        leave_api_runtime_opened: false,
        leave_api_record_write_opened: false,
        sensitive_hr_guard_required: true,
      }),
    },
    baseline_decisions: {
      hrx_embedded_inside_law_firm_os: true,
      separate_hrx_product_created: false,
      hr_api_descriptor_only: true,
      hr_api_request_payloads_deferred: true,
      hr_api_response_payloads_deferred: true,
      hr_api_runtime_deferred: true,
      hr_api_record_writes_deferred: true,
      employee_api_descriptor_only: true,
      employee_api_request_payloads_deferred: true,
      employee_api_response_payloads_deferred: true,
      employee_api_runtime_deferred: true,
      employee_api_record_writes_deferred: true,
      leave_api_descriptor_only: true,
      leave_api_request_payloads_deferred: true,
      leave_api_response_payloads_deferred: true,
      leave_api_runtime_deferred: true,
      leave_api_record_writes_deferred: true,
      payroll_calculation_runtime_deferred: true,
      hr_ai_final_judgment_allowed: false,
      sensitive_hr_guard_required: true,
      real_employee_candidate_payroll_document_data_allowed: false,
    },
    requirement_refs: [
      "HRX-CORE-001",
      "HRX-CORE-002",
      "HRX-CORE-003",
      "HRX-GATE-001",
      "HRX-GATE-002",
      "HRX-GATE-003",
      "HRX-GATE-004",
      "HRX-GATE-005",
      "HRX-GATE-006",
    ],
    hermes_packet: createHrxCp919HermesEvidencePacket(),
    claude_packet: createHrxCp919ClaudeReviewPacket(),
    closeout_handoff: createHrxCp919CloseoutHandoff(),
    required_capabilities: HRX_CP919_REQUIREMENTS.required_capabilities,
    safety_gates: HRX_CP919_REQUIREMENTS.safety_gates,
    no_leak_guards: HRX_CP919_REQUIREMENTS.required_no_leak_guards,
    blocked_claims: HRX_BLOCKED_CLAIMS,
    ...HRX_NO_WRITE_ATTESTATION,
  });
}

export function createHrxCp920LeaveCandidateEvidenceApiBridgeCaseSet() {
  const sections = {};
  for (const [microId, titles] of Object.entries(HRX_CP920_REQUIRED_SECTION_ROWS)) {
    sections[microId] = deepFreeze({
      micro_phase_id: microId,
      row_count: titles.length,
      rows: createHrxDomainRows(microId, titles),
    });
  }
  return deepFreeze({
    pack_id: HRX_CP920_PACK_BINDING.pack_id,
    section_count: Object.keys(sections).length,
    row_count: Object.values(sections).reduce((sum, section) => sum + section.row_count, 0),
    sections,
  });
}

export function createHrxCp920HermesEvidencePacket() {
  return deepFreeze({
    gate: HRX_CP920_PACK_BINDING.hermes_gate,
    pack_id: HRX_CP920_PACK_BINDING.pack_id,
    evidence_kind: "hrx_leave_candidate_evidence_api_bridge",
    emits_runtime_receipt: false,
    required_commands: [
      "npm run rp30:validate",
      "npm run hrx:requirements:validate",
      "npm run hrx:weighted:validate",
      "npm run rp30:hrx:validate",
    ],
    evidence_fields: [
      "hrx_embedded",
      "leave_api_tail_descriptor",
      "candidate_api_foundation_descriptor",
      "evidence_api_foundation_descriptor",
      "api_request_payloads_deferred",
      "api_response_payloads_deferred",
      "api_runtime_deferred",
      "api_record_writes_deferred",
    ],
  });
}

export function createHrxCp920ClaudeReviewPacket() {
  return deepFreeze({
    gate: HRX_CP920_PACK_BINDING.claude_gate,
    pack_id: HRX_CP920_PACK_BINDING.pack_id,
    read_only: true,
    promotes_claude_to_final_approval: false,
    review_questions: [
      "Do LeaveApi tail rows remain descriptor-only without API request/response payloads, runtime, record writes, or product-state writes?",
      "Do CandidateApi and EvidenceApi foundation rows remain descriptor-only without API payloads, runtime, record writes, or HR AI final judgment?",
      "Are real HR data, credentials, secrets, runtime receipts, permission/audit writes, and separate HRX product claims still closed?",
    ],
  });
}

export function createHrxCp920CloseoutHandoff() {
  return deepFreeze({
    from_pack_id: HRX_CP920_PACK_BINDING.pack_id,
    to_pack_id: HRX_CP920_PACK_BINDING.next_pack_id,
    next_subphase_id: HRX_CP920_PACK_BINDING.next_subphase_id,
    handoff_contract: "Continue RP30 P03 EvidenceApi tail rows into IntegrationApi descriptors while keeping API request/response payloads, API runtime, record writes, HR AI final judgment, real HR data, credentials, secrets, and separate-product claims closed.",
  });
}

export function createHrxCp920LeaveCandidateEvidenceApiBridgeDescriptor() {
  const caseSet = createHrxCp920LeaveCandidateEvidenceApiBridgeCaseSet();
  return deepFreeze({
    descriptor: "HrxCp920LeaveCandidateEvidenceApiBridgeDescriptor",
    source_descriptor: "HrxCp919HrEmployeeLeaveApiBridgeDescriptor",
    pack_id: HRX_CP920_PACK_BINDING.pack_id,
    program_contract: HRX_PROGRAM_CONTRACT,
    authority_boundary: {
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: HRX_CP920_PACK_BINDING.next_pack_id,
    },
    hrx_leave_candidate_evidence_api_bridge_case_set: caseSet,
    domain_entities: {
      LeaveApi: deepFreeze({
        descriptor_only: true,
        leave_api_request_payload_included: false,
        leave_api_response_payload_included: false,
        leave_api_runtime_opened: false,
        leave_api_record_write_opened: false,
        sensitive_hr_guard_required: true,
      }),
      CandidateApi: deepFreeze({
        descriptor_only: true,
        candidate_api_request_payload_included: false,
        candidate_api_response_payload_included: false,
        candidate_api_runtime_opened: false,
        candidate_api_record_write_opened: false,
        sensitive_hr_guard_required: true,
      }),
      EvidenceApi: deepFreeze({
        descriptor_only: true,
        evidence_api_request_payload_included: false,
        evidence_api_response_payload_included: false,
        evidence_api_runtime_opened: false,
        evidence_api_record_write_opened: false,
        sensitive_hr_guard_required: true,
      }),
    },
    baseline_decisions: {
      hrx_embedded_inside_law_firm_os: true,
      separate_hrx_product_created: false,
      leave_api_descriptor_only: true,
      leave_api_request_payloads_deferred: true,
      leave_api_response_payloads_deferred: true,
      leave_api_runtime_deferred: true,
      leave_api_record_writes_deferred: true,
      candidate_api_descriptor_only: true,
      candidate_api_request_payloads_deferred: true,
      candidate_api_response_payloads_deferred: true,
      candidate_api_runtime_deferred: true,
      candidate_api_record_writes_deferred: true,
      evidence_api_descriptor_only: true,
      evidence_api_request_payloads_deferred: true,
      evidence_api_response_payloads_deferred: true,
      evidence_api_runtime_deferred: true,
      evidence_api_record_writes_deferred: true,
      payroll_calculation_runtime_deferred: true,
      hr_ai_final_judgment_allowed: false,
      sensitive_hr_guard_required: true,
      real_employee_candidate_payroll_document_data_allowed: false,
    },
    requirement_refs: [
      "HRX-CORE-001",
      "HRX-CORE-002",
      "HRX-CORE-003",
      "HRX-GATE-001",
      "HRX-GATE-002",
      "HRX-GATE-003",
      "HRX-GATE-004",
      "HRX-GATE-005",
      "HRX-GATE-006",
    ],
    hermes_packet: createHrxCp920HermesEvidencePacket(),
    claude_packet: createHrxCp920ClaudeReviewPacket(),
    closeout_handoff: createHrxCp920CloseoutHandoff(),
    required_capabilities: HRX_CP920_REQUIREMENTS.required_capabilities,
    safety_gates: HRX_CP920_REQUIREMENTS.safety_gates,
    no_leak_guards: HRX_CP920_REQUIREMENTS.required_no_leak_guards,
    blocked_claims: HRX_BLOCKED_CLAIMS,
    ...HRX_NO_WRITE_ATTESTATION,
  });
}

export function createHrxCp921EvidenceErrorModelBridgeCaseSet() {
  const sections = {};
  for (const [microId, titles] of Object.entries(HRX_CP921_REQUIRED_SECTION_ROWS)) {
    sections[microId] = deepFreeze({
      micro_phase_id: microId,
      row_count: titles.length,
      rows: createHrxDomainRows(microId, titles),
    });
  }
  return deepFreeze({
    pack_id: HRX_CP921_PACK_BINDING.pack_id,
    section_count: Object.keys(sections).length,
    row_count: Object.values(sections).reduce((sum, section) => sum + section.row_count, 0),
    sections,
  });
}

export function createHrxCp921HermesEvidencePacket() {
  return deepFreeze({
    gate: HRX_CP921_PACK_BINDING.hermes_gate,
    pack_id: HRX_CP921_PACK_BINDING.pack_id,
    evidence_kind: "hrx_evidence_error_model_bridge",
    emits_runtime_receipt: false,
    required_commands: [
      "npm run rp30:validate",
      "npm run hrx:requirements:validate",
      "npm run hrx:weighted:validate",
      "npm run rp30:hrx:validate",
    ],
    evidence_fields: [
      "hrx_embedded",
      "evidence_api_tail_descriptor",
      "error_model_security_audit_descriptor",
      "api_request_payloads_deferred",
      "api_response_payloads_deferred",
      "error_payloads_deferred",
      "api_runtime_deferred",
      "error_model_runtime_deferred",
      "record_writes_deferred",
    ],
  });
}

export function createHrxCp921ClaudeReviewPacket() {
  return deepFreeze({
    gate: HRX_CP921_PACK_BINDING.claude_gate,
    pack_id: HRX_CP921_PACK_BINDING.pack_id,
    read_only: true,
    promotes_claude_to_final_approval: false,
    review_questions: [
      "Do EvidenceApi tail rows remain descriptor-only without API request/response payloads, runtime, record writes, or product-state writes?",
      "Do ErrorModel security-audit rows remain descriptor-only without error payloads, runtime, record writes, policy-rule execution, or HR AI final judgment?",
      "Are real HR data, credentials, secrets, runtime receipts, permission/audit writes, and separate HRX product claims still closed?",
    ],
  });
}

export function createHrxCp921CloseoutHandoff() {
  return deepFreeze({
    from_pack_id: HRX_CP921_PACK_BINDING.pack_id,
    to_pack_id: HRX_CP921_PACK_BINDING.next_pack_id,
    next_subphase_id: HRX_CP921_PACK_BINDING.next_subphase_id,
    handoff_contract: "Continue RP30 P03 ErrorModel tail rows into PermissionAudit descriptors while keeping error payloads, API request/response payloads, runtime, record writes, HR AI final judgment, real HR data, credentials, secrets, and separate-product claims closed.",
  });
}

export function createHrxCp921EvidenceErrorModelBridgeDescriptor() {
  const caseSet = createHrxCp921EvidenceErrorModelBridgeCaseSet();
  return deepFreeze({
    descriptor: "HrxCp921EvidenceErrorModelBridgeDescriptor",
    source_descriptor: "HrxCp920LeaveCandidateEvidenceApiBridgeDescriptor",
    pack_id: HRX_CP921_PACK_BINDING.pack_id,
    program_contract: HRX_PROGRAM_CONTRACT,
    authority_boundary: {
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: HRX_CP921_PACK_BINDING.next_pack_id,
    },
    hrx_evidence_error_model_bridge_case_set: caseSet,
    domain_entities: {
      EvidenceApi: deepFreeze({
        descriptor_only: true,
        evidence_api_request_payload_included: false,
        evidence_api_response_payload_included: false,
        evidence_api_runtime_opened: false,
        evidence_api_record_write_opened: false,
        sensitive_hr_guard_required: true,
      }),
      ErrorModel: deepFreeze({
        descriptor_only: true,
        error_code_payload_included: false,
        error_response_payload_included: false,
        error_model_runtime_opened: false,
        error_model_record_write_opened: false,
        error_policy_rule_execution_opened: false,
        sensitive_hr_guard_required: true,
      }),
    },
    baseline_decisions: {
      hrx_embedded_inside_law_firm_os: true,
      separate_hrx_product_created: false,
      evidence_api_descriptor_only: true,
      evidence_api_request_payloads_deferred: true,
      evidence_api_response_payloads_deferred: true,
      evidence_api_runtime_deferred: true,
      evidence_api_record_writes_deferred: true,
      error_model_descriptor_only: true,
      error_code_payloads_deferred: true,
      error_response_payloads_deferred: true,
      error_model_runtime_deferred: true,
      error_model_record_writes_deferred: true,
      error_policy_rule_execution_deferred: true,
      payroll_calculation_runtime_deferred: true,
      hr_ai_final_judgment_allowed: false,
      sensitive_hr_guard_required: true,
      real_employee_candidate_payroll_document_data_allowed: false,
    },
    requirement_refs: [
      "HRX-CORE-001",
      "HRX-CORE-002",
      "HRX-CORE-003",
      "HRX-GATE-001",
      "HRX-GATE-002",
      "HRX-GATE-003",
      "HRX-GATE-004",
      "HRX-GATE-005",
      "HRX-GATE-006",
    ],
    hermes_packet: createHrxCp921HermesEvidencePacket(),
    claude_packet: createHrxCp921ClaudeReviewPacket(),
    closeout_handoff: createHrxCp921CloseoutHandoff(),
    required_capabilities: HRX_CP921_REQUIREMENTS.required_capabilities,
    safety_gates: HRX_CP921_REQUIREMENTS.safety_gates,
    no_leak_guards: HRX_CP921_REQUIREMENTS.required_no_leak_guards,
    blocked_claims: HRX_BLOCKED_CLAIMS,
    ...HRX_NO_WRITE_ATTESTATION,
  });
}

export function createHrxCp922ErrorModelHrEmployeeApiBridgeCaseSet() {
  const sections = {};
  for (const [microId, titles] of Object.entries(HRX_CP922_REQUIRED_SECTION_ROWS)) {
    sections[microId] = deepFreeze({
      micro_phase_id: microId,
      row_count: titles.length,
      rows: createHrxDomainRows(microId, titles),
    });
  }
  return deepFreeze({
    pack_id: HRX_CP922_PACK_BINDING.pack_id,
    section_count: Object.keys(sections).length,
    row_count: Object.values(sections).reduce((sum, section) => sum + section.row_count, 0),
    sections,
  });
}

export function createHrxCp922HermesEvidencePacket() {
  return deepFreeze({
    gate: HRX_CP922_PACK_BINDING.hermes_gate,
    pack_id: HRX_CP922_PACK_BINDING.pack_id,
    evidence_kind: "hrx_error_model_hr_employee_api_bridge",
    emits_runtime_receipt: false,
    required_commands: [
      "npm run rp30:validate",
      "npm run hrx:requirements:validate",
      "npm run hrx:weighted:validate",
      "npm run rp30:hrx:validate",
    ],
    evidence_fields: [
      "hrx_embedded",
      "error_model_tail_descriptor",
      "hr_api_reentry_descriptor",
      "employee_api_reentry_descriptor",
      "api_request_payloads_deferred",
      "api_response_payloads_deferred",
      "error_payloads_deferred",
      "runtime_deferred",
      "record_writes_deferred",
    ],
  });
}

export function createHrxCp922ClaudeReviewPacket() {
  return deepFreeze({
    gate: HRX_CP922_PACK_BINDING.claude_gate,
    pack_id: HRX_CP922_PACK_BINDING.pack_id,
    read_only: true,
    promotes_claude_to_final_approval: false,
    review_questions: [
      "Do ErrorModel tail rows remain descriptor-only without error payloads, runtime, record writes, policy-rule execution, or product-state writes?",
      "Do HRApi and EmployeeApi re-entry rows remain descriptor-only without API payloads, runtime, record writes, or HR AI final judgment?",
      "Are real HR data, credentials, secrets, runtime receipts, permission/audit writes, and separate HRX product claims still closed?",
    ],
  });
}

export function createHrxCp922CloseoutHandoff() {
  return deepFreeze({
    from_pack_id: HRX_CP922_PACK_BINDING.pack_id,
    to_pack_id: HRX_CP922_PACK_BINDING.next_pack_id,
    next_subphase_id: HRX_CP922_PACK_BINDING.next_subphase_id,
    handoff_contract: "Continue RP30 P03 EmployeeApi tail rows into LeaveApi and CandidateApi descriptors while keeping API payloads, runtime, record writes, HR AI final judgment, real HR data, credentials, secrets, and separate-product claims closed.",
  });
}

export function createHrxCp922ErrorModelHrEmployeeApiBridgeDescriptor() {
  const caseSet = createHrxCp922ErrorModelHrEmployeeApiBridgeCaseSet();
  return deepFreeze({
    descriptor: "HrxCp922ErrorModelHrEmployeeApiBridgeDescriptor",
    source_descriptor: "HrxCp921EvidenceErrorModelBridgeDescriptor",
    pack_id: HRX_CP922_PACK_BINDING.pack_id,
    program_contract: HRX_PROGRAM_CONTRACT,
    authority_boundary: {
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: HRX_CP922_PACK_BINDING.next_pack_id,
    },
    hrx_error_model_hr_employee_api_bridge_case_set: caseSet,
    domain_entities: {
      ErrorModel: deepFreeze({
        descriptor_only: true,
        error_code_payload_included: false,
        error_response_payload_included: false,
        error_model_runtime_opened: false,
        error_model_record_write_opened: false,
        error_policy_rule_execution_opened: false,
        sensitive_hr_guard_required: true,
      }),
      HRApi: deepFreeze({
        descriptor_only: true,
        hr_api_request_payload_included: false,
        hr_api_response_payload_included: false,
        hr_api_runtime_opened: false,
        hr_api_record_write_opened: false,
        sensitive_hr_guard_required: true,
      }),
      EmployeeApi: deepFreeze({
        descriptor_only: true,
        employee_api_request_payload_included: false,
        employee_api_response_payload_included: false,
        employee_api_runtime_opened: false,
        employee_api_record_write_opened: false,
        sensitive_hr_guard_required: true,
      }),
    },
    baseline_decisions: {
      hrx_embedded_inside_law_firm_os: true,
      separate_hrx_product_created: false,
      error_model_descriptor_only: true,
      error_code_payloads_deferred: true,
      error_response_payloads_deferred: true,
      error_model_runtime_deferred: true,
      error_model_record_writes_deferred: true,
      error_policy_rule_execution_deferred: true,
      hr_api_descriptor_only: true,
      hr_api_request_payloads_deferred: true,
      hr_api_response_payloads_deferred: true,
      hr_api_runtime_deferred: true,
      hr_api_record_writes_deferred: true,
      employee_api_descriptor_only: true,
      employee_api_request_payloads_deferred: true,
      employee_api_response_payloads_deferred: true,
      employee_api_runtime_deferred: true,
      employee_api_record_writes_deferred: true,
      payroll_calculation_runtime_deferred: true,
      hr_ai_final_judgment_allowed: false,
      sensitive_hr_guard_required: true,
      real_employee_candidate_payroll_document_data_allowed: false,
    },
    requirement_refs: [
      "HRX-CORE-001",
      "HRX-CORE-002",
      "HRX-CORE-003",
      "HRX-GATE-001",
      "HRX-GATE-002",
      "HRX-GATE-003",
      "HRX-GATE-004",
      "HRX-GATE-005",
      "HRX-GATE-006",
    ],
    hermes_packet: createHrxCp922HermesEvidencePacket(),
    claude_packet: createHrxCp922ClaudeReviewPacket(),
    closeout_handoff: createHrxCp922CloseoutHandoff(),
    required_capabilities: HRX_CP922_REQUIREMENTS.required_capabilities,
    safety_gates: HRX_CP922_REQUIREMENTS.safety_gates,
    no_leak_guards: HRX_CP922_REQUIREMENTS.required_no_leak_guards,
    blocked_claims: HRX_BLOCKED_CLAIMS,
    ...HRX_NO_WRITE_ATTESTATION,
  });
}

export function createHrxCp923EmployeeLeaveCandidateApiBridgeCaseSet() {
  const sections = {};
  for (const [microId, titles] of Object.entries(HRX_CP923_REQUIRED_SECTION_ROWS)) {
    sections[microId] = deepFreeze({
      micro_phase_id: microId,
      row_count: titles.length,
      rows: createHrxDomainRows(microId, titles),
    });
  }
  return deepFreeze({
    pack_id: HRX_CP923_PACK_BINDING.pack_id,
    section_count: Object.keys(sections).length,
    row_count: Object.values(sections).reduce((sum, section) => sum + section.row_count, 0),
    sections,
  });
}

export function createHrxCp923HermesEvidencePacket() {
  return deepFreeze({
    gate: HRX_CP923_PACK_BINDING.hermes_gate,
    pack_id: HRX_CP923_PACK_BINDING.pack_id,
    evidence_kind: "hrx_employee_leave_candidate_api_bridge",
    emits_runtime_receipt: false,
    required_commands: [
      "npm run rp30:validate",
      "npm run hrx:requirements:validate",
      "npm run hrx:weighted:validate",
      "npm run rp30:hrx:validate",
    ],
    evidence_fields: [
      "hrx_embedded",
      "employee_api_tail_descriptor",
      "leave_api_reentry_descriptor",
      "candidate_api_reentry_descriptor",
      "api_request_payloads_deferred",
      "api_response_payloads_deferred",
      "runtime_deferred",
      "record_writes_deferred",
    ],
  });
}

export function createHrxCp923ClaudeReviewPacket() {
  return deepFreeze({
    gate: HRX_CP923_PACK_BINDING.claude_gate,
    pack_id: HRX_CP923_PACK_BINDING.pack_id,
    read_only: true,
    promotes_claude_to_final_approval: false,
    review_questions: [
      "Do EmployeeApi tail rows remain descriptor-only without API payloads, runtime, record writes, or HR AI final judgment?",
      "Do LeaveApi and CandidateApi re-entry rows remain descriptor-only without API payloads, runtime, record writes, payroll runtime, or real HR data?",
      "Are credentials, secrets, runtime receipts, permission/audit writes, product-state writes, enterprise-trust claims, and separate HRX product claims still closed?",
    ],
  });
}

export function createHrxCp923CloseoutHandoff() {
  return deepFreeze({
    from_pack_id: HRX_CP923_PACK_BINDING.pack_id,
    to_pack_id: HRX_CP923_PACK_BINDING.next_pack_id,
    next_subphase_id: HRX_CP923_PACK_BINDING.next_subphase_id,
    handoff_contract: "Continue RP30 P03 CandidateApi tail rows into EvidenceApi and HROperations descriptors while keeping API payloads, runtime, record writes, HR AI final judgment, real HR data, credentials, secrets, and separate-product claims closed.",
  });
}

export function createHrxCp923EmployeeLeaveCandidateApiBridgeDescriptor() {
  const caseSet = createHrxCp923EmployeeLeaveCandidateApiBridgeCaseSet();
  return deepFreeze({
    descriptor: "HrxCp923EmployeeLeaveCandidateApiBridgeDescriptor",
    source_descriptor: "HrxCp922ErrorModelHrEmployeeApiBridgeDescriptor",
    pack_id: HRX_CP923_PACK_BINDING.pack_id,
    program_contract: HRX_PROGRAM_CONTRACT,
    authority_boundary: {
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: HRX_CP923_PACK_BINDING.next_pack_id,
    },
    hrx_employee_leave_candidate_api_bridge_case_set: caseSet,
    domain_entities: {
      EmployeeApi: deepFreeze({
        descriptor_only: true,
        employee_api_request_payload_included: false,
        employee_api_response_payload_included: false,
        employee_api_runtime_opened: false,
        employee_api_record_write_opened: false,
        sensitive_hr_guard_required: true,
      }),
      LeaveApi: deepFreeze({
        descriptor_only: true,
        leave_api_request_payload_included: false,
        leave_api_response_payload_included: false,
        leave_api_runtime_opened: false,
        leave_api_record_write_opened: false,
        sensitive_hr_guard_required: true,
      }),
      CandidateApi: deepFreeze({
        descriptor_only: true,
        candidate_api_request_payload_included: false,
        candidate_api_response_payload_included: false,
        candidate_api_runtime_opened: false,
        candidate_api_record_write_opened: false,
        sensitive_hr_guard_required: true,
      }),
    },
    baseline_decisions: {
      hrx_embedded_inside_law_firm_os: true,
      separate_hrx_product_created: false,
      employee_api_descriptor_only: true,
      employee_api_request_payloads_deferred: true,
      employee_api_response_payloads_deferred: true,
      employee_api_runtime_deferred: true,
      employee_api_record_writes_deferred: true,
      leave_api_descriptor_only: true,
      leave_api_request_payloads_deferred: true,
      leave_api_response_payloads_deferred: true,
      leave_api_runtime_deferred: true,
      leave_api_record_writes_deferred: true,
      candidate_api_descriptor_only: true,
      candidate_api_request_payloads_deferred: true,
      candidate_api_response_payloads_deferred: true,
      candidate_api_runtime_deferred: true,
      candidate_api_record_writes_deferred: true,
      payroll_calculation_runtime_deferred: true,
      hr_ai_final_judgment_allowed: false,
      sensitive_hr_guard_required: true,
      real_employee_candidate_payroll_document_data_allowed: false,
    },
    requirement_refs: [
      "HRX-CORE-001",
      "HRX-CORE-002",
      "HRX-CORE-003",
      "HRX-GATE-001",
      "HRX-GATE-002",
      "HRX-GATE-003",
      "HRX-GATE-004",
      "HRX-GATE-005",
      "HRX-GATE-006",
    ],
    hermes_packet: createHrxCp923HermesEvidencePacket(),
    claude_packet: createHrxCp923ClaudeReviewPacket(),
    closeout_handoff: createHrxCp923CloseoutHandoff(),
    required_capabilities: HRX_CP923_REQUIREMENTS.required_capabilities,
    safety_gates: HRX_CP923_REQUIREMENTS.safety_gates,
    no_leak_guards: HRX_CP923_REQUIREMENTS.required_no_leak_guards,
    blocked_claims: HRX_BLOCKED_CLAIMS,
    ...HRX_NO_WRITE_ATTESTATION,
  });
}

export function createHrxCp924CandidateEvidenceHrOperationsBridgeCaseSet() {
  const sections = {};
  for (const [microId, titles] of Object.entries(HRX_CP924_REQUIRED_SECTION_ROWS)) {
    sections[microId] = deepFreeze({
      micro_phase_id: microId,
      row_count: titles.length,
      rows: createHrxDomainRows(microId, titles),
    });
  }
  return deepFreeze({
    pack_id: HRX_CP924_PACK_BINDING.pack_id,
    section_count: Object.keys(sections).length,
    row_count: Object.values(sections).reduce((sum, section) => sum + section.row_count, 0),
    sections,
  });
}

export function createHrxCp924HermesEvidencePacket() {
  return deepFreeze({
    gate: HRX_CP924_PACK_BINDING.hermes_gate,
    pack_id: HRX_CP924_PACK_BINDING.pack_id,
    evidence_kind: "hrx_candidate_evidence_hr_operations_bridge",
    emits_runtime_receipt: false,
    required_commands: [
      "npm run rp30:validate",
      "npm run hrx:requirements:validate",
      "npm run hrx:weighted:validate",
      "npm run rp30:hrx:validate",
    ],
    evidence_fields: [
      "hrx_embedded",
      "candidate_api_tail_descriptor",
      "evidence_api_reentry_descriptor",
      "hr_operations_foundation_descriptor",
      "api_request_payloads_deferred",
      "api_response_payloads_deferred",
      "operations_runtime_deferred",
      "record_writes_deferred",
      "operations_finalization_deferred",
    ],
  });
}

export function createHrxCp924ClaudeReviewPacket() {
  return deepFreeze({
    gate: HRX_CP924_PACK_BINDING.claude_gate,
    pack_id: HRX_CP924_PACK_BINDING.pack_id,
    read_only: true,
    promotes_claude_to_final_approval: false,
    review_questions: [
      "Do CandidateApi tail and EvidenceApi re-entry rows remain descriptor-only without API payloads, runtime, or record writes?",
      "Do HROperations foundation rows remain descriptor-only without operations runtime, record writes, policy execution, or HR state finalization?",
      "Are real HR data, credentials, secrets, runtime receipts, permission/audit writes, product-state writes, enterprise-trust claims, and separate HRX product claims still closed?",
    ],
  });
}

export function createHrxCp924CloseoutHandoff() {
  return deepFreeze({
    from_pack_id: HRX_CP924_PACK_BINDING.pack_id,
    to_pack_id: HRX_CP924_PACK_BINDING.next_pack_id,
    next_subphase_id: HRX_CP924_PACK_BINDING.next_subphase_id,
    handoff_contract: "Continue RP30 P04 HROperations tail rows into EmployeePortal descriptors while keeping operations runtime, API payloads, record writes, HR AI final judgment, real HR data, credentials, secrets, and separate-product claims closed.",
  });
}

export function createHrxCp924CandidateEvidenceHrOperationsBridgeDescriptor() {
  const caseSet = createHrxCp924CandidateEvidenceHrOperationsBridgeCaseSet();
  return deepFreeze({
    descriptor: "HrxCp924CandidateEvidenceHrOperationsBridgeDescriptor",
    source_descriptor: "HrxCp923EmployeeLeaveCandidateApiBridgeDescriptor",
    pack_id: HRX_CP924_PACK_BINDING.pack_id,
    program_contract: HRX_PROGRAM_CONTRACT,
    authority_boundary: {
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: HRX_CP924_PACK_BINDING.next_pack_id,
    },
    hrx_candidate_evidence_hr_operations_bridge_case_set: caseSet,
    domain_entities: {
      CandidateApi: deepFreeze({
        descriptor_only: true,
        candidate_api_request_payload_included: false,
        candidate_api_response_payload_included: false,
        candidate_api_runtime_opened: false,
        candidate_api_record_write_opened: false,
        sensitive_hr_guard_required: true,
      }),
      EvidenceApi: deepFreeze({
        descriptor_only: true,
        evidence_api_request_payload_included: false,
        evidence_api_response_payload_included: false,
        evidence_api_runtime_opened: false,
        evidence_api_record_write_opened: false,
        sensitive_hr_guard_required: true,
      }),
      HROperations: deepFreeze({
        descriptor_only: true,
        hr_operations_runtime_opened: false,
        hr_operations_record_write_opened: false,
        hr_operations_policy_execution_opened: false,
        hr_operations_finalization_allowed: false,
        sensitive_hr_guard_required: true,
      }),
    },
    baseline_decisions: {
      hrx_embedded_inside_law_firm_os: true,
      separate_hrx_product_created: false,
      candidate_api_descriptor_only: true,
      candidate_api_request_payloads_deferred: true,
      candidate_api_response_payloads_deferred: true,
      candidate_api_runtime_deferred: true,
      candidate_api_record_writes_deferred: true,
      evidence_api_descriptor_only: true,
      evidence_api_request_payloads_deferred: true,
      evidence_api_response_payloads_deferred: true,
      evidence_api_runtime_deferred: true,
      evidence_api_record_writes_deferred: true,
      hr_operations_descriptor_only: true,
      hr_operations_runtime_deferred: true,
      hr_operations_record_writes_deferred: true,
      hr_operations_policy_execution_deferred: true,
      hr_operations_finalization_deferred: true,
      payroll_calculation_runtime_deferred: true,
      hr_ai_final_judgment_allowed: false,
      sensitive_hr_guard_required: true,
      real_employee_candidate_payroll_document_data_allowed: false,
    },
    requirement_refs: [
      "HRX-CORE-001",
      "HRX-CORE-002",
      "HRX-CORE-003",
      "HRX-GATE-001",
      "HRX-GATE-002",
      "HRX-GATE-003",
      "HRX-GATE-004",
      "HRX-GATE-005",
      "HRX-GATE-006",
    ],
    hermes_packet: createHrxCp924HermesEvidencePacket(),
    claude_packet: createHrxCp924ClaudeReviewPacket(),
    closeout_handoff: createHrxCp924CloseoutHandoff(),
    required_capabilities: HRX_CP924_REQUIREMENTS.required_capabilities,
    safety_gates: HRX_CP924_REQUIREMENTS.safety_gates,
    no_leak_guards: HRX_CP924_REQUIREMENTS.required_no_leak_guards,
    blocked_claims: HRX_BLOCKED_CLAIMS,
    ...HRX_NO_WRITE_ATTESTATION,
  });
}

export function createHrxCp925HrOperationsEmployeePortalBridgeCaseSet() {
  const sections = {};
  for (const [microId, titles] of Object.entries(HRX_CP925_REQUIRED_SECTION_ROWS)) {
    sections[microId] = deepFreeze({
      micro_phase_id: microId,
      row_count: titles.length,
      rows: createHrxDomainRows(microId, titles),
    });
  }
  return deepFreeze({
    pack_id: HRX_CP925_PACK_BINDING.pack_id,
    section_count: Object.keys(sections).length,
    row_count: Object.values(sections).reduce((sum, section) => sum + section.row_count, 0),
    sections,
  });
}

export function createHrxCp925HermesEvidencePacket() {
  return deepFreeze({
    gate: HRX_CP925_PACK_BINDING.hermes_gate,
    pack_id: HRX_CP925_PACK_BINDING.pack_id,
    evidence_kind: "hrx_hr_operations_employee_portal_bridge",
    emits_runtime_receipt: false,
    required_commands: [
      "npm run rp30:validate",
      "npm run hrx:requirements:validate",
      "npm run hrx:weighted:validate",
      "npm run rp30:hrx:validate",
    ],
    evidence_fields: [
      "hrx_embedded",
      "hr_operations_tail_descriptor",
      "employee_portal_foundation_descriptor",
      "operations_runtime_deferred",
      "portal_runtime_deferred",
      "record_writes_deferred",
      "self_service_actions_deferred",
      "permission_bypass_closed",
    ],
  });
}

export function createHrxCp925ClaudeReviewPacket() {
  return deepFreeze({
    gate: HRX_CP925_PACK_BINDING.claude_gate,
    pack_id: HRX_CP925_PACK_BINDING.pack_id,
    read_only: true,
    promotes_claude_to_final_approval: false,
    review_questions: [
      "Do HROperations tail rows remain descriptor-only without operations runtime, record writes, policy execution, or HR state finalization?",
      "Do EmployeePortal foundation rows remain descriptor-only without portal runtime, record writes, self-service execution, or permission bypass?",
      "Are real HR data, credentials, secrets, runtime receipts, permission/audit writes, product-state writes, enterprise-trust claims, and separate HRX product claims still closed?",
    ],
  });
}

export function createHrxCp925CloseoutHandoff() {
  return deepFreeze({
    from_pack_id: HRX_CP925_PACK_BINDING.pack_id,
    to_pack_id: HRX_CP925_PACK_BINDING.next_pack_id,
    next_subphase_id: HRX_CP925_PACK_BINDING.next_subphase_id,
    handoff_contract: "Continue RP30 P04 EmployeePortal tail rows into CandidatePortal descriptors while keeping portal runtime, self-service actions, record writes, HR AI final judgment, real HR data, credentials, secrets, and separate-product claims closed.",
  });
}

export function createHrxCp925HrOperationsEmployeePortalBridgeDescriptor() {
  const caseSet = createHrxCp925HrOperationsEmployeePortalBridgeCaseSet();
  return deepFreeze({
    descriptor: "HrxCp925HrOperationsEmployeePortalBridgeDescriptor",
    source_descriptor: "HrxCp924CandidateEvidenceHrOperationsBridgeDescriptor",
    pack_id: HRX_CP925_PACK_BINDING.pack_id,
    program_contract: HRX_PROGRAM_CONTRACT,
    authority_boundary: {
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: HRX_CP925_PACK_BINDING.next_pack_id,
    },
    hrx_hr_operations_employee_portal_bridge_case_set: caseSet,
    domain_entities: {
      HROperations: deepFreeze({
        descriptor_only: true,
        hr_operations_runtime_opened: false,
        hr_operations_record_write_opened: false,
        hr_operations_policy_execution_opened: false,
        hr_operations_finalization_allowed: false,
        sensitive_hr_guard_required: true,
      }),
      EmployeePortal: deepFreeze({
        descriptor_only: true,
        employee_portal_runtime_opened: false,
        employee_portal_record_write_opened: false,
        employee_portal_self_service_action_executed: false,
        employee_portal_permission_bypass_allowed: false,
        sensitive_hr_guard_required: true,
      }),
    },
    baseline_decisions: {
      hrx_embedded_inside_law_firm_os: true,
      separate_hrx_product_created: false,
      hr_operations_descriptor_only: true,
      hr_operations_runtime_deferred: true,
      hr_operations_record_writes_deferred: true,
      hr_operations_policy_execution_deferred: true,
      hr_operations_finalization_deferred: true,
      employee_portal_descriptor_only: true,
      employee_portal_runtime_deferred: true,
      employee_portal_record_writes_deferred: true,
      employee_portal_self_service_actions_deferred: true,
      employee_portal_permission_bypass_closed: true,
      payroll_calculation_runtime_deferred: true,
      hr_ai_final_judgment_allowed: false,
      sensitive_hr_guard_required: true,
      real_employee_candidate_payroll_document_data_allowed: false,
    },
    requirement_refs: [
      "HRX-CORE-001",
      "HRX-CORE-002",
      "HRX-CORE-003",
      "HRX-GATE-001",
      "HRX-GATE-002",
      "HRX-GATE-003",
      "HRX-GATE-004",
      "HRX-GATE-005",
      "HRX-GATE-006",
    ],
    hermes_packet: createHrxCp925HermesEvidencePacket(),
    claude_packet: createHrxCp925ClaudeReviewPacket(),
    closeout_handoff: createHrxCp925CloseoutHandoff(),
    required_capabilities: HRX_CP925_REQUIREMENTS.required_capabilities,
    safety_gates: HRX_CP925_REQUIREMENTS.safety_gates,
    no_leak_guards: HRX_CP925_REQUIREMENTS.required_no_leak_guards,
    blocked_claims: HRX_BLOCKED_CLAIMS,
    ...HRX_NO_WRITE_ATTESTATION,
  });
}

export function createHrxCp926EmployeeCandidatePortalBridgeCaseSet() {
  const sections = {};
  for (const [microId, titles] of Object.entries(HRX_CP926_REQUIRED_SECTION_ROWS)) {
    sections[microId] = deepFreeze({
      micro_phase_id: microId,
      row_count: titles.length,
      rows: createHrxDomainRows(microId, titles),
    });
  }
  return deepFreeze({
    pack_id: HRX_CP926_PACK_BINDING.pack_id,
    section_count: Object.keys(sections).length,
    row_count: Object.values(sections).reduce((sum, section) => sum + section.row_count, 0),
    sections,
  });
}

export function createHrxCp926HermesEvidencePacket() {
  return deepFreeze({
    gate: HRX_CP926_PACK_BINDING.hermes_gate,
    pack_id: HRX_CP926_PACK_BINDING.pack_id,
    evidence_kind: "hrx_employee_candidate_portal_bridge",
    emits_runtime_receipt: false,
    required_commands: [
      "npm run rp30:validate",
      "npm run hrx:requirements:validate",
      "npm run hrx:weighted:validate",
      "npm run rp30:hrx:validate",
    ],
    evidence_fields: [
      "hrx_embedded",
      "employee_portal_tail_descriptor",
      "candidate_portal_foundation_descriptor",
      "employee_portal_runtime_deferred",
      "candidate_portal_runtime_deferred",
      "record_writes_deferred",
      "self_service_actions_deferred",
      "permission_bypass_closed",
    ],
  });
}

export function createHrxCp926ClaudeReviewPacket() {
  return deepFreeze({
    gate: HRX_CP926_PACK_BINDING.claude_gate,
    pack_id: HRX_CP926_PACK_BINDING.pack_id,
    read_only: true,
    promotes_claude_to_final_approval: false,
    review_questions: [
      "Do EmployeePortal tail rows remain descriptor-only without portal runtime, record writes, self-service execution, or permission bypass?",
      "Do CandidatePortal foundation rows remain descriptor-only without portal runtime, record writes, candidate self-service execution, or permission bypass?",
      "Are real HR data, credentials, secrets, runtime receipts, permission/audit writes, product-state writes, enterprise-trust claims, and separate HRX product claims still closed?",
    ],
  });
}

export function createHrxCp926CloseoutHandoff() {
  return deepFreeze({
    from_pack_id: HRX_CP926_PACK_BINDING.pack_id,
    to_pack_id: HRX_CP926_PACK_BINDING.next_pack_id,
    next_subphase_id: HRX_CP926_PACK_BINDING.next_subphase_id,
    handoff_contract: "Continue RP30 P04 CandidatePortal tail rows into AIReviewQueue descriptors while keeping candidate portal runtime, self-service actions, record writes, HR AI final judgment, real HR data, credentials, secrets, and separate-product claims closed.",
  });
}

export function createHrxCp926EmployeeCandidatePortalBridgeDescriptor() {
  const caseSet = createHrxCp926EmployeeCandidatePortalBridgeCaseSet();
  return deepFreeze({
    descriptor: "HrxCp926EmployeeCandidatePortalBridgeDescriptor",
    source_descriptor: "HrxCp925HrOperationsEmployeePortalBridgeDescriptor",
    pack_id: HRX_CP926_PACK_BINDING.pack_id,
    program_contract: HRX_PROGRAM_CONTRACT,
    authority_boundary: {
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: HRX_CP926_PACK_BINDING.next_pack_id,
    },
    hrx_employee_candidate_portal_bridge_case_set: caseSet,
    domain_entities: {
      EmployeePortal: deepFreeze({
        descriptor_only: true,
        employee_portal_runtime_opened: false,
        employee_portal_record_write_opened: false,
        employee_portal_self_service_action_executed: false,
        employee_portal_permission_bypass_allowed: false,
        sensitive_hr_guard_required: true,
      }),
      CandidatePortal: deepFreeze({
        descriptor_only: true,
        candidate_portal_runtime_opened: false,
        candidate_portal_record_write_opened: false,
        candidate_portal_self_service_action_executed: false,
        candidate_portal_permission_bypass_allowed: false,
        sensitive_hr_guard_required: true,
      }),
    },
    baseline_decisions: {
      hrx_embedded_inside_law_firm_os: true,
      separate_hrx_product_created: false,
      employee_portal_descriptor_only: true,
      employee_portal_runtime_deferred: true,
      employee_portal_record_writes_deferred: true,
      employee_portal_self_service_actions_deferred: true,
      employee_portal_permission_bypass_closed: true,
      candidate_portal_descriptor_only: true,
      candidate_portal_runtime_deferred: true,
      candidate_portal_record_writes_deferred: true,
      candidate_portal_self_service_actions_deferred: true,
      candidate_portal_permission_bypass_closed: true,
      payroll_calculation_runtime_deferred: true,
      hr_ai_final_judgment_allowed: false,
      sensitive_hr_guard_required: true,
      real_employee_candidate_payroll_document_data_allowed: false,
    },
    requirement_refs: [
      "HRX-CORE-001",
      "HRX-CORE-002",
      "HRX-CORE-003",
      "HRX-GATE-001",
      "HRX-GATE-002",
      "HRX-GATE-003",
      "HRX-GATE-004",
      "HRX-GATE-005",
      "HRX-GATE-006",
    ],
    hermes_packet: createHrxCp926HermesEvidencePacket(),
    claude_packet: createHrxCp926ClaudeReviewPacket(),
    closeout_handoff: createHrxCp926CloseoutHandoff(),
    required_capabilities: HRX_CP926_REQUIREMENTS.required_capabilities,
    safety_gates: HRX_CP926_REQUIREMENTS.safety_gates,
    no_leak_guards: HRX_CP926_REQUIREMENTS.required_no_leak_guards,
    blocked_claims: HRX_BLOCKED_CLAIMS,
    ...HRX_NO_WRITE_ATTESTATION,
  });
}

export function createHrxCp927CandidateAiReviewQueueBridgeCaseSet() {
  const sections = {};
  for (const [microId, titles] of Object.entries(HRX_CP927_REQUIRED_SECTION_ROWS)) {
    sections[microId] = deepFreeze({
      micro_phase_id: microId,
      row_count: titles.length,
      rows: createHrxDomainRows(microId, titles),
    });
  }
  return deepFreeze({
    pack_id: HRX_CP927_PACK_BINDING.pack_id,
    section_count: Object.keys(sections).length,
    row_count: Object.values(sections).reduce((sum, section) => sum + section.row_count, 0),
    sections,
  });
}

export function createHrxCp927HermesEvidencePacket() {
  return deepFreeze({
    gate: HRX_CP927_PACK_BINDING.hermes_gate,
    pack_id: HRX_CP927_PACK_BINDING.pack_id,
    evidence_kind: "hrx_candidate_ai_review_queue_bridge",
    emits_runtime_receipt: false,
    required_commands: [
      "npm run rp30:validate",
      "npm run hrx:requirements:validate",
      "npm run hrx:weighted:validate",
      "npm run rp30:hrx:validate",
    ],
    evidence_fields: [
      "hrx_embedded",
      "candidate_portal_tail_descriptor",
      "ai_review_queue_foundation_descriptor",
      "candidate_portal_runtime_deferred",
      "ai_review_queue_runtime_deferred",
      "record_writes_deferred",
      "review_actions_deferred",
      "final_judgment_deferred",
    ],
  });
}

export function createHrxCp927ClaudeReviewPacket() {
  return deepFreeze({
    gate: HRX_CP927_PACK_BINDING.claude_gate,
    pack_id: HRX_CP927_PACK_BINDING.pack_id,
    read_only: true,
    promotes_claude_to_final_approval: false,
    review_questions: [
      "Do CandidatePortal tail rows remain descriptor-only without portal runtime, record writes, candidate self-service execution, or permission bypass?",
      "Do AIReviewQueue foundation rows remain descriptor-only without queue runtime, record writes, review action execution, or final judgment?",
      "Are real HR data, credentials, secrets, runtime receipts, permission/audit writes, product-state writes, enterprise-trust claims, and separate HRX product claims still closed?",
    ],
  });
}

export function createHrxCp927CloseoutHandoff() {
  return deepFreeze({
    from_pack_id: HRX_CP927_PACK_BINDING.pack_id,
    to_pack_id: HRX_CP927_PACK_BINDING.next_pack_id,
    next_subphase_id: HRX_CP927_PACK_BINDING.next_subphase_id,
    handoff_contract: "Continue RP30 P04 AIReviewQueue tail rows into AdminPolicy descriptors while keeping AI review runtime, review actions, final judgment, record writes, real HR data, credentials, secrets, and separate-product claims closed.",
  });
}

export function createHrxCp927CandidateAiReviewQueueBridgeDescriptor() {
  const caseSet = createHrxCp927CandidateAiReviewQueueBridgeCaseSet();
  return deepFreeze({
    descriptor: "HrxCp927CandidateAiReviewQueueBridgeDescriptor",
    source_descriptor: "HrxCp926EmployeeCandidatePortalBridgeDescriptor",
    pack_id: HRX_CP927_PACK_BINDING.pack_id,
    program_contract: HRX_PROGRAM_CONTRACT,
    authority_boundary: {
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: HRX_CP927_PACK_BINDING.next_pack_id,
    },
    hrx_candidate_ai_review_queue_bridge_case_set: caseSet,
    domain_entities: {
      CandidatePortal: deepFreeze({
        descriptor_only: true,
        candidate_portal_runtime_opened: false,
        candidate_portal_record_write_opened: false,
        candidate_portal_self_service_action_executed: false,
        candidate_portal_permission_bypass_allowed: false,
        sensitive_hr_guard_required: true,
      }),
      AIReviewQueue: deepFreeze({
        descriptor_only: true,
        ai_review_queue_runtime_opened: false,
        ai_review_queue_record_write_opened: false,
        ai_review_queue_review_action_executed: false,
        ai_review_queue_final_judgment_allowed: false,
        sensitive_hr_guard_required: true,
      }),
    },
    baseline_decisions: {
      hrx_embedded_inside_law_firm_os: true,
      separate_hrx_product_created: false,
      candidate_portal_descriptor_only: true,
      candidate_portal_runtime_deferred: true,
      candidate_portal_record_writes_deferred: true,
      candidate_portal_self_service_actions_deferred: true,
      candidate_portal_permission_bypass_closed: true,
      ai_review_queue_descriptor_only: true,
      ai_review_queue_runtime_deferred: true,
      ai_review_queue_record_writes_deferred: true,
      ai_review_queue_review_actions_deferred: true,
      ai_review_queue_final_judgment_deferred: true,
      payroll_calculation_runtime_deferred: true,
      hr_ai_final_judgment_allowed: false,
      sensitive_hr_guard_required: true,
      real_employee_candidate_payroll_document_data_allowed: false,
    },
    requirement_refs: [
      "HRX-CORE-001",
      "HRX-CORE-002",
      "HRX-CORE-003",
      "HRX-GATE-001",
      "HRX-GATE-002",
      "HRX-GATE-003",
      "HRX-GATE-004",
      "HRX-GATE-005",
      "HRX-GATE-006",
    ],
    hermes_packet: createHrxCp927HermesEvidencePacket(),
    claude_packet: createHrxCp927ClaudeReviewPacket(),
    closeout_handoff: createHrxCp927CloseoutHandoff(),
    required_capabilities: HRX_CP927_REQUIREMENTS.required_capabilities,
    safety_gates: HRX_CP927_REQUIREMENTS.safety_gates,
    no_leak_guards: HRX_CP927_REQUIREMENTS.required_no_leak_guards,
    blocked_claims: HRX_BLOCKED_CLAIMS,
    ...HRX_NO_WRITE_ATTESTATION,
  });
}

export function createHrxCp928AiReviewAdminPolicyBridgeCaseSet() {
  const sections = {};
  for (const [microId, titles] of Object.entries(HRX_CP928_REQUIRED_SECTION_ROWS)) {
    sections[microId] = deepFreeze({
      micro_phase_id: microId,
      row_count: titles.length,
      rows: createHrxDomainRows(microId, titles),
    });
  }
  return deepFreeze({
    pack_id: HRX_CP928_PACK_BINDING.pack_id,
    section_count: Object.keys(sections).length,
    row_count: Object.values(sections).reduce((sum, section) => sum + section.row_count, 0),
    sections,
  });
}

export function createHrxCp928HermesEvidencePacket() {
  return deepFreeze({
    gate: HRX_CP928_PACK_BINDING.hermes_gate,
    pack_id: HRX_CP928_PACK_BINDING.pack_id,
    evidence_kind: "hrx_ai_review_admin_policy_bridge",
    emits_runtime_receipt: false,
    required_commands: [
      "npm run rp30:validate",
      "npm run hrx:requirements:validate",
      "npm run hrx:weighted:validate",
      "npm run rp30:hrx:validate",
    ],
    evidence_fields: [
      "hrx_embedded",
      "ai_review_queue_tail_descriptor",
      "admin_policy_foundation_descriptor",
      "ai_review_queue_runtime_deferred",
      "admin_policy_runtime_deferred",
      "record_writes_deferred",
      "policy_rule_execution_deferred",
      "policy_finalization_deferred",
    ],
  });
}

export function createHrxCp928ClaudeReviewPacket() {
  return deepFreeze({
    gate: HRX_CP928_PACK_BINDING.claude_gate,
    pack_id: HRX_CP928_PACK_BINDING.pack_id,
    read_only: true,
    promotes_claude_to_final_approval: false,
    review_questions: [
      "Do AIReviewQueue tail rows remain descriptor-only without queue runtime, record writes, review action execution, or final judgment?",
      "Do AdminPolicy foundation rows remain descriptor-only without admin policy runtime, record writes, rule execution, or policy finalization?",
      "Are real HR data, credentials, secrets, runtime receipts, permission/audit writes, product-state writes, enterprise-trust claims, and separate HRX product claims still closed?",
    ],
  });
}

export function createHrxCp928CloseoutHandoff() {
  return deepFreeze({
    from_pack_id: HRX_CP928_PACK_BINDING.pack_id,
    to_pack_id: HRX_CP928_PACK_BINDING.next_pack_id,
    next_subphase_id: HRX_CP928_PACK_BINDING.next_subphase_id,
    handoff_contract: "Continue RP30 P04 AdminPolicy tail rows into DeniedState descriptors while keeping admin policy runtime, rule execution, policy finalization, record writes, real HR data, credentials, secrets, and separate-product claims closed.",
  });
}

export function createHrxCp928AiReviewAdminPolicyBridgeDescriptor() {
  const caseSet = createHrxCp928AiReviewAdminPolicyBridgeCaseSet();
  return deepFreeze({
    descriptor: "HrxCp928AiReviewAdminPolicyBridgeDescriptor",
    source_descriptor: "HrxCp927CandidateAiReviewQueueBridgeDescriptor",
    pack_id: HRX_CP928_PACK_BINDING.pack_id,
    program_contract: HRX_PROGRAM_CONTRACT,
    authority_boundary: {
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: HRX_CP928_PACK_BINDING.next_pack_id,
    },
    hrx_ai_review_admin_policy_bridge_case_set: caseSet,
    domain_entities: {
      AIReviewQueue: deepFreeze({
        descriptor_only: true,
        ai_review_queue_runtime_opened: false,
        ai_review_queue_record_write_opened: false,
        ai_review_queue_review_action_executed: false,
        ai_review_queue_final_judgment_allowed: false,
        sensitive_hr_guard_required: true,
      }),
      AdminPolicy: deepFreeze({
        descriptor_only: true,
        admin_policy_runtime_opened: false,
        admin_policy_record_write_opened: false,
        admin_policy_rule_execution_opened: false,
        admin_policy_finalization_allowed: false,
        sensitive_hr_guard_required: true,
      }),
    },
    baseline_decisions: {
      hrx_embedded_inside_law_firm_os: true,
      separate_hrx_product_created: false,
      ai_review_queue_descriptor_only: true,
      ai_review_queue_runtime_deferred: true,
      ai_review_queue_record_writes_deferred: true,
      ai_review_queue_review_actions_deferred: true,
      ai_review_queue_final_judgment_deferred: true,
      admin_policy_descriptor_only: true,
      admin_policy_runtime_deferred: true,
      admin_policy_record_writes_deferred: true,
      admin_policy_rule_execution_deferred: true,
      admin_policy_finalization_deferred: true,
      payroll_calculation_runtime_deferred: true,
      hr_ai_final_judgment_allowed: false,
      sensitive_hr_guard_required: true,
      real_employee_candidate_payroll_document_data_allowed: false,
    },
    requirement_refs: [
      "HRX-CORE-001",
      "HRX-CORE-002",
      "HRX-CORE-003",
      "HRX-GATE-001",
      "HRX-GATE-002",
      "HRX-GATE-003",
      "HRX-GATE-004",
      "HRX-GATE-005",
      "HRX-GATE-006",
    ],
    hermes_packet: createHrxCp928HermesEvidencePacket(),
    claude_packet: createHrxCp928ClaudeReviewPacket(),
    closeout_handoff: createHrxCp928CloseoutHandoff(),
    required_capabilities: HRX_CP928_REQUIREMENTS.required_capabilities,
    safety_gates: HRX_CP928_REQUIREMENTS.safety_gates,
    no_leak_guards: HRX_CP928_REQUIREMENTS.required_no_leak_guards,
    blocked_claims: HRX_BLOCKED_CLAIMS,
    ...HRX_NO_WRITE_ATTESTATION,
  });
}

export function createHrxCp929AdminPolicyDeniedStateBridgeCaseSet() {
  const sections = {};
  for (const [microId, titles] of Object.entries(HRX_CP929_REQUIRED_SECTION_ROWS)) {
    sections[microId] = deepFreeze({
      micro_phase_id: microId,
      row_count: titles.length,
      rows: createHrxDomainRows(microId, titles),
    });
  }
  return deepFreeze({
    pack_id: HRX_CP929_PACK_BINDING.pack_id,
    section_count: Object.keys(sections).length,
    row_count: Object.values(sections).reduce((sum, section) => sum + section.row_count, 0),
    sections,
  });
}

export function createHrxCp929HermesEvidencePacket() {
  return deepFreeze({
    gate: HRX_CP929_PACK_BINDING.hermes_gate,
    pack_id: HRX_CP929_PACK_BINDING.pack_id,
    evidence_kind: "hrx_admin_policy_denied_state_bridge",
    emits_runtime_receipt: false,
    deterministic_only: true,
    validation_commands: ["npm run rp30:hrx:validate", "npm run rp30:validate", "npm run hrx:requirements:validate", "npm run hrx:weighted:validate"],
    boundary_assertions: [
      "admin_policy_tail_descriptor_only",
      "admin_policy_runtime_deferred",
      "admin_policy_rule_execution_deferred",
      "admin_policy_finalization_deferred",
      "denied_state_security_audit_descriptor",
      "denied_state_runtime_deferred",
      "denied_state_record_write_deferred",
      "denied_state_access_grants_closed",
      "denied_state_policy_bypass_closed",
      "real_hr_data_excluded",
      "credentials_and_secrets_excluded",
    ],
  });
}

export function createHrxCp929ClaudeReviewPacket() {
  return deepFreeze({
    gate: HRX_CP929_PACK_BINDING.claude_gate,
    pack_id: HRX_CP929_PACK_BINDING.pack_id,
    read_only: true,
    promotes_claude_to_final_approval: false,
    review_questions: [
      "Do AdminPolicy tail rows remain descriptor-only without admin policy runtime, record writes, rule execution, or policy finalization?",
      "Do DeniedState security-audit rows remain descriptor-only without denied-state runtime, record writes, access grants, or policy bypass?",
      "Does CP929 keep real HR data, credentials, secrets, runtime receipts, enterprise trust, and separate HRX product claims closed?",
    ],
  });
}

export function createHrxCp929CloseoutHandoff() {
  return deepFreeze({
    from_pack_id: HRX_CP929_PACK_BINDING.pack_id,
    to_pack_id: HRX_CP929_PACK_BINDING.next_pack_id,
    next_subphase_id: HRX_CP929_PACK_BINDING.next_subphase_id,
    handoff_contract: "Continue RP30 P04 DeniedState tail rows into HROperations descriptors while keeping denied-state runtime, access grants, policy bypass, record writes, real HR data, credentials, secrets, and separate-product claims closed.",
  });
}

export function createHrxCp929AdminPolicyDeniedStateBridgeDescriptor() {
  const caseSet = createHrxCp929AdminPolicyDeniedStateBridgeCaseSet();
  return deepFreeze({
    descriptor: "HrxCp929AdminPolicyDeniedStateBridgeDescriptor",
    source_descriptor: "HrxCp928AiReviewAdminPolicyBridgeDescriptor",
    pack_id: HRX_CP929_PACK_BINDING.pack_id,
    planned_pack_id: HRX_CP929_PACK_BINDING.planned_pack_id,
    range: HRX_CP929_PACK_BINDING.range,
    program_contract: HRX_PROGRAM_CONTRACT,
    authority_boundary: {
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: HRX_CP929_PACK_BINDING.next_pack_id,
    },
    hrx_admin_policy_denied_state_bridge_case_set: caseSet,
    domain_entities: {
      AdminPolicy: deepFreeze({
        descriptor_only: true,
        admin_policy_runtime_opened: false,
        admin_policy_record_write_opened: false,
        admin_policy_rule_execution_opened: false,
        admin_policy_finalization_allowed: false,
      }),
      DeniedState: deepFreeze({
        descriptor_only: true,
        denied_state_security_audit_descriptor: true,
        denied_state_runtime_opened: false,
        denied_state_record_write_opened: false,
        denied_state_access_granted: false,
        denied_state_policy_bypass_allowed: false,
      }),
    },
    baseline_decisions: {
      hrx_embedded_inside_law_firm_os: true,
      separate_hrx_product_created: false,
      admin_policy_descriptor_only: true,
      admin_policy_runtime_deferred: true,
      admin_policy_record_writes_deferred: true,
      admin_policy_rule_execution_deferred: true,
      admin_policy_finalization_deferred: true,
      denied_state_descriptor_only: true,
      denied_state_security_audit_descriptor: true,
      denied_state_runtime_deferred: true,
      denied_state_record_writes_deferred: true,
      denied_state_access_grants_closed: true,
      denied_state_policy_bypass_closed: true,
      payroll_calculation_runtime_deferred: true,
      hr_ai_final_judgment_allowed: false,
      sensitive_hr_guard_required: true,
      real_employee_candidate_payroll_document_data_allowed: false,
    },
    requirement_refs: [
      "HRX-CORE-001",
      "HRX-CORE-002",
      "HRX-CORE-003",
      "HRX-GATE-001",
      "HRX-GATE-002",
      "HRX-GATE-003",
      "HRX-GATE-004",
      "HRX-GATE-005",
      "HRX-GATE-006",
    ],
    hermes_packet: createHrxCp929HermesEvidencePacket(),
    claude_packet: createHrxCp929ClaudeReviewPacket(),
    closeout_handoff: createHrxCp929CloseoutHandoff(),
    required_capabilities: HRX_CP929_REQUIREMENTS.required_capabilities,
    safety_gates: HRX_CP929_REQUIREMENTS.safety_gates,
    no_leak_guards: HRX_CP929_REQUIREMENTS.required_no_leak_guards,
    blocked_claims: HRX_BLOCKED_CLAIMS,
    ...HRX_NO_WRITE_ATTESTATION,
  });
}

export function createHrxCp930DeniedStateHrOperationsBridgeCaseSet() {
  const sections = {};
  for (const [microId, titles] of Object.entries(HRX_CP930_REQUIRED_SECTION_ROWS)) {
    sections[microId] = deepFreeze({
      micro_phase_id: microId,
      row_count: titles.length,
      rows: createHrxDomainRows(microId, titles),
    });
  }
  return deepFreeze({
    pack_id: HRX_CP930_PACK_BINDING.pack_id,
    section_count: Object.keys(sections).length,
    row_count: Object.values(sections).reduce((sum, section) => sum + section.row_count, 0),
    sections,
  });
}

export function createHrxCp930HermesEvidencePacket() {
  return deepFreeze({
    gate: HRX_CP930_PACK_BINDING.hermes_gate,
    pack_id: HRX_CP930_PACK_BINDING.pack_id,
    evidence_kind: "hrx_denied_state_hr_operations_bridge",
    emits_runtime_receipt: false,
    deterministic_only: true,
    validation_commands: ["npm run rp30:hrx:validate", "npm run rp30:validate", "npm run hrx:requirements:validate", "npm run hrx:weighted:validate"],
    boundary_assertions: [
      "denied_state_tail_security_audit_descriptor",
      "denied_state_runtime_deferred",
      "denied_state_record_write_deferred",
      "denied_state_access_grants_closed",
      "denied_state_policy_bypass_closed",
      "hr_operations_foundation_descriptor",
      "hr_operations_runtime_deferred",
      "hr_operations_record_writes_deferred",
      "hr_operations_policy_execution_deferred",
      "hr_operations_finalization_deferred",
      "real_hr_data_excluded",
      "credentials_and_secrets_excluded",
    ],
  });
}

export function createHrxCp930ClaudeReviewPacket() {
  return deepFreeze({
    gate: HRX_CP930_PACK_BINDING.claude_gate,
    pack_id: HRX_CP930_PACK_BINDING.pack_id,
    read_only: true,
    promotes_claude_to_final_approval: false,
    review_questions: [
      "Do DeniedState tail rows remain descriptor-only without denied-state runtime, record writes, access grants, or policy bypass?",
      "Do HROperations foundation rows remain descriptor-only without operations runtime, record writes, policy execution, or HR state finalization?",
      "Does CP930 keep real HR data, credentials, secrets, runtime receipts, enterprise trust, and separate HRX product claims closed?",
    ],
  });
}

export function createHrxCp930CloseoutHandoff() {
  return deepFreeze({
    from_pack_id: HRX_CP930_PACK_BINDING.pack_id,
    to_pack_id: HRX_CP930_PACK_BINDING.next_pack_id,
    next_subphase_id: HRX_CP930_PACK_BINDING.next_subphase_id,
    handoff_contract: "Continue RP30 P04 HROperations tail rows into EmployeePortal and CandidatePortal descriptors while keeping operations runtime, policy execution, finalization, record writes, real HR data, credentials, secrets, and separate-product claims closed.",
  });
}

export function createHrxCp930DeniedStateHrOperationsBridgeDescriptor() {
  const caseSet = createHrxCp930DeniedStateHrOperationsBridgeCaseSet();
  return deepFreeze({
    descriptor: "HrxCp930DeniedStateHrOperationsBridgeDescriptor",
    source_descriptor: "HrxCp929AdminPolicyDeniedStateBridgeDescriptor",
    pack_id: HRX_CP930_PACK_BINDING.pack_id,
    planned_pack_id: HRX_CP930_PACK_BINDING.planned_pack_id,
    range: HRX_CP930_PACK_BINDING.range,
    program_contract: HRX_PROGRAM_CONTRACT,
    authority_boundary: {
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: HRX_CP930_PACK_BINDING.next_pack_id,
    },
    hrx_denied_state_hr_operations_bridge_case_set: caseSet,
    domain_entities: {
      DeniedState: deepFreeze({
        descriptor_only: true,
        denied_state_security_audit_descriptor: true,
        denied_state_runtime_opened: false,
        denied_state_record_write_opened: false,
        denied_state_access_granted: false,
        denied_state_policy_bypass_allowed: false,
      }),
      HROperations: deepFreeze({
        descriptor_only: true,
        hr_operations_runtime_opened: false,
        hr_operations_record_write_opened: false,
        hr_operations_policy_execution_opened: false,
        hr_operations_finalization_allowed: false,
      }),
    },
    baseline_decisions: {
      hrx_embedded_inside_law_firm_os: true,
      separate_hrx_product_created: false,
      denied_state_descriptor_only: true,
      denied_state_security_audit_descriptor: true,
      denied_state_runtime_deferred: true,
      denied_state_record_writes_deferred: true,
      denied_state_access_grants_closed: true,
      denied_state_policy_bypass_closed: true,
      hr_operations_descriptor_only: true,
      hr_operations_runtime_deferred: true,
      hr_operations_record_writes_deferred: true,
      hr_operations_policy_execution_deferred: true,
      hr_operations_finalization_deferred: true,
      payroll_calculation_runtime_deferred: true,
      hr_ai_final_judgment_allowed: false,
      sensitive_hr_guard_required: true,
      real_employee_candidate_payroll_document_data_allowed: false,
    },
    requirement_refs: [
      "HRX-CORE-001",
      "HRX-CORE-002",
      "HRX-CORE-003",
      "HRX-GATE-001",
      "HRX-GATE-002",
      "HRX-GATE-003",
      "HRX-GATE-004",
      "HRX-GATE-005",
      "HRX-GATE-006",
    ],
    hermes_packet: createHrxCp930HermesEvidencePacket(),
    claude_packet: createHrxCp930ClaudeReviewPacket(),
    closeout_handoff: createHrxCp930CloseoutHandoff(),
    required_capabilities: HRX_CP930_REQUIREMENTS.required_capabilities,
    safety_gates: HRX_CP930_REQUIREMENTS.safety_gates,
    no_leak_guards: HRX_CP930_REQUIREMENTS.required_no_leak_guards,
    blocked_claims: HRX_BLOCKED_CLAIMS,
    ...HRX_NO_WRITE_ATTESTATION,
  });
}

export function createHrxCp931HrOperationsEmployeeCandidatePortalBridgeCaseSet() {
  const sections = {};
  for (const [microId, titles] of Object.entries(HRX_CP931_REQUIRED_SECTION_ROWS)) {
    sections[microId] = deepFreeze({
      micro_phase_id: microId,
      row_count: titles.length,
      rows: createHrxDomainRows(microId, titles),
    });
  }
  return deepFreeze({
    pack_id: HRX_CP931_PACK_BINDING.pack_id,
    section_count: Object.keys(sections).length,
    row_count: Object.values(sections).reduce((sum, section) => sum + section.row_count, 0),
    sections,
  });
}

export function createHrxCp931HermesEvidencePacket() {
  return deepFreeze({
    gate: HRX_CP931_PACK_BINDING.hermes_gate,
    pack_id: HRX_CP931_PACK_BINDING.pack_id,
    evidence_kind: "hrx_hr_operations_employee_candidate_portal_bridge",
    emits_runtime_receipt: false,
    deterministic_only: true,
    validation_commands: ["npm run rp30:hrx:validate", "npm run rp30:validate", "npm run hrx:requirements:validate", "npm run hrx:weighted:validate"],
    boundary_assertions: [
      "hr_operations_tail_descriptor",
      "hr_operations_runtime_deferred",
      "hr_operations_record_writes_deferred",
      "hr_operations_policy_execution_deferred",
      "hr_operations_finalization_deferred",
      "employee_portal_foundation_descriptor",
      "employee_portal_runtime_deferred",
      "employee_portal_record_writes_deferred",
      "employee_portal_self_service_actions_deferred",
      "employee_portal_permission_bypass_closed",
      "candidate_portal_foundation_descriptor",
      "candidate_portal_runtime_deferred",
      "candidate_portal_record_writes_deferred",
      "candidate_portal_self_service_actions_deferred",
      "candidate_portal_permission_bypass_closed",
      "real_hr_data_excluded",
      "credentials_and_secrets_excluded",
    ],
  });
}

export function createHrxCp931ClaudeReviewPacket() {
  return deepFreeze({
    gate: HRX_CP931_PACK_BINDING.claude_gate,
    pack_id: HRX_CP931_PACK_BINDING.pack_id,
    read_only: true,
    promotes_claude_to_final_approval: false,
    review_questions: [
      "Do HROperations tail rows remain descriptor-only without operations runtime, record writes, policy execution, or HR state finalization?",
      "Do EmployeePortal and CandidatePortal foundation rows remain descriptor-only without portal runtime, self-service execution, record writes, or permission bypass?",
      "Does CP931 keep real HR data, credentials, secrets, runtime receipts, enterprise trust, and separate HRX product claims closed?",
    ],
  });
}

export function createHrxCp931CloseoutHandoff() {
  return deepFreeze({
    from_pack_id: HRX_CP931_PACK_BINDING.pack_id,
    to_pack_id: HRX_CP931_PACK_BINDING.next_pack_id,
    next_subphase_id: HRX_CP931_PACK_BINDING.next_subphase_id,
    handoff_contract: "Continue RP30 P04 CandidatePortal tail rows into AIReviewQueue descriptors while keeping portal runtime, self-service actions, record writes, HR AI final judgment, real HR data, credentials, secrets, and separate-product claims closed.",
  });
}

export function createHrxCp931HrOperationsEmployeeCandidatePortalBridgeDescriptor() {
  const caseSet = createHrxCp931HrOperationsEmployeeCandidatePortalBridgeCaseSet();
  return deepFreeze({
    descriptor: "HrxCp931HrOperationsEmployeeCandidatePortalBridgeDescriptor",
    source_descriptor: "HrxCp930DeniedStateHrOperationsBridgeDescriptor",
    pack_id: HRX_CP931_PACK_BINDING.pack_id,
    planned_pack_id: HRX_CP931_PACK_BINDING.planned_pack_id,
    range: HRX_CP931_PACK_BINDING.range,
    program_contract: HRX_PROGRAM_CONTRACT,
    authority_boundary: {
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: HRX_CP931_PACK_BINDING.next_pack_id,
    },
    hrx_hr_operations_employee_candidate_portal_bridge_case_set: caseSet,
    domain_entities: {
      HROperations: deepFreeze({
        descriptor_only: true,
        hr_operations_runtime_opened: false,
        hr_operations_record_write_opened: false,
        hr_operations_policy_execution_opened: false,
        hr_operations_finalization_allowed: false,
      }),
      EmployeePortal: deepFreeze({
        descriptor_only: true,
        employee_portal_runtime_opened: false,
        employee_portal_record_write_opened: false,
        employee_portal_self_service_action_executed: false,
        employee_portal_permission_bypass_allowed: false,
      }),
      CandidatePortal: deepFreeze({
        descriptor_only: true,
        candidate_portal_runtime_opened: false,
        candidate_portal_record_write_opened: false,
        candidate_portal_self_service_action_executed: false,
        candidate_portal_permission_bypass_allowed: false,
      }),
    },
    baseline_decisions: {
      hrx_embedded_inside_law_firm_os: true,
      separate_hrx_product_created: false,
      hr_operations_descriptor_only: true,
      hr_operations_runtime_deferred: true,
      hr_operations_record_writes_deferred: true,
      hr_operations_policy_execution_deferred: true,
      hr_operations_finalization_deferred: true,
      employee_portal_descriptor_only: true,
      employee_portal_runtime_deferred: true,
      employee_portal_record_writes_deferred: true,
      employee_portal_self_service_actions_deferred: true,
      employee_portal_permission_bypass_closed: true,
      candidate_portal_descriptor_only: true,
      candidate_portal_runtime_deferred: true,
      candidate_portal_record_writes_deferred: true,
      candidate_portal_self_service_actions_deferred: true,
      candidate_portal_permission_bypass_closed: true,
      payroll_calculation_runtime_deferred: true,
      hr_ai_final_judgment_allowed: false,
      sensitive_hr_guard_required: true,
      real_employee_candidate_payroll_document_data_allowed: false,
    },
    requirement_refs: [
      "HRX-CORE-001",
      "HRX-CORE-002",
      "HRX-CORE-003",
      "HRX-GATE-001",
      "HRX-GATE-002",
      "HRX-GATE-003",
      "HRX-GATE-004",
      "HRX-GATE-005",
      "HRX-GATE-006",
    ],
    hermes_packet: createHrxCp931HermesEvidencePacket(),
    claude_packet: createHrxCp931ClaudeReviewPacket(),
    closeout_handoff: createHrxCp931CloseoutHandoff(),
    required_capabilities: HRX_CP931_REQUIREMENTS.required_capabilities,
    safety_gates: HRX_CP931_REQUIREMENTS.safety_gates,
    no_leak_guards: HRX_CP931_REQUIREMENTS.required_no_leak_guards,
    blocked_claims: HRX_BLOCKED_CLAIMS,
    ...HRX_NO_WRITE_ATTESTATION,
  });
}

export function createHrxCp932CandidateAiReviewQueueBridgeCaseSet() {
  const sections = {};
  for (const [microId, titles] of Object.entries(HRX_CP932_REQUIRED_SECTION_ROWS)) {
    sections[microId] = deepFreeze({
      micro_phase_id: microId,
      row_count: titles.length,
      rows: createHrxDomainRows(microId, titles),
    });
  }
  return deepFreeze({
    pack_id: HRX_CP932_PACK_BINDING.pack_id,
    section_count: Object.keys(sections).length,
    row_count: Object.values(sections).reduce((sum, section) => sum + section.row_count, 0),
    sections,
  });
}

export function createHrxCp932HermesEvidencePacket() {
  return deepFreeze({
    gate: HRX_CP932_PACK_BINDING.hermes_gate,
    pack_id: HRX_CP932_PACK_BINDING.pack_id,
    evidence_kind: "hrx_candidate_ai_review_queue_bridge",
    emits_runtime_receipt: false,
    deterministic_only: true,
    validation_commands: ["npm run rp30:hrx:validate", "npm run rp30:validate", "npm run hrx:requirements:validate", "npm run hrx:weighted:validate"],
    boundary_assertions: [
      "candidate_portal_tail_descriptor",
      "candidate_portal_runtime_deferred",
      "candidate_portal_record_writes_deferred",
      "candidate_portal_self_service_actions_deferred",
      "candidate_portal_permission_bypass_closed",
      "ai_review_queue_foundation_descriptor",
      "ai_review_queue_runtime_deferred",
      "ai_review_queue_record_writes_deferred",
      "ai_review_queue_review_actions_deferred",
      "ai_review_queue_final_judgment_deferred",
      "real_hr_data_excluded",
      "credentials_and_secrets_excluded",
    ],
  });
}

export function createHrxCp932ClaudeReviewPacket() {
  return deepFreeze({
    gate: HRX_CP932_PACK_BINDING.claude_gate,
    pack_id: HRX_CP932_PACK_BINDING.pack_id,
    read_only: true,
    promotes_claude_to_final_approval: false,
    review_questions: [
      "Do CandidatePortal tail rows remain descriptor-only without portal runtime, record writes, self-service execution, or permission bypass?",
      "Do AIReviewQueue foundation rows remain descriptor-only without queue runtime, record writes, review action execution, or final judgment?",
      "Does CP932 keep real HR data, credentials, secrets, runtime receipts, enterprise trust, and separate HRX product claims closed?",
    ],
  });
}

export function createHrxCp932CloseoutHandoff() {
  return deepFreeze({
    from_pack_id: HRX_CP932_PACK_BINDING.pack_id,
    to_pack_id: HRX_CP932_PACK_BINDING.next_pack_id,
    next_subphase_id: HRX_CP932_PACK_BINDING.next_subphase_id,
    handoff_contract: "Continue RP30 P04 AIReviewQueue tail rows into AdminPolicy descriptors while keeping AI review runtime, review actions, final judgment, record writes, real HR data, credentials, secrets, and separate-product claims closed.",
  });
}

export function createHrxCp932CandidateAiReviewQueueBridgeDescriptor() {
  const caseSet = createHrxCp932CandidateAiReviewQueueBridgeCaseSet();
  return deepFreeze({
    descriptor: "HrxCp932CandidateAiReviewQueueBridgeDescriptor",
    source_descriptor: "HrxCp931HrOperationsEmployeeCandidatePortalBridgeDescriptor",
    pack_id: HRX_CP932_PACK_BINDING.pack_id,
    planned_pack_id: HRX_CP932_PACK_BINDING.planned_pack_id,
    range: HRX_CP932_PACK_BINDING.range,
    program_contract: HRX_PROGRAM_CONTRACT,
    authority_boundary: {
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: HRX_CP932_PACK_BINDING.next_pack_id,
    },
    hrx_candidate_ai_review_queue_bridge_case_set: caseSet,
    domain_entities: {
      CandidatePortal: deepFreeze({
        descriptor_only: true,
        candidate_portal_runtime_opened: false,
        candidate_portal_record_write_opened: false,
        candidate_portal_self_service_action_executed: false,
        candidate_portal_permission_bypass_allowed: false,
      }),
      AIReviewQueue: deepFreeze({
        descriptor_only: true,
        ai_review_queue_runtime_opened: false,
        ai_review_queue_record_write_opened: false,
        ai_review_queue_review_action_executed: false,
        ai_review_queue_final_judgment_allowed: false,
      }),
    },
    baseline_decisions: {
      hrx_embedded_inside_law_firm_os: true,
      separate_hrx_product_created: false,
      candidate_portal_descriptor_only: true,
      candidate_portal_runtime_deferred: true,
      candidate_portal_record_writes_deferred: true,
      candidate_portal_self_service_actions_deferred: true,
      candidate_portal_permission_bypass_closed: true,
      ai_review_queue_descriptor_only: true,
      ai_review_queue_runtime_deferred: true,
      ai_review_queue_record_writes_deferred: true,
      ai_review_queue_review_actions_deferred: true,
      ai_review_queue_final_judgment_deferred: true,
      payroll_calculation_runtime_deferred: true,
      hr_ai_final_judgment_allowed: false,
      sensitive_hr_guard_required: true,
      real_employee_candidate_payroll_document_data_allowed: false,
    },
    requirement_refs: [
      "HRX-CORE-001",
      "HRX-CORE-002",
      "HRX-CORE-003",
      "HRX-GATE-001",
      "HRX-GATE-002",
      "HRX-GATE-003",
      "HRX-GATE-004",
      "HRX-GATE-005",
      "HRX-GATE-006",
    ],
    hermes_packet: createHrxCp932HermesEvidencePacket(),
    claude_packet: createHrxCp932ClaudeReviewPacket(),
    closeout_handoff: createHrxCp932CloseoutHandoff(),
    required_capabilities: HRX_CP932_REQUIREMENTS.required_capabilities,
    safety_gates: HRX_CP932_REQUIREMENTS.safety_gates,
    no_leak_guards: HRX_CP932_REQUIREMENTS.required_no_leak_guards,
    blocked_claims: HRX_BLOCKED_CLAIMS,
    ...HRX_NO_WRITE_ATTESTATION,
  });
}

export function createHrxCp933AiReviewAdminPolicyTailBridgeCaseSet() {
  const sections = {};
  for (const [microId, titles] of Object.entries(HRX_CP933_REQUIRED_SECTION_ROWS)) {
    sections[microId] = deepFreeze({
      micro_phase_id: microId,
      row_count: titles.length,
      rows: createHrxDomainRows(microId, titles),
    });
  }
  return deepFreeze({
    pack_id: HRX_CP933_PACK_BINDING.pack_id,
    section_count: Object.keys(sections).length,
    row_count: Object.values(sections).reduce((sum, section) => sum + section.row_count, 0),
    sections,
  });
}

export function createHrxCp933HermesEvidencePacket() {
  return deepFreeze({
    gate: HRX_CP933_PACK_BINDING.hermes_gate,
    pack_id: HRX_CP933_PACK_BINDING.pack_id,
    evidence_kind: "hrx_ai_review_admin_policy_tail_bridge",
    emits_runtime_receipt: false,
    deterministic_only: true,
    validation_commands: ["npm run rp30:hrx:validate", "npm run rp30:validate", "npm run hrx:requirements:validate", "npm run hrx:weighted:validate"],
    boundary_assertions: [
      "ai_review_queue_tail_descriptor",
      "ai_review_queue_runtime_deferred",
      "ai_review_queue_record_writes_deferred",
      "ai_review_queue_review_actions_deferred",
      "ai_review_queue_final_judgment_deferred",
      "admin_policy_foundation_descriptor",
      "admin_policy_runtime_deferred",
      "admin_policy_record_writes_deferred",
      "admin_policy_rule_execution_deferred",
      "admin_policy_finalization_deferred",
      "real_hr_data_excluded",
      "credentials_and_secrets_excluded",
    ],
  });
}

export function createHrxCp933ClaudeReviewPacket() {
  return deepFreeze({
    gate: HRX_CP933_PACK_BINDING.claude_gate,
    pack_id: HRX_CP933_PACK_BINDING.pack_id,
    read_only: true,
    promotes_claude_to_final_approval: false,
    review_questions: [
      "Do AIReviewQueue tail rows remain descriptor-only without queue runtime, record writes, review action execution, or final judgment?",
      "Do AdminPolicy foundation rows remain descriptor-only without admin policy runtime, record writes, rule execution, or policy finalization?",
      "Does CP933 keep real HR data, credentials, secrets, runtime receipts, enterprise trust, and separate HRX product claims closed?",
    ],
  });
}

export function createHrxCp933CloseoutHandoff() {
  return deepFreeze({
    from_pack_id: HRX_CP933_PACK_BINDING.pack_id,
    to_pack_id: HRX_CP933_PACK_BINDING.next_pack_id,
    next_subphase_id: HRX_CP933_PACK_BINDING.next_subphase_id,
    handoff_contract: "Continue RP30 P04 AdminPolicy tail rows into SyntheticTenant descriptors while keeping admin policy runtime, rule execution, policy finalization, record writes, real HR data, credentials, secrets, and separate-product claims closed.",
  });
}

export function createHrxCp933AiReviewAdminPolicyTailBridgeDescriptor() {
  const caseSet = createHrxCp933AiReviewAdminPolicyTailBridgeCaseSet();
  return deepFreeze({
    descriptor: "HrxCp933AiReviewAdminPolicyTailBridgeDescriptor",
    source_descriptor: "HrxCp932CandidateAiReviewQueueBridgeDescriptor",
    pack_id: HRX_CP933_PACK_BINDING.pack_id,
    planned_pack_id: HRX_CP933_PACK_BINDING.planned_pack_id,
    range: HRX_CP933_PACK_BINDING.range,
    program_contract: HRX_PROGRAM_CONTRACT,
    authority_boundary: {
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: HRX_CP933_PACK_BINDING.next_pack_id,
    },
    hrx_ai_review_admin_policy_tail_bridge_case_set: caseSet,
    domain_entities: {
      AIReviewQueue: deepFreeze({
        descriptor_only: true,
        ai_review_queue_runtime_opened: false,
        ai_review_queue_record_write_opened: false,
        ai_review_queue_review_action_executed: false,
        ai_review_queue_final_judgment_allowed: false,
      }),
      AdminPolicy: deepFreeze({
        descriptor_only: true,
        admin_policy_runtime_opened: false,
        admin_policy_record_write_opened: false,
        admin_policy_rule_execution_opened: false,
        admin_policy_finalization_allowed: false,
      }),
    },
    baseline_decisions: {
      hrx_embedded_inside_law_firm_os: true,
      separate_hrx_product_created: false,
      ai_review_queue_descriptor_only: true,
      ai_review_queue_runtime_deferred: true,
      ai_review_queue_record_writes_deferred: true,
      ai_review_queue_review_actions_deferred: true,
      ai_review_queue_final_judgment_deferred: true,
      admin_policy_descriptor_only: true,
      admin_policy_runtime_deferred: true,
      admin_policy_record_writes_deferred: true,
      admin_policy_rule_execution_deferred: true,
      admin_policy_finalization_deferred: true,
      payroll_calculation_runtime_deferred: true,
      hr_ai_final_judgment_allowed: false,
      sensitive_hr_guard_required: true,
      real_employee_candidate_payroll_document_data_allowed: false,
    },
    requirement_refs: [
      "HRX-CORE-001",
      "HRX-CORE-002",
      "HRX-CORE-003",
      "HRX-GATE-001",
      "HRX-GATE-002",
      "HRX-GATE-003",
      "HRX-GATE-004",
      "HRX-GATE-005",
      "HRX-GATE-006",
    ],
    hermes_packet: createHrxCp933HermesEvidencePacket(),
    claude_packet: createHrxCp933ClaudeReviewPacket(),
    closeout_handoff: createHrxCp933CloseoutHandoff(),
    required_capabilities: HRX_CP933_REQUIREMENTS.required_capabilities,
    safety_gates: HRX_CP933_REQUIREMENTS.safety_gates,
    no_leak_guards: HRX_CP933_REQUIREMENTS.required_no_leak_guards,
    blocked_claims: HRX_BLOCKED_CLAIMS,
    ...HRX_NO_WRITE_ATTESTATION,
  });
}

export function createHrxCp934AdminPolicySyntheticTenantBridgeCaseSet() {
  const sections = {};
  for (const [microId, titles] of Object.entries(HRX_CP934_REQUIRED_SECTION_ROWS)) {
    sections[microId] = deepFreeze({
      micro_phase_id: microId,
      row_count: titles.length,
      rows: createHrxDomainRows(microId, titles),
    });
  }
  return deepFreeze({
    pack_id: HRX_CP934_PACK_BINDING.pack_id,
    section_count: Object.keys(sections).length,
    row_count: Object.values(sections).reduce((sum, section) => sum + section.row_count, 0),
    sections,
  });
}

export function createHrxCp934HermesEvidencePacket() {
  return deepFreeze({
    gate: HRX_CP934_PACK_BINDING.hermes_gate,
    pack_id: HRX_CP934_PACK_BINDING.pack_id,
    evidence_kind: "hrx_admin_policy_synthetic_tenant_bridge",
    emits_runtime_receipt: false,
    deterministic_only: true,
    validation_commands: ["npm run rp30:hrx:validate", "npm run rp30:validate", "npm run hrx:requirements:validate", "npm run hrx:weighted:validate"],
    boundary_assertions: [
      "admin_policy_tail_descriptor",
      "admin_policy_runtime_deferred",
      "admin_policy_record_writes_deferred",
      "admin_policy_rule_execution_deferred",
      "admin_policy_finalization_deferred",
      "synthetic_tenant_foundation_descriptor",
      "synthetic_tenant_runtime_deferred",
      "synthetic_tenant_record_writes_deferred",
      "synthetic_tenant_real_data_excluded",
      "synthetic_tenant_permission_bypass_deferred",
      "credentials_and_secrets_excluded",
    ],
  });
}

export function createHrxCp934ClaudeReviewPacket() {
  return deepFreeze({
    gate: HRX_CP934_PACK_BINDING.claude_gate,
    pack_id: HRX_CP934_PACK_BINDING.pack_id,
    read_only: true,
    promotes_claude_to_final_approval: false,
    review_questions: [
      "Do AdminPolicy tail rows remain descriptor-only without admin policy runtime, record writes, rule execution, or policy finalization?",
      "Do SyntheticTenant foundation rows remain descriptor-only without synthetic tenant runtime, record writes, real HR data, fixture runtime, or permission bypass?",
      "Does CP934 keep credentials, secrets, runtime receipts, enterprise trust, and separate HRX product claims closed?",
    ],
  });
}

export function createHrxCp934CloseoutHandoff() {
  return deepFreeze({
    from_pack_id: HRX_CP934_PACK_BINDING.pack_id,
    to_pack_id: HRX_CP934_PACK_BINDING.next_pack_id,
    next_subphase_id: HRX_CP934_PACK_BINDING.next_subphase_id,
    handoff_contract: "Continue RP30 P05 SyntheticTenant tail rows into EmployeeFixture descriptors while keeping synthetic tenant runtime, fixture runtime, real HR data, record writes, credentials, secrets, and separate-product claims closed.",
  });
}

export function createHrxCp934AdminPolicySyntheticTenantBridgeDescriptor() {
  const caseSet = createHrxCp934AdminPolicySyntheticTenantBridgeCaseSet();
  return deepFreeze({
    descriptor: "HrxCp934AdminPolicySyntheticTenantBridgeDescriptor",
    source_descriptor: "HrxCp933AiReviewAdminPolicyTailBridgeDescriptor",
    pack_id: HRX_CP934_PACK_BINDING.pack_id,
    planned_pack_id: HRX_CP934_PACK_BINDING.planned_pack_id,
    range: HRX_CP934_PACK_BINDING.range,
    program_contract: HRX_PROGRAM_CONTRACT,
    authority_boundary: {
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: HRX_CP934_PACK_BINDING.next_pack_id,
    },
    hrx_admin_policy_synthetic_tenant_bridge_case_set: caseSet,
    domain_entities: {
      AdminPolicy: deepFreeze({
        descriptor_only: true,
        admin_policy_runtime_opened: false,
        admin_policy_record_write_opened: false,
        admin_policy_rule_execution_opened: false,
        admin_policy_finalization_allowed: false,
      }),
      SyntheticTenant: deepFreeze({
        descriptor_only: true,
        synthetic_tenant_runtime_opened: false,
        synthetic_tenant_record_write_opened: false,
        synthetic_tenant_real_data_allowed: false,
        synthetic_tenant_permission_bypass_allowed: false,
        synthetic_tenant_fixture_runtime_opened: false,
      }),
    },
    baseline_decisions: {
      hrx_embedded_inside_law_firm_os: true,
      separate_hrx_product_created: false,
      admin_policy_descriptor_only: true,
      admin_policy_runtime_deferred: true,
      admin_policy_record_writes_deferred: true,
      admin_policy_rule_execution_deferred: true,
      admin_policy_finalization_deferred: true,
      synthetic_tenant_descriptor_only: true,
      synthetic_tenant_runtime_deferred: true,
      synthetic_tenant_record_writes_deferred: true,
      synthetic_tenant_real_data_deferred: true,
      synthetic_tenant_permission_bypass_deferred: true,
      synthetic_tenant_fixture_runtime_deferred: true,
      payroll_calculation_runtime_deferred: true,
      hr_ai_final_judgment_allowed: false,
      sensitive_hr_guard_required: true,
      real_employee_candidate_payroll_document_data_allowed: false,
    },
    requirement_refs: [
      "HRX-CORE-001",
      "HRX-CORE-002",
      "HRX-CORE-003",
      "HRX-GATE-001",
      "HRX-GATE-002",
      "HRX-GATE-003",
      "HRX-GATE-004",
      "HRX-GATE-005",
      "HRX-GATE-006",
    ],
    hermes_packet: createHrxCp934HermesEvidencePacket(),
    claude_packet: createHrxCp934ClaudeReviewPacket(),
    closeout_handoff: createHrxCp934CloseoutHandoff(),
    required_capabilities: HRX_CP934_REQUIREMENTS.required_capabilities,
    safety_gates: HRX_CP934_REQUIREMENTS.safety_gates,
    no_leak_guards: HRX_CP934_REQUIREMENTS.required_no_leak_guards,
    blocked_claims: HRX_BLOCKED_CLAIMS,
    ...HRX_NO_WRITE_ATTESTATION,
  });
}

export function createHrxCp935SyntheticTenantEmployeeFixtureBridgeCaseSet() {
  const sections = {};
  for (const [microId, titles] of Object.entries(HRX_CP935_REQUIRED_SECTION_ROWS)) {
    sections[microId] = deepFreeze({
      micro_phase_id: microId,
      row_count: titles.length,
      rows: createHrxDomainRows(microId, titles),
    });
  }
  return deepFreeze({
    pack_id: HRX_CP935_PACK_BINDING.pack_id,
    section_count: Object.keys(sections).length,
    row_count: Object.values(sections).reduce((sum, section) => sum + section.row_count, 0),
    sections,
  });
}

export function createHrxCp935HermesEvidencePacket() {
  return deepFreeze({
    gate: HRX_CP935_PACK_BINDING.hermes_gate,
    pack_id: HRX_CP935_PACK_BINDING.pack_id,
    evidence_kind: "hrx_synthetic_tenant_employee_fixture_bridge",
    emits_runtime_receipt: false,
    deterministic_only: true,
    validation_commands: ["npm run rp30:hrx:validate", "npm run rp30:validate", "npm run hrx:requirements:validate", "npm run hrx:weighted:validate"],
    boundary_assertions: [
      "synthetic_tenant_tail_descriptor",
      "synthetic_tenant_runtime_deferred",
      "synthetic_tenant_record_writes_deferred",
      "synthetic_tenant_real_data_excluded",
      "employee_fixture_foundation_descriptor",
      "employee_fixture_runtime_deferred",
      "employee_fixture_record_writes_deferred",
      "employee_fixture_real_employee_data_excluded",
      "employee_fixture_permission_bypass_deferred",
      "credentials_and_secrets_excluded",
    ],
  });
}

export function createHrxCp935ClaudeReviewPacket() {
  return deepFreeze({
    gate: HRX_CP935_PACK_BINDING.claude_gate,
    pack_id: HRX_CP935_PACK_BINDING.pack_id,
    read_only: true,
    promotes_claude_to_final_approval: false,
    review_questions: [
      "Do SyntheticTenant tail rows remain descriptor-only without synthetic tenant runtime, record writes, real HR data, fixture runtime, or permission bypass?",
      "Do EmployeeFixture foundation rows remain descriptor-only without fixture runtime, employee record writes, real employee data, identity-link runtime, or permission bypass?",
      "Does CP935 keep credentials, secrets, runtime receipts, enterprise trust, and separate HRX product claims closed?",
    ],
  });
}

export function createHrxCp935CloseoutHandoff() {
  return deepFreeze({
    from_pack_id: HRX_CP935_PACK_BINDING.pack_id,
    to_pack_id: HRX_CP935_PACK_BINDING.next_pack_id,
    next_subphase_id: HRX_CP935_PACK_BINDING.next_subphase_id,
    handoff_contract: "Continue RP30 P05 EmployeeFixture tail rows into CandidateFixture descriptors while keeping fixture runtime, real employee/candidate data, record writes, credentials, secrets, and separate-product claims closed.",
  });
}

export function createHrxCp935SyntheticTenantEmployeeFixtureBridgeDescriptor() {
  const caseSet = createHrxCp935SyntheticTenantEmployeeFixtureBridgeCaseSet();
  return deepFreeze({
    descriptor: "HrxCp935SyntheticTenantEmployeeFixtureBridgeDescriptor",
    source_descriptor: "HrxCp934AdminPolicySyntheticTenantBridgeDescriptor",
    pack_id: HRX_CP935_PACK_BINDING.pack_id,
    planned_pack_id: HRX_CP935_PACK_BINDING.planned_pack_id,
    range: HRX_CP935_PACK_BINDING.range,
    program_contract: HRX_PROGRAM_CONTRACT,
    authority_boundary: {
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: HRX_CP935_PACK_BINDING.next_pack_id,
    },
    hrx_synthetic_tenant_employee_fixture_bridge_case_set: caseSet,
    domain_entities: {
      SyntheticTenant: deepFreeze({
        descriptor_only: true,
        synthetic_tenant_runtime_opened: false,
        synthetic_tenant_record_write_opened: false,
        synthetic_tenant_real_data_allowed: false,
        synthetic_tenant_permission_bypass_allowed: false,
        synthetic_tenant_fixture_runtime_opened: false,
      }),
      EmployeeFixture: deepFreeze({
        descriptor_only: true,
        employee_fixture_runtime_opened: false,
        employee_fixture_record_write_opened: false,
        employee_fixture_real_data_allowed: false,
        employee_fixture_permission_bypass_allowed: false,
        employee_fixture_identity_link_runtime_opened: false,
      }),
    },
    baseline_decisions: {
      hrx_embedded_inside_law_firm_os: true,
      separate_hrx_product_created: false,
      synthetic_tenant_descriptor_only: true,
      synthetic_tenant_runtime_deferred: true,
      synthetic_tenant_record_writes_deferred: true,
      synthetic_tenant_real_data_deferred: true,
      synthetic_tenant_permission_bypass_deferred: true,
      synthetic_tenant_fixture_runtime_deferred: true,
      employee_fixture_descriptor_only: true,
      employee_fixture_runtime_deferred: true,
      employee_fixture_record_writes_deferred: true,
      employee_fixture_real_data_deferred: true,
      employee_fixture_permission_bypass_deferred: true,
      employee_fixture_identity_link_runtime_deferred: true,
      payroll_calculation_runtime_deferred: true,
      hr_ai_final_judgment_allowed: false,
      sensitive_hr_guard_required: true,
      real_employee_candidate_payroll_document_data_allowed: false,
    },
    requirement_refs: [
      "HRX-CORE-001",
      "HRX-CORE-002",
      "HRX-CORE-003",
      "HRX-GATE-001",
      "HRX-GATE-002",
      "HRX-GATE-003",
      "HRX-GATE-004",
      "HRX-GATE-005",
      "HRX-GATE-006",
    ],
    hermes_packet: createHrxCp935HermesEvidencePacket(),
    claude_packet: createHrxCp935ClaudeReviewPacket(),
    closeout_handoff: createHrxCp935CloseoutHandoff(),
    required_capabilities: HRX_CP935_REQUIREMENTS.required_capabilities,
    safety_gates: HRX_CP935_REQUIREMENTS.safety_gates,
    no_leak_guards: HRX_CP935_REQUIREMENTS.required_no_leak_guards,
    blocked_claims: HRX_BLOCKED_CLAIMS,
    ...HRX_NO_WRITE_ATTESTATION,
  });
}

export function createHrxCp936EmployeeCandidateFixtureBridgeCaseSet() {
  const sections = {};
  for (const [microId, titles] of Object.entries(HRX_CP936_REQUIRED_SECTION_ROWS)) {
    sections[microId] = deepFreeze({
      micro_phase_id: microId,
      row_count: titles.length,
      rows: createHrxDomainRows(microId, titles),
    });
  }
  return deepFreeze({
    pack_id: HRX_CP936_PACK_BINDING.pack_id,
    section_count: Object.keys(sections).length,
    row_count: Object.values(sections).reduce((sum, section) => sum + section.row_count, 0),
    sections,
  });
}

export function createHrxCp936HermesEvidencePacket() {
  return deepFreeze({
    gate: HRX_CP936_PACK_BINDING.hermes_gate,
    pack_id: HRX_CP936_PACK_BINDING.pack_id,
    evidence_kind: "hrx_employee_candidate_fixture_bridge",
    emits_runtime_receipt: false,
    deterministic_only: true,
    validation_commands: ["npm run rp30:hrx:validate", "npm run rp30:validate", "npm run hrx:requirements:validate", "npm run hrx:weighted:validate"],
    boundary_assertions: [
      "employee_fixture_tail_descriptor",
      "employee_fixture_runtime_deferred",
      "employee_fixture_record_writes_deferred",
      "employee_fixture_real_employee_data_excluded",
      "employee_fixture_identity_link_runtime_deferred",
      "candidate_fixture_foundation_descriptor",
      "candidate_fixture_runtime_deferred",
      "candidate_fixture_record_writes_deferred",
      "candidate_fixture_real_candidate_data_excluded",
      "candidate_fixture_permission_bypass_deferred",
      "credentials_and_secrets_excluded",
    ],
  });
}

export function createHrxCp936ClaudeReviewPacket() {
  return deepFreeze({
    gate: HRX_CP936_PACK_BINDING.claude_gate,
    pack_id: HRX_CP936_PACK_BINDING.pack_id,
    read_only: true,
    promotes_claude_to_final_approval: false,
    review_questions: [
      "Do EmployeeFixture tail rows remain descriptor-only without fixture runtime, employee record writes, real employee data, identity-link runtime, or permission bypass?",
      "Do CandidateFixture foundation rows remain descriptor-only without fixture runtime, candidate record writes, real candidate data, identity-link runtime, or permission bypass?",
      "Does CP936 keep credentials, secrets, runtime receipts, enterprise trust, and separate HRX product claims closed?",
    ],
  });
}

export function createHrxCp936CloseoutHandoff() {
  return deepFreeze({
    from_pack_id: HRX_CP936_PACK_BINDING.pack_id,
    to_pack_id: HRX_CP936_PACK_BINDING.next_pack_id,
    next_subphase_id: HRX_CP936_PACK_BINDING.next_subphase_id,
    handoff_contract: "Continue RP30 P05 CandidateFixture tail rows into LeaveFixture descriptors while keeping fixture runtime, real employee/candidate/leave data, record writes, credentials, secrets, and separate-product claims closed.",
  });
}

export function createHrxCp936EmployeeCandidateFixtureBridgeDescriptor() {
  const caseSet = createHrxCp936EmployeeCandidateFixtureBridgeCaseSet();
  return deepFreeze({
    descriptor: "HrxCp936EmployeeCandidateFixtureBridgeDescriptor",
    source_descriptor: "HrxCp935SyntheticTenantEmployeeFixtureBridgeDescriptor",
    pack_id: HRX_CP936_PACK_BINDING.pack_id,
    planned_pack_id: HRX_CP936_PACK_BINDING.planned_pack_id,
    range: HRX_CP936_PACK_BINDING.range,
    program_contract: HRX_PROGRAM_CONTRACT,
    authority_boundary: {
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: HRX_CP936_PACK_BINDING.next_pack_id,
    },
    hrx_employee_candidate_fixture_bridge_case_set: caseSet,
    domain_entities: {
      EmployeeFixture: deepFreeze({
        descriptor_only: true,
        employee_fixture_runtime_opened: false,
        employee_fixture_record_write_opened: false,
        employee_fixture_real_data_allowed: false,
        employee_fixture_permission_bypass_allowed: false,
        employee_fixture_identity_link_runtime_opened: false,
      }),
      CandidateFixture: deepFreeze({
        descriptor_only: true,
        candidate_fixture_runtime_opened: false,
        candidate_fixture_record_write_opened: false,
        candidate_fixture_real_data_allowed: false,
        candidate_fixture_permission_bypass_allowed: false,
        candidate_fixture_identity_link_runtime_opened: false,
      }),
    },
    baseline_decisions: {
      hrx_embedded_inside_law_firm_os: true,
      separate_hrx_product_created: false,
      employee_fixture_descriptor_only: true,
      employee_fixture_runtime_deferred: true,
      employee_fixture_record_writes_deferred: true,
      employee_fixture_real_data_deferred: true,
      employee_fixture_permission_bypass_deferred: true,
      employee_fixture_identity_link_runtime_deferred: true,
      candidate_fixture_descriptor_only: true,
      candidate_fixture_runtime_deferred: true,
      candidate_fixture_record_writes_deferred: true,
      candidate_fixture_real_data_deferred: true,
      candidate_fixture_permission_bypass_deferred: true,
      candidate_fixture_identity_link_runtime_deferred: true,
      payroll_calculation_runtime_deferred: true,
      hr_ai_final_judgment_allowed: false,
      sensitive_hr_guard_required: true,
      real_employee_candidate_payroll_document_data_allowed: false,
    },
    requirement_refs: [
      "HRX-CORE-001",
      "HRX-CORE-002",
      "HRX-CORE-003",
      "HRX-GATE-001",
      "HRX-GATE-002",
      "HRX-GATE-003",
      "HRX-GATE-004",
      "HRX-GATE-005",
      "HRX-GATE-006",
    ],
    hermes_packet: createHrxCp936HermesEvidencePacket(),
    claude_packet: createHrxCp936ClaudeReviewPacket(),
    closeout_handoff: createHrxCp936CloseoutHandoff(),
    required_capabilities: HRX_CP936_REQUIREMENTS.required_capabilities,
    safety_gates: HRX_CP936_REQUIREMENTS.safety_gates,
    no_leak_guards: HRX_CP936_REQUIREMENTS.required_no_leak_guards,
    blocked_claims: HRX_BLOCKED_CLAIMS,
    ...HRX_NO_WRITE_ATTESTATION,
  });
}

export function createHrxCp937CandidateLeaveFixtureBridgeCaseSet() {
  const sections = {};
  for (const [microId, titles] of Object.entries(HRX_CP937_REQUIRED_SECTION_ROWS)) {
    sections[microId] = deepFreeze({
      micro_phase_id: microId,
      row_count: titles.length,
      rows: createHrxDomainRows(microId, titles),
    });
  }
  return deepFreeze({
    pack_id: HRX_CP937_PACK_BINDING.pack_id,
    section_count: Object.keys(sections).length,
    row_count: Object.values(sections).reduce((sum, section) => sum + section.row_count, 0),
    sections,
  });
}

export function createHrxCp937HermesEvidencePacket() {
  return deepFreeze({
    gate: HRX_CP937_PACK_BINDING.hermes_gate,
    pack_id: HRX_CP937_PACK_BINDING.pack_id,
    evidence_kind: "hrx_candidate_leave_fixture_bridge",
    emits_runtime_receipt: false,
    deterministic_only: true,
    validation_commands: ["npm run rp30:hrx:validate", "npm run rp30:validate", "npm run hrx:requirements:validate", "npm run hrx:weighted:validate"],
    boundary_assertions: [
      "candidate_fixture_tail_descriptor",
      "candidate_fixture_runtime_deferred",
      "candidate_fixture_record_writes_deferred",
      "candidate_fixture_real_candidate_data_excluded",
      "candidate_fixture_identity_link_runtime_deferred",
      "leave_fixture_foundation_descriptor",
      "leave_fixture_runtime_deferred",
      "leave_fixture_record_writes_deferred",
      "leave_fixture_real_leave_data_excluded",
      "leave_fixture_permission_bypass_deferred",
      "credentials_and_secrets_excluded",
    ],
  });
}

export function createHrxCp937ClaudeReviewPacket() {
  return deepFreeze({
    gate: HRX_CP937_PACK_BINDING.claude_gate,
    pack_id: HRX_CP937_PACK_BINDING.pack_id,
    read_only: true,
    promotes_claude_to_final_approval: false,
    review_questions: [
      "Does the CandidateFixture tail row remain descriptor-only without fixture runtime, candidate record writes, real candidate data, identity-link runtime, or permission bypass?",
      "Do LeaveFixture foundation rows remain descriptor-only without leave fixture runtime, leave record writes, real leave data, request runtime, or permission bypass?",
      "Does CP937 keep credentials, secrets, runtime receipts, enterprise trust, and separate HRX product claims closed?",
    ],
  });
}

export function createHrxCp937CloseoutHandoff() {
  return deepFreeze({
    from_pack_id: HRX_CP937_PACK_BINDING.pack_id,
    to_pack_id: HRX_CP937_PACK_BINDING.next_pack_id,
    next_subphase_id: HRX_CP937_PACK_BINDING.next_subphase_id,
    handoff_contract: "Continue RP30 P05 RiskFixture and AuditFixture descriptors while keeping fixture runtime, real HR/risk/audit data, record writes, credentials, secrets, and separate-product claims closed.",
  });
}

export function createHrxCp937CandidateLeaveFixtureBridgeDescriptor() {
  const caseSet = createHrxCp937CandidateLeaveFixtureBridgeCaseSet();
  return deepFreeze({
    descriptor: "HrxCp937CandidateLeaveFixtureBridgeDescriptor",
    source_descriptor: "HrxCp936EmployeeCandidateFixtureBridgeDescriptor",
    pack_id: HRX_CP937_PACK_BINDING.pack_id,
    planned_pack_id: HRX_CP937_PACK_BINDING.planned_pack_id,
    range: HRX_CP937_PACK_BINDING.range,
    program_contract: HRX_PROGRAM_CONTRACT,
    authority_boundary: {
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: HRX_CP937_PACK_BINDING.next_pack_id,
    },
    hrx_candidate_leave_fixture_bridge_case_set: caseSet,
    domain_entities: {
      CandidateFixture: deepFreeze({
        descriptor_only: true,
        candidate_fixture_runtime_opened: false,
        candidate_fixture_record_write_opened: false,
        candidate_fixture_real_data_allowed: false,
        candidate_fixture_permission_bypass_allowed: false,
        candidate_fixture_identity_link_runtime_opened: false,
      }),
      LeaveFixture: deepFreeze({
        descriptor_only: true,
        leave_fixture_runtime_opened: false,
        leave_fixture_record_write_opened: false,
        leave_fixture_real_data_allowed: false,
        leave_fixture_permission_bypass_allowed: false,
        leave_fixture_request_runtime_opened: false,
      }),
    },
    baseline_decisions: {
      hrx_embedded_inside_law_firm_os: true,
      separate_hrx_product_created: false,
      candidate_fixture_descriptor_only: true,
      candidate_fixture_runtime_deferred: true,
      candidate_fixture_record_writes_deferred: true,
      candidate_fixture_real_data_deferred: true,
      candidate_fixture_permission_bypass_deferred: true,
      candidate_fixture_identity_link_runtime_deferred: true,
      leave_fixture_descriptor_only: true,
      leave_fixture_runtime_deferred: true,
      leave_fixture_record_writes_deferred: true,
      leave_fixture_real_data_deferred: true,
      leave_fixture_permission_bypass_deferred: true,
      leave_fixture_request_runtime_deferred: true,
      payroll_calculation_runtime_deferred: true,
      hr_ai_final_judgment_allowed: false,
      sensitive_hr_guard_required: true,
      real_employee_candidate_payroll_document_data_allowed: false,
    },
    requirement_refs: [
      "HRX-CORE-001",
      "HRX-CORE-002",
      "HRX-CORE-003",
      "HRX-GATE-001",
      "HRX-GATE-002",
      "HRX-GATE-003",
      "HRX-GATE-004",
      "HRX-GATE-005",
      "HRX-GATE-006",
    ],
    hermes_packet: createHrxCp937HermesEvidencePacket(),
    claude_packet: createHrxCp937ClaudeReviewPacket(),
    closeout_handoff: createHrxCp937CloseoutHandoff(),
    required_capabilities: HRX_CP937_REQUIREMENTS.required_capabilities,
    safety_gates: HRX_CP937_REQUIREMENTS.safety_gates,
    no_leak_guards: HRX_CP937_REQUIREMENTS.required_no_leak_guards,
    blocked_claims: HRX_BLOCKED_CLAIMS,
    ...HRX_NO_WRITE_ATTESTATION,
  });
}

export function createHrxCp938RiskAuditFixtureBridgeCaseSet() {
  const sections = {};
  for (const [microId, titles] of Object.entries(HRX_CP938_REQUIRED_SECTION_ROWS)) {
    sections[microId] = deepFreeze({
      micro_phase_id: microId,
      row_count: titles.length,
      rows: createHrxDomainRows(microId, titles),
    });
  }
  return deepFreeze({
    pack_id: HRX_CP938_PACK_BINDING.pack_id,
    section_count: Object.keys(sections).length,
    row_count: Object.values(sections).reduce((sum, section) => sum + section.row_count, 0),
    sections,
  });
}

export function createHrxCp938HermesEvidencePacket() {
  return deepFreeze({
    gate: HRX_CP938_PACK_BINDING.hermes_gate,
    pack_id: HRX_CP938_PACK_BINDING.pack_id,
    evidence_kind: "hrx_risk_audit_fixture_bridge",
    emits_runtime_receipt: false,
    deterministic_only: true,
    validation_commands: ["npm run rp30:hrx:validate", "npm run rp30:validate", "npm run hrx:requirements:validate", "npm run hrx:weighted:validate"],
    boundary_assertions: [
      "risk_fixture_foundation_descriptor",
      "risk_fixture_runtime_deferred",
      "risk_fixture_record_writes_deferred",
      "risk_fixture_real_risk_data_excluded",
      "risk_fixture_score_calculation_deferred",
      "audit_fixture_foundation_descriptor",
      "audit_fixture_security_audit_descriptor",
      "audit_fixture_runtime_deferred",
      "audit_fixture_record_writes_deferred",
      "audit_fixture_runtime_receipts_deferred",
      "credentials_and_secrets_excluded",
    ],
  });
}

export function createHrxCp938ClaudeReviewPacket() {
  return deepFreeze({
    gate: HRX_CP938_PACK_BINDING.claude_gate,
    pack_id: HRX_CP938_PACK_BINDING.pack_id,
    read_only: true,
    promotes_claude_to_final_approval: false,
    review_questions: [
      "Do RiskFixture foundation rows remain descriptor-only without risk runtime, risk record writes, real risk data, score calculation, or permission bypass?",
      "Does the AuditFixture foundation row remain descriptor-only security-audit evidence without audit runtime, audit writes, real audit data, or runtime receipts?",
      "Does CP938 keep credentials, secrets, enterprise trust, and separate HRX product claims closed?",
    ],
  });
}

export function createHrxCp938CloseoutHandoff() {
  return deepFreeze({
    from_pack_id: HRX_CP938_PACK_BINDING.pack_id,
    to_pack_id: HRX_CP938_PACK_BINDING.next_pack_id,
    next_subphase_id: HRX_CP938_PACK_BINDING.next_subphase_id,
    handoff_contract: "Continue RP30 P05 AuditFixture tail rows into SyntheticTenant descriptors while keeping audit runtime, synthetic tenant runtime, real HR data, record writes, credentials, secrets, and separate-product claims closed.",
  });
}

export function createHrxCp938RiskAuditFixtureBridgeDescriptor() {
  const caseSet = createHrxCp938RiskAuditFixtureBridgeCaseSet();
  return deepFreeze({
    descriptor: "HrxCp938RiskAuditFixtureBridgeDescriptor",
    source_descriptor: "HrxCp937CandidateLeaveFixtureBridgeDescriptor",
    pack_id: HRX_CP938_PACK_BINDING.pack_id,
    planned_pack_id: HRX_CP938_PACK_BINDING.planned_pack_id,
    range: HRX_CP938_PACK_BINDING.range,
    program_contract: HRX_PROGRAM_CONTRACT,
    authority_boundary: {
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: HRX_CP938_PACK_BINDING.next_pack_id,
    },
    hrx_risk_audit_fixture_bridge_case_set: caseSet,
    domain_entities: {
      RiskFixture: deepFreeze({
        descriptor_only: true,
        risk_fixture_runtime_opened: false,
        risk_fixture_record_write_opened: false,
        risk_fixture_real_data_allowed: false,
        risk_fixture_score_calculated: false,
        risk_fixture_permission_bypass_allowed: false,
      }),
      AuditFixture: deepFreeze({
        descriptor_only: true,
        audit_fixture_security_audit_descriptor: true,
        audit_fixture_runtime_opened: false,
        audit_fixture_record_write_opened: false,
        audit_fixture_real_data_allowed: false,
        audit_fixture_runtime_receipt_emitted: false,
      }),
    },
    baseline_decisions: {
      hrx_embedded_inside_law_firm_os: true,
      separate_hrx_product_created: false,
      risk_fixture_descriptor_only: true,
      risk_fixture_runtime_deferred: true,
      risk_fixture_record_writes_deferred: true,
      risk_fixture_real_data_deferred: true,
      risk_fixture_score_calculation_deferred: true,
      risk_fixture_permission_bypass_deferred: true,
      audit_fixture_descriptor_only: true,
      audit_fixture_security_audit_descriptor: true,
      audit_fixture_runtime_deferred: true,
      audit_fixture_record_writes_deferred: true,
      audit_fixture_real_data_deferred: true,
      audit_fixture_runtime_receipts_deferred: true,
      payroll_calculation_runtime_deferred: true,
      hr_ai_final_judgment_allowed: false,
      sensitive_hr_guard_required: true,
      real_employee_candidate_payroll_document_data_allowed: false,
    },
    requirement_refs: [
      "HRX-CORE-001",
      "HRX-CORE-002",
      "HRX-CORE-003",
      "HRX-GATE-001",
      "HRX-GATE-002",
      "HRX-GATE-003",
      "HRX-GATE-004",
      "HRX-GATE-005",
      "HRX-GATE-006",
    ],
    hermes_packet: createHrxCp938HermesEvidencePacket(),
    claude_packet: createHrxCp938ClaudeReviewPacket(),
    closeout_handoff: createHrxCp938CloseoutHandoff(),
    required_capabilities: HRX_CP938_REQUIREMENTS.required_capabilities,
    safety_gates: HRX_CP938_REQUIREMENTS.safety_gates,
    no_leak_guards: HRX_CP938_REQUIREMENTS.required_no_leak_guards,
    blocked_claims: HRX_BLOCKED_CLAIMS,
    ...HRX_NO_WRITE_ATTESTATION,
  });
}

export function createHrxCp939AuditFixtureSyntheticTenantBridgeCaseSet() {
  const sections = {};
  for (const [microId, titles] of Object.entries(HRX_CP939_REQUIRED_SECTION_ROWS)) {
    sections[microId] = deepFreeze({
      micro_phase_id: microId,
      row_count: titles.length,
      rows: createHrxDomainRows(microId, titles),
    });
  }
  return deepFreeze({
    pack_id: HRX_CP939_PACK_BINDING.pack_id,
    section_count: Object.keys(sections).length,
    row_count: Object.values(sections).reduce((sum, section) => sum + section.row_count, 0),
    sections,
  });
}

export function createHrxCp939HermesEvidencePacket() {
  return deepFreeze({
    gate: HRX_CP939_PACK_BINDING.hermes_gate,
    pack_id: HRX_CP939_PACK_BINDING.pack_id,
    evidence_kind: "hrx_audit_fixture_synthetic_tenant_bridge",
    emits_runtime_receipt: false,
    deterministic_only: true,
    validation_commands: ["npm run rp30:hrx:validate", "npm run rp30:validate", "npm run hrx:requirements:validate", "npm run hrx:weighted:validate"],
    boundary_assertions: [
      "audit_fixture_tail_descriptor",
      "audit_fixture_security_audit_descriptor",
      "audit_fixture_runtime_deferred",
      "audit_fixture_record_writes_deferred",
      "audit_fixture_real_audit_data_excluded",
      "audit_fixture_runtime_receipts_deferred",
      "synthetic_tenant_foundation_descriptor",
      "synthetic_tenant_runtime_deferred",
      "synthetic_tenant_record_writes_deferred",
      "synthetic_tenant_fixture_runtime_deferred",
      "synthetic_tenant_real_hr_data_excluded",
      "credentials_and_secrets_excluded",
    ],
  });
}

export function createHrxCp939ClaudeReviewPacket() {
  return deepFreeze({
    gate: HRX_CP939_PACK_BINDING.claude_gate,
    pack_id: HRX_CP939_PACK_BINDING.pack_id,
    read_only: true,
    promotes_claude_to_final_approval: false,
    review_questions: [
      "Do AuditFixture tail rows remain descriptor-only security-audit evidence without audit runtime, audit writes, real audit data, or runtime receipts?",
      "Do SyntheticTenant foundation rows remain descriptor-only without synthetic tenant runtime, fixture runtime, record writes, real HR data, or permission bypass?",
      "Does CP939 keep credentials, secrets, enterprise trust, and separate HRX product claims closed?",
    ],
  });
}

export function createHrxCp939CloseoutHandoff() {
  return deepFreeze({
    from_pack_id: HRX_CP939_PACK_BINDING.pack_id,
    to_pack_id: HRX_CP939_PACK_BINDING.next_pack_id,
    next_subphase_id: HRX_CP939_PACK_BINDING.next_subphase_id,
    handoff_contract: "Continue RP30 P05 SyntheticTenant tail rows into EmployeeFixture descriptors while keeping synthetic tenant runtime, employee fixture runtime, real HR data, record writes, credentials, secrets, and separate-product claims closed.",
  });
}

export function createHrxCp939AuditFixtureSyntheticTenantBridgeDescriptor() {
  const caseSet = createHrxCp939AuditFixtureSyntheticTenantBridgeCaseSet();
  return deepFreeze({
    descriptor: "HrxCp939AuditFixtureSyntheticTenantBridgeDescriptor",
    source_descriptor: "HrxCp938RiskAuditFixtureBridgeDescriptor",
    pack_id: HRX_CP939_PACK_BINDING.pack_id,
    planned_pack_id: HRX_CP939_PACK_BINDING.planned_pack_id,
    range: HRX_CP939_PACK_BINDING.range,
    program_contract: HRX_PROGRAM_CONTRACT,
    authority_boundary: {
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: HRX_CP939_PACK_BINDING.next_pack_id,
    },
    hrx_audit_fixture_synthetic_tenant_bridge_case_set: caseSet,
    domain_entities: {
      AuditFixture: deepFreeze({
        descriptor_only: true,
        audit_fixture_security_audit_descriptor: true,
        audit_fixture_runtime_opened: false,
        audit_fixture_record_write_opened: false,
        audit_fixture_real_data_allowed: false,
        audit_fixture_runtime_receipt_emitted: false,
      }),
      SyntheticTenant: deepFreeze({
        descriptor_only: true,
        synthetic_tenant_runtime_opened: false,
        synthetic_tenant_record_write_opened: false,
        synthetic_tenant_real_data_allowed: false,
        synthetic_tenant_permission_bypass_allowed: false,
        synthetic_tenant_fixture_runtime_opened: false,
      }),
    },
    baseline_decisions: {
      hrx_embedded_inside_law_firm_os: true,
      separate_hrx_product_created: false,
      audit_fixture_tail_descriptor_only: true,
      audit_fixture_security_audit_descriptor: true,
      audit_fixture_runtime_deferred: true,
      audit_fixture_record_writes_deferred: true,
      audit_fixture_real_data_deferred: true,
      audit_fixture_runtime_receipts_deferred: true,
      synthetic_tenant_foundation_descriptor_only: true,
      synthetic_tenant_runtime_deferred: true,
      synthetic_tenant_record_writes_deferred: true,
      synthetic_tenant_real_data_deferred: true,
      synthetic_tenant_permission_bypass_deferred: true,
      synthetic_tenant_fixture_runtime_deferred: true,
      payroll_calculation_runtime_deferred: true,
      hr_ai_final_judgment_allowed: false,
      sensitive_hr_guard_required: true,
      real_employee_candidate_payroll_document_data_allowed: false,
    },
    requirement_refs: [
      "HRX-CORE-001",
      "HRX-CORE-002",
      "HRX-CORE-003",
      "HRX-GATE-001",
      "HRX-GATE-002",
      "HRX-GATE-003",
      "HRX-GATE-004",
      "HRX-GATE-005",
      "HRX-GATE-006",
    ],
    hermes_packet: createHrxCp939HermesEvidencePacket(),
    claude_packet: createHrxCp939ClaudeReviewPacket(),
    closeout_handoff: createHrxCp939CloseoutHandoff(),
    required_capabilities: HRX_CP939_REQUIREMENTS.required_capabilities,
    safety_gates: HRX_CP939_REQUIREMENTS.safety_gates,
    no_leak_guards: HRX_CP939_REQUIREMENTS.required_no_leak_guards,
    blocked_claims: HRX_BLOCKED_CLAIMS,
    ...HRX_NO_WRITE_ATTESTATION,
  });
}

export function createHrxCp940SyntheticTenantEmployeeFixtureTailBridgeCaseSet() {
  const sections = {};
  for (const [microId, titles] of Object.entries(HRX_CP940_REQUIRED_SECTION_ROWS)) {
    sections[microId] = deepFreeze({
      micro_phase_id: microId,
      row_count: titles.length,
      rows: createHrxDomainRows(microId, titles),
    });
  }
  return deepFreeze({
    pack_id: HRX_CP940_PACK_BINDING.pack_id,
    section_count: Object.keys(sections).length,
    row_count: Object.values(sections).reduce((sum, section) => sum + section.row_count, 0),
    sections,
  });
}

export function createHrxCp940HermesEvidencePacket() {
  return deepFreeze({
    gate: HRX_CP940_PACK_BINDING.hermes_gate,
    pack_id: HRX_CP940_PACK_BINDING.pack_id,
    evidence_kind: "hrx_synthetic_tenant_employee_fixture_tail_bridge",
    emits_runtime_receipt: false,
    deterministic_only: true,
    validation_commands: ["npm run rp30:hrx:validate", "npm run rp30:validate", "npm run hrx:requirements:validate", "npm run hrx:weighted:validate"],
    boundary_assertions: [
      "synthetic_tenant_tail_descriptor",
      "synthetic_tenant_runtime_deferred",
      "synthetic_tenant_record_writes_deferred",
      "synthetic_tenant_real_hr_data_excluded",
      "synthetic_tenant_fixture_runtime_deferred",
      "employee_fixture_foundation_descriptor",
      "employee_fixture_runtime_deferred",
      "employee_fixture_record_writes_deferred",
      "employee_fixture_real_employee_data_excluded",
      "employee_fixture_identity_link_runtime_deferred",
      "credentials_and_secrets_excluded",
    ],
  });
}

export function createHrxCp940ClaudeReviewPacket() {
  return deepFreeze({
    gate: HRX_CP940_PACK_BINDING.claude_gate,
    pack_id: HRX_CP940_PACK_BINDING.pack_id,
    read_only: true,
    promotes_claude_to_final_approval: false,
    review_questions: [
      "Do SyntheticTenant tail rows remain descriptor-only without synthetic tenant runtime, fixture runtime, record writes, real HR data, or permission bypass?",
      "Do EmployeeFixture foundation rows remain descriptor-only without fixture runtime, employee record writes, real employee data, identity-link runtime, or permission bypass?",
      "Does CP940 keep credentials, secrets, enterprise trust, and separate HRX product claims closed?",
    ],
  });
}

export function createHrxCp940CloseoutHandoff() {
  return deepFreeze({
    from_pack_id: HRX_CP940_PACK_BINDING.pack_id,
    to_pack_id: HRX_CP940_PACK_BINDING.next_pack_id,
    next_subphase_id: HRX_CP940_PACK_BINDING.next_subphase_id,
    handoff_contract: "Continue RP30 P05 EmployeeFixture tail rows into CandidateFixture descriptors while keeping employee fixture runtime, candidate fixture runtime, identity-link runtime, record writes, real HR data, credentials, secrets, and separate-product claims closed.",
  });
}

export function createHrxCp940SyntheticTenantEmployeeFixtureTailBridgeDescriptor() {
  const caseSet = createHrxCp940SyntheticTenantEmployeeFixtureTailBridgeCaseSet();
  return deepFreeze({
    descriptor: "HrxCp940SyntheticTenantEmployeeFixtureTailBridgeDescriptor",
    source_descriptor: "HrxCp939AuditFixtureSyntheticTenantBridgeDescriptor",
    pack_id: HRX_CP940_PACK_BINDING.pack_id,
    planned_pack_id: HRX_CP940_PACK_BINDING.planned_pack_id,
    range: HRX_CP940_PACK_BINDING.range,
    program_contract: HRX_PROGRAM_CONTRACT,
    authority_boundary: {
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: HRX_CP940_PACK_BINDING.next_pack_id,
    },
    hrx_synthetic_tenant_employee_fixture_tail_bridge_case_set: caseSet,
    domain_entities: {
      SyntheticTenant: deepFreeze({
        descriptor_only: true,
        synthetic_tenant_runtime_opened: false,
        synthetic_tenant_record_write_opened: false,
        synthetic_tenant_real_data_allowed: false,
        synthetic_tenant_permission_bypass_allowed: false,
        synthetic_tenant_fixture_runtime_opened: false,
      }),
      EmployeeFixture: deepFreeze({
        descriptor_only: true,
        employee_fixture_runtime_opened: false,
        employee_fixture_record_write_opened: false,
        employee_fixture_real_data_allowed: false,
        employee_fixture_permission_bypass_allowed: false,
        employee_fixture_identity_link_runtime_opened: false,
      }),
    },
    baseline_decisions: {
      hrx_embedded_inside_law_firm_os: true,
      separate_hrx_product_created: false,
      synthetic_tenant_tail_descriptor_only: true,
      synthetic_tenant_runtime_deferred: true,
      synthetic_tenant_record_writes_deferred: true,
      synthetic_tenant_real_data_deferred: true,
      synthetic_tenant_permission_bypass_deferred: true,
      synthetic_tenant_fixture_runtime_deferred: true,
      employee_fixture_foundation_descriptor_only: true,
      employee_fixture_runtime_deferred: true,
      employee_fixture_record_writes_deferred: true,
      employee_fixture_real_data_deferred: true,
      employee_fixture_permission_bypass_deferred: true,
      employee_fixture_identity_link_runtime_deferred: true,
      payroll_calculation_runtime_deferred: true,
      hr_ai_final_judgment_allowed: false,
      sensitive_hr_guard_required: true,
      real_employee_candidate_payroll_document_data_allowed: false,
    },
    requirement_refs: [
      "HRX-CORE-001",
      "HRX-CORE-002",
      "HRX-CORE-003",
      "HRX-GATE-001",
      "HRX-GATE-002",
      "HRX-GATE-003",
      "HRX-GATE-004",
      "HRX-GATE-005",
      "HRX-GATE-006",
    ],
    hermes_packet: createHrxCp940HermesEvidencePacket(),
    claude_packet: createHrxCp940ClaudeReviewPacket(),
    closeout_handoff: createHrxCp940CloseoutHandoff(),
    required_capabilities: HRX_CP940_REQUIREMENTS.required_capabilities,
    safety_gates: HRX_CP940_REQUIREMENTS.safety_gates,
    no_leak_guards: HRX_CP940_REQUIREMENTS.required_no_leak_guards,
    blocked_claims: HRX_BLOCKED_CLAIMS,
    ...HRX_NO_WRITE_ATTESTATION,
  });
}

export function createHrxCp941EmployeeCandidateFixtureTailBridgeCaseSet() {
  const sections = {};
  for (const [microId, titles] of Object.entries(HRX_CP941_REQUIRED_SECTION_ROWS)) {
    sections[microId] = deepFreeze({
      micro_phase_id: microId,
      row_count: titles.length,
      rows: createHrxDomainRows(microId, titles),
    });
  }
  return deepFreeze({
    pack_id: HRX_CP941_PACK_BINDING.pack_id,
    section_count: Object.keys(sections).length,
    row_count: Object.values(sections).reduce((sum, section) => sum + section.row_count, 0),
    sections,
  });
}

export function createHrxCp941HermesEvidencePacket() {
  return deepFreeze({
    gate: HRX_CP941_PACK_BINDING.hermes_gate,
    pack_id: HRX_CP941_PACK_BINDING.pack_id,
    evidence_kind: "hrx_employee_candidate_fixture_tail_bridge",
    emits_runtime_receipt: false,
    deterministic_only: true,
    validation_commands: ["npm run rp30:hrx:validate", "npm run rp30:validate", "npm run hrx:requirements:validate", "npm run hrx:weighted:validate"],
    boundary_assertions: [
      "employee_fixture_tail_descriptor",
      "employee_fixture_runtime_deferred",
      "employee_fixture_record_writes_deferred",
      "employee_fixture_real_employee_data_excluded",
      "employee_fixture_identity_link_runtime_deferred",
      "candidate_fixture_foundation_descriptor",
      "candidate_fixture_runtime_deferred",
      "candidate_fixture_record_writes_deferred",
      "candidate_fixture_real_candidate_data_excluded",
      "candidate_fixture_identity_link_runtime_deferred",
      "credentials_and_secrets_excluded",
    ],
  });
}

export function createHrxCp941ClaudeReviewPacket() {
  return deepFreeze({
    gate: HRX_CP941_PACK_BINDING.claude_gate,
    pack_id: HRX_CP941_PACK_BINDING.pack_id,
    read_only: true,
    promotes_claude_to_final_approval: false,
    review_questions: [
      "Do EmployeeFixture tail rows remain descriptor-only without fixture runtime, employee record writes, real employee data, identity-link runtime, or permission bypass?",
      "Do CandidateFixture foundation rows remain descriptor-only without fixture runtime, candidate record writes, real candidate data, identity-link runtime, or permission bypass?",
      "Does CP941 keep credentials, secrets, enterprise trust, runtime receipts, and separate HRX product claims closed?",
    ],
  });
}

export function createHrxCp941CloseoutHandoff() {
  return deepFreeze({
    from_pack_id: HRX_CP941_PACK_BINDING.pack_id,
    to_pack_id: HRX_CP941_PACK_BINDING.next_pack_id,
    next_subphase_id: HRX_CP941_PACK_BINDING.next_subphase_id,
    handoff_contract: "Continue RP30 P05 CandidateFixture tail rows into LeaveFixture descriptors while keeping employee fixture runtime, candidate fixture runtime, identity-link runtime, record writes, real HR data, credentials, secrets, and separate-product claims closed.",
  });
}

export function createHrxCp941EmployeeCandidateFixtureTailBridgeDescriptor() {
  const caseSet = createHrxCp941EmployeeCandidateFixtureTailBridgeCaseSet();
  return deepFreeze({
    descriptor: "HrxCp941EmployeeCandidateFixtureTailBridgeDescriptor",
    source_descriptor: "HrxCp940SyntheticTenantEmployeeFixtureTailBridgeDescriptor",
    pack_id: HRX_CP941_PACK_BINDING.pack_id,
    planned_pack_id: HRX_CP941_PACK_BINDING.planned_pack_id,
    range: HRX_CP941_PACK_BINDING.range,
    program_contract: HRX_PROGRAM_CONTRACT,
    authority_boundary: {
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: HRX_CP941_PACK_BINDING.next_pack_id,
    },
    hrx_employee_candidate_fixture_tail_bridge_case_set: caseSet,
    domain_entities: {
      EmployeeFixture: deepFreeze({
        descriptor_only: true,
        employee_fixture_runtime_opened: false,
        employee_fixture_record_write_opened: false,
        employee_fixture_real_data_allowed: false,
        employee_fixture_permission_bypass_allowed: false,
        employee_fixture_identity_link_runtime_opened: false,
      }),
      CandidateFixture: deepFreeze({
        descriptor_only: true,
        candidate_fixture_runtime_opened: false,
        candidate_fixture_record_write_opened: false,
        candidate_fixture_real_data_allowed: false,
        candidate_fixture_permission_bypass_allowed: false,
        candidate_fixture_identity_link_runtime_opened: false,
      }),
    },
    baseline_decisions: {
      hrx_embedded_inside_law_firm_os: true,
      separate_hrx_product_created: false,
      employee_fixture_tail_descriptor_only: true,
      employee_fixture_runtime_deferred: true,
      employee_fixture_record_writes_deferred: true,
      employee_fixture_real_data_deferred: true,
      employee_fixture_permission_bypass_deferred: true,
      employee_fixture_identity_link_runtime_deferred: true,
      candidate_fixture_foundation_descriptor_only: true,
      candidate_fixture_runtime_deferred: true,
      candidate_fixture_record_writes_deferred: true,
      candidate_fixture_real_data_deferred: true,
      candidate_fixture_permission_bypass_deferred: true,
      candidate_fixture_identity_link_runtime_deferred: true,
      payroll_calculation_runtime_deferred: true,
      hr_ai_final_judgment_allowed: false,
      sensitive_hr_guard_required: true,
      real_employee_candidate_payroll_document_data_allowed: false,
    },
    requirement_refs: [
      "HRX-CORE-001",
      "HRX-CORE-002",
      "HRX-CORE-003",
      "HRX-GATE-001",
      "HRX-GATE-002",
      "HRX-GATE-003",
      "HRX-GATE-004",
      "HRX-GATE-005",
      "HRX-GATE-006",
    ],
    hermes_packet: createHrxCp941HermesEvidencePacket(),
    claude_packet: createHrxCp941ClaudeReviewPacket(),
    closeout_handoff: createHrxCp941CloseoutHandoff(),
    required_capabilities: HRX_CP941_REQUIREMENTS.required_capabilities,
    safety_gates: HRX_CP941_REQUIREMENTS.safety_gates,
    no_leak_guards: HRX_CP941_REQUIREMENTS.required_no_leak_guards,
    blocked_claims: HRX_BLOCKED_CLAIMS,
    ...HRX_NO_WRITE_ATTESTATION,
  });
}

export function createHrxCp942CandidateLeaveFixtureTailBridgeCaseSet() {
  const sections = {};
  for (const [microId, titles] of Object.entries(HRX_CP942_REQUIRED_SECTION_ROWS)) {
    sections[microId] = deepFreeze({
      micro_phase_id: microId,
      row_count: titles.length,
      rows: createHrxDomainRows(microId, titles),
    });
  }
  return deepFreeze({
    pack_id: HRX_CP942_PACK_BINDING.pack_id,
    section_count: Object.keys(sections).length,
    row_count: Object.values(sections).reduce((sum, section) => sum + section.row_count, 0),
    sections,
  });
}

export function createHrxCp942HermesEvidencePacket() {
  return deepFreeze({
    gate: HRX_CP942_PACK_BINDING.hermes_gate,
    pack_id: HRX_CP942_PACK_BINDING.pack_id,
    evidence_kind: "hrx_candidate_leave_fixture_tail_bridge",
    emits_runtime_receipt: false,
    deterministic_only: true,
    validation_commands: ["npm run rp30:hrx:validate", "npm run rp30:validate", "npm run hrx:requirements:validate", "npm run hrx:weighted:validate"],
    boundary_assertions: [
      "candidate_fixture_tail_descriptor",
      "candidate_fixture_runtime_deferred",
      "candidate_fixture_record_writes_deferred",
      "candidate_fixture_real_candidate_data_excluded",
      "candidate_fixture_identity_link_runtime_deferred",
      "leave_fixture_foundation_descriptor",
      "leave_fixture_runtime_deferred",
      "leave_fixture_record_writes_deferred",
      "leave_fixture_real_leave_data_excluded",
      "leave_fixture_request_runtime_deferred",
      "credentials_and_secrets_excluded",
    ],
  });
}

export function createHrxCp942ClaudeReviewPacket() {
  return deepFreeze({
    gate: HRX_CP942_PACK_BINDING.claude_gate,
    pack_id: HRX_CP942_PACK_BINDING.pack_id,
    read_only: true,
    promotes_claude_to_final_approval: false,
    review_questions: [
      "Do CandidateFixture tail rows remain descriptor-only without fixture runtime, candidate record writes, real candidate data, identity-link runtime, or permission bypass?",
      "Do LeaveFixture foundation rows remain descriptor-only without leave fixture runtime, leave record writes, real leave data, request runtime, or permission bypass?",
      "Does CP942 keep credentials, secrets, enterprise trust, runtime receipts, and separate HRX product claims closed?",
    ],
  });
}

export function createHrxCp942CloseoutHandoff() {
  return deepFreeze({
    from_pack_id: HRX_CP942_PACK_BINDING.pack_id,
    to_pack_id: HRX_CP942_PACK_BINDING.next_pack_id,
    next_subphase_id: HRX_CP942_PACK_BINDING.next_subphase_id,
    handoff_contract: "Continue RP30 P05 LeaveFixture tail rows into RiskFixture descriptors while keeping candidate fixture runtime, leave fixture runtime, request runtime, record writes, real HR data, credentials, secrets, and separate-product claims closed.",
  });
}

export function createHrxCp942CandidateLeaveFixtureTailBridgeDescriptor() {
  const caseSet = createHrxCp942CandidateLeaveFixtureTailBridgeCaseSet();
  return deepFreeze({
    descriptor: "HrxCp942CandidateLeaveFixtureTailBridgeDescriptor",
    source_descriptor: "HrxCp941EmployeeCandidateFixtureTailBridgeDescriptor",
    pack_id: HRX_CP942_PACK_BINDING.pack_id,
    planned_pack_id: HRX_CP942_PACK_BINDING.planned_pack_id,
    range: HRX_CP942_PACK_BINDING.range,
    program_contract: HRX_PROGRAM_CONTRACT,
    authority_boundary: {
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: HRX_CP942_PACK_BINDING.next_pack_id,
    },
    hrx_candidate_leave_fixture_tail_bridge_case_set: caseSet,
    domain_entities: {
      CandidateFixture: deepFreeze({
        descriptor_only: true,
        candidate_fixture_runtime_opened: false,
        candidate_fixture_record_write_opened: false,
        candidate_fixture_real_data_allowed: false,
        candidate_fixture_permission_bypass_allowed: false,
        candidate_fixture_identity_link_runtime_opened: false,
      }),
      LeaveFixture: deepFreeze({
        descriptor_only: true,
        leave_fixture_runtime_opened: false,
        leave_fixture_record_write_opened: false,
        leave_fixture_real_data_allowed: false,
        leave_fixture_permission_bypass_allowed: false,
        leave_fixture_request_runtime_opened: false,
      }),
    },
    baseline_decisions: {
      hrx_embedded_inside_law_firm_os: true,
      separate_hrx_product_created: false,
      candidate_fixture_tail_descriptor_only: true,
      candidate_fixture_runtime_deferred: true,
      candidate_fixture_record_writes_deferred: true,
      candidate_fixture_real_data_deferred: true,
      candidate_fixture_permission_bypass_deferred: true,
      candidate_fixture_identity_link_runtime_deferred: true,
      leave_fixture_foundation_descriptor_only: true,
      leave_fixture_runtime_deferred: true,
      leave_fixture_record_writes_deferred: true,
      leave_fixture_real_data_deferred: true,
      leave_fixture_permission_bypass_deferred: true,
      leave_fixture_request_runtime_deferred: true,
      payroll_calculation_runtime_deferred: true,
      hr_ai_final_judgment_allowed: false,
      sensitive_hr_guard_required: true,
      real_employee_candidate_payroll_document_data_allowed: false,
    },
    requirement_refs: [
      "HRX-CORE-001",
      "HRX-CORE-002",
      "HRX-CORE-003",
      "HRX-GATE-001",
      "HRX-GATE-002",
      "HRX-GATE-003",
      "HRX-GATE-004",
      "HRX-GATE-005",
      "HRX-GATE-006",
    ],
    hermes_packet: createHrxCp942HermesEvidencePacket(),
    claude_packet: createHrxCp942ClaudeReviewPacket(),
    closeout_handoff: createHrxCp942CloseoutHandoff(),
    required_capabilities: HRX_CP942_REQUIREMENTS.required_capabilities,
    safety_gates: HRX_CP942_REQUIREMENTS.safety_gates,
    no_leak_guards: HRX_CP942_REQUIREMENTS.required_no_leak_guards,
    blocked_claims: HRX_BLOCKED_CLAIMS,
    ...HRX_NO_WRITE_ATTESTATION,
  });
}

export function createHrxCp943LeaveRiskFixtureTailBridgeCaseSet() {
  const sections = {};
  for (const [microId, titles] of Object.entries(HRX_CP943_REQUIRED_SECTION_ROWS)) {
    sections[microId] = deepFreeze({
      micro_phase_id: microId,
      row_count: titles.length,
      rows: createHrxDomainRows(microId, titles),
    });
  }
  return deepFreeze({
    pack_id: HRX_CP943_PACK_BINDING.pack_id,
    section_count: Object.keys(sections).length,
    row_count: Object.values(sections).reduce((sum, section) => sum + section.row_count, 0),
    sections,
  });
}

export function createHrxCp943HermesEvidencePacket() {
  return deepFreeze({
    gate: HRX_CP943_PACK_BINDING.hermes_gate,
    pack_id: HRX_CP943_PACK_BINDING.pack_id,
    evidence_kind: "hrx_leave_risk_fixture_tail_bridge",
    emits_runtime_receipt: false,
    deterministic_only: true,
    validation_commands: ["npm run rp30:hrx:validate", "npm run rp30:validate", "npm run hrx:requirements:validate", "npm run hrx:weighted:validate"],
    boundary_assertions: [
      "leave_fixture_tail_descriptor",
      "leave_fixture_runtime_deferred",
      "leave_fixture_record_writes_deferred",
      "leave_fixture_real_leave_data_excluded",
      "leave_fixture_request_runtime_deferred",
      "risk_fixture_foundation_descriptor",
      "risk_fixture_runtime_deferred",
      "risk_fixture_record_writes_deferred",
      "risk_fixture_real_risk_data_excluded",
      "risk_fixture_score_calculation_deferred",
      "credentials_and_secrets_excluded",
    ],
  });
}

export function createHrxCp943ClaudeReviewPacket() {
  return deepFreeze({
    gate: HRX_CP943_PACK_BINDING.claude_gate,
    pack_id: HRX_CP943_PACK_BINDING.pack_id,
    read_only: true,
    promotes_claude_to_final_approval: false,
    review_questions: [
      "Does the LeaveFixture tail row remain descriptor-only without leave fixture runtime, leave record writes, real leave data, request runtime, or permission bypass?",
      "Do RiskFixture foundation rows remain descriptor-only without risk fixture runtime, risk record writes, real risk data, score calculation, or permission bypass?",
      "Does CP943 keep credentials, secrets, enterprise trust, runtime receipts, and separate HRX product claims closed?",
    ],
  });
}

export function createHrxCp943CloseoutHandoff() {
  return deepFreeze({
    from_pack_id: HRX_CP943_PACK_BINDING.pack_id,
    to_pack_id: HRX_CP943_PACK_BINDING.next_pack_id,
    next_subphase_id: HRX_CP943_PACK_BINDING.next_subphase_id,
    handoff_contract: "Continue RP30 P06 HRPermission descriptors while keeping leave fixture runtime, risk fixture runtime, score calculation, permission runtime, record writes, real HR data, credentials, secrets, and separate-product claims closed.",
  });
}

export function createHrxCp943LeaveRiskFixtureTailBridgeDescriptor() {
  const caseSet = createHrxCp943LeaveRiskFixtureTailBridgeCaseSet();
  return deepFreeze({
    descriptor: "HrxCp943LeaveRiskFixtureTailBridgeDescriptor",
    source_descriptor: "HrxCp942CandidateLeaveFixtureTailBridgeDescriptor",
    pack_id: HRX_CP943_PACK_BINDING.pack_id,
    planned_pack_id: HRX_CP943_PACK_BINDING.planned_pack_id,
    range: HRX_CP943_PACK_BINDING.range,
    program_contract: HRX_PROGRAM_CONTRACT,
    authority_boundary: {
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: HRX_CP943_PACK_BINDING.next_pack_id,
    },
    hrx_leave_risk_fixture_tail_bridge_case_set: caseSet,
    domain_entities: {
      LeaveFixture: deepFreeze({
        descriptor_only: true,
        leave_fixture_runtime_opened: false,
        leave_fixture_record_write_opened: false,
        leave_fixture_real_data_allowed: false,
        leave_fixture_permission_bypass_allowed: false,
        leave_fixture_request_runtime_opened: false,
      }),
      RiskFixture: deepFreeze({
        descriptor_only: true,
        risk_fixture_runtime_opened: false,
        risk_fixture_record_write_opened: false,
        risk_fixture_real_data_allowed: false,
        risk_fixture_permission_bypass_allowed: false,
        risk_fixture_score_calculated: false,
      }),
    },
    baseline_decisions: {
      hrx_embedded_inside_law_firm_os: true,
      separate_hrx_product_created: false,
      leave_fixture_tail_descriptor_only: true,
      leave_fixture_runtime_deferred: true,
      leave_fixture_record_writes_deferred: true,
      leave_fixture_real_data_deferred: true,
      leave_fixture_permission_bypass_deferred: true,
      leave_fixture_request_runtime_deferred: true,
      risk_fixture_foundation_descriptor_only: true,
      risk_fixture_runtime_deferred: true,
      risk_fixture_record_writes_deferred: true,
      risk_fixture_real_data_deferred: true,
      risk_fixture_permission_bypass_deferred: true,
      risk_fixture_score_calculation_deferred: true,
      payroll_calculation_runtime_deferred: true,
      hr_ai_final_judgment_allowed: false,
      sensitive_hr_guard_required: true,
      real_employee_candidate_payroll_document_data_allowed: false,
    },
    requirement_refs: [
      "HRX-CORE-001",
      "HRX-CORE-002",
      "HRX-CORE-003",
      "HRX-GATE-001",
      "HRX-GATE-002",
      "HRX-GATE-003",
      "HRX-GATE-004",
      "HRX-GATE-005",
      "HRX-GATE-006",
    ],
    hermes_packet: createHrxCp943HermesEvidencePacket(),
    claude_packet: createHrxCp943ClaudeReviewPacket(),
    closeout_handoff: createHrxCp943CloseoutHandoff(),
    required_capabilities: HRX_CP943_REQUIREMENTS.required_capabilities,
    safety_gates: HRX_CP943_REQUIREMENTS.safety_gates,
    no_leak_guards: HRX_CP943_REQUIREMENTS.required_no_leak_guards,
    blocked_claims: HRX_BLOCKED_CLAIMS,
    ...HRX_NO_WRITE_ATTESTATION,
  });
}

export function createHrxCp944HrPermissionFoundationCaseSet() {
  const sections = {};
  for (const [microId, titles] of Object.entries(HRX_CP944_REQUIRED_SECTION_ROWS)) {
    sections[microId] = deepFreeze({
      micro_phase_id: microId,
      row_count: titles.length,
      rows: createHrxDomainRows(microId, titles),
    });
  }
  return deepFreeze({
    pack_id: HRX_CP944_PACK_BINDING.pack_id,
    section_count: Object.keys(sections).length,
    row_count: Object.values(sections).reduce((sum, section) => sum + section.row_count, 0),
    sections,
  });
}

export function createHrxCp944HermesEvidencePacket() {
  return deepFreeze({
    gate: HRX_CP944_PACK_BINDING.hermes_gate,
    pack_id: HRX_CP944_PACK_BINDING.pack_id,
    evidence_kind: "hrx_hr_permission_foundation",
    emits_runtime_receipt: false,
    deterministic_only: true,
    validation_commands: ["npm run rp30:hrx:validate", "npm run rp30:validate", "npm run hrx:requirements:validate", "npm run hrx:weighted:validate"],
    boundary_assertions: [
      "hr_permission_foundation_descriptor",
      "hr_permission_runtime_deferred",
      "hr_permission_record_writes_deferred",
      "hr_permission_real_permission_data_excluded",
      "hr_permission_policy_runtime_deferred",
      "hr_permission_decision_emission_deferred",
      "hr_permission_bypass_deferred",
      "credentials_and_secrets_excluded",
    ],
  });
}

export function createHrxCp944ClaudeReviewPacket() {
  return deepFreeze({
    gate: HRX_CP944_PACK_BINDING.claude_gate,
    pack_id: HRX_CP944_PACK_BINDING.pack_id,
    read_only: true,
    promotes_claude_to_final_approval: false,
    review_questions: [
      "Do HRPermission foundation rows remain descriptor-only without permission runtime, policy execution, record writes, real permission data, decision emission, or permission bypass?",
      "Does CP944 keep HRX embedded inside Law Firm OS without opening separate HRX product or enterprise-trust claims?",
      "Does CP944 keep credentials, secrets, runtime receipts, permission/audit writes, and final human approval closed?",
    ],
  });
}

export function createHrxCp944CloseoutHandoff() {
  return deepFreeze({
    from_pack_id: HRX_CP944_PACK_BINDING.pack_id,
    to_pack_id: HRX_CP944_PACK_BINDING.next_pack_id,
    next_subphase_id: HRX_CP944_PACK_BINDING.next_subphase_id,
    handoff_contract: "Continue RP30 P06 HRPermission tail descriptors while keeping permission runtime, policy execution, decision emission, record writes, real HR permission data, credentials, secrets, and separate-product claims closed.",
  });
}

export function createHrxCp944HrPermissionFoundationDescriptor() {
  const caseSet = createHrxCp944HrPermissionFoundationCaseSet();
  return deepFreeze({
    descriptor: "HrxCp944HrPermissionFoundationDescriptor",
    source_descriptor: "HrxCp943LeaveRiskFixtureTailBridgeDescriptor",
    pack_id: HRX_CP944_PACK_BINDING.pack_id,
    planned_pack_id: HRX_CP944_PACK_BINDING.planned_pack_id,
    range: HRX_CP944_PACK_BINDING.range,
    program_contract: HRX_PROGRAM_CONTRACT,
    authority_boundary: {
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: HRX_CP944_PACK_BINDING.next_pack_id,
    },
    hrx_hr_permission_foundation_case_set: caseSet,
    domain_entities: {
      HRPermission: deepFreeze({
        descriptor_only: true,
        hr_permission_runtime_opened: false,
        hr_permission_record_write_opened: false,
        hr_permission_real_data_allowed: false,
        hr_permission_bypass_allowed: false,
        hr_permission_policy_runtime_opened: false,
        hr_permission_decision_emitted: false,
      }),
    },
    baseline_decisions: {
      hrx_embedded_inside_law_firm_os: true,
      separate_hrx_product_created: false,
      hr_permission_foundation_descriptor_only: true,
      hr_permission_runtime_deferred: true,
      hr_permission_record_writes_deferred: true,
      hr_permission_real_data_deferred: true,
      hr_permission_bypass_deferred: true,
      hr_permission_policy_runtime_deferred: true,
      hr_permission_decision_emission_deferred: true,
      payroll_calculation_runtime_deferred: true,
      hr_ai_final_judgment_allowed: false,
      sensitive_hr_guard_required: true,
      real_employee_candidate_payroll_document_data_allowed: false,
    },
    requirement_refs: [
      "HRX-CORE-001",
      "HRX-CORE-002",
      "HRX-CORE-003",
      "HRX-GATE-001",
      "HRX-GATE-002",
      "HRX-GATE-003",
      "HRX-GATE-004",
      "HRX-GATE-005",
      "HRX-GATE-006",
    ],
    hermes_packet: createHrxCp944HermesEvidencePacket(),
    claude_packet: createHrxCp944ClaudeReviewPacket(),
    closeout_handoff: createHrxCp944CloseoutHandoff(),
    required_capabilities: HRX_CP944_REQUIREMENTS.required_capabilities,
    safety_gates: HRX_CP944_REQUIREMENTS.safety_gates,
    no_leak_guards: HRX_CP944_REQUIREMENTS.required_no_leak_guards,
    blocked_claims: HRX_BLOCKED_CLAIMS,
    ...HRX_NO_WRITE_ATTESTATION,
  });
}

export function createHrxCp945HrPermissionSensitiveGuardBridgeCaseSet() {
  const sections = {};
  for (const [microId, titles] of Object.entries(HRX_CP945_REQUIRED_SECTION_ROWS)) {
    sections[microId] = deepFreeze({
      micro_phase_id: microId,
      row_count: titles.length,
      rows: createHrxDomainRows(microId, titles),
    });
  }
  return deepFreeze({
    pack_id: HRX_CP945_PACK_BINDING.pack_id,
    section_count: Object.keys(sections).length,
    row_count: Object.values(sections).reduce((sum, section) => sum + section.row_count, 0),
    sections,
  });
}

export function createHrxCp945HermesEvidencePacket() {
  return deepFreeze({
    gate: HRX_CP945_PACK_BINDING.hermes_gate,
    pack_id: HRX_CP945_PACK_BINDING.pack_id,
    evidence_kind: "hrx_hr_permission_sensitive_guard_bridge",
    emits_runtime_receipt: false,
    deterministic_only: true,
    validation_commands: ["npm run rp30:hrx:validate", "npm run rp30:validate", "npm run hrx:requirements:validate", "npm run hrx:weighted:validate"],
    boundary_assertions: [
      "hr_permission_tail_descriptor",
      "hr_permission_runtime_deferred",
      "hr_permission_record_writes_deferred",
      "hr_permission_decision_emission_deferred",
      "sensitive_guard_foundation_descriptor",
      "sensitive_guard_runtime_deferred",
      "sensitive_guard_record_writes_deferred",
      "sensitive_guard_real_sensitive_data_excluded",
      "sensitive_guard_bypass_deferred",
      "sensitive_guard_decision_emission_deferred",
      "credentials_and_secrets_excluded",
    ],
  });
}

export function createHrxCp945ClaudeReviewPacket() {
  return deepFreeze({
    gate: HRX_CP945_PACK_BINDING.claude_gate,
    pack_id: HRX_CP945_PACK_BINDING.pack_id,
    read_only: true,
    promotes_claude_to_final_approval: false,
    review_questions: [
      "Do HRPermission tail rows remain descriptor-only without permission runtime, policy execution, record writes, decision emission, or permission bypass?",
      "Do SensitiveGuard foundation rows remain descriptor-only without guard runtime, policy execution, record writes, real sensitive data, decision emission, or permission bypass?",
      "Does CP945 keep credentials, secrets, runtime receipts, enterprise trust, and separate HRX product claims closed?",
    ],
  });
}

export function createHrxCp945CloseoutHandoff() {
  return deepFreeze({
    from_pack_id: HRX_CP945_PACK_BINDING.pack_id,
    to_pack_id: HRX_CP945_PACK_BINDING.next_pack_id,
    next_subphase_id: HRX_CP945_PACK_BINDING.next_subphase_id,
    handoff_contract: "Continue RP30 P06 SensitiveGuard tail descriptors while keeping permission runtime, guard runtime, policy execution, decision emission, record writes, real sensitive HR data, credentials, secrets, and separate-product claims closed.",
  });
}

export function createHrxCp945HrPermissionSensitiveGuardBridgeDescriptor() {
  const caseSet = createHrxCp945HrPermissionSensitiveGuardBridgeCaseSet();
  return deepFreeze({
    descriptor: "HrxCp945HrPermissionSensitiveGuardBridgeDescriptor",
    source_descriptor: "HrxCp944HrPermissionFoundationDescriptor",
    pack_id: HRX_CP945_PACK_BINDING.pack_id,
    planned_pack_id: HRX_CP945_PACK_BINDING.planned_pack_id,
    range: HRX_CP945_PACK_BINDING.range,
    program_contract: HRX_PROGRAM_CONTRACT,
    authority_boundary: {
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: HRX_CP945_PACK_BINDING.next_pack_id,
    },
    hrx_hr_permission_sensitive_guard_bridge_case_set: caseSet,
    domain_entities: {
      HRPermission: deepFreeze({
        descriptor_only: true,
        hr_permission_runtime_opened: false,
        hr_permission_record_write_opened: false,
        hr_permission_real_data_allowed: false,
        hr_permission_bypass_allowed: false,
        hr_permission_policy_runtime_opened: false,
        hr_permission_decision_emitted: false,
      }),
      SensitiveGuard: deepFreeze({
        descriptor_only: true,
        sensitive_guard_runtime_opened: false,
        sensitive_guard_record_write_opened: false,
        sensitive_guard_real_data_allowed: false,
        sensitive_guard_bypass_allowed: false,
        sensitive_guard_policy_runtime_opened: false,
        sensitive_guard_decision_emitted: false,
      }),
    },
    baseline_decisions: {
      hrx_embedded_inside_law_firm_os: true,
      separate_hrx_product_created: false,
      hr_permission_tail_descriptor_only: true,
      hr_permission_runtime_deferred: true,
      hr_permission_record_writes_deferred: true,
      hr_permission_decision_emission_deferred: true,
      sensitive_guard_foundation_descriptor_only: true,
      sensitive_guard_runtime_deferred: true,
      sensitive_guard_record_writes_deferred: true,
      sensitive_guard_real_data_deferred: true,
      sensitive_guard_bypass_deferred: true,
      sensitive_guard_policy_runtime_deferred: true,
      sensitive_guard_decision_emission_deferred: true,
      payroll_calculation_runtime_deferred: true,
      hr_ai_final_judgment_allowed: false,
      sensitive_hr_guard_required: true,
      real_employee_candidate_payroll_document_data_allowed: false,
    },
    requirement_refs: [
      "HRX-CORE-001",
      "HRX-CORE-002",
      "HRX-CORE-003",
      "HRX-GATE-001",
      "HRX-GATE-002",
      "HRX-GATE-003",
      "HRX-GATE-004",
      "HRX-GATE-005",
      "HRX-GATE-006",
    ],
    hermes_packet: createHrxCp945HermesEvidencePacket(),
    claude_packet: createHrxCp945ClaudeReviewPacket(),
    closeout_handoff: createHrxCp945CloseoutHandoff(),
    required_capabilities: HRX_CP945_REQUIREMENTS.required_capabilities,
    safety_gates: HRX_CP945_REQUIREMENTS.safety_gates,
    no_leak_guards: HRX_CP945_REQUIREMENTS.required_no_leak_guards,
    blocked_claims: HRX_BLOCKED_CLAIMS,
    ...HRX_NO_WRITE_ATTESTATION,
  });
}

export function createHrxCp946SensitiveGuardPayrollRestrictionBridgeCaseSet() {
  const sections = {};
  for (const [microId, titles] of Object.entries(HRX_CP946_REQUIRED_SECTION_ROWS)) {
    sections[microId] = deepFreeze({
      micro_phase_id: microId,
      row_count: titles.length,
      rows: createHrxDomainRows(microId, titles),
    });
  }
  return deepFreeze({
    pack_id: HRX_CP946_PACK_BINDING.pack_id,
    section_count: Object.keys(sections).length,
    row_count: Object.values(sections).reduce((sum, section) => sum + section.row_count, 0),
    sections,
  });
}

export function createHrxCp946HermesEvidencePacket() {
  return deepFreeze({
    gate: HRX_CP946_PACK_BINDING.hermes_gate,
    pack_id: HRX_CP946_PACK_BINDING.pack_id,
    evidence_kind: "hrx_sensitive_guard_payroll_restriction_bridge",
    emits_runtime_receipt: false,
    deterministic_only: true,
    validation_commands: ["npm run rp30:hrx:validate", "npm run rp30:validate", "npm run hrx:requirements:validate", "npm run hrx:weighted:validate"],
    boundary_assertions: [
      "sensitive_guard_tail_descriptor",
      "sensitive_guard_runtime_deferred",
      "sensitive_guard_record_writes_deferred",
      "sensitive_guard_real_sensitive_data_excluded",
      "sensitive_guard_bypass_deferred",
      "sensitive_guard_decision_emission_deferred",
      "payroll_restriction_foundation_descriptor",
      "payroll_restriction_runtime_deferred",
      "payroll_restriction_record_writes_deferred",
      "payroll_restriction_real_payroll_data_excluded",
      "payroll_restriction_bypass_deferred",
      "payroll_restriction_decision_emission_deferred",
      "credentials_and_secrets_excluded",
    ],
  });
}

export function createHrxCp946ClaudeReviewPacket() {
  return deepFreeze({
    gate: HRX_CP946_PACK_BINDING.claude_gate,
    pack_id: HRX_CP946_PACK_BINDING.pack_id,
    read_only: true,
    promotes_claude_to_final_approval: false,
    review_questions: [
      "Do SensitiveGuard tail rows remain descriptor-only without guard runtime, policy execution, record writes, real sensitive data, decision emission, or permission bypass?",
      "Do PayrollRestriction foundation rows remain descriptor-only without payroll runtime, policy execution, record writes, real payroll data, decision emission, or permission bypass?",
      "Does CP946 keep credentials, secrets, runtime receipts, enterprise trust, and separate HRX product claims closed?",
    ],
  });
}

export function createHrxCp946CloseoutHandoff() {
  return deepFreeze({
    from_pack_id: HRX_CP946_PACK_BINDING.pack_id,
    to_pack_id: HRX_CP946_PACK_BINDING.next_pack_id,
    next_subphase_id: HRX_CP946_PACK_BINDING.next_subphase_id,
    handoff_contract: "Continue RP30 P06 PayrollRestriction tail descriptors while keeping guard runtime, payroll restriction runtime, policy execution, decision emission, record writes, real sensitive HR/payroll data, credentials, secrets, and separate-product claims closed.",
  });
}

export function createHrxCp946SensitiveGuardPayrollRestrictionBridgeDescriptor() {
  const caseSet = createHrxCp946SensitiveGuardPayrollRestrictionBridgeCaseSet();
  return deepFreeze({
    descriptor: "HrxCp946SensitiveGuardPayrollRestrictionBridgeDescriptor",
    source_descriptor: "HrxCp945HrPermissionSensitiveGuardBridgeDescriptor",
    pack_id: HRX_CP946_PACK_BINDING.pack_id,
    planned_pack_id: HRX_CP946_PACK_BINDING.planned_pack_id,
    range: HRX_CP946_PACK_BINDING.range,
    program_contract: HRX_PROGRAM_CONTRACT,
    authority_boundary: {
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: HRX_CP946_PACK_BINDING.next_pack_id,
    },
    hrx_sensitive_guard_payroll_restriction_bridge_case_set: caseSet,
    domain_entities: {
      SensitiveGuard: deepFreeze({
        descriptor_only: true,
        sensitive_guard_runtime_opened: false,
        sensitive_guard_record_write_opened: false,
        sensitive_guard_real_data_allowed: false,
        sensitive_guard_bypass_allowed: false,
        sensitive_guard_policy_runtime_opened: false,
        sensitive_guard_decision_emitted: false,
      }),
      PayrollRestriction: deepFreeze({
        descriptor_only: true,
        payroll_restriction_runtime_opened: false,
        payroll_restriction_record_write_opened: false,
        payroll_restriction_real_data_allowed: false,
        payroll_restriction_bypass_allowed: false,
        payroll_restriction_policy_runtime_opened: false,
        payroll_restriction_decision_emitted: false,
        payroll_restriction_calculation_runtime_opened: false,
      }),
    },
    baseline_decisions: {
      hrx_embedded_inside_law_firm_os: true,
      separate_hrx_product_created: false,
      sensitive_guard_tail_descriptor_only: true,
      sensitive_guard_runtime_deferred: true,
      sensitive_guard_record_writes_deferred: true,
      sensitive_guard_real_data_deferred: true,
      sensitive_guard_bypass_deferred: true,
      sensitive_guard_policy_runtime_deferred: true,
      sensitive_guard_decision_emission_deferred: true,
      payroll_restriction_foundation_descriptor_only: true,
      payroll_restriction_runtime_deferred: true,
      payroll_restriction_record_writes_deferred: true,
      payroll_restriction_real_payroll_data_deferred: true,
      payroll_restriction_bypass_deferred: true,
      payroll_restriction_policy_runtime_deferred: true,
      payroll_restriction_decision_emission_deferred: true,
      payroll_calculation_runtime_deferred: true,
      hr_ai_final_judgment_allowed: false,
      sensitive_hr_guard_required: true,
      real_employee_candidate_payroll_document_data_allowed: false,
    },
    requirement_refs: [
      "HRX-CORE-001",
      "HRX-CORE-002",
      "HRX-CORE-003",
      "HRX-GATE-001",
      "HRX-GATE-002",
      "HRX-GATE-003",
      "HRX-GATE-004",
      "HRX-GATE-005",
      "HRX-GATE-006",
    ],
    hermes_packet: createHrxCp946HermesEvidencePacket(),
    claude_packet: createHrxCp946ClaudeReviewPacket(),
    closeout_handoff: createHrxCp946CloseoutHandoff(),
    required_capabilities: HRX_CP946_REQUIREMENTS.required_capabilities,
    safety_gates: HRX_CP946_REQUIREMENTS.safety_gates,
    no_leak_guards: HRX_CP946_REQUIREMENTS.required_no_leak_guards,
    blocked_claims: HRX_BLOCKED_CLAIMS,
    ...HRX_NO_WRITE_ATTESTATION,
  });
}

export function createHrxCp947PayrollEvaluationRestrictionBridgeCaseSet() {
  const sections = {};
  for (const [microId, titles] of Object.entries(HRX_CP947_REQUIRED_SECTION_ROWS)) {
    sections[microId] = deepFreeze({
      micro_phase_id: microId,
      row_count: titles.length,
      rows: createHrxDomainRows(microId, titles),
    });
  }
  return deepFreeze({
    pack_id: HRX_CP947_PACK_BINDING.pack_id,
    section_count: Object.keys(sections).length,
    row_count: Object.values(sections).reduce((sum, section) => sum + section.row_count, 0),
    sections,
  });
}

export function createHrxCp947HermesEvidencePacket() {
  return deepFreeze({
    gate: HRX_CP947_PACK_BINDING.hermes_gate,
    pack_id: HRX_CP947_PACK_BINDING.pack_id,
    evidence_kind: "hrx_payroll_evaluation_restriction_bridge",
    emits_runtime_receipt: false,
    deterministic_only: true,
    validation_commands: ["npm run rp30:hrx:validate", "npm run rp30:validate", "npm run hrx:requirements:validate", "npm run hrx:weighted:validate"],
    boundary_assertions: [
      "payroll_restriction_tail_descriptor",
      "payroll_restriction_runtime_deferred",
      "payroll_restriction_record_writes_deferred",
      "payroll_restriction_real_payroll_data_excluded",
      "payroll_restriction_bypass_deferred",
      "payroll_restriction_decision_emission_deferred",
      "evaluation_restriction_foundation_descriptor",
      "evaluation_restriction_runtime_deferred",
      "evaluation_restriction_record_writes_deferred",
      "evaluation_restriction_real_evaluation_data_excluded",
      "evaluation_restriction_bypass_deferred",
      "evaluation_restriction_decision_emission_deferred",
      "credentials_and_secrets_excluded",
    ],
  });
}

export function createHrxCp947ClaudeReviewPacket() {
  return deepFreeze({
    gate: HRX_CP947_PACK_BINDING.claude_gate,
    pack_id: HRX_CP947_PACK_BINDING.pack_id,
    read_only: true,
    promotes_claude_to_final_approval: false,
    review_questions: [
      "Do PayrollRestriction tail rows remain descriptor-only without payroll runtime, policy execution, record writes, real payroll data, decision emission, or permission bypass?",
      "Do EvaluationRestriction foundation rows remain descriptor-only without evaluation runtime, policy execution, record writes, real evaluation data, decision emission, or permission bypass?",
      "Does CP947 keep credentials, secrets, runtime receipts, enterprise trust, and separate HRX product claims closed?",
    ],
  });
}

export function createHrxCp947CloseoutHandoff() {
  return deepFreeze({
    from_pack_id: HRX_CP947_PACK_BINDING.pack_id,
    to_pack_id: HRX_CP947_PACK_BINDING.next_pack_id,
    next_subphase_id: HRX_CP947_PACK_BINDING.next_subphase_id,
    handoff_contract: "Continue RP30 P06 EvaluationRestriction descriptors while keeping payroll restriction runtime, evaluation runtime, policy execution, decision emission, record writes, real sensitive HR/payroll/evaluation data, credentials, secrets, and separate-product claims closed.",
  });
}

export function createHrxCp947PayrollEvaluationRestrictionBridgeDescriptor() {
  const caseSet = createHrxCp947PayrollEvaluationRestrictionBridgeCaseSet();
  return deepFreeze({
    descriptor: "HrxCp947PayrollEvaluationRestrictionBridgeDescriptor",
    source_descriptor: "HrxCp946SensitiveGuardPayrollRestrictionBridgeDescriptor",
    pack_id: HRX_CP947_PACK_BINDING.pack_id,
    planned_pack_id: HRX_CP947_PACK_BINDING.planned_pack_id,
    range: HRX_CP947_PACK_BINDING.range,
    program_contract: HRX_PROGRAM_CONTRACT,
    authority_boundary: {
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: HRX_CP947_PACK_BINDING.next_pack_id,
    },
    hrx_payroll_evaluation_restriction_bridge_case_set: caseSet,
    domain_entities: {
      PayrollRestriction: deepFreeze({
        descriptor_only: true,
        payroll_restriction_runtime_opened: false,
        payroll_restriction_record_write_opened: false,
        payroll_restriction_real_data_allowed: false,
        payroll_restriction_bypass_allowed: false,
        payroll_restriction_policy_runtime_opened: false,
        payroll_restriction_decision_emitted: false,
        payroll_restriction_calculation_runtime_opened: false,
      }),
      EvaluationRestriction: deepFreeze({
        descriptor_only: true,
        evaluation_restriction_runtime_opened: false,
        evaluation_restriction_record_write_opened: false,
        evaluation_restriction_real_data_allowed: false,
        evaluation_restriction_bypass_allowed: false,
        evaluation_restriction_policy_runtime_opened: false,
        evaluation_restriction_decision_emitted: false,
        evaluation_restriction_score_runtime_opened: false,
      }),
    },
    baseline_decisions: {
      hrx_embedded_inside_law_firm_os: true,
      separate_hrx_product_created: false,
      payroll_restriction_tail_descriptor_only: true,
      payroll_restriction_runtime_deferred: true,
      payroll_restriction_record_writes_deferred: true,
      payroll_restriction_real_payroll_data_deferred: true,
      payroll_restriction_bypass_deferred: true,
      payroll_restriction_policy_runtime_deferred: true,
      payroll_restriction_decision_emission_deferred: true,
      evaluation_restriction_foundation_descriptor_only: true,
      evaluation_restriction_runtime_deferred: true,
      evaluation_restriction_record_writes_deferred: true,
      evaluation_restriction_real_evaluation_data_deferred: true,
      evaluation_restriction_bypass_deferred: true,
      evaluation_restriction_policy_runtime_deferred: true,
      evaluation_restriction_decision_emission_deferred: true,
      payroll_calculation_runtime_deferred: true,
      hr_ai_final_judgment_allowed: false,
      sensitive_hr_guard_required: true,
      real_employee_candidate_payroll_document_data_allowed: false,
    },
    requirement_refs: [
      "HRX-CORE-001",
      "HRX-CORE-002",
      "HRX-CORE-003",
      "HRX-GATE-001",
      "HRX-GATE-002",
      "HRX-GATE-003",
      "HRX-GATE-004",
      "HRX-GATE-005",
      "HRX-GATE-006",
    ],
    hermes_packet: createHrxCp947HermesEvidencePacket(),
    claude_packet: createHrxCp947ClaudeReviewPacket(),
    closeout_handoff: createHrxCp947CloseoutHandoff(),
    required_capabilities: HRX_CP947_REQUIREMENTS.required_capabilities,
    safety_gates: HRX_CP947_REQUIREMENTS.safety_gates,
    no_leak_guards: HRX_CP947_REQUIREMENTS.required_no_leak_guards,
    blocked_claims: HRX_BLOCKED_CLAIMS,
    ...HRX_NO_WRITE_ATTESTATION,
  });
}

export function createHrxCp948EvaluationRestrictionTailCaseSet() {
  const sections = {};
  for (const [microId, titles] of Object.entries(HRX_CP948_REQUIRED_SECTION_ROWS)) {
    sections[microId] = deepFreeze({
      micro_phase_id: microId,
      row_count: titles.length,
      rows: createHrxDomainRows(microId, titles),
    });
  }
  return deepFreeze({
    pack_id: HRX_CP948_PACK_BINDING.pack_id,
    section_count: Object.keys(sections).length,
    row_count: Object.values(sections).reduce((sum, section) => sum + section.row_count, 0),
    sections,
  });
}

export function createHrxCp948HermesEvidencePacket() {
  return deepFreeze({
    gate: HRX_CP948_PACK_BINDING.hermes_gate,
    pack_id: HRX_CP948_PACK_BINDING.pack_id,
    evidence_kind: "hrx_evaluation_restriction_tail",
    emits_runtime_receipt: false,
    deterministic_only: true,
    validation_commands: ["npm run rp30:hrx:validate", "npm run rp30:validate", "npm run hrx:requirements:validate", "npm run hrx:weighted:validate"],
    boundary_assertions: [
      "evaluation_restriction_tail_descriptor",
      "evaluation_restriction_runtime_deferred",
      "evaluation_restriction_record_writes_deferred",
      "evaluation_restriction_real_evaluation_data_excluded",
      "evaluation_restriction_bypass_deferred",
      "evaluation_restriction_policy_runtime_deferred",
      "evaluation_restriction_decision_emission_deferred",
      "evaluation_restriction_score_runtime_deferred",
      "credentials_and_secrets_excluded",
    ],
  });
}

export function createHrxCp948ClaudeReviewPacket() {
  return deepFreeze({
    gate: HRX_CP948_PACK_BINDING.claude_gate,
    pack_id: HRX_CP948_PACK_BINDING.pack_id,
    read_only: true,
    promotes_claude_to_final_approval: false,
    review_questions: [
      "Do EvaluationRestriction tail rows remain descriptor-only without evaluation runtime, policy execution, record writes, real evaluation data, decision emission, scoring runtime, or permission bypass?",
      "Does CP948 keep credentials, secrets, runtime receipts, enterprise trust, and separate HRX product claims closed?",
      "Does the handoff continue to CP949 without opening CandidatePrivacy runtime or real candidate data?",
    ],
  });
}

export function createHrxCp948CloseoutHandoff() {
  return deepFreeze({
    from_pack_id: HRX_CP948_PACK_BINDING.pack_id,
    to_pack_id: HRX_CP948_PACK_BINDING.next_pack_id,
    next_subphase_id: HRX_CP948_PACK_BINDING.next_subphase_id,
    handoff_contract: "Continue RP30 P06 EvaluationRestriction final tail and CandidatePrivacy descriptors while keeping evaluation runtime, candidate privacy runtime, policy execution, decision emission, score calculation, record writes, real sensitive HR/evaluation/candidate data, credentials, secrets, and separate-product claims closed.",
  });
}

export function createHrxCp948EvaluationRestrictionTailDescriptor() {
  const caseSet = createHrxCp948EvaluationRestrictionTailCaseSet();
  return deepFreeze({
    descriptor: "HrxCp948EvaluationRestrictionTailDescriptor",
    source_descriptor: "HrxCp947PayrollEvaluationRestrictionBridgeDescriptor",
    pack_id: HRX_CP948_PACK_BINDING.pack_id,
    planned_pack_id: HRX_CP948_PACK_BINDING.planned_pack_id,
    range: HRX_CP948_PACK_BINDING.range,
    program_contract: HRX_PROGRAM_CONTRACT,
    authority_boundary: {
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: HRX_CP948_PACK_BINDING.next_pack_id,
    },
    hrx_evaluation_restriction_tail_case_set: caseSet,
    domain_entities: {
      EvaluationRestriction: deepFreeze({
        descriptor_only: true,
        evaluation_restriction_runtime_opened: false,
        evaluation_restriction_record_write_opened: false,
        evaluation_restriction_real_data_allowed: false,
        evaluation_restriction_bypass_allowed: false,
        evaluation_restriction_policy_runtime_opened: false,
        evaluation_restriction_decision_emitted: false,
        evaluation_restriction_score_runtime_opened: false,
      }),
    },
    baseline_decisions: {
      hrx_embedded_inside_law_firm_os: true,
      separate_hrx_product_created: false,
      evaluation_restriction_tail_descriptor_only: true,
      evaluation_restriction_runtime_deferred: true,
      evaluation_restriction_record_writes_deferred: true,
      evaluation_restriction_real_evaluation_data_deferred: true,
      evaluation_restriction_bypass_deferred: true,
      evaluation_restriction_policy_runtime_deferred: true,
      evaluation_restriction_decision_emission_deferred: true,
      evaluation_restriction_score_runtime_deferred: true,
      hr_ai_final_judgment_allowed: false,
      sensitive_hr_guard_required: true,
      real_employee_candidate_payroll_document_data_allowed: false,
    },
    requirement_refs: [
      "HRX-CORE-001",
      "HRX-CORE-002",
      "HRX-CORE-003",
      "HRX-GATE-001",
      "HRX-GATE-002",
      "HRX-GATE-003",
      "HRX-GATE-004",
      "HRX-GATE-005",
      "HRX-GATE-006",
    ],
    hermes_packet: createHrxCp948HermesEvidencePacket(),
    claude_packet: createHrxCp948ClaudeReviewPacket(),
    closeout_handoff: createHrxCp948CloseoutHandoff(),
    required_capabilities: HRX_CP948_REQUIREMENTS.required_capabilities,
    safety_gates: HRX_CP948_REQUIREMENTS.safety_gates,
    no_leak_guards: HRX_CP948_REQUIREMENTS.required_no_leak_guards,
    blocked_claims: HRX_BLOCKED_CLAIMS,
    ...HRX_NO_WRITE_ATTESTATION,
  });
}

export function createHrxCp949EvaluationCandidatePrivacyBridgeCaseSet() {
  const sections = {};
  for (const [microId, titles] of Object.entries(HRX_CP949_REQUIRED_SECTION_ROWS)) {
    sections[microId] = deepFreeze({
      micro_phase_id: microId,
      row_count: titles.length,
      rows: createHrxDomainRows(microId, titles),
    });
  }
  return deepFreeze({
    pack_id: HRX_CP949_PACK_BINDING.pack_id,
    section_count: Object.keys(sections).length,
    row_count: Object.values(sections).reduce((sum, section) => sum + section.row_count, 0),
    sections,
  });
}

export function createHrxCp949HermesEvidencePacket() {
  return deepFreeze({
    gate: HRX_CP949_PACK_BINDING.hermes_gate,
    pack_id: HRX_CP949_PACK_BINDING.pack_id,
    evidence_kind: "hrx_evaluation_candidate_privacy_bridge",
    emits_runtime_receipt: false,
    deterministic_only: true,
    validation_commands: ["npm run rp30:hrx:validate", "npm run rp30:validate", "npm run hrx:requirements:validate", "npm run hrx:weighted:validate"],
    boundary_assertions: [
      "evaluation_restriction_final_tail_descriptor",
      "evaluation_restriction_runtime_deferred",
      "evaluation_restriction_record_writes_deferred",
      "evaluation_restriction_real_evaluation_data_excluded",
      "evaluation_restriction_bypass_deferred",
      "evaluation_restriction_decision_emission_deferred",
      "candidate_privacy_foundation_descriptor",
      "candidate_privacy_runtime_deferred",
      "candidate_privacy_record_writes_deferred",
      "candidate_privacy_real_candidate_data_excluded",
      "candidate_privacy_bypass_deferred",
      "candidate_privacy_decision_emission_deferred",
      "candidate_privacy_masking_runtime_deferred",
      "credentials_and_secrets_excluded",
    ],
  });
}

export function createHrxCp949ClaudeReviewPacket() {
  return deepFreeze({
    gate: HRX_CP949_PACK_BINDING.claude_gate,
    pack_id: HRX_CP949_PACK_BINDING.pack_id,
    read_only: true,
    promotes_claude_to_final_approval: false,
    review_questions: [
      "Do EvaluationRestriction final tail rows remain descriptor-only without evaluation runtime, policy execution, record writes, real evaluation data, decision emission, scoring runtime, or permission bypass?",
      "Do CandidatePrivacy foundation rows remain descriptor-only without privacy runtime, masking runtime, record writes, real candidate data, privacy decision emission, or permission bypass?",
      "Does CP949 keep credentials, secrets, runtime receipts, enterprise trust, and separate HRX product claims closed?",
    ],
  });
}

export function createHrxCp949CloseoutHandoff() {
  return deepFreeze({
    from_pack_id: HRX_CP949_PACK_BINDING.pack_id,
    to_pack_id: HRX_CP949_PACK_BINDING.next_pack_id,
    next_subphase_id: HRX_CP949_PACK_BINDING.next_subphase_id,
    handoff_contract: "Continue RP30 P06 CandidatePrivacy tail and AuditHint descriptors while keeping candidate privacy runtime, masking runtime, audit hint runtime, policy execution, decision emission, record writes, real sensitive HR/candidate data, credentials, secrets, and separate-product claims closed.",
  });
}

export function createHrxCp949EvaluationCandidatePrivacyBridgeDescriptor() {
  const caseSet = createHrxCp949EvaluationCandidatePrivacyBridgeCaseSet();
  return deepFreeze({
    descriptor: "HrxCp949EvaluationCandidatePrivacyBridgeDescriptor",
    source_descriptor: "HrxCp948EvaluationRestrictionTailDescriptor",
    pack_id: HRX_CP949_PACK_BINDING.pack_id,
    planned_pack_id: HRX_CP949_PACK_BINDING.planned_pack_id,
    range: HRX_CP949_PACK_BINDING.range,
    program_contract: HRX_PROGRAM_CONTRACT,
    authority_boundary: {
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: HRX_CP949_PACK_BINDING.next_pack_id,
    },
    hrx_evaluation_candidate_privacy_bridge_case_set: caseSet,
    domain_entities: {
      EvaluationRestriction: deepFreeze({
        descriptor_only: true,
        evaluation_restriction_runtime_opened: false,
        evaluation_restriction_record_write_opened: false,
        evaluation_restriction_real_data_allowed: false,
        evaluation_restriction_bypass_allowed: false,
        evaluation_restriction_policy_runtime_opened: false,
        evaluation_restriction_decision_emitted: false,
        evaluation_restriction_score_runtime_opened: false,
      }),
      CandidatePrivacy: deepFreeze({
        descriptor_only: true,
        candidate_privacy_runtime_opened: false,
        candidate_privacy_record_write_opened: false,
        candidate_privacy_real_data_allowed: false,
        candidate_privacy_bypass_allowed: false,
        candidate_privacy_policy_runtime_opened: false,
        candidate_privacy_decision_emitted: false,
        candidate_privacy_masking_runtime_opened: false,
      }),
    },
    baseline_decisions: {
      hrx_embedded_inside_law_firm_os: true,
      separate_hrx_product_created: false,
      evaluation_restriction_final_tail_descriptor_only: true,
      evaluation_restriction_runtime_deferred: true,
      evaluation_restriction_record_writes_deferred: true,
      evaluation_restriction_real_evaluation_data_deferred: true,
      evaluation_restriction_bypass_deferred: true,
      evaluation_restriction_policy_runtime_deferred: true,
      evaluation_restriction_decision_emission_deferred: true,
      evaluation_restriction_score_runtime_deferred: true,
      candidate_privacy_foundation_descriptor_only: true,
      candidate_privacy_runtime_deferred: true,
      candidate_privacy_record_writes_deferred: true,
      candidate_privacy_real_candidate_data_deferred: true,
      candidate_privacy_bypass_deferred: true,
      candidate_privacy_policy_runtime_deferred: true,
      candidate_privacy_decision_emission_deferred: true,
      candidate_privacy_masking_runtime_deferred: true,
      hr_ai_final_judgment_allowed: false,
      sensitive_hr_guard_required: true,
      real_employee_candidate_payroll_document_data_allowed: false,
    },
    requirement_refs: [
      "HRX-CORE-001",
      "HRX-CORE-002",
      "HRX-CORE-003",
      "HRX-GATE-001",
      "HRX-GATE-002",
      "HRX-GATE-003",
      "HRX-GATE-004",
      "HRX-GATE-005",
      "HRX-GATE-006",
    ],
    hermes_packet: createHrxCp949HermesEvidencePacket(),
    claude_packet: createHrxCp949ClaudeReviewPacket(),
    closeout_handoff: createHrxCp949CloseoutHandoff(),
    required_capabilities: HRX_CP949_REQUIREMENTS.required_capabilities,
    safety_gates: HRX_CP949_REQUIREMENTS.safety_gates,
    no_leak_guards: HRX_CP949_REQUIREMENTS.required_no_leak_guards,
    blocked_claims: HRX_BLOCKED_CLAIMS,
    ...HRX_NO_WRITE_ATTESTATION,
  });
}

export function createHrxCp950CandidatePrivacyAuditHintBridgeCaseSet() {
  const sections = {};
  for (const [microId, titles] of Object.entries(HRX_CP950_REQUIRED_SECTION_ROWS)) {
    sections[microId] = deepFreeze({
      micro_phase_id: microId,
      row_count: titles.length,
      rows: createHrxDomainRows(microId, titles),
    });
  }
  return deepFreeze({
    pack_id: HRX_CP950_PACK_BINDING.pack_id,
    section_count: Object.keys(sections).length,
    row_count: Object.values(sections).reduce((sum, section) => sum + section.row_count, 0),
    sections,
  });
}

export function createHrxCp950HermesEvidencePacket() {
  return deepFreeze({
    gate: HRX_CP950_PACK_BINDING.hermes_gate,
    pack_id: HRX_CP950_PACK_BINDING.pack_id,
    evidence_kind: "hrx_candidate_privacy_audit_hint_bridge",
    emits_runtime_receipt: false,
    deterministic_only: true,
    validation_commands: ["npm run rp30:hrx:validate", "npm run rp30:validate", "npm run hrx:requirements:validate", "npm run hrx:weighted:validate"],
    boundary_assertions: [
      "candidate_privacy_tail_descriptor",
      "candidate_privacy_runtime_deferred",
      "candidate_privacy_record_writes_deferred",
      "candidate_privacy_real_candidate_data_excluded",
      "candidate_privacy_bypass_deferred",
      "candidate_privacy_decision_emission_deferred",
      "candidate_privacy_masking_runtime_deferred",
      "audit_hint_foundation_descriptor",
      "audit_hint_runtime_deferred",
      "audit_hint_record_writes_deferred",
      "audit_hint_audit_event_writes_deferred",
      "audit_hint_real_hr_or_candidate_data_excluded",
      "audit_hint_bypass_deferred",
      "audit_hint_decision_emission_deferred",
      "audit_hint_runtime_receipts_deferred",
      "credentials_and_secrets_excluded",
    ],
  });
}

export function createHrxCp950ClaudeReviewPacket() {
  return deepFreeze({
    gate: HRX_CP950_PACK_BINDING.claude_gate,
    pack_id: HRX_CP950_PACK_BINDING.pack_id,
    read_only: true,
    promotes_claude_to_final_approval: false,
    review_questions: [
      "Do CandidatePrivacy tail rows remain descriptor-only without privacy runtime, masking runtime, record writes, real candidate data, privacy decision emission, or permission bypass?",
      "Do AuditHint foundation rows remain descriptor-only without audit hint runtime, audit event writes, record writes, real HR/candidate data, audit decision emission, runtime receipts, or permission bypass?",
      "Does CP950 keep credentials, secrets, runtime receipts, enterprise trust, and separate HRX product claims closed?",
    ],
  });
}

export function createHrxCp950CloseoutHandoff() {
  return deepFreeze({
    from_pack_id: HRX_CP950_PACK_BINDING.pack_id,
    to_pack_id: HRX_CP950_PACK_BINDING.next_pack_id,
    next_subphase_id: HRX_CP950_PACK_BINDING.next_subphase_id,
    handoff_contract: "Continue RP30 P06 AuditHint tail and HRPermission foundation descriptors while keeping audit hint runtime, HR permission runtime, policy execution, decision emission, record writes, audit writes, real sensitive HR/candidate data, credentials, secrets, and separate-product claims closed.",
  });
}

export function createHrxCp950CandidatePrivacyAuditHintBridgeDescriptor() {
  const caseSet = createHrxCp950CandidatePrivacyAuditHintBridgeCaseSet();
  return deepFreeze({
    descriptor: "HrxCp950CandidatePrivacyAuditHintBridgeDescriptor",
    source_descriptor: "HrxCp949EvaluationCandidatePrivacyBridgeDescriptor",
    pack_id: HRX_CP950_PACK_BINDING.pack_id,
    planned_pack_id: HRX_CP950_PACK_BINDING.planned_pack_id,
    range: HRX_CP950_PACK_BINDING.range,
    program_contract: HRX_PROGRAM_CONTRACT,
    authority_boundary: {
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: HRX_CP950_PACK_BINDING.next_pack_id,
    },
    hrx_candidate_privacy_audit_hint_bridge_case_set: caseSet,
    domain_entities: {
      CandidatePrivacy: deepFreeze({
        descriptor_only: true,
        candidate_privacy_runtime_opened: false,
        candidate_privacy_record_write_opened: false,
        candidate_privacy_real_data_allowed: false,
        candidate_privacy_bypass_allowed: false,
        candidate_privacy_policy_runtime_opened: false,
        candidate_privacy_decision_emitted: false,
        candidate_privacy_masking_runtime_opened: false,
      }),
      AuditHint: deepFreeze({
        descriptor_only: true,
        audit_hint_runtime_opened: false,
        audit_hint_record_write_opened: false,
        audit_hint_audit_event_write_opened: false,
        audit_hint_real_data_allowed: false,
        audit_hint_bypass_allowed: false,
        audit_hint_policy_runtime_opened: false,
        audit_hint_decision_emitted: false,
        audit_hint_runtime_receipt_emitted: false,
      }),
    },
    baseline_decisions: {
      hrx_embedded_inside_law_firm_os: true,
      separate_hrx_product_created: false,
      candidate_privacy_tail_descriptor_only: true,
      candidate_privacy_runtime_deferred: true,
      candidate_privacy_record_writes_deferred: true,
      candidate_privacy_real_candidate_data_deferred: true,
      candidate_privacy_bypass_deferred: true,
      candidate_privacy_policy_runtime_deferred: true,
      candidate_privacy_decision_emission_deferred: true,
      candidate_privacy_masking_runtime_deferred: true,
      audit_hint_foundation_descriptor_only: true,
      audit_hint_runtime_deferred: true,
      audit_hint_record_writes_deferred: true,
      audit_hint_audit_event_writes_deferred: true,
      audit_hint_real_hr_or_candidate_data_deferred: true,
      audit_hint_bypass_deferred: true,
      audit_hint_policy_runtime_deferred: true,
      audit_hint_decision_emission_deferred: true,
      audit_hint_runtime_receipts_deferred: true,
      hr_ai_final_judgment_allowed: false,
      sensitive_hr_guard_required: true,
      real_employee_candidate_payroll_document_data_allowed: false,
    },
    requirement_refs: [
      "HRX-CORE-001",
      "HRX-CORE-002",
      "HRX-CORE-003",
      "HRX-GATE-001",
      "HRX-GATE-002",
      "HRX-GATE-003",
      "HRX-GATE-004",
      "HRX-GATE-005",
      "HRX-GATE-006",
    ],
    hermes_packet: createHrxCp950HermesEvidencePacket(),
    claude_packet: createHrxCp950ClaudeReviewPacket(),
    closeout_handoff: createHrxCp950CloseoutHandoff(),
    required_capabilities: HRX_CP950_REQUIREMENTS.required_capabilities,
    safety_gates: HRX_CP950_REQUIREMENTS.safety_gates,
    no_leak_guards: HRX_CP950_REQUIREMENTS.required_no_leak_guards,
    blocked_claims: HRX_BLOCKED_CLAIMS,
    ...HRX_NO_WRITE_ATTESTATION,
  });
}

export function createHrxCp951AuditHintHrPermissionBridgeCaseSet() {
  const sections = {};
  for (const [microId, titles] of Object.entries(HRX_CP951_REQUIRED_SECTION_ROWS)) {
    sections[microId] = deepFreeze({
      micro_phase_id: microId,
      row_count: titles.length,
      rows: createHrxDomainRows(microId, titles),
    });
  }
  return deepFreeze({
    pack_id: HRX_CP951_PACK_BINDING.pack_id,
    section_count: Object.keys(sections).length,
    row_count: Object.values(sections).reduce((sum, section) => sum + section.row_count, 0),
    sections,
  });
}

export function createHrxCp951HermesEvidencePacket() {
  return deepFreeze({
    gate: HRX_CP951_PACK_BINDING.hermes_gate,
    pack_id: HRX_CP951_PACK_BINDING.pack_id,
    evidence_kind: "hrx_audit_hint_hr_permission_bridge",
    emits_runtime_receipt: false,
    deterministic_only: true,
    validation_commands: ["npm run rp30:hrx:validate", "npm run rp30:validate", "npm run hrx:requirements:validate", "npm run hrx:weighted:validate"],
    boundary_assertions: [
      "audit_hint_tail_descriptor",
      "audit_hint_runtime_deferred",
      "audit_hint_record_writes_deferred",
      "audit_hint_audit_event_writes_deferred",
      "audit_hint_real_hr_or_candidate_data_excluded",
      "audit_hint_bypass_deferred",
      "audit_hint_decision_emission_deferred",
      "audit_hint_runtime_receipts_deferred",
      "hr_permission_m06_foundation_descriptor",
      "hr_permission_runtime_deferred",
      "hr_permission_record_writes_deferred",
      "hr_permission_real_hr_data_excluded",
      "hr_permission_bypass_deferred",
      "hr_permission_decision_emission_deferred",
      "credentials_and_secrets_excluded",
    ],
  });
}

export function createHrxCp951ClaudeReviewPacket() {
  return deepFreeze({
    gate: HRX_CP951_PACK_BINDING.claude_gate,
    pack_id: HRX_CP951_PACK_BINDING.pack_id,
    read_only: true,
    promotes_claude_to_final_approval: false,
    review_questions: [
      "Do AuditHint tail rows remain descriptor-only without audit hint runtime, audit event writes, record writes, real HR/candidate data, audit decision emission, runtime receipts, or permission bypass?",
      "Do HRPermission M06 foundation rows remain descriptor-only without permission runtime, policy execution, decision emission, record writes, real HR data, or permission bypass?",
      "Does CP951 keep credentials, secrets, runtime receipts, enterprise trust, and separate HRX product claims closed?",
    ],
  });
}

export function createHrxCp951CloseoutHandoff() {
  return deepFreeze({
    from_pack_id: HRX_CP951_PACK_BINDING.pack_id,
    to_pack_id: HRX_CP951_PACK_BINDING.next_pack_id,
    next_subphase_id: HRX_CP951_PACK_BINDING.next_subphase_id,
    handoff_contract: "Continue RP30 P06 HRPermission tail and SensitiveGuard foundation descriptors while keeping HR permission runtime, sensitive guard runtime, policy execution, decision emission, record writes, audit writes, permission bypass, real sensitive HR data, credentials, secrets, and separate-product claims closed.",
  });
}

export function createHrxCp951AuditHintHrPermissionBridgeDescriptor() {
  const caseSet = createHrxCp951AuditHintHrPermissionBridgeCaseSet();
  return deepFreeze({
    descriptor: "HrxCp951AuditHintHrPermissionBridgeDescriptor",
    source_descriptor: "HrxCp950CandidatePrivacyAuditHintBridgeDescriptor",
    pack_id: HRX_CP951_PACK_BINDING.pack_id,
    planned_pack_id: HRX_CP951_PACK_BINDING.planned_pack_id,
    range: HRX_CP951_PACK_BINDING.range,
    program_contract: HRX_PROGRAM_CONTRACT,
    authority_boundary: {
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: HRX_CP951_PACK_BINDING.next_pack_id,
    },
    hrx_audit_hint_hr_permission_bridge_case_set: caseSet,
    domain_entities: {
      AuditHint: deepFreeze({
        descriptor_only: true,
        audit_hint_runtime_opened: false,
        audit_hint_record_write_opened: false,
        audit_hint_audit_event_write_opened: false,
        audit_hint_real_data_allowed: false,
        audit_hint_bypass_allowed: false,
        audit_hint_policy_runtime_opened: false,
        audit_hint_decision_emitted: false,
        audit_hint_runtime_receipt_emitted: false,
      }),
      HRPermission: deepFreeze({
        descriptor_only: true,
        hr_permission_runtime_opened: false,
        hr_permission_record_write_opened: false,
        hr_permission_real_data_allowed: false,
        hr_permission_bypass_allowed: false,
        hr_permission_policy_runtime_opened: false,
        hr_permission_decision_emitted: false,
      }),
    },
    baseline_decisions: {
      hrx_embedded_inside_law_firm_os: true,
      separate_hrx_product_created: false,
      audit_hint_tail_descriptor_only: true,
      audit_hint_runtime_deferred: true,
      audit_hint_record_writes_deferred: true,
      audit_hint_audit_event_writes_deferred: true,
      audit_hint_real_hr_or_candidate_data_deferred: true,
      audit_hint_bypass_deferred: true,
      audit_hint_policy_runtime_deferred: true,
      audit_hint_decision_emission_deferred: true,
      audit_hint_runtime_receipts_deferred: true,
      hr_permission_m06_foundation_descriptor_only: true,
      hr_permission_runtime_deferred: true,
      hr_permission_record_writes_deferred: true,
      hr_permission_real_hr_data_deferred: true,
      hr_permission_bypass_deferred: true,
      hr_permission_policy_runtime_deferred: true,
      hr_permission_decision_emission_deferred: true,
      hr_ai_final_judgment_allowed: false,
      sensitive_hr_guard_required: true,
      real_employee_candidate_payroll_document_data_allowed: false,
    },
    requirement_refs: [
      "HRX-CORE-001",
      "HRX-CORE-002",
      "HRX-CORE-003",
      "HRX-GATE-001",
      "HRX-GATE-002",
      "HRX-GATE-003",
      "HRX-GATE-004",
      "HRX-GATE-005",
      "HRX-GATE-006",
    ],
    hermes_packet: createHrxCp951HermesEvidencePacket(),
    claude_packet: createHrxCp951ClaudeReviewPacket(),
    closeout_handoff: createHrxCp951CloseoutHandoff(),
    required_capabilities: HRX_CP951_REQUIREMENTS.required_capabilities,
    safety_gates: HRX_CP951_REQUIREMENTS.safety_gates,
    no_leak_guards: HRX_CP951_REQUIREMENTS.required_no_leak_guards,
    blocked_claims: HRX_BLOCKED_CLAIMS,
    ...HRX_NO_WRITE_ATTESTATION,
  });
}

export function createHrxCp952HrPermissionSensitiveGuardBridgeCaseSet() {
  const sections = {};
  for (const [microId, titles] of Object.entries(HRX_CP952_REQUIRED_SECTION_ROWS)) {
    sections[microId] = deepFreeze({
      micro_phase_id: microId,
      row_count: titles.length,
      rows: createHrxDomainRows(microId, titles),
    });
  }
  return deepFreeze({
    pack_id: HRX_CP952_PACK_BINDING.pack_id,
    section_count: Object.keys(sections).length,
    row_count: Object.values(sections).reduce((sum, section) => sum + section.row_count, 0),
    sections,
  });
}

export function createHrxCp952HermesEvidencePacket() {
  return deepFreeze({
    gate: HRX_CP952_PACK_BINDING.hermes_gate,
    pack_id: HRX_CP952_PACK_BINDING.pack_id,
    evidence_kind: "hrx_hr_permission_sensitive_guard_m06_m07_bridge",
    emits_runtime_receipt: false,
    deterministic_only: true,
    validation_commands: ["npm run rp30:hrx:validate", "npm run rp30:validate", "npm run hrx:requirements:validate", "npm run hrx:weighted:validate"],
    boundary_assertions: [
      "hr_permission_m06_tail_descriptor",
      "hr_permission_runtime_deferred",
      "hr_permission_record_writes_deferred",
      "hr_permission_real_permission_data_excluded",
      "hr_permission_bypass_deferred",
      "hr_permission_decision_emission_deferred",
      "sensitive_guard_m07_foundation_descriptor",
      "sensitive_guard_runtime_deferred",
      "sensitive_guard_record_writes_deferred",
      "sensitive_guard_real_sensitive_data_excluded",
      "sensitive_guard_bypass_deferred",
      "sensitive_guard_decision_emission_deferred",
      "credentials_and_secrets_excluded",
    ],
  });
}

export function createHrxCp952ClaudeReviewPacket() {
  return deepFreeze({
    gate: HRX_CP952_PACK_BINDING.claude_gate,
    pack_id: HRX_CP952_PACK_BINDING.pack_id,
    read_only: true,
    promotes_claude_to_final_approval: false,
    review_questions: [
      "Do HRPermission M06 tail rows remain descriptor-only without permission runtime, policy execution, record writes, real permission data, decision emission, or permission bypass?",
      "Does SensitiveGuard M07 foundation remain descriptor-only without guard runtime, policy execution, record writes, real sensitive data, decision emission, or permission bypass?",
      "Does CP952 keep credentials, secrets, runtime receipts, enterprise trust, and separate HRX product claims closed?",
    ],
  });
}

export function createHrxCp952CloseoutHandoff() {
  return deepFreeze({
    from_pack_id: HRX_CP952_PACK_BINDING.pack_id,
    to_pack_id: HRX_CP952_PACK_BINDING.next_pack_id,
    next_subphase_id: HRX_CP952_PACK_BINDING.next_subphase_id,
    handoff_contract: "Continue RP30 P06 SensitiveGuard M07 tail descriptors while keeping permission runtime, guard runtime, policy execution, decision emission, record writes, real sensitive HR data, credentials, secrets, and separate-product claims closed.",
  });
}

export function createHrxCp952HrPermissionSensitiveGuardBridgeDescriptor() {
  const caseSet = createHrxCp952HrPermissionSensitiveGuardBridgeCaseSet();
  return deepFreeze({
    descriptor: "HrxCp952HrPermissionSensitiveGuardBridgeDescriptor",
    source_descriptor: "HrxCp951AuditHintHrPermissionBridgeDescriptor",
    pack_id: HRX_CP952_PACK_BINDING.pack_id,
    planned_pack_id: HRX_CP952_PACK_BINDING.planned_pack_id,
    range: HRX_CP952_PACK_BINDING.range,
    program_contract: HRX_PROGRAM_CONTRACT,
    authority_boundary: {
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: HRX_CP952_PACK_BINDING.next_pack_id,
    },
    hrx_hr_permission_sensitive_guard_m06_m07_bridge_case_set: caseSet,
    domain_entities: {
      HRPermission: deepFreeze({
        descriptor_only: true,
        hr_permission_runtime_opened: false,
        hr_permission_record_write_opened: false,
        hr_permission_real_data_allowed: false,
        hr_permission_bypass_allowed: false,
        hr_permission_policy_runtime_opened: false,
        hr_permission_decision_emitted: false,
      }),
      SensitiveGuard: deepFreeze({
        descriptor_only: true,
        sensitive_guard_runtime_opened: false,
        sensitive_guard_record_write_opened: false,
        sensitive_guard_real_data_allowed: false,
        sensitive_guard_bypass_allowed: false,
        sensitive_guard_policy_runtime_opened: false,
        sensitive_guard_decision_emitted: false,
      }),
    },
    baseline_decisions: {
      hrx_embedded_inside_law_firm_os: true,
      separate_hrx_product_created: false,
      hr_permission_m06_tail_descriptor_only: true,
      hr_permission_runtime_deferred: true,
      hr_permission_record_writes_deferred: true,
      hr_permission_real_permission_data_deferred: true,
      hr_permission_bypass_deferred: true,
      hr_permission_policy_runtime_deferred: true,
      hr_permission_decision_emission_deferred: true,
      sensitive_guard_m07_foundation_descriptor_only: true,
      sensitive_guard_runtime_deferred: true,
      sensitive_guard_record_writes_deferred: true,
      sensitive_guard_real_data_deferred: true,
      sensitive_guard_bypass_deferred: true,
      sensitive_guard_policy_runtime_deferred: true,
      sensitive_guard_decision_emission_deferred: true,
      payroll_calculation_runtime_deferred: true,
      hr_ai_final_judgment_allowed: false,
      sensitive_hr_guard_required: true,
      real_employee_candidate_payroll_document_data_allowed: false,
    },
    requirement_refs: [
      "HRX-CORE-001",
      "HRX-CORE-002",
      "HRX-CORE-003",
      "HRX-GATE-001",
      "HRX-GATE-002",
      "HRX-GATE-003",
      "HRX-GATE-004",
      "HRX-GATE-005",
      "HRX-GATE-006",
    ],
    hermes_packet: createHrxCp952HermesEvidencePacket(),
    claude_packet: createHrxCp952ClaudeReviewPacket(),
    closeout_handoff: createHrxCp952CloseoutHandoff(),
    required_capabilities: HRX_CP952_REQUIREMENTS.required_capabilities,
    safety_gates: HRX_CP952_REQUIREMENTS.safety_gates,
    no_leak_guards: HRX_CP952_REQUIREMENTS.required_no_leak_guards,
    blocked_claims: HRX_BLOCKED_CLAIMS,
    ...HRX_NO_WRITE_ATTESTATION,
  });
}

export function createHrxCp953SensitiveGuardTailCaseSet() {
  const sections = {};
  for (const [microId, titles] of Object.entries(HRX_CP953_REQUIRED_SECTION_ROWS)) {
    sections[microId] = deepFreeze({
      micro_phase_id: microId,
      row_count: titles.length,
      rows: createHrxDomainRows(microId, titles),
    });
  }
  return deepFreeze({
    pack_id: HRX_CP953_PACK_BINDING.pack_id,
    section_count: Object.keys(sections).length,
    row_count: Object.values(sections).reduce((sum, section) => sum + section.row_count, 0),
    sections,
  });
}

export function createHrxCp953HermesEvidencePacket() {
  return deepFreeze({
    gate: HRX_CP953_PACK_BINDING.hermes_gate,
    pack_id: HRX_CP953_PACK_BINDING.pack_id,
    evidence_kind: "hrx_sensitive_guard_m07_tail",
    emits_runtime_receipt: false,
    deterministic_only: true,
    validation_commands: ["npm run rp30:hrx:validate", "npm run rp30:validate", "npm run hrx:requirements:validate", "npm run hrx:weighted:validate"],
    boundary_assertions: [
      "sensitive_guard_m07_tail_descriptor",
      "sensitive_guard_runtime_deferred",
      "sensitive_guard_record_writes_deferred",
      "sensitive_guard_real_sensitive_data_excluded",
      "sensitive_guard_bypass_deferred",
      "sensitive_guard_policy_runtime_deferred",
      "sensitive_guard_decision_emission_deferred",
      "credentials_and_secrets_excluded",
    ],
  });
}

export function createHrxCp953ClaudeReviewPacket() {
  return deepFreeze({
    gate: HRX_CP953_PACK_BINDING.claude_gate,
    pack_id: HRX_CP953_PACK_BINDING.pack_id,
    read_only: true,
    promotes_claude_to_final_approval: false,
    review_questions: [
      "Do SensitiveGuard M07 tail rows remain descriptor-only without guard runtime, policy execution, record writes, real sensitive data, decision emission, or permission bypass?",
      "Does CP953 keep credentials, secrets, runtime receipts, enterprise trust, and separate HRX product claims closed?",
      "Does the handoff continue to CP954 without opening PayrollRestriction runtime or real payroll data?",
    ],
  });
}

export function createHrxCp953CloseoutHandoff() {
  return deepFreeze({
    from_pack_id: HRX_CP953_PACK_BINDING.pack_id,
    to_pack_id: HRX_CP953_PACK_BINDING.next_pack_id,
    next_subphase_id: HRX_CP953_PACK_BINDING.next_subphase_id,
    handoff_contract: "Continue RP30 P06 SensitiveGuard final tail and PayrollRestriction foundation descriptors while keeping guard runtime, payroll restriction runtime, policy execution, decision emission, record writes, real sensitive HR/payroll data, credentials, secrets, and separate-product claims closed.",
  });
}

export function createHrxCp953SensitiveGuardTailDescriptor() {
  const caseSet = createHrxCp953SensitiveGuardTailCaseSet();
  return deepFreeze({
    descriptor: "HrxCp953SensitiveGuardTailDescriptor",
    source_descriptor: "HrxCp952HrPermissionSensitiveGuardBridgeDescriptor",
    pack_id: HRX_CP953_PACK_BINDING.pack_id,
    planned_pack_id: HRX_CP953_PACK_BINDING.planned_pack_id,
    range: HRX_CP953_PACK_BINDING.range,
    program_contract: HRX_PROGRAM_CONTRACT,
    authority_boundary: {
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: HRX_CP953_PACK_BINDING.next_pack_id,
    },
    hrx_sensitive_guard_m07_tail_case_set: caseSet,
    domain_entities: {
      SensitiveGuard: deepFreeze({
        descriptor_only: true,
        sensitive_guard_runtime_opened: false,
        sensitive_guard_record_write_opened: false,
        sensitive_guard_real_data_allowed: false,
        sensitive_guard_bypass_allowed: false,
        sensitive_guard_policy_runtime_opened: false,
        sensitive_guard_decision_emitted: false,
      }),
    },
    baseline_decisions: {
      hrx_embedded_inside_law_firm_os: true,
      separate_hrx_product_created: false,
      sensitive_guard_m07_tail_descriptor_only: true,
      sensitive_guard_runtime_deferred: true,
      sensitive_guard_record_writes_deferred: true,
      sensitive_guard_real_data_deferred: true,
      sensitive_guard_bypass_deferred: true,
      sensitive_guard_policy_runtime_deferred: true,
      sensitive_guard_decision_emission_deferred: true,
      payroll_calculation_runtime_deferred: true,
      hr_ai_final_judgment_allowed: false,
      sensitive_hr_guard_required: true,
      real_employee_candidate_payroll_document_data_allowed: false,
    },
    requirement_refs: [
      "HRX-CORE-001",
      "HRX-CORE-002",
      "HRX-CORE-003",
      "HRX-GATE-001",
      "HRX-GATE-002",
      "HRX-GATE-003",
      "HRX-GATE-004",
      "HRX-GATE-005",
      "HRX-GATE-006",
    ],
    hermes_packet: createHrxCp953HermesEvidencePacket(),
    claude_packet: createHrxCp953ClaudeReviewPacket(),
    closeout_handoff: createHrxCp953CloseoutHandoff(),
    required_capabilities: HRX_CP953_REQUIREMENTS.required_capabilities,
    safety_gates: HRX_CP953_REQUIREMENTS.safety_gates,
    no_leak_guards: HRX_CP953_REQUIREMENTS.required_no_leak_guards,
    blocked_claims: HRX_BLOCKED_CLAIMS,
    ...HRX_NO_WRITE_ATTESTATION,
  });
}

export function createHrxCp954SensitiveGuardPayrollRestrictionBridgeCaseSet() {
  const sections = {};
  for (const [microId, titles] of Object.entries(HRX_CP954_REQUIRED_SECTION_ROWS)) {
    sections[microId] = deepFreeze({
      micro_phase_id: microId,
      row_count: titles.length,
      rows: createHrxDomainRows(microId, titles),
    });
  }
  return deepFreeze({
    pack_id: HRX_CP954_PACK_BINDING.pack_id,
    section_count: Object.keys(sections).length,
    row_count: Object.values(sections).reduce((sum, section) => sum + section.row_count, 0),
    sections,
  });
}

export function createHrxCp954HermesEvidencePacket() {
  return deepFreeze({
    gate: HRX_CP954_PACK_BINDING.hermes_gate,
    pack_id: HRX_CP954_PACK_BINDING.pack_id,
    evidence_kind: "hrx_sensitive_guard_payroll_restriction_m07_m08_bridge",
    emits_runtime_receipt: false,
    deterministic_only: true,
    validation_commands: ["npm run rp30:hrx:validate", "npm run rp30:validate", "npm run hrx:requirements:validate", "npm run hrx:weighted:validate"],
    boundary_assertions: [
      "sensitive_guard_m07_final_tail_descriptor",
      "sensitive_guard_runtime_deferred",
      "sensitive_guard_record_writes_deferred",
      "sensitive_guard_real_sensitive_data_excluded",
      "sensitive_guard_bypass_deferred",
      "sensitive_guard_decision_emission_deferred",
      "payroll_restriction_m08_foundation_descriptor",
      "payroll_restriction_runtime_deferred",
      "payroll_restriction_record_writes_deferred",
      "payroll_restriction_real_payroll_data_excluded",
      "payroll_restriction_bypass_deferred",
      "payroll_restriction_policy_runtime_deferred",
      "payroll_restriction_calculation_runtime_deferred",
      "payroll_restriction_decision_emission_deferred",
      "credentials_and_secrets_excluded",
    ],
  });
}

export function createHrxCp954ClaudeReviewPacket() {
  return deepFreeze({
    gate: HRX_CP954_PACK_BINDING.claude_gate,
    pack_id: HRX_CP954_PACK_BINDING.pack_id,
    read_only: true,
    promotes_claude_to_final_approval: false,
    review_questions: [
      "Do SensitiveGuard M07 final tail rows remain descriptor-only without guard runtime, policy execution, record writes, real sensitive data, decision emission, or permission bypass?",
      "Do PayrollRestriction M08 foundation rows remain descriptor-only without restriction runtime, calculation runtime, policy execution, record writes, real payroll data, decision emission, or permission bypass?",
      "Does CP954 keep credentials, secrets, runtime receipts, enterprise trust, and separate HRX product claims closed?",
    ],
  });
}

export function createHrxCp954CloseoutHandoff() {
  return deepFreeze({
    from_pack_id: HRX_CP954_PACK_BINDING.pack_id,
    to_pack_id: HRX_CP954_PACK_BINDING.next_pack_id,
    next_subphase_id: HRX_CP954_PACK_BINDING.next_subphase_id,
    handoff_contract: "Continue RP30 P06 PayrollRestriction M08 tail descriptors while keeping payroll restriction runtime, calculation runtime, policy execution, decision emission, record writes, real payroll data, credentials, secrets, and separate-product claims closed.",
  });
}

export function createHrxCp954SensitiveGuardPayrollRestrictionBridgeDescriptor() {
  const caseSet = createHrxCp954SensitiveGuardPayrollRestrictionBridgeCaseSet();
  return deepFreeze({
    descriptor: "HrxCp954SensitiveGuardPayrollRestrictionBridgeDescriptor",
    source_descriptor: "HrxCp953SensitiveGuardTailDescriptor",
    pack_id: HRX_CP954_PACK_BINDING.pack_id,
    planned_pack_id: HRX_CP954_PACK_BINDING.planned_pack_id,
    range: HRX_CP954_PACK_BINDING.range,
    program_contract: HRX_PROGRAM_CONTRACT,
    authority_boundary: {
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: HRX_CP954_PACK_BINDING.next_pack_id,
    },
    hrx_sensitive_guard_payroll_restriction_m07_m08_bridge_case_set: caseSet,
    domain_entities: {
      SensitiveGuard: deepFreeze({
        descriptor_only: true,
        sensitive_guard_runtime_opened: false,
        sensitive_guard_record_write_opened: false,
        sensitive_guard_real_data_allowed: false,
        sensitive_guard_bypass_allowed: false,
        sensitive_guard_policy_runtime_opened: false,
        sensitive_guard_decision_emitted: false,
      }),
      PayrollRestriction: deepFreeze({
        descriptor_only: true,
        payroll_restriction_runtime_opened: false,
        payroll_restriction_record_write_opened: false,
        payroll_restriction_real_data_allowed: false,
        payroll_restriction_bypass_allowed: false,
        payroll_restriction_policy_runtime_opened: false,
        payroll_restriction_decision_emitted: false,
        payroll_restriction_calculation_runtime_opened: false,
      }),
    },
    baseline_decisions: {
      hrx_embedded_inside_law_firm_os: true,
      separate_hrx_product_created: false,
      sensitive_guard_m07_final_tail_descriptor_only: true,
      sensitive_guard_runtime_deferred: true,
      sensitive_guard_record_writes_deferred: true,
      sensitive_guard_real_data_deferred: true,
      sensitive_guard_bypass_deferred: true,
      sensitive_guard_policy_runtime_deferred: true,
      sensitive_guard_decision_emission_deferred: true,
      payroll_restriction_m08_foundation_descriptor_only: true,
      payroll_restriction_runtime_deferred: true,
      payroll_restriction_record_writes_deferred: true,
      payroll_restriction_real_payroll_data_deferred: true,
      payroll_restriction_bypass_deferred: true,
      payroll_restriction_policy_runtime_deferred: true,
      payroll_restriction_decision_emission_deferred: true,
      payroll_restriction_calculation_runtime_deferred: true,
      payroll_calculation_runtime_deferred: true,
      hr_ai_final_judgment_allowed: false,
      sensitive_hr_guard_required: true,
      real_employee_candidate_payroll_document_data_allowed: false,
    },
    requirement_refs: [
      "HRX-CORE-001",
      "HRX-CORE-002",
      "HRX-CORE-003",
      "HRX-GATE-001",
      "HRX-GATE-002",
      "HRX-GATE-003",
      "HRX-GATE-004",
      "HRX-GATE-005",
      "HRX-GATE-006",
    ],
    hermes_packet: createHrxCp954HermesEvidencePacket(),
    claude_packet: createHrxCp954ClaudeReviewPacket(),
    closeout_handoff: createHrxCp954CloseoutHandoff(),
    required_capabilities: HRX_CP954_REQUIREMENTS.required_capabilities,
    safety_gates: HRX_CP954_REQUIREMENTS.safety_gates,
    no_leak_guards: HRX_CP954_REQUIREMENTS.required_no_leak_guards,
    blocked_claims: HRX_BLOCKED_CLAIMS,
    ...HRX_NO_WRITE_ATTESTATION,
  });
}

export function createHrxCp955PayrollEvaluationRestrictionBridgeCaseSet() {
  const sections = {};
  for (const [microId, titles] of Object.entries(HRX_CP955_REQUIRED_SECTION_ROWS)) {
    sections[microId] = deepFreeze({
      micro_phase_id: microId,
      row_count: titles.length,
      rows: createHrxDomainRows(microId, titles),
    });
  }
  return deepFreeze({
    pack_id: HRX_CP955_PACK_BINDING.pack_id,
    section_count: Object.keys(sections).length,
    row_count: Object.values(sections).reduce((sum, section) => sum + section.row_count, 0),
    sections,
  });
}

export function createHrxCp955HermesEvidencePacket() {
  return deepFreeze({
    gate: HRX_CP955_PACK_BINDING.hermes_gate,
    pack_id: HRX_CP955_PACK_BINDING.pack_id,
    evidence_kind: "hrx_payroll_evaluation_restriction_m08_m09_bridge",
    emits_runtime_receipt: false,
    deterministic_only: true,
    validation_commands: ["npm run rp30:hrx:validate", "npm run rp30:validate", "npm run hrx:requirements:validate", "npm run hrx:weighted:validate"],
    boundary_assertions: [
      "payroll_restriction_m08_tail_descriptor",
      "payroll_restriction_runtime_deferred",
      "payroll_restriction_record_writes_deferred",
      "payroll_restriction_real_payroll_data_excluded",
      "payroll_restriction_bypass_deferred",
      "payroll_restriction_policy_runtime_deferred",
      "payroll_restriction_calculation_runtime_deferred",
      "payroll_restriction_decision_emission_deferred",
      "evaluation_restriction_m09_foundation_descriptor",
      "evaluation_restriction_runtime_deferred",
      "evaluation_restriction_record_writes_deferred",
      "evaluation_restriction_real_evaluation_data_excluded",
      "evaluation_restriction_bypass_deferred",
      "evaluation_restriction_policy_runtime_deferred",
      "evaluation_restriction_score_runtime_deferred",
      "evaluation_restriction_decision_emission_deferred",
      "credentials_and_secrets_excluded",
    ],
  });
}

export function createHrxCp955ClaudeReviewPacket() {
  return deepFreeze({
    gate: HRX_CP955_PACK_BINDING.claude_gate,
    pack_id: HRX_CP955_PACK_BINDING.pack_id,
    read_only: true,
    promotes_claude_to_final_approval: false,
    review_questions: [
      "Do PayrollRestriction M08 tail rows remain descriptor-only without restriction runtime, calculation runtime, policy execution, record writes, real payroll data, decision emission, or permission bypass?",
      "Do EvaluationRestriction M09 foundation rows remain descriptor-only without evaluation runtime, scoring runtime, policy execution, record writes, real evaluation data, decision emission, or permission bypass?",
      "Does CP955 keep credentials, secrets, runtime receipts, enterprise trust, and separate HRX product claims closed?",
    ],
  });
}

export function createHrxCp955CloseoutHandoff() {
  return deepFreeze({
    from_pack_id: HRX_CP955_PACK_BINDING.pack_id,
    to_pack_id: HRX_CP955_PACK_BINDING.next_pack_id,
    next_subphase_id: HRX_CP955_PACK_BINDING.next_subphase_id,
    handoff_contract: "Continue RP30 P06 EvaluationRestriction M09 tail descriptors while keeping payroll restriction runtime, evaluation restriction runtime, score runtime, policy execution, decision emission, record writes, real evaluation/payroll data, credentials, secrets, and separate-product claims closed.",
  });
}

export function createHrxCp955PayrollEvaluationRestrictionBridgeDescriptor() {
  const caseSet = createHrxCp955PayrollEvaluationRestrictionBridgeCaseSet();
  return deepFreeze({
    descriptor: "HrxCp955PayrollEvaluationRestrictionBridgeDescriptor",
    source_descriptor: "HrxCp954SensitiveGuardPayrollRestrictionBridgeDescriptor",
    pack_id: HRX_CP955_PACK_BINDING.pack_id,
    planned_pack_id: HRX_CP955_PACK_BINDING.planned_pack_id,
    range: HRX_CP955_PACK_BINDING.range,
    program_contract: HRX_PROGRAM_CONTRACT,
    authority_boundary: {
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: HRX_CP955_PACK_BINDING.next_pack_id,
    },
    hrx_payroll_evaluation_restriction_m08_m09_bridge_case_set: caseSet,
    domain_entities: {
      PayrollRestriction: deepFreeze({
        descriptor_only: true,
        payroll_restriction_runtime_opened: false,
        payroll_restriction_record_write_opened: false,
        payroll_restriction_real_data_allowed: false,
        payroll_restriction_bypass_allowed: false,
        payroll_restriction_policy_runtime_opened: false,
        payroll_restriction_decision_emitted: false,
        payroll_restriction_calculation_runtime_opened: false,
      }),
      EvaluationRestriction: deepFreeze({
        descriptor_only: true,
        evaluation_restriction_runtime_opened: false,
        evaluation_restriction_record_write_opened: false,
        evaluation_restriction_real_data_allowed: false,
        evaluation_restriction_bypass_allowed: false,
        evaluation_restriction_policy_runtime_opened: false,
        evaluation_restriction_decision_emitted: false,
        evaluation_restriction_score_runtime_opened: false,
      }),
    },
    baseline_decisions: {
      hrx_embedded_inside_law_firm_os: true,
      separate_hrx_product_created: false,
      payroll_restriction_m08_tail_descriptor_only: true,
      payroll_restriction_runtime_deferred: true,
      payroll_restriction_record_writes_deferred: true,
      payroll_restriction_real_payroll_data_deferred: true,
      payroll_restriction_bypass_deferred: true,
      payroll_restriction_policy_runtime_deferred: true,
      payroll_restriction_decision_emission_deferred: true,
      payroll_restriction_calculation_runtime_deferred: true,
      evaluation_restriction_m09_foundation_descriptor_only: true,
      evaluation_restriction_runtime_deferred: true,
      evaluation_restriction_record_writes_deferred: true,
      evaluation_restriction_real_evaluation_data_deferred: true,
      evaluation_restriction_bypass_deferred: true,
      evaluation_restriction_policy_runtime_deferred: true,
      evaluation_restriction_decision_emission_deferred: true,
      evaluation_score_runtime_deferred: true,
      payroll_calculation_runtime_deferred: true,
      hr_ai_final_judgment_allowed: false,
      sensitive_hr_guard_required: true,
      real_employee_candidate_payroll_document_data_allowed: false,
    },
    requirement_refs: [
      "HRX-CORE-001",
      "HRX-CORE-002",
      "HRX-CORE-003",
      "HRX-GATE-001",
      "HRX-GATE-002",
      "HRX-GATE-003",
      "HRX-GATE-004",
      "HRX-GATE-005",
      "HRX-GATE-006",
    ],
    hermes_packet: createHrxCp955HermesEvidencePacket(),
    claude_packet: createHrxCp955ClaudeReviewPacket(),
    closeout_handoff: createHrxCp955CloseoutHandoff(),
    required_capabilities: HRX_CP955_REQUIREMENTS.required_capabilities,
    safety_gates: HRX_CP955_REQUIREMENTS.safety_gates,
    no_leak_guards: HRX_CP955_REQUIREMENTS.required_no_leak_guards,
    blocked_claims: HRX_BLOCKED_CLAIMS,
    ...HRX_NO_WRITE_ATTESTATION,
  });
}

export function createHrxCp956EvaluationCandidatePrivacyBridgeCaseSet() {
  const sections = {};
  for (const [microId, titles] of Object.entries(HRX_CP956_REQUIRED_SECTION_ROWS)) {
    sections[microId] = deepFreeze({
      micro_phase_id: microId,
      row_count: titles.length,
      rows: createHrxDomainRows(microId, titles),
    });
  }
  return deepFreeze({
    pack_id: HRX_CP956_PACK_BINDING.pack_id,
    section_count: Object.keys(sections).length,
    row_count: Object.values(sections).reduce((sum, section) => sum + section.row_count, 0),
    sections,
  });
}

export function createHrxCp956HermesEvidencePacket() {
  return deepFreeze({
    gate: HRX_CP956_PACK_BINDING.hermes_gate,
    pack_id: HRX_CP956_PACK_BINDING.pack_id,
    evidence_kind: "hrx_evaluation_candidate_privacy_m09_m10_bridge",
    emits_runtime_receipt: false,
    deterministic_only: true,
    validation_commands: ["npm run rp30:hrx:validate", "npm run rp30:validate", "npm run hrx:requirements:validate", "npm run hrx:weighted:validate"],
    boundary_assertions: [
      "evaluation_restriction_m09_tail_descriptor",
      "evaluation_restriction_runtime_deferred",
      "evaluation_restriction_record_writes_deferred",
      "evaluation_restriction_real_evaluation_data_excluded",
      "evaluation_restriction_bypass_deferred",
      "evaluation_restriction_policy_runtime_deferred",
      "evaluation_restriction_score_runtime_deferred",
      "evaluation_restriction_decision_emission_deferred",
      "candidate_privacy_m10_foundation_descriptor",
      "candidate_privacy_runtime_deferred",
      "candidate_privacy_record_writes_deferred",
      "candidate_privacy_real_candidate_data_excluded",
      "candidate_privacy_bypass_deferred",
      "candidate_privacy_policy_runtime_deferred",
      "candidate_privacy_masking_runtime_deferred",
      "candidate_privacy_decision_emission_deferred",
      "credentials_and_secrets_excluded",
    ],
  });
}

export function createHrxCp956ClaudeReviewPacket() {
  return deepFreeze({
    gate: HRX_CP956_PACK_BINDING.claude_gate,
    pack_id: HRX_CP956_PACK_BINDING.pack_id,
    read_only: true,
    promotes_claude_to_final_approval: false,
    review_questions: [
      "Do EvaluationRestriction M09 tail rows remain descriptor-only without evaluation runtime, scoring runtime, policy execution, record writes, real evaluation data, decision emission, or permission bypass?",
      "Do CandidatePrivacy M10 foundation rows remain descriptor-only without privacy runtime, masking runtime, policy execution, record writes, real candidate data, privacy decision emission, or permission bypass?",
      "Does CP956 keep credentials, secrets, runtime receipts, enterprise trust, and separate HRX product claims closed?",
    ],
  });
}

export function createHrxCp956CloseoutHandoff() {
  return deepFreeze({
    from_pack_id: HRX_CP956_PACK_BINDING.pack_id,
    to_pack_id: HRX_CP956_PACK_BINDING.next_pack_id,
    next_subphase_id: HRX_CP956_PACK_BINDING.next_subphase_id,
    handoff_contract: "Continue RP30 P06 CandidatePrivacy M10 tail descriptors while keeping evaluation restriction runtime, candidate privacy runtime, masking runtime, policy execution, decision emission, record writes, real evaluation/candidate data, credentials, secrets, and separate-product claims closed.",
  });
}

export function createHrxCp956EvaluationCandidatePrivacyBridgeDescriptor() {
  const caseSet = createHrxCp956EvaluationCandidatePrivacyBridgeCaseSet();
  return deepFreeze({
    descriptor: "HrxCp956EvaluationCandidatePrivacyBridgeDescriptor",
    source_descriptor: "HrxCp955PayrollEvaluationRestrictionBridgeDescriptor",
    pack_id: HRX_CP956_PACK_BINDING.pack_id,
    planned_pack_id: HRX_CP956_PACK_BINDING.planned_pack_id,
    range: HRX_CP956_PACK_BINDING.range,
    program_contract: HRX_PROGRAM_CONTRACT,
    authority_boundary: {
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: HRX_CP956_PACK_BINDING.next_pack_id,
    },
    hrx_evaluation_candidate_privacy_m09_m10_bridge_case_set: caseSet,
    domain_entities: {
      EvaluationRestriction: deepFreeze({
        descriptor_only: true,
        evaluation_restriction_runtime_opened: false,
        evaluation_restriction_record_write_opened: false,
        evaluation_restriction_real_data_allowed: false,
        evaluation_restriction_bypass_allowed: false,
        evaluation_restriction_policy_runtime_opened: false,
        evaluation_restriction_decision_emitted: false,
        evaluation_restriction_score_runtime_opened: false,
      }),
      CandidatePrivacy: deepFreeze({
        descriptor_only: true,
        candidate_privacy_runtime_opened: false,
        candidate_privacy_record_write_opened: false,
        candidate_privacy_real_data_allowed: false,
        candidate_privacy_bypass_allowed: false,
        candidate_privacy_policy_runtime_opened: false,
        candidate_privacy_decision_emitted: false,
        candidate_privacy_masking_runtime_opened: false,
      }),
    },
    baseline_decisions: {
      hrx_embedded_inside_law_firm_os: true,
      separate_hrx_product_created: false,
      evaluation_restriction_m09_tail_descriptor_only: true,
      evaluation_restriction_runtime_deferred: true,
      evaluation_restriction_record_writes_deferred: true,
      evaluation_restriction_real_evaluation_data_deferred: true,
      evaluation_restriction_bypass_deferred: true,
      evaluation_restriction_policy_runtime_deferred: true,
      evaluation_restriction_decision_emission_deferred: true,
      evaluation_restriction_score_runtime_deferred: true,
      candidate_privacy_m10_foundation_descriptor_only: true,
      candidate_privacy_runtime_deferred: true,
      candidate_privacy_record_writes_deferred: true,
      candidate_privacy_real_candidate_data_deferred: true,
      candidate_privacy_bypass_deferred: true,
      candidate_privacy_policy_runtime_deferred: true,
      candidate_privacy_decision_emission_deferred: true,
      candidate_privacy_masking_runtime_deferred: true,
      payroll_calculation_runtime_deferred: true,
      hr_ai_final_judgment_allowed: false,
      sensitive_hr_guard_required: true,
      real_employee_candidate_payroll_document_data_allowed: false,
    },
    requirement_refs: [
      "HRX-CORE-001",
      "HRX-CORE-002",
      "HRX-CORE-003",
      "HRX-GATE-001",
      "HRX-GATE-002",
      "HRX-GATE-003",
      "HRX-GATE-004",
      "HRX-GATE-005",
      "HRX-GATE-006",
    ],
    hermes_packet: createHrxCp956HermesEvidencePacket(),
    claude_packet: createHrxCp956ClaudeReviewPacket(),
    closeout_handoff: createHrxCp956CloseoutHandoff(),
    required_capabilities: HRX_CP956_REQUIREMENTS.required_capabilities,
    safety_gates: HRX_CP956_REQUIREMENTS.safety_gates,
    no_leak_guards: HRX_CP956_REQUIREMENTS.required_no_leak_guards,
    blocked_claims: HRX_BLOCKED_CLAIMS,
    ...HRX_NO_WRITE_ATTESTATION,
  });
}

export function createHrxCp957CandidatePrivacyMissingUserLinkBridgeCaseSet() {
  const sections = {};
  for (const [microId, titles] of Object.entries(HRX_CP957_REQUIRED_SECTION_ROWS)) {
    sections[microId] = deepFreeze({
      micro_phase_id: microId,
      row_count: titles.length,
      rows: createHrxDomainRows(microId, titles),
    });
  }
  return deepFreeze({
    pack_id: HRX_CP957_PACK_BINDING.pack_id,
    section_count: Object.keys(sections).length,
    row_count: Object.values(sections).reduce((sum, section) => sum + section.row_count, 0),
    sections,
  });
}

export function createHrxCp957HermesEvidencePacket() {
  return deepFreeze({
    gate: HRX_CP957_PACK_BINDING.hermes_gate,
    pack_id: HRX_CP957_PACK_BINDING.pack_id,
    evidence_kind: "hrx_candidate_privacy_missing_user_link_m10_p07_bridge",
    emits_runtime_receipt: false,
    deterministic_only: true,
    validation_commands: ["npm run rp30:hrx:validate", "npm run rp30:validate", "npm run hrx:requirements:validate", "npm run hrx:weighted:validate"],
    boundary_assertions: [
      "candidate_privacy_m10_tail_descriptor",
      "candidate_privacy_runtime_deferred",
      "candidate_privacy_record_writes_deferred",
      "candidate_privacy_real_candidate_data_excluded",
      "candidate_privacy_bypass_deferred",
      "candidate_privacy_policy_runtime_deferred",
      "candidate_privacy_masking_runtime_deferred",
      "candidate_privacy_decision_emission_deferred",
      "missing_user_link_p07_foundation_descriptor",
      "missing_user_link_runtime_deferred",
      "missing_user_link_record_writes_deferred",
      "missing_user_link_real_hr_data_excluded",
      "missing_user_link_bypass_deferred",
      "missing_user_link_policy_runtime_deferred",
      "missing_user_link_decision_emission_deferred",
      "user_employee_separation_preserved",
      "credentials_and_secrets_excluded",
    ],
  });
}

export function createHrxCp957ClaudeReviewPacket() {
  return deepFreeze({
    gate: HRX_CP957_PACK_BINDING.claude_gate,
    pack_id: HRX_CP957_PACK_BINDING.pack_id,
    read_only: true,
    promotes_claude_to_final_approval: false,
    review_questions: [
      "Do CandidatePrivacy M10 tail rows remain descriptor-only without privacy runtime, masking runtime, policy execution, record writes, real candidate data, privacy decision emission, or permission bypass?",
      "Do MissingUserLink P07 foundation rows remain descriptor-only without link runtime, policy execution, record writes, real HR data, link decision emission, User/Employee conflation, or permission bypass?",
      "Does CP957 keep credentials, secrets, runtime receipts, enterprise trust, and separate HRX product claims closed?",
    ],
  });
}

export function createHrxCp957CloseoutHandoff() {
  return deepFreeze({
    from_pack_id: HRX_CP957_PACK_BINDING.pack_id,
    to_pack_id: HRX_CP957_PACK_BINDING.next_pack_id,
    next_subphase_id: HRX_CP957_PACK_BINDING.next_subphase_id,
    handoff_contract: "Continue RP30 P07 MissingUserLink tail descriptors while keeping candidate privacy runtime, missing user link runtime, masking runtime, link decision emission, policy execution, record writes, User/Employee conflation, real HR/candidate data, credentials, secrets, and separate-product claims closed.",
  });
}

export function createHrxCp957CandidatePrivacyMissingUserLinkBridgeDescriptor() {
  const caseSet = createHrxCp957CandidatePrivacyMissingUserLinkBridgeCaseSet();
  return deepFreeze({
    descriptor: "HrxCp957CandidatePrivacyMissingUserLinkBridgeDescriptor",
    source_descriptor: "HrxCp956EvaluationCandidatePrivacyBridgeDescriptor",
    pack_id: HRX_CP957_PACK_BINDING.pack_id,
    planned_pack_id: HRX_CP957_PACK_BINDING.planned_pack_id,
    range: HRX_CP957_PACK_BINDING.range,
    program_contract: HRX_PROGRAM_CONTRACT,
    authority_boundary: {
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: HRX_CP957_PACK_BINDING.next_pack_id,
    },
    hrx_candidate_privacy_missing_user_link_m10_p07_bridge_case_set: caseSet,
    domain_entities: {
      CandidatePrivacy: deepFreeze({
        descriptor_only: true,
        candidate_privacy_runtime_opened: false,
        candidate_privacy_record_write_opened: false,
        candidate_privacy_real_data_allowed: false,
        candidate_privacy_bypass_allowed: false,
        candidate_privacy_policy_runtime_opened: false,
        candidate_privacy_decision_emitted: false,
        candidate_privacy_masking_runtime_opened: false,
      }),
      MissingUserLink: deepFreeze({
        descriptor_only: true,
        missing_user_link_runtime_opened: false,
        missing_user_link_record_write_opened: false,
        missing_user_link_real_data_allowed: false,
        missing_user_link_bypass_allowed: false,
        missing_user_link_policy_runtime_opened: false,
        missing_user_link_decision_emitted: false,
        missing_user_link_user_employee_link_runtime_opened: false,
        user_employee_separation_preserved: true,
        user_account_conflated: false,
      }),
    },
    baseline_decisions: {
      hrx_embedded_inside_law_firm_os: true,
      separate_hrx_product_created: false,
      candidate_privacy_m10_tail_descriptor_only: true,
      candidate_privacy_runtime_deferred: true,
      candidate_privacy_record_writes_deferred: true,
      candidate_privacy_real_candidate_data_deferred: true,
      candidate_privacy_bypass_deferred: true,
      candidate_privacy_policy_runtime_deferred: true,
      candidate_privacy_decision_emission_deferred: true,
      candidate_privacy_masking_runtime_deferred: true,
      missing_user_link_p07_foundation_descriptor_only: true,
      missing_user_link_runtime_deferred: true,
      missing_user_link_record_writes_deferred: true,
      missing_user_link_real_hr_data_deferred: true,
      missing_user_link_bypass_deferred: true,
      missing_user_link_policy_runtime_deferred: true,
      missing_user_link_decision_emission_deferred: true,
      missing_user_link_user_employee_link_runtime_deferred: true,
      user_employee_separation_preserved: true,
      user_account_conflation_blocked: true,
      payroll_calculation_runtime_deferred: true,
      hr_ai_final_judgment_allowed: false,
      sensitive_hr_guard_required: true,
      real_employee_candidate_payroll_document_data_allowed: false,
    },
    requirement_refs: [
      "HRX-CORE-001",
      "HRX-CORE-002",
      "HRX-CORE-003",
      "HRX-GATE-001",
      "HRX-GATE-002",
      "HRX-GATE-003",
      "HRX-GATE-004",
      "HRX-GATE-005",
      "HRX-GATE-006",
    ],
    hermes_packet: createHrxCp957HermesEvidencePacket(),
    claude_packet: createHrxCp957ClaudeReviewPacket(),
    closeout_handoff: createHrxCp957CloseoutHandoff(),
    required_capabilities: HRX_CP957_REQUIREMENTS.required_capabilities,
    safety_gates: HRX_CP957_REQUIREMENTS.safety_gates,
    no_leak_guards: HRX_CP957_REQUIREMENTS.required_no_leak_guards,
    blocked_claims: HRX_BLOCKED_CLAIMS,
    ...HRX_NO_WRITE_ATTESTATION,
  });
}

export function createHrxCp958MissingUserLinkTailCaseSet() {
  const sections = {};
  for (const [microId, titles] of Object.entries(HRX_CP958_REQUIRED_SECTION_ROWS)) {
    sections[microId] = deepFreeze({
      micro_phase_id: microId,
      row_count: titles.length,
      rows: createHrxDomainRows(microId, titles),
    });
  }
  return deepFreeze({
    pack_id: HRX_CP958_PACK_BINDING.pack_id,
    section_count: Object.keys(sections).length,
    row_count: Object.values(sections).reduce((sum, section) => sum + section.row_count, 0),
    sections,
  });
}

export function createHrxCp958HermesEvidencePacket() {
  return deepFreeze({
    gate: HRX_CP958_PACK_BINDING.hermes_gate,
    pack_id: HRX_CP958_PACK_BINDING.pack_id,
    evidence_kind: "hrx_missing_user_link_p07_tail",
    emits_runtime_receipt: false,
    deterministic_only: true,
    validation_commands: ["npm run rp30:hrx:validate", "npm run rp30:validate", "npm run hrx:requirements:validate", "npm run hrx:weighted:validate"],
    boundary_assertions: [
      "missing_user_link_p07_tail_descriptor",
      "missing_user_link_runtime_deferred",
      "missing_user_link_record_writes_deferred",
      "missing_user_link_real_hr_data_excluded",
      "missing_user_link_bypass_deferred",
      "missing_user_link_policy_runtime_deferred",
      "missing_user_link_decision_emission_deferred",
      "missing_user_link_user_employee_link_runtime_deferred",
      "user_employee_separation_preserved",
      "credentials_and_secrets_excluded",
    ],
  });
}

export function createHrxCp958ClaudeReviewPacket() {
  return deepFreeze({
    gate: HRX_CP958_PACK_BINDING.claude_gate,
    pack_id: HRX_CP958_PACK_BINDING.pack_id,
    read_only: true,
    promotes_claude_to_final_approval: false,
    review_questions: [
      "Do MissingUserLink P07 tail rows remain descriptor-only without link runtime, policy execution, record writes, real HR data, link decision emission, User/Employee conflation, or permission bypass?",
      "Does CP958 preserve User/Employee separation while deferring payroll runtime attempts to the next descriptor-only pack?",
      "Does CP958 keep credentials, secrets, runtime receipts, enterprise trust, and separate HRX product claims closed?",
    ],
  });
}

export function createHrxCp958CloseoutHandoff() {
  return deepFreeze({
    from_pack_id: HRX_CP958_PACK_BINDING.pack_id,
    to_pack_id: HRX_CP958_PACK_BINDING.next_pack_id,
    next_subphase_id: HRX_CP958_PACK_BINDING.next_subphase_id,
    handoff_contract: "Continue RP30 P07 PayrollRuntimeAttempt descriptors while keeping MissingUserLink runtime, payroll runtime, link decision emission, policy execution, record writes, User/Employee conflation, real HR/payroll data, credentials, secrets, and separate-product claims closed.",
  });
}

export function createHrxCp958MissingUserLinkTailDescriptor() {
  const caseSet = createHrxCp958MissingUserLinkTailCaseSet();
  return deepFreeze({
    descriptor: "HrxCp958MissingUserLinkTailDescriptor",
    source_descriptor: "HrxCp957CandidatePrivacyMissingUserLinkBridgeDescriptor",
    pack_id: HRX_CP958_PACK_BINDING.pack_id,
    planned_pack_id: HRX_CP958_PACK_BINDING.planned_pack_id,
    range: HRX_CP958_PACK_BINDING.range,
    program_contract: HRX_PROGRAM_CONTRACT,
    authority_boundary: {
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: HRX_CP958_PACK_BINDING.next_pack_id,
    },
    hrx_missing_user_link_p07_tail_case_set: caseSet,
    domain_entities: {
      MissingUserLink: deepFreeze({
        descriptor_only: true,
        missing_user_link_runtime_opened: false,
        missing_user_link_record_write_opened: false,
        missing_user_link_real_data_allowed: false,
        missing_user_link_bypass_allowed: false,
        missing_user_link_policy_runtime_opened: false,
        missing_user_link_decision_emitted: false,
        missing_user_link_user_employee_link_runtime_opened: false,
        user_employee_separation_preserved: true,
        user_account_conflated: false,
      }),
    },
    baseline_decisions: {
      hrx_embedded_inside_law_firm_os: true,
      separate_hrx_product_created: false,
      missing_user_link_p07_tail_descriptor_only: true,
      missing_user_link_runtime_deferred: true,
      missing_user_link_record_writes_deferred: true,
      missing_user_link_real_hr_data_deferred: true,
      missing_user_link_bypass_deferred: true,
      missing_user_link_policy_runtime_deferred: true,
      missing_user_link_decision_emission_deferred: true,
      missing_user_link_user_employee_link_runtime_deferred: true,
      user_employee_separation_preserved: true,
      user_account_conflation_blocked: true,
      payroll_runtime_attempt_deferred_to_next_pack: true,
      payroll_calculation_runtime_deferred: true,
      hr_ai_final_judgment_allowed: false,
      sensitive_hr_guard_required: true,
      real_employee_candidate_payroll_document_data_allowed: false,
    },
    requirement_refs: [
      "HRX-CORE-001",
      "HRX-CORE-002",
      "HRX-CORE-003",
      "HRX-GATE-001",
      "HRX-GATE-002",
      "HRX-GATE-003",
      "HRX-GATE-004",
      "HRX-GATE-005",
      "HRX-GATE-006",
    ],
    hermes_packet: createHrxCp958HermesEvidencePacket(),
    claude_packet: createHrxCp958ClaudeReviewPacket(),
    closeout_handoff: createHrxCp958CloseoutHandoff(),
    required_capabilities: HRX_CP958_REQUIREMENTS.required_capabilities,
    safety_gates: HRX_CP958_REQUIREMENTS.safety_gates,
    no_leak_guards: HRX_CP958_REQUIREMENTS.required_no_leak_guards,
    blocked_claims: HRX_BLOCKED_CLAIMS,
    ...HRX_NO_WRITE_ATTESTATION,
  });
}

export function createHrxCp959PayrollRuntimeAttemptFoundationCaseSet() {
  const sections = {};
  for (const [microId, titles] of Object.entries(HRX_CP959_REQUIRED_SECTION_ROWS)) {
    sections[microId] = deepFreeze({
      micro_phase_id: microId,
      row_count: titles.length,
      rows: createHrxDomainRows(microId, titles),
    });
  }
  return deepFreeze({
    pack_id: HRX_CP959_PACK_BINDING.pack_id,
    section_count: Object.keys(sections).length,
    row_count: Object.values(sections).reduce((sum, section) => sum + section.row_count, 0),
    sections,
  });
}

export function createHrxCp959HermesEvidencePacket() {
  return deepFreeze({
    gate: HRX_CP959_PACK_BINDING.hermes_gate,
    pack_id: HRX_CP959_PACK_BINDING.pack_id,
    evidence_kind: "hrx_payroll_runtime_attempt_p07_foundation",
    emits_runtime_receipt: false,
    deterministic_only: true,
    validation_commands: ["npm run rp30:hrx:validate", "npm run rp30:validate", "npm run hrx:requirements:validate", "npm run hrx:weighted:validate"],
    boundary_assertions: [
      "payroll_runtime_attempt_p07_foundation_descriptor",
      "payroll_runtime_attempt_runtime_deferred",
      "payroll_runtime_attempt_record_writes_deferred",
      "payroll_runtime_attempt_real_payroll_data_excluded",
      "payroll_runtime_attempt_bypass_deferred",
      "payroll_runtime_attempt_policy_runtime_deferred",
      "payroll_runtime_attempt_decision_emission_deferred",
      "payroll_runtime_attempt_calculation_runtime_deferred",
      "credentials_and_secrets_excluded",
    ],
  });
}

export function createHrxCp959ClaudeReviewPacket() {
  return deepFreeze({
    gate: HRX_CP959_PACK_BINDING.claude_gate,
    pack_id: HRX_CP959_PACK_BINDING.pack_id,
    read_only: true,
    promotes_claude_to_final_approval: false,
    review_questions: [
      "Do PayrollRuntimeAttempt P07 foundation rows remain descriptor-only without payroll runtime, policy execution, record writes, real payroll data, attempt decision emission, calculation runtime, or permission bypass?",
      "Does CP959 preserve MissingUserLink boundaries while opening no payroll calculation runtime or runtime receipts?",
      "Does CP959 keep credentials, secrets, enterprise trust, and separate HRX product claims closed?",
    ],
  });
}

export function createHrxCp959CloseoutHandoff() {
  return deepFreeze({
    from_pack_id: HRX_CP959_PACK_BINDING.pack_id,
    to_pack_id: HRX_CP959_PACK_BINDING.next_pack_id,
    next_subphase_id: HRX_CP959_PACK_BINDING.next_subphase_id,
    handoff_contract: "Continue RP30 P07 PayrollRuntimeAttempt tail and AIScoringAttempt foundation descriptors while keeping payroll runtime, payroll calculation runtime, AI scoring runtime, policy execution, decision emission, record writes, real HR/payroll/evaluation data, credentials, secrets, and separate-product claims closed.",
  });
}

export function createHrxCp959PayrollRuntimeAttemptFoundationDescriptor() {
  const caseSet = createHrxCp959PayrollRuntimeAttemptFoundationCaseSet();
  return deepFreeze({
    descriptor: "HrxCp959PayrollRuntimeAttemptFoundationDescriptor",
    source_descriptor: "HrxCp958MissingUserLinkTailDescriptor",
    pack_id: HRX_CP959_PACK_BINDING.pack_id,
    planned_pack_id: HRX_CP959_PACK_BINDING.planned_pack_id,
    range: HRX_CP959_PACK_BINDING.range,
    program_contract: HRX_PROGRAM_CONTRACT,
    authority_boundary: {
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: HRX_CP959_PACK_BINDING.next_pack_id,
    },
    hrx_payroll_runtime_attempt_p07_foundation_case_set: caseSet,
    domain_entities: {
      PayrollRuntimeAttempt: deepFreeze({
        descriptor_only: true,
        payroll_runtime_attempt_runtime_opened: false,
        payroll_runtime_attempt_record_write_opened: false,
        payroll_runtime_attempt_real_data_allowed: false,
        payroll_runtime_attempt_bypass_allowed: false,
        payroll_runtime_attempt_policy_runtime_opened: false,
        payroll_runtime_attempt_decision_emitted: false,
        payroll_runtime_attempt_calculation_runtime_opened: false,
      }),
    },
    baseline_decisions: {
      hrx_embedded_inside_law_firm_os: true,
      separate_hrx_product_created: false,
      payroll_runtime_attempt_p07_foundation_descriptor_only: true,
      payroll_runtime_attempt_runtime_deferred: true,
      payroll_runtime_attempt_record_writes_deferred: true,
      payroll_runtime_attempt_real_payroll_data_deferred: true,
      payroll_runtime_attempt_bypass_deferred: true,
      payroll_runtime_attempt_policy_runtime_deferred: true,
      payroll_runtime_attempt_decision_emission_deferred: true,
      payroll_runtime_attempt_calculation_runtime_deferred: true,
      missing_user_link_runtime_deferred: true,
      payroll_calculation_runtime_deferred: true,
      hr_ai_final_judgment_allowed: false,
      sensitive_hr_guard_required: true,
      real_employee_candidate_payroll_document_data_allowed: false,
    },
    requirement_refs: [
      "HRX-CORE-001",
      "HRX-CORE-002",
      "HRX-CORE-003",
      "HRX-GATE-001",
      "HRX-GATE-002",
      "HRX-GATE-003",
      "HRX-GATE-004",
      "HRX-GATE-005",
      "HRX-GATE-006",
    ],
    hermes_packet: createHrxCp959HermesEvidencePacket(),
    claude_packet: createHrxCp959ClaudeReviewPacket(),
    closeout_handoff: createHrxCp959CloseoutHandoff(),
    required_capabilities: HRX_CP959_REQUIREMENTS.required_capabilities,
    safety_gates: HRX_CP959_REQUIREMENTS.safety_gates,
    no_leak_guards: HRX_CP959_REQUIREMENTS.required_no_leak_guards,
    blocked_claims: HRX_BLOCKED_CLAIMS,
    ...HRX_NO_WRITE_ATTESTATION,
  });
}

export function createHrxCp960PayrollRuntimeAttemptAiScoringBridgeCaseSet() {
  const sections = {};
  for (const [microId, titles] of Object.entries(HRX_CP960_REQUIRED_SECTION_ROWS)) {
    sections[microId] = deepFreeze({
      micro_phase_id: microId,
      row_count: titles.length,
      rows: createHrxDomainRows(microId, titles),
    });
  }
  return deepFreeze({
    pack_id: HRX_CP960_PACK_BINDING.pack_id,
    section_count: Object.keys(sections).length,
    row_count: Object.values(sections).reduce((sum, section) => sum + section.row_count, 0),
    sections,
  });
}

export function createHrxCp960HermesEvidencePacket() {
  return deepFreeze({
    gate: HRX_CP960_PACK_BINDING.hermes_gate,
    pack_id: HRX_CP960_PACK_BINDING.pack_id,
    evidence_kind: "hrx_payroll_runtime_attempt_ai_scoring_p07_bridge",
    emits_runtime_receipt: false,
    deterministic_only: true,
    validation_commands: ["npm run rp30:hrx:validate", "npm run rp30:validate", "npm run hrx:requirements:validate", "npm run hrx:weighted:validate"],
    boundary_assertions: [
      "payroll_runtime_attempt_p07_tail_descriptor",
      "payroll_runtime_attempt_runtime_deferred",
      "payroll_runtime_attempt_calculation_runtime_deferred",
      "ai_scoring_attempt_p07_foundation_descriptor",
      "ai_scoring_attempt_runtime_deferred",
      "ai_scoring_attempt_record_writes_deferred",
      "ai_scoring_attempt_real_evaluation_data_excluded",
      "ai_scoring_attempt_policy_runtime_deferred",
      "ai_scoring_attempt_decision_emission_deferred",
      "ai_scoring_attempt_score_runtime_deferred",
      "credentials_and_secrets_excluded",
    ],
  });
}

export function createHrxCp960ClaudeReviewPacket() {
  return deepFreeze({
    gate: HRX_CP960_PACK_BINDING.claude_gate,
    pack_id: HRX_CP960_PACK_BINDING.pack_id,
    read_only: true,
    promotes_claude_to_final_approval: false,
    review_questions: [
      "Do PayrollRuntimeAttempt tail rows remain descriptor-only without payroll runtime, record writes, real payroll data, calculation runtime, policy execution, decision emission, or permission bypass?",
      "Do AIScoringAttempt foundation rows remain descriptor-only without AI scoring runtime, score runtime, policy execution, final judgment, record writes, real evaluation data, or permission bypass?",
      "Does CP960 keep credentials, secrets, runtime receipts, enterprise trust, and separate HRX product claims closed?",
    ],
  });
}

export function createHrxCp960CloseoutHandoff() {
  return deepFreeze({
    from_pack_id: HRX_CP960_PACK_BINDING.pack_id,
    to_pack_id: HRX_CP960_PACK_BINDING.next_pack_id,
    next_subphase_id: HRX_CP960_PACK_BINDING.next_subphase_id,
    handoff_contract: "Continue RP30 P07 AIScoringAttempt tail and CrossTenantAccess foundation descriptors while keeping payroll runtime, AI scoring runtime, score runtime, cross-tenant access runtime, policy execution, decision emission, record writes, real HR/payroll/evaluation/access data, credentials, secrets, and separate-product claims closed.",
  });
}

export function createHrxCp960PayrollRuntimeAttemptAiScoringBridgeDescriptor() {
  const caseSet = createHrxCp960PayrollRuntimeAttemptAiScoringBridgeCaseSet();
  return deepFreeze({
    descriptor: "HrxCp960PayrollRuntimeAttemptAiScoringBridgeDescriptor",
    source_descriptor: "HrxCp959PayrollRuntimeAttemptFoundationDescriptor",
    pack_id: HRX_CP960_PACK_BINDING.pack_id,
    planned_pack_id: HRX_CP960_PACK_BINDING.planned_pack_id,
    range: HRX_CP960_PACK_BINDING.range,
    program_contract: HRX_PROGRAM_CONTRACT,
    authority_boundary: {
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: HRX_CP960_PACK_BINDING.next_pack_id,
    },
    hrx_payroll_runtime_attempt_ai_scoring_p07_bridge_case_set: caseSet,
    domain_entities: {
      PayrollRuntimeAttempt: deepFreeze({
        descriptor_only: true,
        payroll_runtime_attempt_runtime_opened: false,
        payroll_runtime_attempt_record_write_opened: false,
        payroll_runtime_attempt_real_data_allowed: false,
        payroll_runtime_attempt_bypass_allowed: false,
        payroll_runtime_attempt_policy_runtime_opened: false,
        payroll_runtime_attempt_decision_emitted: false,
        payroll_runtime_attempt_calculation_runtime_opened: false,
      }),
      AIScoringAttempt: deepFreeze({
        descriptor_only: true,
        ai_scoring_attempt_runtime_opened: false,
        ai_scoring_attempt_record_write_opened: false,
        ai_scoring_attempt_real_data_allowed: false,
        ai_scoring_attempt_bypass_allowed: false,
        ai_scoring_attempt_policy_runtime_opened: false,
        ai_scoring_attempt_decision_emitted: false,
        ai_scoring_attempt_score_runtime_opened: false,
        ai_scoring_attempt_final_judgment_allowed: false,
      }),
    },
    baseline_decisions: {
      hrx_embedded_inside_law_firm_os: true,
      separate_hrx_product_created: false,
      payroll_runtime_attempt_p07_tail_descriptor_only: true,
      payroll_runtime_attempt_runtime_deferred: true,
      payroll_runtime_attempt_record_writes_deferred: true,
      payroll_runtime_attempt_real_payroll_data_deferred: true,
      payroll_runtime_attempt_bypass_deferred: true,
      payroll_runtime_attempt_policy_runtime_deferred: true,
      payroll_runtime_attempt_decision_emission_deferred: true,
      payroll_runtime_attempt_calculation_runtime_deferred: true,
      ai_scoring_attempt_p07_foundation_descriptor_only: true,
      ai_scoring_attempt_runtime_deferred: true,
      ai_scoring_attempt_record_writes_deferred: true,
      ai_scoring_attempt_real_evaluation_data_deferred: true,
      ai_scoring_attempt_bypass_deferred: true,
      ai_scoring_attempt_policy_runtime_deferred: true,
      ai_scoring_attempt_decision_emission_deferred: true,
      ai_scoring_attempt_score_runtime_deferred: true,
      ai_scoring_attempt_final_judgment_deferred: true,
      payroll_calculation_runtime_deferred: true,
      hr_ai_final_judgment_allowed: false,
      sensitive_hr_guard_required: true,
      real_employee_candidate_payroll_document_data_allowed: false,
    },
    requirement_refs: [
      "HRX-CORE-001",
      "HRX-CORE-002",
      "HRX-CORE-003",
      "HRX-GATE-001",
      "HRX-GATE-002",
      "HRX-GATE-003",
      "HRX-GATE-004",
      "HRX-GATE-005",
      "HRX-GATE-006",
    ],
    hermes_packet: createHrxCp960HermesEvidencePacket(),
    claude_packet: createHrxCp960ClaudeReviewPacket(),
    closeout_handoff: createHrxCp960CloseoutHandoff(),
    required_capabilities: HRX_CP960_REQUIREMENTS.required_capabilities,
    safety_gates: HRX_CP960_REQUIREMENTS.safety_gates,
    no_leak_guards: HRX_CP960_REQUIREMENTS.required_no_leak_guards,
    blocked_claims: HRX_BLOCKED_CLAIMS,
    ...HRX_NO_WRITE_ATTESTATION,
  });
}

export function createHrxCp961AiScoringCrossTenantAccessBridgeCaseSet() {
  const sections = {};
  for (const [microId, titles] of Object.entries(HRX_CP961_REQUIRED_SECTION_ROWS)) {
    sections[microId] = deepFreeze({
      micro_phase_id: microId,
      row_count: titles.length,
      rows: createHrxDomainRows(microId, titles),
    });
  }
  return deepFreeze({
    pack_id: HRX_CP961_PACK_BINDING.pack_id,
    section_count: Object.keys(sections).length,
    row_count: Object.values(sections).reduce((sum, section) => sum + section.row_count, 0),
    sections,
  });
}

export function createHrxCp961HermesEvidencePacket() {
  return deepFreeze({
    gate: HRX_CP961_PACK_BINDING.hermes_gate,
    pack_id: HRX_CP961_PACK_BINDING.pack_id,
    evidence_kind: "hrx_ai_scoring_cross_tenant_access_p07_bridge",
    emits_runtime_receipt: false,
    deterministic_only: true,
    validation_commands: ["npm run rp30:hrx:validate", "npm run rp30:validate", "npm run hrx:requirements:validate", "npm run hrx:weighted:validate"],
    boundary_assertions: [
      "ai_scoring_attempt_p07_tail_descriptor",
      "ai_scoring_attempt_runtime_deferred",
      "ai_scoring_attempt_score_runtime_deferred",
      "ai_scoring_attempt_final_judgment_deferred",
      "cross_tenant_access_p07_foundation_descriptor",
      "cross_tenant_access_runtime_deferred",
      "cross_tenant_access_record_writes_deferred",
      "cross_tenant_access_real_tenant_data_excluded",
      "cross_tenant_access_policy_runtime_deferred",
      "cross_tenant_access_decision_emission_deferred",
      "cross_tenant_access_boundary_bypass_deferred",
      "credentials_and_secrets_excluded",
    ],
  });
}

export function createHrxCp961ClaudeReviewPacket() {
  return deepFreeze({
    gate: HRX_CP961_PACK_BINDING.claude_gate,
    pack_id: HRX_CP961_PACK_BINDING.pack_id,
    read_only: true,
    promotes_claude_to_final_approval: false,
    review_questions: [
      "Do AIScoringAttempt tail rows remain descriptor-only without AI scoring runtime, score runtime, policy execution, final judgment, record writes, real evaluation data, or permission bypass?",
      "Do CrossTenantAccess foundation rows remain descriptor-only without cross-tenant runtime, access decisions, policy execution, tenant-boundary bypass, record writes, real tenant data, or permission bypass?",
      "Does CP961 keep credentials, secrets, runtime receipts, enterprise trust, and separate HRX product claims closed?",
    ],
  });
}

export function createHrxCp961CloseoutHandoff() {
  return deepFreeze({
    from_pack_id: HRX_CP961_PACK_BINDING.pack_id,
    to_pack_id: HRX_CP961_PACK_BINDING.next_pack_id,
    next_subphase_id: HRX_CP961_PACK_BINDING.next_subphase_id,
    handoff_contract: "Continue RP30 P07 CrossTenantAccess tail and StorageDecisionGap foundation descriptors while keeping cross-tenant access runtime, tenant-boundary bypass, storage decision runtime, policy execution, decision emission, record writes, real HR/tenant/storage data, credentials, secrets, and separate-product claims closed.",
  });
}

export function createHrxCp961AiScoringCrossTenantAccessBridgeDescriptor() {
  const caseSet = createHrxCp961AiScoringCrossTenantAccessBridgeCaseSet();
  return deepFreeze({
    descriptor: "HrxCp961AiScoringCrossTenantAccessBridgeDescriptor",
    source_descriptor: "HrxCp960PayrollRuntimeAttemptAiScoringBridgeDescriptor",
    pack_id: HRX_CP961_PACK_BINDING.pack_id,
    planned_pack_id: HRX_CP961_PACK_BINDING.planned_pack_id,
    range: HRX_CP961_PACK_BINDING.range,
    program_contract: HRX_PROGRAM_CONTRACT,
    authority_boundary: {
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: HRX_CP961_PACK_BINDING.next_pack_id,
    },
    hrx_ai_scoring_cross_tenant_access_p07_bridge_case_set: caseSet,
    domain_entities: {
      AIScoringAttempt: deepFreeze({
        descriptor_only: true,
        ai_scoring_attempt_runtime_opened: false,
        ai_scoring_attempt_record_write_opened: false,
        ai_scoring_attempt_real_data_allowed: false,
        ai_scoring_attempt_bypass_allowed: false,
        ai_scoring_attempt_policy_runtime_opened: false,
        ai_scoring_attempt_decision_emitted: false,
        ai_scoring_attempt_score_runtime_opened: false,
        ai_scoring_attempt_final_judgment_allowed: false,
      }),
      CrossTenantAccess: deepFreeze({
        descriptor_only: true,
        cross_tenant_access_runtime_opened: false,
        cross_tenant_access_record_write_opened: false,
        cross_tenant_access_real_data_allowed: false,
        cross_tenant_access_bypass_allowed: false,
        cross_tenant_access_policy_runtime_opened: false,
        cross_tenant_access_decision_emitted: false,
        cross_tenant_access_cross_tenant_runtime_opened: false,
        cross_tenant_access_tenant_boundary_bypass_allowed: false,
      }),
    },
    baseline_decisions: {
      hrx_embedded_inside_law_firm_os: true,
      separate_hrx_product_created: false,
      ai_scoring_attempt_p07_tail_descriptor_only: true,
      ai_scoring_attempt_runtime_deferred: true,
      ai_scoring_attempt_record_writes_deferred: true,
      ai_scoring_attempt_real_evaluation_data_deferred: true,
      ai_scoring_attempt_bypass_deferred: true,
      ai_scoring_attempt_policy_runtime_deferred: true,
      ai_scoring_attempt_decision_emission_deferred: true,
      ai_scoring_attempt_score_runtime_deferred: true,
      ai_scoring_attempt_final_judgment_deferred: true,
      cross_tenant_access_p07_foundation_descriptor_only: true,
      cross_tenant_access_runtime_deferred: true,
      cross_tenant_access_record_writes_deferred: true,
      cross_tenant_access_real_tenant_data_deferred: true,
      cross_tenant_access_bypass_deferred: true,
      cross_tenant_access_policy_runtime_deferred: true,
      cross_tenant_access_decision_emission_deferred: true,
      cross_tenant_access_cross_tenant_runtime_deferred: true,
      cross_tenant_access_tenant_boundary_bypass_deferred: true,
      hr_ai_final_judgment_allowed: false,
      sensitive_hr_guard_required: true,
      real_employee_candidate_payroll_document_data_allowed: false,
    },
    requirement_refs: [
      "HRX-CORE-001",
      "HRX-CORE-002",
      "HRX-CORE-003",
      "HRX-GATE-001",
      "HRX-GATE-002",
      "HRX-GATE-003",
      "HRX-GATE-004",
      "HRX-GATE-005",
      "HRX-GATE-006",
    ],
    hermes_packet: createHrxCp961HermesEvidencePacket(),
    claude_packet: createHrxCp961ClaudeReviewPacket(),
    closeout_handoff: createHrxCp961CloseoutHandoff(),
    required_capabilities: HRX_CP961_REQUIREMENTS.required_capabilities,
    safety_gates: HRX_CP961_REQUIREMENTS.safety_gates,
    no_leak_guards: HRX_CP961_REQUIREMENTS.required_no_leak_guards,
    blocked_claims: HRX_BLOCKED_CLAIMS,
    ...HRX_NO_WRITE_ATTESTATION,
  });
}

export function createHrxCp962CrossTenantAccessStorageDecisionGapBridgeCaseSet() {
  const sections = {};
  for (const [microId, titles] of Object.entries(HRX_CP962_REQUIRED_SECTION_ROWS)) {
    sections[microId] = deepFreeze({
      micro_phase_id: microId,
      row_count: titles.length,
      rows: createHrxDomainRows(microId, titles),
    });
  }
  return deepFreeze({
    pack_id: HRX_CP962_PACK_BINDING.pack_id,
    section_count: Object.keys(sections).length,
    row_count: Object.values(sections).reduce((sum, section) => sum + section.row_count, 0),
    sections,
  });
}

export function createHrxCp962HermesEvidencePacket() {
  return deepFreeze({
    gate: HRX_CP962_PACK_BINDING.hermes_gate,
    pack_id: HRX_CP962_PACK_BINDING.pack_id,
    evidence_kind: "hrx_cross_tenant_access_storage_decision_gap_p07_bridge",
    emits_runtime_receipt: false,
    deterministic_only: true,
    validation_commands: ["npm run rp30:hrx:validate", "npm run rp30:validate", "npm run hrx:requirements:validate", "npm run hrx:weighted:validate"],
    boundary_assertions: [
      "cross_tenant_access_p07_tail_descriptor",
      "cross_tenant_access_runtime_deferred",
      "cross_tenant_access_record_writes_deferred",
      "cross_tenant_access_real_tenant_data_excluded",
      "cross_tenant_access_policy_runtime_deferred",
      "cross_tenant_access_decision_emission_deferred",
      "cross_tenant_access_boundary_bypass_deferred",
      "storage_decision_gap_p07_foundation_descriptor",
      "storage_decision_gap_runtime_deferred",
      "storage_decision_gap_record_writes_deferred",
      "storage_decision_gap_real_storage_data_excluded",
      "storage_decision_gap_policy_runtime_deferred",
      "storage_decision_gap_decision_emission_deferred",
      "storage_decision_gap_gap_resolution_runtime_deferred",
      "credentials_and_secrets_excluded",
    ],
  });
}

export function createHrxCp962ClaudeReviewPacket() {
  return deepFreeze({
    gate: HRX_CP962_PACK_BINDING.claude_gate,
    pack_id: HRX_CP962_PACK_BINDING.pack_id,
    read_only: true,
    promotes_claude_to_final_approval: false,
    review_questions: [
      "Do CrossTenantAccess tail rows remain descriptor-only without cross-tenant runtime, access decisions, policy execution, tenant-boundary bypass, record writes, real tenant data, or permission bypass?",
      "Do StorageDecisionGap foundation rows remain descriptor-only without storage decision runtime, gap-resolution runtime, policy execution, decision emission, record writes, real storage data, or permission bypass?",
      "Does CP962 keep credentials, secrets, runtime receipts, enterprise trust, and separate HRX product claims closed?",
    ],
  });
}

export function createHrxCp962CloseoutHandoff() {
  return deepFreeze({
    from_pack_id: HRX_CP962_PACK_BINDING.pack_id,
    to_pack_id: HRX_CP962_PACK_BINDING.next_pack_id,
    next_subphase_id: HRX_CP962_PACK_BINDING.next_subphase_id,
    handoff_contract: "Continue RP30 P07 StorageDecisionGap tail descriptors while keeping storage decision runtime, gap-resolution runtime, policy execution, decision emission, record writes, real HR/tenant/storage data, credentials, secrets, and separate-product claims closed.",
  });
}

export function createHrxCp962CrossTenantAccessStorageDecisionGapBridgeDescriptor() {
  const caseSet = createHrxCp962CrossTenantAccessStorageDecisionGapBridgeCaseSet();
  return deepFreeze({
    descriptor: "HrxCp962CrossTenantAccessStorageDecisionGapBridgeDescriptor",
    source_descriptor: "HrxCp961AiScoringCrossTenantAccessBridgeDescriptor",
    pack_id: HRX_CP962_PACK_BINDING.pack_id,
    planned_pack_id: HRX_CP962_PACK_BINDING.planned_pack_id,
    range: HRX_CP962_PACK_BINDING.range,
    program_contract: HRX_PROGRAM_CONTRACT,
    authority_boundary: {
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: HRX_CP962_PACK_BINDING.next_pack_id,
    },
    hrx_cross_tenant_access_storage_decision_gap_p07_bridge_case_set: caseSet,
    domain_entities: {
      CrossTenantAccess: deepFreeze({
        descriptor_only: true,
        cross_tenant_access_runtime_opened: false,
        cross_tenant_access_record_write_opened: false,
        cross_tenant_access_real_data_allowed: false,
        cross_tenant_access_bypass_allowed: false,
        cross_tenant_access_policy_runtime_opened: false,
        cross_tenant_access_decision_emitted: false,
        cross_tenant_access_cross_tenant_runtime_opened: false,
        cross_tenant_access_tenant_boundary_bypass_allowed: false,
      }),
      StorageDecisionGap: deepFreeze({
        descriptor_only: true,
        storage_decision_gap_runtime_opened: false,
        storage_decision_gap_record_write_opened: false,
        storage_decision_gap_real_data_allowed: false,
        storage_decision_gap_bypass_allowed: false,
        storage_decision_gap_policy_runtime_opened: false,
        storage_decision_gap_decision_emitted: false,
        storage_decision_gap_storage_runtime_opened: false,
        storage_decision_gap_gap_resolution_runtime_opened: false,
      }),
    },
    baseline_decisions: {
      hrx_embedded_inside_law_firm_os: true,
      separate_hrx_product_created: false,
      cross_tenant_access_p07_tail_descriptor_only: true,
      cross_tenant_access_runtime_deferred: true,
      cross_tenant_access_record_writes_deferred: true,
      cross_tenant_access_real_tenant_data_deferred: true,
      cross_tenant_access_bypass_deferred: true,
      cross_tenant_access_policy_runtime_deferred: true,
      cross_tenant_access_decision_emission_deferred: true,
      cross_tenant_access_cross_tenant_runtime_deferred: true,
      cross_tenant_access_tenant_boundary_bypass_deferred: true,
      storage_decision_gap_p07_foundation_descriptor_only: true,
      storage_decision_gap_runtime_deferred: true,
      storage_decision_gap_record_writes_deferred: true,
      storage_decision_gap_real_storage_data_deferred: true,
      storage_decision_gap_bypass_deferred: true,
      storage_decision_gap_policy_runtime_deferred: true,
      storage_decision_gap_decision_emission_deferred: true,
      storage_decision_gap_storage_runtime_deferred: true,
      storage_decision_gap_gap_resolution_runtime_deferred: true,
      hr_ai_final_judgment_allowed: false,
      sensitive_hr_guard_required: true,
      real_employee_candidate_payroll_document_data_allowed: false,
    },
    requirement_refs: [
      "HRX-CORE-001",
      "HRX-CORE-002",
      "HRX-CORE-003",
      "HRX-GATE-001",
      "HRX-GATE-002",
      "HRX-GATE-003",
      "HRX-GATE-004",
      "HRX-GATE-005",
      "HRX-GATE-006",
    ],
    hermes_packet: createHrxCp962HermesEvidencePacket(),
    claude_packet: createHrxCp962ClaudeReviewPacket(),
    closeout_handoff: createHrxCp962CloseoutHandoff(),
    required_capabilities: HRX_CP962_REQUIREMENTS.required_capabilities,
    safety_gates: HRX_CP962_REQUIREMENTS.safety_gates,
    no_leak_guards: HRX_CP962_REQUIREMENTS.required_no_leak_guards,
    blocked_claims: HRX_BLOCKED_CLAIMS,
    ...HRX_NO_WRITE_ATTESTATION,
  });
}

export function createHrxCp963StorageDecisionGapMidCaseSet() {
  const sections = {};
  for (const [microId, titles] of Object.entries(HRX_CP963_REQUIRED_SECTION_ROWS)) {
    sections[microId] = deepFreeze({
      micro_phase_id: microId,
      row_count: titles.length,
      rows: createHrxDomainRows(microId, titles),
    });
  }
  return deepFreeze({
    pack_id: HRX_CP963_PACK_BINDING.pack_id,
    section_count: Object.keys(sections).length,
    row_count: Object.values(sections).reduce((sum, section) => sum + section.row_count, 0),
    sections,
  });
}

export function createHrxCp963HermesEvidencePacket() {
  return deepFreeze({
    gate: HRX_CP963_PACK_BINDING.hermes_gate,
    pack_id: HRX_CP963_PACK_BINDING.pack_id,
    evidence_kind: "hrx_storage_decision_gap_p07_mid",
    emits_runtime_receipt: false,
    deterministic_only: true,
    validation_commands: ["npm run rp30:hrx:validate", "npm run rp30:validate", "npm run hrx:requirements:validate", "npm run hrx:weighted:validate"],
    boundary_assertions: [
      "storage_decision_gap_p07_mid_descriptor",
      "storage_decision_gap_runtime_deferred",
      "storage_decision_gap_record_writes_deferred",
      "storage_decision_gap_real_storage_data_excluded",
      "storage_decision_gap_policy_runtime_deferred",
      "storage_decision_gap_decision_emission_deferred",
      "storage_decision_gap_storage_runtime_deferred",
      "storage_decision_gap_gap_resolution_runtime_deferred",
      "credentials_and_secrets_excluded",
    ],
  });
}

export function createHrxCp963ClaudeReviewPacket() {
  return deepFreeze({
    gate: HRX_CP963_PACK_BINDING.claude_gate,
    pack_id: HRX_CP963_PACK_BINDING.pack_id,
    read_only: true,
    promotes_claude_to_final_approval: false,
    review_questions: [
      "Do StorageDecisionGap mid rows remain descriptor-only without storage decision runtime, storage runtime, gap-resolution runtime, policy execution, decision emission, record writes, real storage data, or permission bypass?",
      "Does CP963 keep credentials, secrets, runtime receipts, enterprise trust, and separate HRX product claims closed?",
    ],
  });
}

export function createHrxCp963CloseoutHandoff() {
  return deepFreeze({
    from_pack_id: HRX_CP963_PACK_BINDING.pack_id,
    to_pack_id: HRX_CP963_PACK_BINDING.next_pack_id,
    next_subphase_id: HRX_CP963_PACK_BINDING.next_subphase_id,
    handoff_contract: "Continue RP30 P07 StorageDecisionGap tail and Recovery foundation descriptors while keeping storage decision runtime, recovery runtime, policy execution, decision emission, record writes, real HR/storage/recovery data, credentials, secrets, and separate-product claims closed.",
  });
}

export function createHrxCp963StorageDecisionGapMidDescriptor() {
  const caseSet = createHrxCp963StorageDecisionGapMidCaseSet();
  return deepFreeze({
    descriptor: "HrxCp963StorageDecisionGapMidDescriptor",
    source_descriptor: "HrxCp962CrossTenantAccessStorageDecisionGapBridgeDescriptor",
    pack_id: HRX_CP963_PACK_BINDING.pack_id,
    planned_pack_id: HRX_CP963_PACK_BINDING.planned_pack_id,
    range: HRX_CP963_PACK_BINDING.range,
    program_contract: HRX_PROGRAM_CONTRACT,
    authority_boundary: {
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: HRX_CP963_PACK_BINDING.next_pack_id,
    },
    hrx_storage_decision_gap_p07_mid_case_set: caseSet,
    domain_entities: {
      StorageDecisionGap: deepFreeze({
        descriptor_only: true,
        storage_decision_gap_runtime_opened: false,
        storage_decision_gap_record_write_opened: false,
        storage_decision_gap_real_data_allowed: false,
        storage_decision_gap_bypass_allowed: false,
        storage_decision_gap_policy_runtime_opened: false,
        storage_decision_gap_decision_emitted: false,
        storage_decision_gap_storage_runtime_opened: false,
        storage_decision_gap_gap_resolution_runtime_opened: false,
      }),
    },
    baseline_decisions: {
      hrx_embedded_inside_law_firm_os: true,
      separate_hrx_product_created: false,
      storage_decision_gap_p07_mid_descriptor_only: true,
      storage_decision_gap_runtime_deferred: true,
      storage_decision_gap_record_writes_deferred: true,
      storage_decision_gap_real_storage_data_deferred: true,
      storage_decision_gap_bypass_deferred: true,
      storage_decision_gap_policy_runtime_deferred: true,
      storage_decision_gap_decision_emission_deferred: true,
      storage_decision_gap_storage_runtime_deferred: true,
      storage_decision_gap_gap_resolution_runtime_deferred: true,
      hr_ai_final_judgment_allowed: false,
      sensitive_hr_guard_required: true,
      real_employee_candidate_payroll_document_data_allowed: false,
    },
    requirement_refs: [
      "HRX-CORE-001",
      "HRX-CORE-002",
      "HRX-CORE-003",
      "HRX-GATE-001",
      "HRX-GATE-002",
      "HRX-GATE-003",
      "HRX-GATE-004",
      "HRX-GATE-005",
      "HRX-GATE-006",
    ],
    hermes_packet: createHrxCp963HermesEvidencePacket(),
    claude_packet: createHrxCp963ClaudeReviewPacket(),
    closeout_handoff: createHrxCp963CloseoutHandoff(),
    required_capabilities: HRX_CP963_REQUIREMENTS.required_capabilities,
    safety_gates: HRX_CP963_REQUIREMENTS.safety_gates,
    no_leak_guards: HRX_CP963_REQUIREMENTS.required_no_leak_guards,
    blocked_claims: HRX_BLOCKED_CLAIMS,
    ...HRX_NO_WRITE_ATTESTATION,
  });
}

export function createHrxCp964StorageDecisionGapRecoveryBridgeCaseSet() {
  const sections = {};
  for (const [microId, titles] of Object.entries(HRX_CP964_REQUIRED_SECTION_ROWS)) {
    sections[microId] = deepFreeze({
      micro_phase_id: microId,
      row_count: titles.length,
      rows: createHrxDomainRows(microId, titles),
    });
  }
  return deepFreeze({
    pack_id: HRX_CP964_PACK_BINDING.pack_id,
    section_count: Object.keys(sections).length,
    row_count: Object.values(sections).reduce((sum, section) => sum + section.row_count, 0),
    sections,
  });
}

export function createHrxCp964HermesEvidencePacket() {
  return deepFreeze({
    gate: HRX_CP964_PACK_BINDING.hermes_gate,
    pack_id: HRX_CP964_PACK_BINDING.pack_id,
    evidence_kind: "hrx_storage_decision_gap_recovery_p07_bridge",
    emits_runtime_receipt: false,
    deterministic_only: true,
    validation_commands: ["npm run rp30:hrx:validate", "npm run rp30:validate", "npm run hrx:requirements:validate", "npm run hrx:weighted:validate"],
    boundary_assertions: [
      "storage_decision_gap_p07_tail_descriptor",
      "storage_decision_gap_runtime_deferred",
      "storage_decision_gap_record_writes_deferred",
      "storage_decision_gap_real_storage_data_excluded",
      "storage_decision_gap_gap_resolution_runtime_deferred",
      "recovery_p07_foundation_descriptor",
      "recovery_runtime_deferred",
      "recovery_record_writes_deferred",
      "recovery_real_recovery_data_excluded",
      "recovery_policy_runtime_deferred",
      "recovery_decision_emission_deferred",
      "recovery_replay_runtime_deferred",
      "recovery_auto_remediation_runtime_deferred",
      "credentials_and_secrets_excluded",
    ],
  });
}

export function createHrxCp964ClaudeReviewPacket() {
  return deepFreeze({
    gate: HRX_CP964_PACK_BINDING.claude_gate,
    pack_id: HRX_CP964_PACK_BINDING.pack_id,
    read_only: true,
    promotes_claude_to_final_approval: false,
    review_questions: [
      "Do StorageDecisionGap tail rows remain descriptor-only without storage decision runtime, gap-resolution runtime, policy execution, decision emission, record writes, real storage data, or permission bypass?",
      "Do Recovery foundation rows remain descriptor-only without recovery runtime, replay runtime, auto-remediation runtime, policy execution, decision emission, record writes, real recovery data, or permission bypass?",
      "Does CP964 keep credentials, secrets, runtime receipts, enterprise trust, and separate HRX product claims closed?",
    ],
  });
}

export function createHrxCp964CloseoutHandoff() {
  return deepFreeze({
    from_pack_id: HRX_CP964_PACK_BINDING.pack_id,
    to_pack_id: HRX_CP964_PACK_BINDING.next_pack_id,
    next_subphase_id: HRX_CP964_PACK_BINDING.next_subphase_id,
    handoff_contract: "Continue RP30 P07 Recovery tail and MissingUserLink foundation descriptors while keeping recovery runtime, replay runtime, remediation runtime, missing-user-link runtime, policy execution, decision emission, record writes, real HR/recovery/user-link data, credentials, secrets, and separate-product claims closed.",
  });
}

export function createHrxCp964StorageDecisionGapRecoveryBridgeDescriptor() {
  const caseSet = createHrxCp964StorageDecisionGapRecoveryBridgeCaseSet();
  return deepFreeze({
    descriptor: "HrxCp964StorageDecisionGapRecoveryBridgeDescriptor",
    source_descriptor: "HrxCp963StorageDecisionGapMidDescriptor",
    pack_id: HRX_CP964_PACK_BINDING.pack_id,
    planned_pack_id: HRX_CP964_PACK_BINDING.planned_pack_id,
    range: HRX_CP964_PACK_BINDING.range,
    program_contract: HRX_PROGRAM_CONTRACT,
    authority_boundary: {
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: HRX_CP964_PACK_BINDING.next_pack_id,
    },
    hrx_storage_decision_gap_recovery_p07_bridge_case_set: caseSet,
    domain_entities: {
      StorageDecisionGap: deepFreeze({
        descriptor_only: true,
        storage_decision_gap_runtime_opened: false,
        storage_decision_gap_record_write_opened: false,
        storage_decision_gap_real_data_allowed: false,
        storage_decision_gap_bypass_allowed: false,
        storage_decision_gap_policy_runtime_opened: false,
        storage_decision_gap_decision_emitted: false,
        storage_decision_gap_storage_runtime_opened: false,
        storage_decision_gap_gap_resolution_runtime_opened: false,
      }),
      Recovery: deepFreeze({
        descriptor_only: true,
        recovery_runtime_opened: false,
        recovery_record_write_opened: false,
        recovery_real_data_allowed: false,
        recovery_bypass_allowed: false,
        recovery_policy_runtime_opened: false,
        recovery_decision_emitted: false,
        recovery_replay_runtime_opened: false,
        recovery_auto_remediation_runtime_opened: false,
      }),
    },
    baseline_decisions: {
      hrx_embedded_inside_law_firm_os: true,
      separate_hrx_product_created: false,
      storage_decision_gap_p07_tail_descriptor_only: true,
      storage_decision_gap_runtime_deferred: true,
      storage_decision_gap_record_writes_deferred: true,
      storage_decision_gap_real_storage_data_deferred: true,
      storage_decision_gap_bypass_deferred: true,
      storage_decision_gap_policy_runtime_deferred: true,
      storage_decision_gap_decision_emission_deferred: true,
      storage_decision_gap_storage_runtime_deferred: true,
      storage_decision_gap_gap_resolution_runtime_deferred: true,
      recovery_p07_foundation_descriptor_only: true,
      recovery_runtime_deferred: true,
      recovery_record_writes_deferred: true,
      recovery_real_recovery_data_deferred: true,
      recovery_bypass_deferred: true,
      recovery_policy_runtime_deferred: true,
      recovery_decision_emission_deferred: true,
      recovery_replay_runtime_deferred: true,
      recovery_auto_remediation_runtime_deferred: true,
      hr_ai_final_judgment_allowed: false,
      sensitive_hr_guard_required: true,
      real_employee_candidate_payroll_document_data_allowed: false,
    },
    requirement_refs: [
      "HRX-CORE-001",
      "HRX-CORE-002",
      "HRX-CORE-003",
      "HRX-GATE-001",
      "HRX-GATE-002",
      "HRX-GATE-003",
      "HRX-GATE-004",
      "HRX-GATE-005",
      "HRX-GATE-006",
    ],
    hermes_packet: createHrxCp964HermesEvidencePacket(),
    claude_packet: createHrxCp964ClaudeReviewPacket(),
    closeout_handoff: createHrxCp964CloseoutHandoff(),
    required_capabilities: HRX_CP964_REQUIREMENTS.required_capabilities,
    safety_gates: HRX_CP964_REQUIREMENTS.safety_gates,
    no_leak_guards: HRX_CP964_REQUIREMENTS.required_no_leak_guards,
    blocked_claims: HRX_BLOCKED_CLAIMS,
    ...HRX_NO_WRITE_ATTESTATION,
  });
}

export function createHrxCp965RecoveryMissingUserLinkBridgeCaseSet() {
  const sections = {};
  for (const [microId, titles] of Object.entries(HRX_CP965_REQUIRED_SECTION_ROWS)) {
    sections[microId] = deepFreeze({
      micro_phase_id: microId,
      row_count: titles.length,
      rows: createHrxDomainRows(microId, titles),
    });
  }
  return deepFreeze({
    pack_id: HRX_CP965_PACK_BINDING.pack_id,
    section_count: Object.keys(sections).length,
    row_count: Object.values(sections).reduce((sum, section) => sum + section.row_count, 0),
    sections,
  });
}

export function createHrxCp965HermesEvidencePacket() {
  return deepFreeze({
    gate: HRX_CP965_PACK_BINDING.hermes_gate,
    pack_id: HRX_CP965_PACK_BINDING.pack_id,
    evidence_kind: "hrx_recovery_missing_user_link_p07_bridge",
    emits_runtime_receipt: false,
    deterministic_only: true,
    validation_commands: ["npm run rp30:hrx:validate", "npm run rp30:validate", "npm run hrx:requirements:validate", "npm run hrx:weighted:validate"],
    boundary_assertions: [
      "recovery_p07_tail_descriptor",
      "recovery_runtime_deferred",
      "recovery_record_writes_deferred",
      "recovery_real_recovery_data_excluded",
      "recovery_replay_runtime_deferred",
      "recovery_auto_remediation_runtime_deferred",
      "missing_user_link_p07_foundation_descriptor",
      "missing_user_link_runtime_deferred",
      "missing_user_link_record_writes_deferred",
      "missing_user_link_real_user_data_excluded",
      "missing_user_link_policy_runtime_deferred",
      "missing_user_link_decision_emission_deferred",
      "missing_user_link_user_employee_link_runtime_deferred",
      "credentials_and_secrets_excluded",
    ],
  });
}

export function createHrxCp965ClaudeReviewPacket() {
  return deepFreeze({
    gate: HRX_CP965_PACK_BINDING.claude_gate,
    pack_id: HRX_CP965_PACK_BINDING.pack_id,
    read_only: true,
    promotes_claude_to_final_approval: false,
    review_questions: [
      "Do Recovery tail rows remain descriptor-only without recovery runtime, replay runtime, auto-remediation runtime, policy execution, decision emission, record writes, real recovery data, or permission bypass?",
      "Do MissingUserLink foundation rows remain descriptor-only without missing-user-link runtime, user-employee link runtime, policy execution, decision emission, record writes, real user data, or permission bypass?",
      "Does CP965 keep credentials, secrets, runtime receipts, enterprise trust, and separate HRX product claims closed?",
    ],
  });
}

export function createHrxCp965CloseoutHandoff() {
  return deepFreeze({
    from_pack_id: HRX_CP965_PACK_BINDING.pack_id,
    to_pack_id: HRX_CP965_PACK_BINDING.next_pack_id,
    next_subphase_id: HRX_CP965_PACK_BINDING.next_subphase_id,
    handoff_contract: "Continue RP30 P07 MissingUserLink tail and PayrollRuntimeAttempt foundation descriptors while keeping missing-user-link runtime, user-employee link runtime, payroll runtime, calculation runtime, policy execution, decision emission, record writes, real HR/user/payroll data, credentials, secrets, and separate-product claims closed.",
  });
}

export function createHrxCp965RecoveryMissingUserLinkBridgeDescriptor() {
  const caseSet = createHrxCp965RecoveryMissingUserLinkBridgeCaseSet();
  return deepFreeze({
    descriptor: "HrxCp965RecoveryMissingUserLinkBridgeDescriptor",
    source_descriptor: "HrxCp964StorageDecisionGapRecoveryBridgeDescriptor",
    pack_id: HRX_CP965_PACK_BINDING.pack_id,
    planned_pack_id: HRX_CP965_PACK_BINDING.planned_pack_id,
    range: HRX_CP965_PACK_BINDING.range,
    program_contract: HRX_PROGRAM_CONTRACT,
    authority_boundary: {
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: HRX_CP965_PACK_BINDING.next_pack_id,
    },
    hrx_recovery_missing_user_link_p07_bridge_case_set: caseSet,
    domain_entities: {
      Recovery: deepFreeze({
        descriptor_only: true,
        recovery_runtime_opened: false,
        recovery_record_write_opened: false,
        recovery_real_data_allowed: false,
        recovery_bypass_allowed: false,
        recovery_policy_runtime_opened: false,
        recovery_decision_emitted: false,
        recovery_replay_runtime_opened: false,
        recovery_auto_remediation_runtime_opened: false,
      }),
      MissingUserLink: deepFreeze({
        descriptor_only: true,
        missing_user_link_runtime_opened: false,
        missing_user_link_record_write_opened: false,
        missing_user_link_real_data_allowed: false,
        missing_user_link_bypass_allowed: false,
        missing_user_link_policy_runtime_opened: false,
        missing_user_link_decision_emitted: false,
        missing_user_link_user_employee_link_runtime_opened: false,
      }),
    },
    baseline_decisions: {
      hrx_embedded_inside_law_firm_os: true,
      separate_hrx_product_created: false,
      recovery_p07_tail_descriptor_only: true,
      recovery_runtime_deferred: true,
      recovery_record_writes_deferred: true,
      recovery_real_recovery_data_deferred: true,
      recovery_bypass_deferred: true,
      recovery_policy_runtime_deferred: true,
      recovery_decision_emission_deferred: true,
      recovery_replay_runtime_deferred: true,
      recovery_auto_remediation_runtime_deferred: true,
      missing_user_link_p07_foundation_descriptor_only: true,
      missing_user_link_runtime_deferred: true,
      missing_user_link_record_writes_deferred: true,
      missing_user_link_real_user_data_deferred: true,
      missing_user_link_bypass_deferred: true,
      missing_user_link_policy_runtime_deferred: true,
      missing_user_link_decision_emission_deferred: true,
      missing_user_link_user_employee_link_runtime_deferred: true,
      hr_ai_final_judgment_allowed: false,
      sensitive_hr_guard_required: true,
      real_employee_candidate_payroll_document_data_allowed: false,
    },
    requirement_refs: [
      "HRX-CORE-001",
      "HRX-CORE-002",
      "HRX-CORE-003",
      "HRX-GATE-001",
      "HRX-GATE-002",
      "HRX-GATE-003",
      "HRX-GATE-004",
      "HRX-GATE-005",
      "HRX-GATE-006",
    ],
    hermes_packet: createHrxCp965HermesEvidencePacket(),
    claude_packet: createHrxCp965ClaudeReviewPacket(),
    closeout_handoff: createHrxCp965CloseoutHandoff(),
    required_capabilities: HRX_CP965_REQUIREMENTS.required_capabilities,
    safety_gates: HRX_CP965_REQUIREMENTS.safety_gates,
    no_leak_guards: HRX_CP965_REQUIREMENTS.required_no_leak_guards,
    blocked_claims: HRX_BLOCKED_CLAIMS,
    ...HRX_NO_WRITE_ATTESTATION,
  });
}

export function createHrxCp966MissingUserLinkPayrollRuntimeAttemptBridgeCaseSet() {
  const sections = {};
  for (const [microId, titles] of Object.entries(HRX_CP966_REQUIRED_SECTION_ROWS)) {
    sections[microId] = deepFreeze({
      micro_phase_id: microId,
      row_count: titles.length,
      rows: createHrxDomainRows(microId, titles),
    });
  }
  return deepFreeze({
    pack_id: HRX_CP966_PACK_BINDING.pack_id,
    section_count: Object.keys(sections).length,
    row_count: Object.values(sections).reduce((sum, section) => sum + section.row_count, 0),
    sections,
  });
}

export function createHrxCp966HermesEvidencePacket() {
  return deepFreeze({
    gate: HRX_CP966_PACK_BINDING.hermes_gate,
    pack_id: HRX_CP966_PACK_BINDING.pack_id,
    evidence_kind: "hrx_missing_user_link_payroll_runtime_attempt_p07_bridge",
    emits_runtime_receipt: false,
    deterministic_only: true,
    validation_commands: ["npm run rp30:hrx:validate", "npm run rp30:validate", "npm run hrx:requirements:validate", "npm run hrx:weighted:validate"],
    boundary_assertions: [
      "missing_user_link_p07_tail_descriptor",
      "missing_user_link_runtime_deferred",
      "missing_user_link_record_writes_deferred",
      "missing_user_link_real_user_data_excluded",
      "missing_user_link_user_employee_link_runtime_deferred",
      "payroll_runtime_attempt_p07_foundation_descriptor",
      "payroll_runtime_attempt_runtime_deferred",
      "payroll_runtime_attempt_record_writes_deferred",
      "payroll_runtime_attempt_real_payroll_data_excluded",
      "payroll_runtime_attempt_policy_runtime_deferred",
      "payroll_runtime_attempt_decision_emission_deferred",
      "payroll_runtime_attempt_calculation_runtime_deferred",
      "credentials_and_secrets_excluded",
    ],
  });
}

export function createHrxCp966ClaudeReviewPacket() {
  return deepFreeze({
    gate: HRX_CP966_PACK_BINDING.claude_gate,
    pack_id: HRX_CP966_PACK_BINDING.pack_id,
    read_only: true,
    promotes_claude_to_final_approval: false,
    review_questions: [
      "Do MissingUserLink tail rows remain descriptor-only without missing-user-link runtime, user-employee link runtime, policy execution, decision emission, record writes, real user data, or permission bypass?",
      "Do PayrollRuntimeAttempt foundation rows remain descriptor-only without payroll runtime, calculation runtime, policy execution, decision emission, record writes, real payroll data, or permission bypass?",
      "Does CP966 keep credentials, secrets, runtime receipts, enterprise trust, and separate HRX product claims closed?",
    ],
  });
}

export function createHrxCp966CloseoutHandoff() {
  return deepFreeze({
    from_pack_id: HRX_CP966_PACK_BINDING.pack_id,
    to_pack_id: HRX_CP966_PACK_BINDING.next_pack_id,
    next_subphase_id: HRX_CP966_PACK_BINDING.next_subphase_id,
    handoff_contract: "Continue RP30 P07 PayrollRuntimeAttempt tail and AIScoringAttempt foundation descriptors while keeping payroll runtime, calculation runtime, AI scoring runtime, score runtime, policy execution, decision emission, record writes, real HR/payroll/evaluation data, credentials, secrets, and separate-product claims closed.",
  });
}

export function createHrxCp966MissingUserLinkPayrollRuntimeAttemptBridgeDescriptor() {
  const caseSet = createHrxCp966MissingUserLinkPayrollRuntimeAttemptBridgeCaseSet();
  return deepFreeze({
    descriptor: "HrxCp966MissingUserLinkPayrollRuntimeAttemptBridgeDescriptor",
    source_descriptor: "HrxCp965RecoveryMissingUserLinkBridgeDescriptor",
    pack_id: HRX_CP966_PACK_BINDING.pack_id,
    planned_pack_id: HRX_CP966_PACK_BINDING.planned_pack_id,
    range: HRX_CP966_PACK_BINDING.range,
    program_contract: HRX_PROGRAM_CONTRACT,
    authority_boundary: {
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: HRX_CP966_PACK_BINDING.next_pack_id,
    },
    hrx_missing_user_link_payroll_runtime_attempt_p07_bridge_case_set: caseSet,
    domain_entities: {
      MissingUserLink: deepFreeze({
        descriptor_only: true,
        missing_user_link_runtime_opened: false,
        missing_user_link_record_write_opened: false,
        missing_user_link_real_data_allowed: false,
        missing_user_link_bypass_allowed: false,
        missing_user_link_policy_runtime_opened: false,
        missing_user_link_decision_emitted: false,
        missing_user_link_user_employee_link_runtime_opened: false,
      }),
      PayrollRuntimeAttempt: deepFreeze({
        descriptor_only: true,
        payroll_runtime_attempt_runtime_opened: false,
        payroll_runtime_attempt_record_write_opened: false,
        payroll_runtime_attempt_real_data_allowed: false,
        payroll_runtime_attempt_bypass_allowed: false,
        payroll_runtime_attempt_policy_runtime_opened: false,
        payroll_runtime_attempt_decision_emitted: false,
        payroll_runtime_attempt_calculation_runtime_opened: false,
      }),
    },
    baseline_decisions: {
      hrx_embedded_inside_law_firm_os: true,
      separate_hrx_product_created: false,
      missing_user_link_p07_tail_descriptor_only: true,
      missing_user_link_runtime_deferred: true,
      missing_user_link_record_writes_deferred: true,
      missing_user_link_real_user_data_deferred: true,
      missing_user_link_bypass_deferred: true,
      missing_user_link_policy_runtime_deferred: true,
      missing_user_link_decision_emission_deferred: true,
      missing_user_link_user_employee_link_runtime_deferred: true,
      payroll_runtime_attempt_p07_foundation_descriptor_only: true,
      payroll_runtime_attempt_runtime_deferred: true,
      payroll_runtime_attempt_record_writes_deferred: true,
      payroll_runtime_attempt_real_payroll_data_deferred: true,
      payroll_runtime_attempt_bypass_deferred: true,
      payroll_runtime_attempt_policy_runtime_deferred: true,
      payroll_runtime_attempt_decision_emission_deferred: true,
      payroll_runtime_attempt_calculation_runtime_deferred: true,
      payroll_calculation_runtime_deferred: true,
      hr_ai_final_judgment_allowed: false,
      sensitive_hr_guard_required: true,
      real_employee_candidate_payroll_document_data_allowed: false,
    },
    requirement_refs: [
      "HRX-CORE-001",
      "HRX-CORE-002",
      "HRX-CORE-003",
      "HRX-GATE-001",
      "HRX-GATE-002",
      "HRX-GATE-003",
      "HRX-GATE-004",
      "HRX-GATE-005",
      "HRX-GATE-006",
    ],
    hermes_packet: createHrxCp966HermesEvidencePacket(),
    claude_packet: createHrxCp966ClaudeReviewPacket(),
    closeout_handoff: createHrxCp966CloseoutHandoff(),
    required_capabilities: HRX_CP966_REQUIREMENTS.required_capabilities,
    safety_gates: HRX_CP966_REQUIREMENTS.safety_gates,
    no_leak_guards: HRX_CP966_REQUIREMENTS.required_no_leak_guards,
    blocked_claims: HRX_BLOCKED_CLAIMS,
    ...HRX_NO_WRITE_ATTESTATION,
  });
}

export function createHrxCp967PayrollRuntimeAttemptAiScoringBridgeCaseSet() {
  const sections = {};
  for (const [microId, titles] of Object.entries(HRX_CP967_REQUIRED_SECTION_ROWS)) {
    sections[microId] = deepFreeze({
      micro_phase_id: microId,
      row_count: titles.length,
      rows: createHrxDomainRows(microId, titles),
    });
  }
  return deepFreeze({
    pack_id: HRX_CP967_PACK_BINDING.pack_id,
    section_count: Object.keys(sections).length,
    row_count: Object.values(sections).reduce((sum, section) => sum + section.row_count, 0),
    sections,
  });
}

export function createHrxCp967HermesEvidencePacket() {
  return deepFreeze({
    gate: HRX_CP967_PACK_BINDING.hermes_gate,
    pack_id: HRX_CP967_PACK_BINDING.pack_id,
    evidence_kind: "hrx_payroll_runtime_attempt_ai_scoring_p07_tail_bridge",
    emits_runtime_receipt: false,
    deterministic_only: true,
    validation_commands: ["npm run rp30:hrx:validate", "npm run rp30:validate", "npm run hrx:requirements:validate", "npm run hrx:weighted:validate"],
    boundary_assertions: [
      "payroll_runtime_attempt_p07_tail_descriptor",
      "payroll_runtime_attempt_runtime_deferred",
      "payroll_runtime_attempt_calculation_runtime_deferred",
      "ai_scoring_attempt_p07_foundation_descriptor",
      "ai_scoring_attempt_runtime_deferred",
      "ai_scoring_attempt_record_writes_deferred",
      "ai_scoring_attempt_real_evaluation_data_excluded",
      "ai_scoring_attempt_policy_runtime_deferred",
      "ai_scoring_attempt_decision_emission_deferred",
      "ai_scoring_attempt_score_runtime_deferred",
      "credentials_and_secrets_excluded",
    ],
  });
}

export function createHrxCp967ClaudeReviewPacket() {
  return deepFreeze({
    gate: HRX_CP967_PACK_BINDING.claude_gate,
    pack_id: HRX_CP967_PACK_BINDING.pack_id,
    read_only: true,
    promotes_claude_to_final_approval: false,
    review_questions: [
      "Do PayrollRuntimeAttempt tail rows remain descriptor-only without payroll runtime, record writes, real payroll data, calculation runtime, policy execution, decision emission, or permission bypass?",
      "Do AIScoringAttempt foundation rows remain descriptor-only without AI scoring runtime, score runtime, policy execution, final judgment, record writes, real evaluation data, or permission bypass?",
      "Does CP967 keep credentials, secrets, runtime receipts, enterprise trust, and separate HRX product claims closed?",
    ],
  });
}

export function createHrxCp967CloseoutHandoff() {
  return deepFreeze({
    from_pack_id: HRX_CP967_PACK_BINDING.pack_id,
    to_pack_id: HRX_CP967_PACK_BINDING.next_pack_id,
    next_subphase_id: HRX_CP967_PACK_BINDING.next_subphase_id,
    handoff_contract: "Continue RP30 P07 AIScoringAttempt tail and CrossTenantAccess foundation descriptors while keeping payroll runtime, AI scoring runtime, score runtime, cross-tenant access runtime, policy execution, decision emission, record writes, real HR/payroll/evaluation/access data, credentials, secrets, and separate-product claims closed.",
  });
}

export function createHrxCp967PayrollRuntimeAttemptAiScoringBridgeDescriptor() {
  const caseSet = createHrxCp967PayrollRuntimeAttemptAiScoringBridgeCaseSet();
  return deepFreeze({
    descriptor: "HrxCp967PayrollRuntimeAttemptAiScoringBridgeDescriptor",
    source_descriptor: "HrxCp966MissingUserLinkPayrollRuntimeAttemptBridgeDescriptor",
    pack_id: HRX_CP967_PACK_BINDING.pack_id,
    planned_pack_id: HRX_CP967_PACK_BINDING.planned_pack_id,
    range: HRX_CP967_PACK_BINDING.range,
    program_contract: HRX_PROGRAM_CONTRACT,
    authority_boundary: {
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: HRX_CP967_PACK_BINDING.next_pack_id,
    },
    hrx_payroll_runtime_attempt_ai_scoring_p07_tail_bridge_case_set: caseSet,
    domain_entities: {
      PayrollRuntimeAttempt: deepFreeze({
        descriptor_only: true,
        payroll_runtime_attempt_runtime_opened: false,
        payroll_runtime_attempt_record_write_opened: false,
        payroll_runtime_attempt_real_data_allowed: false,
        payroll_runtime_attempt_bypass_allowed: false,
        payroll_runtime_attempt_policy_runtime_opened: false,
        payroll_runtime_attempt_decision_emitted: false,
        payroll_runtime_attempt_calculation_runtime_opened: false,
      }),
      AIScoringAttempt: deepFreeze({
        descriptor_only: true,
        ai_scoring_attempt_runtime_opened: false,
        ai_scoring_attempt_record_write_opened: false,
        ai_scoring_attempt_real_data_allowed: false,
        ai_scoring_attempt_bypass_allowed: false,
        ai_scoring_attempt_policy_runtime_opened: false,
        ai_scoring_attempt_decision_emitted: false,
        ai_scoring_attempt_score_runtime_opened: false,
        ai_scoring_attempt_final_judgment_allowed: false,
      }),
    },
    baseline_decisions: {
      hrx_embedded_inside_law_firm_os: true,
      separate_hrx_product_created: false,
      payroll_runtime_attempt_p07_tail_descriptor_only: true,
      payroll_runtime_attempt_runtime_deferred: true,
      payroll_runtime_attempt_record_writes_deferred: true,
      payroll_runtime_attempt_real_payroll_data_deferred: true,
      payroll_runtime_attempt_bypass_deferred: true,
      payroll_runtime_attempt_policy_runtime_deferred: true,
      payroll_runtime_attempt_decision_emission_deferred: true,
      payroll_runtime_attempt_calculation_runtime_deferred: true,
      ai_scoring_attempt_p07_foundation_descriptor_only: true,
      ai_scoring_attempt_runtime_deferred: true,
      ai_scoring_attempt_record_writes_deferred: true,
      ai_scoring_attempt_real_evaluation_data_deferred: true,
      ai_scoring_attempt_bypass_deferred: true,
      ai_scoring_attempt_policy_runtime_deferred: true,
      ai_scoring_attempt_decision_emission_deferred: true,
      ai_scoring_attempt_score_runtime_deferred: true,
      ai_scoring_attempt_final_judgment_deferred: true,
      payroll_calculation_runtime_deferred: true,
      hr_ai_final_judgment_allowed: false,
      sensitive_hr_guard_required: true,
      real_employee_candidate_payroll_document_data_allowed: false,
    },
    requirement_refs: [
      "HRX-CORE-001",
      "HRX-CORE-002",
      "HRX-CORE-003",
      "HRX-GATE-001",
      "HRX-GATE-002",
      "HRX-GATE-003",
      "HRX-GATE-004",
      "HRX-GATE-005",
      "HRX-GATE-006",
    ],
    hermes_packet: createHrxCp967HermesEvidencePacket(),
    claude_packet: createHrxCp967ClaudeReviewPacket(),
    closeout_handoff: createHrxCp967CloseoutHandoff(),
    required_capabilities: HRX_CP967_REQUIREMENTS.required_capabilities,
    safety_gates: HRX_CP967_REQUIREMENTS.safety_gates,
    no_leak_guards: HRX_CP967_REQUIREMENTS.required_no_leak_guards,
    blocked_claims: HRX_BLOCKED_CLAIMS,
    ...HRX_NO_WRITE_ATTESTATION,
  });
}

export function createHrxCp968AiScoringCrossTenantAccessBridgeCaseSet() {
  const sections = {};
  for (const [microId, titles] of Object.entries(HRX_CP968_REQUIRED_SECTION_ROWS)) {
    sections[microId] = deepFreeze({
      micro_phase_id: microId,
      row_count: titles.length,
      rows: createHrxDomainRows(microId, titles),
    });
  }
  return deepFreeze({
    pack_id: HRX_CP968_PACK_BINDING.pack_id,
    section_count: Object.keys(sections).length,
    row_count: Object.values(sections).reduce((sum, section) => sum + section.row_count, 0),
    sections,
  });
}

export function createHrxCp968HermesEvidencePacket() {
  return deepFreeze({
    gate: HRX_CP968_PACK_BINDING.hermes_gate,
    pack_id: HRX_CP968_PACK_BINDING.pack_id,
    evidence_kind: "hrx_ai_scoring_cross_tenant_access_p07_bridge",
    emits_runtime_receipt: false,
    deterministic_only: true,
    validation_commands: ["npm run rp30:hrx:validate", "npm run rp30:validate", "npm run hrx:requirements:validate", "npm run hrx:weighted:validate"],
    boundary_assertions: [
      "ai_scoring_attempt_p07_tail_descriptor",
      "ai_scoring_attempt_runtime_deferred",
      "ai_scoring_attempt_score_runtime_deferred",
      "ai_scoring_attempt_final_judgment_deferred",
      "cross_tenant_access_p07_foundation_descriptor",
      "cross_tenant_access_runtime_deferred",
      "cross_tenant_access_record_writes_deferred",
      "cross_tenant_access_real_tenant_data_excluded",
      "cross_tenant_access_policy_runtime_deferred",
      "cross_tenant_access_decision_emission_deferred",
      "cross_tenant_access_cross_tenant_runtime_deferred",
      "cross_tenant_access_tenant_boundary_bypass_deferred",
      "credentials_and_secrets_excluded",
    ],
  });
}

export function createHrxCp968ClaudeReviewPacket() {
  return deepFreeze({
    gate: HRX_CP968_PACK_BINDING.claude_gate,
    pack_id: HRX_CP968_PACK_BINDING.pack_id,
    read_only: true,
    promotes_claude_to_final_approval: false,
    review_questions: [
      "Do AIScoringAttempt tail rows remain descriptor-only without AI scoring runtime, score runtime, final judgment, record writes, real evaluation data, or permission bypass?",
      "Does CrossTenantAccess foundation remain descriptor-only without cross-tenant access runtime, tenant-boundary bypass, policy execution, decision emission, record writes, real tenant data, or permission bypass?",
      "Does CP968 keep credentials, secrets, runtime receipts, enterprise trust, and separate HRX product claims closed?",
    ],
  });
}

export function createHrxCp968CloseoutHandoff() {
  return deepFreeze({
    from_pack_id: HRX_CP968_PACK_BINDING.pack_id,
    to_pack_id: HRX_CP968_PACK_BINDING.next_pack_id,
    next_subphase_id: HRX_CP968_PACK_BINDING.next_subphase_id,
    handoff_contract: "Continue RP30 P07 CrossTenantAccess tail descriptors while keeping cross-tenant access runtime, tenant-boundary bypass, policy execution, decision emission, record writes, real tenant data, credentials, secrets, and separate-product claims closed.",
  });
}

export function createHrxCp968AiScoringCrossTenantAccessBridgeDescriptor() {
  const caseSet = createHrxCp968AiScoringCrossTenantAccessBridgeCaseSet();
  return deepFreeze({
    descriptor: "HrxCp968AiScoringCrossTenantAccessBridgeDescriptor",
    source_descriptor: "HrxCp967PayrollRuntimeAttemptAiScoringBridgeDescriptor",
    pack_id: HRX_CP968_PACK_BINDING.pack_id,
    planned_pack_id: HRX_CP968_PACK_BINDING.planned_pack_id,
    range: HRX_CP968_PACK_BINDING.range,
    program_contract: HRX_PROGRAM_CONTRACT,
    authority_boundary: {
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: HRX_CP968_PACK_BINDING.next_pack_id,
    },
    hrx_ai_scoring_cross_tenant_access_p07_bridge_case_set: caseSet,
    domain_entities: {
      AIScoringAttempt: deepFreeze({
        descriptor_only: true,
        ai_scoring_attempt_runtime_opened: false,
        ai_scoring_attempt_record_write_opened: false,
        ai_scoring_attempt_real_data_allowed: false,
        ai_scoring_attempt_bypass_allowed: false,
        ai_scoring_attempt_policy_runtime_opened: false,
        ai_scoring_attempt_decision_emitted: false,
        ai_scoring_attempt_score_runtime_opened: false,
        ai_scoring_attempt_final_judgment_allowed: false,
      }),
      CrossTenantAccess: deepFreeze({
        descriptor_only: true,
        cross_tenant_access_runtime_opened: false,
        cross_tenant_access_record_write_opened: false,
        cross_tenant_access_real_data_allowed: false,
        cross_tenant_access_bypass_allowed: false,
        cross_tenant_access_policy_runtime_opened: false,
        cross_tenant_access_decision_emitted: false,
        cross_tenant_access_cross_tenant_runtime_opened: false,
        cross_tenant_access_tenant_boundary_bypass_allowed: false,
      }),
    },
    baseline_decisions: {
      hrx_embedded_inside_law_firm_os: true,
      separate_hrx_product_created: false,
      ai_scoring_attempt_p07_tail_descriptor_only: true,
      ai_scoring_attempt_runtime_deferred: true,
      ai_scoring_attempt_record_writes_deferred: true,
      ai_scoring_attempt_real_evaluation_data_deferred: true,
      ai_scoring_attempt_bypass_deferred: true,
      ai_scoring_attempt_policy_runtime_deferred: true,
      ai_scoring_attempt_decision_emission_deferred: true,
      ai_scoring_attempt_score_runtime_deferred: true,
      ai_scoring_attempt_final_judgment_deferred: true,
      cross_tenant_access_p07_foundation_descriptor_only: true,
      cross_tenant_access_runtime_deferred: true,
      cross_tenant_access_record_writes_deferred: true,
      cross_tenant_access_real_tenant_data_deferred: true,
      cross_tenant_access_bypass_deferred: true,
      cross_tenant_access_policy_runtime_deferred: true,
      cross_tenant_access_decision_emission_deferred: true,
      cross_tenant_access_cross_tenant_runtime_deferred: true,
      cross_tenant_access_tenant_boundary_bypass_deferred: true,
      payroll_calculation_runtime_deferred: true,
      hr_ai_final_judgment_allowed: false,
      sensitive_hr_guard_required: true,
      real_employee_candidate_payroll_document_data_allowed: false,
    },
    requirement_refs: [
      "HRX-CORE-001",
      "HRX-CORE-002",
      "HRX-CORE-003",
      "HRX-GATE-001",
      "HRX-GATE-002",
      "HRX-GATE-003",
      "HRX-GATE-004",
      "HRX-GATE-005",
      "HRX-GATE-006",
    ],
    hermes_packet: createHrxCp968HermesEvidencePacket(),
    claude_packet: createHrxCp968ClaudeReviewPacket(),
    closeout_handoff: createHrxCp968CloseoutHandoff(),
    required_capabilities: HRX_CP968_REQUIREMENTS.required_capabilities,
    safety_gates: HRX_CP968_REQUIREMENTS.safety_gates,
    no_leak_guards: HRX_CP968_REQUIREMENTS.required_no_leak_guards,
    blocked_claims: HRX_BLOCKED_CLAIMS,
    ...HRX_NO_WRITE_ATTESTATION,
  });
}

export function createHrxCp969CrossTenantAccessTailCaseSet() {
  const sections = {};
  for (const [microId, titles] of Object.entries(HRX_CP969_REQUIRED_SECTION_ROWS)) {
    sections[microId] = deepFreeze({
      micro_phase_id: microId,
      row_count: titles.length,
      rows: createHrxDomainRows(microId, titles),
    });
  }
  return deepFreeze({
    pack_id: HRX_CP969_PACK_BINDING.pack_id,
    section_count: Object.keys(sections).length,
    row_count: Object.values(sections).reduce((sum, section) => sum + section.row_count, 0),
    sections,
  });
}

export function createHrxCp969HermesEvidencePacket() {
  return deepFreeze({
    gate: HRX_CP969_PACK_BINDING.hermes_gate,
    pack_id: HRX_CP969_PACK_BINDING.pack_id,
    evidence_kind: "hrx_cross_tenant_access_p07_tail",
    emits_runtime_receipt: false,
    deterministic_only: true,
    validation_commands: ["npm run rp30:hrx:validate", "npm run rp30:validate", "npm run hrx:requirements:validate", "npm run hrx:weighted:validate"],
    boundary_assertions: [
      "cross_tenant_access_p07_tail_descriptor",
      "cross_tenant_access_runtime_deferred",
      "cross_tenant_access_record_writes_deferred",
      "cross_tenant_access_real_tenant_data_excluded",
      "cross_tenant_access_policy_runtime_deferred",
      "cross_tenant_access_decision_emission_deferred",
      "cross_tenant_access_cross_tenant_runtime_deferred",
      "cross_tenant_access_tenant_boundary_bypass_deferred",
      "credentials_and_secrets_excluded",
    ],
  });
}

export function createHrxCp969ClaudeReviewPacket() {
  return deepFreeze({
    gate: HRX_CP969_PACK_BINDING.claude_gate,
    pack_id: HRX_CP969_PACK_BINDING.pack_id,
    read_only: true,
    promotes_claude_to_final_approval: false,
    review_questions: [
      "Do CrossTenantAccess tail rows remain descriptor-only without cross-tenant access runtime, tenant-boundary bypass, policy execution, decision emission, record writes, real tenant data, or permission bypass?",
      "Does CP969 keep credentials, secrets, runtime receipts, enterprise trust, and separate HRX product claims closed?",
    ],
  });
}

export function createHrxCp969CloseoutHandoff() {
  return deepFreeze({
    from_pack_id: HRX_CP969_PACK_BINDING.pack_id,
    to_pack_id: HRX_CP969_PACK_BINDING.next_pack_id,
    next_subphase_id: HRX_CP969_PACK_BINDING.next_subphase_id,
    handoff_contract: "Continue RP30 P07 CrossTenantAccess final tail and StorageDecisionGap foundation descriptors while keeping cross-tenant access runtime, tenant-boundary bypass, storage decision runtime, policy execution, decision emission, record writes, real tenant/storage data, credentials, secrets, and separate-product claims closed.",
  });
}

export function createHrxCp969CrossTenantAccessTailDescriptor() {
  const caseSet = createHrxCp969CrossTenantAccessTailCaseSet();
  return deepFreeze({
    descriptor: "HrxCp969CrossTenantAccessTailDescriptor",
    source_descriptor: "HrxCp968AiScoringCrossTenantAccessBridgeDescriptor",
    pack_id: HRX_CP969_PACK_BINDING.pack_id,
    planned_pack_id: HRX_CP969_PACK_BINDING.planned_pack_id,
    range: HRX_CP969_PACK_BINDING.range,
    program_contract: HRX_PROGRAM_CONTRACT,
    authority_boundary: {
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: HRX_CP969_PACK_BINDING.next_pack_id,
    },
    hrx_cross_tenant_access_p07_tail_case_set: caseSet,
    domain_entities: {
      CrossTenantAccess: deepFreeze({
        descriptor_only: true,
        cross_tenant_access_runtime_opened: false,
        cross_tenant_access_record_write_opened: false,
        cross_tenant_access_real_data_allowed: false,
        cross_tenant_access_bypass_allowed: false,
        cross_tenant_access_policy_runtime_opened: false,
        cross_tenant_access_decision_emitted: false,
        cross_tenant_access_cross_tenant_runtime_opened: false,
        cross_tenant_access_tenant_boundary_bypass_allowed: false,
      }),
    },
    baseline_decisions: {
      hrx_embedded_inside_law_firm_os: true,
      separate_hrx_product_created: false,
      cross_tenant_access_p07_tail_descriptor_only: true,
      cross_tenant_access_runtime_deferred: true,
      cross_tenant_access_record_writes_deferred: true,
      cross_tenant_access_real_tenant_data_deferred: true,
      cross_tenant_access_bypass_deferred: true,
      cross_tenant_access_policy_runtime_deferred: true,
      cross_tenant_access_decision_emission_deferred: true,
      cross_tenant_access_cross_tenant_runtime_deferred: true,
      cross_tenant_access_tenant_boundary_bypass_deferred: true,
      payroll_calculation_runtime_deferred: true,
      hr_ai_final_judgment_allowed: false,
      sensitive_hr_guard_required: true,
      real_employee_candidate_payroll_document_data_allowed: false,
    },
    requirement_refs: [
      "HRX-CORE-001",
      "HRX-CORE-002",
      "HRX-CORE-003",
      "HRX-GATE-001",
      "HRX-GATE-002",
      "HRX-GATE-003",
      "HRX-GATE-004",
      "HRX-GATE-005",
      "HRX-GATE-006",
    ],
    hermes_packet: createHrxCp969HermesEvidencePacket(),
    claude_packet: createHrxCp969ClaudeReviewPacket(),
    closeout_handoff: createHrxCp969CloseoutHandoff(),
    required_capabilities: HRX_CP969_REQUIREMENTS.required_capabilities,
    safety_gates: HRX_CP969_REQUIREMENTS.safety_gates,
    no_leak_guards: HRX_CP969_REQUIREMENTS.required_no_leak_guards,
    blocked_claims: HRX_BLOCKED_CLAIMS,
    ...HRX_NO_WRITE_ATTESTATION,
  });
}

export function createHrxCp970CrossTenantAccessStorageDecisionGapBridgeCaseSet() {
  const sections = {};
  for (const [microId, titles] of Object.entries(HRX_CP970_REQUIRED_SECTION_ROWS)) {
    sections[microId] = deepFreeze({
      micro_phase_id: microId,
      row_count: titles.length,
      rows: createHrxDomainRows(microId, titles),
    });
  }
  return deepFreeze({
    pack_id: HRX_CP970_PACK_BINDING.pack_id,
    section_count: Object.keys(sections).length,
    row_count: Object.values(sections).reduce((sum, section) => sum + section.row_count, 0),
    sections,
  });
}

export function createHrxCp970HermesEvidencePacket() {
  return deepFreeze({
    gate: HRX_CP970_PACK_BINDING.hermes_gate,
    pack_id: HRX_CP970_PACK_BINDING.pack_id,
    evidence_kind: "hrx_cross_tenant_access_storage_decision_gap_p07_bridge",
    emits_runtime_receipt: false,
    deterministic_only: true,
    validation_commands: ["npm run rp30:hrx:validate", "npm run rp30:validate", "npm run hrx:requirements:validate", "npm run hrx:weighted:validate"],
    boundary_assertions: [
      "cross_tenant_access_p07_tail_descriptor",
      "cross_tenant_access_runtime_deferred",
      "cross_tenant_access_record_writes_deferred",
      "cross_tenant_access_real_tenant_data_excluded",
      "cross_tenant_access_policy_runtime_deferred",
      "cross_tenant_access_decision_emission_deferred",
      "cross_tenant_access_cross_tenant_runtime_deferred",
      "cross_tenant_access_tenant_boundary_bypass_deferred",
      "storage_decision_gap_p07_foundation_descriptor",
      "storage_decision_gap_runtime_deferred",
      "storage_decision_gap_record_writes_deferred",
      "storage_decision_gap_real_storage_data_excluded",
      "storage_decision_gap_policy_runtime_deferred",
      "storage_decision_gap_decision_emission_deferred",
      "storage_decision_gap_storage_runtime_deferred",
      "storage_decision_gap_gap_resolution_runtime_deferred",
      "credentials_and_secrets_excluded",
    ],
  });
}

export function createHrxCp970ClaudeReviewPacket() {
  return deepFreeze({
    gate: HRX_CP970_PACK_BINDING.claude_gate,
    pack_id: HRX_CP970_PACK_BINDING.pack_id,
    read_only: true,
    promotes_claude_to_final_approval: false,
    review_questions: [
      "Do CrossTenantAccess final tail rows remain descriptor-only without cross-tenant access runtime, tenant-boundary bypass, policy execution, decision emission, record writes, real tenant data, or permission bypass?",
      "Do StorageDecisionGap foundation rows remain descriptor-only without storage decision runtime, storage runtime, gap-resolution runtime, policy execution, decision emission, record writes, real storage data, or permission bypass?",
      "Does CP970 keep credentials, secrets, runtime receipts, enterprise trust, and separate HRX product claims closed?",
    ],
  });
}

export function createHrxCp970CloseoutHandoff() {
  return deepFreeze({
    from_pack_id: HRX_CP970_PACK_BINDING.pack_id,
    to_pack_id: HRX_CP970_PACK_BINDING.next_pack_id,
    next_subphase_id: HRX_CP970_PACK_BINDING.next_subphase_id,
    handoff_contract: "Continue RP30 P07 StorageDecisionGap tail and H30 command matrix foundation descriptors while keeping storage decision runtime, storage runtime, gap-resolution runtime, H30 execution, policy execution, decision emission, record writes, real storage data, credentials, secrets, and separate-product claims closed.",
  });
}

export function createHrxCp970CrossTenantAccessStorageDecisionGapBridgeDescriptor() {
  const caseSet = createHrxCp970CrossTenantAccessStorageDecisionGapBridgeCaseSet();
  return deepFreeze({
    descriptor: "HrxCp970CrossTenantAccessStorageDecisionGapBridgeDescriptor",
    source_descriptor: "HrxCp969CrossTenantAccessTailDescriptor",
    pack_id: HRX_CP970_PACK_BINDING.pack_id,
    planned_pack_id: HRX_CP970_PACK_BINDING.planned_pack_id,
    range: HRX_CP970_PACK_BINDING.range,
    program_contract: HRX_PROGRAM_CONTRACT,
    authority_boundary: {
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: HRX_CP970_PACK_BINDING.next_pack_id,
    },
    hrx_cross_tenant_access_storage_decision_gap_p07_bridge_case_set: caseSet,
    domain_entities: {
      CrossTenantAccess: deepFreeze({
        descriptor_only: true,
        cross_tenant_access_runtime_opened: false,
        cross_tenant_access_record_write_opened: false,
        cross_tenant_access_real_data_allowed: false,
        cross_tenant_access_bypass_allowed: false,
        cross_tenant_access_policy_runtime_opened: false,
        cross_tenant_access_decision_emitted: false,
        cross_tenant_access_cross_tenant_runtime_opened: false,
        cross_tenant_access_tenant_boundary_bypass_allowed: false,
      }),
      StorageDecisionGap: deepFreeze({
        descriptor_only: true,
        storage_decision_gap_runtime_opened: false,
        storage_decision_gap_record_write_opened: false,
        storage_decision_gap_real_data_allowed: false,
        storage_decision_gap_bypass_allowed: false,
        storage_decision_gap_policy_runtime_opened: false,
        storage_decision_gap_decision_emitted: false,
        storage_decision_gap_storage_runtime_opened: false,
        storage_decision_gap_gap_resolution_runtime_opened: false,
      }),
    },
    baseline_decisions: {
      hrx_embedded_inside_law_firm_os: true,
      separate_hrx_product_created: false,
      cross_tenant_access_p07_tail_descriptor_only: true,
      cross_tenant_access_runtime_deferred: true,
      cross_tenant_access_record_writes_deferred: true,
      cross_tenant_access_real_tenant_data_deferred: true,
      cross_tenant_access_bypass_deferred: true,
      cross_tenant_access_policy_runtime_deferred: true,
      cross_tenant_access_decision_emission_deferred: true,
      cross_tenant_access_cross_tenant_runtime_deferred: true,
      cross_tenant_access_tenant_boundary_bypass_deferred: true,
      storage_decision_gap_p07_foundation_descriptor_only: true,
      storage_decision_gap_runtime_deferred: true,
      storage_decision_gap_record_writes_deferred: true,
      storage_decision_gap_real_storage_data_deferred: true,
      storage_decision_gap_bypass_deferred: true,
      storage_decision_gap_policy_runtime_deferred: true,
      storage_decision_gap_decision_emission_deferred: true,
      storage_decision_gap_storage_runtime_deferred: true,
      storage_decision_gap_gap_resolution_runtime_deferred: true,
      payroll_calculation_runtime_deferred: true,
      hr_ai_final_judgment_allowed: false,
      sensitive_hr_guard_required: true,
      real_employee_candidate_payroll_document_data_allowed: false,
    },
    requirement_refs: [
      "HRX-CORE-001",
      "HRX-CORE-002",
      "HRX-CORE-003",
      "HRX-GATE-001",
      "HRX-GATE-002",
      "HRX-GATE-003",
      "HRX-GATE-004",
      "HRX-GATE-005",
      "HRX-GATE-006",
    ],
    hermes_packet: createHrxCp970HermesEvidencePacket(),
    claude_packet: createHrxCp970ClaudeReviewPacket(),
    closeout_handoff: createHrxCp970CloseoutHandoff(),
    required_capabilities: HRX_CP970_REQUIREMENTS.required_capabilities,
    safety_gates: HRX_CP970_REQUIREMENTS.safety_gates,
    no_leak_guards: HRX_CP970_REQUIREMENTS.required_no_leak_guards,
    blocked_claims: HRX_BLOCKED_CLAIMS,
    ...HRX_NO_WRITE_ATTESTATION,
  });
}

export function createHrxCp971StorageDecisionGapH30CommandMatrixBridgeCaseSet() {
  const sections = {};
  for (const [microId, titles] of Object.entries(HRX_CP971_REQUIRED_SECTION_ROWS)) {
    sections[microId] = deepFreeze({
      micro_phase_id: microId,
      row_count: titles.length,
      rows: createHrxDomainRows(microId, titles),
    });
  }
  return deepFreeze({
    pack_id: HRX_CP971_PACK_BINDING.pack_id,
    section_count: Object.keys(sections).length,
    row_count: Object.values(sections).reduce((sum, section) => sum + section.row_count, 0),
    sections,
  });
}

export function createHrxCp971HermesEvidencePacket() {
  return deepFreeze({
    gate: HRX_CP971_PACK_BINDING.hermes_gate,
    pack_id: HRX_CP971_PACK_BINDING.pack_id,
    evidence_kind: "hrx_storage_decision_gap_h30_command_matrix_p08_bridge",
    emits_runtime_receipt: false,
    deterministic_only: true,
    validation_commands: ["npm run rp30:hrx:validate", "npm run rp30:validate", "npm run hrx:requirements:validate", "npm run hrx:weighted:validate"],
    boundary_assertions: [
      "storage_decision_gap_p07_tail_descriptor",
      "storage_decision_gap_runtime_deferred",
      "storage_decision_gap_record_writes_deferred",
      "storage_decision_gap_real_storage_data_excluded",
      "storage_decision_gap_policy_runtime_deferred",
      "storage_decision_gap_decision_emission_deferred",
      "storage_decision_gap_storage_runtime_deferred",
      "storage_decision_gap_gap_resolution_runtime_deferred",
      "h30_command_matrix_p08_foundation_descriptor",
      "h30_command_matrix_runtime_deferred",
      "h30_command_matrix_record_writes_deferred",
      "h30_command_matrix_real_command_data_excluded",
      "h30_command_matrix_policy_runtime_deferred",
      "h30_command_matrix_decision_emission_deferred",
      "h30_command_matrix_command_execution_runtime_deferred",
      "credentials_and_secrets_excluded",
    ],
  });
}

export function createHrxCp971ClaudeReviewPacket() {
  return deepFreeze({
    gate: HRX_CP971_PACK_BINDING.claude_gate,
    pack_id: HRX_CP971_PACK_BINDING.pack_id,
    read_only: true,
    promotes_claude_to_final_approval: false,
    review_waived_by_user: true,
    review_questions: [
      "Do StorageDecisionGap tail rows remain descriptor-only without storage decision runtime, storage runtime, gap-resolution runtime, policy execution, decision emission, record writes, real storage data, or permission bypass?",
      "Do H30CommandMatrix foundation rows remain descriptor-only without H30 command execution runtime, policy execution, decision emission, record writes, real command data, or permission bypass?",
      "Does CP971 keep credentials, secrets, runtime receipts, enterprise trust, and separate HRX product claims closed?",
    ],
  });
}

export function createHrxCp971CloseoutHandoff() {
  return deepFreeze({
    from_pack_id: HRX_CP971_PACK_BINDING.pack_id,
    to_pack_id: HRX_CP971_PACK_BINDING.next_pack_id,
    next_subphase_id: HRX_CP971_PACK_BINDING.next_subphase_id,
    handoff_contract: "Continue RP30 P08 H30CommandMatrix tail and EvidenceTemplate foundation descriptors while keeping H30 command execution runtime, evidence-template runtime, policy execution, decision emission, record writes, real command/evidence data, credentials, secrets, and separate-product claims closed.",
  });
}

export function createHrxCp971StorageDecisionGapH30CommandMatrixBridgeDescriptor() {
  const caseSet = createHrxCp971StorageDecisionGapH30CommandMatrixBridgeCaseSet();
  return deepFreeze({
    descriptor: "HrxCp971StorageDecisionGapH30CommandMatrixBridgeDescriptor",
    source_descriptor: "HrxCp970CrossTenantAccessStorageDecisionGapBridgeDescriptor",
    pack_id: HRX_CP971_PACK_BINDING.pack_id,
    planned_pack_id: HRX_CP971_PACK_BINDING.planned_pack_id,
    range: HRX_CP971_PACK_BINDING.range,
    program_contract: HRX_PROGRAM_CONTRACT,
    authority_boundary: {
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: HRX_CP971_PACK_BINDING.next_pack_id,
    },
    hrx_storage_decision_gap_h30_command_matrix_p08_bridge_case_set: caseSet,
    domain_entities: {
      StorageDecisionGap: deepFreeze({
        descriptor_only: true,
        storage_decision_gap_runtime_opened: false,
        storage_decision_gap_record_write_opened: false,
        storage_decision_gap_real_data_allowed: false,
        storage_decision_gap_bypass_allowed: false,
        storage_decision_gap_policy_runtime_opened: false,
        storage_decision_gap_decision_emitted: false,
        storage_decision_gap_storage_runtime_opened: false,
        storage_decision_gap_gap_resolution_runtime_opened: false,
      }),
      H30CommandMatrix: deepFreeze({
        descriptor_only: true,
        h30_command_matrix_runtime_opened: false,
        h30_command_matrix_record_write_opened: false,
        h30_command_matrix_real_data_allowed: false,
        h30_command_matrix_bypass_allowed: false,
        h30_command_matrix_policy_runtime_opened: false,
        h30_command_matrix_decision_emitted: false,
        h30_command_matrix_command_execution_runtime_opened: false,
      }),
    },
    baseline_decisions: {
      hrx_embedded_inside_law_firm_os: true,
      separate_hrx_product_created: false,
      storage_decision_gap_p07_tail_descriptor_only: true,
      storage_decision_gap_runtime_deferred: true,
      storage_decision_gap_record_writes_deferred: true,
      storage_decision_gap_real_storage_data_deferred: true,
      storage_decision_gap_bypass_deferred: true,
      storage_decision_gap_policy_runtime_deferred: true,
      storage_decision_gap_decision_emission_deferred: true,
      storage_decision_gap_storage_runtime_deferred: true,
      storage_decision_gap_gap_resolution_runtime_deferred: true,
      h30_command_matrix_p08_foundation_descriptor_only: true,
      h30_command_matrix_runtime_deferred: true,
      h30_command_matrix_record_writes_deferred: true,
      h30_command_matrix_real_command_data_deferred: true,
      h30_command_matrix_bypass_deferred: true,
      h30_command_matrix_policy_runtime_deferred: true,
      h30_command_matrix_decision_emission_deferred: true,
      h30_command_matrix_command_execution_runtime_deferred: true,
      payroll_calculation_runtime_deferred: true,
      hr_ai_final_judgment_allowed: false,
      sensitive_hr_guard_required: true,
      real_employee_candidate_payroll_document_data_allowed: false,
    },
    requirement_refs: [
      "HRX-CORE-001",
      "HRX-CORE-002",
      "HRX-CORE-003",
      "HRX-GATE-001",
      "HRX-GATE-002",
      "HRX-GATE-003",
      "HRX-GATE-004",
      "HRX-GATE-005",
      "HRX-GATE-006",
    ],
    hermes_packet: createHrxCp971HermesEvidencePacket(),
    claude_packet: createHrxCp971ClaudeReviewPacket(),
    closeout_handoff: createHrxCp971CloseoutHandoff(),
    required_capabilities: HRX_CP971_REQUIREMENTS.required_capabilities,
    safety_gates: HRX_CP971_REQUIREMENTS.safety_gates,
    no_leak_guards: HRX_CP971_REQUIREMENTS.required_no_leak_guards,
    blocked_claims: HRX_BLOCKED_CLAIMS,
    ...HRX_NO_WRITE_ATTESTATION,
  });
}

export function createHrxCp972H30CommandMatrixEvidenceTemplateBridgeCaseSet() {
  const sections = {};
  for (const [microId, titles] of Object.entries(HRX_CP972_REQUIRED_SECTION_ROWS)) {
    sections[microId] = deepFreeze({
      micro_phase_id: microId,
      row_count: titles.length,
      rows: createHrxDomainRows(microId, titles),
    });
  }
  return deepFreeze({
    pack_id: HRX_CP972_PACK_BINDING.pack_id,
    section_count: Object.keys(sections).length,
    row_count: Object.values(sections).reduce((sum, section) => sum + section.row_count, 0),
    sections,
  });
}

export function createHrxCp972HermesEvidencePacket() {
  return deepFreeze({
    gate: HRX_CP972_PACK_BINDING.hermes_gate,
    pack_id: HRX_CP972_PACK_BINDING.pack_id,
    evidence_kind: "hrx_h30_command_matrix_evidence_template_p08_bridge",
    emits_runtime_receipt: false,
    deterministic_only: true,
    validation_commands: ["npm run rp30:hrx:validate", "npm run rp30:validate", "npm run hrx:requirements:validate", "npm run hrx:weighted:validate"],
    boundary_assertions: [
      "h30_command_matrix_p08_tail_descriptor",
      "h30_command_matrix_runtime_deferred",
      "h30_command_matrix_record_writes_deferred",
      "h30_command_matrix_real_command_data_excluded",
      "h30_command_matrix_policy_runtime_deferred",
      "h30_command_matrix_decision_emission_deferred",
      "h30_command_matrix_command_execution_runtime_deferred",
      "evidence_template_p08_foundation_descriptor",
      "evidence_template_runtime_deferred",
      "evidence_template_record_writes_deferred",
      "evidence_template_real_evidence_data_excluded",
      "evidence_template_policy_runtime_deferred",
      "evidence_template_decision_emission_deferred",
      "evidence_template_render_runtime_deferred",
      "credentials_and_secrets_excluded",
    ],
  });
}

export function createHrxCp972ClaudeReviewPacket() {
  return deepFreeze({
    gate: HRX_CP972_PACK_BINDING.claude_gate,
    pack_id: HRX_CP972_PACK_BINDING.pack_id,
    read_only: true,
    promotes_claude_to_final_approval: false,
    review_waived_by_user: true,
    review_questions: [
      "Do H30CommandMatrix tail rows remain descriptor-only without H30 command execution runtime, policy execution, decision emission, record writes, real command data, or permission bypass?",
      "Do EvidenceTemplate foundation rows remain descriptor-only without evidence-template runtime, render runtime, policy execution, decision emission, record writes, real evidence data, or permission bypass?",
      "Does CP972 keep credentials, secrets, runtime receipts, enterprise trust, and separate HRX product claims closed?",
    ],
  });
}

export function createHrxCp972CloseoutHandoff() {
  return deepFreeze({
    from_pack_id: HRX_CP972_PACK_BINDING.pack_id,
    to_pack_id: HRX_CP972_PACK_BINDING.next_pack_id,
    next_subphase_id: HRX_CP972_PACK_BINDING.next_subphase_id,
    handoff_contract: "Continue RP30 P08 EvidenceTemplate tail and NoRealData foundation descriptors while keeping evidence-template runtime, render runtime, no-real-data enforcement runtime, policy execution, decision emission, record writes, real evidence/data payloads, credentials, secrets, and separate-product claims closed.",
  });
}

export function createHrxCp972H30CommandMatrixEvidenceTemplateBridgeDescriptor() {
  const caseSet = createHrxCp972H30CommandMatrixEvidenceTemplateBridgeCaseSet();
  return deepFreeze({
    descriptor: "HrxCp972H30CommandMatrixEvidenceTemplateBridgeDescriptor",
    source_descriptor: "HrxCp971StorageDecisionGapH30CommandMatrixBridgeDescriptor",
    pack_id: HRX_CP972_PACK_BINDING.pack_id,
    planned_pack_id: HRX_CP972_PACK_BINDING.planned_pack_id,
    range: HRX_CP972_PACK_BINDING.range,
    program_contract: HRX_PROGRAM_CONTRACT,
    authority_boundary: {
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: HRX_CP972_PACK_BINDING.next_pack_id,
    },
    hrx_h30_command_matrix_evidence_template_p08_bridge_case_set: caseSet,
    domain_entities: {
      H30CommandMatrix: deepFreeze({
        descriptor_only: true,
        h30_command_matrix_runtime_opened: false,
        h30_command_matrix_record_write_opened: false,
        h30_command_matrix_real_data_allowed: false,
        h30_command_matrix_bypass_allowed: false,
        h30_command_matrix_policy_runtime_opened: false,
        h30_command_matrix_decision_emitted: false,
        h30_command_matrix_command_execution_runtime_opened: false,
      }),
      EvidenceTemplate: deepFreeze({
        descriptor_only: true,
        evidence_template_runtime_opened: false,
        evidence_template_record_write_opened: false,
        evidence_template_real_data_allowed: false,
        evidence_template_bypass_allowed: false,
        evidence_template_policy_runtime_opened: false,
        evidence_template_decision_emitted: false,
        evidence_template_render_runtime_opened: false,
      }),
    },
    baseline_decisions: {
      hrx_embedded_inside_law_firm_os: true,
      separate_hrx_product_created: false,
      h30_command_matrix_p08_tail_descriptor_only: true,
      h30_command_matrix_runtime_deferred: true,
      h30_command_matrix_record_writes_deferred: true,
      h30_command_matrix_real_command_data_deferred: true,
      h30_command_matrix_bypass_deferred: true,
      h30_command_matrix_policy_runtime_deferred: true,
      h30_command_matrix_decision_emission_deferred: true,
      h30_command_matrix_command_execution_runtime_deferred: true,
      evidence_template_p08_foundation_descriptor_only: true,
      evidence_template_runtime_deferred: true,
      evidence_template_record_writes_deferred: true,
      evidence_template_real_evidence_data_deferred: true,
      evidence_template_bypass_deferred: true,
      evidence_template_policy_runtime_deferred: true,
      evidence_template_decision_emission_deferred: true,
      evidence_template_render_runtime_deferred: true,
      payroll_calculation_runtime_deferred: true,
      hr_ai_final_judgment_allowed: false,
      sensitive_hr_guard_required: true,
      real_employee_candidate_payroll_document_data_allowed: false,
    },
    requirement_refs: [
      "HRX-CORE-001",
      "HRX-CORE-002",
      "HRX-CORE-003",
      "HRX-GATE-001",
      "HRX-GATE-002",
      "HRX-GATE-003",
      "HRX-GATE-004",
      "HRX-GATE-005",
      "HRX-GATE-006",
    ],
    hermes_packet: createHrxCp972HermesEvidencePacket(),
    claude_packet: createHrxCp972ClaudeReviewPacket(),
    closeout_handoff: createHrxCp972CloseoutHandoff(),
    required_capabilities: HRX_CP972_REQUIREMENTS.required_capabilities,
    safety_gates: HRX_CP972_REQUIREMENTS.safety_gates,
    no_leak_guards: HRX_CP972_REQUIREMENTS.required_no_leak_guards,
    blocked_claims: HRX_BLOCKED_CLAIMS,
    ...HRX_NO_WRITE_ATTESTATION,
  });
}

export function createHrxCp973EvidenceTemplateNoRealDataBridgeCaseSet() {
  const sections = {};
  for (const [microId, titles] of Object.entries(HRX_CP973_REQUIRED_SECTION_ROWS)) {
    sections[microId] = deepFreeze({
      micro_phase_id: microId,
      row_count: titles.length,
      rows: createHrxDomainRows(microId, titles),
    });
  }
  return deepFreeze({
    pack_id: HRX_CP973_PACK_BINDING.pack_id,
    section_count: Object.keys(sections).length,
    row_count: Object.values(sections).reduce((sum, section) => sum + section.row_count, 0),
    sections,
  });
}

export function createHrxCp973HermesEvidencePacket() {
  return deepFreeze({
    gate: HRX_CP973_PACK_BINDING.hermes_gate,
    pack_id: HRX_CP973_PACK_BINDING.pack_id,
    evidence_kind: "hrx_evidence_template_no_real_data_p08_bridge",
    emits_runtime_receipt: false,
    deterministic_only: true,
    validation_commands: ["npm run rp30:hrx:validate", "npm run rp30:validate", "npm run hrx:requirements:validate", "npm run hrx:weighted:validate"],
    boundary_assertions: [
      "evidence_template_p08_tail_descriptor",
      "evidence_template_runtime_deferred",
      "evidence_template_record_writes_deferred",
      "evidence_template_real_evidence_data_excluded",
      "evidence_template_policy_runtime_deferred",
      "evidence_template_decision_emission_deferred",
      "evidence_template_render_runtime_deferred",
      "no_real_data_p08_foundation_descriptor",
      "no_real_data_runtime_deferred",
      "no_real_data_record_writes_deferred",
      "no_real_data_real_data_excluded",
      "no_real_data_bypass_deferred",
      "no_real_data_policy_runtime_deferred",
      "no_real_data_decision_emission_deferred",
      "no_real_data_enforcement_runtime_deferred",
      "credentials_and_secrets_excluded",
    ],
  });
}

export function createHrxCp973ClaudeReviewPacket() {
  return deepFreeze({
    gate: HRX_CP973_PACK_BINDING.claude_gate,
    pack_id: HRX_CP973_PACK_BINDING.pack_id,
    read_only: true,
    promotes_claude_to_final_approval: false,
    review_waived_by_user: true,
    review_questions: [
      "Do EvidenceTemplate tail rows remain descriptor-only without evidence-template runtime, render runtime, policy execution, decision emission, record writes, real evidence data, or permission bypass?",
      "Do NoRealData foundation rows remain descriptor-only without no-real-data enforcement runtime, policy execution, decision emission, record writes, real data payloads, or permission bypass?",
      "Does CP973 keep credentials, secrets, runtime receipts, enterprise trust, and separate HRX product claims closed?",
    ],
  });
}

export function createHrxCp973CloseoutHandoff() {
  return deepFreeze({
    from_pack_id: HRX_CP973_PACK_BINDING.pack_id,
    to_pack_id: HRX_CP973_PACK_BINDING.next_pack_id,
    next_subphase_id: HRX_CP973_PACK_BINDING.next_subphase_id,
    handoff_contract: "Continue RP30 P08 NoRealData tail and next evidence-control descriptors while keeping no-real-data enforcement runtime, policy execution, decision emission, record writes, real data payloads, credentials, secrets, and separate-product claims closed.",
  });
}

export function createHrxCp973EvidenceTemplateNoRealDataBridgeDescriptor() {
  const caseSet = createHrxCp973EvidenceTemplateNoRealDataBridgeCaseSet();
  return deepFreeze({
    descriptor: "HrxCp973EvidenceTemplateNoRealDataBridgeDescriptor",
    source_descriptor: "HrxCp972H30CommandMatrixEvidenceTemplateBridgeDescriptor",
    pack_id: HRX_CP973_PACK_BINDING.pack_id,
    planned_pack_id: HRX_CP973_PACK_BINDING.planned_pack_id,
    range: HRX_CP973_PACK_BINDING.range,
    program_contract: HRX_PROGRAM_CONTRACT,
    authority_boundary: {
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: HRX_CP973_PACK_BINDING.next_pack_id,
    },
    hrx_evidence_template_no_real_data_p08_bridge_case_set: caseSet,
    domain_entities: {
      EvidenceTemplate: deepFreeze({
        descriptor_only: true,
        evidence_template_runtime_opened: false,
        evidence_template_record_write_opened: false,
        evidence_template_real_data_allowed: false,
        evidence_template_bypass_allowed: false,
        evidence_template_policy_runtime_opened: false,
        evidence_template_decision_emitted: false,
        evidence_template_render_runtime_opened: false,
      }),
      NoRealData: deepFreeze({
        descriptor_only: true,
        no_real_data_runtime_opened: false,
        no_real_data_record_write_opened: false,
        no_real_data_real_data_allowed: false,
        no_real_data_bypass_allowed: false,
        no_real_data_policy_runtime_opened: false,
        no_real_data_decision_emitted: false,
        no_real_data_enforcement_runtime_opened: false,
      }),
    },
    baseline_decisions: {
      hrx_embedded_inside_law_firm_os: true,
      separate_hrx_product_created: false,
      evidence_template_p08_tail_descriptor_only: true,
      evidence_template_runtime_deferred: true,
      evidence_template_record_writes_deferred: true,
      evidence_template_real_evidence_data_deferred: true,
      evidence_template_bypass_deferred: true,
      evidence_template_policy_runtime_deferred: true,
      evidence_template_decision_emission_deferred: true,
      evidence_template_render_runtime_deferred: true,
      no_real_data_p08_foundation_descriptor_only: true,
      no_real_data_runtime_deferred: true,
      no_real_data_record_writes_deferred: true,
      no_real_data_real_data_deferred: true,
      no_real_data_bypass_deferred: true,
      no_real_data_policy_runtime_deferred: true,
      no_real_data_decision_emission_deferred: true,
      no_real_data_enforcement_runtime_deferred: true,
      payroll_calculation_runtime_deferred: true,
      hr_ai_final_judgment_allowed: false,
      sensitive_hr_guard_required: true,
      real_employee_candidate_payroll_document_data_allowed: false,
    },
    requirement_refs: [
      "HRX-CORE-001",
      "HRX-CORE-002",
      "HRX-CORE-003",
      "HRX-GATE-001",
      "HRX-GATE-002",
      "HRX-GATE-003",
      "HRX-GATE-004",
      "HRX-GATE-005",
      "HRX-GATE-006",
    ],
    hermes_packet: createHrxCp973HermesEvidencePacket(),
    claude_packet: createHrxCp973ClaudeReviewPacket(),
    closeout_handoff: createHrxCp973CloseoutHandoff(),
    required_capabilities: HRX_CP973_REQUIREMENTS.required_capabilities,
    safety_gates: HRX_CP973_REQUIREMENTS.safety_gates,
    no_leak_guards: HRX_CP973_REQUIREMENTS.required_no_leak_guards,
    blocked_claims: HRX_BLOCKED_CLAIMS,
    ...HRX_NO_WRITE_ATTESTATION,
  });
}

export function createHrxCp974BlockedClaimsClaudeDependencyBridgeCaseSet() {
  const sections = {};
  for (const [microId, titles] of Object.entries(HRX_CP974_REQUIRED_SECTION_ROWS)) {
    sections[microId] = deepFreeze({
      micro_phase_id: microId,
      row_count: titles.length,
      rows: createHrxDomainRows(microId, titles),
    });
  }
  return deepFreeze({
    pack_id: HRX_CP974_PACK_BINDING.pack_id,
    section_count: Object.keys(sections).length,
    row_count: Object.values(sections).reduce((sum, section) => sum + section.row_count, 0),
    sections,
  });
}

export function createHrxCp974HermesEvidencePacket() {
  return deepFreeze({
    gate: HRX_CP974_PACK_BINDING.hermes_gate,
    pack_id: HRX_CP974_PACK_BINDING.pack_id,
    evidence_kind: "hrx_blocked_claims_claude_dependency_p08_bridge",
    emits_runtime_receipt: false,
    deterministic_only: true,
    validation_commands: ["npm run rp30:hrx:validate", "npm run rp30:validate", "npm run hrx:requirements:validate", "npm run hrx:weighted:validate"],
    boundary_assertions: [
      "blocked_claims_p08_foundation_descriptor",
      "blocked_claims_runtime_deferred",
      "blocked_claims_record_writes_deferred",
      "blocked_claims_real_claim_data_excluded",
      "blocked_claims_bypass_deferred",
      "blocked_claims_policy_runtime_deferred",
      "blocked_claims_decision_emission_deferred",
      "blocked_claims_claim_override_runtime_deferred",
      "claude_dependency_p08_foundation_descriptor",
      "claude_dependency_runtime_deferred",
      "claude_dependency_record_writes_deferred",
      "claude_dependency_real_review_data_excluded",
      "claude_dependency_bypass_deferred",
      "claude_dependency_policy_runtime_deferred",
      "claude_dependency_decision_emission_deferred",
      "claude_dependency_review_runtime_deferred",
      "credentials_and_secrets_excluded",
    ],
  });
}

export function createHrxCp974ClaudeReviewPacket() {
  return deepFreeze({
    gate: HRX_CP974_PACK_BINDING.claude_gate,
    pack_id: HRX_CP974_PACK_BINDING.pack_id,
    read_only: true,
    promotes_claude_to_final_approval: false,
    review_waived_by_user: true,
    review_questions: [
      "Do BlockedClaims foundation rows remain descriptor-only without claim override runtime, policy execution, decision emission, record writes, real claim data, or permission bypass?",
      "Do ClaudeDependency foundation rows remain descriptor-only without Claude review runtime, policy execution, decision emission, record writes, real review data, or permission bypass?",
      "Does CP974 keep credentials, secrets, runtime receipts, enterprise trust, and separate HRX product claims closed?",
    ],
  });
}

export function createHrxCp974CloseoutHandoff() {
  return deepFreeze({
    from_pack_id: HRX_CP974_PACK_BINDING.pack_id,
    to_pack_id: HRX_CP974_PACK_BINDING.next_pack_id,
    next_subphase_id: HRX_CP974_PACK_BINDING.next_subphase_id,
    handoff_contract: "Continue RP30 P08 ClaudeDependency tail and next review-boundary descriptors while keeping Claude review runtime, blocked-claim override runtime, policy execution, decision emission, record writes, real review/claim data, credentials, secrets, and separate-product claims closed.",
  });
}

export function createHrxCp974BlockedClaimsClaudeDependencyBridgeDescriptor() {
  const caseSet = createHrxCp974BlockedClaimsClaudeDependencyBridgeCaseSet();
  return deepFreeze({
    descriptor: "HrxCp974BlockedClaimsClaudeDependencyBridgeDescriptor",
    source_descriptor: "HrxCp973EvidenceTemplateNoRealDataBridgeDescriptor",
    pack_id: HRX_CP974_PACK_BINDING.pack_id,
    planned_pack_id: HRX_CP974_PACK_BINDING.planned_pack_id,
    range: HRX_CP974_PACK_BINDING.range,
    program_contract: HRX_PROGRAM_CONTRACT,
    authority_boundary: {
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: HRX_CP974_PACK_BINDING.next_pack_id,
    },
    hrx_blocked_claims_claude_dependency_p08_bridge_case_set: caseSet,
    domain_entities: {
      BlockedClaims: deepFreeze({
        descriptor_only: true,
        blocked_claims_runtime_opened: false,
        blocked_claims_record_write_opened: false,
        blocked_claims_real_data_allowed: false,
        blocked_claims_bypass_allowed: false,
        blocked_claims_policy_runtime_opened: false,
        blocked_claims_decision_emitted: false,
        blocked_claims_claim_override_runtime_opened: false,
      }),
      ClaudeDependency: deepFreeze({
        descriptor_only: true,
        claude_dependency_runtime_opened: false,
        claude_dependency_record_write_opened: false,
        claude_dependency_real_data_allowed: false,
        claude_dependency_bypass_allowed: false,
        claude_dependency_policy_runtime_opened: false,
        claude_dependency_decision_emitted: false,
        claude_dependency_review_runtime_opened: false,
      }),
    },
    baseline_decisions: {
      hrx_embedded_inside_law_firm_os: true,
      separate_hrx_product_created: false,
      blocked_claims_p08_foundation_descriptor_only: true,
      blocked_claims_runtime_deferred: true,
      blocked_claims_record_writes_deferred: true,
      blocked_claims_real_claim_data_deferred: true,
      blocked_claims_bypass_deferred: true,
      blocked_claims_policy_runtime_deferred: true,
      blocked_claims_decision_emission_deferred: true,
      blocked_claims_claim_override_runtime_deferred: true,
      claude_dependency_p08_foundation_descriptor_only: true,
      claude_dependency_runtime_deferred: true,
      claude_dependency_record_writes_deferred: true,
      claude_dependency_real_review_data_deferred: true,
      claude_dependency_bypass_deferred: true,
      claude_dependency_policy_runtime_deferred: true,
      claude_dependency_decision_emission_deferred: true,
      claude_dependency_review_runtime_deferred: true,
      payroll_calculation_runtime_deferred: true,
      hr_ai_final_judgment_allowed: false,
      sensitive_hr_guard_required: true,
      real_employee_candidate_payroll_document_data_allowed: false,
    },
    requirement_refs: [
      "HRX-CORE-001",
      "HRX-CORE-002",
      "HRX-CORE-003",
      "HRX-GATE-001",
      "HRX-GATE-002",
      "HRX-GATE-003",
      "HRX-GATE-004",
      "HRX-GATE-005",
      "HRX-GATE-006",
    ],
    hermes_packet: createHrxCp974HermesEvidencePacket(),
    claude_packet: createHrxCp974ClaudeReviewPacket(),
    closeout_handoff: createHrxCp974CloseoutHandoff(),
    required_capabilities: HRX_CP974_REQUIREMENTS.required_capabilities,
    safety_gates: HRX_CP974_REQUIREMENTS.safety_gates,
    no_leak_guards: HRX_CP974_REQUIREMENTS.required_no_leak_guards,
    blocked_claims: HRX_BLOCKED_CLAIMS,
    ...HRX_NO_WRITE_ATTESTATION,
  });
}

export function createHrxCp975ClaudeDependencyHumanApprovalBridgeCaseSet() {
  const sections = {};
  for (const [microId, titles] of Object.entries(HRX_CP975_REQUIRED_SECTION_ROWS)) {
    sections[microId] = deepFreeze({
      micro_phase_id: microId,
      row_count: titles.length,
      rows: createHrxDomainRows(microId, titles),
    });
  }
  return deepFreeze({
    pack_id: HRX_CP975_PACK_BINDING.pack_id,
    section_count: Object.keys(sections).length,
    row_count: Object.values(sections).reduce((sum, section) => sum + section.row_count, 0),
    sections,
  });
}

export function createHrxCp975HermesEvidencePacket() {
  return deepFreeze({
    gate: HRX_CP975_PACK_BINDING.hermes_gate,
    pack_id: HRX_CP975_PACK_BINDING.pack_id,
    evidence_kind: "hrx_claude_dependency_human_approval_p08_bridge",
    emits_runtime_receipt: false,
    deterministic_only: true,
    validation_commands: ["npm run rp30:hrx:validate", "npm run rp30:validate", "npm run hrx:requirements:validate", "npm run hrx:weighted:validate"],
    boundary_assertions: [
      "claude_dependency_p08_tail_descriptor",
      "claude_dependency_runtime_deferred",
      "claude_dependency_record_writes_deferred",
      "claude_dependency_real_review_data_excluded",
      "claude_dependency_bypass_deferred",
      "claude_dependency_policy_runtime_deferred",
      "claude_dependency_decision_emission_deferred",
      "claude_dependency_review_runtime_deferred",
      "human_approval_p08_foundation_descriptor",
      "human_approval_runtime_deferred",
      "human_approval_record_writes_deferred",
      "human_approval_real_approval_data_excluded",
      "human_approval_bypass_deferred",
      "human_approval_policy_runtime_deferred",
      "human_approval_decision_emission_deferred",
      "human_approval_final_approval_runtime_deferred",
      "credentials_and_secrets_excluded",
    ],
  });
}

export function createHrxCp975ClaudeReviewPacket() {
  return deepFreeze({
    gate: HRX_CP975_PACK_BINDING.claude_gate,
    pack_id: HRX_CP975_PACK_BINDING.pack_id,
    read_only: true,
    promotes_claude_to_final_approval: false,
    review_waived_by_user: true,
    review_questions: [
      "Do ClaudeDependency tail rows remain descriptor-only without Claude review runtime, policy execution, decision emission, record writes, real review data, or permission bypass?",
      "Do HumanApproval foundation rows remain descriptor-only without final approval runtime, policy execution, decision emission, record writes, real approval data, or permission bypass?",
      "Does CP975 keep credentials, secrets, runtime receipts, enterprise trust, and separate HRX product claims closed?",
    ],
  });
}

export function createHrxCp975CloseoutHandoff() {
  return deepFreeze({
    from_pack_id: HRX_CP975_PACK_BINDING.pack_id,
    to_pack_id: HRX_CP975_PACK_BINDING.next_pack_id,
    next_subphase_id: HRX_CP975_PACK_BINDING.next_subphase_id,
    handoff_contract: "Continue RP30 P08 HumanApproval tail and H30CommandMatrix descriptors while keeping final approval runtime, Claude review runtime, policy execution, decision emission, record writes, real approval/review data, credentials, secrets, runtime receipts, enterprise trust, and separate-product claims closed.",
  });
}

export function createHrxCp975ClaudeDependencyHumanApprovalBridgeDescriptor() {
  const caseSet = createHrxCp975ClaudeDependencyHumanApprovalBridgeCaseSet();
  return deepFreeze({
    descriptor: "HrxCp975ClaudeDependencyHumanApprovalBridgeDescriptor",
    source_descriptor: "HrxCp974BlockedClaimsClaudeDependencyBridgeDescriptor",
    pack_id: HRX_CP975_PACK_BINDING.pack_id,
    planned_pack_id: HRX_CP975_PACK_BINDING.planned_pack_id,
    range: HRX_CP975_PACK_BINDING.range,
    program_contract: HRX_PROGRAM_CONTRACT,
    authority_boundary: {
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: HRX_CP975_PACK_BINDING.next_pack_id,
    },
    hrx_claude_dependency_human_approval_p08_bridge_case_set: caseSet,
    domain_entities: {
      ClaudeDependency: deepFreeze({
        descriptor_only: true,
        claude_dependency_runtime_opened: false,
        claude_dependency_record_write_opened: false,
        claude_dependency_real_data_allowed: false,
        claude_dependency_bypass_allowed: false,
        claude_dependency_policy_runtime_opened: false,
        claude_dependency_decision_emitted: false,
        claude_dependency_review_runtime_opened: false,
      }),
      HumanApproval: deepFreeze({
        descriptor_only: true,
        human_approval_runtime_opened: false,
        human_approval_record_write_opened: false,
        human_approval_real_data_allowed: false,
        human_approval_bypass_allowed: false,
        human_approval_policy_runtime_opened: false,
        human_approval_decision_emitted: false,
        human_approval_final_approval_runtime_opened: false,
      }),
    },
    baseline_decisions: {
      hrx_embedded_inside_law_firm_os: true,
      separate_hrx_product_created: false,
      claude_dependency_p08_tail_descriptor_only: true,
      claude_dependency_runtime_deferred: true,
      claude_dependency_record_writes_deferred: true,
      claude_dependency_real_review_data_deferred: true,
      claude_dependency_bypass_deferred: true,
      claude_dependency_policy_runtime_deferred: true,
      claude_dependency_decision_emission_deferred: true,
      claude_dependency_review_runtime_deferred: true,
      human_approval_p08_foundation_descriptor_only: true,
      human_approval_runtime_deferred: true,
      human_approval_record_writes_deferred: true,
      human_approval_real_approval_data_deferred: true,
      human_approval_bypass_deferred: true,
      human_approval_policy_runtime_deferred: true,
      human_approval_decision_emission_deferred: true,
      human_approval_final_approval_runtime_deferred: true,
      payroll_calculation_runtime_deferred: true,
      hr_ai_final_judgment_allowed: false,
      sensitive_hr_guard_required: true,
      real_employee_candidate_payroll_document_data_allowed: false,
    },
    requirement_refs: [
      "HRX-CORE-001",
      "HRX-CORE-002",
      "HRX-CORE-003",
      "HRX-GATE-001",
      "HRX-GATE-002",
      "HRX-GATE-003",
      "HRX-GATE-004",
      "HRX-GATE-005",
      "HRX-GATE-006",
    ],
    hermes_packet: createHrxCp975HermesEvidencePacket(),
    claude_packet: createHrxCp975ClaudeReviewPacket(),
    closeout_handoff: createHrxCp975CloseoutHandoff(),
    required_capabilities: HRX_CP975_REQUIREMENTS.required_capabilities,
    safety_gates: HRX_CP975_REQUIREMENTS.safety_gates,
    no_leak_guards: HRX_CP975_REQUIREMENTS.required_no_leak_guards,
    blocked_claims: HRX_BLOCKED_CLAIMS,
    ...HRX_NO_WRITE_ATTESTATION,
  });
}

export function createHrxCp976HumanApprovalH30CommandMatrixBridgeCaseSet() {
  const sections = {};
  for (const [microId, titles] of Object.entries(HRX_CP976_REQUIRED_SECTION_ROWS)) {
    sections[microId] = deepFreeze({
      micro_phase_id: microId,
      row_count: titles.length,
      rows: createHrxDomainRows(microId, titles),
    });
  }
  return deepFreeze({
    pack_id: HRX_CP976_PACK_BINDING.pack_id,
    section_count: Object.keys(sections).length,
    row_count: Object.values(sections).reduce((sum, section) => sum + section.row_count, 0),
    sections,
  });
}

export function createHrxCp976HermesEvidencePacket() {
  return deepFreeze({
    gate: HRX_CP976_PACK_BINDING.hermes_gate,
    pack_id: HRX_CP976_PACK_BINDING.pack_id,
    evidence_kind: "hrx_human_approval_h30_command_matrix_p08_bridge",
    emits_runtime_receipt: false,
    deterministic_only: true,
    validation_commands: ["npm run rp30:hrx:validate", "npm run rp30:validate", "npm run hrx:requirements:validate", "npm run hrx:weighted:validate"],
    boundary_assertions: [
      "human_approval_p08_tail_descriptor",
      "human_approval_runtime_deferred",
      "human_approval_record_writes_deferred",
      "human_approval_real_approval_data_excluded",
      "human_approval_bypass_deferred",
      "human_approval_policy_runtime_deferred",
      "human_approval_decision_emission_deferred",
      "human_approval_final_approval_runtime_deferred",
      "h30_command_matrix_p08_foundation_descriptor",
      "h30_command_matrix_runtime_deferred",
      "h30_command_matrix_record_writes_deferred",
      "h30_command_matrix_real_command_data_excluded",
      "h30_command_matrix_policy_runtime_deferred",
      "h30_command_matrix_decision_emission_deferred",
      "h30_command_matrix_command_execution_runtime_deferred",
      "credentials_and_secrets_excluded",
    ],
  });
}

export function createHrxCp976ClaudeReviewPacket() {
  return deepFreeze({
    gate: HRX_CP976_PACK_BINDING.claude_gate,
    pack_id: HRX_CP976_PACK_BINDING.pack_id,
    read_only: true,
    promotes_claude_to_final_approval: false,
    review_waived_by_user: true,
    review_questions: [
      "Do HumanApproval tail rows remain descriptor-only without final approval runtime, policy execution, decision emission, record writes, real approval data, or permission bypass?",
      "Do H30CommandMatrix foundation rows remain descriptor-only without H30 command execution runtime, policy execution, decision emission, record writes, real command data, or permission bypass?",
      "Does CP976 keep credentials, secrets, runtime receipts, enterprise trust, and separate HRX product claims closed?",
    ],
  });
}

export function createHrxCp976CloseoutHandoff() {
  return deepFreeze({
    from_pack_id: HRX_CP976_PACK_BINDING.pack_id,
    to_pack_id: HRX_CP976_PACK_BINDING.next_pack_id,
    next_subphase_id: HRX_CP976_PACK_BINDING.next_subphase_id,
    handoff_contract: "Continue RP30 P08 H30CommandMatrix tail and EvidenceTemplate descriptors while keeping final approval runtime, H30 command execution runtime, evidence-template runtime, policy execution, decision emission, record writes, real approval/command/evidence data, credentials, secrets, runtime receipts, enterprise trust, and separate-product claims closed.",
  });
}

export function createHrxCp976HumanApprovalH30CommandMatrixBridgeDescriptor() {
  const caseSet = createHrxCp976HumanApprovalH30CommandMatrixBridgeCaseSet();
  return deepFreeze({
    descriptor: "HrxCp976HumanApprovalH30CommandMatrixBridgeDescriptor",
    source_descriptor: "HrxCp975ClaudeDependencyHumanApprovalBridgeDescriptor",
    pack_id: HRX_CP976_PACK_BINDING.pack_id,
    planned_pack_id: HRX_CP976_PACK_BINDING.planned_pack_id,
    range: HRX_CP976_PACK_BINDING.range,
    program_contract: HRX_PROGRAM_CONTRACT,
    authority_boundary: {
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: HRX_CP976_PACK_BINDING.next_pack_id,
    },
    hrx_human_approval_h30_command_matrix_p08_bridge_case_set: caseSet,
    domain_entities: {
      HumanApproval: deepFreeze({
        descriptor_only: true,
        human_approval_runtime_opened: false,
        human_approval_record_write_opened: false,
        human_approval_real_data_allowed: false,
        human_approval_bypass_allowed: false,
        human_approval_policy_runtime_opened: false,
        human_approval_decision_emitted: false,
        human_approval_final_approval_runtime_opened: false,
      }),
      H30CommandMatrix: deepFreeze({
        descriptor_only: true,
        h30_command_matrix_runtime_opened: false,
        h30_command_matrix_record_write_opened: false,
        h30_command_matrix_real_data_allowed: false,
        h30_command_matrix_bypass_allowed: false,
        h30_command_matrix_policy_runtime_opened: false,
        h30_command_matrix_decision_emitted: false,
        h30_command_matrix_command_execution_runtime_opened: false,
      }),
    },
    baseline_decisions: {
      hrx_embedded_inside_law_firm_os: true,
      separate_hrx_product_created: false,
      human_approval_p08_tail_descriptor_only: true,
      human_approval_runtime_deferred: true,
      human_approval_record_writes_deferred: true,
      human_approval_real_approval_data_deferred: true,
      human_approval_bypass_deferred: true,
      human_approval_policy_runtime_deferred: true,
      human_approval_decision_emission_deferred: true,
      human_approval_final_approval_runtime_deferred: true,
      h30_command_matrix_p08_foundation_descriptor_only: true,
      h30_command_matrix_runtime_deferred: true,
      h30_command_matrix_record_writes_deferred: true,
      h30_command_matrix_real_command_data_deferred: true,
      h30_command_matrix_bypass_deferred: true,
      h30_command_matrix_policy_runtime_deferred: true,
      h30_command_matrix_decision_emission_deferred: true,
      h30_command_matrix_command_execution_runtime_deferred: true,
      payroll_calculation_runtime_deferred: true,
      hr_ai_final_judgment_allowed: false,
      sensitive_hr_guard_required: true,
      real_employee_candidate_payroll_document_data_allowed: false,
    },
    requirement_refs: [
      "HRX-CORE-001",
      "HRX-CORE-002",
      "HRX-CORE-003",
      "HRX-GATE-001",
      "HRX-GATE-002",
      "HRX-GATE-003",
      "HRX-GATE-004",
      "HRX-GATE-005",
      "HRX-GATE-006",
    ],
    hermes_packet: createHrxCp976HermesEvidencePacket(),
    claude_packet: createHrxCp976ClaudeReviewPacket(),
    closeout_handoff: createHrxCp976CloseoutHandoff(),
    required_capabilities: HRX_CP976_REQUIREMENTS.required_capabilities,
    safety_gates: HRX_CP976_REQUIREMENTS.safety_gates,
    no_leak_guards: HRX_CP976_REQUIREMENTS.required_no_leak_guards,
    blocked_claims: HRX_BLOCKED_CLAIMS,
    ...HRX_NO_WRITE_ATTESTATION,
  });
}

export function createHrxCp977H30CommandMatrixEvidenceTemplateBridgeCaseSet() {
  const sections = {};
  for (const [microId, titles] of Object.entries(HRX_CP977_REQUIRED_SECTION_ROWS)) {
    sections[microId] = deepFreeze({
      micro_phase_id: microId,
      row_count: titles.length,
      rows: createHrxDomainRows(microId, titles),
    });
  }
  return deepFreeze({
    pack_id: HRX_CP977_PACK_BINDING.pack_id,
    section_count: Object.keys(sections).length,
    row_count: Object.values(sections).reduce((sum, section) => sum + section.row_count, 0),
    sections,
  });
}

export function createHrxCp977HermesEvidencePacket() {
  return deepFreeze({
    gate: HRX_CP977_PACK_BINDING.hermes_gate,
    pack_id: HRX_CP977_PACK_BINDING.pack_id,
    evidence_kind: "hrx_h30_command_matrix_evidence_template_p08_bridge",
    emits_runtime_receipt: false,
    deterministic_only: true,
    validation_commands: ["npm run rp30:hrx:validate", "npm run rp30:validate", "npm run hrx:requirements:validate", "npm run hrx:weighted:validate"],
    boundary_assertions: [
      "h30_command_matrix_p08_tail_descriptor",
      "h30_command_matrix_runtime_deferred",
      "h30_command_matrix_record_writes_deferred",
      "h30_command_matrix_real_command_data_excluded",
      "h30_command_matrix_policy_runtime_deferred",
      "h30_command_matrix_decision_emission_deferred",
      "h30_command_matrix_command_execution_runtime_deferred",
      "evidence_template_p08_foundation_descriptor",
      "evidence_template_runtime_deferred",
      "evidence_template_record_writes_deferred",
      "evidence_template_real_evidence_data_excluded",
      "evidence_template_policy_runtime_deferred",
      "evidence_template_decision_emission_deferred",
      "evidence_template_render_runtime_deferred",
      "credentials_and_secrets_excluded",
    ],
  });
}

export function createHrxCp977ClaudeReviewPacket() {
  return deepFreeze({
    gate: HRX_CP977_PACK_BINDING.claude_gate,
    pack_id: HRX_CP977_PACK_BINDING.pack_id,
    read_only: true,
    promotes_claude_to_final_approval: false,
    review_waived_by_user: true,
    review_questions: [
      "Do H30CommandMatrix tail rows remain descriptor-only without H30 command execution runtime, policy execution, decision emission, record writes, real command data, or permission bypass?",
      "Do EvidenceTemplate foundation rows remain descriptor-only without evidence-template runtime, render runtime, policy execution, decision emission, record writes, real evidence data, or permission bypass?",
      "Does CP977 keep credentials, secrets, runtime receipts, enterprise trust, and separate HRX product claims closed?",
    ],
  });
}

export function createHrxCp977CloseoutHandoff() {
  return deepFreeze({
    from_pack_id: HRX_CP977_PACK_BINDING.pack_id,
    to_pack_id: HRX_CP977_PACK_BINDING.next_pack_id,
    next_subphase_id: HRX_CP977_PACK_BINDING.next_subphase_id,
    handoff_contract: "Continue RP30 P08 EvidenceTemplate tail and NoRealData descriptors while keeping H30 command execution runtime, evidence-template runtime, render runtime, no-real-data enforcement runtime, policy execution, decision emission, record writes, real command/evidence/data payloads, credentials, secrets, runtime receipts, enterprise trust, and separate-product claims closed.",
  });
}

export function createHrxCp977H30CommandMatrixEvidenceTemplateBridgeDescriptor() {
  const caseSet = createHrxCp977H30CommandMatrixEvidenceTemplateBridgeCaseSet();
  return deepFreeze({
    descriptor: "HrxCp977H30CommandMatrixEvidenceTemplateBridgeDescriptor",
    source_descriptor: "HrxCp976HumanApprovalH30CommandMatrixBridgeDescriptor",
    pack_id: HRX_CP977_PACK_BINDING.pack_id,
    planned_pack_id: HRX_CP977_PACK_BINDING.planned_pack_id,
    range: HRX_CP977_PACK_BINDING.range,
    program_contract: HRX_PROGRAM_CONTRACT,
    authority_boundary: {
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: HRX_CP977_PACK_BINDING.next_pack_id,
    },
    hrx_h30_command_matrix_evidence_template_p08_bridge_case_set: caseSet,
    domain_entities: {
      H30CommandMatrix: deepFreeze({
        descriptor_only: true,
        h30_command_matrix_runtime_opened: false,
        h30_command_matrix_record_write_opened: false,
        h30_command_matrix_real_data_allowed: false,
        h30_command_matrix_bypass_allowed: false,
        h30_command_matrix_policy_runtime_opened: false,
        h30_command_matrix_decision_emitted: false,
        h30_command_matrix_command_execution_runtime_opened: false,
      }),
      EvidenceTemplate: deepFreeze({
        descriptor_only: true,
        evidence_template_runtime_opened: false,
        evidence_template_record_write_opened: false,
        evidence_template_real_data_allowed: false,
        evidence_template_bypass_allowed: false,
        evidence_template_policy_runtime_opened: false,
        evidence_template_decision_emitted: false,
        evidence_template_render_runtime_opened: false,
      }),
    },
    baseline_decisions: {
      hrx_embedded_inside_law_firm_os: true,
      separate_hrx_product_created: false,
      h30_command_matrix_p08_tail_descriptor_only: true,
      h30_command_matrix_runtime_deferred: true,
      h30_command_matrix_record_writes_deferred: true,
      h30_command_matrix_real_command_data_deferred: true,
      h30_command_matrix_bypass_deferred: true,
      h30_command_matrix_policy_runtime_deferred: true,
      h30_command_matrix_decision_emission_deferred: true,
      h30_command_matrix_command_execution_runtime_deferred: true,
      evidence_template_p08_foundation_descriptor_only: true,
      evidence_template_runtime_deferred: true,
      evidence_template_record_writes_deferred: true,
      evidence_template_real_evidence_data_deferred: true,
      evidence_template_bypass_deferred: true,
      evidence_template_policy_runtime_deferred: true,
      evidence_template_decision_emission_deferred: true,
      evidence_template_render_runtime_deferred: true,
      payroll_calculation_runtime_deferred: true,
      hr_ai_final_judgment_allowed: false,
      sensitive_hr_guard_required: true,
      real_employee_candidate_payroll_document_data_allowed: false,
    },
    requirement_refs: [
      "HRX-CORE-001",
      "HRX-CORE-002",
      "HRX-CORE-003",
      "HRX-GATE-001",
      "HRX-GATE-002",
      "HRX-GATE-003",
      "HRX-GATE-004",
      "HRX-GATE-005",
      "HRX-GATE-006",
    ],
    hermes_packet: createHrxCp977HermesEvidencePacket(),
    claude_packet: createHrxCp977ClaudeReviewPacket(),
    closeout_handoff: createHrxCp977CloseoutHandoff(),
    required_capabilities: HRX_CP977_REQUIREMENTS.required_capabilities,
    safety_gates: HRX_CP977_REQUIREMENTS.safety_gates,
    no_leak_guards: HRX_CP977_REQUIREMENTS.required_no_leak_guards,
    blocked_claims: HRX_BLOCKED_CLAIMS,
    ...HRX_NO_WRITE_ATTESTATION,
  });
}

export function createHrxCp978EvidenceTemplateNoRealDataBridgeCaseSet() {
  const sections = {};
  for (const [microId, titles] of Object.entries(HRX_CP978_REQUIRED_SECTION_ROWS)) {
    sections[microId] = deepFreeze({
      micro_phase_id: microId,
      row_count: titles.length,
      rows: createHrxDomainRows(microId, titles),
    });
  }
  return deepFreeze({
    pack_id: HRX_CP978_PACK_BINDING.pack_id,
    section_count: Object.keys(sections).length,
    row_count: Object.values(sections).reduce((sum, section) => sum + section.row_count, 0),
    sections,
  });
}

export function createHrxCp978HermesEvidencePacket() {
  return deepFreeze({
    gate: HRX_CP978_PACK_BINDING.hermes_gate,
    pack_id: HRX_CP978_PACK_BINDING.pack_id,
    evidence_kind: "hrx_evidence_template_no_real_data_p08_tail_bridge",
    emits_runtime_receipt: false,
    deterministic_only: true,
    validation_commands: ["npm run rp30:hrx:validate", "npm run rp30:validate", "npm run hrx:requirements:validate", "npm run hrx:weighted:validate"],
    boundary_assertions: [
      "evidence_template_p08_tail_descriptor",
      "evidence_template_runtime_deferred",
      "evidence_template_record_writes_deferred",
      "evidence_template_real_evidence_data_excluded",
      "evidence_template_policy_runtime_deferred",
      "evidence_template_decision_emission_deferred",
      "evidence_template_render_runtime_deferred",
      "no_real_data_p08_foundation_descriptor",
      "no_real_data_runtime_deferred",
      "no_real_data_record_writes_deferred",
      "no_real_data_real_data_excluded",
      "no_real_data_bypass_deferred",
      "no_real_data_policy_runtime_deferred",
      "no_real_data_decision_emission_deferred",
      "no_real_data_enforcement_runtime_deferred",
      "credentials_and_secrets_excluded",
    ],
  });
}

export function createHrxCp978ClaudeReviewPacket() {
  return deepFreeze({
    gate: HRX_CP978_PACK_BINDING.claude_gate,
    pack_id: HRX_CP978_PACK_BINDING.pack_id,
    read_only: true,
    promotes_claude_to_final_approval: false,
    review_waived_by_user: true,
    review_questions: [
      "Do EvidenceTemplate tail rows remain descriptor-only without evidence-template runtime, render runtime, policy execution, decision emission, record writes, real evidence data, or permission bypass?",
      "Do NoRealData foundation rows remain descriptor-only without no-real-data enforcement runtime, policy execution, decision emission, record writes, real data payloads, or permission bypass?",
      "Does CP978 keep credentials, secrets, runtime receipts, enterprise trust, and separate HRX product claims closed?",
    ],
  });
}

export function createHrxCp978CloseoutHandoff() {
  return deepFreeze({
    from_pack_id: HRX_CP978_PACK_BINDING.pack_id,
    to_pack_id: HRX_CP978_PACK_BINDING.next_pack_id,
    next_subphase_id: HRX_CP978_PACK_BINDING.next_subphase_id,
    handoff_contract: "Continue RP30 P08 NoRealData tail, BlockedClaims descriptors, and ClaudeDependency descriptors while keeping no-real-data enforcement runtime, blocked-claim override runtime, Claude review runtime, policy execution, decision emission, record writes, real data/claim/review payloads, credentials, secrets, runtime receipts, enterprise trust, and separate-product claims closed.",
  });
}

export function createHrxCp978EvidenceTemplateNoRealDataBridgeDescriptor() {
  const caseSet = createHrxCp978EvidenceTemplateNoRealDataBridgeCaseSet();
  return deepFreeze({
    descriptor: "HrxCp978EvidenceTemplateNoRealDataBridgeDescriptor",
    source_descriptor: "HrxCp977H30CommandMatrixEvidenceTemplateBridgeDescriptor",
    pack_id: HRX_CP978_PACK_BINDING.pack_id,
    planned_pack_id: HRX_CP978_PACK_BINDING.planned_pack_id,
    range: HRX_CP978_PACK_BINDING.range,
    program_contract: HRX_PROGRAM_CONTRACT,
    authority_boundary: {
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: HRX_CP978_PACK_BINDING.next_pack_id,
    },
    hrx_evidence_template_no_real_data_p08_tail_bridge_case_set: caseSet,
    domain_entities: {
      EvidenceTemplate: deepFreeze({
        descriptor_only: true,
        evidence_template_runtime_opened: false,
        evidence_template_record_write_opened: false,
        evidence_template_real_data_allowed: false,
        evidence_template_bypass_allowed: false,
        evidence_template_policy_runtime_opened: false,
        evidence_template_decision_emitted: false,
        evidence_template_render_runtime_opened: false,
      }),
      NoRealData: deepFreeze({
        descriptor_only: true,
        no_real_data_runtime_opened: false,
        no_real_data_record_write_opened: false,
        no_real_data_real_data_allowed: false,
        no_real_data_bypass_allowed: false,
        no_real_data_policy_runtime_opened: false,
        no_real_data_decision_emitted: false,
        no_real_data_enforcement_runtime_opened: false,
      }),
    },
    baseline_decisions: {
      hrx_embedded_inside_law_firm_os: true,
      separate_hrx_product_created: false,
      evidence_template_p08_tail_descriptor_only: true,
      evidence_template_runtime_deferred: true,
      evidence_template_record_writes_deferred: true,
      evidence_template_real_evidence_data_deferred: true,
      evidence_template_bypass_deferred: true,
      evidence_template_policy_runtime_deferred: true,
      evidence_template_decision_emission_deferred: true,
      evidence_template_render_runtime_deferred: true,
      no_real_data_p08_foundation_descriptor_only: true,
      no_real_data_runtime_deferred: true,
      no_real_data_record_writes_deferred: true,
      no_real_data_real_data_deferred: true,
      no_real_data_bypass_deferred: true,
      no_real_data_policy_runtime_deferred: true,
      no_real_data_decision_emission_deferred: true,
      no_real_data_enforcement_runtime_deferred: true,
      payroll_calculation_runtime_deferred: true,
      hr_ai_final_judgment_allowed: false,
      sensitive_hr_guard_required: true,
      real_employee_candidate_payroll_document_data_allowed: false,
    },
    requirement_refs: [
      "HRX-CORE-001",
      "HRX-CORE-002",
      "HRX-CORE-003",
      "HRX-GATE-001",
      "HRX-GATE-002",
      "HRX-GATE-003",
      "HRX-GATE-004",
      "HRX-GATE-005",
      "HRX-GATE-006",
    ],
    hermes_packet: createHrxCp978HermesEvidencePacket(),
    claude_packet: createHrxCp978ClaudeReviewPacket(),
    closeout_handoff: createHrxCp978CloseoutHandoff(),
    required_capabilities: HRX_CP978_REQUIREMENTS.required_capabilities,
    safety_gates: HRX_CP978_REQUIREMENTS.safety_gates,
    no_leak_guards: HRX_CP978_REQUIREMENTS.required_no_leak_guards,
    blocked_claims: HRX_BLOCKED_CLAIMS,
    ...HRX_NO_WRITE_ATTESTATION,
  });
}

export function createHrxCp979NoRealDataBlockedClaimsClaudeDependencyBridgeCaseSet() {
  const sections = {};
  for (const [microId, titles] of Object.entries(HRX_CP979_REQUIRED_SECTION_ROWS)) {
    sections[microId] = deepFreeze({
      micro_phase_id: microId,
      row_count: titles.length,
      rows: createHrxDomainRows(microId, titles),
    });
  }
  return deepFreeze({
    pack_id: HRX_CP979_PACK_BINDING.pack_id,
    section_count: Object.keys(sections).length,
    row_count: Object.values(sections).reduce((sum, section) => sum + section.row_count, 0),
    sections,
  });
}

export function createHrxCp979HermesEvidencePacket() {
  return deepFreeze({
    gate: HRX_CP979_PACK_BINDING.hermes_gate,
    pack_id: HRX_CP979_PACK_BINDING.pack_id,
    evidence_kind: "hrx_no_real_data_blocked_claims_claude_dependency_p08_bridge",
    emits_runtime_receipt: false,
    deterministic_only: true,
    validation_commands: ["npm run rp30:hrx:validate", "npm run rp30:validate", "npm run hrx:requirements:validate", "npm run hrx:weighted:validate"],
    boundary_assertions: [
      "no_real_data_p08_tail_descriptor",
      "no_real_data_runtime_deferred",
      "no_real_data_record_writes_deferred",
      "no_real_data_real_data_excluded",
      "no_real_data_bypass_deferred",
      "no_real_data_policy_runtime_deferred",
      "no_real_data_decision_emission_deferred",
      "no_real_data_enforcement_runtime_deferred",
      "blocked_claims_p08_foundation_descriptor",
      "blocked_claims_runtime_deferred",
      "blocked_claims_record_writes_deferred",
      "blocked_claims_real_claim_data_excluded",
      "blocked_claims_bypass_deferred",
      "blocked_claims_policy_runtime_deferred",
      "blocked_claims_decision_emission_deferred",
      "blocked_claims_claim_override_runtime_deferred",
      "claude_dependency_p08_foundation_descriptor",
      "claude_dependency_runtime_deferred",
      "claude_dependency_record_writes_deferred",
      "claude_dependency_real_review_data_excluded",
      "claude_dependency_bypass_deferred",
      "claude_dependency_policy_runtime_deferred",
      "claude_dependency_decision_emission_deferred",
      "claude_dependency_review_runtime_deferred",
      "credentials_and_secrets_excluded",
    ],
  });
}

export function createHrxCp979ClaudeReviewPacket() {
  return deepFreeze({
    gate: HRX_CP979_PACK_BINDING.claude_gate,
    pack_id: HRX_CP979_PACK_BINDING.pack_id,
    read_only: true,
    promotes_claude_to_final_approval: false,
    review_waived_by_user: true,
    review_questions: [
      "Do NoRealData tail rows remain descriptor-only without no-real-data enforcement runtime, policy execution, decision emission, record writes, real data payloads, or permission bypass?",
      "Do BlockedClaims foundation rows remain descriptor-only without claim override runtime, policy execution, decision emission, record writes, real claim data, or permission bypass?",
      "Do ClaudeDependency foundation rows remain descriptor-only without Claude review runtime, policy execution, decision emission, record writes, real review data, or permission bypass?",
      "Does CP979 keep credentials, secrets, runtime receipts, enterprise trust, and separate HRX product claims closed?",
    ],
  });
}

export function createHrxCp979CloseoutHandoff() {
  return deepFreeze({
    from_pack_id: HRX_CP979_PACK_BINDING.pack_id,
    to_pack_id: HRX_CP979_PACK_BINDING.next_pack_id,
    next_subphase_id: HRX_CP979_PACK_BINDING.next_subphase_id,
    handoff_contract: "Continue RP30 P08 ClaudeDependency tail and RP30 P09 descriptors while keeping no-real-data enforcement runtime, blocked-claim override runtime, Claude review runtime, policy execution, decision emission, record writes, real data/claim/review payloads, credentials, secrets, runtime receipts, enterprise trust, and separate-product claims closed.",
  });
}

export function createHrxCp979NoRealDataBlockedClaimsClaudeDependencyBridgeDescriptor() {
  const caseSet = createHrxCp979NoRealDataBlockedClaimsClaudeDependencyBridgeCaseSet();
  return deepFreeze({
    descriptor: "HrxCp979NoRealDataBlockedClaimsClaudeDependencyBridgeDescriptor",
    source_descriptor: "HrxCp978EvidenceTemplateNoRealDataBridgeDescriptor",
    pack_id: HRX_CP979_PACK_BINDING.pack_id,
    planned_pack_id: HRX_CP979_PACK_BINDING.planned_pack_id,
    range: HRX_CP979_PACK_BINDING.range,
    program_contract: HRX_PROGRAM_CONTRACT,
    authority_boundary: {
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: HRX_CP979_PACK_BINDING.next_pack_id,
    },
    hrx_no_real_data_blocked_claims_claude_dependency_p08_bridge_case_set: caseSet,
    domain_entities: {
      NoRealData: deepFreeze({
        descriptor_only: true,
        no_real_data_runtime_opened: false,
        no_real_data_record_write_opened: false,
        no_real_data_real_data_allowed: false,
        no_real_data_bypass_allowed: false,
        no_real_data_policy_runtime_opened: false,
        no_real_data_decision_emitted: false,
        no_real_data_enforcement_runtime_opened: false,
      }),
      BlockedClaims: deepFreeze({
        descriptor_only: true,
        blocked_claims_runtime_opened: false,
        blocked_claims_record_write_opened: false,
        blocked_claims_real_data_allowed: false,
        blocked_claims_bypass_allowed: false,
        blocked_claims_policy_runtime_opened: false,
        blocked_claims_decision_emitted: false,
        blocked_claims_claim_override_runtime_opened: false,
      }),
      ClaudeDependency: deepFreeze({
        descriptor_only: true,
        claude_dependency_runtime_opened: false,
        claude_dependency_record_write_opened: false,
        claude_dependency_real_data_allowed: false,
        claude_dependency_bypass_allowed: false,
        claude_dependency_policy_runtime_opened: false,
        claude_dependency_decision_emitted: false,
        claude_dependency_review_runtime_opened: false,
      }),
    },
    baseline_decisions: {
      hrx_embedded_inside_law_firm_os: true,
      separate_hrx_product_created: false,
      no_real_data_p08_tail_descriptor_only: true,
      no_real_data_runtime_deferred: true,
      no_real_data_record_writes_deferred: true,
      no_real_data_real_data_deferred: true,
      no_real_data_bypass_deferred: true,
      no_real_data_policy_runtime_deferred: true,
      no_real_data_decision_emission_deferred: true,
      no_real_data_enforcement_runtime_deferred: true,
      blocked_claims_p08_foundation_descriptor_only: true,
      blocked_claims_runtime_deferred: true,
      blocked_claims_record_writes_deferred: true,
      blocked_claims_real_claim_data_deferred: true,
      blocked_claims_bypass_deferred: true,
      blocked_claims_policy_runtime_deferred: true,
      blocked_claims_decision_emission_deferred: true,
      blocked_claims_claim_override_runtime_deferred: true,
      claude_dependency_p08_foundation_descriptor_only: true,
      claude_dependency_runtime_deferred: true,
      claude_dependency_record_writes_deferred: true,
      claude_dependency_real_review_data_deferred: true,
      claude_dependency_bypass_deferred: true,
      claude_dependency_policy_runtime_deferred: true,
      claude_dependency_decision_emission_deferred: true,
      claude_dependency_review_runtime_deferred: true,
      payroll_calculation_runtime_deferred: true,
      hr_ai_final_judgment_allowed: false,
      sensitive_hr_guard_required: true,
      real_employee_candidate_payroll_document_data_allowed: false,
    },
    requirement_refs: [
      "HRX-CORE-001",
      "HRX-CORE-002",
      "HRX-CORE-003",
      "HRX-GATE-001",
      "HRX-GATE-002",
      "HRX-GATE-003",
      "HRX-GATE-004",
      "HRX-GATE-005",
      "HRX-GATE-006",
    ],
    hermes_packet: createHrxCp979HermesEvidencePacket(),
    claude_packet: createHrxCp979ClaudeReviewPacket(),
    closeout_handoff: createHrxCp979CloseoutHandoff(),
    required_capabilities: HRX_CP979_REQUIREMENTS.required_capabilities,
    safety_gates: HRX_CP979_REQUIREMENTS.safety_gates,
    no_leak_guards: HRX_CP979_REQUIREMENTS.required_no_leak_guards,
    blocked_claims: HRX_BLOCKED_CLAIMS,
    ...HRX_NO_WRITE_ATTESTATION,
  });
}

export function createHrxCp980ClaudeDependencyArchitectureReviewBridgeCaseSet() {
  const sections = {};
  for (const [microId, titles] of Object.entries(HRX_CP980_REQUIRED_SECTION_ROWS)) {
    sections[microId] = deepFreeze({
      micro_phase_id: microId,
      row_count: titles.length,
      rows: createHrxDomainRows(microId, titles),
    });
  }
  return deepFreeze({
    pack_id: HRX_CP980_PACK_BINDING.pack_id,
    section_count: Object.keys(sections).length,
    row_count: Object.values(sections).reduce((sum, section) => sum + section.row_count, 0),
    sections,
  });
}

export function createHrxCp980HermesEvidencePacket() {
  return deepFreeze({
    gate: HRX_CP980_PACK_BINDING.hermes_gate,
    pack_id: HRX_CP980_PACK_BINDING.pack_id,
    evidence_kind: "hrx_claude_dependency_architecture_review_p09_bridge",
    emits_runtime_receipt: false,
    deterministic_only: true,
    validation_commands: ["npm run rp30:hrx:validate", "npm run rp30:validate", "npm run hrx:requirements:validate", "npm run hrx:weighted:validate"],
    boundary_assertions: [
      "claude_dependency_p08_tail_descriptor",
      "claude_dependency_runtime_deferred",
      "claude_dependency_record_writes_deferred",
      "claude_dependency_real_review_data_excluded",
      "claude_dependency_bypass_deferred",
      "claude_dependency_policy_runtime_deferred",
      "claude_dependency_decision_emission_deferred",
      "claude_dependency_review_runtime_deferred",
      "architecture_review_p09_foundation_descriptor",
      "architecture_review_runtime_deferred",
      "architecture_review_record_writes_deferred",
      "architecture_review_real_review_data_excluded",
      "architecture_review_bypass_deferred",
      "architecture_review_policy_runtime_deferred",
      "architecture_review_decision_emission_deferred",
      "architecture_review_final_approval_runtime_deferred",
      "credentials_and_secrets_excluded",
    ],
  });
}

export function createHrxCp980ClaudeReviewPacket() {
  return deepFreeze({
    gate: HRX_CP980_PACK_BINDING.claude_gate,
    pack_id: HRX_CP980_PACK_BINDING.pack_id,
    read_only: true,
    promotes_claude_to_final_approval: false,
    review_waived_by_user: true,
    review_questions: [
      "Do ClaudeDependency tail rows remain descriptor-only without Claude review runtime, policy execution, decision emission, record writes, real review data, or permission bypass?",
      "Do ArchitectureReview foundation rows remain descriptor-only without architecture review runtime, final approval runtime, policy execution, decision emission, record writes, real review data, or permission bypass?",
      "Does CP980 keep credentials, secrets, runtime receipts, enterprise trust, and separate HRX product claims closed?",
    ],
  });
}

export function createHrxCp980CloseoutHandoff() {
  return deepFreeze({
    from_pack_id: HRX_CP980_PACK_BINDING.pack_id,
    to_pack_id: HRX_CP980_PACK_BINDING.next_pack_id,
    next_subphase_id: HRX_CP980_PACK_BINDING.next_subphase_id,
    handoff_contract: "Continue RP30 P09 ArchitectureReview, SecurityReview, and BypassReview descriptors while keeping Claude review runtime, architecture final approval runtime, policy execution, decision emission, record writes, real review data, credentials, secrets, runtime receipts, enterprise trust, and separate-product claims closed.",
  });
}

export function createHrxCp980ClaudeDependencyArchitectureReviewBridgeDescriptor() {
  const caseSet = createHrxCp980ClaudeDependencyArchitectureReviewBridgeCaseSet();
  return deepFreeze({
    descriptor: "HrxCp980ClaudeDependencyArchitectureReviewBridgeDescriptor",
    source_descriptor: "HrxCp979NoRealDataBlockedClaimsClaudeDependencyBridgeDescriptor",
    pack_id: HRX_CP980_PACK_BINDING.pack_id,
    planned_pack_id: HRX_CP980_PACK_BINDING.planned_pack_id,
    range: HRX_CP980_PACK_BINDING.range,
    program_contract: HRX_PROGRAM_CONTRACT,
    authority_boundary: {
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: HRX_CP980_PACK_BINDING.next_pack_id,
    },
    hrx_claude_dependency_architecture_review_p09_bridge_case_set: caseSet,
    domain_entities: {
      ClaudeDependency: deepFreeze({
        descriptor_only: true,
        claude_dependency_runtime_opened: false,
        claude_dependency_record_write_opened: false,
        claude_dependency_real_data_allowed: false,
        claude_dependency_bypass_allowed: false,
        claude_dependency_policy_runtime_opened: false,
        claude_dependency_decision_emitted: false,
        claude_dependency_review_runtime_opened: false,
      }),
      ArchitectureReview: deepFreeze({
        descriptor_only: true,
        architecture_review_runtime_opened: false,
        architecture_review_record_write_opened: false,
        architecture_review_real_data_allowed: false,
        architecture_review_bypass_allowed: false,
        architecture_review_policy_runtime_opened: false,
        architecture_review_decision_emitted: false,
        architecture_review_final_approval_runtime_opened: false,
      }),
    },
    baseline_decisions: {
      hrx_embedded_inside_law_firm_os: true,
      separate_hrx_product_created: false,
      claude_dependency_p08_tail_descriptor_only: true,
      claude_dependency_runtime_deferred: true,
      claude_dependency_record_writes_deferred: true,
      claude_dependency_real_review_data_deferred: true,
      claude_dependency_bypass_deferred: true,
      claude_dependency_policy_runtime_deferred: true,
      claude_dependency_decision_emission_deferred: true,
      claude_dependency_review_runtime_deferred: true,
      architecture_review_p09_foundation_descriptor_only: true,
      architecture_review_runtime_deferred: true,
      architecture_review_record_writes_deferred: true,
      architecture_review_real_review_data_deferred: true,
      architecture_review_bypass_deferred: true,
      architecture_review_policy_runtime_deferred: true,
      architecture_review_decision_emission_deferred: true,
      architecture_review_final_approval_runtime_deferred: true,
      payroll_calculation_runtime_deferred: true,
      hr_ai_final_judgment_allowed: false,
      sensitive_hr_guard_required: true,
      real_employee_candidate_payroll_document_data_allowed: false,
    },
    requirement_refs: [
      "HRX-CORE-001",
      "HRX-CORE-002",
      "HRX-CORE-003",
      "HRX-GATE-001",
      "HRX-GATE-002",
      "HRX-GATE-003",
      "HRX-GATE-004",
      "HRX-GATE-005",
      "HRX-GATE-006",
    ],
    hermes_packet: createHrxCp980HermesEvidencePacket(),
    claude_packet: createHrxCp980ClaudeReviewPacket(),
    closeout_handoff: createHrxCp980CloseoutHandoff(),
    required_capabilities: HRX_CP980_REQUIREMENTS.required_capabilities,
    safety_gates: HRX_CP980_REQUIREMENTS.safety_gates,
    no_leak_guards: HRX_CP980_REQUIREMENTS.required_no_leak_guards,
    blocked_claims: HRX_BLOCKED_CLAIMS,
    ...HRX_NO_WRITE_ATTESTATION,
  });
}

export function createHrxCp981ArchitectureSecurityBypassReviewBridgeCaseSet() {
  const sections = {};
  for (const [microId, titles] of Object.entries(HRX_CP981_REQUIRED_SECTION_ROWS)) {
    sections[microId] = deepFreeze({
      micro_phase_id: microId,
      row_count: titles.length,
      rows: createHrxDomainRows(microId, titles),
    });
  }
  return deepFreeze({
    pack_id: HRX_CP981_PACK_BINDING.pack_id,
    section_count: Object.keys(sections).length,
    row_count: Object.values(sections).reduce((sum, section) => sum + section.row_count, 0),
    sections,
  });
}

export function createHrxCp981HermesEvidencePacket() {
  return deepFreeze({
    gate: HRX_CP981_PACK_BINDING.hermes_gate,
    pack_id: HRX_CP981_PACK_BINDING.pack_id,
    evidence_kind: "hrx_architecture_security_bypass_review_p09_bridge",
    emits_runtime_receipt: false,
    deterministic_only: true,
    validation_commands: ["npm run rp30:hrx:validate", "npm run rp30:validate", "npm run hrx:requirements:validate", "npm run hrx:weighted:validate"],
    boundary_assertions: [
      "architecture_review_p09_tail_descriptor",
      "architecture_review_runtime_deferred",
      "architecture_review_record_writes_deferred",
      "architecture_review_real_review_data_excluded",
      "architecture_review_bypass_deferred",
      "architecture_review_policy_runtime_deferred",
      "architecture_review_decision_emission_deferred",
      "architecture_review_final_approval_runtime_deferred",
      "security_review_p09_foundation_descriptor",
      "security_review_runtime_deferred",
      "security_review_record_writes_deferred",
      "security_review_real_review_data_excluded",
      "security_review_bypass_deferred",
      "security_review_policy_runtime_deferred",
      "security_review_decision_emission_deferred",
      "security_review_final_approval_runtime_deferred",
      "bypass_review_p09_foundation_descriptor",
      "bypass_review_runtime_deferred",
      "bypass_review_record_writes_deferred",
      "bypass_review_real_review_data_excluded",
      "bypass_review_bypass_deferred",
      "bypass_review_policy_runtime_deferred",
      "bypass_review_decision_emission_deferred",
      "bypass_review_final_approval_runtime_deferred",
      "bypass_review_override_runtime_deferred",
      "credentials_and_secrets_excluded",
    ],
  });
}

export function createHrxCp981ClaudeReviewPacket() {
  return deepFreeze({
    gate: HRX_CP981_PACK_BINDING.claude_gate,
    pack_id: HRX_CP981_PACK_BINDING.pack_id,
    read_only: true,
    promotes_claude_to_final_approval: false,
    review_waived_by_user: true,
    review_questions: [
      "Do ArchitectureReview tail rows remain descriptor-only without architecture review runtime, final approval runtime, policy execution, decision emission, record writes, real review data, or permission bypass?",
      "Do SecurityReview foundation rows remain descriptor-only without security review runtime, final approval runtime, policy execution, decision emission, record writes, real review data, or permission bypass?",
      "Do BypassReview foundation rows remain descriptor-only without bypass override runtime, final approval runtime, policy execution, decision emission, record writes, real review data, or permission bypass?",
      "Does CP981 keep credentials, secrets, runtime receipts, enterprise trust, and separate HRX product claims closed?",
    ],
  });
}

export function createHrxCp981CloseoutHandoff() {
  return deepFreeze({
    from_pack_id: HRX_CP981_PACK_BINDING.pack_id,
    to_pack_id: HRX_CP981_PACK_BINDING.next_pack_id,
    next_subphase_id: HRX_CP981_PACK_BINDING.next_subphase_id,
    handoff_contract: "Continue RP30 P09 BypassReview and downstream review descriptors while keeping Claude review runtime, final approval runtime, policy execution, decision emission, record writes, real review data, credentials, secrets, runtime receipts, enterprise trust, and separate-product claims closed.",
  });
}

export function createHrxCp981ArchitectureSecurityBypassReviewBridgeDescriptor() {
  const caseSet = createHrxCp981ArchitectureSecurityBypassReviewBridgeCaseSet();
  return deepFreeze({
    descriptor: "HrxCp981ArchitectureSecurityBypassReviewBridgeDescriptor",
    source_descriptor: "HrxCp980ClaudeDependencyArchitectureReviewBridgeDescriptor",
    pack_id: HRX_CP981_PACK_BINDING.pack_id,
    planned_pack_id: HRX_CP981_PACK_BINDING.planned_pack_id,
    range: HRX_CP981_PACK_BINDING.range,
    program_contract: HRX_PROGRAM_CONTRACT,
    authority_boundary: {
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: HRX_CP981_PACK_BINDING.next_pack_id,
    },
    hrx_architecture_security_bypass_review_p09_bridge_case_set: caseSet,
    domain_entities: {
      ArchitectureReview: deepFreeze({
        descriptor_only: true,
        architecture_review_runtime_opened: false,
        architecture_review_record_write_opened: false,
        architecture_review_real_data_allowed: false,
        architecture_review_bypass_allowed: false,
        architecture_review_policy_runtime_opened: false,
        architecture_review_decision_emitted: false,
        architecture_review_final_approval_runtime_opened: false,
      }),
      SecurityReview: deepFreeze({
        descriptor_only: true,
        security_review_runtime_opened: false,
        security_review_record_write_opened: false,
        security_review_real_data_allowed: false,
        security_review_bypass_allowed: false,
        security_review_policy_runtime_opened: false,
        security_review_decision_emitted: false,
        security_review_final_approval_runtime_opened: false,
      }),
      BypassReview: deepFreeze({
        descriptor_only: true,
        bypass_review_runtime_opened: false,
        bypass_review_record_write_opened: false,
        bypass_review_real_data_allowed: false,
        bypass_review_bypass_allowed: false,
        bypass_review_policy_runtime_opened: false,
        bypass_review_decision_emitted: false,
        bypass_review_final_approval_runtime_opened: false,
        bypass_review_override_runtime_opened: false,
      }),
    },
    baseline_decisions: {
      hrx_embedded_inside_law_firm_os: true,
      separate_hrx_product_created: false,
      architecture_review_p09_tail_descriptor_only: true,
      architecture_review_runtime_deferred: true,
      architecture_review_record_writes_deferred: true,
      architecture_review_real_review_data_deferred: true,
      architecture_review_bypass_deferred: true,
      architecture_review_policy_runtime_deferred: true,
      architecture_review_decision_emission_deferred: true,
      architecture_review_final_approval_runtime_deferred: true,
      security_review_p09_foundation_descriptor_only: true,
      security_review_runtime_deferred: true,
      security_review_record_writes_deferred: true,
      security_review_real_review_data_deferred: true,
      security_review_bypass_deferred: true,
      security_review_policy_runtime_deferred: true,
      security_review_decision_emission_deferred: true,
      security_review_final_approval_runtime_deferred: true,
      bypass_review_p09_foundation_descriptor_only: true,
      bypass_review_runtime_deferred: true,
      bypass_review_record_writes_deferred: true,
      bypass_review_real_review_data_deferred: true,
      bypass_review_bypass_deferred: true,
      bypass_review_policy_runtime_deferred: true,
      bypass_review_decision_emission_deferred: true,
      bypass_review_final_approval_runtime_deferred: true,
      bypass_review_override_runtime_deferred: true,
      payroll_calculation_runtime_deferred: true,
      hr_ai_final_judgment_allowed: false,
      sensitive_hr_guard_required: true,
      real_employee_candidate_payroll_document_data_allowed: false,
    },
    requirement_refs: [
      "HRX-CORE-001",
      "HRX-CORE-002",
      "HRX-CORE-003",
      "HRX-GATE-001",
      "HRX-GATE-002",
      "HRX-GATE-003",
      "HRX-GATE-004",
      "HRX-GATE-005",
      "HRX-GATE-006",
    ],
    hermes_packet: createHrxCp981HermesEvidencePacket(),
    claude_packet: createHrxCp981ClaudeReviewPacket(),
    closeout_handoff: createHrxCp981CloseoutHandoff(),
    required_capabilities: HRX_CP981_REQUIREMENTS.required_capabilities,
    safety_gates: HRX_CP981_REQUIREMENTS.safety_gates,
    no_leak_guards: HRX_CP981_REQUIREMENTS.required_no_leak_guards,
    blocked_claims: HRX_BLOCKED_CLAIMS,
    ...HRX_NO_WRITE_ATTESTATION,
  });
}

export function createHrxCp982BypassMissingTestsRiskRegisterBridgeCaseSet() {
  const sections = {};
  for (const [microId, titles] of Object.entries(HRX_CP982_REQUIRED_SECTION_ROWS)) {
    sections[microId] = deepFreeze({
      micro_phase_id: microId,
      row_count: titles.length,
      rows: createHrxDomainRows(microId, titles),
    });
  }
  return deepFreeze({
    pack_id: HRX_CP982_PACK_BINDING.pack_id,
    section_count: Object.keys(sections).length,
    row_count: Object.values(sections).reduce((sum, section) => sum + section.row_count, 0),
    sections,
  });
}

export function createHrxCp982HermesEvidencePacket() {
  return deepFreeze({
    gate: HRX_CP982_PACK_BINDING.hermes_gate,
    pack_id: HRX_CP982_PACK_BINDING.pack_id,
    evidence_kind: "hrx_bypass_missing_tests_risk_register_p09_bridge",
    emits_runtime_receipt: false,
    deterministic_only: true,
    validation_commands: ["npm run rp30:hrx:validate", "npm run rp30:validate", "npm run hrx:requirements:validate", "npm run hrx:weighted:validate"],
    boundary_assertions: [
      "bypass_review_p09_tail_descriptor",
      "bypass_review_runtime_deferred",
      "bypass_review_record_writes_deferred",
      "bypass_review_real_review_data_excluded",
      "bypass_review_bypass_deferred",
      "bypass_review_policy_runtime_deferred",
      "bypass_review_decision_emission_deferred",
      "bypass_review_final_approval_runtime_deferred",
      "bypass_review_override_runtime_deferred",
      "missing_tests_p09_foundation_descriptor",
      "missing_tests_runtime_deferred",
      "missing_tests_record_writes_deferred",
      "missing_tests_real_review_data_excluded",
      "missing_tests_bypass_deferred",
      "missing_tests_policy_runtime_deferred",
      "missing_tests_decision_emission_deferred",
      "missing_tests_final_approval_runtime_deferred",
      "missing_tests_completion_marker_deferred",
      "risk_register_p09_foundation_descriptor",
      "risk_register_runtime_deferred",
      "risk_register_record_writes_deferred",
      "risk_register_real_review_data_excluded",
      "risk_register_bypass_deferred",
      "risk_register_policy_runtime_deferred",
      "risk_register_decision_emission_deferred",
      "risk_register_final_approval_runtime_deferred",
      "risk_register_real_risk_registration_deferred",
      "credentials_and_secrets_excluded",
    ],
  });
}

export function createHrxCp982ClaudeReviewPacket() {
  return deepFreeze({
    gate: HRX_CP982_PACK_BINDING.claude_gate,
    pack_id: HRX_CP982_PACK_BINDING.pack_id,
    read_only: true,
    promotes_claude_to_final_approval: false,
    review_waived_by_user: true,
    review_questions: [
      "Do BypassReview tail rows remain descriptor-only without bypass override runtime, final approval runtime, policy execution, decision emission, record writes, real review data, or permission bypass?",
      "Do MissingTests foundation rows remain descriptor-only without marking tests complete, runtime execution, final approval runtime, policy execution, decision emission, record writes, real review data, or permission bypass?",
      "Do RiskRegister foundation rows remain descriptor-only without registering real risks, runtime execution, final approval runtime, policy execution, decision emission, record writes, real review data, or permission bypass?",
      "Does CP982 keep credentials, secrets, runtime receipts, enterprise trust, and separate HRX product claims closed?",
    ],
  });
}

export function createHrxCp982CloseoutHandoff() {
  return deepFreeze({
    from_pack_id: HRX_CP982_PACK_BINDING.pack_id,
    to_pack_id: HRX_CP982_PACK_BINDING.next_pack_id,
    next_subphase_id: HRX_CP982_PACK_BINDING.next_subphase_id,
    handoff_contract: "Continue RP30 P09 RiskRegister and HumanSummary descriptors while keeping Claude review runtime, final approval runtime, policy execution, decision emission, record writes, real review data, credentials, secrets, runtime receipts, enterprise trust, and separate-product claims closed.",
  });
}

export function createHrxCp982BypassMissingTestsRiskRegisterBridgeDescriptor() {
  const caseSet = createHrxCp982BypassMissingTestsRiskRegisterBridgeCaseSet();
  return deepFreeze({
    descriptor: "HrxCp982BypassMissingTestsRiskRegisterBridgeDescriptor",
    source_descriptor: "HrxCp981ArchitectureSecurityBypassReviewBridgeDescriptor",
    pack_id: HRX_CP982_PACK_BINDING.pack_id,
    planned_pack_id: HRX_CP982_PACK_BINDING.planned_pack_id,
    range: HRX_CP982_PACK_BINDING.range,
    program_contract: HRX_PROGRAM_CONTRACT,
    authority_boundary: {
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: HRX_CP982_PACK_BINDING.next_pack_id,
    },
    hrx_bypass_missing_tests_risk_register_p09_bridge_case_set: caseSet,
    domain_entities: {
      BypassReview: deepFreeze({
        descriptor_only: true,
        bypass_review_runtime_opened: false,
        bypass_review_record_write_opened: false,
        bypass_review_real_data_allowed: false,
        bypass_review_bypass_allowed: false,
        bypass_review_policy_runtime_opened: false,
        bypass_review_decision_emitted: false,
        bypass_review_final_approval_runtime_opened: false,
        bypass_review_override_runtime_opened: false,
      }),
      MissingTests: deepFreeze({
        descriptor_only: true,
        missing_tests_runtime_opened: false,
        missing_tests_record_write_opened: false,
        missing_tests_real_data_allowed: false,
        missing_tests_bypass_allowed: false,
        missing_tests_policy_runtime_opened: false,
        missing_tests_decision_emitted: false,
        missing_tests_final_approval_runtime_opened: false,
        missing_tests_test_completion_marked: false,
      }),
      RiskRegister: deepFreeze({
        descriptor_only: true,
        risk_register_runtime_opened: false,
        risk_register_record_write_opened: false,
        risk_register_real_data_allowed: false,
        risk_register_bypass_allowed: false,
        risk_register_policy_runtime_opened: false,
        risk_register_decision_emitted: false,
        risk_register_final_approval_runtime_opened: false,
        risk_register_real_risk_registered: false,
      }),
    },
    baseline_decisions: {
      hrx_embedded_inside_law_firm_os: true,
      separate_hrx_product_created: false,
      bypass_review_p09_tail_descriptor_only: true,
      bypass_review_runtime_deferred: true,
      bypass_review_record_writes_deferred: true,
      bypass_review_real_review_data_deferred: true,
      bypass_review_bypass_deferred: true,
      bypass_review_policy_runtime_deferred: true,
      bypass_review_decision_emission_deferred: true,
      bypass_review_final_approval_runtime_deferred: true,
      bypass_review_override_runtime_deferred: true,
      missing_tests_p09_foundation_descriptor_only: true,
      missing_tests_runtime_deferred: true,
      missing_tests_record_writes_deferred: true,
      missing_tests_real_review_data_deferred: true,
      missing_tests_bypass_deferred: true,
      missing_tests_policy_runtime_deferred: true,
      missing_tests_decision_emission_deferred: true,
      missing_tests_final_approval_runtime_deferred: true,
      missing_tests_completion_marker_deferred: true,
      risk_register_p09_foundation_descriptor_only: true,
      risk_register_runtime_deferred: true,
      risk_register_record_writes_deferred: true,
      risk_register_real_review_data_deferred: true,
      risk_register_bypass_deferred: true,
      risk_register_policy_runtime_deferred: true,
      risk_register_decision_emission_deferred: true,
      risk_register_final_approval_runtime_deferred: true,
      risk_register_real_risk_registration_deferred: true,
      payroll_calculation_runtime_deferred: true,
      hr_ai_final_judgment_allowed: false,
      sensitive_hr_guard_required: true,
      real_employee_candidate_payroll_document_data_allowed: false,
    },
    requirement_refs: [
      "HRX-CORE-001",
      "HRX-CORE-002",
      "HRX-CORE-003",
      "HRX-GATE-001",
      "HRX-GATE-002",
      "HRX-GATE-003",
      "HRX-GATE-004",
      "HRX-GATE-005",
      "HRX-GATE-006",
    ],
    hermes_packet: createHrxCp982HermesEvidencePacket(),
    claude_packet: createHrxCp982ClaudeReviewPacket(),
    closeout_handoff: createHrxCp982CloseoutHandoff(),
    required_capabilities: HRX_CP982_REQUIREMENTS.required_capabilities,
    safety_gates: HRX_CP982_REQUIREMENTS.safety_gates,
    no_leak_guards: HRX_CP982_REQUIREMENTS.required_no_leak_guards,
    blocked_claims: HRX_BLOCKED_CLAIMS,
    ...HRX_NO_WRITE_ATTESTATION,
  });
}

export function createHrxCp983RiskRegisterHumanSummaryBridgeCaseSet() {
  const sections = {};
  for (const [microId, titles] of Object.entries(HRX_CP983_REQUIRED_SECTION_ROWS)) {
    sections[microId] = deepFreeze({
      micro_phase_id: microId,
      row_count: titles.length,
      rows: createHrxDomainRows(microId, titles),
    });
  }
  return deepFreeze({
    pack_id: HRX_CP983_PACK_BINDING.pack_id,
    section_count: Object.keys(sections).length,
    row_count: Object.values(sections).reduce((sum, section) => sum + section.row_count, 0),
    sections,
  });
}

export function createHrxCp983HermesEvidencePacket() {
  return deepFreeze({
    gate: HRX_CP983_PACK_BINDING.hermes_gate,
    pack_id: HRX_CP983_PACK_BINDING.pack_id,
    evidence_kind: "hrx_risk_register_human_summary_p09_bridge",
    emits_runtime_receipt: false,
    deterministic_only: true,
    validation_commands: ["npm run rp30:hrx:validate", "npm run rp30:validate", "npm run hrx:requirements:validate", "npm run hrx:weighted:validate"],
    boundary_assertions: [
      "risk_register_p09_tail_descriptor",
      "risk_register_runtime_deferred",
      "risk_register_record_writes_deferred",
      "risk_register_real_review_data_excluded",
      "risk_register_bypass_deferred",
      "risk_register_policy_runtime_deferred",
      "risk_register_decision_emission_deferred",
      "risk_register_final_approval_runtime_deferred",
      "risk_register_real_risk_registration_deferred",
      "human_summary_p09_foundation_descriptor",
      "human_summary_runtime_deferred",
      "human_summary_record_writes_deferred",
      "human_summary_real_review_data_excluded",
      "human_summary_bypass_deferred",
      "human_summary_policy_runtime_deferred",
      "human_summary_decision_emission_deferred",
      "human_summary_final_approval_runtime_deferred",
      "human_summary_text_generation_deferred",
      "credentials_and_secrets_excluded",
    ],
  });
}

export function createHrxCp983ClaudeReviewPacket() {
  return deepFreeze({
    gate: HRX_CP983_PACK_BINDING.claude_gate,
    pack_id: HRX_CP983_PACK_BINDING.pack_id,
    read_only: true,
    promotes_claude_to_final_approval: false,
    review_waived_by_user: true,
    review_questions: [
      "Do RiskRegister tail rows remain descriptor-only without registering real risks, runtime execution, final approval runtime, policy execution, decision emission, record writes, real review data, or permission bypass?",
      "Do HumanSummary foundation rows remain descriptor-only without generating summary text, runtime execution, final approval runtime, policy execution, decision emission, record writes, real review data, or permission bypass?",
      "Does CP983 keep credentials, secrets, runtime receipts, enterprise trust, and separate HRX product claims closed?",
    ],
  });
}

export function createHrxCp983CloseoutHandoff() {
  return deepFreeze({
    from_pack_id: HRX_CP983_PACK_BINDING.pack_id,
    to_pack_id: HRX_CP983_PACK_BINDING.next_pack_id,
    next_subphase_id: HRX_CP983_PACK_BINDING.next_subphase_id,
    handoff_contract: "Continue RP30 P09 HumanSummary tail and ArchitectureReview/SecurityReview descriptors while keeping Claude review runtime, summary generation runtime, final approval runtime, policy execution, decision emission, record writes, real review data, credentials, secrets, runtime receipts, enterprise trust, and separate-product claims closed.",
  });
}

export function createHrxCp983RiskRegisterHumanSummaryBridgeDescriptor() {
  const caseSet = createHrxCp983RiskRegisterHumanSummaryBridgeCaseSet();
  return deepFreeze({
    descriptor: "HrxCp983RiskRegisterHumanSummaryBridgeDescriptor",
    source_descriptor: "HrxCp982BypassMissingTestsRiskRegisterBridgeDescriptor",
    pack_id: HRX_CP983_PACK_BINDING.pack_id,
    planned_pack_id: HRX_CP983_PACK_BINDING.planned_pack_id,
    range: HRX_CP983_PACK_BINDING.range,
    program_contract: HRX_PROGRAM_CONTRACT,
    authority_boundary: {
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: HRX_CP983_PACK_BINDING.next_pack_id,
    },
    hrx_risk_register_human_summary_p09_bridge_case_set: caseSet,
    domain_entities: {
      RiskRegister: deepFreeze({
        descriptor_only: true,
        risk_register_runtime_opened: false,
        risk_register_record_write_opened: false,
        risk_register_real_data_allowed: false,
        risk_register_bypass_allowed: false,
        risk_register_policy_runtime_opened: false,
        risk_register_decision_emitted: false,
        risk_register_final_approval_runtime_opened: false,
        risk_register_real_risk_registered: false,
      }),
      HumanSummary: deepFreeze({
        descriptor_only: true,
        human_summary_runtime_opened: false,
        human_summary_record_write_opened: false,
        human_summary_real_data_allowed: false,
        human_summary_bypass_allowed: false,
        human_summary_policy_runtime_opened: false,
        human_summary_decision_emitted: false,
        human_summary_final_approval_runtime_opened: false,
        human_summary_text_generated: false,
      }),
    },
    baseline_decisions: {
      hrx_embedded_inside_law_firm_os: true,
      separate_hrx_product_created: false,
      risk_register_p09_tail_descriptor_only: true,
      risk_register_runtime_deferred: true,
      risk_register_record_writes_deferred: true,
      risk_register_real_review_data_deferred: true,
      risk_register_bypass_deferred: true,
      risk_register_policy_runtime_deferred: true,
      risk_register_decision_emission_deferred: true,
      risk_register_final_approval_runtime_deferred: true,
      risk_register_real_risk_registration_deferred: true,
      human_summary_p09_foundation_descriptor_only: true,
      human_summary_runtime_deferred: true,
      human_summary_record_writes_deferred: true,
      human_summary_real_review_data_deferred: true,
      human_summary_bypass_deferred: true,
      human_summary_policy_runtime_deferred: true,
      human_summary_decision_emission_deferred: true,
      human_summary_final_approval_runtime_deferred: true,
      human_summary_text_generation_deferred: true,
      payroll_calculation_runtime_deferred: true,
      hr_ai_final_judgment_allowed: false,
      sensitive_hr_guard_required: true,
      real_employee_candidate_payroll_document_data_allowed: false,
    },
    requirement_refs: [
      "HRX-CORE-001",
      "HRX-CORE-002",
      "HRX-CORE-003",
      "HRX-GATE-001",
      "HRX-GATE-002",
      "HRX-GATE-003",
      "HRX-GATE-004",
      "HRX-GATE-005",
      "HRX-GATE-006",
    ],
    hermes_packet: createHrxCp983HermesEvidencePacket(),
    claude_packet: createHrxCp983ClaudeReviewPacket(),
    closeout_handoff: createHrxCp983CloseoutHandoff(),
    required_capabilities: HRX_CP983_REQUIREMENTS.required_capabilities,
    safety_gates: HRX_CP983_REQUIREMENTS.safety_gates,
    no_leak_guards: HRX_CP983_REQUIREMENTS.required_no_leak_guards,
    blocked_claims: HRX_BLOCKED_CLAIMS,
    ...HRX_NO_WRITE_ATTESTATION,
  });
}

export function createHrxCp984HumanSummaryArchitectureSecurityReviewBridgeCaseSet() {
  const sections = {};
  for (const [microId, titles] of Object.entries(HRX_CP984_REQUIRED_SECTION_ROWS)) {
    sections[microId] = deepFreeze({
      micro_phase_id: microId,
      row_count: titles.length,
      rows: createHrxDomainRows(microId, titles),
    });
  }
  return deepFreeze({
    pack_id: HRX_CP984_PACK_BINDING.pack_id,
    section_count: Object.keys(sections).length,
    row_count: Object.values(sections).reduce((sum, section) => sum + section.row_count, 0),
    sections,
  });
}

export function createHrxCp984HermesEvidencePacket() {
  return deepFreeze({
    gate: HRX_CP984_PACK_BINDING.hermes_gate,
    pack_id: HRX_CP984_PACK_BINDING.pack_id,
    evidence_kind: "hrx_human_summary_architecture_security_review_p09_bridge",
    emits_runtime_receipt: false,
    deterministic_only: true,
    validation_commands: ["npm run rp30:hrx:validate", "npm run rp30:validate", "npm run hrx:requirements:validate", "npm run hrx:weighted:validate"],
    boundary_assertions: [
      "human_summary_p09_tail_descriptor",
      "human_summary_runtime_deferred",
      "human_summary_record_writes_deferred",
      "human_summary_real_review_data_excluded",
      "human_summary_bypass_deferred",
      "human_summary_policy_runtime_deferred",
      "human_summary_decision_emission_deferred",
      "human_summary_final_approval_runtime_deferred",
      "human_summary_text_generation_deferred",
      "architecture_review_p09_foundation_descriptor",
      "architecture_review_runtime_deferred",
      "architecture_review_record_writes_deferred",
      "architecture_review_real_review_data_excluded",
      "architecture_review_bypass_deferred",
      "architecture_review_policy_runtime_deferred",
      "architecture_review_decision_emission_deferred",
      "architecture_review_final_approval_runtime_deferred",
      "security_review_p09_foundation_descriptor",
      "security_review_runtime_deferred",
      "security_review_record_writes_deferred",
      "security_review_real_review_data_excluded",
      "security_review_bypass_deferred",
      "security_review_policy_runtime_deferred",
      "security_review_decision_emission_deferred",
      "security_review_final_approval_runtime_deferred",
      "credentials_and_secrets_excluded",
    ],
  });
}

export function createHrxCp984ClaudeReviewPacket() {
  return deepFreeze({
    gate: HRX_CP984_PACK_BINDING.claude_gate,
    pack_id: HRX_CP984_PACK_BINDING.pack_id,
    read_only: true,
    promotes_claude_to_final_approval: false,
    review_waived_by_user: true,
    review_questions: [
      "Do HumanSummary tail rows remain descriptor-only without generating summary text, runtime execution, final approval runtime, policy execution, decision emission, record writes, real review data, or permission bypass?",
      "Do ArchitectureReview foundation rows remain descriptor-only without architecture review runtime, final approval runtime, policy execution, decision emission, record writes, real review data, or permission bypass?",
      "Do SecurityReview foundation rows remain descriptor-only without security review runtime, final approval runtime, policy execution, decision emission, record writes, real review data, or permission bypass?",
      "Does CP984 keep credentials, secrets, runtime receipts, enterprise trust, and separate HRX product claims closed?",
    ],
  });
}

export function createHrxCp984CloseoutHandoff() {
  return deepFreeze({
    from_pack_id: HRX_CP984_PACK_BINDING.pack_id,
    to_pack_id: HRX_CP984_PACK_BINDING.next_pack_id,
    next_subphase_id: HRX_CP984_PACK_BINDING.next_subphase_id,
    handoff_contract: "Continue RP30 P09 SecurityReview tail into BypassReview and MissingTests descriptors while keeping Claude review runtime, review runtimes, bypass override runtime, missing-test completion runtime, final approval runtime, policy execution, decision emission, record writes, real review data, credentials, secrets, runtime receipts, enterprise trust, and separate-product claims closed.",
  });
}

export function createHrxCp984HumanSummaryArchitectureSecurityReviewBridgeDescriptor() {
  const caseSet = createHrxCp984HumanSummaryArchitectureSecurityReviewBridgeCaseSet();
  return deepFreeze({
    descriptor: "HrxCp984HumanSummaryArchitectureSecurityReviewBridgeDescriptor",
    source_descriptor: "HrxCp983RiskRegisterHumanSummaryBridgeDescriptor",
    pack_id: HRX_CP984_PACK_BINDING.pack_id,
    planned_pack_id: HRX_CP984_PACK_BINDING.planned_pack_id,
    range: HRX_CP984_PACK_BINDING.range,
    program_contract: HRX_PROGRAM_CONTRACT,
    authority_boundary: {
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: HRX_CP984_PACK_BINDING.next_pack_id,
    },
    hrx_human_summary_architecture_security_review_p09_bridge_case_set: caseSet,
    domain_entities: {
      HumanSummary: deepFreeze({
        descriptor_only: true,
        human_summary_runtime_opened: false,
        human_summary_record_write_opened: false,
        human_summary_real_data_allowed: false,
        human_summary_bypass_allowed: false,
        human_summary_policy_runtime_opened: false,
        human_summary_decision_emitted: false,
        human_summary_final_approval_runtime_opened: false,
        human_summary_text_generated: false,
      }),
      ArchitectureReview: deepFreeze({
        descriptor_only: true,
        architecture_review_runtime_opened: false,
        architecture_review_record_write_opened: false,
        architecture_review_real_data_allowed: false,
        architecture_review_bypass_allowed: false,
        architecture_review_policy_runtime_opened: false,
        architecture_review_decision_emitted: false,
        architecture_review_final_approval_runtime_opened: false,
      }),
      SecurityReview: deepFreeze({
        descriptor_only: true,
        security_review_runtime_opened: false,
        security_review_record_write_opened: false,
        security_review_real_data_allowed: false,
        security_review_bypass_allowed: false,
        security_review_policy_runtime_opened: false,
        security_review_decision_emitted: false,
        security_review_final_approval_runtime_opened: false,
      }),
    },
    baseline_decisions: {
      hrx_embedded_inside_law_firm_os: true,
      separate_hrx_product_created: false,
      human_summary_p09_tail_descriptor_only: true,
      human_summary_runtime_deferred: true,
      human_summary_record_writes_deferred: true,
      human_summary_real_review_data_deferred: true,
      human_summary_bypass_deferred: true,
      human_summary_policy_runtime_deferred: true,
      human_summary_decision_emission_deferred: true,
      human_summary_final_approval_runtime_deferred: true,
      human_summary_text_generation_deferred: true,
      architecture_review_p09_foundation_descriptor_only: true,
      architecture_review_runtime_deferred: true,
      architecture_review_record_writes_deferred: true,
      architecture_review_real_review_data_deferred: true,
      architecture_review_bypass_deferred: true,
      architecture_review_policy_runtime_deferred: true,
      architecture_review_decision_emission_deferred: true,
      architecture_review_final_approval_runtime_deferred: true,
      security_review_p09_foundation_descriptor_only: true,
      security_review_runtime_deferred: true,
      security_review_record_writes_deferred: true,
      security_review_real_review_data_deferred: true,
      security_review_bypass_deferred: true,
      security_review_policy_runtime_deferred: true,
      security_review_decision_emission_deferred: true,
      security_review_final_approval_runtime_deferred: true,
      payroll_calculation_runtime_deferred: true,
      hr_ai_final_judgment_allowed: false,
      sensitive_hr_guard_required: true,
      real_employee_candidate_payroll_document_data_allowed: false,
    },
    requirement_refs: [
      "HRX-CORE-001",
      "HRX-CORE-002",
      "HRX-CORE-003",
      "HRX-GATE-001",
      "HRX-GATE-002",
      "HRX-GATE-003",
      "HRX-GATE-004",
      "HRX-GATE-005",
      "HRX-GATE-006",
    ],
    hermes_packet: createHrxCp984HermesEvidencePacket(),
    claude_packet: createHrxCp984ClaudeReviewPacket(),
    closeout_handoff: createHrxCp984CloseoutHandoff(),
    required_capabilities: HRX_CP984_REQUIREMENTS.required_capabilities,
    safety_gates: HRX_CP984_REQUIREMENTS.safety_gates,
    no_leak_guards: HRX_CP984_REQUIREMENTS.required_no_leak_guards,
    blocked_claims: HRX_BLOCKED_CLAIMS,
    ...HRX_NO_WRITE_ATTESTATION,
  });
}

export function createHrxCp985SecurityBypassMissingTestsBridgeCaseSet() {
  const sections = {};
  for (const [microId, titles] of Object.entries(HRX_CP985_REQUIRED_SECTION_ROWS)) {
    sections[microId] = deepFreeze({
      micro_phase_id: microId,
      row_count: titles.length,
      rows: createHrxDomainRows(microId, titles),
    });
  }
  return deepFreeze({
    pack_id: HRX_CP985_PACK_BINDING.pack_id,
    section_count: Object.keys(sections).length,
    row_count: Object.values(sections).reduce((sum, section) => sum + section.row_count, 0),
    sections,
  });
}

export function createHrxCp985HermesEvidencePacket() {
  return deepFreeze({
    gate: HRX_CP985_PACK_BINDING.hermes_gate,
    pack_id: HRX_CP985_PACK_BINDING.pack_id,
    evidence_kind: "hrx_security_bypass_missing_tests_p09_bridge",
    emits_runtime_receipt: false,
    deterministic_only: true,
    validation_commands: ["npm run rp30:hrx:validate", "npm run rp30:validate", "npm run hrx:requirements:validate", "npm run hrx:weighted:validate"],
    boundary_assertions: [
      "security_review_p09_tail_descriptor",
      "security_review_runtime_deferred",
      "security_review_record_writes_deferred",
      "security_review_real_review_data_excluded",
      "security_review_bypass_deferred",
      "security_review_policy_runtime_deferred",
      "security_review_decision_emission_deferred",
      "security_review_final_approval_runtime_deferred",
      "bypass_review_p09_foundation_descriptor",
      "bypass_review_runtime_deferred",
      "bypass_review_record_writes_deferred",
      "bypass_review_real_review_data_excluded",
      "bypass_review_bypass_deferred",
      "bypass_review_policy_runtime_deferred",
      "bypass_review_decision_emission_deferred",
      "bypass_review_final_approval_runtime_deferred",
      "bypass_review_override_runtime_deferred",
      "missing_tests_p09_foundation_descriptor",
      "missing_tests_runtime_deferred",
      "missing_tests_record_writes_deferred",
      "missing_tests_real_review_data_excluded",
      "missing_tests_bypass_deferred",
      "missing_tests_policy_runtime_deferred",
      "missing_tests_decision_emission_deferred",
      "missing_tests_final_approval_runtime_deferred",
      "missing_tests_completion_marker_deferred",
      "credentials_and_secrets_excluded",
    ],
  });
}

export function createHrxCp985ClaudeReviewPacket() {
  return deepFreeze({
    gate: HRX_CP985_PACK_BINDING.claude_gate,
    pack_id: HRX_CP985_PACK_BINDING.pack_id,
    read_only: true,
    promotes_claude_to_final_approval: false,
    review_waived_by_user: true,
    review_questions: [
      "Do SecurityReview tail rows remain descriptor-only without security review runtime, final approval runtime, policy execution, decision emission, record writes, real review data, or permission bypass?",
      "Do BypassReview foundation rows remain descriptor-only without bypass override runtime, final approval runtime, policy execution, decision emission, record writes, real review data, or permission bypass?",
      "Do MissingTests foundation rows remain descriptor-only without marking tests complete, runtime execution, final approval runtime, policy execution, decision emission, record writes, real review data, or permission bypass?",
      "Does CP985 keep credentials, secrets, runtime receipts, enterprise trust, and separate HRX product claims closed?",
    ],
  });
}

export function createHrxCp985CloseoutHandoff() {
  return deepFreeze({
    from_pack_id: HRX_CP985_PACK_BINDING.pack_id,
    to_pack_id: HRX_CP985_PACK_BINDING.next_pack_id,
    next_subphase_id: HRX_CP985_PACK_BINDING.next_subphase_id,
    handoff_contract: "Continue RP30 P09 MissingTests tail into RiskRegister descriptors while keeping Claude review runtime, missing-test completion runtime, risk registration runtime, final approval runtime, policy execution, decision emission, record writes, real review data, credentials, secrets, runtime receipts, enterprise trust, and separate-product claims closed.",
  });
}

export function createHrxCp985SecurityBypassMissingTestsBridgeDescriptor() {
  const caseSet = createHrxCp985SecurityBypassMissingTestsBridgeCaseSet();
  return deepFreeze({
    descriptor: "HrxCp985SecurityBypassMissingTestsBridgeDescriptor",
    source_descriptor: "HrxCp984HumanSummaryArchitectureSecurityReviewBridgeDescriptor",
    pack_id: HRX_CP985_PACK_BINDING.pack_id,
    planned_pack_id: HRX_CP985_PACK_BINDING.planned_pack_id,
    range: HRX_CP985_PACK_BINDING.range,
    program_contract: HRX_PROGRAM_CONTRACT,
    authority_boundary: {
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: HRX_CP985_PACK_BINDING.next_pack_id,
    },
    hrx_security_bypass_missing_tests_p09_bridge_case_set: caseSet,
    domain_entities: {
      SecurityReview: deepFreeze({
        descriptor_only: true,
        security_review_runtime_opened: false,
        security_review_record_write_opened: false,
        security_review_real_data_allowed: false,
        security_review_bypass_allowed: false,
        security_review_policy_runtime_opened: false,
        security_review_decision_emitted: false,
        security_review_final_approval_runtime_opened: false,
      }),
      BypassReview: deepFreeze({
        descriptor_only: true,
        bypass_review_runtime_opened: false,
        bypass_review_record_write_opened: false,
        bypass_review_real_data_allowed: false,
        bypass_review_bypass_allowed: false,
        bypass_review_policy_runtime_opened: false,
        bypass_review_decision_emitted: false,
        bypass_review_final_approval_runtime_opened: false,
        bypass_review_override_runtime_opened: false,
      }),
      MissingTests: deepFreeze({
        descriptor_only: true,
        missing_tests_runtime_opened: false,
        missing_tests_record_write_opened: false,
        missing_tests_real_data_allowed: false,
        missing_tests_bypass_allowed: false,
        missing_tests_policy_runtime_opened: false,
        missing_tests_decision_emitted: false,
        missing_tests_final_approval_runtime_opened: false,
        missing_tests_test_completion_marked: false,
      }),
    },
    baseline_decisions: {
      hrx_embedded_inside_law_firm_os: true,
      separate_hrx_product_created: false,
      security_review_p09_tail_descriptor_only: true,
      security_review_runtime_deferred: true,
      security_review_record_writes_deferred: true,
      security_review_real_review_data_deferred: true,
      security_review_bypass_deferred: true,
      security_review_policy_runtime_deferred: true,
      security_review_decision_emission_deferred: true,
      security_review_final_approval_runtime_deferred: true,
      bypass_review_p09_foundation_descriptor_only: true,
      bypass_review_runtime_deferred: true,
      bypass_review_record_writes_deferred: true,
      bypass_review_real_review_data_deferred: true,
      bypass_review_bypass_deferred: true,
      bypass_review_policy_runtime_deferred: true,
      bypass_review_decision_emission_deferred: true,
      bypass_review_final_approval_runtime_deferred: true,
      bypass_review_override_runtime_deferred: true,
      missing_tests_p09_foundation_descriptor_only: true,
      missing_tests_runtime_deferred: true,
      missing_tests_record_writes_deferred: true,
      missing_tests_real_review_data_deferred: true,
      missing_tests_bypass_deferred: true,
      missing_tests_policy_runtime_deferred: true,
      missing_tests_decision_emission_deferred: true,
      missing_tests_final_approval_runtime_deferred: true,
      missing_tests_completion_marker_deferred: true,
      payroll_calculation_runtime_deferred: true,
      hr_ai_final_judgment_allowed: false,
      sensitive_hr_guard_required: true,
      real_employee_candidate_payroll_document_data_allowed: false,
    },
    requirement_refs: [
      "HRX-CORE-001",
      "HRX-CORE-002",
      "HRX-CORE-003",
      "HRX-GATE-001",
      "HRX-GATE-002",
      "HRX-GATE-003",
      "HRX-GATE-004",
      "HRX-GATE-005",
      "HRX-GATE-006",
    ],
    hermes_packet: createHrxCp985HermesEvidencePacket(),
    claude_packet: createHrxCp985ClaudeReviewPacket(),
    closeout_handoff: createHrxCp985CloseoutHandoff(),
    required_capabilities: HRX_CP985_REQUIREMENTS.required_capabilities,
    safety_gates: HRX_CP985_REQUIREMENTS.safety_gates,
    no_leak_guards: HRX_CP985_REQUIREMENTS.required_no_leak_guards,
    blocked_claims: HRX_BLOCKED_CLAIMS,
    ...HRX_NO_WRITE_ATTESTATION,
  });
}

export function createHrxCp986MissingTestsRiskRegisterBridgeCaseSet() {
  const sections = {};
  for (const [microId, titles] of Object.entries(HRX_CP986_REQUIRED_SECTION_ROWS)) {
    sections[microId] = deepFreeze({
      micro_phase_id: microId,
      row_count: titles.length,
      rows: createHrxDomainRows(microId, titles),
    });
  }
  return deepFreeze({
    pack_id: HRX_CP986_PACK_BINDING.pack_id,
    section_count: Object.keys(sections).length,
    row_count: Object.values(sections).reduce((sum, section) => sum + section.row_count, 0),
    sections,
  });
}

export function createHrxCp986HermesEvidencePacket() {
  return deepFreeze({
    gate: HRX_CP986_PACK_BINDING.hermes_gate,
    pack_id: HRX_CP986_PACK_BINDING.pack_id,
    evidence_kind: "hrx_missing_tests_risk_register_p09_bridge",
    emits_runtime_receipt: false,
    deterministic_only: true,
    validation_commands: ["npm run rp30:hrx:validate", "npm run rp30:validate", "npm run hrx:requirements:validate", "npm run hrx:weighted:validate"],
    boundary_assertions: [
      "missing_tests_p09_tail_descriptor",
      "missing_tests_runtime_deferred",
      "missing_tests_record_writes_deferred",
      "missing_tests_real_review_data_excluded",
      "missing_tests_bypass_deferred",
      "missing_tests_policy_runtime_deferred",
      "missing_tests_decision_emission_deferred",
      "missing_tests_final_approval_runtime_deferred",
      "missing_tests_completion_marker_deferred",
      "risk_register_p09_foundation_descriptor",
      "risk_register_runtime_deferred",
      "risk_register_record_writes_deferred",
      "risk_register_real_review_data_excluded",
      "risk_register_bypass_deferred",
      "risk_register_policy_runtime_deferred",
      "risk_register_decision_emission_deferred",
      "risk_register_final_approval_runtime_deferred",
      "risk_register_real_risk_registration_deferred",
      "credentials_and_secrets_excluded",
    ],
  });
}

export function createHrxCp986ClaudeReviewPacket() {
  return deepFreeze({
    gate: HRX_CP986_PACK_BINDING.claude_gate,
    pack_id: HRX_CP986_PACK_BINDING.pack_id,
    read_only: true,
    promotes_claude_to_final_approval: false,
    review_waived_by_user: true,
    review_questions: [
      "Do MissingTests tail rows remain descriptor-only without marking tests complete, runtime execution, final approval runtime, policy execution, decision emission, record writes, real review data, or permission bypass?",
      "Do RiskRegister foundation rows remain descriptor-only without registering real risks, runtime execution, final approval runtime, policy execution, decision emission, record writes, real review data, or permission bypass?",
      "Does CP986 keep credentials, secrets, runtime receipts, enterprise trust, and separate HRX product claims closed?",
    ],
  });
}

export function createHrxCp986CloseoutHandoff() {
  return deepFreeze({
    from_pack_id: HRX_CP986_PACK_BINDING.pack_id,
    to_pack_id: HRX_CP986_PACK_BINDING.next_pack_id,
    next_subphase_id: HRX_CP986_PACK_BINDING.next_subphase_id,
    handoff_contract: "Continue RP30 P09 RiskRegister tail into the final descriptor row while keeping Claude review runtime, missing-test completion runtime, risk registration runtime, final approval runtime, policy execution, decision emission, record writes, real review data, credentials, secrets, runtime receipts, enterprise trust, and separate-product claims closed.",
  });
}

export function createHrxCp986MissingTestsRiskRegisterBridgeDescriptor() {
  const caseSet = createHrxCp986MissingTestsRiskRegisterBridgeCaseSet();
  return deepFreeze({
    descriptor: "HrxCp986MissingTestsRiskRegisterBridgeDescriptor",
    source_descriptor: "HrxCp985SecurityBypassMissingTestsBridgeDescriptor",
    pack_id: HRX_CP986_PACK_BINDING.pack_id,
    planned_pack_id: HRX_CP986_PACK_BINDING.planned_pack_id,
    range: HRX_CP986_PACK_BINDING.range,
    program_contract: HRX_PROGRAM_CONTRACT,
    authority_boundary: {
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: HRX_CP986_PACK_BINDING.next_pack_id,
    },
    hrx_missing_tests_risk_register_p09_bridge_case_set: caseSet,
    domain_entities: {
      MissingTests: deepFreeze({
        descriptor_only: true,
        missing_tests_runtime_opened: false,
        missing_tests_record_write_opened: false,
        missing_tests_real_data_allowed: false,
        missing_tests_bypass_allowed: false,
        missing_tests_policy_runtime_opened: false,
        missing_tests_decision_emitted: false,
        missing_tests_final_approval_runtime_opened: false,
        missing_tests_test_completion_marked: false,
      }),
      RiskRegister: deepFreeze({
        descriptor_only: true,
        risk_register_runtime_opened: false,
        risk_register_record_write_opened: false,
        risk_register_real_data_allowed: false,
        risk_register_bypass_allowed: false,
        risk_register_policy_runtime_opened: false,
        risk_register_decision_emitted: false,
        risk_register_final_approval_runtime_opened: false,
        risk_register_real_risk_registered: false,
      }),
    },
    baseline_decisions: {
      hrx_embedded_inside_law_firm_os: true,
      separate_hrx_product_created: false,
      missing_tests_p09_tail_descriptor_only: true,
      missing_tests_runtime_deferred: true,
      missing_tests_record_writes_deferred: true,
      missing_tests_real_review_data_deferred: true,
      missing_tests_bypass_deferred: true,
      missing_tests_policy_runtime_deferred: true,
      missing_tests_decision_emission_deferred: true,
      missing_tests_final_approval_runtime_deferred: true,
      missing_tests_completion_marker_deferred: true,
      risk_register_p09_foundation_descriptor_only: true,
      risk_register_runtime_deferred: true,
      risk_register_record_writes_deferred: true,
      risk_register_real_review_data_deferred: true,
      risk_register_bypass_deferred: true,
      risk_register_policy_runtime_deferred: true,
      risk_register_decision_emission_deferred: true,
      risk_register_final_approval_runtime_deferred: true,
      risk_register_real_risk_registration_deferred: true,
      payroll_calculation_runtime_deferred: true,
      hr_ai_final_judgment_allowed: false,
      sensitive_hr_guard_required: true,
      real_employee_candidate_payroll_document_data_allowed: false,
    },
    requirement_refs: [
      "HRX-CORE-001",
      "HRX-CORE-002",
      "HRX-CORE-003",
      "HRX-GATE-001",
      "HRX-GATE-002",
      "HRX-GATE-003",
      "HRX-GATE-004",
      "HRX-GATE-005",
      "HRX-GATE-006",
    ],
    hermes_packet: createHrxCp986HermesEvidencePacket(),
    claude_packet: createHrxCp986ClaudeReviewPacket(),
    closeout_handoff: createHrxCp986CloseoutHandoff(),
    required_capabilities: HRX_CP986_REQUIREMENTS.required_capabilities,
    safety_gates: HRX_CP986_REQUIREMENTS.safety_gates,
    no_leak_guards: HRX_CP986_REQUIREMENTS.required_no_leak_guards,
    blocked_claims: HRX_BLOCKED_CLAIMS,
    ...HRX_NO_WRITE_ATTESTATION,
  });
}

export function createHrxCp987RiskRegisterFinalTailCaseSet() {
  const sections = {};
  for (const [microId, titles] of Object.entries(HRX_CP987_REQUIRED_SECTION_ROWS)) {
    sections[microId] = deepFreeze({
      micro_phase_id: microId,
      row_count: titles.length,
      rows: createHrxDomainRows(microId, titles),
    });
  }
  return deepFreeze({
    pack_id: HRX_CP987_PACK_BINDING.pack_id,
    section_count: Object.keys(sections).length,
    row_count: Object.values(sections).reduce((sum, section) => sum + section.row_count, 0),
    sections,
  });
}

export function createHrxCp987HermesEvidencePacket() {
  return deepFreeze({
    gate: HRX_CP987_PACK_BINDING.hermes_gate,
    pack_id: HRX_CP987_PACK_BINDING.pack_id,
    evidence_kind: "hrx_risk_register_p09_final_tail",
    emits_runtime_receipt: false,
    deterministic_only: true,
    closeout_complete: true,
    validation_commands: ["npm run rp30:hrx:validate", "npm run rp30:validate", "npm run hrx:requirements:validate", "npm run hrx:weighted:validate"],
    boundary_assertions: [
      "risk_register_p09_final_tail_descriptor",
      "risk_register_runtime_deferred",
      "risk_register_record_writes_deferred",
      "risk_register_real_review_data_excluded",
      "risk_register_bypass_deferred",
      "risk_register_policy_runtime_deferred",
      "risk_register_decision_emission_deferred",
      "risk_register_final_approval_runtime_deferred",
      "risk_register_real_risk_registration_deferred",
      "closeout_queue_completion_descriptor",
      "credentials_and_secrets_excluded",
    ],
  });
}

export function createHrxCp987ClaudeReviewPacket() {
  return deepFreeze({
    gate: HRX_CP987_PACK_BINDING.claude_gate,
    pack_id: HRX_CP987_PACK_BINDING.pack_id,
    read_only: true,
    promotes_claude_to_final_approval: false,
    review_waived_by_user: true,
    review_questions: [
      "Does the final RiskRegister tail row remain descriptor-only without registering real risks, runtime execution, final approval runtime, policy execution, decision emission, record writes, real review data, or permission bypass?",
      "Does CP987 preserve closeout-complete state without opening runtime, emitting receipts, claiming enterprise trust, or creating a separate HRX product?",
      "Does CP987 keep credentials, secrets, runtime receipts, enterprise trust, and separate HRX product claims closed?",
    ],
  });
}

export function createHrxCp987CloseoutHandoff() {
  return deepFreeze({
    from_pack_id: HRX_CP987_PACK_BINDING.pack_id,
    to_pack_id: HRX_CP987_PACK_BINDING.next_pack_id,
    next_subphase_id: HRX_CP987_PACK_BINDING.next_subphase_id,
    closeout_complete: true,
    handoff_contract: "Close the final RP30 P09 RiskRegister descriptor row and leave no remaining CP queue while keeping Claude review runtime, risk registration runtime, final approval runtime, policy execution, decision emission, record writes, real review data, credentials, secrets, runtime receipts, enterprise trust, and separate-product claims closed.",
  });
}

export function createHrxCp987RiskRegisterFinalTailDescriptor() {
  const caseSet = createHrxCp987RiskRegisterFinalTailCaseSet();
  return deepFreeze({
    descriptor: "HrxCp987RiskRegisterFinalTailDescriptor",
    source_descriptor: "HrxCp986MissingTestsRiskRegisterBridgeDescriptor",
    pack_id: HRX_CP987_PACK_BINDING.pack_id,
    planned_pack_id: HRX_CP987_PACK_BINDING.planned_pack_id,
    range: HRX_CP987_PACK_BINDING.range,
    program_contract: HRX_PROGRAM_CONTRACT,
    authority_boundary: {
      claude_is_final_approval: false,
      local_validation_claims_enterprise_trust: false,
      human_final_approval_required_for_runtime_opening: true,
      runtime_opening_pack_id: HRX_CP987_PACK_BINDING.next_pack_id,
      closeout_queue_complete: true,
    },
    hrx_risk_register_p09_final_tail_case_set: caseSet,
    domain_entities: {
      RiskRegister: deepFreeze({
        descriptor_only: true,
        risk_register_runtime_opened: false,
        risk_register_record_write_opened: false,
        risk_register_real_data_allowed: false,
        risk_register_bypass_allowed: false,
        risk_register_policy_runtime_opened: false,
        risk_register_decision_emitted: false,
        risk_register_final_approval_runtime_opened: false,
        risk_register_real_risk_registered: false,
      }),
    },
    baseline_decisions: {
      hrx_embedded_inside_law_firm_os: true,
      separate_hrx_product_created: false,
      risk_register_p09_final_tail_descriptor_only: true,
      risk_register_runtime_deferred: true,
      risk_register_record_writes_deferred: true,
      risk_register_real_review_data_deferred: true,
      risk_register_bypass_deferred: true,
      risk_register_policy_runtime_deferred: true,
      risk_register_decision_emission_deferred: true,
      risk_register_final_approval_runtime_deferred: true,
      risk_register_real_risk_registration_deferred: true,
      closeout_queue_completion_descriptor_only: true,
      payroll_calculation_runtime_deferred: true,
      hr_ai_final_judgment_allowed: false,
      sensitive_hr_guard_required: true,
      real_employee_candidate_payroll_document_data_allowed: false,
    },
    requirement_refs: [
      "HRX-CORE-001",
      "HRX-CORE-002",
      "HRX-CORE-003",
      "HRX-GATE-001",
      "HRX-GATE-002",
      "HRX-GATE-003",
      "HRX-GATE-004",
      "HRX-GATE-005",
      "HRX-GATE-006",
    ],
    hermes_packet: createHrxCp987HermesEvidencePacket(),
    claude_packet: createHrxCp987ClaudeReviewPacket(),
    closeout_handoff: createHrxCp987CloseoutHandoff(),
    required_capabilities: HRX_CP987_REQUIREMENTS.required_capabilities,
    safety_gates: HRX_CP987_REQUIREMENTS.safety_gates,
    no_leak_guards: HRX_CP987_REQUIREMENTS.required_no_leak_guards,
    blocked_claims: HRX_BLOCKED_CLAIMS,
    ...HRX_NO_WRITE_ATTESTATION,
  });
}

export function createHrxPeopleContractProjection() {
  const cp897Descriptor = createHrxCp897ContractBaselineDescriptor();
  const cp898Descriptor = createHrxCp898ContractBaselineContinuationDescriptor();
  const cp899Descriptor = createHrxCp899DomainEmployeeProfileBridgeDescriptor();
  const cp900Descriptor = createHrxCp900HrDocumentContractBridgeDescriptor();
  const cp901Descriptor = createHrxCp901ContractCompensationGraphBridgeDescriptor();
  const cp902Descriptor = createHrxCp902PeopleGraphEmployeeBridgeDescriptor();
  const cp903Descriptor = createHrxCp903EmployeeProfileDocumentBridgeDescriptor();
  const cp904Descriptor = createHrxCp904DocumentContractCompensationBridgeDescriptor();
  const cp905Descriptor = createHrxCp905CompensationRuleEngineBridgeDescriptor();
  const cp906Descriptor = createHrxCp906RuleEngineLeaveWorkflowBridgeDescriptor();
  const cp907Descriptor = createHrxCp907LeaveAttendanceWorkflowBridgeDescriptor();
  const cp908Descriptor = createHrxCp908AttendanceWorkflowTailDescriptor();
  const cp909Descriptor = createHrxCp909AttendanceRecruitmentWorkflowBridgeDescriptor();
  const cp910Descriptor = createHrxCp910RecruitmentRiskWorkflowBridgeDescriptor();
  const cp911Descriptor = createHrxCp911RiskApprovalWorkflowBridgeDescriptor();
  const cp912Descriptor = createHrxCp912ApprovalRuleEngineBridgeDescriptor();
  const cp913Descriptor = createHrxCp913RuleEngineTailDescriptor();
  const cp914Descriptor = createHrxCp914RuleEngineLeaveWorkflowBridgeDescriptor();
  const cp915Descriptor = createHrxCp915LeaveAttendanceWorkflowBridgeDescriptor();
  const cp916Descriptor = createHrxCp916AttendanceRecruitmentWorkflowBridgeDescriptor();
  const cp917Descriptor = createHrxCp917RecruitmentRiskWorkflowBridgeDescriptor();
  const cp918Descriptor = createHrxCp918RiskHrApiFoundationBridgeDescriptor();
  const cp919Descriptor = createHrxCp919HrEmployeeLeaveApiBridgeDescriptor();
  const cp920Descriptor = createHrxCp920LeaveCandidateEvidenceApiBridgeDescriptor();
  const cp921Descriptor = createHrxCp921EvidenceErrorModelBridgeDescriptor();
  const cp922Descriptor = createHrxCp922ErrorModelHrEmployeeApiBridgeDescriptor();
  const cp923Descriptor = createHrxCp923EmployeeLeaveCandidateApiBridgeDescriptor();
  const cp924Descriptor = createHrxCp924CandidateEvidenceHrOperationsBridgeDescriptor();
  const cp925Descriptor = createHrxCp925HrOperationsEmployeePortalBridgeDescriptor();
  const cp926Descriptor = createHrxCp926EmployeeCandidatePortalBridgeDescriptor();
  const cp927Descriptor = createHrxCp927CandidateAiReviewQueueBridgeDescriptor();
  const cp928Descriptor = createHrxCp928AiReviewAdminPolicyBridgeDescriptor();
  const cp929Descriptor = createHrxCp929AdminPolicyDeniedStateBridgeDescriptor();
  const cp930Descriptor = createHrxCp930DeniedStateHrOperationsBridgeDescriptor();
  const cp931Descriptor = createHrxCp931HrOperationsEmployeeCandidatePortalBridgeDescriptor();
  const cp932Descriptor = createHrxCp932CandidateAiReviewQueueBridgeDescriptor();
  const cp933Descriptor = createHrxCp933AiReviewAdminPolicyTailBridgeDescriptor();
  const cp934Descriptor = createHrxCp934AdminPolicySyntheticTenantBridgeDescriptor();
  const cp935Descriptor = createHrxCp935SyntheticTenantEmployeeFixtureBridgeDescriptor();
  const cp936Descriptor = createHrxCp936EmployeeCandidateFixtureBridgeDescriptor();
  const cp937Descriptor = createHrxCp937CandidateLeaveFixtureBridgeDescriptor();
  const cp938Descriptor = createHrxCp938RiskAuditFixtureBridgeDescriptor();
  const cp939Descriptor = createHrxCp939AuditFixtureSyntheticTenantBridgeDescriptor();
  const cp940Descriptor = createHrxCp940SyntheticTenantEmployeeFixtureTailBridgeDescriptor();
  const cp941Descriptor = createHrxCp941EmployeeCandidateFixtureTailBridgeDescriptor();
  const cp942Descriptor = createHrxCp942CandidateLeaveFixtureTailBridgeDescriptor();
  const cp943Descriptor = createHrxCp943LeaveRiskFixtureTailBridgeDescriptor();
  const cp944Descriptor = createHrxCp944HrPermissionFoundationDescriptor();
  const cp945Descriptor = createHrxCp945HrPermissionSensitiveGuardBridgeDescriptor();
  const cp946Descriptor = createHrxCp946SensitiveGuardPayrollRestrictionBridgeDescriptor();
  const cp947Descriptor = createHrxCp947PayrollEvaluationRestrictionBridgeDescriptor();
  const cp948Descriptor = createHrxCp948EvaluationRestrictionTailDescriptor();
  const cp949Descriptor = createHrxCp949EvaluationCandidatePrivacyBridgeDescriptor();
  const cp950Descriptor = createHrxCp950CandidatePrivacyAuditHintBridgeDescriptor();
  const cp951Descriptor = createHrxCp951AuditHintHrPermissionBridgeDescriptor();
  const cp952Descriptor = createHrxCp952HrPermissionSensitiveGuardBridgeDescriptor();
  const cp953Descriptor = createHrxCp953SensitiveGuardTailDescriptor();
  const cp954Descriptor = createHrxCp954SensitiveGuardPayrollRestrictionBridgeDescriptor();
  const cp955Descriptor = createHrxCp955PayrollEvaluationRestrictionBridgeDescriptor();
  const cp956Descriptor = createHrxCp956EvaluationCandidatePrivacyBridgeDescriptor();
  const cp957Descriptor = createHrxCp957CandidatePrivacyMissingUserLinkBridgeDescriptor();
  const cp958Descriptor = createHrxCp958MissingUserLinkTailDescriptor();
  const cp959Descriptor = createHrxCp959PayrollRuntimeAttemptFoundationDescriptor();
  const cp960Descriptor = createHrxCp960PayrollRuntimeAttemptAiScoringBridgeDescriptor();
  const cp961Descriptor = createHrxCp961AiScoringCrossTenantAccessBridgeDescriptor();
  const cp962Descriptor = createHrxCp962CrossTenantAccessStorageDecisionGapBridgeDescriptor();
  const cp963Descriptor = createHrxCp963StorageDecisionGapMidDescriptor();
  const cp964Descriptor = createHrxCp964StorageDecisionGapRecoveryBridgeDescriptor();
  const cp965Descriptor = createHrxCp965RecoveryMissingUserLinkBridgeDescriptor();
  const cp966Descriptor = createHrxCp966MissingUserLinkPayrollRuntimeAttemptBridgeDescriptor();
  const cp967Descriptor = createHrxCp967PayrollRuntimeAttemptAiScoringBridgeDescriptor();
  const cp968Descriptor = createHrxCp968AiScoringCrossTenantAccessBridgeDescriptor();
  const cp969Descriptor = createHrxCp969CrossTenantAccessTailDescriptor();
  const cp970Descriptor = createHrxCp970CrossTenantAccessStorageDecisionGapBridgeDescriptor();
  const cp971Descriptor = createHrxCp971StorageDecisionGapH30CommandMatrixBridgeDescriptor();
  const cp972Descriptor = createHrxCp972H30CommandMatrixEvidenceTemplateBridgeDescriptor();
  const cp973Descriptor = createHrxCp973EvidenceTemplateNoRealDataBridgeDescriptor();
  const cp974Descriptor = createHrxCp974BlockedClaimsClaudeDependencyBridgeDescriptor();
  const cp975Descriptor = createHrxCp975ClaudeDependencyHumanApprovalBridgeDescriptor();
  const cp976Descriptor = createHrxCp976HumanApprovalH30CommandMatrixBridgeDescriptor();
  const cp977Descriptor = createHrxCp977H30CommandMatrixEvidenceTemplateBridgeDescriptor();
  const cp978Descriptor = createHrxCp978EvidenceTemplateNoRealDataBridgeDescriptor();
  const cp979Descriptor = createHrxCp979NoRealDataBlockedClaimsClaudeDependencyBridgeDescriptor();
  const cp980Descriptor = createHrxCp980ClaudeDependencyArchitectureReviewBridgeDescriptor();
  const cp981Descriptor = createHrxCp981ArchitectureSecurityBypassReviewBridgeDescriptor();
  const cp982Descriptor = createHrxCp982BypassMissingTestsRiskRegisterBridgeDescriptor();
  const cp983Descriptor = createHrxCp983RiskRegisterHumanSummaryBridgeDescriptor();
  const cp984Descriptor = createHrxCp984HumanSummaryArchitectureSecurityReviewBridgeDescriptor();
  const cp985Descriptor = createHrxCp985SecurityBypassMissingTestsBridgeDescriptor();
  const cp986Descriptor = createHrxCp986MissingTestsRiskRegisterBridgeDescriptor();
  const cp987Descriptor = createHrxCp987RiskRegisterFinalTailDescriptor();
  return deepFreeze({
    schema_version: "law-firm-os.hrx-people-contract.v0.1",
    generated_by: "scripts/validate-rp30-hrx-people-contract.mjs",
    program_contract: HRX_PROGRAM_CONTRACT,
    current_pack: HRX_CP987_PACK_BINDING,
    latest_pack: HRX_CP987_PACK_BINDING,
    historical_packs: [HRX_CP897_PACK_BINDING, HRX_CP898_PACK_BINDING, HRX_CP899_PACK_BINDING, HRX_CP900_PACK_BINDING, HRX_CP901_PACK_BINDING, HRX_CP902_PACK_BINDING, HRX_CP903_PACK_BINDING, HRX_CP904_PACK_BINDING, HRX_CP905_PACK_BINDING, HRX_CP906_PACK_BINDING, HRX_CP907_PACK_BINDING, HRX_CP908_PACK_BINDING, HRX_CP909_PACK_BINDING, HRX_CP910_PACK_BINDING, HRX_CP911_PACK_BINDING, HRX_CP912_PACK_BINDING, HRX_CP913_PACK_BINDING, HRX_CP914_PACK_BINDING, HRX_CP915_PACK_BINDING, HRX_CP916_PACK_BINDING, HRX_CP917_PACK_BINDING, HRX_CP918_PACK_BINDING, HRX_CP919_PACK_BINDING, HRX_CP920_PACK_BINDING, HRX_CP921_PACK_BINDING, HRX_CP922_PACK_BINDING, HRX_CP923_PACK_BINDING, HRX_CP924_PACK_BINDING, HRX_CP925_PACK_BINDING, HRX_CP926_PACK_BINDING, HRX_CP927_PACK_BINDING, HRX_CP928_PACK_BINDING, HRX_CP929_PACK_BINDING, HRX_CP930_PACK_BINDING, HRX_CP931_PACK_BINDING, HRX_CP932_PACK_BINDING, HRX_CP933_PACK_BINDING, HRX_CP934_PACK_BINDING, HRX_CP935_PACK_BINDING, HRX_CP936_PACK_BINDING, HRX_CP937_PACK_BINDING, HRX_CP938_PACK_BINDING, HRX_CP939_PACK_BINDING, HRX_CP940_PACK_BINDING, HRX_CP941_PACK_BINDING, HRX_CP942_PACK_BINDING, HRX_CP943_PACK_BINDING, HRX_CP944_PACK_BINDING, HRX_CP945_PACK_BINDING, HRX_CP946_PACK_BINDING, HRX_CP947_PACK_BINDING, HRX_CP948_PACK_BINDING, HRX_CP949_PACK_BINDING, HRX_CP950_PACK_BINDING, HRX_CP951_PACK_BINDING, HRX_CP952_PACK_BINDING, HRX_CP953_PACK_BINDING, HRX_CP954_PACK_BINDING, HRX_CP955_PACK_BINDING, HRX_CP956_PACK_BINDING, HRX_CP957_PACK_BINDING, HRX_CP958_PACK_BINDING, HRX_CP959_PACK_BINDING, HRX_CP960_PACK_BINDING, HRX_CP961_PACK_BINDING, HRX_CP962_PACK_BINDING, HRX_CP963_PACK_BINDING, HRX_CP964_PACK_BINDING, HRX_CP965_PACK_BINDING, HRX_CP966_PACK_BINDING, HRX_CP967_PACK_BINDING, HRX_CP968_PACK_BINDING, HRX_CP969_PACK_BINDING, HRX_CP970_PACK_BINDING, HRX_CP971_PACK_BINDING, HRX_CP972_PACK_BINDING, HRX_CP973_PACK_BINDING, HRX_CP974_PACK_BINDING, HRX_CP975_PACK_BINDING, HRX_CP976_PACK_BINDING, HRX_CP977_PACK_BINDING, HRX_CP978_PACK_BINDING, HRX_CP979_PACK_BINDING, HRX_CP980_PACK_BINDING, HRX_CP981_PACK_BINDING, HRX_CP982_PACK_BINDING, HRX_CP983_PACK_BINDING, HRX_CP984_PACK_BINDING, HRX_CP985_PACK_BINDING, HRX_CP986_PACK_BINDING, HRX_CP987_PACK_BINDING],
    latest_projection: cp987Descriptor,
    projections: {
      cp897: cp897Descriptor,
      cp898: cp898Descriptor,
      cp899: cp899Descriptor,
      cp900: cp900Descriptor,
      cp901: cp901Descriptor,
      cp902: cp902Descriptor,
      cp903: cp903Descriptor,
      cp904: cp904Descriptor,
      cp905: cp905Descriptor,
      cp906: cp906Descriptor,
      cp907: cp907Descriptor,
      cp908: cp908Descriptor,
      cp909: cp909Descriptor,
      cp910: cp910Descriptor,
      cp911: cp911Descriptor,
      cp912: cp912Descriptor,
      cp913: cp913Descriptor,
      cp914: cp914Descriptor,
      cp915: cp915Descriptor,
      cp916: cp916Descriptor,
      cp917: cp917Descriptor,
      cp918: cp918Descriptor,
      cp919: cp919Descriptor,
      cp920: cp920Descriptor,
      cp921: cp921Descriptor,
      cp922: cp922Descriptor,
      cp923: cp923Descriptor,
      cp924: cp924Descriptor,
      cp925: cp925Descriptor,
      cp926: cp926Descriptor,
      cp927: cp927Descriptor,
      cp928: cp928Descriptor,
      cp929: cp929Descriptor,
      cp930: cp930Descriptor,
      cp931: cp931Descriptor,
      cp932: cp932Descriptor,
      cp933: cp933Descriptor,
      cp934: cp934Descriptor,
      cp935: cp935Descriptor,
      cp936: cp936Descriptor,
      cp937: cp937Descriptor,
      cp938: cp938Descriptor,
      cp939: cp939Descriptor,
      cp940: cp940Descriptor,
      cp941: cp941Descriptor,
      cp942: cp942Descriptor,
      cp943: cp943Descriptor,
      cp944: cp944Descriptor,
      cp945: cp945Descriptor,
      cp946: cp946Descriptor,
      cp947: cp947Descriptor,
      cp948: cp948Descriptor,
      cp949: cp949Descriptor,
      cp950: cp950Descriptor,
      cp951: cp951Descriptor,
      cp952: cp952Descriptor,
      cp953: cp953Descriptor,
      cp954: cp954Descriptor,
      cp955: cp955Descriptor,
      cp956: cp956Descriptor,
      cp957: cp957Descriptor,
      cp958: cp958Descriptor,
      cp959: cp959Descriptor,
      cp960: cp960Descriptor,
      cp961: cp961Descriptor,
      cp962: cp962Descriptor,
      cp963: cp963Descriptor,
      cp964: cp964Descriptor,
      cp965: cp965Descriptor,
      cp966: cp966Descriptor,
      cp967: cp967Descriptor,
      cp968: cp968Descriptor,
      cp969: cp969Descriptor,
      cp970: cp970Descriptor,
      cp971: cp971Descriptor,
      cp972: cp972Descriptor,
      cp973: cp973Descriptor,
      cp974: cp974Descriptor,
      cp975: cp975Descriptor,
      cp976: cp976Descriptor,
      cp977: cp977Descriptor,
      cp978: cp978Descriptor,
      cp979: cp979Descriptor,
      cp980: cp980Descriptor,
      cp981: cp981Descriptor,
      cp982: cp982Descriptor,
      cp983: cp983Descriptor,
      cp984: cp984Descriptor,
      cp985: cp985Descriptor,
      cp986: cp986Descriptor,
      cp987: cp987Descriptor,
    },
    mandatory_artifacts: HRX_CP987_REQUIREMENTS.mandatory_artifacts,
    required_capabilities: HRX_CP987_REQUIREMENTS.required_capabilities,
    safety_gates: HRX_CP987_REQUIREMENTS.safety_gates,
    no_leak_guards: HRX_CP987_REQUIREMENTS.required_no_leak_guards,
    validation: {
      valid: true,
      latest_pack_id: HRX_CP987_PACK_BINDING.pack_id,
      plan_pack_id: HRX_CP987_PACK_BINDING.pack_id,
      no_write_attestation: HRX_NO_WRITE_ATTESTATION,
    },
  });
}
