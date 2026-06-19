# Law Firm OS v2.0 Missing Requirements Specification

작성일: 2026-06-08

상태: planning-only requirement specification. 이 문서는 `Law_Firm_OS_Enterprise_SaaS_사양명세서_v2.0.docx`에서 확인된 요구사항 중, 현재 Law Firm OS RP/CP 계획에 기능군 수준으로는 일부 반영되어 있으나 제품 아키텍처 이름, 데이터 모델, 수용기준, 검증 표면이 아직 명시적으로 고정되지 않은 누락 요구사항만 정리한다.

이 문서는 구현, ledger 변경, contract 변경, validator 변경, `production_ready` 선언을 승인하지 않는다. 실제 구현은 기존 Closeout Pack 절차에 따라 별도 pack manifest, command evidence, Claude review, adjudication, construction inspection, final validation, commit을 거쳐야 한다.

## 1. Baseline And Scope

### 1.1 Current Execution Baseline

- 현재 라이브 완료 pack: `CP00-144`
- 현재 다음 pack: `CP00-145`
- 현재 다음 unit: `RP03.P06.M03.S20`
- 현재 lane: `RP03 Audit And Compliance Kernel`
- 이 문서의 적용 방식: 현재 `CP00-145-CP00-176` 병렬 구현 범위에 직접 삽입하지 않고, 향후 RP05/RP06/RP07/RP08/RP17/RP18/RP24/RP26/RP27/RP29 진입 전 또는 별도 planning overlay에서 anchor map으로 반영한다.

### 1.2 Explicit Non-Scope

- 우로보로스 개념, 명칭, 순환 게이트, 런타임, question engine은 도입하지 않는다.
- 기존 `RP -> CP -> microphase -> evidence closeout` 절차를 대체하지 않는다.
- 이미 기존 계획이 충분히 덮는 일반 SaaS 기능을 재작성하지 않는다.
- 기존 `docs/spec-coverage-audit.md`의 `Missing: 0` 결론을 부정하지 않는다. 해당 audit은 기존 사양 ledger 기준의 feature coverage이며, 본 문서는 v2.0 DOCX에서 새로 부각된 아키텍처 spine과 제품 개념의 명시성 gap을 다룬다.

### 1.3 Already Covered And Excluded From This Spec

아래 항목은 기존 RP/CP 계획에 이미 충분한 책임 RP가 있으므로 이 문서의 누락 요구사항으로 재등록하지 않는다.

| Area | Existing anchors | Exclusion reason |
| --- | --- | --- |
| Tenant, workspace, authentication, SSO/MFA | RP00, RP01, RP21, RP26 | 기존 ledger와 RP 계획에 SaaS foundation으로 포함됨 |
| RBAC, ABAC, ethical wall, permission review | RP02, RP10, RP16, RP21 | 현재 active lane 및 governance RP에 포함됨 |
| Generic audit, append-only evidence, security events | RP03, RP16, RP17, RP29 | 기존 audit/compliance kernel이 포함 |
| Basic Matter lifecycle, task, calendar, checklist | RP05 | Matter Core가 포함 |
| Basic DMS upload/download/preview/version/check-in/out | RP06 | DMS Core가 포함 |
| OCR, metadata search, clause search, semantic search | RP07 | Search OCR And Index가 포함 |
| Outlook/Gmail/Office filing, attachment extraction | RP08 | Email And Office Native DMS가 포함 |
| Generic AI governance, model policy, retrieval trimming, citation validation | RP17 | AI Governance가 포함 |
| Generic AI legal workflows | RP18 | AI Legal Workflows가 포함 |
| Client portal, external sharing, VDR | RP19, RP20 | Portal/VDR lanes가 포함 |
| External integrations and API/event surface | RP22, RP23, RP27 | Integration/extensibility lanes가 포함 |
| Enterprise hardening, DR, observability, commercial readiness | RP26, RP29 | Hardening/commercial lanes가 포함 |

## 2. Missing Requirement Themes

### 2.1 Gap Summary

| Gap ID | Theme | Missing nature | Primary future anchors | Priority |
| --- | --- | --- | --- | --- |
| V2-MISS-KNOW | Matter Wiki, LLM Wiki, Obsidian export | Product knowledge layer not explicitly modeled | RP05, RP06, RP07, RP17, RP18, RP27 | P0 |
| V2-MISS-GRAPH | Matter Graph and graph views | Graph spine not explicitly modeled | RP05, RP06, RP07, RP08, RP17, RP18, RP24 | P0 |
| V2-MISS-CITE | Citation Ledger | Product-wide citation ledger is stronger than current Citation model | RP06, RP07, RP17, RP18, RP24 | P0 |
| V2-MISS-AI | Local AI Worker and hybrid routing | Local/Gemma worker is not explicitly specified | RP17, RP18, RP26, RP27, RP29 | P0 |
| V2-MISS-DMS | Document Register and lineage extensions | DMS has core fields but not the v2.0 register contract | RP06, RP07, RP08, RP16, RP25 | P1 |
| V2-MISS-NEG | Negotiation Ledger | Email/redline negotiation state not explicitly first-class | RP08, RP18, RP05, RP06 | P1 |
| V2-MISS-AUTH | Authority Graph and authority freshness | Legal authority graph not explicitly bound to AI/citation | RP24, RP17, RP07, RP18 | P1 |
| V2-MISS-DEPLOY | Private/Sovereign hybrid deployment | Deployment model names and worker-control-plane boundary not explicit | RP26, RP27, RP29 | P1 |
| V2-MISS-PLAN | v2.0 Stage-to-RP mapping | v2.0 roadmap not mapped to existing CP/RP plan | planning overlay | P2 |

## 3. Detailed Requirements

### 3.1 V2-MISS-KNOW: Matter Wiki And LLM Wiki

#### V2-MISS-KNOW-001 Matter Wiki Entity

Requirement: Law Firm OS must define `MatterWiki` as a first-class Matter knowledge workspace, not merely as a free-form Matter note.

Source basis: v2.0 DOCX paragraphs 276-318 describe Matter Wiki and LLM Wiki; paragraph 278 defines Matter Wiki as the workspace for current state, issues, risks, unresolved questions, evidence, negotiation history, outputs, and next actions.

Primary anchors:

- RP05 Matter Core
- RP06 DMS Core
- RP07 Search OCR And Index
- RP17 AI Governance
- RP18 AI Legal Workflows

Required data model:

| Entity | Required fields |
| --- | --- |
| MatterWiki | `wiki_id`, `tenant_id`, `matter_id`, `status`, `created_by`, `created_at`, `updated_by`, `updated_at`, `last_reviewed_by`, `last_reviewed_at`, `snapshot_version` |
| MatterWikiSection | `section_id`, `wiki_id`, `section_type`, `title`, `body`, `source_policy`, `review_status`, `order_index`, `updated_at` |
| MatterWikiSourceLink | `link_id`, `section_id`, `source_type`, `source_id`, `citation_id`, `document_version_id`, `email_message_id`, `ai_result_id`, `permission_envelope_id` |
| MatterWikiSnapshot | `snapshot_id`, `wiki_id`, `snapshot_hash`, `created_by`, `created_at`, `reason`, `retention_class` |

Required section types:

- `current_state`
- `key_issues`
- `risks`
- `open_questions`
- `evidence`
- `negotiation_history`
- `outputs`
- `next_actions`
- `client_visible_summary`
- `internal_only_notes`

Acceptance criteria:

- Creating a Matter must create or schedule creation of a default Matter Wiki shell.
- Every Matter Wiki section that references source material must store at least one `MatterWikiSourceLink` or explicitly mark itself as `uncited_internal_note`.
- `client_visible_summary` must be permission-trimmed and must exclude internal-only, privileged, unresolved, or unreviewed AI candidate material.
- Wiki updates must be versioned through `MatterWikiSnapshot` or an equivalent immutable snapshot mechanism.
- AI-generated wiki text must remain `candidate` or `under_review` until a human review state promotes it.
- Matter Wiki search, export, and AI retrieval must obey the same Matter permission envelope as DMS, Search, AI Governance, and Client Portal.

#### V2-MISS-KNOW-002 LLM Wiki Retrieval Layer

Requirement: Law Firm OS must define `LLMWiki` as a structured retrieval layer separate from human-facing Matter Wiki content.

Source basis: v2.0 DOCX paragraphs 313-318 define LLM Wiki as GraphRAG context material, require separation of AI candidates from confirmed knowledge, require Citation Ledger binding, and require Obsidian-compatible export.

Primary anchors:

- RP07 Search OCR And Index
- RP17 AI Governance
- RP18 AI Legal Workflows
- RP27 Platform Extensibility

Required data model:

| Entity | Required fields |
| --- | --- |
| LLMWikiEntry | `entry_id`, `tenant_id`, `matter_id`, `entry_type`, `canonical_text`, `normalized_key`, `status`, `confidence`, `source_count`, `last_reviewed_by`, `last_reviewed_at` |
| KnowledgeAssertion | `assertion_id`, `entry_id`, `assertion_text`, `assertion_type`, `citation_ids`, `confidence`, `status`, `supersedes_assertion_id` |
| DisputedFact | `dispute_id`, `matter_id`, `claim_text`, `position_a`, `position_b`, `citation_ids`, `review_owner`, `status` |
| OpenQuestion | `question_id`, `matter_id`, `question_text`, `owner_user_id`, `needed_by`, `source_ids`, `status` |
| RetrievalContextPacket | `packet_id`, `matter_id`, `requesting_ai_job_id`, `entry_ids`, `trimmed_entry_count`, `permission_decision_id`, `created_at` |

Required statuses:

- `generated`
- `candidate`
- `under_review`
- `confirmed`
- `rejected`
- `superseded`
- `archived`

Acceptance criteria:

- GraphRAG retrieval must identify whether each returned entry is `confirmed`, `candidate`, or `under_review`.
- High-risk legal output must not use unreviewed candidate knowledge unless the AI policy explicitly allows candidate context and the output remains review-required.
- Every confirmed `LLMWikiEntry` must have at least one citation or a documented human-entered provenance exception.
- Disputed facts and open questions must never be flattened into canonical facts.
- A permission-trimmed RetrievalContextPacket must record what was removed from retrieval by count and reason, without leaking hidden content.

#### V2-MISS-KNOW-003 Obsidian-Compatible Export

Requirement: Law Firm OS must support a controlled export of Matter Wiki and LLM Wiki material into Markdown, YAML frontmatter, and wikilink-compatible references.

Source basis: v2.0 DOCX paragraph 318.

Primary anchors:

- RP05 Matter Core
- RP17 AI Governance
- RP22 External Integrations I
- RP27 Platform Extensibility

Required export behavior:

- Export must be read-only by default.
- Export must apply Matter permission, ethical wall, DLP, retention, and client-sharing policy before file generation.
- YAML frontmatter must include `tenant_id`, `matter_id`, `wiki_id`, `snapshot_id`, `classification`, `review_status`, `exported_by`, and `exported_at`.
- Wikilinks must use stable non-sensitive slugs or redacted aliases when names are restricted.
- Citation references must be exported as stable IDs, not raw hidden document excerpts unless permitted.

Acceptance criteria:

- Exporting a wiki snapshot must generate deterministic Markdown from the same snapshot.
- Export must be blocked if it would include unreviewed AI output in a client-visible or externally shared package.
- Export logs must record actor, matter, snapshot, policy decision, generated files, and redaction summary.

### 3.2 V2-MISS-GRAPH: Matter Graph

#### V2-MISS-GRAPH-001 Graph Provider Boundary

Requirement: Law Firm OS must define a graph-provider boundary for Matter Graph. Neo4j may be the preferred implementation, but product contracts must describe the graph capability independently enough to support validation, permission trimming, and future provider substitution.

Source basis: v2.0 DOCX paragraphs 36, 45, 62, 90, 127-128, 147, 191, and 223-228.

Primary anchors:

- RP05 Matter Core
- RP06 DMS Core
- RP07 Search OCR And Index
- RP08 Email And Office Native DMS
- RP17 AI Governance
- RP18 AI Legal Workflows

Required contract:

| Contract surface | Requirement |
| --- | --- |
| GraphProvider | must expose deterministic node/edge upsert, relationship query, permission-trimmed traversal, snapshot, and audit metadata |
| GraphNode | must carry tenant, matter, node type, source reference, classification, review status, and permission envelope |
| GraphEdge | must carry tenant, matter, edge type, source reference, confidence, created_by, created_at, and review status |
| GraphTraversalResult | must include visible nodes, visible edges, trimmed counts, policy decision ID, and audit hints |

Acceptance criteria:

- No graph query may return nodes or edge labels that the actor could not access through the underlying source object.
- Graph mutations must be idempotent by source event or source version.
- Cross-Matter similarity traversal must be disabled by default unless a policy explicitly allows it.
- Graph snapshots must be usable as evidence for AI output citations and review queues.

#### V2-MISS-GRAPH-002 Matter Graph Node And Edge Vocabulary

Requirement: Law Firm OS must define a minimum graph vocabulary before dependent GraphRAG, Matter Wiki, Citation Ledger, and visual graph surfaces are implemented.

Required node types:

- `Matter`
- `Client`
- `Party`
- `Document`
- `DocumentVersion`
- `EmailMessage`
- `Clause`
- `DefinedTerm`
- `Fact`
- `Issue`
- `Risk`
- `Citation`
- `Authority`
- `AIResult`
- `ReviewDecision`
- `WorkflowRun`
- `Task`
- `NegotiationEvent`

Required edge types:

- `BELONGS_TO_MATTER`
- `HAS_VERSION`
- `HAS_CITATION`
- `SUPPORTS_FACT`
- `CONTRADICTS_FACT`
- `RAISES_ISSUE`
- `MITIGATES_RISK`
- `REFERENCES_AUTHORITY`
- `GENERATED_AI_RESULT`
- `REVIEWED_BY`
- `SUPERSEDES`
- `DERIVED_FROM`
- `NEGOTIATED_IN`
- `SIMILAR_TO`

Acceptance criteria:

- Every `Fact`, `Issue`, `Risk`, and `AIResult` node must link to at least one source node through `HAS_CITATION`, `DERIVED_FROM`, or an explicit human provenance exception.
- `SIMILAR_TO` edges must include a similarity method, score, source index, and permission decision.
- `ReviewDecision` must be linked to the object it reviewed and cannot be inferred from UI state alone.

#### V2-MISS-GRAPH-003 Graph Views

Requirement: Law Firm OS must define the named graph views from v2.0 as product surfaces with explicit boundaries and acceptance criteria.

Source basis: v2.0 DOCX paragraphs 223-228.

Required graph views:

| View | Purpose | Primary dependencies |
| --- | --- | --- |
| Matter Graph View | show documents, issues, risks, facts, citations, and AI outputs inside a Matter | RP05, RP06, RP17 |
| Evidence Graph | show source documents and citations supporting facts or outputs | RP06, RP07, RP17 |
| Issue-Risk Graph | show issue/risk relationships and mitigations | RP05, RP17, RP18 |
| Negotiation Graph | show email, redline, clause, position, concession, and counterparty movement | RP08, RP18 |
| Authority Graph | show legal authorities, internal opinions, and generated outputs | RP24, RP17 |
| Cross-Matter Similarity Graph | show permitted similar matters, clauses, risks, and precedents | RP07, RP17, RP24 |

Acceptance criteria:

- Every graph view must display permission-trimmed counts without revealing hidden node labels.
- Graph view export must use the same DLP and external-sharing controls as DMS export.
- Client-visible graph views must be separate from internal-only views.
- Graph view rendering must not create authority claims; it visualizes validated graph data only.

### 3.3 V2-MISS-CITE: Citation Ledger

#### V2-MISS-CITE-001 Product-Wide Citation Ledger

Requirement: Law Firm OS must define `CitationLedger` as a product-wide evidence spine that binds source anchors to AI output, Matter Wiki, LLM Wiki, graph nodes, workflows, and client-delivered outputs.

Source basis: v2.0 DOCX paragraphs 36, 65, 242, 270, 317, 334, 729-730.

Primary anchors:

- RP06 DMS Core
- RP07 Search OCR And Index
- RP17 AI Governance
- RP18 AI Legal Workflows
- RP24 Korean Legal Depth

Required data model:

| Entity | Required fields |
| --- | --- |
| CitationLedgerEntry | `citation_id`, `tenant_id`, `matter_id`, `source_type`, `source_id`, `document_version_id`, `anchor_type`, `anchor_locator`, `source_hash`, `quote_hash`, `created_by`, `created_at`, `review_status`, `confidence`, `permission_envelope_id`, `retention_class` |
| CitationAnchor | `anchor_id`, `citation_id`, `anchor_type`, `page`, `paragraph`, `line`, `span_start`, `span_end`, `byte_start`, `byte_end`, `time_offset`, `normalized_text_hash` |
| CitationUse | `use_id`, `citation_id`, `used_by_type`, `used_by_id`, `use_reason`, `created_at`, `policy_decision_id` |
| CitationInvalidation | `invalidation_id`, `citation_id`, `reason`, `detected_at`, `detected_by`, `superseding_citation_id` |

Acceptance criteria:

- High-risk AI output, legal judgment, client-facing report, Matter Wiki confirmed fact, LLM Wiki confirmed entry, and graph Fact/Issue/Risk node must be blocked or review-required if uncited.
- Citation anchors must bind to immutable source versions; if the source version changes, the old citation remains immutable and a new citation is created or the old one is invalidated.
- Citation ledger entries must support source-panel display without exposing hidden documents to unauthorized users.
- The ledger must distinguish exact quote, paraphrase, summary, extracted metadata, and human assertion citations.
- Citation validation must be a reusable service consumed by AI Governance, Search, Matter Wiki, LLM Wiki, DMS, and Client Portal.

#### V2-MISS-CITE-002 Source Panel And Evidence UX Contract

Requirement: Every AI output, Matter Wiki statement, LLM Wiki entry, graph fact, and delivered report must support a source panel that shows permitted citations, source state, review state, and confidence.

Acceptance criteria:

- If a user lacks source access, the source panel must show a redacted citation shell with policy reason, not the hidden excerpt.
- Source panel must identify stale, superseded, rejected, unreviewed, or candidate citations.
- Source panel must be exportable only under the same policy as the underlying source materials.

### 3.4 V2-MISS-AI: Local AI Worker And Hybrid Routing

#### V2-MISS-AI-001 Local AI Worker

Requirement: Law Firm OS must define a Local AI Worker capability for confidential local processing, including Gemma 4 12B or equivalent local models as pluggable model candidates.

Source basis: v2.0 DOCX paragraphs 112, 324-326, 353, 362, 603, 617.

Primary anchors:

- RP17 AI Governance
- RP18 AI Legal Workflows
- RP26 Enterprise SaaS Hardening
- RP27 Platform Extensibility
- RP29 Commercial Readiness

Required worker capabilities:

- confidential document classification
- OCR structuring and cleanup
- PII and sensitive-information detection
- basic document and email summary
- metadata extraction
- issue/risk candidate extraction where policy permits
- local-only processing for high-sensitivity matters

Required data model:

| Entity | Required fields |
| --- | --- |
| LocalAIWorker | `worker_id`, `tenant_id`, `deployment_id`, `region`, `model_family`, `model_version`, `capability_set`, `health_status`, `last_heartbeat_at`, `policy_scope` |
| LocalAIJob | `job_id`, `worker_id`, `tenant_id`, `matter_id`, `job_type`, `input_scope_hash`, `output_hash`, `status`, `retry_count`, `created_at`, `completed_at`, `policy_decision_id` |
| ModelCapability | `capability_id`, `model_name`, `model_version`, `task_type`, `quality_tier`, `allowed_sensitivity`, `cost_profile`, `residency_profile` |

Acceptance criteria:

- A high-sensitivity Matter can be configured so raw documents never leave the local worker boundary.
- Local worker output must still enter AI Governance review and Citation Ledger rules before confirmation.
- Worker health, queue depth, failed jobs, retries, and policy blocks must be observable.
- Model version and prompt/versioned instruction identifiers must be recorded for every local AI job.
- Local worker failure must fail closed for confidential jobs and must not silently reroute to an external model.

#### V2-MISS-AI-002 Hybrid Model Routing

Requirement: Law Firm OS must define hybrid routing between Local AI Worker, strong external LLM gateway, and human review based on sensitivity, client policy, residency, cost, quality, task risk, and approval state.

Source basis: v2.0 DOCX paragraphs 69, 93, 112, 334, 353-362.

Required routing inputs:

- matter sensitivity
- client AI policy
- data residency policy
- privilege/confidentiality classification
- task type
- required quality tier
- expected cost
- available model capability
- human approval requirement
- citation requirement

Required routing outcomes:

- `local_only`
- `external_allowed`
- `external_requires_approval`
- `human_only`
- `blocked`
- `review_required_after_generation`

Acceptance criteria:

- Routing decisions must be persisted as policy decisions and exposed to audit.
- A user or workflow cannot bypass routing by directly selecting a model.
- External model use must record input scope, redaction status, model name/version, prompt version, output hash, and approval state.
- Client-facing wording generated by AI must require human approval before delivery.

#### V2-MISS-AI-003 AI Result Lifecycle And Provenance

Requirement: AI output must have a full lifecycle and provenance model beyond generic AI job audit.

Source basis: v2.0 DOCX states generated, candidate, under_review, revised_by_human, confirmed, rejected, superseded, exported, delivered_to_client.

Required states:

- `generated`
- `candidate`
- `under_review`
- `revised_by_human`
- `confirmed`
- `rejected`
- `superseded`
- `exported`
- `delivered_to_client`

Required metadata:

- model name and version
- prompt version
- input scope
- output hash
- created by
- reviewed by
- citation IDs
- confidence
- policy decision
- retention class
- delivery/export record

Acceptance criteria:

- `delivered_to_client` cannot occur unless the output is confirmed or explicitly approved for delivery.
- Revisions by a human must preserve the original AI output hash and link the revised version.
- Rejected or superseded outputs must remain auditable but must be excluded from confirmed knowledge retrieval.

### 3.5 V2-MISS-DMS: Document Register And Lineage

#### V2-MISS-DMS-001 Document Register

Requirement: Law Firm OS must define a named `DocumentRegister` contract that consolidates matter-bound document metadata, citation anchors, privilege, confidentiality, source, status, and AI processing status.

Source basis: v2.0 DOCX paragraphs 242-270 and 615-618.

Primary anchors:

- RP06 DMS Core
- RP07 Search OCR And Index
- RP08 Email And Office Native DMS
- RP16 Governance DLP Retention
- RP25 Migration Platform

Required fields:

- Document ID
- Matter ID
- Document Type
- Version
- Source
- Status
- Privilege
- Confidentiality
- Citation Anchors
- AI Processed
- Hash
- Storage URI
- Version Group
- Uploaded By
- Reviewed By
- Source Email or Connector ID
- Retention Class
- Legal Hold State

Acceptance criteria:

- Every document or email attachment filed into a Matter must create or update a Document Register row.
- Document Register must be permission-trimmed before UI, export, search, graph, or AI retrieval.
- AI Processed must distinguish not processed, queued, processed, failed, rejected, and stale.
- Register rows must survive migration/backfill and preserve original source identifiers where available.

#### V2-MISS-DMS-002 Extended Source And Lineage

Requirement: Document and email ingestion must explicitly track source lineage across DOCX, PDF, XLSX, PPTX, MSG, EML, ZIP, images, scans, email body, attachment, connector import, migration import, and manual upload.

Acceptance criteria:

- Source lineage must identify original source, import path, extracted child files, parent container, hash, and parser version.
- ZIP or email extraction must preserve parent-child relationships.
- OCR or parser output must be linked to the exact source version and parser version.
- Reprocessing must create a new processing record, not overwrite the prior processing evidence.

### 3.6 V2-MISS-NEG: Negotiation Ledger

#### V2-MISS-NEG-001 Negotiation Ledger

Requirement: Law Firm OS must define a `NegotiationLedger` that links emails, attachments, redlines, clause changes, positions, concessions, counterparty comments, and Matter Graph nodes.

Source basis: v2.0 DOCX paragraphs 241, 429, and Word/Outlook workflow sections.

Primary anchors:

- RP08 Email And Office Native DMS
- RP18 AI Legal Workflows
- RP05 Matter Core
- RP06 DMS Core

Required data model:

| Entity | Required fields |
| --- | --- |
| NegotiationEvent | `event_id`, `tenant_id`, `matter_id`, `event_type`, `occurred_at`, `source_email_id`, `source_document_version_id`, `actor_party`, `counterparty`, `summary`, `citation_ids` |
| NegotiationPosition | `position_id`, `event_id`, `clause_id`, `position_text`, `risk_level`, `accepted`, `rejected`, `open` |
| ClauseChange | `change_id`, `document_version_id`, `clause_id`, `change_type`, `before_hash`, `after_hash`, `source_event_id`, `review_status` |

Acceptance criteria:

- Email filing must be able to create negotiation events without exposing hidden email content to unauthorized users.
- Redline and clause changes must link back to DocumentVersion and Citation Ledger.
- AI-generated negotiation summary must remain review-required until approved.
- Negotiation Ledger entries must feed the Negotiation Graph only through permission-trimmed graph events.

### 3.7 V2-MISS-AUTH: Authority Graph

#### V2-MISS-AUTH-001 Authority Graph

Requirement: Law Firm OS must define legal authority nodes and relationships that connect statutes, cases, regulatory guidance, internal opinions, client positions, and AI outputs.

Source basis: v2.0 DOCX paragraph 227 and Stage 2/3 roadmap references.

Primary anchors:

- RP24 Korean Legal Depth
- RP17 AI Governance
- RP07 Search OCR And Index
- RP18 AI Legal Workflows

Required node types:

- `Statute`
- `Regulation`
- `Case`
- `AdministrativeGuidance`
- `InternalOpinion`
- `LegalIssue`
- `AuthorityCitation`
- `AuthorityUpdate`

Required fields:

- jurisdiction
- authority type
- publication date
- effective date
- freshness status
- source URL or source document ID
- citation IDs
- reviewer
- reviewed at
- superseded by

Acceptance criteria:

- AI legal output that relies on authority must link to Authority Graph or Citation Ledger evidence.
- Stale or superseded authorities must trigger review-required status.
- Authority freshness must be auditable and must not rely on uncited model memory.
- Jurisdiction-specific legal depth must preserve Korean legal authority requirements without making the whole product Korea-only.

### 3.8 V2-MISS-DEPLOY: Private/Sovereign And Hybrid Deployment

#### V2-MISS-DEPLOY-001 Deployment Model Contract

Requirement: Law Firm OS must explicitly model deployment modes from v2.0: multi-tenant SaaS, single-tenant dedicated SaaS, private cloud, customer-managed, and hybrid local AI worker plus SaaS control plane.

Source basis: v2.0 DOCX deployment and pricing sections; paragraphs 112, 566, 581.

Primary anchors:

- RP26 Enterprise SaaS Hardening
- RP27 Platform Extensibility
- RP29 Commercial Readiness

Required deployment modes:

- `multi_tenant_saas`
- `single_tenant_dedicated`
- `private_cloud`
- `customer_managed`
- `hybrid_local_worker`
- `private_sovereign`

Acceptance criteria:

- Deployment mode must influence model routing, data residency, storage, backup, observability, support SLA, and integration limits.
- Private/Sovereign plan must expose separate SLA, support channel, security review, penetration test report availability, and customer-managed key policy.
- Hybrid worker deployments must define control-plane-to-worker trust, queue, retry, failure, and audit boundaries.

### 3.9 V2-MISS-PLAN: Stage-To-RP Mapping

#### V2-MISS-PLAN-001 v2.0 Stage Overlay Map

Requirement: The v2.0 roadmap stages must be mapped to the existing RP/CP execution plan without replacing it.

Source basis: v2.0 DOCX Stage 0-6 roadmap; paragraphs 589-618.

Required mapping:

| v2.0 stage | Meaning | Existing RP anchors |
| --- | --- | --- |
| Stage 0 SaaS Foundation | Tenant, auth, audit, admin, foundation | RP00, RP01, RP02, RP03, RP21, RP26 |
| Stage 1 Matter & Document Core | Matter, DMS, version, viewer, search, citation anchor | RP05, RP06, RP07 |
| Stage 2 Matter Graph & Citation | Graph schema, issue/risk/citation, graph view, review queue | RP05, RP06, RP07, RP17, RP18, RP24 |
| Stage 3 Legal AI Workflow | Policy engine, model router, GraphRAG, SPA/LDD/RFI | RP17, RP18 |
| Stage 4 Word/Outlook UX | Native Office and Outlook workflows | RP08, RP22, RP23 |
| Stage 5 Enterprise Governance | DLP, ethical wall, SSO, audit, deployment | RP02, RP03, RP16, RP21, RP26 |
| Stage 6 Marketplace | Custom agents, legal apps, templates | RP27, RP28, RP29 |

Acceptance criteria:

- The stage overlay must not renumber existing CP packs.
- Each v2.0 gap must map to an RP anchor, a defer/reject reason, or a future user-approved scope revision.
- Stage overlay must be used for planning clarity only; implementation authority remains with Closeout Packs.

## 4. Priority And Insertion Recommendation

### 4.1 P0 Requirements

P0 items should be anchored before their dependent RP lanes start, or at minimum before the first implementation pack that would make the missing concept expensive to retrofit.

| Requirement family | Recommended timing | Reason |
| --- | --- | --- |
| Matter Wiki and LLM Wiki | before RP05/RP17 implementation starts | Matter and AI retrieval semantics depend on this distinction |
| Matter Graph provider and vocabulary | before RP05/RP06/RP17 graph-adjacent implementation | Graph shape affects DMS, AI, citation, and search |
| Citation Ledger | before RP06/RP07/RP17 implementation | Citation spine should not be retrofitted after DMS/AI are implemented |
| Local AI Worker and hybrid routing | before RP17/RP18 and RP26 implementation | Model routing and deployment policy affect AI governance and hardening |

### 4.2 P1 Requirements

| Requirement family | Recommended timing | Reason |
| --- | --- | --- |
| Document Register and lineage | before RP06/RP08/RP25 implementation | DMS metadata and migration need stable lineage |
| Negotiation Ledger | before RP08/RP18 implementation | Email/redline workflows need first-class negotiation history |
| Authority Graph | before RP24 and before high-risk legal AI outputs | Legal authority freshness needs explicit model |
| Private/Sovereign deployment | before RP26/RP29 implementation | Commercial/SLA/deployment packaging depends on this |

### 4.3 P2 Requirements

| Requirement family | Recommended timing | Reason |
| --- | --- | --- |
| Stage-to-RP overlay map | now or before next planning refresh | Helps compare v2.0 roadmap with existing CP plan without changing execution authority |

## 5. Validation Expectations

This document introduces requirements only. Later implementation or anchor-map work should add concrete validators.

Required future validation surfaces:

- `v2-spec-overlay:validate`: validates that every `V2-MISS-*` requirement has RP anchor, status, and decision.
- `citation-ledger:validate`: validates citation anchors, source hashes, lifecycle states, and uncited high-risk output blocks.
- `matter-graph:validate`: validates node/edge vocabulary, permission trimming, graph snapshot, and cross-Matter policy.
- `matter-wiki:validate`: validates wiki sections, source links, snapshots, client-visible trimming, and AI candidate separation.
- `llm-wiki:validate`: validates retrieval packet trimming, confirmed/candidate separation, citations, disputed facts, and open questions.
- `local-ai-worker:validate`: validates routing decisions, worker health, model provenance, local-only failure behavior, and external model approval.
- `document-register:validate`: validates required register fields, lineage, source hierarchy, and AI processed state.

## 6. Done Criteria For This Planning Layer

The v2.0 missing-requirements planning layer is complete only when:

1. Each `V2-MISS-*` requirement is either mapped to an RP/microphase anchor, explicitly deferred, or explicitly rejected.
2. P0 items have future contract, model, service, fixture, permission/audit, failure, Hermes evidence, and Claude review surfaces identified.
3. No item is inserted directly into `CP00-145-CP00-176` unless a future pack explicitly touches the same semantics and records a plan deviation.
4. The DOCX source remains referenced as a planning source, not silently staged as implementation evidence.
5. The Closeout Pack process remains the only implementation authority.

## 7. Proposed Follow-Up Artifacts

Recommended next planning artifacts:

- `docs/spec-v2-integration/v2-source-index.md`
- `docs/spec-v2-integration/v2-rp-anchor-map.md`
- `docs/spec-v2-integration/v2-gap-adjudication.md`
- `docs/spec-v2-integration/v2-no-omission-coverage-matrix.md`
- `docs/spec-v2-integration/v2-overlay-closeout-pack-map.json`
