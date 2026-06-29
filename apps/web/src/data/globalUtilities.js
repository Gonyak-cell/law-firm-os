import {
  Bell,
  CalendarDays,
  ClipboardList,
  Database,
  FileCheck2,
  FileText,
  FolderOpen,
  LayoutDashboard,
  Mail,
  Plus,
  ReceiptText,
  Settings,
  ShieldCheck
} from "lucide-react";

function legacy(view, section) {
  return { view, section };
}

export const globalUtilityItems = [
  {
    id: "messages",
    label: "메시지",
    localLabel: "전송·자동화",
    icon: Mail,
    defaultSection: "messages-send",
    description: "도메인별 메시지, 공지, 자동화, 템플릿을 한 곳에서 관리합니다.",
    sections: [
      {
        id: "messages-send",
        label: "메시지 전송",
        source: "People",
        icon: Mail,
        legacyRoutes: [legacy("people", "people-message-send")]
      },
      {
        id: "messages-automation",
        label: "메시지 자동화",
        source: "People",
        icon: Settings,
        legacyRoutes: [legacy("people", "people-message-automation"), legacy("people", "people-company-messages")]
      },
      {
        id: "messages-templates",
        label: "메시지 템플릿",
        source: "People",
        icon: FileText,
        legacyRoutes: [legacy("people", "people-message-templates")]
      },
      {
        id: "messages-notices",
        label: "공지사항",
        source: "People",
        icon: Bell,
        legacyRoutes: [legacy("people", "people-notices")]
      },
      {
        id: "messages-matter-channel",
        label: "사건 이메일·메시지",
        source: "Matter",
        icon: FileText,
        badge: "2"
      }
    ]
  },
  {
    id: "notifications",
    label: "알림",
    localLabel: "센터·설정",
    icon: Bell,
    defaultSection: "notifications-center",
    description: "상단 알림 드로어, 근태 알림, 회사 알림 설정을 전역 알림 센터로 묶습니다.",
    sections: [
      {
        id: "notifications-center",
        label: "알림 센터",
        source: "Topbar",
        icon: Bell,
        badge: "3"
      },
      {
        id: "notifications-attendance-missing",
        label: "출퇴근 누락 알림",
        source: "People",
        icon: Bell,
        legacyRoutes: [legacy("people", "people-attendance-missing-alerts")]
      },
      {
        id: "notifications-company",
        label: "회사 알림 설정",
        source: "Settings",
        icon: Settings,
        legacyRoutes: [legacy("people", "people-company-notifications")]
      }
    ]
  },
  {
    id: "requests",
    label: "요청함",
    localLabel: "승인·증명서",
    icon: ShieldCheck,
    defaultSection: "requests-inbox",
    description: "승인 대기, 비용, 증명서, 강제 승인/거절을 하나의 요청함으로 모읍니다.",
    sections: [
      {
        id: "requests-inbox",
        label: "요청 관리",
        source: "People",
        icon: ShieldCheck,
        badge: "5",
        legacyRoutes: [legacy("people", "people-approvals")]
      },
      {
        id: "requests-review-inbox",
        label: "승인 대기함",
        source: "Home",
        icon: ClipboardList,
        badge: "3",
        legacyRoutes: [legacy("home", "home-review")]
      },
      {
        id: "requests-force-decision",
        label: "강제 승인/거절",
        source: "People",
        icon: ShieldCheck,
        state: "audit_required",
        legacyRoutes: [legacy("people", "people-force-approval")]
      },
      {
        id: "requests-expenses",
        label: "비용 처리 요청",
        source: "People",
        icon: ReceiptText,
        legacyRoutes: [legacy("people", "people-expense-requests")]
      },
      {
        id: "requests-certificates",
        label: "증명서 발급 요청",
        source: "People",
        icon: FileCheck2,
        legacyRoutes: [legacy("people", "people-certificates")]
      },
      {
        id: "requests-leave",
        label: "휴가 요청",
        source: "People",
        icon: ClipboardList,
        legacyRoutes: [legacy("people", "people-leave-requests")]
      },
      {
        id: "requests-attendance",
        label: "근무기록 요청",
        source: "People",
        icon: ClipboardList,
        legacyRoutes: [legacy("people", "people-attendance-requests"), legacy("people", "people-work-schedule-requests")]
      },
      {
        id: "requests-custom",
        label: "커스텀 요청",
        source: "People",
        icon: FileText,
        legacyRoutes: [legacy("people", "people-custom-requests")]
      }
    ]
  },
  {
    id: "reports",
    label: "보고서",
    localLabel: "분석·스냅샷",
    icon: LayoutDashboard,
    defaultSection: "reports-home-dashboard",
    description: "Home, People, Client, Matter의 분석과 보고서를 전역 리포트 허브에서 확인합니다.",
    sections: [
      {
        id: "reports-home-dashboard",
        label: "Home 대시보드",
        source: "Home",
        icon: LayoutDashboard,
        legacyRoutes: [legacy("home", "home-dashboard")]
      },
      {
        id: "reports-people-live",
        label: "People 실시간 리포트",
        source: "People",
        icon: ClipboardList,
        legacyRoutes: [legacy("people", "people-analytics")]
      },
      {
        id: "reports-people-snapshots",
        label: "People 리포트 스냅샷",
        source: "People",
        icon: FileText,
        legacyRoutes: [legacy("people", "people-report-snapshots")]
      },
      {
        id: "reports-people-items",
        label: "People 리포트 항목",
        source: "People",
        icon: Settings,
        legacyRoutes: [legacy("people", "people-report-items")]
      },
      {
        id: "reports-people-attention",
        label: "주의 필요 항목",
        source: "People",
        icon: Bell,
        legacyRoutes: [legacy("people", "people-report-attention")]
      },
      {
        id: "reports-client",
        label: "Client 리포트",
        source: "Client",
        icon: FileText
      },
      {
        id: "reports-matter-analytics",
        label: "사건 리포트",
        source: "Matter",
        icon: LayoutDashboard
      }
    ]
  },
  {
    id: "settings",
    label: "설정",
    localLabel: "권한·보안",
    icon: Settings,
    defaultSection: "settings-company",
    description: "회사 설정, 권한, 보안, 연동, 결제, 지원, 고급 옵션, 태그 관리를 전역 설정으로 이동합니다.",
    sections: [
      {
        id: "settings-company",
        label: "회사 설정",
        source: "People",
        icon: Settings,
        legacyRoutes: [legacy("people", "people-company-general")]
      },
      {
        id: "settings-permissions",
        label: "권한",
        source: "People",
        icon: ShieldCheck,
        legacyRoutes: [legacy("people", "people-admin")]
      },
      {
        id: "settings-security",
        label: "보안",
        source: "People",
        icon: ShieldCheck,
        legacyRoutes: [legacy("people", "people-company-security")]
      },
      {
        id: "settings-integrations",
        label: "연동",
        source: "People",
        icon: Settings,
        legacyRoutes: [legacy("people", "people-company-integrations")]
      },
      {
        id: "settings-billing",
        label: "결제",
        source: "People",
        icon: ReceiptText,
        legacyRoutes: [legacy("people", "people-company-billing")]
      },
      {
        id: "settings-support",
        label: "지원",
        source: "People",
        icon: Bell,
        legacyRoutes: [legacy("people", "people-company-support")]
      },
      {
        id: "settings-advanced",
        label: "고급 옵션",
        source: "People",
        icon: ShieldCheck,
        state: "audit_required",
        legacyRoutes: [legacy("people", "people-company-advanced")]
      },
      {
        id: "settings-tags",
        label: "태그 관리",
        source: "Workspace",
        icon: FileText
      }
    ]
  },
  {
    id: "esign",
    label: "전자계약",
    localLabel: "전송·서명",
    icon: FileCheck2,
    defaultSection: "esign-send",
    description: "전자계약 전송, 템플릿, 서명 진행 상태를 여러 도메인에서 함께 다룹니다.",
    sections: [
      {
        id: "esign-send",
        label: "전자계약 전송",
        source: "People",
        icon: FileCheck2,
        legacyRoutes: [legacy("people", "people-econtract-send")]
      },
      {
        id: "esign-templates",
        label: "전자계약 템플릿",
        source: "People",
        icon: FileText,
        legacyRoutes: [legacy("people", "people-econtract-templates")]
      },
      {
        id: "esign-status",
        label: "서명 진행 상태",
        source: "People",
        icon: ClipboardList,
        legacyRoutes: [legacy("people", "people-econtract-status")]
      },
      {
        id: "esign-settings",
        label: "전자계약 설정",
        source: "Settings",
        icon: Settings,
        legacyRoutes: [legacy("people", "people-company-econtract")]
      }
    ]
  }
];

export const conditionalGlobalItems = [
  {
    id: "calendar",
    label: "일정",
    localLabel: "캘린더",
    icon: CalendarDays,
    defaultSection: "calendar-decision",
    status: "decision-required",
    decision: "전역 캘린더를 만들 때만 최상위 메뉴로 승격합니다.",
    sections: [
      {
        id: "calendar-matter",
        label: "사건 일정",
        source: "Matter",
        icon: CalendarDays
      },
      {
        id: "calendar-people-external",
        label: "People 외부일정",
        source: "People",
        icon: CalendarDays,
        legacyRoutes: [legacy("people", "people-work-schedule-external")]
      },
      {
        id: "calendar-absence",
        label: "부재 일정",
        source: "Profile",
        icon: CalendarDays
      }
    ]
  },
  {
    id: "finance",
    label: "청구·재무",
    localLabel: "정산·입금",
    icon: ReceiptText,
    defaultSection: "finance-decision",
    status: "decision-required",
    decision: "재무 축을 만들 때 Matter 청구와 개인 비용/정산을 전역화합니다.",
    sections: [
      {
        id: "finance-matter-billing",
        label: "사건 청구",
        source: "Matter",
        icon: ReceiptText,
        legacyRoutes: [legacy("profile", "matters")]
      },
      {
        id: "finance-expenses",
        label: "비용 관리",
        source: "Profile",
        icon: ReceiptText,
        legacyRoutes: [legacy("profile", "expenses")]
      },
      {
        id: "finance-transactions",
        label: "정산 내역",
        source: "Profile",
        icon: ClipboardList,
        legacyRoutes: [legacy("profile", "transactions")]
      },
      {
        id: "finance-payments",
        label: "지급 설정",
        source: "Profile",
        icon: Settings,
        legacyRoutes: [legacy("profile", "payments")]
      },
      {
        id: "finance-withdrawal",
        label: "입금 계좌",
        source: "Profile",
        icon: ReceiptText,
        legacyRoutes: [legacy("profile", "withdrawal")]
      }
    ]
  },
  {
    id: "data-import",
    label: "데이터 가져오기",
    localLabel: "검증·롤백",
    icon: Database,
    defaultSection: "data-import-decision",
    status: "decision-required",
    decision: "공유 검증, 감사, 롤백 큐가 확정될 때 전역 가져오기 허브로 승격합니다.",
    sections: [
      {
        id: "data-import-client-data",
        label: "Client 데이터 관리",
        source: "Client",
        icon: Database
      },
      {
        id: "data-import-client",
        label: "Client 데이터 가져오기",
        source: "Client",
        icon: Plus
      },
      {
        id: "data-import-matter",
        label: "사건 자료 가져오기",
        source: "Matter",
        icon: Plus
      },
      {
        id: "data-import-people-attendance",
        label: "People 출퇴근 엑셀 업로드",
        source: "People",
        icon: FileText,
        legacyRoutes: [legacy("people", "people-attendance-upload")]
      }
    ]
  },
  {
    id: "policies",
    label: "문서·방침",
    localLabel: "Vault 원장",
    icon: FolderOpen,
    defaultSection: "policies-decision",
    status: "decision-required",
    decision: "문서 원장은 Vault에 두고 People에는 HR 문서 바로가기를 남깁니다.",
    sections: [
      {
        id: "policies-company",
        label: "회사방침",
        source: "Vault",
        icon: FolderOpen,
        legacyRoutes: [legacy("people", "people-documents")]
      },
      {
        id: "policies-employment-contracts",
        label: "근로계약서",
        source: "Vault",
        icon: FileText,
        legacyRoutes: [legacy("people", "people-employment-contracts")]
      },
      {
        id: "policies-annual-leave",
        label: "연차휴가 사용 촉진 문서",
        source: "Vault",
        icon: FileText,
        legacyRoutes: [legacy("people", "people-annual-leave-notices")]
      }
    ]
  }
];

export const globalUtilityCatalog = [...globalUtilityItems, ...conditionalGlobalItems];

export const globalUtilityViewIds = globalUtilityCatalog.map((item) => item.id);

export const legacyGlobalRoutes = globalUtilityCatalog.flatMap((utility) =>
  utility.sections.flatMap((section) =>
    (section.legacyRoutes ?? []).map((route) => ({
      ...route,
      targetView: utility.id,
      targetSection: section.id,
      targetLabel: section.label,
      utilityLabel: utility.label
    }))
  )
);

const legacyGlobalRouteMap = new Map(legacyGlobalRoutes.map((route) => [`${route.view}:${route.section}`, route]));

export function isGlobalUtilityView(view) {
  return globalUtilityViewIds.includes(view);
}

export function getGlobalUtilityByView(view) {
  return globalUtilityCatalog.find((utility) => utility.id === view) ?? null;
}

export function isLegacyGlobalRoute(view, section) {
  return legacyGlobalRouteMap.has(`${view}:${section}`);
}

export function resolveGlobalShortcut(view, section = "") {
  const route = legacyGlobalRouteMap.get(`${view}:${section}`);
  if (!route) return { view, section };
  return { view: route.targetView, section: route.targetSection, legacy: route };
}
