# matter API·이벤트·통합 명세

문서 버전: v0.1  
작성일: 2026-06-11

## 1. API 후보 목록

| Service | Endpoint 후보 | 목적 | 비고 |
|---|---|---|---|
| Matter API | POST /matters | Matter 생성 | Matter Registry, ACL, Audit |
| Matter API | GET /matters/{id}/home | Matter Home 조회 | Matter, Task, Deadline, Issue, Document summary |
| Document API | POST /matters/{id}/documents | Document metadata 등록 | SharePoint file_ref 필요 |
| Email API | POST /matters/{id}/emails/file | Outlook email filing | graph_message_id, conversation_id |
| Attachment API | POST /emails/{id}/attachments/save | 첨부파일 저장 및 Document 변환 | SharePoint/OneDrive upload |
| Task API | POST /matters/{id}/tasks | Task 생성 | source email/document/issue optional |
| Deadline API | POST /matters/{id}/deadlines | Deadline 생성 | reminder, legal consequence |
| Issue API | POST /matters/{id}/issues | Issue 생성 | source link, risk level |
| AI API | POST /ai/jobs | AI job 생성 | source scope, model routing |
| AI API | POST /ai/outputs/{id}/review | AI 결과 승인·수정·반려 | reviewer required |
| Vault API | POST /matters/{id}/vault/export | Matter Vault export | export policy, audit |
| Vault API | POST /vault/import-review | Vault import 후보 검토 | diff/conflict |
| Portal API | POST /portal/requests | 고객·구성원 요청 생성 | external permission boundary |
| HR API | POST /employees | Employee 생성 | User와 분리 |
| HR API | POST /leave-requests | 휴가신청 | leave rule engine |
| HR API | POST /hr/assistant/query | HR Assistant 질의 | RAG, guardrail, audit |

## 2. Event Model

| Event | Producer | Consumer |
|---|---|---|
| MatterCreated | Matter Service | Audit, Workflow, Search, Analytics |
| DocumentUploaded | Document Service | Search, AI, Audit, QC |
| EmailFiled | Email Filing Service | Audit, AI, Matter Timeline |
| AttachmentSaved | Attachment Service | Document, Search, AI |
| IssueCreated | Issue Service | Matter Home, Workflow, Knowledge |
| TaskCompleted | Workflow Service | Time Candidate, Analytics |
| DeadlineApproaching | Deadline Service | Notification, Matter Home |
| AIOutputGenerated | AI Service | Review Queue, Audit |
| AIOutputApproved | Review Queue | Target Service, Audit |
| VaultExported | Vault Service | Audit, Ledger |
| VaultImportCandidateCreated | Vault Service | Review Queue |
| PortalDocumentShared | Portal Service | Audit, Notification |
| EmployeeCreated | HR Service | User Link, Org, Audit |
| LeaveRequestSubmitted | HR Service | Approval, Notification |
| HRRiskDetected | HR Rule Engine | HR Review Queue, AI Explanation |

## 3. Microsoft Graph Integration

| 통합 | 필요 기능 |
|---|---|
| Outlook Mail | message metadata, body, attachments, conversation_id |
| Outlook Add-in | Office.js task pane, read/compose mode, Smart Alerts |
| SharePoint/OneDrive | drive item upload, file_ref, permission status, version |
| Calendar | meeting, deadline, reminder, optional sync |
| Entra ID | authentication, user mapping, admin consent |

## 4. Obsidian Integration

| 통합 | 필요 기능 |
|---|---|
| Export | Markdown/YAML/wikilink/canvas 생성 |
| Import | note 변경 감지, diff, conflict |
| Sync | approval-based write-back |
| Security | redaction, encryption, audit |

## 5. Legal Data Integration 후보

| 통합 | 용도 |
|---|---|
| 법령 DB | Authority object, last checked |
| 판례 DB | case citation, holding, related issue |
| 공시/DART | M&A 대상회사 자료, corporate advisory |
| 전자서명 | 계약서·HR 문서 체결, signing audit |
| 회계/급여 | billing 또는 payroll integration, 범위 추가확정 필요 |

## 6. API 설계 원칙

1. 모든 write API는 permission guard와 audit writer를 통과한다.
2. AI API는 source object ID와 access scope를 받아야 한다.
3. Portal API는 projection object만 반환한다.
4. HR sensitive API는 별도 guard를 둔다.
5. Microsoft Graph token은 최소권한과 admin consent 기준으로 관리한다.
6. 외부연동 실패 시 partial state를 방지한다.
