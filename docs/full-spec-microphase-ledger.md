# Law Firm OS Full Spec Micro Phase Ledger v1

Generated from the full-spec SaaS implementation plan.

## Summary

- Release Programs: 30
- Standard Phases per Program: 10
- Micro Phases per Standard Phase: 11
- Total Micro Phases: 3300
- Development model: AI-led implementation, Hermes validation, Claude Code cross-validation, human final approval.

## Release Programs

- RP00: Product Constitution And AI Control Plane - 제품 계약, AI 개발 통제, Hermes H0 연결 / AI: Codex / Hermes: H00 / Claude: C00
- RP01: Core Domain Foundation - Tenant, User, Role, Client, Matter, Document, AuditEvent / AI: Codex / Hermes: H01 / Claude: C01
- RP02: Permission Kernel - RBAC, ABAC, ACL, Deny Rule, Security Trimming / AI: Codex / Hermes: H02 / Claude: C02
- RP03: Audit And Compliance Kernel - append-only audit, tamper-evident hash chain, WORM retention, legal hold, trace correlation, privacy-safe evidence, admin access review, compliance export / AI: Codex / Hermes: H03 / Claude: C03
- RP04: Master Data - Entity, Person, Organization, Relationship, Client Group / AI: Codex / Hermes: H04 / Claude: C04
- RP05: Matter Core - Matter lifecycle, team, task, calendar, checklist, closing / AI: Codex/Cursor / Hermes: H05 / Claude: C05
- RP06: DMS Core - Workspace, Folder, Document, Version, FileObject, Rendition / AI: Codex/Cursor / Hermes: H06 / Claude: C06
- RP07: Search OCR And Index - keyword, metadata, OCR, clause, semantic index / AI: Codex / Hermes: H07 / Claude: C07
- RP08: Email And Office Native DMS - Outlook, Gmail, Office add-in, email filing / AI: Codex/Cursor / Hermes: H08 / Claude: C08
- RP09: CRM And Business Development - Lead, Opportunity, Activity, Proposal, Campaign, Referral / AI: Cursor/Codex / Hermes: H09 / Claude: C09
- RP10: Intake Conflict Engagement - ConflictCheck, ConflictHit, Waiver, Engagement, Fee Terms / AI: Codex / Hermes: H10 / Claude: C10
- RP11: Time Expense Disbursement - TimeEntry, rate card, expense, disbursement, evidence documents / AI: Codex / Hermes: H11 / Claude: C11
- RP12: Billing And Invoicing - Proforma, Invoice, TaxInvoice, write-down, write-off / AI: Codex / Hermes: H12 / Claude: C12
- RP13: Payments AR Accounting Export - Payment matching, AR aging, journal entry, VAT export / AI: Codex / Hermes: H13 / Claude: C13
- RP14: Partner Settlement - Origination, allocation, working credit, settlement run lock / AI: Codex / Hermes: H14 / Claude: C14
- RP15: Firm Analytics - Managing partner, partner, Matter P&L, forecast, WIP / AI: Cursor/Codex / Hermes: H15 / Claude: C15
- RP16: Governance DLP Retention - DLP, legal hold, retention, break-glass, incident response / AI: Codex / Hermes: H16 / Claude: C16
- RP17: AI Governance - Model policy, retrieval scope, audit, citation / AI: Codex / Hermes: H17 / Claude: C17
- RP18: AI Legal Workflows - Precedent, clause, markup, DD extraction, drafting, reports / AI: Codex / Hermes: H18 / Claude: C18
- RP19: Client Portal - Client users, secure link, client review, Q&A, watermark / AI: Cursor/Codex / Hermes: H19 / Claude: C19
- RP20: Data Room And VDR - M&A room, RFI, CP, closing binder, access analytics / AI: Codex/Cursor / Hermes: H20 / Claude: C20
- RP21: Admin Console - Taxonomy, templates, workflow, policy, usage, billing plan / AI: Cursor/Codex / Hermes: H21 / Claude: C21
- RP22: External Integrations I - Microsoft 365, Google Workspace, Slack/Teams, e-sign / AI: Codex / Hermes: H22 / Claude: C22
- RP23: External Integrations II - Bank, card, WEHAGO, 더존, tax export, DART / AI: Codex / Hermes: H23 / Claude: C23
- RP24: Korean Legal Depth - HWPX, Korean clauses, litigation, corporate documents / AI: Codex / Hermes: H24 / Claude: C24
- RP25: Migration Platform - file server, SharePoint, Drive, iManage import / AI: Codex / Hermes: H25 / Claude: C25
- RP26: Enterprise SaaS Hardening - dedicated DB/storage/index/key, SSO, MFA, SCIM / AI: Codex / Hermes: H26 / Claude: C26
- RP27: Platform Extensibility - public API, webhooks, workflow builder / AI: Codex / Hermes: H27 / Claude: C27
- RP28: Marketplace And Custom AI Apps - app registry, connector SDK, custom AI app review gate / AI: Codex / Hermes: H28 / Claude: C28
- RP29: Commercial Readiness - CI/CD, observability, SOC2/ISMS-P reports, release / AI: Codex / Hermes: H29 / Claude: C29

## Micro Phase Ledger

### RP00: Product Constitution And AI Control Plane

Scope: 제품 계약, AI 개발 통제, Hermes H0 연결

#### RP00.P00: Contract And Acceptance Baseline

- RP00.P00.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Product Constitution And AI Control Plane: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H00 | Claude: C00
- RP00.P00.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Product Constitution And AI Control Plane: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H00 | Claude: C00 | Reqs: TEN-001:contract, TEN-002:contract, TEN-003:contract, TEN-004:contract, TEN-005:contract, TEN-006:contract, TEN-007:contract, TEN-008:contract, NARR-018:primary_implementation, NARR-018:contract
- RP00.P00.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Product Constitution And AI Control Plane: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H00 | Claude: C00
- RP00.P00.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Product Constitution And AI Control Plane: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H00 | Claude: C00
- RP00.P00.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Product Constitution And AI Control Plane: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H00 | Claude: C00
- RP00.P00.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Product Constitution And AI Control Plane: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H00 | Claude: C00
- RP00.P00.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Product Constitution And AI Control Plane: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H00 | Claude: C00
- RP00.P00.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Product Constitution And AI Control Plane: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H00 | Claude: C00
- RP00.P00.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Product Constitution And AI Control Plane: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H00 | Claude: C00
- RP00.P00.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Product Constitution And AI Control Plane: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H00 | Claude: C00
- RP00.P00.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Product Constitution And AI Control Plane: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H00 | Claude: C00

#### RP00.P01: Domain Model

- RP00.P01.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Product Constitution And AI Control Plane: Domain Model. | Commands: npm run validate | Hermes: H00 | Claude: C00
- RP00.P01.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Product Constitution And AI Control Plane: Domain Model. | Commands: npm run validate | Hermes: H00 | Claude: C00
- RP00.P01.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Product Constitution And AI Control Plane: Domain Model. | Commands: npm run validate | Hermes: H00 | Claude: C00
- RP00.P01.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Product Constitution And AI Control Plane: Domain Model. | Commands: npm run validate | Hermes: H00 | Claude: C00
- RP00.P01.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Product Constitution And AI Control Plane: Domain Model. | Commands: npm run validate | Hermes: H00 | Claude: C00
- RP00.P01.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Product Constitution And AI Control Plane: Domain Model. | Commands: npm run validate | Hermes: H00 | Claude: C00
- RP00.P01.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Product Constitution And AI Control Plane: Domain Model. | Commands: npm run validate | Hermes: H00 | Claude: C00
- RP00.P01.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Product Constitution And AI Control Plane: Domain Model. | Commands: npm run validate | Hermes: H00 | Claude: C00
- RP00.P01.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Product Constitution And AI Control Plane: Domain Model. | Commands: npm run validate | Hermes: H00 | Claude: C00
- RP00.P01.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Product Constitution And AI Control Plane: Domain Model. | Commands: npm run validate | Hermes: H00 | Claude: C00
- RP00.P01.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Product Constitution And AI Control Plane: Domain Model. | Commands: npm run validate | Hermes: H00 | Claude: C00

#### RP00.P02: Service Logic

- RP00.P02.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Product Constitution And AI Control Plane: Service Logic. | Commands: npm run validate, npm test | Hermes: H00 | Claude: C00
- RP00.P02.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Product Constitution And AI Control Plane: Service Logic. | Commands: npm run validate, npm test | Hermes: H00 | Claude: C00
- RP00.P02.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Product Constitution And AI Control Plane: Service Logic. | Commands: npm run validate, npm test | Hermes: H00 | Claude: C00
- RP00.P02.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Product Constitution And AI Control Plane: Service Logic. | Commands: npm run validate, npm test | Hermes: H00 | Claude: C00 | Reqs: TEN-001:primary_implementation, TEN-002:primary_implementation, TEN-003:primary_implementation, TEN-004:primary_implementation, TEN-005:primary_implementation, TEN-006:primary_implementation, TEN-007:primary_implementation, TEN-008:primary_implementation
- RP00.P02.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Product Constitution And AI Control Plane: Service Logic. | Commands: npm run validate, npm test | Hermes: H00 | Claude: C00
- RP00.P02.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Product Constitution And AI Control Plane: Service Logic. | Commands: npm run validate, npm test | Hermes: H00 | Claude: C00
- RP00.P02.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Product Constitution And AI Control Plane: Service Logic. | Commands: npm run validate, npm test | Hermes: H00 | Claude: C00
- RP00.P02.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Product Constitution And AI Control Plane: Service Logic. | Commands: npm run validate, npm test | Hermes: H00 | Claude: C00
- RP00.P02.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Product Constitution And AI Control Plane: Service Logic. | Commands: npm run validate, npm test | Hermes: H00 | Claude: C00
- RP00.P02.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Product Constitution And AI Control Plane: Service Logic. | Commands: npm run validate, npm test | Hermes: H00 | Claude: C00
- RP00.P02.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Product Constitution And AI Control Plane: Service Logic. | Commands: npm run validate, npm test | Hermes: H00 | Claude: C00

#### RP00.P03: API And Interface

- RP00.P03.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Product Constitution And AI Control Plane: API And Interface. | Commands: npm run validate, npm test | Hermes: H00 | Claude: C00
- RP00.P03.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Product Constitution And AI Control Plane: API And Interface. | Commands: npm run validate, npm test | Hermes: H00 | Claude: C00
- RP00.P03.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Product Constitution And AI Control Plane: API And Interface. | Commands: npm run validate, npm test | Hermes: H00 | Claude: C00
- RP00.P03.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Product Constitution And AI Control Plane: API And Interface. | Commands: npm run validate, npm test | Hermes: H00 | Claude: C00
- RP00.P03.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Product Constitution And AI Control Plane: API And Interface. | Commands: npm run validate, npm test | Hermes: H00 | Claude: C00
- RP00.P03.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Product Constitution And AI Control Plane: API And Interface. | Commands: npm run validate, npm test | Hermes: H00 | Claude: C00
- RP00.P03.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Product Constitution And AI Control Plane: API And Interface. | Commands: npm run validate, npm test | Hermes: H00 | Claude: C00
- RP00.P03.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Product Constitution And AI Control Plane: API And Interface. | Commands: npm run validate, npm test | Hermes: H00 | Claude: C00
- RP00.P03.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Product Constitution And AI Control Plane: API And Interface. | Commands: npm run validate, npm test | Hermes: H00 | Claude: C00
- RP00.P03.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Product Constitution And AI Control Plane: API And Interface. | Commands: npm run validate, npm test | Hermes: H00 | Claude: C00
- RP00.P03.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Product Constitution And AI Control Plane: API And Interface. | Commands: npm run validate, npm test | Hermes: H00 | Claude: C00

#### RP00.P04: UI And Operator Surface

- RP00.P04.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Product Constitution And AI Control Plane: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H00 | Claude: C00
- RP00.P04.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Product Constitution And AI Control Plane: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H00 | Claude: C00
- RP00.P04.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Product Constitution And AI Control Plane: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H00 | Claude: C00
- RP00.P04.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Product Constitution And AI Control Plane: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H00 | Claude: C00
- RP00.P04.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Product Constitution And AI Control Plane: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H00 | Claude: C00
- RP00.P04.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Product Constitution And AI Control Plane: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H00 | Claude: C00
- RP00.P04.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Product Constitution And AI Control Plane: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H00 | Claude: C00
- RP00.P04.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Product Constitution And AI Control Plane: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H00 | Claude: C00
- RP00.P04.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Product Constitution And AI Control Plane: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H00 | Claude: C00
- RP00.P04.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Product Constitution And AI Control Plane: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H00 | Claude: C00
- RP00.P04.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Product Constitution And AI Control Plane: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H00 | Claude: C00

#### RP00.P05: Fixtures And Golden Cases

- RP00.P05.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Product Constitution And AI Control Plane: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H00 | Claude: C00
- RP00.P05.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Product Constitution And AI Control Plane: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H00 | Claude: C00
- RP00.P05.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Product Constitution And AI Control Plane: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H00 | Claude: C00
- RP00.P05.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Product Constitution And AI Control Plane: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H00 | Claude: C00
- RP00.P05.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Product Constitution And AI Control Plane: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H00 | Claude: C00
- RP00.P05.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Product Constitution And AI Control Plane: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H00 | Claude: C00
- RP00.P05.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Product Constitution And AI Control Plane: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H00 | Claude: C00
- RP00.P05.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Product Constitution And AI Control Plane: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H00 | Claude: C00 | Reqs: TEN-001:test, TEN-002:test, TEN-003:test, TEN-004:test, TEN-005:test, TEN-006:test, TEN-007:test, TEN-008:test, NARR-018:test
- RP00.P05.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Product Constitution And AI Control Plane: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H00 | Claude: C00
- RP00.P05.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Product Constitution And AI Control Plane: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H00 | Claude: C00
- RP00.P05.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Product Constitution And AI Control Plane: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H00 | Claude: C00

#### RP00.P06: Permission Audit Integration

- RP00.P06.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Product Constitution And AI Control Plane: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H00 | Claude: C00
- RP00.P06.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Product Constitution And AI Control Plane: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H00 | Claude: C00
- RP00.P06.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Product Constitution And AI Control Plane: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H00 | Claude: C00
- RP00.P06.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Product Constitution And AI Control Plane: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H00 | Claude: C00
- RP00.P06.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Product Constitution And AI Control Plane: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H00 | Claude: C00
- RP00.P06.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Product Constitution And AI Control Plane: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H00 | Claude: C00
- RP00.P06.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Product Constitution And AI Control Plane: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H00 | Claude: C00
- RP00.P06.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Product Constitution And AI Control Plane: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H00 | Claude: C00
- RP00.P06.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Product Constitution And AI Control Plane: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H00 | Claude: C00
- RP00.P06.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Product Constitution And AI Control Plane: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H00 | Claude: C00
- RP00.P06.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Product Constitution And AI Control Plane: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H00 | Claude: C00

#### RP00.P07: Failure Edge And Recovery

- RP00.P07.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Product Constitution And AI Control Plane: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H00 | Claude: C00
- RP00.P07.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Product Constitution And AI Control Plane: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H00 | Claude: C00
- RP00.P07.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Product Constitution And AI Control Plane: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H00 | Claude: C00
- RP00.P07.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Product Constitution And AI Control Plane: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H00 | Claude: C00
- RP00.P07.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Product Constitution And AI Control Plane: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H00 | Claude: C00
- RP00.P07.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Product Constitution And AI Control Plane: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H00 | Claude: C00
- RP00.P07.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Product Constitution And AI Control Plane: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H00 | Claude: C00
- RP00.P07.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Product Constitution And AI Control Plane: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H00 | Claude: C00
- RP00.P07.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Product Constitution And AI Control Plane: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H00 | Claude: C00
- RP00.P07.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Product Constitution And AI Control Plane: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H00 | Claude: C00
- RP00.P07.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Product Constitution And AI Control Plane: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H00 | Claude: C00

#### RP00.P08: Hermes Validation Binding

- RP00.P08.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Product Constitution And AI Control Plane: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H00 | Claude: C00
- RP00.P08.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Product Constitution And AI Control Plane: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H00 | Claude: C00
- RP00.P08.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Product Constitution And AI Control Plane: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H00 | Claude: C00
- RP00.P08.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Product Constitution And AI Control Plane: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H00 | Claude: C00
- RP00.P08.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Product Constitution And AI Control Plane: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H00 | Claude: C00
- RP00.P08.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Product Constitution And AI Control Plane: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H00 | Claude: C00
- RP00.P08.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Product Constitution And AI Control Plane: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H00 | Claude: C00
- RP00.P08.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Product Constitution And AI Control Plane: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H00 | Claude: C00
- RP00.P08.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Product Constitution And AI Control Plane: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H00 | Claude: C00 | Reqs: TEN-001:hermes_evidence, TEN-002:hermes_evidence, TEN-003:hermes_evidence, TEN-004:hermes_evidence, TEN-005:hermes_evidence, TEN-006:hermes_evidence, TEN-007:hermes_evidence, TEN-008:hermes_evidence, NARR-018:hermes_evidence
- RP00.P08.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Product Constitution And AI Control Plane: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H00 | Claude: C00
- RP00.P08.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Product Constitution And AI Control Plane: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H00 | Claude: C00

#### RP00.P09: Claude Cross Validation Closeout

- RP00.P09.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Product Constitution And AI Control Plane: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H00 | Claude: C00
- RP00.P09.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Product Constitution And AI Control Plane: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H00 | Claude: C00
- RP00.P09.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Product Constitution And AI Control Plane: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H00 | Claude: C00
- RP00.P09.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Product Constitution And AI Control Plane: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H00 | Claude: C00
- RP00.P09.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Product Constitution And AI Control Plane: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H00 | Claude: C00
- RP00.P09.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Product Constitution And AI Control Plane: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H00 | Claude: C00
- RP00.P09.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Product Constitution And AI Control Plane: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H00 | Claude: C00
- RP00.P09.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Product Constitution And AI Control Plane: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H00 | Claude: C00
- RP00.P09.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Product Constitution And AI Control Plane: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H00 | Claude: C00
- RP00.P09.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Product Constitution And AI Control Plane: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H00 | Claude: C00 | Reqs: TEN-001:claude_review, TEN-002:claude_review, TEN-003:claude_review, TEN-004:claude_review, TEN-005:claude_review, TEN-006:claude_review, TEN-007:claude_review, TEN-008:claude_review, NARR-018:claude_review
- RP00.P09.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Product Constitution And AI Control Plane: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H00 | Claude: C00


### RP01: Core Domain Foundation

Scope: Tenant, User, Role, Client, Matter, Document, AuditEvent

#### RP01.P00: Contract And Acceptance Baseline

- RP01.P00.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Core Domain Foundation: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H01 | Claude: C01
- RP01.P00.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Core Domain Foundation: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H01 | Claude: C01 | Reqs: USR-001:contract, USR-002:contract, USR-003:contract, USR-004:contract, USR-005:contract, USR-006:contract, USR-007:contract, USR-008:contract, NARR-001:contract, NARR-003:contract
- RP01.P00.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Core Domain Foundation: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H01 | Claude: C01
- RP01.P00.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Core Domain Foundation: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H01 | Claude: C01
- RP01.P00.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Core Domain Foundation: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H01 | Claude: C01
- RP01.P00.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Core Domain Foundation: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H01 | Claude: C01
- RP01.P00.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Core Domain Foundation: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H01 | Claude: C01
- RP01.P00.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Core Domain Foundation: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H01 | Claude: C01
- RP01.P00.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Core Domain Foundation: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H01 | Claude: C01
- RP01.P00.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Core Domain Foundation: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H01 | Claude: C01
- RP01.P00.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Core Domain Foundation: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H01 | Claude: C01

#### RP01.P01: Domain Model

- RP01.P01.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Core Domain Foundation: Domain Model. | Commands: npm run validate | Hermes: H01 | Claude: C01
- RP01.P01.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Core Domain Foundation: Domain Model. | Commands: npm run validate | Hermes: H01 | Claude: C01
- RP01.P01.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Core Domain Foundation: Domain Model. | Commands: npm run validate | Hermes: H01 | Claude: C01
- RP01.P01.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Core Domain Foundation: Domain Model. | Commands: npm run validate | Hermes: H01 | Claude: C01
- RP01.P01.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Core Domain Foundation: Domain Model. | Commands: npm run validate | Hermes: H01 | Claude: C01
- RP01.P01.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Core Domain Foundation: Domain Model. | Commands: npm run validate | Hermes: H01 | Claude: C01
- RP01.P01.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Core Domain Foundation: Domain Model. | Commands: npm run validate | Hermes: H01 | Claude: C01
- RP01.P01.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Core Domain Foundation: Domain Model. | Commands: npm run validate | Hermes: H01 | Claude: C01
- RP01.P01.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Core Domain Foundation: Domain Model. | Commands: npm run validate | Hermes: H01 | Claude: C01
- RP01.P01.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Core Domain Foundation: Domain Model. | Commands: npm run validate | Hermes: H01 | Claude: C01
- RP01.P01.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Core Domain Foundation: Domain Model. | Commands: npm run validate | Hermes: H01 | Claude: C01

#### RP01.P02: Service Logic

- RP01.P02.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Core Domain Foundation: Service Logic. | Commands: npm run validate, npm test | Hermes: H01 | Claude: C01
- RP01.P02.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Core Domain Foundation: Service Logic. | Commands: npm run validate, npm test | Hermes: H01 | Claude: C01
- RP01.P02.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Core Domain Foundation: Service Logic. | Commands: npm run validate, npm test | Hermes: H01 | Claude: C01
- RP01.P02.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Core Domain Foundation: Service Logic. | Commands: npm run validate, npm test | Hermes: H01 | Claude: C01 | Reqs: USR-001:primary_implementation, USR-002:primary_implementation, USR-003:primary_implementation, USR-004:primary_implementation, USR-005:primary_implementation, USR-006:primary_implementation, USR-007:primary_implementation, USR-008:primary_implementation, NARR-001:primary_implementation, NARR-003:primary_implementation
- RP01.P02.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Core Domain Foundation: Service Logic. | Commands: npm run validate, npm test | Hermes: H01 | Claude: C01
- RP01.P02.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Core Domain Foundation: Service Logic. | Commands: npm run validate, npm test | Hermes: H01 | Claude: C01
- RP01.P02.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Core Domain Foundation: Service Logic. | Commands: npm run validate, npm test | Hermes: H01 | Claude: C01
- RP01.P02.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Core Domain Foundation: Service Logic. | Commands: npm run validate, npm test | Hermes: H01 | Claude: C01
- RP01.P02.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Core Domain Foundation: Service Logic. | Commands: npm run validate, npm test | Hermes: H01 | Claude: C01
- RP01.P02.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Core Domain Foundation: Service Logic. | Commands: npm run validate, npm test | Hermes: H01 | Claude: C01
- RP01.P02.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Core Domain Foundation: Service Logic. | Commands: npm run validate, npm test | Hermes: H01 | Claude: C01

#### RP01.P03: API And Interface

- RP01.P03.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Core Domain Foundation: API And Interface. | Commands: npm run validate, npm test | Hermes: H01 | Claude: C01
- RP01.P03.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Core Domain Foundation: API And Interface. | Commands: npm run validate, npm test | Hermes: H01 | Claude: C01
- RP01.P03.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Core Domain Foundation: API And Interface. | Commands: npm run validate, npm test | Hermes: H01 | Claude: C01
- RP01.P03.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Core Domain Foundation: API And Interface. | Commands: npm run validate, npm test | Hermes: H01 | Claude: C01
- RP01.P03.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Core Domain Foundation: API And Interface. | Commands: npm run validate, npm test | Hermes: H01 | Claude: C01
- RP01.P03.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Core Domain Foundation: API And Interface. | Commands: npm run validate, npm test | Hermes: H01 | Claude: C01
- RP01.P03.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Core Domain Foundation: API And Interface. | Commands: npm run validate, npm test | Hermes: H01 | Claude: C01
- RP01.P03.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Core Domain Foundation: API And Interface. | Commands: npm run validate, npm test | Hermes: H01 | Claude: C01
- RP01.P03.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Core Domain Foundation: API And Interface. | Commands: npm run validate, npm test | Hermes: H01 | Claude: C01
- RP01.P03.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Core Domain Foundation: API And Interface. | Commands: npm run validate, npm test | Hermes: H01 | Claude: C01
- RP01.P03.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Core Domain Foundation: API And Interface. | Commands: npm run validate, npm test | Hermes: H01 | Claude: C01

#### RP01.P04: UI And Operator Surface

- RP01.P04.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Core Domain Foundation: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H01 | Claude: C01
- RP01.P04.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Core Domain Foundation: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H01 | Claude: C01
- RP01.P04.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Core Domain Foundation: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H01 | Claude: C01
- RP01.P04.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Core Domain Foundation: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H01 | Claude: C01
- RP01.P04.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Core Domain Foundation: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H01 | Claude: C01
- RP01.P04.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Core Domain Foundation: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H01 | Claude: C01
- RP01.P04.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Core Domain Foundation: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H01 | Claude: C01
- RP01.P04.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Core Domain Foundation: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H01 | Claude: C01
- RP01.P04.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Core Domain Foundation: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H01 | Claude: C01
- RP01.P04.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Core Domain Foundation: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H01 | Claude: C01
- RP01.P04.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Core Domain Foundation: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H01 | Claude: C01

#### RP01.P05: Fixtures And Golden Cases

- RP01.P05.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Core Domain Foundation: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H01 | Claude: C01
- RP01.P05.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Core Domain Foundation: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H01 | Claude: C01
- RP01.P05.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Core Domain Foundation: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H01 | Claude: C01
- RP01.P05.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Core Domain Foundation: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H01 | Claude: C01
- RP01.P05.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Core Domain Foundation: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H01 | Claude: C01
- RP01.P05.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Core Domain Foundation: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H01 | Claude: C01
- RP01.P05.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Core Domain Foundation: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H01 | Claude: C01
- RP01.P05.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Core Domain Foundation: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H01 | Claude: C01 | Reqs: USR-001:test, USR-002:test, USR-003:test, USR-004:test, USR-005:test, USR-006:test, USR-007:test, USR-008:test, NARR-001:test, NARR-003:test
- RP01.P05.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Core Domain Foundation: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H01 | Claude: C01
- RP01.P05.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Core Domain Foundation: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H01 | Claude: C01
- RP01.P05.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Core Domain Foundation: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H01 | Claude: C01

#### RP01.P06: Permission Audit Integration

- RP01.P06.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Core Domain Foundation: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H01 | Claude: C01
- RP01.P06.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Core Domain Foundation: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H01 | Claude: C01
- RP01.P06.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Core Domain Foundation: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H01 | Claude: C01
- RP01.P06.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Core Domain Foundation: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H01 | Claude: C01
- RP01.P06.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Core Domain Foundation: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H01 | Claude: C01
- RP01.P06.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Core Domain Foundation: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H01 | Claude: C01
- RP01.P06.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Core Domain Foundation: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H01 | Claude: C01
- RP01.P06.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Core Domain Foundation: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H01 | Claude: C01
- RP01.P06.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Core Domain Foundation: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H01 | Claude: C01
- RP01.P06.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Core Domain Foundation: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H01 | Claude: C01
- RP01.P06.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Core Domain Foundation: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H01 | Claude: C01

#### RP01.P07: Failure Edge And Recovery

- RP01.P07.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Core Domain Foundation: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H01 | Claude: C01
- RP01.P07.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Core Domain Foundation: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H01 | Claude: C01
- RP01.P07.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Core Domain Foundation: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H01 | Claude: C01
- RP01.P07.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Core Domain Foundation: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H01 | Claude: C01
- RP01.P07.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Core Domain Foundation: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H01 | Claude: C01
- RP01.P07.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Core Domain Foundation: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H01 | Claude: C01
- RP01.P07.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Core Domain Foundation: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H01 | Claude: C01
- RP01.P07.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Core Domain Foundation: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H01 | Claude: C01
- RP01.P07.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Core Domain Foundation: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H01 | Claude: C01
- RP01.P07.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Core Domain Foundation: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H01 | Claude: C01
- RP01.P07.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Core Domain Foundation: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H01 | Claude: C01

#### RP01.P08: Hermes Validation Binding

- RP01.P08.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Core Domain Foundation: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H01 | Claude: C01
- RP01.P08.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Core Domain Foundation: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H01 | Claude: C01
- RP01.P08.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Core Domain Foundation: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H01 | Claude: C01
- RP01.P08.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Core Domain Foundation: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H01 | Claude: C01
- RP01.P08.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Core Domain Foundation: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H01 | Claude: C01
- RP01.P08.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Core Domain Foundation: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H01 | Claude: C01
- RP01.P08.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Core Domain Foundation: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H01 | Claude: C01
- RP01.P08.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Core Domain Foundation: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H01 | Claude: C01
- RP01.P08.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Core Domain Foundation: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H01 | Claude: C01 | Reqs: USR-001:hermes_evidence, USR-002:hermes_evidence, USR-003:hermes_evidence, USR-004:hermes_evidence, USR-005:hermes_evidence, USR-006:hermes_evidence, USR-007:hermes_evidence, USR-008:hermes_evidence, NARR-001:hermes_evidence, NARR-003:hermes_evidence
- RP01.P08.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Core Domain Foundation: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H01 | Claude: C01
- RP01.P08.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Core Domain Foundation: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H01 | Claude: C01

#### RP01.P09: Claude Cross Validation Closeout

- RP01.P09.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Core Domain Foundation: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H01 | Claude: C01
- RP01.P09.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Core Domain Foundation: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H01 | Claude: C01
- RP01.P09.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Core Domain Foundation: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H01 | Claude: C01
- RP01.P09.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Core Domain Foundation: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H01 | Claude: C01
- RP01.P09.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Core Domain Foundation: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H01 | Claude: C01
- RP01.P09.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Core Domain Foundation: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H01 | Claude: C01
- RP01.P09.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Core Domain Foundation: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H01 | Claude: C01
- RP01.P09.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Core Domain Foundation: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H01 | Claude: C01
- RP01.P09.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Core Domain Foundation: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H01 | Claude: C01
- RP01.P09.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Core Domain Foundation: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H01 | Claude: C01 | Reqs: USR-001:claude_review, USR-002:claude_review, USR-003:claude_review, USR-004:claude_review, USR-005:claude_review, USR-006:claude_review, USR-007:claude_review, USR-008:claude_review, NARR-001:claude_review, NARR-003:claude_review
- RP01.P09.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Core Domain Foundation: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H01 | Claude: C01


### RP02: Permission Kernel

Scope: RBAC, ABAC, ACL, Deny Rule, Security Trimming

#### RP02.P00: Contract And Acceptance Baseline

- RP02.P00.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Permission Kernel: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H02 | Claude: C02
- RP02.P00.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Permission Kernel: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H02 | Claude: C02 | Reqs: NARR-002:contract
- RP02.P00.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Permission Kernel: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H02 | Claude: C02
- RP02.P00.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Permission Kernel: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H02 | Claude: C02
- RP02.P00.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Permission Kernel: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H02 | Claude: C02
- RP02.P00.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Permission Kernel: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H02 | Claude: C02
- RP02.P00.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Permission Kernel: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H02 | Claude: C02
- RP02.P00.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Permission Kernel: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H02 | Claude: C02
- RP02.P00.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Permission Kernel: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H02 | Claude: C02
- RP02.P00.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Permission Kernel: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H02 | Claude: C02
- RP02.P00.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Permission Kernel: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H02 | Claude: C02

#### RP02.P01: Domain Model

- RP02.P01.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Permission Kernel: Domain Model. | Commands: npm run validate | Hermes: H02 | Claude: C02
- RP02.P01.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Permission Kernel: Domain Model. | Commands: npm run validate | Hermes: H02 | Claude: C02
- RP02.P01.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Permission Kernel: Domain Model. | Commands: npm run validate | Hermes: H02 | Claude: C02
- RP02.P01.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Permission Kernel: Domain Model. | Commands: npm run validate | Hermes: H02 | Claude: C02
- RP02.P01.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Permission Kernel: Domain Model. | Commands: npm run validate | Hermes: H02 | Claude: C02
- RP02.P01.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Permission Kernel: Domain Model. | Commands: npm run validate | Hermes: H02 | Claude: C02
- RP02.P01.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Permission Kernel: Domain Model. | Commands: npm run validate | Hermes: H02 | Claude: C02
- RP02.P01.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Permission Kernel: Domain Model. | Commands: npm run validate | Hermes: H02 | Claude: C02
- RP02.P01.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Permission Kernel: Domain Model. | Commands: npm run validate | Hermes: H02 | Claude: C02
- RP02.P01.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Permission Kernel: Domain Model. | Commands: npm run validate | Hermes: H02 | Claude: C02
- RP02.P01.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Permission Kernel: Domain Model. | Commands: npm run validate | Hermes: H02 | Claude: C02

#### RP02.P02: Service Logic

- RP02.P02.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Permission Kernel: Service Logic. | Commands: npm run validate, npm test | Hermes: H02 | Claude: C02
- RP02.P02.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Permission Kernel: Service Logic. | Commands: npm run validate, npm test | Hermes: H02 | Claude: C02
- RP02.P02.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Permission Kernel: Service Logic. | Commands: npm run validate, npm test | Hermes: H02 | Claude: C02
- RP02.P02.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Permission Kernel: Service Logic. | Commands: npm run validate, npm test | Hermes: H02 | Claude: C02 | Reqs: NARR-002:primary_implementation
- RP02.P02.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Permission Kernel: Service Logic. | Commands: npm run validate, npm test | Hermes: H02 | Claude: C02
- RP02.P02.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Permission Kernel: Service Logic. | Commands: npm run validate, npm test | Hermes: H02 | Claude: C02
- RP02.P02.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Permission Kernel: Service Logic. | Commands: npm run validate, npm test | Hermes: H02 | Claude: C02
- RP02.P02.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Permission Kernel: Service Logic. | Commands: npm run validate, npm test | Hermes: H02 | Claude: C02
- RP02.P02.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Permission Kernel: Service Logic. | Commands: npm run validate, npm test | Hermes: H02 | Claude: C02
- RP02.P02.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Permission Kernel: Service Logic. | Commands: npm run validate, npm test | Hermes: H02 | Claude: C02
- RP02.P02.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Permission Kernel: Service Logic. | Commands: npm run validate, npm test | Hermes: H02 | Claude: C02

#### RP02.P03: API And Interface

- RP02.P03.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Permission Kernel: API And Interface. | Commands: npm run validate, npm test | Hermes: H02 | Claude: C02
- RP02.P03.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Permission Kernel: API And Interface. | Commands: npm run validate, npm test | Hermes: H02 | Claude: C02
- RP02.P03.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Permission Kernel: API And Interface. | Commands: npm run validate, npm test | Hermes: H02 | Claude: C02
- RP02.P03.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Permission Kernel: API And Interface. | Commands: npm run validate, npm test | Hermes: H02 | Claude: C02
- RP02.P03.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Permission Kernel: API And Interface. | Commands: npm run validate, npm test | Hermes: H02 | Claude: C02
- RP02.P03.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Permission Kernel: API And Interface. | Commands: npm run validate, npm test | Hermes: H02 | Claude: C02
- RP02.P03.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Permission Kernel: API And Interface. | Commands: npm run validate, npm test | Hermes: H02 | Claude: C02
- RP02.P03.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Permission Kernel: API And Interface. | Commands: npm run validate, npm test | Hermes: H02 | Claude: C02
- RP02.P03.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Permission Kernel: API And Interface. | Commands: npm run validate, npm test | Hermes: H02 | Claude: C02
- RP02.P03.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Permission Kernel: API And Interface. | Commands: npm run validate, npm test | Hermes: H02 | Claude: C02
- RP02.P03.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Permission Kernel: API And Interface. | Commands: npm run validate, npm test | Hermes: H02 | Claude: C02

#### RP02.P04: UI And Operator Surface

- RP02.P04.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Permission Kernel: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H02 | Claude: C02
- RP02.P04.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Permission Kernel: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H02 | Claude: C02
- RP02.P04.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Permission Kernel: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H02 | Claude: C02
- RP02.P04.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Permission Kernel: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H02 | Claude: C02
- RP02.P04.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Permission Kernel: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H02 | Claude: C02
- RP02.P04.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Permission Kernel: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H02 | Claude: C02
- RP02.P04.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Permission Kernel: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H02 | Claude: C02
- RP02.P04.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Permission Kernel: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H02 | Claude: C02
- RP02.P04.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Permission Kernel: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H02 | Claude: C02
- RP02.P04.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Permission Kernel: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H02 | Claude: C02
- RP02.P04.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Permission Kernel: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H02 | Claude: C02

#### RP02.P05: Fixtures And Golden Cases

- RP02.P05.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Permission Kernel: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H02 | Claude: C02
- RP02.P05.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Permission Kernel: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H02 | Claude: C02
- RP02.P05.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Permission Kernel: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H02 | Claude: C02
- RP02.P05.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Permission Kernel: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H02 | Claude: C02
- RP02.P05.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Permission Kernel: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H02 | Claude: C02
- RP02.P05.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Permission Kernel: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H02 | Claude: C02
- RP02.P05.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Permission Kernel: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H02 | Claude: C02
- RP02.P05.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Permission Kernel: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H02 | Claude: C02 | Reqs: NARR-002:test
- RP02.P05.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Permission Kernel: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H02 | Claude: C02
- RP02.P05.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Permission Kernel: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H02 | Claude: C02
- RP02.P05.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Permission Kernel: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H02 | Claude: C02

#### RP02.P06: Permission Audit Integration

- RP02.P06.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Permission Kernel: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H02 | Claude: C02
- RP02.P06.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Permission Kernel: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H02 | Claude: C02
- RP02.P06.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Permission Kernel: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H02 | Claude: C02
- RP02.P06.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Permission Kernel: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H02 | Claude: C02
- RP02.P06.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Permission Kernel: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H02 | Claude: C02
- RP02.P06.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Permission Kernel: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H02 | Claude: C02
- RP02.P06.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Permission Kernel: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H02 | Claude: C02
- RP02.P06.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Permission Kernel: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H02 | Claude: C02
- RP02.P06.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Permission Kernel: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H02 | Claude: C02
- RP02.P06.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Permission Kernel: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H02 | Claude: C02
- RP02.P06.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Permission Kernel: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H02 | Claude: C02

#### RP02.P07: Failure Edge And Recovery

- RP02.P07.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Permission Kernel: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H02 | Claude: C02
- RP02.P07.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Permission Kernel: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H02 | Claude: C02
- RP02.P07.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Permission Kernel: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H02 | Claude: C02
- RP02.P07.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Permission Kernel: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H02 | Claude: C02
- RP02.P07.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Permission Kernel: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H02 | Claude: C02
- RP02.P07.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Permission Kernel: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H02 | Claude: C02
- RP02.P07.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Permission Kernel: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H02 | Claude: C02
- RP02.P07.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Permission Kernel: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H02 | Claude: C02
- RP02.P07.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Permission Kernel: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H02 | Claude: C02
- RP02.P07.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Permission Kernel: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H02 | Claude: C02
- RP02.P07.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Permission Kernel: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H02 | Claude: C02

#### RP02.P08: Hermes Validation Binding

- RP02.P08.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Permission Kernel: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H02 | Claude: C02
- RP02.P08.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Permission Kernel: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H02 | Claude: C02
- RP02.P08.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Permission Kernel: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H02 | Claude: C02
- RP02.P08.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Permission Kernel: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H02 | Claude: C02
- RP02.P08.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Permission Kernel: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H02 | Claude: C02
- RP02.P08.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Permission Kernel: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H02 | Claude: C02
- RP02.P08.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Permission Kernel: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H02 | Claude: C02
- RP02.P08.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Permission Kernel: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H02 | Claude: C02
- RP02.P08.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Permission Kernel: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H02 | Claude: C02 | Reqs: NARR-002:hermes_evidence
- RP02.P08.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Permission Kernel: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H02 | Claude: C02
- RP02.P08.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Permission Kernel: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H02 | Claude: C02

#### RP02.P09: Claude Cross Validation Closeout

- RP02.P09.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Permission Kernel: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H02 | Claude: C02
- RP02.P09.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Permission Kernel: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H02 | Claude: C02
- RP02.P09.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Permission Kernel: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H02 | Claude: C02
- RP02.P09.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Permission Kernel: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H02 | Claude: C02
- RP02.P09.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Permission Kernel: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H02 | Claude: C02
- RP02.P09.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Permission Kernel: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H02 | Claude: C02
- RP02.P09.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Permission Kernel: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H02 | Claude: C02
- RP02.P09.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Permission Kernel: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H02 | Claude: C02
- RP02.P09.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Permission Kernel: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H02 | Claude: C02
- RP02.P09.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Permission Kernel: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H02 | Claude: C02 | Reqs: NARR-002:claude_review
- RP02.P09.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Permission Kernel: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H02 | Claude: C02


### RP03: Audit And Compliance Kernel

Scope: append-only audit, tamper-evident hash chain, WORM retention, legal hold, trace correlation, privacy-safe evidence, admin access review, compliance export

#### RP03.P00: Contract And Acceptance Baseline

- RP03.P00.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Audit And Compliance Kernel: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H03 | Claude: C03
- RP03.P00.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Audit And Compliance Kernel: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H03 | Claude: C03 | Reqs: AUD-001:contract, AUD-002:contract, AUD-003:contract, AUD-004:contract, AUD-005:contract, AUD-006:contract, AUD-007:contract, AUD-008:contract, NARR-009:contract
- RP03.P00.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Audit And Compliance Kernel: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H03 | Claude: C03
- RP03.P00.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Audit And Compliance Kernel: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H03 | Claude: C03
- RP03.P00.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Audit And Compliance Kernel: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H03 | Claude: C03
- RP03.P00.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Audit And Compliance Kernel: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H03 | Claude: C03
- RP03.P00.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Audit And Compliance Kernel: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H03 | Claude: C03
- RP03.P00.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Audit And Compliance Kernel: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H03 | Claude: C03
- RP03.P00.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Audit And Compliance Kernel: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H03 | Claude: C03
- RP03.P00.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Audit And Compliance Kernel: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H03 | Claude: C03
- RP03.P00.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Audit And Compliance Kernel: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H03 | Claude: C03

#### RP03.P01: Domain Model

- RP03.P01.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Audit And Compliance Kernel: Domain Model. | Commands: npm run validate | Hermes: H03 | Claude: C03
- RP03.P01.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Audit And Compliance Kernel: Domain Model. | Commands: npm run validate | Hermes: H03 | Claude: C03
- RP03.P01.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Audit And Compliance Kernel: Domain Model. | Commands: npm run validate | Hermes: H03 | Claude: C03
- RP03.P01.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Audit And Compliance Kernel: Domain Model. | Commands: npm run validate | Hermes: H03 | Claude: C03
- RP03.P01.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Audit And Compliance Kernel: Domain Model. | Commands: npm run validate | Hermes: H03 | Claude: C03
- RP03.P01.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Audit And Compliance Kernel: Domain Model. | Commands: npm run validate | Hermes: H03 | Claude: C03
- RP03.P01.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Audit And Compliance Kernel: Domain Model. | Commands: npm run validate | Hermes: H03 | Claude: C03
- RP03.P01.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Audit And Compliance Kernel: Domain Model. | Commands: npm run validate | Hermes: H03 | Claude: C03
- RP03.P01.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Audit And Compliance Kernel: Domain Model. | Commands: npm run validate | Hermes: H03 | Claude: C03
- RP03.P01.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Audit And Compliance Kernel: Domain Model. | Commands: npm run validate | Hermes: H03 | Claude: C03
- RP03.P01.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Audit And Compliance Kernel: Domain Model. | Commands: npm run validate | Hermes: H03 | Claude: C03

#### RP03.P02: Service Logic

- RP03.P02.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Audit And Compliance Kernel: Service Logic. | Commands: npm run validate, npm test | Hermes: H03 | Claude: C03
- RP03.P02.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Audit And Compliance Kernel: Service Logic. | Commands: npm run validate, npm test | Hermes: H03 | Claude: C03
- RP03.P02.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Audit And Compliance Kernel: Service Logic. | Commands: npm run validate, npm test | Hermes: H03 | Claude: C03
- RP03.P02.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Audit And Compliance Kernel: Service Logic. | Commands: npm run validate, npm test | Hermes: H03 | Claude: C03 | Reqs: AUD-001:primary_implementation, AUD-002:primary_implementation, AUD-003:primary_implementation, AUD-004:primary_implementation, AUD-005:primary_implementation, AUD-006:primary_implementation, AUD-007:primary_implementation, AUD-008:primary_implementation
- RP03.P02.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Audit And Compliance Kernel: Service Logic. | Commands: npm run validate, npm test | Hermes: H03 | Claude: C03
- RP03.P02.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Audit And Compliance Kernel: Service Logic. | Commands: npm run validate, npm test | Hermes: H03 | Claude: C03
- RP03.P02.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Audit And Compliance Kernel: Service Logic. | Commands: npm run validate, npm test | Hermes: H03 | Claude: C03
- RP03.P02.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Audit And Compliance Kernel: Service Logic. | Commands: npm run validate, npm test | Hermes: H03 | Claude: C03
- RP03.P02.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Audit And Compliance Kernel: Service Logic. | Commands: npm run validate, npm test | Hermes: H03 | Claude: C03
- RP03.P02.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Audit And Compliance Kernel: Service Logic. | Commands: npm run validate, npm test | Hermes: H03 | Claude: C03
- RP03.P02.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Audit And Compliance Kernel: Service Logic. | Commands: npm run validate, npm test | Hermes: H03 | Claude: C03

#### RP03.P03: API And Interface

- RP03.P03.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Audit And Compliance Kernel: API And Interface. | Commands: npm run validate, npm test | Hermes: H03 | Claude: C03
- RP03.P03.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Audit And Compliance Kernel: API And Interface. | Commands: npm run validate, npm test | Hermes: H03 | Claude: C03
- RP03.P03.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Audit And Compliance Kernel: API And Interface. | Commands: npm run validate, npm test | Hermes: H03 | Claude: C03
- RP03.P03.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Audit And Compliance Kernel: API And Interface. | Commands: npm run validate, npm test | Hermes: H03 | Claude: C03
- RP03.P03.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Audit And Compliance Kernel: API And Interface. | Commands: npm run validate, npm test | Hermes: H03 | Claude: C03
- RP03.P03.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Audit And Compliance Kernel: API And Interface. | Commands: npm run validate, npm test | Hermes: H03 | Claude: C03
- RP03.P03.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Audit And Compliance Kernel: API And Interface. | Commands: npm run validate, npm test | Hermes: H03 | Claude: C03
- RP03.P03.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Audit And Compliance Kernel: API And Interface. | Commands: npm run validate, npm test | Hermes: H03 | Claude: C03
- RP03.P03.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Audit And Compliance Kernel: API And Interface. | Commands: npm run validate, npm test | Hermes: H03 | Claude: C03
- RP03.P03.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Audit And Compliance Kernel: API And Interface. | Commands: npm run validate, npm test | Hermes: H03 | Claude: C03
- RP03.P03.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Audit And Compliance Kernel: API And Interface. | Commands: npm run validate, npm test | Hermes: H03 | Claude: C03

#### RP03.P04: UI And Operator Surface

- RP03.P04.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Audit And Compliance Kernel: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H03 | Claude: C03
- RP03.P04.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Audit And Compliance Kernel: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H03 | Claude: C03
- RP03.P04.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Audit And Compliance Kernel: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H03 | Claude: C03
- RP03.P04.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Audit And Compliance Kernel: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H03 | Claude: C03
- RP03.P04.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Audit And Compliance Kernel: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H03 | Claude: C03
- RP03.P04.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Audit And Compliance Kernel: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H03 | Claude: C03
- RP03.P04.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Audit And Compliance Kernel: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H03 | Claude: C03
- RP03.P04.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Audit And Compliance Kernel: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H03 | Claude: C03
- RP03.P04.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Audit And Compliance Kernel: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H03 | Claude: C03
- RP03.P04.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Audit And Compliance Kernel: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H03 | Claude: C03
- RP03.P04.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Audit And Compliance Kernel: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H03 | Claude: C03

#### RP03.P05: Fixtures And Golden Cases

- RP03.P05.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Audit And Compliance Kernel: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H03 | Claude: C03
- RP03.P05.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Audit And Compliance Kernel: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H03 | Claude: C03
- RP03.P05.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Audit And Compliance Kernel: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H03 | Claude: C03
- RP03.P05.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Audit And Compliance Kernel: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H03 | Claude: C03
- RP03.P05.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Audit And Compliance Kernel: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H03 | Claude: C03
- RP03.P05.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Audit And Compliance Kernel: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H03 | Claude: C03
- RP03.P05.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Audit And Compliance Kernel: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H03 | Claude: C03
- RP03.P05.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Audit And Compliance Kernel: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H03 | Claude: C03 | Reqs: AUD-001:test, AUD-002:test, AUD-003:test, AUD-004:test, AUD-005:test, AUD-006:test, AUD-007:test, AUD-008:test, NARR-009:test
- RP03.P05.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Audit And Compliance Kernel: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H03 | Claude: C03
- RP03.P05.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Audit And Compliance Kernel: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H03 | Claude: C03
- RP03.P05.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Audit And Compliance Kernel: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H03 | Claude: C03

#### RP03.P06: Permission Audit Integration

- RP03.P06.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Audit And Compliance Kernel: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H03 | Claude: C03
- RP03.P06.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Audit And Compliance Kernel: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H03 | Claude: C03
- RP03.P06.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Audit And Compliance Kernel: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H03 | Claude: C03
- RP03.P06.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Audit And Compliance Kernel: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H03 | Claude: C03
- RP03.P06.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Audit And Compliance Kernel: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H03 | Claude: C03
- RP03.P06.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Audit And Compliance Kernel: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H03 | Claude: C03 | Reqs: NARR-009:primary_implementation
- RP03.P06.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Audit And Compliance Kernel: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H03 | Claude: C03
- RP03.P06.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Audit And Compliance Kernel: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H03 | Claude: C03
- RP03.P06.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Audit And Compliance Kernel: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H03 | Claude: C03
- RP03.P06.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Audit And Compliance Kernel: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H03 | Claude: C03
- RP03.P06.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Audit And Compliance Kernel: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H03 | Claude: C03

#### RP03.P07: Failure Edge And Recovery

- RP03.P07.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Audit And Compliance Kernel: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H03 | Claude: C03
- RP03.P07.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Audit And Compliance Kernel: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H03 | Claude: C03
- RP03.P07.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Audit And Compliance Kernel: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H03 | Claude: C03
- RP03.P07.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Audit And Compliance Kernel: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H03 | Claude: C03
- RP03.P07.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Audit And Compliance Kernel: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H03 | Claude: C03
- RP03.P07.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Audit And Compliance Kernel: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H03 | Claude: C03
- RP03.P07.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Audit And Compliance Kernel: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H03 | Claude: C03
- RP03.P07.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Audit And Compliance Kernel: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H03 | Claude: C03
- RP03.P07.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Audit And Compliance Kernel: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H03 | Claude: C03
- RP03.P07.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Audit And Compliance Kernel: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H03 | Claude: C03
- RP03.P07.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Audit And Compliance Kernel: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H03 | Claude: C03

#### RP03.P08: Hermes Validation Binding

- RP03.P08.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Audit And Compliance Kernel: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H03 | Claude: C03
- RP03.P08.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Audit And Compliance Kernel: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H03 | Claude: C03
- RP03.P08.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Audit And Compliance Kernel: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H03 | Claude: C03
- RP03.P08.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Audit And Compliance Kernel: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H03 | Claude: C03
- RP03.P08.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Audit And Compliance Kernel: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H03 | Claude: C03
- RP03.P08.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Audit And Compliance Kernel: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H03 | Claude: C03
- RP03.P08.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Audit And Compliance Kernel: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H03 | Claude: C03
- RP03.P08.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Audit And Compliance Kernel: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H03 | Claude: C03
- RP03.P08.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Audit And Compliance Kernel: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H03 | Claude: C03 | Reqs: AUD-001:hermes_evidence, AUD-002:hermes_evidence, AUD-003:hermes_evidence, AUD-004:hermes_evidence, AUD-005:hermes_evidence, AUD-006:hermes_evidence, AUD-007:hermes_evidence, AUD-008:hermes_evidence, NARR-009:hermes_evidence
- RP03.P08.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Audit And Compliance Kernel: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H03 | Claude: C03
- RP03.P08.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Audit And Compliance Kernel: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H03 | Claude: C03

#### RP03.P09: Claude Cross Validation Closeout

- RP03.P09.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Audit And Compliance Kernel: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H03 | Claude: C03
- RP03.P09.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Audit And Compliance Kernel: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H03 | Claude: C03
- RP03.P09.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Audit And Compliance Kernel: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H03 | Claude: C03
- RP03.P09.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Audit And Compliance Kernel: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H03 | Claude: C03
- RP03.P09.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Audit And Compliance Kernel: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H03 | Claude: C03
- RP03.P09.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Audit And Compliance Kernel: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H03 | Claude: C03
- RP03.P09.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Audit And Compliance Kernel: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H03 | Claude: C03
- RP03.P09.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Audit And Compliance Kernel: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H03 | Claude: C03
- RP03.P09.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Audit And Compliance Kernel: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H03 | Claude: C03
- RP03.P09.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Audit And Compliance Kernel: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H03 | Claude: C03 | Reqs: AUD-001:claude_review, AUD-002:claude_review, AUD-003:claude_review, AUD-004:claude_review, AUD-005:claude_review, AUD-006:claude_review, AUD-007:claude_review, AUD-008:claude_review, NARR-009:claude_review
- RP03.P09.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Audit And Compliance Kernel: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H03 | Claude: C03


### RP04: Master Data

Scope: Entity, Person, Organization, Relationship, Client Group

#### RP04.P00: Contract And Acceptance Baseline

- RP04.P00.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Master Data: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H04 | Claude: C04
- RP04.P00.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Master Data: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H04 | Claude: C04 | Reqs: ENT-001:contract, ENT-002:contract, ENT-003:contract, ENT-004:contract, ENT-005:contract, ENT-006:contract, CLI-001:contract, CLI-002:contract, CLI-003:contract, CLI-004:contract, CLI-005:contract, CLI-006:contract, CLI-007:contract, CLI-008:contract, CON-001:contract, CON-002:contract, CON-003:contract, CON-004:contract, CON-005:contract, CON-006:contract, CON-007:contract, NARR-008:contract
- RP04.P00.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Master Data: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H04 | Claude: C04
- RP04.P00.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Master Data: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H04 | Claude: C04
- RP04.P00.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Master Data: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H04 | Claude: C04
- RP04.P00.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Master Data: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H04 | Claude: C04
- RP04.P00.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Master Data: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H04 | Claude: C04
- RP04.P00.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Master Data: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H04 | Claude: C04
- RP04.P00.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Master Data: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H04 | Claude: C04
- RP04.P00.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Master Data: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H04 | Claude: C04
- RP04.P00.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Master Data: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H04 | Claude: C04

#### RP04.P01: Domain Model

- RP04.P01.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Master Data: Domain Model. | Commands: npm run validate | Hermes: H04 | Claude: C04
- RP04.P01.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Master Data: Domain Model. | Commands: npm run validate | Hermes: H04 | Claude: C04
- RP04.P01.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Master Data: Domain Model. | Commands: npm run validate | Hermes: H04 | Claude: C04
- RP04.P01.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Master Data: Domain Model. | Commands: npm run validate | Hermes: H04 | Claude: C04
- RP04.P01.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Master Data: Domain Model. | Commands: npm run validate | Hermes: H04 | Claude: C04
- RP04.P01.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Master Data: Domain Model. | Commands: npm run validate | Hermes: H04 | Claude: C04
- RP04.P01.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Master Data: Domain Model. | Commands: npm run validate | Hermes: H04 | Claude: C04
- RP04.P01.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Master Data: Domain Model. | Commands: npm run validate | Hermes: H04 | Claude: C04
- RP04.P01.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Master Data: Domain Model. | Commands: npm run validate | Hermes: H04 | Claude: C04
- RP04.P01.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Master Data: Domain Model. | Commands: npm run validate | Hermes: H04 | Claude: C04
- RP04.P01.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Master Data: Domain Model. | Commands: npm run validate | Hermes: H04 | Claude: C04

#### RP04.P02: Service Logic

- RP04.P02.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Master Data: Service Logic. | Commands: npm run validate, npm test | Hermes: H04 | Claude: C04
- RP04.P02.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Master Data: Service Logic. | Commands: npm run validate, npm test | Hermes: H04 | Claude: C04
- RP04.P02.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Master Data: Service Logic. | Commands: npm run validate, npm test | Hermes: H04 | Claude: C04
- RP04.P02.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Master Data: Service Logic. | Commands: npm run validate, npm test | Hermes: H04 | Claude: C04 | Reqs: ENT-001:primary_implementation, ENT-002:primary_implementation, ENT-003:primary_implementation, ENT-004:primary_implementation, ENT-005:primary_implementation, ENT-006:primary_implementation, CLI-001:primary_implementation, CLI-002:primary_implementation, CLI-003:primary_implementation, CLI-004:primary_implementation, CLI-005:primary_implementation, CLI-006:primary_implementation, CLI-007:primary_implementation, CLI-008:primary_implementation, CON-001:primary_implementation, CON-002:primary_implementation, CON-003:primary_implementation, CON-004:primary_implementation, CON-005:primary_implementation, CON-006:primary_implementation, CON-007:primary_implementation
- RP04.P02.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Master Data: Service Logic. | Commands: npm run validate, npm test | Hermes: H04 | Claude: C04
- RP04.P02.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Master Data: Service Logic. | Commands: npm run validate, npm test | Hermes: H04 | Claude: C04
- RP04.P02.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Master Data: Service Logic. | Commands: npm run validate, npm test | Hermes: H04 | Claude: C04
- RP04.P02.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Master Data: Service Logic. | Commands: npm run validate, npm test | Hermes: H04 | Claude: C04
- RP04.P02.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Master Data: Service Logic. | Commands: npm run validate, npm test | Hermes: H04 | Claude: C04
- RP04.P02.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Master Data: Service Logic. | Commands: npm run validate, npm test | Hermes: H04 | Claude: C04
- RP04.P02.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Master Data: Service Logic. | Commands: npm run validate, npm test | Hermes: H04 | Claude: C04

#### RP04.P03: API And Interface

- RP04.P03.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Master Data: API And Interface. | Commands: npm run validate, npm test | Hermes: H04 | Claude: C04
- RP04.P03.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Master Data: API And Interface. | Commands: npm run validate, npm test | Hermes: H04 | Claude: C04
- RP04.P03.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Master Data: API And Interface. | Commands: npm run validate, npm test | Hermes: H04 | Claude: C04
- RP04.P03.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Master Data: API And Interface. | Commands: npm run validate, npm test | Hermes: H04 | Claude: C04
- RP04.P03.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Master Data: API And Interface. | Commands: npm run validate, npm test | Hermes: H04 | Claude: C04
- RP04.P03.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Master Data: API And Interface. | Commands: npm run validate, npm test | Hermes: H04 | Claude: C04
- RP04.P03.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Master Data: API And Interface. | Commands: npm run validate, npm test | Hermes: H04 | Claude: C04
- RP04.P03.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Master Data: API And Interface. | Commands: npm run validate, npm test | Hermes: H04 | Claude: C04
- RP04.P03.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Master Data: API And Interface. | Commands: npm run validate, npm test | Hermes: H04 | Claude: C04
- RP04.P03.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Master Data: API And Interface. | Commands: npm run validate, npm test | Hermes: H04 | Claude: C04
- RP04.P03.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Master Data: API And Interface. | Commands: npm run validate, npm test | Hermes: H04 | Claude: C04

#### RP04.P04: UI And Operator Surface

- RP04.P04.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Master Data: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H04 | Claude: C04
- RP04.P04.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Master Data: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H04 | Claude: C04
- RP04.P04.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Master Data: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H04 | Claude: C04
- RP04.P04.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Master Data: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H04 | Claude: C04
- RP04.P04.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Master Data: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H04 | Claude: C04
- RP04.P04.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Master Data: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H04 | Claude: C04
- RP04.P04.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Master Data: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H04 | Claude: C04
- RP04.P04.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Master Data: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H04 | Claude: C04
- RP04.P04.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Master Data: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H04 | Claude: C04
- RP04.P04.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Master Data: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H04 | Claude: C04
- RP04.P04.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Master Data: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H04 | Claude: C04

#### RP04.P05: Fixtures And Golden Cases

- RP04.P05.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Master Data: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H04 | Claude: C04
- RP04.P05.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Master Data: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H04 | Claude: C04
- RP04.P05.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Master Data: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H04 | Claude: C04
- RP04.P05.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Master Data: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H04 | Claude: C04
- RP04.P05.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Master Data: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H04 | Claude: C04
- RP04.P05.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Master Data: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H04 | Claude: C04
- RP04.P05.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Master Data: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H04 | Claude: C04
- RP04.P05.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Master Data: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H04 | Claude: C04 | Reqs: ENT-001:test, ENT-002:test, ENT-003:test, ENT-004:test, ENT-005:test, ENT-006:test, CLI-001:test, CLI-002:test, CLI-003:test, CLI-004:test, CLI-005:test, CLI-006:test, CLI-007:test, CLI-008:test, CON-001:test, CON-002:test, CON-003:test, CON-004:test, CON-005:test, CON-006:test, CON-007:test, NARR-008:test
- RP04.P05.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Master Data: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H04 | Claude: C04
- RP04.P05.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Master Data: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H04 | Claude: C04
- RP04.P05.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Master Data: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H04 | Claude: C04

#### RP04.P06: Permission Audit Integration

- RP04.P06.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Master Data: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H04 | Claude: C04
- RP04.P06.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Master Data: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H04 | Claude: C04
- RP04.P06.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Master Data: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H04 | Claude: C04
- RP04.P06.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Master Data: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H04 | Claude: C04
- RP04.P06.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Master Data: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H04 | Claude: C04
- RP04.P06.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Master Data: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H04 | Claude: C04 | Reqs: NARR-008:primary_implementation
- RP04.P06.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Master Data: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H04 | Claude: C04
- RP04.P06.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Master Data: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H04 | Claude: C04
- RP04.P06.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Master Data: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H04 | Claude: C04
- RP04.P06.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Master Data: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H04 | Claude: C04
- RP04.P06.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Master Data: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H04 | Claude: C04

#### RP04.P07: Failure Edge And Recovery

- RP04.P07.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Master Data: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H04 | Claude: C04
- RP04.P07.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Master Data: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H04 | Claude: C04
- RP04.P07.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Master Data: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H04 | Claude: C04
- RP04.P07.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Master Data: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H04 | Claude: C04
- RP04.P07.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Master Data: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H04 | Claude: C04
- RP04.P07.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Master Data: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H04 | Claude: C04
- RP04.P07.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Master Data: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H04 | Claude: C04
- RP04.P07.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Master Data: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H04 | Claude: C04
- RP04.P07.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Master Data: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H04 | Claude: C04
- RP04.P07.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Master Data: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H04 | Claude: C04
- RP04.P07.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Master Data: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H04 | Claude: C04

#### RP04.P08: Hermes Validation Binding

- RP04.P08.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Master Data: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H04 | Claude: C04
- RP04.P08.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Master Data: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H04 | Claude: C04
- RP04.P08.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Master Data: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H04 | Claude: C04
- RP04.P08.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Master Data: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H04 | Claude: C04
- RP04.P08.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Master Data: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H04 | Claude: C04
- RP04.P08.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Master Data: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H04 | Claude: C04
- RP04.P08.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Master Data: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H04 | Claude: C04
- RP04.P08.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Master Data: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H04 | Claude: C04
- RP04.P08.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Master Data: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H04 | Claude: C04 | Reqs: ENT-001:hermes_evidence, ENT-002:hermes_evidence, ENT-003:hermes_evidence, ENT-004:hermes_evidence, ENT-005:hermes_evidence, ENT-006:hermes_evidence, CLI-001:hermes_evidence, CLI-002:hermes_evidence, CLI-003:hermes_evidence, CLI-004:hermes_evidence, CLI-005:hermes_evidence, CLI-006:hermes_evidence, CLI-007:hermes_evidence, CLI-008:hermes_evidence, CON-001:hermes_evidence, CON-002:hermes_evidence, CON-003:hermes_evidence, CON-004:hermes_evidence, CON-005:hermes_evidence, CON-006:hermes_evidence, CON-007:hermes_evidence, NARR-008:hermes_evidence
- RP04.P08.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Master Data: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H04 | Claude: C04
- RP04.P08.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Master Data: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H04 | Claude: C04

#### RP04.P09: Claude Cross Validation Closeout

- RP04.P09.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Master Data: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H04 | Claude: C04
- RP04.P09.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Master Data: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H04 | Claude: C04
- RP04.P09.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Master Data: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H04 | Claude: C04
- RP04.P09.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Master Data: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H04 | Claude: C04
- RP04.P09.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Master Data: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H04 | Claude: C04
- RP04.P09.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Master Data: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H04 | Claude: C04
- RP04.P09.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Master Data: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H04 | Claude: C04
- RP04.P09.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Master Data: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H04 | Claude: C04
- RP04.P09.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Master Data: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H04 | Claude: C04
- RP04.P09.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Master Data: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H04 | Claude: C04 | Reqs: ENT-001:claude_review, ENT-002:claude_review, ENT-003:claude_review, ENT-004:claude_review, ENT-005:claude_review, ENT-006:claude_review, CLI-001:claude_review, CLI-002:claude_review, CLI-003:claude_review, CLI-004:claude_review, CLI-005:claude_review, CLI-006:claude_review, CLI-007:claude_review, CLI-008:claude_review, CON-001:claude_review, CON-002:claude_review, CON-003:claude_review, CON-004:claude_review, CON-005:claude_review, CON-006:claude_review, CON-007:claude_review, NARR-008:claude_review
- RP04.P09.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Master Data: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H04 | Claude: C04


### RP05: Matter Core

Scope: Matter lifecycle, team, task, calendar, checklist, closing

#### RP05.P00: Contract And Acceptance Baseline

- RP05.P00.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Matter Core: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H05 | Claude: C05
- RP05.P00.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Matter Core: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H05 | Claude: C05 | Reqs: MAT-001:contract, MAT-002:contract, MAT-003:contract, MAT-004:contract, MAT-005:contract, MAT-006:contract, MAT-007:contract, MAT-008:contract, MAT-009:contract, MAT-010:contract, NARR-005:contract
- RP05.P00.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Matter Core: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H05 | Claude: C05
- RP05.P00.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Matter Core: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H05 | Claude: C05
- RP05.P00.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Matter Core: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H05 | Claude: C05
- RP05.P00.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Matter Core: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H05 | Claude: C05
- RP05.P00.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Matter Core: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H05 | Claude: C05
- RP05.P00.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Matter Core: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H05 | Claude: C05
- RP05.P00.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Matter Core: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H05 | Claude: C05
- RP05.P00.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Matter Core: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H05 | Claude: C05
- RP05.P00.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Matter Core: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H05 | Claude: C05

#### RP05.P01: Domain Model

- RP05.P01.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Matter Core: Domain Model. | Commands: npm run validate | Hermes: H05 | Claude: C05
- RP05.P01.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Matter Core: Domain Model. | Commands: npm run validate | Hermes: H05 | Claude: C05
- RP05.P01.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Matter Core: Domain Model. | Commands: npm run validate | Hermes: H05 | Claude: C05
- RP05.P01.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Matter Core: Domain Model. | Commands: npm run validate | Hermes: H05 | Claude: C05
- RP05.P01.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Matter Core: Domain Model. | Commands: npm run validate | Hermes: H05 | Claude: C05
- RP05.P01.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Matter Core: Domain Model. | Commands: npm run validate | Hermes: H05 | Claude: C05
- RP05.P01.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Matter Core: Domain Model. | Commands: npm run validate | Hermes: H05 | Claude: C05
- RP05.P01.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Matter Core: Domain Model. | Commands: npm run validate | Hermes: H05 | Claude: C05
- RP05.P01.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Matter Core: Domain Model. | Commands: npm run validate | Hermes: H05 | Claude: C05
- RP05.P01.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Matter Core: Domain Model. | Commands: npm run validate | Hermes: H05 | Claude: C05
- RP05.P01.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Matter Core: Domain Model. | Commands: npm run validate | Hermes: H05 | Claude: C05

#### RP05.P02: Service Logic

- RP05.P02.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Matter Core: Service Logic. | Commands: npm run validate, npm test | Hermes: H05 | Claude: C05
- RP05.P02.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Matter Core: Service Logic. | Commands: npm run validate, npm test | Hermes: H05 | Claude: C05
- RP05.P02.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Matter Core: Service Logic. | Commands: npm run validate, npm test | Hermes: H05 | Claude: C05
- RP05.P02.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Matter Core: Service Logic. | Commands: npm run validate, npm test | Hermes: H05 | Claude: C05 | Reqs: MAT-001:primary_implementation, MAT-002:primary_implementation, MAT-003:primary_implementation, MAT-004:primary_implementation, MAT-005:primary_implementation, MAT-006:primary_implementation, MAT-007:primary_implementation, MAT-008:primary_implementation, MAT-009:primary_implementation, MAT-010:primary_implementation, NARR-005:primary_implementation
- RP05.P02.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Matter Core: Service Logic. | Commands: npm run validate, npm test | Hermes: H05 | Claude: C05
- RP05.P02.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Matter Core: Service Logic. | Commands: npm run validate, npm test | Hermes: H05 | Claude: C05
- RP05.P02.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Matter Core: Service Logic. | Commands: npm run validate, npm test | Hermes: H05 | Claude: C05
- RP05.P02.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Matter Core: Service Logic. | Commands: npm run validate, npm test | Hermes: H05 | Claude: C05
- RP05.P02.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Matter Core: Service Logic. | Commands: npm run validate, npm test | Hermes: H05 | Claude: C05
- RP05.P02.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Matter Core: Service Logic. | Commands: npm run validate, npm test | Hermes: H05 | Claude: C05
- RP05.P02.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Matter Core: Service Logic. | Commands: npm run validate, npm test | Hermes: H05 | Claude: C05

#### RP05.P03: API And Interface

- RP05.P03.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Matter Core: API And Interface. | Commands: npm run validate, npm test | Hermes: H05 | Claude: C05
- RP05.P03.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Matter Core: API And Interface. | Commands: npm run validate, npm test | Hermes: H05 | Claude: C05
- RP05.P03.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Matter Core: API And Interface. | Commands: npm run validate, npm test | Hermes: H05 | Claude: C05
- RP05.P03.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Matter Core: API And Interface. | Commands: npm run validate, npm test | Hermes: H05 | Claude: C05
- RP05.P03.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Matter Core: API And Interface. | Commands: npm run validate, npm test | Hermes: H05 | Claude: C05
- RP05.P03.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Matter Core: API And Interface. | Commands: npm run validate, npm test | Hermes: H05 | Claude: C05
- RP05.P03.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Matter Core: API And Interface. | Commands: npm run validate, npm test | Hermes: H05 | Claude: C05
- RP05.P03.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Matter Core: API And Interface. | Commands: npm run validate, npm test | Hermes: H05 | Claude: C05
- RP05.P03.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Matter Core: API And Interface. | Commands: npm run validate, npm test | Hermes: H05 | Claude: C05
- RP05.P03.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Matter Core: API And Interface. | Commands: npm run validate, npm test | Hermes: H05 | Claude: C05
- RP05.P03.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Matter Core: API And Interface. | Commands: npm run validate, npm test | Hermes: H05 | Claude: C05

#### RP05.P04: UI And Operator Surface

- RP05.P04.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Matter Core: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H05 | Claude: C05
- RP05.P04.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Matter Core: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H05 | Claude: C05
- RP05.P04.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Matter Core: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H05 | Claude: C05
- RP05.P04.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Matter Core: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H05 | Claude: C05
- RP05.P04.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Matter Core: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H05 | Claude: C05
- RP05.P04.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Matter Core: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H05 | Claude: C05
- RP05.P04.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Matter Core: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H05 | Claude: C05
- RP05.P04.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Matter Core: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H05 | Claude: C05
- RP05.P04.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Matter Core: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H05 | Claude: C05
- RP05.P04.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Matter Core: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H05 | Claude: C05
- RP05.P04.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Matter Core: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H05 | Claude: C05

#### RP05.P05: Fixtures And Golden Cases

- RP05.P05.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Matter Core: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H05 | Claude: C05
- RP05.P05.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Matter Core: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H05 | Claude: C05
- RP05.P05.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Matter Core: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H05 | Claude: C05
- RP05.P05.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Matter Core: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H05 | Claude: C05
- RP05.P05.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Matter Core: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H05 | Claude: C05
- RP05.P05.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Matter Core: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H05 | Claude: C05
- RP05.P05.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Matter Core: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H05 | Claude: C05
- RP05.P05.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Matter Core: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H05 | Claude: C05 | Reqs: MAT-001:test, MAT-002:test, MAT-003:test, MAT-004:test, MAT-005:test, MAT-006:test, MAT-007:test, MAT-008:test, MAT-009:test, MAT-010:test, NARR-005:test
- RP05.P05.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Matter Core: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H05 | Claude: C05
- RP05.P05.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Matter Core: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H05 | Claude: C05
- RP05.P05.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Matter Core: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H05 | Claude: C05

#### RP05.P06: Permission Audit Integration

- RP05.P06.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Matter Core: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H05 | Claude: C05
- RP05.P06.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Matter Core: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H05 | Claude: C05
- RP05.P06.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Matter Core: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H05 | Claude: C05
- RP05.P06.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Matter Core: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H05 | Claude: C05
- RP05.P06.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Matter Core: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H05 | Claude: C05
- RP05.P06.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Matter Core: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H05 | Claude: C05
- RP05.P06.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Matter Core: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H05 | Claude: C05
- RP05.P06.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Matter Core: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H05 | Claude: C05
- RP05.P06.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Matter Core: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H05 | Claude: C05
- RP05.P06.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Matter Core: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H05 | Claude: C05
- RP05.P06.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Matter Core: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H05 | Claude: C05

#### RP05.P07: Failure Edge And Recovery

- RP05.P07.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Matter Core: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H05 | Claude: C05
- RP05.P07.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Matter Core: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H05 | Claude: C05
- RP05.P07.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Matter Core: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H05 | Claude: C05
- RP05.P07.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Matter Core: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H05 | Claude: C05
- RP05.P07.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Matter Core: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H05 | Claude: C05
- RP05.P07.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Matter Core: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H05 | Claude: C05
- RP05.P07.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Matter Core: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H05 | Claude: C05
- RP05.P07.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Matter Core: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H05 | Claude: C05
- RP05.P07.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Matter Core: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H05 | Claude: C05
- RP05.P07.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Matter Core: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H05 | Claude: C05
- RP05.P07.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Matter Core: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H05 | Claude: C05

#### RP05.P08: Hermes Validation Binding

- RP05.P08.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Matter Core: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H05 | Claude: C05
- RP05.P08.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Matter Core: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H05 | Claude: C05
- RP05.P08.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Matter Core: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H05 | Claude: C05
- RP05.P08.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Matter Core: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H05 | Claude: C05
- RP05.P08.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Matter Core: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H05 | Claude: C05
- RP05.P08.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Matter Core: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H05 | Claude: C05
- RP05.P08.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Matter Core: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H05 | Claude: C05
- RP05.P08.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Matter Core: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H05 | Claude: C05
- RP05.P08.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Matter Core: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H05 | Claude: C05 | Reqs: MAT-001:hermes_evidence, MAT-002:hermes_evidence, MAT-003:hermes_evidence, MAT-004:hermes_evidence, MAT-005:hermes_evidence, MAT-006:hermes_evidence, MAT-007:hermes_evidence, MAT-008:hermes_evidence, MAT-009:hermes_evidence, MAT-010:hermes_evidence, NARR-005:hermes_evidence
- RP05.P08.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Matter Core: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H05 | Claude: C05
- RP05.P08.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Matter Core: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H05 | Claude: C05

#### RP05.P09: Claude Cross Validation Closeout

- RP05.P09.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Matter Core: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H05 | Claude: C05
- RP05.P09.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Matter Core: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H05 | Claude: C05
- RP05.P09.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Matter Core: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H05 | Claude: C05
- RP05.P09.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Matter Core: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H05 | Claude: C05
- RP05.P09.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Matter Core: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H05 | Claude: C05
- RP05.P09.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Matter Core: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H05 | Claude: C05
- RP05.P09.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Matter Core: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H05 | Claude: C05
- RP05.P09.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Matter Core: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H05 | Claude: C05
- RP05.P09.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Matter Core: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H05 | Claude: C05
- RP05.P09.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Matter Core: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H05 | Claude: C05 | Reqs: MAT-001:claude_review, MAT-002:claude_review, MAT-003:claude_review, MAT-004:claude_review, MAT-005:claude_review, MAT-006:claude_review, MAT-007:claude_review, MAT-008:claude_review, MAT-009:claude_review, MAT-010:claude_review, NARR-005:claude_review
- RP05.P09.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Matter Core: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H05 | Claude: C05


### RP06: DMS Core

Scope: Workspace, Folder, Document, Version, FileObject, Rendition

#### RP06.P00: Contract And Acceptance Baseline

- RP06.P00.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for DMS Core: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H06 | Claude: C06
- RP06.P00.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for DMS Core: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H06 | Claude: C06 | Reqs: DOC-001:contract, DOC-002:contract, DOC-003:contract, DOC-004:contract, DOC-005:contract, DOC-006:contract, DOC-007:contract, DOC-008:contract, DOC-009:contract, DOC-010:contract, DOC-011:contract, DOC-012:contract, DOC-013:contract, DOC-014:contract, DOC-015:contract, DOC-016:contract, NARR-010:contract, NARR-017:contract
- RP06.P00.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for DMS Core: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H06 | Claude: C06
- RP06.P00.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for DMS Core: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H06 | Claude: C06
- RP06.P00.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for DMS Core: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H06 | Claude: C06
- RP06.P00.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for DMS Core: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H06 | Claude: C06
- RP06.P00.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for DMS Core: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H06 | Claude: C06
- RP06.P00.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for DMS Core: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H06 | Claude: C06
- RP06.P00.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for DMS Core: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H06 | Claude: C06
- RP06.P00.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for DMS Core: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H06 | Claude: C06
- RP06.P00.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for DMS Core: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H06 | Claude: C06

#### RP06.P01: Domain Model

- RP06.P01.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for DMS Core: Domain Model. | Commands: npm run validate | Hermes: H06 | Claude: C06
- RP06.P01.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for DMS Core: Domain Model. | Commands: npm run validate | Hermes: H06 | Claude: C06
- RP06.P01.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for DMS Core: Domain Model. | Commands: npm run validate | Hermes: H06 | Claude: C06
- RP06.P01.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for DMS Core: Domain Model. | Commands: npm run validate | Hermes: H06 | Claude: C06
- RP06.P01.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for DMS Core: Domain Model. | Commands: npm run validate | Hermes: H06 | Claude: C06
- RP06.P01.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for DMS Core: Domain Model. | Commands: npm run validate | Hermes: H06 | Claude: C06
- RP06.P01.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for DMS Core: Domain Model. | Commands: npm run validate | Hermes: H06 | Claude: C06
- RP06.P01.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for DMS Core: Domain Model. | Commands: npm run validate | Hermes: H06 | Claude: C06
- RP06.P01.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for DMS Core: Domain Model. | Commands: npm run validate | Hermes: H06 | Claude: C06
- RP06.P01.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for DMS Core: Domain Model. | Commands: npm run validate | Hermes: H06 | Claude: C06
- RP06.P01.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for DMS Core: Domain Model. | Commands: npm run validate | Hermes: H06 | Claude: C06

#### RP06.P02: Service Logic

- RP06.P02.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for DMS Core: Service Logic. | Commands: npm run validate, npm test | Hermes: H06 | Claude: C06
- RP06.P02.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for DMS Core: Service Logic. | Commands: npm run validate, npm test | Hermes: H06 | Claude: C06
- RP06.P02.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for DMS Core: Service Logic. | Commands: npm run validate, npm test | Hermes: H06 | Claude: C06
- RP06.P02.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for DMS Core: Service Logic. | Commands: npm run validate, npm test | Hermes: H06 | Claude: C06 | Reqs: DOC-001:primary_implementation, DOC-002:primary_implementation, DOC-003:primary_implementation, DOC-004:primary_implementation, DOC-005:primary_implementation, DOC-006:primary_implementation, DOC-007:primary_implementation, DOC-008:primary_implementation, DOC-009:primary_implementation, DOC-010:primary_implementation, DOC-011:primary_implementation, DOC-012:primary_implementation, DOC-013:primary_implementation, DOC-014:primary_implementation, DOC-015:primary_implementation, DOC-016:primary_implementation, NARR-017:primary_implementation
- RP06.P02.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for DMS Core: Service Logic. | Commands: npm run validate, npm test | Hermes: H06 | Claude: C06
- RP06.P02.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for DMS Core: Service Logic. | Commands: npm run validate, npm test | Hermes: H06 | Claude: C06
- RP06.P02.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for DMS Core: Service Logic. | Commands: npm run validate, npm test | Hermes: H06 | Claude: C06
- RP06.P02.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for DMS Core: Service Logic. | Commands: npm run validate, npm test | Hermes: H06 | Claude: C06
- RP06.P02.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for DMS Core: Service Logic. | Commands: npm run validate, npm test | Hermes: H06 | Claude: C06
- RP06.P02.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for DMS Core: Service Logic. | Commands: npm run validate, npm test | Hermes: H06 | Claude: C06
- RP06.P02.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for DMS Core: Service Logic. | Commands: npm run validate, npm test | Hermes: H06 | Claude: C06

#### RP06.P03: API And Interface

- RP06.P03.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for DMS Core: API And Interface. | Commands: npm run validate, npm test | Hermes: H06 | Claude: C06
- RP06.P03.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for DMS Core: API And Interface. | Commands: npm run validate, npm test | Hermes: H06 | Claude: C06
- RP06.P03.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for DMS Core: API And Interface. | Commands: npm run validate, npm test | Hermes: H06 | Claude: C06
- RP06.P03.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for DMS Core: API And Interface. | Commands: npm run validate, npm test | Hermes: H06 | Claude: C06
- RP06.P03.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for DMS Core: API And Interface. | Commands: npm run validate, npm test | Hermes: H06 | Claude: C06
- RP06.P03.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for DMS Core: API And Interface. | Commands: npm run validate, npm test | Hermes: H06 | Claude: C06
- RP06.P03.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for DMS Core: API And Interface. | Commands: npm run validate, npm test | Hermes: H06 | Claude: C06
- RP06.P03.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for DMS Core: API And Interface. | Commands: npm run validate, npm test | Hermes: H06 | Claude: C06
- RP06.P03.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for DMS Core: API And Interface. | Commands: npm run validate, npm test | Hermes: H06 | Claude: C06
- RP06.P03.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for DMS Core: API And Interface. | Commands: npm run validate, npm test | Hermes: H06 | Claude: C06
- RP06.P03.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for DMS Core: API And Interface. | Commands: npm run validate, npm test | Hermes: H06 | Claude: C06

#### RP06.P04: UI And Operator Surface

- RP06.P04.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for DMS Core: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H06 | Claude: C06
- RP06.P04.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for DMS Core: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H06 | Claude: C06
- RP06.P04.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for DMS Core: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H06 | Claude: C06
- RP06.P04.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for DMS Core: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H06 | Claude: C06
- RP06.P04.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for DMS Core: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H06 | Claude: C06
- RP06.P04.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for DMS Core: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H06 | Claude: C06
- RP06.P04.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for DMS Core: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H06 | Claude: C06
- RP06.P04.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for DMS Core: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H06 | Claude: C06
- RP06.P04.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for DMS Core: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H06 | Claude: C06
- RP06.P04.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for DMS Core: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H06 | Claude: C06
- RP06.P04.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for DMS Core: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H06 | Claude: C06

#### RP06.P05: Fixtures And Golden Cases

- RP06.P05.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for DMS Core: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H06 | Claude: C06
- RP06.P05.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for DMS Core: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H06 | Claude: C06
- RP06.P05.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for DMS Core: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H06 | Claude: C06
- RP06.P05.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for DMS Core: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H06 | Claude: C06
- RP06.P05.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for DMS Core: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H06 | Claude: C06
- RP06.P05.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for DMS Core: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H06 | Claude: C06
- RP06.P05.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for DMS Core: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H06 | Claude: C06
- RP06.P05.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for DMS Core: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H06 | Claude: C06 | Reqs: DOC-001:test, DOC-002:test, DOC-003:test, DOC-004:test, DOC-005:test, DOC-006:test, DOC-007:test, DOC-008:test, DOC-009:test, DOC-010:test, DOC-011:test, DOC-012:test, DOC-013:test, DOC-014:test, DOC-015:test, DOC-016:test, NARR-010:test, NARR-017:test
- RP06.P05.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for DMS Core: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H06 | Claude: C06
- RP06.P05.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for DMS Core: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H06 | Claude: C06
- RP06.P05.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for DMS Core: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H06 | Claude: C06

#### RP06.P06: Permission Audit Integration

- RP06.P06.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for DMS Core: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H06 | Claude: C06
- RP06.P06.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for DMS Core: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H06 | Claude: C06
- RP06.P06.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for DMS Core: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H06 | Claude: C06
- RP06.P06.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for DMS Core: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H06 | Claude: C06
- RP06.P06.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for DMS Core: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H06 | Claude: C06
- RP06.P06.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for DMS Core: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H06 | Claude: C06
- RP06.P06.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for DMS Core: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H06 | Claude: C06
- RP06.P06.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for DMS Core: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H06 | Claude: C06
- RP06.P06.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for DMS Core: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H06 | Claude: C06
- RP06.P06.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for DMS Core: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H06 | Claude: C06
- RP06.P06.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for DMS Core: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H06 | Claude: C06

#### RP06.P07: Failure Edge And Recovery

- RP06.P07.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for DMS Core: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H06 | Claude: C06
- RP06.P07.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for DMS Core: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H06 | Claude: C06
- RP06.P07.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for DMS Core: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H06 | Claude: C06
- RP06.P07.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for DMS Core: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H06 | Claude: C06
- RP06.P07.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for DMS Core: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H06 | Claude: C06
- RP06.P07.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for DMS Core: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H06 | Claude: C06
- RP06.P07.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for DMS Core: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H06 | Claude: C06
- RP06.P07.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for DMS Core: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H06 | Claude: C06 | Reqs: NARR-010:primary_implementation
- RP06.P07.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for DMS Core: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H06 | Claude: C06
- RP06.P07.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for DMS Core: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H06 | Claude: C06
- RP06.P07.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for DMS Core: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H06 | Claude: C06

#### RP06.P08: Hermes Validation Binding

- RP06.P08.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for DMS Core: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H06 | Claude: C06
- RP06.P08.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for DMS Core: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H06 | Claude: C06
- RP06.P08.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for DMS Core: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H06 | Claude: C06
- RP06.P08.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for DMS Core: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H06 | Claude: C06
- RP06.P08.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for DMS Core: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H06 | Claude: C06
- RP06.P08.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for DMS Core: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H06 | Claude: C06
- RP06.P08.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for DMS Core: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H06 | Claude: C06
- RP06.P08.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for DMS Core: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H06 | Claude: C06
- RP06.P08.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for DMS Core: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H06 | Claude: C06 | Reqs: DOC-001:hermes_evidence, DOC-002:hermes_evidence, DOC-003:hermes_evidence, DOC-004:hermes_evidence, DOC-005:hermes_evidence, DOC-006:hermes_evidence, DOC-007:hermes_evidence, DOC-008:hermes_evidence, DOC-009:hermes_evidence, DOC-010:hermes_evidence, DOC-011:hermes_evidence, DOC-012:hermes_evidence, DOC-013:hermes_evidence, DOC-014:hermes_evidence, DOC-015:hermes_evidence, DOC-016:hermes_evidence, NARR-010:hermes_evidence, NARR-017:hermes_evidence
- RP06.P08.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for DMS Core: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H06 | Claude: C06
- RP06.P08.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for DMS Core: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H06 | Claude: C06

#### RP06.P09: Claude Cross Validation Closeout

- RP06.P09.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for DMS Core: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H06 | Claude: C06
- RP06.P09.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for DMS Core: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H06 | Claude: C06
- RP06.P09.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for DMS Core: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H06 | Claude: C06
- RP06.P09.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for DMS Core: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H06 | Claude: C06
- RP06.P09.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for DMS Core: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H06 | Claude: C06
- RP06.P09.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for DMS Core: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H06 | Claude: C06
- RP06.P09.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for DMS Core: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H06 | Claude: C06
- RP06.P09.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for DMS Core: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H06 | Claude: C06
- RP06.P09.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for DMS Core: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H06 | Claude: C06
- RP06.P09.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for DMS Core: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H06 | Claude: C06 | Reqs: DOC-001:claude_review, DOC-002:claude_review, DOC-003:claude_review, DOC-004:claude_review, DOC-005:claude_review, DOC-006:claude_review, DOC-007:claude_review, DOC-008:claude_review, DOC-009:claude_review, DOC-010:claude_review, DOC-011:claude_review, DOC-012:claude_review, DOC-013:claude_review, DOC-014:claude_review, DOC-015:claude_review, DOC-016:claude_review, NARR-010:claude_review, NARR-017:claude_review
- RP06.P09.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for DMS Core: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H06 | Claude: C06


### RP07: Search OCR And Index

Scope: keyword, metadata, OCR, clause, semantic index

#### RP07.P00: Contract And Acceptance Baseline

- RP07.P00.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Search OCR And Index: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H07 | Claude: C07
- RP07.P00.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Search OCR And Index: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H07 | Claude: C07 | Reqs: SRCH-001:contract, SRCH-002:contract, SRCH-003:contract, SRCH-004:contract, SRCH-005:contract, SRCH-006:contract, SRCH-007:contract, SRCH-008:contract
- RP07.P00.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Search OCR And Index: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H07 | Claude: C07
- RP07.P00.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Search OCR And Index: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H07 | Claude: C07
- RP07.P00.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Search OCR And Index: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H07 | Claude: C07
- RP07.P00.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Search OCR And Index: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H07 | Claude: C07
- RP07.P00.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Search OCR And Index: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H07 | Claude: C07
- RP07.P00.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Search OCR And Index: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H07 | Claude: C07
- RP07.P00.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Search OCR And Index: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H07 | Claude: C07
- RP07.P00.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Search OCR And Index: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H07 | Claude: C07
- RP07.P00.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Search OCR And Index: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H07 | Claude: C07

#### RP07.P01: Domain Model

- RP07.P01.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Search OCR And Index: Domain Model. | Commands: npm run validate | Hermes: H07 | Claude: C07
- RP07.P01.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Search OCR And Index: Domain Model. | Commands: npm run validate | Hermes: H07 | Claude: C07
- RP07.P01.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Search OCR And Index: Domain Model. | Commands: npm run validate | Hermes: H07 | Claude: C07
- RP07.P01.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Search OCR And Index: Domain Model. | Commands: npm run validate | Hermes: H07 | Claude: C07
- RP07.P01.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Search OCR And Index: Domain Model. | Commands: npm run validate | Hermes: H07 | Claude: C07
- RP07.P01.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Search OCR And Index: Domain Model. | Commands: npm run validate | Hermes: H07 | Claude: C07
- RP07.P01.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Search OCR And Index: Domain Model. | Commands: npm run validate | Hermes: H07 | Claude: C07
- RP07.P01.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Search OCR And Index: Domain Model. | Commands: npm run validate | Hermes: H07 | Claude: C07
- RP07.P01.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Search OCR And Index: Domain Model. | Commands: npm run validate | Hermes: H07 | Claude: C07
- RP07.P01.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Search OCR And Index: Domain Model. | Commands: npm run validate | Hermes: H07 | Claude: C07
- RP07.P01.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Search OCR And Index: Domain Model. | Commands: npm run validate | Hermes: H07 | Claude: C07

#### RP07.P02: Service Logic

- RP07.P02.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Search OCR And Index: Service Logic. | Commands: npm run validate, npm test | Hermes: H07 | Claude: C07
- RP07.P02.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Search OCR And Index: Service Logic. | Commands: npm run validate, npm test | Hermes: H07 | Claude: C07
- RP07.P02.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Search OCR And Index: Service Logic. | Commands: npm run validate, npm test | Hermes: H07 | Claude: C07
- RP07.P02.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Search OCR And Index: Service Logic. | Commands: npm run validate, npm test | Hermes: H07 | Claude: C07 | Reqs: SRCH-001:primary_implementation, SRCH-002:primary_implementation, SRCH-003:primary_implementation, SRCH-004:primary_implementation, SRCH-005:primary_implementation, SRCH-006:primary_implementation, SRCH-007:primary_implementation, SRCH-008:primary_implementation
- RP07.P02.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Search OCR And Index: Service Logic. | Commands: npm run validate, npm test | Hermes: H07 | Claude: C07
- RP07.P02.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Search OCR And Index: Service Logic. | Commands: npm run validate, npm test | Hermes: H07 | Claude: C07
- RP07.P02.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Search OCR And Index: Service Logic. | Commands: npm run validate, npm test | Hermes: H07 | Claude: C07
- RP07.P02.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Search OCR And Index: Service Logic. | Commands: npm run validate, npm test | Hermes: H07 | Claude: C07
- RP07.P02.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Search OCR And Index: Service Logic. | Commands: npm run validate, npm test | Hermes: H07 | Claude: C07
- RP07.P02.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Search OCR And Index: Service Logic. | Commands: npm run validate, npm test | Hermes: H07 | Claude: C07
- RP07.P02.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Search OCR And Index: Service Logic. | Commands: npm run validate, npm test | Hermes: H07 | Claude: C07

#### RP07.P03: API And Interface

- RP07.P03.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Search OCR And Index: API And Interface. | Commands: npm run validate, npm test | Hermes: H07 | Claude: C07
- RP07.P03.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Search OCR And Index: API And Interface. | Commands: npm run validate, npm test | Hermes: H07 | Claude: C07
- RP07.P03.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Search OCR And Index: API And Interface. | Commands: npm run validate, npm test | Hermes: H07 | Claude: C07
- RP07.P03.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Search OCR And Index: API And Interface. | Commands: npm run validate, npm test | Hermes: H07 | Claude: C07
- RP07.P03.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Search OCR And Index: API And Interface. | Commands: npm run validate, npm test | Hermes: H07 | Claude: C07
- RP07.P03.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Search OCR And Index: API And Interface. | Commands: npm run validate, npm test | Hermes: H07 | Claude: C07
- RP07.P03.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Search OCR And Index: API And Interface. | Commands: npm run validate, npm test | Hermes: H07 | Claude: C07
- RP07.P03.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Search OCR And Index: API And Interface. | Commands: npm run validate, npm test | Hermes: H07 | Claude: C07
- RP07.P03.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Search OCR And Index: API And Interface. | Commands: npm run validate, npm test | Hermes: H07 | Claude: C07
- RP07.P03.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Search OCR And Index: API And Interface. | Commands: npm run validate, npm test | Hermes: H07 | Claude: C07
- RP07.P03.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Search OCR And Index: API And Interface. | Commands: npm run validate, npm test | Hermes: H07 | Claude: C07

#### RP07.P04: UI And Operator Surface

- RP07.P04.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Search OCR And Index: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H07 | Claude: C07
- RP07.P04.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Search OCR And Index: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H07 | Claude: C07
- RP07.P04.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Search OCR And Index: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H07 | Claude: C07
- RP07.P04.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Search OCR And Index: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H07 | Claude: C07
- RP07.P04.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Search OCR And Index: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H07 | Claude: C07
- RP07.P04.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Search OCR And Index: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H07 | Claude: C07
- RP07.P04.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Search OCR And Index: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H07 | Claude: C07
- RP07.P04.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Search OCR And Index: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H07 | Claude: C07
- RP07.P04.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Search OCR And Index: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H07 | Claude: C07
- RP07.P04.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Search OCR And Index: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H07 | Claude: C07
- RP07.P04.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Search OCR And Index: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H07 | Claude: C07

#### RP07.P05: Fixtures And Golden Cases

- RP07.P05.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Search OCR And Index: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H07 | Claude: C07
- RP07.P05.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Search OCR And Index: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H07 | Claude: C07
- RP07.P05.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Search OCR And Index: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H07 | Claude: C07
- RP07.P05.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Search OCR And Index: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H07 | Claude: C07
- RP07.P05.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Search OCR And Index: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H07 | Claude: C07
- RP07.P05.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Search OCR And Index: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H07 | Claude: C07
- RP07.P05.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Search OCR And Index: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H07 | Claude: C07
- RP07.P05.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Search OCR And Index: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H07 | Claude: C07 | Reqs: SRCH-001:test, SRCH-002:test, SRCH-003:test, SRCH-004:test, SRCH-005:test, SRCH-006:test, SRCH-007:test, SRCH-008:test
- RP07.P05.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Search OCR And Index: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H07 | Claude: C07
- RP07.P05.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Search OCR And Index: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H07 | Claude: C07
- RP07.P05.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Search OCR And Index: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H07 | Claude: C07

#### RP07.P06: Permission Audit Integration

- RP07.P06.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Search OCR And Index: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H07 | Claude: C07
- RP07.P06.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Search OCR And Index: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H07 | Claude: C07
- RP07.P06.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Search OCR And Index: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H07 | Claude: C07
- RP07.P06.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Search OCR And Index: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H07 | Claude: C07
- RP07.P06.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Search OCR And Index: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H07 | Claude: C07
- RP07.P06.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Search OCR And Index: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H07 | Claude: C07
- RP07.P06.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Search OCR And Index: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H07 | Claude: C07
- RP07.P06.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Search OCR And Index: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H07 | Claude: C07
- RP07.P06.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Search OCR And Index: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H07 | Claude: C07
- RP07.P06.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Search OCR And Index: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H07 | Claude: C07
- RP07.P06.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Search OCR And Index: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H07 | Claude: C07

#### RP07.P07: Failure Edge And Recovery

- RP07.P07.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Search OCR And Index: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H07 | Claude: C07
- RP07.P07.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Search OCR And Index: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H07 | Claude: C07
- RP07.P07.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Search OCR And Index: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H07 | Claude: C07
- RP07.P07.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Search OCR And Index: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H07 | Claude: C07
- RP07.P07.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Search OCR And Index: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H07 | Claude: C07
- RP07.P07.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Search OCR And Index: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H07 | Claude: C07
- RP07.P07.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Search OCR And Index: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H07 | Claude: C07
- RP07.P07.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Search OCR And Index: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H07 | Claude: C07
- RP07.P07.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Search OCR And Index: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H07 | Claude: C07
- RP07.P07.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Search OCR And Index: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H07 | Claude: C07
- RP07.P07.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Search OCR And Index: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H07 | Claude: C07

#### RP07.P08: Hermes Validation Binding

- RP07.P08.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Search OCR And Index: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H07 | Claude: C07
- RP07.P08.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Search OCR And Index: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H07 | Claude: C07
- RP07.P08.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Search OCR And Index: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H07 | Claude: C07
- RP07.P08.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Search OCR And Index: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H07 | Claude: C07
- RP07.P08.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Search OCR And Index: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H07 | Claude: C07
- RP07.P08.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Search OCR And Index: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H07 | Claude: C07
- RP07.P08.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Search OCR And Index: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H07 | Claude: C07
- RP07.P08.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Search OCR And Index: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H07 | Claude: C07
- RP07.P08.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Search OCR And Index: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H07 | Claude: C07 | Reqs: SRCH-001:hermes_evidence, SRCH-002:hermes_evidence, SRCH-003:hermes_evidence, SRCH-004:hermes_evidence, SRCH-005:hermes_evidence, SRCH-006:hermes_evidence, SRCH-007:hermes_evidence, SRCH-008:hermes_evidence
- RP07.P08.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Search OCR And Index: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H07 | Claude: C07
- RP07.P08.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Search OCR And Index: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H07 | Claude: C07

#### RP07.P09: Claude Cross Validation Closeout

- RP07.P09.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Search OCR And Index: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H07 | Claude: C07
- RP07.P09.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Search OCR And Index: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H07 | Claude: C07
- RP07.P09.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Search OCR And Index: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H07 | Claude: C07
- RP07.P09.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Search OCR And Index: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H07 | Claude: C07
- RP07.P09.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Search OCR And Index: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H07 | Claude: C07
- RP07.P09.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Search OCR And Index: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H07 | Claude: C07
- RP07.P09.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Search OCR And Index: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H07 | Claude: C07
- RP07.P09.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Search OCR And Index: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H07 | Claude: C07
- RP07.P09.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Search OCR And Index: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H07 | Claude: C07
- RP07.P09.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Search OCR And Index: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H07 | Claude: C07 | Reqs: SRCH-001:claude_review, SRCH-002:claude_review, SRCH-003:claude_review, SRCH-004:claude_review, SRCH-005:claude_review, SRCH-006:claude_review, SRCH-007:claude_review, SRCH-008:claude_review
- RP07.P09.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Search OCR And Index: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H07 | Claude: C07


### RP08: Email And Office Native DMS

Scope: Outlook, Gmail, Office add-in, email filing

#### RP08.P00: Contract And Acceptance Baseline

- RP08.P00.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Email And Office Native DMS: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H08 | Claude: C08
- RP08.P00.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Email And Office Native DMS: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H08 | Claude: C08 | Reqs: EML-001:contract, EML-002:contract, EML-003:contract, EML-004:contract, EML-005:contract, EML-006:contract, EML-007:contract, EML-008:contract, EML-009:contract, EML-010:contract, NARR-014:contract
- RP08.P00.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Email And Office Native DMS: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H08 | Claude: C08
- RP08.P00.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Email And Office Native DMS: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H08 | Claude: C08
- RP08.P00.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Email And Office Native DMS: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H08 | Claude: C08
- RP08.P00.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Email And Office Native DMS: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H08 | Claude: C08
- RP08.P00.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Email And Office Native DMS: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H08 | Claude: C08
- RP08.P00.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Email And Office Native DMS: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H08 | Claude: C08
- RP08.P00.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Email And Office Native DMS: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H08 | Claude: C08
- RP08.P00.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Email And Office Native DMS: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H08 | Claude: C08
- RP08.P00.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Email And Office Native DMS: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H08 | Claude: C08

#### RP08.P01: Domain Model

- RP08.P01.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Email And Office Native DMS: Domain Model. | Commands: npm run validate | Hermes: H08 | Claude: C08
- RP08.P01.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Email And Office Native DMS: Domain Model. | Commands: npm run validate | Hermes: H08 | Claude: C08
- RP08.P01.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Email And Office Native DMS: Domain Model. | Commands: npm run validate | Hermes: H08 | Claude: C08
- RP08.P01.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Email And Office Native DMS: Domain Model. | Commands: npm run validate | Hermes: H08 | Claude: C08
- RP08.P01.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Email And Office Native DMS: Domain Model. | Commands: npm run validate | Hermes: H08 | Claude: C08
- RP08.P01.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Email And Office Native DMS: Domain Model. | Commands: npm run validate | Hermes: H08 | Claude: C08
- RP08.P01.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Email And Office Native DMS: Domain Model. | Commands: npm run validate | Hermes: H08 | Claude: C08
- RP08.P01.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Email And Office Native DMS: Domain Model. | Commands: npm run validate | Hermes: H08 | Claude: C08
- RP08.P01.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Email And Office Native DMS: Domain Model. | Commands: npm run validate | Hermes: H08 | Claude: C08
- RP08.P01.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Email And Office Native DMS: Domain Model. | Commands: npm run validate | Hermes: H08 | Claude: C08
- RP08.P01.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Email And Office Native DMS: Domain Model. | Commands: npm run validate | Hermes: H08 | Claude: C08

#### RP08.P02: Service Logic

- RP08.P02.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Email And Office Native DMS: Service Logic. | Commands: npm run validate, npm test | Hermes: H08 | Claude: C08
- RP08.P02.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Email And Office Native DMS: Service Logic. | Commands: npm run validate, npm test | Hermes: H08 | Claude: C08
- RP08.P02.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Email And Office Native DMS: Service Logic. | Commands: npm run validate, npm test | Hermes: H08 | Claude: C08
- RP08.P02.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Email And Office Native DMS: Service Logic. | Commands: npm run validate, npm test | Hermes: H08 | Claude: C08 | Reqs: EML-001:primary_implementation, EML-002:primary_implementation, EML-003:primary_implementation, EML-004:primary_implementation, EML-005:primary_implementation, EML-006:primary_implementation, EML-007:primary_implementation, EML-008:primary_implementation, EML-009:primary_implementation, EML-010:primary_implementation, NARR-014:primary_implementation
- RP08.P02.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Email And Office Native DMS: Service Logic. | Commands: npm run validate, npm test | Hermes: H08 | Claude: C08
- RP08.P02.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Email And Office Native DMS: Service Logic. | Commands: npm run validate, npm test | Hermes: H08 | Claude: C08
- RP08.P02.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Email And Office Native DMS: Service Logic. | Commands: npm run validate, npm test | Hermes: H08 | Claude: C08
- RP08.P02.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Email And Office Native DMS: Service Logic. | Commands: npm run validate, npm test | Hermes: H08 | Claude: C08
- RP08.P02.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Email And Office Native DMS: Service Logic. | Commands: npm run validate, npm test | Hermes: H08 | Claude: C08
- RP08.P02.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Email And Office Native DMS: Service Logic. | Commands: npm run validate, npm test | Hermes: H08 | Claude: C08
- RP08.P02.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Email And Office Native DMS: Service Logic. | Commands: npm run validate, npm test | Hermes: H08 | Claude: C08

#### RP08.P03: API And Interface

- RP08.P03.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Email And Office Native DMS: API And Interface. | Commands: npm run validate, npm test | Hermes: H08 | Claude: C08
- RP08.P03.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Email And Office Native DMS: API And Interface. | Commands: npm run validate, npm test | Hermes: H08 | Claude: C08
- RP08.P03.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Email And Office Native DMS: API And Interface. | Commands: npm run validate, npm test | Hermes: H08 | Claude: C08
- RP08.P03.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Email And Office Native DMS: API And Interface. | Commands: npm run validate, npm test | Hermes: H08 | Claude: C08
- RP08.P03.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Email And Office Native DMS: API And Interface. | Commands: npm run validate, npm test | Hermes: H08 | Claude: C08
- RP08.P03.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Email And Office Native DMS: API And Interface. | Commands: npm run validate, npm test | Hermes: H08 | Claude: C08
- RP08.P03.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Email And Office Native DMS: API And Interface. | Commands: npm run validate, npm test | Hermes: H08 | Claude: C08
- RP08.P03.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Email And Office Native DMS: API And Interface. | Commands: npm run validate, npm test | Hermes: H08 | Claude: C08
- RP08.P03.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Email And Office Native DMS: API And Interface. | Commands: npm run validate, npm test | Hermes: H08 | Claude: C08
- RP08.P03.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Email And Office Native DMS: API And Interface. | Commands: npm run validate, npm test | Hermes: H08 | Claude: C08
- RP08.P03.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Email And Office Native DMS: API And Interface. | Commands: npm run validate, npm test | Hermes: H08 | Claude: C08

#### RP08.P04: UI And Operator Surface

- RP08.P04.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Email And Office Native DMS: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H08 | Claude: C08
- RP08.P04.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Email And Office Native DMS: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H08 | Claude: C08
- RP08.P04.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Email And Office Native DMS: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H08 | Claude: C08
- RP08.P04.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Email And Office Native DMS: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H08 | Claude: C08
- RP08.P04.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Email And Office Native DMS: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H08 | Claude: C08
- RP08.P04.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Email And Office Native DMS: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H08 | Claude: C08
- RP08.P04.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Email And Office Native DMS: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H08 | Claude: C08
- RP08.P04.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Email And Office Native DMS: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H08 | Claude: C08
- RP08.P04.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Email And Office Native DMS: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H08 | Claude: C08
- RP08.P04.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Email And Office Native DMS: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H08 | Claude: C08
- RP08.P04.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Email And Office Native DMS: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H08 | Claude: C08

#### RP08.P05: Fixtures And Golden Cases

- RP08.P05.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Email And Office Native DMS: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H08 | Claude: C08
- RP08.P05.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Email And Office Native DMS: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H08 | Claude: C08
- RP08.P05.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Email And Office Native DMS: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H08 | Claude: C08
- RP08.P05.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Email And Office Native DMS: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H08 | Claude: C08
- RP08.P05.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Email And Office Native DMS: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H08 | Claude: C08
- RP08.P05.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Email And Office Native DMS: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H08 | Claude: C08
- RP08.P05.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Email And Office Native DMS: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H08 | Claude: C08
- RP08.P05.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Email And Office Native DMS: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H08 | Claude: C08 | Reqs: EML-001:test, EML-002:test, EML-003:test, EML-004:test, EML-005:test, EML-006:test, EML-007:test, EML-008:test, EML-009:test, EML-010:test, NARR-014:test
- RP08.P05.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Email And Office Native DMS: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H08 | Claude: C08
- RP08.P05.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Email And Office Native DMS: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H08 | Claude: C08
- RP08.P05.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Email And Office Native DMS: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H08 | Claude: C08

#### RP08.P06: Permission Audit Integration

- RP08.P06.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Email And Office Native DMS: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H08 | Claude: C08
- RP08.P06.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Email And Office Native DMS: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H08 | Claude: C08
- RP08.P06.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Email And Office Native DMS: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H08 | Claude: C08
- RP08.P06.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Email And Office Native DMS: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H08 | Claude: C08
- RP08.P06.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Email And Office Native DMS: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H08 | Claude: C08
- RP08.P06.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Email And Office Native DMS: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H08 | Claude: C08
- RP08.P06.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Email And Office Native DMS: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H08 | Claude: C08
- RP08.P06.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Email And Office Native DMS: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H08 | Claude: C08
- RP08.P06.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Email And Office Native DMS: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H08 | Claude: C08
- RP08.P06.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Email And Office Native DMS: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H08 | Claude: C08
- RP08.P06.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Email And Office Native DMS: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H08 | Claude: C08

#### RP08.P07: Failure Edge And Recovery

- RP08.P07.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Email And Office Native DMS: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H08 | Claude: C08
- RP08.P07.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Email And Office Native DMS: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H08 | Claude: C08
- RP08.P07.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Email And Office Native DMS: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H08 | Claude: C08
- RP08.P07.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Email And Office Native DMS: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H08 | Claude: C08
- RP08.P07.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Email And Office Native DMS: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H08 | Claude: C08
- RP08.P07.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Email And Office Native DMS: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H08 | Claude: C08
- RP08.P07.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Email And Office Native DMS: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H08 | Claude: C08
- RP08.P07.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Email And Office Native DMS: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H08 | Claude: C08
- RP08.P07.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Email And Office Native DMS: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H08 | Claude: C08
- RP08.P07.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Email And Office Native DMS: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H08 | Claude: C08
- RP08.P07.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Email And Office Native DMS: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H08 | Claude: C08

#### RP08.P08: Hermes Validation Binding

- RP08.P08.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Email And Office Native DMS: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H08 | Claude: C08
- RP08.P08.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Email And Office Native DMS: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H08 | Claude: C08
- RP08.P08.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Email And Office Native DMS: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H08 | Claude: C08
- RP08.P08.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Email And Office Native DMS: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H08 | Claude: C08
- RP08.P08.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Email And Office Native DMS: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H08 | Claude: C08
- RP08.P08.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Email And Office Native DMS: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H08 | Claude: C08
- RP08.P08.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Email And Office Native DMS: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H08 | Claude: C08
- RP08.P08.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Email And Office Native DMS: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H08 | Claude: C08
- RP08.P08.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Email And Office Native DMS: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H08 | Claude: C08 | Reqs: EML-001:hermes_evidence, EML-002:hermes_evidence, EML-003:hermes_evidence, EML-004:hermes_evidence, EML-005:hermes_evidence, EML-006:hermes_evidence, EML-007:hermes_evidence, EML-008:hermes_evidence, EML-009:hermes_evidence, EML-010:hermes_evidence, NARR-014:hermes_evidence
- RP08.P08.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Email And Office Native DMS: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H08 | Claude: C08
- RP08.P08.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Email And Office Native DMS: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H08 | Claude: C08

#### RP08.P09: Claude Cross Validation Closeout

- RP08.P09.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Email And Office Native DMS: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H08 | Claude: C08
- RP08.P09.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Email And Office Native DMS: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H08 | Claude: C08
- RP08.P09.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Email And Office Native DMS: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H08 | Claude: C08
- RP08.P09.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Email And Office Native DMS: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H08 | Claude: C08
- RP08.P09.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Email And Office Native DMS: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H08 | Claude: C08
- RP08.P09.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Email And Office Native DMS: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H08 | Claude: C08
- RP08.P09.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Email And Office Native DMS: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H08 | Claude: C08
- RP08.P09.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Email And Office Native DMS: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H08 | Claude: C08
- RP08.P09.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Email And Office Native DMS: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H08 | Claude: C08
- RP08.P09.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Email And Office Native DMS: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H08 | Claude: C08 | Reqs: EML-001:claude_review, EML-002:claude_review, EML-003:claude_review, EML-004:claude_review, EML-005:claude_review, EML-006:claude_review, EML-007:claude_review, EML-008:claude_review, EML-009:claude_review, EML-010:claude_review, NARR-014:claude_review
- RP08.P09.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Email And Office Native DMS: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H08 | Claude: C08


### RP09: CRM And Business Development

Scope: Lead, Opportunity, Activity, Proposal, Campaign, Referral

#### RP09.P00: Contract And Acceptance Baseline

- RP09.P00.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for CRM And Business Development: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H09 | Claude: C09
- RP09.P00.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for CRM And Business Development: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H09 | Claude: C09 | Reqs: LEAD-001:contract, LEAD-002:contract, LEAD-003:contract, LEAD-004:contract, LEAD-005:contract, OPP-001:contract, OPP-002:contract, OPP-003:contract, OPP-004:contract, OPP-005:contract, OPP-006:contract, OPP-007:contract, OPP-008:contract, OPP-009:contract, OPP-010:contract, PROP-001:contract, PROP-002:contract, PROP-003:contract, PROP-004:contract, PROP-005:contract, PROP-006:contract, PROP-007:contract, REF-001:contract, REF-002:contract, REF-003:contract, REF-004:contract, REF-005:contract, REF-006:contract, CAM-001:contract, CAM-002:contract, CAM-003:contract, CAM-004:contract, REL-001:contract, REL-002:contract, REL-003:contract
- RP09.P00.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for CRM And Business Development: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H09 | Claude: C09
- RP09.P00.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for CRM And Business Development: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H09 | Claude: C09
- RP09.P00.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for CRM And Business Development: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H09 | Claude: C09
- RP09.P00.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for CRM And Business Development: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H09 | Claude: C09
- RP09.P00.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for CRM And Business Development: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H09 | Claude: C09
- RP09.P00.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for CRM And Business Development: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H09 | Claude: C09
- RP09.P00.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for CRM And Business Development: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H09 | Claude: C09
- RP09.P00.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for CRM And Business Development: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H09 | Claude: C09
- RP09.P00.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for CRM And Business Development: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H09 | Claude: C09

#### RP09.P01: Domain Model

- RP09.P01.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for CRM And Business Development: Domain Model. | Commands: npm run validate | Hermes: H09 | Claude: C09
- RP09.P01.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for CRM And Business Development: Domain Model. | Commands: npm run validate | Hermes: H09 | Claude: C09
- RP09.P01.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for CRM And Business Development: Domain Model. | Commands: npm run validate | Hermes: H09 | Claude: C09
- RP09.P01.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for CRM And Business Development: Domain Model. | Commands: npm run validate | Hermes: H09 | Claude: C09
- RP09.P01.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for CRM And Business Development: Domain Model. | Commands: npm run validate | Hermes: H09 | Claude: C09
- RP09.P01.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for CRM And Business Development: Domain Model. | Commands: npm run validate | Hermes: H09 | Claude: C09
- RP09.P01.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for CRM And Business Development: Domain Model. | Commands: npm run validate | Hermes: H09 | Claude: C09
- RP09.P01.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for CRM And Business Development: Domain Model. | Commands: npm run validate | Hermes: H09 | Claude: C09
- RP09.P01.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for CRM And Business Development: Domain Model. | Commands: npm run validate | Hermes: H09 | Claude: C09
- RP09.P01.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for CRM And Business Development: Domain Model. | Commands: npm run validate | Hermes: H09 | Claude: C09
- RP09.P01.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for CRM And Business Development: Domain Model. | Commands: npm run validate | Hermes: H09 | Claude: C09

#### RP09.P02: Service Logic

- RP09.P02.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for CRM And Business Development: Service Logic. | Commands: npm run validate, npm test | Hermes: H09 | Claude: C09
- RP09.P02.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for CRM And Business Development: Service Logic. | Commands: npm run validate, npm test | Hermes: H09 | Claude: C09
- RP09.P02.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for CRM And Business Development: Service Logic. | Commands: npm run validate, npm test | Hermes: H09 | Claude: C09
- RP09.P02.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for CRM And Business Development: Service Logic. | Commands: npm run validate, npm test | Hermes: H09 | Claude: C09 | Reqs: LEAD-001:primary_implementation, LEAD-002:primary_implementation, LEAD-003:primary_implementation, LEAD-004:primary_implementation, LEAD-005:primary_implementation, OPP-001:primary_implementation, OPP-002:primary_implementation, OPP-003:primary_implementation, OPP-004:primary_implementation, OPP-005:primary_implementation, OPP-006:primary_implementation, OPP-007:primary_implementation, OPP-008:primary_implementation, OPP-009:primary_implementation, OPP-010:primary_implementation, PROP-001:primary_implementation, PROP-002:primary_implementation, PROP-003:primary_implementation, PROP-004:primary_implementation, PROP-005:primary_implementation, PROP-006:primary_implementation, PROP-007:primary_implementation, REF-001:primary_implementation, REF-002:primary_implementation, REF-003:primary_implementation, REF-004:primary_implementation, REF-005:primary_implementation, REF-006:primary_implementation, CAM-001:primary_implementation, CAM-002:primary_implementation, CAM-003:primary_implementation, CAM-004:primary_implementation, REL-001:primary_implementation, REL-002:primary_implementation, REL-003:primary_implementation
- RP09.P02.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for CRM And Business Development: Service Logic. | Commands: npm run validate, npm test | Hermes: H09 | Claude: C09
- RP09.P02.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for CRM And Business Development: Service Logic. | Commands: npm run validate, npm test | Hermes: H09 | Claude: C09
- RP09.P02.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for CRM And Business Development: Service Logic. | Commands: npm run validate, npm test | Hermes: H09 | Claude: C09
- RP09.P02.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for CRM And Business Development: Service Logic. | Commands: npm run validate, npm test | Hermes: H09 | Claude: C09
- RP09.P02.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for CRM And Business Development: Service Logic. | Commands: npm run validate, npm test | Hermes: H09 | Claude: C09
- RP09.P02.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for CRM And Business Development: Service Logic. | Commands: npm run validate, npm test | Hermes: H09 | Claude: C09
- RP09.P02.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for CRM And Business Development: Service Logic. | Commands: npm run validate, npm test | Hermes: H09 | Claude: C09

#### RP09.P03: API And Interface

- RP09.P03.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for CRM And Business Development: API And Interface. | Commands: npm run validate, npm test | Hermes: H09 | Claude: C09
- RP09.P03.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for CRM And Business Development: API And Interface. | Commands: npm run validate, npm test | Hermes: H09 | Claude: C09
- RP09.P03.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for CRM And Business Development: API And Interface. | Commands: npm run validate, npm test | Hermes: H09 | Claude: C09
- RP09.P03.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for CRM And Business Development: API And Interface. | Commands: npm run validate, npm test | Hermes: H09 | Claude: C09
- RP09.P03.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for CRM And Business Development: API And Interface. | Commands: npm run validate, npm test | Hermes: H09 | Claude: C09
- RP09.P03.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for CRM And Business Development: API And Interface. | Commands: npm run validate, npm test | Hermes: H09 | Claude: C09
- RP09.P03.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for CRM And Business Development: API And Interface. | Commands: npm run validate, npm test | Hermes: H09 | Claude: C09
- RP09.P03.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for CRM And Business Development: API And Interface. | Commands: npm run validate, npm test | Hermes: H09 | Claude: C09
- RP09.P03.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for CRM And Business Development: API And Interface. | Commands: npm run validate, npm test | Hermes: H09 | Claude: C09
- RP09.P03.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for CRM And Business Development: API And Interface. | Commands: npm run validate, npm test | Hermes: H09 | Claude: C09
- RP09.P03.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for CRM And Business Development: API And Interface. | Commands: npm run validate, npm test | Hermes: H09 | Claude: C09

#### RP09.P04: UI And Operator Surface

- RP09.P04.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for CRM And Business Development: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H09 | Claude: C09
- RP09.P04.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for CRM And Business Development: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H09 | Claude: C09
- RP09.P04.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for CRM And Business Development: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H09 | Claude: C09
- RP09.P04.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for CRM And Business Development: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H09 | Claude: C09
- RP09.P04.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for CRM And Business Development: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H09 | Claude: C09
- RP09.P04.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for CRM And Business Development: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H09 | Claude: C09
- RP09.P04.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for CRM And Business Development: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H09 | Claude: C09
- RP09.P04.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for CRM And Business Development: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H09 | Claude: C09
- RP09.P04.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for CRM And Business Development: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H09 | Claude: C09
- RP09.P04.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for CRM And Business Development: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H09 | Claude: C09
- RP09.P04.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for CRM And Business Development: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H09 | Claude: C09

#### RP09.P05: Fixtures And Golden Cases

- RP09.P05.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for CRM And Business Development: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H09 | Claude: C09
- RP09.P05.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for CRM And Business Development: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H09 | Claude: C09
- RP09.P05.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for CRM And Business Development: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H09 | Claude: C09
- RP09.P05.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for CRM And Business Development: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H09 | Claude: C09
- RP09.P05.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for CRM And Business Development: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H09 | Claude: C09
- RP09.P05.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for CRM And Business Development: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H09 | Claude: C09
- RP09.P05.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for CRM And Business Development: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H09 | Claude: C09
- RP09.P05.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for CRM And Business Development: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H09 | Claude: C09 | Reqs: LEAD-001:test, LEAD-002:test, LEAD-003:test, LEAD-004:test, LEAD-005:test, OPP-001:test, OPP-002:test, OPP-003:test, OPP-004:test, OPP-005:test, OPP-006:test, OPP-007:test, OPP-008:test, OPP-009:test, OPP-010:test, PROP-001:test, PROP-002:test, PROP-003:test, PROP-004:test, PROP-005:test, PROP-006:test, PROP-007:test, REF-001:test, REF-002:test, REF-003:test, REF-004:test, REF-005:test, REF-006:test, CAM-001:test, CAM-002:test, CAM-003:test, CAM-004:test, REL-001:test, REL-002:test, REL-003:test
- RP09.P05.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for CRM And Business Development: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H09 | Claude: C09
- RP09.P05.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for CRM And Business Development: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H09 | Claude: C09
- RP09.P05.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for CRM And Business Development: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H09 | Claude: C09

#### RP09.P06: Permission Audit Integration

- RP09.P06.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for CRM And Business Development: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H09 | Claude: C09
- RP09.P06.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for CRM And Business Development: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H09 | Claude: C09
- RP09.P06.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for CRM And Business Development: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H09 | Claude: C09
- RP09.P06.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for CRM And Business Development: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H09 | Claude: C09
- RP09.P06.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for CRM And Business Development: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H09 | Claude: C09
- RP09.P06.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for CRM And Business Development: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H09 | Claude: C09
- RP09.P06.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for CRM And Business Development: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H09 | Claude: C09
- RP09.P06.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for CRM And Business Development: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H09 | Claude: C09
- RP09.P06.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for CRM And Business Development: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H09 | Claude: C09
- RP09.P06.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for CRM And Business Development: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H09 | Claude: C09
- RP09.P06.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for CRM And Business Development: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H09 | Claude: C09

#### RP09.P07: Failure Edge And Recovery

- RP09.P07.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for CRM And Business Development: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H09 | Claude: C09
- RP09.P07.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for CRM And Business Development: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H09 | Claude: C09
- RP09.P07.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for CRM And Business Development: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H09 | Claude: C09
- RP09.P07.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for CRM And Business Development: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H09 | Claude: C09
- RP09.P07.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for CRM And Business Development: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H09 | Claude: C09
- RP09.P07.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for CRM And Business Development: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H09 | Claude: C09
- RP09.P07.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for CRM And Business Development: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H09 | Claude: C09
- RP09.P07.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for CRM And Business Development: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H09 | Claude: C09
- RP09.P07.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for CRM And Business Development: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H09 | Claude: C09
- RP09.P07.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for CRM And Business Development: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H09 | Claude: C09
- RP09.P07.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for CRM And Business Development: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H09 | Claude: C09

#### RP09.P08: Hermes Validation Binding

- RP09.P08.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for CRM And Business Development: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H09 | Claude: C09
- RP09.P08.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for CRM And Business Development: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H09 | Claude: C09
- RP09.P08.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for CRM And Business Development: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H09 | Claude: C09
- RP09.P08.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for CRM And Business Development: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H09 | Claude: C09
- RP09.P08.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for CRM And Business Development: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H09 | Claude: C09
- RP09.P08.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for CRM And Business Development: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H09 | Claude: C09
- RP09.P08.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for CRM And Business Development: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H09 | Claude: C09
- RP09.P08.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for CRM And Business Development: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H09 | Claude: C09
- RP09.P08.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for CRM And Business Development: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H09 | Claude: C09 | Reqs: LEAD-001:hermes_evidence, LEAD-002:hermes_evidence, LEAD-003:hermes_evidence, LEAD-004:hermes_evidence, LEAD-005:hermes_evidence, OPP-001:hermes_evidence, OPP-002:hermes_evidence, OPP-003:hermes_evidence, OPP-004:hermes_evidence, OPP-005:hermes_evidence, OPP-006:hermes_evidence, OPP-007:hermes_evidence, OPP-008:hermes_evidence, OPP-009:hermes_evidence, OPP-010:hermes_evidence, PROP-001:hermes_evidence, PROP-002:hermes_evidence, PROP-003:hermes_evidence, PROP-004:hermes_evidence, PROP-005:hermes_evidence, PROP-006:hermes_evidence, PROP-007:hermes_evidence, REF-001:hermes_evidence, REF-002:hermes_evidence, REF-003:hermes_evidence, REF-004:hermes_evidence, REF-005:hermes_evidence, REF-006:hermes_evidence, CAM-001:hermes_evidence, CAM-002:hermes_evidence, CAM-003:hermes_evidence, CAM-004:hermes_evidence, REL-001:hermes_evidence, REL-002:hermes_evidence, REL-003:hermes_evidence
- RP09.P08.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for CRM And Business Development: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H09 | Claude: C09
- RP09.P08.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for CRM And Business Development: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H09 | Claude: C09

#### RP09.P09: Claude Cross Validation Closeout

- RP09.P09.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for CRM And Business Development: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H09 | Claude: C09
- RP09.P09.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for CRM And Business Development: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H09 | Claude: C09
- RP09.P09.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for CRM And Business Development: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H09 | Claude: C09
- RP09.P09.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for CRM And Business Development: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H09 | Claude: C09
- RP09.P09.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for CRM And Business Development: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H09 | Claude: C09
- RP09.P09.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for CRM And Business Development: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H09 | Claude: C09
- RP09.P09.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for CRM And Business Development: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H09 | Claude: C09
- RP09.P09.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for CRM And Business Development: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H09 | Claude: C09
- RP09.P09.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for CRM And Business Development: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H09 | Claude: C09
- RP09.P09.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for CRM And Business Development: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H09 | Claude: C09 | Reqs: LEAD-001:claude_review, LEAD-002:claude_review, LEAD-003:claude_review, LEAD-004:claude_review, LEAD-005:claude_review, OPP-001:claude_review, OPP-002:claude_review, OPP-003:claude_review, OPP-004:claude_review, OPP-005:claude_review, OPP-006:claude_review, OPP-007:claude_review, OPP-008:claude_review, OPP-009:claude_review, OPP-010:claude_review, PROP-001:claude_review, PROP-002:claude_review, PROP-003:claude_review, PROP-004:claude_review, PROP-005:claude_review, PROP-006:claude_review, PROP-007:claude_review, REF-001:claude_review, REF-002:claude_review, REF-003:claude_review, REF-004:claude_review, REF-005:claude_review, REF-006:claude_review, CAM-001:claude_review, CAM-002:claude_review, CAM-003:claude_review, CAM-004:claude_review, REL-001:claude_review, REL-002:claude_review, REL-003:claude_review
- RP09.P09.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for CRM And Business Development: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H09 | Claude: C09


### RP10: Intake Conflict Engagement

Scope: ConflictCheck, ConflictHit, Waiver, Engagement, Fee Terms

#### RP10.P00: Contract And Acceptance Baseline

- RP10.P00.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Intake Conflict Engagement: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H10 | Claude: C10
- RP10.P00.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Intake Conflict Engagement: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H10 | Claude: C10 | Reqs: CONF-001:contract, CONF-002:contract, CONF-003:contract, CONF-004:contract, CONF-005:contract, CONF-006:contract, CONF-007:contract, CONF-008:contract, CONF-009:contract, ENG-001:contract, ENG-002:contract, ENG-003:contract, ENG-004:contract, ENG-005:contract, ENG-006:contract, ENG-007:contract, ENG-008:contract
- RP10.P00.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Intake Conflict Engagement: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H10 | Claude: C10
- RP10.P00.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Intake Conflict Engagement: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H10 | Claude: C10
- RP10.P00.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Intake Conflict Engagement: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H10 | Claude: C10
- RP10.P00.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Intake Conflict Engagement: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H10 | Claude: C10
- RP10.P00.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Intake Conflict Engagement: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H10 | Claude: C10
- RP10.P00.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Intake Conflict Engagement: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H10 | Claude: C10
- RP10.P00.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Intake Conflict Engagement: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H10 | Claude: C10
- RP10.P00.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Intake Conflict Engagement: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H10 | Claude: C10
- RP10.P00.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Intake Conflict Engagement: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H10 | Claude: C10

#### RP10.P01: Domain Model

- RP10.P01.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Intake Conflict Engagement: Domain Model. | Commands: npm run validate | Hermes: H10 | Claude: C10
- RP10.P01.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Intake Conflict Engagement: Domain Model. | Commands: npm run validate | Hermes: H10 | Claude: C10
- RP10.P01.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Intake Conflict Engagement: Domain Model. | Commands: npm run validate | Hermes: H10 | Claude: C10
- RP10.P01.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Intake Conflict Engagement: Domain Model. | Commands: npm run validate | Hermes: H10 | Claude: C10
- RP10.P01.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Intake Conflict Engagement: Domain Model. | Commands: npm run validate | Hermes: H10 | Claude: C10
- RP10.P01.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Intake Conflict Engagement: Domain Model. | Commands: npm run validate | Hermes: H10 | Claude: C10
- RP10.P01.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Intake Conflict Engagement: Domain Model. | Commands: npm run validate | Hermes: H10 | Claude: C10
- RP10.P01.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Intake Conflict Engagement: Domain Model. | Commands: npm run validate | Hermes: H10 | Claude: C10
- RP10.P01.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Intake Conflict Engagement: Domain Model. | Commands: npm run validate | Hermes: H10 | Claude: C10
- RP10.P01.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Intake Conflict Engagement: Domain Model. | Commands: npm run validate | Hermes: H10 | Claude: C10
- RP10.P01.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Intake Conflict Engagement: Domain Model. | Commands: npm run validate | Hermes: H10 | Claude: C10

#### RP10.P02: Service Logic

- RP10.P02.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Intake Conflict Engagement: Service Logic. | Commands: npm run validate, npm test | Hermes: H10 | Claude: C10
- RP10.P02.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Intake Conflict Engagement: Service Logic. | Commands: npm run validate, npm test | Hermes: H10 | Claude: C10
- RP10.P02.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Intake Conflict Engagement: Service Logic. | Commands: npm run validate, npm test | Hermes: H10 | Claude: C10
- RP10.P02.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Intake Conflict Engagement: Service Logic. | Commands: npm run validate, npm test | Hermes: H10 | Claude: C10 | Reqs: CONF-001:primary_implementation, CONF-002:primary_implementation, CONF-003:primary_implementation, CONF-004:primary_implementation, CONF-005:primary_implementation, CONF-006:primary_implementation, CONF-007:primary_implementation, CONF-008:primary_implementation, CONF-009:primary_implementation, ENG-001:primary_implementation, ENG-002:primary_implementation, ENG-003:primary_implementation, ENG-004:primary_implementation, ENG-005:primary_implementation, ENG-006:primary_implementation, ENG-007:primary_implementation, ENG-008:primary_implementation
- RP10.P02.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Intake Conflict Engagement: Service Logic. | Commands: npm run validate, npm test | Hermes: H10 | Claude: C10
- RP10.P02.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Intake Conflict Engagement: Service Logic. | Commands: npm run validate, npm test | Hermes: H10 | Claude: C10
- RP10.P02.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Intake Conflict Engagement: Service Logic. | Commands: npm run validate, npm test | Hermes: H10 | Claude: C10
- RP10.P02.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Intake Conflict Engagement: Service Logic. | Commands: npm run validate, npm test | Hermes: H10 | Claude: C10
- RP10.P02.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Intake Conflict Engagement: Service Logic. | Commands: npm run validate, npm test | Hermes: H10 | Claude: C10
- RP10.P02.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Intake Conflict Engagement: Service Logic. | Commands: npm run validate, npm test | Hermes: H10 | Claude: C10
- RP10.P02.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Intake Conflict Engagement: Service Logic. | Commands: npm run validate, npm test | Hermes: H10 | Claude: C10

#### RP10.P03: API And Interface

- RP10.P03.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Intake Conflict Engagement: API And Interface. | Commands: npm run validate, npm test | Hermes: H10 | Claude: C10
- RP10.P03.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Intake Conflict Engagement: API And Interface. | Commands: npm run validate, npm test | Hermes: H10 | Claude: C10
- RP10.P03.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Intake Conflict Engagement: API And Interface. | Commands: npm run validate, npm test | Hermes: H10 | Claude: C10
- RP10.P03.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Intake Conflict Engagement: API And Interface. | Commands: npm run validate, npm test | Hermes: H10 | Claude: C10
- RP10.P03.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Intake Conflict Engagement: API And Interface. | Commands: npm run validate, npm test | Hermes: H10 | Claude: C10
- RP10.P03.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Intake Conflict Engagement: API And Interface. | Commands: npm run validate, npm test | Hermes: H10 | Claude: C10
- RP10.P03.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Intake Conflict Engagement: API And Interface. | Commands: npm run validate, npm test | Hermes: H10 | Claude: C10
- RP10.P03.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Intake Conflict Engagement: API And Interface. | Commands: npm run validate, npm test | Hermes: H10 | Claude: C10
- RP10.P03.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Intake Conflict Engagement: API And Interface. | Commands: npm run validate, npm test | Hermes: H10 | Claude: C10
- RP10.P03.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Intake Conflict Engagement: API And Interface. | Commands: npm run validate, npm test | Hermes: H10 | Claude: C10
- RP10.P03.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Intake Conflict Engagement: API And Interface. | Commands: npm run validate, npm test | Hermes: H10 | Claude: C10

#### RP10.P04: UI And Operator Surface

- RP10.P04.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Intake Conflict Engagement: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H10 | Claude: C10
- RP10.P04.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Intake Conflict Engagement: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H10 | Claude: C10
- RP10.P04.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Intake Conflict Engagement: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H10 | Claude: C10
- RP10.P04.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Intake Conflict Engagement: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H10 | Claude: C10
- RP10.P04.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Intake Conflict Engagement: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H10 | Claude: C10
- RP10.P04.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Intake Conflict Engagement: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H10 | Claude: C10
- RP10.P04.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Intake Conflict Engagement: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H10 | Claude: C10
- RP10.P04.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Intake Conflict Engagement: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H10 | Claude: C10
- RP10.P04.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Intake Conflict Engagement: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H10 | Claude: C10
- RP10.P04.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Intake Conflict Engagement: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H10 | Claude: C10
- RP10.P04.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Intake Conflict Engagement: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H10 | Claude: C10

#### RP10.P05: Fixtures And Golden Cases

- RP10.P05.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Intake Conflict Engagement: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H10 | Claude: C10
- RP10.P05.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Intake Conflict Engagement: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H10 | Claude: C10
- RP10.P05.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Intake Conflict Engagement: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H10 | Claude: C10
- RP10.P05.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Intake Conflict Engagement: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H10 | Claude: C10
- RP10.P05.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Intake Conflict Engagement: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H10 | Claude: C10
- RP10.P05.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Intake Conflict Engagement: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H10 | Claude: C10
- RP10.P05.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Intake Conflict Engagement: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H10 | Claude: C10
- RP10.P05.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Intake Conflict Engagement: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H10 | Claude: C10 | Reqs: CONF-001:test, CONF-002:test, CONF-003:test, CONF-004:test, CONF-005:test, CONF-006:test, CONF-007:test, CONF-008:test, CONF-009:test, ENG-001:test, ENG-002:test, ENG-003:test, ENG-004:test, ENG-005:test, ENG-006:test, ENG-007:test, ENG-008:test
- RP10.P05.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Intake Conflict Engagement: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H10 | Claude: C10
- RP10.P05.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Intake Conflict Engagement: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H10 | Claude: C10
- RP10.P05.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Intake Conflict Engagement: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H10 | Claude: C10

#### RP10.P06: Permission Audit Integration

- RP10.P06.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Intake Conflict Engagement: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H10 | Claude: C10
- RP10.P06.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Intake Conflict Engagement: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H10 | Claude: C10
- RP10.P06.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Intake Conflict Engagement: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H10 | Claude: C10
- RP10.P06.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Intake Conflict Engagement: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H10 | Claude: C10
- RP10.P06.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Intake Conflict Engagement: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H10 | Claude: C10
- RP10.P06.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Intake Conflict Engagement: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H10 | Claude: C10
- RP10.P06.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Intake Conflict Engagement: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H10 | Claude: C10
- RP10.P06.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Intake Conflict Engagement: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H10 | Claude: C10
- RP10.P06.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Intake Conflict Engagement: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H10 | Claude: C10
- RP10.P06.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Intake Conflict Engagement: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H10 | Claude: C10
- RP10.P06.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Intake Conflict Engagement: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H10 | Claude: C10

#### RP10.P07: Failure Edge And Recovery

- RP10.P07.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Intake Conflict Engagement: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H10 | Claude: C10
- RP10.P07.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Intake Conflict Engagement: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H10 | Claude: C10
- RP10.P07.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Intake Conflict Engagement: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H10 | Claude: C10
- RP10.P07.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Intake Conflict Engagement: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H10 | Claude: C10
- RP10.P07.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Intake Conflict Engagement: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H10 | Claude: C10
- RP10.P07.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Intake Conflict Engagement: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H10 | Claude: C10
- RP10.P07.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Intake Conflict Engagement: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H10 | Claude: C10
- RP10.P07.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Intake Conflict Engagement: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H10 | Claude: C10
- RP10.P07.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Intake Conflict Engagement: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H10 | Claude: C10
- RP10.P07.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Intake Conflict Engagement: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H10 | Claude: C10
- RP10.P07.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Intake Conflict Engagement: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H10 | Claude: C10

#### RP10.P08: Hermes Validation Binding

- RP10.P08.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Intake Conflict Engagement: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H10 | Claude: C10
- RP10.P08.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Intake Conflict Engagement: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H10 | Claude: C10
- RP10.P08.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Intake Conflict Engagement: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H10 | Claude: C10
- RP10.P08.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Intake Conflict Engagement: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H10 | Claude: C10
- RP10.P08.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Intake Conflict Engagement: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H10 | Claude: C10
- RP10.P08.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Intake Conflict Engagement: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H10 | Claude: C10
- RP10.P08.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Intake Conflict Engagement: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H10 | Claude: C10
- RP10.P08.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Intake Conflict Engagement: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H10 | Claude: C10
- RP10.P08.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Intake Conflict Engagement: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H10 | Claude: C10 | Reqs: CONF-001:hermes_evidence, CONF-002:hermes_evidence, CONF-003:hermes_evidence, CONF-004:hermes_evidence, CONF-005:hermes_evidence, CONF-006:hermes_evidence, CONF-007:hermes_evidence, CONF-008:hermes_evidence, CONF-009:hermes_evidence, ENG-001:hermes_evidence, ENG-002:hermes_evidence, ENG-003:hermes_evidence, ENG-004:hermes_evidence, ENG-005:hermes_evidence, ENG-006:hermes_evidence, ENG-007:hermes_evidence, ENG-008:hermes_evidence
- RP10.P08.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Intake Conflict Engagement: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H10 | Claude: C10
- RP10.P08.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Intake Conflict Engagement: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H10 | Claude: C10

#### RP10.P09: Claude Cross Validation Closeout

- RP10.P09.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Intake Conflict Engagement: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H10 | Claude: C10
- RP10.P09.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Intake Conflict Engagement: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H10 | Claude: C10
- RP10.P09.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Intake Conflict Engagement: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H10 | Claude: C10
- RP10.P09.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Intake Conflict Engagement: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H10 | Claude: C10
- RP10.P09.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Intake Conflict Engagement: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H10 | Claude: C10
- RP10.P09.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Intake Conflict Engagement: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H10 | Claude: C10
- RP10.P09.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Intake Conflict Engagement: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H10 | Claude: C10
- RP10.P09.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Intake Conflict Engagement: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H10 | Claude: C10
- RP10.P09.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Intake Conflict Engagement: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H10 | Claude: C10
- RP10.P09.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Intake Conflict Engagement: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H10 | Claude: C10 | Reqs: CONF-001:claude_review, CONF-002:claude_review, CONF-003:claude_review, CONF-004:claude_review, CONF-005:claude_review, CONF-006:claude_review, CONF-007:claude_review, CONF-008:claude_review, CONF-009:claude_review, ENG-001:claude_review, ENG-002:claude_review, ENG-003:claude_review, ENG-004:claude_review, ENG-005:claude_review, ENG-006:claude_review, ENG-007:claude_review, ENG-008:claude_review
- RP10.P09.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Intake Conflict Engagement: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H10 | Claude: C10


### RP11: Time Expense Disbursement

Scope: TimeEntry, rate card, expense, disbursement, evidence documents

#### RP11.P00: Contract And Acceptance Baseline

- RP11.P00.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Time Expense Disbursement: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H11 | Claude: C11
- RP11.P00.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Time Expense Disbursement: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H11 | Claude: C11 | Reqs: TIME-001:contract, TIME-002:contract, TIME-003:contract, TIME-004:contract, TIME-005:contract, TIME-006:contract, TIME-007:contract, TIME-008:contract, TIME-009:contract, TIME-010:contract, EXP-001:contract, EXP-002:contract, EXP-003:contract, EXP-004:contract, EXP-005:contract, EXP-006:contract, EXP-007:contract, EXP-008:contract, EXP-009:contract
- RP11.P00.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Time Expense Disbursement: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H11 | Claude: C11
- RP11.P00.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Time Expense Disbursement: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H11 | Claude: C11
- RP11.P00.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Time Expense Disbursement: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H11 | Claude: C11
- RP11.P00.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Time Expense Disbursement: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H11 | Claude: C11
- RP11.P00.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Time Expense Disbursement: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H11 | Claude: C11
- RP11.P00.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Time Expense Disbursement: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H11 | Claude: C11
- RP11.P00.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Time Expense Disbursement: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H11 | Claude: C11
- RP11.P00.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Time Expense Disbursement: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H11 | Claude: C11
- RP11.P00.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Time Expense Disbursement: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H11 | Claude: C11

#### RP11.P01: Domain Model

- RP11.P01.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Time Expense Disbursement: Domain Model. | Commands: npm run validate | Hermes: H11 | Claude: C11
- RP11.P01.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Time Expense Disbursement: Domain Model. | Commands: npm run validate | Hermes: H11 | Claude: C11
- RP11.P01.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Time Expense Disbursement: Domain Model. | Commands: npm run validate | Hermes: H11 | Claude: C11
- RP11.P01.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Time Expense Disbursement: Domain Model. | Commands: npm run validate | Hermes: H11 | Claude: C11
- RP11.P01.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Time Expense Disbursement: Domain Model. | Commands: npm run validate | Hermes: H11 | Claude: C11
- RP11.P01.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Time Expense Disbursement: Domain Model. | Commands: npm run validate | Hermes: H11 | Claude: C11
- RP11.P01.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Time Expense Disbursement: Domain Model. | Commands: npm run validate | Hermes: H11 | Claude: C11
- RP11.P01.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Time Expense Disbursement: Domain Model. | Commands: npm run validate | Hermes: H11 | Claude: C11
- RP11.P01.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Time Expense Disbursement: Domain Model. | Commands: npm run validate | Hermes: H11 | Claude: C11
- RP11.P01.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Time Expense Disbursement: Domain Model. | Commands: npm run validate | Hermes: H11 | Claude: C11
- RP11.P01.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Time Expense Disbursement: Domain Model. | Commands: npm run validate | Hermes: H11 | Claude: C11

#### RP11.P02: Service Logic

- RP11.P02.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Time Expense Disbursement: Service Logic. | Commands: npm run validate, npm test | Hermes: H11 | Claude: C11
- RP11.P02.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Time Expense Disbursement: Service Logic. | Commands: npm run validate, npm test | Hermes: H11 | Claude: C11
- RP11.P02.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Time Expense Disbursement: Service Logic. | Commands: npm run validate, npm test | Hermes: H11 | Claude: C11
- RP11.P02.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Time Expense Disbursement: Service Logic. | Commands: npm run validate, npm test | Hermes: H11 | Claude: C11 | Reqs: TIME-001:primary_implementation, TIME-002:primary_implementation, TIME-003:primary_implementation, TIME-004:primary_implementation, TIME-005:primary_implementation, TIME-006:primary_implementation, TIME-007:primary_implementation, TIME-008:primary_implementation, TIME-009:primary_implementation, TIME-010:primary_implementation, EXP-001:primary_implementation, EXP-002:primary_implementation, EXP-003:primary_implementation, EXP-004:primary_implementation, EXP-005:primary_implementation, EXP-006:primary_implementation, EXP-007:primary_implementation, EXP-008:primary_implementation, EXP-009:primary_implementation
- RP11.P02.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Time Expense Disbursement: Service Logic. | Commands: npm run validate, npm test | Hermes: H11 | Claude: C11
- RP11.P02.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Time Expense Disbursement: Service Logic. | Commands: npm run validate, npm test | Hermes: H11 | Claude: C11
- RP11.P02.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Time Expense Disbursement: Service Logic. | Commands: npm run validate, npm test | Hermes: H11 | Claude: C11
- RP11.P02.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Time Expense Disbursement: Service Logic. | Commands: npm run validate, npm test | Hermes: H11 | Claude: C11
- RP11.P02.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Time Expense Disbursement: Service Logic. | Commands: npm run validate, npm test | Hermes: H11 | Claude: C11
- RP11.P02.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Time Expense Disbursement: Service Logic. | Commands: npm run validate, npm test | Hermes: H11 | Claude: C11
- RP11.P02.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Time Expense Disbursement: Service Logic. | Commands: npm run validate, npm test | Hermes: H11 | Claude: C11

#### RP11.P03: API And Interface

- RP11.P03.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Time Expense Disbursement: API And Interface. | Commands: npm run validate, npm test | Hermes: H11 | Claude: C11
- RP11.P03.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Time Expense Disbursement: API And Interface. | Commands: npm run validate, npm test | Hermes: H11 | Claude: C11
- RP11.P03.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Time Expense Disbursement: API And Interface. | Commands: npm run validate, npm test | Hermes: H11 | Claude: C11
- RP11.P03.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Time Expense Disbursement: API And Interface. | Commands: npm run validate, npm test | Hermes: H11 | Claude: C11
- RP11.P03.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Time Expense Disbursement: API And Interface. | Commands: npm run validate, npm test | Hermes: H11 | Claude: C11
- RP11.P03.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Time Expense Disbursement: API And Interface. | Commands: npm run validate, npm test | Hermes: H11 | Claude: C11
- RP11.P03.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Time Expense Disbursement: API And Interface. | Commands: npm run validate, npm test | Hermes: H11 | Claude: C11
- RP11.P03.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Time Expense Disbursement: API And Interface. | Commands: npm run validate, npm test | Hermes: H11 | Claude: C11
- RP11.P03.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Time Expense Disbursement: API And Interface. | Commands: npm run validate, npm test | Hermes: H11 | Claude: C11
- RP11.P03.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Time Expense Disbursement: API And Interface. | Commands: npm run validate, npm test | Hermes: H11 | Claude: C11
- RP11.P03.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Time Expense Disbursement: API And Interface. | Commands: npm run validate, npm test | Hermes: H11 | Claude: C11

#### RP11.P04: UI And Operator Surface

- RP11.P04.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Time Expense Disbursement: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H11 | Claude: C11
- RP11.P04.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Time Expense Disbursement: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H11 | Claude: C11
- RP11.P04.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Time Expense Disbursement: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H11 | Claude: C11
- RP11.P04.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Time Expense Disbursement: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H11 | Claude: C11
- RP11.P04.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Time Expense Disbursement: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H11 | Claude: C11
- RP11.P04.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Time Expense Disbursement: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H11 | Claude: C11
- RP11.P04.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Time Expense Disbursement: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H11 | Claude: C11
- RP11.P04.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Time Expense Disbursement: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H11 | Claude: C11
- RP11.P04.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Time Expense Disbursement: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H11 | Claude: C11
- RP11.P04.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Time Expense Disbursement: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H11 | Claude: C11
- RP11.P04.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Time Expense Disbursement: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H11 | Claude: C11

#### RP11.P05: Fixtures And Golden Cases

- RP11.P05.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Time Expense Disbursement: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H11 | Claude: C11
- RP11.P05.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Time Expense Disbursement: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H11 | Claude: C11
- RP11.P05.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Time Expense Disbursement: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H11 | Claude: C11
- RP11.P05.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Time Expense Disbursement: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H11 | Claude: C11
- RP11.P05.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Time Expense Disbursement: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H11 | Claude: C11
- RP11.P05.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Time Expense Disbursement: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H11 | Claude: C11
- RP11.P05.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Time Expense Disbursement: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H11 | Claude: C11
- RP11.P05.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Time Expense Disbursement: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H11 | Claude: C11 | Reqs: TIME-001:test, TIME-002:test, TIME-003:test, TIME-004:test, TIME-005:test, TIME-006:test, TIME-007:test, TIME-008:test, TIME-009:test, TIME-010:test, EXP-001:test, EXP-002:test, EXP-003:test, EXP-004:test, EXP-005:test, EXP-006:test, EXP-007:test, EXP-008:test, EXP-009:test
- RP11.P05.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Time Expense Disbursement: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H11 | Claude: C11
- RP11.P05.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Time Expense Disbursement: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H11 | Claude: C11
- RP11.P05.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Time Expense Disbursement: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H11 | Claude: C11

#### RP11.P06: Permission Audit Integration

- RP11.P06.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Time Expense Disbursement: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H11 | Claude: C11
- RP11.P06.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Time Expense Disbursement: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H11 | Claude: C11
- RP11.P06.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Time Expense Disbursement: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H11 | Claude: C11
- RP11.P06.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Time Expense Disbursement: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H11 | Claude: C11
- RP11.P06.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Time Expense Disbursement: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H11 | Claude: C11
- RP11.P06.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Time Expense Disbursement: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H11 | Claude: C11
- RP11.P06.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Time Expense Disbursement: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H11 | Claude: C11
- RP11.P06.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Time Expense Disbursement: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H11 | Claude: C11
- RP11.P06.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Time Expense Disbursement: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H11 | Claude: C11
- RP11.P06.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Time Expense Disbursement: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H11 | Claude: C11
- RP11.P06.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Time Expense Disbursement: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H11 | Claude: C11

#### RP11.P07: Failure Edge And Recovery

- RP11.P07.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Time Expense Disbursement: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H11 | Claude: C11
- RP11.P07.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Time Expense Disbursement: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H11 | Claude: C11
- RP11.P07.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Time Expense Disbursement: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H11 | Claude: C11
- RP11.P07.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Time Expense Disbursement: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H11 | Claude: C11
- RP11.P07.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Time Expense Disbursement: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H11 | Claude: C11
- RP11.P07.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Time Expense Disbursement: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H11 | Claude: C11
- RP11.P07.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Time Expense Disbursement: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H11 | Claude: C11
- RP11.P07.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Time Expense Disbursement: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H11 | Claude: C11
- RP11.P07.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Time Expense Disbursement: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H11 | Claude: C11
- RP11.P07.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Time Expense Disbursement: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H11 | Claude: C11
- RP11.P07.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Time Expense Disbursement: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H11 | Claude: C11

#### RP11.P08: Hermes Validation Binding

- RP11.P08.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Time Expense Disbursement: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H11 | Claude: C11
- RP11.P08.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Time Expense Disbursement: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H11 | Claude: C11
- RP11.P08.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Time Expense Disbursement: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H11 | Claude: C11
- RP11.P08.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Time Expense Disbursement: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H11 | Claude: C11
- RP11.P08.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Time Expense Disbursement: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H11 | Claude: C11
- RP11.P08.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Time Expense Disbursement: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H11 | Claude: C11
- RP11.P08.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Time Expense Disbursement: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H11 | Claude: C11
- RP11.P08.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Time Expense Disbursement: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H11 | Claude: C11
- RP11.P08.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Time Expense Disbursement: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H11 | Claude: C11 | Reqs: TIME-001:hermes_evidence, TIME-002:hermes_evidence, TIME-003:hermes_evidence, TIME-004:hermes_evidence, TIME-005:hermes_evidence, TIME-006:hermes_evidence, TIME-007:hermes_evidence, TIME-008:hermes_evidence, TIME-009:hermes_evidence, TIME-010:hermes_evidence, EXP-001:hermes_evidence, EXP-002:hermes_evidence, EXP-003:hermes_evidence, EXP-004:hermes_evidence, EXP-005:hermes_evidence, EXP-006:hermes_evidence, EXP-007:hermes_evidence, EXP-008:hermes_evidence, EXP-009:hermes_evidence
- RP11.P08.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Time Expense Disbursement: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H11 | Claude: C11
- RP11.P08.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Time Expense Disbursement: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H11 | Claude: C11

#### RP11.P09: Claude Cross Validation Closeout

- RP11.P09.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Time Expense Disbursement: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H11 | Claude: C11
- RP11.P09.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Time Expense Disbursement: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H11 | Claude: C11
- RP11.P09.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Time Expense Disbursement: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H11 | Claude: C11
- RP11.P09.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Time Expense Disbursement: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H11 | Claude: C11
- RP11.P09.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Time Expense Disbursement: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H11 | Claude: C11
- RP11.P09.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Time Expense Disbursement: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H11 | Claude: C11
- RP11.P09.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Time Expense Disbursement: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H11 | Claude: C11
- RP11.P09.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Time Expense Disbursement: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H11 | Claude: C11
- RP11.P09.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Time Expense Disbursement: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H11 | Claude: C11
- RP11.P09.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Time Expense Disbursement: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H11 | Claude: C11 | Reqs: TIME-001:claude_review, TIME-002:claude_review, TIME-003:claude_review, TIME-004:claude_review, TIME-005:claude_review, TIME-006:claude_review, TIME-007:claude_review, TIME-008:claude_review, TIME-009:claude_review, TIME-010:claude_review, EXP-001:claude_review, EXP-002:claude_review, EXP-003:claude_review, EXP-004:claude_review, EXP-005:claude_review, EXP-006:claude_review, EXP-007:claude_review, EXP-008:claude_review, EXP-009:claude_review
- RP11.P09.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Time Expense Disbursement: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H11 | Claude: C11


### RP12: Billing And Invoicing

Scope: Proforma, Invoice, TaxInvoice, write-down, write-off

#### RP12.P00: Contract And Acceptance Baseline

- RP12.P00.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Billing And Invoicing: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H12 | Claude: C12
- RP12.P00.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Billing And Invoicing: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H12 | Claude: C12 | Reqs: BILL-001:contract, BILL-002:contract, BILL-003:contract, BILL-004:contract, BILL-005:contract, BILL-006:contract, BILL-007:contract, BILL-008:contract, BILL-009:contract, BILL-010:contract, BILL-011:contract, BILL-012:contract, NARR-016:contract
- RP12.P00.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Billing And Invoicing: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H12 | Claude: C12
- RP12.P00.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Billing And Invoicing: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H12 | Claude: C12
- RP12.P00.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Billing And Invoicing: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H12 | Claude: C12
- RP12.P00.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Billing And Invoicing: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H12 | Claude: C12
- RP12.P00.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Billing And Invoicing: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H12 | Claude: C12
- RP12.P00.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Billing And Invoicing: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H12 | Claude: C12
- RP12.P00.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Billing And Invoicing: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H12 | Claude: C12
- RP12.P00.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Billing And Invoicing: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H12 | Claude: C12
- RP12.P00.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Billing And Invoicing: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H12 | Claude: C12

#### RP12.P01: Domain Model

- RP12.P01.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Billing And Invoicing: Domain Model. | Commands: npm run validate | Hermes: H12 | Claude: C12
- RP12.P01.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Billing And Invoicing: Domain Model. | Commands: npm run validate | Hermes: H12 | Claude: C12
- RP12.P01.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Billing And Invoicing: Domain Model. | Commands: npm run validate | Hermes: H12 | Claude: C12
- RP12.P01.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Billing And Invoicing: Domain Model. | Commands: npm run validate | Hermes: H12 | Claude: C12
- RP12.P01.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Billing And Invoicing: Domain Model. | Commands: npm run validate | Hermes: H12 | Claude: C12
- RP12.P01.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Billing And Invoicing: Domain Model. | Commands: npm run validate | Hermes: H12 | Claude: C12
- RP12.P01.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Billing And Invoicing: Domain Model. | Commands: npm run validate | Hermes: H12 | Claude: C12
- RP12.P01.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Billing And Invoicing: Domain Model. | Commands: npm run validate | Hermes: H12 | Claude: C12
- RP12.P01.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Billing And Invoicing: Domain Model. | Commands: npm run validate | Hermes: H12 | Claude: C12
- RP12.P01.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Billing And Invoicing: Domain Model. | Commands: npm run validate | Hermes: H12 | Claude: C12
- RP12.P01.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Billing And Invoicing: Domain Model. | Commands: npm run validate | Hermes: H12 | Claude: C12

#### RP12.P02: Service Logic

- RP12.P02.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Billing And Invoicing: Service Logic. | Commands: npm run validate, npm test | Hermes: H12 | Claude: C12
- RP12.P02.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Billing And Invoicing: Service Logic. | Commands: npm run validate, npm test | Hermes: H12 | Claude: C12
- RP12.P02.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Billing And Invoicing: Service Logic. | Commands: npm run validate, npm test | Hermes: H12 | Claude: C12
- RP12.P02.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Billing And Invoicing: Service Logic. | Commands: npm run validate, npm test | Hermes: H12 | Claude: C12 | Reqs: BILL-001:primary_implementation, BILL-002:primary_implementation, BILL-003:primary_implementation, BILL-004:primary_implementation, BILL-005:primary_implementation, BILL-006:primary_implementation, BILL-007:primary_implementation, BILL-008:primary_implementation, BILL-009:primary_implementation, BILL-010:primary_implementation, BILL-011:primary_implementation, BILL-012:primary_implementation, NARR-016:primary_implementation
- RP12.P02.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Billing And Invoicing: Service Logic. | Commands: npm run validate, npm test | Hermes: H12 | Claude: C12
- RP12.P02.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Billing And Invoicing: Service Logic. | Commands: npm run validate, npm test | Hermes: H12 | Claude: C12
- RP12.P02.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Billing And Invoicing: Service Logic. | Commands: npm run validate, npm test | Hermes: H12 | Claude: C12
- RP12.P02.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Billing And Invoicing: Service Logic. | Commands: npm run validate, npm test | Hermes: H12 | Claude: C12
- RP12.P02.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Billing And Invoicing: Service Logic. | Commands: npm run validate, npm test | Hermes: H12 | Claude: C12
- RP12.P02.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Billing And Invoicing: Service Logic. | Commands: npm run validate, npm test | Hermes: H12 | Claude: C12
- RP12.P02.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Billing And Invoicing: Service Logic. | Commands: npm run validate, npm test | Hermes: H12 | Claude: C12

#### RP12.P03: API And Interface

- RP12.P03.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Billing And Invoicing: API And Interface. | Commands: npm run validate, npm test | Hermes: H12 | Claude: C12
- RP12.P03.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Billing And Invoicing: API And Interface. | Commands: npm run validate, npm test | Hermes: H12 | Claude: C12
- RP12.P03.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Billing And Invoicing: API And Interface. | Commands: npm run validate, npm test | Hermes: H12 | Claude: C12
- RP12.P03.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Billing And Invoicing: API And Interface. | Commands: npm run validate, npm test | Hermes: H12 | Claude: C12
- RP12.P03.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Billing And Invoicing: API And Interface. | Commands: npm run validate, npm test | Hermes: H12 | Claude: C12
- RP12.P03.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Billing And Invoicing: API And Interface. | Commands: npm run validate, npm test | Hermes: H12 | Claude: C12
- RP12.P03.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Billing And Invoicing: API And Interface. | Commands: npm run validate, npm test | Hermes: H12 | Claude: C12
- RP12.P03.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Billing And Invoicing: API And Interface. | Commands: npm run validate, npm test | Hermes: H12 | Claude: C12
- RP12.P03.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Billing And Invoicing: API And Interface. | Commands: npm run validate, npm test | Hermes: H12 | Claude: C12
- RP12.P03.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Billing And Invoicing: API And Interface. | Commands: npm run validate, npm test | Hermes: H12 | Claude: C12
- RP12.P03.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Billing And Invoicing: API And Interface. | Commands: npm run validate, npm test | Hermes: H12 | Claude: C12

#### RP12.P04: UI And Operator Surface

- RP12.P04.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Billing And Invoicing: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H12 | Claude: C12
- RP12.P04.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Billing And Invoicing: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H12 | Claude: C12
- RP12.P04.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Billing And Invoicing: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H12 | Claude: C12
- RP12.P04.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Billing And Invoicing: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H12 | Claude: C12
- RP12.P04.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Billing And Invoicing: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H12 | Claude: C12
- RP12.P04.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Billing And Invoicing: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H12 | Claude: C12
- RP12.P04.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Billing And Invoicing: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H12 | Claude: C12
- RP12.P04.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Billing And Invoicing: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H12 | Claude: C12
- RP12.P04.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Billing And Invoicing: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H12 | Claude: C12
- RP12.P04.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Billing And Invoicing: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H12 | Claude: C12
- RP12.P04.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Billing And Invoicing: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H12 | Claude: C12

#### RP12.P05: Fixtures And Golden Cases

- RP12.P05.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Billing And Invoicing: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H12 | Claude: C12
- RP12.P05.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Billing And Invoicing: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H12 | Claude: C12
- RP12.P05.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Billing And Invoicing: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H12 | Claude: C12
- RP12.P05.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Billing And Invoicing: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H12 | Claude: C12
- RP12.P05.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Billing And Invoicing: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H12 | Claude: C12
- RP12.P05.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Billing And Invoicing: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H12 | Claude: C12
- RP12.P05.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Billing And Invoicing: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H12 | Claude: C12
- RP12.P05.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Billing And Invoicing: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H12 | Claude: C12 | Reqs: BILL-001:test, BILL-002:test, BILL-003:test, BILL-004:test, BILL-005:test, BILL-006:test, BILL-007:test, BILL-008:test, BILL-009:test, BILL-010:test, BILL-011:test, BILL-012:test, NARR-016:test
- RP12.P05.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Billing And Invoicing: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H12 | Claude: C12
- RP12.P05.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Billing And Invoicing: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H12 | Claude: C12
- RP12.P05.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Billing And Invoicing: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H12 | Claude: C12

#### RP12.P06: Permission Audit Integration

- RP12.P06.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Billing And Invoicing: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H12 | Claude: C12
- RP12.P06.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Billing And Invoicing: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H12 | Claude: C12
- RP12.P06.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Billing And Invoicing: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H12 | Claude: C12
- RP12.P06.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Billing And Invoicing: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H12 | Claude: C12
- RP12.P06.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Billing And Invoicing: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H12 | Claude: C12
- RP12.P06.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Billing And Invoicing: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H12 | Claude: C12
- RP12.P06.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Billing And Invoicing: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H12 | Claude: C12
- RP12.P06.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Billing And Invoicing: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H12 | Claude: C12
- RP12.P06.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Billing And Invoicing: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H12 | Claude: C12
- RP12.P06.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Billing And Invoicing: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H12 | Claude: C12
- RP12.P06.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Billing And Invoicing: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H12 | Claude: C12

#### RP12.P07: Failure Edge And Recovery

- RP12.P07.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Billing And Invoicing: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H12 | Claude: C12
- RP12.P07.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Billing And Invoicing: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H12 | Claude: C12
- RP12.P07.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Billing And Invoicing: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H12 | Claude: C12
- RP12.P07.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Billing And Invoicing: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H12 | Claude: C12
- RP12.P07.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Billing And Invoicing: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H12 | Claude: C12
- RP12.P07.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Billing And Invoicing: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H12 | Claude: C12
- RP12.P07.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Billing And Invoicing: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H12 | Claude: C12
- RP12.P07.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Billing And Invoicing: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H12 | Claude: C12
- RP12.P07.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Billing And Invoicing: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H12 | Claude: C12
- RP12.P07.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Billing And Invoicing: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H12 | Claude: C12
- RP12.P07.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Billing And Invoicing: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H12 | Claude: C12

#### RP12.P08: Hermes Validation Binding

- RP12.P08.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Billing And Invoicing: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H12 | Claude: C12
- RP12.P08.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Billing And Invoicing: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H12 | Claude: C12
- RP12.P08.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Billing And Invoicing: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H12 | Claude: C12
- RP12.P08.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Billing And Invoicing: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H12 | Claude: C12
- RP12.P08.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Billing And Invoicing: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H12 | Claude: C12
- RP12.P08.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Billing And Invoicing: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H12 | Claude: C12
- RP12.P08.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Billing And Invoicing: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H12 | Claude: C12
- RP12.P08.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Billing And Invoicing: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H12 | Claude: C12
- RP12.P08.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Billing And Invoicing: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H12 | Claude: C12 | Reqs: BILL-001:hermes_evidence, BILL-002:hermes_evidence, BILL-003:hermes_evidence, BILL-004:hermes_evidence, BILL-005:hermes_evidence, BILL-006:hermes_evidence, BILL-007:hermes_evidence, BILL-008:hermes_evidence, BILL-009:hermes_evidence, BILL-010:hermes_evidence, BILL-011:hermes_evidence, BILL-012:hermes_evidence, NARR-016:hermes_evidence
- RP12.P08.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Billing And Invoicing: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H12 | Claude: C12
- RP12.P08.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Billing And Invoicing: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H12 | Claude: C12

#### RP12.P09: Claude Cross Validation Closeout

- RP12.P09.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Billing And Invoicing: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H12 | Claude: C12
- RP12.P09.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Billing And Invoicing: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H12 | Claude: C12
- RP12.P09.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Billing And Invoicing: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H12 | Claude: C12
- RP12.P09.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Billing And Invoicing: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H12 | Claude: C12
- RP12.P09.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Billing And Invoicing: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H12 | Claude: C12
- RP12.P09.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Billing And Invoicing: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H12 | Claude: C12
- RP12.P09.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Billing And Invoicing: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H12 | Claude: C12
- RP12.P09.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Billing And Invoicing: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H12 | Claude: C12
- RP12.P09.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Billing And Invoicing: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H12 | Claude: C12
- RP12.P09.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Billing And Invoicing: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H12 | Claude: C12 | Reqs: BILL-001:claude_review, BILL-002:claude_review, BILL-003:claude_review, BILL-004:claude_review, BILL-005:claude_review, BILL-006:claude_review, BILL-007:claude_review, BILL-008:claude_review, BILL-009:claude_review, BILL-010:claude_review, BILL-011:claude_review, BILL-012:claude_review, NARR-016:claude_review
- RP12.P09.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Billing And Invoicing: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H12 | Claude: C12


### RP13: Payments AR Accounting Export

Scope: Payment matching, AR aging, journal entry, VAT export

#### RP13.P00: Contract And Acceptance Baseline

- RP13.P00.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Payments AR Accounting Export: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H13 | Claude: C13
- RP13.P00.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Payments AR Accounting Export: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H13 | Claude: C13 | Reqs: PAY-001:contract, PAY-002:contract, PAY-003:contract, PAY-004:contract, PAY-005:contract, PAY-006:contract, PAY-007:contract, PAY-008:contract, PAY-009:contract, ACC-001:contract, ACC-002:contract, ACC-003:contract, ACC-004:contract, ACC-005:contract, ACC-006:contract, ACC-007:contract
- RP13.P00.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Payments AR Accounting Export: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H13 | Claude: C13
- RP13.P00.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Payments AR Accounting Export: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H13 | Claude: C13
- RP13.P00.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Payments AR Accounting Export: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H13 | Claude: C13
- RP13.P00.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Payments AR Accounting Export: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H13 | Claude: C13
- RP13.P00.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Payments AR Accounting Export: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H13 | Claude: C13
- RP13.P00.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Payments AR Accounting Export: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H13 | Claude: C13
- RP13.P00.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Payments AR Accounting Export: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H13 | Claude: C13
- RP13.P00.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Payments AR Accounting Export: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H13 | Claude: C13
- RP13.P00.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Payments AR Accounting Export: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H13 | Claude: C13

#### RP13.P01: Domain Model

- RP13.P01.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Payments AR Accounting Export: Domain Model. | Commands: npm run validate | Hermes: H13 | Claude: C13
- RP13.P01.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Payments AR Accounting Export: Domain Model. | Commands: npm run validate | Hermes: H13 | Claude: C13
- RP13.P01.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Payments AR Accounting Export: Domain Model. | Commands: npm run validate | Hermes: H13 | Claude: C13
- RP13.P01.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Payments AR Accounting Export: Domain Model. | Commands: npm run validate | Hermes: H13 | Claude: C13
- RP13.P01.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Payments AR Accounting Export: Domain Model. | Commands: npm run validate | Hermes: H13 | Claude: C13
- RP13.P01.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Payments AR Accounting Export: Domain Model. | Commands: npm run validate | Hermes: H13 | Claude: C13
- RP13.P01.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Payments AR Accounting Export: Domain Model. | Commands: npm run validate | Hermes: H13 | Claude: C13
- RP13.P01.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Payments AR Accounting Export: Domain Model. | Commands: npm run validate | Hermes: H13 | Claude: C13
- RP13.P01.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Payments AR Accounting Export: Domain Model. | Commands: npm run validate | Hermes: H13 | Claude: C13
- RP13.P01.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Payments AR Accounting Export: Domain Model. | Commands: npm run validate | Hermes: H13 | Claude: C13
- RP13.P01.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Payments AR Accounting Export: Domain Model. | Commands: npm run validate | Hermes: H13 | Claude: C13

#### RP13.P02: Service Logic

- RP13.P02.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Payments AR Accounting Export: Service Logic. | Commands: npm run validate, npm test | Hermes: H13 | Claude: C13
- RP13.P02.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Payments AR Accounting Export: Service Logic. | Commands: npm run validate, npm test | Hermes: H13 | Claude: C13
- RP13.P02.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Payments AR Accounting Export: Service Logic. | Commands: npm run validate, npm test | Hermes: H13 | Claude: C13
- RP13.P02.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Payments AR Accounting Export: Service Logic. | Commands: npm run validate, npm test | Hermes: H13 | Claude: C13 | Reqs: PAY-001:primary_implementation, PAY-002:primary_implementation, PAY-003:primary_implementation, PAY-004:primary_implementation, PAY-005:primary_implementation, PAY-006:primary_implementation, PAY-007:primary_implementation, PAY-008:primary_implementation, PAY-009:primary_implementation, ACC-001:primary_implementation, ACC-002:primary_implementation, ACC-003:primary_implementation, ACC-004:primary_implementation, ACC-005:primary_implementation, ACC-006:primary_implementation, ACC-007:primary_implementation
- RP13.P02.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Payments AR Accounting Export: Service Logic. | Commands: npm run validate, npm test | Hermes: H13 | Claude: C13
- RP13.P02.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Payments AR Accounting Export: Service Logic. | Commands: npm run validate, npm test | Hermes: H13 | Claude: C13
- RP13.P02.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Payments AR Accounting Export: Service Logic. | Commands: npm run validate, npm test | Hermes: H13 | Claude: C13
- RP13.P02.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Payments AR Accounting Export: Service Logic. | Commands: npm run validate, npm test | Hermes: H13 | Claude: C13
- RP13.P02.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Payments AR Accounting Export: Service Logic. | Commands: npm run validate, npm test | Hermes: H13 | Claude: C13
- RP13.P02.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Payments AR Accounting Export: Service Logic. | Commands: npm run validate, npm test | Hermes: H13 | Claude: C13
- RP13.P02.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Payments AR Accounting Export: Service Logic. | Commands: npm run validate, npm test | Hermes: H13 | Claude: C13

#### RP13.P03: API And Interface

- RP13.P03.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Payments AR Accounting Export: API And Interface. | Commands: npm run validate, npm test | Hermes: H13 | Claude: C13
- RP13.P03.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Payments AR Accounting Export: API And Interface. | Commands: npm run validate, npm test | Hermes: H13 | Claude: C13
- RP13.P03.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Payments AR Accounting Export: API And Interface. | Commands: npm run validate, npm test | Hermes: H13 | Claude: C13
- RP13.P03.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Payments AR Accounting Export: API And Interface. | Commands: npm run validate, npm test | Hermes: H13 | Claude: C13
- RP13.P03.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Payments AR Accounting Export: API And Interface. | Commands: npm run validate, npm test | Hermes: H13 | Claude: C13
- RP13.P03.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Payments AR Accounting Export: API And Interface. | Commands: npm run validate, npm test | Hermes: H13 | Claude: C13
- RP13.P03.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Payments AR Accounting Export: API And Interface. | Commands: npm run validate, npm test | Hermes: H13 | Claude: C13
- RP13.P03.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Payments AR Accounting Export: API And Interface. | Commands: npm run validate, npm test | Hermes: H13 | Claude: C13
- RP13.P03.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Payments AR Accounting Export: API And Interface. | Commands: npm run validate, npm test | Hermes: H13 | Claude: C13
- RP13.P03.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Payments AR Accounting Export: API And Interface. | Commands: npm run validate, npm test | Hermes: H13 | Claude: C13
- RP13.P03.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Payments AR Accounting Export: API And Interface. | Commands: npm run validate, npm test | Hermes: H13 | Claude: C13

#### RP13.P04: UI And Operator Surface

- RP13.P04.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Payments AR Accounting Export: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H13 | Claude: C13
- RP13.P04.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Payments AR Accounting Export: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H13 | Claude: C13
- RP13.P04.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Payments AR Accounting Export: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H13 | Claude: C13
- RP13.P04.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Payments AR Accounting Export: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H13 | Claude: C13
- RP13.P04.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Payments AR Accounting Export: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H13 | Claude: C13
- RP13.P04.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Payments AR Accounting Export: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H13 | Claude: C13
- RP13.P04.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Payments AR Accounting Export: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H13 | Claude: C13
- RP13.P04.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Payments AR Accounting Export: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H13 | Claude: C13
- RP13.P04.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Payments AR Accounting Export: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H13 | Claude: C13
- RP13.P04.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Payments AR Accounting Export: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H13 | Claude: C13
- RP13.P04.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Payments AR Accounting Export: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H13 | Claude: C13

#### RP13.P05: Fixtures And Golden Cases

- RP13.P05.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Payments AR Accounting Export: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H13 | Claude: C13
- RP13.P05.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Payments AR Accounting Export: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H13 | Claude: C13
- RP13.P05.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Payments AR Accounting Export: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H13 | Claude: C13
- RP13.P05.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Payments AR Accounting Export: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H13 | Claude: C13
- RP13.P05.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Payments AR Accounting Export: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H13 | Claude: C13
- RP13.P05.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Payments AR Accounting Export: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H13 | Claude: C13
- RP13.P05.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Payments AR Accounting Export: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H13 | Claude: C13
- RP13.P05.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Payments AR Accounting Export: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H13 | Claude: C13 | Reqs: PAY-001:test, PAY-002:test, PAY-003:test, PAY-004:test, PAY-005:test, PAY-006:test, PAY-007:test, PAY-008:test, PAY-009:test, ACC-001:test, ACC-002:test, ACC-003:test, ACC-004:test, ACC-005:test, ACC-006:test, ACC-007:test
- RP13.P05.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Payments AR Accounting Export: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H13 | Claude: C13
- RP13.P05.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Payments AR Accounting Export: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H13 | Claude: C13
- RP13.P05.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Payments AR Accounting Export: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H13 | Claude: C13

#### RP13.P06: Permission Audit Integration

- RP13.P06.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Payments AR Accounting Export: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H13 | Claude: C13
- RP13.P06.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Payments AR Accounting Export: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H13 | Claude: C13
- RP13.P06.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Payments AR Accounting Export: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H13 | Claude: C13
- RP13.P06.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Payments AR Accounting Export: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H13 | Claude: C13
- RP13.P06.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Payments AR Accounting Export: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H13 | Claude: C13
- RP13.P06.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Payments AR Accounting Export: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H13 | Claude: C13
- RP13.P06.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Payments AR Accounting Export: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H13 | Claude: C13
- RP13.P06.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Payments AR Accounting Export: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H13 | Claude: C13
- RP13.P06.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Payments AR Accounting Export: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H13 | Claude: C13
- RP13.P06.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Payments AR Accounting Export: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H13 | Claude: C13
- RP13.P06.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Payments AR Accounting Export: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H13 | Claude: C13

#### RP13.P07: Failure Edge And Recovery

- RP13.P07.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Payments AR Accounting Export: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H13 | Claude: C13
- RP13.P07.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Payments AR Accounting Export: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H13 | Claude: C13
- RP13.P07.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Payments AR Accounting Export: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H13 | Claude: C13
- RP13.P07.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Payments AR Accounting Export: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H13 | Claude: C13
- RP13.P07.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Payments AR Accounting Export: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H13 | Claude: C13
- RP13.P07.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Payments AR Accounting Export: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H13 | Claude: C13
- RP13.P07.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Payments AR Accounting Export: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H13 | Claude: C13
- RP13.P07.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Payments AR Accounting Export: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H13 | Claude: C13
- RP13.P07.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Payments AR Accounting Export: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H13 | Claude: C13
- RP13.P07.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Payments AR Accounting Export: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H13 | Claude: C13
- RP13.P07.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Payments AR Accounting Export: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H13 | Claude: C13

#### RP13.P08: Hermes Validation Binding

- RP13.P08.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Payments AR Accounting Export: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H13 | Claude: C13
- RP13.P08.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Payments AR Accounting Export: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H13 | Claude: C13
- RP13.P08.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Payments AR Accounting Export: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H13 | Claude: C13
- RP13.P08.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Payments AR Accounting Export: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H13 | Claude: C13
- RP13.P08.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Payments AR Accounting Export: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H13 | Claude: C13
- RP13.P08.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Payments AR Accounting Export: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H13 | Claude: C13
- RP13.P08.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Payments AR Accounting Export: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H13 | Claude: C13
- RP13.P08.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Payments AR Accounting Export: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H13 | Claude: C13
- RP13.P08.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Payments AR Accounting Export: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H13 | Claude: C13 | Reqs: PAY-001:hermes_evidence, PAY-002:hermes_evidence, PAY-003:hermes_evidence, PAY-004:hermes_evidence, PAY-005:hermes_evidence, PAY-006:hermes_evidence, PAY-007:hermes_evidence, PAY-008:hermes_evidence, PAY-009:hermes_evidence, ACC-001:hermes_evidence, ACC-002:hermes_evidence, ACC-003:hermes_evidence, ACC-004:hermes_evidence, ACC-005:hermes_evidence, ACC-006:hermes_evidence, ACC-007:hermes_evidence
- RP13.P08.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Payments AR Accounting Export: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H13 | Claude: C13
- RP13.P08.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Payments AR Accounting Export: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H13 | Claude: C13

#### RP13.P09: Claude Cross Validation Closeout

- RP13.P09.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Payments AR Accounting Export: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H13 | Claude: C13
- RP13.P09.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Payments AR Accounting Export: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H13 | Claude: C13
- RP13.P09.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Payments AR Accounting Export: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H13 | Claude: C13
- RP13.P09.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Payments AR Accounting Export: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H13 | Claude: C13
- RP13.P09.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Payments AR Accounting Export: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H13 | Claude: C13
- RP13.P09.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Payments AR Accounting Export: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H13 | Claude: C13
- RP13.P09.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Payments AR Accounting Export: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H13 | Claude: C13
- RP13.P09.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Payments AR Accounting Export: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H13 | Claude: C13
- RP13.P09.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Payments AR Accounting Export: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H13 | Claude: C13
- RP13.P09.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Payments AR Accounting Export: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H13 | Claude: C13 | Reqs: PAY-001:claude_review, PAY-002:claude_review, PAY-003:claude_review, PAY-004:claude_review, PAY-005:claude_review, PAY-006:claude_review, PAY-007:claude_review, PAY-008:claude_review, PAY-009:claude_review, ACC-001:claude_review, ACC-002:claude_review, ACC-003:claude_review, ACC-004:claude_review, ACC-005:claude_review, ACC-006:claude_review, ACC-007:claude_review
- RP13.P09.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Payments AR Accounting Export: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H13 | Claude: C13


### RP14: Partner Settlement

Scope: Origination, allocation, working credit, settlement run lock

#### RP14.P00: Contract And Acceptance Baseline

- RP14.P00.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Partner Settlement: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H14 | Claude: C14
- RP14.P00.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Partner Settlement: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H14 | Claude: C14 | Reqs: SET-001:contract, SET-002:contract, SET-003:contract, SET-004:contract, SET-005:contract, SET-006:contract, SET-007:contract, SET-008:contract, SET-009:contract
- RP14.P00.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Partner Settlement: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H14 | Claude: C14
- RP14.P00.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Partner Settlement: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H14 | Claude: C14
- RP14.P00.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Partner Settlement: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H14 | Claude: C14
- RP14.P00.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Partner Settlement: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H14 | Claude: C14
- RP14.P00.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Partner Settlement: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H14 | Claude: C14
- RP14.P00.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Partner Settlement: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H14 | Claude: C14
- RP14.P00.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Partner Settlement: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H14 | Claude: C14
- RP14.P00.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Partner Settlement: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H14 | Claude: C14
- RP14.P00.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Partner Settlement: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H14 | Claude: C14

#### RP14.P01: Domain Model

- RP14.P01.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Partner Settlement: Domain Model. | Commands: npm run validate | Hermes: H14 | Claude: C14
- RP14.P01.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Partner Settlement: Domain Model. | Commands: npm run validate | Hermes: H14 | Claude: C14
- RP14.P01.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Partner Settlement: Domain Model. | Commands: npm run validate | Hermes: H14 | Claude: C14
- RP14.P01.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Partner Settlement: Domain Model. | Commands: npm run validate | Hermes: H14 | Claude: C14
- RP14.P01.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Partner Settlement: Domain Model. | Commands: npm run validate | Hermes: H14 | Claude: C14
- RP14.P01.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Partner Settlement: Domain Model. | Commands: npm run validate | Hermes: H14 | Claude: C14
- RP14.P01.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Partner Settlement: Domain Model. | Commands: npm run validate | Hermes: H14 | Claude: C14
- RP14.P01.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Partner Settlement: Domain Model. | Commands: npm run validate | Hermes: H14 | Claude: C14
- RP14.P01.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Partner Settlement: Domain Model. | Commands: npm run validate | Hermes: H14 | Claude: C14
- RP14.P01.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Partner Settlement: Domain Model. | Commands: npm run validate | Hermes: H14 | Claude: C14
- RP14.P01.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Partner Settlement: Domain Model. | Commands: npm run validate | Hermes: H14 | Claude: C14

#### RP14.P02: Service Logic

- RP14.P02.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Partner Settlement: Service Logic. | Commands: npm run validate, npm test | Hermes: H14 | Claude: C14
- RP14.P02.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Partner Settlement: Service Logic. | Commands: npm run validate, npm test | Hermes: H14 | Claude: C14
- RP14.P02.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Partner Settlement: Service Logic. | Commands: npm run validate, npm test | Hermes: H14 | Claude: C14
- RP14.P02.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Partner Settlement: Service Logic. | Commands: npm run validate, npm test | Hermes: H14 | Claude: C14 | Reqs: SET-001:primary_implementation, SET-002:primary_implementation, SET-003:primary_implementation, SET-004:primary_implementation, SET-005:primary_implementation, SET-006:primary_implementation, SET-007:primary_implementation, SET-008:primary_implementation, SET-009:primary_implementation
- RP14.P02.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Partner Settlement: Service Logic. | Commands: npm run validate, npm test | Hermes: H14 | Claude: C14
- RP14.P02.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Partner Settlement: Service Logic. | Commands: npm run validate, npm test | Hermes: H14 | Claude: C14
- RP14.P02.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Partner Settlement: Service Logic. | Commands: npm run validate, npm test | Hermes: H14 | Claude: C14
- RP14.P02.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Partner Settlement: Service Logic. | Commands: npm run validate, npm test | Hermes: H14 | Claude: C14
- RP14.P02.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Partner Settlement: Service Logic. | Commands: npm run validate, npm test | Hermes: H14 | Claude: C14
- RP14.P02.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Partner Settlement: Service Logic. | Commands: npm run validate, npm test | Hermes: H14 | Claude: C14
- RP14.P02.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Partner Settlement: Service Logic. | Commands: npm run validate, npm test | Hermes: H14 | Claude: C14

#### RP14.P03: API And Interface

- RP14.P03.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Partner Settlement: API And Interface. | Commands: npm run validate, npm test | Hermes: H14 | Claude: C14
- RP14.P03.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Partner Settlement: API And Interface. | Commands: npm run validate, npm test | Hermes: H14 | Claude: C14
- RP14.P03.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Partner Settlement: API And Interface. | Commands: npm run validate, npm test | Hermes: H14 | Claude: C14
- RP14.P03.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Partner Settlement: API And Interface. | Commands: npm run validate, npm test | Hermes: H14 | Claude: C14
- RP14.P03.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Partner Settlement: API And Interface. | Commands: npm run validate, npm test | Hermes: H14 | Claude: C14
- RP14.P03.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Partner Settlement: API And Interface. | Commands: npm run validate, npm test | Hermes: H14 | Claude: C14
- RP14.P03.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Partner Settlement: API And Interface. | Commands: npm run validate, npm test | Hermes: H14 | Claude: C14
- RP14.P03.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Partner Settlement: API And Interface. | Commands: npm run validate, npm test | Hermes: H14 | Claude: C14
- RP14.P03.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Partner Settlement: API And Interface. | Commands: npm run validate, npm test | Hermes: H14 | Claude: C14
- RP14.P03.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Partner Settlement: API And Interface. | Commands: npm run validate, npm test | Hermes: H14 | Claude: C14
- RP14.P03.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Partner Settlement: API And Interface. | Commands: npm run validate, npm test | Hermes: H14 | Claude: C14

#### RP14.P04: UI And Operator Surface

- RP14.P04.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Partner Settlement: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H14 | Claude: C14
- RP14.P04.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Partner Settlement: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H14 | Claude: C14
- RP14.P04.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Partner Settlement: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H14 | Claude: C14
- RP14.P04.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Partner Settlement: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H14 | Claude: C14
- RP14.P04.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Partner Settlement: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H14 | Claude: C14
- RP14.P04.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Partner Settlement: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H14 | Claude: C14
- RP14.P04.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Partner Settlement: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H14 | Claude: C14
- RP14.P04.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Partner Settlement: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H14 | Claude: C14
- RP14.P04.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Partner Settlement: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H14 | Claude: C14
- RP14.P04.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Partner Settlement: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H14 | Claude: C14
- RP14.P04.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Partner Settlement: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H14 | Claude: C14

#### RP14.P05: Fixtures And Golden Cases

- RP14.P05.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Partner Settlement: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H14 | Claude: C14
- RP14.P05.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Partner Settlement: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H14 | Claude: C14
- RP14.P05.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Partner Settlement: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H14 | Claude: C14
- RP14.P05.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Partner Settlement: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H14 | Claude: C14
- RP14.P05.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Partner Settlement: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H14 | Claude: C14
- RP14.P05.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Partner Settlement: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H14 | Claude: C14
- RP14.P05.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Partner Settlement: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H14 | Claude: C14
- RP14.P05.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Partner Settlement: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H14 | Claude: C14 | Reqs: SET-001:test, SET-002:test, SET-003:test, SET-004:test, SET-005:test, SET-006:test, SET-007:test, SET-008:test, SET-009:test
- RP14.P05.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Partner Settlement: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H14 | Claude: C14
- RP14.P05.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Partner Settlement: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H14 | Claude: C14
- RP14.P05.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Partner Settlement: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H14 | Claude: C14

#### RP14.P06: Permission Audit Integration

- RP14.P06.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Partner Settlement: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H14 | Claude: C14
- RP14.P06.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Partner Settlement: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H14 | Claude: C14
- RP14.P06.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Partner Settlement: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H14 | Claude: C14
- RP14.P06.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Partner Settlement: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H14 | Claude: C14
- RP14.P06.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Partner Settlement: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H14 | Claude: C14
- RP14.P06.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Partner Settlement: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H14 | Claude: C14
- RP14.P06.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Partner Settlement: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H14 | Claude: C14
- RP14.P06.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Partner Settlement: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H14 | Claude: C14
- RP14.P06.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Partner Settlement: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H14 | Claude: C14
- RP14.P06.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Partner Settlement: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H14 | Claude: C14
- RP14.P06.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Partner Settlement: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H14 | Claude: C14

#### RP14.P07: Failure Edge And Recovery

- RP14.P07.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Partner Settlement: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H14 | Claude: C14
- RP14.P07.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Partner Settlement: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H14 | Claude: C14
- RP14.P07.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Partner Settlement: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H14 | Claude: C14
- RP14.P07.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Partner Settlement: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H14 | Claude: C14
- RP14.P07.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Partner Settlement: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H14 | Claude: C14
- RP14.P07.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Partner Settlement: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H14 | Claude: C14
- RP14.P07.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Partner Settlement: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H14 | Claude: C14
- RP14.P07.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Partner Settlement: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H14 | Claude: C14
- RP14.P07.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Partner Settlement: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H14 | Claude: C14
- RP14.P07.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Partner Settlement: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H14 | Claude: C14
- RP14.P07.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Partner Settlement: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H14 | Claude: C14

#### RP14.P08: Hermes Validation Binding

- RP14.P08.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Partner Settlement: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H14 | Claude: C14
- RP14.P08.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Partner Settlement: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H14 | Claude: C14
- RP14.P08.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Partner Settlement: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H14 | Claude: C14
- RP14.P08.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Partner Settlement: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H14 | Claude: C14
- RP14.P08.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Partner Settlement: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H14 | Claude: C14
- RP14.P08.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Partner Settlement: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H14 | Claude: C14
- RP14.P08.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Partner Settlement: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H14 | Claude: C14
- RP14.P08.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Partner Settlement: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H14 | Claude: C14
- RP14.P08.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Partner Settlement: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H14 | Claude: C14 | Reqs: SET-001:hermes_evidence, SET-002:hermes_evidence, SET-003:hermes_evidence, SET-004:hermes_evidence, SET-005:hermes_evidence, SET-006:hermes_evidence, SET-007:hermes_evidence, SET-008:hermes_evidence, SET-009:hermes_evidence
- RP14.P08.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Partner Settlement: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H14 | Claude: C14
- RP14.P08.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Partner Settlement: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H14 | Claude: C14

#### RP14.P09: Claude Cross Validation Closeout

- RP14.P09.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Partner Settlement: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H14 | Claude: C14
- RP14.P09.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Partner Settlement: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H14 | Claude: C14
- RP14.P09.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Partner Settlement: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H14 | Claude: C14
- RP14.P09.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Partner Settlement: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H14 | Claude: C14
- RP14.P09.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Partner Settlement: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H14 | Claude: C14
- RP14.P09.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Partner Settlement: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H14 | Claude: C14
- RP14.P09.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Partner Settlement: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H14 | Claude: C14
- RP14.P09.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Partner Settlement: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H14 | Claude: C14
- RP14.P09.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Partner Settlement: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H14 | Claude: C14
- RP14.P09.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Partner Settlement: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H14 | Claude: C14 | Reqs: SET-001:claude_review, SET-002:claude_review, SET-003:claude_review, SET-004:claude_review, SET-005:claude_review, SET-006:claude_review, SET-007:claude_review, SET-008:claude_review, SET-009:claude_review
- RP14.P09.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Partner Settlement: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H14 | Claude: C14


### RP15: Firm Analytics

Scope: Managing partner, partner, Matter P&L, forecast, WIP

#### RP15.P00: Contract And Acceptance Baseline

- RP15.P00.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Firm Analytics: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H15 | Claude: C15
- RP15.P00.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Firm Analytics: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H15 | Claude: C15 | Reqs: NARR-004:contract, NARR-006:contract
- RP15.P00.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Firm Analytics: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H15 | Claude: C15
- RP15.P00.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Firm Analytics: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H15 | Claude: C15
- RP15.P00.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Firm Analytics: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H15 | Claude: C15
- RP15.P00.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Firm Analytics: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H15 | Claude: C15
- RP15.P00.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Firm Analytics: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H15 | Claude: C15
- RP15.P00.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Firm Analytics: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H15 | Claude: C15
- RP15.P00.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Firm Analytics: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H15 | Claude: C15
- RP15.P00.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Firm Analytics: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H15 | Claude: C15
- RP15.P00.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Firm Analytics: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H15 | Claude: C15

#### RP15.P01: Domain Model

- RP15.P01.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Firm Analytics: Domain Model. | Commands: npm run validate | Hermes: H15 | Claude: C15
- RP15.P01.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Firm Analytics: Domain Model. | Commands: npm run validate | Hermes: H15 | Claude: C15
- RP15.P01.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Firm Analytics: Domain Model. | Commands: npm run validate | Hermes: H15 | Claude: C15
- RP15.P01.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Firm Analytics: Domain Model. | Commands: npm run validate | Hermes: H15 | Claude: C15
- RP15.P01.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Firm Analytics: Domain Model. | Commands: npm run validate | Hermes: H15 | Claude: C15
- RP15.P01.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Firm Analytics: Domain Model. | Commands: npm run validate | Hermes: H15 | Claude: C15
- RP15.P01.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Firm Analytics: Domain Model. | Commands: npm run validate | Hermes: H15 | Claude: C15
- RP15.P01.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Firm Analytics: Domain Model. | Commands: npm run validate | Hermes: H15 | Claude: C15
- RP15.P01.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Firm Analytics: Domain Model. | Commands: npm run validate | Hermes: H15 | Claude: C15
- RP15.P01.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Firm Analytics: Domain Model. | Commands: npm run validate | Hermes: H15 | Claude: C15
- RP15.P01.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Firm Analytics: Domain Model. | Commands: npm run validate | Hermes: H15 | Claude: C15

#### RP15.P02: Service Logic

- RP15.P02.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Firm Analytics: Service Logic. | Commands: npm run validate, npm test | Hermes: H15 | Claude: C15
- RP15.P02.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Firm Analytics: Service Logic. | Commands: npm run validate, npm test | Hermes: H15 | Claude: C15
- RP15.P02.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Firm Analytics: Service Logic. | Commands: npm run validate, npm test | Hermes: H15 | Claude: C15
- RP15.P02.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Firm Analytics: Service Logic. | Commands: npm run validate, npm test | Hermes: H15 | Claude: C15 | Reqs: NARR-004:primary_implementation
- RP15.P02.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Firm Analytics: Service Logic. | Commands: npm run validate, npm test | Hermes: H15 | Claude: C15
- RP15.P02.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Firm Analytics: Service Logic. | Commands: npm run validate, npm test | Hermes: H15 | Claude: C15
- RP15.P02.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Firm Analytics: Service Logic. | Commands: npm run validate, npm test | Hermes: H15 | Claude: C15
- RP15.P02.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Firm Analytics: Service Logic. | Commands: npm run validate, npm test | Hermes: H15 | Claude: C15
- RP15.P02.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Firm Analytics: Service Logic. | Commands: npm run validate, npm test | Hermes: H15 | Claude: C15
- RP15.P02.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Firm Analytics: Service Logic. | Commands: npm run validate, npm test | Hermes: H15 | Claude: C15
- RP15.P02.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Firm Analytics: Service Logic. | Commands: npm run validate, npm test | Hermes: H15 | Claude: C15

#### RP15.P03: API And Interface

- RP15.P03.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Firm Analytics: API And Interface. | Commands: npm run validate, npm test | Hermes: H15 | Claude: C15
- RP15.P03.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Firm Analytics: API And Interface. | Commands: npm run validate, npm test | Hermes: H15 | Claude: C15
- RP15.P03.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Firm Analytics: API And Interface. | Commands: npm run validate, npm test | Hermes: H15 | Claude: C15
- RP15.P03.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Firm Analytics: API And Interface. | Commands: npm run validate, npm test | Hermes: H15 | Claude: C15
- RP15.P03.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Firm Analytics: API And Interface. | Commands: npm run validate, npm test | Hermes: H15 | Claude: C15
- RP15.P03.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Firm Analytics: API And Interface. | Commands: npm run validate, npm test | Hermes: H15 | Claude: C15
- RP15.P03.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Firm Analytics: API And Interface. | Commands: npm run validate, npm test | Hermes: H15 | Claude: C15
- RP15.P03.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Firm Analytics: API And Interface. | Commands: npm run validate, npm test | Hermes: H15 | Claude: C15
- RP15.P03.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Firm Analytics: API And Interface. | Commands: npm run validate, npm test | Hermes: H15 | Claude: C15
- RP15.P03.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Firm Analytics: API And Interface. | Commands: npm run validate, npm test | Hermes: H15 | Claude: C15
- RP15.P03.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Firm Analytics: API And Interface. | Commands: npm run validate, npm test | Hermes: H15 | Claude: C15

#### RP15.P04: UI And Operator Surface

- RP15.P04.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Firm Analytics: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H15 | Claude: C15
- RP15.P04.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Firm Analytics: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H15 | Claude: C15
- RP15.P04.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Firm Analytics: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H15 | Claude: C15
- RP15.P04.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Firm Analytics: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H15 | Claude: C15 | Reqs: NARR-006:primary_implementation
- RP15.P04.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Firm Analytics: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H15 | Claude: C15
- RP15.P04.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Firm Analytics: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H15 | Claude: C15
- RP15.P04.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Firm Analytics: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H15 | Claude: C15
- RP15.P04.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Firm Analytics: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H15 | Claude: C15
- RP15.P04.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Firm Analytics: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H15 | Claude: C15
- RP15.P04.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Firm Analytics: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H15 | Claude: C15
- RP15.P04.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Firm Analytics: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H15 | Claude: C15

#### RP15.P05: Fixtures And Golden Cases

- RP15.P05.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Firm Analytics: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H15 | Claude: C15
- RP15.P05.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Firm Analytics: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H15 | Claude: C15
- RP15.P05.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Firm Analytics: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H15 | Claude: C15
- RP15.P05.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Firm Analytics: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H15 | Claude: C15
- RP15.P05.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Firm Analytics: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H15 | Claude: C15
- RP15.P05.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Firm Analytics: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H15 | Claude: C15
- RP15.P05.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Firm Analytics: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H15 | Claude: C15
- RP15.P05.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Firm Analytics: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H15 | Claude: C15 | Reqs: NARR-004:test, NARR-006:test
- RP15.P05.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Firm Analytics: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H15 | Claude: C15
- RP15.P05.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Firm Analytics: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H15 | Claude: C15
- RP15.P05.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Firm Analytics: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H15 | Claude: C15

#### RP15.P06: Permission Audit Integration

- RP15.P06.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Firm Analytics: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H15 | Claude: C15
- RP15.P06.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Firm Analytics: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H15 | Claude: C15
- RP15.P06.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Firm Analytics: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H15 | Claude: C15
- RP15.P06.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Firm Analytics: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H15 | Claude: C15
- RP15.P06.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Firm Analytics: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H15 | Claude: C15
- RP15.P06.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Firm Analytics: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H15 | Claude: C15
- RP15.P06.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Firm Analytics: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H15 | Claude: C15
- RP15.P06.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Firm Analytics: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H15 | Claude: C15
- RP15.P06.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Firm Analytics: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H15 | Claude: C15
- RP15.P06.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Firm Analytics: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H15 | Claude: C15
- RP15.P06.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Firm Analytics: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H15 | Claude: C15

#### RP15.P07: Failure Edge And Recovery

- RP15.P07.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Firm Analytics: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H15 | Claude: C15
- RP15.P07.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Firm Analytics: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H15 | Claude: C15
- RP15.P07.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Firm Analytics: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H15 | Claude: C15
- RP15.P07.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Firm Analytics: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H15 | Claude: C15
- RP15.P07.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Firm Analytics: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H15 | Claude: C15
- RP15.P07.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Firm Analytics: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H15 | Claude: C15
- RP15.P07.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Firm Analytics: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H15 | Claude: C15
- RP15.P07.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Firm Analytics: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H15 | Claude: C15
- RP15.P07.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Firm Analytics: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H15 | Claude: C15
- RP15.P07.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Firm Analytics: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H15 | Claude: C15
- RP15.P07.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Firm Analytics: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H15 | Claude: C15

#### RP15.P08: Hermes Validation Binding

- RP15.P08.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Firm Analytics: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H15 | Claude: C15
- RP15.P08.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Firm Analytics: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H15 | Claude: C15
- RP15.P08.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Firm Analytics: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H15 | Claude: C15
- RP15.P08.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Firm Analytics: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H15 | Claude: C15
- RP15.P08.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Firm Analytics: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H15 | Claude: C15
- RP15.P08.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Firm Analytics: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H15 | Claude: C15
- RP15.P08.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Firm Analytics: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H15 | Claude: C15
- RP15.P08.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Firm Analytics: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H15 | Claude: C15
- RP15.P08.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Firm Analytics: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H15 | Claude: C15 | Reqs: NARR-004:hermes_evidence, NARR-006:hermes_evidence
- RP15.P08.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Firm Analytics: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H15 | Claude: C15
- RP15.P08.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Firm Analytics: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H15 | Claude: C15

#### RP15.P09: Claude Cross Validation Closeout

- RP15.P09.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Firm Analytics: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H15 | Claude: C15
- RP15.P09.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Firm Analytics: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H15 | Claude: C15
- RP15.P09.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Firm Analytics: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H15 | Claude: C15
- RP15.P09.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Firm Analytics: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H15 | Claude: C15
- RP15.P09.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Firm Analytics: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H15 | Claude: C15
- RP15.P09.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Firm Analytics: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H15 | Claude: C15
- RP15.P09.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Firm Analytics: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H15 | Claude: C15
- RP15.P09.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Firm Analytics: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H15 | Claude: C15
- RP15.P09.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Firm Analytics: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H15 | Claude: C15
- RP15.P09.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Firm Analytics: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H15 | Claude: C15 | Reqs: NARR-004:claude_review, NARR-006:claude_review
- RP15.P09.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Firm Analytics: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H15 | Claude: C15


### RP16: Governance DLP Retention

Scope: DLP, legal hold, retention, break-glass, incident response

#### RP16.P00: Contract And Acceptance Baseline

- RP16.P00.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Governance DLP Retention: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H16 | Claude: C16
- RP16.P00.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Governance DLP Retention: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H16 | Claude: C16 | Reqs: NARR-007:contract
- RP16.P00.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Governance DLP Retention: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H16 | Claude: C16
- RP16.P00.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Governance DLP Retention: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H16 | Claude: C16
- RP16.P00.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Governance DLP Retention: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H16 | Claude: C16
- RP16.P00.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Governance DLP Retention: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H16 | Claude: C16
- RP16.P00.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Governance DLP Retention: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H16 | Claude: C16
- RP16.P00.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Governance DLP Retention: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H16 | Claude: C16
- RP16.P00.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Governance DLP Retention: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H16 | Claude: C16
- RP16.P00.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Governance DLP Retention: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H16 | Claude: C16
- RP16.P00.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Governance DLP Retention: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H16 | Claude: C16

#### RP16.P01: Domain Model

- RP16.P01.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Governance DLP Retention: Domain Model. | Commands: npm run validate | Hermes: H16 | Claude: C16
- RP16.P01.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Governance DLP Retention: Domain Model. | Commands: npm run validate | Hermes: H16 | Claude: C16
- RP16.P01.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Governance DLP Retention: Domain Model. | Commands: npm run validate | Hermes: H16 | Claude: C16
- RP16.P01.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Governance DLP Retention: Domain Model. | Commands: npm run validate | Hermes: H16 | Claude: C16
- RP16.P01.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Governance DLP Retention: Domain Model. | Commands: npm run validate | Hermes: H16 | Claude: C16
- RP16.P01.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Governance DLP Retention: Domain Model. | Commands: npm run validate | Hermes: H16 | Claude: C16
- RP16.P01.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Governance DLP Retention: Domain Model. | Commands: npm run validate | Hermes: H16 | Claude: C16
- RP16.P01.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Governance DLP Retention: Domain Model. | Commands: npm run validate | Hermes: H16 | Claude: C16
- RP16.P01.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Governance DLP Retention: Domain Model. | Commands: npm run validate | Hermes: H16 | Claude: C16
- RP16.P01.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Governance DLP Retention: Domain Model. | Commands: npm run validate | Hermes: H16 | Claude: C16
- RP16.P01.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Governance DLP Retention: Domain Model. | Commands: npm run validate | Hermes: H16 | Claude: C16

#### RP16.P02: Service Logic

- RP16.P02.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Governance DLP Retention: Service Logic. | Commands: npm run validate, npm test | Hermes: H16 | Claude: C16
- RP16.P02.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Governance DLP Retention: Service Logic. | Commands: npm run validate, npm test | Hermes: H16 | Claude: C16
- RP16.P02.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Governance DLP Retention: Service Logic. | Commands: npm run validate, npm test | Hermes: H16 | Claude: C16
- RP16.P02.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Governance DLP Retention: Service Logic. | Commands: npm run validate, npm test | Hermes: H16 | Claude: C16
- RP16.P02.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Governance DLP Retention: Service Logic. | Commands: npm run validate, npm test | Hermes: H16 | Claude: C16
- RP16.P02.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Governance DLP Retention: Service Logic. | Commands: npm run validate, npm test | Hermes: H16 | Claude: C16
- RP16.P02.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Governance DLP Retention: Service Logic. | Commands: npm run validate, npm test | Hermes: H16 | Claude: C16
- RP16.P02.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Governance DLP Retention: Service Logic. | Commands: npm run validate, npm test | Hermes: H16 | Claude: C16
- RP16.P02.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Governance DLP Retention: Service Logic. | Commands: npm run validate, npm test | Hermes: H16 | Claude: C16
- RP16.P02.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Governance DLP Retention: Service Logic. | Commands: npm run validate, npm test | Hermes: H16 | Claude: C16
- RP16.P02.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Governance DLP Retention: Service Logic. | Commands: npm run validate, npm test | Hermes: H16 | Claude: C16

#### RP16.P03: API And Interface

- RP16.P03.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Governance DLP Retention: API And Interface. | Commands: npm run validate, npm test | Hermes: H16 | Claude: C16
- RP16.P03.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Governance DLP Retention: API And Interface. | Commands: npm run validate, npm test | Hermes: H16 | Claude: C16
- RP16.P03.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Governance DLP Retention: API And Interface. | Commands: npm run validate, npm test | Hermes: H16 | Claude: C16
- RP16.P03.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Governance DLP Retention: API And Interface. | Commands: npm run validate, npm test | Hermes: H16 | Claude: C16
- RP16.P03.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Governance DLP Retention: API And Interface. | Commands: npm run validate, npm test | Hermes: H16 | Claude: C16
- RP16.P03.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Governance DLP Retention: API And Interface. | Commands: npm run validate, npm test | Hermes: H16 | Claude: C16
- RP16.P03.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Governance DLP Retention: API And Interface. | Commands: npm run validate, npm test | Hermes: H16 | Claude: C16
- RP16.P03.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Governance DLP Retention: API And Interface. | Commands: npm run validate, npm test | Hermes: H16 | Claude: C16
- RP16.P03.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Governance DLP Retention: API And Interface. | Commands: npm run validate, npm test | Hermes: H16 | Claude: C16
- RP16.P03.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Governance DLP Retention: API And Interface. | Commands: npm run validate, npm test | Hermes: H16 | Claude: C16
- RP16.P03.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Governance DLP Retention: API And Interface. | Commands: npm run validate, npm test | Hermes: H16 | Claude: C16

#### RP16.P04: UI And Operator Surface

- RP16.P04.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Governance DLP Retention: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H16 | Claude: C16
- RP16.P04.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Governance DLP Retention: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H16 | Claude: C16
- RP16.P04.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Governance DLP Retention: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H16 | Claude: C16
- RP16.P04.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Governance DLP Retention: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H16 | Claude: C16
- RP16.P04.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Governance DLP Retention: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H16 | Claude: C16
- RP16.P04.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Governance DLP Retention: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H16 | Claude: C16
- RP16.P04.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Governance DLP Retention: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H16 | Claude: C16
- RP16.P04.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Governance DLP Retention: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H16 | Claude: C16
- RP16.P04.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Governance DLP Retention: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H16 | Claude: C16
- RP16.P04.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Governance DLP Retention: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H16 | Claude: C16
- RP16.P04.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Governance DLP Retention: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H16 | Claude: C16

#### RP16.P05: Fixtures And Golden Cases

- RP16.P05.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Governance DLP Retention: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H16 | Claude: C16
- RP16.P05.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Governance DLP Retention: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H16 | Claude: C16
- RP16.P05.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Governance DLP Retention: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H16 | Claude: C16
- RP16.P05.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Governance DLP Retention: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H16 | Claude: C16
- RP16.P05.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Governance DLP Retention: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H16 | Claude: C16
- RP16.P05.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Governance DLP Retention: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H16 | Claude: C16
- RP16.P05.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Governance DLP Retention: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H16 | Claude: C16
- RP16.P05.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Governance DLP Retention: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H16 | Claude: C16 | Reqs: NARR-007:test
- RP16.P05.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Governance DLP Retention: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H16 | Claude: C16
- RP16.P05.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Governance DLP Retention: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H16 | Claude: C16
- RP16.P05.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Governance DLP Retention: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H16 | Claude: C16

#### RP16.P06: Permission Audit Integration

- RP16.P06.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Governance DLP Retention: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H16 | Claude: C16
- RP16.P06.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Governance DLP Retention: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H16 | Claude: C16
- RP16.P06.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Governance DLP Retention: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H16 | Claude: C16
- RP16.P06.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Governance DLP Retention: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H16 | Claude: C16
- RP16.P06.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Governance DLP Retention: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H16 | Claude: C16
- RP16.P06.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Governance DLP Retention: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H16 | Claude: C16 | Reqs: NARR-007:primary_implementation
- RP16.P06.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Governance DLP Retention: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H16 | Claude: C16
- RP16.P06.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Governance DLP Retention: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H16 | Claude: C16
- RP16.P06.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Governance DLP Retention: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H16 | Claude: C16
- RP16.P06.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Governance DLP Retention: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H16 | Claude: C16
- RP16.P06.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Governance DLP Retention: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H16 | Claude: C16

#### RP16.P07: Failure Edge And Recovery

- RP16.P07.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Governance DLP Retention: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H16 | Claude: C16
- RP16.P07.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Governance DLP Retention: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H16 | Claude: C16
- RP16.P07.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Governance DLP Retention: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H16 | Claude: C16
- RP16.P07.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Governance DLP Retention: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H16 | Claude: C16
- RP16.P07.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Governance DLP Retention: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H16 | Claude: C16
- RP16.P07.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Governance DLP Retention: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H16 | Claude: C16
- RP16.P07.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Governance DLP Retention: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H16 | Claude: C16
- RP16.P07.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Governance DLP Retention: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H16 | Claude: C16
- RP16.P07.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Governance DLP Retention: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H16 | Claude: C16
- RP16.P07.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Governance DLP Retention: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H16 | Claude: C16
- RP16.P07.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Governance DLP Retention: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H16 | Claude: C16

#### RP16.P08: Hermes Validation Binding

- RP16.P08.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Governance DLP Retention: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H16 | Claude: C16
- RP16.P08.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Governance DLP Retention: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H16 | Claude: C16
- RP16.P08.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Governance DLP Retention: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H16 | Claude: C16
- RP16.P08.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Governance DLP Retention: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H16 | Claude: C16
- RP16.P08.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Governance DLP Retention: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H16 | Claude: C16
- RP16.P08.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Governance DLP Retention: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H16 | Claude: C16
- RP16.P08.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Governance DLP Retention: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H16 | Claude: C16
- RP16.P08.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Governance DLP Retention: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H16 | Claude: C16
- RP16.P08.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Governance DLP Retention: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H16 | Claude: C16 | Reqs: NARR-007:hermes_evidence
- RP16.P08.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Governance DLP Retention: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H16 | Claude: C16
- RP16.P08.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Governance DLP Retention: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H16 | Claude: C16

#### RP16.P09: Claude Cross Validation Closeout

- RP16.P09.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Governance DLP Retention: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H16 | Claude: C16
- RP16.P09.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Governance DLP Retention: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H16 | Claude: C16
- RP16.P09.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Governance DLP Retention: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H16 | Claude: C16
- RP16.P09.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Governance DLP Retention: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H16 | Claude: C16
- RP16.P09.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Governance DLP Retention: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H16 | Claude: C16
- RP16.P09.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Governance DLP Retention: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H16 | Claude: C16
- RP16.P09.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Governance DLP Retention: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H16 | Claude: C16
- RP16.P09.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Governance DLP Retention: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H16 | Claude: C16
- RP16.P09.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Governance DLP Retention: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H16 | Claude: C16
- RP16.P09.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Governance DLP Retention: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H16 | Claude: C16 | Reqs: NARR-007:claude_review
- RP16.P09.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Governance DLP Retention: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H16 | Claude: C16


### RP17: AI Governance

Scope: Model policy, retrieval scope, audit, citation

#### RP17.P00: Contract And Acceptance Baseline

- RP17.P00.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for AI Governance: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H17 | Claude: C17
- RP17.P00.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for AI Governance: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H17 | Claude: C17 | Reqs: AI-001:contract, AI-002:contract, AI-003:contract, AI-004:contract, AI-005:contract, AI-006:contract, AI-007:contract, AI-008:contract, AI-009:contract, AI-010:contract, AI-011:contract, AI-012:contract
- RP17.P00.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for AI Governance: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H17 | Claude: C17
- RP17.P00.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for AI Governance: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H17 | Claude: C17
- RP17.P00.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for AI Governance: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H17 | Claude: C17
- RP17.P00.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for AI Governance: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H17 | Claude: C17
- RP17.P00.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for AI Governance: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H17 | Claude: C17
- RP17.P00.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for AI Governance: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H17 | Claude: C17
- RP17.P00.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for AI Governance: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H17 | Claude: C17
- RP17.P00.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for AI Governance: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H17 | Claude: C17
- RP17.P00.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for AI Governance: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H17 | Claude: C17

#### RP17.P01: Domain Model

- RP17.P01.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for AI Governance: Domain Model. | Commands: npm run validate | Hermes: H17 | Claude: C17
- RP17.P01.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for AI Governance: Domain Model. | Commands: npm run validate | Hermes: H17 | Claude: C17
- RP17.P01.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for AI Governance: Domain Model. | Commands: npm run validate | Hermes: H17 | Claude: C17
- RP17.P01.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for AI Governance: Domain Model. | Commands: npm run validate | Hermes: H17 | Claude: C17
- RP17.P01.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for AI Governance: Domain Model. | Commands: npm run validate | Hermes: H17 | Claude: C17
- RP17.P01.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for AI Governance: Domain Model. | Commands: npm run validate | Hermes: H17 | Claude: C17
- RP17.P01.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for AI Governance: Domain Model. | Commands: npm run validate | Hermes: H17 | Claude: C17
- RP17.P01.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for AI Governance: Domain Model. | Commands: npm run validate | Hermes: H17 | Claude: C17
- RP17.P01.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for AI Governance: Domain Model. | Commands: npm run validate | Hermes: H17 | Claude: C17
- RP17.P01.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for AI Governance: Domain Model. | Commands: npm run validate | Hermes: H17 | Claude: C17
- RP17.P01.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for AI Governance: Domain Model. | Commands: npm run validate | Hermes: H17 | Claude: C17

#### RP17.P02: Service Logic

- RP17.P02.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for AI Governance: Service Logic. | Commands: npm run validate, npm test | Hermes: H17 | Claude: C17
- RP17.P02.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for AI Governance: Service Logic. | Commands: npm run validate, npm test | Hermes: H17 | Claude: C17
- RP17.P02.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for AI Governance: Service Logic. | Commands: npm run validate, npm test | Hermes: H17 | Claude: C17
- RP17.P02.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for AI Governance: Service Logic. | Commands: npm run validate, npm test | Hermes: H17 | Claude: C17 | Reqs: AI-001:primary_implementation, AI-002:primary_implementation, AI-003:primary_implementation, AI-004:primary_implementation, AI-005:primary_implementation, AI-006:primary_implementation, AI-007:primary_implementation, AI-008:primary_implementation, AI-009:primary_implementation, AI-010:primary_implementation, AI-011:primary_implementation, AI-012:primary_implementation
- RP17.P02.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for AI Governance: Service Logic. | Commands: npm run validate, npm test | Hermes: H17 | Claude: C17
- RP17.P02.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for AI Governance: Service Logic. | Commands: npm run validate, npm test | Hermes: H17 | Claude: C17
- RP17.P02.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for AI Governance: Service Logic. | Commands: npm run validate, npm test | Hermes: H17 | Claude: C17
- RP17.P02.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for AI Governance: Service Logic. | Commands: npm run validate, npm test | Hermes: H17 | Claude: C17
- RP17.P02.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for AI Governance: Service Logic. | Commands: npm run validate, npm test | Hermes: H17 | Claude: C17
- RP17.P02.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for AI Governance: Service Logic. | Commands: npm run validate, npm test | Hermes: H17 | Claude: C17
- RP17.P02.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for AI Governance: Service Logic. | Commands: npm run validate, npm test | Hermes: H17 | Claude: C17

#### RP17.P03: API And Interface

- RP17.P03.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for AI Governance: API And Interface. | Commands: npm run validate, npm test | Hermes: H17 | Claude: C17
- RP17.P03.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for AI Governance: API And Interface. | Commands: npm run validate, npm test | Hermes: H17 | Claude: C17
- RP17.P03.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for AI Governance: API And Interface. | Commands: npm run validate, npm test | Hermes: H17 | Claude: C17
- RP17.P03.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for AI Governance: API And Interface. | Commands: npm run validate, npm test | Hermes: H17 | Claude: C17
- RP17.P03.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for AI Governance: API And Interface. | Commands: npm run validate, npm test | Hermes: H17 | Claude: C17
- RP17.P03.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for AI Governance: API And Interface. | Commands: npm run validate, npm test | Hermes: H17 | Claude: C17
- RP17.P03.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for AI Governance: API And Interface. | Commands: npm run validate, npm test | Hermes: H17 | Claude: C17
- RP17.P03.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for AI Governance: API And Interface. | Commands: npm run validate, npm test | Hermes: H17 | Claude: C17
- RP17.P03.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for AI Governance: API And Interface. | Commands: npm run validate, npm test | Hermes: H17 | Claude: C17
- RP17.P03.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for AI Governance: API And Interface. | Commands: npm run validate, npm test | Hermes: H17 | Claude: C17
- RP17.P03.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for AI Governance: API And Interface. | Commands: npm run validate, npm test | Hermes: H17 | Claude: C17

#### RP17.P04: UI And Operator Surface

- RP17.P04.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for AI Governance: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H17 | Claude: C17
- RP17.P04.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for AI Governance: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H17 | Claude: C17
- RP17.P04.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for AI Governance: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H17 | Claude: C17
- RP17.P04.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for AI Governance: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H17 | Claude: C17
- RP17.P04.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for AI Governance: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H17 | Claude: C17
- RP17.P04.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for AI Governance: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H17 | Claude: C17
- RP17.P04.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for AI Governance: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H17 | Claude: C17
- RP17.P04.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for AI Governance: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H17 | Claude: C17
- RP17.P04.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for AI Governance: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H17 | Claude: C17
- RP17.P04.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for AI Governance: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H17 | Claude: C17
- RP17.P04.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for AI Governance: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H17 | Claude: C17

#### RP17.P05: Fixtures And Golden Cases

- RP17.P05.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for AI Governance: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H17 | Claude: C17
- RP17.P05.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for AI Governance: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H17 | Claude: C17
- RP17.P05.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for AI Governance: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H17 | Claude: C17
- RP17.P05.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for AI Governance: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H17 | Claude: C17
- RP17.P05.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for AI Governance: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H17 | Claude: C17
- RP17.P05.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for AI Governance: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H17 | Claude: C17
- RP17.P05.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for AI Governance: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H17 | Claude: C17
- RP17.P05.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for AI Governance: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H17 | Claude: C17 | Reqs: AI-001:test, AI-002:test, AI-003:test, AI-004:test, AI-005:test, AI-006:test, AI-007:test, AI-008:test, AI-009:test, AI-010:test, AI-011:test, AI-012:test
- RP17.P05.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for AI Governance: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H17 | Claude: C17
- RP17.P05.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for AI Governance: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H17 | Claude: C17
- RP17.P05.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for AI Governance: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H17 | Claude: C17

#### RP17.P06: Permission Audit Integration

- RP17.P06.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for AI Governance: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H17 | Claude: C17
- RP17.P06.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for AI Governance: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H17 | Claude: C17
- RP17.P06.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for AI Governance: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H17 | Claude: C17
- RP17.P06.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for AI Governance: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H17 | Claude: C17
- RP17.P06.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for AI Governance: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H17 | Claude: C17
- RP17.P06.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for AI Governance: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H17 | Claude: C17
- RP17.P06.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for AI Governance: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H17 | Claude: C17
- RP17.P06.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for AI Governance: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H17 | Claude: C17
- RP17.P06.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for AI Governance: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H17 | Claude: C17
- RP17.P06.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for AI Governance: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H17 | Claude: C17
- RP17.P06.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for AI Governance: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H17 | Claude: C17

#### RP17.P07: Failure Edge And Recovery

- RP17.P07.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for AI Governance: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H17 | Claude: C17
- RP17.P07.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for AI Governance: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H17 | Claude: C17
- RP17.P07.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for AI Governance: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H17 | Claude: C17
- RP17.P07.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for AI Governance: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H17 | Claude: C17
- RP17.P07.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for AI Governance: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H17 | Claude: C17
- RP17.P07.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for AI Governance: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H17 | Claude: C17
- RP17.P07.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for AI Governance: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H17 | Claude: C17
- RP17.P07.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for AI Governance: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H17 | Claude: C17
- RP17.P07.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for AI Governance: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H17 | Claude: C17
- RP17.P07.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for AI Governance: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H17 | Claude: C17
- RP17.P07.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for AI Governance: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H17 | Claude: C17

#### RP17.P08: Hermes Validation Binding

- RP17.P08.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for AI Governance: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H17 | Claude: C17
- RP17.P08.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for AI Governance: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H17 | Claude: C17
- RP17.P08.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for AI Governance: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H17 | Claude: C17
- RP17.P08.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for AI Governance: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H17 | Claude: C17
- RP17.P08.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for AI Governance: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H17 | Claude: C17
- RP17.P08.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for AI Governance: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H17 | Claude: C17
- RP17.P08.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for AI Governance: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H17 | Claude: C17
- RP17.P08.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for AI Governance: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H17 | Claude: C17
- RP17.P08.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for AI Governance: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H17 | Claude: C17 | Reqs: AI-001:hermes_evidence, AI-002:hermes_evidence, AI-003:hermes_evidence, AI-004:hermes_evidence, AI-005:hermes_evidence, AI-006:hermes_evidence, AI-007:hermes_evidence, AI-008:hermes_evidence, AI-009:hermes_evidence, AI-010:hermes_evidence, AI-011:hermes_evidence, AI-012:hermes_evidence
- RP17.P08.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for AI Governance: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H17 | Claude: C17
- RP17.P08.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for AI Governance: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H17 | Claude: C17

#### RP17.P09: Claude Cross Validation Closeout

- RP17.P09.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for AI Governance: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H17 | Claude: C17
- RP17.P09.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for AI Governance: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H17 | Claude: C17
- RP17.P09.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for AI Governance: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H17 | Claude: C17
- RP17.P09.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for AI Governance: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H17 | Claude: C17
- RP17.P09.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for AI Governance: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H17 | Claude: C17
- RP17.P09.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for AI Governance: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H17 | Claude: C17
- RP17.P09.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for AI Governance: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H17 | Claude: C17
- RP17.P09.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for AI Governance: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H17 | Claude: C17
- RP17.P09.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for AI Governance: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H17 | Claude: C17
- RP17.P09.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for AI Governance: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H17 | Claude: C17 | Reqs: AI-001:claude_review, AI-002:claude_review, AI-003:claude_review, AI-004:claude_review, AI-005:claude_review, AI-006:claude_review, AI-007:claude_review, AI-008:claude_review, AI-009:claude_review, AI-010:claude_review, AI-011:claude_review, AI-012:claude_review
- RP17.P09.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for AI Governance: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H17 | Claude: C17


### RP18: AI Legal Workflows

Scope: Precedent, clause, markup, DD extraction, drafting, reports

#### RP18.P00: Contract And Acceptance Baseline

- RP18.P00.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for AI Legal Workflows: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H18 | Claude: C18
- RP18.P00.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for AI Legal Workflows: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H18 | Claude: C18
- RP18.P00.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for AI Legal Workflows: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H18 | Claude: C18
- RP18.P00.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for AI Legal Workflows: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H18 | Claude: C18
- RP18.P00.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for AI Legal Workflows: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H18 | Claude: C18
- RP18.P00.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for AI Legal Workflows: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H18 | Claude: C18
- RP18.P00.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for AI Legal Workflows: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H18 | Claude: C18
- RP18.P00.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for AI Legal Workflows: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H18 | Claude: C18
- RP18.P00.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for AI Legal Workflows: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H18 | Claude: C18
- RP18.P00.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for AI Legal Workflows: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H18 | Claude: C18
- RP18.P00.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for AI Legal Workflows: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H18 | Claude: C18

#### RP18.P01: Domain Model

- RP18.P01.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for AI Legal Workflows: Domain Model. | Commands: npm run validate | Hermes: H18 | Claude: C18
- RP18.P01.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for AI Legal Workflows: Domain Model. | Commands: npm run validate | Hermes: H18 | Claude: C18
- RP18.P01.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for AI Legal Workflows: Domain Model. | Commands: npm run validate | Hermes: H18 | Claude: C18
- RP18.P01.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for AI Legal Workflows: Domain Model. | Commands: npm run validate | Hermes: H18 | Claude: C18
- RP18.P01.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for AI Legal Workflows: Domain Model. | Commands: npm run validate | Hermes: H18 | Claude: C18
- RP18.P01.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for AI Legal Workflows: Domain Model. | Commands: npm run validate | Hermes: H18 | Claude: C18
- RP18.P01.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for AI Legal Workflows: Domain Model. | Commands: npm run validate | Hermes: H18 | Claude: C18
- RP18.P01.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for AI Legal Workflows: Domain Model. | Commands: npm run validate | Hermes: H18 | Claude: C18
- RP18.P01.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for AI Legal Workflows: Domain Model. | Commands: npm run validate | Hermes: H18 | Claude: C18
- RP18.P01.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for AI Legal Workflows: Domain Model. | Commands: npm run validate | Hermes: H18 | Claude: C18
- RP18.P01.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for AI Legal Workflows: Domain Model. | Commands: npm run validate | Hermes: H18 | Claude: C18

#### RP18.P02: Service Logic

- RP18.P02.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for AI Legal Workflows: Service Logic. | Commands: npm run validate, npm test | Hermes: H18 | Claude: C18
- RP18.P02.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for AI Legal Workflows: Service Logic. | Commands: npm run validate, npm test | Hermes: H18 | Claude: C18
- RP18.P02.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for AI Legal Workflows: Service Logic. | Commands: npm run validate, npm test | Hermes: H18 | Claude: C18
- RP18.P02.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for AI Legal Workflows: Service Logic. | Commands: npm run validate, npm test | Hermes: H18 | Claude: C18
- RP18.P02.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for AI Legal Workflows: Service Logic. | Commands: npm run validate, npm test | Hermes: H18 | Claude: C18
- RP18.P02.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for AI Legal Workflows: Service Logic. | Commands: npm run validate, npm test | Hermes: H18 | Claude: C18
- RP18.P02.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for AI Legal Workflows: Service Logic. | Commands: npm run validate, npm test | Hermes: H18 | Claude: C18
- RP18.P02.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for AI Legal Workflows: Service Logic. | Commands: npm run validate, npm test | Hermes: H18 | Claude: C18
- RP18.P02.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for AI Legal Workflows: Service Logic. | Commands: npm run validate, npm test | Hermes: H18 | Claude: C18
- RP18.P02.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for AI Legal Workflows: Service Logic. | Commands: npm run validate, npm test | Hermes: H18 | Claude: C18
- RP18.P02.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for AI Legal Workflows: Service Logic. | Commands: npm run validate, npm test | Hermes: H18 | Claude: C18

#### RP18.P03: API And Interface

- RP18.P03.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for AI Legal Workflows: API And Interface. | Commands: npm run validate, npm test | Hermes: H18 | Claude: C18
- RP18.P03.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for AI Legal Workflows: API And Interface. | Commands: npm run validate, npm test | Hermes: H18 | Claude: C18
- RP18.P03.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for AI Legal Workflows: API And Interface. | Commands: npm run validate, npm test | Hermes: H18 | Claude: C18
- RP18.P03.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for AI Legal Workflows: API And Interface. | Commands: npm run validate, npm test | Hermes: H18 | Claude: C18
- RP18.P03.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for AI Legal Workflows: API And Interface. | Commands: npm run validate, npm test | Hermes: H18 | Claude: C18
- RP18.P03.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for AI Legal Workflows: API And Interface. | Commands: npm run validate, npm test | Hermes: H18 | Claude: C18
- RP18.P03.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for AI Legal Workflows: API And Interface. | Commands: npm run validate, npm test | Hermes: H18 | Claude: C18
- RP18.P03.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for AI Legal Workflows: API And Interface. | Commands: npm run validate, npm test | Hermes: H18 | Claude: C18
- RP18.P03.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for AI Legal Workflows: API And Interface. | Commands: npm run validate, npm test | Hermes: H18 | Claude: C18
- RP18.P03.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for AI Legal Workflows: API And Interface. | Commands: npm run validate, npm test | Hermes: H18 | Claude: C18
- RP18.P03.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for AI Legal Workflows: API And Interface. | Commands: npm run validate, npm test | Hermes: H18 | Claude: C18

#### RP18.P04: UI And Operator Surface

- RP18.P04.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for AI Legal Workflows: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H18 | Claude: C18
- RP18.P04.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for AI Legal Workflows: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H18 | Claude: C18
- RP18.P04.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for AI Legal Workflows: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H18 | Claude: C18
- RP18.P04.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for AI Legal Workflows: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H18 | Claude: C18
- RP18.P04.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for AI Legal Workflows: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H18 | Claude: C18
- RP18.P04.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for AI Legal Workflows: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H18 | Claude: C18
- RP18.P04.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for AI Legal Workflows: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H18 | Claude: C18
- RP18.P04.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for AI Legal Workflows: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H18 | Claude: C18
- RP18.P04.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for AI Legal Workflows: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H18 | Claude: C18
- RP18.P04.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for AI Legal Workflows: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H18 | Claude: C18
- RP18.P04.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for AI Legal Workflows: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H18 | Claude: C18

#### RP18.P05: Fixtures And Golden Cases

- RP18.P05.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for AI Legal Workflows: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H18 | Claude: C18
- RP18.P05.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for AI Legal Workflows: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H18 | Claude: C18
- RP18.P05.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for AI Legal Workflows: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H18 | Claude: C18
- RP18.P05.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for AI Legal Workflows: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H18 | Claude: C18
- RP18.P05.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for AI Legal Workflows: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H18 | Claude: C18
- RP18.P05.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for AI Legal Workflows: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H18 | Claude: C18
- RP18.P05.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for AI Legal Workflows: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H18 | Claude: C18
- RP18.P05.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for AI Legal Workflows: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H18 | Claude: C18
- RP18.P05.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for AI Legal Workflows: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H18 | Claude: C18
- RP18.P05.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for AI Legal Workflows: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H18 | Claude: C18
- RP18.P05.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for AI Legal Workflows: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H18 | Claude: C18

#### RP18.P06: Permission Audit Integration

- RP18.P06.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for AI Legal Workflows: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H18 | Claude: C18
- RP18.P06.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for AI Legal Workflows: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H18 | Claude: C18
- RP18.P06.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for AI Legal Workflows: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H18 | Claude: C18
- RP18.P06.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for AI Legal Workflows: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H18 | Claude: C18
- RP18.P06.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for AI Legal Workflows: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H18 | Claude: C18
- RP18.P06.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for AI Legal Workflows: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H18 | Claude: C18
- RP18.P06.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for AI Legal Workflows: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H18 | Claude: C18
- RP18.P06.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for AI Legal Workflows: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H18 | Claude: C18
- RP18.P06.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for AI Legal Workflows: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H18 | Claude: C18
- RP18.P06.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for AI Legal Workflows: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H18 | Claude: C18
- RP18.P06.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for AI Legal Workflows: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H18 | Claude: C18

#### RP18.P07: Failure Edge And Recovery

- RP18.P07.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for AI Legal Workflows: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H18 | Claude: C18
- RP18.P07.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for AI Legal Workflows: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H18 | Claude: C18
- RP18.P07.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for AI Legal Workflows: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H18 | Claude: C18
- RP18.P07.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for AI Legal Workflows: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H18 | Claude: C18
- RP18.P07.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for AI Legal Workflows: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H18 | Claude: C18
- RP18.P07.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for AI Legal Workflows: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H18 | Claude: C18
- RP18.P07.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for AI Legal Workflows: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H18 | Claude: C18
- RP18.P07.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for AI Legal Workflows: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H18 | Claude: C18
- RP18.P07.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for AI Legal Workflows: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H18 | Claude: C18
- RP18.P07.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for AI Legal Workflows: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H18 | Claude: C18
- RP18.P07.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for AI Legal Workflows: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H18 | Claude: C18

#### RP18.P08: Hermes Validation Binding

- RP18.P08.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for AI Legal Workflows: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H18 | Claude: C18
- RP18.P08.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for AI Legal Workflows: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H18 | Claude: C18
- RP18.P08.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for AI Legal Workflows: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H18 | Claude: C18
- RP18.P08.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for AI Legal Workflows: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H18 | Claude: C18
- RP18.P08.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for AI Legal Workflows: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H18 | Claude: C18
- RP18.P08.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for AI Legal Workflows: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H18 | Claude: C18
- RP18.P08.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for AI Legal Workflows: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H18 | Claude: C18
- RP18.P08.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for AI Legal Workflows: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H18 | Claude: C18
- RP18.P08.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for AI Legal Workflows: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H18 | Claude: C18
- RP18.P08.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for AI Legal Workflows: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H18 | Claude: C18
- RP18.P08.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for AI Legal Workflows: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H18 | Claude: C18

#### RP18.P09: Claude Cross Validation Closeout

- RP18.P09.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for AI Legal Workflows: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H18 | Claude: C18
- RP18.P09.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for AI Legal Workflows: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H18 | Claude: C18
- RP18.P09.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for AI Legal Workflows: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H18 | Claude: C18
- RP18.P09.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for AI Legal Workflows: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H18 | Claude: C18
- RP18.P09.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for AI Legal Workflows: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H18 | Claude: C18
- RP18.P09.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for AI Legal Workflows: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H18 | Claude: C18
- RP18.P09.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for AI Legal Workflows: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H18 | Claude: C18
- RP18.P09.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for AI Legal Workflows: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H18 | Claude: C18
- RP18.P09.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for AI Legal Workflows: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H18 | Claude: C18
- RP18.P09.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for AI Legal Workflows: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H18 | Claude: C18
- RP18.P09.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for AI Legal Workflows: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H18 | Claude: C18


### RP19: Client Portal

Scope: Client users, secure link, client review, Q&A, watermark

#### RP19.P00: Contract And Acceptance Baseline

- RP19.P00.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Client Portal: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H19 | Claude: C19
- RP19.P00.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Client Portal: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H19 | Claude: C19
- RP19.P00.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Client Portal: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H19 | Claude: C19
- RP19.P00.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Client Portal: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H19 | Claude: C19
- RP19.P00.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Client Portal: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H19 | Claude: C19
- RP19.P00.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Client Portal: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H19 | Claude: C19
- RP19.P00.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Client Portal: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H19 | Claude: C19
- RP19.P00.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Client Portal: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H19 | Claude: C19
- RP19.P00.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Client Portal: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H19 | Claude: C19
- RP19.P00.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Client Portal: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H19 | Claude: C19
- RP19.P00.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Client Portal: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H19 | Claude: C19

#### RP19.P01: Domain Model

- RP19.P01.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Client Portal: Domain Model. | Commands: npm run validate | Hermes: H19 | Claude: C19
- RP19.P01.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Client Portal: Domain Model. | Commands: npm run validate | Hermes: H19 | Claude: C19
- RP19.P01.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Client Portal: Domain Model. | Commands: npm run validate | Hermes: H19 | Claude: C19
- RP19.P01.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Client Portal: Domain Model. | Commands: npm run validate | Hermes: H19 | Claude: C19
- RP19.P01.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Client Portal: Domain Model. | Commands: npm run validate | Hermes: H19 | Claude: C19
- RP19.P01.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Client Portal: Domain Model. | Commands: npm run validate | Hermes: H19 | Claude: C19
- RP19.P01.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Client Portal: Domain Model. | Commands: npm run validate | Hermes: H19 | Claude: C19
- RP19.P01.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Client Portal: Domain Model. | Commands: npm run validate | Hermes: H19 | Claude: C19
- RP19.P01.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Client Portal: Domain Model. | Commands: npm run validate | Hermes: H19 | Claude: C19
- RP19.P01.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Client Portal: Domain Model. | Commands: npm run validate | Hermes: H19 | Claude: C19
- RP19.P01.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Client Portal: Domain Model. | Commands: npm run validate | Hermes: H19 | Claude: C19

#### RP19.P02: Service Logic

- RP19.P02.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Client Portal: Service Logic. | Commands: npm run validate, npm test | Hermes: H19 | Claude: C19
- RP19.P02.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Client Portal: Service Logic. | Commands: npm run validate, npm test | Hermes: H19 | Claude: C19
- RP19.P02.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Client Portal: Service Logic. | Commands: npm run validate, npm test | Hermes: H19 | Claude: C19
- RP19.P02.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Client Portal: Service Logic. | Commands: npm run validate, npm test | Hermes: H19 | Claude: C19
- RP19.P02.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Client Portal: Service Logic. | Commands: npm run validate, npm test | Hermes: H19 | Claude: C19
- RP19.P02.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Client Portal: Service Logic. | Commands: npm run validate, npm test | Hermes: H19 | Claude: C19
- RP19.P02.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Client Portal: Service Logic. | Commands: npm run validate, npm test | Hermes: H19 | Claude: C19
- RP19.P02.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Client Portal: Service Logic. | Commands: npm run validate, npm test | Hermes: H19 | Claude: C19
- RP19.P02.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Client Portal: Service Logic. | Commands: npm run validate, npm test | Hermes: H19 | Claude: C19
- RP19.P02.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Client Portal: Service Logic. | Commands: npm run validate, npm test | Hermes: H19 | Claude: C19
- RP19.P02.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Client Portal: Service Logic. | Commands: npm run validate, npm test | Hermes: H19 | Claude: C19

#### RP19.P03: API And Interface

- RP19.P03.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Client Portal: API And Interface. | Commands: npm run validate, npm test | Hermes: H19 | Claude: C19
- RP19.P03.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Client Portal: API And Interface. | Commands: npm run validate, npm test | Hermes: H19 | Claude: C19
- RP19.P03.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Client Portal: API And Interface. | Commands: npm run validate, npm test | Hermes: H19 | Claude: C19
- RP19.P03.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Client Portal: API And Interface. | Commands: npm run validate, npm test | Hermes: H19 | Claude: C19
- RP19.P03.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Client Portal: API And Interface. | Commands: npm run validate, npm test | Hermes: H19 | Claude: C19
- RP19.P03.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Client Portal: API And Interface. | Commands: npm run validate, npm test | Hermes: H19 | Claude: C19
- RP19.P03.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Client Portal: API And Interface. | Commands: npm run validate, npm test | Hermes: H19 | Claude: C19
- RP19.P03.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Client Portal: API And Interface. | Commands: npm run validate, npm test | Hermes: H19 | Claude: C19
- RP19.P03.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Client Portal: API And Interface. | Commands: npm run validate, npm test | Hermes: H19 | Claude: C19
- RP19.P03.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Client Portal: API And Interface. | Commands: npm run validate, npm test | Hermes: H19 | Claude: C19
- RP19.P03.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Client Portal: API And Interface. | Commands: npm run validate, npm test | Hermes: H19 | Claude: C19

#### RP19.P04: UI And Operator Surface

- RP19.P04.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Client Portal: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H19 | Claude: C19
- RP19.P04.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Client Portal: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H19 | Claude: C19
- RP19.P04.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Client Portal: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H19 | Claude: C19
- RP19.P04.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Client Portal: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H19 | Claude: C19
- RP19.P04.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Client Portal: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H19 | Claude: C19
- RP19.P04.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Client Portal: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H19 | Claude: C19
- RP19.P04.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Client Portal: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H19 | Claude: C19
- RP19.P04.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Client Portal: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H19 | Claude: C19
- RP19.P04.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Client Portal: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H19 | Claude: C19
- RP19.P04.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Client Portal: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H19 | Claude: C19
- RP19.P04.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Client Portal: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H19 | Claude: C19

#### RP19.P05: Fixtures And Golden Cases

- RP19.P05.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Client Portal: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H19 | Claude: C19
- RP19.P05.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Client Portal: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H19 | Claude: C19
- RP19.P05.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Client Portal: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H19 | Claude: C19
- RP19.P05.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Client Portal: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H19 | Claude: C19
- RP19.P05.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Client Portal: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H19 | Claude: C19
- RP19.P05.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Client Portal: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H19 | Claude: C19
- RP19.P05.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Client Portal: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H19 | Claude: C19
- RP19.P05.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Client Portal: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H19 | Claude: C19
- RP19.P05.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Client Portal: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H19 | Claude: C19
- RP19.P05.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Client Portal: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H19 | Claude: C19
- RP19.P05.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Client Portal: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H19 | Claude: C19

#### RP19.P06: Permission Audit Integration

- RP19.P06.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Client Portal: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H19 | Claude: C19
- RP19.P06.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Client Portal: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H19 | Claude: C19
- RP19.P06.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Client Portal: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H19 | Claude: C19
- RP19.P06.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Client Portal: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H19 | Claude: C19
- RP19.P06.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Client Portal: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H19 | Claude: C19
- RP19.P06.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Client Portal: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H19 | Claude: C19
- RP19.P06.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Client Portal: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H19 | Claude: C19
- RP19.P06.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Client Portal: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H19 | Claude: C19
- RP19.P06.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Client Portal: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H19 | Claude: C19
- RP19.P06.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Client Portal: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H19 | Claude: C19
- RP19.P06.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Client Portal: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H19 | Claude: C19

#### RP19.P07: Failure Edge And Recovery

- RP19.P07.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Client Portal: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H19 | Claude: C19
- RP19.P07.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Client Portal: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H19 | Claude: C19
- RP19.P07.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Client Portal: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H19 | Claude: C19
- RP19.P07.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Client Portal: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H19 | Claude: C19
- RP19.P07.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Client Portal: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H19 | Claude: C19
- RP19.P07.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Client Portal: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H19 | Claude: C19
- RP19.P07.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Client Portal: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H19 | Claude: C19
- RP19.P07.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Client Portal: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H19 | Claude: C19
- RP19.P07.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Client Portal: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H19 | Claude: C19
- RP19.P07.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Client Portal: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H19 | Claude: C19
- RP19.P07.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Client Portal: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H19 | Claude: C19

#### RP19.P08: Hermes Validation Binding

- RP19.P08.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Client Portal: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H19 | Claude: C19
- RP19.P08.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Client Portal: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H19 | Claude: C19
- RP19.P08.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Client Portal: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H19 | Claude: C19
- RP19.P08.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Client Portal: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H19 | Claude: C19
- RP19.P08.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Client Portal: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H19 | Claude: C19
- RP19.P08.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Client Portal: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H19 | Claude: C19
- RP19.P08.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Client Portal: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H19 | Claude: C19
- RP19.P08.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Client Portal: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H19 | Claude: C19
- RP19.P08.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Client Portal: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H19 | Claude: C19
- RP19.P08.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Client Portal: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H19 | Claude: C19
- RP19.P08.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Client Portal: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H19 | Claude: C19

#### RP19.P09: Claude Cross Validation Closeout

- RP19.P09.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Client Portal: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H19 | Claude: C19
- RP19.P09.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Client Portal: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H19 | Claude: C19
- RP19.P09.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Client Portal: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H19 | Claude: C19
- RP19.P09.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Client Portal: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H19 | Claude: C19
- RP19.P09.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Client Portal: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H19 | Claude: C19
- RP19.P09.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Client Portal: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H19 | Claude: C19
- RP19.P09.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Client Portal: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H19 | Claude: C19
- RP19.P09.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Client Portal: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H19 | Claude: C19
- RP19.P09.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Client Portal: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H19 | Claude: C19
- RP19.P09.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Client Portal: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H19 | Claude: C19
- RP19.P09.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Client Portal: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H19 | Claude: C19


### RP20: Data Room And VDR

Scope: M&A room, RFI, CP, closing binder, access analytics

#### RP20.P00: Contract And Acceptance Baseline

- RP20.P00.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Data Room And VDR: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H20 | Claude: C20
- RP20.P00.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Data Room And VDR: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H20 | Claude: C20 | Reqs: NARR-015:contract
- RP20.P00.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Data Room And VDR: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H20 | Claude: C20
- RP20.P00.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Data Room And VDR: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H20 | Claude: C20
- RP20.P00.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Data Room And VDR: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H20 | Claude: C20
- RP20.P00.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Data Room And VDR: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H20 | Claude: C20
- RP20.P00.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Data Room And VDR: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H20 | Claude: C20
- RP20.P00.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Data Room And VDR: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H20 | Claude: C20
- RP20.P00.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Data Room And VDR: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H20 | Claude: C20
- RP20.P00.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Data Room And VDR: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H20 | Claude: C20
- RP20.P00.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Data Room And VDR: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H20 | Claude: C20

#### RP20.P01: Domain Model

- RP20.P01.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Data Room And VDR: Domain Model. | Commands: npm run validate | Hermes: H20 | Claude: C20
- RP20.P01.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Data Room And VDR: Domain Model. | Commands: npm run validate | Hermes: H20 | Claude: C20
- RP20.P01.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Data Room And VDR: Domain Model. | Commands: npm run validate | Hermes: H20 | Claude: C20
- RP20.P01.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Data Room And VDR: Domain Model. | Commands: npm run validate | Hermes: H20 | Claude: C20
- RP20.P01.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Data Room And VDR: Domain Model. | Commands: npm run validate | Hermes: H20 | Claude: C20
- RP20.P01.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Data Room And VDR: Domain Model. | Commands: npm run validate | Hermes: H20 | Claude: C20
- RP20.P01.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Data Room And VDR: Domain Model. | Commands: npm run validate | Hermes: H20 | Claude: C20
- RP20.P01.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Data Room And VDR: Domain Model. | Commands: npm run validate | Hermes: H20 | Claude: C20
- RP20.P01.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Data Room And VDR: Domain Model. | Commands: npm run validate | Hermes: H20 | Claude: C20
- RP20.P01.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Data Room And VDR: Domain Model. | Commands: npm run validate | Hermes: H20 | Claude: C20
- RP20.P01.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Data Room And VDR: Domain Model. | Commands: npm run validate | Hermes: H20 | Claude: C20

#### RP20.P02: Service Logic

- RP20.P02.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Data Room And VDR: Service Logic. | Commands: npm run validate, npm test | Hermes: H20 | Claude: C20
- RP20.P02.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Data Room And VDR: Service Logic. | Commands: npm run validate, npm test | Hermes: H20 | Claude: C20
- RP20.P02.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Data Room And VDR: Service Logic. | Commands: npm run validate, npm test | Hermes: H20 | Claude: C20
- RP20.P02.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Data Room And VDR: Service Logic. | Commands: npm run validate, npm test | Hermes: H20 | Claude: C20 | Reqs: NARR-015:primary_implementation
- RP20.P02.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Data Room And VDR: Service Logic. | Commands: npm run validate, npm test | Hermes: H20 | Claude: C20
- RP20.P02.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Data Room And VDR: Service Logic. | Commands: npm run validate, npm test | Hermes: H20 | Claude: C20
- RP20.P02.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Data Room And VDR: Service Logic. | Commands: npm run validate, npm test | Hermes: H20 | Claude: C20
- RP20.P02.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Data Room And VDR: Service Logic. | Commands: npm run validate, npm test | Hermes: H20 | Claude: C20
- RP20.P02.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Data Room And VDR: Service Logic. | Commands: npm run validate, npm test | Hermes: H20 | Claude: C20
- RP20.P02.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Data Room And VDR: Service Logic. | Commands: npm run validate, npm test | Hermes: H20 | Claude: C20
- RP20.P02.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Data Room And VDR: Service Logic. | Commands: npm run validate, npm test | Hermes: H20 | Claude: C20

#### RP20.P03: API And Interface

- RP20.P03.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Data Room And VDR: API And Interface. | Commands: npm run validate, npm test | Hermes: H20 | Claude: C20
- RP20.P03.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Data Room And VDR: API And Interface. | Commands: npm run validate, npm test | Hermes: H20 | Claude: C20
- RP20.P03.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Data Room And VDR: API And Interface. | Commands: npm run validate, npm test | Hermes: H20 | Claude: C20
- RP20.P03.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Data Room And VDR: API And Interface. | Commands: npm run validate, npm test | Hermes: H20 | Claude: C20
- RP20.P03.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Data Room And VDR: API And Interface. | Commands: npm run validate, npm test | Hermes: H20 | Claude: C20
- RP20.P03.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Data Room And VDR: API And Interface. | Commands: npm run validate, npm test | Hermes: H20 | Claude: C20
- RP20.P03.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Data Room And VDR: API And Interface. | Commands: npm run validate, npm test | Hermes: H20 | Claude: C20
- RP20.P03.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Data Room And VDR: API And Interface. | Commands: npm run validate, npm test | Hermes: H20 | Claude: C20
- RP20.P03.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Data Room And VDR: API And Interface. | Commands: npm run validate, npm test | Hermes: H20 | Claude: C20
- RP20.P03.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Data Room And VDR: API And Interface. | Commands: npm run validate, npm test | Hermes: H20 | Claude: C20
- RP20.P03.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Data Room And VDR: API And Interface. | Commands: npm run validate, npm test | Hermes: H20 | Claude: C20

#### RP20.P04: UI And Operator Surface

- RP20.P04.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Data Room And VDR: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H20 | Claude: C20
- RP20.P04.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Data Room And VDR: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H20 | Claude: C20
- RP20.P04.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Data Room And VDR: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H20 | Claude: C20
- RP20.P04.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Data Room And VDR: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H20 | Claude: C20
- RP20.P04.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Data Room And VDR: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H20 | Claude: C20
- RP20.P04.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Data Room And VDR: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H20 | Claude: C20
- RP20.P04.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Data Room And VDR: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H20 | Claude: C20
- RP20.P04.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Data Room And VDR: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H20 | Claude: C20
- RP20.P04.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Data Room And VDR: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H20 | Claude: C20
- RP20.P04.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Data Room And VDR: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H20 | Claude: C20
- RP20.P04.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Data Room And VDR: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H20 | Claude: C20

#### RP20.P05: Fixtures And Golden Cases

- RP20.P05.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Data Room And VDR: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H20 | Claude: C20
- RP20.P05.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Data Room And VDR: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H20 | Claude: C20
- RP20.P05.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Data Room And VDR: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H20 | Claude: C20
- RP20.P05.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Data Room And VDR: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H20 | Claude: C20
- RP20.P05.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Data Room And VDR: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H20 | Claude: C20
- RP20.P05.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Data Room And VDR: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H20 | Claude: C20
- RP20.P05.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Data Room And VDR: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H20 | Claude: C20
- RP20.P05.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Data Room And VDR: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H20 | Claude: C20 | Reqs: NARR-015:test
- RP20.P05.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Data Room And VDR: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H20 | Claude: C20
- RP20.P05.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Data Room And VDR: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H20 | Claude: C20
- RP20.P05.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Data Room And VDR: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H20 | Claude: C20

#### RP20.P06: Permission Audit Integration

- RP20.P06.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Data Room And VDR: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H20 | Claude: C20
- RP20.P06.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Data Room And VDR: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H20 | Claude: C20
- RP20.P06.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Data Room And VDR: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H20 | Claude: C20
- RP20.P06.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Data Room And VDR: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H20 | Claude: C20
- RP20.P06.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Data Room And VDR: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H20 | Claude: C20
- RP20.P06.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Data Room And VDR: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H20 | Claude: C20
- RP20.P06.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Data Room And VDR: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H20 | Claude: C20
- RP20.P06.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Data Room And VDR: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H20 | Claude: C20
- RP20.P06.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Data Room And VDR: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H20 | Claude: C20
- RP20.P06.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Data Room And VDR: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H20 | Claude: C20
- RP20.P06.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Data Room And VDR: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H20 | Claude: C20

#### RP20.P07: Failure Edge And Recovery

- RP20.P07.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Data Room And VDR: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H20 | Claude: C20
- RP20.P07.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Data Room And VDR: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H20 | Claude: C20
- RP20.P07.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Data Room And VDR: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H20 | Claude: C20
- RP20.P07.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Data Room And VDR: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H20 | Claude: C20
- RP20.P07.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Data Room And VDR: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H20 | Claude: C20
- RP20.P07.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Data Room And VDR: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H20 | Claude: C20
- RP20.P07.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Data Room And VDR: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H20 | Claude: C20
- RP20.P07.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Data Room And VDR: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H20 | Claude: C20
- RP20.P07.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Data Room And VDR: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H20 | Claude: C20
- RP20.P07.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Data Room And VDR: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H20 | Claude: C20
- RP20.P07.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Data Room And VDR: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H20 | Claude: C20

#### RP20.P08: Hermes Validation Binding

- RP20.P08.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Data Room And VDR: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H20 | Claude: C20
- RP20.P08.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Data Room And VDR: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H20 | Claude: C20
- RP20.P08.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Data Room And VDR: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H20 | Claude: C20
- RP20.P08.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Data Room And VDR: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H20 | Claude: C20
- RP20.P08.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Data Room And VDR: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H20 | Claude: C20
- RP20.P08.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Data Room And VDR: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H20 | Claude: C20
- RP20.P08.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Data Room And VDR: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H20 | Claude: C20
- RP20.P08.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Data Room And VDR: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H20 | Claude: C20
- RP20.P08.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Data Room And VDR: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H20 | Claude: C20 | Reqs: NARR-015:hermes_evidence
- RP20.P08.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Data Room And VDR: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H20 | Claude: C20
- RP20.P08.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Data Room And VDR: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H20 | Claude: C20

#### RP20.P09: Claude Cross Validation Closeout

- RP20.P09.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Data Room And VDR: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H20 | Claude: C20
- RP20.P09.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Data Room And VDR: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H20 | Claude: C20
- RP20.P09.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Data Room And VDR: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H20 | Claude: C20
- RP20.P09.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Data Room And VDR: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H20 | Claude: C20
- RP20.P09.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Data Room And VDR: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H20 | Claude: C20
- RP20.P09.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Data Room And VDR: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H20 | Claude: C20
- RP20.P09.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Data Room And VDR: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H20 | Claude: C20
- RP20.P09.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Data Room And VDR: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H20 | Claude: C20
- RP20.P09.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Data Room And VDR: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H20 | Claude: C20
- RP20.P09.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Data Room And VDR: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H20 | Claude: C20 | Reqs: NARR-015:claude_review
- RP20.P09.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Data Room And VDR: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H20 | Claude: C20


### RP21: Admin Console

Scope: Taxonomy, templates, workflow, policy, usage, billing plan

#### RP21.P00: Contract And Acceptance Baseline

- RP21.P00.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Admin Console: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H21 | Claude: C21
- RP21.P00.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Admin Console: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H21 | Claude: C21
- RP21.P00.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Admin Console: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H21 | Claude: C21
- RP21.P00.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Admin Console: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H21 | Claude: C21
- RP21.P00.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Admin Console: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H21 | Claude: C21
- RP21.P00.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Admin Console: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H21 | Claude: C21
- RP21.P00.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Admin Console: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H21 | Claude: C21
- RP21.P00.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Admin Console: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H21 | Claude: C21
- RP21.P00.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Admin Console: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H21 | Claude: C21
- RP21.P00.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Admin Console: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H21 | Claude: C21
- RP21.P00.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Admin Console: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H21 | Claude: C21

#### RP21.P01: Domain Model

- RP21.P01.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Admin Console: Domain Model. | Commands: npm run validate | Hermes: H21 | Claude: C21
- RP21.P01.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Admin Console: Domain Model. | Commands: npm run validate | Hermes: H21 | Claude: C21
- RP21.P01.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Admin Console: Domain Model. | Commands: npm run validate | Hermes: H21 | Claude: C21
- RP21.P01.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Admin Console: Domain Model. | Commands: npm run validate | Hermes: H21 | Claude: C21
- RP21.P01.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Admin Console: Domain Model. | Commands: npm run validate | Hermes: H21 | Claude: C21
- RP21.P01.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Admin Console: Domain Model. | Commands: npm run validate | Hermes: H21 | Claude: C21
- RP21.P01.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Admin Console: Domain Model. | Commands: npm run validate | Hermes: H21 | Claude: C21
- RP21.P01.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Admin Console: Domain Model. | Commands: npm run validate | Hermes: H21 | Claude: C21
- RP21.P01.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Admin Console: Domain Model. | Commands: npm run validate | Hermes: H21 | Claude: C21
- RP21.P01.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Admin Console: Domain Model. | Commands: npm run validate | Hermes: H21 | Claude: C21
- RP21.P01.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Admin Console: Domain Model. | Commands: npm run validate | Hermes: H21 | Claude: C21

#### RP21.P02: Service Logic

- RP21.P02.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Admin Console: Service Logic. | Commands: npm run validate, npm test | Hermes: H21 | Claude: C21
- RP21.P02.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Admin Console: Service Logic. | Commands: npm run validate, npm test | Hermes: H21 | Claude: C21
- RP21.P02.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Admin Console: Service Logic. | Commands: npm run validate, npm test | Hermes: H21 | Claude: C21
- RP21.P02.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Admin Console: Service Logic. | Commands: npm run validate, npm test | Hermes: H21 | Claude: C21
- RP21.P02.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Admin Console: Service Logic. | Commands: npm run validate, npm test | Hermes: H21 | Claude: C21
- RP21.P02.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Admin Console: Service Logic. | Commands: npm run validate, npm test | Hermes: H21 | Claude: C21
- RP21.P02.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Admin Console: Service Logic. | Commands: npm run validate, npm test | Hermes: H21 | Claude: C21
- RP21.P02.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Admin Console: Service Logic. | Commands: npm run validate, npm test | Hermes: H21 | Claude: C21
- RP21.P02.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Admin Console: Service Logic. | Commands: npm run validate, npm test | Hermes: H21 | Claude: C21
- RP21.P02.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Admin Console: Service Logic. | Commands: npm run validate, npm test | Hermes: H21 | Claude: C21
- RP21.P02.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Admin Console: Service Logic. | Commands: npm run validate, npm test | Hermes: H21 | Claude: C21

#### RP21.P03: API And Interface

- RP21.P03.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Admin Console: API And Interface. | Commands: npm run validate, npm test | Hermes: H21 | Claude: C21
- RP21.P03.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Admin Console: API And Interface. | Commands: npm run validate, npm test | Hermes: H21 | Claude: C21
- RP21.P03.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Admin Console: API And Interface. | Commands: npm run validate, npm test | Hermes: H21 | Claude: C21
- RP21.P03.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Admin Console: API And Interface. | Commands: npm run validate, npm test | Hermes: H21 | Claude: C21
- RP21.P03.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Admin Console: API And Interface. | Commands: npm run validate, npm test | Hermes: H21 | Claude: C21
- RP21.P03.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Admin Console: API And Interface. | Commands: npm run validate, npm test | Hermes: H21 | Claude: C21
- RP21.P03.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Admin Console: API And Interface. | Commands: npm run validate, npm test | Hermes: H21 | Claude: C21
- RP21.P03.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Admin Console: API And Interface. | Commands: npm run validate, npm test | Hermes: H21 | Claude: C21
- RP21.P03.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Admin Console: API And Interface. | Commands: npm run validate, npm test | Hermes: H21 | Claude: C21
- RP21.P03.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Admin Console: API And Interface. | Commands: npm run validate, npm test | Hermes: H21 | Claude: C21
- RP21.P03.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Admin Console: API And Interface. | Commands: npm run validate, npm test | Hermes: H21 | Claude: C21

#### RP21.P04: UI And Operator Surface

- RP21.P04.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Admin Console: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H21 | Claude: C21
- RP21.P04.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Admin Console: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H21 | Claude: C21
- RP21.P04.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Admin Console: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H21 | Claude: C21
- RP21.P04.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Admin Console: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H21 | Claude: C21
- RP21.P04.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Admin Console: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H21 | Claude: C21
- RP21.P04.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Admin Console: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H21 | Claude: C21
- RP21.P04.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Admin Console: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H21 | Claude: C21
- RP21.P04.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Admin Console: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H21 | Claude: C21
- RP21.P04.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Admin Console: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H21 | Claude: C21
- RP21.P04.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Admin Console: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H21 | Claude: C21
- RP21.P04.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Admin Console: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H21 | Claude: C21

#### RP21.P05: Fixtures And Golden Cases

- RP21.P05.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Admin Console: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H21 | Claude: C21
- RP21.P05.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Admin Console: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H21 | Claude: C21
- RP21.P05.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Admin Console: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H21 | Claude: C21
- RP21.P05.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Admin Console: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H21 | Claude: C21
- RP21.P05.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Admin Console: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H21 | Claude: C21
- RP21.P05.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Admin Console: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H21 | Claude: C21
- RP21.P05.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Admin Console: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H21 | Claude: C21
- RP21.P05.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Admin Console: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H21 | Claude: C21
- RP21.P05.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Admin Console: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H21 | Claude: C21
- RP21.P05.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Admin Console: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H21 | Claude: C21
- RP21.P05.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Admin Console: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H21 | Claude: C21

#### RP21.P06: Permission Audit Integration

- RP21.P06.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Admin Console: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H21 | Claude: C21
- RP21.P06.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Admin Console: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H21 | Claude: C21
- RP21.P06.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Admin Console: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H21 | Claude: C21
- RP21.P06.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Admin Console: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H21 | Claude: C21
- RP21.P06.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Admin Console: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H21 | Claude: C21
- RP21.P06.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Admin Console: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H21 | Claude: C21
- RP21.P06.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Admin Console: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H21 | Claude: C21
- RP21.P06.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Admin Console: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H21 | Claude: C21
- RP21.P06.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Admin Console: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H21 | Claude: C21
- RP21.P06.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Admin Console: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H21 | Claude: C21
- RP21.P06.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Admin Console: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H21 | Claude: C21

#### RP21.P07: Failure Edge And Recovery

- RP21.P07.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Admin Console: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H21 | Claude: C21
- RP21.P07.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Admin Console: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H21 | Claude: C21
- RP21.P07.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Admin Console: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H21 | Claude: C21
- RP21.P07.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Admin Console: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H21 | Claude: C21
- RP21.P07.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Admin Console: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H21 | Claude: C21
- RP21.P07.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Admin Console: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H21 | Claude: C21
- RP21.P07.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Admin Console: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H21 | Claude: C21
- RP21.P07.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Admin Console: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H21 | Claude: C21
- RP21.P07.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Admin Console: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H21 | Claude: C21
- RP21.P07.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Admin Console: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H21 | Claude: C21
- RP21.P07.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Admin Console: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H21 | Claude: C21

#### RP21.P08: Hermes Validation Binding

- RP21.P08.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Admin Console: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H21 | Claude: C21
- RP21.P08.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Admin Console: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H21 | Claude: C21
- RP21.P08.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Admin Console: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H21 | Claude: C21
- RP21.P08.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Admin Console: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H21 | Claude: C21
- RP21.P08.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Admin Console: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H21 | Claude: C21
- RP21.P08.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Admin Console: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H21 | Claude: C21
- RP21.P08.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Admin Console: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H21 | Claude: C21
- RP21.P08.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Admin Console: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H21 | Claude: C21
- RP21.P08.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Admin Console: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H21 | Claude: C21
- RP21.P08.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Admin Console: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H21 | Claude: C21
- RP21.P08.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Admin Console: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H21 | Claude: C21

#### RP21.P09: Claude Cross Validation Closeout

- RP21.P09.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Admin Console: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H21 | Claude: C21
- RP21.P09.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Admin Console: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H21 | Claude: C21
- RP21.P09.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Admin Console: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H21 | Claude: C21
- RP21.P09.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Admin Console: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H21 | Claude: C21
- RP21.P09.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Admin Console: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H21 | Claude: C21
- RP21.P09.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Admin Console: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H21 | Claude: C21
- RP21.P09.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Admin Console: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H21 | Claude: C21
- RP21.P09.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Admin Console: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H21 | Claude: C21
- RP21.P09.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Admin Console: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H21 | Claude: C21
- RP21.P09.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Admin Console: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H21 | Claude: C21
- RP21.P09.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Admin Console: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H21 | Claude: C21


### RP22: External Integrations I

Scope: Microsoft 365, Google Workspace, Slack/Teams, e-sign

#### RP22.P00: Contract And Acceptance Baseline

- RP22.P00.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for External Integrations I: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H22 | Claude: C22
- RP22.P00.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for External Integrations I: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H22 | Claude: C22
- RP22.P00.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for External Integrations I: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H22 | Claude: C22
- RP22.P00.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for External Integrations I: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H22 | Claude: C22
- RP22.P00.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for External Integrations I: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H22 | Claude: C22
- RP22.P00.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for External Integrations I: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H22 | Claude: C22
- RP22.P00.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for External Integrations I: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H22 | Claude: C22
- RP22.P00.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for External Integrations I: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H22 | Claude: C22
- RP22.P00.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for External Integrations I: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H22 | Claude: C22
- RP22.P00.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for External Integrations I: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H22 | Claude: C22
- RP22.P00.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for External Integrations I: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H22 | Claude: C22

#### RP22.P01: Domain Model

- RP22.P01.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for External Integrations I: Domain Model. | Commands: npm run validate | Hermes: H22 | Claude: C22
- RP22.P01.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for External Integrations I: Domain Model. | Commands: npm run validate | Hermes: H22 | Claude: C22
- RP22.P01.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for External Integrations I: Domain Model. | Commands: npm run validate | Hermes: H22 | Claude: C22
- RP22.P01.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for External Integrations I: Domain Model. | Commands: npm run validate | Hermes: H22 | Claude: C22
- RP22.P01.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for External Integrations I: Domain Model. | Commands: npm run validate | Hermes: H22 | Claude: C22
- RP22.P01.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for External Integrations I: Domain Model. | Commands: npm run validate | Hermes: H22 | Claude: C22
- RP22.P01.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for External Integrations I: Domain Model. | Commands: npm run validate | Hermes: H22 | Claude: C22
- RP22.P01.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for External Integrations I: Domain Model. | Commands: npm run validate | Hermes: H22 | Claude: C22
- RP22.P01.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for External Integrations I: Domain Model. | Commands: npm run validate | Hermes: H22 | Claude: C22
- RP22.P01.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for External Integrations I: Domain Model. | Commands: npm run validate | Hermes: H22 | Claude: C22
- RP22.P01.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for External Integrations I: Domain Model. | Commands: npm run validate | Hermes: H22 | Claude: C22

#### RP22.P02: Service Logic

- RP22.P02.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for External Integrations I: Service Logic. | Commands: npm run validate, npm test | Hermes: H22 | Claude: C22
- RP22.P02.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for External Integrations I: Service Logic. | Commands: npm run validate, npm test | Hermes: H22 | Claude: C22
- RP22.P02.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for External Integrations I: Service Logic. | Commands: npm run validate, npm test | Hermes: H22 | Claude: C22
- RP22.P02.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for External Integrations I: Service Logic. | Commands: npm run validate, npm test | Hermes: H22 | Claude: C22
- RP22.P02.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for External Integrations I: Service Logic. | Commands: npm run validate, npm test | Hermes: H22 | Claude: C22
- RP22.P02.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for External Integrations I: Service Logic. | Commands: npm run validate, npm test | Hermes: H22 | Claude: C22
- RP22.P02.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for External Integrations I: Service Logic. | Commands: npm run validate, npm test | Hermes: H22 | Claude: C22
- RP22.P02.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for External Integrations I: Service Logic. | Commands: npm run validate, npm test | Hermes: H22 | Claude: C22
- RP22.P02.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for External Integrations I: Service Logic. | Commands: npm run validate, npm test | Hermes: H22 | Claude: C22
- RP22.P02.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for External Integrations I: Service Logic. | Commands: npm run validate, npm test | Hermes: H22 | Claude: C22
- RP22.P02.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for External Integrations I: Service Logic. | Commands: npm run validate, npm test | Hermes: H22 | Claude: C22

#### RP22.P03: API And Interface

- RP22.P03.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for External Integrations I: API And Interface. | Commands: npm run validate, npm test | Hermes: H22 | Claude: C22
- RP22.P03.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for External Integrations I: API And Interface. | Commands: npm run validate, npm test | Hermes: H22 | Claude: C22
- RP22.P03.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for External Integrations I: API And Interface. | Commands: npm run validate, npm test | Hermes: H22 | Claude: C22
- RP22.P03.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for External Integrations I: API And Interface. | Commands: npm run validate, npm test | Hermes: H22 | Claude: C22
- RP22.P03.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for External Integrations I: API And Interface. | Commands: npm run validate, npm test | Hermes: H22 | Claude: C22
- RP22.P03.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for External Integrations I: API And Interface. | Commands: npm run validate, npm test | Hermes: H22 | Claude: C22
- RP22.P03.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for External Integrations I: API And Interface. | Commands: npm run validate, npm test | Hermes: H22 | Claude: C22
- RP22.P03.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for External Integrations I: API And Interface. | Commands: npm run validate, npm test | Hermes: H22 | Claude: C22
- RP22.P03.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for External Integrations I: API And Interface. | Commands: npm run validate, npm test | Hermes: H22 | Claude: C22
- RP22.P03.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for External Integrations I: API And Interface. | Commands: npm run validate, npm test | Hermes: H22 | Claude: C22
- RP22.P03.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for External Integrations I: API And Interface. | Commands: npm run validate, npm test | Hermes: H22 | Claude: C22

#### RP22.P04: UI And Operator Surface

- RP22.P04.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for External Integrations I: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H22 | Claude: C22
- RP22.P04.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for External Integrations I: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H22 | Claude: C22
- RP22.P04.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for External Integrations I: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H22 | Claude: C22
- RP22.P04.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for External Integrations I: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H22 | Claude: C22
- RP22.P04.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for External Integrations I: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H22 | Claude: C22
- RP22.P04.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for External Integrations I: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H22 | Claude: C22
- RP22.P04.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for External Integrations I: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H22 | Claude: C22
- RP22.P04.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for External Integrations I: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H22 | Claude: C22
- RP22.P04.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for External Integrations I: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H22 | Claude: C22
- RP22.P04.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for External Integrations I: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H22 | Claude: C22
- RP22.P04.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for External Integrations I: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H22 | Claude: C22

#### RP22.P05: Fixtures And Golden Cases

- RP22.P05.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for External Integrations I: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H22 | Claude: C22
- RP22.P05.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for External Integrations I: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H22 | Claude: C22
- RP22.P05.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for External Integrations I: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H22 | Claude: C22
- RP22.P05.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for External Integrations I: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H22 | Claude: C22
- RP22.P05.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for External Integrations I: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H22 | Claude: C22
- RP22.P05.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for External Integrations I: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H22 | Claude: C22
- RP22.P05.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for External Integrations I: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H22 | Claude: C22
- RP22.P05.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for External Integrations I: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H22 | Claude: C22
- RP22.P05.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for External Integrations I: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H22 | Claude: C22
- RP22.P05.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for External Integrations I: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H22 | Claude: C22
- RP22.P05.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for External Integrations I: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H22 | Claude: C22

#### RP22.P06: Permission Audit Integration

- RP22.P06.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for External Integrations I: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H22 | Claude: C22
- RP22.P06.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for External Integrations I: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H22 | Claude: C22
- RP22.P06.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for External Integrations I: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H22 | Claude: C22
- RP22.P06.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for External Integrations I: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H22 | Claude: C22
- RP22.P06.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for External Integrations I: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H22 | Claude: C22
- RP22.P06.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for External Integrations I: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H22 | Claude: C22
- RP22.P06.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for External Integrations I: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H22 | Claude: C22
- RP22.P06.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for External Integrations I: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H22 | Claude: C22
- RP22.P06.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for External Integrations I: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H22 | Claude: C22
- RP22.P06.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for External Integrations I: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H22 | Claude: C22
- RP22.P06.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for External Integrations I: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H22 | Claude: C22

#### RP22.P07: Failure Edge And Recovery

- RP22.P07.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for External Integrations I: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H22 | Claude: C22
- RP22.P07.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for External Integrations I: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H22 | Claude: C22
- RP22.P07.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for External Integrations I: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H22 | Claude: C22
- RP22.P07.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for External Integrations I: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H22 | Claude: C22
- RP22.P07.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for External Integrations I: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H22 | Claude: C22
- RP22.P07.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for External Integrations I: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H22 | Claude: C22
- RP22.P07.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for External Integrations I: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H22 | Claude: C22
- RP22.P07.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for External Integrations I: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H22 | Claude: C22
- RP22.P07.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for External Integrations I: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H22 | Claude: C22
- RP22.P07.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for External Integrations I: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H22 | Claude: C22
- RP22.P07.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for External Integrations I: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H22 | Claude: C22

#### RP22.P08: Hermes Validation Binding

- RP22.P08.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for External Integrations I: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H22 | Claude: C22
- RP22.P08.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for External Integrations I: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H22 | Claude: C22
- RP22.P08.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for External Integrations I: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H22 | Claude: C22
- RP22.P08.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for External Integrations I: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H22 | Claude: C22
- RP22.P08.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for External Integrations I: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H22 | Claude: C22
- RP22.P08.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for External Integrations I: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H22 | Claude: C22
- RP22.P08.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for External Integrations I: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H22 | Claude: C22
- RP22.P08.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for External Integrations I: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H22 | Claude: C22
- RP22.P08.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for External Integrations I: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H22 | Claude: C22
- RP22.P08.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for External Integrations I: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H22 | Claude: C22
- RP22.P08.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for External Integrations I: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H22 | Claude: C22

#### RP22.P09: Claude Cross Validation Closeout

- RP22.P09.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for External Integrations I: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H22 | Claude: C22
- RP22.P09.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for External Integrations I: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H22 | Claude: C22
- RP22.P09.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for External Integrations I: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H22 | Claude: C22
- RP22.P09.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for External Integrations I: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H22 | Claude: C22
- RP22.P09.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for External Integrations I: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H22 | Claude: C22
- RP22.P09.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for External Integrations I: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H22 | Claude: C22
- RP22.P09.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for External Integrations I: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H22 | Claude: C22
- RP22.P09.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for External Integrations I: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H22 | Claude: C22
- RP22.P09.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for External Integrations I: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H22 | Claude: C22
- RP22.P09.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for External Integrations I: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H22 | Claude: C22
- RP22.P09.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for External Integrations I: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H22 | Claude: C22


### RP23: External Integrations II

Scope: Bank, card, WEHAGO, 더존, tax export, DART

#### RP23.P00: Contract And Acceptance Baseline

- RP23.P00.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for External Integrations II: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H23 | Claude: C23
- RP23.P00.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for External Integrations II: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H23 | Claude: C23
- RP23.P00.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for External Integrations II: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H23 | Claude: C23
- RP23.P00.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for External Integrations II: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H23 | Claude: C23
- RP23.P00.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for External Integrations II: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H23 | Claude: C23
- RP23.P00.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for External Integrations II: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H23 | Claude: C23
- RP23.P00.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for External Integrations II: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H23 | Claude: C23
- RP23.P00.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for External Integrations II: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H23 | Claude: C23
- RP23.P00.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for External Integrations II: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H23 | Claude: C23
- RP23.P00.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for External Integrations II: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H23 | Claude: C23
- RP23.P00.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for External Integrations II: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H23 | Claude: C23

#### RP23.P01: Domain Model

- RP23.P01.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for External Integrations II: Domain Model. | Commands: npm run validate | Hermes: H23 | Claude: C23
- RP23.P01.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for External Integrations II: Domain Model. | Commands: npm run validate | Hermes: H23 | Claude: C23
- RP23.P01.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for External Integrations II: Domain Model. | Commands: npm run validate | Hermes: H23 | Claude: C23
- RP23.P01.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for External Integrations II: Domain Model. | Commands: npm run validate | Hermes: H23 | Claude: C23
- RP23.P01.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for External Integrations II: Domain Model. | Commands: npm run validate | Hermes: H23 | Claude: C23
- RP23.P01.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for External Integrations II: Domain Model. | Commands: npm run validate | Hermes: H23 | Claude: C23
- RP23.P01.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for External Integrations II: Domain Model. | Commands: npm run validate | Hermes: H23 | Claude: C23
- RP23.P01.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for External Integrations II: Domain Model. | Commands: npm run validate | Hermes: H23 | Claude: C23
- RP23.P01.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for External Integrations II: Domain Model. | Commands: npm run validate | Hermes: H23 | Claude: C23
- RP23.P01.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for External Integrations II: Domain Model. | Commands: npm run validate | Hermes: H23 | Claude: C23
- RP23.P01.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for External Integrations II: Domain Model. | Commands: npm run validate | Hermes: H23 | Claude: C23

#### RP23.P02: Service Logic

- RP23.P02.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for External Integrations II: Service Logic. | Commands: npm run validate, npm test | Hermes: H23 | Claude: C23
- RP23.P02.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for External Integrations II: Service Logic. | Commands: npm run validate, npm test | Hermes: H23 | Claude: C23
- RP23.P02.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for External Integrations II: Service Logic. | Commands: npm run validate, npm test | Hermes: H23 | Claude: C23
- RP23.P02.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for External Integrations II: Service Logic. | Commands: npm run validate, npm test | Hermes: H23 | Claude: C23
- RP23.P02.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for External Integrations II: Service Logic. | Commands: npm run validate, npm test | Hermes: H23 | Claude: C23
- RP23.P02.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for External Integrations II: Service Logic. | Commands: npm run validate, npm test | Hermes: H23 | Claude: C23
- RP23.P02.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for External Integrations II: Service Logic. | Commands: npm run validate, npm test | Hermes: H23 | Claude: C23
- RP23.P02.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for External Integrations II: Service Logic. | Commands: npm run validate, npm test | Hermes: H23 | Claude: C23
- RP23.P02.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for External Integrations II: Service Logic. | Commands: npm run validate, npm test | Hermes: H23 | Claude: C23
- RP23.P02.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for External Integrations II: Service Logic. | Commands: npm run validate, npm test | Hermes: H23 | Claude: C23
- RP23.P02.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for External Integrations II: Service Logic. | Commands: npm run validate, npm test | Hermes: H23 | Claude: C23

#### RP23.P03: API And Interface

- RP23.P03.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for External Integrations II: API And Interface. | Commands: npm run validate, npm test | Hermes: H23 | Claude: C23
- RP23.P03.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for External Integrations II: API And Interface. | Commands: npm run validate, npm test | Hermes: H23 | Claude: C23
- RP23.P03.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for External Integrations II: API And Interface. | Commands: npm run validate, npm test | Hermes: H23 | Claude: C23
- RP23.P03.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for External Integrations II: API And Interface. | Commands: npm run validate, npm test | Hermes: H23 | Claude: C23
- RP23.P03.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for External Integrations II: API And Interface. | Commands: npm run validate, npm test | Hermes: H23 | Claude: C23
- RP23.P03.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for External Integrations II: API And Interface. | Commands: npm run validate, npm test | Hermes: H23 | Claude: C23
- RP23.P03.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for External Integrations II: API And Interface. | Commands: npm run validate, npm test | Hermes: H23 | Claude: C23
- RP23.P03.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for External Integrations II: API And Interface. | Commands: npm run validate, npm test | Hermes: H23 | Claude: C23
- RP23.P03.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for External Integrations II: API And Interface. | Commands: npm run validate, npm test | Hermes: H23 | Claude: C23
- RP23.P03.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for External Integrations II: API And Interface. | Commands: npm run validate, npm test | Hermes: H23 | Claude: C23
- RP23.P03.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for External Integrations II: API And Interface. | Commands: npm run validate, npm test | Hermes: H23 | Claude: C23

#### RP23.P04: UI And Operator Surface

- RP23.P04.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for External Integrations II: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H23 | Claude: C23
- RP23.P04.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for External Integrations II: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H23 | Claude: C23
- RP23.P04.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for External Integrations II: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H23 | Claude: C23
- RP23.P04.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for External Integrations II: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H23 | Claude: C23
- RP23.P04.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for External Integrations II: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H23 | Claude: C23
- RP23.P04.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for External Integrations II: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H23 | Claude: C23
- RP23.P04.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for External Integrations II: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H23 | Claude: C23
- RP23.P04.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for External Integrations II: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H23 | Claude: C23
- RP23.P04.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for External Integrations II: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H23 | Claude: C23
- RP23.P04.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for External Integrations II: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H23 | Claude: C23
- RP23.P04.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for External Integrations II: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H23 | Claude: C23

#### RP23.P05: Fixtures And Golden Cases

- RP23.P05.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for External Integrations II: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H23 | Claude: C23
- RP23.P05.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for External Integrations II: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H23 | Claude: C23
- RP23.P05.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for External Integrations II: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H23 | Claude: C23
- RP23.P05.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for External Integrations II: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H23 | Claude: C23
- RP23.P05.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for External Integrations II: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H23 | Claude: C23
- RP23.P05.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for External Integrations II: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H23 | Claude: C23
- RP23.P05.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for External Integrations II: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H23 | Claude: C23
- RP23.P05.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for External Integrations II: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H23 | Claude: C23
- RP23.P05.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for External Integrations II: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H23 | Claude: C23
- RP23.P05.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for External Integrations II: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H23 | Claude: C23
- RP23.P05.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for External Integrations II: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H23 | Claude: C23

#### RP23.P06: Permission Audit Integration

- RP23.P06.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for External Integrations II: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H23 | Claude: C23
- RP23.P06.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for External Integrations II: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H23 | Claude: C23
- RP23.P06.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for External Integrations II: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H23 | Claude: C23
- RP23.P06.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for External Integrations II: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H23 | Claude: C23
- RP23.P06.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for External Integrations II: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H23 | Claude: C23
- RP23.P06.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for External Integrations II: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H23 | Claude: C23
- RP23.P06.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for External Integrations II: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H23 | Claude: C23
- RP23.P06.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for External Integrations II: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H23 | Claude: C23
- RP23.P06.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for External Integrations II: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H23 | Claude: C23
- RP23.P06.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for External Integrations II: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H23 | Claude: C23
- RP23.P06.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for External Integrations II: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H23 | Claude: C23

#### RP23.P07: Failure Edge And Recovery

- RP23.P07.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for External Integrations II: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H23 | Claude: C23
- RP23.P07.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for External Integrations II: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H23 | Claude: C23
- RP23.P07.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for External Integrations II: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H23 | Claude: C23
- RP23.P07.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for External Integrations II: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H23 | Claude: C23
- RP23.P07.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for External Integrations II: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H23 | Claude: C23
- RP23.P07.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for External Integrations II: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H23 | Claude: C23
- RP23.P07.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for External Integrations II: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H23 | Claude: C23
- RP23.P07.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for External Integrations II: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H23 | Claude: C23
- RP23.P07.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for External Integrations II: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H23 | Claude: C23
- RP23.P07.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for External Integrations II: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H23 | Claude: C23
- RP23.P07.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for External Integrations II: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H23 | Claude: C23

#### RP23.P08: Hermes Validation Binding

- RP23.P08.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for External Integrations II: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H23 | Claude: C23
- RP23.P08.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for External Integrations II: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H23 | Claude: C23
- RP23.P08.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for External Integrations II: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H23 | Claude: C23
- RP23.P08.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for External Integrations II: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H23 | Claude: C23
- RP23.P08.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for External Integrations II: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H23 | Claude: C23
- RP23.P08.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for External Integrations II: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H23 | Claude: C23
- RP23.P08.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for External Integrations II: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H23 | Claude: C23
- RP23.P08.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for External Integrations II: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H23 | Claude: C23
- RP23.P08.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for External Integrations II: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H23 | Claude: C23
- RP23.P08.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for External Integrations II: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H23 | Claude: C23
- RP23.P08.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for External Integrations II: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H23 | Claude: C23

#### RP23.P09: Claude Cross Validation Closeout

- RP23.P09.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for External Integrations II: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H23 | Claude: C23
- RP23.P09.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for External Integrations II: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H23 | Claude: C23
- RP23.P09.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for External Integrations II: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H23 | Claude: C23
- RP23.P09.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for External Integrations II: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H23 | Claude: C23
- RP23.P09.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for External Integrations II: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H23 | Claude: C23
- RP23.P09.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for External Integrations II: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H23 | Claude: C23
- RP23.P09.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for External Integrations II: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H23 | Claude: C23
- RP23.P09.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for External Integrations II: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H23 | Claude: C23
- RP23.P09.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for External Integrations II: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H23 | Claude: C23
- RP23.P09.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for External Integrations II: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H23 | Claude: C23
- RP23.P09.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for External Integrations II: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H23 | Claude: C23


### RP24: Korean Legal Depth

Scope: HWPX, Korean clauses, litigation, corporate documents

#### RP24.P00: Contract And Acceptance Baseline

- RP24.P00.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Korean Legal Depth: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H24 | Claude: C24
- RP24.P00.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Korean Legal Depth: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H24 | Claude: C24
- RP24.P00.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Korean Legal Depth: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H24 | Claude: C24
- RP24.P00.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Korean Legal Depth: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H24 | Claude: C24
- RP24.P00.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Korean Legal Depth: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H24 | Claude: C24
- RP24.P00.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Korean Legal Depth: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H24 | Claude: C24
- RP24.P00.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Korean Legal Depth: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H24 | Claude: C24
- RP24.P00.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Korean Legal Depth: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H24 | Claude: C24
- RP24.P00.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Korean Legal Depth: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H24 | Claude: C24
- RP24.P00.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Korean Legal Depth: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H24 | Claude: C24
- RP24.P00.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Korean Legal Depth: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H24 | Claude: C24

#### RP24.P01: Domain Model

- RP24.P01.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Korean Legal Depth: Domain Model. | Commands: npm run validate | Hermes: H24 | Claude: C24
- RP24.P01.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Korean Legal Depth: Domain Model. | Commands: npm run validate | Hermes: H24 | Claude: C24
- RP24.P01.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Korean Legal Depth: Domain Model. | Commands: npm run validate | Hermes: H24 | Claude: C24
- RP24.P01.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Korean Legal Depth: Domain Model. | Commands: npm run validate | Hermes: H24 | Claude: C24
- RP24.P01.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Korean Legal Depth: Domain Model. | Commands: npm run validate | Hermes: H24 | Claude: C24
- RP24.P01.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Korean Legal Depth: Domain Model. | Commands: npm run validate | Hermes: H24 | Claude: C24
- RP24.P01.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Korean Legal Depth: Domain Model. | Commands: npm run validate | Hermes: H24 | Claude: C24
- RP24.P01.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Korean Legal Depth: Domain Model. | Commands: npm run validate | Hermes: H24 | Claude: C24
- RP24.P01.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Korean Legal Depth: Domain Model. | Commands: npm run validate | Hermes: H24 | Claude: C24
- RP24.P01.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Korean Legal Depth: Domain Model. | Commands: npm run validate | Hermes: H24 | Claude: C24
- RP24.P01.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Korean Legal Depth: Domain Model. | Commands: npm run validate | Hermes: H24 | Claude: C24

#### RP24.P02: Service Logic

- RP24.P02.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Korean Legal Depth: Service Logic. | Commands: npm run validate, npm test | Hermes: H24 | Claude: C24
- RP24.P02.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Korean Legal Depth: Service Logic. | Commands: npm run validate, npm test | Hermes: H24 | Claude: C24
- RP24.P02.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Korean Legal Depth: Service Logic. | Commands: npm run validate, npm test | Hermes: H24 | Claude: C24
- RP24.P02.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Korean Legal Depth: Service Logic. | Commands: npm run validate, npm test | Hermes: H24 | Claude: C24
- RP24.P02.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Korean Legal Depth: Service Logic. | Commands: npm run validate, npm test | Hermes: H24 | Claude: C24
- RP24.P02.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Korean Legal Depth: Service Logic. | Commands: npm run validate, npm test | Hermes: H24 | Claude: C24
- RP24.P02.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Korean Legal Depth: Service Logic. | Commands: npm run validate, npm test | Hermes: H24 | Claude: C24
- RP24.P02.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Korean Legal Depth: Service Logic. | Commands: npm run validate, npm test | Hermes: H24 | Claude: C24
- RP24.P02.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Korean Legal Depth: Service Logic. | Commands: npm run validate, npm test | Hermes: H24 | Claude: C24
- RP24.P02.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Korean Legal Depth: Service Logic. | Commands: npm run validate, npm test | Hermes: H24 | Claude: C24
- RP24.P02.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Korean Legal Depth: Service Logic. | Commands: npm run validate, npm test | Hermes: H24 | Claude: C24

#### RP24.P03: API And Interface

- RP24.P03.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Korean Legal Depth: API And Interface. | Commands: npm run validate, npm test | Hermes: H24 | Claude: C24
- RP24.P03.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Korean Legal Depth: API And Interface. | Commands: npm run validate, npm test | Hermes: H24 | Claude: C24
- RP24.P03.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Korean Legal Depth: API And Interface. | Commands: npm run validate, npm test | Hermes: H24 | Claude: C24
- RP24.P03.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Korean Legal Depth: API And Interface. | Commands: npm run validate, npm test | Hermes: H24 | Claude: C24
- RP24.P03.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Korean Legal Depth: API And Interface. | Commands: npm run validate, npm test | Hermes: H24 | Claude: C24
- RP24.P03.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Korean Legal Depth: API And Interface. | Commands: npm run validate, npm test | Hermes: H24 | Claude: C24
- RP24.P03.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Korean Legal Depth: API And Interface. | Commands: npm run validate, npm test | Hermes: H24 | Claude: C24
- RP24.P03.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Korean Legal Depth: API And Interface. | Commands: npm run validate, npm test | Hermes: H24 | Claude: C24
- RP24.P03.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Korean Legal Depth: API And Interface. | Commands: npm run validate, npm test | Hermes: H24 | Claude: C24
- RP24.P03.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Korean Legal Depth: API And Interface. | Commands: npm run validate, npm test | Hermes: H24 | Claude: C24
- RP24.P03.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Korean Legal Depth: API And Interface. | Commands: npm run validate, npm test | Hermes: H24 | Claude: C24

#### RP24.P04: UI And Operator Surface

- RP24.P04.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Korean Legal Depth: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H24 | Claude: C24
- RP24.P04.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Korean Legal Depth: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H24 | Claude: C24
- RP24.P04.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Korean Legal Depth: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H24 | Claude: C24
- RP24.P04.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Korean Legal Depth: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H24 | Claude: C24
- RP24.P04.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Korean Legal Depth: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H24 | Claude: C24
- RP24.P04.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Korean Legal Depth: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H24 | Claude: C24
- RP24.P04.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Korean Legal Depth: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H24 | Claude: C24
- RP24.P04.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Korean Legal Depth: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H24 | Claude: C24
- RP24.P04.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Korean Legal Depth: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H24 | Claude: C24
- RP24.P04.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Korean Legal Depth: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H24 | Claude: C24
- RP24.P04.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Korean Legal Depth: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H24 | Claude: C24

#### RP24.P05: Fixtures And Golden Cases

- RP24.P05.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Korean Legal Depth: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H24 | Claude: C24
- RP24.P05.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Korean Legal Depth: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H24 | Claude: C24
- RP24.P05.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Korean Legal Depth: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H24 | Claude: C24
- RP24.P05.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Korean Legal Depth: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H24 | Claude: C24
- RP24.P05.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Korean Legal Depth: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H24 | Claude: C24
- RP24.P05.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Korean Legal Depth: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H24 | Claude: C24
- RP24.P05.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Korean Legal Depth: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H24 | Claude: C24
- RP24.P05.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Korean Legal Depth: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H24 | Claude: C24
- RP24.P05.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Korean Legal Depth: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H24 | Claude: C24
- RP24.P05.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Korean Legal Depth: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H24 | Claude: C24
- RP24.P05.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Korean Legal Depth: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H24 | Claude: C24

#### RP24.P06: Permission Audit Integration

- RP24.P06.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Korean Legal Depth: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H24 | Claude: C24
- RP24.P06.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Korean Legal Depth: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H24 | Claude: C24
- RP24.P06.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Korean Legal Depth: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H24 | Claude: C24
- RP24.P06.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Korean Legal Depth: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H24 | Claude: C24
- RP24.P06.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Korean Legal Depth: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H24 | Claude: C24
- RP24.P06.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Korean Legal Depth: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H24 | Claude: C24
- RP24.P06.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Korean Legal Depth: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H24 | Claude: C24
- RP24.P06.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Korean Legal Depth: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H24 | Claude: C24
- RP24.P06.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Korean Legal Depth: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H24 | Claude: C24
- RP24.P06.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Korean Legal Depth: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H24 | Claude: C24
- RP24.P06.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Korean Legal Depth: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H24 | Claude: C24

#### RP24.P07: Failure Edge And Recovery

- RP24.P07.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Korean Legal Depth: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H24 | Claude: C24
- RP24.P07.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Korean Legal Depth: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H24 | Claude: C24
- RP24.P07.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Korean Legal Depth: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H24 | Claude: C24
- RP24.P07.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Korean Legal Depth: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H24 | Claude: C24
- RP24.P07.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Korean Legal Depth: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H24 | Claude: C24
- RP24.P07.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Korean Legal Depth: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H24 | Claude: C24
- RP24.P07.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Korean Legal Depth: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H24 | Claude: C24
- RP24.P07.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Korean Legal Depth: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H24 | Claude: C24
- RP24.P07.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Korean Legal Depth: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H24 | Claude: C24
- RP24.P07.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Korean Legal Depth: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H24 | Claude: C24
- RP24.P07.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Korean Legal Depth: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H24 | Claude: C24

#### RP24.P08: Hermes Validation Binding

- RP24.P08.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Korean Legal Depth: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H24 | Claude: C24
- RP24.P08.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Korean Legal Depth: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H24 | Claude: C24
- RP24.P08.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Korean Legal Depth: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H24 | Claude: C24
- RP24.P08.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Korean Legal Depth: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H24 | Claude: C24
- RP24.P08.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Korean Legal Depth: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H24 | Claude: C24
- RP24.P08.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Korean Legal Depth: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H24 | Claude: C24
- RP24.P08.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Korean Legal Depth: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H24 | Claude: C24
- RP24.P08.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Korean Legal Depth: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H24 | Claude: C24
- RP24.P08.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Korean Legal Depth: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H24 | Claude: C24
- RP24.P08.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Korean Legal Depth: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H24 | Claude: C24
- RP24.P08.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Korean Legal Depth: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H24 | Claude: C24

#### RP24.P09: Claude Cross Validation Closeout

- RP24.P09.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Korean Legal Depth: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H24 | Claude: C24
- RP24.P09.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Korean Legal Depth: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H24 | Claude: C24
- RP24.P09.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Korean Legal Depth: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H24 | Claude: C24
- RP24.P09.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Korean Legal Depth: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H24 | Claude: C24
- RP24.P09.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Korean Legal Depth: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H24 | Claude: C24
- RP24.P09.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Korean Legal Depth: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H24 | Claude: C24
- RP24.P09.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Korean Legal Depth: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H24 | Claude: C24
- RP24.P09.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Korean Legal Depth: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H24 | Claude: C24
- RP24.P09.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Korean Legal Depth: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H24 | Claude: C24
- RP24.P09.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Korean Legal Depth: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H24 | Claude: C24
- RP24.P09.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Korean Legal Depth: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H24 | Claude: C24


### RP25: Migration Platform

Scope: file server, SharePoint, Drive, iManage import

#### RP25.P00: Contract And Acceptance Baseline

- RP25.P00.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Migration Platform: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H25 | Claude: C25
- RP25.P00.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Migration Platform: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H25 | Claude: C25
- RP25.P00.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Migration Platform: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H25 | Claude: C25
- RP25.P00.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Migration Platform: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H25 | Claude: C25
- RP25.P00.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Migration Platform: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H25 | Claude: C25
- RP25.P00.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Migration Platform: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H25 | Claude: C25
- RP25.P00.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Migration Platform: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H25 | Claude: C25
- RP25.P00.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Migration Platform: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H25 | Claude: C25
- RP25.P00.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Migration Platform: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H25 | Claude: C25
- RP25.P00.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Migration Platform: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H25 | Claude: C25
- RP25.P00.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Migration Platform: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H25 | Claude: C25

#### RP25.P01: Domain Model

- RP25.P01.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Migration Platform: Domain Model. | Commands: npm run validate | Hermes: H25 | Claude: C25
- RP25.P01.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Migration Platform: Domain Model. | Commands: npm run validate | Hermes: H25 | Claude: C25
- RP25.P01.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Migration Platform: Domain Model. | Commands: npm run validate | Hermes: H25 | Claude: C25
- RP25.P01.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Migration Platform: Domain Model. | Commands: npm run validate | Hermes: H25 | Claude: C25
- RP25.P01.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Migration Platform: Domain Model. | Commands: npm run validate | Hermes: H25 | Claude: C25
- RP25.P01.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Migration Platform: Domain Model. | Commands: npm run validate | Hermes: H25 | Claude: C25
- RP25.P01.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Migration Platform: Domain Model. | Commands: npm run validate | Hermes: H25 | Claude: C25
- RP25.P01.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Migration Platform: Domain Model. | Commands: npm run validate | Hermes: H25 | Claude: C25
- RP25.P01.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Migration Platform: Domain Model. | Commands: npm run validate | Hermes: H25 | Claude: C25
- RP25.P01.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Migration Platform: Domain Model. | Commands: npm run validate | Hermes: H25 | Claude: C25
- RP25.P01.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Migration Platform: Domain Model. | Commands: npm run validate | Hermes: H25 | Claude: C25

#### RP25.P02: Service Logic

- RP25.P02.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Migration Platform: Service Logic. | Commands: npm run validate, npm test | Hermes: H25 | Claude: C25
- RP25.P02.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Migration Platform: Service Logic. | Commands: npm run validate, npm test | Hermes: H25 | Claude: C25
- RP25.P02.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Migration Platform: Service Logic. | Commands: npm run validate, npm test | Hermes: H25 | Claude: C25
- RP25.P02.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Migration Platform: Service Logic. | Commands: npm run validate, npm test | Hermes: H25 | Claude: C25
- RP25.P02.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Migration Platform: Service Logic. | Commands: npm run validate, npm test | Hermes: H25 | Claude: C25
- RP25.P02.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Migration Platform: Service Logic. | Commands: npm run validate, npm test | Hermes: H25 | Claude: C25
- RP25.P02.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Migration Platform: Service Logic. | Commands: npm run validate, npm test | Hermes: H25 | Claude: C25
- RP25.P02.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Migration Platform: Service Logic. | Commands: npm run validate, npm test | Hermes: H25 | Claude: C25
- RP25.P02.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Migration Platform: Service Logic. | Commands: npm run validate, npm test | Hermes: H25 | Claude: C25
- RP25.P02.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Migration Platform: Service Logic. | Commands: npm run validate, npm test | Hermes: H25 | Claude: C25
- RP25.P02.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Migration Platform: Service Logic. | Commands: npm run validate, npm test | Hermes: H25 | Claude: C25

#### RP25.P03: API And Interface

- RP25.P03.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Migration Platform: API And Interface. | Commands: npm run validate, npm test | Hermes: H25 | Claude: C25
- RP25.P03.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Migration Platform: API And Interface. | Commands: npm run validate, npm test | Hermes: H25 | Claude: C25
- RP25.P03.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Migration Platform: API And Interface. | Commands: npm run validate, npm test | Hermes: H25 | Claude: C25
- RP25.P03.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Migration Platform: API And Interface. | Commands: npm run validate, npm test | Hermes: H25 | Claude: C25
- RP25.P03.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Migration Platform: API And Interface. | Commands: npm run validate, npm test | Hermes: H25 | Claude: C25
- RP25.P03.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Migration Platform: API And Interface. | Commands: npm run validate, npm test | Hermes: H25 | Claude: C25
- RP25.P03.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Migration Platform: API And Interface. | Commands: npm run validate, npm test | Hermes: H25 | Claude: C25
- RP25.P03.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Migration Platform: API And Interface. | Commands: npm run validate, npm test | Hermes: H25 | Claude: C25
- RP25.P03.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Migration Platform: API And Interface. | Commands: npm run validate, npm test | Hermes: H25 | Claude: C25
- RP25.P03.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Migration Platform: API And Interface. | Commands: npm run validate, npm test | Hermes: H25 | Claude: C25
- RP25.P03.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Migration Platform: API And Interface. | Commands: npm run validate, npm test | Hermes: H25 | Claude: C25

#### RP25.P04: UI And Operator Surface

- RP25.P04.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Migration Platform: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H25 | Claude: C25
- RP25.P04.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Migration Platform: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H25 | Claude: C25
- RP25.P04.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Migration Platform: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H25 | Claude: C25
- RP25.P04.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Migration Platform: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H25 | Claude: C25
- RP25.P04.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Migration Platform: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H25 | Claude: C25
- RP25.P04.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Migration Platform: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H25 | Claude: C25
- RP25.P04.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Migration Platform: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H25 | Claude: C25
- RP25.P04.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Migration Platform: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H25 | Claude: C25
- RP25.P04.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Migration Platform: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H25 | Claude: C25
- RP25.P04.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Migration Platform: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H25 | Claude: C25
- RP25.P04.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Migration Platform: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H25 | Claude: C25

#### RP25.P05: Fixtures And Golden Cases

- RP25.P05.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Migration Platform: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H25 | Claude: C25
- RP25.P05.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Migration Platform: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H25 | Claude: C25
- RP25.P05.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Migration Platform: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H25 | Claude: C25
- RP25.P05.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Migration Platform: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H25 | Claude: C25
- RP25.P05.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Migration Platform: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H25 | Claude: C25
- RP25.P05.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Migration Platform: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H25 | Claude: C25
- RP25.P05.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Migration Platform: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H25 | Claude: C25
- RP25.P05.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Migration Platform: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H25 | Claude: C25
- RP25.P05.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Migration Platform: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H25 | Claude: C25
- RP25.P05.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Migration Platform: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H25 | Claude: C25
- RP25.P05.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Migration Platform: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H25 | Claude: C25

#### RP25.P06: Permission Audit Integration

- RP25.P06.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Migration Platform: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H25 | Claude: C25
- RP25.P06.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Migration Platform: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H25 | Claude: C25
- RP25.P06.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Migration Platform: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H25 | Claude: C25
- RP25.P06.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Migration Platform: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H25 | Claude: C25
- RP25.P06.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Migration Platform: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H25 | Claude: C25
- RP25.P06.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Migration Platform: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H25 | Claude: C25
- RP25.P06.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Migration Platform: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H25 | Claude: C25
- RP25.P06.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Migration Platform: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H25 | Claude: C25
- RP25.P06.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Migration Platform: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H25 | Claude: C25
- RP25.P06.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Migration Platform: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H25 | Claude: C25
- RP25.P06.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Migration Platform: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H25 | Claude: C25

#### RP25.P07: Failure Edge And Recovery

- RP25.P07.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Migration Platform: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H25 | Claude: C25
- RP25.P07.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Migration Platform: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H25 | Claude: C25
- RP25.P07.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Migration Platform: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H25 | Claude: C25
- RP25.P07.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Migration Platform: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H25 | Claude: C25
- RP25.P07.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Migration Platform: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H25 | Claude: C25
- RP25.P07.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Migration Platform: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H25 | Claude: C25
- RP25.P07.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Migration Platform: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H25 | Claude: C25
- RP25.P07.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Migration Platform: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H25 | Claude: C25
- RP25.P07.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Migration Platform: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H25 | Claude: C25
- RP25.P07.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Migration Platform: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H25 | Claude: C25
- RP25.P07.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Migration Platform: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H25 | Claude: C25

#### RP25.P08: Hermes Validation Binding

- RP25.P08.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Migration Platform: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H25 | Claude: C25
- RP25.P08.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Migration Platform: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H25 | Claude: C25
- RP25.P08.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Migration Platform: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H25 | Claude: C25
- RP25.P08.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Migration Platform: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H25 | Claude: C25
- RP25.P08.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Migration Platform: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H25 | Claude: C25
- RP25.P08.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Migration Platform: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H25 | Claude: C25
- RP25.P08.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Migration Platform: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H25 | Claude: C25
- RP25.P08.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Migration Platform: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H25 | Claude: C25
- RP25.P08.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Migration Platform: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H25 | Claude: C25
- RP25.P08.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Migration Platform: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H25 | Claude: C25
- RP25.P08.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Migration Platform: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H25 | Claude: C25

#### RP25.P09: Claude Cross Validation Closeout

- RP25.P09.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Migration Platform: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H25 | Claude: C25
- RP25.P09.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Migration Platform: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H25 | Claude: C25
- RP25.P09.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Migration Platform: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H25 | Claude: C25
- RP25.P09.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Migration Platform: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H25 | Claude: C25
- RP25.P09.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Migration Platform: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H25 | Claude: C25
- RP25.P09.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Migration Platform: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H25 | Claude: C25
- RP25.P09.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Migration Platform: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H25 | Claude: C25
- RP25.P09.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Migration Platform: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H25 | Claude: C25
- RP25.P09.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Migration Platform: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H25 | Claude: C25
- RP25.P09.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Migration Platform: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H25 | Claude: C25
- RP25.P09.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Migration Platform: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H25 | Claude: C25


### RP26: Enterprise SaaS Hardening

Scope: dedicated DB/storage/index/key, SSO, MFA, SCIM

#### RP26.P00: Contract And Acceptance Baseline

- RP26.P00.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Enterprise SaaS Hardening: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H26 | Claude: C26
- RP26.P00.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Enterprise SaaS Hardening: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H26 | Claude: C26 | Reqs: NARR-011:contract, NARR-012:contract, NARR-013:contract
- RP26.P00.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Enterprise SaaS Hardening: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H26 | Claude: C26
- RP26.P00.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Enterprise SaaS Hardening: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H26 | Claude: C26
- RP26.P00.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Enterprise SaaS Hardening: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H26 | Claude: C26
- RP26.P00.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Enterprise SaaS Hardening: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H26 | Claude: C26
- RP26.P00.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Enterprise SaaS Hardening: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H26 | Claude: C26
- RP26.P00.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Enterprise SaaS Hardening: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H26 | Claude: C26
- RP26.P00.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Enterprise SaaS Hardening: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H26 | Claude: C26
- RP26.P00.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Enterprise SaaS Hardening: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H26 | Claude: C26
- RP26.P00.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Enterprise SaaS Hardening: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H26 | Claude: C26

#### RP26.P01: Domain Model

- RP26.P01.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Enterprise SaaS Hardening: Domain Model. | Commands: npm run validate | Hermes: H26 | Claude: C26
- RP26.P01.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Enterprise SaaS Hardening: Domain Model. | Commands: npm run validate | Hermes: H26 | Claude: C26
- RP26.P01.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Enterprise SaaS Hardening: Domain Model. | Commands: npm run validate | Hermes: H26 | Claude: C26
- RP26.P01.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Enterprise SaaS Hardening: Domain Model. | Commands: npm run validate | Hermes: H26 | Claude: C26
- RP26.P01.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Enterprise SaaS Hardening: Domain Model. | Commands: npm run validate | Hermes: H26 | Claude: C26
- RP26.P01.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Enterprise SaaS Hardening: Domain Model. | Commands: npm run validate | Hermes: H26 | Claude: C26
- RP26.P01.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Enterprise SaaS Hardening: Domain Model. | Commands: npm run validate | Hermes: H26 | Claude: C26
- RP26.P01.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Enterprise SaaS Hardening: Domain Model. | Commands: npm run validate | Hermes: H26 | Claude: C26
- RP26.P01.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Enterprise SaaS Hardening: Domain Model. | Commands: npm run validate | Hermes: H26 | Claude: C26
- RP26.P01.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Enterprise SaaS Hardening: Domain Model. | Commands: npm run validate | Hermes: H26 | Claude: C26
- RP26.P01.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Enterprise SaaS Hardening: Domain Model. | Commands: npm run validate | Hermes: H26 | Claude: C26

#### RP26.P02: Service Logic

- RP26.P02.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Enterprise SaaS Hardening: Service Logic. | Commands: npm run validate, npm test | Hermes: H26 | Claude: C26
- RP26.P02.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Enterprise SaaS Hardening: Service Logic. | Commands: npm run validate, npm test | Hermes: H26 | Claude: C26
- RP26.P02.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Enterprise SaaS Hardening: Service Logic. | Commands: npm run validate, npm test | Hermes: H26 | Claude: C26
- RP26.P02.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Enterprise SaaS Hardening: Service Logic. | Commands: npm run validate, npm test | Hermes: H26 | Claude: C26
- RP26.P02.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Enterprise SaaS Hardening: Service Logic. | Commands: npm run validate, npm test | Hermes: H26 | Claude: C26
- RP26.P02.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Enterprise SaaS Hardening: Service Logic. | Commands: npm run validate, npm test | Hermes: H26 | Claude: C26
- RP26.P02.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Enterprise SaaS Hardening: Service Logic. | Commands: npm run validate, npm test | Hermes: H26 | Claude: C26
- RP26.P02.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Enterprise SaaS Hardening: Service Logic. | Commands: npm run validate, npm test | Hermes: H26 | Claude: C26
- RP26.P02.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Enterprise SaaS Hardening: Service Logic. | Commands: npm run validate, npm test | Hermes: H26 | Claude: C26
- RP26.P02.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Enterprise SaaS Hardening: Service Logic. | Commands: npm run validate, npm test | Hermes: H26 | Claude: C26
- RP26.P02.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Enterprise SaaS Hardening: Service Logic. | Commands: npm run validate, npm test | Hermes: H26 | Claude: C26

#### RP26.P03: API And Interface

- RP26.P03.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Enterprise SaaS Hardening: API And Interface. | Commands: npm run validate, npm test | Hermes: H26 | Claude: C26
- RP26.P03.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Enterprise SaaS Hardening: API And Interface. | Commands: npm run validate, npm test | Hermes: H26 | Claude: C26
- RP26.P03.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Enterprise SaaS Hardening: API And Interface. | Commands: npm run validate, npm test | Hermes: H26 | Claude: C26
- RP26.P03.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Enterprise SaaS Hardening: API And Interface. | Commands: npm run validate, npm test | Hermes: H26 | Claude: C26
- RP26.P03.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Enterprise SaaS Hardening: API And Interface. | Commands: npm run validate, npm test | Hermes: H26 | Claude: C26
- RP26.P03.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Enterprise SaaS Hardening: API And Interface. | Commands: npm run validate, npm test | Hermes: H26 | Claude: C26
- RP26.P03.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Enterprise SaaS Hardening: API And Interface. | Commands: npm run validate, npm test | Hermes: H26 | Claude: C26
- RP26.P03.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Enterprise SaaS Hardening: API And Interface. | Commands: npm run validate, npm test | Hermes: H26 | Claude: C26
- RP26.P03.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Enterprise SaaS Hardening: API And Interface. | Commands: npm run validate, npm test | Hermes: H26 | Claude: C26
- RP26.P03.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Enterprise SaaS Hardening: API And Interface. | Commands: npm run validate, npm test | Hermes: H26 | Claude: C26
- RP26.P03.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Enterprise SaaS Hardening: API And Interface. | Commands: npm run validate, npm test | Hermes: H26 | Claude: C26

#### RP26.P04: UI And Operator Surface

- RP26.P04.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Enterprise SaaS Hardening: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H26 | Claude: C26
- RP26.P04.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Enterprise SaaS Hardening: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H26 | Claude: C26
- RP26.P04.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Enterprise SaaS Hardening: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H26 | Claude: C26
- RP26.P04.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Enterprise SaaS Hardening: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H26 | Claude: C26
- RP26.P04.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Enterprise SaaS Hardening: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H26 | Claude: C26
- RP26.P04.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Enterprise SaaS Hardening: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H26 | Claude: C26
- RP26.P04.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Enterprise SaaS Hardening: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H26 | Claude: C26
- RP26.P04.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Enterprise SaaS Hardening: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H26 | Claude: C26
- RP26.P04.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Enterprise SaaS Hardening: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H26 | Claude: C26
- RP26.P04.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Enterprise SaaS Hardening: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H26 | Claude: C26
- RP26.P04.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Enterprise SaaS Hardening: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H26 | Claude: C26

#### RP26.P05: Fixtures And Golden Cases

- RP26.P05.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Enterprise SaaS Hardening: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H26 | Claude: C26
- RP26.P05.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Enterprise SaaS Hardening: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H26 | Claude: C26
- RP26.P05.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Enterprise SaaS Hardening: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H26 | Claude: C26
- RP26.P05.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Enterprise SaaS Hardening: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H26 | Claude: C26
- RP26.P05.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Enterprise SaaS Hardening: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H26 | Claude: C26
- RP26.P05.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Enterprise SaaS Hardening: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H26 | Claude: C26
- RP26.P05.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Enterprise SaaS Hardening: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H26 | Claude: C26
- RP26.P05.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Enterprise SaaS Hardening: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H26 | Claude: C26 | Reqs: NARR-011:test, NARR-012:test, NARR-013:test
- RP26.P05.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Enterprise SaaS Hardening: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H26 | Claude: C26
- RP26.P05.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Enterprise SaaS Hardening: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H26 | Claude: C26
- RP26.P05.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Enterprise SaaS Hardening: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H26 | Claude: C26

#### RP26.P06: Permission Audit Integration

- RP26.P06.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Enterprise SaaS Hardening: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H26 | Claude: C26
- RP26.P06.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Enterprise SaaS Hardening: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H26 | Claude: C26
- RP26.P06.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Enterprise SaaS Hardening: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H26 | Claude: C26
- RP26.P06.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Enterprise SaaS Hardening: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H26 | Claude: C26
- RP26.P06.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Enterprise SaaS Hardening: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H26 | Claude: C26
- RP26.P06.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Enterprise SaaS Hardening: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H26 | Claude: C26
- RP26.P06.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Enterprise SaaS Hardening: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H26 | Claude: C26
- RP26.P06.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Enterprise SaaS Hardening: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H26 | Claude: C26
- RP26.P06.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Enterprise SaaS Hardening: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H26 | Claude: C26
- RP26.P06.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Enterprise SaaS Hardening: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H26 | Claude: C26
- RP26.P06.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Enterprise SaaS Hardening: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H26 | Claude: C26

#### RP26.P07: Failure Edge And Recovery

- RP26.P07.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Enterprise SaaS Hardening: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H26 | Claude: C26
- RP26.P07.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Enterprise SaaS Hardening: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H26 | Claude: C26
- RP26.P07.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Enterprise SaaS Hardening: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H26 | Claude: C26 | Reqs: NARR-013:primary_implementation
- RP26.P07.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Enterprise SaaS Hardening: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H26 | Claude: C26
- RP26.P07.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Enterprise SaaS Hardening: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H26 | Claude: C26
- RP26.P07.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Enterprise SaaS Hardening: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H26 | Claude: C26
- RP26.P07.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Enterprise SaaS Hardening: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H26 | Claude: C26
- RP26.P07.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Enterprise SaaS Hardening: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H26 | Claude: C26 | Reqs: NARR-011:primary_implementation, NARR-012:primary_implementation
- RP26.P07.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Enterprise SaaS Hardening: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H26 | Claude: C26
- RP26.P07.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Enterprise SaaS Hardening: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H26 | Claude: C26
- RP26.P07.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Enterprise SaaS Hardening: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H26 | Claude: C26

#### RP26.P08: Hermes Validation Binding

- RP26.P08.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Enterprise SaaS Hardening: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H26 | Claude: C26
- RP26.P08.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Enterprise SaaS Hardening: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H26 | Claude: C26
- RP26.P08.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Enterprise SaaS Hardening: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H26 | Claude: C26
- RP26.P08.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Enterprise SaaS Hardening: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H26 | Claude: C26
- RP26.P08.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Enterprise SaaS Hardening: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H26 | Claude: C26
- RP26.P08.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Enterprise SaaS Hardening: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H26 | Claude: C26
- RP26.P08.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Enterprise SaaS Hardening: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H26 | Claude: C26
- RP26.P08.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Enterprise SaaS Hardening: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H26 | Claude: C26
- RP26.P08.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Enterprise SaaS Hardening: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H26 | Claude: C26 | Reqs: NARR-011:hermes_evidence, NARR-012:hermes_evidence, NARR-013:hermes_evidence
- RP26.P08.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Enterprise SaaS Hardening: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H26 | Claude: C26
- RP26.P08.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Enterprise SaaS Hardening: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H26 | Claude: C26

#### RP26.P09: Claude Cross Validation Closeout

- RP26.P09.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Enterprise SaaS Hardening: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H26 | Claude: C26
- RP26.P09.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Enterprise SaaS Hardening: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H26 | Claude: C26
- RP26.P09.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Enterprise SaaS Hardening: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H26 | Claude: C26
- RP26.P09.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Enterprise SaaS Hardening: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H26 | Claude: C26
- RP26.P09.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Enterprise SaaS Hardening: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H26 | Claude: C26
- RP26.P09.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Enterprise SaaS Hardening: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H26 | Claude: C26
- RP26.P09.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Enterprise SaaS Hardening: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H26 | Claude: C26
- RP26.P09.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Enterprise SaaS Hardening: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H26 | Claude: C26
- RP26.P09.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Enterprise SaaS Hardening: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H26 | Claude: C26
- RP26.P09.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Enterprise SaaS Hardening: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H26 | Claude: C26 | Reqs: NARR-011:claude_review, NARR-012:claude_review, NARR-013:claude_review
- RP26.P09.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Enterprise SaaS Hardening: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H26 | Claude: C26


### RP27: Platform Extensibility

Scope: public API, webhooks, workflow builder

#### RP27.P00: Contract And Acceptance Baseline

- RP27.P00.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Platform Extensibility: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H27 | Claude: C27
- RP27.P00.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Platform Extensibility: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H27 | Claude: C27
- RP27.P00.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Platform Extensibility: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H27 | Claude: C27
- RP27.P00.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Platform Extensibility: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H27 | Claude: C27
- RP27.P00.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Platform Extensibility: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H27 | Claude: C27
- RP27.P00.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Platform Extensibility: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H27 | Claude: C27
- RP27.P00.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Platform Extensibility: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H27 | Claude: C27
- RP27.P00.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Platform Extensibility: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H27 | Claude: C27
- RP27.P00.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Platform Extensibility: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H27 | Claude: C27
- RP27.P00.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Platform Extensibility: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H27 | Claude: C27
- RP27.P00.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Platform Extensibility: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H27 | Claude: C27

#### RP27.P01: Domain Model

- RP27.P01.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Platform Extensibility: Domain Model. | Commands: npm run validate | Hermes: H27 | Claude: C27
- RP27.P01.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Platform Extensibility: Domain Model. | Commands: npm run validate | Hermes: H27 | Claude: C27
- RP27.P01.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Platform Extensibility: Domain Model. | Commands: npm run validate | Hermes: H27 | Claude: C27
- RP27.P01.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Platform Extensibility: Domain Model. | Commands: npm run validate | Hermes: H27 | Claude: C27
- RP27.P01.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Platform Extensibility: Domain Model. | Commands: npm run validate | Hermes: H27 | Claude: C27
- RP27.P01.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Platform Extensibility: Domain Model. | Commands: npm run validate | Hermes: H27 | Claude: C27
- RP27.P01.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Platform Extensibility: Domain Model. | Commands: npm run validate | Hermes: H27 | Claude: C27
- RP27.P01.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Platform Extensibility: Domain Model. | Commands: npm run validate | Hermes: H27 | Claude: C27
- RP27.P01.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Platform Extensibility: Domain Model. | Commands: npm run validate | Hermes: H27 | Claude: C27
- RP27.P01.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Platform Extensibility: Domain Model. | Commands: npm run validate | Hermes: H27 | Claude: C27
- RP27.P01.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Platform Extensibility: Domain Model. | Commands: npm run validate | Hermes: H27 | Claude: C27

#### RP27.P02: Service Logic

- RP27.P02.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Platform Extensibility: Service Logic. | Commands: npm run validate, npm test | Hermes: H27 | Claude: C27
- RP27.P02.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Platform Extensibility: Service Logic. | Commands: npm run validate, npm test | Hermes: H27 | Claude: C27
- RP27.P02.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Platform Extensibility: Service Logic. | Commands: npm run validate, npm test | Hermes: H27 | Claude: C27
- RP27.P02.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Platform Extensibility: Service Logic. | Commands: npm run validate, npm test | Hermes: H27 | Claude: C27
- RP27.P02.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Platform Extensibility: Service Logic. | Commands: npm run validate, npm test | Hermes: H27 | Claude: C27
- RP27.P02.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Platform Extensibility: Service Logic. | Commands: npm run validate, npm test | Hermes: H27 | Claude: C27
- RP27.P02.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Platform Extensibility: Service Logic. | Commands: npm run validate, npm test | Hermes: H27 | Claude: C27
- RP27.P02.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Platform Extensibility: Service Logic. | Commands: npm run validate, npm test | Hermes: H27 | Claude: C27
- RP27.P02.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Platform Extensibility: Service Logic. | Commands: npm run validate, npm test | Hermes: H27 | Claude: C27
- RP27.P02.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Platform Extensibility: Service Logic. | Commands: npm run validate, npm test | Hermes: H27 | Claude: C27
- RP27.P02.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Platform Extensibility: Service Logic. | Commands: npm run validate, npm test | Hermes: H27 | Claude: C27

#### RP27.P03: API And Interface

- RP27.P03.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Platform Extensibility: API And Interface. | Commands: npm run validate, npm test | Hermes: H27 | Claude: C27
- RP27.P03.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Platform Extensibility: API And Interface. | Commands: npm run validate, npm test | Hermes: H27 | Claude: C27
- RP27.P03.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Platform Extensibility: API And Interface. | Commands: npm run validate, npm test | Hermes: H27 | Claude: C27
- RP27.P03.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Platform Extensibility: API And Interface. | Commands: npm run validate, npm test | Hermes: H27 | Claude: C27
- RP27.P03.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Platform Extensibility: API And Interface. | Commands: npm run validate, npm test | Hermes: H27 | Claude: C27
- RP27.P03.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Platform Extensibility: API And Interface. | Commands: npm run validate, npm test | Hermes: H27 | Claude: C27
- RP27.P03.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Platform Extensibility: API And Interface. | Commands: npm run validate, npm test | Hermes: H27 | Claude: C27
- RP27.P03.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Platform Extensibility: API And Interface. | Commands: npm run validate, npm test | Hermes: H27 | Claude: C27
- RP27.P03.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Platform Extensibility: API And Interface. | Commands: npm run validate, npm test | Hermes: H27 | Claude: C27
- RP27.P03.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Platform Extensibility: API And Interface. | Commands: npm run validate, npm test | Hermes: H27 | Claude: C27
- RP27.P03.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Platform Extensibility: API And Interface. | Commands: npm run validate, npm test | Hermes: H27 | Claude: C27

#### RP27.P04: UI And Operator Surface

- RP27.P04.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Platform Extensibility: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H27 | Claude: C27
- RP27.P04.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Platform Extensibility: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H27 | Claude: C27
- RP27.P04.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Platform Extensibility: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H27 | Claude: C27
- RP27.P04.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Platform Extensibility: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H27 | Claude: C27
- RP27.P04.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Platform Extensibility: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H27 | Claude: C27
- RP27.P04.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Platform Extensibility: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H27 | Claude: C27
- RP27.P04.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Platform Extensibility: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H27 | Claude: C27
- RP27.P04.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Platform Extensibility: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H27 | Claude: C27
- RP27.P04.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Platform Extensibility: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H27 | Claude: C27
- RP27.P04.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Platform Extensibility: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H27 | Claude: C27
- RP27.P04.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Platform Extensibility: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H27 | Claude: C27

#### RP27.P05: Fixtures And Golden Cases

- RP27.P05.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Platform Extensibility: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H27 | Claude: C27
- RP27.P05.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Platform Extensibility: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H27 | Claude: C27
- RP27.P05.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Platform Extensibility: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H27 | Claude: C27
- RP27.P05.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Platform Extensibility: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H27 | Claude: C27
- RP27.P05.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Platform Extensibility: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H27 | Claude: C27
- RP27.P05.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Platform Extensibility: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H27 | Claude: C27
- RP27.P05.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Platform Extensibility: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H27 | Claude: C27
- RP27.P05.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Platform Extensibility: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H27 | Claude: C27
- RP27.P05.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Platform Extensibility: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H27 | Claude: C27
- RP27.P05.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Platform Extensibility: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H27 | Claude: C27
- RP27.P05.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Platform Extensibility: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H27 | Claude: C27

#### RP27.P06: Permission Audit Integration

- RP27.P06.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Platform Extensibility: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H27 | Claude: C27
- RP27.P06.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Platform Extensibility: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H27 | Claude: C27
- RP27.P06.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Platform Extensibility: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H27 | Claude: C27
- RP27.P06.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Platform Extensibility: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H27 | Claude: C27
- RP27.P06.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Platform Extensibility: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H27 | Claude: C27
- RP27.P06.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Platform Extensibility: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H27 | Claude: C27
- RP27.P06.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Platform Extensibility: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H27 | Claude: C27
- RP27.P06.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Platform Extensibility: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H27 | Claude: C27
- RP27.P06.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Platform Extensibility: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H27 | Claude: C27
- RP27.P06.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Platform Extensibility: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H27 | Claude: C27
- RP27.P06.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Platform Extensibility: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H27 | Claude: C27

#### RP27.P07: Failure Edge And Recovery

- RP27.P07.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Platform Extensibility: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H27 | Claude: C27
- RP27.P07.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Platform Extensibility: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H27 | Claude: C27
- RP27.P07.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Platform Extensibility: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H27 | Claude: C27
- RP27.P07.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Platform Extensibility: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H27 | Claude: C27
- RP27.P07.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Platform Extensibility: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H27 | Claude: C27
- RP27.P07.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Platform Extensibility: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H27 | Claude: C27
- RP27.P07.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Platform Extensibility: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H27 | Claude: C27
- RP27.P07.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Platform Extensibility: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H27 | Claude: C27
- RP27.P07.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Platform Extensibility: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H27 | Claude: C27
- RP27.P07.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Platform Extensibility: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H27 | Claude: C27
- RP27.P07.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Platform Extensibility: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H27 | Claude: C27

#### RP27.P08: Hermes Validation Binding

- RP27.P08.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Platform Extensibility: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H27 | Claude: C27
- RP27.P08.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Platform Extensibility: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H27 | Claude: C27
- RP27.P08.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Platform Extensibility: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H27 | Claude: C27
- RP27.P08.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Platform Extensibility: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H27 | Claude: C27
- RP27.P08.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Platform Extensibility: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H27 | Claude: C27
- RP27.P08.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Platform Extensibility: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H27 | Claude: C27
- RP27.P08.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Platform Extensibility: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H27 | Claude: C27
- RP27.P08.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Platform Extensibility: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H27 | Claude: C27
- RP27.P08.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Platform Extensibility: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H27 | Claude: C27
- RP27.P08.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Platform Extensibility: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H27 | Claude: C27
- RP27.P08.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Platform Extensibility: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H27 | Claude: C27

#### RP27.P09: Claude Cross Validation Closeout

- RP27.P09.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Platform Extensibility: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H27 | Claude: C27
- RP27.P09.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Platform Extensibility: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H27 | Claude: C27
- RP27.P09.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Platform Extensibility: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H27 | Claude: C27
- RP27.P09.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Platform Extensibility: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H27 | Claude: C27
- RP27.P09.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Platform Extensibility: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H27 | Claude: C27
- RP27.P09.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Platform Extensibility: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H27 | Claude: C27
- RP27.P09.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Platform Extensibility: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H27 | Claude: C27
- RP27.P09.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Platform Extensibility: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H27 | Claude: C27
- RP27.P09.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Platform Extensibility: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H27 | Claude: C27
- RP27.P09.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Platform Extensibility: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H27 | Claude: C27
- RP27.P09.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Platform Extensibility: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H27 | Claude: C27


### RP28: Marketplace And Custom AI Apps

Scope: app registry, connector SDK, custom AI app review gate

#### RP28.P00: Contract And Acceptance Baseline

- RP28.P00.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Marketplace And Custom AI Apps: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H28 | Claude: C28
- RP28.P00.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Marketplace And Custom AI Apps: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H28 | Claude: C28
- RP28.P00.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Marketplace And Custom AI Apps: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H28 | Claude: C28
- RP28.P00.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Marketplace And Custom AI Apps: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H28 | Claude: C28
- RP28.P00.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Marketplace And Custom AI Apps: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H28 | Claude: C28
- RP28.P00.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Marketplace And Custom AI Apps: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H28 | Claude: C28
- RP28.P00.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Marketplace And Custom AI Apps: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H28 | Claude: C28
- RP28.P00.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Marketplace And Custom AI Apps: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H28 | Claude: C28
- RP28.P00.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Marketplace And Custom AI Apps: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H28 | Claude: C28
- RP28.P00.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Marketplace And Custom AI Apps: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H28 | Claude: C28
- RP28.P00.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Marketplace And Custom AI Apps: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H28 | Claude: C28

#### RP28.P01: Domain Model

- RP28.P01.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Marketplace And Custom AI Apps: Domain Model. | Commands: npm run validate | Hermes: H28 | Claude: C28
- RP28.P01.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Marketplace And Custom AI Apps: Domain Model. | Commands: npm run validate | Hermes: H28 | Claude: C28
- RP28.P01.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Marketplace And Custom AI Apps: Domain Model. | Commands: npm run validate | Hermes: H28 | Claude: C28
- RP28.P01.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Marketplace And Custom AI Apps: Domain Model. | Commands: npm run validate | Hermes: H28 | Claude: C28
- RP28.P01.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Marketplace And Custom AI Apps: Domain Model. | Commands: npm run validate | Hermes: H28 | Claude: C28
- RP28.P01.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Marketplace And Custom AI Apps: Domain Model. | Commands: npm run validate | Hermes: H28 | Claude: C28
- RP28.P01.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Marketplace And Custom AI Apps: Domain Model. | Commands: npm run validate | Hermes: H28 | Claude: C28
- RP28.P01.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Marketplace And Custom AI Apps: Domain Model. | Commands: npm run validate | Hermes: H28 | Claude: C28
- RP28.P01.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Marketplace And Custom AI Apps: Domain Model. | Commands: npm run validate | Hermes: H28 | Claude: C28
- RP28.P01.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Marketplace And Custom AI Apps: Domain Model. | Commands: npm run validate | Hermes: H28 | Claude: C28
- RP28.P01.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Marketplace And Custom AI Apps: Domain Model. | Commands: npm run validate | Hermes: H28 | Claude: C28

#### RP28.P02: Service Logic

- RP28.P02.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Marketplace And Custom AI Apps: Service Logic. | Commands: npm run validate, npm test | Hermes: H28 | Claude: C28
- RP28.P02.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Marketplace And Custom AI Apps: Service Logic. | Commands: npm run validate, npm test | Hermes: H28 | Claude: C28
- RP28.P02.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Marketplace And Custom AI Apps: Service Logic. | Commands: npm run validate, npm test | Hermes: H28 | Claude: C28
- RP28.P02.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Marketplace And Custom AI Apps: Service Logic. | Commands: npm run validate, npm test | Hermes: H28 | Claude: C28
- RP28.P02.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Marketplace And Custom AI Apps: Service Logic. | Commands: npm run validate, npm test | Hermes: H28 | Claude: C28
- RP28.P02.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Marketplace And Custom AI Apps: Service Logic. | Commands: npm run validate, npm test | Hermes: H28 | Claude: C28
- RP28.P02.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Marketplace And Custom AI Apps: Service Logic. | Commands: npm run validate, npm test | Hermes: H28 | Claude: C28
- RP28.P02.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Marketplace And Custom AI Apps: Service Logic. | Commands: npm run validate, npm test | Hermes: H28 | Claude: C28
- RP28.P02.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Marketplace And Custom AI Apps: Service Logic. | Commands: npm run validate, npm test | Hermes: H28 | Claude: C28
- RP28.P02.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Marketplace And Custom AI Apps: Service Logic. | Commands: npm run validate, npm test | Hermes: H28 | Claude: C28
- RP28.P02.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Marketplace And Custom AI Apps: Service Logic. | Commands: npm run validate, npm test | Hermes: H28 | Claude: C28

#### RP28.P03: API And Interface

- RP28.P03.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Marketplace And Custom AI Apps: API And Interface. | Commands: npm run validate, npm test | Hermes: H28 | Claude: C28
- RP28.P03.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Marketplace And Custom AI Apps: API And Interface. | Commands: npm run validate, npm test | Hermes: H28 | Claude: C28
- RP28.P03.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Marketplace And Custom AI Apps: API And Interface. | Commands: npm run validate, npm test | Hermes: H28 | Claude: C28
- RP28.P03.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Marketplace And Custom AI Apps: API And Interface. | Commands: npm run validate, npm test | Hermes: H28 | Claude: C28
- RP28.P03.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Marketplace And Custom AI Apps: API And Interface. | Commands: npm run validate, npm test | Hermes: H28 | Claude: C28
- RP28.P03.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Marketplace And Custom AI Apps: API And Interface. | Commands: npm run validate, npm test | Hermes: H28 | Claude: C28
- RP28.P03.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Marketplace And Custom AI Apps: API And Interface. | Commands: npm run validate, npm test | Hermes: H28 | Claude: C28
- RP28.P03.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Marketplace And Custom AI Apps: API And Interface. | Commands: npm run validate, npm test | Hermes: H28 | Claude: C28
- RP28.P03.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Marketplace And Custom AI Apps: API And Interface. | Commands: npm run validate, npm test | Hermes: H28 | Claude: C28
- RP28.P03.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Marketplace And Custom AI Apps: API And Interface. | Commands: npm run validate, npm test | Hermes: H28 | Claude: C28
- RP28.P03.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Marketplace And Custom AI Apps: API And Interface. | Commands: npm run validate, npm test | Hermes: H28 | Claude: C28

#### RP28.P04: UI And Operator Surface

- RP28.P04.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Marketplace And Custom AI Apps: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H28 | Claude: C28
- RP28.P04.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Marketplace And Custom AI Apps: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H28 | Claude: C28
- RP28.P04.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Marketplace And Custom AI Apps: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H28 | Claude: C28
- RP28.P04.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Marketplace And Custom AI Apps: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H28 | Claude: C28
- RP28.P04.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Marketplace And Custom AI Apps: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H28 | Claude: C28
- RP28.P04.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Marketplace And Custom AI Apps: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H28 | Claude: C28
- RP28.P04.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Marketplace And Custom AI Apps: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H28 | Claude: C28
- RP28.P04.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Marketplace And Custom AI Apps: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H28 | Claude: C28
- RP28.P04.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Marketplace And Custom AI Apps: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H28 | Claude: C28
- RP28.P04.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Marketplace And Custom AI Apps: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H28 | Claude: C28
- RP28.P04.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Marketplace And Custom AI Apps: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H28 | Claude: C28

#### RP28.P05: Fixtures And Golden Cases

- RP28.P05.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Marketplace And Custom AI Apps: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H28 | Claude: C28
- RP28.P05.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Marketplace And Custom AI Apps: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H28 | Claude: C28
- RP28.P05.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Marketplace And Custom AI Apps: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H28 | Claude: C28
- RP28.P05.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Marketplace And Custom AI Apps: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H28 | Claude: C28
- RP28.P05.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Marketplace And Custom AI Apps: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H28 | Claude: C28
- RP28.P05.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Marketplace And Custom AI Apps: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H28 | Claude: C28
- RP28.P05.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Marketplace And Custom AI Apps: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H28 | Claude: C28
- RP28.P05.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Marketplace And Custom AI Apps: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H28 | Claude: C28
- RP28.P05.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Marketplace And Custom AI Apps: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H28 | Claude: C28
- RP28.P05.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Marketplace And Custom AI Apps: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H28 | Claude: C28
- RP28.P05.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Marketplace And Custom AI Apps: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H28 | Claude: C28

#### RP28.P06: Permission Audit Integration

- RP28.P06.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Marketplace And Custom AI Apps: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H28 | Claude: C28
- RP28.P06.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Marketplace And Custom AI Apps: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H28 | Claude: C28
- RP28.P06.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Marketplace And Custom AI Apps: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H28 | Claude: C28
- RP28.P06.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Marketplace And Custom AI Apps: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H28 | Claude: C28
- RP28.P06.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Marketplace And Custom AI Apps: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H28 | Claude: C28
- RP28.P06.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Marketplace And Custom AI Apps: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H28 | Claude: C28
- RP28.P06.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Marketplace And Custom AI Apps: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H28 | Claude: C28
- RP28.P06.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Marketplace And Custom AI Apps: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H28 | Claude: C28
- RP28.P06.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Marketplace And Custom AI Apps: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H28 | Claude: C28
- RP28.P06.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Marketplace And Custom AI Apps: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H28 | Claude: C28
- RP28.P06.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Marketplace And Custom AI Apps: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H28 | Claude: C28

#### RP28.P07: Failure Edge And Recovery

- RP28.P07.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Marketplace And Custom AI Apps: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H28 | Claude: C28
- RP28.P07.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Marketplace And Custom AI Apps: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H28 | Claude: C28
- RP28.P07.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Marketplace And Custom AI Apps: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H28 | Claude: C28
- RP28.P07.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Marketplace And Custom AI Apps: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H28 | Claude: C28
- RP28.P07.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Marketplace And Custom AI Apps: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H28 | Claude: C28
- RP28.P07.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Marketplace And Custom AI Apps: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H28 | Claude: C28
- RP28.P07.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Marketplace And Custom AI Apps: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H28 | Claude: C28
- RP28.P07.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Marketplace And Custom AI Apps: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H28 | Claude: C28
- RP28.P07.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Marketplace And Custom AI Apps: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H28 | Claude: C28
- RP28.P07.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Marketplace And Custom AI Apps: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H28 | Claude: C28
- RP28.P07.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Marketplace And Custom AI Apps: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H28 | Claude: C28

#### RP28.P08: Hermes Validation Binding

- RP28.P08.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Marketplace And Custom AI Apps: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H28 | Claude: C28
- RP28.P08.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Marketplace And Custom AI Apps: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H28 | Claude: C28
- RP28.P08.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Marketplace And Custom AI Apps: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H28 | Claude: C28
- RP28.P08.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Marketplace And Custom AI Apps: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H28 | Claude: C28
- RP28.P08.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Marketplace And Custom AI Apps: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H28 | Claude: C28
- RP28.P08.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Marketplace And Custom AI Apps: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H28 | Claude: C28
- RP28.P08.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Marketplace And Custom AI Apps: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H28 | Claude: C28
- RP28.P08.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Marketplace And Custom AI Apps: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H28 | Claude: C28
- RP28.P08.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Marketplace And Custom AI Apps: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H28 | Claude: C28
- RP28.P08.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Marketplace And Custom AI Apps: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H28 | Claude: C28
- RP28.P08.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Marketplace And Custom AI Apps: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H28 | Claude: C28

#### RP28.P09: Claude Cross Validation Closeout

- RP28.P09.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Marketplace And Custom AI Apps: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H28 | Claude: C28
- RP28.P09.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Marketplace And Custom AI Apps: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H28 | Claude: C28
- RP28.P09.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Marketplace And Custom AI Apps: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H28 | Claude: C28
- RP28.P09.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Marketplace And Custom AI Apps: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H28 | Claude: C28
- RP28.P09.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Marketplace And Custom AI Apps: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H28 | Claude: C28
- RP28.P09.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Marketplace And Custom AI Apps: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H28 | Claude: C28
- RP28.P09.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Marketplace And Custom AI Apps: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H28 | Claude: C28
- RP28.P09.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Marketplace And Custom AI Apps: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H28 | Claude: C28
- RP28.P09.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Marketplace And Custom AI Apps: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H28 | Claude: C28
- RP28.P09.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Marketplace And Custom AI Apps: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H28 | Claude: C28
- RP28.P09.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Marketplace And Custom AI Apps: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H28 | Claude: C28


### RP29: Commercial Readiness

Scope: CI/CD, observability, SOC2/ISMS-P reports, release

#### RP29.P00: Contract And Acceptance Baseline

- RP29.P00.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Commercial Readiness: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H29 | Claude: C29
- RP29.P00.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Commercial Readiness: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H29 | Claude: C29
- RP29.P00.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Commercial Readiness: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H29 | Claude: C29
- RP29.P00.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Commercial Readiness: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H29 | Claude: C29
- RP29.P00.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Commercial Readiness: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H29 | Claude: C29
- RP29.P00.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Commercial Readiness: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H29 | Claude: C29
- RP29.P00.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Commercial Readiness: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H29 | Claude: C29
- RP29.P00.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Commercial Readiness: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H29 | Claude: C29
- RP29.P00.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Commercial Readiness: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H29 | Claude: C29
- RP29.P00.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Commercial Readiness: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H29 | Claude: C29
- RP29.P00.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Commercial Readiness: Contract And Acceptance Baseline. | Commands: npm run validate | Hermes: H29 | Claude: C29

#### RP29.P01: Domain Model

- RP29.P01.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Commercial Readiness: Domain Model. | Commands: npm run validate | Hermes: H29 | Claude: C29
- RP29.P01.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Commercial Readiness: Domain Model. | Commands: npm run validate | Hermes: H29 | Claude: C29
- RP29.P01.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Commercial Readiness: Domain Model. | Commands: npm run validate | Hermes: H29 | Claude: C29
- RP29.P01.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Commercial Readiness: Domain Model. | Commands: npm run validate | Hermes: H29 | Claude: C29
- RP29.P01.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Commercial Readiness: Domain Model. | Commands: npm run validate | Hermes: H29 | Claude: C29
- RP29.P01.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Commercial Readiness: Domain Model. | Commands: npm run validate | Hermes: H29 | Claude: C29
- RP29.P01.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Commercial Readiness: Domain Model. | Commands: npm run validate | Hermes: H29 | Claude: C29
- RP29.P01.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Commercial Readiness: Domain Model. | Commands: npm run validate | Hermes: H29 | Claude: C29
- RP29.P01.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Commercial Readiness: Domain Model. | Commands: npm run validate | Hermes: H29 | Claude: C29
- RP29.P01.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Commercial Readiness: Domain Model. | Commands: npm run validate | Hermes: H29 | Claude: C29
- RP29.P01.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Commercial Readiness: Domain Model. | Commands: npm run validate | Hermes: H29 | Claude: C29

#### RP29.P02: Service Logic

- RP29.P02.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Commercial Readiness: Service Logic. | Commands: npm run validate, npm test | Hermes: H29 | Claude: C29
- RP29.P02.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Commercial Readiness: Service Logic. | Commands: npm run validate, npm test | Hermes: H29 | Claude: C29
- RP29.P02.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Commercial Readiness: Service Logic. | Commands: npm run validate, npm test | Hermes: H29 | Claude: C29
- RP29.P02.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Commercial Readiness: Service Logic. | Commands: npm run validate, npm test | Hermes: H29 | Claude: C29
- RP29.P02.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Commercial Readiness: Service Logic. | Commands: npm run validate, npm test | Hermes: H29 | Claude: C29
- RP29.P02.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Commercial Readiness: Service Logic. | Commands: npm run validate, npm test | Hermes: H29 | Claude: C29
- RP29.P02.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Commercial Readiness: Service Logic. | Commands: npm run validate, npm test | Hermes: H29 | Claude: C29
- RP29.P02.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Commercial Readiness: Service Logic. | Commands: npm run validate, npm test | Hermes: H29 | Claude: C29
- RP29.P02.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Commercial Readiness: Service Logic. | Commands: npm run validate, npm test | Hermes: H29 | Claude: C29
- RP29.P02.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Commercial Readiness: Service Logic. | Commands: npm run validate, npm test | Hermes: H29 | Claude: C29
- RP29.P02.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Commercial Readiness: Service Logic. | Commands: npm run validate, npm test | Hermes: H29 | Claude: C29

#### RP29.P03: API And Interface

- RP29.P03.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Commercial Readiness: API And Interface. | Commands: npm run validate, npm test | Hermes: H29 | Claude: C29
- RP29.P03.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Commercial Readiness: API And Interface. | Commands: npm run validate, npm test | Hermes: H29 | Claude: C29
- RP29.P03.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Commercial Readiness: API And Interface. | Commands: npm run validate, npm test | Hermes: H29 | Claude: C29
- RP29.P03.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Commercial Readiness: API And Interface. | Commands: npm run validate, npm test | Hermes: H29 | Claude: C29
- RP29.P03.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Commercial Readiness: API And Interface. | Commands: npm run validate, npm test | Hermes: H29 | Claude: C29
- RP29.P03.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Commercial Readiness: API And Interface. | Commands: npm run validate, npm test | Hermes: H29 | Claude: C29
- RP29.P03.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Commercial Readiness: API And Interface. | Commands: npm run validate, npm test | Hermes: H29 | Claude: C29
- RP29.P03.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Commercial Readiness: API And Interface. | Commands: npm run validate, npm test | Hermes: H29 | Claude: C29
- RP29.P03.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Commercial Readiness: API And Interface. | Commands: npm run validate, npm test | Hermes: H29 | Claude: C29
- RP29.P03.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Commercial Readiness: API And Interface. | Commands: npm run validate, npm test | Hermes: H29 | Claude: C29
- RP29.P03.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Commercial Readiness: API And Interface. | Commands: npm run validate, npm test | Hermes: H29 | Claude: C29

#### RP29.P04: UI And Operator Surface

- RP29.P04.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Commercial Readiness: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H29 | Claude: C29
- RP29.P04.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Commercial Readiness: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H29 | Claude: C29
- RP29.P04.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Commercial Readiness: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H29 | Claude: C29
- RP29.P04.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Commercial Readiness: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H29 | Claude: C29
- RP29.P04.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Commercial Readiness: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H29 | Claude: C29
- RP29.P04.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Commercial Readiness: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H29 | Claude: C29
- RP29.P04.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Commercial Readiness: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H29 | Claude: C29
- RP29.P04.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Commercial Readiness: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H29 | Claude: C29
- RP29.P04.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Commercial Readiness: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H29 | Claude: C29
- RP29.P04.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Commercial Readiness: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H29 | Claude: C29
- RP29.P04.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Commercial Readiness: UI And Operator Surface. | Commands: npm run validate, npm test, npm run build | Hermes: H29 | Claude: C29

#### RP29.P05: Fixtures And Golden Cases

- RP29.P05.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Commercial Readiness: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H29 | Claude: C29
- RP29.P05.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Commercial Readiness: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H29 | Claude: C29
- RP29.P05.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Commercial Readiness: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H29 | Claude: C29
- RP29.P05.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Commercial Readiness: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H29 | Claude: C29
- RP29.P05.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Commercial Readiness: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H29 | Claude: C29
- RP29.P05.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Commercial Readiness: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H29 | Claude: C29
- RP29.P05.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Commercial Readiness: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H29 | Claude: C29
- RP29.P05.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Commercial Readiness: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H29 | Claude: C29
- RP29.P05.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Commercial Readiness: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H29 | Claude: C29
- RP29.P05.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Commercial Readiness: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H29 | Claude: C29
- RP29.P05.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Commercial Readiness: Fixtures And Golden Cases. | Commands: npm run validate, npm test | Hermes: H29 | Claude: C29

#### RP29.P06: Permission Audit Integration

- RP29.P06.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Commercial Readiness: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H29 | Claude: C29
- RP29.P06.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Commercial Readiness: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H29 | Claude: C29
- RP29.P06.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Commercial Readiness: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H29 | Claude: C29
- RP29.P06.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Commercial Readiness: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H29 | Claude: C29
- RP29.P06.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Commercial Readiness: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H29 | Claude: C29
- RP29.P06.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Commercial Readiness: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H29 | Claude: C29
- RP29.P06.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Commercial Readiness: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H29 | Claude: C29
- RP29.P06.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Commercial Readiness: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H29 | Claude: C29
- RP29.P06.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Commercial Readiness: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H29 | Claude: C29
- RP29.P06.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Commercial Readiness: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H29 | Claude: C29
- RP29.P06.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Commercial Readiness: Permission Audit Integration. | Commands: npm run validate, npm test | Hermes: H29 | Claude: C29

#### RP29.P07: Failure Edge And Recovery

- RP29.P07.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Commercial Readiness: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H29 | Claude: C29
- RP29.P07.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Commercial Readiness: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H29 | Claude: C29
- RP29.P07.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Commercial Readiness: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H29 | Claude: C29
- RP29.P07.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Commercial Readiness: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H29 | Claude: C29
- RP29.P07.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Commercial Readiness: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H29 | Claude: C29
- RP29.P07.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Commercial Readiness: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H29 | Claude: C29
- RP29.P07.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Commercial Readiness: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H29 | Claude: C29
- RP29.P07.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Commercial Readiness: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H29 | Claude: C29
- RP29.P07.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Commercial Readiness: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H29 | Claude: C29
- RP29.P07.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Commercial Readiness: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H29 | Claude: C29
- RP29.P07.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Commercial Readiness: Failure Edge And Recovery. | Commands: npm run validate, npm test | Hermes: H29 | Claude: C29

#### RP29.P08: Hermes Validation Binding

- RP29.P08.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Commercial Readiness: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H29 | Claude: C29
- RP29.P08.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Commercial Readiness: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H29 | Claude: C29
- RP29.P08.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Commercial Readiness: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H29 | Claude: C29
- RP29.P08.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Commercial Readiness: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H29 | Claude: C29
- RP29.P08.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Commercial Readiness: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H29 | Claude: C29
- RP29.P08.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Commercial Readiness: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H29 | Claude: C29
- RP29.P08.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Commercial Readiness: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H29 | Claude: C29
- RP29.P08.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Commercial Readiness: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H29 | Claude: C29
- RP29.P08.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Commercial Readiness: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H29 | Claude: C29
- RP29.P08.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Commercial Readiness: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H29 | Claude: C29
- RP29.P08.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Commercial Readiness: Hermes Validation Binding. | Commands: npm run validate, npm test, npm run build | Hermes: H29 | Claude: C29

#### RP29.P09: Claude Cross Validation Closeout

- RP29.P09.M00 | Scope Inventory | inventory requirements, entities, workflows, and open risks for this phase for Commercial Readiness: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H29 | Claude: C29
- RP29.P09.M01 | Contract Draft | write or refresh contract rows, schema expectations, and acceptance gates for Commercial Readiness: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H29 | Claude: C29
- RP29.P09.M02 | Type And Shape Definition | define fields, enums, identifiers, references, and ownership metadata for Commercial Readiness: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H29 | Claude: C29
- RP29.P09.M03 | Primary Implementation Slice | implement the smallest useful product behavior for this phase for Commercial Readiness: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H29 | Claude: C29
- RP29.P09.M04 | Secondary Workflow Slice | implement the supporting workflow, UI state, or integration seam for Commercial Readiness: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H29 | Claude: C29
- RP29.P09.M05 | Permission And Audit Binding | bind role checks, deny checks, security trimming, and audit events for Commercial Readiness: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H29 | Claude: C29
- RP29.P09.M06 | Synthetic Fixture Set | create synthetic fixtures and examples with no real client or matter data for Commercial Readiness: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H29 | Claude: C29
- RP29.P09.M07 | Test And Golden Case Set | add unit, contract, integration, golden, or UI tests as appropriate for Commercial Readiness: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H29 | Claude: C29
- RP29.P09.M08 | Hermes Evidence Packet | record commands, evidence summary, blocked claims, and gate outcome for Commercial Readiness: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H29 | Claude: C29
- RP29.P09.M09 | Claude Review Packet | prepare architecture, security, missing-test, and go/no-go review packet for Commercial Readiness: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H29 | Claude: C29
- RP29.P09.M10 | Closeout And Next Handoff | close findings, update ledger, and define the next micro phase handoff for Commercial Readiness: Claude Cross Validation Closeout. | Commands: npm run validate, npm test, npm run build | Hermes: H29 | Claude: C29

