# UPL-E-01 Vault Body Search Browser Proof

Generated at: 2026-07-03T09:20:57.638Z

Verdict: PASS

## Boundary

- Search backend is a JSON substring search, not SQLite FTS5.
- Browser search uses a signed session and does not send the legacy permission-context header.
- Raw document body text, storage pointers, and session tokens are not written to this artifact.

## Checks

| Check | Result |
|---|---|
| unsigned-forged-permission-context-blocked | PASS |
| api-upload-created-index | PASS |
| api-search-label-is-substring | PASS |
| api-body-keyword-hit | PASS |
| api-does-not-return-body-term | PASS |
| ui-search-rendered-hit | PASS |
| ui-match-field-body-visible | PASS |
| ui-does-not-render-hidden-body-term | PASS |
| ui-raw-text-flag-false | PASS |
| browser-search-uses-signed-session | PASS |
| browser-search-sends-no-permission-context | PASS |

Screenshot: artifacts/manual-qa/screenshots/upl-e01-vault-fulltext-search-browser-proof.png
