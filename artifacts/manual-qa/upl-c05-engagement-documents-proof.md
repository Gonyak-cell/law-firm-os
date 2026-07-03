# UPL-C-05 Engagement Documents Proof

- verdict: PASS
- api: http://127.0.0.1:62613
- contract: UPL-C-05

## Checks
- PASS unsigned-engagement-is-blocked
- PASS signed-document-without-upload-is-blocked
- PASS forged-caller-hash-is-blocked-before-approval
- PASS clearance-without-engagement-is-blocked
- PASS engagement-approval-stores-signed-bytes-through-dms
- PASS downloaded-dms-object-hash-matches-signed-pdf
- PASS clearance-reconciles-engagement-document-ledger
- PASS engagement-document-audit-history-present

## Blocked paths
- unsigned_engagement: 400 blocked
- no_upload_engagement: 400 blocked
- forged_hash_engagement: 400 blocked
- no_engagement_clearance: 400 blocked

## DMS readback
- server sha256: a650be843828cad66fb5cf2d5fa8a5b95578f8e7e706f04c605d2a2758db35ab
- downloaded sha256: a650be843828cad66fb5cf2d5fa8a5b95578f8e7e706f04c605d2a2758db35ab
- downloaded byte size: 41
- bytes written to artifact: false
