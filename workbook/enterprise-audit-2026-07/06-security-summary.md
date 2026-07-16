# W5 T-4 보안 요약

보안 상세 악용 시나리오와 민감한 재현 상세는 `/Users/jws/lawos-backups/enterprise-audit-2026-07-security/security-detail.md`에만 저장한다. 이 파일은 리스크명·위험도·개선 방향만 포함한다.

## 1. 보안 리스크 표

| 리스크 | 위험도 | 상태 | 개선 방향 |
|---|---|---|---|
| 기본 세션 시크릿 하드코드 | 높음 | `DEFAULT_SESSION_SECRET = lawos-local-wave1-session-secret`, env 미설정 시 사용 | 서버 부팅 시 `LAWOS_API_SESSION_SECRET` 필수화, 기본값 제거 |
| local synthetic token 로그인 | 높음 | `local-dev-only:*@amic.kr` 로스터로 로그인 성공 | 내부 pilot 이전에는 dev token을 별도 프로필로 격리하고 production config에서 거부 |
| API 테스트 계약 불일치 | 높음 | `npm run api:test` 262 중 64 fail, 다수 401 기대값 불일치 | session-auth 이후 테스트·계약·route authz 기대값 정렬 |
| STORE_PATH 기본 tmpdir | 높음 | 서버 단독 기동 시 기본값 휘발 | 모든 운영 프로필에서 14종 STORE_PATH 필수, startup preflight 추가 |
| cross-tenant deny 표본 | 중간 | Matter 403, Vault 400 block 확인 | deny status/code 일관화, tenant isolation 회귀 테스트 복구 |
| client-forged `x-lawos-*` 헤더 | 중간 | apiClient 삭제 + server principal 재생성 확인 | 소스 스캔 테스트와 runtime 부정 테스트 유지 |
| rate limiting/CSRF/security headers | 중간 | 이 감사에서 전수 확인 못함 | API middleware/desktop boundary 별도 hardening stage |
| Popbill/Outlook external provider | 중간 | sandbox/provider approval 대기, raw payload hash-only 원칙 존재 | provider issue approval과 raw payload redaction gate 유지 |
| npm dependency 취약점 | 낮음 | `npm audit --json` vulnerabilities 0 | lockfile audit를 release gate에 고정 |

## 2. 양호 후보

| 항목 | 근거 | 판정 |
|---|---|---|
| HMAC signed session | `session-auth.js` HMAC/timingSafeEqual, TTL, lockout 확인 | 부분 확인됨 [직접 재실행] |
| No-token 업무 route 401 | `/api/profile/me` no token 401 | 확인됨 [직접 재실행] |
| 프로덕션 claim false | health contexts and response fields false | 확인됨 [직접 재실행] |
| Vault raw path 미노출 | upload/download response `raw_path_exposed:false`, `storage_pointer_ref_included:false` | 확인됨 [직접 재실행] |
| npm audit | vulnerabilities total 0 | 확인됨 [직접 재실행] |

## 3. 결론

보안 축은 `부분 확인됨`이다. 세션 강제와 Vault 안전 projection은 전진했지만, 기본 시크릿과 synthetic token, test contract drift, tmpdir 기본값이 운영 부적합 리스크로 남아 있다.
