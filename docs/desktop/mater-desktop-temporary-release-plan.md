# mater Desktop Temporary Release Plan

Status: internal-temporary-release-started
Date: 2026-06-22

This plan starts the desktop-first temporary release path for `mater`. It does not require a custom web domain and does not claim public release, production go-live, store distribution, or owner approval.

## Release Identity

| Field | Value |
| --- | --- |
| Product name | `mater` |
| Internal app ID | `com.amic.mater.desktop.internal` |
| Package name | `@law-firm-os/desktop` |
| Artifact name | `mater-internal-${version}-${os}-${arch}.${ext}` |
| Channel | `internal` |
| Publish config | `null` |

## Domain Boundary

Desktop internal or temporary distribution does not require a custom API domain. The app can be packaged and smoke-tested as an internal build with the packaged renderer surface, AWS temporary execute-api runtime, route-only deep links, guarded file bridge, and internal update receipts.

If a backend URL is needed before a custom domain exists, use an AWS-generated HTTPS endpoint and mark it as temporary. Do not use `api.mater.example.com` unless that exact domain is owned and delegated.

## Started Evidence

| Area | Current State |
| --- | --- |
| App naming | `productName: mater` |
| Internal app ID | `com.amic.mater.desktop.internal` |
| Public publish channel | disabled with `publish: null` |
| macOS internal build script | `npm --workspace apps/desktop run build:mac` |
| Windows internal build manifest script | `npm --workspace apps/desktop run build:win` |
| AWS temporary runtime smoke | `npm run mater-desktop:aws-runtime:smoke` |
| File bridge security | `npm --workspace apps/desktop run test:file-bridge` |
| Desktop smoke tests | `npm --workspace apps/desktop run test:smoke` |
| Public release claim | false |
| Production go-live claim | false |
| Owner approval claim | false |

## Temporary Release Gate

Temporary internal release can be called started when:

| Gate | Required Evidence |
| --- | --- |
| Desktop tests | `npm --workspace apps/desktop run test:smoke` passes |
| File bridge tests | `npm --workspace apps/desktop run test:file-bridge` passes |
| AWS runtime login smoke | `npm run mater-desktop:aws-runtime:smoke` passes with `jwsuh@amic.kr` allowed and a general account denied for admin smoke |
| macOS internal artifact | `npm --workspace apps/desktop run build:mac` passes |
| Windows internal manifest | `npm --workspace apps/desktop run build:win` passes |
| No public release claim | `node scripts/validate-mater-desktop-no-public-release-claim.mjs` passes |
| Temporary release plan | `node scripts/validate-mater-desktop-temporary-release-plan.mjs` passes |
| Temporary release receipt | `docs/desktop/mater-desktop-temporary-release-receipt.md` records current command results and non-claims |
| Release bundle | `node scripts/release-mater-desktop-temporary.mjs` creates `apps/desktop/dist/release/mater-desktop-internal-0.1.0/release-manifest.json` |
| Release bundle validation | `node scripts/validate-mater-desktop-temporary-release-bundle.mjs` passes |

## Non-Claims

- Public release: false
- Production go-live: false
- Owner approval: false
- App Store distribution: false
- Microsoft Store distribution: false
- External pilot distribution: false
- Custom domain requirement: false
