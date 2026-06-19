# ADR-G0-002: GitHub Remote and Vault PR Flow

Status: Proposed
Date: 2026-06-19
Gate: `G0 Reorganization Gate`
TUW: `LFOS-G0-W00-T010`

## Context

The local historical Law Firm OS repository contains
`docs/weighted-implementation-ledger.json`, which exceeds GitHub's per-file
size limit. Rewriting that local history would be risky because the original
workspace also contains user-authored local changes and closeout evidence that
must not be reset or silently rewritten.

To preserve GitHub review while protecting the local historical repository, the
remote repository was initialized from a sanitized GitHub snapshot. The snapshot
keeps the current product contracts, packages, docs, scripts, and validation
surfaces needed for the Client-Matter OS transition while excluding the
oversized ledger from the remote history.

## Decision

Use the sanitized GitHub snapshot as the canonical remote PR surface for the
G0-G7 Client-Matter OS transition until a separate history-rewrite or artifact
storage decision is explicitly approved.

The local historical repository remains the local evidence and working context.
The sanitized snapshot remains the GitHub review and Vault-style PR context.

## Vault Flow

| Concern | Decision |
| --- | --- |
| Remote repository | `https://github.com/Gonyak-cell/law-firm-os` |
| Remote baseline | Sanitized snapshot with oversized ledger excluded |
| Branch naming | Isolated `codex/*` branches |
| PR state | Draft PRs until human review accepts the slice |
| Merge authority | No-self-merge from the agent side |
| Local history | No local history rewrite in this lane |
| Original workspace | Mirror only reviewed planning artifacts needed for continuity |
| Runtime claims | Planning-only until gate evidence proves runtime readiness |

## Required Operating Rules

1. Keep each slice on a narrow `codex/*` branch.
2. Base stacked G0 decision PRs on the preceding G0 decision branch when the
   validator depends on earlier decision artifacts.
3. Push branches to the sanitized GitHub remote for review.
4. Leave PRs as draft unless the user explicitly asks to ready them.
5. Do not merge PRs from the agent side.
6. Do not rewrite the local historical repository to solve the oversized ledger
   issue inside this transition lane.
7. Mirror generated planning artifacts back to the original workspace only when
   they are needed for local continuity and validation.

## Consequences

- GitHub PRs are reviewable without pushing the oversized historical ledger.
- The original workspace can remain dirty without losing user work.
- Later G1-G7 implementation slices can still use ordinary branch, push, and PR
  evidence.
- The sanitized remote is not proof that the historical local repository has
  been fully migrated to GitHub.
- A future storage decision may move the oversized ledger to Git LFS, release
  artifacts, or an external evidence store, but that is outside this G0 lane.

## Validation Requirements

Later transition PRs must preserve:

1. A named `codex/*` branch.
2. A draft PR or explicit user-approved ready PR.
3. Validation command output in the PR body or closeout artifact.
4. A no-self-merge boundary.
5. A clear distinction between sanitized remote evidence and local historical
   repository evidence.

## Status Boundary

This ADR is proposed by the G0 planning lane. It does not approve the sanitized
remote as a permanent repository governance model, does not rewrite local
history, and does not accept G0 by itself. Human review still needs to accept or
amend the decision before G0 closeout.
