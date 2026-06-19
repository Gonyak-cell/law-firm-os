# RP03 Audit And Compliance Kernel Architecture

Status: Proposed
Date: 2026-06-03
Owner: Codex
Hermes gate: H03
Claude Code gate: C03

## Context

RP03 is not a normal logging feature. It is the evidence ledger that later RP work depends on: permissions, DMS, billing, settlement, AI retrieval, data rooms, migrations, integrations, admin access, retention, and commercial compliance all need a reliable audit spine.

The design is strengthened from the original plan by treating audit records as append-only evidence with explicit retention, legal hold, privacy, chain verification, and export custody rules.

## Research Anchors

- NIST SP 800-53 Rev. 5 includes Audit and Accountability as a security control family.
- NIST SP 800-92 frames log management as an enterprise practice covering infrastructure, processes, and ongoing maintenance.
- OWASP Logging guidance emphasizes consistent application security logging and warns that application-level events are often missing or poorly configured.
- AWS S3 Object Lock and Azure Blob immutable storage both use WORM-style immutability concepts with retention and legal hold patterns.
- OpenTelemetry semantic conventions support consistent naming for traces, metrics, logs, profiles, and resources, which RP03 uses for trace correlation.
- AICPA Trust Services Criteria, CSA CCM, and future SOC 2 or ISMS-P readiness require evidence that controls exist, operate, and are reviewable.

## Decision

RP03 will be implemented as an append-only, tamper-evident audit and compliance kernel.

Every audit event is immutable after append. Corrections are represented as new correction events. Each event carries stable actor, action, object, outcome, permission, trace, payload classification, evidence reference, retention, and hash-chain metadata.

## Core Principles

1. Append-only by default: no update or delete path exists for audit events.
2. Correction by new event: incorrect events are superseded by a correction event that references the original.
3. Tenant isolation: every event is tenant-scoped and query-trimmed before display, export, analytics, or AI retrieval.
4. Matter trace where applicable: document, billing, settlement, portal, and AI events must keep Matter linkage when the workflow touches matter data.
5. Privacy by minimization: payloads store metadata, classifications, digests, and evidence references, not raw documents, secrets, credentials, or unnecessary personal data.
6. Tamper evidence: each tenant stream uses sequence numbers and hash chaining.
7. Retention and legal hold: purge cannot run unless retention expired, no legal hold exists, chain verification passed, and human approval is recorded.
8. Export custody: compliance exports include a manifest, query scope, chain verification result, and custody receipt.

## Event Model

Required event fields:

- event_id
- schema_version
- tenant_id
- occurred_at
- received_at
- sequence_number
- actor
- action
- object
- outcome
- decision
- reason_code
- source_service
- request_id
- trace_id
- span_id
- idempotency_key
- payload_classification
- payload_digest
- evidence_refs
- previous_event_hash
- event_hash
- hash_algorithm

Conditionally required fields:

- matter_id when the event touches matter, document, billing, settlement, AI retrieval, portal, or data room objects.
- document_version_id when the event touches document content, citations, OCR, renditions, data room files, or AI retrieval sources.
- permission_decision_id when the event records allow, deny, approval_required, review_required, or break_glass.
- retention_policy_id when the event changes retention, legal hold, deletion eligibility, purge, or compliance export retention.

## Actor And Object Taxonomy

Actors include user, client_user, external_counsel, system, integration, ai_agent, hermes, claude_code, human_reviewer, support_admin, and break_glass_admin.

Objects include Tenant, User, Role, Policy, Client, Matter, Document, DocumentVersion, FileObject, Email, Invoice, Payment, SettlementRun, AIJob, AIRetrievalSet, SecureLink, DataRoom, MigrationBatch, IntegrationConnection, PermissionDecision, AuditExport, RetentionPolicy, and LegalHold.

## Action Taxonomy

RP03 must reserve stable action names before dependent modules start:

- auth.login
- auth.logout
- document.view
- document.download
- document.upload
- document.version.create
- document.delete.request
- permission.evaluate
- permission.change
- billing.change
- payment.match
- settlement.run
- ai.retrieve
- ai.output.review
- share.create
- admin.break_glass
- admin.impersonation.start
- export.create
- retention.evaluate
- retention.purge.request
- legal_hold.apply
- legal_hold.release
- migration.import
- integration.sync
- audit.correction.append
- audit.chain.verify

## Tamper Evidence

Each tenant has an ordered audit stream. The append service assigns sequence_number and event_hash. The canonical event body includes tenant_id, sequence_number, previous_event_hash, actor, action, object, outcome, decision, payload_digest, evidence_refs, and received_at.

Chain verification detects:

- missing_sequence_number
- duplicate_sequence_number
- previous_hash_mismatch
- event_hash_mismatch
- clock_skew_out_of_policy
- orphaned_correction_event

Verification runs nightly, before compliance export, before retention purge, after migration import, and after incident review.

## Retention And Legal Hold

RP03 must support provider-neutral immutability while allowing S3 Object Lock, Azure version-level WORM, or a future archive provider.

Retention policy uses received_at as the retention clock. Legal hold overrides retention expiry. Purge is blocked unless retention has expired, no active legal hold exists, chain verification passes, export custody has been handled when required, and a human approval record exists.

Legal hold release requires permission decision, human reviewer, reason_code, audit event, Hermes H03 evidence row, and Claude C03 review when the release policy itself changed.

## Privacy And Payload Policy

Default payload mode is metadata_plus_digest.

Forbidden payloads:

- raw document body
- full email body
- secret
- credential
- payment card number
- bank account number
- access token
- private key

Evidence references should use document_id and version_id, file digest, redacted snippet reference, external archive object version, or compliance export receipt id.

## Query And Export Policy

Audit query is never raw table access. It must pass tenant boundary checks, permission trimming, object-level filtering, count-leak prevention, and export authorization.

Compliance export produces:

- export_id
- requester
- tenant_id
- query scope
- time range
- object filters
- chain verification result
- row count
- redaction policy
- manifest digest
- generated_at
- custody receipt

## Module Integration Rules

Dependent modules must emit RP03 events for:

- permission.change
- document.view
- document.download
- document.delete.request
- billing.change
- payment.match
- settlement.run
- ai.retrieve
- ai.output.review
- share.create
- admin.break_glass
- retention.purge.request
- legal_hold.release
- migration.import
- integration.sync

## Hermes H03

Hermes validates evidence and blocks claims, but it does not own product audit records. H03 should collect command results, changed files, fixture summaries, privacy scan summaries, chain verification summaries, retention/legal hold test summaries, permission trimming summaries, and blocked claims.

## Claude C03

Claude Code cross-validation should run at RP03.P00.M09, RP03.P03.M09, RP03.P06.M09, RP03.P07.M09, and RP03.P09.M00-M10.

Claude must specifically look for:

- editable or deletable audit events
- cross-tenant row, count, actor, or object leakage
- legal hold bypass
- retention purge bypass
- admin break-glass without evidence
- PII overlogging
- missing trace_id, span_id, or request_id
- weak chain verification
- export without custody receipt

## Phase Reinforcement

RP03.P00 must freeze this architecture and the audit-compliance contract.
RP03.P01 must model audit events, actors, objects, evidence refs, hash chain, retention policy, legal hold, admin access logs, and exports.
RP03.P02 must implement append, correction append, chain verification, retention evaluation, legal hold apply/release, privacy-safe query, admin access review, and export custody.
RP03.P03 must expose stable APIs and error semantics.
RP03.P04 must show audit timeline, chain verification, admin access, retention/legal hold, and compliance export states without leaking unauthorized rows or counts.
RP03.P05 must include tamper, gap, WORM, legal hold, AI access, and admin break-glass golden cases.
RP03.P06 must bind permission decisions and audit hints.
RP03.P07 must fail closed on missing actor, missing tenant, missing matter where required, chain gaps, payload policy violations, legal hold bypass, and cross-tenant query attempts.
RP03.P08 must attach Hermes H03 evidence.
RP03.P09 must require Claude C03 and human approval before the kernel is considered ready for dependent RP work.
