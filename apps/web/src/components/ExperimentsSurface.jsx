import React from "react";
import { CheckCircle2, CircleHelp, Flag, FlaskConical, PlayCircle, Settings, X } from "lucide-react";
import { MatterLogo } from "./MatterLogo.jsx";
import { CompactTable, DataTable, Field, PageHeader, Panel, QueryBlock } from "./primitives.jsx";

export function ExperimentsSurface({ labels, variant, onConfirm, onNewExperiment }) {
  if (["expSiteSetup", "expVariantsDrawer", "expGoalsDraft", "expGoalsConfigured", "expDelivery"].includes(variant)) {
    return <ExperimentSetupDrawerSurface mode={variant} />;
  }
  if (["expVisualEditor", "expActionModal", "expAdding"].includes(variant)) {
    return <ExperimentVisualEditorSurface mode={variant} />;
  }
  if (variant === "expDetailSettings" || variant === "expDetailActivity" || variant === "expStartModal") {
    return <ExperimentDetailSurface mode={variant} />;
  }
  if (variant === "overviewCards") {
    return <ExperimentOverviewCardsSurface labels={labels} onNewExperiment={onNewExperiment} />;
  }
  if (variant === "builder") {
    return <ExperimentBuilderSurface labels={labels} onConfirm={onConfirm} />;
  }

  return (
    <section className="surface stack">
      <PageHeader
        title={labels.experimentTitle}
        subtitle="업무 변경 대상, 적용 범위, 승인 상태를 관리합니다."
        actions={
          <>
            <button className="secondary-button">
              <Flag size={15} />
              새 설정
            </button>
            <button className="primary-button" onClick={onConfirm}>
              <FlaskConical size={15} />
              변경 요청
            </button>
          </>
        }
      />
      <div className="experiment-layout">
        <Panel title="변경 목록" meta="업무 상태">
          <DataTable
            columns={["식별값", "이름", "상태", "대상", "담당자"]}
            rows={[]}
          />
        </Panel>
        <Panel title="변경 미리보기" meta="화면 확인">
          <div className="variant-editor">
            <div className="variant-toolbar">
              <button className="secondary-button">기존</button>
              <button className="secondary-button active">변경안</button>
            </div>
            <div className="variant-canvas">
              <div className="mini-product-card">
                <strong>청구 확인</strong>
                <span>담당자 승인 필요</span>
              </div>
            </div>
          </div>
        </Panel>
      </div>
    </section>
  );
}

export function ExperimentSetupDrawerSurface({ mode }) {
  const active = {
    expSiteSetup: "기본 설정",
    expVariantsDrawer: "변경안",
    expGoalsDraft: "확인 기준",
    expGoalsConfigured: "확인 기준",
    expDelivery: "추가 설정"
  }[mode];

  return (
    <section className="experiment-drawer-state">
      <aside className="experiment-drawer-nav">
        <h1>업무 변경 설정</h1>
        <p><FlaskConical size={18} /> 업무 변경</p>
        {["기본 설정", "변경안", "확인 기준", "화면", "대상", "추가 설정"].map((item) => (
          <button key={item} className={active === item ? "active" : ""}>
            <span>{item}</span>
          </button>
        ))}
        <button className="secondary-button drawer-save">저장 후 닫기</button>
      </aside>
      <main className="experiment-drawer-panel">
        {mode === "expSiteSetup" && <ExperimentSetupSite />}
        {mode === "expVariantsDrawer" && <ExperimentSetupVariants />}
        {mode === "expGoalsDraft" && <ExperimentSetupGoals configured={false} />}
        {mode === "expGoalsConfigured" && <ExperimentSetupGoals configured />}
        {mode === "expDelivery" && <ExperimentSetupDelivery />}
        <button className="primary-button drawer-next">
          다음: {mode === "expSiteSetup" ? "변경안" : mode === "expVariantsDrawer" ? "확인 기준" : "화면"}
        </button>
      </main>
    </section>
  );
}

export function ExperimentSetupSite() {
  return (
    <>
      <h2>기본 설정</h2>
      <div className="notice success"><CheckCircle2 size={18} /> <strong>기본 설정 확인</strong> 변경안을 검토할 수 있습니다.</div>
      <p>업무 변경을 적용할 화면과 담당자를 확인하세요.</p>
      <div className="script-card">
        <strong>적용 화면</strong>
        <p>변경 대상 화면은 담당자 확인 후 적용됩니다.</p>
        <pre>{`담당자 확인 후 연결됩니다.`}</pre>
      </div>
      <h3>연결 항목</h3>
      <div className="connector-grid"><button>Vault</button><button>청구</button><button>감사</button></div>
      <a>관련 자료</a>
    </>
  );
}

export function ExperimentSetupVariants() {
  return (
    <>
      <h2>변경안</h2>
      <p>기존 화면과 변경안을 비교하고 적용 범위를 확인합니다.</p>
      <button className="secondary-button wide">미리보기 열기</button>
      <div className="variant-setup-row"><span className="variant-letter variant-a">A</span><strong>기존</strong><small>현재 화면</small><Settings size={18} /></div>
      <div className="variant-setup-row"><span className="variant-letter variant-b">B</span><strong>변경안</strong><a>변경안 설정</a><Settings size={18} /></div>
      <button className="text-button">변경안 추가</button>
    </>
  );
}

export function ExperimentSetupGoals({ configured }) {
  return (
    <>
      <h2>확인 기준</h2>
      <p>변경 전후에 확인할 업무 기준과 중단 조건을 정합니다.</p>
      <div className="toggle-row"><CircleHelp size={15} /> 추천 기준 사용 <span className="toggle-on" /></div>
      <div className="notice">중요 업무 변경은 담당자 확인 후 적용합니다.</div>
      <section className="goal-config-box">
        <header>{configured ? "기준 설정됨" : "기준 정의"} <X size={16} /></header>
        <label>기준<button>{configured ? "선택한 기준" : "기준 선택..."}</button></label>
        <a>사용자 지정 기준 만들기</a>
        <label>유형<span><button className={configured ? "active" : ""}>목표</button><button>중단 조건</button></span></label>
        <label>방향<button>{configured ? "증가" : "증가"}</button></label>
        {configured && <label>최소 허용 기준 <input value="" readOnly />%</label>}
      </section>
      <button className="text-button">기준 추가</button>
    </>
  );
}

export function ExperimentSetupDelivery() {
  return (
    <>
      <h2>추가 설정</h2>
      {["적용 지연", "대상 유지", "배분 기준"].map((item, index) => (
        <section key={item} className="delivery-option">
          <header><strong>{item}</strong>{index === 0 && <span className="toggle-off" />}</header>
          <p>{index === 0 ? "적용 화면을 준비한 뒤 변경을 반영합니다." : index === 1 ? "이미 배정된 대상에는 같은 변경안을 유지합니다." : "고급 배분 기준은 담당자 확인 후 사용합니다."}</p>
          {index === 2 && <button>기준 선택</button>}
        </section>
      ))}
    </>
  );
}

export function ExperimentVisualEditorSurface({ mode }) {
  return (
    <section className="experiment-visual-state">
      <header>
        <strong><span className="amplitude-event-dot">A</span> 작업공간 화면</strong>
        <nav><span>변경안</span><b>A</b> 기존 <b className="green">B</b> 변경안</nav>
        <button className="primary-button">계속</button>
      </header>
      <main>
        <button className="secondary-button deploy">적용 요청</button>
        <button className="secondary-button login-preview">로그인</button>
        <h1>작업공간 화면 미리보기</h1>
        <h2>다음 작업</h2>
        <p><input type="checkbox" /> 작업공간 작업 선택</p>
        {mode === "expVisualEditor" && (
          <div className="visual-property-panel">
            <h3>선택 영역</h3>
            <input value="" readOnly />
            <label>표시 <span><button className="active">표시</button><button>숨김</button></span></label>
            <label>공개 여부 <span><button className="active">공개</button><button>비공개</button></span></label>
            <label>문구 <textarea value="" readOnly /></label>
            <footer><button>취소</button><button disabled>적용</button></footer>
          </div>
        )}
        {mode === "expActionModal" && (
          <div className="visual-action-modal">
            <h2>변경안에 작업 적용</h2>
            <p>선택한 변경안에 적용할 작업을 고릅니다.</p>
            <div><button>화면 요소 변경<br /><small>문구, 이미지, 색상</small></button><button>경로 변경<br /><small>다른 URL 경로</small></button></div>
          </div>
        )}
        {mode === "expAdding" && (
          <div className="visual-loading-modal">
            <span className="amplitude-event-dot">A</span>
            <h2>변경안을 추가하는 중...</h2>
            <p>확인 기준, 대상, 적용 설정을 마저 입력하세요.</p>
          </div>
        )}
      </main>
    </section>
  );
}

export function ExperimentDetailSurface({ mode }) {
  const isActivity = mode === "expDetailActivity";
  return (
    <section className="experiment-detail-state">
      <header>
        <span>업무 변경</span>
        <h1><FlaskConical size={25} /> 업무 변경 <small>{mode === "expStartModal" ? "초안" : "진행 중"}</small></h1>
        <button className="secondary-button">중지</button>
      </header>
      <div className="experiment-detail-grid">
        <aside className="experiment-overview-card">
          <h2>개요</h2>
          {["분석 범위|미정", "기능 설정|선택 전", "이름|이름 없음", "설명|--", "변경 유형|업무 변경", "분류|웹", "링크|--", "태그|없음"].map((item) => {
            const [label, value] = item.split("|");
            return <p key={label}><strong>{label}</strong><span>{value}</span></p>;
          })}
        </aside>
        <main>
          <nav><button className={!isActivity ? "active" : ""}>설정</button><button className={isActivity ? "active" : ""}>활동</button></nav>
          {!isActivity ? <ExperimentSettingsPanels /> : <ExperimentActivityPanels />}
        </main>
      </div>
      {mode === "expStartModal" && (
        <div className="modal-layer modal-layer-expStart" role="presentation">
          <section className="modal modal-start-experiment">
            <header className="modal-head"><h2>업무 변경 시작</h2><X size={16} /></header>
            <div className="modal-body"><p>필수 설정을 확인한 뒤 업무 변경을 시작합니다.</p><div className="notice danger">적용 대상이 선택되지 않았습니다.</div><strong>분석 범위</strong><button className="location-select">일정 미정</button></div>
            <footer className="modal-footer"><button className="secondary-button">취소</button><button className="primary-button">시작</button></footer>
          </section>
        </div>
      )}
    </section>
  );
}

export function ExperimentSettingsPanels() {
  return <><Panel title="대상" meta="배정"><div className="rollout-line"><span>대상<br /><b>선택된 대상 없음</b></span><span>적용<br /><b>시작 전</b><i /></span></div></Panel><div className="experiment-two-panels"><Panel title="확인 기준" meta="목표"><p>선택된 기준 없음</p></Panel><Panel title="변경안" meta="화면 요소"><p><span className="variant-letter variant-a">A</span> 기존</p><p><span className="variant-letter variant-b">B</span> 변경안</p></Panel></div><Panel title="분석 설정" meta="업무 항목"><p>선택된 항목 없음</p></Panel></>;
}

export function ExperimentActivityPanels() {
  return <><div className="experiment-two-panels"><Panel title="자료 상태" meta="진행 중"><p>기본 설정</p><p>적용 범위 확인</p><p>담당자 확인</p></Panel><Panel title="요약" meta="결과 없음"><p><strong>확인 기준</strong></p><p>선택된 확인 기준이 없습니다.</p></Panel></div><Panel title="분석" meta="자료 없음"><p>적용 대상 자료가 아직 없습니다.</p></Panel><Panel title="진단" meta="일정 미정"><p>적용 대상 자료가 아직 없습니다.</p></Panel></>;
}

export function ExperimentBuilderSurface({ labels, onConfirm }) {
  return (
    <section className="experiment-builder-surface">
      <aside className="experiment-steps">
        {["정보", "대상", "변경안", "적용", "검토"].map((step, index) => (
          <button key={step} className={index === 1 ? "active" : ""}>
            <span>{index + 1}</span>
            {step}
          </button>
        ))}
      </aside>
      <main className="experiment-builder-main">
        <PageHeader
          title="Matter 업무 보드 변경"
          subtitle="대상, 변경안, 적용 범위를 확인한 뒤 담당자 검토로 넘깁니다."
          actions={
            <>
              <button className="secondary-button">
                <PlayCircle size={15} />
                미리보기
              </button>
              <button className="primary-button" onClick={onConfirm}>
                <FlaskConical size={15} />
                변경 요청
              </button>
            </>
          }
        />
        <div className="experiment-builder-grid">
          <Panel title="대상" meta="사용자와 화면">
            <div className="targeting-stack">
              <QueryBlock title="화면" value="Matter 업무 보드" meta="선택한 작업공간" />
              <QueryBlock title="대상" value="Matter 팀" meta="권한이 있는 구성원" />
              <QueryBlock title="적용" value="Matter별 1회" meta="담당자 확인 필요" />
            </div>
          </Panel>
          <Panel title="변경안" meta="미리보기">
            <div className="experiment-preview-canvas">
              <div className="preview-toolbar">
                <button className="secondary-button active">기존</button>
                <button className="secondary-button">변경안</button>
                <button className="secondary-button">스타일</button>
              </div>
              <div className="preview-card">
                <MatterLogo compact />
                <strong>Matter 설정 확인</strong>
                <p>Vault, 청구, 기록, 공유 포털 연결 상태를 확인합니다.</p>
                <button className="primary-button">계속</button>
              </div>
            </div>
          </Panel>
          <Panel title="변경 속성" meta="화면 설정">
            <div className="control-stack">
              <Field label="대표 색상" value="#0B65E5" />
              <Field label="버튼 문구" value="계속" />
              <Field label="적용 범위" value="" />
              <label className="toggle-row">
                <span>승인 필요</span>
                <input type="checkbox" defaultChecked />
              </label>
            </div>
          </Panel>
        </div>
      </main>
    </section>
  );
}

export function ExperimentOverviewCardsSurface({ labels, onNewExperiment }) {
  return (
    <section className="surface stack">
      <PageHeader
        title={labels.experimentTitle}
        subtitle="Matter 업무 변경과 기능 설정을 담당자 승인 흐름으로 관리합니다."
        actions={
          <>
            <button className="secondary-button">
              <Flag size={15} />
              새 기능 설정
            </button>
            <button className="primary-button" onClick={onNewExperiment}>
              <FlaskConical size={15} />
              새 업무 변경
            </button>
          </>
        }
      />
      <div className="experiment-overview-grid">
        <Panel title="업무 변경" meta="Matter 작업 흐름">
          <div className="overview-card-body">
            <FlaskConical size={30} />
            <p>화면 단위 변경안을 만들고 Matter 팀별 적용 범위를 정합니다.</p>
            <button className="primary-button" onClick={onNewExperiment}>업무 변경 만들기</button>
          </div>
        </Panel>
        <Panel title="기능 설정" meta="선택 적용">
          <div className="overview-card-body">
            <Flag size={30} />
            <p>선택한 그룹에만 업무 변경을 적용하고 담당자 확인을 유지합니다.</p>
            <button className="secondary-button">설정 만들기</button>
          </div>
        </Panel>
        <Panel title="최근 활동" meta="업무 변경">
          <CompactTable
            columns={["항목", "상태", "담당자"]}
            rows={[]}
          />
        </Panel>
      </div>
    </section>
  );
}
