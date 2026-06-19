const freezeArray = (rows) => Object.freeze([...rows]);

const BASIC_SCOPE_ROWS = freezeArray([
  "Scope inventory",
  "Acceptance gate definition",
  "Non-goal boundary",
]);

const FOUNDATION_ROWS = freezeArray([
  "Scope inventory",
  "Acceptance gate definition",
  "Non-goal boundary",
  "Target file map",
  "Contract schema outline",
  "Ownership note",
  "Matter-first trace note",
  "Permission baseline note",
  "Audit baseline note",
  "Synthetic data policy",
]);

const FULL_SCOPE_ROWS = freezeArray([
  ...FOUNDATION_ROWS,
  "Risk register row",
  "Blocked-claim rule",
  "Hermes preflight fields",
  "Claude review prompts",
  "Human approval note",
  "Closeout handoff",
  "Dependency list",
  "Downstream RP routing",
  "Command matrix",
  "Receipt shape",
]);

const SECONDARY_WORKFLOW_ROWS = freezeArray(FULL_SCOPE_ROWS.slice(0, 13));

const P01_MODEL_ROWS = freezeArray([
  "Package directory layout",
  "Primary entity identifier",
  "Tenant scope field",
  "Matter trace reference",
  "Lifecycle status enum",
  "Ownership metadata",
  "Reference relationship map",
  "Required field registry",
  "Optional field registry",
  "State transition map",
]);

const freezeSectionRows = (sections) =>
  Object.freeze(
    Object.fromEntries(Object.entries(sections).map(([microId, rows]) => [microId, freezeArray(rows)])),
  );

export const DATA_ROOM_VDR_CORE_CP610_PACK_BINDING = Object.freeze({
  pack_id: "CP00-610",
  planned_pack_id: "CP00-610",
  risk_class: "C",
  unit_count: 150,
  first_unit_id: "RP20.P00.M00.S01",
  last_unit_id: "RP20.P01.M02.S08",
  range: "RP20.P00.M00.S01-RP20.P01.M02.S08",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-609",
  next_pack_id: "CP00-611",
  next_subphase_id: "RP20.P01.M02.S09",
  production_ready_flag: "data_room_vdr_core_scope_contract_foundation_descriptor_verified",
  hermes_gate: "H20",
  claude_gate: "C20",
});

export const DATA_ROOM_VDR_CORE_CP611_PACK_BINDING = Object.freeze({
  pack_id: "CP00-611",
  planned_pack_id: "CP00-611",
  risk_class: "B",
  unit_count: 40,
  first_unit_id: "RP20.P01.M02.S09",
  last_unit_id: "RP20.P01.M04.S06",
  range: "RP20.P01.M02.S09-RP20.P01.M04.S06",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-610",
  next_pack_id: "CP00-612",
  next_subphase_id: "RP20.P01.M04.S07",
  production_ready_flag: "data_room_vdr_core_p01_model_foundation_continuation_descriptor_verified",
  hermes_gate: "H20",
  claude_gate: "C20",
});

export const DATA_ROOM_VDR_CORE_CP612_PACK_BINDING = Object.freeze({
  pack_id: "CP00-612",
  planned_pack_id: "CP00-612",
  risk_class: "B",
  unit_count: 40,
  first_unit_id: "RP20.P01.M04.S07",
  last_unit_id: "RP20.P01.M06.S04",
  range: "RP20.P01.M04.S07-RP20.P01.M06.S04",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-611",
  next_pack_id: "CP00-613",
  next_subphase_id: "RP20.P01.M06.S05",
  production_ready_flag: "data_room_vdr_core_p01_secondary_workflow_permission_audit_descriptor_verified",
  hermes_gate: "H20",
  claude_gate: "C20",
});

export const DATA_ROOM_VDR_CORE_CP613_PACK_BINDING = Object.freeze({
  pack_id: "CP00-613",
  planned_pack_id: "CP00-613",
  risk_class: "C",
  unit_count: 150,
  first_unit_id: "RP20.P01.M06.S05",
  last_unit_id: "RP20.P02.M02.S22",
  range: "RP20.P01.M06.S05-RP20.P02.M02.S22",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-612",
  next_pack_id: "CP00-614",
  next_subphase_id: "RP20.P02.M03.S01",
  production_ready_flag: "data_room_vdr_core_p01_p02_service_foundation_bridge_descriptor_verified",
  hermes_gate: "H20",
  claude_gate: "C20",
});

export const DATA_ROOM_VDR_CORE_CP614_PACK_BINDING = Object.freeze({
  pack_id: "CP00-614",
  planned_pack_id: "CP00-614",
  risk_class: "B",
  unit_count: 40,
  first_unit_id: "RP20.P02.M03.S01",
  last_unit_id: "RP20.P02.M04.S18",
  range: "RP20.P02.M03.S01-RP20.P02.M04.S18",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-613",
  next_pack_id: "CP00-615",
  next_subphase_id: "RP20.P02.M04.S19",
  production_ready_flag: "data_room_vdr_core_p02_primary_secondary_service_descriptor_verified",
  hermes_gate: "H20",
  claude_gate: "C20",
});

export const DATA_ROOM_VDR_CORE_CP615_PACK_BINDING = Object.freeze({
  pack_id: "CP00-615",
  planned_pack_id: "CP00-615",
  risk_class: "B",
  unit_count: 40,
  first_unit_id: "RP20.P02.M04.S19",
  last_unit_id: "RP20.P02.M06.S14",
  range: "RP20.P02.M04.S19-RP20.P02.M06.S14",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-614",
  next_pack_id: "CP00-616",
  next_subphase_id: "RP20.P02.M06.S15",
  production_ready_flag: "data_room_vdr_core_p02_permission_audit_fixture_head_descriptor_verified",
  hermes_gate: "H20",
  claude_gate: "C20",
});

export const DATA_ROOM_VDR_CORE_CP616_PACK_BINDING = Object.freeze({
  pack_id: "CP00-616",
  planned_pack_id: "CP00-616",
  risk_class: "A",
  unit_count: 10,
  first_unit_id: "RP20.P02.M06.S15",
  last_unit_id: "RP20.P02.M07.S02",
  range: "RP20.P02.M06.S15-RP20.P02.M07.S02",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-615",
  next_pack_id: "CP00-617",
  next_subphase_id: "RP20.P02.M07.S03",
  production_ready_flag: "data_room_vdr_core_p02_fixture_tail_test_head_descriptor_verified",
  hermes_gate: "H20",
  claude_gate: "C20",
});

export const DATA_ROOM_VDR_CORE_CP617_PACK_BINDING = Object.freeze({
  pack_id: "CP00-617",
  planned_pack_id: "CP00-617",
  risk_class: "A",
  unit_count: 10,
  first_unit_id: "RP20.P02.M07.S03",
  last_unit_id: "RP20.P02.M07.S12",
  range: "RP20.P02.M07.S03-RP20.P02.M07.S12",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-616",
  next_pack_id: "CP00-618",
  next_subphase_id: "RP20.P02.M07.S13",
  production_ready_flag: "data_room_vdr_core_p02_test_golden_case_core_descriptor_verified",
  hermes_gate: "H20",
  claude_gate: "C20",
});

export const DATA_ROOM_VDR_CORE_CP618_PACK_BINDING = Object.freeze({
  pack_id: "CP00-618",
  planned_pack_id: "CP00-618",
  risk_class: "B",
  unit_count: 40,
  first_unit_id: "RP20.P02.M07.S13",
  last_unit_id: "RP20.P02.M09.S08",
  range: "RP20.P02.M07.S13-RP20.P02.M09.S08",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-617",
  next_pack_id: "CP00-619",
  next_subphase_id: "RP20.P02.M09.S09",
  production_ready_flag: "data_room_vdr_core_p02_test_hermes_claude_bridge_descriptor_verified",
  hermes_gate: "H20",
  claude_gate: "C20",
});

export const DATA_ROOM_VDR_CORE_CP619_PACK_BINDING = Object.freeze({
  pack_id: "CP00-619",
  planned_pack_id: "CP00-619",
  risk_class: "C",
  unit_count: 150,
  first_unit_id: "RP20.P02.M09.S09",
  last_unit_id: "RP20.P03.M06.S12",
  range: "RP20.P02.M09.S09-RP20.P03.M06.S12",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-618",
  next_pack_id: "CP00-620",
  next_subphase_id: "RP20.P03.M06.S13",
  production_ready_flag: "data_room_vdr_core_p02_claude_p03_api_interface_bridge_descriptor_verified",
  hermes_gate: "H20",
  claude_gate: "C20",
});

export const DATA_ROOM_VDR_CORE_CP620_PACK_BINDING = Object.freeze({
  pack_id: "CP00-620",
  planned_pack_id: "CP00-620",
  risk_class: "C",
  unit_count: 150,
  first_unit_id: "RP20.P03.M06.S13",
  last_unit_id: "RP20.P04.M03.S20",
  range: "RP20.P03.M06.S13-RP20.P04.M03.S20",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-619",
  next_pack_id: "CP00-621",
  next_subphase_id: "RP20.P04.M04.S01",
  production_ready_flag: "data_room_vdr_core_p03_api_p04_ui_bridge_descriptor_verified",
  hermes_gate: "H20",
  claude_gate: "C20",
});

export const DATA_ROOM_VDR_CORE_CP621_PACK_BINDING = Object.freeze({
  pack_id: "CP00-621",
  planned_pack_id: "CP00-621",
  risk_class: "C",
  unit_count: 150,
  first_unit_id: "RP20.P04.M04.S01",
  last_unit_id: "RP20.P05.M00.S10",
  range: "RP20.P04.M04.S01-RP20.P05.M00.S10",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-620",
  next_pack_id: "CP00-622",
  next_subphase_id: "RP20.P05.M01.S01",
  production_ready_flag: "data_room_vdr_core_p04_ui_p05_fixture_bridge_descriptor_verified",
  hermes_gate: "H20",
  claude_gate: "C20",
});

export const DATA_ROOM_VDR_CORE_CP622_PACK_BINDING = Object.freeze({
  pack_id: "CP00-622",
  planned_pack_id: "CP00-622",
  risk_class: "A",
  unit_count: 10,
  first_unit_id: "RP20.P05.M01.S01",
  last_unit_id: "RP20.P05.M01.S10",
  range: "RP20.P05.M01.S01-RP20.P05.M01.S10",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-621",
  next_pack_id: "CP00-623",
  next_subphase_id: "RP20.P05.M01.S11",
  production_ready_flag: "data_room_vdr_core_p05_fixture_contract_draft_descriptor_verified",
  hermes_gate: "H20",
  claude_gate: "C20",
});

export const DATA_ROOM_VDR_CORE_CP623_PACK_BINDING = Object.freeze({
  pack_id: "CP00-623",
  planned_pack_id: "CP00-623",
  risk_class: "A",
  unit_count: 10,
  first_unit_id: "RP20.P05.M01.S11",
  last_unit_id: "RP20.P05.M01.S20",
  range: "RP20.P05.M01.S11-RP20.P05.M01.S20",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-622",
  next_pack_id: "CP00-624",
  next_subphase_id: "RP20.P05.M02.S01",
  production_ready_flag: "data_room_vdr_core_p05_fixture_contract_draft_tail_descriptor_verified",
  hermes_gate: "H20",
  claude_gate: "C20",
});

export const DATA_ROOM_VDR_CORE_CP624_PACK_BINDING = Object.freeze({
  pack_id: "CP00-624",
  planned_pack_id: "CP00-624",
  risk_class: "A",
  unit_count: 10,
  first_unit_id: "RP20.P05.M02.S01",
  last_unit_id: "RP20.P05.M02.S10",
  range: "RP20.P05.M02.S01-RP20.P05.M02.S10",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-623",
  next_pack_id: "CP00-625",
  next_subphase_id: "RP20.P05.M02.S11",
  production_ready_flag: "data_room_vdr_core_p05_fixture_type_shape_head_descriptor_verified",
  hermes_gate: "H20",
  claude_gate: "C20",
});

export const DATA_ROOM_VDR_CORE_CP625_PACK_BINDING = Object.freeze({
  pack_id: "CP00-625",
  planned_pack_id: "CP00-625",
  risk_class: "A",
  unit_count: 10,
  first_unit_id: "RP20.P05.M02.S11",
  last_unit_id: "RP20.P05.M02.S20",
  range: "RP20.P05.M02.S11-RP20.P05.M02.S20",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-624",
  next_pack_id: "CP00-626",
  next_subphase_id: "RP20.P05.M03.S01",
  production_ready_flag: "data_room_vdr_core_p05_fixture_type_shape_tail_descriptor_verified",
  hermes_gate: "H20",
  claude_gate: "C20",
});

export const DATA_ROOM_VDR_CORE_CP626_PACK_BINDING = Object.freeze({
  pack_id: "CP00-626",
  planned_pack_id: "CP00-626",
  risk_class: "A",
  unit_count: 10,
  first_unit_id: "RP20.P05.M03.S01",
  last_unit_id: "RP20.P05.M03.S10",
  range: "RP20.P05.M03.S01-RP20.P05.M03.S10",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-625",
  next_pack_id: "CP00-627",
  next_subphase_id: "RP20.P05.M03.S11",
  production_ready_flag: "data_room_vdr_core_p05_primary_implementation_head_descriptor_verified",
  hermes_gate: "H20",
  claude_gate: "C20",
});

export const DATA_ROOM_VDR_CORE_CP627_PACK_BINDING = Object.freeze({
  pack_id: "CP00-627",
  planned_pack_id: "CP00-627",
  risk_class: "A",
  unit_count: 10,
  first_unit_id: "RP20.P05.M03.S11",
  last_unit_id: "RP20.P05.M03.S20",
  range: "RP20.P05.M03.S11-RP20.P05.M03.S20",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-626",
  next_pack_id: "CP00-628",
  next_subphase_id: "RP20.P05.M03.S21",
  production_ready_flag: "data_room_vdr_core_p05_primary_implementation_tail_descriptor_verified",
  hermes_gate: "H20",
  claude_gate: "C20",
});

export const DATA_ROOM_VDR_CORE_CP628_PACK_BINDING = Object.freeze({
  pack_id: "CP00-628",
  planned_pack_id: "CP00-628",
  risk_class: "B",
  unit_count: 40,
  first_unit_id: "RP20.P05.M03.S21",
  last_unit_id: "RP20.P05.M05.S16",
  range: "RP20.P05.M03.S21-RP20.P05.M05.S16",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-627",
  next_pack_id: "CP00-629",
  next_subphase_id: "RP20.P05.M05.S17",
  production_ready_flag: "data_room_vdr_core_p05_secondary_workflow_permission_audit_bridge_descriptor_verified",
  hermes_gate: "H20",
  claude_gate: "C20",
});

export const DATA_ROOM_VDR_CORE_CP629_PACK_BINDING = Object.freeze({
  pack_id: "CP00-629",
  planned_pack_id: "CP00-629",
  risk_class: "A",
  unit_count: 10,
  first_unit_id: "RP20.P05.M05.S17",
  last_unit_id: "RP20.P05.M06.S04",
  range: "RP20.P05.M05.S17-RP20.P05.M06.S04",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-628",
  next_pack_id: "CP00-630",
  next_subphase_id: "RP20.P05.M06.S05",
  production_ready_flag: "data_room_vdr_core_p05_permission_audit_tail_synthetic_fixture_head_descriptor_verified",
  hermes_gate: "H20",
  claude_gate: "C20",
});

export const DATA_ROOM_VDR_CORE_CP630_PACK_BINDING = Object.freeze({
  pack_id: "CP00-630",
  planned_pack_id: "CP00-630",
  risk_class: "C",
  unit_count: 150,
  first_unit_id: "RP20.P05.M06.S05",
  last_unit_id: "RP20.P06.M02.S18",
  range: "RP20.P05.M06.S05-RP20.P06.M02.S18",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-629",
  next_pack_id: "CP00-631",
  next_subphase_id: "RP20.P06.M02.S19",
  production_ready_flag: "data_room_vdr_core_p05_fixture_closeout_p06_permission_matrix_bridge_descriptor_verified",
  hermes_gate: "H20",
  claude_gate: "C20",
});

export const DATA_ROOM_VDR_CORE_CP631_PACK_BINDING = Object.freeze({
  pack_id: "CP00-631",
  planned_pack_id: "CP00-631",
  risk_class: "B",
  unit_count: 40,
  first_unit_id: "RP20.P06.M02.S19",
  last_unit_id: "RP20.P06.M04.S14",
  range: "RP20.P06.M02.S19-RP20.P06.M04.S14",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-630",
  next_pack_id: "CP00-632",
  next_subphase_id: "RP20.P06.M04.S15",
  production_ready_flag: "data_room_vdr_core_p06_type_shape_tail_primary_secondary_bridge_descriptor_verified",
  hermes_gate: "H20",
  claude_gate: "C20",
});

export const DATA_ROOM_VDR_CORE_CP632_PACK_BINDING = Object.freeze({
  pack_id: "CP00-632",
  planned_pack_id: "CP00-632",
  risk_class: "A",
  unit_count: 10,
  first_unit_id: "RP20.P06.M04.S15",
  last_unit_id: "RP20.P06.M05.S02",
  range: "RP20.P06.M04.S15-RP20.P06.M05.S02",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-631",
  next_pack_id: "CP00-633",
  next_subphase_id: "RP20.P06.M05.S03",
  production_ready_flag: "data_room_vdr_core_p06_secondary_tail_permission_audit_binding_head_descriptor_verified",
  hermes_gate: "H20",
  claude_gate: "C20",
});

export const DATA_ROOM_VDR_CORE_CP633_PACK_BINDING = Object.freeze({
  pack_id: "CP00-633",
  planned_pack_id: "CP00-633",
  risk_class: "A",
  unit_count: 10,
  first_unit_id: "RP20.P06.M05.S03",
  last_unit_id: "RP20.P06.M05.S12",
  range: "RP20.P06.M05.S03-RP20.P06.M05.S12",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-632",
  next_pack_id: "CP00-634",
  next_subphase_id: "RP20.P06.M05.S13",
  production_ready_flag: "data_room_vdr_core_p06_permission_audit_binding_middle_descriptor_verified",
  hermes_gate: "H20",
  claude_gate: "C20",
});

export const DATA_ROOM_VDR_CORE_CP634_PACK_BINDING = Object.freeze({
  pack_id: "CP00-634",
  planned_pack_id: "CP00-634",
  risk_class: "A",
  unit_count: 10,
  first_unit_id: "RP20.P06.M05.S13",
  last_unit_id: "RP20.P06.M05.S22",
  range: "RP20.P06.M05.S13-RP20.P06.M05.S22",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-633",
  next_pack_id: "CP00-635",
  next_subphase_id: "RP20.P06.M06.S01",
  production_ready_flag: "data_room_vdr_core_p06_permission_audit_binding_tail_descriptor_verified",
  hermes_gate: "H20",
  claude_gate: "C20",
});

export const DATA_ROOM_VDR_CORE_CP635_PACK_BINDING = Object.freeze({
  pack_id: "CP00-635",
  planned_pack_id: "CP00-635",
  risk_class: "A",
  unit_count: 10,
  first_unit_id: "RP20.P06.M06.S01",
  last_unit_id: "RP20.P06.M06.S10",
  range: "RP20.P06.M06.S01-RP20.P06.M06.S10",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-634",
  next_pack_id: "CP00-636",
  next_subphase_id: "RP20.P06.M06.S11",
  production_ready_flag: "data_room_vdr_core_p06_synthetic_fixture_head_descriptor_verified",
  hermes_gate: "H20",
  claude_gate: "C20",
});

export const DATA_ROOM_VDR_CORE_CP636_PACK_BINDING = Object.freeze({
  pack_id: "CP00-636",
  planned_pack_id: "CP00-636",
  risk_class: "C",
  unit_count: 150,
  first_unit_id: "RP20.P06.M06.S11",
  last_unit_id: "RP20.P07.M02.S12",
  range: "RP20.P06.M06.S11-RP20.P07.M02.S12",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-635",
  next_pack_id: "CP00-637",
  next_subphase_id: "RP20.P07.M02.S13",
  production_ready_flag: "data_room_vdr_core_p06_p07_fixture_failure_bridge_descriptor_verified",
  hermes_gate: "H20",
  claude_gate: "C20",
});

export const DATA_ROOM_VDR_CORE_CP637_PACK_BINDING = Object.freeze({
  pack_id: "CP00-637",
  planned_pack_id: "CP00-637",
  risk_class: "B",
  unit_count: 40,
  first_unit_id: "RP20.P07.M02.S13",
  last_unit_id: "RP20.P07.M04.S08",
  range: "RP20.P07.M02.S13-RP20.P07.M04.S08",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-636",
  next_pack_id: "CP00-638",
  next_subphase_id: "RP20.P07.M04.S09",
  production_ready_flag: "data_room_vdr_core_p07_failure_recovery_type_primary_secondary_bridge_descriptor_verified",
  hermes_gate: "H20",
  claude_gate: "C20",
});

export const DATA_ROOM_VDR_CORE_CP638_PACK_BINDING = Object.freeze({
  pack_id: "CP00-638",
  planned_pack_id: "CP00-638",
  risk_class: "B",
  unit_count: 40,
  first_unit_id: "RP20.P07.M04.S09",
  last_unit_id: "RP20.P07.M06.S04",
  range: "RP20.P07.M04.S09-RP20.P07.M06.S04",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-637",
  next_pack_id: "CP00-639",
  next_subphase_id: "RP20.P07.M06.S05",
  production_ready_flag: "data_room_vdr_core_p07_secondary_tail_permission_audit_fixture_head_descriptor_verified",
  hermes_gate: "H20",
  claude_gate: "C20",
});

export const DATA_ROOM_VDR_CORE_CP639_PACK_BINDING = Object.freeze({
  pack_id: "CP00-639",
  planned_pack_id: "CP00-639",
  risk_class: "C",
  unit_count: 150,
  first_unit_id: "RP20.P07.M06.S05",
  last_unit_id: "RP20.P08.M02.S16",
  range: "RP20.P07.M06.S05-RP20.P08.M02.S16",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-638",
  next_pack_id: "CP00-640",
  next_subphase_id: "RP20.P08.M02.S17",
  production_ready_flag: "data_room_vdr_core_p07_fixture_closeout_p08_hermes_evidence_bridge_descriptor_verified",
  hermes_gate: "H20",
  claude_gate: "C20",
});

export const DATA_ROOM_VDR_CORE_CP640_PACK_BINDING = Object.freeze({
  pack_id: "CP00-640",
  planned_pack_id: "CP00-640",
  risk_class: "B",
  unit_count: 40,
  first_unit_id: "RP20.P08.M02.S17",
  last_unit_id: "RP20.P08.M04.S14",
  range: "RP20.P08.M02.S17-RP20.P08.M04.S14",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-639",
  next_pack_id: "CP00-641",
  next_subphase_id: "RP20.P08.M04.S15",
  production_ready_flag: "data_room_vdr_core_p08_hermes_evidence_type_primary_secondary_bridge_descriptor_verified",
  hermes_gate: "H20",
  claude_gate: "C20",
});

export const DATA_ROOM_VDR_CORE_CP641_PACK_BINDING = Object.freeze({
  pack_id: "CP00-641",
  planned_pack_id: "CP00-641",
  risk_class: "B",
  unit_count: 40,
  first_unit_id: "RP20.P08.M04.S15",
  last_unit_id: "RP20.P08.M06.S10",
  range: "RP20.P08.M04.S15-RP20.P08.M06.S10",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-640",
  next_pack_id: "CP00-642",
  next_subphase_id: "RP20.P08.M06.S11",
  production_ready_flag: "data_room_vdr_core_p08_hermes_evidence_secondary_permission_fixture_bridge_descriptor_verified",
  hermes_gate: "H20",
  claude_gate: "C20",
});

export const DATA_ROOM_VDR_CORE_CP642_PACK_BINDING = Object.freeze({
  pack_id: "CP00-642",
  planned_pack_id: "CP00-642",
  risk_class: "A",
  unit_count: 10,
  first_unit_id: "RP20.P08.M06.S11",
  last_unit_id: "RP20.P08.M06.S20",
  range: "RP20.P08.M06.S11-RP20.P08.M06.S20",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-641",
  next_pack_id: "CP00-643",
  next_subphase_id: "RP20.P08.M06.S21",
  production_ready_flag: "data_room_vdr_core_p08_hermes_evidence_synthetic_fixture_tail_descriptor_verified",
  hermes_gate: "H20",
  claude_gate: "C20",
});

export const DATA_ROOM_VDR_CORE_CP643_PACK_BINDING = Object.freeze({
  pack_id: "CP00-643",
  planned_pack_id: "CP00-643",
  risk_class: "C",
  unit_count: 150,
  first_unit_id: "RP20.P08.M06.S21",
  last_unit_id: "RP20.P09.M04.S12",
  range: "RP20.P08.M06.S21-RP20.P09.M04.S12",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-642",
  next_pack_id: "CP00-644",
  next_subphase_id: "RP20.P09.M04.S13",
  production_ready_flag: "data_room_vdr_core_p08_p09_review_closeout_bridge_descriptor_verified",
  hermes_gate: "H20",
  claude_gate: "C20",
});

export const DATA_ROOM_VDR_CORE_CP644_PACK_BINDING = Object.freeze({
  pack_id: "CP00-644",
  planned_pack_id: "CP00-644",
  risk_class: "C",
  unit_count: 122,
  first_unit_id: "RP20.P09.M04.S13",
  last_unit_id: "RP20.P09.M10.S10",
  range: "RP20.P09.M04.S13-RP20.P09.M10.S10",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-643",
  next_pack_id: "CP00-645",
  next_subphase_id: "RP21.P00.M00.S01",
  production_ready_flag: "data_room_vdr_core_p09_review_closeout_tail_descriptor_verified",
  hermes_gate: "H20",
  claude_gate: "C20",
});

export const DATA_ROOM_VDR_CORE_CP610_SECTION_ROWS = freezeSectionRows({
  "RP20.P00.M00": BASIC_SCOPE_ROWS,
  "RP20.P00.M01": BASIC_SCOPE_ROWS,
  "RP20.P00.M02": FOUNDATION_ROWS,
  "RP20.P00.M03": FULL_SCOPE_ROWS,
  "RP20.P00.M04": SECONDARY_WORKFLOW_ROWS,
  "RP20.P00.M05": FULL_SCOPE_ROWS,
  "RP20.P00.M06": FOUNDATION_ROWS,
  "RP20.P00.M07": FULL_SCOPE_ROWS,
  "RP20.P00.M08": FOUNDATION_ROWS,
  "RP20.P00.M09": FOUNDATION_ROWS,
  "RP20.P00.M10": BASIC_SCOPE_ROWS,
  "RP20.P01.M00": P01_MODEL_ROWS,
  "RP20.P01.M01": P01_MODEL_ROWS,
  "RP20.P01.M02": P01_MODEL_ROWS.slice(0, 8),
});

export const DATA_ROOM_VDR_CORE_CP610_MICRO_TITLES = Object.freeze({
  "RP20.P00.M00": "Scope Inventory",
  "RP20.P00.M01": "Contract Draft",
  "RP20.P00.M02": "Type And Shape Definition",
  "RP20.P00.M03": "Primary Implementation Slice",
  "RP20.P00.M04": "Secondary Workflow Slice",
  "RP20.P00.M05": "Permission And Audit Binding",
  "RP20.P00.M06": "Synthetic Fixture Set",
  "RP20.P00.M07": "Test And Golden Case Set",
  "RP20.P00.M08": "Hermes Evidence Packet",
  "RP20.P00.M09": "Claude Review Packet",
  "RP20.P00.M10": "Closeout And Next Handoff",
  "RP20.P01.M00": "Scope Inventory",
  "RP20.P01.M01": "Contract Draft",
  "RP20.P01.M02": "Type And Shape Definition",
});

export const DATA_ROOM_VDR_CORE_CP610_DELIVERABLE_COUNTS = Object.freeze({
  implementation: 108,
  contract: 8,
  security_audit: 16,
  hermes_evidence: 7,
  claude_review: 3,
  ui: 8,
});

const MODEL_TAIL_ROWS = freezeArray([
  "Optional field registry",
  "State transition map",
  "Validation helper",
  "Fixture model",
  "Serialization shape",
  "Public export",
  "Model unit test",
  "Invalid reference test",
  "Ownership drift test",
  "Hermes model summary",
  "Claude model review prompt",
  "Closeout handoff",
]);

const MODEL_FULL_ROWS = freezeArray([
  ...P01_MODEL_ROWS,
  "Validation helper",
  "Fixture model",
  "Serialization shape",
  "Public export",
  "Model unit test",
  "Invalid reference test",
  "Ownership drift test",
  "Hermes model summary",
  "Claude model review prompt",
  "Closeout handoff",
  "Documentation entry",
  "Index export check",
]);

export const DATA_ROOM_VDR_CORE_CP611_SECTION_ROWS = freezeSectionRows({
  "RP20.P01.M02": MODEL_TAIL_ROWS,
  "RP20.P01.M03": MODEL_FULL_ROWS,
  "RP20.P01.M04": P01_MODEL_ROWS.slice(0, 6),
});

export const DATA_ROOM_VDR_CORE_CP611_MICRO_TITLES = Object.freeze({
  "RP20.P01.M02": "Type And Shape Definition",
  "RP20.P01.M03": "Primary Implementation Slice",
  "RP20.P01.M04": "Secondary Workflow Slice",
});

export const DATA_ROOM_VDR_CORE_CP611_DELIVERABLE_COUNTS = Object.freeze({
  implementation: 23,
  ui: 5,
  fixture: 2,
  test: 6,
  hermes_evidence: 2,
  claude_review: 2,
});

const MODEL_SECONDARY_TAIL_ROWS = freezeArray([
  ...P01_MODEL_ROWS.slice(6),
  "Validation helper",
  "Fixture model",
  "Serialization shape",
  "Public export",
  "Model unit test",
  "Invalid reference test",
  "Ownership drift test",
  "Hermes model summary",
  "Claude model review prompt",
  "Closeout handoff",
]);

export const DATA_ROOM_VDR_CORE_CP612_SECTION_ROWS = freezeSectionRows({
  "RP20.P01.M04": MODEL_SECONDARY_TAIL_ROWS,
  "RP20.P01.M05": MODEL_FULL_ROWS,
  "RP20.P01.M06": P01_MODEL_ROWS.slice(0, 4),
});

export const DATA_ROOM_VDR_CORE_CP612_MICRO_TITLES = Object.freeze({
  "RP20.P01.M04": "Secondary Workflow Slice",
  "RP20.P01.M05": "Permission And Audit Binding",
  "RP20.P01.M06": "Synthetic Fixture Set",
});

export const DATA_ROOM_VDR_CORE_CP612_DELIVERABLE_COUNTS = Object.freeze({
  implementation: 22,
  ui: 6,
  fixture: 2,
  test: 6,
  hermes_evidence: 2,
  claude_review: 2,
});

const MODEL_SYNTHETIC_TAIL_ROWS = freezeArray([
  ...P01_MODEL_ROWS.slice(4),
  "Validation helper",
  "Fixture model",
  "Serialization shape",
  "Public export",
  "Model unit test",
  "Invalid reference test",
  "Ownership drift test",
  "Hermes model summary",
  "Claude model review prompt",
  "Closeout handoff",
]);

const MODEL_RUNTIME_PACKET_ROWS = freezeArray(MODEL_FULL_ROWS.slice(0, 20));

const P02_SERVICE_ROWS = freezeArray([
  "Service entrypoint contract",
  "Request normalization",
  "Tenant boundary precheck",
  "Matter trace precheck",
  "Permission precheck",
  "Audit hint precheck",
  "Primary happy path",
  "Secondary workflow path",
  "State transition enforcement",
  "Idempotency key handling",
  "Lock acquisition rule",
  "Persistence boundary",
  "Validation error mapping",
  "Review-required routing",
  "Approval-required routing",
  "Blocked-claim output",
  "Rollback behavior",
  "Retry behavior",
  "Unit test: happy path",
  "Unit test: denied path",
]);

const P02_SERVICE_REVIEW_ROWS = freezeArray([
  ...P02_SERVICE_ROWS,
  "Unit test: review path",
  "Integration smoke case",
]);

export const DATA_ROOM_VDR_CORE_CP613_SECTION_ROWS = freezeSectionRows({
  "RP20.P01.M06": MODEL_SYNTHETIC_TAIL_ROWS,
  "RP20.P01.M07": MODEL_FULL_ROWS,
  "RP20.P01.M08": MODEL_RUNTIME_PACKET_ROWS,
  "RP20.P01.M09": MODEL_RUNTIME_PACKET_ROWS,
  "RP20.P01.M10": P01_MODEL_ROWS,
  "RP20.P02.M00": P02_SERVICE_ROWS,
  "RP20.P02.M01": P02_SERVICE_ROWS,
  "RP20.P02.M02": P02_SERVICE_REVIEW_ROWS,
});

export const DATA_ROOM_VDR_CORE_CP613_MICRO_TITLES = Object.freeze({
  "RP20.P01.M06": "Synthetic Fixture Set",
  "RP20.P01.M07": "Test And Golden Case Set",
  "RP20.P01.M08": "Hermes Evidence Packet",
  "RP20.P01.M09": "Claude Review Packet",
  "RP20.P01.M10": "Closeout And Next Handoff",
  "RP20.P02.M00": "Scope Inventory",
  "RP20.P02.M01": "Contract Draft",
  "RP20.P02.M02": "Type And Shape Definition",
});

export const DATA_ROOM_VDR_CORE_CP613_DELIVERABLE_COUNTS = Object.freeze({
  implementation: 77,
  ui: 23,
  fixture: 4,
  test: 20,
  hermes_evidence: 4,
  claude_review: 7,
  contract: 3,
  security_audit: 6,
  failure_recovery: 6,
});

export const DATA_ROOM_VDR_CORE_CP614_SECTION_ROWS = freezeSectionRows({
  "RP20.P02.M03": P02_SERVICE_REVIEW_ROWS,
  "RP20.P02.M04": P02_SERVICE_ROWS.slice(0, 18),
});

export const DATA_ROOM_VDR_CORE_CP614_MICRO_TITLES = Object.freeze({
  "RP20.P02.M03": "Primary Implementation Slice",
  "RP20.P02.M04": "Secondary Workflow Slice",
});

export const DATA_ROOM_VDR_CORE_CP614_DELIVERABLE_COUNTS = Object.freeze({
  implementation: 18,
  contract: 2,
  security_audit: 4,
  ui: 6,
  claude_review: 2,
  failure_recovery: 4,
  test: 4,
});

const P02_SERVICE_TEST_TAIL_ROWS = freezeArray([
  "Unit test: happy path",
  "Unit test: denied path",
  "Unit test: review path",
  "Integration smoke case",
]);

export const DATA_ROOM_VDR_CORE_CP615_SECTION_ROWS = freezeSectionRows({
  "RP20.P02.M04": P02_SERVICE_TEST_TAIL_ROWS,
  "RP20.P02.M05": P02_SERVICE_REVIEW_ROWS,
  "RP20.P02.M06": P02_SERVICE_ROWS.slice(0, 14),
});

export const DATA_ROOM_VDR_CORE_CP615_MICRO_TITLES = Object.freeze({
  "RP20.P02.M04": "Secondary Workflow Slice",
  "RP20.P02.M05": "Permission And Audit Binding",
  "RP20.P02.M06": "Synthetic Fixture Set",
});

export const DATA_ROOM_VDR_CORE_CP615_DELIVERABLE_COUNTS = Object.freeze({
  implementation: 17,
  contract: 2,
  security_audit: 4,
  ui: 5,
  claude_review: 2,
  failure_recovery: 2,
  test: 8,
});

export const DATA_ROOM_VDR_CORE_CP616_SECTION_ROWS = freezeSectionRows({
  "RP20.P02.M06": P02_SERVICE_REVIEW_ROWS.slice(14),
  "RP20.P02.M07": P02_SERVICE_ROWS.slice(0, 2),
});

export const DATA_ROOM_VDR_CORE_CP616_MICRO_TITLES = Object.freeze({
  "RP20.P02.M06": "Synthetic Fixture Set",
  "RP20.P02.M07": "Test And Golden Case Set",
});

export const DATA_ROOM_VDR_CORE_CP616_DELIVERABLE_COUNTS = Object.freeze({
  implementation: 2,
  ui: 1,
  failure_recovery: 2,
  test: 4,
  contract: 1,
});

export const DATA_ROOM_VDR_CORE_CP617_SECTION_ROWS = freezeSectionRows({
  "RP20.P02.M07": P02_SERVICE_ROWS.slice(2, 12),
});

export const DATA_ROOM_VDR_CORE_CP617_MICRO_TITLES = Object.freeze({
  "RP20.P02.M07": "Test And Golden Case Set",
});

export const DATA_ROOM_VDR_CORE_CP617_DELIVERABLE_COUNTS = Object.freeze({
  implementation: 6,
  security_audit: 2,
  ui: 2,
});

export const DATA_ROOM_VDR_CORE_CP618_SECTION_ROWS = freezeSectionRows({
  "RP20.P02.M07": P02_SERVICE_REVIEW_ROWS.slice(12),
  "RP20.P02.M08": P02_SERVICE_REVIEW_ROWS,
  "RP20.P02.M09": P02_SERVICE_ROWS.slice(0, 8),
});

export const DATA_ROOM_VDR_CORE_CP618_MICRO_TITLES = Object.freeze({
  "RP20.P02.M07": "Test And Golden Case Set",
  "RP20.P02.M08": "Hermes Evidence Packet",
  "RP20.P02.M09": "Claude Review Packet",
});

export const DATA_ROOM_VDR_CORE_CP618_DELIVERABLE_COUNTS = Object.freeze({
  implementation: 16,
  claude_review: 2,
  ui: 4,
  failure_recovery: 4,
  test: 8,
  contract: 2,
  security_audit: 4,
});

const P03_API_CONTRACT_ROWS = freezeArray([
  "Public export map",
  "Request contract",
  "Response contract",
  "Error code taxonomy",
  "Permission annotation",
  "Audit annotation",
  "Pagination or filtering contract",
  "Serialization guard",
  "Unauthorized data omission",
  "API fixture",
]);

const P03_API_INTERFACE_ROWS = freezeArray([
  ...P03_API_CONTRACT_ROWS,
  "Contract test",
  "Invalid request test",
  "Denied response test",
  "Hermes API evidence",
  "Claude interface prompt",
  "Documentation example",
  "Versioning note",
  "Closeout handoff",
  "Downstream consumer note",
  "Command rerun",
]);

const P03_API_INTERFACE_COMPAT_ROWS = freezeArray([
  ...P03_API_INTERFACE_ROWS,
  "Schema drift check",
  "Backward compatibility check",
]);

export const DATA_ROOM_VDR_CORE_CP619_SECTION_ROWS = freezeSectionRows({
  "RP20.P02.M09": P02_SERVICE_REVIEW_ROWS.slice(8),
  "RP20.P02.M10": P02_SERVICE_ROWS,
  "RP20.P03.M00": P03_API_CONTRACT_ROWS,
  "RP20.P03.M01": P03_API_CONTRACT_ROWS,
  "RP20.P03.M02": P03_API_INTERFACE_ROWS,
  "RP20.P03.M03": P03_API_INTERFACE_COMPAT_ROWS,
  "RP20.P03.M04": P03_API_INTERFACE_ROWS,
  "RP20.P03.M05": P03_API_INTERFACE_COMPAT_ROWS,
  "RP20.P03.M06": P03_API_INTERFACE_ROWS.slice(0, 12),
});

export const DATA_ROOM_VDR_CORE_CP619_MICRO_TITLES = Object.freeze({
  "RP20.P02.M09": "Claude Review Packet",
  "RP20.P02.M10": "Closeout And Next Handoff",
  "RP20.P03.M00": "Scope Inventory",
  "RP20.P03.M01": "Contract Draft",
  "RP20.P03.M02": "Type And Shape Definition",
  "RP20.P03.M03": "Primary Implementation Slice",
  "RP20.P03.M04": "Secondary Workflow Slice",
  "RP20.P03.M05": "Permission And Audit Binding",
  "RP20.P03.M06": "Synthetic Fixture Set",
});

export const DATA_ROOM_VDR_CORE_CP619_DELIVERABLE_COUNTS = Object.freeze({
  implementation: 63,
  contract: 31,
  security_audit: 16,
  test: 20,
  hermes_evidence: 4,
  claude_review: 6,
  ui: 6,
  failure_recovery: 4,
});

const P04_UI_FOUNDATION_ROWS = freezeArray([
  "UI surface inventory",
  "Data dependency map",
  "Loading state",
  "Empty state",
  "Denied state",
  "Review-required state",
  "Primary interaction",
  "Secondary interaction",
  "Permission badge",
  "Audit hint display",
]);

const P04_UI_WORKFLOW_ROWS = freezeArray([
  ...P04_UI_FOUNDATION_ROWS,
  "Error message copy",
  "Responsive desktop layout",
  "Responsive mobile layout",
  "Keyboard/focus behavior",
  "Visual density check",
  "Synthetic fixture binding",
  "Build smoke",
  "Hermes UI evidence",
  "Claude UI leak prompt",
  "Closeout handoff",
]);

export const DATA_ROOM_VDR_CORE_CP620_SECTION_ROWS = freezeSectionRows({
  "RP20.P03.M06": P03_API_INTERFACE_ROWS.slice(12),
  "RP20.P03.M07": P03_API_INTERFACE_COMPAT_ROWS,
  "RP20.P03.M08": P03_API_INTERFACE_ROWS,
  "RP20.P03.M09": P03_API_INTERFACE_ROWS,
  "RP20.P03.M10": P03_API_CONTRACT_ROWS,
  "RP20.P04.M00": P04_UI_FOUNDATION_ROWS,
  "RP20.P04.M01": P04_UI_WORKFLOW_ROWS,
  "RP20.P04.M02": P04_UI_WORKFLOW_ROWS,
  "RP20.P04.M03": P04_UI_WORKFLOW_ROWS,
});

export const DATA_ROOM_VDR_CORE_CP620_MICRO_TITLES = Object.freeze({
  "RP20.P03.M06": "Synthetic Fixture Set",
  "RP20.P03.M07": "Test And Golden Case Set",
  "RP20.P03.M08": "Hermes Evidence Packet",
  "RP20.P03.M09": "Claude Review Packet",
  "RP20.P03.M10": "Closeout And Next Handoff",
  "RP20.P04.M00": "Scope Inventory",
  "RP20.P04.M01": "Contract Draft",
  "RP20.P04.M02": "Type And Shape Definition",
  "RP20.P04.M03": "Primary Implementation Slice",
});

export const DATA_ROOM_VDR_CORE_CP620_DELIVERABLE_COUNTS = Object.freeze({
  implementation: 53,
  ui: 30,
  security_audit: 16,
  claude_review: 11,
  fixture: 3,
  test: 13,
  hermes_evidence: 7,
  contract: 17,
});

const P04_UI_EXTENDED_ROWS = freezeArray([
  ...P04_UI_WORKFLOW_ROWS,
  "State snapshot",
  "No unauthorized count leak",
]);

const P05_FIXTURE_FOUNDATION_ROWS = freezeArray([
  "Base tenant fixture",
  "Base user fixture",
  "Base matter fixture",
  "Base document fixture",
  "Primary golden case",
  "Secondary golden case",
  "Review-required case",
  "Denied case",
  "Cross-tenant case",
  "Missing context case",
]);

const P05_FIXTURE_TAIL_ROWS = freezeArray([
  "Audit hint case",
  "Security trimming case",
  "AI retrieval or analytics case",
  "Fixture manifest",
  "Golden test",
  "Failure test",
  "Hermes fixture evidence",
  "Claude missing-test prompt",
  "Closeout handoff",
  "No-real-data check",
]);

const P05_STABLE_REPLAY_ROWS = freezeArray([
  "Stable ID check",
  "Replay command",
]);

const P05_FIXTURE_EXTENDED_ROWS = freezeArray([
  ...P05_FIXTURE_FOUNDATION_ROWS,
  ...P05_FIXTURE_TAIL_ROWS,
  ...P05_STABLE_REPLAY_ROWS,
]);

const P05_FIXTURE_PERMISSION_HEAD_ROWS = freezeArray([
  ...P05_FIXTURE_FOUNDATION_ROWS,
  ...P05_FIXTURE_TAIL_ROWS.slice(0, 6),
]);

const P05_PERMISSION_AUDIT_TAIL_ROWS = freezeArray([
  ...P05_FIXTURE_TAIL_ROWS.slice(6),
  ...P05_STABLE_REPLAY_ROWS,
]);

const P05_SYNTHETIC_FIXTURE_HEAD_ROWS = freezeArray(P05_FIXTURE_FOUNDATION_ROWS.slice(0, 4));

const P05_SYNTHETIC_FIXTURE_REMAINDER_ROWS = freezeArray([
  ...P05_FIXTURE_FOUNDATION_ROWS.slice(4),
  ...P05_FIXTURE_TAIL_ROWS,
  ...P05_STABLE_REPLAY_ROWS,
]);

const P05_FIXTURE_NO_STABLE_ROWS = freezeArray([
  ...P05_FIXTURE_FOUNDATION_ROWS,
  ...P05_FIXTURE_TAIL_ROWS,
]);

const P06_PERMISSION_AUDIT_ROWS = freezeArray([
  "Permission matrix row",
  "View decision binding",
  "Search decision binding",
  "Mutation decision binding",
  "Export/download decision binding",
  "Share decision binding",
  "AI retrieval decision binding",
  "Audit hint fields",
  "Matched rule capture",
  "Deny-over-allow check",
  "Legal hold interaction",
  "Ethical wall interaction",
  "Object ACL interaction",
  "Review-required route",
  "Approval-required route",
  "Security trimming proof",
  "Audit event expectation",
  "Permission fixture",
  "Allowed test",
  "Denied test",
]);

const P06_PERMISSION_AUDIT_HEAD_ROWS = freezeArray(P06_PERMISSION_AUDIT_ROWS.slice(0, 18));

const P06_PERMISSION_AUDIT_TEST_TAIL_ROWS = freezeArray([
  "Allowed test",
  "Denied test",
  "Cross-tenant test",
  "Leak prevention test",
]);

const P06_PERMISSION_AUDIT_EXTENDED_ROWS = freezeArray([
  ...P06_PERMISSION_AUDIT_ROWS,
  "Cross-tenant test",
  "Leak prevention test",
]);

const P06_PERMISSION_AUDIT_HEAD_14_ROWS = freezeArray(P06_PERMISSION_AUDIT_ROWS.slice(0, 14));

const P06_PERMISSION_AUDIT_SECONDARY_TAIL_ROWS = freezeArray([
  ...P06_PERMISSION_AUDIT_ROWS.slice(14),
  "Cross-tenant test",
  "Leak prevention test",
]);

const P06_PERMISSION_AUDIT_BINDING_HEAD_ROWS = freezeArray(P06_PERMISSION_AUDIT_ROWS.slice(0, 2));

const P06_PERMISSION_AUDIT_BINDING_MIDDLE_ROWS = freezeArray(P06_PERMISSION_AUDIT_ROWS.slice(2, 12));

const P06_PERMISSION_AUDIT_BINDING_TAIL_ROWS = freezeArray([
  ...P06_PERMISSION_AUDIT_ROWS.slice(12),
  "Cross-tenant test",
  "Leak prevention test",
]);

const P06_SYNTHETIC_FIXTURE_HEAD_ROWS = freezeArray(P06_PERMISSION_AUDIT_ROWS.slice(0, 10));

const P06_SYNTHETIC_FIXTURE_TAIL_ROWS = freezeArray([
  ...P06_PERMISSION_AUDIT_ROWS.slice(10),
  "Cross-tenant test",
  "Leak prevention test",
]);

const P07_FAILURE_RECOVERY_ROWS = freezeArray([
  "Failure taxonomy",
  "Missing tenant failure",
  "Missing actor failure",
  "Missing Matter failure",
  "Missing resource failure",
  "Unknown action failure",
  "Cross-tenant failure",
  "Permission denied failure",
  "Ambiguous rule failure",
  "Stale reference failure",
  "Lock conflict failure",
  "Retry exhaustion failure",
  "Rollback expectation",
  "Compensation expectation",
  "Blocked-claim receipt",
  "Failure fixture",
  "Failure unit test",
  "Failure integration smoke",
  "Audit failure hint",
  "Hermes failure evidence",
]);

const P07_FAILURE_RECOVERY_HEAD_ROWS = freezeArray(P07_FAILURE_RECOVERY_ROWS.slice(0, 12));

const P07_FAILURE_RECOVERY_EXTENDED_ROWS = freezeArray([
  ...P07_FAILURE_RECOVERY_ROWS,
  "Claude edge-case prompt",
  "Human escalation note",
]);

const P07_FAILURE_RECOVERY_TYPE_SHAPE_TAIL_ROWS = freezeArray(P07_FAILURE_RECOVERY_EXTENDED_ROWS.slice(12));

const P07_FAILURE_RECOVERY_SECONDARY_HEAD_ROWS = freezeArray(P07_FAILURE_RECOVERY_EXTENDED_ROWS.slice(0, 8));

const P07_FAILURE_RECOVERY_SECONDARY_TAIL_ROWS = freezeArray(P07_FAILURE_RECOVERY_EXTENDED_ROWS.slice(8));

const P07_FAILURE_RECOVERY_SYNTHETIC_FIXTURE_HEAD_ROWS = freezeArray(P07_FAILURE_RECOVERY_EXTENDED_ROWS.slice(0, 4));

const P07_FAILURE_RECOVERY_SYNTHETIC_FIXTURE_TAIL_ROWS = freezeArray(P07_FAILURE_RECOVERY_EXTENDED_ROWS.slice(4));

const P07_FAILURE_RECOVERY_CLOSEOUT_ROWS = freezeArray(P07_FAILURE_RECOVERY_ROWS);

const P08_HERMES_EVIDENCE_ROWS = freezeArray([
  "Hermes command matrix",
  "Evidence field list",
  "Changed-file receipt",
  "Command result receipt",
  "Fixture summary receipt",
  "Blocked-claim receipt",
  "Permission summary receipt",
  "Audit summary receipt",
  "No-real-data receipt",
  "Claude dependency marker",
  "Human approval marker",
  "PASS semantics",
  "PASS_WITH_FINDINGS semantics",
  "BLOCK semantics",
  "Evidence template",
  "Validation command check",
  "Harness boundary note",
  "Closeout handoff",
  "Regression receipt",
  "Next gate readiness",
]);

const P08_HERMES_EVIDENCE_EXTENDED_ROWS = freezeArray([
  ...P08_HERMES_EVIDENCE_ROWS,
  "Documentation update",
  "Operator summary",
]);

const P08_HERMES_EVIDENCE_FOUNDATION_ROWS = freezeArray(P08_HERMES_EVIDENCE_ROWS.slice(0, 10));

const P08_HERMES_EVIDENCE_SYNTHETIC_FIXTURE_TAIL_ROWS = freezeArray(P08_HERMES_EVIDENCE_ROWS.slice(10));

const P08_HERMES_EVIDENCE_TYPE_SHAPE_HEAD_ROWS = freezeArray(P08_HERMES_EVIDENCE_ROWS.slice(0, 16));

const P08_HERMES_EVIDENCE_TYPE_SHAPE_TAIL_ROWS = freezeArray(P08_HERMES_EVIDENCE_ROWS.slice(16));

const P08_HERMES_EVIDENCE_SECONDARY_HEAD_ROWS = freezeArray(P08_HERMES_EVIDENCE_ROWS.slice(0, 14));

const P08_HERMES_EVIDENCE_SECONDARY_TAIL_ROWS = freezeArray(P08_HERMES_EVIDENCE_EXTENDED_ROWS.slice(14));

const P08_HERMES_EVIDENCE_DOCUMENTATION_TAIL_ROWS = freezeArray(P08_HERMES_EVIDENCE_EXTENDED_ROWS.slice(20));

const P09_REVIEW_QUESTION_ROWS = freezeArray([
  "Architecture review questions",
  "Security review questions",
  "Permission bypass questions",
  "Audit completeness questions",
  "Missing test questions",
  "UI leak questions",
  "Downstream readiness questions",
  "Risk register",
  "Severity taxonomy",
  "Go/no-go verdict format",
]);

const P09_REVIEW_EXTENDED_ROWS = freezeArray([
  ...P09_REVIEW_QUESTION_ROWS,
  "Finding routing map",
  "Human approval summary",
  "Claude review packet",
  "Closeout criteria",
  "PASS closeout note",
  "PASS_WITH_FINDINGS closeout note",
  "BLOCK closeout note",
  "Next RP dependency",
  "Documentation update",
  "Command rerun",
]);

const P09_REVIEW_FULL_ROWS = freezeArray([
  ...P09_REVIEW_EXTENDED_ROWS,
  "Review receipt placeholder",
  "Future correction slot",
]);

const P09_REVIEW_SECONDARY_HEAD_ROWS = freezeArray(P09_REVIEW_EXTENDED_ROWS.slice(0, 12));

const P09_REVIEW_SECONDARY_TAIL_ROWS = freezeArray(P09_REVIEW_EXTENDED_ROWS.slice(12));

export const DATA_ROOM_VDR_CORE_CP621_SECTION_ROWS = freezeSectionRows({
  "RP20.P04.M04": P04_UI_EXTENDED_ROWS,
  "RP20.P04.M05": P04_UI_EXTENDED_ROWS,
  "RP20.P04.M06": P04_UI_EXTENDED_ROWS,
  "RP20.P04.M07": P04_UI_EXTENDED_ROWS,
  "RP20.P04.M08": P04_UI_EXTENDED_ROWS,
  "RP20.P04.M09": P04_UI_WORKFLOW_ROWS,
  "RP20.P04.M10": P04_UI_FOUNDATION_ROWS,
  "RP20.P05.M00": P05_FIXTURE_FOUNDATION_ROWS,
});

export const DATA_ROOM_VDR_CORE_CP621_MICRO_TITLES = Object.freeze({
  "RP20.P04.M04": "Secondary Workflow Slice",
  "RP20.P04.M05": "Permission And Audit Binding",
  "RP20.P04.M06": "Synthetic Fixture Set",
  "RP20.P04.M07": "Test And Golden Case Set",
  "RP20.P04.M08": "Hermes Evidence Packet",
  "RP20.P04.M09": "Claude Review Packet",
  "RP20.P04.M10": "Closeout And Next Handoff",
  "RP20.P05.M00": "Scope Inventory",
});

export const DATA_ROOM_VDR_CORE_CP621_DELIVERABLE_COUNTS = Object.freeze({
  implementation: 39,
  ui: 59,
  security_audit: 14,
  claude_review: 14,
  fixture: 12,
  test: 6,
  hermes_evidence: 6,
});

export const DATA_ROOM_VDR_CORE_CP622_SECTION_ROWS = freezeSectionRows({
  "RP20.P05.M01": P05_FIXTURE_FOUNDATION_ROWS,
});

export const DATA_ROOM_VDR_CORE_CP622_MICRO_TITLES = Object.freeze({
  "RP20.P05.M01": "Contract Draft",
});

export const DATA_ROOM_VDR_CORE_CP622_DELIVERABLE_COUNTS = Object.freeze({
  fixture: 6,
  claude_review: 1,
  implementation: 3,
});

export const DATA_ROOM_VDR_CORE_CP623_SECTION_ROWS = freezeSectionRows({
  "RP20.P05.M01": P05_FIXTURE_TAIL_ROWS,
});

export const DATA_ROOM_VDR_CORE_CP623_MICRO_TITLES = Object.freeze({
  "RP20.P05.M01": "Contract Draft",
});

export const DATA_ROOM_VDR_CORE_CP623_DELIVERABLE_COUNTS = Object.freeze({
  security_audit: 2,
  implementation: 3,
  fixture: 1,
  test: 3,
  hermes_evidence: 1,
});

export const DATA_ROOM_VDR_CORE_CP624_SECTION_ROWS = freezeSectionRows({
  "RP20.P05.M02": P05_FIXTURE_FOUNDATION_ROWS,
});

export const DATA_ROOM_VDR_CORE_CP624_MICRO_TITLES = Object.freeze({
  "RP20.P05.M02": "Type And Shape Definition",
});

export const DATA_ROOM_VDR_CORE_CP624_DELIVERABLE_COUNTS = Object.freeze({
  fixture: 6,
  claude_review: 1,
  implementation: 3,
});

export const DATA_ROOM_VDR_CORE_CP625_SECTION_ROWS = freezeSectionRows({
  "RP20.P05.M02": P05_FIXTURE_TAIL_ROWS,
});

export const DATA_ROOM_VDR_CORE_CP625_MICRO_TITLES = Object.freeze({
  "RP20.P05.M02": "Type And Shape Definition",
});

export const DATA_ROOM_VDR_CORE_CP625_DELIVERABLE_COUNTS = Object.freeze({
  security_audit: 2,
  implementation: 3,
  fixture: 1,
  test: 3,
  hermes_evidence: 1,
});

export const DATA_ROOM_VDR_CORE_CP626_SECTION_ROWS = freezeSectionRows({
  "RP20.P05.M03": P05_FIXTURE_FOUNDATION_ROWS,
});

export const DATA_ROOM_VDR_CORE_CP626_MICRO_TITLES = Object.freeze({
  "RP20.P05.M03": "Primary Implementation Slice",
});

export const DATA_ROOM_VDR_CORE_CP626_DELIVERABLE_COUNTS = Object.freeze({
  fixture: 6,
  claude_review: 1,
  implementation: 3,
});

export const DATA_ROOM_VDR_CORE_CP627_SECTION_ROWS = freezeSectionRows({
  "RP20.P05.M03": P05_FIXTURE_TAIL_ROWS,
});

export const DATA_ROOM_VDR_CORE_CP627_MICRO_TITLES = Object.freeze({
  "RP20.P05.M03": "Primary Implementation Slice",
});

export const DATA_ROOM_VDR_CORE_CP627_DELIVERABLE_COUNTS = Object.freeze({
  security_audit: 2,
  implementation: 3,
  fixture: 1,
  test: 3,
  hermes_evidence: 1,
});

export const DATA_ROOM_VDR_CORE_CP628_SECTION_ROWS = freezeSectionRows({
  "RP20.P05.M03": P05_STABLE_REPLAY_ROWS,
  "RP20.P05.M04": P05_FIXTURE_EXTENDED_ROWS,
  "RP20.P05.M05": P05_FIXTURE_PERMISSION_HEAD_ROWS,
});

export const DATA_ROOM_VDR_CORE_CP628_MICRO_TITLES = Object.freeze({
  "RP20.P05.M03": "Primary Implementation Slice",
  "RP20.P05.M04": "Secondary Workflow Slice",
  "RP20.P05.M05": "Permission And Audit Binding",
});

export const DATA_ROOM_VDR_CORE_CP628_DELIVERABLE_COUNTS = Object.freeze({
  implementation: 14,
  fixture: 14,
  security_audit: 4,
  test: 5,
  claude_review: 2,
  hermes_evidence: 1,
});

export const DATA_ROOM_VDR_CORE_CP629_SECTION_ROWS = freezeSectionRows({
  "RP20.P05.M05": P05_PERMISSION_AUDIT_TAIL_ROWS,
  "RP20.P05.M06": P05_SYNTHETIC_FIXTURE_HEAD_ROWS,
});

export const DATA_ROOM_VDR_CORE_CP629_MICRO_TITLES = Object.freeze({
  "RP20.P05.M05": "Permission And Audit Binding",
  "RP20.P05.M06": "Synthetic Fixture Set",
});

export const DATA_ROOM_VDR_CORE_CP629_DELIVERABLE_COUNTS = Object.freeze({
  hermes_evidence: 1,
  test: 1,
  implementation: 4,
  fixture: 4,
});

export const DATA_ROOM_VDR_CORE_CP630_SECTION_ROWS = freezeSectionRows({
  "RP20.P05.M06": P05_SYNTHETIC_FIXTURE_REMAINDER_ROWS,
  "RP20.P05.M07": P05_FIXTURE_EXTENDED_ROWS,
  "RP20.P05.M08": P05_FIXTURE_EXTENDED_ROWS,
  "RP20.P05.M09": P05_FIXTURE_NO_STABLE_ROWS,
  "RP20.P05.M10": P05_FIXTURE_FOUNDATION_ROWS,
  "RP20.P06.M00": P06_PERMISSION_AUDIT_ROWS,
  "RP20.P06.M01": P06_PERMISSION_AUDIT_ROWS,
  "RP20.P06.M02": P06_PERMISSION_AUDIT_HEAD_ROWS,
});

export const DATA_ROOM_VDR_CORE_CP630_MICRO_TITLES = Object.freeze({
  "RP20.P05.M06": "Synthetic Fixture Set",
  "RP20.P05.M07": "Test And Golden Case Set",
  "RP20.P05.M08": "Hermes Evidence Packet",
  "RP20.P05.M09": "Claude Review Packet",
  "RP20.P05.M10": "Closeout And Next Handoff",
  "RP20.P06.M00": "Scope Inventory",
  "RP20.P06.M01": "Contract Draft",
  "RP20.P06.M02": "Type And Shape Definition",
});

export const DATA_ROOM_VDR_CORE_CP630_DELIVERABLE_COUNTS = Object.freeze({
  claude_review: 8,
  fixture: 30,
  hermes_evidence: 4,
  implementation: 57,
  security_audit: 23,
  test: 16,
  ui: 12,
});

export const DATA_ROOM_VDR_CORE_CP631_SECTION_ROWS = freezeSectionRows({
  "RP20.P06.M02": P06_PERMISSION_AUDIT_TEST_TAIL_ROWS,
  "RP20.P06.M03": P06_PERMISSION_AUDIT_EXTENDED_ROWS,
  "RP20.P06.M04": P06_PERMISSION_AUDIT_HEAD_14_ROWS,
});

export const DATA_ROOM_VDR_CORE_CP631_MICRO_TITLES = Object.freeze({
  "RP20.P06.M02": "Type And Shape Definition",
  "RP20.P06.M03": "Primary Implementation Slice",
  "RP20.P06.M04": "Secondary Workflow Slice",
});

export const DATA_ROOM_VDR_CORE_CP631_DELIVERABLE_COUNTS = Object.freeze({
  claude_review: 2,
  implementation: 16,
  security_audit: 7,
  test: 8,
  ui: 7,
});

export const DATA_ROOM_VDR_CORE_CP632_SECTION_ROWS = freezeSectionRows({
  "RP20.P06.M04": P06_PERMISSION_AUDIT_SECONDARY_TAIL_ROWS,
  "RP20.P06.M05": P06_PERMISSION_AUDIT_BINDING_HEAD_ROWS,
});

export const DATA_ROOM_VDR_CORE_CP632_MICRO_TITLES = Object.freeze({
  "RP20.P06.M04": "Secondary Workflow Slice",
  "RP20.P06.M05": "Permission And Audit Binding",
});

export const DATA_ROOM_VDR_CORE_CP632_DELIVERABLE_COUNTS = Object.freeze({
  implementation: 1,
  security_audit: 4,
  test: 4,
  ui: 1,
});

export const DATA_ROOM_VDR_CORE_CP633_SECTION_ROWS = freezeSectionRows({
  "RP20.P06.M05": P06_PERMISSION_AUDIT_BINDING_MIDDLE_ROWS,
});

export const DATA_ROOM_VDR_CORE_CP633_MICRO_TITLES = Object.freeze({
  "RP20.P06.M05": "Permission And Audit Binding",
});

export const DATA_ROOM_VDR_CORE_CP633_DELIVERABLE_COUNTS = Object.freeze({
  implementation: 7,
  security_audit: 1,
  ui: 2,
});

export const DATA_ROOM_VDR_CORE_CP634_SECTION_ROWS = freezeSectionRows({
  "RP20.P06.M05": P06_PERMISSION_AUDIT_BINDING_TAIL_ROWS,
});

export const DATA_ROOM_VDR_CORE_CP634_MICRO_TITLES = Object.freeze({
  "RP20.P06.M05": "Permission And Audit Binding",
});

export const DATA_ROOM_VDR_CORE_CP634_DELIVERABLE_COUNTS = Object.freeze({
  claude_review: 1,
  security_audit: 3,
  test: 4,
  ui: 2,
});

export const DATA_ROOM_VDR_CORE_CP635_SECTION_ROWS = freezeSectionRows({
  "RP20.P06.M06": P06_SYNTHETIC_FIXTURE_HEAD_ROWS,
});

export const DATA_ROOM_VDR_CORE_CP635_MICRO_TITLES = Object.freeze({
  "RP20.P06.M06": "Synthetic Fixture Set",
});

export const DATA_ROOM_VDR_CORE_CP635_DELIVERABLE_COUNTS = Object.freeze({
  implementation: 8,
  security_audit: 2,
});

export const DATA_ROOM_VDR_CORE_CP636_SECTION_ROWS = freezeSectionRows({
  "RP20.P06.M06": P06_SYNTHETIC_FIXTURE_TAIL_ROWS,
  "RP20.P06.M07": P06_PERMISSION_AUDIT_EXTENDED_ROWS,
  "RP20.P06.M08": P06_PERMISSION_AUDIT_EXTENDED_ROWS,
  "RP20.P06.M09": P06_PERMISSION_AUDIT_EXTENDED_ROWS,
  "RP20.P06.M10": P06_PERMISSION_AUDIT_ROWS,
  "RP20.P07.M00": P07_FAILURE_RECOVERY_ROWS,
  "RP20.P07.M01": P07_FAILURE_RECOVERY_ROWS,
  "RP20.P07.M02": P07_FAILURE_RECOVERY_HEAD_ROWS,
});

export const DATA_ROOM_VDR_CORE_CP636_MICRO_TITLES = Object.freeze({
  "RP20.P06.M06": "Synthetic Fixture Set",
  "RP20.P06.M07": "Test And Golden Case Set",
  "RP20.P06.M08": "Hermes Evidence Packet",
  "RP20.P06.M09": "Claude Review Packet",
  "RP20.P06.M10": "Closeout And Next Handoff",
  "RP20.P07.M00": "Scope Inventory",
  "RP20.P07.M01": "Contract Draft",
  "RP20.P07.M02": "Type And Shape Definition",
});

export const DATA_ROOM_VDR_CORE_CP636_DELIVERABLE_COUNTS = Object.freeze({
  claude_review: 5,
  failure_recovery: 35,
  fixture: 2,
  hermes_evidence: 4,
  implementation: 34,
  security_audit: 28,
  test: 22,
  ui: 20,
});

export const DATA_ROOM_VDR_CORE_CP637_SECTION_ROWS = freezeSectionRows({
  "RP20.P07.M02": P07_FAILURE_RECOVERY_TYPE_SHAPE_TAIL_ROWS,
  "RP20.P07.M03": P07_FAILURE_RECOVERY_EXTENDED_ROWS,
  "RP20.P07.M04": P07_FAILURE_RECOVERY_SECONDARY_HEAD_ROWS,
});

export const DATA_ROOM_VDR_CORE_CP637_MICRO_TITLES = Object.freeze({
  "RP20.P07.M02": "Type And Shape Definition",
  "RP20.P07.M03": "Primary Implementation Slice",
  "RP20.P07.M04": "Secondary Workflow Slice",
});

export const DATA_ROOM_VDR_CORE_CP637_DELIVERABLE_COUNTS = Object.freeze({
  claude_review: 2,
  failure_recovery: 20,
  fixture: 2,
  hermes_evidence: 4,
  implementation: 4,
  security_audit: 4,
  test: 4,
});

export const DATA_ROOM_VDR_CORE_CP638_SECTION_ROWS = freezeSectionRows({
  "RP20.P07.M04": P07_FAILURE_RECOVERY_SECONDARY_TAIL_ROWS,
  "RP20.P07.M05": P07_FAILURE_RECOVERY_EXTENDED_ROWS,
  "RP20.P07.M06": P07_FAILURE_RECOVERY_SYNTHETIC_FIXTURE_HEAD_ROWS,
});

export const DATA_ROOM_VDR_CORE_CP638_MICRO_TITLES = Object.freeze({
  "RP20.P07.M04": "Secondary Workflow Slice",
  "RP20.P07.M05": "Permission And Audit Binding",
  "RP20.P07.M06": "Synthetic Fixture Set",
});

export const DATA_ROOM_VDR_CORE_CP638_DELIVERABLE_COUNTS = Object.freeze({
  claude_review: 2,
  failure_recovery: 21,
  fixture: 2,
  hermes_evidence: 4,
  implementation: 4,
  security_audit: 3,
  test: 4,
});

export const DATA_ROOM_VDR_CORE_CP639_SECTION_ROWS = freezeSectionRows({
  "RP20.P07.M06": P07_FAILURE_RECOVERY_SYNTHETIC_FIXTURE_TAIL_ROWS,
  "RP20.P07.M07": P07_FAILURE_RECOVERY_EXTENDED_ROWS,
  "RP20.P07.M08": P07_FAILURE_RECOVERY_EXTENDED_ROWS,
  "RP20.P07.M09": P07_FAILURE_RECOVERY_EXTENDED_ROWS,
  "RP20.P07.M10": P07_FAILURE_RECOVERY_CLOSEOUT_ROWS,
  "RP20.P08.M00": P08_HERMES_EVIDENCE_FOUNDATION_ROWS,
  "RP20.P08.M01": P08_HERMES_EVIDENCE_ROWS,
  "RP20.P08.M02": P08_HERMES_EVIDENCE_TYPE_SHAPE_HEAD_ROWS,
});

export const DATA_ROOM_VDR_CORE_CP639_MICRO_TITLES = Object.freeze({
  "RP20.P07.M06": "Synthetic Fixture Set",
  "RP20.P07.M07": "Test And Golden Case Set",
  "RP20.P07.M08": "Hermes Evidence Packet",
  "RP20.P07.M09": "Claude Review Packet",
  "RP20.P07.M10": "Closeout And Next Handoff",
  "RP20.P08.M00": "Scope Inventory",
  "RP20.P08.M01": "Contract Draft",
  "RP20.P08.M02": "Type And Shape Definition",
});

export const DATA_ROOM_VDR_CORE_CP639_DELIVERABLE_COUNTS = Object.freeze({
  claude_review: 7,
  failure_recovery: 56,
  fixture: 5,
  hermes_evidence: 39,
  implementation: 22,
  security_audit: 10,
  test: 11,
});

export const DATA_ROOM_VDR_CORE_CP640_SECTION_ROWS = freezeSectionRows({
  "RP20.P08.M02": P08_HERMES_EVIDENCE_TYPE_SHAPE_TAIL_ROWS,
  "RP20.P08.M03": P08_HERMES_EVIDENCE_EXTENDED_ROWS,
  "RP20.P08.M04": P08_HERMES_EVIDENCE_SECONDARY_HEAD_ROWS,
});

export const DATA_ROOM_VDR_CORE_CP640_MICRO_TITLES = Object.freeze({
  "RP20.P08.M02": "Type And Shape Definition",
  "RP20.P08.M03": "Primary Implementation Slice",
  "RP20.P08.M04": "Secondary Workflow Slice",
});

export const DATA_ROOM_VDR_CORE_CP640_DELIVERABLE_COUNTS = Object.freeze({
  claude_review: 2,
  hermes_evidence: 19,
  implementation: 17,
  test: 2,
});

export const DATA_ROOM_VDR_CORE_CP641_SECTION_ROWS = freezeSectionRows({
  "RP20.P08.M04": P08_HERMES_EVIDENCE_SECONDARY_TAIL_ROWS,
  "RP20.P08.M05": P08_HERMES_EVIDENCE_EXTENDED_ROWS,
  "RP20.P08.M06": P08_HERMES_EVIDENCE_FOUNDATION_ROWS,
});

export const DATA_ROOM_VDR_CORE_CP641_MICRO_TITLES = Object.freeze({
  "RP20.P08.M04": "Secondary Workflow Slice",
  "RP20.P08.M05": "Permission And Audit Binding",
  "RP20.P08.M06": "Synthetic Fixture Set",
});

export const DATA_ROOM_VDR_CORE_CP641_DELIVERABLE_COUNTS = Object.freeze({
  claude_review: 2,
  hermes_evidence: 20,
  implementation: 16,
  test: 2,
});

export const DATA_ROOM_VDR_CORE_CP642_SECTION_ROWS = freezeSectionRows({
  "RP20.P08.M06": P08_HERMES_EVIDENCE_SYNTHETIC_FIXTURE_TAIL_ROWS,
});

export const DATA_ROOM_VDR_CORE_CP642_MICRO_TITLES = Object.freeze({
  "RP20.P08.M06": "Synthetic Fixture Set",
});

export const DATA_ROOM_VDR_CORE_CP642_DELIVERABLE_COUNTS = Object.freeze({
  hermes_evidence: 1,
  implementation: 8,
  test: 1,
});

export const DATA_ROOM_VDR_CORE_CP643_SECTION_ROWS = freezeSectionRows({
  "RP20.P08.M06": P08_HERMES_EVIDENCE_DOCUMENTATION_TAIL_ROWS,
  "RP20.P08.M07": P08_HERMES_EVIDENCE_EXTENDED_ROWS,
  "RP20.P08.M08": P08_HERMES_EVIDENCE_EXTENDED_ROWS,
  "RP20.P08.M09": P08_HERMES_EVIDENCE_ROWS,
  "RP20.P08.M10": P08_HERMES_EVIDENCE_FOUNDATION_ROWS,
  "RP20.P09.M00": P09_REVIEW_QUESTION_ROWS,
  "RP20.P09.M01": P09_REVIEW_QUESTION_ROWS,
  "RP20.P09.M02": P09_REVIEW_EXTENDED_ROWS,
  "RP20.P09.M03": P09_REVIEW_FULL_ROWS,
  "RP20.P09.M04": P09_REVIEW_SECONDARY_HEAD_ROWS,
});

export const DATA_ROOM_VDR_CORE_CP643_MICRO_TITLES = Object.freeze({
  "RP20.P08.M06": "Synthetic Fixture Set",
  "RP20.P08.M07": "Test And Golden Case Set",
  "RP20.P08.M08": "Hermes Evidence Packet",
  "RP20.P08.M09": "Claude Review Packet",
  "RP20.P08.M10": "Closeout And Next Handoff",
  "RP20.P09.M00": "Scope Inventory",
  "RP20.P09.M01": "Contract Draft",
  "RP20.P09.M02": "Type And Shape Definition",
  "RP20.P09.M03": "Primary Implementation Slice",
  "RP20.P09.M04": "Secondary Workflow Slice",
});

export const DATA_ROOM_VDR_CORE_CP643_DELIVERABLE_COUNTS = Object.freeze({
  claude_review: 16,
  hermes_evidence: 40,
  implementation: 71,
  security_audit: 10,
  test: 8,
  ui: 5,
});

export const DATA_ROOM_VDR_CORE_CP644_SECTION_ROWS = freezeSectionRows({
  "RP20.P09.M04": P09_REVIEW_SECONDARY_TAIL_ROWS,
  "RP20.P09.M05": P09_REVIEW_FULL_ROWS,
  "RP20.P09.M06": P09_REVIEW_EXTENDED_ROWS,
  "RP20.P09.M07": P09_REVIEW_FULL_ROWS,
  "RP20.P09.M08": P09_REVIEW_EXTENDED_ROWS,
  "RP20.P09.M09": P09_REVIEW_EXTENDED_ROWS,
  "RP20.P09.M10": P09_REVIEW_QUESTION_ROWS,
});

export const DATA_ROOM_VDR_CORE_CP644_MICRO_TITLES = Object.freeze({
  "RP20.P09.M04": "Secondary Workflow Slice",
  "RP20.P09.M05": "Permission And Audit Binding",
  "RP20.P09.M06": "Synthetic Fixture Set",
  "RP20.P09.M07": "Test And Golden Case Set",
  "RP20.P09.M08": "Hermes Evidence Packet",
  "RP20.P09.M09": "Claude Review Packet",
  "RP20.P09.M10": "Closeout And Next Handoff",
});

export const DATA_ROOM_VDR_CORE_CP644_DELIVERABLE_COUNTS = Object.freeze({
  claude_review: 18,
  hermes_evidence: 2,
  implementation: 78,
  security_audit: 12,
  test: 6,
  ui: 6,
});

export const DATA_ROOM_VDR_CORE_CP610_NO_WRITE_ATTESTATION = Object.freeze({
  pack_id: DATA_ROOM_VDR_CORE_CP610_PACK_BINDING.pack_id,
  descriptor_only: true,
  data_room_runtime_opened: false,
  vdr_runtime_opened: false,
  secure_link_runtime_opened: false,
  rfi_runtime_opened: false,
  cp_runtime_opened: false,
  closing_binder_runtime_opened: false,
  access_analytics_runtime_opened: false,
  writes_product_state: false,
  writes_audit_event: false,
  creates_database_rows: false,
  updates_database_rows: false,
  reads_object_storage: false,
  writes_object_storage: false,
  emits_hermes_runtime_receipt: false,
  uses_real_deal_data: false,
  synthetic_only: true,
});

export const DATA_ROOM_VDR_CORE_CP611_NO_WRITE_ATTESTATION = Object.freeze({
  ...DATA_ROOM_VDR_CORE_CP610_NO_WRITE_ATTESTATION,
  pack_id: DATA_ROOM_VDR_CORE_CP611_PACK_BINDING.pack_id,
  model_runtime_opened: false,
  validation_runtime_opened: false,
  fixture_runtime_opened: false,
  test_runtime_opened: false,
});

export const DATA_ROOM_VDR_CORE_CP612_NO_WRITE_ATTESTATION = Object.freeze({
  ...DATA_ROOM_VDR_CORE_CP611_NO_WRITE_ATTESTATION,
  pack_id: DATA_ROOM_VDR_CORE_CP612_PACK_BINDING.pack_id,
  permission_audit_runtime_opened: false,
  synthetic_fixture_runtime_opened: false,
});

export const DATA_ROOM_VDR_CORE_CP613_NO_WRITE_ATTESTATION = Object.freeze({
  ...DATA_ROOM_VDR_CORE_CP612_NO_WRITE_ATTESTATION,
  pack_id: DATA_ROOM_VDR_CORE_CP613_PACK_BINDING.pack_id,
  service_runtime_opened: false,
  service_entrypoint_runtime_opened: false,
  request_normalization_runtime_opened: false,
  permission_precheck_runtime_opened: false,
  audit_hint_runtime_opened: false,
  idempotency_runtime_opened: false,
  lock_runtime_opened: false,
  persistence_runtime_opened: false,
  failure_recovery_runtime_opened: false,
  integration_smoke_runtime_opened: false,
});

export const DATA_ROOM_VDR_CORE_CP614_NO_WRITE_ATTESTATION = Object.freeze({
  ...DATA_ROOM_VDR_CORE_CP613_NO_WRITE_ATTESTATION,
  pack_id: DATA_ROOM_VDR_CORE_CP614_PACK_BINDING.pack_id,
  primary_implementation_runtime_opened: false,
  secondary_workflow_runtime_opened: false,
});

export const DATA_ROOM_VDR_CORE_CP615_NO_WRITE_ATTESTATION = Object.freeze({
  ...DATA_ROOM_VDR_CORE_CP614_NO_WRITE_ATTESTATION,
  pack_id: DATA_ROOM_VDR_CORE_CP615_PACK_BINDING.pack_id,
  permission_audit_binding_runtime_opened: false,
  fixture_head_runtime_opened: false,
});

export const DATA_ROOM_VDR_CORE_CP616_NO_WRITE_ATTESTATION = Object.freeze({
  ...DATA_ROOM_VDR_CORE_CP615_NO_WRITE_ATTESTATION,
  pack_id: DATA_ROOM_VDR_CORE_CP616_PACK_BINDING.pack_id,
  fixture_tail_runtime_opened: false,
  test_golden_case_runtime_opened: false,
});

export const DATA_ROOM_VDR_CORE_CP617_NO_WRITE_ATTESTATION = Object.freeze({
  ...DATA_ROOM_VDR_CORE_CP616_NO_WRITE_ATTESTATION,
  pack_id: DATA_ROOM_VDR_CORE_CP617_PACK_BINDING.pack_id,
  test_golden_case_core_runtime_opened: false,
});

export const DATA_ROOM_VDR_CORE_CP618_NO_WRITE_ATTESTATION = Object.freeze({
  ...DATA_ROOM_VDR_CORE_CP617_NO_WRITE_ATTESTATION,
  pack_id: DATA_ROOM_VDR_CORE_CP618_PACK_BINDING.pack_id,
  test_golden_case_tail_runtime_opened: false,
  hermes_evidence_packet_runtime_opened: false,
  claude_review_packet_runtime_opened: false,
});

export const DATA_ROOM_VDR_CORE_CP619_NO_WRITE_ATTESTATION = Object.freeze({
  ...DATA_ROOM_VDR_CORE_CP618_NO_WRITE_ATTESTATION,
  pack_id: DATA_ROOM_VDR_CORE_CP619_PACK_BINDING.pack_id,
  closeout_handoff_runtime_opened: false,
  api_interface_runtime_opened: false,
  room_setup_api_runtime_opened: false,
  request_contract_runtime_opened: false,
  response_contract_runtime_opened: false,
  serialization_runtime_opened: false,
  synthetic_fixture_runtime_opened: false,
});

export const DATA_ROOM_VDR_CORE_CP620_NO_WRITE_ATTESTATION = Object.freeze({
  ...DATA_ROOM_VDR_CORE_CP619_NO_WRITE_ATTESTATION,
  pack_id: DATA_ROOM_VDR_CORE_CP620_PACK_BINDING.pack_id,
  ui_surface_runtime_opened: false,
  ui_data_dependency_runtime_opened: false,
  ui_interaction_runtime_opened: false,
  responsive_layout_runtime_opened: false,
  keyboard_focus_runtime_opened: false,
  ui_synthetic_fixture_runtime_opened: false,
  build_smoke_runtime_opened: false,
  hermes_ui_runtime_evidence_opened: false,
});

export const DATA_ROOM_VDR_CORE_CP621_NO_WRITE_ATTESTATION = Object.freeze({
  ...DATA_ROOM_VDR_CORE_CP620_NO_WRITE_ATTESTATION,
  pack_id: DATA_ROOM_VDR_CORE_CP621_PACK_BINDING.pack_id,
  ui_state_snapshot_runtime_opened: false,
  unauthorized_count_query_runtime_opened: false,
  p05_fixture_foundation_runtime_opened: false,
  golden_case_runtime_opened: false,
  cross_tenant_fixture_runtime_opened: false,
});

export const DATA_ROOM_VDR_CORE_CP622_NO_WRITE_ATTESTATION = Object.freeze({
  ...DATA_ROOM_VDR_CORE_CP621_NO_WRITE_ATTESTATION,
  pack_id: DATA_ROOM_VDR_CORE_CP622_PACK_BINDING.pack_id,
  p05_fixture_contract_draft_runtime_opened: false,
  fixture_manifest_runtime_opened: false,
});

export const DATA_ROOM_VDR_CORE_CP623_NO_WRITE_ATTESTATION = Object.freeze({
  ...DATA_ROOM_VDR_CORE_CP622_NO_WRITE_ATTESTATION,
  pack_id: DATA_ROOM_VDR_CORE_CP623_PACK_BINDING.pack_id,
  p05_fixture_contract_draft_tail_runtime_opened: false,
  ai_retrieval_runtime_opened: false,
  fixture_test_runtime_opened: false,
  hermes_fixture_runtime_evidence_opened: false,
});

export const DATA_ROOM_VDR_CORE_CP624_NO_WRITE_ATTESTATION = Object.freeze({
  ...DATA_ROOM_VDR_CORE_CP623_NO_WRITE_ATTESTATION,
  pack_id: DATA_ROOM_VDR_CORE_CP624_PACK_BINDING.pack_id,
  p05_fixture_type_shape_runtime_opened: false,
  base_fixture_shape_runtime_opened: false,
  golden_case_type_shape_runtime_opened: false,
  review_required_type_shape_runtime_opened: false,
  denied_or_cross_tenant_type_shape_runtime_opened: false,
});

export const DATA_ROOM_VDR_CORE_CP625_NO_WRITE_ATTESTATION = Object.freeze({
  ...DATA_ROOM_VDR_CORE_CP624_NO_WRITE_ATTESTATION,
  pack_id: DATA_ROOM_VDR_CORE_CP625_PACK_BINDING.pack_id,
  p05_fixture_type_shape_tail_runtime_opened: false,
  type_shape_ai_retrieval_runtime_opened: false,
  type_shape_fixture_test_runtime_opened: false,
  type_shape_hermes_fixture_runtime_evidence_opened: false,
});

export const DATA_ROOM_VDR_CORE_CP626_NO_WRITE_ATTESTATION = Object.freeze({
  ...DATA_ROOM_VDR_CORE_CP625_NO_WRITE_ATTESTATION,
  pack_id: DATA_ROOM_VDR_CORE_CP626_PACK_BINDING.pack_id,
  p05_primary_implementation_runtime_opened: false,
  primary_fixture_runtime_opened: false,
  primary_golden_case_runtime_opened: false,
  primary_review_required_runtime_opened: false,
  primary_denied_or_cross_tenant_runtime_opened: false,
});

export const DATA_ROOM_VDR_CORE_CP627_NO_WRITE_ATTESTATION = Object.freeze({
  ...DATA_ROOM_VDR_CORE_CP626_NO_WRITE_ATTESTATION,
  pack_id: DATA_ROOM_VDR_CORE_CP627_PACK_BINDING.pack_id,
  p05_primary_implementation_tail_runtime_opened: false,
  primary_ai_retrieval_runtime_opened: false,
  primary_fixture_test_runtime_opened: false,
  primary_hermes_fixture_runtime_evidence_opened: false,
});

export const DATA_ROOM_VDR_CORE_CP628_NO_WRITE_ATTESTATION = Object.freeze({
  ...DATA_ROOM_VDR_CORE_CP627_NO_WRITE_ATTESTATION,
  pack_id: DATA_ROOM_VDR_CORE_CP628_PACK_BINDING.pack_id,
  p05_primary_stable_id_runtime_opened: false,
  p05_primary_replay_runtime_opened: false,
  p05_secondary_workflow_runtime_opened: false,
  p05_permission_audit_binding_runtime_opened: false,
  secondary_fixture_runtime_opened: false,
  permission_audit_fixture_runtime_opened: false,
});

export const DATA_ROOM_VDR_CORE_CP629_NO_WRITE_ATTESTATION = Object.freeze({
  ...DATA_ROOM_VDR_CORE_CP628_NO_WRITE_ATTESTATION,
  pack_id: DATA_ROOM_VDR_CORE_CP629_PACK_BINDING.pack_id,
  p05_permission_audit_tail_runtime_opened: false,
  p05_synthetic_fixture_head_runtime_opened: false,
  synthetic_fixture_head_runtime_opened: false,
});

export const DATA_ROOM_VDR_CORE_CP630_NO_WRITE_ATTESTATION = Object.freeze({
  ...DATA_ROOM_VDR_CORE_CP629_NO_WRITE_ATTESTATION,
  pack_id: DATA_ROOM_VDR_CORE_CP630_PACK_BINDING.pack_id,
  p05_fixture_closeout_runtime_opened: false,
  p06_permission_matrix_runtime_opened: false,
  p06_decision_binding_runtime_opened: false,
  p06_security_interaction_runtime_opened: false,
  p06_permission_fixture_runtime_opened: false,
});

export const DATA_ROOM_VDR_CORE_CP631_NO_WRITE_ATTESTATION = Object.freeze({
  ...DATA_ROOM_VDR_CORE_CP630_NO_WRITE_ATTESTATION,
  pack_id: DATA_ROOM_VDR_CORE_CP631_PACK_BINDING.pack_id,
  p06_type_shape_test_tail_runtime_opened: false,
  p06_primary_implementation_runtime_opened: false,
  p06_secondary_workflow_head_runtime_opened: false,
  p06_cross_tenant_test_runtime_opened: false,
  p06_leak_prevention_test_runtime_opened: false,
});

export const DATA_ROOM_VDR_CORE_CP632_NO_WRITE_ATTESTATION = Object.freeze({
  ...DATA_ROOM_VDR_CORE_CP631_NO_WRITE_ATTESTATION,
  pack_id: DATA_ROOM_VDR_CORE_CP632_PACK_BINDING.pack_id,
  p06_secondary_workflow_tail_runtime_opened: false,
  p06_permission_audit_binding_head_runtime_opened: false,
  p06_approval_route_runtime_opened: false,
  p06_security_trimming_runtime_opened: false,
  p06_audit_event_runtime_opened: false,
});

export const DATA_ROOM_VDR_CORE_CP633_NO_WRITE_ATTESTATION = Object.freeze({
  ...DATA_ROOM_VDR_CORE_CP632_NO_WRITE_ATTESTATION,
  pack_id: DATA_ROOM_VDR_CORE_CP633_PACK_BINDING.pack_id,
  p06_permission_audit_binding_middle_runtime_opened: false,
  p06_decision_binding_middle_runtime_opened: false,
  p06_audit_hint_runtime_opened: false,
  p06_matched_rule_capture_runtime_opened: false,
  p06_deny_over_allow_runtime_opened: false,
  p06_legal_hold_interaction_runtime_opened: false,
  p06_ethical_wall_interaction_runtime_opened: false,
});

export const DATA_ROOM_VDR_CORE_CP634_NO_WRITE_ATTESTATION = Object.freeze({
  ...DATA_ROOM_VDR_CORE_CP633_NO_WRITE_ATTESTATION,
  pack_id: DATA_ROOM_VDR_CORE_CP634_PACK_BINDING.pack_id,
  p06_permission_audit_binding_tail_runtime_opened: false,
  p06_object_acl_interaction_runtime_opened: false,
  p06_review_required_route_runtime_opened: false,
  p06_approval_required_route_runtime_opened: false,
  p06_security_trimming_proof_runtime_opened: false,
  p06_audit_event_expectation_runtime_opened: false,
  p06_permission_fixture_runtime_opened: false,
  p06_permission_test_runtime_opened: false,
});

export const DATA_ROOM_VDR_CORE_CP635_NO_WRITE_ATTESTATION = Object.freeze({
  ...DATA_ROOM_VDR_CORE_CP634_NO_WRITE_ATTESTATION,
  pack_id: DATA_ROOM_VDR_CORE_CP635_PACK_BINDING.pack_id,
  p06_synthetic_fixture_head_runtime_opened: false,
  p06_synthetic_permission_matrix_runtime_opened: false,
  p06_synthetic_decision_binding_runtime_opened: false,
  p06_synthetic_audit_hint_runtime_opened: false,
  p06_synthetic_matched_rule_runtime_opened: false,
  p06_synthetic_deny_over_allow_runtime_opened: false,
});

export const DATA_ROOM_VDR_CORE_CP636_NO_WRITE_ATTESTATION = Object.freeze({
  ...DATA_ROOM_VDR_CORE_CP635_NO_WRITE_ATTESTATION,
  pack_id: DATA_ROOM_VDR_CORE_CP636_PACK_BINDING.pack_id,
  p06_synthetic_fixture_tail_runtime_opened: false,
  p06_test_golden_case_runtime_opened: false,
  p06_hermes_evidence_packet_runtime_opened: false,
  p06_claude_review_packet_runtime_opened: false,
  p06_closeout_handoff_runtime_opened: false,
  p07_failure_recovery_scope_runtime_opened: false,
  p07_failure_recovery_contract_runtime_opened: false,
  p07_failure_recovery_type_shape_runtime_opened: false,
  p07_failure_runtime_opened: false,
  p07_compensation_runtime_opened: false,
  p07_failure_test_runtime_opened: false,
});

export const DATA_ROOM_VDR_CORE_CP637_NO_WRITE_ATTESTATION = Object.freeze({
  ...DATA_ROOM_VDR_CORE_CP636_NO_WRITE_ATTESTATION,
  pack_id: DATA_ROOM_VDR_CORE_CP637_PACK_BINDING.pack_id,
  p07_failure_recovery_type_tail_runtime_opened: false,
  p07_primary_implementation_runtime_opened: false,
  p07_secondary_workflow_head_runtime_opened: false,
  p07_failure_recovery_edge_prompt_runtime_opened: false,
  p07_human_escalation_runtime_opened: false,
});

export const DATA_ROOM_VDR_CORE_CP638_NO_WRITE_ATTESTATION = Object.freeze({
  ...DATA_ROOM_VDR_CORE_CP637_NO_WRITE_ATTESTATION,
  pack_id: DATA_ROOM_VDR_CORE_CP638_PACK_BINDING.pack_id,
  p07_secondary_workflow_tail_runtime_opened: false,
  p07_permission_audit_binding_runtime_opened: false,
  p07_synthetic_fixture_head_runtime_opened: false,
});

export const DATA_ROOM_VDR_CORE_CP639_NO_WRITE_ATTESTATION = Object.freeze({
  ...DATA_ROOM_VDR_CORE_CP638_NO_WRITE_ATTESTATION,
  pack_id: DATA_ROOM_VDR_CORE_CP639_PACK_BINDING.pack_id,
  p07_synthetic_fixture_tail_runtime_opened: false,
  p07_test_golden_case_runtime_opened: false,
  p07_hermes_evidence_packet_runtime_opened: false,
  p07_claude_review_packet_runtime_opened: false,
  p07_closeout_handoff_runtime_opened: false,
  p08_hermes_evidence_scope_runtime_opened: false,
  p08_hermes_evidence_contract_runtime_opened: false,
  p08_hermes_evidence_type_shape_head_runtime_opened: false,
});

export const DATA_ROOM_VDR_CORE_CP640_NO_WRITE_ATTESTATION = Object.freeze({
  ...DATA_ROOM_VDR_CORE_CP639_NO_WRITE_ATTESTATION,
  pack_id: DATA_ROOM_VDR_CORE_CP640_PACK_BINDING.pack_id,
  p08_hermes_evidence_type_shape_tail_runtime_opened: false,
  p08_hermes_evidence_primary_implementation_runtime_opened: false,
  p08_hermes_evidence_secondary_workflow_head_runtime_opened: false,
});

export const DATA_ROOM_VDR_CORE_CP641_NO_WRITE_ATTESTATION = Object.freeze({
  ...DATA_ROOM_VDR_CORE_CP640_NO_WRITE_ATTESTATION,
  pack_id: DATA_ROOM_VDR_CORE_CP641_PACK_BINDING.pack_id,
  p08_hermes_evidence_secondary_workflow_tail_runtime_opened: false,
  p08_hermes_evidence_permission_audit_binding_runtime_opened: false,
  p08_hermes_evidence_synthetic_fixture_head_runtime_opened: false,
});

export const DATA_ROOM_VDR_CORE_CP642_NO_WRITE_ATTESTATION = Object.freeze({
  ...DATA_ROOM_VDR_CORE_CP641_NO_WRITE_ATTESTATION,
  pack_id: DATA_ROOM_VDR_CORE_CP642_PACK_BINDING.pack_id,
  p08_hermes_evidence_synthetic_fixture_tail_runtime_opened: false,
});

export const DATA_ROOM_VDR_CORE_CP643_NO_WRITE_ATTESTATION = Object.freeze({
  ...DATA_ROOM_VDR_CORE_CP642_NO_WRITE_ATTESTATION,
  pack_id: DATA_ROOM_VDR_CORE_CP643_PACK_BINDING.pack_id,
  p08_hermes_evidence_synthetic_fixture_documentation_tail_runtime_opened: false,
  p08_test_golden_case_runtime_opened: false,
  p08_hermes_evidence_packet_runtime_opened: false,
  p08_claude_review_packet_runtime_opened: false,
  p08_closeout_handoff_runtime_opened: false,
  p09_review_scope_runtime_opened: false,
  p09_review_contract_runtime_opened: false,
  p09_review_type_shape_runtime_opened: false,
  p09_review_primary_implementation_runtime_opened: false,
  p09_review_secondary_workflow_head_runtime_opened: false,
});

export const DATA_ROOM_VDR_CORE_CP644_NO_WRITE_ATTESTATION = Object.freeze({
  ...DATA_ROOM_VDR_CORE_CP643_NO_WRITE_ATTESTATION,
  pack_id: DATA_ROOM_VDR_CORE_CP644_PACK_BINDING.pack_id,
  p09_review_secondary_workflow_tail_runtime_opened: false,
  p09_review_permission_audit_binding_runtime_opened: false,
  p09_review_synthetic_fixture_runtime_opened: false,
  p09_review_test_golden_case_runtime_opened: false,
  p09_review_hermes_evidence_packet_runtime_opened: false,
  p09_review_claude_review_packet_runtime_opened: false,
  p09_review_closeout_handoff_runtime_opened: false,
});

export const DATA_ROOM_VDR_CORE_CP610_REQUIREMENTS = Object.freeze({
  pack_binding: DATA_ROOM_VDR_CORE_CP610_PACK_BINDING,
  required_section_rows: DATA_ROOM_VDR_CORE_CP610_SECTION_ROWS,
  required_section_micro_titles: DATA_ROOM_VDR_CORE_CP610_MICRO_TITLES,
  expected_section_count: 14,
  expected_unit_count: 150,
  expected_deliverable_counts: DATA_ROOM_VDR_CORE_CP610_DELIVERABLE_COUNTS,
  required_public_exports: freezeArray([
    "DATA_ROOM_VDR_CORE_PROGRAM_CONTRACT",
    "DATA_ROOM_VDR_CORE_CP610_PACK_BINDING",
    "DATA_ROOM_VDR_CORE_CP610_REQUIREMENTS",
    "createDataRoomVdrCoreCp610ScopeContractFoundationCaseSet",
    "createDataRoomVdrCoreCp610ScopeContractFoundationDescriptor",
    "validateDataRoomVdrCoreCp610Coverage",
    "validateDataRoomVdrCoreCp610ScopeContractFoundationDescriptor",
    "createDataRoomVdrCoreCp610HermesEvidencePacket",
    "createDataRoomVdrCoreCp610ClaudeReviewPacket",
    "createDataRoomVdrCoreCp610CloseoutHandoff",
  ]),
  allowed_claude_tools: freezeArray(["Read", "Grep", "Glob"]),
  required_no_leak_guards: freezeArray([
    "deny_over_allow",
    "tenant_scope_required",
    "matter_trace_required",
    "object_storage_body_excluded",
    "permission_decision_detail_excluded",
    "audit_event_body_excluded",
    "real_deal_data_excluded",
    "closing_binder_payload_excluded",
    "access_analytics_detail_excluded",
  ]),
  forbidden_review_evidence: freezeArray([
    "not_logged_in",
    "zero_byte_output",
    "malformed_json",
    "fenced_json_only",
    "tool_call_shaped_output",
    "missing_raw_output",
    "missing_source_inspection_basis",
    "claude_final_approval_claim",
    "source_mutation_claim",
    "enterprise_trust_claim",
  ]),
});

export const DATA_ROOM_VDR_CORE_CP611_REQUIREMENTS = Object.freeze({
  pack_binding: DATA_ROOM_VDR_CORE_CP611_PACK_BINDING,
  required_section_rows: DATA_ROOM_VDR_CORE_CP611_SECTION_ROWS,
  required_section_micro_titles: DATA_ROOM_VDR_CORE_CP611_MICRO_TITLES,
  expected_section_count: 3,
  expected_unit_count: 40,
  expected_deliverable_counts: DATA_ROOM_VDR_CORE_CP611_DELIVERABLE_COUNTS,
  required_public_exports: freezeArray([
    "DATA_ROOM_VDR_CORE_CP611_PACK_BINDING",
    "DATA_ROOM_VDR_CORE_CP611_REQUIREMENTS",
    "createDataRoomVdrCoreCp611P01ModelFoundationContinuationCaseSet",
    "createDataRoomVdrCoreCp611P01ModelFoundationContinuationDescriptor",
    "validateDataRoomVdrCoreCp611Coverage",
    "validateDataRoomVdrCoreCp611P01ModelFoundationContinuationDescriptor",
    "createDataRoomVdrCoreCp611HermesEvidencePacket",
    "createDataRoomVdrCoreCp611ClaudeReviewPacket",
    "createDataRoomVdrCoreCp611CloseoutHandoff",
  ]),
  allowed_claude_tools: DATA_ROOM_VDR_CORE_CP610_REQUIREMENTS.allowed_claude_tools,
  required_no_leak_guards: DATA_ROOM_VDR_CORE_CP610_REQUIREMENTS.required_no_leak_guards,
  forbidden_review_evidence: DATA_ROOM_VDR_CORE_CP610_REQUIREMENTS.forbidden_review_evidence,
});

export const DATA_ROOM_VDR_CORE_CP612_REQUIREMENTS = Object.freeze({
  pack_binding: DATA_ROOM_VDR_CORE_CP612_PACK_BINDING,
  required_section_rows: DATA_ROOM_VDR_CORE_CP612_SECTION_ROWS,
  required_section_micro_titles: DATA_ROOM_VDR_CORE_CP612_MICRO_TITLES,
  expected_section_count: 3,
  expected_unit_count: 40,
  expected_deliverable_counts: DATA_ROOM_VDR_CORE_CP612_DELIVERABLE_COUNTS,
  required_public_exports: freezeArray([
    "DATA_ROOM_VDR_CORE_CP612_PACK_BINDING",
    "DATA_ROOM_VDR_CORE_CP612_REQUIREMENTS",
    "createDataRoomVdrCoreCp612P01SecondaryWorkflowPermissionAuditCaseSet",
    "createDataRoomVdrCoreCp612P01SecondaryWorkflowPermissionAuditDescriptor",
    "validateDataRoomVdrCoreCp612Coverage",
    "validateDataRoomVdrCoreCp612P01SecondaryWorkflowPermissionAuditDescriptor",
    "createDataRoomVdrCoreCp612HermesEvidencePacket",
    "createDataRoomVdrCoreCp612ClaudeReviewPacket",
    "createDataRoomVdrCoreCp612CloseoutHandoff",
  ]),
  allowed_claude_tools: DATA_ROOM_VDR_CORE_CP610_REQUIREMENTS.allowed_claude_tools,
  required_no_leak_guards: DATA_ROOM_VDR_CORE_CP610_REQUIREMENTS.required_no_leak_guards,
  forbidden_review_evidence: DATA_ROOM_VDR_CORE_CP610_REQUIREMENTS.forbidden_review_evidence,
});

export const DATA_ROOM_VDR_CORE_CP613_REQUIREMENTS = Object.freeze({
  pack_binding: DATA_ROOM_VDR_CORE_CP613_PACK_BINDING,
  required_section_rows: DATA_ROOM_VDR_CORE_CP613_SECTION_ROWS,
  required_section_micro_titles: DATA_ROOM_VDR_CORE_CP613_MICRO_TITLES,
  expected_section_count: 8,
  expected_unit_count: 150,
  expected_deliverable_counts: DATA_ROOM_VDR_CORE_CP613_DELIVERABLE_COUNTS,
  required_public_exports: freezeArray([
    "DATA_ROOM_VDR_CORE_CP613_PACK_BINDING",
    "DATA_ROOM_VDR_CORE_CP613_REQUIREMENTS",
    "createDataRoomVdrCoreCp613P01P02ServiceFoundationBridgeCaseSet",
    "createDataRoomVdrCoreCp613P01P02ServiceFoundationBridgeDescriptor",
    "validateDataRoomVdrCoreCp613Coverage",
    "validateDataRoomVdrCoreCp613P01P02ServiceFoundationBridgeDescriptor",
    "createDataRoomVdrCoreCp613HermesEvidencePacket",
    "createDataRoomVdrCoreCp613ClaudeReviewPacket",
    "createDataRoomVdrCoreCp613CloseoutHandoff",
  ]),
  allowed_claude_tools: DATA_ROOM_VDR_CORE_CP610_REQUIREMENTS.allowed_claude_tools,
  required_no_leak_guards: DATA_ROOM_VDR_CORE_CP610_REQUIREMENTS.required_no_leak_guards,
  forbidden_review_evidence: DATA_ROOM_VDR_CORE_CP610_REQUIREMENTS.forbidden_review_evidence,
});

export const DATA_ROOM_VDR_CORE_CP614_REQUIREMENTS = Object.freeze({
  pack_binding: DATA_ROOM_VDR_CORE_CP614_PACK_BINDING,
  required_section_rows: DATA_ROOM_VDR_CORE_CP614_SECTION_ROWS,
  required_section_micro_titles: DATA_ROOM_VDR_CORE_CP614_MICRO_TITLES,
  expected_section_count: 2,
  expected_unit_count: 40,
  expected_deliverable_counts: DATA_ROOM_VDR_CORE_CP614_DELIVERABLE_COUNTS,
  required_public_exports: freezeArray([
    "DATA_ROOM_VDR_CORE_CP614_PACK_BINDING",
    "DATA_ROOM_VDR_CORE_CP614_REQUIREMENTS",
    "createDataRoomVdrCoreCp614P02PrimarySecondaryServiceCaseSet",
    "createDataRoomVdrCoreCp614P02PrimarySecondaryServiceDescriptor",
    "validateDataRoomVdrCoreCp614Coverage",
    "validateDataRoomVdrCoreCp614P02PrimarySecondaryServiceDescriptor",
    "createDataRoomVdrCoreCp614HermesEvidencePacket",
    "createDataRoomVdrCoreCp614ClaudeReviewPacket",
    "createDataRoomVdrCoreCp614CloseoutHandoff",
  ]),
  allowed_claude_tools: DATA_ROOM_VDR_CORE_CP610_REQUIREMENTS.allowed_claude_tools,
  required_no_leak_guards: DATA_ROOM_VDR_CORE_CP610_REQUIREMENTS.required_no_leak_guards,
  forbidden_review_evidence: DATA_ROOM_VDR_CORE_CP610_REQUIREMENTS.forbidden_review_evidence,
});

export const DATA_ROOM_VDR_CORE_CP615_REQUIREMENTS = Object.freeze({
  pack_binding: DATA_ROOM_VDR_CORE_CP615_PACK_BINDING,
  required_section_rows: DATA_ROOM_VDR_CORE_CP615_SECTION_ROWS,
  required_section_micro_titles: DATA_ROOM_VDR_CORE_CP615_MICRO_TITLES,
  expected_section_count: 3,
  expected_unit_count: 40,
  expected_deliverable_counts: DATA_ROOM_VDR_CORE_CP615_DELIVERABLE_COUNTS,
  required_public_exports: freezeArray([
    "DATA_ROOM_VDR_CORE_CP615_PACK_BINDING",
    "DATA_ROOM_VDR_CORE_CP615_REQUIREMENTS",
    "createDataRoomVdrCoreCp615P02PermissionAuditFixtureHeadCaseSet",
    "createDataRoomVdrCoreCp615P02PermissionAuditFixtureHeadDescriptor",
    "validateDataRoomVdrCoreCp615Coverage",
    "validateDataRoomVdrCoreCp615P02PermissionAuditFixtureHeadDescriptor",
    "createDataRoomVdrCoreCp615HermesEvidencePacket",
    "createDataRoomVdrCoreCp615ClaudeReviewPacket",
    "createDataRoomVdrCoreCp615CloseoutHandoff",
  ]),
  allowed_claude_tools: DATA_ROOM_VDR_CORE_CP610_REQUIREMENTS.allowed_claude_tools,
  required_no_leak_guards: DATA_ROOM_VDR_CORE_CP610_REQUIREMENTS.required_no_leak_guards,
  forbidden_review_evidence: DATA_ROOM_VDR_CORE_CP610_REQUIREMENTS.forbidden_review_evidence,
});

export const DATA_ROOM_VDR_CORE_CP616_REQUIREMENTS = Object.freeze({
  pack_binding: DATA_ROOM_VDR_CORE_CP616_PACK_BINDING,
  required_section_rows: DATA_ROOM_VDR_CORE_CP616_SECTION_ROWS,
  required_section_micro_titles: DATA_ROOM_VDR_CORE_CP616_MICRO_TITLES,
  expected_section_count: 2,
  expected_unit_count: 10,
  expected_deliverable_counts: DATA_ROOM_VDR_CORE_CP616_DELIVERABLE_COUNTS,
  required_public_exports: freezeArray([
    "DATA_ROOM_VDR_CORE_CP616_PACK_BINDING",
    "DATA_ROOM_VDR_CORE_CP616_REQUIREMENTS",
    "createDataRoomVdrCoreCp616P02FixtureTailTestHeadCaseSet",
    "createDataRoomVdrCoreCp616P02FixtureTailTestHeadDescriptor",
    "validateDataRoomVdrCoreCp616Coverage",
    "validateDataRoomVdrCoreCp616P02FixtureTailTestHeadDescriptor",
    "createDataRoomVdrCoreCp616HermesEvidencePacket",
    "createDataRoomVdrCoreCp616ClaudeReviewPacket",
    "createDataRoomVdrCoreCp616CloseoutHandoff",
  ]),
  allowed_claude_tools: DATA_ROOM_VDR_CORE_CP610_REQUIREMENTS.allowed_claude_tools,
  required_no_leak_guards: DATA_ROOM_VDR_CORE_CP610_REQUIREMENTS.required_no_leak_guards,
  forbidden_review_evidence: DATA_ROOM_VDR_CORE_CP610_REQUIREMENTS.forbidden_review_evidence,
});

export const DATA_ROOM_VDR_CORE_CP617_REQUIREMENTS = Object.freeze({
  pack_binding: DATA_ROOM_VDR_CORE_CP617_PACK_BINDING,
  required_section_rows: DATA_ROOM_VDR_CORE_CP617_SECTION_ROWS,
  required_section_micro_titles: DATA_ROOM_VDR_CORE_CP617_MICRO_TITLES,
  expected_section_count: 1,
  expected_unit_count: 10,
  expected_deliverable_counts: DATA_ROOM_VDR_CORE_CP617_DELIVERABLE_COUNTS,
  required_public_exports: freezeArray([
    "DATA_ROOM_VDR_CORE_CP617_PACK_BINDING",
    "DATA_ROOM_VDR_CORE_CP617_REQUIREMENTS",
    "createDataRoomVdrCoreCp617P02TestGoldenCaseCoreCaseSet",
    "createDataRoomVdrCoreCp617P02TestGoldenCaseCoreDescriptor",
    "validateDataRoomVdrCoreCp617Coverage",
    "validateDataRoomVdrCoreCp617P02TestGoldenCaseCoreDescriptor",
    "createDataRoomVdrCoreCp617HermesEvidencePacket",
    "createDataRoomVdrCoreCp617ClaudeReviewPacket",
    "createDataRoomVdrCoreCp617CloseoutHandoff",
  ]),
  allowed_claude_tools: DATA_ROOM_VDR_CORE_CP610_REQUIREMENTS.allowed_claude_tools,
  required_no_leak_guards: DATA_ROOM_VDR_CORE_CP610_REQUIREMENTS.required_no_leak_guards,
  forbidden_review_evidence: DATA_ROOM_VDR_CORE_CP610_REQUIREMENTS.forbidden_review_evidence,
});

export const DATA_ROOM_VDR_CORE_CP618_REQUIREMENTS = Object.freeze({
  pack_binding: DATA_ROOM_VDR_CORE_CP618_PACK_BINDING,
  required_section_rows: DATA_ROOM_VDR_CORE_CP618_SECTION_ROWS,
  required_section_micro_titles: DATA_ROOM_VDR_CORE_CP618_MICRO_TITLES,
  expected_section_count: 3,
  expected_unit_count: 40,
  expected_deliverable_counts: DATA_ROOM_VDR_CORE_CP618_DELIVERABLE_COUNTS,
  required_public_exports: freezeArray([
    "DATA_ROOM_VDR_CORE_CP618_PACK_BINDING",
    "DATA_ROOM_VDR_CORE_CP618_REQUIREMENTS",
    "createDataRoomVdrCoreCp618P02TestHermesClaudeBridgeCaseSet",
    "createDataRoomVdrCoreCp618P02TestHermesClaudeBridgeDescriptor",
    "validateDataRoomVdrCoreCp618Coverage",
    "validateDataRoomVdrCoreCp618P02TestHermesClaudeBridgeDescriptor",
    "createDataRoomVdrCoreCp618HermesEvidencePacket",
    "createDataRoomVdrCoreCp618ClaudeReviewPacket",
    "createDataRoomVdrCoreCp618CloseoutHandoff",
  ]),
  allowed_claude_tools: DATA_ROOM_VDR_CORE_CP610_REQUIREMENTS.allowed_claude_tools,
  required_no_leak_guards: DATA_ROOM_VDR_CORE_CP610_REQUIREMENTS.required_no_leak_guards,
  forbidden_review_evidence: DATA_ROOM_VDR_CORE_CP610_REQUIREMENTS.forbidden_review_evidence,
});

export const DATA_ROOM_VDR_CORE_CP619_REQUIREMENTS = Object.freeze({
  pack_binding: DATA_ROOM_VDR_CORE_CP619_PACK_BINDING,
  required_section_rows: DATA_ROOM_VDR_CORE_CP619_SECTION_ROWS,
  required_section_micro_titles: DATA_ROOM_VDR_CORE_CP619_MICRO_TITLES,
  expected_section_count: 9,
  expected_unit_count: 150,
  expected_deliverable_counts: DATA_ROOM_VDR_CORE_CP619_DELIVERABLE_COUNTS,
  required_public_exports: freezeArray([
    "DATA_ROOM_VDR_CORE_CP619_PACK_BINDING",
    "DATA_ROOM_VDR_CORE_CP619_REQUIREMENTS",
    "createDataRoomVdrCoreCp619P02ClaudeP03ApiInterfaceBridgeCaseSet",
    "createDataRoomVdrCoreCp619P02ClaudeP03ApiInterfaceBridgeDescriptor",
    "validateDataRoomVdrCoreCp619Coverage",
    "validateDataRoomVdrCoreCp619P02ClaudeP03ApiInterfaceBridgeDescriptor",
    "createDataRoomVdrCoreCp619HermesEvidencePacket",
    "createDataRoomVdrCoreCp619ClaudeReviewPacket",
    "createDataRoomVdrCoreCp619CloseoutHandoff",
  ]),
  allowed_claude_tools: DATA_ROOM_VDR_CORE_CP610_REQUIREMENTS.allowed_claude_tools,
  required_no_leak_guards: DATA_ROOM_VDR_CORE_CP610_REQUIREMENTS.required_no_leak_guards,
  forbidden_review_evidence: DATA_ROOM_VDR_CORE_CP610_REQUIREMENTS.forbidden_review_evidence,
});

export const DATA_ROOM_VDR_CORE_CP620_REQUIREMENTS = Object.freeze({
  pack_binding: DATA_ROOM_VDR_CORE_CP620_PACK_BINDING,
  required_section_rows: DATA_ROOM_VDR_CORE_CP620_SECTION_ROWS,
  required_section_micro_titles: DATA_ROOM_VDR_CORE_CP620_MICRO_TITLES,
  expected_section_count: 9,
  expected_unit_count: 150,
  expected_deliverable_counts: DATA_ROOM_VDR_CORE_CP620_DELIVERABLE_COUNTS,
  required_public_exports: freezeArray([
    "DATA_ROOM_VDR_CORE_CP620_PACK_BINDING",
    "DATA_ROOM_VDR_CORE_CP620_REQUIREMENTS",
    "createDataRoomVdrCoreCp620P03ApiP04UiBridgeCaseSet",
    "createDataRoomVdrCoreCp620P03ApiP04UiBridgeDescriptor",
    "validateDataRoomVdrCoreCp620Coverage",
    "validateDataRoomVdrCoreCp620P03ApiP04UiBridgeDescriptor",
    "createDataRoomVdrCoreCp620HermesEvidencePacket",
    "createDataRoomVdrCoreCp620ClaudeReviewPacket",
    "createDataRoomVdrCoreCp620CloseoutHandoff",
  ]),
  allowed_claude_tools: DATA_ROOM_VDR_CORE_CP610_REQUIREMENTS.allowed_claude_tools,
  required_no_leak_guards: DATA_ROOM_VDR_CORE_CP610_REQUIREMENTS.required_no_leak_guards,
  forbidden_review_evidence: DATA_ROOM_VDR_CORE_CP610_REQUIREMENTS.forbidden_review_evidence,
});

export const DATA_ROOM_VDR_CORE_CP621_REQUIREMENTS = Object.freeze({
  pack_binding: DATA_ROOM_VDR_CORE_CP621_PACK_BINDING,
  required_section_rows: DATA_ROOM_VDR_CORE_CP621_SECTION_ROWS,
  required_section_micro_titles: DATA_ROOM_VDR_CORE_CP621_MICRO_TITLES,
  expected_section_count: 8,
  expected_unit_count: 150,
  expected_deliverable_counts: DATA_ROOM_VDR_CORE_CP621_DELIVERABLE_COUNTS,
  required_public_exports: freezeArray([
    "DATA_ROOM_VDR_CORE_CP621_PACK_BINDING",
    "DATA_ROOM_VDR_CORE_CP621_REQUIREMENTS",
    "createDataRoomVdrCoreCp621P04UiP05FixtureBridgeCaseSet",
    "createDataRoomVdrCoreCp621P04UiP05FixtureBridgeDescriptor",
    "validateDataRoomVdrCoreCp621Coverage",
    "validateDataRoomVdrCoreCp621P04UiP05FixtureBridgeDescriptor",
    "createDataRoomVdrCoreCp621HermesEvidencePacket",
    "createDataRoomVdrCoreCp621ClaudeReviewPacket",
    "createDataRoomVdrCoreCp621CloseoutHandoff",
  ]),
  allowed_claude_tools: DATA_ROOM_VDR_CORE_CP610_REQUIREMENTS.allowed_claude_tools,
  required_no_leak_guards: DATA_ROOM_VDR_CORE_CP610_REQUIREMENTS.required_no_leak_guards,
  forbidden_review_evidence: DATA_ROOM_VDR_CORE_CP610_REQUIREMENTS.forbidden_review_evidence,
});

export const DATA_ROOM_VDR_CORE_CP622_REQUIREMENTS = Object.freeze({
  pack_binding: DATA_ROOM_VDR_CORE_CP622_PACK_BINDING,
  required_section_rows: DATA_ROOM_VDR_CORE_CP622_SECTION_ROWS,
  required_section_micro_titles: DATA_ROOM_VDR_CORE_CP622_MICRO_TITLES,
  expected_section_count: 1,
  expected_unit_count: 10,
  expected_deliverable_counts: DATA_ROOM_VDR_CORE_CP622_DELIVERABLE_COUNTS,
  required_public_exports: freezeArray([
    "DATA_ROOM_VDR_CORE_CP622_PACK_BINDING",
    "DATA_ROOM_VDR_CORE_CP622_REQUIREMENTS",
    "createDataRoomVdrCoreCp622P05FixtureContractDraftCaseSet",
    "createDataRoomVdrCoreCp622P05FixtureContractDraftDescriptor",
    "validateDataRoomVdrCoreCp622Coverage",
    "validateDataRoomVdrCoreCp622P05FixtureContractDraftDescriptor",
    "createDataRoomVdrCoreCp622HermesEvidencePacket",
    "createDataRoomVdrCoreCp622ClaudeReviewPacket",
    "createDataRoomVdrCoreCp622CloseoutHandoff",
  ]),
  allowed_claude_tools: DATA_ROOM_VDR_CORE_CP610_REQUIREMENTS.allowed_claude_tools,
  required_no_leak_guards: DATA_ROOM_VDR_CORE_CP610_REQUIREMENTS.required_no_leak_guards,
  forbidden_review_evidence: DATA_ROOM_VDR_CORE_CP610_REQUIREMENTS.forbidden_review_evidence,
});

export const DATA_ROOM_VDR_CORE_CP623_REQUIREMENTS = Object.freeze({
  pack_binding: DATA_ROOM_VDR_CORE_CP623_PACK_BINDING,
  required_section_rows: DATA_ROOM_VDR_CORE_CP623_SECTION_ROWS,
  required_section_micro_titles: DATA_ROOM_VDR_CORE_CP623_MICRO_TITLES,
  expected_section_count: 1,
  expected_unit_count: 10,
  expected_deliverable_counts: DATA_ROOM_VDR_CORE_CP623_DELIVERABLE_COUNTS,
  required_public_exports: freezeArray([
    "DATA_ROOM_VDR_CORE_CP623_PACK_BINDING",
    "DATA_ROOM_VDR_CORE_CP623_REQUIREMENTS",
    "createDataRoomVdrCoreCp623P05FixtureContractDraftTailCaseSet",
    "createDataRoomVdrCoreCp623P05FixtureContractDraftTailDescriptor",
    "validateDataRoomVdrCoreCp623Coverage",
    "validateDataRoomVdrCoreCp623P05FixtureContractDraftTailDescriptor",
    "createDataRoomVdrCoreCp623HermesEvidencePacket",
    "createDataRoomVdrCoreCp623ClaudeReviewPacket",
    "createDataRoomVdrCoreCp623CloseoutHandoff",
  ]),
  allowed_claude_tools: DATA_ROOM_VDR_CORE_CP610_REQUIREMENTS.allowed_claude_tools,
  required_no_leak_guards: DATA_ROOM_VDR_CORE_CP610_REQUIREMENTS.required_no_leak_guards,
  forbidden_review_evidence: DATA_ROOM_VDR_CORE_CP610_REQUIREMENTS.forbidden_review_evidence,
});

export const DATA_ROOM_VDR_CORE_CP624_REQUIREMENTS = Object.freeze({
  pack_binding: DATA_ROOM_VDR_CORE_CP624_PACK_BINDING,
  required_section_rows: DATA_ROOM_VDR_CORE_CP624_SECTION_ROWS,
  required_section_micro_titles: DATA_ROOM_VDR_CORE_CP624_MICRO_TITLES,
  expected_section_count: 1,
  expected_unit_count: 10,
  expected_deliverable_counts: DATA_ROOM_VDR_CORE_CP624_DELIVERABLE_COUNTS,
  required_public_exports: freezeArray([
    "DATA_ROOM_VDR_CORE_CP624_PACK_BINDING",
    "DATA_ROOM_VDR_CORE_CP624_REQUIREMENTS",
    "createDataRoomVdrCoreCp624P05FixtureTypeShapeHeadCaseSet",
    "createDataRoomVdrCoreCp624P05FixtureTypeShapeHeadDescriptor",
    "validateDataRoomVdrCoreCp624Coverage",
    "validateDataRoomVdrCoreCp624P05FixtureTypeShapeHeadDescriptor",
    "createDataRoomVdrCoreCp624HermesEvidencePacket",
    "createDataRoomVdrCoreCp624ClaudeReviewPacket",
    "createDataRoomVdrCoreCp624CloseoutHandoff",
  ]),
  allowed_claude_tools: DATA_ROOM_VDR_CORE_CP610_REQUIREMENTS.allowed_claude_tools,
  required_no_leak_guards: DATA_ROOM_VDR_CORE_CP610_REQUIREMENTS.required_no_leak_guards,
  forbidden_review_evidence: DATA_ROOM_VDR_CORE_CP610_REQUIREMENTS.forbidden_review_evidence,
});

export const DATA_ROOM_VDR_CORE_CP625_REQUIREMENTS = Object.freeze({
  pack_binding: DATA_ROOM_VDR_CORE_CP625_PACK_BINDING,
  required_section_rows: DATA_ROOM_VDR_CORE_CP625_SECTION_ROWS,
  required_section_micro_titles: DATA_ROOM_VDR_CORE_CP625_MICRO_TITLES,
  expected_section_count: 1,
  expected_unit_count: 10,
  expected_deliverable_counts: DATA_ROOM_VDR_CORE_CP625_DELIVERABLE_COUNTS,
  required_public_exports: freezeArray([
    "DATA_ROOM_VDR_CORE_CP625_PACK_BINDING",
    "DATA_ROOM_VDR_CORE_CP625_REQUIREMENTS",
    "createDataRoomVdrCoreCp625P05FixtureTypeShapeTailCaseSet",
    "createDataRoomVdrCoreCp625P05FixtureTypeShapeTailDescriptor",
    "validateDataRoomVdrCoreCp625Coverage",
    "validateDataRoomVdrCoreCp625P05FixtureTypeShapeTailDescriptor",
    "createDataRoomVdrCoreCp625HermesEvidencePacket",
    "createDataRoomVdrCoreCp625ClaudeReviewPacket",
    "createDataRoomVdrCoreCp625CloseoutHandoff",
  ]),
  allowed_claude_tools: DATA_ROOM_VDR_CORE_CP610_REQUIREMENTS.allowed_claude_tools,
  required_no_leak_guards: DATA_ROOM_VDR_CORE_CP610_REQUIREMENTS.required_no_leak_guards,
  forbidden_review_evidence: DATA_ROOM_VDR_CORE_CP610_REQUIREMENTS.forbidden_review_evidence,
});

export const DATA_ROOM_VDR_CORE_CP626_REQUIREMENTS = Object.freeze({
  pack_binding: DATA_ROOM_VDR_CORE_CP626_PACK_BINDING,
  required_section_rows: DATA_ROOM_VDR_CORE_CP626_SECTION_ROWS,
  required_section_micro_titles: DATA_ROOM_VDR_CORE_CP626_MICRO_TITLES,
  expected_section_count: 1,
  expected_unit_count: 10,
  expected_deliverable_counts: DATA_ROOM_VDR_CORE_CP626_DELIVERABLE_COUNTS,
  required_public_exports: freezeArray([
    "DATA_ROOM_VDR_CORE_CP626_PACK_BINDING",
    "DATA_ROOM_VDR_CORE_CP626_REQUIREMENTS",
    "createDataRoomVdrCoreCp626P05PrimaryImplementationHeadCaseSet",
    "createDataRoomVdrCoreCp626P05PrimaryImplementationHeadDescriptor",
    "validateDataRoomVdrCoreCp626Coverage",
    "validateDataRoomVdrCoreCp626P05PrimaryImplementationHeadDescriptor",
    "createDataRoomVdrCoreCp626HermesEvidencePacket",
    "createDataRoomVdrCoreCp626ClaudeReviewPacket",
    "createDataRoomVdrCoreCp626CloseoutHandoff",
  ]),
  allowed_claude_tools: DATA_ROOM_VDR_CORE_CP610_REQUIREMENTS.allowed_claude_tools,
  required_no_leak_guards: DATA_ROOM_VDR_CORE_CP610_REQUIREMENTS.required_no_leak_guards,
  forbidden_review_evidence: DATA_ROOM_VDR_CORE_CP610_REQUIREMENTS.forbidden_review_evidence,
});

export const DATA_ROOM_VDR_CORE_CP627_REQUIREMENTS = Object.freeze({
  pack_binding: DATA_ROOM_VDR_CORE_CP627_PACK_BINDING,
  required_section_rows: DATA_ROOM_VDR_CORE_CP627_SECTION_ROWS,
  required_section_micro_titles: DATA_ROOM_VDR_CORE_CP627_MICRO_TITLES,
  expected_section_count: 1,
  expected_unit_count: 10,
  expected_deliverable_counts: DATA_ROOM_VDR_CORE_CP627_DELIVERABLE_COUNTS,
  required_public_exports: freezeArray([
    "DATA_ROOM_VDR_CORE_CP627_PACK_BINDING",
    "DATA_ROOM_VDR_CORE_CP627_REQUIREMENTS",
    "createDataRoomVdrCoreCp627P05PrimaryImplementationTailCaseSet",
    "createDataRoomVdrCoreCp627P05PrimaryImplementationTailDescriptor",
    "validateDataRoomVdrCoreCp627Coverage",
    "validateDataRoomVdrCoreCp627P05PrimaryImplementationTailDescriptor",
    "createDataRoomVdrCoreCp627HermesEvidencePacket",
    "createDataRoomVdrCoreCp627ClaudeReviewPacket",
    "createDataRoomVdrCoreCp627CloseoutHandoff",
  ]),
  allowed_claude_tools: DATA_ROOM_VDR_CORE_CP610_REQUIREMENTS.allowed_claude_tools,
  required_no_leak_guards: DATA_ROOM_VDR_CORE_CP610_REQUIREMENTS.required_no_leak_guards,
  forbidden_review_evidence: DATA_ROOM_VDR_CORE_CP610_REQUIREMENTS.forbidden_review_evidence,
});

export const DATA_ROOM_VDR_CORE_CP628_REQUIREMENTS = Object.freeze({
  pack_binding: DATA_ROOM_VDR_CORE_CP628_PACK_BINDING,
  required_section_rows: DATA_ROOM_VDR_CORE_CP628_SECTION_ROWS,
  required_section_micro_titles: DATA_ROOM_VDR_CORE_CP628_MICRO_TITLES,
  expected_section_count: 3,
  expected_unit_count: 40,
  expected_deliverable_counts: DATA_ROOM_VDR_CORE_CP628_DELIVERABLE_COUNTS,
  required_public_exports: freezeArray([
    "DATA_ROOM_VDR_CORE_CP628_PACK_BINDING",
    "DATA_ROOM_VDR_CORE_CP628_REQUIREMENTS",
    "createDataRoomVdrCoreCp628P05SecondaryWorkflowPermissionAuditBridgeCaseSet",
    "createDataRoomVdrCoreCp628P05SecondaryWorkflowPermissionAuditBridgeDescriptor",
    "validateDataRoomVdrCoreCp628Coverage",
    "validateDataRoomVdrCoreCp628P05SecondaryWorkflowPermissionAuditBridgeDescriptor",
    "createDataRoomVdrCoreCp628HermesEvidencePacket",
    "createDataRoomVdrCoreCp628ClaudeReviewPacket",
    "createDataRoomVdrCoreCp628CloseoutHandoff",
  ]),
  allowed_claude_tools: DATA_ROOM_VDR_CORE_CP610_REQUIREMENTS.allowed_claude_tools,
  required_no_leak_guards: DATA_ROOM_VDR_CORE_CP610_REQUIREMENTS.required_no_leak_guards,
  forbidden_review_evidence: DATA_ROOM_VDR_CORE_CP610_REQUIREMENTS.forbidden_review_evidence,
});

export const DATA_ROOM_VDR_CORE_CP629_REQUIREMENTS = Object.freeze({
  pack_binding: DATA_ROOM_VDR_CORE_CP629_PACK_BINDING,
  required_section_rows: DATA_ROOM_VDR_CORE_CP629_SECTION_ROWS,
  required_section_micro_titles: DATA_ROOM_VDR_CORE_CP629_MICRO_TITLES,
  expected_section_count: 2,
  expected_unit_count: 10,
  expected_deliverable_counts: DATA_ROOM_VDR_CORE_CP629_DELIVERABLE_COUNTS,
  required_public_exports: freezeArray([
    "DATA_ROOM_VDR_CORE_CP629_PACK_BINDING",
    "DATA_ROOM_VDR_CORE_CP629_REQUIREMENTS",
    "createDataRoomVdrCoreCp629P05PermissionAuditTailSyntheticFixtureHeadCaseSet",
    "createDataRoomVdrCoreCp629P05PermissionAuditTailSyntheticFixtureHeadDescriptor",
    "validateDataRoomVdrCoreCp629Coverage",
    "validateDataRoomVdrCoreCp629P05PermissionAuditTailSyntheticFixtureHeadDescriptor",
    "createDataRoomVdrCoreCp629HermesEvidencePacket",
    "createDataRoomVdrCoreCp629ClaudeReviewPacket",
    "createDataRoomVdrCoreCp629CloseoutHandoff",
  ]),
  allowed_claude_tools: DATA_ROOM_VDR_CORE_CP610_REQUIREMENTS.allowed_claude_tools,
  required_no_leak_guards: DATA_ROOM_VDR_CORE_CP610_REQUIREMENTS.required_no_leak_guards,
  forbidden_review_evidence: DATA_ROOM_VDR_CORE_CP610_REQUIREMENTS.forbidden_review_evidence,
});

export const DATA_ROOM_VDR_CORE_CP630_REQUIREMENTS = Object.freeze({
  pack_binding: DATA_ROOM_VDR_CORE_CP630_PACK_BINDING,
  required_section_rows: DATA_ROOM_VDR_CORE_CP630_SECTION_ROWS,
  required_section_micro_titles: DATA_ROOM_VDR_CORE_CP630_MICRO_TITLES,
  expected_section_count: 8,
  expected_unit_count: 150,
  expected_deliverable_counts: DATA_ROOM_VDR_CORE_CP630_DELIVERABLE_COUNTS,
  required_public_exports: freezeArray([
    "DATA_ROOM_VDR_CORE_CP630_PACK_BINDING",
    "DATA_ROOM_VDR_CORE_CP630_REQUIREMENTS",
    "createDataRoomVdrCoreCp630P05FixtureCloseoutP06PermissionMatrixBridgeCaseSet",
    "createDataRoomVdrCoreCp630P05FixtureCloseoutP06PermissionMatrixBridgeDescriptor",
    "validateDataRoomVdrCoreCp630Coverage",
    "validateDataRoomVdrCoreCp630P05FixtureCloseoutP06PermissionMatrixBridgeDescriptor",
    "createDataRoomVdrCoreCp630HermesEvidencePacket",
    "createDataRoomVdrCoreCp630ClaudeReviewPacket",
    "createDataRoomVdrCoreCp630CloseoutHandoff",
  ]),
  allowed_claude_tools: DATA_ROOM_VDR_CORE_CP610_REQUIREMENTS.allowed_claude_tools,
  required_no_leak_guards: DATA_ROOM_VDR_CORE_CP610_REQUIREMENTS.required_no_leak_guards,
  forbidden_review_evidence: DATA_ROOM_VDR_CORE_CP610_REQUIREMENTS.forbidden_review_evidence,
});

export const DATA_ROOM_VDR_CORE_CP631_REQUIREMENTS = Object.freeze({
  pack_binding: DATA_ROOM_VDR_CORE_CP631_PACK_BINDING,
  required_section_rows: DATA_ROOM_VDR_CORE_CP631_SECTION_ROWS,
  required_section_micro_titles: DATA_ROOM_VDR_CORE_CP631_MICRO_TITLES,
  expected_section_count: 3,
  expected_unit_count: 40,
  expected_deliverable_counts: DATA_ROOM_VDR_CORE_CP631_DELIVERABLE_COUNTS,
  required_public_exports: freezeArray([
    "DATA_ROOM_VDR_CORE_CP631_PACK_BINDING",
    "DATA_ROOM_VDR_CORE_CP631_REQUIREMENTS",
    "createDataRoomVdrCoreCp631P06TypeShapeTailPrimarySecondaryBridgeCaseSet",
    "createDataRoomVdrCoreCp631P06TypeShapeTailPrimarySecondaryBridgeDescriptor",
    "validateDataRoomVdrCoreCp631Coverage",
    "validateDataRoomVdrCoreCp631P06TypeShapeTailPrimarySecondaryBridgeDescriptor",
    "createDataRoomVdrCoreCp631HermesEvidencePacket",
    "createDataRoomVdrCoreCp631ClaudeReviewPacket",
    "createDataRoomVdrCoreCp631CloseoutHandoff",
  ]),
  allowed_claude_tools: DATA_ROOM_VDR_CORE_CP610_REQUIREMENTS.allowed_claude_tools,
  required_no_leak_guards: DATA_ROOM_VDR_CORE_CP610_REQUIREMENTS.required_no_leak_guards,
  forbidden_review_evidence: DATA_ROOM_VDR_CORE_CP610_REQUIREMENTS.forbidden_review_evidence,
});

export const DATA_ROOM_VDR_CORE_CP632_REQUIREMENTS = Object.freeze({
  pack_binding: DATA_ROOM_VDR_CORE_CP632_PACK_BINDING,
  required_section_rows: DATA_ROOM_VDR_CORE_CP632_SECTION_ROWS,
  required_section_micro_titles: DATA_ROOM_VDR_CORE_CP632_MICRO_TITLES,
  expected_section_count: 2,
  expected_unit_count: 10,
  expected_deliverable_counts: DATA_ROOM_VDR_CORE_CP632_DELIVERABLE_COUNTS,
  required_public_exports: freezeArray([
    "DATA_ROOM_VDR_CORE_CP632_PACK_BINDING",
    "DATA_ROOM_VDR_CORE_CP632_REQUIREMENTS",
    "createDataRoomVdrCoreCp632P06SecondaryTailPermissionAuditBindingHeadCaseSet",
    "createDataRoomVdrCoreCp632P06SecondaryTailPermissionAuditBindingHeadDescriptor",
    "validateDataRoomVdrCoreCp632Coverage",
    "validateDataRoomVdrCoreCp632P06SecondaryTailPermissionAuditBindingHeadDescriptor",
    "createDataRoomVdrCoreCp632HermesEvidencePacket",
    "createDataRoomVdrCoreCp632ClaudeReviewPacket",
    "createDataRoomVdrCoreCp632CloseoutHandoff",
  ]),
  allowed_claude_tools: DATA_ROOM_VDR_CORE_CP610_REQUIREMENTS.allowed_claude_tools,
  required_no_leak_guards: DATA_ROOM_VDR_CORE_CP610_REQUIREMENTS.required_no_leak_guards,
  forbidden_review_evidence: DATA_ROOM_VDR_CORE_CP610_REQUIREMENTS.forbidden_review_evidence,
});

export const DATA_ROOM_VDR_CORE_CP633_REQUIREMENTS = Object.freeze({
  pack_binding: DATA_ROOM_VDR_CORE_CP633_PACK_BINDING,
  required_section_rows: DATA_ROOM_VDR_CORE_CP633_SECTION_ROWS,
  required_section_micro_titles: DATA_ROOM_VDR_CORE_CP633_MICRO_TITLES,
  expected_section_count: 1,
  expected_unit_count: 10,
  expected_deliverable_counts: DATA_ROOM_VDR_CORE_CP633_DELIVERABLE_COUNTS,
  required_public_exports: freezeArray([
    "DATA_ROOM_VDR_CORE_CP633_PACK_BINDING",
    "DATA_ROOM_VDR_CORE_CP633_REQUIREMENTS",
    "createDataRoomVdrCoreCp633P06PermissionAuditBindingMiddleCaseSet",
    "createDataRoomVdrCoreCp633P06PermissionAuditBindingMiddleDescriptor",
    "validateDataRoomVdrCoreCp633Coverage",
    "validateDataRoomVdrCoreCp633P06PermissionAuditBindingMiddleDescriptor",
    "createDataRoomVdrCoreCp633HermesEvidencePacket",
    "createDataRoomVdrCoreCp633ClaudeReviewPacket",
    "createDataRoomVdrCoreCp633CloseoutHandoff",
  ]),
  allowed_claude_tools: DATA_ROOM_VDR_CORE_CP610_REQUIREMENTS.allowed_claude_tools,
  required_no_leak_guards: DATA_ROOM_VDR_CORE_CP610_REQUIREMENTS.required_no_leak_guards,
  forbidden_review_evidence: DATA_ROOM_VDR_CORE_CP610_REQUIREMENTS.forbidden_review_evidence,
});

export const DATA_ROOM_VDR_CORE_CP634_REQUIREMENTS = Object.freeze({
  pack_binding: DATA_ROOM_VDR_CORE_CP634_PACK_BINDING,
  required_section_rows: DATA_ROOM_VDR_CORE_CP634_SECTION_ROWS,
  required_section_micro_titles: DATA_ROOM_VDR_CORE_CP634_MICRO_TITLES,
  expected_section_count: 1,
  expected_unit_count: 10,
  expected_deliverable_counts: DATA_ROOM_VDR_CORE_CP634_DELIVERABLE_COUNTS,
  required_public_exports: freezeArray([
    "DATA_ROOM_VDR_CORE_CP634_PACK_BINDING",
    "DATA_ROOM_VDR_CORE_CP634_REQUIREMENTS",
    "createDataRoomVdrCoreCp634P06PermissionAuditBindingTailCaseSet",
    "createDataRoomVdrCoreCp634P06PermissionAuditBindingTailDescriptor",
    "validateDataRoomVdrCoreCp634Coverage",
    "validateDataRoomVdrCoreCp634P06PermissionAuditBindingTailDescriptor",
    "createDataRoomVdrCoreCp634HermesEvidencePacket",
    "createDataRoomVdrCoreCp634ClaudeReviewPacket",
    "createDataRoomVdrCoreCp634CloseoutHandoff",
  ]),
  allowed_claude_tools: DATA_ROOM_VDR_CORE_CP610_REQUIREMENTS.allowed_claude_tools,
  required_no_leak_guards: DATA_ROOM_VDR_CORE_CP610_REQUIREMENTS.required_no_leak_guards,
  forbidden_review_evidence: DATA_ROOM_VDR_CORE_CP610_REQUIREMENTS.forbidden_review_evidence,
});

export const DATA_ROOM_VDR_CORE_CP635_REQUIREMENTS = Object.freeze({
  pack_binding: DATA_ROOM_VDR_CORE_CP635_PACK_BINDING,
  required_section_rows: DATA_ROOM_VDR_CORE_CP635_SECTION_ROWS,
  required_section_micro_titles: DATA_ROOM_VDR_CORE_CP635_MICRO_TITLES,
  expected_section_count: 1,
  expected_unit_count: 10,
  expected_deliverable_counts: DATA_ROOM_VDR_CORE_CP635_DELIVERABLE_COUNTS,
  required_public_exports: freezeArray([
    "DATA_ROOM_VDR_CORE_CP635_PACK_BINDING",
    "DATA_ROOM_VDR_CORE_CP635_REQUIREMENTS",
    "createDataRoomVdrCoreCp635P06SyntheticFixtureHeadCaseSet",
    "createDataRoomVdrCoreCp635P06SyntheticFixtureHeadDescriptor",
    "validateDataRoomVdrCoreCp635Coverage",
    "validateDataRoomVdrCoreCp635P06SyntheticFixtureHeadDescriptor",
    "createDataRoomVdrCoreCp635HermesEvidencePacket",
    "createDataRoomVdrCoreCp635ClaudeReviewPacket",
    "createDataRoomVdrCoreCp635CloseoutHandoff",
  ]),
  allowed_claude_tools: DATA_ROOM_VDR_CORE_CP610_REQUIREMENTS.allowed_claude_tools,
  required_no_leak_guards: DATA_ROOM_VDR_CORE_CP610_REQUIREMENTS.required_no_leak_guards,
  forbidden_review_evidence: DATA_ROOM_VDR_CORE_CP610_REQUIREMENTS.forbidden_review_evidence,
});

export const DATA_ROOM_VDR_CORE_CP636_REQUIREMENTS = Object.freeze({
  pack_binding: DATA_ROOM_VDR_CORE_CP636_PACK_BINDING,
  required_section_rows: DATA_ROOM_VDR_CORE_CP636_SECTION_ROWS,
  required_section_micro_titles: DATA_ROOM_VDR_CORE_CP636_MICRO_TITLES,
  expected_section_count: 8,
  expected_unit_count: 150,
  expected_deliverable_counts: DATA_ROOM_VDR_CORE_CP636_DELIVERABLE_COUNTS,
  required_public_exports: freezeArray([
    "DATA_ROOM_VDR_CORE_CP636_PACK_BINDING",
    "DATA_ROOM_VDR_CORE_CP636_REQUIREMENTS",
    "createDataRoomVdrCoreCp636P06P07FixtureFailureBridgeCaseSet",
    "createDataRoomVdrCoreCp636P06P07FixtureFailureBridgeDescriptor",
    "validateDataRoomVdrCoreCp636Coverage",
    "validateDataRoomVdrCoreCp636P06P07FixtureFailureBridgeDescriptor",
    "createDataRoomVdrCoreCp636HermesEvidencePacket",
    "createDataRoomVdrCoreCp636ClaudeReviewPacket",
    "createDataRoomVdrCoreCp636CloseoutHandoff",
  ]),
  allowed_claude_tools: DATA_ROOM_VDR_CORE_CP610_REQUIREMENTS.allowed_claude_tools,
  required_no_leak_guards: DATA_ROOM_VDR_CORE_CP610_REQUIREMENTS.required_no_leak_guards,
  forbidden_review_evidence: DATA_ROOM_VDR_CORE_CP610_REQUIREMENTS.forbidden_review_evidence,
});

export const DATA_ROOM_VDR_CORE_CP637_REQUIREMENTS = Object.freeze({
  pack_binding: DATA_ROOM_VDR_CORE_CP637_PACK_BINDING,
  required_section_rows: DATA_ROOM_VDR_CORE_CP637_SECTION_ROWS,
  required_section_micro_titles: DATA_ROOM_VDR_CORE_CP637_MICRO_TITLES,
  expected_section_count: 3,
  expected_unit_count: 40,
  expected_deliverable_counts: DATA_ROOM_VDR_CORE_CP637_DELIVERABLE_COUNTS,
  required_public_exports: freezeArray([
    "DATA_ROOM_VDR_CORE_CP637_PACK_BINDING",
    "DATA_ROOM_VDR_CORE_CP637_REQUIREMENTS",
    "createDataRoomVdrCoreCp637P07FailureRecoveryTypePrimarySecondaryBridgeCaseSet",
    "createDataRoomVdrCoreCp637P07FailureRecoveryTypePrimarySecondaryBridgeDescriptor",
    "validateDataRoomVdrCoreCp637Coverage",
    "validateDataRoomVdrCoreCp637P07FailureRecoveryTypePrimarySecondaryBridgeDescriptor",
    "createDataRoomVdrCoreCp637HermesEvidencePacket",
    "createDataRoomVdrCoreCp637ClaudeReviewPacket",
    "createDataRoomVdrCoreCp637CloseoutHandoff",
  ]),
  allowed_claude_tools: DATA_ROOM_VDR_CORE_CP610_REQUIREMENTS.allowed_claude_tools,
  required_no_leak_guards: DATA_ROOM_VDR_CORE_CP610_REQUIREMENTS.required_no_leak_guards,
  forbidden_review_evidence: DATA_ROOM_VDR_CORE_CP610_REQUIREMENTS.forbidden_review_evidence,
});

export const DATA_ROOM_VDR_CORE_CP638_REQUIREMENTS = Object.freeze({
  pack_binding: DATA_ROOM_VDR_CORE_CP638_PACK_BINDING,
  required_section_rows: DATA_ROOM_VDR_CORE_CP638_SECTION_ROWS,
  required_section_micro_titles: DATA_ROOM_VDR_CORE_CP638_MICRO_TITLES,
  expected_section_count: 3,
  expected_unit_count: 40,
  expected_deliverable_counts: DATA_ROOM_VDR_CORE_CP638_DELIVERABLE_COUNTS,
  required_public_exports: freezeArray([
    "DATA_ROOM_VDR_CORE_CP638_PACK_BINDING",
    "DATA_ROOM_VDR_CORE_CP638_REQUIREMENTS",
    "createDataRoomVdrCoreCp638P07SecondaryTailPermissionAuditFixtureHeadCaseSet",
    "createDataRoomVdrCoreCp638P07SecondaryTailPermissionAuditFixtureHeadDescriptor",
    "validateDataRoomVdrCoreCp638Coverage",
    "validateDataRoomVdrCoreCp638P07SecondaryTailPermissionAuditFixtureHeadDescriptor",
    "createDataRoomVdrCoreCp638HermesEvidencePacket",
    "createDataRoomVdrCoreCp638ClaudeReviewPacket",
    "createDataRoomVdrCoreCp638CloseoutHandoff",
  ]),
  allowed_claude_tools: DATA_ROOM_VDR_CORE_CP610_REQUIREMENTS.allowed_claude_tools,
  required_no_leak_guards: DATA_ROOM_VDR_CORE_CP610_REQUIREMENTS.required_no_leak_guards,
  forbidden_review_evidence: DATA_ROOM_VDR_CORE_CP610_REQUIREMENTS.forbidden_review_evidence,
});

export const DATA_ROOM_VDR_CORE_CP639_REQUIREMENTS = Object.freeze({
  pack_binding: DATA_ROOM_VDR_CORE_CP639_PACK_BINDING,
  required_section_rows: DATA_ROOM_VDR_CORE_CP639_SECTION_ROWS,
  required_section_micro_titles: DATA_ROOM_VDR_CORE_CP639_MICRO_TITLES,
  expected_section_count: 8,
  expected_unit_count: 150,
  expected_deliverable_counts: DATA_ROOM_VDR_CORE_CP639_DELIVERABLE_COUNTS,
  required_public_exports: freezeArray([
    "DATA_ROOM_VDR_CORE_CP639_PACK_BINDING",
    "DATA_ROOM_VDR_CORE_CP639_REQUIREMENTS",
    "createDataRoomVdrCoreCp639P07FixtureCloseoutP08HermesEvidenceBridgeCaseSet",
    "createDataRoomVdrCoreCp639P07FixtureCloseoutP08HermesEvidenceBridgeDescriptor",
    "validateDataRoomVdrCoreCp639Coverage",
    "validateDataRoomVdrCoreCp639P07FixtureCloseoutP08HermesEvidenceBridgeDescriptor",
    "createDataRoomVdrCoreCp639HermesEvidencePacket",
    "createDataRoomVdrCoreCp639ClaudeReviewPacket",
    "createDataRoomVdrCoreCp639CloseoutHandoff",
  ]),
  allowed_claude_tools: DATA_ROOM_VDR_CORE_CP610_REQUIREMENTS.allowed_claude_tools,
  required_no_leak_guards: DATA_ROOM_VDR_CORE_CP610_REQUIREMENTS.required_no_leak_guards,
  forbidden_review_evidence: DATA_ROOM_VDR_CORE_CP610_REQUIREMENTS.forbidden_review_evidence,
});

export const DATA_ROOM_VDR_CORE_CP640_REQUIREMENTS = Object.freeze({
  pack_binding: DATA_ROOM_VDR_CORE_CP640_PACK_BINDING,
  required_section_rows: DATA_ROOM_VDR_CORE_CP640_SECTION_ROWS,
  required_section_micro_titles: DATA_ROOM_VDR_CORE_CP640_MICRO_TITLES,
  expected_section_count: 3,
  expected_unit_count: 40,
  expected_deliverable_counts: DATA_ROOM_VDR_CORE_CP640_DELIVERABLE_COUNTS,
  required_public_exports: freezeArray([
    "DATA_ROOM_VDR_CORE_CP640_PACK_BINDING",
    "DATA_ROOM_VDR_CORE_CP640_REQUIREMENTS",
    "createDataRoomVdrCoreCp640P08HermesEvidenceTypePrimarySecondaryBridgeCaseSet",
    "createDataRoomVdrCoreCp640P08HermesEvidenceTypePrimarySecondaryBridgeDescriptor",
    "validateDataRoomVdrCoreCp640Coverage",
    "validateDataRoomVdrCoreCp640P08HermesEvidenceTypePrimarySecondaryBridgeDescriptor",
    "createDataRoomVdrCoreCp640HermesEvidencePacket",
    "createDataRoomVdrCoreCp640ClaudeReviewPacket",
    "createDataRoomVdrCoreCp640CloseoutHandoff",
  ]),
  allowed_claude_tools: DATA_ROOM_VDR_CORE_CP610_REQUIREMENTS.allowed_claude_tools,
  required_no_leak_guards: DATA_ROOM_VDR_CORE_CP610_REQUIREMENTS.required_no_leak_guards,
  forbidden_review_evidence: DATA_ROOM_VDR_CORE_CP610_REQUIREMENTS.forbidden_review_evidence,
});

export const DATA_ROOM_VDR_CORE_CP641_REQUIREMENTS = Object.freeze({
  pack_binding: DATA_ROOM_VDR_CORE_CP641_PACK_BINDING,
  required_section_rows: DATA_ROOM_VDR_CORE_CP641_SECTION_ROWS,
  required_section_micro_titles: DATA_ROOM_VDR_CORE_CP641_MICRO_TITLES,
  expected_section_count: 3,
  expected_unit_count: 40,
  expected_deliverable_counts: DATA_ROOM_VDR_CORE_CP641_DELIVERABLE_COUNTS,
  required_public_exports: freezeArray([
    "DATA_ROOM_VDR_CORE_CP641_PACK_BINDING",
    "DATA_ROOM_VDR_CORE_CP641_REQUIREMENTS",
    "createDataRoomVdrCoreCp641P08HermesEvidenceSecondaryPermissionFixtureBridgeCaseSet",
    "createDataRoomVdrCoreCp641P08HermesEvidenceSecondaryPermissionFixtureBridgeDescriptor",
    "validateDataRoomVdrCoreCp641Coverage",
    "validateDataRoomVdrCoreCp641P08HermesEvidenceSecondaryPermissionFixtureBridgeDescriptor",
    "createDataRoomVdrCoreCp641HermesEvidencePacket",
    "createDataRoomVdrCoreCp641ClaudeReviewPacket",
    "createDataRoomVdrCoreCp641CloseoutHandoff",
  ]),
  allowed_claude_tools: DATA_ROOM_VDR_CORE_CP610_REQUIREMENTS.allowed_claude_tools,
  required_no_leak_guards: DATA_ROOM_VDR_CORE_CP610_REQUIREMENTS.required_no_leak_guards,
  forbidden_review_evidence: DATA_ROOM_VDR_CORE_CP610_REQUIREMENTS.forbidden_review_evidence,
});

export const DATA_ROOM_VDR_CORE_CP642_REQUIREMENTS = Object.freeze({
  pack_binding: DATA_ROOM_VDR_CORE_CP642_PACK_BINDING,
  required_section_rows: DATA_ROOM_VDR_CORE_CP642_SECTION_ROWS,
  required_section_micro_titles: DATA_ROOM_VDR_CORE_CP642_MICRO_TITLES,
  expected_section_count: 1,
  expected_unit_count: 10,
  expected_deliverable_counts: DATA_ROOM_VDR_CORE_CP642_DELIVERABLE_COUNTS,
  required_public_exports: freezeArray([
    "DATA_ROOM_VDR_CORE_CP642_PACK_BINDING",
    "DATA_ROOM_VDR_CORE_CP642_REQUIREMENTS",
    "createDataRoomVdrCoreCp642P08HermesEvidenceSyntheticFixtureTailCaseSet",
    "createDataRoomVdrCoreCp642P08HermesEvidenceSyntheticFixtureTailDescriptor",
    "validateDataRoomVdrCoreCp642Coverage",
    "validateDataRoomVdrCoreCp642P08HermesEvidenceSyntheticFixtureTailDescriptor",
    "createDataRoomVdrCoreCp642HermesEvidencePacket",
    "createDataRoomVdrCoreCp642ClaudeReviewPacket",
    "createDataRoomVdrCoreCp642CloseoutHandoff",
  ]),
  allowed_claude_tools: DATA_ROOM_VDR_CORE_CP610_REQUIREMENTS.allowed_claude_tools,
  required_no_leak_guards: DATA_ROOM_VDR_CORE_CP610_REQUIREMENTS.required_no_leak_guards,
  forbidden_review_evidence: DATA_ROOM_VDR_CORE_CP610_REQUIREMENTS.forbidden_review_evidence,
});

export const DATA_ROOM_VDR_CORE_CP643_REQUIREMENTS = Object.freeze({
  pack_binding: DATA_ROOM_VDR_CORE_CP643_PACK_BINDING,
  required_section_rows: DATA_ROOM_VDR_CORE_CP643_SECTION_ROWS,
  required_section_micro_titles: DATA_ROOM_VDR_CORE_CP643_MICRO_TITLES,
  expected_section_count: 10,
  expected_unit_count: 150,
  expected_deliverable_counts: DATA_ROOM_VDR_CORE_CP643_DELIVERABLE_COUNTS,
  required_public_exports: freezeArray([
    "DATA_ROOM_VDR_CORE_CP643_PACK_BINDING",
    "DATA_ROOM_VDR_CORE_CP643_REQUIREMENTS",
    "createDataRoomVdrCoreCp643P08P09ReviewCloseoutBridgeCaseSet",
    "createDataRoomVdrCoreCp643P08P09ReviewCloseoutBridgeDescriptor",
    "validateDataRoomVdrCoreCp643Coverage",
    "validateDataRoomVdrCoreCp643P08P09ReviewCloseoutBridgeDescriptor",
    "createDataRoomVdrCoreCp643HermesEvidencePacket",
    "createDataRoomVdrCoreCp643ClaudeReviewPacket",
    "createDataRoomVdrCoreCp643CloseoutHandoff",
  ]),
  allowed_claude_tools: DATA_ROOM_VDR_CORE_CP610_REQUIREMENTS.allowed_claude_tools,
  required_no_leak_guards: DATA_ROOM_VDR_CORE_CP610_REQUIREMENTS.required_no_leak_guards,
  forbidden_review_evidence: DATA_ROOM_VDR_CORE_CP610_REQUIREMENTS.forbidden_review_evidence,
});

export const DATA_ROOM_VDR_CORE_CP644_REQUIREMENTS = Object.freeze({
  pack_binding: DATA_ROOM_VDR_CORE_CP644_PACK_BINDING,
  required_section_rows: DATA_ROOM_VDR_CORE_CP644_SECTION_ROWS,
  required_section_micro_titles: DATA_ROOM_VDR_CORE_CP644_MICRO_TITLES,
  expected_section_count: 7,
  expected_unit_count: 122,
  expected_deliverable_counts: DATA_ROOM_VDR_CORE_CP644_DELIVERABLE_COUNTS,
  required_public_exports: freezeArray([
    "DATA_ROOM_VDR_CORE_CP644_PACK_BINDING",
    "DATA_ROOM_VDR_CORE_CP644_REQUIREMENTS",
    "createDataRoomVdrCoreCp644P09ReviewCloseoutTailCaseSet",
    "createDataRoomVdrCoreCp644P09ReviewCloseoutTailDescriptor",
    "validateDataRoomVdrCoreCp644Coverage",
    "validateDataRoomVdrCoreCp644P09ReviewCloseoutTailDescriptor",
    "createDataRoomVdrCoreCp644HermesEvidencePacket",
    "createDataRoomVdrCoreCp644ClaudeReviewPacket",
    "createDataRoomVdrCoreCp644CloseoutHandoff",
  ]),
  allowed_claude_tools: DATA_ROOM_VDR_CORE_CP610_REQUIREMENTS.allowed_claude_tools,
  required_no_leak_guards: DATA_ROOM_VDR_CORE_CP610_REQUIREMENTS.required_no_leak_guards,
  forbidden_review_evidence: DATA_ROOM_VDR_CORE_CP610_REQUIREMENTS.forbidden_review_evidence,
});

export const DATA_ROOM_VDR_CORE_PROGRAM_CONTRACT = Object.freeze({
  schema_version: "law-firm-os.data-room-vdr-core-contract.v0.1",
  program_id: "RP20",
  program_title: "Data Room And VDR",
  program_scope: "M&A room, RFI, CP, closing binder, access analytics",
  owner: "Codex:RP20",
  hermes_gate: "H20",
  claude_gate: "C20",
  upstream_program_id: "RP19",
  upstream_pack_id: DATA_ROOM_VDR_CORE_CP610_PACK_BINDING.upstream_pack_id,
  current_pack_id: DATA_ROOM_VDR_CORE_CP644_PACK_BINDING.pack_id,
  next_pack_id: DATA_ROOM_VDR_CORE_CP644_PACK_BINDING.next_pack_id,
  first_unit_id: DATA_ROOM_VDR_CORE_CP610_PACK_BINDING.first_unit_id,
  current_range: DATA_ROOM_VDR_CORE_CP644_PACK_BINDING.range,
  contract_ref: "contracts/data-room-vdr-core-contract.json",
  package_ref: "packages/data-room",
  validator_ref: "scripts/validate-rp20-data-room-vdr-core-contract.mjs",
  runtime_opened: false,
  descriptor_only: true,
});
