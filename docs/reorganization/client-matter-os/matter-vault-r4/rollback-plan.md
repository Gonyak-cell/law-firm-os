# Matter-Vault Rollback Plan

Rollback must remove generated MatterVaultLink records, mark created VaultWorkspace records as rolled_back or remove them in test mode, preserve audit evidence, and never delete Vault-owned bytes outside an approved storage rollback.
