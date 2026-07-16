# 급여 런타임 최종 검증

검증일: 2026-07-15  
기준: 현재 실행 중인 Forest 앱과 동일 소스에서 다시 생성한 내부 패키지  
결론: `repo_implementation_complete_external_blocked`

## 자동 검증

- 급여 domain: 54/54 PASS
- 급여 API와 역할 매트릭스: 7/7 PASS
- 급여 web UI: 3/3 PASS
- desktop bridge와 renderer: 26/26 PASS
- 전역 UI 회귀: 31/31 PASS
- web TypeScript 검사: PASS
- Vite production build: PASS
- public renderer HRX PII 검사: PASS, 54 files, protected values 30, protected photos 5

## 현재 Forest 브라우저

- 증거: `docs/lazycodex/evidence/matter-web/artifacts/payroll-browser-qa-2026-07-15.json`
- 6개 역할 × 1512/1280/1024/820/720px 검증
- root/main overflow, broken image, empty button, unlabeled control, unexpected HTTP/console/page error 모두 0
- 직원 10명 표와 신고 4종 표의 행 높이 44px
- 상세 drawer 초기 focus, Escape 닫기, opener focus 복귀 PASS
- 직원 본인 명세서 1건과 관리자용 명세서 10건의 권한 경계 PASS

## macOS 패키지

- 앱: `apps/desktop/dist/mac/matter.app`
- 증거: `docs/lazycodex/evidence/matter-desktop/artifacts/payroll-package-qa-2026-07-15.json`
- renderer SHA-256: `ffd5dacef10d95ba000cf1b9c6937de6028a881eded91f79c642153757c27df4`
- 실제 앱에서 preview, issue resolve, 별도 승인자 승인, close, 명세서 10건 생성·전달, 이체 대사, 연말정산 four-eye 검토, 합성 신고 4종 accepted, 재시작 복원 PASS
- 내부 패키지이므로 Developer ID 서명·공증·Gatekeeper 배포 승인은 적용하지 않음

## Windows 패키지

- 실행 파일: `apps/desktop/dist/win/matter-internal-0.1.16-win32-x64/matter.exe`
- Windows renderer SHA-256가 macOS와 동일
- PE `MZ`, ZIP archive test PASS
- macOS 호스트이므로 Windows native install/runtime smoke는 미수행
- Authenticode·Microsoft Store·공개 배포 승인은 적용하지 않음

## AI slop 검토

- `sloplint --changed`: strong 0, weak 60
- 급여 TypeScript의 파일 다운로드 객체 생성 2건은 명칭 기반 오탐
- 나머지 약한 신호는 기존 Forest 사이드바·로그인 애니메이션의 의도된 색상·그림자·motion 또는 다른 기존 화면의 동일 패턴
- 최신 macOS 패키지 1280/720 화면을 수동 검수했고, 급여 화면에는 장식적 색상·반투명 효과·과장 문구·불필요한 2줄 문구를 새로 도입하지 않음

## 유지되는 경계

- 사용 데이터는 합성 fixture뿐이며 실제 직원·계좌·세무자료를 사용하지 않음
- 외부 이메일·메시지·은행·세무 provider production write는 수행하지 않음
- 취업규칙·급여규정·법무·노무·세무 owner 승인은 주장하지 않음
- 공개 릴리즈와 go-live는 `GATE-002 BLOCKED` 유지
