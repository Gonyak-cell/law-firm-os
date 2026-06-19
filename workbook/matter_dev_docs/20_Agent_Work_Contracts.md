# matter Agent Work Contracts

문서 버전: v0.1  
작성일: 2026-06-11

## 1. 공통 Agent Work Contract

| 항목 | 내용 |
|---|---|
| Objective | agent가 달성해야 할 구체 목표 |
| Input Scope | 읽을 수 있는 문서, 파일, 객체, log 범위 |
| Output Scope | 생성할 수 있는 산출물 |
| Files to Read | 읽기 허용 파일 |
| Files to Modify | 수정 허용 파일 |
| Files Not to Modify | 수정 금지 파일 |
| Permission Boundary | 접근 가능한 데이터 범위 |
| Security Constraints | 민감정보, 외부전송, export 제한 |
| Verification Contract | 완료검증 항목 |
| Stop Condition | 중단 조건 |
| Escalation Rule | 상위 검토 조건 |
| Ledger Record | 기록해야 할 Decision/Execution/Learning |

## 2. Planner Agent

| 항목 | 내용 |
|---|---|
| 책임 | 목표를 Pillar, Domain, Module, TUW, dependency로 분해 |
| 입력 | Product Constitution, PRD/SRS, 기존 backlog |
| 출력 | TUW 후보, risk, dependency, verification draft |
| 금지 | 사양에 없는 기능 확정, 권한·보안 생략 |
| Escalation | 불명확한 정책, critical risk, scope conflict |

## 3. Executor Agent

| 항목 | 내용 |
|---|---|
| 책임 | TUW를 구현 |
| 입력 | Agent Work Contract, related files, test fixture |
| 출력 | code changes, migration, test, docs update |
| 금지 | Files Not to Modify 수정, 권한검증 우회, audit 생략 |
| Completion | Verification Contract 통과 |

## 4. Verifier Agent

| 항목 | 내용 |
|---|---|
| 책임 | 기능·권한·보안·audit·회귀 검증 |
| 입력 | TUW output, test result, diff, logs |
| 출력 | pass/fail, defect list, regression impact |
| 금지 | 구현자 self-approval로 critical release 통과 |
| Escalation | 권한위반, 데이터손상, audit 누락, AI source 미비 |

## 5. Governor Agent

| 항목 | 내용 |
|---|---|
| 책임 | 정책, 보안, legal/HR risk, release gate 통제 |
| 입력 | risk assessment, verification result, ledger |
| 출력 | approve, block, request change, escalate |
| 금지 | critical risk를 무검토로 승인 |

## 6. Outlook Filing Agent

| 항목 | 내용 |
|---|---|
| 책임 | 이메일 metadata, attachment filing 후보 처리 |
| 입력 | Outlook item metadata, user-selected matter |
| 출력 | Email object, Document object, audit event |
| 금지 | 사용자가 접근권한 없는 matter로 filing, 권한 없는 attachment 저장 |
| Verification | matter ACL, file_ref, email-thread, audit 검증 |

## 7. Legal QC Agent

| 항목 | 내용 |
|---|---|
| 책임 | 문서 정합성 오류 후보 탐지 |
| 입력 | document text, metadata, matter terms, template |
| 출력 | QC report, issue/task 후보 |
| 금지 | 법률결론 자동확정, 문서 자동최종화 |
| Verification | source location, false positive review, send gate 적용 |

## 8. HR Assistant Agent

| 항목 | 내용 |
|---|---|
| 책임 | HR RAG 답변, 리포트 초안, rule engine 결과 설명 |
| 입력 | 권한검증된 HR policy/data, rule engine result |
| 출력 | source-grounded answer, HR report draft, action candidate |
| 금지 | 급여·연차·근태 산정, 채용·평가·징계 판단 자동확정 |
| Verification | HR guardrail, source required, audit, action approval |

## 9. Vault Sync Agent

| 항목 | 내용 |
|---|---|
| 책임 | Matter Vault export/import/sync 후보 처리 |
| 입력 | core object graph, vault note changes |
| 출력 | markdown notes, diff, conflict report, import candidates |
| 금지 | approval 없이 원본 DB 변경, 권한 없는 객체 export |
| Verification | object_id mapping, ACL, conflict detection, audit |
