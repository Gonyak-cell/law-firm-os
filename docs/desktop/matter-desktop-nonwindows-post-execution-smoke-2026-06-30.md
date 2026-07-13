# matter Desktop Non-Windows Post-Execution Smoke

Verdict: PASS

## Checks

| Check | Passed | Summary |
| --- | --- | --- |
| bridge-status | true | status=200, source_mode=matter_app_api |
| bridge-client-upsert | true | status=201, client_id_present=true |
| bridge-matter-upsert | true | status=201, matter_id_present=true |
| bridge-lookup | true | status=200, matches=1 |
| vault-document-write | true | written=1, max=10 |
| vault-document-visibility | true | status=200, visible=true |
| matter-client-vault-linked-state | true | client=true, matter=true, document_matter_match=true |
| rollback-target-identification | true | rollback_targets=1 |

## Boundary

- LCX-VLTUI bridge lookup/status checked: true
- Vault document visibility checked: true
- Matter/Client/Vault linked state checked: true
- Rollback target identification checked: true
- Public release: false
- External pilot distribution: false
- Windows Authenticode signing: false
