import React from "react";
import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  LayoutDashboard,
  Mail,
  MessageSquare,
  MoreVertical,
  PlayCircle,
  Plus,
  Search,
  Settings,
  Sparkles,
  X
} from "lucide-react";
export function MetricDefinitionModal({ step }) {
  const hasName = step !== "untitled";
  const showPicker = step === "picker";
  const showPreview = step === "preview";

  return (
    <div className="metric-definition-modal">
      <div className="metric-definition-body">
        <p className="metric-kicker">기준</p>
        <h1>{hasName ? "설정된 기준" : "이름 없는 기준"}</h1>
        <p className="metric-description">{hasName ? "작업공간 자료로 기준을 설정했습니다." : "기준 설명을 입력하세요."}</p>
        <div className="metric-definition-rule" />
        <div className="metric-definition-row">
          <strong>기준 유형</strong>
          <div>
            <button className="metric-select-button" type="button">
              고유값
              <ChevronDown size={16} />
            </button>
            <p>선택한 업무 항목을 완료한 고유 대상 기준으로 계산합니다.</p>
          </div>
        </div>
        <div className="metric-definition-row metric-events-row">
          <strong>업무 항목</strong>
          <div className="metric-event-control">
            {showPreview ? (
              <div className="metric-selected-event">
                <span className="amplitude-event-dot">A</span>
                선택한 항목
                <button type="button">+ 조건</button>
              </div>
            ) : (
              <span className="metric-event-placeholder">항목 선택...</span>
            )}
            <small>고유값</small>
            {showPicker && (
              <div className="metric-event-dropdown">
                <label>
                  <Search size={16} />
                  <input placeholder="검색" />
                </label>
                <header>
                  <ChevronDown size={16} />
                  <strong>업무 항목</strong>
                <span>항목</span>
                </header>
                {["작업공간 항목", "Matter 항목", "문서 항목", "검토 항목"].map((event) => (
                  <button key={event} type="button">
                    <span className="amplitude-event-dot">A</span>
                    {event}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        {showPreview && (
          <div className="metric-preview-block">
            <h2>미리보기</h2>
            <div className="metric-preview-grid">
              <div className="metric-preview-copy">
                <div className="metric-preview-title">
                  <strong>현재 고유값</strong>
                  <MoreVertical size={16} />
                </div>
                <span className="metric-preview-value">—</span>
                <p><strong>미리보기 자료 없음</strong></p>
                <p>자료를 선택하면 미리보기가 표시됩니다.</p>
              </div>
              <div className="live-data-state live-data-empty">미리보기 자료 없음</div>
            </div>
          </div>
        )}
      </div>
      <footer className="metric-definition-footer">
        <button className="secondary-button" type="button">취소</button>
        <button className={`primary-button ${showPreview ? "" : "disabled"}`} type="button">저장</button>
      </footer>
    </div>
  );
}

export function NewWebExperimentModalState({ state }) {
  const isAdvanced = state === "advanced";

  return (
    <div className="new-web-experiment-state">
      <label className="field experiment-field">
        <span>이름*</span>
        <input value="" placeholder="이름 입력" readOnly />
      </label>
      <label className="field experiment-field">
        <span>대상 페이지(URL)*</span>
        <input value="" placeholder="https://" readOnly />
      </label>
      <label className="field experiment-field">
        <span>작업공간*</span>
        <button className="location-select" type="button">
          선택한 작업공간
          <ChevronDown size={14} />
        </button>
      </label>
      <div className="experiment-advanced-row">
        <ChevronDown size={17} className={isAdvanced ? "" : "collapsed"} />
          <strong>추가 설정</strong>
      </div>
      {isAdvanced && (
        <div className="experiment-advanced-panel">
          <p>필요한 항목은 생성 후 수정할 수 있습니다.</p>
          <label className="field experiment-field">
            <span>식별값*</span>
            <small>식별값은 생성 전까지 수정할 수 있습니다.</small>
            <input value="" readOnly />
          </label>
          <div className="experiment-type-choice">
            <strong>변경 유형*</strong>
            <label>
              <input type="radio" defaultChecked />
              업무 변경
              <CircleHelp size={15} />
            </label>
            <label className="disabled-choice">
              <input type="radio" />
              고급 배분
              <CircleHelp size={15} />
              <a>문의하기</a>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}

export function ShareModalState({ state, onClose }) {
  const isInvite = state === "invite";
  const isHistory = state === "history";

  return (
    <div className="share-modal-state">
      <div className="share-modal-top">
        <div className="modal-tabs share-modal-tabs">
          <button className={isHistory ? "" : "active"}>공유</button>
          <button>삽입</button>
          <button className={isHistory ? "active" : ""}>열람 기록</button>
        </div>
        <button className="icon-button" onClick={onClose} type="button">
          <X size={18} />
        </button>
      </div>
      {isHistory ? (
        <div className="share-history-state">
          <table>
            <thead>
              <tr>
                <th>이름</th>
                <th>최근 열람</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["현재 사용자", "작업공간 계정", "최근"],
                ["선택한 사용자", "작업공간 계정", "최근"]
              ].map((row) => (
                <tr key={row[0]}>
                  <td>
                    <span className="avatar-dot">{row[0].slice(0, 2).replace(" ", "")}</span>
                    <span>
                      <strong>{row[0]}</strong>
                      <small>{row[1]}</small>
                    </span>
                  </td>
                  <td>{row[2]}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="share-history-footer">
            <button className="primary-button" onClick={onClose} type="button">완료</button>
          </div>
        </div>
      ) : (
        <>
          <label className="field share-people-field">
            <span>공유 대상</span>
            <div className={`share-recipient-line ${isInvite ? "filled" : ""}`}>
              <div className="share-recipient-input">
                {isInvite && <span className="selected-recipient-row">선택한 사용자 <X size={12} /></span>}
                <input placeholder="이름 또는 이메일 입력" readOnly />
              </div>
              {isInvite && (
                <button className="location-select share-inline-permission" type="button">
                  편집 가능
                  <ChevronDown size={14} />
                </button>
              )}
            </div>
          </label>
          {isInvite && (
            <textarea className="feedback-textarea share-message" placeholder="메시지 추가(선택)" />
          )}
        </>
      )}
    </div>
  );
}

export function SaveChartModalState({ state }) {
  const showSelectedCard = state === "card";
  const showDropdown = state === "dropdown";
  const showSelectedReport = state === "selected";
  const showSuggest = state === "suggest";

  return (
    <div className="save-chart-state">
      <div className="notice save-chart-notice">
        <CheckCircle2 size={15} />
        자료가 준비되면 보고서를 저장할 수 있습니다.
      </div>
      <label className="field save-chart-name-field">
        <span>이름</span>
        <div className="save-name-row">
          <input value="" placeholder="보고서 이름" readOnly />
          {(showSuggest || showDropdown || showSelectedReport) && <button className="suggest-link" type="button"><Sparkles size={14} />추천</button>}
        </div>
      </label>
      {showSelectedCard && (
        <div className="save-chart-card selected">
          <Sparkles size={16} />
          <span>선택한 보고서</span>
          <X size={16} />
          <CheckCircle2 size={16} />
        </div>
      )}
      <label className="field">
        <span>위치</span>
        <button className="location-select save-location-select" type="button">
          작업공간
          <ChevronDown size={14} />
        </button>
      </label>
      {showDropdown || showSelectedReport ? (
        <label className="field">
          <span>업무 보드에 추가</span>
          <div className="save-report-picker">
            {showSelectedReport ? (
              <span className="selected-report-row">
                <LayoutDashboard size={14} />
                선택한 업무 보드
                <X size={12} />
              </span>
            ) : (
              <input placeholder="업무 보드 이름 입력..." readOnly />
            )}
          </div>
        </label>
      ) : (
        <button className="save-add-report-link" type="button">업무 보드에 추가</button>
      )}
      {showDropdown && (
        <div className="save-report-dropdown">
          <button type="button">
            <Plus size={15} />
            새 업무 보드 만들기
          </button>
          <button type="button">
            <BookOpen size={15} />
            새 노트 만들기
          </button>
        </div>
      )}
    </div>
  );
}

export function DashboardSubscribeModalState({ state, onClose }) {
  const isSuccess = state === "success";

  return (
    <div className="dashboard-subscribe-state">
      <div className="dashboard-subscribe-top">
        <div>
          <h2>업무 보드 알림</h2>
          <p>업무 보드 업데이트 알림을 이메일로 받을 수 있습니다.</p>
        </div>
        <button className="icon-button" onClick={onClose} type="button">
          <X size={20} />
        </button>
      </div>
      <div className="dashboard-subscribe-tabs">
        <button className="active"><Mail size={18} />Email</button>
        <button><MessageSquare size={18} />Slack</button>
      </div>
      {isSuccess && (
        <div className="dashboard-subscribe-success">
          <CheckCircle2 size={20} />
          알림 설정이 저장되었습니다.
          <X size={18} />
        </div>
      )}
      <label className="field subscribe-timezone">
        <span>표시 시간대</span>
        <button className="location-select" type="button">
          작업공간 시간대
          <ChevronDown size={14} />
        </button>
      </label>
      {isSuccess ? (
        <div className="subscribe-schedule-table">
          <div className="subscribe-table-head">
            <span><input type="checkbox" />이름</span>
            <span>일정</span>
            <span>CSV</span>
          </div>
          <div className="subscribe-table-row">
            <span><input type="checkbox" />알림 받는 중</span>
            <span>
              <button>반복 <ChevronDown size={14} /></button>
              <button>요일 선택 <ChevronDown size={14} /></button>
              시간
              <button>시간 선택 <ChevronDown size={14} /></button>
            </span>
            <span>
              <button>CSV <ChevronDown size={14} /></button>
              <X size={16} />
            </span>
          </div>
        </div>
      ) : null}
      <label className="field subscribe-add-field">
        <span>알림 대상 추가</span>
        <div className="subscribe-add-input">
          {isSuccess ? (
            <input placeholder="이름 또는 이메일 검색" readOnly />
          ) : (
            <span className="selected-recipient-row">선택한 대상 <X size={12} /></span>
          )}
        </div>
      </label>
      {!isSuccess && (
        <div className="subscribe-controls">
          <strong>알림 주기</strong>
          <span>
            <button>반복 <ChevronDown size={14} /></button>
            <button>요일 선택 <ChevronDown size={14} /></button>
            <button>시간 선택 <ChevronDown size={14} /></button>
            <button>CSV 포함 <ChevronDown size={14} /></button>
          </span>
        </div>
      )}
      <button className={isSuccess ? "secondary-button disabled" : "primary-button subscribe-add-button"} type="button">추가</button>
      <div className="dashboard-subscribe-footer">
        <button className="secondary-button" onClick={onClose} type="button">완료</button>
      </div>
    </div>
  );
}

export function VisualLabelingLaunchModal({ onClose }) {
  return (
    <div className="visual-labeling-launch">
      <div className="modal-custom-top">
        <h2>화면 항목 선택</h2>
        <button className="icon-button" onClick={onClose} type="button"><X size={20} /></button>
      </div>
      <p>공유할 화면 항목을 선택합니다.</p>
      <div className="visual-labeling-illustration">
        <div className="browser-dots"><span /><span /><span /></div>
        <div className="browser-bluebar"><i /><i /></div>
      </div>
      <p>공유 범위를 확인할 페이지를 선택하세요.</p>
      <label className="field">
        <span>페이지 URL</span>
        <button className="location-select" type="button">
          작업공간 URL
          <ChevronDown size={14} />
        </button>
      </label>
      <div className="custom-modal-footer">
        <button className="secondary-button" onClick={onClose} type="button">취소</button>
        <button className="primary-button" onClick={onClose} type="button">시작</button>
      </div>
    </div>
  );
}

export function ThemePreferencesModal({ onClose }) {
  const themes = ["라이트 모드", "다크 모드", "시스템 설정 사용"];
  return (
    <div className="theme-preferences-modal">
      <div className="modal-custom-top">
        <h2>테마 설정</h2>
        <button className="icon-button" onClick={onClose} type="button"><X size={20} /></button>
      </div>
      <p>작업공간에 적용할 화면 테마를 선택합니다.</p>
      <div className="theme-preference-grid">
        {themes.map((theme, index) => (
          <button key={theme} className="theme-preference-card" type="button">
            <strong>{theme}</strong>
            {index === 0 && <CheckCircle2 size={18} />}
            <span className={`theme-preference-preview ${index === 1 ? "dark" : index === 2 ? "split" : ""}`}>
              <i /><i /><i /><i />
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function NewNavigationTourModal({ onClose }) {
  return (
    <>
      <div className="settings-menu-preview tour-settings-menu">
        {["조직 설정", "개인 설정", "테마: 라이트", "새 탐색 끄기", "화면 둘러보기", "문제 신고", "도움말", "로그아웃"].map((item) => (
          <button key={item}>{item}</button>
        ))}
      </div>
      <div className="new-navigation-tour">
        <button className="icon-button tour-close" onClick={onClose} type="button"><X size={17} /></button>
        <h2>작업공간 탐색</h2>
        <p>현재 탐색 메뉴와 주요 작업을 확인합니다.</p>
        <div className="tour-video-frame">
          <div className="tour-screen">
            <span className="tour-play"><PlayCircle size={66} /></span>
          </div>
          <div className="tour-controls">
            <span><PlayCircle size={18} />2:58</span>
            <i />
            <span>CC</span>
            <Settings size={18} />
          </div>
        </div>
        <button className="secondary-button tour-button" type="button">둘러보기</button>
      </div>
    </>
  );
}
