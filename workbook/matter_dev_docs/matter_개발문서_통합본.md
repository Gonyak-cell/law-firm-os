# matter 개발문서 통합본
문서 버전: v0.1
작성일: 2026-06-11


---

# 00_문서목록_및_사용가이드.md
# matter 개발문서 패키지 목록 및 사용가이드

문서 버전: v0.1  
작성일: 2026-06-11  
대상: 자체 로펌 내부용 matter 개발팀, 제품책임자, 보안책임자, AI/데이터 담당자

## 1. 이 패키지의 목적

이 패키지는 현재 대화에서 확정된 matter의 제품방향, 아키텍처, 데이터모델, 권한·보안, Microsoft 365 연동, Outlook Add-in, Obsidian Matter Vault, AI/자동화, HR/People Operations, Portal, Drafting, Billing, Release, TUW, Verification 구조를 개발팀이 바로 구현계획으로 전환할 수 있도록 정리한 개발용 기준문서 모음이다.

확정 전제

| 항목 | 확정 내용 |
|---|---|
| 제품명 | matter |
| 제품 성격 | 자체 로펌 내부용 Legal & People Work OS |
| 1차 대상 | 전체 matter management |
| 설계수준 | 처음부터 장기확장형, 내부 enterprise-grade 기준 |
| 문서 저장소 | OneDrive 또는 SharePoint |
| 이메일 | Outlook 우선, Office.js Outlook Web Add-in 중심 |
| AI 배치 | 외부 API와 private/local model 모두 고려 |
| AI 처리범위 | 내부자료 전부 처리 가능하되 자동확정과 구분 |
| 고객포털 | 포함 |
| Obsidian | export, import, controlled sync, full bidirectional sync까지 장기범위 포함 |
| HR | People & HR Operations Pillar로 포함 |
| 개발 운영체계 | Risk-based, Verification-driven, Loop-based SaaS Development Operating System |

## 2. 문서 목록

| 번호 | 문서명 | 용도 |
|---|---|---|
| 00 | 문서목록 및 사용가이드 | 전체 패키지 구조와 사용순서 |
| 01 | 제품 사양명세서 PRD/SRS | 제품 목적, 범위, 사용자, 기능, 제외범위 |
| 02 | 제품헌장 및 개발운영체계 | Product/Data/Security/AI/Verification Constitution |
| 03 | 제품피라미드 PBS/DBS/WBS | L0~L13 피라미드와 Product Pillar |
| 04 | 시스템 아키텍처 구조도 | 전체 logical/physical/service architecture |
| 05 | 도메인 객체 데이터모델 | Core Object, Relationship, State Model |
| 06 | 권한·보안·감사·거버넌스 | ACL, Ethical Wall, audit, external sharing |
| 07 | AI·자동화·모델라우팅·검증정책 | AI Model Gateway, RAG, guardrail, AI audit |
| 08 | Microsoft 365 및 Outlook Add-in 명세 | Outlook Web Add-in, Graph, SharePoint/OneDrive |
| 09 | Obsidian Matter Vault 명세 | Markdown/YAML/wikilink/canvas/export/import/sync |
| 10 | Portal Platform 명세 | Client/Employee/Candidate/External Portal |
| 11 | People & HR Operations 명세 | Employee, HR document, leave, attendance, recruitment, HR AI |
| 12 | Practice Packs 명세 | M&A, Litigation, Corporate Advisory |
| 13 | Drafting, Clause, Legal QC 명세 | 템플릿, 조항, 초안조립, QC |
| 14 | Billing, ERP, Analytics 명세 | Time, billing, profitability, capacity |
| 15 | 릴리스 로드맵 DBS | R0~R14 릴리스 구조 |
| 16 | Execution Dependency Graph | 선후관계, blocking, regression, feedback edge |
| 17 | TUW 표준 및 ID 체계 | TUW 필드, ID prefix, Verification Contract |
| 18 | TUW 초기 백로그 | Part 0~Part 14 단위 작업목록 |
| 19 | Verification Case Catalog | 검증항목 카탈로그 |
| 20 | Agent Work Contracts | Planner–Executor–Verifier–Governor 및 agent 계약 |
| 21 | UI 화면 및 사용자흐름 | 핵심 화면과 사용자 flow |
| 22 | API·이벤트·통합 명세 | API 후보, event, integration boundary |
| 23 | Risk Register 및 Open Questions | 리스크와 확정 필요사항 |
| 24 | 개발팀 착수 지시서 | 1차 스프린트 착수 지시서 |

## 3. 개발팀 사용순서

1. 01~03 문서로 제품범위와 개발 운영체계를 확정한다.
2. 04~06 문서로 아키텍처, 데이터, 권한, 감사로그를 먼저 설계한다.
3. 08 문서에 따라 Microsoft 365 및 Outlook Add-in MVP를 병행 설계한다.
4. 17~19 문서로 TUW와 Verification Case를 생성·관리한다.
5. 24 문서를 기준으로 Part 0~Part 4를 1차 스프린트로 착수한다.

## 4. 우선 구현 원칙

가장 먼저 구현할 것은 AI나 Drafting이 아니라 Core Object, Permission, Audit, Microsoft file reference, Outlook filing이다. AI와 HR 기능은 범위에 포함하되, 권한·감사·데이터모델이 선행되어야 한다.


---

# 01_제품_사양명세서_PRD_SRS.md
# matter 제품 사양명세서 PRD/SRS

문서 버전: v0.1  
작성일: 2026-06-11

## 1. 제품 개요

Product North Star

matter의 Product North Star는 자체 로펌의 모든 법률업무와 내부운영을 matter 단위와 people 단위로 구조화하고, 문서·이메일·일정·업무·쟁점·리서치·산출물·청구·고객협업·인사·근태·채용·지식자산을 하나의 Matter Graph 및 People Graph로 연결하여, 변호사와 운영자가 현재 상태, 남은 업무, 핵심 리스크, 근거자료, 고객확인사항, 문서품질, 인력운영 상태를 한 화면에서 파악하고 실행할 수 있게 하는 것이다.

matter는 Law Firm Work OS, Legal Knowledge OS, People Operations OS의 결합형 내부 시스템이다. 제품은 Outlook, OneDrive, SharePoint 기반 업무환경 위에서 Matter Graph와 People Graph를 구축하고, 문서·이메일·일정·업무·쟁점·리서치·산출물·청구·고객포털·인사·근태·채용·온보딩·오프보딩·HR 리스크·AI Assistant를 하나의 권한·감사·지식체계 안에서 운영한다.

## 2. 제품 목적

| 목적 | 설명 |
|---|---|
| 전체 matter management | 모든 법률업무와 내부 프로젝트를 matter 단위로 생성·수행·종결·지식화 |
| 문서·이메일 통합 | Outlook, OneDrive, SharePoint를 matter에 연결 |
| 업무상태 가시화 | Matter Home에서 open issue, task, deadline, recent document, recent email 표시 |
| 지식자산화 | Matter Closing Knowledge Pack, Clause, Authority, Research, Negotiation history 축적 |
| AI-ready 구조 | AI가 source-grounded, approval-based, audit-logged 방식으로 작동 |
| 내부운영 통합 | HR, workload, time, billing, capacity, portal, admin까지 통합 |
| 법률문서 품질관리 | 당사자, 날짜, 정의어, 조문, 별지, 금액, 법령·판례 인용 정합성 QC |

## 3. 핵심 사용자

| 사용자 | 주요 행위 |
|---|---|
| 파트너 변호사 | matter 총괄, 최종검토, 고객보고, 수익성, 권한 승인 |
| 담당 변호사 | 계약서 검토, 리서치, 쟁점관리, 문서작성, 고객회신 |
| 주니어 변호사 | 자료검토, 초안작성, 회의록, checklist 관리 |
| 패러리걸·스태프 | 문서정리, 일정관리, closing 자료, portal 운영 |
| HR 담당자 | 구성원, 인사문서, 근태, 휴가, 채용, 온보딩, HR 리스크 관리 |
| 로펌 관리자 | 사용자, 권한, 보안, 정책, 감사로그, AI policy 관리 |
| 고객 사용자 | 자료 업로드, 승인, 진행상황 확인, 산출물 다운로드 |
| 구성원 사용자 | 휴가, 근태, HR 문서, 사규 Q&A, 온보딩/오프보딩 |
| 채용후보자 | 지원자료, 면접일정, 개인정보동의, 문서제출 |
| AI/System Worker | 분류, 요약, 추출, 후보 생성, QC, indexing, audit 기록 |

## 4. 주요 시나리오

| 시나리오 | 흐름 |
|---|---|
| 신규 matter 생성 | Matter 생성 → Party/Contact 등록 → Team 배정 → 권한 설정 → template 적용 |
| Outlook filing | 이메일 열람 → matter 추천/검색 → email filing → 첨부 저장 → audit → AI 후보 생성 |
| M&A 수행 | RFI/DD → DD Finding → Issue Ledger → SPA/SHA 협상 → CP/Closing → Knowledge Pack |
| 분쟁 수행 | Fact Ledger → Evidence Ledger → Issue → Authority → Pleading → Hearing → Judgment |
| 기업자문 | Checklist → Document/Authority → Review → Opinion/Resolution → Knowledge Capture |
| Client Portal | 자료요청 → 고객 업로드 → 내부 검토 → 고객 승인 → 산출물 공유 |
| Obsidian Vault | Matter Graph export → Markdown/YAML/wikilink/canvas → import diff → approval sync |
| HR 운영 | Employee → HR Document → Leave/Attendance → HR Risk → HR Assistant → HR Report |
| AI 후보 처리 | Source ingestion → model routing → output 생성 → review queue → 승인 후 write-back |

## 5. 기능 범위

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

## 6. 명확한 비목표 또는 제한

| 항목 | 제한 |
|---|---|
| AI의 법률결론 자동확정 | 금지. 변호사 검토 및 승인 필수 |
| 고객송부본 자동전송 | 금지 또는 별도 승인 필수 |
| 법원제출본 자동제출 | 금지. 사람 승인 및 제출절차 필요 |
| 급여·연차·근태 최종계산을 LLM에 위임 | 금지. deterministic rule engine 사용 |
| 채용 합격/불합격 자동결정 | 금지. AI는 요약·질문·행정 보조만 수행 |
| 평가등급 자동부여 | 금지. AI는 코멘트 정리·자료요약만 수행 |
| Obsidian을 원본 DB로 사용 | 금지. 원본은 matter DB, 문서 원본은 SharePoint/OneDrive |
| COM Outlook Add-in | 장기방향에서 제외. Office.js Web Add-in 기준 |

## 7. 성공 기준

| 기준 | 측정방식 |
|---|---|
| Matter 상태 가시성 | Matter Home에서 open issue/task/deadline/document/email 표시 |
| Filing 사용률 | Outlook 이메일 중 matter filing된 비율 |
| 문서정합성 | QC 검출 오류와 수정 완료율 |
| AI 신뢰성 | source-linked output 비율, 승인·반려율, hallucination incident |
| 보안성 | 권한위반 시도 차단, audit completeness |
| HR 안정성 | 민감정보 권한차단, rule engine과 AI 역할분리 검증 |
| 지식화 | 종결 matter 중 Knowledge Pack 생성 비율 |

## 8. 추가 확정 필요사항

1. Microsoft 365 tenant 구조와 SharePoint site/library 정책.
2. Outlook Add-in 배포 방식: 조직 중앙배포, sideload, admin consent 범위.
3. AI 외부 API 사용 시 고객자료·비닉자료 처리정책.
4. HR payroll 범위: 급여정보 보관까지인지, 급여계산 연동까지인지.
5. 법령·판례·공시 연동 데이터소스.
6. Obsidian local vault connector 지원 OS 및 sync 방식.


---

# 02_제품헌장_및_개발운영체계.md
# matter 제품헌장 및 개발운영체계

문서 버전: v0.1  
작성일: 2026-06-11

## 1. 개발 운영체계 명칭

matter의 장기개발은 다음 체계로 정의한다.

Risk-based, Verification-driven, Loop-based SaaS Development Operating System  
한국어 명칭: 위험도 기반·검증 중심·루프형 SaaS 개발 운영체계

## 2. Product Constitution

| 원칙 | 내용 |
|---|---|
| Matter-first | 모든 법률업무는 matter에 귀속되고, 문서·이메일·업무·쟁점·리서치·산출물이 연결된다. |
| People-aware | User와 Employee를 분리하고, matter 수행 인력·HR·capacity·workload를 연결한다. |
| Microsoft-native | Outlook, OneDrive, SharePoint를 1차 연동 대상으로 한다. |
| Graph-native | Matter Graph와 People Graph를 node/edge로 표현한다. |
| Obsidian-compatible | Graph는 Markdown, YAML, wikilink, backlink, canvas, controlled sync로 표현 가능해야 한다. |
| Lawyer-in-control | 법률결론, 고객송부, 최종문서, 외부공유는 사람 승인 기반이다. |
| HR-in-control | HR 평가·채용·징계·급여·연차·근태 판단은 AI 자동확정 대상이 아니다. |
| Audit-first | 열람, 수정, 다운로드, 공유, export, import, AI, 권한변경은 감사로그 대상이다. |
| Verification-driven | 완료는 구현 여부가 아니라 Verification Contract 통과 여부로 판단한다. |

## 3. Data Constitution

| 원칙 | 내용 |
|---|---|
| Structured source of truth | matter DB가 업무상태·관계·권한의 원본이다. |
| File source separation | 문서 원본은 OneDrive/SharePoint에 두고, matter는 metadata와 관계를 관리한다. |
| Stable ID | Matter ID, Document ID, Issue ID, Employee ID, Vault Note ID는 불변이다. |
| Linkable object | 모든 core object는 relationship edge를 가진다. |
| Version-aware | 문서와 work product는 업무상 의미 있는 버전·상태를 가진다. |
| Knowledge lifecycle | working, matter-specific, firm-approved, deprecated knowledge를 구분한다. |
| Data lineage | AI output, QC result, issue candidate는 source lineage를 가진다. |

## 4. Security Constitution

| 권한 영역 | 기본 접근자 | 특수 제한 | 감사로그 필요 여부 |
|---|---|---|---|
| Matter | Matter Team, Lead Lawyer, Admin with policy | Ethical Wall, Need-to-know, Client-restricted | 필수 |
| Document | Matter 권한자 중 문서권한자 | Highly Confidential, Privilege, HR Restricted | 필수 |
| Email | Matter 권한자 중 filing/reading 권한자 | Thread-level restriction, external sender sensitivity | 필수 |
| Issue | Matter 권한자 | 고위험 issue 제한 가능 | 필수 |
| Billing | Partner, Finance, Admin 제한권한 | 개별 수행자 본인 기록만 제한 열람 | 필수 |
| HR Compensation | 본인, Payroll, 제한 HR | 파트너/관리자라도 별도 권한 필요 | 필수 |
| HR Evaluation | 평가자, HR, 지정 관리자 | AI 접근 제한 및 마스킹 | 필수 |
| Candidate | HR, Hiring Manager, Interviewer 제한 | 민감정보·차별요소 접근제어 | 필수 |
| AI Output | 원천데이터 접근권한 보유자 | source scope 초과 금지 | 필수 |
| Vault Export | 별도 export 권한자 | Redacted/encrypted export 기본 | 필수 |

## 5. AI Constitution

| 원칙 | 내용 |
|---|---|
| Candidate-first | AI는 후보를 생성하고, 확정은 승인 후 이루어진다. |
| Source-grounded | AI output은 source document/email/authority/data를 가진다. |
| Risk-based Model Routing | 작업 위험도·데이터 민감도에 따라 외부 API, private model, local model을 라우팅한다. |
| No source, no conclusion | source 없는 법률·HR 결론은 제공하지 않는다. |
| Approval-based write-back | task, deadline, issue, document status, HR action은 승인 후 반영한다. |
| AI data boundary | 외부 API 사용 여부와 입력 범위를 기록한다. |
| Model independence | AI는 DB에 직접 접근하지 않고 서버가 권한검증 후 제한된 context만 제공한다. |
| AI regression | 모델·prompt·retriever 변경 시 회귀검증을 수행한다. |

## 6. Agent Constitution

| 구성 | 책임 |
|---|---|
| Planner | 목표를 TUW, dependency, risk로 분해한다. |
| Executor | Agent Work Contract에 따라 구현한다. |
| Verifier | Verification Contract와 Verification Case를 독립 검증한다. |
| Governor | 보안·법률·품질·scope 위반 시 중단·승인·escalation한다. |
| Operational Knowledge Base | 과거 결정, 패턴, 검증실패, 재사용 지식을 저장한다. |

## 7. Verification Constitution

| 원칙 | 내용 |
|---|---|
| Readiness Gate | TUW 시작 전 입력, dependency, 권한, test data가 준비되어야 한다. |
| Completion Gate | 기능, 권한, audit, 보안, 회귀, 문서화가 완료되어야 한다. |
| Verification Contract | 각 TUW는 검증가능한 계약을 가진다. |
| Verification Case | 자동·수동 검증항목을 명시한다. |
| Regression Edge | 핵심 모델 변경 시 관련 기능 회귀검증을 수행한다. |

## 8. Ledger Constitution

| Ledger | 기록 내용 |
|---|---|
| Decision Ledger | 제품·데이터·권한·AI·릴리스 결정과 근거 |
| Execution Ledger | TUW 실행결과, 변경파일, 배포, migration, incident |
| Learning Ledger | 검증실패, 사용자피드백, AI 오류, 개선 rule |
| Audit Event Ledger | 사용자·시스템 행위 기록 |
| Model Routing Ledger | AI 작업 위험도와 모델선택 근거 |

## 9. Loop 체계

| Loop | 목적 |
|---|---|
| Exploration Loop | 불명확한 사양·대안 탐색 |
| Convergence Loop | 하나의 구현방향으로 수렴 |
| Orchestrated Integration Loop | 여러 module 통합 |
| Learning Loop | 검증실패와 운영피드백을 Operational Knowledge Base에 반영 |
| Governance Loop | 위험·정책·권한·audit 기준을 지속 통제 |


---

# 03_제품피라미드_PBS_DBS_WBS.md
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


---

# 04_시스템_아키텍처_구조도.md
# matter 시스템 아키텍처 구조도

문서 버전: v0.1  
작성일: 2026-06-11

## 1. 전체 논리 구조

사용자 계층 → Portal/Outlook/Web UI → matter API Gateway → Domain Services → Data/Storage/Search/AI/Audit → Microsoft 365 및 외부연동

## 2. 사용자 계층

| 사용자 | 채널 |
|---|---|
| 변호사·스태프 | matter Web App, Outlook Add-in |
| 파트너 | Matter Home, Firm Dashboard, Billing, AI Review Queue |
| 고객 | Client Portal |
| 구성원 | Employee Portal |
| 채용후보자 | Candidate Portal |
| 관리자 | Admin Console |
| AI/System Worker | Worker Queue, AI Model Gateway, Integration Job |

## 3. 애플리케이션 계층

| 서비스 | 책임 |
|---|---|
| Matter Service | Matter CRUD, lifecycle, timeline, home summary |
| Party/Contact Service | party, contact, conflict metadata |
| Document Service | document metadata, status, version, file_ref |
| Email Filing Service | Outlook message filing, thread mapping |
| Task/Deadline Service | workflow, work queue, calendar integration |
| Issue Service | issue ledger, relationship, resolution |
| Practice Pack Service | M&A, litigation, corporate advisory templates |
| Portal Service | external projection, upload, approval, Q&A |
| Knowledge Service | clause, authority, artifact, search |
| Vault Service | Markdown/YAML/canvas export, import, sync |
| AI Service | model routing, RAG, extraction, QC, review |
| Billing Service | time entry, fee, invoice candidate, profitability |
| HR Service | employee, leave, attendance, recruitment, HR risk |
| Admin Service | user, role, policy, audit console |
| Audit Service | non-bypassable event capture |

## 4. 데이터 계층

| 저장소 | 내용 |
|---|---|
| Relational DB | core objects, state, permission, ledger, audit metadata |
| OneDrive/SharePoint | document original, work product, HR document original |
| Search Index | full-text document/email/knowledge search |
| Vector Index | semantic search, RAG context retrieval |
| Object Cache | derived summary, dashboard, AI candidate cache |
| Audit Log Store | immutable audit events |
| Ledger Store | Decision, Execution, Learning records |

## 5. AI 계층

AI Model Gateway는 외부 API, private server, local model을 모두 추상화한다. 모델은 DB에 직접 접근하지 않고, AI Orchestrator가 사용자 권한과 데이터분류를 검증한 후 최소 context를 제공한다.

| 구성요소 | 역할 |
|---|---|
| Data Scope Resolver | 사용자가 접근 가능한 source만 선택 |
| Data Classification | privilege, HR-sensitive, confidential 분류 |
| Task Risk Classifier | Low/Medium/High/Critical 위험도 산정 |
| Routing Policy | 외부 API/private/local model 선택 |
| RAG Orchestrator | 검색, rerank, prompt construction |
| Guardrail Layer | PII, salary, evaluation, candidate, legal disclaimer, source required |
| Review Queue | 승인·수정·반려 |
| AI Audit Writer | 입력범위, 모델, output, reviewer 기록 |

## 6. Microsoft 365 연동 구조

| 영역 | 방식 |
|---|---|
| Outlook | Office.js Outlook Web Add-in |
| 인증 | Microsoft Entra ID, MSAL, Nested App Authentication 우선 |
| 메일 | Microsoft Graph Mail API |
| 파일 | Microsoft Graph Drive/Sites API, OneDrive/SharePoint file_ref |
| 일정 | Microsoft Graph Calendar API |
| 배포 | Microsoft 365 admin center 조직 배포 |

## 7. 주요 구조도 텍스트

Outlook Add-in → Email Filing Service → Document Service → SharePoint/OneDrive → matter DB → Audit Service → AI Candidate Queue → Review Queue → Matter Graph

Matter Web App → Matter API Gateway → Domain Services → Relational DB/Search/Vector/Audit → Web UI Dashboard

Client Portal → Portal Projection Service → External ACL → Approved Objects Only → Audit Service

Employee Portal → HR Service → HR Rule Engine → HR AI Assistant → HR Audit Service

Obsidian Local Vault → Vault Import Service → Diff/Conflict Engine → Approval Queue → Core Object Write-back

## 8. 비기능 요구사항

| 요구사항 | 기준 |
|---|---|
| 보안 | 모든 민감객체 ACL 적용 및 audit 필수 |
| 확장성 | practice pack, portal type, AI model 추가 가능 |
| 복구성 | SharePoint/DB/Audit/Vector index 간 재동기화 가능 |
| 성능 | Matter Home은 derived summary/cache로 빠르게 응답 |
| 추적성 | 모든 AI 및 외부공유 결과는 source/audit/ledger와 연결 |


---

# 05_도메인_객체_데이터모델.md
# matter 도메인 객체 및 데이터모델

문서 버전: v0.1  
작성일: 2026-06-11

## 1. Core Object Model

| Core Object | 정의 | 주요 필드 |
|---|---|---|
| Tenant | 내부 로펌 조직 단위. 자체 내부용이라도 향후 독립 workspace/법인/사무소 분리를 위해 유지 | tenant_id, name, settings, retention_policy |
| User | 시스템 로그인 계정 | user_id, email, status, auth_provider, linked_employee_id |
| Employee | 로펌 구성원 또는 인사관리 대상. User와 분리 | employee_id, name, employment_status, org_unit_id, position, join_date |
| Role | 시스템·업무상 권한 묶음 | role_id, role_name, scope, permissions |
| Matter | 법률업무 또는 내부운영 프로젝트의 중심 객체 | matter_id, name, type, subtype, stage, client, lead_lawyer, confidentiality |
| Party | 의뢰인, 상대방, 대상회사, 투자자, 주주, 외부기관 | party_id, legal_name, role, jurisdiction, conflict_status |
| Contact | 고객·상대방·외부전문가 담당자 | contact_id, name, org, email, phone, role_in_matter |
| Document | 문서 원본의 matter metadata 객체 | document_id, file_ref, type, status, version, source, privilege |
| Email | Outlook 메시지 및 thread metadata 객체 | email_id, graph_message_id, conversation_id, from, to, subject, filed_matter_id |
| Attachment | 이메일 첨부 및 파일 원본 연결 객체 | attachment_id, email_id, document_id, filename, hash |
| Task | 업무 실행 단위 | task_id, matter_id, title, assignee, due_date, status, source |
| Deadline/Event | 계약상·절차상·내부 일정 | event_id, matter_id, type, date_time, legal_consequence, reminder_rule |
| Issue | 법률·거래·절차 쟁점 | issue_id, matter_id, category, status, risk_level, client_position, resolution |
| Authority | 법령, 판례, 유권해석, 논문, 기사 | authority_id, type, citation, jurisdiction, last_checked, validity_status |
| Work Product | 의견서, 계약서, 보고자료, 회의록, 준비서면 등 산출물 | work_product_id, matter_id, type, status, audience, sent_at |
| Time Entry | 업무시간·청구가능시간 기록 | time_entry_id, employee_id, matter_id, duration, billable, source |
| Billing Record | 수임료·청구·수익성 기록 | billing_id, matter_id, fee_type, budget, invoice_status |
| Knowledge Artifact | 재사용 가능한 지식 단위 | artifact_id, type, source_matter, approval_status, last_reviewed |
| Vault Note | Obsidian 호환 note 매핑 객체 | note_id, object_type, object_id, vault_id, sync_state |
| AI Output | AI 결과 및 검토상태 | ai_output_id, source_objects, model, output_type, review_status, applied_at |
| Audit Event | 중요 사용자·시스템 행위 로그 | event_id, actor_id, action, object_type, object_id, timestamp, result |
| Ledger Record | 개발·운영 의사결정, 실행, 학습 기록 | ledger_id, ledger_type, related_work_id, decision, evidence |
| HR Document | 근로계약서, 연봉계약서, 서약서, 개인정보동의서 등 | hr_document_id, employee_id, type, status, signed_at, restricted |
| Leave Request | 휴가신청 | leave_request_id, employee_id, type, start_date, end_date, status, approver |
| Attendance Record | 근태기록 | attendance_id, employee_id, date, check_in, check_out, work_hours |
| Candidate | 채용후보자 | candidate_id, job_opening_id, status, privacy_consent, source |
| HR Risk Event | 인사·노무 리스크 이벤트 | hr_risk_id, type, source, severity, status, owner |

## 2. Relationship Model

| 관계 | 설명 |
|---|---|
| Tenant → User | 조직 단위에 사용자 소속 |
| User ↔ Employee | 내부 구성원은 User와 Employee를 연결하되 동일 객체로 보지 않음 |
| Matter → Party | 사건과 의뢰인·상대방·대상회사 연결 |
| Matter → Contact | 사건 담당자 및 외부 연락처 연결 |
| Matter → Employee | matter team, role in matter, capacity 연결 |
| Matter → Document | 사건 문서 연결 |
| Matter → Email | filing된 이메일 연결 |
| Email → Attachment → Document | 첨부파일이 문서 객체로 전환 |
| Matter → Task | 사건 업무 연결 |
| Matter → Deadline/Event | 사건 기한 및 일정 연결 |
| Matter → Issue | 쟁점 연결 |
| Issue → Document/Email/Authority/Task | 쟁점의 근거와 실행 연결 |
| Matter → Work Product | 의견서, 계약서, 보고서 등 산출물 연결 |
| Task → Time Entry | 업무수행시간 연결 |
| Employee → Time Entry → Matter | 사람의 workload와 matter 원가 연결 |
| Knowledge Artifact → Source Matter | 지식자산의 출처 matter 연결 |
| Vault Note → Core Object | Obsidian note와 원본 객체 매핑 |
| HR Document → Employee | 인사문서와 구성원 연결 |
| Leave/Attendance/Overtime → Employee | 근태·휴가와 구성원 연결 |
| Candidate → Job Opening → Interview | 채용 흐름 연결 |
| HR Risk Event → Employee/Policy/Document/Matter | HR 리스크와 근거 연결 |
| AI Output → Source Object | AI 결과와 근거자료 연결 |
| Audit Event → Actor/Object/Action | 감사로그 연결 |

## 3. State Model

Matter State: Lead → Conflict Check → Proposal → Engagement → Open → Active → Pending Client / Pending Counterparty → Signing → Closing → Post-closing → Archived.

Document State: Uploaded → Classified → Draft → Internal Review → Client Sent / Counterparty Sent → Counterparty Markup → Final → Execution Copy → Archived / Deprecated.

Issue State: Identified → Under Review → Need Client Input / Need Counterparty Response → Proposed → Negotiating → Escalated → Resolved / Deferred / Dropped → Archived.

Task State: Candidate → To Do → In Progress → In Review / Blocked → Done / Cancelled → Archived.

AI Output State: Generated → Source-linked → Pending Review → Approved / Edited / Rejected → Applied / Superseded → Archived.

Vault Sync State: Not Exported → Exported → Modified Externally → Import Candidate → Conflict Detected → Approved for Import / Rejected → Imported.

Employee State: Candidate → Offer Accepted → Onboarding → Active / Probation → Leave of Absence / Notice Period → Offboarding → Terminated → Archived.

HR Document State: Draft → Pending Review → Pending Signature → Signed → Effective → Expired / Superseded → Archived / Restricted.

Leave Request State: Draft → Submitted → Manager Approved → HR Approved → Used / Rejected / Cancelled / Adjusted.

## 4. Data Lifecycle

| 단계 | 설명 |
|---|---|
| Create | 사용자·시스템·AI 후보가 생성 |
| Classify | 유형, 기밀등급, matter/employee 연결 |
| Use | 업무수행 중 조회·수정·공유 |
| Review | 내부검토, AI candidate 검토, 문서검토 |
| Approve | 사람 승인 후 상태변경 또는 write-back |
| Share | portal 또는 외부송부 |
| Finalize | 최종본, 체결본, 제출본, HR signed document |
| Capture Knowledge | 종결 후 지식화 |
| Archive | matter/employee/candidate 종결 후 보관 |
| Retain/Hold | 보존정책 또는 legal hold 적용 |
| Purge | 보존기간 만료 후 삭제 또는 비식별화 |

## 5. ID 체계 제안

| 객체 | Prefix | 예시 |
|---|---|---|
| Matter | M | M-2026-0001 |
| Document | DOC | DOC-2026-000001 |
| Email | EML | EML-2026-000001 |
| Issue | ISS | ISS-2026-000001 |
| Task | TSK | TSK-2026-000001 |
| Deadline/Event | EVT | EVT-2026-000001 |
| Authority | AUT | AUT-2026-000001 |
| Work Product | WPR | WPR-2026-000001 |
| Employee | EMP | EMP-000001 |
| HR Document | HRD | HRD-2026-000001 |
| Knowledge Artifact | KNO | KNO-2026-000001 |
| Vault Note | VLT | VLT-2026-000001 |
| AI Output | AIO | AIO-2026-000001 |
| Audit Event | AUD | AUD-2026-000001 |

## 6. 데이터모델상 주의사항

1. User와 Employee는 반드시 분리한다.
2. Document 원본 파일은 SharePoint/OneDrive에 두고, matter DB는 file_ref와 metadata만 보유한다.
3. Outlook Email은 graph_message_id, internet_message_id, conversation_id를 모두 저장한다.
4. Issue는 단순 text note가 아니라 관계형 객체다.
5. AI Output은 source, model, risk, review status, applied event를 가져야 한다.
6. HR compensation/evaluation/candidate data는 일반 matter 권한과 별도 guard를 가진다.


---

# 06_권한_보안_감사_거버넌스.md
# matter 권한·보안·감사·거버넌스 명세

문서 버전: v0.1  
작성일: 2026-06-11

## 1. 보안 원칙

matter는 내부용 시스템이지만 고객기밀, 비닉자료, 인사정보, 급여정보, 평가정보, 채용정보, AI 처리로그를 다루므로 enterprise-grade security를 기본값으로 둔다.

## 2. 권한모델

| 권한 영역 | 기본 접근자 | 특수 제한 | 감사로그 필요 여부 |
|---|---|---|---|
| Matter | Matter Team, Lead Lawyer, Admin with policy | Ethical Wall, Need-to-know, Client-restricted | 필수 |
| Document | Matter 권한자 중 문서권한자 | Highly Confidential, Privilege, HR Restricted | 필수 |
| Email | Matter 권한자 중 filing/reading 권한자 | Thread-level restriction, external sender sensitivity | 필수 |
| Issue | Matter 권한자 | 고위험 issue 제한 가능 | 필수 |
| Billing | Partner, Finance, Admin 제한권한 | 개별 수행자 본인 기록만 제한 열람 | 필수 |
| HR Compensation | 본인, Payroll, 제한 HR | 파트너/관리자라도 별도 권한 필요 | 필수 |
| HR Evaluation | 평가자, HR, 지정 관리자 | AI 접근 제한 및 마스킹 | 필수 |
| Candidate | HR, Hiring Manager, Interviewer 제한 | 민감정보·차별요소 접근제어 | 필수 |
| AI Output | 원천데이터 접근권한 보유자 | source scope 초과 금지 | 필수 |
| Vault Export | 별도 export 권한자 | Redacted/encrypted export 기본 | 필수 |

## 3. Role 모델

| Role | 권한요약 |
|---|---|
| System Admin | 시스템 설정, 사용자, 정책, 감사로그 관리. 기밀 matter 내용 접근은 별도 통제 |
| Managing Partner | firm dashboard, matter overview, 제한된 billing/analytics |
| Lead Lawyer | 담당 matter 전체 관리, team, issue, client send approval |
| Matter Lawyer | 배정 matter의 문서, issue, task, email 접근 |
| Junior Lawyer | 배정 matter에서 제한된 작성·검토·task 수행 |
| Paralegal/Staff | 문서정리, filing, schedule, closing 자료 등 제한 권한 |
| HR Admin | employee, HR document, leave, attendance, recruitment, HR risk 관리 |
| Payroll Restricted | compensation/payroll 정보 제한 접근 |
| Client User | 승인된 matter portal 객체만 접근 |
| Employee User | 본인 HR 정보 및 공개 사규 접근 |
| Candidate User | 본인 지원자료 및 채용절차 접근 |
| External Expert | 지정 matter의 지정 문서·task만 접근 |

## 4. Permission Evaluation 순서

1. 사용자 인증 확인.
2. tenant/workspace 확인.
3. object type 확인.
4. object-level policy 확인.
5. matter ACL 또는 employee/HR ACL 확인.
6. Ethical Wall 확인.
7. confidentiality/privilege/HR-sensitive classification 확인.
8. action type 확인: view, edit, download, share, export, AI process, delete.
9. portal projection 여부 확인.
10. audit event 기록.

## 5. Ethical Wall

| 항목 | 요구사항 |
|---|---|
| 대상 | matter, party, document, issue, employee-sensitive file |
| 생성권한 | 관리자 또는 지정 파트너 |
| 효과 | wall 대상 사용자는 검색결과, 링크, AI context, vault export에서 제외 |
| 예외 | emergency override는 별도 승인 및 audit 필수 |
| 검증 | wall 대상 사용자가 API, UI, search, AI, export로 접근 불가해야 함 |

## 6. Audit Event

| 이벤트 | 필수 필드 |
|---|---|
| Login | actor, timestamp, result, device/session |
| Matter View/Edit | actor, matter_id, action, diff summary |
| Document View/Download/Share | actor, document_id, action, recipient, result |
| Email Filing | actor, graph_message_id, matter_id, attachments, result |
| Issue Create/Edit | actor, issue_id, fields_changed |
| Task/Deadline Change | actor, object_id, before/after |
| AI Run | actor, source_scope, model, routing, output_id |
| AI Review | reviewer, output_id, decision, applied_object |
| Vault Export/Import | actor, matter_id, scope, file count, conflict result |
| Portal Access | external_user, object_id, action |
| HR Sensitive Access | actor, employee_id, data_category, reason |
| Permission Change | actor, target, before/after, reason |

## 7. External Sharing 통제

| 공유대상 | 기본정책 |
|---|---|
| 고객 | Client Portal 승인 객체만 접근 |
| 상대방 | 송부본 기록, document status 변경, audit 필수 |
| 외부전문가 | 지정 문서·task만 제한 접근 |
| Obsidian export | 별도 권한, redaction/encryption 옵션, audit 필수 |
| HR 후보자 | candidate portal 내 본인 절차만 접근 |

## 8. Data Retention 및 Legal Hold

| 데이터 | 기본정책 제안 |
|---|---|
| Matter final documents | 장기보존, 삭제 전 승인 |
| Draft documents | retention policy에 따라 보관·정리 |
| Audit logs | 장기보존, 변경불가 저장소 권장 |
| HR documents | 법정·내부 보존기간에 따라 관리 |
| Candidate data | 채용 목적 종료 후 보존·파기 정책 필요 |
| AI prompts/outputs | 민감도별 저장기간 및 마스킹 필요 |

## 9. 보안 Verification Gate

1. 권한 없는 사용자의 직접 URL 접근 차단.
2. 검색결과에서 제한객체 제외.
3. AI context에서 제한객체 제외.
4. SharePoint 공유상태와 matter ACL 불일치 탐지.
5. Portal에서 내부 note, email, AI output 미노출.
6. HR 급여·평가·채용정보 접근제어 통과.
7. audit log 누락 없이 기록.


---

# 07_AI_자동화_모델라우팅_검증정책.md
# matter AI·자동화·모델라우팅·검증정책

문서 버전: v0.1  
작성일: 2026-06-11

## 1. AI 운영 원칙

AI는 matter와 HR의 중앙 의사결정자가 아니라, 권한시스템·rule engine·RAG·감사로그 위에서 작동하는 설명·요약·문서화·후보생성·QC 보조 레이어다.

## 2. AI Model Gateway

| 구성요소 | 책임 |
|---|---|
| Model Registry | 외부 API, private model, local model 목록과 기능·비용·위험도 관리 |
| Data Classification | source data의 confidentiality, privilege, HR sensitivity 판단 |
| Task Risk Classifier | 작업을 Low/Medium/High/Critical로 분류 |
| Routing Policy | 위험도와 민감도에 따라 모델 선택 |
| Prompt Policy | system instruction, allowed tools, output schema 관리 |
| RAG Orchestrator | retriever, reranker, context builder, citation builder |
| Guardrail Layer | PII, salary, evaluation, candidate, legal disclaimer, source required |
| Review Queue | 승인·수정·반려·반영 |
| AI Audit Writer | 모든 AI 처리 이력 저장 |
| Evaluation Harness | regression set, red-team set, output scoring |

## 3. Risk-based Model Routing

| 작업 | 위험도 | 모델 라우팅 | 승인 |
|---|---|---|---|
| 문서 유형 분류 | Low | local/private 우선 | 자동 가능 |
| matter 추천 | Low~Medium | local/private 또는 외부 API | 사용자 확인 권장 |
| 이메일/문서 요약 | Medium | 민감도별 routing | 공식 보고 전 검토 |
| task/deadline 후보 | Medium | private/local 가능 | 승인 후 반영 |
| issue 후보 | High | 고성능 모델 + source trace | 변호사 승인 |
| 계약서 deviation | High | 고성능 모델 + QC | 변호사 승인 |
| 법률 리서치 초안 | High | RAG + authority verification | 변호사 검토 |
| 고객송부본 초안 | Critical | 고성능 모델 가능 | 최종 사람 승인 필수 |
| HR 근태 리스크 설명 | High | rule engine 결과 + LLM 설명 | HR 검토 |
| 급여·연차·근태 산정 | Critical | LLM 사용 금지. rule engine | 사람/정책 검증 |
| 채용·평가·징계 판단 | Critical | AI 자동판단 금지 | 사람 판단 |

## 4. AI Job Lifecycle

1. User request 또는 system trigger 발생.
2. Permission Guard가 사용자와 source 접근권한 확인.
3. Data Scope Resolver가 접근 가능한 source만 선택.
4. Data Classification이 민감도와 금지범위 판정.
5. Task Risk Classifier가 위험도 산정.
6. Model Gateway가 model routing.
7. RAG 또는 prompt context 구성.
8. AI output 생성.
9. Source/Citation 연결.
10. Guardrail filtering.
11. Review Queue 등록.
12. 승인 후 write-back 또는 문서화.
13. AI Audit 및 Ledger 기록.

## 5. AI가 생성 가능한 후보

| 후보 | 반영 방식 |
|---|---|
| Document summary | 자동 저장 가능, 공식 사용 전 검토 |
| Email thread summary | 자동 저장 가능, matter timeline 표시 |
| Task candidate | 승인 후 Task 생성 |
| Deadline candidate | 승인 후 Deadline 생성 |
| Issue candidate | 변호사 승인 후 Issue 생성 |
| RFI match candidate | 실사 담당자 승인 후 RFI 상태 변경 |
| DD red flag candidate | 변호사 검토 후 DD Finding/Issue 생성 |
| Time entry candidate | 수행자 확인 후 등록 |
| HR risk explanation | rule engine 결과를 설명, HR 승인 후 report 포함 |
| Client update draft | 변호사 승인 후 송부 |

## 6. HR AI 특별정책

| 항목 | 정책 |
|---|---|
| HR Assistant | 반드시 RAG 기반, 내부 규정·데이터 근거 필요 |
| 급여 | 계산은 payroll/rule engine, AI는 설명만 가능 |
| 연차·근태 | 산정은 rule engine, AI는 설명·리포트 초안 가능 |
| 채용 | JD, 면접질문, 이력서 요약 가능. 합격/불합격 판단 금지 |
| 평가 | 코멘트 정리 가능. 평가등급 자동부여 금지 |
| 징계·해고 | 자료정리 가능. 판단 금지 |
| 개인정보 | 최소 context, masking, audit 필수 |

## 7. AI Verification Cases

| Case | 내용 |
|---|---|
| AI-VC-001 | source 없는 법률·HR 결론 차단 |
| AI-VC-002 | 권한 없는 source가 prompt context에 포함되지 않음 |
| AI-VC-003 | HR salary/evaluation/candidate guard 적용 |
| AI-VC-004 | task/deadline/issue 후보는 approval 없이 write-back되지 않음 |
| AI-VC-005 | 모델 routing decision이 Model Routing Ledger에 남음 |
| AI-VC-006 | RAG 답변은 citation/source object를 가진다 |
| AI-VC-007 | AI job 실패 시 partial write-back 없음 |
| AI-VC-008 | prompt/output 저장정책과 retention 적용 |

## 8. AI Release Gate

AI 기능은 다음 조건을 충족해야 release 가능하다.

1. source scope 검증.
2. permission 검증.
3. audit event 검증.
4. regression set 통과.
5. high-risk output에 reviewer 지정.
6. rollback 및 disable switch 제공.
7. 사용자에게 AI output 상태가 Generated, Pending Review, Approved 등으로 명확히 표시.


---

# 08_Microsoft_365_Outlook_Addin_Spec.md
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


---

# 09_Obsidian_Matter_Vault_Spec.md
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


---

# 10_Portal_Platform_Spec.md
# matter Portal Platform 명세

문서 버전: v0.1  
작성일: 2026-06-11

## 1. Portal Platform 개요

Portal은 외부 또는 제한 사용자가 matter 내부의 승인된 projection만 접근하도록 하는 경계면이다. Client Portal만 별도 구현하지 말고 Portal Platform으로 일반화한 뒤, Client, Employee, Candidate, External Expert portal을 하위 타입으로 둔다.

## 2. Portal 유형

| Portal | 대상 | 핵심 기능 |
|---|---|---|
| Client Portal | 고객 | 자료요청, 업로드, 공유문서, 승인, Q&A, 일정 |
| Employee Portal | 내부 구성원 | 휴가, 근태, HR 문서, 사규 Q&A, 온보딩 |
| Candidate Portal | 채용후보자 | 지원자료, 면접일정, 개인정보동의, 문서제출 |
| External Expert Portal | 외부전문가 | 지정 matter의 제한 문서·task·Q&A |

## 3. Portal Projection 원칙

내부 객체를 그대로 노출하지 않는다. Portal Service가 외부공개용 projection object를 생성한다.

| 내부 객체 | Portal 표시 |
|---|---|
| Issue | 고객공개용 summary와 client action item만 |
| Task | 외부 사용자 action item만 |
| Document | 공유 승인된 문서만 |
| Email | 원칙적으로 비공개 |
| AI Output | 원칙적으로 비공개, 승인된 summary만 |
| Deadline | 외부 사용자 관련 일정만 |
| Billing | 표시 여부 별도 정책 |
| HR Data | 본인 또는 권한 범위 내 정보만 |

## 4. Client Portal 기능

| 기능 | 설명 |
|---|---|
| Client matter view | 진행상황, 요청자료, 공유문서, 일정 |
| Upload room | 고객자료 업로드 |
| Request list | RFI 또는 일반 요청자료 상태 |
| Shared document room | 검토본, 보고서, 계약서 다운로드 |
| Approval | 계약조건, 제출본, 자료확인 승인 |
| Q&A | 고객 문의 및 답변 |
| Notification | 미제출자료, 승인대기, 기한 알림 |
| Audit | 열람, 다운로드, 업로드, 승인 로그 |

## 5. Employee Portal 기능

| 기능 | 설명 |
|---|---|
| My profile | 본인 정보 확인 |
| Leave request | 휴가신청 |
| Attendance | 출퇴근·근태 확인 |
| HR Documents | 근로계약서, 연봉계약서, 서약서 확인 |
| HR Policy Q&A | 사규·취업규칙 RAG 답변 |
| Onboarding | 입사 체크리스트 |
| Offboarding | 퇴사 체크리스트 |

## 6. Candidate Portal 기능

| 기능 | 설명 |
|---|---|
| Application | 지원자료 제출 |
| Interview schedule | 면접일정 확인 |
| Document submission | 개인정보동의, 이력서, 포트폴리오 제출 |
| Status | 채용단계 표시. 단, 내부 평가정보 미노출 |
| Communication | 안내문·질의응답 |

## 7. Verification Gate

1. portal user가 내부 API로 우회 접근 불가.
2. external projection 외 내부 object 미노출.
3. 공유문서 다운로드와 업로드 audit 기록.
4. link expiry, revocation, watermark 정책 적용.
5. HR portal에서 본인 범위를 초과한 급여·평가·채용정보 미노출.


---

# 11_People_HR_Operations_Spec.md
# matter People & HR Operations 명세

문서 버전: v0.1  
작성일: 2026-06-11

## 1. HR Pillar 위치

People & HR Operations는 matter의 별도 Product Pillar다. HR 데이터는 Matter Graph에 종속되지 않고 People Graph로 독립 존재하되, matter team, workload, time entry, access, onboarding/offboarding, HR legal risk와 필요한 지점에서 Matter Graph와 연결된다.

## 2. 핵심 원칙

| 원칙 | 내용 |
|---|---|
| User ≠ Employee | 로그인 계정과 인사관리 대상을 분리한다. |
| People Graph | Employee, Organization, Role Assignment, HR Document, Leave, Attendance, Recruitment를 그래프로 관리한다. |
| Rule Engine First | 급여·연차·근태·리스크 산정은 deterministic rule engine이 담당한다. |
| AI Explanation Only | LLM은 설명·요약·문서화·후보생성만 수행한다. |
| HR Sensitive Guard | 급여, 평가, 채용, 퇴사, 징계자료는 별도 권한 및 audit 적용. |

## 3. HR Domain 구조

| Domain | Module | 기능 |
|---|---|---|
| People Core | Employee Registry | 구성원 등록, 상태, profile |
| Organization | Org Structure | 팀, practice group, reporting line |
| Employment | Employment Lifecycle | 입사, 재직, 휴직, 수습, 퇴사 |
| HR Documents | HR Document Workspace | 근로계약서, 연봉계약서, 서약서, 동의서 |
| Time & Attendance | Attendance Manager | 출퇴근, 지각, 결근, 재택, 출장 |
| Leave | Leave Manager | 연차, 반차, 병가, 경조휴가 |
| Overtime | Overtime Manager | 사전승인, 사후승인, 미승인 초과근로 |
| Approval | HR Approval Workflow | 휴가, 근태정정, 문서승인 |
| Recruitment | ATS Lite | JD, 후보자, 면접, 평가코멘트 |
| Onboarding | Onboarding Assistant | 입사문서, 교육, 계정, 장비, 멘토 |
| Offboarding | Offboarding Assistant | 인수인계, 계정회수, 장비반납, 기밀유지 |
| HR Policy | Policy Knowledge Base | 취업규칙, 복무규정, 평가규정, 보안규정 |
| HR Risk | HR Legal Risk Copilot | 미체결, 동의누락, 연차촉진, 교육미이수, 초과근로 |
| HR Analytics | People Analytics | 인력, 근태, 휴가, 채용, 리스크 리포트 |
| HR AI | HR Assistant | RAG Q&A, 리포트 초안, 리스크 설명 |
| HR Data Room | HR Data Room Assistant | M&A/노무감사용 HR 자료정리 |

## 4. HR Core Objects

| Object | 주요 필드 |
|---|---|
| Employee | employee_id, name, status, org_unit, position, join_date |
| Employment Profile | employment_type, rank, title, reporting_manager, practice_group |
| HR Document | type, employee_id, status, signed_at, expiry, confidentiality |
| Employment Contract | start_date, position, salary_ref, work_location, contract_status |
| Compensation Record | effective_date, salary, bonus, allowance, restricted_access |
| Leave Balance | year, accrued, used, remaining, carryover |
| Leave Request | type, start, end, days, approver, status |
| Attendance Record | date, check_in, check_out, work_hours, source |
| Overtime Record | date, hours, approval_status, risk_flag |
| HR Policy | policy_type, version, effective_date, source_document |
| Candidate | candidate_id, job_opening_id, status, source, privacy_consent |
| Job Opening | title, department, hiring_manager, status |
| Interview | candidate_id, interviewer, date, feedback_status |
| Onboarding Plan | employee_id, tasks, due_dates, owner |
| Offboarding Plan | employee_id, resignation_date, account_recovery, handover |
| HR Risk Event | risk_type, source, severity, status, owner |

## 5. HR Rule Engine

| 영역 | Rule Engine 책임 |
|---|---|
| 연차 | 발생, 사용, 잔여, 이월, 촉진 대상 |
| 근태 | 소정근로, 연장, 야간, 휴일, 휴게시간 |
| 급여 | 기본급, 수당, 공제, 지급일, 변경이력. 계산 범위는 추가 확정 필요 |
| 결재 | 휴가, 근태정정, 연장근로 승인라인 |
| 교육 | 법정교육 대상, 이수기한, 미이수자 |
| 문서 | 근로계약·연봉계약 미체결자 |
| 개인정보 | 동의 유형, 보유기간, 파기대상 |
| 퇴사 | 계정회수, 장비반납, 인수인계 |
| 리스크 | 계약 미체결, 연차촉진 누락, 초과근로 위험 |

## 6. HR AI 기능

| 기능 | 설명 | 제한 |
|---|---|---|
| HR Assistant | 사규·취업규칙·휴가정책·근태정책 RAG Q&A | 내부근거 없는 답변 금지 |
| HR Document Summary | 근로계약서, 연봉계약서, 동의서 요약 | 템플릿 임의변경 금지 |
| HR Risk Explanation | rule engine 결과 자연어 설명 | 법적 최종판단 금지 |
| HR Report Draft | 월간 인력, 근태, 휴가, 채용, 교육, 리스크 리포트 | 원천 데이터 표시 |
| Recruitment Assistant | JD, 면접질문, 후보자 커뮤니케이션 초안 | 합격/불합격 판단 금지 |
| Onboarding/Offboarding Assistant | 절차 안내, 체크리스트 초안 | 실행은 승인 기반 |
| HR Data Room Assistant | M&A/노무감사 자료 정리 | 개인정보·민감정보 마스킹 필요 |
| Policy Consistency Checker | 취업규칙과 시스템 설정 불일치 후보 | HR/노무 검토 필요 |

## 7. HR 권한

| 데이터 | 접근 가능자 |
|---|---|
| 본인 기본정보 | 본인, HR |
| 본인 근태·휴가 | 본인, 상급자, HR |
| 팀 근태현황 | 팀장, HR |
| 급여정보 | 본인, Payroll 제한권한자, 제한 HR |
| 평가정보 | 평가권자, HR, 지정 관리자 |
| 채용정보 | HR, 채용담당자, 면접관 제한 |
| 근로계약서 | 본인, HR, 제한 관리자 |
| 징계·분쟁자료 | HR, 법무, 지정 파트너 |
| 퇴사자료 | HR, IT, 지정 관리자 |
| HR AI Output | 원천데이터 접근권한 기준 |

## 8. HR Data Room Assistant

| 자료 | 자동정리 후보 |
|---|---|
| 임직원 명부 | 고용형태, 입사일, 직급, 부서 |
| 근로계약 체결현황 | 체결/미체결 |
| 연봉계약 현황 | 최신 계약 여부 |
| 임원 보수·퇴직금 | 정관·주총·계약 확인 필요 표시 |
| 휴가부채 | 미사용연차 |
| 퇴사자 현황 | 퇴사 사유, 분쟁 여부 |
| 노동분쟁 자료 | 징계, 해고, 진정, 소송 |
| 개인정보 동의현황 | 수집·이용, 제3자 제공, 처리위탁, 국외이전 |
| 법정교육 이수현황 | 개인정보, 성희롱, 산업안전 등 |

## 9. HR Verification Gate

1. Employee와 User가 분리되어야 한다.
2. HR 민감정보는 일반 matter 권한만으로 접근 불가.
3. HR Assistant는 사용자 권한 범위 내 데이터만 context로 사용.
4. 급여·연차·근태 계산은 rule engine 결과를 사용.
5. AI는 채용·평가·징계·급여 판단을 확정하지 않는다.
6. HR AI query, source, response, approval, action이 audit에 기록된다.


---

# 12_Practice_Packs_MA_Litigation_Corporate.md
# matter Practice Packs 명세: M&A, Litigation, Corporate Advisory

문서 버전: v0.1  
작성일: 2026-06-11

## 1. Practice Pack 원칙

Practice Pack은 matter core 위에 얹히는 업무유형별 템플릿이다. Core Object를 새로 만들기보다 Matter, Document, Email, Issue, Task, Deadline, Authority, Work Product를 조합하고, 필요한 보조 객체를 추가한다.

## 2. M&A Pack

| Module | 기능 |
|---|---|
| Deal Overview | 거래구조, 당사자, 자문포지션, 거래대금, signing/closing target |
| Process Timeline | NDA, IOI, LOI, DD, SPA, Signing, Closing, Post-closing |
| RFI Tracker | 요청자료, 제출현황, 보완요청, reviewer, status |
| DD Findings | red flag, risk, source document, follow-up, issue link |
| Issue Ledger | 가격, CP, 진술보장, 손해배상, 확약, IPR, CoC |
| CP Checklist | 선행조건 충족 여부 |
| Closing Checklist | 종결서류, 의사록, 위임장, 인감증명서, signature page |
| Disclosure Schedule Tracker | disclosure schedule item, source, related R&W |
| Third-party Consent Tracker | CoC, assignment, license consent |
| Post-closing Obligation | 확약사항, indemnity period, earn-out, non-compete |
| Closing Bible Generator | 최종본 index, execution copy, deliverables 정리 |
| HR Data Room Assistant | 임직원 명부, 계약현황, 휴가부채, 노동분쟁 자료정리 |

## 3. Litigation Pack

| Module | 기능 |
|---|---|
| Case Overview | 법원, 사건번호, 당사자, 청구취지, 절차단계 |
| Procedural Timeline | 소제기, 답변서, 변론기일, 증거신청, 선고 |
| Fact Ledger | 일자별 사실, source, disputed 여부, pleading link |
| Evidence Ledger | 증거번호, 파일, 입증취지, 원본 위치 |
| Issue Ledger | 법률쟁점, 상대방 주장, 반박논리 |
| Authority Ledger | 법령, 판례, 문헌, last checked |
| Argument Map | 주장 → 사실 → 증거 → 법리 → 서면 문단 |
| Pleading Tracker | 소장, 답변서, 준비서면, 증거목록, 제출상태 |
| Hearing Prep | 예상질문, 증인신문, 주요 반박 |
| Judgment Tracker | 판결요지, 항소 여부, 집행 가능성 |

## 4. Corporate Advisory Pack

| Module | 기능 |
|---|---|
| Board/Shareholder Checklist | 소집, 결의요건, 의사록, 이해관계 |
| Self-dealing Checklist | 상법 제398조 등 승인요건 검토 |
| Non-compete/Concurrent Office | 겸직·경업 승인 필요성 |
| Share/Investment | 신주, 구주, 등기, 투자계약, 정관 |
| Officer Compensation | 임원보수, 퇴직금, 주총결의 |
| Privacy Compliance | 동의, 위탁, 제3자 제공, 유출대응 |
| Fair Trade | 표시광고, 하도급, 가맹, 기업결합 |
| Employment/HR Advisory | 근로계약, 파견, 도급, 취업규칙, 징계 |
| Fund/Investment Vehicle | 규약, 출자, 등록, 운용제한 |
| Opinion Builder | checklist → authority → opinion draft |

## 5. Issue Ledger 공통 필드

| 필드 | 설명 |
|---|---|
| Issue ID | 불변 ID |
| Matter ID | 연결 matter |
| Category | 쟁점 유형 |
| Title | 쟁점명 |
| Client Position | 의뢰인 입장 |
| Counterparty Position | 상대방 입장 |
| Legal Analysis | 법률검토 |
| Commercial Analysis | 거래상 판단 |
| Risk Level | High/Medium/Low |
| Status | Identified, Under Review, Need Client Input, Negotiating, Resolved 등 |
| Source Documents | 근거 문서 |
| Source Emails | 근거 이메일 |
| Authorities | 법령·판례·문헌 |
| Proposed Language | 제안 문구 |
| Final Resolution | 최종 결론 |
| Reuse Potential | 지식화 가능성 |

## 6. Practice Pack Verification

1. Pack은 core object와 relation을 사용해야 한다.
2. issue, document, email, authority 간 source traceability가 있어야 한다.
3. 각 checklist item은 status, owner, due date를 가진다.
4. client/counterparty-facing output은 approval gate를 통과해야 한다.
5. 종결 시 Matter Closing Knowledge Pack 후보가 생성되어야 한다.


---

# 13_Drafting_Clause_QC_Spec.md
# matter Drafting, Clause Intelligence, Legal Document QC 명세

문서 버전: v0.1  
작성일: 2026-06-11

## 1. 기본 원칙

문서작성은 생성형 AI 단독이 아니라 template, deal terms, clause library, precedent, issue ledger, legal QC의 조합으로 수행한다. AI는 초안·수정안·설명·검토후보를 생성하되 최종본 확정은 변호사가 한다.

## 2. Drafting Workspace

| 단계 | 설명 |
|---|---|
| 1 | 문서유형 선택: SPA, SHA, SSA, BTA, Memo, Opinion, Pleading 등 |
| 2 | 자문포지션 선택: 매도인, 매수인, 투자자, 대상회사, 원고, 피고 등 |
| 3 | template 선택 |
| 4 | deal terms 또는 case terms 입력 |
| 5 | clause option 선택 |
| 6 | precedent search |
| 7 | draft assembly |
| 8 | defined term, cross-reference, schedule, date, amount QC |
| 9 | drafting note 생성 |
| 10 | internal review |
| 11 | client/counterparty/court send approval |

## 3. Clause Library

| 필드 | 설명 |
|---|---|
| clause_id | 조항 ID |
| clause_type | 손해배상, CP, R&W, drag/tag, ROFR, confidentiality 등 |
| position | 매도인 우호, 매수인 우호, 투자자 우호, 회사 우호, 중립 |
| use_case | 적용 상황 |
| market_strength | strong, medium, weak |
| fallback_clause | 협상 양보안 |
| risk_note | 사용시 주의사항 |
| source_matter | 출처 matter |
| approval_status | draft, reviewed, firm-approved, deprecated |
| last_reviewed | 최종 검토일 |

## 4. Legal Document QC

| QC 영역 | 검증내용 |
|---|---|
| 당사자 | 법인명, 약칭, 주소, 대표자, 서명란 일관성 |
| 날짜 | 체결일, 효력발생일, 종결일, 제출기한, notice period 불일치 |
| 금액 | 숫자/한글 병기, 합계, 비율, 통화 |
| 정의어 | 미정의 용어, 미사용 정의어, 정의어 대소문자/한영 불일치 |
| 조문 참조 | cross-reference, 삭제된 조항 참조, 번호 오류 |
| 별지/부속서 | 존재 여부, 제목, 본문 참조 일치 |
| 법령 | 법령명, 조문번호, 시행 여부 확인 필요 flag |
| 판례 | 사건번호, 선고일, 법원명 형식 |
| 입장 | 매도인/매수인, 원고/피고 관점 혼동 |
| privilege/confidentiality | 외부송부 전 표시 및 공유 가능 여부 |
| HR 문서 | 이름, 입사일, 직책, 근무지, 연봉 변수, 서명상태, 동의항목 |

## 5. AI 사용범위

| 기능 | 허용 | 제한 |
|---|---|---|
| 초안조립 | template 기반 허용 | 임의 조항 생성은 review 필요 |
| 조항 수정안 | 후보 생성 허용 | 변호사 승인 전 반영 금지 |
| deviation 설명 | 허용 | source 표시 필요 |
| 문서 요약 | 허용 | 고객송부 전 검토 필요 |
| HR 문서 | 변수삽입·요약 허용 | 근로계약 중요조항 임의 변경 금지 |
| 법률결론 | 초안 가능 | 최종 결론 자동확정 금지 |

## 6. Verification Gate

1. Draft는 template source와 deal terms를 가져야 한다.
2. AI-generated clause는 review status를 가져야 한다.
3. client/counterparty/court send 전 QC report가 생성되어야 한다.
4. critical QC error가 있으면 send approval 불가.
5. deprecated clause는 경고 없이 사용될 수 없다.
6. execution copy는 controlled document로 보존된다.


---

# 14_Billing_ERP_Analytics_Spec.md
# matter Billing, ERP, Analytics 명세

문서 버전: v0.1  
작성일: 2026-06-11

## 1. 범위

Billing & ERP는 matter별 time entry, fee arrangement, billing record, profitability, capacity, workload를 관리한다. 자체 로펌 내부용이므로 외부 SaaS 구독과 내부 청구·수익성을 구분한다.

## 2. Core Objects

| Object | 주요 필드 |
|---|---|
| Time Entry | employee_id, matter_id, date, duration, description, billable, source, review_status |
| Fee Arrangement | matter_id, fee_type, hourly_rate, fixed_fee, success_fee, retainer, cap |
| Billing Record | matter_id, period, amount, invoice_status, collected_at |
| Matter Budget | expected_fee, expected_hours, budget_owner |
| Rate Card | employee_role, rate, effective_date |
| Activity Signal | document edit, email, meeting, AI job, task completion |
| Profitability Snapshot | matter revenue, cost, hours, realization, margin |

## 3. Time Capture 후보

| source | 후보 생성 |
|---|---|
| Document edit | 문서검토·작성 후보 |
| Email filing/reply | 고객·상대방 커뮤니케이션 후보 |
| Meeting | 회의 참석 및 회의록 후보 |
| Research | 리서치 시간 후보 |
| AI review | AI 초안 검토·수정 시간 후보 |
| Task completion | task 수행시간 후보 |
| Closing activity | closing checklist 처리시간 후보 |

## 4. Billing Workflow

1. Activity signal 수집.
2. Time candidate 생성.
3. 수행자가 확인·수정.
4. billable/non-billable 분류.
5. partner review.
6. billing record 또는 invoice candidate 생성.
7. 수금/정산 상태 반영.
8. profitability dashboard 갱신.

## 5. Analytics

| Dashboard | 내용 |
|---|---|
| Matter Profitability | budget vs actual, fixed fee 소진율, margin |
| Lawyer Workload | employee별 task, time, deadline, availability |
| Practice Performance | M&A/분쟁/자문별 매출·시간·수익성 |
| Client Relationship | 고객별 matter, revenue, outstanding, response delay |
| HR Capacity | 휴가, 근태, workload, 채용필요 |
| Billing Leakage | 활동 대비 time entry 누락 후보 |

## 6. 제한

1. AI가 time entry를 자동확정하지 않는다.
2. billing amount는 partner/finance approval 전 확정하지 않는다.
3. HR compensation data와 billing rate는 별도 권한을 적용한다.
4. 외부 고객에게 billing 정보를 표시할지는 별도 정책으로 정한다.


---

# 15_릴리스_로드맵_DBS.md
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


---

# 16_Execution_Dependency_Graph.md
# matter Execution Dependency Graph 설계

문서 버전: v0.1  
작성일: 2026-06-11

## 1. Edge 유형

| Edge | 의미 | 예시 |
|---|---|---|
| Dependency Edge | 선행 구현 필요 | Document는 Matter가 있어야 생성 가능 |
| Blocking Edge | 미완료 시 후속작업 차단 | ACL 미완료 시 Portal/AI/Vault export 차단 |
| Parallel Edge | 병렬 가능 | Matter UI와 Party UI는 Core schema 이후 병렬 가능 |
| Conflict Edge | 동시진행 시 충돌 가능 | Document metadata schema와 AI extraction schema 병행 변경 |
| Verification Edge | 검증이 후속조건 | 권한검증 통과 후 Client Portal 개발 |
| Regression Edge | 변경 시 기존 기능 회귀검증 | Issue state 변경 시 Matter Home, AI, Vault 회귀 |
| Escalation Edge | 위험 발생 시 상위검토 | AI 법률결론 후보 발생 시 Governor 검토 |
| Feedback Edge | 사용자피드백 반영 | RFI tracker 사용 후 field 개선 |
| Loop Edge | 반복개선 | AI extraction 실패 → Learning Ledger → prompt/schema 개선 |

## 2. 선행 Node

| Node | 이유 |
|---|---|
| Product Constitution | 기준 없는 구현 방지 |
| Core Object ID System | 모든 관계의 기반 |
| User/Employee Separation | HR 및 권한 충돌 방지 |
| Matter Schema | 시스템 중심 객체 |
| Permission Model | DMS, Portal, AI, HR의 전제 |
| Audit Event Schema | 나중에 소급구현 불가 |
| Document Metadata Schema | DMS, AI, Search, Vault의 기반 |
| Issue State Model | Practice pack의 핵심 |
| Task/Deadline State Model | Workflow의 핵심 |
| AI Output State Model | AI 승인흐름의 기반 |
| Verification Contract Template | TUW 완료기준 통일 |

## 3. 후행 Node

| Node | 후행 이유 |
|---|---|
| AI legal research assistant | source, authority, review queue 선행 필요 |
| Bidirectional Obsidian sync | export/import/diff 안정화 후 |
| Client Portal full release | ACL, projection, audit 선행 필요 |
| Billing automation | activity signal 및 time entry 안정화 후 |
| Clause recommendation | clause library와 knowledge 축적 후 |
| Smart Alerts hard block | Outlook MVP와 policy 안정화 후 |
| HR advanced AI | HR rule engine 및 guardrail 선행 필요 |
| Enterprise DLP | core data classification 이후 |

## 4. 주요 Dependency Chain

Chain A: Product Constitution → Core Object → ACL → Audit → Portal/AI/Vault.

Chain B: Matter → Document → SharePoint file_ref → Search Index → AI RAG → Legal QC.

Chain C: Outlook Add-in shell → Auth → Matter lookup → Email metadata → Email filing → Attachment saving → Audit → AI candidates.

Chain D: User/Employee separation → HR sensitivity → HR Document → HR Rule Engine → HR Assistant → HR Risk Copilot.

Chain E: Issue object → Issue relation → M&A RFI/DD → Closing checklist → Matter Closing Knowledge Pack.

## 5. Regression Map

| 변경 | 회귀검증 대상 |
|---|---|
| Matter state 변경 | Matter Home, Work Queue, Portal, Analytics |
| Document metadata 변경 | DMS, Search, AI extraction, Vault export, QC |
| Permission policy 변경 | UI, API, Search, Portal, AI, Vault, HR |
| Issue state 변경 | Issue Ledger, Matter Home, Practice Pack, Knowledge Pack |
| Employee model 변경 | HR, User/Role, Billing, Workload, Matter team |
| AI prompt/routing 변경 | AI output quality, guardrail, audit, regression set |


---

# 17_TUW_표준_및_ID_체계.md
# matter TUW 표준 및 ID 체계

문서 버전: v0.1  
작성일: 2026-06-11

## 1. 용어

Testable Unit of Work, TUW는 독립적으로 구현·검증 가능한 최소 실행 단위다. 하나의 TUW는 기능, 권한, 감사, 보안, 회귀, 문서화 검증을 포함해야 한다.

## 2. TUW ID 형식

MAT-[Pillar Prefix]-[Domain Code]-[Module Code]-TUW-[번호]

예시: MAT-OUT-EML-FILE-TUW-001

## 3. Pillar Prefix

| Pillar | Prefix |
|---|---|
| Development Operating System | DOS |
| Matter Core Platform | MTR |
| Identity, Permission & Security | SEC |
| Microsoft DMS & Email Layer | MSD |
| Outlook Layer | OUT |
| Workflow & Collaboration | WFL |
| Issue & Legal Execution | ISX |
| Portal Platform | CPT |
| Knowledge & Obsidian Matter Vault | KGV |
| AI & Automation | AIA |
| Drafting & Clause Intelligence | DCI |
| Billing & ERP | BER |
| Admin & Governance | ADM |
| Integration & Sync | INT |
| Enterprise Hardening | ENT |
| People & HR Operations | HRO |

## 4. TUW 표준 필드

| 필드 | 설명 |
|---|---|
| Work ID | TUW 고유 ID |
| Pillar | 소속 Product Pillar |
| Domain | 소속 Domain |
| Module | 소속 Module |
| Capability | 시스템 능력 |
| Feature | 사용자 또는 시스템 기능 |
| Epic | 상위 개발 단위 |
| Story | User Story 또는 System Story |
| Objective | 이 TUW의 목적 |
| User/System Value | 사용자 또는 시스템 가치 |
| Specification Source | 사양명세서 근거 |
| Inputs | 입력값, 선행자료, source data |
| Outputs | 산출물, API, UI, DB record, event |
| Files to Read | 읽어야 할 파일 또는 모듈 |
| Files to Modify | 수정 가능한 파일 또는 모듈 |
| Files Not to Modify | 수정 금지 영역 |
| Dependencies | 선행 TUW 또는 객체 |
| Risk Level | Low / Medium / High / Critical |
| Model Routing | 위험도 기반 모델 배정 |
| Permission Impact | 권한 영향 |
| Audit Impact | 감사로그 영향 |
| AI Impact | AI 관련 영향 |
| Security Constraints | 보안 제약 |
| Performance Constraints | 성능 제약 |
| Verification Contract | 검증계약 |
| Verification Cases | 자동·수동 검증항목 |
| Loop Budget | 허용 반복 루프 수 |
| Stop Condition | 중단 조건 |
| Escalation Rule | 상위검토 조건 |
| Completion Gate | 완료조건 |

## 5. Risk Level 기준

| Risk | 기준 |
|---|---|
| Low | 내부 UI, 읽기전용, 민감정보 없음 |
| Medium | 일반 업무상태 변경, 제한적 audit 필요 |
| High | 문서, 이메일, issue, portal, billing, HR 일반정보 처리 |
| Critical | 권한, 보안, AI, 외부공유, HR 민감정보, billing 확정, legal final output |

## 6. Completion Gate 공통

1. 기능 요구사항 충족.
2. 권한검증 통과.
3. audit event 기록.
4. 데이터 무결성 검증.
5. 에러 처리 및 rollback 확인.
6. regression case 통과.
7. 관련 문서 업데이트.
8. Decision/Execution/Learning Ledger 필요시 기록.


---

# 18_TUW_초기_백로그.md
# matter TUW 초기 백로그

문서 버전: v0.1  
작성일: 2026-06-11

## 1. 사용방법

이 백로그는 전체 구현을 위한 초기 단위작업 목록이다. 각 항목은 실제 개발 전에 17_TUW_표준_및_ID_체계.md의 표준 필드 전체를 채운 상세 TUW로 확장해야 한다.

## 2. 초기 TUW 목록

| Work ID | Part | 작업내용 | Dependencies | Risk | Completion Gate |
|---|---|---|---|---|---|
| MAT-DOS-DEVE-TUW-001 | Part 0 Development OS | Product Constitution registry | 선행 객체·권한·감사로그 검토 후 구현 | Medium | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-DOS-DEVE-TUW-002 | Part 0 Development OS | PBS/DBS/WBS registry | 선행 객체·권한·감사로그 검토 후 구현 | Medium | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-DOS-DEVE-TUW-003 | Part 0 Development OS | TUW ID system | 선행 객체·권한·감사로그 검토 후 구현 | Medium | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-DOS-DEVE-TUW-004 | Part 0 Development OS | TUW template | 선행 객체·권한·감사로그 검토 후 구현 | Medium | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-DOS-DEVE-TUW-005 | Part 0 Development OS | Verification Contract template | 선행 객체·권한·감사로그 검토 후 구현 | Medium | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-DOS-DEVE-TUW-006 | Part 0 Development OS | Verification Case registry | 선행 객체·권한·감사로그 검토 후 구현 | Medium | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-DOS-DEVE-TUW-007 | Part 0 Development OS | Decision Ledger | 선행 객체·권한·감사로그 검토 후 구현 | Medium | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-DOS-DEVE-TUW-008 | Part 0 Development OS | Execution Ledger | 선행 객체·권한·감사로그 검토 후 구현 | Medium | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-DOS-DEVE-TUW-009 | Part 0 Development OS | Learning Ledger | 선행 객체·권한·감사로그 검토 후 구현 | Medium | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-DOS-DEVE-TUW-010 | Part 0 Development OS | Risk-based Model Routing policy | 선행 객체·권한·감사로그 검토 후 구현 | Medium | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-DOS-DEVE-TUW-011 | Part 0 Development OS | Loop operation policy | 선행 객체·권한·감사로그 검토 후 구현 | Medium | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-DOS-DEVE-TUW-012 | Part 0 Development OS | Agent Work Contract template | 선행 객체·권한·감사로그 검토 후 구현 | Medium | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-MTR-MATT-TUW-001 | Part 1 Matter Core | Matter ID system | 선행 객체·권한·감사로그 검토 후 구현 | Medium | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-MTR-MATT-TUW-002 | Part 1 Matter Core | Matter type/subtype taxonomy | 선행 객체·권한·감사로그 검토 후 구현 | Medium | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-MTR-MATT-TUW-003 | Part 1 Matter Core | Matter lifecycle state engine | 선행 객체·권한·감사로그 검토 후 구현 | Medium | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-MTR-MATT-TUW-004 | Part 1 Matter Core | Matter registry | 선행 객체·권한·감사로그 검토 후 구현 | Medium | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-MTR-MATT-TUW-005 | Part 1 Matter Core | Party registry | 선행 객체·권한·감사로그 검토 후 구현 | Medium | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-MTR-MATT-TUW-006 | Part 1 Matter Core | Contact registry | 선행 객체·권한·감사로그 검토 후 구현 | Medium | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-MTR-MATT-TUW-007 | Part 1 Matter Core | Matter relationship model | 선행 객체·권한·감사로그 검토 후 구현 | Medium | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-MTR-MATT-TUW-008 | Part 1 Matter Core | Matter Home base | 선행 객체·권한·감사로그 검토 후 구현 | Medium | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-MTR-MATT-TUW-009 | Part 1 Matter Core | Matter timeline base | 선행 객체·권한·감사로그 검토 후 구현 | Medium | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-MTR-MATT-TUW-010 | Part 1 Matter Core | Matter team assignment | 선행 객체·권한·감사로그 검토 후 구현 | Medium | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-MTR-MATT-TUW-011 | Part 1 Matter Core | Matter search | 선행 객체·권한·감사로그 검토 후 구현 | Medium | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-MTR-MATT-TUW-012 | Part 1 Matter Core | Matter archive | 선행 객체·권한·감사로그 검토 후 구현 | Medium | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-SEC-SECU-TUW-001 | Part 2 Security | User model | 선행 객체·권한·감사로그 검토 후 구현 | Critical | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-SEC-SECU-TUW-002 | Part 2 Security | Role model | 선행 객체·권한·감사로그 검토 후 구현 | Critical | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-SEC-SECU-TUW-003 | Part 2 Security | Matter-level ACL | 선행 객체·권한·감사로그 검토 후 구현 | Critical | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-SEC-SECU-TUW-004 | Part 2 Security | Document-level ACL | 선행 객체·권한·감사로그 검토 후 구현 | Critical | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-SEC-SECU-TUW-005 | Part 2 Security | Ethical Wall | 선행 객체·권한·감사로그 검토 후 구현 | Critical | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-SEC-SECU-TUW-006 | Part 2 Security | Confidentiality classification | 선행 객체·권한·감사로그 검토 후 구현 | Critical | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-SEC-SECU-TUW-007 | Part 2 Security | Privilege flag | 선행 객체·권한·감사로그 검토 후 구현 | Critical | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-SEC-SECU-TUW-008 | Part 2 Security | Audit Event schema | 선행 객체·권한·감사로그 검토 후 구현 | Critical | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-SEC-SECU-TUW-009 | Part 2 Security | Permission guard middleware | 선행 객체·권한·감사로그 검토 후 구현 | Critical | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-SEC-SECU-TUW-010 | Part 2 Security | Export permission | 선행 객체·권한·감사로그 검토 후 구현 | Critical | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-SEC-SECU-TUW-011 | Part 2 Security | AI permission boundary | 선행 객체·권한·감사로그 검토 후 구현 | Critical | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-SEC-SECU-TUW-012 | Part 2 Security | Access review report | 선행 객체·권한·감사로그 검토 후 구현 | Critical | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-MSD-MICR-TUW-001 | Part 3 Microsoft DMS | Microsoft Graph auth | 선행 객체·권한·감사로그 검토 후 구현 | High | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-MSD-MICR-TUW-002 | Part 3 Microsoft DMS | SharePoint site mapping | 선행 객체·권한·감사로그 검토 후 구현 | High | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-MSD-MICR-TUW-003 | Part 3 Microsoft DMS | OneDrive file reference model | 선행 객체·권한·감사로그 검토 후 구현 | High | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-MSD-MICR-TUW-004 | Part 3 Microsoft DMS | Document object mapping | 선행 객체·권한·감사로그 검토 후 구현 | High | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-MSD-MICR-TUW-005 | Part 3 Microsoft DMS | Folder-to-matter mapping | 선행 객체·권한·감사로그 검토 후 구현 | High | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-MSD-MICR-TUW-006 | Part 3 Microsoft DMS | Document metadata | 선행 객체·권한·감사로그 검토 후 구현 | High | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-MSD-MICR-TUW-007 | Part 3 Microsoft DMS | Document version mapping | 선행 객체·권한·감사로그 검토 후 구현 | High | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-MSD-MICR-TUW-008 | Part 3 Microsoft DMS | Document status engine | 선행 객체·권한·감사로그 검토 후 구현 | High | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-MSD-MICR-TUW-009 | Part 3 Microsoft DMS | File permission sync | 선행 객체·권한·감사로그 검토 후 구현 | Critical | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-MSD-MICR-TUW-010 | Part 3 Microsoft DMS | Search indexing | 선행 객체·권한·감사로그 검토 후 구현 | High | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-MSD-MICR-TUW-011 | Part 3 Microsoft DMS | Document audit | 선행 객체·권한·감사로그 검토 후 구현 | Critical | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-MSD-MICR-TUW-012 | Part 3 Microsoft DMS | Controlled document policy | 선행 객체·권한·감사로그 검토 후 구현 | High | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-OUT-OUTL-TUW-001 | Part 4 Outlook Add-in | Add-in manifest | 선행 객체·권한·감사로그 검토 후 구현 | High | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-OUT-OUTL-TUW-002 | Part 4 Outlook Add-in | Task pane shell | 선행 객체·권한·감사로그 검토 후 구현 | High | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-OUT-OUTL-TUW-003 | Part 4 Outlook Add-in | MSAL/NAA auth | 선행 객체·권한·감사로그 검토 후 구현 | High | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-OUT-OUTL-TUW-004 | Part 4 Outlook Add-in | Matter lookup in Outlook | 선행 객체·권한·감사로그 검토 후 구현 | High | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-OUT-OUTL-TUW-005 | Part 4 Outlook Add-in | Read current email metadata | 선행 객체·권한·감사로그 검토 후 구현 | Critical | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-OUT-OUTL-TUW-006 | Part 4 Outlook Add-in | File email to matter | 선행 객체·권한·감사로그 검토 후 구현 | Critical | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-OUT-OUTL-TUW-007 | Part 4 Outlook Add-in | Attachment list | 선행 객체·권한·감사로그 검토 후 구현 | High | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-OUT-OUTL-TUW-008 | Part 4 Outlook Add-in | Save attachments to SharePoint | 선행 객체·권한·감사로그 검토 후 구현 | High | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-OUT-OUTL-TUW-009 | Part 4 Outlook Add-in | Email-thread mapping | 선행 객체·권한·감사로그 검토 후 구현 | Critical | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-OUT-OUTL-TUW-010 | Part 4 Outlook Add-in | Email audit | 선행 객체·권한·감사로그 검토 후 구현 | Critical | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-OUT-OUTL-TUW-011 | Part 4 Outlook Add-in | Create task from email | 선행 객체·권한·감사로그 검토 후 구현 | Critical | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-OUT-OUTL-TUW-012 | Part 4 Outlook Add-in | Create deadline from email | 선행 객체·권한·감사로그 검토 후 구현 | Critical | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-OUT-OUTL-TUW-013 | Part 4 Outlook Add-in | Create issue from email | 선행 객체·권한·감사로그 검토 후 구현 | Critical | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-OUT-OUTL-TUW-014 | Part 4 Outlook Add-in | Email AI summary candidate | 선행 객체·권한·감사로그 검토 후 구현 | Critical | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-OUT-OUTL-TUW-015 | Part 4 Outlook Add-in | Compose mode matter tagging | 선행 객체·권한·감사로그 검토 후 구현 | High | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-OUT-OUTL-TUW-016 | Part 4 Outlook Add-in | Smart Alerts MVP | 선행 객체·권한·감사로그 검토 후 구현 | High | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-WFL-WORK-TUW-001 | Part 5 Workflow | Task object | 선행 객체·권한·감사로그 검토 후 구현 | Medium | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-WFL-WORK-TUW-002 | Part 5 Workflow | Task state engine | 선행 객체·권한·감사로그 검토 후 구현 | Medium | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-WFL-WORK-TUW-003 | Part 5 Workflow | Deadline object | 선행 객체·권한·감사로그 검토 후 구현 | Medium | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-WFL-WORK-TUW-004 | Part 5 Workflow | Event/calendar model | 선행 객체·권한·감사로그 검토 후 구현 | Medium | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-WFL-WORK-TUW-005 | Part 5 Workflow | Work Queue | 선행 객체·권한·감사로그 검토 후 구현 | Medium | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-WFL-WORK-TUW-006 | Part 5 Workflow | Review Queue | 선행 객체·권한·감사로그 검토 후 구현 | Medium | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-WFL-WORK-TUW-007 | Part 5 Workflow | Meeting note | 선행 객체·권한·감사로그 검토 후 구현 | Medium | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-WFL-WORK-TUW-008 | Part 5 Workflow | Approval flow | 선행 객체·권한·감사로그 검토 후 구현 | Medium | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-WFL-WORK-TUW-009 | Part 5 Workflow | Notification engine | 선행 객체·권한·감사로그 검토 후 구현 | Medium | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-WFL-WORK-TUW-010 | Part 5 Workflow | Matter Home integration | 선행 객체·권한·감사로그 검토 후 구현 | Medium | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-WFL-WORK-TUW-011 | Part 5 Workflow | Overdue dashboard | 선행 객체·권한·감사로그 검토 후 구현 | Medium | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-WFL-WORK-TUW-012 | Part 5 Workflow | Workload view | 선행 객체·권한·감사로그 검토 후 구현 | Medium | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-ISX-ISSU-TUW-001 | Part 6 Issue & Practice | Issue object | 선행 객체·권한·감사로그 검토 후 구현 | High | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-ISX-ISSU-TUW-002 | Part 6 Issue & Practice | Issue state model | 선행 객체·권한·감사로그 검토 후 구현 | High | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-ISX-ISSU-TUW-003 | Part 6 Issue & Practice | Issue relationship model | 선행 객체·권한·감사로그 검토 후 구현 | High | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-ISX-ISSU-TUW-004 | Part 6 Issue & Practice | M&A workspace | 선행 객체·권한·감사로그 검토 후 구현 | High | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-ISX-ISSU-TUW-005 | Part 6 Issue & Practice | RFI tracker | 선행 객체·권한·감사로그 검토 후 구현 | High | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-ISX-ISSU-TUW-006 | Part 6 Issue & Practice | DD finding register | 선행 객체·권한·감사로그 검토 후 구현 | High | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-ISX-ISSU-TUW-007 | Part 6 Issue & Practice | CP checklist | 선행 객체·권한·감사로그 검토 후 구현 | High | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-ISX-ISSU-TUW-008 | Part 6 Issue & Practice | Closing checklist | 선행 객체·권한·감사로그 검토 후 구현 | High | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-ISX-ISSU-TUW-009 | Part 6 Issue & Practice | Disclosure schedule tracker | 선행 객체·권한·감사로그 검토 후 구현 | High | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-ISX-ISSU-TUW-010 | Part 6 Issue & Practice | Litigation fact ledger | 선행 객체·권한·감사로그 검토 후 구현 | High | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-ISX-ISSU-TUW-011 | Part 6 Issue & Practice | Evidence ledger | 선행 객체·권한·감사로그 검토 후 구현 | High | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-ISX-ISSU-TUW-012 | Part 6 Issue & Practice | Pleading tracker | 선행 객체·권한·감사로그 검토 후 구현 | High | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-ISX-ISSU-TUW-013 | Part 6 Issue & Practice | Corporate advisory checklist | 선행 객체·권한·감사로그 검토 후 구현 | High | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-ISX-ISSU-TUW-014 | Part 6 Issue & Practice | Authority ledger | 선행 객체·권한·감사로그 검토 후 구현 | High | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-CPT-PORT-TUW-001 | Part 7 Portal | External user model | 선행 객체·권한·감사로그 검토 후 구현 | Medium | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-CPT-PORT-TUW-002 | Part 7 Portal | Portal permission boundary | 선행 객체·권한·감사로그 검토 후 구현 | Critical | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-CPT-PORT-TUW-003 | Part 7 Portal | Client matter view | 선행 객체·권한·감사로그 검토 후 구현 | Medium | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-CPT-PORT-TUW-004 | Part 7 Portal | Client upload room | 선행 객체·권한·감사로그 검토 후 구현 | Medium | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-CPT-PORT-TUW-005 | Part 7 Portal | Request list | 선행 객체·권한·감사로그 검토 후 구현 | Medium | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-CPT-PORT-TUW-006 | Part 7 Portal | Shared document room | 선행 객체·권한·감사로그 검토 후 구현 | Medium | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-CPT-PORT-TUW-007 | Part 7 Portal | Client approval | 선행 객체·권한·감사로그 검토 후 구현 | Medium | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-CPT-PORT-TUW-008 | Part 7 Portal | Client Q&A | 선행 객체·권한·감사로그 검토 후 구현 | Medium | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-CPT-PORT-TUW-009 | Part 7 Portal | Portal audit | 선행 객체·권한·감사로그 검토 후 구현 | Critical | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-CPT-PORT-TUW-010 | Part 7 Portal | Portal notification | 선행 객체·권한·감사로그 검토 후 구현 | Medium | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-CPT-PORT-TUW-011 | Part 7 Portal | Employee portal shell | 선행 객체·권한·감사로그 검토 후 구현 | Medium | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-CPT-PORT-TUW-012 | Part 7 Portal | Candidate portal shell | 선행 객체·권한·감사로그 검토 후 구현 | Medium | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-KGV-KNOW-TUW-001 | Part 8 Knowledge & Vault | Knowledge artifact object | 선행 객체·권한·감사로그 검토 후 구현 | Medium | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-KGV-KNOW-TUW-002 | Part 8 Knowledge & Vault | Clause object | 선행 객체·권한·감사로그 검토 후 구현 | Medium | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-KGV-KNOW-TUW-003 | Part 8 Knowledge & Vault | Authority object | 선행 객체·권한·감사로그 검토 후 구현 | Medium | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-KGV-KNOW-TUW-004 | Part 8 Knowledge & Vault | Knowledge approval state | 선행 객체·권한·감사로그 검토 후 구현 | Medium | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-KGV-KNOW-TUW-005 | Part 8 Knowledge & Vault | Matter closing knowledge pack | 선행 객체·권한·감사로그 검토 후 구현 | Medium | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-KGV-KNOW-TUW-006 | Part 8 Knowledge & Vault | Markdown export schema | 선행 객체·권한·감사로그 검토 후 구현 | Medium | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-KGV-KNOW-TUW-007 | Part 8 Knowledge & Vault | YAML frontmatter schema | 선행 객체·권한·감사로그 검토 후 구현 | Medium | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-KGV-KNOW-TUW-008 | Part 8 Knowledge & Vault | Wikilink mapping | 선행 객체·권한·감사로그 검토 후 구현 | Medium | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-KGV-KNOW-TUW-009 | Part 8 Knowledge & Vault | Canvas generator | 선행 객체·권한·감사로그 검토 후 구현 | Medium | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-KGV-KNOW-TUW-010 | Part 8 Knowledge & Vault | Redacted export | 선행 객체·권한·감사로그 검토 후 구현 | Medium | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-KGV-KNOW-TUW-011 | Part 8 Knowledge & Vault | Encrypted vault export | 선행 객체·권한·감사로그 검토 후 구현 | Medium | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-KGV-KNOW-TUW-012 | Part 8 Knowledge & Vault | Controlled import | 선행 객체·권한·감사로그 검토 후 구현 | Medium | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-KGV-KNOW-TUW-013 | Part 8 Knowledge & Vault | Conflict detection | 선행 객체·권한·감사로그 검토 후 구현 | Medium | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-KGV-KNOW-TUW-014 | Part 8 Knowledge & Vault | Bidirectional sync | 선행 객체·권한·감사로그 검토 후 구현 | Medium | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-KGV-KNOW-TUW-015 | Part 8 Knowledge & Vault | Local vault connector | 선행 객체·권한·감사로그 검토 후 구현 | Medium | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-AIA-AIAN-TUW-001 | Part 9 AI & Automation | AI Model Gateway | 선행 객체·권한·감사로그 검토 후 구현 | Critical | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-AIA-AIAN-TUW-002 | Part 9 AI & Automation | Model Registry | 선행 객체·권한·감사로그 검토 후 구현 | Critical | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-AIA-AIAN-TUW-003 | Part 9 AI & Automation | Data classification for AI | 선행 객체·권한·감사로그 검토 후 구현 | Critical | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-AIA-AIAN-TUW-004 | Part 9 AI & Automation | Task risk classifier | 선행 객체·권한·감사로그 검토 후 구현 | Critical | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-AIA-AIAN-TUW-005 | Part 9 AI & Automation | Routing policy | 선행 객체·권한·감사로그 검토 후 구현 | Critical | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-AIA-AIAN-TUW-006 | Part 9 AI & Automation | Document classification | 선행 객체·권한·감사로그 검토 후 구현 | Critical | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-AIA-AIAN-TUW-007 | Part 9 AI & Automation | Email classification | 선행 객체·권한·감사로그 검토 후 구현 | Critical | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-AIA-AIAN-TUW-008 | Part 9 AI & Automation | Summary engine | 선행 객체·권한·감사로그 검토 후 구현 | Critical | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-AIA-AIAN-TUW-009 | Part 9 AI & Automation | Extraction engine | 선행 객체·권한·감사로그 검토 후 구현 | Critical | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-AIA-AIAN-TUW-010 | Part 9 AI & Automation | Candidate generation | 선행 객체·권한·감사로그 검토 후 구현 | Critical | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-AIA-AIAN-TUW-011 | Part 9 AI & Automation | Legal Document QC | 선행 객체·권한·감사로그 검토 후 구현 | Critical | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-AIA-AIAN-TUW-012 | Part 9 AI & Automation | Contract deviation analysis | 선행 객체·권한·감사로그 검토 후 구현 | Critical | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-AIA-AIAN-TUW-013 | Part 9 AI & Automation | AI review queue | 선행 객체·권한·감사로그 검토 후 구현 | Critical | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-AIA-AIAN-TUW-014 | Part 9 AI & Automation | AI audit ledger | 선행 객체·권한·감사로그 검토 후 구현 | Critical | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-AIA-AIAN-TUW-015 | Part 9 AI & Automation | AI regression verification | 선행 객체·권한·감사로그 검토 후 구현 | Critical | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-AIA-AIAN-TUW-016 | Part 9 AI & Automation | RAG orchestrator | 선행 객체·권한·감사로그 검토 후 구현 | Critical | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-DCI-DRAF-TUW-001 | Part 10 Drafting | Template registry | 선행 객체·권한·감사로그 검토 후 구현 | Medium | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-DCI-DRAF-TUW-002 | Part 10 Drafting | Clause library | 선행 객체·권한·감사로그 검토 후 구현 | Medium | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-DCI-DRAF-TUW-003 | Part 10 Drafting | Clause taxonomy | 선행 객체·권한·감사로그 검토 후 구현 | Medium | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-DCI-DRAF-TUW-004 | Part 10 Drafting | Deal terms mapper | 선행 객체·권한·감사로그 검토 후 구현 | Medium | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-DCI-DRAF-TUW-005 | Part 10 Drafting | Draft assembly | 선행 객체·권한·감사로그 검토 후 구현 | Medium | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-DCI-DRAF-TUW-006 | Part 10 Drafting | Precedent search | 선행 객체·권한·감사로그 검토 후 구현 | Medium | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-DCI-DRAF-TUW-007 | Part 10 Drafting | Defined term checker | 선행 객체·권한·감사로그 검토 후 구현 | Medium | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-DCI-DRAF-TUW-008 | Part 10 Drafting | Cross-reference checker | 선행 객체·권한·감사로그 검토 후 구현 | Medium | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-DCI-DRAF-TUW-009 | Part 10 Drafting | Schedule/exhibit checker | 선행 객체·권한·감사로그 검토 후 구현 | Medium | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-DCI-DRAF-TUW-010 | Part 10 Drafting | Markup assistant | 선행 객체·권한·감사로그 검토 후 구현 | Medium | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-DCI-DRAF-TUW-011 | Part 10 Drafting | Drafting note generator | 선행 객체·권한·감사로그 검토 후 구현 | Medium | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-DCI-DRAF-TUW-012 | Part 10 Drafting | Client send approval | 선행 객체·권한·감사로그 검토 후 구현 | Medium | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-BER-BILL-TUW-001 | Part 11 Billing | Time entry object | 선행 객체·권한·감사로그 검토 후 구현 | Medium | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-BER-BILL-TUW-002 | Part 11 Billing | Activity-to-time candidate | 선행 객체·권한·감사로그 검토 후 구현 | Medium | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-BER-BILL-TUW-003 | Part 11 Billing | Fee arrangement | 선행 객체·권한·감사로그 검토 후 구현 | Medium | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-BER-BILL-TUW-004 | Part 11 Billing | Billing record | 선행 객체·권한·감사로그 검토 후 구현 | Medium | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-BER-BILL-TUW-005 | Part 11 Billing | Invoice candidate | 선행 객체·권한·감사로그 검토 후 구현 | Medium | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-BER-BILL-TUW-006 | Part 11 Billing | Matter budget | 선행 객체·권한·감사로그 검토 후 구현 | Medium | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-BER-BILL-TUW-007 | Part 11 Billing | Profitability dashboard | 선행 객체·권한·감사로그 검토 후 구현 | Medium | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-BER-BILL-TUW-008 | Part 11 Billing | Partner review | 선행 객체·권한·감사로그 검토 후 구현 | Medium | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-BER-BILL-TUW-009 | Part 11 Billing | Non-billable classification | 선행 객체·권한·감사로그 검토 후 구현 | Medium | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-BER-BILL-TUW-010 | Part 11 Billing | Billing audit | 선행 객체·권한·감사로그 검토 후 구현 | Critical | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-BER-BILL-TUW-011 | Part 11 Billing | Capacity analysis | 선행 객체·권한·감사로그 검토 후 구현 | Medium | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-BER-BILL-TUW-012 | Part 11 Billing | Rate card | 선행 객체·권한·감사로그 검토 후 구현 | Medium | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-ADM-ADMI-TUW-001 | Part 12 Admin | Admin console | 선행 객체·권한·감사로그 검토 후 구현 | Medium | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-ADM-ADMI-TUW-002 | Part 12 Admin | User admin | 선행 객체·권한·감사로그 검토 후 구현 | Medium | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-ADM-ADMI-TUW-003 | Part 12 Admin | Role admin | 선행 객체·권한·감사로그 검토 후 구현 | Medium | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-ADM-ADMI-TUW-004 | Part 12 Admin | Matter access admin | 선행 객체·권한·감사로그 검토 후 구현 | Medium | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-ADM-ADMI-TUW-005 | Part 12 Admin | Ethical Wall admin | 선행 객체·권한·감사로그 검토 후 구현 | Critical | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-ADM-ADMI-TUW-006 | Part 12 Admin | Policy console | 선행 객체·권한·감사로그 검토 후 구현 | Medium | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-ADM-ADMI-TUW-007 | Part 12 Admin | AI policy console | 선행 객체·권한·감사로그 검토 후 구현 | Critical | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-ADM-ADMI-TUW-008 | Part 12 Admin | External sharing policy | 선행 객체·권한·감사로그 검토 후 구현 | Medium | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-ADM-ADMI-TUW-009 | Part 12 Admin | Audit console | 선행 객체·권한·감사로그 검토 후 구현 | Critical | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-ADM-ADMI-TUW-010 | Part 12 Admin | Ledger dashboard | 선행 객체·권한·감사로그 검토 후 구현 | Medium | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-ADM-ADMI-TUW-011 | Part 12 Admin | Template admin | 선행 객체·권한·감사로그 검토 후 구현 | Medium | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-ADM-ADMI-TUW-012 | Part 12 Admin | Knowledge approval admin | 선행 객체·권한·감사로그 검토 후 구현 | Medium | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-ENT-ENTE-TUW-001 | Part 13 Enterprise | SSO/MFA | 선행 객체·권한·감사로그 검토 후 구현 | Medium | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-ENT-ENTE-TUW-002 | Part 13 Enterprise | Retention policy | 선행 객체·권한·감사로그 검토 후 구현 | Critical | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-ENT-ENTE-TUW-003 | Part 13 Enterprise | Legal hold | 선행 객체·권한·감사로그 검토 후 구현 | Critical | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-ENT-ENTE-TUW-004 | Part 13 Enterprise | DLP | 선행 객체·권한·감사로그 검토 후 구현 | Critical | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-ENT-ENTE-TUW-005 | Part 13 Enterprise | Backup/restore | 선행 객체·권한·감사로그 검토 후 구현 | Medium | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-ENT-ENTE-TUW-006 | Part 13 Enterprise | Monitoring | 선행 객체·권한·감사로그 검토 후 구현 | Medium | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-ENT-ENTE-TUW-007 | Part 13 Enterprise | Performance optimization | 선행 객체·권한·감사로그 검토 후 구현 | Medium | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-ENT-ENTE-TUW-008 | Part 13 Enterprise | Migration tools | 선행 객체·권한·감사로그 검토 후 구현 | Medium | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-ENT-ENTE-TUW-009 | Part 13 Enterprise | Data export | 선행 객체·권한·감사로그 검토 후 구현 | Medium | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-ENT-ENTE-TUW-010 | Part 13 Enterprise | Disaster recovery | 선행 객체·권한·감사로그 검토 후 구현 | Medium | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-ENT-ENTE-TUW-011 | Part 13 Enterprise | Secrets management | 선행 객체·권한·감사로그 검토 후 구현 | Medium | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-ENT-ENTE-TUW-012 | Part 13 Enterprise | Security incident workflow | 선행 객체·권한·감사로그 검토 후 구현 | Critical | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-HRO-HR-TUW-001 | Part 14 HR | User-Employee separation | 선행 객체·권한·감사로그 검토 후 구현 | High | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-HRO-HR-TUW-002 | Part 14 HR | Employee registry | 선행 객체·권한·감사로그 검토 후 구현 | High | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-HRO-HR-TUW-003 | Part 14 HR | Organization Unit | 선행 객체·권한·감사로그 검토 후 구현 | High | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-HRO-HR-TUW-004 | Part 14 HR | Practice Group | 선행 객체·권한·감사로그 검토 후 구현 | High | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-HRO-HR-TUW-005 | Part 14 HR | Reporting Line | 선행 객체·권한·감사로그 검토 후 구현 | High | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-HRO-HR-TUW-006 | Part 14 HR | Role Assignment | 선행 객체·권한·감사로그 검토 후 구현 | High | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-HRO-HR-TUW-007 | Part 14 HR | HR data sensitivity classification | 선행 객체·권한·감사로그 검토 후 구현 | Critical | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-HRO-HR-TUW-008 | Part 14 HR | HR audit schema | 선행 객체·권한·감사로그 검토 후 구현 | Critical | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-HRO-HR-TUW-009 | Part 14 HR | HR document object | 선행 객체·권한·감사로그 검토 후 구현 | High | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-HRO-HR-TUW-010 | Part 14 HR | HR policy object | 선행 객체·권한·감사로그 검토 후 구현 | High | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-HRO-HR-TUW-011 | Part 14 HR | Leave request | 선행 객체·권한·감사로그 검토 후 구현 | High | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-HRO-HR-TUW-012 | Part 14 HR | Attendance record | 선행 객체·권한·감사로그 검토 후 구현 | High | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-HRO-HR-TUW-013 | Part 14 HR | Overtime approval | 선행 객체·권한·감사로그 검토 후 구현 | High | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-HRO-HR-TUW-014 | Part 14 HR | Onboarding plan | 선행 객체·권한·감사로그 검토 후 구현 | High | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-HRO-HR-TUW-015 | Part 14 HR | Offboarding plan | 선행 객체·권한·감사로그 검토 후 구현 | High | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-HRO-HR-TUW-016 | Part 14 HR | Candidate registry | 선행 객체·권한·감사로그 검토 후 구현 | High | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-HRO-HR-TUW-017 | Part 14 HR | Job opening | 선행 객체·권한·감사로그 검토 후 구현 | High | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-HRO-HR-TUW-018 | Part 14 HR | Interview feedback | 선행 객체·권한·감사로그 검토 후 구현 | High | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-HRO-HR-TUW-019 | Part 14 HR | HR Rule Engine skeleton | 선행 객체·권한·감사로그 검토 후 구현 | High | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-HRO-HR-TUW-020 | Part 14 HR | HR Assistant RAG | 선행 객체·권한·감사로그 검토 후 구현 | High | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-HRO-HR-TUW-021 | Part 14 HR | HR Risk detection | 선행 객체·권한·감사로그 검토 후 구현 | High | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-HRO-HR-TUW-022 | Part 14 HR | HR Policy consistency checker | 선행 객체·권한·감사로그 검토 후 구현 | High | 기능 동작, 권한, 감사로그, 회귀검증 통과 |
| MAT-HRO-HR-TUW-023 | Part 14 HR | HR Data Room assistant | 선행 객체·권한·감사로그 검토 후 구현 | Critical | 기능 동작, 권한, 감사로그, 회귀검증 통과 |


---

# 19_Verification_Case_Catalog.md
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


---

# 20_Agent_Work_Contracts.md
# matter Agent Work Contracts

문서 버전: v0.1  
작성일: 2026-06-11

## 1. 공통 Agent Work Contract

| 항목 | 내용 |
|---|---|
| Objective | agent가 달성해야 할 구체 목표 |
| Input Scope | 읽을 수 있는 문서, 파일, 객체, log 범위 |
| Output Scope | 생성할 수 있는 산출물 |
| Files to Read | 읽기 허용 파일 |
| Files to Modify | 수정 허용 파일 |
| Files Not to Modify | 수정 금지 파일 |
| Permission Boundary | 접근 가능한 데이터 범위 |
| Security Constraints | 민감정보, 외부전송, export 제한 |
| Verification Contract | 완료검증 항목 |
| Stop Condition | 중단 조건 |
| Escalation Rule | 상위 검토 조건 |
| Ledger Record | 기록해야 할 Decision/Execution/Learning |

## 2. Planner Agent

| 항목 | 내용 |
|---|---|
| 책임 | 목표를 Pillar, Domain, Module, TUW, dependency로 분해 |
| 입력 | Product Constitution, PRD/SRS, 기존 backlog |
| 출력 | TUW 후보, risk, dependency, verification draft |
| 금지 | 사양에 없는 기능 확정, 권한·보안 생략 |
| Escalation | 불명확한 정책, critical risk, scope conflict |

## 3. Executor Agent

| 항목 | 내용 |
|---|---|
| 책임 | TUW를 구현 |
| 입력 | Agent Work Contract, related files, test fixture |
| 출력 | code changes, migration, test, docs update |
| 금지 | Files Not to Modify 수정, 권한검증 우회, audit 생략 |
| Completion | Verification Contract 통과 |

## 4. Verifier Agent

| 항목 | 내용 |
|---|---|
| 책임 | 기능·권한·보안·audit·회귀 검증 |
| 입력 | TUW output, test result, diff, logs |
| 출력 | pass/fail, defect list, regression impact |
| 금지 | 구현자 self-approval로 critical release 통과 |
| Escalation | 권한위반, 데이터손상, audit 누락, AI source 미비 |

## 5. Governor Agent

| 항목 | 내용 |
|---|---|
| 책임 | 정책, 보안, legal/HR risk, release gate 통제 |
| 입력 | risk assessment, verification result, ledger |
| 출력 | approve, block, request change, escalate |
| 금지 | critical risk를 무검토로 승인 |

## 6. Outlook Filing Agent

| 항목 | 내용 |
|---|---|
| 책임 | 이메일 metadata, attachment filing 후보 처리 |
| 입력 | Outlook item metadata, user-selected matter |
| 출력 | Email object, Document object, audit event |
| 금지 | 사용자가 접근권한 없는 matter로 filing, 권한 없는 attachment 저장 |
| Verification | matter ACL, file_ref, email-thread, audit 검증 |

## 7. Legal QC Agent

| 항목 | 내용 |
|---|---|
| 책임 | 문서 정합성 오류 후보 탐지 |
| 입력 | document text, metadata, matter terms, template |
| 출력 | QC report, issue/task 후보 |
| 금지 | 법률결론 자동확정, 문서 자동최종화 |
| Verification | source location, false positive review, send gate 적용 |

## 8. HR Assistant Agent

| 항목 | 내용 |
|---|---|
| 책임 | HR RAG 답변, 리포트 초안, rule engine 결과 설명 |
| 입력 | 권한검증된 HR policy/data, rule engine result |
| 출력 | source-grounded answer, HR report draft, action candidate |
| 금지 | 급여·연차·근태 산정, 채용·평가·징계 판단 자동확정 |
| Verification | HR guardrail, source required, audit, action approval |

## 9. Vault Sync Agent

| 항목 | 내용 |
|---|---|
| 책임 | Matter Vault export/import/sync 후보 처리 |
| 입력 | core object graph, vault note changes |
| 출력 | markdown notes, diff, conflict report, import candidates |
| 금지 | approval 없이 원본 DB 변경, 권한 없는 객체 export |
| Verification | object_id mapping, ACL, conflict detection, audit |


---

# 21_UI_화면_사용자흐름.md
# matter UI 화면 및 사용자흐름 명세

문서 버전: v0.1  
작성일: 2026-06-11

## 1. 핵심 화면 목록

| 화면 | 주 사용자 | 핵심 표시·행위 |
|---|---|---|
| Matter Home | 변호사·파트너 | 사건 개요, open issue, 오늘 할 일, 기한, 최근 문서, 최근 이메일, AI 후보, billing 상태 |
| Work Queue | 모든 내부 사용자 | 내 task, overdue, review needed, approval request, HR task |
| Document Workspace | 변호사·스태프 | SharePoint/OneDrive 문서, 버전, 상태, QC, 관련 issue |
| Outlook Add-in Task Pane | Outlook 사용자 | matter 검색, email filing, attachment save, task/deadline/issue 생성 |
| Issue Ledger | 변호사·파트너 | 쟁점 상태, risk, source, position, proposed language, final resolution |
| Practice Pack Workspace | 업무팀 | M&A RFI/DD/Closing, Litigation Fact/Evidence, Corporate Checklist |
| Client Portal | 고객 | 자료요청, 업로드, 공유문서, 승인, Q&A, 일정 |
| Employee Portal | 구성원 | 휴가, 근태, HR 문서, 사규 Q&A, 온보딩 |
| Candidate Portal | 채용후보자 | 지원자료, 면접일정, 문서제출, 개인정보동의 |
| Knowledge Search | 변호사 | 과거 조항, 리서치, 판례, issue resolution, knowledge artifact |
| Matter Vault Console | 지식관리자·변호사 | Obsidian export/import/sync, diff, conflict, canvas |
| AI Review Queue | 변호사·HR·관리자 | AI 후보 검토, 승인, 수정, 반려 |
| Admin Console | 관리자 | 사용자, 권한, 정책, AI policy, audit, ledger |
| HR Operations | HR 담당자 | Employee, HR Document, Leave, Attendance, Recruitment, HR Risk |

## 2. Matter Home 구성

| 영역 | 표시내용 |
|---|---|
| Matter Summary | client, counterparty, type, stage, lead lawyer, confidentiality |
| Today’s Actions | 오늘 처리할 task, review, approval |
| Critical Deadlines | signing, closing, court, filing, client response |
| Open Issues | risk level, owner, next action |
| Recent Documents | status, version, source, QC result |
| Recent Emails | filed thread, pending response |
| Client Pending | 고객 확인 필요사항 |
| Counterparty Pending | 상대방 회신대기 |
| AI Candidates | task/deadline/issue/QC 후보 |
| Billing/Workload | time, budget, team workload |
| Knowledge Candidates | 지식화 후보 |

## 3. Outlook Filing Flow

1. 이메일 열람.
2. matter 패널 열림.
3. 추천 matter 표시.
4. 사용자가 matter 선택.
5. 이메일 filing.
6. 첨부파일 선택 저장.
7. task/deadline/issue 생성 또는 AI 후보 검토.
8. Matter Home에서 결과 확인.

## 4. Issue Ledger Flow

1. 문서, 이메일, 회의록, RFI에서 issue 후보 발견.
2. 담당 변호사가 issue 생성.
3. 관련 source 연결.
4. client/counterparty position 기록.
5. 법률검토와 proposed language 작성.
6. 상태를 Need Client Input, Negotiating 등으로 전환.
7. 최종 resolution 기록.
8. matter closing 시 knowledge candidate 생성.

## 5. Client Portal Flow

1. 내부 사용자가 request 또는 shared document 생성.
2. portal projection 생성.
3. client user 알림.
4. client upload/download/approval.
5. 내부 review queue 반영.
6. audit 기록.

## 6. HR Employee Portal Flow

1. 구성원 로그인.
2. 본인 HR dashboard 확인.
3. 휴가신청 또는 HR document 확인.
4. HR Assistant에 사규 질문.
5. 권한범위 내 답변 표시.
6. action 발생 시 HR approval queue로 이동.

## 7. AI Review Queue Flow

1. AI output 생성.
2. source와 risk 표시.
3. reviewer가 approve/edit/reject.
4. approved output만 write-back.
5. audit와 ledger 기록.

## 8. Admin UX 원칙

1. 정책 설정은 사유와 영향범위 표시.
2. 권한변경은 preview와 audit 필수.
3. AI policy 변경은 model routing impact 표시.
4. Vault export/import는 위험등급 표시.
5. HR sensitive action은 별도 경고와 re-auth 권장.


---

# 22_API_이벤트_통합_명세.md
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


---

# 23_Risk_Register_Open_Questions.md
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


---

# 24_개발팀_착수_지시서.md
# matter 개발팀 착수 지시서

문서 버전: v0.1  
작성일: 2026-06-11

## 1. 착수 목표

1차 개발목표는 AI·Drafting·HR 전체기능 완성이 아니라, 전체 제품을 지탱할 core object, 권한, 감사, Microsoft 365 file reference, Outlook filing, workflow skeleton을 구축하는 것이다.

## 2. 1차 스프린트 범위

| Sprint | 범위 | 산출물 |
|---|---|---|
| Sprint 0 | Development OS | TUW template, Verification Contract, Ledger schema |
| Sprint 1 | Core Identity | User, Employee 분리, Role, Tenant skeleton |
| Sprint 2 | Matter Core | Matter, Party, Contact, Matter Home base |
| Sprint 3 | Security | ACL, Ethical Wall skeleton, Audit Event writer |
| Sprint 4 | Microsoft DMS | SharePoint/OneDrive file_ref, Document object |
| Sprint 5 | Outlook MVP | Add-in shell, auth, matter lookup, email filing, attachment save |
| Sprint 6 | Workflow Base | Task, Deadline, Work Queue, Review Queue skeleton |

## 3. 개발팀 작업원칙

1. 모든 PR은 관련 TUW ID를 가진다.
2. 모든 write path는 audit event를 가진다.
3. 권한검증 없는 API는 merge 금지.
4. AI 기능은 core permission과 audit이 준비되기 전 product code에 직접 결합하지 않는다.
5. HR 기능은 화면 후순위라도 User/Employee 분리와 HR sensitive classification을 초기 schema에 포함한다.
6. Microsoft 연동은 mock adapter와 실제 adapter를 분리한다.
7. Outlook Add-in은 Office.js Web Add-in 기준으로 한다.
8. Obsidian Vault는 export schema부터 설계하고, bidirectional sync는 후순위로 둔다.

## 4. 1차 상세 TUW 후보

| Work ID | 작업 | 완료조건 |
|---|---|---|
| MAT-DOS-CORE-TUW-001 | TUW 표준 스키마 작성 | 표준필드, risk, verification, ledger 포함 |
| MAT-DOS-VER-TUW-001 | Verification Contract template | functional, permission, audit, security, regression 포함 |
| MAT-MTR-CORE-TUW-001 | Matter schema | matter_id, type, stage, confidentiality 포함 |
| MAT-HRO-EMP-TUW-001 | User/Employee 분리 schema | user_id와 employee_id 독립 |
| MAT-SEC-ACL-TUW-001 | Matter-level ACL | view/edit/create/export 권한 검증 |
| MAT-SEC-AUD-TUW-001 | Audit Event writer | write path audit 저장 |
| MAT-MSD-DOC-TUW-001 | Document object + file_ref | SharePoint/OneDrive item ref 저장 |
| MAT-OUT-SHELL-TUW-001 | Outlook Add-in shell | task pane, login placeholder, health check |
| MAT-OUT-FILE-TUW-001 | Email filing MVP | Email object, matter link, audit 생성 |
| MAT-WFL-TSK-TUW-001 | Task object | create/assign/status due date |

## 5. 착수 전 확인자료

1. Microsoft 365 tenant 관리자 권한 보유 여부.
2. 테스트용 Outlook mailbox.
3. 테스트용 SharePoint site/library.
4. 테스트 matter sample data.
5. HR dummy employee data.
6. 보안상 외부 API 사용 가능 여부.
7. 개발환경: local, staging, production 분리.

## 6. 금지사항

1. AI output을 곧바로 고객송부 또는 DB write-back하지 않는다.
2. HR 급여·평가·채용정보를 일반 matter 권한으로 노출하지 않는다.
3. SharePoint 공유 링크를 audit 없이 생성하지 않는다.
4. Obsidian export를 권한검증 없이 제공하지 않는다.
5. Outlook Add-in에서 광범위 Graph 권한을 무검토로 요청하지 않는다.
