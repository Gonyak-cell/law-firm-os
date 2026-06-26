# LCX8-ACTION-0073 Matter 작업 추가 Proof

- completed_at: 2026-06-26T23:08:17.909Z
- status_before: BLOCKED
- status_after: PASS
- route: /?locale=ko&view=matters&data=live&ctx=allow#matter-timeline
- selector: #matter-timeline button:has-text("작업 추가")
- api_route: POST /api/matters/:matter_id/activities
- screenshot: docs/lazycodex/evidence/matter-web/artifacts/lcx8-action-screenshots/lcx8-action-0073-matter-activity-create-proof.png

## Result

The visible `작업 추가` control executed the current product path and created a persisted Matter task. The UI displayed `활동이 감사 이력과 활동 이력에 기록되었습니다.`.

## Evidence

- fixture matter: M-LCX8-0073-15296663 (matter_lcx8_0073_activity_1782515296663)
- activity: activity_matter_lcx8_0073_activity_1782515296663_1782515297834
- UI create status/outcome: 201 / created
- replay status/outcome: 200 / idempotent_replay
- activity read-back count: 1
- timeline read-back count: 1
- audit action/reason: matter.activity.created / activity_created
- denied guard: 403 / blocked / denied
- review guard: 200 / review_required / review_required
- invalid guard: 400 / blocked / blocked

## Non-Claims

- This is local synthetic runtime proof, not production go-live or owner approval.
