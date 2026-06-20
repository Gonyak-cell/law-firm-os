# HRX Enterprise Roadmap Delivery Package

문서 상태: 개발팀 전달용 roadmap package  
기준일: 2026-06-20  
기준 브랜치: `codex/lawos-current-work-snapshot`  
범위: HRX / People Operations 미구현분 구현 계획  

## 패키지 목적
현재 HRX는 CMP-G3 기준 runtime API evidence 단계까지 올라왔지만, durable production persistence, route-level HR-sensitive authz, durable audit, step-up enforcement, real tenant/actor context, enterprise readiness는 아직 완료되지 않았습니다. 이 패키지는 개발팀이 남은 작업을 TUW 기준으로 PR과 sprint에 바로 편성할 수 있도록 만든 실행 문서 묶음입니다.

## 포함 문서

| File | Purpose |
|---|---|
| 01_MASTER_ROADMAP.md | 전체 개발 로드맵 본문 |
| 02_PYRAMID_TOC.md | 피라미드 계층 구조 목차 |
| 03_TUW_BACKLOG.csv | 전체 TUW backlog import file |
| 04_PR_SEQUENCE.md | PR/branch sequencing |
| 05_ACCEPTANCE_GATES.md | 완료 판정 gate |
| 06_VALIDATOR_TEST_PLAN.md | validator/test command plan |
| 07_ARCHITECTURE_DATA_MODEL.md | target architecture and schema plan |
| 08_RISK_REGISTER.md | risk register |
| 09_30_60_90_PLAN.md | 30/60/90 day execution plan |
| 10_DEV_HANDOFF_CHECKLIST.md | handoff checklist |
| 11_DECISION_LOG_TEMPLATE.md | owner decision log template |
| 12_GO_NO_GO_TEMPLATE.md | go/no-go review template |
| HRX_Enterprise_Roadmap_Dev_Package_ko.docx | 회의/승인용 consolidated DOCX |

## 엄격한 claim boundary
- 이 패키지는 production go-live 승인 문서가 아닙니다.
- `runtime_api_evidence_only__durable_persistence_open` 상태를 인정하고, 이를 `runtime_write_ready__durable_persistence_guarded`로 승격하기 위한 계획입니다.
- owner approval, production deployment, external provider execution, R4 claim은 본 패키지 자체로 승인되지 않습니다.
