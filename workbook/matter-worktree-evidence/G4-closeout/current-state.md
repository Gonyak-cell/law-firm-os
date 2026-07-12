# G4 current state

| Boundary | State |
|---|---|
| Worktree implementation | PASS |
| Current focused Worktree/domain/API/web/desktop tests | 143/143 PASS |
| Full repository regression | 4,247/4,247 PASS |
| Product UI regression | 28/28 PASS |
| Matter/Home browser integration | 22/22 PASS |
| 8-Matter fixture | PASS |
| Existing Task omissions | 0 |
| Practice-area misclassifications | 0 |
| API security/conflict | PASS |
| 300-node preparation | PASS, p95 0.57 ms |
| 300-node actual Chromium stable render | PASS, 63.17 ms, long tasks 0 |
| Restart persistence | PASS |
| Browser rendered E2E | PASS |
| 375/768/1024/1280 pixel QA | PASS, overflow 0px, keyboard 8/8 |
| Product-axis visibility | PASS, all six axes visible at 375/768/1024/1280px |
| Virtual unclassified branch | PASS, visible dashed treatment and `자동 분류` label |
| Search focus / fit view | PASS, visible focus ring; 300-node fit reduces to 11 top-level items with 634/634px containment |
| Practice selector typography | PASS, 송무·기업 자문·분쟁·트랜잭션 all 16px / 400 and equal width |
| Exact latest bundle static parity | PASS |
| Exact latest bundle live visual QA | PASS, app launch 2/2 and checked state restored |
| Exact packaged restart persistence | PASS, fresh local API port and MatterTask `done` restored |
| Exact package identity | PASS, app-content/renderer/ZIP/DMG SHA-256 recorded |
| Package evidence privacy | PASS, Worktree-only screenshot; credential, employee PII, and real-client flags false |
| Internal app/ZIP/DMG | CREATED |
| 43 canonical TUW commits | PASS, 43 IDs / 43 commits / 43 evidence directories |
| Canonical boundary audit | PASS, `scripts/validate-matter-worktree-commit-boundaries.mjs` |
| Runtime debugging audit | PASS, three hypotheses rejected with browser/package evidence |
| Post-canonical remediation | PASS through `2b4a2fd4d`, atomicity/API/editor/UI/typography/package evidence kept in separate follow-up commits |
| Practice-area owner | `jwsuh@amic.kr` for all four areas |
| Permission-rule owner | `jwsuh@amic.kr` |
| Legal-template approver | `jwsuh@amic.kr`; exact runtime identity match enforced |
| Actual legal-template approval | NOT PERFORMED; separate `approval_ref` still required |
| TUW implementation/test/evidence commit isolation | FAIL; retrospective audit found cross-TUW implementation leakage in canonical history |
| Current-tree evidence privacy | PASS; employee PII screenshots are absent from `HEAD` |
| Intended push history privacy | FAIL; deleted employee PII screenshots remain reachable in unpublished branch commits |
| Public release | FALSE |
| AWS production deployment | FALSE |

Source/test/render/package implementation coverage is 43/43, the canonical audit finds 43 unique TUW-labelled commits, and G0–G4 product behavior is closed. The original goal remains incomplete because the historical commits do not satisfy the stricter promise that each TUW commit contains only that TUW's implementation, failing test, green result, and evidence. Repairing that condition requires reconstructing the unpublished branch history or explicitly accepting the retrospective evidence/remediation model. A normal push is also prohibited until a sanitized release history excludes the deleted employee PII screenshots. No real legal template has left `draft`; public release and AWS deployment remain false.
