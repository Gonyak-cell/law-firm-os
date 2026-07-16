# CTI Password Reset JWSUH Resend After Template Restoration

Status: PASS

Generated at: 2026-07-06T12:56:55.623Z

## Scope

- Target count: `1`
- Target domain: `amic.kr`
- Non-jwsuh reset email sent: no
- Token/password/secret/reset URL values logged or committed: no

## IAM Unblock

The first resend attempt reached SESv2 but failed with provider status `403`. The production Lambda role was missing raw email send permission after the reset email was restored to SESv2 Raw MIME.

- Role: `matter-lawos-api-prod-lambda-role`
- Policy: `matter-lawos-prod-password-reset-jwsuh-ses-raw-send`
- Actions: `ses:SendEmail`, `ses:SendRawEmail`
- Resource: `arn:aws:ses:ap-northeast-2:770880870480:identity/jwsuh@amic.kr`

## Live Send Result

- Lambda: `matter-lawos-api-prod`
- RevisionId: `5e69c5e9-4bbc-47aa-874e-efb7d13a3074`
- CodeSha256: `OSEbvPWpwREZROHtMdYjNCRZfn9ITl027L5zHvOR0bc=`
- HTTP status: `200`
- SESv2 delivery status: `sent`
- SES message id present: yes
- SES message id hash: `950ffcdb3edc553695efe9307192e4bb3be5d4baa63013359a6ff7d6077eb713`

No reset token, reset URL, password, secret value, production-ready claim, or go-live claim is recorded.
