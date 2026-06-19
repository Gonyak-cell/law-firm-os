# Law Firm OS v2.0 Source Index

작성일: 2026-06-09

상태: planning-only source index. 이 문서는 `Law_Firm_OS_Enterprise_SaaS_사양명세서_v2.0.docx`의 주요 요구사항 출처를 `V2-MISS-*` planning overlay 항목과 연결한다. 구현, ledger 변경, validator 변경, closeout, `production_ready` 선언을 승인하지 않는다.

## 1. Source Artifacts

| Source | Role | Status |
| --- | --- | --- |
| `Law_Firm_OS_Enterprise_SaaS_사양명세서_v2.0.docx` | original external v2 product specification | untracked source reference |
| `docs/spec-v2-integration/v2-missing-requirements-spec.md` | normalized missing-requirements specification | planning source |
| `docs/spec-v2-integration/v2-rp-anchor-map.md` | RP/CP anchor map | planning output |
| `docs/spec-v2-integration/v2-gap-adjudication.md` | gap decision record | planning output |
| `docs/spec-v2-integration/v2-no-omission-coverage-matrix.md` | no-omission matrix | planning output |
| `docs/spec-v2-integration/v2-overlay-closeout-pack-map.json` | machine-readable overlay map | planning output |
| `docs/spec-v2-integration/v2-cp177-entry-brief.md` | RP05/CP00-177 entry brief | planning output |

## 2. Included v2 Source Anchors

| Source topic | DOCX paragraph anchors | Overlay requirement IDs | Coverage status |
| --- | --- | --- | --- |
| Matter Wiki | 2, 22, 62, 276-278, 615 | V2-MISS-KNOW-001 | included |
| LLM Wiki | 2, 22, 45, 276, 313-318, 554 | V2-MISS-KNOW-002 | included |
| Obsidian-compatible export | 2, 318 | V2-MISS-KNOW-003 | included |
| Neo4j / Matter Graph | 2, 20, 36, 45, 62, 90, 127-128, 147, 191, 223-228, 548, 600, 618 | V2-MISS-GRAPH-001, V2-MISS-GRAPH-002, V2-MISS-GRAPH-003 | included |
| Citation Ledger / Citation Anchor | 36, 65, 242, 270, 317, 334, 597, 616, 729-730 | V2-MISS-CITE-001, V2-MISS-CITE-002 | included |
| Local AI Worker / Gemma / hybrid routing | 2, 69, 93, 112, 324-326, 334, 353-362, 585, 603, 617 | V2-MISS-AI-001, V2-MISS-AI-002 | included |
| AI Result lifecycle and provenance | 403, 465 and AI layer status/provenance section | V2-MISS-AI-003 | included |
| Document Register / lineage | 237-242, 270, 289, 439, 615-618 | V2-MISS-DMS-001, V2-MISS-DMS-002 | included |
| Negotiation Ledger / Word-Outlook negotiation state | 241, 304, 422-439 | V2-MISS-NEG-001 | included |
| Authority Graph | 227, 598-603 | V2-MISS-AUTH-001 | included |
| Private/Sovereign / hybrid deployment | 112, 563-566, 581, 585 | V2-MISS-DEPLOY-001 | included |
| Stage 0-6 roadmap | 589-618 | V2-MISS-PLAN-001 | included |

## 3. Already-Covered v2 Source Topics

The following DOCX topics were not registered as missing requirements because existing RP/CP plans already carry their broad implementation responsibility.

| Source topic | Existing anchors | Treatment |
| --- | --- | --- |
| Tenant, workspace, auth, SSO/MFA, SCIM | RP00, RP01, RP21, RP26 | excluded from missing list |
| RBAC, ABAC, ethical wall, permission review | RP02, RP10, RP16, RP21 | excluded from missing list |
| Generic audit, WORM/immutable logs, security events | RP03, RP16, RP17, RP29 | excluded from missing list |
| Client portal and external sharing | RP19, RP20 | excluded from missing list |
| Generic workflow builder and workflow templates | RP18, RP21, RP28 | excluded from missing list |
| Word/Outlook/Gmail/Office add-ins as broad capability | RP08, RP22, RP23 | excluded from missing list except negotiation-specific ledger |
| DLP, retention, legal hold, compliance | RP16, RP24, RP26, RP29 | excluded from missing list except register/lineage/deployment-specific gaps |
| Observability, SLA, DR, backups, enterprise hardening | RP26, RP29 | excluded from missing list except Private/Sovereign deployment contract |
| Pricing and packaging | RP29 | excluded from missing list except Private/Sovereign packaging dependency |
| Marketplace and custom AI apps | RP28, RP29 | excluded from missing list |

## 4. Traceability Checks

| Check | Result |
| --- | --- |
| Included source topics with overlay requirement IDs | 12 / 12 |
| `V2-MISS-*` detailed requirements represented in anchor map | 17 / 17 |
| `V2-MISS-*` detailed requirements represented in gap adjudication | 17 / 17 |
| `V2-MISS-*` detailed requirements represented in no-omission matrix | 17 / 17 |
| `V2-MISS-*` detailed requirements represented in overlay JSON | 17 / 17 |
| P0 rejected | 0 |
| Direct insertion into `CP00-145-CP00-176` | 0 |

## 5. Source Boundary Notes

- DOCX paragraph numbers are extraction-order anchors from the Word document text stream. They are planning references, not legal citations.
- This source index does not prove implementation completeness.
- If the DOCX changes, rerun source extraction and update this index before changing the anchor map.
- The v2 overlay remains a planning reference until a future closeout pack explicitly consumes it.

