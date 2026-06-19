import React from "react";
import { PlayCircle, Sparkles } from "lucide-react";
import { prompts } from "../data/mockData.js";
import { CompactTable, MiniLineChart, Panel } from "./primitives.jsx";

export function AskSurface({ labels, variant }) {
  if (variant === "retention") {
    return <AskRetentionSurface labels={labels} />;
  }

  return (
    <section className="surface ask-surface">
      <div className="ask-header">
        <Sparkles size={22} />
        <h1>{labels.askTitle}</h1>
        <p>Guidance, answers, cohorts, and replay context for your matter workspace.</p>
      </div>
      <div className="prompt-grid">
        {prompts.map((prompt) => (
          <button key={prompt} className="prompt-card">
            <Sparkles size={16} />
            {prompt}
          </button>
        ))}
      </div>
      <Panel title="Answer" meta="Generated chart response">
        <div className="answer-layout">
          <MiniLineChart variant="large" />
          <div>
            <h3>High-risk matters increased after DMS redline activity.</h3>
            <p>The largest change came from Project Atlas and Riverstone. Both have partner-review events and permission evaluations in the last 24 hours.</p>
            <div className="feedback-row">
              <button className="secondary-button">Helpful</button>
              <button className="secondary-button">Needs work</button>
            </div>
          </div>
        </div>
      </Panel>
      <label className="ask-input">
        <input placeholder={labels.search} />
        <button className="primary-button">
          <Sparkles size={15} />
          Ask
        </button>
      </label>
      <div className="cohort-replay-grid">
        <Panel title="Cohorts" meta="Saved user groups">
          <CompactTable
            columns={["Cohort", "Users", "Sync"]}
            rows={[
              ["High-risk matters", "248", "Active"],
              ["Partner review queue", "92", "Paused"],
              ["Enterprise clients", "1.1k", "Active"]
            ]}
          />
        </Panel>
        <Panel title="Session Replay" meta="Recent workspace sessions">
          <div className="replay-card">
            <PlayCircle size={38} />
            <strong>Project Atlas workspace session</strong>
            <span>12:48 min · DMS redline activity</span>
          </div>
        </Panel>
      </div>
    </section>
  );
}

export function AskRetentionSurface({ labels }) {
  return (
    <section className="surface ask-surface">
      <div className="ask-header compact">
        <Sparkles size={22} />
        <h1>{labels.askTitle}</h1>
        <p>Ask a question, inspect the generated chart, and continue with follow-up prompts.</p>
      </div>
      <Panel title="Answer" meta="Generated retention chart">
        <div className="answer-layout">
          <MiniLineChart variant="large" />
          <div>
            <h3>Partner-review matters retain more follow-up activity after day 7.</h3>
            <p>Matters with a documented review owner keep higher document and billing activity through the second week.</p>
            <div className="suggested-followups">
              {["Break down by owner", "Show high-risk matters", "Compare billing approvals"].map((item) => (
                <button key={item} className="secondary-button">{item}</button>
              ))}
            </div>
          </div>
        </div>
      </Panel>
      <label className="ask-input">
        <input defaultValue="Which matters retain activity after partner review?" />
        <button className="primary-button">
          <Sparkles size={15} />
          Ask
        </button>
      </label>
    </section>
  );
}
