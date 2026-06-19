# LDIP RP Anchor Map

작성일: 2026-06-07

상태: planning-only. 이 문서는 LDIP requirement candidates를 Law Firm OS RP/CP 실행계획에 고정한다. 아직 weighted ledger, product contract, source code, validator, production_ready 상태를 변경하지 않는다.

Sources:

- `docs/ldip-integration/ldip-requirement-candidates.md`
- `docs/ldip-integration/ldip-source-index.md`
- `docs/ldip-integration/ldip-no-omission-coverage-matrix.md`
- `docs/closeout-pack-plan/closeout-pack-plan.json`
- `docs/closeout-pack-plan/latest-total-closeout-execution-plan.md`

## Anchor Rules

- Closed packs `CP00-001-CP00-066` remain historical control-plane evidence only.
- The next executable pack remains `CP00-067`.
- LDIP planning may be referenced in RP00, but LDIP implementation may not begin until C-LDIP-01 through C-LDIP-04 are complete and adjudicated.
- If an LDIP candidate is already conceptually covered by existing Law Firm OS scope, attach it as an acceptance/evidence trace to the affected CP rather than creating a new product.
- If an LDIP candidate is not covered by existing scope, it requires a user-approved ledger extension or a recorded defer/reject decision.

## Family To RP/CP Map

| Family | Candidate IDs | Primary RP | Primary CP range | Secondary RPs | CP overlay rule |
| --- | --- | --- | --- | --- | --- |
| LDIP-GOAL | LDIP-GOAL-001-004 | RP00 | CP00-067-CP00-094 | RP26, RP29 | RP00 terminal handoff must state LDIP is internal and not a separate product |
| LDIP-ARCH | LDIP-ARCH-001-005 | RP26 | CP00-1087-CP00-1132 | RP00, RP01, RP17, RP20, RP22, RP23, RP27 | RP00 creates the early vendor-neutral architecture contract; RP26 proves final no-lock-in hardening |
| LDIP-SRC | LDIP-SRC-001, LDIP-SRC-101-111 | RP01 | CP00-095-CP00-119 | RP04, RP05, RP08, RP22, RP23, RP25 | Source connectors attach through domain/source objects, ingestion paths, and external integration APIs |
| LDIP-CAT | LDIP-CAT-001-002, LDIP-CAT-101-128, LDIP-CAT-201-203 | RP01 | CP00-095-CP00-119 | RP04, RP05, RP06, RP16 | Catalog ownership and entity trace required before DMS/search |
| LDIP-DOC | LDIP-DOC-001-002, LDIP-DOC-101-114, LDIP-DOC-201-203, LDIP-DOC-301-309 | RP06 | CP00-258-CP00-300 | RP07, RP08 | Version/chunk/clause/term/ref model must precede advanced AI output |
| LDIP-ING | LDIP-ING-001-002, LDIP-ING-101-112, LDIP-ING-201-207 | RP06 | CP00-258-CP00-300 | RP07, RP25 | Pipeline and failure defaults must drive search and migration |
| LDIP-SEC | LDIP-SEC-001-003, LDIP-SEC-101-111, LDIP-SEC-201-212 | RP02 | CP00-120-CP00-158 | RP03, RP16, RP17, RP20 | Risk A packs must prove permission intersection and boundary behavior |
| LDIP-SRCH | LDIP-SRCH-001-003, LDIP-SRCH-101-307 | RP07 | CP00-301-CP00-343 | RP15, RP17 | Search must be permission-trimmed and evidence-aware |
| LDIP-AGT | LDIP-AGT-001-002, LDIP-AGT-101-112, LDIP-AGT-201 | RP18 | CP00-740-CP00-785 | RP17, RP28 | Agent behavior must be bounded, evidence-first, version-aware, human-reviewed |
| LDIP-TOOL | LDIP-TOOL-001-003, LDIP-TOOL-101-307 | RP17 | CP00-697-CP00-739 | RP02, RP03, RP18, RP27 | RP02 owns permission/approval gate evaluation; RP17 owns registry and approval-workflow mechanism |
| LDIP-CLEAN | LDIP-CLEAN-001-004, LDIP-CLEAN-101-406 | RP20 | CP00-825-CP00-869 | RP16, RP26 | No unrestricted raw queries; all external access audited |
| LDIP-UI | LDIP-UI-001-005, LDIP-UI-101-105 | RP21 | CP00-870-CP00-904 | RP05, RP06, RP17, RP18, RP20 | UI surfaces are operational workflows, not marketing pages |
| LDIP-NFR | LDIP-NFR-001-003, LDIP-NFR-101-306 | RP26 | CP00-1087-CP00-1132 | RP02, RP16, RP29 | Security, performance, availability, recovery gates become hardening criteria |
| LDIP-DQ | LDIP-DQ-001-003, LDIP-DQ-101-208, LDIP-DQ-301-311, LDIP-DQ-401-410 | RP15 | CP00-612-CP00-650 | RP17, RP26 | Data quality, AI quality, cost, edit, rejection, leakage metrics |
| LDIP-COMP | LDIP-COMP-001-004, LDIP-COMP-101-114 | RP16 | CP00-651-CP00-696 | RP24, RP26 | Attorney secrecy, personal information, e-document retention; HRX is an embedded module anchor, not an RP |
| LDIP-API | LDIP-API-001-002, LDIP-API-101-117, LDIP-API-201-224 | RP22 | CP00-905-CP00-949 | RP23, RP27 | APIs/events require idempotency, auditability, permission checks |
| LDIP-OUT | LDIP-OUT-001, LDIP-OUT-101-112 | RP18 | CP00-740-CP00-785 | RP06, RP20 | AI output format must include source scope, exclusions, evidence, uncertainty, approval |
| LDIP-TEST | LDIP-TEST-001, LDIP-TEST-101-126 | RP00 | CP00-067-CP00-094 | RP02, RP06, RP07, RP17, RP18, RP20 | RP00 records test plan; affected RPs implement tests |
| LDIP-RISK | LDIP-RISK-001-002, LDIP-RISK-101-110, LDIP-RISK-901-905 | RP26 | CP00-1087-CP00-1132 | RP00, RP16, RP17, RP20, RP29 | Risk register must survive to final commercial readiness |
| LDIP-PRIO | LDIP-PRIO-001-004, LDIP-PRIO-101-310 | RP00 | CP00-067-CP00-094 | affected RPs | Use as sequencing constraint, not standalone feature |

## Boundary-Sensitive LDIP Risk Rule

Any affected Closeout Pack must use Risk A scrutiny when the work touches source connector ownership, catalog owner mapping, matter mapping, permission, unauthorized data, cross-tenant access, Ethical Wall behavior, AI access, tool execution, DLP, masking, attorney-secret material, personal information, external sharing, clean-room query/share, migration/backfill label movement, idempotent boundary mutation, or evidence-bound output approval.

This rule applies at minimum to RP01, RP02, RP07, RP16, RP17, RP18, RP20, RP22, RP23, RP25, and any RP26 hardening pack that validates those boundaries. If a boundary-sensitive unit set is too large for the Risk A unit range, split it into smaller Risk A packs unless the work is planning-only or evidence-only with no runtime/data boundary; in that exception case the pack must record an explicit `override_reason`.

## RP-Specific Handoff Map

### RP00: CP00-067-CP00-094

Planning and control-plane phase. Must:

- keep LDIP as planning overlay,
- prohibit LDIP production_ready claims,
- preserve no-omission requirement extraction,
- prepare C-LDIP-01 through C-LDIP-04 review packets/results/adjudications,
- create `LDIP-ARCH-005`, the early vendor-neutral architecture contract that RP01, RP17, RP20, RP22, and RP23 must conform to,
- gate RP01 if LDIP planning artifacts are not ready or explicitly deferred.

### RP01: CP00-095-CP00-119

Anchor:

- `LDIP-SRC-001`
- `LDIP-SRC-101-111`
- `LDIP-CAT-001-002`
- `LDIP-CAT-101-128`
- `LDIP-CAT-201`
- `LDIP-ARCH-005` conformance before source connector design
- `LDIP-GOAL-001-004`
- source object identity and lawful owner rules.

Risk note: source connector ownership, matter mapping, catalog owner mapping, and source-access exceptions must use Risk A scrutiny when they can create cross-client, cross-tenant, unauthorized-data, or later external-share exposure.

### RP02: CP00-120-CP00-158

Anchor:

- `LDIP-SEC-001-003`
- `LDIP-SEC-101-111`
- `LDIP-SEC-201-212`
- `LDIP-TOOL-301-307`
- permission intersection.

Ownership note: RP02 owns permission/approval gate evaluation for `LDIP-TOOL-301-307`; RP17 owns the tool-registry and approval-workflow mechanism. RP02 gate contracts must be written so RP17 can implement the mechanism without weakening the permission boundary.

Risk note: boundary-sensitive packs must remain Risk A when they touch permission, unauthorized data, AI access, external share, or Ethical Wall logic.

### RP03: CP00-159-CP00-193

Anchor:

- `LDIP-TOOL-002`
- `LDIP-TOOL-201`
- `LDIP-API-002`
- `LDIP-CLEAN` audit events.

### RP04: CP00-194-CP00-222

Anchor:

- master data dictionaries for labels, document types, jurisdictions, authority metadata, retention labels, client groups, party roles.

### RP05: CP00-223-CP00-257

Anchor:

- `LDIP-CAT-202`
- `LDIP-CAT-203`
- matter status, security, AI policy, external sharing allowed, issue ownership, client/counterparty position.

### RP06: CP00-258-CP00-300

Anchor:

- `LDIP-DOC-001-002`
- `LDIP-DOC-101-114`
- `LDIP-DOC-201-203`
- `LDIP-DOC-301-309`
- `LDIP-ING-001-002`
- evidence link and document viewer data.

### RP07: CP00-301-CP00-343

Anchor:

- `LDIP-SRCH-001-003`
- `LDIP-SRCH-101-307`
- indexing, search, negative search, permission trimming.

Risk note: permission-trimmed search, negative search, authority search, and Legal Analyst query packs must use Risk A scrutiny whenever results can expose unauthorized, cross-client, privileged, or external-share-sensitive material.

### RP08: CP00-344-CP00-388

Anchor:

- email source ingestion, Office parsing, redline/clean version relations, negotiation tracker sources.

### RP15: CP00-612-CP00-650

Anchor:

- `LDIP-DQ-001-003`
- `LDIP-DQ-101-208`
- `LDIP-DQ-301-311`
- `LDIP-DQ-401-410`
- source accuracy, version accuracy, cross-client leakage zero tolerance, edit/rejection/cost/latency metrics.

### RP16: CP00-651-CP00-696

Anchor:

- `LDIP-COMP-001-004`
- `LDIP-COMP-101-114`
- retention, DLP, masking, attorney-secret labels, personal information controls, e-document preservation.

Risk note: DLP, masking, attorney-secret, personal information, retention exception, and litigation-hold boundary packs must use Risk A scrutiny unless they are planning-only/evidence-only with an explicit override.

### RP17: CP00-697-CP00-739

Anchor:

- `LDIP-AGT-001`
- `LDIP-TOOL-001-003`
- `LDIP-TOOL-101-307`
- model routing, tool registry, prompt/template governance, AIQ controls.

Ownership note: RP17 owns the `LDIP-TOOL-101-307` registry, logging, and approval-workflow mechanism. It consumes the RP02 approval gate contract and must not downgrade RP02 permission/approval decisions.

Sequencing dependency: RP02 approval gate contract -> RP17 tool registry and workflow mechanism -> RP18 agent use -> RP20 external share and clean-room application.

Risk note: AI access, model routing, tool execution, approval workflow, and prompt/template governance packs must use Risk A scrutiny whenever they touch authorization, data boundary, or policy-block behavior.

### RP18: CP00-740-CP00-785

Anchor:

- `LDIP-AGT-002`
- `LDIP-AGT-101-112`
- `LDIP-OUT-001`
- `LDIP-OUT-101-112`
- contract review, DD, report builder, external share safety workflows.

Risk note: agent output, external share safety, legal report approval, and evidence-bound output packs must use Risk A scrutiny whenever they affect shareability, reviewer approval, or privileged/personal-data handling.

### RP20: CP00-825-CP00-869

Anchor:

- `LDIP-CLEAN-001-004`
- `LDIP-CLEAN-101-406`
- Legal Clean Room policies, query templates, shared objects, revocation, post-access audit.

Risk note: clean-room query/share, external user, revocation, no-download, watermark, purpose binding, and post-access audit packs must use Risk A scrutiny unless they are purely documentary planning artifacts with an explicit override.

### RP21: CP00-870-CP00-904

Anchor:

- `LDIP-UI-001-005`
- `LDIP-UI-101-105`
- Agent Control Center, Governance Center, Permission Center, quality dashboards.

### RP22/RP23: CP00-905-CP00-994

Anchor:

- `LDIP-API-001-002`
- `LDIP-API-101-117`
- `LDIP-API-201-224`
- external connector and event continuation behavior.

### RP24: CP00-995-CP00-1040

Anchor:

- attorney secrecy legal caveat, Korean personal information handling, e-document retention, authority freshness.

### RP25: CP00-1041-CP00-1086

Anchor:

- migration/source import, DMS/email/VDR backfill, hash, duplicate, version reconstruction, security label backfill.

Risk note: migration, VDR/email/DMS backfill, security-label reconstruction, duplicate/version reconstruction, and mass owner mapping must use Risk A scrutiny when misclassification can expose unauthorized, privileged, personal, or external-share-sensitive material.

### RP26: CP00-1087-CP00-1132

Anchor:

- `LDIP-ARCH-001-005`
- `LDIP-ARCH-005` final conformance proof against the early RP00 contract
- `LDIP-NFR-001-003`
- `LDIP-RISK-001-002`
- vendor-neutral architecture, performance, recovery, cost controls, operations.

### RP27: CP00-1133-CP00-1169

Anchor:

- tool registry extension, API/event schema, optional Databricks/Snowflake adapters without lock-in.

### RP28: CP00-1170-CP00-1214

Anchor:

- approved custom agents, legal native apps, custom tools, prompt/template assets.

### RP29: CP00-1215-CP00-1253

Anchor:

- final LDIP coverage audit,
- final no-omission claim,
- commercial packaging,
- final SaaS-grade candidate gate.

## HRX Interaction

LDIP may touch HRX only through:

- personal information controls,
- employee/person evidence handling,
- retention,
- DLP,
- audit,
- access control.

HRX remains an embedded People/HR Evidence module inside Law Firm OS. LDIP does not create a separate HR product or separate data platform.
