# CTI Next Goal Objectives - 2026-07-06

Status: updated_after_g0_s0_probe_completion

Source plan: `workbook/canonical-tenant-data-injection-execution-plan-2026-07-06.md`

Completed goal: `cti-g0-s0` / `LT-PRE-W08`

S0 findings:

- I4 approval ref: `I4-CTI-G0-S0-OWNER-RATIFICATION-2026-07-06`
- S0-T01: `matter-lawos-api-prod` uses handler `apps/api/src/lambda.handler`; EFS config count `0`; STORE_PATH env key count `0`
- S0-T04: `tenant_rp05_synthetic` visible matter count `149`; CTI candidate matches `148`; unmatched count `1`
- D-07: unmatched 149th row is classified as runtime seed and should be excluded from CTI migration, not deleted in G0/S0
- S0-T03: synthetic marker was present before cold-start and lost after no-op Lambda environment refresh
- S1 branch: `efs_and_store_path_absent_s1_durable_foundation_required`

## Next Codex Goal After I4

Use this after the current G0/S0 kickoff is closed. This goal must not absorb S2/S3/CUTOVER.

```text
[workbook/canonical-tenant-data-injection-execution-plan-2026-07-06.md] S0-G가 PASS했고 `I4-CTI-G0-S0-OWNER-RATIFICATION-2026-07-06`가 기록된 상태에서 S1 FOUNDATION만 완료한다: S0-T01 결과(EFS=0, STORE_PATH env=0)와 S0-T03 결과(marker_lost_after_cold_start)를 입력으로 삼아 Matter production runtime의 영속 계층을 설계·적용·검증한다. 범위는 S1-T01a/T01b/T02/T03/T04/T05 및 그에 필요한 최소 배포/설정 evidence로 한정하며, STORE_PATH 영속 계층(EFS 또는 문서화된 대안), durable audit store, fixed LAWOS_API_SESSION_SECRET, reseed guard carve-out, backup/restore drill receipt를 PII-safe evidence로 남긴다. 완료 기준은 S1-G 4개 항목(콜드스타트 후 CTI marker 생존, 감사 이벤트 생존, 세션 시크릿 고정 확인, tmpdir 프리플라이트가 감사 스토어 포함 PASS), 복원 리허설 PASS, STORE_PATH_MANIFEST/운영 env evidence 갱신, S0-T04 snapshot과 S1 후 readback hash 일치, `docs/goal-closeout/cti-s1-foundation/` closeout 5종 파일, launch-TUW/CTI crosswalk 검증 PASS가 모두 확인되는 것이다. Out of scope: S2 인증 구현, S3 테넌트 통일/production data migration, S4 사람/권한 주입, desktop v0.1.10, CUTOVER, 계정 비밀번호 발급·배부, S5/S6 enrichment/seal, Entra ID/OIDC, DB 전환, go-live/production_ready claim. Stop condition: I4 signature, S0-G receipts, production credential access, durable store target, durable audit path, rollback/restore path 중 하나라도 없으면 S1 쓰기나 인프라 변경을 시작하지 않고 BLOCKED closeout으로 닫는다.
```

Why this is the next bounded goal:

- S1 is the first real execution tranche after I4 and S0 proved current production runtime is ephemeral.
- It has a clean machine gate, S1-G.
- It does not require user password distribution, migration, or cutover.
- It prevents the risky jump from "storage/auth foundation" straight into tenant movement.

## Goal After S1

Set this only after S1-G passes.

```text
[workbook/canonical-tenant-data-injection-execution-plan-2026-07-06.md] S1-G가 PASS한 상태에서 BUILD-G 전용 코드/클라이언트 준비를 완료한다: 데이터 이동 없이 S2-T01/T02/T04, S2-T06, S3-T01/T05/T06/T07, S4-T04a를 구현하고 staging operational profile에서 로그인 -> verifyToken/session verification -> protected route -> desktop v0.1.10 login flow -> synthetic rejection -> QA disabled schema validation까지 통과시킨다. 완료 기준은 BUILD-G PASS receipt, targeted auth/session/seed/schema tests PASS, desktop v0.1.10 drift diff=0, `local-dev-only:*` production rejection evidence, no production migration/write/password distribution evidence, and `docs/goal-closeout/cti-build-g/` closeout 5종 파일이다. Out of scope: operational production CUTOVER, S3-T02/T03/T04/T08 data migration, S4-T01/T03/T04b production account/permission writes, S2-T03 password issuance, S2-T05 runtime profile switch, S5/S6 enrichment/seal, Entra ID/OIDC, DB 전환, go-live/production_ready claim. Stop condition: S1-G 미통과, staging operational profile 부재, desktop v0.1.10 빌드 불가, or verifyToken rewrite test failure가 있으면 CUTOVER 준비로 넘어가지 않는다.
```

## Cutover Goal Is Not Next

CUTOVER must remain a later separate goal because it combines freeze, runtime profile switch, tenant migration, account merge, bridge token rotation, password distribution, first-login verification, and thaw. It should only be created after both S1-G and BUILD-G are green and the owner has approved the cutover window.
