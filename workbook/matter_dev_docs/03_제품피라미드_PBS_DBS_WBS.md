# matter 제품 피라미드 구조: PBS, DBS, WBS

문서 버전: v0.1  
작성일: 2026-06-11

## 1. L0~L13 피라미드

| Level | 명칭 | matter 적용 |
|---|---|---|
| L0 | Product North Star | 자체 로펌 Legal & People Work OS |
| L1 | Product Constitution | Matter-first, People-aware, Microsoft-native, Graph-native, Secure, AI-controlled |
| L2 | Product Pillar | P0~P14 제품축 |
| L3 | Domain | Matter, DMS, Outlook, Issue, Portal, Vault, AI, HR 등 업무영역 |
| L4 | Core Object / Policy / State Model | 객체, 관계, 상태, 권한, 감사, 데이터수명주기 |
| L5 | Module | Matter Home, Outlook Add-in, Issue Ledger, HR Assistant 등 기능묶음 |
| L6 | Capability | 생성, 조회, 연결, 분류, 승인, 검색, export, sync, audit, AI 후보생성 |
| L7 | Feature | 사용자에게 보이는 기능 또는 시스템 기능 |
| L8 | Epic | 여러 Story를 묶는 개발 단위 |
| L9 | User/System Story | 사용자 행위 또는 시스템 요구사항 |
| L10 | Technical Task | DB, API, UI, permission guard, worker, test 작업 |
| L11 | Testable Unit of Work | 독립 구현·검증 가능한 최소 실행 단위 |
| L12 | Verification Case | 완료 여부 판단 검증항목 |
| L13 | Ledger Record | Decision, Execution, Learning, Audit 기록 |

## 2. Product Breakdown Structure

| Pillar ID | Product Pillar | 설명 | 위험도 | 개발 우선순위 |
|---|---|---|---|---|
| P0 | Development Operating System | TUW, Verification Contract, Ledger, Risk-based Model Routing, Loop 운영체계 | High | 1 |
| P1 | Matter Core Platform | Matter, Party, Contact, Matter Home, Matter Lifecycle, Matter Timeline | Critical | 2 |
| P2 | Identity, Permission & Security | User, Role, ACL, Ethical Wall, Confidentiality, Audit Event | Critical | 3 |
| P3 | Microsoft DMS & Email Layer | OneDrive, SharePoint, Outlook, Document, Email, Attachment | Critical | 4 |
| P4 | Workflow & Collaboration | Task, Deadline, Work Queue, Review Queue, Meeting Note, Approval | High | 5 |
| P5 | Issue & Legal Execution | Issue Ledger, M&A, Litigation, Corporate Advisory, RFI/DD, Closing | High | 6 |
| P6 | Portal Platform | Client Portal, Employee Portal, Candidate Portal, External Expert Portal | High | 7 |
| P7 | Knowledge & Obsidian Matter Vault | Knowledge Artifact, Matter Vault, Markdown/YAML/Wikilink/Canvas/Sync | High | 8 |
| P8 | AI & Automation Layer | AI Model Gateway, RAG, Extraction, Candidate Generation, QC, Review Queue | Critical | 9 |
| P9 | Drafting & Clause Intelligence | Template, Clause Library, Draft Assembly, Precedent, Legal Document QC | High | 10 |
| P10 | Billing & ERP | Time Entry, Fee Arrangement, Billing Record, Profitability, Capacity | Medium~High | 11 |
| P11 | Admin & Governance | Admin Console, Policy Console, AI Policy, Audit Console, Ledger Dashboard | High | 12 |
| P12 | Integration & Sync | Microsoft Graph, Legal DB, Obsidian, Calendar, Storage, Connector Layer | Critical | 13 |
| P13 | Enterprise Hardening | SSO/MFA, DLP, Retention, Legal Hold, Backup, Observability, Migration | Critical | 14 |
| P14 | People & HR Operations | Employee, HR Document, Leave, Attendance, Recruitment, Onboarding, Offboarding, HR Risk | Critical | 15 |

## 3. Delivery Breakdown Structure 요약

| Release | 명칭 | 포함 Pillar | 핵심 범위 | Release Gate |
|---|---|---|---|---|
| R0 | Development OS Foundation | P0 | TUW, Verification, Ledger, Model Routing | Product Constitution, TUW template, Ledger schema 확정 |
| R1 | Matter Core Foundation | P1/P2/P14 일부 | Matter, Party, Contact, User, Employee 분리 | Core object CRUD 및 ID 불변성 검증 |
| R2 | Security & Permission Foundation | P2/P11/P14 일부 | ACL, Ethical Wall, Confidentiality, Audit | 권한 없는 접근 차단 및 audit 기록 검증 |
| R3 | Microsoft DMS Foundation | P3/P12 | OneDrive/SharePoint file_ref, Document mapping | 문서 원본과 matter Document object 연결 |
| R4 | Outlook Filing Foundation | P3/P12 | Outlook Add-in, Email filing, Attachment save | 이메일·첨부파일이 matter에 filing되고 audit됨 |
| R5 | Core Workflow | P4 | Task, Deadline, Work Queue, Review Queue | Matter Home에서 업무·기한·검토대상 표시 |
| R6 | Issue & Practice Core | P5 | Issue Ledger, M&A, Litigation, Corporate Advisory | Issue가 문서·이메일·task·authority와 연결 |
| R7 | Portal Platform | P6 | Client/Employee/Candidate/External Portal | 외부 사용자는 승인된 객체만 접근 |
| R8 | Knowledge & Obsidian Vault | P7 | Knowledge, Markdown/YAML export, Canvas, Import | Vault와 core object mapping 검증 |
| R9 | AI & Automation | P8 | AI Gateway, RAG, Extraction, Candidate, QC | source-linked, approval-based, audit-logged AI output |
| R10 | Drafting & Clause Intelligence | P9 | Template, Clause, Draft Assembly, QC | 초안·검토본이 source와 QC에 연결 |
| R11 | Billing & ERP | P10 | Time Entry, Billing, Profitability | matter별 투입시간·수익성 표시 |
| R12 | Admin & Governance | P11 | Policy Console, Audit Console, Ledger | 정책 변경과 관리행위 audit 검증 |
| R13 | Enterprise Hardening | P13 | SSO/MFA, DLP, Retention, Legal Hold | 보안·복구·성능 기준 통과 |
| R14 | People & HR Operations | P14 | HR Core, Leave, Attendance, Recruitment, HR Risk | HR 민감정보 권한 및 rule engine 검증 |

## 4. Work Breakdown Structure 원칙

| 원칙 | 설명 |
|---|---|
| Pillar 단위 분해 | 제품축별로 큰 책임과 boundary 정의 |
| Domain 단위 분해 | 업무영역별 core object와 state 확정 |
| Module 단위 분해 | 개발팀이 독립적으로 구현 가능한 기능묶음 |
| TUW 단위 분해 | 하나의 PR 또는 작은 PR 묶음으로 구현·검증 가능한 단위 |
| Verification 우선 | 개발완료가 아니라 검증통과가 완료조건 |

## 5. Pillar별 Domain 요약

| Pillar | 주요 Domain |
|---|---|
| P1 Matter Core | Matter Registry, Matter Home, Party, Contact, Matter Timeline, Intake |
| P2 Security | User, Role, ACL, Ethical Wall, Audit, Confidentiality, Privilege |
| P3 Microsoft DMS | Document, SharePoint/OneDrive, Version, Metadata, Email, Attachment |
| P4 Workflow | Task, Deadline, Work Queue, Meeting, Approval, Notification |
| P5 Legal Execution | Issue, RFI, DD, Closing, Fact, Evidence, Authority, Corporate Checklist |
| P6 Portal | Client, Employee, Candidate, External Expert Portal |
| P7 Knowledge/Vault | Knowledge, Clause, Authority, Vault, Canvas, Import/Sync |
| P8 AI | Model Gateway, RAG, Extraction, Candidate, QC, Review, Audit |
| P9 Drafting | Template, Clause Library, Draft Assembly, Precedent, QC |
| P10 Billing | Time, Fee, Invoice Candidate, Profitability, Capacity |
| P14 HR | Employee, HR Document, Leave, Attendance, Recruitment, Onboarding, HR Risk |
