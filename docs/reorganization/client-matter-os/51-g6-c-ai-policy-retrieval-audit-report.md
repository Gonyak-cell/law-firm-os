# G6-C AI Policy Retrieval Audit Report

TUWs: `LFOS-G6-W10-T001` through `LFOS-G6-W10-T004`

Branch: `codex/lawos-g6-ai-policy-retrieval-audit`

Status: Proposed

## Summary

This slice does not claim G6 runtime readiness. G6-C adds synthetic-only
descriptor evidence for ModelPolicy, RetrievalRequest, permission-aware
retrieval, PromptLog, and the AI policy/retrieval/audit slice closeout.

No model policy, retrieval request, retrieved document, prompt log, audit
event, AI model call, DMS read, object-storage read, database row, or product
state is persisted by this slice.

## Scope

G6-C depends on the G6 Analytics AI Portal entry plan, G6-A Analytics read-model
foundation evidence, and G6-B Analytics dashboard/export closeout evidence. It
covers Matter sensitivity routing, Matter-required retrieval, unauthorized
document exclusion, and prompt audit evidence while preserving AI Governance descriptor-only boundaries.

## Changed Files

| File | Purpose |
| --- | --- |
| `packages/ai-governance/src/client-matter-g6.js` | Adds G6-C descriptor factories for ModelPolicy, RetrievalRequest, permission-aware retrieval, PromptLog, and closeout evidence. |
| `packages/ai-governance/src/index.js` | Exports the G6-C Client-Matter descriptors. |
| `packages/ai-governance/test/client-matter-g6-ai-policy-retrieval-audit.test.js` | Covers Matter sensitivity routing, Matter-required retrieval, unauthorized document exclusion, prompt audit, and no-runtime receipts. |
| `scripts/validate-client-matter-os-g6-c.mjs` | Validates the G6-C document, source, tests, package script, G6-B dependency, RP17 contract boundary, and descriptor behavior. |
| `docs/reorganization/client-matter-os/README.md` | Registers the G6-C report and validation command. |
| `package.json` | Exposes `client-matter:g6c:validate`. |

## TUW Evidence Map

| TUW | Evidence added | Runtime status |
| --- | --- | --- |
| `LFOS-G6-W10-T001` | `createAiGovernanceG6ModelPolicyDescriptor()` requires Matter sensitivity, privilege label, legal hold, dark-launch, and disable-switch routing evidence. | Proposed |
| `LFOS-G6-W10-T002` | `createAiGovernanceG6RetrievalRequestDescriptor()` requires Matter context and source references. | Proposed |
| `LFOS-G6-W10-T003` | `createAiGovernanceG6PermissionAwareRetrievalDescriptor()` requires ACL evidence and proves unauthorized documents are not retrieved. | Proposed |
| `LFOS-G6-W10-T004` | `createAiGovernanceG6PromptLogDescriptor()` requires prompt audit evidence without exposing raw prompt payloads. | Proposed |

## Required Negative Evidence

- Missing Matter sensitivity, privilege-label, legal-hold, dark-launch, or
  disable-switch routing blocks ModelPolicy evidence.
- Missing Matter context or source references blocks RetrievalRequest evidence.
- Missing ACL evidence, unauthorized retrieved documents, missing privilege
  label inheritance, cross-tenant documents, or cross-Matter documents block
  permission-aware retrieval evidence.
- Missing prompt hash, retrieval request linkage, created-at timestamp, raw
  prompt exposure, or persisted PromptLog claims block prompt audit evidence.
- Any AI Governance runtime dispatch, retrieval-scope runtime dispatch, AI
  model runtime dispatch, DMS runtime dispatch, object-storage read/write, or
  product-state write blocks G6-C evidence.

## Validation Commands

```sh
npm run client-matter:g6c:validate
npm --workspace @law-firm-os/ai-governance run test
npm run client-matter:g6b:validate
npm run client-matter:g6:plan:validate
npm run rp17:ai-governance-core:validate
npm run validate
npm test
```

## Boundary

- No ModelPolicy, RetrievalRequest, retrieved document, PromptLog, prompt
  payload, audit event, or closeout record is persisted.
- No AI Governance, model policy, retrieval scope, DMS, object storage, AI
  model, permission, audit, or product runtime service is executed.
- No raw prompt payload is exposed.
- G6 runtime readiness remains open until stacked PRs are reviewed and G1
  through G5 evidence is accepted or explicitly stubbed behind fail-closed
  tests.
