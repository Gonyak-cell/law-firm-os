# matter Risk Register 및 Open Questions

문서 버전: v0.1  
작성일: 2026-06-11

## 1. Risk Register

| Risk ID | 리스크 | 위험도 | 통제방안 |
|---|---|---|---|
| RISK-001 | AI가 법률·HR 결론을 자동확정 | Critical | Lawyer/HR-in-control, approval queue, source-grounded output |
| RISK-002 | User와 Employee를 동일시하여 권한누수 | Critical | User/Employee/Contact/External User 분리 |
| RISK-003 | SharePoint 권한과 matter ACL 불일치 | Critical | permission sync checker, audit, reconciliation job |
| RISK-004 | Outlook filing 중 잘못된 matter 선택 | High | matter suggestion + user confirmation + filing history |
| RISK-005 | Obsidian full sync로 권한·데이터 무결성 훼손 | Critical | export-only → controlled import → approval sync 순서 |
| RISK-006 | 고객포털 내부정보 노출 | Critical | portal projection model, external ACL, redaction |
| RISK-007 | HR 급여·평가정보 AI 노출 | Critical | HR guardrail, salary/evaluation/candidate guard |
| RISK-008 | LLM이 근태·연차 계산을 수행 | High | deterministic rule engine, LLM only explanation |
| RISK-009 | 법률문서 QC 누락으로 최종본 오류 | High | QC gate before client/counterparty/court send |
| RISK-010 | Audit log 누락 | Critical | audit middleware, non-bypassable event writer |
| RISK-011 | 과도한 scope의 Microsoft Graph 권한 | High | least privilege, admin consent review |
| RISK-012 | MVP 범위 과대 | High | DB/security/workflow first, AI/drafting/portal phased |

## 2. Open Questions

| ID | 질문 | 우선순위 |
|---|---|---|
| OQ-001 | SharePoint site/library 구조를 matter별로 둘지 practice별로 둘지 | Critical |
| OQ-002 | Microsoft Graph permission scope와 admin consent 범위 | Critical |
| OQ-003 | AI 외부 API 사용 시 privilege/customer confidential 처리정책 | Critical |
| OQ-004 | Obsidian bidirectional sync 허용 객체의 최종 범위 | High |
| OQ-005 | Client Portal MVP 범위: upload/download/approval/Q&A 중 어디까지 | High |
| OQ-006 | HR payroll 범위: compensation record, payroll explanation, payroll calculation 중 어디까지 | Critical |
| OQ-007 | 법령·판례 DB 연동 공급원 | High |
| OQ-008 | 전자서명 연동 여부 및 우선순위 | Medium |
| OQ-009 | data retention 및 legal hold 기준 | High |
| OQ-010 | 내부 로펌의 role hierarchy와 partner override 정책 | Critical |
| OQ-011 | Outlook classic/new/web/mac 지원범위 | High |
| OQ-012 | Matter ID 및 문서파일명 규칙 최종안 | High |
| OQ-013 | HR 평가자료와 billing/time entry의 연결 범위 | High |
| OQ-014 | AI prompt/output 저장기간과 masking 정책 | Critical |
| OQ-015 | 초기 MVP practice pack은 전체 포함인지 M&A부터인지 | Medium |

## 3. 결정 필요사항 우선순위

1. User/Employee 분리와 HR sensitivity.
2. Microsoft 365 저장소 구조.
3. ACL 및 audit event schema.
4. Outlook Add-in MVP 범위.
5. AI external/private/local routing 정책.
6. Portal projection boundary.
7. Obsidian sync policy.
8. HR payroll/attendance rule engine 범위.
