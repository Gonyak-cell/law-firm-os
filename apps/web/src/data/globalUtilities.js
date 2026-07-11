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
  MonitorCog,
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
    localLabel: "전송",
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
        label: "Matter 대화",
        source: "Matter",
        icon: FileText
      }
    ]
  },
  {
    id: "notifications",
    label: "알림",
    localLabel: "센터",
    icon: Bell,
    defaultSection: "notifications-center",
    description: "상단 알림 드로어, 근태 알림, 회사 알림 설정을 전역 알림 센터로 묶습니다.",
    sections: [
      {
        id: "notifications-center",
        label: "알림 센터",
        source: "Topbar",
        icon: Bell
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
    localLabel: "승인",
    icon: ShieldCheck,
    defaultSection: "requests-inbox",
    description: "승인 대기, 비용, 증명서, 강제 승인/거절을 하나의 요청함으로 모읍니다.",
    sections: [
      {
        id: "requests-inbox",
        label: "요청 관리",
        source: "People",
        icon: ShieldCheck,
        legacyRoutes: [legacy("people", "people-approvals")]
      },
      {
        id: "requests-review-inbox",
        label: "승인 대기함",
        source: "Home",
        icon: ClipboardList,
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
    localLabel: "분석",
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
        label: "실시간 리포트",
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
        label: "Client 보고서",
        source: "Client",
        icon: FileText
      },
      {
        id: "reports-matter-analytics",
        label: "Matter 분석",
        source: "Matter",
        icon: LayoutDashboard
      }
    ]
  },
  {
    id: "settings",
    label: "설정",
    localLabel: "권한",
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
        id: "settings-theme",
        label: "테마",
        source: "Workspace",
        icon: MonitorCog,
        description: "작업공간 표시 모드를 선택합니다."
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
    localLabel: "서명",
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
    label: "매출/비용",
    localLabel: "Home",
    icon: ReceiptText,
    defaultSection: "finance-matter-billing",
    status: "integrated-home",
    decision: "전사 집계와 정산 실행은 Home 매출/비용 메뉴에서 관리합니다.",
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
    localLabel: "검증",
    icon: Database,
    defaultSection: "data-import-decision",
    status: "decision-required",
    decision: "공유 검증, 감사, 롤백 큐가 확정될 때 전역 가져오기 허브로 승격합니다.",
    sections: [
      {
        id: "data-import-client-data",
        label: "데이터 관리",
        source: "Client",
        icon: Database
      },
      {
        id: "data-import-client",
        label: "데이터 가져오기",
        source: "Client",
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
    label: "문서",
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
        state: "active",
        description: "Vault 원본과 HRX 계약 상태를 함께 확인합니다.",
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
export const modeExceptionUtilityViewIds = ["settings", "data-import", "profile"];

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

const route = (view, section, extra = {}) => ({ view, section, ...extra });

const directRouteMap = new Map([
  ["home:", route("home", "home-dashboard")],
  ["home:home-recent", route("home", "home-dashboard")],
  ["home:home-dashboard", route("home", "home-dashboard")],
  ["people:people-dashboard", route("clients", "clients-home", { redirectedFrom: { view: "people", section: "people-dashboard" } })],
  ["reports:reports-home-dashboard", route("home", "home-dashboard")],
  ["calendar:calendar-matter", route("matters", "matter-calendar")],
  ["calendar:calendar-people-external", route("people", "people-work-schedule-external")],
  ["calendar:calendar-absence", route("people", "people-leave")],
  ["finance:finance-matter-billing", route("home", "home-finance-billing", { redirectedFrom: { view: "finance", section: "finance-matter-billing" } })],
  ["finance:finance-expenses", route("home", "home-finance-expenses", { redirectedFrom: { view: "finance", section: "finance-expenses" } })],
  ["finance:finance-transactions", route("home", "home-finance-billing", { redirectedFrom: { view: "finance", section: "finance-transactions" } })],
  ["finance:finance-payments", route("home", "home-finance-billing", { redirectedFrom: { view: "finance", section: "finance-payments" } })],
  ["finance:finance-withdrawal", route("home", "home-finance-billing", { redirectedFrom: { view: "finance", section: "finance-withdrawal" } })],
  ["matters:matter-approvals", route("home", "home-requests", { redirectedFrom: { view: "matters", section: "matter-approvals", filter: "finance" }, filter: "finance" })],
  ["matters:matter-time", route("home", "home-finance-time", { redirectedFrom: { view: "matters", section: "matter-time" } })],
  ["matters:matter-expenses", route("home", "home-finance-expenses", { redirectedFrom: { view: "matters", section: "matter-expenses" } })],
  ["matters:matter-billing", route("home", "home-finance-billing", { redirectedFrom: { view: "matters", section: "matter-billing" } })],
  ["matters:matter-ar", route("home", "home-finance-ar", { redirectedFrom: { view: "matters", section: "matter-ar" } })],
  ["matters:matter-external-schedule", route("matters", "matter-calendar", { redirectedFrom: { view: "matters", section: "matter-external-schedule" } })],
  ["matters:matter-notes", route("matters", "matter-board", { redirectedFrom: { view: "matters", section: "matter-notes" } })],
  ["policies:policies-company", route("vault", "vault-documents")],
  ["policies:policies-employment-contracts", route("home", "home-esign")],
  ["policies:policies-annual-leave", route("vault", "vault-documents")]
]);

function resolveFinalUtilityRoute(view, section = "") {
  const direct = directRouteMap.get(`${view}:${section}`);
  if (direct) return direct;
  if (modeExceptionUtilityViewIds.includes(view) && view !== "profile") return route(view, section);
  if (view === "messages") return route("home", "home-messages", { redirectedFrom: { view, section } });
  if (view === "requests") return route("home", "home-requests", { redirectedFrom: { view, section } });
  if (view === "esign") return route("home", "home-esign", { redirectedFrom: { view, section } });
  if (view === "reports") return route("home", "home-company", { redirectedFrom: { view, section } });
  if (view === "notifications") return route("home", "home-dashboard", { redirectedFrom: { view, section }, openNotifications: true });
  return null;
}

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
  if (view === "matters" && !section) return { view, section: "matter-board" };
  const direct = resolveFinalUtilityRoute(view, section);
  if (direct) return direct;
  const legacyRoute = legacyGlobalRouteMap.get(`${view}:${section}`);
  if (!legacyRoute) return { view, section };
  const resolved = resolveFinalUtilityRoute(legacyRoute.targetView, legacyRoute.targetSection);
  if (resolved) return { ...resolved, legacy: legacyRoute };
  return { view: legacyRoute.targetView, section: legacyRoute.targetSection, legacy: legacyRoute };
}
