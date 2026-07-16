# W4 로펌 도메인 플로우 완결성

## 1. 도메인 플로우 판정

| # | 플로우 | 확인 상태 | 끊기는 첫 지점 | 등급 |
|---:|---|---|---|---|
| 1 | 조직·사용자 온보딩 | 부분 확인됨 [직접 재실행] | local synthetic roster와 signed session은 작동, SSO/SCIM 미확인 | Demo-only |
| 2 | Client | 부분 확인됨 [직접 재실행] | Client 화면·CRM runtime은 존재, client→matter 생성 직접 완주 미확인 | Demo-only |
| 3 | Matter | 구현되어 있으나 작동 불명 [직접 재실행] | `/api/matters/openings` 400 validation block | Broken for create 표본 |
| 4 | 이해상충 | 부분 확인됨 [기존 증빙 인용·재검증됨] | clearance token/ledger 흐름은 소스상 존재하나 신규 opening 표본에서 통과 못함 | Demo-only |
| 5 | 문서 | 확인됨 [직접 재실행] | Vault create/download/restart readback 확인. Matter-linked facade는 별도 미확인 | Beta-usable 상한 |
| 6 | 업무·기한 | 부분 확인됨 [기존 증빙 인용·재검증됨] | matter-runtime endpoints 존재, 표본 클릭 미실행 | Demo-only |
| 7 | 시간기록·청구 | 부분 확인됨 [직접 재실행] | finance endpoints 26 확인, 외부 세금계산서/청구 완주 미확인 | Demo-only |
| 8 | 리포팅 | 부분 확인됨 [직접 재실행] | report-builder endpoints 존재, `api:test` SF-B-W08 fail | 구현되어 있으나 작동 불명 |
| 9 | 종결·보관 | 부분 확인됨 [기존 증빙 인용·미재검증] | matter lifecycle/hold 소스 존재, end-to-end 미실행 | 미확인 |
| 10 | 감사로그 | 부분 확인됨 [직접 재실행] | Vault upload audit_event 확인, 민감 read 전수 감사 미확인 | Demo-only |
| 11 | export | 부분 확인됨 [직접 재실행] | reports/data-cloud endpoints 존재, API tests fail | 구현되어 있으나 작동 불명 |
| 12 | 포털 | 구현되어 있으나 작동 불명 [직접 재실행] | Portal UI 렌더 확인, G10 API fail | Demo-only |
| 13 | AI | 부분 확인됨 [직접 재실행] | AI/HRX endpoints 존재, `api:test` G9/HRX AI fail | 구현되어 있으나 작동 불명 |
| 14 | 관리 콘솔·설정 | 부분 확인됨 [직접 재실행] | admin-permission endpoints 존재, 고아 AdminSurface 존재 | Demo-only |

## 2. 2026-07-02 감사 대비 델타

| 게이트 | 07-02 판정 | 현재 재확인 | 델타 |
|---|---|---|---|
| 인증 | 자기주장 헤더 신뢰경계가 핵심 결함 | `/api/health` 외 업무 라우트 signed session 강제, no token 401 확인 | 전진 |
| DB/영속 | JSON store·tmpdir 기본 | 고정 STORE_PATH에서 Vault restart readback 확인, 기본값 tmpdir은 여전 | 부분 전진 |
| 문서 바이트 | 파일 입력/다운로드 부족 | Vault API create/download bytes 확인, raw path 미노출 | 전진 |
| LLM | 실 LLM 부재 | HRX/AI API test fail, model gateway 실호출은 이 감사에서 미실행 | 정체 |
| 외부 연동 | Popbill/Outlook 미배선 | root test가 Popbill sandbox approval로 fail, Outlook runtime은 provider-blocked 성격 | 정체 |

## 3. 로펌 특칙 중대 결함

| 특칙 | 현재 상태 | 판정 |
|---|---|---|
| 이해상충 검사 | 경로는 있으나 신규 matter 표본이 validation block. 실사용 개시 전 서버발급 clearance와 ledger 대사 증거 필요 | 구현되어 있으나 작동 불명 [직접 재실행] |
| 문서 권한 | Vault create/download, auth gate, cross-tenant block 표본 확인 | 부분 확인됨 [직접 재실행] |
| 감사로그 | Vault upload audit_event 확인. 민감 read·denied read 전수 감사는 미확인 | 부분 확인됨 [직접 재실행] |
| 청구·세금계산서 | Popbill sandbox approval external gate로 root test fail | 구현되어 있으나 운영 부적합 [직접 재실행] |
