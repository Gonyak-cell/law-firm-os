# LCX8-ACTION-0280 People Guard State Remediation

Generated at: 2026-06-25T15:17:31.586Z

Overall result: PASS

| Check | URL | Result | Detail |
| --- | --- | --- | --- |
| people-directory-denied | `/?locale=ko&view=people&data=live&ctx=denied#people-directory` | PASS | {"guard_count":1,"state_text":"접근 권한이 없습니다 권한이 있는 People 정보만 표시합니다.","legal_rows":0,"forbidden_tokens_in_dom":[],"legal_people_api_statuses":[],"legal_people_api_response_count":0,"api_payload_leak_detected":false} |
| people-directory-review | `/?locale=ko&view=people&data=live&ctx=review#people-directory` | PASS | {"guard_count":1,"state_text":"검토가 필요합니다 검토가 끝나면 People 정보를 확인할 수 있습니다.","legal_rows":0,"forbidden_tokens_in_dom":[],"legal_people_api_statuses":[],"legal_people_api_response_count":0,"api_payload_leak_detected":false} |
| people-members-denied | `/?locale=ko&view=people&data=live&ctx=denied#people-members` | PASS | {"guard_count":1,"state_text":"접근 권한이 없습니다 권한이 있는 People 정보만 표시합니다.","legal_rows":0,"forbidden_tokens_in_dom":[],"legal_people_api_statuses":[],"legal_people_api_response_count":0,"api_payload_leak_detected":false} |

Console errors recorded for review: None
