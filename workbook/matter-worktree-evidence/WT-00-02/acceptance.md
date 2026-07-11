# WT-00-02 수용 결과

상태: 구현·테스트 완료 / 커밋 대기

## 수용 기준

- `LIT/Litigation/송무` → `litigation`
- `ADV/Advisory/Corporate Advisory/기업 자문` → `corporate-advisory`
- `Dispute/분쟁` → `dispute`
- `DEAL/Transaction/트랜잭션` → `transaction`
- 대소문자와 공백·underscore·hyphen 차이는 동일 별칭으로 정규화
- 빈 값과 알 수 없는 값은 저장되지 않는 `unclassified` 결과
- 기존 업무 보드의 source field 우선순위 보존

## 결과

- 4개 canonical id·code·label 계약이 고정됐다.
- fixture의 12개 별칭 사례가 모두 기대 분야로 분류됐다.
- 5개 미분류 사례가 모두 `unclassified`로 처리됐다.
- 정규화된 별칭 충돌은 0건이다.
- 관련 테스트는 red 0/5에서 green 5/5로 전환됐다.
- Matter 패키지 전체 테스트는 127/127 통과했다.

## 비고

공용 분류 함수 구현과 기존 업무 보드 교체는 `WT-01-01` 범위다. 이 TUW는 계약과 fixture만 고정한다.

커밋은 `.git/index.lock` 생성 권한이 거부된 현재 샌드박스에서 대기 중이며 `files.txt`의 경로만 독립 커밋 후보로 유지한다.
