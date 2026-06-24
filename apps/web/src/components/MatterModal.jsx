import React from "react";
import {
  BarChart3,
  CalendarDays,
  ChevronDown,
  CircleHelp,
  Flag,
  FlaskConical,
  Gauge,
  LayoutDashboard,
  LineChart,
  Plus,
  ShieldCheck,
  Sparkles,
  Table2,
  Users,
  X
} from "lucide-react";
import { PRODUCT_BRAND } from "../brand/brand";
import { Field } from "./primitives.jsx";
import {
  DashboardSubscribeModalState,
  MetricDefinitionModal,
  NewNavigationTourModal,
  NewWebExperimentModalState,
  SaveChartModalState,
  ShareModalState,
  ThemePreferencesModal,
  VisualLabelingLaunchModal
} from "./modal-states.jsx";
import { SessionReplayModal } from "./SessionReplayModal.jsx";

export function MatterModal({ type, labels, onClose, setTheme }) {
  const content = {
    save: {
      title: labels.saveChart,
      body: (
        <>
          <div className="notice">
            <ShieldCheck size={15} />
            저장된 보고서는 Matter 권한을 따릅니다.
          </div>
          <Field label="이름" value="" />
          <Field label="위치" value="선택한 작업공간" />
        </>
      )
    },
    share: {
      title: "공유",
      primaryText: "링크 복사",
      secondaryText: "공유 링크 만들기",
      header: false,
      body: <ShareModalState state="blank" onClose={onClose} />
    },
    shareInvite: {
      title: "공유",
      primaryText: "공유",
      secondaryText: "초대 링크 복사",
      header: false,
      body: <ShareModalState state="invite" onClose={onClose} />
    },
    shareHistory: {
      title: "공유",
      header: false,
      footer: false,
      body: <ShareModalState state="history" onClose={onClose} />
    },
    saveChartCard: {
      title: "보고서 저장",
      primaryText: "저장",
      body: <SaveChartModalState state="card" />
    },
    saveChartSuggest: {
      title: "보고서 저장",
      primaryText: "저장",
      body: <SaveChartModalState state="suggest" />
    },
    saveChartReportDropdown: {
      title: "보고서 저장",
      primaryText: "저장",
      body: <SaveChartModalState state="dropdown" />
    },
    saveChartReportSelected: {
      title: "보고서 저장",
      primaryText: "저장",
      body: <SaveChartModalState state="selected" />
    },
    dashboardSubscribe: {
      title: "업무 보드 알림",
      header: false,
      footer: false,
      body: <DashboardSubscribeModalState state="draft" onClose={onClose} />
    },
    dashboardSubscribeSuccess: {
      title: "업무 보드 알림",
      header: false,
      footer: false,
      body: <DashboardSubscribeModalState state="success" onClose={onClose} />
    },
    visualLabelingLaunch: {
      title: "화면 항목 선택",
      header: false,
      footer: false,
      body: <VisualLabelingLaunchModal onClose={onClose} />
    },
    themePreferences: {
      title: "테마 설정",
      header: false,
      footer: false,
      body: <ThemePreferencesModal onClose={onClose} />
    },
    newNavigationTour: {
      title: "작업공간 탐색",
      header: false,
      footer: false,
      body: <NewNavigationTourModal onClose={onClose} />
    },
    chartType: {
      title: "보고서 형식 선택",
      body: (
        <div className="modal-grid">
          {[
            [LineChart, "선"],
            [BarChart3, "막대"],
            [Gauge, "상태"],
            [Table2, "표"]
          ].map(([Icon, text]) => (
            <button key={text} className="modal-choice">
              <Icon size={18} />
              {text}
            </button>
          ))}
        </div>
      )
    },
    metric: {
      title: "기준 만들기",
      body: (
        <>
          <Field label="기준 이름" value="" />
          <Field label="업무 항목" value="항목 선택" />
          <Field label="집계" value="Matter 기준" />
        </>
      )
    },
    metricUntitled: {
      title: "기준",
      header: false,
      footer: false,
      body: <MetricDefinitionModal step="untitled" />
    },
    metricNamed: {
      title: "기준",
      header: false,
      footer: false,
      body: <MetricDefinitionModal step="named" />
    },
    metricPicker: {
      title: "기준",
      header: false,
      footer: false,
      body: <MetricDefinitionModal step="picker" />
    },
    metricPreview: {
      title: "기준",
      header: false,
      footer: false,
      body: <MetricDefinitionModal step="preview" />
    },
    invite: {
      title: labels.invite,
      body: (
        <>
          <Field label="이메일" value="" />
          <Field label="역할" value="Matter 담당자" />
          <label className="check-row">
            <input type="checkbox" defaultChecked />
            선택한 Matter로 접근 범위를 제한합니다.
          </label>
        </>
      )
    },
    feedback: {
      title: "의견 보내기",
      primaryText: "보내기",
      body: (
        <>
          <div className="feedback-question-row">
            <strong>답변이 도움이 되었나요?</strong>
            <span>
              <button className="secondary-button active">예</button>
              <button className="secondary-button">아니오</button>
            </span>
          </div>
          <textarea className="feedback-textarea" placeholder="의견을 입력하세요" />
        </>
      )
    },
    archive: {
      title: "항목 2개 보관",
      primaryText: "보관",
      body: <p>선택한 항목을 보관하시겠습니까?</p>
    },
    openingTab: {
      title: "새 화면을 여는 중",
      footer: false,
      body: (
        <div className="modal-loading">
          <span className="spinner" aria-hidden="true" />
          <p>새 화면을 준비하고 있습니다.</p>
        </div>
      )
    },
    remove: {
      title: "팀 구성원 삭제",
      primaryText: "삭제 및 이전",
      primaryTone: "danger",
      body: (
        <>
          <p>선택한 사용자를 삭제하시겠습니까?</p>
          <label className="check-row">
            <input type="checkbox" defaultChecked />
            편집 권한을 다른 구성원에게 이전
          </label>
          <p className="muted-copy">삭제되는 구성원의 편집 권한을 다른 구성원에게 이전합니다.</p>
          <Field label="권한을 이전할 구성원" value="" />
        </>
      )
    },
    annotation: {
      title: "새 메모",
      primaryText: "저장",
      body: (
        <>
          <div className="annotation-project">
            <strong>작업공간</strong>
            <span>선택한 작업공간</span>
          </div>
          <label className="field">
            <span>적용일</span>
            <button className="location-select" type="button">
              <CalendarDays size={15} />
              날짜 선택
              <ChevronDown size={14} />
            </button>
          </label>
          <label className="field">
            <span>메모 이름</span>
            <input placeholder="메모 이름 입력..." />
          </label>
          <label className="field">
            <span>설명</span>
            <textarea className="feedback-textarea" placeholder="설명을 입력하세요..." />
          </label>
          <label className="check-row">
            <input type="checkbox" defaultChecked />
            모든 보고서에 메모 적용
          </label>
        </>
      )
    },
    generateChart: {
      title: "보고서 초안 만들기",
      primaryText: "만들기",
      body: (
        <>
          <p>
            {PRODUCT_BRAND} 작업공간 자료를 기준으로 보고서 초안을 만듭니다.
          </p>
          <div className="inline-form">
            <input value="" placeholder="보고서에 담을 업무 질문을 입력하세요" readOnly />
            <button className="primary-button" type="button">
              <Sparkles size={15} />
              만들기
            </button>
          </div>
          <p className="muted-copy">
            중요한 결정 전에는 담당자가 자료를 확인해야 합니다.
          </p>
        </>
      )
    },
    profilePicture: {
      title: "프로필 사진",
      primaryText: "저장",
      body: (
        <div className="profile-picture-modal">
          <div className="profile-picture-preview">--</div>
          <button className="secondary-button" type="button">
            <Plus size={15} />
            이미지 업로드
          </button>
          <p className="muted-copy">정사각형 이미지를 사용하세요.</p>
        </div>
      )
    },
    saveCohort: {
      title: "저장",
      primaryText: "저장",
      body: (
        <>
          <label className="field">
            <span>이름</span>
            <input placeholder="그룹 이름 입력..." />
          </label>
          <label className="field">
            <span>위치</span>
            <button className="location-select" type="button">
              <CircleHelp size={15} />
              위치 선택
              <ChevronDown size={14} />
            </button>
            <small>접근 권한이 있는 위치만 표시됩니다.</small>
          </label>
        </>
      )
    },
    newExperiment: {
      title: "업무 변경 만들기",
      primaryText: "만들기",
      body: (
        <>
          <Field label="이름" value="" />
          <Field label="대상 화면" value="Matter 업무 화면" />
          <Field label="작업공간" value="선택한 Matter" />
          <div className="notice">
            <FlaskConical size={15} />
            추가 설정은 생성 후 조정할 수 있습니다.
          </div>
        </>
      )
    },
    newExperimentBlank: {
      title: "업무 변경 만들기",
      primaryText: "만들기",
      body: <NewWebExperimentModalState state="blank" />
    },
    newExperimentFilled: {
      title: "업무 변경 만들기",
      primaryText: "만들기",
      body: <NewWebExperimentModalState state="filled" />
    },
    newExperimentAdvanced: {
      title: "업무 변경 만들기",
      primaryText: "만들기",
      body: <NewWebExperimentModalState state="advanced" />
    },
    createDashboard: {
      title: "새 업무 보드",
      primaryText: "저장",
      body: (
        <>
          <div className="notice">
            <LayoutDashboard size={15} />
            업무 보드는 팀과 공유하거나 비공개로 둘 수 있습니다.
          </div>
          <Field label="이름" value="" />
          <Field label="위치" value="선택한 작업공간" />
        </>
      )
    },
    sessionReplay: {
      title: "활동 기록",
      header: false,
      footer: false,
      body: <SessionReplayModal onClose={onClose} />
    },
    create: {
      title: labels.create,
      body: (
        <div className="modal-grid">
          {[
            [BarChart3, "보고서"],
            [LayoutDashboard, "업무 보드"],
            [Users, "그룹"],
            [Flag, "기능 설정"]
          ].map(([Icon, text]) => (
            <button key={text} className="modal-choice">
              <Icon size={18} />
              {text}
            </button>
          ))}
        </div>
      )
    },
    confirm: {
      title: "업무 변경 승인",
      body: (
        <>
          <div className="notice danger">
            <ShieldCheck size={15} />
            이 변경은 Matter 검토 흐름에 반영됩니다.
          </div>
          <p>대상, 승인 기준, 되돌림 방법을 확인하세요.</p>
        </>
      )
    }
  }[type] ?? {
    title: labels.theme,
    body: (
      <div className="modal-grid">
        <button className="modal-choice" onClick={() => setTheme("light")}>라이트</button>
        <button className="modal-choice" onClick={() => setTheme("dark")}>다크</button>
      </div>
    )
  };

  return (
    <div className={`modal-layer modal-layer-${type}`} role="presentation">
      <section className={`modal modal-${type}`} role="dialog" aria-modal="true" aria-label={content.title}>
        {content.header === false ? null : (
          <header className="modal-head">
            <h2>{content.title}</h2>
            <button className="icon-button" onClick={onClose}>
              <X size={16} />
            </button>
          </header>
        )}
        <div className="modal-body">{content.body}</div>
        {content.footer === false ? null : (
          <footer className="modal-footer">
            <button className="secondary-button" onClick={onClose}>{content.secondaryText ?? labels.cancel}</button>
            <button className={`primary-button ${content.primaryTone === "danger" ? "danger-button" : ""}`} onClick={onClose}>
              {content.primaryText ?? labels.continue}
            </button>
          </footer>
        )}
      </section>
    </div>
  );
}
