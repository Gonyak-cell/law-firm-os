# matter Desktop Windows Authenticode Azure Receipt

Status: trusted-signing-account-created-pending-identity-validation

Issue: https://github.com/Gonyak-cell/law-firm-os/issues/145

## Azure Resource

| Field | Value |
| --- | --- |
| Subscription | `Azure subscription 1` |
| Tenant | `Default Directory` |
| Resource group | `amic-platform-rg` |
| Location | `Korea Central` |
| Provider | `Microsoft.CodeSigning` |
| Provider registration | `Registered` |
| Trusted Signing account | `lawosmattersigning` |
| Account URI | `https://krc.codesigning.azure.net/` |
| SKU | `Basic` |
| Provisioning state | `Succeeded` |

## Certificate Profile State

- Certificate profiles: none
- Attempted test profile: `matterdesktoptest`
- Result: blocked
- Error: `IdentityValidationId property value is invalid.`

## Account Role Assignments

- `Artifact Signing Identity Verifier`: assigned
- `Artifact Signing Certificate Profile Signer`: assigned

## Required Next Steps

- Complete Azure Trusted Signing / Artifact Signing identity validation in Azure Portal and obtain the identity validation ID.
- Create the certificate profile after identity validation approval.
- Bind signing access to a Windows runner or signing workflow.
- Run Authenticode signing and collect verification output.
- Run Windows native install smoke.

## Boundary

- Azure CLI installed: true
- Azure CLI logged in: true
- Code signing provider registered: true
- Trusted Signing account created: true
- Artifact Signing Identity Verifier role assigned: true
- Artifact Signing Certificate Profile Signer role assigned: true
- Certificate profile created: false
- Identity validation completed: false
- Signing execution allowed: false
- Windows Authenticode signing: false
- Windows native install smoke: not_run
- Public release: false
- Microsoft Store distribution: false
- External pilot distribution: false
- Vault document writes: false
- Real client data migration: false
