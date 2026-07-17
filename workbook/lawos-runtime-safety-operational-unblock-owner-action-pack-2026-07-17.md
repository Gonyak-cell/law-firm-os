# Law Firm OS runtime-safety 운영 차단 해소용 owner action pack

작성일: 2026-07-17 KST
상태: `OWNER_ACTION_REQUIRED`

## 결론

현재 남은 23개 TUW는 구현 누락이 아니라 의도적으로 닫힌 승인·환경 게이트다. 저장소 validator는 exact decision packet, 신뢰 레지스트리, Ed25519 detached signature, 별도 실행 지시, 직전 단계 receipt가 없으면 외부 접촉과 쓰기를 거부한다.

이 문서는 해당 게이트를 하나의 입력 묶음으로 정리한다. 이 문서와 JSON packet 자체는 승인 receipt가 아니며 provider, staging, production, release, AWS 배포, Windows signing 또는 go-live를 허가하지 않는다.

정확한 기계 판독본은 `workbook/lawos-runtime-safety-operational-unblock-owner-action-pack-2026-07-17.json`이다.

## 권장 owner 결정

| 결정 | 권장값 | 이유 |
| --- | --- | --- |
| Readiness authority | `approved` | UI/Enterprise readiness를 rebuild 가능한 projection으로 닫고 PRJ terminal을 진행한다. |
| Offline capability | `rejected` | 현재 fail-closed 동작을 유지하면서 OFF terminal을 최소 위험으로 닫는다. |
| Source-local cutover plan | `approved` | 실행 권한 없이 CUT-001 runbook dependency만 승인한다. |
| DMS provider authority | owner 선택 필요 | `s3`, `sharepoint`, `hybrid`의 책임 경계가 실제 운영·보존 정책을 바꾼다. |
| Staging acceptance | predecessor 완료 후 synthetic-only 승인 권장 | 실데이터 권한과 staging 실행을 분리한다. |
| Production authorization | staging·provider sandbox·backup/restore 완료까지 보류 | production 승인 전에 rollback과 DR 증거가 필요하다. |

## owner가 제공해야 하는 값

1. runtime-safety owner 신뢰 레지스트리 경로와 SHA-256
2. 여섯 decision packet 각각의 signed approval/rejection receipt와 `.sig`
3. DMS provider 선택 및 sandbox tenant reference
4. staging DB·tenant·credential reference, operator·observer·abort owner, 관찰 시간
5. AWS backup approval reference와 infrastructure mutation approval reference
6. production DB·credential reference, cutover window, rollback cutoff, PITR reference
7. Windows Authenticode provider·certificate fingerprint·Windows runner reference
8. release, AWS deploy, Windows signing, go-live 각각의 독립 approval reference

## 현재 preflight 결과

- AWS SSO를 2026-07-17T14:27Z에 갱신했고 `matter-prod-deploy-admin`, `matter-readonly-auditor`, `matter-cutover-operator`의 STS identity를 확인했다.
- backup bucket은 read-only preflight에서 versioning enabled, `alias/aws/s3` KMS, public access block을 확인했다. synthetic-only snapshot을 사용했고 AWS mutation은 0이다.
- production Lambda는 `Active`이며 관찰된 배포 commit은 `137fa156cdb6bb30bb3af72bf3e928ad7e6e4959`다. 이는 현재 runtime-safety candidate 배포 증거가 아니다.
- staging/prod RDS candidate는 각각 `amic-vault-staging-postgres`, `amic-vault-prod-postgres`이며 `available`·encrypted 상태다. 아직 runtime-safety 승인·credential에 bind되지 않았다.
- `LAWOS_STAGING_DATABASE_URL`, `LAWOS_PRODUCTION_DATABASE_URL`, DMS provider 선택, Windows certificate 입력은 현재 shell에 없다.
- non-Windows release gate validator는 통과했지만 `public_release_approved=false`, `windows_authenticode_signing_approved=false`를 유지한다.
- 로컬 `main`은 `origin/main`보다 51 commits 앞서 있으므로 exact-head CI와 release 이전에 remote publication 단계가 필요하다.

## 실행 순서

1. exact candidate를 remote에 게시하고 exact-head CI를 완료한다.
2. DMS, PRJ, OFF, CUT-001 owner receipt를 검증한다.
3. PRJ/OFF outcome과 CUT-002/003 dependency를 다시 materialize한다.
4. AWS SSO 갱신 후 backup/Lambda/staging을 read-only preflight한다.
5. 별도 staging 실행 지시로 CUT-005, CUT-006, CUT-007을 직렬 실행한다.
6. provider sandbox, off-device backup, isolated restore, rollback threshold를 검증한다.
7. production 승인 후 CUT-009부터 CUT-012까지 각각 별도 receipt로 실행한다.
8. release, AWS deploy, Windows signing, go-live를 서로 다른 승인·receipt로 실행한다.

## 검증

```bash
node scripts/validate-runtime-safety-operational-unblock-owner-action-pack.mjs
node --test scripts/test/runtime-safety-operational-unblock-owner-action-pack.test.mjs
```
