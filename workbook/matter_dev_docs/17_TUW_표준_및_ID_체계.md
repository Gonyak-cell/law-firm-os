# matter TUW 표준 및 ID 체계

문서 버전: v0.1  
작성일: 2026-06-11

## 1. 용어

Testable Unit of Work, TUW는 독립적으로 구현·검증 가능한 최소 실행 단위다. 하나의 TUW는 기능, 권한, 감사, 보안, 회귀, 문서화 검증을 포함해야 한다.

## 2. TUW ID 형식

MAT-[Pillar Prefix]-[Domain Code]-[Module Code]-TUW-[번호]

예시: MAT-OUT-EML-FILE-TUW-001

## 3. Pillar Prefix

| Pillar | Prefix |
|---|---|
| Development Operating System | DOS |
| Matter Core Platform | MTR |
| Identity, Permission & Security | SEC |
| Microsoft DMS & Email Layer | MSD |
| Outlook Layer | OUT |
| Workflow & Collaboration | WFL |
| Issue & Legal Execution | ISX |
| Portal Platform | CPT |
| Knowledge & Obsidian Matter Vault | KGV |
| AI & Automation | AIA |
| Drafting & Clause Intelligence | DCI |
| Billing & ERP | BER |
| Admin & Governance | ADM |
| Integration & Sync | INT |
| Enterprise Hardening | ENT |
| People & HR Operations | HRO |

## 4. TUW 표준 필드

| 필드 | 설명 |
|---|---|
| Work ID | TUW 고유 ID |
| Pillar | 소속 Product Pillar |
| Domain | 소속 Domain |
| Module | 소속 Module |
| Capability | 시스템 능력 |
| Feature | 사용자 또는 시스템 기능 |
| Epic | 상위 개발 단위 |
| Story | User Story 또는 System Story |
| Objective | 이 TUW의 목적 |
| User/System Value | 사용자 또는 시스템 가치 |
| Specification Source | 사양명세서 근거 |
| Inputs | 입력값, 선행자료, source data |
| Outputs | 산출물, API, UI, DB record, event |
| Files to Read | 읽어야 할 파일 또는 모듈 |
| Files to Modify | 수정 가능한 파일 또는 모듈 |
| Files Not to Modify | 수정 금지 영역 |
| Dependencies | 선행 TUW 또는 객체 |
| Risk Level | Low / Medium / High / Critical |
| Model Routing | 위험도 기반 모델 배정 |
| Permission Impact | 권한 영향 |
| Audit Impact | 감사로그 영향 |
| AI Impact | AI 관련 영향 |
| Security Constraints | 보안 제약 |
| Performance Constraints | 성능 제약 |
| Verification Contract | 검증계약 |
| Verification Cases | 자동·수동 검증항목 |
| Loop Budget | 허용 반복 루프 수 |
| Stop Condition | 중단 조건 |
| Escalation Rule | 상위검토 조건 |
| Completion Gate | 완료조건 |

## 5. Risk Level 기준

| Risk | 기준 |
|---|---|
| Low | 내부 UI, 읽기전용, 민감정보 없음 |
| Medium | 일반 업무상태 변경, 제한적 audit 필요 |
| High | 문서, 이메일, issue, portal, billing, HR 일반정보 처리 |
| Critical | 권한, 보안, AI, 외부공유, HR 민감정보, billing 확정, legal final output |

## 6. Completion Gate 공통

1. 기능 요구사항 충족.
2. 권한검증 통과.
3. audit event 기록.
4. 데이터 무결성 검증.
5. 에러 처리 및 rollback 확인.
6. regression case 통과.
7. 관련 문서 업데이트.
8. Decision/Execution/Learning Ledger 필요시 기록.
