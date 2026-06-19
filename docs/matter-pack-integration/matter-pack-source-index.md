# Matter-Pack Source Index (A-2)

Status: planning-only (§0 of `matter-pack-full-integration-plan.md` 적용)
Freeze mode: **commit_freeze** (MAT-DEC-05 결정 2026-06-11 — 25파일을 본 트랙 커밋 1에 포함)
Frozen at: 2026-06-11, live baseline CP00-326 / RP10.P04.M04.S18
검산: 25 files, 2,415 lines total. `matter_개발문서_통합본.md`(146K)·`matter_development_documentation_pack.zip`·`matter_document_index.md`·`matter_master_specification_combined.md`는 동일 내용 중복으로 **소스에서 제외**(명시).

## §1 소스 동결표 (SHA256 — 2026-06-11 실측)

| file | lines | family | type | SHA256 |
|---|---|---|---|---|
| 00_문서목록_및_사용가이드.md | 68 | GOV | governance | `037d5de4c4e8f3fc19aaf63bc970d7186861b749ad943e2d859ba39f51ca4752` |
| 01_제품_사양명세서_PRD_SRS.md | 107 | GOV+전 family 색인 | requirement | `ba68b2c3722068902e5d048c31dc6a489d3e1240f7cf10e66ecffb8569df869b` |
| 02_제품헌장_및_개발운영체계.md | 105 | GOV | governance | `2c4f05d2abbfd51d2c7c4f081eb0bd4eaffe6bd8c247e5d02387cfa70848132b` |
| 03_제품피라미드_PBS_DBS_WBS.md | 89 | GOV | governance | `ca25b052cb1de12295990d842a285b147c0c15bc2359a246c766fb7151feff6e` |
| 04_시스템_아키텍처_구조도.md | 100 | CORE/AIGW/INTEG | requirement | `89b35591bdbcf2cd50b106f185a593ac359f6014f2baa2a6a0c56c56f94bc63a` |
| 05_도메인_객체_데이터모델.md | 128 | CORE | requirement | `edf6e0a42b7f1a2b0da8fe0c406e66218d87be3102682470f72abddb87705b5f` |
| 06_권한_보안_감사_거버넌스.md | 111 | PERM | requirement | `3a2888b9e9abc80af6e45b49465d1cfa07753ed0e0710c88378a50c06ca8052e` |
| 07_AI_자동화_모델라우팅_검증정책.md | 107 | AIGW | requirement | `4cdf014eacad70ab8243cfc5957260bee82cdef3bcffa5182fcbc9bec9575797` |
| 08_Microsoft_365_Outlook_Addin_Spec.md | 127 | M365 (부속 모듈 위임) | requirement | `05a03499ad30fd47abb508482a04611cbecad8d8d62d9caffb9496feebb7e218` |
| 09_Obsidian_Matter_Vault_Spec.md | 112 | VAULT | requirement | `cd27685f7bc073babce02e672b499b04dbb5e6c660b52aca916ac895c3141a65` |
| 10_Portal_Platform_Spec.md | 75 | PORTAL | requirement | `74d8d733bceaa59646fe82e5f735fd3613b7d3316d6c5648a007d4f52b59f4bc` |
| 11_People_HR_Operations_Spec.md | 125 | HR (HRX 트랙 시드) | requirement | `141f91a823ba5ffd75580623a9148b69a53c923313f8182b6507967efc48cf36` |
| 12_Practice_Packs_MA_Litigation_Corporate.md | 84 | ISSUE | requirement | `f95c836863627d9c618e75b3ed353ae589b79de7f69e78262e75ca50832e113a` |
| 13_Drafting_Clause_QC_Spec.md | 75 | DRAFT | requirement | `8f451c6e6d3611afeb9e2550e6c202d4a17ce65157c2eb6c151b8d768cf73320` |
| 14_Billing_ERP_Analytics_Spec.md | 61 | BILL | requirement | `8455b0005469b227606a532494c879cbaf00a8e189609238a32af9371dbd6eae` |
| 15_릴리스_로드맵_DBS.md | 112 | GOV | governance | `249d73d83e4d6e82dbd274a3724308e757da27f14dcad4f84e382ff88e3cd129` |
| 16_Execution_Dependency_Graph.md | 70 | GOV | governance | `e1a1336b5918f01f6e67ccd0439f7e8c1392bbc944bed0fa0a619cd8a02d5241` |
| 17_TUW_표준_및_ID_체계.md | 90 | GOV | governance | `8fdf4c438f52f80af78531f158c5caed97e2944e082ae6f57847aac52a501fee` |
| 18_TUW_초기_백로그.md | 217 | GOV (요구 시드) | governance | `d76f19d1aea19eb0dc3fe2efe9dcc8440ee23e3fb3c8c74fbc7089692182059b` |
| 19_Verification_Case_Catalog.md | 58 | GOV (런타임 게이트 잔여) | governance | `4f35961a6c534a4a5f77a6d9f1c5ad06f80f4d8fc426a8c49370221181de0bb8` |
| 20_Agent_Work_Contracts.md | 100 | GOV | governance | `6e1103465990dd2894fc9f92baeb9ce753ed428a3fd1a7d3dd3a6c8a65eabf88` |
| 21_UI_화면_사용자흐름.md | 95 | UI | requirement | `afac734385c84521abc30471448f733ed00bcc100a66626c090b6d2cc24d5f74` |
| 22_API_이벤트_통합_명세.md | 83 | API/INTEG | requirement | `397de39053701ee787e721326abab29835620b7f6251806387068ade8d418404` |
| 23_Risk_Register_Open_Questions.md | 52 | 횡단 (UPR/UPQ 시드) | requirement | `812b12086ae481c9ea0810ffb8bb7906be0af9a5b36543470608acb61224e23a` |
| 24_개발팀_착수_지시서.md | 64 | GOV | governance | `51b9bb346314fad9827bd6122500f823b9faf8f26394f8a1849123a5cc6427e7` |

재검증 규칙: 커밋 1 직전 `cd workbook/matter_dev_docs && shasum -a 256 [0-9]*.md` 재실행으로 본 표 전건을 기계 대조한다 (1건이라도 불일치 시 인덱스 무효 — 재동결 후 재기록).

## §2 Coverage Rule

모든 소스 섹션은 정확히 1회, {implemented_by_existing_plan / covered_but_requires_trace / adapt_required / adapt_required_pending_user_decision / new_required / defer_with_revisit_gate / reject_with_reason} 중 하나로 분류한다. 명명 객체 silent omission 금지. governance family의 'covered'는 구현이 아니라 **등가성 입증**(gap-adjudication §3 매핑표 부착 필수). 섹션(¶) 단위 분류표는 Phase 1 완료분으로 본 문서에 추가하며, C-MPACK-01 리뷰 전 완성한다.

## §2.1 섹션 분류표 (ABS-TRK-01 완료 — 2026-06-11 실측)

실측 heading 합계: 201. 아래 표는 25개 소스 문서의 ^#{1,3} heading을 정확히 1회씩 분류한다. 문서 08은 모든 행을 M365 부속 모듈 위임으로 표기한다.

| doc | 섹션 앵커 | family | type | classification | 비고 |
| --- | --- | --- | --- | --- | --- |
| 00_문서목록_및_사용가이드.md | #1 matter | GOV | governance | covered_but_requires_trace | 현행 RP/CP/validator/리뷰 체계와 등가성 입증 대상으로 분류 |
| 00_문서목록_및_사용가이드.md | #2 1 | GOV | governance | covered_but_requires_trace | 현행 RP/CP/validator/리뷰 체계와 등가성 입증 대상으로 분류 |
| 00_문서목록_및_사용가이드.md | #3 2 | GOV | governance | covered_but_requires_trace | 현행 RP/CP/validator/리뷰 체계와 등가성 입증 대상으로 분류 |
| 00_문서목록_및_사용가이드.md | #4 3 | GOV | governance | covered_but_requires_trace | 현행 RP/CP/validator/리뷰 체계와 등가성 입증 대상으로 분류 |
| 00_문서목록_및_사용가이드.md | #5 4 | GOV | governance | covered_but_requires_trace | 현행 RP/CP/validator/리뷰 체계와 등가성 입증 대상으로 분류 |
| 01_제품_사양명세서_PRD_SRS.md | #1 matter-prd-srs | GOV | governance | adapt_required_pending_user_decision | MAT-DEC-01/04/07 축과 연결 |
| 01_제품_사양명세서_PRD_SRS.md | #2 1 | GOV | governance | adapt_required_pending_user_decision | MAT-DEC-01/04/07 축과 연결 |
| 01_제품_사양명세서_PRD_SRS.md | #3 2 | GOV | governance | adapt_required_pending_user_decision | MAT-DEC-01/04/07 축과 연결 |
| 01_제품_사양명세서_PRD_SRS.md | #4 3 | GOV | governance | adapt_required_pending_user_decision | MAT-DEC-01/04/07 축과 연결 |
| 01_제품_사양명세서_PRD_SRS.md | #5 4 | GOV | governance | adapt_required_pending_user_decision | MAT-DEC-01/04/07 축과 연결 |
| 01_제품_사양명세서_PRD_SRS.md | #6 5 | GOV | governance | adapt_required_pending_user_decision | MAT-DEC-01/04/07 축과 연결 |
| 01_제품_사양명세서_PRD_SRS.md | #7 6 | GOV | governance | adapt_required_pending_user_decision | MAT-DEC-01/04/07 축과 연결 |
| 01_제품_사양명세서_PRD_SRS.md | #8 7 | GOV | governance | adapt_required_pending_user_decision | MAT-DEC-01/04/07 축과 연결 |
| 01_제품_사양명세서_PRD_SRS.md | #9 8 | GOV | governance | adapt_required_pending_user_decision | MAT-DEC-01/04/07 축과 연결 |
| 02_제품헌장_및_개발운영체계.md | #1 matter | GOV | governance | covered_but_requires_trace | 현행 RP/CP/validator/리뷰 체계와 등가성 입증 대상으로 분류 |
| 02_제품헌장_및_개발운영체계.md | #2 1 | GOV | governance | covered_but_requires_trace | 현행 RP/CP/validator/리뷰 체계와 등가성 입증 대상으로 분류 |
| 02_제품헌장_및_개발운영체계.md | #3 2-product-constitution | GOV | governance | covered_but_requires_trace | 현행 RP/CP/validator/리뷰 체계와 등가성 입증 대상으로 분류 |
| 02_제품헌장_및_개발운영체계.md | #4 3-data-constitution | GOV | governance | covered_but_requires_trace | 현행 RP/CP/validator/리뷰 체계와 등가성 입증 대상으로 분류 |
| 02_제품헌장_및_개발운영체계.md | #5 4-security-constitution | GOV | governance | covered_but_requires_trace | 현행 RP/CP/validator/리뷰 체계와 등가성 입증 대상으로 분류 |
| 02_제품헌장_및_개발운영체계.md | #6 5-ai-constitution | GOV | governance | covered_but_requires_trace | 현행 RP/CP/validator/리뷰 체계와 등가성 입증 대상으로 분류 |
| 02_제품헌장_및_개발운영체계.md | #7 6-agent-constitution | GOV | governance | covered_but_requires_trace | 현행 RP/CP/validator/리뷰 체계와 등가성 입증 대상으로 분류 |
| 02_제품헌장_및_개발운영체계.md | #8 7-verification-constitution | GOV | governance | covered_but_requires_trace | 현행 RP/CP/validator/리뷰 체계와 등가성 입증 대상으로 분류 |
| 02_제품헌장_및_개발운영체계.md | #9 8-ledger-constitution | GOV | governance | covered_but_requires_trace | 현행 RP/CP/validator/리뷰 체계와 등가성 입증 대상으로 분류 |
| 02_제품헌장_및_개발운영체계.md | #10 9-loop | GOV | governance | covered_but_requires_trace | 현행 RP/CP/validator/리뷰 체계와 등가성 입증 대상으로 분류 |
| 03_제품피라미드_PBS_DBS_WBS.md | #1 matter-pbs-dbs-wbs | GOV | governance | covered_but_requires_trace | 현행 RP/CP/validator/리뷰 체계와 등가성 입증 대상으로 분류 |
| 03_제품피라미드_PBS_DBS_WBS.md | #2 1-l0-l13 | GOV | governance | covered_but_requires_trace | 현행 RP/CP/validator/리뷰 체계와 등가성 입증 대상으로 분류 |
| 03_제품피라미드_PBS_DBS_WBS.md | #3 2-product-breakdown-structure | GOV | governance | covered_but_requires_trace | 현행 RP/CP/validator/리뷰 체계와 등가성 입증 대상으로 분류 |
| 03_제품피라미드_PBS_DBS_WBS.md | #4 3-delivery-breakdown-structure | GOV | governance | covered_but_requires_trace | 현행 RP/CP/validator/리뷰 체계와 등가성 입증 대상으로 분류 |
| 03_제품피라미드_PBS_DBS_WBS.md | #5 4-work-breakdown-structure | GOV | governance | covered_but_requires_trace | 현행 RP/CP/validator/리뷰 체계와 등가성 입증 대상으로 분류 |
| 03_제품피라미드_PBS_DBS_WBS.md | #6 5-pillar-domain | GOV | governance | covered_but_requires_trace | 현행 RP/CP/validator/리뷰 체계와 등가성 입증 대상으로 분류 |
| 04_시스템_아키텍처_구조도.md | #1 matter | CORE | requirement | adapt_required_pending_user_decision | MAT-DEC-01/04/07 축과 연결 |
| 04_시스템_아키텍처_구조도.md | #2 1 | CORE | requirement | adapt_required_pending_user_decision | MAT-DEC-01/04/07 축과 연결 |
| 04_시스템_아키텍처_구조도.md | #3 2 | CORE | requirement | adapt_required_pending_user_decision | MAT-DEC-01/04/07 축과 연결 |
| 04_시스템_아키텍처_구조도.md | #4 3 | CORE | requirement | adapt_required_pending_user_decision | MAT-DEC-01/04/07 축과 연결 |
| 04_시스템_아키텍처_구조도.md | #5 4 | CORE | requirement | adapt_required_pending_user_decision | MAT-DEC-01/04/07 축과 연결 |
| 04_시스템_아키텍처_구조도.md | #6 5-ai | CORE | requirement | adapt_required_pending_user_decision | MAT-DEC-01/04/07 축과 연결 |
| 04_시스템_아키텍처_구조도.md | #7 6-microsoft-365 | CORE | requirement | adapt_required_pending_user_decision | MAT-DEC-01/04/07 축과 연결 |
| 04_시스템_아키텍처_구조도.md | #8 7 | CORE | requirement | adapt_required_pending_user_decision | MAT-DEC-01/04/07 축과 연결 |
| 04_시스템_아키텍처_구조도.md | #9 8 | CORE | requirement | adapt_required_pending_user_decision | MAT-DEC-01/04/07 축과 연결 |
| 05_도메인_객체_데이터모델.md | #1 matter | CORE | requirement | covered_but_requires_trace | 기존 계획 trace 또는 future overlay anchor 필요 |
| 05_도메인_객체_데이터모델.md | #2 1-core-object-model | CORE | requirement | covered_but_requires_trace | 기존 계획 trace 또는 future overlay anchor 필요 |
| 05_도메인_객체_데이터모델.md | #3 2-relationship-model | CORE | requirement | covered_but_requires_trace | 기존 계획 trace 또는 future overlay anchor 필요 |
| 05_도메인_객체_데이터모델.md | #4 3-state-model | CORE | requirement | adapt_required | Matter 상태 enum 및 Document 원본 저장소 축은 adjudication에서 판정 |
| 05_도메인_객체_데이터모델.md | #5 4-data-lifecycle | CORE | requirement | adapt_required | Matter 상태 enum 및 Document 원본 저장소 축은 adjudication에서 판정 |
| 05_도메인_객체_데이터모델.md | #6 5-id | CORE | requirement | covered_but_requires_trace | 기존 계획 trace 또는 future overlay anchor 필요 |
| 05_도메인_객체_데이터모델.md | #7 6 | CORE | requirement | adapt_required | Matter 상태 enum 및 Document 원본 저장소 축은 adjudication에서 판정 |
| 06_권한_보안_감사_거버넌스.md | #1 matter | PERM | requirement | covered_but_requires_trace | authz/audit trace 필요, 4면 차단 및 emergency override는 후보로 환류 |
| 06_권한_보안_감사_거버넌스.md | #2 1 | PERM | requirement | covered_but_requires_trace | authz/audit trace 필요, 4면 차단 및 emergency override는 후보로 환류 |
| 06_권한_보안_감사_거버넌스.md | #3 2 | PERM | requirement | covered_but_requires_trace | authz/audit trace 필요, 4면 차단 및 emergency override는 후보로 환류 |
| 06_권한_보안_감사_거버넌스.md | #4 3-role | PERM | requirement | covered_but_requires_trace | 기존 계획 trace 또는 future overlay anchor 필요 |
| 06_권한_보안_감사_거버넌스.md | #5 4-permission-evaluation | PERM | requirement | covered_but_requires_trace | authz/audit trace 필요, 4면 차단 및 emergency override는 후보로 환류 |
| 06_권한_보안_감사_거버넌스.md | #6 5-ethical-wall | PERM | requirement | covered_but_requires_trace | authz/audit trace 필요, 4면 차단 및 emergency override는 후보로 환류 |
| 06_권한_보안_감사_거버넌스.md | #7 6-audit-event | PERM | requirement | covered_but_requires_trace | 기존 계획 trace 또는 future overlay anchor 필요 |
| 06_권한_보안_감사_거버넌스.md | #8 7-external-sharing | PERM | requirement | covered_but_requires_trace | 기존 계획 trace 또는 future overlay anchor 필요 |
| 06_권한_보안_감사_거버넌스.md | #9 8-data-retention-legal-hold | PERM | requirement | covered_but_requires_trace | 기존 계획 trace 또는 future overlay anchor 필요 |
| 06_권한_보안_감사_거버넌스.md | #10 9-verification-gate | PERM | requirement | covered_but_requires_trace | authz/audit trace 필요, 4면 차단 및 emergency override는 후보로 환류 |
| 07_AI_자동화_모델라우팅_검증정책.md | #1 matter-ai | AIGW | requirement | new_required | 요구 후보로 추출 후 RP anchor/adjudication 연결 |
| 07_AI_자동화_모델라우팅_검증정책.md | #2 1-ai | AIGW | requirement | new_required | 요구 후보로 추출 후 RP anchor/adjudication 연결 |
| 07_AI_자동화_모델라우팅_검증정책.md | #3 2-ai-model-gateway | AIGW | requirement | new_required | 요구 후보로 추출 후 RP anchor/adjudication 연결 |
| 07_AI_자동화_모델라우팅_검증정책.md | #4 3-risk-based-model-routing | AIGW | requirement | new_required | 요구 후보로 추출 후 RP anchor/adjudication 연결 |
| 07_AI_자동화_모델라우팅_검증정책.md | #5 4-ai-job-lifecycle | AIGW | requirement | new_required | 요구 후보로 추출 후 RP anchor/adjudication 연결 |
| 07_AI_자동화_모델라우팅_검증정책.md | #6 5-ai | AIGW | requirement | new_required | 요구 후보로 추출 후 RP anchor/adjudication 연결 |
| 07_AI_자동화_모델라우팅_검증정책.md | #7 6-hr-ai | AIGW | requirement | new_required | 요구 후보로 추출 후 RP anchor/adjudication 연결 |
| 07_AI_자동화_모델라우팅_검증정책.md | #8 7-ai-verification-cases | AIGW | requirement | new_required | 요구 후보로 추출 후 RP anchor/adjudication 연결 |
| 07_AI_자동화_모델라우팅_검증정책.md | #9 8-ai-release-gate | AIGW | requirement | new_required | 요구 후보로 추출 후 RP anchor/adjudication 연결 |
| 08_Microsoft_365_Outlook_Addin_Spec.md | #1 matter-microsoft-365-outlook-add-in | M365 | requirement | defer_with_revisit_gate | M365 부속 모듈 위임: docs/matter-pack-integration/m365/ 단독 추출 책임 |
| 08_Microsoft_365_Outlook_Addin_Spec.md | #2 1 | M365 | requirement | defer_with_revisit_gate | M365 부속 모듈 위임: docs/matter-pack-integration/m365/ 단독 추출 책임 |
| 08_Microsoft_365_Outlook_Addin_Spec.md | #3 2 | M365 | requirement | defer_with_revisit_gate | M365 부속 모듈 위임: docs/matter-pack-integration/m365/ 단독 추출 책임 |
| 08_Microsoft_365_Outlook_Addin_Spec.md | #4 3-outlook-add-in-read-mode | M365 | requirement | defer_with_revisit_gate | M365 부속 모듈 위임: docs/matter-pack-integration/m365/ 단독 추출 책임 |
| 08_Microsoft_365_Outlook_Addin_Spec.md | #5 4-outlook-add-in-compose-mode | M365 | requirement | defer_with_revisit_gate | M365 부속 모듈 위임: docs/matter-pack-integration/m365/ 단독 추출 책임 |
| 08_Microsoft_365_Outlook_Addin_Spec.md | #6 5-email-filing-flow | M365 | requirement | defer_with_revisit_gate | M365 부속 모듈 위임: docs/matter-pack-integration/m365/ 단독 추출 책임 |
| 08_Microsoft_365_Outlook_Addin_Spec.md | #7 6-email-object | M365 | requirement | defer_with_revisit_gate | M365 부속 모듈 위임: docs/matter-pack-integration/m365/ 단독 추출 책임 |
| 08_Microsoft_365_Outlook_Addin_Spec.md | #8 7-attachment-filing-flow | M365 | requirement | defer_with_revisit_gate | M365 부속 모듈 위임: docs/matter-pack-integration/m365/ 단독 추출 책임 |
| 08_Microsoft_365_Outlook_Addin_Spec.md | #9 8-smart-alerts | M365 | requirement | defer_with_revisit_gate | M365 부속 모듈 위임: docs/matter-pack-integration/m365/ 단독 추출 책임 |
| 08_Microsoft_365_Outlook_Addin_Spec.md | #10 9-tuw | M365 | requirement | defer_with_revisit_gate | M365 부속 모듈 위임: docs/matter-pack-integration/m365/ 단독 추출 책임 |
| 08_Microsoft_365_Outlook_Addin_Spec.md | #11 10-release-gate | M365 | requirement | defer_with_revisit_gate | M365 부속 모듈 위임: docs/matter-pack-integration/m365/ 단독 추출 책임 |
| 09_Obsidian_Matter_Vault_Spec.md | #1 matter-obsidian-matter-vault | VAULT | requirement | new_required | 요구 후보로 추출 후 RP anchor/adjudication 연결 |
| 09_Obsidian_Matter_Vault_Spec.md | #2 1 | VAULT | requirement | new_required | 요구 후보로 추출 후 RP anchor/adjudication 연결 |
| 09_Obsidian_Matter_Vault_Spec.md | #3 2 | VAULT | requirement | new_required | 요구 후보로 추출 후 RP anchor/adjudication 연결 |
| 09_Obsidian_Matter_Vault_Spec.md | #4 3-vault | VAULT | requirement | new_required | 요구 후보로 추출 후 RP anchor/adjudication 연결 |
| 09_Obsidian_Matter_Vault_Spec.md | #5 4-note-schema | VAULT | requirement | new_required | 요구 후보로 추출 후 RP anchor/adjudication 연결 |
| 09_Obsidian_Matter_Vault_Spec.md | #6 5-sync | VAULT | requirement | new_required | 요구 후보로 추출 후 RP anchor/adjudication 연결 |
| 09_Obsidian_Matter_Vault_Spec.md | #7 6-import | VAULT | requirement | new_required | 요구 후보로 추출 후 RP anchor/adjudication 연결 |
| 09_Obsidian_Matter_Vault_Spec.md | #8 7-vault | VAULT | requirement | new_required | 요구 후보로 추출 후 RP anchor/adjudication 연결 |
| 09_Obsidian_Matter_Vault_Spec.md | #9 8-verification-gate | VAULT | requirement | new_required | 요구 후보로 추출 후 RP anchor/adjudication 연결 |
| 10_Portal_Platform_Spec.md | #1 matter-portal-platform | PORTAL | requirement | new_required | 요구 후보로 추출 후 RP anchor/adjudication 연결 |
| 10_Portal_Platform_Spec.md | #2 1-portal-platform | PORTAL | requirement | new_required | 요구 후보로 추출 후 RP anchor/adjudication 연결 |
| 10_Portal_Platform_Spec.md | #3 2-portal | PORTAL | requirement | new_required | 요구 후보로 추출 후 RP anchor/adjudication 연결 |
| 10_Portal_Platform_Spec.md | #4 3-portal-projection | PORTAL | requirement | new_required | 요구 후보로 추출 후 RP anchor/adjudication 연결 |
| 10_Portal_Platform_Spec.md | #5 4-client-portal | PORTAL | requirement | new_required | 요구 후보로 추출 후 RP anchor/adjudication 연결 |
| 10_Portal_Platform_Spec.md | #6 5-employee-portal | PORTAL | requirement | new_required | 요구 후보로 추출 후 RP anchor/adjudication 연결 |
| 10_Portal_Platform_Spec.md | #7 6-candidate-portal | PORTAL | requirement | new_required | 요구 후보로 추출 후 RP anchor/adjudication 연결 |
| 10_Portal_Platform_Spec.md | #8 7-verification-gate | PORTAL | requirement | new_required | 요구 후보로 추출 후 RP anchor/adjudication 연결 |
| 11_People_HR_Operations_Spec.md | #1 matter-people-hr-operations | HR | requirement | new_required | HRX 원장(ABS-HRX-04)의 시드 — 이중 판정 금지 |
| 11_People_HR_Operations_Spec.md | #2 1-hr-pillar | HR | requirement | new_required | HRX 원장(ABS-HRX-04)의 시드 — 이중 판정 금지 |
| 11_People_HR_Operations_Spec.md | #3 2 | HR | requirement | new_required | HRX 원장(ABS-HRX-04)의 시드 — 이중 판정 금지 |
| 11_People_HR_Operations_Spec.md | #4 3-hr-domain | HR | requirement | new_required | HRX 원장(ABS-HRX-04)의 시드 — 이중 판정 금지 |
| 11_People_HR_Operations_Spec.md | #5 4-hr-core-objects | HR | requirement | new_required | HRX 원장(ABS-HRX-04)의 시드 — 이중 판정 금지 |
| 11_People_HR_Operations_Spec.md | #6 5-hr-rule-engine | HR | requirement | new_required | HRX 원장(ABS-HRX-04)의 시드 — 이중 판정 금지 |
| 11_People_HR_Operations_Spec.md | #7 6-hr-ai | HR | requirement | new_required | HRX 원장(ABS-HRX-04)의 시드 — 이중 판정 금지 |
| 11_People_HR_Operations_Spec.md | #8 7-hr | HR | requirement | new_required | HRX 원장(ABS-HRX-04)의 시드 — 이중 판정 금지 |
| 11_People_HR_Operations_Spec.md | #9 8-hr-data-room-assistant | HR | requirement | new_required | HRX 원장(ABS-HRX-04)의 시드 — 이중 판정 금지 |
| 11_People_HR_Operations_Spec.md | #10 9-hr-verification-gate | HR | requirement | new_required | HRX 원장(ABS-HRX-04)의 시드 — 이중 판정 금지 |
| 12_Practice_Packs_MA_Litigation_Corporate.md | #1 matter-practice-packs-m-a-litigation-corporate-advisory | ISSUE | requirement | new_required | 요구 후보로 추출 후 RP anchor/adjudication 연결 |
| 12_Practice_Packs_MA_Litigation_Corporate.md | #2 1-practice-pack | ISSUE | requirement | new_required | 요구 후보로 추출 후 RP anchor/adjudication 연결 |
| 12_Practice_Packs_MA_Litigation_Corporate.md | #3 2-m-a-pack | ISSUE | requirement | new_required | 요구 후보로 추출 후 RP anchor/adjudication 연결 |
| 12_Practice_Packs_MA_Litigation_Corporate.md | #4 3-litigation-pack | ISSUE | requirement | new_required | 요구 후보로 추출 후 RP anchor/adjudication 연결 |
| 12_Practice_Packs_MA_Litigation_Corporate.md | #5 4-corporate-advisory-pack | ISSUE | requirement | new_required | 요구 후보로 추출 후 RP anchor/adjudication 연결 |
| 12_Practice_Packs_MA_Litigation_Corporate.md | #6 5-issue-ledger | ISSUE | requirement | new_required | 요구 후보로 추출 후 RP anchor/adjudication 연결 |
| 12_Practice_Packs_MA_Litigation_Corporate.md | #7 6-practice-pack-verification | ISSUE | requirement | new_required | 요구 후보로 추출 후 RP anchor/adjudication 연결 |
| 13_Drafting_Clause_QC_Spec.md | #1 matter-drafting-clause-intelligence-legal-document-qc | DRAFT | requirement | new_required | 요구 후보로 추출 후 RP anchor/adjudication 연결 |
| 13_Drafting_Clause_QC_Spec.md | #2 1 | DRAFT | requirement | new_required | 요구 후보로 추출 후 RP anchor/adjudication 연결 |
| 13_Drafting_Clause_QC_Spec.md | #3 2-drafting-workspace | DRAFT | requirement | new_required | 요구 후보로 추출 후 RP anchor/adjudication 연결 |
| 13_Drafting_Clause_QC_Spec.md | #4 3-clause-library | DRAFT | requirement | new_required | 요구 후보로 추출 후 RP anchor/adjudication 연결 |
| 13_Drafting_Clause_QC_Spec.md | #5 4-legal-document-qc | DRAFT | requirement | new_required | 요구 후보로 추출 후 RP anchor/adjudication 연결 |
| 13_Drafting_Clause_QC_Spec.md | #6 5-ai | DRAFT | requirement | new_required | 요구 후보로 추출 후 RP anchor/adjudication 연결 |
| 13_Drafting_Clause_QC_Spec.md | #7 6-verification-gate | DRAFT | requirement | new_required | 요구 후보로 추출 후 RP anchor/adjudication 연결 |
| 14_Billing_ERP_Analytics_Spec.md | #1 matter-billing-erp-analytics | BILL | requirement | new_required | 요구 후보로 추출 후 RP anchor/adjudication 연결 |
| 14_Billing_ERP_Analytics_Spec.md | #2 1 | BILL | requirement | new_required | 요구 후보로 추출 후 RP anchor/adjudication 연결 |
| 14_Billing_ERP_Analytics_Spec.md | #3 2-core-objects | BILL | requirement | new_required | 요구 후보로 추출 후 RP anchor/adjudication 연결 |
| 14_Billing_ERP_Analytics_Spec.md | #4 3-time-capture | BILL | requirement | new_required | 요구 후보로 추출 후 RP anchor/adjudication 연결 |
| 14_Billing_ERP_Analytics_Spec.md | #5 4-billing-workflow | BILL | requirement | new_required | 요구 후보로 추출 후 RP anchor/adjudication 연결 |
| 14_Billing_ERP_Analytics_Spec.md | #6 5-analytics | BILL | requirement | new_required | 요구 후보로 추출 후 RP anchor/adjudication 연결 |
| 14_Billing_ERP_Analytics_Spec.md | #7 6 | BILL | requirement | new_required | 요구 후보로 추출 후 RP anchor/adjudication 연결 |
| 15_릴리스_로드맵_DBS.md | #1 matter-delivery-breakdown-structure | GOV | governance | covered_but_requires_trace | 현행 RP/CP/validator/리뷰 체계와 등가성 입증 대상으로 분류 |
| 15_릴리스_로드맵_DBS.md | #2 1 | GOV | governance | covered_but_requires_trace | 현행 RP/CP/validator/리뷰 체계와 등가성 입증 대상으로 분류 |
| 15_릴리스_로드맵_DBS.md | #3 2 | GOV | governance | covered_but_requires_trace | 현행 RP/CP/validator/리뷰 체계와 등가성 입증 대상으로 분류 |
| 15_릴리스_로드맵_DBS.md | #4 r0-development-os-foundation | GOV | governance | covered_but_requires_trace | 현행 RP/CP/validator/리뷰 체계와 등가성 입증 대상으로 분류 |
| 15_릴리스_로드맵_DBS.md | #5 r1-matter-core-foundation | GOV | governance | covered_but_requires_trace | 현행 RP/CP/validator/리뷰 체계와 등가성 입증 대상으로 분류 |
| 15_릴리스_로드맵_DBS.md | #6 r2-security-permission-foundation | GOV | governance | covered_but_requires_trace | 현행 RP/CP/validator/리뷰 체계와 등가성 입증 대상으로 분류 |
| 15_릴리스_로드맵_DBS.md | #7 r3-microsoft-dms-foundation | GOV | governance | covered_but_requires_trace | 현행 RP/CP/validator/리뷰 체계와 등가성 입증 대상으로 분류 |
| 15_릴리스_로드맵_DBS.md | #8 r4-outlook-filing-foundation | GOV | governance | covered_but_requires_trace | 현행 RP/CP/validator/리뷰 체계와 등가성 입증 대상으로 분류 |
| 15_릴리스_로드맵_DBS.md | #9 r5-core-workflow | GOV | governance | covered_but_requires_trace | 현행 RP/CP/validator/리뷰 체계와 등가성 입증 대상으로 분류 |
| 15_릴리스_로드맵_DBS.md | #10 r6-issue-practice-core | GOV | governance | covered_but_requires_trace | 현행 RP/CP/validator/리뷰 체계와 등가성 입증 대상으로 분류 |
| 15_릴리스_로드맵_DBS.md | #11 r7-portal-platform | GOV | governance | covered_but_requires_trace | 현행 RP/CP/validator/리뷰 체계와 등가성 입증 대상으로 분류 |
| 15_릴리스_로드맵_DBS.md | #12 r8-knowledge-obsidian-vault | GOV | governance | covered_but_requires_trace | 현행 RP/CP/validator/리뷰 체계와 등가성 입증 대상으로 분류 |
| 15_릴리스_로드맵_DBS.md | #13 r9-ai-automation | GOV | governance | covered_but_requires_trace | 현행 RP/CP/validator/리뷰 체계와 등가성 입증 대상으로 분류 |
| 15_릴리스_로드맵_DBS.md | #14 r10-drafting-clause-intelligence | GOV | governance | covered_but_requires_trace | 현행 RP/CP/validator/리뷰 체계와 등가성 입증 대상으로 분류 |
| 15_릴리스_로드맵_DBS.md | #15 r11-billing-erp | GOV | governance | covered_but_requires_trace | 현행 RP/CP/validator/리뷰 체계와 등가성 입증 대상으로 분류 |
| 15_릴리스_로드맵_DBS.md | #16 r12-admin-governance | GOV | governance | covered_but_requires_trace | 현행 RP/CP/validator/리뷰 체계와 등가성 입증 대상으로 분류 |
| 15_릴리스_로드맵_DBS.md | #17 r13-enterprise-hardening | GOV | governance | covered_but_requires_trace | 현행 RP/CP/validator/리뷰 체계와 등가성 입증 대상으로 분류 |
| 15_릴리스_로드맵_DBS.md | #18 r14-people-hr-operations | GOV | governance | covered_but_requires_trace | 현행 RP/CP/validator/리뷰 체계와 등가성 입증 대상으로 분류 |
| 15_릴리스_로드맵_DBS.md | #19 3 | GOV | governance | covered_but_requires_trace | 현행 RP/CP/validator/리뷰 체계와 등가성 입증 대상으로 분류 |
| 16_Execution_Dependency_Graph.md | #1 matter-execution-dependency-graph | GOV | governance | covered_but_requires_trace | 현행 RP/CP/validator/리뷰 체계와 등가성 입증 대상으로 분류 |
| 16_Execution_Dependency_Graph.md | #2 1-edge | GOV | governance | covered_but_requires_trace | 현행 RP/CP/validator/리뷰 체계와 등가성 입증 대상으로 분류 |
| 16_Execution_Dependency_Graph.md | #3 2-node | GOV | governance | covered_but_requires_trace | 현행 RP/CP/validator/리뷰 체계와 등가성 입증 대상으로 분류 |
| 16_Execution_Dependency_Graph.md | #4 3-node | GOV | governance | covered_but_requires_trace | 현행 RP/CP/validator/리뷰 체계와 등가성 입증 대상으로 분류 |
| 16_Execution_Dependency_Graph.md | #5 4-dependency-chain | GOV | governance | covered_but_requires_trace | 현행 RP/CP/validator/리뷰 체계와 등가성 입증 대상으로 분류 |
| 16_Execution_Dependency_Graph.md | #6 5-regression-map | GOV | governance | covered_but_requires_trace | 현행 RP/CP/validator/리뷰 체계와 등가성 입증 대상으로 분류 |
| 17_TUW_표준_및_ID_체계.md | #1 matter-tuw-id | GOV | governance | reject_with_reason | TUW/VC/CG 체계는 요구 시드만 흡수하고 실행 거버넌스 체계로는 비흡수 |
| 17_TUW_표준_및_ID_체계.md | #2 1 | GOV | governance | reject_with_reason | TUW/VC/CG 체계는 요구 시드만 흡수하고 실행 거버넌스 체계로는 비흡수 |
| 17_TUW_표준_및_ID_체계.md | #3 2-tuw-id | GOV | governance | reject_with_reason | TUW/VC/CG 체계는 요구 시드만 흡수하고 실행 거버넌스 체계로는 비흡수 |
| 17_TUW_표준_및_ID_체계.md | #4 3-pillar-prefix | GOV | governance | reject_with_reason | TUW/VC/CG 체계는 요구 시드만 흡수하고 실행 거버넌스 체계로는 비흡수 |
| 17_TUW_표준_및_ID_체계.md | #5 4-tuw | GOV | governance | reject_with_reason | TUW/VC/CG 체계는 요구 시드만 흡수하고 실행 거버넌스 체계로는 비흡수 |
| 17_TUW_표준_및_ID_체계.md | #6 5-risk-level | GOV | governance | reject_with_reason | TUW/VC/CG 체계는 요구 시드만 흡수하고 실행 거버넌스 체계로는 비흡수 |
| 17_TUW_표준_및_ID_체계.md | #7 6-completion-gate | GOV | governance | reject_with_reason | TUW/VC/CG 체계는 요구 시드만 흡수하고 실행 거버넌스 체계로는 비흡수 |
| 18_TUW_초기_백로그.md | #1 matter-tuw | GOV | governance | reject_with_reason | TUW/VC/CG 체계는 요구 시드만 흡수하고 실행 거버넌스 체계로는 비흡수 |
| 18_TUW_초기_백로그.md | #2 1 | GOV | governance | reject_with_reason | TUW/VC/CG 체계는 요구 시드만 흡수하고 실행 거버넌스 체계로는 비흡수 |
| 18_TUW_초기_백로그.md | #3 2-tuw | GOV | governance | reject_with_reason | TUW/VC/CG 체계는 요구 시드만 흡수하고 실행 거버넌스 체계로는 비흡수 |
| 19_Verification_Case_Catalog.md | #1 matter-verification-case-catalog | GOV | governance | reject_with_reason | TUW/VC/CG 체계는 요구 시드만 흡수하고 실행 거버넌스 체계로는 비흡수 |
| 19_Verification_Case_Catalog.md | #2 1-verification-case | GOV | governance | reject_with_reason | TUW/VC/CG 체계는 요구 시드만 흡수하고 실행 거버넌스 체계로는 비흡수 |
| 19_Verification_Case_Catalog.md | #3 2-readiness-gate | GOV | governance | reject_with_reason | TUW/VC/CG 체계는 요구 시드만 흡수하고 실행 거버넌스 체계로는 비흡수 |
| 19_Verification_Case_Catalog.md | #4 3-completion-gate | GOV | governance | reject_with_reason | TUW/VC/CG 체계는 요구 시드만 흡수하고 실행 거버넌스 체계로는 비흡수 |
| 19_Verification_Case_Catalog.md | #5 4 | GOV | governance | reject_with_reason | TUW/VC/CG 체계는 요구 시드만 흡수하고 실행 거버넌스 체계로는 비흡수 |
| 20_Agent_Work_Contracts.md | #1 matter-agent-work-contracts | GOV | governance | reject_with_reason | TUW/VC/CG 체계는 요구 시드만 흡수하고 실행 거버넌스 체계로는 비흡수 |
| 20_Agent_Work_Contracts.md | #2 1-agent-work-contract | GOV | governance | reject_with_reason | TUW/VC/CG 체계는 요구 시드만 흡수하고 실행 거버넌스 체계로는 비흡수 |
| 20_Agent_Work_Contracts.md | #3 2-planner-agent | GOV | governance | reject_with_reason | TUW/VC/CG 체계는 요구 시드만 흡수하고 실행 거버넌스 체계로는 비흡수 |
| 20_Agent_Work_Contracts.md | #4 3-executor-agent | GOV | governance | reject_with_reason | TUW/VC/CG 체계는 요구 시드만 흡수하고 실행 거버넌스 체계로는 비흡수 |
| 20_Agent_Work_Contracts.md | #5 4-verifier-agent | GOV | governance | reject_with_reason | TUW/VC/CG 체계는 요구 시드만 흡수하고 실행 거버넌스 체계로는 비흡수 |
| 20_Agent_Work_Contracts.md | #6 5-governor-agent | GOV | governance | reject_with_reason | TUW/VC/CG 체계는 요구 시드만 흡수하고 실행 거버넌스 체계로는 비흡수 |
| 20_Agent_Work_Contracts.md | #7 6-outlook-filing-agent | GOV | governance | reject_with_reason | TUW/VC/CG 체계는 요구 시드만 흡수하고 실행 거버넌스 체계로는 비흡수 |
| 20_Agent_Work_Contracts.md | #8 7-legal-qc-agent | GOV | governance | reject_with_reason | TUW/VC/CG 체계는 요구 시드만 흡수하고 실행 거버넌스 체계로는 비흡수 |
| 20_Agent_Work_Contracts.md | #9 8-hr-assistant-agent | GOV | governance | reject_with_reason | TUW/VC/CG 체계는 요구 시드만 흡수하고 실행 거버넌스 체계로는 비흡수 |
| 20_Agent_Work_Contracts.md | #10 9-vault-sync-agent | GOV | governance | reject_with_reason | TUW/VC/CG 체계는 요구 시드만 흡수하고 실행 거버넌스 체계로는 비흡수 |
| 21_UI_화면_사용자흐름.md | #1 matter-ui | UI | requirement | new_required | 요구 후보로 추출 후 RP anchor/adjudication 연결 |
| 21_UI_화면_사용자흐름.md | #2 1 | UI | requirement | new_required | 요구 후보로 추출 후 RP anchor/adjudication 연결 |
| 21_UI_화면_사용자흐름.md | #3 2-matter-home | UI | requirement | new_required | 요구 후보로 추출 후 RP anchor/adjudication 연결 |
| 21_UI_화면_사용자흐름.md | #4 3-outlook-filing-flow | UI | requirement | new_required | 요구 후보로 추출 후 RP anchor/adjudication 연결 |
| 21_UI_화면_사용자흐름.md | #5 4-issue-ledger-flow | UI | requirement | new_required | 요구 후보로 추출 후 RP anchor/adjudication 연결 |
| 21_UI_화면_사용자흐름.md | #6 5-client-portal-flow | UI | requirement | new_required | 요구 후보로 추출 후 RP anchor/adjudication 연결 |
| 21_UI_화면_사용자흐름.md | #7 6-hr-employee-portal-flow | UI | requirement | new_required | 요구 후보로 추출 후 RP anchor/adjudication 연결 |
| 21_UI_화면_사용자흐름.md | #8 7-ai-review-queue-flow | UI | requirement | new_required | 요구 후보로 추출 후 RP anchor/adjudication 연결 |
| 21_UI_화면_사용자흐름.md | #9 8-admin-ux | UI | requirement | new_required | 요구 후보로 추출 후 RP anchor/adjudication 연결 |
| 22_API_이벤트_통합_명세.md | #1 matter-api | API | requirement | new_required | 요구 후보로 추출 후 RP anchor/adjudication 연결 |
| 22_API_이벤트_통합_명세.md | #2 1-api | API | requirement | new_required | 요구 후보로 추출 후 RP anchor/adjudication 연결 |
| 22_API_이벤트_통합_명세.md | #3 2-event-model | API | requirement | new_required | 요구 후보로 추출 후 RP anchor/adjudication 연결 |
| 22_API_이벤트_통합_명세.md | #4 3-microsoft-graph-integration | API | requirement | new_required | 요구 후보로 추출 후 RP anchor/adjudication 연결 |
| 22_API_이벤트_통합_명세.md | #5 4-obsidian-integration | API | requirement | new_required | 요구 후보로 추출 후 RP anchor/adjudication 연결 |
| 22_API_이벤트_통합_명세.md | #6 5-legal-data-integration | API | requirement | new_required | 요구 후보로 추출 후 RP anchor/adjudication 연결 |
| 22_API_이벤트_통합_명세.md | #7 6-api | API | requirement | new_required | 요구 후보로 추출 후 RP anchor/adjudication 연결 |
| 23_Risk_Register_Open_Questions.md | #1 matter-risk-register-open-questions | GOV | requirement | new_required | UPR/UPQ seed로 흡수 |
| 23_Risk_Register_Open_Questions.md | #2 1-risk-register | GOV | requirement | new_required | UPR/UPQ seed로 흡수 |
| 23_Risk_Register_Open_Questions.md | #3 2-open-questions | GOV | requirement | new_required | UPR/UPQ seed로 흡수 |
| 23_Risk_Register_Open_Questions.md | #4 3 | GOV | requirement | new_required | UPR/UPQ seed로 흡수 |
| 24_개발팀_착수_지시서.md | #1 matter | GOV | governance | reject_with_reason | TUW/VC/CG 체계는 요구 시드만 흡수하고 실행 거버넌스 체계로는 비흡수 |
| 24_개발팀_착수_지시서.md | #2 1 | GOV | governance | reject_with_reason | TUW/VC/CG 체계는 요구 시드만 흡수하고 실행 거버넌스 체계로는 비흡수 |
| 24_개발팀_착수_지시서.md | #3 2-1 | GOV | governance | reject_with_reason | TUW/VC/CG 체계는 요구 시드만 흡수하고 실행 거버넌스 체계로는 비흡수 |
| 24_개발팀_착수_지시서.md | #4 3 | GOV | governance | reject_with_reason | TUW/VC/CG 체계는 요구 시드만 흡수하고 실행 거버넌스 체계로는 비흡수 |
| 24_개발팀_착수_지시서.md | #5 4-1-tuw | GOV | governance | reject_with_reason | TUW/VC/CG 체계는 요구 시드만 흡수하고 실행 거버넌스 체계로는 비흡수 |
| 24_개발팀_착수_지시서.md | #6 5 | GOV | governance | reject_with_reason | TUW/VC/CG 체계는 요구 시드만 흡수하고 실행 거버넌스 체계로는 비흡수 |
| 24_개발팀_착수_지시서.md | #7 6 | GOV | governance | reject_with_reason | TUW/VC/CG 체계는 요구 시드만 흡수하고 실행 거버넌스 체계로는 비흡수 |

검산: section_rows=201; allowed_classification_only=true; m365_doc08_rows=11; silent_omission_count=0.

## §3 Already-Covered 제외표 (갭 분석 §3 재사용 — trace만, 재추출 금지)

| Plan A 항목 | 기존 구현 | 처리 |
|---|---|---|
| Audit Event + 변경불가 저장(06_권한) | `packages/audit` 해시체인·WORM·purge 게이트 — **문서 요구 초과 달성** | covered_but_requires_trace |
| fail-closed 권한 평가(06_권한) | `packages/authz/src/evaluate.js` 4값 결정 + ethical wall 속성 | covered_but_requires_trace (4면 차단·emergency override 절차는 잔여 → MAT-REQ-PERM) |
| 문서 원본 분리/file_ref(05_도메인) | `packages/dms` storage_pointer_ref+sha256 3층 모델 | covered (M365 바인딩은 MAT-REQ-M365, 스토리지 결정 보류) |
| Matter/Task/CalendarEvent/Checklist 골격 | `packages/matter/src/model.js` | covered_but_requires_trace (상태 enum 차이는 adjudication) |
| Tenant·멀티테넌시 | MAT-DEC-01 "1호 테넌트" 결정으로 충돌 해소 — 기존 구현 유지 | implemented_by_existing_plan |
