# LCX-WEB Runtime Flow Verification

Generated at: 2026-06-22T04:47:30.069Z

Overall result: PASS

Source of truth: `apps/web`

## Checks

| Check | URL | Expected text | Result | Notes |
| --- | --- | --- | --- | --- |
| desktop-home-command-center | `/?locale=en&view=home&desktop=1&data=live&ctx=allow` | matter command center | PASS | locale=en; overflow=false; cards=12 |
| clients-live | `/?locale=en&view=clients&data=live&ctx=allow` | Clients | PASS | locale=en; overflow=false; cards=0 |
| matters-live | `/?locale=en&view=matters&data=live&ctx=allow` | Matter Home | PASS | locale=en; overflow=false; cards=0 |
| vault-live | `/?locale=en&view=vault&data=live&ctx=allow` | Matter Vault | PASS | locale=en; overflow=false; cards=0 |
| portal-live | `/?locale=en&view=portal&data=live&ctx=allow` | External Access Boundary | PASS | locale=en; overflow=false; cards=0 |
| readiness-live | `/?locale=en&view=readiness&data=live&ctx=allow` | UI Runtime Boundary | PASS | locale=en; overflow=false; cards=0 |
| ops-live | `/?locale=en&view=ops&data=live&ctx=allow` | Enterprise Boundary | PASS | locale=en; overflow=false; cards=0 |
| intake-live | `/?locale=en&view=intake&data=live&ctx=allow` | Opportunity Pipeline | PASS | locale=en; overflow=false; cards=0 |
| finance-live | `/?locale=en&view=finance&data=live&ctx=allow` | Time Entries | PASS | locale=en; overflow=false; cards=0 |
| profiles-live | `/?locale=en&view=profiles&variant=userList&data=live&ctx=allow` | Matching Profiles | PASS | locale=en; overflow=false; cards=0 |
| people-live | `/?locale=en&view=people&data=live&ctx=allow` | People Runtime | PASS | locale=en; overflow=false; cards=0 |
| analytics-live | `/?locale=en&view=analytics&data=live&ctx=allow` | CMP-G8 Analytics Runtime | PASS | locale=en; overflow=false; cards=0 |
| ask-live | `/?locale=en&view=ask&data=live&ctx=allow` | CMP-G9 AI Review Queue | PASS | locale=en; overflow=false; cards=0 |
| admin | `/?locale=en&view=admin` | Organization Settings | PASS | locale=en; overflow=false; cards=0 |
| clients-denied | `/?locale=en&view=clients&data=live&ctx=denied` | Access denied | PASS | locale=en; overflow=false; cards=0 |
| clients-review | `/?locale=en&view=clients&data=live&ctx=review` | Review required | PASS | locale=en; overflow=false; cards=0 |
| matters-denied | `/?locale=en&view=matters&data=live&ctx=denied` | Access denied | PASS | locale=en; overflow=false; cards=0 |
| vault-denied | `/?locale=en&view=vault&data=live&ctx=denied` | Access denied | PASS | locale=en; overflow=false; cards=0 |

## Mobile Overflow

- scrollWidth: 390
- clientWidth: 390
- horizontalOverflow: false
- capabilityCards: 12

## Console Errors

Recorded for operator review. Denied/review flows may surface expected non-2xx network messages.

- Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. GET /api/ui/audit
- Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. GET /api/enterprise/audit
- Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. GET /api/ui/audit
- Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. GET /api/enterprise/audit
- Failed to load resource: the server responded with a status of 400 (Bad Request)
- Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. GET /api/ui/audit
- Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. GET /api/enterprise/audit
- Failed to load resource: the server responded with a status of 400 (Bad Request)
- Failed to load resource: the server responded with a status of 400 (Bad Request)
- Failed to load resource: the server responded with a status of 400 (Bad Request)
- Failed to load resource: the server responded with a status of 400 (Bad Request)
- Failed to load resource: the server responded with a status of 400 (Bad Request)
- Failed to load resource: the server responded with a status of 400 (Bad Request)
- Failed to load resource: the server responded with a status of 400 (Bad Request)
- Failed to load resource: the server responded with a status of 400 (Bad Request)
- Failed to load resource: the server responded with a status of 400 (Bad Request)
- Failed to load resource: the server responded with a status of 400 (Bad Request)
- Failed to load resource: the server responded with a status of 400 (Bad Request)
- Failed to load resource: the server responded with a status of 400 (Bad Request)
- Failed to load resource: the server responded with a status of 403 (Forbidden)
- Failed to load resource: the server responded with a status of 403 (Forbidden)
- Failed to load resource: the server responded with a status of 403 (Forbidden)
- Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. GET /api/ui/audit
- Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. GET /api/enterprise/audit
- Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. GET /api/ui/audit
- Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. GET /api/enterprise/audit
- Failed to load resource: the server responded with a status of 400 (Bad Request)
- Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. GET /api/ui/audit
- Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. GET /api/enterprise/audit
