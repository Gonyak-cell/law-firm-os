import React from "react";
import {
  Activity,
  ChevronDown,
  ListFilter,
  Maximize2,
  PanelRightOpen,
  Pause,
  PlayCircle,
  Search,
  SkipBack,
  SkipForward,
  Users,
  X
} from "lucide-react";

export function SessionReplayModal({ onClose }) {
  const replays = [
    { date: "Dec 18, 9:32 AM", length: "12:33", active: true },
    { date: "Dec 17, 5:51 PM", length: "55:08" },
    { date: "Dec 17, 4:12 PM", length: "02:47" }
  ];
  const streamEvents = [
    ["2:13:46 AM", "[Matter] Start Session"],
    ["2:13:46 AM", "[Matter] Page Viewed"],
    ["2:14:09 AM", "[Matter] Element Clicked"],
    ["2:14:09 AM", "[Matter] Page Viewed"],
    ["2:14:25 AM", "[Matter] Element Clicked"],
    ["2:14:34 AM", "[Matter] Page Viewed"],
    ["2:14:34 AM", "[Matter] Element Clicked"],
    ["2:14:38 AM", "[Matter] Page Viewed"],
    ["2:14:39 AM", "[Matter] Element Clicked"],
    ["2:14:39 AM", "[Matter] Element Changed"],
    ["2:14:52 AM", "[Matter] Page Viewed"],
    ["2:15:08 AM", "[Matter] Element Clicked"]
  ];

  return (
    <div className="replay-detail">
      <header className="replay-detail-top">
        <h2>Session Replays</h2>
        <button className="icon-button" onClick={onClose} aria-label="Close">
          <X size={16} />
        </button>
      </header>
      <div className="replay-detail-frame">
        <aside className="replay-detail-list">
          <header>
            <strong>3 REPLAYS</strong>
            <span className="replay-detail-list-icons">
              <ListFilter size={14} />
              <PanelRightOpen size={14} />
            </span>
          </header>
          {replays.map((replay) => (
            <button key={replay.date} className={`replay-detail-row ${replay.active ? "active" : ""}`} type="button">
              <PlayCircle size={16} className="replay-row-icon" />
              <span className="replay-row-text">
                <strong>1072200723643</strong>
                <small>{replay.date}</small>
              </span>
              <small className="replay-row-length">{replay.length}</small>
            </button>
          ))}
        </aside>
        <section className="replay-detail-center">
          <div className="replay-detail-center-head">
            <strong className="replay-detail-id">1072200723643</strong>
            <div className="replay-detail-actions">
              <button className="secondary-button" type="button">
                Add to
                <ChevronDown size={13} />
              </button>
              <button className="secondary-button" type="button">Open In Full Page</button>
            </div>
          </div>
          <div className="replay-detail-meta">
            <span>
              <small>Session Length</small>
              <strong>12m 33s</strong>
            </span>
            <span>
              <small>Event Total</small>
              <strong>11</strong>
            </span>
            <span>
              <small>Device Type</small>
              <strong>Desktop</strong>
            </span>
          </div>
          <div className="replay-detail-stage">
            <div className="replay-page-mock">
              <svg className="replay-page-annotation" viewBox="0 0 120 60" aria-hidden="true">
                <path d="M8 50 C 30 16, 78 8, 112 22" fill="none" stroke="#d93025" strokeWidth="2.4" />
                <path d="M104 14 L 112 22 L 101 25" fill="none" stroke="#d93025" strokeWidth="2.4" />
              </svg>
              <div className="replay-page-nav">
                <span className="replay-page-logo">supabase</span>
                <span className="replay-page-logo alt">NEXT.</span>
              </div>
              <h3>
                The fastest way to build apps with <strong>Supabase</strong> and <strong>Next.js</strong>
              </h3>
              <div className="replay-page-steps">
                <strong>Next steps</strong>
                <p>Sign up, create a project, and connect the client to start streaming replay events.</p>
              </div>
            </div>
            <span className="replay-detail-stamp">12:18:24 | 12:14:29 AM UTC</span>
          </div>
          <div className="replay-detail-scrubber">
            <small>12:33</small>
            <div className="replay-detail-track">
              <span className="replay-detail-knob" />
            </div>
            <small>12:33</small>
          </div>
          <div className="replay-detail-controls">
            <button className="icon-button" type="button" aria-label="Pause">
              <Pause size={15} />
            </button>
            <button className="icon-button" type="button" aria-label="Skip back">
              <SkipBack size={15} />
            </button>
            <button className="icon-button" type="button" aria-label="Skip forward">
              <SkipForward size={15} />
            </button>
            <button className="icon-button" type="button">5x</button>
            <span className="replay-detail-toggle">
              <span className="toggle-on" />
              Skip Inactivity
            </span>
            <button className="icon-button replay-detail-expand" type="button" aria-label="Expand">
              <Maximize2 size={15} />
            </button>
          </div>
        </section>
        <aside className="replay-detail-events">
          <div className="replay-detail-tabs">
            <button className="active" type="button">
              <Activity size={13} />
              Event Stream
            </button>
            <button type="button">
              <Users size={13} />
              User Properties
            </button>
          </div>
          <label className="replay-detail-search">
            <Search size={13} />
            <input placeholder="Search for events" />
          </label>
          <ul className="replay-detail-stream">
            {streamEvents.map(([time, name], index) => (
              <li key={`${time}-${index}`}>
                <small>{time}</small>
                <i className="stream-dot" />
                <span>{name}</span>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  );
}
