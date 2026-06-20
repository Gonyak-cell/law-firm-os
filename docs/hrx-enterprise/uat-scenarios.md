# HRX UAT Scenarios

Status: PR-14 UAT scenario pack
Depends on: HRX PR-13 enterprise controls and PR-14 DR/UAT readiness validators

## Scope

These scenarios define the minimum synthetic UAT pack for the embedded People runtime. A scenario is passable only when the UI uses `/api/hrx/*`, tenant context is present, and no static fallback data is rendered.

## Scenarios

| Scenario | Surface | Evidence |
| --- | --- | --- |
| Employee overview | People home and employee list | `npm run web:e2e -- people-home employee-list` |
| Leave request | Leave balance and PTO submit flow | `npm run web:e2e -- leave-request` |
| HR document metadata | HR document workspace | `npm run web:e2e -- hr-documents` |
| Candidate status | Candidate portal | `npm run web:e2e -- candidate-portal` |
| Audit visibility | HRX audit viewer | `npm run web:e2e -- hrx-audit-viewer` |
| Analytics and AI review | HR analytics and AI assistant panels | `npm run web:e2e -- hrx-analytics hrx-ai-assistant` |

## No-Go Checks

- No scenario may rely on mock employee, candidate, document, analytics, or AI answer data.
- No scenario may expose raw HR document body, compensation amount, prompt text, answer body in audit metadata, client detail, or Matter detail.
- Any cross-tenant HRX API response other than fail-closed is a release blocker.
- Any final hire, fire, pay, or evaluation decision from AI is a release blocker.
