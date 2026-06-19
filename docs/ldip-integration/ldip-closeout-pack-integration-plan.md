# LDIP Organic Closeout Pack Integration Plan

작성일: 2026-06-07

상태: planning-only. 이 문서는 지금까지 개발된 Law Firm OS closeout state를 기준으로 LDIP를 자연스럽게 흡수하기 위한 상세 실행계획이다. 현재 문서는 구현, contract 변경, weighted ledger 변경, validator 변경, closeout pack production_ready 선언을 하지 않는다.

## 1. Current Development Analysis

### Live Closeout State

- `git status --short` 기준 tracked dirty file 없음.
- untracked 상태: `.DS_Store`, `Law Firm OS UI/`, `docs/.DS_Store`, `docs/closeout-pack-plan/new-session-handoff.md`, `docs/ldip-integration/`.
- latest committed closeout pack: `CP00-066`.
- closed pack manifests: `CP00-001` through `CP00-066`.
- manifest unit proxy closed so far: 257 units.
- current plan cursor: `RP00.P05.M06.S01`.
- next planned pack: `CP00-067`, Risk C, 39 units, `RP00.P05.M06.S01-RP00.P05.M10.S04`.

### Current Pack Plan

- Source ledger: `docs/weighted-implementation-ledger.json`.
- Source ledger unit count: 54,355 Law Firm OS units.
- Current closeout pack plan: 1,187 open packs and 53,978 open source-ledger units.
- Planned open range: `CP00-067-CP00-1253`.
- Open RP00 range: `CP00-067-CP00-094`, 431 units.
- RP01 begins at `CP00-095`.
- HRX remains embedded scope: 901 units, not yet present in the weighted source ledger.
- LDIP is currently planning-only and not yet present as weighted source-ledger units.

### Completed Development Shape

The completed CP00 work is not broad application development yet. It is mostly RP00 control-plane closure:

- Product constitution and closeout pack machinery.
- Control-plane contract/fixture/service/validator/test surfaces.
- Permission, audit, tenant-boundary, Matter trace, API boundary, UI operator surface, synthetic fixture evidence, and closeout evidence patterns.
- Pack-level gates already enforce implementation, tests, Hermes evidence, one Claude Opus 4.8 max read-only review, adjudication, construction inspection, production_ready included units, and commit.

This means LDIP should not be bolted on as a new product. It should enter as a requirement and architecture overlay while CP00 still has enough control-plane runway, then attach to existing RP packs as those RPs open.

## 2. Decision

Recommended path: analyze and incorporate LDIP now as a planning overlay, then execute CPs against that overlay.

Not recommended: finish all CP00-CP00-1253 first and then retrofit LDIP.

Reason:

- LDIP crosses matter, DMS, permission, audit, AI governance, search, analytics, VDR/Clean Room, external integrations, platform extensibility, and enterprise hardening.
- If delayed until after all CPs complete, major RP01/RP02/RP03/RP06/RP07/RP16/RP17/RP18/RP20/RP22/RP23/RP26 decisions would need rework.
- If implemented immediately as code, it violates the LDIP planning document's own boundary because source indexing, requirement extraction, RP mapping, gap adjudication, and Claude C-LDIP-01 through C-LDIP-04 are not complete.

Therefore:

1. Keep `CP00-067` as the next executable pack.
2. Before or alongside CP00-067, commit LDIP planning artifacts only.
3. Complete CP00-067 through CP00-094 while adding LDIP trace checks to RP00 control-plane evidence and handoff language.
4. Before `CP00-095` starts RP01, run an LDIP planning gate that either updates the open pack plan or attaches LDIP requirement refs to the existing open packs.
5. Never mark LDIP production_ready until its own coverage matrix, requirements ledger, Claude reviews, validators, and affected pack closeouts pass.

## 3. Integration Principles

### Product Boundary

LDIP is Law Firm OS internal legal data intelligence capability. It is not:

- a separate SaaS product,
- a Databricks implementation,
- a Snowflake implementation,
- a generic AI chatbot,
- a DMS plugin.

The internal product framing is:

> Legal Catalog + Matter-first permissions + governed document intelligence + evidence-bound search/agents + controlled external sharing.

### Matter-First Rule

Every LDIP object must have a lawful owner:

- matter,
- pre-matter/intake,
- client,
- document/document version,
- user/role,
- clean room,
- authority corpus with access policy.

If an LDIP object cannot be connected to one of these, it must be blocked or classified as a new capability candidate.

### Permission-First Rule

Every LDIP search, agent run, tool call, clean-room query, output, and external-share action must evaluate:

`user permission ∩ agent permission ∩ tool permission ∩ matter policy ∩ label policy`.

This belongs to RP02/RP17/RP20, but RP00 must preserve it as a product-constitution invariant before those packs begin.

### Audit-First Rule

Every material LDIP action must create or reference audit evidence:

- document access,
- search execution,
- agent run,
- tool call,
- policy block,
- approval request,
- output approval,
- clean room access,
- external share,
- audit export.

This belongs to RP03 and must be included in LDIP API/event planning.

### Evidence-Bound AI Rule

LDIP AI output may not be final unless grounded in:

- document_id,
- version_id,
- clause/chunk/page,
- evidence link,
- source scope,
- excluded scope,
- uncertainty,
- reviewer state,
- approval state.

### Vendor-Neutral Rule

Databricks and Snowflake are reference designs only. The implementation plan must preserve a vendor-neutral core:

- PostgreSQL-compatible operational metadata,
- object storage for source files,
- hybrid keyword/vector search,
- policy engine,
- append-only audit,
- optional lakehouse/warehouse integration later.

## 4. Required Planning Artifacts

Create these before any LDIP implementation code:

| Artifact | Purpose | Status |
| --- | --- | --- |
| `docs/ldip-integration/ldip-source-index.md` | Freeze 23 source sections and line ranges | created as planning artifact |
| `docs/ldip-integration/ldip-no-omission-coverage-matrix.md` | Checklist for every intended LDIP feature | created as planning artifact |
| `docs/ldip-integration/ldip-requirement-candidates.md` | Candidate requirements by source section and family | created as planning artifact |
| `docs/ldip-integration/ldip-rp-anchor-map.md` | Requirement-to-RP and requirement-to-CP map | created as planning artifact |
| `docs/ldip-integration/ldip-gap-adjudication.md` | covered/weak/new/adapt/defer/reject decisions | created as planning artifact |
| `docs/ldip-integration/ldip-overlay-closeout-pack-map.json` | Machine-readable LDIP-to-CP overlay map | created as planning artifact |
| `docs/ldip-integration/claude-review-packets/c-ldip-01.md` | Source index completeness packet | next |
| `docs/ldip-integration/claude-review-results/c-ldip-01.json` | One read-only Claude review result | after packet |
| `docs/ldip-integration/adjudications/c-ldip-01.md` | Finding adjudication | after review |

Only after these planning artifacts pass review should contract, source, validator, or ledger changes be made.

## 5. LDIP Requirement Extraction Plan

### Extraction Passes

1. Source section pass: create one requirement candidate for every source section and subsection in `ldip-source-index.md`.
2. Named object pass: create candidates for every entity, table, agent, tool tier, clean room type, UI surface, API, event, metric, test, priority item, and risk item.
3. Invariant pass: create cross-cutting requirements for matter-first ownership, permission intersection, auditability, evidence-bound AI, read-only default, human review, and vendor neutrality.
4. Gap pass: classify each candidate as `covered`, `weakly_covered`, `new_required`, `adapt_required`, `defer`, or `reject`.
5. Pack pass: attach every non-rejected candidate to one or more planned CP packs.

### Candidate ID Scheme

Use stable IDs:

- `LDIP-GOAL-###`
- `LDIP-ARCH-###`
- `LDIP-SRC-###`
- `LDIP-CAT-###`
- `LDIP-DOC-###`
- `LDIP-ING-###`
- `LDIP-SEC-###`
- `LDIP-SRCH-###`
- `LDIP-AGT-###`
- `LDIP-TOOL-###`
- `LDIP-CLEAN-###`
- `LDIP-UI-###`
- `LDIP-NFR-###`
- `LDIP-DQ-###`
- `LDIP-COMP-###`
- `LDIP-API-###`
- `LDIP-OUT-###`
- `LDIP-TEST-###`
- `LDIP-RISK-###`
- `LDIP-PRIO-###`

### Candidate Fields

Every candidate must have:

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

## 6. CP Integration Plan

### CP00-067 Through CP00-094: Finish RP00 With LDIP Awareness

Do not insert arbitrary new CPs before `CP00-067`.

While closing the existing RP00 packs, add LDIP awareness only where it is natural:

| CP range | Existing purpose | LDIP overlay |
| --- | --- | --- |
| CP00-067 | RP00.P05 fixture/test/evidence/review/handoff terminal pack | Reference LDIP no-omission matrix as future overlay, no LDIP production_ready |
| CP00-068-CP00-080 | RP00.P06 permission/audit-sensitive pack set | Preserve LDIP permission intersection and audit-first invariants |
| CP00-081-CP00-087 | RP00.P07 test/search/evidence style pack set | Preserve LDIP search/analyst negative-search and evidence-bound expectations as future checks |
| CP00-088-CP00-090 | RP00.P08 Hermes/evidence packets | Add LDIP coverage artifacts as planning evidence only if already reviewed |
| CP00-091-CP00-093 | RP00.P09 Claude/review/terminal closeout | Include C-LDIP planning review status in RP00 handoff if complete |
| CP00-094 | RP00 terminal generated pack before RP01 | Gate: RP01 may start only after LDIP source index, requirement candidates, RP map, and gap plan are ready or explicitly deferred |

### CP00-095 Through CP00-119: RP01 Core Domain Foundation

LDIP attaches here for:

- Client, Client Group, Matter, Party, User, Role base models.
- Legal Catalog ownership rules.
- Source layer object identity.
- Pre-matter and matter ownership.
- Catalog metadata normalization.

Before closing affected packs, require candidate refs for:

- `LDIP-CAT`
- `LDIP-SRC`
- `LDIP-GOAL`
- `LDIP-ARCH`

### CP00-120 Through CP00-158: RP02 Permission Kernel

LDIP attaches here for:

- RBAC roles.
- ABAC attributes.
- security labels.
- Ethical Wall precedence.
- AI/tool/matter/label permission intersection.
- read-only default and approval escalation.

Risk class must remain A for boundary-sensitive packs.

### CP00-159 Through CP00-193: RP03 Audit And Compliance Kernel

LDIP attaches here for:

- document access logs.
- search logs.
- tool call logs.
- agent run logs.
- policy decision logs.
- clean room access logs.
- append-only audit storage.
- audit export events.

### CP00-194 Through CP00-222: RP04 Master Data

LDIP attaches here for:

- client groups.
- jurisdictions.
- parties.
- document type dictionaries.
- security label dictionaries.
- authority/citation dictionaries.
- retention labels.

### CP00-223 Through CP00-257: RP05 Matter Core

LDIP attaches here for:

- Matter dashboard source fields.
- matter status and position.
- responsible partner.
- matter-level AI policy.
- external-sharing flags.
- negotiation state.
- issue ownership.

### CP00-258 Through CP00-300: RP06 DMS Core

LDIP attaches here for:

- Document and Document Version contracts.
- Document Chunk, Clause, Defined Term, Cross Reference.
- current/final version rules.
- document viewer.
- evidence links.
- output/report document binding.

### CP00-301 Through CP00-343: RP07 Search OCR And Index

LDIP attaches here for:

- ingestion pipeline steps.
- OCR/parser behavior.
- hash/duplicate detection.
- indexing.
- hybrid search.
- clause search.
- authority search.
- negative search.
- permission-trimmed search.

### CP00-344 Through CP00-388: RP08 Email And Office Native DMS

LDIP attaches here for:

- email source ingestion.
- email negotiation tracker source data.
- office document parsing.
- redline/clean version relations.
- attachment mapping.

### CP00-612 Through CP00-650: RP15 Firm Analytics

LDIP attaches here for:

- data quality metrics.
- AI quality metrics.
- search quality.
- DD progress analytics.
- cost per task.
- agent failure and reviewer edit dashboards.

### CP00-651 Through CP00-696: RP16 Governance DLP Retention

LDIP attaches here for:

- attorney secrecy labels.
- personal information controls.
- retention policy.
- litigation hold.
- masking and export controls.
- DLP policy.
- clean room external-share safety.

### CP00-697 Through CP00-739: RP17 AI Governance

LDIP attaches here for:

- agent runtime policy.
- model routing.
- tool registry governance.
- evidence-first agent behavior.
- AIQ metrics.
- prompt/template approval.
- policy block behavior.

### CP00-740 Through CP00-785: RP18 AI Legal Workflows

LDIP attaches here for:

- 12 named agents.
- contract review workspace behavior.
- DD issue extraction.
- report builder.
- authority update.
- external share safety.
- evidence-bound output format.

### CP00-825 Through CP00-869: RP20 Data Room And VDR

LDIP attaches here for:

- Legal Clean Room room types.
- shared objects.
- query templates.
- no unrestricted raw query.
- watermark/download/export/revocation policies.
- post-access audit.

### CP00-870 Through CP00-904: RP21 Admin Console

LDIP attaches here for:

- Legal Governance Center.
- Agent Control Center.
- Permission Center.
- security label management.
- quality dashboards.
- prompt/template manager.

### CP00-905 Through CP00-994: RP22/RP23 External Integrations

LDIP attaches here for:

- Create Matter.
- Upload/Register/Parse Document.
- Search Documents/Clauses.
- Run Agent/Get Evidence/Approve Output.
- Clean Room share/revoke/audit APIs.
- external source connectors.

### CP00-995 Through CP00-1040: RP24 Korean Legal Depth

LDIP attaches here for:

- attorney secrecy and Korean professional duty treatment.
- personal information policy.
- e-document retention.
- authority freshness with law effective dates and case identifiers.

### CP00-1041 Through CP00-1086: RP25 Migration Platform

LDIP attaches here for:

- source system import.
- DMS/email/VDR data migration.
- hash/duplicate/version reconstruction.
- backfill of security labels and audit-safe ingestion.

### CP00-1087 Through CP00-1132: RP26 Enterprise SaaS Hardening

LDIP attaches here for:

- vendor-neutral architecture.
- performance, availability, recovery.
- security hardening.
- model cost controls.
- data quality and AI quality operations.
- open table/lakehouse/warehouse optional integration.

### CP00-1133 Through CP00-1169: RP27 Platform Extensibility

LDIP attaches here for:

- tool registry extension.
- API/event schema.
- native app boundaries.
- external connector extensibility.
- Databricks/Snowflake optional adapters without vendor lock-in.

### CP00-1170 Through CP00-1214: RP28 Marketplace And Custom AI Apps

LDIP attaches here for:

- legal native apps.
- approved custom agents.
- custom tool packages.
- reviewable prompt/template assets.

### CP00-1215 Through CP00-1253: RP29 Commercial Readiness

LDIP attaches here for:

- commercial packaging of legal data intelligence.
- no-omission claim review.
- final LDIP coverage audit.
- final Claude review.
- final SaaS-grade product candidate gate.

## 7. Plan Update Policy

### Closed Packs

Never renumber, edit, or reinterpret closed packs `CP00-001` through `CP00-066` as LDIP implementation. They may be referenced as control-plane precedent and evidence only.

### Open Packs

Open packs may receive LDIP requirement refs and overlay acceptance criteria if:

- LDIP requirement candidates exist,
- RP anchor map exists,
- gap adjudication exists,
- affected plan diff is generated by script or recorded with correction_reason,
- no existing risk range rule is violated without override_reason.

### Additional Units

LDIP does not automatically add implementation units. Each source item must be classified:

- If already covered by existing 54,355-unit Law Firm OS plan, add LDIP refs to the relevant CPs.
- If covered but weak, add acceptance/test/evidence criteria to existing CPs.
- If new, add new source-ledger entries only after explicit user approval and regenerate closeout pack plan.
- If deferred, keep it in the LDIP requirement ledger with revisit gate.
- If rejected, keep it with explicit reason.

### HRX Interaction

HRX remains embedded People/HR Evidence inside Law Firm OS. LDIP may touch HRX only through:

- personal information labels,
- employee/person data policy,
- evidence/audit handling,
- retention and DLP,
- no separate HR product boundary.

## 8. Required Claude Review Plan

LDIP planning reviews:

| Review | Scope | Required before |
| --- | --- | --- |
| C-LDIP-01 | source index completeness | requirement ledger finalization |
| C-LDIP-02 | requirement extraction completeness | RP anchor finalization |
| C-LDIP-03 | RP mapping and product-boundary drift | closeout-pack plan overlay |
| C-LDIP-04 | gap adjudication underestimation | implementation approval |
| C-LDIP-05 | contract/invariant review | contract/schema changes |
| C-LDIP-06+ | per-slice implementation review | affected pack production_ready |
| C-LDIP-FINAL | full integration closeout | final SaaS-grade candidate |

Claude is read-only review evidence, not final authority. P0/P1 must be fixed. P2 must be fixed or explicitly deferred. P3 is non-blocking if adjudicated.

## 9. Execution Order

1. Commit the LDIP planning artifacts separately from implementation, if desired.
2. Close `CP00-067` exactly as planned: one 39-unit Risk C pack, not individual one-unit closeouts.
3. Continue through `CP00-094` and finish RP00.
4. Before `CP00-095`, complete:
   - LDIP source index.
   - LDIP requirement candidates.
   - LDIP RP anchor map.
   - LDIP gap adjudication.
   - C-LDIP-01 through C-LDIP-04 and adjudications.
5. Generate or update `ldip-overlay-closeout-pack-map.json`.
6. Decide whether LDIP is fully absorbed by existing open CPs or requires additional source-ledger units.
7. If additional units are required, update ledger and closeout pack plan with script-generated correction reasons.
8. Execute packs in order, adding LDIP evidence to affected packs.
9. At RP29 terminal closeout, run final LDIP coverage audit and C-LDIP-FINAL.

## 10. Current LDIP Planning Gate Status

As of 2026-06-07:

- Source index exists.
- No-omission coverage matrix exists.
- Requirement candidates exist.
- RP anchor map exists.
- Gap adjudication exists.
- Overlay closeout-pack map exists.
- C-LDIP-01 through C-LDIP-04 review packets/results/adjudications are still required before LDIP implementation changes.

## 11. Final Completion Gate

The overall Law Firm OS product candidate may only claim LDIP integrated when all of these are true:

- 55,256 expanded Law Firm OS + HRX units remain tracked.
- LDIP source section coverage is 100% classified.
- Every LDIP named entity, table field family, agent, tool tier, clean room type, UI surface, API, event, NFR, metric, test, priority item, and risk item is either implemented, covered, adapted, deferred, or rejected with reason.
- Every implemented/adapted LDIP item is attached to one or more Closeout Packs.
- Every affected pack has implementation, tests, Hermes evidence, one Claude Opus 4.8 max read-only review, adjudication, construction inspection, production_ready included units, and commit.
- No unresolved P0/P1 Claude findings remain.
- P2 findings are fixed or explicitly deferred.
- LDIP does not split into a separate product.
- Vendor-neutral core remains intact.
- Matter-first, permission-first, audit-first, evidence-bound AI, human review, and external-sharing safety invariants pass.
