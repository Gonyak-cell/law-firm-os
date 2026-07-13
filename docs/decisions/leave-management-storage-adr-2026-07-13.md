# 휴가 관리 저장소 결정 기록

- 상태: 구현 확정
- 범위: LV-01 영속 데이터, 원장, 트랜잭션
- 기준일: 2026-07-13
- 실제 직원 데이터 전환: 승인 전 금지

## 결정

`hrx_leave_requests`와 `hrx_leave_balance_entries`의 기존 기본 키는 유지하고 새 단일값은 additive column으로 확장한다. 날짜별 근무 일정과 entitlement별 배분처럼 1:N 불변식이 있는 값만 `hrx_leave_request_segments`와 `hrx_leave_request_allocations`로 분리한다.

원장은 append-only다. 수정과 삭제를 공개하지 않으며 SQL trigger와 file-store 양쪽에서 거부한다. 취소와 정정은 원본 행을 보존한 채 `reverses_entry_id`를 가진 반대 효과 행을 한 번만 추가한다. 신규 계산은 정수 `amount_minutes`만 사용하고 과거 `amount`는 호환 읽기에만 남긴다.

file-store의 비동기 트랜잭션은 callback Promise가 resolve된 뒤에만 커밋한다. 실행 중 다른 write가 커밋되면 저장소 revision 비교가 `HRX_TRANSACTION_CONFLICT` 409를 반환한다. 휴가 request와 approval처럼 자체 `state_version`이 있는 객체는 별도 CAS도 통과해야 한다.

## 대안 검토

1. `hrx_leave_request_details` 1:1 테이블: schema-less file-store에서 단일 필드 조회와 원자성만 복잡하게 만들어 제외했다.
2. 기존 원장 행 update: 감사와 퇴사 정산에서 과거 계산을 재현할 수 없어 제외했다.
3. 비동기 transaction을 모두 직렬 queue로 전환: 기존 동기 repository 계약을 깨므로 제외했다. 현재 optimistic revision 충돌은 동기 API를 유지하면서 lost update를 차단한다.
4. 고정 480분 fallback: 실제 근무 일정이 없는 신청을 유효하게 보이게 하므로 금지했다. 명시적 schedule assignment가 없거나 겹치면 fail-closed한다.

## 구현 경계

- 마이그레이션은 expand-only다. `007_hrx_leave_management.sql`은 새 테이블과 additive column만 만든다.
- 기존 비휴가 in-memory approval은 이번 결정으로 전환하지 않는다.
- 기존 leave seed와 실제 직원 행의 backfill execute는 LV-07 preview, 백업/복원 drill, 별도 승인 전까지 실행하지 않는다.
- 이번 단계의 restart proof는 합성 fixture 전용이며 public release 또는 go-live 증거가 아니다.

## 검증 계약

- async resolve 전 조기 커밋 없음, reject 전체 롤백
- 동시 신청 이중 예약 없음
- request, segment, allocation, ledger, approval, audit, outbox, receipt의 실패 주입 전체 롤백
- tenant-scoped PK/FK/UNIQUE, CAS, 원장 불변성, 1회 역분개
- 프로세스 재시작 후 승인 상태와 분 단위 잔액 동일
