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
import { MiniLineChart } from "./primitives.jsx";

export function MetricDefinitionModal({ step }) {
  const hasName = step !== "untitled";
  const showPicker = step === "picker";
  const showPreview = step === "preview";

  return (
    <div className="metric-definition-modal">
      <div className="metric-definition-body">
        <p className="metric-kicker">METRIC</p>
        <h1>{hasName ? "Sign ups per day" : "Untitled metric"}</h1>
        <p className="metric-description">{hasName ? "Total number of sign ups per day" : "Give your metric a description"}</p>
        <div className="metric-definition-rule" />
        <div className="metric-definition-row">
          <strong>Metric Type</strong>
          <div>
            <button className="metric-select-button" type="button">
              Uniques
              <ChevronDown size={16} />
            </button>
            <p>Measured as unique users who completed this event.</p>
          </div>
        </div>
        <div className="metric-definition-row metric-events-row">
          <strong>Set Events</strong>
          <div className="metric-event-control">
            {showPreview ? (
              <div className="metric-selected-event">
                <span className="event-source-dot">M</span>
                New User
                <button type="button">+ where</button>
              </div>
            ) : (
              <span className="metric-event-placeholder">Select event...</span>
            )}
            <small>Uniques</small>
            {showPicker && (
              <div className="metric-event-dropdown">
                <label>
                  <Search size={16} />
                  <input placeholder="Search" />
                </label>
                <header>
                  <ChevronDown size={16} />
                  <strong>matter events</strong>
                  <span>8 events</span>
                </header>
                {["Any Active Event", "Any Event", "New User", "Element Changed", "Element Clicked", "End Session", "Page Viewed", "Start Session"].map((event) => (
                  <button key={event} type="button">
                    <span className="event-source-dot">M</span>
                    {event}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        {showPreview && (
          <div className="metric-preview-block">
            <h2>PREVIEW</h2>
            <div className="metric-preview-grid">
              <div className="metric-preview-copy">
                <div className="metric-preview-title">
                  <strong>Current Uniques</strong>
                  <MoreVertical size={16} />
                </div>
                <span className="metric-preview-value">3</span>
                <p><strong>+ &gt;1000%</strong> from Nov 17</p>
                <p>Current uniques are trending upwards by &gt;1000% since Nov 17.</p>
              </div>
              <MiniLineChart />
            </div>
          </div>
        )}
      </div>
      <footer className="metric-definition-footer">
        <button className="secondary-button" type="button">Cancel</button>
        <button className={`primary-button ${showPreview ? "" : "disabled"}`} type="button">Save</button>
      </footer>
    </div>
  );
}

export function NewWebExperimentModalState({ state }) {
  const isFilled = state === "filled" || state === "advanced";
  const isAdvanced = state === "advanced";

  return (
    <div className="new-web-experiment-state">
      <label className="field experiment-field">
        <span>Name*</span>
        <input value={isFilled ? "Sign Up" : ""} placeholder="Enter Name" readOnly />
      </label>
      <label className="field experiment-field">
        <span>Targeted Page (URL)*</span>
        <input value={isFilled ? "https://www.content-mobbin.com/" : ""} placeholder="https://" readOnly />
      </label>
      <label className="field experiment-field">
        <span>Project*</span>
        <button className="location-select" type="button">
          default
          <ChevronDown size={14} />
        </button>
      </label>
      <div className="experiment-advanced-row">
        <ChevronDown size={17} className={isAdvanced ? "" : "collapsed"} />
        <strong>Advanced</strong>
      </div>
      {isAdvanced && (
        <div className="experiment-advanced-panel">
          <p>The following have been pre-filled with common defaults. You may continue with creation and edit them later.</p>
          <label className="field experiment-field">
            <span>Key*</span>
            <small>Keys can contain numbers, letters, _, and - only and can be edited until the experiment is activated.</small>
            <input value="sign-up" readOnly />
          </label>
          <div className="experiment-type-choice">
            <strong>Experiment Type*</strong>
            <label>
              <input type="radio" defaultChecked />
              A/B Test
              <CircleHelp size={15} />
            </label>
            <label className="disabled-choice">
              <input type="radio" />
              Multi-Armed Bandit
              <CircleHelp size={15} />
              <a>Upgrade now</a>
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
          <button className={isHistory ? "" : "active"}>Share</button>
          <button>Embed</button>
          <button className={isHistory ? "active" : ""}>View History</button>
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
                <th>Name</th>
                <th>Last Viewed</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Sam Lee (You)", "samlee@content-mobbin.com", "37 seconds ago"],
                ["Selected user", "user.invalid", "2 minutes ago"]
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
            <button className="primary-button" onClick={onClose} type="button">Done</button>
          </div>
        </div>
      ) : (
        <>
          <label className="field share-people-field">
            <span>Add people</span>
            <div className={`share-recipient-line ${isInvite ? "filled" : ""}`}>
              <div className="share-recipient-input">
                {isInvite && <span className="recipient-chip">Selected user <X size={12} /></span>}
                <input placeholder="Enter names or emails" readOnly />
              </div>
              {isInvite && (
                <button className="location-select share-inline-permission" type="button">
                  Can edit
                  <ChevronDown size={14} />
                </button>
              )}
            </div>
          </label>
          {isInvite && (
            <textarea className="feedback-textarea share-message" placeholder="Add a message (optional)" />
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
        10 charts left before you reach the limit for this plan.
      </div>
      <label className="field save-chart-name-field">
        <span>Name</span>
        <div className="save-name-row">
          <input value={showSuggest ? "Page Views by Unique Users (Last 30 Days)" : "Page views"} readOnly />
          {(showSuggest || showDropdown || showSelectedReport) && <button className="suggest-link" type="button"><Sparkles size={14} />Suggest</button>}
        </div>
      </label>
      {showSelectedCard && (
        <div className="save-chart-card selected">
          <Sparkles size={16} />
          <span>Page Views by Unique Users (Last 30 Days)</span>
          <X size={16} />
          <CheckCircle2 size={16} />
        </div>
      )}
      <label className="field">
        <span>Location</span>
        <button className="location-select save-location-select" type="button">
          Sam Lee's Space
          <ChevronDown size={14} />
        </button>
      </label>
      {showDropdown || showSelectedReport ? (
        <label className="field">
          <span>Add to Report</span>
          <div className="save-report-picker">
            {showSelectedReport ? (
              <span className="report-chip">
                <LayoutDashboard size={14} />
                Untitled Dashboard - Dec 16
                <X size={12} />
              </span>
            ) : (
              <input placeholder="Enter a dashboard or notebook name..." readOnly />
            )}
          </div>
        </label>
      ) : (
        <button className="save-add-report-link" type="button">Add to Report</button>
      )}
      {showDropdown && (
        <div className="save-report-dropdown">
          <button type="button">
            <Plus size={15} />
            Create a new dashboard
          </button>
          <button type="button">
            <BookOpen size={15} />
            Create a new notebook
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
          <h2>Subscribe to Dashboard Reports</h2>
          <p>Set up recurring reports for this dashboard and receive notifications through Slack or email when your report is ready.</p>
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
          Your schedules have been updated successfully.
          <X size={18} />
        </div>
      )}
      <label className="field subscribe-timezone">
        <span>Showing times as:</span>
        <button className="location-select" type="button">
          (UTC-05:00) America/Detroit
          <ChevronDown size={14} />
        </button>
      </label>
      {isSuccess ? (
        <div className="subscribe-schedule-table">
          <div className="subscribe-table-head">
            <span><input type="checkbox" />Name</span>
            <span>Schedule (EST)</span>
            <span>CSV</span>
          </div>
          <div className="subscribe-table-row">
            <span><input type="checkbox" />You are subscribed</span>
            <span>
              <button>Every <ChevronDown size={14} /></button>
              <button>Tuesday <ChevronDown size={14} /></button>
              at
              <button>12AM <ChevronDown size={14} /></button>
            </span>
            <span>
              <button>CSV <ChevronDown size={14} /></button>
              <X size={16} />
            </span>
          </div>
        </div>
      ) : null}
      <label className="field subscribe-add-field">
        <span>Add new subscriber(s)</span>
        <div className="subscribe-add-input">
          {isSuccess ? (
            <input placeholder="Search for a name or email" readOnly />
          ) : (
            <span className="recipient-chip">Sam Lee <X size={12} /></span>
          )}
        </div>
      </label>
      {!isSuccess && (
        <div className="subscribe-controls">
          <strong>How often should updates be sent?</strong>
          <span>
            Send
            <button>Every <ChevronDown size={14} /></button>
            <button>Monday <ChevronDown size={14} /></button>
            at
            <button>12AM <ChevronDown size={14} /></button>
            EST
            <button>with CSV. <ChevronDown size={14} /></button>
          </span>
        </div>
      )}
      <button className={isSuccess ? "secondary-button disabled" : "primary-button subscribe-add-button"} type="button">Add</button>
      <div className="dashboard-subscribe-footer">
        <button className="secondary-button" onClick={onClose} type="button">Done</button>
      </div>
    </div>
  );
}

export function VisualLabelingLaunchModal({ onClose }) {
  return (
    <div className="visual-labeling-launch">
      <div className="modal-custom-top">
        <h2>Launch Visual Labeling</h2>
        <button className="icon-button" onClick={onClose} type="button"><X size={20} /></button>
      </div>
      <p>Track specific website behaviors simply by navigating to your site.</p>
      <div className="visual-labeling-illustration">
        <div className="browser-dots"><span /><span /><span /></div>
        <div className="browser-bluebar"><i /><i /></div>
      </div>
      <p>To get started, input the URL of the page that includes the element you wish to label.</p>
      <label className="field">
        <span>Your app's URL</span>
        <button className="location-select" type="button">
          https://www.content-mobbin.com
          <ChevronDown size={14} />
        </button>
      </label>
      <div className="custom-modal-footer">
        <button className="secondary-button" onClick={onClose} type="button">Cancel</button>
        <button className="primary-button" onClick={onClose} type="button">Start Labeling</button>
      </div>
    </div>
  );
}

export function ThemePreferencesModal({ onClose }) {
  const themes = ["Light Mode", "Dark Mode", "Match System Settings"];
  return (
    <div className="theme-preferences-modal">
      <div className="modal-custom-top">
        <h2>Theme Preferences</h2>
        <button className="icon-button" onClick={onClose} type="button"><X size={20} /></button>
      </div>
      <p>Select how you would like your interface to look. Select a single theme, or sync with your system.</p>
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
        {["Organization settings", "Personal settings", "Theme: Light Mode", "Opt out of New Navigation", "Launch tour", "Report slowness", "Explore demo", "Log out"].map((item) => (
          <button key={item}>{item}</button>
        ))}
      </div>
      <div className="new-navigation-tour">
        <button className="icon-button tour-close" onClick={onClose} type="button"><X size={17} /></button>
        <h2>Experience the new matter workspace</h2>
        <p>Simpler legal operations with automated insights, review gates, and improved navigation.</p>
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
        <button className="secondary-button tour-button" type="button">Show me around</button>
      </div>
    </>
  );
}
