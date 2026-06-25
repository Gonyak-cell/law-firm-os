import React from "react";
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
  { label: "비용·정산 내역", icon: ReceiptText },
  { label: "개인정보 관리", icon: IdCard },
  { label: "부재 일정", icon: CalendarDays }
];

export function UserProfileSurface() {
  return (
    <section className="matter-profile-surface surface" data-user-profile-surface="matter-consistent">
      <div className="matter-profile-topline">
        <div className="matter-profile-title">
          <h1>내 프로필</h1>
          <p>개인 정보, 계약, 정산 설정을 한 화면에서 관리합니다.</p>
        </div>
        <div className="matter-profile-top-actions">
          <button type="button" className="ghost-button matter-profile-help-link">
            <CircleHelp size={17} />
            도움말 및 피드백
          </button>
          <button type="button" className="secondary-button matter-profile-contract-button">
            <CirclePlus size={18} />
            계약 생성
          </button>
        </div>
      </div>

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
          {actionCards.map(({ label, badge, icon: Icon }) => (
            <button type="button" className="matter-profile-action-card" key={label}>
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
