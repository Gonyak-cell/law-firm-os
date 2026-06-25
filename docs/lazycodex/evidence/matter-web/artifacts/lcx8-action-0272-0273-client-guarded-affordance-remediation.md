# LCX8-ACTION-0272/0273 Client Guarded Affordance Remediation

Generated at: 2026-06-25T15:24:56.858Z

Overall result: PASS

| Check | URL | Result | Detail |
| --- | --- | --- | --- |
| client-denied | `/?locale=ko&view=clients&data=live&ctx=denied#clients-list` | PASS | {"state_text":"접근 권한이 없습니다 권한이 있는 Client만 표시합니다.","record_action_panel_count":0,"record_action_strip_count":0,"client_mutation_button_count":0,"enabled_mutation_button_count":0,"record_action_fetch_count":0,"protected_token_hits":[],"api_5xx_count":0,"network_response_count":9} |
| client-review | `/?locale=ko&view=clients&data=live&ctx=review#clients-list` | PASS | {"state_text":"검토가 필요합니다 검토가 끝나면 Client 정보를 확인할 수 있습니다.","record_action_panel_count":0,"record_action_strip_count":0,"client_mutation_button_count":0,"enabled_mutation_button_count":0,"record_action_fetch_count":0,"protected_token_hits":[],"api_5xx_count":0,"network_response_count":9} |

Console errors recorded for review: client-denied:Failed to load resource: the server responded with a status of 403 (Forbidden); client-denied:Failed to load resource: the server responded with a status of 403 (Forbidden); client-denied:Failed to load resource: the server responded with a status of 403 (Forbidden); client-denied:Failed to load resource: the server responded with a status of 403 (Forbidden); client-denied:Failed to load resource: the server responded with a status of 403 (Forbidden); client-denied:Failed to load resource: the server responded with a status of 403 (Forbidden); client-denied:Failed to load resource: the server responded with a status of 403 (Forbidden); client-denied:Failed to load resource: the server responded with a status of 403 (Forbidden)
