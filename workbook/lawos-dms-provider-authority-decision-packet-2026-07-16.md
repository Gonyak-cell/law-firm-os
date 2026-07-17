# Law Firm OS DMS original provider 및 authority 결정 패킷

- 패킷 ID: `MAT-DEC-03 / RS-DMS-001`
- 작성 기준일: 2026-07-16 KST
- 상태: `AWAITING_OWNER_DECISION`
- 외부 게이트: `EXT-DMS-PROVIDER`, `EXT-RETENTION`
- 현재 허용 claim: `DMS_SOURCE_CHECKPOINT_VERIFIED` / `SOURCE_MERGE_CANDIDATE`까지만 가능
- 현재 금지 claim: `DMS_PROVIDER_STAGING_VERIFIED`, production upload, production migrated, release, deploy, go-live

## 1. 결정이 필요한 이유

현재 `origin/main` 기준 DMS는 `storage_pointer_ref`를 이용해 원본 저장소를 추상화하지만, 실제 문서 원본의 최종 provider와 ACL·version·retention·legal hold 책임 주체는 승인되지 않았다. `workbook/lawos-runtime-safety-evidence/RS-GOV-006/external-dependency-ledger.json`은 `EXT-DMS-PROVIDER`와 `EXT-RETENTION`을 `approval_required`로 유지한다. 과거 문서에 있는 제안·기술 권고·유실된 결정 기록에 대한 서술은 현재 승인 receipt를 대체하지 않는다.

이 패킷은 provider-neutral 소스 구현과 실제 provider 활성화 사이의 인간 결정 경계를 고정한다. 이 문서 자체는 승인 receipt가 아니다.

## 2. 이번 결정의 범위

결정자는 다음 항목을 하나의 signed receipt로 확정해야 한다.

1. 문서 원본 provider: SharePoint/OneDrive 또는 versioned object storage.
2. 문서 ACL의 business authority와 provider enforcement 책임.
3. 문서 버전의 canonical ID와 provider-native version ID의 관계.
4. 보존기간, disposition review, 삭제 승인과 legal hold 우선순위.
5. 데이터 소재지, 암호화, key ownership, access logging, 복구 책임.
6. sandbox tenant/account, 운영 owner, incident owner, restore operator.
7. staging roundtrip 및 restore acceptance를 실행할 수 있는 별도 승인 범위.

이번 결정에 포함되지 않는 사항은 production cutover, 실제 client data migration, release/tag, AWS 배포, Windows signing, go-live다. 각각 별도 승인 receipt가 필요하다.

## 3. 선택지 비교

| 판단 축 | A. SharePoint/OneDrive original | B. Versioned object storage original |
|---|---|---|
| M365/Outlook filing | Graph 기반 저장·공유 흐름이 자연스럽다 | Graph에서 읽은 첨부를 LawOS 저장소로 복사해야 한다 |
| canonical ACL 후보 | SharePoint 권한을 authority로 둘 유인이 크지만 Matter ACL과 drift 조정이 필요하다 | LawOS/PostgreSQL ACL을 authority로 두고 provider policy를 기술적 enforcement로 제한하기 쉽다 |
| 외부 공유 | M365 링크·조직 정책과 결합이 쉽다 | LawOS secure-link 또는 별도 delivery 계층이 필요하다 |
| versioning | Drive item/version 의미를 LawOS version과 매핑해야 한다 | immutable key/version ID 또는 object versioning과 LawOS version을 일대일 매핑하기 쉽다 |
| legal hold/retention | Purview/retention label 및 tenant 정책 의존성이 크다 | object lock/lifecycle와 application hold guard를 조합해야 한다 |
| 복구 | tenant/Graph/SharePoint restore 절차와 권한 복원이 필요하다 | object version restore와 metadata DB point-in-time recovery를 조합한다 |
| 데이터 소재지 | M365 tenant geography와 조직 설정으로 결정된다 | 승인 region·bucket/container 정책으로 명시 가능하다 |
| 운영 복잡도 | M365 admin consent, Graph scope, tenant policy가 핵심이다 | IAM, encryption key, lifecycle, object lock, inventory가 핵심이다 |
| 주요 drift 위험 | Matter ACL 대 SharePoint ACL, LawOS version 대 Drive version | DB metadata 대 object existence/version, lifecycle 대 legal hold |

## 4. 권장 authority 모델

아래 모델은 두 provider 모두에 적용 가능한 기술 권장안이며, 승인 전에는 확정값이 아니다.

| 책임 | 권장 authority | provider의 역할 | 불일치 시 동작 |
|---|---|---|---|
| matter membership 및 문서 접근 결정 | LawOS permission envelope/PostgreSQL | 결정 결과를 기술적으로 enforce | deny 및 reconciliation queue |
| document/version/file-object identity | LawOS PostgreSQL metadata | opaque provider object/version ID 보관 | finalize 차단 또는 fail closed |
| 원본 bytes와 digest | 승인 provider | SHA-256 readback 및 immutable evidence 제공 | 다운로드·finalize 차단 |
| retention 정책 | 승인된 legal/privacy matrix | native retention/lifecycle 적용 | 더 긴 보존을 우선, 자동 삭제 금지 |
| legal hold | LawOS hold ledger와 provider-native hold의 이중 확인 | native deletion prevention | 어느 한쪽이라도 hold이면 삭제 거부 |
| audit/outbox | LawOS append-only audit/outbox | provider access log를 외부 evidence로 연결 | 누락 시 staging gate 실패 |
| 복구 | DB metadata + provider object/version의 결합 receipt | object/version restore | digest·ACL·version 불일치 시 복구 실패 |

## 5. 필수 결정값

아래 표의 모든 값이 비어 있지 않고 승인자가 서명해야 `RS-DMS-001`을 완료로 판정할 수 있다.

| 필드 | 허용값 또는 형식 | 결정값 |
|---|---|---|
| `provider_family` | `sharepoint_onedrive` 또는 `versioned_object_storage` | `PENDING` |
| `provider_product` | 제품·서비스명과 tenant/account 식별자(비밀값 제외) | `PENDING` |
| `data_residency` | 승인 geography/region | `PENDING` |
| `acl_business_authority` | `lawos` 또는 `provider` 또는 승인된 hybrid 규칙 | `PENDING` |
| `acl_drift_policy` | fail-closed 조건과 reconciliation owner | `PENDING` |
| `canonical_version_authority` | canonical ID와 provider version 매핑 규칙 | `PENDING` |
| `retention_matrix_ref` | 승인된 문서 유형별 기간·disposition 문서 | `PENDING` |
| `legal_hold_authority` | hold 생성·해제 승인 역할과 이중 확인 규칙 | `PENDING` |
| `deletion_approval` | 삭제 승인 역할, 최소 인원, evidence | `PENDING` |
| `encryption_and_key_owner` | encryption 방식과 key owner | `PENDING` |
| `sandbox_scope` | tenant/account, synthetic-only 여부, operator | `PENDING` |
| `restore_owner` | restore 실행자와 검토자 | `PENDING` |
| `target_rpo` | duration | `PENDING` |
| `target_rto` | duration | `PENDING` |

## 6. provider별 구현 touchpoint

결정 후 선택된 한 provider만 구현한다. 선택되지 않은 adapter는 placeholder로 유지하며 credential material을 받지 않는다.

### A. SharePoint/OneDrive 선택 시

- Graph app registration, 최소 delegated/application scope, admin consent receipt.
- drive/site/container allowlist와 tenant boundary.
- upload session, item/version stat, digest 또는 신뢰 가능한 readback 검증.
- permission envelope에서 SharePoint ACL로의 mapping과 drift reconciliation.
- Purview/retention label/legal hold 적용 및 해제 evidence.
- deleted item/version 복구와 metadata pointer 재결합 rehearsal.

### B. Versioned object storage 선택 시

- 승인 account/region/bucket 또는 container, encryption key, public-access block.
- multipart/staged object, conditional finalize, object version ID, checksum readback.
- IAM/service role과 tenant/object prefix isolation.
- lifecycle, object lock 또는 이에 준하는 retention control.
- delete marker/version purge 승인 및 legal hold fail-closed.
- version restore와 metadata DB pointer 재결합 rehearsal.

## 7. `RS-DMS-010` sandbox acceptance

승인 receipt 이후에도 다음 synthetic sandbox roundtrip이 모두 PASS해야 `DMS_PROVIDER_STAGING_VERIFIED`를 주장할 수 있다.

1. 승인된 sandbox와 synthetic tenant만 사용한다.
2. upload session 생성 후 staged upload와 provider digest readback이 일치한다.
3. document/version/file-object/audit/outbox metadata가 원자적으로 commit된다.
4. provider finalize 후 download digest가 원본과 일치한다.
5. same idempotency key 재실행이 document/version을 중복 생성하지 않는다.
6. 허용 사용자 access는 성공하고 다른 tenant·권한 없는 사용자 access는 거부된다.
7. provider ACL drift를 주입하면 LawOS read/download가 fail closed하고 reconciliation receipt가 생성된다.
8. metadata commit 전·후와 provider finalize 전·후 kill point가 자동 복구된다.
9. active legal hold 상태에서 cleanup/delete가 거부된다.
10. retention 만료 전 삭제가 거부되고, 만료 후에도 승인 없는 자동 영구 삭제는 수행되지 않는다.
11. object/version restore 뒤 digest·version·ACL·audit readback이 일치한다.
12. receipt에 secret, token, raw document bytes, client PII가 포함되지 않는다.

## 8. 승인 receipt 최소 스키마

```json
{
  "schema_version": "law-firm-os.mat-dec-03.v0.1",
  "decision_id": "MAT-DEC-03",
  "status": "approved",
  "provider_family": "PENDING",
  "provider_product": "PENDING",
  "acl_business_authority": "PENDING",
  "canonical_version_authority": "PENDING",
  "retention_matrix_ref": "PENDING",
  "legal_hold_authority": "PENDING",
  "sandbox_scope_ref": "PENDING",
  "decided_by": "PENDING",
  "legal_privacy_approved_by": "PENDING",
  "security_approved_by": "PENDING",
  "operations_accepted_by": "PENDING",
  "decided_at": "PENDING",
  "source_commit": "PENDING",
  "production_upload_authorized": false,
  "production_cutover_authorized": false,
  "release_authorized": false,
  "go_live_authorized": false
}
```

`status=approved` 문자열만으로는 충분하지 않다. 위 필수값, 서명 역할, 결정 시각, 근거 문서, exact source commit이 모두 검증되어야 한다.

## 9. 현재 판정

| 항목 | 판정 |
|---|---|
| provider-neutral schema/adapter/reconciler source | 구현·검증 가능 |
| local/disposable PostgreSQL synthetic rehearsal | 허용 |
| MAT-DEC-03 승인 | `PENDING` |
| EXT-RETENTION 승인 | `PENDING` |
| 실제 provider adapter 활성화 | `BLOCKED_BY_APPROVAL` |
| provider sandbox roundtrip | `NOT_EXECUTED` |
| production upload 및 원본 migration | `PROHIBITED` |
| release/tag/AWS deploy/go-live | 이 패킷 범위 밖이며 별도 승인 필요 |

따라서 `RS-DMS-001`은 `PACKET_READY / HUMAN_DECISION_PENDING`, `RS-DMS-010`은 `EXTERNAL_BLOCKED_NOT_EXECUTED`로 유지한다. 이 상태는 source merge를 막는 외부 차단 사항으로 분리해 보고하되, provider 활성화 또는 staging 검증으로 과장하지 않는다.
