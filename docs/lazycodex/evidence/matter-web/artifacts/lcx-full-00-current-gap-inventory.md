# LCX-FULL-00 Current Gap Inventory

Generated at: 2026-06-30T11:07:08.921Z

Verdict: PASS

## Counts

- Parent TUWs: 21
- Child TUWs: 110
- People total/active/setup/integration/audit: 71/15/35/11/10
- Conditional global items: 4
- Audit-required global sections: 2

## Routes

| Route | Path |
| --- | --- |
| home | ?view=home |
| client-billing | ?view=clients#client-billing |
| client-data | ?view=clients#client-data |
| client-import | ?view=clients#client-import |
| matter-vault | ?view=matters#matter-vault |
| matter-import | ?view=matters#matter-import |
| vault-documents | ?view=vault#vault-documents |
| people-work-schedule | ?view=people#people-work-schedule |
| calendar-decision | ?view=calendar#calendar-decision |
| settings-advanced | ?view=settings#settings-advanced |

## Boundary

- Inventory only; no feature writes are enabled.
- Public release, production go-live, owner approval, store distribution, and Windows Authenticode claims remain false.
- Baseline browser proof is referenced separately and must pass before PR-00 closes.
