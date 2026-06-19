# matter People & HR Operations 명세

문서 버전: v0.1  
작성일: 2026-06-11

## 1. HR Pillar 위치

People & HR Operations는 matter의 별도 Product Pillar다. HR 데이터는 Matter Graph에 종속되지 않고 People Graph로 독립 존재하되, matter team, workload, time entry, access, onboarding/offboarding, HR legal risk와 필요한 지점에서 Matter Graph와 연결된다.

## 2. 핵심 원칙

| 원칙 | 내용 |
|---|---|
| User ≠ Employee | 로그인 계정과 인사관리 대상을 분리한다. |
| People Graph | Employee, Organization, Role Assignment, HR Document, Leave, Attendance, Recruitment를 그래프로 관리한다. |
| Rule Engine First | 급여·연차·근태·리스크 산정은 deterministic rule engine이 담당한다. |
| AI Explanation Only | LLM은 설명·요약·문서화·후보생성만 수행한다. |
| HR Sensitive Guard | 급여, 평가, 채용, 퇴사, 징계자료는 별도 권한 및 audit 적용. |

## 3. HR Domain 구조

| Domain | Module | 기능 |
|---|---|---|
| People Core | Employee Registry | 구성원 등록, 상태, profile |
| Organization | Org Structure | 팀, practice group, reporting line |
| Employment | Employment Lifecycle | 입사, 재직, 휴직, 수습, 퇴사 |
| HR Documents | HR Document Workspace | 근로계약서, 연봉계약서, 서약서, 동의서 |
| Time & Attendance | Attendance Manager | 출퇴근, 지각, 결근, 재택, 출장 |
| Leave | Leave Manager | 연차, 반차, 병가, 경조휴가 |
| Overtime | Overtime Manager | 사전승인, 사후승인, 미승인 초과근로 |
| Approval | HR Approval Workflow | 휴가, 근태정정, 문서승인 |
| Recruitment | ATS Lite | JD, 후보자, 면접, 평가코멘트 |
| Onboarding | Onboarding Assistant | 입사문서, 교육, 계정, 장비, 멘토 |
| Offboarding | Offboarding Assistant | 인수인계, 계정회수, 장비반납, 기밀유지 |
| HR Policy | Policy Knowledge Base | 취업규칙, 복무규정, 평가규정, 보안규정 |
| HR Risk | HR Legal Risk Copilot | 미체결, 동의누락, 연차촉진, 교육미이수, 초과근로 |
| HR Analytics | People Analytics | 인력, 근태, 휴가, 채용, 리스크 리포트 |
| HR AI | HR Assistant | RAG Q&A, 리포트 초안, 리스크 설명 |
| HR Data Room | HR Data Room Assistant | M&A/노무감사용 HR 자료정리 |

## 4. HR Core Objects

| Object | 주요 필드 |
|---|---|
| Employee | employee_id, name, status, org_unit, position, join_date |
| Employment Profile | employment_type, rank, title, reporting_manager, practice_group |
| HR Document | type, employee_id, status, signed_at, expiry, confidentiality |
| Employment Contract | start_date, position, salary_ref, work_location, contract_status |
| Compensation Record | effective_date, salary, bonus, allowance, restricted_access |
| Leave Balance | year, accrued, used, remaining, carryover |
| Leave Request | type, start, end, days, approver, status |
| Attendance Record | date, check_in, check_out, work_hours, source |
| Overtime Record | date, hours, approval_status, risk_flag |
| HR Policy | policy_type, version, effective_date, source_document |
| Candidate | candidate_id, job_opening_id, status, source, privacy_consent |
| Job Opening | title, department, hiring_manager, status |
| Interview | candidate_id, interviewer, date, feedback_status |
| Onboarding Plan | employee_id, tasks, due_dates, owner |
| Offboarding Plan | employee_id, resignation_date, account_recovery, handover |
| HR Risk Event | risk_type, source, severity, status, owner |

## 5. HR Rule Engine

| 영역 | Rule Engine 책임 |
|---|---|
| 연차 | 발생, 사용, 잔여, 이월, 촉진 대상 |
| 근태 | 소정근로, 연장, 야간, 휴일, 휴게시간 |
| 급여 | 기본급, 수당, 공제, 지급일, 변경이력. 계산 범위는 추가 확정 필요 |
| 결재 | 휴가, 근태정정, 연장근로 승인라인 |
| 교육 | 법정교육 대상, 이수기한, 미이수자 |
| 문서 | 근로계약·연봉계약 미체결자 |
| 개인정보 | 동의 유형, 보유기간, 파기대상 |
| 퇴사 | 계정회수, 장비반납, 인수인계 |
| 리스크 | 계약 미체결, 연차촉진 누락, 초과근로 위험 |

## 6. HR AI 기능

| 기능 | 설명 | 제한 |
|---|---|---|
| HR Assistant | 사규·취업규칙·휴가정책·근태정책 RAG Q&A | 내부근거 없는 답변 금지 |
| HR Document Summary | 근로계약서, 연봉계약서, 동의서 요약 | 템플릿 임의변경 금지 |
| HR Risk Explanation | rule engine 결과 자연어 설명 | 법적 최종판단 금지 |
| HR Report Draft | 월간 인력, 근태, 휴가, 채용, 교육, 리스크 리포트 | 원천 데이터 표시 |
| Recruitment Assistant | JD, 면접질문, 후보자 커뮤니케이션 초안 | 합격/불합격 판단 금지 |
| Onboarding/Offboarding Assistant | 절차 안내, 체크리스트 초안 | 실행은 승인 기반 |
| HR Data Room Assistant | M&A/노무감사 자료 정리 | 개인정보·민감정보 마스킹 필요 |
| Policy Consistency Checker | 취업규칙과 시스템 설정 불일치 후보 | HR/노무 검토 필요 |

## 7. HR 권한

| 데이터 | 접근 가능자 |
|---|---|
| 본인 기본정보 | 본인, HR |
| 본인 근태·휴가 | 본인, 상급자, HR |
| 팀 근태현황 | 팀장, HR |
| 급여정보 | 본인, Payroll 제한권한자, 제한 HR |
| 평가정보 | 평가권자, HR, 지정 관리자 |
| 채용정보 | HR, 채용담당자, 면접관 제한 |
| 근로계약서 | 본인, HR, 제한 관리자 |
| 징계·분쟁자료 | HR, 법무, 지정 파트너 |
| 퇴사자료 | HR, IT, 지정 관리자 |
| HR AI Output | 원천데이터 접근권한 기준 |

## 8. HR Data Room Assistant

| 자료 | 자동정리 후보 |
|---|---|
| 임직원 명부 | 고용형태, 입사일, 직급, 부서 |
| 근로계약 체결현황 | 체결/미체결 |
| 연봉계약 현황 | 최신 계약 여부 |
| 임원 보수·퇴직금 | 정관·주총·계약 확인 필요 표시 |
| 휴가부채 | 미사용연차 |
| 퇴사자 현황 | 퇴사 사유, 분쟁 여부 |
| 노동분쟁 자료 | 징계, 해고, 진정, 소송 |
| 개인정보 동의현황 | 수집·이용, 제3자 제공, 처리위탁, 국외이전 |
| 법정교육 이수현황 | 개인정보, 성희롱, 산업안전 등 |

## 9. HR Verification Gate

1. Employee와 User가 분리되어야 한다.
2. HR 민감정보는 일반 matter 권한만으로 접근 불가.
3. HR Assistant는 사용자 권한 범위 내 데이터만 context로 사용.
4. 급여·연차·근태 계산은 rule engine 결과를 사용.
5. AI는 채용·평가·징계·급여 판단을 확정하지 않는다.
6. HR AI query, source, response, approval, action이 audit에 기록된다.
