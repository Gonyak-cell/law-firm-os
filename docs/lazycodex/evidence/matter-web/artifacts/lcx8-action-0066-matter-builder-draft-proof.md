# LCX8-ACTION-0066 Matter builder draft proof

- Status: PASS
- Fixture: matter_lcx8_0066_builder_1782454036394
- Draft: builder_draft_matter_lcx8_0066_builder_1782454036394_1782454037973
- UI route: /?locale=ko&view=matters&data=live&ctx=allow#matter-vault
- Selector: `[data-sf-b-w04-builder-draft-action="true"]`
- API routes: POST /api/matters/:matter_id/builder-drafts; GET /api/matters/:matter_id/builder-drafts/:draft_id/preview
- Outcome: UI click returned 201/created, replay returned 200/idempotent_replay, preview returned 200/passed.
- UI copy observed: 문서 초안이 생성되었습니다.
- Audit: `matter.builder.draft.created` found through /api/matters/audit.
- Guards: denied 403/blocked, review 200/review_required, invalid template 400/blocked; denied/review drafts were not previewable.
- Screenshot: docs/lazycodex/evidence/matter-web/artifacts/lcx8-action-screenshots/lcx8-action-0066-matter-builder-draft-proof.png

## Verification

All proof assertions passed in browser/API runtime collection.
