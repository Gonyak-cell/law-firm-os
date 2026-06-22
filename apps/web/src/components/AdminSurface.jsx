import React from "react";
import { Bell, CreditCard, Save, UserPlus } from "lucide-react";
import { DataTable, Field, GaugeChart, MetricCard, PageHeader, Panel } from "./primitives.jsx";

export function AdminSurface({ labels, variant, onInvite, onProfilePicture }) {
  if (variant === "profile") {
    return <ProfileSettingsSurface labels={labels} onProfilePicture={onProfilePicture} />;
  }

  return (
    <section className="surface stack">
      <PageHeader
        title={labels.adminTitle}
        subtitle="Manage data settings, teammates, notifications, billing, and account preferences."
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
        <Panel title="Team Members" meta="Workspace members">
          <DataTable columns={["Name", "Role", "Team", "Status"]} rows={[]} />
        </Panel>
        <Panel title={labels.billingTitle} meta="Usage and checkout preview">
          <div className="billing-card">
            <GaugeChart value={58} />
            <div>
              <strong>No local usage rows</strong>
              <p>Usage and billing values require a live admin API.</p>
              <button className="primary-button full">Purchase add-on</button>
            </div>
          </div>
        </Panel>
        <Panel title="Notifications" meta="Digest and usage toggles">
          <div className="toggle-list">
            {["Weekly matter summary", "Audit exception digest", "Billing approval alerts", "Experiment change notices"].map((item, index) => (
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
        title="Profile"
        subtitle="Manage personal information, notification preferences, and account details."
        actions={
          <>
            <button className="secondary-button">
              <Bell size={15} />
              Notifications
            </button>
            <button className="primary-button">
              <Save size={15} />
              {labels.save}
            </button>
          </>
        }
      />
      <div className="profile-settings-layout">
        <Panel title="Personal Information" meta="Profile settings">
          <div className="profile-form-layout">
            <button className="profile-avatar-button" onClick={onProfilePicture}>
              <span>AS</span>
              <small>Change Photo</small>
            </button>
            <div className="form-stack">
              <Field label="Full name" value="" />
              <Field label="Email" value="" />
              <Field label="Title" value="" />
            </div>
          </div>
        </Panel>
        <Panel title="Notifications" meta="Email and workspace updates">
          <div className="toggle-list">
            {["Weekly review", "Product updates", "Billing alerts", "Security notifications"].map((item, index) => (
              <label key={item} className="toggle-row">
                <span>{item}</span>
                <input type="checkbox" defaultChecked={index !== 1} />
              </label>
            ))}
          </div>
        </Panel>
        <Panel title="Year in Review" meta="Workspace activity">
          <div className="review-stat-grid">
            <MetricCard label="Charts viewed" value="1.2k" delta="+18%" tone="blue" />
            <MetricCard label="Cohorts saved" value="42" delta="+7" tone="green" />
            <MetricCard label="Reports shared" value="19" delta="+3" tone="purple" />
          </div>
        </Panel>
      </div>
    </section>
  );
}
