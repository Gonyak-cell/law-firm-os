# matter CloudFront No-Custom-Domain Decision

Status: accepted
Date: 2026-06-24
Decision ID: `MATTER-DESKTOP-DOMAIN-001`

## Decision

The `matter` internal desktop production path does not require a custom domain.

Internal users use the packaged `matter` desktop app, and the desktop runtime points to the AWS-generated CloudFront HTTPS endpoint:

```text
https://d2mthcc8vp3cr2.cloudfront.net
```

This CloudFront domain is the accepted production entrypoint for the internal desktop channel until a separate future owner decision explicitly introduces a public or external customer channel.

Because this channel is for company-internal users only and will be distributed as a packaged desktop app, a brand-name custom domain is not required. The product brand is carried by the desktop app name, package identity, and authenticated internal account experience, not by public DNS.

## Scope

This decision applies to:

- the `matter` Electron desktop app internal channel
- CloudFront web fallback access
- CloudFront-routed app APIs
- CloudFront-routed desktop auth/runtime APIs
- internal account email/password login
- AWS Lambda/API Gateway-backed runtime smoke and receipts

This decision does not apply to:

- public website launch
- external customer access
- App Store or Microsoft Store distribution
- enterprise trust certification
- real client data migration
- SEO, branded marketing, or public domain strategy
- brand-name custom domain strategy

## Operating Rule

Custom domain, Route 53 hosted zone, ACM certificate issuance, and owned DNS delegation are not launch gates for the internal desktop channel.

Any future custom domain work must be opened as a separate owner-approved program. It must not block internal desktop operation on the CloudFront endpoint.

## Current Entrypoints

| Surface | Entrypoint |
| --- | --- |
| CloudFront distribution | `E3MVAKX2DIR3CS` |
| Internal desktop/web base URL | `https://d2mthcc8vp3cr2.cloudfront.net` |
| Desktop runtime base URL | `MATTER_DESKTOP_RUNTIME_BASE_URL=https://d2mthcc8vp3cr2.cloudfront.net` |
| Matter Vault runtime base URL | `MATTER_VAULT_R4_PRODUCTION_BASE_URL=https://d2mthcc8vp3cr2.cloudfront.net` |
| App API behavior | `api*` |
| Desktop runtime behaviors | `health`, `api/desktop*`, `api/matter-vault*` |

## Evidence

| Evidence | Result |
| --- | --- |
| CloudFront invalidation | `IANB4MZ226ORR3LQ4QLRKJHLFI` completed |
| Lambda production runtime | `matter-lawos-api-prod` Active/Successful |
| Desktop runtime smoke | PASS against `https://d2mthcc8vp3cr2.cloudfront.net` |
| CloudFront browser smoke | PASS, 5 routes / 21 checks |
| Internal account count | 9 registered accounts |

## Non-Claims

- Public release: false
- External customer access: false
- Real client data production use: false
- Enterprise trust claim: false
- Custom domain required: false
- Brand-name custom domain required: false
- Custom domain readiness required: false
