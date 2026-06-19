# matter Drafting, Clause Intelligence, Legal Document QC 명세

문서 버전: v0.1  
작성일: 2026-06-11

## 1. 기본 원칙

문서작성은 생성형 AI 단독이 아니라 template, deal terms, clause library, precedent, issue ledger, legal QC의 조합으로 수행한다. AI는 초안·수정안·설명·검토후보를 생성하되 최종본 확정은 변호사가 한다.

## 2. Drafting Workspace

| 단계 | 설명 |
|---|---|
| 1 | 문서유형 선택: SPA, SHA, SSA, BTA, Memo, Opinion, Pleading 등 |
| 2 | 자문포지션 선택: 매도인, 매수인, 투자자, 대상회사, 원고, 피고 등 |
| 3 | template 선택 |
| 4 | deal terms 또는 case terms 입력 |
| 5 | clause option 선택 |
| 6 | precedent search |
| 7 | draft assembly |
| 8 | defined term, cross-reference, schedule, date, amount QC |
| 9 | drafting note 생성 |
| 10 | internal review |
| 11 | client/counterparty/court send approval |

## 3. Clause Library

| 필드 | 설명 |
|---|---|
| clause_id | 조항 ID |
| clause_type | 손해배상, CP, R&W, drag/tag, ROFR, confidentiality 등 |
| position | 매도인 우호, 매수인 우호, 투자자 우호, 회사 우호, 중립 |
| use_case | 적용 상황 |
| market_strength | strong, medium, weak |
| fallback_clause | 협상 양보안 |
| risk_note | 사용시 주의사항 |
| source_matter | 출처 matter |
| approval_status | draft, reviewed, firm-approved, deprecated |
| last_reviewed | 최종 검토일 |

## 4. Legal Document QC

| QC 영역 | 검증내용 |
|---|---|
| 당사자 | 법인명, 약칭, 주소, 대표자, 서명란 일관성 |
| 날짜 | 체결일, 효력발생일, 종결일, 제출기한, notice period 불일치 |
| 금액 | 숫자/한글 병기, 합계, 비율, 통화 |
| 정의어 | 미정의 용어, 미사용 정의어, 정의어 대소문자/한영 불일치 |
| 조문 참조 | cross-reference, 삭제된 조항 참조, 번호 오류 |
| 별지/부속서 | 존재 여부, 제목, 본문 참조 일치 |
| 법령 | 법령명, 조문번호, 시행 여부 확인 필요 flag |
| 판례 | 사건번호, 선고일, 법원명 형식 |
| 입장 | 매도인/매수인, 원고/피고 관점 혼동 |
| privilege/confidentiality | 외부송부 전 표시 및 공유 가능 여부 |
| HR 문서 | 이름, 입사일, 직책, 근무지, 연봉 변수, 서명상태, 동의항목 |

## 5. AI 사용범위

| 기능 | 허용 | 제한 |
|---|---|---|
| 초안조립 | template 기반 허용 | 임의 조항 생성은 review 필요 |
| 조항 수정안 | 후보 생성 허용 | 변호사 승인 전 반영 금지 |
| deviation 설명 | 허용 | source 표시 필요 |
| 문서 요약 | 허용 | 고객송부 전 검토 필요 |
| HR 문서 | 변수삽입·요약 허용 | 근로계약 중요조항 임의 변경 금지 |
| 법률결론 | 초안 가능 | 최종 결론 자동확정 금지 |

## 6. Verification Gate

1. Draft는 template source와 deal terms를 가져야 한다.
2. AI-generated clause는 review status를 가져야 한다.
3. client/counterparty/court send 전 QC report가 생성되어야 한다.
4. critical QC error가 있으면 send approval 불가.
5. deprecated clause는 경고 없이 사용될 수 없다.
6. execution copy는 controlled document로 보존된다.
