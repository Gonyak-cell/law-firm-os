# LDIP Gap Adjudication

작성일: 2026-06-07

상태: planning-only. 이 문서는 LDIP requirement candidates의 현재 Law Firm OS coverage 판정을 기록한다. 아직 weighted ledger, source code, contract, validator, production_ready 상태를 변경하지 않는다.

Sources:

- `docs/ldip-integration/ldip-requirement-candidates.md`
- `docs/ldip-integration/ldip-rp-anchor-map.md`
- `docs/ldip-integration/ldip-no-omission-coverage-matrix.md`
- `docs/closeout-pack-plan/latest-total-closeout-execution-plan.md`

## Decision Taxonomy

- `covered`: existing Law Firm OS plan clearly covers the item and only trace evidence is needed.
- `weakly_covered`: existing plan direction exists but fields, policy, tests, evidence, or CP refs are not yet sufficient.
- `new_required`: LDIP source requires a new requirement row, contract detail, test, or implementation behavior inside existing Law Firm OS scope.
- `adapt_required`: LDIP source should be accepted only after adapting it to matter-first, permission-first, audit-first, human-review, vendor-neutral Law Firm OS rules.
- `defer`: item remains in scope ledger but implementation is postponed with revisit gate.
- `reject`: item is excluded with explicit reason.
- Family and cross-cutting rollups must use the most conservative member decision for implementation admission. If a family mixes `new_required`, `adapt_required`, `defer`, or `reject`, either split the row or use the most conservative implementation-gating label and keep explicit defer/reject rows below.

## Family Adjudication

| Family | Candidate scope | Decision | Reason | Required next action |
| --- | --- | --- | --- | --- |
| LDIP-GOAL | LDIP-GOAL-001-004 | weakly_covered | Law Firm OS has product constitution and AI control-plane work, but LDIP goals are not yet attached to requirement/CP evidence | Add LDIP goal refs to RP00 terminal handoff and future requirement ledger |
| LDIP-ARCH | LDIP-ARCH-001-005 | adapt_required | Enterprise hardening/extensibility plans exist, but vendor-neutral LDIP layer mapping needs an early RP00 contract plus late RP26 proof before upstream packs conform | Add early architecture contract to RP00 and final no-lock-in proof to RP26/RP27 |
| LDIP-SRC | LDIP-SRC-001, LDIP-SRC-101-111 | new_required | Source connector boundaries require explicit owner scope, matter mapping, permission, audit, ingestion, and failure behavior | Add source object requirements in RP01/RP08/RP22/RP23/RP25 |
| LDIP-CAT | LDIP-CAT-001-203 | new_required | Legal Catalog entities and table field families need explicit contract/ledger rows | Create catalog requirements before RP01 implementation |
| LDIP-DOC | LDIP-DOC-001-309 | new_required | DMS plan exists but LDIP version/chunk/clause/term/reference details are not fully enumerated | Attach to RP06 and RP07 tests/contracts |
| LDIP-ING | LDIP-ING-001-207 | new_required | 12-step ingestion and failure defaults are not currently source-ledger requirements | Add pipeline/failure requirements to RP06/RP07/RP25 |
| LDIP-SEC | LDIP-SEC-001-212 | adapt_required | Permission kernel exists, but LDIP AI/tool/matter/label intersection must become explicit | Add intersection evaluator and denied/failure tests to RP02/RP17/RP20 |
| LDIP-SRCH | LDIP-SRCH-001-307 | new_required | Search/OCR plan exists but negative search, analyst queries, permission trim, and evidence-bound query cases need explicit rows | Add search and analyst requirements to RP07/RP15 |
| LDIP-AGT | LDIP-AGT-001-201 | new_required | AI governance/workflows exist, but the 12 named agents are not individually tracked | Add per-agent requirements to RP17/RP18 |
| LDIP-TOOL | LDIP-TOOL-001-307 | new_required | Tool registry tiers/log schema/approval workflow need explicit contract and tests | Add tool registry requirements to RP17/RP18/RP27 and audit fields to RP03 |
| LDIP-CLEAN | LDIP-CLEAN-001-406 | new_required | VDR/Data Room plan exists but clean-room room types, objects, policies, query templates are not enumerated | Add RP20 clean-room requirements and external-share tests |
| LDIP-UI | LDIP-UI-001-105 | new_required | Admin/UI plans exist but LDIP operational UI surfaces need explicit screen/workflow requirements | Add RP21 and affected workflow UI requirements |
| LDIP-NFR | LDIP-NFR-001-306 | new_required | Enterprise hardening exists but SEC/PERF/AVAIL rows must be attached to LDIP surfaces | Add NFR rows and benchmarks to RP26 |
| LDIP-DQ | LDIP-DQ-001-003, LDIP-DQ-101-208, LDIP-DQ-301-311, LDIP-DQ-401-410 | new_required | Firm analytics exists but LDIP DQ/AIQ metrics and section-19 quality/evaluation metrics need explicit acceptance and dashboards | Add RP15/RP17/RP26 metrics rows |
| LDIP-COMP | LDIP-COMP-001-114 | new_required | Governance/DLP/Korean depth exists but attorney-secret, personal data, and e-document specifics must be enumerated | Add RP16/RP24 requirements and embedded HRX interaction evidence for personal-data controls |
| LDIP-API | LDIP-API-001-002, LDIP-API-101-117, LDIP-API-201-224 | new_required | External integrations exist but LDIP APIs/events require idempotency/audit/evidence mapping | Add RP22/RP23/RP27 API/event rows |
| LDIP-OUT | LDIP-OUT-001, LDIP-OUT-101-112 | new_required | AI legal workflows exist but evidence-bound output format must be hard requirement | Add RP18 output envelope and tests |
| LDIP-TEST | LDIP-TEST-001-126 | new_required | Existing test strategy is broad; LDIP named scenarios must be attached to affected RPs | Add T-SEC/T-DOC/T-CON/T-DD/T-AI rows |
| LDIP-RISK | LDIP-RISK-001-905 | adapt_required | Risk register exists but LDIP source risks and anti-patterns need final routing | Add RP00/RP26/RP29 risk register entries |
| LDIP-PRIO | LDIP-PRIO-001-310 | adapt_required | Existing CP sequence roughly supports LDIP priority, but build-order and final recommendation items are adapt-required and third-wave items require explicit defer gates | Add sequencing guard in RP00 terminal and RP01 entry, plus individual third-wave revisit gates |

## Explicit Rejections And Defers

| Candidate | Decision | Reason | Revisit gate |
| --- | --- | --- | --- |
| LDIP-RISK-901 AI external email auto-send | reject | High accident risk; AI may draft but not auto-send externally in v1.0 | Only reconsider after T7 approval workflow, audit, and human review mature |
| LDIP-RISK-902 AI automatic original document modification/save | reject | Original document corruption risk; redline suggestion can be supported separately | Only reconsider after T5 approval workflow and rollback/version controls mature |
| LDIP-RISK-903 fully automated legal opinion issuance | reject | Final legal judgment must remain attorney-reviewed | Never as unreviewed automation |
| LDIP-RISK-904 enterprise ERP full replacement by LDIP | reject | Billing/HR/accounting remain Law Firm OS modules or integrations, not LDIP replacement scope | Not applicable unless product scope changes |
| LDIP-RISK-905 full client portal commercialization in v1.0 | defer | Client portal can launch after clean-room policy validation | Revisit after RP19/RP20 production_ready |
| LDIP-PRIO-301 advanced AISQL-like queries | defer | Requires mature catalog, permissions, query model, and benchmarks | Revisit after RP07/RP15/RP26 |
| LDIP-PRIO-302 similar matter recommendations | defer | High leakage and privilege risk | Revisit after permission trim, anonymization, and audit proof |
| LDIP-PRIO-303 automatic redaction | defer | Needs DLP, personal data, review, and false-negative controls | Revisit after RP16/RP20 |
| LDIP-PRIO-304 external law DB integration | defer | External source authority and freshness policy needed | Revisit in RP22/RP23/RP24 |
| LDIP-PRIO-305 enterprise BI/profitability analytics | defer | Commercial analytics can follow source and permission maturity | Revisit in RP15/RP29 |
| LDIP-PRIO-306 Legal Clean Room expansion | defer | Baseline RP20 clean-room requirements remain in scope, but broad third-wave expansion requires proven no-download, watermark, query-template, and post-access audit controls | Revisit after RP20/RP26 gates pass |
| LDIP-PRIO-307 client portal expansion | defer | Client portal commercialization is deferred by LDIP-RISK-905 until clean-room policy validation is mature | Revisit after RP19/RP20 production_ready |
| LDIP-PRIO-308 joint diligence room | defer | Multi-party diligence rooms carry high counterparty, privilege, and purpose-binding leakage risk | Revisit after RP16/RP20/RP26 external-share evidence |
| LDIP-PRIO-309 automated report workflow | defer | Automated report workflow needs evidence-bound output, attorney review, approval state, and audit trail before automation | Revisit after RP18 output envelope and RP20 share gates |
| LDIP-PRIO-310 authority freshness monitoring | defer | Authority freshness requires external law DB/source-authority policy and Korean legal depth validation | Revisit after RP22/RP23/RP24 |

## LDIP New Required Scope Quantification And Unit Policy

Current expanded total remains 55,256 tracked implementation units: 54,355 Law Firm OS units plus 901 embedded HRX units. LDIP is not yet assigned a numeric unit delta in `docs/weighted-implementation-ledger.json`.

Planning impact:

- 15 LDIP family rollups are currently `new_required`: LDIP-SRC, LDIP-CAT, LDIP-DOC, LDIP-ING, LDIP-SRCH, LDIP-AGT, LDIP-TOOL, LDIP-CLEAN, LDIP-UI, LDIP-NFR, LDIP-DQ, LDIP-COMP, LDIP-API, LDIP-OUT, and LDIP-TEST.
- 4 LDIP family rollups are `adapt_required`: LDIP-ARCH, LDIP-SEC, LDIP-RISK, and LDIP-PRIO.
- `new_required` does not automatically mean a new global unit count has already been added. It means the affected Closeout Pack must make a ledger decision before implementation closeout.

Affected pack rule:

1. If existing planned units have demonstrated headroom, record `absorbed_by_existing_units` with candidate IDs, acceptance evidence, and no new unit delta.
2. If existing planned units do not have headroom, create a user-approved ledger or pack-plan extension with unit count, risk class, and affected CP mapping before marking the behavior production_ready.
3. If the item remains intentionally out of implementation scope, record `defer` or `reject` with a revisit gate or reason.
4. No LDIP `new_required` or `adapt_required` behavior may be silently absorbed into a pack without one of the decisions above.

## Cross-Cutting Gap Decisions

### Matter-First Ownership

Decision: `adapt_required`

Existing Law Firm OS is matter-first, but LDIP adds new objects such as Document Chunk, Clause, Defined Term, Cross Reference, Agent Run, Tool Call, Evidence Link, Clean Room, and Data Offering. Each must have lawful owner metadata before implementation.

Required evidence:

- contract rows or schema fields,
- tests for missing owner rejection,
- audit evidence for owner-based access.

### Permission Intersection

Decision: `adapt_required`

Existing permission work is underway in RP00/RP02, but LDIP explicitly requires:

`user permission ∩ agent permission ∩ tool permission ∩ matter policy ∩ label policy`

Required evidence:

- denied cases,
- cross-tenant cases,
- Ethical Wall cases,
- external share approval-required cases,
- tool call policy decisions.

### Audit-First Behavior

Decision: `new_required`

LDIP requires audit for search, agent, tool, clean room, export, approval, and policy block. Current RP03 plan covers audit generally, but these LDIP event families must be explicit.

### Evidence-Bound AI Output

Decision: `new_required`

LDIP output must include used scope, excluded scope, evidence table, uncertainty, reviewer, and approval state. This requires RP18 output envelope and tests.

### Vendor Neutrality

Decision: `adapt_required`

Existing plan supports enterprise extensibility, but Databricks/Snowflake references must be held as optional reference mappings, never implementation defaults. `LDIP-ARCH-005` creates an early RP00 architecture contract so RP01 source connectors, RP17 tools, RP20 clean room, and RP22/RP23 APIs conform before RP26 final hardening proof.

## Implementation Admission Decision

LDIP implementation is not admitted yet.

Implementation may begin only after:

1. This gap adjudication is reviewed.
2. `ldip-overlay-closeout-pack-map.json` exists.
3. C-LDIP-01 through C-LDIP-04 are completed and adjudicated.
4. Affected Closeout Packs include LDIP refs.
5. User-approved ledger or pack-plan changes exist if new units are required.
