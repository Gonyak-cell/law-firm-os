# HRX-P14 AI Analytics A Plan

Status: In progress
PR lane: PR-10
Depends on: HRX-P13 Portal API B exit gate

## Scope

HRX-P14 opens the first AI/analytics governance lane for the embedded People runtime. It does not add an assistant UI or model gateway yet; it creates the fail-closed source, retrieval, answer, decision, and audit primitives that later HR AI surfaces must use.

## TUW Mapping

| TUW | Artifact | Exit Evidence |
| --- | --- | --- |
| HRX-ENT-L7-W01-T01 | `packages/hrx/src/ai/source-registry.js` | Policy docs, HR docs, and cases are indexed by `source_ref`; raw bodies and alternate source ids are rejected |
| HRX-ENT-L7-W01-T02 | `packages/hrx/src/ai/rag.js` | Retrieval evaluates source permissions first and excludes denied refs before prompt context construction |
| HRX-ENT-L7-W01-T03 | `packages/hrx/src/ai/answer-schema.js` | Answers without citations/source ids return `insufficient_sources` |
| HRX-ENT-L7-W01-T04 | `packages/hrx/src/ai/decision-guard.js` | Hire, fire, pay, and evaluation final decisions are blocked and routed to human review |
| HRX-ENT-L7-W01-T05 | `packages/hrx/src/ai/audit.js` | AI prompt, retrieval, and output audit events store metadata only, with prompt/output hashes and no sensitive payload |

## Non-Goals

- No HR AI assistant API route or portal UI; those begin in HRX-P15.
- No embeddings service, vector database, model provider, or prompt execution runtime.
- No final employment, compensation, termination, or evaluation decision automation.
- No storage of raw HR document bodies, case text, prompts, answers, or model traces.

## Verification

Focused:

- `node --test packages/hrx/test/ai-source-registry.test.js`
- `node --test packages/hrx/test/ai-rag-authz.test.js`
- `node --test packages/hrx/test/ai-answer-schema.test.js`
- `node --test packages/hrx/test/ai-decision-guard.test.js`
- `node --test packages/hrx/test/ai-audit.test.js`

Broad:

- `node --test packages/hrx/test/*.test.js`
- `npm run hrx:runtime:validate`
- `npm run rp30:hrx:validate`
- `npm run validate`
