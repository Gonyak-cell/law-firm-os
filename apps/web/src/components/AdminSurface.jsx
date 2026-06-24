import React from "react";
import { Bell, CircleUserRound, CreditCard, Save, UserPlus } from "lucide-react";
import { DataTable, Field, PageHeader, Panel } from "./primitives.jsx";

export function AdminSurface({ labels, variant, onInvite, onProfilePicture }) {
  if (variant === "profile") {
    return <ProfileSettingsSurface labels={labels} onProfilePicture={onProfilePicture} />;
  }

  return (
    <section className="surface stack">
      <PageHeader
        title={labels.adminTitle}
        subtitle="조직 구성원, 알림, 요금제, 계정 설정을 관리합니다."
        actions={
          <>
            <button className="secondary-button">
              <CreditCard size={15} />
              {labels.billingTitle}
            </button>
            <button className="primary-button" onClick={onInvite}>
              <UserPlus size={15} />
              {labels.invite}
            </button>
          </>
        }
      />
      <div className="admin-layout">
        <Panel title="구성원" meta="작업공간">
          <DataTable columns={["이름", "역할", "팀", "상태"]} rows={[]} />
        </Panel>
        <Panel title={labels.billingTitle} meta="결제 정보">
          <div className="billing-card">
            <div>
              <strong>표시할 결제 정보가 없습니다</strong>
              <p>요금제와 결제 정보가 연결되면 이곳에 표시됩니다.</p>
              <button className="primary-button full">추가 기능 문의</button>
            </div>
          </div>
        </Panel>
        <Panel title="알림" meta="업무 알림">
          <div className="toggle-list">
            {["주간 Matter 요약", "감사 예외 알림", "청구 승인 알림", "업무 변경 알림"].map((item, index) => (
              <label key={item} className="toggle-row">
                <span>{item}</span>
                <input type="checkbox" defaultChecked={index !== 1} />
              </label>
            ))}
          </div>
        </Panel>
      </div>
    </section>
  );
}

export function ProfileSettingsSurface({ labels, onProfilePicture }) {
  return (
    <section className="surface stack">
      <PageHeader
        title="프로필"
        subtitle="개인 정보, 알림 설정, 계정 정보를 관리합니다."
        actions={
          <>
            <button className="secondary-button">
              <Bell size={15} />
              알림
            </button>
            <button className="primary-button">
              <Save size={15} />
              {labels.save}
            </button>
          </>
        }
      />
      <div className="profile-settings-layout">
        <Panel title="개인 정보" meta="프로필 설정">
          <div className="profile-form-layout">
            <button className="profile-avatar-button" onClick={onProfilePicture}>
              <CircleUserRound size={24} />
              <small>사진 변경</small>
            </button>
            <div className="form-stack">
              <Field label="이름" value="" />
              <Field label="이메일" value="" />
              <Field label="직함" value="" />
            </div>
          </div>
        </Panel>
        <Panel title="알림" meta="이메일과 작업공간">
          <div className="toggle-list">
            {["주간 검토", "제품 안내", "청구 알림", "보안 알림"].map((item, index) => (
              <label key={item} className="toggle-row">
                <span>{item}</span>
                <input type="checkbox" defaultChecked={index !== 1} />
              </label>
            ))}
          </div>
        </Panel>
      </div>
    </section>
  );
}
