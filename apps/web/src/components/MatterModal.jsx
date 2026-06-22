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
            Saved charts inherit matter permissions and audit logging.
          </div>
          <Field label="Name" value="MAT-248 Event Segmentation" />
          <Field label="Location" value="Selected workspace" />
        </>
      )
    },
    share: {
      title: "Share",
      primaryText: "Copy Link",
      secondaryText: "Create Public Link",
      header: false,
      body: <ShareModalState state="blank" onClose={onClose} />
    },
    shareInvite: {
      title: "Share",
      primaryText: "Share",
      secondaryText: "Copy Invite Link",
      header: false,
      body: <ShareModalState state="invite" onClose={onClose} />
    },
    shareHistory: {
      title: "Share",
      header: false,
      footer: false,
      body: <ShareModalState state="history" onClose={onClose} />
    },
    saveChartCard: {
      title: "Save Chart",
      primaryText: "Save",
      body: <SaveChartModalState state="card" />
    },
    saveChartSuggest: {
      title: "Save Chart",
      primaryText: "Save",
      body: <SaveChartModalState state="suggest" />
    },
    saveChartReportDropdown: {
      title: "Save Chart",
      primaryText: "Save",
      body: <SaveChartModalState state="dropdown" />
    },
    saveChartReportSelected: {
      title: "Save Chart",
      primaryText: "Save",
      body: <SaveChartModalState state="selected" />
    },
    dashboardSubscribe: {
      title: "Subscribe to Dashboard Reports",
      header: false,
      footer: false,
      body: <DashboardSubscribeModalState state="draft" onClose={onClose} />
    },
    dashboardSubscribeSuccess: {
      title: "Subscribe to Dashboard Reports",
      header: false,
      footer: false,
      body: <DashboardSubscribeModalState state="success" onClose={onClose} />
    },
    visualLabelingLaunch: {
      title: "Launch Visual Labeling",
      header: false,
      footer: false,
      body: <VisualLabelingLaunchModal onClose={onClose} />
    },
    themePreferences: {
      title: "Theme Preferences",
      header: false,
      footer: false,
      body: <ThemePreferencesModal onClose={onClose} />
    },
    newNavigationTour: {
      title: "Experience the new Amplitude",
      header: false,
      footer: false,
      body: <NewNavigationTourModal onClose={onClose} />
    },
    chartType: {
      title: "Choose chart type",
      body: (
        <div className="modal-grid">
          {[
            [LineChart, "Line"],
            [BarChart3, "Bar"],
            [Gauge, "Gauge"],
            [Table2, "Data table"]
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
      title: "Create metric",
      body: (
        <>
          <Field label="Metric name" value="Partner review conversion" />
          <Field label="Source event" value="[Matter] Element Changed" />
          <Field label="Aggregate" value="Unique matters" />
        </>
      )
    },
    metricUntitled: {
      title: "Metric",
      header: false,
      footer: false,
      body: <MetricDefinitionModal step="untitled" />
    },
    metricNamed: {
      title: "Metric",
      header: false,
      footer: false,
      body: <MetricDefinitionModal step="named" />
    },
    metricPicker: {
      title: "Metric",
      header: false,
      footer: false,
      body: <MetricDefinitionModal step="picker" />
    },
    metricPreview: {
      title: "Metric",
      header: false,
      footer: false,
      body: <MetricDefinitionModal step="preview" />
    },
    invite: {
      title: labels.invite,
      body: (
        <>
          <Field label="Email" value="associate@amic.law" />
          <Field label="Role" value="Matter analyst" />
          <label className="check-row">
            <input type="checkbox" defaultChecked />
            Restrict access to Selected matter.
          </label>
        </>
      )
    },
    feedback: {
      title: "Send feedback",
      primaryText: "Send",
      body: (
        <>
          <div className="feedback-question-row">
            <strong>Were you satisfied with the response?</strong>
            <span>
              <button className="secondary-button active">Yes</button>
              <button className="secondary-button">No</button>
            </span>
          </div>
          <textarea className="feedback-textarea" placeholder="Tell us what you think" />
        </>
      )
    },
    archive: {
      title: "Archive 2 items?",
      primaryText: "Move to Archive",
      body: <p>Are you sure you want to archive 2 items?</p>
    },
    openingTab: {
      title: "Opening a new tab...",
      footer: false,
      body: (
        <div className="modal-loading">
          <span className="spinner" aria-hidden="true" />
          <p>We're checking for the script tag needed for web experiments...</p>
        </div>
      )
    },
    remove: {
      title: "Remove 1 team member?",
      primaryText: "Remove and Transfer",
      primaryTone: "danger",
      body: (
        <>
          <p>Are you sure you want to remove Selected user?</p>
          <label className="check-row">
            <input type="checkbox" defaultChecked />
            Transfer content edit access to other members
          </label>
          <p className="muted-copy">Transfer all content edit access from a removed member to another member. This includes charts, dashboards, notebooks, cohorts, and segments.</p>
          <Field label="Transfer content from Selected user to:" value="" />
        </>
      )
    },
    annotation: {
      title: "New Annotation",
      primaryText: "Save",
      body: (
        <>
          <div className="annotation-project">
            <strong>Project</strong>
            <span>default</span>
          </div>
          <label className="field">
            <span>Affected Date</span>
            <button className="location-select" type="button">
              <CalendarDays size={15} />
              Dec 16, 2024
              <ChevronDown size={14} />
            </button>
          </label>
          <label className="field">
            <span>Annotation Name</span>
            <input placeholder="Give your annotation a name..." />
          </label>
          <label className="field">
            <span>Description</span>
            <textarea className="feedback-textarea" placeholder="This annotation is pointing to..." />
          </label>
          <label className="check-row">
            <input type="checkbox" defaultChecked />
            Annotation applies to all charts
          </label>
        </>
      )
    },
    generateChart: {
      title: "Generate Chart with AI",
      primaryText: "Generate",
      body: (
        <>
          <p>
            Powered by Ask {PRODUCT_BRAND}. <a href="#learn">Learn more.</a>
          </p>
          <div className="inline-form">
            <input value="How many users are viewing the site per country?" readOnly />
            <button className="primary-button" type="button">
              <Sparkles size={15} />
              Generate
            </button>
          </div>
          <p className="muted-copy">
            Language models can make mistakes. Double check your charts before making decisions.
          </p>
        </>
      )
    },
    profilePicture: {
      title: "Profile Picture",
      primaryText: "Save",
      body: (
        <div className="profile-picture-modal">
          <div className="profile-picture-preview">AS</div>
          <button className="secondary-button" type="button">
            <Plus size={15} />
            Upload image
          </button>
          <p className="muted-copy">Use a square image at least 400px by 400px.</p>
        </div>
      )
    },
    saveCohort: {
      title: "Save",
      primaryText: "Save",
      body: (
        <>
          <label className="field">
            <span>Name</span>
            <input placeholder="Give your new cohort a title..." />
          </label>
          <label className="field">
            <span>Location</span>
            <button className="location-select" type="button">
              <CircleHelp size={15} />
              No Current Location
              <ChevronDown size={14} />
            </button>
            <small>Only you have access to this space</small>
          </label>
        </>
      )
    },
    newExperiment: {
      title: "New Web Experiment",
      primaryText: "Create",
      body: (
        <>
          <Field label="Name" value="Matter dashboard onboarding" />
          <Field label="Targeted Page" value="/matters/:matterId/dashboard" />
          <Field label="Project" value="Selected matter" />
          <div className="notice">
            <FlaskConical size={15} />
            Advanced settings can be configured after the experiment is created.
          </div>
        </>
      )
    },
    newExperimentBlank: {
      title: "New Web Experiment",
      primaryText: "Create",
      body: <NewWebExperimentModalState state="blank" />
    },
    newExperimentFilled: {
      title: "New Web Experiment",
      primaryText: "Create",
      body: <NewWebExperimentModalState state="filled" />
    },
    newExperimentAdvanced: {
      title: "New Web Experiment",
      primaryText: "Create",
      body: <NewWebExperimentModalState state="advanced" />
    },
    createDashboard: {
      title: "Create New Dashboard",
      primaryText: "Save",
      body: (
        <>
          <div className="notice">
            <LayoutDashboard size={15} />
            Dashboards can be shared with teams or kept private.
          </div>
          <Field label="Name" value="Matter activity dashboard" />
          <Field label="Location" value="Selected workspace" />
        </>
      )
    },
    sessionReplay: {
      title: "Session Replays",
      header: false,
      footer: false,
      body: <SessionReplayModal onClose={onClose} />
    },
    create: {
      title: labels.create,
      body: (
        <div className="modal-grid">
          {[
            [BarChart3, "Analysis"],
            [LayoutDashboard, "Dashboard"],
            [Users, "Cohort"],
            [Flag, "Feature flag"]
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
      title: "Approve rollout?",
      body: (
        <>
          <div className="notice danger">
            <ShieldCheck size={15} />
            This rollout changes attorney-review routing for live matters.
          </div>
          <p>Confirm that the rollout audience, approval policy, and rollback path are ready.</p>
        </>
      )
    }
  }[type] ?? {
    title: labels.theme,
    body: (
      <div className="modal-grid">
        <button className="modal-choice" onClick={() => setTheme("light")}>Light</button>
        <button className="modal-choice" onClick={() => setTheme("dark")}>Dark</button>
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
