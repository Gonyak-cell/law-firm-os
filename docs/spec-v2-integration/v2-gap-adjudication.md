# Law Firm OS v2.0 Gap Adjudication

작성일: 2026-06-09

상태: planning-only adjudication. 이 문서는 `v2-missing-requirements-spec.md`의 요구사항을 기존 Law Firm OS 계획 대비 `mapped`, `partial_mapped`, `deferred`, `rejected`로 판정한다. P0 요구사항은 최상위권 Enterprise Legal SaaS 목표상 reject하지 않는다.

## 1. Adjudication Rules

| Decision | Meaning | Allowed for P0 |
| --- | --- | --- |
| `mapped` | 기존 RP/CP 구조에 명확한 primary anchor와 최초 CP가 있음 | yes |
| `partial_mapped` | 책임 RP는 있으나 UI/provider/validator가 여러 RP에 걸쳐 단계적으로 필요함 | yes, with mitigation |
| `deferred` | 제품 목표에는 유효하지만 현재 RP entry 전 구현하지 않음 | no for P0 unless explicitly user-approved |
| `rejected` | Law Firm OS 제품 방향과 맞지 않거나 중복/위험/불필요함 | no |

## 2. Requirement Decisions

| Requirement ID | Priority | Decision | Why | First implementation anchor | Blocking condition |
| --- | --- | --- | --- | --- | --- |
| V2-MISS-KNOW-001 | P0 | mapped | Matter Wiki는 Matter Core의 지식 workspace spine이므로 RP05에서 shell을 잡아야 함 | RP05 / CP00-177 | Matter Wiki를 free-form Matter Note로만 구현하면 block |
| V2-MISS-KNOW-002 | P0 | mapped | LLM Wiki는 GraphRAG/retrieval safety를 위해 Search/AI 이전에 구조화되어야 함 | RP07 / CP00-235 | candidate/confirmed knowledge 분리가 없으면 block |
| V2-MISS-KNOW-003 | P1 | mapped | Obsidian export는 extensibility/export 기능이며 초기 domain code를 막지는 않음 | RP27 / CP00-814 | export가 permission/DLP를 우회하면 block |
| V2-MISS-GRAPH-001 | P0 | mapped | graph-provider boundary는 Matter/DMS/AI가 공유하는 long-term spine | RP05 / CP00-177 | provider-specific Neo4j code가 permission contract 없이 들어가면 block |
| V2-MISS-GRAPH-002 | P0 | mapped | node/edge vocabulary는 GraphRAG/citation/wiki/AI output의 공통 언어 | RP05 / CP00-177 | Fact/Issue/Risk/AIResult가 citation 없이 확정되면 block |
| V2-MISS-GRAPH-003 | P1 | partial_mapped | named graph views는 skeleton은 RP05, full UI/Authority/Negotiation은 후속 RP 필요 | RP05 / CP00-177 | hidden node label 노출 가능성이 있으면 block |
| V2-MISS-CITE-001 | P0 | mapped | Citation Ledger는 AI trust와 source-of-truth의 제품-wide spine | RP06 / CP00-198 | high-risk uncited output 허용 시 block |
| V2-MISS-CITE-002 | P0 | mapped | Source panel은 citation ledger를 사용자가 검증할 수 있게 하는 필수 UX contract | RP06 / CP00-198 | unauthorized source excerpt 노출 시 block |
| V2-MISS-AI-001 | P0 | mapped | Local AI Worker는 confidential/high-sensitivity matter에 필수 | RP17 / CP00-515 | local-only policy가 external reroute를 허용하면 block |
| V2-MISS-AI-002 | P0 | mapped | hybrid routing은 model choice를 사용자 임의 선택이 아니라 policy decision으로 고정 | RP17 / CP00-515 | direct model selection bypass가 있으면 block |
| V2-MISS-AI-003 | P0 | mapped | AIResult lifecycle은 generated text가 confirmed/client-delivered로 승격되는 통제 장치 | RP17 / CP00-515 | client delivery 전에 review/citation state가 없으면 block |
| V2-MISS-DMS-001 | P1 | mapped | Document Register는 DMS metadata보다 강한 matter-bound register contract | RP06 / CP00-198 | register가 permission-trimmed 되지 않으면 block |
| V2-MISS-DMS-002 | P1 | mapped | lineage는 OCR/email/migration/reprocessing에서 나중에 붙이기 어려움 | RP06 / CP00-198 | reprocessing이 기존 evidence를 overwrite하면 block |
| V2-MISS-NEG-001 | P1 | mapped | Negotiation Ledger는 Email/Office Native DMS와 AI workflow 사이의 협상 기록 spine | RP08 / CP00-272 | AI negotiation summary가 approved 없이 확정되면 block |
| V2-MISS-AUTH-001 | P1 | mapped | Authority Graph는 legal depth/authority freshness에 필수 | RP24 / CP00-716 | uncited model memory를 authority로 쓰면 block |
| V2-MISS-DEPLOY-001 | P1 | mapped | Private/Sovereign/hybrid deployment는 enterprise procurement에 필요 | RP26 / CP00-782 | deployment mode가 routing/residency/backup에 영향 없으면 block |
| V2-MISS-PLAN-001 | P2 | mapped | v2 stage map은 planning overlay이며 기존 CP plan을 대체하지 않음 | docs/spec-v2-integration | CP renumbering을 요구하면 block |

## 3. Cross-Cutting Findings

### 3.1 P0 Findings

P0 requirements are not optional for the final SaaS target:

- `MatterWiki` and `LLMWiki` prevent knowledge from becoming unreviewed free text.
- `MatterGraph` gives Matter, DMS, Search, AI, and Authority layers a shared relationship model.
- `CitationLedger` makes AI and client-delivered output evidence-bound.
- `LocalAIWorker` and hybrid routing make confidential matters commercially viable for enterprise buyers.
- `AIResult` lifecycle prevents generated text from silently becoming approved legal output.

### 3.2 Items Already Partially Covered

The existing plan already covers the broad modules, but not always the v2-specific product name and acceptance boundary:

- RP05 already has Matter Core, but not named `MatterWiki` / `MatterGraph`.
- RP06 already has DMS, but not named `DocumentRegister` / product-wide `CitationLedger`.
- RP07 already has Search/OCR/semantic index, but not named `LLMWiki` retrieval packet model.
- RP17 already has AI Governance, but not explicit Local AI Worker and AIResult delivery lifecycle.
- RP26/RP29 already cover hardening/commercial readiness, but not deployment-mode contract detail.

### 3.3 Deferred Items

No requirement is rejected. The following are deferred in implementation timing but mapped:

| Requirement | Deferred portion | Why safe |
| --- | --- | --- |
| V2-MISS-KNOW-003 | actual Obsidian export implementation | RP05/RP17 need only leave stable wiki/citation fields; export belongs to RP27 |
| V2-MISS-GRAPH-003 | full graph view rendering | skeleton and permission boundary start in RP05; individual views mature across RP06/RP08/RP17/RP24 |
| V2-MISS-DEPLOY-001 | Private/Sovereign packaging | must be designed now, but implementation belongs to RP26/RP29 |

## 4. Required Corrections Before CP00-177

Before the `RP05` implementation session starts, the following planning corrections must be visible:

1. `CP00-177` entry brief must say Matter Wiki is not Matter Note.
2. `MatterGraph` skeleton must be allowed to exist before Neo4j/provider implementation.
3. `CitationLedger` must be reserved as product-wide evidence spine, even if first code appears in RP06.
4. The CP145-176 development session must not be asked to implement these v2 items.
5. The overlay JSON must be available for future validator/generator work.

## 5. Adjudication Outcome

Overall verdict: `PASS_FOR_PLANNING`.

Reason: all v2 missing requirements are mapped, no P0 requirement is rejected, and implementation is staged so current `CP00-145-CP00-176` work remains untouched.

