# LDIP No-Omission Coverage Matrix

작성일: 2026-06-07

상태: planning-only. 이 문서는 LDIP 의도 기능을 누락 없이 Law Firm OS RP/CP 계획에 흡수하기 위한 coverage checklist다. 아직 production_ready 또는 ledger 변경을 선언하지 않는다.

## Live Repo Baseline

- 최신 완료 Closeout Pack: `CP00-066`
- 완료 pack 수: 66
- closeout-pack manifest 기준 완료 unit proxy: 257 units
- 현재 plan cursor: `RP00.P05.M06.S01`
- 다음 pack: `CP00-067`, Risk C, 39 units, `RP00.P05.M06.S01-RP00.P05.M10.S04`
- 현재 closeout pack plan: `CP00-067-CP00-1253`, 1,187 packs, 53,978 planned units
- 현재 weighted source ledger: 54,355 Law Firm OS implementation units, 227 spec requirements
- 확장 목표: 55,256 units total = 54,355 Law Firm OS + 901 embedded HRX People/HR Evidence units
- LDIP 상태: source-indexed planning overlay. LDIP는 아직 weighted ledger source unit으로 편입되지 않았다.

## Coverage Families

| Family | Meaning | Primary RP anchors | Must not miss |
| --- | --- | --- | --- |
| LDIP-GOAL | Product goals, naming, anti-patterns, final design sentence | RP00, RP29 | 10 goals, excluded anti-patterns, vendor-neutral posture |
| LDIP-ARCH | 7-layer architecture, Databricks/Snowflake translation, vendor-neutral architecture | RP00, RP26, RP27 | Source/Ingestion/Catalog/Storage/AI/App/Governance layers |
| LDIP-SRC | Source layer and legal system connectors | RP01, RP04, RP05, RP08, RP22, RP23 | DMS, email, calendar, timesheet, billing, CRM, DD, law DB sources |
| LDIP-CAT | Legal Catalog, metadata, ownership, lineage, quality | RP01, RP04, RP05, RP06, RP16 | Client/Matter/Document/Clause/Issue/Authority/Agent/Tool registry |
| LDIP-DOC | Document versions, chunks, clauses, terms, references | RP06, RP07, RP08 | version labels, chunking, clause extraction, defined terms, cross references |
| LDIP-ING | Ingestion, OCR, parsing, classification, failure handling | RP06, RP07, RP25 | 12-step pipeline and failure defaults |
| LDIP-SEC | RBAC, ABAC, labels, matter policy, AI/tool permission intersection | RP02, RP03, RP16, RP17, RP20 | user x agent x tool x matter x label intersection |
| LDIP-SRCH | Keyword/semantic/filter/clause/authority/email/similar/negative search and Legal Analyst | RP07, RP15, RP17 | negative search, permission trim, structured query |
| LDIP-AGT | Legal Agent Runtime and 12 named agents | RP17, RP18, RP28 | evidence-first, version-aware, human-in-loop agents |
| LDIP-TOOL | T0-T7 tool registry, tool call log, approval workflow | RP17, RP18, RP27, RP03 | tool grade, policy decision, approvals |
| LDIP-CLEAN | Clean Room/Deal Room, shared objects, policies, query templates | RP20, RP16, RP26 | no raw unrestricted query, no cross-room search |
| LDIP-UI | Matter dashboard, viewer, review workspace, DD app, agent center | RP21, RP05, RP06, RP18, RP20 | operational UI, not marketing UI |
| LDIP-NFR | Security, performance, availability, recovery | RP16, RP26, RP29 | encryption, search/AI audit, backups, index rebuilds |
| LDIP-DQ | Data quality and AI quality metrics | RP15, RP17, RP26 | source accuracy, version accuracy, leakage zero tolerance |
| LDIP-COMP | Attorney secrecy, personal data, e-document retention | RP16, RP24, RP26 | labels, masking, retention, audit, legal review caveats |
| LDIP-API | APIs and internal events | RP22, RP23, RP27 | idempotency, auditability, event naming |
| LDIP-OUT | Evidence-bound outputs and report structure | RP18, RP06, RP20 | evidence table, exclusions, uncertainty, shareability |
| LDIP-TEST | Unit, security, version, contract, DD, AI output tests | RP00 plus affected RPs | T-SEC/T-DOC/T-CON/T-DD/T-AI coverage |
| LDIP-RISK | Risk register and mitigations | RP00, RP02, RP16, RP17, RP20, RP26 | leakage, version error, hallucination, external share, cost |
| LDIP-PRIO | MVP, second wave, third wave and final recommendation | RP00 plus affected RPs | first five build items before generative drafting |

## Named Feature Checklist

### Source Connectors

LDIP-SRC must cover every source category named by the source layer and included scope:

- DMS
- email
- calendar
- timesheet
- billing
- CRM
- due diligence materials
- external legal databases
- uploaded documents
- clean room imports
- external API sources

Each source connector candidate must declare owner scope, matter/pre-matter mapping, permission boundary, audit event, ingestion path, and failure handling.

### Goals And Anti-Patterns

| Item | Required plan treatment |
| --- | --- |
| Matter-centered integration | Must anchor in RP01/RP04/RP05 and every LDIP object owner rule |
| Single source of truth for document versions | Must anchor in RP06 before advanced AI workflows |
| Clause-level data model | Must anchor in RP06/RP07 before clause bank/search/agent output |
| Permission-first AI | Must anchor in RP02/RP17 before any agent implementation |
| Evidence-grounded AI | Must anchor in RP17/RP18 and LDIP output format |
| Read-only AI default | Must anchor in RP17 tool policy and RP18 workflows |
| External sharing control | Must anchor in RP20/RP16 and tool tier T6/T7 |
| Quality measurement | Must anchor in RP15/RP17/RP26 |
| Vendor independence | Must anchor in RP26/RP27 |
| Long-term knowledge asset | Must anchor in RP06/RP07/RP15/RP18 |
| Avoid chatbot-on-DMS | Must be a blocked anti-pattern in RP00 product constitution |
| Avoid whole-document vector dump | Must be blocked by chunk/clause/version/evidence requirements |
| Avoid fragmented ERP/CRM/DMS/AI SaaS | Must be blocked by unified Legal Catalog and event model |
| Avoid all requests to strongest model | Must map to model routing and cost governance |
| Avoid email/download-link external sharing | Must map to Clean Room and audit policy |
| Avoid direct AI email send/document mutation | Must map to T5/T6/T7 approvals and read-only default |

### Core Entities

These entities require requirement ledger rows or explicit mapping to existing Law Firm OS rows:

Client, Client Group, Matter, Party, User, Role, Document, Document Version, Document Chunk, Clause, Defined Term, Cross Reference, Issue, DD Request, DD Submission, Authority, Email, Meeting Note, Task, Agent, Tool, Agent Run, Tool Call, Evidence Link, Review Edit, Audit Event, Clean Room, Data Offering.

### Table Contracts

| Table | Field families that must be covered |
| --- | --- |
| clients | identity, Korean/English names, group, type, jurisdiction, confidentiality, retention, timestamps |
| matters | client, matter type/status, position, responsible partner, security, ethical wall, AI level, external sharing, billing, dates |
| documents | matter, type, family/current/final version, source, privilege/confidentiality/personal labels, share status, AI policy, retention, hash |
| document_versions | version label, file metadata, storage, author/upload/date metadata, parse status, confidence, supersession, current/final flags |
| clauses | document version, matter, number, heading, text, type, favorability, risk, market position, negotiation status, source side, authority links |
| issues | type, summary, severity/probability/impact, relevance, owner, status, source document/clause/authority, positions, action, report inclusion |
| agent_runs | agent/user/matter, input scope, model/zone/template, status, output, evidence count, policy decision, reviewer, cost, latency |

### Security And Permission

Must cover:

- Minimum privilege
- AI permission intersection: user permission AND agent permission AND tool permission AND matter policy AND label policy
- Read-only default
- External transfer approval
- Ethical Wall precedence
- Source/citation enforcement
- Ban on unauditable work
- RBAC roles: System Admin, Data Governance Admin, Managing Partner, Responsible Partner, Matter Attorney, Paralegal, Knowledge Manager, Billing User, Client User, External Advisor, Counterparty User
- ABAC attributes: client_id, matter_id, matter_security_level, document_confidentiality, privilege_label, source_side, personal_data_level, ai_policy, external_share_policy, retention_label, jurisdiction, model_restriction
- Security labels: CLIENT_CONFIDENTIAL, HIGHLY_CONFIDENTIAL, ATTORNEY_SECRET, PRIVILEGED_OR_PROTECTED, WORK_PRODUCT, COUNTERPARTY_MATERIAL, PERSONAL_INFORMATION, SENSITIVE_PERSONAL_INFORMATION, TRADE_SECRET, PUBLIC, EXTERNAL_SHAREABLE, AI_BLOCKED, INTERNAL_AI_ONLY, LITIGATION_HOLD

### Ingestion And Document Intelligence

Must cover all 12 pipeline steps:

1. Intake
2. Hashing
3. Matter Mapping
4. Type Classification
5. Version Detection
6. Text Extraction
7. Clause/Chunk Segmentation
8. Entity Extraction
9. Security Tagging
10. Indexing
11. Quality Check
12. Human Review

Must cover document types:

SPA, SHA, NDA, investment agreement, articles, board minutes, shareholder meeting minutes, registry extract, shareholder registry, DD materials, email, meeting note, authority/law/case, internal memo.

Must cover version labels:

execution, final_clean, final_redline, board_approved, counterparty_mark_up, client_mark_up, internal_review, initial_draft, unknown.

Must cover failure defaults:

OCR failure, uncertain type, version conflict, uncertain security label, suspected personal data, uncertain external shareability, uncertain AI processability.

### Search And Analyst

Must cover:

- Keyword Search
- Semantic Search
- Metadata Filter Search
- Clause Search
- Authority Search
- Email Search
- Similar Matter Search
- Negative Search
- Matter status structured queries
- DD status queries
- billing/time analysis queries
- contract status queries
- issue status queries
- external sharing status queries
- AI usage/cost/failure queries

### Agents

Each named agent requires input, output, policy, tests, evidence, and human-review handling:

1. Document Classifier Agent
2. Version Resolver Agent
3. Clause Extractor Agent
4. Definition Consistency Agent
5. Cross-reference Checker Agent
6. Condition & Obligation Consistency Agent
7. DD Request Mapping Agent
8. DD Issue Agent
9. Negotiation Tracker Agent
10. Report Builder Agent
11. Authority Update Agent
12. External Share Safety Agent

### Tool Registry

All T0-T7 tiers must be covered:

- T0 Read Metadata
- T1 Read Content
- T2 Analyze
- T3 Draft
- T4 Modify Internal
- T5 Modify Document
- T6 External Share
- T7 External Send

Every tool call must log: tool_call_id, agent_run_id, tool_id, user_id, matter_id, input_hash, input_summary, output_hash, output_summary, policy_decision, policy_reason, started_at, ended_at, external_api_called, data_left_boundary, approval_id.

Approval workflow must cover external share posting, client email draft use, counterparty email draft use, Word redline save, privileged material sharing, personal-data material sharing, and Ethical Wall exception access.

### Clean Room

Room types:

Client Review Room, Buyer DD Room, Seller Response Room, Joint Counsel Room, Regulator Response Room, Litigation Production Room, Board Room.

Shared objects:

Document, Document Chunk, Issue, Report, Data View, Search Service, Q&A, AI Summary.

Policies:

default_no_download, watermark_required, screenshot_warning, expiry_required, purpose_binding, no_cross_room_search, export_approval, revocation, post-access audit.

Query templates:

Submitted-material list, specific document preview, issue query, personal-data-excluded summary, aggregate/statistical query, Q&A submission.

### UI Surfaces

Must cover:

- Matter Dashboard: summary, current state, documents, issues, DD progress, negotiation, AI panel, security, audit
- Document Viewer: preview, version tree, clause nav, terms, errors, evidence links, labels, AI actions, share approval state
- Contract Review Workspace: clause map, checklist, redline analysis, inconsistency matrix, negotiation tracker, suggested comments, partner review
- DD App: request list, submission mapping, completeness, issue extraction, severity review, report sync, client Q&A
- Agent Control Center: agent catalog, run history, evidence viewer, tool trace, policy decision, review queue, quality metrics, prompt/template manager

### NFR, Compliance, Quality, Tests

Must cover:

- SEC-001 through SEC-009
- PERF-001 through PERF-006
- AVAIL-001 through AVAIL-006
- DQ-001 through DQ-007
- AIQ-001 through AIQ-008
- Attorney secrecy and privilege-like technical labels
- Personal information controls
- E-document preservation metadata
- Agent output format with evidence table, excluded data, uncertainty, recommended action, reviewer, approval status
- AI metrics: source accuracy, version accuracy, cross-client leakage, citation coverage, clause recall, severity agreement, reviewer edit rate, rejection rate, hallucination candidate, cost per task, latency
- Data metrics: freshness, completeness, version conflict, duplicate rate, OCR failure, clause segmentation error, unmapped DD request, unreviewed high issue, external share exception, audit gap
- Tests: T-SEC-001 through T-SEC-006, T-DOC-001 through T-DOC-005, T-CON-001 through T-CON-005, T-DD-001 through T-DD-005, T-AI-001 through T-AI-005

### APIs And Events

Must cover all named APIs:

- Create Matter
- Update Matter Status
- Add Party
- Upload Document
- Register Document Version
- Parse Document
- Search Documents
- Search Clauses
- Run Agent
- Get Agent Evidence
- Approve Output
- Create Issue
- Update DD Request
- Create Clean Room
- Share Document
- Revoke Share
- Get Audit Trail

Must cover all named events:

- matter.created
- document.uploaded
- document.hash_created
- document.duplicate_detected
- document.parsed
- document.parse_failed
- document.version_conflict
- document.security_tagged
- clause.extracted
- issue.created
- dd_request.matched
- search.executed
- agent.started
- agent.tool_called
- agent.policy_blocked
- agent.completed
- output.review_requested
- output.approved
- clean_room.created
- external_user.invited
- document.shared
- document.downloaded
- share.revoked
- audit.exported

### Priority And Risk

MVP must include:

Client/Matter/Document Catalog, Matter-level permission, upload/versioning, document type classification, final/current version display, keyword+semantic search, audit log, definition/cross-reference agents, DD mapping, evidence-bound AI output.

Second wave must include:

Clause Bank, Authority Bank, Email Negotiation Tracker, Report Builder, Issue Severity Agent, Agent Quality Dashboard, external share approvals, personal/confidential info detection, model routing, cost dashboard.

Third wave must include:

Legal Clean Room, client portal, joint diligence room, automatic redaction, advanced AISQL-like queries, similar matter recommendations, automated report workflow, authority freshness monitoring, external law DB integrations, enterprise BI/profitability analytics.

Risks must include:

Cross-client leakage, version misidentification, unsupported legal conclusion, external share incident, privilege-label misuse, metadata/data quality drift, vendor lock-in, model cost growth, user distrust, policy complexity.
