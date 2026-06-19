# Goal 1 Claude Code Review Plan

Status: Proposed
Date: 2026-06-03
Scope: RP00-RP03 foundation slice

## Purpose

Goal 1 should use Claude Code as a repeated cross-validator, not as a single final reviewer. The goal is to make RP00-RP03 safer before deep implementation work depends on them.

Claude Code reviews do not replace Hermes or human approval. Claude Code challenges design, security, domain correctness, test coverage, and evidence quality. Hermes records validation evidence. Human approval remains final authority for sensitive behavior.

## Review Density

Minimum review counts:

Minimum Claude Code review count for Goal 1:

- RP00: 8 checkpoints
- RP01: 10 checkpoints
- RP02: 12 checkpoints
- RP03: 12 checkpoints

Total minimum: 42 Claude Code review checkpoints.

## RP00 Reviews

Claude C00 should review:

- contract shell
- AI authority boundary
- Hermes attachment
- C00 design brief
- product interface
- permission and audit baseline
- Hermes dependency
- final RP00.P09 closeout

Main challenge questions:

- Is AI accidentally becoming product authority?
- Is Hermes accidentally becoming product code owner?
- Are human approval gates explicit?
- Are validation claims backed by evidence?

## RP01 Reviews

Claude C01 should review:

- core domain contract
- Tenant model
- User model
- Client/Matter model
- relationship map
- invariant service
- public interface
- golden cases and fixtures
- permission/audit integration
- final RP01.P09 closeout

Main challenge questions:

- Can any downstream module fork Tenant, Client, Matter, Permission, or Audit identity?
- Are Matter-first invariants enforceable by tests?
- Is DMS ownership kept separate from Matter references?
- Are PII fields classified early enough?

## RP02 Reviews

Claude C02 should review:

- permission model design
- precedence enum
- evaluator
- deny-over-allow behavior
- ethical wall behavior
- API and error contract
- bypass fixtures
- permission-audit matrix
- missing audit hints
- edge and fail-closed behavior
- Hermes dependency
- final RP02.P09 closeout

Main challenge questions:

- Can admin, partner, support, search, report, or AI retrieval bypass permissions?
- Can cross-tenant data leak through counts, snippets, object names, or errors?
- Does deny always beat allow?
- Do missing or ambiguous inputs fail closed?

## RP03 Reviews

Claude C03 should review:

- audit architecture design
- hash-chain model
- append-only service
- correction event flow
- hash-chain verification
- legal hold service
- interface and export
- tamper and WORM fixtures
- permission/audit completeness
- edge and fail-closed behavior
- Hermes dependency
- final RP03.P09 closeout

Main challenge questions:

- Can any audit event be edited or deleted in place?
- Can retention purge bypass legal hold?
- Can audit payloads overlog PII, secrets, raw document text, or credentials?
- Can hash-chain gaps, replay, duplicate sequence, and cross-tenant audit leaks be detected?

## Review Packet Template

Every Claude review packet must include:

- program_id
- checkpoint_id
- changed_files
- contracts_reviewed
- tests_reviewed
- Hermes evidence refs
- requirement refs
- risk focus
- Claude questions
- expected verdict format
- finding routing

Allowed verdicts:

- PASS
- PASS_WITH_FINDINGS
- BLOCK

Severity:

- P0_BLOCKER
- P1_MUST_FIX
- P2_SHOULD_FIX
- P3_NOTE

## Blocking Rules

P0 blocks the parent subphase and parent RP closeout.

P1 blocks production_ready until a correction subphase is created and verified.

PASS_WITH_FINDINGS is allowed only for P2/P3 findings with owner and target phase.

Missing Claude review packet is BLOCK for RP00-RP03 closeout.

Hermes H00-H03 evidence must record whether the matching Claude C00-C03 packet exists.

## Goal 1 Exit Rule

Goal 1 cannot be called complete unless:

- RP00-RP03 package/contracts/tests validate locally.
- Hermes H00-H03 hooks can point to command evidence.
- Claude C00-C03 review packets exist or are generated from this plan.
- No unresolved P0/P1 Claude findings remain.
- Weighted-ledger 준공검사 references still validate.
