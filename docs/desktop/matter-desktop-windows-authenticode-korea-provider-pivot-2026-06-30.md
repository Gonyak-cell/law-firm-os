# matter Desktop Windows Authenticode Korea Provider Pivot

Status: external-provider-required-for-korea-seoul

Issue: https://github.com/Gonyak-cell/law-firm-os/issues/145

## Decision

The target organization context is Korea/Seoul. Azure Trusted Signing / Artifact Signing Public identity validation is not the execution path for this lane because the Portal displayed:

`Artifact Signing is currently available to organizations in the USA, Canada, European Union & United Kingdom.`

The Windows Authenticode lane must pivot to a separate external provider that supports South Korea legal organization validation.

## Provider Procurement Review

| Provider | Source | State |
| --- | --- | --- |
| DigiCert | https://www.digicert.com/signing/code-signing-certificates | candidate requires procurement confirmation |
| GlobalSign | https://www.globalsign.com/en/code-signing-certificate | candidate requires procurement confirmation |
| Sectigo | https://www.sectigo.com/ssl-certificates-tls/code-signing | candidate requires procurement confirmation |
| SSL.com | https://www.ssl.com/certificates/code-signing/ | candidate requires procurement confirmation |

## Selection Criteria

- Supports South Korea legal organization validation.
- Supports Windows Authenticode signing.
- Provides certificate fingerprint or verification output without exposing private key material.
- Supports private key custody compatible with a Windows signing host or CI signing workflow.
- Can provide signed artifact verification evidence for `Get-AuthenticodeSignature` or equivalent.

## Required Next Steps

- Select a Windows Authenticode provider that supports South Korea organization validation.
- Prepare the legal identity packet: legal organization name, website, business identifier, address, requester, and validation emails.
- Procure OV or EV code signing certificate without committing secrets.
- Provide a Windows host or CI signing runner with approved key custody.
- Record sanitized signing command, certificate fingerprint, Authenticode verification output, and Windows native install smoke.

## Boundary

- Azure account created: true
- Azure Public identity validation viable for Korea/Seoul: false
- External provider required: true
- External provider selected: false
- Certificate procured: false
- Certificate fingerprint recorded: false
- Signing execution allowed: false
- Windows Authenticode signing: false
- Windows native install smoke: not_run
- Public release: false
- Microsoft Store distribution: false
- External pilot distribution: false
- Vault document writes: false
- Real client data migration: false
