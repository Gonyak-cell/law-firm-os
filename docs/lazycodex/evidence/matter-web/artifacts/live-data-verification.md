# LCX-WEB Live Data Verification

Generated at: 2026-06-22T04:47:22.819Z

Overall result: PASS

Preconditions: api and web dev server are already running. Live mode uses `?data=live`; unavailable, denied, review, and guarded states remain visible instead of falling back to hidden mocks.

## Checks

| Check | URL | Result | Detail |
| --- | --- | --- | --- |
| home-command-center-cards | `/?locale=en&view=home&desktop=1&data=live&ctx=allow` | PASS | {"capability_cards":12,"release_boundary_visible":true,"status_labels":["live","live","live","live","live","live","live","live","live","unavailable","live","live"]} |
| clients-live-or-unavailable | `/?locale=en&view=clients&data=live&ctx=allow` | PASS | {"denied":0,"review":0,"unavailable":0,"table_rows":1} |
| clients-denied-visible | `/?locale=en&view=clients&data=live&ctx=denied` | PASS | {"state_text":"Access denied The permission gate blocked this ClientGroup request. No client rows are shown."} |
| clients-review-visible | `/?locale=en&view=clients&data=live&ctx=review` | PASS | {"state_text":"Review required This ClientGroup request requires review before the client rows can be displayed."} |
| vault-denied-visible | `/?locale=en&view=vault&data=live&ctx=denied` | PASS | {"state_text":"Access denied Permission recheck denied this document workspace. No row counts, snippets, citations, or document metadata are shown."} |
| ops-release-boundary-visible | `/?locale=en&view=ops&data=live&ctx=allow` | PASS | {"go_no_go_visible":true,"blocked_boundary_visible":true} |

## Console messages of type error

Recorded for operator review. Denied/review flows may produce expected non-2xx network messages.

- Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. GET /api/ui/audit
- Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. GET /api/enterprise/audit
- Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. GET /api/ui/audit
- Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. GET /api/enterprise/audit
- Failed to load resource: the server responded with a status of 400 (Bad Request)
- Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. GET /api/ui/audit
- Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. GET /api/enterprise/audit
- Failed to load resource: the server responded with a status of 403 (Forbidden)
- Failed to load resource: the server responded with a status of 403 (Forbidden)
