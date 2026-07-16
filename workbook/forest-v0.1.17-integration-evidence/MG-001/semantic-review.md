# MG-001 Migration Semantic Crosswalk

## Decision

Root migrations 011-016 are never copied or renumbered wholesale. Their 145 parsed SQL contract units are mapped individually against the current Forest 001-025 lineage.

- PORT_026_PLUS: 71
- FOREST_SUPERSEDED: 71
- FOREST_IDENTICAL: 1
- REJECT_CONFLICTING_MUTABILITY: 2
- unclassified: 0
- planned port collision with Forest 001-025: 0

## Forward-only reservations

| Target | Contract units | Purpose | Runtime adaptation |
|---|---:|---|---|
| `026_hrx_payroll_catalog_assignments.sql` | 49 | 급여 항목 catalog와 직원별 항목 배정을 기존 Forest 급여 프로필에 연결한다. | 루트의 중복 payroll profile schema와 append-only trigger는 사용하지 않는다. 기존 Forest profile을 유지하고 catalog·assignment만 연결한다. |
| `027_hrx_attendance_approval_receipts.sql` | 18 | 단순 출퇴근 기록 UI를 바꾸지 않고 급여 입력에 사용된 승인 사실만 append-only 영수증으로 남긴다. | 별도 payroll time snapshot/source 테이블은 만들지 않고 승인 영수증을 기존 input_json·source_refs_json snapshot에 투영한다. |
| `028_hrx_leave_accrual_rule_versions.sql` | 4 | 발생 규칙의 logical code·version·supersedes 관계와 실행 as-of를 기존 Forest 발생 원장에 추가한다. | 기존 rule_code·state_version·snapshot hash·idempotency를 유지하면서 버전 lineage만 additive column으로 추가한다. |

## Explicit exclusions

1. Root `hrx_payroll_profiles` is not created again. Forest 021/023/024 and the canonical payroll repository remain the only profile schema and runtime.
2. Root profile append-only triggers are rejected because Forest uses optimistic state-version updates.
3. Root payroll time snapshot/source tables are not created. Their projection is adapted into Forest input snapshots and tokenized source references.
4. Root leave usage-unit columns are not added. Forest immutable policy rules and request/segment snapshots already provide the richer model.
5. Root entitlement status/cancellation columns are not added. Forest derives lifecycle from dates and immutable reversal ledger entries.
6. Existing Forest migration IDs and SQL files remain byte-preserved; the first admissible new ID is 026.

## Contract-level crosswalk

| Source migration | Type | Contract | Disposition | Destination / Forest anchor |
|---|---|---|---|---|
| `011_hrx_payroll_items.sql` | `TABLE` | `hrx_payroll_items.hrx_payroll_items` | `PORT_026_PLUS` | `026_hrx_payroll_catalog_assignments.sql` |
| `011_hrx_payroll_items.sql` | `COLUMN` | `hrx_payroll_items.tenant_id` | `PORT_026_PLUS` | `026_hrx_payroll_catalog_assignments.sql` |
| `011_hrx_payroll_items.sql` | `COLUMN` | `hrx_payroll_items.item_id` | `PORT_026_PLUS` | `026_hrx_payroll_catalog_assignments.sql` |
| `011_hrx_payroll_items.sql` | `COLUMN` | `hrx_payroll_items.code` | `PORT_026_PLUS` | `026_hrx_payroll_catalog_assignments.sql` |
| `011_hrx_payroll_items.sql` | `COLUMN` | `hrx_payroll_items.display_name` | `PORT_026_PLUS` | `026_hrx_payroll_catalog_assignments.sql` |
| `011_hrx_payroll_items.sql` | `COLUMN` | `hrx_payroll_items.kind` | `PORT_026_PLUS` | `026_hrx_payroll_catalog_assignments.sql` |
| `011_hrx_payroll_items.sql` | `COLUMN` | `hrx_payroll_items.tax_treatment` | `PORT_026_PLUS` | `026_hrx_payroll_catalog_assignments.sql` |
| `011_hrx_payroll_items.sql` | `COLUMN` | `hrx_payroll_items.value_mode` | `PORT_026_PLUS` | `026_hrx_payroll_catalog_assignments.sql` |
| `011_hrx_payroll_items.sql` | `COLUMN` | `hrx_payroll_items.calculation_order` | `PORT_026_PLUS` | `026_hrx_payroll_catalog_assignments.sql` |
| `011_hrx_payroll_items.sql` | `COLUMN` | `hrx_payroll_items.effective_from` | `PORT_026_PLUS` | `026_hrx_payroll_catalog_assignments.sql` |
| `011_hrx_payroll_items.sql` | `COLUMN` | `hrx_payroll_items.effective_to` | `PORT_026_PLUS` | `026_hrx_payroll_catalog_assignments.sql` |
| `011_hrx_payroll_items.sql` | `COLUMN` | `hrx_payroll_items.status` | `PORT_026_PLUS` | `026_hrx_payroll_catalog_assignments.sql` |
| `011_hrx_payroll_items.sql` | `COLUMN` | `hrx_payroll_items.state_version` | `PORT_026_PLUS` | `026_hrx_payroll_catalog_assignments.sql` |
| `011_hrx_payroll_items.sql` | `COLUMN` | `hrx_payroll_items.created_at` | `PORT_026_PLUS` | `026_hrx_payroll_catalog_assignments.sql` |
| `011_hrx_payroll_items.sql` | `COLUMN` | `hrx_payroll_items.updated_at` | `PORT_026_PLUS` | `026_hrx_payroll_catalog_assignments.sql` |
| `011_hrx_payroll_items.sql` | `PRIMARY_KEY` | `hrx_payroll_items.tenant_id,item_id` | `PORT_026_PLUS` | `026_hrx_payroll_catalog_assignments.sql` |
| `011_hrx_payroll_items.sql` | `UNIQUE` | `hrx_payroll_items.tenant_id,code` | `PORT_026_PLUS` | `026_hrx_payroll_catalog_assignments.sql` |
| `011_hrx_payroll_items.sql` | `CONSTRAINT` | `hrx_payroll_items.hrx_payroll_items_kind_check` | `PORT_026_PLUS` | `026_hrx_payroll_catalog_assignments.sql` |
| `011_hrx_payroll_items.sql` | `CONSTRAINT` | `hrx_payroll_items.hrx_payroll_items_tax_check` | `PORT_026_PLUS` | `026_hrx_payroll_catalog_assignments.sql` |
| `011_hrx_payroll_items.sql` | `CONSTRAINT` | `hrx_payroll_items.hrx_payroll_items_value_mode_check` | `PORT_026_PLUS` | `026_hrx_payroll_catalog_assignments.sql` |
| `011_hrx_payroll_items.sql` | `CONSTRAINT` | `hrx_payroll_items.hrx_payroll_items_order_check` | `PORT_026_PLUS` | `026_hrx_payroll_catalog_assignments.sql` |
| `011_hrx_payroll_items.sql` | `CONSTRAINT` | `hrx_payroll_items.hrx_payroll_items_status_check` | `PORT_026_PLUS` | `026_hrx_payroll_catalog_assignments.sql` |
| `012_hrx_payroll_profiles.sql` | `TABLE` | `hrx_payroll_profiles.hrx_payroll_profiles` | `FOREST_SUPERSEDED` | `packages/hrx/src/migrations/021_hrx_payroll_runtime.sql` |
| `012_hrx_payroll_profiles.sql` | `COLUMN` | `hrx_payroll_profiles.tenant_id` | `FOREST_SUPERSEDED` | `packages/hrx/src/migrations/021_hrx_payroll_runtime.sql` |
| `012_hrx_payroll_profiles.sql` | `COLUMN` | `hrx_payroll_profiles.payroll_profile_id` | `FOREST_SUPERSEDED` | `packages/hrx/src/migrations/021_hrx_payroll_runtime.sql` |
| `012_hrx_payroll_profiles.sql` | `COLUMN` | `hrx_payroll_profiles.employee_id` | `FOREST_SUPERSEDED` | `packages/hrx/src/migrations/021_hrx_payroll_runtime.sql` |
| `012_hrx_payroll_profiles.sql` | `COLUMN` | `hrx_payroll_profiles.version` | `FOREST_SUPERSEDED` | `packages/hrx/src/migrations/021_hrx_payroll_runtime.sql` |
| `012_hrx_payroll_profiles.sql` | `COLUMN` | `hrx_payroll_profiles.currency_ref` | `FOREST_SUPERSEDED` | `packages/hrx/src/migrations/021_hrx_payroll_runtime.sql` |
| `012_hrx_payroll_profiles.sql` | `COLUMN` | `hrx_payroll_profiles.pay_frequency` | `FOREST_SUPERSEDED` | `packages/hrx/src/migrations/021_hrx_payroll_runtime.sql` |
| `012_hrx_payroll_profiles.sql` | `COLUMN` | `hrx_payroll_profiles.effective_from` | `FOREST_SUPERSEDED` | `packages/hrx/src/migrations/021_hrx_payroll_runtime.sql` |
| `012_hrx_payroll_profiles.sql` | `COLUMN` | `hrx_payroll_profiles.effective_to` | `FOREST_SUPERSEDED` | `packages/hrx/src/migrations/021_hrx_payroll_runtime.sql` |
| `012_hrx_payroll_profiles.sql` | `COLUMN` | `hrx_payroll_profiles.status` | `FOREST_SUPERSEDED` | `packages/hrx/src/migrations/021_hrx_payroll_runtime.sql` |
| `012_hrx_payroll_profiles.sql` | `COLUMN` | `hrx_payroll_profiles.source_ref` | `FOREST_SUPERSEDED` | `packages/hrx/src/migrations/021_hrx_payroll_runtime.sql` |
| `012_hrx_payroll_profiles.sql` | `COLUMN` | `hrx_payroll_profiles.created_at` | `FOREST_SUPERSEDED` | `packages/hrx/src/migrations/021_hrx_payroll_runtime.sql` |
| `012_hrx_payroll_profiles.sql` | `PRIMARY_KEY` | `hrx_payroll_profiles.tenant_id,payroll_profile_id` | `FOREST_SUPERSEDED` | `packages/hrx/src/migrations/021_hrx_payroll_runtime.sql` |
| `012_hrx_payroll_profiles.sql` | `UNIQUE` | `hrx_payroll_profiles.tenant_id,employee_id,version` | `FOREST_SUPERSEDED` | `packages/hrx/src/migrations/021_hrx_payroll_runtime.sql` |
| `012_hrx_payroll_profiles.sql` | `FOREIGN_KEY` | `hrx_payroll_profiles.tenant_id,employee_id` | `FOREST_SUPERSEDED` | `packages/hrx/src/migrations/021_hrx_payroll_runtime.sql` |
| `012_hrx_payroll_profiles.sql` | `CONSTRAINT` | `hrx_payroll_profiles.hrx_payroll_profiles_version_check` | `FOREST_SUPERSEDED` | `packages/hrx/src/migrations/021_hrx_payroll_runtime.sql` |
| `012_hrx_payroll_profiles.sql` | `CONSTRAINT` | `hrx_payroll_profiles.hrx_payroll_profiles_frequency_check` | `FOREST_SUPERSEDED` | `packages/hrx/src/migrations/021_hrx_payroll_runtime.sql` |
| `012_hrx_payroll_profiles.sql` | `CONSTRAINT` | `hrx_payroll_profiles.hrx_payroll_profiles_status_check` | `FOREST_SUPERSEDED` | `packages/hrx/src/migrations/021_hrx_payroll_runtime.sql` |
| `012_hrx_payroll_profiles.sql` | `CONSTRAINT` | `hrx_payroll_profiles.hrx_payroll_profiles_dates_check` | `FOREST_SUPERSEDED` | `packages/hrx/src/migrations/021_hrx_payroll_runtime.sql` |
| `012_hrx_payroll_profiles.sql` | `TABLE` | `hrx_payroll_item_assignments.hrx_payroll_item_assignments` | `PORT_026_PLUS` | `026_hrx_payroll_catalog_assignments.sql` |
| `012_hrx_payroll_profiles.sql` | `COLUMN` | `hrx_payroll_item_assignments.tenant_id` | `PORT_026_PLUS` | `026_hrx_payroll_catalog_assignments.sql` |
| `012_hrx_payroll_profiles.sql` | `COLUMN` | `hrx_payroll_item_assignments.assignment_id` | `PORT_026_PLUS` | `026_hrx_payroll_catalog_assignments.sql` |
| `012_hrx_payroll_profiles.sql` | `COLUMN` | `hrx_payroll_item_assignments.payroll_profile_id` | `PORT_026_PLUS` | `026_hrx_payroll_catalog_assignments.sql` |
| `012_hrx_payroll_profiles.sql` | `COLUMN` | `hrx_payroll_item_assignments.employee_id` | `PORT_026_PLUS` | `026_hrx_payroll_catalog_assignments.sql` |
| `012_hrx_payroll_profiles.sql` | `COLUMN` | `hrx_payroll_item_assignments.item_id` | `PORT_026_PLUS` | `026_hrx_payroll_catalog_assignments.sql` |
| `012_hrx_payroll_profiles.sql` | `COLUMN` | `hrx_payroll_item_assignments.version` | `PORT_026_PLUS` | `026_hrx_payroll_catalog_assignments.sql` |
| `012_hrx_payroll_profiles.sql` | `COLUMN` | `hrx_payroll_item_assignments.encrypted_amount_ref` | `PORT_026_PLUS` | `026_hrx_payroll_catalog_assignments.sql` |
| `012_hrx_payroll_profiles.sql` | `COLUMN` | `hrx_payroll_item_assignments.currency_ref` | `PORT_026_PLUS` | `026_hrx_payroll_catalog_assignments.sql` |
| `012_hrx_payroll_profiles.sql` | `COLUMN` | `hrx_payroll_item_assignments.effective_from` | `PORT_026_PLUS` | `026_hrx_payroll_catalog_assignments.sql` |
| `012_hrx_payroll_profiles.sql` | `COLUMN` | `hrx_payroll_item_assignments.effective_to` | `PORT_026_PLUS` | `026_hrx_payroll_catalog_assignments.sql` |
| `012_hrx_payroll_profiles.sql` | `COLUMN` | `hrx_payroll_item_assignments.status` | `PORT_026_PLUS` | `026_hrx_payroll_catalog_assignments.sql` |
| `012_hrx_payroll_profiles.sql` | `COLUMN` | `hrx_payroll_item_assignments.source_ref` | `PORT_026_PLUS` | `026_hrx_payroll_catalog_assignments.sql` |
| `012_hrx_payroll_profiles.sql` | `COLUMN` | `hrx_payroll_item_assignments.raw_amount_included` | `PORT_026_PLUS` | `026_hrx_payroll_catalog_assignments.sql` |
| `012_hrx_payroll_profiles.sql` | `COLUMN` | `hrx_payroll_item_assignments.created_at` | `PORT_026_PLUS` | `026_hrx_payroll_catalog_assignments.sql` |
| `012_hrx_payroll_profiles.sql` | `PRIMARY_KEY` | `hrx_payroll_item_assignments.tenant_id,assignment_id` | `PORT_026_PLUS` | `026_hrx_payroll_catalog_assignments.sql` |
| `012_hrx_payroll_profiles.sql` | `UNIQUE` | `hrx_payroll_item_assignments.tenant_id,employee_id,item_id,version` | `PORT_026_PLUS` | `026_hrx_payroll_catalog_assignments.sql` |
| `012_hrx_payroll_profiles.sql` | `FOREIGN_KEY` | `hrx_payroll_item_assignments.tenant_id,employee_id` | `PORT_026_PLUS` | `026_hrx_payroll_catalog_assignments.sql` |
| `012_hrx_payroll_profiles.sql` | `FOREIGN_KEY` | `hrx_payroll_item_assignments.tenant_id,payroll_profile_id` | `PORT_026_PLUS` | `026_hrx_payroll_catalog_assignments.sql` |
| `012_hrx_payroll_profiles.sql` | `FOREIGN_KEY` | `hrx_payroll_item_assignments.tenant_id,item_id` | `PORT_026_PLUS` | `026_hrx_payroll_catalog_assignments.sql` |
| `012_hrx_payroll_profiles.sql` | `CONSTRAINT` | `hrx_payroll_item_assignments.hrx_payroll_item_assignments_version_check` | `PORT_026_PLUS` | `026_hrx_payroll_catalog_assignments.sql` |
| `012_hrx_payroll_profiles.sql` | `CONSTRAINT` | `hrx_payroll_item_assignments.hrx_payroll_item_assignments_status_check` | `PORT_026_PLUS` | `026_hrx_payroll_catalog_assignments.sql` |
| `012_hrx_payroll_profiles.sql` | `CONSTRAINT` | `hrx_payroll_item_assignments.hrx_payroll_item_assignments_dates_check` | `PORT_026_PLUS` | `026_hrx_payroll_catalog_assignments.sql` |
| `012_hrx_payroll_profiles.sql` | `CONSTRAINT` | `hrx_payroll_item_assignments.hrx_payroll_item_assignments_raw_amount_blocked_check` | `PORT_026_PLUS` | `026_hrx_payroll_catalog_assignments.sql` |
| `012_hrx_payroll_profiles.sql` | `INDEX` | `hrx_payroll_profiles.idx_hrx_payroll_profiles_employee` | `FOREST_IDENTICAL` | `packages/hrx/src/migrations/021_hrx_payroll_runtime.sql` |
| `012_hrx_payroll_profiles.sql` | `INDEX` | `hrx_payroll_item_assignments.idx_hrx_payroll_item_assignments_employee_item` | `PORT_026_PLUS` | `026_hrx_payroll_catalog_assignments.sql` |
| `012_hrx_payroll_profiles.sql` | `TRIGGER` | `hrx_payroll_profiles.trg_hrx_payroll_profiles_immutable_update` | `REJECT_CONFLICTING_MUTABILITY` | `packages/hrx/src/payroll/repository.js` |
| `012_hrx_payroll_profiles.sql` | `TRIGGER` | `hrx_payroll_profiles.trg_hrx_payroll_profiles_immutable_delete` | `REJECT_CONFLICTING_MUTABILITY` | `packages/hrx/src/payroll/repository.js` |
| `012_hrx_payroll_profiles.sql` | `TRIGGER` | `hrx_payroll_item_assignments.trg_hrx_payroll_item_assignments_immutable_update` | `PORT_026_PLUS` | `026_hrx_payroll_catalog_assignments.sql` |
| `012_hrx_payroll_profiles.sql` | `TRIGGER` | `hrx_payroll_item_assignments.trg_hrx_payroll_item_assignments_immutable_delete` | `PORT_026_PLUS` | `026_hrx_payroll_catalog_assignments.sql` |
| `013_hrx_payroll_time_inputs.sql` | `TABLE` | `hrx_attendance_approval_receipts.hrx_attendance_approval_receipts` | `PORT_026_PLUS` | `027_hrx_attendance_approval_receipts.sql` |
| `013_hrx_payroll_time_inputs.sql` | `COLUMN` | `hrx_attendance_approval_receipts.tenant_id` | `PORT_026_PLUS` | `027_hrx_attendance_approval_receipts.sql` |
| `013_hrx_payroll_time_inputs.sql` | `COLUMN` | `hrx_attendance_approval_receipts.approval_receipt_id` | `PORT_026_PLUS` | `027_hrx_attendance_approval_receipts.sql` |
| `013_hrx_payroll_time_inputs.sql` | `COLUMN` | `hrx_attendance_approval_receipts.attendance_id` | `PORT_026_PLUS` | `027_hrx_attendance_approval_receipts.sql` |
| `013_hrx_payroll_time_inputs.sql` | `COLUMN` | `hrx_attendance_approval_receipts.employee_id` | `PORT_026_PLUS` | `027_hrx_attendance_approval_receipts.sql` |
| `013_hrx_payroll_time_inputs.sql` | `COLUMN` | `hrx_attendance_approval_receipts.approved_by_actor_id` | `PORT_026_PLUS` | `027_hrx_attendance_approval_receipts.sql` |
| `013_hrx_payroll_time_inputs.sql` | `COLUMN` | `hrx_attendance_approval_receipts.approved_at` | `PORT_026_PLUS` | `027_hrx_attendance_approval_receipts.sql` |
| `013_hrx_payroll_time_inputs.sql` | `COLUMN` | `hrx_attendance_approval_receipts.attendance_source_ref` | `PORT_026_PLUS` | `027_hrx_attendance_approval_receipts.sql` |
| `013_hrx_payroll_time_inputs.sql` | `COLUMN` | `hrx_attendance_approval_receipts.idempotency_key` | `PORT_026_PLUS` | `027_hrx_attendance_approval_receipts.sql` |
| `013_hrx_payroll_time_inputs.sql` | `COLUMN` | `hrx_attendance_approval_receipts.created_at` | `PORT_026_PLUS` | `027_hrx_attendance_approval_receipts.sql` |
| `013_hrx_payroll_time_inputs.sql` | `PRIMARY_KEY` | `hrx_attendance_approval_receipts.tenant_id,approval_receipt_id` | `PORT_026_PLUS` | `027_hrx_attendance_approval_receipts.sql` |
| `013_hrx_payroll_time_inputs.sql` | `UNIQUE` | `hrx_attendance_approval_receipts.tenant_id,attendance_id` | `PORT_026_PLUS` | `027_hrx_attendance_approval_receipts.sql` |
| `013_hrx_payroll_time_inputs.sql` | `UNIQUE` | `hrx_attendance_approval_receipts.tenant_id,idempotency_key` | `PORT_026_PLUS` | `027_hrx_attendance_approval_receipts.sql` |
| `013_hrx_payroll_time_inputs.sql` | `FOREIGN_KEY` | `hrx_attendance_approval_receipts.tenant_id,attendance_id` | `PORT_026_PLUS` | `027_hrx_attendance_approval_receipts.sql` |
| `013_hrx_payroll_time_inputs.sql` | `FOREIGN_KEY` | `hrx_attendance_approval_receipts.tenant_id,employee_id` | `PORT_026_PLUS` | `027_hrx_attendance_approval_receipts.sql` |
| `013_hrx_payroll_time_inputs.sql` | `TABLE` | `hrx_payroll_time_snapshots.hrx_payroll_time_snapshots` | `FOREST_SUPERSEDED` | `packages/hrx/src/migrations/021_hrx_payroll_runtime.sql` |
| `013_hrx_payroll_time_inputs.sql` | `COLUMN` | `hrx_payroll_time_snapshots.tenant_id` | `FOREST_SUPERSEDED` | `packages/hrx/src/migrations/021_hrx_payroll_runtime.sql` |
| `013_hrx_payroll_time_inputs.sql` | `COLUMN` | `hrx_payroll_time_snapshots.snapshot_id` | `FOREST_SUPERSEDED` | `packages/hrx/src/migrations/021_hrx_payroll_runtime.sql` |
| `013_hrx_payroll_time_inputs.sql` | `COLUMN` | `hrx_payroll_time_snapshots.idempotency_key` | `FOREST_SUPERSEDED` | `packages/hrx/src/migrations/021_hrx_payroll_runtime.sql` |
| `013_hrx_payroll_time_inputs.sql` | `COLUMN` | `hrx_payroll_time_snapshots.input_hash` | `FOREST_SUPERSEDED` | `packages/hrx/src/migrations/021_hrx_payroll_runtime.sql` |
| `013_hrx_payroll_time_inputs.sql` | `COLUMN` | `hrx_payroll_time_snapshots.period_start` | `FOREST_SUPERSEDED` | `packages/hrx/src/migrations/021_hrx_payroll_runtime.sql` |
| `013_hrx_payroll_time_inputs.sql` | `COLUMN` | `hrx_payroll_time_snapshots.period_end` | `FOREST_SUPERSEDED` | `packages/hrx/src/migrations/021_hrx_payroll_runtime.sql` |
| `013_hrx_payroll_time_inputs.sql` | `COLUMN` | `hrx_payroll_time_snapshots.as_of` | `FOREST_SUPERSEDED` | `packages/hrx/src/migrations/021_hrx_payroll_runtime.sql` |
| `013_hrx_payroll_time_inputs.sql` | `COLUMN` | `hrx_payroll_time_snapshots.source_version` | `FOREST_SUPERSEDED` | `packages/hrx/src/migrations/021_hrx_payroll_runtime.sql` |
| `013_hrx_payroll_time_inputs.sql` | `COLUMN` | `hrx_payroll_time_snapshots.timezone` | `FOREST_SUPERSEDED` | `packages/hrx/src/migrations/021_hrx_payroll_runtime.sql` |
| `013_hrx_payroll_time_inputs.sql` | `COLUMN` | `hrx_payroll_time_snapshots.projection_json` | `FOREST_SUPERSEDED` | `packages/hrx/src/migrations/021_hrx_payroll_runtime.sql` |
| `013_hrx_payroll_time_inputs.sql` | `COLUMN` | `hrx_payroll_time_snapshots.created_by_actor_id` | `FOREST_SUPERSEDED` | `packages/hrx/src/migrations/021_hrx_payroll_runtime.sql` |
| `013_hrx_payroll_time_inputs.sql` | `COLUMN` | `hrx_payroll_time_snapshots.created_at` | `FOREST_SUPERSEDED` | `packages/hrx/src/migrations/021_hrx_payroll_runtime.sql` |
| `013_hrx_payroll_time_inputs.sql` | `COLUMN` | `hrx_payroll_time_snapshots.payroll_calculation_runtime` | `FOREST_SUPERSEDED` | `packages/hrx/src/migrations/021_hrx_payroll_runtime.sql` |
| `013_hrx_payroll_time_inputs.sql` | `COLUMN` | `hrx_payroll_time_snapshots.disbursement_instruction_included` | `FOREST_SUPERSEDED` | `packages/hrx/src/migrations/021_hrx_payroll_runtime.sql` |
| `013_hrx_payroll_time_inputs.sql` | `PRIMARY_KEY` | `hrx_payroll_time_snapshots.tenant_id,snapshot_id` | `FOREST_SUPERSEDED` | `packages/hrx/src/migrations/021_hrx_payroll_runtime.sql` |
| `013_hrx_payroll_time_inputs.sql` | `UNIQUE` | `hrx_payroll_time_snapshots.tenant_id,idempotency_key` | `FOREST_SUPERSEDED` | `packages/hrx/src/migrations/021_hrx_payroll_runtime.sql` |
| `013_hrx_payroll_time_inputs.sql` | `CONSTRAINT` | `hrx_payroll_time_snapshots.hrx_payroll_time_snapshot_period_check` | `FOREST_SUPERSEDED` | `packages/hrx/src/migrations/021_hrx_payroll_runtime.sql` |
| `013_hrx_payroll_time_inputs.sql` | `CONSTRAINT` | `hrx_payroll_time_snapshots.hrx_payroll_time_snapshot_calculation_blocked` | `FOREST_SUPERSEDED` | `packages/hrx/src/migrations/021_hrx_payroll_runtime.sql` |
| `013_hrx_payroll_time_inputs.sql` | `CONSTRAINT` | `hrx_payroll_time_snapshots.hrx_payroll_time_snapshot_disbursement_blocked` | `FOREST_SUPERSEDED` | `packages/hrx/src/migrations/021_hrx_payroll_runtime.sql` |
| `013_hrx_payroll_time_inputs.sql` | `TABLE` | `hrx_payroll_time_snapshot_sources.hrx_payroll_time_snapshot_sources` | `FOREST_SUPERSEDED` | `packages/hrx/src/migrations/021_hrx_payroll_runtime.sql` |
| `013_hrx_payroll_time_inputs.sql` | `COLUMN` | `hrx_payroll_time_snapshot_sources.tenant_id` | `FOREST_SUPERSEDED` | `packages/hrx/src/migrations/021_hrx_payroll_runtime.sql` |
| `013_hrx_payroll_time_inputs.sql` | `COLUMN` | `hrx_payroll_time_snapshot_sources.snapshot_source_id` | `FOREST_SUPERSEDED` | `packages/hrx/src/migrations/021_hrx_payroll_runtime.sql` |
| `013_hrx_payroll_time_inputs.sql` | `COLUMN` | `hrx_payroll_time_snapshot_sources.snapshot_id` | `FOREST_SUPERSEDED` | `packages/hrx/src/migrations/021_hrx_payroll_runtime.sql` |
| `013_hrx_payroll_time_inputs.sql` | `COLUMN` | `hrx_payroll_time_snapshot_sources.employee_id` | `FOREST_SUPERSEDED` | `packages/hrx/src/migrations/021_hrx_payroll_runtime.sql` |
| `013_hrx_payroll_time_inputs.sql` | `COLUMN` | `hrx_payroll_time_snapshot_sources.object_type` | `FOREST_SUPERSEDED` | `packages/hrx/src/migrations/021_hrx_payroll_runtime.sql` |
| `013_hrx_payroll_time_inputs.sql` | `COLUMN` | `hrx_payroll_time_snapshot_sources.object_id` | `FOREST_SUPERSEDED` | `packages/hrx/src/migrations/021_hrx_payroll_runtime.sql` |
| `013_hrx_payroll_time_inputs.sql` | `COLUMN` | `hrx_payroll_time_snapshot_sources.source_ref` | `FOREST_SUPERSEDED` | `packages/hrx/src/migrations/021_hrx_payroll_runtime.sql` |
| `013_hrx_payroll_time_inputs.sql` | `COLUMN` | `hrx_payroll_time_snapshot_sources.source_state` | `FOREST_SUPERSEDED` | `packages/hrx/src/migrations/021_hrx_payroll_runtime.sql` |
| `013_hrx_payroll_time_inputs.sql` | `COLUMN` | `hrx_payroll_time_snapshot_sources.created_at` | `FOREST_SUPERSEDED` | `packages/hrx/src/migrations/021_hrx_payroll_runtime.sql` |
| `013_hrx_payroll_time_inputs.sql` | `PRIMARY_KEY` | `hrx_payroll_time_snapshot_sources.tenant_id,snapshot_source_id` | `FOREST_SUPERSEDED` | `packages/hrx/src/migrations/021_hrx_payroll_runtime.sql` |
| `013_hrx_payroll_time_inputs.sql` | `UNIQUE` | `hrx_payroll_time_snapshot_sources.tenant_id,snapshot_id,object_type,object_id` | `FOREST_SUPERSEDED` | `packages/hrx/src/migrations/021_hrx_payroll_runtime.sql` |
| `013_hrx_payroll_time_inputs.sql` | `FOREIGN_KEY` | `hrx_payroll_time_snapshot_sources.tenant_id,snapshot_id` | `FOREST_SUPERSEDED` | `packages/hrx/src/migrations/021_hrx_payroll_runtime.sql` |
| `013_hrx_payroll_time_inputs.sql` | `FOREIGN_KEY` | `hrx_payroll_time_snapshot_sources.tenant_id,employee_id` | `FOREST_SUPERSEDED` | `packages/hrx/src/migrations/021_hrx_payroll_runtime.sql` |
| `013_hrx_payroll_time_inputs.sql` | `CONSTRAINT` | `hrx_payroll_time_snapshot_sources.hrx_payroll_time_snapshot_source_type_check` | `FOREST_SUPERSEDED` | `packages/hrx/src/migrations/021_hrx_payroll_runtime.sql` |
| `013_hrx_payroll_time_inputs.sql` | `INDEX` | `hrx_attendance_approval_receipts.idx_hrx_attendance_approval_receipts_attendance` | `PORT_026_PLUS` | `027_hrx_attendance_approval_receipts.sql` |
| `013_hrx_payroll_time_inputs.sql` | `INDEX` | `hrx_payroll_time_snapshots.idx_hrx_payroll_time_snapshots_period` | `FOREST_SUPERSEDED` | `packages/hrx/src/migrations/021_hrx_payroll_runtime.sql` |
| `013_hrx_payroll_time_inputs.sql` | `TRIGGER` | `hrx_attendance_approval_receipts.trg_hrx_attendance_approval_receipts_immutable_update` | `PORT_026_PLUS` | `027_hrx_attendance_approval_receipts.sql` |
| `013_hrx_payroll_time_inputs.sql` | `TRIGGER` | `hrx_attendance_approval_receipts.trg_hrx_attendance_approval_receipts_immutable_delete` | `PORT_026_PLUS` | `027_hrx_attendance_approval_receipts.sql` |
| `013_hrx_payroll_time_inputs.sql` | `TRIGGER` | `hrx_payroll_time_snapshots.trg_hrx_payroll_time_snapshots_immutable_update` | `FOREST_SUPERSEDED` | `packages/hrx/src/migrations/021_hrx_payroll_runtime.sql` |
| `013_hrx_payroll_time_inputs.sql` | `TRIGGER` | `hrx_payroll_time_snapshots.trg_hrx_payroll_time_snapshots_immutable_delete` | `FOREST_SUPERSEDED` | `packages/hrx/src/migrations/021_hrx_payroll_runtime.sql` |
| `013_hrx_payroll_time_inputs.sql` | `TRIGGER` | `hrx_payroll_time_snapshot_sources.trg_hrx_payroll_time_snapshot_sources_immutable_update` | `FOREST_SUPERSEDED` | `packages/hrx/src/migrations/021_hrx_payroll_runtime.sql` |
| `013_hrx_payroll_time_inputs.sql` | `TRIGGER` | `hrx_payroll_time_snapshot_sources.trg_hrx_payroll_time_snapshot_sources_immutable_delete` | `FOREST_SUPERSEDED` | `packages/hrx/src/migrations/021_hrx_payroll_runtime.sql` |
| `014_hrx_leave_usage_units.sql` | `ALTER_COLUMN` | `hrx_leave_groups.balance_managed` | `FOREST_SUPERSEDED` | `packages/hrx/src/leave/type-economics.js` |
| `014_hrx_leave_usage_units.sql` | `ALTER_COLUMN` | `hrx_leave_groups.balance_unit` | `FOREST_SUPERSEDED` | `packages/hrx/src/leave/type-economics.js` |
| `014_hrx_leave_usage_units.sql` | `ALTER_COLUMN` | `hrx_leave_types.allowed_usage_units_json` | `FOREST_SUPERSEDED` | `packages/hrx/src/leave/type-economics.js` |
| `014_hrx_leave_usage_units.sql` | `ALTER_COLUMN` | `hrx_leave_types.deduct_minutes` | `FOREST_SUPERSEDED` | `packages/hrx/src/leave/type-economics.js` |
| `014_hrx_leave_usage_units.sql` | `ALTER_COLUMN` | `hrx_leave_types.paid_minutes` | `FOREST_SUPERSEDED` | `packages/hrx/src/leave/type-economics.js` |
| `014_hrx_leave_usage_units.sql` | `ALTER_COLUMN` | `hrx_leave_requests.applied_deduct_minutes` | `FOREST_SUPERSEDED` | `packages/hrx/src/leave/type-economics.js` |
| `014_hrx_leave_usage_units.sql` | `ALTER_COLUMN` | `hrx_leave_requests.applied_paid_minutes` | `FOREST_SUPERSEDED` | `packages/hrx/src/leave/type-economics.js` |
| `015_hrx_leave_accrual_rule_versions.sql` | `ALTER_COLUMN` | `hrx_leave_accrual_rules.logical_rule_code` | `PORT_026_PLUS` | `028_hrx_leave_accrual_rule_versions.sql` |
| `015_hrx_leave_accrual_rule_versions.sql` | `ALTER_COLUMN` | `hrx_leave_accrual_rules.version` | `PORT_026_PLUS` | `028_hrx_leave_accrual_rule_versions.sql` |
| `015_hrx_leave_accrual_rule_versions.sql` | `ALTER_COLUMN` | `hrx_leave_accrual_rules.supersedes_rule_id` | `PORT_026_PLUS` | `028_hrx_leave_accrual_rule_versions.sql` |
| `015_hrx_leave_accrual_rule_versions.sql` | `ALTER_COLUMN` | `hrx_leave_accrual_runs.as_of_date` | `PORT_026_PLUS` | `028_hrx_leave_accrual_rule_versions.sql` |
| `016_hrx_leave_entitlement_lifecycle.sql` | `ALTER_COLUMN` | `hrx_leave_entitlements.status` | `FOREST_SUPERSEDED` | `packages/hrx/src/leave/entitlement-lifecycle.js` |
| `016_hrx_leave_entitlement_lifecycle.sql` | `ALTER_COLUMN` | `hrx_leave_entitlements.cancelled_at` | `FOREST_SUPERSEDED` | `packages/hrx/src/leave/entitlement-lifecycle.js` |
| `016_hrx_leave_entitlement_lifecycle.sql` | `ALTER_COLUMN` | `hrx_leave_entitlements.cancelled_by` | `FOREST_SUPERSEDED` | `packages/hrx/src/leave/entitlement-lifecycle.js` |
| `016_hrx_leave_entitlement_lifecycle.sql` | `ALTER_COLUMN` | `hrx_leave_entitlements.cancellation_reason` | `FOREST_SUPERSEDED` | `packages/hrx/src/leave/entitlement-lifecycle.js` |
| `016_hrx_leave_entitlement_lifecycle.sql` | `ALTER_COLUMN` | `hrx_leave_entitlements.cancellation_entry_id` | `FOREST_SUPERSEDED` | `packages/hrx/src/leave/entitlement-lifecycle.js` |

## Next gates

- MG-002 validates that the 71 superseded and 2 rejected contracts never enter the candidate schema or runtime.
- MG-003 writes only the 71 approved contract units as additive 026-028 migrations, with store/port/runtime changes and tests.
- MG-004 through MG-006 prove fresh install, upgrades from 010/020/025, idempotency, rollback, and restore.
