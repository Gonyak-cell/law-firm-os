# W7 최종 보고서

## 1. Executive Summary

현재 코드베이스는 [축 A: 데모 가능, 축 B 기준: 구현되어 있으나 운영 부적합] 수준으로 판단됩니다. API·web·desktop·Vault는 상당히 전진했고, signed session과 no-token 401, Vault 문서 영속 표본은 직접 확인됐다. 그러나 root/API test가 green이 아니고, 신규 Matter opening 표본이 validation block으로 중단되며, SSO/SCIM/seat billing/SOC2 준비도와 외부 provider roundtrip이 미확인이다.

## 2. 스냅샷

| 항목 | 값 |
|---|---|
| 스냅샷 | `e5b74852a6576189d59308971697fac8714f2e6b` |
| 브랜치 | `codex/lcx-vltui-owner-approval-intake` |
| 커밋 | `docs(desktop): record v0.1.8 github release` |
| 실행 worktree | `/Users/jws/lawos-audit-wt` |
| 리포트 | `workbook/enterprise-audit-2026-07/` |

## 3. 핵심 확인

| 항목 | 판정 |
|---|---|
| 서버 기동 | 확인됨 [직접 재실행] |
| 인증 게이트 | 확인됨 [직접 재실행] |
| 웹 로그인·6 view | 부분 확인됨 [직접 재실행] |
| Vault create/download/restart | 확인됨 [직접 재실행] |
| 신규 Matter create | 구현되어 있으나 작동 불명 [직접 재실행] |
| root tests | 구현되어 있으나 작동 불명 [직접 재실행] |
| API tests | 구현되어 있으나 작동 불명 [직접 재실행] |
| Desktop file bridge | 확인됨 [직접 재실행] |
| Enterprise SaaS readiness | 구현되어 있으나 운영 부적합 [직접 재실행] |

## 4. 치명 결함

1. 신규 Matter 생성이 직접 표본에서 400 validation block.
2. `npm test` 3 fail, `npm run api:test` 64 fail.
3. `DEFAULT_SESSION_SECRET` 기본값 존재.
4. local synthetic token 기반 로그인.
5. API 서버 기본 STORE_PATH가 tmpdir.
6. Popbill sandbox approval과 Wave-1 external receipts가 green 아님.
7. SSO/SAML/OIDC/SCIM/seat billing/SOC2 준비도 미확인.
8. 고아 UI surface와 상태 모델 난립.
9. lint/typecheck script와 web tsconfig 없음.
10. 외부 provider Outlook/M365 roundtrip 미확인.

## 5. 최우선 10개

| # | 과제 | 목표 |
|---:|---|---|
| 1 | Matter opening 수직 플로우 복구 | client→clearance→matter→vault document→restart readback |
| 2 | API test contract drift 정리 | 262 tests green 또는 의도된 401 기대값 재정렬 |
| 3 | root test external gate 정리 | Popbill/Wave-1 receipts current 상태 |
| 4 | session secret default 제거 | env 없으면 startup fail |
| 5 | STORE_PATH preflight | 운영 프로필에서 14종 path 필수 |
| 6 | env catalog | `.env.example` 또는 운영 env 매트릭스 |
| 7 | SSO/OIDC 착수 | synthetic token 운영 차단 |
| 8 | Portal/API G10 복구 | invite/RFI/secure link/data room tests |
| 9 | UI dead surface 처분 | 삭제 또는 라우팅 |
| 10 | test taxonomy | source-scan, unit, API, browser, external receipt 분리 |

## 6. 30·60·90 목표

30일: 내부 파일럿 전제 복구. Matter opening, API/root tests, secret/env/STORE_PATH preflight, Portal 핵심 route 복구.

60일: 베타 품질 착수. OIDC/SSO adapter, HRX security regression 정리, Outlook/Popbill sandbox proof, observability baseline.

90일: 엔터프라이즈 준비 착수. SCIM/seat billing/SOC2 evidence model, managed DB migration plan, external security review.

## 7. 최소 조건

축 A 내부 파일럿으로 올리려면 W6 조건을 모두 만족해야 한다. 서버+웹 login+6 views, client→matter→document→restart readback, server auth gate, backup/restore drill이 모두 직접 재실행으로 확인되어야 한다. 현재는 Matter 생성 표본과 root/API test green이 막고 있다.

## 8. 원문 S 15개 질문 답변

| 질문 | 답 |
|---|---|
| 1. 실제 실행되는가 | 부분 확인됨. 서버·웹·desktop 일부는 실행되나 전체 test green 아님 |
| 2. 사용자가 로그인 가능한가 | 확인됨. 단 synthetic token |
| 3. 핵심 로펌 플로우가 완주되는가 | 구현되어 있으나 작동 불명. Matter 생성에서 중단 |
| 4. 문서가 저장되고 재기동 후 남는가 | 확인됨. Vault 표본 성공 |
| 5. 권한이 서버에서 강제되는가 | 부분 확인됨. no-token 401과 cross-tenant block 확인 |
| 6. 감사로그가 충분한가 | 부분 확인됨. Vault upload audit는 확인, 민감 read 전수 미확인 |
| 7. 외부 연동이 되는가 | 미확인 또는 운영 부적합. Popbill/Outlook 대기 |
| 8. DB가 운영 수준인가 | 구현되어 있으나 운영 부적합. JSON store 중심 |
| 9. 테스트가 신뢰 가능한가 | 구현되어 있으나 작동 불명. root/API fail |
| 10. desktop이 안전한가 | 부분 확인됨. file bridge tests pass, signing env 미실행 |
| 11. UI 액션이 막히지 않는가 | 부분 확인됨. 다수 고아 surface와 dead/action gap |
| 12. HRX가 운영 가능한가 | 부분 확인됨. web e2e pass, API security tests fail |
| 13. SaaS 엔터프라이즈 준비인가 | 구현되어 있으나 운영 부적합 |
| 14. 프로덕션 판정 가능한가 | 미확인. 이 리포트에서는 부여 금지 |
| 15. 다음 실행 지시가 있는가 | 확인됨. `remediation-v3-spec.md` |

## 9. 참조 산출물

T-1은 `02-feature-reality.md`, T-2는 `03-button-flows.md`, T-3/T-5는 `05-gaps.md`, T-4 요약은 `06-security-summary.md`, 병목과 판정은 `07-bottlenecks-verdict.md`, 실행계획은 `09-plan-306090.md`를 정본으로 한다.
