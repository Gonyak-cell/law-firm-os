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
