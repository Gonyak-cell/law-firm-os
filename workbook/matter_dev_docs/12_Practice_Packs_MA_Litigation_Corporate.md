# matter Practice Packs 명세: M&A, Litigation, Corporate Advisory

문서 버전: v0.1  
작성일: 2026-06-11

## 1. Practice Pack 원칙

Practice Pack은 matter core 위에 얹히는 업무유형별 템플릿이다. Core Object를 새로 만들기보다 Matter, Document, Email, Issue, Task, Deadline, Authority, Work Product를 조합하고, 필요한 보조 객체를 추가한다.

## 2. M&A Pack

| Module | 기능 |
|---|---|
| Deal Overview | 거래구조, 당사자, 자문포지션, 거래대금, signing/closing target |
| Process Timeline | NDA, IOI, LOI, DD, SPA, Signing, Closing, Post-closing |
| RFI Tracker | 요청자료, 제출현황, 보완요청, reviewer, status |
| DD Findings | red flag, risk, source document, follow-up, issue link |
| Issue Ledger | 가격, CP, 진술보장, 손해배상, 확약, IPR, CoC |
| CP Checklist | 선행조건 충족 여부 |
| Closing Checklist | 종결서류, 의사록, 위임장, 인감증명서, signature page |
| Disclosure Schedule Tracker | disclosure schedule item, source, related R&W |
| Third-party Consent Tracker | CoC, assignment, license consent |
| Post-closing Obligation | 확약사항, indemnity period, earn-out, non-compete |
| Closing Bible Generator | 최종본 index, execution copy, deliverables 정리 |
| HR Data Room Assistant | 임직원 명부, 계약현황, 휴가부채, 노동분쟁 자료정리 |

## 3. Litigation Pack

| Module | 기능 |
|---|---|
| Case Overview | 법원, 사건번호, 당사자, 청구취지, 절차단계 |
| Procedural Timeline | 소제기, 답변서, 변론기일, 증거신청, 선고 |
| Fact Ledger | 일자별 사실, source, disputed 여부, pleading link |
| Evidence Ledger | 증거번호, 파일, 입증취지, 원본 위치 |
| Issue Ledger | 법률쟁점, 상대방 주장, 반박논리 |
| Authority Ledger | 법령, 판례, 문헌, last checked |
| Argument Map | 주장 → 사실 → 증거 → 법리 → 서면 문단 |
| Pleading Tracker | 소장, 답변서, 준비서면, 증거목록, 제출상태 |
| Hearing Prep | 예상질문, 증인신문, 주요 반박 |
| Judgment Tracker | 판결요지, 항소 여부, 집행 가능성 |

## 4. Corporate Advisory Pack

| Module | 기능 |
|---|---|
| Board/Shareholder Checklist | 소집, 결의요건, 의사록, 이해관계 |
| Self-dealing Checklist | 상법 제398조 등 승인요건 검토 |
| Non-compete/Concurrent Office | 겸직·경업 승인 필요성 |
| Share/Investment | 신주, 구주, 등기, 투자계약, 정관 |
| Officer Compensation | 임원보수, 퇴직금, 주총결의 |
| Privacy Compliance | 동의, 위탁, 제3자 제공, 유출대응 |
| Fair Trade | 표시광고, 하도급, 가맹, 기업결합 |
| Employment/HR Advisory | 근로계약, 파견, 도급, 취업규칙, 징계 |
| Fund/Investment Vehicle | 규약, 출자, 등록, 운용제한 |
| Opinion Builder | checklist → authority → opinion draft |

## 5. Issue Ledger 공통 필드

| 필드 | 설명 |
|---|---|
| Issue ID | 불변 ID |
| Matter ID | 연결 matter |
| Category | 쟁점 유형 |
| Title | 쟁점명 |
| Client Position | 의뢰인 입장 |
| Counterparty Position | 상대방 입장 |
| Legal Analysis | 법률검토 |
| Commercial Analysis | 거래상 판단 |
| Risk Level | High/Medium/Low |
| Status | Identified, Under Review, Need Client Input, Negotiating, Resolved 등 |
| Source Documents | 근거 문서 |
| Source Emails | 근거 이메일 |
| Authorities | 법령·판례·문헌 |
| Proposed Language | 제안 문구 |
| Final Resolution | 최종 결론 |
| Reuse Potential | 지식화 가능성 |

## 6. Practice Pack Verification

1. Pack은 core object와 relation을 사용해야 한다.
2. issue, document, email, authority 간 source traceability가 있어야 한다.
3. 각 checklist item은 status, owner, due date를 가진다.
4. client/counterparty-facing output은 approval gate를 통과해야 한다.
5. 종결 시 Matter Closing Knowledge Pack 후보가 생성되어야 한다.
