# Goal Closeout Protocol

This protocol applies to every future Law Firm OS goal.

No goal is complete just because code was written. A goal closes only after this sequence:

1. Define the goal scope and expected artifacts.
2. Implement the product changes.
3. Run local product tests and validators.
4. Run the matching Hermes validation gate.
5. Run Claude Code review with `claude-opus-4-8` and effort `max`.
6. Adjudicate every Claude finding.
7. Run the goal construction inspection.
8. Re-run final validation.
9. Commit only after the previous gates pass.

## Required Gate Meaning

| Gate | Meaning |
| --- | --- |
| Hermes | Deterministic validation/evidence gate for the product repo. Hermes does not own product code. |
| Claude Code | Independent read-only cross-review. Required model: `claude-opus-4-8`. Required effort: `max`. |
| 준공검사 | Internal construction inspection for the goal scope. This means goal-ready, not whole-product SaaS completion. |
| Commit | Allowed only after Hermes, Claude, adjudication, and 준공검사 are complete. |

## Finding Handling

| Severity | Rule |
| --- | --- |
| P0_BLOCKER | Must fix and re-review before closeout. |
| P1_MUST_FIX | Must fix and re-review before closeout. |
| P2_SHOULD_FIX | Must fix or explicitly defer with owner, target RP/subphase, and rationale. |
| P3_NOTE | Must record or defer with owner and target phase. |

## Standard Folder

Each future goal should write evidence under:

```text
docs/goal-closeout/{goal_id}/
```

Expected files:

```text
packet.json
claude-review-result.json
adjudication.md
construction-inspection.json
command-evidence.json
```

## Commit Rule

The commit is the last step, not the proof. The proof is:

```text
local validation passed
+ Hermes gate passed
+ Claude Code review validated
+ P0/P1 cleared
+ P2 adjudicated
+ 준공검사 passed
```
