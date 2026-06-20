# Client-Matter OS Module Boundary

Matter-Vault R4 keeps the existing CMP v1, G4 Matter, and G5 Vault/DMS boundaries intact.

| Module | Owns | May Reference | Must Not Own |
| --- | --- | --- | --- |
| Matter | matter, team, task, deadline, status, timeline projection | Vault workspace/link refs | document bytes, file object, email body |
| Vault/DMS | workspace, folder, document, version, file object, search index | matter_id, permission envelope | Matter status, task, deadline |
| Authz/Audit | permission decision, audit event, object ACL | Matter/Vault metadata | business object mutation |
| UI | presentation state and safe read models | Matter/Vault APIs | source-of-truth data |

This document is a boundary companion to the Matter-Vault R4 evidence pack and does not claim launch/go-live approval.
