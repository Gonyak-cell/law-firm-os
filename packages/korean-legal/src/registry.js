function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const item of Object.values(value)) deepFreeze(item);
  }
  return value;
}

export const KOREAN_LEGAL_CP722_PACK_BINDING = deepFreeze({
  "pack_id": "CP00-722",
  "planned_pack_id": "CP00-722",
  "risk_class": "C",
  "unit_count": 150,
  "first_unit_id": "RP24.P00.M00.S01",
  "last_unit_id": "RP24.P01.M02.S08",
  "range": "RP24.P00.M00.S01-RP24.P01.M02.S08",
  "plan_ref": "docs/closeout-pack-plan/closeout-pack-plan.json",
  "upstream_pack_id": "CP00-721",
  "next_pack_id": "CP00-723",
  "next_subphase_id": "RP24.P01.M02.S09",
  "production_ready_flag": "korean_legal_scope_contract_foundation_descriptor_verified",
  "hermes_gate": "H24",
  "claude_gate": "C24"
});

export const KOREAN_LEGAL_CP723_PACK_BINDING = deepFreeze({
  "pack_id": "CP00-723",
  "planned_pack_id": "CP00-723",
  "risk_class": "B",
  "unit_count": 40,
  "first_unit_id": "RP24.P01.M02.S09",
  "last_unit_id": "RP24.P01.M04.S06",
  "range": "RP24.P01.M02.S09-RP24.P01.M04.S06",
  "plan_ref": "docs/closeout-pack-plan/closeout-pack-plan.json",
  "upstream_pack_id": "CP00-722",
  "next_pack_id": "CP00-724",
  "next_subphase_id": "RP24.P01.M04.S07",
  "production_ready_flag": "korean_legal_p01_domain_model_workflow_slice_descriptor_verified",
  "hermes_gate": "H24",
  "claude_gate": "C24"
});

export const KOREAN_LEGAL_CP724_PACK_BINDING = deepFreeze({
  "pack_id": "CP00-724",
  "planned_pack_id": "CP00-724",
  "risk_class": "B",
  "unit_count": 40,
  "first_unit_id": "RP24.P01.M04.S07",
  "last_unit_id": "RP24.P01.M06.S04",
  "range": "RP24.P01.M04.S07-RP24.P01.M06.S04",
  "plan_ref": "docs/closeout-pack-plan/closeout-pack-plan.json",
  "upstream_pack_id": "CP00-723",
  "next_pack_id": "CP00-725",
  "next_subphase_id": "RP24.P01.M06.S05",
  "production_ready_flag": "korean_legal_p01_workflow_permission_fixture_bridge_descriptor_verified",
  "hermes_gate": "H24",
  "claude_gate": "C24"
});

export const KOREAN_LEGAL_CP725_PACK_BINDING = deepFreeze({
  "pack_id": "CP00-725",
  "planned_pack_id": "CP00-725",
  "risk_class": "C",
  "unit_count": 150,
  "first_unit_id": "RP24.P01.M06.S05",
  "last_unit_id": "RP24.P02.M02.S22",
  "range": "RP24.P01.M06.S05-RP24.P02.M02.S22",
  "plan_ref": "docs/closeout-pack-plan/closeout-pack-plan.json",
  "upstream_pack_id": "CP00-724",
  "next_pack_id": "CP00-726",
  "next_subphase_id": "RP24.P02.M03.S01",
  "production_ready_flag": "korean_legal_p01_fixture_evidence_review_p02_bridge_descriptor_verified",
  "hermes_gate": "H24",
  "claude_gate": "C24"
});

export const KOREAN_LEGAL_CP726_PACK_BINDING = deepFreeze({
  "pack_id": "CP00-726",
  "planned_pack_id": "CP00-726",
  "risk_class": "B",
  "unit_count": 40,
  "first_unit_id": "RP24.P02.M03.S01",
  "last_unit_id": "RP24.P02.M04.S18",
  "range": "RP24.P02.M03.S01-RP24.P02.M04.S18",
  "plan_ref": "docs/closeout-pack-plan/closeout-pack-plan.json",
  "upstream_pack_id": "CP00-725",
  "next_pack_id": "CP00-727",
  "next_subphase_id": "RP24.P02.M04.S19",
  "production_ready_flag": "korean_legal_p02_implementation_workflow_slice_descriptor_verified",
  "hermes_gate": "H24",
  "claude_gate": "C24"
});

export const KOREAN_LEGAL_CP727_PACK_BINDING = deepFreeze({
  "pack_id": "CP00-727",
  "planned_pack_id": "CP00-727",
  "risk_class": "B",
  "unit_count": 40,
  "first_unit_id": "RP24.P02.M04.S19",
  "last_unit_id": "RP24.P02.M06.S14",
  "range": "RP24.P02.M04.S19-RP24.P02.M06.S14",
  "plan_ref": "docs/closeout-pack-plan/closeout-pack-plan.json",
  "upstream_pack_id": "CP00-726",
  "next_pack_id": "CP00-728",
  "next_subphase_id": "RP24.P02.M06.S15",
  "production_ready_flag": "korean_legal_p02_permission_fixture_bridge_descriptor_verified",
  "hermes_gate": "H24",
  "claude_gate": "C24"
});

export const KOREAN_LEGAL_CP728_PACK_BINDING = deepFreeze({
  "pack_id": "CP00-728",
  "planned_pack_id": "CP00-728",
  "risk_class": "A",
  "unit_count": 10,
  "first_unit_id": "RP24.P02.M06.S15",
  "last_unit_id": "RP24.P02.M07.S02",
  "range": "RP24.P02.M06.S15-RP24.P02.M07.S02",
  "plan_ref": "docs/closeout-pack-plan/closeout-pack-plan.json",
  "upstream_pack_id": "CP00-727",
  "next_pack_id": "CP00-729",
  "next_subphase_id": "RP24.P02.M07.S03",
  "production_ready_flag": "korean_legal_p02_fixture_test_bridge_descriptor_verified",
  "hermes_gate": "H24",
  "claude_gate": "C24"
});

export const KOREAN_LEGAL_CP729_PACK_BINDING = deepFreeze({
  "pack_id": "CP00-729",
  "planned_pack_id": "CP00-729",
  "risk_class": "A",
  "unit_count": 10,
  "first_unit_id": "RP24.P02.M07.S03",
  "last_unit_id": "RP24.P02.M07.S12",
  "range": "RP24.P02.M07.S03-RP24.P02.M07.S12",
  "plan_ref": "docs/closeout-pack-plan/closeout-pack-plan.json",
  "upstream_pack_id": "CP00-728",
  "next_pack_id": "CP00-730",
  "next_subphase_id": "RP24.P02.M07.S13",
  "production_ready_flag": "korean_legal_p02_test_golden_case_set_descriptor_verified",
  "hermes_gate": "H24",
  "claude_gate": "C24"
});

export const KOREAN_LEGAL_CP730_PACK_BINDING = deepFreeze({
  "pack_id": "CP00-730",
  "planned_pack_id": "CP00-730",
  "risk_class": "B",
  "unit_count": 40,
  "first_unit_id": "RP24.P02.M07.S13",
  "last_unit_id": "RP24.P02.M09.S08",
  "range": "RP24.P02.M07.S13-RP24.P02.M09.S08",
  "plan_ref": "docs/closeout-pack-plan/closeout-pack-plan.json",
  "upstream_pack_id": "CP00-729",
  "next_pack_id": "CP00-731",
  "next_subphase_id": "RP24.P02.M09.S09",
  "production_ready_flag": "korean_legal_p02_hermes_claude_bridge_descriptor_verified",
  "hermes_gate": "H24",
  "claude_gate": "C24"
});

export const KOREAN_LEGAL_CP731_PACK_BINDING = deepFreeze({
  "pack_id": "CP00-731",
  "planned_pack_id": "CP00-731",
  "risk_class": "C",
  "unit_count": 150,
  "first_unit_id": "RP24.P02.M09.S09",
  "last_unit_id": "RP24.P03.M06.S12",
  "range": "RP24.P02.M09.S09-RP24.P03.M06.S12",
  "plan_ref": "docs/closeout-pack-plan/closeout-pack-plan.json",
  "upstream_pack_id": "CP00-730",
  "next_pack_id": "CP00-732",
  "next_subphase_id": "RP24.P03.M06.S13",
  "production_ready_flag": "korean_legal_p02_p03_interface_fixture_bridge_descriptor_verified",
  "hermes_gate": "H24",
  "claude_gate": "C24"
});

export const KOREAN_LEGAL_CP732_PACK_BINDING = deepFreeze({
  "pack_id": "CP00-732",
  "planned_pack_id": "CP00-732",
  "risk_class": "C",
  "unit_count": 150,
  "first_unit_id": "RP24.P03.M06.S13",
  "last_unit_id": "RP24.P04.M03.S20",
  "range": "RP24.P03.M06.S13-RP24.P04.M03.S20",
  "plan_ref": "docs/closeout-pack-plan/closeout-pack-plan.json",
  "upstream_pack_id": "CP00-731",
  "next_pack_id": "CP00-733",
  "next_subphase_id": "RP24.P04.M03.S21",
  "production_ready_flag": "korean_legal_p03_p04_review_ui_bridge_descriptor_verified",
  "hermes_gate": "H24",
  "claude_gate": "C24"
});

export const KOREAN_LEGAL_CP733_PACK_BINDING = deepFreeze({
  "pack_id": "CP00-733",
  "planned_pack_id": "CP00-733",
  "risk_class": "B",
  "unit_count": 40,
  "first_unit_id": "RP24.P04.M03.S21",
  "last_unit_id": "RP24.P04.M05.S16",
  "range": "RP24.P04.M03.S21-RP24.P04.M05.S16",
  "plan_ref": "docs/closeout-pack-plan/closeout-pack-plan.json",
  "upstream_pack_id": "CP00-732",
  "next_pack_id": "CP00-734",
  "next_subphase_id": "RP24.P04.M05.S17",
  "production_ready_flag": "korean_legal_p04_workflow_permission_slice_descriptor_verified",
  "hermes_gate": "H24",
  "claude_gate": "C24"
});

export const KOREAN_LEGAL_CP734_PACK_BINDING = deepFreeze({
  "pack_id": "CP00-734",
  "planned_pack_id": "CP00-734",
  "risk_class": "A",
  "unit_count": 10,
  "first_unit_id": "RP24.P04.M05.S17",
  "last_unit_id": "RP24.P04.M06.S04",
  "range": "RP24.P04.M05.S17-RP24.P04.M06.S04",
  "plan_ref": "docs/closeout-pack-plan/closeout-pack-plan.json",
  "upstream_pack_id": "CP00-733",
  "next_pack_id": "CP00-735",
  "next_subphase_id": "RP24.P04.M06.S05",
  "production_ready_flag": "korean_legal_p04_permission_fixture_bridge_descriptor_verified",
  "hermes_gate": "H24",
  "claude_gate": "C24"
});

export const KOREAN_LEGAL_CP735_PACK_BINDING = deepFreeze({
  "pack_id": "CP00-735",
  "planned_pack_id": "CP00-735",
  "risk_class": "C",
  "unit_count": 150,
  "first_unit_id": "RP24.P04.M06.S05",
  "last_unit_id": "RP24.P05.M03.S06",
  "range": "RP24.P04.M06.S05-RP24.P05.M03.S06",
  "plan_ref": "docs/closeout-pack-plan/closeout-pack-plan.json",
  "upstream_pack_id": "CP00-734",
  "next_pack_id": "CP00-736",
  "next_subphase_id": "RP24.P05.M03.S07",
  "production_ready_flag": "korean_legal_p04_p05_fixture_contract_bridge_descriptor_verified",
  "hermes_gate": "H24",
  "claude_gate": "C24"
});

export const KOREAN_LEGAL_CP736_PACK_BINDING = deepFreeze({
  "pack_id": "CP00-736",
  "planned_pack_id": "CP00-736",
  "risk_class": "B",
  "unit_count": 40,
  "first_unit_id": "RP24.P05.M03.S07",
  "last_unit_id": "RP24.P05.M05.S02",
  "range": "RP24.P05.M03.S07-RP24.P05.M05.S02",
  "plan_ref": "docs/closeout-pack-plan/closeout-pack-plan.json",
  "upstream_pack_id": "CP00-735",
  "next_pack_id": "CP00-737",
  "next_subphase_id": "RP24.P05.M05.S03",
  "production_ready_flag": "korean_legal_p05_workflow_permission_slice_descriptor_verified",
  "hermes_gate": "H24",
  "claude_gate": "C24"
});

export const KOREAN_LEGAL_CP737_PACK_BINDING = deepFreeze({
  "pack_id": "CP00-737",
  "planned_pack_id": "CP00-737",
  "risk_class": "A",
  "unit_count": 10,
  "first_unit_id": "RP24.P05.M05.S03",
  "last_unit_id": "RP24.P05.M05.S12",
  "range": "RP24.P05.M05.S03-RP24.P05.M05.S12",
  "plan_ref": "docs/closeout-pack-plan/closeout-pack-plan.json",
  "upstream_pack_id": "CP00-736",
  "next_pack_id": "CP00-738",
  "next_subphase_id": "RP24.P05.M05.S13",
  "production_ready_flag": "korean_legal_p05_permission_audit_binding_descriptor_verified",
  "hermes_gate": "H24",
  "claude_gate": "C24"
});

export const KOREAN_LEGAL_CP738_PACK_BINDING = deepFreeze({
  "pack_id": "CP00-738",
  "planned_pack_id": "CP00-738",
  "risk_class": "A",
  "unit_count": 10,
  "first_unit_id": "RP24.P05.M05.S13",
  "last_unit_id": "RP24.P05.M05.S22",
  "range": "RP24.P05.M05.S13-RP24.P05.M05.S22",
  "plan_ref": "docs/closeout-pack-plan/closeout-pack-plan.json",
  "upstream_pack_id": "CP00-737",
  "next_pack_id": "CP00-739",
  "next_subphase_id": "RP24.P05.M06.S01",
  "production_ready_flag": "korean_legal_p05_permission_audit_evidence_bridge_descriptor_verified",
  "hermes_gate": "H24",
  "claude_gate": "C24"
});

export const KOREAN_LEGAL_CP739_PACK_BINDING = deepFreeze({
  "pack_id": "CP00-739",
  "planned_pack_id": "CP00-739",
  "risk_class": "A",
  "unit_count": 10,
  "first_unit_id": "RP24.P05.M06.S01",
  "last_unit_id": "RP24.P05.M06.S10",
  "range": "RP24.P05.M06.S01-RP24.P05.M06.S10",
  "plan_ref": "docs/closeout-pack-plan/closeout-pack-plan.json",
  "upstream_pack_id": "CP00-738",
  "next_pack_id": "CP00-740",
  "next_subphase_id": "RP24.P05.M06.S11",
  "production_ready_flag": "korean_legal_p05_synthetic_fixture_foundation_descriptor_verified",
  "hermes_gate": "H24",
  "claude_gate": "C24"
});

export const KOREAN_LEGAL_CP740_PACK_BINDING = deepFreeze({
  "pack_id": "CP00-740",
  "planned_pack_id": "CP00-740",
  "risk_class": "A",
  "unit_count": 10,
  "first_unit_id": "RP24.P05.M06.S11",
  "last_unit_id": "RP24.P05.M06.S20",
  "range": "RP24.P05.M06.S11-RP24.P05.M06.S20",
  "plan_ref": "docs/closeout-pack-plan/closeout-pack-plan.json",
  "upstream_pack_id": "CP00-739",
  "next_pack_id": "CP00-741",
  "next_subphase_id": "RP24.P05.M06.S21",
  "production_ready_flag": "korean_legal_p05_synthetic_fixture_audit_closure_descriptor_verified",
  "hermes_gate": "H24",
  "claude_gate": "C24"
});

export const KOREAN_LEGAL_CP741_PACK_BINDING = deepFreeze({
  "pack_id": "CP00-741",
  "planned_pack_id": "CP00-741",
  "risk_class": "C",
  "unit_count": 150,
  "first_unit_id": "RP24.P05.M06.S21",
  "last_unit_id": "RP24.P06.M03.S10",
  "range": "RP24.P05.M06.S21-RP24.P06.M03.S10",
  "plan_ref": "docs/closeout-pack-plan/closeout-pack-plan.json",
  "upstream_pack_id": "CP00-740",
  "next_pack_id": "CP00-742",
  "next_subphase_id": "RP24.P06.M03.S11",
  "production_ready_flag": "korean_legal_p05_p06_fixture_permission_bridge_descriptor_verified",
  "hermes_gate": "H24",
  "claude_gate": "C24"
});

export const KOREAN_LEGAL_CP742_PACK_BINDING = deepFreeze({
  "pack_id": "CP00-742",
  "planned_pack_id": "CP00-742",
  "risk_class": "B",
  "unit_count": 40,
  "first_unit_id": "RP24.P06.M03.S11",
  "last_unit_id": "RP24.P06.M05.S06",
  "range": "RP24.P06.M03.S11-RP24.P06.M05.S06",
  "plan_ref": "docs/closeout-pack-plan/closeout-pack-plan.json",
  "upstream_pack_id": "CP00-741",
  "next_pack_id": "CP00-743",
  "next_subphase_id": "RP24.P06.M05.S07",
  "production_ready_flag": "korean_legal_p06_workflow_permission_slice_descriptor_verified",
  "hermes_gate": "H24",
  "claude_gate": "C24"
});

export const KOREAN_LEGAL_CP743_PACK_BINDING = deepFreeze({
  "pack_id": "CP00-743",
  "planned_pack_id": "CP00-743",
  "risk_class": "A",
  "unit_count": 10,
  "first_unit_id": "RP24.P06.M05.S07",
  "last_unit_id": "RP24.P06.M05.S16",
  "range": "RP24.P06.M05.S07-RP24.P06.M05.S16",
  "plan_ref": "docs/closeout-pack-plan/closeout-pack-plan.json",
  "upstream_pack_id": "CP00-742",
  "next_pack_id": "CP00-744",
  "next_subphase_id": "RP24.P06.M05.S17",
  "production_ready_flag": "korean_legal_p06_permission_audit_binding_descriptor_verified",
  "hermes_gate": "H24",
  "claude_gate": "C24"
});

export const KOREAN_LEGAL_CP744_PACK_BINDING = deepFreeze({
  "pack_id": "CP00-744",
  "planned_pack_id": "CP00-744",
  "risk_class": "A",
  "unit_count": 10,
  "first_unit_id": "RP24.P06.M05.S17",
  "last_unit_id": "RP24.P06.M06.S04",
  "range": "RP24.P06.M05.S17-RP24.P06.M06.S04",
  "plan_ref": "docs/closeout-pack-plan/closeout-pack-plan.json",
  "upstream_pack_id": "CP00-743",
  "next_pack_id": "CP00-745",
  "next_subphase_id": "RP24.P06.M06.S05",
  "production_ready_flag": "korean_legal_p06_permission_fixture_bridge_descriptor_verified",
  "hermes_gate": "H24",
  "claude_gate": "C24"
});

export const KOREAN_LEGAL_CP745_PACK_BINDING = deepFreeze({
  "pack_id": "CP00-745",
  "planned_pack_id": "CP00-745",
  "risk_class": "C",
  "unit_count": 150,
  "first_unit_id": "RP24.P06.M06.S05",
  "last_unit_id": "RP24.P07.M02.S06",
  "range": "RP24.P06.M06.S05-RP24.P07.M02.S06",
  "plan_ref": "docs/closeout-pack-plan/closeout-pack-plan.json",
  "upstream_pack_id": "CP00-744",
  "next_pack_id": "CP00-746",
  "next_subphase_id": "RP24.P07.M02.S07",
  "production_ready_flag": "korean_legal_p06_p07_fixture_failure_bridge_descriptor_verified",
  "hermes_gate": "H24",
  "claude_gate": "C24"
});

export const KOREAN_LEGAL_CP746_PACK_BINDING = deepFreeze({
  "pack_id": "CP00-746",
  "planned_pack_id": "CP00-746",
  "risk_class": "A",
  "unit_count": 10,
  "first_unit_id": "RP24.P07.M02.S07",
  "last_unit_id": "RP24.P07.M02.S16",
  "range": "RP24.P07.M02.S07-RP24.P07.M02.S16",
  "plan_ref": "docs/closeout-pack-plan/closeout-pack-plan.json",
  "upstream_pack_id": "CP00-745",
  "next_pack_id": "CP00-747",
  "next_subphase_id": "RP24.P07.M02.S17",
  "production_ready_flag": "korean_legal_p07_failure_type_slice_descriptor_verified",
  "hermes_gate": "H24",
  "claude_gate": "C24"
});

export const KOREAN_LEGAL_CP747_PACK_BINDING = deepFreeze({
  "pack_id": "CP00-747",
  "planned_pack_id": "CP00-747",
  "risk_class": "B",
  "unit_count": 40,
  "first_unit_id": "RP24.P07.M02.S17",
  "last_unit_id": "RP24.P07.M04.S12",
  "range": "RP24.P07.M02.S17-RP24.P07.M04.S12",
  "plan_ref": "docs/closeout-pack-plan/closeout-pack-plan.json",
  "upstream_pack_id": "CP00-746",
  "next_pack_id": "CP00-748",
  "next_subphase_id": "RP24.P07.M04.S13",
  "production_ready_flag": "korean_legal_p07_failure_workflow_bridge_descriptor_verified",
  "hermes_gate": "H24",
  "claude_gate": "C24"
});

export const KOREAN_LEGAL_CP748_PACK_BINDING = deepFreeze({
  "pack_id": "CP00-748",
  "planned_pack_id": "CP00-748",
  "risk_class": "B",
  "unit_count": 40,
  "first_unit_id": "RP24.P07.M04.S13",
  "last_unit_id": "RP24.P07.M06.S08",
  "range": "RP24.P07.M04.S13-RP24.P07.M06.S08",
  "plan_ref": "docs/closeout-pack-plan/closeout-pack-plan.json",
  "upstream_pack_id": "CP00-747",
  "next_pack_id": "CP00-749",
  "next_subphase_id": "RP24.P07.M06.S09",
  "production_ready_flag": "korean_legal_p07_permission_fixture_bridge_descriptor_verified",
  "hermes_gate": "H24",
  "claude_gate": "C24"
});

export const KOREAN_LEGAL_CP749_PACK_BINDING = deepFreeze({
  "pack_id": "CP00-749",
  "planned_pack_id": "CP00-749",
  "risk_class": "C",
  "unit_count": 150,
  "first_unit_id": "RP24.P07.M06.S09",
  "last_unit_id": "RP24.P08.M02.S20",
  "range": "RP24.P07.M06.S09-RP24.P08.M02.S20",
  "plan_ref": "docs/closeout-pack-plan/closeout-pack-plan.json",
  "upstream_pack_id": "CP00-748",
  "next_pack_id": "CP00-750",
  "next_subphase_id": "RP24.P08.M03.S01",
  "production_ready_flag": "korean_legal_p07_p08_fixture_scope_bridge_descriptor_verified",
  "hermes_gate": "H24",
  "claude_gate": "C24"
});

export const KOREAN_LEGAL_CP750_PACK_BINDING = deepFreeze({
  "pack_id": "CP00-750",
  "planned_pack_id": "CP00-750",
  "risk_class": "B",
  "unit_count": 40,
  "first_unit_id": "RP24.P08.M03.S01",
  "last_unit_id": "RP24.P08.M04.S18",
  "range": "RP24.P08.M03.S01-RP24.P08.M04.S18",
  "plan_ref": "docs/closeout-pack-plan/closeout-pack-plan.json",
  "upstream_pack_id": "CP00-749",
  "next_pack_id": "CP00-751",
  "next_subphase_id": "RP24.P08.M04.S19",
  "production_ready_flag": "korean_legal_p08_evidence_workflow_bridge_descriptor_verified",
  "hermes_gate": "H24",
  "claude_gate": "C24"
});

export const KOREAN_LEGAL_CP751_PACK_BINDING = deepFreeze({
  "pack_id": "CP00-751",
  "planned_pack_id": "CP00-751",
  "risk_class": "B",
  "unit_count": 40,
  "first_unit_id": "RP24.P08.M04.S19",
  "last_unit_id": "RP24.P08.M06.S14",
  "range": "RP24.P08.M04.S19-RP24.P08.M06.S14",
  "plan_ref": "docs/closeout-pack-plan/closeout-pack-plan.json",
  "upstream_pack_id": "CP00-750",
  "next_pack_id": "CP00-752",
  "next_subphase_id": "RP24.P08.M06.S15",
  "production_ready_flag": "korean_legal_p08_permission_fixture_bridge_descriptor_verified",
  "hermes_gate": "H24",
  "claude_gate": "C24"
});

export const KOREAN_LEGAL_CP752_PACK_BINDING = deepFreeze({
  "pack_id": "CP00-752",
  "planned_pack_id": "CP00-752",
  "risk_class": "C",
  "unit_count": 150,
  "first_unit_id": "RP24.P08.M06.S15",
  "last_unit_id": "RP24.P09.M04.S04",
  "range": "RP24.P08.M06.S15-RP24.P09.M04.S04",
  "plan_ref": "docs/closeout-pack-plan/closeout-pack-plan.json",
  "upstream_pack_id": "CP00-751",
  "next_pack_id": "CP00-753",
  "next_subphase_id": "RP24.P09.M04.S05",
  "production_ready_flag": "korean_legal_p08_p09_evidence_review_bridge_descriptor_verified",
  "hermes_gate": "H24",
  "claude_gate": "C24"
});

export const KOREAN_LEGAL_CP753_PACK_BINDING = deepFreeze({
  "pack_id": "CP00-753",
  "planned_pack_id": "CP00-753",
  "risk_class": "B",
  "unit_count": 40,
  "first_unit_id": "RP24.P09.M04.S05",
  "last_unit_id": "RP24.P09.M06.S02",
  "range": "RP24.P09.M04.S05-RP24.P09.M06.S02",
  "plan_ref": "docs/closeout-pack-plan/closeout-pack-plan.json",
  "upstream_pack_id": "CP00-752",
  "next_pack_id": "CP00-754",
  "next_subphase_id": "RP24.P09.M06.S03",
  "production_ready_flag": "korean_legal_p09_review_fixture_bridge_descriptor_verified",
  "hermes_gate": "H24",
  "claude_gate": "C24"
});

export const KOREAN_LEGAL_CP754_PACK_BINDING = deepFreeze({
  "pack_id": "CP00-754",
  "planned_pack_id": "CP00-754",
  "risk_class": "A",
  "unit_count": 10,
  "first_unit_id": "RP24.P09.M06.S03",
  "last_unit_id": "RP24.P09.M06.S12",
  "range": "RP24.P09.M06.S03-RP24.P09.M06.S12",
  "plan_ref": "docs/closeout-pack-plan/closeout-pack-plan.json",
  "upstream_pack_id": "CP00-753",
  "next_pack_id": "CP00-755",
  "next_subphase_id": "RP24.P09.M06.S13",
  "production_ready_flag": "korean_legal_p09_fixture_review_slice_descriptor_verified",
  "hermes_gate": "H24",
  "claude_gate": "C24"
});

export const KOREAN_LEGAL_CP755_PACK_BINDING = deepFreeze({
  "pack_id": "CP00-755",
  "planned_pack_id": "CP00-755",
  "risk_class": "C",
  "unit_count": 80,
  "first_unit_id": "RP24.P09.M06.S13",
  "last_unit_id": "RP24.P09.M10.S10",
  "range": "RP24.P09.M06.S13-RP24.P09.M10.S10",
  "plan_ref": "docs/closeout-pack-plan/closeout-pack-plan.json",
  "upstream_pack_id": "CP00-754",
  "next_pack_id": "CP00-756",
  "next_subphase_id": "RP25.P00.M00.S01",
  "production_ready_flag": "korean_legal_p09_closeout_handoff_bridge_descriptor_verified",
  "hermes_gate": "H24",
  "claude_gate": "C24"
});

export const KOREAN_LEGAL_NO_WRITE_ATTESTATION = deepFreeze({
  descriptor_only: true,
  no_real_data: true,
  synthetic_only: true,
  writes_product_state: false,
  creates_database_rows: false,
  updates_database_rows: false,
  writes_object_storage: false,
  external_runtime_called: false,
  hwpx_runtime_opened: false,
  court_filing_runtime_opened: false,
  litigation_deadline_runtime_opened: false,
  corporate_document_runtime_opened: false,
  korean_clause_final_authority_opened: false,
  permission_decision_detail_included: false,
  audit_event_body_included: false,
  hermes_runtime_receipt_emitted: false,
  claude_is_final_approval: false,
  local_validation_claims_enterprise_trust: false,
  customer_safe_errors_only: true
});

export const KOREAN_LEGAL_CP722_REQUIREMENTS = deepFreeze({
  "deliverable_counts": {
    "claude_review": 3,
    "contract": 8,
    "hermes_evidence": 7,
    "implementation": 108,
    "security_audit": 16,
    "ui": 8
  },
  "phase_counts": {
    "RP24.P00": 122,
    "RP24.P01": 28
  },
  "micro_phase_row_counts": {
    "RP24.P00.M00": 3,
    "RP24.P00.M01": 3,
    "RP24.P00.M02": 10,
    "RP24.P00.M03": 20,
    "RP24.P00.M04": 13,
    "RP24.P00.M05": 20,
    "RP24.P00.M06": 10,
    "RP24.P00.M07": 20,
    "RP24.P00.M08": 10,
    "RP24.P00.M09": 10,
    "RP24.P00.M10": 3,
    "RP24.P01.M00": 10,
    "RP24.P01.M01": 10,
    "RP24.P01.M02": 8
  },
  "micro_title_row_counts": {
    "Claude Review Packet": 10,
    "Closeout And Next Handoff": 3,
    "Contract Draft": 13,
    "Hermes Evidence Packet": 10,
    "Permission And Audit Binding": 20,
    "Primary Implementation Slice": 20,
    "Scope Inventory": 13,
    "Secondary Workflow Slice": 13,
    "Synthetic Fixture Set": 10,
    "Test And Golden Case Set": 20,
    "Type And Shape Definition": 18
  },
  "required_section_rows": {
    "RP24.P00.M00": [
      "Scope inventory",
      "Acceptance gate definition",
      "Non-goal boundary"
    ],
    "RP24.P00.M01": [
      "Scope inventory",
      "Acceptance gate definition",
      "Non-goal boundary"
    ],
    "RP24.P00.M02": [
      "Scope inventory",
      "Acceptance gate definition",
      "Non-goal boundary",
      "Target file map",
      "Contract schema outline",
      "Ownership note",
      "Matter-first trace note",
      "Permission baseline note",
      "Audit baseline note",
      "Synthetic data policy"
    ],
    "RP24.P00.M03": [
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
      "Risk register row",
      "Blocked-claim rule",
      "Hermes preflight fields",
      "Claude review prompts",
      "Human approval note",
      "Closeout handoff",
      "Dependency list",
      "Downstream RP routing",
      "Command matrix",
      "Receipt shape"
    ],
    "RP24.P00.M04": [
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
      "Risk register row",
      "Blocked-claim rule",
      "Hermes preflight fields"
    ],
    "RP24.P00.M05": [
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
      "Risk register row",
      "Blocked-claim rule",
      "Hermes preflight fields",
      "Claude review prompts",
      "Human approval note",
      "Closeout handoff",
      "Dependency list",
      "Downstream RP routing",
      "Command matrix",
      "Receipt shape"
    ],
    "RP24.P00.M06": [
      "Scope inventory",
      "Acceptance gate definition",
      "Non-goal boundary",
      "Target file map",
      "Contract schema outline",
      "Ownership note",
      "Matter-first trace note",
      "Permission baseline note",
      "Audit baseline note",
      "Synthetic data policy"
    ],
    "RP24.P00.M07": [
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
      "Risk register row",
      "Blocked-claim rule",
      "Hermes preflight fields",
      "Claude review prompts",
      "Human approval note",
      "Closeout handoff",
      "Dependency list",
      "Downstream RP routing",
      "Command matrix",
      "Receipt shape"
    ],
    "RP24.P00.M08": [
      "Scope inventory",
      "Acceptance gate definition",
      "Non-goal boundary",
      "Target file map",
      "Contract schema outline",
      "Ownership note",
      "Matter-first trace note",
      "Permission baseline note",
      "Audit baseline note",
      "Synthetic data policy"
    ],
    "RP24.P00.M09": [
      "Scope inventory",
      "Acceptance gate definition",
      "Non-goal boundary",
      "Target file map",
      "Contract schema outline",
      "Ownership note",
      "Matter-first trace note",
      "Permission baseline note",
      "Audit baseline note",
      "Synthetic data policy"
    ],
    "RP24.P00.M10": [
      "Scope inventory",
      "Acceptance gate definition",
      "Non-goal boundary"
    ],
    "RP24.P01.M00": [
      "Package directory layout",
      "Primary entity identifier",
      "Tenant scope field",
      "Matter trace reference",
      "Lifecycle status enum",
      "Ownership metadata",
      "Reference relationship map",
      "Required field registry",
      "Optional field registry",
      "State transition map"
    ],
    "RP24.P01.M01": [
      "Package directory layout",
      "Primary entity identifier",
      "Tenant scope field",
      "Matter trace reference",
      "Lifecycle status enum",
      "Ownership metadata",
      "Reference relationship map",
      "Required field registry",
      "Optional field registry",
      "State transition map"
    ],
    "RP24.P01.M02": [
      "Package directory layout",
      "Primary entity identifier",
      "Tenant scope field",
      "Matter trace reference",
      "Lifecycle status enum",
      "Ownership metadata",
      "Reference relationship map",
      "Required field registry"
    ]
  },
  "required_section_micro_titles": {
    "RP24.P00.M00": "Scope Inventory",
    "RP24.P00.M01": "Contract Draft",
    "RP24.P00.M02": "Type And Shape Definition",
    "RP24.P00.M03": "Primary Implementation Slice",
    "RP24.P00.M04": "Secondary Workflow Slice",
    "RP24.P00.M05": "Permission And Audit Binding",
    "RP24.P00.M06": "Synthetic Fixture Set",
    "RP24.P00.M07": "Test And Golden Case Set",
    "RP24.P00.M08": "Hermes Evidence Packet",
    "RP24.P00.M09": "Claude Review Packet",
    "RP24.P00.M10": "Closeout And Next Handoff",
    "RP24.P01.M00": "Scope Inventory",
    "RP24.P01.M01": "Contract Draft",
    "RP24.P01.M02": "Type And Shape Definition"
  },
  "required_no_leak_guards": [
    "descriptor_only",
    "no_real_client_or_matter_data",
    "no_external_credentials",
    "no_hwpx_runtime_parse",
    "no_court_filing_runtime",
    "no_korean_clause_final_authority",
    "no_litigation_deadline_runtime_calculation",
    "no_corporate_document_runtime_assembly",
    "no_product_state_write",
    "claude_read_only_non_final"
  ],
  "allowed_claude_tools": [
    "Read",
    "Grep",
    "Glob"
  ],
  "forbidden_review_evidence": [
    "not_logged_in",
    "malformed_json",
    "usage_limit",
    "tool_call_shaped_output",
    "zero_byte_stdout",
    "fenced_json_with_prose"
  ],
  "required_public_exports": [
    "KOREAN_LEGAL_CP722_PACK_BINDING",
    "KOREAN_LEGAL_CP722_REQUIREMENTS",
    "createKoreanLegalCp722ScopeContractFoundationCaseSet",
    "createKoreanLegalCp722ScopeContractFoundationDescriptor",
    "validateKoreanLegalCp722ScopeContractFoundationCoverage",
    "validateKoreanLegalCp722ScopeContractFoundationDescriptor"
  ]
});

export const KOREAN_LEGAL_CP723_REQUIREMENTS = deepFreeze({
  "deliverable_counts": {
    "claude_review": 2,
    "fixture": 2,
    "hermes_evidence": 2,
    "implementation": 23,
    "test": 6,
    "ui": 5
  },
  "phase_counts": {
    "RP24.P01": 40
  },
  "micro_phase_row_counts": {
    "RP24.P01.M02": 12,
    "RP24.P01.M03": 22,
    "RP24.P01.M04": 6
  },
  "micro_title_row_counts": {
    "Primary Implementation Slice": 22,
    "Secondary Workflow Slice": 6,
    "Type And Shape Definition": 12
  },
  "required_section_rows": {
    "RP24.P01.M02": [
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
      "Closeout handoff"
    ],
    "RP24.P01.M03": [
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
      "Index export check"
    ],
    "RP24.P01.M04": [
      "Package directory layout",
      "Primary entity identifier",
      "Tenant scope field",
      "Matter trace reference",
      "Lifecycle status enum",
      "Ownership metadata"
    ]
  },
  "required_section_micro_titles": {
    "RP24.P01.M02": "Type And Shape Definition",
    "RP24.P01.M03": "Primary Implementation Slice",
    "RP24.P01.M04": "Secondary Workflow Slice"
  },
  "required_no_leak_guards": [
    "descriptor_only",
    "no_real_client_or_matter_data",
    "no_external_credentials",
    "no_hwpx_runtime_parse",
    "no_court_filing_runtime",
    "no_korean_clause_final_authority",
    "no_litigation_deadline_runtime_calculation",
    "no_corporate_document_runtime_assembly",
    "no_product_state_write",
    "claude_read_only_non_final"
  ],
  "allowed_claude_tools": [
    "Read",
    "Grep",
    "Glob"
  ],
  "forbidden_review_evidence": [
    "not_logged_in",
    "malformed_json",
    "usage_limit",
    "tool_call_shaped_output",
    "zero_byte_stdout",
    "fenced_json_with_prose"
  ],
  "required_public_exports": [
    "KOREAN_LEGAL_CP723_PACK_BINDING",
    "KOREAN_LEGAL_CP723_REQUIREMENTS",
    "createKoreanLegalCp723DomainModelWorkflowSliceCaseSet",
    "createKoreanLegalCp723DomainModelWorkflowSliceDescriptor",
    "validateKoreanLegalCp723DomainModelWorkflowSliceCoverage",
    "validateKoreanLegalCp723DomainModelWorkflowSliceDescriptor"
  ]
});

export const KOREAN_LEGAL_CP724_REQUIREMENTS = deepFreeze({
  "deliverable_counts": {
    "claude_review": 2,
    "fixture": 2,
    "hermes_evidence": 2,
    "implementation": 22,
    "test": 6,
    "ui": 6
  },
  "phase_counts": {
    "RP24.P01": 40
  },
  "micro_phase_row_counts": {
    "RP24.P01.M04": 14,
    "RP24.P01.M05": 22,
    "RP24.P01.M06": 4
  },
  "micro_title_row_counts": {
    "Permission And Audit Binding": 22,
    "Secondary Workflow Slice": 14,
    "Synthetic Fixture Set": 4
  },
  "required_section_rows": {
    "RP24.P01.M04": [
      "Reference relationship map",
      "Required field registry",
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
      "Closeout handoff"
    ],
    "RP24.P01.M05": [
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
      "Index export check"
    ],
    "RP24.P01.M06": [
      "Package directory layout",
      "Primary entity identifier",
      "Tenant scope field",
      "Matter trace reference"
    ]
  },
  "required_section_micro_titles": {
    "RP24.P01.M04": "Secondary Workflow Slice",
    "RP24.P01.M05": "Permission And Audit Binding",
    "RP24.P01.M06": "Synthetic Fixture Set"
  },
  "required_no_leak_guards": [
    "descriptor_only",
    "no_real_client_or_matter_data",
    "no_external_credentials",
    "no_hwpx_runtime_parse",
    "no_court_filing_runtime",
    "no_korean_clause_final_authority",
    "no_litigation_deadline_runtime_calculation",
    "no_corporate_document_runtime_assembly",
    "no_product_state_write",
    "claude_read_only_non_final"
  ],
  "allowed_claude_tools": [
    "Read",
    "Grep",
    "Glob"
  ],
  "forbidden_review_evidence": [
    "not_logged_in",
    "malformed_json",
    "usage_limit",
    "tool_call_shaped_output",
    "zero_byte_stdout",
    "fenced_json_with_prose"
  ],
  "required_public_exports": [
    "KOREAN_LEGAL_CP724_PACK_BINDING",
    "KOREAN_LEGAL_CP724_REQUIREMENTS",
    "createKoreanLegalCp724WorkflowPermissionFixtureBridgeCaseSet",
    "createKoreanLegalCp724WorkflowPermissionFixtureBridgeDescriptor",
    "validateKoreanLegalCp724WorkflowPermissionFixtureBridgeCoverage",
    "validateKoreanLegalCp724WorkflowPermissionFixtureBridgeDescriptor"
  ]
});

export const KOREAN_LEGAL_CP725_REQUIREMENTS = deepFreeze({
  "deliverable_counts": {
    "claude_review": 7,
    "contract": 3,
    "failure_recovery": 6,
    "fixture": 4,
    "hermes_evidence": 4,
    "implementation": 77,
    "security_audit": 6,
    "test": 20,
    "ui": 23
  },
  "phase_counts": {
    "RP24.P01": 88,
    "RP24.P02": 62
  },
  "micro_phase_row_counts": {
    "RP24.P01.M06": 16,
    "RP24.P01.M07": 22,
    "RP24.P01.M08": 20,
    "RP24.P01.M09": 20,
    "RP24.P01.M10": 10,
    "RP24.P02.M00": 20,
    "RP24.P02.M01": 20,
    "RP24.P02.M02": 22
  },
  "micro_title_row_counts": {
    "Claude Review Packet": 20,
    "Closeout And Next Handoff": 10,
    "Contract Draft": 20,
    "Hermes Evidence Packet": 20,
    "Scope Inventory": 20,
    "Synthetic Fixture Set": 16,
    "Test And Golden Case Set": 22,
    "Type And Shape Definition": 22
  },
  "required_section_rows": {
    "RP24.P01.M06": [
      "Lifecycle status enum",
      "Ownership metadata",
      "Reference relationship map",
      "Required field registry",
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
      "Closeout handoff"
    ],
    "RP24.P01.M07": [
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
      "Index export check"
    ],
    "RP24.P01.M08": [
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
      "Validation helper",
      "Fixture model",
      "Serialization shape",
      "Public export",
      "Model unit test",
      "Invalid reference test",
      "Ownership drift test",
      "Hermes model summary",
      "Claude model review prompt",
      "Closeout handoff"
    ],
    "RP24.P01.M09": [
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
      "Validation helper",
      "Fixture model",
      "Serialization shape",
      "Public export",
      "Model unit test",
      "Invalid reference test",
      "Ownership drift test",
      "Hermes model summary",
      "Claude model review prompt",
      "Closeout handoff"
    ],
    "RP24.P01.M10": [
      "Package directory layout",
      "Primary entity identifier",
      "Tenant scope field",
      "Matter trace reference",
      "Lifecycle status enum",
      "Ownership metadata",
      "Reference relationship map",
      "Required field registry",
      "Optional field registry",
      "State transition map"
    ],
    "RP24.P02.M00": [
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
      "Unit test: denied path"
    ],
    "RP24.P02.M01": [
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
      "Unit test: denied path"
    ],
    "RP24.P02.M02": [
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
      "Unit test: review path",
      "Integration smoke case"
    ]
  },
  "required_section_micro_titles": {
    "RP24.P01.M06": "Synthetic Fixture Set",
    "RP24.P01.M07": "Test And Golden Case Set",
    "RP24.P01.M08": "Hermes Evidence Packet",
    "RP24.P01.M09": "Claude Review Packet",
    "RP24.P01.M10": "Closeout And Next Handoff",
    "RP24.P02.M00": "Scope Inventory",
    "RP24.P02.M01": "Contract Draft",
    "RP24.P02.M02": "Type And Shape Definition"
  },
  "required_no_leak_guards": [
    "descriptor_only",
    "no_real_client_or_matter_data",
    "no_external_credentials",
    "no_hwpx_runtime_parse",
    "no_court_filing_runtime",
    "no_korean_clause_final_authority",
    "no_litigation_deadline_runtime_calculation",
    "no_corporate_document_runtime_assembly",
    "no_product_state_write",
    "claude_read_only_non_final"
  ],
  "allowed_claude_tools": [
    "Read",
    "Grep",
    "Glob"
  ],
  "forbidden_review_evidence": [
    "not_logged_in",
    "malformed_json",
    "usage_limit",
    "tool_call_shaped_output",
    "zero_byte_stdout",
    "fenced_json_with_prose"
  ],
  "required_public_exports": [
    "KOREAN_LEGAL_CP725_PACK_BINDING",
    "KOREAN_LEGAL_CP725_REQUIREMENTS",
    "createKoreanLegalCp725FixtureEvidenceReviewP02BridgeCaseSet",
    "createKoreanLegalCp725FixtureEvidenceReviewP02BridgeDescriptor",
    "validateKoreanLegalCp725FixtureEvidenceReviewP02BridgeCoverage",
    "validateKoreanLegalCp725FixtureEvidenceReviewP02BridgeDescriptor"
  ]
});

export const KOREAN_LEGAL_CP726_REQUIREMENTS = deepFreeze({
  "deliverable_counts": {
    "claude_review": 2,
    "contract": 2,
    "failure_recovery": 4,
    "implementation": 18,
    "security_audit": 4,
    "test": 4,
    "ui": 6
  },
  "phase_counts": {
    "RP24.P02": 40
  },
  "micro_phase_row_counts": {
    "RP24.P02.M03": 22,
    "RP24.P02.M04": 18
  },
  "micro_title_row_counts": {
    "Primary Implementation Slice": 22,
    "Secondary Workflow Slice": 18
  },
  "required_section_rows": {
    "RP24.P02.M03": [
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
      "Unit test: review path",
      "Integration smoke case"
    ],
    "RP24.P02.M04": [
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
      "Retry behavior"
    ]
  },
  "required_section_micro_titles": {
    "RP24.P02.M03": "Primary Implementation Slice",
    "RP24.P02.M04": "Secondary Workflow Slice"
  },
  "required_no_leak_guards": [
    "descriptor_only",
    "no_real_client_or_matter_data",
    "no_external_credentials",
    "no_hwpx_runtime_parse",
    "no_court_filing_runtime",
    "no_korean_clause_final_authority",
    "no_litigation_deadline_runtime_calculation",
    "no_corporate_document_runtime_assembly",
    "no_product_state_write",
    "claude_read_only_non_final"
  ],
  "allowed_claude_tools": [
    "Read",
    "Grep",
    "Glob"
  ],
  "forbidden_review_evidence": [
    "not_logged_in",
    "malformed_json",
    "usage_limit",
    "tool_call_shaped_output",
    "zero_byte_stdout",
    "fenced_json_with_prose"
  ],
  "required_public_exports": [
    "KOREAN_LEGAL_CP726_PACK_BINDING",
    "KOREAN_LEGAL_CP726_REQUIREMENTS",
    "createKoreanLegalCp726P02ImplementationWorkflowSliceCaseSet",
    "createKoreanLegalCp726P02ImplementationWorkflowSliceDescriptor",
    "validateKoreanLegalCp726P02ImplementationWorkflowSliceCoverage",
    "validateKoreanLegalCp726P02ImplementationWorkflowSliceDescriptor"
  ]
});

export const KOREAN_LEGAL_CP727_REQUIREMENTS = deepFreeze({
  "deliverable_counts": {
    "claude_review": 2,
    "contract": 2,
    "failure_recovery": 2,
    "implementation": 17,
    "security_audit": 4,
    "test": 8,
    "ui": 5
  },
  "phase_counts": {
    "RP24.P02": 40
  },
  "micro_phase_row_counts": {
    "RP24.P02.M04": 4,
    "RP24.P02.M05": 22,
    "RP24.P02.M06": 14
  },
  "micro_title_row_counts": {
    "Permission And Audit Binding": 22,
    "Secondary Workflow Slice": 4,
    "Synthetic Fixture Set": 14
  },
  "required_section_rows": {
    "RP24.P02.M04": [
      "Unit test: happy path",
      "Unit test: denied path",
      "Unit test: review path",
      "Integration smoke case"
    ],
    "RP24.P02.M05": [
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
      "Unit test: review path",
      "Integration smoke case"
    ],
    "RP24.P02.M06": [
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
      "Review-required routing"
    ]
  },
  "required_section_micro_titles": {
    "RP24.P02.M04": "Secondary Workflow Slice",
    "RP24.P02.M05": "Permission And Audit Binding",
    "RP24.P02.M06": "Synthetic Fixture Set"
  },
  "required_no_leak_guards": [
    "descriptor_only",
    "no_real_client_or_matter_data",
    "no_external_credentials",
    "no_hwpx_runtime_parse",
    "no_court_filing_runtime",
    "no_korean_clause_final_authority",
    "no_litigation_deadline_runtime_calculation",
    "no_corporate_document_runtime_assembly",
    "no_product_state_write",
    "claude_read_only_non_final"
  ],
  "allowed_claude_tools": [
    "Read",
    "Grep",
    "Glob"
  ],
  "forbidden_review_evidence": [
    "not_logged_in",
    "malformed_json",
    "usage_limit",
    "tool_call_shaped_output",
    "zero_byte_stdout",
    "fenced_json_with_prose"
  ],
  "required_public_exports": [
    "KOREAN_LEGAL_CP727_PACK_BINDING",
    "KOREAN_LEGAL_CP727_REQUIREMENTS",
    "createKoreanLegalCp727P02PermissionFixtureBridgeCaseSet",
    "createKoreanLegalCp727P02PermissionFixtureBridgeDescriptor",
    "validateKoreanLegalCp727P02PermissionFixtureBridgeCoverage",
    "validateKoreanLegalCp727P02PermissionFixtureBridgeDescriptor"
  ]
});

export const KOREAN_LEGAL_CP728_REQUIREMENTS = deepFreeze({
  "deliverable_counts": {
    "contract": 1,
    "failure_recovery": 2,
    "implementation": 2,
    "test": 4,
    "ui": 1
  },
  "phase_counts": {
    "RP24.P02": 10
  },
  "micro_phase_row_counts": {
    "RP24.P02.M06": 8,
    "RP24.P02.M07": 2
  },
  "micro_title_row_counts": {
    "Synthetic Fixture Set": 8,
    "Test And Golden Case Set": 2
  },
  "required_section_rows": {
    "RP24.P02.M06": [
      "Approval-required routing",
      "Blocked-claim output",
      "Rollback behavior",
      "Retry behavior",
      "Unit test: happy path",
      "Unit test: denied path",
      "Unit test: review path",
      "Integration smoke case"
    ],
    "RP24.P02.M07": [
      "Service entrypoint contract",
      "Request normalization"
    ]
  },
  "required_section_micro_titles": {
    "RP24.P02.M06": "Synthetic Fixture Set",
    "RP24.P02.M07": "Test And Golden Case Set"
  },
  "required_no_leak_guards": [
    "descriptor_only",
    "no_real_client_or_matter_data",
    "no_external_credentials",
    "no_hwpx_runtime_parse",
    "no_court_filing_runtime",
    "no_korean_clause_final_authority",
    "no_litigation_deadline_runtime_calculation",
    "no_corporate_document_runtime_assembly",
    "no_product_state_write",
    "claude_read_only_non_final"
  ],
  "allowed_claude_tools": [
    "Read",
    "Grep",
    "Glob"
  ],
  "forbidden_review_evidence": [
    "not_logged_in",
    "malformed_json",
    "usage_limit",
    "tool_call_shaped_output",
    "zero_byte_stdout",
    "fenced_json_with_prose"
  ],
  "required_public_exports": [
    "KOREAN_LEGAL_CP728_PACK_BINDING",
    "KOREAN_LEGAL_CP728_REQUIREMENTS",
    "createKoreanLegalCp728P02FixtureTestBridgeCaseSet",
    "createKoreanLegalCp728P02FixtureTestBridgeDescriptor",
    "validateKoreanLegalCp728P02FixtureTestBridgeCoverage",
    "validateKoreanLegalCp728P02FixtureTestBridgeDescriptor"
  ]
});

export const KOREAN_LEGAL_CP729_REQUIREMENTS = deepFreeze({
  "deliverable_counts": {
    "implementation": 6,
    "security_audit": 2,
    "ui": 2
  },
  "phase_counts": {
    "RP24.P02": 10
  },
  "micro_phase_row_counts": {
    "RP24.P02.M07": 10
  },
  "micro_title_row_counts": {
    "Test And Golden Case Set": 10
  },
  "required_section_rows": {
    "RP24.P02.M07": [
      "Tenant boundary precheck",
      "Matter trace precheck",
      "Permission precheck",
      "Audit hint precheck",
      "Primary happy path",
      "Secondary workflow path",
      "State transition enforcement",
      "Idempotency key handling",
      "Lock acquisition rule",
      "Persistence boundary"
    ]
  },
  "required_section_micro_titles": {
    "RP24.P02.M07": "Test And Golden Case Set"
  },
  "required_no_leak_guards": [
    "descriptor_only",
    "no_real_client_or_matter_data",
    "no_external_credentials",
    "no_hwpx_runtime_parse",
    "no_court_filing_runtime",
    "no_korean_clause_final_authority",
    "no_litigation_deadline_runtime_calculation",
    "no_corporate_document_runtime_assembly",
    "no_product_state_write",
    "claude_read_only_non_final"
  ],
  "allowed_claude_tools": [
    "Read",
    "Grep",
    "Glob"
  ],
  "forbidden_review_evidence": [
    "not_logged_in",
    "malformed_json",
    "usage_limit",
    "tool_call_shaped_output",
    "zero_byte_stdout",
    "fenced_json_with_prose"
  ],
  "required_public_exports": [
    "KOREAN_LEGAL_CP729_PACK_BINDING",
    "KOREAN_LEGAL_CP729_REQUIREMENTS",
    "createKoreanLegalCp729P02TestGoldenCaseSetCaseSet",
    "createKoreanLegalCp729P02TestGoldenCaseSetDescriptor",
    "validateKoreanLegalCp729P02TestGoldenCaseSetCoverage",
    "validateKoreanLegalCp729P02TestGoldenCaseSetDescriptor"
  ]
});

export const KOREAN_LEGAL_CP730_REQUIREMENTS = deepFreeze({
  "deliverable_counts": {
    "claude_review": 2,
    "contract": 2,
    "failure_recovery": 4,
    "implementation": 16,
    "security_audit": 4,
    "test": 8,
    "ui": 4
  },
  "phase_counts": {
    "RP24.P02": 40
  },
  "micro_phase_row_counts": {
    "RP24.P02.M07": 10,
    "RP24.P02.M08": 22,
    "RP24.P02.M09": 8
  },
  "micro_title_row_counts": {
    "Test And Golden Case Set": 10,
    "Hermes Evidence Packet": 22,
    "Claude Review Packet": 8
  },
  "required_section_rows": {
    "RP24.P02.M07": [
      "Validation error mapping",
      "Review-required routing",
      "Approval-required routing",
      "Blocked-claim output",
      "Rollback behavior",
      "Retry behavior",
      "Unit test: happy path",
      "Unit test: denied path",
      "Unit test: review path",
      "Integration smoke case"
    ],
    "RP24.P02.M08": [
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
      "Unit test: review path",
      "Integration smoke case"
    ],
    "RP24.P02.M09": [
      "Service entrypoint contract",
      "Request normalization",
      "Tenant boundary precheck",
      "Matter trace precheck",
      "Permission precheck",
      "Audit hint precheck",
      "Primary happy path",
      "Secondary workflow path"
    ]
  },
  "required_section_micro_titles": {
    "RP24.P02.M07": "Test And Golden Case Set",
    "RP24.P02.M08": "Hermes Evidence Packet",
    "RP24.P02.M09": "Claude Review Packet"
  },
  "required_no_leak_guards": [
    "descriptor_only",
    "no_real_client_or_matter_data",
    "no_external_credentials",
    "no_hwpx_runtime_parse",
    "no_court_filing_runtime",
    "no_korean_clause_final_authority",
    "no_litigation_deadline_runtime_calculation",
    "no_corporate_document_runtime_assembly",
    "no_product_state_write",
    "claude_read_only_non_final"
  ],
  "allowed_claude_tools": [
    "Read",
    "Grep",
    "Glob"
  ],
  "forbidden_review_evidence": [
    "not_logged_in",
    "malformed_json",
    "usage_limit",
    "tool_call_shaped_output",
    "zero_byte_stdout",
    "fenced_json_with_prose"
  ],
  "required_public_exports": [
    "KOREAN_LEGAL_CP730_PACK_BINDING",
    "KOREAN_LEGAL_CP730_REQUIREMENTS",
    "createKoreanLegalCp730P02HermesClaudeBridgeCaseSet",
    "createKoreanLegalCp730P02HermesClaudeBridgeDescriptor",
    "validateKoreanLegalCp730P02HermesClaudeBridgeCoverage",
    "validateKoreanLegalCp730P02HermesClaudeBridgeDescriptor"
  ]
});

export const KOREAN_LEGAL_CP731_REQUIREMENTS = deepFreeze({
  "deliverable_counts": {
    "ui": 6,
    "implementation": 63,
    "claude_review": 6,
    "failure_recovery": 4,
    "test": 20,
    "contract": 31,
    "security_audit": 16,
    "hermes_evidence": 4
  },
  "phase_counts": {
    "RP24.P02": 34,
    "RP24.P03": 116
  },
  "micro_phase_row_counts": {
    "RP24.P02.M09": 14,
    "RP24.P02.M10": 20,
    "RP24.P03.M00": 10,
    "RP24.P03.M01": 10,
    "RP24.P03.M02": 20,
    "RP24.P03.M03": 22,
    "RP24.P03.M04": 20,
    "RP24.P03.M05": 22,
    "RP24.P03.M06": 12
  },
  "micro_title_row_counts": {
    "Claude Review Packet": 14,
    "Closeout And Next Handoff": 20,
    "Scope Inventory": 10,
    "Contract Draft": 10,
    "Type And Shape Definition": 20,
    "Primary Implementation Slice": 22,
    "Secondary Workflow Slice": 20,
    "Permission And Audit Binding": 22,
    "Synthetic Fixture Set": 12
  },
  "required_section_rows": {
    "RP24.P02.M09": [
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
      "Unit test: review path",
      "Integration smoke case"
    ],
    "RP24.P02.M10": [
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
      "Unit test: denied path"
    ],
    "RP24.P03.M00": [
      "Public export map",
      "Request contract",
      "Response contract",
      "Error code taxonomy",
      "Permission annotation",
      "Audit annotation",
      "Pagination or filtering contract",
      "Serialization guard",
      "Unauthorized data omission",
      "API fixture"
    ],
    "RP24.P03.M01": [
      "Public export map",
      "Request contract",
      "Response contract",
      "Error code taxonomy",
      "Permission annotation",
      "Audit annotation",
      "Pagination or filtering contract",
      "Serialization guard",
      "Unauthorized data omission",
      "API fixture"
    ],
    "RP24.P03.M02": [
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
      "Contract test",
      "Invalid request test",
      "Denied response test",
      "Hermes API evidence",
      "Claude interface prompt",
      "Documentation example",
      "Versioning note",
      "Closeout handoff",
      "Downstream consumer note",
      "Command rerun"
    ],
    "RP24.P03.M03": [
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
      "Schema drift check",
      "Backward compatibility check"
    ],
    "RP24.P03.M04": [
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
      "Contract test",
      "Invalid request test",
      "Denied response test",
      "Hermes API evidence",
      "Claude interface prompt",
      "Documentation example",
      "Versioning note",
      "Closeout handoff",
      "Downstream consumer note",
      "Command rerun"
    ],
    "RP24.P03.M05": [
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
      "Schema drift check",
      "Backward compatibility check"
    ],
    "RP24.P03.M06": [
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
      "Contract test",
      "Invalid request test"
    ]
  },
  "required_section_micro_titles": {
    "RP24.P02.M09": "Claude Review Packet",
    "RP24.P02.M10": "Closeout And Next Handoff",
    "RP24.P03.M00": "Scope Inventory",
    "RP24.P03.M01": "Contract Draft",
    "RP24.P03.M02": "Type And Shape Definition",
    "RP24.P03.M03": "Primary Implementation Slice",
    "RP24.P03.M04": "Secondary Workflow Slice",
    "RP24.P03.M05": "Permission And Audit Binding",
    "RP24.P03.M06": "Synthetic Fixture Set"
  },
  "required_no_leak_guards": [
    "descriptor_only",
    "no_real_client_or_matter_data",
    "no_external_credentials",
    "no_hwpx_runtime_parse",
    "no_court_filing_runtime",
    "no_korean_clause_final_authority",
    "no_litigation_deadline_runtime_calculation",
    "no_corporate_document_runtime_assembly",
    "no_product_state_write",
    "claude_read_only_non_final"
  ],
  "allowed_claude_tools": [
    "Read",
    "Grep",
    "Glob"
  ],
  "forbidden_review_evidence": [
    "not_logged_in",
    "malformed_json",
    "usage_limit",
    "tool_call_shaped_output",
    "zero_byte_stdout",
    "fenced_json_with_prose"
  ],
  "required_public_exports": [
    "KOREAN_LEGAL_CP731_PACK_BINDING",
    "KOREAN_LEGAL_CP731_REQUIREMENTS",
    "createKoreanLegalCp731P02P03InterfaceFixtureBridgeCaseSet",
    "createKoreanLegalCp731P02P03InterfaceFixtureBridgeDescriptor",
    "validateKoreanLegalCp731P02P03InterfaceFixtureBridgeCoverage",
    "validateKoreanLegalCp731P02P03InterfaceFixtureBridgeDescriptor"
  ]
});

export const KOREAN_LEGAL_CP732_REQUIREMENTS = deepFreeze({
  "deliverable_counts": {
    "test": 13,
    "hermes_evidence": 7,
    "claude_review": 11,
    "implementation": 53,
    "contract": 17,
    "security_audit": 16,
    "ui": 30,
    "fixture": 3
  },
  "phase_counts": {
    "RP24.P03": 80,
    "RP24.P04": 70
  },
  "micro_phase_row_counts": {
    "RP24.P03.M06": 8,
    "RP24.P03.M07": 22,
    "RP24.P03.M08": 20,
    "RP24.P03.M09": 20,
    "RP24.P03.M10": 10,
    "RP24.P04.M00": 10,
    "RP24.P04.M01": 20,
    "RP24.P04.M02": 20,
    "RP24.P04.M03": 20
  },
  "micro_title_row_counts": {
    "Synthetic Fixture Set": 8,
    "Test And Golden Case Set": 22,
    "Hermes Evidence Packet": 20,
    "Claude Review Packet": 20,
    "Closeout And Next Handoff": 10,
    "Scope Inventory": 10,
    "Contract Draft": 20,
    "Type And Shape Definition": 20,
    "Primary Implementation Slice": 20
  },
  "required_section_rows": {
    "RP24.P03.M06": [
      "Denied response test",
      "Hermes API evidence",
      "Claude interface prompt",
      "Documentation example",
      "Versioning note",
      "Closeout handoff",
      "Downstream consumer note",
      "Command rerun"
    ],
    "RP24.P03.M07": [
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
      "Schema drift check",
      "Backward compatibility check"
    ],
    "RP24.P03.M08": [
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
      "Contract test",
      "Invalid request test",
      "Denied response test",
      "Hermes API evidence",
      "Claude interface prompt",
      "Documentation example",
      "Versioning note",
      "Closeout handoff",
      "Downstream consumer note",
      "Command rerun"
    ],
    "RP24.P03.M09": [
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
      "Contract test",
      "Invalid request test",
      "Denied response test",
      "Hermes API evidence",
      "Claude interface prompt",
      "Documentation example",
      "Versioning note",
      "Closeout handoff",
      "Downstream consumer note",
      "Command rerun"
    ],
    "RP24.P03.M10": [
      "Public export map",
      "Request contract",
      "Response contract",
      "Error code taxonomy",
      "Permission annotation",
      "Audit annotation",
      "Pagination or filtering contract",
      "Serialization guard",
      "Unauthorized data omission",
      "API fixture"
    ],
    "RP24.P04.M00": [
      "UI surface inventory",
      "Data dependency map",
      "Loading state",
      "Empty state",
      "Denied state",
      "Review-required state",
      "Primary interaction",
      "Secondary interaction",
      "Permission badge",
      "Audit hint display"
    ],
    "RP24.P04.M01": [
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
      "Error message copy",
      "Responsive desktop layout",
      "Responsive mobile layout",
      "Keyboard/focus behavior",
      "Visual density check",
      "Synthetic fixture binding",
      "Build smoke",
      "Hermes UI evidence",
      "Claude UI leak prompt",
      "Closeout handoff"
    ],
    "RP24.P04.M02": [
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
      "Error message copy",
      "Responsive desktop layout",
      "Responsive mobile layout",
      "Keyboard/focus behavior",
      "Visual density check",
      "Synthetic fixture binding",
      "Build smoke",
      "Hermes UI evidence",
      "Claude UI leak prompt",
      "Closeout handoff"
    ],
    "RP24.P04.M03": [
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
      "Error message copy",
      "Responsive desktop layout",
      "Responsive mobile layout",
      "Keyboard/focus behavior",
      "Visual density check",
      "Synthetic fixture binding",
      "Build smoke",
      "Hermes UI evidence",
      "Claude UI leak prompt",
      "Closeout handoff"
    ]
  },
  "required_section_micro_titles": {
    "RP24.P03.M06": "Synthetic Fixture Set",
    "RP24.P03.M07": "Test And Golden Case Set",
    "RP24.P03.M08": "Hermes Evidence Packet",
    "RP24.P03.M09": "Claude Review Packet",
    "RP24.P03.M10": "Closeout And Next Handoff",
    "RP24.P04.M00": "Scope Inventory",
    "RP24.P04.M01": "Contract Draft",
    "RP24.P04.M02": "Type And Shape Definition",
    "RP24.P04.M03": "Primary Implementation Slice"
  },
  "required_no_leak_guards": [
    "descriptor_only",
    "no_real_client_or_matter_data",
    "no_external_credentials",
    "no_hwpx_runtime_parse",
    "no_court_filing_runtime",
    "no_korean_clause_final_authority",
    "no_litigation_deadline_runtime_calculation",
    "no_corporate_document_runtime_assembly",
    "no_product_state_write",
    "claude_read_only_non_final"
  ],
  "allowed_claude_tools": [
    "Read",
    "Grep",
    "Glob"
  ],
  "forbidden_review_evidence": [
    "not_logged_in",
    "malformed_json",
    "usage_limit",
    "tool_call_shaped_output",
    "zero_byte_stdout",
    "fenced_json_with_prose"
  ],
  "required_public_exports": [
    "KOREAN_LEGAL_CP732_PACK_BINDING",
    "KOREAN_LEGAL_CP732_REQUIREMENTS",
    "createKoreanLegalCp732P03P04ReviewUiBridgeCaseSet",
    "createKoreanLegalCp732P03P04ReviewUiBridgeDescriptor",
    "validateKoreanLegalCp732P03P04ReviewUiBridgeCoverage",
    "validateKoreanLegalCp732P03P04ReviewUiBridgeDescriptor"
  ]
});

export const KOREAN_LEGAL_CP733_REQUIREMENTS = deepFreeze({
  "deliverable_counts": {
    "ui": 18,
    "implementation": 11,
    "claude_review": 3,
    "security_audit": 4,
    "fixture": 2,
    "test": 1,
    "hermes_evidence": 1
  },
  "phase_counts": {
    "RP24.P04": 40
  },
  "micro_phase_row_counts": {
    "RP24.P04.M03": 2,
    "RP24.P04.M04": 22,
    "RP24.P04.M05": 16
  },
  "micro_title_row_counts": {
    "Primary Implementation Slice": 2,
    "Secondary Workflow Slice": 22,
    "Permission And Audit Binding": 16
  },
  "required_section_rows": {
    "RP24.P04.M03": [
      "State snapshot",
      "No unauthorized count leak"
    ],
    "RP24.P04.M04": [
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
      "State snapshot",
      "No unauthorized count leak"
    ],
    "RP24.P04.M05": [
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
      "Error message copy",
      "Responsive desktop layout",
      "Responsive mobile layout",
      "Keyboard/focus behavior",
      "Visual density check",
      "Synthetic fixture binding"
    ]
  },
  "required_section_micro_titles": {
    "RP24.P04.M03": "Primary Implementation Slice",
    "RP24.P04.M04": "Secondary Workflow Slice",
    "RP24.P04.M05": "Permission And Audit Binding"
  },
  "required_no_leak_guards": [
    "descriptor_only",
    "no_real_client_or_matter_data",
    "no_external_credentials",
    "no_hwpx_runtime_parse",
    "no_court_filing_runtime",
    "no_korean_clause_final_authority",
    "no_litigation_deadline_runtime_calculation",
    "no_corporate_document_runtime_assembly",
    "no_product_state_write",
    "claude_read_only_non_final"
  ],
  "allowed_claude_tools": [
    "Read",
    "Grep",
    "Glob"
  ],
  "forbidden_review_evidence": [
    "not_logged_in",
    "malformed_json",
    "usage_limit",
    "tool_call_shaped_output",
    "zero_byte_stdout",
    "fenced_json_with_prose"
  ],
  "required_public_exports": [
    "KOREAN_LEGAL_CP733_PACK_BINDING",
    "KOREAN_LEGAL_CP733_REQUIREMENTS",
    "createKoreanLegalCp733P04WorkflowPermissionSliceCaseSet",
    "createKoreanLegalCp733P04WorkflowPermissionSliceDescriptor",
    "validateKoreanLegalCp733P04WorkflowPermissionSliceCoverage",
    "validateKoreanLegalCp733P04WorkflowPermissionSliceDescriptor"
  ]
});

export const KOREAN_LEGAL_CP734_REQUIREMENTS = deepFreeze({
  "deliverable_counts": {
    "test": 1,
    "hermes_evidence": 1,
    "claude_review": 1,
    "implementation": 3,
    "ui": 4
  },
  "phase_counts": {
    "RP24.P04": 10
  },
  "micro_phase_row_counts": {
    "RP24.P04.M05": 6,
    "RP24.P04.M06": 4
  },
  "micro_title_row_counts": {
    "Permission And Audit Binding": 6,
    "Synthetic Fixture Set": 4
  },
  "required_section_rows": {
    "RP24.P04.M05": [
      "Build smoke",
      "Hermes UI evidence",
      "Claude UI leak prompt",
      "Closeout handoff",
      "State snapshot",
      "No unauthorized count leak"
    ],
    "RP24.P04.M06": [
      "UI surface inventory",
      "Data dependency map",
      "Loading state",
      "Empty state"
    ]
  },
  "required_section_micro_titles": {
    "RP24.P04.M05": "Permission And Audit Binding",
    "RP24.P04.M06": "Synthetic Fixture Set"
  },
  "required_no_leak_guards": [
    "descriptor_only",
    "no_real_client_or_matter_data",
    "no_external_credentials",
    "no_hwpx_runtime_parse",
    "no_court_filing_runtime",
    "no_korean_clause_final_authority",
    "no_litigation_deadline_runtime_calculation",
    "no_corporate_document_runtime_assembly",
    "no_product_state_write",
    "claude_read_only_non_final"
  ],
  "allowed_claude_tools": [
    "Read",
    "Grep",
    "Glob"
  ],
  "forbidden_review_evidence": [
    "not_logged_in",
    "malformed_json",
    "usage_limit",
    "tool_call_shaped_output",
    "zero_byte_stdout",
    "fenced_json_with_prose"
  ],
  "required_public_exports": [
    "KOREAN_LEGAL_CP734_PACK_BINDING",
    "KOREAN_LEGAL_CP734_REQUIREMENTS",
    "createKoreanLegalCp734P04PermissionFixtureBridgeCaseSet",
    "createKoreanLegalCp734P04PermissionFixtureBridgeDescriptor",
    "validateKoreanLegalCp734P04PermissionFixtureBridgeCoverage",
    "validateKoreanLegalCp734P04PermissionFixtureBridgeDescriptor"
  ]
});

export const KOREAN_LEGAL_CP735_REQUIREMENTS = deepFreeze({
  "deliverable_counts": {
    "ui": 39,
    "claude_review": 12,
    "security_audit": 14,
    "implementation": 39,
    "fixture": 30,
    "test": 10,
    "hermes_evidence": 6
  },
  "phase_counts": {
    "RP24.P04": 94,
    "RP24.P05": 56
  },
  "micro_phase_row_counts": {
    "RP24.P04.M06": 18,
    "RP24.P04.M07": 22,
    "RP24.P04.M08": 22,
    "RP24.P04.M09": 22,
    "RP24.P04.M10": 10,
    "RP24.P05.M00": 10,
    "RP24.P05.M01": 20,
    "RP24.P05.M02": 20,
    "RP24.P05.M03": 6
  },
  "micro_title_row_counts": {
    "Synthetic Fixture Set": 18,
    "Test And Golden Case Set": 22,
    "Hermes Evidence Packet": 22,
    "Claude Review Packet": 22,
    "Closeout And Next Handoff": 10,
    "Scope Inventory": 10,
    "Contract Draft": 20,
    "Type And Shape Definition": 20,
    "Primary Implementation Slice": 6
  },
  "required_section_rows": {
    "RP24.P04.M06": [
      "Denied state",
      "Review-required state",
      "Primary interaction",
      "Secondary interaction",
      "Permission badge",
      "Audit hint display",
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
      "State snapshot",
      "No unauthorized count leak"
    ],
    "RP24.P04.M07": [
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
      "State snapshot",
      "No unauthorized count leak"
    ],
    "RP24.P04.M08": [
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
      "State snapshot",
      "No unauthorized count leak"
    ],
    "RP24.P04.M09": [
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
      "State snapshot",
      "No unauthorized count leak"
    ],
    "RP24.P04.M10": [
      "UI surface inventory",
      "Data dependency map",
      "Loading state",
      "Empty state",
      "Denied state",
      "Review-required state",
      "Primary interaction",
      "Secondary interaction",
      "Permission badge",
      "Audit hint display"
    ],
    "RP24.P05.M00": [
      "Base tenant fixture",
      "Base user fixture",
      "Base matter fixture",
      "Base document fixture",
      "Primary golden case",
      "Secondary golden case",
      "Review-required case",
      "Denied case",
      "Cross-tenant case",
      "Missing context case"
    ],
    "RP24.P05.M01": [
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
      "Audit hint case",
      "Security trimming case",
      "AI retrieval or analytics case",
      "Fixture manifest",
      "Golden test",
      "Failure test",
      "Hermes fixture evidence",
      "Claude missing-test prompt",
      "Closeout handoff",
      "No-real-data check"
    ],
    "RP24.P05.M02": [
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
      "Audit hint case",
      "Security trimming case",
      "AI retrieval or analytics case",
      "Fixture manifest",
      "Golden test",
      "Failure test",
      "Hermes fixture evidence",
      "Claude missing-test prompt",
      "Closeout handoff",
      "No-real-data check"
    ],
    "RP24.P05.M03": [
      "Base tenant fixture",
      "Base user fixture",
      "Base matter fixture",
      "Base document fixture",
      "Primary golden case",
      "Secondary golden case"
    ]
  },
  "required_section_micro_titles": {
    "RP24.P04.M06": "Synthetic Fixture Set",
    "RP24.P04.M07": "Test And Golden Case Set",
    "RP24.P04.M08": "Hermes Evidence Packet",
    "RP24.P04.M09": "Claude Review Packet",
    "RP24.P04.M10": "Closeout And Next Handoff",
    "RP24.P05.M00": "Scope Inventory",
    "RP24.P05.M01": "Contract Draft",
    "RP24.P05.M02": "Type And Shape Definition",
    "RP24.P05.M03": "Primary Implementation Slice"
  },
  "required_no_leak_guards": [
    "descriptor_only",
    "no_real_client_or_matter_data",
    "no_external_credentials",
    "no_hwpx_runtime_parse",
    "no_court_filing_runtime",
    "no_korean_clause_final_authority",
    "no_litigation_deadline_runtime_calculation",
    "no_corporate_document_runtime_assembly",
    "no_product_state_write",
    "claude_read_only_non_final"
  ],
  "allowed_claude_tools": [
    "Read",
    "Grep",
    "Glob"
  ],
  "forbidden_review_evidence": [
    "not_logged_in",
    "malformed_json",
    "usage_limit",
    "tool_call_shaped_output",
    "zero_byte_stdout",
    "fenced_json_with_prose"
  ],
  "required_public_exports": [
    "KOREAN_LEGAL_CP735_PACK_BINDING",
    "KOREAN_LEGAL_CP735_REQUIREMENTS",
    "createKoreanLegalCp735P04P05FixtureContractBridgeCaseSet",
    "createKoreanLegalCp735P04P05FixtureContractBridgeDescriptor",
    "validateKoreanLegalCp735P04P05FixtureContractBridgeCoverage",
    "validateKoreanLegalCp735P04P05FixtureContractBridgeDescriptor"
  ]
});

export const KOREAN_LEGAL_CP736_REQUIREMENTS = deepFreeze({
  "deliverable_counts": {
    "claude_review": 2,
    "implementation": 16,
    "security_audit": 4,
    "fixture": 10,
    "test": 6,
    "hermes_evidence": 2
  },
  "phase_counts": {
    "RP24.P05": 40
  },
  "micro_phase_row_counts": {
    "RP24.P05.M03": 16,
    "RP24.P05.M04": 22,
    "RP24.P05.M05": 2
  },
  "micro_title_row_counts": {
    "Primary Implementation Slice": 16,
    "Secondary Workflow Slice": 22,
    "Permission And Audit Binding": 2
  },
  "required_section_rows": {
    "RP24.P05.M03": [
      "Review-required case",
      "Denied case",
      "Cross-tenant case",
      "Missing context case",
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
      "Stable ID check",
      "Replay command"
    ],
    "RP24.P05.M04": [
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
      "Stable ID check",
      "Replay command"
    ],
    "RP24.P05.M05": [
      "Base tenant fixture",
      "Base user fixture"
    ]
  },
  "required_section_micro_titles": {
    "RP24.P05.M03": "Primary Implementation Slice",
    "RP24.P05.M04": "Secondary Workflow Slice",
    "RP24.P05.M05": "Permission And Audit Binding"
  },
  "required_no_leak_guards": [
    "descriptor_only",
    "no_real_client_or_matter_data",
    "no_external_credentials",
    "no_hwpx_runtime_parse",
    "no_court_filing_runtime",
    "no_korean_clause_final_authority",
    "no_litigation_deadline_runtime_calculation",
    "no_corporate_document_runtime_assembly",
    "no_product_state_write",
    "claude_read_only_non_final"
  ],
  "allowed_claude_tools": [
    "Read",
    "Grep",
    "Glob"
  ],
  "forbidden_review_evidence": [
    "not_logged_in",
    "malformed_json",
    "usage_limit",
    "tool_call_shaped_output",
    "zero_byte_stdout",
    "fenced_json_with_prose"
  ],
  "required_public_exports": [
    "KOREAN_LEGAL_CP736_PACK_BINDING",
    "KOREAN_LEGAL_CP736_REQUIREMENTS",
    "createKoreanLegalCp736P05WorkflowPermissionSliceCaseSet",
    "createKoreanLegalCp736P05WorkflowPermissionSliceDescriptor",
    "validateKoreanLegalCp736P05WorkflowPermissionSliceCoverage",
    "validateKoreanLegalCp736P05WorkflowPermissionSliceDescriptor"
  ]
});

export const KOREAN_LEGAL_CP737_REQUIREMENTS = deepFreeze({
  "deliverable_counts": {
    "fixture": 4,
    "claude_review": 1,
    "implementation": 3,
    "security_audit": 2
  },
  "phase_counts": {
    "RP24.P05": 10
  },
  "micro_phase_row_counts": {
    "RP24.P05.M05": 10
  },
  "micro_title_row_counts": {
    "Permission And Audit Binding": 10
  },
  "required_section_rows": {
    "RP24.P05.M05": [
      "Base matter fixture",
      "Base document fixture",
      "Primary golden case",
      "Secondary golden case",
      "Review-required case",
      "Denied case",
      "Cross-tenant case",
      "Missing context case",
      "Audit hint case",
      "Security trimming case"
    ]
  },
  "required_section_micro_titles": {
    "RP24.P05.M05": "Permission And Audit Binding"
  },
  "required_no_leak_guards": [
    "descriptor_only",
    "no_real_client_or_matter_data",
    "no_external_credentials",
    "no_hwpx_runtime_parse",
    "no_court_filing_runtime",
    "no_korean_clause_final_authority",
    "no_litigation_deadline_runtime_calculation",
    "no_corporate_document_runtime_assembly",
    "no_product_state_write",
    "claude_read_only_non_final"
  ],
  "allowed_claude_tools": [
    "Read",
    "Grep",
    "Glob"
  ],
  "forbidden_review_evidence": [
    "not_logged_in",
    "malformed_json",
    "usage_limit",
    "tool_call_shaped_output",
    "zero_byte_stdout",
    "fenced_json_with_prose"
  ],
  "required_public_exports": [
    "KOREAN_LEGAL_CP737_PACK_BINDING",
    "KOREAN_LEGAL_CP737_REQUIREMENTS",
    "createKoreanLegalCp737P05PermissionAuditBindingCaseSet",
    "createKoreanLegalCp737P05PermissionAuditBindingDescriptor",
    "validateKoreanLegalCp737P05PermissionAuditBindingCoverage",
    "validateKoreanLegalCp737P05PermissionAuditBindingDescriptor"
  ]
});

export const KOREAN_LEGAL_CP738_REQUIREMENTS = deepFreeze({
  "deliverable_counts": {
    "implementation": 5,
    "fixture": 1,
    "test": 3,
    "hermes_evidence": 1
  },
  "phase_counts": {
    "RP24.P05": 10
  },
  "micro_phase_row_counts": {
    "RP24.P05.M05": 10
  },
  "micro_title_row_counts": {
    "Permission And Audit Binding": 10
  },
  "required_section_rows": {
    "RP24.P05.M05": [
      "AI retrieval or analytics case",
      "Fixture manifest",
      "Golden test",
      "Failure test",
      "Hermes fixture evidence",
      "Claude missing-test prompt",
      "Closeout handoff",
      "No-real-data check",
      "Stable ID check",
      "Replay command"
    ]
  },
  "required_section_micro_titles": {
    "RP24.P05.M05": "Permission And Audit Binding"
  },
  "required_no_leak_guards": [
    "descriptor_only",
    "no_real_client_or_matter_data",
    "no_external_credentials",
    "no_hwpx_runtime_parse",
    "no_court_filing_runtime",
    "no_korean_clause_final_authority",
    "no_litigation_deadline_runtime_calculation",
    "no_corporate_document_runtime_assembly",
    "no_product_state_write",
    "claude_read_only_non_final"
  ],
  "allowed_claude_tools": [
    "Read",
    "Grep",
    "Glob"
  ],
  "forbidden_review_evidence": [
    "not_logged_in",
    "malformed_json",
    "usage_limit",
    "tool_call_shaped_output",
    "zero_byte_stdout",
    "fenced_json_with_prose"
  ],
  "required_public_exports": [
    "KOREAN_LEGAL_CP738_PACK_BINDING",
    "KOREAN_LEGAL_CP738_REQUIREMENTS",
    "createKoreanLegalCp738P05PermissionAuditEvidenceBridgeCaseSet",
    "createKoreanLegalCp738P05PermissionAuditEvidenceBridgeDescriptor",
    "validateKoreanLegalCp738P05PermissionAuditEvidenceBridgeCoverage",
    "validateKoreanLegalCp738P05PermissionAuditEvidenceBridgeDescriptor"
  ]
});

export const KOREAN_LEGAL_CP739_REQUIREMENTS = deepFreeze({
  "deliverable_counts": {
    "fixture": 6,
    "claude_review": 1,
    "implementation": 3
  },
  "phase_counts": {
    "RP24.P05": 10
  },
  "micro_phase_row_counts": {
    "RP24.P05.M06": 10
  },
  "micro_title_row_counts": {
    "Synthetic Fixture Set": 10
  },
  "required_section_rows": {
    "RP24.P05.M06": [
      "Base tenant fixture",
      "Base user fixture",
      "Base matter fixture",
      "Base document fixture",
      "Primary golden case",
      "Secondary golden case",
      "Review-required case",
      "Denied case",
      "Cross-tenant case",
      "Missing context case"
    ]
  },
  "required_section_micro_titles": {
    "RP24.P05.M06": "Synthetic Fixture Set"
  },
  "required_no_leak_guards": [
    "descriptor_only",
    "no_real_client_or_matter_data",
    "no_external_credentials",
    "no_hwpx_runtime_parse",
    "no_court_filing_runtime",
    "no_korean_clause_final_authority",
    "no_litigation_deadline_runtime_calculation",
    "no_corporate_document_runtime_assembly",
    "no_product_state_write",
    "claude_read_only_non_final"
  ],
  "allowed_claude_tools": [
    "Read",
    "Grep",
    "Glob"
  ],
  "forbidden_review_evidence": [
    "not_logged_in",
    "malformed_json",
    "usage_limit",
    "tool_call_shaped_output",
    "zero_byte_stdout",
    "fenced_json_with_prose"
  ],
  "required_public_exports": [
    "KOREAN_LEGAL_CP739_PACK_BINDING",
    "KOREAN_LEGAL_CP739_REQUIREMENTS",
    "createKoreanLegalCp739P05SyntheticFixtureFoundationCaseSet",
    "createKoreanLegalCp739P05SyntheticFixtureFoundationDescriptor",
    "validateKoreanLegalCp739P05SyntheticFixtureFoundationCoverage",
    "validateKoreanLegalCp739P05SyntheticFixtureFoundationDescriptor"
  ]
});

export const KOREAN_LEGAL_CP740_REQUIREMENTS = deepFreeze({
  "deliverable_counts": {
    "security_audit": 2,
    "implementation": 3,
    "fixture": 1,
    "test": 3,
    "hermes_evidence": 1
  },
  "phase_counts": {
    "RP24.P05": 10
  },
  "micro_phase_row_counts": {
    "RP24.P05.M06": 10
  },
  "micro_title_row_counts": {
    "Synthetic Fixture Set": 10
  },
  "required_section_rows": {
    "RP24.P05.M06": [
      "Audit hint case",
      "Security trimming case",
      "AI retrieval or analytics case",
      "Fixture manifest",
      "Golden test",
      "Failure test",
      "Hermes fixture evidence",
      "Claude missing-test prompt",
      "Closeout handoff",
      "No-real-data check"
    ]
  },
  "required_section_micro_titles": {
    "RP24.P05.M06": "Synthetic Fixture Set"
  },
  "required_no_leak_guards": [
    "descriptor_only",
    "no_real_client_or_matter_data",
    "no_external_credentials",
    "no_hwpx_runtime_parse",
    "no_court_filing_runtime",
    "no_korean_clause_final_authority",
    "no_litigation_deadline_runtime_calculation",
    "no_corporate_document_runtime_assembly",
    "no_product_state_write",
    "claude_read_only_non_final"
  ],
  "allowed_claude_tools": [
    "Read",
    "Grep",
    "Glob"
  ],
  "forbidden_review_evidence": [
    "not_logged_in",
    "malformed_json",
    "usage_limit",
    "tool_call_shaped_output",
    "zero_byte_stdout",
    "fenced_json_with_prose"
  ],
  "required_public_exports": [
    "KOREAN_LEGAL_CP740_PACK_BINDING",
    "KOREAN_LEGAL_CP740_REQUIREMENTS",
    "createKoreanLegalCp740P05SyntheticFixtureAuditClosureCaseSet",
    "createKoreanLegalCp740P05SyntheticFixtureAuditClosureDescriptor",
    "validateKoreanLegalCp740P05SyntheticFixtureAuditClosureCoverage",
    "validateKoreanLegalCp740P05SyntheticFixtureAuditClosureDescriptor"
  ]
});

export const KOREAN_LEGAL_CP741_REQUIREMENTS = deepFreeze({
  "deliverable_counts": {
    "implementation": 61,
    "fixture": 27,
    "claude_review": 7,
    "security_audit": 23,
    "test": 17,
    "hermes_evidence": 3,
    "ui": 12
  },
  "phase_counts": {
    "RP24.P05": 78,
    "RP24.P06": 72
  },
  "micro_phase_row_counts": {
    "RP24.P05.M06": 2,
    "RP24.P05.M07": 22,
    "RP24.P05.M08": 22,
    "RP24.P05.M09": 22,
    "RP24.P05.M10": 10,
    "RP24.P06.M00": 20,
    "RP24.P06.M01": 20,
    "RP24.P06.M02": 22,
    "RP24.P06.M03": 10
  },
  "micro_title_row_counts": {
    "Synthetic Fixture Set": 2,
    "Test And Golden Case Set": 22,
    "Hermes Evidence Packet": 22,
    "Claude Review Packet": 22,
    "Closeout And Next Handoff": 10,
    "Scope Inventory": 20,
    "Contract Draft": 20,
    "Type And Shape Definition": 22,
    "Primary Implementation Slice": 10
  },
  "required_section_rows": {
    "RP24.P05.M06": [
      "Stable ID check",
      "Replay command"
    ],
    "RP24.P05.M07": [
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
      "Stable ID check",
      "Replay command"
    ],
    "RP24.P05.M08": [
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
      "Stable ID check",
      "Replay command"
    ],
    "RP24.P05.M09": [
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
      "Stable ID check",
      "Replay command"
    ],
    "RP24.P05.M10": [
      "Base tenant fixture",
      "Base user fixture",
      "Base matter fixture",
      "Base document fixture",
      "Primary golden case",
      "Secondary golden case",
      "Review-required case",
      "Denied case",
      "Cross-tenant case",
      "Missing context case"
    ],
    "RP24.P06.M00": [
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
      "Denied test"
    ],
    "RP24.P06.M01": [
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
      "Denied test"
    ],
    "RP24.P06.M02": [
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
      "Cross-tenant test",
      "Leak prevention test"
    ],
    "RP24.P06.M03": [
      "Permission matrix row",
      "View decision binding",
      "Search decision binding",
      "Mutation decision binding",
      "Export/download decision binding",
      "Share decision binding",
      "AI retrieval decision binding",
      "Audit hint fields",
      "Matched rule capture",
      "Deny-over-allow check"
    ]
  },
  "required_section_micro_titles": {
    "RP24.P05.M06": "Synthetic Fixture Set",
    "RP24.P05.M07": "Test And Golden Case Set",
    "RP24.P05.M08": "Hermes Evidence Packet",
    "RP24.P05.M09": "Claude Review Packet",
    "RP24.P05.M10": "Closeout And Next Handoff",
    "RP24.P06.M00": "Scope Inventory",
    "RP24.P06.M01": "Contract Draft",
    "RP24.P06.M02": "Type And Shape Definition",
    "RP24.P06.M03": "Primary Implementation Slice"
  },
  "required_no_leak_guards": [
    "descriptor_only",
    "no_real_client_or_matter_data",
    "no_external_credentials",
    "no_hwpx_runtime_parse",
    "no_court_filing_runtime",
    "no_korean_clause_final_authority",
    "no_litigation_deadline_runtime_calculation",
    "no_corporate_document_runtime_assembly",
    "no_product_state_write",
    "claude_read_only_non_final"
  ],
  "allowed_claude_tools": [
    "Read",
    "Grep",
    "Glob"
  ],
  "forbidden_review_evidence": [
    "not_logged_in",
    "malformed_json",
    "usage_limit",
    "tool_call_shaped_output",
    "zero_byte_stdout",
    "fenced_json_with_prose"
  ],
  "required_public_exports": [
    "KOREAN_LEGAL_CP741_PACK_BINDING",
    "KOREAN_LEGAL_CP741_REQUIREMENTS",
    "createKoreanLegalCp741P05P06FixturePermissionBridgeCaseSet",
    "createKoreanLegalCp741P05P06FixturePermissionBridgeDescriptor",
    "validateKoreanLegalCp741P05P06FixturePermissionBridgeCoverage",
    "validateKoreanLegalCp741P05P06FixturePermissionBridgeDescriptor"
  ]
});

export const KOREAN_LEGAL_CP742_REQUIREMENTS = deepFreeze({
  "deliverable_counts": {
    "ui": 8,
    "claude_review": 2,
    "security_audit": 9,
    "test": 8,
    "implementation": 13
  },
  "phase_counts": {
    "RP24.P06": 40
  },
  "micro_phase_row_counts": {
    "RP24.P06.M03": 12,
    "RP24.P06.M04": 22,
    "RP24.P06.M05": 6
  },
  "micro_title_row_counts": {
    "Primary Implementation Slice": 12,
    "Secondary Workflow Slice": 22,
    "Permission And Audit Binding": 6
  },
  "required_section_rows": {
    "RP24.P06.M03": [
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
      "Cross-tenant test",
      "Leak prevention test"
    ],
    "RP24.P06.M04": [
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
      "Cross-tenant test",
      "Leak prevention test"
    ],
    "RP24.P06.M05": [
      "Permission matrix row",
      "View decision binding",
      "Search decision binding",
      "Mutation decision binding",
      "Export/download decision binding",
      "Share decision binding"
    ]
  },
  "required_section_micro_titles": {
    "RP24.P06.M03": "Primary Implementation Slice",
    "RP24.P06.M04": "Secondary Workflow Slice",
    "RP24.P06.M05": "Permission And Audit Binding"
  },
  "required_no_leak_guards": [
    "descriptor_only",
    "no_real_client_or_matter_data",
    "no_external_credentials",
    "no_hwpx_runtime_parse",
    "no_court_filing_runtime",
    "no_korean_clause_final_authority",
    "no_litigation_deadline_runtime_calculation",
    "no_corporate_document_runtime_assembly",
    "no_product_state_write",
    "claude_read_only_non_final"
  ],
  "allowed_claude_tools": [
    "Read",
    "Grep",
    "Glob"
  ],
  "forbidden_review_evidence": [
    "not_logged_in",
    "malformed_json",
    "usage_limit",
    "tool_call_shaped_output",
    "zero_byte_stdout",
    "fenced_json_with_prose"
  ],
  "required_public_exports": [
    "KOREAN_LEGAL_CP742_PACK_BINDING",
    "KOREAN_LEGAL_CP742_REQUIREMENTS",
    "createKoreanLegalCp742P06WorkflowPermissionSliceCaseSet",
    "createKoreanLegalCp742P06WorkflowPermissionSliceDescriptor",
    "validateKoreanLegalCp742P06WorkflowPermissionSliceCoverage",
    "validateKoreanLegalCp742P06WorkflowPermissionSliceDescriptor"
  ]
});

export const KOREAN_LEGAL_CP743_REQUIREMENTS = deepFreeze({
  "deliverable_counts": {
    "implementation": 3,
    "security_audit": 2,
    "ui": 4,
    "claude_review": 1
  },
  "phase_counts": {
    "RP24.P06": 10
  },
  "micro_phase_row_counts": {
    "RP24.P06.M05": 10
  },
  "micro_title_row_counts": {
    "Permission And Audit Binding": 10
  },
  "required_section_rows": {
    "RP24.P06.M05": [
      "AI retrieval decision binding",
      "Audit hint fields",
      "Matched rule capture",
      "Deny-over-allow check",
      "Legal hold interaction",
      "Ethical wall interaction",
      "Object ACL interaction",
      "Review-required route",
      "Approval-required route",
      "Security trimming proof"
    ]
  },
  "required_section_micro_titles": {
    "RP24.P06.M05": "Permission And Audit Binding"
  },
  "required_no_leak_guards": [
    "descriptor_only",
    "no_real_client_or_matter_data",
    "no_external_credentials",
    "no_hwpx_runtime_parse",
    "no_court_filing_runtime",
    "no_korean_clause_final_authority",
    "no_litigation_deadline_runtime_calculation",
    "no_corporate_document_runtime_assembly",
    "no_product_state_write",
    "claude_read_only_non_final"
  ],
  "allowed_claude_tools": [
    "Read",
    "Grep",
    "Glob"
  ],
  "forbidden_review_evidence": [
    "not_logged_in",
    "malformed_json",
    "usage_limit",
    "tool_call_shaped_output",
    "zero_byte_stdout",
    "fenced_json_with_prose"
  ],
  "required_public_exports": [
    "KOREAN_LEGAL_CP743_PACK_BINDING",
    "KOREAN_LEGAL_CP743_REQUIREMENTS",
    "createKoreanLegalCp743P06PermissionAuditBindingCaseSet",
    "createKoreanLegalCp743P06PermissionAuditBindingDescriptor",
    "validateKoreanLegalCp743P06PermissionAuditBindingCoverage",
    "validateKoreanLegalCp743P06PermissionAuditBindingDescriptor"
  ]
});

export const KOREAN_LEGAL_CP744_REQUIREMENTS = deepFreeze({
  "deliverable_counts": {
    "security_audit": 3,
    "test": 4,
    "implementation": 3
  },
  "phase_counts": {
    "RP24.P06": 10
  },
  "micro_phase_row_counts": {
    "RP24.P06.M05": 6,
    "RP24.P06.M06": 4
  },
  "micro_title_row_counts": {
    "Permission And Audit Binding": 6,
    "Synthetic Fixture Set": 4
  },
  "required_section_rows": {
    "RP24.P06.M05": [
      "Audit event expectation",
      "Permission fixture",
      "Allowed test",
      "Denied test",
      "Cross-tenant test",
      "Leak prevention test"
    ],
    "RP24.P06.M06": [
      "Permission matrix row",
      "View decision binding",
      "Search decision binding",
      "Mutation decision binding"
    ]
  },
  "required_section_micro_titles": {
    "RP24.P06.M05": "Permission And Audit Binding",
    "RP24.P06.M06": "Synthetic Fixture Set"
  },
  "required_no_leak_guards": [
    "descriptor_only",
    "no_real_client_or_matter_data",
    "no_external_credentials",
    "no_hwpx_runtime_parse",
    "no_court_filing_runtime",
    "no_korean_clause_final_authority",
    "no_litigation_deadline_runtime_calculation",
    "no_corporate_document_runtime_assembly",
    "no_product_state_write",
    "claude_read_only_non_final"
  ],
  "allowed_claude_tools": [
    "Read",
    "Grep",
    "Glob"
  ],
  "forbidden_review_evidence": [
    "not_logged_in",
    "malformed_json",
    "usage_limit",
    "tool_call_shaped_output",
    "zero_byte_stdout",
    "fenced_json_with_prose"
  ],
  "required_public_exports": [
    "KOREAN_LEGAL_CP744_PACK_BINDING",
    "KOREAN_LEGAL_CP744_REQUIREMENTS",
    "createKoreanLegalCp744P06PermissionFixtureBridgeCaseSet",
    "createKoreanLegalCp744P06PermissionFixtureBridgeDescriptor",
    "validateKoreanLegalCp744P06PermissionFixtureBridgeCoverage",
    "validateKoreanLegalCp744P06PermissionFixtureBridgeDescriptor"
  ]
});

const KOREAN_LEGAL_CP745_PERMISSION_DECISION_ROWS = deepFreeze([
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
  "Cross-tenant test",
  "Leak prevention test"
]);

const KOREAN_LEGAL_CP745_FAILURE_ROWS = deepFreeze([
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
  "Hermes failure evidence"
]);

const KOREAN_LEGAL_CP747_FAILURE_WORKFLOW_ROWS = deepFreeze([
  ...KOREAN_LEGAL_CP745_FAILURE_ROWS,
  "Claude edge-case prompt",
  "Human escalation note"
]);

const KOREAN_LEGAL_CP749_EVIDENCE_CONTRACT_ROWS = deepFreeze([
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
  "Next gate readiness"
]);

const KOREAN_LEGAL_CP750_EVIDENCE_WORKFLOW_ROWS = deepFreeze([
  ...KOREAN_LEGAL_CP749_EVIDENCE_CONTRACT_ROWS,
  "Documentation update",
  "Operator summary"
]);

const KOREAN_LEGAL_CP752_REVIEW_QUESTION_ROWS = deepFreeze([
  "Architecture review questions",
  "Security review questions",
  "Permission bypass questions",
  "Audit completeness questions",
  "Missing test questions",
  "UI leak questions",
  "Downstream readiness questions",
  "Risk register",
  "Severity taxonomy",
  "Go/no-go verdict format"
]);

const KOREAN_LEGAL_CP752_REVIEW_CLOSEOUT_ROWS = deepFreeze([
  ...KOREAN_LEGAL_CP752_REVIEW_QUESTION_ROWS,
  "Finding routing map",
  "Human approval summary",
  "Claude review packet",
  "Closeout criteria",
  "PASS closeout note",
  "PASS_WITH_FINDINGS closeout note",
  "BLOCK closeout note",
  "Next RP dependency",
  "Documentation update",
  "Command rerun"
]);

const KOREAN_LEGAL_CP752_REVIEW_RUNTIME_ROWS = deepFreeze([
  ...KOREAN_LEGAL_CP752_REVIEW_CLOSEOUT_ROWS,
  "Review receipt placeholder",
  "Future correction slot"
]);

export const KOREAN_LEGAL_CP745_REQUIREMENTS = deepFreeze({
  "deliverable_counts": {
    "implementation": 39,
    "security_audit": 28,
    "ui": 20,
    "claude_review": 5,
    "test": 22,
    "failure_recovery": 30,
    "hermes_evidence": 4,
    "fixture": 2
  },
  "phase_counts": {
    "RP24.P06": 104,
    "RP24.P07": 46
  },
  "micro_phase_row_counts": {
    "RP24.P06.M06": 18,
    "RP24.P06.M07": 22,
    "RP24.P06.M08": 22,
    "RP24.P06.M09": 22,
    "RP24.P06.M10": 20,
    "RP24.P07.M00": 20,
    "RP24.P07.M01": 20,
    "RP24.P07.M02": 6
  },
  "micro_title_row_counts": {
    "Synthetic Fixture Set": 18,
    "Test And Golden Case Set": 22,
    "Hermes Evidence Packet": 22,
    "Claude Review Packet": 22,
    "Closeout And Next Handoff": 20,
    "Scope Inventory": 20,
    "Contract Draft": 20,
    "Type And Shape Definition": 6
  },
  "required_section_rows": {
    "RP24.P06.M06": KOREAN_LEGAL_CP745_PERMISSION_DECISION_ROWS.slice(4),
    "RP24.P06.M07": KOREAN_LEGAL_CP745_PERMISSION_DECISION_ROWS,
    "RP24.P06.M08": KOREAN_LEGAL_CP745_PERMISSION_DECISION_ROWS,
    "RP24.P06.M09": KOREAN_LEGAL_CP745_PERMISSION_DECISION_ROWS,
    "RP24.P06.M10": KOREAN_LEGAL_CP745_PERMISSION_DECISION_ROWS.slice(0, 20),
    "RP24.P07.M00": KOREAN_LEGAL_CP745_FAILURE_ROWS,
    "RP24.P07.M01": KOREAN_LEGAL_CP745_FAILURE_ROWS,
    "RP24.P07.M02": KOREAN_LEGAL_CP745_FAILURE_ROWS.slice(0, 6)
  },
  "required_section_micro_titles": {
    "RP24.P06.M06": "Synthetic Fixture Set",
    "RP24.P06.M07": "Test And Golden Case Set",
    "RP24.P06.M08": "Hermes Evidence Packet",
    "RP24.P06.M09": "Claude Review Packet",
    "RP24.P06.M10": "Closeout And Next Handoff",
    "RP24.P07.M00": "Scope Inventory",
    "RP24.P07.M01": "Contract Draft",
    "RP24.P07.M02": "Type And Shape Definition"
  },
  "required_no_leak_guards": [
    "descriptor_only",
    "no_real_client_or_matter_data",
    "no_external_credentials",
    "no_hwpx_runtime_parse",
    "no_court_filing_runtime",
    "no_korean_clause_final_authority",
    "no_litigation_deadline_runtime_calculation",
    "no_corporate_document_runtime_assembly",
    "no_product_state_write",
    "claude_read_only_non_final"
  ],
  "allowed_claude_tools": [
    "Read",
    "Grep",
    "Glob"
  ],
  "forbidden_review_evidence": [
    "not_logged_in",
    "malformed_json",
    "usage_limit",
    "tool_call_shaped_output",
    "zero_byte_stdout",
    "fenced_json_with_prose"
  ],
  "required_public_exports": [
    "KOREAN_LEGAL_CP745_PACK_BINDING",
    "KOREAN_LEGAL_CP745_REQUIREMENTS",
    "createKoreanLegalCp745P06P07FixtureFailureBridgeCaseSet",
    "createKoreanLegalCp745P06P07FixtureFailureBridgeDescriptor",
    "validateKoreanLegalCp745P06P07FixtureFailureBridgeCoverage",
    "validateKoreanLegalCp745P06P07FixtureFailureBridgeDescriptor"
  ]
});

export const KOREAN_LEGAL_CP746_REQUIREMENTS = deepFreeze({
  "deliverable_counts": {
    "failure_recovery": 6,
    "security_audit": 1,
    "implementation": 1,
    "hermes_evidence": 1,
    "fixture": 1
  },
  "phase_counts": {
    "RP24.P07": 10
  },
  "micro_phase_row_counts": {
    "RP24.P07.M02": 10
  },
  "micro_title_row_counts": {
    "Type And Shape Definition": 10
  },
  "required_section_rows": {
    "RP24.P07.M02": KOREAN_LEGAL_CP745_FAILURE_ROWS.slice(6, 16)
  },
  "required_section_micro_titles": {
    "RP24.P07.M02": "Type And Shape Definition"
  },
  "required_no_leak_guards": [
    "descriptor_only",
    "no_real_client_or_matter_data",
    "no_external_credentials",
    "no_hwpx_runtime_parse",
    "no_court_filing_runtime",
    "no_korean_clause_final_authority",
    "no_litigation_deadline_runtime_calculation",
    "no_corporate_document_runtime_assembly",
    "no_product_state_write",
    "claude_read_only_non_final"
  ],
  "allowed_claude_tools": [
    "Read",
    "Grep",
    "Glob"
  ],
  "forbidden_review_evidence": [
    "not_logged_in",
    "malformed_json",
    "usage_limit",
    "tool_call_shaped_output",
    "zero_byte_stdout",
    "fenced_json_with_prose"
  ],
  "required_public_exports": [
    "KOREAN_LEGAL_CP746_PACK_BINDING",
    "KOREAN_LEGAL_CP746_REQUIREMENTS",
    "createKoreanLegalCp746P07FailureTypeSliceCaseSet",
    "createKoreanLegalCp746P07FailureTypeSliceDescriptor",
    "validateKoreanLegalCp746P07FailureTypeSliceCoverage",
    "validateKoreanLegalCp746P07FailureTypeSliceDescriptor"
  ]
});

export const KOREAN_LEGAL_CP747_REQUIREMENTS = deepFreeze({
  "deliverable_counts": {
    "test": 4,
    "security_audit": 4,
    "hermes_evidence": 3,
    "claude_review": 2,
    "implementation": 3,
    "failure_recovery": 23,
    "fixture": 1
  },
  "phase_counts": {
    "RP24.P07": 40
  },
  "micro_phase_row_counts": {
    "RP24.P07.M02": 6,
    "RP24.P07.M03": 22,
    "RP24.P07.M04": 12
  },
  "micro_title_row_counts": {
    "Type And Shape Definition": 6,
    "Primary Implementation Slice": 22,
    "Secondary Workflow Slice": 12
  },
  "required_section_rows": {
    "RP24.P07.M02": KOREAN_LEGAL_CP747_FAILURE_WORKFLOW_ROWS.slice(16),
    "RP24.P07.M03": KOREAN_LEGAL_CP747_FAILURE_WORKFLOW_ROWS,
    "RP24.P07.M04": KOREAN_LEGAL_CP747_FAILURE_WORKFLOW_ROWS.slice(0, 12)
  },
  "required_section_micro_titles": {
    "RP24.P07.M02": "Type And Shape Definition",
    "RP24.P07.M03": "Primary Implementation Slice",
    "RP24.P07.M04": "Secondary Workflow Slice"
  },
  "required_no_leak_guards": [
    "descriptor_only",
    "no_real_client_or_matter_data",
    "no_external_credentials",
    "no_hwpx_runtime_parse",
    "no_court_filing_runtime",
    "no_korean_clause_final_authority",
    "no_litigation_deadline_runtime_calculation",
    "no_corporate_document_runtime_assembly",
    "no_product_state_write",
    "claude_read_only_non_final"
  ],
  "allowed_claude_tools": [
    "Read",
    "Grep",
    "Glob"
  ],
  "forbidden_review_evidence": [
    "not_logged_in",
    "malformed_json",
    "usage_limit",
    "tool_call_shaped_output",
    "zero_byte_stdout",
    "fenced_json_with_prose"
  ],
  "required_public_exports": [
    "KOREAN_LEGAL_CP747_PACK_BINDING",
    "KOREAN_LEGAL_CP747_REQUIREMENTS",
    "createKoreanLegalCp747P07FailureWorkflowBridgeCaseSet",
    "createKoreanLegalCp747P07FailureWorkflowBridgeDescriptor",
    "validateKoreanLegalCp747P07FailureWorkflowBridgeCoverage",
    "validateKoreanLegalCp747P07FailureWorkflowBridgeDescriptor"
  ]
});

export const KOREAN_LEGAL_CP748_REQUIREMENTS = deepFreeze({
  "deliverable_counts": {
    "claude_review": 2,
    "failure_recovery": 20,
    "fixture": 2,
    "hermes_evidence": 4,
    "implementation": 4,
    "security_audit": 4,
    "test": 4
  },
  "phase_counts": {
    "RP24.P07": 40
  },
  "micro_phase_row_counts": {
    "RP24.P07.M04": 10,
    "RP24.P07.M05": 22,
    "RP24.P07.M06": 8
  },
  "micro_title_row_counts": {
    "Secondary Workflow Slice": 10,
    "Permission And Audit Binding": 22,
    "Synthetic Fixture Set": 8
  },
  "required_section_rows": {
    "RP24.P07.M04": KOREAN_LEGAL_CP747_FAILURE_WORKFLOW_ROWS.slice(12),
    "RP24.P07.M05": KOREAN_LEGAL_CP747_FAILURE_WORKFLOW_ROWS,
    "RP24.P07.M06": KOREAN_LEGAL_CP747_FAILURE_WORKFLOW_ROWS.slice(0, 8)
  },
  "required_section_micro_titles": {
    "RP24.P07.M04": "Secondary Workflow Slice",
    "RP24.P07.M05": "Permission And Audit Binding",
    "RP24.P07.M06": "Synthetic Fixture Set"
  },
  "required_no_leak_guards": [
    "descriptor_only",
    "no_real_client_or_matter_data",
    "no_external_credentials",
    "no_hwpx_runtime_parse",
    "no_court_filing_runtime",
    "no_korean_clause_final_authority",
    "no_litigation_deadline_runtime_calculation",
    "no_corporate_document_runtime_assembly",
    "no_product_state_write",
    "claude_read_only_non_final"
  ],
  "allowed_claude_tools": [
    "Read",
    "Grep",
    "Glob"
  ],
  "forbidden_review_evidence": [
    "not_logged_in",
    "malformed_json",
    "usage_limit",
    "tool_call_shaped_output",
    "zero_byte_stdout",
    "fenced_json_with_prose"
  ],
  "required_public_exports": [
    "KOREAN_LEGAL_CP748_PACK_BINDING",
    "KOREAN_LEGAL_CP748_REQUIREMENTS",
    "createKoreanLegalCp748P07PermissionFixtureBridgeCaseSet",
    "createKoreanLegalCp748P07PermissionFixtureBridgeDescriptor",
    "validateKoreanLegalCp748P07PermissionFixtureBridgeCoverage",
    "validateKoreanLegalCp748P07PermissionFixtureBridgeDescriptor"
  ]
});

export const KOREAN_LEGAL_CP749_REQUIREMENTS = deepFreeze({
  "deliverable_counts": {
    "claude_review": 7,
    "failure_recovery": 53,
    "fixture": 5,
    "hermes_evidence": 39,
    "implementation": 25,
    "security_audit": 9,
    "test": 12
  },
  "phase_counts": {
    "RP24.P07": 100,
    "RP24.P08": 50
  },
  "micro_phase_row_counts": {
    "RP24.P07.M06": 14,
    "RP24.P07.M07": 22,
    "RP24.P07.M08": 22,
    "RP24.P07.M09": 22,
    "RP24.P07.M10": 20,
    "RP24.P08.M00": 10,
    "RP24.P08.M01": 20,
    "RP24.P08.M02": 20
  },
  "micro_title_row_counts": {
    "Synthetic Fixture Set": 14,
    "Test And Golden Case Set": 22,
    "Hermes Evidence Packet": 22,
    "Claude Review Packet": 22,
    "Closeout And Next Handoff": 20,
    "Scope Inventory": 10,
    "Contract Draft": 20,
    "Type And Shape Definition": 20
  },
  "required_section_rows": {
    "RP24.P07.M06": KOREAN_LEGAL_CP747_FAILURE_WORKFLOW_ROWS.slice(8),
    "RP24.P07.M07": KOREAN_LEGAL_CP747_FAILURE_WORKFLOW_ROWS,
    "RP24.P07.M08": KOREAN_LEGAL_CP747_FAILURE_WORKFLOW_ROWS,
    "RP24.P07.M09": KOREAN_LEGAL_CP747_FAILURE_WORKFLOW_ROWS,
    "RP24.P07.M10": KOREAN_LEGAL_CP747_FAILURE_WORKFLOW_ROWS.slice(0, 20),
    "RP24.P08.M00": KOREAN_LEGAL_CP749_EVIDENCE_CONTRACT_ROWS.slice(0, 10),
    "RP24.P08.M01": KOREAN_LEGAL_CP749_EVIDENCE_CONTRACT_ROWS,
    "RP24.P08.M02": KOREAN_LEGAL_CP749_EVIDENCE_CONTRACT_ROWS
  },
  "required_section_micro_titles": {
    "RP24.P07.M06": "Synthetic Fixture Set",
    "RP24.P07.M07": "Test And Golden Case Set",
    "RP24.P07.M08": "Hermes Evidence Packet",
    "RP24.P07.M09": "Claude Review Packet",
    "RP24.P07.M10": "Closeout And Next Handoff",
    "RP24.P08.M00": "Scope Inventory",
    "RP24.P08.M01": "Contract Draft",
    "RP24.P08.M02": "Type And Shape Definition"
  },
  "required_no_leak_guards": [
    "descriptor_only",
    "no_real_client_or_matter_data",
    "no_external_credentials",
    "no_hwpx_runtime_parse",
    "no_court_filing_runtime",
    "no_korean_clause_final_authority",
    "no_litigation_deadline_runtime_calculation",
    "no_corporate_document_runtime_assembly",
    "no_product_state_write",
    "claude_read_only_non_final"
  ],
  "allowed_claude_tools": [
    "Read",
    "Grep",
    "Glob"
  ],
  "forbidden_review_evidence": [
    "not_logged_in",
    "malformed_json",
    "usage_limit",
    "tool_call_shaped_output",
    "zero_byte_stdout",
    "fenced_json_with_prose"
  ],
  "required_public_exports": [
    "KOREAN_LEGAL_CP749_PACK_BINDING",
    "KOREAN_LEGAL_CP749_REQUIREMENTS",
    "createKoreanLegalCp749P07P08FixtureScopeBridgeCaseSet",
    "createKoreanLegalCp749P07P08FixtureScopeBridgeDescriptor",
    "validateKoreanLegalCp749P07P08FixtureScopeBridgeCoverage",
    "validateKoreanLegalCp749P07P08FixtureScopeBridgeDescriptor"
  ]
});

export const KOREAN_LEGAL_CP750_REQUIREMENTS = deepFreeze({
  "deliverable_counts": {
    "claude_review": 2,
    "hermes_evidence": 20,
    "implementation": 17,
    "test": 1
  },
  "phase_counts": {
    "RP24.P08": 40
  },
  "micro_phase_row_counts": {
    "RP24.P08.M03": 22,
    "RP24.P08.M04": 18
  },
  "micro_title_row_counts": {
    "Primary Implementation Slice": 22,
    "Secondary Workflow Slice": 18
  },
  "required_section_rows": {
    "RP24.P08.M03": KOREAN_LEGAL_CP750_EVIDENCE_WORKFLOW_ROWS,
    "RP24.P08.M04": KOREAN_LEGAL_CP750_EVIDENCE_WORKFLOW_ROWS.slice(0, 18)
  },
  "required_section_micro_titles": {
    "RP24.P08.M03": "Primary Implementation Slice",
    "RP24.P08.M04": "Secondary Workflow Slice"
  },
  "required_no_leak_guards": [
    "descriptor_only",
    "no_real_client_or_matter_data",
    "no_external_credentials",
    "no_hwpx_runtime_parse",
    "no_court_filing_runtime",
    "no_korean_clause_final_authority",
    "no_litigation_deadline_runtime_calculation",
    "no_corporate_document_runtime_assembly",
    "no_product_state_write",
    "claude_read_only_non_final"
  ],
  "allowed_claude_tools": [
    "Read",
    "Grep",
    "Glob"
  ],
  "forbidden_review_evidence": [
    "not_logged_in",
    "malformed_json",
    "usage_limit",
    "tool_call_shaped_output",
    "zero_byte_stdout",
    "fenced_json_with_prose"
  ],
  "required_public_exports": [
    "KOREAN_LEGAL_CP750_PACK_BINDING",
    "KOREAN_LEGAL_CP750_REQUIREMENTS",
    "createKoreanLegalCp750P08EvidenceWorkflowBridgeCaseSet",
    "createKoreanLegalCp750P08EvidenceWorkflowBridgeDescriptor",
    "validateKoreanLegalCp750P08EvidenceWorkflowBridgeCoverage",
    "validateKoreanLegalCp750P08EvidenceWorkflowBridgeDescriptor"
  ]
});

export const KOREAN_LEGAL_CP751_REQUIREMENTS = deepFreeze({
  "deliverable_counts": {
    "claude_review": 2,
    "hermes_evidence": 19,
    "implementation": 17,
    "test": 2
  },
  "phase_counts": {
    "RP24.P08": 40
  },
  "micro_phase_row_counts": {
    "RP24.P08.M04": 4,
    "RP24.P08.M05": 22,
    "RP24.P08.M06": 14
  },
  "micro_title_row_counts": {
    "Secondary Workflow Slice": 4,
    "Permission And Audit Binding": 22,
    "Synthetic Fixture Set": 14
  },
  "required_section_rows": {
    "RP24.P08.M04": KOREAN_LEGAL_CP750_EVIDENCE_WORKFLOW_ROWS.slice(18),
    "RP24.P08.M05": KOREAN_LEGAL_CP750_EVIDENCE_WORKFLOW_ROWS,
    "RP24.P08.M06": KOREAN_LEGAL_CP750_EVIDENCE_WORKFLOW_ROWS.slice(0, 14)
  },
  "required_section_micro_titles": {
    "RP24.P08.M04": "Secondary Workflow Slice",
    "RP24.P08.M05": "Permission And Audit Binding",
    "RP24.P08.M06": "Synthetic Fixture Set"
  },
  "required_no_leak_guards": [
    "descriptor_only",
    "no_real_client_or_matter_data",
    "no_external_credentials",
    "no_hwpx_runtime_parse",
    "no_court_filing_runtime",
    "no_korean_clause_final_authority",
    "no_litigation_deadline_runtime_calculation",
    "no_corporate_document_runtime_assembly",
    "no_product_state_write",
    "claude_read_only_non_final"
  ],
  "allowed_claude_tools": [
    "Read",
    "Grep",
    "Glob"
  ],
  "forbidden_review_evidence": [
    "not_logged_in",
    "malformed_json",
    "usage_limit",
    "tool_call_shaped_output",
    "zero_byte_stdout",
    "fenced_json_with_prose"
  ],
  "required_public_exports": [
    "KOREAN_LEGAL_CP751_PACK_BINDING",
    "KOREAN_LEGAL_CP751_REQUIREMENTS",
    "createKoreanLegalCp751P08PermissionFixtureBridgeCaseSet",
    "createKoreanLegalCp751P08PermissionFixtureBridgeDescriptor",
    "validateKoreanLegalCp751P08PermissionFixtureBridgeCoverage",
    "validateKoreanLegalCp751P08PermissionFixtureBridgeDescriptor"
  ]
});

export const KOREAN_LEGAL_CP752_REQUIREMENTS = deepFreeze({
  "deliverable_counts": {
    "claude_review": 16,
    "hermes_evidence": 41,
    "implementation": 71,
    "security_audit": 10,
    "test": 8,
    "ui": 4
  },
  "phase_counts": {
    "RP24.P08": 84,
    "RP24.P09": 66
  },
  "micro_phase_row_counts": {
    "RP24.P08.M06": 8,
    "RP24.P08.M07": 22,
    "RP24.P08.M08": 22,
    "RP24.P08.M09": 22,
    "RP24.P08.M10": 10,
    "RP24.P09.M00": 10,
    "RP24.P09.M01": 10,
    "RP24.P09.M02": 20,
    "RP24.P09.M03": 22,
    "RP24.P09.M04": 4
  },
  "micro_title_row_counts": {
    "Synthetic Fixture Set": 8,
    "Test And Golden Case Set": 22,
    "Hermes Evidence Packet": 22,
    "Claude Review Packet": 22,
    "Closeout And Next Handoff": 10,
    "Scope Inventory": 10,
    "Contract Draft": 10,
    "Type And Shape Definition": 20,
    "Primary Implementation Slice": 22,
    "Secondary Workflow Slice": 4
  },
  "required_section_rows": {
    "RP24.P08.M06": KOREAN_LEGAL_CP750_EVIDENCE_WORKFLOW_ROWS.slice(14),
    "RP24.P08.M07": KOREAN_LEGAL_CP750_EVIDENCE_WORKFLOW_ROWS,
    "RP24.P08.M08": KOREAN_LEGAL_CP750_EVIDENCE_WORKFLOW_ROWS,
    "RP24.P08.M09": KOREAN_LEGAL_CP750_EVIDENCE_WORKFLOW_ROWS,
    "RP24.P08.M10": KOREAN_LEGAL_CP750_EVIDENCE_WORKFLOW_ROWS.slice(0, 10),
    "RP24.P09.M00": KOREAN_LEGAL_CP752_REVIEW_QUESTION_ROWS,
    "RP24.P09.M01": KOREAN_LEGAL_CP752_REVIEW_QUESTION_ROWS,
    "RP24.P09.M02": KOREAN_LEGAL_CP752_REVIEW_CLOSEOUT_ROWS,
    "RP24.P09.M03": KOREAN_LEGAL_CP752_REVIEW_RUNTIME_ROWS,
    "RP24.P09.M04": KOREAN_LEGAL_CP752_REVIEW_QUESTION_ROWS.slice(0, 4)
  },
  "required_section_micro_titles": {
    "RP24.P08.M06": "Synthetic Fixture Set",
    "RP24.P08.M07": "Test And Golden Case Set",
    "RP24.P08.M08": "Hermes Evidence Packet",
    "RP24.P08.M09": "Claude Review Packet",
    "RP24.P08.M10": "Closeout And Next Handoff",
    "RP24.P09.M00": "Scope Inventory",
    "RP24.P09.M01": "Contract Draft",
    "RP24.P09.M02": "Type And Shape Definition",
    "RP24.P09.M03": "Primary Implementation Slice",
    "RP24.P09.M04": "Secondary Workflow Slice"
  },
  "required_no_leak_guards": [
    "descriptor_only",
    "no_real_client_or_matter_data",
    "no_external_credentials",
    "no_hwpx_runtime_parse",
    "no_court_filing_runtime",
    "no_korean_clause_final_authority",
    "no_litigation_deadline_runtime_calculation",
    "no_corporate_document_runtime_assembly",
    "no_product_state_write",
    "claude_read_only_non_final"
  ],
  "allowed_claude_tools": [
    "Read",
    "Grep",
    "Glob"
  ],
  "forbidden_review_evidence": [
    "not_logged_in",
    "malformed_json",
    "usage_limit",
    "tool_call_shaped_output",
    "zero_byte_stdout",
    "fenced_json_with_prose"
  ],
  "required_public_exports": [
    "KOREAN_LEGAL_CP752_PACK_BINDING",
    "KOREAN_LEGAL_CP752_REQUIREMENTS",
    "createKoreanLegalCp752P08P09EvidenceReviewBridgeCaseSet",
    "createKoreanLegalCp752P08P09EvidenceReviewBridgeDescriptor",
    "validateKoreanLegalCp752P08P09EvidenceReviewBridgeCoverage",
    "validateKoreanLegalCp752P08P09EvidenceReviewBridgeDescriptor"
  ]
});

export const KOREAN_LEGAL_CP753_REQUIREMENTS = deepFreeze({
  "deliverable_counts": {
    "test": 2,
    "ui": 2,
    "implementation": 27,
    "claude_review": 6,
    "security_audit": 2,
    "hermes_evidence": 1
  },
  "phase_counts": {
    "RP24.P09": 40
  },
  "micro_phase_row_counts": {
    "RP24.P09.M04": 16,
    "RP24.P09.M05": 22,
    "RP24.P09.M06": 2
  },
  "micro_title_row_counts": {
    "Secondary Workflow Slice": 16,
    "Permission And Audit Binding": 22,
    "Synthetic Fixture Set": 2
  },
  "required_section_rows": {
    "RP24.P09.M04": KOREAN_LEGAL_CP752_REVIEW_CLOSEOUT_ROWS.slice(4),
    "RP24.P09.M05": KOREAN_LEGAL_CP752_REVIEW_RUNTIME_ROWS,
    "RP24.P09.M06": KOREAN_LEGAL_CP752_REVIEW_QUESTION_ROWS.slice(0, 2)
  },
  "required_section_micro_titles": {
    "RP24.P09.M04": "Secondary Workflow Slice",
    "RP24.P09.M05": "Permission And Audit Binding",
    "RP24.P09.M06": "Synthetic Fixture Set"
  },
  "required_no_leak_guards": [
    "descriptor_only",
    "no_real_client_or_matter_data",
    "no_external_credentials",
    "no_hwpx_runtime_parse",
    "no_court_filing_runtime",
    "no_korean_clause_final_authority",
    "no_litigation_deadline_runtime_calculation",
    "no_corporate_document_runtime_assembly",
    "no_product_state_write",
    "claude_read_only_non_final"
  ],
  "allowed_claude_tools": [
    "Read",
    "Grep",
    "Glob"
  ],
  "forbidden_review_evidence": [
    "not_logged_in",
    "malformed_json",
    "usage_limit",
    "tool_call_shaped_output",
    "zero_byte_stdout",
    "fenced_json_with_prose"
  ],
  "required_public_exports": [
    "KOREAN_LEGAL_CP753_PACK_BINDING",
    "KOREAN_LEGAL_CP753_REQUIREMENTS",
    "createKoreanLegalCp753P09ReviewFixtureBridgeCaseSet",
    "createKoreanLegalCp753P09ReviewFixtureBridgeDescriptor",
    "validateKoreanLegalCp753P09ReviewFixtureBridgeCoverage",
    "validateKoreanLegalCp753P09ReviewFixtureBridgeDescriptor"
  ]
});

export const KOREAN_LEGAL_CP754_REQUIREMENTS = deepFreeze({
  "deliverable_counts": {
    "security_audit": 2,
    "test": 1,
    "ui": 1,
    "implementation": 6
  },
  "phase_counts": {
    "RP24.P09": 10
  },
  "micro_phase_row_counts": {
    "RP24.P09.M06": 10
  },
  "micro_title_row_counts": {
    "Synthetic Fixture Set": 10
  },
  "required_section_rows": {
    "RP24.P09.M06": KOREAN_LEGAL_CP752_REVIEW_CLOSEOUT_ROWS.slice(2, 12)
  },
  "required_section_micro_titles": {
    "RP24.P09.M06": "Synthetic Fixture Set"
  },
  "required_no_leak_guards": [
    "descriptor_only",
    "no_real_client_or_matter_data",
    "no_external_credentials",
    "no_hwpx_runtime_parse",
    "no_court_filing_runtime",
    "no_korean_clause_final_authority",
    "no_litigation_deadline_runtime_calculation",
    "no_corporate_document_runtime_assembly",
    "no_product_state_write",
    "claude_read_only_non_final"
  ],
  "allowed_claude_tools": [
    "Read",
    "Grep",
    "Glob"
  ],
  "forbidden_review_evidence": [
    "not_logged_in",
    "malformed_json",
    "usage_limit",
    "tool_call_shaped_output",
    "zero_byte_stdout",
    "fenced_json_with_prose"
  ],
  "required_public_exports": [
    "KOREAN_LEGAL_CP754_PACK_BINDING",
    "KOREAN_LEGAL_CP754_REQUIREMENTS",
    "createKoreanLegalCp754P09FixtureReviewSliceCaseSet",
    "createKoreanLegalCp754P09FixtureReviewSliceDescriptor",
    "validateKoreanLegalCp754P09FixtureReviewSliceCoverage",
    "validateKoreanLegalCp754P09FixtureReviewSliceDescriptor"
  ]
});

export const KOREAN_LEGAL_CP755_REQUIREMENTS = deepFreeze({
  "deliverable_counts": {
    "claude_review": 12,
    "implementation": 51,
    "security_audit": 8,
    "test": 4,
    "ui": 4,
    "hermes_evidence": 1
  },
  "phase_counts": {
    "RP24.P09": 80
  },
  "micro_phase_row_counts": {
    "RP24.P09.M06": 8,
    "RP24.P09.M07": 22,
    "RP24.P09.M08": 20,
    "RP24.P09.M09": 20,
    "RP24.P09.M10": 10
  },
  "micro_title_row_counts": {
    "Synthetic Fixture Set": 8,
    "Test And Golden Case Set": 22,
    "Hermes Evidence Packet": 20,
    "Claude Review Packet": 20,
    "Closeout And Next Handoff": 10
  },
  "required_section_rows": {
    "RP24.P09.M06": KOREAN_LEGAL_CP752_REVIEW_CLOSEOUT_ROWS.slice(12),
    "RP24.P09.M07": KOREAN_LEGAL_CP752_REVIEW_RUNTIME_ROWS,
    "RP24.P09.M08": KOREAN_LEGAL_CP752_REVIEW_CLOSEOUT_ROWS,
    "RP24.P09.M09": KOREAN_LEGAL_CP752_REVIEW_CLOSEOUT_ROWS,
    "RP24.P09.M10": KOREAN_LEGAL_CP752_REVIEW_QUESTION_ROWS
  },
  "required_section_micro_titles": {
    "RP24.P09.M06": "Synthetic Fixture Set",
    "RP24.P09.M07": "Test And Golden Case Set",
    "RP24.P09.M08": "Hermes Evidence Packet",
    "RP24.P09.M09": "Claude Review Packet",
    "RP24.P09.M10": "Closeout And Next Handoff"
  },
  "required_no_leak_guards": [
    "descriptor_only",
    "no_real_client_or_matter_data",
    "no_external_credentials",
    "no_hwpx_runtime_parse",
    "no_court_filing_runtime",
    "no_korean_clause_final_authority",
    "no_litigation_deadline_runtime_calculation",
    "no_corporate_document_runtime_assembly",
    "no_product_state_write",
    "claude_read_only_non_final"
  ],
  "allowed_claude_tools": [
    "Read",
    "Grep",
    "Glob"
  ],
  "forbidden_review_evidence": [
    "not_logged_in",
    "malformed_json",
    "usage_limit",
    "tool_call_shaped_output",
    "zero_byte_stdout",
    "fenced_json_with_prose"
  ],
  "required_public_exports": [
    "KOREAN_LEGAL_CP755_PACK_BINDING",
    "KOREAN_LEGAL_CP755_REQUIREMENTS",
    "createKoreanLegalCp755P09CloseoutHandoffBridgeCaseSet",
    "createKoreanLegalCp755P09CloseoutHandoffBridgeDescriptor",
    "validateKoreanLegalCp755P09CloseoutHandoffBridgeCoverage",
    "validateKoreanLegalCp755P09CloseoutHandoffBridgeDescriptor"
  ]
});

export const KOREAN_LEGAL_PROGRAM_CONTRACT = deepFreeze({
  program_id: "RP24",
  program_title: "Korean Legal Depth",
  program_scope: "HWPX, Korean clauses, litigation, corporate documents",
  package_name: "korean-legal",
  contract_ref: "contracts/korean-legal-depth-contract.json",
  upstream_program_id: "RP23",
  upstream_scope: "External Integrations II - bank, card, WEHAGO, Douzone, tax export, DART",
  downstream_program_id: "RP25",
  hermes_gate: "H24",
  claude_gate: "C24",
  entities: ["HWPXDocument", "KoreanClause", "LitigationCase", "CorporateFiling", "CourtDeadline", "KoreanTemplate"],
  workflows: ["HWPX import", "Korean clause search", "litigation deadline tracking", "corporate document assembly", "court filing prep"],
  ui_surfaces: ["HWPX preview", "Korean clause library", "litigation timeline", "corporate document wizard"],
  golden_cases: ["HWPX parsed", "clause matched", "court deadline calculated", "corporate template assembled"],
  risks: ["HWPX parse loss", "wrong legal deadline", "Korean clause hallucination", "filing template drift"]
});
