# Law Firm OS 통합 UI 조합 계획

작성일: 2026-06-05

## 전제

Law Firm OS는 CRM, ERP, DMS, HR이 모두 통합된 법무법인용 SaaS입니다. 따라서 각 모듈이 별도 앱처럼 보이지 않아야 하며, 하나의 제품 언어와 공통 객체 구조 안에서 연결되어야 합니다.

핵심 방향은 다음과 같습니다.

- 공통 UI 시스템을 먼저 정의하고 모든 모듈에 적용한다.
- 모듈별 베스트 레퍼런스는 가져오되, 시각 언어와 인터랙션 패턴은 하나로 통일한다.
- 화면은 모듈 중심이 아니라 `Client`, `Matter`, `Document`, `Invoice`, `Person`, `Task` 같은 업무 객체 중심으로 연결한다.
- 법무법인 업무 특성상 권한, 감사 로그, 버전, 승인, 검색, 활동 이력은 전 모듈의 공통 UX로 설계한다.

## 기준 에셋 조합

| 영역 | 기준 에셋 | 활용 역할 |
|---|---|---|
| 공통 UI 시스템 | `02-atomic-design-system-uikit-saas-erp-crm` | 버튼, 테이블, 폼, 필터, 모달, 탭, 상태 배지, 디자인 토큰 |
| CRM | `18-twilio-crm-template` + `21-crm-customers-deals-tasks-filtering` | 상담 접수, 리드, 의뢰인 전환, 커뮤니케이션, 태스크 |
| ERP | `06-erp-b2b-design-kit` + `05-construction-erp-software-ui` | 청구, 비용, 승인, 사건 운영, 리소스 배정, 내부 요청 |
| DMS | `15-enterprise-document-management-dashboard` + `17-document-management-system-ui` | 문서 권한, 버전, 감사 로그, 검색, 업로드, 공유 |
| HR | `11-hr-management-ats-tool` + `10-hr-management-dashboard-uikit` | 구성원 프로필, 채용, 배정, 워크로드, 휴가, 성과 |

## 공통 UI 시스템 계획

공통 UI의 기준은 `02 Atomic DesignSystem UIkit`입니다. 다만 원본을 그대로 쓰지 않고, 법무법인 운영 제품에 맞게 차분하고 밀도 있는 SaaS UI로 재정의합니다.

### 전역 레이아웃

- 좌측 사이드바: `CRM`, `Matters`, `Documents`, `Billing`, `HR`, `Reports`, `Settings`
- 상단 바: 글로벌 검색, 빠른 생성, 알림, 내 태스크, 사용자/조직 전환
- 메인 영역: 리스트, 대시보드, 상세, 워크플로우 화면
- 오른쪽 패널: 선택 객체의 빠른 상세, 활동 로그, 관련 태스크, 권한 정보

### 공통 컴포넌트

- 공통 테이블: 고객, 사건, 문서, 청구, 구성원 목록에 동일한 컬럼 밀도와 필터 패턴 적용
- 공통 상세 패널: 고객, 사건, 문서, 직원 상세를 같은 구조로 표시
- 공통 검색: 전역 검색과 모듈별 고급 검색을 동일한 필터 문법으로 설계
- 공통 상태 배지: `New`, `In Review`, `Pending Approval`, `Active`, `Closed`, `Overdue`
- 공통 태스크 UI: 모든 객체에 태스크, 담당자, 마감일, 우선순위 연결
- 공통 활동 로그: 생성, 수정, 공유, 승인, 다운로드, 댓글, 상태 변경 기록
- 공통 권한 UI: DMS뿐 아니라 사건, 고객, 청구, HR에도 동일한 권한 패턴 적용
- 공통 승인 UI: 비용 승인, 문서 승인, 청구 승인, 계약 승인에 같은 승인 컴포넌트 사용

## CRM 모듈 계획

CRM은 `18-twilio-crm-template`을 1순위 기준으로 두고, `21-crm-customers-deals-tasks-filtering`의 고객/거래/태스크 구조를 결합합니다.

### 핵심 화면

- Intake Inbox: 전화, 이메일, 웹폼, 상담 신청 통합 수신함
- Lead / Prospect Detail: 잠재 의뢰인 상세, 상담 메모, 이해상충 체크 상태
- Client Conversion: 리드에서 의뢰인과 사건으로 전환
- Pipeline: 상담 예정, 검토 중, 수임 가능, 계약 발송, 수임 완료
- Communication Panel: 통화, SMS, 이메일, 상담 기록
- Follow-up Tasks: 다음 연락, 자료 요청, 계약서 발송, 내부 검토 태스크

### 레퍼런스 적용

- `18`에서 가져올 것: 고객 상태, 계정 상세, 통화/SMS/이메일 채널, 콜 로그, 트랜스크립트, 상담 흐름
- `21`에서 가져올 것: 고객, 거래, 태스크, 약속, 활동, 필터링, 빈 상태
- Law Firm OS 변환: `Deal`을 `Matter Intake` 또는 `Engagement`로 바꾸고, 고객 전환 흐름을 `Lead -> Client -> Matter`로 재정의

## ERP 모듈 계획

ERP는 `06-erp-b2b-design-kit`을 중심으로 삼습니다. 원본의 제조/재고 도메인은 그대로 쓰지 않고, 구조를 법무법인 운영, 청구, 비용, 승인, 리소스 배정으로 변환합니다.

### 핵심 화면

- Firm Dashboard: 매출, 미수금, 사건 수, 청구 가능 시간, 파트너별 실적
- Billing: 청구서, 시간 기록, 비용, 할인, 세금, 결제 상태
- Matter Operations: 사건별 예산, 담당자, 일정, 리소스 배정
- Approvals: 비용 승인, 청구 승인, 계약 승인, 문서 승인
- Requests: 내부 요청, 문서 요청, 리서치 요청, 업무 배정
- Reports: 사건 수익성, 변호사 가동률, 고객별 매출, 미청구 시간

### 레퍼런스 적용

- `06`에서 가져올 것: 주문, 계획, 예측, 요청, 알림, 운영 플로우, 고밀도 업무 대시보드
- `05`에서 가져올 것: 프로젝트성 운영, 현장/자원 관리, 일정과 자원 배정 감각
- Law Firm OS 변환: 제조의 `Order`, `Production`, `Inventory Request`를 각각 `Matter Request`, `Billing Cycle`, `Resource Request`로 재해석

## DMS 모듈 계획

DMS는 `15-enterprise-document-management-dashboard`를 메인 기준으로 삼고, `17-document-management-system-ui`의 고급 검색, 메타데이터, 활동 로그 구조를 결합합니다.

### 핵심 화면

- Document Repository: 사건별, 고객별, 유형별 문서 보관함
- Document Detail: 메타데이터, 관련 사건, 작성자, 권한, 상태
- Viewer: 문서 보기, 주석, 변경 이력, 첨부, 관련 문서
- Upload Flow: 드래그 업로드, 사건 연결, 태그, 권한 설정
- Permissions: 파트너, 변호사, 스태프, 외부 고객 권한
- Version History: 버전 비교, 복원, 승인 이력
- Audit Trail: 열람, 다운로드, 공유, 수정, 삭제 로그
- Advanced Search: 고객, 사건, 문서 유형, 작성자, 날짜, 태그 검색

### 레퍼런스 적용

- `15`에서 가져올 것: 권한, 공유, 버전 히스토리, 역할, 감사 추적, 업로드, 삭제
- `17`에서 가져올 것: 고급 검색, 메타데이터 편집, 활동 로그, 진단/설정 화면
- Law Firm OS 변환: 문서가 단독 객체가 아니라 항상 `Client`, `Matter`, `Task`, `Invoice`와 연결되게 설계

## HR 모듈 계획

HR은 `11-hr-management-ats-tool`을 주 기준으로 삼고, `10-hr-management-dashboard-uikit`의 시각적 완성도와 대시보드 패턴을 결합합니다.

### 핵심 화면

- People Directory: 변호사, 파트너, 스태프, 외부 협력자 목록
- Profile: 전문 분야, 소속팀, 사건 배정, 자격, 경력, 성과
- Recruiting / ATS: 후보자, 면접, 평가, 오퍼
- Workload: 구성원별 사건 수, 업무량, 청구 가능 시간
- Time Off: 휴가, 재택, 교육, 출장
- Performance: 평가, 목표, 리뷰, 승진 자료

### 레퍼런스 적용

- `11`에서 가져올 것: 후보자 프로필, ATS 흐름, 인증, 프로필형 상세 화면
- `10`에서 가져올 것: HR 대시보드 시각 완성도, KPI 카드, 컴포넌트 구성
- Law Firm OS 변환: 단순 HR이 아니라 사건 배정, 전문 분야, 청구 가능 시간, 워크로드와 연결된 인력 운영 모듈로 설계

## 통합 객체 구조

Law Firm OS는 모듈 간 연결성이 제품의 핵심입니다. 다음 객체는 전 모듈에서 공통으로 참조되어야 합니다.

| 객체 | 연결 모듈 | 역할 |
|---|---|---|
| Client | CRM, DMS, ERP | 의뢰인, 상담 이력, 사건, 청구, 문서의 기준 |
| Matter | CRM, DMS, ERP, HR | 사건, 담당자, 문서, 청구, 태스크, 일정의 중심 |
| Document | DMS, CRM, ERP | 계약서, 소송 문서, 자문 문서, 증빙, 버전, 권한 |
| Invoice | ERP, CRM, DMS | 청구서, 비용, 결제, 관련 사건과 문서 |
| Person | HR, ERP, CRM | 변호사, 스태프, 담당자, 승인자, 후보자 |
| Task | CRM, DMS, ERP, HR | 후속 조치, 문서 요청, 승인, 내부 업무 |

## 대표 통합 플로우

### 상담 접수에서 사건 생성까지

1. CRM Intake Inbox로 전화, 이메일, 웹폼 상담 신청이 들어온다.
2. Prospect Detail에서 상담 메모와 이해상충 체크를 기록한다.
3. 수임 가능성이 확인되면 Client와 Matter를 생성한다.
4. Matter 화면에서 담당자, 문서 폴더, 초기 태스크, 청구 조건이 자동 생성된다.
5. DMS에 계약서와 위임장 템플릿이 연결된다.
6. ERP에서 초기 비용/착수금 청구 플로우가 시작된다.

### 문서 승인과 청구 연결

1. DMS에 문서를 업로드하고 Matter에 연결한다.
2. 문서 권한과 승인자를 지정한다.
3. 승인 요청이 Task로 생성되고 담당자에게 알림이 간다.
4. 승인 완료 후 ERP 청구 항목 또는 산출물 상태에 반영된다.
5. 모든 열람, 수정, 다운로드, 승인 기록은 Audit Trail에 남는다.

### 인력 배정과 사건 운영

1. HR People Directory에서 전문 분야와 가용 시간을 확인한다.
2. ERP Matter Operations에서 사건에 변호사와 스태프를 배정한다.
3. 구성원별 Workload에 사건 수, 청구 가능 시간, 마감 일정이 반영된다.
4. Matter 상세에서 담당자, 태스크, 문서, 청구 상태를 함께 확인한다.

## 정보 구조 초안

```text
Law Firm OS
  Dashboard
  CRM
    Intake Inbox
    Leads
    Clients
    Pipeline
    Communications
  Matters
    Matter List
    Matter Detail
    Tasks
    Calendar
  Documents
    Repository
    Viewer
    Upload
    Permissions
    Version History
    Audit Trail
  Billing
    Time Entries
    Expenses
    Invoices
    Payments
    Approvals
  HR
    People
    Recruiting
    Workload
    Time Off
    Performance
  Reports
    Firm Performance
    Matter Profitability
    Client Revenue
    Utilization
  Settings
    Roles
    Permissions
    Templates
    Integrations
    Audit Logs
```

## UI 일관성 원칙

- 같은 객체는 어느 모듈에서 열어도 같은 상세 패널 구조를 가진다.
- 테이블, 필터, 검색, 정렬, 저장된 뷰는 모든 모듈에서 같은 방식으로 동작한다.
- 상태 배지와 승인 상태는 전 모듈에서 같은 색상과 문구를 사용한다.
- 권한과 감사 로그는 DMS 전용 기능이 아니라 Law Firm OS 전체의 공통 신뢰 레이어로 둔다.
- 대시보드는 화려한 마케팅형 화면보다 반복 업무자가 빠르게 스캔할 수 있는 운영형 화면으로 설계한다.
- 문서, 사건, 청구, 태스크 간 이동은 항상 컨텍스트를 유지한다.

## 설계 진행 순서

1. 공통 디자인 시스템 정리: 컬러, 타이포, 테이블, 폼, 사이드바, 상태 배지
2. 공통 객체 모델 화면 설계: Client, Matter, Document, Task, Invoice, Person
3. CRM 설계: 상담 접수부터 사건 전환까지
4. DMS 설계: 사건 중심 문서 저장, 권한, 버전, 감사 로그
5. ERP 설계: 청구, 비용, 승인, 리포트
6. HR 설계: 구성원, 배정, 채용, 워크로드
7. 통합 대시보드와 글로벌 검색 설계

## 최종 추천 조합

Law Firm OS의 UI 방향은 `02`로 통일성을 만들고, `18 + 21`로 CRM 흐름을 잡고, `15 + 17`로 DMS 신뢰성을 만들고, `06`으로 ERP 운영 밀도를 만들고, `11 + 10`으로 HR을 붙이는 조합이 가장 강합니다.

이 조합은 상담 접수, 의뢰인/리드 관리, 사건 전환, 문서 보관/권한/버전/감사, 청구/비용/운영 요청, 인력/채용 관리까지 하나의 제품 언어로 묶는 데 적합합니다.

