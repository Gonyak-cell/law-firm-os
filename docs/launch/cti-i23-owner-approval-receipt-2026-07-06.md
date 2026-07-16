# CTI I23 Owner Approval Receipt

Approval signature ref: `I23-CTI-PASSWORD-RESET-EMAIL-DELIVERY-STORE-OWNER-APPROVAL-2026-07-06`

Recorded at: `2026-07-06T11:48:46Z`

Approved for `cti-password-reset-remediation-execute`:

- `LAWOS_AUTH_PASSWORD_RESET_STORE_PATH=/mnt/lawos/auth/password-reset-store.json`
- `LAWOS_AUTH_PASSWORD_RESET_EMAIL_DELIVERY=sesv2`
- `LAWOS_AUTH_PASSWORD_RESET_EMAIL_FROM=jwsuh@amic.kr`
- `LAWOS_AUTH_PASSWORD_RESET_EMAIL_FROM_NAME=Matter OS`
- `LAWOS_AUTH_PASSWORD_RESET_BASE_URL=matter://password-reset/confirm`
- Lambda IAM `ses:SendEmail` scoped to `arn:aws:ses:ap-northeast-2:770880870480:identity/jwsuh@amic.kr`
- Lambda env mutation and password reset route code deploy
- 9 production user reset request/send hash-count receipt
- QA disabled reset/login rejection, one-time confirm, reuse rejection, and invalid token rejection validation

Boundary: this receipt records approval only. It does not deploy code, mutate Lambda env/IAM, mutate production credentials, send reset emails, claim production-ready, or claim go-live.
