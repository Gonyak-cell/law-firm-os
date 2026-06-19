# Law Firm OS v2.0 No-Omission Coverage Matrix

작성일: 2026-06-09

상태: planning-only coverage matrix. 이 문서는 v2 누락 요구사항이 anchor, CP insertion point, validation surface, blocking condition 없이 빠지는 것을 방지한다.

## 1. Coverage Columns

| Column | Required meaning |
| --- | --- |
| Requirement ID | Stable `V2-MISS-*` identifier |
| Source spec section | Source basis from v2 missing requirement spec |
| Priority | P0/P1/P2 |
| Primary RP | RP that owns first implementation responsibility |
| First CP | first pack where implementation input should be consumed |
| Dependent RPs | later RPs that must preserve or extend the requirement |
| Acceptance anchor | minimum behavior that must be visible in future contract/tests |
| Validation surface | future command or validator surface |
| Status | coverage status in this planning layer |

## 2. Matrix

| Requirement ID | Source spec section | Priority | Primary RP | First CP | Dependent RPs | Acceptance anchor | Validation surface | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| V2-MISS-KNOW-001 | 3.1 Matter Wiki Entity | P0 | RP05 | CP00-177 | RP06, RP07, RP17, RP18 | Matter creates wiki shell; sections have source links or explicit uncited note; client-visible section is trimmed | `matter-wiki:validate` | covered |
| V2-MISS-KNOW-002 | 3.1 LLM Wiki Retrieval Layer | P0 | RP07 | CP00-235 | RP17, RP18, RP27 | confirmed/candidate/disputed/open-question entries are separated and permission-trimmed | `llm-wiki:validate` | covered |
| V2-MISS-KNOW-003 | 3.1 Obsidian-Compatible Export | P1 | RP27 | CP00-814 | RP05, RP17, RP22 | deterministic export with YAML/frontmatter/wikilinks and DLP/permission gate | `wiki-export:validate` | covered |
| V2-MISS-GRAPH-001 | 3.2 Graph Provider Boundary | P0 | RP05 | CP00-177 | RP06, RP07, RP08, RP17, RP18 | provider-neutral graph contract supports permission-trimmed traversal | `matter-graph:validate` | covered |
| V2-MISS-GRAPH-002 | 3.2 Node And Edge Vocabulary | P0 | RP05 | CP00-177 | RP06, RP07, RP08, RP17, RP24 | minimum node/edge vocabulary with citation/provenance edges | `matter-graph:vocabulary:validate` | covered |
| V2-MISS-GRAPH-003 | 3.2 Graph Views | P1 | RP05 | CP00-177 | RP06, RP07, RP08, RP17, RP18, RP24 | graph views show trimmed counts and never create legal authority claims | `matter-graph:views:validate` | covered |
| V2-MISS-CITE-001 | 3.3 Citation Ledger | P0 | RP06 | CP00-198 | RP07, RP17, RP18, RP24 | source-version-bound citation ledger blocks uncited high-risk output | `citation-ledger:validate` | covered |
| V2-MISS-CITE-002 | 3.3 Source Panel UX | P0 | RP06 | CP00-198 | RP07, RP17, RP18, RP19 | source panel redacts inaccessible sources and shows citation state | `source-panel:validate` | covered |
| V2-MISS-AI-001 | 3.4 Local AI Worker | P0 | RP17 | CP00-515 | RP18, RP26, RP27, RP29 | local-only confidential jobs fail closed and record model provenance | `local-ai-worker:validate` | covered |
| V2-MISS-AI-002 | 3.4 Hybrid Model Routing | P0 | RP17 | CP00-515 | RP18, RP26, RP27 | routing persists policy decision and prevents model bypass | `model-routing:validate` | covered |
| V2-MISS-AI-003 | 3.4 AI Result Lifecycle | P0 | RP17 | CP00-515 | RP18, RP19, RP29 | delivered_to_client requires confirmed or explicit approval state | `ai-result-lifecycle:validate` | covered |
| V2-MISS-DMS-001 | 3.5 Document Register | P1 | RP06 | CP00-198 | RP07, RP08, RP16, RP25 | every matter-filed document/attachment has permission-trimmed register row | `document-register:validate` | covered |
| V2-MISS-DMS-002 | 3.5 Source And Lineage | P1 | RP06 | CP00-198 | RP07, RP08, RP25 | lineage preserves parent/child/import/parser/reprocess evidence | `document-lineage:validate` | covered |
| V2-MISS-NEG-001 | 3.6 Negotiation Ledger | P1 | RP08 | CP00-272 | RP05, RP06, RP18 | email/redline/clause negotiation events link to document versions and citations | `negotiation-ledger:validate` | covered |
| V2-MISS-AUTH-001 | 3.7 Authority Graph | P1 | RP24 | CP00-716 | RP07, RP17, RP18 | authority freshness and supersession control legal AI output | `authority-graph:validate` | covered |
| V2-MISS-DEPLOY-001 | 3.8 Deployment Model | P1 | RP26 | CP00-782 | RP27, RP29 | deployment mode affects routing, residency, backup, SLA, support | `deployment-mode:validate` | covered |
| V2-MISS-PLAN-001 | 3.9 Stage Overlay | P2 | docs/spec-v2-integration | planning-only | all | stage map does not replace or renumber CP plan | `v2-spec-overlay:validate` | covered |

## 3. P0 Coverage Check

| Check | Result |
| --- | --- |
| P0 requirement count | 9 |
| P0 with primary RP | 9 |
| P0 with first CP | 9 |
| P0 with validation surface | 9 |
| P0 rejected | 0 |
| P0 direct insertion into CP00-145-CP00-176 | 0 |

## 4. P1 Coverage Check

| Check | Result |
| --- | --- |
| P1 requirement count | 7 |
| P1 with primary RP | 7 |
| P1 with first CP | 7 |
| P1 with validation surface | 7 |
| P1 rejected | 0 |

## 5. Boundary Coverage

| Boundary | Covered by | Required proof later |
| --- | --- | --- |
| Permission trimming | Matter Graph, Matter Wiki, LLM Wiki, Citation Ledger, Document Register, Source Panel | service tests, fixtures, validator assertions |
| Human review | Matter Wiki AI text, AIResult lifecycle, Negotiation summary, Authority freshness | review-required state tests |
| Citation required | Citation Ledger, LLM Wiki, Matter Graph, Authority Graph | uncited high-risk output block tests |
| No external LLM bypass | Local AI Worker, Hybrid Model Routing | routing policy tests |
| No CP145-176 interference | Live boundary and first CP mapping | git diff scope check |
| No stage replacement | Stage overlay map | no CP renumbering or plan mutation |

## 6. Missing Count

Planning-layer missing count: `0`.

This does not mean product implementation is complete. It means the v2 missing requirements have planning anchors and future validation surfaces.
