# 휴가관리 일정·정책 기준선 ADR

상태: `ACCEPTED_FOR_SYNTHETIC_IMPLEMENTATION`

## 결정

- 휴가 차감 시간은 attendance 사실이 아니라 effective-dated HRX work-schedule assignment에서 계산한다.
- 직원 일정이 없을 때 480분을 자동 가정하지 않는다. 회사 기본 480분 프로필이 명시 배정된 경우에만 사용한다.
- 신청 시 날짜별 일정·휴일·timezone 계산 결과를 snapshot하여 이후 일정 변경이 과거 요청을 바꾸지 않게 한다.
- 법정 권리 원천은 입사일 기준이며 회계연도 값은 불리하지 않은 projection으로만 제공한다.
- 계산·원장은 정수 분을 사용하고 제출 시 예약, 승인 시 예약 해제와 사용 확정을 같은 트랜잭션에서 기록한다.
- `people-leave-types`만 휴가 설정의 canonical section이다. `people-company-leave` deep link는 canonical section으로 redirect한다.

## 권한

- staff는 본인 조회·신청만 가진다.
- manager/attorney는 지정된 조직·approval resource에 한해 팀 조회·승인 권한을 가진다.
- 정책·발생·조정·리포트·촉진·퇴사정산은 HR/admin role profile에 명시적으로 부여하고 legacy `hrx.leave.write`만으로 승격하지 않는다.
- 민감 실행은 signed session, resource assignment, step-up을 모두 요구한다.

## 경계

- 이 ADR과 fixture는 합성 구현 기준선이다. DEC-LV-01~10 회사 확정, 실제 직원 migration, 외부 시스템 write, public release, go-live 승인이 아니다.
- 2026-08-20 시행 법령 버전은 별도 effective-dated fixture로 검증하며 법무·노무 검토 전 자동 적용하지 않는다.

코드 기준선: `packages/hrx/fixtures/leave-management-defaults.synthetic.json`
