# LCX8-ACTION-0065 Matter document facade proof

- Status: PASS
- Fixture: matter_lcx8_0065_document_1782453499980
- Document: doc_matter_lcx8_0065_document_1782453499980_1782453501588
- UI route: /?locale=ko&view=matters&data=live&ctx=allow#matter-vault
- Selector: `[data-matter-document-facade-action="true"]`
- API route: POST /api/matters/:matter_id/documents
- Outcome: UI click returned 201/created, replay returned 200/idempotent_replay, reload showed 1 document.
- UI copy observed: 문서가 Vault에 연결되었습니다.
- Audit: `matter.document_facade.uploaded` found through /api/matters/audit and returned as `matter_audit_event`.
- Guards: denied 403/blocked, review 200/review_required, invalid 400/blocked; document count stayed 1.
- Screenshot: docs/lazycodex/evidence/matter-web/artifacts/lcx8-action-screenshots/lcx8-action-0065-matter-document-facade-proof.png

## Verification

All proof assertions passed in browser/API runtime collection.
