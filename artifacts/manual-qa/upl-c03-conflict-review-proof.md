# UPL-C-03 Conflict Review Proof

- verdict: PASS
- contract_ref: UPL-C-03

## Checks
- PASS hit-generated-for-review
- PASS premature-clearance-blocked-before-ledger-review
- PASS decision-records-reviewer-and-clears-hit
- PASS waiver-route-records-consent-document
- PASS signed-engagement-enables-clearance
- PASS idempotency-and-audit-history

## Audit History
- conflict.check.create: ConflictCheck:conflict_upl_c03_review
- conflict.hit.create: ConflictHit:hit_search_upl_c03_review_MatterParty_party_upl_c03_adverse_0
- conflict.search.executed: ConflictSearch:search_upl_c03_review
- conflict.decision.record: ConflictDecision:decision_upl_c03_clear
- waiver.approved: Waiver:waiver_upl_c03_consent
- engagement.template.generated: EngagementTemplateDocument:template_doc_upl_c03_engagement
- engagement.signed_document.uploaded: EngagementSignedDocumentUpload:signed_upload_upl_c03_engagement
- engagement.approved: Engagement:engagement_upl_c03_signed
- clearance.token.issue: ClearanceToken:clearance_upl_c03_valid
