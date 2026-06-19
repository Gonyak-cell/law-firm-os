# UI 에셋 분류 및 기능 비교 리포트

Law Firm OS SaaS에서 ERP, CMS, DMS, CRM, HR 화면을 설계할 때 참고하기 위해 수집한 Figma Community/Make UI 21개를 분류하고 기능 깊이를 비교했습니다.

저장 기준일: 2026-06-05

## 저장 상태

- 웹 원본 저장: 21개 전부 `source-page.html`, `web-meta.json`, `thumbnail.png` 저장 완료
- Figma Design MCP 저장: 디자인 파일 17개는 가능한 범위에서 대형 `mcp-screenshot.png`, 메타데이터, 디자인 컨텍스트, React/Tailwind 참고 코드, 참조 에셋 저장
- Figma Make 저장: 4개는 MCP 리소스 URI 인덱스 351개를 저장했으며, 현재 환경에서는 URI 본문 직접 읽기 권한이 제한됨
- 새 CRM 4개 에셋 저장: 실제 에셋 143개 저장 완료, 각 파일에서 공통 placeholder ID `550e8400-e29b-41d4-a716-446655440000`만 404로 실패
- 위 placeholder 404는 Figma가 내려준 더미 참조로 보이며, 실제 화면 이미지와 사용 가능한 에셋 저장에는 영향이 없음

## 복구 및 제한 메모

- `06-erp-b2b-design-kit`: 1차 시도에서 페이지 메타데이터가 너무 커 일부 호출이 불안정했지만, 재시도 후 페이지 목록과 상위 프레임 구조를 `failure-recovery/06-erp-b2b-design-kit/`에 저장했습니다.
- `11-hr-management-ats-tool`: 1차 시도에서 페이지 메타데이터가 너무 커 일부 호출이 불안정했지만, 재시도 후 Design 페이지와 상위 프레임 구조를 `failure-recovery/11-hr-management-ats-tool/`에 저장했습니다.
- Figma Make 4개는 `file://figma/make/source/...` 리소스 본문을 MCP 리더가 직접 읽지 못해 URI 인덱스 중심으로 보존했습니다.

## 평가 기준

기능 점수는 10점 만점입니다.

- 화면과 모듈 수: 대시보드, 리스트, 상세, 생성/수정, 설정, 상태 화면 범위
- 업무 플로우 깊이: 승인, 권한, 버전, 감사 로그, 검색, 업로드, 주문, 생산, 재고, 리드, 고객, 거래, 태스크 등 실제 업무 절차 포함 여부
- 컴포넌트 재사용성: 디자인 시스템, 테이블, 내비게이션, 모달, 상태 컴포넌트, 반응형 패턴
- Law Firm OS 적합도: 법무법인 ERP/CMS/DMS/CRM 통합 제품으로 변환하기 쉬운 정도

## 전체 분류표

| # | 에셋 | 주분류 | 보조 분류 | 기능 점수 | 핵심 참고 포인트 |
|---:|---|---|---|---:|---|
| 1 | CMS Template Community | ERP | CMS/Admin | 5.0 | CMS 테이블, 사이드바, 상단 내비게이션, 필터/목록 패턴 |
| 2 | Atomic DesignSystem UIkit SaaS ERP CRM | ERP | CRM, Design System | 7.0 | SaaS/ERP/CRM 공용 UI kit, 토큰과 컴포넌트 참조 |
| 3 | Prototipo de um ERP by Joshua | ERP | Admin | 4.0 | ERP 시각 레이아웃 중심, 실제 업무 기능은 얕음 |
| 4 | CRM ERP WMS Part 1 | CRM | ERP, WMS | 7.3 | CRM/ERP/WMS 대시보드와 운영 테이블 패턴 |
| 5 | Construction ERP Software UI | ERP | Operations | 7.6 | 건설 ERP, 현장/운영/재고성 화면과 업무형 대시보드 |
| 6 | ERP B2B Design Kit | ERP | Manufacturing, Inventory | 9.4 | 주문, 생산, 예측, 계획, BOM, 재고 요청, 알림, 제조 |
| 7 | UiUxOtor ERP System HR Module | HR | ERP-HR | 3.5 | HR 모듈 커버와 기초 레이아웃 참고 |
| 8 | Web administrativa CMS 2024 | ERP | CMS/Admin | 5.5 | 관리형 CMS 패널, 목록 관리, 어드민 패턴 |
| 9 | HR Dashboard Responsive | HR | Dashboard | 6.5 | 반응형 HR 대시보드, KPI와 요약 패턴 |
| 10 | HRDashboard HR Management Dashboard UI Kit | HR | UI Kit | 6.7 | HR 대시보드 UI kit, 시각 완성도와 컴포넌트 참고 |
| 11 | HR Management ATS Tool | HR | ATS, Recruiting | 8.2 | 로그인, 가입, 대시보드, 후보자 프로필, ATS 컴포넌트 |
| 12 | Enterprise Document Management Screen | DMS | Enterprise Admin | 8.5 | 문서 목록/상세, 엔터프라이즈 DMS 화면 구조 |
| 13 | Document Management | DMS | Service Provider | 7.0 | DMS 서비스형 화면, 정보 구조 참고 |
| 14 | Corporate Document Management Dashboard | DMS | Workflow, Tasks | 8.8 | 문서, 상세/폼/목록, 태스크, 부서, 워크플로우, 승인 |
| 15 | Enterprise Document Management Dashboard | DMS | Governance | 9.6 | 업로드, 공유 링크, 권한, 버전 히스토리, 역할, 감사 추적, 삭제 |
| 16 | Document Management System Prototype | DMS | Prototype | 7.4 | 문서 카드, 통계, 뷰어, 업로드, 검색 |
| 17 | Document Management System UI | DMS | Enterprise/SAP-style | 9.2 | 문서 목록, 업로드, 버전, 메타데이터 편집, 고급 검색, 활동 로그 |
| 18 | Twilio CRM Template | CRM | Client Intake, Communications | 9.7 | 리드/잠재고객/고객 생애주기, 통화/SMS/이메일, 콜 로그, 상담 흐름 |
| 19 | CRM system | CRM | Admin, Project, HR | 5.8 | 모바일형 운영 대시보드, 프로젝트, 직원, 일정, 워크로드 |
| 20 | CRM Woorkroom | CRM | Admin Workroom, Project, HR | 6.2 | 데스크톱 운영 대시보드, 프로젝트, 캘린더, 직원, 메신저 |
| 21 | CRM app with customers deals nested data tasks and menu filtering | CRM | Customers, Deals, Tasks | 9.4 | 고객, 거래, 태스크, 약속, 활동, 필터링, 빈 상태 |

## 카테고리별 기능 순위

### CRM

| 순위 | 에셋 | 점수 | 장점 | 단점 |
|---:|---|---:|---|---|
| 1 | Twilio CRM Template | 9.7 | 실제 CRM에 가장 가까움. 리드/잠재고객/고객 상태, 통화/SMS/이메일, 콜 로그, 트랜스크립트, 계정 상세 패널이 풍부함 | Twilio/컨택센터 성격이 강해 법률 상담, 사건, 의뢰인 용어로 재설계 필요 |
| 2 | CRM app with customers deals nested data tasks and menu filtering | 9.4 | 고객, 거래, 태스크, 약속, 활동, 필터링이 한 흐름으로 연결되어 법무법인 영업 파이프라인에 적합 | 통신/콜센터 깊이는 18번보다 약함 |
| 3 | CRM ERP WMS Part 1 | 7.3 | CRM과 ERP/WMS가 섞인 운영형 대시보드 구조가 있어 통합 OS 방향 참고 가능 | 법률 CRM 전용 객체와 고객 접점 흐름은 부족 |
| 4 | Atomic DesignSystem UIkit SaaS ERP CRM | 7.0 | SaaS/ERP/CRM 공용 컴포넌트와 디자인 토큰 참고 가치가 큼 | 완성된 CRM 업무 화면보다 UI kit 성격이 강함 |
| 5 | CRM Woorkroom | 6.2 | 프로젝트, 캘린더, 직원, 워크로드, 액티비티 스트림이 내부 운영 화면에 적합 | 고객, 리드, 거래 파이프라인 기능은 약함 |
| 6 | CRM system | 5.8 | 모바일/반응형 어드민, 프로젝트 카드, 직원/일정 패턴 참고 가능 | CRM이라는 제목과 달리 실제 고객/거래 관리 깊이가 가장 약함 |

CRM 최우선 후보는 `18-twilio-crm-template`입니다. 여기에 `21-crm-customers-deals-tasks-filtering`의 고객/거래/태스크 구조를 결합하면 Law Firm OS의 상담 접수, 의뢰인 전환, 사건 수임 파이프라인을 가장 빠르게 설계할 수 있습니다.

### DMS

| 순위 | 에셋 | 점수 | 장점 | 단점 |
|---:|---|---:|---|---|
| 1 | Enterprise Document Management Dashboard | 9.6 | 권한, 공유, 버전, 감사 추적, 역할, 업로드, 삭제까지 DMS 거버넌스가 가장 풍부함 | Figma Make 본문 직접 저장은 권한 제한으로 URI 인덱스 중심 |
| 2 | Document Management System UI | 9.2 | 고급 검색, 메타데이터 편집, 버전 히스토리, 활동 로그, 진단 화면이 풍부함 | SAP식 엔터프라이즈 톤이라 SaaS 제품에는 다듬어야 함 |
| 3 | Corporate Document Management Dashboard | 8.8 | 문서 상세, 폼, 목록, 태스크, 부서, 승인 워크플로우가 좋음 | 권한/감사/버전 깊이는 15번보다 약함 |
| 4 | Enterprise Document Management Screen | 8.5 | 문서 관리 화면 코드와 에셋이 풍부하고 엔터프라이즈 화면 참고성이 높음 | 단일 화면 중심이라 전체 DMS 흐름은 보강 필요 |
| 5 | Document Management System Prototype | 7.4 | 카드, 뷰어, 업로드, 검색, 통계의 프로토타입 뼈대가 좋음 | 실무 권한과 감사 체계는 부족 |
| 6 | Document Management | 7.0 | 기본 DMS 정보 구조와 서비스형 화면 참고 가능 | 내부 구현 세부와 업무 플로우는 제한적 |

DMS 최우선 후보는 `15-enterprise-document-management-dashboard`입니다. 법무법인 문서 관리에는 권한, 버전, 감사 로그가 중요하므로 15번을 기본으로 두고 17번의 검색/메타데이터/활동 로그를 결합하는 방향이 가장 좋습니다.

### ERP

| 순위 | 에셋 | 점수 | 장점 | 단점 |
|---:|---|---:|---|---|
| 1 | ERP B2B Design Kit | 9.4 | 주문, 생산, 계획, 예측, BOM, 재고, 알림까지 업무 모듈 수가 가장 많음 | 제조/재고 중심이라 법무법인 회계, 청구, 비용, 운영 모듈로 재해석 필요 |
| 2 | Construction ERP Software UI | 7.6 | 프로젝트성 운영, 현장/자원 관리, 업무형 대시보드 참고에 좋음 | 건설 도메인 특화가 강함 |
| 3 | CRM ERP WMS Part 1 | 7.3 | CRM, ERP, WMS가 한 제품 안에 섞인 통합 운영 느낌 참고 가능 | 각 모듈의 세부 깊이는 ERP B2B보다 약함 |
| 4 | Atomic DesignSystem UIkit SaaS ERP CRM | 7.0 | 통합 SaaS 디자인 시스템과 테이블/폼/상태 컴포넌트 참고 가치가 큼 | 업무 기능 자체는 UI kit 수준 |
| 5 | Web administrativa CMS 2024 | 5.5 | 어드민 CMS 목록, 패널, 기본 관리 화면에 적합 | ERP 핵심 업무 모듈은 부족 |
| 6 | CMS Template Community | 5.0 | CMS형 리스트와 사이드바 관리 화면 기초 참고 가능 | 통합 ERP 업무 깊이는 낮음 |
| 7 | Prototipo de um ERP by Joshua | 4.0 | ERP 레이아웃 무드 참고 가능 | 기능 분해와 실제 업무 플로우가 약함 |

ERP 최우선 후보는 `06-erp-b2b-design-kit`입니다. Law Firm OS에서는 제조/재고 개념을 사건, 청구, 비용, 인력 배정, 업무 요청, 알림 체계로 바꿔 쓰는 것이 좋습니다.

### HR

| 순위 | 에셋 | 점수 | 장점 | 단점 |
|---:|---|---:|---|---|
| 1 | HR Management ATS Tool | 8.2 | ATS, 후보자 프로필, 인증, 대시보드, 컴포넌트 구성이 가장 풍부함 | 급여, 근태, 조직도, 평가 같은 HRIS 전체 기능은 부족 |
| 2 | HRDashboard HR Management Dashboard UI Kit | 6.7 | HR 대시보드 시각 완성도와 UI kit 재사용성이 좋음 | 실제 인사 운영 플로우는 얕음 |
| 3 | HR Dashboard Responsive | 6.5 | 반응형 HR KPI와 요약 화면 참고에 좋음 | CRUD와 상세 업무 처리는 약함 |
| 4 | UiUxOtor ERP System HR Module | 3.5 | HR 모듈 커버와 기본 구조 참고 가능 | 실사용 화면과 기능 구성이 가장 적음 |

HR 최우선 후보는 `11-hr-management-ats-tool`입니다. 법무법인에서는 채용과 변호사/스태프 프로필 관리에 먼저 활용하고, 근태/평가/권한은 별도 ERP 패턴으로 보강하는 편이 좋습니다.

## Law Firm OS 조합 추천

1. CRM: `18-twilio-crm-template` + `21-crm-customers-deals-tasks-filtering`
2. DMS: `15-enterprise-document-management-dashboard` + `17-document-management-system-ui`
3. ERP: `06-erp-b2b-design-kit`
4. HR: `11-hr-management-ats-tool`
5. 공통 디자인 시스템: `02-atomic-design-system-uikit-saas-erp-crm`

이 조합을 기준으로 잡으면 Law Firm OS의 핵심 화면은 상담 접수, 의뢰인/리드 관리, 사건 전환, 문서 보관/권한/버전/감사, 청구/비용/운영 요청, 인력/채용 관리까지 하나의 제품 언어로 묶기 쉽습니다.

