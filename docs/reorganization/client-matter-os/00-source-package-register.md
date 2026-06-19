# Source Package Register

Status: Proposed
Date: 2026-06-19

## Source Files

| Source | Role | Notes |
| --- | --- | --- |
| `/Users/jws/Documents/Codex/matter-erp-crm-integration/Law_Firm_OS_Development_Document_Package_v1.0.docx` | Primary development document package | Defines Client-Matter OS reorganization, runtime gates, and handoff checklist. |
| `/Users/jws/Documents/Codex/matter-erp-crm-integration/Law_Firm_OS_Development_Document_Package_v1.0.pdf` | Rendered reference | Same content as the DOCX, useful for review. |
| `/Users/jws/Documents/Codex/matter-erp-crm-integration/Law_Firm_OS_TUW_Backlog_v1.0.xlsx` | Structured execution backlog | Contains 8 gates, 16 workstreams, 198 TUWs, risks, ownership, boundaries, workflows, states, and folder checklist. |
| `/Users/jws/Documents/Codex/Client-Matter-People/` | CMP v1.0 source package | Contains the 2026-06-19 Client-Matter-People OS handoff package, 13 CMP gates, and 316 newly generated CMP TUWs. Treat as the new CMP v1.0 TUW baseline once the CMP v1 validator passes; keep the older 198 `LFOS-*` TUWs as legacy reference anchors. |

## Package Interpretation

The source package does not redefine Law Firm OS as a generic ERP or CRM. It
confirms that Law Firm OS should be organized as a Client-Matter operating
system:

Relationship -> Opportunity -> Intake / Conflict -> Engagement -> Matter
Opening -> Matter Execution -> Time / Billing -> Collection -> Closing ->
Relationship Expansion.

## Current Application Scope

This repository already has the right contract-first shape:

- `contracts/` defines product and module contracts.
- `packages/*` define package-level descriptors, registries, validators, and
  limited model/service surfaces.
- `apps/api` currently exposes a bounded Master Data read surface.
- `apps/web` is the operator/product UI surface.

The source package should therefore be applied as a reorganization and runtime
transition plan, not as a replacement for the existing repo.

## Source Package Counts

| Item | Count |
| --- | ---: |
| Roadmap phases | 8 |
| Release gates | 8 |
| Workstreams | 16 |
| TUWs | 198 |
| Risks | 15 |
| Canonical object rows | 27 |

## CMP v1.0 Baseline Counts

| Item | Count |
| --- | ---: |
| Source package | `Client-Matter-People` |
| Release gates | 13 |
| Workstreams | 13 |
| TUWs | 316 |
| First CMP TUW | `CMP-G0-W00-T001` |
| Last CMP TUW | `CMP-G12-W12-T028` |

## First and Last TUW

| Boundary | TUW | Meaning |
| --- | --- | --- |
| First | `LFOS-G0-W00-T001` current folder inventory | Establish the current repo and folder baseline before movement. |
| Last | `LFOS-G7-W15-T012` production readiness review | Complete launch readiness after UAT, security, performance, DR, and rollback evidence. |
