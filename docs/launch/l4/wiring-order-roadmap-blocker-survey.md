# LT-L4-W02 Wiring Order Roadmap Blocker Survey

Work package: LT-L4-W02
Phase: L4
Gate binding: L4-EXIT
Survey timestamp: 2026-06-18T14:06:46Z

## Scope

LT-L4-W02 promotes `docs/ui-reference/contract-screen-map.md` Recommended
wiring order 0-5 into the official Wave 1 product UI transition roadmap,
extracts the P5 live-data pattern into a shared client template, converts
wiring steps 1-4 to live-data behavior, and records step 5 fixture retention
with gap ownership.

## Current Evidence

The source map exists and is internally countable:

- Recommended wiring steps present in `docs/ui-reference/contract-screen-map.md`: 0, 1, 2, 3, 4, 5.
- Gap rows present in the source Gaps table: 12.

The required W02 promotion artifacts are not present:

- `docs/product-ui/wiring-roadmap.md` is absent.
- `apps/web/src/data/liveClient.js` is absent.
- `apps/web/src/data/apiClient.js` still carries the P5-only live-mode client.
- `apps/web/src/data/apiClient.js` still sends `x-lawos-permission-context`.
- `apps/web/README.md` still documents live data as opt-in with `data=live`.
- `node scripts/verify-matter-live-data.mjs` currently fails because the local
  web server is not running on `127.0.0.1:5173`.

Predecessors are also not ready for a close claim:

- LT-L2-W02 is blocked on auth/runtime trust boundary work.
- LT-L2-W04 is blocked on Wave 1 bounded-context runtime.
- LT-L4-W01 is open with only IA drafts completed for selected screens.

## Blocking Conditions

| TUW | Required Result | Current State |
| --- | --- | --- |
| LT-L4-W02-T01 | Official wiring roadmap plus decision-register entry | blocked; roadmap absent and no owner decision record was created |
| LT-L4-W02-T02 | Shared live client with no client-side permission self-assertion | blocked; `liveClient.js` absent and `x-lawos-permission-context` remains |
| LT-L4-W02-T03 | Wiring steps 1-2 live by default | blocked by T02, LT-L2-W02, LT-L2-W04; README still says live mode is opt-in |
| LT-L4-W02-T04 | Wiring steps 3-4 live behavior verified | blocked by T03 and runtime dependencies |
| LT-L4-W02-T05 | Step 5 fixture-retention gap tracker plus standard evidence | blocked by missing T01-T04 outputs |

## Non-Claims

This survey does not create the official roadmap, does not make a launch
decision, does not remove the client-side permission-context header, does not
convert surfaces to live-by-default, does not run a passing live-data
verification, and does not satisfy L4-EXIT.
