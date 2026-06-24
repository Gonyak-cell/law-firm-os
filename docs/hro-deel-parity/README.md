# HRO-DEEL-PARITY

This package tracks the Deel web Jan 2026 People parity program for Law Firm OS.

Primary files:

- `docs/hro-deel-parity/crosswalk-ledger.json`
- `docs/hro-deel-parity/crosswalk-ledger.md`
- `docs/hro-deel-parity/screenshot-inventory.json`
- `docs/hro-deel-parity/screenshot-inventory.md`
- `docs/hro-deel-parity/backend-contract-registry.json`
- `docs/hro-deel-parity/backend-contract-register.md`
- `docs/hro-deel-parity/people-ko-ui-implementation-plan.md`
- `docs/hro-deel-parity/people-ko-ui-terminology-audit.md`
- `docs/hro-deel-parity/completion-audit.json`
- `docs/hro-deel-parity/completion-audit.md`
- `scripts/generate-hro-deel-screenshot-inventory.swift`
- `scripts/validate-hro-deel-parity-crosswalk.mjs`
- `docs/goal-closeout/hro-deel-parity/hro-l0-w01/command-evidence.json`

Execution rule:

1. Keep the goal as one program.
2. Move through WP/TUW order.
3. Surface already-backed HRX functions in UI.
4. Register backend-missing Deel functions as contracts before UI exposure.
5. Keep external-provider and owner-decision domains blocked until receipts exist.
6. Do not claim production approval or go-live from this package.

Contract register:

- `backend-contract-registry.json` is the machine-readable registry for Deel-visible People capabilities that lack backend contracts or require external owner decisions.
- `backend-contract-register.md` is the human-readable summary of those gates.

Screenshot inventory:

- `npm run hro:deel-parity:screenshot-inventory` regenerates OCR rows for every source screenshot.
- `screenshot-inventory.json` stores all 476 screenshot rows, matched feature ids, primary Law OS status and OCR text evidence.
