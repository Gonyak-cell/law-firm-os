# matter Obsidian Matter Vault 명세

문서 버전: v0.1  
작성일: 2026-06-11

## 1. 기본 원칙

Obsidian은 원본 DB가 아니라 Matter Graph와 People Graph를 사람이 읽고 편집·탐색하기 좋은 표현·지식화 계층이다. 원본 업무상태는 matter DB에 두고, 문서 원본은 OneDrive/SharePoint에 둔다.

## 2. 기능 범위

| 기능 | 포함 여부 |
|---|---|
| Matter별 vault export | 포함 |
| Markdown note 생성 | 포함 |
| YAML frontmatter | 포함 |
| Wikilink 관계 | 포함 |
| Backlink-compatible structure | 포함 |
| Obsidian Canvas 생성 | 포함 |
| Redacted export | 포함 |
| Encrypted export | 포함 |
| Controlled import | 포함 |
| Diff review | 포함 |
| Conflict detection | 포함 |
| Approval-based import | 포함 |
| Bidirectional sync | 장기 포함 |
| Local vault connector | 장기 포함 |

## 3. Vault 폴더 구조

| 폴더 | 내용 |
|---|---|
| 00_Matter | matter overview note |
| 01_Parties | party notes |
| 02_Contacts | contact notes |
| 03_Documents | document metadata notes |
| 04_Issues | issue notes |
| 05_Tasks | task notes |
| 06_Deadlines | deadline/event notes |
| 07_Meetings | meeting notes |
| 08_Authorities | statutes, cases, articles, authorities |
| 09_WorkProducts | memo, report, contract, pleading notes |
| 10_Checklists | CP, closing, RFI, compliance checklist |
| 11_Knowledge | reusable clauses, research, lessons |
| 20_RFI | M&A RFI items |
| 21_DD_Findings | DD findings and red flags |
| 22_Closing | closing checklist and bible notes |
| 30_Facts | litigation facts |
| 31_Evidence | evidence notes |
| 40_HR | HR-related notes if exported within internal workspace |
| 99_Archive | closed matter archive notes |

## 4. Note Schema 원칙

| 객체 | note type | 필수 frontmatter |
|---|---|---|
| Matter | type: matter | matter_id, stage, client, lead_lawyer, confidentiality |
| Party | type: party | party_id, legal_name, role |
| Document | type: document | document_id, matter_id, file_ref, status, version |
| Email | type: email | email_id, conversation_id, sent_at, matter_id |
| Issue | type: issue | issue_id, status, risk_level, owner |
| Task | type: task | task_id, assignee, due_date, status |
| Authority | type: authority | authority_id, citation, last_checked |
| Fact | type: fact | fact_id, date, evidence_ids |
| Clause | type: clause | clause_id, position, use_case, approval_status |
| HR Policy | type: hr_policy | policy_id, effective_date, version |
| Knowledge | type: knowledge | artifact_id, source_matter, approval_status |

## 5. Sync 정책

| 단계 | 정책 |
|---|---|
| Export-only | 초기 기본값. matter DB → vault 단방향 |
| Controlled import | note 변경사항을 import candidate로 등록 |
| Diff review | 변경 전후 표시, object mapping 검증 |
| Conflict detection | DB와 vault 양쪽 수정 시 conflict 표시 |
| Approval import | 승인된 변경만 원본 반영 |
| Bidirectional sync | 고도화 후 issue/task/knowledge부터 제한 허용 |

## 6. Import 허용 객체

| 객체 | 양방향 허용 여부 |
|---|---|
| Knowledge Note | 허용 가능 |
| Research Memo | 허용 가능 |
| Issue status/comment | 제한 허용 |
| Task status/comment | 제한 허용 |
| Deadline date | 충돌검사 후 제한 허용 |
| Billing | 불허 |
| Access Control | 불허 |
| Audit Log | 불허 |
| Final Work Product | 불허 |
| Client-shared document status | 불허 또는 별도 승인 |
| HR compensation/evaluation | 불허 |

## 7. Vault 보안

1. export 권한 별도 부여.
2. export scope 선택.
3. 원문 포함 여부 선택.
4. 고객명·개인정보 redaction 옵션.
5. ZIP 암호화.
6. export audit log 필수.
7. HR 및 salary/evaluation/candidate data export는 별도 restricted approval.

## 8. Verification Gate

1. Vault note의 object_id가 원본 DB와 일치.
2. wikilink가 object relationship과 일치.
3. canvas node/edge가 Matter Graph와 불일치하지 않음.
4. 권한 없는 객체는 vault export에 포함되지 않음.
5. import는 승인 전 원본 DB에 반영되지 않음.
