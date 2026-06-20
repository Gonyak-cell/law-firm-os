# HRX-P15 AI Analytics B Plan

Status: In progress
PR lane: PR-10
Depends on: HRX-P14 AI Analytics A exit gate

## Scope

HRX-P15 connects the P14 AI governance primitives to a synthetic API-backed People experience. It adds a human review queue for risky AI outputs, tenant-scoped People analytics, HR workload projection reuse, and portal surfaces that consume API state only.

## TUW Mapping

| TUW | Artifact | Exit Evidence |
| --- | --- | --- |
| HRX-ENT-L7-W01-T06 | `packages/hrx/src/ai/review-queue.js`; `apps/api/src/routes/hrx/ai.js` | Blocked or high-risk AI responses create pending human review queue items through `/api/hrx/ai/assistant` |
| HRX-ENT-L7-W01-T07 | `packages/hrx/src/analytics.js` | Headcount, leave, turnover, and recruiting funnel metrics are tenant-scoped and omit row-level sensitive details |
| HRX-ENT-L7-W01-T08 | `packages/matter/src/hrx-workload-projection.js` | Matter workload projection aggregates by employee and omits client/matter details |
| HRX-ENT-L7-W01-T09 | `apps/web/src/people/analytics/HRAnalytics.tsx` | HR analytics panel fetches `/api/hrx/analytics` and renders no static fallback metrics |
| HRX-ENT-L7-W01-T10 | `apps/web/src/people/ai/HRAIAssistant.tsx` | HR AI assistant panel calls `/api/hrx/ai/assistant`, shows citations/review status, and exposes the review queue |

## Non-Goals

- No model provider, vector database, embeddings runtime, or autonomous AI execution.
- No final hire, fire, pay, or evaluation decisions.
- No raw prompt, raw answer, employee compensation, client, or Matter detail persistence in analytics or review queue rows.
- No production readiness claim; enterprise hardening begins in HRX-P16/P17.

## Verification

Focused:

- `node --test packages/hrx/test/ai-review-queue.test.js`
- `node --test packages/hrx/test/analytics.test.js`
- `node --test packages/matter/test/hrx-workload-projection.test.js`
- `node --test apps/api/test/hrx/ai.test.js`
- `npm run web:e2e -- hrx-analytics`
- `npm run web:e2e -- hrx-ai-assistant`

Broad:

- `node --test packages/hrx/test/*.test.js`
- `npm --workspace apps/api run test`
- `npm run web:e2e`
- `npm --workspace apps/web run test:ui`
- `npm --workspace apps/web run build`
- `npm run hrx:runtime:validate`
- `npm run rp30:hrx:validate`
- `npm run validate`
