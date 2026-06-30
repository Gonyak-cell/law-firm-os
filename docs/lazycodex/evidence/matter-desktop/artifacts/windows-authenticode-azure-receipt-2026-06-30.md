# Windows Authenticode Azure Receipt

Status: trusted-signing-account-created-pending-identity-validation

Issue: https://github.com/Gonyak-cell/law-firm-os/issues/145

## Azure Resource

- Resource group: `amic-platform-rg`
- Location: `Korea Central`
- Provider: `Microsoft.CodeSigning`
- Provider registration: `Registered`
- Trusted Signing account: `lawosmattersigning`
- Account URI: `https://krc.codesigning.azure.net/`
- SKU: `Basic`
- Provisioning state: `Succeeded`

## Remaining Blocker

- Artifact Signing Identity Verifier role assigned: true
- Artifact Signing Certificate Profile Signer role assigned: true
- Certificate profile created: false
- Identity validation completed: false
- Signing execution allowed: false

## Boundary

- Windows Authenticode signing: false
- Windows native install smoke: not_run
- Public release: false
- Microsoft Store distribution: false
- External pilot distribution: false
