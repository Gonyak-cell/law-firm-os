# W5 DB·API·보안·연동 갭

## 1. T-3 데이터 갭

| 항목 | 결과 | 판정 |
|---|---|---|
| 엔티티 폭 | packages 40, health bounded contexts 18, API endpoints 다수 | 부분 확인됨 [직접 재실행] |
| tenant 경계 | Matter 다른 tenant 요청 403, Vault 다른 tenant 요청 400 block | 부분 확인됨 [직접 재실행] |
| STORE_PATH | `server.js` 기본값 다수 `mkdtempSync(tmpdir())` | 확인됨 [직접 재실행] |
| 고정 STORE_PATH 영속 | Vault document restart readback 성공 | 확인됨 [직접 재실행] |
| 관리형 DB | DB 엔진 의존성 확인 못함. JSON 파일스토어 중심 | 구현 없음 [직접 재실행] |
| migration | HRX migration test 5 pass | 부분 확인됨 [직접 재실행] |
| seed/mock 혼재 | local-dev synthetic token, synthetic_only, production_ready_claim false 다수 | 확인됨 [직접 재실행] |

## 2. T-5 API 갭

| API군 | 상태 | 판정 |
|---|---|---|
| `/api/auth` | login/session/security admin route 존재, 로그인 표본 성공 | 확인됨 [직접 재실행] |
| `/api/profile` | no token 401, token 200 | 확인됨 [직접 재실행] |
| `/api/matters` | list 200, create opening 400 | 부분 확인됨 [직접 재실행] |
| `/api/vault` | create/download/restart readback 200/201 | 확인됨 [직접 재실행] |
| `/api/crm`, `/api/intake` | runtime context 존재, 직접 생성 표본 미실행 | 미확인 [기존 증빙 인용·재검증됨] |
| `/api/finance`, `/api/analytics`, `/api/reports` | health endpoints 존재, api:test 일부 fail | 구현되어 있으나 작동 불명 [직접 재실행] |
| `/api/portal`, `/api/data-room` | UI 렌더, api:test G10 fail | 구현되어 있으나 작동 불명 [직접 재실행] |
| `/api/outlook` | runtime context endpoints 존재, provider 외부 발송 미확인 | 구현되어 있으나 작동 불명 [기존 증빙 인용·재검증됨] |
| `/api/admin` | security/admin routes 존재, 고아 AdminSurface | 부분 확인됨 [직접 재실행] |

## 3. 연동 갭

| 연동 | 결과 | 판정 |
|---|---|---|
| Ollama/model gateway | 코드와 기존 증빙은 있으나 이 감사에서 실모델 라운드트립 미실행 | 미확인 [기존 증빙 인용·미재검증] |
| Popbill | root `npm test`가 sandbox issue approval 대기로 fail | 구현되어 있으나 운영 부적합 [직접 재실행] |
| Outlook/M365 | runtime context와 workflows 존재, 외부 provider 실호출 미확인 | 구현되어 있으나 작동 불명 [직접 재실행] |
| AWS desktop lambda | 코드·테스트 존재, 이번 감사에서 외부 AWS smoke 미실행 | 미확인 [기존 증빙 인용·미재검증] |
| Desktop signing | signing env 필요로 W1에서 로컬 스킵 | 미확인 [직접 재실행] |

## 4. 축 B 엔터프라이즈 갭

| 영역 | 현재 | 판정 |
|---|---|---|
| 멀티테넌시 | tenant_id와 cross-tenant deny 표본 존재, 단일 로펌 운영 중심 | 부분 확인됨 |
| SSO/SAML/OIDC | 일반 웹 로그인은 local synthetic session | 구현 없음 |
| SCIM | 증거 미확인 | 구현 없음 |
| MFA | HRX step-up 계층 존재, 전사 MFA 아님 | 부분 확인됨 |
| 과금/seat | SaaS seat/billing 미확인 | 구현 없음 |
| SOC 2/ISO | 통제명·감사 산출 일부 존재, 인증 대응 체계 미확인 | 미확인 |
| observability | production smoke workflow 존재, 중앙 로그/APM 미확인 | 미확인 |
| backup/restore | matter-vault backup/restore test 2 pass | 부분 확인됨 |

## 5. 주요 갭 결론

현재 구현은 폭이 넓고 UI/API/desktop 검증 일부가 실제로 통과하지만, root/API 테스트 불일치, 신규 Matter 생성 실패, synthetic/local session, JSON 파일스토어 기본값, 외부 연동 승인 대기 때문에 운영 전환은 막혀 있다.
