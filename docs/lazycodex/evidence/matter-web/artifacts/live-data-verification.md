# LCX-WEB Live Data Verification

Generated at: 2026-06-22T07:17:58.319Z

Overall result: PASS

Preconditions: api and web dev server are already running. Live mode uses `?data=live`; unavailable, denied, review, and guarded states remain visible instead of falling back to hidden local data.

## Checks

| Check | URL | Result | Detail |
| --- | --- | --- | --- |
| home-command-center-cards | `/?locale=en&view=home&desktop=1&data=live&ctx=allow` | PASS | {"capability_cards":4,"release_boundary_visible":true,"status_labels":["live","live","unavailable","live"]} |
| clients-live-or-unavailable | `/?locale=en&view=clients&data=live&ctx=allow` | PASS | {"denied":0,"review":0,"unavailable":0,"empty":1,"table_rows":0} |
| clients-denied-visible | `/?locale=en&view=clients&data=live&ctx=denied` | PASS | {"state_text":"Access denied The permission gate blocked this ClientGroup request. No client rows are shown."} |
| clients-review-visible | `/?locale=en&view=clients&data=live&ctx=review` | PASS | {"state_text":"Review required This ClientGroup request requires review before the client rows can be displayed."} |
| vault-denied-visible | `/?locale=en&view=vault&data=live&ctx=denied` | PASS | {"state_text":"Access denied Permission recheck denied this document workspace. No row counts, snippets, citations, or document metadata are shown."} |
| home-release-boundary-visible | `/?locale=en&view=home&data=live&ctx=allow` | PASS | {"production_go_live_false_visible":true} |

## Console messages of type error

Recorded for operator review. Denied/review flows may produce expected non-2xx network messages.

- Failed to load resource: the server responded with a status of 400 (Bad Request)
- Failed to load resource: the server responded with a status of 403 (Forbidden)
- Failed to load resource: the server responded with a status of 403 (Forbidden)
- Failed to load resource: the server responded with a status of 400 (Bad Request)
