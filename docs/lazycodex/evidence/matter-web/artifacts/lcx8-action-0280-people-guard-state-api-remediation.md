# LCX8-ACTION-0280 People Guard State API Remediation

Generated at: 2026-06-25T15:19:08.335Z

Overall result: PASS

| Check | Path | Status | UI State | Result | Detail |
| --- | --- | ---: | --- | --- | --- |
| search-denied | `/api/hrx/legal-people/search?type_id=client_contact` | 403 | denied | PASS | {"count_leak_prevented":true,"fail_closed":true,"leaked_tokens":[]} |
| search-review | `/api/hrx/legal-people/search?type_id=client_contact` | 200 | review_required | PASS | {"count_leak_prevented":true,"fail_closed":false,"leaked_tokens":[]} |
| detail-denied | `/api/hrx/legal-people/person_client_contact_001` | 403 | denied | PASS | {"count_leak_prevented":true,"fail_closed":true,"leaked_tokens":[]} |
| relationships-denied | `/api/hrx/legal-people/relationships?person_id=person_client_contact_001` | 403 | denied | PASS | {"count_leak_prevented":true,"fail_closed":true,"leaked_tokens":[]} |
| ethics-review | `/api/hrx/legal-people/ethics?person_id=person_client_contact_001` | 200 | review_required | PASS | {"count_leak_prevented":true,"fail_closed":false,"leaked_tokens":[]} |
