# matter Billing, ERP, Analytics 명세

문서 버전: v0.1  
작성일: 2026-06-11

## 1. 범위

Billing & ERP는 matter별 time entry, fee arrangement, billing record, profitability, capacity, workload를 관리한다. 자체 로펌 내부용이므로 외부 SaaS 구독과 내부 청구·수익성을 구분한다.

## 2. Core Objects

| Object | 주요 필드 |
|---|---|
| Time Entry | employee_id, matter_id, date, duration, description, billable, source, review_status |
| Fee Arrangement | matter_id, fee_type, hourly_rate, fixed_fee, success_fee, retainer, cap |
| Billing Record | matter_id, period, amount, invoice_status, collected_at |
| Matter Budget | expected_fee, expected_hours, budget_owner |
| Rate Card | employee_role, rate, effective_date |
| Activity Signal | document edit, email, meeting, AI job, task completion |
| Profitability Snapshot | matter revenue, cost, hours, realization, margin |

## 3. Time Capture 후보

| source | 후보 생성 |
|---|---|
| Document edit | 문서검토·작성 후보 |
| Email filing/reply | 고객·상대방 커뮤니케이션 후보 |
| Meeting | 회의 참석 및 회의록 후보 |
| Research | 리서치 시간 후보 |
| AI review | AI 초안 검토·수정 시간 후보 |
| Task completion | task 수행시간 후보 |
| Closing activity | closing checklist 처리시간 후보 |

## 4. Billing Workflow

1. Activity signal 수집.
2. Time candidate 생성.
3. 수행자가 확인·수정.
4. billable/non-billable 분류.
5. partner review.
6. billing record 또는 invoice candidate 생성.
7. 수금/정산 상태 반영.
8. profitability dashboard 갱신.

## 5. Analytics

| Dashboard | 내용 |
|---|---|
| Matter Profitability | budget vs actual, fixed fee 소진율, margin |
| Lawyer Workload | employee별 task, time, deadline, availability |
| Practice Performance | M&A/분쟁/자문별 매출·시간·수익성 |
| Client Relationship | 고객별 matter, revenue, outstanding, response delay |
| HR Capacity | 휴가, 근태, workload, 채용필요 |
| Billing Leakage | 활동 대비 time entry 누락 후보 |

## 6. 제한

1. AI가 time entry를 자동확정하지 않는다.
2. billing amount는 partner/finance approval 전 확정하지 않는다.
3. HR compensation data와 billing rate는 별도 권한을 적용한다.
4. 외부 고객에게 billing 정보를 표시할지는 별도 정책으로 정한다.
