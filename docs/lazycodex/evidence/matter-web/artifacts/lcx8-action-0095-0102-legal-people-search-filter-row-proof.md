# LCX8-ACTION-0095..0102 Legal People Search/Filter/Row Proof

Generated: 2026-06-27T00:52:47.261Z
Status: PASS
Selected person id: person_arbitrator_001

## Targets

- LCX8-ACTION-0095
- LCX8-ACTION-0096
- LCX8-ACTION-0097
- LCX8-ACTION-0098
- LCX8-ACTION-0099
- LCX8-ACTION-0100
- LCX8-ACTION-0101
- LCX8-ACTION-0102

## Assertions

- search input triggered query API read: PASS
- search responses had HRX runtime headers and no API errors: PASS
- all type tabs triggered expected type_id API reads: PASS
- row selection triggered detail relationship ethics reads: PASS
- row selection selected concrete person id: PASS
- row responses had HRX runtime headers and no API errors: PASS
- no console errors during proof: PASS
- direct allow API probes return success: PASS
- direct denied API probes fail closed without counts: PASS
- direct review API probes fail closed without counts: PASS

## Type Tabs

- LCX8-ACTION-0097: expected=internal_lawyer; observed=internal_lawyer; PASS
- LCX8-ACTION-0098: expected=client_contact; observed=client_contact; PASS
- LCX8-ACTION-0099: expected=opposing_counsel; observed=opposing_counsel; PASS
- LCX8-ACTION-0100: expected=expert_witness; observed=expert_witness; PASS
- LCX8-ACTION-0101: expected=regulator_contact; observed=regulator_contact; PASS
- LCX8-ACTION-0096: expected=; observed=; PASS

## Direct API Probes

- allow /api/hrx/legal-people/search?query=arbitrator: status=200; ui_state=none; outcome=ok; count_leak_prevented=n/a
- denied /api/hrx/legal-people/search?query=arbitrator: status=403; ui_state=denied; outcome=denied; count_leak_prevented=true
- review /api/hrx/legal-people/search?query=arbitrator: status=200; ui_state=review_required; outcome=review_required; count_leak_prevented=true
- allow /api/hrx/legal-people/search?type_id=internal_lawyer: status=200; ui_state=none; outcome=ok; count_leak_prevented=n/a
- denied /api/hrx/legal-people/search?type_id=internal_lawyer: status=403; ui_state=denied; outcome=denied; count_leak_prevented=true
- review /api/hrx/legal-people/search?type_id=internal_lawyer: status=200; ui_state=review_required; outcome=review_required; count_leak_prevented=true
- allow /api/hrx/legal-people/search?type_id=client_contact: status=200; ui_state=none; outcome=ok; count_leak_prevented=n/a
- denied /api/hrx/legal-people/search?type_id=client_contact: status=403; ui_state=denied; outcome=denied; count_leak_prevented=true
- review /api/hrx/legal-people/search?type_id=client_contact: status=200; ui_state=review_required; outcome=review_required; count_leak_prevented=true
- allow /api/hrx/legal-people/search?type_id=opposing_counsel: status=200; ui_state=none; outcome=ok; count_leak_prevented=n/a
- denied /api/hrx/legal-people/search?type_id=opposing_counsel: status=403; ui_state=denied; outcome=denied; count_leak_prevented=true
- review /api/hrx/legal-people/search?type_id=opposing_counsel: status=200; ui_state=review_required; outcome=review_required; count_leak_prevented=true
- allow /api/hrx/legal-people/search?type_id=expert_witness: status=200; ui_state=none; outcome=ok; count_leak_prevented=n/a
- denied /api/hrx/legal-people/search?type_id=expert_witness: status=403; ui_state=denied; outcome=denied; count_leak_prevented=true
- review /api/hrx/legal-people/search?type_id=expert_witness: status=200; ui_state=review_required; outcome=review_required; count_leak_prevented=true
- allow /api/hrx/legal-people/search?type_id=regulator_contact: status=200; ui_state=none; outcome=ok; count_leak_prevented=n/a
- denied /api/hrx/legal-people/search?type_id=regulator_contact: status=403; ui_state=denied; outcome=denied; count_leak_prevented=true
- review /api/hrx/legal-people/search?type_id=regulator_contact: status=200; ui_state=review_required; outcome=review_required; count_leak_prevented=true
- allow /api/hrx/legal-people/person_arbitrator_001: status=200; ui_state=none; outcome=ok; count_leak_prevented=n/a
- denied /api/hrx/legal-people/person_arbitrator_001: status=403; ui_state=denied; outcome=denied; count_leak_prevented=true
- review /api/hrx/legal-people/person_arbitrator_001: status=200; ui_state=review_required; outcome=review_required; count_leak_prevented=true
- allow /api/hrx/legal-people/relationships?person_id=person_arbitrator_001: status=200; ui_state=none; outcome=ok; count_leak_prevented=n/a
- denied /api/hrx/legal-people/relationships?person_id=person_arbitrator_001: status=403; ui_state=denied; outcome=denied; count_leak_prevented=true
- review /api/hrx/legal-people/relationships?person_id=person_arbitrator_001: status=200; ui_state=review_required; outcome=review_required; count_leak_prevented=true
- allow /api/hrx/legal-people/ethics?person_id=person_arbitrator_001: status=200; ui_state=none; outcome=ok; count_leak_prevented=n/a
- denied /api/hrx/legal-people/ethics?person_id=person_arbitrator_001: status=403; ui_state=denied; outcome=denied; count_leak_prevented=true
- review /api/hrx/legal-people/ethics?person_id=person_arbitrator_001: status=200; ui_state=review_required; outcome=review_required; count_leak_prevented=true