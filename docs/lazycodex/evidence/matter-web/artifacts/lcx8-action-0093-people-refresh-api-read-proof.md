# LCX8-ACTION-0093 People Refresh API Read Proof

Generated: 2026-06-27T00:47:15.432Z
Status: PASS
Selected person id: person_arbitrator_001

## Refresh Coverage

- Observed expected endpoints: /api/hrx/employees, /api/hrx/legal-people/search, /api/hrx/legal-people/:personId, /api/hrx/legal-people/relationships, /api/hrx/legal-people/ethics
- API 4xx: 0
- API 5xx: 0
- HRX runtime headers present: true

## Guard Coverage

- Denied guard: protected_grid_count=0; hrx_request_count=0
- Review guard: protected_grid_count=0; hrx_request_count=0

## Direct API Probes

- allow /api/hrx/employees: status=200; ui_state=none; outcome=ok; count_leak_prevented=n/a
- denied /api/hrx/employees: status=403; ui_state=denied; outcome=denied; count_leak_prevented=true
- review /api/hrx/employees: status=200; ui_state=review_required; outcome=review_required; count_leak_prevented=true
- allow /api/hrx/legal-people/search: status=200; ui_state=none; outcome=ok; count_leak_prevented=n/a
- denied /api/hrx/legal-people/search: status=403; ui_state=denied; outcome=denied; count_leak_prevented=true
- review /api/hrx/legal-people/search: status=200; ui_state=review_required; outcome=review_required; count_leak_prevented=true
- allow /api/hrx/legal-people/person_arbitrator_001: status=200; ui_state=none; outcome=ok; count_leak_prevented=n/a
- denied /api/hrx/legal-people/person_arbitrator_001: status=403; ui_state=denied; outcome=denied; count_leak_prevented=true
- review /api/hrx/legal-people/person_arbitrator_001: status=200; ui_state=review_required; outcome=review_required; count_leak_prevented=true
- allow /api/hrx/legal-people/relationships?person_id=person_arbitrator_001: status=200; ui_state=none; outcome=ok; count_leak_prevented=n/a
- denied /api/hrx/legal-people/relationships?person_id=person_arbitrator_001: status=403; ui_state=denied; outcome=denied; count_leak_prevented=true
- review /api/hrx/legal-people/relationships?person_id=person_arbitrator_001: status=200; ui_state=review_required; outcome=review_required; count_leak_prevented=true
- allow /api/hrx/legal-people/ethics?person_id=person_arbitrator_001: status=200; ui_state=none; outcome=ok; count_leak_prevented=n/a
- denied /api/hrx/legal-people/ethics?person_id=person_arbitrator_001: status=403; ui_state=denied; outcome=denied; count_leak_prevented=true
- review /api/hrx/legal-people/ethics?person_id=person_arbitrator_001: status=200; ui_state=review_required; outcome=review_required; count_leak_prevented=true

## Assertions

- refresh button visible and clicked on People directory: PASS
- all active People directory refresh endpoints observed: PASS
- detail endpoint selected a concrete legal person id: PASS
- refresh responses have HRX runtime headers: PASS
- refresh responses have no API 4xx: PASS
- refresh responses have no API 5xx: PASS
- no console errors during proof: PASS
- denied browser state is guarded and does not render protected grid: PASS
- review browser state is guarded and does not render protected grid: PASS
- direct allow API probes return success: PASS
- direct denied API probes fail closed without counts: PASS
- direct review API probes fail closed without counts: PASS