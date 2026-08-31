# Wave-1 External Receipt Readiness

Status: PASS_EXTERNAL_RECEIPT_READINESS_LEDGER

This is a blocker/readiness receipt, not a Wave-1 completion claim.

## Current Matrix

- PASS: 64
- PARTIAL: 5
- BLOCKED: 1
- FAIL: 0

## External Blockers

### UPL-C-09 (BLOCKED)

Add-in manifest, taskpane shell, local browser proof, filing, attachment save, sent-mail task, code-side MSAL bridge, zero automatic Send interception, and explicit warning-only send review proof exist.

MSAL bridge initialized: true
MSAL bridge provider runtime executed: false
Automatic Send handler absent: true
Automatic Send event probe absent: true
Explicit send review warning proved: true
Provider runtime executed: false
External receipt intake: READY_NEEDS_OUTLOOK_EXTERNAL_RECEIPT
External receipt present: false

Required external receipts:
- Outlook web taskpane load and login smoke receipt
- new Outlook desktop taskpane load and login smoke receipt
- Entra app registration or admin-consent receipt
- provider runtime receipt proving M365/Graph execution
- sanitized external receipt JSON validated by scripts/validate-upl-c09-outlook-external-receipt.mjs

Strict PASS claimed: false

### UPL-B-13 (PARTIAL)

Local Korean business-income 3.3 percent withholding model passes, Popbill is selected, and local Popbill sandbox credentials/business number are staged without production issuance.

Prepared Popbill request hash present: true
3.3% withholding payload mapping present: true
Production tax invoice issued: false

Required external receipts:
- Popbill test certificate setup confirmation
- POPBILL_ALLOW_SANDBOX_ISSUE=1 operator approval in .env.popbill.local
- external tax-invoice issue roundtrip receipt id
- sanitized request/response hash proving no production tax issuance claim

Strict PASS claimed: false

## Closed Local Model Rows

- UPL-A-12: artifacts/manual-qa/upl-a12-local-model-gateway-proof.json (ollama/gemma4:12b)

## Commands

- UPL-C-09: node scripts/run-upl-c09-c12-outlook-addin-browser-proof.mjs && node scripts/validate-upl-c09-c12-outlook-addin.mjs
- UPL-B-13: node scripts/run-upl-b13-withholding-proof.mjs && node scripts/validate-upl-b13-withholding.mjs
- UPL-C-09 external receipt validator: node scripts/validate-upl-c09-outlook-external-receipt.mjs
