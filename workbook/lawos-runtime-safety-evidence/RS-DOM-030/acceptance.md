# RS-DOM terminal acceptance

- Terminal: `RS-DOM-030`
- Gate: `G8-DOM`
- Source SHA: `49768ead507457e03a9036d8720873c1e45ccf00`
- Verdict: `PASS`
- Allowed claim: `DOMAIN_ADAPTERS_SOURCE_VERIFIED`

## Accepted source behavior

1. 공통 PostgreSQL domain ledger는 tenant scope, 강제 RLS, version conflict, idempotency, append-only audit, reference, import, shadow, rehearsal 영수증을 하나의 계약으로 고정한다.
2. Master Data, Matter, CRM, Intake, HRX, Finance, Client Portal, AI Governance의 8개 domain adapter가 기존 file/runtime 계약을 보존하는 async PostgreSQL command 경로를 제공한다.
3. 최종 소스 SHA에서 모든 domain의 첫 import가 거부 0건으로 완료되고, 두 번째 import는 replay되며, shadow difference는 0이고 rehearsal은 `source_ready`이다.
4. Master Data source conflict, Matter idempotency/audit, CRM·Intake atomic rollback, HRX CAS/append-only, Finance money/append-only, Portal secret/revocation, AI raw-payload/human-review/citation 경계가 fail closed한다.
5. 정확한 SHA에서 VC-PG 10/10, Master Data 117/117, Matter 222/222, CRM·Intake 171/171, HRX 692/692, Finance 110/110, Portal·AI 226/226, 보안 검증 56·9개 파일, 147-TUW governance가 PASS했다.
6. Completeness validator unit 3/3, 실제 domain receipt capture 15/15, writer coverage 16/16, store-path preflight 5/5, 웹 build 1,719 modules가 PASS했다.

## Broad regression classification

최종 소스 SHA의 저장소 전체 테스트는 4,536/4,539 PASS였다. 3건은 기존 clean-worktree Popbill sandbox 영수증에 필요한 `.env.popbill.local` 부재 1건과 이를 관찰하는 Wave-1 연쇄 2건이다. 같은 실패군은 RS-DOM 변경 전부터 존재했으며, RS-DOM 소스 수정으로 숨기거나 완화하지 않았다. 테스트가 재생성한 14개 추적 수동-QA 산출물은 `apply_patch`로 소스 커밋과 정확히 같은 내용으로 복원했다.

## Boundary retained

이 acceptance는 로컬 소스와 disposable PostgreSQL에서 domain adapter의 구현·import·shadow·rehearsal이 검증되었다는 뜻만 가진다. PostgreSQL을 API operational authority로 활성화하지 않았고, staging 또는 production migration, 실제 고객 데이터 이전, provider/AWS 변경, release, tag, package 배포, Windows 서명, cutover 또는 go-live를 실행하지 않았다.

`EXT-PG-PROD`와 별도 외부 승인 gate는 계속 pending이다. `postgres_api_authority_active`, `production_migration_executed`, `production_ready`, `go_live`는 모두 false이다.
