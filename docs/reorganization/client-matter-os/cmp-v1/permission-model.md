# CMP R4 Permission Model Baseline

Status: source-intake-baseline

## Mandatory Controls

- Fail closed when tenant, actor, permission context, or object ACL is missing.
- Deny overrides allow.
- Object ACL, ethical wall, legal hold, break-glass, and external projection rules are evaluated before data access.
- Search and AI retrieval must perform permission-before-search and permission-before-AI checks.
