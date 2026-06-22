# mater Desktop Temporary Release Receipt

Status: internal-temporary-release-executed-with-artifacts
Date: 2026-06-22

This receipt records the current desktop-first temporary release execution. It does not claim public release, production go-live, owner approval, store distribution, external pilot distribution, or custom-domain readiness.

## Release Manifest

| Field | Value |
| --- | --- |
| Release ID | `mater-desktop-internal-0.1.0` |
| Manifest | `apps/desktop/dist/release/mater-desktop-internal-0.1.0/release-manifest.json` |
| Checksums | `apps/desktop/dist/release/mater-desktop-internal-0.1.0/checksums.sha256` |
| Channel | `internal` |
| Custom domain requirement | false |

## Domain Decision

Custom domain requirement: false.

The desktop app can be packaged and smoke-tested without a custom domain. Backend/API smoke uses the AWS-generated HTTPS endpoint recorded below until a real owned API domain is selected.

## Desktop Identity

| Field | Value |
| --- | --- |
| Product name | `mater` |
| Internal app ID | `com.amic.mater.desktop.internal` |
| Package | `@law-firm-os/desktop` |
| Publish config | `null` |
| Channel | `internal` |

## AWS Bootstrap Evidence

| Item | Result |
| --- | --- |
| AWS account | `770880870480` |
| Region | `ap-northeast-2` |
| `matter-staging-admin` | STS verified |
| `matter-prod-deploy-admin` | STS verified |
| `matter-cutover-operator` | STS verified |
| `matter-readonly-auditor` | STS verified |
| `matter-runtime-role` | Created with Lambda/ECS execution policies |
| AWS temporary runtime | API Gateway/Lambda active |
| Runtime base URL | `https://73o8hpqpgl.execute-api.ap-northeast-2.amazonaws.com/staging` |
| Operator-token protected runtime routes | true |
| Secret values printed | false |

## Domain Availability Preflight

| Candidate | Availability |
| --- | --- |
| `mater.law` | `UNAVAILABLE` |
| `materos.com` | `UNAVAILABLE` |
| `materlegal.com` | `AVAILABLE` |
| `materlegal.io` | `AVAILABLE` |
| `usemater.com` | `AVAILABLE` |

No domain was registered.

## Release Artifacts

| Artifact | Result |
| --- | --- |
| macOS app bundle | `apps/desktop/dist/mac/mater.app` |
| macOS executable SHA-256 | `c0bf182389ea930585e3b0bf5c4f16529461e02bf3be751cb364d0e25f2257e0` |
| macOS ZIP archive | `apps/desktop/dist/mac/mater-internal-0.1.0-macos.zip` |
| macOS DMG image | `apps/desktop/dist/mac/mater-internal-0.1.0-macos.dmg` |
| Windows internal manifest | `apps/desktop/dist/win/mater-internal-0.1.0-win-installer-manifest.json` |
| Windows manifest SHA-256 | `d320cffc7b404782d9ed81b06c972a2d7b307cfc953d6c92a4d0c8e5f76af063` |
| Windows detached signature | `apps/desktop/dist/win/mater-internal-0.1.0-win-installer-manifest.json.sig` |

## Verification Results

| Command | Result |
| --- | --- |
| `npm --workspace apps/desktop run test:smoke` | PASS |
| `npm --workspace apps/desktop run test:file-bridge` | PASS, bridge validators included |
| `npm run mater-desktop:aws-runtime:smoke` | PASS, `jwsuh@amic.kr` system-super-admin login allowed and general account admin smoke denied |
| `npm --workspace apps/desktop run build:mac` | PASS, `apps/desktop/dist/mac/mater.app` |
| `npm --workspace apps/desktop run build:win` | PASS, internal Windows manifest hash `d320cffc7b404782d9ed81b06c972a2d7b307cfc953d6c92a4d0c8e5f76af063` |
| `node scripts/validate-mater-desktop-security.mjs` | PASS |
| `node scripts/validate-mater-desktop-no-public-release-claim.mjs` | PASS |
| `npm run mater-desktop:temporary-release:validate` | PASS |
| `npm run matter-vault:r4:aws-env-plan:validate` | PASS |
| `npm run matter-vault:r4:local-secrets:validate` | PASS, secret_values_printed=false |

## Expected Holds

| Hold | State |
| --- | --- |
| Production customer data migration | not run |
| Route 53 hosted zones | empty |
| Custom API domain | not required for desktop temporary release |
| Windows native install smoke | not run on Darwin |
| macOS public notarization | not submitted |

## Non-Claims

- Public release: false
- Production go-live: false
- Owner approval: false
- App Store distribution: false
- Microsoft Store distribution: false
- External pilot distribution: false
- Custom-domain readiness: false
