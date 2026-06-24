# HRO-PEOPLE-KO-UI-PARITY 실행 계획

Status: draft execution plan  
Date: 2026-06-24  
Program: `HRO-PEOPLE-KO-UI-PARITY`  
Parent program: `HRO-DEEL-PARITY`

## Goal

Deel web Jan 2026 스크린샷과 현재 HRX 백엔드 구현을 기준으로 Law Firm OS의 People 영역을 한국 HRX SaaS 톤에 맞는 한국어 UI로 재정렬한다. 이미 backend route, 권한 정책, audit evidence가 있는 기능은 기존 디자인 시스템에 맞춰 People UI에 반영하고, backend가 없거나 외부 provider/owner 결정이 필요한 기능은 작동하는 기능처럼 주장하지 않고 `구현 안됨`, contract, TUW, VC, evidence gate로 표시한다.

## Copy Standard

사용자에게 보이는 기능명은 한국 HR SaaS에서 쓰는 업무어를 따른다. 현재 구현 여부 때문에 `급여정산`, `성과관리`, `복리후생`, `전자계약`, `전자결재`, `근태관리`, `채용관리` 같은 자연스러운 SaaS 용어를 회피하지 않는다. 대신 구현 상태는 같은 화면에서 별도 badge, meta, empty state, table row로 솔직하게 표시한다.

| 개발자식/회피 표현 | 사용자 UI 문구 | 구현 상태 표기 |
| --- | --- | --- |
| 급여 경계 | 급여정산 | 계산·세금·지급 실행은 `구현 안됨` |
| Payroll boundary | 급여정산 | 미리보기와 내보내기만 구현됨 |
| export | 내보내기 | 실제 지급/송금 실행과 구분 |
| 계산 런타임 | 정산 실행 | 구현 안됨 |
| 지급 지시 | 지급 실행 | 구현 안됨 |
| 차단됨 | 구현 안됨 | 상태값 |
| 아티팩트 | 내보내기 파일 | 검토 자료로 표시 |
| People 문서/People 정책 | 인사 문서/인사 정책 | 권한/감사 상태 별도 표시 |

급여 관련 UI는 한국 HR SaaS 업무어에 맞춰 `급여정산`이라고 부른다. 다만 현재 구현은 정산 미리보기, 검토 승인, 내보내기 파일 생성만 제공한다. 계산, 세금 처리, 송금, 지급 실행은 아직 구현되지 않았다고 화면에 명시한다.

미구현 기능을 표시할 때의 원칙은 다음과 같다.

- 기능명은 한국 SaaS에서 쓰이는 표현 그대로 쓴다.
- 구현되지 않은 기능은 `구현 안됨` 또는 `아직 구현되지 않았습니다`로 표시한다.
- 일부만 구현된 기능은 `일부 구현됨`과 구현된 범위를 함께 표시한다.
- backend route나 외부 provider가 없는 기능에는 입력 form, 실행 button, 성공 상태를 만들지 않는다.
- contract/TUW/evidence가 없는 기능은 `사용 가능`, `완료`, `연동됨`, `실행됨`으로 표현하지 않는다.

## Design System Contract

새 People 화면은 기존 업무형 SaaS 디자인 시스템을 재사용한다.

- 기본 프레임: `PageHeader`, `Panel`, `DataTable`
- 레이아웃: `people-runtime-grid`, `span-2`
- 상태: `live-data-state live-data-loading`, `live-data-empty`, `live-data-error`
- 보조 설명: `people-panel-kicker`
- 행형 업무 카드: `approval-row`
- 버튼: `primary-button`, `secondary-button`

새 랜딩 페이지, 대형 hero, 설명 중심 card stack은 만들지 않는다. People 영역은 반복 업무를 빠르게 처리하는 조밀한 업무 화면이어야 한다.

## Current Backed UI Scope

| People 메뉴 | Section | Backend/API 상태 | UI 상태 |
| --- | --- | --- | --- |
| 구성원 | `people-members` | `/api/hrx/employees` | 구현됨, 프로필 확장 필요 |
| 인사 문서 | `people-documents` | `/api/hrx/documents` | 구현됨, Vault evidence 강화 필요 |
| 휴가 | `people-leave` | `/api/hrx/leave` | 구현됨, Matter 영향 연결 필요 |
| 승인 | `people-approvals` | `/api/hrx/approvals` | 구현됨, staffing/권한 승인 유형 필요 |
| 채용 | `people-recruiting` | `/api/hrx/recruiting/*` | 구현됨, Matter readiness 필요 |
| 입퇴사 | `people-lifecycle` | `/api/hrx/lifecycle/*` | 구현됨, 접근권한 plan/회수 필요 |
| 인사 정책 | `people-policy` | `/api/hrx/policies` | 구현됨 |
| 활동 기록 | `people-audit` | `/api/hrx/audit` | 구현됨, HR evidence timeline 강화 필요 |
| 인사 현황 | `people-analytics` | `/api/hrx/analytics` | 구현됨, capacity/staffing risk 지표 필요 |
| AI 검토 | `people-ai` | `/api/hrx/ai/*` | 구현됨, advisory-only guard 유지 |
| 급여정산 | `people-payroll` | `/api/hrx/payroll/*` | 미리보기/검토/내보내기만 구현됨, 계산·세금·지급 실행 미구현 |

## LazyCodex/OMO Pyramid

### WP `HRO-PKO-W00` - Worktree Split

목표: HR/People 변경을 Matter desktop, SF parity, Vault runtime 변경과 분리한다.

| TUW | 내용 | VC | Evidence |
| --- | --- | --- | --- |
| `HRO-PKO-W00-T01` | HR/People/HRO 파일 목록 확정 | `git status --short`, `git diff --name-only` | 분류표 |
| `HRO-PKO-W00-T02` | 공통 파일의 HR hunk 분리 기준 수립 | App/Shell/apiClient/styles/package hunk review | diff note |
| `HRO-PKO-W00-T03` | HR branch/commit 후보 생성 전 검증 | no destructive reset | branch note |

### WP `HRO-PKO-W01` - Korean HRX SaaS Copy

목표: People UI 문구를 한국 HR SaaS 톤으로 정리한다.

| TUW | 내용 | VC | Evidence |
| --- | --- | --- | --- |
| `HRO-PKO-W01-T01` | `급여 경계`를 `급여정산`으로 교체 | `rg "급여 경계" apps/web/src` returns 0 | UI diff |
| `HRO-PKO-W01-T02` | `export`, `artifact`, `runtime`, `boundary` 노출 문구 제거 | validator copy assertions | validator pass |
| `HRO-PKO-W01-T03` | People 전체 메뉴와 panel copy 한국어 일관성 확인 | Playwright screenshot | screenshot |

### WP `HRO-PKO-W02` - Employee Profile Matter Dossier

목표: 구성원 상세를 Law Firm OS형 People Dossier로 확장한다.

| TUW | 내용 | VC | Evidence |
| --- | --- | --- | --- |
| `HRO-PKO-W02-T01` | 프로필에 Matter 역할, 업무부하, 권한, 보상 마스킹, 감사 패널 추가 | employee profile e2e | screenshot |
| `HRO-PKO-W02-T02` | raw compensation 금지, 권한 필요 상태 표시 | negative regex validator | validator pass |
| `HRO-PKO-W02-T03` | backend projection 없으면 contract로 등록하고 UI 미노출 | no-fake-UI gate | contract diff |

### WP `HRO-PKO-W03` - HR Documents And Vault Evidence

목표: 인사 문서가 Vault evidence처럼 보이되 본문과 원본 경로를 노출하지 않는다.

| TUW | 내용 | VC | Evidence |
| --- | --- | --- | --- |
| `HRO-PKO-W03-T01` | 문서 유형, source ref, version ref, 보관 상태 표시 | hr-documents e2e | screenshot |
| `HRO-PKO-W03-T02` | document body, raw path 미노출 검사 | validator | pass |
| `HRO-PKO-W03-T03` | HRDocumentEnvelope 미구현 항목 contract 등록 | contract registry check | registry diff |

### WP `HRO-PKO-W04` - Leave And Matter Impact

목표: 휴가 신청을 Matter deadline, team coverage, capacity 영향과 연결한다.

| TUW | 내용 | VC | Evidence |
| --- | --- | --- | --- |
| `HRO-PKO-W04-T01` | 휴가 화면에 Matter 영향 요약 영역 추가 | leave-request e2e | screenshot |
| `HRO-PKO-W04-T02` | approval queue에 휴가 영향 근거 표시 | approval e2e | screenshot |
| `HRO-PKO-W04-T03` | backend에 영향 projection이 없으면 route contract 등록 | no fake data | contract diff |

### WP `HRO-PKO-W05` - Approvals And Staffing

목표: 승인 요청을 leave/document에서 Matter staffing, 권한 부여, wall 예외로 확장한다.

| TUW | 내용 | VC | Evidence |
| --- | --- | --- | --- |
| `HRO-PKO-W05-T01` | 승인 유형 label과 상태를 한국어 업무어로 정리 | approval e2e | screenshot |
| `HRO-PKO-W05-T02` | Matter staffing 승인 UI는 route 존재 시에만 노출 | route-policy check | validator |
| `HRO-PKO-W05-T03` | Risk/HR/Partner 승인 구분 contract 등록 | policy map check | registry diff |

### WP `HRO-PKO-W06` - Recruiting And Lifecycle

목표: 채용, 입사, 퇴사를 Matter readiness와 접근권한 plan으로 연결한다.

| TUW | 내용 | VC | Evidence |
| --- | --- | --- | --- |
| `HRO-PKO-W06-T01` | 채용 단계에 Matter readiness 항목 추가 | recruiting e2e | screenshot |
| `HRO-PKO-W06-T02` | 입사 task에 Vault/Calendar/Task/Timekeeping 권한 plan 표시 | lifecycle e2e | screenshot |
| `HRO-PKO-W06-T03` | 퇴사/role 종료 접근 회수 evidence 표시 | lifecycle e2e | screenshot |

### WP `HRO-PKO-W07` - Analytics

목표: 현황 화면에 capacity, leave impact, staffing risk, privacy grain을 표시한다.

| TUW | 내용 | VC | Evidence |
| --- | --- | --- | --- |
| `HRO-PKO-W07-T01` | 구성원 현황에 업무부하/Matter 배정 요약 추가 | hrx-analytics e2e | screenshot |
| `HRO-PKO-W07-T02` | row-level details 포함 여부를 한국어로 표시 | validator | pass |
| `HRO-PKO-W07-T03` | source-grounded analytics audit 기록 확인 | audit API check | command evidence |

### WP `HRO-PKO-W08` - AI Review

목표: AI는 advisory-only로 유지하고 최종 인사 결정 UI를 만들지 않는다.

| TUW | 내용 | VC | Evidence |
| --- | --- | --- | --- |
| `HRO-PKO-W08-T01` | AI 답변에 검토 상태와 참고 자료 표시 | hrx-ai-assistant e2e | screenshot |
| `HRO-PKO-W08-T02` | 채용/평가/급여 최종결정 요청 차단 문구 확인 | AI route test | validator |
| `HRO-PKO-W08-T03` | AI review queue와 audit evidence 연결 | audit check | command evidence |

### WP `HRO-PKO-W09` - Payroll Settlement Preview

목표: `급여정산` 화면은 현재 구현 범위를 preview/approval/export only로 표시하고, 계산·세금·지급 실행은 아직 구현되지 않았다고 명시한다.

| TUW | 내용 | VC | Evidence |
| --- | --- | --- | --- |
| `HRO-PKO-W09-T01` | 메뉴와 panel title에 `급여정산` 적용 | `rg "급여 경계" apps/web/src` | pass |
| `HRO-PKO-W09-T02` | 정산 실행/지급 실행이 `구현 안됨`으로 보이는지 확인 | hrx-payroll-boundary e2e | screenshot |
| `HRO-PKO-W09-T03` | net/gross/tax/disbursement raw field 미노출 | validator negative regex | pass |

### WP `HRO-PKO-W10` - Backend-Missing Deel Contracts

목표: backend 없는 Deel 기능도 한국 SaaS 용어는 그대로 쓰되, 작동 UI가 아니라 `구현 안됨` 상태와 contract registry로 보낸다.

| TUW | 내용 | VC | Evidence |
| --- | --- | --- | --- |
| `HRO-PKO-W10-T01` | 인력계획, 일괄수정, 추천채용은 한국 SaaS 용어로 기록하고 `구현 안됨` contract 등록 | hro validator | registry |
| `HRO-PKO-W10-T02` | 성과관리, 교육, 조직 몰입도는 한국 SaaS 용어로 기록하고 `구현 안됨` contract 등록 | hro validator | registry |
| `HRO-PKO-W10-T03` | IT 자산, 앱 연동, 알림 관리는 한국 SaaS 용어로 기록하고 `구현 안됨` contract 등록 | hro validator | registry |

### WP `HRO-PKO-W11` - External Owner Gates

목표: benefits, equity, immigration, background checks는 owner/provider 결정 전 UI 미노출.

| TUW | 내용 | VC | Evidence |
| --- | --- | --- | --- |
| `HRO-PKO-W11-T01` | provider/owner decision matrix 등록 | contract validator | registry |
| `HRO-PKO-W11-T02` | blocked section ids가 menu/router/api client에 없는지 확인 | no-fake-UI gate | validator |
| `HRO-PKO-W11-T03` | Hermes check-only evidence 첨부 | Hermes MCP check-only | pass output |

## Verification Commands

```bash
npm run hro:deel-parity:validate
npm run hrx:ui-api-backed:validate
npm run hrx:route-authz:validate
npm run hrx:ai-analytics:validate
npm run web:e2e -- people-home employee-list employee-profile hr-documents leave-request hrx-analytics hrx-ai-assistant hrx-payroll-boundary
```

## Manual QA Gate

1. People 상단 메뉴에서 `급여정산`이 보인다.
2. `급여정산` 화면 설명에 `미리보기와 내보내기만 구현됨`이 보인다.
3. 화면 설명에 `계산·세금·지급 실행은 아직 구현되지 않았습니다`가 보인다.
4. 미리보기, 검토 승인 기록, 내보내기 파일 생성만 가능하다.
5. 급여 계산, 세금 계산, 송금, 지급 지시, 실제 급여 실행은 `구현 안됨`으로 표시된다.
6. 모든 People 섹션은 한국어 loading/empty/error 상태를 가진다.
7. 한국 SaaS에서 쓰는 기능명은 구현 여부와 무관하게 자연스러운 용어를 쓴다.
8. backend route가 없는 기능은 `구현 안됨`으로 표시되고, 실행 button이나 성공 상태가 없다.

## Source Notes

- Lazyweb desktop references confirmed HRIS patterns around employee profiles, payroll dashboards, approvals, and HR operations cards.
- Korean HR SaaS/public references use terms such as `급여 관리`, `급여정산`, `급여명세서`, `근태`, `전자계약`, `전자결재`. Law Firm OS uses those natural product terms in UI labels, while marking unavailable behavior as `구현 안됨` instead of inventing softer substitute labels.
- Hermes MCP result is check-only. It does not authorize repo writes, deployment, production approval, final approval, or enterprise trust claims.
