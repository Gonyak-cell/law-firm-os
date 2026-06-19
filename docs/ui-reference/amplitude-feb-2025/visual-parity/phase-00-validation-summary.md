# phase-00 Validation Summary

## Commands

| Command | Result | Evidence |
| --- | --- | --- |
| `npm --workspace apps/web run build` | PASS | Vite production build completed successfully. |
| `node scripts/generate-matter-amplitude-screenshot-state-registry.mjs` | PASS | 318 screenshot rows mapped to concrete matter route/state targets; 50 flow routes. |
| `node scripts/verify-matter-amplitude-screenshot-states.mjs` | PASS | 318 screenshot rows route-verified through 91 unique route/text checks; 0 console errors. |
| `node scripts/capture-matter-amplitude-parity.mjs` | PASS | 76 visual parity PNG artifacts generated in this folder, covering 75 route/state captures. |
| `node scripts/audit-matter-amplitude-pixel-parity.mjs` | PASS | 318 screenshot rows compared against 75 route captures after excluding the Mobbin attribution footer; mean similarity 0.9491; 311 `pixel_baseline_close`, 7 `layout_baseline_aligned`, 0 `needs_pixel_tuning`. |
| `node scripts/generate-matter-amplitude-coverage-ledger.mjs` | PASS | 318 coverage rows generated; 314 `representative_verified`, 4 `componentized_foundation`. |
| `node scripts/verify-matter-ui-flows.mjs` | PASS | 71 runtime route/state checks passed; no console errors; no mobile horizontal overflow. |
| `npm run validate` | PASS | Product contract validation passed: 9/9 modules, 9/9 principles, 7/7 invariants. |
| `npm test` | PASS | 1251 tests passed, 0 failed. |

## Scope Confirmed

- UI rebuild work stayed in `apps/web`, `apps/web/public/fonts`, `docs/ui-reference/amplitude-feb-2025`, and UI reference scripts.
- CP178 closeout-pack plan, contracts, and matter package internals were not modified by this pass.
- All 318 Amplitude screenshots are now covered by a screenshot-to-route/state registry and verified reachable matter UI state.
- All 318 screenshots now have a quantitative pixel audit; 311 rows are `pixel_baseline_close`, 7 rows are `layout_baseline_aligned`, and 0 rows remain in the `needs_pixel_tuning` queue.
- The current matter rebuild meets the full Amplitude screenshot-state coverage gate and the current low-resolution pixel-parity baseline.
