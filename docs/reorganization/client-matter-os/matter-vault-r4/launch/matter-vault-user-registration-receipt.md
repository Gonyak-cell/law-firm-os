# Matter-Vault User Registration Receipt

Status: registered-local-seed

Source workbook:
`/Users/jws/Projects/amic-matter-vault-users/연락처_아믹_페트라_2026.06.xlsx`

Source sheet: `연락처`

Source sha256: `cbb61404ac48363373716941e38d46ef96fc0dcda92c8bce9b7f4656e158a6f3`

Registered account count: 9

Registered accounts:
- `ytkim@amic.kr`
- `wsjo@amic.kr`
- `sypark@amic.kr`
- `bj.park@amic.kr`
- `yhlim@amic.kr`
- `jwsuh@amic.kr`
- `smcho@amic.kr`
- `tryoon@amic.kr`
- `yjlee@amic.kr`

Highest privilege account:
- email: `jwsuh@amic.kr`
- role: `system_super_admin`
- privilege rank: `1000`

Security boundary:
- production IDP account creation: false
- M365 or Graph user write: false
- passwords or real tokens included: false
- phone numbers imported: false
- local-dev synthetic tokens only: true

Verification:
- `npm run matter-vault:user-registration:validate`
- `node --test packages/runtime-auth/test/matter-vault-user-registration-seed.test.js`

Production handoff:
The seed is ready for controlled invite or IDP provisioning after operator approval. This receipt does not claim production account creation, production go-live, public release, or owner approval.
