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

const contractRows = [
  ["이용 유형", "외부 협업자"],
  ["계약 방식", "월 정액 자문"],
  ["소속 조직", "AMIC Law"],
  ["담당 역할", "법무 운영 매니저"],
  ["권한 등급", "미설정"],
  ["시작일", "2024년 4월 15일"],
  ["정산 금액", "월 $30.00"]
];

const generalRows = [
  ["이름", "서지원"],
  ["이메일", "jws@matter.local"],
  ["근무 국가", "대한민국"],
  ["워크스페이스", "Client Matter People Vault"]
];

const actionCards = [
  { label: "비용·정산 내역", badge: "신규", icon: ReceiptText },
  { label: "개인정보 관리", icon: IdCard },
  { label: "부재 일정", icon: CalendarDays }
];

export function UserProfileSurface() {
  return (
    <section className="matter-profile-surface surface" data-user-profile-surface="matter-consistent">
      <div className="matter-profile-topline">
        <div className="matter-profile-title">
          <span className="eyebrow">AMIC LAW</span>
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
          <span>서</span>
        </div>
        <div className="matter-profile-hero-copy">
          <h1>서지원</h1>
          <p>법무 운영 매니저</p>
          <div className="matter-profile-meta">
            <span className="matter-profile-status offboarding">계정 정리 중</span>
            <span className="matter-profile-meta-pill">AMIC Law</span>
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
              <div className="matter-profile-summary">
                <strong>서지원</strong>
                <span className="matter-profile-status in-progress">진행 중</span>
              </div>
              <div className="matter-profile-field-list">
                {contractRows.map(([label, value]) => (
                  <div className="matter-profile-field-row" key={label}>
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
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
              <div className="matter-profile-field-list">
                {generalRows.map(([label, value]) => (
                  <div className="matter-profile-field-row" key={label}>
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
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
          <div className="matter-profile-progress-card panel" data-profile-onboarding-pill="true">
            <div className="panel-head">
              <div>
                <h2>시작 설정</h2>
                <span>프로필 설정 진행률</span>
              </div>
              <strong>80%</strong>
            </div>
            <div className="panel-body">
              <div className="matter-profile-progress-meter" aria-label="시작 설정 80% 완료">
                <span />
              </div>
              <p>계정 기본 정보와 계약 정보가 준비되었습니다. 지급 설정만 확인하면 완료됩니다.</p>
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
