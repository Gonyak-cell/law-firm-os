# matter Verification Case Catalog

문서 버전: v0.1  
작성일: 2026-06-11

## 1. 공통 Verification Case

| Verification Case ID | 유형 | 검증내용 | 적용범위 |
|---|---|---|---|
| VC-FUNC-001 | 기능 검증 | 요구한 사용자 행위 또는 시스템 행위가 정상 완료된다 | 모든 TUW |
| VC-PERM-001 | 권한 검증 | 권한 없는 사용자는 객체 조회·수정·export·AI 처리 불가 | Matter, Document, HR, Portal, Vault |
| VC-AUD-001 | 감사로그 검증 | 열람·수정·다운로드·공유·AI·export·import·권한변경 이벤트 기록 | Security, DMS, AI, HR |
| VC-DATA-001 | 데이터 무결성 | 객체 ID, 상태전이, relationship edge가 정합적이다 | Core objects |
| VC-REG-001 | 회귀 검증 | 변경 후 기존 Matter Home, ACL, Search, Audit 기능이 훼손되지 않는다 | 모든 release |
| VC-AI-001 | AI source 검증 | AI output은 source object, 모델, 입력범위, reviewer를 가진다 | AI |
| VC-AI-002 | AI approval 검증 | task/deadline/issue/document 변경은 승인 후 반영된다 | AI Candidate |
| VC-HR-001 | HR 민감정보 검증 | 급여·평가·채용·퇴사자료는 권한 범위 내에서만 노출된다 | HR |
| VC-HR-002 | Rule Engine 검증 | 급여·연차·근태 계산은 LLM이 아니라 rule engine 결과를 기준으로 한다 | HR/AI |
| VC-OUT-001 | Outlook filing 검증 | 이메일과 첨부파일이 올바른 matter와 SharePoint/OneDrive 위치에 연결된다 | Outlook |
| VC-VLT-001 | Vault export 검증 | Markdown/YAML/wikilink/canvas가 core object와 일치한다 | Vault |
| VC-VLT-002 | Vault import 검증 | 외부 수정사항은 diff·conflict·approval 후 반영된다 | Vault |
| VC-PORT-001 | Portal 경계 검증 | 외부 사용자는 승인된 객체만 볼 수 있고 내부 note/email/AI output은 노출되지 않는다 | Portal |
| VC-M365-001 | Microsoft permission sync 검증 | matter 권한과 OneDrive/SharePoint 공유상태가 충돌하지 않는다 | Microsoft DMS |

## 2. Readiness Gate

| Gate | 조건 |
|---|---|
| RG-001 | 관련 사양문서와 Product Constitution 확인 완료 |
| RG-002 | 선행 object schema 확정 |
| RG-003 | 권한영향 분석 완료 |
| RG-004 | audit event 필요 여부 확인 |
| RG-005 | test fixture 또는 sample data 준비 |
| RG-006 | AI/HR/Microsoft integration 영향 확인 |

## 3. Completion Gate

| Gate | 조건 |
|---|---|
| CG-001 | 기능 구현 완료 |
| CG-002 | unit/integration/e2e 검증 통과 |
| CG-003 | permission test 통과 |
| CG-004 | audit event test 통과 |
| CG-005 | security constraint 위반 없음 |
| CG-006 | regression test 통과 |
| CG-007 | 문서와 ledger 업데이트 |
| CG-008 | high/critical risk는 reviewer 승인 |

## 4. 수동검증 필요 영역

| 영역 | 이유 |
|---|---|
| Legal Document QC | 법률문서 오류검출 정확성 확인 필요 |
| AI legal/HR output | source와 문맥 검토 필요 |
| Portal external projection | 노출범위 수동검증 필요 |
| Obsidian import conflict | 의도한 변경인지 검토 필요 |
| HR compensation/evaluation access | 민감정보 접근정책 검토 필요 |
| Outlook Smart Alert | 실제 Outlook client별 UX 검증 필요 |
