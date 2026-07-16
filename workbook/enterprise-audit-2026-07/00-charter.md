# W0 헌장·증거 인벤토리

## 1. 실행 헌장

| 항목 | 내용 |
|---|---|
| 스냅샷 | [직접 재실행] `e5b74852a6576189d59308971697fac8714f2e6b` |
| 기준 브랜치 | [직접 재실행] `codex/lcx-vltui-owner-approval-intake` |
| 기준 커밋 | [직접 재실행] `docs(desktop): record v0.1.8 github release` |
| 본 워크트리 상태 | [직접 재실행] 기존 `artifacts/manual-qa` 수정 13건 관측. 지시서의 14건과 수량이 다르며, 모두 미접촉. |
| 검증 worktree | [직접 재실행] `/Users/jws/lawos-audit-wt`를 스냅샷 해시에 detached worktree로 생성해 W1 실행 |
| 허용 쓰기 | `workbook/enterprise-audit-2026-07/` 신규 파일만 |
| 보안 상세 | `/Users/jws/lawos-backups/enterprise-audit-2026-07-security/`에 별도 저장, workbook에는 리스크명·위험도·개선 방향만 |
| production_ready_claim | `false` 유지. DEC-RS-001과 synthetic_only 경계 때문에 이 감사에서는 프로덕션 판정 부여 금지 |

## 2. 판정 축

| 축 | 정의 | 판정 상한 |
|---|---|---|
| 축 A 현재 배포 모델 | 로컬 런타임 + Electron desktop, 단일 로펌 9인 운영 | 내부 파일럿 가능까지 검토하되, 이 감사에서는 직접 표본에 따라 결정 |
| 축 B 엔터프라이즈 SaaS 목표 | 멀티테넌시, SSO/SAML/OIDC/SCIM, MFA, 과금/seat, SOC 2/ISO 준비도 | 갭 중심 평가. 현재 코드에 프로덕션 판정 부여 금지 |

## 3. 제외 범위

| 범위 | 처리 |
|---|---|
| `node_modules`, `dist`, 캐시 | 감사 grep·수치 산정에서 제외 |
| `apps/desktop/dist/mac/matter.app/.../runtime` | 패키징 번들 중복으로 제외. 소스 혼재 위험만 언급 |
| 기존 dirty `artifacts/manual-qa` | 읽기·상태 확인 외 미접촉 |
| 코드 수정 | 금지. 결함은 기록만 하고 W7 remediation 지시서로 전환 |

## 4. 기존 증거 인벤토리

| 증거군 | 스펙 선등록 | 스냅샷 재확인 | 판정 | 담당 W |
|---|---:|---:|---|---|
| `artifacts/manual-qa` 전체 파일 | 148 | 124 | 부분 확인됨 [직접 재실행] | W1/W4/W5 |
| `upl-*` | 77 | 75 | 부분 확인됨 [직접 재실행] | W1/W4/W5 |
| `wave1-*` | 5 | 5 | 확인됨 [직접 재실행] | W1/W5 |
| 기존 workbook 감사 1 | `erp-crm-hrx-concept-depth-audit-2026-07-02.md` | 존재 | 확인됨 [직접 재실행] | W4/W7 |
| 기존 workbook 감사 2 | `concept-implementation-gap-audit-and-improvement-plan-2026-07-02.md` | 존재 | 확인됨 [직접 재실행] | W4/W7 |

## 5. 기존 감사 2종 요지

| 문서 | 3줄 요지 |
|---|---|
| `workbook/erp-crm-hrx-concept-depth-audit-2026-07-02.md` | 최초 컨셉은 Outlook Add-in, People/HR Ops, Matter Graph 결합을 핵심으로 정의한다. 2026-07-02 당시 전 축에서 운영 가능 4점은 0개였고, ERP·CRM·HRX 모두 와이어링·영속·실연동 부족이 상한을 만들었다. 개선 방향은 실인증, 내구 DB, 문서 바이트, 실 LLM, 청구·충돌검사·HR 결재의 수직 완주였다. |
| `workbook/concept-implementation-gap-audit-and-improvement-plan-2026-07-02.md` | 제품 정의는 Matter 중심 Legal Knowledge Work Platform이다. 06-12 대비 API·desktop·실데이터 투입은 전진했으나 runtime_ready 0/0, 자기주장 헤더, JSON 파일스토어, launch 원장 불일치가 핵심 갭으로 남았다. 2026-07-15 deferral 재판정과 실데이터 보호·신뢰경계·영속성 회복이 우선 과제로 지정됐다. |

## 6. 증거 원칙

모든 판정은 `확인됨`, `부분 확인됨`, `미확인`, `구현 없음`, `구현되어 있으나 작동 불명`, `구현되어 있으나 운영 부적합` 중 하나만 사용한다. 모든 표본에는 `[직접 재실행]`, `[기존 증빙 인용·재검증됨]`, `[기존 증빙 인용·미재검증]` 라벨을 붙인다.
