# matter Portal Platform 명세

문서 버전: v0.1  
작성일: 2026-06-11

## 1. Portal Platform 개요

Portal은 외부 또는 제한 사용자가 matter 내부의 승인된 projection만 접근하도록 하는 경계면이다. Client Portal만 별도 구현하지 말고 Portal Platform으로 일반화한 뒤, Client, Employee, Candidate, External Expert portal을 하위 타입으로 둔다.

## 2. Portal 유형

| Portal | 대상 | 핵심 기능 |
|---|---|---|
| Client Portal | 고객 | 자료요청, 업로드, 공유문서, 승인, Q&A, 일정 |
| Employee Portal | 내부 구성원 | 휴가, 근태, HR 문서, 사규 Q&A, 온보딩 |
| Candidate Portal | 채용후보자 | 지원자료, 면접일정, 개인정보동의, 문서제출 |
| External Expert Portal | 외부전문가 | 지정 matter의 제한 문서·task·Q&A |

## 3. Portal Projection 원칙

내부 객체를 그대로 노출하지 않는다. Portal Service가 외부공개용 projection object를 생성한다.

| 내부 객체 | Portal 표시 |
|---|---|
| Issue | 고객공개용 summary와 client action item만 |
| Task | 외부 사용자 action item만 |
| Document | 공유 승인된 문서만 |
| Email | 원칙적으로 비공개 |
| AI Output | 원칙적으로 비공개, 승인된 summary만 |
| Deadline | 외부 사용자 관련 일정만 |
| Billing | 표시 여부 별도 정책 |
| HR Data | 본인 또는 권한 범위 내 정보만 |

## 4. Client Portal 기능

| 기능 | 설명 |
|---|---|
| Client matter view | 진행상황, 요청자료, 공유문서, 일정 |
| Upload room | 고객자료 업로드 |
| Request list | RFI 또는 일반 요청자료 상태 |
| Shared document room | 검토본, 보고서, 계약서 다운로드 |
| Approval | 계약조건, 제출본, 자료확인 승인 |
| Q&A | 고객 문의 및 답변 |
| Notification | 미제출자료, 승인대기, 기한 알림 |
| Audit | 열람, 다운로드, 업로드, 승인 로그 |

## 5. Employee Portal 기능

| 기능 | 설명 |
|---|---|
| My profile | 본인 정보 확인 |
| Leave request | 휴가신청 |
| Attendance | 출퇴근·근태 확인 |
| HR Documents | 근로계약서, 연봉계약서, 서약서 확인 |
| HR Policy Q&A | 사규·취업규칙 RAG 답변 |
| Onboarding | 입사 체크리스트 |
| Offboarding | 퇴사 체크리스트 |

## 6. Candidate Portal 기능

| 기능 | 설명 |
|---|---|
| Application | 지원자료 제출 |
| Interview schedule | 면접일정 확인 |
| Document submission | 개인정보동의, 이력서, 포트폴리오 제출 |
| Status | 채용단계 표시. 단, 내부 평가정보 미노출 |
| Communication | 안내문·질의응답 |

## 7. Verification Gate

1. portal user가 내부 API로 우회 접근 불가.
2. external projection 외 내부 object 미노출.
3. 공유문서 다운로드와 업로드 audit 기록.
4. link expiry, revocation, watermark 정책 적용.
5. HR portal에서 본인 범위를 초과한 급여·평가·채용정보 미노출.
