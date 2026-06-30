# matter Desktop Windows Authenticode Azure Receipt Validation

Generated at: 2026-06-30T02:15:08Z

Verdict: PASS

## Summary

- code_signing_provider_registered: true
- trusted_signing_account_created: true
- artifact_signing_identity_verifier_role_assigned: true
- artifact_signing_certificate_profile_signer_role_assigned: true
- certificate_profile_created: false
- identity_validation_completed: false
- signing_execution_allowed: false
- windows_authenticode_signing: false
- windows_native_install_smoke: not_run
- finding_count: 0

## Findings

No findings.

## Boundary

- This validation records Azure Trusted Signing account creation only.
- It does not claim certificate profile creation or identity validation completion.
- It does not allow signing execution.
- It does not claim Windows Authenticode signing or Windows native install smoke.
