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

## Portal Identity Validation Attempt

- Surface reached: `Azure Portal Artifact Signing Account > Identity validation > New identity > Public`
- Client type: `Organization`
- Identity type: `Public`
- Existing identity validations: none
- Result: form reached, not submitted
- Portal notice: `Artifact Signing is currently available to organizations in the USA, Canada, European Union & United Kingdom.`
- Submission blocker: accurate legal organization data, qualifying organization jurisdiction, business identifier, requester identity, and Microsoft terms acceptance are required.

## Required Next Steps

- Complete Azure Trusted Signing / Artifact Signing identity validation in Azure Portal with authorized legal organization data and obtain the identity validation ID.
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
- Portal identity validation form reached: true
- Portal identity validation request submitted: false
- Portal country scope warning observed: true
- Legal identity attestation required: true
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
