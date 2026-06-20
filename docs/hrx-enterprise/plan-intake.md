# HRX Enterprise Roadmap Intake

Status: PR-00 governance baseline
Date: 2026-06-20
Source package: `/Users/jws/Documents/Codex/hrx-enterprise/HRX_Enterprise_Roadmap_Dev_Package_ko.zip`

## Purpose

This intake converts the HRX Enterprise Roadmap Dev Package into a Law Firm OS execution backlog without claiming runtime readiness. It preserves HRX as an embedded People Operations runtime direction inside Law Firm OS and keeps roadmap evidence separate from implementation evidence.

## Source Files

| Source | Role | Intake result |
| --- | --- | --- |
| HRX_Enterprise_Roadmap_Dev_Package_ko.zip | Canonical packaged roadmap | Imported into `docs/hrx-enterprise/roadmap-package/` |
| HRX_Roadmap_03_TUW_BACKLOG.csv | Canonical TUW backlog | 127 TUWs imported into traceability matrix |
| HRX_Roadmap_04_PR_SEQUENCE.md | PR sequencing source | PR-00 through PR-15 execution order |
| HRX_Roadmap_06_VALIDATOR_TEST_PLAN.md | Validator plan | Drives validator script/package script roadmap |
| HRX_Roadmap_07_ARCHITECTURE_DATA_MODEL.md | Target architecture | Drives future L1-L7 implementation boundaries |
| HRX_Roadmap_08_RISK_REGISTER.md | Risk register | Imported into top-level risk register |
| HRX_Enterprise_Roadmap_Dev_Package_ko.docx | Human-readable handoff copy | Reference only, not executable evidence |

## Intake Decisions

| Decision | Result |
| --- | --- |
| Current boundary | `runtime_api_evidence_only__durable_persistence_open` |
| Target state | `runtime_write_ready__durable_persistence_guarded`, future target only |
| Product boundary | HRX remains embedded in Law Firm OS until release owner says otherwise |
| Roadmap evidence | Planning and backlog truth, not implementation proof |
| Payroll | Export preview and human review first; calculation/disbursement blocked |
| HR AI | Source-grounded explanation only; final employment/pay/evaluation decisions blocked |
| Employee/User | Separate identities with controlled link only |
| Sensitive HR operations | Server-side tenant/actor context, permission decision, audit event, and step-up when required |

## PR-00 TUWs

| TUW | Output | Gate |
| --- | --- | --- |
| HRX-L0-001 | Boundary decision | Current/target state separated |
| HRX-L0-002 | Source-of-truth hierarchy | Drive/planning/repo conflict policy documented |
| HRX-L0-003 | Release gate baseline | Current readiness and promotion gates documented |
| HRX-L0-004 | No-premature-claim validator | Target state cannot be claimed as current state |
| HRX-L0-005 | Terminology refresh | Descriptor/runtime/durable/enterprise terms separated |
| HRX-L0-006 | Handoff template | PR/owner/validator/evidence fields fixed |
| HRX-L0-007 | Traceability matrix | 127 TUWs have file/test/validator/status |
| HRX-L0-008 | Risk register | P0/P1 risks and mitigations captured |

## Current Claim Boundary

PR-00 does not implement durable HRX runtime. It organizes the roadmap, fixes the claim boundary, imports the package, and creates fail-closed validation. The next executable PR is PR-01 durable persistence foundation.

## Generated Artifacts

| Artifact | Purpose |
| --- | --- |
| `docs/hrx-enterprise/plan-intake.md` | This intake record |
| `docs/hrx-enterprise/roadmap-package/` | Imported roadmap source package |
| `docs/hrx-enterprise/tuw-traceability-matrix.md` | All 127 TUWs mapped to execution order |
| `docs/hrx-enterprise/sequential-pack-pr-board.md` | PR-00 through PR-15 sequence and gate map |
