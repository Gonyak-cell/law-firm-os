# W3 UI 버튼·액션 전수 플로우 감사

## 1. 정적 버튼 census

| 컴포넌트 | 줄 | button | onClick | submit | 판정 |
|---|---:|---:|---:|---:|---|
| `Shell.jsx` | 693 | 22 | 22 | 0 | 확인됨 [직접 재실행] |
| `AuthSurface.jsx` | 318 | 16 | 3 | 1 | 부분 확인됨 [직접 재실행] |
| `HomeSurface.jsx` | 352 | 5 | 5 | 0 | 확인됨 [직접 재실행] |
| `ClientsSurface.jsx` | 2485 | 25 | 23 | 1 | 부분 확인됨 [직접 재실행] |
| `MattersSurface.jsx` | 4030 | 39 | 36 | 3 | 부분 확인됨 [직접 재실행] |
| `VaultSurface.jsx` | 1054 | 6 | 4 | 2 | 부분 확인됨 [직접 재실행] |
| `PortalSurface.jsx` | 244 | 3 | 3 | 0 | 부분 확인됨 [직접 재실행] |
| `UserProfileSurface.jsx` | 225 | 3 | 3 | 0 | 확인됨 [직접 재실행] |
| `GlobalUtilitySurface.jsx` | 236 | 5 | 5 | 0 | 구현되어 있으나 작동 불명 [직접 재실행] |
| People leaf 전체 | 4619 | 54 | 47 | 2 | 부분 확인됨 [직접 재실행] |

## 2. People leaf census

| 컴포넌트 | button | onClick | 판정 |
|---|---:|---:|---|
| `PermissionAdminPanel.jsx` | 13 | 13 | 부분 확인됨 |
| `PeopleWorkforceDirectory.tsx` | 9 | 8 | 부분 확인됨 |
| `HRDocumentWorkspace.tsx` | 5 | 4 | 부분 확인됨 |
| `RecruitingPipeline.tsx` | 4 | 3 | 부분 확인됨 |
| `LeaveRequestPage.tsx` | 3 | 2 | 부분 확인됨 |
| `PayrollBoundaryPanel.tsx` | 3 | 2 | 부분 확인됨 |
| `ManagerApprovalQueue.tsx` | 2 | 2 | 부분 확인됨 |
| `LifecycleBoard.tsx` | 2 | 2 | 부분 확인됨 |
| `HRAIAssistant.tsx` | 2 | 2 | 부분 확인됨 |
| `LegalPeopleWorkspace.tsx` | 2 | 2 | 부분 확인됨 |
| `HrxRiskDashboard.tsx` | 2 | 2 | 부분 확인됨 |
| `AttendanceWorkspace.tsx` | 2 | 1 | 부분 확인됨 |
| `PeopleHome.tsx` | 2 | 2 | 확인됨 |
| `HrxStepUpChallenge.tsx` | 1 | 1 | 확인됨 |
| `EmployeeList.tsx` | 1 | 1 | 확인됨 |
| `HRAnalytics.tsx` | 0 | 0 | 확인됨 |
| `EmployeeProfile.tsx` | 0 | 0 | 확인됨 |
| `HRXPolicyConsole.tsx` | 1 | 0 | 구현되어 있으나 작동 불명 |
| `HRXAuditViewer.tsx` | 0 | 0 | 확인됨 |
| `CandidatePortal.tsx` | 0 | 0 | 확인됨 |

## 3. 표본 클릭 검증

| 표본 | 방법 | 결과 | 병목 판정 |
|---|---|---|---|
| Login submit | Playwright 로그인 폼 submit | Home 이동 | ⑬ 실제 운영 가능 후보. 단 synthetic token |
| Shell route views | URL route 직접 접근 | 6 view 렌더 | ⑬ 실제 운영 가능 후보 |
| Vault create/download | HTTP API POST/download | 생성, 다운로드, restart readback 확인 | ⑬ 실제 운영 가능 후보 |
| Matter opening | HTTP API POST `/api/matters/openings` | 400 validation block | ⑫ validation/④ backend contract 병목 |
| Portal API family | `npm run api:test` G10 | 4 fail | ④ backend contract 병목 |
| HRX security/API family | `npm run api:test` HRX 일부 | 401/step-up/tenant 관련 fail | ⑥ 권한·테스트 계약 병목 |

## 4. 막히는 버튼·액션 우선 목록

| 우선순위 | 화면 | 버튼/액션군 | 막히는 지점 | 병목 |
|---:|---|---|---|---|
| P0 | Matter | 신규 Matter opening | API validation block, clearance/server ledger 조건 미충족 | ④ backend contract, ⑫ validation |
| P0 | Portal | invite/RFI/secure link/data room | API test 4 fail | ④ backend contract |
| P0 | HRX audit/security | step-up/audit/tenant-isolation | API test fail | ⑥ 권한 검증, ⑨ 권한 없음 처리 |
| P1 | Auth signup public buttons | 다수 버튼 onClick 없음 | public/signup preview 성격 | ② 핸들러 없음 |
| P1 | GlobalUtility | 10 view 단일 컴포넌트, fetch 없음 | server-backed 여부 미확인 | ③ API 미연결 |
| P1 | HRXPolicyConsole | 1 button, onClick 0 | submit/route 구조 확인 필요 | ② 핸들러 없음 |

## 5. 고아 서피스 12종

| 파일 | import/ref 상태 | 처분 권고 |
|---|---|---|
| `AdminSurface.jsx` | 자기 파일 외 ref 없음 | 제거 또는 Shell route 연결 결정 필요 |
| `AnalyticsSurface.jsx` | 자기 파일 외 ref 없음 | route 연결 또는 폐기 |
| `AskSurface.jsx` | 자기 파일 외 ref 없음 | AI/Ask 전략과 병합 |
| `ContentSurface.jsx` | 자기 파일 외 ref 없음 | 폐기 후보 |
| `DashboardsSurface.jsx` | 자기 파일 외 ref 없음 | Home/Reports와 병합 검토 |
| `ExperimentsSurface.jsx` | 자기 파일 외 ref 없음, button 46 | 폐기·분해 우선 |
| `FinanceSurface.jsx` | 자기 파일 외 ref 없음 | Stage 15/finance 흐름과 조정 |
| `IntakeSurface.jsx` | 파일 ref 2, 단 ClientsSurface 내부 동명 함수 별도 존재 | 이름 충돌 해소 |
| `OpsSurface.jsx` | 자기 파일 외 ref 없음 | 폐기 후보 |
| `ProfilesSurface.jsx` | 자기 파일 외 ref 없음 | UserProfile과 통합 |
| `ReadinessSurface.jsx` | 자기 파일 외 ref 없음 | readiness route와 결정 |
| `ThemeSurface.jsx` | 자기 파일 외 ref 없음 | 설정 테마 메뉴와 통합 |
