# LCX-WEB Live Data Verification

Generated at: 2026-06-26T13:29:24.642Z

Overall result: PASS

Preconditions: api and web dev server are already running. Live mode uses `?data=live`; unavailable, denied, review, and guarded states remain visible instead of falling back to hidden local data.
Any HTTP 5xx response from `/api` or `/master-data` fails its check.

## Checks

| Check | URL | Result | Detail |
| --- | --- | --- | --- |
| home-command-center-cards | `/?locale=en&view=home&desktop=1&data=live&ctx=allow` | PASS | {"capability_cards":4,"work_area_labels":["Client","Matter","구성원","Vault"],"open_buttons":4,"api_5xx_count":0,"api_5xx":[]} |
| clients-live-or-unavailable | `/?locale=en&view=clients&data=live&ctx=allow` | PASS | {"denied":0,"review":0,"unavailable":0,"empty":0,"table_rows":1,"api_5xx_count":0,"api_5xx":[]} |
| clients-denied-visible | `/?locale=en&view=clients&data=live&ctx=denied` | PASS | {"state_text":"접근 권한이 없습니다 권한이 있는 의뢰인만 표시합니다.","api_5xx_count":0,"api_5xx":[]} |
| clients-review-visible | `/?locale=en&view=clients&data=live&ctx=review` | PASS | {"state_text":"검토가 필요합니다 검토가 끝나면 의뢰인 정보를 확인할 수 있습니다.","api_5xx_count":0,"api_5xx":[]} |
| vault-denied-visible | `/?locale=en&view=vault&data=live&ctx=denied` | PASS | {"state_text":"접근 권한이 없습니다 권한이 있는 정보만 표시됩니다.","api_5xx_count":0,"api_5xx":[]} |
| home-product-axis-state-visible | `/?locale=en&view=home&data=live&ctx=allow` | PASS | {"capability_cards":4,"work_area_labels":["Client","Matter","구성원","Vault"],"open_buttons":4,"api_5xx_count":0,"api_5xx":[]} |
| matters-live-surface-no-5xx | `/?locale=ko&view=matters&data=live&ctx=allow` | PASS | {"selector":"[data-cmp-g4-live-matters='true']","state_text":"Matter Matter 상태, 구성원, 문서, 활동, 청구 흐름을 확인합니다. 새로고침 현황 문서 활동 일정 대화 Matter 목록 권한 기준 적용 새 Matter 개시는 승인 후 반영됩니다. 전체 Matter 개시 중 종료 개시 저장 0개 선택 선택 완료 Matter 제목 진행 상태 청구 상태 Matter 1 Matter 1 개시 중 청구 준비 가능 M-LCX8-0069-80271951 LCX8 builder publish","api_5xx_count":0,"api_5xx":[]} |
| people-directory-live-surface-no-5xx | `/?locale=ko&view=people&data=live&ctx=allow#people-directory` | PASS | {"selector":"[data-hrx-api-backed='true']","state_text":"구성원 관리 구성원, 조직, 휴가관리, 요청 관리, 입퇴사 관리, 회사방침, 급여정산과 리포트를 확인합니다. 새로고침 Matter 참여자 확인 Client·Matter 관련 기록 권한 범위 안에서 Matter 참여자와 이해상충 검토 상태를 확인합니다. 전체 내부 변호사 Client 상대 대리인 전문가 규제기관 A Arbitrator Han 중재인 · Arbitration Institution 활성 A Ari Kim 내부 변호사","api_5xx_count":0,"api_5xx":[]} |
| people-members-live-surface-no-5xx | `/?locale=ko&view=people&data=live&ctx=allow#people-members` | PASS | {"selector":"[data-hrx-api-backed='true']","state_text":"구성원 관리 구성원, 조직, 휴가관리, 요청 관리, 입퇴사 관리, 회사방침, 급여정산과 리포트를 확인합니다. 새로고침 구성원 더보기 조직 구성원 추가 재직 입사 예정 퇴사 예정 퇴사 계약직 구성원 작성자 소스 마지막 변경 최근 확인 박병준 미등록 인 인사 미등록 정규 · 방금 전 미등록 서지원 미등록 인 인사 미등록 정규 · 23분 전 미등록 조성민 미등록 인 인사 미등록 정규 · 35분 전 미등록 박서영 미등록 인 인사 미등","api_5xx_count":0,"api_5xx":[]} |
| vault-live-surface-no-5xx | `/?locale=ko&view=vault&data=live&ctx=allow` | PASS | {"selector":"[data-cmp-g5-vault-surface='true']","state_text":"Vault Vault 문서와 권한 상태를 확인합니다. 권한이 없는 본문은 숨깁니다. 새로고침 Vault 문서함 권한 기준 적용 문서 본문은 권한이 있을 때만 표시합니다. Matter 선택됨 / Vault / 작업공간 준비됨 보존 설정 없음 / 권한 기준 적용 문서 제목 등록 계정 상태 버전 권한 보존 문서 1 Synthetic engagement letter 서지원 사용 중 현재 버전 기본 없음","api_5xx_count":0,"api_5xx":[]} |
| client-intake-live-surface-no-5xx | `/?locale=ko&view=clients&data=live&ctx=allow#client-intake` | PASS | {"selector":"[data-cmp-g2-live-clients='true']","state_text":"Client Client와 상담 접수, 영업 기회를 한 화면에서 확인합니다. 새로고침 접수 상담 접수 접수 1 검토 대기 이해상충 검토 통과 검토 스냅샷 필요 통과 처리 접수 상태 기회 범위 접수 1 접수 연결됨 범위 미지정 레코드 Client 1 상태 검토 필요 대표 당사자 미지정 구성원 2 연결 Matter 미지정 잠재 Client 1 기회 1 접수 1 계정 1 연락처 1 권한 기준에 맞춰 표시됩니다. 병합 검토 0건 / ","api_5xx_count":0,"api_5xx":[]} |
| client-data-cloud-live-surface-no-5xx | `/?locale=ko&view=clients&data=live&ctx=allow#client-data` | PASS | {"selector":"[data-cmp-g2-live-clients='true']","state_text":"Client Client와 상담 접수, 영업 기회를 한 화면에서 확인합니다. 새로고침 데이터 보강 Client 외부 연동 2개 확인 연동 요청 동의와 보존 보강 범위는 담당자 승인 후 적용됩니다. 승인 확인 외부 연동 등록 아직 실행 전 동의 상태 아직 실행 전 외부 연동 상태 범위 외부 연결 Salesforce Data Cloud 외부 확인 대기 기업 정보 / 관계 / Matter 맥락 아니오 FullContact 데이터 보","api_5xx_count":0,"api_5xx":[]} |
| client-reports-live-surface-no-5xx | `/?locale=ko&view=clients&data=live&ctx=allow#client-reports` | PASS | {"selector":"[data-cmp-g2-live-clients='true']","state_text":"Client Client와 상담 접수, 영업 기회를 한 화면에서 확인합니다. 새로고침 보고서 Client 저장된 보고서 2개 생성 필터와 열 Client 그룹 / Matter 수 / 손익 조정 생성 상태 아직 실행 전 정의 상태 아직 실행 전 보고서 범위 차트 공유 원문 Client 손익 개요 Client 막대 private 보호됨 Matter business overview Matter 표 private 보호됨 Client ","api_5xx_count":0,"api_5xx":[]} |

## Console messages of type error

Recorded for operator review. Denied/review flows may produce expected non-2xx network messages.

- Failed to load resource: the server responded with a status of 403 (Forbidden)
- Failed to load resource: the server responded with a status of 403 (Forbidden)
- Failed to load resource: the server responded with a status of 403 (Forbidden)
- Failed to load resource: the server responded with a status of 403 (Forbidden)
- Failed to load resource: the server responded with a status of 403 (Forbidden)
- Failed to load resource: the server responded with a status of 403 (Forbidden)
- Failed to load resource: the server responded with a status of 403 (Forbidden)
- Failed to load resource: the server responded with a status of 403 (Forbidden)
- Failed to load resource: the server responded with a status of 403 (Forbidden)
- Failed to load resource: the server responded with a status of 400 (Bad Request)

## API 5xx responses

- None
