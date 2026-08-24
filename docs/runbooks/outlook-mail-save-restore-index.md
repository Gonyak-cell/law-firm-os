# Outlook Mail Save Recovery Checkpoint Index

Status: public_sanitized_index_only
Owner: LawOS operations owner
Frequency: as needed
Last updated: 2026-08-24

## Purpose

This document records the public, non-sensitive identity and operating boundary
of the Outlook mail-save recovery checkpoint. It is an index, not a deployment
artifact, credential backup, database backup, executable installer, or complete
restore package.

The detailed recovery archives and infrastructure evidence remain private and
must not be committed to this public repository or attached to a public GitHub
release.

## Public Checkpoint Identity

| Field | Value |
| --- | --- |
| Application checkpoint | `OUTLOOK-SAVE-20260824-03B93BFF` |
| Infrastructure companion checkpoint | `OUTLOOK-INFRA-CONNECTIONS-SAVE-20260824-01` |
| Git tag | `lawos-outlook-mail-save-stable-checkpoint-20260824-03b93bff` |
| Git commit | `03b93bff8bafcff8afee2fc463b80c5c0345d268` |
| Git tree | `16ebf2d9d5481c1683552c96cfc14b2eeedd2200` |
| Pull request | `#303` |
| Desktop product identity | `AMIC OS 0.1.29` internal package line |

The tag is annotated but is not claimed to be cryptographically immutable.
Verify the tag, commit, tree, and the private archive checksum together before
using the private recovery material.

## Known-Good Application Contract

The checkpoint records the application state in which:

- a selected Outlook message and requested attachments could be filed to the
  selected Matter;
- a visible saved or recovered filing receipt remained the primary result;
- generic unknown-readiness text and a generic retry control were hidden when
  they provided no actionable information; and
- real Microsoft confirmation, Outlook relaunch, authentication, Graph,
  provenance, Matter-selection, duplicate/idempotency, and busy-state failures
  remained actionable and fail-closed.

This is a narrow observed baseline. It is not evidence that every mailbox,
Matter, tenant assignment, desktop installation, or future message will pass.

## Archive Classification

| Material | Allowed location | Public GitHub |
| --- | --- | --- |
| This sanitized index | Version-controlled documentation | Allowed |
| Public Git tag, commit, and tree identifiers | Version-controlled documentation | Allowed |
| Detailed restore runbook and redacted manifests | Access-controlled private archive | Not allowed |
| Lambda packages and static object bodies | Client-side encrypted private storage | Not allowed |
| Environment values, secrets, tokens, user sessions, mail, Vault data, or database rows | Not captured in this checkpoint | Never allowed |
| Internal desktop installers | Approved private artifact storage | Not allowed as a public release |

Never commit private checkpoint archives, Lambda ZIP files, static object
bodies, raw infrastructure exports, local absolute paths, operational resource
identifiers, credentials, tokens, customer data, Matter data, message content,
or security-hardening gaps to this repository.

## Prerequisites

- [ ] The operator has authorized access to the private companion archive.
- [ ] The private archive checksum and internal checksums pass.
- [ ] The current environment has been captured in a new read-only snapshot.
- [ ] The requested restore surface is named explicitly.
- [ ] Database, stored mail, Vault documents, audit records, secrets, and user
      sessions remain outside the restore scope.
- [ ] Any Microsoft tenant or user reauthentication step remains human-owned.

## Restore Procedure

### Step 1: Compare Before Changing Anything

Compare the current source, deployed code identity, static object identity,
edge routing, and Outlook connection contract with the private checkpoint.

**Expected result:** A component-by-component `same`, `drift`, or `unknown`
report with no production write.

**If it fails:** Stop. Do not begin a restore until the comparison and current
rollback capture are complete.

### Step 2: Capture the Current Rollback State

Create a new protected pre-restore snapshot of every component that might be
changed. Current code packages, object bodies, metadata, edge configuration,
and concurrency guards must be captured before the first write.

**Expected result:** The attempted restore can be reversed to the state that
existed immediately before the attempt.

**If it fails:** Stop. Historical checkpoint identifiers are not a substitute
for a current rollback capture.

### Step 3: Approve One Minimal Restore Surface

Restore only one reviewed surface at a time. Examples include application
source, one code package, one static namespace, or one edge configuration
change. Do not treat the checkpoint as authorization to rewind every system.

**Expected result:** The approved delta is explicit and unrelated systems are
unchanged.

**If it fails:** Return to comparison. Do not broaden the change ad hoc.

### Step 4: Use Fresh Concurrency Guards

Historical revision and entity-tag values are comparison evidence only. Query
the current guard immediately before an approved write and require that fresh
value as the write precondition.

**Expected result:** Concurrent or later changes cause the write to fail closed
instead of being overwritten.

**If it fails:** Re-snapshot and reconcile the drift. Do not force the write.

### Step 5: Verify Read-Only First

After an approved restore, verify code and object readback, public health,
static asset identity, and the existing Outlook receipt in a read-only flow.
Do not save a new message during this verification.

**Expected result:** The restored component matches its approved target and no
new failure signal appears.

**If it fails:** Perform one rollback to the pre-restore snapshot and stop.
Do not make speculative repeated attempts.

### Step 6: Authorize Any Write Canary Separately

A new Outlook filing can create database, document, Vault, and audit state. It
requires a separately approved test message, Matter, evidence plan, and owner
confirmation.

**Expected result:** A write canary is distinguishable from read-only recovery
verification.

**If it fails:** Preserve evidence and follow the incident path; do not delete
mail, documents, or audit records to make the result appear clean.

## Verification

- [ ] Tag, commit, and tree match the public checkpoint identity.
- [ ] Private outer and internal checksums pass.
- [ ] A fresh pre-restore snapshot exists.
- [ ] Only the approved component changed.
- [ ] Fresh concurrency guards were used.
- [ ] Configuration, authorization, and data boundaries did not drift.
- [ ] Public and Outlook read-only verification passed.
- [ ] No database row, stored mail, Vault document, audit record, secret, or
      user session was rewound or deleted.

## Troubleshooting

| Symptom | Likely cause | Required response |
| --- | --- | --- |
| Current revision or entity tag differs | A later or concurrent change exists | Stop, capture the current state, and review the difference. |
| Health passes but Outlook does not | Health is not the complete Outlook readiness chain | Inspect the embedded client, authentication, installation evidence, and tenant assignment separately. |
| Office SSO reports configured but a user cannot sign in | User or tenant authentication state is not restorable from the checkpoint | Require human reauthentication; never copy tokens or passwords. |
| Private archive checksum fails | Corrupted or incomplete recovery material | Quarantine the bundle and do not use it. |
| A read-only verification fails after restore | Restore target or environment is not known-good | Roll back once to the pre-restore snapshot and stop. |

## Rollback

The pre-restore snapshot created immediately before an attempted change is the
only immediate rollback target. Roll back the changed component with a new
current concurrency guard, verify readback, and stop after the first failed
recovery gate.

Never use destructive source resets, database rewinds, unconditional object
overwrites, force pushes, or deletion of mail, Vault documents, or audit
records as recovery shortcuts.

## Related Public Runbooks

- [Rollback Runbook](../launch/runbooks/rollback-runbook.md)
- [Change Management](../launch/runbooks/change-management.md)

## History

| Date | Actor | Notes |
| --- | --- | --- |
| 2026-08-24 | Codex and user-owned validation | Recorded the sanitized public checkpoint index. Private restore material remained outside GitHub. |
