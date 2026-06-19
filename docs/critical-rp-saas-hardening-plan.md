# Critical RP SaaS Hardening Plan

Status: Proposed
Date: 2026-06-03
Scope: RP00, RP01, RP02, RP03, RP04, RP05, RP06, RP07, RP10, RP12, RP14, RP16, RP17, RP25, RP26, RP29

## Purpose

These 16 release programs are the ones that can make or break Law Firm OS as a commercial legal SaaS. They are not equal to ordinary feature work. They define product authority, tenant boundaries, domain identity, permissions, evidence, master data, matter control, documents, retrieval, intake risk, revenue integrity, settlement integrity, data governance, AI safety, migration safety, enterprise security, and production readiness.

This document strengthens the implementation plan with research-backed SaaS controls. The source of truth for the machine-checkable overlay is `contracts/critical-rp-saas-hardening-contract.json`.

## Research Baseline

The plan is aligned with these external control families:

- OWASP ASVS: application security verification across authentication, access control, validation, files, APIs, and configuration.
- OWASP API Security Top 10 2023: object-level authorization, object property authorization, authentication, resource consumption, and unsafe API consumption.
- NIST SSDF SP 800-218: secure development practices, security requirements, secure implementation, testing, response, and release evidence.
- NIST Cybersecurity Framework 2.0: govern, identify, protect, detect, respond, recover.
- NIST Privacy Framework and Korean PIPA resources: personal information lifecycle, minimization, privacy risk, and retention awareness.
- AICPA Trust Services Criteria: security, availability, processing integrity, confidentiality, and privacy.
- CSA Cloud Controls Matrix: cloud IAM, logging, data security, change management, and infrastructure controls.
- NIST AI RMF and OWASP LLM Top 10: AI risk governance, prompt injection, sensitive information disclosure, excessive agency, output handling, and model/retrieval control.
- PCI DSS: payment data boundary, tokenization, segmentation, and card-data handling.
- OpenTelemetry semantic conventions: consistent trace, log, metric, resource, and incident evidence.

## SaaS Controls Every Critical RP Must Carry

Every critical RP must define:

- tenant isolation
- object-level authorization
- deny-over-allow behavior
- matter-first traceability
- audit or evidence emission
- privacy minimization
- secure secret handling
- idempotency and replay protection
- retention and legal hold impact
- trace/log/metric observability
- synthetic fixtures only
- contract tests
- threat model
- rollback or recovery plan
- Hermes gate
- Claude Code cross-validation
- human approval

## Critical RP Groups

### Control And Domain Roots

RP00, RP01, RP02, RP03, RP04, and RP05 must be treated as the root layer. Later features should not invent parallel identity, permission, audit, party, or matter systems.

Implementation rule: no downstream RP can close if it creates a separate tenant, client, matter, permission, audit, or party model instead of referencing the root contracts.

### Legal Knowledge And Retrieval Roots

RP06 and RP07 must be treated as high-risk data access layers. DMS and search are where sensitive legal data most easily leaks.

Implementation rule: document access, search results, semantic retrieval, OCR, previews, downloads, and counts must use the same permission trimming and audit evidence path.

### Legal Risk And Finance Roots

RP10, RP12, and RP14 must be treated as processing-integrity layers. These workflows affect legal acceptance, client commitment, billing, tax, and partner compensation.

Implementation rule: conflict clearance, engagement issuance, invoice issue, write-off, tax export, settlement lock, and manual override must be versioned, approved, auditable, and replayable.

### Governance And AI Roots

RP16 and RP17 must be treated as policy enforcement layers. RP16 controls data governance; RP17 controls AI behavior.

Implementation rule: AI cannot bypass DLP, legal hold, permissions, matter scope, citation requirements, human review, or audit requirements.

### Adoption, Enterprise, And Release Roots

RP25, RP26, and RP29 must be treated as production-readiness layers. They decide whether real customers can safely onboard, operate, and trust the product.

Implementation rule: migration, SSO, MFA, SCIM, dedicated resources, observability, incident response, compliance evidence, release approval, and rollback must be verified before commercial launch.

## RP-by-RP Strengthening

### RP00 Product Constitution And AI Control Plane

Must define authority before implementation. AI can implement and propose, Hermes can validate, Claude Code can cross-review, and humans approve. No tool may silently become product authority.

Added gates: AI write boundary, harness boundary, cross-review boundary, release-claim evidence, blocked-claim register.

### RP01 Core Domain Foundation

Must lock Tenant, User, Role, Client, Matter, Document reference, and AuditEvent identity. All later modules reference these; they do not fork them.

Added gates: canonical IDs, ownership map, PII classification, matter-first invariant tests, tenant field required on persisted objects.

### RP02 Permission Kernel

Must be strong enough for DMS, search, AI, portal, billing, and admin flows. It needs object-level authorization, deny-over-allow, ethical wall, ACL, ABAC, and decision receipts.

Added gates: cross-tenant deny, object property authorization, search count suppression, AI retrieval trimming, audit hint emission.

### RP03 Audit And Compliance Kernel

Already strengthened as an append-only evidence root. It now has tamper-evident hash chain, WORM retention, legal hold, trace correlation, privacy-safe evidence, and export custody.

Added gates: no in-place mutation, correction event, hash-chain verification, legal hold purge block, permission-trimmed audit query.

### RP04 Master Data

Must prevent duplicate or conflicting party identity. Conflict, CRM, billing, settlement, and matter work all depend on stable parties and relationships.

Added gates: duplicate merge review, relationship direction, client group trimming, conflict aliases, privacy classification.

### RP05 Matter Core

Must be the operating center of the product. DMS, billing, settlement, portal, search, and AI should trace to Matter when applicable.

Added gates: client required, closed-matter lock, matter team audit, downstream matter_id, matter-level permission inheritance.

### RP06 DMS Core

Must be designed as a secure document system, not a file list. Versioning, file digests, object storage boundaries, locks, retention labels, previews, and download audits are mandatory.

Added gates: no version overwrite, object-level file authorization, download audit, legal hold support, content-type and malware-check planning.

### RP07 Search OCR And Index

Must be permission-trimmed by design. Search, OCR, semantic retrieval, and AI citations are sensitive data access paths.

Added gates: unauthorized hit removal, restricted-count suppression, OCR provenance, source-version citation, stale index state.

### RP10 Intake Conflict Engagement

Must protect the firm before the matter exists. Conflict hits, waiver, engagement letter, and fee terms require reviewable state.

Added gates: no engagement before clearance, no silent conflict dismissal, waiver approval, fee term versioning, pre-matter privacy scope.

### RP12 Billing And Invoicing

Must preserve processing integrity. Proforma, invoice, tax invoice, write-down, write-off, and billing entity must be controlled.

Added gates: issue lock, write-off approval, billing entity validation, tax export reconciliation, card-data boundary.

### RP14 Partner Settlement

Must be deterministic and replayable. Partner allocation and settlement have high dispute risk.

Added gates: allocation formula version, run preview, run lock, dispute block, replay equals stored totals, manual override audit.

### RP16 Governance DLP Retention

Must enforce data policy across DMS, search, AI, portal, integrations, and exports.

Added gates: DLP export block, legal hold overrides purge, break-glass time limit, policy change approval, incident traceability.

### RP17 AI Governance

Must control model policy, retrieval scope, citation, human review, and AI audit before AI workflows expand.

Added gates: prompt-injection tests, least-privilege tool scope, versioned citations, review-required output, sensitive information disclosure checks.

### RP25 Migration Platform

Must safely import real customer data without corrupting identity, permissions, documents, or evidence.

Added gates: dry run, source permission mapping, hash receipt, PII handling declaration, reconciliation and rollback.

### RP26 Enterprise SaaS Hardening

Must carry the enterprise trust layer: SSO, MFA, SCIM, resource isolation, key management, rate limiting, and security monitoring.

Added gates: no cross-route tenant resources, strong admin auth, SCIM deprovision, secret-safe operation, actionable security telemetry.

### RP29 Commercial Readiness

Must transform the codebase into a sellable SaaS. CI/CD, observability, incident response, compliance evidence, release approval, and rollback are mandatory.

Added gates: evidence-backed release, finding owner/severity, critical workflow telemetry, rollback plan, compliance claim mapping.

## Hermes And Claude Code Placement

Hermes should validate each critical RP at P08 and closeout checkpoints. Hermes records commands, evidence, changed files, blocked claims, synthetic fixture proof, and readiness verdicts.

Claude Code should cross-validate each critical RP at P09 and earlier security-heavy checkpoints. Claude should focus on architecture gaps, bypasses, missing tests, overbroad authority, and unsafe assumptions.

For the 16 critical RPs, Claude review is mandatory before the RP can be considered production-ready.

## Implementation Order Recommendation

1. RP00, RP01, RP02, RP03
2. RP04, RP05
3. RP06, RP07
4. RP10, RP12, RP14
5. RP16, RP17
6. RP25, RP26
7. RP29

This is not a feature preference. It is dependency order. The product becomes safer when the root control layers are built before high-risk data, AI, finance, migration, and commercial launch layers.
