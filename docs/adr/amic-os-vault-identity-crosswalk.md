# AMIC OS ↔ AMIC Vault identity and data crosswalk

Status: accepted for source implementation
Date: 2026-08-28
Task: `SCHEMA-00`
Machine contract: `contracts/amic-os-vault-identity-crosswalk.json`

## Decision

AMIC OS와 AMIC Vault를 연결하기 위해 새 DB table 또는 column을 추가하지
않는다. Law Firm OS DB migration 수와 Vault DB migration 수는 모두 0이다.

이 결정은 현재 고정한 두 source snapshot의 표현력을 뜻한다. production
provider의 실제 tenant/user/Matter linkage가 이미 준비됐다는 주장이 아니다.
아래 runtime binding을 권위 있는 provider에서 읽어 확인하기 전에는 모든
Vault write와 exact-version export를 기본 deny한다.

## Why migration 0 is sufficient

| 대상 | AMIC OS source | Vault authority | 연결 방식 |
| --- | --- | --- | --- |
| Tenant | signed session의 server-derived text `tenant_id` | `tenants.tenant_id` UUID | 서버 배포 설정의 immutable 1:1 binding |
| User | signed session의 server-derived text `user_id` | `users.user_id` UUID | 기존 `user_login_identities`의 `account_ledger_id`로 조회 |
| Matter | canonical LawOS `matter_id` | `matters.matter_id` UUID | 기존 reflection metadata의 `lawosMatterId`/`matterAppMatterId`와 Matter Code를 함께 확인 |
| Workspace | Vault product workspace context | `workspaces.workspace_id` UUID | mapped tenant 안의 configured active workspace 사용. 문서 권한 범위는 workspace가 아니라 Matter가 결정 |
| Folder | 선택한 folder ref | `document_folders.folder_id` UUID | tenant와 Matter가 모두 같은 native folder만 허용 |
| Document | Vault 조회 또는 생성 결과 | `documents.document_id` UUID | native UUID를 그대로 보존하고 Matter/folder 관계 재확인 |
| Version | 사용자가 고른 exact version 또는 upload 결과 | `document_versions.version_id` UUID | document/file object/hash를 함께 bind. `latest` 자동 대체 금지 |
| File object | exact-version receipt | `file_objects.file_object_id` UUID | SHA-256, byte size, MIME만 전달; `storage_uri`는 provider 밖으로 노출하지 않음 |
| Permission | LawOS `permission_envelope_id`와 server principal | Vault `PermissionService`와 Matter membership/Ethical Wall/governance state | primary key를 복제하지 않고 매 작업마다 Vault가 새로 판정 |
| Audit | operation correlation/idempotency ref | `audit_events.correlation_id`와 native `event_id` | correlation은 공유하되 두 append-only ledger의 event PK는 공유하지 않음 |

AMIC OS operational user ID는 Vault UUID와 동일하지 않지만, 현재 등록 seed의
user ID 전체가 Vault의 `account_ledger_id` 형식 제약을 만족한다. 이메일,
display name, Entra subject를 묵시적 fallback으로 사용하지 않는다. Entra
subject는 AMIC OS login assurance에 사용될 수 있지만 Vault user UUID를
결정하는 runtime key는 승인된 account-ledger binding이다.

LawOS Matter와 Vault Matter도 동일한 PK를 강제하지 않는다. Vault에 이미 있는
LawOS canonical reflection metadata와 정확한 Matter Code를 함께 확인하므로,
기존 문서의 `matter_id`를 재작성하지 않고 안정적으로 native Vault Matter를
찾을 수 있다.

## Trust boundary

모든 변환은 AMIC OS server/BFF 안에서 수행한다. renderer, Desktop main IPC,
Office.js, Classic Outlook adapter가 전달한 tenant/user/actor 값은 권위로
사용하지 않는다. AMIC OS session token 자체도 Vault로 전달하지 않는다.
서버가 session을 검증한 뒤 mapped Vault tenant/user를 해석하고, Vault API가
각 operation의 권한과 Ethical Wall, Records, DLP를 다시 판정한다.

Workspace는 탐색과 capability scope용 native Vault ref다. Document가
workspace FK를 갖는 것처럼 가장하지 않는다. 저장·검색·첨부의 실제 document
scope는 Vault의 tenant + Matter + permission 관계다.

## Required operational data gates

다음은 schema migration이 아니라 기존 schema의 data/configuration gate다.

1. LawOS tenant text ID에 대응하는 Vault tenant UUID가 정확히 하나이고 active다.
2. 각 canary LawOS user ID에 대응하는 active `account_ledger_id`가 정확히 하나이며
   같은 mapped tenant의 active Vault user를 가리킨다.
3. 대상 LawOS Matter의 reflection row가 정확히 하나이고 current source revision,
   canonical Matter Code, client FK를 만족한다.
4. 설정된 native Vault workspace가 같은 tenant에서 active다.
5. Vault permission/capability probe가 authoritative response를 반환한다.
6. deployed Vault API와 schema revision을 timestamped provider readback으로 확인한다.

한 항목이라도 누락되거나 ambiguous하면 UI는 연결 준비 안 됨 상태만 표시하고,
upload/download/export/attach route는 fail closed한다. 데이터 binding을 만들거나
수정하는 작업은 기존 Vault admin/migration lane의 승인·audit를 사용하며, 이
ADR만으로 production DB write를 승인하지 않는다.

## Source evidence

Law Firm OS snapshot `eeaf0f900781a29631c2ecf4cf44ec07bbcaba44`에서 signed
session은 server-derived text tenant/user ID와 `tenant_refs.vault`를 제공하고,
caller-supplied trust headers/query를 거부한다. DMS skeleton은 document/version/
file/hash/audit ref를 이미 표현하지만 현재 file-backed synthetic runtime은
production authority가 아니다.

AMIC Vault snapshot `5a04cc31f7c8a228982012b2213f78e6f07dc9ac`에는 tenant/user,
account-ledger login identity, workspace, Matter reflection metadata, Matter-scoped
folders, document, immutable version/file object, SHA-256, Ethical Wall, permission,
append-only audit가 이미 존재한다.

검증 명령:

```bash
node scripts/validate-amic-os-vault-identity-crosswalk.mjs \
  --vault-source <amic-vault-checkout>
node --test scripts/test/amic-os-vault-identity-crosswalk.test.mjs
```

첫 명령의 `vault_source_verified=true`는 로컬 Vault checkout source 일치만
뜻한다. `provider_runtime_readback_performed=false`가 유지되며 production
readiness를 주장하지 않는다.
