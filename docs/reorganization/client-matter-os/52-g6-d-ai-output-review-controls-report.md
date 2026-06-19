# G6-D AI Output Review Controls Report

TUWs: `LFOS-G6-W10-T005` through `LFOS-G6-W10-T008`

Branch: `codex/lawos-g6-ai-output-review-controls`

Status: Proposed

## Summary

This slice does not claim G6 runtime readiness. G6-D adds synthetic-only
descriptor evidence for AIOutput candidate default state, Citation requirements,
HumanReview confirm/reject audit, AI disable switch behavior, and the AI output
review controls closeout.

No AI output, citation, human review queue, disable switch, audit event, AI
model call, database row, or product state is persisted by this slice.

## Scope

G6-D depends on the G6 Analytics AI Portal entry plan and G6-C AI
policy/retrieval/audit evidence. It covers candidate-only output state,
citation-required confirmation, human review audit, and dark-launch/disable switch controls while preserving AI Governance descriptor-only boundaries.

## Changed Files

| File | Purpose |
| --- | --- |
| `packages/ai-governance/src/client-matter-g6.js` | Adds G6-D descriptor factories for AIOutput, Citation, HumanReviewQueue, DisableSwitch, and closeout evidence. |
| `packages/ai-governance/test/client-matter-g6-ai-output-review-controls.test.js` | Covers candidate default state, citation-required confirm, confirm/reject audit, dark-launch off evidence, and no-runtime receipts. |
| `scripts/validate-client-matter-os-g6-d.mjs` | Validates the G6-D document, source, tests, package script, G6-C dependency, RP17 contract boundary, and descriptor behavior. |
| `docs/reorganization/client-matter-os/README.md` | Registers the G6-D report and validation command. |
| `package.json` | Exposes `client-matter:g6d:validate`. |

## TUW Evidence Map

| TUW | Evidence added | Runtime status |
| --- | --- | --- |
| `LFOS-G6-W10-T005` | `createAiGovernanceG6AIOutputDescriptor()` requires candidate default state and prompt/retrieval trace evidence. | Proposed |
| `LFOS-G6-W10-T006` | `createAiGovernanceG6CitationDescriptor()` requires citations before confirm and ACL/privilege inheritance evidence. | Proposed |
| `LFOS-G6-W10-T007` | `createAiGovernanceG6HumanReviewQueueDescriptor()` requires confirm/reject audit evidence and blocks direct final approval. | Proposed |
| `LFOS-G6-W10-T008` | `createAiGovernanceG6DisableSwitchDescriptor()` requires dark-launch off and AI disabled switch evidence. | Proposed |

## Required Negative Evidence

- Non-candidate AIOutput state, final-state request, missing PromptLog trace, or
  missing RetrievalRequest trace blocks AIOutput evidence.
- Missing citations before confirm, missing source spans, or missing ACL and
  privilege inheritance blocks Citation evidence.
- Missing confirm/reject audit receipts or direct final approval blocks
  HumanReview evidence.
- Dark launch enabled, AI not disabled, or runtime dispatch blocks disable
  switch evidence.
- Any AI Governance runtime dispatch, model policy runtime dispatch,
  retrieval-scope runtime dispatch, AI model runtime dispatch, audit write, or
  product-state write blocks G6-D evidence.

## Validation Commands

```sh
npm run client-matter:g6d:validate
npm --workspace @law-firm-os/ai-governance run test
npm run client-matter:g6c:validate
npm run client-matter:g6:plan:validate
npm run rp17:ai-governance-core:validate
npm run validate
npm test
```

## Boundary

- No AIOutput, Citation, HumanReviewQueue, DisableSwitch, audit event, or
  closeout record is persisted.
- No AI Governance, model policy, retrieval scope, AI model, permission, audit,
  or product runtime service is executed.
- No AI output is promoted to final legal approval.
- G6 runtime readiness remains open until stacked PRs are reviewed and G1
  through G5 evidence is accepted or explicitly stubbed behind fail-closed
  tests.
