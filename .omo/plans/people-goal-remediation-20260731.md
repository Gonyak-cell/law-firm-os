# People 전체 메뉴 목표 재검증 및 보완 계획

- 기준 문서: `.lazyweb/design-improve/people-tuw-detailed-plan-v2-2026-07-30/report.html`
- 기준 범위: `PEO-TUW-001`부터 `PEO-TUW-070`
- 브랜치: `codex/people-implementation-v2-20260730`
- 원칙: 단위 테스트 존재 여부가 아니라 실제 화면 → API → 도메인 → 저장소 → 외부 포트의 연결 경로로 판정한다.
- 제외: 비활성으로 설계된 사이드바 메뉴와 직접 경로는 활성화하지 않는다.
- 완료 판정: 소스 구현 완료와 외부 연동·배포 완료를 구분한다.

## 재검증 결과

기존 `implementation-completion-receipt.json`의 `implemented_and_verified` 선언은 실제 실행 경로와 일치하지 않았다. 아래 결함을 추가 testable unit으로 전환한다. 단순 증거 파일 부족은 기능 결함과 구분하되, 최종 완료 영수증에는 재현 가능한 원시 로그·소스 SHA·화면 SHA를 포함한다.

## 추가 testable units

| 단위 | 연결 대상 | 구현 범위 | 합격 기준 |
|---|---|---|---|
| PEO-FIX-006-A | PEO-006/017/018 | API 운영 플래그·텔레메트리·PostgreSQL 런타임 배선 | 기본 off 404, on 시 팀 현황·개인 오늘 API 활성, PII 없는 지표 기록 |
| PEO-FIX-007-A | PEO-007/018 | 활성 로그인 연결만 사용하고 누락·중복·철회를 별도 상태로 전달 | 연결 불명확 시 `업무 0건` 금지, `identity_link_required` 표시 |
| PEO-FIX-007-B | PEO-007~015 | Matter 담당자·업무의 User↔Employee 무결성 강제 | 동일 tenant의 실제 User와 활성 로그인 연결·Matter 구성원만 저장하고 불일치·Employee ID 혼용은 거부·격리 |
| PEO-FIX-008-A | PEO-008/009/011/014 | 기존 Matter 담당자·재판·업무의 명시적 durable 이관 | dry-run/apply, 원자 저장, 재실행 replay, 재시작 readback, quarantine |
| PEO-FIX-012-A | PEO-012/014/018 | Matter 업무 생성 화면의 `assigned_to_user_id` 연결 | 화면 선택 → API payload → 저장 → 개인 오늘 업무 조회 통합 검증 |
| PEO-FIX-012-B | PEO-012/014 | Matter 담당자 선택기의 사람 식별 정보와 저장 식별자 분리 | 화면에는 권한 범위 안의 구성원 이름·직책만 표시하고 내부 User ID는 노출하지 않으며, 선택 결과는 권위 있는 `assigned_to_user_id`로 저장 |
| PEO-FIX-021-A | PEO-021/025 | 미래 기일마다 해당 시점 담당자 판정 | 예정 인계·담당 공백·기간 경계 회귀 통과 |
| PEO-FIX-021-B | PEO-018/021 | 당일 인계가 있는 재판기일의 담당자 판정 | 조회 시각이 아니라 각 기일 시작 시각의 담당 변호사에게만 귀속 |
| PEO-FIX-023-B | PEO-018/023/024 | 알 수 없는 업무량·자정 경계·시작만 있는 업무 보존 | 계정 연결 불명확 시 수치 미표시, 자정 종료 일정 중복 없음, 종료 없는 업무는 시간 미정 목록에 1회 표시 |
| PEO-FIX-023-C | PEO-018/020/023/024/030 | 전날 시작해 오늘까지 이어지는 시간 구간의 공통 겹침 판정 | Today 큐·팀 시간표·승인 휴가가 tenant day와 겹치면 당일 구간으로 잘라 1회 포함하고, 당일 00:00에 끝난 구간은 제외 |
| PEO-FIX-030-A | PEO-030 | 실제 근무 구간과 일정·휴가의 교집합으로 남은 시간 계산 | 근무 외 회의 미차감, 전날 시작 휴가 반영, 중복 차감 없음 |
| PEO-FIX-031-A | PEO-031/032 | Outlook 신원·동의 이력과 opaque token vault 운영 계약 | tenant 격리, 재연결 감사, restart 유지, test-only memory adapter 차단, 운영 런타임의 주입 가능한 기준 시각으로 날짜·종료 회의 판정을 결정적으로 검증 |
| PEO-FIX-033-A | PEO-033/034 | 실제 Graph attendee 스키마·calendarView·cache 조합 | required/optional/unknown, 401/429/stale, 주소·토큰 비저장 |
| PEO-FIX-036-A | PEO-036 | partial 응답에도 동일 개인정보 allowlist 적용 | provider/series/iCal ID·본문·주소·토큰 직렬화 0건 |
| PEO-FIX-038-A | PEO-038 | 웹·패키지 앱 OAuth 시작/콜백/완료 연결 | Microsoft 호스트 allowlist, state 일치, one-shot 완료, 취소·재시도 |
| PEO-FIX-039-A | PEO-039/042/046/047 | 편집 상태 초기화·자연스러운 용어·대상 이름 가독성 | 이전 성공과 현재 실패 동시 노출 없음, 이름 잘림 없음 |
| PEO-FIX-039-B | PEO-046/047 | 입·퇴사 대상 실명과 권한별 대체 문구 연결 | 조회 권한이 있으면 실제 구성원명, 없으면 개인정보를 추론할 수 없는 일반 문구 표시 |
| PEO-FIX-041-A | PEO-039/041 | 구성원과 로그인 계정 연결 후보의 권위·표시 계약 | 같은 tenant의 활성·로그인 허용·미연결 계정만 후보이며, 화면 값과 접근성 문구에는 내부 User ID·식별자형 이름·이메일을 노출하지 않음 |
| PEO-FIX-045-A | PEO-043~045 | 채용 자료 출처와 구성원 전환의 서버 권위 | 브라우저가 후보·문서·보상 참조, employee/profile ID, 관리자·면접자를 임의 생성하지 않고, 운영 출처 권위가 없으면 신규 채용 자료 쓰기는 명시적으로 차단하며 기존 수락 건 전환은 저장된 공고·제안에서 결정적으로 파생 |
| PEO-FIX-045-B | PEO-043~045 | 채용 파이프라인 최초 등록의 원자 저장과 내구 멱등 재시도 | 공고·동의·지원자·지원·면접·제안 6개 레코드를 하나의 트랜잭션으로 저장하고, 중간 장애는 부분 레코드 0건이며 동일 tenant·멱등키 재시도와 프로세스 재시작 후에도 동일 receipt·식별자를 반환하고 다른 tenant와 충돌하지 않음 |
| PEO-FIX-047-A | PEO-047 | 퇴사 접근 회수와 휴가 정산의 권위 증거 연결 | case-local 위조 상태 거부, source version·evidence ref 원자 저장 |
| PEO-FIX-049-A | PEO-049/051 | 본인 근태 권한·초과근로 신청/승인 권한 분리·시간 입력 가독성 | 본인 기록 허용, 대리 신청·자기 승인·범위 밖 승인 거부 |
| PEO-FIX-049-B | PEO-049/051 | 본인용 근태·초과근로 생성의 actor 고정 | People 관리자도 본인용 API로 다른 구성원 기록을 만들 수 없고 별도 관리자 경로만 사용 |
| PEO-FIX-051-B | PEO-051 | 출퇴근 기록 없는 날짜의 초과근로 신청 경계 | null 오류 대신 안정된 업무 오류로 거부하고 시간·분을 추정하지 않음 |
| PEO-FIX-054-A | PEO-054 | 휴가 정책 변경 step-up 강제 | 생성·수정·게시·새 버전의 미검증/목적 불일치 403 |
| PEO-FIX-058-A | PEO-058/059 | 제공자 상태 보존·callback 정산·캠페인 업무 중복 방지 | sent를 delivered로 승격 금지, 단조 상태 전이, 다른 key 중복 생성 방지 |
| PEO-FIX-061-A | PEO-061/062 | 급여기간별 마감 점검과 안전한 처리 링크 | 기간 밖 정정 제외, 처리 후 복귀·다시 점검, 외부/비활성 링크 차단 |
| PEO-FIX-061-B | PEO-061/065 | 급여 규칙의 전체 급여기간 적용 범위 검증 | 마감 점검과 계산이 기간 시작부터 종료까지 덮는 동일한 게시 규칙만 선택하고 중간 시행·종료·중복은 차단 |
| PEO-FIX-063-A | PEO-063 | 정정 정산 멱등키를 전체 payload에 결합 | 같은 key·다른 구성원/금액/사유/과세/정정 ID는 충돌 |
| PEO-FIX-063-B | PEO-063 | 빈 정정 정산의 일반 생성 경로 우회 차단 | `run_type=adjustment`는 항상 전용 생성기를 사용하고 누락·빈 조정 목록은 저장 전 거부 |
| PEO-FIX-063-C | PEO-063/069 | 지원하지 않는 과지급 회수 흐름의 안전 차단 | 회수·상계 원장이 없는 음수·0원 정정은 생성 전 거부하고 지급 준비도 부분 배치 없이 명확한 상태로 차단 |
| PEO-FIX-064-A | PEO-064 | 급여 항목·프로필·구성원 배정 API를 화면에 연결 | CRUD·적용일·배정·재조회·권한별 가림 브라우저 검증 |
| PEO-FIX-064-B | PEO-064 | 급여 프로필을 실제 보상 기록·공제 입력에 결합 | 구성원 소유 보상 기록과 명시적 공제 입력만 저장하고 존재하지 않거나 다른 구성원 참조는 거부, 이후 입력 확정 성공 |
| PEO-FIX-064-C | PEO-064 | 급여 프로필·배정 변경과 종료 경로 연결 | 기존 프로필 수정과 append-only 배정 종료·새 버전 생성을 API·화면에 연결하고 적용일·재조회 검증 |
| PEO-FIX-067-A | PEO-067 | 최저임금 법률 검토 승인 전이 | pending → legal approved → reviewed → published, 자기 승인·step-up 음성 테스트 |
| PEO-FIX-068-A | PEO-068 | 운영 합성 제공자 차단·durable attempt/idempotency | operational `external-required`, payload 충돌, 최대 재시도·재시작 검증 |
| PEO-FIX-068-B | PEO-068/069 | 지급 외부 호출 선점과 결과 대사의 원자적 완료 | durable idempotency를 외부 호출 전에 선점하고 항목·배치·operation·감사를 한 트랜잭션으로 저장해 중복 호출·부분 상태 없음 |
| PEO-FIX-068-C | PEO-068/069 | 신고 제출 시작 상태의 중단 복구 | provider operation 시작·신고 상태·시도 기록을 원자 저장하거나 만료 lease로 동일 payload만 안전 재개 |
| PEO-FIX-068-D | PEO-061/068/069/070 | 급여 작업별 추가 인증 목적 격리 | route policy의 지급·신고·명세서·연말정산 목적과 정확히 일치하는 토큰만 허용하고, 누락·미등록·다른 목적 토큰은 실제 HTTP 경계에서 거부 |
| PEO-FIX-068-E | PEO-068/069/070 | 급여 제공자 오류의 공개 응답 안전화 | 은행·신고·명세서 제공자의 원문 예외와 계좌·세금 식별자·토큰은 응답·공개 감사 DTO에 0건이며, allowlist 코드와 고정 안내만 반환 |
| PEO-FIX-069-A | PEO-069 | 지급 파일 응답의 계좌 원문 제거 | API 응답에 CSV/base64·계좌번호·은행코드·예금주 0건, 암호화 artifact 유지 |
| PEO-FIX-069-B | PEO-069 | 권위 급여 결과 기반 신고와 보정 버전 | 공개 records override 금지, 구성원별 대사, 원 신고 불변·새 package hash/참조의 보정 job 생성 |
| PEO-FIX-070-A | PEO-070 | 명세서 제공자 상태 수신·재시도 이력 | signed callback, sent → delivered → read, 중복·역행 거부, 시도 횟수 표시 |
| PEO-FIX-UI-A | PEO-020/023/027/039~070 | 모바일 값·시간표·프로필·표 작업 가시성 및 한국어 문구 | 실제 뷰포트 assertion, ko-KR/KST 캡처, 잘린 핵심 값·내부 ID·번역투 없음 |
| PEO-FIX-UI-B | PEO-039/042/057/059/064/070 | 활성 People 응답·화면의 사람 이름과 내부 식별자 분리 | `*_display_name`·`*_label`과 visible/AT text는 권위 있는 이름만 사용한다. 구조화·opaque ID는 동일·포함·대소문자 변형을 모두 닫고 원시 ID는 전용 식별자 필드에만 유지한다. 다만 `kim`·`park`·`lee`처럼 실제 이름 토큰과 구분할 수 없는 순수 영문 단어형 legacy ID는 대소문자 무시 정확히 동일한 경우만 닫고, 비동일 성명 토큰 충돌에서는 권위 `display_name`을 우선한다. 계정 후보 이름의 UUID·32자리 hex·이메일·opaque 값과 제목 없는 인사 문서의 `document_id`도 공개 라벨로 승격하지 않고 자연스러운 확인 필요 문구를 사용한다. |
| PEO-FIX-EVIDENCE-A | PEO-001/060/완료 영수증 | 코드에서 자동 추출한 양방향 capability ledger와 재현 로그 | 누락 route/API/DB/provider 감지, HEAD·명령·로그 hash·화면 SHA 일치 |

## 최종 검증 순서

1. 각 추가 단위의 집중 도메인·API·브라우저 테스트를 실행한다.
2. Matter 이관은 dry-run → apply → 저장소 재시작 → readback → replay 순으로 실행한다.
3. Outlook은 실제 Graph 스키마 fixture와 운영 포트 미주입 fail-closed를 모두 검증한다.
4. 운영 급여 런타임에서 합성 지급·신고·명세서 제공자와 휘발성 artifact secret이 모두 거부되는지 확인한다.
5. 전체 package/API/Web 회귀, 권한·보안·UI·release/no-premature-claim 게이트와 production build를 실행한다.
6. 데스크톱과 390px 화면에서 내부 스크롤 대상 블록을 각각 뷰포트 안으로 옮겨 캡처하고 육안 검토한다.
7. `sloplint --changed`와 수동 한국어·상태 모순 검토를 마친다.
8. 현재 HEAD·원시 로그 hash·화면 hash로 완료 영수증을 새로 생성한다.

## 완료 경계

다음은 소스 구현과 별개인 외부 게이트다. 이 값이 없으면 `production_ready`나 실제 연동 완료로 주장하지 않는다.

- Microsoft 365 tenant consent와 운영 token vault/calendar adapter
- 채용 자료 출처, 후보자 동의 증거, Vault 문서와 보상 패키지의 운영 권위
- 실제 은행 지급 제공자
- 실제 세무·4대보험 신고 제공자
- 실제 급여명세서 전달 제공자
- 법률 검토자의 실제 승인 기록
- 동일 소스 SHA의 패키징·배포·로그인 상태 화면 검증
