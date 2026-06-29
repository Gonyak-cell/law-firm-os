import React, { useEffect, useState } from "react";
import {
  CalendarDays,
  ChevronRight,
  CircleHelp,
  CirclePlus,
  ClipboardList,
  FileCheck2,
  IdCard,
  ReceiptText,
  UserRound
} from "lucide-react";
import { fetchUserProfile } from "../data/apiClient.js";

const actionCards = [
  { label: "비용·정산 내역", icon: ReceiptText, view: "finance", section: "finance-expenses" },
  { label: "개인정보 관리", icon: IdCard, view: "people", section: "people-members" },
  { label: "부재 일정", icon: CalendarDays, view: "people", section: "people-leave" }
];

const profileSections = {
  expenses: {
    title: "비용 관리",
    body: "비용 관리 화면으로 이동할 수 있습니다. 프로필 데이터는 세션 프로필 API 상태를 기준으로 표시합니다."
  },
  transactions: {
    title: "정산 내역",
    body: "정산 내역 화면으로 이동할 수 있습니다. 실제 지급 상태는 연결된 업무 화면에서 확인합니다."
  },
  payments: {
    title: "지급 설정",
    body: "지급 설정 화면으로 이동할 수 있습니다. 변경 처리는 연결된 업무 화면에서 진행합니다."
  },
  withdrawal: {
    title: "입금 계좌",
    body: "입금 계좌 화면으로 이동할 수 있습니다. 계좌 정보는 이 화면에 직접 표시하지 않습니다."
  }
};

function profileState(result) {
  if (result === null) return "loading";
  if (result.kind === "error") return "error";
  if (result.uiState === "denied") return "denied";
  if (result.uiState === "review" || result.outcome === "review_required") return "review";
  if (result.kind === "empty" || result.item === null) return "empty";
  return "populated";
}

function profileStatusCopy(state) {
  if (state === "loading") return { title: "프로필 불러오는 중", body: "세션 프로필 상태를 확인하고 있습니다.", status: "확인 중", className: "live-data-loading" };
  if (state === "error") return { title: "프로필 연결 오류", body: "프로필 API 응답을 확인하지 못했습니다.", status: "오류", className: "live-data-error" };
  if (state === "denied") return { title: "프로필 접근 제한", body: "현재 권한으로는 프로필 정보를 볼 수 없습니다.", status: "접근 제한", className: "live-data-denied" };
  if (state === "review") return { title: "프로필 검토 필요", body: "담당자 검토 후 프로필 정보를 표시할 수 있습니다.", status: "검토 필요", className: "live-data-review" };
  if (state === "empty") return { title: "프로필 데이터 없음", body: "세션은 확인됐지만 표시할 프로필 항목이 없습니다.", status: "데이터 없음", className: "live-data-empty" };
  return { title: "세션 프로필", body: "인증된 세션 기준으로 프로필 상태를 표시합니다.", status: "연결됨", className: "" };
}

export function UserProfileSurface({ liveCtx = "allow", onNavigate = () => {} }) {
  const [profileResult, setProfileResult] = useState(null);
  const activeSection = typeof window === "undefined" ? "" : decodeURIComponent(window.location.hash.replace(/^#/, ""));
  const sectionState = profileSections[activeSection] ?? null;
  const currentState = profileState(profileResult);
  const statusCopy = profileStatusCopy(currentState);
  const profile = profileResult?.item ?? null;

  useEffect(() => {
    let cancelled = false;
    setProfileResult(null);
    fetchUserProfile({ ctx: liveCtx }).then((result) => {
      if (!cancelled) setProfileResult(result);
    });
    return () => {
      cancelled = true;
    };
  }, [liveCtx]);

  function navigate(view, section = "") {
    onNavigate(view, section);
  }

  return (
    <section
      className="matter-profile-surface surface"
      data-user-profile-surface="matter-consistent"
      data-profile-api-backed="true"
      data-profile-api-state={currentState}
      data-profile-data-state={currentState}
    >
      <div className="matter-profile-topline">
        <div className="matter-profile-title">
          <h1>내 프로필</h1>
          <p>세션, 계약, 정산 연결 상태를 확인합니다.</p>
        </div>
        <div className="matter-profile-top-actions">
          <button
            type="button"
            className="ghost-button matter-profile-help-link"
            data-profile-help-route="settings-support"
            onClick={() => navigate("settings", "settings-support")}
          >
            <CircleHelp size={17} />
            도움말 및 피드백
          </button>
          <button
            type="button"
            className="secondary-button matter-profile-contract-button"
            data-profile-contract-route="matters:matter-opening"
            onClick={() => navigate("matters", "matter-opening")}
          >
            <CirclePlus size={18} />
            계약 생성
          </button>
        </div>
      </div>

      {sectionState && (
        <div className="live-data-state live-data-review" role="status" data-profile-route-state="true" data-profile-section-state={activeSection}>
          <strong>{sectionState.title}</strong>
          {sectionState.body}
        </div>
      )}

      <header className="matter-profile-hero panel">
        <div className="matter-profile-photo" aria-hidden="true">
          <UserRound size={28} />
        </div>
        <div className="matter-profile-hero-copy">
          <h1>{profile?.display_name ?? statusCopy.title}</h1>
          <p>{statusCopy.body}</p>
          <div className="matter-profile-meta">
            <span className="matter-profile-status">{statusCopy.status}</span>
          </div>
        </div>
      </header>

      <div className="matter-profile-grid">
        <div className="matter-profile-main-stack">
          <article className="matter-profile-card panel" data-profile-contract-card="true">
            <div className="panel-head matter-profile-card-head">
              <div>
                <h2>계약 정보</h2>
                <span>협업 방식과 정산 기준</span>
              </div>
            </div>
            <div className="panel-body matter-profile-card-body">
              <div className={`live-data-state ${statusCopy.className}`} data-profile-contract-state={currentState}>
                <strong>{currentState === "populated" ? "계약 연결 상태" : "계약 정보를 표시할 수 없습니다."}</strong>
                <span>
                  {currentState === "populated"
                    ? `프로필 API가 계약 연결 상태를 ${profile.contract_summary?.state === "connected" ? "확인했습니다" : "확인 중입니다"}.`
                    : "권한이 확인되기 전까지 더미 계약 값을 표시하지 않습니다."}
                </span>
              </div>
            </div>
          </article>

          <article className="matter-profile-card panel" data-profile-general-card="true">
            <div className="panel-head matter-profile-card-head">
              <div>
                <h2>계정 정보</h2>
                <span>워크스페이스 접근 정보</span>
              </div>
            </div>
            <div className="panel-body matter-profile-card-body">
              <div className={`live-data-state ${statusCopy.className}`} data-profile-account-state={currentState}>
                <strong>{currentState === "populated" ? "계정 접근 상태" : "계정 정보를 표시할 수 없습니다."}</strong>
                <span>
                  {currentState === "populated"
                    ? `${profile.role_count ?? 0}개 권한 그룹이 세션 기준으로 확인되었습니다.`
                    : "프로필 API 또는 세션 컨텍스트를 확인해야 합니다."}
                </span>
              </div>
            </div>
          </article>
        </div>

        <aside className="matter-profile-side-stack" aria-label="프로필 작업">
          {actionCards.map(({ label, badge, icon: Icon, view, section }) => (
            <button
              type="button"
              className="matter-profile-action-card"
              key={label}
              data-profile-action-card={label}
              data-profile-action-route={`${view}:${section}`}
              onClick={() => navigate(view, section)}
            >
              <span className="matter-profile-action-icon"><Icon size={22} /></span>
              <strong>{label}</strong>
              {badge && <span className="matter-profile-new-tag">{badge}</span>}
              <ChevronRight size={20} />
            </button>
          ))}
          <div className="matter-profile-progress-card panel" data-profile-data-state={currentState}>
            <div className="panel-head">
              <div>
                <h2>프로필 연결 상태</h2>
                <span>{statusCopy.status}</span>
              </div>
            </div>
            <div className="panel-body">
              <div className={`live-data-state ${statusCopy.className}`}>
                <strong>{statusCopy.title}</strong>
                <span>임시 사용자명, 계약 금액, 시작일, 진행률은 표시하지 않습니다.</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

export const profileSidebarItems = [
  { label: "홈", view: "home", icon: UserRound },
  { label: "새 계약 만들기", view: "matters", section: "matter-opening", icon: CirclePlus },
  { label: "계약 관리", view: "matters", section: "matters-list", icon: FileCheck2 },
  { label: "내 프로필", view: "profile", icon: UserRound, active: true },
  { label: "문서", view: "vault", section: "vault-documents", icon: ClipboardList },
  { label: "청구 관리", view: "finance", section: "finance-matter-billing", icon: ReceiptText },
  { label: "비용 관리", view: "finance", section: "finance-expenses", icon: ReceiptText },
  { label: "정산 내역", view: "finance", section: "finance-transactions", icon: ClipboardList },
  { label: "지급 설정", view: "finance", section: "finance-payments", icon: ReceiptText },
  { label: "입금 계좌", view: "finance", section: "finance-withdrawal", icon: IdCard }
];
