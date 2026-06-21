# Cutover Runbook

Status: go_no_go_approved_pending_cutover_execution
Work package: LT-L8-W03
Prepared at: 2026-06-18T12:21:08Z
Review policy: review_waived_by_user

## Boundary

This runbook defines the Wave 1 cutover procedure. Final go-live approval is recorded
in `docs/launch/final-go-live-decision.md`, but this runbook does not
execute freeze, delta migration, production writes, company-wide rollout, or
48-hour monitoring. Closed CP evidence remains read-only.

## Step 1 - Change Freeze

Owner: Cutover coordinator
Preconditions: LT-L8-W02 G1-G10 evidence package ready; rollback criteria
approved; communication channel ready.
Required record fields: freeze timestamp, announcement channel, source systems,
owner, audit event reference.
Verification value: freeze declaration exists and all source systems are listed.
Abort condition: any source owner rejects freeze or critical G1-G10 evidence is
missing.

## Step 2 - Final Delta

Owner: Migration lead
Preconditions: freeze active, rollback point current, migration account approved.
Required record fields: batch id, source count, applied count, failed count,
retry/adjudication refs, audit event count.
Verification value: failed count is zero or every failure has a closed retry or
no-go disposition; applied count equals audit event count.
Abort condition: unadjudicated failure, audit mismatch, or rollback point absent.

## Step 3 - Integrity Verification

Owner: Data validation lead
Preconditions: final delta complete and no open migration failures.
Required record fields: count reconciliation, hash sample result, permission
sample result, sample basis, query/output refs.
Verification value: count, hash, and permission checks are green.
Abort condition: unexplained count delta, hash mismatch, or permission violation.

## Step 4 - System Health Check

Owner: System admin
Preconditions: integrity verification green.
Required record fields: API availability, audit chain verify, Graph integration,
backup status, timestamp, evidence refs.
Verification value: all four health dimensions are green.
Abort condition: any health dimension red or stale.

## Step 5 - Go/No-Go Meeting

Owner: Managing Partner plus System Admin, or owner-approved equivalent
Preconditions: final go-live approval is recorded, rollback criteria approved,
and health check green.
Required record fields: attendees, decision, G1-G9 table, open findings, owner
signatures, rejudgment schedule for no-go.
Verification value: decision is signed; no partial pass carryover is recorded.
Abort condition: missing required approver, unsigned decision, or unresolved
P0/P1 finding.

Recorded approval: `docs/launch/final-go-live-decision.md`.

## Step 6 - Company-Wide Opening

Owner: M365 admin and launch operator
Preconditions: go decision signed and G10 signoff recorded.
Required record fields: provisioning count, Add-in deployment capture, feature
opening order, disabled feature list, AI-off state, announcement/support refs.
Verification value: rollout follows Verification Edge order and all events are
audited.
Abort condition: G10 absent, unauthorized scope, Add-in deployment failure, or
ACL/audit failure.

## Step 7 - Forty-Eight Hour Watch

Owner: Operations lead
Preconditions: company-wide opening complete.
Required record fields: watch interval, dashboard capture, incident count,
S1 count, rollback trigger status, final decision.
Verification value: S1 count is zero, or rollback criteria are activated and
recorded.
Abort condition: S1 incident, untriaged critical alert, or monitoring gap.

## Tabletop Record

Status: blocked_not_performed

No tabletop exercise has been performed. Required future record fields are
participants, timestamp, discovered issues, disposition, and runbook revision
links. Until that record exists with open issue count zero, LT-L8-W03-T01 is
not closed.
