# Law Firm OS Spec Requirement Ledger v1

Purpose: bind every attached specification requirement to concrete RP/micro/subphase anchors before implementation.

## Summary

- Feature requirements: 209
- Narrative requirements: 18
- Total requirements: 227

## Requirements

| ID | Type | Priority | Requirement | Primary anchor | Test | Hermes | Claude |
|---|---|---|---|---|---|---|---|
| TEN-001 | feature | P0 | Tenant 생성 | RP00.P02.M03.S01 | RP00.P05.M07.S01 | RP00.P08.M08.S01 | RP00.P09.M09.S01 |
| TEN-002 | feature | P0 | 도메인 설정 | RP00.P02.M03.S01 | RP00.P05.M07.S01 | RP00.P08.M08.S01 | RP00.P09.M09.S01 |
| TEN-003 | feature | P0 | 관리자 지정 | RP00.P02.M03.S01 | RP00.P05.M07.S01 | RP00.P08.M08.S01 | RP00.P09.M09.S01 |
| TEN-004 | feature | P0 | 조직정책 | RP00.P02.M03.S01 | RP00.P05.M07.S01 | RP00.P08.M08.S01 | RP00.P09.M09.S01 |
| TEN-005 | feature | P1 | 데이터 위치 선택 | RP00.P02.M03.S01 | RP00.P05.M07.S01 | RP00.P08.M08.S01 | RP00.P09.M09.S01 |
| TEN-006 | feature | P1 | Dedicated Tenant | RP00.P02.M03.S01 | RP00.P05.M07.S01 | RP00.P08.M08.S01 | RP00.P09.M09.S01 |
| TEN-007 | feature | P1 | Tenant별 암호화키 | RP00.P02.M03.S01 | RP00.P05.M07.S01 | RP00.P08.M08.S01 | RP00.P09.M09.S01 |
| TEN-008 | feature | P1 | Tenant 삭제 | RP00.P02.M03.S01 | RP00.P05.M07.S01 | RP00.P08.M08.S01 | RP00.P09.M09.S01 |
| USR-001 | feature | P0 | 사용자 초대 | RP01.P02.M03.S01 | RP01.P05.M07.S01 | RP01.P08.M08.S01 | RP01.P09.M09.S01 |
| USR-002 | feature | P0 | 역할 부여 | RP01.P02.M03.S01 | RP01.P05.M07.S01 | RP01.P08.M08.S01 | RP01.P09.M09.S01 |
| USR-003 | feature | P0 | 그룹 배정 | RP01.P02.M03.S01 | RP01.P05.M07.S01 | RP01.P08.M08.S01 | RP01.P09.M09.S01 |
| USR-004 | feature | P0 | 계정 비활성화 | RP01.P02.M03.S01 | RP01.P05.M07.S01 | RP01.P08.M08.S01 | RP01.P09.M09.S01 |
| USR-005 | feature | P1 | 대체 담당자 지정 | RP01.P02.M03.S01 | RP01.P05.M07.S01 | RP01.P08.M08.S01 | RP01.P09.M09.S01 |
| USR-006 | feature | P1 | SSO 연동 | RP01.P02.M03.S01 | RP01.P05.M07.S01 | RP01.P08.M08.S01 | RP01.P09.M09.S01 |
| USR-007 | feature | P1 | MFA 정책 | RP01.P02.M03.S01 | RP01.P05.M07.S01 | RP01.P08.M08.S01 | RP01.P09.M09.S01 |
| USR-008 | feature | P1 | 권한 리뷰 | RP01.P02.M03.S01 | RP01.P05.M07.S01 | RP01.P08.M08.S01 | RP01.P09.M09.S01 |
| AUD-001 | feature | P0 | 로그인 로그 | RP03.P02.M03.S01 | RP03.P05.M07.S01 | RP03.P08.M08.S01 | RP03.P09.M09.S01 |
| AUD-002 | feature | P0 | 문서 접근 로그 | RP03.P02.M03.S01 | RP03.P05.M07.S01 | RP03.P08.M08.S01 | RP03.P09.M09.S01 |
| AUD-003 | feature | P0 | 권한변경 로그 | RP03.P02.M03.S01 | RP03.P05.M07.S01 | RP03.P08.M08.S01 | RP03.P09.M09.S01 |
| AUD-004 | feature | P0 | 청구·입금 로그 | RP03.P02.M03.S01 | RP03.P05.M07.S01 | RP03.P08.M08.S01 | RP03.P09.M09.S01 |
| AUD-005 | feature | P1 | 정산 로그 | RP03.P02.M03.S01 | RP03.P05.M07.S01 | RP03.P08.M08.S01 | RP03.P09.M09.S01 |
| AUD-006 | feature | P1 | AI 접근 로그 | RP03.P02.M03.S01 | RP03.P05.M07.S01 | RP03.P08.M08.S01 | RP03.P09.M09.S01 |
| AUD-007 | feature | P1 | 대량반출 탐지 | RP03.P02.M03.S01 | RP03.P05.M07.S01 | RP03.P08.M08.S01 | RP03.P09.M09.S01 |
| AUD-008 | feature | P1 | 감사 리포트 | RP03.P02.M03.S01 | RP03.P05.M07.S01 | RP03.P08.M08.S01 | RP03.P09.M09.S01 |
| ENT-001 | feature | P0 | Entity 생성 | RP04.P02.M03.S01 | RP04.P05.M07.S01 | RP04.P08.M08.S01 | RP04.P09.M09.S01 |
| ENT-002 | feature | P0 | 별칭 관리 | RP04.P02.M03.S01 | RP04.P05.M07.S01 | RP04.P08.M08.S01 | RP04.P09.M09.S01 |
| ENT-003 | feature | P1 | 관계 관리 | RP04.P02.M03.S01 | RP04.P05.M07.S01 | RP04.P08.M08.S01 | RP04.P09.M09.S01 |
| ENT-004 | feature | P1 | 중복 탐지 | RP04.P02.M03.S01 | RP04.P05.M07.S01 | RP04.P08.M08.S01 | RP04.P09.M09.S01 |
| ENT-005 | feature | P1 | 위험등급 | RP04.P02.M03.S01 | RP04.P05.M07.S01 | RP04.P08.M08.S01 | RP04.P09.M09.S01 |
| ENT-006 | feature | P2 | 공시정보 연결 | RP04.P02.M03.S01 | RP04.P05.M07.S01 | RP04.P08.M08.S01 | RP04.P09.M09.S01 |
| CLI-001 | feature | P0 | Client 등록 | RP04.P02.M03.S01 | RP04.P05.M07.S01 | RP04.P08.M08.S01 | RP04.P09.M09.S01 |
| CLI-002 | feature | P0 | Client Group | RP04.P02.M03.S01 | RP04.P05.M07.S01 | RP04.P08.M08.S01 | RP04.P09.M09.S01 |
| CLI-003 | feature | P0 | Billing Entity 연결 | RP04.P02.M03.S01 | RP04.P05.M07.S01 | RP04.P08.M08.S01 | RP04.P09.M09.S01 |
| CLI-004 | feature | P0 | Relationship Partner 지정 | RP04.P02.M03.S01 | RP04.P05.M07.S01 | RP04.P08.M08.S01 | RP04.P09.M09.S01 |
| CLI-005 | feature | P1 | Client 상태관리 | RP04.P02.M03.S01 | RP04.P05.M07.S01 | RP04.P08.M08.S01 | RP04.P09.M09.S01 |
| CLI-006 | feature | P1 | 고객별 매출 | RP04.P02.M03.S01 | RP04.P05.M07.S01 | RP04.P08.M08.S01 | RP04.P09.M09.S01 |
| CLI-007 | feature | P2 | 고객별 수익성 | RP04.P02.M03.S01 | RP04.P05.M07.S01 | RP04.P08.M08.S01 | RP04.P09.M09.S01 |
| CLI-008 | feature | P2 | Key Account Plan | RP04.P02.M03.S01 | RP04.P05.M07.S01 | RP04.P08.M08.S01 | RP04.P09.M09.S01 |
| CON-001 | feature | P0 | Contact 등록 | RP04.P02.M03.S01 | RP04.P05.M07.S01 | RP04.P08.M08.S01 | RP04.P09.M09.S01 |
| CON-002 | feature | P1 | 소속 이력 | RP04.P02.M03.S01 | RP04.P05.M07.S01 | RP04.P08.M08.S01 | RP04.P09.M09.S01 |
| CON-003 | feature | P0 | 관계 owner | RP04.P02.M03.S01 | RP04.P05.M07.S01 | RP04.P08.M08.S01 | RP04.P09.M09.S01 |
| CON-004 | feature | P0 | 접촉 이력 | RP04.P02.M03.S01 | RP04.P05.M07.S01 | RP04.P08.M08.S01 | RP04.P09.M09.S01 |
| CON-005 | feature | P1 | 수신동의 | RP04.P02.M03.S01 | RP04.P05.M07.S01 | RP04.P08.M08.S01 | RP04.P09.M09.S01 |
| CON-006 | feature | P2 | 관계강도 | RP04.P02.M03.S01 | RP04.P05.M07.S01 | RP04.P08.M08.S01 | RP04.P09.M09.S01 |
| CON-007 | feature | P1 | 개인정보 최소화 | RP04.P02.M03.S01 | RP04.P05.M07.S01 | RP04.P08.M08.S01 | RP04.P09.M09.S01 |
| LEAD-001 | feature | P1 | Lead 생성 | RP09.P02.M03.S01 | RP09.P05.M07.S01 | RP09.P08.M08.S01 | RP09.P09.M09.S01 |
| LEAD-002 | feature | P1 | Lead Source | RP09.P02.M03.S01 | RP09.P05.M07.S01 | RP09.P08.M08.S01 | RP09.P09.M09.S01 |
| LEAD-003 | feature | P1 | Lead Assignment | RP09.P02.M03.S01 | RP09.P05.M07.S01 | RP09.P08.M08.S01 | RP09.P09.M09.S01 |
| LEAD-004 | feature | P1 | Qualification | RP09.P02.M03.S01 | RP09.P05.M07.S01 | RP09.P08.M08.S01 | RP09.P09.M09.S01 |
| LEAD-005 | feature | P1 | Lead Conversion | RP09.P02.M03.S01 | RP09.P05.M07.S01 | RP09.P08.M08.S01 | RP09.P09.M09.S01 |
| OPP-001 | feature | P0 | Opportunity 생성 | RP09.P02.M03.S01 | RP09.P05.M07.S01 | RP09.P08.M08.S01 | RP09.P09.M09.S01 |
| OPP-002 | feature | P0 | Pipeline 단계관리 | RP09.P02.M03.S01 | RP09.P05.M07.S01 | RP09.P08.M08.S01 | RP09.P09.M09.S01 |
| OPP-003 | feature | P0 | 예상 보수 | RP09.P02.M03.S01 | RP09.P05.M07.S01 | RP09.P08.M08.S01 | RP09.P09.M09.S01 |
| OPP-004 | feature | P1 | 수임 가능성 | RP09.P02.M03.S01 | RP09.P05.M07.S01 | RP09.P08.M08.S01 | RP09.P09.M09.S01 |
| OPP-005 | feature | P1 | 예상 종결일 | RP09.P02.M03.S01 | RP09.P05.M07.S01 | RP09.P08.M08.S01 | RP09.P09.M09.S01 |
| OPP-006 | feature | P0 | 관련 당사자 | RP09.P02.M03.S01 | RP09.P05.M07.S01 | RP09.P08.M08.S01 | RP09.P09.M09.S01 |
| OPP-007 | feature | P0 | 제안서 연결 | RP09.P02.M03.S01 | RP09.P05.M07.S01 | RP09.P08.M08.S01 | RP09.P09.M09.S01 |
| OPP-008 | feature | P0 | Matter 전환 | RP09.P02.M03.S01 | RP09.P05.M07.S01 | RP09.P08.M08.S01 | RP09.P09.M09.S01 |
| OPP-009 | feature | P1 | Lost reason | RP09.P02.M03.S01 | RP09.P05.M07.S01 | RP09.P08.M08.S01 | RP09.P09.M09.S01 |
| OPP-010 | feature | P2 | 경쟁 로펌 | RP09.P02.M03.S01 | RP09.P05.M07.S01 | RP09.P08.M08.S01 | RP09.P09.M09.S01 |
| PROP-001 | feature | P1 | 제안서 생성 | RP09.P02.M03.S01 | RP09.P05.M07.S01 | RP09.P08.M08.S01 | RP09.P09.M09.S01 |
| PROP-002 | feature | P1 | 견적서 생성 | RP09.P02.M03.S01 | RP09.P05.M07.S01 | RP09.P08.M08.S01 | RP09.P09.M09.S01 |
| PROP-003 | feature | P0 | 버전관리 | RP09.P02.M03.S01 | RP09.P05.M07.S01 | RP09.P08.M08.S01 | RP09.P09.M09.S01 |
| PROP-004 | feature | P1 | 제출 이력 | RP09.P02.M03.S01 | RP09.P05.M07.S01 | RP09.P08.M08.S01 | RP09.P09.M09.S01 |
| PROP-005 | feature | P1 | 제출승인 | RP09.P02.M03.S01 | RP09.P05.M07.S01 | RP09.P08.M08.S01 | RP09.P09.M09.S01 |
| PROP-006 | feature | P1 | 수임조건 이관 | RP09.P02.M03.S01 | RP09.P05.M07.S01 | RP09.P08.M08.S01 | RP09.P09.M09.S01 |
| PROP-007 | feature | P2 | RFP 관리 | RP09.P02.M03.S01 | RP09.P05.M07.S01 | RP09.P08.M08.S01 | RP09.P09.M09.S01 |
| REF-001 | feature | P1 | 소개자 기록 | RP09.P02.M03.S01 | RP09.P05.M07.S01 | RP09.P08.M08.S01 | RP09.P09.M09.S01 |
| REF-002 | feature | P0 | 유치기여자 | RP09.P02.M03.S01 | RP09.P05.M07.S01 | RP09.P08.M08.S01 | RP09.P09.M09.S01 |
| REF-003 | feature | P1 | 공동유치 | RP09.P02.M03.S01 | RP09.P05.M07.S01 | RP09.P08.M08.S01 | RP09.P09.M09.S01 |
| REF-004 | feature | P1 | 정산 연결 | RP09.P02.M03.S01 | RP09.P05.M07.S01 | RP09.P08.M08.S01 | RP09.P09.M09.S01 |
| REF-005 | feature | P1 | 외부소개 검토 플래그 | RP09.P02.M03.S01 | RP09.P05.M07.S01 | RP09.P08.M08.S01 | RP09.P09.M09.S01 |
| REF-006 | feature | P1 | 근거문서 연결 | RP09.P02.M03.S01 | RP09.P05.M07.S01 | RP09.P08.M08.S01 | RP09.P09.M09.S01 |
| CAM-001 | feature | P2 | 뉴스레터 대상자 | RP09.P02.M03.S01 | RP09.P05.M07.S01 | RP09.P08.M08.S01 | RP09.P09.M09.S01 |
| CAM-002 | feature | P2 | 발송이력 | RP09.P02.M03.S01 | RP09.P05.M07.S01 | RP09.P08.M08.S01 | RP09.P09.M09.S01 |
| CAM-003 | feature | P2 | 행사관리 | RP09.P02.M03.S01 | RP09.P05.M07.S01 | RP09.P08.M08.S01 | RP09.P09.M09.S01 |
| CAM-004 | feature | P3 | 캠페인 기여분석 | RP09.P02.M03.S01 | RP09.P05.M07.S01 | RP09.P08.M08.S01 | RP09.P09.M09.S01 |
| REL-001 | feature | P2 | 휴면고객 알림 | RP09.P02.M03.S01 | RP09.P05.M07.S01 | RP09.P08.M08.S01 | RP09.P09.M09.S01 |
| REL-002 | feature | P3 | Cross-sell 추천 | RP09.P02.M03.S01 | RP09.P05.M07.S01 | RP09.P08.M08.S01 | RP09.P09.M09.S01 |
| REL-003 | feature | P2 | 관계맵 | RP09.P02.M03.S01 | RP09.P05.M07.S01 | RP09.P08.M08.S01 | RP09.P09.M09.S01 |
| CONF-001 | feature | P0 | Conflict 요청 | RP10.P02.M03.S01 | RP10.P05.M07.S01 | RP10.P08.M08.S01 | RP10.P09.M09.S01 |
| CONF-002 | feature | P0 | 당사자 검색 | RP10.P02.M03.S01 | RP10.P05.M07.S01 | RP10.P08.M08.S01 | RP10.P09.M09.S01 |
| CONF-003 | feature | P0 | Alias 검색 | RP10.P02.M03.S01 | RP10.P05.M07.S01 | RP10.P08.M08.S01 | RP10.P09.M09.S01 |
| CONF-004 | feature | P1 | DMS 검색 | RP10.P02.M03.S01 | RP10.P05.M07.S01 | RP10.P08.M08.S01 | RP10.P09.M09.S01 |
| CONF-005 | feature | P0 | Hit 분류 | RP10.P02.M03.S01 | RP10.P05.M07.S01 | RP10.P08.M08.S01 | RP10.P09.M09.S01 |
| CONF-006 | feature | P1 | Waiver 관리 | RP10.P02.M03.S01 | RP10.P05.M07.S01 | RP10.P08.M08.S01 | RP10.P09.M09.S01 |
| CONF-007 | feature | P1 | Ethical Wall 생성 | RP10.P02.M03.S01 | RP10.P05.M07.S01 | RP10.P08.M08.S01 | RP10.P09.M09.S01 |
| CONF-008 | feature | P0 | 승인 이력 | RP10.P02.M03.S01 | RP10.P05.M07.S01 | RP10.P08.M08.S01 | RP10.P09.M09.S01 |
| CONF-009 | feature | P1 | 재검토 trigger | RP10.P02.M03.S01 | RP10.P05.M07.S01 | RP10.P08.M08.S01 | RP10.P09.M09.S01 |
| ENG-001 | feature | P0 | 수임승인 요청 | RP10.P02.M03.S01 | RP10.P05.M07.S01 | RP10.P08.M08.S01 | RP10.P09.M09.S01 |
| ENG-002 | feature | P0 | 업무범위 입력 | RP10.P02.M03.S01 | RP10.P05.M07.S01 | RP10.P08.M08.S01 | RP10.P09.M09.S01 |
| ENG-003 | feature | P0 | 보수조건 입력 | RP10.P02.M03.S01 | RP10.P05.M07.S01 | RP10.P08.M08.S01 | RP10.P09.M09.S01 |
| ENG-004 | feature | P0 | 청구처 지정 | RP10.P02.M03.S01 | RP10.P05.M07.S01 | RP10.P08.M08.S01 | RP10.P09.M09.S01 |
| ENG-005 | feature | P1 | 위험도 평가 | RP10.P02.M03.S01 | RP10.P05.M07.S01 | RP10.P08.M08.S01 | RP10.P09.M09.S01 |
| ENG-006 | feature | P1 | 수임계약서 생성 | RP10.P02.M03.S01 | RP10.P05.M07.S01 | RP10.P08.M08.S01 | RP10.P09.M09.S01 |
| ENG-007 | feature | P0 | 수임조건 확정 | RP10.P02.M03.S01 | RP10.P05.M07.S01 | RP10.P08.M08.S01 | RP10.P09.M09.S01 |
| ENG-008 | feature | P1 | 서명본 관리 | RP10.P02.M03.S01 | RP10.P05.M07.S01 | RP10.P08.M08.S01 | RP10.P09.M09.S01 |
| MAT-001 | feature | P0 | Matter 생성 | RP05.P02.M03.S01 | RP05.P05.M07.S01 | RP05.P08.M08.S01 | RP05.P09.M09.S01 |
| MAT-002 | feature | P0 | Workspace 자동 생성 | RP05.P02.M03.S01 | RP05.P05.M07.S01 | RP05.P08.M08.S01 | RP05.P09.M09.S01 |
| MAT-003 | feature | P0 | 담당자 관리 | RP05.P02.M03.S01 | RP05.P05.M07.S01 | RP05.P08.M08.S01 | RP05.P09.M09.S01 |
| MAT-004 | feature | P0 | 권한 자동부여 | RP05.P02.M03.S01 | RP05.P05.M07.S01 | RP05.P08.M08.S01 | RP05.P09.M09.S01 |
| MAT-005 | feature | P0 | 상태관리 | RP05.P02.M03.S01 | RP05.P05.M07.S01 | RP05.P08.M08.S01 | RP05.P09.M09.S01 |
| MAT-006 | feature | P1 | Task 관리 | RP05.P02.M03.S01 | RP05.P05.M07.S01 | RP05.P08.M08.S01 | RP05.P09.M09.S01 |
| MAT-007 | feature | P1 | Calendar | RP05.P02.M03.S01 | RP05.P05.M07.S01 | RP05.P08.M08.S01 | RP05.P09.M09.S01 |
| MAT-008 | feature | P1 | Checklist | RP05.P02.M03.S01 | RP05.P05.M07.S01 | RP05.P08.M08.S01 | RP05.P09.M09.S01 |
| MAT-009 | feature | P1 | Matter Note | RP05.P02.M03.S01 | RP05.P05.M07.S01 | RP05.P08.M08.S01 | RP05.P09.M09.S01 |
| MAT-010 | feature | P1 | Matter Closing | RP05.P02.M03.S01 | RP05.P05.M07.S01 | RP05.P08.M08.S01 | RP05.P09.M09.S01 |
| DOC-001 | feature | P0 | 업로드 | RP06.P02.M03.S01 | RP06.P05.M07.S01 | RP06.P08.M08.S01 | RP06.P09.M09.S01 |
| DOC-002 | feature | P0 | 다운로드 | RP06.P02.M03.S01 | RP06.P05.M07.S01 | RP06.P08.M08.S01 | RP06.P09.M09.S01 |
| DOC-003 | feature | P0 | 미리보기 | RP06.P02.M03.S01 | RP06.P05.M07.S01 | RP06.P08.M08.S01 | RP06.P09.M09.S01 |
| DOC-004 | feature | P0 | 버전관리 | RP06.P02.M03.S01 | RP06.P05.M07.S01 | RP06.P08.M08.S01 | RP06.P09.M09.S01 |
| DOC-005 | feature | P1 | check-in/out | RP06.P02.M03.S01 | RP06.P05.M07.S01 | RP06.P08.M08.S01 | RP06.P09.M09.S01 |
| DOC-006 | feature | P0 | 문서상태 | RP06.P02.M03.S01 | RP06.P05.M07.S01 | RP06.P08.M08.S01 | RP06.P09.M09.S01 |
| DOC-007 | feature | P0 | 문서번호 | RP06.P02.M03.S01 | RP06.P05.M07.S01 | RP06.P08.M08.S01 | RP06.P09.M09.S01 |
| DOC-008 | feature | P0 | 파일해시 | RP06.P02.M03.S01 | RP06.P05.M07.S01 | RP06.P08.M08.S01 | RP06.P09.M09.S01 |
| DOC-009 | feature | P1 | 중복탐지 | RP06.P02.M03.S01 | RP06.P05.M07.S01 | RP06.P08.M08.S01 | RP06.P09.M09.S01 |
| DOC-010 | feature | P1 | 비교 | RP06.P02.M03.S01 | RP06.P05.M07.S01 | RP06.P08.M08.S01 | RP06.P09.M09.S01 |
| DOC-011 | feature | P1 | 변환 | RP06.P02.M03.S01 | RP06.P05.M07.S01 | RP06.P08.M08.S01 | RP06.P09.M09.S01 |
| DOC-012 | feature | P0 | 원본보존 | RP06.P02.M03.S01 | RP06.P05.M07.S01 | RP06.P08.M08.S01 | RP06.P09.M09.S01 |
| DOC-013 | feature | P1 | 대량업로드 | RP06.P02.M03.S01 | RP06.P05.M07.S01 | RP06.P08.M08.S01 | RP06.P09.M09.S01 |
| DOC-014 | feature | P1 | 문서관계 | RP06.P02.M03.S01 | RP06.P05.M07.S01 | RP06.P08.M08.S01 | RP06.P09.M09.S01 |
| DOC-015 | feature | P2 | 조항 추출 | RP06.P02.M03.S01 | RP06.P05.M07.S01 | RP06.P08.M08.S01 | RP06.P09.M09.S01 |
| DOC-016 | feature | P2 | 선례 지정 | RP06.P02.M03.S01 | RP06.P05.M07.S01 | RP06.P08.M08.S01 | RP06.P09.M09.S01 |
| EML-001 | feature | P1 | Outlook Add-in | RP08.P02.M03.S01 | RP08.P05.M07.S01 | RP08.P08.M08.S01 | RP08.P09.M09.S01 |
| EML-002 | feature | P2 | Gmail Add-in | RP08.P02.M03.S01 | RP08.P05.M07.S01 | RP08.P08.M08.S01 | RP08.P09.M09.S01 |
| EML-003 | feature | P1 | Matter 추천 | RP08.P02.M03.S01 | RP08.P05.M07.S01 | RP08.P08.M08.S01 | RP08.P09.M09.S01 |
| EML-004 | feature | P1 | Thread filing | RP08.P02.M03.S01 | RP08.P05.M07.S01 | RP08.P08.M08.S01 | RP08.P09.M09.S01 |
| EML-005 | feature | P1 | Sent filing | RP08.P02.M03.S01 | RP08.P05.M07.S01 | RP08.P08.M08.S01 | RP08.P09.M09.S01 |
| EML-006 | feature | P1 | Attachment extraction | RP08.P02.M03.S01 | RP08.P05.M07.S01 | RP08.P08.M08.S01 | RP08.P09.M09.S01 |
| EML-007 | feature | P1 | 중복방지 | RP08.P02.M03.S01 | RP08.P05.M07.S01 | RP08.P08.M08.S01 | RP08.P09.M09.S01 |
| EML-008 | feature | P1 | Email search | RP08.P02.M03.S01 | RP08.P05.M07.S01 | RP08.P08.M08.S01 | RP08.P09.M09.S01 |
| EML-009 | feature | P2 | Email-to-task | RP08.P02.M03.S01 | RP08.P05.M07.S01 | RP08.P08.M08.S01 | RP08.P09.M09.S01 |
| EML-010 | feature | P2 | Negotiation summary | RP08.P02.M03.S01 | RP08.P05.M07.S01 | RP08.P08.M08.S01 | RP08.P09.M09.S01 |
| SRCH-001 | feature | P0 | 기본검색 | RP07.P02.M03.S01 | RP07.P05.M07.S01 | RP07.P08.M08.S01 | RP07.P09.M09.S01 |
| SRCH-002 | feature | P0 | 메타데이터 필터 | RP07.P02.M03.S01 | RP07.P05.M07.S01 | RP07.P08.M08.S01 | RP07.P09.M09.S01 |
| SRCH-003 | feature | P1 | OCR 검색 | RP07.P02.M03.S01 | RP07.P05.M07.S01 | RP07.P08.M08.S01 | RP07.P09.M09.S01 |
| SRCH-004 | feature | P1 | 이메일 검색 | RP07.P02.M03.S01 | RP07.P05.M07.S01 | RP07.P08.M08.S01 | RP07.P09.M09.S01 |
| SRCH-005 | feature | P2 | 조항검색 | RP07.P02.M03.S01 | RP07.P05.M07.S01 | RP07.P08.M08.S01 | RP07.P09.M09.S01 |
| SRCH-006 | feature | P2 | 의미검색 | RP07.P02.M03.S01 | RP07.P05.M07.S01 | RP07.P08.M08.S01 | RP07.P09.M09.S01 |
| SRCH-007 | feature | P0 | 보안 trimming | RP07.P02.M03.S01 | RP07.P05.M07.S01 | RP07.P08.M08.S01 | RP07.P09.M09.S01 |
| SRCH-008 | feature | P1 | 검색로그 | RP07.P02.M03.S01 | RP07.P05.M07.S01 | RP07.P08.M08.S01 | RP07.P09.M09.S01 |
| TIME-001 | feature | P0 | 타임 입력 | RP11.P02.M03.S01 | RP11.P05.M07.S01 | RP11.P08.M08.S01 | RP11.P09.M09.S01 |
| TIME-002 | feature | P1 | Timer | RP11.P02.M03.S01 | RP11.P05.M07.S01 | RP11.P08.M08.S01 | RP11.P09.M09.S01 |
| TIME-003 | feature | P0 | Billable 여부 | RP11.P02.M03.S01 | RP11.P05.M07.S01 | RP11.P08.M08.S01 | RP11.P09.M09.S01 |
| TIME-004 | feature | P0 | Task code | RP11.P02.M03.S01 | RP11.P05.M07.S01 | RP11.P08.M08.S01 | RP11.P09.M09.S01 |
| TIME-005 | feature | P1 | 승인 | RP11.P02.M03.S01 | RP11.P05.M07.S01 | RP11.P08.M08.S01 | RP11.P09.M09.S01 |
| TIME-006 | feature | P0 | 마감 후 잠금 | RP11.P02.M03.S01 | RP11.P05.M07.S01 | RP11.P08.M08.S01 | RP11.P09.M09.S01 |
| TIME-007 | feature | P0 | Write-down | RP11.P02.M03.S01 | RP11.P05.M07.S01 | RP11.P08.M08.S01 | RP11.P09.M09.S01 |
| TIME-008 | feature | P0 | Write-off | RP11.P02.M03.S01 | RP11.P05.M07.S01 | RP11.P08.M08.S01 | RP11.P09.M09.S01 |
| TIME-009 | feature | P2 | AI narrative 개선 | RP11.P02.M03.S01 | RP11.P05.M07.S01 | RP11.P08.M08.S01 | RP11.P09.M09.S01 |
| TIME-010 | feature | P2 | Calendar 기반 추천 | RP11.P02.M03.S01 | RP11.P05.M07.S01 | RP11.P08.M08.S01 | RP11.P09.M09.S01 |
| EXP-001 | feature | P0 | 비용 등록 | RP11.P02.M03.S01 | RP11.P05.M07.S01 | RP11.P08.M08.S01 | RP11.P09.M09.S01 |
| EXP-002 | feature | P0 | 대납금 구분 | RP11.P02.M03.S01 | RP11.P05.M07.S01 | RP11.P08.M08.S01 | RP11.P09.M09.S01 |
| EXP-003 | feature | P0 | 청구 가능 여부 | RP11.P02.M03.S01 | RP11.P05.M07.S01 | RP11.P08.M08.S01 | RP11.P09.M09.S01 |
| EXP-004 | feature | P0 | 승인 workflow | RP11.P02.M03.S01 | RP11.P05.M07.S01 | RP11.P08.M08.S01 | RP11.P09.M09.S01 |
| EXP-005 | feature | P1 | 법인카드 import | RP11.P02.M03.S01 | RP11.P05.M07.S01 | RP11.P08.M08.S01 | RP11.P09.M09.S01 |
| EXP-006 | feature | P1 | OCR | RP11.P02.M03.S01 | RP11.P05.M07.S01 | RP11.P08.M08.S01 | RP11.P09.M09.S01 |
| EXP-007 | feature | P1 | 비용정책 검사 | RP11.P02.M03.S01 | RP11.P05.M07.S01 | RP11.P08.M08.S01 | RP11.P09.M09.S01 |
| EXP-008 | feature | P1 | 외주업체 청구서 | RP11.P02.M03.S01 | RP11.P05.M07.S01 | RP11.P08.M08.S01 | RP11.P09.M09.S01 |
| EXP-009 | feature | P0 | 비용 근거문서 연결 | RP11.P02.M03.S01 | RP11.P05.M07.S01 | RP11.P08.M08.S01 | RP11.P09.M09.S01 |
| BILL-001 | feature | P0 | Proforma 생성 | RP12.P02.M03.S01 | RP12.P05.M07.S01 | RP12.P08.M08.S01 | RP12.P09.M09.S01 |
| BILL-002 | feature | P0 | Partner review | RP12.P02.M03.S01 | RP12.P05.M07.S01 | RP12.P08.M08.S01 | RP12.P09.M09.S01 |
| BILL-003 | feature | P0 | Invoice 확정 | RP12.P02.M03.S01 | RP12.P05.M07.S01 | RP12.P08.M08.S01 | RP12.P09.M09.S01 |
| BILL-004 | feature | P0 | Hourly billing | RP12.P02.M03.S01 | RP12.P05.M07.S01 | RP12.P08.M08.S01 | RP12.P09.M09.S01 |
| BILL-005 | feature | P0 | Fixed fee billing | RP12.P02.M03.S01 | RP12.P05.M07.S01 | RP12.P08.M08.S01 | RP12.P09.M09.S01 |
| BILL-006 | feature | P1 | Retainer drawdown | RP12.P02.M03.S01 | RP12.P05.M07.S01 | RP12.P08.M08.S01 | RP12.P09.M09.S01 |
| BILL-007 | feature | P1 | Success fee billing | RP12.P02.M03.S01 | RP12.P05.M07.S01 | RP12.P08.M08.S01 | RP12.P09.M09.S01 |
| BILL-008 | feature | P0 | Expense billing | RP12.P02.M03.S01 | RP12.P05.M07.S01 | RP12.P08.M08.S01 | RP12.P09.M09.S01 |
| BILL-009 | feature | P1 | Split billing | RP12.P02.M03.S01 | RP12.P05.M07.S01 | RP12.P08.M08.S01 | RP12.P09.M09.S01 |
| BILL-010 | feature | P1 | Consolidated billing | RP12.P02.M03.S01 | RP12.P05.M07.S01 | RP12.P08.M08.S01 | RP12.P09.M09.S01 |
| BILL-011 | feature | P1 | Tax invoice 연동 | RP12.P02.M03.S01 | RP12.P05.M07.S01 | RP12.P08.M08.S01 | RP12.P09.M09.S01 |
| BILL-012 | feature | P0 | 청구서 DMS 보관 | RP12.P02.M03.S01 | RP12.P05.M07.S01 | RP12.P08.M08.S01 | RP12.P09.M09.S01 |
| PAY-001 | feature | P0 | 입금 등록 | RP13.P02.M03.S01 | RP13.P05.M07.S01 | RP13.P08.M08.S01 | RP13.P09.M09.S01 |
| PAY-002 | feature | P0 | Invoice 매칭 | RP13.P02.M03.S01 | RP13.P05.M07.S01 | RP13.P08.M08.S01 | RP13.P09.M09.S01 |
| PAY-003 | feature | P0 | 부분입금 | RP13.P02.M03.S01 | RP13.P05.M07.S01 | RP13.P08.M08.S01 | RP13.P09.M09.S01 |
| PAY-004 | feature | P1 | 초과입금 | RP13.P02.M03.S01 | RP13.P05.M07.S01 | RP13.P08.M08.S01 | RP13.P09.M09.S01 |
| PAY-005 | feature | P0 | AR aging | RP13.P02.M03.S01 | RP13.P05.M07.S01 | RP13.P08.M08.S01 | RP13.P09.M09.S01 |
| PAY-006 | feature | P1 | 독촉관리 | RP13.P02.M03.S01 | RP13.P05.M07.S01 | RP13.P08.M08.S01 | RP13.P09.M09.S01 |
| PAY-007 | feature | P1 | 장기미수 경고 | RP13.P02.M03.S01 | RP13.P05.M07.S01 | RP13.P08.M08.S01 | RP13.P09.M09.S01 |
| PAY-008 | feature | P1 | Write-off 승인 | RP13.P02.M03.S01 | RP13.P05.M07.S01 | RP13.P08.M08.S01 | RP13.P09.M09.S01 |
| PAY-009 | feature | P2 | 현금흐름 예측 | RP13.P02.M03.S01 | RP13.P05.M07.S01 | RP13.P08.M08.S01 | RP13.P09.M09.S01 |
| ACC-001 | feature | P1 | 계정과목 관리 | RP13.P02.M03.S01 | RP13.P05.M07.S01 | RP13.P08.M08.S01 | RP13.P09.M09.S01 |
| ACC-002 | feature | P1 | 전표 자동생성 | RP13.P02.M03.S01 | RP13.P05.M07.S01 | RP13.P08.M08.S01 | RP13.P09.M09.S01 |
| ACC-003 | feature | P1 | 회계자료 export | RP13.P02.M03.S01 | RP13.P05.M07.S01 | RP13.P08.M08.S01 | RP13.P09.M09.S01 |
| ACC-004 | feature | P0 | 월마감 | RP13.P02.M03.S01 | RP13.P05.M07.S01 | RP13.P08.M08.S01 | RP13.P09.M09.S01 |
| ACC-005 | feature | P1 | 부가세 자료 | RP13.P02.M03.S01 | RP13.P05.M07.S01 | RP13.P08.M08.S01 | RP13.P09.M09.S01 |
| ACC-006 | feature | P2 | 원천세 자료 | RP13.P02.M03.S01 | RP13.P05.M07.S01 | RP13.P08.M08.S01 | RP13.P09.M09.S01 |
| ACC-007 | feature | P3 | 자체 장부 | RP13.P02.M03.S01 | RP13.P05.M07.S01 | RP13.P08.M08.S01 | RP13.P09.M09.S01 |
| SET-001 | feature | P1 | 정산규칙 설정 | RP14.P02.M03.S01 | RP14.P05.M07.S01 | RP14.P08.M08.S01 | RP14.P09.M09.S01 |
| SET-002 | feature | P1 | 유치기여 비율 | RP14.P02.M03.S01 | RP14.P05.M07.S01 | RP14.P08.M08.S01 | RP14.P09.M09.S01 |
| SET-003 | feature | P1 | 실무기여 계산 | RP14.P02.M03.S01 | RP14.P05.M07.S01 | RP14.P08.M08.S01 | RP14.P09.M09.S01 |
| SET-004 | feature | P1 | 비용 차감 | RP14.P02.M03.S01 | RP14.P05.M07.S01 | RP14.P08.M08.S01 | RP14.P09.M09.S01 |
| SET-005 | feature | P1 | 정산 preview | RP14.P02.M03.S01 | RP14.P05.M07.S01 | RP14.P08.M08.S01 | RP14.P09.M09.S01 |
| SET-006 | feature | P1 | 정산 확정 | RP14.P02.M03.S01 | RP14.P05.M07.S01 | RP14.P08.M08.S01 | RP14.P09.M09.S01 |
| SET-007 | feature | P1 | 정산 근거문서 | RP14.P02.M03.S01 | RP14.P05.M07.S01 | RP14.P08.M08.S01 | RP14.P09.M09.S01 |
| SET-008 | feature | P2 | 이의제기 workflow | RP14.P02.M03.S01 | RP14.P05.M07.S01 | RP14.P08.M08.S01 | RP14.P09.M09.S01 |
| SET-009 | feature | P2 | 시뮬레이션 | RP14.P02.M03.S01 | RP14.P05.M07.S01 | RP14.P08.M08.S01 | RP14.P09.M09.S01 |
| AI-001 | feature | P2 | Matter AI Search | RP17.P02.M03.S01 | RP17.P05.M07.S01 | RP17.P08.M08.S01 | RP17.P09.M09.S01 |
| AI-002 | feature | P2 | Firmwide Precedent Search | RP17.P02.M03.S01 | RP17.P05.M07.S01 | RP17.P08.M08.S01 | RP17.P09.M09.S01 |
| AI-003 | feature | P2 | Clause Search | RP17.P02.M03.S01 | RP17.P05.M07.S01 | RP17.P08.M08.S01 | RP17.P09.M09.S01 |
| AI-004 | feature | P2 | Document Summary | RP17.P02.M03.S01 | RP17.P05.M07.S01 | RP17.P08.M08.S01 | RP17.P09.M09.S01 |
| AI-005 | feature | P2 | Email Thread Summary | RP17.P02.M03.S01 | RP17.P05.M07.S01 | RP17.P08.M08.S01 | RP17.P09.M09.S01 |
| AI-006 | feature | P2 | Markup Analyzer | RP17.P02.M03.S01 | RP17.P05.M07.S01 | RP17.P08.M08.S01 | RP17.P09.M09.S01 |
| AI-007 | feature | P3 | DD Issue Extraction | RP17.P02.M03.S01 | RP17.P05.M07.S01 | RP17.P08.M08.S01 | RP17.P09.M09.S01 |
| AI-008 | feature | P3 | Contract Drafting | RP17.P02.M03.S01 | RP17.P05.M07.S01 | RP17.P08.M08.S01 | RP17.P09.M09.S01 |
| AI-009 | feature | P3 | Litigation Assist | RP17.P02.M03.S01 | RP17.P05.M07.S01 | RP17.P08.M08.S01 | RP17.P09.M09.S01 |
| AI-010 | feature | P3 | Report Generator | RP17.P02.M03.S01 | RP17.P05.M07.S01 | RP17.P08.M08.S01 | RP17.P09.M09.S01 |
| AI-011 | feature | P2 | Billing Narrative AI | RP17.P02.M03.S01 | RP17.P05.M07.S01 | RP17.P08.M08.S01 | RP17.P09.M09.S01 |
| AI-012 | feature | P3 | Settlement anomaly | RP17.P02.M03.S01 | RP17.P05.M07.S01 | RP17.P08.M08.S01 | RP17.P09.M09.S01 |
| NARR-001 | narrative | P1 | 시스템 역할 17종 | RP01.P02.M03.S01 | RP01.P05.M07.S01 | RP01.P08.M08.S01 | RP01.P09.M09.S01 |
| NARR-002 | narrative | P1 | 권한 5계층 및 우선순위 | RP02.P02.M03.S01 | RP02.P05.M07.S01 | RP02.P08.M08.S01 | RP02.P09.M09.S01 |
| NARR-003 | narrative | P1 | 핵심 데이터 모델 전체 | RP01.P02.M03.S01 | RP01.P05.M07.S01 | RP01.P08.M08.S01 | RP01.P09.M09.S01 |
| NARR-004 | narrative | P1 | Analytics 대시보드와 수익성 | RP15.P02.M03.S01 | RP15.P05.M07.S01 | RP15.P08.M08.S01 | RP15.P09.M09.S01 |
| NARR-005 | narrative | P1 | 주요 업무 workflow | RP05.P02.M03.S01 | RP05.P05.M07.S01 | RP05.P08.M08.S01 | RP05.P09.M09.S01 |
| NARR-006 | narrative | P1 | 화면 설계 | RP15.P04.M03.S01 | RP15.P05.M07.S01 | RP15.P08.M08.S01 | RP15.P09.M09.S01 |
| NARR-007 | narrative | P1 | 보안 컴플라이언스 | RP16.P06.M05.S01 | RP16.P05.M07.S01 | RP16.P08.M08.S01 | RP16.P09.M09.S01 |
| NARR-008 | narrative | P1 | 개인정보 관리 | RP04.P06.M05.S01 | RP04.P05.M07.S01 | RP04.P08.M08.S01 | RP04.P09.M09.S01 |
| NARR-009 | narrative | P1 | 감사로그 이벤트 | RP03.P06.M05.S01 | RP03.P05.M07.S01 | RP03.P08.M08.S01 | RP03.P09.M09.S01 |
| NARR-010 | narrative | P1 | 성능 목표 | RP06.P07.M07.S01 | RP06.P05.M07.S01 | RP06.P08.M08.S01 | RP06.P09.M09.S01 |
| NARR-011 | narrative | P1 | 가용성/RPO/RTO/DR | RP26.P07.M07.S01 | RP26.P05.M07.S01 | RP26.P08.M08.S01 | RP26.P09.M09.S01 |
| NARR-012 | narrative | P1 | 확장성 목표 | RP26.P07.M07.S01 | RP26.P05.M07.S01 | RP26.P08.M08.S01 | RP26.P09.M09.S01 |
| NARR-013 | narrative | P1 | 권장 기술 아키텍처 | RP26.P07.M02.S01 | RP26.P05.M07.S01 | RP26.P08.M08.S01 | RP26.P09.M09.S01 |
| NARR-014 | narrative | P1 | 외부 연동 | RP08.P02.M03.S01 | RP08.P05.M07.S01 | RP08.P08.M08.S01 | RP08.P09.M09.S01 |
| NARR-015 | narrative | P1 | 한국형 로펌 특화 | RP20.P02.M03.S01 | RP20.P05.M07.S01 | RP20.P08.M08.S01 | RP20.P09.M09.S01 |
| NARR-016 | narrative | P1 | 로펌 경영 특화 | RP12.P02.M03.S01 | RP12.P05.M07.S01 | RP12.P08.M08.S01 | RP12.P09.M09.S01 |
| NARR-017 | narrative | P1 | AI-ready DMS | RP06.P02.M03.S01 | RP06.P05.M07.S01 | RP06.P08.M08.S01 | RP06.P09.M09.S01 |
| NARR-018 | narrative | P0 | 착수 전 결정 필요사항 | RP00.P00.M01.S01 | RP00.P05.M07.S01 | RP00.P08.M08.S01 | RP00.P09.M09.S01 |

## Acceptance Detail

### TEN-001: Tenant 생성

- Description: 고객 조직별 tenant 생성
- Acceptance: tenant_id가 발급되고 기본 정책이 자동 생성된다.
- Expected RP: RP00, RP01, RP21, RP26
- Primary implementation subphase: RP00.P02.M03.S01
- Contract subphase: RP00.P00.M01.S01
- Test subphase: RP00.P05.M07.S01
- Hermes subphase: RP00.P08.M08.S01
- Claude subphase: RP00.P09.M09.S01

### TEN-002: 도메인 설정

- Description: 허용 이메일 도메인 등록
- Acceptance: 승인된 도메인 사용자만 초대 가능하다.
- Expected RP: RP00, RP01, RP21, RP26
- Primary implementation subphase: RP00.P02.M03.S01
- Contract subphase: RP00.P00.M01.S01
- Test subphase: RP00.P05.M07.S01
- Hermes subphase: RP00.P08.M08.S01
- Claude subphase: RP00.P09.M09.S01

### TEN-003: 관리자 지정

- Description: tenant owner, security admin, billing admin 지정
- Acceptance: 최소 1명 이상의 tenant owner가 존재해야 한다.
- Expected RP: RP00, RP01, RP21, RP26
- Primary implementation subphase: RP00.P02.M03.S01
- Contract subphase: RP00.P00.M01.S01
- Test subphase: RP00.P05.M07.S01
- Hermes subphase: RP00.P08.M08.S01
- Claude subphase: RP00.P09.M09.S01

### TEN-004: 조직정책

- Description: MFA, 세션만료, IP 제한, 다운로드 제한 설정
- Acceptance: 정책 변경은 즉시 신규 세션에 적용된다.
- Expected RP: RP00, RP01, RP21, RP26
- Primary implementation subphase: RP00.P02.M03.S01
- Contract subphase: RP00.P00.M01.S01
- Test subphase: RP00.P05.M07.S01
- Hermes subphase: RP00.P08.M08.S01
- Claude subphase: RP00.P09.M09.S01

### TEN-005: 데이터 위치 선택

- Description: 한국, 미국, EU 등 region 선택
- Acceptance: 신규 tenant 생성 시 region을 선택할 수 있다.
- Expected RP: RP00, RP01, RP21, RP26
- Primary implementation subphase: RP00.P02.M03.S01
- Contract subphase: RP00.P00.M01.S01
- Test subphase: RP00.P05.M07.S01
- Hermes subphase: RP00.P08.M08.S01
- Claude subphase: RP00.P09.M09.S01

### TEN-006: Dedicated Tenant

- Description: 고객별 DB·storage·index 분리
- Acceptance: Enterprise tenant는 dedicated option을 선택할 수 있다.
- Expected RP: RP00, RP01, RP21, RP26
- Primary implementation subphase: RP00.P02.M03.S01
- Contract subphase: RP00.P00.M01.S01
- Test subphase: RP00.P05.M07.S01
- Hermes subphase: RP00.P08.M08.S01
- Claude subphase: RP00.P09.M09.S01

### TEN-007: Tenant별 암호화키

- Description: KMS key 분리 또는 customer-managed key
- Acceptance: key rotation 이력이 감사로그에 남는다.
- Expected RP: RP00, RP01, RP21, RP26
- Primary implementation subphase: RP00.P02.M03.S01
- Contract subphase: RP00.P00.M01.S01
- Test subphase: RP00.P05.M07.S01
- Hermes subphase: RP00.P08.M08.S01
- Claude subphase: RP00.P09.M09.S01

### TEN-008: Tenant 삭제

- Description: soft delete → retention → purge
- Acceptance: 삭제 요청 후 보존기간 내 복구 가능하다.
- Expected RP: RP00, RP01, RP21, RP26
- Primary implementation subphase: RP00.P02.M03.S01
- Contract subphase: RP00.P00.M01.S01
- Test subphase: RP00.P05.M07.S01
- Hermes subphase: RP00.P08.M08.S01
- Claude subphase: RP00.P09.M09.S01

### USR-001: 사용자 초대

- Description: 이메일 기반 초대
- Acceptance: 초대 링크 만료시간 설정 가능
- Expected RP: RP01, RP02, RP21, RP26
- Primary implementation subphase: RP01.P02.M03.S01
- Contract subphase: RP01.P00.M01.S01
- Test subphase: RP01.P05.M07.S01
- Hermes subphase: RP01.P08.M08.S01
- Claude subphase: RP01.P09.M09.S01

### USR-002: 역할 부여

- Description: 사용자별 role 지정
- Acceptance: 역할 변경 전후가 audit에 기록
- Expected RP: RP01, RP02, RP21, RP26
- Primary implementation subphase: RP01.P02.M03.S01
- Contract subphase: RP01.P00.M01.S01
- Test subphase: RP01.P05.M07.S01
- Hermes subphase: RP01.P08.M08.S01
- Claude subphase: RP01.P09.M09.S01

### USR-003: 그룹 배정

- Description: 팀, 부서, practice group 배정
- Acceptance: 그룹 권한이 검색·문서 접근에 반영
- Expected RP: RP01, RP02, RP21, RP26
- Primary implementation subphase: RP01.P02.M03.S01
- Contract subphase: RP01.P00.M01.S01
- Test subphase: RP01.P05.M07.S01
- Hermes subphase: RP01.P08.M08.S01
- Claude subphase: RP01.P09.M09.S01

### USR-004: 계정 비활성화

- Description: 퇴사자 접근 차단
- Acceptance: 비활성화 즉시 세션 종료
- Expected RP: RP01, RP02, RP21, RP26
- Primary implementation subphase: RP01.P02.M03.S01
- Contract subphase: RP01.P00.M01.S01
- Test subphase: RP01.P05.M07.S01
- Hermes subphase: RP01.P08.M08.S01
- Claude subphase: RP01.P09.M09.S01

### USR-005: 대체 담당자 지정

- Description: 퇴사·휴직 시 matter handover
- Acceptance: 기존 담당 matter 목록을 일괄 이전
- Expected RP: RP01, RP02, RP21, RP26
- Primary implementation subphase: RP01.P02.M03.S01
- Contract subphase: RP01.P00.M01.S01
- Test subphase: RP01.P05.M07.S01
- Hermes subphase: RP01.P08.M08.S01
- Claude subphase: RP01.P09.M09.S01

### USR-006: SSO 연동

- Description: SAML/OIDC
- Acceptance: 고객 IDP로 로그인 가능
- Expected RP: RP01, RP02, RP21, RP26
- Primary implementation subphase: RP01.P02.M03.S01
- Contract subphase: RP01.P00.M01.S01
- Test subphase: RP01.P05.M07.S01
- Hermes subphase: RP01.P08.M08.S01
- Claude subphase: RP01.P09.M09.S01

### USR-007: MFA 정책

- Description: tenant별 MFA 적용
- Acceptance: 보안등급 높은 matter 접근 시 MFA 요구
- Expected RP: RP01, RP02, RP21, RP26
- Primary implementation subphase: RP01.P02.M03.S01
- Contract subphase: RP01.P00.M01.S01
- Test subphase: RP01.P05.M07.S01
- Hermes subphase: RP01.P08.M08.S01
- Claude subphase: RP01.P09.M09.S01

### USR-008: 권한 리뷰

- Description: 정기 권한검토 workflow
- Acceptance: 분기별 권한검토 report 생성
- Expected RP: RP01, RP02, RP21, RP26
- Primary implementation subphase: RP01.P02.M03.S01
- Contract subphase: RP01.P00.M01.S01
- Test subphase: RP01.P05.M07.S01
- Hermes subphase: RP01.P08.M08.S01
- Claude subphase: RP01.P09.M09.S01

### AUD-001: 로그인 로그

- Description: 성공/실패, IP, device
- Acceptance: 로그인 이벤트 검색 가능
- Expected RP: RP03, RP16, RP17, RP29
- Primary implementation subphase: RP03.P02.M03.S01
- Contract subphase: RP03.P00.M01.S01
- Test subphase: RP03.P05.M07.S01
- Hermes subphase: RP03.P08.M08.S01
- Claude subphase: RP03.P09.M09.S01

### AUD-002: 문서 접근 로그

- Description: view, download, upload, delete
- Acceptance: document_id, version_id 포함
- Expected RP: RP03, RP16, RP17, RP29
- Primary implementation subphase: RP03.P02.M03.S01
- Contract subphase: RP03.P00.M01.S01
- Test subphase: RP03.P05.M07.S01
- Hermes subphase: RP03.P08.M08.S01
- Claude subphase: RP03.P09.M09.S01

### AUD-003: 권한변경 로그

- Description: 변경 전후 권한 기록
- Acceptance: actor, 대상, 사유 기록
- Expected RP: RP03, RP16, RP17, RP29
- Primary implementation subphase: RP03.P02.M03.S01
- Contract subphase: RP03.P00.M01.S01
- Test subphase: RP03.P05.M07.S01
- Hermes subphase: RP03.P08.M08.S01
- Claude subphase: RP03.P09.M09.S01

### AUD-004: 청구·입금 로그

- Description: invoice, payment, write-off 변경
- Acceptance: 변경 전후 금액 기록
- Expected RP: RP03, RP16, RP17, RP29
- Primary implementation subphase: RP03.P02.M03.S01
- Contract subphase: RP03.P00.M01.S01
- Test subphase: RP03.P05.M07.S01
- Hermes subphase: RP03.P08.M08.S01
- Claude subphase: RP03.P09.M09.S01

### AUD-005: 정산 로그

- Description: rule, run, approval 변경
- Acceptance: 정산 확정 후 수정 제한
- Expected RP: RP03, RP16, RP17, RP29
- Primary implementation subphase: RP03.P02.M03.S01
- Contract subphase: RP03.P00.M01.S01
- Test subphase: RP03.P05.M07.S01
- Hermes subphase: RP03.P08.M08.S01
- Claude subphase: RP03.P09.M09.S01

### AUD-006: AI 접근 로그

- Description: 질의, 참조문서, 출력, 모델
- Acceptance: AIJob 단위로 재현 가능
- Expected RP: RP03, RP16, RP17, RP29
- Primary implementation subphase: RP03.P02.M03.S01
- Contract subphase: RP03.P00.M01.S01
- Test subphase: RP03.P05.M07.S01
- Hermes subphase: RP03.P08.M08.S01
- Claude subphase: RP03.P09.M09.S01

### AUD-007: 대량반출 탐지

- Description: 다운로드·export 임계치 알림
- Acceptance: security admin에게 알림
- Expected RP: RP03, RP16, RP17, RP29
- Primary implementation subphase: RP03.P02.M03.S01
- Contract subphase: RP03.P00.M01.S01
- Test subphase: RP03.P05.M07.S01
- Hermes subphase: RP03.P08.M08.S01
- Claude subphase: RP03.P09.M09.S01

### AUD-008: 감사 리포트

- Description: CSV/PDF export
- Acceptance: 기간·사용자·object 기준 추출 가능
- Expected RP: RP03, RP16, RP17, RP29
- Primary implementation subphase: RP03.P02.M03.S01
- Contract subphase: RP03.P00.M01.S01
- Test subphase: RP03.P05.M07.S01
- Hermes subphase: RP03.P08.M08.S01
- Claude subphase: RP03.P09.M09.S01

### ENT-001: Entity 생성

- Description: 회사, 개인, 기관, 펀드, SPC 등 등록
- Acceptance: entity_type 필수
- Expected RP: RP04, RP10, RP23
- Primary implementation subphase: RP04.P02.M03.S01
- Contract subphase: RP04.P00.M01.S01
- Test subphase: RP04.P05.M07.S01
- Hermes subphase: RP04.P08.M08.S01
- Claude subphase: RP04.P09.M09.S01

### ENT-002: 별칭 관리

- Description: 약칭, 영문명, 구 명칭, 오탈자
- Acceptance: conflict search에 반영
- Expected RP: RP04, RP10, RP23
- Primary implementation subphase: RP04.P02.M03.S01
- Contract subphase: RP04.P00.M01.S01
- Test subphase: RP04.P05.M07.S01
- Hermes subphase: RP04.P08.M08.S01
- Claude subphase: RP04.P09.M09.S01

### ENT-003: 관계 관리

- Description: 모회사, 자회사, GP/LP, 임원, 주주
- Acceptance: 시점별 관계 이력 관리
- Expected RP: RP04, RP10, RP23
- Primary implementation subphase: RP04.P02.M03.S01
- Contract subphase: RP04.P00.M01.S01
- Test subphase: RP04.P05.M07.S01
- Hermes subphase: RP04.P08.M08.S01
- Claude subphase: RP04.P09.M09.S01

### ENT-004: 중복 탐지

- Description: 동일 사업자번호, 유사명칭 탐지
- Acceptance: 병합 workflow 제공
- Expected RP: RP04, RP10, RP23
- Primary implementation subphase: RP04.P02.M03.S01
- Contract subphase: RP04.P00.M01.S01
- Test subphase: RP04.P05.M07.S01
- Hermes subphase: RP04.P08.M08.S01
- Claude subphase: RP04.P09.M09.S01

### ENT-005: 위험등급

- Description: 일반, 주의, 고위험
- Acceptance: 수임승인 workflow에 반영
- Expected RP: RP04, RP10, RP23
- Primary implementation subphase: RP04.P02.M03.S01
- Contract subphase: RP04.P00.M01.S01
- Test subphase: RP04.P05.M07.S01
- Hermes subphase: RP04.P08.M08.S01
- Claude subphase: RP04.P09.M09.S01

### ENT-006: 공시정보 연결

- Description: DART 등 외부정보 연동
- Acceptance: 외부출처와 업데이트 시점 표시
- Expected RP: RP04, RP10, RP23
- Primary implementation subphase: RP04.P02.M03.S01
- Contract subphase: RP04.P00.M01.S01
- Test subphase: RP04.P05.M07.S01
- Hermes subphase: RP04.P08.M08.S01
- Claude subphase: RP04.P09.M09.S01

### CLI-001: Client 등록

- Description: 고객 등록
- Acceptance: entity_id와 연결
- Expected RP: RP04, RP09, RP12, RP15
- Primary implementation subphase: RP04.P02.M03.S01
- Contract subphase: RP04.P00.M01.S01
- Test subphase: RP04.P05.M07.S01
- Hermes subphase: RP04.P08.M08.S01
- Claude subphase: RP04.P09.M09.S01

### CLI-002: Client Group

- Description: 그룹사·계열사 구조
- Acceptance: group 단위 매출조회 가능
- Expected RP: RP04, RP09, RP12, RP15
- Primary implementation subphase: RP04.P02.M03.S01
- Contract subphase: RP04.P00.M01.S01
- Test subphase: RP04.P05.M07.S01
- Hermes subphase: RP04.P08.M08.S01
- Claude subphase: RP04.P09.M09.S01

### CLI-003: Billing Entity 연결

- Description: 실제 청구처 분리
- Acceptance: invoice 생성 시 billing entity 선택
- Expected RP: RP04, RP09, RP12, RP15
- Primary implementation subphase: RP04.P02.M03.S01
- Contract subphase: RP04.P00.M01.S01
- Test subphase: RP04.P05.M07.S01
- Hermes subphase: RP04.P08.M08.S01
- Claude subphase: RP04.P09.M09.S01

### CLI-004: Relationship Partner 지정

- Description: 관계 담당 파트너
- Acceptance: partner dashboard에 반영
- Expected RP: RP04, RP09, RP12, RP15
- Primary implementation subphase: RP04.P02.M03.S01
- Contract subphase: RP04.P00.M01.S01
- Test subphase: RP04.P05.M07.S01
- Hermes subphase: RP04.P08.M08.S01
- Claude subphase: RP04.P09.M09.S01

### CLI-005: Client 상태관리

- Description: 잠재, 활성, 휴면, 제한, 종료
- Acceptance: 휴면고객 알림 가능
- Expected RP: RP04, RP09, RP12, RP15
- Primary implementation subphase: RP04.P02.M03.S01
- Contract subphase: RP04.P00.M01.S01
- Test subphase: RP04.P05.M07.S01
- Hermes subphase: RP04.P08.M08.S01
- Claude subphase: RP04.P09.M09.S01

### CLI-006: 고객별 매출

- Description: 청구·입금·미수 조회
- Acceptance: client dashboard 제공
- Expected RP: RP04, RP09, RP12, RP15
- Primary implementation subphase: RP04.P02.M03.S01
- Contract subphase: RP04.P00.M01.S01
- Test subphase: RP04.P05.M07.S01
- Hermes subphase: RP04.P08.M08.S01
- Claude subphase: RP04.P09.M09.S01

### CLI-007: 고객별 수익성

- Description: 매출, 비용, time cost 분석
- Acceptance: client profitability report 생성
- Expected RP: RP04, RP09, RP12, RP15
- Primary implementation subphase: RP04.P02.M03.S01
- Contract subphase: RP04.P00.M01.S01
- Test subphase: RP04.P05.M07.S01
- Hermes subphase: RP04.P08.M08.S01
- Claude subphase: RP04.P09.M09.S01

### CLI-008: Key Account Plan

- Description: 핵심고객 연간계획
- Acceptance: activity와 opportunity 연결
- Expected RP: RP04, RP09, RP12, RP15
- Primary implementation subphase: RP04.P02.M03.S01
- Contract subphase: RP04.P00.M01.S01
- Test subphase: RP04.P05.M07.S01
- Hermes subphase: RP04.P08.M08.S01
- Claude subphase: RP04.P09.M09.S01

### CON-001: Contact 등록

- Description: 개인 담당자 등록
- Acceptance: Person entity와 연결
- Expected RP: RP04, RP09, RP16
- Primary implementation subphase: RP04.P02.M03.S01
- Contract subphase: RP04.P00.M01.S01
- Test subphase: RP04.P05.M07.S01
- Hermes subphase: RP04.P08.M08.S01
- Claude subphase: RP04.P09.M09.S01

### CON-002: 소속 이력

- Description: 현재·과거 소속 관리
- Acceptance: 이직 후 이전 관계 확인 가능
- Expected RP: RP04, RP09, RP16
- Primary implementation subphase: RP04.P02.M03.S01
- Contract subphase: RP04.P00.M01.S01
- Test subphase: RP04.P05.M07.S01
- Hermes subphase: RP04.P08.M08.S01
- Claude subphase: RP04.P09.M09.S01

### CON-003: 관계 owner

- Description: contact 담당 파트너 지정
- Acceptance: 중복 owner 경고 가능
- Expected RP: RP04, RP09, RP16
- Primary implementation subphase: RP04.P02.M03.S01
- Contract subphase: RP04.P00.M01.S01
- Test subphase: RP04.P05.M07.S01
- Hermes subphase: RP04.P08.M08.S01
- Claude subphase: RP04.P09.M09.S01

### CON-004: 접촉 이력

- Description: 미팅, 전화, 이메일 메모
- Acceptance: timeline 표시
- Expected RP: RP04, RP09, RP16
- Primary implementation subphase: RP04.P02.M03.S01
- Contract subphase: RP04.P00.M01.S01
- Test subphase: RP04.P05.M07.S01
- Hermes subphase: RP04.P08.M08.S01
- Claude subphase: RP04.P09.M09.S01

### CON-005: 수신동의

- Description: 뉴스레터·행사 수신동의
- Acceptance: opt-out 즉시 반영
- Expected RP: RP04, RP09, RP16
- Primary implementation subphase: RP04.P02.M03.S01
- Contract subphase: RP04.P00.M01.S01
- Test subphase: RP04.P05.M07.S01
- Hermes subphase: RP04.P08.M08.S01
- Claude subphase: RP04.P09.M09.S01

### CON-006: 관계강도

- Description: strong, medium, weak 또는 점수
- Acceptance: BD 분석에 사용
- Expected RP: RP04, RP09, RP16
- Primary implementation subphase: RP04.P02.M03.S01
- Contract subphase: RP04.P00.M01.S01
- Test subphase: RP04.P05.M07.S01
- Hermes subphase: RP04.P08.M08.S01
- Claude subphase: RP04.P09.M09.S01

### CON-007: 개인정보 최소화

- Description: 사적 정보 입력 제한
- Acceptance: 민감 메모 경고
- Expected RP: RP04, RP09, RP16
- Primary implementation subphase: RP04.P02.M03.S01
- Contract subphase: RP04.P00.M01.S01
- Test subphase: RP04.P05.M07.S01
- Hermes subphase: RP04.P08.M08.S01
- Claude subphase: RP04.P09.M09.S01

### LEAD-001: Lead 생성

- Description: 문의, 소개, 세미나, 뉴스레터 반응 등록
- Acceptance: source 필수
- Expected RP: RP09
- Primary implementation subphase: RP09.P02.M03.S01
- Contract subphase: RP09.P00.M01.S01
- Test subphase: RP09.P05.M07.S01
- Hermes subphase: RP09.P08.M08.S01
- Claude subphase: RP09.P09.M09.S01

### LEAD-002: Lead Source

- Description: referral, existing client, event, website 등
- Acceptance: source별 전환율 조회
- Expected RP: RP09
- Primary implementation subphase: RP09.P02.M03.S01
- Contract subphase: RP09.P00.M01.S01
- Test subphase: RP09.P05.M07.S01
- Hermes subphase: RP09.P08.M08.S01
- Claude subphase: RP09.P09.M09.S01

### LEAD-003: Lead Assignment

- Description: 담당 파트너 또는 BD 담당자 배정
- Acceptance: 미배정 lead 알림
- Expected RP: RP09
- Primary implementation subphase: RP09.P02.M03.S01
- Contract subphase: RP09.P00.M01.S01
- Test subphase: RP09.P05.M07.S01
- Hermes subphase: RP09.P08.M08.S01
- Claude subphase: RP09.P09.M09.S01

### LEAD-004: Qualification

- Description: 수임 가능성 기초평가
- Acceptance: qualified 시 opportunity 전환
- Expected RP: RP09
- Primary implementation subphase: RP09.P02.M03.S01
- Contract subphase: RP09.P00.M01.S01
- Test subphase: RP09.P05.M07.S01
- Hermes subphase: RP09.P08.M08.S01
- Claude subphase: RP09.P09.M09.S01

### LEAD-005: Lead Conversion

- Description: Opportunity 또는 Client로 전환
- Acceptance: 기존 contact/client와 병합 가능
- Expected RP: RP09
- Primary implementation subphase: RP09.P02.M03.S01
- Contract subphase: RP09.P00.M01.S01
- Test subphase: RP09.P05.M07.S01
- Hermes subphase: RP09.P08.M08.S01
- Claude subphase: RP09.P09.M09.S01

### OPP-001: Opportunity 생성

- Description: 잠재 사건 생성
- Acceptance: client 또는 prospective client 연결
- Expected RP: RP09, RP10, RP05, RP15
- Primary implementation subphase: RP09.P02.M03.S01
- Contract subphase: RP09.P00.M01.S01
- Test subphase: RP09.P05.M07.S01
- Hermes subphase: RP09.P08.M08.S01
- Claude subphase: RP09.P09.M09.S01

### OPP-002: Pipeline 단계관리

- Description: stage 변경 및 이력
- Acceptance: stage history 기록
- Expected RP: RP09, RP10, RP05, RP15
- Primary implementation subphase: RP09.P02.M03.S01
- Contract subphase: RP09.P00.M01.S01
- Test subphase: RP09.P05.M07.S01
- Hermes subphase: RP09.P08.M08.S01
- Claude subphase: RP09.P09.M09.S01

### OPP-003: 예상 보수

- Description: 예상 수임금액, 성공보수, 월자문료
- Acceptance: forecast에 반영
- Expected RP: RP09, RP10, RP05, RP15
- Primary implementation subphase: RP09.P02.M03.S01
- Contract subphase: RP09.P00.M01.S01
- Test subphase: RP09.P05.M07.S01
- Hermes subphase: RP09.P08.M08.S01
- Claude subphase: RP09.P09.M09.S01

### OPP-004: 수임 가능성

- Description: probability 설정
- Acceptance: weighted pipeline 계산
- Expected RP: RP09, RP10, RP05, RP15
- Primary implementation subphase: RP09.P02.M03.S01
- Contract subphase: RP09.P00.M01.S01
- Test subphase: RP09.P05.M07.S01
- Hermes subphase: RP09.P08.M08.S01
- Claude subphase: RP09.P09.M09.S01

### OPP-005: 예상 종결일

- Description: expected close date
- Acceptance: forecast period에 반영
- Expected RP: RP09, RP10, RP05, RP15
- Primary implementation subphase: RP09.P02.M03.S01
- Contract subphase: RP09.P00.M01.S01
- Test subphase: RP09.P05.M07.S01
- Hermes subphase: RP09.P08.M08.S01
- Claude subphase: RP09.P09.M09.S01

### OPP-006: 관련 당사자

- Description: conflict 대상 입력
- Acceptance: conflict check와 연결
- Expected RP: RP09, RP10, RP05, RP15
- Primary implementation subphase: RP09.P02.M03.S01
- Contract subphase: RP09.P00.M01.S01
- Test subphase: RP09.P05.M07.S01
- Hermes subphase: RP09.P08.M08.S01
- Claude subphase: RP09.P09.M09.S01

### OPP-007: 제안서 연결

- Description: DMS document_id 연결
- Acceptance: proposal version 확인 가능
- Expected RP: RP09, RP10, RP05, RP15
- Primary implementation subphase: RP09.P02.M03.S01
- Contract subphase: RP09.P00.M01.S01
- Test subphase: RP09.P05.M07.S01
- Hermes subphase: RP09.P08.M08.S01
- Claude subphase: RP09.P09.M09.S01

### OPP-008: Matter 전환

- Description: Won 시 Matter 자동 생성
- Acceptance: opportunity data가 matter에 이관
- Expected RP: RP09, RP10, RP05, RP15
- Primary implementation subphase: RP09.P02.M03.S01
- Contract subphase: RP09.P00.M01.S01
- Test subphase: RP09.P05.M07.S01
- Hermes subphase: RP09.P08.M08.S01
- Claude subphase: RP09.P09.M09.S01

### OPP-009: Lost reason

- Description: 미수임 사유 기록
- Acceptance: lost analysis report 생성
- Expected RP: RP09, RP10, RP05, RP15
- Primary implementation subphase: RP09.P02.M03.S01
- Contract subphase: RP09.P00.M01.S01
- Test subphase: RP09.P05.M07.S01
- Hermes subphase: RP09.P08.M08.S01
- Claude subphase: RP09.P09.M09.S01

### OPP-010: 경쟁 로펌

- Description: 확인 가능한 경우 경쟁자 기록
- Acceptance: 무단추정 입력 방지 메모
- Expected RP: RP09, RP10, RP05, RP15
- Primary implementation subphase: RP09.P02.M03.S01
- Contract subphase: RP09.P00.M01.S01
- Test subphase: RP09.P05.M07.S01
- Hermes subphase: RP09.P08.M08.S01
- Claude subphase: RP09.P09.M09.S01

### PROP-001: 제안서 생성

- Description: template 기반 proposal 생성
- Acceptance: DMS 문서로 생성
- Expected RP: RP09, RP06, RP10
- Primary implementation subphase: RP09.P02.M03.S01
- Contract subphase: RP09.P00.M01.S01
- Test subphase: RP09.P05.M07.S01
- Hermes subphase: RP09.P08.M08.S01
- Claude subphase: RP09.P09.M09.S01

### PROP-002: 견적서 생성

- Description: fee quote 생성
- Acceptance: fee arrangement 초안으로 이관
- Expected RP: RP09, RP06, RP10
- Primary implementation subphase: RP09.P02.M03.S01
- Contract subphase: RP09.P00.M01.S01
- Test subphase: RP09.P05.M07.S01
- Hermes subphase: RP09.P08.M08.S01
- Claude subphase: RP09.P09.M09.S01

### PROP-003: 버전관리

- Description: proposal v1, v2, final
- Acceptance: DMS version과 연결
- Expected RP: RP09, RP06, RP10
- Primary implementation subphase: RP09.P02.M03.S01
- Contract subphase: RP09.P00.M01.S01
- Test subphase: RP09.P05.M07.S01
- Hermes subphase: RP09.P08.M08.S01
- Claude subphase: RP09.P09.M09.S01

### PROP-004: 제출 이력

- Description: 제출일, 제출자, 제출대상
- Acceptance: activity timeline에 표시
- Expected RP: RP09, RP06, RP10
- Primary implementation subphase: RP09.P02.M03.S01
- Contract subphase: RP09.P00.M01.S01
- Test subphase: RP09.P05.M07.S01
- Hermes subphase: RP09.P08.M08.S01
- Claude subphase: RP09.P09.M09.S01

### PROP-005: 제출승인

- Description: partner approval
- Acceptance: 승인 전 외부발송 제한
- Expected RP: RP09, RP06, RP10
- Primary implementation subphase: RP09.P02.M03.S01
- Contract subphase: RP09.P00.M01.S01
- Test subphase: RP09.P05.M07.S01
- Hermes subphase: RP09.P08.M08.S01
- Claude subphase: RP09.P09.M09.S01

### PROP-006: 수임조건 이관

- Description: proposal fee를 engagement fee로 이관
- Acceptance: 변경 차이 표시
- Expected RP: RP09, RP06, RP10
- Primary implementation subphase: RP09.P02.M03.S01
- Contract subphase: RP09.P00.M01.S01
- Test subphase: RP09.P05.M07.S01
- Hermes subphase: RP09.P08.M08.S01
- Claude subphase: RP09.P09.M09.S01

### PROP-007: RFP 관리

- Description: RFP deadline, Q&A, 자료요청
- Acceptance: RFP dashboard 제공
- Expected RP: RP09, RP06, RP10
- Primary implementation subphase: RP09.P02.M03.S01
- Contract subphase: RP09.P00.M01.S01
- Test subphase: RP09.P05.M07.S01
- Hermes subphase: RP09.P08.M08.S01
- Claude subphase: RP09.P09.M09.S01

### REF-001: 소개자 기록

- Description: 내부·외부 소개자
- Acceptance: source document 연결 가능
- Expected RP: RP09, RP14, RP16
- Primary implementation subphase: RP09.P02.M03.S01
- Contract subphase: RP09.P00.M01.S01
- Test subphase: RP09.P05.M07.S01
- Hermes subphase: RP09.P08.M08.S01
- Claude subphase: RP09.P09.M09.S01

### REF-002: 유치기여자

- Description: origination partner 지정
- Acceptance: settlement rule로 이관
- Expected RP: RP09, RP14, RP16
- Primary implementation subphase: RP09.P02.M03.S01
- Contract subphase: RP09.P00.M01.S01
- Test subphase: RP09.P05.M07.S01
- Hermes subphase: RP09.P08.M08.S01
- Claude subphase: RP09.P09.M09.S01

### REF-003: 공동유치

- Description: 복수 유치기여자 및 비율
- Acceptance: 합계 100% validation
- Expected RP: RP09, RP14, RP16
- Primary implementation subphase: RP09.P02.M03.S01
- Contract subphase: RP09.P00.M01.S01
- Test subphase: RP09.P05.M07.S01
- Hermes subphase: RP09.P08.M08.S01
- Claude subphase: RP09.P09.M09.S01

### REF-004: 정산 연결

- Description: settlement rule과 연결
- Acceptance: settlement preview 반영
- Expected RP: RP09, RP14, RP16
- Primary implementation subphase: RP09.P02.M03.S01
- Contract subphase: RP09.P00.M01.S01
- Test subphase: RP09.P05.M07.S01
- Hermes subphase: RP09.P08.M08.S01
- Claude subphase: RP09.P09.M09.S01

### REF-005: 외부소개 검토 플래그

- Description: 외부 referral 관련 법률검토 필요 표시
- Acceptance: 자동지급 금지
- Expected RP: RP09, RP14, RP16
- Primary implementation subphase: RP09.P02.M03.S01
- Contract subphase: RP09.P00.M01.S01
- Test subphase: RP09.P05.M07.S01
- Hermes subphase: RP09.P08.M08.S01
- Claude subphase: RP09.P09.M09.S01

### REF-006: 근거문서 연결

- Description: 최초 소개 이메일, 메모 등
- Acceptance: DMS document/email 참조
- Expected RP: RP09, RP14, RP16
- Primary implementation subphase: RP09.P02.M03.S01
- Contract subphase: RP09.P00.M01.S01
- Test subphase: RP09.P05.M07.S01
- Hermes subphase: RP09.P08.M08.S01
- Claude subphase: RP09.P09.M09.S01

### CAM-001: 뉴스레터 대상자

- Description: 분야별 수신자 그룹
- Acceptance: 수신동의 있는 contact만 포함
- Expected RP: RP09, RP15, RP16
- Primary implementation subphase: RP09.P02.M03.S01
- Contract subphase: RP09.P00.M01.S01
- Test subphase: RP09.P05.M07.S01
- Hermes subphase: RP09.P08.M08.S01
- Claude subphase: RP09.P09.M09.S01

### CAM-002: 발송이력

- Description: 콘텐츠, 발송일, 대상자
- Acceptance: contact timeline에 표시
- Expected RP: RP09, RP15, RP16
- Primary implementation subphase: RP09.P02.M03.S01
- Contract subphase: RP09.P00.M01.S01
- Test subphase: RP09.P05.M07.S01
- Hermes subphase: RP09.P08.M08.S01
- Claude subphase: RP09.P09.M09.S01

### CAM-003: 행사관리

- Description: 세미나, 웨비나, 조찬
- Acceptance: RSVP 관리
- Expected RP: RP09, RP15, RP16
- Primary implementation subphase: RP09.P02.M03.S01
- Contract subphase: RP09.P00.M01.S01
- Test subphase: RP09.P05.M07.S01
- Hermes subphase: RP09.P08.M08.S01
- Claude subphase: RP09.P09.M09.S01

### CAM-004: 캠페인 기여분석

- Description: campaign → lead/opportunity 연결
- Acceptance: attribution report 생성
- Expected RP: RP09, RP15, RP16
- Primary implementation subphase: RP09.P02.M03.S01
- Contract subphase: RP09.P00.M01.S01
- Test subphase: RP09.P05.M07.S01
- Hermes subphase: RP09.P08.M08.S01
- Claude subphase: RP09.P09.M09.S01

### REL-001: 휴면고객 알림

- Description: 일정 기간 접촉 없는 고객
- Acceptance: partner에게 알림
- Expected RP: RP09, RP15, RP18
- Primary implementation subphase: RP09.P02.M03.S01
- Contract subphase: RP09.P00.M01.S01
- Test subphase: RP09.P05.M07.S01
- Hermes subphase: RP09.P08.M08.S01
- Claude subphase: RP09.P09.M09.S01

### REL-002: Cross-sell 추천

- Description: 기존 matter 기반 추가기회 추천
- Acceptance: 사람이 승인 후 opportunity 생성
- Expected RP: RP09, RP15, RP18
- Primary implementation subphase: RP09.P02.M03.S01
- Contract subphase: RP09.P00.M01.S01
- Test subphase: RP09.P05.M07.S01
- Hermes subphase: RP09.P08.M08.S01
- Claude subphase: RP09.P09.M09.S01

### REL-003: 관계맵

- Description: client 내부 key contact 구조
- Acceptance: contact relationship graph 표시
- Expected RP: RP09, RP15, RP18
- Primary implementation subphase: RP09.P02.M03.S01
- Contract subphase: RP09.P00.M01.S01
- Test subphase: RP09.P05.M07.S01
- Hermes subphase: RP09.P08.M08.S01
- Claude subphase: RP09.P09.M09.S01

### CONF-001: Conflict 요청

- Description: Opportunity 또는 Matter 생성 전 요청
- Acceptance: 요청자, 요청일 기록
- Expected RP: RP10, RP02, RP04, RP16
- Primary implementation subphase: RP10.P02.M03.S01
- Contract subphase: RP10.P00.M01.S01
- Test subphase: RP10.P05.M07.S01
- Hermes subphase: RP10.P08.M08.S01
- Claude subphase: RP10.P09.M09.S01

### CONF-002: 당사자 검색

- Description: client, 상대방, 계열사, 임원, 주주, 과거 matter
- Acceptance: exact/fuzzy search 지원
- Expected RP: RP10, RP02, RP04, RP16
- Primary implementation subphase: RP10.P02.M03.S01
- Contract subphase: RP10.P00.M01.S01
- Test subphase: RP10.P05.M07.S01
- Hermes subphase: RP10.P08.M08.S01
- Claude subphase: RP10.P09.M09.S01

### CONF-003: Alias 검색

- Description: 영문명, 약칭, 구 명칭, 띄어쓰기 변형
- Acceptance: alias hit 표시
- Expected RP: RP10, RP02, RP04, RP16
- Primary implementation subphase: RP10.P02.M03.S01
- Contract subphase: RP10.P00.M01.S01
- Test subphase: RP10.P05.M07.S01
- Hermes subphase: RP10.P08.M08.S01
- Claude subphase: RP10.P09.M09.S01

### CONF-004: DMS 검색

- Description: engagement letter, waiver, 관련 이메일 검색
- Acceptance: 권한 있는 관리자만 가능
- Expected RP: RP10, RP02, RP04, RP16
- Primary implementation subphase: RP10.P02.M03.S01
- Contract subphase: RP10.P00.M01.S01
- Test subphase: RP10.P05.M07.S01
- Hermes subphase: RP10.P08.M08.S01
- Claude subphase: RP10.P09.M09.S01

### CONF-005: Hit 분류

- Description: clear, potential, waiver required, decline
- Acceptance: reviewer가 risk level 지정
- Expected RP: RP10, RP02, RP04, RP16
- Primary implementation subphase: RP10.P02.M03.S01
- Contract subphase: RP10.P00.M01.S01
- Test subphase: RP10.P05.M07.S01
- Hermes subphase: RP10.P08.M08.S01
- Claude subphase: RP10.P09.M09.S01

### CONF-006: Waiver 관리

- Description: 이해상충 동의서 저장
- Acceptance: waiver document 연결
- Expected RP: RP10, RP02, RP04, RP16
- Primary implementation subphase: RP10.P02.M03.S01
- Contract subphase: RP10.P00.M01.S01
- Test subphase: RP10.P05.M07.S01
- Hermes subphase: RP10.P08.M08.S01
- Claude subphase: RP10.P09.M09.S01

### CONF-007: Ethical Wall 생성

- Description: 제한 사용자·그룹 차단
- Acceptance: deny rule로 생성
- Expected RP: RP10, RP02, RP04, RP16
- Primary implementation subphase: RP10.P02.M03.S01
- Contract subphase: RP10.P00.M01.S01
- Test subphase: RP10.P05.M07.S01
- Hermes subphase: RP10.P08.M08.S01
- Claude subphase: RP10.P09.M09.S01

### CONF-008: 승인 이력

- Description: 검토자, 승인자, 승인일
- Acceptance: audit log 기록
- Expected RP: RP10, RP02, RP04, RP16
- Primary implementation subphase: RP10.P02.M03.S01
- Contract subphase: RP10.P00.M01.S01
- Test subphase: RP10.P05.M07.S01
- Hermes subphase: RP10.P08.M08.S01
- Claude subphase: RP10.P09.M09.S01

### CONF-009: 재검토 trigger

- Description: 당사자 추가, scope 변경 시 재검토
- Acceptance: matter 변경 시 알림
- Expected RP: RP10, RP02, RP04, RP16
- Primary implementation subphase: RP10.P02.M03.S01
- Contract subphase: RP10.P00.M01.S01
- Test subphase: RP10.P05.M07.S01
- Hermes subphase: RP10.P08.M08.S01
- Claude subphase: RP10.P09.M09.S01

### ENG-001: 수임승인 요청

- Description: conflict cleared 후 내부 승인
- Acceptance: approval workflow 시작
- Expected RP: RP10, RP12, RP06
- Primary implementation subphase: RP10.P02.M03.S01
- Contract subphase: RP10.P00.M01.S01
- Test subphase: RP10.P05.M07.S01
- Hermes subphase: RP10.P08.M08.S01
- Claude subphase: RP10.P09.M09.S01

### ENG-002: 업무범위 입력

- Description: scope of work 구조화
- Acceptance: engagement letter에 반영
- Expected RP: RP10, RP12, RP06
- Primary implementation subphase: RP10.P02.M03.S01
- Contract subphase: RP10.P00.M01.S01
- Test subphase: RP10.P05.M07.S01
- Hermes subphase: RP10.P08.M08.S01
- Claude subphase: RP10.P09.M09.S01

### ENG-003: 보수조건 입력

- Description: hourly, fixed, retainer, success fee 등
- Acceptance: billing rule로 이관
- Expected RP: RP10, RP12, RP06
- Primary implementation subphase: RP10.P02.M03.S01
- Contract subphase: RP10.P00.M01.S01
- Test subphase: RP10.P05.M07.S01
- Hermes subphase: RP10.P08.M08.S01
- Claude subphase: RP10.P09.M09.S01

### ENG-004: 청구처 지정

- Description: client와 billing entity 분리
- Acceptance: invoice 대상 지정
- Expected RP: RP10, RP12, RP06
- Primary implementation subphase: RP10.P02.M03.S01
- Contract subphase: RP10.P00.M01.S01
- Test subphase: RP10.P05.M07.S01
- Hermes subphase: RP10.P08.M08.S01
- Claude subphase: RP10.P09.M09.S01

### ENG-005: 위험도 평가

- Description: 고위험, 장기미수, 민감사건 표시
- Acceptance: 추가 승인권자 지정
- Expected RP: RP10, RP12, RP06
- Primary implementation subphase: RP10.P02.M03.S01
- Contract subphase: RP10.P00.M01.S01
- Test subphase: RP10.P05.M07.S01
- Hermes subphase: RP10.P08.M08.S01
- Claude subphase: RP10.P09.M09.S01

### ENG-006: 수임계약서 생성

- Description: engagement letter 생성
- Acceptance: DMS document로 저장
- Expected RP: RP10, RP12, RP06
- Primary implementation subphase: RP10.P02.M03.S01
- Contract subphase: RP10.P00.M01.S01
- Test subphase: RP10.P05.M07.S01
- Hermes subphase: RP10.P08.M08.S01
- Claude subphase: RP10.P09.M09.S01

### ENG-007: 수임조건 확정

- Description: fee arrangement locked
- Acceptance: 변경 시 approval 필요
- Expected RP: RP10, RP12, RP06
- Primary implementation subphase: RP10.P02.M03.S01
- Contract subphase: RP10.P00.M01.S01
- Test subphase: RP10.P05.M07.S01
- Hermes subphase: RP10.P08.M08.S01
- Claude subphase: RP10.P09.M09.S01

### ENG-008: 서명본 관리

- Description: 서명본 upload 및 execution copy 지정
- Acceptance: execution copy 수정 제한
- Expected RP: RP10, RP12, RP06
- Primary implementation subphase: RP10.P02.M03.S01
- Contract subphase: RP10.P00.M01.S01
- Test subphase: RP10.P05.M07.S01
- Hermes subphase: RP10.P08.M08.S01
- Claude subphase: RP10.P09.M09.S01

### MAT-001: Matter 생성

- Description: 수임승인 후 생성
- Acceptance: matter_code 자동 생성
- Expected RP: RP05, RP02, RP06, RP15
- Primary implementation subphase: RP05.P02.M03.S01
- Contract subphase: RP05.P00.M01.S01
- Test subphase: RP05.P05.M07.S01
- Hermes subphase: RP05.P08.M08.S01
- Claude subphase: RP05.P09.M09.S01

### MAT-002: Workspace 자동 생성

- Description: matter type별 폴더 생성
- Acceptance: 1분 이내 생성
- Expected RP: RP05, RP02, RP06, RP15
- Primary implementation subphase: RP05.P02.M03.S01
- Contract subphase: RP05.P00.M01.S01
- Test subphase: RP05.P05.M07.S01
- Hermes subphase: RP05.P08.M08.S01
- Claude subphase: RP05.P09.M09.S01

### MAT-003: 담당자 관리

- Description: partner, attorney, staff 배정
- Acceptance: MatterMember 생성
- Expected RP: RP05, RP02, RP06, RP15
- Primary implementation subphase: RP05.P02.M03.S01
- Contract subphase: RP05.P00.M01.S01
- Test subphase: RP05.P05.M07.S01
- Hermes subphase: RP05.P08.M08.S01
- Claude subphase: RP05.P09.M09.S01

### MAT-004: 권한 자동부여

- Description: matter team 기반 접근권한
- Acceptance: 검색결과에도 반영
- Expected RP: RP05, RP02, RP06, RP15
- Primary implementation subphase: RP05.P02.M03.S01
- Contract subphase: RP05.P00.M01.S01
- Test subphase: RP05.P05.M07.S01
- Hermes subphase: RP05.P08.M08.S01
- Claude subphase: RP05.P09.M09.S01

### MAT-005: 상태관리

- Description: active, on hold, closing, closed
- Acceptance: 상태변경 이력 기록
- Expected RP: RP05, RP02, RP06, RP15
- Primary implementation subphase: RP05.P02.M03.S01
- Contract subphase: RP05.P00.M01.S01
- Test subphase: RP05.P05.M07.S01
- Hermes subphase: RP05.P08.M08.S01
- Claude subphase: RP05.P09.M09.S01

### MAT-006: Task 관리

- Description: 업무, 담당자, due date
- Acceptance: 미완료 task 알림
- Expected RP: RP05, RP02, RP06, RP15
- Primary implementation subphase: RP05.P02.M03.S01
- Contract subphase: RP05.P00.M01.S01
- Test subphase: RP05.P05.M07.S01
- Hermes subphase: RP05.P08.M08.S01
- Claude subphase: RP05.P09.M09.S01

### MAT-007: Calendar

- Description: 기일, 미팅, closing 일정
- Acceptance: Outlook/Google 연동 가능
- Expected RP: RP05, RP02, RP06, RP15
- Primary implementation subphase: RP05.P02.M03.S01
- Contract subphase: RP05.P00.M01.S01
- Test subphase: RP05.P05.M07.S01
- Hermes subphase: RP05.P08.M08.S01
- Claude subphase: RP05.P09.M09.S01

### MAT-008: Checklist

- Description: LDD, CP, closing, litigation checklist
- Acceptance: 완료율 표시
- Expected RP: RP05, RP02, RP06, RP15
- Primary implementation subphase: RP05.P02.M03.S01
- Contract subphase: RP05.P00.M01.S01
- Test subphase: RP05.P05.M07.S01
- Hermes subphase: RP05.P08.M08.S01
- Claude subphase: RP05.P09.M09.S01

### MAT-009: Matter Note

- Description: 주요 쟁점·진행 메모
- Acceptance: note 권한 설정 가능
- Expected RP: RP05, RP02, RP06, RP15
- Primary implementation subphase: RP05.P02.M03.S01
- Contract subphase: RP05.P00.M01.S01
- Test subphase: RP05.P05.M07.S01
- Hermes subphase: RP05.P08.M08.S01
- Claude subphase: RP05.P09.M09.S01

### MAT-010: Matter Closing

- Description: 종결 체크리스트 및 retention 적용
- Acceptance: 미청구·미수 확인 후 종결
- Expected RP: RP05, RP02, RP06, RP15
- Primary implementation subphase: RP05.P02.M03.S01
- Contract subphase: RP05.P00.M01.S01
- Test subphase: RP05.P05.M07.S01
- Hermes subphase: RP05.P08.M08.S01
- Claude subphase: RP05.P09.M09.S01

### DOC-001: 업로드

- Description: drag & drop, bulk upload
- Acceptance: 파일 업로드 성공/실패 기록
- Expected RP: RP06, RP07, RP08, RP17, RP24, RP25
- Primary implementation subphase: RP06.P02.M03.S01
- Contract subphase: RP06.P00.M01.S01
- Test subphase: RP06.P05.M07.S01
- Hermes subphase: RP06.P08.M08.S01
- Claude subphase: RP06.P09.M09.S01

### DOC-002: 다운로드

- Description: 단일·복수 다운로드
- Acceptance: 다운로드 audit 기록
- Expected RP: RP06, RP07, RP08, RP17, RP24, RP25
- Primary implementation subphase: RP06.P02.M03.S01
- Contract subphase: RP06.P00.M01.S01
- Test subphase: RP06.P05.M07.S01
- Hermes subphase: RP06.P08.M08.S01
- Claude subphase: RP06.P09.M09.S01

### DOC-003: 미리보기

- Description: PDF, Office, image preview
- Acceptance: 원본 다운로드 없이 보기 가능
- Expected RP: RP06, RP07, RP08, RP17, RP24, RP25
- Primary implementation subphase: RP06.P02.M03.S01
- Contract subphase: RP06.P00.M01.S01
- Test subphase: RP06.P05.M07.S01
- Hermes subphase: RP06.P08.M08.S01
- Claude subphase: RP06.P09.M09.S01

### DOC-004: 버전관리

- Description: 새 버전 생성, 이전 버전 보존
- Acceptance: 이전 버전 덮어쓰기 금지
- Expected RP: RP06, RP07, RP08, RP17, RP24, RP25
- Primary implementation subphase: RP06.P02.M03.S01
- Contract subphase: RP06.P00.M01.S01
- Test subphase: RP06.P05.M07.S01
- Hermes subphase: RP06.P08.M08.S01
- Claude subphase: RP06.P09.M09.S01

### DOC-005: check-in/out

- Description: 편집 잠금
- Acceptance: checkout 사용자 외 수정 제한
- Expected RP: RP06, RP07, RP08, RP17, RP24, RP25
- Primary implementation subphase: RP06.P02.M03.S01
- Contract subphase: RP06.P00.M01.S01
- Test subphase: RP06.P05.M07.S01
- Hermes subphase: RP06.P08.M08.S01
- Claude subphase: RP06.P09.M09.S01

### DOC-006: 문서상태

- Description: draft, client sent, execution copy 등
- Acceptance: 상태변경 이력 기록
- Expected RP: RP06, RP07, RP08, RP17, RP24, RP25
- Primary implementation subphase: RP06.P02.M03.S01
- Contract subphase: RP06.P00.M01.S01
- Test subphase: RP06.P05.M07.S01
- Hermes subphase: RP06.P08.M08.S01
- Claude subphase: RP06.P09.M09.S01

### DOC-007: 문서번호

- Description: 영구 Document ID 부여
- Acceptance: 파일명 변경에도 ID 유지
- Expected RP: RP06, RP07, RP08, RP17, RP24, RP25
- Primary implementation subphase: RP06.P02.M03.S01
- Contract subphase: RP06.P00.M01.S01
- Test subphase: RP06.P05.M07.S01
- Hermes subphase: RP06.P08.M08.S01
- Claude subphase: RP06.P09.M09.S01

### DOC-008: 파일해시

- Description: 무결성 검증
- Acceptance: hash 저장
- Expected RP: RP06, RP07, RP08, RP17, RP24, RP25
- Primary implementation subphase: RP06.P02.M03.S01
- Contract subphase: RP06.P00.M01.S01
- Test subphase: RP06.P05.M07.S01
- Hermes subphase: RP06.P08.M08.S01
- Claude subphase: RP06.P09.M09.S01

### DOC-009: 중복탐지

- Description: 동일 hash 또는 유사파일 경고
- Acceptance: 업로드 시 중복 알림
- Expected RP: RP06, RP07, RP08, RP17, RP24, RP25
- Primary implementation subphase: RP06.P02.M03.S01
- Contract subphase: RP06.P00.M01.S01
- Test subphase: RP06.P05.M07.S01
- Hermes subphase: RP06.P08.M08.S01
- Claude subphase: RP06.P09.M09.S01

### DOC-010: 비교

- Description: Word/PDF redline 비교
- Acceptance: 버전 간 변경점 확인
- Expected RP: RP06, RP07, RP08, RP17, RP24, RP25
- Primary implementation subphase: RP06.P02.M03.S01
- Contract subphase: RP06.P00.M01.S01
- Test subphase: RP06.P05.M07.S01
- Hermes subphase: RP06.P08.M08.S01
- Claude subphase: RP06.P09.M09.S01

### DOC-011: 변환

- Description: Office/HWPX/HWP/PDF 변환
- Acceptance: preview rendition 생성
- Expected RP: RP06, RP07, RP08, RP17, RP24, RP25
- Primary implementation subphase: RP06.P02.M03.S01
- Contract subphase: RP06.P00.M01.S01
- Test subphase: RP06.P05.M07.S01
- Hermes subphase: RP06.P08.M08.S01
- Claude subphase: RP06.P09.M09.S01

### DOC-012: 원본보존

- Description: execution copy 수정 제한
- Acceptance: 특별권한 없이는 삭제·수정 불가
- Expected RP: RP06, RP07, RP08, RP17, RP24, RP25
- Primary implementation subphase: RP06.P02.M03.S01
- Contract subphase: RP06.P00.M01.S01
- Test subphase: RP06.P05.M07.S01
- Hermes subphase: RP06.P08.M08.S01
- Claude subphase: RP06.P09.M09.S01

### DOC-013: 대량업로드

- Description: VDR·폴더 단위 import
- Acceptance: 폴더구조 유지
- Expected RP: RP06, RP07, RP08, RP17, RP24, RP25
- Primary implementation subphase: RP06.P02.M03.S01
- Contract subphase: RP06.P00.M01.S01
- Test subphase: RP06.P05.M07.S01
- Hermes subphase: RP06.P08.M08.S01
- Claude subphase: RP06.P09.M09.S01

### DOC-014: 문서관계

- Description: 원본, 마크업, 송부본, 체결본 연결
- Acceptance: relation graph 표시
- Expected RP: RP06, RP07, RP08, RP17, RP24, RP25
- Primary implementation subphase: RP06.P02.M03.S01
- Contract subphase: RP06.P00.M01.S01
- Test subphase: RP06.P05.M07.S01
- Hermes subphase: RP06.P08.M08.S01
- Claude subphase: RP06.P09.M09.S01

### DOC-015: 조항 추출

- Description: 계약서 조항 단위 추출
- Acceptance: clause search 대상 생성
- Expected RP: RP06, RP07, RP08, RP17, RP24, RP25
- Primary implementation subphase: RP06.P02.M03.S01
- Contract subphase: RP06.P00.M01.S01
- Test subphase: RP06.P05.M07.S01
- Hermes subphase: RP06.P08.M08.S01
- Claude subphase: RP06.P09.M09.S01

### DOC-016: 선례 지정

- Description: 좋은 선례, 금지 선례, 참고 선례 태그
- Acceptance: precedent search에 반영
- Expected RP: RP06, RP07, RP08, RP17, RP24, RP25
- Primary implementation subphase: RP06.P02.M03.S01
- Contract subphase: RP06.P00.M01.S01
- Test subphase: RP06.P05.M07.S01
- Hermes subphase: RP06.P08.M08.S01
- Claude subphase: RP06.P09.M09.S01

### EML-001: Outlook Add-in

- Description: 이메일을 Matter에 filing
- Acceptance: 3클릭 이내 filing
- Expected RP: RP08, RP06, RP07, RP18
- Primary implementation subphase: RP08.P02.M03.S01
- Contract subphase: RP08.P00.M01.S01
- Test subphase: RP08.P05.M07.S01
- Hermes subphase: RP08.P08.M08.S01
- Claude subphase: RP08.P09.M09.S01

### EML-002: Gmail Add-in

- Description: Gmail 이메일 filing
- Acceptance: Gmail message metadata 보존
- Expected RP: RP08, RP06, RP07, RP18
- Primary implementation subphase: RP08.P02.M03.S01
- Contract subphase: RP08.P00.M01.S01
- Test subphase: RP08.P05.M07.S01
- Hermes subphase: RP08.P08.M08.S01
- Claude subphase: RP08.P09.M09.S01

### EML-003: Matter 추천

- Description: 제목, 수신자, 첨부파일명 기반 추천
- Acceptance: 추천 matter 표시
- Expected RP: RP08, RP06, RP07, RP18
- Primary implementation subphase: RP08.P02.M03.S01
- Contract subphase: RP08.P00.M01.S01
- Test subphase: RP08.P05.M07.S01
- Hermes subphase: RP08.P08.M08.S01
- Claude subphase: RP08.P09.M09.S01

### EML-004: Thread filing

- Description: 이메일 thread 단위 저장
- Acceptance: thread_id로 묶음
- Expected RP: RP08, RP06, RP07, RP18
- Primary implementation subphase: RP08.P02.M03.S01
- Contract subphase: RP08.P00.M01.S01
- Test subphase: RP08.P05.M07.S01
- Hermes subphase: RP08.P08.M08.S01
- Claude subphase: RP08.P09.M09.S01

### EML-005: Sent filing

- Description: 발송 이메일 저장
- Acceptance: 발송 직후 filing prompt
- Expected RP: RP08, RP06, RP07, RP18
- Primary implementation subphase: RP08.P02.M03.S01
- Contract subphase: RP08.P00.M01.S01
- Test subphase: RP08.P05.M07.S01
- Hermes subphase: RP08.P08.M08.S01
- Claude subphase: RP08.P09.M09.S01

### EML-006: Attachment extraction

- Description: 첨부파일을 Document로 분리저장
- Acceptance: 이메일 원본과 연결
- Expected RP: RP08, RP06, RP07, RP18
- Primary implementation subphase: RP08.P02.M03.S01
- Contract subphase: RP08.P00.M01.S01
- Test subphase: RP08.P05.M07.S01
- Hermes subphase: RP08.P08.M08.S01
- Claude subphase: RP08.P09.M09.S01

### EML-007: 중복방지

- Description: Message-ID 기준 중복 저장 방지
- Acceptance: 동일 email 중복 filing 방지
- Expected RP: RP08, RP06, RP07, RP18
- Primary implementation subphase: RP08.P02.M03.S01
- Contract subphase: RP08.P00.M01.S01
- Test subphase: RP08.P05.M07.S01
- Hermes subphase: RP08.P08.M08.S01
- Claude subphase: RP08.P09.M09.S01

### EML-008: Email search

- Description: 제목, 본문, 송수신자, 첨부파일 검색
- Acceptance: 권한 trimming 적용
- Expected RP: RP08, RP06, RP07, RP18
- Primary implementation subphase: RP08.P02.M03.S01
- Contract subphase: RP08.P00.M01.S01
- Test subphase: RP08.P05.M07.S01
- Hermes subphase: RP08.P08.M08.S01
- Claude subphase: RP08.P09.M09.S01

### EML-009: Email-to-task

- Description: 이메일에서 업무 생성
- Acceptance: task와 email 연결
- Expected RP: RP08, RP06, RP07, RP18
- Primary implementation subphase: RP08.P02.M03.S01
- Contract subphase: RP08.P00.M01.S01
- Test subphase: RP08.P05.M07.S01
- Hermes subphase: RP08.P08.M08.S01
- Claude subphase: RP08.P09.M09.S01

### EML-010: Negotiation summary

- Description: 협상 이메일 thread 요약
- Acceptance: 근거 email 표시
- Expected RP: RP08, RP06, RP07, RP18
- Primary implementation subphase: RP08.P02.M03.S01
- Contract subphase: RP08.P00.M01.S01
- Test subphase: RP08.P05.M07.S01
- Hermes subphase: RP08.P08.M08.S01
- Claude subphase: RP08.P09.M09.S01

### SRCH-001: 기본검색

- Description: 문서명·본문 검색
- Acceptance: 권한 있는 문서만 결과 표시
- Expected RP: RP07, RP02, RP17, RP18
- Primary implementation subphase: RP07.P02.M03.S01
- Contract subphase: RP07.P00.M01.S01
- Test subphase: RP07.P05.M07.S01
- Hermes subphase: RP07.P08.M08.S01
- Claude subphase: RP07.P09.M09.S01

### SRCH-002: 메타데이터 필터

- Description: client, matter, type, date
- Acceptance: 복합필터 가능
- Expected RP: RP07, RP02, RP17, RP18
- Primary implementation subphase: RP07.P02.M03.S01
- Contract subphase: RP07.P00.M01.S01
- Test subphase: RP07.P05.M07.S01
- Hermes subphase: RP07.P08.M08.S01
- Claude subphase: RP07.P09.M09.S01

### SRCH-003: OCR 검색

- Description: 스캔 PDF 검색
- Acceptance: OCR 완료 후 검색 가능
- Expected RP: RP07, RP02, RP17, RP18
- Primary implementation subphase: RP07.P02.M03.S01
- Contract subphase: RP07.P00.M01.S01
- Test subphase: RP07.P05.M07.S01
- Hermes subphase: RP07.P08.M08.S01
- Claude subphase: RP07.P09.M09.S01

### SRCH-004: 이메일 검색

- Description: email subject/body/participants
- Acceptance: message_id 확인 가능
- Expected RP: RP07, RP02, RP17, RP18
- Primary implementation subphase: RP07.P02.M03.S01
- Contract subphase: RP07.P00.M01.S01
- Test subphase: RP07.P05.M07.S01
- Hermes subphase: RP07.P08.M08.S01
- Claude subphase: RP07.P09.M09.S01

### SRCH-005: 조항검색

- Description: clause type, clause text
- Acceptance: clause location 표시
- Expected RP: RP07, RP02, RP17, RP18
- Primary implementation subphase: RP07.P02.M03.S01
- Contract subphase: RP07.P00.M01.S01
- Test subphase: RP07.P05.M07.S01
- Hermes subphase: RP07.P08.M08.S01
- Claude subphase: RP07.P09.M09.S01

### SRCH-006: 의미검색

- Description: vector search
- Acceptance: score와 근거 표시
- Expected RP: RP07, RP02, RP17, RP18
- Primary implementation subphase: RP07.P02.M03.S01
- Contract subphase: RP07.P00.M01.S01
- Test subphase: RP07.P05.M07.S01
- Hermes subphase: RP07.P08.M08.S01
- Claude subphase: RP07.P09.M09.S01

### SRCH-007: 보안 trimming

- Description: 권한 없는 문서 비노출
- Acceptance: 문서명/snippet도 비노출
- Expected RP: RP07, RP02, RP17, RP18
- Primary implementation subphase: RP07.P02.M03.S01
- Contract subphase: RP07.P00.M01.S01
- Test subphase: RP07.P05.M07.S01
- Hermes subphase: RP07.P08.M08.S01
- Claude subphase: RP07.P09.M09.S01

### SRCH-008: 검색로그

- Description: 관리자 정책에 따라 기록
- Acceptance: 민감검색어 정책 적용
- Expected RP: RP07, RP02, RP17, RP18
- Primary implementation subphase: RP07.P02.M03.S01
- Contract subphase: RP07.P00.M01.S01
- Test subphase: RP07.P05.M07.S01
- Hermes subphase: RP07.P08.M08.S01
- Claude subphase: RP07.P09.M09.S01

### TIME-001: 타임 입력

- Description: 날짜, Matter, 시간, task code, narrative
- Acceptance: 0.1h 또는 tenant 단위 설정
- Expected RP: RP11, RP12, RP15, RP18
- Primary implementation subphase: RP11.P02.M03.S01
- Contract subphase: RP11.P00.M01.S01
- Test subphase: RP11.P05.M07.S01
- Hermes subphase: RP11.P08.M08.S01
- Claude subphase: RP11.P09.M09.S01

### TIME-002: Timer

- Description: 시작·중지 기반 기록
- Acceptance: timer 기록을 time entry로 전환
- Expected RP: RP11, RP12, RP15, RP18
- Primary implementation subphase: RP11.P02.M03.S01
- Contract subphase: RP11.P00.M01.S01
- Test subphase: RP11.P05.M07.S01
- Hermes subphase: RP11.P08.M08.S01
- Claude subphase: RP11.P09.M09.S01

### TIME-003: Billable 여부

- Description: billable / non-billable
- Acceptance: billing 집계에 반영
- Expected RP: RP11, RP12, RP15, RP18
- Primary implementation subphase: RP11.P02.M03.S01
- Contract subphase: RP11.P00.M01.S01
- Test subphase: RP11.P05.M07.S01
- Hermes subphase: RP11.P08.M08.S01
- Claude subphase: RP11.P09.M09.S01

### TIME-004: Task code

- Description: 계약검토, 리서치, 회의, 서면작성 등
- Acceptance: 표준 task code 사용
- Expected RP: RP11, RP12, RP15, RP18
- Primary implementation subphase: RP11.P02.M03.S01
- Contract subphase: RP11.P00.M01.S01
- Test subphase: RP11.P05.M07.S01
- Hermes subphase: RP11.P08.M08.S01
- Claude subphase: RP11.P09.M09.S01

### TIME-005: 승인

- Description: 담당 파트너 승인
- Acceptance: 미승인 time은 invoice 제외 가능
- Expected RP: RP11, RP12, RP15, RP18
- Primary implementation subphase: RP11.P02.M03.S01
- Contract subphase: RP11.P00.M01.S01
- Test subphase: RP11.P05.M07.S01
- Hermes subphase: RP11.P08.M08.S01
- Claude subphase: RP11.P09.M09.S01

### TIME-006: 마감 후 잠금

- Description: 월마감 후 수정 제한
- Acceptance: 수정 시 approval 필요
- Expected RP: RP11, RP12, RP15, RP18
- Primary implementation subphase: RP11.P02.M03.S01
- Contract subphase: RP11.P00.M01.S01
- Test subphase: RP11.P05.M07.S01
- Hermes subphase: RP11.P08.M08.S01
- Claude subphase: RP11.P09.M09.S01

### TIME-007: Write-down

- Description: 청구 전 감액
- Acceptance: 원래 금액과 감액 이력 보존
- Expected RP: RP11, RP12, RP15, RP18
- Primary implementation subphase: RP11.P02.M03.S01
- Contract subphase: RP11.P00.M01.S01
- Test subphase: RP11.P05.M07.S01
- Hermes subphase: RP11.P08.M08.S01
- Claude subphase: RP11.P09.M09.S01

### TIME-008: Write-off

- Description: 청구 제외
- Acceptance: 승인권자 필요
- Expected RP: RP11, RP12, RP15, RP18
- Primary implementation subphase: RP11.P02.M03.S01
- Contract subphase: RP11.P00.M01.S01
- Test subphase: RP11.P05.M07.S01
- Hermes subphase: RP11.P08.M08.S01
- Claude subphase: RP11.P09.M09.S01

### TIME-009: AI narrative 개선

- Description: 청구 가능한 설명문구 추천
- Acceptance: 사람이 확인 후 반영
- Expected RP: RP11, RP12, RP15, RP18
- Primary implementation subphase: RP11.P02.M03.S01
- Contract subphase: RP11.P00.M01.S01
- Test subphase: RP11.P05.M07.S01
- Hermes subphase: RP11.P08.M08.S01
- Claude subphase: RP11.P09.M09.S01

### TIME-010: Calendar 기반 추천

- Description: 캘린더·이메일 기반 time draft
- Acceptance: 자동확정 금지
- Expected RP: RP11, RP12, RP15, RP18
- Primary implementation subphase: RP11.P02.M03.S01
- Contract subphase: RP11.P00.M01.S01
- Test subphase: RP11.P05.M07.S01
- Hermes subphase: RP11.P08.M08.S01
- Claude subphase: RP11.P09.M09.S01

### EXP-001: 비용 등록

- Description: 영수증, 비용유형, Matter 연결
- Acceptance: document_id 연결
- Expected RP: RP11, RP12, RP13
- Primary implementation subphase: RP11.P02.M03.S01
- Contract subphase: RP11.P00.M01.S01
- Test subphase: RP11.P05.M07.S01
- Hermes subphase: RP11.P08.M08.S01
- Claude subphase: RP11.P09.M09.S01

### EXP-002: 대납금 구분

- Description: 비용과 대납금 분리
- Acceptance: 대납금은 recoverable로 관리
- Expected RP: RP11, RP12, RP13
- Primary implementation subphase: RP11.P02.M03.S01
- Contract subphase: RP11.P00.M01.S01
- Test subphase: RP11.P05.M07.S01
- Hermes subphase: RP11.P08.M08.S01
- Claude subphase: RP11.P09.M09.S01

### EXP-003: 청구 가능 여부

- Description: client billable 여부
- Acceptance: proforma에 반영
- Expected RP: RP11, RP12, RP13
- Primary implementation subphase: RP11.P02.M03.S01
- Contract subphase: RP11.P00.M01.S01
- Test subphase: RP11.P05.M07.S01
- Hermes subphase: RP11.P08.M08.S01
- Claude subphase: RP11.P09.M09.S01

### EXP-004: 승인 workflow

- Description: 담당자 → 파트너 → 회계
- Acceptance: 승인 전 청구 제한 가능
- Expected RP: RP11, RP12, RP13
- Primary implementation subphase: RP11.P02.M03.S01
- Contract subphase: RP11.P00.M01.S01
- Test subphase: RP11.P05.M07.S01
- Hermes subphase: RP11.P08.M08.S01
- Claude subphase: RP11.P09.M09.S01

### EXP-005: 법인카드 import

- Description: 카드 거래내역 업로드 또는 연동
- Acceptance: 카드내역과 영수증 매칭
- Expected RP: RP11, RP12, RP13
- Primary implementation subphase: RP11.P02.M03.S01
- Contract subphase: RP11.P00.M01.S01
- Test subphase: RP11.P05.M07.S01
- Hermes subphase: RP11.P08.M08.S01
- Claude subphase: RP11.P09.M09.S01

### EXP-006: OCR

- Description: 영수증 금액·일자·거래처 추출
- Acceptance: 사용자 확인 후 확정
- Expected RP: RP11, RP12, RP13
- Primary implementation subphase: RP11.P02.M03.S01
- Contract subphase: RP11.P00.M01.S01
- Test subphase: RP11.P05.M07.S01
- Hermes subphase: RP11.P08.M08.S01
- Claude subphase: RP11.P09.M09.S01

### EXP-007: 비용정책 검사

- Description: 한도초과, 증빙누락, 중복비용 탐지
- Acceptance: warning 표시
- Expected RP: RP11, RP12, RP13
- Primary implementation subphase: RP11.P02.M03.S01
- Contract subphase: RP11.P00.M01.S01
- Test subphase: RP11.P05.M07.S01
- Hermes subphase: RP11.P08.M08.S01
- Claude subphase: RP11.P09.M09.S01

### EXP-008: 외주업체 청구서

- Description: vendor invoice 관리
- Acceptance: vendor와 matter 연결
- Expected RP: RP11, RP12, RP13
- Primary implementation subphase: RP11.P02.M03.S01
- Contract subphase: RP11.P00.M01.S01
- Test subphase: RP11.P05.M07.S01
- Hermes subphase: RP11.P08.M08.S01
- Claude subphase: RP11.P09.M09.S01

### EXP-009: 비용 근거문서 연결

- Description: DMS document_id 연결
- Acceptance: invoice 검토 시 열람 가능
- Expected RP: RP11, RP12, RP13
- Primary implementation subphase: RP11.P02.M03.S01
- Contract subphase: RP11.P00.M01.S01
- Test subphase: RP11.P05.M07.S01
- Hermes subphase: RP11.P08.M08.S01
- Claude subphase: RP11.P09.M09.S01

### BILL-001: Proforma 생성

- Description: 타임·비용·정액보수 기반 청구 전 검토
- Acceptance: draft proforma 생성
- Expected RP: RP12, RP11, RP13, RP15
- Primary implementation subphase: RP12.P02.M03.S01
- Contract subphase: RP12.P00.M01.S01
- Test subphase: RP12.P05.M07.S01
- Hermes subphase: RP12.P08.M08.S01
- Claude subphase: RP12.P09.M09.S01

### BILL-002: Partner review

- Description: 담당 파트너 검토·감액
- Acceptance: write-down 이력 기록
- Expected RP: RP12, RP11, RP13, RP15
- Primary implementation subphase: RP12.P02.M03.S01
- Contract subphase: RP12.P00.M01.S01
- Test subphase: RP12.P05.M07.S01
- Hermes subphase: RP12.P08.M08.S01
- Claude subphase: RP12.P09.M09.S01

### BILL-003: Invoice 확정

- Description: 승인 후 정식 청구서 번호 부여
- Acceptance: 확정 후 임의수정 제한
- Expected RP: RP12, RP11, RP13, RP15
- Primary implementation subphase: RP12.P02.M03.S01
- Contract subphase: RP12.P00.M01.S01
- Test subphase: RP12.P05.M07.S01
- Hermes subphase: RP12.P08.M08.S01
- Claude subphase: RP12.P09.M09.S01

### BILL-004: Hourly billing

- Description: 타임시트 기반 청구
- Acceptance: rate card 적용
- Expected RP: RP12, RP11, RP13, RP15
- Primary implementation subphase: RP12.P02.M03.S01
- Contract subphase: RP12.P00.M01.S01
- Test subphase: RP12.P05.M07.S01
- Hermes subphase: RP12.P08.M08.S01
- Claude subphase: RP12.P09.M09.S01

### BILL-005: Fixed fee billing

- Description: 정액·단계별 보수 청구
- Acceptance: milestone 기준
- Expected RP: RP12, RP11, RP13, RP15
- Primary implementation subphase: RP12.P02.M03.S01
- Contract subphase: RP12.P00.M01.S01
- Test subphase: RP12.P05.M07.S01
- Hermes subphase: RP12.P08.M08.S01
- Claude subphase: RP12.P09.M09.S01

### BILL-006: Retainer drawdown

- Description: 선수금 차감
- Acceptance: retainer balance 업데이트
- Expected RP: RP12, RP11, RP13, RP15
- Primary implementation subphase: RP12.P02.M03.S01
- Contract subphase: RP12.P00.M01.S01
- Test subphase: RP12.P05.M07.S01
- Hermes subphase: RP12.P08.M08.S01
- Claude subphase: RP12.P09.M09.S01

### BILL-007: Success fee billing

- Description: 성공조건 충족 시 청구
- Acceptance: trigger event 기록
- Expected RP: RP12, RP11, RP13, RP15
- Primary implementation subphase: RP12.P02.M03.S01
- Contract subphase: RP12.P00.M01.S01
- Test subphase: RP12.P05.M07.S01
- Hermes subphase: RP12.P08.M08.S01
- Claude subphase: RP12.P09.M09.S01

### BILL-008: Expense billing

- Description: 실비 별도청구
- Acceptance: reimbursable expense 반영
- Expected RP: RP12, RP11, RP13, RP15
- Primary implementation subphase: RP12.P02.M03.S01
- Contract subphase: RP12.P00.M01.S01
- Test subphase: RP12.P05.M07.S01
- Hermes subphase: RP12.P08.M08.S01
- Claude subphase: RP12.P09.M09.S01

### BILL-009: Split billing

- Description: 하나의 Matter를 복수 청구처에 분할청구
- Acceptance: 합계 validation
- Expected RP: RP12, RP11, RP13, RP15
- Primary implementation subphase: RP12.P02.M03.S01
- Contract subphase: RP12.P00.M01.S01
- Test subphase: RP12.P05.M07.S01
- Hermes subphase: RP12.P08.M08.S01
- Claude subphase: RP12.P09.M09.S01

### BILL-010: Consolidated billing

- Description: 복수 Matter를 하나의 청구서로 통합
- Acceptance: matter별 breakdown 표시
- Expected RP: RP12, RP11, RP13, RP15
- Primary implementation subphase: RP12.P02.M03.S01
- Contract subphase: RP12.P00.M01.S01
- Test subphase: RP12.P05.M07.S01
- Hermes subphase: RP12.P08.M08.S01
- Claude subphase: RP12.P09.M09.S01

### BILL-011: Tax invoice 연동

- Description: 전자세금계산서 데이터 생성
- Acceptance: 외부연동/export
- Expected RP: RP12, RP11, RP13, RP15
- Primary implementation subphase: RP12.P02.M03.S01
- Contract subphase: RP12.P00.M01.S01
- Test subphase: RP12.P05.M07.S01
- Hermes subphase: RP12.P08.M08.S01
- Claude subphase: RP12.P09.M09.S01

### BILL-012: 청구서 DMS 보관

- Description: invoice PDF를 DMS에 저장
- Acceptance: invoice와 document_id 연결
- Expected RP: RP12, RP11, RP13, RP15
- Primary implementation subphase: RP12.P02.M03.S01
- Contract subphase: RP12.P00.M01.S01
- Test subphase: RP12.P05.M07.S01
- Hermes subphase: RP12.P08.M08.S01
- Claude subphase: RP12.P09.M09.S01

### PAY-001: 입금 등록

- Description: 수동 또는 은행거래 import
- Acceptance: bank transaction 저장
- Expected RP: RP13, RP12, RP15
- Primary implementation subphase: RP13.P02.M03.S01
- Contract subphase: RP13.P00.M01.S01
- Test subphase: RP13.P05.M07.S01
- Hermes subphase: RP13.P08.M08.S01
- Claude subphase: RP13.P09.M09.S01

### PAY-002: Invoice 매칭

- Description: 청구서와 입금 매칭
- Acceptance: 부분입금 가능
- Expected RP: RP13, RP12, RP15
- Primary implementation subphase: RP13.P02.M03.S01
- Contract subphase: RP13.P00.M01.S01
- Test subphase: RP13.P05.M07.S01
- Hermes subphase: RP13.P08.M08.S01
- Claude subphase: RP13.P09.M09.S01

### PAY-003: 부분입금

- Description: 일부 지급 처리
- Acceptance: outstanding amount 계산
- Expected RP: RP13, RP12, RP15
- Primary implementation subphase: RP13.P02.M03.S01
- Contract subphase: RP13.P00.M01.S01
- Test subphase: RP13.P05.M07.S01
- Hermes subphase: RP13.P08.M08.S01
- Claude subphase: RP13.P09.M09.S01

### PAY-004: 초과입금

- Description: 선수금 또는 환불채무 처리
- Acceptance: 처리유형 선택
- Expected RP: RP13, RP12, RP15
- Primary implementation subphase: RP13.P02.M03.S01
- Contract subphase: RP13.P00.M01.S01
- Test subphase: RP13.P05.M07.S01
- Hermes subphase: RP13.P08.M08.S01
- Claude subphase: RP13.P09.M09.S01

### PAY-005: AR aging

- Description: 30/60/90/180일 미수금
- Acceptance: aging report 생성
- Expected RP: RP13, RP12, RP15
- Primary implementation subphase: RP13.P02.M03.S01
- Contract subphase: RP13.P00.M01.S01
- Test subphase: RP13.P05.M07.S01
- Hermes subphase: RP13.P08.M08.S01
- Claude subphase: RP13.P09.M09.S01

### PAY-006: 독촉관리

- Description: 알림, 메일 템플릿, 담당자 지정
- Acceptance: next action 기록
- Expected RP: RP13, RP12, RP15
- Primary implementation subphase: RP13.P02.M03.S01
- Contract subphase: RP13.P00.M01.S01
- Test subphase: RP13.P05.M07.S01
- Hermes subphase: RP13.P08.M08.S01
- Claude subphase: RP13.P09.M09.S01

### PAY-007: 장기미수 경고

- Description: 신규수임 제한 또는 대표 알림
- Acceptance: client risk level 반영
- Expected RP: RP13, RP12, RP15
- Primary implementation subphase: RP13.P02.M03.S01
- Contract subphase: RP13.P00.M01.S01
- Test subphase: RP13.P05.M07.S01
- Hermes subphase: RP13.P08.M08.S01
- Claude subphase: RP13.P09.M09.S01

### PAY-008: Write-off 승인

- Description: 회수불능·감액 처리 승인
- Acceptance: approval 후 반영
- Expected RP: RP13, RP12, RP15
- Primary implementation subphase: RP13.P02.M03.S01
- Contract subphase: RP13.P00.M01.S01
- Test subphase: RP13.P05.M07.S01
- Hermes subphase: RP13.P08.M08.S01
- Claude subphase: RP13.P09.M09.S01

### PAY-009: 현금흐름 예측

- Description: 청구예정·입금예정 기반 예측
- Acceptance: forecast dashboard 생성
- Expected RP: RP13, RP12, RP15
- Primary implementation subphase: RP13.P02.M03.S01
- Contract subphase: RP13.P00.M01.S01
- Test subphase: RP13.P05.M07.S01
- Hermes subphase: RP13.P08.M08.S01
- Claude subphase: RP13.P09.M09.S01

### ACC-001: 계정과목 관리

- Description: 매출, 비용, 대납금, 선수금 등
- Acceptance: chart of accounts 설정
- Expected RP: RP13, RP23, RP29
- Primary implementation subphase: RP13.P02.M03.S01
- Contract subphase: RP13.P00.M01.S01
- Test subphase: RP13.P05.M07.S01
- Hermes subphase: RP13.P08.M08.S01
- Claude subphase: RP13.P09.M09.S01

### ACC-002: 전표 자동생성

- Description: 청구·입금·비용 이벤트 기반
- Acceptance: source_id 연결
- Expected RP: RP13, RP23, RP29
- Primary implementation subphase: RP13.P02.M03.S01
- Contract subphase: RP13.P00.M01.S01
- Test subphase: RP13.P05.M07.S01
- Hermes subphase: RP13.P08.M08.S01
- Claude subphase: RP13.P09.M09.S01

### ACC-003: 회계자료 export

- Description: 더존/WEHAGO/세무사무소용 CSV/Excel
- Acceptance: 기간별 export
- Expected RP: RP13, RP23, RP29
- Primary implementation subphase: RP13.P02.M03.S01
- Contract subphase: RP13.P00.M01.S01
- Test subphase: RP13.P05.M07.S01
- Hermes subphase: RP13.P08.M08.S01
- Claude subphase: RP13.P09.M09.S01

### ACC-004: 월마감

- Description: 기간 잠금, 수정승인
- Acceptance: closed period 수정 제한
- Expected RP: RP13, RP23, RP29
- Primary implementation subphase: RP13.P02.M03.S01
- Contract subphase: RP13.P00.M01.S01
- Test subphase: RP13.P05.M07.S01
- Hermes subphase: RP13.P08.M08.S01
- Claude subphase: RP13.P09.M09.S01

### ACC-005: 부가세 자료

- Description: 매출·매입세금계산서 자료
- Acceptance: 신고 보조자료 생성
- Expected RP: RP13, RP23, RP29
- Primary implementation subphase: RP13.P02.M03.S01
- Contract subphase: RP13.P00.M01.S01
- Test subphase: RP13.P05.M07.S01
- Hermes subphase: RP13.P08.M08.S01
- Claude subphase: RP13.P09.M09.S01

### ACC-006: 원천세 자료

- Description: 개인·프리랜서·해외지급 관련
- Acceptance: 지급명세서 보조
- Expected RP: RP13, RP23, RP29
- Primary implementation subphase: RP13.P02.M03.S01
- Contract subphase: RP13.P00.M01.S01
- Test subphase: RP13.P05.M07.S01
- Hermes subphase: RP13.P08.M08.S01
- Claude subphase: RP13.P09.M09.S01

### ACC-007: 자체 장부

- Description: 장기적으로 자체 재무회계 기능
- Acceptance: trial balance 생성
- Expected RP: RP13, RP23, RP29
- Primary implementation subphase: RP13.P02.M03.S01
- Contract subphase: RP13.P00.M01.S01
- Test subphase: RP13.P05.M07.S01
- Hermes subphase: RP13.P08.M08.S01
- Claude subphase: RP13.P09.M09.S01

### SET-001: 정산규칙 설정

- Description: 역할별·사건별·팀별 규칙
- Acceptance: rule version 관리
- Expected RP: RP14, RP15, RP16
- Primary implementation subphase: RP14.P02.M03.S01
- Contract subphase: RP14.P00.M01.S01
- Test subphase: RP14.P05.M07.S01
- Hermes subphase: RP14.P08.M08.S01
- Claude subphase: RP14.P09.M09.S01

### SET-002: 유치기여 비율

- Description: origination split
- Acceptance: 합계 100% 검증
- Expected RP: RP14, RP15, RP16
- Primary implementation subphase: RP14.P02.M03.S01
- Contract subphase: RP14.P00.M01.S01
- Test subphase: RP14.P05.M07.S01
- Hermes subphase: RP14.P08.M08.S01
- Claude subphase: RP14.P09.M09.S01

### SET-003: 실무기여 계산

- Description: time entry 기반 working credit
- Acceptance: billable/non-billable 선택 가능
- Expected RP: RP14, RP15, RP16
- Primary implementation subphase: RP14.P02.M03.S01
- Contract subphase: RP14.P00.M01.S01
- Test subphase: RP14.P05.M07.S01
- Hermes subphase: RP14.P08.M08.S01
- Claude subphase: RP14.P09.M09.S01

### SET-004: 비용 차감

- Description: 직접비·외주비 차감 후 배분
- Acceptance: cost basis 명확화
- Expected RP: RP14, RP15, RP16
- Primary implementation subphase: RP14.P02.M03.S01
- Contract subphase: RP14.P00.M01.S01
- Test subphase: RP14.P05.M07.S01
- Hermes subphase: RP14.P08.M08.S01
- Claude subphase: RP14.P09.M09.S01

### SET-005: 정산 preview

- Description: 월마감 전 예상 정산
- Acceptance: 확정 전 simulation
- Expected RP: RP14, RP15, RP16
- Primary implementation subphase: RP14.P02.M03.S01
- Contract subphase: RP14.P00.M01.S01
- Test subphase: RP14.P05.M07.S01
- Hermes subphase: RP14.P08.M08.S01
- Claude subphase: RP14.P09.M09.S01

### SET-006: 정산 확정

- Description: 승인 후 locked status
- Acceptance: 확정 후 수정 제한
- Expected RP: RP14, RP15, RP16
- Primary implementation subphase: RP14.P02.M03.S01
- Contract subphase: RP14.P00.M01.S01
- Test subphase: RP14.P05.M07.S01
- Hermes subphase: RP14.P08.M08.S01
- Claude subphase: RP14.P09.M09.S01

### SET-007: 정산 근거문서

- Description: 수임계약서, 소개 이메일, 내부합의서 연결
- Acceptance: document_id 연결
- Expected RP: RP14, RP15, RP16
- Primary implementation subphase: RP14.P02.M03.S01
- Contract subphase: RP14.P00.M01.S01
- Test subphase: RP14.P05.M07.S01
- Hermes subphase: RP14.P08.M08.S01
- Claude subphase: RP14.P09.M09.S01

### SET-008: 이의제기 workflow

- Description: 파트너 정산 이의제기 및 조정
- Acceptance: 이의제기 이력 보존
- Expected RP: RP14, RP15, RP16
- Primary implementation subphase: RP14.P02.M03.S01
- Contract subphase: RP14.P00.M01.S01
- Test subphase: RP14.P05.M07.S01
- Hermes subphase: RP14.P08.M08.S01
- Claude subphase: RP14.P09.M09.S01

### SET-009: 시뮬레이션

- Description: 정산규칙 변경 효과 분석
- Acceptance: scenario 비교 가능
- Expected RP: RP14, RP15, RP16
- Primary implementation subphase: RP14.P02.M03.S01
- Contract subphase: RP14.P00.M01.S01
- Test subphase: RP14.P05.M07.S01
- Hermes subphase: RP14.P08.M08.S01
- Claude subphase: RP14.P09.M09.S01

### AI-001: Matter AI Search

- Description: 특정 Matter 내 자연어 검색
- Acceptance: 근거문서 표시
- Expected RP: RP17, RP18, RP07, RP06
- Primary implementation subphase: RP17.P02.M03.S01
- Contract subphase: RP17.P00.M01.S01
- Test subphase: RP17.P05.M07.S01
- Hermes subphase: RP17.P08.M08.S01
- Claude subphase: RP17.P09.M09.S01

### AI-002: Firmwide Precedent Search

- Description: 전사 선례검색
- Acceptance: 권한 있는 선례만 검색
- Expected RP: RP17, RP18, RP07, RP06
- Primary implementation subphase: RP17.P02.M03.S01
- Contract subphase: RP17.P00.M01.S01
- Test subphase: RP17.P05.M07.S01
- Hermes subphase: RP17.P08.M08.S01
- Claude subphase: RP17.P09.M09.S01

### AI-003: Clause Search

- Description: 조항유형별 검색·추천
- Acceptance: clause location 표시
- Expected RP: RP17, RP18, RP07, RP06
- Primary implementation subphase: RP17.P02.M03.S01
- Contract subphase: RP17.P00.M01.S01
- Test subphase: RP17.P05.M07.S01
- Hermes subphase: RP17.P08.M08.S01
- Claude subphase: RP17.P09.M09.S01

### AI-004: Document Summary

- Description: 문서 요약, 주요 조항, 리스크
- Acceptance: 문서버전 고정
- Expected RP: RP17, RP18, RP07, RP06
- Primary implementation subphase: RP17.P02.M03.S01
- Contract subphase: RP17.P00.M01.S01
- Test subphase: RP17.P05.M07.S01
- Hermes subphase: RP17.P08.M08.S01
- Claude subphase: RP17.P09.M09.S01

### AI-005: Email Thread Summary

- Description: 협상경과, 쟁점, next action
- Acceptance: 참조 email 표시
- Expected RP: RP17, RP18, RP07, RP06
- Primary implementation subphase: RP17.P02.M03.S01
- Contract subphase: RP17.P00.M01.S01
- Test subphase: RP17.P05.M07.S01
- Hermes subphase: RP17.P08.M08.S01
- Claude subphase: RP17.P09.M09.S01

### AI-006: Markup Analyzer

- Description: 원본과 수정본 비교·법률효과 분석
- Acceptance: 변경점별 근거 표시
- Expected RP: RP17, RP18, RP07, RP06
- Primary implementation subphase: RP17.P02.M03.S01
- Contract subphase: RP17.P00.M01.S01
- Test subphase: RP17.P05.M07.S01
- Hermes subphase: RP17.P08.M08.S01
- Claude subphase: RP17.P09.M09.S01

### AI-007: DD Issue Extraction

- Description: 실사자료에서 이슈 후보 추출
- Acceptance: 이슈별 근거문서 표시
- Expected RP: RP17, RP18, RP07, RP06
- Primary implementation subphase: RP17.P02.M03.S01
- Contract subphase: RP17.P00.M01.S01
- Test subphase: RP17.P05.M07.S01
- Hermes subphase: RP17.P08.M08.S01
- Claude subphase: RP17.P09.M09.S01

### AI-008: Contract Drafting

- Description: 선례·playbook 기반 계약서 초안
- Acceptance: 사람이 승인 후 문서화
- Expected RP: RP17, RP18, RP07, RP06
- Primary implementation subphase: RP17.P02.M03.S01
- Contract subphase: RP17.P00.M01.S01
- Test subphase: RP17.P05.M07.S01
- Hermes subphase: RP17.P08.M08.S01
- Claude subphase: RP17.P09.M09.S01

### AI-009: Litigation Assist

- Description: 사실관계·증거·판례 기반 서면 구조
- Acceptance: 인용근거 표시
- Expected RP: RP17, RP18, RP07, RP06
- Primary implementation subphase: RP17.P02.M03.S01
- Contract subphase: RP17.P00.M01.S01
- Test subphase: RP17.P05.M07.S01
- Hermes subphase: RP17.P08.M08.S01
- Claude subphase: RP17.P09.M09.S01

### AI-010: Report Generator

- Description: 고객보고서·executive summary 초안
- Acceptance: report document 생성
- Expected RP: RP17, RP18, RP07, RP06
- Primary implementation subphase: RP17.P02.M03.S01
- Contract subphase: RP17.P00.M01.S01
- Test subphase: RP17.P05.M07.S01
- Hermes subphase: RP17.P08.M08.S01
- Claude subphase: RP17.P09.M09.S01

### AI-011: Billing Narrative AI

- Description: 타임시트 청구문구 개선
- Acceptance: 원문과 개선안 비교
- Expected RP: RP17, RP18, RP07, RP06
- Primary implementation subphase: RP17.P02.M03.S01
- Contract subphase: RP17.P00.M01.S01
- Test subphase: RP17.P05.M07.S01
- Hermes subphase: RP17.P08.M08.S01
- Claude subphase: RP17.P09.M09.S01

### AI-012: Settlement anomaly

- Description: 정산 이상치 탐지
- Acceptance: rule basis 표시
- Expected RP: RP17, RP18, RP07, RP06
- Primary implementation subphase: RP17.P02.M03.S01
- Contract subphase: RP17.P00.M01.S01
- Test subphase: RP17.P05.M07.S01
- Hermes subphase: RP17.P08.M08.S01
- Claude subphase: RP17.P09.M09.S01

### NARR-001: 시스템 역할 17종

- Description: System Super Admin, Tenant Owner, Managing Partner, Practice Group Leader, Relationship Partner, Origination Partner, Responsible Partner, Matter Manager, Attorney, Paralegal, BD Manager, Finance Manager, Accounting Reviewer, Security Admin, External Counsel, Client User, Auditor
- Acceptance: The plan explicitly accounts for: System Super Admin, Tenant Owner, Managing Partner, Practice Group Leader, Relationship Partner, Origination Partner, Responsible Partner, Matter Manager, Attorney, Paralegal, BD Manager, Finance Manager, Accounting Reviewer, Security Admin, External Counsel, Client User, Auditor.
- Expected RP: RP01, RP02, RP21, RP26
- Primary implementation subphase: RP01.P02.M03.S01
- Contract subphase: RP01.P00.M01.S01
- Test subphase: RP01.P05.M07.S01
- Hermes subphase: RP01.P08.M08.S01
- Claude subphase: RP01.P09.M09.S01

### NARR-002: 권한 5계층 및 우선순위

- Description: RBAC, ABAC, Object ACL, Deny Rule, Security Trimming, Legal Hold, Ethical Wall
- Acceptance: The plan explicitly accounts for: RBAC, ABAC, Object ACL, Deny Rule, Security Trimming, Legal Hold, Ethical Wall.
- Expected RP: RP02, RP16
- Primary implementation subphase: RP02.P02.M03.S01
- Contract subphase: RP02.P00.M01.S01
- Test subphase: RP02.P05.M07.S01
- Hermes subphase: RP02.P08.M08.S01
- Claude subphase: RP02.P09.M09.S01

### NARR-003: 핵심 데이터 모델 전체

- Description: Tenant, Entity, Client, Matter, Document, Invoice, Payment, Settlement, AIJob
- Acceptance: The plan explicitly accounts for: Tenant, Entity, Client, Matter, Document, Invoice, Payment, Settlement, AIJob.
- Expected RP: RP01, RP04, RP05, RP06, RP12, RP13, RP14, RP17
- Primary implementation subphase: RP01.P02.M03.S01
- Contract subphase: RP01.P00.M01.S01
- Test subphase: RP01.P05.M07.S01
- Hermes subphase: RP01.P08.M08.S01
- Claude subphase: RP01.P09.M09.S01

### NARR-004: Analytics 대시보드와 수익성

- Description: Managing Partner Dashboard, Partner Dashboard, Matter P&L, Client Profitability, Forecast, WIP
- Acceptance: The plan explicitly accounts for: Managing Partner Dashboard, Partner Dashboard, Matter P&L, Client Profitability, Forecast, WIP.
- Expected RP: RP15
- Primary implementation subphase: RP15.P02.M03.S01
- Contract subphase: RP15.P00.M01.S01
- Test subphase: RP15.P05.M07.S01
- Hermes subphase: RP15.P08.M08.S01
- Claude subphase: RP15.P09.M09.S01

### NARR-005: 주요 업무 workflow

- Description: Opportunity, Matter 전환, 문서 Lifecycle, Billing Workflow, Settlement Workflow, Matter Closing
- Acceptance: The plan explicitly accounts for: Opportunity, Matter 전환, 문서 Lifecycle, Billing Workflow, Settlement Workflow, Matter Closing.
- Expected RP: RP05, RP06, RP09, RP12, RP14
- Primary implementation subphase: RP05.P02.M03.S01
- Contract subphase: RP05.P00.M01.S01
- Test subphase: RP05.P05.M07.S01
- Hermes subphase: RP05.P08.M08.S01
- Claude subphase: RP05.P09.M09.S01

### NARR-006: 화면 설계

- Description: Managing Partner Home, Partner Home, Attorney Home, Finance Manager Home, Matter 상세 화면
- Acceptance: The plan explicitly accounts for: Managing Partner Home, Partner Home, Attorney Home, Finance Manager Home, Matter 상세 화면.
- Expected RP: RP15, RP05, RP11, RP12
- Primary implementation subphase: RP15.P04.M03.S01
- Contract subphase: RP15.P00.M01.S01
- Test subphase: RP15.P05.M07.S01
- Hermes subphase: RP15.P08.M08.S01
- Claude subphase: RP15.P09.M09.S01

### NARR-007: 보안 컴플라이언스

- Description: Authentication, Authorization, Encryption, Key Management, DLP, Break-glass, Backup, Incident Response, WORM Storage
- Acceptance: The plan explicitly accounts for: Authentication, Authorization, Encryption, Key Management, DLP, Break-glass, Backup, Incident Response, WORM Storage.
- Expected RP: RP16, RP26, RP29
- Primary implementation subphase: RP16.P06.M05.S01
- Contract subphase: RP16.P00.M01.S01
- Test subphase: RP16.P05.M07.S01
- Hermes subphase: RP16.P08.M08.S01
- Claude subphase: RP16.P09.M09.S01

### NARR-008: 개인정보 관리

- Description: 수집 최소화, 목적 제한, 수신동의, 수신거부, 마스킹, 보존기간, subprocessors
- Acceptance: The plan explicitly accounts for: 수집 최소화, 목적 제한, 수신동의, 수신거부, 마스킹, 보존기간, subprocessors.
- Expected RP: RP04, RP09, RP16, RP17
- Primary implementation subphase: RP04.P06.M05.S01
- Contract subphase: RP04.P00.M01.S01
- Test subphase: RP04.P05.M07.S01
- Hermes subphase: RP04.P08.M08.S01
- Claude subphase: RP04.P09.M09.S01

### NARR-009: 감사로그 이벤트

- Description: Login, View, Download, Upload, Edit, Delete, Share, Permission Change, Search, AI Access, Billing Change, Payment Match, Settlement Run, Admin Access, Export, Break-glass
- Acceptance: The plan explicitly accounts for: Login, View, Download, Upload, Edit, Delete, Share, Permission Change, Search, AI Access, Billing Change, Payment Match, Settlement Run, Admin Access, Export, Break-glass.
- Expected RP: RP03, RP16, RP17, RP29
- Primary implementation subphase: RP03.P06.M05.S01
- Contract subphase: RP03.P00.M01.S01
- Test subphase: RP03.P05.M07.S01
- Hermes subphase: RP03.P08.M08.S01
- Claude subphase: RP03.P09.M09.S01

### NARR-010: 성능 목표

- Description: 로그인, Matter 목록, 문서목록, 일반검색, 복합검색, OCR 처리, AI 요약, Proforma 생성, 월정산 preview, 대량 업로드
- Acceptance: The plan explicitly accounts for: 로그인, Matter 목록, 문서목록, 일반검색, 복합검색, OCR 처리, AI 요약, Proforma 생성, 월정산 preview, 대량 업로드.
- Expected RP: RP06, RP07, RP12, RP14, RP18, RP29
- Primary implementation subphase: RP06.P07.M07.S01
- Contract subphase: RP06.P00.M01.S01
- Test subphase: RP06.P05.M07.S01
- Hermes subphase: RP06.P08.M08.S01
- Claude subphase: RP06.P09.M09.S01

### NARR-011: 가용성/RPO/RTO/DR

- Description: 99.0, 99.5, 99.9, 99.95, RPO, RTO, 백업, 재해복구, status page
- Acceptance: The plan explicitly accounts for: 99.0, 99.5, 99.9, 99.95, RPO, RTO, 백업, 재해복구, status page.
- Expected RP: RP26, RP29
- Primary implementation subphase: RP26.P07.M07.S01
- Contract subphase: RP26.P00.M01.S01
- Test subphase: RP26.P05.M07.S01
- Hermes subphase: RP26.P08.M08.S01
- Claude subphase: RP26.P09.M09.S01

### NARR-012: 확장성 목표

- Description: 5,000, 1,000,000, 100,000,000, 500,000,000, dedicated index, Vector index, rate limit, cold storage
- Acceptance: The plan explicitly accounts for: 5,000, 1,000,000, 100,000,000, 500,000,000, dedicated index, Vector index, rate limit, cold storage.
- Expected RP: RP26, RP27, RP29
- Primary implementation subphase: RP26.P07.M07.S01
- Contract subphase: RP26.P00.M01.S01
- Test subphase: RP26.P05.M07.S01
- Hermes subphase: RP26.P08.M08.S01
- Claude subphase: RP26.P09.M09.S01

### NARR-013: 권장 기술 아키텍처

- Description: Next.js, React, PostgreSQL, S3, OpenSearch, Redis, Queue, OCR, OIDC, Office.js, OpenTelemetry, Kubernetes, Terraform
- Acceptance: The plan explicitly accounts for: Next.js, React, PostgreSQL, S3, OpenSearch, Redis, Queue, OCR, OIDC, Office.js, OpenTelemetry, Kubernetes, Terraform.
- Expected RP: RP26, RP27, RP29
- Primary implementation subphase: RP26.P07.M02.S01
- Contract subphase: RP26.P00.M01.S01
- Test subphase: RP26.P05.M07.S01
- Hermes subphase: RP26.P08.M08.S01
- Claude subphase: RP26.P09.M09.S01

### NARR-014: 외부 연동

- Description: Microsoft 365, Outlook, Gmail, Google Workspace, Word, Excel, PowerPoint, 더존, WEHAGO, 홈택스, 은행, 법인카드, Slack, Teams, 전자서명, DART, 법원
- Acceptance: The plan explicitly accounts for: Microsoft 365, Outlook, Gmail, Google Workspace, Word, Excel, PowerPoint, 더존, WEHAGO, 홈택스, 은행, 법인카드, Slack, Teams, 전자서명, DART, 법원.
- Expected RP: RP08, RP22, RP23, RP24, RP25
- Primary implementation subphase: RP08.P02.M03.S01
- Contract subphase: RP08.P00.M01.S01
- Test subphase: RP08.P05.M07.S01
- Hermes subphase: RP08.P08.M08.S01
- Claude subphase: RP08.P09.M09.S01

### NARR-015: 한국형 로펌 특화

- Description: HWP, HWPX, 국문 계약서, 한국 법령, 판례, 등기, 정관, 의사록, LDD, RFI, CP, 전자세금계산서
- Acceptance: The plan explicitly accounts for: HWP, HWPX, 국문 계약서, 한국 법령, 판례, 등기, 정관, 의사록, LDD, RFI, CP, 전자세금계산서.
- Expected RP: RP20, RP23, RP24
- Primary implementation subphase: RP20.P02.M03.S01
- Contract subphase: RP20.P00.M01.S01
- Test subphase: RP20.P05.M07.S01
- Hermes subphase: RP20.P08.M08.S01
- Claude subphase: RP20.P09.M09.S01

### NARR-016: 로펌 경영 특화

- Description: Matter P&L, Partner Settlement, WIP, Fixed Fee, Client Profitability, Origination Tracking, AR Risk, Success Fee, Disbursement Recovery
- Acceptance: The plan explicitly accounts for: Matter P&L, Partner Settlement, WIP, Fixed Fee, Client Profitability, Origination Tracking, AR Risk, Success Fee, Disbursement Recovery.
- Expected RP: RP12, RP13, RP14, RP15
- Primary implementation subphase: RP12.P02.M03.S01
- Contract subphase: RP12.P00.M01.S01
- Test subphase: RP12.P05.M07.S01
- Hermes subphase: RP12.P08.M08.S01
- Claude subphase: RP12.P09.M09.S01

### NARR-017: AI-ready DMS

- Description: 문서버전 기반 AI, 권한연동 AI, 조항 단위 검색, 협상경과 요약, 마크업, 실사이슈, 고객보고서, Billing narrative
- Acceptance: The plan explicitly accounts for: 문서버전 기반 AI, 권한연동 AI, 조항 단위 검색, 협상경과 요약, 마크업, 실사이슈, 고객보고서, Billing narrative.
- Expected RP: RP06, RP07, RP17, RP18
- Primary implementation subphase: RP06.P02.M03.S01
- Contract subphase: RP06.P00.M01.S01
- Test subphase: RP06.P05.M07.S01
- Hermes subphase: RP06.P08.M08.S01
- Claude subphase: RP06.P09.M09.S01

### NARR-018: 착수 전 결정 필요사항

- Description: 제품 우선 포지션, 배포방식, 회계 범위, 전자세금계산서, DMS migration, 이메일 정책, AI 모델, HWP, 정산정책, 인건비 배부, 개인정보 보존, 권한정책, 선례관리, 외부공유
- Acceptance: The plan explicitly accounts for: 제품 우선 포지션, 배포방식, 회계 범위, 전자세금계산서, DMS migration, 이메일 정책, AI 모델, HWP, 정산정책, 인건비 배부, 개인정보 보존, 권한정책, 선례관리, 외부공유.
- Expected RP: RP00
- Primary implementation subphase: RP00.P00.M01.S01
- Contract subphase: RP00.P00.M01.S01
- Test subphase: RP00.P05.M07.S01
- Hermes subphase: RP00.P08.M08.S01
- Claude subphase: RP00.P09.M09.S01

