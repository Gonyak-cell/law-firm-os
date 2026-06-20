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
