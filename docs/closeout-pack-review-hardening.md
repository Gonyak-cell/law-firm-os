# Closeout Pack Claude Review Hardening

Status: active for CP00-178 and later.

This hardening imports Hermes-style deterministic review packet and receipt handling into Law Firm OS closeout packs. It does not embed Hermes runtime behavior in the product.

## Boundary

- Claude is a read-only independent reviewer.
- Claude is not final approval authority.
- Human/final approval and enterprise trust claims remain closed unless separately adjudicated.
- Failed auth, zero-byte stdout, malformed JSON, fenced JSON with prose, tool-call-shaped output, and missing required fields are invalid review evidence.
- A production-ready CP00 pack from CP00-178 onward must reference exactly one valid normalized review receipt.

## Flow

1. Generate a deterministic baseline:

   `npm run closeout-pack:review:baseline -- CP00-178`

2. Run readiness before any review attempt:

   `npm run closeout-pack:review:ready -- CP00-178`

3. Run the review through the Node runner:

   `npm run closeout-pack:review:run -- CP00-178`

4. Normalize raw output into a receipt:

   `npm run closeout-pack:review:normalize -- CP00-178`

5. Validate the receipt:

   `npm run closeout-pack:review:receipt:validate -- CP00-178`

6. Reference the receipt from the pack `claude-review-result.json`.

## Generated Baseline Files

Baseline artifacts live under `artifacts/closeout-pack-claude-review/<pack-id-lower>/`:

- `review-baseline.json`
- `review-packet.md`
- `review-request.json`
- `prompt.txt`
- `changed-file-scope.json`
- `validation-report.json`
- `review-schema.json`

The baseline prompt intentionally excludes full source and full diff. The only source inspection modes allowed are `read_tools_used` and `curated_excerpts_with_hashes`.

## Readiness Gate

Readiness fails before any review attempt when:

- Claude auth preflight fails.
- Prompt size exceeds 25 KB.
- Prompt contains full diff/source patterns.
- `--tools ""` is requested.
- Tools are anything other than `Read,Grep,Glob`.
- Bash, write/edit, connector mutation, API mutation, or direct file write tools are requested.
- Active untracked implementation files explicitly required by the active pack are omitted from the active pack scope.
- Review schema is missing.

Readiness failure is not a review attempt.

## Runner

The runner uses Node `spawnSync` with an args array. It does not use shell interpolation, `$(cat prompt.txt)`, or stdin prompt streaming. It writes raw stdout/stderr/status/signal metadata to `raw-output.json`; raw output is never accepted as review evidence until normalized.

## Receipt Normalization

The normalizer reads `raw-output.json` and emits `review-receipt.json`. The receipt records:

- `valid_review`
- `closeout_eligible`
- invalid reason, if any
- raw stdout/stderr byte counts
- Claude session, UUID, cost, permission denials
- parsed structured review

The receipt validator requires exactly one valid receipt in the pack review artifact directory.

## CP00 Validator Integration

`scripts/validate-closeout-pack.mjs` preserves historical CP175-CP177 evidence, but CP00-178 and later production-ready packs must include hardened receipt references:

- `review_receipt_ref`
- `valid_review_receipts` with exactly one entry
- `review_execution.runner = scripts/run-closeout-pack-claude-review.mjs`
- `review_execution.tools = Read,Grep,Glob`

This keeps invalid attempts visible without counting them as the one valid pack-level Claude review.
