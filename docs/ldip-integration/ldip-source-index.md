# LDIP Source Index

작성일: 2026-06-07

상태: planning-only. 이 문서는 LDIP 원문을 Law Firm OS closeout planning에 흡수하기 위한 source index이며, 구현, 계약 변경, weighted ledger 변경, validator 변경, production_ready 선언을 승인하지 않는다.

## Source

- 원문: `/Users/jws/.codex/attachments/a9f85364-9785-449b-b925-df1d2c93eee1/pasted-text.txt`
- 제목: `Legal Data Intelligence Platform 통합 적용계획 및 사양명세서 v0.1`
- 작성 기준일: 2026-06-06
- 확인한 라인 수: 1,342
- 확인한 SHA256: `82b396474b43afd278042e8eb1b8a18a2b0fd2c2ee640e23022622ef2d70be9c`
- 통합 방향: LDIP는 Law Firm OS 외부 제품이 아니라 Law Firm OS 내부 legal data intelligence capability다.

## Section Index

| Source section | Lines | Coverage family | Primary Law Firm OS anchors |
| --- | ---: | --- | --- |
| 1. 설계 결론 | 7-20 | LDIP-GOAL, LDIP-ARCH | RP00, RP26, RP29 |
| 2. 통합 적용의 기본 방향 | 21-66 | LDIP-GOAL, LDIP-ARCH, LDIP-RISK | RP00, RP26, RP29 |
| 2.1. 명칭 | 23-36 | LDIP-GOAL | RP00 |
| 2.2. 설계 목표 | 37-52 | LDIP-GOAL, LDIP-PRIO | RP00, RP06, RP07, RP17, RP20, RP26 |
| 2.3. 반드시 피해야 할 설계 | 53-66 | LDIP-RISK, LDIP-COMP | RP00, RP16, RP17, RP26 |
| 3. 두 회사 설계의 통합 번역 | 67-99 | LDIP-ARCH | RP00, RP26, RP27 |
| 3.1. 참조 설계 매핑표 | 69-84 | LDIP-ARCH | RP26, RP27 |
| 3.2. LDIP의 핵심 구조 | 85-99 | LDIP-ARCH, LDIP-SRC | RP00, RP01, RP02, RP03, RP06, RP07, RP08, RP17, RP20, RP22, RP23, RP26 |
| 4. 통합 적용계획 | 100-214 | LDIP-PRIO | RP00 plus affected RPs |
| 4.1. 전체 추진 원칙 | 102-120 | LDIP-PRIO, LDIP-RISK | RP00, RP06, RP07, RP17, RP20 |
| 4.2. 단계별 적용계획 | 121-214 | LDIP-PRIO, LDIP-ARCH | RP00, RP01, RP02, RP06, RP07, RP17, RP20, RP26 |
| 5. 상세 사양명세서 | 215-250 | LDIP-GOAL, LDIP-COMP | RP00, RP16, RP29 |
| 5.1. 시스템 범위 | 217-250 | LDIP-GOAL | RP00, RP29 |
| 5.1.1. 포함 범위 | 219-237 | LDIP-GOAL, LDIP-PRIO, LDIP-SRC | RP01-RP29 affected |
| 5.1.2. 제외 범위 | 238-250 | LDIP-RISK, LDIP-COMP | RP00, RP16, RP17, RP20 |
| 6. 데이터 모델 사양 | 251-428 | LDIP-CAT, LDIP-DOC | RP01, RP04, RP05, RP06 |
| 6.1. 핵심 엔터티 | 253-284 | LDIP-CAT | RP01, RP04, RP05, RP06, RP16, RP17, RP20 |
| 6.2. 주요 테이블 상세 | 285-428 | LDIP-CAT, LDIP-DOC, LDIP-AGT | RP01, RP04, RP05, RP06, RP17 |
| 7. 보안·권한 사양 | 429-498 | LDIP-SEC, LDIP-COMP | RP02, RP03, RP16, RP17, RP20 |
| 7.1. 권한 원칙 | 431-443 | LDIP-SEC | RP02, RP03, RP17 |
| 7.2. Role-Based Access Control | 444-458 | LDIP-SEC | RP02, RP21 |
| 7.3. Attribute-Based Access Control | 459-476 | LDIP-SEC | RP02, RP16 |
| 7.4. 보안 라벨 사전 | 477-498 | LDIP-SEC, LDIP-COMP | RP02, RP16, RP24 |
| 8. 문서 수집·정제 파이프라인 사양 | 499-564 | LDIP-ING, LDIP-DOC | RP06, RP07, RP08, RP25 |
| 8.1. 처리 단계 | 501-518 | LDIP-ING | RP06, RP07, RP25 |
| 8.2. 문서유형 분류표 | 519-536 | LDIP-DOC, LDIP-ING | RP06, RP07 |
| 8.3. 문서 버전 규칙 | 537-549 | LDIP-DOC | RP06 |
| 8.4. 파이프라인 실패 처리 | 550-564 | LDIP-ING, LDIP-COMP | RP06, RP07, RP16, RP25 |
| 9. Legal Search / Legal Analyst 사양 | 565-604 | LDIP-SRCH | RP07, RP15, RP17 |
| 9.1. 검색 유형 | 567-578 | LDIP-SRCH | RP07 |
| 9.2. 자연어 질의 예시 | 579-589 | LDIP-SRCH, LDIP-OUT | RP07, RP15, RP18 |
| 9.3. Legal Analyst 기능 | 590-604 | LDIP-SRCH, LDIP-DQ | RP07, RP15, RP17 |
| 10. Legal Agent Runtime 사양 | 605-731 | LDIP-AGT, LDIP-TOOL | RP17, RP18, RP27, RP28 |
| 10.1. Agent 기본 원칙 | 607-620 | LDIP-AGT, LDIP-SEC | RP17, RP18 |
| 10.2. Agent 목록 | 621-731 | LDIP-AGT | RP17, RP18 |
| 11. Tool Registry 사양 | 732-779 | LDIP-TOOL | RP17, RP18, RP27 |
| 11.1. Tool 분류 | 734-745 | LDIP-TOOL, LDIP-SEC | RP17, RP18, RP27 |
| 11.2. Tool Call 로그 | 746-766 | LDIP-TOOL | RP03, RP17, RP18 |
| 11.3. 승인 워크플로우 | 767-779 | LDIP-TOOL, LDIP-SEC | RP02, RP17, RP18, RP20 |
| 12. Legal Clean Room / Deal Room 사양 | 780-835 | LDIP-CLEAN | RP20, RP16, RP26 |
| 12.1. 목적 | 782-785 | LDIP-CLEAN | RP20 |
| 12.2. Clean Room 유형 | 786-796 | LDIP-CLEAN | RP20 |
| 12.3. 공유 객체 | 797-808 | LDIP-CLEAN, LDIP-OUT | RP20, RP06 |
| 12.4. 외부공유 정책 | 809-821 | LDIP-CLEAN, LDIP-SEC | RP20, RP16 |
| 12.5. Query Template | 822-835 | LDIP-CLEAN, LDIP-SRCH | RP20, RP07 |
| 13. UI/UX 사양 | 836-901 | LDIP-UI | RP21, RP06, RP07, RP18, RP20 |
| 13.1. Matter Dashboard | 838-852 | LDIP-UI | RP05, RP21 |
| 13.2. Document Viewer | 853-865 | LDIP-UI, LDIP-DOC | RP06, RP21 |
| 13.3. Contract Review Workspace | 866-876 | LDIP-UI, LDIP-AGT | RP18, RP21 |
| 13.4. DD App | 877-887 | LDIP-UI, LDIP-AGT | RP18, RP20, RP21 |
| 13.5. Agent Control Center | 888-901 | LDIP-UI, LDIP-DQ | RP17, RP18, RP21 |
| 14. 비기능 요구사항 | 902-965 | LDIP-NFR, LDIP-DQ | RP16, RP26, RP29 |
| 14.1. 보안 | 904-916 | LDIP-NFR, LDIP-SEC | RP02, RP16, RP26 |
| 14.2. 성능 | 917-928 | LDIP-NFR | RP26 |
| 14.3. 가용성·복구 | 929-938 | LDIP-NFR | RP26 |
| 14.4. 데이터 품질 | 939-951 | LDIP-DQ | RP15, RP26 |
| 14.5. AI 품질 | 952-965 | LDIP-DQ, LDIP-AGT | RP17, RP18, RP26 |
| 15. 법률·컴플라이언스 고려사항 | 966-991 | LDIP-COMP | RP16, RP24, RP26 |
| 16. 기술 아키텍처 사양 | 992-1056 | LDIP-ARCH, LDIP-SRC | RP22, RP23, RP26, RP27 |
| 16.1. Logical Architecture | 994-1009 | LDIP-ARCH, LDIP-SRC | RP01, RP06, RP07, RP17, RP22, RP23, RP26, RP27 |
| 16.2. 벤더별 구현 매핑 | 1010-1056 | LDIP-ARCH | RP26, RP27 |
| 17. API 및 이벤트 사양 | 1057-1109 | LDIP-API | RP22, RP23, RP27 |
| 18. Agent 산출물 형식 | 1110-1139 | LDIP-OUT | RP18, RP06, RP20 |
| 19. 품질관리 및 평가 기준 | 1140-1172 | LDIP-DQ | RP15, RP17, RP26 |
| 20. 테스트 시나리오 | 1173-1222 | LDIP-TEST | RP00 plus affected RPs |
| 21. 우선순위별 구축 범위 | 1223-1270 | LDIP-PRIO | RP00 plus affected RPs |
| 22. 위험요소 및 대응방안 | 1271-1286 | LDIP-RISK | RP00, RP02, RP16, RP17, RP20, RP26 |
| 23. 최종 권고안 | 1287-1342 | LDIP-GOAL, LDIP-PRIO | RP00, RP01, RP02, RP06, RP07, RP17, RP18, RP20, RP26 |

## Coverage Rule

Every source section above must be classified exactly once as one of:

- `implemented_by_existing_plan`
- `covered_by_existing_plan_but_requires_ldip_trace`
- `adapt_required_before_implementation`
- `new_required`
- `defer_with_revisit_gate`
- `reject_with_reason`

No source section, named entity, table field family, agent, tool tier, clean room object, UI surface, NFR, API, event, test, priority item, or risk item may be silently omitted.
