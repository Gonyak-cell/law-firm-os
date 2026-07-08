# CTI S1 FOUNDATION Unblock Packet

Status: `OWNER_APPROVED_FOR_S1_EXECUTE`

Goal: `cti-s1-foundation-unblock-packet`

Source plan: `workbook/canonical-tenant-data-injection-execution-plan-2026-07-06.md` Stage 1

Required approval ref: `I5-CTI-S1-FOUNDATION-UNBLOCK-PACKET-OWNER-APPROVAL-2026-07-06`

This packet fixes the S1 blocker decisions without running S1 execution. It selects the durable store target, audit store path, session secret injection path, and real-data-safe restore boundary required before `cti-s1-foundation` can be retried.

## Authority Boundary

| Boundary | State |
| --- | --- |
| EFS creation | not executed |
| Lambda VPC/EFS/env mutation | not executed |
| Secret value fetch | not executed |
| Production store migration | not executed |
| Restore rehearsal execution | not executed |
| S2-S6, CUTOVER, password issuance, OIDC, DB conversion | out of scope |
| Production-ready or go-live claim | false |

## Owner Approval Unit

| Field | Value |
| --- | --- |
| approval_ref | `I5-CTI-S1-FOUNDATION-UNBLOCK-PACKET-OWNER-APPROVAL-2026-07-06` |
| approver_role | Owner / Managing Partner |
| approval_scope | S1 FOUNDATION unblock target choices only |
| approval_does_not_authorize | EFS creation, Lambda config mutation, secret value retrieval, production store migration, restore execution, CUTOVER, password issuance, production_ready, go-live |
| required_before | Any S1 execute goal or production infra/write command |
| signature_status | approved |
| approval_signature_ref | `I5-CTI-S1-FOUNDATION-UNBLOCK-PACKET-OWNER-APPROVAL-2026-07-06` |
| approval_recorded_at | 2026-07-06 |

## Selected Durable Store Target

| Item | Selected Value |
| --- | --- |
| target_type | AWS EFS access point mounted to Matter production Lambda |
| AWS account | `770880870480` |
| region | `ap-northeast-2` |
| VPC | `vpc-038f70d924a774bea` (`amic-vault-prod-vpc`, `10.84.0.0/16`) |
| mount target subnets | `subnet-0a718a221e621715f` (`ap-northeast-2a`, `10.84.1.0/24`), `subnet-0af415c198603de77` (`ap-northeast-2b`, `10.84.2.0/24`) |
| Lambda security group to create | `matter-lawos-prod-lambda-sg` |
| EFS security group to create | `matter-lawos-prod-efs-sg` |
| EFS SG inbound rule | TCP 2049 from `matter-lawos-prod-lambda-sg` only |
| Lambda SG egress rule | TCP 2049 to `matter-lawos-prod-efs-sg`; no broad inbound rule |
| EFS file system name | `matter-lawos-prod-cti-s1-efs` |
| EFS encryption | enabled |
| EFS backup policy | enabled before migration |
| access point name | `matter-lawos-prod-runtime-ap` |
| access point root | `/lawos-runtime` |
| POSIX owner | uid `1000`, gid `1000` |
| root permissions | `0750` |
| Lambda mount path | `/mnt/lawos` |

Note: existing prod subnets are public according to S1 inventory. The approved S1 execute goal must either use these existing subnets with Lambda public IP disabled and locked SG rules, or replace them with owner-approved private subnets before mutation. This packet does not create subnets.

## STORE_PATH Mapping

| Env | Durable Path |
| --- | --- |
| `LAWOS_HRX_STORE_PATH` | `/mnt/lawos/stores/hrx-store.json` |
| `LAWOS_MASTER_DATA_STORE_PATH` | `/mnt/lawos/stores/master-data-store.json` |
| `LAWOS_MATTER_STORE_PATH` | `/mnt/lawos/stores/matter-store.json` |
| `LAWOS_DMS_STORE_PATH` | `/mnt/lawos/stores/dms-store.json` |
| `LAWOS_CRM_STORE_PATH` | `/mnt/lawos/stores/crm-store.json` |
| `LAWOS_INTAKE_STORE_PATH` | `/mnt/lawos/stores/intake-store.json` |
| `LAWOS_CRM_MASTER_DATA_STORE_PATH` | `/mnt/lawos/stores/crm-master-data-store.json` |
| `LAWOS_FINANCE_STORE_PATH` | `/mnt/lawos/stores/finance-store.json` |
| `LAWOS_ANALYTICS_STORE_PATH` | `/mnt/lawos/stores/analytics-store.json` |
| `LAWOS_AI_STORE_PATH` | `/mnt/lawos/stores/ai-store.json` |
| `LAWOS_PORTAL_STORE_PATH` | `/mnt/lawos/stores/portal-store.json` |
| `LAWOS_UI_READINESS_STORE_PATH` | `/mnt/lawos/stores/ui-readiness-store.json` |
| `LAWOS_ENTERPRISE_READINESS_STORE_PATH` | `/mnt/lawos/stores/enterprise-readiness-store.json` |
| `LAWOS_DMS_OBJECT_STORE_PATH` | `/mnt/lawos/stores/dms-store.json.objects` |

The 13 required STORE_PATH entries are the current `STORE_PATH_MANIFEST` entries. `LAWOS_DMS_OBJECT_STORE_PATH` remains derived unless the execute goal chooses explicit env wiring.

## Durable Audit Store Design

| Item | Selected Value |
| --- | --- |
| new env | `LAWOS_AUDIT_STORE_PATH` |
| durable path | `/mnt/lawos/audit/security-audit-events.ndjson` |
| manifest key | `securityAuditStorePath` |
| bounded_context | `security-audit` |
| mode | append-only NDJSON |
| preflight | required for operational profile; absolute path; tmpdir rejected |
| backup inclusion | included in backup/restore v0.2 manifest |
| API behavior | replace in-memory `securityAuditEvents` with append-only writer and bounded reader for `/api/admin/security/audit` |
| PII-safe evidence | receipts store counts, hashes, event ids, and schema refs only, not event payload bodies |

## Session Secret Injection Path

| Item | Selected Value |
| --- | --- |
| existing secret name | `/amic-vault/prod/api/session-signing` |
| injection method | runtime fetch from AWS Secrets Manager by secret id |
| new env | `LAWOS_API_SESSION_SECRET_SECRET_ID=/amic-vault/prod/api/session-signing` |
| code change required | async Lambda/bootstrap resolver fetches secret once per cold start, caches in process, and passes explicit secret into session auth/server construction |
| IAM required | Lambda role gets `secretsmanager:GetSecretValue` on the single session-signing secret ARN only |
| fallback | no fallback to random secret in operational profile |
| evidence boundary | secret value is never printed, committed, or written to closeout artifacts |
| rotation runbook | rotate secret in Secrets Manager, recycle Lambda execution environments, verify two cold starts preserve sessions signed after rotation |

This avoids storing the secret value in Lambda environment variables while still giving S1 a fixed operational session secret.

## Backup/Restore v0.2 Boundary

| Item | Selected Value |
| --- | --- |
| backup schema | `law-firm-os.matter-vault-runtime-backup.v0.2` |
| restore schema | `law-firm-os.matter-vault-runtime-restore.v0.2` |
| drill schema | `law-firm-os.matter-vault-runtime-backup-restore-drill.v0.2` |
| source | EFS mounted runtime stores under `/mnt/lawos` |
| backup root | `/mnt/lawos/backups/matter-vault-runtime-stores` |
| restore rehearsal target | isolated path not wired to Lambda, `/mnt/lawos/restore-rehearsals/<timestamp>` |
| production restore | false unless a later rollback goal explicitly approves it |
| real_client_data_used | true for production backup receipts |
| receipt payload | file count, byte count, SHA256 per file/object, schema version, source path refs, restore target refs, checksum match counts |
| receipt payload exclusion | no plaintext matter names, client names, emails, phones, credential values, tokens, or raw store bodies |
| required S1 execute proof | backup manifest PASS, isolated restore PASS, checksum mismatch count 0, S0-T04 snapshot hash compared with post-S1 readback hash |

## Rollback And Restore Rehearsal Boundary

Before any future S1 store migration:

1. Create a production runtime snapshot manifest with v0.2 receipts.
2. Restore that snapshot to the isolated rehearsal target.
3. Verify checksum match count 0.
4. Only then mount/write the approved runtime store paths.
5. Preserve rollback instructions that restore the pre-S1 snapshot back to the app-bound EFS paths only under a separately approved rollback command.

No restore rehearsal is executed by this packet.

## Approval Text To Use

```text
I5 승인합니다.

`docs/launch/cti-s1-foundation-unblock-packet-2026-07-06.md`의 S1 FOUNDATION unblock choices를 승인합니다.

approval_signature_ref: I5-CTI-S1-FOUNDATION-UNBLOCK-PACKET-OWNER-APPROVAL-2026-07-06

승인 범위:
- EFS durable store target: matter-lawos-prod-cti-s1-efs, access point matter-lawos-prod-runtime-ap, mount path /mnt/lawos
- VPC/subnet/SG plan: vpc-038f70d924a774bea, subnet-0a718a221e621715f, subnet-0af415c198603de77, new matter-lawos-prod-lambda-sg, new matter-lawos-prod-efs-sg
- STORE_PATH mapping: packet §STORE_PATH Mapping
- durable audit: LAWOS_AUDIT_STORE_PATH=/mnt/lawos/audit/security-audit-events.ndjson
- session secret: runtime Secrets Manager fetch using LAWOS_API_SESSION_SECRET_SECRET_ID=/amic-vault/prod/api/session-signing
- backup/restore v0.2 boundary: packet §Backup/Restore v0.2 Boundary and §Rollback And Restore Rehearsal Boundary

명시적 비승인:
- EFS 생성 실행
- Lambda 설정 변경
- secret value 조회
- production store migration
- restore 실행
- S2~S6
- CUTOVER
- password issuance
- OIDC
- DB conversion
- production_ready/go-live claim

이 승인은 S1 FOUNDATION execute goal을 열기 위한 unblock choice approval이며, 실제 인프라/쓰기 실행은 별도 S1 execute goal과 별도 실행 evidence가 필요합니다.
```

## Owner Approval Recorded

The owner approved the unblock choices in-chat on 2026-07-06 with:

`approval_signature_ref: I5-CTI-S1-FOUNDATION-UNBLOCK-PACKET-OWNER-APPROVAL-2026-07-06`

The approval authorizes S1-T01a/T01b/T02/T03/T04/T05 application and verification only. S3 tenant migration, S4 account/permission injection, password issuance/distribution, and CUTOVER remain prohibited without separate approval.

## Packet Verdict

`OWNER_APPROVED_FOR_S1_EXECUTE`.

The S1 execute goal may proceed only within the recorded I5 scope and must still stop on AWS credential access, EFS creation/mount permission, Lambda update permission, session secret IAM/network viability, or backup/restore v0.2 rehearsal boundary failure.
