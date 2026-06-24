# People 한국 SaaS 용어 전수점검

Status: terminology audit applied  
Date: 2026-06-24  
Scope: `apps/web/src/people`, `apps/web/src/admin/hrx`, `apps/web/src/candidate`, People navigation, HRX validators

## Audit Rule

기능명은 한국 SaaS에서 쓰는 자연스러운 업무어를 그대로 쓴다. 현재 기능이 구현되지 않았거나 일부만 구현된 경우에는 기능명을 숨기거나 어색한 대체어로 바꾸지 않고, 같은 화면에서 `구현 안됨`, `아직 구현되지 않았습니다`, `일부 구현됨`으로 솔직하게 표시한다.

## Summary

| Category | Result |
| --- | --- |
| People 메뉴 | 대체로 양호. `급여정산` 반영됨 |
| HRX 화면 제목 | 대체로 양호. `구성원`, `인사 문서`, `휴가 신청`, `승인 요청`, `채용 진행`, `입퇴사 업무`, `인사 정책`, `활동 기록`, `구성원 현황`, `인사 문의`, `급여정산` 사용 |
| 구현상태 표기 | 급여정산은 명확함. 다른 backend-missing 기능은 아직 메뉴에 노출되지 않음 |
| 개발자식 표현 | 앱 소스 사용자-facing 영역에는 `급여 경계`, `boundary`, `runtime`, `API-backed` 노출 없음 |
| 수정 완료 항목 | `아티팩트` fallback, `온보딩/오프보딩`, `오퍼`, 짧은 People 메뉴명 |
| 유지 가능 후보 | `Client`, `Matter`, `People`, `Vault` 제품축, `AI 검토`, `권한 필요`, `등록됨/미등록` |

## Current Menu Terms

| Current term | Assessment | Note |
| --- | --- | --- |
| 구성원 | 유지 | 한국 HR SaaS에서 자연스러운 직원/구성원 축 |
| 인사 문서 | 수정 완료 | 짧은 `문서` 대신 HR 영역을 명확히 표시 |
| 휴가 | 유지 | `근태/휴가`로 확장 가능하나 현재 기능은 휴가 중심 |
| 승인 | 유지 가능 | 한국 SaaS식으로 더 명확히 하려면 `전자결재` 가능. 현재 backend는 approvals라 `승인` 유지 가능 |
| 채용 | 유지 | 자연스러움 |
| 입퇴사 | 유지 | `온보딩/오프보딩`보다 사용자-facing에 적합 |
| 인사 정책 | 수정 완료 | 짧은 `정책` 대신 HR 정책 영역을 명확히 표시 |
| 활동 기록 | 수정 완료 | 짧은 `감사` 대신 일반 사용자에게도 읽히는 업무어로 표시 |
| 인사 현황 | 수정 완료 | 짧은 `현황` 대신 HR analytics 성격을 명확히 표시 |
| AI 검토 | 유지 | 현재 AI 기능 경계와 맞음 |
| 급여정산 | 유지 | 단, 현재 화면처럼 미리보기/검토/내보내기만 구현됨을 계속 표시해야 함 |

## Findings

### P1 - `아티팩트` fallback이 사용자에게 노출될 수 있음

- File: `apps/web/src/people/hrxApiClient.ts`
- Before: `문서:${previewId}:아티팩트`
- Why: 입력값이 비어 있으면 fallback 문자열이 급여정산 내보내기 결과에 표시될 수 있다.
- Recommended term: `문서:${previewId}:내보내기-파일`
- Status: 수정 완료

### P2 - `온보딩/오프보딩`은 이미 `입퇴사 업무`와 중복됨

- File: `apps/web/src/people/lifecycle/LifecycleBoard.tsx`
- Before: `온보딩과 오프보딩 업무를 관리합니다`
- Why: 한국 HR SaaS에서도 온보딩/오프보딩은 쓰이지만, 같은 화면 제목이 `입퇴사 업무`이므로 사용자-facing 톤을 맞추려면 `입사와 퇴사 업무를 관리합니다`가 더 자연스럽다.
- Recommended term: `입사와 퇴사 업무를 관리합니다`
- Status: 수정 완료

### P2 - `오퍼`는 채용 SaaS에서는 쓰이지만 한국어 업무어로는 더 자연스러운 대체가 있음

- Files:
  - `apps/web/src/people/recruiting/RecruitingPipeline.tsx`
  - `apps/web/src/candidate/CandidatePortal.tsx`
  - `apps/web/src/people/documents/HRDocumentWorkspace.tsx`
- Before: `오퍼`, `오퍼 문서`
- Why: 한국 SaaS에서도 `오퍼`는 통용되지만 HR 담당자 화면에서는 `채용 제안`, `채용 제안서`, `처우 제안`이 더 명확하다.
- Recommended terms:
  - Stage: `채용 제안`
  - Document: `채용 제안서`
- Status: 수정 완료

### P3 - `문서`, `정책`, `현황`, `감사` 메뉴는 간결하지만 더 구체화 가능

- File: `apps/web/src/components/Shell.jsx`
- Before: `문서`, `정책`, `현황`, `감사`
- Applied HR-specific terms:
  - `문서` -> `인사 문서`
  - `정책` -> `인사 정책`
  - `현황` -> `인사 현황`
  - `감사` -> `활동 기록`
- Status: 수정 완료

## Confirmed Good Terms

| Term | Reason |
| --- | --- |
| 급여정산 | 한국 HR SaaS에서 자연스러운 기능명. 현재 미구현 실행 범위도 화면에 명시됨 |
| 구현 안됨 | 구현상태를 숨기지 않는 명확한 상태값 |
| 아직 구현되지 않았습니다 | 급여 계산/세금/지급 실행 미구현 상태를 사용자에게 솔직하게 전달 |
| 권한 필요 | 민감정보/문서 본문 보호 상태에 적합 |
| 등록됨 / 미등록 | 문서, 지원 경로, 일정 상태에 적합 |
| 인사 문서 | People 문서보다 자연스러운 한국 HR SaaS 용어 |
| 인사 정책 | People 정책보다 자연스러운 한국 HR SaaS 용어 |
| 입퇴사 업무 | 온보딩/오프보딩보다 화면 제목으로 자연스러움 |

## No-Fake-Working-UI Check

현재 `benefits`, `equity`, `immigration`, `background checks`, `performance`, `learning`, `workforce planning`, `bulk edit`, `IT assets`, `apps`, `notification admin` 계열은 working People 메뉴로 노출되지 않는다. 이후 노출할 때는 한국어 기능명은 그대로 쓰되 다음 상태를 반드시 붙인다.

| Feature family | Korean UI term | Required state if backend missing |
| --- | --- | --- |
| Benefits | 복리후생 | 구현 안됨 |
| Equity | 스톡옵션/지분보상 | 구현 안됨 |
| Immigration | 비자/체류자격 | 구현 안됨 |
| Background checks | 평판조회/백그라운드 체크 | 구현 안됨 |
| Performance | 성과관리 | 구현 안됨 |
| Learning | 교육관리 | 구현 안됨 |
| Workforce planning | 인력계획 | 구현 안됨 |
| Bulk edit | 일괄수정 | 구현 안됨 |
| IT assets | IT 자산 | 구현 안됨 |
| Apps | 앱 연동 | 구현 안됨 |
| Notifications | 알림 관리 | 구현 안됨 |

## Applied Patch

1. `문서:${previewId}:아티팩트` -> `문서:${previewId}:내보내기-파일`
2. `온보딩과 오프보딩 업무를 관리합니다` -> `입사와 퇴사 업무를 관리합니다`
3. `오퍼`/`오퍼 문서` -> `채용 제안`/`채용 제안서`
4. People 메뉴 `문서`/`정책`/`감사`/`현황` -> `인사 문서`/`인사 정책`/`활동 기록`/`인사 현황`
