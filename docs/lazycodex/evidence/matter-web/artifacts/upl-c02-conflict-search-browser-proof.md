# UPL-C-02 Conflict Search Browser Proof

- verdict: PASS
- url: http://127.0.0.1:5202/?locale=ko&view=clients&data=live&ctx=allow#client-conflict
- screenshot: /Users/jws/Documents/Codex/Law Firm OS/docs/lazycodex/evidence/matter-web/artifacts/upl-c02-screenshots/upl-c02-conflict-search-hit-list.png
- api_runtime: startApiServer+seeded-intake-master-matter-repositories

## Checks
- PASS real-api-conflict-check-route-called-from-browser
- PASS client-conflict-surface-visible
- PASS browser-uses-signed-session-without-legacy-permission-context
- PASS conflict-check-write-sent-from-ui
- PASS browser-proof-clean
- PASS no-session-token-rendered

## Observed
- hit_list_text: "Hit\t출처\t심각도\t상태\n상대방 테크 주식회사\t과거 Matter\t높음\t계약 검토"
- writes: 1
- api_request_count: 49
- console_events: 0
- failed_requests: 0
