# UPL-C-05 Engagement Documents Browser Proof

- verdict: PASS
- url: http://127.0.0.1:5205/?locale=ko&view=clients&data=live&ctx=allow#client-conflict
- screenshot: /Users/jws/Documents/Codex/Law Firm OS/docs/lazycodex/evidence/matter-web/artifacts/upl-c05-screenshots/upl-c05-engagement-documents.png
- api_runtime: startApiServer+seeded-intake-master-matter-dms-repositories

## Checks
- PASS ui-drives-engagement-and-clearance-routes
- PASS engagement-payload-includes-template-document
- PASS engagement-payload-includes-lx06-signed-upload
- PASS server-stores-signed-bytes-through-dms
- PASS downloaded-dms-object-hash-matches-signed-pdf
- PASS clearance-uses-approved-engagement-document
- PASS engagement-document-success-rendered
- PASS browser-uses-signed-session-without-legacy-permission-context
- PASS browser-proof-clean
- PASS no-session-token-or-raw-bytes-rendered

## Observed
- writes: conflict_check, decision, waiver, engagement, clearance
- dms_document_id: signed_doc:engagement_ui_mr4qlmhy_mo1inn
- downloaded_sha256: fcd3cf8ecefd324d0ef0772f3a86057241458e797a5d5373712041d3933b96ba
- downloaded_byte_size: 59
- panel_text: "상담·문의 1\nHit 1건\n이해상충 검색 결과가 기록되었습니다.\n이해상충 검토\nWaiver 승인\n승인자 기록 필요\n검토 결정이 기록되었습니다.\nWaiver 승인 기록이 남았습니다.\n검토 결정\nWaiver 승인\n통과\n결정·수임 원장 확인됨\n수임 승인 완료.\n통과 처리되었습니다.\n수임 승인\n통과 처리\nMatter 개설\n통과 기록으로 개설 가능\nMatter 개설\nHit\t출처\t심각도\t상태\n신규 고객 주식회사\t과거 Matter\t높음\tcleared"
- console_events: 0
- failed_requests: 0
