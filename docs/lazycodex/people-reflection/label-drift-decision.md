# LCX-PPL-01 Label Drift Decision

Date: 2026-06-24  
TUW: `LCX-PPL-01.01`

## Decision

The canonical Korean label for the `people-ai` section is:

```text
AI 검토
```

## Rationale

- `docs/hro-deel-parity/crosswalk-ledger.md` and
  `docs/hro-deel-parity/crosswalk-ledger.json` already use `AI 검토`.
- `docs/hro-deel-parity/people-ko-ui-implementation-plan.md` uses `AI 검토`
  for the `people-ai` section and binds it to `/api/hrx/ai/*`.
- `docs/hro-deel-parity/people-ko-ui-terminology-audit.md` explicitly marks
  `AI 검토` as a keepable product term.
- `npm run hro:deel-parity:validate` enforces exact label parity between the
  crosswalk and `apps/web/src/components/Shell.jsx`.

## Follow-up

Use `AI 검토` in visible People navigation and People overview copy. Do not
introduce `자동 검토` as a competing label for this section unless the crosswalk,
terminology audit, and validator are intentionally updated together.

