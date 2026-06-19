# P5 Live Data Verification

Generated at: 2026-06-10T13:16:32.245Z

Overall result: PASS

Preconditions: api (`node apps/api/src/server.js`) and web dev server (`npm --workspace apps/web run dev`) already running. Live mode is opt-in via `?data=live` (+ optional `&ctx=allow|denied|review`); mock rendering is the untouched default.

## Checks

| Check | URL | Result | Detail |
| --- | --- | --- | --- |
| live-allow-table | `/?locale=en&view=profiles&variant=userList&data=live` | PASS | {"columns":["Name","Type","Status","Owner","Matter"],"columns_match_live_set":true,"row_count":7,"rows_containing_amic_synthetic_client":2} |
| live-denied-state | `/?locale=en&view=profiles&variant=userList&data=live&ctx=denied` | PASS | {"state_text":"Access denied The permission gate blocked this request. No records are shown.","table_count":0} |
| live-review-state | `/?locale=en&view=profiles&variant=userList&data=live&ctx=review` | PASS | {"state_text":"Review required This request needs an approval review before records can be shown.","table_count":0} |
| mock-route-unchanged | `/?locale=en&view=profiles&variant=userList` | PASS | {"columns":["User","ID","First Seen","Location","Country","Sessions"],"columns_match_mock_set":true,"row_count":5,"live_state_element_count":0} |

## Console messages of type error (recorded, not gated — denied/review checks expect non-2xx responses)

- Failed to load resource: the server responded with a status of 403 (Forbidden)
