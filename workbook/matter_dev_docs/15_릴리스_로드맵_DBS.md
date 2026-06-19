# matter Delivery Breakdown Structure 및 릴리스 로드맵

문서 버전: v0.1  
작성일: 2026-06-11

## 1. 전체 릴리스 구조

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

## 2. 릴리스 상세

### R0 Development OS Foundation

목적: 제품개발 운영체계 수립.  
포함: Product Constitution, PBS/DBS/WBS, TUW ID, Verification Contract, Ledger, Risk-based Model Routing, Loop policy.  
Gate: TUW 표준과 Verification Contract 승인.

### R1 Matter Core Foundation

목적: 전체 matter management의 core object 구축.  
포함: Matter, Party, Contact, User, Employee 분리, Matter type, lifecycle.  
Gate: matter 생성·조회·수정·archive, 기본 권한검증.

### R2 Security & Permission Foundation

목적: 보안·권한·감사 기반.  
포함: User/Role, Matter ACL, Document ACL, Ethical Wall, HR sensitivity, Audit Event.  
Gate: 권한 없는 접근 차단 및 audit 기록.

### R3 Microsoft DMS Foundation

목적: OneDrive/SharePoint 기반 문서 원본관리.  
포함: Microsoft Graph auth, file_ref, Document metadata, version mapping, permission sync.  
Gate: SharePoint/OneDrive 문서와 matter Document object 연결.

### R4 Outlook Filing Foundation

목적: Outlook 중심 이메일 업무를 matter로 흡수.  
포함: Office.js Add-in, email filing, attachment save, thread mapping, audit.  
Gate: Outlook 이메일과 첨부파일이 matter에 연결.

### R5 Core Workflow

목적: matter 수행업무 관리.  
포함: Task, Deadline, Work Queue, Review Queue, Approval, Notification.  
Gate: 담당자별 할 일, 기한, 검토대상 표시.

### R6 Issue & Practice Core

목적: 법률업무 수행 핵심.  
포함: Issue Ledger, M&A RFI/DD/Closing, Litigation Fact/Evidence, Corporate Checklist.  
Gate: issue가 문서·이메일·task·authority와 연결.

### R7 Portal Platform

목적: 고객·구성원·후보자·외부전문가와 제한 협업.  
Gate: 외부사용자는 승인된 projection만 접근.

### R8 Knowledge & Obsidian Vault

목적: 지식화 및 Obsidian 호환.  
Gate: Matter Vault export와 object mapping 검증.

### R9 AI & Automation

목적: AI 처리 및 업무후보 생성.  
Gate: source-linked, approval-based, audit-logged output.

### R10 Drafting & Clause Intelligence

목적: 계약서·문서 작성과 QC.  
Gate: template/terms/source/QC 기반 draft.

### R11 Billing & ERP

목적: time, billing, profitability.  
Gate: matter별 투입시간·청구·수익성 확인.

### R12 Admin & Governance

목적: 정책·감사·ledger 운영.  
Gate: admin action audit와 policy management.

### R13 Enterprise Hardening

목적: 보안·복구·대규모 운영.  
Gate: SSO/MFA, retention, DLP, backup, observability.

### R14 People & HR Operations

목적: HR core 기능 본격화.  
Gate: HR 민감정보 권한, rule engine, HR AI guardrail 검증.

## 3. 개발순서 핵심

데이터모델과 권한은 HR 포함하여 R1~R2에 반영한다. HR 화면 전체는 R14에서 구현하더라도 User/Employee 분리와 HR sensitivity는 초기에 확정해야 한다.
