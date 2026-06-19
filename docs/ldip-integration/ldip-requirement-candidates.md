# LDIP Requirement Candidates

작성일: 2026-06-07

상태: planning-only. 이 문서는 LDIP 원문을 Law Firm OS requirement/CP overlay로 흡수하기 위한 후보 요구사항 ledger다. 아직 weighted ledger, product contract, source code, validator, production_ready 상태를 변경하지 않는다.

Source:

- 원문: `/Users/jws/.codex/attachments/a9f85364-9785-449b-b925-df1d2c93eee1/pasted-text.txt`
- 원문 SHA256: `82b396474b43afd278042e8eb1b8a18a2b0fd2c2ee640e23022622ef2d70be9c`
- Source index: `docs/ldip-integration/ldip-source-index.md`
- No-omission matrix: `docs/ldip-integration/ldip-no-omission-coverage-matrix.md`

## Candidate Schema

Each candidate must eventually be converted to a machine-readable requirement row with:

- `id`
- `family`
- `source_section`
- `source_lines`
- `source_summary`
- `required_behavior`
- `primary_rp`
- `secondary_rps`
- `planned_cp_ids`
- `coverage_decision`
- `risk_class`
- `acceptance_evidence`
- `tests_or_review_method`
- `defer_or_reject_reason`

## Source Section Candidates

| ID | Family | Source | Lines | Required behavior | Primary RP | Secondary RPs | Initial decision |
| --- | --- | --- | ---: | --- | --- | --- | --- |
| LDIP-GOAL-001 | LDIP-GOAL | 1. 설계 결론 | 7-20 | Treat LDIP as governed legal data platform, not AI document writer | RP00 | RP26, RP29 | covered_by_existing_plan_but_requires_ldip_trace |
| LDIP-GOAL-002 | LDIP-GOAL | 2.1 명칭 | 23-36 | Preserve LDIP naming as internal Legal Data Intelligence capability | RP00 | RP29 | covered_by_existing_plan_but_requires_ldip_trace |
| LDIP-GOAL-003 | LDIP-GOAL | 2.2 설계 목표 | 37-52 | Track all 10 LDIP goals with RP and CP anchors | RP00 | RP06, RP07, RP17, RP20, RP26 | weakly_covered |
| LDIP-RISK-001 | LDIP-RISK | 2.3 피해야 할 설계 | 53-66 | Block chatbot-on-DMS, whole-document vector dump, fragmented SaaS, strongest-model-only, email-link sharing, direct AI send/mutation | RP00 | RP16, RP17, RP20, RP26 | adapt_required_before_implementation |
| LDIP-ARCH-001 | LDIP-ARCH | 3.1 참조 설계 매핑 | 69-84 | Translate Databricks/Snowflake ideas into vendor-neutral Law Firm OS architecture | RP26 | RP27 | weakly_covered |
| LDIP-ARCH-002 | LDIP-ARCH | 3.2 핵심 구조 | 85-99 | Preserve 7-layer LDIP architecture: source, ingestion, catalog, storage/query, AI/agent, app, governance | RP00 | RP01, RP02, RP03, RP06, RP07, RP17, RP20, RP26 | weakly_covered |
| LDIP-SRC-001 | LDIP-SRC | 3.2, 5.1.1, 16.1 | 85-99, 219-237, 994-1009 | Track DMS, email, calendar, timesheet, billing, CRM, DD, external legal DB, upload, clean room import, and external API source connectors with owner scope, matter mapping, permission, audit, ingestion, and failure behavior | RP01 | RP04, RP05, RP08, RP22, RP23, RP25 | new_required |
| LDIP-PRIO-001 | LDIP-PRIO | 4.1 전체 추진 원칙 | 102-120 | Enforce build order: catalog, ingestion, search/analyst, verification agents, clean room | RP00 | RP06, RP07, RP17, RP20 | adapt_required_before_implementation |
| LDIP-PRIO-002 | LDIP-PRIO | 4.2 단계별 적용계획 | 121-214 | Map LDIP Phase 0-7 into Law Firm OS RP/CP execution | RP00 | RP01, RP02, RP06, RP07, RP17, RP20, RP26 | weakly_covered |
| LDIP-GOAL-004 | LDIP-GOAL | 5.1 시스템 범위 | 217-250 | Classify included/excluded LDIP v1.0 scope with reasons | RP00 | RP16, RP29 | weakly_covered |
| LDIP-CAT-001 | LDIP-CAT | 6.1 핵심 엔터티 | 253-284 | Track all LDIP entities with lawful owner and RP anchor | RP01 | RP04, RP05, RP06, RP16, RP17, RP20 | new_required |
| LDIP-CAT-002 | LDIP-CAT | 6.2 주요 테이블 상세 | 285-428 | Track clients, matters, documents, document_versions, clauses, issues, agent_runs field families | RP01 | RP04, RP05, RP06, RP17 | new_required |
| LDIP-SEC-001 | LDIP-SEC | 7.1 권한 원칙 | 431-443 | Enforce minimum privilege, AI permission intersection, read-only default, external approval, Ethical Wall, citation, auditability | RP02 | RP03, RP17, RP20 | adapt_required_before_implementation |
| LDIP-SEC-002 | LDIP-SEC | 7.2 RBAC | 444-458 | Track LDIP role set and Matter source-access exceptions | RP02 | RP21 | new_required |
| LDIP-SEC-003 | LDIP-SEC | 7.3 ABAC | 459-476 | Track required ABAC attributes across document/search/AI/share flows | RP02 | RP16 | new_required |
| LDIP-COMP-001 | LDIP-COMP | 7.4 보안 라벨 | 477-498 | Track security label dictionary and legal caveat that labels are technical controls | RP16 | RP02, RP24 | new_required |
| LDIP-ING-001 | LDIP-ING | 8.1 처리 단계 | 501-518 | Implement or map 12-step ingestion pipeline | RP06 | RP07, RP25 | new_required |
| LDIP-DOC-001 | LDIP-DOC | 8.2 문서유형 분류표 | 519-536 | Track required document type taxonomy and extraction fields | RP06 | RP07 | new_required |
| LDIP-DOC-002 | LDIP-DOC | 8.3 문서 버전 규칙 | 537-549 | Implement version precedence and manual review for unknown/conflicting versions | RP06 | RP07 | new_required |
| LDIP-ING-002 | LDIP-ING | 8.4 실패 처리 | 550-564 | Enforce failure defaults: manual review, high confidentiality, prohibited share, metadata-only AI | RP06 | RP07, RP16, RP25 | new_required |
| LDIP-SRCH-001 | LDIP-SRCH | 9.1 검색 유형 | 567-578 | Track keyword, semantic, metadata, clause, authority, email, similar matter, negative search | RP07 | RP15, RP17 | new_required |
| LDIP-SRCH-002 | LDIP-SRCH | 9.2 자연어 질의 | 579-589 | Require evidence-bound natural-language search scenarios | RP07 | RP15, RP18 | new_required |
| LDIP-SRCH-003 | LDIP-SRCH | 9.3 Legal Analyst | 590-604 | Track structured status, DD, billing, contract, issue, share, AI usage queries | RP15 | RP07, RP17 | new_required |
| LDIP-AGT-001 | LDIP-AGT | 10.1 Agent 기본 원칙 | 607-620 | Enforce bounded, evidence-first, source-visible, version-aware, human-in-loop agent runtime | RP17 | RP18 | adapt_required_before_implementation |
| LDIP-AGT-002 | LDIP-AGT | 10.2 Agent 목록 | 621-731 | Track all 12 named agents with input, output, tools, policy, human review, tests | RP18 | RP17, RP28 | new_required |
| LDIP-TOOL-001 | LDIP-TOOL | 11.1 Tool 분류 | 734-745 | Track T0-T7 tool tiers and approval requirements | RP17 | RP18, RP27 | new_required |
| LDIP-TOOL-002 | LDIP-TOOL | 11.2 Tool Call 로그 | 746-766 | Record all required tool_call log fields and policy decisions | RP03 | RP17, RP18 | new_required |
| LDIP-TOOL-003 | LDIP-TOOL | 11.3 승인 워크플로우 | 767-779 | Track approval workflow for external share, email drafts, Word redline, privileged/personal data, Ethical Wall exceptions | RP02 | RP17, RP18, RP20 | new_required |
| LDIP-CLEAN-001 | LDIP-CLEAN | 12.1-12.2 Clean Room purpose/types | 782-796 | Treat Clean Room as audited query/share room with all seven room types | RP20 | RP16, RP26 | new_required |
| LDIP-CLEAN-002 | LDIP-CLEAN | 12.3 공유 객체 | 797-808 | Track all shared object types and sharing modes | RP20 | RP06, RP18 | new_required |
| LDIP-CLEAN-003 | LDIP-CLEAN | 12.4 외부공유 정책 | 809-821 | Enforce no-download default, watermark, expiry, purpose binding, no cross-room search, approval, revocation, post-access audit | RP20 | RP16 | new_required |
| LDIP-CLEAN-004 | LDIP-CLEAN | 12.5 Query Template | 822-835 | Restrict external clean-room users to approved query templates | RP20 | RP07 | new_required |
| LDIP-UI-001 | LDIP-UI | 13.1 Matter Dashboard | 838-852 | Track dashboard sections for current state, docs, issues, DD, negotiation, AI, security, audit | RP21 | RP05 | weakly_covered |
| LDIP-UI-002 | LDIP-UI | 13.2 Document Viewer | 853-865 | Track preview, version tree, clause navigation, errors, evidence, labels, AI actions, share state | RP21 | RP06 | new_required |
| LDIP-UI-003 | LDIP-UI | 13.3 Contract Review Workspace | 866-876 | Track clause map, checklist, redline analysis, inconsistency matrix, negotiation, comments, partner review | RP18 | RP21 | new_required |
| LDIP-UI-004 | LDIP-UI | 13.4 DD App | 877-887 | Track request list, submission mapping, completeness, issue extraction, severity, report sync, Q&A | RP18 | RP20, RP21 | new_required |
| LDIP-UI-005 | LDIP-UI | 13.5 Agent Control Center | 888-901 | Track agent catalog, run history, evidence, tool trace, policy, review queue, quality metrics, prompts | RP21 | RP17, RP18 | new_required |
| LDIP-NFR-001 | LDIP-NFR | 14.1 보안 | 904-916 | Track SEC-001 through SEC-009 | RP26 | RP02, RP16 | new_required |
| LDIP-NFR-002 | LDIP-NFR | 14.2 성능 | 917-928 | Track PERF-001 through PERF-006 with benchmark adjustment policy | RP26 | RP07, RP18 | new_required |
| LDIP-NFR-003 | LDIP-NFR | 14.3 가용성·복구 | 929-938 | Track AVAIL-001 through AVAIL-006 | RP26 | RP03, RP07 | new_required |
| LDIP-DQ-001 | LDIP-DQ | 14.4 데이터 품질 | 939-951 | Track DQ-001 through DQ-007 | RP15 | RP26 | new_required |
| LDIP-DQ-002 | LDIP-DQ | 14.5 AI 품질 | 952-965 | Track AIQ-001 through AIQ-008 | RP17 | RP18, RP26 | new_required |
| LDIP-COMP-002 | LDIP-COMP | 15.1 변호사 비밀유지 | 968-981 | Track attorney-secret technical labels and future legal review caveat | RP24 | RP16, RP26 | new_required |
| LDIP-COMP-003 | LDIP-COMP | 15.2 개인정보 보호 | 982-985 | Track access control, logs, encryption, masking, retention for personal data | RP16 | RP24, RP26 | new_required |
| LDIP-COMP-004 | LDIP-COMP | 15.3 전자문서 보관 | 986-991 | Track e-document preservation metadata, hash, timestamp, author, audit events | RP16 | RP06, RP24, RP26 | new_required |
| LDIP-ARCH-003 | LDIP-ARCH | 16.1 Logical Architecture | 994-1009 | Preserve vendor-neutral logical components and source connector infrastructure | RP26 | RP22, RP23, RP27 | weakly_covered |
| LDIP-ARCH-004 | LDIP-ARCH | 16.2 Vendor mapping | 1010-1056 | Keep Databricks/Snowflake mappings optional and non-lock-in | RP26 | RP27 | weakly_covered |
| LDIP-ARCH-005 | LDIP-ARCH | 3.2, 16.1-16.2 early architecture contract | 85-99, 994-1056 | Create an early vendor-neutral architecture contract that RP01, RP17, RP20, RP22, and RP23 must conform to before late RP26 hardening proof | RP00 | RP01, RP17, RP20, RP22, RP23, RP26, RP27 | adapt_required_before_implementation |
| LDIP-API-001 | LDIP-API | 17.1 주요 API | 1059-1079 | Track all listed APIs with permission, audit, idempotency, evidence behavior | RP22 | RP23, RP27 | new_required |
| LDIP-API-002 | LDIP-API | 17.2 이벤트 목록 | 1080-1109 | Track all listed events and append-only audit/event behavior | RP23 | RP03, RP22, RP27 | new_required |
| LDIP-OUT-001 | LDIP-OUT | 18 Agent 산출물 형식 | 1110-1139 | Enforce evidence-bound output format, exclusions, uncertainty, shareability, review state | RP18 | RP06, RP20 | new_required |
| LDIP-DQ-003 | LDIP-DQ | 19 품질관리 | 1140-1172 | Track AI and data quality metrics, leakage zero tolerance, cost/latency | RP15 | RP17, RP26 | new_required |
| LDIP-TEST-001 | LDIP-TEST | 20 테스트 시나리오 | 1173-1222 | Track T-SEC, T-DOC, T-CON, T-DD, T-AI tests | RP00 | RP02, RP06, RP07, RP17, RP18, RP20 | new_required |
| LDIP-PRIO-003 | LDIP-PRIO | 21 우선순위별 구축 범위 | 1223-1270 | Map MVP/second/third wave to CP execution order | RP00 | RP01, RP02, RP06, RP07, RP17, RP18, RP20, RP26 | weakly_covered |
| LDIP-RISK-002 | LDIP-RISK | 22 위험요소 | 1271-1286 | Track risk register and mitigation acceptance evidence | RP26 | RP00, RP02, RP16, RP17, RP20 | new_required |
| LDIP-PRIO-004 | LDIP-PRIO | 23 최종 권고안 | 1287-1342 | Preserve final build-first five and platform design sentence | RP00 | RP01, RP02, RP06, RP07, RP17, RP18, RP20, RP26 | adapt_required_before_implementation |

## Named Object Candidates

### Entities And Objects

| Candidate range | Family | Objects | Primary RP | Initial decision |
| --- | --- | --- | --- | --- |
| LDIP-CAT-101-LDIP-CAT-128 | LDIP-CAT | Client, Client Group, Matter, Party, User, Role, Document, Document Version, Document Chunk, Clause, Defined Term, Cross Reference, Issue, DD Request, DD Submission, Authority, Email, Meeting Note, Task, Agent, Tool, Agent Run, Tool Call, Evidence Link, Review Edit, Audit Event, Clean Room, Data Offering | RP01 | new_required |
| LDIP-SRC-101-LDIP-SRC-111 | LDIP-SRC | DMS, email, calendar, timesheet, billing, CRM, DD materials, external legal DB, uploaded documents, clean-room imports, external API sources | RP01 | new_required |

### Table Field Families

| ID | Family | Table | Primary RP | Initial decision |
| --- | --- | --- | --- | --- |
| LDIP-CAT-201 | LDIP-CAT | clients field family | RP01 | new_required |
| LDIP-CAT-202 | LDIP-CAT | matters field family | RP05 | new_required |
| LDIP-DOC-201 | LDIP-DOC | documents field family | RP06 | new_required |
| LDIP-DOC-202 | LDIP-DOC | document_versions field family | RP06 | new_required |
| LDIP-DOC-203 | LDIP-DOC | clauses field family | RP06 | new_required |
| LDIP-CAT-203 | LDIP-CAT | issues field family | RP05 | new_required |
| LDIP-AGT-201 | LDIP-AGT | agent_runs field family | RP17 | new_required |

### Security Taxonomy

| Candidate range | Family | Required set | Primary RP | Initial decision |
| --- | --- | --- | --- | --- |
| LDIP-SEC-101-LDIP-SEC-111 | LDIP-SEC | RBAC roles: System Admin, Data Governance Admin, Managing Partner, Responsible Partner, Matter Attorney, Paralegal, Knowledge Manager, Billing User, Client User, External Advisor, Counterparty User | RP02 | new_required |
| LDIP-SEC-201-LDIP-SEC-212 | LDIP-SEC | ABAC attributes: client_id, matter_id, security level, confidentiality, privilege, source side, personal data, AI policy, external share policy, retention, jurisdiction, model restriction | RP02 | new_required |
| LDIP-COMP-101-LDIP-COMP-114 | LDIP-COMP | Security labels: CLIENT_CONFIDENTIAL, HIGHLY_CONFIDENTIAL, ATTORNEY_SECRET, PRIVILEGED_OR_PROTECTED, WORK_PRODUCT, COUNTERPARTY_MATERIAL, PERSONAL_INFORMATION, SENSITIVE_PERSONAL_INFORMATION, TRADE_SECRET, PUBLIC, EXTERNAL_SHAREABLE, AI_BLOCKED, INTERNAL_AI_ONLY, LITIGATION_HOLD | RP16 | new_required |

### Ingestion And Document Intelligence

| Candidate range | Family | Required set | Primary RP | Initial decision |
| --- | --- | --- | --- | --- |
| LDIP-ING-101-LDIP-ING-112 | LDIP-ING | 12 pipeline steps from Intake through Human Review | RP06 | new_required |
| LDIP-DOC-101-LDIP-DOC-114 | LDIP-DOC | document type extraction taxonomy | RP06 | new_required |
| LDIP-DOC-301-LDIP-DOC-309 | LDIP-DOC | version labels: execution, final_clean, final_redline, board_approved, counterparty_mark_up, client_mark_up, internal_review, initial_draft, unknown | RP06 | new_required |
| LDIP-ING-201-LDIP-ING-207 | LDIP-ING | failure handling defaults | RP06 | new_required |

### Search And Analyst

| Candidate range | Family | Required set | Primary RP | Initial decision |
| --- | --- | --- | --- | --- |
| LDIP-SRCH-101-LDIP-SRCH-108 | LDIP-SRCH | keyword, semantic, metadata filter, clause, authority, email, similar matter, negative search | RP07 | new_required |
| LDIP-SRCH-201-LDIP-SRCH-207 | LDIP-SRCH | natural-language evidence-bound query examples | RP07 | new_required |
| LDIP-SRCH-301-LDIP-SRCH-307 | LDIP-SRCH | Legal Analyst structured query types | RP15 | new_required |

### Agents And Tools

| Candidate range | Family | Required set | Primary RP | Initial decision |
| --- | --- | --- | --- | --- |
| LDIP-AGT-101-LDIP-AGT-112 | LDIP-AGT | 12 named legal agents | RP18 | new_required |
| LDIP-TOOL-101-LDIP-TOOL-108 | LDIP-TOOL | T0-T7 tool tiers | RP17 | new_required |
| LDIP-TOOL-201 | LDIP-TOOL | tool call log schema | RP03 | new_required |
| LDIP-TOOL-301-LDIP-TOOL-307 | LDIP-TOOL | approval workflows: external share posting, client email draft use, counterparty email draft use, Word redline save, privileged material sharing, personal-data material sharing, Ethical Wall exception access | RP02 | new_required |

### Clean Room

| Candidate range | Family | Required set | Primary RP | Initial decision |
| --- | --- | --- | --- | --- |
| LDIP-CLEAN-101-LDIP-CLEAN-107 | LDIP-CLEAN | seven clean room types | RP20 | new_required |
| LDIP-CLEAN-201-LDIP-CLEAN-208 | LDIP-CLEAN | shared objects | RP20 | new_required |
| LDIP-CLEAN-301-LDIP-CLEAN-309 | LDIP-CLEAN | external sharing policies | RP20 | new_required |
| LDIP-CLEAN-401-LDIP-CLEAN-406 | LDIP-CLEAN | query templates | RP20 | new_required |

### UI, NFR, Quality, API, Tests, Priority, Risk

| Candidate range | Family | Required set | Primary RP | Initial decision |
| --- | --- | --- | --- | --- |
| LDIP-UI-101-LDIP-UI-105 | LDIP-UI | five UI surfaces | RP21 | new_required |
| LDIP-NFR-101-LDIP-NFR-109 | LDIP-NFR | SEC-001 through SEC-009 | RP26 | new_required |
| LDIP-NFR-201-LDIP-NFR-206 | LDIP-NFR | PERF-001 through PERF-006 | RP26 | new_required |
| LDIP-NFR-301-LDIP-NFR-306 | LDIP-NFR | AVAIL-001 through AVAIL-006 | RP26 | new_required |
| LDIP-DQ-101-LDIP-DQ-107 | LDIP-DQ | DQ-001 through DQ-007 | RP15 | new_required |
| LDIP-DQ-201-LDIP-DQ-208 | LDIP-DQ | AIQ-001 through AIQ-008 | RP17 | new_required |
| LDIP-DQ-301-LDIP-DQ-311 | LDIP-DQ | section-19 AI evaluation metrics: Source Accuracy, Version Accuracy, Cross-client Leakage, Citation Coverage, Clause Extraction Recall, Issue Severity Agreement, Reviewer Edit Rate, Rejection Rate, Hallucination Candidate, Cost per Task, Latency | RP15 | new_required |
| LDIP-DQ-401-LDIP-DQ-410 | LDIP-DQ | section-19 data quality metrics: Document Freshness, Metadata Completeness, Version Conflict Count, Duplicate Rate, OCR Failure Rate, Clause Segmentation Error, Unmapped DD Request, Unreviewed High Issue, External Share Exception, Audit Gap | RP15 | new_required |
| LDIP-API-101-LDIP-API-117 | LDIP-API | listed APIs from Create Matter through Get Audit Trail | RP22 | new_required |
| LDIP-API-201-LDIP-API-224 | LDIP-API | listed events: matter.created, document.uploaded, document.hash_created, document.duplicate_detected, document.parsed, document.parse_failed, document.version_conflict, document.security_tagged, clause.extracted, issue.created, dd_request.matched, search.executed, agent.started, agent.tool_called, agent.policy_blocked, agent.completed, output.review_requested, output.approved, clean_room.created, external_user.invited, document.shared, document.downloaded, share.revoked, audit.exported | RP23 | new_required |
| LDIP-TEST-101-LDIP-TEST-126 | LDIP-TEST | T-SEC, T-DOC, T-CON, T-DD, T-AI scenarios | RP00 | new_required |
| LDIP-GOAL-101-LDIP-GOAL-110 | LDIP-GOAL | 10 design goals from section 2.2 | RP00 | weakly_covered |
| LDIP-RISK-801-LDIP-RISK-806 | LDIP-RISK | 6 anti-patterns from section 2.3 | RP00 | adapt_required_before_implementation |
| LDIP-OUT-101-LDIP-OUT-112 | LDIP-OUT | output format elements: title, requester, Matter, used scope, excluded scope, summary, detailed analysis, evidence table, uncertainty, recommended action, shareability, reviewer/approval state | RP18 | new_required |
| LDIP-PRIO-101-LDIP-PRIO-110 | LDIP-PRIO | MVP scope | RP00 | weakly_covered |
| LDIP-PRIO-201-LDIP-PRIO-210 | LDIP-PRIO | second wave scope | RP00 | weakly_covered |
| LDIP-PRIO-301-LDIP-PRIO-310 | LDIP-PRIO | third wave scope | RP00 | defer_with_revisit_gate |
| LDIP-RISK-101-LDIP-RISK-110 | LDIP-RISK | risk register | RP26 | new_required |

## Embedded Module Anchors

These anchors are not Release Programs and must not appear in `secondary_rps`.

| Candidate | Embedded module | Interaction |
| --- | --- | --- |
| LDIP-COMP-003 | HRX / People / HR Evidence | Personal information controls, employee/person evidence handling, retention, DLP, audit, and access control inside Law Firm OS |

## Explicit Exclusion Candidates

These are excluded from LDIP v1.0 implementation, but must remain tracked with reasons:

| ID | Source | Exclusion | Reason | Decision |
| --- | --- | --- | --- | --- |
| LDIP-RISK-901 | 5.1.2 | AI external email auto-send | High accident risk; require approval/manual send or later release | reject_with_reason |
| LDIP-RISK-902 | 5.1.2 | AI automatic original document modification/save | Original Word/document corruption risk; allow redline suggestion only before later approval path | reject_with_reason |
| LDIP-RISK-903 | 5.1.2 | Fully automated legal opinion issuance | Final legal judgment requires attorney review | reject_with_reason |
| LDIP-RISK-904 | 5.1.2 | Enterprise ERP full replacement by LDIP | Billing/HR/accounting remain Law Firm OS modules or integrations | reject_with_reason |
| LDIP-RISK-905 | 5.1.2 | Full client portal commercialization in v1.0 | Stage after clean room policy validation | defer_with_revisit_gate |

## Next Conversion Step

The next required artifact is `docs/ldip-integration/ldip-rp-anchor-map.md`, followed by `docs/ldip-integration/ldip-gap-adjudication.md` and `docs/ldip-integration/ldip-overlay-closeout-pack-map.json`.
