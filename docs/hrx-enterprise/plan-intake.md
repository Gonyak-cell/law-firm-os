# HRX Enterprise Pack 0 Intake

Status: planning-only intake
Date: 2026-06-19
Source package: /Users/jws/Documents/Codex/hrx-enterprise/

## Purpose

This intake converts the external HRX Enterprise TUW package into a Law Firm OS execution plan without claiming runtime readiness. It preserves HRX as an embedded People/HR runtime direction inside Law Firm OS and keeps descriptor-only evidence separate from implementation evidence.

## Source Files

| Source | Role | Intake result |
| --- | --- | --- |
| HRX_Enterprise_SaaS_TUW_Delivery_Package_ko.md | Narrative plan, levels, decisions, evidence, benchmark framing | Adopt as planning source only |
| HRX_TUW_Backlog_ko.csv | Canonical TUW list | 88 TUWs imported into traceability matrix |
| HRX_Enterprise_SaaS_TUW_Delivery_Package_ko.docx | Human-readable handoff copy | Reference only, not executable evidence |

## Intake Decisions

| Decision | Result |
| --- | --- |
| Product boundary | HRX remains embedded in Law Firm OS until enterprise readiness gates pass |
| Descriptor-only evidence | Preserved, but cannot satisfy runtime readiness |
| Payroll | Export preview and human review first; calculation runtime deferred |
| HR AI | Explanation/RAG only; final employment/pay/evaluation decisions blocked |
| Employee/User | Separate identities with controlled link only |
| Sensitive HR operations | Permission decision plus audit event required |

## Pack 0 TUWs

| Intake TUW | Output | Gate |
| --- | --- | --- |
| HRX-PLAN-INTAKE-T01 | Confirm 88 canonical source TUWs from CSV | Source row count equals matrix row count |
| HRX-PLAN-INTAKE-T02 | Classify each source TUW into execution package and disposition | Every TUW has pack, PR lane, disposition |
| HRX-PLAN-INTAKE-T03 | Attach target file, command, risk, severity, owner role | No blank ID, pack, target, acceptance criteria |
| HRX-PLAN-INTAKE-T04 | Create sequential pack/PR board | 18 packs mapped into 12 PR lanes |
| HRX-PLAN-INTAKE-T05 | Record current claim boundary | No runtime-ready or production-ready claim emitted |

## Current Claim Boundary

Pack 0 does not implement HRX runtime. It only organizes the plan. The next executable pack is HRX-P01 Boundary.

## Generated Artifacts

| Artifact | Purpose |
| --- | --- |
| docs/hrx-enterprise/plan-intake.md | This intake record |
| docs/hrx-enterprise/tuw-traceability-matrix.md | All 88 TUWs mapped to execution order |
| docs/hrx-enterprise/sequential-pack-pr-board.md | 18 pack sequence and 12 PR lanes with gates |
