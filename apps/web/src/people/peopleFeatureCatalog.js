export const PEOPLE_FEATURE_STATES = {
  active: {
    label: "사용 중",
    badge: null,
    description: "현재 화면에서 확인할 수 있는 기능입니다."
  },
  setup_required: {
    label: "설정 필요",
    badge: "설정",
    description: "운영 기준과 기본값을 정한 뒤 사용할 기능입니다."
  },
  integration_required: {
    label: "연동 필요",
    badge: "연동",
    description: "외부 서비스 또는 파일 연동 증거가 있어야 사용할 기능입니다."
  },
  audit_required: {
    label: "검토 필요",
    badge: "검토",
    description: "권한, 개인정보, 근로기준 검토 후 열어야 하는 기능입니다."
  }
};

export const PEOPLE_FEATURE_GROUPS = [
  {
    label: "관리",
    icon: "users",
    children: [
      {
        label: "구성원",
        section: "people-members",
        icon: "users",
        state: "active",
        count: "9",
        active: true,
        summary: "구성원 명단과 재직 상태를 확인합니다.",
        capabilities: ["구성원 명단", "재직 상태", "직위", "소속", "부서", "이메일"]
      },
      {
        label: "조직",
        section: "people-org-chart",
        icon: "clipboard",
        state: "active",
        summary: "구성원을 조직 단위로 묶어 확인합니다.",
        capabilities: ["조직별 구성원", "조직 그룹", "소속 기준 보기"]
      },
      {
        label: "직무/역할",
        section: "people-role",
        icon: "shield",
        state: "setup_required",
        summary: "직무와 내부 역할 기준을 구성원 정보에 연결합니다.",
        capabilities: ["직무", "역할", "직책", "담당 업무"]
      },
      {
        label: "근로정보",
        section: "people-work-profile",
        icon: "file",
        state: "setup_required",
        summary: "근무형태와 정산에 쓰는 구성원별 근로 기준을 관리합니다.",
        capabilities: ["근무형태", "입사일", "소정근로시간", "소정근로요일", "주휴요일"]
      },
      {
        label: "구성원 등록",
        section: "people-recruiting",
        icon: "users",
        state: "active",
        summary: "신규 구성원 등록과 후보자 정보를 확인합니다.",
        capabilities: ["신규 구성원 등록", "후보자 정보", "등록 상태"]
      },
      {
        label: "입퇴사 관리",
        section: "people-lifecycle",
        icon: "clipboard",
        state: "active",
        summary: "입사 준비와 퇴사 절차를 관리합니다.",
        capabilities: ["입사 업무", "퇴사 업무", "담당자", "마감일", "완료 처리"]
      }
    ]
  },
  {
    label: "근무일정",
    icon: "clipboard",
    children: [
      {
        label: "근무표",
        section: "people-work-schedule",
        icon: "clipboard",
        state: "setup_required",
        summary: "구성원별 근무일정을 생성하고 변경합니다.",
        capabilities: ["근무일정 생성", "근무일정 수정", "근무일정 삭제", "스케줄"]
      },
      {
        label: "외부일정",
        section: "people-work-schedule-external",
        icon: "clipboard",
        state: "setup_required",
        summary: "법원, 검찰, 우체국, 세무서, 관청 방문 일정을 근무일정 안에서 관리합니다.",
        capabilities: ["법원 판결선고 청취", "검찰 기록복사", "우체국 내용증명 발송", "세무서 방문", "관청 방문"]
      },
      {
        label: "근무유형",
        section: "people-work-type",
        icon: "settings",
        state: "setup_required",
        summary: "정규근무, 유연근무, 외근 등 근무유형을 정의합니다.",
        capabilities: ["근무유형", "근무지", "휴게시간", "모바일 자동화 안내"]
      },
      {
        label: "현재 근무 상황 조회",
        section: "people-current-work-status",
        icon: "clipboard",
        state: "setup_required",
        summary: "현재 근무 중인 구성원과 외부일정 수행 상태를 확인합니다.",
        capabilities: ["현재 근무 상황 조회", "조직 필터", "근무지 상태"]
      },
      {
        label: "근무일정 확정",
        section: "people-work-schedule-lock",
        icon: "shield",
        state: "audit_required",
        summary: "정산 전 근무일정을 확정하고 이후 변경을 통제합니다.",
        capabilities: ["근무일정 확정", "변경 요청", "관리자 승인"]
      }
    ]
  },
  {
    label: "출퇴근기록",
    icon: "clipboard",
    children: [
      {
        label: "출근/퇴근 기록",
        section: "people-attendance-records",
        icon: "clipboard",
        state: "setup_required",
        summary: "출근과 퇴근 기록을 조회합니다.",
        capabilities: ["출근 기록", "퇴근 기록", "출퇴근기록 관리", "출퇴근기록 엑셀 다운로드"]
      },
      {
        label: "무일정 근무 출퇴근",
        section: "people-unscheduled-attendance",
        icon: "clipboard",
        state: "audit_required",
        summary: "근무일정이 없는 날의 출퇴근을 예외 기록으로 관리합니다.",
        capabilities: ["무일정 근무 출퇴근", "사유", "관리자 확인"]
      },
      {
        label: "출퇴근기록 엑셀 업로드",
        section: "people-attendance-upload",
        icon: "file",
        state: "setup_required",
        summary: "외부 출퇴근 기록을 엑셀로 반영합니다.",
        capabilities: ["엑셀 업로드", "검증 결과", "오류 행 확인"]
      },
      {
        label: "휴게시간 기록",
        section: "people-break-records",
        icon: "clipboard",
        state: "setup_required",
        summary: "출퇴근기록에 휴게시간을 함께 기록합니다.",
        capabilities: ["휴게시간 기록", "휴게시간 관리 옵션", "자동 휴게시간"]
      },
      {
        label: "출퇴근 누락 알림",
        section: "people-attendance-missing-alerts",
        icon: "bell",
        state: "setup_required",
        summary: "출근 또는 퇴근 누락 알림을 보냅니다.",
        capabilities: ["출퇴근 누락 알림 메일", "근태 관련 알림", "알림 대상"]
      },
      {
        label: "출퇴근기록 확정",
        section: "people-attendance-lock",
        icon: "shield",
        state: "audit_required",
        summary: "정산 전 출퇴근기록을 확정합니다.",
        capabilities: ["출퇴근기록 확정", "확정 취소", "변경 이력"]
      },
      {
        label: "출퇴근 인증 방식",
        section: "people-attendance-verification",
        icon: "shield",
        state: "setup_required",
        summary: "모바일, 위치, 기기 기준의 출퇴근 인증 방식을 설정합니다.",
        capabilities: ["출퇴근 인증 방식", "기기 변경 요청", "근무지 외 출퇴근 요청"]
      }
    ]
  },
  {
    label: "휴가",
    icon: "clipboard",
    children: [
      {
        label: "휴가관리",
        section: "people-leave",
        icon: "clipboard",
        state: "active",
        summary: "구성원의 휴가 잔여일과 신청 내역을 확인합니다.",
        capabilities: ["휴가 사용 내역", "휴가 신청", "관리자 승인"]
      },
      {
        label: "휴가 그룹/유형",
        section: "people-leave-types",
        icon: "settings",
        state: "setup_required",
        summary: "휴가 그룹과 유형을 설정합니다.",
        capabilities: ["휴가 그룹", "휴가 유형", "조직별 휴가 기준"]
      },
      {
        label: "휴가 자동 발생",
        section: "people-leave-accrual-auto",
        icon: "settings",
        state: "setup_required",
        summary: "규칙 기반으로 휴가를 자동 발생시킵니다.",
        capabilities: ["규칙 기반 휴가 자동 발생", "휴가 일자 자동 지정", "월별 조회"]
      },
      {
        label: "휴가 수동 발생",
        section: "people-leave-accrual-manual",
        icon: "file",
        state: "setup_required",
        summary: "관리자가 휴가를 직접 발생시킵니다.",
        capabilities: ["휴가 수동 발생", "휴가 추가", "보상휴가 발생"]
      },
      {
        label: "휴가 사용 내역",
        section: "people-leave-usage",
        icon: "clipboard",
        state: "setup_required",
        summary: "휴가 사용 내역을 목록, 유형, 월별로 조회합니다.",
        capabilities: ["휴가 사용 내역 목록", "유형별 조회", "월별 조회", "휴가 엑셀 다운로드"]
      }
    ]
  },
  {
    label: "요청/전자결재",
    icon: "shield",
    children: [
      {
        label: "요청 관리",
        section: "people-approvals",
        icon: "shield",
        state: "active",
        count: "5",
        summary: "구성원 요청과 관리자 결재를 처리합니다.",
        capabilities: ["요청 관리", "단일 승인", "순차 승인", "상황별 상세 승인"]
      },
      {
        label: "승인 규칙",
        section: "people-policy",
        icon: "file",
        state: "active",
        summary: "요청 승인권자와 승인 규칙을 설정합니다.",
        capabilities: ["요청 승인권자", "승인 규칙", "조직/직무별 승인 규칙", "자동승인"]
      },
      {
        label: "커스텀 요청",
        section: "people-custom-requests",
        icon: "file",
        state: "setup_required",
        summary: "로펌 운영에 맞는 요청 유형을 추가합니다.",
        capabilities: ["커스텀 요청 유형", "커스텀 요청", "파일 첨부 설정"]
      },
      {
        label: "근무일정 요청",
        section: "people-work-schedule-requests",
        icon: "clipboard",
        state: "setup_required",
        summary: "근무일정 생성, 수정, 삭제 요청을 처리합니다.",
        capabilities: ["근무일정 생성 요청", "근무일정 수정 요청", "근무일정 삭제 요청"]
      },
      {
        label: "근무기록 요청",
        section: "people-attendance-requests",
        icon: "clipboard",
        state: "setup_required",
        summary: "출퇴근기록 생성, 수정, 삭제 요청을 처리합니다.",
        capabilities: ["출퇴근기록 생성 요청", "출퇴근기록 수정 요청", "출퇴근기록 삭제 요청"]
      },
      {
        label: "휴가 요청",
        section: "people-leave-requests",
        icon: "clipboard",
        state: "active",
        summary: "휴가 생성, 수정, 삭제 요청을 처리합니다.",
        capabilities: ["휴가 생성 요청", "휴가 수정 요청", "휴가 삭제 요청"]
      },
      {
        label: "증명서 발급 요청",
        section: "people-certificates",
        icon: "file",
        state: "active",
        summary: "재직증명서와 경력증명서 발급 요청을 처리합니다.",
        capabilities: ["증명서 발급 요청", "재직증명서", "경력증명서", "발급 이력"]
      },
      {
        label: "비용 처리 요청",
        section: "people-expense-requests",
        icon: "file",
        state: "integration_required",
        summary: "외부일정 수행 비용과 일반 비용 요청을 관리합니다.",
        capabilities: ["비용 처리 요청", "영수증 첨부", "정산 연결"]
      },
      {
        label: "강제 승인/거절",
        section: "people-force-approval",
        icon: "shield",
        state: "audit_required",
        summary: "최고관리자 강제 승인 또는 거절을 별도 감사 대상으로 기록합니다.",
        capabilities: ["최고관리자 강제 승인", "최고관리자 강제 거절", "사유 기록"]
      }
    ]
  },
  {
    label: "리포트",
    icon: "clipboard",
    children: [
      {
        label: "실시간 리포트",
        section: "people-analytics",
        icon: "clipboard",
        state: "active",
        summary: "근무, 휴가, 요청 데이터를 리포트로 확인합니다.",
        capabilities: ["실시간 리포트", "조직 필터", "조회 기간별 근무 데이터"]
      },
      {
        label: "리포트 스냅샷",
        section: "people-report-snapshots",
        icon: "file",
        state: "setup_required",
        summary: "특정 시점의 리포트 상태를 저장합니다.",
        capabilities: ["리포트 스냅샷", "스냅샷 변수", "급여 파일 데이터 변수 반영"]
      },
      {
        label: "리포트 항목",
        section: "people-report-items",
        icon: "settings",
        state: "setup_required",
        summary: "표준 리포트 항목과 커스텀 항목을 관리합니다.",
        capabilities: ["리포트 항목 이해", "표준화 규칙", "커스텀 리포트 항목"]
      },
      {
        label: "주의 필요 항목",
        section: "people-report-attention",
        icon: "bell",
        state: "audit_required",
        summary: "근태, 휴가, 정산에서 확인이 필요한 항목을 모읍니다.",
        capabilities: ["주의 필요 리포트 항목", "리포트 엑셀 다운로드", "담당자 확인"]
      }
    ]
  },
  {
    label: "마감 및 급여",
    icon: "file",
    children: [
      {
        label: "마감 관리",
        section: "people-close",
        icon: "shield",
        state: "audit_required",
        summary: "급여정산 전 근무기록과 휴가 내역을 마감합니다.",
        capabilities: ["마감 관리", "마감 상태", "마감 취소"]
      },
      {
        label: "급여정산",
        section: "people-payroll",
        icon: "file",
        state: "active",
        summary: "근로정보 기반 급여정산 미리보기와 승인 기록을 관리합니다.",
        capabilities: ["급여정산", "근로정보 기반 정산", "급여 파일 생성"]
      },
      {
        label: "급여명세서",
        section: "people-pay-statement",
        icon: "file",
        state: "integration_required",
        summary: "급여명세서 전송과 보관은 외부 급여 서비스 연동 후 사용합니다.",
        capabilities: ["급여명세서", "메시지 전송", "외부 급여 서비스"]
      },
      {
        label: "수당/최저임금",
        section: "people-pay-rules",
        icon: "settings",
        state: "audit_required",
        summary: "연장, 야간, 휴일, 주휴, 최저임금 기준을 검토합니다.",
        capabilities: ["연장근로수당", "야간근로수당", "휴일근로수당", "주휴수당", "최저임금"]
      },
      {
        label: "근로정보 기준",
        section: "people-pay-work-profile",
        icon: "settings",
        state: "setup_required",
        summary: "급여정산에 필요한 근로 기준값을 설정합니다.",
        capabilities: ["근로자의 날", "시급 적용시점", "소정근로요일", "주휴요일"]
      }
    ]
  },
  {
    label: "메시지",
    icon: "bell",
    children: [
      {
        label: "메시지 전송",
        section: "people-message-send",
        icon: "mail",
        state: "integration_required",
        summary: "구성원에게 메시지를 전송합니다.",
        capabilities: ["메시지 전송", "대상 선택", "전송 기록"]
      },
      {
        label: "메시지 자동화",
        section: "people-message-automation",
        icon: "settings",
        state: "setup_required",
        summary: "근태, 요청, 급여 관련 알림 규칙을 설정합니다.",
        capabilities: ["메시지 자동화 규칙", "근태 관련 알림", "미승인 요청 알림"]
      },
      {
        label: "메시지 템플릿",
        section: "people-message-templates",
        icon: "file",
        state: "setup_required",
        summary: "반복 발송하는 메시지 문구를 관리합니다.",
        capabilities: ["메시지 템플릿", "리포트 스냅샷 변수", "급여 파일 데이터 변수"]
      },
      {
        label: "공지사항",
        section: "people-notices",
        icon: "bell",
        state: "setup_required",
        summary: "사내 공지사항을 작성하고 발송합니다.",
        capabilities: ["사내 공지사항", "조직관리자 대상 부서 관리 안내", "읽음 상태"]
      }
    ]
  },
  {
    label: "전자계약",
    icon: "file",
    children: [
      {
        label: "전자계약 전송",
        section: "people-econtract-send",
        icon: "file",
        state: "integration_required",
        summary: "근로계약서 등 전자계약을 전송합니다.",
        capabilities: ["전자계약 전송", "전자계약 요청", "서명 요청 구성원 선택"]
      },
      {
        label: "전자계약 템플릿",
        section: "people-econtract-templates",
        icon: "file",
        state: "integration_required",
        summary: "전자계약 템플릿과 문서 연결값을 관리합니다.",
        capabilities: ["전자계약 템플릿 관리", "문서 내용 연결", "데이터 보정"]
      },
      {
        label: "서명 진행 상태",
        section: "people-econtract-status",
        icon: "clipboard",
        state: "integration_required",
        summary: "전자계약 문서의 서명 차수와 진행 상태를 확인합니다.",
        capabilities: ["구성원 서명 차수", "서명 유효기간", "문서 진행 상태"]
      },
      {
        label: "근로계약서",
        section: "people-employment-contracts",
        icon: "file",
        state: "integration_required",
        summary: "근로계약서 전송과 서명 완료본을 관리합니다.",
        capabilities: ["근로계약서", "글로싸인/모두싸인 연동", "완료본 보관"]
      },
      {
        label: "연차휴가 사용 촉진 문서",
        section: "people-annual-leave-notices",
        icon: "file",
        state: "audit_required",
        summary: "연차휴가 사용 촉진 문서를 생성하고 발송합니다.",
        capabilities: ["연차휴가 사용 촉진 문서", "대상자", "발송 이력"]
      }
    ]
  },
  {
    label: "회사 설정",
    icon: "settings",
    children: [
      {
        label: "일반",
        section: "people-company-general",
        icon: "settings",
        state: "setup_required",
        summary: "회사 기본 정보를 설정합니다.",
        capabilities: ["회사명", "국가", "회사 로고", "관리 단위", "1주 시작 요일", "사내 방침"]
      },
      {
        label: "알림",
        section: "people-company-notifications",
        icon: "bell",
        state: "setup_required",
        summary: "출근, 퇴근, 요청, 급여 관련 알림을 설정합니다.",
        capabilities: ["출근 알림", "퇴근 알림", "근태 알림", "요청 알림"]
      },
      {
        label: "권한",
        section: "people-admin",
        icon: "shield",
        state: "active",
        summary: "조직관리자와 구성원 권한 범위를 설정합니다.",
        capabilities: ["조직관리자 권한 범위", "구성원 권한 범위", "감사 기록"]
      },
      {
        label: "조직",
        section: "people-company-organization",
        icon: "clipboard",
        state: "setup_required",
        summary: "조직 코드와 상위 조직을 설정합니다. 지점은 기본 비활성 상태로 둡니다.",
        capabilities: ["조직 코드", "상위 조직", "지점 비활성", "조직관리자"]
      },
      {
        label: "구성원",
        section: "people-company-members",
        icon: "users",
        state: "active",
        summary: "사원번호와 구성원 기본값을 설정합니다.",
        capabilities: ["사원번호", "구성원 기본값", "구성원 필드"]
      },
      {
        label: "근무일정",
        section: "people-company-work-schedule",
        icon: "settings",
        state: "setup_required",
        summary: "근무일정 관리 옵션을 설정합니다.",
        capabilities: ["근무일정 관리 세부 옵션", "스케줄", "외부일정"]
      },
      {
        label: "출퇴근기록",
        section: "people-company-attendance",
        icon: "settings",
        state: "setup_required",
        summary: "출퇴근기록 관리 옵션을 설정합니다.",
        capabilities: ["기록 관리 옵션", "인증 방식", "엑셀 업로드"]
      },
      {
        label: "휴게시간",
        section: "people-company-breaks",
        icon: "settings",
        state: "setup_required",
        summary: "휴게시간 기준과 자동 적용 여부를 설정합니다.",
        capabilities: ["휴게시간", "자동 휴게", "휴게시간 기록"]
      },
      {
        label: "휴가",
        section: "people-company-leave",
        icon: "settings",
        state: "setup_required",
        summary: "휴가 발생과 사용 기준을 설정합니다.",
        capabilities: ["휴가", "휴가 그룹", "휴가 유형", "자동 발생"]
      },
      {
        label: "요청",
        section: "people-company-requests",
        icon: "settings",
        state: "setup_required",
        summary: "요청 유형과 승인 기준을 설정합니다.",
        capabilities: ["요청", "승인 규칙", "파일 첨부 설정"]
      },
      {
        label: "회사방침",
        section: "people-documents",
        icon: "file",
        state: "active",
        summary: "회사방침과 취업규칙성 문서를 관리합니다.",
        capabilities: ["회사방침", "사내 방침", "문서 버전", "공개 범위"]
      },
      {
        label: "인사기록",
        section: "people-audit",
        icon: "clipboard",
        state: "active",
        summary: "구성원 정보와 조직 변경 이력을 확인합니다.",
        capabilities: ["인사기록", "조직 변경 이력", "보안 확인"]
      },
      {
        label: "메시지",
        section: "people-company-messages",
        icon: "settings",
        state: "setup_required",
        summary: "메시지 발송 기본값을 설정합니다.",
        capabilities: ["메시지", "메시지 템플릿", "자동화 규칙"]
      },
      {
        label: "전자계약",
        section: "people-company-econtract",
        icon: "settings",
        state: "integration_required",
        summary: "전자계약 서비스와 템플릿 기본값을 설정합니다.",
        capabilities: ["전자계약", "글로싸인/모두싸인 연동", "서명 유효기간"]
      },
      {
        label: "리포트",
        section: "people-company-reports",
        icon: "settings",
        state: "setup_required",
        summary: "리포트 항목과 다운로드 옵션을 설정합니다.",
        capabilities: ["리포트", "리포트 엑셀 다운로드", "조직 필터"]
      },
      {
        label: "급여",
        section: "people-company-payroll",
        icon: "settings",
        state: "integration_required",
        summary: "급여정산 기준과 외부 급여 서비스 연결을 설정합니다.",
        capabilities: ["급여", "급여정산", "급여명세서", "외부 급여 서비스"]
      },
      {
        label: "보안",
        section: "people-company-security",
        icon: "shield",
        state: "audit_required",
        summary: "인사정보 접근과 보안 확인 기준을 설정합니다.",
        capabilities: ["보안", "접근 기록", "2단계 확인", "권한 검토"]
      },
      {
        label: "고급 옵션",
        section: "people-company-advanced",
        icon: "settings",
        state: "audit_required",
        summary: "운영 리스크가 있는 고급 옵션을 검토 후 설정합니다.",
        capabilities: ["고급 옵션", "데이터 보정", "강제 승인"]
      },
      {
        label: "지원",
        section: "people-company-support",
        icon: "bell",
        state: "setup_required",
        summary: "도움말과 지원 요청 정보를 관리합니다.",
        capabilities: ["지원", "도움말", "문의"]
      },
      {
        label: "결제",
        section: "people-company-billing",
        icon: "file",
        state: "integration_required",
        summary: "서비스 결제 정보는 별도 결제 권한으로 관리합니다.",
        capabilities: ["결제", "청구 정보", "결제 권한"]
      },
      {
        label: "연동",
        section: "people-company-integrations",
        icon: "settings",
        state: "integration_required",
        summary: "외부 서비스 연동 상태와 연결 설정을 관리합니다.",
        capabilities: ["연동", "전자계약 연동", "급여 연동", "메시지 연동"]
      }
    ]
  }
];

export const PEOPLE_FEATURE_ITEMS = PEOPLE_FEATURE_GROUPS.flatMap((group) =>
  group.children.map((item) => ({
    ...item,
    groupLabel: group.label,
    stateMeta: PEOPLE_FEATURE_STATES[item.state] ?? PEOPLE_FEATURE_STATES.setup_required,
    badge: item.count ?? (PEOPLE_FEATURE_STATES[item.state] ?? PEOPLE_FEATURE_STATES.setup_required).badge
  }))
);

export const PEOPLE_SECTION_IDS = PEOPLE_FEATURE_ITEMS.map((item) => item.section);

export function getPeopleFeatureBySection(section) {
  return PEOPLE_FEATURE_ITEMS.find((item) => item.section === section) ?? null;
}

export const peopleNavigationGroups = PEOPLE_FEATURE_GROUPS.map((group) => ({
  ...group,
  children: group.children.map((item) => ({
    ...item,
    badge: item.count ?? (PEOPLE_FEATURE_STATES[item.state] ?? PEOPLE_FEATURE_STATES.setup_required).badge
  }))
}));
