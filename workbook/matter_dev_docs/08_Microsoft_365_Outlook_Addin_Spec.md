# matter Microsoft 365 및 Outlook Add-in 명세

문서 버전: v0.1  
작성일: 2026-06-11

## 1. 기본 방향

Outlook Add-in은 matter의 핵심 입력 레이어다. 변호사가 Outlook에서 이메일을 읽거나 작성하면서 matter filing, 첨부파일 저장, task/deadline/issue 생성, AI 요약, Smart Alert를 수행할 수 있어야 한다.

## 2. 기술 선택

| 항목 | 결정 |
|---|---|
| Add-in 방식 | Office.js 기반 Outlook Web Add-in |
| COM/VSTO | 장기방향에서 제외 |
| 인증 | Microsoft Entra ID, MSAL, Nested App Authentication 우선 |
| 메일 접근 | Office.js + Microsoft Graph Mail API |
| 파일 저장 | OneDrive/SharePoint via Microsoft Graph |
| 일정 | Microsoft Graph Calendar API |
| 배포 | Microsoft 365 admin center 조직 배포 |

## 3. Outlook Add-in Read Mode

| 기능 | 설명 |
|---|---|
| Suggested Matter | subject, sender, recipients, attachments, thread 기준 추천 |
| Search Matter | matter name, client, counterparty, matter ID 검색 |
| File Email | 현재 이메일을 matter Email object로 등록 |
| Save Attachments | 선택 첨부파일을 SharePoint/OneDrive matter folder에 저장 |
| Create Task | 이메일에서 업무 생성 |
| Create Deadline | 이메일에서 기한 생성 |
| Create Issue | 이메일에서 쟁점 생성 |
| Summarize Thread | AI thread summary 후보 생성 |
| Filing History | 이미 filing된 이메일인지 표시 |

## 4. Outlook Add-in Compose Mode

| 기능 | 설명 |
|---|---|
| Related Matter | 작성 중 이메일의 관련 matter 지정 |
| Attach from Matter | matter 문서를 첨부 |
| Save Draft to Matter | 발송 전 초안을 matter에 저장 |
| Mark as Client Sent | 고객 송부본으로 document/work product 상태 기록 |
| Mark as Counterparty Sent | 상대방 송부본으로 상태 기록 |
| Confidentiality Check | 외부송부 가능 여부 점검 |
| Attachment Check | 첨부 누락·오첨부 경고 |
| Smart Alert | 발송 전 경고 또는 차단 |

## 5. Email Filing Flow

1. 사용자가 Outlook에서 이메일을 연다.
2. Add-in이 현재 item의 metadata를 읽는다.
3. Add-in이 matter backend에 추천 matter 요청.
4. 사용자가 matter를 선택 또는 확정.
5. backend가 Graph로 필요한 message data를 조회.
6. Email object 생성.
7. 첨부파일 선택 시 SharePoint/OneDrive matter folder에 저장.
8. Document object 및 Attachment mapping 생성.
9. Email ↔ Document ↔ Matter ↔ Thread 관계 생성.
10. Audit Event 기록.
11. 선택적으로 AI summary/task/deadline/issue 후보 생성.

## 6. Email Object 필드

| 필드 | 설명 |
|---|---|
| email_id | matter 내부 Email ID |
| graph_message_id | Microsoft Graph message ID |
| internet_message_id | 원본 Message-ID |
| conversation_id | Outlook conversation/thread ID |
| matter_id | 연결 matter |
| from/to/cc/bcc | 송수신자 |
| subject | 제목 |
| sent_at/received_at | 송수신 시각 |
| body_ref | 본문 원문 저장 위치 또는 secure reference |
| attachments | Attachment object 목록 |
| filing_user | filing한 사용자 |
| filing_time | filing 시각 |
| filing_mode | manual/suggested/automatic |
| confidentiality/privilege | 기밀·비닉 표시 |
| ai_processed | AI 처리 여부 |

## 7. Attachment Filing Flow

| 단계 | 처리 |
|---|---|
| 1 | 첨부파일 목록 표시 |
| 2 | 사용자가 저장할 첨부파일 선택 |
| 3 | SharePoint/OneDrive matter folder 업로드 |
| 4 | Document object 생성 |
| 5 | source=email, linked_email_id 저장 |
| 6 | 중복 hash/version 검사 |
| 7 | audit log 기록 |
| 8 | 필요시 AI classification/QC 후보 생성 |

## 8. Smart Alerts 적용 대상

| 상황 | 정책 |
|---|---|
| 첨부 언급 후 첨부 누락 | warning |
| 고객송부본인데 matter filing 없음 | warning |
| 외부 수신자에게 highly confidential 문서 첨부 | soft block 또는 approval |
| Ethical Wall matter 관련 송부 | hard block 또는 관리자 승인 |
| AI-generated draft인데 human review flag 없음 | warning |
| HR salary/evaluation file 외부송부 | hard block 또는 restricted approval |

## 9. TUW 우선순위

1. MAT-OUT-ADDIN-SHELL-TUW-001: Outlook Add-in manifest 및 task pane shell.
2. MAT-OUT-AUTH-MSAL-TUW-001: MSAL/NAA 인증.
3. MAT-OUT-MTR-LOOKUP-TUW-001: Add-in 내 matter 검색.
4. MAT-OUT-EML-META-TUW-001: 현재 이메일 metadata 읽기.
5. MAT-OUT-EML-FILE-TUW-001: 이메일 matter filing.
6. MAT-OUT-ATT-SAVE-TUW-001: 첨부파일 SharePoint/OneDrive 저장.
7. MAT-OUT-AUD-WRITE-TUW-001: filing audit event.
8. MAT-OUT-TSK-DDL-ISS-TUW-001: task/deadline/issue 생성.
9. MAT-OUT-AI-SUM-TUW-001: 이메일 AI summary 후보.
10. MAT-OUT-SMARTALERT-TUW-001: Smart Alerts MVP.

## 10. Release Gate

1. Outlook read mode에서 matter filing 가능.
2. 첨부파일이 올바른 SharePoint/OneDrive 위치에 저장.
3. Email/Document/Audit object 생성.
4. 권한 없는 matter로 filing 불가.
5. 이미 filing된 email 표시.
6. 실패 시 partial object rollback.
