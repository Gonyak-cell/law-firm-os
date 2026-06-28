import React, { useState } from "react";
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

const actionCards = [
  { label: "비용·정산 내역", icon: ReceiptText, body: "비용과 정산 내역은 프로필 데이터 연결 후 표시합니다." },
  { label: "개인정보 관리", icon: IdCard, body: "개인정보 변경은 인증된 프로필 API 연결 후 진행합니다." },
  { label: "부재 일정", icon: CalendarDays, body: "부재 일정은 캘린더 연동 후 확인합니다." }
];

const profileSections = {
  expenses: {
    title: "비용 관리",
    body: "비용 관리 화면을 열었습니다. 실제 비용 데이터가 연결되면 제출 내역과 검토 상태를 표시합니다."
  },
  transactions: {
    title: "정산 내역",
    body: "정산 내역 화면을 열었습니다. 실제 정산 API가 연결되면 지급 상태를 표시합니다."
  },
  payments: {
    title: "지급 설정",
    body: "지급 설정 화면을 열었습니다. 지급 수단 변경은 인증된 프로필 API 연결 후 처리합니다."
  },
  withdrawal: {
    title: "입금 계좌",
    body: "입금 계좌 화면을 열었습니다. 계좌 정보는 실제 프로필 API 연결 전까지 표시하지 않습니다."
  }
};

export function UserProfileSurface() {
  const [localAction, setLocalAction] = useState(null);
  const activeSection = typeof window === "undefined" ? "" : decodeURIComponent(window.location.hash.replace(/^#/, ""));
  const sectionState = profileSections[activeSection] ?? null;

  return (
    <section className="matter-profile-surface surface" data-user-profile-surface="matter-consistent">
      <div className="matter-profile-topline">
        <div className="matter-profile-title">
          <h1>내 프로필</h1>
          <p>개인 정보, 계약, 정산 설정을 한 화면에서 관리합니다.</p>
        </div>
        <div className="matter-profile-top-actions">
          <button
            type="button"
            className="ghost-button matter-profile-help-link"
            data-profile-help-feedback="true"
            onClick={() => setLocalAction({ title: "도움말 및 피드백", body: "프로필 화면 도움말과 피드백 접수 상태를 열었습니다." })}
          >
            <CircleHelp size={17} />
            도움말 및 피드백
          </button>
          <button
            type="button"
            className="secondary-button matter-profile-contract-button"
            data-profile-contract-create="true"
            onClick={() => setLocalAction({ title: "계약 생성", body: "새 계약 생성 준비 상태를 열었습니다. 실제 생성은 Matter 개시 화면에서 처리합니다." })}
          >
            <CirclePlus size={18} />
            계약 생성
          </button>
        </div>
      </div>

      {(sectionState || localAction) && (
        <div className="live-data-state live-data-review" role="status" data-profile-local-state="true" data-profile-section-state={sectionState ? activeSection : undefined}>
          <strong>{(localAction ?? sectionState).title}</strong>
          {(localAction ?? sectionState).body}
        </div>
      )}

      <header className="matter-profile-hero panel">
        <div className="matter-profile-photo" aria-hidden="true">
          <UserRound size={28} />
        </div>
        <div className="matter-profile-hero-copy">
          <h1>프로필 데이터 없음</h1>
          <p>로그인 세션 또는 사용자 프로필 API가 연결되면 개인정보와 계약 정보를 표시합니다.</p>
          <div className="matter-profile-meta">
            <span className="matter-profile-status">연결 필요</span>
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
              <div className="live-data-state live-data-empty">
                <strong>계약 정보를 표시할 수 없습니다.</strong>
                <span>실제 프로필 데이터가 연결되지 않아 더미 값을 표시하지 않습니다.</span>
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
              <div className="live-data-state live-data-empty">
                <strong>계정 정보를 표시할 수 없습니다.</strong>
                <span>사용자 프로필 API 또는 세션 컨텍스트를 연결해야 합니다.</span>
              </div>
            </div>
          </article>
        </div>

        <aside className="matter-profile-side-stack" aria-label="프로필 작업">
          {actionCards.map(({ label, badge, icon: Icon, body }) => (
            <button
              type="button"
              className="matter-profile-action-card"
              key={label}
              data-profile-action-card={label}
              onClick={() => setLocalAction({ title: label, body })}
            >
              <span className="matter-profile-action-icon"><Icon size={22} /></span>
              <strong>{label}</strong>
              {badge && <span className="matter-profile-new-tag">{badge}</span>}
              <ChevronRight size={20} />
            </button>
          ))}
          <div className="matter-profile-progress-card panel" data-profile-data-state="empty">
            <div className="panel-head">
              <div>
                <h2>프로필 연결 상태</h2>
                <span>실제 데이터 필요</span>
              </div>
            </div>
            <div className="panel-body">
              <div className="live-data-state live-data-empty">
                <strong>연결된 프로필 데이터가 없습니다.</strong>
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
  { label: "청구 관리", view: "matters", section: "matter-billing", icon: ReceiptText },
  { label: "비용 관리", view: "profile", section: "expenses", icon: ReceiptText },
  { label: "정산 내역", view: "profile", section: "transactions", icon: ClipboardList },
  { label: "지급 설정", view: "profile", section: "payments", icon: ReceiptText },
  { label: "입금 계좌", view: "profile", section: "withdrawal", icon: IdCard }
];
