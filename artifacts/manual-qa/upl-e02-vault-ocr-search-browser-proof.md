# UPL-E-02 Vault OCR Sidecar Search Browser Proof

Generated at: 2026-07-03T09:21:03.655Z

Verdict: PASS

## Boundary

- No OCR runtime was executed in this proof.
- Caller-supplied OCR sidecar text is indexed for search only.
- Raw OCR/body text, storage pointers, session tokens, and permission-context headers are not written to this artifact.

## Checks

| Check | Result |
|---|---|
| unsigned-forged-permission-context-blocked | PASS |
| api-upload-created-sidecar-index | PASS |
| api-upload-does-not-claim-ocr-runtime | PASS |
| api-search-label-is-substring | PASS |
| api-ocr-keyword-hit | PASS |
| api-does-not-return-ocr-term | PASS |
| ui-search-rendered-hit | PASS |
| ui-match-field-ocr-visible | PASS |
| ui-does-not-render-ocr-term | PASS |
| ui-raw-text-flag-false | PASS |
| browser-search-uses-signed-session | PASS |
| browser-search-sends-no-permission-context | PASS |

Screenshot: artifacts/manual-qa/screenshots/upl-e02-vault-ocr-search-browser-proof.png
